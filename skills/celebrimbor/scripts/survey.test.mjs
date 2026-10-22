/**
 * celebrimbor · survey.test.mjs
 *
 * The survey is the fix for a bug that shipped: an agent hunting for a
 * DESIGN.md that was not there, walking into parent directories, and looping.
 * These tests pin the behaviour that stops it:
 *
 *   - it never leaves the root it was given;
 *   - it looks for DESIGN.md exactly once, at that root;
 *   - it terminates on an empty directory;
 *   - it respects the depth and entry caps;
 *   - "not found" is an answer, not a failure (exit 0).
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const SURVEY = join(HERE, "survey.mjs");

function scratch() {
  return mkdtempSync(join(tmpdir(), "celebrimbor-survey-"));
}

function runSurvey(root, extra = []) {
  const out = execFileSync(process.execPath, [SURVEY, "--root", root, "--json", ...extra], {
    encoding: "utf8",
  });
  return JSON.parse(out);
}

test("an empty directory answers, and answers immediately", () => {
  const root = scratch();
  try {
    const report = runSurvey(root);
    assert.equal(report.designDoc.present, false);
    assert.equal(report.recommendedMode, "generate");
    assert.equal(report.sweep.entriesVisited, 0, "an empty root has nothing to visit");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("it never reports a file from outside the root", () => {
  const parent = scratch();
  const root = join(parent, "project");
  try {
    mkdirSync(root);
    // A DESIGN.md one level up - exactly what the old hunt would find and
    // then walk back into.
    writeFileSync(join(parent, "DESIGN.md"), "---\nname: Upstairs\n---\n");
    writeFileSync(join(root, "README.md"), "# hi\n");

    const report = runSurvey(root);
    assert.equal(report.designDoc.present, false, "must not adopt the parent's DESIGN.md");
    assert.equal(report.designDoc.path, join(root, "DESIGN.md"), "must point at the root it was given");
    assert.ok(
      !report.sweep.tokenFiles.some((f) => f.includes("..")),
      "no path may escape the root"
    );
  } finally {
    rmSync(parent, { recursive: true, force: true });
  }
});

test("it finds DESIGN.md at the root and stops there", () => {
  const root = scratch();
  try {
    writeFileSync(join(root, "DESIGN.md"), "---\nversion: alpha\nname: Here\n---\n\n## Overview\n\nHi.\n");
    const report = runSurvey(root);
    assert.equal(report.designDoc.present, true);
    assert.equal(report.designDoc.bytes > 0, true);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("the depth cap is respected", () => {
  const root = scratch();
  try {
    const deep = join(root, "a", "b", "c", "d");
    mkdirSync(deep, { recursive: true });
    writeFileSync(join(deep, "tokens.ts"), "export const x = 1;\n");

    const shallow = runSurvey(root, ["--max-depth", "1"]);
    const deepRun = runSurvey(root, ["--max-depth", "4"]);

    assert.equal(shallow.sweep.tokenFiles.length, 0, "depth 1 must not reach a/b/c/d");
    assert.equal(deepRun.sweep.tokenFiles.length, 1, "depth 4 must reach it");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("the entry cap is respected and reported as truncated", () => {
  const root = scratch();
  try {
    for (let i = 0; i < 40; i++) writeFileSync(join(root, `f${i}.txt`), "x");
    const report = runSurvey(root, ["--max-files", "5"]);
    assert.ok(report.sweep.entriesVisited <= 5, "must not visit more than the cap");
    assert.equal(report.sweep.truncated, true);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("a project with tokens is an extract, not a generate", () => {
  const root = scratch();
  try {
    writeFileSync(join(root, "package.json"), JSON.stringify({ name: "x", dependencies: { next: "15.0.0", tailwindcss: "^4.0.0" } }));
    writeFileSync(join(root, "tailwind.config.ts"), "export default {};\n");
    const report = runSurvey(root);
    assert.equal(report.recommendedMode, "extract");
    assert.equal(report.stack.framework, "next");
    assert.equal(report.stack.exportTarget, "css-tailwind");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("an existing DESIGN.md plus code is an audit", () => {
  const root = scratch();
  try {
    writeFileSync(join(root, "DESIGN.md"), "---\nname: Here\n---\n");
    writeFileSync(join(root, "package.json"), JSON.stringify({ name: "x", dependencies: { react: "19.0.0" } }));
    const report = runSurvey(root);
    assert.equal(report.recommendedMode, "audit");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("the exit code is 0 even when nothing is found", () => {
  const root = scratch();
  try {
    const out = execFileSync(process.execPath, [SURVEY, "--root", root], { encoding: "utf8" });
    assert.match(out, /generate/i);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
