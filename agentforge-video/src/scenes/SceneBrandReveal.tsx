// agentforge-video/src/scenes/SceneBrandReveal.tsx
// LUXURY REVEAL — gradient mesh + kinetic slide-up brand name + shimmer sweep
import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate, spring, AbsoluteFill, staticFile } from 'remotion';
import { Audio } from '@remotion/media';
import { FONT, MONO_FONT } from '../font';
import { NoiseOverlay } from '../shared/NoiseOverlay';
import { SceneCounter } from '../shared/SceneCounter';
import { accentVariants } from '../shared/colorUtils';
import { useSceneLayout } from '../shared/useSceneLayout';
import { GradientMesh } from '../shared/GradientMesh';
import { KineticText } from '../shared/KineticText';
import { ShimmerOverlay } from '../shared/ShimmerOverlay';
import { GeometricShapes } from '../shared/GeometricShapes';
import type { SceneBrandRevealProps, SharedSceneProps } from '../types';

export const SceneBrandReveal: React.FC<SceneBrandRevealProps & SharedSceneProps> = ({
  accentColor, bgColor, showImage, audioPath, sceneIndex, sceneTotal,
  brandName, tagline, ctaUrl,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames: dur } = useVideoConfig();
  const av = accentVariants(accentColor);
  const layout = useSceneLayout();

  const CUE_BADGE    = dur * 0.05;
  const CUE_BRAND    = dur * 0.14;
  const CUE_LINE     = dur * 0.38;
  const CUE_TAGLINE  = dur * 0.48;
  const CUE_URL      = dur * 0.63;

  const displayUrl = (() => {
    try { return new URL(ctaUrl.startsWith('http') ? ctaUrl : `https://${ctaUrl}`).hostname; }
    catch { return ctaUrl; }
  })();

  const exitOp   = interpolate(frame, [dur * 0.88, dur * 0.88 + 12], [1, 0.3], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const badgeOp  = interpolate(frame - CUE_BADGE, [0, 16], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const lineScale = interpolate(spring({ frame: frame - CUE_LINE, fps, config: { damping: 200 } }), [0, 1], [0, 1]);
  const tagOp    = interpolate(frame - CUE_TAGLINE, [0, 18], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const tagY     = interpolate(spring({ frame: frame - CUE_TAGLINE, fps, config: { damping: 200 } }), [0, 1], [24, 0]);
  const urlOp    = interpolate(frame - CUE_URL, [0, 16], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{ backgroundColor: bgColor, overflow: 'hidden' }}>
      {showImage && (
        <>
          <AbsoluteFill style={{ backgroundImage: `url(${staticFile(`images/scene_${sceneIndex}.png`)})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
          <AbsoluteFill style={{ backgroundColor: 'rgba(0,0,0,0.78)' }} />
        </>
      )}

      {/* Animated gradient mesh — centrepiece */}
      <GradientMesh colors={[accentColor, accentColor, bgColor]} speed={0.8} opacity={0.42} />
      {/* Subtle circles */}
      <GeometricShapes color={accentColor} opacity={0.06} count={5} style="circles" />
      <NoiseOverlay />

      <AbsoluteFill style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: `0 ${layout.outerPadding}px`, textAlign: 'center',
        opacity: exitOp, gap: 26,
      }}>
        {/* Introducing badge */}
        <div style={{ opacity: badgeOp }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 10,
            background: av.bg, border: `1px solid ${av.border}`,
            borderRadius: 100, padding: '8px 24px',
          }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: accentColor, boxShadow: `0 0 8px ${accentColor}` }} />
            <span style={{ fontSize: layout.labelSize, color: accentColor, fontFamily: MONO_FONT, fontWeight: '700', letterSpacing: '3px', textTransform: 'uppercase' as const }}>
              Introducing
            </span>
          </div>
        </div>

        {/* Brand name — kinetic slide-up with shimmer */}
        <div style={{ position: 'relative' as const, display: 'inline-block', overflow: 'hidden' }}>
          <KineticText
            text={brandName}
            startFrame={CUE_BRAND}
            fps={fps}
            type="slide-up"
            staggerFrames={4}
            style={{
              fontSize: layout.isPortrait ? layout.headingSize + 8 : layout.displaySize + 14,
              fontWeight: '900' as const,
              color: '#ffffff',
              fontFamily: FONT,
              letterSpacing: '-3px',
              lineHeight: 1.0,
              textShadow: `0 4px 40px rgba(0,0,0,0.9), 0 0 80px ${av.glow}`,
            }}
          />
          <ShimmerOverlay color="#ffffff" periodFrames={80} opacity={0.55} />
        </div>

        {/* Accent divider */}
        <div style={{
          width: '100%', maxWidth: 340, height: 2,
          background: `linear-gradient(90deg, transparent, ${accentColor}, transparent)`,
          transform: `scaleX(${lineScale})`,
          boxShadow: `0 0 14px ${accentColor}`,
        }} />

        {/* Tagline */}
        <div style={{ opacity: tagOp, transform: `translateY(${tagY}px)` }}>
          <div style={{
            fontSize: layout.isPortrait ? layout.bodySize + 2 : layout.headingSize - 10,
            color: 'rgba(226,232,240,0.90)',
            fontFamily: FONT, fontWeight: '400', lineHeight: 1.45, maxWidth: 620,
            textShadow: '0 2px 16px rgba(0,0,0,0.8)',
          }}>
            {tagline}
          </div>
        </div>

        {/* Domain */}
        <div style={{ opacity: urlOp }}>
          <div style={{
            fontSize: layout.labelSize + 1, color: accentColor,
            fontFamily: MONO_FONT, fontWeight: '600', letterSpacing: '1.5px',
            textShadow: `0 0 16px ${av.glow}`,
          }}>
            {displayUrl}
          </div>
        </div>
      </AbsoluteFill>

      <SceneCounter current={sceneIndex + 1} total={sceneTotal} />
      {audioPath && <Audio src={staticFile(audioPath)} />}
    </AbsoluteFill>
  );
};
