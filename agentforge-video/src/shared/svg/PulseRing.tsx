// agentforge-video/src/shared/svg/PulseRing.tsx
import React from 'react';
import { AbsoluteFill, useCurrentFrame, interpolate } from 'remotion';

interface PulseRingProps {
  color?: string;
  baseSize?: number;
  minScale?: number;
  maxScale?: number;
  period?: number;
  count?: number;
  cx?: string;
  cy?: string;
}

export const PulseRing: React.FC<PulseRingProps> = ({
  color = 'rgba(148,163,184,0.3)',
  baseSize = 400,
  minScale = 0.8,
  maxScale = 2.2,
  period = 80,
  count = 2,
  cx = '50%',
  cy = '50%',
}) => {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      {Array.from({ length: count }, (_, i) => {
        const offset = (frame + Math.round((period / count) * i)) % period;
        const scale = interpolate(offset, [0, period], [minScale, maxScale]);
        const opacity = interpolate(offset, [0, Math.round(period * 0.6), period], [0.5, 0.1, 0]);
        const size = baseSize * scale;
        return (
          <div
            key={i}
            style={{
              position: 'absolute' as const,
              width: size,
              height: size,
              borderRadius: '50%',
              border: `1px solid ${color}`,
              left: `calc(${cx} - ${size / 2}px)`,
              top: `calc(${cy} - ${size / 2}px)`,
              opacity,
              pointerEvents: 'none',
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};
