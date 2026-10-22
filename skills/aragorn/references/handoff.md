# Hand-off — the contract with the interface station

She builds markup against what you deliver. Deliver it as **files and lines**,
not as a conversation:

## What she receives

1. **The contract file** — typed routes/clients: request and response shapes,
   methods, paths. A page component that imports shapes from your file is the
   seam working; one that hand-writes a type is a defect to fix.
2. **The API-state inventory** — the list of states your API can produce, one
   line each. She carries four states (empty, loading, error, long content);
   your inventory is where hers comes from:

   | API state | What you declare |
   |---|---|
   | empty | "returns `[]` for new accounts" |
   | error | "every error is `400` + `{message}` in one envelope" |
   | auth | "`401` when unauthenticated; `403` for others' records" |
   | rate limit | "`429` with `Retry-After`" |
   | long content | "list endpoints return max 100, paginated" |

3. **Run notes** — env vars, the migrate/seed commands, the dev URL, and any
   flag that changes behaviour locally.

## What she does not receive from you

- No markup, no component, no style — even "just a table to test with" is a
  rendered surface, and a temporary one becomes her problem.
- No WebMCP tool file: that is her duty (it is gated to the page, not the
  server). Your duty is the other half: keep the API callable in test/dev, so
  the tools her page registers can actually work.

## The seams that bounce

- A UI defect that is really a data defect (the wrong count, a missing
  permission) bounces **to you** — fix the server half, not her workaround.
- A server defect that is really a rendering defect (the field exists, the
  page never shows it) bounces **to her** — fix the markup, not the schema.
- The one finding that belongs to neither: a misunderstanding of the brief.
  Escalate to the orchestrator rather than letting the API grow a field no
  page models.

## Where this breaks

A monolith PR where one lane writes both halves is where the two-standard
failure lives. If the orchestrator hands you a brief with markup in it, name
the seam in your first reply and build your half — the markup half needs a
`galadriel` dispatch (or an operator decision to skip the design system, which
is the operator's to make, not yours to shrug into).
