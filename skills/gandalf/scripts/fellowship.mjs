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
 *   --max <n>            Max concurrent lanes (default: 4). Free tiers rate-limit
 *                        per account, not per process — 4 has headroom; raise with
 *                        evidence, not hope.
 *   --no-worktree        Share one tree for every lane. Only safe for lanes you have
 *                        verified touch disjoint files. Prints a warning.
 *   --keep-worktrees     Do not remove a lane's worktree after it finishes.
 *   --dry-run            Print the resolved plan (worktrees, commands, tail lines) and exit.
 *   --json               Machine-readable summary on stdout instead of the table.
 *   --out-dir <dir>      Where run artifacts go (default: <runDir>).
 *   -h, --help           Show this help.
 *
 * Exit codes: 0 = every lane succeeded; 1 = at least one lane failed; 2 = bad plan.
 *
 * Output: per-lane JSON in <runDir>/<lane>/result.json (relay-authored), a tailable
 * log at <runDir>/<lane>.log, and a summary table on stdout. Every lane's session id
 * is printed so a finished lane can be reopened:
 *   opencode --session <id> --continue
 */

import { readFileSync, mkdirSync, existsSync, openSync, closeSync, rmSync } from "node:fs";
import { spawn, spawnSync } from "node:child_process";
import { join, resolve, basename, dirname } from "node:path";
import { tmpdir, homedir } from "node:os";

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
    json: false, outDir: null,
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
  "plan-debate", "review-main", "review-debate", "security-review", "qa",
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
    problems.push(`lane "${lane.lane}" is not a gandalf role (have: ${[...WIRE_ROLES].join(", ")})`);
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

mkdirSync(plan.runDir, { recursive: true });
const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\..+/, "Z");
const outDir = opts.outDir || join(plan.runDir, stamp);
mkdirSync(outDir, { recursive: true });

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
  const argv = [
    RELAYS[lane.relay],
    "--brief", lane.brief,
    "--cd", cwd,
    "--lane", lane.lane,
    "--out-dir", laneOutDir,
  ];
  if (lane.readOnly) argv.push("--read-only");
  if (lane.model) argv.push("--model", lane.model);
  if (lane.variant) argv.push("--variant", lane.variant);
  if (plan.timeout) argv.push("--timeout", plan.timeout);
  if (RELAY_EXTRA_FLAGS[lane.relay]) argv.push(...RELAY_EXTRA_FLAGS[lane.relay]);

  runners.push({ lane, cwd, worktreeDir, outDir: laneOutDir, logPath, argv });
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
      console.log(`  log      ${s.tail}`);
      console.log(`  command  ${s.command}\n`);
    }
    console.log("No worktrees were created and no lane was dispatched (--dry-run).");
  }
  process.exit(0);
}

// ---- run -------------------------------------------------------------------

console.log(`fellowship — ${runners.length} lane(s), max ${opts.max} concurrent`);
console.log(`repo ${repoRoot}`);
console.log(`base ${baseSha}`);
console.log(`runs ${outDir}`);
console.log(`\nWatch a lane live in its own tab:\n`);
for (const r of runners) console.log(`  [${r.lane.lane}]  tail -f "${r.logPath}"`);
console.log("");

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
    console.log(`  → ${r.lane.lane} started`);
    const res = await runLane(r);
    results.push(res);
    const ok = OK_STATUSES.has(res.status);
    const mark = ok ? "ok" : res.status.toUpperCase();
    console.log(`  ${ok ? "✓" : "✗"} ${res.lane} ${mark} in ${res.seconds}s${res.sessionId ? ` (session ${res.sessionId})` : ""}`);
  }
}

await Promise.all(Array.from({ length: Math.min(opts.max, runners.length) }, () => worker()));

// ---- summary ---------------------------------------------------------------

results.sort((a, b) => (a.lane < b.lane ? -1 : a.lane > b.lane ? 1 : 0));
const failed = results.filter((r) => !OK_STATUSES.has(r.status));

if (opts.json) {
  console.log(JSON.stringify({ repo: repoRoot, base: baseSha, outDir, results }, null, 2));
} else {
  console.log(`\n===== FELLOWSHIP SUMMARY =====`);
  const pad = Math.max(...results.map((r) => r.lane.length), 4);
  for (const r of results) {
    const touched = Array.isArray(r.touchedFiles) ? `${r.touchedFiles.length} file(s)` : "n/a";
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

  // Worktrees are where the lanes' work actually lives until the orchestrator merges.
  const withTrees = results.filter((r) => r.worktreeDir);
  if (withTrees.length) {
    console.log(`\nLane worktrees (merge these back in review order):`);
    for (const r of withTrees) console.log(`  [${r.lane}]  ${r.worktreeDir}`);
  }
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
  if (kept > 0) console.log(`\nworktrees kept for ${kept} lane(s) that hold work — merge them back, then remove with \`git worktree remove\`.`);
}

process.exit(failed.length ? 1 : 0);
