// agentforge-video/src/scenes/SceneHowItWorks.tsx
// Visual: FLOW DIAGRAM — GradientMesh background, glowing step nodes, pulsing rings, animated connectors
import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate, spring, AbsoluteFill, staticFile } from 'remotion';
import { Audio } from '@remotion/media';
import { FONT, MONO_FONT } from '../font';
import { NoiseOverlay } from '../shared/NoiseOverlay';
import { SceneCounter } from '../shared/SceneCounter';
import { useSceneLayout } from '../shared/useSceneLayout';
import { useVisualVariant } from '../shared/useVisualVariant';
import { VariantBackground } from '../shared/VariantBackground';
import { resolveEmoji } from '../shared/emojiMap';
import { CornerBrackets } from '../shared/SvgDecorations';
import { SceneBackground } from '../shared/SceneBackground';
import type { SceneHowItWorksProps, SharedSceneProps } from '../types';

export const SceneHowItWorks: React.FC<SceneHowItWorksProps & SharedSceneProps> = ({
  title, steps,
  accentColor, bgColor, showImage, audioPath, sceneIndex, sceneTotal, variantId,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames: dur } = useVideoConfig();
  const variant = useVisualVariant(variantId, accentColor);
  const av = variant.av;
  const layout = useSceneLayout();

  const CUE_TITLE = 0;
  const stepCues  = [dur * 0.15, dur * 0.38, dur * 0.60];

  const titleOp = interpolate(frame, [CUE_TITLE, CUE_TITLE + 18], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const titleY  = interpolate(spring({ frame, fps, config: { damping: 200 } }), [0, 1], [24, 0]);

  // Connector animations
  const connector1 = interpolate(spring({ frame: frame - stepCues[1], fps, config: { damping: 200 } }), [0, 1], [0, 1]);
  const connector2 = interpolate(spring({ frame: frame - stepCues[2], fps, config: { damping: 200 } }), [0, 1], [0, 1]);
  const connectors = [connector1, connector2];

  const displaySteps = steps.slice(0, 3);

  // Pulsing aura ring
  const pulse = 0.5 + Math.sin(frame * 0.11) * 0.5;

  const exitOp = interpolate(frame, [dur * 0.88, dur * 0.88 + 10], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{ backgroundColor: bgColor, overflow: 'hidden' }}>
      <SceneBackground showImage={showImage} sceneIndex={sceneIndex} />

      {/* Variant background */}
      <VariantBackground variant={variant} accentColor={accentColor} />
      <CornerBrackets color={accentColor} size={layout.isPortrait ? 16 : 24} offset={layout.isPortrait ? 28 : 40} startFrame={0} opacity={0.2} />

      <NoiseOverlay />

      <AbsoluteFill style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: `0 ${layout.outerPadding}px`,
        gap: layout.innerGap * 0.8,
        opacity: exitOp,
      }}>
        {/* Title */}
        <div style={{ opacity: titleOp, transform: `translateY(${titleY}px)`, textAlign: 'center' as const }}>
          <div style={{
            fontSize: layout.labelSize,
            color: accentColor,
            fontFamily: MONO_FONT,
            letterSpacing: '3px',
            textTransform: 'uppercase' as const,
            marginBottom: 10,
            textShadow: `0 0 16px ${av.glow}`,
          }}>
            ◈ HOW IT WORKS
          </div>
          <div style={{
            fontSize: layout.headingSize,
            fontWeight: '800',
            color: '#f1f5f9',
            fontFamily: FONT,
            letterSpacing: '-1.5px',
            textShadow: '0 2px 24px rgba(0,0,0,0.7)',
          }}>
            {title}
          </div>
        </div>

        {/* Steps */}
        <div style={{
          display: 'flex',
          flexDirection: layout.direction,
          alignItems: layout.isPortrait ? 'center' : 'flex-start',
          width: '100%',
          justifyContent: 'center',
          gap: layout.isPortrait ? layout.innerGap * 0.7 : 0,
        }}>
          {displaySteps.map((step, i) => {
            const cue = stepCues[i];
            const p   = spring({ frame: frame - cue, fps, config: { damping: 200 } });
            const y   = interpolate(p, [0, 1], [60, 0]);
            const op  = interpolate(frame - cue, [0, 18], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
            const circleSize = layout.isPortrait ? 72 : 90;
            const isActive = frame >= cue;
            const ringScale = isActive ? (1 + pulse * 0.18) : 1;
            const ringOp    = isActive ? pulse * 0.40 : 0;

            return (
              <React.Fragment key={i}>
                <div style={{
                  opacity: op, transform: `translateY(${y}px)`,
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14,
                  width: layout.isPortrait ? '90%' : undefined,
                  flex: layout.isPortrait ? undefined : 1,
                  padding: layout.isPortrait ? 0 : '0 12px',
                }}>
                  {/* Pulsing ring behind circle */}
                  <div style={{
                    position: 'relative' as const,
                    width: circleSize, height: circleSize,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {/* Outer pulsing ring */}
                    <div style={{
                      position: 'absolute' as const,
                      width: circleSize, height: circleSize,
                      borderRadius: '50%',
                      border: `2px solid ${accentColor}`,
                      transform: `scale(${ringScale})`,
                      opacity: ringOp,
                    }} />

                    {/* Step number circle */}
                    <div style={{
                      width: circleSize, height: circleSize,
                      borderRadius: '50%',
                      background: `radial-gradient(circle at 35% 35%, ${av.strong}, ${av.bg})`,
                      border: `2px solid ${av.strong}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      boxShadow: `0 0 32px ${av.glow}, 0 0 64px ${av.glow}`,
                    }}>
                      <span style={{
                        fontSize: layout.isPortrait ? 30 : 38,
                        fontFamily: MONO_FONT,
                        fontWeight: '800',
                        color: accentColor,
                        lineHeight: 1,
                        textShadow: `0 0 12px ${av.glow}`,
                      }}>
                        {String(step.number).padStart(2, '0')}
                      </span>
                    </div>
                  </div>

                  {/* Icon */}
                  <div style={{ fontSize: layout.isPortrait ? 32 : 40, lineHeight: 1 }}>{resolveEmoji(step.icon)}</div>

                  {/* Title */}
                  <div style={{
                    fontSize: layout.bodySize - 2,
                    fontWeight: '700',
                    color: '#f1f5f9',
                    fontFamily: FONT,
                    textAlign: 'center' as const,
                    lineHeight: 1.3,
                    textShadow: '0 1px 12px rgba(0,0,0,0.85)',
                  }}>
                    {step.title}
                  </div>

                  {/* Description */}
                  <div style={{
                    fontSize: layout.labelSize + 2,
                    color: 'rgba(148,163,184,0.75)',
                    fontFamily: FONT,
                    textAlign: 'center' as const,
                    lineHeight: 1.55,
                  }}>
                    {step.description}
                  </div>
                </div>

                {/* Animated connector */}
                {i < displaySteps.length - 1 && (
                  layout.isPortrait ? (
                    <div style={{
                      width: 2, height: 36,
                      background: `linear-gradient(to bottom, ${accentColor}, ${av.border})`,
                      transform: `scaleY(${connectors[i]})`,
                      transformOrigin: 'top',
                      boxShadow: `0 0 10px ${av.glow}`,
                    }} />
                  ) : (
                    <div style={{
                      width: 56, height: 2,
                      marginTop: 43,
                      flexShrink: 0,
                      background: `linear-gradient(90deg, ${accentColor}, ${av.border})`,
                      transform: `scaleX(${connectors[i]})`,
                      transformOrigin: 'left',
                      boxShadow: `0 0 10px ${av.glow}`,
                    }} />
                  )
                )}
              </React.Fragment>
            );
          })}
        </div>
      </AbsoluteFill>

      <SceneCounter current={sceneIndex + 1} total={sceneTotal} />
      {audioPath && <Audio src={staticFile(audioPath)} />}
    </AbsoluteFill>
  );
};
