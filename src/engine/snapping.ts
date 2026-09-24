import { Clip, SnapTarget } from '../types/timeline';
import { formatTimecode } from './coordinates';

export interface SnapCandidateEdge {
  clipId: string;
  edge: 'start' | 'end';
  candidateTime: number;
  initialTime: number;
}

export interface SnapResult {
  hasSnapped: boolean;
  snappedDelta: number;
  guide: { time: number; label: string } | null;
  target: SnapTarget | null;
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

export function evaluateSnapCandidates(
  candidates: SnapCandidateEdge[],
  targets: SnapTarget[],
  thresholdTime: number
): SnapResult {
  let closestTarget: SnapTarget | null = null;
  let minDiff = Infinity;
  let bestDelta = 0;

  for (const c of candidates) {
    for (const target of targets) {
      const diff = Math.abs(c.candidateTime - target.time);
      if (diff <= thresholdTime && diff < minDiff) {
        minDiff = diff;
        closestTarget = target;
        bestDelta = target.time - c.initialTime;
      }
    }
  }

  if (closestTarget) {
    return {
      hasSnapped: true,
      snappedDelta: bestDelta,
      guide: { time: closestTarget.time, label: closestTarget.label },
      target: closestTarget,
    };
  }

  return {
    hasSnapped: false,
    snappedDelta: 0,
    guide: null,
    target: null,
  };
}
