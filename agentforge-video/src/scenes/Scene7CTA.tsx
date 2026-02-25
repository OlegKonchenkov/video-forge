import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate, spring, AbsoluteFill, Img, staticFile } from 'remotion';
import { Audio } from '@remotion/media';
import { COLORS, WIDTH, HEIGHT } from '../constants';
import { FONT } from '../font';

export const Scene7CTA: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames: dur } = useVideoConfig();

  const CUE_LOGO    = dur * 0.02;
  const CUE_LINE1   = dur * 0.12;
  const CUE_LINE2   = dur * 0.28;
  const CUE_SUB     = dur * 0.42;
  const CUE_CTA     = dur * 0.54;
  const CUE_URL     = dur * 0.66;
  const FINAL_PULSE = dur * 0.88;

  const bgOp        = interpolate(frame, [0, fps], [0, 1], { extrapolateRight: 'clamp' });
  const glowProgress = interpolate(frame, [0, dur * 0.7], [0, 1], { extrapolateRight: 'clamp' });

  const logoScale = spring({ frame: frame - CUE_LOGO, fps, config: { damping: 200 } });
  const logoOp    = interpolate(frame - CUE_LOGO, [0, 15], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  const line1Op = interpolate(frame - CUE_LINE1, [0, 15], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const line1Y  = interpolate(spring({ frame: frame - CUE_LINE1, fps, config: { damping: 200 } }), [0, 1], [35, 0]);

  const line2Op = interpolate(frame - CUE_LINE2, [0, 15], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const line2Y  = interpolate(spring({ frame: frame - CUE_LINE2, fps, config: { damping: 200 } }), [0, 1], [30, 0]);

  const subOp = interpolate(frame - CUE_SUB, [0, 15], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const subY  = interpolate(spring({ frame: frame - CUE_SUB, fps, config: { damping: 200 } }), [0, 1], [25, 0]);

  const ctaScale = spring({ frame: frame - CUE_CTA, fps, config: { damping: 14, stiffness: 160 } });
  const ctaOp   = interpolate(frame - CUE_CTA, [0, 15], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  const btnIdlePulse = interpolate(Math.max(0, frame - CUE_CTA - 30) % (fps * 2.2), [0, fps * 1.1, fps * 2.2], [1, 1.04, 1]);
  const finalPulse   = interpolate(frame - FINAL_PULSE, [0, 8, 16], [1, 1.06, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const btnPulse     = Math.max(btnIdlePulse, finalPulse);

  const urlOp = interpolate(frame - CUE_URL, [0, 15], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{ backgroundColor: '#000', overflow: 'hidden' }}>
      <Img src={staticFile('images/bg-cta.png')} style={{ width: WIDTH, height: HEIGHT, objectFit: 'cover', opacity: bgOp * 0.22 }} />
      <AbsoluteFill style={{ background: 'rgba(0,0,0,0.82)' }} />
      <AbsoluteFill style={{ background: `radial-gradient(ellipse at 50% 50%, rgba(59,130,246,${glowProgress * 0.22}) 0%, transparent 60%)` }} />

      <AbsoluteFill style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 120px', gap: 32, overflow: 'hidden' }}>
        <div style={{ opacity: logoOp, transform: `scale(${logoScale})`, display: 'flex', alignItems: 'center', gap: 18 }}>
          <div style={{
            width: 64, height: 64,
            background: `linear-gradient(135deg, ${COLORS.accent}, ${COLORS.cyan})`,
            borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: `0 0 40px rgba(59,130,246,${glowProgress * 0.45})`,
          }}>
            <svg width="34" height="34" viewBox="0 0 56 56" fill="none">
              <path d="M28 8L42 22H34V40H22V22H14L28 8Z" fill="white" />
              <circle cx="28" cy="44" r="4" fill="white" opacity="0.6" />
            </svg>
          </div>
          <div style={{ fontSize: 56, fontWeight: '800', color: COLORS.white, fontFamily: FONT, letterSpacing: '-2px', lineHeight: 1 }}>
            Agent<span style={{ color: COLORS.accent }}>Forge</span>
          </div>
        </div>

        <div style={{ opacity: line1Op, transform: `translateY(${line1Y}px)`, textAlign: 'center', overflow: 'hidden' }}>
          <div style={{ fontSize: 80, fontWeight: '800', color: COLORS.white, fontFamily: FONT, lineHeight: 1.15, letterSpacing: '-2.5px', maxWidth: 1300 }}>
            Stop paying people to do what
          </div>
        </div>

        <div style={{ opacity: line2Op, transform: `translateY(${line2Y}px)`, textAlign: 'center', overflow: 'hidden', marginTop: -18 }}>
          <div style={{ fontSize: 80, fontWeight: '800', color: COLORS.accent, fontFamily: FONT, lineHeight: 1.15, letterSpacing: '-2.5px' }}>
            AI does better.
          </div>
        </div>

        <div style={{ opacity: subOp, transform: `translateY(${subY}px)`, textAlign: 'center', overflow: 'hidden' }}>
          <div style={{ fontSize: 32, color: COLORS.gray, fontFamily: FONT, fontWeight: '400' }}>
            Book your free 15-minute call today.
          </div>
        </div>

        <div style={{
          opacity: ctaOp, transform: `scale(${ctaScale * btnPulse})`,
          background: `linear-gradient(135deg, ${COLORS.accent}, ${COLORS.cyan})`,
          borderRadius: 16, padding: '26px 80px',
          fontSize: 38, fontWeight: '700', color: '#fff', fontFamily: FONT,
          boxShadow: `0 0 70px rgba(59,130,246,${glowProgress * 0.45})`,
          letterSpacing: '-0.5px', whiteSpace: 'nowrap',
        }}>
          Book Free Call →
        </div>

        <div style={{ opacity: urlOp, fontSize: 26, color: 'rgba(148,163,184,0.7)', fontFamily: FONT, letterSpacing: '1.5px' }}>
          automagical-teams.lovable.app
        </div>
      </AbsoluteFill>

      <Audio src={staticFile('audio/voiceover/scene7.mp3')} />
    </AbsoluteFill>
  );
};
