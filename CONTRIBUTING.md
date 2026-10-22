# Contributing

Thanks for helping. This repo treats its Markdown as part of the contract, so the checks are not optional.

## Before you open a PR

```bash
npm test
npm run check
```

`npm test` runs the preamble injector tests. `npm run check` enforces:

- `skills/gandalf/roles.json` is canonical: 11 roles, 8 walkers, 3 judges;
- every casting doc carries each role's LOTR alias and wire name;
- no stale role counts, manual prepend steps, or `qa`/vision contradictions;
- the `council-of-elrond` and `gandalf` preambles templates are byte-identical,
  and they are exactly what `build-preambles.mjs` generates from the station
  lane blocks and `preambles-casting.md` (stale fails);
- each craft wire (`feature`, `ui`, `qa`, `qa-look`) is claimed by exactly one
  station's lane block, casting lanes claim none, and station packs are
  first-party, tier `core`, with interface packs never claiming `feature`;
- the README names all eight first-party skills;
- `fellowship.mjs` knows every wire role;
- `packs.json` points at the canonical remote;
- the README credits table covers every pack, in manifest order;
- Markdown links resolve.

CI runs both on every push and pull request. On a fork, set `GANDALF_REPO_URL` to the canonical repo URL when running `npm run check`; CI already does.

## Repository layout

```text
.
├── .github/workflows/check.yml   CI: npm test + npm run check
├── .gitattributes
├── .gitignore
├── assets/                       README images
├── skills/
│   ├── gandalf/
│   │   ├── SKILL.md
│   │   ├── roles.json           canonical role registry
│   │   ├── references/          fleet · loadouts · frontend-formula · orchestrator-rules · plan-debate · operations · gates · intake · landing-report · fellowship · prior-art
│   │   ├── presets/             free-first.json (example, not a default)
│   │   ├── templates/           fleet.template.json · preambles-casting.md · preambles.example.md (generated)
│   │   └── scripts/             fellowship.mjs · preambles.mjs · build-preambles.mjs · check-docs.mjs · install-skills.ps1 · tests
│   ├── council-of-elrond/
│   │   ├── SKILL.md
│   │   ├── packs.json           install manifest and credits source
│   │   ├── NOTICE.md            attribution for the vendored engine and patches
│   │   ├── patches/             verified diffs + manifest
│   │   ├── references/          casting · arming
│   │   ├── presets/             free-first.json (example, not a default)
│   │   ├── templates/           preambles.example.md (byte-identical to gandalf's)
│   │   └── scripts/             vendored engine + patch-skills.mjs (apply · check)
│   ├── palantir/                the evidence engine
│   │   ├── SKILL.md
│   │   ├── references/          webmcp · timeline · coverage-audit · limits · formats
│   │   ├── scripts/             round.mjs
│   │   └── assets/              recorder.js
│   ├── celebrimbor/             DESIGN.md forge — the design-system station
│   │   ├── SKILL.md
│   │   ├── NOTICE.md            attribution for the vendored research dataset
│   │   ├── deps.json            dependency manifest (the doctor reads it)
│   │   ├── assets/              starter-kit.json + the trimmed taste dataset
│   │   ├── references/          format · intake · generate · extract · adopt · audit · normalize · validation · taste-library · sources
│   │   └── scripts/             survey.mjs · compose.mjs · validate.mjs · doctor.mjs · tests
│   ├── galadriel/               the interface station (`ui`; carries the lane block)
│   │   ├── SKILL.md
│   │   └── references/          build · content · surface · states · handoff · preflight
│   ├── aragorn/                 the feature station (`feature`; server-side only)
│   │   ├── SKILL.md
│   │   └── references/          feature · data · handoff · preflight · loadout
│   ├── haldir/                  the `qa` door-warden (requires palantir + agent-browser)
│   │   ├── SKILL.md
│   │   └── references/          verdict
│   └── legolas/                 the `qa-look` appearance judge (requires a DESIGN.md)
│       ├── SKILL.md
│       └── references/          judge · limits
├── CONTRIBUTING.md
├── LICENSE
├── package.json
└── README.md
```

Eight skills are first-party and install together — five stations (`celebrimbor`, `galadriel`, `aragorn`, `haldir`, `legolas`), the engine `palantir`, and the two orchestration seats (`gandalf`, `council-of-elrond`). All are part of the loop, not optional extras.

## Changing a role

`skills/gandalf/roles.json` is the canonical registry. If you add, remove, or rename a role:

1. Update `roles.json`.
2. Update every casting doc checked by `check-docs.mjs`: `README.md`, `skills/gandalf/SKILL.md`, `skills/gandalf/references/fellowship.md`, `skills/gandalf/references/fleet.md`, `skills/gandalf/references/loadouts.md`, `skills/council-of-elrond/SKILL.md`, `skills/council-of-elrond/references/casting.md`, and both preambles templates.
3. Update `WIRE_ROLES` in `skills/gandalf/scripts/fellowship.mjs`.
4. Run `npm test && npm run check`.

A role whose craft becomes a station gets its station directory (`skills/<name>/` with a lane block in its `SKILL.md`); `check-docs.mjs` verifies each craft wire is claimed exactly once and that casting lanes carry no station block. The generated preambles template is not edited by hand after that: run `node skills/gandalf/scripts/build-preambles.mjs` when the sources change.

## Changing docs or packs

- Keep `README.md` as the landing page. Put casting detail in `skills/gandalf/references/`.
- The README credits table mirrors `packs.json`; update both in the same change, in manifest order.
- The two preambles templates are generated byte-identical copies — never edit them; edit the casting document or the station lane block, then re-run the generator.
- If you add a pack, add it to `packs.json`, credit it in the README, and check its URL. A station pack must be tier `core` and carry its lane's role; interface packs (shadcn-ui, wshobson-agents) must not claim `feature`.

## Patches

Three upstream skills carry verified diffs in `skills/council-of-elrond/patches/`.

- `node skills/council-of-elrond/scripts/patch-skills.mjs check` verifies; it exits nonzero on `pending` or `drift`.
- `apply` is idempotent and runs after installs.
- `drift` means upstream changed the code the patch was written against. Update the patch and `upstreamCommit` in `manifest.json`; never force it.
- If upstream takes the fix, delete the entry.
- Requires `git` on PATH.

## Images

README images live in `assets/`. They are fan homages; keep the alt text and width attributes. If you replace one, update the `<img>` tag in `README.md`.
