import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import { createSnapshot, treeStatus, treeChanged, treeFingerprint, snapshotPaths, removeTree } from "./snapshot.mjs";

function git(dir, args) {
  return spawnSync("git", args, { cwd: dir, encoding: "utf8" });
}

/** A repo with a commit, an uncommitted edit, an untracked file, and an ignored one. */
function fixture() {
  const root = mkdtempSync(join(tmpdir(), "gandalf-snapshot-test-"));
  const repo = join(root, "repo");
  mkdirSync(repo);
  git(repo, ["init", "-q"]);
  writeFileSync(join(repo, ".gitignore"), "ignored.txt\n");
  writeFileSync(join(repo, "tracked.txt"), "committed\n");
  writeFileSync(join(repo, "ignored.txt"), "should not travel\n");
  git(repo, ["add", "-A"]);
  git(repo, ["-c", "user.email=t@t", "-c", "user.name=t", "commit", "-q", "-m", "base"]);
  // The working tree moves on after the commit — this is what a judge must see.
  writeFileSync(join(repo, "tracked.txt"), "edited but not committed\n");
  writeFileSync(join(repo, "untracked.txt"), "new file\n");
  return { root, repo, cleanup: () => rmSync(root, { recursive: true, force: true }) };
}

test("a snapshot carries the working tree, not just the commit", () => {
  const fx = fixture();
  try {
    const snap = createSnapshot(fx.repo);
    try {
      assert.equal(readFileSync(join(snap.dir, "tracked.txt"), "utf8"), "edited but not committed\n");
      assert.equal(readFileSync(join(snap.dir, "untracked.txt"), "utf8"), "new file\n");
      assert.equal(existsSync(join(snap.dir, "ignored.txt")), false, "an ignored file must not travel");
      assert.ok(snap.files >= 2);
    } finally {
      snap.cleanup();
    }
  } finally {
    fx.cleanup();
  }
});

test("the snapshot's diff matches the repo's diff", () => {
  const fx = fixture();
  try {
    const snap = createSnapshot(fx.repo);
    try {
      const here = git(fx.repo, ["diff"]).stdout;
      const there = git(snap.dir, ["diff"]).stdout;
      assert.equal(there, here, "a judge must see the same uncommitted diff");
      assert.equal(treeStatus(snap.dir), treeStatus(fx.repo), "the snapshot's status is the repo's status");
    } finally {
      snap.cleanup();
    }
  } finally {
    fx.cleanup();
  }
});

test("the snapshot has the history but no remote", () => {
  const fx = fixture();
  try {
    const snap = createSnapshot(fx.repo);
    try {
      assert.match(git(snap.dir, ["log", "--oneline"]).stdout, /base/);
      const remotes = git(snap.dir, ["remote"]).stdout.trim();
      assert.equal(remotes, "", "a lane must not be able to push to the user's repo");
    } finally {
      snap.cleanup();
    }
  } finally {
    fx.cleanup();
  }
});

test("the baseline matches the repo's own state", () => {
  const fx = fixture();
  try {
    const snap = createSnapshot(fx.repo);
    try {
      assert.equal(snap.baseline, treeFingerprint(fx.repo));
      assert.equal(treeChanged(snap.dir, snap.baseline), false);
    } finally {
      snap.cleanup();
    }
  } finally {
    fx.cleanup();
  }
});

test("a write inside the snapshot is detected", () => {
  const fx = fixture();
  try {
    const snap = createSnapshot(fx.repo);
    try {
      writeFileSync(join(snap.dir, "sneaky.txt"), "the lane should not have written this\n");
      assert.equal(treeChanged(snap.dir, snap.baseline), true);
    } finally {
      snap.cleanup();
    }
  } finally {
    fx.cleanup();
  }
});

test("an edit to an already-modified file is detected", () => {
  const fx = fixture();
  try {
    const snap = createSnapshot(fx.repo);
    try {
      // tracked.txt is already modified in the fixture, so `git status` alone
      // cannot tell these two states apart — only the content hash can.
      writeFileSync(join(snap.dir, "tracked.txt"), "edited twice, still not committed\n");
      assert.equal(treeChanged(snap.dir, snap.baseline), true);
    } finally {
      snap.cleanup();
    }
  } finally {
    fx.cleanup();
  }
});

test("the user's repo is untouched by anything done to the snapshot", () => {
  const fx = fixture();
  try {
    const snap = createSnapshot(fx.repo);
    try {
      writeFileSync(join(snap.dir, "sneaky.txt"), "written in the copy\n");
      assert.equal(existsSync(join(fx.repo, "sneaky.txt")), false);
    } finally {
      snap.cleanup();
    }
  } finally {
    fx.cleanup();
  }
});

test("cleanup removes the snapshot tree", () => {
  const fx = fixture();
  try {
    const snap = createSnapshot(fx.repo);
    const dir = snap.dir;
    snap.cleanup();
    assert.equal(existsSync(dir), false);
  } finally {
    fx.cleanup();
  }
});

test("snapshotPaths lists tracked and untracked, and skips ignored files", () => {
  const fx = fixture();
  try {
    const paths = snapshotPaths(fx.repo).map((e) => e.path);
    assert.ok(paths.includes("tracked.txt"));
    assert.ok(paths.includes("untracked.txt"));
    assert.equal(paths.includes("ignored.txt"), false);
  } finally {
    fx.cleanup();
  }
});

test("removeTree survives a directory it cannot delete and says so", () => {
  const dir = mkdtempSync(join(tmpdir(), "gandalf-rm-"));
  const result = removeTree(dir, { attempts: 1 });
  assert.equal(result.removed, true);
  assert.equal(existsSync(dir), false);
});
