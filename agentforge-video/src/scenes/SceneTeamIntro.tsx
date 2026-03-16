// agentforge-video/src/scenes/SceneTeamIntro.tsx
// Visual: TEAM GRID — GradientMesh, hexagon geometry, ShimmerOverlay on avatars, glow cards
import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate, spring, AbsoluteFill, staticFile } from 'remotion';
import { Audio } from '@remotion/media';
import { FONT, MONO_FONT } from '../font';
import { NoiseOverlay } from '../shared/NoiseOverlay';
import { SceneCounter } from '../shared/SceneCounter';
import { ShimmerOverlay } from '../shared/ShimmerOverlay';
import { useSceneLayout } from '../shared/useSceneLayout';
import { useVisualVariant } from '../shared/useVisualVariant';
import { VariantBackground } from '../shared/VariantBackground';
import type { SceneTeamIntroProps, SharedSceneProps } from '../types';

export const SceneTeamIntro: React.FC<SceneTeamIntroProps & SharedSceneProps> = ({
  title, members,
  accentColor, bgColor, showImage, audioPath, sceneIndex, sceneTotal, variantId,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames: dur } = useVideoConfig();
  const variant = useVisualVariant(variantId, accentColor);
  const av = variant.av;
  const layout = useSceneLayout();

  const CUE_TITLE = 0;
  const numCards  = layout.isPortrait ? 3 : 4;
  const memberCues = Array.from({ length: numCards }, (_, i) => dur * 0.20 + i * (dur * 0.11));

  const titleOp = interpolate(frame, [CUE_TITLE, CUE_TITLE + 20], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const titleY  = interpolate(spring({ frame, fps, config: { damping: 200 } }), [0, 1], [22, 0]);

  const cardWidth  = Math.floor((layout.width - layout.outerPadding * 2 - (numCards - 1) * layout.cardGap) / numCards);
  const avatarSize = layout.isPortrait ? 64 : 84;

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
            ◈ OUR TEAM
          </div>
          <div style={{
            fontSize: layout.headingSize, fontWeight: '800', color: '#f1f5f9',
            fontFamily: FONT, letterSpacing: '-1.5px', textShadow: '0 2px 20px rgba(0,0,0,0.7)',
          }}>
            {title}
          </div>
        </div>

        {/* Member cards */}
        <div style={{ display: 'flex', gap: layout.cardGap, flexWrap: 'wrap' as const, justifyContent: 'center' }}>
          {members.slice(0, numCards).map((member, i) => {
            const cue = memberCues[i];
            const p   = spring({ frame: frame - cue, fps, config: { damping: 200 } });
            const y   = interpolate(p, [0, 1], [60, 0]);
            const op  = interpolate(frame - cue, [0, 18], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

            return (
              <div key={i} style={{
                opacity: op, transform: `translateY(${y}px)`,
                width: cardWidth,
                background: 'rgba(255,255,255,0.04)',
                borderRadius: 20,
                border: `1px solid ${av.border}`,
                borderTop: `2px solid ${av.strong}`,
                padding: `${layout.innerGap * 0.8}px ${layout.cardGap}px`,
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: layout.cardGap * 0.55,
                boxShadow: `0 0 30px ${av.glow}`,
              }}>
                {/* Avatar with shimmer sweep */}
                <div style={{
                  width: avatarSize, height: avatarSize, borderRadius: '50%',
                  background: `radial-gradient(circle at 35% 35%, ${av.strong}, ${accentColor})`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: `0 0 32px ${av.glow}, 0 0 16px ${av.glow}`,
                  flexShrink: 0,
                  position: 'relative' as const,
                  overflow: 'hidden',
                }}>
                  <span style={{
                    fontSize: layout.bodySize - 2,
                    fontWeight: '800',
                    color: '#ffffff',
                    fontFamily: FONT,
                    textShadow: '0 1px 8px rgba(0,0,0,0.5)',
                  }}>
                    {member.initials}
                  </span>
                  <ShimmerOverlay color="#ffffff" periodFrames={120 + i * 30} opacity={0.4} width="70%" />
                </div>

                {/* Name */}
                <div style={{
                  fontSize: layout.bodySize - 5,
                  fontWeight: '700',
                  color: '#f1f5f9',
                  fontFamily: FONT,
                  textAlign: 'center' as const,
                  lineHeight: 1.3,
                  textShadow: '0 1px 8px rgba(0,0,0,0.6)',
                }}>
                  {member.name}
                </div>

                {/* Role */}
                <div style={{
                  fontSize: layout.labelSize,
                  color: accentColor,
                  fontFamily: MONO_FONT,
                  textTransform: 'uppercase' as const,
                  letterSpacing: '1.5px',
                  textAlign: 'center' as const,
                  textShadow: `0 0 10px ${av.glow}`,
                }}>
                  {member.role}
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
