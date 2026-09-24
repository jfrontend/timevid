import { Clip, Track } from '../types/timeline';

export function resolveGroupSelection(
  clips: Clip[],
  targetClipId: string,
  multiSelect: boolean,
  currentSelection: string[]
): string[] {
  const targetClip = clips.find((c) => c.id === targetClipId);
  if (!targetClip) return currentSelection;

  let idsToAdd = [targetClipId];
  if (targetClip.groupId) {
    idsToAdd = clips.filter((c) => c.groupId === targetClip.groupId).map((c) => c.id);
  }

  if (multiSelect) {
    const currentSet = new Set(currentSelection);
    const allPresent = idsToAdd.every((id) => currentSet.has(id));
    if (allPresent) {
      idsToAdd.forEach((id) => currentSet.delete(id));
    } else {
      idsToAdd.forEach((id) => currentSet.add(id));
    }
    return Array.from(currentSet);
  }

  return idsToAdd;
}

export function createGroup(
  clips: Clip[],
  selectedIds: string[],
  tracks: Track[]
): { newClips: Clip[]; groupId: string } | null {
  if (selectedIds.length < 2) return null;

  const unlockedSelected = selectedIds.filter((id) => {
    const c = clips.find((item) => item.id === id);
    const t = tracks.find((track) => track.id === c?.trackId);
    return !t?.locked;
  });

  if (unlockedSelected.length < 2) return null;

  const groupId = `group-${Date.now()}`;
  const newClips = clips.map((c) =>
    unlockedSelected.includes(c.id) ? { ...c, groupId } : c
  );

  return { newClips, groupId };
}

export function ungroupSelected(
  clips: Clip[],
  selectedIds: string[]
): { newClips: Clip[]; affectedGroupId: string | null } {
  const targetClip = clips.find((c) => selectedIds.includes(c.id) && c.groupId);
  if (!targetClip || !targetClip.groupId) {
    return { newClips: clips, affectedGroupId: null };
  }

  const groupId = targetClip.groupId;
  const affectedClipIds = clips.filter((c) => c.groupId === groupId).map((c) => c.id);

  const newClips = clips.map((c) =>
    affectedClipIds.includes(c.id) ? { ...c, groupId: null } : c
  );

  return { newClips, affectedGroupId: groupId };
}

export function calculateGroupMovement(
  initialClips: Record<string, Clip>,
  primaryClipId: string,
  effectiveDelta: number,
  currentTrackId: string | undefined,
  tracks: Track[]
): {
  clipUpdates: Record<string, { start: number; trackId: string }>;
  minStart: number;
} {
  const primaryInitial = initialClips[primaryClipId];
  let targetTrackId = primaryInitial.trackId;

  // Single clip can change track
  if (currentTrackId && Object.keys(initialClips).length === 1) {
    const candidateTrack = tracks.find((t) => t.id === currentTrackId);
    if (candidateTrack && !candidateTrack.locked && candidateTrack.type === primaryInitial.type) {
      targetTrackId = currentTrackId;
    }
  }

  // Enforce global boundary: no clip can start before 0
  let minStartAcrossAll = Infinity;
  Object.values(initialClips).forEach((c) => {
    if (c.start + effectiveDelta < minStartAcrossAll) {
      minStartAcrossAll = c.start + effectiveDelta;
    }
  });

  let adjustedDelta = effectiveDelta;
  if (minStartAcrossAll < 0) {
    adjustedDelta -= minStartAcrossAll;
  }

  const clipUpdates: Record<string, { start: number; trackId: string }> = {};
  Object.keys(initialClips).forEach((id) => {
    const init = initialClips[id];
    clipUpdates[id] = {
      start: Math.max(0, Number((init.start + adjustedDelta).toFixed(3))),
      trackId: id === primaryClipId ? targetTrackId : init.trackId,
    };
  });

  return { clipUpdates, minStart: minStartAcrossAll };
}
