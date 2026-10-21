import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, readFileSync, rmSync, mkdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const FELLOWSHIP = join(HERE, "fellowship.mjs");

/**
 * A relay that behaves like a real one and can be told to misbehave. It writes
 * into its working directory when FAKE_RELAY_WRITES is set, and it reports the
 * violation only when FAKE_RELAY_REPORTS_VIOLATION is set — a relay that does not
 * notice is the case worth testing, because then the dispatcher is the only
 * witness left.
 *
 * With FAKE_RELAY_TIMELINE set it appends start/end marks to that file, so a
 * test can see whether two lanes really ran at the same time.
 */
const FAKE_RELAY = `
import fs from "node:fs";
import path from "node:path";
const args = process.argv.slice(2);
const get = (flag) => { const i = args.indexOf(flag); return i === -1 ? null : args[i + 1]; };
const cwd = get("--cd");
const outDir = get("--out-dir");
const lane = get("--lane") || "unknown";
fs.mkdirSync(outDir, { recursive: true });
const wrote = process.env.FAKE_RELAY_WRITES === "1";
if (wrote) fs.writeFileSync(path.join(cwd, "written-by-a-read-only-lane.txt"), "oops\\n");
const timeline = process.env.FAKE_RELAY_TIMELINE;
if (timeline) {
  const start = Date.now();
  fs.appendFileSync(timeline, JSON.stringify({ lane, event: "start", at: start }) + "\\n");
  const until = start + 900;
  while (Date.now() < until) { /* hold the slot so an overlap is visible */ }
  fs.appendFileSync(timeline, JSON.stringify({ lane, event: "end", at: Date.now() }) + "\\n");
}
fs.writeFileSync(path.join(outDir, "result.json"), JSON.stringify({
  status: "completed",
  readOnlyViolation: process.env.FAKE_RELAY_REPORTS_VIOLATION === "1" ? true : false,
  workdir: cwd,
  touchedFiles: wrote ? ["written-by-a-read-only-lane.txt"] : [],
}, null, 2));
`;

/**
 * A throwaway git repo, a brief, a fleet config, a fake skills dir, and a plan —
 * enough for one dispatch. The dry run resolves the whole command line without
 * touching a worktree; the real run exercises the snapshot.
 */
function fixture(lanes, { cast } = {}) {
  const root = mkdtempSync(join(tmpdir(), "gandalf-fellowship-"));
  const repo = join(root, "repo");
  mkdirSync(repo);
  const git = (args) => spawnSync("git", args, { cwd: repo, encoding: "utf8" });
  git(["init", "-q"]);
  writeFileSync(join(repo, "README.md"), "# fixture\n");
  git(["add", "-A"]);
  git(["-c", "user.email=t@t", "-c", "user.name=t", "commit", "-q", "-m", "base"]);

  const brief = join(root, "brief.md");
  writeFileSync(brief, "do the thing\n");

  const configPath = join(root, "config.json");
  writeFileSync(configPath, JSON.stringify({ version: "delegate-fleet.v1", lanes: cast ?? {} }, null, 2));

  const skillsDir = join(root, "skills");
  for (const relay of ["agy-delegate", "opencode-delegate"]) {
    mkdirSync(join(skillsDir, relay, "scripts"), { recursive: true });
    writeFileSync(join(skillsDir, relay, "scripts", "relay.mjs"), FAKE_RELAY);
  }

  const planPath = join(root, "plan.json");
  writeFileSync(planPath, JSON.stringify({ repo, lanes: lanes(brief) }, null, 2));

  return {
    root, repo, planPath, configPath, skillsDir,
    cleanup: () => rmSync(root, { recursive: true, force: true }),
  };
}

function dispatch(fx, extra = [], { dryRun = true, env = {} } = {}) {
  const r = spawnSync(process.execPath, [
    FELLOWSHIP, "--plan", fx.planPath, ...(dryRun ? ["--dry-run"] : []), "--json", "--no-preambles", ...extra,
  ], {
    encoding: "utf8",
    env: {
      ...process.env,
      GANDALF_CONFIG: fx.configPath,
      GANDALF_SKILLS_DIR: fx.skillsDir,
      ...env,
    },
  });
  return { code: r.status, stdout: r.stdout, stderr: r.stderr };
}

/** The command line a lane would run, as the dry run reports it. */
function commandFor(result, lane) {
  assert.equal(result.code, 0, `dry run failed: ${result.stderr}`);
  const parsed = JSON.parse(result.stdout);
  const found = parsed.lanes.find((l) => l.lane === lane);
  assert.ok(found, `lane ${lane} missing from the dry run`);
  return found.command;
}

