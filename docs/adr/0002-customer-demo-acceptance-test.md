---
status: accepted
date: 2026-10-22
---

# The customer demo is the acceptance test — the aswan run's recorded decisions

The restructure shipped a factory whose product is the loop itself. A loop is
only proven by one real pass, so step 7 runs the stations end to end on a real
client-shaped brief: **Al Madina Coal & Shawarma** (Aswan, Egypt) — design
forged by `celebrimbor`, page built by `galadriel`, behaviour verified by a
`haldir`/`palantir` round, appearance judged by `legolas`. The brief was
re-confirmed by the operator this session; everything below is the recorded
decisions and the evidence each one stands on. If a later session cannot
reproduce the evidence, the decision is re-openable, not silently kept.

## Considered options

- **The dealt sheet as-shipped (green-black-bone palette, Anton/Work Sans
  poster caps)** — rejected. The library carries no red/gold/cream palette, and
  the dealt type's poster caps contradict the pinned direction's own
  typography note ("a face with some grace for the name"). The direction is
  canonical; the deal was re-cut against it.
- **A plausible invented menu with typical EGP prices** — rejected. The demo's
  transcription rule (confirmed twice): only items confidently readable go on
  the page, and zero are in evidence this session. The page names only what the
  business's own name guarantees (shawarma; charcoal-grilled food) and routes
  everything else to the operator's board. The same restraint covers phone,
  address and hours: not re-verified this session, so the page states none.
- **Operator listing photos as the photography source** — rejected. Their
  licences cannot be recorded from the listing, and the fbcdn links expire (the
  logo's own URL dies ~2026-10-27). The repo carries its own copies: seven
  CC-licensed Wikimedia Commons scene photos plus the downloaded logo, all
  credited in `demo/aswan/assets/credits.json`.

## Recorded decisions

- **The logo is the brand constraint, and its sampled values are the palette.**
  `#B31A1C` field red, `#F5B553` gold, `#FFFFFF` shapes (pixel-sampled from the
  downloaded mark); cream `#F9F1E4` is the paper tone of the confirmed
  red/gold/cream trio. Provenance: operator-provided brand mark, not taste.
- **The Arabic type override stands.** Display = IBM Plex Sans Arabic 700;
  text and labels = Cairo. Both faces cover Arabic and Latin, so the bilingual
  page is two families, no third. overriding the dealt Latin-only caps is
  recorded in the ADR and the document.
- **The Arabic business name is a literal translation only.**
  المدينة للفحم والشاورما renders the confirmed Latin name; the operator's own
  signage always overrides it. Recorded in the glossary so no later edit
  treats it as an invented brand name.
- **The photo honesty rule binds the two dish photographs.** The CC-licensed
  foul medames and koshary pictures are likenesses of Egyptian dishes, never
  the operator's plates; every caption says so.
- **The demo banner is part of the design, not a footnote.** A visible chip
  states this is an acceptance test, not the operator's website.
- **The tool file is galadriel's, once.** One gated WebMCP tool
  (`photos.list`, live credits) — consumed by `qa`, never edited by it.

## Consequences

- `demo/aswan/DESIGN.md` is the single standard `legolas` may judge against;
  anything the acceptance route invents later is out of scope unless recorded
  here first.
- The page can never claim to be the business's official site: the banner,
  the credits and the practical block all state what is verified versus
  pointed at. An honesty finding that survives one bounce is an escalation,
  like any other `haldir` finding.
- The pipeline order for the acceptance route is fixed as
  `celebrimbor` → `galadriel` → `haldir` → `legolas`; a station that wants a
  different order on future demos changes this ADR first.
- The fbcdn copy in browser caches dies on expiry; the repo must never depend
  on the CDN again — new assets are downloaded into `demo/aswan/assets/` with
  a credits entry before use.
