#!/usr/bin/env node
/**
 * gandalf · snapshot.mjs — a throwaway copy of the working tree, for a lane that
 * must not write.
 *
 * Why this exists: `--read-only` is a request, not a guarantee. On agy 1.4.4 /
 * Windows the sandbox confines nothing — a read-only lane's writes persisted
 * inside the workspace *and* outside it. The relay can detect that afterwards
 * (it fingerprints the tree before and after), but detection is late: the write
 * already landed in the user's repo.
 *
 * So a read-only lane does not get the repo. It gets a COPY of the repo:
 *
 *   - the copy carries the full history, so `git log` and `git diff` work;
 *   - the copy carries the working tree exactly — committed, uncommitted, and
 *     untracked-but-not-ignored — so a judge sees the same diff the user does;
 *   - the copy has NO remote, so a lane cannot push anywhere;
 *   - the copy is thrown away when the lane ends.
 *
 * A worktree would be cheaper but wrong: a worktree is checked out from a commit,
 * so the uncommitted diff a judge must read would be missing.
 */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";

/** Run git and capture its output. `encoding: null` keeps NUL-separated paths intact. */
function git(args, cwd, encoding = "utf8") {
  const r = spawnSync("git", args, { cwd, encoding });
  return { code: r.status, out: encoding === "utf8" ? (r.stdout || "").trim() : r.stdout, err: encoding === "utf8" ? (r.stderr || "").trim() : r.stderr };
}

/** Split a NUL-separated git listing into paths. Git uses `/` even on Windows. */
function splitPaths(buffer) {
  if (!buffer) return [];
  return buffer.toString("utf8").split("\0").filter(Boolean);
}

/**
 * The files a snapshot must contain: everything git tracks, plus everything
 * untracked that git does not ignore. `node_modules` and friends are excluded
 * because git ignores them, which is what keeps the copy affordable.
 */
export function snapshotPaths(repoRoot) {
  const tracked = git(["ls-files", "-s", "-z"], repoRoot, "buffer");
  const entries = [];
  if (tracked.code === 0) {
    for (const record of splitPaths(tracked.out)) {
      const tab = record.indexOf("\t");
      if (tab === -1) continue;
      const meta = record.slice(0, tab).split(" ");
      const mode = meta[0];
      const filePath = record.slice(tab + 1);
      entries.push({ path: filePath, mode });
    }
  }
  const others = git(["ls-files", "-z", "-o", "--exclude-standard"], repoRoot, "buffer");
  if (others.code === 0) {
    for (const filePath of splitPaths(others.out)) entries.push({ path: filePath, mode: "100644" });
  }
  return entries;
}

/** The working tree's state, as git reports it. Two snapshots of the same tree match. */
export function treeStatus(dir) {
  const r = git(["status", "--porcelain"], dir);
  return r.code === 0 ? r.out : null;
}

/**
 * A fingerprint of the working tree: the file list AND the content of everything
 * that is not committed.
 *
 * `git status --porcelain` alone is not enough — it names the paths, not their
 * content. A lane that edits a file which was already modified leaves the status
 * output byte-identical, and the write goes unnoticed. So the paths git reports
 * are hashed too.
 */
export function treeFingerprint(dir) {
  const status = git(["status", "--porcelain=v1", "-z", "--untracked-files=all", "--no-renames"], dir, "buffer");
  if (status.code !== 0) return null;
  const entries = status.out.toString("utf8").split("\0").filter(Boolean);
  const paths = [...new Set(entries.map((entry) => entry.slice(3)))].sort();
  const fingerprint = createHash("sha256");
  fingerprint.update("status\0").update(status.out);
  for (const relative of paths) {
    fingerprint.update("\0path\0").update(relative).update("\0");
    const absolute = path.join(dir, ...relative.split("/"));
    let stat;
    try { stat = fs.lstatSync(absolute); }
    catch { fingerprint.update("missing"); continue; }
    fingerprint.update(String(stat.mode)).update("\0");
    if (stat.isSymbolicLink()) fingerprint.update(fs.readlinkSync(absolute));
    else if (stat.isFile()) fingerprint.update(createHash("sha256").update(fs.readFileSync(absolute)).digest("hex"));
  }
  return fingerprint.digest("hex");
}

