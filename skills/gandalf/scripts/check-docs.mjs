#!/usr/bin/env node
/**
 * gandalf · check-docs.mjs — fail the build when the prose drifts.
 *
 * The workflow is specified in Markdown, so the docs are part of the machinery.
 * This checker enforces the invariants that broke before:
 *
 *   - one canonical role registry (11 roles: 8 walk, 3 judge);
 *   - every role alias and wire name present in the docs that cast roles;
 *   - no stale "ten roles" counts or manual "prepend the role block" steps;
 *   - the council and gandalf preambles templates are byte-identical;
 *   - no stale qa/vision claims or "two skills" copy in the README;
 *   - fellowship.mjs knows every wire role (including qa-look);
 *   - packs.json points at this repo's real remote;
 *   - the README credits table covers every pack in packs.json;
 *   - Markdown links resolve to files.
 *
 * Run: node skills/gandalf/scripts/check-docs.mjs
 */

import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, resolve, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const failures = [];
const passes = [];

function fail(message) {
  failures.push(message);
}

function pass(message) {
  passes.push(message);
}

function read(rel) {
  return readFileSync(join(ROOT, rel), "utf8");
}

const escapeRegExp = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
// `qa` must not be satisfied by `qa-look`; match wire names as standalone
// tokens, exactly as the preamble injector does.
const hasStandalone = (text, token) =>
  new RegExp(`(?<![\\w-])${escapeRegExp(token)}(?![\\w-])`).test(text);

function lineOf(text, index) {
  return text.slice(0, index).split(/\r?\n/).length;
}

function scan(relDir, extensions, pattern, label) {
  const hits = [];
  const stack = [join(ROOT, relDir)];
  while (stack.length) {
    const dir = stack.pop();
    if (!existsSync(dir)) continue;
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        if ([".git", "node_modules", ".gandalf"].includes(entry.name)) continue;
        stack.push(full);
      } else if (extensions.some((ext) => entry.name.endsWith(ext))) {
        const text = readFileSync(full, "utf8");
        const re = new RegExp(pattern.source, pattern.flags.includes("g") ? pattern.flags : `${pattern.flags}g`);
        let match;
        while ((match = re.exec(text)) !== null) {
          hits.push(`${relative(ROOT, full)}:${lineOf(text, match.index)} — ${match[0].trim()}`);
        }
      }
    }
  }
  if (hits.length) {
    for (const hit of hits) fail(`${label}: ${hit}`);
  } else {
    pass(label);
  }
}

// ---- 1. canonical registry -------------------------------------------------

let registry;
try {
  registry = JSON.parse(read("skills/gandalf/roles.json"));
} catch (error) {
  fail(`roles.json is not valid JSON: ${error.message}`);
}

const roles = registry?.roles ?? [];
if (roles.length !== 11) fail(`roles.json: expected 11 roles, found ${roles.length}`);
const walkers = roles.filter((role) => role.kind === "walk");
const judges = roles.filter((role) => role.kind === "judge");
if (walkers.length !== 8) fail(`roles.json: expected 8 walkers, found ${walkers.length}`);
if (judges.length !== 3) fail(`roles.json: expected 3 judges, found ${judges.length}`);
const wires = new Set(roles.map((role) => role.wire));
const aliases = new Set(roles.map((role) => role.alias));
if (wires.size !== roles.length) fail("roles.json: duplicate wire name");
if (aliases.size !== roles.length) fail("roles.json: duplicate alias");
if (roles.length === 11 && walkers.length === 8 && judges.length === 3) {
  pass("roles.json: 11 roles, 8 walkers, 3 judges, unique names");
}

// ---- 2. every casting doc carries both names ------------------------------

const roleDocs = [
  "README.md",
  "skills/gandalf/SKILL.md",
  "skills/gandalf/references/fellowship.md",
  "skills/gandalf/references/fleet.md",
  "skills/gandalf/references/loadouts.md",
  "skills/gandalf/templates/preambles.example.md",
  "skills/council-of-elrond/SKILL.md",
  "skills/council-of-elrond/references/casting.md",
  "skills/council-of-elrond/templates/preambles.example.md",
];

