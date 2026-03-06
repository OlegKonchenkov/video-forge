// agentforge-video/src/shared/svg/DiagonalLines.tsx
import React from 'react';
import { AbsoluteFill, useVideoConfig } from 'remotion';

interface DiagonalLinesProps {
  color?: string;
  opacity?: number;
  spacing?: number;
  strokeWidth?: number;
}

export const DiagonalLines: React.FC<DiagonalLinesProps> = ({
  color = 'rgba(148,163,184,0.15)',
  opacity = 0.5,
  spacing = 48,
  strokeWidth = 1,
}) => {
  const { width, height } = useVideoConfig();
  const diagonal = Math.sqrt(width * width + height * height);
  const count = Math.ceil(diagonal / spacing) * 2;
  const lines = Array.from({ length: count }, (_, i) => i - count / 2);

  return (
    <AbsoluteFill style={{ opacity, pointerEvents: 'none' }}>
      <svg
        width={width}
        height={height}
        xmlns="http://www.w3.org/2000/svg"
        style={{ position: 'absolute' as const, overflow: 'hidden' }}
      >
        <g transform={`translate(${width / 2}, ${height / 2}) rotate(-45)`}>
          {lines.map((i) => (
            <line
              key={i}
              x1={i * spacing}
              y1={-diagonal}
              x2={i * spacing}
              y2={diagonal}
              stroke={color}
              strokeWidth={strokeWidth}
            />
          ))}
        </g>
      </svg>
    </AbsoluteFill>
  );
};
