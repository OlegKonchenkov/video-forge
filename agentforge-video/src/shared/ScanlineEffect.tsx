// agentforge-video/src/shared/ScanlineEffect.tsx
// Horizontal CRT-style scanlines for retro/glitch/terminal aesthetics
import React from 'react';

interface ScanlineEffectProps {
  opacity?: number;
  spacing?: number;   // px between scanlines
  color?:   string;
}

export const ScanlineEffect: React.FC<ScanlineEffectProps> = ({
  opacity = 0.06,
  spacing = 4,
  color   = '#000000',
}) => {
  // Use CSS repeating-linear-gradient — no SVG, no line count needed
  const grad = `repeating-linear-gradient(
    to bottom,
    ${color} 0px,
    ${color} 1px,
    transparent 1px,
    transparent ${spacing}px
  )`;

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