/** True when the tree changed since the baseline — a read-only lane wrote something. */
export function treeChanged(dir, baseline) {
  if (!baseline) return false;
  const now = treeFingerprint(dir);
  if (now === null) return false;
  return now !== baseline;
}

/** Block briefly without pulling in a dependency. Node has no sync sleep built in. */
function sleepSync(ms) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    try { Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms); return; }
    catch { /* Atomics.wait can be unavailable; fall through to a spin */ }
  }
}

/**
 * Remove a directory without letting the cleanup be the thing that fails. A relay
 * killed from outside leaves a child holding handles, and rmSync throws EPERM —
 * masking whatever actually went wrong. Retry briefly, then name the directory
 * and let it be: an orphaned temp dir is harmless, a misleading EPERM is not.
 */
export function removeTree(dir, { attempts = 5, waitMs = 200 } = {}) {
  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      fs.rmSync(dir, { recursive: true, force: true });
      return { removed: true, error: null };
    } catch (error) {
      if (error.code !== "EPERM" && error.code !== "EBUSY") return { removed: false, error };
      if (attempt === attempts - 1) return { removed: false, error };
      sleepSync(waitMs);
    }
  }
  return { removed: false, error: null };
}

/** Copy one file, recreating a symlink as a symlink. */
function copyEntry(src, dst) {
  const stat = fs.lstatSync(src);
  if (stat.isSymbolicLink()) {
    const target = fs.readlinkSync(src);
    try { fs.symlinkSync(target, dst); } catch { /* a link we cannot make is better skipped than fatal */ }
    return;
  }
  if (!stat.isFile()) return; // directories and sockets are not entries
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  fs.copyFileSync(src, dst);
}

/**
 * Copy the working tree into a temp directory that carries the repo's history.
 *
 * Returns { dir, baseline, cleanup, files }. `baseline` is the tree's fingerprint
 * at the moment of the copy — compare it after the lane to see whether anything
 * changed.
 */
export function createSnapshot(repoRoot, { keep = false } = {}) {
  const root = path.resolve(repoRoot);
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "gandalf-snapshot-"));
  const dir = path.join(tmp, "tree");

  const clone = git(["clone", "--local", "--quiet", root, dir], path.dirname(dir));
  if (clone.code !== 0) {
    removeTree(tmp);
    throw new Error(`cannot snapshot ${root}: git clone failed — ${clone.err || clone.out}`);
  }

  // The clone's origin points at the user's repo. A lane must not be able to push
  // to it, so the snapshot has no remote at all.
  git(["remote", "remove", "origin"], dir);

  let files = 0;
  for (const entry of snapshotPaths(root)) {
    // A gitlink is a submodule: its contents live in another repo and cannot be
    // copied here. Skipping it is honest; copying it would be a lie.
    if (entry.mode === "160000") continue;
    const src = path.join(root, ...entry.path.split("/"));
    const dst = path.join(dir, ...entry.path.split("/"));
    if (!fs.existsSync(src)) continue; // deleted in the worktree; the status shows it
    try {
      copyEntry(src, dst);
      files++;
    } catch { /* one unreadable file must not sink the snapshot */ }
  }

  // The clone's checkout and the copied files can disagree on line endings, and
  // git's stat cache then reports files as modified that are byte-equivalent to
  // the index. Re-stage and reset: the index goes back to HEAD's content with a
  // fresh stat cache, so the snapshot's status is the repo's status — and the
  // uncommitted diff stays unstaged, where a judge expects to find it.
  const head = git(["rev-parse", "--verify", "-q", "HEAD"], dir);
  if (head.code === 0) {
    git(["add", "-A"], dir);
    git(["reset", "--mixed", "-q", "HEAD"], dir);
  } else {
    // A repo with no commits has no HEAD to reset to: unstage everything so the
    // files read as untracked, exactly as they do in the repo itself.
    git(["rm", "-r", "--cached", "-q", "."], dir);
  }

  const baseline = treeFingerprint(dir);

  return {
    dir,
    files,
    baseline,
    cleanup() {
      if (keep) return { removed: false, kept: dir };
      const result = removeTree(tmp);
      return result.removed ? { removed: true } : { removed: false, error: result.error, kept: tmp };
    },
  };
}
