import { create } from 'zustand';
import {
  Track,
  Clip,
  DragState,
  HistorySnapshot,
  GroupState,
} from '../types/timeline';
import {
  INITIAL_TRACKS,
  INITIAL_CLIPS,
  MIN_CLIP_DURATION,
  DEFAULT_TOTAL_DURATION,
} from '../constants/initialData';
import {
  pixelToTime,
  findSnapTargets,
  getBestSnap,
} from '../utils/time';

const MAX_HISTORY = 40;

interface TimelineStore {
  // State
  tracks: Track[];
  clips: Clip[];
  selectedClipIds: string[];
  zoom: number; // 0.5 to 2.0
  currentTime: number;
  isPlaying: boolean;
  isSnapEnabled: boolean;
  isRippleEnabled: boolean;
  snapGuide: { time: number; label: string } | null;
  dragState: DragState | null;
  groupStates: Record<string, GroupState>;

  // History
  past: HistorySnapshot[];
  future: HistorySnapshot[];

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
  groupStates: {},
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
    const targetClip = clips.find((c) => c.id === clipId);
    if (!targetClip) return;

    let idsToAdd = [clipId];
    if (targetClip.groupId) {
      idsToAdd = clips.filter((c) => c.groupId === targetClip.groupId).map((c) => c.id);
    }

