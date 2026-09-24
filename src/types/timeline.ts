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

export interface GroupState {
  anchorId: string;
  memberOffsets: Record<string, number>; // relative offset in rendered timeline space
}

export interface SnapTarget {
  time: number;
  label: string;
  type: 'playhead' | 'clip-start' | 'clip-end' | 'ruler' | 'origin';
}

export interface HistorySnapshot {
  tracks: Track[];
  clips: Clip[];
  selectedClipIds: string[];
  groupStates: Record<string, GroupState>;
}

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
