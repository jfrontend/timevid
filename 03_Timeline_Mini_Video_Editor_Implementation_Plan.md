# Timeline / Mini Video Editor — Detailed Project Brief & Implementation Plan

## 1. Project Overview

Build a compact but polished **multi-track timeline editor** for arranging clips across several tracks.

The clean project should behave like a believable lightweight video/audio timeline rather than a static drag demo. Its architecture must preserve meaningful differences between:

- canonical clip time
- rendered pixel position
- timeline zoom scale
- track ownership
- clip grouping
- snapping
- hidden/locked track state
- undo/redo history

The later benchmark bug should come from disagreement between these representations after a sequence of interactions, not from an obviously broken formula or artificial sabotage.

---

## 2. Primary Goals

The clean project should let users:

1. Arrange clips across multiple tracks.
2. Drag clips horizontally and between valid tracks.
3. Resize clips from either edge.
4. Zoom the timeline in and out.
5. Scrub or move a playhead.
6. Snap clips to useful boundaries.
7. Group multiple clips.
8. Hide or lock tracks.
9. Use ripple movement where enabled.
10. Multi-select clips.
11. Undo and redo meaningful timeline operations.
12. Inspect clip start, end, and duration values.

The project should remain compact enough to build and verify quickly, but contain enough state interaction to support a non-trivial, sequence-dependent bug.

---

## 3. Suggested Technical Scope

Recommended stack:

- React
- TypeScript
- Vite
- Zustand or a clear reducer/store architecture
- CSS/Tailwind for editor styling
- Pointer events for drag/resize interactions

Do not add:

- real video encoding
- uploads
- backend persistence
- authentication
- collaboration
- unrelated editing features

### Deterministic starter timeline

Use a fixed project such as:

```text
Video 1:  [Intro][Interview--------][B-roll---]
Video 2:          [Overlay---]
Audio 1:  [Music--------------------------]
Audio 2:              [Voice--------]
```

Provide clips with known start/end times so all reproduction paths can be repeated exactly.

---

## 4. Core UI Layout

### Top Toolbar

Include:

- project title
- undo
- redo
- timeline zoom control
- snap toggle
- ripple toggle
- optional reset view / fit timeline

### Track Controls

Each track should expose:

- track name
- hide/show
- lock/unlock
- optional type icon
- clear selected/active state

### Timeline Canvas

Include:

- time ruler
- playhead
- multiple tracks
- draggable clips
- resize handles
- snapping guides
- clip grouping indication
- multi-selection treatment
- visible empty timeline space for dragging

### Right Inspector

For a selected clip show:

- clip name
- track
- start
- end
- duration
- grouped state
- optional color/category metadata

For multiple selected clips, show a concise multi-selection summary instead of pretending one clip is selected.

---

## 5. State & Architecture Requirements

### Canonical time

Clip timing must be stored in canonical timeline units such as seconds or milliseconds.

Do not treat rendered x-coordinates as the source of truth.

Each clip should meaningfully represent:

- stable ID
- name
- track ID
- start time
- duration or end time
- group ID when applicable
- optional clip type/metadata

### Pixel/time mapping

Rendered position should be derived from:

- canonical time
- timeline origin/scroll
- zoom scale

The architecture must make it possible for:

- `time -> pixel`
- `pixel -> time`

to be used intentionally during interaction.

### Track ownership

Track assignment must be separate from clip timing.

Moving a clip vertically between tracks should not silently change its time unless intended by the interaction.

### Group state

Grouped clips should preserve:

- stable member relationships
- relative offsets
- correct movement under zoom changes
- predictable behavior when one relevant track is hidden

### Snap state

Snapping should be derived from timeline semantics rather than permanent pixel values.

Potential snap targets:

- playhead
- clip start/end
- timeline ruler increments
- nearby grouped clips

### History

Undo/redo should restore enough state to reproduce the same rendered result, including relevant:

- canonical times
- track ownership
- clip grouping
- visibility/lock-dependent operations
- selection when appropriate

---

## 6. UI Quality Requirements

### Layout, alignment, and spacing

- Track headers and timeline rows must remain horizontally aligned.
- Clip blocks must stay inside their correct tracks.
- Resize handles must not overlap clip labels.
- Time ruler divisions should align with the timeline content.
- Inspector fields should use consistent spacing and label/value alignment.
- Avoid accidental page-level horizontal overflow.
- Long timelines should scroll inside the editor rather than pushing side panels away.

### Typography and visual hierarchy

- Use one clean UI font stack.
- Differentiate track labels, clip labels, ruler labels, inspector labels, and metadata.
- Clip names must remain readable where space permits.
- Small clips should truncate labels gracefully.
- Time values should use consistent formatting.

### Colors and component styling

Use a coherent editing UI system with clearly distinguishable states for:

- selected clip
- grouped clip
- locked track
- hidden track
- snap guide
- active ripple mode
- active snap mode
- disabled toolbar action
- resize hover/active state
- multi-selection

Use consistent borders, radii, backgrounds, and control sizes.

### Images, icons, and visual assets

Include consistent icons for:

