import { describe, it, expect, beforeEach } from 'vitest';
import { useTimelineStore } from '../timelineStore';

describe('Timeline History & Group Synchronization Verification', () => {
  beforeEach(() => {
    useTimelineStore.getState().resetProject();
  });

  it('Group move at 150% zoom preserves relative offset on Undo and Redo', () => {
    const store = useTimelineStore.getState();

    // 1. Reset to starter sequence (at 100% zoom)
    const intro = store.clips.find((c) => c.name === 'Intro')!; // 0s
    const interview = store.clips.find((c) => c.name === 'Interview')!; // 4s
    expect(interview.start - intro.start).toBe(4);

    // 2. Set timeline zoom to 150%
    store.setZoom(1.5);
    expect(useTimelineStore.getState().zoom).toBe(1.5);

    // 3. Multi-select Intro and Interview, click "Group Selected Clips"
    store.setSelectedClipIds([intro.id, interview.id]);
    store.groupSelectedClips();

    // 4. Drag group forward by ~2.0s (+120px at zoom 1.5 -> +2.0s)
    store.startDrag('move', intro.id, 100, 50, intro.trackId);
    store.updateDrag(220, 50);
    store.endDrag();

    let clipsAfterDrag = useTimelineStore.getState().clips;
    let movedIntro = clipsAfterDrag.find((c) => c.id === intro.id)!;
    let movedInterview = clipsAfterDrag.find((c) => c.id === interview.id)!;

    expect(movedIntro.start).toBe(2);
    expect(movedInterview.start).toBe(6);
    expect(movedInterview.start - movedIntro.start).toBe(4);

    // 5. Undo, then Redo
    useTimelineStore.getState().undo();

    let clipsAfterUndo = useTimelineStore.getState().clips;
    let undoneIntro = clipsAfterUndo.find((c) => c.id === intro.id)!;
    let undoneInterview = clipsAfterUndo.find((c) => c.id === interview.id)!;

    // Both clips restore to their exact pre-drag coordinates
    expect(undoneIntro.start).toBe(0);
    expect(undoneInterview.start).toBe(4);
    expect(undoneInterview.start - undoneIntro.start).toBe(4);

    // Redo restores to post-drag coordinates
    useTimelineStore.getState().redo();
    let clipsAfterRedo = useTimelineStore.getState().clips;
    let redoneIntro = clipsAfterRedo.find((c) => c.id === intro.id)!;
    let redoneInterview = clipsAfterRedo.find((c) => c.id === interview.id)!;

    expect(redoneIntro.start).toBe(2);
    expect(redoneInterview.start).toBe(6);
    expect(redoneInterview.start - redoneIntro.start).toBe(4);
  });

  it('Cross-track group with hidden track restores offset accurately on Undo', () => {
    const store = useTimelineStore.getState();

    // 1. Reset to starter sequence
    const intro = store.clips.find((c) => c.name === 'Intro')!; // Video 1, 0s
    const overlay = store.clips.find((c) => c.name === 'Overlay')!; // Video 2, 6s

    // 2. Group across tracks
    store.setSelectedClipIds([intro.id, overlay.id]);
    store.groupSelectedClips();
    expect(overlay.start - intro.start).toBe(6);

    // 3. Set zoom to 1.5 and hide Video 2
    store.setZoom(1.5);
    store.toggleTrackHidden('track-v2');

    // 4. Move visible Intro forward by 2.0s
    store.startDrag('move', intro.id, 100, 50, intro.trackId);
    store.updateDrag(220, 50);
    store.endDrag();

    // 5. Unhide Video 2
    store.toggleTrackHidden('track-v2');

    // 6. Undo unhide, then Undo move
    useTimelineStore.getState().undo(); // undoes unhide
    useTimelineStore.getState().undo(); // undoes move

    const restoredIntro = useTimelineStore.getState().clips.find((c) => c.id === intro.id)!;
    const restoredOverlay = useTimelineStore.getState().clips.find((c) => c.id === overlay.id)!;

    expect(restoredIntro.start).toBe(0);
    expect(restoredOverlay.start).toBe(6);
    expect(restoredOverlay.start - restoredIntro.start).toBe(6);
  });

  it('Known-Good Control: Single ungrouped clip drag, resize, undo, and redo maintain 100% fidelity', () => {
    const store = useTimelineStore.getState();

    // 1. Keep clip ungrouped
    const interview = store.clips.find((c) => c.name === 'Interview')!;
    expect(interview.groupId).toBeNull();

    // 2. Zoom at 100%
    expect(store.zoom).toBe(1.0);

    // 3. Drag clip to new time (+80px -> +2.0s: 4.0s -> 6.0s)
    store.startDrag('move', interview.id, 100, 50, interview.trackId);
    store.updateDrag(180, 50);
    store.endDrag();

    let current = useTimelineStore.getState().clips.find((c) => c.id === interview.id)!;
    expect(current.start).toBe(6.0);
    expect(current.duration).toBe(12);

    // 4. Resize right edge (+40px -> +1.0s: 12.0s -> 13.0s)
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
