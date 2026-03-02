// agentforge-video/src/scenes/SceneBeforeAfter.tsx
import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate, spring, AbsoluteFill, staticFile } from 'remotion';
import { Audio } from '@remotion/media';
import { FONT, MONO_FONT } from '../font';
import { NoiseOverlay } from '../shared/NoiseOverlay';
import { SceneCounter } from '../shared/SceneCounter';
import { accentVariants } from '../shared/colorUtils';
import type { SceneBeforeAfterProps, SharedSceneProps } from '../types';

const PointList: React.FC<{
  points: string[];
  isAfter: boolean;
  accentColor: string;
  cue: number;
  frame: number;
  fps: number;
}> = ({ points, isAfter, accentColor, cue, frame, fps }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
    {points.map((pt, i) => {
      const ptCue = cue + i * 14;
      const p   = spring({ frame: frame - ptCue, fps, config: { damping: 200 } });
      const x   = interpolate(p, [0, 1], [isAfter ? 30 : -30, 0]);
      const op  = interpolate(frame - ptCue, [0, 12], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
      return (
        <div key={i} style={{
          opacity: op, transform: `translateX(${x}px)`,
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <div style={{
            width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
            background: isAfter ? accentColor : 'rgba(239,68,68,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{ fontSize: 16, color: isAfter ? '#ffffff' : '#ef4444' }}>
              {isAfter ? '✓' : '✗'}
            </span>
          </div>
          <span style={{
            fontSize: 20, color: isAfter ? '#f1f5f9' : 'rgba(148,163,184,0.7)',
            fontFamily: FONT, fontWeight: isAfter ? '600' : '400',
            textDecoration: isAfter ? 'none' : 'line-through',
          }}>
            {pt}
          </span>
        </div>
      );
    })}
  </div>
);

export const SceneBeforeAfter: React.FC<SceneBeforeAfterProps & SharedSceneProps> = ({
  beforeLabel, beforePoints, afterLabel, afterPoints,
  accentColor, audioPath, sceneIndex, sceneTotal,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames: dur } = useVideoConfig();
  const av = accentVariants(accentColor);

  const CUE_BEFORE = dur * 0.08;
  const CUE_AFTER  = dur * 0.45;
  const CUE_DIVIDER = dur * 0.06;

  const labelBeforeOp = interpolate(frame - CUE_BEFORE, [0, 15], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const labelAfterOp  = interpolate(frame - CUE_AFTER, [0, 15], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  // Divider draws down
  const dividerH = interpolate(
    spring({ frame: frame - CUE_DIVIDER, fps, config: { damping: 200 } }),
    [0, 1], [0, 320],
  );

  return (
    <AbsoluteFill style={{ backgroundColor: '#050d1a', overflow: 'hidden' }}>
      <AbsoluteFill style={{ background: `radial-gradient(ellipse at 75% 50%, ${av.bg} 0%, transparent 55%)` }} />
      <NoiseOverlay />

      <AbsoluteFill style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 80px', gap: 0 }}>
        {/* Before column */}
        <div style={{ flex: 1, padding: '0 48px 0 0' }}>
          <div style={{ opacity: labelBeforeOp }}>
            <div style={{ fontSize: 14, color: 'rgba(239,68,68,0.8)', fontFamily: MONO_FONT, letterSpacing: '3px', textTransform: 'uppercase' as const, marginBottom: 20 }}>
              {beforeLabel}
            </div>
          </div>
          <PointList points={[...beforePoints]} isAfter={false} accentColor={accentColor} cue={CUE_BEFORE + 10} frame={frame} fps={fps} />
        </div>

        {/* Center divider */}
        <div style={{ width: 1, height: dividerH, background: `linear-gradient(to bottom, transparent, ${av.border}, transparent)`, flexShrink: 0 }} />

        {/* After column */}
        <div style={{ flex: 1, padding: '0 0 0 48px' }}>
          <div style={{ opacity: labelAfterOp }}>
            <div style={{ fontSize: 14, color: accentColor, fontFamily: MONO_FONT, letterSpacing: '3px', textTransform: 'uppercase' as const, marginBottom: 20 }}>
              {afterLabel}
            </div>
          </div>
          <PointList points={[...afterPoints]} isAfter={true} accentColor={accentColor} cue={CUE_AFTER + 10} frame={frame} fps={fps} />
        </div>
      </AbsoluteFill>

      <SceneCounter current={sceneIndex + 1} total={sceneTotal} />
      <Audio src={staticFile(audioPath)} />
    </AbsoluteFill>
  );
};
