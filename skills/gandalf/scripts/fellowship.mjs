#!/usr/bin/env node
/**
 * gandalf · fellowship.mjs — dispatch N lanes at once, each in its own worktree.
 *
 * Why this exists: the loop dispatches one lane at a time by hand, which is safe
 * but serial. Lanes are independent by construction — different models, different
 * loadouts, different files — so they can walk together. This runs them as N
 * sibling processes instead of N sequential ones.
 *
 * The one thing that keeps parallel safe is ISOLATION. Two lanes writing one tree
 * corrupt each other's commits, and serial dispatch is what hides that today
 * (measured: a five-lane run touched five disjoint file sets only because it ran
 * one lane at a time). So every writing lane gets its own git worktree; the
 * orchestrator merges back in review order.
 *
 * Read-only lanes (plan-debate, review-main, review-debate) share the repo: they
 * write nothing, so a worktree would only cost a checkout per run.
 *
 * It deliberately does NOT commit, merge, or review. Dispatching is all it does —
 * the gates and the land step stay the orchestrator's job.
 *
 * Usage:
 *   node fellowship.mjs --plan <file.json> [options]
 *   node fellowship.mjs --plan <file.json> --dry-run
 *   node fellowship.mjs --lanes feature,ui --brief <file> --cd <repo>
 *
 * Plan file (JSON):
 *   {
 *     "repo": "C:/path/to/repo",
 *     "base": "main",                      // worktree fork point (default: HEAD)
 *     "runDir": "C:/path/runs",            // logs + artifacts (default: <repo>/.gandalf/runs)
 *     "timeout": "30m",
 *     "lanes": [
 *       { "lane": "feature", "brief": "C:/path/feature.txt" },
 *       { "lane": "ui",      "brief": "C:/path/ui.txt", "worktree": false },
 *       { "lane": "chores",  "brief": "C:/path/chores.txt", "relay": "opencode" }
 *     ]
 *   }
 *
 * Options:
 *   --plan <file>        JSON plan (see above). Required unless --lanes/--brief given.
 *   --lanes <a,b,c>      Shorthand with a single shared --brief.
 *   --brief <file>       Brief for the --lanes shorthand.
 *   --cd <dir>           Repo root when there is no plan file.
 *   --max <n>            Max concurrent lanes (default: 4). A conservative judgment
 *                        call, not a measured optimum: five concurrent free-model
 *                        one-liners were measured clean, but real lanes are heavier
 *                        and free tiers rate-limit per account. Raise with evidence.
 *   --no-worktree        Share one tree for every lane. Only safe for lanes you have
 *                        verified touch disjoint files. Prints a warning.
 *   --keep-worktrees     Do not remove a lane's worktree after it finishes.
 *   --dry-run            Print the resolved plan (worktrees, commands, tail lines) and exit.
 *                        Writes nothing — no directories, no briefs.
 *   --json               Machine-readable summary on stdout instead of the table.
 *   --out-dir <dir>      Where run artifacts go (default: <runDir>).
 *   --preambles <file>   Role-preamble source (default: $GANDALF_PREAMBLES, else
 *                        $XDG_CONFIG_HOME/delegate-skills/preambles.md, else
 *                        ~/.config/delegate-skills/preambles.md).
 *                        Pass --no-preambles to dispatch the raw brief.
 *   --no-preambles       Disable role-block injection (raw brief only).
 *   -h, --help           Show this help.
 *
 * Exit codes: 0 = every lane succeeded; 1 = at least one lane failed; 2 = bad plan.
 *
 * Output: per-lane JSON in <runDir>/<lane>/result.json (relay-authored), a tailable
 * log at <runDir>/<lane>.log, a run manifest at <runDir>/run.json, and a summary
 * table on stdout. Every lane's session id is printed so a finished lane can be
 * reopened:
 *   opencode --session <id> --continue
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync, openSync, closeSync, rmSync, readdirSync } from "node:fs";
import { spawn, spawnSync } from "node:child_process";
import { join, resolve, basename, dirname, relative } from "node:path";
import { tmpdir, homedir } from "node:os";
import { resolvePreamblesPath, composeEffectiveBrief, writeEffectiveBrief } from "./preambles.mjs";

const SKILLS_DIR = toPathEarly(process.env.GANDALF_SKILLS_DIR || join(homedir(), ".agents", "skills"));

// Declared before toPath() exists textually; hoisted function, so this is fine.
function toPathEarly(p) {
  const msys = /^\/([a-zA-Z])\//.exec(p);
  if (msys) return `${msys[1].toUpperCase()}:\\${p.slice(3)}`;
  return p;
}

// Relay name -> script path. Same contract for every relay in delegate-skills:
// brief in; result.json + touched files out; never commits.
const RELAYS = {
  opencode: join(SKILLS_DIR, "opencode-delegate", "scripts", "relay.mjs"),
  agy: join(SKILLS_DIR, "agy-delegate", "scripts", "relay.mjs"),
  claude: join(SKILLS_DIR, "claude-delegate", "scripts", "relay.mjs"),
  codex: join(SKILLS_DIR, "codex-delegate", "scripts", "relay.mjs"),
  cursor: join(SKILLS_DIR, "cursor-delegate", "scripts", "relay.mjs"),
  warp: join(SKILLS_DIR, "warp-delegate", "scripts", "relay.mjs"),
  copilot: join(SKILLS_DIR, "copilot-delegate", "scripts", "relay.mjs"),
  kimi: join(SKILLS_DIR, "kimi-delegate", "scripts", "relay.mjs"),
  qoder: join(SKILLS_DIR, "qoder-delegate", "scripts", "relay.mjs"),
  vibe: join(SKILLS_DIR, "vibe-delegate", "scripts", "relay.mjs"),
  pi: join(SKILLS_DIR, "pi-delegate", "scripts", "relay.mjs"),
  omp: join(SKILLS_DIR, "omp-delegate", "scripts", "relay.mjs"),
  muse: join(SKILLS_DIR, "muse-delegate", "scripts", "relay.mjs"),
  aider: join(SKILLS_DIR, "aider-delegate", "scripts", "relay.mjs"),
  zcode: join(SKILLS_DIR, "zcode-delegate", "scripts", "relay.mjs"),
  cmd: join(SKILLS_DIR, "commandcode-delegate", "scripts", "relay.mjs"),
};

// Judges never write, so they never need a worktree.
const READ_ONLY_LANES = new Set(["plan-debate", "review-main", "review-debate", "security-review"]);

// agy auto-denies writes outside C:\Users\<you>; a worktree under the repo needs
// the skip flag or the lane stalls on a permission prompt nobody can answer.
const RELAY_EXTRA_FLAGS = {
  agy: ["--dangerously-skip-permissions"],
};

/**
 * The extra flags a relay needs, for THIS lane.
 *
 * A read-only lane never gets --dangerously-skip-permissions: the agy relay
 * rejects the pair outright ("--read-only and --dangerously-skip-permissions are
 * mutually exclusive"), and --read-only already composes --sandbox
 * --dangerously-skip-permissions itself. Passing both made every read-only agy
 * lane un-dispatchable — and the shipped free-first preset casts plan-debate and
 * review-debate on agy, so both gates failed before they could run.
 */
