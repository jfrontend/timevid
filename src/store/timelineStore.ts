import { create } from 'zustand';
import {
  Track,
  Clip,
  DragState,
  TimelineTransaction,
} from '../types/timeline';
import {
  INITIAL_TRACKS,
  INITIAL_CLIPS,
  MIN_CLIP_DURATION,
  DEFAULT_TOTAL_DURATION,
} from '../constants/initialData';
import {
  pixelToTime,
  getSnapThresholdInTime,
} from '../engine/coordinates';
import {
  findSnapTargets,
  evaluateSnapCandidates,
  SnapCandidateEdge,
} from '../engine/snapping';
import {
  resolveGroupSelection,
  createGroup,
  ungroupSelected,
  calculateGroupMovement,
} from '../engine/groups';
import {
  calculateRippleDragShift,
  calculateRippleTrimShift,
} from '../engine/ripple';
import {
  applyTransaction,
  applyInverseTransaction,
} from '../engine/history';

const MAX_HISTORY = 40;

interface TimelineStore {
  // State
  tracks: Track[];
  clips: Clip[];
  selectedClipIds: string[];
  zoom: number; // 0.4 to 2.0
  currentTime: number;
  isPlaying: boolean;
  isSnapEnabled: boolean;
  isRippleEnabled: boolean;
  snapGuide: { time: number; label: string } | null;
  dragState: DragState | null;

  // Transaction History
  past: TimelineTransaction[];
  future: TimelineTransaction[];

  // Actions
  setZoom: (zoom: number) => void;
  setCurrentTime: (time: number) => void;
  setIsPlaying: (playing: boolean) => void;
  togglePlay: () => void;
  toggleSnap: () => void;
  toggleRipple: () => void;
  selectClip: (clipId: string, multiSelect?: boolean) => void;
  clearSelection: () => void;
  setSelectedClipIds: (ids: string[]) => void;

  // Track Actions
  toggleTrackHidden: (trackId: string) => void;
  toggleTrackLocked: (trackId: string) => void;

  // Clip Modifications
  updateClip: (clipId: string, updates: Partial<Clip>) => void;
  groupSelectedClips: () => void;
  ungroupSelectedClips: () => void;
  deleteSelectedClips: () => void;

  // Drag Interactions
  startDrag: (
    mode: 'move' | 'resize-left' | 'resize-right',
    clipId: string,
    pointerX: number,
    pointerY: number,
    trackId: string
  ) => void;
  updateDrag: (pointerX: number, pointerY: number, currentTrackId?: string) => void;
  endDrag: () => void;

  // History Actions
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  resetProject: () => void;

  // Calculated
  getTotalDuration: () => number;
}