for (const doc of roleDocs) {
  if (!existsSync(join(ROOT, doc))) {
    fail(`role docs: missing ${doc}`);
    continue;
  }
  const text = read(doc);
  const missing = [];
  for (const role of roles) {
    if (!hasStandalone(text, role.alias)) missing.push(role.alias);
    if (!hasStandalone(text, role.wire)) missing.push(role.wire);
  }
  if (missing.length) {
    fail(`${doc}: missing role names: ${[...new Set(missing)].join(", ")}`);
  } else {
    pass(`${doc}: all 11 aliases and wire names`);
  }
}

// ---- 3. stale counts and manual prepend steps -----------------------------

scan(".", [".md"], /ten roles|all ten roles|cast the ten roles/i, "no stale \"ten roles\" counts");
scan("skills/gandalf", [".md"], /prepend the (matching )?role block/i, "gandalf docs: no manual prepend step");
scan("skills/council-of-elrond", [".md"], /prepend the (matching )?role block/i, "council docs: no manual prepend step");

// ---- 4. one preambles template -------------------------------------------

const gandalfTemplate = join(ROOT, "skills/gandalf/templates/preambles.example.md");
const councilTemplate = join(ROOT, "skills/council-of-elrond/templates/preambles.example.md");
if (!existsSync(gandalfTemplate) || !existsSync(councilTemplate)) {
  fail("preambles templates: one is missing");
} else {
  const normalize = (text) => text.replace(/\r\n/g, "\n").trimEnd();
  const a = normalize(readFileSync(gandalfTemplate, "utf8"));
  const b = normalize(readFileSync(councilTemplate, "utf8"));
  if (a !== b) {
    fail("preambles templates: gandalf and council copies differ — keep them byte-identical");
  } else {
    pass("preambles templates: gandalf and council are identical");
  }
}

// ---- 5. version and README claims ----------------------------------------

const skillText = read("skills/gandalf/SKILL.md");
const versionMatch = /metadata:\s*\n\s+version:\s*([0-9]+\.[0-9]+\.[0-9]+)/.exec(skillText);
if (!versionMatch) {
  fail("SKILL.md: no metadata.version");
} else {
  const [major, minor] = versionMatch[1].split(".").map(Number);
  if (major < 1 || (major === 1 && minor < 2)) {
    fail(`SKILL.md: version ${versionMatch[1]} is older than 1.2.0`);
  } else {
    pass(`SKILL.md: version ${versionMatch[1]}`);
  }
}

const readme = read("README.md");
for (const [pattern, label] of [
  [/two skills/i, "README: no stale \"two skills\" claim"],
  [/installs\s+[*\s]*both skills/i, "README: no stale \"installs both skills\" claim"],
  [/vision\s*\*{0,2}\s*is\s+mandatory/i, "README: no stale \"vision is mandatory\" claim"],
  [/`qa`[^\n]*vision-capable/i, "README: qa is not described as vision-capable"],
  [/^\| Role \| What it needs \| Carries \|/m, "README: no duplicate legacy role-table header"],
  [/seven that\s+\*{0,2}walk/i, "README: canonical eight-walker taxonomy"],
  [/one that\s+\*{0,2}verifies/i, "README: qa is not a separate third category"],
]) {
  if (pattern.test(readme)) fail(label);
  else pass(label);
}
if (!readme.includes("| LOTR name | Wire name |")) {
  fail("README: role table must use the | LOTR name | Wire name | header");
} else {
  const start = readme.indexOf("| LOTR name | Wire name |");
  // Split on a blank line, CRLF included. `indexOf("\n\n")` misses CRLF files and
  // silently swallows every later table into the count.
  const table = readme.slice(start).split(/\r?\n\r?\n/)[0];
  const rows = table.split(/\r?\n/).filter((line) => /^\|\s*\*\*/.test(line));
  if (rows.length !== roles.length) {
    fail(`README: role table has ${rows.length} data rows, expected ${roles.length}`);
  } else {
    pass(`README: role table has ${rows.length} data rows`);
  }
}

