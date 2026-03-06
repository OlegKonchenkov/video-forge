// agentforge-video/src/scenes/SceneCTA.tsx
// NEON PULSE — hexagonal geometry + gradient mesh + shimmer button + pulsing glow
import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate, spring, AbsoluteFill, staticFile } from 'remotion';
import { Audio } from '@remotion/media';
import { FONT, MONO_FONT } from '../font';
import { NoiseOverlay } from '../shared/NoiseOverlay';
import { SceneCounter } from '../shared/SceneCounter';
import { WordByWord } from '../shared/WordByWord';
import { accentVariants } from '../shared/colorUtils';
import { useSceneLayout } from '../shared/useSceneLayout';
import { GeometricShapes } from '../shared/GeometricShapes';
import { GradientMesh } from '../shared/GradientMesh';
import { ShimmerOverlay } from '../shared/ShimmerOverlay';
import type { SceneCTAProps, SharedSceneProps } from '../types';

export const SceneCTA: React.FC<SceneCTAProps & SharedSceneProps> = ({
  headline, accentLine, sub,
  accentColor, bgColor, showImage, audioPath, sceneIndex, sceneTotal,
  brandName, ctaText, ctaUrl,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames: dur } = useVideoConfig();
  const av = accentVariants(accentColor);
  const layout = useSceneLayout();

  const CUE_HEAD   = dur * 0.06;
  const CUE_ACCENT = dur * 0.28;
  const CUE_SUB    = dur * 0.42;
  const CUE_BTN    = dur * 0.54;
  const CUE_URL    = dur * 0.66;

  const exitOp = interpolate(frame, [dur * 0.88, dur * 0.88 + 12], [1, 0.3], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  // Button pulsing glow
  const glowPulse = frame > CUE_BTN ? 0.28 + Math.sin((frame - CUE_BTN) * 0.13) * 0.18 : 0;

  const btnP  = spring({ frame: frame - CUE_BTN, fps, config: { damping: 130, stiffness: 200 } });
  const btnSc = interpolate(btnP, [0, 1], [0.65, 1]);
  const btnOp = interpolate(frame - CUE_BTN, [0, 12], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  const accP  = spring({ frame: frame - CUE_ACCENT, fps, config: { damping: 200 } });
  const accY  = interpolate(accP, [0, 1], [30, 0]);
  const accOp = interpolate(frame - CUE_ACCENT, [0, 14], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  const subOp = interpolate(frame - CUE_SUB, [0, 16], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const subY  = interpolate(spring({ frame: frame - CUE_SUB, fps, config: { damping: 200 } }), [0, 1], [20, 0]);

  const urlOp = interpolate(frame - CUE_URL, [0, 16], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  const displayUrl = (() => {
    try { return new URL(ctaUrl.startsWith('http') ? ctaUrl : `https://${ctaUrl}`).hostname; }
    catch { return ctaUrl; }
  })();

  const ghostOp = interpolate(frame, [CUE_HEAD, CUE_HEAD + 25], [0, 0.04], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{ backgroundColor: bgColor, overflow: 'hidden' }}>
      {showImage && (
        <>
          <AbsoluteFill style={{ backgroundImage: `url(${staticFile(`images/scene_${sceneIndex}.png`)})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
          <AbsoluteFill style={{ backgroundColor: 'rgba(0,0,0,0.80)' }} />
        </>
      )}

      {/* Hexagonal geometry background */}
      <GeometricShapes color={accentColor} opacity={0.07} count={9} style="hexagons" />
      {/* Gradient mesh for depth */}
      <GradientMesh colors={[accentColor, accentColor, bgColor]} speed={0.6} opacity={0.32} />
      <NoiseOverlay />

      {/* Ghost brand watermark */}
      <AbsoluteFill style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
        <div style={{ fontSize: layout.isPortrait ? 120 : 340, color: '#f1f5f9', fontFamily: FONT, opacity: ghostOp, letterSpacing: '20px', textTransform: 'uppercase' as const, whiteSpace: 'nowrap' as const, fontWeight: '900' }}>
          {brandName}
        </div>
      </AbsoluteFill>

      <AbsoluteFill style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: `0 ${layout.outerPadding}px`, textAlign: 'center',
        gap: layout.isPortrait ? 24 : 28, opacity: exitOp,
      }}>
        {/* Headline — word by word */}
        <WordByWord
          text={headline}
          frame={frame} fps={fps} startFrame={CUE_HEAD} staggerFrames={3}
          style={{ flexWrap: 'wrap', gap: '0.18em', justifyContent: 'center', overflow: 'hidden' }}
          wordStyle={{
            fontSize: layout.isPortrait ? layout.headingSize - 4 : layout.displaySize - 12,
            fontWeight: '800' as const,
            color: '#f1f5f9',
            fontFamily: FONT,
            lineHeight: 1.08,
            letterSpacing: '-2px',
            textShadow: '0 2px 24px rgba(0,0,0,0.9)',
          }}
        />

        {/* Accent emphasis line */}
        <div style={{ opacity: accOp, transform: `translateY(${accY}px)` }}>
          <div style={{
            fontSize: layout.isPortrait ? layout.headingSize - 2 : layout.displaySize - 6,
            fontWeight: '900' as const, color: accentColor, fontFamily: FONT,
            lineHeight: 1.0, letterSpacing: '-2px',
            textShadow: `0 0 50px ${accentColor}, 0 2px 20px rgba(0,0,0,0.8)`,
          }}>
            {accentLine}
          </div>
        </div>

        {/* Sub text */}
        <div style={{ opacity: subOp, transform: `translateY(${subY}px)` }}>
          <div style={{
            fontSize: layout.bodySize, color: 'rgba(148,163,184,0.88)', fontFamily: FONT,
            fontWeight: '400', lineHeight: 1.55, maxWidth: 560,
            textShadow: '0 1px 12px rgba(0,0,0,0.85)',
          }}>
            {sub}
          </div>
        </div>

        {/* CTA Button with shimmer */}
        <div style={{ opacity: btnOp, transform: `scale(${btnSc})`, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <div style={{
            position: 'relative' as const, display: 'inline-block',
            background: accentColor, borderRadius: 14,
            padding: layout.isPortrait ? '22px 52px' : '26px 68px',
            boxShadow: `0 0 ${40 + glowPulse * 60}px ${accentColor}, 0 8px 32px rgba(0,0,0,0.5)`,
            overflow: 'hidden',
          }}>
            <span style={{
              fontSize: layout.isPortrait ? layout.bodySize + 2 : layout.headingSize - 10,
              fontWeight: '800' as const, color: '#ffffff', fontFamily: FONT,
              letterSpacing: '-0.5px',
              textShadow: '0 2px 8px rgba(0,0,0,0.4)',
              position: 'relative' as const, zIndex: 1,
            }}>
              {ctaText}
            </span>
            <ShimmerOverlay color="#ffffff" periodFrames={70} opacity={0.5} />
          </div>

          {/* Domain */}
          <div style={{ opacity: urlOp }}>
            <div style={{ fontSize: layout.labelSize, color: 'rgba(148,163,184,0.7)', fontFamily: MONO_FONT, fontWeight: '500', letterSpacing: '1px' }}>
              {displayUrl}
            </div>
          </div>
        </div>
      </AbsoluteFill>

      <SceneCounter current={sceneIndex + 1} total={sceneTotal} />
      {audioPath && <Audio src={staticFile(audioPath)} />}
    </AbsoluteFill>
  );
};
