// agentforge-video/src/scenes/SceneBrandReveal.tsx
import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate, spring, AbsoluteFill, staticFile } from 'remotion';
import { Audio } from '@remotion/media';
import { FONT, DISPLAY_FONT, MONO_FONT } from '../font';
import { NoiseOverlay } from '../shared/NoiseOverlay';
import { SceneCounter } from '../shared/SceneCounter';
import { accentVariants } from '../shared/colorUtils';
import { useSceneLayout } from '../shared/useSceneLayout';
import type { SceneBrandRevealProps, SharedSceneProps } from '../types';

export const SceneBrandReveal: React.FC<SceneBrandRevealProps & SharedSceneProps> = ({
  accentColor, bgColor, showImage, brandName, tagline, audioPath, sceneIndex, sceneTotal,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames: dur } = useVideoConfig();
  const av = accentVariants(accentColor);
  const layout = useSceneLayout();

  const CUE_NAME    = 0;
  const CUE_TAGLINE = dur * 0.40;
  const CUE_LINE    = dur * 0.55;

  // Brand name: clip-path reveal left → right
  const revealProgress = spring({ frame: frame - CUE_NAME, fps, config: { damping: 200 }, durationInFrames: 45 });
  const clipW = interpolate(revealProgress, [0, 1], [0, 100]);

  // Pulse rings
  const ring1Scale = interpolate(frame % 80, [0, 80], [0.8, 2.2], { extrapolateRight: 'clamp' });
  const ring1Op    = interpolate(frame % 80, [0, 50, 80], [0.5, 0.15, 0]);

  // Tagline typewriter
  const charCount = Math.floor(interpolate(frame - CUE_TAGLINE, [0, tagline.length * 3], [0, tagline.length], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }));

  // Accent line
  const lineW = interpolate(spring({ frame: frame - CUE_LINE, fps, config: { damping: 200 } }), [0, 1], [0, Math.round(layout.maxContentWidth * 0.25)]);

  // Brand name font — scales with canvas, shorter names get bigger
  const brandFontSize = Math.max(layout.headingSize, Math.round(layout.displaySize * 1.8) - brandName.length * 3);

  return (
    <AbsoluteFill style={{ backgroundColor: bgColor, overflow: 'hidden' }}>
      {showImage && (
        <>
          {/* Scene background image */}
          <AbsoluteFill style={{ backgroundImage: `url(${staticFile(`images/scene_${sceneIndex}.png`)})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
          {/* Dark overlay */}
          <AbsoluteFill style={{ backgroundColor: 'rgba(0,0,0,0.50)' }} />
        </>
      )}
      {/* Radial glow */}
      <AbsoluteFill style={{ background: `radial-gradient(ellipse at 50% 50%, ${av.bg} 0%, transparent 65%)` }} />
      {/* Pulse rings */}
      {[ring1Scale, ring1Scale * 1.3].map((scale, i) => (
        <AbsoluteFill key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
          <div style={{
            width: 400, height: 400, borderRadius: '50%',
            border: `1px solid ${av.border}`,
            transform: `scale(${scale})`,
            opacity: ring1Op * (i === 0 ? 1 : 0.5),
          }} />
        </AbsoluteFill>
      ))}
      <NoiseOverlay />

      <AbsoluteFill style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 18 }}>
        {/* Brand name with clip reveal */}
        <div style={{ overflow: 'hidden', position: 'relative' as const }}>
          <div style={{
            fontSize: brandFontSize,
            fontFamily: DISPLAY_FONT,
            color: '#f1f5f9',
            letterSpacing: '6px',
            textTransform: 'uppercase' as const,
            clipPath: `inset(0 ${100 - clipW}% 0 0)`,
          }}>
            {brandName}
          </div>
        </div>

        {/* Accent line */}
        <div style={{ width: lineW, height: 2, background: `linear-gradient(90deg, transparent, ${accentColor}, transparent)` }} />

        {/* Tagline typewriter */}
        {frame >= CUE_TAGLINE && (
          <div style={{ fontSize: layout.bodySize, color: 'rgba(148,163,184,0.75)', fontFamily: MONO_FONT, letterSpacing: '4px', textTransform: 'uppercase' as const }}>
            {tagline.slice(0, charCount)}
            <span style={{ opacity: Math.sin(frame * 0.3) > 0 ? 0.7 : 0 }}>|</span>
          </div>
        )}
      </AbsoluteFill>

      <SceneCounter current={sceneIndex + 1} total={sceneTotal} />
      {audioPath && <Audio src={staticFile(audioPath)} />}
    </AbsoluteFill>
  );
};
