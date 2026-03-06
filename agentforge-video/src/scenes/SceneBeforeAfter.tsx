// agentforge-video/src/scenes/SceneBeforeAfter.tsx
// Visual: SPLIT REVEAL — glowing divider, before/after columns with distinct color identity
import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate, spring, AbsoluteFill, staticFile } from 'remotion';
import { Audio } from '@remotion/media';
import { FONT, MONO_FONT } from '../font';
import { NoiseOverlay } from '../shared/NoiseOverlay';
import { SceneCounter } from '../shared/SceneCounter';
import { ParticleField } from '../shared/ParticleField';
import { accentVariants } from '../shared/colorUtils';
import { useSceneLayout } from '../shared/useSceneLayout';
import type { SceneBeforeAfterProps, SharedSceneProps } from '../types';

const PointList: React.FC<{
  points: string[];
  isAfter: boolean;
  accentColor: string;
  cue: number;
  frame: number;
  fps: number;
  bodySize: number;
}> = ({ points, isAfter, accentColor, cue, frame, fps, bodySize }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
    {points.map((pt, i) => {
      const ptCue = cue + i * 16;
      const p   = spring({ frame: frame - ptCue, fps, config: { damping: 200 } });
      const x   = interpolate(p, [0, 1], [isAfter ? 40 : -40, 0]);
      const op  = interpolate(frame - ptCue, [0, 12], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
      return (
        <div key={i} style={{
          opacity: op, transform: `translateX(${x}px)`,
          display: 'flex', alignItems: 'flex-start', gap: 14,
        }}>
          <div style={{
            width: 32, height: 32, borderRadius: '50%', flexShrink: 0, marginTop: 2,
            background: isAfter ? accentColor : 'rgba(239,68,68,0.15)',
            border: `1px solid ${isAfter ? accentColor : 'rgba(239,68,68,0.4)'}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: isAfter ? `0 0 16px ${accentColor}55` : '0 0 8px rgba(239,68,68,0.2)',
          }}>
            <span style={{ fontSize: 16, color: isAfter ? '#ffffff' : '#ef4444' }}>
              {isAfter ? '✓' : '✗'}
            </span>
          </div>
          <span style={{
            fontSize: bodySize - 2,
            color: isAfter ? '#f1f5f9' : 'rgba(148,163,184,0.55)',
            fontFamily: FONT, fontWeight: isAfter ? '600' : '400',
            textDecoration: isAfter ? 'none' : 'line-through',
            textDecorationColor: 'rgba(239,68,68,0.4)',
            lineHeight: 1.45,
            textShadow: isAfter ? '0 1px 10px rgba(0,0,0,0.6)' : 'none',
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
  accentColor, bgColor, showImage, audioPath, sceneIndex, sceneTotal,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames: dur } = useVideoConfig();
  const av = accentVariants(accentColor);
  const layout = useSceneLayout();

  const CUE_BEFORE  = dur * 0.08;
  const CUE_AFTER   = dur * 0.45;
  const CUE_DIVIDER = dur * 0.04;

  const labelBeforeOp = interpolate(frame - CUE_BEFORE, [0, 15], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const labelAfterOp  = interpolate(frame - CUE_AFTER, [0, 15], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  // Glowing divider draws in
  const divProg = spring({ frame: frame - CUE_DIVIDER, fps, config: { damping: 180 } });
  const dividerSize = layout.isPortrait
    ? interpolate(divProg, [0, 1], [0, layout.width * 0.55])
    : interpolate(divProg, [0, 1], [0, 340]);
  const dividerOp = interpolate(frame - CUE_DIVIDER, [0, 20], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  // Pulsing glow on divider
  const divPulse = 0.7 + Math.sin(frame * 0.09) * 0.3;

  const exitOp = interpolate(frame, [dur * 0.88, dur * 0.88 + 10], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{ backgroundColor: bgColor, overflow: 'hidden' }}>
      {showImage && (
        <>
          <AbsoluteFill style={{ backgroundImage: `url(${staticFile(`images/scene_${sceneIndex}.png`)})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
          <AbsoluteFill style={{ backgroundColor: 'rgba(0,0,0,0.82)' }} />
        </>
      )}

      {/* Distinct color wash per column */}
      <AbsoluteFill style={{
        background: `linear-gradient(to ${layout.isPortrait ? 'bottom' : 'right'}, rgba(239,68,68,0.08) 0%, transparent 50%, ${av.bg} 50%, transparent 100%)`,
      }} />

      {/* Floating particles — accent color */}
      <ParticleField count={28} color={accentColor} opacity={0.18} speed={0.7} />

      <NoiseOverlay />

      <AbsoluteFill style={{
        display: 'flex',
        flexDirection: layout.direction,
        alignItems: 'center',
        justifyContent: 'center',
        padding: `${layout.isPortrait ? layout.outerPadding : 0}px ${layout.outerPadding}px`,
        gap: 0,
        opacity: exitOp,
      }}>
        {/* ─── BEFORE column ─── */}
        <div style={{ flex: 1, padding: layout.isPortrait ? `0 0 ${layout.innerGap * 0.4}px 0` : '0 52px 0 0' }}>
          <div style={{ opacity: labelBeforeOp, marginBottom: 24 }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 10,
              background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)',
              borderRadius: 6, padding: '6px 16px',
            }}>
              <span style={{ fontSize: 18, color: 'rgba(239,68,68,0.7)' }}>✗</span>
              <span style={{
                fontSize: layout.labelSize, color: 'rgba(239,68,68,0.8)',
                fontFamily: MONO_FONT, letterSpacing: '3px', textTransform: 'uppercase' as const,
              }}>
                {beforeLabel}
              </span>
            </div>
          </div>
          <PointList
            points={beforePoints.slice(0, layout.maxListItems)}
            isAfter={false}
            accentColor={accentColor}
            cue={CUE_BEFORE + 12}
            frame={frame}
            fps={fps}
            bodySize={layout.bodySize}
          />
        </div>

        {/* ─── Glowing divider ─── */}
        <div style={{ opacity: dividerOp * divPulse, flexShrink: 0 }}>
          <div style={layout.isPortrait
            ? {
                width: dividerSize,
                height: 2,
                background: `linear-gradient(to right, transparent, ${accentColor}, transparent)`,
                boxShadow: `0 0 20px ${av.glow}, 0 0 8px ${av.glow}`,
              }
            : {
                width: 2,
                height: dividerSize,
                background: `linear-gradient(to bottom, transparent, ${accentColor}, transparent)`,
                boxShadow: `0 0 20px ${av.glow}, 0 0 8px ${av.glow}`,
              }
          } />
        </div>

        {/* ─── AFTER column ─── */}
        <div style={{ flex: 1, padding: layout.isPortrait ? `${layout.innerGap * 0.4}px 0 0 0` : '0 0 0 52px' }}>
          <div style={{ opacity: labelAfterOp, marginBottom: 24 }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 10,
              background: av.bg, border: `1px solid ${av.border}`,
              borderRadius: 6, padding: '6px 16px',
              boxShadow: `0 0 20px ${av.glow}`,
            }}>
              <span style={{ fontSize: 18, color: accentColor }}>✓</span>
              <span style={{
                fontSize: layout.labelSize, color: accentColor,
                fontFamily: MONO_FONT, letterSpacing: '3px', textTransform: 'uppercase' as const,
              }}>
                {afterLabel}
              </span>
            </div>
          </div>
          <PointList
            points={afterPoints.slice(0, layout.maxListItems)}
            isAfter={true}
            accentColor={accentColor}
            cue={CUE_AFTER + 12}
            frame={frame}
            fps={fps}
            bodySize={layout.bodySize}
          />
        </div>
      </AbsoluteFill>

      <SceneCounter current={sceneIndex + 1} total={sceneTotal} />
      {audioPath && <Audio src={staticFile(audioPath)} />}
    </AbsoluteFill>
  );
};
