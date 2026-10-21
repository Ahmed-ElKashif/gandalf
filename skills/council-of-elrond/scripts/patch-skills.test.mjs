import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from "node:fs";
import { join, dirname } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const PATCH_SKILLS = join(HERE, "patch-skills.mjs");

// A one-line change with three lines of context on each side.
const PATCH = `diff --git a/scripts/relay.mjs b/scripts/relay.mjs
--- a/scripts/relay.mjs
+++ b/scripts/relay.mjs
@@ -1,4 +1,5 @@
 const a = 1;
 const b = 2;
+const patched = true;
 const c = 3;
 const d = 4;
`;

const BEFORE = ["const a = 1;", "const b = 2;", "const c = 3;", "const d = 4;", ""].join("\n");

/**
 * A fake install: a skills root with one skill, and a manifest beside it that
 * points at the patch above. `eol` decides the line endings of the installed
 * file — the whole point of the exercise.
 */
function fixture({ eol = "\n" } = {}) {
  const root = mkdtempSync(join(tmpdir(), "gandalf-patches-"));
  const patchesDir = join(root, "patches");
  const skillsRoot = join(root, "skills");
  const target = join(skillsRoot, "crlf-skill", "scripts", "relay.mjs");
  mkdirSync(patchesDir, { recursive: true });
  mkdirSync(join(skillsRoot, "crlf-skill", "scripts"), { recursive: true });
  writeFileSync(join(patchesDir, "crlf.patch"), PATCH, "utf8");
  writeFileSync(
    join(patchesDir, "manifest.json"),
    JSON.stringify(
      {
        version: 1,
        patches: [
          {
            id: "crlf-demo",
            skill: "crlf-skill",
            pack: "fixture",
            tier: "core",
            required: true,
            scope: "general",
            files: ["scripts/relay.mjs"],
            patch: "crlf.patch",
            upstream: "https://example.invalid/fixture",
            upstreamCommit: "0".repeat(40),
            upstreamDate: "2026-01-01",
            why: "fixture",
          },
        ],
      },
      null,
      2,
    ),
    "utf8",
  );
  // The installed file is written with the EOL the platform would give it.
  writeFileSync(target, BEFORE.split("\n").join(eol), "utf8");
  return { root, patchesDir, skillsRoot, target, cleanup: () => rmSync(root, { recursive: true, force: true }) };
}

function engine(fx, args) {
  const r = spawnSync(
    process.execPath,
    [PATCH_SKILLS, ...args, "--manifest", join(fx.patchesDir, "manifest.json"), "--skills-root", fx.skillsRoot, "--json"],
    { encoding: "utf8" },
  );
  return { code: r.status, report: JSON.parse(r.stdout) };
}

test("a patch applies to an installed file with CRLF line endings", () => {
  const fx = fixture({ eol: "\r\n" });
  try {
    const before = engine(fx, ["check"]);
    assert.equal(before.code, 1, "a pending patch makes check exit 1");
    assert.equal(before.report.patches[0].state, "pending");

    const applied = engine(fx, ["apply"]);
    assert.equal(applied.code, 0, applied.report.patches[0].detail);
    assert.equal(applied.report.patches[0].state, "applied");

    const after = engine(fx, ["check"]);
    assert.equal(after.code, 0);
    assert.equal(after.report.patches[0].state, "applied");

    const patched = readFileSync(fx.target, "utf8");
    assert.match(patched, /const patched = true;/);
    // The line endings of the installed file are the file's business: git apply
    // must not rewrite the whole file to LF.
    assert.match(patched, /const a = 1;\r\n/, "CRLF endings must survive the patch");
  } finally {
    fx.cleanup();
  }
});

test("the same patch applies to an LF copy of the same file", () => {
  const fx = fixture({ eol: "\n" });
  try {
    const applied = engine(fx, ["apply"]);
    assert.equal(applied.code, 0, applied.report.patches[0].detail);
    assert.equal(applied.report.patches[0].state, "applied");
    assert.match(readFileSync(fx.target, "utf8"), /const patched = true;/);
  } finally {
    fx.cleanup();
  }
});

test("a target that moved is reported as drift, not forced", () => {
  const fx = fixture({ eol: "\r\n" });
  try {
    writeFileSync(fx.target, ["const a = 1;", "const b = 2;", "const CHANGED = 3;", "const d = 4;", ""].join("\r\n"), "utf8");
    const result = engine(fx, ["check"]);
    assert.equal(result.report.patches[0].state, "drift");
    // Drift is a stop, not a warning: the engine must not touch the file.
    const applied = engine(fx, ["apply"]);
    assert.equal(applied.report.patches[0].state, "drift");
    assert.doesNotMatch(readFileSync(fx.target, "utf8"), /const patched = true;/);
  } finally {
    fx.cleanup();
  }
});
