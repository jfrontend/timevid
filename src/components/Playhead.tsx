import React, { useRef } from 'react';
import { useTimelineStore } from '../store/timelineStore';
import { timeToPixel, pixelToTime } from '../utils/time';
import { RULER_HEIGHT } from '../constants/initialData';

interface PlayheadProps {
  totalHeight: number;
}

export const Playhead: React.FC<PlayheadProps> = ({ totalHeight }) => {
  const { currentTime, setCurrentTime, zoom } = useTimelineStore();
  const leftPx = timeToPixel(currentTime, zoom);

  const handlePointerDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();

    const startX = e.clientX;
    const startTime = currentTime;

    const onPointerMove = (moveEvent: PointerEvent) => {
      const deltaPx = moveEvent.clientX - startX;
      const deltaTime = pixelToTime(deltaPx, zoom);
      setCurrentTime(Math.max(0, startTime + deltaTime));
    };

    const onPointerUp = () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  };

  return (
    <div
      style={{
        transform: `translateX(${leftPx}px)`,
        height: `${totalHeight}px`,
      }}
      className="absolute top-0 pointer-events-none z-30 transition-transform duration-75 ease-out"
    >
      {/* Top scrubber diamond badge */}
      <div
        style={{ height: `${RULER_HEIGHT}px` }}
        onPointerDown={handlePointerDown}
        className="pointer-events-auto cursor-ew-resize -translate-x-1/2 flex flex-col items-center justify-start group"
      >
        <div className="w-3.5 h-4 bg-rose-500 rounded-sm shadow-md flex items-center justify-center group-hover:scale-110 transition-transform">
          <div className="w-1 h-2 bg-white/70 rounded-full" />
        </div>
        <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[5px] border-t-rose-500 -mt-[1px]" />
      </div>

      {/* Vertical line through ruler and all tracks */}
      <div className="w-[1.5px] bg-rose-500/90 shadow-[0_0_8px_rgba(244,63,94,0.6)] h-full -translate-x-1/2" />
    </div>
  );
};
