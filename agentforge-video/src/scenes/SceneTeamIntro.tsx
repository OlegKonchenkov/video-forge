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
import { FloatingOrbs } from '../shared/SvgDecorations';
import { SceneBackground } from '../shared/SceneBackground';
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

  // Portrait: horizontal row cards (wider) — Landscape: grid cards
  const cardWidth  = layout.isPortrait
    ? Math.floor(layout.width - layout.outerPadding * 2)
    : Math.floor((layout.width - layout.outerPadding * 2 - (numCards - 1) * layout.cardGap) / numCards);
  const avatarSize = layout.isPortrait ? 52 : 84;

  const exitOp = interpolate(frame, [dur * 0.88, dur * 0.88 + 10], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{ backgroundColor: bgColor, overflow: 'hidden' }}>
      <SceneBackground showImage={showImage} sceneIndex={sceneIndex} overlayOpacity={0.78} />

      {/* Variant background */}
      <VariantBackground variant={variant} accentColor={accentColor} />
      <FloatingOrbs color={av.glow} count={3} opacity={0.07} speed={0.010} />

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
            fontSize: layout.headingSize, fontWeight: '800', color: '#ffffff',
            fontFamily: FONT, letterSpacing: '-1.5px', textShadow: '0 2px 20px rgba(0,0,0,0.7)',
          }}>
            {title}
          </div>
        </div>

        {/* Member cards */}
        <div style={{
          display: 'flex',
          flexDirection: layout.isPortrait ? 'column' : 'row',
          gap: layout.cardGap,
          flexWrap: layout.isPortrait ? 'nowrap' as const : 'wrap' as const,
          justifyContent: 'center',
          width: '100%',
        }}>
          {members.slice(0, numCards).map((member, i) => {
            const cue = memberCues[i];
            const p   = spring({ frame: frame - cue, fps, config: { damping: 200 } });
            const y   = interpolate(p, [0, 1], [60, 0]);
            const op  = interpolate(frame - cue, [0, 18], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

            return (
              <div key={i} style={{
                opacity: op, transform: `translateY(${y}px)`,
                width: layout.isPortrait ? '100%' : cardWidth,
                background: 'rgba(255,255,255,0.08)',
                borderRadius: 20,
                border: `1px solid ${av.border}`,
                borderLeft: layout.isPortrait ? `3px solid ${av.strong}` : undefined,
                borderTop: layout.isPortrait ? undefined : `2px solid ${av.strong}`,
                padding: layout.isPortrait ? '18px 24px' : `${layout.innerGap * 0.8}px ${layout.cardGap}px`,
                display: 'flex',
                flexDirection: layout.isPortrait ? 'row' : 'column',
                alignItems: 'center',
                gap: layout.isPortrait ? 20 : layout.cardGap * 0.55,
                boxShadow: `0 4px 30px rgba(0,0,0,0.3), 0 0 30px ${av.glow}`,
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
                    fontSize: layout.isPortrait ? layout.bodySize - 6 : layout.bodySize - 2,
                    fontWeight: '800',
                    color: '#ffffff',
                    fontFamily: FONT,
                    textShadow: '0 1px 8px rgba(0,0,0,0.5)',
                  }}>
                    {member.initials}
                  </span>
                  <ShimmerOverlay color="#ffffff" periodFrames={120 + i * 30} opacity={0.4} width="70%" />
                </div>

                {/* Name & Role */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
                  <div style={{
                    fontSize: layout.isPortrait ? layout.bodySize - 2 : layout.bodySize - 5,
                    fontWeight: '700',
                    color: '#f1f5f9',
                    fontFamily: FONT,
                    textAlign: layout.isPortrait ? 'left' as const : 'center' as const,
                    lineHeight: 1.3,
                    textShadow: '0 1px 8px rgba(0,0,0,0.6)',
                  }}>
                    {member.name}
                  </div>
                  <div style={{
                    fontSize: layout.labelSize,
                    color: accentColor,
                    fontFamily: MONO_FONT,
                    textTransform: 'uppercase' as const,
                    letterSpacing: '1.5px',
                    textAlign: layout.isPortrait ? 'left' as const : 'center' as const,
                    textShadow: `0 0 10px ${av.glow}`,
                  }}>
                    {member.role}
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
