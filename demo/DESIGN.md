---
version: alpha
name: Ridgeline
description: Deploy control for small engineering teams — ship from CI, watch it land, roll it back in one command.
colors:
  primary: "#5a9bfc"
  background: "#0a0d14"
  surface: "#131824"
  foreground: "#e9edf3"
  muted: "#8891a1"
  accent-foreground: "#0a0d14"
typography:
  display:
    fontFamily: "Albert Sans"
    fontSize: 64px
    fontWeight: 600
    lineHeight: 1
    letterSpacing: -0.035em
  heading:
    fontFamily: "Albert Sans"
    fontSize: 26px
    fontWeight: 600
    lineHeight: 1.15
    letterSpacing: -0.02em
  body:
    fontFamily: "Albert Sans"
    fontSize: 19px
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Albert Sans"
    fontSize: 14px
    fontWeight: 500
    lineHeight: 1.4
rounded:
  base: 12px
spacing:
  base: "8px"
  xs: "12px"
  sm: "20px"
  md: "24px"
  lg: "40px"
  xl: "64px"
  2xl: "96px"
components:
  panel:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.foreground}"
    padding: "{spacing.md}"
    rounded: "{rounded.base}"
  button:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.accent-foreground}"
    rounded: "{rounded.base}"
  button-quiet:
    textColor: "{colors.foreground}"
    rounded: "{rounded.base}"
---

## Overview

Ridgeline is a deploy control room for small teams — the product engineers open
when something is shipping, and again when something has just shipped badly. It
should feel like a control room at night: quiet, precise, everything legible at
a glance, nothing decorative. Software is most convincing when it is doing its
job in front of you, so the page is mostly the product itself — real panels,
real numbers, real states — rather than pictures of the product.

Calm and dependable. The system never raises its voice: one accent, one radius,
one family, and the interface does the talking.

## Colors

A blue-black ground with slate panels and silver-white text fills the whole
page. No section changes colour. Cornflower blue marks the buttons and at most
one word in a heading.

- **Primary (#5a9bfc):** the one accent. The deploy button, the featured column
  of the comparison, and at most one word in any heading. It is never a large
  area and never decorative.
- **Background (#0a0d14):** the page ground.
- **Surface (#131824):** one step up from the ground — every panel, every
  fragment, every input.
- **Foreground (#e9edf3):** silver-white text, and the only text colour on the
  accent.
- **Muted (#8891a1):** metadata, timestamps, supporting lines, and the soft ink
  inside a fragment.
- **Accent foreground (#0a0d14):** the text on the accent.

## Typography

One family, Albert Sans — a geometric grotesque with Scandinavian restraint:
round letters, even colour, nothing decorative. It suits a product that has to
look clear and dependable. The marketing type is the product's interface type,
so the panels and the page read as one thing.

- **Display:** Albert Sans 600 at 64px, tracking −0.035em, leading 1.0. The
  headline, and the single figure. It is fluid between 44px and 64px; 64px is
  its value at the reference viewport.
- **Heading:** Albert Sans 600 at 26px, tracking −0.02em. Section headings and
  the statement inside a panel.
- **Body:** Albert Sans 400 at 19px, leading 1.5. Paragraphs.
- **Label:** Albert Sans 500 at 14px. Interface text: panel titles, control
  labels, timestamps, metadata.

Four sizes, and nothing else. Interface text inside a product fragment is
14–15px, which is the label step.

## Layout

A 12-column grid with 8px gaps. The page is one continuous composition that the
eye roams: a hero, then a sequence of sections, each one a row of two parts on
a 5/7 split — a short statement on one side, the relevant interface fragment on
the other — with the fragments varying in size and shape so the column never
becomes a zigzag of equal blocks.

Fragments are cropped pieces of interface at **true size**: a panel edge, a
menu, a row, a control. Never a whole window, never a browser or laptop frame,
never a dashboard collage of grey bars.

The display step is fluid: 64px at the reference viewport, 44px on a phone. Every
other size is fixed.

## Components

**The panel.** One tone above the ground, 12px radius, 24px padding. It is the
only container on the page, and it is filled — never outlined, never carrying a
shadow at rest.

**The fragment.** A cropped piece of the product's own interface, at true size,
docked flush against the edge of its panel and cropped by it. Inside a fragment
the product's own conventions apply: 1px control borders, 4px radii, and a
shadow on an open menu. Outside a fragment the page's own rules apply.

**The button.** The accent ground, accent-foreground text, 12px radius, 44px
tall at minimum. One filled button per view. The quiet button is foreground
text with no fill.

**The input.** The surface ground, filled, 4px radius, 1px border, 44px tall.
Placeholder in muted, value in foreground.

**The control row.** 44px tall, the name at label size on the left, the control
on the right. The unit every fragment shares.

## Do's and Don'ts

- Do fill panels and fragments with real content: real labels, real numbers,
  sensible states, one item hovered and one selected.
- Do build the fragments in HTML so they work. A fake interface made of grey
  bars and circles is the worst possible outcome — if a fragment cannot be
  built believably, change direction.
- Do use photographs of the customer's world — the servers, the racks, the
  cables — and credit them.
- Don't put a fragment in a browser or laptop frame.
- Don't use more than one accent surface on a screen.
- Don't set type below 14px, and don't set body copy below 19px.
- Don't use eyebrow labels, monospace, or `01/02/03` numbering.
- Don't use thin rules, gradients, or shadows at rest.
- Don't use the accent on a large area.
