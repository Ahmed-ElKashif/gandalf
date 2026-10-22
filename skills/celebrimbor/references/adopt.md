# Adopt — take a brand's design language

The user named a brand: *"make it look like Stripe"*, *"use the Vercel
palette"*, *"same language as Linear"*. This mode starts from a known design
language and adapts it to the project.

## The rule that matters

**Copying a brand's `DESIGN.md` verbatim is a starting point, not the answer.**

- Never claim the project **is** that brand. Label the document as adapted.
- Rename `name` and `description` to the project.
- Adjust the tokens to the project's stack — a brand's tokens written for
  Tailwind v3 need re-expressing for Tailwind v4's `css-tailwind` target.
- Keep the brand's **structure and guardrails** (its Do's and Don'ts, its
  component rules) when they fit the project.
- Drop anything that contradicts the project's own requirements — the operator's
  accessibility bar outranks the brand.

## The procedure

1. **Get the brand's `DESIGN.md`.** Best source: the `awesome-design-md`
   library (VoltAgent, MIT) — a collection of real brand documents. If it is not
   installed, see `references/sources.md`. Failing that, reconstruct from the
   brand's public site using the URL-mode discipline in `references/extract.md`,
   and label it a reconstruction.
2. **Read the project's constraints.** The survey found the stack, the existing
   tokens, and what must not change. This is what the adaptation is *for*.
3. **Adapt the tokens**, not the personality. The brand's character is the
   point; its hex values may need to survive a different export target.
4. **Write the guardrails in the brand's voice.** Its Do's and Don'ts are the
   most valuable part of the borrowed document.
5. **Validate and report as adapted.**

## The conflict rule

A brand's rules and the project's requirements will sometimes disagree. The
order is:

1. The operator's stated requirements (accessibility bar, fixed tokens, brand
   rules of their own)
2. The product's own existing code, where it is deliberate
3. The borrowed brand's guidance

When the borrowed guidance loses, **record the conflict in the report, not in
the document.** The DESIGN.md is not a changelog.

## What stays and what goes

| Keep | Adapt | Drop |
|---|---|---|
| the brand's character, tone, contrast discipline | token names to the project's roles | anything contradicting the operator's requirements |
| its Do's and Don'ts | token values to the export target | tokens the project has no use for |
| its spacing and radius logic | type scale to the project's stack | the brand's own product-specific components |
| its layout habits | | its `name` and `description` |

## The label

The document's `description` and the report both say it is adapted, and name the
source. A DESIGN.md that claims to be Linear's when it is a fork of it is a
lie a future agent will act on.

## Validate

```bash
node scripts/validate.mjs <path>/DESIGN.md --format <target>
```

## Report

The brand audited, the URL or library it came from, what was adapted and why,
what was dropped, and the gate result. Label it adapted.
