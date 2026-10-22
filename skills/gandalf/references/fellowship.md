# The Fellowship — names, wire names, and domains

> *"All we have to decide is what to do with the time that is given us."*

The fellowship speaks two languages. **LOTR names** are how Gandalf talks to the
user and to himself; **wire names** are what the machinery resolves (`--lane`,
the fleet config, the relay). They never disagree — the wire name is always
shown beside the LOTR name (a table column, `Aragorn/feature`, or
`Aragorn — feature`), so nobody has to guess which seat a name points at.

The wire names are fixed. Do not rename them in `delegate-fleet.v1`, in the
council's cast, or in a relay invocation. Rename only the display.

## The company

| LOTR name | Wire name | Domain | Carries |
|---|---|---|---|
| **Aragorn** | `feature` | full-stack / feature | stack packs + Ponytail |
| **Galadriel** | `ui` | frontend / design craft | craft + `DESIGN.md` + taste/motion menu |
| **Elrond** | `bugfix` | debugging / diagnosis | systematic-debugging + regression tests |
| **Gimli** | `devops` | infrastructure / CI-CD | CI/CD packs + workflow hardening |
| **Samwise** | `chores` | maintenance / mechanical | pre-commit setup + refactor planning |
| **Glorfindel** | `complex` | frontier reasoning / architecture | slow & thorough — one deep pass |
| **Haldir** | `qa` | behaviour verification / browser | palantír — the UI **behaviour** gate |
| **Legolas** | `qa-look` | visual verification / the eye | the appearance pass, against `DESIGN.md` |
| **Radagast** | `plan-debate` | plan challenger | domain-modeling + systematic-debugging |
| **Faramir** | `review-main` | second-opinion reviewer | debate-review main pass |
| **Saruman** | `review-debate` | strong challenger | debate-review challenger |

Gandalf is the orchestrator (the seat you are in). He is not a lane and never
carries the Ring.

## How the names are used

- **In prose and reports**, use the LOTR name first and the wire name beside it:
  *"Aragorn/`feature` is the all-rounder."* or *"Aragorn (`feature`) is the
  all-rounder."*
- **In dispatch**, use the wire name: `--lane feature`.
- **In the fleet config**, the keys are wire names (`"feature": { ... }`).
- **In preambles**, the heading is `## Aragorn — feature *(station: `aragorn`)*`
  (a station lane) or `## Elrond — bugfix (debugging) *(example cast: …)*`
  (a casting lane), so a reader sees both and the injector can still match on
  the wire name. The station lanes' text is generated from the station skills
  by `build-preambles.mjs`.
- **In the council**, the casting table shows the LOTR name beside the wire name.

## Why two names

`feature`, `ui`, and `qa` are accurate wire labels and terrible conversation
labels. The LOTR names carry the role's character — Aragorn is the all-rounder
who also heals; Galadriel is the maker of beautiful things; Glorfindel slew a
Balrog; Haldir guards the border; Legolas has the eyes. A name you can picture
is a name you will not confuse with another seat.

The aliases are display only. The machinery never changes.