import React from 'react';
import { interpolate, spring } from 'remotion';

// Email envelope icon with animated open/glow
export const EmailIcon: React.FC<{ size: number; color: string; frame: number; fps: number }> = ({ size, color, frame, fps }) => {
  const pulse = interpolate(frame % (fps * 2), [0, fps, fps * 2], [1, 1.08, 1]);
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" style={{ transform: `scale(${pulse})`, display: 'block' }}>
      <rect x="4" y="10" width="40" height="28" rx="4" stroke={color} strokeWidth="2.5" fill="none" />
      <polyline points="4,10 24,27 44,10" stroke={color} strokeWidth="2.5" fill="none" strokeLinejoin="round" />
    </svg>
  );
};

// Bar chart icon with rising bars
export const ChartIcon: React.FC<{ size: number; color: string; progress: number }> = ({ size, color, progress }) => {
  const h1 = interpolate(progress, [0, 1], [0, 24]);
  const h2 = interpolate(progress, [0, 1], [0, 36]);
  const h3 = interpolate(progress, [0, 1], [0, 16]);
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" style={{ display: 'block' }}>
      <rect x="6" y={44 - h1} width="10" height={h1} rx="2" fill={color} opacity="0.7" />
      <rect x="19" y={44 - h2} width="10" height={h2} rx="2" fill={color} />
      <rect x="32" y={44 - h3} width="10" height={h3} rx="2" fill={color} opacity="0.5" />
      <line x1="4" y1="44" x2="44" y2="44" stroke={color} strokeWidth="2" opacity="0.4" />
    </svg>
  );
};

// Clock icon with animated second hand
export const ClockIcon: React.FC<{ size: number; color: string; frame: number; fps: number }> = ({ size, color, frame, fps }) => {
  const angle = (frame / fps) * 360;
  const rad = (angle - 90) * (Math.PI / 180);
  const cx = 24, cy = 24, r = 10;
  const x2 = cx + r * Math.cos(rad);
  const y2 = cy + r * Math.sin(rad);
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" style={{ display: 'block' }}>
      <circle cx="24" cy="24" r="18" stroke={color} strokeWidth="2.5" fill="none" />
      <line x1="24" y1="24" x2="24" y2="11" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
      <line x1="24" y1="24" x2={x2.toFixed(2)} y2={y2.toFixed(2)} stroke={color} strokeWidth="2" strokeLinecap="round" />
      <circle cx="24" cy="24" r="2" fill={color} />
    </svg>
  );
};

// AI brain / network nodes
export const BrainIcon: React.FC<{ size: number; color: string; frame: number; fps: number }> = ({ size, color, frame, fps }) => {
  const glow = interpolate(frame % fps, [0, fps / 2, fps], [0.4, 1, 0.4]);
  const nodes = [
    { cx: 24, cy: 10 },
    { cx: 10, cy: 26 },
    { cx: 38, cy: 26 },
    { cx: 17, cy: 40 },
    { cx: 31, cy: 40 },
    { cx: 24, cy: 24 },
  ];
  const edges = [[0,5],[1,5],[2,5],[3,5],[4,5],[0,2],[1,3],[2,4]];
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" style={{ display: 'block' }}>
      {edges.map(([a, b], i) => (
        <line key={i} x1={nodes[a].cx} y1={nodes[a].cy} x2={nodes[b].cx} y2={nodes[b].cy}
          stroke={color} strokeWidth="1.5" opacity={glow * 0.5} />
      ))}
      {nodes.map((n, i) => (
        <circle key={i} cx={n.cx} cy={n.cy} r={i === 5 ? 5 : 3.5}
          fill={color} opacity={i === 5 ? glow : glow * 0.7} />
      ))}
    </svg>
  );
};

// Upward arrow
export const ArrowUpIcon: React.FC<{ size: number; color: string; progress: number }> = ({ size, color, progress }) => {
  const y = interpolate(progress, [0, 1], [44, 10]);
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" style={{ display: 'block' }}>
      <line x1="8" y1="40" x2="40" y2={y.toFixed(0)} stroke={color} strokeWidth="3" strokeLinecap="round" />
      <polyline points={`${(40 - 8).toFixed(0)},${y.toFixed(0)} 40,${y.toFixed(0)} 40,${(parseFloat(y.toFixed(0)) + 8).toFixed(0)}`}
        stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );
};

// Checkmark icon animated
export const CheckIcon: React.FC<{ size: number; color: string; progress: number }> = ({ size, color, progress }) => {
  const length = 28;
  const dashOffset = interpolate(progress, [0, 1], [length, 0]);
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" style={{ display: 'block' }}>
      <circle cx="24" cy="24" r="20" stroke={color} strokeWidth="2" opacity="0.3" fill="none" />
      <polyline points="12,24 20,33 36,16" stroke={color} strokeWidth="3"
        strokeLinecap="round" strokeLinejoin="round" fill="none"
        strokeDasharray={length} strokeDashoffset={dashOffset} />
    </svg>
  );
};
