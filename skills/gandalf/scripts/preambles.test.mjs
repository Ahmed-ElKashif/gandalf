import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, existsSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  resolvePreamblesPath,
  parsePreambleBlocks,
  extractPreambleBlocks,
  buildEffectiveBrief,
  composeEffectiveBrief,
  writeEffectiveBrief,
} from "./preambles.mjs";

const SAMPLE = `# Lane preambles

## Global rules — every lane

- rule one
- rule two

## Aragorn — feature (full-stack)

- feature rule

## Galadriel — ui (design craft)

- ui rule

## Haldir — qa (behaviour)

- qa rule
`;

function tempDir() {
  return mkdtempSync(join(tmpdir(), "gandalf-preambles-"));
}

test("parsePreambleBlocks splits on level-2 headings", () => {
  const blocks = parsePreambleBlocks(SAMPLE);
  assert.equal(blocks.length, 4);
  assert.match(blocks[0].title, /Global rules/);
  assert.match(blocks[1].title, /feature/);
});

test("extractPreambleBlocks returns global + the matching lane", () => {
  const { preamble, globalFound, laneFound } = extractPreambleBlocks(SAMPLE, "feature");
  assert.equal(globalFound, true);
  assert.equal(laneFound, true);
  assert.match(preamble, /rule one/);
  assert.match(preamble, /feature rule/);
  assert.doesNotMatch(preamble, /ui rule/);
});

test("extractPreambleBlocks matches the wire name in a wire-first heading", () => {
  const wireFirst = SAMPLE.replace("## Aragorn — feature (full-stack)", "## `feature` — Aragorn (full-stack)");
  const { preamble, laneFound } = extractPreambleBlocks(wireFirst, "feature");
  assert.equal(laneFound, true);
  assert.match(preamble, /feature rule/);
});

test("extractPreambleBlocks does not confuse qa with qa-look", () => {
  const { preamble, laneFound } = extractPreambleBlocks(SAMPLE, "qa-look");
  assert.equal(laneFound, false);
  assert.match(preamble, /rule one/);
  assert.doesNotMatch(preamble, /qa rule/);
});

test("extractPreambleBlocks picks qa, not qa-look, when qa-look is listed first", () => {
  const lookFirst = `## Global rules — every lane\n\n- rule one\n\n## Legolas — qa-look (the eye)\n\n- look rule\n\n## Haldir — qa (behaviour gate)\n\n- qa rule\n`;
  const qa = extractPreambleBlocks(lookFirst, "qa");
  assert.equal(qa.laneFound, true);
  assert.match(qa.preamble, /qa rule/);
  assert.doesNotMatch(qa.preamble, /look rule/);

  const look = extractPreambleBlocks(lookFirst, "qa-look");
  assert.equal(look.laneFound, true);
  assert.match(look.preamble, /look rule/);
  assert.doesNotMatch(look.preamble, /qa rule/);
});

test("extractPreambleBlocks still returns global rules when the lane block is missing", () => {
  const { preamble, globalFound, laneFound } = extractPreambleBlocks(SAMPLE, "devops");
  assert.equal(globalFound, true);
  assert.equal(laneFound, false);
  assert.match(preamble, /rule one/);
});

test("extractPreambleBlocks returns null when there are no level-2 headings", () => {
  const { preamble, globalFound, laneFound } = extractPreambleBlocks("# just a title\n\ntext\n", "feature");
  assert.equal(preamble, null);
  assert.equal(globalFound, false);
  assert.equal(laneFound, false);
});

test("buildEffectiveBrief keeps the task brief below the preamble", () => {
  const text = buildEffectiveBrief("  do the thing  \n", "## rules\n\n- be lazy\n");
  assert.match(text, /^## rules/);
  assert.match(text, /===== TASK BRIEF =====/);
  assert.match(text, /do the thing\n$/);
  assert.doesNotMatch(text, /  do the thing/);
});

test("resolvePreamblesPath honours override, env, XDG, and home", () => {
  const dir = tempDir();
  try {
    const xdg = join(dir, "xdg");
    const home = join(dir, "home");
    const xdgFile = join(xdg, "delegate-skills", "preambles.md");
    const homeFile = join(home, ".config", "delegate-skills", "preambles.md");
    writeFileSync(join(dir, "override.md"), "override", "utf8");
    writeFileSync(join(dir, "env.md"), "env", "utf8");
    mkdirSync(join(xdg, "delegate-skills"), { recursive: true });
    mkdirSync(join(home, ".config", "delegate-skills"), { recursive: true });
    writeFileSync(xdgFile, "xdg", "utf8");
    writeFileSync(homeFile, "home", "utf8");

    assert.equal(resolvePreamblesPath(join(dir, "override.md"), {}, home), join(dir, "override.md"));
    assert.equal(resolvePreamblesPath(join(dir, "missing.md"), {}, home), null);
    assert.equal(resolvePreamblesPath(null, { GANDALF_PREAMBLES: join(dir, "env.md") }, home), join(dir, "env.md"));
    assert.equal(resolvePreamblesPath(null, { XDG_CONFIG_HOME: xdg }, home), xdgFile);
    assert.equal(resolvePreamblesPath(null, {}, home), homeFile);
    assert.equal(resolvePreamblesPath(null, { XDG_CONFIG_HOME: join(dir, "missing") }, home), null);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("composeEffectiveBrief is pure and writeEffectiveBrief is the only writer", () => {
  const dir = tempDir();
  try {
    const brief = join(dir, "brief.md");
    const preambles = join(dir, "preambles.md");
    const outDir = join(dir, "run");
    writeFileSync(brief, "task: add hello\n", "utf8");
    writeFileSync(preambles, SAMPLE, "utf8");

    const composed = composeEffectiveBrief({
      briefPath: brief,
      laneName: "feature",
      preamblesPath: preambles,
      outDir,
    });
    assert.equal(composed.used, true);
    assert.equal(composed.laneFound, true);
    assert.equal(existsSync(composed.outputPath), false, "compose must not write");
    assert.match(composed.content, /feature rule/);
    assert.match(composed.content, /task: add hello/);

    const written = writeEffectiveBrief(composed);
    assert.equal(written, composed.outputPath);
    assert.equal(readFileSync(written, "utf8"), composed.content);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("composeEffectiveBrief reports a missing lane instead of failing silently", () => {
  const dir = tempDir();
  try {
    const brief = join(dir, "brief.md");
    const preambles = join(dir, "preambles.md");
    writeFileSync(brief, "task\n", "utf8");
    writeFileSync(preambles, SAMPLE, "utf8");
    const composed = composeEffectiveBrief({
      briefPath: brief,
      laneName: "devops",
      preamblesPath: preambles,
      outDir: join(dir, "run"),
    });
    assert.equal(composed.used, true);
    assert.equal(composed.laneFound, false);
    assert.match(composed.content, /rule one/);
    assert.doesNotMatch(composed.content, /feature rule/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("the shipped preambles template has a block for every wire role", () => {
  const template = readFileSync(new URL("../templates/preambles.example.md", import.meta.url), "utf8");
  const roles = JSON.parse(readFileSync(new URL("../roles.json", import.meta.url), "utf8")).roles;
  for (const role of roles) {
    const { laneFound } = extractPreambleBlocks(template, role.wire);
    assert.equal(laneFound, true, `missing a ## block for ${role.alias} / ${role.wire}`);
  }
});
