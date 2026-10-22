#!/usr/bin/env node
/**
 * celebrimbor · validate.mjs — the gate.
 *
 * A DESIGN.md is only finished when it passes. This script runs the gate and
 * never lets a hung command become a retry loop:
 *
 *   1. resolve the @google/design.md CLI (local bin -> global bin -> npx --yes
 *      with a hard timeout). Bare `npx` is never used: it prompts for install
 *      confirmation and blocks forever in a non-interactive shell.
 *   2. `design.md lint` -> JSON findings; a non-zero `summary.errors` fails.
 *   3. `design.md export --format <target>` -> every populated frontmatter
 *      category must emit its token family. A populated category with no
 *      family in the export is a schema failure even when the exit code is 0.
 *   4. If the CLI is unavailable, fall back to the built-in structural checks
 *      and say so. The fallback is weaker; it is never presented as the same
 *      evidence.
 *
 * Usage:
 *   node validate.mjs <DESIGN.md> [--format css-tailwind|json-tailwind|dtcg] [--json]
 *
 * Exit code: 0 when the gate passes, 1 when it fails, 2 when the file is
 * missing or unreadable. A timeout is a reported failure, never a retry.
 */

import { readFileSync, existsSync, statSync } from "node:fs";
import { join, resolve, dirname, basename } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { homedir } from "node:os";

const HERE = dirname(fileURLToPath(import.meta.url));
const SKILL_DIR = resolve(HERE, "..");
const CLI_TIMEOUT_MS = 60_000;

// The canonical typography properties (from `design.md spec`).
const TYPE_PROPERTIES = new Set([
  "fontFamily", "fontSize", "fontWeight", "lineHeight",
  "letterSpacing", "fontFeature", "fontVariation",
]);
// The canonical markdown section order.
const SECTION_ORDER = [
  "overview", "colors", "themes", "typography", "layout",
  "elevation & depth", "shapes", "components", "do's and don'ts",
];
const SECTION_ALIASES = {
  "brand & style": "overview",
  "layout & spacing": "layout",
  elevation: "elevation & depth",
  "do's and donts": "do's and don'ts",
  "dos and don'ts": "do's and don'ts",
};
// Which export family each populated frontmatter category must produce.
const FAMILIES = [
  { category: "colors", family: "--color-", label: "colors -> --color-*" },
  { category: "typography", family: "--font-", label: "typography.<name>.fontFamily -> --font-*" },
  { category: "typography", family: "--text-", label: "typography.<name>.fontSize -> --text-*" },
  { category: "rounded", family: "--radius-", label: "rounded -> --radius-*" },
  { category: "spacing", family: "--spacing-", label: "spacing -> --spacing-*" },
];

// ---------------------------------------------------------------------------
// minimal YAML subset parser (maps, nested maps, lists, scalars)
// ---------------------------------------------------------------------------

function parseScalar(raw) {
  const text = raw.trim();
  if (text === "") return "";
  if (/^".*"$/.test(text) || /^'.*'$/.test(text)) return text.slice(1, -1);
  if (text === "true") return true;
  if (text === "false") return false;
  if (text === "null" || text === "~") return null;
  if (/^-?\d+(\.\d+)?$/.test(text)) return Number(text);
  return text;
}

function stripComment(line) {
  let out = "";
  let quote = null;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (quote) {
      out += ch;
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'") { quote = ch; out += ch; continue; }
    if (ch === "#" && (i === 0 || /\s/.test(line[i - 1]))) break;
    out += ch;
  }
  return out;
}

