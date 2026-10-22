# Content — the rule that separates a page from a wireframe

**A page full of correct tokens can still be a grid of empty grey boxes.** The
design system governs shape and tokens; it cannot make a slot full. That is
this station's job, and it is where a build fails most often — the document
validated, the gate green, the page a wireframe with better typography.

The direction's own content rules are binding, and they are strict:

> *"Software is most convincing when it is doing its job in front of you. Put
> small, true, working fragments of the product on the page."*
>
> *"A fake interface made of grey bars and circles is the worst outcome."*
>
> *"It replaces the generic bento by having real content in every tile."*

## The five rules

1. **Every visual slot gets real content.** Every tile, every panel, every
   fragment. A slot that only carries a label and empty space is a hole, not a
   design. If you cannot fill a slot with something true, that is a finding
   about the design system or the direction — say so and stop; do not ship the
   hole.
2. **The fragments are the product, built in HTML, at true size.** Real labels,
   real numbers, sensible states: one item hovered, one selected. A fragment
   that reads as a *picture* of the product is worse than no fragment.
3. **Photographs are of the customer's world**, not stock of people at
   laptops — the servers, the racks, the cables, the workshop. Choose four to
   six with the same light; a weak hero cannot be fixed by typography, so pick
   again. Credit every one, in the footer and beside the picture.
4. **Real names and real numbers.** Placeholder text, `lorem`, "Lorem Ipsum",
   `123-456-7890` and "Feature One" are defects. If the operator has not
   supplied the content, say what you invented and mark it for replacement.
5. **The accent's job is emphasis, not decoration.** A palette whose note says
   *"no section changes colour"* means the interest comes from type, fragments
   and photographs — not from more surfaces.

## Finding the photographs

The asset tool finds openly licensed pictures and records their credits:

```bash
node <design-taste-frontend>/scripts/assets.mjs "server room racks" \
  --source commons --license safe --min-width 1200 --json
node <design-taste-frontend>/scripts/assets.mjs --get <ref> --to assets --width 1920
node <design-taste-frontend>/scripts/assets.mjs --credits --to assets
```

Look at every picture before using it — the direction's rules say the hero must
have a calm area for the name, and a set must share one light. State the query
you used and what you picked; the licence line goes in the page's footer, not
just in a JSON file.
