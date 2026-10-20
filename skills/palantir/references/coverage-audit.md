# Coverage sweep — proving the inventory was exercised

The verification round answers *"did THIS change work?"* The sweep answers the other
question: *"does every INVENTORIED view still react the way it should?"*

Same recorder, same three streams — different discipline: a maintained inventory, touched
**100% every run**. The sweep proves the inventory was exercised. It **cannot** prove the
inventory is complete, which is why the inventory is reviewed like code.

## Why not screenshots

Screenshot loops (shoot → read → guess → re-shoot) burn minutes per hypothesis and cannot
show *why* a field flipped. Disabled submits, dead handlers, self-firing state changes,
spinners that never spin — none are reliably visible in a picture. The timeline catches all
of them automatically.

## Setting it up in a project (once)

1. **Integrate the recorder** for the sweep path — import it for side effects and boot it
   behind a dev/test gate:
   ```js
   import "./recorder.js"; // sets window.AgentReviewRecorder
   window.AgentReviewRecorder.startRecorderIfEnabled();
   ```
   Boot is gated to development/test ONLY, behind an explicit opt-in: `?record_dom=1` in
   the URL, or `localStorage.dom_recorder = "on"`. **A missing env marker means no boot**,
   so it can never run in production. Playwright drivers can skip project integration:
   `context.addInitScript({ path: "<path>/recorder.js" })`, then boot via `page.evaluate`.
   The driver's origin preflight is then the only safety gate — keep it mandatory.

2. **Create `scripts/browser-audit/coverage.json`** — one entry per view, one per
   interactive element, each with `expects` atoms (below) plus human prose in `note`.
   This file **is** the definition of done. Aim for full functional coverage of *views*,
   not controllers or models — those belong in the normal test suite.

3. **Create the driver.** It walks every view/state, fires every element, checks each
   expectation against the timeline, and prints `COVERAGE n/n (inventoried)` plus
   violations only.

4. **Wire the fail-closed preflight.** The sweep clicks EVERY inventoried control,
   including state-changing ones (sends, resolves, deletes). Before the first interaction
   the driver MUST verify, and refuse the run if any check fails:
   - an approved origin — loopback or a dedicated seeded staging host;
   - a live, recording recorder;
   - an isolated throwaway test account;
   - the project's seed/reset strategy for this run.

   **Do not weaken this.** A sweep against real data destroys real data.

## Driving it

Sweeps run **unrecorded by default** — a 100% sweep makes a long, unwatchable video. With
agent-browser, drive the browser directly (no round active) and read frames with
`agent-browser eval "window.__rec.dumpCompact()"`.

When the operator should see evidence, record a **short verification round of just the
representative or failing flow** instead — the normal round workflow.

## The `expects` vocabulary

The inventory records what each element is *expected* to do. Two columns: whether the
runner can assert it today, and how you read it out of the timeline when it cannot.

| atom | meaning | runner flag | how to read it |
|---|---|---|---|
| `nav` | URL changes | `--expect-url-change <s>` | `get url`, or the `boot` frame's `url` |
| `fetch` | AJAX fires | `--expect-har "POST /x 201"` | `fetch:start` / `fetch:end` / `fetch:error` frames |
| `mut` | DOM reacts | `--expect-dom-mutation` | any mutation frame after the interaction |
| `focus` | focus moves | `--expect-focus <sel>` | `focus` frame's `target` / `targets` |
| `value` | typed value registers | `--expect-value "field=text"` | `state` / `mutation` frame `values` |
| `tool` | WebMCP tool returns declared shape | `--tool` + `--expect-result-contains` | `tools.json` (`status` must be `completed`) |
| `disable` | submit locks + feedback label | `--expect-disabled <control>` / `--expect-enabled <control>` | the last `controls` entry for that control |
| `toggle` | open/closed flips | — | element present ↔ absent across two mutation frames |

`disable` is a real atom: every timeline frame carries `controls` (a map of interactive
control → disabled boolean), so `--expect-disabled submit` proves a submit actually locked
and `--expect-enabled submit` proves it did **not** — which is how a double-submit hazard
gets caught. It is the one claim no screenshot and no mutation diff can show: the request
fires, the button stays live, and a second click sends a second request.

`toggle` still has **no flag**. It is a real claim you can make by reading `dom.json`
(element present ↔ absent across two frames), but writing it as an assertion would be a
lie about what the tool checks. Read the frames and say what you saw.

`tool` is this skill's addition. Prefer it where a tool exists — it asserts against
structured output instead of inferring from pixels, and it fails loudly. A `tool`
expectation requires the invocation to have **completed**; `failed` / `timed_out` /
`pending` are violations, not passes.

**Declarative `<form>` tools are unverifiable here.** They appear in `webmcp list` with a
synthesized schema, but invoking one times out without submitting the form (measured on
Chrome 156). Count a declarative tool as **not exercised** — never as green. See
`references/webmcp.md`.

## The recurring workflow

After ANY round of changes that involves UI:

1. Run the app with the recorder enabled.
2. Run the driver — it must report **100% (n/n), zero violations**.
3. New elements added this round? **Add them to `coverage.json` FIRST** — the inventory is
   reviewed like code — then run.
4. Run `window.__rec.auditAffordances()` on every distinct screen. Empty = clean.
5. New WebMCP tool? Add a `tool` expectation for it.

## Reporting

The output IS the report:

```
COVERAGE 47/47 (inventoried)
VIOLATIONS: none
```

or the violations list, plus MISSING/UNKNOWN id reconciliation. A run below 100% means the
inventory and the UI drifted — fix the inventory in the same round.

Remember what the number means: **every DECLARED element was exercised.** Elements missing
from the inventory are invisible to this sweep. Say so when you report it; a coverage
number quoted without that caveat is the palantír showing what the viewer wanted to see.

## Privacy

The sweep only ever runs against **seeded test data** — the preflight requires an isolated
throwaway account for this reason. Never type real personal data into an audited page. The
timeline captures ordinary field values verbatim by design (only credential-shaped fields
are redacted), so treat any package as containing whatever the page showed.
