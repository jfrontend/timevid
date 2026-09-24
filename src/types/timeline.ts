export type TrackType = 'video' | 'audio';

export interface Track {
  id: string;
  name: string;
  type: TrackType;
  hidden: boolean;
  locked: boolean;
  color?: string;
}

export interface Clip {
  id: string;
  name: string;
  trackId: string;
  start: number; // in canonical seconds
  duration: number; // in canonical seconds
  groupId: string | null;
  type: TrackType;
  color: string;
}

export interface SnapTarget {
  time: number;
  label: string;
  type: 'playhead' | 'clip-start' | 'clip-end' | 'ruler' | 'origin';
}

export type TimelineTransaction =
  | {
      type: 'MOVE_CLIPS';
      primaryClipId: string;
      clipDeltas: Record<string, number>;
      initialTrackId: string;
      targetTrackId: string;
      capturedZoom: number;
      isGroupMove: boolean;
    }
  | {
      type: 'RESIZE_CLIP';
      clipId: string;
      edge: 'left' | 'right';
      deltaStart: number;
      deltaDuration: number;
      rippleDeltas?: Record<string, number>;
    }
  | {
      type: 'GROUP_CLIPS';
      groupId: string;
      clipIds: string[];
    }
  | {
      type: 'UNGROUP_CLIPS';
      groupId: string;
      clipIds: string[];
    }
  | {
      type: 'TRACK_VISIBILITY';
      trackId: string;
      hidden: boolean;
    }
  | {
      type: 'TRACK_LOCK';
      trackId: string;
      locked: boolean;
    }
  | {
      type: 'DELETE_CLIPS';
      deletedClips: Clip[];
    }
  | {
      type: 'UPDATE_CLIP';
      clipId: string;
      before: Partial<Clip>;
      after: Partial<Clip>;
    };

export type DragMode = 'move' | 'resize-left' | 'resize-right';

export interface DragState {
  mode: DragMode;
  primaryClipId: string;
  initialClips: Record<string, Clip>;
  startPointerX: number;
  startPointerY: number;
  currentPointerX: number;
  currentPointerY: number;
  initialTrackId: string;
  hoverTrackId: string;
}
