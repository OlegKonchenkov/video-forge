// agentforge-video/src/shared/GeometricShapes.tsx
// Decorative SVG geometric shapes that slowly rotate — pure Remotion
import React from 'react';
import { useCurrentFrame, useVideoConfig } from 'remotion';

interface GeometricShapesProps {
  color?:   string;
  opacity?: number;
  count?:   number;
  style?:   'circles' | 'triangles' | 'hexagons' | 'mixed';
}

function det(i: number, o: number): number {
  return ((Math.sin(i * 127.1 + o * 311.7) * 43758.5453) % 1 + 1) % 1;
}

function hexPath(cx: number, cy: number, r: number): string {
  const pts = Array.from({ length: 6 }, (_, k) => {
    const a = (Math.PI / 3) * k - Math.PI / 6;
    return `${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`;
  });
  return `M${pts.join('L')}Z`;
}

function triPath(cx: number, cy: number, r: number): string {
  const pts = Array.from({ length: 3 }, (_, k) => {
    const a = (Math.PI * 2 / 3) * k - Math.PI / 2;
    return `${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`;
  });
  return `M${pts.join('L')}Z`;
}

export const GeometricShapes: React.FC<GeometricShapesProps> = ({
  color   = '#ffffff',
  opacity = 0.07,
  count   = 7,
  style   = 'mixed',
}) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();

  const shapes = Array.from({ length: count }, (_, i) => {
    const cx    = det(i, 0) * width;
    const cy    = det(i, 1) * height;
    const r     = det(i, 2) * 130 + 28;
    const rot0  = det(i, 3) * 360;
    const spd   = (det(i, 4) - 0.5) * 0.35;
    const alpha = opacity * (0.5 + det(i, 5) * 0.5);
    const rot   = rot0 + frame * spd;

    const TYPES = ['circles', 'triangles', 'hexagons'] as const;
    const type  = style === 'mixed' ? TYPES[Math.floor(det(i, 6) * 3)] : style;

    return { cx, cy, r, rot, alpha, type };
  });

  return (
    <div style={{ position: 'absolute' as const, inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
      <svg width={width} height={height} style={{ position: 'absolute' as const }}>
        {shapes.map((s, i) => {
          const transform = `rotate(${s.rot}, ${s.cx}, ${s.cy})`;
          if (s.type === 'circles') {
            return <circle key={i} cx={s.cx} cy={s.cy} r={s.r} fill="none" stroke={color} strokeWidth={1.5} opacity={s.alpha} />;
          }
          if (s.type === 'triangles') {
            return <path key={i} d={triPath(s.cx, s.cy, s.r)} fill="none" stroke={color} strokeWidth={1.5} opacity={s.alpha} transform={transform} />;
          }
          return <path key={i} d={hexPath(s.cx, s.cy, s.r)} fill="none" stroke={color} strokeWidth={1.5} opacity={s.alpha} transform={transform} />;
        })}
      </svg>
    </div>
  );
};
