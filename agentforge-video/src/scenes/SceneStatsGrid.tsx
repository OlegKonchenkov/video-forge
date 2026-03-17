// agentforge-video/src/scenes/SceneStatsGrid.tsx
// DATA DASHBOARD — particle field + scramble numbers + glowing metric cards
import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate, spring, AbsoluteFill, staticFile } from 'remotion';
import { Audio } from '@remotion/media';
import { FONT, MONO_FONT } from '../font';
import { NoiseOverlay } from '../shared/NoiseOverlay';
import { SceneCounter } from '../shared/SceneCounter';
import { accentVariants } from '../shared/colorUtils';
import { useSceneLayout } from '../shared/useSceneLayout';
import { useVisualVariant } from '../shared/useVisualVariant';
import { VariantBackground } from '../shared/VariantBackground';
import { TechGrid } from '../shared/SvgDecorations';
import { SceneBackground } from '../shared/SceneBackground';
import type { SceneStatsGridProps, SharedSceneProps } from '../types';

const CHARS = '0123456789ABCDEF';

function scramble(target: string, frame: number, cue: number): string {
  const elapsed = frame - cue;
  if (elapsed < 0) return target.replace(/[0-9]/g, '0');
  if (elapsed >= 32) return target;
  return target.split('').map((ch) => {
    if (!/[0-9]/.test(ch)) return ch;
    // Deterministic scramble using frame as seed
    const progress = elapsed / 32;
    const settled = (frame * 7 + target.charCodeAt(0)) % (32 - elapsed) === 0 || progress > 0.85;
    return settled ? ch : CHARS[(frame * 13 + target.charCodeAt(0)) % CHARS.length];
  }).join('');
}

const StatCard: React.FC<{
  value: string; label: string; sub: string;
  cue: number; frame: number; fps: number;
  accentColor: string; displaySize: number; bodySize: number; labelSize: number;
  isPortrait: boolean;
}> = ({ value, label, sub, cue, frame, fps, accentColor, displaySize, bodySize, labelSize, isPortrait }) => {
  const av  = accentVariants(accentColor);
  const p   = spring({ frame: frame - cue, fps, config: { damping: 200 } });
  const y   = interpolate(p, [0, 1], [70, 0]);
  const op  = interpolate(frame - cue, [0, 18], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const display = scramble(value, frame, cue);

  return (
    <div style={{
      opacity: op, transform: `translateY(${y}px)`,
      flex: 1, borderRadius: 18,
      background: av.bg,
      border: `1px solid ${av.border}`,
      borderTop: `3px solid ${accentColor}`,
      padding: isPortrait ? '24px 20px' : '36px 32px',
      display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center',
      boxShadow: `0 4px 30px rgba(0,0,0,0.35), 0 0 30px ${av.glow}`,
    }}>
      <div style={{ fontSize: displaySize, color: accentColor, fontFamily: FONT, fontWeight: '900', lineHeight: 1, letterSpacing: '-2px', textShadow: `0 0 40px ${av.glow}, 0 2px 16px rgba(0,0,0,0.8)` }}>
        {display}
      </div>
      <div style={{ fontSize: bodySize - 4, color: '#f1f5f9', fontFamily: FONT, fontWeight: '700', textAlign: 'center' as const, textShadow: '0 2px 12px rgba(0,0,0,0.6)' }}>{label}</div>
      <div style={{ fontSize: labelSize + 2, color: 'rgba(148,163,184,0.75)', fontFamily: MONO_FONT, textAlign: 'center' as const }}>{sub}</div>
    </div>
  );
};

export const SceneStatsGrid: React.FC<SceneStatsGridProps & SharedSceneProps> = ({
  title, sub, stats,
  accentColor, bgColor, showImage, audioPath, sceneIndex, sceneTotal, variantId,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames: dur } = useVideoConfig();
  const variant = useVisualVariant(variantId, accentColor);
  const layout = useSceneLayout();

  const titleP  = spring({ frame, fps, config: { damping: 200 } });
  const titleOp = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: 'clamp' });
  const titleY  = interpolate(titleP, [0, 1], [24, 0]);
  const cardCues = [dur * 0.22, dur * 0.36, dur * 0.50];

  const exitOp = interpolate(frame, [dur * 0.88, dur * 0.88 + 12], [1, 0.3], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{ backgroundColor: bgColor, overflow: 'hidden' }}>
      <SceneBackground showImage={showImage} sceneIndex={sceneIndex} />

      {/* Variant background */}
      <VariantBackground variant={variant} accentColor={accentColor} />
      <TechGrid color={accentColor} cellSize={layout.isPortrait ? 48 : 60} opacity={0.04} />
      {/* Center glow */}
      <AbsoluteFill style={{ background: `radial-gradient(ellipse at 50% 30%, ${accentVariants(accentColor).glow} 0%, transparent 60%)` }} />
      <NoiseOverlay />

      <AbsoluteFill style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: `0 ${layout.outerPadding}px`,
        gap: layout.innerGap,
        opacity: exitOp,
      }}>
        {/* Title */}
        <div style={{ opacity: titleOp, transform: `translateY(${titleY}px)`, textAlign: 'center' as const }}>
          <div style={{ fontSize: layout.headingSize, fontWeight: '800', color: '#ffffff', fontFamily: FONT, letterSpacing: '-1.5px', textShadow: '0 2px 20px rgba(0,0,0,0.8)' }}>
            {title}
          </div>
          <div style={{ fontSize: layout.bodySize - 4, color: 'rgba(148,163,184,0.75)', fontFamily: FONT, marginTop: 8, textShadow: '0 1px 8px rgba(0,0,0,0.8)' }}>
            {sub}
          </div>
        </div>

        {/* Stat cards */}
        <div style={{ display: 'flex', flexDirection: layout.direction, gap: layout.cardGap, width: '100%' }}>
          {stats.slice(0, layout.maxListItems).map((s, i) => (
            <StatCard key={i} {...s} cue={cardCues[i]} frame={frame} fps={fps} accentColor={accentColor}
              displaySize={layout.displaySize} bodySize={layout.bodySize} labelSize={layout.labelSize}
              isPortrait={layout.isPortrait} />
          ))}
        </div>
      </AbsoluteFill>

      <SceneCounter current={sceneIndex + 1} total={sceneTotal} />
      {audioPath && <Audio src={staticFile(audioPath)} />}
    </AbsoluteFill>
  );
};
