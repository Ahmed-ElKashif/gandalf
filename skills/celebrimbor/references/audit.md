# Audit — keep the design system in check

This is the mode gandalf calls when the DESIGN.md exists but the code has
moved on. The system and the implementation drift apart: a colour was changed
in the CSS, a radius was rounded off in a component, a font was swapped, a
token was added and never documented.

**What you may change: `DESIGN.md`. What you may not change: the code.** Code
drift is reported, not fixed. A drift report is evidence for whoever owns the
code, and silently rewriting product source to match a document is exactly the
kind of unrequested change a forge must not make.

## The procedure

1. **Survey** — `node scripts/survey.mjs --root <dir>`. It returns the token
   sources it found.
2. **Read the DESIGN.md** — the documented tokens, the guardrails, the rules.
3. **Read the code** — the theme file, the Tailwind config, the CSS variables,
   the global styles. These are the *actual* values.
4. **Diff the two** — token by token.
5. **Decide the direction of each drift.**
6. **Write the document.** Report the code drift.
7. **Validate and report.**

## The drift table

Every difference gets a row. There is no such thing as a small drift.

| Token | Documented | Actual | Which side is wrong | Action |
|---|---|---|---|---|
| `colors.background` | `#f7f6f3` | `#ffffff` | code drifted | **fix the doc** — the code is the product |
| `rounded.base` | `10px` | `4px` | code drifted | **fix the doc** |
| `colors.accent` | `#1f4b3f` | `#7c3aed` | the code is wrong | **report** — a brand colour changed in code |
| `typography.body.fontSize` | `16px` | `14px` | unknown | **report** — the code violates the documented rule |

### Which side is wrong

Decide with the operator's intent, not with taste.

- **The code drifted innocently** — someone hard-coded a value, tweaked a
  colour, rounded a radius. The code is the product that exists; the document
  describes it. **Fix the document.** This is the common case.
- **The code violates an explicit rule** — a documented minimum body size, a
  contrast floor, a brand colour that the operator fixed in the intake. The
  document is the contract. **Report it** as a finding against the code. Do not
  rewrite the document to bless it, and do not rewrite the code.
- **The requirement changed** — the operator said so, or the product's purpose
  changed. Both sides move. Ask before rewriting either.

When you cannot tell, **report it and do not change the document.** An
unchanged document plus a clear question beats a guess written into a file.

## What the drift report says

```
design system audit — <project>
source of truth: the code (tokens drifted, no explicit rule broken)

  colors.background      #f7f6f3 -> #ffffff   doc updated
  colors.surface         #ffffff  -> #f7f6f3   doc updated
  rounded.base           10px     -> 4px        doc updated
  typography.body        16px     -> 14px       REPORT: violates the documented 16px floor
  colors.accent          #1f4b3f  -> #7c3aed    REPORT: brand colour changed in code

  DESIGN.md updated: 3 tokens. 2 findings left for the code owner.
  gate: PASS (css-tailwind)
```

**Every changed value appears in the report.** The operator sees exactly what
moved and can object.

## The diff is the evidence

When the CLI is installed, the diff between the old document and the new one is
the proof of what changed:

```bash
design.md diff <previous> DESIGN.md
```

Keep the previous file long enough to diff it, then report the diff's content.
When the CLI is absent, keep the old file and diff it by hand — the report
still has to name every changed token.

## Guardrails that are not tokens

Audit the prose rules too, not just the YAML:

- A documented minimum size that the code violates.
- A Do's and Don'ts the code breaks.
- A section the code has outgrown.
- A component rule that no longer matches the component.

These are findings. They are not token drift, and they are not fixed by
editing the document.

## Validate

```bash
node scripts/validate.mjs <path>/DESIGN.md --format <target>
```

## Report

The drift table, every token the document changed, every finding left for the
code owner, and the gate result. A clean audit is a real result — report it as
such, with the count of tokens checked.
