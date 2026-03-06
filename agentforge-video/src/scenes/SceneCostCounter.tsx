// agentforge-video/src/scenes/SceneCostCounter.tsx
import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate, spring, AbsoluteFill, staticFile } from 'remotion';
import { Audio } from '@remotion/media';
import { FONT, DISPLAY_FONT } from '../font';
import { NoiseOverlay } from '../shared/NoiseOverlay';
import { SceneCounter } from '../shared/SceneCounter';
import { accentVariants } from '../shared/colorUtils';
import { useSceneLayout } from '../shared/useSceneLayout';
import type { SceneCostCounterProps, SharedSceneProps } from '../types';

const Stat: React.FC<{
  value: number; unit: string; label: string;
  cue: number; frame: number; fps: number; accentColor: string; displaySize: number; bodySize: number;
}> = ({ value, unit, label, cue, frame, fps, accentColor, displaySize, bodySize }) => {
  const av = accentVariants(accentColor);
  const p  = spring({ frame: frame - cue, fps, config: { damping: 200 } });
  const y  = interpolate(p, [0, 1], [50, 0]);
  const op = interpolate(frame - cue, [0, 18], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const countProgress = interpolate(frame - cue - 10, [0, 45], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const displayValue  = Math.round(value * countProgress);
  const glowSize  = interpolate(p, [0, 1], [0, 80]);
  const formatted = displayValue >= 1000
    ? displayValue.toLocaleString()
    : String(displayValue);

  return (
    <div style={{ opacity: op, transform: `translateY(${y}px)`, position: 'relative' as const, textAlign: 'center' as const }}>
      {/* Radial glow behind number */}
      <div style={{
        position: 'absolute' as const, top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        width: glowSize * 2, height: glowSize * 2,
        borderRadius: '50%',
        background: `radial-gradient(circle, ${av.glow} 0%, transparent 70%)`,
        pointerEvents: 'none',
      }} />
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, justifyContent: 'center' }}>
        <span style={{ fontSize: Math.round(displaySize * 1.5), color: accentColor, fontFamily: DISPLAY_FONT, lineHeight: 1, letterSpacing: '-2px' }}>
          {unit.startsWith('€') || unit.startsWith('$') ? unit : ''}{formatted}{unit.startsWith('€') || unit.startsWith('$') ? '' : unit}
        </span>
      </div>
      <div style={{ fontSize: bodySize, color: 'rgba(148,163,184,0.8)', fontFamily: FONT, fontWeight: '500', marginTop: -8, letterSpacing: '0.5px' }}>
        {label}
      </div>
      <div style={{ width: '80%', height: 1, background: `linear-gradient(90deg, transparent, ${av.border}, transparent)`, margin: '14px auto 0' }} />
    </div>
  );
};

export const SceneCostCounter: React.FC<SceneCostCounterProps & SharedSceneProps> = ({
  intro, stat1, stat2,
  accentColor, bgColor, showImage, audioPath, sceneIndex, sceneTotal,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames: dur } = useVideoConfig();
  const layout = useSceneLayout();

  const CUE_INTRO = 0;
  const CUE_STAT1 = dur * 0.22;
  const CUE_STAT2 = dur * 0.54;

  const introOp = interpolate(frame, [CUE_INTRO, CUE_INTRO + 20], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const introY  = interpolate(spring({ frame, fps, config: { damping: 200 } }), [0, 1], [24, 0]);

  return (
    <AbsoluteFill style={{ backgroundColor: bgColor, overflow: 'hidden' }}>
      {showImage && (
        <>
          {/* Scene background image */}
          <AbsoluteFill style={{ backgroundImage: `url(${staticFile(`images/scene_${sceneIndex}.png`)})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
          {/* Dark overlay */}
          <AbsoluteFill style={{ backgroundColor: 'rgba(0,0,0,0.50)' }} />
        </>
      )}
      <AbsoluteFill style={{ background: `radial-gradient(ellipse at 50% 40%, rgba(5,13,26,0) 20%, ${bgColor} 65%)` }} />
      <NoiseOverlay />

      <AbsoluteFill style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        gap: layout.innerGap,
        padding: `0 ${layout.outerPadding}px`,
      }}>
        {/* Intro text */}
        <div style={{ opacity: introOp, transform: `translateY(${introY}px)`, textAlign: 'center' as const }}>
          <div style={{ fontSize: layout.bodySize + 4, color: 'rgba(148,163,184,0.75)', fontFamily: FONT, fontWeight: '400', maxWidth: 800, lineHeight: 1.5 }}>
            {intro}
          </div>
        </div>

        {/* Stats — row in landscape, column in portrait */}
        <div style={{ display: 'flex', flexDirection: layout.direction, gap: layout.isPortrait ? layout.innerGap : 100, alignItems: 'center' }}>
          <Stat {...stat1} cue={CUE_STAT1} frame={frame} fps={fps} accentColor={accentColor} displaySize={layout.displaySize} bodySize={layout.bodySize} />
          <div style={layout.isPortrait
            ? { width: 140, height: 1, background: `linear-gradient(to right, transparent, rgba(148,163,184,0.2), transparent)` }
            : { width: 1, height: 140, background: `linear-gradient(to bottom, transparent, rgba(148,163,184,0.2), transparent)` }
          } />
          <Stat {...stat2} cue={CUE_STAT2} frame={frame} fps={fps} accentColor={accentColor} displaySize={layout.displaySize} bodySize={layout.bodySize} />
        </div>
      </AbsoluteFill>

      <SceneCounter current={sceneIndex + 1} total={sceneTotal} />
      {audioPath && <Audio src={staticFile(audioPath)} />}
    </AbsoluteFill>
  );
};