function relayExtraFlags(relay, readOnly) {
  if (readOnly) return [];
  return RELAY_EXTRA_FLAGS[relay] || [];
}

// ---- preamble injection ----------------------------------------------------
// The role block (global rules + the lane's own loadout) is what makes a cheap
// model effective. Relays do not read preambles automatically, so fellowship
// injects the matching block here. The source is ~/.config/delegate-skills/
// preambles.md (or $GANDALF_PREAMBLES / --preambles). Disable with --no-preambles.
// Extraction and composition live in preambles.mjs so they can be tested
// without dispatching a lane.

function usage(exitCode = 0) {
  const text = readFileSync(new URL(import.meta.url), "utf8");
  const body = text.slice(text.indexOf("/**") + 3, text.indexOf("*/"));
  console.log(body.split("\n").map((l) => l.replace(/^\s?\* ?/, "")).join("\n"));
  process.exit(exitCode);
}

function parseArgs(argv) {
  const opts = {
    plan: null, lanes: null, brief: null, cd: process.cwd(),
    max: 4, worktree: true, keepWorktrees: false, dryRun: false,
    json: false, outDir: null, preambles: null, noPreambles: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = () => {
      const v = argv[++i];
      if (v === undefined) { console.error(`fellowship: ${a} needs a value`); process.exit(2); }
      return v;
    };
    switch (a) {
      case "--plan": opts.plan = toPath(next()); break;
      case "--lanes": opts.lanes = next().split(",").map((s) => s.trim()).filter(Boolean); break;
      case "--brief": opts.brief = toPath(next()); break;
      case "--cd": opts.cd = toPath(next()); break;
      case "--max": opts.max = Math.max(1, parseInt(next(), 10) || 4); break;
      case "--no-worktree": opts.worktree = false; break;
      case "--keep-worktrees": opts.keepWorktrees = true; break;
      case "--dry-run": opts.dryRun = true; break;
      case "--json": opts.json = true; break;
      case "--out-dir": opts.outDir = toPath(next()); break;
      case "--preambles": opts.preambles = toPath(next()); break;
      case "--no-preambles": opts.noPreambles = true; break;
      case "-h": case "--help": usage(0); break;
      default:
        console.error(`fellowship: unknown argument ${a}`);
        usage(2);
    }
  }
  return opts;
}

