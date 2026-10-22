#!/usr/bin/env node
/**
 * celebrimbor · survey.mjs — one root, one lookup, one bounded sweep.
 *
 * The bug this exists to prevent: an agent looking for a DESIGN.md that is
 * not there, escalating into parent directories, wandering into a previous
 * working directory, and looping. The fix is mechanical, not aspirational —
 * this script cannot leave the root it was given.
 *
 * Rules it enforces:
 *   - the target root is the ONLY place searched (--root, else the cwd);
 *   - DESIGN.md is looked up exactly once, at that root;
 *   - the evidence sweep is bounded (depth and entry caps) and never ascends;
 *   - "not found" is a valid, complete answer — the sweep ends and returns.
 *
 * Usage:
 *   node survey.mjs [--root <dir>] [--json] [--max-depth N] [--max-files N]
 *
 * Exit code is always 0: a missing DESIGN.md is an answer, not an error.
 */

import { readdirSync, readFileSync, existsSync, statSync } from "node:fs";
import { join, resolve, relative, basename, extname } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const SKILL_DIR = resolve(HERE, "..");

const DEFAULTS = { maxDepth: 3, maxFiles: 300 };
const SKIP_DIRS = new Set([
  "node_modules", ".git", "dist", "build", "out", ".next", ".nuxt", ".svelte-kit",
  "coverage", "vendor", ".cache", ".turbo", ".vercel", ".output", "target",
  "__pycache__", ".venv", "venv", ".idea", ".vscode", ".git-crypt",
]);

// Files that can hold a design system's real values.
const TOKEN_FILES = [
  "tailwind.config.js", "tailwind.config.ts", "tailwind.config.mjs", "tailwind.config.cjs",
  "theme.ts", "theme.js", "theme.css", "tokens.ts", "tokens.js", "tokens.json",
  "globals.css", "global.css", "app.css", "index.css", "styles.css", "style.css",
  "variables.css", "design-tokens.json", "design-tokens.css",
];
const STYLE_EXTS = new Set([".css", ".scss", ".sass", ".less"]);

function parseArgs(argv) {
  const out = { root: process.cwd(), json: false, ...DEFAULTS };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--root") out.root = resolve(argv[++i] ?? ".");
    else if (a === "--json") out.json = true;
    else if (a === "--max-depth") out.maxDepth = Number(argv[++i]);
    else if (a === "--max-files") out.maxFiles = Number(argv[++i]);
    else if (a === "--help" || a === "-h") out.help = true;
  }
  out.root = resolve(out.root);
  return out;
}

function help() {
  console.log(`celebrimbor · survey — one root, one lookup, one bounded sweep

  --root <dir>     the project root to survey (default: the cwd)
  --json           machine-readable output
  --max-depth N    sweep depth below the root (default ${DEFAULTS.maxDepth})
  --max-files N    entries the sweep may visit (default ${DEFAULTS.maxFiles})

Exits 0 always. "No DESIGN.md" is the answer, not a failure.`);
}

/** A single stat at the root. Never a search. */
function findDesignDoc(root) {
  const path = join(root, "DESIGN.md");
  if (!existsSync(path)) return { present: false, path };
  const stat = statSync(path);
  return { present: true, path, bytes: stat.size, modified: stat.mtime.toISOString() };
}

/**
 * One bounded sweep inside the root. The stack is seeded with the root only
 * and is never extended with a parent, so this cannot walk upward.
 */
function sweep(root, maxDepth, maxFiles) {
  const stack = [{ dir: root, depth: 0 }];
  const visited = [];
  const tokenFiles = [];
  const styleFiles = [];
  let entries = 0;
  let truncated = false;

  while (stack.length) {
    const { dir, depth } = stack.pop();
    if (depth > maxDepth) continue;
    let listing;
    try {
      listing = readdirSync(dir, { withFileTypes: true });
    } catch {
      continue; // unreadable directory is not a reason to try another one
    }
    for (const entry of listing) {
      if (entries >= maxFiles) { truncated = true; break; }
      entries++;
      const full = join(dir, entry.name);
      const rel = relative(root, full) || entry.name;
      if (entry.isDirectory()) {
        if (SKIP_DIRS.has(entry.name) || entry.name.startsWith(".")) continue;
        stack.push({ dir: full, depth: depth + 1 });
        continue;
      }
      if (!entry.isFile()) continue;
      visited.push(rel);
      const name = entry.name;
      if (TOKEN_FILES.includes(name) || name.startsWith("tailwind.config")) {
        tokenFiles.push(rel);
      } else if (STYLE_EXTS.has(extname(name).toLowerCase())) {
        styleFiles.push(rel);
      }
    }
    if (truncated) break;
  }
  return { visited, tokenFiles, styleFiles, entries, truncated };
}

function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return null;
  }
}

function detectStack(root) {
  const pkg = readJson(join(root, "package.json"));
  if (!pkg) return { present: false, name: null, framework: null, tailwind: null, deps: {} };
  const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
  const framework =
    ["next", "nuxt", "astro", "svelte", "@sveltejs/kit", "vue", "react", "@angular/core", "solid-js"]
      .find((d) => d in deps) || null;
  const tw = deps.tailwindcss || deps.tailwind || null;
  const tailwindVersion = tw ? (tw.replace(/^[^\d]*/, "") || "unknown") : null;
  const major = tailwindVersion ? Number(tailwindVersion.split(".")[0]) : null;
  const exportTarget =
    major === 4 ? "css-tailwind" : major === 3 ? "json-tailwind" : tw ? "json-tailwind" : "dtcg";
  return {
    present: true,
    name: pkg.name || null,
    framework,
    tailwind: tw,
    tailwindVersion,
    exportTarget,
    hasShadcn: Boolean(deps["shadcn"] || deps["@radix-ui/react-slot"] || deps["@radix-ui/react-dialog"]),
    deps: Object.keys(deps).slice(0, 25),
  };
}

