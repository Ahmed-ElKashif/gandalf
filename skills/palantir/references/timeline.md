# Reading the DOM timeline

The timeline is the second stream, and the one that always exists. It answers the question
a screenshot structurally cannot: **why** did the page change.

## What it records

The recorder observes the page; nothing needs per-feature instrumentation.

- **Every mutation on `<body>`**, via `MutationObserver` — React, Stimulus, jQuery, raw JS,
  all caught the same way, coalesced into readable frames.
- **The nearest user event in time** before each change (capture-phase listeners on
  input/change/click/keydown/submit/focus). This is **temporal context, never proof of
  causation** — but a mutation with no nearby event and no fetch is the classic *"it
  changes by itself"* smell. Investigate that frame first.
- **Fetch boundaries** — `fetch:start` / `fetch:end` / `fetch:error` with URL and status,
  so an AJAX flow reads like a transcript.
- **Form values and visible text** per frame.

## Reading it

In a round package, after `stop`: **`dom.json`**. That is the consolidated timeline.

Live, before a round: `window.__rec.dumpCompact()` — compact JSON (`t`/`dt`, trigger,
mutation summary, values, text).

**Never** read live frames through `round.mjs run -- eval "window.__rec.dumpCompact()"`:
the runner drains and persists the buffer *before* each command it wraps, so the wrapped
eval always sees an empty buffer. Inspect before `start`, or read the package after.

The buffer is a ring buffer (default 1000 frames). On a long page, `clear()` before the
interaction you actually care about.

## Reading a frame

Find the interaction, then walk outward:

1. **The trigger** — which event, on which element.
2. **The fetch, if any** — did a request fire? With what status? Did it error?
3. **The mutation** — what changed, and did it change *after* the response landed.

The three together are the answer. Common shapes:

| Shape | Usually means |
|---|---|
| event → fetch:start → fetch:end 200 → mutation | healthy |
| event → fetch:start → fetch:error / 4xx-5xx | server or contract problem; read the response body |
| event → **no fetch** → no mutation | dead handler, or a handler that never bound |
| **no event** → fetch → mutation | a timer, poll, or subscription — or a bug |
| event → mutation, but no fetch where one was expected | client-side-only change; often a missing save |
| multiple fetches for one event | waterfall; check whether a race is possible |

## Gotchas that cost real time (pre-solved)

1. **Same-URL POST→redirect races.** `waitForURL` insta-matches when the redirect lands on
   the same URL, so your read runs mid-flight. Wait on a concrete DOM condition instead of
   a URL.
2. **Async renders.** After a long request, wait on a DOM condition (child count, button
   re-enabled) — never a fixed sleep.
3. **Cloned templates.** Content cloned into a container offsets child counts; wait on the
   triggering button's busy-cycle instead.
4. **Asserting too early after AJAX.** Server work can continue after the response
   (background jobs, shutdown handlers). Verify against a completion signal, not the
   response alone.
5. **Recorder buffer.** See above — `clear()` before the interesting part.

## Affordance sweeps

`window.__rec.auditAffordances()` is a one-shot sweep for interaction bugs no screenshot
shows: clickable elements with no pointer cursor, `animate-*` elements whose animation
isn't actually running (purged utility), mouse-only controls unreachable by keyboard. Empty
result = clean. Run it on every distinct screen.

Forms with submit actions and lone `@window`/`@document` listeners are not click
affordances; the shipped filter already excludes them.
