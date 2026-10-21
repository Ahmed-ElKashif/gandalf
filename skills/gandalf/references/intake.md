# Session 0 — the summoning (intake)

> *"Speak, friend, and enter."*

Before Gandalf chooses who walks, he must know what the quest is. Session 0 is the
intake: it runs **once, at the start of every new task**, and it is the only part
of the loop where the user is asked questions. Once it ends, the war begins and
Gandalf does not come back until the landing report.

Session 0 is not a form. It is a conversation, driven by the `grilling` skill's
design-tree method: Gandalf asks the whole frontier of open questions in one
round, waits for answers, then recomputes. Finding facts is Gandalf's job (he
dispatches sub-agents or reads the repo); the decisions are the user's.

Nothing here is welded to a specific model. The seat is the law.

---

## 1. Fleet check — is the fellowship mustered?

Run the neutral engine's loader first, before anything else:

```bash
node ~/.agents/skills/delegate-setup/scripts/config.mjs load --cwd "$PWD"
```

- **No fleet configured** → ask the user one question: *"Have you run the council
  yet?"*
  - *No* → invoke the **`council-of-elrond`** skill in this session and wait for
    the cast to be written and verified. Do not dispatch anything until it hands
    off.
  - *Yes, but the config is missing* → hard stop. The council was run but the
    config did not land; re-run the council. Never simulate a cast.
- **Fleet exists** → show the effective lanes (with their `source`) in one line,
  then proceed silently. Do not re-ask.

If the task needs a seat the cast does not have (a UI task with no `qa`, or a
plan that needs `plan-debate` and neither judge is cast), that is a hard stop —
ask the user to cast it, or escalate the task.

## 2. Grill the build — what are we making?

Invoke **`grilling`** now, and **`domain-modeling`** alongside it. Gandalf does
not ask the user to invoke them; he calls them himself.

**Lite intake for a one-liner.** If the task is a single file, one lane, and the
acceptance test is obvious, ask three questions — what, done, constraints — and
skip the full design tree. Say that you did. The full grill is for work that
earns it; interrogating a typo fix is its own failure mode.

The interview covers, at minimum:

- What are we building, in the user's own words?
- What does "done" look like? (acceptance criteria, observable behaviour)
- What is explicitly out of scope?
- Constraints: stack, platform, performance, accessibility, licence, deadlines.
- Edge cases and failure modes the user cares about.
- Anything that must not change (existing tokens, APIs, data, contracts).

`domain-modeling` runs in parallel: it challenges fuzzy terms, sharpens the
language, and **writes `GLOSSARY.md` as terms resolve** — never batching, never
stalling. It offers an ADR (`docs/adr/NNNN-*.md`) only when all three are true:

1. the decision is hard to reverse,
2. it is surprising without context,
3. it came from a real trade-off with genuine alternatives.

The raw intake answers do not need a separate file: they live in the dispatch
brief, and the durable decisions live in `GLOSSARY.md` and the ADRs. If the user
wants a narrative record of the interview, offer to write `docs/intake.md` —
never write it without asking.

`grill-with-docs` (mattpocock, tier `core`, user-invoked) is the optional
wrapper around these two skills for users who prefer to invoke it themselves.
Gandalf's automatic path calls the two underlying skills directly, because
`grill-with-docs` is `disable-model-invocation: true`.

The session is done when the frontier is empty. **Do not act on the answers until
the user confirms shared understanding.**

## 3. Design language — the UI question

Only if the task touches UI. Otherwise skip this step entirely.

Check the project root for `DESIGN.md`.

- **Present** → read it. Its tokens and patterns win over generic taste skills.
  Cite it in the brief and in the landing report.
- **Missing** → ask exactly one question, with three options:
  > *"No `DESIGN.md` found. (a) forge one with celebrimbor, (b) adopt a brand
  > reference, (c) proceed without — `qa-look` will be skipped."*
  - (a) or (b) → invoke **`celebrimbor`** now and wait for a validated file.
    `qa-look` runs against it; `ui` reads it first.
  - (c) → proceed, but record in the landing report that no design language was
    judged against.

## 4. Scope — the last question

Ask once, only if it is not already clear from the intake:

> *"Commit, push, or open a PR when this lands?"*

Record the answer. This is the last question until the landing checkpoint.

## 5. Complexity — Gandalf decides (the user is not asked)

Gandalf evaluates the task against the rubric in `references/plan-debate.md`
and decides whether Radagast is needed. He records the decision in the intake
summary and the landing report — not as a question.

The rubric is canonical in `references/plan-debate.md` — apply it, do not restate
it here. In short: more than one file, a lane hand-off, architecture / concurrency /
security / migration, ambiguous acceptance, or a lane that already failed → hold the
debate. Single file, single lane, mechanical, obvious acceptance, greenfield one-liner
→ skip it.

The decision is recorded at landing ("plan debate: held / skipped — single-file
chore"), never silently and never as a user question. A skipped gate that is not
recorded is indistinguishable from a forgotten one.

---

## What Session 0 produces

- A confirmed understanding of the build (from the grilling), and whether it was a
  lite or full intake.
- `GLOSSARY.md` updated with the resolved terms, and ADRs where earned.
- A decision on the design language (or an explicit "none").
- A landing preference (commit / push / PR).
- A complexity verdict, with the rubric reason.
- The dispatch brief, ready to hand to the lane.

Only now does the war begin. Everything after this is the autonomous run in
`references/orchestrator-rules.md`.
