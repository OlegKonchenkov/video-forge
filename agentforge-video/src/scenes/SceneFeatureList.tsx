// agentforge-video/src/scenes/SceneFeatureList.tsx
import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate, spring, AbsoluteFill, staticFile } from 'remotion';
import { Audio } from '@remotion/media';
import { FONT, MONO_FONT } from '../font';
import { NoiseOverlay } from '../shared/NoiseOverlay';
import { SceneCounter } from '../shared/SceneCounter';
import { WordByWord } from '../shared/WordByWord';
import { accentVariants } from '../shared/colorUtils';
import { useSceneLayout } from '../shared/useSceneLayout';
import type { SceneFeatureListProps, SharedSceneProps } from '../types';

export const SceneFeatureList: React.FC<SceneFeatureListProps & SharedSceneProps> = ({
  headlineLines, sub, features,
  accentColor, audioPath, sceneIndex, sceneTotal,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames: dur } = useVideoConfig();
  const av = accentVariants(accentColor);
  const layout = useSceneLayout();

  const lineCues = [0, dur * 0.12, dur * 0.24, dur * 0.36];
  const CUE_SUB    = dur * 0.44;
  const CUE_HEADER = dur * 0.50;
  const cardCues   = [dur * 0.54, dur * 0.64, dur * 0.74];

  const bgOp = interpolate(frame, [0, 24], [0, 1], { extrapolateRight: 'clamp' });

  const subOp  = interpolate(frame - CUE_SUB, [0, 18], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const headOp = interpolate(frame - CUE_HEADER, [0, 15], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{ backgroundColor: '#050d1a', overflow: 'hidden' }}>
      {/* Scene background image */}
      <AbsoluteFill style={{ backgroundImage: `url(${staticFile(`images/scene_${sceneIndex}.png`)})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
      {/* Dark overlay */}
      <AbsoluteFill style={{ backgroundColor: 'rgba(5,13,26,0.75)' }} />
      <AbsoluteFill style={{ background: `radial-gradient(ellipse at 75% 30%, ${av.bg} 0%, transparent 55%)`, opacity: bgOp }} />
      <NoiseOverlay />

      <AbsoluteFill style={{
        display: 'flex',
        flexDirection: layout.direction,
        alignItems: layout.isPortrait ? 'flex-start' : 'center',
        padding: `${layout.isPortrait ? layout.outerPadding : 48}px ${layout.outerPadding}px`,
        gap: layout.isPortrait ? layout.innerGap : 60,
        overflow: 'hidden',
      }}>
        {/* Left / Top: headline lines */}
        <div style={{
          width: layout.isPortrait ? '100%' : 480,
          flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 8, overflow: 'hidden',
        }}>
          {headlineLines.map((text, idx) => {
            const isLast = idx === headlineLines.length - 1;
            return (
              <WordByWord
                key={idx}
                text={text}
                frame={frame} fps={fps} startFrame={lineCues[idx]} staggerFrames={4}
                style={{ overflow: 'hidden' }}
                wordStyle={{
                  fontSize: layout.headingSize, fontWeight: '800',
                  color: isLast ? accentColor : '#f1f5f9',
                  fontFamily: FONT, lineHeight: 1.15, letterSpacing: '-1.5px',
                }}
              />
            );
          })}
          <div style={{ opacity: subOp, marginTop: 12 }}>
            <div style={{ fontSize: layout.bodySize, color: 'rgba(148,163,184,0.85)', fontFamily: FONT, lineHeight: 1.65, maxWidth: 440 }}>
              {sub}
            </div>
          </div>
        </div>

        {/* Right / Bottom: feature cards */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: layout.cardGap }}>
          {/* Live indicator */}
          <div style={{ opacity: headOp, display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 8px #22c55e' }} />
            <span style={{ fontSize: layout.labelSize, color: 'rgba(148,163,184,0.7)', fontFamily: MONO_FONT, fontWeight: '600', textTransform: 'uppercase' as const, letterSpacing: '2px' }}>
              Live Dashboard
            </span>
          </div>

          {features.slice(0, 3).map((f, i) => {
            const cue = cardCues[i];
            const p   = spring({ frame: frame - cue, fps, config: { damping: 200 } });
            const x   = interpolate(p, [0, 1], [40, 0]);
            const op  = interpolate(frame - cue, [0, 14], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
            const dotPulse = interpolate(frame % 50, [0, 25, 50], [0.7, 1, 0.7]);
            return (
              <div key={i} style={{
                opacity: op, transform: `translateX(${x}px)`,
                background: av.bg, borderRadius: 14,
                border: `1px solid ${av.border}`, borderLeft: `3px solid ${av.strong}`,
                padding: '18px 22px',
                display: 'flex', alignItems: 'center', gap: 16,
              }}>
                <div style={{ fontSize: 30, flexShrink: 0, width: 40, textAlign: 'center' as const }}>{f.icon}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: layout.bodySize, fontWeight: '700', color: '#f1f5f9', fontFamily: FONT, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{f.title}</div>
                  <div style={{ fontSize: layout.labelSize + 4, color: 'rgba(148,163,184,0.75)', fontFamily: FONT, marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{f.detail}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                  <span style={{ fontSize: layout.labelSize + 3, color: '#22c55e', fontFamily: MONO_FONT, fontWeight: '600', whiteSpace: 'nowrap' }}>{f.status}</span>
                  <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#22c55e', transform: `scale(${dotPulse})`, boxShadow: '0 0 6px #22c55e' }} />
                </div>
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
