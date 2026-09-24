import React, { useEffect } from 'react';
import {
  Play,
  Pause,
  Undo2,
  Redo2,
  ZoomIn,
  ZoomOut,
  Magnet,
  Maximize2,
  RotateCcw,
  Sparkles,
  Layers,
  ArrowRightLeft,
} from 'lucide-react';
import { useTimelineStore } from '../store/timelineStore';
import { formatTimecode } from '../utils/time';

export const Header: React.FC = () => {
  const {
    zoom,
    setZoom,
    currentTime,
    setCurrentTime,
    isPlaying,
    togglePlay,
    isSnapEnabled,
    toggleSnap,
    isRippleEnabled,
    toggleRipple,
    undo,
    redo,
    canUndo,
    canRedo,
    resetProject,
    getTotalDuration,
  } = useTimelineStore();

  const totalDuration = getTotalDuration();

  // Playback loop
  useEffect(() => {
    let animId: number;
    let lastTimestamp = performance.now();

    const loop = (timestamp: number) => {
      const delta = (timestamp - lastTimestamp) / 1000;
      lastTimestamp = timestamp;

      if (isPlaying) {
        const nextTime = currentTime + delta;
        if (nextTime >= totalDuration) {
          setCurrentTime(0);
          useTimelineStore.getState().setIsPlaying(false);
        } else {
          setCurrentTime(nextTime);
        }
      }
      animId = requestAnimationFrame(loop);
    };

    if (isPlaying) {
      lastTimestamp = performance.now();
      animId = requestAnimationFrame(loop);
    }

    return () => {
      if (animId) cancelAnimationFrame(animId);
    };
  }, [isPlaying, currentTime, totalDuration, setCurrentTime]);

  // Global hotkeys (Space for play/pause, Cmd+Z for undo, Cmd+Shift+Z for redo)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        togglePlay();
      } else if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          if (canRedo()) redo();
        } else {
          if (canUndo()) undo();
        }
      } else if ((e.metaKey || e.ctrlKey) && e.key === 'y') {
        e.preventDefault();
        if (canRedo()) redo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [togglePlay, undo, redo, canUndo, canRedo]);

  const zoomPercent = Math.round(zoom * 100);

  return (
    <header className="h-14 bg-editor-panel border-b border-editor-border flex items-center justify-between px-4 select-none shrink-0 z-20">
      {/* Brand & Project Info */}
      <div className="flex items-center space-x-3">
        <div className="flex items-center space-x-2 text-white font-bold tracking-tight">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-sky-500/20">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-slate-100 flex items-center gap-1.5">
              TimeVid <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-400 font-bold border border-sky-500/30">Editor</span>
            </span>
            <span className="text-[11px] text-editor-textMuted font-mono">Demo Sequence</span>
          </div>
        </div>

        <div className="h-5 w-[1px] bg-editor-border mx-1" />

        {/* History Controls */}
        <div className="flex items-center space-x-1">
          <button
            onClick={undo}
            disabled={!canUndo()}
            title="Undo (⌘Z)"
            className={`p-1.5 rounded-md transition-colors ${
              canUndo()
                ? 'text-editor-textMain hover:bg-editor-subpanel active:scale-95'
                : 'text-editor-textMuted/40 cursor-not-allowed'
            }`}
          >
            <Undo2 className="w-4 h-4" />
          </button>
          <button
            onClick={redo}
            disabled={!canRedo()}
            title="Redo (⌘⇧Z)"
            className={`p-1.5 rounded-md transition-colors ${
              canRedo()
                ? 'text-editor-textMain hover:bg-editor-subpanel active:scale-95'
                : 'text-editor-textMuted/40 cursor-not-allowed'
            }`}
          >
            <Redo2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Center Playback & Timecode */}
      <div className="flex items-center space-x-4">
        <button
          onClick={togglePlay}
          className={`flex items-center justify-center w-9 h-9 rounded-full transition-all shadow-md ${
            isPlaying
              ? 'bg-amber-500 text-black hover:bg-amber-400'
              : 'bg-sky-500 text-white hover:bg-sky-400 shadow-sky-500/20'
          }`}
          title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
        >
          {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
        </button>

        <div className="flex items-center bg-editor-subpanel px-3 py-1.5 rounded-lg border border-editor-border font-mono text-sm shadow-inner">
          <span className="text-sky-400 font-semibold">{formatTimecode(currentTime)}</span>
          <span className="text-editor-textMuted mx-1.5">/</span>
          <span className="text-editor-textMuted">{formatTimecode(totalDuration)}</span>
        </div>
      </div>

      {/* Right Controls: Zoom, Snap, Ripple, Reset */}
      <div className="flex items-center space-x-2">
        {/* Snap Toggle */}
        <button
          onClick={toggleSnap}
          title={isSnapEnabled ? 'Snapping Enabled (S)' : 'Snapping Disabled'}
          className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium border transition-colors ${
            isSnapEnabled
              ? 'bg-amber-500/15 text-amber-300 border-amber-500/40 shadow-sm shadow-amber-500/10'
              : 'bg-editor-subpanel text-editor-textMuted border-editor-border hover:text-slate-300'
          }`}
        >
          <Magnet className="w-3.5 h-3.5" />
          <span>Snap</span>
        </button>

        {/* Ripple Toggle */}
        <button
          onClick={toggleRipple}
          title={isRippleEnabled ? 'Ripple Edit Enabled' : 'Ripple Edit Disabled'}
          className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium border transition-colors ${
            isRippleEnabled
              ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40 shadow-sm shadow-emerald-500/10'
              : 'bg-editor-subpanel text-editor-textMuted border-editor-border hover:text-slate-300'
          }`}
        >
          <ArrowRightLeft className="w-3.5 h-3.5" />
          <span>Ripple</span>
        </button>

        <div className="h-5 w-[1px] bg-editor-border mx-1" />

        {/* Zoom Slider & Presets */}
        <div className="flex items-center bg-editor-subpanel rounded-md border border-editor-border px-1.5 py-1 space-x-1 text-xs">
          <button
            onClick={() => setZoom(zoom - 0.25)}
            disabled={zoom <= 0.5}
            title="Zoom Out"
            className="p-1 text-editor-textMuted hover:text-slate-200 disabled:opacity-30"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>

          <span
            onClick={() => setZoom(1.0)}
            title="Click to reset to 100%"
            className="font-mono text-[11px] text-editor-textMain w-10 text-center cursor-pointer hover:text-sky-400 select-none"
          >
            {zoomPercent}%
          </span>

          <button
            onClick={() => setZoom(zoom + 0.25)}
            disabled={zoom >= 2.0}
            title="Zoom In"
            className="p-1 text-editor-textMuted hover:text-slate-200 disabled:opacity-30"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Zoom Preset Shortcuts */}
        <div className="hidden lg:flex items-center space-x-1 text-[11px]">
          {[1.0, 1.5].map((preset) => (
            <button
              key={preset}
              onClick={() => setZoom(preset)}
              className={`px-1.5 py-1 rounded text-[10px] font-mono border ${
                Math.abs(zoom - preset) < 0.05
                  ? 'bg-sky-500/20 text-sky-300 border-sky-500/40'
                  : 'bg-editor-subpanel text-editor-textMuted border-editor-border hover:text-slate-200'
              }`}
            >
              {Math.round(preset * 100)}%
            </button>
          ))}
        </div>

        <div className="h-5 w-[1px] bg-editor-border mx-1" />

        {/* Reset Project */}
        <button
          onClick={resetProject}
          title="Reset project to starter state"
          className="flex items-center space-x-1 px-2 py-1.5 rounded-md text-xs text-editor-textMuted hover:text-rose-400 hover:bg-rose-500/10 border border-editor-border transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Reset</span>
        </button>
      </div>
    </header>
  );
};
