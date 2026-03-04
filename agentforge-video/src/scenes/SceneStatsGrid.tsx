// agentforge-video/src/scenes/SceneStatsGrid.tsx
import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate, spring, AbsoluteFill, staticFile } from 'remotion';
import { Audio } from '@remotion/media';
import { FONT, DISPLAY_FONT, MONO_FONT } from '../font';
import { NoiseOverlay } from '../shared/NoiseOverlay';
import { SceneCounter } from '../shared/SceneCounter';
import { accentVariants } from '../shared/colorUtils';
import { useSceneLayout } from '../shared/useSceneLayout';
import type { SceneStatsGridProps, SharedSceneProps } from '../types';

const CHARS = '0123456789ABCDEFX#%';

function scramble(target: string, frame: number, cue: number): string {
  const elapsed = frame - cue;
  if (elapsed < 0) return target.replace(/./g, CHARS[0]);
  if (elapsed >= 30) return target;
  return target.split('').map((ch) => {
    if (/[^0-9]/.test(ch)) return ch;
    const settled = elapsed > 20 + Math.random() * 10;
    return settled ? ch : CHARS[Math.floor((frame * 7 + Math.random() * 5) % CHARS.length)];
  }).join('');
}

const StatCard: React.FC<{ value: string; label: string; sub: string; cue: number; frame: number; fps: number; accentColor: string; displaySize: number; bodySize: number; labelSize: number }> = ({
  value, label, sub, cue, frame, fps, accentColor, displaySize, bodySize, labelSize,
}) => {
  const av  = accentVariants(accentColor);
  const p   = spring({ frame: frame - cue, fps, config: { damping: 200 } });
  const y   = interpolate(p, [0, 1], [60, 0]);
  const op  = interpolate(frame - cue, [0, 18], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const display = scramble(value, frame, cue);

  return (
    <div style={{
      opacity: op, transform: `translateY(${y}px)`,
      flex: 1, background: av.bg, borderRadius: 20,
      border: `1px solid ${av.border}`, borderTop: `2px solid ${av.strong}`,
      padding: '36px 32px', display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center',
    }}>
      <div style={{ fontSize: displaySize, color: accentColor, fontFamily: DISPLAY_FONT, lineHeight: 1, letterSpacing: '1px' }}>
        {display}
      </div>
      <div style={{ fontSize: bodySize - 4, color: '#f1f5f9', fontFamily: FONT, fontWeight: '700', textAlign: 'center' as const }}>{label}</div>
      <div style={{ fontSize: labelSize + 2, color: 'rgba(148,163,184,0.6)', fontFamily: MONO_FONT, textAlign: 'center' as const }}>{sub}</div>
    </div>
  );
};

export const SceneStatsGrid: React.FC<SceneStatsGridProps & SharedSceneProps> = ({
  title, sub, stats,
  accentColor, audioPath, sceneIndex, sceneTotal,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames: dur } = useVideoConfig();
  const layout = useSceneLayout();

  const titleOp = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: 'clamp' });
  const titleY  = interpolate(spring({ frame, fps, config: { damping: 200 } }), [0, 1], [20, 0]);
  const cardCues = [dur * 0.22, dur * 0.36, dur * 0.50];

  return (
    <AbsoluteFill style={{ backgroundColor: '#050d1a', overflow: 'hidden' }}>
      {/* Scene background image */}
      <AbsoluteFill style={{ backgroundImage: `url(${staticFile(`images/scene_${sceneIndex}.png`)})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
      {/* Dark overlay */}
      <AbsoluteFill style={{ backgroundColor: 'rgba(5,13,26,0.75)' }} />
      <AbsoluteFill style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(10,22,40,0.8) 0%, #050d1a 60%)' }} />
      <NoiseOverlay />

      <AbsoluteFill style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: `0 ${layout.outerPadding}px`,
        gap: layout.innerGap,
      }}>
        {/* Title */}
        <div style={{ opacity: titleOp, transform: `translateY(${titleY}px)`, textAlign: 'center' as const }}>
          <div style={{ fontSize: layout.headingSize, fontWeight: '800', color: '#f1f5f9', fontFamily: FONT, letterSpacing: '-1.5px' }}>{title}</div>
          <div style={{ fontSize: layout.bodySize - 6, color: 'rgba(148,163,184,0.7)', fontFamily: FONT, marginTop: 8 }}>{sub}</div>
        </div>

        {/* Stat cards */}
        <div style={{ display: 'flex', flexDirection: layout.direction, gap: layout.cardGap, width: '100%' }}>
          {stats.slice(0, 3).map((s, i) => (
            <StatCard key={i} {...s} cue={cardCues[i]} frame={frame} fps={fps} accentColor={accentColor}
              displaySize={layout.displaySize} bodySize={layout.bodySize} labelSize={layout.labelSize} />
          ))}
        </div>
      </AbsoluteFill>

      <SceneCounter current={sceneIndex + 1} total={sceneTotal} />
      {audioPath && <Audio src={staticFile(audioPath)} />}
    </AbsoluteFill>
  );
};
