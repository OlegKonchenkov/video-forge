// agentforge-video/src/scenes/SceneCaseStudy.tsx
// Visual: CASE STUDY — split metric delta + client quote, CornerBrackets, glassmorphic
import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate, spring, AbsoluteFill, staticFile } from 'remotion';
import { Audio } from '@remotion/media';
import { FONT, MONO_FONT } from '../font';
import { NoiseOverlay } from '../shared/NoiseOverlay';
import { SceneCounter } from '../shared/SceneCounter';
import { useSceneLayout } from '../shared/useSceneLayout';
import { useVisualVariant } from '../shared/useVisualVariant';
import { VariantBackground } from '../shared/VariantBackground';
import { CornerBrackets } from '../shared/SvgDecorations';
import { SceneBackground } from '../shared/SceneBackground';
import type { SceneCaseStudyProps, SharedSceneProps } from '../types';

export const SceneCaseStudy: React.FC<SceneCaseStudyProps & SharedSceneProps> = ({
  clientName, clientRole, quote, metricLabel, metricBefore, metricAfter,
  accentColor, bgColor, showImage, audioPath, sceneIndex, sceneTotal, variantId,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames: dur } = useVideoConfig();
  const variant = useVisualVariant(variantId, accentColor);
  const av = variant.av;
  const layout = useSceneLayout();

  const CUE_LABEL  = dur * 0.06;
  const CUE_BEFORE = dur * 0.14;
  const CUE_AFTER  = dur * 0.30;
  const CUE_QUOTE  = dur * 0.50;

  const labelOp  = interpolate(frame - CUE_LABEL, [0, 15], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const beforeOp = interpolate(frame - CUE_BEFORE, [0, 15], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const beforeY  = interpolate(spring({ frame: frame - CUE_BEFORE, fps, config: { damping: 200 } }), [0, 1], [30, 0]);

  const afterOp = interpolate(frame - CUE_AFTER, [0, 18], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const afterSc = interpolate(spring({ frame: frame - CUE_AFTER, fps, config: { damping: 14, stiffness: 160 } }), [0, 1], [0.6, 1]);

  const quoteOp = interpolate(frame - CUE_QUOTE, [0, 18], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const quoteY  = interpolate(spring({ frame: frame - CUE_QUOTE, fps, config: { damping: 200 } }), [0, 1], [24, 0]);

  const exitOp = interpolate(frame, [dur * 0.88, dur * 0.88 + 10], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  // Glow pulse on the "after" metric
  const afterPulse = 0.7 + Math.sin(frame * 0.08) * 0.3;

  return (
    <AbsoluteFill style={{ backgroundColor: bgColor, overflow: 'hidden' }}>
      <SceneBackground showImage={showImage} sceneIndex={sceneIndex} />

      <VariantBackground variant={variant} accentColor={accentColor} />
      <CornerBrackets color={accentColor} size={layout.isPortrait ? 16 : 24} offset={layout.isPortrait ? 28 : 40} startFrame={Math.round(CUE_LABEL)} opacity={0.18} />
      <NoiseOverlay />

      <AbsoluteFill style={{
        display: 'flex',
        flexDirection: layout.direction,
        alignItems: 'center',
        justifyContent: 'center',
        padding: `${layout.outerPadding}px`,
        gap: layout.innerGap,
        opacity: exitOp,
      }}>
        {/* Left / Top: Metric delta */}
        <div style={{
          flex: layout.isPortrait ? undefined : 1,
          width: layout.isPortrait ? '100%' : undefined,
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16,
        }}>
          {/* Metric label */}
          <div style={{
            opacity: labelOp,
            fontSize: layout.labelSize, color: accentColor, fontFamily: MONO_FONT,
            letterSpacing: '3px', textTransform: 'uppercase' as const,
            textShadow: `0 0 12px ${av.glow}`,
          }}>
            📊 {metricLabel}
          </div>

          {/* Before value — strikethrough red */}
          <div style={{
            opacity: beforeOp, transform: `translateY(${beforeY}px)`,
            textAlign: 'center' as const,
          }}>
            <div style={{
              fontSize: layout.isPortrait ? layout.headingSize : layout.displaySize - 20,
              fontWeight: '900', color: 'rgba(239,68,68,0.5)',
              fontFamily: MONO_FONT, lineHeight: 1,
              textDecoration: 'line-through',
              textDecorationColor: 'rgba(239,68,68,0.6)',
              textShadow: '0 0 12px rgba(239,68,68,0.2)',
            }}>
              {metricBefore}
            </div>
          </div>

          {/* After value — accent glow */}
          <div style={{
            opacity: afterOp,
            transform: `scale(${afterSc})`,
            textAlign: 'center' as const,
          }}>
            <div style={{
              fontSize: layout.isPortrait ? layout.headingSize + 10 : layout.displaySize,
              fontWeight: '900', color: accentColor,
              fontFamily: MONO_FONT, lineHeight: 1,
              letterSpacing: '-2px',
              textShadow: `0 0 ${40 * afterPulse}px ${av.glow}, 0 2px 16px rgba(0,0,0,0.9)`,
            }}>
              {metricAfter}
            </div>
          </div>
        </div>

        {/* Divider */}
        <div style={layout.isPortrait
          ? { width: 160, height: 1, background: `linear-gradient(to right, transparent, ${av.border}, transparent)` }
          : { width: 1, height: 200, background: `linear-gradient(to bottom, transparent, ${av.border}, transparent)` }
        } />

        {/* Right / Bottom: Quote + client info */}
        <div style={{
          flex: layout.isPortrait ? undefined : 1,
          width: layout.isPortrait ? '100%' : undefined,
          opacity: quoteOp, transform: `translateY(${quoteY}px)`,
        }}>
          <div style={{
            background: 'rgba(255,255,255,0.04)',
            borderRadius: 20,
            border: `1px solid ${av.border}`,
            borderLeft: `3px solid ${accentColor}`,
            padding: `${layout.innerGap * 0.7}px ${layout.innerGap * 0.7}px`,
            boxShadow: `0 0 30px ${av.glow}`,
          }}>
            {/* Quote mark */}
            <div style={{
              fontSize: layout.headingSize, color: accentColor, fontFamily: FONT,
              lineHeight: 0.8, marginBottom: 8, opacity: 0.5,
            }}>
              &ldquo;
            </div>

            {/* Quote text */}
            <div style={{
              fontSize: layout.bodySize, color: '#f1f5f9', fontFamily: FONT,
              fontWeight: '500', lineHeight: 1.55, fontStyle: 'italic' as const,
              textShadow: '0 1px 10px rgba(0,0,0,0.6)',
              marginBottom: 20,
            }}>
              {quote}
            </div>

            {/* Client info */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              {/* Avatar circle with initials */}
              <div style={{
                width: 42, height: 42, borderRadius: '50%',
                background: `radial-gradient(circle at 35% 35%, ${av.strong}, ${accentColor})`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: `0 0 16px ${av.glow}`,
                flexShrink: 0,
              }}>
                <span style={{ fontSize: 16, fontWeight: '800', color: '#fff', fontFamily: FONT }}>
                  {clientName.split(' ').map(w => w[0]).join('').slice(0, 2)}
                </span>
              </div>
              <div>
                <div style={{ fontSize: layout.bodySize - 4, fontWeight: '700', color: '#f1f5f9', fontFamily: FONT }}>
                  {clientName}
                </div>
                <div style={{ fontSize: layout.labelSize, color: accentColor, fontFamily: MONO_FONT, letterSpacing: '1px' }}>
                  {clientRole}
                </div>
              </div>
            </div>
          </div>
        </div>
      </AbsoluteFill>

      <SceneCounter current={sceneIndex + 1} total={sceneTotal} />
      {audioPath && <Audio src={staticFile(audioPath)} />}
    </AbsoluteFill>
  );
};
