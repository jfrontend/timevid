import React from 'react';
import {
  Sliders,
  Link2,
  Unlink,
  Trash2,
  Clock,
  Layers,
  Sparkles,
  Info,
  CheckCircle2,
} from 'lucide-react';
import { useTimelineStore } from '../store/timelineStore';
import { formatTimecode, formatSeconds } from '../utils/time';

export const Inspector: React.FC = () => {
  const {
    clips,
    tracks,
    selectedClipIds,
    updateClip,
    groupSelectedClips,
    ungroupSelectedClips,
    deleteSelectedClips,
    zoom,
    isSnapEnabled,
    isRippleEnabled,
  } = useTimelineStore();

  const selectedClips = clips.filter((c) => selectedClipIds.includes(c.id));

  // Single clip selected
  if (selectedClips.length === 1) {
    const clip = selectedClips[0];
    const track = tracks.find((t) => t.id === clip.trackId);
    const validTracks = tracks.filter((t) => t.type === clip.type);
    const endTime = clip.start + clip.duration;

    const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      updateClip(clip.id, { name: e.target.value });
    };

    const handleTrackChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      updateClip(clip.id, { trackId: e.target.value });
    };

    const handleStartChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = parseFloat(e.target.value);
      if (!isNaN(val) && val >= 0) {
        updateClip(clip.id, { start: Number(val.toFixed(2)) });
      }
    };

    const handleDurationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = parseFloat(e.target.value);
      if (!isNaN(val) && val >= 0.5) {
        updateClip(clip.id, { duration: Number(val.toFixed(2)) });
      }
    };

    const handleEndChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = parseFloat(e.target.value);
      if (!isNaN(val) && val > clip.start + 0.5) {
        updateClip(clip.id, { duration: Number((val - clip.start).toFixed(2)) });
      }
    };

    return (
      <aside className="w-80 bg-editor-panel border-l border-editor-border flex flex-col select-none overflow-y-auto">
        {/* Header */}
        <div className="h-12 px-4 border-b border-editor-border flex items-center justify-between">
          <div className="flex items-center space-x-2 text-xs font-semibold uppercase tracking-wider text-slate-200">
            <Sliders className="w-4 h-4 text-sky-400" />
            <span>Clip Inspector</span>
          </div>
          <span
            className="text-[10px] font-mono px-2 py-0.5 rounded uppercase font-semibold text-white"
            style={{ backgroundColor: clip.color }}
          >
            {clip.type}
          </span>
        </div>

        {/* Content */}
        <div className="p-4 space-y-5 text-xs">
          {/* Clip Name */}
          <div className="space-y-1.5">
            <label className="text-editor-textMuted font-medium block">Clip Name</label>
            <input
              type="text"
              value={clip.name}
              onChange={handleNameChange}
              disabled={track?.locked}
              className="w-full bg-editor-subpanel border border-editor-border rounded px-2.5 py-1.5 text-editor-textMain focus:outline-none focus:border-sky-500 disabled:opacity-50"
            />
          </div>

          {/* Track selector */}
          <div className="space-y-1.5">
            <label className="text-editor-textMuted font-medium block">Assigned Track</label>
            <select
              value={clip.trackId}
              onChange={handleTrackChange}
              disabled={track?.locked}
              className="w-full bg-editor-subpanel border border-editor-border rounded px-2.5 py-1.5 text-editor-textMain focus:outline-none focus:border-sky-500 disabled:opacity-50"
            >
              {validTracks.map((t) => (
                <option key={t.id} value={t.id} disabled={t.locked}>
                  {t.name} {t.locked ? '(Locked)' : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="h-[1px] bg-editor-border" />

          {/* Timing Coordinates */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-editor-textMuted font-medium">
              <span className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-sky-400" />
                <span>Canonical Timing</span>
              </span>
              <span className="font-mono text-[10px] text-sky-400">Seconds</span>
            </div>

            {/* Start & End Inputs */}
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <span className="text-[11px] text-editor-textMuted">Start Time</span>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={clip.start}
                  onChange={handleStartChange}
                  disabled={track?.locked}
                  className="w-full bg-editor-subpanel border border-editor-border rounded px-2 py-1 font-mono text-editor-textMain focus:outline-none focus:border-sky-500 disabled:opacity-50"
                />
                <span className="text-[10px] font-mono text-editor-textMuted block">
                  {formatTimecode(clip.start)}
                </span>
              </div>

              <div className="space-y-1">
                <span className="text-[11px] text-editor-textMuted">End Time</span>
                <input
                  type="number"
                  step="0.1"
                  min="0.5"
                  value={Number(endTime.toFixed(2))}
                  onChange={handleEndChange}
                  disabled={track?.locked}
                  className="w-full bg-editor-subpanel border border-editor-border rounded px-2 py-1 font-mono text-editor-textMain focus:outline-none focus:border-sky-500 disabled:opacity-50"
                />
                <span className="text-[10px] font-mono text-editor-textMuted block">
                  {formatTimecode(endTime)}
                </span>
              </div>
            </div>

            {/* Duration Input */}
            <div className="space-y-1">
              <span className="text-[11px] text-editor-textMuted">Duration</span>
              <input
                type="number"
                step="0.1"
                min="0.5"
                value={clip.duration}
                onChange={handleDurationChange}
                disabled={track?.locked}
                className="w-full bg-editor-subpanel border border-editor-border rounded px-2.5 py-1 font-mono text-editor-textMain focus:outline-none focus:border-sky-500 disabled:opacity-50"
              />
              <span className="text-[10px] font-mono text-editor-textMuted block">
                Total: {formatSeconds(clip.duration)}
              </span>
            </div>
          </div>

          <div className="h-[1px] bg-editor-border" />

          {/* Group Status */}
          <div className="space-y-2">
            <label className="text-editor-textMuted font-medium block">Grouping</label>
            {clip.groupId ? (
              <div className="bg-amber-500/10 border border-amber-500/30 rounded p-2.5 space-y-2">
                <div className="flex items-center space-x-1.5 text-amber-300 font-medium">
                  <Link2 className="w-3.5 h-3.5" />
                  <span>Grouped Clip</span>
                </div>
                <div className="text-[11px] text-editor-textMuted font-mono truncate">
                  ID: {clip.groupId}
                </div>
                <button
                  onClick={ungroupSelectedClips}
                  disabled={track?.locked}
                  className="w-full flex items-center justify-center space-x-1 py-1 rounded bg-editor-subpanel hover:bg-editor-border border border-editor-border text-slate-200 transition-colors text-xs"
                >
                  <Unlink className="w-3.5 h-3.5" />
                  <span>Ungroup Clip</span>
                </button>
              </div>
            ) : (
              <div className="text-[11px] text-editor-textMuted bg-editor-subpanel p-2 rounded border border-editor-border flex items-center justify-between">
                <span>Not grouped</span>
                <span className="text-[10px] text-slate-500">Multi-select to group</span>
              </div>
            )}
          </div>

          {/* Delete Action */}
          <div className="pt-2">
            <button
              onClick={deleteSelectedClips}
              disabled={track?.locked}
              className="w-full flex items-center justify-center space-x-1.5 py-1.5 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 transition-colors text-xs disabled:opacity-40"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Clip</span>
            </button>
          </div>
        </div>
      </aside>
    );
  }

  // Multiple clips selected
  if (selectedClips.length > 1) {
    const isAllGroupedTogether =
      selectedClips[0].groupId &&
      selectedClips.every((c) => c.groupId === selectedClips[0].groupId);

    const minStart = Math.min(...selectedClips.map((c) => c.start));
    const maxEnd = Math.max(...selectedClips.map((c) => c.start + c.duration));
    const totalSpan = maxEnd - minStart;

    return (
      <aside className="w-80 bg-editor-panel border-l border-editor-border flex flex-col select-none overflow-y-auto">
        <div className="h-12 px-4 border-b border-editor-border flex items-center justify-between">
          <div className="flex items-center space-x-2 text-xs font-semibold uppercase tracking-wider text-slate-200">
            <Layers className="w-4 h-4 text-sky-400" />
            <span>Multi-Selection</span>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 font-semibold border border-sky-500/30">
            {selectedClips.length} Clips
          </span>
        </div>

        <div className="p-4 space-y-5 text-xs">
          {/* Summary Box */}
          <div className="bg-editor-subpanel p-3 rounded-lg border border-editor-border space-y-2">
            <div className="flex justify-between text-editor-textMuted">
              <span>Combined Start:</span>
              <span className="font-mono text-slate-200">{formatTimecode(minStart)}</span>
            </div>
            <div className="flex justify-between text-editor-textMuted">
              <span>Combined End:</span>
              <span className="font-mono text-slate-200">{formatTimecode(maxEnd)}</span>
            </div>
            <div className="flex justify-between text-editor-textMuted">
              <span>Total Span:</span>
              <span className="font-mono text-sky-400 font-semibold">
                {formatSeconds(totalSpan)}
              </span>
            </div>
          </div>

          {/* Grouping Actions */}
          <div className="space-y-2">
            <label className="text-editor-textMuted font-medium block">Group Management</label>
            {isAllGroupedTogether ? (
              <button
                onClick={ungroupSelectedClips}
                className="w-full flex items-center justify-center space-x-1.5 py-2 rounded bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/40 transition-colors font-medium"
              >
                <Unlink className="w-4 h-4" />
                <span>Ungroup Selected ({selectedClips.length})</span>
              </button>
            ) : (
              <button
                onClick={groupSelectedClips}
                className="w-full flex items-center justify-center space-x-1.5 py-2 rounded bg-sky-500/20 text-sky-300 hover:bg-sky-500/30 border border-sky-500/40 transition-colors font-medium shadow-sm"
              >
                <Link2 className="w-4 h-4" />
                <span>Group Selected Clips</span>
              </button>
            )}
          </div>

          {/* Clip List */}
          <div className="space-y-1.5">
            <label className="text-editor-textMuted font-medium block">Selected Items</label>
            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              {selectedClips.map((c) => {
                const track = tracks.find((t) => t.id === c.trackId);
                return (
                  <div
                    key={c.id}
                    className="flex items-center justify-between p-2 rounded bg-editor-subpanel border border-editor-border text-[11px]"
                  >
                    <div className="flex items-center space-x-2 truncate">
                      <div
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: c.color }}
                      />
                      <span className="font-medium text-slate-200 truncate">{c.name}</span>
                      <span className="text-[10px] text-editor-textMuted">({track?.name})</span>
                    </div>
                    <span className="font-mono text-editor-textMuted shrink-0">
                      {formatSeconds(c.duration)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Delete All Selected */}
          <div className="pt-2">
            <button
              onClick={deleteSelectedClips}
              className="w-full flex items-center justify-center space-x-1.5 py-1.5 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 transition-colors text-xs"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Selected Clips</span>
            </button>
          </div>
        </div>
      </aside>
    );
  }

  // Nothing selected: Show Project Overview
  return (
    <aside className="w-80 bg-editor-panel border-l border-editor-border flex flex-col select-none overflow-y-auto">
      <div className="h-12 px-4 border-b border-editor-border flex items-center space-x-2 text-xs font-semibold uppercase tracking-wider text-slate-200">
        <Info className="w-4 h-4 text-sky-400" />
        <span>Project Overview</span>
      </div>

      <div className="p-4 space-y-5 text-xs">
        <div className="bg-editor-subpanel p-3.5 rounded-lg border border-editor-border space-y-3">
          <div className="flex justify-between items-center text-editor-textMuted">
            <span>Total Tracks</span>
            <span className="font-mono font-semibold text-slate-200">{tracks.length}</span>
          </div>
          <div className="flex justify-between items-center text-editor-textMuted">
            <span>Total Clips</span>
            <span className="font-mono font-semibold text-slate-200">{clips.length}</span>
          </div>
          <div className="flex justify-between items-center text-editor-textMuted">
            <span>Zoom Scale</span>
            <span className="font-mono font-semibold text-sky-400">{Math.round(zoom * 100)}%</span>
          </div>
          <div className="flex justify-between items-center text-editor-textMuted">
            <span>Snapping Mode</span>
            <span
              className={`font-semibold ${isSnapEnabled ? 'text-amber-400' : 'text-slate-500'}`}
            >
              {isSnapEnabled ? 'Active' : 'Disabled'}
            </span>
          </div>
          <div className="flex justify-between items-center text-editor-textMuted">
            <span>Ripple Movement</span>
            <span
              className={`font-semibold ${isRippleEnabled ? 'text-emerald-400' : 'text-slate-500'}`}
            >
              {isRippleEnabled ? 'Active' : 'Disabled'}
            </span>
          </div>
        </div>

        <div className="bg-sky-500/10 border border-sky-500/20 rounded-lg p-3 space-y-1.5">
          <div className="text-sky-300 font-semibold flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Deterministic Timeline</span>
          </div>
          <p className="text-[11px] text-editor-textMuted leading-relaxed">
            Select clips to inspect canonical start, end, and duration. Drag clips horizontally or
            between tracks, use resize handles, group clips, or toggle track lock and visibility.
          </p>
        </div>
      </div>
    </aside>
  );
};
