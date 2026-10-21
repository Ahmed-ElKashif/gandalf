#!/usr/bin/env node
// Apply and verify the local patches this fellowship ships for installed third-party
// skills. A reinstall of amElnagdy's skills (or of anything else we patch) replaces
// the file and silently drops the fix; arming runs `apply` afterwards so the fix is
// restored — and `check` says so loudly when upstream has moved instead of guessing.
//
// The patch engine is `git apply`: exact unified diffs with context, no fuzz, no
// hand-rolled string replacement. It works outside a git worktree, which is what an
// installed ~/.agents/skills tree is.

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PATCH_DIR = path.join(HERE, "..", "patches");

const argv = process.argv.slice(2);
const hasFlag = (name) => argv.includes(`--${name}`);

function flagValue(name, fallback = null) {
  const i = argv.indexOf(`--${name}`);
  if (i < 0) return fallback;
  const value = argv[i + 1];
  return value && !value.startsWith("--") ? value : fallback;
}

// The manifest defaults to the one this skill ships. `--manifest` points the
// engine at another set — a fixture in a test, a vendored set in CI.
const MANIFEST = flagValue("manifest")
  ? path.resolve(flagValue("manifest"))
  : path.join(PATCH_DIR, "manifest.json");

function die(message, code = 2) {
  console.error(`patch-skills: ${message}`);
  process.exit(code);
}

const command = argv[0] && !argv[0].startsWith("--") ? argv[0] : "check";
const json = hasFlag("json");
const verbose = hasFlag("verbose");
const dryRun = hasFlag("dry-run") || command === "check";
const skillsRoot = path.resolve(flagValue("skills-root", path.join(os.homedir(), ".agents", "skills")));

if (hasFlag("help") || hasFlag("h") || command === "help") {
  console.log(`usage: patch-skills.mjs <check|apply|list> [options]

  check   verify every patch is applied; exit 1 when one is pending, missing, or drifted
  apply   apply pending patches; already-applied ones are left alone (idempotent)
  list    print the manifest

options:
  --skills-root <dir>   installed skills directory (default: ~/.agents/skills)
  --manifest <file>     patch manifest (default: this skill's patches/manifest.json)
  --only <id[,id]>      limit to these patch ids
  --scope <s[,s]>       patch scopes to consider (default: general)
  --json                machine-readable output
  --verbose             include git's reason when a patch has drifted
  --dry-run             report what apply would do, change nothing

A patch is a unified diff tailored to one installed skill. "drift" means upstream
changed the surrounding code: stop, inspect the diff, and update the patch. Never
force it — a patch applied to code it was not written for is worse than no patch.`);
  process.exit(0);
}

if (!fs.existsSync(MANIFEST)) die(`manifest not found at ${MANIFEST}`);
const manifest = JSON.parse(fs.readFileSync(MANIFEST, "utf8"));
// Patch files live next to the manifest, so a manifest elsewhere (a fixture, a
// vendored set) finds its own patches.
const MANIFEST_DIR = path.dirname(MANIFEST);

const scopes = new Set(String(flagValue("scope", "general")).split(",").map((s) => s.trim()).filter(Boolean));
const only = flagValue("only")
  ? new Set(String(flagValue("only")).split(",").map((s) => s.trim()).filter(Boolean))
  : null;

const knownScopes = new Set(manifest.patches.map((p) => p.scope));
for (const scope of scopes) {
  if (!knownScopes.has(scope)) {
    die(`unknown scope "${scope}" (known: ${[...knownScopes].join(", ")})`);
  }
}
const knownIds = new Set(manifest.patches.map((p) => p.id));
if (only) {
  for (const id of only) {
    if (!knownIds.has(id)) die(`unknown patch id "${id}" (known: ${[...knownIds].join(", ")})`);
  }
}

function selected(entry) {
  return scopes.has(entry.scope) && (!only || only.has(entry.id));
}

function git(args, cwd) {
  const r = spawnSync("git", args, { cwd, encoding: "utf8", maxBuffer: 32 * 1024 * 1024 });
  if (r.error) return { ok: false, error: r.error.message, stderr: "" };
  return { ok: r.status === 0, status: r.status, error: null, stderr: (r.stderr || "").trim(), stdout: (r.stdout || "").trim() };
}

const probe = spawnSync("git", ["--version"], { encoding: "utf8" });
if (probe.error || probe.status !== 0) {
  die("git is required to verify patches (git apply); install git and retry");
}

if (command === "list") {
  if (json) {
    console.log(JSON.stringify(manifest, null, 2));
    process.exit(0);
  }
  for (const entry of manifest.patches) {
    if (!selected(entry)) continue;
    const need = entry.required ? "required" : "optional";
    console.log(`${entry.id}\n  skill: ${entry.skill}  (pack: ${entry.pack}, tier: ${entry.tier}, ${need} patch)\n  files: ${entry.files.join(", ")}\n  scope: ${entry.scope}\n  why: ${entry.why}\n`);
  }
  process.exit(0);
}

