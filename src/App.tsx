import React from 'react';
import { Header } from './components/Header';
import { TrackHeaders } from './components/TrackHeaders';
import { TimelineCanvas } from './components/TimelineCanvas';
import { Inspector } from './components/Inspector';
import { useTimelineStore } from './store/timelineStore';

export const App: React.FC = () => {
  const { zoom, tracks, clips, isSnapEnabled, isRippleEnabled } = useTimelineStore();

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-editor-bg select-none">
      {/* Top Application Bar */}
      <Header />

      {/* Main Multi-Track Editor Workspace */}
      <main className="flex-1 flex overflow-hidden relative">
        {/* Track Headers (Left sidebar) */}
        <TrackHeaders />

        {/* Timeline Canvas (Ruler, Tracks, Clips, Playhead) */}
        <TimelineCanvas />

        {/* Inspector (Right sidebar) */}
        <Inspector />
      </main>

      {/* Bottom Status Bar */}
      <footer className="h-7 bg-editor-panel border-t border-editor-border px-3 flex items-center justify-between text-[11px] text-editor-textMuted select-none shrink-0 font-mono z-20">
        <div className="flex items-center space-x-3">
          <span>{tracks.length} Tracks</span>
          <span className="text-editor-border">•</span>
          <span>{clips.length} Clips</span>
          <span className="text-editor-border">•</span>
          <span>Zoom: {Math.round(zoom * 100)}%</span>
        </div>

        <div className="hidden md:flex items-center space-x-3 text-[10px] text-slate-400">
          <span><kbd className="px-1 py-0.5 rounded bg-editor-subpanel border border-editor-border text-slate-300">Space</kbd> Play/Pause</span>
          <span><kbd className="px-1 py-0.5 rounded bg-editor-subpanel border border-editor-border text-slate-300">⌘Z</kbd> Undo</span>
          <span><kbd className="px-1 py-0.5 rounded bg-editor-subpanel border border-editor-border text-slate-300">⇧Click</kbd> Multi-select</span>
        </div>

        <div className="flex items-center space-x-3 text-[10px]">
          <span className={`flex items-center gap-1 ${isSnapEnabled ? 'text-amber-400 font-semibold' : 'text-slate-500'}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${isSnapEnabled ? 'bg-amber-400 animate-pulse' : 'bg-slate-600'}`} />
            SNAP
          </span>
          <span className={`flex items-center gap-1 ${isRippleEnabled ? 'text-emerald-400 font-semibold' : 'text-slate-500'}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${isRippleEnabled ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'}`} />
            RIPPLE
          </span>
        </div>
      </footer>
    </div>
  );
};

export default App;
