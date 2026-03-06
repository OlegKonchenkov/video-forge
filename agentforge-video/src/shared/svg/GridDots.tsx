// agentforge-video/src/shared/svg/GridDots.tsx
import React from 'react';
import { AbsoluteFill, useVideoConfig } from 'remotion';

interface GridDotsProps {
  color?: string;
  opacity?: number;
  spacing?: number;
  radius?: number;
  translateX?: number;
}

export const GridDots: React.FC<GridDotsProps> = ({
  color = 'rgba(148,163,184,0.4)',
  opacity = 0.35,
  spacing = 64,
  radius = 1.5,
  translateX = 0,
}) => {
  const { width, height } = useVideoConfig();
  const cols = Math.ceil(width / spacing) + 2;
  const rows = Math.ceil(height / spacing) + 2;

  return (
    <AbsoluteFill style={{ opacity, pointerEvents: 'none', transform: `translateX(${translateX}px)` }}>
      <svg
        width={width}
        height={height}
        xmlns="http://www.w3.org/2000/svg"
        style={{ position: 'absolute' as const }}
      >
        {Array.from({ length: rows }, (_, r) =>
          Array.from({ length: cols }, (_, c) => (
            <circle
              key={`${r}-${c}`}
              cx={(c - 1) * spacing}
              cy={(r - 1) * spacing}
              r={radius}
              fill={color}
            />
          ))
        )}
      </svg>
    </AbsoluteFill>
  );
};
