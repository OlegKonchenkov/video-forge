// agentforge-video/src/shared/variantAnimations.ts
// Utility functions for variant-driven entry animations and card styles
import { interpolate, spring } from 'remotion';
import type { VisualVariant } from './useVisualVariant';
import type { AccentVariants } from './colorUtils';

/**
 * Returns { opacity, transform } for a variant-driven entry animation.
 * @param variant  - the VisualVariant object
 * @param frame    - current frame
 * @param cue      - the frame at which the element should start appearing
 * @param fps      - frames per second
 */
export function variantEntry(
  variant: VisualVariant,
  frame: number,
  cue: number,
  fps: number,
): { opacity: number; transform: string } {
  const t = frame - cue;
  const op = interpolate(t, [0, 16], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  if (variant.entryType === 'fade') {
    return { opacity: op, transform: 'none' };
  }

  const p = spring({ frame: t, fps, config: { damping: 200, stiffness: 120 } });

  if (variant.entryType === 'scale') {
    const sc = interpolate(p, [0, 1], [0.88, 1]);
    return { opacity: op, transform: `scale(${sc})` };
  }

  // slide
  const dist = 60;
  const dirMap: Record<string, string> = {
    left: 'X',
    right: 'X',
    top: 'Y',
    bottom: 'Y',
  };
  const signMap: Record<string, number> = {
    left: -1,
    right: 1,
    top: -1,
    bottom: 1,
  };
  const axis = dirMap[variant.entryDirection] ?? 'X';
  const sign = signMap[variant.entryDirection] ?? -1;
  const offset = interpolate(p, [0, 1], [dist * sign, 0]);
  return { opacity: op, transform: `translate${axis}(${offset}px)` };
}

/**
 * Returns React.CSSProperties for a variant-driven card.
 */
export function variantCardStyle(
  variant: VisualVariant,
  av: AccentVariants,
): React.CSSProperties {
  const borderRadius = variant.cardRadius;

  const borderSides: Record<string, React.CSSProperties> = {
    left:   { borderLeft: `3px solid ${av.solid}` },
    top:    { borderTop: `2px solid ${av.solid}` },
    bottom: { borderBottom: `2px solid ${av.solid}` },
    all:    { border: `1px solid ${av.strong}` },
  };

  const shadow =
    variant.cardShadowIntensity > 0.5
      ? `0 4px 30px rgba(0,0,0,${variant.cardShadowIntensity * 0.5}), 0 0 20px ${av.glow}`
      : variant.cardShadowIntensity > 0.2
        ? `0 2px 16px rgba(0,0,0,${variant.cardShadowIntensity * 0.4})`
        : 'none';

  return {
    background: `rgba(0,0,0,${variant.cardBgOpacity})`,
    border: `1px solid ${av.border}`,
    ...borderSides[variant.cardBorderSide],
    borderRadius,
    boxShadow: shadow,
    backdropFilter: variant.cardBgOpacity < 0.1 ? 'blur(12px)' : undefined,
    overflow: 'hidden',
  };
}
