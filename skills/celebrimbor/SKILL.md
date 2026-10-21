---
name: celebrimbor
description: Forge or choose a project's DESIGN.md so UI work stays consistent. Use when a project has no DESIGN.md, the existing one is stale, the user asks to pick/align a design system, or before dispatching the `ui` lane. Draws from VoltAgent/awesome-design-md (brand DESIGN.md library), ui-ux-pro-max (industry reasoning), create-design-md / stitch extract-design-md (extraction), and impeccable (context + normalize). Not a fleet role — a skill the `ui` lane and orchestrator invoke.
license: MIT
metadata:
  version: 1.0.0
---

# Celebrimbor — the DESIGN.md forge

> *"One Ring to rule them all"* — but here the ring is a plain markdown file every
> lane reads before it touches a pixel.

Celebrimbor does **one** job: make sure the project has a current, validated
`DESIGN.md` that matches its requirements, so the `ui` lane reads it first and
`qa-look` can judge against it. He does not write product code and does not
commit.

## When to invoke

- No `DESIGN.md` at the project root, and the task has a UI surface — resolve it in
  Session 0, before the first dispatch.
- `DESIGN.md` is stale (tokens drifted from code, or requirements changed).
- User asks to "pick a design system", "make it look like X", "align the UI".
- Before any `ui` dispatch in a project without a verified `DESIGN.md` — in Session 0,
  never as a mid-run check-in.

## Mode selection (pick exactly one)

| Situation | Mode | Tooling |
|---|---|---|
| Existing product with source/tokens | **Extract** | `create-design-md` (repo mode) or stitch `extract-design-md` |
| User wants a known brand's look (Stripe, Linear, Vercel, …) | **Adopt** | `VoltAgent/awesome-design-md` — copy that brand's `DESIGN.md`, then adapt tokens to the project's stack and re-validate |
| Greenfield, no brand, no code | **Generate** | `ui-ux-pro-max` `design-system` (industry reasoning rules, palette, typography) + `frontend-design` for identity |
| Existing DS that drifted | **Normalize** | `impeccable` (`teach-impeccable` for context, `normalize` to realign) |
| Stitch output required | **Stitch** | `stitch-skills` `design-md` |

If two modes fit, prefer **Extract** when source exists, else **Adopt** when a brand
reference was named, else **Generate**.

## Requirements elicitation (ask, don't guess)

Collect before forging. Skip only what the user already stated.

1. Product type / industry (SaaS, e-commerce, dashboard, marketing, mobile web, …)
2. Target audience and tone (playful, austere, editorial, technical, …)
3. Platform + stack (React/Next/Vue/Svelte, Tailwind v3/v4, shadcn, …)
4. Brand references (named sites/brands) and anti-references
5. Accessibility bar (WCAG AA/AAA, reduced motion, touch targets)
6. Theme needs (light/dark/both, default)
7. Anything that must NOT change (existing tokens, logo, font license)

## Forge procedure

1. **Choose mode** from the table above.
2. **Gather evidence** per that mode (repo tokens, brand DESIGN.md, or generated
   palette/type).
3. **Write `DESIGN.md`** in Google Stitch format:
   - YAML frontmatter: `version`, `name`, `description`, then `colors`,
     `typography`, `rounded`, `spacing`, `components` only when a governing source
     defines them.
   - Markdown: `## Overview` first, then Colors, Themes, Typography, Layout,
     Elevation & Depth, Shapes, Components, Do's and Don'ts — only supported
     sections, in this order.
   - Put exact values in YAML; rationale and guardrails in Markdown.
4. **Validate** (hard gate — do not report success otherwise):
   ```bash
   npx @google/design.md lint DESIGN.md
   npx @google/design.md export --format css-tailwind DESIGN.md   # or json-tailwind / dtcg
   ```
   Every populated category must emit its token family. Fix and rerun until clean.
5. **Report**: mode, audited product/brand, governing sources, omitted areas,
   final lint/export results. In Adopt/Generate mode, label as adapted/generated.

## Adaptation rules (Adopt mode)

- Copying a brand DESIGN.md verbatim is a starting point, not the answer. Rename
  `name`/`description` to the project, and adjust tokens to the project's stack
  (e.g. Tailwind v4 `css-tailwind` export target).
- Keep the brand's *structure and guardrails* (Do/Don't, component rules) when
  they fit; drop anything that contradicts the project's requirements.
- Never claim the project IS that brand. Label the document as adapted.

## Consistency contract (how Gandalf uses this)

- `ui` lane: read `DESIGN.md` **first**; its tokens and patterns outrank generic
  taste skills. If absent, run Celebrimbor before dispatch.
- `qa-look`: judge rendered states against this `DESIGN.md`, not preference.
- Plan debate: the dispatch brief must name the design language in play.
- A UI change is not done until `qa` is green; appearance findings from
  `qa-look` are advisory and cannot overturn `qa`.

## Boundaries

- Modify only `DESIGN.md` (and report). Do not change product source.
- Do not invent brand personality, audience, or emotional rationale.
- Do not include citations, audit notes, or rejected candidates inside
  `DESIGN.md`.
- Quantity is not quality: one coherent DS beats a collage of five brands.

## References

These are optional aids, not hard dependencies: use the ones already installed, and
fall back to the forge procedure above when one is absent.

- VoltAgent/awesome-design-md — brand DESIGN.md library (MIT)
- ibelick/ui-skills → create-design-md
- google-labs-code/stitch-skills → design-md / extract-design-md
- nextlevelbuilder/ui-ux-pro-max-skill → design-system
- pbakaus/impeccable → teach-impeccable / normalize / extract
- Leonxlnx/taste-skill → brandkit / stitch-design-taste
- anthropics/skills → frontend-design / brand-guidelines
- wshobson/agents → tailwind-design-system / design-system-patterns
- arvindrk/extract-design-system
- bergside/awesome-design-skills — registry of ready-made DS skills