test("a read-only agy lane is not given --dangerously-skip-permissions", () => {
  const fx = fixture(
    (brief) => [{ lane: "plan-debate", brief, relay: "agy" }],
    { cast: { "plan-debate": { implementer: "agy" } } },
  );
  try {
    const command = commandFor(dispatch(fx), "plan-debate");
    assert.match(command, /--read-only/);
    assert.doesNotMatch(
      command,
      /--dangerously-skip-permissions/,
      "the agy relay rejects --read-only together with --dangerously-skip-permissions",
    );
  } finally {
    fx.cleanup();
  }
});

test("a writing agy lane still gets --dangerously-skip-permissions", () => {
  const fx = fixture(
    (brief) => [{ lane: "feature", brief, relay: "agy" }],
    { cast: { feature: { implementer: "agy" } } },
  );
  try {
    const command = commandFor(dispatch(fx), "feature");
    assert.doesNotMatch(command, /--read-only/);
    assert.match(command, /--dangerously-skip-permissions/);
  } finally {
    fx.cleanup();
  }
});

test("a read-only opencode lane is not given --dangerously-skip-permissions", () => {
  const fx = fixture(
    (brief) => [{ lane: "review-main", brief, relay: "opencode" }],
    { cast: { "review-main": { implementer: "opencode" } } },
  );
  try {
    const command = commandFor(dispatch(fx), "review-main");
    assert.match(command, /--read-only/);
    assert.doesNotMatch(command, /--dangerously-skip-permissions/);
  } finally {
    fx.cleanup();
  }
});

test("the relay comes from the cast when the plan does not name one", () => {
  const fx = fixture(
    (brief) => [{ lane: "plan-debate", brief }],
    { cast: { "plan-debate": { implementer: "agy" } } },
  );
  try {
    const result = dispatch(fx);
    assert.equal(result.code, 0, result.stderr);
    const lane = JSON.parse(result.stdout).lanes.find((l) => l.lane === "plan-debate");
    assert.equal(lane.relay, "agy");
    assert.equal(lane.relayFrom, "cast");
  } finally {
    fx.cleanup();
  }
});

test("the dry run says a read-only lane will run against a copy", () => {
  const fx = fixture(
    (brief) => [{ lane: "review-main", brief, relay: "agy" }],
    { cast: { "review-main": { implementer: "agy" } } },
  );
  try {
    const result = dispatch(fx);
    assert.equal(result.code, 0, result.stderr);
    const lane = JSON.parse(result.stdout).lanes.find((l) => l.lane === "review-main");
    assert.match(lane.snapshot, /gandalf-snapshot-review-main/, "the plan must show the copy the lane will get");
    assert.notEqual(lane.cwd, fx.repo, "a read-only lane must not be pointed at the repo");
  } finally {
    fx.cleanup();
  }
});

test("a plan that contradicts the cast is refused", () => {
  const fx = fixture(
    (brief) => [{ lane: "plan-debate", brief, relay: "opencode" }],
    { cast: { "plan-debate": { implementer: "agy" } } },
  );
  try {
    const result = dispatch(fx);
    assert.equal(result.code, 2, "the plan must be refused");
    assert.match(result.stderr, /the cast binds it to "agy"/);
    assert.doesNotMatch(result.stderr, /this relay is opencode/);
  } finally {
    fx.cleanup();
  }
});

test("--allow-relay-mismatch downgrades the contradiction to a warning", () => {
  const fx = fixture(
    (brief) => [{ lane: "plan-debate", brief, relay: "opencode" }],
    { cast: { "plan-debate": { implementer: "agy" } } },
  );
  try {
    const result = dispatch(fx, ["--allow-relay-mismatch"]);
    assert.equal(result.code, 0, result.stderr);
    assert.match(result.stderr, /WARNING — the plan contradicts the cast/);
    const lane = JSON.parse(result.stdout).lanes.find((l) => l.lane === "plan-debate");
    assert.equal(lane.relay, "opencode");
  } finally {
    fx.cleanup();
  }
});