// A shell hands us its own path flavour. Git Bash writes /c/Users/… and a plan
// file may carry C:/Users/… — both mean the same directory on Windows. resolve()
// alone turns "/c/…" into "D:\c\…", so translate the MSYS drive form first.
function toPath(p) {
  if (!p) return p;
  const msys = /^\/([a-zA-Z])\//.exec(p);
  if (msys) return resolve(`${msys[1].toUpperCase()}:\\${p.slice(3)}`);
  return resolve(p);
}

const opts = parseArgs(process.argv.slice(2));

// ---- resolve the plan ------------------------------------------------------

function buildPlan() {
  if (opts.plan) {
    if (!existsSync(opts.plan)) { console.error(`fellowship: no plan file at ${opts.plan}`); process.exit(2); }
    let raw;
    try { raw = JSON.parse(readFileSync(opts.plan, "utf8")); }
    catch (e) { console.error(`fellowship: plan is not valid JSON — ${e.message}`); process.exit(2); }
    if (!Array.isArray(raw.lanes) || raw.lanes.length === 0) {
      console.error("fellowship: plan needs a non-empty \"lanes\" array"); process.exit(2);
    }
    const repo = toPath(raw.repo || opts.cd);
    const runDir = toPath(raw.runDir || join(repo, ".gandalf", "runs"));
    return {
      repo,
      base: raw.base || "HEAD",
      runDir,
      timeout: raw.timeout || "30m",
      lanes: raw.lanes.map((l) => ({
        lane: l.lane,
        brief: toPath(l.brief),
        relay: l.relay || "opencode",
        readOnly: l.readOnly ?? READ_ONLY_LANES.has(l.lane),
        worktree: l.worktree ?? null, // resolved below
        model: l.model || null,
        variant: l.variant || null,
      })),
    };
  }
  if (opts.lanes && opts.brief) {
    return {
      repo: opts.cd,
      base: "HEAD",
      runDir: join(opts.cd, ".gandalf", "runs"),
      timeout: "30m",
      lanes: opts.lanes.map((lane) => ({
        lane, brief: opts.brief, relay: "opencode",
        readOnly: READ_ONLY_LANES.has(lane), worktree: null, model: null, variant: null,
      })),
    };
  }
  console.error("fellowship: give me a --plan file, or --lanes with --brief");
  usage(2);
}

const plan = buildPlan();

// A writing lane wants a worktree unless the caller said otherwise. Judges never do.
for (const lane of plan.lanes) {
  if (lane.worktree === null) lane.worktree = opts.worktree && !lane.readOnly;
}
// Explicit --no-worktree wins over an explicit per-lane true, and says so out loud.
if (!opts.worktree) {
  for (const lane of plan.lanes) {
    if (lane.worktree) console.error(`fellowship: --no-worktree overrides worktree:true on lane ${lane.lane}`);
    lane.worktree = false;
  }
}

// ---- plan validation -------------------------------------------------------

