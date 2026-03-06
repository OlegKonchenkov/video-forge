// agentforge-video/src/scenes/ScenePainHook.tsx
// GLITCH TERMINAL — scanlines + hexagons + slide-in terminal entries
import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate, spring, AbsoluteFill, staticFile } from 'remotion';
import { Audio } from '@remotion/media';
import { FONT, MONO_FONT } from '../font';
import { NoiseOverlay } from '../shared/NoiseOverlay';
import { SceneCounter } from '../shared/SceneCounter';
import { accentVariants } from '../shared/colorUtils';
import { useSceneLayout } from '../shared/useSceneLayout';
import { KineticText } from '../shared/KineticText';
import { ScanlineEffect } from '../shared/ScanlineEffect';
import { GeometricShapes } from '../shared/GeometricShapes';
import type { ScenePainHookProps, SharedSceneProps } from '../types';

export const ScenePainHook: React.FC<ScenePainHookProps & SharedSceneProps> = ({
  headline, sub, painPoints,
  accentColor, bgColor, showImage, audioPath, sceneIndex, sceneTotal,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames: dur } = useVideoConfig();
  const av = accentVariants(accentColor);
  const layout = useSceneLayout();

  const CUE_BADGE = dur * 0.04;
  const CUE_HEAD  = dur * 0.10;
  const CUE_SUB   = dur * 0.33;
  const CUE_C1    = dur * 0.43;
  const CUE_C2    = dur * 0.56;
  const CUE_C3    = dur * 0.69;

  const exitOp = interpolate(frame, [dur * 0.88, dur * 0.88 + 12], [1, 0.3], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  const badgeOp  = interpolate(frame - CUE_BADGE, [0, 14], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const subOp    = interpolate(frame - CUE_SUB, [0, 18], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const subY     = interpolate(spring({ frame: frame - CUE_SUB, fps, config: { damping: 200 } }), [0, 1], [22, 0]);

  const cardCues     = [CUE_C1, CUE_C2, CUE_C3];
  const termPrefixes = ['01 ▶', '02 ▶', '03 ▶'];

  return (
    <AbsoluteFill style={{ backgroundColor: bgColor, overflow: 'hidden' }}>
      {showImage && (
        <>
          <AbsoluteFill style={{ backgroundImage: `url(${staticFile(`images/scene_${sceneIndex}.png`)})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
          <AbsoluteFill style={{ backgroundColor: 'rgba(0,0,0,0.80)' }} />
        </>
      )}
      {/* Diagonal tint */}
      <AbsoluteFill style={{ background: `linear-gradient(135deg, ${av.bg} 0%, transparent 58%)` }} />
      {/* Hexagonal decor — very subtle */}
      <GeometricShapes color={accentColor} opacity={0.05} count={6} style="hexagons" />
      {/* CRT effect */}
      <ScanlineEffect opacity={0.05} spacing={5} />
      <NoiseOverlay />

      <AbsoluteFill style={{
        display: 'flex',
        flexDirection: layout.direction,
        alignItems: layout.isPortrait ? 'flex-start' : 'center',
        justifyContent: 'center',
        padding: `${layout.isPortrait ? layout.outerPadding * 0.85 : 0}px ${layout.outerPadding}px`,
        gap: layout.isPortrait ? layout.innerGap : 0,
        overflow: 'hidden',
        opacity: exitOp,
      }}>
        {/* ── Left / Top: headline block ── */}
        <div style={{ width: layout.isPortrait ? '100%' : '50%', display: 'flex', flexDirection: 'column', gap: 22 }}>
          {/* Terminal badge */}
          <div style={{
            opacity: badgeOp,
            display: 'inline-flex', alignItems: 'center', gap: 10,
            background: av.bg, border: `1px solid ${av.border}`,
            borderRadius: 6, padding: '7px 18px', width: 'fit-content',
          }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: accentColor, boxShadow: `0 0 6px ${accentColor}` }} />
            <span style={{ fontSize: layout.labelSize, color: accentColor, fontFamily: MONO_FONT, fontWeight: '700', letterSpacing: '2.5px', textTransform: 'uppercase' as const }}>
              SYSTEM ALERT
            </span>
          </div>

          {/* Kinetic headline — blur-in */}
          <div style={{ overflow: 'hidden' }}>
            <KineticText
              text={headline}
              startFrame={CUE_HEAD}
              fps={fps}
              type="blur-in"
              staggerFrames={2}
              style={{
                fontSize: layout.isPortrait ? layout.headingSize - 4 : layout.displaySize - 8,
                fontWeight: '800' as const,
                color: '#f1f5f9',
                fontFamily: FONT,
                lineHeight: 1.08,
                letterSpacing: '-2px',
                textShadow: '0 2px 24px rgba(0,0,0,0.9)',
              }}
            />
          </div>

          {/* Sub */}
          <div style={{ opacity: subOp, transform: `translateY(${subY}px)` }}>
            <div style={{ fontSize: layout.bodySize, color: 'rgba(148,163,184,0.85)', fontFamily: MONO_FONT, lineHeight: 1.55, maxWidth: 520, textShadow: '0 1px 10px rgba(0,0,0,0.8)' }}>
              {sub}
            </div>
          </div>
        </div>

        {/* ── Right / Bottom: terminal pain cards ── */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: layout.cardGap, paddingLeft: layout.isPortrait ? 0 : 56 }}>
          {painPoints.slice(0, layout.maxListItems).map((point, i) => {
            const cue = cardCues[i];
            const p   = spring({ frame: frame - cue, fps, config: { damping: 180, stiffness: 120 } });
            const x   = interpolate(p, [0, 1], [-60, 0]);
            const op  = interpolate(frame - cue, [0, 12], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
            return (
              <div key={i} style={{
                opacity: op, transform: `translateX(${x}px)`,
                background: 'rgba(0,0,0,0.45)',
                border: `1px solid ${av.border}`,
                borderLeft: `3px solid ${accentColor}`,
                borderRadius: 8,
                padding: '20px 24px',
                display: 'flex', alignItems: 'center', gap: 16,
                boxShadow: `0 0 20px ${av.glow}`,
              }}>
                <span style={{ fontSize: layout.labelSize, color: accentColor, fontFamily: MONO_FONT, fontWeight: '700', flexShrink: 0, letterSpacing: '1px' }}>
                  {termPrefixes[i]}
                </span>
                <span style={{ fontSize: layout.bodySize - 1, color: '#e2e8f0', fontFamily: FONT, fontWeight: '600', lineHeight: 1.35, textShadow: '0 1px 10px rgba(0,0,0,0.8)' }}>
                  {point}
                </span>
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
