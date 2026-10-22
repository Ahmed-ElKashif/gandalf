# Feature — the seam, the API craft, the contract

## Find the seam before writing anything

Split every deliverable in the brief by the functional rule:

| Work | Whose |
|---|---|
| Route handlers, server functions, resolvers, jobs | **yours** |
| Data model, schema, migrations, seeds | **yours** |
| Auth logic: sessions, tokens, hashing, permission checks | **yours** |
| Integrations, webhooks, queues, cron | **yours** |
| Pages, components, stylesheets, layout | **`galadriel`'s** |
| Auth *screens* (login, signup) | **`galadriel`'s** |
| Copy, photographs, states rendering | **`galadriel`'s** |
| Both halves in one file | **split the file** — it is a seam |

Report the seam as part of the plan for the brief: what you will build, what
she must build. A full-stack task is two lanes by construction — the hand-off
cost is the price of the two standards not becoming one blended standard.

## The API craft

- **Validation lives where the data enters** — the handler, not the form. A
  client-side check is presentation; the server decides what is true.
- **Permissions live where the data leaves** — every route answers "may this
  caller see this?" itself. Middleware is a default, never a guarantee: an
  unprotected route is a defect even behind middleware.
- **Real status codes, one error envelope.** `400` with a message, `401` for
  unauthenticated, `403` for unauthorized, `404` for absent, `409` for
  conflicts, `500` only when it is yours. An error the consumer cannot
  distinguish from a bug is a defect.
- **Never trust the client.** IDs in URLs, roles in bodies, prices on forms —
  all propositions to verify against the model.
- **The smallest diff that fully solves the task** — read the surrounding
  routes first and match their conventions; a second style inside one API is
  its own defect.

## The contract is a deliverable

The interface station builds against you *through a file*, not through a chat
memory. Deliver it:

- The typed routes/clients — request and response shapes, in the project's
  language (a types file, a generated client, or a routes module).
- The **API-state inventory** — every state your API can hand her page:
  empty result, the error envelope, `401`, rate limit, long-running. One line
  each: what the response carries and what it means on the page. The full
  shape is `references/handoff.md`.
- The run notes: env vars, migrate/seed commands, the dev URL.

## Evidence

Paste the real thing, not a summary: the `curl` (or `httpie`) output per
behaviour, the migration output, the seeded row counts, the test output. A
claim without output is a rumour — same rule as everywhere else in the fleet.
