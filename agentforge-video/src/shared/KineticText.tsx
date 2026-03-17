// agentforge-video/src/shared/KineticText.tsx
// Character-by-character animated text reveal with blur, slide, or scale effects
// Groups characters by words to prevent mid-word line breaks
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

  // Split text into word tokens (preserving spaces as separators)
  const words = text.split(/(\s+)/);
  let charIndex = 0;

  return (
    <span style={{ display: 'inline-flex', flexWrap: 'wrap' as const, ...style }}>
      {words.map((word, wi) => {
        const isSpace = /^\s+$/.test(word);

        if (isSpace) {
          // Spaces between words — allow line-break here
          const spaceChars = word.split('').map((ch, si) => {
            const ci = charIndex++;
            const f = frame - startFrame - ci * staggerFrames;
            const opacity = interpolate(f, [0, 8], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
            return (
              <span
                key={`s-${wi}-${si}`}
                style={{
                  display: 'inline-block' as const,
                  opacity,
                  minWidth: '0.35em',
                  whiteSpace: 'pre' as const,
                }}
              >
                {ch}
              </span>
            );
          });
          return <React.Fragment key={`ws-${wi}`}>{spaceChars}</React.Fragment>;
        }

        // Word group — characters animate individually but the word never breaks
        const wordChars = word.split('').map((ch, ci_local) => {
          const ci = charIndex++;
          const f = frame - startFrame - ci * staggerFrames;
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
              key={ci_local}
              style={{
                display: 'inline-block' as const,
                opacity,
                transform: `translateY(${y}px) scale(${scale})`,
                filter: blur > 0.1 ? `blur(${blur.toFixed(1)}px)` : undefined,
                whiteSpace: 'pre' as const,
              }}
            >
              {ch}
            </span>
          );
        });

        return (
          <span
            key={`w-${wi}`}
            style={{
              display: 'inline-flex' as const,
              flexShrink: 0,
            }}
          >
            {wordChars}
          </span>
        );
      })}
    </span>
  );
};
