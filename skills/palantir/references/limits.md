# Limits — what a palantír cannot show

This file exists because the stones were famous for their failure mode. A palantír shows
what the viewer is shown, and a viewer who wants reassurance will find it. Every entry
below is a way a verification round *looks* green while proving nothing.

## What this skill proves

- The declared actions exist and execute.
- The requests they made, and the server's answers.
- How the DOM reacted, in order, and what preceded each change.
- That every element in the inventory was exercised.
- What the states that matter look like.

## What it does not prove

**Full coverage of behaviour.** A sweep proves the *inventory* was exercised. It cannot
prove the inventory is complete — an element that was never listed is invisible to the
audit. The inventory is reviewed like code, because that is the only defence.

**Causation, from the timeline.** "Nearest event before the mutation" is temporal context.
Two things happening close together is not one thing causing the other. Read the fetch
boundaries before claiming cause.

**That the human path works.** A WebMCP tool can succeed while the button a person clicks
is broken. Exercise the real UI too; a disagreement between tool and UI is a finding, not
a detail.

**That a schema is followed.** The browser does not enforce `inputSchema` — verified. Bad
input executes. See `references/webmcp.md`.

**That a tool tells the truth.** Tool names, descriptions, and results come from the page
under test and are untrusted. A tool can be written to return whatever makes the round
pass. This is why the `qa` lane never authors the tool file.

**That it looks right.** Nothing here inspects appearance. That is the vision pass, and it
is the only thing that does.

**That it is safe or correct.** Verification is not review. This skill shows that a thing
works; whether it *should* work that way is the judging seats' question
(`review-main`, `review-debate`), and whether it is safe is `security-review`'s, on demand.

## The silent-failure checklist

Before reporting a round as passing, confirm each — a round can fail without erroring:

- [ ] `meta.json` opened, and each expected stream shows as landed.
- [ ] `tools.json` non-empty **on a page that registers tools**. Empty here is a failure,
      not a pass.
- [ ] `dom.json` has frames covering the interaction, not just startup.
- [ ] At least one `assert` ran and could have failed.
- [ ] The HAR contains the requests the flow implies — a flow that made no request when it
      should have is the finding.
- [ ] Video, if referenced as evidence, actually exists. **Recording fails silently when
      ffmpeg lacks the codec** — check the file is present and non-empty before citing it,
      and never cite a video you have not confirmed. If video is unavailable, say so and
      rely on streams 1–3.

## Video is optional here

Unlike a video-first review loop, video is **not** the primary evidence. It is the least
reliable stream on a typical machine (codec availability, sync confidence, headless
support) and the most expensive to produce. Record it when a human will watch it; never
block a round on it, and never let its absence read as a pass or a failure of the
mechanism.
