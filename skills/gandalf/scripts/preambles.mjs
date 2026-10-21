#!/usr/bin/env node
/**
 * gandalf · preambles.mjs — resolve, extract, and compose role preambles.
 *
 * Kept separate from fellowship.mjs so the injector can be tested without
 * dispatching a lane. The rules are deliberately simple:
 *
 *   - A block starts at a "## " heading and runs to the next "## " heading.
 *   - The global block is the heading containing "global" (or the first block).
 *   - The lane block is the heading containing the lane's wire name.
 *   - If the lane block is missing, the global block still travels, and the
 *     caller is told so it can warn instead of silently degrading.
 *
 * This module does not write anything. `writeEffectiveBrief` is the only
 * side-effecting function, and the CLI calls it only on a real run.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { homedir } from "node:os";

/**
 * Where the preambles file lives.
 * Precedence: explicit override → $GANDALF_PREAMBLES → $XDG_CONFIG_HOME →
 * ~/.config/delegate-skills/preambles.md. Returns null when no file exists.
 */
export function resolvePreamblesPath(override, env = process.env, home = homedir()) {
  const explicit = override || env.GANDALF_PREAMBLES;
  if (explicit) return existsSync(explicit) ? explicit : null;
  const base = env.XDG_CONFIG_HOME
    ? join(env.XDG_CONFIG_HOME, "delegate-skills")
    : join(home, ".config", "delegate-skills");
  const p = join(base, "preambles.md");
  return existsSync(p) ? p : null;
}

/** Split a preambles document into its "## " blocks. */
export function parsePreambleBlocks(text) {
  const lines = String(text).split(/\r?\n/);
  const headings = [];
  for (let i = 0; i < lines.length; i++) {
    if (/^##\s+/.test(lines[i])) headings.push({ idx: i, title: lines[i] });
  }
  return headings.map((h, i) => {
    const end = i + 1 < headings.length ? headings[i + 1].idx : lines.length;
    return {
      title: h.title,
      body: lines.slice(h.idx, end).join("\n").trim(),
    };
  });
}

/**
 * Extract the global block plus the block for one lane.
 * Returns { preamble, globalFound, laneFound }. `preamble` is null only when
 * the document has no "## " blocks at all.
 */
export function extractPreambleBlocks(text, laneName) {
  const blocks = parsePreambleBlocks(text);
  if (blocks.length === 0) {
    return { preamble: null, globalFound: false, laneFound: false };
  }

  const global = blocks.find((b) => /global/i.test(b.title)) || blocks[0];
  const escaped = String(laneName).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  // Match the wire name as a standalone token. The negative lookarounds stop
  // `qa` from matching `qa-look` (a real bug when qa-look is listed first).
  const exact = new RegExp(`(?<![\\w-])${escaped}(?![\\w-])`);
  const lane = blocks.find((b) => exact.test(b.title));

  const parts = [];
  if (global) parts.push(global.body);
  if (lane && lane !== global) parts.push(lane.body);

  return {
    preamble: parts.length ? `${parts.join("\n\n---\n\n")}\n` : null,
    globalFound: Boolean(global),
    laneFound: Boolean(lane && lane !== global),
  };
}

/** Compose the brief the relay receives. Pure. */
export function buildEffectiveBrief(originalBrief, preamble) {
  return `${preamble}\n\n===== TASK BRIEF =====\n\n${String(originalBrief).trim()}\n`;
}

/**
 * Read the brief and the preambles, and return what would be written.
 * Pure: no directories are created, no files are touched. The caller decides
 * whether to call `writeEffectiveBrief` (never on a dry run).
 */
export function composeEffectiveBrief({ briefPath, laneName, preamblesPath, outDir }) {
  const original = readFileSync(briefPath, "utf8");
  const text = readFileSync(preamblesPath, "utf8");
  const { preamble, globalFound, laneFound } = extractPreambleBlocks(text, laneName);
  if (!preamble) {
    return { outputPath: briefPath, content: original, used: false, globalFound, laneFound };
  }
  return {
    outputPath: join(outDir, "brief.effective.md"),
    content: buildEffectiveBrief(original, preamble),
    used: true,
    globalFound,
    laneFound,
  };
}

/** Write a composed brief. Returns the path the relay should read. */
export function writeEffectiveBrief(composed) {
  if (!composed.used) return composed.outputPath;
  mkdirSync(dirname(composed.outputPath), { recursive: true });
  writeFileSync(composed.outputPath, composed.content, "utf8");
  return composed.outputPath;
}
