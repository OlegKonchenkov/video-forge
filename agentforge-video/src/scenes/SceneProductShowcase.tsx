// agentforge-video/src/scenes/SceneProductShowcase.tsx
// Visual: PRODUCT HERO — Ken Burns zoom, GradientMesh spotlight, ShimmerOverlay on name
import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate, spring, AbsoluteFill, Img, staticFile } from 'remotion';
import { Audio } from '@remotion/media';
import { FONT, MONO_FONT } from '../font';
import { NoiseOverlay } from '../shared/NoiseOverlay';
import { SceneCounter } from '../shared/SceneCounter';
import { GradientMesh } from '../shared/GradientMesh';
import { ShimmerOverlay } from '../shared/ShimmerOverlay';
import { accentVariants } from '../shared/colorUtils';
import { useSceneLayout } from '../shared/useSceneLayout';
import type { SceneProductShowcaseProps, SharedSceneProps } from '../types';

export const SceneProductShowcase: React.FC<SceneProductShowcaseProps & SharedSceneProps> = ({
  productName, tagline, price,
  accentColor, bgColor, showImage, audioPath, sceneIndex, sceneTotal,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames: dur } = useVideoConfig();
  const av = accentVariants(accentColor);
  const layout = useSceneLayout();

  const CUE_NAME  = 0;
  const CUE_TAG   = dur * 0.28;
  const CUE_PRICE = dur * 0.50;

  // Ken Burns: slow zoom 1 → 1.09
  const kbScale = interpolate(frame, [0, dur], [1, 1.09], { extrapolateRight: 'clamp' });

  // Product name — scale spring reveal
  const nameP  = spring({ frame: frame - CUE_NAME, fps, config: { damping: 180 } });
  const nameSc = interpolate(nameP, [0, 1], [0.82, 1]);
  const nameOp = interpolate(frame - CUE_NAME, [0, 20], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  // Tagline slide up
  const tagOp = interpolate(frame - CUE_TAG, [0, 18], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const tagY  = interpolate(spring({ frame: frame - CUE_TAG, fps, config: { damping: 200 } }), [0, 1], [18, 0]);

  // Price badge spring pop
  const priceOp = price ? interpolate(frame - CUE_PRICE, [0, 15], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }) : 0;
  const priceSc = price ? interpolate(spring({ frame: frame - CUE_PRICE, fps, config: { damping: 15 } }), [0, 1], [0.65, 1]) : 1;

  // Pulsing glow on accent bar
  const glowPulse = 0.6 + Math.sin(frame * 0.08) * 0.4;

  const exitOp = interpolate(frame, [dur * 0.88, dur * 0.88 + 10], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{ backgroundColor: bgColor, overflow: 'hidden' }}>
      {/* Ken Burns image */}
      {showImage && (
        <AbsoluteFill style={{ overflow: 'hidden' }}>
          <Img
            src={staticFile(`images/scene_${sceneIndex}.png`)}
            style={{
              width: '100%', height: '100%',
              objectFit: 'cover',
              transform: `scale(${kbScale})`,
              transformOrigin: 'center center',
            }}
          />
          {/* Deep bottom vignette */}
          <AbsoluteFill style={{
            background: `linear-gradient(to top, ${bgColor} 0%, rgba(5,13,26,0.85) 45%, rgba(5,13,26,0.25) 100%)`,
          }} />
        </AbsoluteFill>
      )}

      {/* GradientMesh spotlight at bottom */}
      <GradientMesh colors={[accentColor, '#1e3a5f', bgColor]} speed={0.5} opacity={0.30} />

      <NoiseOverlay />

      {/* Content anchored to bottom */}
      <AbsoluteFill style={{
        display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
        padding: `0 ${layout.outerPadding}px ${layout.outerPadding}px`,
        opacity: exitOp,
      }}>

        {/* Product category label */}
        <div style={{ opacity: nameOp, marginBottom: 14 }}>
          <span style={{
            fontSize: layout.labelSize - 2,
            color: accentColor,
            fontFamily: MONO_FONT,
            letterSpacing: '4px',
            textTransform: 'uppercase' as const,
            textShadow: `0 0 12px ${av.glow}`,
          }}>
            ● PRODUCT
          </span>
        </div>

        {/* Product name with ShimmerOverlay */}
        <div style={{
          opacity: nameOp,
          transform: `scale(${nameSc})`,
          transformOrigin: 'left bottom',
          position: 'relative' as const,
          display: 'inline-block',
          overflow: 'hidden',
        }}>
          <div style={{
            fontSize: layout.displaySize,
            fontWeight: '900',
            color: '#ffffff',
            fontFamily: FONT,
            letterSpacing: layout.isPortrait ? '2px' : '4px',
            textTransform: 'uppercase' as const,
            lineHeight: 1,
            textShadow: `0 0 40px ${av.glow}, 0 2px 20px rgba(0,0,0,0.9)`,
          }}>
            {productName}
          </div>
          <ShimmerOverlay color={accentColor} periodFrames={110} opacity={0.5} width="60%" />
        </div>

        {/* Pulsing accent bar */}
        <div style={{
          width: 72, height: 4,
          background: `linear-gradient(90deg, ${accentColor}, ${av.border})`,
          margin: `${layout.innerGap * 0.35}px 0`,
          borderRadius: 2,
          boxShadow: `0 0 ${12 * glowPulse}px ${av.glow}`,
        }} />

        {/* Tagline */}
        <div style={{ opacity: tagOp, transform: `translateY(${tagY}px)` }}>
          <div style={{
            fontSize: layout.bodySize + 2,
            color: 'rgba(241,245,249,0.88)',
            fontFamily: FONT,
            fontWeight: '400',
            lineHeight: 1.45,
            textShadow: '0 1px 16px rgba(0,0,0,0.8)',
          }}>
            {tagline}
          </div>
        </div>

        {/* Price badge */}
        {price && (
          <div style={{
            opacity: priceOp,
            transform: `scale(${priceSc})`,
            transformOrigin: 'left bottom',
            marginTop: layout.innerGap * 0.5,
          }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 10,
              background: accentColor,
              borderRadius: 100,
              padding: `14px ${layout.outerPadding * 0.45}px`,
              boxShadow: `0 0 40px ${av.glow}, 0 0 20px ${av.glow}`,
            }}>
              <span style={{ fontSize: layout.bodySize + 2, color: '#ffffff', fontFamily: FONT, fontWeight: '800' }}>
                {price}
              </span>
            </div>
          </div>
        )}
      </AbsoluteFill>

      <SceneCounter current={sceneIndex + 1} total={sceneTotal} />
      {audioPath && <Audio src={staticFile(audioPath)} />}
    </AbsoluteFill>
  );
};
