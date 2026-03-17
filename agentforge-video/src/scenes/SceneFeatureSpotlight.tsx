// agentforge-video/src/scenes/SceneFeatureSpotlight.tsx
// Visual: FEATURE SPOTLIGHT — large centered icon with radial glow, benefit pills, ScanBeam
import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate, spring, AbsoluteFill, staticFile } from 'remotion';
import { Audio } from '@remotion/media';
import { FONT, MONO_FONT } from '../font';
import { NoiseOverlay } from '../shared/NoiseOverlay';
import { SceneCounter } from '../shared/SceneCounter';
import { useSceneLayout } from '../shared/useSceneLayout';
import { useVisualVariant } from '../shared/useVisualVariant';
import { VariantBackground } from '../shared/VariantBackground';
import { ScanBeam } from '../shared/SvgDecorations';
import { resolveEmoji } from '../shared/emojiMap';
import { SceneBackground } from '../shared/SceneBackground';
import type { SceneFeatureSpotlightProps, SharedSceneProps } from '../types';

export const SceneFeatureSpotlight: React.FC<SceneFeatureSpotlightProps & SharedSceneProps> = ({
  icon, featureName, description, benefits,
  accentColor, bgColor, showImage, audioPath, sceneIndex, sceneTotal, variantId,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames: dur } = useVideoConfig();
  const variant = useVisualVariant(variantId, accentColor);
  const av = variant.av;
  const layout = useSceneLayout();

  const CUE_ICON  = dur * 0.04;
  const CUE_NAME  = dur * 0.14;
  const CUE_DESC  = dur * 0.28;
  const benefitCues = [dur * 0.44, dur * 0.56, dur * 0.68];

  // Icon bounce spring
  const iconP  = spring({ frame: frame - CUE_ICON, fps, config: { damping: 12, stiffness: 160 } });
  const iconSc = interpolate(iconP, [0, 1], [0.3, 1]);
  const iconOp = interpolate(frame - CUE_ICON, [0, 12], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  // Radial glow pulse
  const glowPulse = 0.6 + Math.sin(frame * 0.06) * 0.4;
  const glowSize  = interpolate(iconP, [0, 1], [0, layout.isPortrait ? 140 : 180]);

  const nameOp = interpolate(frame - CUE_NAME, [0, 16], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const nameY  = interpolate(spring({ frame: frame - CUE_NAME, fps, config: { damping: 200 } }), [0, 1], [18, 0]);

  const descOp = interpolate(frame - CUE_DESC, [0, 16], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  const exitOp = interpolate(frame, [dur * 0.88, dur * 0.88 + 10], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  const iconSize = layout.isPortrait ? 80 : 100;

  return (
    <AbsoluteFill style={{ backgroundColor: bgColor, overflow: 'hidden' }}>
      <SceneBackground showImage={showImage} sceneIndex={sceneIndex} />

      <VariantBackground variant={variant} accentColor={accentColor} />
      <ScanBeam color={accentColor} opacity={0.05} speed={0.005} thickness={1} />
      <NoiseOverlay />

      <AbsoluteFill style={{
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: `0 ${layout.outerPadding}px`,
        gap: layout.innerGap * 0.6,
        opacity: exitOp,
      }}>
        {/* Large icon with glow */}
        <div style={{
          position: 'relative' as const,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {/* Radial glow behind icon */}
          <div style={{
            position: 'absolute' as const,
            width: glowSize * 2, height: glowSize * 2,
            borderRadius: '50%',
            background: `radial-gradient(circle, ${accentColor}30 0%, transparent 70%)`,
            opacity: glowPulse,
            pointerEvents: 'none',
          }} />

          {/* Icon circle */}
          <div style={{
            opacity: iconOp, transform: `scale(${iconSc})`,
            width: iconSize, height: iconSize, borderRadius: '50%',
            background: `radial-gradient(circle at 35% 35%, ${av.strong}, ${accentColor})`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: `0 0 40px ${av.glow}, 0 0 20px ${av.glow}`,
            position: 'relative' as const, zIndex: 1,
          }}>
            <span style={{ fontSize: iconSize * 0.45 }}>
              {resolveEmoji(icon)}
            </span>
          </div>
        </div>

        {/* Feature name */}
        <div style={{
          opacity: nameOp, transform: `translateY(${nameY}px)`,
          textAlign: 'center' as const,
        }}>
          <div style={{
            fontSize: layout.headingSize, fontWeight: '800', color: '#ffffff',
            fontFamily: FONT, letterSpacing: '-1px',
            textShadow: '0 2px 16px rgba(0,0,0,0.7)',
          }}>
            {featureName}
          </div>
        </div>

        {/* Description */}
        <div style={{
          opacity: descOp, textAlign: 'center' as const,
          maxWidth: layout.maxContentWidth,
        }}>
          <div style={{
            fontSize: layout.bodySize - 2, color: 'rgba(148,163,184,0.85)',
            fontFamily: FONT, lineHeight: 1.55,
            textShadow: '0 1px 8px rgba(0,0,0,0.6)',
          }}>
            {description}
          </div>
        </div>

        {/* Benefit pills */}
        <div style={{
          display: 'flex',
          flexDirection: layout.isPortrait ? 'column' : 'row',
          gap: layout.cardGap * 0.8,
          alignItems: 'center',
          justifyContent: 'center',
          marginTop: 8,
        }}>
          {benefits.map((b, i) => {
            const cue = benefitCues[i];
            const p   = spring({ frame: frame - cue, fps, config: { damping: 200 } });
            const sc  = interpolate(p, [0, 1], [0.8, 1]);
            const op  = interpolate(frame - cue, [0, 14], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

            return (
              <div key={i} style={{
                opacity: op, transform: `scale(${sc})`,
                display: 'flex', alignItems: 'center', gap: 8,
                background: av.bg, border: `1px solid ${av.border}`,
                borderRadius: 100, padding: '8px 20px',
                boxShadow: `0 0 16px ${av.glow}`,
              }}>
                <span style={{ fontSize: 14, color: accentColor }}>✓</span>
                <span style={{
                  fontSize: layout.labelSize + 2, color: '#f1f5f9',
                  fontFamily: FONT, fontWeight: '600',
                  whiteSpace: 'nowrap' as const,
                }}>
                  {b}
                </span>
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
