// agentforge-video/src/scenes/SceneMapLocation.tsx
import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate, spring, AbsoluteFill, staticFile } from 'remotion';
import { Audio } from '@remotion/media';
import { FONT, MONO_FONT } from '../font';
import { NoiseOverlay } from '../shared/NoiseOverlay';
import { SceneCounter } from '../shared/SceneCounter';
import { accentVariants } from '../shared/colorUtils';
import { useSceneLayout } from '../shared/useSceneLayout';
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
  const layout = useSceneLayout();

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
      {/* Scene background image */}
      <AbsoluteFill style={{ backgroundImage: `url(${staticFile(`images/scene_${sceneIndex}.png`)})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
      {/* Dark overlay */}
      <AbsoluteFill style={{ backgroundColor: 'rgba(5,13,26,0.75)' }} />
      {/* Dot grid map */}
      <AbsoluteFill>
        <DotGrid color="rgba(148,163,184,0.08)" />
      </AbsoluteFill>
      <AbsoluteFill style={{ background: 'radial-gradient(ellipse at 50% 50%, rgba(5,13,26,0) 30%, #050d1a 75%)' }} />
      <NoiseOverlay />

      <AbsoluteFill style={{
        display: 'flex',
        flexDirection: layout.direction,
        alignItems: 'center',
        justifyContent: 'center',
        padding: layout.isPortrait ? `${layout.outerPadding}px ${layout.outerPadding}px` : '0',
        gap: layout.innerGap,
      }}>
        {/* Pin + ripples */}
        <div style={{
          width: layout.isPortrait ? '100%' : '55%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          position: 'relative' as const,
          minHeight: layout.isPortrait ? 160 : undefined,
        }}>
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
              width: layout.isPortrait ? 44 : 56,
              height: layout.isPortrait ? 44 : 56,
              borderRadius: '50% 50% 50% 0',
              background: accentColor,
              transform: 'rotate(-45deg)',
              boxShadow: `0 0 32px ${av.glow}`,
            }}>
              <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', transform: 'rotate(45deg)' }}>
                <div style={{ width: 14, height: 14, borderRadius: '50%', background: '#ffffff', opacity: 0.9 }} />
              </div>
            </div>
          </div>
        </div>

        {/* Info card */}
        <div style={{
          flex: layout.isPortrait ? undefined : 1,
          width: layout.isPortrait ? '100%' : undefined,
          padding: layout.isPortrait ? 0 : `0 ${layout.outerPadding * 0.75}px 0 0`,
          opacity: infoOp,
          transform: `translateY(${infoY}px)`,
        }}>
          <div style={{
            background: av.bg, borderRadius: 20,
            border: `1px solid ${av.border}`, borderLeft: `3px solid ${accentColor}`,
            padding: `${layout.innerGap}px ${layout.innerGap}px`,
            display: 'flex', flexDirection: 'column', gap: layout.cardGap,
          }}>
            {/* City */}
            <div>
              <div style={{ fontSize: layout.headingSize - 12, fontWeight: '800', color: '#f1f5f9', fontFamily: FONT, letterSpacing: '-1px', lineHeight: 1 }}>{city}</div>
            </div>
            {/* Address */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              <span style={{ fontSize: layout.bodySize - 4, marginTop: 2 }}>📍</span>
              <div style={{ fontSize: layout.bodySize - 4, color: 'rgba(148,163,184,0.85)', fontFamily: FONT, lineHeight: 1.4 }}>{address}</div>
            </div>
            {/* Hours */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: layout.bodySize - 4 }}>🕐</span>
              <div style={{ fontSize: layout.bodySize - 6, color: 'rgba(148,163,184,0.75)', fontFamily: MONO_FONT }}>{hours}</div>
            </div>
            {/* Phone (optional) */}
            {phone && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: layout.bodySize - 4 }}>📞</span>
                <div style={{ fontSize: layout.bodySize - 6, color: accentColor, fontFamily: MONO_FONT, fontWeight: '600' }}>{phone}</div>
              </div>
            )}
          </div>
        </div>
      </AbsoluteFill>

      <SceneCounter current={sceneIndex + 1} total={sceneTotal} />
      {audioPath && <Audio src={staticFile(audioPath)} />}
    </AbsoluteFill>
  );
};
