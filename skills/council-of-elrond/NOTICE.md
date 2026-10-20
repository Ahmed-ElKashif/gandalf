# NOTICE

## Vendored engine (MIT)

`scripts/config.mjs`, `scripts/discover.mjs`, `scripts/implementers.mjs`, and
`scripts/lane.mjs` are **unmodified copies** from **delegate-setup v0.5.0** in
[`amElnagdy/delegate-skills`](https://github.com/amElnagdy/delegate-skills),
vendored on 2026-10-18 so this skill can cast a fleet with nothing else
installed.

They remain under the upstream MIT license:

```
MIT License

Copyright (c) 2026 Ahmed Mohammed (amElnagdy)

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## Patches to upstream skills

`patches/` carries unified diffs against three installed skills:

- **`agy-delegate`** and **`debate-review`** — MIT, Copyright (c) 2026 Ahmed Mohammed
  (amElnagdy), from
  [`amElnagdy/delegate-skills`](https://github.com/amElnagdy/delegate-skills) and
  [`amElnagdy/review-skills`](https://github.com/amElnagdy/review-skills). The patches
  are derivative works under the same MIT license; the full text is reproduced above.
- **`ui-review-loop`** — Apache-2.0, from
  [`amElnagdy/ui-review-loop`](https://github.com/amElnagdy/ui-review-loop). The patch
  **modifies** that work and remains under Apache-2.0. The license text ships with the
  upstream repository:
  <https://github.com/amElnagdy/ui-review-loop/blob/main/LICENSE>.

Each patch file names the upstream commit it was generated against. They exist to keep
an installed copy correct across reinstalls, not to fork it. If upstream takes a fix,
delete the entry.

To refresh the vendored engine after an upstream release, see `scripts/README.md`. To
update a patch, see `patches/README.md`.
