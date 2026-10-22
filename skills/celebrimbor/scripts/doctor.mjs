#!/usr/bin/env node
/**
 * celebrimbor · doctor.mjs — the first-use check.
 *
 * Celebrimbor ships self-contained: the research dataset, the composer, and an
 * offline gate are all inside the skill, so a forge never needs an install.
 * Some things still make it better. This script finds out what the machine
 * already has, prints the delta with the exact command for each gap, and
 * installs the missing ones when the operator says yes.
 *
 * It never installs anything without an explicit `--yes`, and it never
 * re-installs what is already present.
 *
 * Usage:
 *   node doctor.mjs            report only
 *   node doctor.mjs --yes      install what is missing
 *   node doctor.mjs --json     machine-readable
 */

import { readFileSync, existsSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { homedir } from "node:os";

const HERE = dirname(fileURLToPath(import.meta.url));
const SKILL_DIR = resolve(HERE, "..");
const DEPS_PATH = join(SKILL_DIR, "deps.json");

function expand(path) {
  return path
    .replace(/^\$HOME/, homedir())
    .replace(/^~(?=$|\/|\\)/, homedir());
}

function detect(dep) {
  const found = [];
  for (const pattern of dep.detect || []) {
    const candidate = expand(pattern);
    if (existsSync(candidate)) found.push(candidate);
  }
  return found;
}

function npmGlobalBin() {
  const home = homedir();
  const candidates = [
    join(home, "node_modules", ".bin", "design.md.cmd"),
    join(home, "node_modules", ".bin", "design.md"),
  ];
  return candidates.find((p) => existsSync(p)) || null;
}

function install(dep) {
  const command = process.platform === "win32" && dep.installWindows ? dep.installWindows : dep.install;
  const tokens = command.split(/\s+/).filter(Boolean);
  const [bin, ...args] = tokens;
  const result = spawnSync(bin, args, { encoding: "utf8", shell: process.platform === "win32", timeout: 300_000 });
  return {
    command,
    ok: result.status === 0,
    status: result.status,
    output: ((result.stdout || "") + (result.stderr || "")).trim().split("\n").slice(-4).join("\n"),
  };
}

function main() {
  const argv = process.argv.slice(2);
  const yes = argv.includes("--yes");
  const json = argv.includes("--json");

  if (!existsSync(DEPS_PATH)) {
    console.error(`deps.json missing at ${DEPS_PATH}`);
    process.exit(2);
  }
  const manifest = JSON.parse(readFileSync(DEPS_PATH, "utf8"));

  const self = {
    dataset: existsSync(join(SKILL_DIR, manifest.selfContained.dataset, "directions.json")),
    composer: existsSync(join(SKILL_DIR, manifest.selfContained.composer)),
    offlineGate: existsSync(join(SKILL_DIR, manifest.selfContained.offlineGate)),
    starterKit: existsSync(join(SKILL_DIR, "assets", "starter-kit.json")),
  };

  const deps = manifest.dependencies.map((dep) => {
    const paths = detect(dep);
    // the npm CLI is not a skill: it may also live in a global node_modules
    if (dep.id === "design-md-cli" && paths.length === 0) {
      const global = npmGlobalBin();
      if (global) paths.push(global);
    }
    return { ...dep, paths, installed: paths.length > 0 };
  });

  const missing = deps.filter((d) => !d.installed);
  const report = { self, dependencies: deps.map(({ detect: _d, ...rest }) => rest), missing: missing.map((d) => d.id), installed: [] };

  if (yes) {
    for (const dep of missing) {
      const result = install(dep);
      report.installed.push({ id: dep.id, ...result });
      dep.installed = result.ok;
      dep.installResult = result;
    }
  }

  if (json) {
    console.log(JSON.stringify(report, null, 2));
    process.exit(missing.length && !yes ? 0 : 0);
  }

  console.log("\n  celebrimbor doctor\n");
  console.log("  Self-contained (ship inside the skill):");
  for (const [key, value] of Object.entries(self)) {
    console.log(`    ${value ? "ok  " : "MISS"}  ${key}`);
  }
  if (!self.starterKit) console.log("    MISS  starterKit  -> assets/starter-kit.json");

  console.log("\n  Optional aids:");
  for (const dep of deps) {
    const mark = dep.installed ? "ok  " : "miss";
    console.log(`    ${mark}  ${dep.id.padEnd(20)} ${dep.unlocks}`);
    if (!dep.installed) console.log(`          install: ${dep.install}`);
    else console.log(`          found:   ${dep.paths[0]}`);
  }

  if (missing.length) {
    console.log(`\n  ${missing.length} optional aid(s) missing. Nothing is required - celebrimbor forges with what ships inside it.`);
    console.log("  Re-run with --yes to install them, or install one by hand with the command above.");
  } else {
    console.log("\n  Every optional aid is present.");
  }
  console.log("");
}

main();
