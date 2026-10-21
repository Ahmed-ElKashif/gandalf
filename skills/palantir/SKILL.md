---
name: palantir
description: "Verify a running web app through its own agent-facing surface instead of photographing it — discover and invoke WebMCP tools the page registers, assert each result against the DOM timeline and the network HAR, and sweep a maintained inventory of views and controls so every declared element is exercised. Use after ANY change that touches web UI, when an agent must prove a page works rather than look at it, when driving a site through agent-browser or Chrome, for a DOM-dynamics pass, or when a flow must be verified without a screenshot loop. Vision is a deliberate final pass on appearance only, never the mechanism. Prefer this over screenshot-based UI review and over driving agent-browser ad hoc."
license: MIT
metadata:
  version: 1.0.0
---

# Palantír — see the site as it is, through its own tools

> *A palantír does not travel to the distant place. It opens a link and observes —
> and the stone shows what it is shown. Trust the link, verify the answer.*

A **palantír** is a seeing-stone: you observe a distant, running thing through a direct
link rather than by walking there and photographing it. That is this skill.

The failure it exists to prevent is the one a screenshot loop cannot escape: point-in-time
tools (navigate, click, shoot) burn minutes per hypothesis and still cannot show *why* a
field flipped. Modern UI is a state machine over time. And the failure it exists to warn
about is the one the stones themselves had — a palantír shows **what the viewer wants to
see**. A green check that proves nothing is worse than no check. Every rule below is
written to keep the stone honest.

Set the skill directory once:

```bash
PALANTIR_DIR="$HOME/.agents/skills/palantir"
```

## The three evidence streams

| Stream | Proves | Cost | Always available? |
|---|---|---|---|
| **Tool calls** (WebMCP) | what the page *did*, as structured data | cheapest — text in, text/JSON out | only if the page registers tools |
| **DOM timeline** (recorder) | *why* it changed: event → fetch → mutation | cheap — one `dumpCompact()` replaces a dozen shots | yes, always |
| **Network HAR** | what went to the server, and with what status | cheap | yes on agent-browser |
| **Vision** (`nemotron-3.5-super-vl-free`) | what it *looks like* | expensive | yes, but **last and least** |

**The core discipline: interaction is verified through streams 1–3, never through stream 4.**
A tool call returning `{"text":"42"}` and a HAR entry showing `200` is evidence. A
screenshot showing a number is a guess about a picture.

Stream 4 answers a question no other stream can — *does it look right* — and that question
is real, so it is asked once, at the end, on the states that matter. It is never the
mechanism.

## Which workflow

- **Verification round** — "did THIS change work?" Walk the change, collect tool calls +
  timeline + HAR, assert. Sections below. This is the default after any UI change.
- **Coverage sweep** — "does every INVENTORIED view still react as declared?" A maintained
  inventory, touched 100% per run. `references/coverage-audit.md`.
- **Ad-hoc diagnosis** — reproduce with the recorder on, then read the timeline. Usually
  one glance finds the frame with no nearby event or the missing fetch.
  `references/timeline.md`.

## Prerequisite: agent-browser

All browser work goes through the `agent-browser` CLI. Verify it before the first round
(`agent-browser --version`); if missing, stop and tell the operator.

**WebMCP is on by default** in agent-browser for a locally launched Chrome — there is
nothing to enable. Confirm the version supports it (`agent-browser webmcp` should print
usage) and that the page registers tools (`references/webmcp.md`).

**Do not assume the agent-browser Chrome is your Chrome.** The CLI drives its own
launch. When you need the tool surface, check the page, not the browser.

## Before UI work

Ask what the last round proved and whether anything is still pending:

```bash
node "$PALANTIR_DIR/scripts/round.mjs" pending --json
```

Read every unresolved comment before changing code. Operator feedback is the
specification — address it first.

## Record a verification round

The round is the unit of evidence. It captures all three streams into one package.

```bash
# 1. start — names the URL under test
node "$PALANTIR_DIR/scripts/round.mjs" start --url <url>

# 2. every browser action goes through the runner, so evidence is not lost
node "$PALANTIR_DIR/scripts/round.mjs" run -- snapshot
node "$PALANTIR_DIR/scripts/round.mjs" run -- webmcp list
node "$PALANTIR_DIR/scripts/round.mjs" run -- webmcp invoke add-item --params '{"text":"milk"}'
node "$PALANTIR_DIR/scripts/round.mjs" run -- click @e12

# 3. stop with a one-line summary (<=160 chars)
node "$PALANTIR_DIR/scripts/round.mjs" stop --summary "add-item tool creates a row and the list updates"
```

Rules that matter:

- **Never call `agent-browser` directly while a round is active.** The runner owns the
  recorder lifecycle; bypassing it loses evidence silently.
- A failed `run` (nonzero exit) keeps the round **active** — retry or continue. Do NOT
  `start` again.
