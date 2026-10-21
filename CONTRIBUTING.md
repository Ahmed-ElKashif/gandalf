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
- the `council-of-elrond` and `gandalf` preambles templates are byte-identical;
- `fellowship.mjs` knows every wire role;
- `packs.json` points at the canonical remote;
- the README credits table covers every pack, in manifest order;
- Markdown links resolve.

CI runs both on every push and pull request. On a fork, set `GANDALF_REPO_URL` to the canonical repo URL when running `npm run check`; CI already does.

## Repository layout

```text
assets/                      README images
skills/
├── gandalf/
│   ├── SKILL.md
│   ├── roles.json           canonical role registry
│   ├── references/          fleet · loadouts · plan-debate · operations · gates · intake · landing-report · fellowship · prior-art
│   ├── presets/             free-first.json
│   ├── templates/           fleet.template.json · preambles.example.md
│   └── scripts/             fellowship.mjs · preambles.mjs · check-docs.mjs · install-skills.ps1 · tests
├── council-of-elrond/
│   ├── SKILL.md
│   ├── packs.json           install manifest and credits source
│   ├── NOTICE.md            attribution for the vendored engine and patches
│   ├── patches/             verified diffs for installed third-party skills
│   ├── references/          casting · arming
│   ├── presets/             free-first.json
│   ├── templates/           preambles.example.md (byte-identical to gandalf's)
│   └── scripts/             vendored engine + patch-skills.mjs (apply · check)
├── palantir/                UI evidence child skill
│   ├── SKILL.md
│   ├── references/          webmcp · timeline · coverage-audit · limits · formats
│   ├── scripts/             round.mjs
│   └── assets/              recorder.js
└── celebrimbor/             DESIGN.md child skill
    └── SKILL.md
```

## Changing a role

`skills/gandalf/roles.json` is the canonical registry. If you add, remove, or rename a role:

1. Update `roles.json`.
2. Update every casting doc checked by `check-docs.mjs`: `README.md`, `skills/gandalf/SKILL.md`, `skills/gandalf/references/fellowship.md`, `skills/gandalf/references/fleet.md`, `skills/gandalf/references/loadouts.md`, `skills/council-of-elrond/SKILL.md`, `skills/council-of-elrond/references/casting.md`, and both preambles templates.
3. Update `WIRE_ROLES` in `skills/gandalf/scripts/fellowship.mjs`.
4. Run `npm test && npm run check`.

## Changing docs or packs

- Keep `README.md` as the landing page. Put casting detail in `skills/gandalf/references/`.
- The README credits table mirrors `packs.json`; update both in the same change, in manifest order.
- The two preambles templates must stay byte-identical; edit both.
- If you add a pack, add it to `packs.json`, credit it in the README, and check its URL.

## Patches

Three upstream skills carry verified diffs in `skills/council-of-elrond/patches/`.

- `node skills/council-of-elrond/scripts/patch-skills.mjs check` verifies; it exits nonzero on `pending` or `drift`.
- `apply` is idempotent and runs after installs.
- `drift` means upstream changed the code the patch was written against. Update the patch and `upstreamCommit` in `manifest.json`; never force it.
- If upstream takes the fix, delete the entry.
- Requires `git` on PATH.

## Images

README images live in `assets/`. They are fan homages; keep the alt text and width attributes. If you replace one, update the `<img>` tag in `README.md`.
