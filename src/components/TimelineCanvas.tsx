import React, { useRef, useEffect } from 'react';
import { useTimelineStore } from '../store/timelineStore';
import { TimeRuler } from './TimeRuler';
import { ClipItem } from './ClipItem';
import { Playhead } from './Playhead';
import { SnapGuide } from './SnapGuide';
import { timeToPixel } from '../utils/time';
import { TRACK_HEIGHT, RULER_HEIGHT } from '../constants/initialData';

export const TimelineCanvas: React.FC = () => {
  const {
    tracks,
    clips,
    zoom,
    dragState,
    updateDrag,
    endDrag,
    clearSelection,
    getTotalDuration,
  } = useTimelineStore();

  const containerRef = useRef<HTMLDivElement>(null);
  const totalDuration = getTotalDuration();
  const totalWidth = Math.max(1200, timeToPixel(totalDuration + 4, zoom));
  const totalTracksHeight = tracks.length * TRACK_HEIGHT;
  const totalCanvasHeight = RULER_HEIGHT + totalTracksHeight;

  // Window pointer listeners for active drag
  useEffect(() => {
    if (!dragState) return;

    const handlePointerMove = (e: PointerEvent) => {
      // Find track under pointer if possible
      let hoveredTrackId: string | undefined = undefined;
      const elements = document.elementsFromPoint(e.clientX, e.clientY);
      for (const el of elements) {
        const tId = el.getAttribute('data-track-id');
        if (tId) {
          hoveredTrackId = tId;
          break;
        }
      }
      updateDrag(e.clientX, e.clientY, hoveredTrackId);
    };

    const handlePointerUp = () => {
      endDrag();
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [dragState, updateDrag, endDrag]);

  const handleCanvasClick = (e: React.MouseEvent) => {
    // If clicking on background track area, deselect
    if ((e.target as HTMLElement).getAttribute('data-bg-track')) {
      clearSelection();
    }
  };

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-x-auto overflow-y-auto bg-editor-bg relative select-none"
    >
      <div
        style={{ width: `${totalWidth}px`, height: `${totalCanvasHeight}px` }}
        className="relative"
        onClick={handleCanvasClick}
      >
        {/* Time Ruler */}
        <TimeRuler totalDuration={totalDuration} />

        {/* Tracks Area */}
        <div className="relative">
          {tracks.map((track, index) => {
            const trackClips = clips.filter((c) => c.trackId === track.id);
            const isHovered = dragState && dragState.hoverTrackId === track.id;

            return (
              <div
                key={track.id}
                data-track-id={track.id}
                data-bg-track="true"
                style={{ height: `${TRACK_HEIGHT}px` }}
                className={`relative border-b border-editor-border transition-colors ${
                  index % 2 === 0 ? 'bg-editor-trackBg' : 'bg-editor-trackAlt'
                } ${
                  isHovered && !track.locked ? 'bg-sky-500/10' : ''
                } ${
                  track.hidden ? 'opacity-40 bg-stripes' : ''
                }`}
              >
                {/* Horizontal Guide Grid Lines (every 5 seconds) */}
                <div className="absolute inset-0 pointer-events-none opacity-5">
                  {Array.from({ length: Math.ceil(totalDuration / 5) }).map((_, i) => (
                    <div
                      key={i}
                      style={{ left: `${timeToPixel(i * 5, zoom)}px` }}
                      className="absolute top-0 bottom-0 w-[1px] bg-white"
                    />
                  ))}
                </div>

                {/* Hidden Track Overlay notice */}
                {track.hidden ? (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-xs text-editor-textMuted font-mono uppercase tracking-wider">
                    Track Hidden ({track.name})
                  </div>
                ) : (
                  /* Render Clips if track is not hidden */
                  trackClips.map((clip) => (
                    <ClipItem key={clip.id} clip={clip} track={track} />
                  ))
                )}
              </div>
            );
          })}
        </div>

        {/* Snapping Guide Line */}
        <SnapGuide totalHeight={totalCanvasHeight} />

        {/* Playhead */}
        <Playhead totalHeight={totalCanvasHeight} />
      </div>
    </div>
  );
};
