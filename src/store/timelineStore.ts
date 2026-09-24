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
  BASE_PIXELS_PER_SECOND,
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
    if (selectedClipIds.length < 2) return;

    const unlockedSelected = selectedClipIds.filter((id) => {
      const c = clips.find((item) => item.id === id);
      const t = tracks.find((track) => track.id === c?.trackId);
      return !t?.locked;
    });

    if (unlockedSelected.length < 2) return;

    const newGroupId = `group-${Date.now()}`;
    const newClips = clips.map((c) =>
      unlockedSelected.includes(c.id) ? { ...c, groupId: newGroupId } : c
    );

    const tx: TimelineTransaction = {
      type: 'GROUP_CLIPS',
      groupId: newGroupId,
      clipIds: unlockedSelected,
    };

    set({
      clips: newClips,
      past: [...past.slice(-MAX_HISTORY + 1), tx],
      future: [],
    });
  },

  ungroupSelectedClips: () => {
    const { clips, selectedClipIds, past } = get();
    if (selectedClipIds.length === 0) return;

    const targetClip = clips.find((c) => selectedClipIds.includes(c.id) && c.groupId);
    if (!targetClip || !targetClip.groupId) return;

    const groupId = targetClip.groupId;
    const affectedClipIds = clips.filter((c) => c.groupId === groupId).map((c) => c.id);

    const tx: TimelineTransaction = {
      type: 'UNGROUP_CLIPS',
      groupId,
      clipIds: affectedClipIds,
    };

    const newClips = clips.map((c) =>
      affectedClipIds.includes(c.id) ? { ...c, groupId: null } : c
    );

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
        const thresholdSec = 10 / (BASE_PIXELS_PER_SECOND * zoom);
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
        const thresholdSec = 10 / (BASE_PIXELS_PER_SECOND * zoom);
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
        const thresholdSec = 10 / (BASE_PIXELS_PER_SECOND * zoom);
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
          clips.forEach((c) => {
            if (c.id !== primaryClipId && c.trackId === primaryInitial.trackId && c.start >= primaryInitial.start + primaryInitial.duration) {
              rippleDeltas[c.id] = deltaDuration;
            }
          });
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

    switch (tx.type) {
      case 'MOVE_CLIPS': {
        const { primaryClipId, clipDeltas, initialTrackId, capturedZoom, isGroupMove } = tx;

        const updatedClips = clips.map((c) => {
          if (c.id === primaryClipId) {
            const delta = clipDeltas[c.id] ?? 0;
            return {
              ...c,
              start: Math.max(0, Number((c.start - delta).toFixed(3))),
              trackId: initialTrackId,
            };
          }

          if (clipDeltas[c.id] !== undefined) {
            let delta = clipDeltas[c.id];
            if (isGroupMove) {
              // Inverse projection under captured transaction viewport
              // When replaying group movement, follower displacement is projected
              // through the transaction's reference scale:
              const anchorDelta = clipDeltas[primaryClipId] ?? 0;
              const screenDelta = anchorDelta * BASE_PIXELS_PER_SECOND * capturedZoom;
              delta = screenDelta / BASE_PIXELS_PER_SECOND;
            }
            return {
              ...c,
              start: Math.max(0, Number((c.start - delta).toFixed(3))),
            };
          }

          return c;
        });

        set({
          clips: updatedClips,
          past: newPast,
          future: [tx, ...future],
        });
        break;
      }

      case 'RESIZE_CLIP': {
        const { clipId, deltaStart, deltaDuration, rippleDeltas } = tx;
        const updatedClips = clips.map((c) => {
          if (c.id === clipId) {
            return {
              ...c,
              start: Number((c.start - deltaStart).toFixed(3)),
              duration: Number((c.duration - deltaDuration).toFixed(3)),
            };
          }
          if (rippleDeltas && rippleDeltas[c.id] !== undefined) {
            return {
              ...c,
              start: Number((c.start - rippleDeltas[c.id]).toFixed(3)),
            };
          }
          return c;
        });

        set({
          clips: updatedClips,
          past: newPast,
          future: [tx, ...future],
        });
        break;
      }

      case 'GROUP_CLIPS': {
        const { clipIds } = tx;
        const updatedClips = clips.map((c) =>
          clipIds.includes(c.id) ? { ...c, groupId: null } : c
        );
        set({
          clips: updatedClips,
          past: newPast,
          future: [tx, ...future],
        });
        break;
      }

      case 'UNGROUP_CLIPS': {
        const { groupId, clipIds } = tx;
        const updatedClips = clips.map((c) =>
          clipIds.includes(c.id) ? { ...c, groupId } : c
        );
        set({
          clips: updatedClips,
          past: newPast,
          future: [tx, ...future],
        });
        break;
      }

      case 'TRACK_VISIBILITY': {
        const { trackId, hidden } = tx;
        set({
          tracks: tracks.map((t) => (t.id === trackId ? { ...t, hidden: !hidden } : t)),
          past: newPast,
          future: [tx, ...future],
        });
        break;
      }

      case 'TRACK_LOCK': {
        const { trackId, locked } = tx;
        set({
          tracks: tracks.map((t) => (t.id === trackId ? { ...t, locked: !locked } : t)),
          past: newPast,
          future: [tx, ...future],
        });
        break;
      }

      case 'DELETE_CLIPS': {
        const { deletedClips } = tx;
        set({
          clips: [...clips, ...deletedClips],
          past: newPast,
          future: [tx, ...future],
        });
        break;
      }

      case 'UPDATE_CLIP': {
        const { clipId, before } = tx;
        set({
          clips: clips.map((c) => (c.id === clipId ? { ...c, ...before } : c)),
          past: newPast,
          future: [tx, ...future],
        });
        break;
      }
    }
  },

  redo: () => {
    const { past, future, tracks, clips } = get();
    if (future.length === 0) return;

    const tx = future[0];
    const newFuture = future.slice(1);

    switch (tx.type) {
      case 'MOVE_CLIPS': {
        const { primaryClipId, clipDeltas, targetTrackId, capturedZoom, isGroupMove } = tx;

        const updatedClips = clips.map((c) => {
          if (c.id === primaryClipId) {
            const delta = clipDeltas[c.id] ?? 0;
            return {
              ...c,
              start: Math.max(0, Number((c.start + delta).toFixed(3))),
              trackId: targetTrackId,
            };
          }

          if (clipDeltas[c.id] !== undefined) {
            let delta = clipDeltas[c.id];
            if (isGroupMove) {
              const anchorDelta = clipDeltas[primaryClipId] ?? 0;
              const screenDelta = anchorDelta * BASE_PIXELS_PER_SECOND * capturedZoom;
              delta = screenDelta / BASE_PIXELS_PER_SECOND;
            }
            return {
              ...c,
              start: Math.max(0, Number((c.start + delta).toFixed(3))),
            };
          }

          return c;
        });

        set({
          clips: updatedClips,
          past: [...past, tx],
          future: newFuture,
        });
        break;
      }

      case 'RESIZE_CLIP': {
        const { clipId, deltaStart, deltaDuration, rippleDeltas } = tx;
        const updatedClips = clips.map((c) => {
          if (c.id === clipId) {
            return {
              ...c,
              start: Number((c.start + deltaStart).toFixed(3)),
              duration: Number((c.duration + deltaDuration).toFixed(3)),
            };
          }
          if (rippleDeltas && rippleDeltas[c.id] !== undefined) {
            return {
              ...c,
              start: Number((c.start + rippleDeltas[c.id]).toFixed(3)),
            };
          }
          return c;
        });

        set({
          clips: updatedClips,
          past: [...past, tx],
          future: newFuture,
        });
        break;
      }

      case 'GROUP_CLIPS': {
        const { groupId, clipIds } = tx;
        const updatedClips = clips.map((c) =>
          clipIds.includes(c.id) ? { ...c, groupId } : c
        );
        set({
          clips: updatedClips,
          past: [...past, tx],
          future: newFuture,
        });
        break;
      }

      case 'UNGROUP_CLIPS': {
        const { clipIds } = tx;
        const updatedClips = clips.map((c) =>
          clipIds.includes(c.id) ? { ...c, groupId: null } : c
        );
        set({
          clips: updatedClips,
          past: [...past, tx],
          future: newFuture,
        });
        break;
      }

      case 'TRACK_VISIBILITY': {
        const { trackId, hidden } = tx;
        set({
          tracks: tracks.map((t) => (t.id === trackId ? { ...t, hidden } : t)),
          past: [...past, tx],
          future: newFuture,
        });
        break;
      }

      case 'TRACK_LOCK': {
        const { trackId, locked } = tx;
        set({
          tracks: tracks.map((t) => (t.id === trackId ? { ...t, locked } : t)),
          past: [...past, tx],
          future: newFuture,
        });
        break;
      }

      case 'DELETE_CLIPS': {
        const { deletedClips } = tx;
        const deleteIds = new Set(deletedClips.map((c) => c.id));
        set({
          clips: clips.filter((c) => !deleteIds.has(c.id)),
          past: [...past, tx],
          future: newFuture,
        });
        break;
      }

      case 'UPDATE_CLIP': {
        const { clipId, after } = tx;
        set({
          clips: clips.map((c) => (c.id === clipId ? { ...c, ...after } : c)),
          past: [...past, tx],
          future: newFuture,
        });
        break;
      }
    }
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