if (command !== "check" && command !== "apply") {
  die(`unknown command "${command}" (use check, apply, or list)`);
}

if (!fs.existsSync(skillsRoot)) {
  die(`skills directory not found: ${skillsRoot}\nPass --skills-root <dir> if your skills live elsewhere.`);
}

function firstLines(text, count = 3) {
  return text.split(/\r?\n/).map((s) => s.trim()).filter(Boolean).slice(0, count).join(" | ");
}

function inspect(entry) {
  const dir = path.join(skillsRoot, entry.skill);
  if (!fs.existsSync(dir)) {
    return {
      state: entry.required ? "missing" : "skipped",
      detail: entry.required ? `required skill is not installed: ${dir}` : "optional skill is not installed",
    };
  }

  const patch = path.join(MANIFEST_DIR, entry.patch);
  if (!fs.existsSync(patch)) {
    return { state: "broken", detail: `patch file missing: ${entry.patch}` };
  }

  // Pending: the diff applies cleanly. Applied: the reverse diff does — `git apply`
  // works outside a worktree, so an installed skill directory is a valid target.
  const forward = git(["apply", "--check", "-p1", patch], dir);
  if (forward.ok) return { state: "pending", detail: "", dir, patch };

  const reverse = git(["apply", "--check", "-R", "-p1", patch], dir);
  if (reverse.ok) return { state: "applied", detail: "", dir, patch };

  return {
    state: "drift",
    detail: firstLines(forward.stderr || forward.error || "patch does not apply"),
    dir,
    patch,
  };
}

const results = [];
for (const entry of manifest.patches) {
  if (!selected(entry)) continue;
  const result = inspect(entry);
  results.push({ ...entry, ...result });
}

if (command === "apply") {
  for (const result of results) {
    if (result.state !== "pending") continue;
    if (dryRun) continue;
    const applied = git(["apply", "-p1", result.patch], result.dir);
    if (!applied.ok) {
      result.state = "broken";
      result.detail = firstLines(applied.stderr || applied.error || "git apply failed");
      continue;
    }
    const verified = git(["apply", "--check", "-R", "-p1", result.patch], result.dir);
    if (!verified.ok) {
      result.state = "broken";
      result.detail = "patch applied but does not reverse-check; the target may be half-patched";
      continue;
    }
    result.state = "applied";
    result.detail = "";
  }
}

const order = ["applied", "pending", "drift", "missing", "skipped", "broken"];
const summary = Object.fromEntries(order.map((state) => [state, results.filter((r) => r.state === state).length]));
const failed = summary.pending + summary.drift + summary.missing + summary.broken > 0;

if (json) {
  console.log(JSON.stringify({
    command,
    dryRun,
    skillsRoot,
    patches: results.map((r) => ({
      id: r.id,
      skill: r.skill,
      pack: r.pack,
      tier: r.tier,
      required: r.required,
      state: r.state,
      files: r.files,
      detail: r.detail || undefined,
    })),
    summary,
  }, null, 2));
} else {
  console.log(`patch ${command}  (skills: ${skillsRoot})`);
  console.log("");
  const skillWidth = Math.max(10, ...results.map((r) => r.skill.length)) + 2;
  const filesWidth = Math.max(20, ...results.map((r) => r.files.join(", ").length)) + 2;
  for (const result of results) {
    const state = result.state.padEnd(8);
    const skill = result.skill.padEnd(skillWidth);
    const files = result.files.join(", ").padEnd(filesWidth);
    console.log(`  ${state} ${skill} ${files} ${result.id}`);
    if (result.detail && (verbose || result.state !== "skipped")) {
      console.log(`           ${result.detail}`);
    }
  }
  console.log("");
  const tally = order.filter((s) => summary[s]).map((s) => `${summary[s]} ${s}`).join(", ") || "nothing selected";
  console.log(`${tally}`);

  if (summary.drift) {
    console.log("");
    console.log("drift means upstream changed the code this patch was written against.");
    console.log("Do not force it. Inspect the diff, update the patch, and re-run. The patch");
    console.log("files live in the council-of-elrond skill's patches/ directory.");
  }
  if (command === "check" && summary.pending) {
    console.log("");
    console.log("pending patches are not applied. Run: node patch-skills.mjs apply");
  }
  if (command === "apply" && summary.pending && !dryRun) {
    console.log("");
    console.log("pending remained after apply — run with --verbose for the reason.");
  }
  if (dryRun && command === "apply") {
    console.log("");
    console.log("dry run: nothing was changed.");
  }
}

process.exit(failed ? 1 : 0);
