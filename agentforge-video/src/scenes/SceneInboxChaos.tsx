// agentforge-video/src/scenes/SceneInboxChaos.tsx
// EMAIL STORM — particle field + staggered email cards + impact punchwords
import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate, spring, AbsoluteFill, staticFile } from 'remotion';
import { Audio } from '@remotion/media';
import { FONT, MONO_FONT } from '../font';
import { NoiseOverlay } from '../shared/NoiseOverlay';
import { SceneCounter } from '../shared/SceneCounter';
import { useSceneLayout } from '../shared/useSceneLayout';
import { useVisualVariant } from '../shared/useVisualVariant';
import { VariantBackground } from '../shared/VariantBackground';
import type { SceneInboxChaosProps, SharedSceneProps } from '../types';

export const SceneInboxChaos: React.FC<SceneInboxChaosProps & SharedSceneProps> = ({
  items, punchWords,
  accentColor, bgColor, showImage, audioPath, sceneIndex, sceneTotal, variantId,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames: dur } = useVideoConfig();
  const variant = useVisualVariant(variantId, accentColor);
  const av = variant.av;
  const layout = useSceneLayout();

  const CUE_W1    = dur * 0.06;
  const CUE_W2    = dur * 0.20;
  const CUE_W3    = dur * 0.34;
  const CUE_CARDS = dur * 0.28;
  const CARD_GAP  = dur * 0.10;

  const exitOp = interpolate(frame, [dur * 0.88, dur * 0.88 + 12], [1, 0.3], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  // Impact animation for punchwords
  const impact = (cue: number) => {
    const p = spring({ frame: frame - cue, fps, config: { damping: 100, stiffness: 300 } });
    return {
      scale:   interpolate(p, [0, 1], [0.5, 1]),
      opacity: interpolate(frame - cue, [0, 8], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
    };
  };

  const w1 = impact(CUE_W1);
  const w2 = impact(CUE_W2);
  const w3 = impact(CUE_W3);
  const wordAnims = [w1, w2, w3];

  const displayItems = items.slice(0, layout.isPortrait ? 3 : 4);

  return (
    <AbsoluteFill style={{ backgroundColor: bgColor, overflow: 'hidden' }}>
      {showImage && (
        <>
          <AbsoluteFill style={{ backgroundImage: `url(${staticFile(`images/scene_${sceneIndex}.png`)})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
          <AbsoluteFill style={{ backgroundColor: 'rgba(0,0,0,0.82)' }} />
        </>
      )}

      {/* Variant background */}
      <VariantBackground variant={variant} accentColor={accentColor} />
      {/* Left accent glow */}
      <AbsoluteFill style={{ background: `radial-gradient(ellipse at 15% 50%, ${av.glow} 0%, transparent 55%)` }} />
      <NoiseOverlay />

      <AbsoluteFill style={{
        display: 'flex',
        flexDirection: layout.direction,
        alignItems: 'center',
        justifyContent: 'center',
        padding: `${layout.isPortrait ? layout.outerPadding * 0.8 : 0}px ${layout.outerPadding}px`,
        gap: layout.isPortrait ? layout.innerGap : 0,
        opacity: exitOp,
      }}>
        {/* ── Left / Top: stacked punchwords ── */}
        <div style={{ width: layout.isPortrait ? '100%' : '40%', display: 'flex', flexDirection: 'column', gap: 6 }}>
          {/* Label */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: av.bg, border: `1px solid ${av.border}`,
            borderRadius: 100, padding: '6px 18px', width: 'fit-content', marginBottom: 12,
          }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: accentColor }} />
            <span style={{ fontSize: layout.labelSize, color: accentColor, fontFamily: MONO_FONT, letterSpacing: '2px', textTransform: 'uppercase' as const, fontWeight: '700' }}>
              Sound familiar?
            </span>
          </div>

          {punchWords.map((word, i) => (
            <div key={i} style={{
              opacity: wordAnims[i].opacity,
              transform: `scale(${wordAnims[i].scale})`,
              transformOrigin: 'left center',
            }}>
              <div style={{
                fontSize: layout.isPortrait ? layout.headingSize : layout.displaySize - 6,
                fontWeight: '900' as const,
                color: i === 1 ? accentColor : '#f1f5f9',
                fontFamily: FONT,
                lineHeight: 1.0,
                letterSpacing: '-2px',
                textShadow: i === 1
                  ? `0 0 50px ${accentColor}, 0 2px 20px rgba(0,0,0,0.8)`
                  : '0 2px 20px rgba(0,0,0,0.9)',
              }}>
                {word}
              </div>
            </div>
          ))}
        </div>

        {/* ── Right / Bottom: email card stack ── */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: layout.cardGap * 0.8, paddingLeft: layout.isPortrait ? 0 : 44 }}>
          {displayItems.map((item, i) => {
            const cue = CUE_CARDS + i * CARD_GAP;
            const p   = spring({ frame: frame - cue, fps, config: { damping: 200 } });
            const x   = interpolate(p, [0, 1], [90, 0]);
            const op  = interpolate(frame - cue, [0, 14], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
            const initials = item.from.split('@')[0].slice(0, 2).toUpperCase();
            return (
              <div key={i} style={{
                opacity: op, transform: `translateX(${x}px)`,
                background: item.urgent ? 'rgba(239,68,68,0.06)' : 'rgba(255,255,255,0.04)',
                border: `1px solid ${item.urgent ? 'rgba(239,68,68,0.4)' : av.border}`,
                borderLeft: `3px solid ${item.urgent ? '#ef4444' : av.strong}`,
                borderRadius: 12, padding: '14px 20px',
                display: 'flex', alignItems: 'center', gap: 16,
              }}>
                {/* Avatar */}
                <div style={{
                  width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
                  background: item.urgent ? 'rgba(239,68,68,0.18)' : av.bg,
                  border: `1px solid ${item.urgent ? 'rgba(239,68,68,0.4)' : av.border}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <span style={{ fontSize: layout.labelSize - 1, color: item.urgent ? '#ef4444' : accentColor, fontFamily: MONO_FONT, fontWeight: '700' }}>{initials}</span>
                </div>
                {/* Content */}
                <div style={{ flex: 1, overflow: 'hidden', minWidth: 0 }}>
                  <div style={{ fontSize: layout.bodySize - 1, color: item.urgent ? '#fca5a5' : '#e2e8f0', fontFamily: FONT, fontWeight: '600', whiteSpace: 'nowrap' as const, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {item.subject}
                  </div>
                  <div style={{ fontSize: layout.labelSize + 2, color: 'rgba(148,163,184,0.7)', fontFamily: MONO_FONT, marginTop: 3 }}>
                    {item.from}
                  </div>
                </div>
                {/* Time */}
                <div style={{ flexShrink: 0 }}>
                  {item.urgent && (
                    <div style={{ background: 'rgba(239,68,68,0.14)', border: '1px solid rgba(239,68,68,0.4)', borderRadius: 6, padding: '2px 10px', marginBottom: 4 }}>
                      <span style={{ fontSize: layout.labelSize - 1, color: '#ef4444', fontFamily: MONO_FONT, fontWeight: '700', letterSpacing: '1.5px' }}>URGENT</span>
                    </div>
                  )}
                  <div style={{ fontSize: layout.labelSize + 1, color: 'rgba(148,163,184,0.6)', fontFamily: MONO_FONT, textAlign: 'right' as const }}>{item.time}</div>
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
