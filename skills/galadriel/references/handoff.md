# Hand-off — what the verifiers get from you

## To `haldir` (behaviour)

- **A running app** at a URL, with the human path reachable.
- **The tool file** you authored (`qa/tools.ts` / `tools.webmcp.ts`).
- **The declared states** — the four from `states.md`, one line each.
- **The acceptance criteria** from the brief, so the round asserts the brief
  and not the page's own behaviour.

`haldir` asserts through the page's own WebMCP tools, the DOM timeline and the
network HAR — never through pixels. A round with no timeline frames and no tool
call is a **failed** round however clean the console looked, so a green console
is not a pass; the round's `meta.json` is.

A red round comes back to **you** — same lane, same session, the findings as
the brief, once. A finding that survives one bounce is an escalation, not a
third round.

## To `legolas` (appearance)

- The declared states, and the round's screenshots at those states.
- `DESIGN.md`, which is the only standard: a finding cites the artifact and the
  rule it broke. *"I would have chosen a different blue"* is not a finding.

Its verdict is **advisory** and can never overturn behaviour evidence: a
beautiful broken page still fails.

## When neither is installed

Open the page yourself, walk the human path a person would click, and record
what you did and did not verify — you may run an evidence round to *record*
what happened, and you hand it over as evidence. **You do not issue the
verdict**, in the fleet or solo: the report ends on what was verified, by which
stream, and what remains unverified. An honest gap beats a confident summary.

## What you do not do

- You do not certify your own work — that is the point of the split, and it
  holds solo.
- You do not write the tool file on `qa`'s behalf after a round has started;
  the round bounces to you instead.
- You do not adopt a finding by editing the evidence. The finding is fixed in
  the interface; the evidence records the fix.
