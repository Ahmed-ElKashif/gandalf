#!/usr/bin/env node
/**
 * palantir round runner — captures the three evidence streams for one round.
 *
 *   start    begin a round: opens HAR capture, opens the page, starts the timeline
 *   run      run ONE agent-browser command with evidence capture around it
 *   assert   evaluate expectations against the collected evidence; nonzero exit on failure
 *   look     record a vision-pass screenshot for a named state
 *   stop     close the round and write the package
 *   abort    close without claiming the round proved anything
 *   pending  list rounds that still have unresolved operator comments
 *
 * Deliberately honest: every stream records whether it LANDED. A round whose tools.json
 * is empty on a page that registers tools, or whose dom.json has no frames, is reported
 * as a FAILED round, never as a pass. See references/limits.md.
 *
 * Node 22+. No dependencies. Writes only inside ./.agent-review/, which it gitignores.
 */
import { spawnSync, spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const MIN_NODE = 22;
const major = Number(process.versions.node.split(".")[0]);
if (major < MIN_NODE) {
  console.error(`palantir requires Node ${MIN_NODE}+; found ${process.versions.node}.`);
  process.exit(2);
}

/**
 * Resolve the agent-browser binary WITHOUT a shell.
 *
 * `shell: true` (the PowerShell-era habit) is actively wrong here: on Windows the shell
 * re-parses every argument, so a URL containing `&` is split and the second parameter is
 * silently dropped — and the exit code comes back from the shell, not the tool. Passing
 * argv directly (shell: false) keeps the URL intact and reports the real status.
 *
 * On Windows the CLI ships a native .exe that the npm shim may not expose to spawnSync,
 * so probe for it explicitly rather than trusting PATH.
 */
function resolveAb() {
  if (process.env.PALANTIR_AB_BIN) return process.env.PALANTIR_AB_BIN;
  if (process.platform === "win32") {
    const candidates = [
      path.join(process.env.USERPROFILE || "", "bin", "agent-browser-win32-x64.exe"),
      path.join(process.env.USERPROFILE || "", "bin", "agent-browser.exe"),
      path.join(process.env.LOCALAPPDATA || "", "Programs", "agent-browser", "agent-browser.exe"),
    ];
    for (const c of candidates) { try { if (fs.existsSync(c)) return c; } catch {} }
    // npm global shim, if that is all there is
    for (const c of [
      path.join(process.env.APPDATA || "", "npm", "agent-browser.cmd"),
      path.join(process.env.APPDATA || "", "npm", "agent-browser"),
    ]) { try { if (fs.existsSync(c)) return c; } catch {} }
  }
  return "agent-browser";
}

const AB = resolveAb();
const ROOT = path.resolve(process.env.PALANTIR_PROJECT || process.cwd());
const REVIEW_DIR = path.join(ROOT, ".agent-review");
const ACTIVE = path.join(REVIEW_DIR, ".active.json");

// ---------------------------------------------------------------- small helpers

const nowIso = () => new Date().toISOString();
const roundId = () => `${nowIso().replace(/[-:]/g, "").replace(/\.\d+Z$/, "Z")}-${Math.random().toString(16).slice(2, 8)}`;

function ensureDirs() {
  fs.mkdirSync(REVIEW_DIR, { recursive: true });
  const gi = path.join(ROOT, ".gitignore");
  const line = ".agent-review/";
  let cur = "";
  try { cur = fs.readFileSync(gi, "utf8"); } catch {}
  if (!cur.split(/\r?\n/).includes(line)) {
    fs.appendFileSync(gi, (cur && !cur.endsWith("\n") ? "\n" : "") + line + "\n");
  }
}

function readActive() {
  try { return JSON.parse(fs.readFileSync(ACTIVE, "utf8")); } catch { return null; }
}
function writeActive(o) { fs.writeFileSync(ACTIVE, JSON.stringify(o, null, 2)); }
function clearActive() { try { fs.unlinkSync(ACTIVE); } catch {} }

function ab(args, { allowFail = false, quiet = false, timeout = 120000 } = {}) {
  const r = spawnSync(AB, args, { encoding: "utf8", shell: false, timeout, maxBuffer: 64 * 1024 * 1024 });
  const out = `${r.stdout || ""}${r.stderr || ""}`;
  if (!quiet && out.trim()) process.stdout.write(out);
  if (r.error) {
    console.error(`\npalantir: failed to run \`${AB} ${args.join(" ")}\`: ${r.error.message}`);
    if (r.error.code === "ETIMEDOUT") console.error("palantir: the command timed out — is a stale browser session holding the port?");
    if (!allowFail) process.exit(1);
  }
  // agent-browser exits 1 on some SUCCESSFUL commands (e.g. `open` after a tool-change
  // announcement). Treat "produced output" as success, and only fail on no output at all.
  if (r.status !== 0 && !allowFail && !out.trim()) {
    console.error(`\npalantir: \`${AB} ${args.join(" ")}\` exited ${r.status} with no output`);
    process.exit(r.status || 1);
  }
  return { status: r.status, out, error: r.error };
}

const pkgDir = (id) => path.join(REVIEW_DIR, id);

function readJsonlOrJson(file) {
  try { return JSON.parse(fs.readFileSync(file, "utf8")); } catch { return null; }
}

/**
 * Drain the page's timeline buffer. Called BEFORE each wrapped command so the frames
 * belong to the action that follows, and once more at stop.
 *
 * agent-browser's `eval` prints the RESULT of the expression. For a string result it
 * prints a JSON-encoded string (quoted, with inner quotes escaped), e.g.
 *     "[{\"t\":71,\"kind\":\"boot\"}]"
 * so a naive JSON.parse gives a string, not an array. Unwrap in stages and verify we
 * really got an array of frames before claiming the stream landed.
 */
function drainTimeline(round) {
  const id = round.id;
  const pkg = pkgDir(id);
  const expr = "(() => { try { return JSON.stringify(window.__rec ? window.__rec.dumpCompact() : null); } catch (e) { return JSON.stringify({ __error: String(e) }); } })()";
  const r = spawnSync(AB, ["eval", expr], {
    encoding: "utf8", shell: false, timeout: 60000, maxBuffer: 64 * 1024 * 1024,
  });
  const raw = (r.stdout || "").trim();
  if (!raw) return { landed: false, reason: "recorder drain returned nothing (page closed, or eval failed)" };

  let frames = null;
  const attempts = [raw];
  try { attempts.push(JSON.parse(raw)); } catch {}
  // Peel string wrappers until we reach an array.
  for (const a of attempts) {
    let v = a;
    for (let i = 0; i < 3 && typeof v === "string"; i++) {
      try { v = JSON.parse(v); } catch { v = null; break; }
    }
    if (v === null) continue;
    if (Array.isArray(v)) { frames = v; break; }
    if (v && v.__error) return { landed: false, reason: `recorder threw: ${v.__error}` };
    if (v && Array.isArray(v.frames)) { frames = v.frames; break; }
  }
  if (frames === null) return { landed: false, reason: `recorder not present on the page (unparseable drain: ${raw.slice(0, 80)})` };

  if (frames.length) {
    fs.appendFileSync(path.join(pkg, "frames.jsonl"), frames.map((f) => JSON.stringify(f)).join("\n") + "\n");
  }
  return { landed: true, frames: frames.length };
}

/**
 * Record a WebMCP call into tools.json. agent-browser prints its own tool events, so we
 * capture the authoritative call by re-listing and by parsing the run output for the
 * invocation result.
 */
function recordToolCall(round, toolArgs, out) {
  const pkg = pkgDir(round.id);
  const file = path.join(pkg, "tools.json");
  let arr = readJsonlOrJson(file) || [];
  const entry = {
    at: nowIso(),
    command: `webmcp ${toolArgs.join(" ")}`,
    raw: out.slice(0, 20000),
  };
  const m = out.match(/^\s*([0-9A-F]{16,}):\s*completed/m);
  if (m) entry.invocationId = m[1];
  if (/\bfailed\b/i.test(out) || /\berror\b/i.test(out)) entry.outcome = "error";
  else if (m || /"success"\s*:\s*true/.test(out)) entry.outcome = "ok";
  else entry.outcome = "unknown";
  arr.push(entry);
  fs.writeFileSync(file, JSON.stringify(arr, null, 2));
}

// ---------------------------------------------------------------- commands

function cmdStart({ url, fps = 5, video = false, redact }) {
  ensureDirs();
  if (readActive()) {
    console.error("palantir: a round is already active. Use `stop` or `abort` first.");
    process.exit(1);
  }
  if (!url) { console.error("palantir: start requires --url <url>"); process.exit(1); }

  const id = roundId();
  const pkg = pkgDir(id);
  fs.mkdirSync(pkg, { recursive: true });

  const round = {
    id, url, startedAt: nowIso(), package: pkg,
    streams: { tools: false, dom: false, har: false, video: false },
    notes: [],
  };

  // HAR first, so the page's own initial requests are captured.
  const harFile = path.join(pkg, "network.har");
  const h = ab(["network", "har", "start"], { allowFail: true });
  round.streams.har = h.status === 0;
  if (!round.streams.har) round.notes.push("network HAR could not be started");

  if (redact) round.redact = String(redact).split(",").map((s) => s.trim()).filter(Boolean);

  ab(["open", url], { allowFail: true });
  round.openedAt = nowIso();

  // Confirm the recorder / tool surface state immediately, so meta.json tells the truth.
  const probe = spawnSync(AB, ["eval", "JSON.stringify({rec: !!window.__rec, mc: !!(document.modelContext), tools: (typeof document.modelContext!=='undefined' && document.modelContext) ? undefined : null})"], {
    encoding: "utf8", shell: false, timeout: 60000,
  });
  round.surface = (probe.stdout || "").trim().slice(0, 500);

  if (video) {
    const v = ab(["record", "start", path.join(pkg, "video.webm"), "--fps", String(fps)], { allowFail: true });
    round.streams.video = v.status === 0;
    if (!round.streams.video) round.notes.push("video recorder could not be started");
  }

  round.drains = 0;
  writeActive(round);
  console.log(`round ${id} started`);
  console.log(`  url    ${url}`);
  console.log(`  package ${pkg}`);
  console.log(`  har    ${round.streams.har ? "on" : "OFF"}`);
  console.log(`  video  ${video ? (round.streams.video ? "on" : "OFF") : "off (optional — see references/limits.md)"}`);
}

function cmdRun({ args }) {
  const round = readActive();
  if (!round) { console.error("palantir: no active round. Run `start` first."); process.exit(1); }
  if (!args.length) { console.error("palantir: run requires an agent-browser command after --"); process.exit(1); }

  // Drain BEFORE the action, so the frames that follow are attributable to it.
  const pre = drainTimeline(round);
  if (pre.landed) round.streams.dom = true;
  else if (!round.notes.includes(pre.reason)) round.notes.push(pre.reason);
  round.drains = (round.drains || 0) + 1;

  const r = ab(args, { allowFail: true });

  // Drain again, capturing the action's own mutations.
  const post = drainTimeline(round);
  if (post.landed) round.streams.dom = true;

  if (args[0] === "webmcp") recordToolCall(round, args.slice(1), r.out);

  writeActive(round);
  process.exit(r.status || 0);
}

function cmdAssert({ tool, params, expectResultContains, expectHar, expectDomMutation, expectUrlChange }) {
  const round = readActive();
  if (!round) { console.error("palantir: no active round."); process.exit(1); }
  const pkg = pkgDir(round.id);
  const results = [];

  if (tool) {
    const args = ["webmcp", "invoke", tool];
    if (params) args.push("--params", params);
    const r = ab(args, { allowFail: true, quiet: true });
    process.stdout.write(r.out);
    recordToolCall(round, ["invoke", tool], r.out);
    round.streams.tools = true;

    if (expectResultContains) {
      const ok = r.out.includes(expectResultContains);
      results.push({ check: "result contains", expect: expectResultContains, ok });
    }
  }

  if (expectHar) {
    const harPath = path.join(pkg, "network.har");
    // HAR is only readable after stop; assert against the live request list instead.
    const r = spawnSync(AB, ["network", "requests"], { encoding: "utf8", shell: false, timeout: 60000, maxBuffer: 64 * 1024 * 1024 });
    const body = r.stdout || "";
    const [methodPath, status] = String(expectHar).split(/\s+/);
    const ok = body.includes(methodPath) && (!status || body.includes(status));
    results.push({ check: "har", expect: expectHar, ok });
  }

  if (expectDomMutation) {
    const frames = (() => {
      try { return fs.readFileSync(path.join(pkg, "frames.jsonl"), "utf8").split("\n").filter(Boolean).length; } catch { return 0; }
    })();
    results.push({ check: "dom mutation frames", expect: ">0", ok: frames > 0, got: frames });
  }

  if (expectUrlChange) {
    const r = spawnSync(AB, ["get", "url"], { encoding: "utf8", shell: false, timeout: 60000 });
    const ok = (r.stdout || "").includes(expectUrlChange);
    results.push({ check: "url", expect: expectUrlChange, ok, got: (r.stdout || "").trim() });
  }

  const verdictFile = path.join(pkg, "verdict.json");
  let all = readJsonlOrJson(verdictFile) || { round: round.id, assertions: [] };
  all.assertions.push({ at: nowIso(), results });
  fs.writeFileSync(verdictFile, JSON.stringify(all, null, 2));

  const failed = results.filter((x) => !x.ok);
  for (const x of results) console.log(`  ${x.ok ? "PASS" : "FAIL"}  ${x.check}: expected ${x.expect}${x.got !== undefined ? ` got ${x.got}` : ""}`);
  writeActive(round);
  if (failed.length) { console.error(`\npalantir: ${failed.length} assertion(s) FAILED`); process.exit(1); }
}

function cmdLook({ state, shot }) {
  const round = readActive();
  if (!round) { console.error("palantir: no active round."); process.exit(1); }
  const pkg = pkgDir(round.id);
  const dir = path.join(pkg, "look");
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `${(state || "state").replace(/[^a-z0-9._-]/gi, "_")}.png`);
  const r = ab(["screenshot", file], { allowFail: true, quiet: true });
  if (r.status !== 0 || !fs.existsSync(file)) {
    console.error("palantir: screenshot failed — the vision pass could not run.");
    process.exit(1);
  }
  console.log(`vision pass captured: ${file}`);
  console.log(`  ask a SPECIFIC question (see SKILL.md, "Appearance"). State: ${state || "(unnamed)"}`);
}