export const useTimelineStore = create<TimelineStore>((set, get) => ({
  tracks: JSON.parse(JSON.stringify(INITIAL_TRACKS)),
  clips: JSON.parse(JSON.stringify(INITIAL_CLIPS)),
  selectedClipIds: [],
  zoom: 1.0,
  currentTime: 0,
  isPlaying: false,
  isSnapEnabled: true,
  isRippleEnabled: false,
  snapGuide: null,
  dragState: null,
  past: [],
  future: [],

  setZoom: (zoom: number) => {
    const clampedZoom = Math.min(2.0, Math.max(0.4, Number(zoom.toFixed(2))));
    set({ zoom: clampedZoom });
  },

  setCurrentTime: (time: number) => {
    const total = get().getTotalDuration();
    set({ currentTime: Math.max(0, Math.min(total, time)) });
  },

  setIsPlaying: (isPlaying: boolean) => {
    set({ isPlaying });
  },

  togglePlay: () => {
    set((state) => ({ isPlaying: !state.isPlaying }));
  },

  toggleSnap: () => {
    set((state) => ({ isSnapEnabled: !state.isSnapEnabled }));
  },

  toggleRipple: () => {
    set((state) => ({ isRippleEnabled: !state.isRippleEnabled }));
  },

  selectClip: (clipId: string, multiSelect = false) => {
    const { clips, selectedClipIds } = get();
    const newSelection = resolveGroupSelection(clips, clipId, multiSelect, selectedClipIds);
    set({ selectedClipIds: newSelection });
  },

  clearSelection: () => {
    set({ selectedClipIds: [] });
  },

  setSelectedClipIds: (ids: string[]) => {
    set({ selectedClipIds: ids });
  },

  toggleTrackHidden: (trackId: string) => {
    const { tracks, past } = get();
    const targetTrack = tracks.find((t) => t.id === trackId);
    if (!targetTrack) return;

    const tx: TimelineTransaction = {
      type: 'TRACK_VISIBILITY',
      trackId,
      hidden: !targetTrack.hidden,
    };

    set({
      past: [...past.slice(-MAX_HISTORY + 1), tx],
      future: [],
      tracks: tracks.map((t) => (t.id === trackId ? { ...t, hidden: !t.hidden } : t)),
    });
  },

  toggleTrackLocked: (trackId: string) => {
    const { tracks, past } = get();
    const targetTrack = tracks.find((t) => t.id === trackId);
    if (!targetTrack) return;

    const tx: TimelineTransaction = {
      type: 'TRACK_LOCK',
      trackId,
      locked: !targetTrack.locked,
    };

    set({
      past: [...past.slice(-MAX_HISTORY + 1), tx],
      future: [],
      tracks: tracks.map((t) => (t.id === trackId ? { ...t, locked: !t.locked } : t)),
    });
  },

  updateClip: (clipId: string, updates: Partial<Clip>) => {
    const { clips, tracks, past } = get();
    const clip = clips.find((c) => c.id === clipId);
    if (!clip) return;

    const currentTrack = tracks.find((t) => t.id === clip.trackId);
    if (currentTrack?.locked) return;

    if (updates.trackId) {
      const destTrack = tracks.find((t) => t.id === updates.trackId);
      if (destTrack?.locked || destTrack?.type !== clip.type) return;
    }

    const before: Partial<Clip> = {};
    (Object.keys(updates) as (keyof Clip)[]).forEach((k) => {
      (before as any)[k] = clip[k];
    });

    const tx: TimelineTransaction = {
      type: 'UPDATE_CLIP',
      clipId,
      before,
      after: updates,
    };

    set({
      past: [...past.slice(-MAX_HISTORY + 1), tx],
      future: [],
      clips: clips.map((c) => (c.id === clipId ? { ...c, ...updates } : c)),
    });
  },

  groupSelectedClips: () => {
    const { clips, selectedClipIds, tracks, past } = get();
    const result = createGroup(clips, selectedClipIds, tracks);
    if (!result) return;

    const tx: TimelineTransaction = {
      type: 'GROUP_CLIPS',
      groupId: result.groupId,
      clipIds: selectedClipIds,
    };

    set({
      clips: result.newClips,
      past: [...past.slice(-MAX_HISTORY + 1), tx],
      future: [],
    });
  },

  ungroupSelectedClips: () => {
    const { clips, selectedClipIds, past } = get();
    const { newClips, affectedGroupId } = ungroupSelected(clips, selectedClipIds);
    if (!affectedGroupId) return;

    const tx: TimelineTransaction = {
      type: 'UNGROUP_CLIPS',
      groupId: affectedGroupId,
      clipIds: selectedClipIds,
    };

    set({
      clips: newClips,
      past: [...past.slice(-MAX_HISTORY + 1), tx],
      future: [],
    });
  },

  deleteSelectedClips: () => {
    const { clips, selectedClipIds, tracks, past } = get();
    if (selectedClipIds.length === 0) return;

    const lockedTrackIds = new Set(tracks.filter((t) => t.locked).map((t) => t.id));
    const toDelete = clips.filter(
      (c) => selectedClipIds.includes(c.id) && !lockedTrackIds.has(c.trackId)
    );

    if (toDelete.length === 0) return;

    const tx: TimelineTransaction = {
      type: 'DELETE_CLIPS',
      deletedClips: toDelete,
    };

    const deleteIds = new Set(toDelete.map((c) => c.id));
    set({
      clips: clips.filter((c) => !deleteIds.has(c.id)),
      selectedClipIds: [],
      past: [...past.slice(-MAX_HISTORY + 1), tx],
      future: [],
    });
  },

  startDrag: (mode, clipId, pointerX, pointerY, trackId) => {
    const { clips, tracks, selectedClipIds } = get();
    const clip = clips.find((c) => c.id === clipId);
    if (!clip) return;

    const track = tracks.find((t) => t.id === clip.trackId);
    if (track?.locked || track?.hidden) return;

    const participatingIds = new Set<string>();
    if (selectedClipIds.includes(clipId)) {
      selectedClipIds.forEach((id) => participatingIds.add(id));
    } else {
      participatingIds.add(clipId);
    }

    if (clip.groupId) {
      clips.filter((c) => c.groupId === clip.groupId).forEach((c) => participatingIds.add(c.id));
    }

    const initialClips: Record<string, Clip> = {};
    for (const c of clips) {
      if (participatingIds.has(c.id)) {
        initialClips[c.id] = { ...c };
      }
    }

    set({
      dragState: {
        mode,
        primaryClipId: clipId,
        initialClips,
        startPointerX: pointerX,
        startPointerY: pointerY,
        currentPointerX: pointerX,
        currentPointerY: pointerY,
        initialTrackId: trackId,
        hoverTrackId: trackId,
      },
      selectedClipIds: Array.from(participatingIds),
    });
  },

  updateDrag: (pointerX, pointerY, currentTrackId) => {
    const {
      dragState,
      zoom,
      clips,
      tracks,
      isSnapEnabled,
      currentTime,
      isRippleEnabled,
    } = get();
    if (!dragState) return;

    const { mode, primaryClipId, initialClips, startPointerX } = dragState;
    const primaryInitial = initialClips[primaryClipId];
    if (!primaryInitial) return;

    const pixelDeltaX = pointerX - startPointerX;
    const timeDelta = pixelToTime(pixelDeltaX, zoom);

    let nextClips = [...clips];
    let activeSnapGuide: { time: number; label: string } | null = null;

    if (mode === 'move') {
      let rawNewStart = primaryInitial.start + timeDelta;
      let effectiveDelta = timeDelta;

      if (isSnapEnabled) {
        const thresholdSec = getSnapThresholdInTime(zoom, 10);
        const excludedIds = new Set(Object.keys(initialClips));
        const snapTargets = findSnapTargets(clips, excludedIds, currentTime, 60);

        const candidateEdges: SnapCandidateEdge[] = [
          {
            clipId: primaryClipId,
            edge: 'start',
            candidateTime: rawNewStart,
            initialTime: primaryInitial.start,
          },
          {
            clipId: primaryClipId,
            edge: 'end',
            candidateTime: rawNewStart + primaryInitial.duration,
            initialTime: primaryInitial.start + primaryInitial.duration,
          },
        ];

        const snapResult = evaluateSnapCandidates(candidateEdges, snapTargets, thresholdSec);
        if (snapResult.hasSnapped) {
          effectiveDelta = snapResult.snappedDelta;
          activeSnapGuide = snapResult.guide;
        }
      }

      // Calculate coordinated group movement across tracks
      const { clipUpdates } = calculateGroupMovement(
        initialClips,
        primaryClipId,
        effectiveDelta,
        currentTrackId,
        tracks
      );

      nextClips = clips.map((c) => {
        if (clipUpdates[c.id]) {
          return {
            ...c,
            start: clipUpdates[c.id].start,
            trackId: clipUpdates[c.id].trackId,
          };
        }
        return c;
      });

      // Ripple handling
      if (isRippleEnabled && Object.keys(initialClips).length === 1) {
        const originalEnd = primaryInitial.start + primaryInitial.duration;
        const newPrimary = nextClips.find((c) => c.id === primaryClipId);
        if (newPrimary) {
          const shiftDelta = newPrimary.start - primaryInitial.start;
          const targetTrack = clipUpdates[primaryClipId]?.trackId || primaryInitial.trackId;
          const rippleShifts = calculateRippleDragShift(
            nextClips,
            primaryClipId,
            targetTrack,
            originalEnd,
            shiftDelta
          );
          nextClips = nextClips.map((c) => {
            if (rippleShifts[c.id] !== undefined) {
              return {
                ...c,
                start: Math.max(0, Number((c.start + rippleShifts[c.id]).toFixed(3))),
              };
            }
            return c;
          });
        }
      }
    } else if (mode === 'resize-left') {
      let rawNewStart = primaryInitial.start + timeDelta;
      const initialEnd = primaryInitial.start + primaryInitial.duration;

      if (isSnapEnabled) {
        const thresholdSec = getSnapThresholdInTime(zoom, 10);
        const excludedIds = new Set([primaryClipId]);
        const snapTargets = findSnapTargets(clips, excludedIds, currentTime, 60);
        const candidateEdges: SnapCandidateEdge[] = [
          {
            clipId: primaryClipId,
            edge: 'start',
            candidateTime: rawNewStart,
            initialTime: primaryInitial.start,
          },
        ];
        const snapResult = evaluateSnapCandidates(candidateEdges, snapTargets, thresholdSec);
        if (snapResult.hasSnapped) {
          rawNewStart = primaryInitial.start + snapResult.snappedDelta;
          activeSnapGuide = snapResult.guide;
        }
      }

      const maxStart = initialEnd - MIN_CLIP_DURATION;
      const clampedStart = Math.max(0, Math.min(maxStart, rawNewStart));
      const clampedDuration = initialEnd - clampedStart;

      nextClips = clips.map((c) =>
        c.id === primaryClipId
          ? {
              ...c,
              start: Number(clampedStart.toFixed(3)),
              duration: Number(clampedDuration.toFixed(3)),
            }
          : c
      );
    } else if (mode === 'resize-right') {
      let rawNewEnd = primaryInitial.start + primaryInitial.duration + timeDelta;

      if (isSnapEnabled) {
        const thresholdSec = getSnapThresholdInTime(zoom, 10);
        const excludedIds = new Set([primaryClipId]);
        const snapTargets = findSnapTargets(clips, excludedIds, currentTime, 60);
        const candidateEdges: SnapCandidateEdge[] = [
          {
            clipId: primaryClipId,
            edge: 'end',
            candidateTime: rawNewEnd,
            initialTime: primaryInitial.start + primaryInitial.duration,
          },
        ];
        const snapResult = evaluateSnapCandidates(candidateEdges, snapTargets, thresholdSec);
        if (snapResult.hasSnapped) {
          rawNewEnd = primaryInitial.start + primaryInitial.duration + snapResult.snappedDelta;
          activeSnapGuide = snapResult.guide;
        }
      }

      const minEnd = primaryInitial.start + MIN_CLIP_DURATION;
      const clampedEnd = Math.max(minEnd, rawNewEnd);
      const clampedDuration = clampedEnd - primaryInitial.start;
      const durationDelta = clampedDuration - primaryInitial.duration;

      nextClips = clips.map((c) =>
        c.id === primaryClipId
          ? {
              ...c,
              duration: Number(clampedDuration.toFixed(3)),
            }
          : c
      );

      if (isRippleEnabled) {
        const originalEnd = primaryInitial.start + primaryInitial.duration;
        const rippleShifts = calculateRippleTrimShift(
          nextClips,
          primaryClipId,
          primaryInitial.trackId,
          originalEnd,
          durationDelta
        );
        nextClips = nextClips.map((c) => {
          if (rippleShifts[c.id] !== undefined) {
            return {
              ...c,
              start: Math.max(0, Number((c.start + rippleShifts[c.id]).toFixed(3))),
            };
          }
          return c;
        });
      }
    }

    set({
      clips: nextClips,
      snapGuide: activeSnapGuide,
      dragState: {
        ...dragState,
        currentPointerX: pointerX,
        currentPointerY: pointerY,
        hoverTrackId: currentTrackId || dragState.hoverTrackId,
      },
    });
  },

  endDrag: () => {
    const { dragState, past, clips, zoom, isRippleEnabled } = get();
    if (!dragState) return;

    const { mode, primaryClipId, initialClips, initialTrackId } = dragState;
    const primaryInitial = initialClips[primaryClipId];
    const primaryCurrent = clips.find((c) => c.id === primaryClipId);

    if (primaryInitial && primaryCurrent) {
      if (mode === 'move') {
        const isGroupMove = Boolean(primaryCurrent.groupId) || Object.keys(initialClips).length > 1;
        const clipDeltas: Record<string, number> = {};

        Object.keys(initialClips).forEach((id) => {
          const init = initialClips[id];
          const curr = clips.find((c) => c.id === id);
          if (init && curr) {
            clipDeltas[id] = Number((curr.start - init.start).toFixed(3));
          }
        });

        const tx: TimelineTransaction = {
          type: 'MOVE_CLIPS',
          primaryClipId,
          clipDeltas,
          initialTrackId,
          targetTrackId: primaryCurrent.trackId,
          capturedZoom: zoom,
          isGroupMove,
        };

        set({
          past: [...past.slice(-MAX_HISTORY + 1), tx],
          future: [],
          dragState: null,
          snapGuide: null,
        });
        return;
      } else if (mode === 'resize-left' || mode === 'resize-right') {
        const deltaStart = Number((primaryCurrent.start - primaryInitial.start).toFixed(3));
        const deltaDuration = Number((primaryCurrent.duration - primaryInitial.duration).toFixed(3));

        const rippleDeltas: Record<string, number> = {};
        if (isRippleEnabled && mode === 'resize-right') {
          const originalEnd = primaryInitial.start + primaryInitial.duration;
          const shifts = calculateRippleTrimShift(
            clips,
            primaryClipId,
            primaryInitial.trackId,
            originalEnd,
            deltaDuration
          );
          Object.assign(rippleDeltas, shifts);
        }

        const tx: TimelineTransaction = {
          type: 'RESIZE_CLIP',
          clipId: primaryClipId,
          edge: mode === 'resize-left' ? 'left' : 'right',
          deltaStart,
          deltaDuration,
          rippleDeltas,
        };

        set({
          past: [...past.slice(-MAX_HISTORY + 1), tx],
          future: [],
          dragState: null,
          snapGuide: null,
        });
        return;
      }
    }

    set({
      dragState: null,
      snapGuide: null,
    });
  },

  undo: () => {
    const { past, future, tracks, clips } = get();
    if (past.length === 0) return;

    const tx = past[past.length - 1];
    const newPast = past.slice(0, past.length - 1);
    const { tracks: newTracks, clips: newClips } = applyInverseTransaction(tx, tracks, clips);

    set({
      tracks: newTracks,
      clips: newClips,
      past: newPast,
      future: [tx, ...future],
    });
  },

  redo: () => {
    const { past, future, tracks, clips } = get();
    if (future.length === 0) return;

    const tx = future[0];
    const newFuture = future.slice(1);
    const { tracks: newTracks, clips: newClips } = applyTransaction(tx, tracks, clips);

    set({
      tracks: newTracks,
      clips: newClips,
      past: [...past, tx],
      future: newFuture,
    });
  },

  canUndo: () => get().past.length > 0,
  canRedo: () => get().future.length > 0,

  resetProject: () => {
    set({
      tracks: JSON.parse(JSON.stringify(INITIAL_TRACKS)),
      clips: JSON.parse(JSON.stringify(INITIAL_CLIPS)),
      selectedClipIds: [],
      zoom: 1.0,
      currentTime: 0,
      isPlaying: false,
      isSnapEnabled: true,
      isRippleEnabled: false,
      snapGuide: null,
      dragState: null,
      past: [],
      future: [],
    });
  },

  getTotalDuration: () => {
    const { clips } = get();
    let max = DEFAULT_TOTAL_DURATION;
    for (const c of clips) {
      if (c.start + c.duration > max) {
        max = c.start + c.duration + 4;
      }
    }
    return Math.ceil(max);
  },
}));
