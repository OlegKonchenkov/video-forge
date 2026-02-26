// agentforge-video/src/scenes/Scene3Cost.tsx
import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate, spring, AbsoluteFill, staticFile } from 'remotion';
import { Audio } from '@remotion/media';
import { COLORS } from '../constants';
import { FONT } from '../font';
import type { SceneCostProps } from '../types';

const BigStat: React.FC<{
  value: number; unit: string; label: string; cue: number; exitStart: number;
}> = ({ value, unit, label, cue, exitStart }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames: dur } = useVideoConfig();

  const countDuration = dur * 0.35;
  const progress  = interpolate(frame - cue, [0, countDuration], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
    easing: (t) => 1 - Math.pow(1 - t, 3),
  });
  const displayed = Math.round(progress * value);

  const scaleIn  = spring({ frame: frame - cue, fps, config: { damping: 200 } });
  const entryOp  = interpolate(frame - cue, [0, 12], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const exitOp   = interpolate(frame, [exitStart, exitStart + 18], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const exitScale = interpolate(frame, [exitStart, exitStart + 18], [1, 0], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
    easing: (t) => t * t,
  });

  return (
    <div style={{ opacity: entryOp * exitOp, transform: `scale(${scaleIn * exitScale})`, textAlign: 'center', overflow: 'hidden' }}>
      <div style={{ fontSize: 130, fontWeight: '800', color: COLORS.danger, fontFamily: FONT, lineHeight: 1, letterSpacing: '-4px' }}>
        {displayed.toLocaleString()}{unit}
      </div>
      <div style={{ fontSize: 28, color: COLORS.gray, fontFamily: FONT, fontWeight: '500', marginTop: 10, letterSpacing: '0.5px' }}>
        {label}
      </div>
    </div>
  );
};

export const Scene3Cost: React.FC<SceneCostProps> = ({ intro, stat1, stat2 }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames: dur } = useVideoConfig();

  const CUE_TITLE  = 0;
  const CUE_STAT1  = dur * 0.08;
  const CUE_STAT2  = dur * 0.28;
  const EXIT_STATS = dur * 0.68;
  const CUE_GONE   = dur * 0.78;

  const titleOp      = interpolate(frame - CUE_TITLE, [0, 18], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const titleY       = interpolate(spring({ frame, fps, config: { damping: 200 } }), [0, 1], [40, 0]);
  const titleExitOp  = interpolate(frame, [EXIT_STATS, EXIT_STATS + 15], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const dividerOp    = interpolate(frame - CUE_STAT1, [0, 20], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const dividerExitOp = interpolate(frame, [EXIT_STATS, EXIT_STATS + 18], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const goneScale    = spring({ frame: frame - CUE_GONE, fps, config: { damping: 8, stiffness: 160 } });
  const goneOp       = interpolate(frame - CUE_GONE, [0, 10], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.bg, overflow: 'hidden' }}>
      <AbsoluteFill style={{ background: 'radial-gradient(ellipse at 50% 55%, rgba(239,68,68,0.14) 0%, transparent 65%)' }} />

      <AbsoluteFill style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 140px', gap: 56, overflow: 'hidden' }}>
        {/* Intro text — from props */}
        <div style={{ opacity: Math.min(titleOp, titleExitOp), transform: `translateY(${titleY}px)`, textAlign: 'center' }}>
          <div style={{ fontSize: 36, color: COLORS.gray, fontFamily: FONT, fontWeight: '500', letterSpacing: '1px' }}>
            {intro}
          </div>
        </div>

        {/* Two counting stats — from props */}
        <div style={{ display: 'flex', gap: 100, alignItems: 'center', opacity: dividerOp * dividerExitOp }}>
          <BigStat value={stat1.value} unit={stat1.unit} label={stat1.label} cue={CUE_STAT1} exitStart={EXIT_STATS} />
          <div style={{ width: 1, height: 140, background: 'rgba(255,255,255,0.1)' }} />
          <BigStat value={stat2.value} unit={stat2.unit} label={stat2.label} cue={CUE_STAT2} exitStart={EXIT_STATS} />
        </div>

        {/* "Gone." — universal, always works */}
        <div style={{ opacity: goneOp, transform: `scale(${goneScale})`, fontSize: 128, fontWeight: '800', color: COLORS.white, fontFamily: FONT, letterSpacing: '-4px', position: 'absolute' as const }}>
          Gone.
        </div>
      </AbsoluteFill>

      <Audio src={staticFile('audio/voiceover/scene3.mp3')} />
    </AbsoluteFill>
  );
};
