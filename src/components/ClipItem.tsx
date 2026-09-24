import React from 'react';
import { Link2, Lock, Video, Music } from 'lucide-react';
import { Clip, Track } from '../types/timeline';
import { useTimelineStore } from '../store/timelineStore';
import { timeToPixel, formatSeconds } from '../utils/time';

interface ClipItemProps {
  clip: Clip;
  track: Track;
}

export const ClipItem: React.FC<ClipItemProps> = ({ clip, track }) => {
  const {
    zoom,
    selectedClipIds,
    selectClip,
    startDrag,
    dragState,
  } = useTimelineStore();

  const isSelected = selectedClipIds.includes(clip.id);
  const isDraggingThis = dragState?.primaryClipId === clip.id;
  const isLocked = track.locked;

  const leftPx = timeToPixel(clip.start, zoom);
  const widthPx = Math.max(16, timeToPixel(clip.duration, zoom));

  const handlePointerDown = (e: React.PointerEvent) => {
    if (isLocked) return;
    e.stopPropagation();

    const isMulti = e.shiftKey || e.metaKey || e.ctrlKey;
    selectClip(clip.id, isMulti);

    startDrag('move', clip.id, e.clientX, e.clientY, track.id);
  };

  const handleResizeLeft = (e: React.PointerEvent) => {
    if (isLocked) return;
    e.stopPropagation();
    selectClip(clip.id, false);
    startDrag('resize-left', clip.id, e.clientX, e.clientY, track.id);
  };

  const handleResizeRight = (e: React.PointerEvent) => {
    if (isLocked) return;
    e.stopPropagation();
    selectClip(clip.id, false);
    startDrag('resize-right', clip.id, e.clientX, e.clientY, track.id);
  };

  const isVideo = clip.type === 'video';

  return (
    <div
      style={{
        left: `${leftPx}px`,
        width: `${widthPx}px`,
      }}
      onPointerDown={handlePointerDown}
      className={`absolute top-1.5 bottom-1.5 rounded-md select-none overflow-hidden transition-shadow flex flex-col justify-between ${
        isLocked ? 'cursor-not-allowed opacity-70' : 'cursor-grab active:cursor-grabbing'
      } ${
        isSelected
          ? 'ring-2 ring-white shadow-lg shadow-sky-500/20 z-10'
          : 'ring-1 ring-white/10 hover:ring-white/30 z-0'
      }`}
      style-extra=""
    >
      {/* Clip Background with subtle gradient */}
      <div
        className="absolute inset-0 opacity-90"
        style={{
          background: isVideo
            ? `linear-gradient(135deg, ${clip.color} 0%, #1e293b 100%)`
            : `linear-gradient(135deg, ${clip.color} 0%, #064e3b 100%)`,
        }}
      />

      {/* Decorative Waveform or Filmstrip ticks */}
      <div className="absolute inset-0 pointer-events-none opacity-20 overflow-hidden flex items-center">
        {isVideo ? (
          <div className="w-full flex justify-between px-1 text-[8px] text-white/50 tracking-widest font-mono">
            {Array.from({ length: Math.max(1, Math.floor(widthPx / 30)) }).map((_, i) => (
              <span key={i}>▪</span>
            ))}
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-around px-1">
            {Array.from({ length: Math.max(1, Math.floor(widthPx / 6)) }).map((_, i) => (
              <div
                key={i}
                className="w-[2px] bg-white rounded-full"
                style={{ height: `${20 + (i % 5) * 12}%` }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Top Header inside clip */}
      <div className="relative px-2 pt-1 flex items-center justify-between text-white z-10">
        <div className="flex items-center space-x-1.5 overflow-hidden">
          {isVideo ? (
            <Video className="w-3 h-3 text-sky-200 shrink-0" />
          ) : (
            <Music className="w-3 h-3 text-emerald-200 shrink-0" />
          )}
          <span className="text-xs font-semibold truncate tracking-tight text-white drop-shadow-sm">
            {clip.name}
          </span>
        </div>

        {/* Group Indicator Badge */}
        {clip.groupId && (
          <div
            title={`Grouped (${clip.groupId})`}
            className="flex items-center space-x-0.5 px-1 py-0.5 bg-black/40 rounded text-[9px] font-mono text-amber-300 border border-amber-400/30 shrink-0 ml-1"
          >
            <Link2 className="w-2.5 h-2.5" />
            <span className="hidden sm:inline">GRP</span>
          </div>
        )}
      </div>

      {/* Bottom info inside clip */}
      <div className="relative px-2 pb-1 flex items-center justify-between text-[10px] text-white/80 font-mono z-10">
        <span className="bg-black/30 px-1 rounded text-[9px]">
          {formatSeconds(clip.duration)}
        </span>
        {isLocked && <Lock className="w-3 h-3 text-amber-300" />}
      </div>

      {/* Left Resize Handle */}
      {!isLocked && (
        <div
          onPointerDown={handleResizeLeft}
          title="Drag to trim start"
          className="absolute left-0 top-0 bottom-0 w-2.5 hover:w-3 cursor-ew-resize bg-black/10 hover:bg-white/40 transition-colors z-20 flex items-center justify-center group"
        >
          <div className="w-[1.5px] h-3 bg-white/60 rounded-full group-hover:bg-white" />
        </div>
      )}

      {/* Right Resize Handle */}
      {!isLocked && (
        <div
          onPointerDown={handleResizeRight}
          title="Drag to trim end"
          className="absolute right-0 top-0 bottom-0 w-2.5 hover:w-3 cursor-ew-resize bg-black/10 hover:bg-white/40 transition-colors z-20 flex items-center justify-center group"
        >
          <div className="w-[1.5px] h-3 bg-white/60 rounded-full group-hover:bg-white" />
        </div>
      )}
    </div>
  );
};