- play
- undo
- redo
- zoom
- snap
- ripple
- hide/show
- lock/unlock
- group/ungroup

Timeline visuals such as:

- playhead
- resize handles
- snap guides
- track separators
- group indicators

must remain crisp, aligned, and visually consistent.

---

## 7. Responsive & Adaptive Behavior

This project is desktop-first.

### Primary evaluation viewport

Target approximately:

- `1440 × 900`

### Secondary viewport

Validate approximately:

- `1024 × 768`

Expected adaptive behavior:

- inspector may narrow or scroll internally
- track headers remain aligned with track rows
- toolbar controls must not overlap
- timeline viewport remains usable
- resize handles must remain reachable
- horizontal timeline scrolling remains contained
- zoom control remains accessible

A dedicated mobile editor is not required.

---

## 8. Interaction & State Requirements

The clean version must support these flows reliably.

### Clip drag

- drag clip horizontally
- canonical start time updates
- rendered position follows pointer
- inspector updates

### Clip resize

- resize left edge
- resize right edge
- enforce sensible minimum duration
- update start/end/duration correctly

### Zoom

- change timeline scale
- clips remain at the same canonical times
- playhead remains semantically correct
- snapping continues to target timeline time rather than stale pixels

### Snapping

- drag near a valid snap target
- show a visible snap guide
- place clip at the correct canonical time

### Grouping

- multi-select clips
- group them
- drag the group
- preserve relative offsets

### Track hide / lock

- hidden track content is not shown
- locked track content cannot be modified
- hiding a related track must not corrupt clip timing/group state

### Ripple movement

When enabled, moving a clip should shift the intended later clips according to a clear rule.

When disabled, the same drag should affect only the selected clip/group.

### Undo / Redo

At minimum verify:

- drag
- resize
- grouped movement
- ripple move
- track reassignment where supported

---

## 9. Accessibility & Usability

Required baseline:

- semantic toolbar buttons
- accessible labels for icon-only controls
- visible keyboard focus
- readable contrast
- disabled state for unavailable actions
- labeled inspector inputs
- clear locked/hidden states beyond color alone
- predictable numeric/time input behavior

Resize handles should have enough visual/pointer area to be usable without requiring pixel-perfect mouse placement.

---

# 10. Bug Injection Specification

## Objective

After the clean project is complete and validated, inject **one advanced defect involving time-space conversion plus a later state transition**.

Preferred defect family:

> A drag/resize operation looks correct at the current zoom level, but canonical timing, grouped offsets, or history stores information derived from rendered pixel assumptions. A later zoom, hidden-track transition, ripple operation, or undo exposes the inconsistency.

The exact source-level defect must be selected only after inspecting the actual clean architecture.

---

## 11. Required Bug Complexity

The complete fix should require reasoning across at least:

**pixel/time mapping + clip/group state + history/hidden/ripple behavior**

Prefer a defect crossing four or more systems:

- canonical time
- rendered pixels
- zoom
- grouping
- track ownership
- snapping
- hidden/locked track state
- ripple behavior
- history

### Reject the candidate if the complete fix is only:

- one rounding change
- one snap threshold
- one timestamp conversion
- one pixel/time multiplier
- one boundary clamp
- one isolated resize-handler edit

The bug should admit a believable **partial fix** that solves the first symptom but leaves a second meaningful flow broken.

---

# 12. Recommended Failure Design

## Primary Failure

Example sequence:

1. Start from the deterministic default timeline.
2. Zoom the timeline to approximately `150%`.
3. Group two clips with a known relative offset.
4. Drag the group to a new location.
5. Change zoom back to `100%`.
6. Inspect clip positions and timing values.

### Incorrect behavior

The grouped clips looked correct immediately after dragging, but after zoom changes one clip shifts relative to the other, or its inspector start/end values no longer match the visible timeline position.

### Expected behavior

Changing zoom must only change rendering scale. Canonical clip times and group-relative timing must remain unchanged.

---

## Alternate / Secondary Failure

Use a different sequence exercising the same invariant.

Example:

1. Start clean.
2. Group clips across two tracks.
3. Hide one participating track.
4. Move the visible grouped clip or perform a ripple move.
5. Unhide the track.
6. Undo the movement.

### Incorrect behavior

The previously hidden clip returns at the wrong relative offset, or undo restores one clip using stale pixel-derived timing while the other returns correctly.

### Expected behavior

Hidden state must not change the canonical timing relationship of grouped clips, and undo must restore the same visible arrangement that existed before the edit.

This alternate path must still be capable of failing after the obvious local repair to the primary zoom symptom.

---

## Known-Good Control

Example:

1. Keep a clip ungrouped.
2. Leave zoom at `100%`.
3. Drag the clip to a new time.
4. Resize its right edge.
5. Undo and redo.

Expected:

- visible position matches inspector timing
- duration remains correct
- history restores the same placement
- no drift occurs

This confirms that normal timeline editing remains functional.

---

# 13. Bug Injection Rules

Before injecting the defect:

