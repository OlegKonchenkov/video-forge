// agentforge-video/src/scenes/Scene6Stats.tsx
import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate, spring, AbsoluteFill, staticFile } from 'remotion';
import { Audio } from '@remotion/media';
import { COLORS } from '../constants';
import { FONT } from '../font';
import { ArrowUpIcon, ClockIcon, BrainIcon } from '../icons';
import type { SceneStatsProps } from '../types';

const CARD_ICONS = [
  (frame: number, fps: number) => <ClockIcon size={44} color={COLORS.accent} frame={frame} fps={fps} />,
  (frame: number, fps: number) => <BrainIcon size={44} color={COLORS.accent} frame={frame} fps={fps} />,
  (frame: number, _fps: number, progress: number) => <ArrowUpIcon size={44} color={COLORS.accent} progress={progress} />,
];

const StatCard: React.FC<{
  value: string; label: string; sub: string;
  icon: React.ReactNode; cue: number; glowStart: number;
}> = ({ value, label, sub, icon, cue, glowStart }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames: dur } = useVideoConfig();

  const scale     = spring({ frame: frame - cue, fps, config: { damping: 14, stiffness: 140 } });
  const opacity   = interpolate(frame - cue, [0, 12], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const lineW     = interpolate(frame - cue - 15, [0, dur * 0.35], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const glowPulse = interpolate(frame - glowStart, [0, 15, 30], [0, 0.5, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  return (
    <div style={{
      opacity, transform: `scale(${scale})`,
      background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.18)',
      borderRadius: 20, padding: '44px 52px', flex: 1,
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, overflow: 'hidden',
      boxShadow: `0 0 ${glowPulse * 60}px rgba(59,130,246,${glowPulse})`,
    }}>
      <div style={{ marginBottom: 4 }}>{icon}</div>
      <div style={{ fontSize: 100, fontWeight: '800', color: COLORS.accent, fontFamily: FONT, lineHeight: 1, letterSpacing: '-3px' }}>{value}</div>
      <div style={{ width: `${lineW * 60}px`, height: 2, background: COLORS.accent, borderRadius: 2, opacity: 0.5 }} />
      <div style={{ fontSize: 30, fontWeight: '700', color: COLORS.white, fontFamily: FONT, textAlign: 'center', lineHeight: 1.2 }}>{label}</div>
      <div style={{ fontSize: 22, color: COLORS.gray, fontFamily: FONT, textAlign: 'center' }}>{sub}</div>
    </div>
  );
};

export const Scene6Stats: React.FC<SceneStatsProps> = ({ title, sub, stats }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames: dur } = useVideoConfig();

  const CUE_TITLE  = 0;
  const CUE_SUB    = dur * 0.08;
  const CUE_CARD1  = dur * 0.15;
  const CUE_CARD2  = dur * 0.32;
  const CUE_CARD3  = dur * 0.49;
  const GLOW_START = dur * 0.85;

  const titleOp  = interpolate(frame - CUE_TITLE, [0, 18], [0, 1], { extrapolateRight: 'clamp' });
  const titleY   = interpolate(spring({ frame, fps, config: { damping: 200 } }), [0, 1], [35, 0]);
  const subOp    = interpolate(frame - CUE_SUB, [0, 15], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const progress1 = interpolate(frame - CUE_CARD1, [0, 1], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  const cardCues = [CUE_CARD1, CUE_CARD2, CUE_CARD3];
  const icons = [
    CARD_ICONS[0](frame, fps, 0),
    CARD_ICONS[1](frame, fps, 0),
    CARD_ICONS[2](frame, fps, progress1),
  ];

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.bg, overflow: 'hidden' }}>
      <AbsoluteFill style={{ background: 'radial-gradient(ellipse at 50% 15%, rgba(59,130,246,0.18) 0%, transparent 55%)' }} />

      <AbsoluteFill style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 120px', gap: 48, overflow: 'hidden' }}>
        <div style={{ textAlign: 'center', overflow: 'hidden' }}>
          <div style={{ opacity: titleOp, transform: `translateY(${titleY}px)` }}>
            <div style={{ fontSize: 58, fontWeight: '800', color: COLORS.white, fontFamily: FONT, letterSpacing: '-1.5px', lineHeight: 1.1 }}>
              {title}
            </div>
          </div>
          <div style={{ opacity: subOp, marginTop: 10 }}>
            <div style={{ fontSize: 26, color: COLORS.gray, fontFamily: FONT, fontWeight: '400' }}>{sub}</div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 32, width: '100%', overflow: 'hidden' }}>
          {stats.slice(0, 3).map((s, i) => (
            <StatCard key={i} value={s.value} label={s.label} sub={s.sub} icon={icons[i]} cue={cardCues[i]} glowStart={GLOW_START} />
          ))}
        </div>
      </AbsoluteFill>

      <Audio src={staticFile('audio/voiceover/scene6.mp3')} />
    </AbsoluteFill>
  );
};
