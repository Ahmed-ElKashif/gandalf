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
import { createHash } from "node:crypto";

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

/**
 * A short, stable fingerprint of a preamble source.
 *
 * Line endings are normalised first: the same file checked out on Windows and
 * on Linux is the same preamble, and its hash must say so.
 */
export function preambleFingerprint(text) {
  return createHash("sha256")
    .update(String(text).replace(/\r\n/g, "\n").replace(/\r/g, "\n"))
    .digest("hex")
    .slice(0, 12);
}

/**
 * The provenance line that travels with every composed brief.
 *
 * A brief records WHICH loadout the lane carried — otherwise a stale
 * preambles file can ship for months and nobody can tell. It is a comment,
 * not an instruction: the model is asked to do nothing with it.
 */
export function preambleStamp({ source, fingerprint }) {
  return `<!-- gandalf:preamble source="${source}" sha256="${fingerprint}" -->`;
}

/**
 * Lane blocks the shipped template has and the user's file does not.
 *
 * The template is the source of truth for the loadouts; the user's copy is
 * theirs to edit. When the two fall apart, the lanes that lost their block
 * walk with the global rules only — silently, because the injector still
 * succeeds. This names them so the drift is visible.
 */
export function missingLaneBlocks(templateText, userText, wires) {
  const missing = [];
  for (const wire of wires) {
    if (!extractPreambleBlocks(templateText, wire).laneFound) continue;
    if (!extractPreambleBlocks(userText, wire).laneFound) missing.push(wire);
  }
  return missing;
}

/** Compose the brief the relay receives. Pure. */
export function buildEffectiveBrief(originalBrief, preamble, stamp = null) {
  const head = stamp ? `${stamp}\n` : "";
  return `${head}${preamble}\n\n===== TASK BRIEF =====\n\n${String(originalBrief).trim()}\n`;
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
  const fingerprint = preambleFingerprint(text);
  const source = preamblesPath;
  if (!preamble) {
    return { outputPath: briefPath, content: original, used: false, globalFound, laneFound, source, fingerprint };
  }
  return {
    outputPath: join(outDir, "brief.effective.md"),
    content: buildEffectiveBrief(original, preamble, preambleStamp({ source, fingerprint })),
    used: true,
    globalFound,
    laneFound,
    source,
    fingerprint,
  };
}

/** Write a composed brief. Returns the path the relay should read. */
export function writeEffectiveBrief(composed) {
  if (!composed.used) return composed.outputPath;
  mkdirSync(dirname(composed.outputPath), { recursive: true });
  writeFileSync(composed.outputPath, composed.content, "utf8");
  return composed.outputPath;
}
