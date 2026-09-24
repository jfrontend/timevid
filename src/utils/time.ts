import { BASE_PIXELS_PER_SECOND } from '../constants/initialData';
import { Clip, SnapTarget } from '../types/timeline';

export function timeToPixel(time: number, zoom: number): number {
  return time * BASE_PIXELS_PER_SECOND * zoom;
}

export function pixelToTime(pixels: number, zoom: number): number {
  return pixels / (BASE_PIXELS_PER_SECOND * zoom);
}

export function formatTimecode(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) seconds = 0;
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const millis = Math.floor((seconds % 1) * 100);

  const mm = String(mins).padStart(2, '0');
  const ss = String(secs).padStart(2, '0');
  const ms = String(millis).padStart(2, '0');
  return `${mm}:${ss}.${ms}`;
}

export function formatSeconds(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) seconds = 0;
  return `${seconds.toFixed(2)}s`;
}

export function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

export function findSnapTargets(
  allClips: Clip[],
  excludedClipIds: Set<string>,
  playheadTime: number,
  maxTime: number
): SnapTarget[] {
  const targets: SnapTarget[] = [
    { time: 0, label: '00:00.00 (Start)', type: 'origin' },
    { time: playheadTime, label: `Playhead (${formatTimecode(playheadTime)})`, type: 'playhead' },
  ];

  // Clips start and end
  for (const clip of allClips) {
    if (excludedClipIds.has(clip.id)) continue;
    targets.push({
      time: clip.start,
      label: `${clip.name} Start`,
      type: 'clip-start',
    });
    targets.push({
      time: clip.start + clip.duration,
      label: `${clip.name} End`,
      type: 'clip-end',
    });
  }

  // Ruler ticks (every 1 second up to maxTime)
  const step = 1;
  for (let t = 1; t <= maxTime; t += step) {
    targets.push({
      time: t,
      label: `${t}s Tick`,
      type: 'ruler',
    });
  }

  return targets;
}

export function getBestSnap(
  candidateTimes: number[],
  targets: SnapTarget[],
  thresholdSeconds: number
): { snappedTime: number; target: SnapTarget | null; delta: number } {
  let closestTarget: SnapTarget | null = null;
  let minDiff = Infinity;
  let bestCandidateTime = candidateTimes[0] ?? 0;
  let bestDelta = 0;

  for (const cTime of candidateTimes) {
    for (const target of targets) {
      const diff = Math.abs(cTime - target.time);
      if (diff <= thresholdSeconds && diff < minDiff) {
        minDiff = diff;
        closestTarget = target;
        bestCandidateTime = cTime;
        bestDelta = target.time - cTime;
      }
    }
  }

  if (closestTarget) {
    return {
      snappedTime: closestTarget.time,
      target: closestTarget,
      delta: bestDelta,
    };
  }

  return {
    snappedTime: candidateTimes[0] ?? 0,
    target: null,
    delta: 0,
  };
}
