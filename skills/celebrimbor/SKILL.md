---
name: celebrimbor
description: >-
  Forge a project's DESIGN.md — the design system every UI lane reads before it
  touches a pixel. Use it on its own to make a design system for a new app or
  site ("build me a design system", "create a DESIGN.md", "pick a look for my
  product", "what colours and type should I use"), to adopt a brand's design
  language, to extract the design system a codebase already has, or to audit an
  existing DESIGN.md against the code that drifted from it. Also called before
  the `ui` lane dispatches, and whenever the design language needs to be kept
  in check. Ships self-contained: a research dataset, a composer, and an
  offline validation gate — no install required.
license: MIT
metadata:
  version: 2.0.0
---

# Celebrimbor — the DESIGN.md forge

> *"Three Rings for the Elven-kings under the sky, seven for the Dwarf-lords in
> their halls of stone... but one for the Dark Lord on his dark throne."* One
> Ring is not enough. One **document** is.

Celebrimbor makes sure a project has a current, validated `DESIGN.md`: a design
system with real token values, real guardrails, and a machine-checked shape. He
forges one, adopts one, extracts one, or checks one against the code.

The document is his deliverable, not the page: he does **not** build the
interface, does not write product code, and does not commit. Filling the page —
the fragments, the photographs, every slot — is the `galadriel` station's job
(the `ui` lane), and it is the one that reads what he finished.

## The hunt stops here

This is the whole reason this skill exists. An agent asked to "make sure the
project has a design system" once searched the disk for a `DESIGN.md` that was
never there, climbed into a parent directory, kept coming back to a folder the
operator had left, and never stopped. Six rules end that:

1. **One root.** The target root — the folder the operator is in, or the one
   they named. Never the parent. Never a sibling. Never a previous working
   directory. Never the drive.
2. **One lookup, then stop.** `DESIGN.md` is checked **once**, at that root.
   The evidence sweep is bounded and never ascends.
3. **Not found is the answer.** A missing `DESIGN.md` means *greenfield* — you
   write one. It is not a reason to keep looking.
4. **Never change directory.** Use absolute paths. The session's working
   directory never moves; that is what dragged the search back to the old
   folder.
5. **Never re-read what you surveyed.** Never run the survey twice for one
   task. Never loop.
6. **Never retry a hang.** A command that times out is a reported result, not
   a second attempt. `npx` is only ever run with `--yes` — a bare `npx` blocks
   forever in a non-interactive shell.

The survey script enforces 1–5 by construction. Run it once and believe it:

```bash
node scripts/survey.mjs --root <target>
```

It prints the root, whether a `DESIGN.md` is there, the stack, the token
sources, the gate, and the **recommended mode**. It always exits 0: "not found"
is an answer, not a failure.

## Two ways in

| Entry | Who calls it | What happens |
|---|---|---|
| **Solo** | the operator, on its own | full intake → forge a design system in their folder |
| **Fleet** | gandalf, before the `ui` lane | forge a missing `DESIGN.md`, or audit one that drifted |

Both end at the same gate.

## The modes

Pick exactly one. If two fit, prefer **Extract** when source exists, else
**Adopt** when a brand was named, else **Generate**.

| Situation | Mode | Read |
|---|---|---|
| No `DESIGN.md`, no code, nothing to extract from | **Generate** | `references/generate.md` |
| A codebase with real tokens and no document | **Extract** | `references/extract.md` |
| A brand was named — "make it look like Stripe" | **Adopt** | `references/adopt.md` |
| A `DESIGN.md` exists and the code has moved on | **Audit** | `references/audit.md` |
| A `DESIGN.md` exists but its shape is wrong | **Normalize** | `references/normalize.md` |

## The procedure

1. **Survey** — one command, one root. Take its recommended mode.
2. **Intake** — solo mode asks the seven questions in `references/intake.md`,
   each with a default. Fleet mode takes what gandalf already knows and asks
   only the rest. Never guess an audience.
3. **Gather** — per mode: the repo's tokens, the brand's document, or a
   direction dealt by the composer.
4. **Write** `DESIGN.md` in the format in `references/design-md-format.md`:
   exact values in the YAML frontmatter, rationale and guardrails in the
   markdown, the canonical section order.
5. **Gate** — `node scripts/validate.mjs <file> --format <target>`. Fix and
   re-run until it passes.
6. **Report** — the mode, what was audited or composed, the governing sources,
   what was omitted, the gate result, and — in Adopt and Generate mode — the
   label that it was adapted or generated.

**The gate proves the document, not the page.** A `DESIGN.md` full of correct
tokens can still describe a wireframe, and no gate can see that. What this
skill therefore guarantees is *that the document is coherent and current* — the
document must describe a system, not a mood. Whether the page built from it is
worth looking at is the `galadriel` station's job, and its content rules are
binding on it, not on this skill.

## The gate is not optional

A design system is finished when it passes a machine check, not when it looks
right. The rules that keep it from hanging, and the honest way to report a
fallback, are in `references/validation.md`.

```bash
node scripts/validate.mjs DESIGN.md --format css-tailwind
```

## What you may change

**`DESIGN.md`, and nothing else.** Not the product source, not the config, not
the dependencies. In Audit mode, code drift is *reported*, never fixed.

Also:

- Do not invent brand personality, audience, or emotional rationale.
- Do not put citations, audit notes, rejected candidates, or unresolved
  questions inside the document.
- Do not let a token count as a system. One coherent design language beats a
  collage of five.
- Do not claim the project **is** a borrowed brand. Label it adapted.

## The consistency contract (how gandalf uses this)

- `ui` lane: read `DESIGN.md` **first**. Its tokens and patterns outrank
  generic taste skills. If it is absent, forge one before dispatch.
- `qa-look`: judge the rendered states against this `DESIGN.md`, not against
  preference.
- The dispatch brief must name the design language in play.
- A UI change is not done until `qa` is green; appearance findings from
  `qa-look` are advisory and cannot overturn `qa`.

## The references

One topic per file. Read the one you need; skip the rest.

| Read this | When |
|---|---|
| `references/design-md-format.md` | the format, the schema, the section order, the export families |
| `references/intake.md` | the seven questions, and how to ask them |
| `references/generate.md` | a greenfield system — the composer, the two arms, the mapping |
| `references/extract.md` | a system already in the code — the evidence pipeline |
| `references/adopt.md` | a named brand — what to keep, adapt, and drop |
| `references/audit.md` | keeping the system in check — the drift table, which side is wrong |
| `references/normalize.md` | a document with the wrong shape |
| `references/validation.md` | the gate, the timeouts, the offline fallback |
| `references/taste-library.md` | the dataset — the fields, and what maps to what |
| `references/sources.md` | the optional aids, their install commands, their fallbacks |

## The scripts

| Script | Does |
|---|---|
| `scripts/survey.mjs` | one root, one lookup, one bounded sweep → the recommended mode |
| `scripts/compose.mjs` | deals a direction, a palette, a type system and the sections around it |
| `scripts/validate.mjs` | the gate: the real linter, or the built-in structural checks |
| `scripts/doctor.mjs` | the first-use check — what is installed, what is missing, the command for each gap |
| `scripts/survey.test.mjs` | the tests that pin the hunt rules |

`node scripts/doctor.mjs` — check the optional aids. `--yes` installs them.
