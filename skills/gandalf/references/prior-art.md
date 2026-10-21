# Prior art — why the loop looks like this

gandalf is not a novel orchestration theory. It is a small, opinionated application
of patterns that have held up in production. The point of this page is to keep the
design honest: if a rule cannot be traced to one of these patterns (or to a measured
failure in this repo), it is probably ceremony.

## The patterns

### 1. Orchestrator-workers — decompose, then dispatch

Anthropic's *Building effective agents* separates **workflows** (LLMs orchestrated
through predefined code paths) from **agents** (LLMs directing their own process).
For work that cannot be predicted in advance, it recommends an **orchestrator** that
decomposes the task, delegates to workers, and synthesises their results. The
orchestrator keeps the plan; the workers get focused briefs.

In gandalf: Gandalf is the orchestrator; the lanes are the workers. `fellowship.mjs`
is the dispatch mechanism, not the brain. Each brief is self-contained because the
worker does not share the orchestrator's context.

Source: <https://www.anthropic.com/research/building-effective-agents>

### 2. Evaluator-optimizer — a separate pass that judges

The same guide describes the **evaluator-optimizer** workflow: one model produces,
another evaluates, and the loop repeats until the evaluation is clean. The value is
not "two models are better"; it is that the producer and the judge have different
inputs and different incentives.

In gandalf: `plan-debate` judges the plan before the build; `review-main` /
`review-debate` judge the diff; `clean-code-guard` / `test-guard` / `docs-guard` judge
by artifact. The implementer never reviews its own work, and `qa-look` cannot
overturn `qa` — the eye is not the behaviour judge.

### 3. Own your prompts, context, and control flow

The **12-factor agents** argument is that reliable agent systems own the parts that
matter instead of outsourcing them to a framework: prompts are explicit, the context
window is curated, and the control flow is code you can read. It also recommends
**small, focused agents** over one general-purpose agent, and **pause/resume** as a
first-class capability.

In gandalf:

- the role prompts live in `templates/preambles.example.md`, not in a black box;
- `preambles.mjs` owns the injection, and the unit tests pin it;
- `fellowship.mjs` owns dispatch, worktrees, and the `run.json` ledger;
- each lane is small and focused, with a loadout rather than a giant prompt;
- `run.json` + per-lane sessions make a finished lane resumable.

Source: <https://github.com/humanlayer/12-factor-agents>

### 4. Guardrails and human checkpoints

OpenAI's practical agent guide frames an agent as **model + tools + instructions**,
and treats guardrails and human intervention as design components, not afterthoughts.
It recommends explicit failure thresholds and human review for high-impact actions.
The useful distinction is between **reversible** work (let the agent run) and
**irreversible** work (stop and ask).

In gandalf:

- gates are automatic and named by Gandalf, never permission prompts;
- one bounce per finding, then escalate — a failure threshold, not an infinite loop;
- the **landing report** is the one irreversible checkpoint: commit / push / PR
  waits for an explicit yes;
- mid-run check-ins are treated as a failure mode, not diligence.

Source: <https://openai.com/business/guides-and-resources/a-practical-guide-to-building-ai-agents/>

### 5. Multi-agent research systems — the same shape, with warnings

Anthropic's description of its multi-agent research system adds two warnings that
gandalf takes seriously: **save the plan to memory** (the orchestrator's context can
be truncated), and **do not let the judge be the only witness**. It also uses
LLM-as-judge on a small eval set rather than trusting a single aggregate score.

In gandalf: the plan and the run facts are written to disk (`run.json`,
`GLOSSARY.md`, ADRs, the landing report), and the QA split exists so the seat that
judges behaviour is not the seat that sees appearance.

Source: <https://www.anthropic.com/engineering/multi-agent-research-system>

## What gandalf deliberately does differently

- **The orchestrator is a seat, not a model.** The law does not change when the
  wearer changes. This is why the rules are Markdown and the role names are fixed.
- **The fleet is cast, not hard-coded.** The council maps whatever CLIs and models
  are installed onto the eleven roles; the loop is identical on a free, local, or
  premium fleet.
- **The plan debate is conditional.** It is a judgment call from a rubric, not a
  user question and not a mandatory ceremony on a one-line chore.
- **Free-first is a first-class example.** The cheapest working fleet is a valid
  starting point, not an apology. Strength goes where the road is dark.
- **The landing report is the only checkpoint.** Autonomy is real: no "are you sure?"
  between dispatch and landing except a genuine blocker.

## What gandalf deliberately does not do

- **No DAG engine.** The plan is a brief, not a graph. If the task needs a graph,
  that is a sign the plan is too big for one dispatch.
- **No unbounded retries.** Two failed attempts or one surviving bounce → escalate.
- **No self-review.** A lane's report is a claim, not evidence. The diff is evidence.
- **No mid-run status meetings.** Decisions are recorded and surface at landing.
- **No silent skips.** A skipped gate is named, reasoned, and mechanically checked
  where possible.

## The mapping

| Principle | Source | Where it lives in gandalf |
|---|---|---|
| Orchestrator-workers | Anthropic, *Building effective agents* | Gandalf + lanes; `fellowship.mjs` |
| Evaluator-optimizer | Anthropic, *Building effective agents* | `plan-debate`, `review-main` / `review-debate`, guards |
| Own prompts / context / control flow | 12-factor agents | `preambles.mjs`, `roles.json`, `fellowship.mjs` |
| Small, focused agents | 12-factor agents | eleven roles, one concern per lane |
| Pause / resume | 12-factor agents | per-lane sessions, `run.json`, `result.json` |
| Guardrails + human checkpoint | OpenAI, *A practical guide to building agents* | gates, one-bounce rule, landing report |
| Save the plan to memory | Anthropic multi-agent research | `run.json`, `GLOSSARY.md`, ADRs, landing report |
| Judge independence | Anthropic multi-agent research | `qa` / `qa-look` split; separate debate seats |
