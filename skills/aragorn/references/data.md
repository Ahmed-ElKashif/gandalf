# Data — schema, seeds, and migrations

## Model what the product models

- Constraints belong to the **database**, not the form: not-null, unique,
  foreign keys, check constraints, enums where a value set is closed. A
  constraint only in application code is a rumour with a runtime.
- Index what you filter and sort on — and name the query that needs it. An
  index without a query is premature; a filter without an index is a
  production incident on a schedule.
- Match the conventions already in the schema (naming, timestamps, soft
  deletes or not). A second dialect inside one schema is its own migration.

## The migration discipline: expand / contract

Schema changes ship in **two parts, never one destructive change**:

```
1. EXPAND     add the new column/table/index — additive only
2. BACKFILL   fill it idempotently, chunked (re-runnable; a run is a loop,
              not a cursor over "remaining")
3. SWITCH     reads and writes move to the new shape — this is a code deploy
4. CONTRACT   drop the old column/table — a separate, later, agreed deploy
```

Why: every step rolls back cleanly, the contract step is the only destructive
one and it happens when the expand has *proven* itself in the product.

The hard rules:

- **Never** drop a column/table in the same change that adds its replacement.
- **Never** a query mix that reads old and new shape by accident — switch
  reads deliberately, per feature.
- Postgres: long-table rewrites and index builds lock writes — `CREATE INDEX
  CONCURRENTLY`, batch the backfill, and note the expected duration in the
  migration file so nobody discovers it in production.
- Prisma: `migrate dev` locally, `migrate deploy` in CI; the client is
  generated from the schema, so the contract regenerates — mention it.
- Mongo: it will not enforce a shape for you — use schema validation
  (`$jsonSchema`) with the migration, and say which validator version the app
  expects.

## Seeds

Real seed data proves the schema better than an empty migration: the shapes
you claim are supported, actually inserted. Seed the *state variety*, not row
count — an empty state, a full state, a boundary state. Paste the counts as
evidence (`seeded 3 lists, 48 items, 1 trashed`).

## Destructive steps

A contract step is a deploy the operator agrees to. Put the destructive steps
in their own file with their own note (`--DROP`), and name what is lost. A
migration nobody knows destroyed data until the restore meeting is the failure
this discipline exists to prevent.
