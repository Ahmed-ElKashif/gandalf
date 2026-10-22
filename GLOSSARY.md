# gandalf

The language of a delegation fleet that ships its own design system, its own
evidence machinery, and the loop that connects them. Each term below names an
artefact, an owner, or a seat — keep them distinct: the confusion between the
first two is what mis-routes work.

## The artefacts

**Design system**:
The normative token document (`DESIGN.md`) a project commits to — colours, type,
spacing, components, layout grammar, and the prohibitions that keep it coherent.
Owned by the design-system station; it changes when the document drifts, never
as a reaction to one page.
_Avoid_: theme, style guide, palette file

**Interface**:
The built, rendered surface that the design system governs — pages, screens,
components as they actually render. Owned by the interface station. A design
system describes it; it is not part of the design system.
_Avoid_: the design, the UI (ambiguous with the lane), the page (one kind of interface)

**Behaviour evidence**:
Asserted proof that an interface works — tool calls, the DOM timeline, and the
network HAR — never pixels alone. Produced by an evidence round and cited with
its stream and artifact.
_Avoid_: screenshot proof, smoke test, visual check

**Appearance verdict**:
A judgement of how the rendered result matches the design system, citing the
artifact it came from and the rule it broke. Advisory by definition: it can
never overturn behaviour evidence.
_Avoid_: design review, taste check

## Who owns what

**Station**:
A first-party skill that owns one craft and is useful without the fleet — a
procedure, a deliverable, and its own references that work with nothing else
installed. The station's own references are the floor; the packs it may load
are the ceiling.
_Avoid_: role (that is a lane), tool

**Lane**:
A seat in the fleet that walks or judges, addressed by its wire name and cast
onto an implementer and model. A lane *walks*; a station is the *method* it
carries.
_Avoid_: role (ambiguous), seat (the casting, not the craft)

**Engine**:
The evidence machinery a verification station drives — WebMCP tool calls, the
DOM timeline, the network HAR, and the appearance pass that runs as one
deliberate step.
_Avoid_: tool, skill (too broad)

**Factory**:
The loop that connects the stations: intake, plan debate, dispatch, gates,
review debate, landing report. It never writes the work and never commits.
_Avoid_: pipeline, workflow

## The mechanics

**Preflight**:
The self-check a code-writing station runs before reporting — the Ponytail
ladder on the solution, then the guards on the diff, then the real command
output pasted as evidence. Always a floor for the verdict, never the verdict
itself: a station never certifies its own work.
_Avoid_: gate, review

**Wire name**:
The fixed machine name a lane is addressed by everywhere the machinery looks —
config, relays, judges. Renaming one is a breaking change to the cast.
_Avoid_: model name, member

**Lane block**:
The single source of truth for a lane's standing rules, carried inside its
station and generated into the file the dispatcher injects. Editing the
generated file means the station failed.
_Avoid_: preamble (that is the generated file), role prompt
