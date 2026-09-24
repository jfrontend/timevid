import React from 'react';
import { useTimelineStore } from '../store/timelineStore';
import { timeToPixel } from '../utils/time';

interface SnapGuideProps {
  totalHeight: number;
}

export const SnapGuide: React.FC<SnapGuideProps> = ({ totalHeight }) => {
  const { snapGuide, zoom } = useTimelineStore();

  if (!snapGuide) return null;

  const leftPx = timeToPixel(snapGuide.time, zoom);

  return (
    <div
      style={{
        left: `${leftPx}px`,
        height: `${totalHeight}px`,
      }}
      className="absolute top-0 pointer-events-none z-20 flex flex-col items-center"
    >
      {/* Label Badge */}
      <div className="bg-amber-500 text-black text-[10px] font-semibold font-mono px-1.5 py-0.5 rounded shadow-lg -translate-y-1 select-none whitespace-nowrap">
        {snapGuide.label}
      </div>

      {/* Vertical Dashed Line */}
      <div className="w-[1.5px] h-full bg-amber-400 border-l border-dashed border-amber-300 shadow-[0_0_8px_rgba(251,191,36,0.8)]" />
    </div>
  );
};
