# Formats — the round package, and where it lives

Everything a round produces lands in one directory. Nothing is written anywhere else,
nothing is uploaded, and the directory is gitignored on first use.

## `.agent-review/`

Created next to the project under test (`PALANTIR_PROJECT`, else the working directory).
`round.mjs` adds `.agent-review/` to that project's `.gitignore` the first time it runs,
because a round package contains whatever the page showed — including ordinary form
values — and that is not something to commit.

```
.agent-review/
  .active.json                 the in-flight round, while one is open
  <roundId>/
    meta.json                  round metadata + per-stream status + counts
    dom.json                   the consolidated DOM timeline (frames)
    network.har                the session's requests and responses
    tools.json                 every WebMCP call: command, raw result, outcome
    look/<state>.png           the vision-pass screenshots, one per named state
    video.webm                 ONLY if video was requested AND it actually landed
    verdict.json               your assertions and their outcomes
```

`<roundId>` is `YYYYMMDDTHHMMSSZ-<6 hex>`, UTC — sortable, and unique enough that two
rounds in the same second do not collide.

## `meta.json` — the honesty record

This is the file to open **before** believing anything else. It is written by `stop`, and
it records what actually happened rather than what was attempted:

```json
{
  "id": "20261020T035700Z-8c10a2",
  "url": "http://localhost:4401/?qa=1&record_dom=1",
  "summary": "human path: fill+submit creates a row",
  "startedAt": "…", "stoppedAt": "…",
  "streams": { "tools": false, "dom": true, "har": true, "video": false },
  "counts":  { "tools": 0, "frames": 26 },
  "pageHasTools": true,
  "notes": [],
  "failed": false
}
```

| Field | Read it as |
|---|---|
| `streams.dom` | the timeline landed. `false` means there is no `why` in this package |
| `streams.tools` | at least one WebMCP call was recorded |
| `streams.har` | requests were captured |
| `pageHasTools` | the page *registers* tools, regardless of whether you called any |
| `counts.frames` / `counts.tools` | the sizes behind those booleans |
| `notes` | why a stream is missing — the reason, not just the fact |
| `failed` | **the round is not usable as evidence.** Do not summarise it as a pass |

`pageHasTools: true` with `streams.tools: false` is a specific, important state: the page
offered a surface you did not use. The runner prints a warning for it. It is not
automatically a failure — a round may legitimately exercise only the human path — but it
must be *stated* in the report, never silently dropped.

## `dom.json`

An array of frames, oldest first. Frame shapes (`kind`):

| `kind` | Carries |
|---|---|
| `boot` | `url`, `title` — the recorder started |
| `mutation` | `trigger` (nearest event), `summary` (`added`/`removed`/`attrs`/`count`), `text`, `values` |
| `fetch:start` | `method`, `url`, `trigger` |
| `fetch:end` | `status`, `url`, `dt` (ms) |
| `fetch:error` | `error`, `url`, `dt` |
| `tool:change` | `tools` — the page's WebMCP registrations at that moment |

`tool:change` sitting in the **same** timeline as mutations is the point of this skill: a
video-first loop cannot see tool registration at all.

`trigger` is temporal context, never proof of causation. See `references/limits.md`.

## `tools.json`

One entry per `webmcp` command the runner wrapped:

```json
[{
  "at": "…",
  "command": "invoke create-item --params '{\"text\":\"milk\"}'",
  "raw": "…the CLI's own output, capped at 20 KB…",
  "invocationId": "F4E5B40EADB1FFFEF292403F75CE1801",
  "outcome": "ok"
}]
```

`raw` is what the CLI printed, verbatim. It is the ground truth when a structured field
looks wrong — read it before disputing a result. `outcome` is `ok` / `error` / `unknown`;
`unknown` means the output matched neither shape, which is itself worth a look.

## `verdict.json`

Appended to by every `assert`, so several assertions in one round all land here:

```json
{ "round": "…", "assertions": [ { "at": "…", "results": [
  { "check": "result contains", "expect": "milk", "ok": true },
  { "check": "har", "expect": "POST /api/items 201", "ok": true },
  { "check": "dom mutation frames", "expect": ">0", "ok": true, "got": 26 }
] } ] }
```

A round with an empty `assertions` array has **proved nothing** — it records that
commands ran, not that anything was verified.

## Extending the runner

`scripts/round.mjs` is dependency-free and deliberately small. If you add a command,
keep these three properties, which are what make its output trustworthy:

1. **Record the landing, not the intent.** A stream is `true` only when an artifact
   exists and is non-empty. Never set a flag because a command was issued.
2. **Fail loudly.** A round with no timeline and no tool call exits nonzero and says
   `FAILED`. Do not soften this to keep a pipeline green.
3. **Drain before the action.** Timeline frames are attributed to what follows a
   command, so the buffer is drained *before* each wrapped command. A wrapped
   `eval "window.__rec.dumpCompact()"` therefore sees an empty buffer by construction —
   read `dom.json` after `stop`, or inspect before `start`.

Anything that shells out to `agent-browser` must pass argv directly (`shell: false`),
never through a shell: on Windows a shell re-parses arguments, silently dropping the
second `&`-separated URL parameter and reporting the shell's exit code instead of the
tool's.
