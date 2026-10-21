#!/usr/bin/env node
// verify-install.mjs — confirm what actually got installed, versus what the repo ships.
//
// `npx skills add ...` (the upstream vercel-labs/skills CLI) sometimes prints
// "Failed to install N skills" even when every skill landed on disk — an
// upstream defect (#2 in our bug list). Re-running the install is the wrong
// first reaction: it clobbers the verified patches and wastes minutes.
//
// This script walks the repo's skills/ directory and, for each one, checks the
// matching ~/.agents/skills/<name> tree file-by-file. Line endings are normalised
// (CRLF -> LF) before comparing, so a checkout with core.autocrlf=true does not
// read as drift. It never changes anything.
//
// Usage:
//   node skills/gandalf/scripts/verify-install.mjs
//   node skills/gandalf/scripts/verify-install.mjs --skills-root <dir>
//   node skills/gandalf/scripts/verify-install.mjs --repo <path-to-gandalf>
//   node skills/gandalf/scripts/verify-install.mjs --json

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
// Default repo root: three levels up from this file (skills/gandalf/scripts -> repo).
const defaultRepo = path.resolve(HERE, "..", "..", "..");

function parseArgs(argv) {
  const opts = {
    skillsRoot: path.join(os.homedir(), ".agents", "skills"),
    repo: defaultRepo,
    json: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--skills-root") opts.skillsRoot = path.resolve(argv[++i]);
    else if (a === "--repo") opts.repo = path.resolve(argv[++i]);
    else if (a === "--json") opts.json = true;
    else if (a === "-h" || a === "--help") {
      console.log("usage: verify-install.mjs [--skills-root <dir>] [--repo <path>] [--json]");
      process.exit(0);
    } else {
      console.error(`verify-install: unknown argument ${a}`);
      process.exit(2);
    }
  }
  return opts;
}

function listFiles(root) {
  const out = [];
  if (!fs.existsSync(root)) return out;
  const stack = [root];
  while (stack.length) {
    const dir = stack.pop();
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if ([".git", "node_modules", ".gandalf"].includes(entry.name)) continue;
        stack.push(full);
      } else {
        out.push(path.relative(root, full));
      }
    }
  }
  return out.sort();
}

function normalise(text) {
  return text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

function readText(file) {
  try {
    return normalise(fs.readFileSync(file, "utf8"));
  } catch {
    return null;
  }
}

function inspectSkill(name, repoSkillDir, skillsRoot) {
  const installedDir = path.join(skillsRoot, name);
  if (!fs.existsSync(installedDir)) {
    return { name, state: "missing", detail: "not installed", files: { missing: [], changed: [], extra: [] } };
  }
  const expected = new Set(listFiles(repoSkillDir));
  const actual = new Set(listFiles(installedDir));
  const missing = [];
  const changed = [];
  const extra = [];
  for (const rel of expected) {
    if (!actual.has(rel)) { missing.push(rel); continue; }
    const a = readText(path.join(repoSkillDir, rel));
    const b = readText(path.join(installedDir, rel));
    if (a === null || b === null) {
      // Binary or unreadable: fall back to a byte comparison.
      if (!fs.readFileSync(path.join(repoSkillDir, rel)).equals(fs.readFileSync(path.join(installedDir, rel)))) {
        changed.push(rel);
      }
    } else if (a !== b) {
      changed.push(rel);
    }
  }
  for (const rel of actual) if (!expected.has(rel)) extra.push(rel);
  if (missing.length || changed.length) {
    return { name, state: "drift", detail: `${missing.length} missing, ${changed.length} changed`, files: { missing, changed, extra } };
  }
  return { name, state: "installed", detail: extra.length ? `${extra.length} extra file(s)` : "ok", files: { missing, changed, extra } };
}

function main() {
  const opts = parseArgs(process.argv.slice(2));
  const repoSkillsDir = path.join(opts.repo, "skills");
  if (!fs.existsSync(repoSkillsDir)) {
    console.error(`verify-install: no skills/ directory at ${repoSkillsDir}`);
    process.exit(2);
  }
  const skillNames = fs.readdirSync(repoSkillsDir, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort();

  const results = skillNames.map((name) => inspectSkill(name, path.join(repoSkillsDir, name), opts.skillsRoot));

  if (opts.json) {
    console.log(JSON.stringify({ skillsRoot: opts.skillsRoot, repo: opts.repo, results }, null, 2));
    process.exit(results.some((r) => r.state === "missing") ? 1 : 0);
  }

  const nameWidth = Math.max(12, ...results.map((r) => r.name.length)) + 2;
  const stateWidth = 10;
  console.log(`verify-install  (repo: ${opts.repo})`);
  console.log(`skills root: ${opts.skillsRoot}\n`);
  console.log(`  ${"skill".padEnd(nameWidth)}${"state".padEnd(stateWidth)}detail`);
  for (const r of results) {
    const mark = r.state === "installed" ? "ok" : r.state === "missing" ? "MISSING" : "DRIFT";
    console.log(`  ${r.name.padEnd(nameWidth)}${mark.padEnd(stateWidth)}${r.detail}`);
    if (r.state === "drift") {
      for (const f of r.files.missing) console.log(`      missing:  ${f}`);
      for (const f of r.files.changed) console.log(`      changed:  ${f}`);
    }
    if (r.files.extra.length) {
      for (const f of r.files.extra) console.log(`      extra:    ${f}`);
    }
  }
  console.log("");

  const installed = results.filter((r) => r.state === "installed").length;
  const missing = results.filter((r) => r.state === "missing").length;
  const drift = results.filter((r) => r.state === "drift").length;
  console.log(`${installed} installed, ${missing} missing, ${drift} drifted (of ${results.length})`);

  // Explain the upstream message. This is the whole point of the script.
  console.log("");
  console.log("About the \"Failed to install N skills\" message from `npx skills add`:");
  console.log("  the upstream vercel-labs/skills CLI prints it even when every skill");
  console.log("  landed on disk (an upstream defect). Re-running the install is the");
  console.log("  wrong first reaction: it clobbers the verified patches and wastes");
  console.log("  minutes. Run this script first. If a skill is genuinely MISSING,");
  console.log("  re-run `npx skills add Ahmed-ElKashif/gandalf -g -y` once, then");
  console.log("  `node skills/council-of-elrond/scripts/patch-skills.mjs apply`.");

  process.exit(missing > 0 ? 1 : 0);
}

main();
