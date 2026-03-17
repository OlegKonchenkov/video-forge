// agentforge-video/src/shared/SvgDecorations.tsx
// Animated SVG decoration components for visual richness in scenes.
// All animations are deterministic (no Math.random).

import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate } from 'remotion';

// ─── Corner Brackets ─────────────────────────────────────────────
// Tech-style L-brackets in 4 corners — draw-in animation
interface CornerBracketsProps {
  color: string;
  size?: number;
  thickness?: number;
  opacity?: number;
  offset?: number;
  startFrame?: number;
}

export const CornerBrackets: React.FC<CornerBracketsProps> = ({
  color,
  size = 28,
  thickness = 2,
  opacity = 0.35,
  offset = 32,
  startFrame = 0,
}) => {
  const frame = useCurrentFrame();

  const f = frame - startFrame;
  const progress = interpolate(f, [0, 22], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const s = Math.round(size * progress);
  const op = opacity * progress;

  if (op < 0.01) return null;

  return (
    <div style={{ position: 'absolute' as const, inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
      {/* Top-left */}
      <svg style={{ position: 'absolute' as const, top: offset, left: offset }} width={s} height={s}>
        <path d={`M0,${s} L0,0 L${s},0`} fill="none" stroke={color} strokeWidth={thickness} />
      </svg>
      {/* Top-right */}
      <svg style={{ position: 'absolute' as const, top: offset, right: offset }} width={s} height={s}>
        <path d={`M0,0 L${s},0 L${s},${s}`} fill="none" stroke={color} strokeWidth={thickness} />
      </svg>
      {/* Bottom-left */}
      <svg style={{ position: 'absolute' as const, bottom: offset, left: offset }} width={s} height={s}>
        <path d={`M0,0 L0,${s} L${s},${s}`} fill="none" stroke={color} strokeWidth={thickness} />
      </svg>
      {/* Bottom-right */}
      <svg style={{ position: 'absolute' as const, bottom: offset, right: offset }} width={s} height={s}>
        <path d={`M${s},0 L${s},${s} L0,${s}`} fill="none" stroke={color} strokeWidth={thickness} />
      </svg>
    </div>
  );
};

// ─── Floating Orbs ───────────────────────────────────────────────
// Soft floating accent circles for atmospheric depth
interface FloatingOrbsProps {
  color: string;
  count?: number;
  opacity?: number;
  speed?: number;
}

export const FloatingOrbs: React.FC<FloatingOrbsProps> = ({
  color,
  count = 5,
  opacity = 0.12,
  speed = 0.015,
}) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();

  return (
    <div style={{ position: 'absolute' as const, inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
      {Array.from({ length: count }, (_, i) => {
        // Deterministic positions using golden-ratio-like seed
        const seed = i * 137.5;
        const baseX = (((Math.sin(seed) * 43758.5453) % 1) + 1) % 1;
        const baseY = (((Math.cos(seed * 1.3) * 43758.5453) % 1) + 1) % 1;
        const r = 24 + (i % 3) * 18;

        const x = baseX * width + Math.sin(frame * speed + seed) * 35;
        const y = baseY * height + Math.cos(frame * speed * 0.7 + seed) * 25;
        const op = opacity * (0.4 + 0.6 * Math.sin(frame * 0.025 + i * 1.8));

        return (
          <div key={i} style={{
            position: 'absolute' as const,
            left: x - r, top: y - r,
            width: r * 2, height: r * 2,
            borderRadius: '50%',
            background: `radial-gradient(circle, ${color}, transparent 70%)`,
            opacity: Math.max(0, op),
          }} />
        );
      })}
    </div>
  );
};

// ─── Tech Grid ───────────────────────────────────────────────────
// Subtle perspective grid pattern for data/dashboard scenes
interface TechGridProps {
  color: string;
  cellSize?: number;
  opacity?: number;
}

export const TechGrid: React.FC<TechGridProps> = ({
  color,
  cellSize = 56,
  opacity = 0.05,
}) => {
  const { width, height } = useVideoConfig();

  return (
    <div style={{ position: 'absolute' as const, inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
      <svg width={width} height={height} style={{ opacity }}>
        <defs>
          <pattern id="tech-grid-pattern" width={cellSize} height={cellSize} patternUnits="userSpaceOnUse">
            <path d={`M ${cellSize} 0 L 0 0 0 ${cellSize}`} fill="none" stroke={color} strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#tech-grid-pattern)" />
      </svg>
    </div>
  );
};

// ─── Crosshair ───────────────────────────────────────────────────
// Animated crosshair/target indicator for tech/precision feel
interface CrosshairProps {
  color: string;
  size?: number;
  opacity?: number;
  x?: string;
  y?: string;
  startFrame?: number;
}

export const Crosshair: React.FC<CrosshairProps> = ({
  color,
  size = 44,
  opacity = 0.25,
  x = '50%',
  y = '50%',
  startFrame = 0,
}) => {
  const frame = useCurrentFrame();

  const f = frame - startFrame;
  const progress = interpolate(f, [0, 18], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const rotation = frame * 0.3;
  const pulse = 0.7 + Math.sin(frame * 0.08) * 0.3;
  const op = opacity * progress * pulse;

  if (op < 0.01) return null;

  const half = size / 2;
  const gap = size * 0.2;

  return (
    <div style={{
      position: 'absolute' as const,
      left: x, top: y,
      transform: `translate(-50%, -50%) rotate(${rotation}deg)`,
      pointerEvents: 'none',
    }}>
      <svg width={size} height={size} style={{ opacity: op }}>
        {/* Horizontal lines with gap */}
        <line x1={0} y1={half} x2={half - gap} y2={half} stroke={color} strokeWidth="1" />
        <line x1={half + gap} y1={half} x2={size} y2={half} stroke={color} strokeWidth="1" />
        {/* Vertical lines with gap */}
        <line x1={half} y1={0} x2={half} y2={half - gap} stroke={color} strokeWidth="1" />
        <line x1={half} y1={half + gap} x2={half} y2={size} stroke={color} strokeWidth="1" />
        {/* Center dot */}
        <circle cx={half} cy={half} r={2} fill={color} />
      </svg>
    </div>
  );
};

// ─── Scan Line (animated) ────────────────────────────────────────
// Single horizontal scan line that sweeps vertically
interface ScanBeamProps {
  color: string;
  opacity?: number;
  speed?: number;
  thickness?: number;
}

export const ScanBeam: React.FC<ScanBeamProps> = ({
  color,
  opacity = 0.08,
  speed = 0.008,
  thickness = 2,
}) => {
  const frame = useCurrentFrame();
  const { height } = useVideoConfig();

  const yPos = ((frame * speed) % 1) * height;

  return (
    <div style={{
      position: 'absolute' as const,
      left: 0, right: 0,
      top: yPos,
      height: thickness,
      background: `linear-gradient(90deg, transparent 5%, ${color} 50%, transparent 95%)`,
      opacity,
      pointerEvents: 'none',
      boxShadow: `0 0 20px ${color}`,
    }} />
  );
};

// ─── Status Dot ──────────────────────────────────────────────────
// Pulsing status indicator dot (green/red/accent)
interface StatusDotProps {
  color?: string;
  size?: number;
  label?: string;
  labelColor?: string;
  labelFont?: string;
  labelSize?: number;
}

export const StatusDot: React.FC<StatusDotProps> = ({
  color = '#22c55e',
  size = 8,
  label,
  labelColor = 'rgba(148,163,184,0.7)',
  labelFont,
  labelSize = 13,
}) => {
  const frame = useCurrentFrame();
  const pulse = 0.7 + Math.sin(frame * 0.15) * 0.3;

  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
      <div style={{
        width: size, height: size,
        borderRadius: '50%',
        background: color,
        transform: `scale(${pulse})`,
        boxShadow: `0 0 ${size}px ${color}`,
      }} />
      {label && (
        <span style={{
          fontSize: labelSize,
          color: labelColor,
          fontFamily: labelFont,
          fontWeight: '600',
          textTransform: 'uppercase' as const,
          letterSpacing: '2px',
        }}>
          {label}
        </span>
      )}
    </div>
  );
};