const problems = [];
for (const lane of plan.lanes) {
  if (!lane.lane) problems.push("a lane entry has no \"lane\" name");
  if (!lane.brief) problems.push(`lane ${lane.lane}: no brief`);
  else if (!existsSync(lane.brief)) problems.push(`lane ${lane.lane}: brief not found at ${lane.brief}`);
  if (!RELAYS[lane.relay]) problems.push(`lane ${lane.lane}: unknown relay "${lane.relay}" (have: ${Object.keys(RELAYS).join(", ")})`);
  else if (!existsSync(RELAYS[lane.relay])) problems.push(`lane ${lane.lane}: relay script missing at ${RELAYS[lane.relay]}`);
}
if (!existsSync(plan.repo)) problems.push(`repo not found at ${plan.repo}`);
const seen = new Set();
for (const lane of plan.lanes) {
  if (seen.has(lane.lane)) problems.push(`lane ${lane.lane}: listed twice — one lane walks once`);
  seen.add(lane.lane);
}
// A lane name must be a real wire name AND cast in the fleet config, or the relay
// falls back to something the user did not choose. Catch it here, not at dispatch.
const WIRE_ROLES = new Set([
  "feature", "ui", "bugfix", "devops", "chores", "complex",
  "qa", "qa-look",
  "plan-debate", "review-main", "review-debate", "security-review",
]);

function castLanes() {
  const cfg = process.env.GANDALF_CONFIG
    || join(homedir(), ".config", "delegate-skills", "config.json");
  if (!existsSync(cfg)) return null;
  try {
    const raw = JSON.parse(readFileSync(cfg, "utf8"));
    const lanes = raw.lanes || raw.implementers || null;
    if (!lanes) return null;
    return new Set(Array.isArray(lanes) ? lanes.map((l) => l.name || l.lane).filter(Boolean) : Object.keys(lanes));
  } catch { return null; }
}

const cast = castLanes();
for (const lane of plan.lanes) {
  if (!WIRE_ROLES.has(lane.lane)) {
    problems.push(`lane "${lane.lane}" is not a gandalf lane (have: ${[...WIRE_ROLES].join(", ")})`);
  } else if (cast && !cast.has(lane.lane)) {
    problems.push(`lane "${lane.lane}" is not cast in the fleet config — cast it, or pick a lane that is`);
  }
}

if (problems.length) {
  console.error("fellowship: the plan will not fly:");
  for (const p of problems) console.error(`  - ${p}`);
  process.exit(2);
}

if (plan.lanes.length > 1 && plan.lanes.every((l) => !l.worktree)) {
  console.error("fellowship: WARNING — every lane shares one tree. Two lanes touching one file will corrupt each other. Only do this for lanes you have verified are disjoint.");
}

// ---- git helpers -----------------------------------------------------------

function git(args, cwd = plan.repo) {
  const r = spawnSync("git", args, { cwd, encoding: "utf8" });
  return { code: r.status, out: (r.stdout || "").trim(), err: (r.stderr || "").trim() };
}

if (!existsSync(plan.repo)) { console.error(`fellowship: repo not found at ${plan.repo}`); process.exit(2); }
const isRepo = git(["rev-parse", "--is-inside-work-tree"]);
if (isRepo.code !== 0) {
  console.error(`fellowship: ${plan.repo} is not a git repository — worktree isolation is impossible here`);
  process.exit(2);
}

const repoRoot = git(["rev-parse", "--show-toplevel"]).out || plan.repo;
const baseSha = git(["rev-parse", plan.base]).out;
if (!baseSha) {
  console.error(`fellowship: cannot resolve base "${plan.base}" in ${repoRoot}`);
  process.exit(2);
}

const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\..+/, "Z");
const outDir = opts.outDir || join(plan.runDir, stamp);
// Directories are created after the dry-run branch: --dry-run must not write.

// Worktrees live beside the runs, not inside the repo, so a lane's checkout never
// shows up in another lane's `git status`.
const worktreeRoot = join(dirname(repoRoot), `.gandalf-worktrees-${basename(repoRoot)}`);

function makeWorktree(lane) {
  const dir = join(worktreeRoot, `${stamp}-${lane}`);
  const r = git(["worktree", "add", "--detach", dir, baseSha], repoRoot);
  if (r.code !== 0) throw new Error(`git worktree add failed for ${lane}: ${r.err || r.out}`);
  return dir;
}

