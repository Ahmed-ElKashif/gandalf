import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, rmSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const FELLOWSHIP = join(HERE, "fellowship.mjs");

/**
 * A throwaway git repo, a brief, a fleet config, and a plan — enough for one
 * `--dry-run` dispatch. The dry run resolves the whole command line without
 * touching a worktree, so the assertions are about the command that WOULD run.
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

  const planPath = join(root, "plan.json");
  writeFileSync(planPath, JSON.stringify({ repo, lanes: lanes(brief) }, null, 2));

  return { root, repo, planPath, configPath, cleanup: () => rmSync(root, { recursive: true, force: true }) };
}

function dispatch(fx, extra = []) {
  const r = spawnSync(process.execPath, [
    FELLOWSHIP, "--plan", fx.planPath, "--dry-run", "--json", "--no-preambles", ...extra,
  ], {
    encoding: "utf8",
    env: { ...process.env, GANDALF_CONFIG: fx.configPath },
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
