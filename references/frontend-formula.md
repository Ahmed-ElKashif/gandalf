# The frontend formula (the `ui` role)

The `ui` role exists because frontend work is judged by humans looking at pixels.
The formula is surface-aware: never load every UI skill into one dispatch — one art
direction per run.

## Always on

- `emil-design-eng` — the craft rules (spacing, hierarchy, polish, the invisible
  details that make software feel great).
- The project's `DESIGN.md` — read it first. Its tokens and patterns win over generic
  taste. If absent, generate one with `create-design-md` and flag that in the report.
- `ui-review-loop` — the done-gate: recorded evidence (video + DOM timeline),
  not screenshots.

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

- **Never** load `design-taste-frontend` and `minimalist-ui` in the same dispatch —
  they are opposing art directions.
- `frontend-design` only for identity asks, not for routine screens.
- GSAP skills only when GSAP is in the deps; otherwise `animate` (CSS / WAAPI /
  Framer Motion).
- One art direction per dispatch; the project's `DESIGN.md` outranks everything else.

## The done-gate

A UI change is not done until `ui-review-loop` shows it working in a real browser.
Prerequisites: the agent-browser CLI (`npx agent-browser` auto-installs it on first
use) and `ffmpeg` for recording. Screenshots alone don't count — the recorded round
plus DOM timeline is the evidence a reviewer can actually check.
