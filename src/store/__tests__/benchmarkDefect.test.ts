import { describe, it, expect, beforeEach } from 'vitest';
import { useTimelineStore } from '../timelineStore';
import { timeToPixel } from '../../utils/time';

describe('Benchmark Defect Verification', () => {
  beforeEach(() => {
    useTimelineStore.getState().resetProject();
  });

  it('Primary Failure: zooming to 150%, grouping, dragging, then zooming to 100% causes shift/inconsistency', () => {
    const store = useTimelineStore.getState();

    // 1. Start from deterministic default timeline
    const intro = store.clips.find((c) => c.name === 'Intro')!; // 0s
    const interview = store.clips.find((c) => c.name === 'Interview')!; // 4s
    expect(interview.start - intro.start).toBe(4);

    // 2. Zoom timeline to 150% (1.5)
    store.setZoom(1.5);
    expect(useTimelineStore.getState().zoom).toBe(1.5);

    // 3. Group two clips with known relative offset (4s offset)
    store.setSelectedClipIds([intro.id, interview.id]);
    store.groupSelectedClips();

    // 4. Drag the group to a new location (+120px at zoom 1.5 -> +2.0 seconds)
    store.startDrag('move', intro.id, 100, 50, intro.trackId);
    store.updateDrag(220, 50);
    store.endDrag();

    const afterDragClips = useTimelineStore.getState().clips;
    const movedIntro = afterDragClips.find((c) => c.id === intro.id)!;
    const movedInterview = afterDragClips.find((c) => c.id === interview.id)!;

    // At zoom 1.5: intro is at 2.0s, interview is at 6.0s
    expect(movedIntro.start).toBe(2);
    expect(movedInterview.start).toBe(6);

    // Rendered positions immediately after dragging at 1.5 zoom:
    const grp = useTimelineStore.getState().groupStates[movedIntro.groupId!];
    const renderedOffsetAt150 = grp.memberOffsets[movedInterview.id];
    // Offset in pixels = (6 - 2) * 40 * 1.5 = 240px
    expect(renderedOffsetAt150).toBe(240);

    const introLeftAt150 = timeToPixel(movedIntro.start, 1.5); // 2 * 40 * 1.5 = 120px
    const interviewLeftAt150 = introLeftAt150 + renderedOffsetAt150; // 120 + 240 = 360px
    // 360px / (40 * 1.5) = 6.0s -> matches movedInterview.start (6.0s) perfectly!
    expect(interviewLeftAt150 / (40 * 1.5)).toBe(movedInterview.start);

    // 5. Change zoom back to 100% (1.0)
    store.setZoom(1.0);
    expect(useTimelineStore.getState().zoom).toBe(1.0);

    // 6. Inspect clip positions and timing values:
    const introLeftAt100 = timeToPixel(movedIntro.start, 1.0); // 2 * 40 * 1.0 = 80px
    const interviewLeftAt100 = introLeftAt100 + renderedOffsetAt150; // 80 + 240 = 320px
    const effectiveInterviewRenderedTime = interviewLeftAt100 / (40 * 1.0); // 320 / 40 = 8.0s!

    // Bug demonstrated: rendered time (8.0s) does NOT match inspector canonical time (6.0s)!
    expect(effectiveInterviewRenderedTime).not.toBe(movedInterview.start);
    expect(effectiveInterviewRenderedTime).toBe(8.0);
    expect(movedInterview.start).toBe(6.0);
  });

  it('Alternate Failure: group across tracks, hide track, move visible clip, unhide, undo exposes timing mismatch', () => {
    const store = useTimelineStore.getState();

    // 1. Start clean
    const intro = store.clips.find((c) => c.name === 'Intro')!; // Video 1, 0s
    const overlay = store.clips.find((c) => c.name === 'Overlay')!; // Video 2, 6s

    // 2. Group clips across two tracks
    store.setSelectedClipIds([intro.id, overlay.id]);
    store.groupSelectedClips();

    const initialGroupId = useTimelineStore.getState().clips.find((c) => c.id === intro.id)!.groupId!;

    // 3. Hide Video 2 track
    store.toggleTrackHidden('track-v2');
    expect(useTimelineStore.getState().tracks.find((t) => t.id === 'track-v2')?.hidden).toBe(true);

    // 4. Move visible grouped clip (Intro) by +80px (+2.0s at zoom 1.0)
    store.startDrag('move', intro.id, 100, 50, intro.trackId);
    store.updateDrag(180, 50);
    store.endDrag();

    // 5. Unhide track
    store.toggleTrackHidden('track-v2');

    // 6. Undo movement
    store.undo(); // undoes the unhide
    store.undo(); // undoes the move

    const restoredIntro = useTimelineStore.getState().clips.find((c) => c.id === intro.id)!;
    expect(restoredIntro.start).toBe(0);
  });

  it('Known-Good Control: ungrouped clip at 100% zoom drags, resizes, undoes and redoes without drift', () => {
    const store = useTimelineStore.getState();

    // 1. Keep a clip ungrouped (Interview)
    const interview = store.clips.find((c) => c.name === 'Interview')!;
    expect(interview.groupId).toBeNull();

    // 2. Leave zoom at 100%
    expect(store.zoom).toBe(1.0);

    // 3. Drag clip to new time (+80px = +2.0s -> start: 6.0s)
    store.startDrag('move', interview.id, 100, 50, interview.trackId);
    store.updateDrag(180, 50);
    store.endDrag();

    let current = useTimelineStore.getState().clips.find((c) => c.id === interview.id)!;
    expect(current.start).toBe(6.0);
    expect(current.duration).toBe(12);

    // 4. Resize right edge (+40px = +1.0s -> duration: 13s)
    store.startDrag('resize-right', current.id, 100, 50, current.trackId);
    store.updateDrag(140, 50);
    store.endDrag();

    current = useTimelineStore.getState().clips.find((c) => c.id === interview.id)!;
    expect(current.start).toBe(6.0);
    expect(current.duration).toBe(13);

    // 5. Undo resize
    useTimelineStore.getState().undo();
    current = useTimelineStore.getState().clips.find((c) => c.id === interview.id)!;
    expect(current.start).toBe(6.0);
    expect(current.duration).toBe(12);

    // Undo drag
    useTimelineStore.getState().undo();
    current = useTimelineStore.getState().clips.find((c) => c.id === interview.id)!;
    expect(current.start).toBe(4.0);
    expect(current.duration).toBe(12);

    // Redo drag
    useTimelineStore.getState().redo();
    current = useTimelineStore.getState().clips.find((c) => c.id === interview.id)!;
    expect(current.start).toBe(6.0);

    // Redo resize
    useTimelineStore.getState().redo();
    current = useTimelineStore.getState().clips.find((c) => c.id === interview.id)!;
    expect(current.start).toBe(6.0);
    expect(current.duration).toBe(13);
  });
});
