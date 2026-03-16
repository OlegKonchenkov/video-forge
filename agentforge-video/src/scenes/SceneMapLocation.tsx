// agentforge-video/src/scenes/SceneMapLocation.tsx
// Visual: RADAR PING — GradientMesh, enhanced glowing ripple rings, glassmorphic info card
import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate, spring, AbsoluteFill, staticFile } from 'remotion';
import { Audio } from '@remotion/media';
import { FONT, MONO_FONT } from '../font';
import { NoiseOverlay } from '../shared/NoiseOverlay';
import { SceneCounter } from '../shared/SceneCounter';
import { useSceneLayout } from '../shared/useSceneLayout';
import { useVisualVariant } from '../shared/useVisualVariant';
import { VariantBackground } from '../shared/VariantBackground';
import type { SceneMapLocationProps, SharedSceneProps } from '../types';

export const SceneMapLocation: React.FC<SceneMapLocationProps & SharedSceneProps> = ({
  address, city, hours, phone,
  accentColor, bgColor, showImage, audioPath, sceneIndex, sceneTotal, variantId,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames: dur } = useVideoConfig();
  const variant = useVisualVariant(variantId, accentColor);
  const av = variant.av;
  const layout = useSceneLayout();

  const CUE_PIN  = dur * 0.10;
  const CUE_INFO = dur * 0.38;

  // Pin drop from above with bounce
  const pinP  = spring({ frame: frame - CUE_PIN, fps, config: { damping: 12, stiffness: 160 } });
  const pinY  = interpolate(pinP, [0, 1], [-200, 0]);
  const pinOp = interpolate(frame - CUE_PIN, [0, 10], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  // Ripple rings — 3 staggered delays
  const rippleDelays = [0, 22, 44];

  const infoOp = interpolate(frame - CUE_INFO, [0, 18], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const infoY  = interpolate(spring({ frame: frame - CUE_INFO, fps, config: { damping: 200 } }), [0, 1], [24, 0]);

  const exitOp = interpolate(frame, [dur * 0.88, dur * 0.88 + 10], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{ backgroundColor: bgColor, overflow: 'hidden' }}>
      {showImage && (
        <>
          <AbsoluteFill style={{ backgroundImage: `url(${staticFile(`images/scene_${sceneIndex}.png`)})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
          <AbsoluteFill style={{ backgroundColor: 'rgba(0,0,0,0.78)' }} />
        </>
      )}

      {/* Variant background */}
      <VariantBackground variant={variant} accentColor={accentColor} />

      <NoiseOverlay />

      <AbsoluteFill style={{
        display: 'flex',
        flexDirection: layout.direction,
        alignItems: 'center',
        justifyContent: 'center',
        padding: layout.isPortrait ? `${layout.outerPadding}px ${layout.outerPadding}px` : '0',
        gap: layout.innerGap,
        opacity: exitOp,
      }}>
        {/* Pin + ripples */}
        <div style={{
          width: layout.isPortrait ? '100%' : '48%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          position: 'relative' as const,
          minHeight: layout.isPortrait ? 180 : undefined,
        }}>
          {/* Ripple rings */}
          {frame >= CUE_PIN && rippleDelays.map((delay, i) => {
            const rFrame = frame - CUE_PIN - delay;
            if (rFrame < 0) return null;
            const cycle  = rFrame % 90;
            const rScale = interpolate(cycle, [0, 90], [0, 2.8]);
            const rOp    = interpolate(cycle, [0, 30, 90], [0.7, 0.35, 0]);
            return (
              <div key={i} style={{
                position: 'absolute' as const,
                width: 80, height: 80, borderRadius: '50%',
                border: `2px solid ${accentColor}`,
                boxShadow: `0 0 14px ${av.glow}`,
                transform: `scale(${rScale})`,
                opacity: rOp,
                pointerEvents: 'none',
              }} />
            );
          })}

          {/* Location pin */}
          <div style={{ opacity: pinOp, transform: `translateY(${pinY}px)`, position: 'relative' as const, zIndex: 2 }}>
            <div style={{
              width: layout.isPortrait ? 48 : 64,
              height: layout.isPortrait ? 48 : 64,
              borderRadius: '50% 50% 50% 0',
              background: `radial-gradient(circle at 35% 35%, ${av.strong}, ${accentColor})`,
              transform: 'rotate(-45deg)',
              boxShadow: `0 0 48px ${av.glow}, 0 0 24px ${av.glow}`,
            }}>
              <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', transform: 'rotate(45deg)' }}>
                <div style={{ width: 16, height: 16, borderRadius: '50%', background: '#ffffff', opacity: 0.95 }} />
              </div>
            </div>
          </div>
        </div>

        {/* Info card — glassmorphic */}
        <div style={{
          flex: layout.isPortrait ? undefined : 1,
          width: layout.isPortrait ? '100%' : undefined,
          padding: layout.isPortrait ? 0 : `0 ${layout.outerPadding * 0.75}px 0 0`,
          opacity: infoOp,
          transform: `translateY(${infoY}px)`,
        }}>
          <div style={{
            background: 'rgba(255,255,255,0.04)',
            borderRadius: 20,
            border: `1px solid ${av.border}`,
            borderLeft: `3px solid ${accentColor}`,
            padding: `${layout.innerGap}px`,
            display: 'flex', flexDirection: 'column', gap: layout.cardGap,
            boxShadow: `0 0 40px ${av.glow}, inset 0 1px 0 rgba(255,255,255,0.06)`,
          }}>
            {/* Location label */}
            <div style={{ fontSize: layout.labelSize - 2, color: accentColor, fontFamily: MONO_FONT, letterSpacing: '3px', textTransform: 'uppercase' as const, marginBottom: -4, textShadow: `0 0 12px ${av.glow}` }}>
              📍 LOCATION
            </div>

            {/* City name */}
            <div style={{ fontSize: layout.headingSize - 10, fontWeight: '800', color: '#f1f5f9', fontFamily: FONT, letterSpacing: '-1px', lineHeight: 1, textShadow: '0 0 20px rgba(0,0,0,0.8)' }}>
              {city}
            </div>

            {/* Separator */}
            <div style={{ width: '100%', height: 1, background: `linear-gradient(90deg, ${av.border}, transparent)` }} />

            {/* Address */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              <span style={{ fontSize: layout.bodySize - 4, marginTop: 2, flexShrink: 0 }}>📍</span>
              <div style={{ fontSize: layout.bodySize - 4, color: 'rgba(148,163,184,0.85)', fontFamily: FONT, lineHeight: 1.45 }}>{address}</div>
            </div>

            {/* Hours */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: layout.bodySize - 4, flexShrink: 0 }}>🕐</span>
              <div style={{ fontSize: layout.bodySize - 6, color: 'rgba(148,163,184,0.75)', fontFamily: MONO_FONT }}>{hours}</div>
            </div>

            {/* Phone */}
            {phone && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: layout.bodySize - 4, flexShrink: 0 }}>📞</span>
                <div style={{ fontSize: layout.bodySize - 6, color: accentColor, fontFamily: MONO_FONT, fontWeight: '600', textShadow: `0 0 12px ${av.glow}` }}>{phone}</div>
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
