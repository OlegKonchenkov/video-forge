// agentforge-video/src/scenes/Scene1Pain.tsx
import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate, spring, AbsoluteFill, Img, staticFile } from 'remotion';
import { Audio } from '@remotion/media';
import { COLORS, WIDTH, HEIGHT } from '../constants';
import { FONT } from '../font';
import { EmailIcon, ClockIcon, ChartIcon } from '../icons';
import type { ScenePainProps } from '../types';

export const Scene1Pain: React.FC<ScenePainProps> = ({ headline, sub, painPoints }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames: dur } = useVideoConfig();

  const CUE_BG       = 0;
  const CUE_TAG      = dur * 0.03;
  const CUE_HEADLINE = dur * 0.12;
  const CUE_SUB      = dur * 0.36;
  const CUE_ICON1    = dur * 0.54;
  const CUE_ICON2    = dur * 0.64;
  const CUE_ICON3    = dur * 0.74;
  const EXIT_ICONS   = dur * 0.88;

  const bgOpacity      = interpolate(frame, [CUE_BG, CUE_BG + fps * 0.8], [0, 1], { extrapolateRight: 'clamp' });
  const overlayOpacity = interpolate(frame, [0, fps], [0, 0.82], { extrapolateRight: 'clamp' });

  const tagOp = interpolate(frame - CUE_TAG, [0, 12], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  const headlineProgress = spring({ frame: frame - CUE_HEADLINE, fps, config: { damping: 200 }, durationInFrames: 35 });
  const headlineY = interpolate(headlineProgress, [0, 1], [55, 0]);
  const headlineOp = interpolate(frame - CUE_HEADLINE, [0, 18], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  const subProgress = spring({ frame: frame - CUE_SUB, fps, config: { damping: 200 } });
  const subY  = interpolate(subProgress, [0, 1], [30, 0]);
  const subOp = interpolate(frame - CUE_SUB, [0, 15], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  const icon1Scale = spring({ frame: frame - CUE_ICON1, fps, config: { damping: 15 } });
  const icon2Scale = spring({ frame: frame - CUE_ICON2, fps, config: { damping: 15 } });
  const icon3Scale = spring({ frame: frame - CUE_ICON3, fps, config: { damping: 15 } });
  const iconsProgress1 = spring({ frame: frame - CUE_ICON1, fps, config: { damping: 200 } });

  const iconsExitOp = interpolate(frame, [EXIT_ICONS, EXIT_ICONS + 10], [1, 0.35], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  const iconDefs = [
    { icon: <EmailIcon size={44} color={COLORS.danger} frame={frame} fps={fps} />, label: painPoints[0], scale: icon1Scale },
    { icon: <ChartIcon size={44} color={COLORS.danger} progress={iconsProgress1} />, label: painPoints[1], scale: icon2Scale },
    { icon: <ClockIcon size={44} color={COLORS.danger} frame={frame} fps={fps} />, label: painPoints[2], scale: icon3Scale },
  ];

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.bg, overflow: 'hidden' }}>
      <Img src={staticFile('images/bg-hero.png')} style={{ width: WIDTH, height: HEIGHT, objectFit: 'cover', opacity: bgOpacity }} />
      <AbsoluteFill style={{ background: `rgba(5,13,26,${overlayOpacity})` }} />
      <AbsoluteFill style={{ background: `linear-gradient(to right, rgba(239,68,68,0.18), transparent)`, opacity: bgOpacity }} />

      <AbsoluteFill style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 140px', gap: 40, overflow: 'hidden' }}>
        {/* Tag badge */}
        <div style={{
          opacity: tagOp, display: 'inline-flex', alignItems: 'center', gap: 10,
          background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)',
          borderRadius: 100, padding: '8px 20px', width: 'fit-content',
        }}>
          <div style={{ width: 8, height: 8, background: COLORS.danger, borderRadius: '50%' }} />
          <span style={{ fontSize: 22, color: COLORS.danger, fontFamily: FONT, fontWeight: '600', letterSpacing: '1px', textTransform: 'uppercase' }}>
            Sound familiar?
          </span>
        </div>

        {/* Headline — from props */}
        <div style={{ opacity: headlineOp, transform: `translateY(${headlineY}px)`, overflow: 'hidden' }}>
          <div style={{ fontSize: 88, fontWeight: '800', color: COLORS.white, fontFamily: FONT, lineHeight: 1.1, letterSpacing: '-2.5px', maxWidth: 1000 }}>
            {headline}
          </div>
        </div>

        {/* Subtitle — from props */}
        <div style={{ opacity: subOp, transform: `translateY(${subY}px)` }}>
          <div style={{ fontSize: 30, color: 'rgba(148,163,184,0.9)', fontFamily: FONT, fontWeight: '400', maxWidth: 680, lineHeight: 1.5 }}>
            {sub}
          </div>
        </div>

        {/* Pain point icons — labels from props */}
        <div style={{ display: 'flex', gap: 28, marginTop: 8, opacity: iconsExitOp }}>
          {iconDefs.map(({ icon, label, scale }) => (
            <div key={label} style={{
              transform: `scale(${scale})`,
              display: 'flex', alignItems: 'center', gap: 14,
              background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.22)',
              borderRadius: 14, padding: '14px 24px',
            }}>
              {icon}
              <span style={{ fontSize: 24, color: COLORS.gray, fontFamily: FONT, fontWeight: '600', whiteSpace: 'nowrap' }}>{label}</span>
            </div>
          ))}
        </div>
      </AbsoluteFill>

      <Audio src={staticFile('audio/voiceover/scene1.mp3')} />
    </AbsoluteFill>
  );
};
