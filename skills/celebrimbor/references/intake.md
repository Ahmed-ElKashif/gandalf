# The intake — ask, don't guess

A design system built on guesses is a design system nobody wants. This is the
full requirements interview for **solo** mode. In **fleet** mode gandalf has
already asked most of it (see `references/intake.md` in the gandalf skill) —
skip what is already known.

## The rules

1. **Ask what you cannot infer.** Anything the folder or the survey already
   told you is not a question.
2. **Offer a default for every question.** A question with a proposed default
   gets a one-word answer. A question without one gets a paragraph.
3. **Ask once.** Seven questions, then forge. Do not come back for more.
4. **Never block on an unanswered question.** If the operator moves on, take the
   default and say so in the report.

## The seven

### 1. Product type and industry

What is it, and whose problem does it solve? This picks the sector, and the
sector picks the art direction.

```
SaaS dashboard · e-commerce · marketing site · mobile app · internal tooling ·
portfolio · docs site · fintech · healthcare · education · ...
```

**Default:** `other`. The composer still deals a direction; it just has less to
work with.

### 2. Audience and tone

Who uses it, and how should it feel? The tone vocabulary the dataset speaks:

```
bold · editorial · luxury · playful · quiet · technical · warm
```

**Default:** `technical` for internal tooling and dashboards, `quiet` for
product UI, `editorial` for a marketing site.

### 3. Platform and stack

React / Next / Vue / Svelte / Nuxt / Astro / plain HTML? Tailwind v3 or v4?
shadcn? This decides the **export target** and the token names.

**Default:** read it from `package.json` — the survey already found it. If
there is no package.json, assume Tailwind v4 (`css-tailwind`).

### 4. Brand references

A named brand, a named site, or nothing. "Make it look like Stripe" is a real
and useful answer. Two or three references is plenty; five is a collage, and a
collage is not a design system.

**Default:** none — compose from the dataset.

### 5. Anti-references

What must it *not* look like? This is often the most useful answer and the
least asked. "Not a purple gradient SaaS landing page" saves an hour.

**Default:** the dataset's house rules already exclude the slop patterns.

### 6. Accessibility bar

WCAG AA or AAA? Reduced motion? Minimum touch target? Does the product run on
a phone?

**Default:** WCAG AA, reduced motion respected, 44px touch targets, phone
supported.

### 7. What must not change

Existing tokens, a logo, a font licence, a brand colour already in the code.

**Default:** nothing is fixed. But check the survey's token sources first — if
the project already has tokens, they are the constraint.

## Light or dark

Not a separate question — it is part of question 1's answer, and it changes the
palette choice. If the operator does not say, ship **light only** and record
the choice. A half-finished dark mode is worse than no dark mode.

## Themes in the format

The installed specification supports theme-aware token syntax. Check it before
writing a second set of tokens:

```bash
npx @google/design.md spec
```

If the specification supports `themes` and `default-theme`, use that syntax.
If it does not, put the default-theme value under each canonical semantic token
and keep the alternate-theme values in a `## Themes` table — a table is
documentation only. Do not pretend it is theme-aware, and never create
parallel `-light` and `-dark` token names.

## After the interview

State the decisions in one short block before forging, so a wrong assumption is
visible before a file is written:

```
surface: marketing site for a developer tool
audience: engineers who already know the category
tone:    technical, quiet
stack:   static HTML + Tailwind v4
brand:   none
anti:    not a purple gradient, no hero video
a11y:    WCAG AA, reduced motion honoured
fixed:   nothing
themes:  light only
```

Then forge. Do not ask again.
