// agentforge-video/src/scenes/SceneOfferCountdown.tsx
// Visual: URGENT OFFER — red GradientMesh, ScanlineEffect, pulsing bar, dramatic urgency flash
import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate, spring, AbsoluteFill, staticFile } from 'remotion';
import { Audio } from '@remotion/media';
import { FONT, MONO_FONT } from '../font';
import { NoiseOverlay } from '../shared/NoiseOverlay';
import { SceneCounter } from '../shared/SceneCounter';
import { useSceneLayout } from '../shared/useSceneLayout';
import { useVisualVariant } from '../shared/useVisualVariant';
import { VariantBackground } from '../shared/VariantBackground';
import { fitText } from '../shared/fitText';
import { SceneBackground } from '../shared/SceneBackground';
import type { SceneOfferCountdownProps, SharedSceneProps } from '../types';

export const SceneOfferCountdown: React.FC<SceneOfferCountdownProps & SharedSceneProps> = ({
  badge, offer, benefit, urgency,
  accentColor, bgColor, showImage, audioPath, sceneIndex, sceneTotal, variantId,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames: dur } = useVideoConfig();
  const variant = useVisualVariant(variantId, accentColor);
  const av = variant.av;
  const layout = useSceneLayout();

  const CUE_BADGE   = 0;
  const CUE_OFFER   = dur * 0.18;
  const CUE_BENEFIT = dur * 0.38;
  const CUE_BAR     = dur * 0.52;
  const CUE_URGENCY = dur * 0.70;

  const badgeOp = interpolate(frame - CUE_BADGE, [0, 15], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const badgeSc = interpolate(spring({ frame: frame - CUE_BADGE, fps, config: { damping: 15 } }), [0, 1], [0.45, 1]);

  const offerOp = interpolate(frame - CUE_OFFER, [0, 20], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const offerY  = interpolate(spring({ frame: frame - CUE_OFFER, fps, config: { damping: 200 } }), [0, 1], [35, 0]);

  const benefitOp = interpolate(frame - CUE_BENEFIT, [0, 18], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  // Progress bar depletes 80% → 18%
  const barWidth = interpolate(frame - CUE_BAR, [0, dur - CUE_BAR], [80, 18], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const barOp   = interpolate(frame - CUE_BAR, [0, 15], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  // Pulsing bar glow
  const barGlow = 0.5 + Math.sin(frame * 0.18) * 0.5;

  const urgencyOp = interpolate(frame - CUE_URGENCY, [0, 15], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  // Fast urgency flash using abs(sin) for no-pause flicker
  const urgencyFlash = 0.55 + Math.abs(Math.sin(frame * 0.18)) * 0.45;

  const exitOp = interpolate(frame, [dur * 0.88, dur * 0.88 + 10], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  const baseOfferSize = layout.headingSize + (layout.isPortrait ? 8 : 14);
  const offerFontSize = fitText(offer, baseOfferSize, layout.width - layout.outerPadding * 2, 2);

  return (
    <AbsoluteFill style={{ backgroundColor: bgColor, overflow: 'hidden' }}>
      <SceneBackground showImage={showImage} sceneIndex={sceneIndex} />

      {/* Variant background */}
      <VariantBackground variant={variant} accentColor={accentColor} />

      <NoiseOverlay />

      <AbsoluteFill style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: `0 ${layout.outerPadding}px`,
        gap: layout.innerGap * 0.75,
        opacity: exitOp,
      }}>

        {/* Badge */}
        <div style={{ opacity: badgeOp, transform: `scale(${badgeSc})` }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: 'rgba(239,68,68,0.12)',
            border: '1px solid rgba(239,68,68,0.45)',
            borderRadius: 100, padding: '8px 28px',
            boxShadow: '0 0 24px rgba(239,68,68,0.25)',
          }}>
            <span style={{ fontSize: 16 }}>🔥</span>
            <span style={{
              fontSize: layout.labelSize,
              color: '#ef4444',
              fontFamily: MONO_FONT,
              letterSpacing: '2px',
              textTransform: 'uppercase' as const,
              fontWeight: '600',
            }}>
              {badge}
            </span>
          </div>
        </div>

        {/* Main offer text */}
        <div style={{ opacity: offerOp, transform: `translateY(${offerY}px)`, textAlign: 'center' as const }}>
          <div style={{
            fontSize: offerFontSize,
            fontWeight: '900',
            color: '#f1f5f9',
            fontFamily: FONT,
            lineHeight: 1.05,
            letterSpacing: '-2px',
            textShadow: `0 0 40px rgba(239,68,68,0.35), 0 2px 20px rgba(0,0,0,0.8)`,
          }}>
            {offer}
          </div>
        </div>

        {/* Benefit */}
        <div style={{ opacity: benefitOp, textAlign: 'center' as const }}>
          <div style={{
            fontSize: layout.bodySize,
            color: 'rgba(148,163,184,0.85)',
            fontFamily: FONT,
            fontWeight: '400',
            textShadow: '0 1px 8px rgba(0,0,0,0.6)',
          }}>
            {benefit}
          </div>
        </div>

        {/* Depleting progress bar */}
        <div style={{ opacity: barOp, width: '100%', maxWidth: layout.isPortrait ? layout.maxContentWidth : 560 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
            <span style={{
              fontSize: layout.labelSize - 2,
              color: 'rgba(148,163,184,0.65)',
              fontFamily: MONO_FONT,
              letterSpacing: '1px',
            }}>
              ▶ SPOTS AVAILABLE
            </span>
            <span style={{
              fontSize: layout.labelSize - 2,
              color: '#ef4444',
              fontFamily: MONO_FONT,
              letterSpacing: '1px',
              fontWeight: '700',
            }}>
              {Math.round(barWidth)}%
            </span>
          </div>
          <div style={{ width: '100%', height: 10, background: 'rgba(148,163,184,0.10)', borderRadius: 5, overflow: 'hidden' }}>
            <div style={{
              width: `${barWidth}%`, height: '100%',
              background: `linear-gradient(90deg, #ef4444, ${accentColor})`,
              borderRadius: 5,
              boxShadow: `0 0 ${12 + barGlow * 16}px rgba(239,68,68,${0.5 + barGlow * 0.3})`,
            }} />
          </div>
        </div>

        {/* Urgency flash row */}
        <div style={{ opacity: urgencyOp * urgencyFlash }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 10,
            padding: '10px 24px',
            border: '1px solid rgba(239,68,68,0.5)',
            borderRadius: 6,
            background: 'rgba(239,68,68,0.08)',
          }}>
            <span style={{ fontSize: layout.bodySize - 4 }}>⚡</span>
            <span style={{
              fontSize: layout.bodySize - 4,
              color: '#ef4444',
              fontFamily: MONO_FONT,
              letterSpacing: '1.5px',
              textTransform: 'uppercase' as const,
              fontWeight: '700',
            }}>
              {urgency}
            </span>
          </div>
        </div>
      </AbsoluteFill>

      <SceneCounter current={sceneIndex + 1} total={sceneTotal} />
      {audioPath && <Audio src={staticFile(audioPath)} />}
    </AbsoluteFill>
  );
};
