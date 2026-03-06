// agentforge-video/src/shared/KineticText.tsx
// Character-by-character animated text reveal with blur, slide, or scale effects
import React from 'react';
import { useCurrentFrame, interpolate, spring } from 'remotion';

interface KineticTextProps {
  text:           string;
  startFrame:     number;
  fps:            number;
  style?:         React.CSSProperties;
  staggerFrames?: number;    // frames between each character
  type?:          'blur-in' | 'slide-up' | 'scale-in';
}

export const KineticText: React.FC<KineticTextProps> = ({
  text,
  startFrame,
  fps,
  style,
  staggerFrames = 2,
  type          = 'blur-in',
}) => {
  const frame = useCurrentFrame();
  const chars = text.split('');

  return (
    <span style={{ display: 'inline-flex', flexWrap: 'wrap' as const, ...style }}>
      {chars.map((ch, i) => {
        const f = frame - startFrame - i * staggerFrames;
        let opacity = 1, blur = 0, y = 0, scale = 1;

        if (type === 'blur-in') {
          opacity = interpolate(f, [0, 14], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
          blur    = interpolate(f, [0, 14], [14, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
        } else if (type === 'slide-up') {
          const p = spring({ frame: f, fps, config: { damping: 200 } });
          y       = interpolate(p, [0, 1], [32, 0]);
          opacity = interpolate(f, [0, 10], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
        } else {
          const p = spring({ frame: f, fps, config: { damping: 180, stiffness: 200 } });
          scale   = interpolate(p, [0, 1], [0.3, 1]);
          opacity = interpolate(f, [0, 8], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
        }

        return (
          <span
            key={i}
            style={{
              display: 'inline-block' as const,
              opacity,
              transform: `translateY(${y}px) scale(${scale})`,
              filter: blur > 0.1 ? `blur(${blur.toFixed(1)}px)` : undefined,
              whiteSpace: ch === ' ' ? 'pre' as const : 'normal' as const,
            }}
          >
            {ch}
          </span>
        );
      })}
    </span>
  );
};
