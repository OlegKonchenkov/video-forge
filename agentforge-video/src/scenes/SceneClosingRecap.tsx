// agentforge-video/src/scenes/SceneClosingRecap.tsx
// Visual: KEY TAKEAWAYS — numbered checklist with animated checks, "Ready?" glow prompt, TechGrid
import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate, spring, AbsoluteFill, staticFile } from 'remotion';
import { Audio } from '@remotion/media';
import { FONT, MONO_FONT } from '../font';
import { NoiseOverlay } from '../shared/NoiseOverlay';
import { SceneCounter } from '../shared/SceneCounter';
import { useSceneLayout } from '../shared/useSceneLayout';
import { useVisualVariant } from '../shared/useVisualVariant';
import { VariantBackground } from '../shared/VariantBackground';
import { TechGrid } from '../shared/SvgDecorations';
import { SceneBackground } from '../shared/SceneBackground';
import type { SceneClosingRecapProps, SharedSceneProps } from '../types';

export const SceneClosingRecap: React.FC<SceneClosingRecapProps & SharedSceneProps> = ({
  title, points, readyText,
  accentColor, bgColor, showImage, audioPath, sceneIndex, sceneTotal, variantId,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames: dur } = useVideoConfig();
  const variant = useVisualVariant(variantId, accentColor);
  const av = variant.av;
  const layout = useSceneLayout();

  const CUE_TITLE = dur * 0.04;
  const numPoints = Math.min(points.length, 5);
  const pointCues = Array.from({ length: numPoints }, (_, i) => dur * 0.14 + i * dur * 0.13);
  const CUE_READY = dur * 0.78;

  const titleOp = interpolate(frame - CUE_TITLE, [0, 16], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const titleY  = interpolate(spring({ frame: frame - CUE_TITLE, fps, config: { damping: 200 } }), [0, 1], [20, 0]);

  const readyOp = interpolate(frame - CUE_READY, [0, 16], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const readyPulse = readyOp > 0 ? 0.7 + Math.sin(frame * 0.1) * 0.3 : 0;

  const exitOp = interpolate(frame, [dur * 0.88, dur * 0.88 + 10], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{ backgroundColor: bgColor, overflow: 'hidden' }}>
      <SceneBackground showImage={showImage} sceneIndex={sceneIndex} />

      <VariantBackground variant={variant} accentColor={accentColor} />
      <TechGrid color={accentColor} cellSize={layout.isPortrait ? 44 : 52} opacity={0.035} />
      <NoiseOverlay />

      <AbsoluteFill style={{
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: `0 ${layout.outerPadding}px`,
        gap: layout.innerGap * 0.6,
        opacity: exitOp,
      }}>
        {/* Title */}
        <div style={{ opacity: titleOp, transform: `translateY(${titleY}px)`, textAlign: 'center' as const }}>
          <div style={{
            fontSize: layout.labelSize, color: accentColor, fontFamily: MONO_FONT,
            letterSpacing: '3px', textTransform: 'uppercase' as const, marginBottom: 10,
            textShadow: `0 0 16px ${av.glow}`,
          }}>
            ◈ RECAP
          </div>
          <div style={{
            fontSize: layout.headingSize - 4, fontWeight: '800', color: '#f1f5f9',
            fontFamily: FONT, letterSpacing: '-1px',
            textShadow: '0 2px 16px rgba(0,0,0,0.7)',
          }}>
            {title}
          </div>
        </div>

        {/* Points */}
        <div style={{
          display: 'flex', flexDirection: 'column', gap: layout.cardGap * 0.8,
          width: '100%', maxWidth: 800,
        }}>
          {points.slice(0, numPoints).map((pt, i) => {
            const cue = pointCues[i];
            const p   = spring({ frame: frame - cue, fps, config: { damping: 200 } });
            const x   = interpolate(p, [0, 1], [50, 0]);
            const op  = interpolate(frame - cue, [0, 14], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

            // Circle fill animation: empty → filled with checkmark
            const fillP = interpolate(frame - cue - 8, [0, 12], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

            return (
              <div key={i} style={{
                opacity: op, transform: `translateX(${x}px)`,
                display: 'flex', alignItems: 'center', gap: 16,
              }}>
                {/* Animated number/check circle */}
                <div style={{
                  width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
                  background: interpolate(fillP, [0, 1], [0, 1]) > 0.5
                    ? accentColor
                    : 'transparent',
                  border: `2px solid ${accentColor}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: fillP > 0.5 ? `0 0 16px ${av.glow}` : 'none',
                  transition: 'none',
                }}>
                  <span style={{
                    fontSize: 16, fontWeight: '800',
                    color: fillP > 0.5 ? '#fff' : accentColor,
                    fontFamily: MONO_FONT,
                  }}>
                    {fillP > 0.5 ? '✓' : String(i + 1)}
                  </span>
                </div>

                {/* Point text */}
                <span style={{
                  fontSize: layout.bodySize - 2, color: '#f1f5f9',
                  fontFamily: FONT, fontWeight: '500', lineHeight: 1.4,
                  textShadow: '0 1px 8px rgba(0,0,0,0.5)',
                }}>
                  {pt}
                </span>
              </div>
            );
          })}
        </div>

        {/* Ready prompt */}
        <div style={{
          opacity: readyOp, marginTop: 12,
          textAlign: 'center' as const,
        }}>
          <div style={{
            fontSize: layout.bodySize + 4, fontWeight: '700',
            color: accentColor, fontFamily: FONT,
            textShadow: `0 0 ${24 * readyPulse}px ${av.glow}, 0 2px 12px rgba(0,0,0,0.8)`,
          }}>
            {readyText}
          </div>
        </div>
      </AbsoluteFill>

      <SceneCounter current={sceneIndex + 1} total={sceneTotal} />
      {audioPath && <Audio src={staticFile(audioPath)} />}
    </AbsoluteFill>
  );
};
