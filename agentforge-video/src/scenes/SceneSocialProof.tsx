// agentforge-video/src/scenes/SceneSocialProof.tsx
import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate, spring, AbsoluteFill, staticFile } from 'remotion';
import { Audio } from '@remotion/media';
import { FONT, DISPLAY_FONT, MONO_FONT } from '../font';
import { NoiseOverlay } from '../shared/NoiseOverlay';
import { SceneCounter } from '../shared/SceneCounter';
import { accentVariants } from '../shared/colorUtils';
import { useSceneLayout } from '../shared/useSceneLayout';
import type { SceneSocialProofProps, SharedSceneProps } from '../types';

const CHARS = '0123456789';
function scramble(target: string, frame: number, cue: number): string {
  const elapsed = frame - cue;
  if (elapsed < 0) return target.replace(/[0-9]/g, '0');
  if (elapsed >= 35) return target;
  return target.split('').map((ch) => {
    if (!/[0-9]/.test(ch)) return ch;
    return Math.random() < elapsed / 35 * 1.3 ? ch : CHARS[Math.floor(Math.random() * CHARS.length)];
  }).join('');
}

export const SceneSocialProof: React.FC<SceneSocialProofProps & SharedSceneProps> = ({
  title, badges,
  accentColor, bgColor, showImage, audioPath, sceneIndex, sceneTotal,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames: dur } = useVideoConfig();
  const av = accentVariants(accentColor);
  const layout = useSceneLayout();

  const CUE_TITLE   = 0;
  const CUE_BADGE_0 = dur * 0.22;
  const BADGE_STEP  = dur * 0.14;

  const titleOp = interpolate(frame, [CUE_TITLE, CUE_TITLE + 20], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const titleY  = interpolate(spring({ frame, fps, config: { damping: 200 } }), [0, 1], [24, 0]);

  const displayBadges = badges.slice(0, layout.maxListItems + 1); // up to 3 portrait, 4 landscape

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
      <AbsoluteFill style={{ background: `radial-gradient(ellipse at 50% 30%, ${av.bg} 0%, transparent 65%)` }} />
      <NoiseOverlay />

      <AbsoluteFill style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: `0 ${layout.outerPadding}px`,
        gap: layout.innerGap,
      }}>
        {/* Title */}
        <div style={{ opacity: titleOp, transform: `translateY(${titleY}px)`, textAlign: 'center' as const }}>
          <div style={{ fontSize: layout.headingSize, fontWeight: '800', color: '#f1f5f9', fontFamily: FONT, letterSpacing: '-1.5px', lineHeight: 1.1 }}>
            {title}
          </div>
        </div>

        {/* Badge cards — stacked portrait, row landscape */}
        <div style={{
          display: 'flex',
          flexDirection: layout.isPortrait ? 'column' : 'row',
          gap: layout.cardGap,
          width: '100%',
          justifyContent: 'center',
          alignItems: 'stretch',
        }}>
          {displayBadges.map((badge, i) => {
            const cue  = CUE_BADGE_0 + i * BADGE_STEP;
            const p    = spring({ frame: frame - cue, fps, config: { damping: 200 } });
            const y    = interpolate(p, [0, 1], [50, 0]);
            const op   = interpolate(frame - cue, [0, 18], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
            const glowP = interpolate(p, [0, 1], [0, 1]);
            const display = scramble(badge.value, frame, cue + 10);

            return (
              <div key={i} style={{
                opacity: op, transform: `translateY(${y}px)`,
                flex: layout.isPortrait ? undefined : 1,
                background: av.bg,
                borderRadius: 20,
                border: `1px solid ${av.border}`,
                borderTop: `2px solid ${av.strong}`,
                padding: `${layout.isPortrait ? layout.cardGap : 32}px ${layout.isPortrait ? 24 : 28}px`,
                display: 'flex',
                flexDirection: layout.isPortrait ? 'row' : 'column',
                alignItems: 'center',
                gap: layout.isPortrait ? 20 : 12,
                boxShadow: `0 0 ${Math.round(30 * glowP)}px ${av.glow}`,
              }}>
                {/* Value */}
                <div style={{ fontSize: layout.isPortrait ? layout.headingSize : layout.displaySize - 4, color: accentColor, fontFamily: DISPLAY_FONT, lineHeight: 1, letterSpacing: '-1px', flexShrink: 0 }}>
                  {display}
                </div>
                {/* Divider */}
                {layout.isPortrait && (
                  <div style={{ width: 1, height: 40, background: `linear-gradient(to bottom, transparent, ${av.border}, transparent)`, flexShrink: 0 }} />
                )}
                {/* Label */}
                <div style={{ fontSize: layout.isPortrait ? layout.bodySize - 4 : layout.bodySize - 6, color: 'rgba(148,163,184,0.8)', fontFamily: MONO_FONT, textTransform: 'uppercase' as const, letterSpacing: '1.5px', textAlign: layout.isPortrait ? 'left' as const : 'center' as const, lineHeight: 1.3 }}>
                  {badge.label}
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