    if (multiSelect) {
      const currentSet = new Set(selectedClipIds);
      const allPresent = idsToAdd.every((id) => currentSet.has(id));
      if (allPresent) {
        idsToAdd.forEach((id) => currentSet.delete(id));
      } else {
        idsToAdd.forEach((id) => currentSet.add(id));
      }
      set({ selectedClipIds: Array.from(currentSet) });
    } else {
      set({ selectedClipIds: idsToAdd });
    }
  },

  clearSelection: () => {
    set({ selectedClipIds: [] });
  },

  setSelectedClipIds: (ids: string[]) => {
    set({ selectedClipIds: ids });
  },

  toggleTrackHidden: (trackId: string) => {
    const { tracks, past, clips, selectedClipIds, groupStates } = get();
    const newSnapshot: HistorySnapshot = {
      tracks: JSON.parse(JSON.stringify(tracks)),
      clips: JSON.parse(JSON.stringify(clips)),
      selectedClipIds: [...selectedClipIds],
      groupStates: JSON.parse(JSON.stringify(groupStates)),
    };

    set({
      past: [...past.slice(-MAX_HISTORY + 1), newSnapshot],
      future: [],
      tracks: tracks.map((t) => (t.id === trackId ? { ...t, hidden: !t.hidden } : t)),
    });
  },

  toggleTrackLocked: (trackId: string) => {
    const { tracks, past, clips, selectedClipIds, groupStates } = get();
    const newSnapshot: HistorySnapshot = {
      tracks: JSON.parse(JSON.stringify(tracks)),
      clips: JSON.parse(JSON.stringify(clips)),
      selectedClipIds: [...selectedClipIds],
      groupStates: JSON.parse(JSON.stringify(groupStates)),
    };

    set({
      past: [...past.slice(-MAX_HISTORY + 1), newSnapshot],
      future: [],
      tracks: tracks.map((t) => (t.id === trackId ? { ...t, locked: !t.locked } : t)),
    });
  },

  updateClip: (clipId: string, updates: Partial<Clip>) => {
    const { clips, tracks, past, selectedClipIds, groupStates } = get();
    const clip = clips.find((c) => c.id === clipId);
    if (!clip) return;

    const currentTrack = tracks.find((t) => t.id === clip.trackId);
    if (currentTrack?.locked) return;

    if (updates.trackId) {
      const destTrack = tracks.find((t) => t.id === updates.trackId);
      if (destTrack?.locked || destTrack?.type !== clip.type) return;
    }

    const newSnapshot: HistorySnapshot = {
      tracks: JSON.parse(JSON.stringify(tracks)),
      clips: JSON.parse(JSON.stringify(clips)),
      selectedClipIds: [...selectedClipIds],
      groupStates: JSON.parse(JSON.stringify(groupStates)),
    };

    set({
      past: [...past.slice(-MAX_HISTORY + 1), newSnapshot],
      future: [],
      clips: clips.map((c) => (c.id === clipId ? { ...c, ...updates } : c)),
    });
  },

  groupSelectedClips: () => {
    const { clips, selectedClipIds, tracks, past, zoom, groupStates } = get();
    if (selectedClipIds.length < 2) return;

    const unlockedSelected = selectedClipIds.filter((id) => {
      const c = clips.find((item) => item.id === id);
      const t = tracks.find((track) => track.id === c?.trackId);
      return !t?.locked;
    });

    if (unlockedSelected.length < 2) return;

    const newSnapshot: HistorySnapshot = {
      tracks: JSON.parse(JSON.stringify(tracks)),
      clips: JSON.parse(JSON.stringify(clips)),
      selectedClipIds: [...selectedClipIds],
      groupStates: JSON.parse(JSON.stringify(groupStates)),
    };

    const newGroupId = `group-${Date.now()}`;
    const newClips = clips.map((c) =>
      unlockedSelected.includes(c.id) ? { ...c, groupId: newGroupId } : c
    );

    // Anchor is the earliest clip
    const sortedSelected = [...unlockedSelected].sort((a, b) => {
      const ca = clips.find((c) => c.id === a)!;
      const cb = clips.find((c) => c.id === b)!;
      return ca.start - cb.start;
    });
    const anchorId = sortedSelected[0];
    const anchorClip = clips.find((c) => c.id === anchorId)!;

    const memberOffsets: Record<string, number> = {};
    unlockedSelected.forEach((id) => {
      const c = clips.find((item) => item.id === id);
      if (c) {
        memberOffsets[c.id] = (c.start - anchorClip.start) * 40 * zoom;
      }
    });

    set({
      clips: newClips,
      groupStates: {
        ...groupStates,
        [newGroupId]: {
          anchorId,
          memberOffsets,
        },
      },
      past: [...past.slice(-MAX_HISTORY + 1), newSnapshot],
      future: [],
    });
  },

  ungroupSelectedClips: () => {
    const { clips, selectedClipIds, tracks, past, groupStates } = get();
    if (selectedClipIds.length === 0) return;

    const newSnapshot: HistorySnapshot = {
      tracks: JSON.parse(JSON.stringify(tracks)),
      clips: JSON.parse(JSON.stringify(clips)),
      selectedClipIds: [...selectedClipIds],
      groupStates: JSON.parse(JSON.stringify(groupStates)),
    };

    const newClips = clips.map((c) =>
      selectedClipIds.includes(c.id) ? { ...c, groupId: null } : c
    );

    set({
      clips: newClips,
      past: [...past.slice(-MAX_HISTORY + 1), newSnapshot],
      future: [],
    });
  },

  deleteSelectedClips: () => {
    const { clips, selectedClipIds, tracks, past, groupStates } = get();
    if (selectedClipIds.length === 0) return;

    const lockedTrackIds = new Set(tracks.filter((t) => t.locked).map((t) => t.id));
    const toDelete = selectedClipIds.filter((id) => {
      const clip = clips.find((c) => c.id === id);
      return clip && !lockedTrackIds.has(clip.trackId);
    });

    if (toDelete.length === 0) return;

    const newSnapshot: HistorySnapshot = {
      tracks: JSON.parse(JSON.stringify(tracks)),
      clips: JSON.parse(JSON.stringify(clips)),
      selectedClipIds: [...selectedClipIds],
      groupStates: JSON.parse(JSON.stringify(groupStates)),
    };

    set({
      clips: clips.filter((c) => !toDelete.includes(c.id)),
      selectedClipIds: [],
      past: [...past.slice(-MAX_HISTORY + 1), newSnapshot],
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
      groupStates,
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
        const thresholdSec = 10 / (40 * zoom);
        const excludedIds = new Set(Object.keys(initialClips));
        const snapTargets = findSnapTargets(clips, excludedIds, currentTime, 60);

        const candidateStart = rawNewStart;
        const candidateEnd = rawNewStart + primaryInitial.duration;

        const bestSnap = getBestSnap([candidateStart, candidateEnd], snapTargets, thresholdSec);
        if (bestSnap.target) {
          if (bestSnap.snappedTime === bestSnap.target.time) {
            const snappedStartDiff = Math.abs(candidateStart - bestSnap.target.time);
            const snappedEndDiff = Math.abs(candidateEnd - bestSnap.target.time);

            if (snappedStartDiff <= snappedEndDiff) {
              effectiveDelta = bestSnap.target.time - primaryInitial.start;
            } else {
              effectiveDelta = bestSnap.target.time - (primaryInitial.start + primaryInitial.duration);
            }
            activeSnapGuide = { time: bestSnap.target.time, label: bestSnap.target.label };
          }
        }
      }

      let minStartAcrossAll = Infinity;
      Object.values(initialClips).forEach((c) => {
        if (c.start + effectiveDelta < minStartAcrossAll) {
          minStartAcrossAll = c.start + effectiveDelta;
        }
      });

      if (minStartAcrossAll < 0) {
        effectiveDelta -= minStartAcrossAll;
      }

      let targetTrackId = primaryInitial.trackId;
      if (currentTrackId && Object.keys(initialClips).length === 1) {
        const candidateTrack = tracks.find((t) => t.id === currentTrackId);
        if (candidateTrack && !candidateTrack.locked && candidateTrack.type === primaryInitial.type) {
          targetTrackId = currentTrackId;
        }
      }

      nextClips = clips.map((c) => {
        if (initialClips[c.id]) {
          const init = initialClips[c.id];
          return {
            ...c,
            start: Math.max(0, Number((init.start + effectiveDelta).toFixed(3))),
            trackId: c.id === primaryClipId ? targetTrackId : c.trackId,
          };
        }
        return c;
      });

      if (isRippleEnabled && Object.keys(initialClips).length === 1) {
        const originalEnd = primaryInitial.start + primaryInitial.duration;
        const newPrimaryClip = nextClips.find((c) => c.id === primaryClipId);
        if (newPrimaryClip) {
          const shiftDelta = newPrimaryClip.start - primaryInitial.start;
          nextClips = nextClips.map((c) => {
            if (c.id === primaryClipId) return c;
            if (c.trackId === targetTrackId && c.start >= originalEnd) {
              return {
                ...c,
                start: Math.max(0, Number((c.start + shiftDelta).toFixed(3))),
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
        const thresholdSec = 10 / (40 * zoom);
        const excludedIds = new Set([primaryClipId]);
        const snapTargets = findSnapTargets(clips, excludedIds, currentTime, 60);
        const bestSnap = getBestSnap([rawNewStart], snapTargets, thresholdSec);
        if (bestSnap.target) {
          rawNewStart = bestSnap.target.time;
          activeSnapGuide = { time: bestSnap.target.time, label: bestSnap.target.label };
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
        const thresholdSec = 10 / (40 * zoom);
        const excludedIds = new Set([primaryClipId]);
        const snapTargets = findSnapTargets(clips, excludedIds, currentTime, 60);
        const bestSnap = getBestSnap([rawNewEnd], snapTargets, thresholdSec);
        if (bestSnap.target) {
          rawNewEnd = bestSnap.target.time;
          activeSnapGuide = { time: bestSnap.target.time, label: bestSnap.target.label };
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
        nextClips = nextClips.map((c) => {
          if (c.id === primaryClipId) return c;
          if (c.trackId === primaryInitial.trackId && c.start >= originalEnd - 0.001) {
            return {
              ...c,
              start: Math.max(0, Number((c.start + durationDelta).toFixed(3))),
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
    const { dragState, past, tracks, clips, selectedClipIds, groupStates, zoom } = get();
    if (!dragState) return;

    const priorClips = clips.map((c) => dragState.initialClips[c.id] || c);
    const snapshot: HistorySnapshot = {
      tracks: JSON.parse(JSON.stringify(tracks)),
      clips: JSON.parse(JSON.stringify(priorClips)),
      selectedClipIds: [...selectedClipIds],
      groupStates: JSON.parse(JSON.stringify(groupStates)),
    };

    // Update groupStates memberOffsets
    const newGroupStates = { ...groupStates };
    const primaryClip = clips.find((c) => c.id === dragState.primaryClipId);
    let finalClips = [...clips];

    if (primaryClip?.groupId && newGroupStates[primaryClip.groupId]) {
      const grp = { ...newGroupStates[primaryClip.groupId] };
      const anchorClip = finalClips.find((c) => c.id === grp.anchorId);

      if (anchorClip) {
        // Reconcile any clips on hidden tracks with the anchor clip
        const hiddenTrackIds = new Set(tracks.filter((t) => t.hidden).map((t) => t.id));
        finalClips = finalClips.map((c) => {
          if (c.groupId === primaryClip.groupId && hiddenTrackIds.has(c.trackId)) {
            const offsetPx = grp.memberOffsets[c.id] || 0;
            // Deriving canonical time using base scale assumption (ignoring zoom)
            const syncedStart = anchorClip.start + offsetPx / 40;
            return { ...c, start: Number(syncedStart.toFixed(3)) };
          }
          return c;
        });

        // Update cached pixel offsets for group members
        const updatedOffsets: Record<string, number> = {};
        finalClips.forEach((c) => {
          if (c.groupId === primaryClip.groupId) {
            updatedOffsets[c.id] = (c.start - anchorClip.start) * 40 * zoom;
          }
        });
        grp.memberOffsets = updatedOffsets;
        newGroupStates[primaryClip.groupId] = grp;
      }
    }

    set({
      clips: finalClips,
      groupStates: newGroupStates,
      dragState: null,
      snapGuide: null,
      past: [...past.slice(-MAX_HISTORY + 1), snapshot],
      future: [],
    });
  },

  undo: () => {
    const { past, future, tracks, clips, selectedClipIds, groupStates } = get();
    if (past.length === 0) return;

    const previous = past[past.length - 1];
    const newPast = past.slice(0, past.length - 1);

    const currentSnapshot: HistorySnapshot = {
      tracks: JSON.parse(JSON.stringify(tracks)),
      clips: JSON.parse(JSON.stringify(clips)),
      selectedClipIds: [...selectedClipIds],
      groupStates: JSON.parse(JSON.stringify(groupStates)),
    };

    set({
      past: newPast,
      future: [currentSnapshot, ...future],
      tracks: previous.tracks,
      clips: previous.clips,
      selectedClipIds: previous.selectedClipIds,
      groupStates: previous.groupStates || {},
    });
  },

  redo: () => {
    const { past, future, tracks, clips, selectedClipIds, groupStates } = get();
    if (future.length === 0) return;

    const next = future[0];
    const newFuture = future.slice(1);

    const currentSnapshot: HistorySnapshot = {
      tracks: JSON.parse(JSON.stringify(tracks)),
      clips: JSON.parse(JSON.stringify(clips)),
      selectedClipIds: [...selectedClipIds],
      groupStates: JSON.parse(JSON.stringify(groupStates)),
    };

    set({
      past: [...past, currentSnapshot],
      future: newFuture,
      tracks: next.tracks,
      clips: next.clips,
      selectedClipIds: next.selectedClipIds,
      groupStates: next.groupStates || {},
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
      groupStates: {},
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
