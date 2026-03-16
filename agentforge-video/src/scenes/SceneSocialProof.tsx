// agentforge-video/src/scenes/SceneSocialProof.tsx
// Visual: PROOF BLAST — GradientMesh, ParticleField, deterministic scramble, glassmorphic badge cards
import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate, spring, AbsoluteFill, staticFile } from 'remotion';
import { Audio } from '@remotion/media';
import { FONT, MONO_FONT } from '../font';
import { NoiseOverlay } from '../shared/NoiseOverlay';
import { SceneCounter } from '../shared/SceneCounter';
import { useSceneLayout } from '../shared/useSceneLayout';
import { useVisualVariant } from '../shared/useVisualVariant';
import { VariantBackground } from '../shared/VariantBackground';
import type { SceneSocialProofProps, SharedSceneProps } from '../types';

const CHARS = '0123456789';

// Deterministic scramble — no Math.random() at render time
function scramble(target: string, frame: number, cue: number): string {
  const elapsed = frame - cue;
  if (elapsed < 0) return target.replace(/[0-9]/g, '0');
  if (elapsed >= 35) return target;
  return target.split('').map((ch, ci) => {
    if (!/[0-9]/.test(ch)) return ch;
    const settled = elapsed / 35 * 1.3 > ((ci + 1) * 0.7) % 1;
    if (settled) return ch;
    return CHARS[(frame * 13 + target.charCodeAt(ci)) % CHARS.length];
  }).join('');
}

export const SceneSocialProof: React.FC<SceneSocialProofProps & SharedSceneProps> = ({
  title, badges,
  accentColor, bgColor, showImage, audioPath, sceneIndex, sceneTotal, variantId,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames: dur } = useVideoConfig();
  const variant = useVisualVariant(variantId, accentColor);
  const av = variant.av;
  const layout = useSceneLayout();

  const CUE_TITLE   = 0;
  const CUE_BADGE_0 = dur * 0.22;
  const BADGE_STEP  = dur * 0.14;

  const titleOp = interpolate(frame, [CUE_TITLE, CUE_TITLE + 20], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const titleY  = interpolate(spring({ frame, fps, config: { damping: 200 } }), [0, 1], [24, 0]);

  const displayBadges = badges.slice(0, layout.maxListItems + 1);

  const exitOp = interpolate(frame, [dur * 0.88, dur * 0.88 + 10], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{ backgroundColor: bgColor, overflow: 'hidden' }}>
      {showImage && (
        <>
          <AbsoluteFill style={{ backgroundImage: `url(${staticFile(`images/scene_${sceneIndex}.png`)})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
          <AbsoluteFill style={{ backgroundColor: 'rgba(0,0,0,0.78)' }} />
        </>
      )}

      {/* Variant background */}
      <VariantBackground variant={variant} accentColor={accentColor} />

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
            ◈ SOCIAL PROOF
          </div>
          <div style={{
            fontSize: layout.headingSize, fontWeight: '800', color: '#f1f5f9',
            fontFamily: FONT, letterSpacing: '-1.5px', lineHeight: 1.1,
            textShadow: '0 2px 16px rgba(0,0,0,0.7)',
          }}>
            {title}
          </div>
        </div>

        {/* Badge cards */}
        <div style={{
          display: 'flex',
          flexDirection: layout.isPortrait ? 'column' : 'row',
          gap: layout.cardGap,
          width: '100%',
          justifyContent: 'center',
          alignItems: 'stretch',
        }}>
          {displayBadges.map((badge, i) => {
            const cue   = CUE_BADGE_0 + i * BADGE_STEP;
            const p     = spring({ frame: frame - cue, fps, config: { damping: 200 } });
            const y     = interpolate(p, [0, 1], [50, 0]);
            const op    = interpolate(frame - cue, [0, 18], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
            const glowP = interpolate(p, [0, 1], [0, 1]);
            const display = scramble(badge.value, frame, cue + 10);

            return (
              <div key={i} style={{
                opacity: op, transform: `translateY(${y}px)`,
                flex: layout.isPortrait ? undefined : 1,
                background: 'rgba(255,255,255,0.04)',
                borderRadius: 20,
                border: `1px solid ${av.border}`,
                borderTop: `2px solid ${av.strong}`,
                padding: `${layout.isPortrait ? layout.cardGap : 36}px ${layout.isPortrait ? 24 : 28}px`,
                display: 'flex',
                flexDirection: layout.isPortrait ? 'row' : 'column',
                alignItems: 'center',
                gap: layout.isPortrait ? 20 : 14,
                boxShadow: `0 0 ${Math.round(35 * glowP)}px ${av.glow}`,
              }}>
                {/* Scrambling value */}
                <div style={{
                  fontSize: layout.isPortrait ? layout.headingSize : layout.displaySize - 4,
                  color: accentColor,
                  fontFamily: MONO_FONT,
                  fontWeight: '900',
                  lineHeight: 1,
                  letterSpacing: '-1px',
                  flexShrink: 0,
                  textShadow: `0 0 30px ${av.glow}`,
                }}>
                  {display}
                </div>

                {/* Portrait divider */}
                {layout.isPortrait && (
                  <div style={{
                    width: 1, height: 40,
                    background: `linear-gradient(to bottom, transparent, ${av.border}, transparent)`,
                    flexShrink: 0,
                  }} />
                )}

                {/* Label */}
                <div style={{
                  fontSize: layout.isPortrait ? layout.bodySize - 4 : layout.bodySize - 6,
                  color: 'rgba(148,163,184,0.8)',
                  fontFamily: MONO_FONT,
                  textTransform: 'uppercase' as const,
                  letterSpacing: '1.5px',
                  textAlign: layout.isPortrait ? 'left' as const : 'center' as const,
                  lineHeight: 1.3,
                }}>
                  {badge.label}
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
