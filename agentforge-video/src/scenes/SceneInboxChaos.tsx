// agentforge-video/src/scenes/SceneInboxChaos.tsx
import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate, spring, AbsoluteFill, staticFile } from 'remotion';
import { Audio } from '@remotion/media';
import { FONT, DISPLAY_FONT, MONO_FONT } from '../font';
import { NoiseOverlay } from '../shared/NoiseOverlay';
import { SceneCounter } from '../shared/SceneCounter';
import { accentVariants } from '../shared/colorUtils';
import { useSceneLayout } from '../shared/useSceneLayout';
import type { SceneInboxChaosProps, SharedSceneProps } from '../types';

export const SceneInboxChaos: React.FC<SceneInboxChaosProps & SharedSceneProps> = ({
  items, punchWords,
  accentColor, bgColor, showImage, audioPath, sceneIndex, sceneTotal,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames: dur } = useVideoConfig();
  const av = accentVariants(accentColor);
  const layout = useSceneLayout();

  const ITEM_SPACING = dur * 0.14;
  const PUNCH_CUE    = dur * 0.72;

  // Reserve bottom space for punch words so email cards don't overlap
  const punchReserve = layout.isPortrait ? 200 : 130;

  // Limit items per orientation
  const displayItems = items.slice(0, layout.isPortrait ? 3 : 4);

  return (
    <AbsoluteFill style={{ backgroundColor: bgColor, overflow: 'hidden' }}>
      {showImage && (
        <>
          <AbsoluteFill style={{ backgroundImage: `url(${staticFile(`images/scene_${sceneIndex}.png`)})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
          <AbsoluteFill style={{ backgroundColor: 'rgba(0,0,0,0.75)' }} />
        </>
      )}
      {/* Subtle grid */}
      <AbsoluteFill style={{
        backgroundImage: 'linear-gradient(rgba(148,163,184,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.04) 1px, transparent 1px)',
        backgroundSize: '80px 80px',
      }} />
      <AbsoluteFill style={{ background: `radial-gradient(ellipse at 50% 50%, rgba(5,13,26,0) 30%, ${bgColor} 75%)` }} />
      <NoiseOverlay />

      {/* Email cards — padded at bottom to leave room for punch words */}
      <AbsoluteFill style={{
        display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
        gap: layout.cardGap,
        padding: `0 ${layout.outerPadding + 40}px`,
        paddingBottom: punchReserve,
      }}>
        {displayItems.map((item, i) => {
          const cue = i * ITEM_SPACING;
          const p   = spring({ frame: frame - cue, fps, config: { damping: 200 } });
          const x   = interpolate(p, [0, 1], [200, 0]);
          const op  = interpolate(frame - cue, [0, 12], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
          const urgentGlow = item.urgent
            ? `0 0 ${interpolate(frame % 60, [0, 30, 60], [8, 20, 8])}px rgba(239,68,68,0.35)`
            : 'none';

          const initials = item.from.split('@')[0].slice(0, 2).toUpperCase();

          return (
            <div key={i} style={{
              opacity: op, transform: `translateX(${x}px)`,
              width: '100%',
              background: item.urgent ? 'rgba(239,68,68,0.06)' : 'rgba(10,22,40,0.9)',
              border: item.urgent ? '1px solid rgba(239,68,68,0.35)' : `1px solid ${av.border}`,
              borderLeft: item.urgent ? '3px solid #ef4444' : `3px solid ${av.strong}`,
              borderRadius: 14, padding: '18px 24px',
              display: 'flex', alignItems: 'center', gap: 18,
              boxShadow: urgentGlow,
            }}>
              {/* Avatar */}
              <div style={{
                width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
                background: item.urgent ? 'rgba(239,68,68,0.2)' : av.bg,
                border: item.urgent ? '1px solid rgba(239,68,68,0.4)' : `1px solid ${av.border}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <span style={{ fontSize: 14, color: item.urgent ? '#ef4444' : accentColor, fontFamily: MONO_FONT, fontWeight: '600' }}>{initials}</span>
              </div>

              {/* Subject + from */}
              <div style={{ flex: 1, overflow: 'hidden', minWidth: 0 }}>
                <div style={{ fontSize: layout.bodySize, color: item.urgent ? '#fca5a5' : '#e2e8f0', fontFamily: FONT, fontWeight: '600', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {item.subject}
                </div>
                <div style={{ fontSize: layout.labelSize + 4, color: 'rgba(148,163,184,0.75)', fontFamily: MONO_FONT, marginTop: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {item.from}
                </div>
              </div>

              {/* Time + urgent badge */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
                <span style={{ fontSize: layout.labelSize + 4, color: 'rgba(148,163,184,0.65)', fontFamily: MONO_FONT }}>{item.time}</span>
                {item.urgent && (
                  <div style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.4)', borderRadius: 6, padding: '3px 10px' }}>
                    <span style={{ fontSize: layout.labelSize, color: '#ef4444', fontFamily: MONO_FONT, fontWeight: '600', letterSpacing: '1.5px' }}>URGENT</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </AbsoluteFill>

      {/* Punch words — anchored to bottom, always above email cards */}
      <AbsoluteFill style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', paddingBottom: layout.isPortrait ? 80 : 72 }}>
        <div style={{ display: 'flex', gap: layout.isPortrait ? 24 : 48 }}>
          {punchWords.map((word, i) => {
            const cue = PUNCH_CUE + i * (dur * 0.07);
            const p   = spring({ frame: frame - cue, fps, config: { damping: 15 } });
            const scale = interpolate(p, [0, 1], [0.6, 1]);
            const op  = interpolate(frame - cue, [0, 8], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
            return (
              <div key={i} style={{ opacity: op, transform: `scale(${scale})` }}>
                <span style={{
                  fontSize: layout.isPortrait ? layout.headingSize + 4 : layout.displaySize - 4,
                  fontWeight: '800', color: i === 1 ? accentColor : '#f1f5f9', fontFamily: DISPLAY_FONT, letterSpacing: '2px',
                  textShadow: '0 3px 20px rgba(0,0,0,0.8)',
                }}>
                  {word}
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