function removeWorktree(dir) {
  if (!dir) return;
  const r = git(["worktree", "remove", "--force", dir], repoRoot);
  if (r.code !== 0) console.error(`fellowship: could not remove worktree ${dir} — ${r.err || r.out}`);
}

// ---- resolve each lane's working dir --------------------------------------

const runners = [];
const preamblesPath = opts.noPreambles ? null : resolvePreamblesPath(opts.preambles);
if (!opts.noPreambles && opts.preambles && !preamblesPath) {
  console.error(`fellowship: preambles file not found at ${opts.preambles}`);
  process.exit(2);
}
if (preamblesPath) {
  if (!opts.json) console.log(`preambles  ${preamblesPath}`);
} else if (!opts.noPreambles) {
  console.warn("preambles  none found — lanes run without role blocks (generate one from templates/preambles.example.md)");
}
for (const lane of plan.lanes) {
  let cwd = repoRoot;
  let worktreeDir = null;
  if (lane.worktree) {
    if (opts.dryRun) {
      worktreeDir = join(worktreeRoot, `${stamp}-${lane.lane}`);
      cwd = worktreeDir;
    } else {
      try { worktreeDir = makeWorktree(lane.lane); cwd = worktreeDir; }
      catch (e) { console.error(`fellowship: ${e.message}`); removeWorktree(worktreeDir); process.exit(2); }
    }
  }
  const laneOutDir = join(outDir, lane.lane);
  const logPath = join(outDir, `${lane.lane}.log`);
  // Auto-inject the role preamble (global rules + the lane's loadout) so the
  // hobbit actually carries its skill set, even on a plain relay dispatch.
  // Compose is pure; only a real run writes the effective brief.
  const composed = preamblesPath
    ? composeEffectiveBrief({
        briefPath: lane.brief,
        laneName: lane.lane,
        preamblesPath,
        outDir: laneOutDir,
      })
    : null;
  if (composed?.used && !composed.laneFound) {
    console.warn(`fellowship: no preamble block for lane "${lane.lane}" — injecting global rules only`);
  }
  if (composed?.used && !opts.dryRun) writeEffectiveBrief(composed);
  // On a dry run the file is not written, but the preview should still show the
  // command the real run would use — including the injected brief path.
  const effectiveBrief = composed?.used ? composed.outputPath : lane.brief;
  const argv = [
    RELAYS[lane.relay],
    "--brief", effectiveBrief,
    "--cd", cwd,
    "--lane", lane.lane,
    "--out-dir", laneOutDir,
  ];
  if (lane.readOnly) argv.push("--read-only");
  if (lane.model) argv.push("--model", lane.model);
  if (lane.variant) argv.push("--variant", lane.variant);
  if (plan.timeout) argv.push("--timeout", plan.timeout);
  argv.push(...relayExtraFlags(lane.relay, lane.readOnly));

  runners.push({
    lane, cwd, worktreeDir, outDir: laneOutDir, logPath, argv,
    brief: lane.brief,
    effectiveBrief,
    preamble: composed?.used ? composed.outputPath : null,
  });
}

// ---- dry run ---------------------------------------------------------------

if (opts.dryRun) {
  const shown = runners.map((r) => ({
    lane: r.lane.lane,
    relay: r.lane.relay,
    readOnly: r.lane.readOnly,
    worktree: r.worktreeDir,
    cwd: r.cwd,
    log: r.logPath,
    tail: `tail -f "${r.logPath}"`,
    brief: r.brief,
    preamble: r.preamble,
    command: `node ${r.argv.map((a) => (a.includes(" ") ? JSON.stringify(a) : a)).join(" ")}`,
  }));
  if (opts.json) console.log(JSON.stringify({ dryRun: true, repo: repoRoot, base: baseSha, outDir, lanes: shown }, null, 2));
  else {
    console.log(`fellowship — DRY RUN`);
    console.log(`repo    ${repoRoot}`);
    console.log(`base    ${baseSha}`);
    console.log(`runs    ${outDir}`);
    console.log(`max     ${opts.max} concurrent\n`);
    for (const s of shown) {
      console.log(`[${s.lane}] relay=${s.relay} readOnly=${s.readOnly}`);
      console.log(`  cwd      ${s.cwd}`);
      if (s.worktree) console.log(`  worktree ${s.worktree}`);
      if (s.preamble) console.log(`  preamble would write ${s.preamble}`);
      console.log(`  log      ${s.tail}`);
      console.log(`  command  ${s.command}\n`);
    }
    console.log("No worktrees were created, no files were written, and no lane was dispatched (--dry-run).");
    console.log("The effective-brief paths above are previews; they are written only on a real run.");
  }
  process.exit(0);
}

