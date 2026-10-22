#!/usr/bin/env node
/**
 * celebrimbor · compose.mjs — our own composer.
 *
 * The vendored research dataset is data; this is the instrument. It deals a
 * coherent direction for a surface and hands back the raw material of a
 * DESIGN.md: a concept, real hex values, a type system with concrete steps,
 * and the section blueprints that carry the layout rules.
 *
 * Nothing here writes a file. The forge decides what to keep; this only
 * proposes. It is deterministic: the same seed deals the same direction.
 *
 * Usage:
 *   node compose.mjs --sector <sector> [--seed N] [--tone <tone>]
 *   node compose.mjs --app --kind <kind> [--seed N]
 *   node compose.mjs --sector saas --json
 */

import { readFileSync, existsSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const LIB = resolve(HERE, "..", "assets", "taste");

const load = (name) => JSON.parse(readFileSync(join(LIB, name + ".json"), "utf8"));

const DIRECTIONS = load("directions");
const PALETTES = load("palettes");
const TYPES = load("type");
const SECTIONS = load("sections");
const APP = load("app");

const SECTORS = [...new Set(DIRECTIONS.flatMap((d) => d.sectors))].sort();
const TONES = [...new Set(DIRECTIONS.flatMap((d) => d.tones))].sort();
const KINDS = Object.keys(APP.kinds || {});

// --- deterministic randomness ---------------------------------------------

function hashSeed(text) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function pick(array, seed, salt) {
  if (!array.length) return null;
  const h = hashSeed(`${salt}:${seed}`);
  return array[h % array.length];
}

// --- dimension helpers -----------------------------------------------------

const REM = 16;

/** Resolve a fluid clamp() to a concrete value at a reference viewport. */
export function resolveClamp(text, viewportPx = 1440) {
  const clamp = /clamp\(([^,]+),\s*([^,]+),\s*([^)]+)\)/.exec(text);
  if (!clamp) return text;
  const toPx = (value) => {
    const v = value.trim();
    if (v.endsWith("rem")) return parseFloat(v) * REM;
    if (v.endsWith("px")) return parseFloat(v);
    if (v.endsWith("em")) return parseFloat(v) * REM;
    if (v.endsWith("vw")) return (parseFloat(v) / 100) * viewportPx;
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : 0;
  };
  const min = toPx(clamp[1]);
  const midRaw = clamp[2].trim();
  const plus = /^(.+?)\s*\+\s*([\d.]+)(vw|px|rem|em)$/.exec(midRaw);
  const mid = plus ? toPx(plus[1]) + toPx(`${plus[2]}${plus[3]}`) : toPx(midRaw);
  const max = toPx(clamp[3]);
  const value = Math.min(Math.max(mid, min), max);
  return `${Math.round(value * 100) / 100}px`;
}

// --- resolution ------------------------------------------------------------

function resolvePalette(direction, seed) {
  const tags = new Set(direction.paletteTags || []);
  const scored = PALETTES.map((p) => {
    let score = 0;
    for (const tag of p.tags || []) if (tags.has(tag)) score++;
    return { p, score };
  }).sort((a, b) => b.score - a.score);
  const best = scored.filter((s) => s.score > 0);
  if (best.length) return best[0].p;
  return pick(PALETTES, seed, "palette");
}

function resolveType(direction, seed) {
  const classes = new Set(direction.typeClasses || []);
  const matching = TYPES.filter((t) => classes.has(t.class));
  const pool = matching.length ? matching : TYPES;
  return pick(pool, seed, "type");
}

function resolveSections(direction, seed, count = 6) {
  const byDirection = SECTIONS.filter((s) => (s.directions || []).includes(direction.id));
  if (byDirection.length >= 3) return byDirection.slice(0, count);

  const tags = new Set(direction.sectionTags || []);
  const scored = SECTIONS.map((s) => {
    let score = 0;
    for (const tag of s.tags || []) if (tags.has(tag)) score++;
    if (byDirection.includes(s)) score += 2;
    return { s, score };
  })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score);
  if (scored.length) return scored.slice(0, count).map((e) => e.s);

  const roles = ["features", "showcase", "how-it-works", "testimonial", "pricing", "faq", "cta", "footer"];
  return roles
    .map((role) => SECTIONS.find((s) => s.role === role))
    .filter(Boolean)
    .slice(0, count);
}

