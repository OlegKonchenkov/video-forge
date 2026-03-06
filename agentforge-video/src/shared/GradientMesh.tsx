// agentforge-video/src/shared/GradientMesh.tsx
// Animated multi-stop gradient mesh that slowly shifts position
import React from 'react';
import { useCurrentFrame } from 'remotion';

interface GradientMeshProps {
  colors:   [string, string, string];
  speed?:   number;
  opacity?: number;
}

export const GradientMesh: React.FC<GradientMeshProps> = ({
  colors,
  speed   = 1,
  opacity = 0.55,
}) => {
  const frame = useCurrentFrame();
  const t = (frame * speed) / 150; // slow drift cycle

  const x1 = 50 + Math.sin(t * 1.3) * 28;
  const y1 = 50 + Math.cos(t * 0.9) * 28;
  const x2 = 50 + Math.cos(t * 0.7) * 38;
  const y2 = 50 + Math.sin(t * 1.1) * 38;

  const grad = `
    radial-gradient(ellipse at ${x1}% ${y1}%, ${colors[0]}55 0%, transparent 55%),
    radial-gradient(ellipse at ${x2}% ${y2}%, ${colors[1]}40 0%, transparent 50%),
    radial-gradient(ellipse at ${100 - x1}% ${100 - y2}%, ${colors[2]}30 0%, transparent 45%)
  `.trim();

  return (
    <div style={{
      position: 'absolute' as const,
      inset: 0,
      background: grad,
      opacity,
      pointerEvents: 'none',
    }} />
  );
};