// The frontmatter description is the discovery surface; a role missing there is a
// role the skill will not advertise. Check every wire name, not just the body.
const descriptionBlock = skillText.slice(skillText.indexOf("description:"), skillText.indexOf("license:"));
const missingFromDescription = [...wires].filter((wire) => !hasStandalone(descriptionBlock, wire));
if (missingFromDescription.length) {
  fail(`SKILL.md description: missing ${missingFromDescription.join(", ")}`);
} else {
  pass("SKILL.md description: all 11 wire roles");
}

// ---- 6. fellowship.mjs knows every wire role -----------------------------

const fellowship = read("skills/gandalf/scripts/fellowship.mjs");
const wireSet = /const WIRE_ROLES = new Set\(\[([\s\S]*?)\]\);/.exec(fellowship);
if (!wireSet) {
  fail("fellowship.mjs: WIRE_ROLES set not found");
} else {
  const known = new Set([...wireSet[1].matchAll(/"([^"]+)"/g)].map((m) => m[1]));
  const missing = [...wires].filter((wire) => !known.has(wire));
  if (missing.length) fail(`fellowship.mjs: WIRE_ROLES missing ${missing.join(", ")}`);
  else pass("fellowship.mjs: WIRE_ROLES covers every role");
}

// ---- 7. packs.json points at the real remote -----------------------------

const remote = spawnSync("git", ["remote", "get-url", "origin"], { cwd: ROOT, encoding: "utf8" });
const remoteUrl = remote.status === 0 ? remote.stdout.trim().replace(/\.git$/, "") : null;
// CI runs on forks too; GANDALF_REPO_URL pins the canonical URL instead of
// requiring the fork's origin to match the upstream credits.
const expectedUrl = (process.env.GANDALF_REPO_URL || remoteUrl || "").replace(/\.git$/, "");
let packs = [];
try {
  packs = JSON.parse(read("skills/council-of-elrond/packs.json")).packs ?? [];
} catch (error) {
  fail(`packs.json is not valid JSON: ${error.message}`);
}
if (expectedUrl) {
  const ownPacks = packs.filter((pack) => String(pack.repo || "").startsWith("this repo"));
  const wrong = ownPacks.filter((pack) => String(pack.url || "").replace(/\.git$/, "") !== expectedUrl);
  if (wrong.length) {
    fail(`packs.json: own-repo URL should be ${expectedUrl}; wrong: ${wrong.map((p) => `${p.id} (${p.url})`).join(", ")}`);
  } else if (ownPacks.length) {
    pass(`packs.json: ${ownPacks.length} own-repo pack(s) point at ${expectedUrl}`);
  }
} else {
  pass("packs.json: skipped remote check (no git remote and no GANDALF_REPO_URL)");
}

// ---- 8. README credits match the manifest ---------------------------------

const creditsHeader = "| Pack | Licence | Why it is here |";
const creditsStart = readme.indexOf(creditsHeader);
if (creditsStart === -1) {
  fail("README credits: table header not found");
} else {
  // End the table at the first blank line. CRLF-safe, like the role table.
  const creditsTable = readme.slice(creditsStart).split(/\r?\n\r?\n/)[0];
  const dataRows = creditsTable
    .split(/\r?\n/)
    .filter((line) => /^\|/.test(line) && !/^\|\s*-/.test(line) && !line.includes(creditsHeader));
  if (dataRows.length !== packs.length) {
    fail(`README credits: ${dataRows.length} data rows, expected ${packs.length} packs`);
  }
  const missing = packs.filter((pack) => {
    const repo = String(pack.repo || "");
    // Own-repo packs are credited by their skill path, not by the repository
    // URL (the README links the directory so the reader can open it).
    if (repo.startsWith("this repo")) {
      const path = repo.replace(/^this repo\s*[—-]\s*/, "").trim();
      return path && !creditsTable.includes(path);
    }
    const url = String(pack.url || "").replace(/\/$/, "");
    return url && !creditsTable.includes(url);
  });
  if (missing.length) {
    fail(`README credits: missing manifest entries: ${missing.map((p) => `${p.id} (${p.url})`).join(", ")}`);
  } else {
    let cursor = 0;
    let outOfOrder = null;
    for (const pack of packs) {
      const repo = String(pack.repo || "");
      const needle = repo.startsWith("this repo")
        ? repo.replace(/^this repo\s*[—-]\s*/, "").trim()
        : String(pack.url || "").replace(/\/$/, "");
      const at = creditsTable.indexOf(needle, cursor);
      if (at === -1) {
        outOfOrder = pack.id;
        break;
      }
      cursor = at + needle.length;
    }
    if (outOfOrder) {
      fail(`README credits: ${outOfOrder} is out of manifest order`);
    } else if (dataRows.length === packs.length) {
      pass(`README credits: every pack in packs.json is credited, in order (${packs.length})`);
    }
  }
}

// ---- 9. Markdown links resolve -------------------------------------------

for (const doc of ["README.md", "skills/gandalf/SKILL.md"]) {
  const text = read(doc);
  const base = dirname(join(ROOT, doc));
  const missing = [];
  for (const match of text.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)) {
    const target = match[1].trim();
    if (/^(https?:|mailto:|#)/.test(target)) continue;
    const clean = target.split("#")[0];
    if (!clean) continue;
    const full = resolve(base, clean);
    if (!existsSync(full)) missing.push(`${target} (line ${lineOf(text, match.index)})`);
  }
  if (missing.length) fail(`${doc}: dead links: ${missing.join(", ")}`);
  else pass(`${doc}: all local links resolve`);
}

// ---- 10. the dispatcher's read-only rule -----------------------------------
// The agy relay rejects --read-only together with --dangerously-skip-permissions
// as mutually exclusive, and it composes both flags itself for a read-only run.
// A dispatcher that adds the flag anyway makes every read-only agy lane
// un-dispatchable — which is what the shipped free-first preset casts.

const readOnlyGuard = [
  [/function relayExtraFlags\(relay, readOnly\)/, "relayExtraFlags(relay, readOnly) is not defined"],
  [/if \(readOnly\) return \[\];/, "a read-only lane must still be given no extra flags"],
  [/argv\.push\(\.\.\.relayExtraFlags\(lane\.relay, lane\.readOnly\)\)/, "extra relay flags do not go through relayExtraFlags"],
];
const guardProblems = readOnlyGuard
  .filter(([pattern]) => !pattern.test(fellowship))
  .map(([, label]) => label);
if (guardProblems.length) {
  for (const problem of guardProblems) fail(`fellowship.mjs: ${problem}`);
} else {
  pass("fellowship.mjs: a read-only lane is given no --dangerously-skip-permissions");
}

const operationsText = read("skills/gandalf/references/operations.md");
if (!/--dangerously-skip-permissions/.test(operationsText) || !/mutually exclusive/.test(operationsText)) {
  fail("operations.md: the read-only relay rule is not stated");
} else {
  pass("operations.md: the read-only relay rule is stated");
}

// The relay is not the plan's to choose: it is the implementer the cast binds to
// the lane. A dispatcher that defaults the relay instead of reading the cast
// sends a lane to a CLI the user never chose — and the relay refuses it at
// dispatch, after the lane has already burned a worktree.

const castGuard = [
  [/function readCast\(\)/, "readCast() is not defined"],
  [/function castRelay\(laneName\)/, "castRelay(laneName) is not defined"],
  [/relay: l\.relay \|\| castRelay\(l\.lane\) \|\| "opencode"/, "the plan's relay does not fall back to the cast"],
  [/relayFrom: l\.relay \? "plan" : \(castRelay\(l\.lane\) \? "cast" : "default"\)/, "the relay source is not recorded"],
];
const castProblems = castGuard
  .filter(([pattern]) => !pattern.test(fellowship))
  .map(([, label]) => label);
if (castProblems.length) {
  for (const problem of castProblems) fail(`fellowship.mjs: ${problem}`);
} else {
  pass("fellowship.mjs: the relay comes from the cast");
}

if (!/the cast binds it to/.test(operationsText)) {
  fail("operations.md: the relay-from-cast rule is not stated");
} else {
  pass("operations.md: the relay-from-cast rule is stated");
}

// ---- 11. a read-only lane cannot write ------------------------------------
// `--read-only` is a request, not a guarantee: agy's sandbox is not enforced on
// Windows, and a relay that misses its own violation reports success over a
// changed tree. A read-only lane therefore runs against a throwaway copy, and a
// write inside that copy fails the lane.

const snapshotGuard = [
  [/import \{ createSnapshot, treeChanged \} from "\.\/snapshot\.mjs"/, "the snapshot module is not imported"],
  [/lane\.readOnly && !opts\.noSnapshot/, "a read-only lane does not get a snapshot"],
  [/treeChanged\(r\.snapshot\.dir, r\.snapshot\.baseline\)/, "a write inside the snapshot is not detected"],
  [/status = "read-only-violation"/, "a detected write does not fail the lane"],
  [/case "--no-snapshot"/, "the --no-snapshot escape hatch is missing"],
  [/case "--keep-snapshots"/, "the --keep-snapshots escape hatch is missing"],
];
const snapshotProblems = snapshotGuard
  .filter(([pattern]) => !pattern.test(fellowship))
  .map(([, label]) => label);
if (snapshotProblems.length) {
  for (const problem of snapshotProblems) fail(`fellowship.mjs: ${problem}`);
} else {
  pass("fellowship.mjs: a read-only lane runs against a snapshot, and a write fails the lane");
}

if (!/snapshot/i.test(operationsText) || !/read-only-violation/.test(operationsText)) {
  fail("operations.md: the read-only snapshot rule is not stated");
} else {
  pass("operations.md: the read-only snapshot rule is stated");
}

// ---- 11b. one lane per relay -----------------------------------------------
// Two opencode relays at once deadlock: the second waits on a server lock the
// first holds and neither reports anything, so the run stops silently. The
// dispatcher therefore runs one lane per relay at a time, and different relays
// still walk together.

const relayLockGuard = [
  [/const relayLocks = new Map\(\)/, "the per-relay lock table is missing"],
  [/async function withRelayLock\(relay, fn\)/, "withRelayLock(relay, fn) is not defined"],
  [/await withRelayLock\(r\.lane\.relay,/, "a lane does not take the lock for its relay"],
];
const relayLockProblems = relayLockGuard
  .filter(([pattern]) => !pattern.test(fellowship))
  .map(([, label]) => label);
if (relayLockProblems.length) {
  for (const problem of relayLockProblems) fail(`fellowship.mjs: ${problem}`);
} else {
  pass("fellowship.mjs: one lane per relay at a time");
}

if (!/one lane per relay at a time/i.test(operationsText)) {
  fail("operations.md: the one-lane-per-relay rule is not stated");
} else {
  pass("operations.md: the one-lane-per-relay rule is stated");
}

// ---- 12. every registered patch exists and is documented --------------------
// A patch that is not in the manifest is never applied; a manifest entry whose
// file is missing breaks arming. Both are silent failures otherwise.

const manifestPath = join(ROOT, "skills/council-of-elrond/patches/manifest.json");
const patchReadmePath = join(ROOT, "skills/council-of-elrond/patches/README.md");
if (!existsSync(manifestPath) || !existsSync(patchReadmePath)) {
  fail("patches: manifest.json or README.md is missing");
} else {
  let manifest = null;
  try {
    manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  } catch (error) {
    fail(`patches/manifest.json is not valid JSON: ${error.message}`);
  }
  if (manifest) {
    const patchReadme = readFileSync(patchReadmePath, "utf8");
    const missingFiles = [];
    const missingRows = [];
    for (const entry of manifest.patches ?? []) {
      if (!existsSync(join(ROOT, "skills/council-of-elrond/patches", entry.patch))) {
        missingFiles.push(`${entry.id} (${entry.patch})`);
      }
      if (!patchReadme.includes(`\`${entry.id}\``)) missingRows.push(entry.id);
    }
    if (missingFiles.length) fail(`patches: patch files missing: ${missingFiles.join(", ")}`);
    else pass(`patches: every manifest entry has its patch file (${manifest.patches.length})`);
    if (missingRows.length) fail(`patches: not listed in patches/README.md: ${missingRows.join(", ")}`);
    else pass("patches: every manifest entry is listed in the README");
  }
}

// ---- report ---------------------------------------------------------------

for (const message of passes) console.log(`✓ ${message}`);
if (failures.length) {
  console.error(`\n✗ ${failures.length} check(s) failed:\n`);
  for (const message of failures) console.error(`  - ${message}`);
  process.exit(1);
}
console.log(`\nAll ${passes.length} checks passed.`);
