// agentforge-video/src/scenes/SceneFeatureList.tsx
// FEATURE GRID — gradient mesh + headline stagger + glowing feature cards
import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate, spring, AbsoluteFill, staticFile } from 'remotion';
import { Audio } from '@remotion/media';
import { FONT, MONO_FONT } from '../font';
import { NoiseOverlay } from '../shared/NoiseOverlay';
import { SceneCounter } from '../shared/SceneCounter';
import { WordByWord } from '../shared/WordByWord';
import { useSceneLayout } from '../shared/useSceneLayout';
import { useVisualVariant } from '../shared/useVisualVariant';
import { VariantBackground } from '../shared/VariantBackground';
import { resolveEmoji } from '../shared/emojiMap';
import { ScanBeam } from '../shared/SvgDecorations';
import { SceneBackground } from '../shared/SceneBackground';
import type { SceneFeatureListProps, SharedSceneProps } from '../types';

export const SceneFeatureList: React.FC<SceneFeatureListProps & SharedSceneProps> = ({
  headlineLines, sub, features,
  accentColor, bgColor, showImage, audioPath, sceneIndex, sceneTotal, variantId,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames: dur } = useVideoConfig();
  const variant = useVisualVariant(variantId, accentColor);
  const av = variant.av;
  const layout = useSceneLayout();

  const lineCues   = [dur * 0.04, dur * 0.14, dur * 0.24, dur * 0.34];
  const CUE_SUB    = dur * 0.42;
  const CUE_HEADER = dur * 0.48;
  const cardCues   = [dur * 0.52, dur * 0.62, dur * 0.72];

  const subOp  = interpolate(frame - CUE_SUB, [0, 18], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const headOp = interpolate(frame - CUE_HEADER, [0, 15], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const exitOp = interpolate(frame, [dur * 0.88, dur * 0.88 + 12], [1, 0.3], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  // Pulsing status dot
  const dotPulse = 0.7 + Math.sin(frame * 0.15) * 0.3;

  const displayFeatures = features.slice(0, layout.isPortrait ? 3 : layout.maxListItems);

  return (
    <AbsoluteFill style={{ backgroundColor: bgColor, overflow: 'hidden' }}>
      <SceneBackground showImage={showImage} sceneIndex={sceneIndex} overlayOpacity={0.78} />

      {/* Variant background */}
      <VariantBackground variant={variant} accentColor={accentColor} />
      <ScanBeam color={accentColor} opacity={0.05} speed={0.005} thickness={1} />
      <NoiseOverlay />

      <AbsoluteFill style={{
        display: 'flex',
        flexDirection: 'column' as const,
        alignItems: 'flex-start',
        justifyContent: 'center',
        padding: `${layout.isPortrait ? layout.outerPadding * 0.7 : layout.outerPadding * 0.5}px ${layout.outerPadding}px`,
        gap: layout.innerGap * 0.65,
        overflow: 'hidden',
        opacity: exitOp,
      }}>
        {/* Top: headline stagger */}
        <div style={{ width: '100%', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 8, overflow: 'hidden' }}>
          {headlineLines.map((text, idx) => {
            const isLast = idx === headlineLines.length - 1;
            return (
              <WordByWord
                key={idx}
                text={text}
                frame={frame} fps={fps} startFrame={lineCues[idx]} staggerFrames={4}
                style={{ overflow: 'hidden' }}
                wordStyle={{
                  fontSize: layout.headingSize,
                  fontWeight: '800' as const,
                  color: isLast ? accentColor : '#ffffff',
                  fontFamily: FONT, lineHeight: 1.15, letterSpacing: '-1.5px',
                  textShadow: isLast ? `0 0 30px ${accentColor}, 0 2px 16px rgba(0,0,0,0.8)` : '0 2px 20px rgba(0,0,0,0.7)',
                }}
              />
            );
          })}

          <div style={{ opacity: subOp, marginTop: 12 }}>
            <div style={{ fontSize: layout.bodySize, color: 'rgba(148,163,184,0.85)', fontFamily: FONT, lineHeight: 1.65, maxWidth: 700, textShadow: '0 1px 8px rgba(0,0,0,0.8)' }}>
              {sub}
            </div>
          </div>
        </div>

        {/* Bottom: feature cards */}
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: layout.cardGap }}>
          {/* Live indicator */}
          <div style={{ opacity: headOp, display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e', transform: `scale(${dotPulse})`, boxShadow: '0 0 8px #22c55e' }} />
            <span style={{ fontSize: layout.labelSize, color: 'rgba(148,163,184,0.7)', fontFamily: MONO_FONT, fontWeight: '600', textTransform: 'uppercase' as const, letterSpacing: '2px' }}>
              Attivo ora
            </span>
          </div>

          {displayFeatures.map((f, i) => {
            const cue = cardCues[i];
            const p   = spring({ frame: frame - cue, fps, config: { damping: 200 } });
            const x   = interpolate(p, [0, 1], [50, 0]);
            const op  = interpolate(frame - cue, [0, 14], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
            return (
              <div key={i} style={{
                opacity: op, transform: `translateX(${x}px)`,
                background: av.bg, borderRadius: 14,
                border: `1px solid ${av.border}`,
                borderLeft: `3px solid ${accentColor}`,
                padding: '18px 22px',
                display: 'flex', alignItems: 'center', gap: 18,
                boxShadow: `0 4px 30px rgba(0,0,0,0.3), 0 4px 24px ${av.glow}`,
              }}>
                {/* Icon */}
                <div style={{ width: 44, height: 44, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, overflow: 'hidden', background: av.glow, borderRadius: 12 }}>
                  {resolveEmoji(f.icon)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: layout.bodySize, fontWeight: '700', color: '#f1f5f9', fontFamily: FONT, textShadow: '0 1px 10px rgba(0,0,0,0.7)' }}>{f.title}</div>
                  <div style={{ fontSize: layout.labelSize + 4, color: 'rgba(148,163,184,0.75)', fontFamily: FONT, marginTop: 3 }}>{f.detail}</div>
                </div>
                {/* Status badge */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0, background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.25)', borderRadius: 8, padding: '4px 10px' }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e', transform: `scale(${dotPulse})` }} />
                  <span style={{ fontSize: layout.labelSize + 2, color: '#22c55e', fontFamily: MONO_FONT, fontWeight: '600', whiteSpace: 'nowrap' as const }}>{f.status}</span>
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
