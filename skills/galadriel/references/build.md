# Build — from document to rendered surface

## 1. The document is law

Read `DESIGN.md` before anything else. Three parts matter most:

- **`## Layout`** — the geometry the document already decided: the grid, the
  column splits, the row heights, the gaps, the page margins. These numbers are
  the ones an implementer cannot guess; do not re-derive them.
- **`## Components`** — the panel, the button, the control row, the fragment.
  One radius, one accent, one filled container per screen unless the document
  says otherwise.
- **`## Do's and Don'ts`** — the prohibitions are binding. A gradient, an
  eyebrow label or `01/02/03` numbering that the document bans is a defect no
  matter how good it looks.

Map every size a section blueprint names onto one of the document's type steps
instead of adding a sixth. When a document step is documented as *fluid* — a
minimum at phone width rising to the token value at the reference viewport —
honour the range, because the document states it.

## 2. Structure before styling

Build the grid and the flow before styling anything, and check the result at
both reference widths **before** styling. A layout that is wrong at 390px is
cheaper to fix as structure than as CSS.

## 3. Fragments — the product's own conventions

A fragment is a cropped piece of interface at true size, docked and cropped by
its container. Inside one, the product's own conventions apply — 1px control
borders, small radii, a shadow on an open menu — which is a different regime
from the page around it. Mark fragment roots `data-ui` so tooling can tell the
two apart, and build every fragment so it *works*: real labels, real numbers,
sensible states, one item hovered and one selected.

Never a whole window, never a browser or laptop frame, never a collage of grey
bars.

## 4. The four build-time traps

All four were found by measurement, not taste. Re-learn them at your cost.

1. **Tailwind v4: `--font-display` and `--font-weight-display` both generate the
   utility `font-display`, and the family wins.** A `font-display` class
   silently leaves the weight at 400 while the design system says 600. Spell
   the weights as weight utilities (`font-semibold`, `font-medium`,
   `font-normal`) and check the rendered weight — never assume it.
2. **Unlayered CSS beats layered utilities.** Tailwind v4 puts its utilities in
   `@layer utilities`; any plain rule outside a layer wins, whatever the order.
   A bespoke `.wrap { margin: 0 auto }` silently kills every `mt-*` on the
   element — the symptom is sections with no space between them while the same
   utility works everywhere else. Use longhand that spares the axis the
   utilities touch: `margin-inline: auto`, not the margin shorthand.
3. **A grid track's automatic minimum is its min-content size.** One wide child
   pushes the whole track — and the page — wider than the viewport.
   `min-width: 0` on the grid children hands the track back to the layout.
4. **A gap has to shrink with the breakpoint.** A 12-column grid with a 64px
   gap needs 704px of gap alone; on a phone the layout overflows before the
   content does. `gap-base lg:gap-xl` — not one gap for every width.

## 5. Evidence

Run the project's real gates — lint, typecheck, build — and paste their output.
Open the page at both reference widths and state what you saw. If the document
was exported rather than hand-written, every token on the page is the literal
export: a token that renders differently from its documented value is a defect
to fix, not a deviation to note.
