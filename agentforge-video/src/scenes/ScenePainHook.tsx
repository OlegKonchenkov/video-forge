// agentforge-video/src/scenes/ScenePainHook.tsx
import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate, spring, AbsoluteFill, staticFile } from 'remotion';
import { Audio } from '@remotion/media';
import { FONT, MONO_FONT } from '../font';
import { NoiseOverlay } from '../shared/NoiseOverlay';
import { SceneCounter } from '../shared/SceneCounter';
import { WordByWord } from '../shared/WordByWord';
import { accentVariants } from '../shared/colorUtils';
import { useSceneLayout } from '../shared/useSceneLayout';
import { GridDots } from '../shared/svg/GridDots';
import type { ScenePainHookProps, SharedSceneProps } from '../types';

export const ScenePainHook: React.FC<ScenePainHookProps & SharedSceneProps> = ({
  headline, sub, painPoints,
  accentColor, bgColor, showImage, audioPath, sceneIndex, sceneTotal,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames: dur } = useVideoConfig();
  const av = accentVariants(accentColor);
  const layout = useSceneLayout();

  const CUE_TAG  = 0;
  const CUE_HEAD = dur * 0.08;
  const CUE_SUB  = dur * 0.35;
  const CUE_C1   = dur * 0.45;
  const CUE_C2   = dur * 0.57;
  const CUE_C3   = dur * 0.69;

  const bgX    = interpolate(frame, [0, dur], [0, -24], { extrapolateRight: 'clamp' });
  const tagOp  = interpolate(frame, [CUE_TAG, CUE_TAG + 14], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const exitOp = interpolate(frame, [dur * 0.88, dur * 0.88 + 12], [1, 0.3], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  const cardCues = [CUE_C1, CUE_C2, CUE_C3];

  return (
    <AbsoluteFill style={{ backgroundColor: bgColor, overflow: 'hidden' }}>
      {showImage && (
        <>
          <AbsoluteFill style={{ backgroundImage: `url(${staticFile(`images/scene_${sceneIndex}.png`)})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
          <AbsoluteFill style={{ backgroundColor: 'rgba(0,0,0,0.75)' }} />
        </>
      )}
      {/* Animated dot grid — replaces CSS radial-gradient background */}
      <GridDots color={av.border} opacity={0.4} translateX={bgX} />
      {/* Diagonal accent gradient */}
      <AbsoluteFill style={{ background: `linear-gradient(130deg, ${av.bg} 0%, transparent 55%)` }} />
      <NoiseOverlay />

      <AbsoluteFill style={{
        display: 'flex',
        flexDirection: layout.direction,
        alignItems: layout.isPortrait ? 'flex-start' : 'center',
        justifyContent: 'center',
        padding: `${layout.isPortrait ? layout.outerPadding * 0.8 : 0}px ${layout.outerPadding}px`,
        gap: layout.isPortrait ? layout.innerGap : 0,
        overflow: 'hidden',
      }}>
        {/* ── Left / Top: text ── */}
        <div style={{
          width: layout.isPortrait ? '100%' : '54%',
          display: 'flex', flexDirection: 'column', gap: 26,
        }}>
          {/* Tag badge */}
          <div style={{
            opacity: tagOp, display: 'inline-flex', alignItems: 'center', gap: 10,
            background: av.bg, border: `1px solid ${av.border}`,
            borderRadius: 100, padding: '8px 22px', width: 'fit-content',
          }}>
            <div style={{ width: 7, height: 7, background: accentColor, borderRadius: '50%' }} />
            <span style={{ fontSize: layout.labelSize, color: accentColor, fontFamily: MONO_FONT, fontWeight: '600', letterSpacing: '2px', textTransform: 'uppercase' as const }}>
              Sound familiar?
            </span>
          </div>

          {/* Headline word-by-word */}
          <WordByWord
            text={headline}
            frame={frame} fps={fps} startFrame={CUE_HEAD} staggerFrames={3}
            style={{ flexWrap: 'wrap', gap: '0.18em', overflow: 'hidden' }}
            wordStyle={{
              fontSize: layout.isPortrait ? layout.headingSize - 2 : layout.displaySize,
              fontWeight: '700',
              color: '#f1f5f9',
              fontFamily: FONT,
              lineHeight: 1.05,
              letterSpacing: '-2.5px',
              textShadow: '0 2px 20px rgba(0,0,0,0.7)',
            }}
          />

          {/* Subtitle */}
          {(() => {
            const op = interpolate(frame - CUE_SUB, [0, 18], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
            const y  = interpolate(spring({ frame: frame - CUE_SUB, fps, config: { damping: 200 } }), [0, 1], [22, 0]);
            return (
              <div style={{ opacity: op, transform: `translateY(${y}px)` }}>
                <div style={{ fontSize: layout.bodySize, color: 'rgba(148,163,184,0.88)', fontFamily: FONT, fontWeight: '400', lineHeight: 1.6, maxWidth: 540 }}>
                  {sub}
                </div>
              </div>
            );
          })()}
        </div>

        {/* ── Right / Bottom: pain point cards ── */}
        <div style={{
          flex: 1,
          display: 'flex', flexDirection: 'column', gap: layout.cardGap,
          paddingLeft: layout.isPortrait ? 0 : 64,
          opacity: exitOp,
        }}>
          {painPoints.slice(0, layout.maxListItems).map((point, i) => {
            const cue = cardCues[i];
            const p   = spring({ frame: frame - cue, fps, config: { damping: 200 } });
            const y   = interpolate(p, [0, 1], [60, 0]);
            const op  = interpolate(frame - cue, [0, 14], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
            return (
              <div key={i} style={{
                opacity: op, transform: `translateY(${y}px)`,
                background: av.bg, borderRadius: 18,
                border: `1px solid ${av.border}`, borderLeft: `3px solid ${av.strong}`,
                padding: '22px 28px',
                display: 'flex', alignItems: 'center', gap: 18,
              }}>
                <div style={{
                  width: 48, height: 48, borderRadius: 14, flexShrink: 0,
                  background: av.glow, display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <div style={{ width: 18, height: 18, borderRadius: '50%', background: accentColor, opacity: 0.9 }} />
                </div>
                <span style={{ fontSize: layout.bodySize, color: '#e2e8f0', fontFamily: FONT, fontWeight: '600', lineHeight: 1.35 }}>
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
