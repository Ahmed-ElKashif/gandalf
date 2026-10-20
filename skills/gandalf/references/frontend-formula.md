# The frontend formula (the `ui` role)

The `ui` role exists because frontend work is judged by humans looking at pixels.
The formula is surface-aware: never load every UI skill into one dispatch — one art
direction per run.

## Always on

- `emil-design-eng` — the craft rules (spacing, hierarchy, polish, the invisible
  details that make software feel great).
- The project's `DESIGN.md` — read it first. Its tokens and patterns win over generic
  taste. If absent, generate one with `create-design-md` and flag that in the report.
- `ui-review-loop` — kept for the human-video case, not the gate.
- The evidence gate lives with the **`qa` lane** (`palantír`), not here: `ui` builds,
  `qa` verifies. Read that section before claiming done.

## Per surface

| Surface | Load |
|---|---|
| Public / marketing pages | `design-taste-frontend` |
| App UI (dashboards, settings) | `DESIGN.md` tokens first; `baseline-ui` / `improve-ui` for cleanup passes |
| New visual identity (explicitly requested) | `frontend-design` |
| Motion | `animate` family by default; `gsap-*` only when GSAP is already a dependency |
| React / Next specifics | `vercel-react-best-practices`; transitions → `vercel-react-view-transitions` |
| Mobile web / PWA feel | `mobile-native` |

## Arbitrations

- One art direction per dispatch. `design-taste-frontend` is the only direction the
  taste pack ships; if you also install one of its classics siblings from
  `Leonxlnx/taste-skill-classics` (`minimalist-ui`, `high-end-visual-design`), treat
  them as opposing directions and never load two in the same dispatch.
- `frontend-design` only for identity asks, not for routine screens.
- GSAP skills only when GSAP is in the deps; otherwise `animate` (CSS / WAAPI /
  Framer Motion).
- One art direction per dispatch; the project's `DESIGN.md` outranks everything else.

## The done-gate

A UI change is not done until the **`qa` lane** returns a clean round on it — `ui` does
not certify its own work. `qa` runs `palantír`, which verifies through the page's own
WebMCP tools plus the DOM timeline and the network HAR, and takes **one** deliberate
vision pass on appearance. Screenshots alone don't count, and neither does a green
command exit: the round's `meta.json` says which streams landed, and a round with no
timeline and no tool call is a failed round no matter how clean the console looked.

`ui` provides the gated WebMCP tool file the round consumes; `qa` never writes it.
A red round is a **bounce to `ui`** — same lane, same session, findings as the brief.