function appPattern(kind, seed) {
  const patterns = (APP.patterns || []).filter((p) => (p.kinds || []).includes(kind));
  const pool = patterns.length ? patterns : APP.patterns || [];
  return pick(pool, seed, "app-pattern");
}

function appStyle(kind, seed) {
  const styles = APP.kinds?.[kind]?.styles || [];
  const match = (APP.styles || []).find((s) => styles.includes(s.id || s.name));
  return match || pick(APP.styles || [], seed, "app-style");
}

// --- sheets ----------------------------------------------------------------

function buildPublicSheet(sector, tone, seed, pinnedDirection, pinnedPalette) {
  const pool = DIRECTIONS.filter((d) => d.sectors.includes(sector));
  const toned = tone ? pool.filter((d) => (d.tones || []).includes(tone)) : [];
  const direction = pinnedDirection
    ? DIRECTIONS.find((d) => d.id === pinnedDirection)
    : pick(toned.length ? toned : pool.length ? pool : DIRECTIONS, seed, "direction");
  if (!direction) {
    throw new Error(`unknown direction "${pinnedDirection}". known:\n  ${DIRECTIONS.map((d) => d.id).join(", ")}`);
  }
  const palette = pinnedPalette
    ? PALETTES.find((p) => p.id === pinnedPalette)
    : resolvePalette(direction, seed);
  if (!palette) {
    throw new Error(`unknown palette "${pinnedPalette}". known:\n  ${PALETTES.map((p) => p.id).join(", ")}`);
  }
  const type = resolveType(direction, seed);
  const sections = resolveSections(direction, seed);

  return {
    kind: "public",
    sector,
    tone: tone || null,
    seed,
    direction,
    palette,
    type,
    sections,
    app: null,
  };
}

function buildAppSheet(kind, seed) {
  const style = appStyle(kind, seed);
  const pattern = appPattern(kind, seed);
  const palette = pick(PALETTES, seed, "app-palette");
  const type = pick(TYPES, seed, "app-type");
  return {
    kind: "app",
    kind_: kind,
    seed,
    style,
    pattern,
    palette,
    type,
    sections: [],
    direction: null,
  };
}

// --- rendering -------------------------------------------------------------

function renderType(type) {
  if (!type) return "(none)";
  const steps = {};
  for (const [key, value] of Object.entries(type.scale || {})) steps[key] = resolveClamp(value);
  const lines = [];
  lines.push(`Type — ${type.name} (class: ${type.class})`);
  if (type.display) lines.push(`  display: ${type.display.family} · weight ${(type.display.weights || []).join("/")}`);
  if (type.text) lines.push(`  text:    ${type.text.family} · weight ${(type.text.weights || []).join("/")}`);
  lines.push(`  steps:   ${Object.entries(steps).map(([k, v]) => `${k} ${v}`).join(" · ")}`);
  if (type.note) lines.push(`  note:    ${type.note}`);
  return lines.join("\n");
}

function renderPalette(palette) {
  if (!palette) return "(none)";
  const lines = [`Colour — ${palette.name} [${(palette.tags || []).join(", ")}]`];
  for (const key of ["bg", "surface", "ink", "muted", "accent", "accentInk"]) {
    if (palette[key]) lines.push(`  ${key.padEnd(10)} ${palette[key]}`);
  }
  for (const [i, field] of (palette.fields || []).entries()) {
    lines.push(`  field-${i + 1}   bg ${field.bg} / ink ${field.ink}`);
  }
  if (palette.note) lines.push(`  note:     ${palette.note}`);
  return lines.join("\n");
}

