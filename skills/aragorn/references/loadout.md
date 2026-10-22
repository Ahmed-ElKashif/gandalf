# Loadout — the stack packs, and the one pack loaded by skill

Your own references are the floor; the packs below are the ceiling. Load **only
what this task's stack needs** — a belt you load everything into is its own
failure mode.

## The stacks

| Stack | Command | Ships |
|---|---|---|
| Supabase / Postgres | `npx skills add supabase/agent-skills -g -y` | `supabase`, Postgres best practices |
| Prisma | `npx skills add prisma/skills -g -y` | the Prisma workflow |
| MongoDB | `npx skills add mongodb/agent-skills -g -y` | `mongodb-schema-design`, `mongodb-query-optimizer` |
| NestJS | `npx skills add kadajett/agent-nestjs-skills -g -y` | `nestjs-best-practices` |
| LangChain / LangGraph | `npx skills add langchain-ai/langchain-skills -g -y` | the TS quickstarts, RAG |
| TypeScript types | `npx skills add wshobson/agents -g -y -s typescript-advanced-types` | **the only skill from this pack** — `nextjs-app-router-patterns` and `tailwind-design-system` in it are interface skills; `shadcn-ui/ui` is the `ui` lane's pack |
| Discipline pair | `npx skills add obra/superpowers -g -y -s systematic-debugging verification-before-completion` | for when things break mid-task, and before claiming done |

## The one pack loaded by skill

`wshobson/agents` legitimately carries skills for several lanes; you load one
skill from it, by name, and nothing else. Its UI skills sitting in the same
pack does not make the interface yours — "installed" is not "in your belt".
That is the whole point of the split: a shared pack, every lane taking the
skills that are its.

## Independence

- No packs installed → the floor still holds: the seam rule, the
  expand/contract discipline, the contract as a deliverable, the states. Say
  which packs were absent when you report.
- The guards, Ponytail and other discipline skills are **shared town goods** —
  they ride inside your preflight (`references/preflight.md`), and the
  orchestrator re-runs them on the diff; you never own their verdict.
