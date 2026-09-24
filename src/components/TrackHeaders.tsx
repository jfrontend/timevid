import React from 'react';
import { Eye, EyeOff, Lock, Unlock, Video, Music, Layers } from 'lucide-react';
import { useTimelineStore } from '../store/timelineStore';
import { TRACK_HEIGHT, RULER_HEIGHT, TRACK_HEADER_WIDTH } from '../constants/initialData';

export const TrackHeaders: React.FC = () => {
  const { tracks, toggleTrackHidden, toggleTrackLocked } = useTimelineStore();

  return (
    <div
      style={{ width: `${TRACK_HEADER_WIDTH}px` }}
      className="shrink-0 bg-editor-panel border-r border-editor-border flex flex-col select-none z-10"
    >
      {/* Align with TimeRuler */}
      <div
        style={{ height: `${RULER_HEIGHT}px` }}
        className="px-3 border-b border-editor-border bg-editor-rulerBg flex items-center justify-between text-[11px] font-semibold text-editor-textMuted uppercase tracking-wider"
      >
        <span className="flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5 text-sky-400" />
          <span>Tracks ({tracks.length})</span>
        </span>
      </div>

      {/* Track rows */}
      <div className="flex flex-col">
        {tracks.map((track) => {
          const isVideo = track.type === 'video';

          return (
            <div
              key={track.id}
              style={{ height: `${TRACK_HEIGHT}px` }}
              className={`px-3 border-b border-editor-border flex items-center justify-between transition-colors ${
                track.hidden
                  ? 'bg-slate-900/40 opacity-50'
                  : track.locked
                  ? 'bg-amber-950/10'
                  : 'bg-editor-panel hover:bg-editor-subpanel/50'
              }`}
            >
              {/* Left track info */}
              <div className="flex items-center space-x-2.5 overflow-hidden">
                <div
                  className="w-6 h-6 rounded flex items-center justify-center shrink-0 text-white shadow-sm"
                  style={{ backgroundColor: track.color || (isVideo ? '#0284c7' : '#059669') }}
                >
                  {isVideo ? <Video className="w-3.5 h-3.5" /> : <Music className="w-3.5 h-3.5" />}
                </div>

                <div className="flex flex-col truncate">
                  <span className="text-xs font-medium text-editor-textMain truncate">
                    {track.name}
                  </span>
                  <span className="text-[10px] text-editor-textMuted uppercase font-mono">
                    {track.type}
                  </span>
                </div>
              </div>

              {/* Right controls (Hide / Lock) */}
              <div className="flex items-center space-x-1 shrink-0">
                {/* Hide / Show */}
                <button
                  onClick={() => toggleTrackHidden(track.id)}
                  title={track.hidden ? 'Show Track' : 'Hide Track'}
                  className={`p-1.5 rounded hover:bg-slate-800 transition-colors ${
                    track.hidden
                      ? 'text-rose-400 bg-rose-500/10'
                      : 'text-editor-textMuted hover:text-slate-200'
                  }`}
                >
                  {track.hidden ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>

                {/* Lock / Unlock */}
                <button
                  onClick={() => toggleTrackLocked(track.id)}
                  title={track.locked ? 'Unlock Track' : 'Lock Track'}
                  className={`p-1.5 rounded hover:bg-slate-800 transition-colors ${
                    track.locked
                      ? 'text-amber-400 bg-amber-500/10'
                      : 'text-editor-textMuted hover:text-slate-200'
                  }`}
                >
                  {track.locked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
