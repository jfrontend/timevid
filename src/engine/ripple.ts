import { Clip } from '../types/timeline';

export function calculateRippleDragShift(
  clips: Clip[],
  primaryClipId: string,
  targetTrackId: string,
  originalEnd: number,
  shiftDelta: number
): Record<string, number> {
  const rippleShifts: Record<string, number> = {};

  clips.forEach((c) => {
    if (c.id === primaryClipId) return;
    if (c.trackId === targetTrackId && c.start >= originalEnd - 0.001) {
      rippleShifts[c.id] = shiftDelta;
    }
  });

  return rippleShifts;
}

export function calculateRippleTrimShift(
  clips: Clip[],
  primaryClipId: string,
  trackId: string,
  originalEnd: number,
  durationDelta: number
): Record<string, number> {
  const rippleShifts: Record<string, number> = {};

  clips.forEach((c) => {
    if (c.id === primaryClipId) return;
    if (c.trackId === trackId && c.start >= originalEnd - 0.001) {
      rippleShifts[c.id] = durationDelta;
    }
  });

  return rippleShifts;
}
