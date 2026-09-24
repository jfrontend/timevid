import React, { useRef, useCallback } from 'react';
import { useTimelineStore } from '../store/timelineStore';
import { timeToPixel, pixelToTime, formatTimecode } from '../utils/time';
import { RULER_HEIGHT } from '../constants/initialData';

interface TimeRulerProps {
  totalDuration: number;
}

export const TimeRuler: React.FC<TimeRulerProps> = ({ totalDuration }) => {
  const { zoom, currentTime, setCurrentTime } = useTimelineStore();
  const rulerRef = useRef<HTMLDivElement>(null);

  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    if (!rulerRef.current) return;
    const rect = rulerRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const time = Math.max(0, pixelToTime(clickX, zoom));
    setCurrentTime(time);

    const onPointerMove = (moveEvent: PointerEvent) => {
      const currentX = moveEvent.clientX - rect.left;
      const scrubTime = Math.max(0, pixelToTime(currentX, zoom));
      setCurrentTime(scrubTime);
    };

    const onPointerUp = () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  };

  const totalWidth = Math.max(1200, timeToPixel(totalDuration + 4, zoom));

  // Determine tick step based on zoom
  // If zoom is high (1.5x - 2x), major every 1s, minor every 0.25s
  // If zoom is medium (1x), major every 2s, minor every 0.5s or 1s
  // If zoom is low (0.5x), major every 5s, minor every 1s
  let majorStep = 2;
  if (zoom >= 1.4) majorStep = 1;
  else if (zoom <= 0.6) majorStep = 5;

  const ticks: { time: number; isMajor: boolean; label?: string }[] = [];
  const maxSeconds = Math.ceil(totalDuration + 4);

  for (let s = 0; s <= maxSeconds; s += 0.5) {
    const isMajor = Math.abs(s % majorStep) < 0.001;
    const isSubSecond = s % 1 !== 0;

    // Filter out too dense subsecond ticks at low zoom
    if (isSubSecond && zoom < 0.8) continue;

    ticks.push({
      time: s,
      isMajor,
      label: isMajor ? formatTimecode(s) : undefined,
    });
  }

  return (
    <div
      ref={rulerRef}
      style={{ height: `${RULER_HEIGHT}px`, width: `${totalWidth}px` }}
      onPointerDown={handlePointerDown}
      className="relative bg-editor-rulerBg border-b border-editor-border select-none cursor-crosshair overflow-hidden"
    >
      {/* Ticks and labels */}
      {ticks.map((tick) => {
        const leftPx = timeToPixel(tick.time, zoom);

        return (
          <div
            key={tick.time}
            style={{ left: `${leftPx}px` }}
            className="absolute top-0 bottom-0 pointer-events-none"
          >
            {tick.isMajor ? (
              <>
                <div className="h-3 w-[1px] bg-slate-500/70" />
                <span className="text-[10px] font-mono text-editor-textMuted ml-1 select-none whitespace-nowrap">
                  {tick.label}
                </span>
              </>
            ) : (
              <div className="h-1.5 w-[1px] bg-slate-700" />
            )}
          </div>
        );
      })}
    </div>
  );
};