/** Where the lint/export gate lives, if anywhere. Never runs npx. */
function detectGate() {
  const candidates = [];
  const push = (kind, command) => candidates.push({ kind, command });
  push("local", "node_modules/.bin/design.md");
  const home = process.env.USERPROFILE || process.env.HOME || "";
  if (home) {
    push("global", join(home, "node_modules", ".bin", "design.md.cmd"));
    push("global", join(home, "node_modules", ".bin", "design.md"));
  }
  for (const candidate of candidates) {
    if (existsSync(candidate.command)) return { available: true, kind: candidate.kind, path: candidate.command };
  }
  return { available: false, kind: null, path: null };
}

/** Optional enrichments, detected across the usual skill stores. */
function detectAids() {
  const home = process.env.USERPROFILE || process.env.HOME || "";
  const stores = [join(home, ".agents", "skills"), join(home, ".claude", "skills")].filter((p) => p && existsSync(p));
  const wanted = ["create-design-md", "impeccable", "ui-ux-pro-max", "design-taste-frontend", "frontend-design"];
  const found = [];
  for (const store of stores) {
    for (const name of wanted) {
      const p = join(store, name);
      if (existsSync(p) && !found.some((f) => f.name === name)) found.push({ name, path: p });
    }
  }
  const vendored = join(SKILL_DIR, "assets", "taste", "directions.json");
  return { installed: found, vendoredDataset: existsSync(vendored) };
}

function recommend(designDoc, sweepResult, stack) {
  if (designDoc.present) {
    return sweepResult.tokenFiles.length || stack.present
      ? { mode: "audit", why: "A DESIGN.md exists and the code exists too — check whether it still matches the code." }
      : { mode: "adopt", why: "A DESIGN.md exists but the project has no code to check it against." };
  }
  if (sweepResult.tokenFiles.length || stack.present) {
    return { mode: "extract", why: "No DESIGN.md, but the project has real tokens or a stack to extract one from." };
  }
  return { mode: "generate", why: "No DESIGN.md and nothing to extract from — this is a greenfield design system." };
}

function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.help) { help(); return; }

  const designDoc = findDesignDoc(opts.root);
  const sweepResult = sweep(opts.root, opts.maxDepth, opts.maxFiles);
  const stack = detectStack(opts.root);
  const gate = detectGate();
  const aids = detectAids();
  const rec = recommend(designDoc, sweepResult, stack);

  const report = {
    root: opts.root,
    designDoc,
    stack,
    gate,
    aids,
    sweep: {
      entriesVisited: sweepResult.entries,
      truncated: sweepResult.truncated,
      maxDepth: opts.maxDepth,
      maxFiles: opts.maxFiles,
      tokenFiles: sweepResult.tokenFiles,
      styleFiles: sweepResult.styleFiles.slice(0, 20),
      styleFileCount: sweepResult.styleFiles.length,
    },
    recommendedMode: rec.mode,
    reason: rec.why,
  };

  if (opts.json) {
    console.log(JSON.stringify(report, null, 2));
    return;
  }

  const rootLabel = basename(opts.root) || opts.root;
  console.log(`\n  celebrimbor survey — ${rootLabel}`);
  console.log(`  root            ${opts.root}`);
  console.log(`  DESIGN.md       ${designDoc.present ? `FOUND (${designDoc.bytes} bytes)` : "not found  ->  greenfield, forge one"}`);
  console.log(`  stack           ${stack.present ? `${stack.framework || "unknown"} ${stack.tailwind ? `+ tailwind ${stack.tailwindVersion}` : ""}`.trim() : "no package.json at the root"}`);
  console.log(`  export target   ${stack.present ? stack.exportTarget : "-"}`);
  console.log(`  gate            ${gate.available ? `design.md CLI at ${gate.path}` : "design.md CLI not found -> offline validator"}`);
  console.log(`  dataset         ${aids.vendoredDataset ? "vendored (assets/taste)" : "MISSING"}`);
  console.log(`  aids installed  ${aids.installed.length ? aids.installed.map((a) => a.name).join(", ") : "none"}`);
  console.log(`  sweep           ${sweepResult.entries} entries, depth<=${opts.maxDepth}${sweepResult.truncated ? " (CAPPED - more may exist)" : ""}`);
  if (sweepResult.tokenFiles.length) {
    console.log(`  token sources   ${sweepResult.tokenFiles.slice(0, 8).join(", ")}${sweepResult.tokenFiles.length > 8 ? ` (+${sweepResult.tokenFiles.length - 8})` : ""}`);
  }
  if (sweepResult.styleFiles.length) {
    console.log(`  stylesheets     ${sweepResult.styleFiles.slice(0, 5).join(", ")}${sweepResult.styleFiles.length > 5 ? ` (+${sweepResult.styleFiles.length - 5})` : ""}`);
  }
  console.log(`\n  -> ${rec.mode.toUpperCase()}: ${rec.why}\n`);
}

main();