function cmdStop({ summary }) {
  const round = readActive();
  if (!round) { console.error("palantir: no active round."); process.exit(1); }
  const pkg = pkgDir(round.id);

  // Final drain + stop the streams.
  const last = drainTimeline(round);
  if (last.landed) round.streams.dom = true;

  if (round.streams.har) {
    const harFile = path.join(pkg, "network.har");
    const r = ab(["network", "har", "stop", harFile], { allowFail: true, quiet: true });
    if (r.status !== 0 || !fs.existsSync(harFile)) { round.streams.har = false; round.notes.push("HAR stop failed"); }
  }
  if (round.streams.video) {
    const v = ab(["record", "stop"], { allowFail: true, quiet: true });
    const vf = path.join(pkg, "video.webm");
    if (v.status !== 0 || !fs.existsSync(vf) || fs.statSync(vf).size === 0) {
      round.streams.video = false;
      if (fs.existsSync(vf)) fs.unlinkSync(vf);
      round.notes.push("video recorder produced no file (codec?) — round is still valid on streams 1-3");
    }
  }

  // Consolidate frames -> dom.json, and delete the working file.
  const framesFile = path.join(pkg, "frames.jsonl");
  let frames = [];
  try {
    frames = fs.readFileSync(framesFile, "utf8").split("\n").filter(Boolean).map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
    fs.writeFileSync(path.join(pkg, "dom.json"), JSON.stringify(frames, null, 2));
    fs.unlinkSync(framesFile);
  } catch {}
  round.streams.dom = frames.length > 0;

  // Did tools land, and did the page even HAVE tools?
  const toolsFile = path.join(pkg, "tools.json");
  let tools = [];
  try { tools = JSON.parse(fs.readFileSync(toolsFile, "utf8")); } catch {}
  round.streams.tools = tools.length > 0;

  const list = spawnSync(AB, ["webmcp", "list"], { encoding: "utf8", shell: false, timeout: 60000 });
  const pageHasTools = /\[[0-9A-F]{8,}\]/.test(list.stdout || "") || /^\S+ \[/m.test(list.stdout || "");
  round.pageHasTools = pageHasTools;

  // Verdict on whether the round is USABLE as evidence.
  //
  // HAR alone is NOT enough. A HAR is a list of requests; it says nothing about what the
  // page did with the answer. Requiring the timeline (or a tool call) is what stops a
  // round that merely "ran some commands" from reading as verified — the silent-green
  // failure this skill exists to prevent.
  const usable = round.streams.dom || round.streams.tools;
  round.failed = !usable;
  if (!usable && round.streams.har) {
    round.notes.push("only the HAR landed — requests alone are not evidence of behaviour; the timeline or a tool call is required");
  }

  const meta = {
    ...round,
    stoppedAt: nowIso(),
    summary: (summary || "").slice(0, 160),
    counts: { tools: tools.length, frames: frames.length },
  };
  fs.writeFileSync(path.join(pkg, "meta.json"), JSON.stringify(meta, null, 2));
  clearActive();

  console.log(`round ${round.id} stopped`);
  console.log(`  summary   ${meta.summary || "(none)"}`);
  console.log(`  streams   tools=${round.streams.tools ? tools.length : "NO"}  dom=${round.streams.dom ? frames.length + " frames" : "NO"}  har=${round.streams.har ? "yes" : "NO"}  video=${round.streams.video ? "yes" : "no"}`);
  if (round.pageHasTools && !round.streams.tools) {
    console.log(`  !! the page registers WebMCP tools but this round recorded NO tool calls`);
  }
  if (round.notes.length) for (const n of round.notes) console.log(`  note: ${n}`);
  console.log(usable ? `  verdict   usable evidence` : `  verdict   FAILED — no stream landed; do not report this round as a pass`);
  if (round.failed) process.exit(1);
}

function cmdAbort() {
  const round = readActive();
  if (!round) { console.error("palantir: no active round."); process.exit(0); }
  const pkg = pkgDir(round.id);
  try { ab(["network", "har", "stop", path.join(pkg, "network.har")], { allowFail: true, quiet: true }); } catch {}
  try { if (round.streams.video) ab(["record", "stop"], { allowFail: true, quiet: true }); } catch {}
  fs.mkdirSync(pkg, { recursive: true });
  fs.writeFileSync(path.join(pkg, "meta.json"), JSON.stringify({ ...round, abortedAt: nowIso(), partial: true }, null, 2));
  clearActive();
  console.log(`round ${round.id} aborted — kept as a partial package, never shown as evidence`);
}

function cmdPending() {
  ensureDirs();
  const out = [];
  for (const d of fs.readdirSync(REVIEW_DIR)) {
    const meta = path.join(REVIEW_DIR, d, "meta.json");
    if (!fs.existsSync(meta)) continue;
    let m; try { m = JSON.parse(fs.readFileSync(meta, "utf8")); } catch { continue; }
    if (m.partial || m.abortedAt) continue;
    out.push({ round: m.id, summary: m.summary, stoppedAt: m.stoppedAt, streams: m.streams, failed: m.failed });
  }
  console.log(JSON.stringify({ rounds: out, pending: out.filter((r) => r.failed).length }, null, 2));
}

// ---------------------------------------------------------------- argv

const [cmd, ...rest] = process.argv.slice(2);
const flags = {};
const positional = [];
for (let i = 0; i < rest.length; i++) {
  const a = rest[i];
  if (a === "--") { positional.push(...rest.slice(i + 1)); break; }
  if (a.startsWith("--")) {
    const key = a.slice(2);
    const next = rest[i + 1];
    if (next !== undefined && !next.startsWith("--")) { flags[key] = next; i++; }
    else flags[key] = true;
  } else positional.push(a);
}

try {
  switch (cmd) {
    case "start": cmdStart({ url: flags.url, fps: flags.fps, video: !!flags.video, redact: flags.redact }); break;
    case "run": cmdRun({ args: positional }); break;
    case "assert": cmdAssert({
      tool: flags.tool, params: flags.params,
      expectResultContains: flags["expect-result-contains"],
      expectHar: flags["expect-har"],
      expectDomMutation: flags["expect-dom-mutation"],
      expectUrlChange: flags["expect-url-change"],
    }); break;
    case "look": cmdLook({ state: flags.state, shot: flags.shot }); break;
    case "stop": cmdStop({ summary: flags.summary }); break;
    case "abort": cmdAbort(); break;
    case "pending": cmdPending(); break;
    default:
      console.log(`palantir round runner

  start   --url <url> [--video] [--fps 5] [--redact <selectors>]
  run     -- <agent-browser args...>
  assert  [--tool <name>] [--params <json>] [--expect-result-contains <s>]
          [--expect-har "POST /api/x 201"] [--expect-dom-mutation] [--expect-url-change <s>]
  look    --state <name>
  stop    --summary "<one line, <=160 chars>"
  abort
  pending
`);
      process.exit(cmd ? 1 : 0);
  }
} catch (e) {
  console.error(`palantir: ${e.message}`);
  process.exit(1);
}