// ---- run -------------------------------------------------------------------

mkdirSync(plan.runDir, { recursive: true });
mkdirSync(outDir, { recursive: true });
const manifestPath = join(outDir, "run.json");
const manifest = {
  version: 1,
  run: stamp,
  repo: repoRoot,
  base: baseSha,
  createdAt: new Date().toISOString(),
  preambles: preamblesPath,
  lanes: runners.map((r) => ({
    lane: r.lane.lane,
    relay: r.lane.relay,
    model: r.lane.model,
    variant: r.lane.variant,
    readOnly: r.lane.readOnly,
    worktree: r.worktreeDir,
    cwd: r.cwd,
    brief: r.brief,
    effectiveBrief: r.effectiveBrief,
    preamble: r.preamble,
    outDir: r.outDir,
    log: r.logPath,
  })),
};
writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

if (!opts.json) {
  console.log(`fellowship — ${runners.length} lane(s), max ${opts.max} concurrent`);
  console.log(`repo ${repoRoot}`);
  console.log(`base ${baseSha}`);
  console.log(`runs ${outDir}`);
  console.log(`manifest ${manifestPath}`);
  console.log(`\nWatch a lane live in its own tab:\n`);
  for (const r of runners) console.log(`  [${r.lane.lane}]  tail -f "${r.logPath}"`);
  console.log("");
}

const results = [];
// The relay's word for "the run finished and the model reported success".
const OK_STATUSES = new Set(["ok", "success", "completed"]);

function runLane(r) {
  return new Promise((done) => {
    const started = Date.now();
    let fd;
    try { fd = openSync(r.logPath, "a"); }
    catch (e) { done({ lane: r.lane.lane, status: "failed", error: `cannot open log ${r.logPath}: ${e.message}` }); return; }

    const child = spawn(process.execPath, r.argv, { stdio: ["ignore", fd, fd] });
    child.on("error", (e) => {
      try { closeSync(fd); } catch {}
      done({ lane: r.lane.lane, status: "failed", error: String(e.message), worktreeDir: r.worktreeDir });
    });
    child.on("close", (code, signal) => {
      try { closeSync(fd); } catch {}
      const seconds = Math.round((Date.now() - started) / 1000);
      // The relay is the authority on its own outcome; read its result.json.
      let result = null;
      const resultPath = join(r.outDir, "result.json");
      if (existsSync(resultPath)) {
        try { result = JSON.parse(readFileSync(resultPath, "utf8")); } catch { result = null; }
      }
      let status;
      if (!result) {
        // No result.json is a bad invocation or a hard kill, not a model failure.
        status = signal ? "killed" : code === 2 ? "bad-invocation" : "failed";
      } else {
        // Trust the relay's own status field. Measured: the opencode relay writes
        // "completed" on success — accepting only "ok"/"success" reads success as
        // failure, which then deletes a worktree that holds real work.
        status = result.status || (code === 0 ? "completed" : "failed");
      }
      done({
        lane: r.lane.lane,
        status,
        exitCode: code,
        signal: signal || null,
        seconds,
        sessionId: result?.sessionId || null,
        touchedFiles: result?.touchedFiles ?? null,
        worktreeDir: r.worktreeDir,
        log: r.logPath,
        resultPath: existsSync(resultPath) ? resultPath : null,
        error: result?.error || (result ? null : "relay wrote no result.json"),
      });
    });
  });
}

