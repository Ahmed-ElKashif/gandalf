---
version: alpha
name: Al Madina
description: An acceptance-test page for Al Madina Coal & Shawarma in Aswan — the place carries it, and the honest bits say so.
colors:
  primary: "#B31A1C"
  primary-foreground: "#F9F1E4"
  background: "#F9F1E4"
  surface: "#FFF9EF"
  foreground: "#211612"
  muted: "#7A6B5B"
  accent: "#F5B553"
  accent-foreground: "#2C1B0A"
typography:
  display:
    fontFamily: "IBM Plex Sans Arabic"
    fontSize: 64px
    fontWeight: 700
    lineHeight: 1.05
    letterSpacing: -0.01em
  heading:
    fontFamily: "IBM Plex Sans Arabic"
    fontSize: 26px
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: -0.01em
  body:
    fontFamily: "Cairo"
    fontSize: 18px
    fontWeight: 400
    lineHeight: 1.55
  label:
    fontFamily: "Cairo"
    fontSize: 14px
    fontWeight: 600
    lineHeight: 1.45
rounded:
  base: 6px
spacing:
  base: "8px"
  xs: "12px"
  sm: "16px"
  md: "24px"
  lg: "40px"
  xl: "64px"
  2xl: "96px"
components:
  board:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.foreground}"
    padding: "{spacing.md}"
    rounded: "{rounded.base}"
  button:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-foreground}"
    rounded: "{rounded.base}"
  chip:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-foreground}"
    padding: "{spacing.xs}"
    rounded: "{rounded.base}"
---

## Overview

Al Madina Coal & Shawarma is a charcoal-grill and shawarma house on Aswan's
Corniche, and this page is the acceptance test of the station pipeline that
presents it: a real brief, real assets, and the four stations in order. The
page should feel like standing by the Nile at dusk — the place is the argument
and the design edits: one photograph worth stepping into, the name set like a
film title, few words, long pauses.

Everything on the page is either confirmed, credited, or openly pointed
somewhere else. The demo chip in the top-left says this is an acceptance test,
not the operator's website; the menu section is the operator's board, not a
transcript nobody can verify; the photographs are credited likenesses and
scenes, never claimed plates. The restraint is the honesty.

## Colors

The operator's logo is the colour. All three of its values are pixel-sampled
from the mark: a crimson field, gold foil shapes, white wave and balls. The
cream that completes the confirmed trio is the paper those shapes read on — a
warm ground, one step up on a filled panel, and never whiter than the paper.

- **Primary (#B31A1C):** the sampled field red. The banner chip, the one
  filled button, and accents in type. It is never a large area beyond the
  mark's own plate.
- **Background (#F9F1E4):** the cream paper the whole page sits on.
- **Surface (#FFF9EF):** one step up from the paper — the board slate, the
  page's one panel tone.
- **Foreground (#211612):** coal-black text ink, the only text colour on the
  paper.
- **Muted (#7A6B5B):** captions, credits, supporting lines, the soft ink
  (4.59:1 on the paper — measured; the first dealt value #8C7C6E failed at
  3.59 and was darkened in the acceptance round).
- **Accent (#F5B553):** the sampled foil gold. It lives on the red — dots,
  fills, the mark's flourishes — and follows the same rule as the logo.
- **Primary foreground (#F9F1E4):** the text on the primary; cream reads on
  red at 6.1:1, measured in the acceptance round.
- **Accent foreground (#2C1B0A):** dark roast ink on gold fills.

## Typography

Two faces, both bilingual. Arabic display is IBM Plex Sans Arabic at 700 —
architectural, generous, with leading near-sung tight around 1.05; every line
the eye reads in paragraphs or labels is Cairo. Both cover Arabic and Latin,
so the page is two families, not four, and the two scripts hold one system.

The composed session asked the type system for a face "with some grace for
the name"; the dealt poster caps were rejected for exactly that reason, and
this pairing is the override, recorded in the ADR.

- **Display:** IBM Plex Sans Arabic 700 at 64px, tracking −0.01em, leading
  1.05. Section names, and the poolside ladder of headings down from it. The
  hero's own name is a bigger exception, set by the layout.
- **Heading:** IBM Plex Sans Arabic 700 at 26px. Block headings and slate
  titles.
- **Body:** Cairo 400 at 18px, leading 1.55. Paragraphs and captions'
  sentences.
- **Label:** Cairo 600 at 14px. Nav words, slate lines, chips, credits.

## Layout

A hero at 100vw by 100svh: one photograph of the place with its focal point
clear of all text. The business name is the film title — the Arabic line
المدينة للفحم والشاورما under the Latin name, hugging the bottom edge at
clamp(48px, 13vw, 176px), 24px off the edge. The demo chip sits top-left, the
nav words top-right, both at label size; a neutral scrim sits under the text
areas only, never as a wash over the whole frame.

Below, sections alternate: a short paragraph in a narrow column (max 52ch)
with wide empty margins, then photographs large — one full-bleed, then a pair
at unequal sizes, then one portrait offset. A band of five unequal panels
runs one stretch: flex row, varied flex-grow widths, no gaps, photographs
square-cornered. The board slate is the one filled panel in the menu
section. Practical information is gathered once, near the end, in a plain
two-column block, and every fact it carries is either present or pointed at —
the operator's board and listing, nothing invented. The footer carries the
credits for every asset.

## Components

**The chip.** Primary red ground, cream label text, 6px radius, small
padding. The demo banner; one per page, top-left, always on screen.

**The button.** Primary red ground, cream text, 6px radius, 44px tall at
minimum. One filled button per view. The quiet button is coal text with no
fill.

**The board slate.** The surface tone, 24px padding, 6px radius, coal text at
label size for lines and heading size for its title. It is the menu section's
one filled container.

**The caption.** Muted text at label size under every photograph, naming the
subject and the credit; for the two dish photos the caption states plainly
that they are likenesses of Egyptian dishes, not this kitchen's plates.

**The mark.** The operator's logo traced as inline SVG at its plate shape —
red field, white wave with three balls, gold crescent and dots. Used as the
small header mark, and beside its own credit in the footer; never tiled,
framed or repainted.

## Don'ts

- Don't stack a headline, a paragraph and buttons over the hero photograph.
- Don't cover the hero's bottom edge with a booking or contact bar — one
  small action is enough.
- Don't transcribe menu items or prices the page cannot verify; the board is
  the menu and EGP is its currency.
- Don't present the two dish photographs as this restaurant's food; they are
  credited likenesses of Egyptian dishes.
- Don't set gold as text on cream — it fails contrast; gold appears only as
  fills and dots on red.
- Don't decorate with gradients or shadows; the only permitted scrim is the
  neutral one under hero text areas.
- Don't credit a photograph off-page — every credit sits beside its image and
  again in the footer.