1. Inspect the actual clean architecture.
2. Trace drag from pointer position → pixel delta → canonical time update.
3. Trace resize conversion separately.
4. Trace how grouped relative offsets are stored.
5. Trace hidden/locked track behavior.
6. Trace ripple calculations.
7. Trace history snapshot/restoration.
8. Identify multiple plausible failure surfaces.
9. Identify the obvious naive fix for each candidate.
10. Reject any bug where one local edit solves all paths.

Do not use artificial sabotage such as:

```ts
if (zoom === 1.5) {
  clip.start += 2
}
```

Also avoid:

- random failures
- artificial delays
- fake race conditions
- unexplained magic offsets
- deliberately unreadable code
- branches whose only purpose is to create the benchmark failure

The source should remain production-plausible.

---

# 14. Coverage of the 10 UI Evaluation Areas

| Evaluation Area | What This Project Should Expose |
|---|---|
| **1. Understanding the UI request and screenshot** | The affected clips, track, zoom state, playhead, and expected relative timing should be visually clear. |
| **2. Layout, alignment, and spacing** | Track rows, ruler alignment, clip bounds, resize handles, inspector spacing, and toolbar layout remain inspectable. |
| **3. Typography and visual hierarchy** | Clip names, track labels, ruler ticks, time values, and inspector labels must remain readable and consistent. |
| **4. Colors and component styling** | Selection, grouping, lock/hide, snap, ripple, disabled actions, borders, and handles must preserve the design system. |
| **5. Images, icons, and visual assets** | Toolbar icons, playhead, snap guides, resize handles, group indicators, and track controls provide concrete visual evidence. |
| **6. Responsive and adaptive behavior** | Validate the same timeline at primary and narrower desktop viewports without row misalignment or unusable controls. |
| **7. UI interactions and state behavior** | Drag, resize, zoom, snapping, grouping, hiding, locking, ripple, selection, and undo/redo are directly testable. |
| **8. Accessibility and usability** | Focus state, labels, readable contrast, lock/hidden semantics, disabled controls, and usable resize targets must survive the fix. |
| **9. UI fix completeness and regression avoidance** | Primary + alternate + known-good flows make one-path pixel/time fixes easy to detect. |
| **10. Rendered verification and visual evidence** | Capture comparable before/after screenshots and rerun the exact interaction sequences after each model patch. |

The benchmark should provide enough evidence to judge all ten dimensions rather than reducing evaluation to “the clip seems to be in roughly the right spot.”

---

# 15. Clean Baseline Validation

Before bug injection, verify:

- normal clip drag
- left/right resize
- timeline zoom
- playhead movement
- snapping
- clip grouping
- group movement
- hide/show track
- lock/unlock track
- ripple enabled/disabled behavior
- multi-select
- undo/redo
- inspector synchronization
- primary viewport layout
- secondary viewport layout
- focus/disabled states

Do not inject the defect until this baseline is stable.

---

# 16. Required Local Evaluation Files

After the final defect is implemented, create:

## `BUG_REPRODUCTION.md`

Include:

- Primary Failure
- Alternate / Secondary Failure
- Known-Good Control
- Manual Reset Instructions
- exact zoom/time/track settings where useful
- recommended screenshot moment
- recommended screenshot filename

It may describe user-visible behavior but must not reveal the source-level cause or solution.

Add it to:

```text
.git/info/exclude
```

Do not add it to `.gitignore`.

## `FIX_PROMPT.txt`

Include only:

- product context
- observable defect
- reproduction steps
- expected behavior
- alternate behavior
- requirement to preserve existing working flows

Do not reveal:

- filenames
- function names
- internal state names
- architecture details
- formulas
- code location
- root cause
- naive fix
- intended fix

Also add it to `.git/info/exclude`.

---

# 17. Verification Evidence

Recommended artifacts for the eventual Astra vs Gemini comparison:

- `primary_before.png`
- `primary_after_astra.png`
- `primary_after_gemini.png`
- `alternate_after_astra.png`
- `alternate_after_gemini.png`
- `known_good_control.png`

Use the same:

- timeline data
- viewport dimensions
- zoom value
- reproduction sequence
- track visibility state
- selected clips

Manual verification should check:

- visible clip placement
- inspector start/end/duration
- group-relative offsets
- snap behavior
- hidden track restoration
- ripple result
- undo/redo
- known-good control
- layout regressions

---

# 18. Definition of Done

The project is ready for model evaluation only when:

- the clean timeline editor is coherent and polished
- all required interactions work before injection
- the primary failure is deterministic
- the alternate failure exercises the same deeper invariant through a different state transition
- the known-good control still passes
- the defect is visible through normal UI behavior
- no trivial local fix obviously resolves every path
- the app remains generally usable
- all 10 evaluation areas have concrete evidence
- `BUG_REPRODUCTION.md` accurately matches actual behavior
- `FIX_PROMPT.txt` does not leak implementation details
- both helper files remain untracked

The task should reward reasoning about canonical time, rendered geometry, grouping, hidden state, ripple behavior, and history together, rather than rewarding a heroic one-line multiplication fix that happens to make one screenshot look less cursed.
