// agentforge-video/src/scenes/SceneCTA.tsx
import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate, spring, AbsoluteFill, staticFile } from 'remotion';
import { Audio } from '@remotion/media';
import { FONT, DISPLAY_FONT, MONO_FONT } from '../font';
import { NoiseOverlay } from '../shared/NoiseOverlay';
import { SceneCounter } from '../shared/SceneCounter';
import { PulseRing } from '../shared/svg/PulseRing';
import { accentVariants } from '../shared/colorUtils';
import { useSceneLayout } from '../shared/useSceneLayout';
import type { SceneCTAProps, SharedSceneProps } from '../types';

export const SceneCTA: React.FC<SceneCTAProps & SharedSceneProps> = ({
  headline, accentLine, sub,
  accentColor, bgColor, showImage, brandName, ctaText, ctaUrl, audioPath, sceneIndex, sceneTotal,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames: dur } = useVideoConfig();
  const av = accentVariants(accentColor);
  const layout = useSceneLayout();

  const CUE_BRAND  = 0;
  const CUE_HEAD   = dur * 0.15;
  const CUE_ACCENT = dur * 0.32;
  const CUE_SUB    = dur * 0.48;
  const CUE_CTA    = dur * 0.58;
  const CUE_URL    = dur * 0.70;

  const brandOp = interpolate(frame, [CUE_BRAND, CUE_BRAND + 25], [0, 0.07], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  const headOp = interpolate(frame - CUE_HEAD, [0, 20], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const headY  = interpolate(spring({ frame: frame - CUE_HEAD, fps, config: { damping: 200 } }), [0, 1], [30, 0]);

  const accOp = interpolate(frame - CUE_ACCENT, [0, 20], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const accY  = interpolate(spring({ frame: frame - CUE_ACCENT, fps, config: { damping: 200 } }), [0, 1], [30, 0]);

  const subOp = interpolate(frame - CUE_SUB, [0, 18], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  const ctaP  = spring({ frame: frame - CUE_CTA, fps, config: { damping: 15 } });
  const ctaSc = interpolate(ctaP, [0, 1], [0.7, 1]);
  const ctaOp = interpolate(frame - CUE_CTA, [0, 10], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  // URL typewriter
  const urlLen = Math.floor(interpolate(frame - CUE_URL, [0, ctaUrl.length * 2.5], [0, ctaUrl.length], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }));

  return (
    <AbsoluteFill style={{ backgroundColor: bgColor, overflow: 'hidden' }}>
      {showImage && (
        <>
          {/* Scene background image */}
          <AbsoluteFill style={{ backgroundImage: `url(${staticFile(`images/scene_${sceneIndex}.png`)})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
          {/* Dark overlay */}
          <AbsoluteFill style={{ backgroundColor: 'rgba(0,0,0,0.62)' }} />
        </>
      )}
      {/* Full-bleed radial gradient */}
      <AbsoluteFill style={{ background: `radial-gradient(ellipse at 50% 50%, ${av.strong} 0%, transparent 60%)` }} />
      <AbsoluteFill style={{ background: `radial-gradient(ellipse at 50% 50%, rgba(5,13,26,0) 30%, ${bgColor} 70%)` }} />
      <PulseRing color={av.border} baseSize={600} minScale={0.9} maxScale={1.3} period={90} count={1} />
      <NoiseOverlay />

      {/* Ghost brand name background */}
      <AbsoluteFill style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
        <div style={{ fontSize: layout.isPortrait ? 120 : 340, color: '#f1f5f9', fontFamily: DISPLAY_FONT, opacity: brandOp, letterSpacing: '20px', textTransform: 'uppercase' as const, whiteSpace: 'nowrap' as const }}>
          {brandName}
        </div>
      </AbsoluteFill>

      <AbsoluteFill style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        gap: 16,
        padding: `0 ${layout.outerPadding}px`,
      }}>
        {/* Headline */}
        <div style={{ opacity: headOp, transform: `translateY(${headY}px)`, textAlign: 'center' as const }}>
          <div style={{ fontSize: layout.headingSize, fontWeight: '800', color: '#f1f5f9', fontFamily: FONT, lineHeight: 1.1, letterSpacing: '-2px' }}>
            {headline}
          </div>
        </div>

        {/* Accent line */}
        <div style={{ opacity: accOp, transform: `translateY(${accY}px)`, textAlign: 'center' as const }}>
          <div style={{ fontSize: layout.headingSize, fontWeight: '800', color: accentColor, fontFamily: FONT, lineHeight: 1.1, letterSpacing: '-2px' }}>
            {accentLine}
          </div>
        </div>

        {/* Sub */}
        <div style={{ opacity: subOp, marginTop: 8 }}>
          <div style={{ fontSize: layout.bodySize, color: 'rgba(148,163,184,0.88)', fontFamily: FONT, fontWeight: '400', textAlign: 'center' as const }}>
            {sub}
          </div>
        </div>

        {/* CTA button shape */}
        <div style={{ opacity: ctaOp, transform: `scale(${ctaSc})`, marginTop: 16 }}>
          <div style={{
            background: accentColor, borderRadius: 100, padding: '18px 52px',
            boxShadow: `0 0 40px ${av.glow}`,
          }}>
            <span style={{ fontSize: layout.bodySize, color: '#ffffff', fontFamily: FONT, fontWeight: '700', letterSpacing: '0.5px' }}>
              {ctaText}
            </span>
          </div>
        </div>

        {/* URL typewriter */}
        {frame >= CUE_URL && (
          <div style={{ marginTop: 8 }}>
            <span style={{ fontSize: layout.labelSize + 4, color: 'rgba(148,163,184,0.5)', fontFamily: MONO_FONT, letterSpacing: '2px' }}>
              {ctaUrl.slice(0, urlLen)}<span style={{ opacity: Math.sin(frame * 0.3) > 0 ? 0.5 : 0 }}>|</span>
            </span>
          </div>
        )}
      </AbsoluteFill>

      <SceneCounter current={sceneIndex + 1} total={sceneTotal} />
      {audioPath && <Audio src={staticFile(audioPath)} />}
    </AbsoluteFill>
  );
};
