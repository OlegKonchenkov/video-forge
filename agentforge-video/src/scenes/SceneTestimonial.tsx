// agentforge-video/src/scenes/SceneTestimonial.tsx
// TESTIMONIAL CARD — geometric circles + centered glassmorphic quote card + stars + shimmer author
import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate, spring, AbsoluteFill, staticFile } from 'remotion';
import { Audio } from '@remotion/media';
import { FONT, MONO_FONT } from '../font';
import { NoiseOverlay } from '../shared/NoiseOverlay';
import { SceneCounter } from '../shared/SceneCounter';
import { WordByWord } from '../shared/WordByWord';
import { useSceneLayout } from '../shared/useSceneLayout';
import { ShimmerOverlay } from '../shared/ShimmerOverlay';
import { useVisualVariant } from '../shared/useVisualVariant';
import { VariantBackground } from '../shared/VariantBackground';
import { FloatingOrbs } from '../shared/SvgDecorations';
import { SceneBackground } from '../shared/SceneBackground';
import type { SceneTestimonialProps, SharedSceneProps } from '../types';

export const SceneTestimonial: React.FC<SceneTestimonialProps & SharedSceneProps> = ({
  quote, name, role, company,
  accentColor, bgColor, showImage, audioPath, sceneIndex, sceneTotal, variantId,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames: dur } = useVideoConfig();
  const variant = useVisualVariant(variantId, accentColor);
  const av = variant.av;
  const layout = useSceneLayout();

  const CUE_QUOTE  = dur * 0.06;
  const CUE_STARS  = dur * 0.50;
  const CUE_AUTHOR = dur * 0.62;

  const cardP  = spring({ frame, fps, config: { damping: 200 } });
  const cardSc = interpolate(cardP, [0, 1], [0.9, 1]);
  const cardOp = interpolate(frame, [0, 16], [0, 1], { extrapolateRight: 'clamp' });

  const starsOp = interpolate(frame - CUE_STARS, [0, 18], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  const authorP  = spring({ frame: frame - CUE_AUTHOR, fps, config: { damping: 200 } });
  const authorY  = interpolate(authorP, [0, 1], [24, 0]);
  const authorOp = interpolate(frame - CUE_AUTHOR, [0, 18], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  const exitOp = interpolate(frame, [dur * 0.88, dur * 0.88 + 12], [1, 0.3], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  const displayCompany = company ? ` · ${company}` : '';

  return (
    <AbsoluteFill style={{ backgroundColor: bgColor, overflow: 'hidden' }}>
      <SceneBackground showImage={showImage} sceneIndex={sceneIndex} overlayOpacity={0.78} />

      {/* Variant background */}
      <VariantBackground variant={variant} accentColor={accentColor} />
      <FloatingOrbs color={av.glow} count={3} opacity={0.08} speed={0.010} />
      {/* Left accent glow */}
      <AbsoluteFill style={{ background: `radial-gradient(ellipse at 25% 50%, ${av.glow} 0%, transparent 55%)` }} />
      <NoiseOverlay />

      <AbsoluteFill style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: `0 ${layout.outerPadding + 30}px`,
        gap: layout.innerGap,
        opacity: exitOp,
      }}>
        {/* Glassmorphic quote card */}
        <div style={{
          opacity: cardOp, transform: `scale(${cardSc})`,
          position: 'relative' as const,
          background: 'rgba(255,255,255,0.10)',
          backdropFilter: 'blur(12px)',
          border: `1px solid ${av.border}`,
          borderTop: `2px solid ${accentColor}`,
          borderRadius: 24,
          padding: layout.isPortrait ? '40px 32px' : '52px 64px',
          maxWidth: layout.maxContentWidth,
          width: '100%',
          overflow: 'hidden',
        }}>
          {/* Large decorative quote mark */}
          <div style={{
            position: 'absolute' as const, top: -10, left: layout.isPortrait ? 24 : 40,
            fontSize: layout.isPortrait ? 160 : 240,
            fontFamily: FONT, color: accentColor, opacity: 0.10,
            lineHeight: 1, pointerEvents: 'none', fontWeight: '900',
          }}>
            "
          </div>

          {/* Stars */}
          <div style={{ opacity: starsOp, display: 'flex', justifyContent: 'center', gap: 6, marginBottom: layout.isPortrait ? 20 : 24 }}>
            {Array.from({ length: 5 }, (_, i) => {
              const starP = spring({ frame: frame - CUE_STARS - i * 4, fps, config: { damping: 200, stiffness: 300 } });
              const starSc = interpolate(starP, [0, 1], [0.3, 1]);
              return (
                <span key={i} style={{
                  fontSize: layout.isPortrait ? 24 : 30,
                  transform: `scale(${starSc})`,
                  display: 'inline-block',
                  filter: `drop-shadow(0 0 6px ${accentColor})`,
                }}>⭐</span>
              );
            })}
          </div>

          {/* Quote text — word by word */}
          <div style={{ textAlign: 'center' as const, position: 'relative' as const, zIndex: 1 }}>
            <WordByWord
              text={quote}
              frame={frame} fps={fps} startFrame={CUE_QUOTE} staggerFrames={3}
              style={{ flexWrap: 'wrap', justifyContent: 'center' }}
              wordStyle={{
                fontSize: layout.headingSize - 8,
                fontWeight: '500',
                color: '#ffffff',
                fontFamily: FONT,
                lineHeight: 1.5,
                letterSpacing: '-0.3px',
                textShadow: '0 2px 20px rgba(0,0,0,0.7)',
              }}
            />
          </div>
          <ShimmerOverlay color={accentColor} periodFrames={110} opacity={0.15} />
        </div>

        {/* Author badge */}
        <div style={{ opacity: authorOp, transform: `translateY(${authorY}px)`, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 56, height: 2, background: `linear-gradient(90deg, transparent, ${accentColor}, transparent)` }} />
          <div style={{ fontSize: layout.bodySize, color: accentColor, fontFamily: FONT, fontWeight: '700', letterSpacing: '0.3px', textShadow: '0 1px 12px rgba(0,0,0,0.85)' }}>
            {name}
          </div>
          <div style={{ fontSize: layout.labelSize + 2, color: 'rgba(148,163,184,0.80)', fontFamily: MONO_FONT, letterSpacing: '1.5px', textTransform: 'uppercase' as const }}>
            {role}{displayCompany}
          </div>
        </div>
      </AbsoluteFill>

      <SceneCounter current={sceneIndex + 1} total={sceneTotal} />
      {audioPath && <Audio src={staticFile(audioPath)} />}
    </AbsoluteFill>
  );
};
