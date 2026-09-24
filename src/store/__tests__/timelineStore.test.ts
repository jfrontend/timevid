import { describe, it, expect, beforeEach } from 'vitest';
import { useTimelineStore } from '../timelineStore';
import { INITIAL_CLIPS, INITIAL_TRACKS } from '../../constants/initialData';

describe('TimelineStore - Clean Baseline Validation', () => {
  beforeEach(() => {
    useTimelineStore.getState().resetProject();
  });

  it('initializes with deterministic starter timeline', () => {
    const { tracks, clips, zoom, currentTime, isSnapEnabled, isRippleEnabled } =
      useTimelineStore.getState();

    expect(tracks).toHaveLength(4);
    expect(clips).toHaveLength(6);
    expect(zoom).toBe(1.0);
    expect(currentTime).toBe(0);
    expect(isSnapEnabled).toBe(true);
    expect(isRippleEnabled).toBe(false);

    const intro = clips.find((c) => c.name === 'Intro');
    expect(intro).toBeDefined();
    expect(intro?.start).toBe(0);
    expect(intro?.duration).toBe(4);

    const interview = clips.find((c) => c.name === 'Interview');
    expect(interview?.start).toBe(4);
    expect(interview?.duration).toBe(12);

    const broll = clips.find((c) => c.name === 'B-roll');
    expect(broll?.start).toBe(16);
    expect(broll?.duration).toBe(8);

    const overlay = clips.find((c) => c.name === 'Overlay');
    expect(overlay?.start).toBe(6);
    expect(overlay?.duration).toBe(6);
  });

  it('handles normal clip drag horizontally', () => {
    const store = useTimelineStore.getState();
    const clip = store.clips.find((c) => c.name === 'Intro')!;

    // Start drag at pointerX: 100
    store.startDrag('move', clip.id, 100, 50, clip.trackId);

    // Drag by +80px (at zoom=1.0, BASE_PIXELS_PER_SECOND=40, so 80px = +2.0 seconds)
    store.updateDrag(180, 50);
    store.endDrag();

    const updated = useTimelineStore.getState().clips.find((c) => c.id === clip.id)!;
    expect(updated.start).toBe(2);
  });

  it('handles left and right resize with minimum duration clamp', () => {
    const store = useTimelineStore.getState();
    const clip = store.clips.find((c) => c.name === 'Interview')!; // start: 4, duration: 12

    // Resize right by +40px (+1.0 second)
    store.startDrag('resize-right', clip.id, 100, 50, clip.trackId);
    store.updateDrag(140, 50);
    store.endDrag();

    let updated = useTimelineStore.getState().clips.find((c) => c.id === clip.id)!;
    expect(updated.duration).toBe(13);

    // Resize left by +40px (+1.0 second: start goes from 4 -> 5, duration goes from 13 -> 12)
    store.startDrag('resize-left', clip.id, 100, 50, clip.trackId);
    store.updateDrag(140, 50);
    store.endDrag();

    updated = useTimelineStore.getState().clips.find((c) => c.id === clip.id)!;
    expect(updated.start).toBe(5);
    expect(updated.duration).toBe(12);
  });

  it('handles zoom changes without modifying canonical clip times', () => {
    const store = useTimelineStore.getState();
    const initialClips = [...store.clips];

    store.setZoom(1.5);
    expect(useTimelineStore.getState().zoom).toBe(1.5);

    const clipsAfterZoom = useTimelineStore.getState().clips;
    clipsAfterZoom.forEach((clip, i) => {
      expect(clip.start).toBe(initialClips[i].start);
      expect(clip.duration).toBe(initialClips[i].duration);
    });

    store.setZoom(1.0);
    expect(useTimelineStore.getState().zoom).toBe(1.0);
  });

  it('supports grouping and group movement', () => {
    const store = useTimelineStore.getState();
    const intro = store.clips.find((c) => c.name === 'Intro')!; // 0 to 4
    const interview = store.clips.find((c) => c.name === 'Interview')!; // 4 to 16

    // Select both and group
    store.setSelectedClipIds([intro.id, interview.id]);
    store.groupSelectedClips();

    const groupedClips = useTimelineStore.getState().clips;
    const gIntro = groupedClips.find((c) => c.id === intro.id)!;
    const gInterview = groupedClips.find((c) => c.id === interview.id)!;

    expect(gIntro.groupId).not.toBeNull();
    expect(gIntro.groupId).toBe(gInterview.groupId);

    // Move group by +40px (+1.0s)
    store.startDrag('move', gIntro.id, 100, 50, gIntro.trackId);
    store.updateDrag(140, 50);
    store.endDrag();

    const afterMove = useTimelineStore.getState().clips;
    const movedIntro = afterMove.find((c) => c.id === intro.id)!;
    const movedInterview = afterMove.find((c) => c.id === interview.id)!;

    expect(movedIntro.start).toBe(1);
    expect(movedInterview.start).toBe(5);
    expect(movedInterview.start - movedIntro.start).toBe(4); // Offset preserved!
  });

  it('handles track hide and lock states correctly', () => {
    const store = useTimelineStore.getState();
    const v1 = store.tracks.find((t) => t.id === 'track-v1')!;

    // Lock track
    store.toggleTrackLocked(v1.id);
    expect(useTimelineStore.getState().tracks.find((t) => t.id === v1.id)?.locked).toBe(true);

    // Attempt to drag clip on locked track -> should be prevented
    const intro = store.clips.find((c) => c.name === 'Intro')!;
    store.startDrag('move', intro.id, 100, 50, v1.id);
    expect(useTimelineStore.getState().dragState).toBeNull(); // Drag was blocked

    // Unlock
    store.toggleTrackLocked(v1.id);
    expect(useTimelineStore.getState().tracks.find((t) => t.id === v1.id)?.locked).toBe(false);

    // Hide track
    store.toggleTrackHidden(v1.id);
    expect(useTimelineStore.getState().tracks.find((t) => t.id === v1.id)?.hidden).toBe(true);
  });

  it('supports ripple editing when enabled', () => {
    const store = useTimelineStore.getState();
    store.toggleRipple(); // enable ripple
    expect(useTimelineStore.getState().isRippleEnabled).toBe(true);

    const interview = store.clips.find((c) => c.name === 'Interview')!; // start: 4, duration: 12 (ends at 16)
    const broll = store.clips.find((c) => c.name === 'B-roll')!; // start: 16, duration: 8

    // Drag interview by +80px (+2.0 seconds) -> new start 6
    store.startDrag('move', interview.id, 100, 50, interview.trackId);
    store.updateDrag(180, 50);
    store.endDrag();

    const updatedInterview = useTimelineStore.getState().clips.find((c) => c.id === interview.id)!;
    const updatedBroll = useTimelineStore.getState().clips.find((c) => c.id === broll.id)!;

    expect(updatedInterview.start).toBe(6);
    expect(updatedBroll.start).toBe(18); // shifted by +2s
  });

  it('supports undo and redo for edits', () => {
    const store = useTimelineStore.getState();
    const clip = store.clips.find((c) => c.name === 'Intro')!;

    expect(store.canUndo()).toBe(false);

    // Drag
    store.startDrag('move', clip.id, 100, 50, clip.trackId);
    store.updateDrag(140, 50);
    store.endDrag();

    expect(useTimelineStore.getState().canUndo()).toBe(true);
    expect(useTimelineStore.getState().clips.find((c) => c.id === clip.id)?.start).toBe(1);

    // Undo
    useTimelineStore.getState().undo();
    expect(useTimelineStore.getState().clips.find((c) => c.id === clip.id)?.start).toBe(0);
    expect(useTimelineStore.getState().canRedo()).toBe(true);

    // Redo
    useTimelineStore.getState().redo();
    expect(useTimelineStore.getState().clips.find((c) => c.id === clip.id)?.start).toBe(1);
  });
});