test("a read-only lane runs against a snapshot copy, not the repo", () => {
  const fx = fixture(
    (brief) => [{ lane: "review-main", brief, relay: "agy" }],
    { cast: { "review-main": { implementer: "agy" } } },
  );
  try {
    const result = dispatch(fx, [], { dryRun: false });
    assert.equal(result.code, 0, result.stderr);
    const lane = JSON.parse(result.stdout).results.find((r) => r.lane === "review-main");
    assert.equal(lane.status, "completed");
    assert.ok(lane.snapshotDir, "a read-only lane must run against a snapshot");
    assert.notEqual(lane.snapshotDir, fx.repo, "the lane must not run against the user's repo");
    assert.equal(existsSync(lane.snapshotDir), false, "the snapshot must be deleted when the lane ends");
  } finally {
    fx.cleanup();
  }
});

test("a read-only lane that writes fails the lane and leaves the repo untouched", () => {
  const fx = fixture(
    (brief) => [{ lane: "review-main", brief, relay: "agy" }],
    { cast: { "review-main": { implementer: "agy" } } },
  );
  try {
    const result = dispatch(fx, [], { dryRun: false, env: { FAKE_RELAY_WRITES: "1" } });
    assert.equal(result.code, 1, "a lane that wrote is not a successful lane");
    const lane = JSON.parse(result.stdout).results.find((r) => r.lane === "review-main");
    assert.equal(lane.status, "read-only-violation");
    assert.equal(lane.readOnlyViolation, true);
    assert.match(lane.violationDetail, /snapshot/);
    assert.equal(
      existsSync(join(fx.repo, "written-by-a-read-only-lane.txt")),
      false,
      "the write must not reach the user's repo",
    );
  } finally {
    fx.cleanup();
  }
});

test("--no-snapshot runs a read-only lane in the repo, and the relay's verdict is the only witness", () => {
  const fx = fixture(
    (brief) => [{ lane: "review-main", brief, relay: "agy" }],
    { cast: { "review-main": { implementer: "agy" } } },
  );
  try {
    const result = dispatch(fx, ["--no-snapshot"], {
      dryRun: false,
      env: { FAKE_RELAY_WRITES: "1", FAKE_RELAY_REPORTS_VIOLATION: "1" },
    });
    const lane = JSON.parse(result.stdout).results.find((r) => r.lane === "review-main");
    assert.equal(lane.status, "read-only-violation");
    assert.equal(lane.violationDetail, "the relay reported a read-only violation");
    assert.equal(
      existsSync(join(fx.repo, "written-by-a-read-only-lane.txt")),
      true,
      "without the snapshot the write lands in the user's repo — that is why the snapshot is the default",
    );
  } finally {
    fx.cleanup();
  }
});

/** Read the fake relay's timeline and return one [start, end] interval per lane. */
function intervals(timelinePath) {
  const events = readFileSync(timelinePath, "utf8")
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line));
  const spans = new Map();
  for (const event of events) {
    const span = spans.get(event.lane) ?? { start: event.at, end: event.at };
    if (event.event === "start") span.start = event.at;
    if (event.event === "end") span.end = event.at;
    spans.set(event.lane, span);
  }
  return [...spans.values()];
}

test("two lanes on the same relay never run at the same time", () => {
  const fx = fixture(
    (brief) => [
      { lane: "feature", brief, relay: "opencode" },
      { lane: "ui", brief, relay: "opencode" },
    ],
    { cast: { feature: { implementer: "opencode" }, ui: { implementer: "opencode" } } },
  );
  try {
    const timeline = join(fx.root, "timeline.jsonl");
    const result = dispatch(fx, ["--no-worktree"], {
      dryRun: false,
      env: { FAKE_RELAY_TIMELINE: timeline },
    });
    assert.equal(result.code, 0, result.stderr);
    const [a, b] = intervals(timeline);
    assert.ok(a && b, "both lanes must have run");
    const overlap = a.start < b.end && b.start < a.end;
    assert.equal(overlap, false, "two opencode relays at once deadlock silently");
  } finally {
    fx.cleanup();
  }
});

test("lanes on different relays still run together", () => {
  const fx = fixture(
    (brief) => [
      { lane: "feature", brief, relay: "opencode" },
      { lane: "ui", brief, relay: "agy" },
    ],
    { cast: { feature: { implementer: "opencode" }, ui: { implementer: "agy" } } },
  );
  try {
    const timeline = join(fx.root, "timeline.jsonl");
    const result = dispatch(fx, ["--no-worktree"], {
      dryRun: false,
      env: { FAKE_RELAY_TIMELINE: timeline },
    });
    assert.equal(result.code, 0, result.stderr);
    const [a, b] = intervals(timeline);
    assert.ok(a && b, "both lanes must have run");
    const overlap = a.start < b.end && b.start < a.end;
    assert.equal(overlap, true, "different relays are independent and must still walk together");
  } finally {
    fx.cleanup();
  }
});