// Bounded concurrency: free tiers rate-limit per account, so N-at-once has a
// ceiling that max-concurrency is the term for. Overflow lanes queue.
let next = 0;
async function worker() {
  while (next < runners.length) {
    const r = runners[next++];
    if (!opts.json) console.log(`  → ${r.lane.lane} started`);
    const res = await runLane(r);
    results.push(res);
    const ok = OK_STATUSES.has(res.status);
    const mark = ok ? "ok" : res.status.toUpperCase();
    if (!opts.json) console.log(`  ${ok ? "✓" : "✗"} ${res.lane} ${mark} in ${res.seconds}s${res.sessionId ? ` (session ${res.sessionId})` : ""}`);
  }
}

await Promise.all(Array.from({ length: Math.min(opts.max, runners.length) }, () => worker()));

// ---- merge order -----------------------------------------------------------

/**
 * Gandalf does not merge in the order lanes finished, and not alphabetically. He merges
 * in the order that keeps each step cheap and reviewable:
 *
 *   1. A lane that others depend on goes first — a foundation that lands late forces
 *      every dependent lane to rebase.
 *   2. Within that, the lane whose work is most likely to be rejected goes first, so a
 *      bounce is discovered before other lanes have built on top of it.
 *   3. Biggest blast radius last: touching many files or shared code late means fewer
 *      things to re-verify if it has to be reverted.
 *
 * File overlap is the hard signal — two lanes touching one file WILL conflict, and the
 * one to merge second is the one that rebases. Report that plainly rather than letting
 * the user discover it at merge time.
 */
const MERGE_RANK = {
  // Foundations and small, likely-rejected fixes first.
  bugfix: 0, chores: 1, devops: 2, feature: 3, complex: 4, ui: 5,
  // QA lanes are verification, not implementation. They normally touch no
  // product files, but rank them after the writers so a stray evidence file
  // never lands before the code it describes.
  qa: 6, "qa-look": 7,
};

function touchedList(r) {
  if (!Array.isArray(r.touchedFiles)) return [];
  // Relay returns `git status --porcelain` lines. Untracked files arrive as
  // "?? notes/" — a DIRECTORY, not a file — so two lanes each creating a different
  // file in one new directory would look like a collision. Expand directories to the
  // files inside them before comparing, or the overlap warning cries wolf.
  const files = [];
  for (const raw of r.touchedFiles) {
    const entry = String(raw).replace(/^(.{2})\s+/, "").trim();
    if (!entry) continue;
    if (entry.endsWith("/")) {
      const dir = r.worktreeDir || plan.repo;
      try {
        for (const f of walkFiles(dir, entry)) files.push(f);
      } catch { /* unreadable dir: fall back to the entry itself */ files.push(entry); }
    } else {
      files.push(entry);
    }
  }
  return files;
}

/** Every file under `relDir` in `root`, as repo-relative slash paths. */
function walkFiles(root, relDir) {
  const out = [];
  const base = join(root, relDir.replace(/\/+$/, ""));
  if (!existsSync(base)) return out;
  const stack = [base];
  while (stack.length) {
    const dir = stack.pop();
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, e.name);
      if (e.isDirectory()) stack.push(full);
      // relative(), not a manual slice: string offsets break on mixed separators and
      // silently truncate the first character of the name.
      else out.push(relative(root, full).replace(/\\/g, "/"));
    }
  }
  return out;
}

function planMergeOrder(done) {
  // Only lanes that produced work can be merged; a failed lane has nothing to land.
  const merges = done.filter((r) => OK_STATUSES.has(r.status) && r.worktreeDir);
  const steps = [];
  for (const r of merges) {
    const files = touchedList(r);
    // Overlap against every lane already scheduled to merge BEFORE this one.
    const earlier = merges.filter((o) => o !== r && (MERGE_RANK[o.lane] ?? 9) < (MERGE_RANK[r.lane] ?? 9));
    const overlaps = [];
    for (const o of earlier) {
      const shared = touchedList(o).filter((f) => files.includes(f));
      if (shared.length) overlaps.push({ lane: o.lane, files: shared });
    }
    steps.push({
      lane: r.lane,
      rank: MERGE_RANK[r.lane] ?? 9,
      files,
      worktree: r.worktreeDir,
      sessionId: r.sessionId,
      overlaps,
    });
  }
  steps.sort((a, b) => a.rank - b.rank || (a.lane < b.lane ? -1 : 1));
  return steps;
}

