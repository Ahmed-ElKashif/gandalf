# Surface — one recipe per dispatch

Frontend work is judged by humans looking at pixels, so the recipe is
surface-aware and **one art direction per dispatch**. Never load every UI skill
into one build.

## The design system is always on

`DESIGN.md` first, on every surface: its tokens and patterns outrank generic
taste. Absent → forge it with `celebrimbor`; stale → its audit mode changes
only the document. This rule is before and above the table.

## Per surface

| Surface | Recipe |
|---|---|
| Public / marketing pages | `design-taste-frontend` — one art direction |
| App UI (dashboards, settings, inboxes) | `DESIGN.md` tokens first; `baseline-ui` / `improve-ui` for cleanup passes |
| New visual identity (explicitly requested) | `frontend-design` |
| Motion | `animate` family by default; `gsap-*` only when GSAP is already a dependency |
| React / Next specifics | `vercel-react-best-practices`; transitions → `vercel-react-view-transitions` |
| Mobile web / PWA feel | `mobile-native` |
| Craft (always, any surface) | `emil-design-eng` — spacing, hierarchy, the invisible details |

## Arbitrations

- **One art direction per dispatch.** `design-taste-frontend` is the only
  direction the taste pack ships; if you also install one of its classics
  siblings from `Leonxlnx/taste-skill-classics` (`minimalist-ui`,
  `high-end-visual-design`), treat them as opposing directions and never load
  two in the same dispatch.
- `frontend-design` only for identity asks, not routine screens.
- GSAP only when GSAP is in the deps; otherwise `animate` (CSS / WAAPI /
  Framer Motion).
- `ui-review-loop` is tier `optional`, installed only on request — it is the
  human-watches-video loop, not the evidence path.

A recipe that is not installed is not a blocker: the surface table above is
*what to reach for*, and your own references carry the floor for every one of
them. Say which packs were absent when you report.
