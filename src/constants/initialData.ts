import { Track, Clip } from '../types/timeline';

export const INITIAL_TRACKS: Track[] = [
  {
    id: 'track-v1',
    name: 'Video 1',
    type: 'video',
    hidden: false,
    locked: false,
    color: '#0284c7',
  },
  {
    id: 'track-v2',
    name: 'Video 2',
    type: 'video',
    hidden: false,
    locked: false,
    color: '#6366f1',
  },
  {
    id: 'track-a1',
    name: 'Audio 1',
    type: 'audio',
    hidden: false,
    locked: false,
    color: '#059669',
  },
  {
    id: 'track-a2',
    name: 'Audio 2',
    type: 'audio',
    hidden: false,
    locked: false,
    color: '#d97706',
  },
];

export const INITIAL_CLIPS: Clip[] = [
  {
    id: 'clip-intro',
    name: 'Intro',
    trackId: 'track-v1',
    start: 0,
    duration: 4,
    groupId: null,
    type: 'video',
    color: '#0ea5e9',
  },
  {
    id: 'clip-interview',
    name: 'Interview',
    trackId: 'track-v1',
    start: 4,
    duration: 12,
    groupId: null,
    type: 'video',
    color: '#38bdf8',
  },
  {
    id: 'clip-broll',
    name: 'B-roll',
    trackId: 'track-v1',
    start: 16,
    duration: 8,
    groupId: null,
    type: 'video',
    color: '#0284c7',
  },
  {
    id: 'clip-overlay',
    name: 'Overlay',
    trackId: 'track-v2',
    start: 6,
    duration: 6,
    groupId: null,
    type: 'video',
    color: '#818cf8',
  },
  {
    id: 'clip-music',
    name: 'Music',
    trackId: 'track-a1',
    start: 0,
    duration: 26,
    groupId: null,
    type: 'audio',
    color: '#10b981',
  },
  {
    id: 'clip-voice',
    name: 'Voice',
    trackId: 'track-a2',
    start: 8,
    duration: 10,
    groupId: null,
    type: 'audio',
    color: '#f59e0b',
  },
];

export const BASE_PIXELS_PER_SECOND = 40;
export const MIN_CLIP_DURATION = 0.5; // seconds
export const DEFAULT_TOTAL_DURATION = 35; // seconds
export const TRACK_HEIGHT = 64; // pixels
export const RULER_HEIGHT = 36; // pixels
export const TRACK_HEADER_WIDTH = 220; // pixels
