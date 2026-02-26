// agentforge-video/src/scenes/Scene5Solution.tsx
import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate, spring, AbsoluteFill, Img, staticFile } from 'remotion';
import { Audio } from '@remotion/media';
import { COLORS, WIDTH, HEIGHT } from '../constants';
import { FONT } from '../font';
import { CheckIcon } from '../icons';
import type { SceneSolutionProps } from '../types';

const AgentCard: React.FC<{
  icon: string; title: string; status: string; detail: string; cue: number; exitGlowStart: number;
}> = ({ icon, title, status, detail, cue, exitGlowStart }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const progress      = spring({ frame: frame - cue, fps, config: { damping: 200 } });
  const y             = interpolate(progress, [0, 1], [30, 0]);
  const opacity       = interpolate(frame - cue, [0, 12], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const dotPulse      = interpolate(frame % 50, [0, 25, 50], [0.7, 1, 0.7]);
  const checkProgress = interpolate(frame - cue - 15, [0, 30], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const glowPulse     = interpolate(frame - exitGlowStart, [0, 12, 24], [0, 0.6, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  return (
    <div style={{
      opacity, transform: `translateY(${y}px)`,
      background: 'rgba(59,130,246,0.05)', border: '1px solid rgba(59,130,246,0.18)',
      borderRadius: 14, padding: '18px 24px',
      display: 'flex', alignItems: 'center', gap: 16, overflow: 'hidden',
      boxShadow: `0 0 ${glowPulse * 30}px rgba(34,197,94,${glowPulse})`,
    }}>
      <div style={{ fontSize: 34, flexShrink: 0, width: 44, textAlign: 'center' }}>{icon}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 24, fontWeight: '700', color: COLORS.white, fontFamily: FONT, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{title}</div>
        <div style={{ fontSize: 19, color: COLORS.gray, fontFamily: FONT, marginTop: 2, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{detail}</div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
        <CheckIcon size={22} color="#22c55e" progress={checkProgress} />
        <div style={{ fontSize: 18, color: '#22c55e', fontFamily: FONT, fontWeight: '600', whiteSpace: 'nowrap' }}>{status}</div>
        <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#22c55e', transform: `scale(${dotPulse})`, boxShadow: '0 0 6px #22c55e', marginLeft: 4 }} />
      </div>
    </div>
  );
};

interface Scene5SolutionFullProps extends SceneSolutionProps {
  brandName: string
}

export const Scene5Solution: React.FC<Scene5SolutionFullProps> = ({
  headlineLines, sub, features,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames: dur } = useVideoConfig();

  const CUE_H1     = 0;
  const CUE_H2     = dur * 0.12;
  const CUE_H3     = dur * 0.24;
  const CUE_H4     = dur * 0.36;
  const CUE_SUB    = dur * 0.44;
  const CUE_HEADER = dur * 0.50;
  const CUE_CARD1  = dur * 0.54;
  const CUE_CARD2  = dur * 0.64;
  const CUE_CARD3  = dur * 0.74;
  const EXIT_GLOW  = dur * 0.90;

  const bgOp = interpolate(frame, [0, fps], [0, 1], { extrapolateRight: 'clamp' });

  const lineCues = [CUE_H1, CUE_H2, CUE_H3, CUE_H4];
  const subOp        = interpolate(frame - CUE_SUB, [0, 18], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const dashHeaderOp = interpolate(frame - CUE_HEADER, [0, 15], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  const cardCues = [CUE_CARD1, CUE_CARD2, CUE_CARD3];

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.bg, overflow: 'hidden' }}>
      <Img src={staticFile('images/bg-solution.png')} style={{ width: WIDTH, height: HEIGHT, objectFit: 'cover', opacity: bgOp * 0.35 }} />
      <AbsoluteFill style={{ background: 'rgba(5,13,26,0.82)' }} />
      <AbsoluteFill style={{ background: 'radial-gradient(ellipse at 75% 30%, rgba(59,130,246,0.13) 0%, transparent 55%)' }} />

      <AbsoluteFill style={{ display: 'flex', padding: '50px 100px', gap: 70, alignItems: 'center', overflow: 'hidden' }}>
        {/* Left: staggered headline lines */}
        <div style={{ width: 520, display: 'flex', flexDirection: 'column', gap: 14, overflow: 'hidden', flexShrink: 0 }}>
          {headlineLines.map((text, idx) => {
            const cue    = lineCues[idx];
            const isLast = idx === headlineLines.length - 1;
            const op = interpolate(frame - cue, [0, 15], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
            const y  = interpolate(spring({ frame: frame - cue, fps, config: { damping: 200 } }), [0, 1], [25, 0]);
            return (
              <div key={idx} style={{ opacity: op, transform: `translateY(${y}px)`, overflow: 'hidden' }}>
                <div style={{ fontSize: 58, fontWeight: '800', color: isLast ? COLORS.accent : COLORS.white, fontFamily: FONT, lineHeight: 1.15, letterSpacing: '-1.5px' }}>
                  {text}
                </div>
              </div>
            );
          })}
          <div style={{ opacity: subOp, marginTop: 8, overflow: 'hidden' }}>
            <div style={{ fontSize: 24, color: COLORS.gray, fontFamily: FONT, lineHeight: 1.6, maxWidth: 480 }}>
              {sub}
            </div>
          </div>
        </div>

        {/* Right: feature cards */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 14, overflow: 'hidden' }}>
          <div style={{ opacity: dashHeaderOp, display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 6px #22c55e' }} />
            <div style={{ fontSize: 16, color: COLORS.gray, fontFamily: FONT, fontWeight: '600', textTransform: 'uppercase', letterSpacing: '2px' }}>Live Dashboard</div>
          </div>
          {features.slice(0, 3).map((f, i) => (
            <AgentCard key={i} icon={f.icon} title={f.title} detail={f.detail} status={f.status} cue={cardCues[i]} exitGlowStart={EXIT_GLOW} />
          ))}
        </div>
      </AbsoluteFill>

      <Audio src={staticFile('audio/voiceover/scene5.mp3')} />
    </AbsoluteFill>
  );
};
