// agentforge-video/src/scenes/SceneComparison.tsx
// Visual: COMPARISON TABLE — ParticleField, pulsing brand column highlight, glowing cells
import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate, spring, AbsoluteFill, staticFile } from 'remotion';
import { Audio } from '@remotion/media';
import { FONT, MONO_FONT } from '../font';
import { NoiseOverlay } from '../shared/NoiseOverlay';
import { SceneCounter } from '../shared/SceneCounter';
import { accentVariants } from '../shared/colorUtils';
import { useSceneLayout } from '../shared/useSceneLayout';
import { useVisualVariant } from '../shared/useVisualVariant';
import { VariantBackground } from '../shared/VariantBackground';
import { TechGrid } from '../shared/SvgDecorations';
import { SceneBackground } from '../shared/SceneBackground';
import type { SceneComparisonProps, SharedSceneProps } from '../types';

export const SceneComparison: React.FC<SceneComparisonProps & SharedSceneProps> = ({
  competitorLabel, brandLabel, features,
  accentColor, bgColor, showImage, brandName, audioPath, sceneIndex, sceneTotal, variantId,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames: dur } = useVideoConfig();
  const variant = useVisualVariant(variantId, accentColor);
  const av = variant.av;
  const layout = useSceneLayout();

  const CUE_HEADER = 0;
  const rowCues    = features.map((_, i) => dur * 0.18 + i * (dur * 0.09));

  const headerOp = interpolate(frame, [CUE_HEADER, CUE_HEADER + 20], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const headerY  = interpolate(spring({ frame, fps, config: { damping: 200 } }), [0, 1], [22, 0]);

  const displayFeatures = features.slice(0, layout.isPortrait ? 4 : 6);
  const compColW  = layout.isPortrait ? 120 : 170;
  const brandColW = layout.isPortrait ? 145 : 195;

  // Pulsing brand column glow
  const brandPulse = 0.7 + Math.sin(frame * 0.08) * 0.3;

  const exitOp = interpolate(frame, [dur * 0.88, dur * 0.88 + 10], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{ backgroundColor: bgColor, overflow: 'hidden' }}>
      <SceneBackground showImage={showImage} sceneIndex={sceneIndex} />

      {/* Variant background */}
      <VariantBackground variant={variant} accentColor={accentColor} />
      <TechGrid color={accentColor} cellSize={layout.isPortrait ? 44 : 56} opacity={0.035} />

      {/* Right-side accent glow hinting at brand column */}
      <AbsoluteFill style={{ background: `radial-gradient(ellipse at 82% 50%, ${av.bg} 0%, transparent 48%)` }} />

      <NoiseOverlay />

      <AbsoluteFill style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: `0 ${layout.outerPadding}px`,
        gap: 0,
        opacity: exitOp,
      }}>
        {/* Table */}
        <div style={{ width: '100%', maxWidth: layout.isPortrait ? layout.maxContentWidth : 880 }}>

          {/* Header */}
          <div style={{ opacity: headerOp, transform: `translateY(${headerY}px)`, display: 'flex', marginBottom: 18 }}>
            <div style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
              <span style={{
                fontSize: layout.labelSize, color: 'rgba(148,163,184,0.4)',
                fontFamily: MONO_FONT, letterSpacing: '2px', textTransform: 'uppercase' as const,
              }}>
                FEATURE COMPARISON
              </span>
            </div>

            {/* Competitor header */}
            <div style={{ width: compColW, textAlign: 'center' as const, padding: '12px 0' }}>
              <span style={{
                fontSize: layout.labelSize, color: 'rgba(148,163,184,0.5)',
                fontFamily: MONO_FONT, letterSpacing: '2px', textTransform: 'uppercase' as const,
              }}>
                {competitorLabel}
              </span>
            </div>

            {/* Brand header — glowing */}
            <div style={{
              width: brandColW,
              background: av.bg,
              borderRadius: '12px 12px 0 0',
              border: `1px solid ${av.border}`,
              borderBottom: 'none',
              borderTop: `2px solid ${accentColor}`,
              textAlign: 'center' as const,
              padding: '14px 0',
              boxShadow: `0 0 ${20 * brandPulse}px ${av.glow}`,
            }}>
              <span style={{
                fontSize: layout.labelSize, color: accentColor,
                fontFamily: MONO_FONT, letterSpacing: '2px', textTransform: 'uppercase' as const,
                fontWeight: '600', textShadow: `0 0 12px ${av.glow}`,
              }}>
                {brandLabel || brandName}
              </span>
            </div>
          </div>

          {/* Feature rows */}
          {displayFeatures.map((feat, i) => {
            const cue    = rowCues[i];
            const p      = spring({ frame: frame - cue, fps, config: { damping: 200 } });
            const x      = interpolate(p, [0, 1], [-28, 0]);
            const op     = interpolate(frame - cue, [0, 14], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
            const isLast = i === displayFeatures.length - 1;

            return (
              <div key={i} style={{
                opacity: op, transform: `translateX(${x}px)`,
                display: 'flex',
                borderBottom: isLast ? 'none' : `1px solid rgba(148,163,184,0.07)`,
              }}>
                {/* Feature label */}
                <div style={{ flex: 1, padding: '14px 0', display: 'flex', alignItems: 'center' }}>
                  <span style={{
                    fontSize: layout.bodySize - 4, color: 'rgba(241,245,249,0.85)',
                    fontFamily: FONT, fontWeight: '500', textShadow: '0 1px 8px rgba(0,0,0,0.8)',
                  }}>
                    {feat.label}
                  </span>
                </div>

                {/* Competitor cell */}
                <div style={{ width: compColW, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: '50%',
                    background: feat.competitor ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.10)',
                    border: `1px solid ${feat.competitor ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <span style={{ fontSize: 18, color: feat.competitor ? '#22c55e' : '#ef4444' }}>
                      {feat.competitor ? '✓' : '✗'}
                    </span>
                  </div>
                </div>

                {/* Brand cell — highlighted */}
                <div style={{
                  width: brandColW,
                  background: av.bg,
                  border: `1px solid ${av.border}`,
                  borderTop: 'none',
                  borderBottom: isLast ? `1px solid ${av.border}` : 'none',
                  borderRadius: isLast ? '0 0 12px 12px' : 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <div style={{
                    width: 34, height: 34, borderRadius: '50%',
                    background: feat.brand ? av.bg : 'rgba(239,68,68,0.10)',
                    border: `1px solid ${feat.brand ? av.border : 'rgba(239,68,68,0.2)'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: feat.brand ? `0 0 12px ${av.glow}` : 'none',
                  }}>
                    <span style={{
                      fontSize: 18,
                      color: feat.brand ? accentColor : '#ef4444',
                      fontWeight: '700',
                      textShadow: feat.brand ? `0 0 8px ${av.glow}` : 'none',
                    }}>
                      {feat.brand ? '✓' : '✗'}
                    </span>
                  </div>
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