const mergeSteps = planMergeOrder(results);
// Declared once, outside the output branch — the exit code depends on it either way.
const failed = results.filter((r) => !OK_STATUSES.has(r.status));

if (opts.json) {
  console.log(JSON.stringify({ repo: repoRoot, base: baseSha, outDir, manifest: manifestPath, results, mergeOrder: mergeSteps }, null, 2));
} else {
  results.sort((a, b) => (a.lane < b.lane ? -1 : a.lane > b.lane ? 1 : 0));
  console.log(`\n===== FELLOWSHIP SUMMARY =====`);
  const pad = Math.max(...results.map((r) => r.lane.length), 4);
  for (const r of results) {
    const touched = r.touchedFiles ? `${touchedList(r).length} file(s)` : "n/a";
    console.log(`${r.lane.padEnd(pad)}  ${r.status.padEnd(14)} ${String(r.seconds).padStart(5)}s  ${touched}`);
  }
  console.log(`\n${results.length - failed.length}/${results.length} lane(s) ok.`);
  if (failed.length) {
    console.log(`failed: ${failed.map((r) => `${r.lane} (${r.status})`).join(", ")}`);
    console.log(`read a failed lane's log before assuming a model failure — no result.json means a bad invocation.`);
  }

  // Reopening a finished lane is how the orchestrator reads what a hobbit actually did.
  const resumable = results.filter((r) => r.sessionId);
  if (resumable.length) {
    console.log(`\nRead a lane's transcript:`);
    for (const r of resumable) console.log(`  [${r.lane}]  opencode --session ${r.sessionId} --continue`);
  }

  // Worktrees are where the lanes' work lives until Gandalf merges it. The order is
  // not the order they finished — see planMergeOrder() for the rule.
  if (mergeSteps.length) {
    console.log(`\nMerge order — review each diff, then land it:`);
    mergeSteps.forEach((s, i) => {
      const files = s.files.length ? `${s.files.length} file(s)` : "no tracked changes";
      console.log(`  ${i + 1}. [${s.lane}]  ${files}`);
      console.log(`     ${s.worktree}`);
      for (const o of s.overlaps) {
        console.log(`     ⚠ overlaps [${o.lane}] on ${o.files.join(", ")} — this one rebases`);
      }
    });
    const clashing = mergeSteps.filter((s) => s.overlaps.length);
    if (clashing.length) {
      console.log(`\n${clashing.length} lane(s) share files with an earlier lane. Landing in the order above means the EARLIER lane merges clean and the later one rebases. Do not reorder without reading both diffs.`);
    } else {
      console.log(`\nNo file overlap between lanes — the order above is safe as written.`);
    }
  }

  // The gate plan itself — what Gandalf must run before merging anything.
  console.log(`\nBefore you merge (${mergeSteps.length} lane(s) to land):`);
  console.log(`  1. Read each diff — a hobbit's report is a claim, not evidence.`);
  console.log(`  2. Run the project gates on the merged tree, not each worktree alone.`);
  console.log(`  3. Guards on the artifact: clean-code-guard / test-guard / docs-guard.`);
  console.log(`  4. UI touched? a clean qa round gates the ui lane before it lands.`);
  console.log(`  5. Land one lane at a time — a conflict is cheapest when it is one lane's.`);
}

// Clean up worktrees, but NEVER one that holds work. A failed lane may still have
// written files before it died (measured: a misread status deleted two worktrees
// that each contained a real commit-ready change). Safety beats tidiness: a
// worktree is removed only when it is provably clean — no diff, no untracked file.
function worktreeHasWork(dir) {
  if (!dir || !existsSync(dir)) return false;
  const dirty = git(["status", "--porcelain"], dir);
  return dirty.code === 0 && dirty.out.trim().length > 0;
}

if (!opts.keepWorktrees) {
  let kept = 0;
  for (const r of results) {
    if (!r.worktreeDir) continue;
    if (OK_STATUSES.has(r.status) || worktreeHasWork(r.worktreeDir)) { kept++; continue; }
    removeWorktree(r.worktreeDir);
  }
  if (kept > 0 && !opts.json) console.log(`\nworktrees kept for ${kept} lane(s) that hold work — merge them back, then remove with \`git worktree remove\`.`);
}

process.exit(failed.length ? 1 : 0);