/** Parse the restricted YAML that DESIGN.md frontmatter uses. */
function parseYaml(source) {
  const lines = source.split(/\r?\n/);
  const root = {};
  const stack = [{ indent: -1, node: root, key: null }];

  for (const raw of lines) {
    if (!raw.trim()) continue;
    const indent = raw.length - raw.trimStart().length;
    const line = stripComment(raw).trimEnd();
    if (!line.trim()) continue;

    while (stack.length > 1 && indent <= stack[stack.length - 1].indent) stack.pop();
    const parent = stack[stack.length - 1].node;

    if (line.trim().startsWith("- ")) {
      const value = parseScalar(line.trim().slice(2));
      const holder = stack[stack.length - 1];
      if (Array.isArray(holder.node)) holder.node.push(value);
      else {
        const arr = [];
        arr.push(value);
        if (holder.key != null) parent[holder.key] = arr;
        stack.push({ indent: stack[stack.length - 1].indent, node: arr, key: null });
      }
      continue;
    }

    const match = /^([^:]+):\s*(.*)$/.exec(line.trim());
    if (!match) continue;
    const key = match[1].trim().replace(/^["']|["']$/g, "");
    const rest = match[2].trim();

    if (rest === "") {
      const node = {};
      parent[key] = node;
      stack.push({ indent, node, key });
    } else if (rest === "[]") {
      parent[key] = [];
    } else {
      parent[key] = parseScalar(rest);
    }
  }
  return root;
}

// ---------------------------------------------------------------------------
// structural checks
// ---------------------------------------------------------------------------

function splitDocument(text) {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(text);
  if (!match) return null;
  return { frontmatter: match[1], body: match[2] };
}

function checkStructure(file, text) {
  const problems = [];
  const doc = splitDocument(text);
  if (!doc) {
    problems.push({ severity: "error", rule: "frontmatter", message: "no YAML frontmatter delimited by --- lines" });
    return { problems, data: null, sections: [] };
  }
  const data = parseYaml(doc.frontmatter);

  if (!data.name) problems.push({ severity: "error", rule: "name", message: "frontmatter has no `name`" });
  if (data.version === undefined) {
    problems.push({ severity: "warning", rule: "version", message: "frontmatter has no `version` (current: alpha)" });
  }

  for (const [category, value] of Object.entries(data)) {
    if (!["colors", "typography", "rounded", "spacing", "components"].includes(category)) continue;
    if (value === null || typeof value !== "object" || Array.isArray(value)) {
      problems.push({ severity: "error", rule: `${category}.shape`, message: `\`${category}\` must be a mapping` });
      continue;
    }
    for (const [name, token] of Object.entries(value)) {
      if (!/^[a-zA-Z0-9][a-zA-Z0-9-]*$/.test(name)) {
        problems.push({ severity: "error", rule: `${category}.name`, message: `token name "${name}" is not export-safe` });
      }
      if (category === "typography") {
        if (token === null || typeof token !== "object" || Array.isArray(token)) {
          problems.push({ severity: "error", rule: "typography.scalar", message: `typography.${name} must be a mapping of properties, not a scalar` });
          continue;
        }
        for (const prop of Object.keys(token)) {
          if (!TYPE_PROPERTIES.has(prop)) {
            problems.push({ severity: "error", rule: "typography.property", message: `typography.${name}.${prop} is not a typography property` });
          }
        }
      }
      if (category === "rounded" && name !== "base" && /^-?\d/.test(name)) {
        problems.push({ severity: "warning", rule: "rounded.name", message: `rounded.${name} looks copied from a CSS variable name` });
      }
    }
  }

  if (data.colors && typeof data.colors === "object" && !("primary" in data.colors)) {
    problems.push({ severity: "warning", rule: "missing-primary", message: "no `primary` color defined - the agent will invent key colors" });
  }

  const sections = [...doc.body.matchAll(/^##\s+(.+)$/gm)].map((m) => m[1].trim().toLowerCase());
  const normalized = sections.map((s) => SECTION_ALIASES[s] || s);
  let last = -1;
  for (const section of normalized) {
    const index = SECTION_ORDER.indexOf(section);
    if (index === -1) continue;
    if (index < last) {
      problems.push({ severity: "error", rule: "section.order", message: `section "${section}" is out of the canonical order` });
    }
    last = Math.max(last, index);
  }
  if (normalized.length && !normalized.includes("overview")) {
    problems.push({ severity: "warning", rule: "section.overview", message: "no `## Overview` section" });
  }

  return { problems, data, sections: normalized };
}

// ---------------------------------------------------------------------------
// the external gate
// ---------------------------------------------------------------------------

function findCli(projectDir) {
  const home = homedir();
  const candidates = [
    { kind: "local", path: join(projectDir, "node_modules", ".bin", "design.md") },
    { kind: "local", path: join(projectDir, "node_modules", ".bin", "design.md.cmd") },
    { kind: "global", path: join(home, "node_modules", ".bin", "design.md.cmd") },
    { kind: "global", path: join(home, "node_modules", ".bin", "design.md") },
  ];
  for (const candidate of candidates) {
    if (existsSync(candidate.path)) return candidate;
  }
  return null;
}

function run(command, args, cwd, timeout = CLI_TIMEOUT_MS) {
  const isWindows = process.platform === "win32";
  const useShell = isWindows && /\.(cmd|bat)$/i.test(command);
  const result = useShell
    ? spawnSync(command, args.map((a) => `"${a}"`), { cwd, timeout, encoding: "utf8", shell: true })
    : spawnSync(command, args, { cwd, timeout, encoding: "utf8" });
  return {
    status: result.status,
    stdout: (result.stdout || "").replace(/\u001b\[[0-9;]*m/g, ""),
    stderr: (result.stderr || "").replace(/\u001b\[[0-9;]*m/g, ""),
    error: result.error ? result.error.message : null,
    timedOut: Boolean(result.error && /ETIMEDOUT|timeout/i.test(result.error.message)),
  };
}

/**
 * A Windows npm shim is a .cmd file, and a .cmd cannot be spawned without a
 * shell — and a shell mangles a path with spaces in it. The shim names the real
 * entry point, so read it and run that with node directly.
 */
function resolveCliEntry(cli) {
  if (!/\.cmd$/i.test(cli.path)) return { command: cli.path, prefixArgs: [] };
  try {
    const shim = readFileSync(cli.path, "utf8");
    const match = /"([^"]*?\.js)"/i.exec(shim);
    if (match) {
      // npm shims use %dp0% (set from %~dp0) for the bin directory.
      const dp0 = dirname(cli.path);
      const entry = resolve(match[1].replace(/%~dp0%?/gi, dp0).replace(/%dp0%?/gi, dp0));
      return { command: process.execPath, prefixArgs: [entry] };
    }
  } catch {
    // fall through to the shell path
  }
  return { command: cli.path, prefixArgs: [] };
}

function runCli(cli, args, cwd) {
  const entry = resolveCliEntry(cli);
  if (entry.command === process.execPath) {
    return run(entry.command, [...entry.prefixArgs, ...args], cwd);
  }
  if (entry.command === "npx") {
    // `--yes` is mandatory: a bare npx prompts for install confirmation and
    // blocks forever in a non-interactive shell.
    return run("npx", ["--yes", "@google/design.md", ...args], cwd);
  }
  return run(entry.command, args, cwd);
}

// ---------------------------------------------------------------------------

function main() {
  const argv = process.argv.slice(2);
  const json = argv.includes("--json");
  const fileIndex = argv.findIndex((a) => !a.startsWith("--"));
  const file = fileIndex >= 0 ? resolve(argv[fileIndex]) : null;
  const formatIndex = argv.indexOf("--format");
  const format = formatIndex >= 0 ? argv[formatIndex + 1] : "css-tailwind";

  if (!file) {
    console.error("usage: node validate.mjs <DESIGN.md> [--format css-tailwind|json-tailwind|dtcg] [--json]");
    process.exit(2);
  }
  if (!existsSync(file)) {
    console.error(`no such file: ${file}`);
    process.exit(2);
  }

  const text = readFileSync(file, "utf8");
  const projectDir = dirname(file);
  const structural = checkStructure(file, text);
  const problems = [...structural.problems];

  const cli = findCli(projectDir);
  let gate = { source: "none", lint: null, export: null, problems: [] };

  if (cli) {
    const lint = runCli(cli, ["lint", file], projectDir);
    if (lint.timedOut) {
      gate.source = cli.kind;
      gate.problems.push({ severity: "error", rule: "gate.timeout", message: "design.md lint timed out - reported, never retried" });
    } else if (lint.status === 0 || lint.stdout.trim().startsWith("{")) {
      try {
        const parsed = JSON.parse(lint.stdout);
        gate.lint = parsed;
        const errors = parsed?.summary?.errors ?? 0;
        if (errors > 0) {
          for (const finding of parsed.findings || []) {
            if (finding.severity === "error") {
              gate.problems.push({ severity: "error", rule: finding.rule || "lint", message: `${finding.path ? finding.path + ": " : ""}${finding.message}` });
            }
          }
        }
      } catch {
        gate.problems.push({ severity: "error", rule: "gate.parse", message: "lint output was not JSON" });
      }
    } else {
      gate.problems.push({ severity: "error", rule: "gate.lint", message: `lint failed (exit ${lint.status}): ${(lint.stderr || lint.stdout).trim().split("\n")[0]}` });
    }

    if (gate.problems.length === 0) {
      const exported = runCli(cli, ["export", "--format", format, file], projectDir);
      if (exported.timedOut) {
        gate.problems.push({ severity: "error", rule: "gate.timeout", message: "design.md export timed out - reported, never retried" });
      } else if (exported.status !== 0) {
        gate.problems.push({ severity: "error", rule: "gate.export", message: `export failed (exit ${exported.status}): ${(exported.stderr || exported.stdout).trim().split("\n")[0]}` });
      } else {
        gate.export = exported.stdout;
        const data = structural.data || {};
        const populated = {
          colors: data.colors && Object.keys(data.colors).length,
          typography: data.typography && Object.keys(data.typography).length,
          rounded: data.rounded && Object.keys(data.rounded).length,
          spacing: data.spacing && Object.keys(data.spacing).length,
        };
        for (const { category, family, label } of FAMILIES) {
          if (!populated[category]) continue;
          if (category === "typography" && family === "--text-") {
            const hasSizes = Object.values(data.typography || {}).some((t) => t && typeof t === "object" && t.fontSize);
            if (!hasSizes) continue;
          }
          if (category === "typography" && family === "--font-") {
            const hasFamilies = Object.values(data.typography || {}).some((t) => t && typeof t === "object" && t.fontFamily);
            if (!hasFamilies) continue;
          }
          if (!gate.export.includes(family)) {
            gate.problems.push({ severity: "error", rule: "gate.export", message: `${label} - the category is populated but the export emits no ${family} family` });
          }
        }
      }
    }
    gate.source = cli.kind;
  } else {
    // No CLI: the structural checks stand alone, and the report says so.
    gate.source = "offline";
  }

  problems.push(...gate.problems);
  const errors = problems.filter((p) => p.severity === "error");
  const warnings = problems.filter((p) => p.severity === "warning");
  const result = {
    file,
    format,
    gate: gate.source,
    gatePath: cli ? cli.path : null,
    errors: errors.length,
    warnings: warnings.length,
    passed: errors.length === 0,
    problems,
    exported: gate.export || null,
  };

  if (json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(`\n  celebrimbor gate — ${basename(file)}`);
    console.log(`  gate            ${gate.source === "offline" ? "offline structural checks (design.md CLI not found)" : `${gate.source} CLI at ${cli.path}`}`);
    console.log(`  export target   ${format}`);
    for (const p of problems) {
      console.log(`  ${p.severity === "error" ? "ERROR" : "warn "}  ${p.rule}: ${p.message}`);
    }
    if (!problems.length) console.log("  clean");
    console.log(`\n  ${errors.length} error(s), ${warnings.length} warning(s) -> ${result.passed ? "PASS" : "FAIL"}\n`);
  }
  process.exit(result.passed ? 0 : 1);
}

main();
