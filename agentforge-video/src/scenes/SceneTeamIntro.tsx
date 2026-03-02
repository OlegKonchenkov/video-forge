// agentforge-video/src/scenes/SceneTeamIntro.tsx
import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate, spring, AbsoluteFill, staticFile } from 'remotion';
import { Audio } from '@remotion/media';
import { FONT, MONO_FONT } from '../font';
import { NoiseOverlay } from '../shared/NoiseOverlay';
import { SceneCounter } from '../shared/SceneCounter';
import { accentVariants } from '../shared/colorUtils';
import type { SceneTeamIntroProps, SharedSceneProps } from '../types';

export const SceneTeamIntro: React.FC<SceneTeamIntroProps & SharedSceneProps> = ({
  title, members,
  accentColor, audioPath, sceneIndex, sceneTotal,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames: dur } = useVideoConfig();
  const av = accentVariants(accentColor);

  const CUE_TITLE = 0;
  const memberCues = members.slice(0, 4).map((_, i) => dur * 0.22 + i * (dur * 0.12));

  const titleOp = interpolate(frame, [CUE_TITLE, CUE_TITLE + 20], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const titleY  = interpolate(spring({ frame, fps, config: { damping: 200 } }), [0, 1], [20, 0]);

  // Warm tint overlay
  const warmOp = interpolate(frame, [0, 40], [0, 1], { extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{ backgroundColor: '#050d1a', overflow: 'hidden' }}>
      {/* Warm tint radial */}
      <AbsoluteFill style={{ background: `radial-gradient(ellipse at 50% 40%, rgba(251,191,36,0.04) 0%, transparent 65%)`, opacity: warmOp }} />
      <AbsoluteFill style={{ background: `radial-gradient(ellipse at 50% 0%, ${av.bg} 0%, transparent 55%)` }} />
      <NoiseOverlay />

      <AbsoluteFill style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 80px', gap: 52 }}>
        {/* Title */}
        <div style={{ opacity: titleOp, transform: `translateY(${titleY}px)`, textAlign: 'center' as const }}>
          <div style={{ fontSize: 48, fontWeight: '800', color: '#f1f5f9', fontFamily: FONT, letterSpacing: '-1.5px' }}>{title}</div>
        </div>

        {/* Member cards */}
        <div style={{ display: 'flex', gap: 28, flexWrap: 'wrap' as const, justifyContent: 'center' }}>
          {members.slice(0, 4).map((member, i) => {
            const cue = memberCues[i];
            const p   = spring({ frame: frame - cue, fps, config: { damping: 200 } });
            const y   = interpolate(p, [0, 1], [50, 0]);
            const op  = interpolate(frame - cue, [0, 18], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

            return (
              <div key={i} style={{
                opacity: op, transform: `translateY(${y}px)`,
                width: 200,
                background: av.bg,
                borderRadius: 20,
                border: `1px solid ${av.border}`,
                padding: '28px 20px',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14,
              }}>
                {/* Avatar circle */}
                <div style={{
                  width: 80, height: 80, borderRadius: '50%',
                  background: `linear-gradient(135deg, ${accentColor}, ${av.strong})`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: `0 0 24px ${av.glow}`,
                  flexShrink: 0,
                }}>
                  <span style={{ fontSize: 28, fontWeight: '700', color: '#ffffff', fontFamily: FONT }}>
                    {member.initials}
                  </span>
                </div>
                {/* Name */}
                <div style={{ fontSize: 20, fontWeight: '700', color: '#f1f5f9', fontFamily: FONT, textAlign: 'center' as const, lineHeight: 1.3 }}>
                  {member.name}
                </div>
                {/* Role */}
                <div style={{ fontSize: 14, color: 'rgba(148,163,184,0.65)', fontFamily: MONO_FONT, textTransform: 'uppercase' as const, letterSpacing: '1.5px', textAlign: 'center' as const }}>
                  {member.role}
                </div>
              </div>
            );
          })}
        </div>
      </AbsoluteFill>

      <SceneCounter current={sceneIndex + 1} total={sceneTotal} />
      <Audio src={staticFile(audioPath)} />
    </AbsoluteFill>
  );
};
