import { Clip, Track, TimelineTransaction } from '../types/timeline';

export function applyTransaction(
  tx: TimelineTransaction,
  tracks: Track[],
  clips: Clip[]
): { tracks: Track[]; clips: Clip[] } {
  switch (tx.type) {
    case 'MOVE_CLIPS': {
      const { primaryClipId, clipDeltas, targetTrackId } = tx;
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
          const delta = clipDeltas[c.id];
          return {
            ...c,
            start: Math.max(0, Number((c.start + delta).toFixed(3))),
          };
        }
        return c;
      });
      return { tracks, clips: updatedClips };
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
      return { tracks, clips: updatedClips };
    }

    case 'GROUP_CLIPS': {
      const { groupId, clipIds } = tx;
      const updatedClips = clips.map((c) =>
        clipIds.includes(c.id) ? { ...c, groupId } : c
      );
      return { tracks, clips: updatedClips };
    }

    case 'UNGROUP_CLIPS': {
      const { clipIds } = tx;
      const updatedClips = clips.map((c) =>
        clipIds.includes(c.id) ? { ...c, groupId: null } : c
      );
      return { tracks, clips: updatedClips };
    }

    case 'TRACK_VISIBILITY': {
      const { trackId, hidden } = tx;
      const updatedTracks = tracks.map((t) =>
        t.id === trackId ? { ...t, hidden } : t
      );
      return { tracks: updatedTracks, clips };
    }

    case 'TRACK_LOCK': {
      const { trackId, locked } = tx;
      const updatedTracks = tracks.map((t) =>
        t.id === trackId ? { ...t, locked } : t
      );
      return { tracks: updatedTracks, clips };
    }

    case 'DELETE_CLIPS': {
      const { deletedClips } = tx;
      const deleteIds = new Set(deletedClips.map((c) => c.id));
      return {
        tracks,
        clips: clips.filter((c) => !deleteIds.has(c.id)),
      };
    }

    case 'UPDATE_CLIP': {
      const { clipId, after } = tx;
      const updatedClips = clips.map((c) =>
        c.id === clipId ? { ...c, ...after } : c
      );
      return { tracks, clips: updatedClips };
    }
  }
}

export function applyInverseTransaction(
  tx: TimelineTransaction,
  tracks: Track[],
  clips: Clip[]
): { tracks: Track[]; clips: Clip[] } {
  switch (tx.type) {
    case 'MOVE_CLIPS': {
      const { primaryClipId, clipDeltas, initialTrackId } = tx;
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
          const delta = clipDeltas[c.id];
          return {
            ...c,
            start: Math.max(0, Number((c.start - delta).toFixed(3))),
          };
        }
        return c;
      });
      return { tracks, clips: updatedClips };
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
      return { tracks, clips: updatedClips };
    }

    case 'GROUP_CLIPS': {
      const { clipIds } = tx;
      const updatedClips = clips.map((c) =>
        clipIds.includes(c.id) ? { ...c, groupId: null } : c
      );
      return { tracks, clips: updatedClips };
    }

    case 'UNGROUP_CLIPS': {
      const { groupId, clipIds } = tx;
      const updatedClips = clips.map((c) =>
        clipIds.includes(c.id) ? { ...c, groupId } : c
      );
      return { tracks, clips: updatedClips };
    }

    case 'TRACK_VISIBILITY': {
      const { trackId, hidden } = tx;
      const updatedTracks = tracks.map((t) =>
        t.id === trackId ? { ...t, hidden: !hidden } : t
      );
      return { tracks: updatedTracks, clips };
    }

    case 'TRACK_LOCK': {
      const { trackId, locked } = tx;
      const updatedTracks = tracks.map((t) =>
        t.id === trackId ? { ...t, locked: !locked } : t
      );
      return { tracks: updatedTracks, clips };
    }

    case 'DELETE_CLIPS': {
      const { deletedClips } = tx;
      return {
        tracks,
        clips: [...clips, ...deletedClips],
      };
    }

    case 'UPDATE_CLIP': {
      const { clipId, before } = tx;
      const updatedClips = clips.map((c) =>
        c.id === clipId ? { ...c, ...before } : c
      );
      return { tracks, clips: updatedClips };
    }
  }
}
