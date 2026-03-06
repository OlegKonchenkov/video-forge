// agentforge-video/src/shared/ParticleField.tsx
// Animated floating particle system — pure Remotion, no new deps
import React from 'react';
import { useCurrentFrame, useVideoConfig } from 'remotion';

interface ParticleFieldProps {
  count?:     number;
  color?:     string;
  opacity?:   number;
  speed?:     number;   // multiplier
  maxRadius?: number;
}

// Deterministic pseudo-random — no Math.random() at render time
function det(i: number, offset: number): number {
  return ((Math.sin(i * 127.1 + offset * 311.7) * 43758.5453) % 1 + 1) % 1;
}

export const ParticleField: React.FC<ParticleFieldProps> = ({
  count     = 40,
  color     = '#ffffff',
  opacity   = 0.25,
  speed     = 1,
  maxRadius = 3.5,
}) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();

  const particles = Array.from({ length: count }, (_, i) => {
    const baseX    = det(i, 0) * width;
    const baseY    = det(i, 1) * height;
    const r        = det(i, 2) * maxRadius + 0.8;
    const phase    = det(i, 3) * Math.PI * 2;
    const swayAmp  = det(i, 4) * 28 + 8;
    const swayFreq = det(i, 5) * 0.025 + 0.008;
    const drift    = det(i, 6) * 0.6 + 0.2; // px/frame upward
    const alpha    = opacity * (0.35 + det(i, 7) * 0.65);

    const traveled = frame * drift * speed;
    const y = ((baseY - traveled % (height + 60)) + height + 60) % (height + 60) - 30;
    const x = baseX + Math.sin(frame * swayFreq + phase) * swayAmp;

    return { x, y, r, alpha };
  });

  return (
    <div style={{ position: 'absolute' as const, inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
      <svg width={width} height={height} style={{ position: 'absolute' as const }}>
        {particles.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={p.r} fill={color} opacity={p.alpha} />
        ))}
      </svg>
    </div>
  );
};
