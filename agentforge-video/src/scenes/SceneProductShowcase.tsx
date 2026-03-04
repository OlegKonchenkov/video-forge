// agentforge-video/src/scenes/SceneProductShowcase.tsx
import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate, spring, AbsoluteFill, Img, staticFile } from 'remotion';
import { Audio } from '@remotion/media';
import { FONT, DISPLAY_FONT } from '../font';
import { NoiseOverlay } from '../shared/NoiseOverlay';
import { SceneCounter } from '../shared/SceneCounter';
import { accentVariants } from '../shared/colorUtils';
import { useSceneLayout } from '../shared/useSceneLayout';
import type { SceneProductShowcaseProps, SharedSceneProps } from '../types';

export const SceneProductShowcase: React.FC<SceneProductShowcaseProps & SharedSceneProps> = ({
  productName, tagline, price,
  accentColor, audioPath, sceneIndex, sceneTotal,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames: dur } = useVideoConfig();
  const av = accentVariants(accentColor);
  const layout = useSceneLayout();

  const CUE_NAME  = 0;
  const CUE_TAG   = dur * 0.30;
  const CUE_PRICE = dur * 0.48;

  // Ken Burns: slow zoom from 1 → 1.08
  const kbScale = interpolate(frame, [0, dur], [1, 1.08], { extrapolateRight: 'clamp' });

  const nameP  = spring({ frame: frame - CUE_NAME, fps, config: { damping: 200 } });
  const nameSc = interpolate(nameP, [0, 1], [0.85, 1]);
  const nameOp = interpolate(frame - CUE_NAME, [0, 20], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  const tagOp = interpolate(frame - CUE_TAG, [0, 18], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const tagY  = interpolate(spring({ frame: frame - CUE_TAG, fps, config: { damping: 200 } }), [0, 1], [16, 0]);

  const priceOp = price ? interpolate(frame - CUE_PRICE, [0, 15], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }) : 0;
  const priceSc = price ? interpolate(spring({ frame: frame - CUE_PRICE, fps, config: { damping: 15 } }), [0, 1], [0.7, 1]) : 1;

  return (
    <AbsoluteFill style={{ backgroundColor: '#050d1a', overflow: 'hidden' }}>
      {/* Full-bleed product image with Ken Burns */}
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
        {/* Dark vignette over image */}
        <AbsoluteFill style={{ background: 'linear-gradient(to top, #050d1a 0%, rgba(5,13,26,0.6) 50%, rgba(5,13,26,0.2) 100%)' }} />
      </AbsoluteFill>

      <NoiseOverlay />

      {/* Content overlay at bottom */}
      <AbsoluteFill style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: `0 ${layout.outerPadding}px ${layout.outerPadding}px` }}>
        {/* Product name */}
        <div style={{ opacity: nameOp, transform: `scale(${nameSc})`, transformOrigin: 'left bottom' }}>
          <div style={{ fontSize: layout.displaySize, fontWeight: '800', color: '#f1f5f9', fontFamily: DISPLAY_FONT, letterSpacing: '2px', textTransform: 'uppercase' as const, lineHeight: 1 }}>
            {productName}
          </div>
        </div>

        {/* Accent line */}
        <div style={{ width: 60, height: 3, background: accentColor, margin: `${layout.innerGap * 0.4}px 0`, borderRadius: 2 }} />

        {/* Tagline */}
        <div style={{ opacity: tagOp, transform: `translateY(${tagY}px)` }}>
          <div style={{ fontSize: layout.bodySize + 2, color: 'rgba(241,245,249,0.85)', fontFamily: FONT, fontWeight: '400', lineHeight: 1.4 }}>
            {tagline}
          </div>
        </div>

        {/* Price badge */}
        {price && (
          <div style={{ opacity: priceOp, transform: `scale(${priceSc})`, transformOrigin: 'left bottom', marginTop: layout.innerGap * 0.6 }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center',
              background: accentColor, borderRadius: 100, padding: `12px ${layout.outerPadding * 0.4}px`,
              boxShadow: `0 0 32px ${av.glow}`,
            }}>
              <span style={{ fontSize: layout.bodySize, color: '#ffffff', fontFamily: FONT, fontWeight: '700' }}>{price}</span>
            </div>
          </div>
        )}
      </AbsoluteFill>

      <SceneCounter current={sceneIndex + 1} total={sceneTotal} />
      {audioPath && <Audio src={staticFile(audioPath)} />}
    </AbsoluteFill>
  );
};