function renderSheet(sheet) {
  const out = [];
  out.push(`# ${sheet.kind === "app" ? "APP" : "PUBLIC"} SHEET — ${sheet.kind === "app" ? sheet.kind_ : sheet.sector}`);
  out.push(`seed ${sheet.seed}`);
  out.push("");
  if (sheet.direction) {
    out.push(`Direction — ${sheet.direction.name}`);
    out.push(`  idea:        ${sheet.direction.idea.split("\n")[0]}`);
    out.push(`  composition: ${sheet.direction.composition.split("\n")[0]}`);
    out.push(`  typography:  ${sheet.direction.typography}`);
    out.push(`  colour:      ${sheet.direction.colour}`);
    if (sheet.direction.pitfalls?.length) {
      const pitfalls = Array.isArray(sheet.direction.pitfalls)
        ? sheet.direction.pitfalls
        : [sheet.direction.pitfalls];
      out.push(`  pitfalls:    ${pitfalls.join(" | ")}`);
    }
  }
  if (sheet.style) {
    out.push(`Style — ${sheet.style.name || sheet.style.id}`);
    out.push(`  ${(sheet.style.summary || sheet.style.note || "").split("\n")[0]}`);
  }
  if (sheet.pattern) {
    out.push(`Pattern — ${sheet.pattern.name} (${sheet.pattern.screen})`);
    out.push(`  ${sheet.pattern.blueprint.split("\n")[0]}`);
  }
  out.push("");
  out.push(renderPalette(sheet.palette));
  out.push("");
  out.push(renderType(sheet.type));
  if (sheet.sections?.length) {
    out.push("");
    out.push("Sections");
    for (const section of sheet.sections) {
      out.push(`  ${String(section.role).padEnd(12)} ${section.name}`);
    }
  }
  out.push("");
  out.push("Next: turn this into a DESIGN.md - colours -> `colors:`, type -> `typography:`,");
  out.push("section roles -> the Layout and Components prose, direction -> the Overview.");
  return out.join("\n");
}

// --- main ------------------------------------------------------------------

function parseArgs(argv) {
  const opts = { app: false, json: false, seed: null, sector: null, tone: null, kind: null, direction: null, palette: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--sector") opts.sector = argv[++i];
    else if (a === "--kind") opts.kind = argv[++i];
    else if (a === "--tone") opts.tone = argv[++i];
    else if (a === "--seed") opts.seed = argv[++i];
    else if (a === "--direction") opts.direction = argv[++i];
    else if (a === "--palette") opts.palette = argv[++i];
    else if (a === "--app") opts.app = true;
    else if (a === "--json") opts.json = true;
  }
  return opts;
}

function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.json && !opts.sector && !opts.kind) {
    console.log(JSON.stringify({ sectors: SECTORS, tones: TONES, kinds: KINDS }, null, 2));
    return;
  }
  const seed = opts.seed != null ? Number(opts.seed) : hashSeed(`${opts.app ? "app" : "pub"}:${opts.kind || opts.sector}:${Date.now()}`);

  let sheet;
  if (opts.app) {
    const kind = opts.kind || KINDS[0];
    if (!KINDS.includes(kind)) {
      console.error(`unknown app kind "${kind}". known kinds:\n  ${KINDS.join(", ")}`);
      process.exit(2);
    }
    sheet = buildAppSheet(kind, seed);
  } else {
    const sector = opts.sector || "other";
    if (!SECTORS.includes(sector)) {
      console.error(`unknown sector "${sector}". known sectors:\n  ${SECTORS.join(", ")}`);
      process.exit(2);
    }
    sheet = buildPublicSheet(sector, opts.tone, seed, opts.direction, opts.palette);
  }

  if (opts.json) {
    const direction = sheet.direction;
    const type = sheet.type;
    console.log(JSON.stringify({
      kind: sheet.kind,
      sector: sheet.sector ?? null,
      appKind: sheet.kind_ ?? null,
      seed: sheet.seed,
      direction: direction ? { id: direction.id, name: direction.name, idea: direction.idea, composition: direction.composition, typography: direction.typography, colour: direction.colour, pitfalls: direction.pitfalls } : null,
      style: sheet.style ?? null,
      pattern: sheet.pattern ? { id: sheet.pattern.id, name: sheet.pattern.name, screen: sheet.pattern.screen, blueprint: sheet.pattern.blueprint, phone: sheet.pattern.phone } : null,
      palette: sheet.palette,
      type: type ? { ...type, scale: Object.fromEntries(Object.entries(type.scale || {}).map(([k, v]) => [k, resolveClamp(v)])) } : null,
      sections: sheet.sections.map((s) => ({ id: s.id, role: s.role, name: s.name, blueprint: s.blueprint, mobile: s.mobile })),
    }, null, 2));
    return;
  }
  console.log("\n" + renderSheet(sheet) + "\n");
}

if (!existsSync(LIB)) {
  console.error(`vendored dataset missing at ${LIB}`);
  process.exit(2);
}
main();