- To inspect the live timeline, do NOT `run -- eval "window.__rec.dumpCompact()"` — the
  runner drains the buffer before each wrapped command, so wrapped evals see nothing.
  Read `dom.json` from the package after `stop`, or inspect **before** `start`.
- `abort` when a round cannot finish safely. Partial packages are kept for diagnosis and
  are never treated as evidence of coverage.
- Keep rounds short. One concern per round.

## What a round package contains

```
.agent-review/<roundId>/
  meta.json        round metadata, timestamps, per-stream status
  dom.json         the consolidated DOM timeline (frames)
  network.har      every request/response the session made
  tools.json       every WebMCP call: name, params, result, outcome
  video.webm       ONLY when video recording is available and requested
  verdict.json     your assertions and their outcomes
```

**Read `meta.json` before trusting a package.** It records which streams landed. A round
whose `tools.json` is empty on a page that registers tools, or whose `dom.json` has no
frames, is a **failed round** — not a pass. Never summarise a round you have not opened.

## Proof, not vibes

A round is not "done" because the actions ran. It is done when each claim maps to
evidence. Write assertions, and let the runner fail them:

```bash
node "$PALANTIR_DIR/scripts/round.mjs" assert \
  --tool add-item --params '{"text":"milk"}' \
  --expect-result-contains "milk" \
  --expect-har "POST /api/items 201" \
  --expect-dom-mutation \
  --expect-value "q=hello" \
  --expect-focus "#pw"
```

The assertion vocabulary. The first column is implemented **today** and fails the round
when it does not hold; the second is a claim you can make in a report by reading the
timeline yourself — there is no flag for it yet, so do not write it as an assertion.

| flag | asserts | reads |
|---|---|---|
| `--tool` + `--expect-result-contains` | a WebMCP tool **completed** and its result contains the string | `tools.json`, CLI output |
| `--expect-har "POST /api/x 201"` | the declared request fired with the declared status | live request list |
| `--expect-dom-mutation` | at least one timeline frame landed | timeline |
| `--expect-url-change <s>` | the URL now contains the string | `get url` |
| `--expect-value "field=text"` | the typed/filled value appears in the timeline's form values | timeline `values` |
| `--expect-focus <sel>` | focus landed on the described element | timeline `focus` frame |
| `--expect-disabled <control>` | the control is disabled in its last timeline frame (a submit that locked) | timeline `controls` |
| `--expect-enabled <control>` | the control is **still enabled** — proves a double-submit hazard | timeline `controls` |

Still not a flag — read the timeline instead: `toggle` (an open/closed state flipped) shows
as element presence flipping across two frames. Asserting it means reading `dom.json`, not
passing a flag. Say so plainly rather than inventing an atom that does not exist.

A round with zero assertions proves only that commands exited 0.

**A `--tool` assertion first checks the tool *completed*.** A failed invocation exits 0, so
"the command ran" is not evidence; the runner records `status` and fails the assertion
unless it is `completed`. See the four traps in `references/webmcp.md`.

**`focus` and `value` come from state frames, not mutations.** Typing into a field or
moving focus changes what the page *holds* without necessarily changing the DOM, so the
recorder pushes a `state`/`focus` frame on `input`/`change`/`focus` (coalesced, so a burst
of keystrokes is one frame). This is what makes "the field ends up containing X" provable
at all.

## Appearance — the one vision pass

After the mechanical evidence is green, take **one** deliberate look at the states that a
human will judge. This is stream 4, and it is a real question, not a formality:

- layouts that break, overlap, clip, or fall off-screen;
- contrast, legibility, and colour;
- spacing and alignment regressions;
- something that renders correctly and still looks wrong.

```bash
node "$PALANTIR_DIR/scripts/round.mjs" look --state <name> --shot <path>
```

Hand the screenshot to the vision model and ask a *specific* question. "Does this look
okay" returns an opinion; "is the confirm button fully inside the viewport, and does the
error text sit under the field it belongs to" returns an answer. Keep it to the states
that matter — the mechanical streams already carry the rest.

## When the page registers no tools

Normal, and not a failure. Fall back to the DOM timeline and HAR — streams 2 and 3 — which
answer most questions on their own. The automation surface is an **upgrade path, never a
prerequisite**. See `references/webmcp.md` for how to check, and what to ask the `ui` lane
for when a critical action has no tool.

## Reference

| Read this | when |
|---|---|
| `references/webmcp.md` | discovering/invoking tools, the validation trap, tool-file conventions |
| `references/timeline.md` | reading the DOM timeline; diagnosing a dynamic bug |
| `references/coverage-audit.md` | the inventory sweep and its preflight |
| `references/formats.md` | the package format, `.agent-review/`, when extending the runner |
| `references/limits.md` | what this proves, and what it never can |

## Reporting

The report IS the evidence, summarised. For each claim: the stream, and the raw artifact
that carries it. `COVERAGE n/n (inventoried)` with a violations list for sweeps.

State plainly what was **not** verified. An honest gap is worth more than a confident
summary — the palantír shows what it is shown, and you must say when it showed nothing.
