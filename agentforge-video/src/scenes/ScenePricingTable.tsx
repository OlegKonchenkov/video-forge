// agentforge-video/src/scenes/ScenePricingTable.tsx
// Visual: PRICING TIERS — glassmorphic cards, popular glow, price spring, TechGrid background
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
import type { ScenePricingTableProps, SharedSceneProps } from '../types';

export const ScenePricingTable: React.FC<ScenePricingTableProps & SharedSceneProps> = ({
  title, tiers,
  accentColor, bgColor, showImage, audioPath, sceneIndex, sceneTotal, variantId,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames: dur } = useVideoConfig();
  const variant = useVisualVariant(variantId, accentColor);
  const av = variant.av;
  const layout = useSceneLayout();

  const CUE_TITLE = dur * 0.04;
  const numTiers = Math.min(tiers.length, layout.isPortrait ? 2 : 3);
  const tierCues = Array.from({ length: numTiers }, (_, i) => dur * 0.20 + i * dur * 0.16);

  const titleOp = interpolate(frame - CUE_TITLE, [0, 18], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const titleY  = interpolate(spring({ frame: frame - CUE_TITLE, fps, config: { damping: 200 } }), [0, 1], [20, 0]);

  const exitOp = interpolate(frame, [dur * 0.88, dur * 0.88 + 10], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  const cardWidth = layout.isPortrait
    ? layout.width - layout.outerPadding * 2
    : Math.floor((layout.width - layout.outerPadding * 2 - (numTiers - 1) * layout.cardGap) / numTiers);

  return (
    <AbsoluteFill style={{ backgroundColor: bgColor, overflow: 'hidden' }}>
      <SceneBackground showImage={showImage} sceneIndex={sceneIndex} />

      <VariantBackground variant={variant} accentColor={accentColor} />
      <TechGrid color={accentColor} cellSize={layout.isPortrait ? 44 : 52} opacity={0.04} />
      <NoiseOverlay />

      <AbsoluteFill style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: `0 ${layout.outerPadding}px`,
        gap: layout.innerGap,
        opacity: exitOp,
      }}>
        {/* Title */}
        <div style={{ opacity: titleOp, transform: `translateY(${titleY}px)`, textAlign: 'center' as const }}>
          <div style={{
            fontSize: layout.labelSize, color: accentColor, fontFamily: MONO_FONT,
            letterSpacing: '3px', textTransform: 'uppercase' as const, marginBottom: 10,
            textShadow: `0 0 16px ${av.glow}`,
          }}>
            ◈ PRICING
          </div>
          <div style={{
            fontSize: layout.headingSize, fontWeight: '800', color: '#f1f5f9',
            fontFamily: FONT, letterSpacing: '-1.5px', textShadow: '0 2px 16px rgba(0,0,0,0.7)',
          }}>
            {title}
          </div>
        </div>

        {/* Tier cards */}
        <div style={{
          display: 'flex',
          flexDirection: layout.isPortrait ? 'column' : 'row',
          gap: layout.cardGap,
          alignItems: layout.isPortrait ? 'center' : 'stretch',
          justifyContent: 'center',
          width: '100%',
        }}>
          {tiers.slice(0, numTiers).map((tier, i) => {
            const cue = tierCues[i];
            const p   = spring({ frame: frame - cue, fps, config: { damping: 200 } });
            const y   = interpolate(p, [0, 1], [60, tier.popular ? -12 : 0]);
            const op  = interpolate(frame - cue, [0, 18], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

            // Popular badge bounce
            const badgeP  = tier.popular ? spring({ frame: frame - cue - 12, fps, config: { damping: 12, stiffness: 180 } }) : 0;
            const badgeSc = interpolate(badgeP, [0, 1], [0.5, 1]);

            return (
              <div key={i} style={{
                opacity: op, transform: `translateY(${y}px)`,
                width: layout.isPortrait ? '100%' : cardWidth,
                background: tier.popular ? `${accentColor}10` : 'rgba(255,255,255,0.04)',
                borderRadius: 20,
                border: `1px solid ${tier.popular ? av.strong : av.border}`,
                borderTop: tier.popular ? `3px solid ${accentColor}` : `1px solid ${av.border}`,
                padding: `${layout.isPortrait ? 24 : 32}px ${layout.isPortrait ? 24 : 28}px`,
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16,
                boxShadow: tier.popular
                  ? `0 0 40px ${av.glow}, 0 0 20px ${av.glow}`
                  : `0 0 20px ${av.glow}`,
                position: 'relative' as const,
              }}>
                {/* Popular badge */}
                {tier.popular && (
                  <div style={{
                    position: 'absolute' as const, top: -14, left: '50%',
                    transform: `translateX(-50%) scale(${badgeSc})`,
                    background: accentColor, borderRadius: 100,
                    padding: '4px 16px',
                    boxShadow: `0 0 16px ${av.glow}`,
                  }}>
                    <span style={{ fontSize: layout.labelSize - 2, color: '#fff', fontFamily: MONO_FONT, fontWeight: '700', letterSpacing: '1px', textTransform: 'uppercase' as const }}>
                      Popular
                    </span>
                  </div>
                )}

                {/* Tier name */}
                <div style={{
                  fontSize: layout.bodySize - 2, color: 'rgba(148,163,184,0.8)',
                  fontFamily: MONO_FONT, letterSpacing: '2px', textTransform: 'uppercase' as const,
                  marginTop: tier.popular ? 8 : 0,
                }}>
                  {tier.name}
                </div>

                {/* Price */}
                <div style={{
                  fontSize: layout.isPortrait ? layout.headingSize : layout.displaySize - 16,
                  fontWeight: '900', color: tier.popular ? accentColor : '#f1f5f9',
                  fontFamily: MONO_FONT, lineHeight: 1,
                  textShadow: tier.popular ? `0 0 30px ${av.glow}` : '0 2px 12px rgba(0,0,0,0.6)',
                }}>
                  {tier.price}
                </div>

                {/* Separator */}
                <div style={{
                  width: '80%', height: 1,
                  background: `linear-gradient(90deg, transparent, ${tier.popular ? accentColor : av.border}, transparent)`,
                }} />

                {/* Features */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%' }}>
                  {tier.features.slice(0, 3).map((feat, fi) => (
                    <div key={fi} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: 14, color: tier.popular ? accentColor : '#22c55e' }}>✓</span>
                      <span style={{
                        fontSize: layout.labelSize + 2, color: 'rgba(148,163,184,0.75)',
                        fontFamily: FONT, lineHeight: 1.35,
                      }}>
                        {feat}
                      </span>
                    </div>
                  ))}
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
