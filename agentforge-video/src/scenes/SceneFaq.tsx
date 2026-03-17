// agentforge-video/src/scenes/SceneFaq.tsx
// Visual: FAQ CARDS — sequential Q&A cards, question accent, answer fade, FloatingOrbs
import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate, spring, AbsoluteFill, staticFile } from 'remotion';
import { Audio } from '@remotion/media';
import { FONT, MONO_FONT } from '../font';
import { NoiseOverlay } from '../shared/NoiseOverlay';
import { SceneCounter } from '../shared/SceneCounter';
import { useSceneLayout } from '../shared/useSceneLayout';
import { useVisualVariant } from '../shared/useVisualVariant';
import { VariantBackground } from '../shared/VariantBackground';
import { FloatingOrbs } from '../shared/SvgDecorations';
import { SceneBackground } from '../shared/SceneBackground';
import type { SceneFaqProps, SharedSceneProps } from '../types';

export const SceneFaq: React.FC<SceneFaqProps & SharedSceneProps> = ({
  title, items,
  accentColor, bgColor, showImage, audioPath, sceneIndex, sceneTotal, variantId,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames: dur } = useVideoConfig();
  const variant = useVisualVariant(variantId, accentColor);
  const av = variant.av;
  const layout = useSceneLayout();

  const CUE_TITLE = dur * 0.04;
  const numItems = Math.min(items.length, layout.maxListItems);
  // Spread items across 16%-64% of timeline
  const itemCues = Array.from({ length: numItems }, (_, i) => dur * 0.16 + i * dur * 0.24);

  const titleOp = interpolate(frame - CUE_TITLE, [0, 18], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const titleY  = interpolate(spring({ frame: frame - CUE_TITLE, fps, config: { damping: 200 } }), [0, 1], [20, 0]);

  const exitOp = interpolate(frame, [dur * 0.88, dur * 0.88 + 10], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{ backgroundColor: bgColor, overflow: 'hidden' }}>
      <SceneBackground showImage={showImage} sceneIndex={sceneIndex} />

      <VariantBackground variant={variant} accentColor={accentColor} />
      <FloatingOrbs color={av.glow} count={3} opacity={0.07} speed={0.010} />
      <NoiseOverlay />

      <AbsoluteFill style={{
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: `0 ${layout.outerPadding}px`,
        gap: layout.innerGap * 0.8,
        opacity: exitOp,
      }}>
        {/* Title */}
        <div style={{ opacity: titleOp, transform: `translateY(${titleY}px)`, textAlign: 'center' as const }}>
          <div style={{
            fontSize: layout.labelSize, color: accentColor, fontFamily: MONO_FONT,
            letterSpacing: '3px', textTransform: 'uppercase' as const, marginBottom: 10,
            textShadow: `0 0 16px ${av.glow}`,
          }}>
            ◈ FAQ
          </div>
          <div style={{
            fontSize: layout.headingSize - 4, fontWeight: '800', color: '#f1f5f9',
            fontFamily: FONT, letterSpacing: '-1px', textShadow: '0 2px 16px rgba(0,0,0,0.7)',
          }}>
            {title}
          </div>
        </div>

        {/* Q&A cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: layout.cardGap, width: '100%', maxWidth: 900 }}>
          {items.slice(0, numItems).map((item, i) => {
            const qCue = itemCues[i];
            const aCue = qCue + 15;

            const qP  = spring({ frame: frame - qCue, fps, config: { damping: 200 } });
            const qX  = interpolate(qP, [0, 1], [40, 0]);
            const qOp = interpolate(frame - qCue, [0, 14], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

            const aOp = interpolate(frame - aCue, [0, 16], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
            const aY  = interpolate(spring({ frame: frame - aCue, fps, config: { damping: 200 } }), [0, 1], [12, 0]);

            return (
              <div key={i} style={{
                opacity: qOp, transform: `translateX(${qX}px)`,
                background: 'rgba(255,255,255,0.04)',
                borderRadius: 16,
                border: `1px solid ${av.border}`,
                borderLeft: `3px solid ${accentColor}`,
                padding: `${layout.isPortrait ? 18 : 24}px ${layout.isPortrait ? 20 : 28}px`,
                boxShadow: `0 0 24px ${av.glow}`,
              }}>
                {/* Question */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 10 }}>
                  <span style={{
                    fontSize: layout.bodySize - 4, fontWeight: '800', color: accentColor,
                    fontFamily: MONO_FONT, flexShrink: 0, marginTop: 2,
                  }}>
                    Q:
                  </span>
                  <span style={{
                    fontSize: layout.bodySize - 2, fontWeight: '700', color: '#f1f5f9',
                    fontFamily: FONT, lineHeight: 1.4,
                    textShadow: '0 1px 8px rgba(0,0,0,0.6)',
                  }}>
                    {item.question}
                  </span>
                </div>

                {/* Answer */}
                <div style={{
                  opacity: aOp, transform: `translateY(${aY}px)`,
                  paddingLeft: layout.isPortrait ? 0 : 30,
                }}>
                  <span style={{
                    fontSize: layout.bodySize - 4, color: 'rgba(148,163,184,0.8)',
                    fontFamily: FONT, lineHeight: 1.55,
                  }}>
                    {item.answer}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </AbsoluteFill>

      <SceneCounter current={sceneIndex + 1} total={sceneTotal} />
      {audioPath && <Audio src={staticFile(audioPath)} />}
    </AbsoluteFill>
  );
};
