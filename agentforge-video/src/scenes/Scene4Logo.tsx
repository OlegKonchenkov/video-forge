import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate, spring, AbsoluteFill, staticFile } from 'remotion';
import { Audio } from '@remotion/media';
import { COLORS } from '../constants';
import { FONT } from '../font';

export const Scene4Logo: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames: dur } = useVideoConfig();

  const CUE_ICON    = dur * 0.12;
  const CUE_NAME    = dur * 0.30;
  const CUE_TAGLINE = dur * 0.52;

  const glowProgress = interpolate(frame, [0, dur * 0.8], [0, 1], { extrapolateRight: 'clamp' });

  const iconScale = spring({ frame: frame - CUE_ICON, fps, config: { damping: 12, stiffness: 120 } });
  const iconOp    = interpolate(frame - CUE_ICON, [0, 10], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  const nameProgress = spring({ frame: frame - CUE_NAME, fps, config: { damping: 14, stiffness: 140 } });
  const nameY = interpolate(nameProgress, [0, 1], [30, 0]);
  const nameOp = interpolate(frame - CUE_NAME, [0, 10], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  const taglineOp = interpolate(frame - CUE_TAGLINE, [0, 10], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const taglineY  = interpolate(spring({ frame: frame - CUE_TAGLINE, fps, config: { damping: 14 } }), [0, 1], [20, 0]);

  const ring1    = interpolate(frame % (fps * 2), [0, fps * 2], [0.7, 2.0]);
  const ring1Op  = interpolate(frame % (fps * 2), [0, fps * 0.4, fps * 2], [0.5, 0.2, 0]);
  const ring2    = interpolate((frame + fps) % (fps * 2), [0, fps * 2], [0.7, 2.0]);
  const ring2Op  = interpolate((frame + fps) % (fps * 2), [0, fps * 0.4, fps * 2], [0.5, 0.2, 0]);

  return (
    <AbsoluteFill style={{ backgroundColor: '#000', overflow: 'hidden' }}>
      <AbsoluteFill style={{ background: `radial-gradient(ellipse at 50% 50%, rgba(59,130,246,${glowProgress * 0.28}) 0%, transparent 55%)` }} />

      <AbsoluteFill style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ position: 'absolute', width: 260, height: 260, border: `1.5px solid rgba(59,130,246,${ring1Op * glowProgress})`, borderRadius: '50%', transform: `scale(${ring1})` }} />
        <div style={{ position: 'absolute', width: 260, height: 260, border: `1.5px solid rgba(59,130,246,${ring2Op * glowProgress})`, borderRadius: '50%', transform: `scale(${ring2})` }} />
      </AbsoluteFill>

      <AbsoluteFill style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 28, overflow: 'hidden' }}>
        <div style={{
          opacity: iconOp, transform: `scale(${iconScale})`,
          width: 110, height: 110,
          background: `linear-gradient(135deg, ${COLORS.accent}, ${COLORS.cyan})`,
          borderRadius: 26, display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: `0 0 80px rgba(59,130,246,${glowProgress * 0.55}), 0 0 30px rgba(59,130,246,0.3)`,
        }}>
          <svg width="56" height="56" viewBox="0 0 56 56" fill="none">
            <path d="M28 8L42 22H34V40H22V22H14L28 8Z" fill="white" />
            <circle cx="28" cy="44" r="4" fill="white" opacity="0.6" />
          </svg>
        </div>

        <div style={{ opacity: nameOp, transform: `translateY(${nameY}px)` }}>
          <div style={{ fontSize: 100, fontWeight: '800', color: COLORS.white, fontFamily: FONT, letterSpacing: '-3px', lineHeight: 1 }}>
            Agent<span style={{ color: COLORS.accent }}>Forge</span>
          </div>
        </div>

        <div style={{ opacity: taglineOp, transform: `translateY(${taglineY}px)` }}>
          <div style={{ fontSize: 28, color: COLORS.gray, fontFamily: FONT, fontWeight: '400', letterSpacing: '3px', textTransform: 'uppercase' }}>
            Custom AI Agents · Fully Managed
          </div>
        </div>
      </AbsoluteFill>

      <Audio src={staticFile('audio/voiceover/scene4.mp3')} />
    </AbsoluteFill>
  );
};
