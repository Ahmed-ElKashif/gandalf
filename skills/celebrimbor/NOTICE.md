# NOTICE

## Vendored research dataset (MIT)

`assets/taste/` is a **trimmed subset** of the taste library from
[`Leonxlnx/taste-skill`](https://github.com/Leonxlnx/taste-skill) — a study
of 247 curated sites (One Page Love, Awwwards Sites of the Day), vendored on
2026-10-22.

Kept: every decision-bearing field — the direction ideas and compositions, the
palette hex values, the type families and their size steps, the measured
section blueprints, the app styles, shells, patterns and kinds.

Dropped: the provenance blobs (`seenIn`, `links`, the font `<link>` snippets)
and the files a design system never reads — `sites.json` (an index of studied
sites), `photos.json`, `heroes.json`, `motions.json`. No file was rewritten;
only fields were removed.

The upstream work remains under the MIT license:

```
MIT License

Copyright (c) 2026 Leonxlnx

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

## The format

The DESIGN.md format this skill writes follows the specification in
[`google-labs-code/design.md`](https://github.com/google-labs-code/design.md)
(Apache-2.0). The format is used, not copied: `references/design-md-format.md`
distils the specification's rules, and the validation scripts implement the
shape checks it describes.

## Everything else

The rest of this skill — `SKILL.md`, `references/`, `scripts/`, and
`assets/starter-kit.json` — is original work, MIT, same licence as the
repository.
