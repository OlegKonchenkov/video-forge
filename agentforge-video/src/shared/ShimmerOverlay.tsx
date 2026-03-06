// agentforge-video/src/shared/ShimmerOverlay.tsx
// Diagonal light-sweep shimmer that repeats periodically — for buttons, cards
import React from 'react';
import { useCurrentFrame, interpolate } from 'remotion';

interface ShimmerOverlayProps {
  color?:        string;
  periodFrames?: number;   // how many frames between sweeps
  opacity?:      number;
  width?:        string;   // CSS width of the shimmer beam
}

export const ShimmerOverlay: React.FC<ShimmerOverlayProps> = ({
  color        = '#ffffff',
  periodFrames = 90,
  opacity      = 0.35,
  width        = '55%',
}) => {
  const frame = useCurrentFrame();
  const phase = frame % periodFrames;
  const sweepDur = 28;

  const t = interpolate(phase, [0, sweepDur], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const x = interpolate(t, [0, 1], [-80, 180]); // % left offset
  const alpha = opacity * Math.sin(t * Math.PI);

  return (
    <div style={{
      position: 'absolute' as const,
      inset: 0,
      overflow: 'hidden',
      pointerEvents: 'none',
      borderRadius: 'inherit',
    }}>
      <div style={{
        position: 'absolute' as const,
        top: '-50%',
        left: `${x}%`,
        width,
        height: '200%',
        background: `linear-gradient(105deg, transparent 25%, ${color} 50%, transparent 75%)`,
        opacity: alpha,
        transform: 'skewX(-12deg)',
      }} />
    </div>
  );
};
