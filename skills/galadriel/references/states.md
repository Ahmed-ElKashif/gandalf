# States — declared before they are needed

## The four states

Every surface you build carries four states, declared before you build, not
discovered after:

| State | What it must render |
|---|---|
| **Empty** | what a first-run user sees, with the action that fills it |
| **Loading** | the skeleton or progress state, at true size |
| **Error** | what broke and what the user can do about it |
| **Long content** | a real worst case: a long name, a long email, many items, zero items |

Declare them in the report — one line each, with where they render. The
appearance station reviews *the states you declared*; one you did not declare
does not get judged, so an undeclared state is your gap, not its blind spot.

The long-content state is where layouts actually break. Do not fake it with
three identical rows.

## The WebMCP tool file — yours, and only yours

You provide the gated tool file the `qa` round consumes: `qa/tools.ts` or
`tools.webmcp.ts`, registered only in test/dev. Shape and examples:
`palantir`'s `references/webmcp.md`.

- **You author it; `qa` never does.** A checker that can write the thing it
  checks can write it to pass — that is the whole reason the duty sits here.
- **The tools must register real behaviour.** A tool that returns a constant is
  worse than no tool: it proves the round was theatre.
- **A tool the page does not register is a bounce to you.** If `qa` needs an
  action and none exists, it bounces back with the need as the brief; you add
  the tool, not the checker.
- **The file is gated.** Shipping a test-only tool file to production is a
  defect; check the gate before you report.

The browser does not enforce a tool's `inputSchema` — verified: a tool
declaring a number accepted a string and executed anyway. So validate inside
the tool: a tool that passes bad input through has just proved a missing guard,
and that finding is yours to fix, not `qa`'s to report as yours.
