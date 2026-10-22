#!/usr/bin/env node
/**
 * gandalf · build-preambles.mjs — generate preambles.example.md from its sources.
 *
 * The four station lanes are the station skills' own text: the lane block each
 * one carries at the end of `skills/<station>/SKILL.md`:
 *
 *     <!-- gandalf:lane-block wire="qa" alias="Haldir" -->
 *     ...the standing rules the `qa` lane walks with...
 *     <!-- /gandalf:lane-block -->
 *
 * Everything that is not a craft — the generated-file notice, the global rules,
 * the orchestrator checklist, and the casting lanes (bugfix, devops, chores,
 * complex, the judges) — lives in `templates/preambles-casting.md`, at the
 * anchor `<!-- gandalf:station-lanes -->`.
 *
 * Assembly rule: reading the four station wires in `roles.json` order produces
 * the same block order the old hand-written template carried (feature, ui,
 * qa, qa-look, then the casting lanes) — the injector resolves a lane's block
 * by wire-name token in the heading, so the order is presentational, but one
 * consistent order keeps review diffs calm.
 *
 * Writes two byte-identical copies (the gandalf and council templates);
 * `--check` only verifies instead of writing.
 *
 * Run: node skills/gandalf/scripts/build-preambles.mjs [--check]
 */

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const GANDALF_DIR = dirname(HERE); // skills/gandalf
const SKILLS_DIR = dirname(GANDALF_DIR); // skills/
const ROOT = dirname(SKILLS_DIR); // repo root

const OUTPUTS = [
  "skills/gandalf/templates/preambles.example.md",
  "skills/council-of-elrond/templates/preambles.example.md",
];

/**
 * The wires whose lane text is station craft, and the skill that owns each.
 * The other seven lanes are casting — their text is not a method, so it stays
 * in the casting document (see ADR-0001: stations, not seat skills).
 */
export const STATION_FOR_WIRE = {
  feature: "aragorn",
  ui: "galadriel",
  qa: "haldir",
  "qa-look": "legolas",
};

const ANCHOR = "<!-- gandalf:station-lanes -->";

/** The text between the lane-block markers, trimmed of the marker lines. */
export function extractLaneBlock(text, wire) {
  const start = text.indexOf(`<!-- gandalf:lane-block wire="${wire}"`);
  if (start === -1) throw new Error(`no lane block for wire "${wire}"`);
  const body = text.indexOf("-->", start);
  if (body === -1) throw new Error(`lane block for wire "${wire}" has no "-->"`);
  const end = text.indexOf("<!-- /gandalf:lane-block -->", body);
  if (end === -1) throw new Error(`lane block for wire "${wire}" is never closed`);
  return text
    .slice(body + 3, end)
    .replace(/\r\n/g, "\n")
    .replace(/^\n+|\s+$/g, "");
}

/** The block the generated template carries for one wire: heading + station text. */
export function stationBlock(roles, wire) {
  const role = roles.roles.find((r) => r.wire === wire);
  if (!role) throw new Error(`roles.json has no wire "${wire}"`);
  const skill = STATION_FOR_WIRE[wire];
  const source = readFileSync(join(SKILLS_DIR, skill, "SKILL.md"), "utf8");
  const body = extractLaneBlock(source, wire);
  return `## ${role.alias} — ${wire} *(station: \`${skill}\`)*\n\n${body}`;
}

/** The whole generated document. Pure — no writes, no process exit. */
export function composePreambles() {
  const roles = JSON.parse(readFileSync(join(GANDALF_DIR, "roles.json"), "utf8"));
  const casting = readFileSync(join(GANDALF_DIR, "templates", "preambles-casting.md"), "utf8");
  const anchor = casting.indexOf(ANCHOR);
  if (anchor === -1) {
    throw new Error("preambles-casting.md: no station-lanes anchor");
  }
  const wires = roles.roles.map((r) => r.wire).filter((w) => STATION_FOR_WIRE[w]);
  const blocks = wires.map((wire) => stationBlock(roles, wire));
  return [
    casting.slice(0, anchor).replace(/\r\n/g, "\n").trimEnd(),
    ...blocks,
    casting.slice(anchor + ANCHOR.length).replace(/\r\n/g, "\n").trim(),
  ]
    .join("\n\n")
    .trimEnd()
    .concat("\n");
}

function main(argv) {
  const generated = composePreambles();
  if (argv.includes("--check")) {
    const stale = [];
    for (const rel of OUTPUTS) {
      const current = readFileSync(join(ROOT, rel), "utf8").replace(/\r\n/g, "\n").trimEnd();
      if (current !== generated.trimEnd()) stale.push(rel);
    }
    if (stale.length) {
      console.error(
        `build-preambles: stale or differing template(s): ${stale.join(", ")}\n` +
          `  run: node skills/gandalf/scripts/build-preambles.mjs`,
      );
      process.exit(1);
    }
    console.log(`build-preambles: ${OUTPUTS.length} copies are current and identical.`);
    return;
  }
  for (const rel of OUTPUTS) {
    writeFileSync(join(ROOT, rel), generated, "utf8");
  }
  console.log(
    `build-preambles: wrote ${OUTPUTS.length} byte-identical copies (${generated.split("\n").length} lines).`,
  );
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1].replace(/\/$/, "")) {
  main(process.argv.slice(2));
}
