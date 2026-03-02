// agentforge-video/src/scenes/SceneMapLocation.tsx
import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate, spring, AbsoluteFill, staticFile } from 'remotion';
import { Audio } from '@remotion/media';
import { FONT, MONO_FONT } from '../font';
import { NoiseOverlay } from '../shared/NoiseOverlay';
import { SceneCounter } from '../shared/SceneCounter';
import { accentVariants } from '../shared/colorUtils';
import type { SceneMapLocationProps, SharedSceneProps } from '../types';

// Dot grid map background
const DotGrid: React.FC<{ color: string }> = ({ color }) => (
  <svg width="100%" height="100%" style={{ position: 'absolute' as const, top: 0, left: 0 }}>
    <defs>
      <pattern id="dotgrid" x="0" y="0" width="32" height="32" patternUnits="userSpaceOnUse">
        <circle cx="16" cy="16" r="1.5" fill={color} />
      </pattern>
    </defs>
    <rect width="100%" height="100%" fill="url(#dotgrid)" />
  </svg>
);

export const SceneMapLocation: React.FC<SceneMapLocationProps & SharedSceneProps> = ({
  address, city, hours, phone,
  accentColor, audioPath, sceneIndex, sceneTotal,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames: dur } = useVideoConfig();
  const av = accentVariants(accentColor);

  const CUE_PIN    = dur * 0.10;
  const CUE_INFO   = dur * 0.38;

  // Pin drop from above
  const pinP    = spring({ frame: frame - CUE_PIN, fps, config: { damping: 12, stiffness: 160 } });
  const pinY    = interpolate(pinP, [0, 1], [-200, 0]);
  const pinOp   = interpolate(frame - CUE_PIN, [0, 10], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  // Ripple rings — 3 rings with staggered delays
  const rippleFrames = [0, 20, 40];

  const infoOp = interpolate(frame - CUE_INFO, [0, 18], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const infoY  = interpolate(spring({ frame: frame - CUE_INFO, fps, config: { damping: 200 } }), [0, 1], [20, 0]);

  return (
    <AbsoluteFill style={{ backgroundColor: '#050d1a', overflow: 'hidden' }}>
      {/* Dot grid map */}
      <AbsoluteFill>
        <DotGrid color="rgba(148,163,184,0.08)" />
      </AbsoluteFill>
      <AbsoluteFill style={{ background: 'radial-gradient(ellipse at 50% 50%, rgba(5,13,26,0) 30%, #050d1a 75%)' }} />
      <NoiseOverlay />

      {/* Pin + ripples — centered in left 55% */}
      <AbsoluteFill style={{ display: 'flex', alignItems: 'center', pointerEvents: 'none' }}>
        <div style={{ width: '55%', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' as const }}>
          {/* Ripple rings */}
          {frame >= CUE_PIN && rippleFrames.map((delay, i) => {
            const rFrame = frame - CUE_PIN - delay;
            if (rFrame < 0) return null;
            const cycle = rFrame % 90;
            const rScale = interpolate(cycle, [0, 90], [0, 2.4]);
            const rOp    = interpolate(cycle, [0, 45, 90], [0.45, 0.2, 0]);
            return (
              <div key={i} style={{
                position: 'absolute' as const,
                width: 80, height: 80, borderRadius: '50%',
                border: `2px solid ${accentColor}`,
                transform: `scale(${rScale})`,
                opacity: rOp,
                pointerEvents: 'none',
              }} />
            );
          })}
          {/* Pin */}
          <div style={{ opacity: pinOp, transform: `translateY(${pinY}px)`, position: 'relative' as const, zIndex: 2 }}>
            <div style={{
              width: 56, height: 56, borderRadius: '50% 50% 50% 0',
              background: accentColor,
              transform: 'rotate(-45deg)',
              boxShadow: `0 0 32px ${av.glow}`,
            }}>
              <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', transform: 'rotate(45deg)' }}>
                <div style={{ width: 16, height: 16, borderRadius: '50%', background: '#ffffff', opacity: 0.9 }} />
              </div>
            </div>
          </div>
        </div>

        {/* Info card — right side */}
        <div style={{ flex: 1, padding: '0 60px 0 0', opacity: infoOp, transform: `translateY(${infoY}px)` }}>
          <div style={{
            background: av.bg, borderRadius: 20,
            border: `1px solid ${av.border}`, borderLeft: `3px solid ${accentColor}`,
            padding: '36px 32px',
            display: 'flex', flexDirection: 'column', gap: 20,
          }}>
            {/* City */}
            <div>
              <div style={{ fontSize: 44, fontWeight: '800', color: '#f1f5f9', fontFamily: FONT, letterSpacing: '-1px', lineHeight: 1 }}>{city}</div>
            </div>
            {/* Address */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              <span style={{ fontSize: 20, marginTop: 2 }}>📍</span>
              <div style={{ fontSize: 22, color: 'rgba(148,163,184,0.85)', fontFamily: FONT, lineHeight: 1.4 }}>{address}</div>
            </div>
            {/* Hours */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 20 }}>🕐</span>
              <div style={{ fontSize: 20, color: 'rgba(148,163,184,0.75)', fontFamily: MONO_FONT }}>{hours}</div>
            </div>
            {/* Phone (optional) */}
            {phone && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 20 }}>📞</span>
                <div style={{ fontSize: 20, color: accentColor, fontFamily: MONO_FONT, fontWeight: '600' }}>{phone}</div>
              </div>
            )}
          </div>
        </div>
      </AbsoluteFill>

      <SceneCounter current={sceneIndex + 1} total={sceneTotal} />
      <Audio src={staticFile(audioPath)} />
    </AbsoluteFill>
  );
};
