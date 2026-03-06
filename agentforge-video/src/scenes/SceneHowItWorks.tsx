// agentforge-video/src/scenes/SceneHowItWorks.tsx
import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate, spring, AbsoluteFill, staticFile } from 'remotion';
import { Audio } from '@remotion/media';
import { FONT, DISPLAY_FONT } from '../font';
import { NoiseOverlay } from '../shared/NoiseOverlay';
import { SceneCounter } from '../shared/SceneCounter';
import { accentVariants } from '../shared/colorUtils';
import { useSceneLayout } from '../shared/useSceneLayout';
import type { SceneHowItWorksProps, SharedSceneProps } from '../types';

export const SceneHowItWorks: React.FC<SceneHowItWorksProps & SharedSceneProps> = ({
  title, steps,
  accentColor, bgColor, showImage, audioPath, sceneIndex, sceneTotal,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames: dur } = useVideoConfig();
  const av = accentVariants(accentColor);
  const layout = useSceneLayout();

  const CUE_TITLE = 0;
  const stepCues  = [dur * 0.18, dur * 0.38, dur * 0.58];

  const titleOp = interpolate(frame, [CUE_TITLE, CUE_TITLE + 20], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const titleY  = interpolate(spring({ frame, fps, config: { damping: 200 } }), [0, 1], [20, 0]);

  // Connector lines between steps
  const connector1W = interpolate(frame - stepCues[1], [0, 20], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const connector2W = interpolate(frame - stepCues[2], [0, 20], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const connectors  = [connector1W, connector2W];

  const displaySteps = steps.slice(0, 3);

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
      <AbsoluteFill style={{ background: `radial-gradient(ellipse at 50% 10%, rgba(10,22,40,0.8) 0%, ${bgColor} 55%)` }} />
      <NoiseOverlay />

      <AbsoluteFill style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: `0 ${layout.outerPadding}px`,
        gap: layout.innerGap,
      }}>
        {/* Title */}
        <div style={{ opacity: titleOp, transform: `translateY(${titleY}px)`, textAlign: 'center' as const }}>
          <div style={{ fontSize: layout.headingSize, fontWeight: '800', color: '#f1f5f9', fontFamily: FONT, letterSpacing: '-1.5px' }}>{title}</div>
        </div>

        {/* Steps — row in landscape, column in portrait */}
        <div style={{
          display: 'flex',
          flexDirection: layout.direction,
          alignItems: layout.isPortrait ? 'center' : 'flex-start',
          width: '100%',
          justifyContent: 'center',
          gap: layout.isPortrait ? layout.innerGap : 0,
        }}>
          {displaySteps.map((step, i) => {
            const cue = stepCues[i];
            const p   = spring({ frame: frame - cue, fps, config: { damping: 200 } });
            const y   = interpolate(p, [0, 1], [50, 0]);
            const op  = interpolate(frame - cue, [0, 18], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

            return (
              <React.Fragment key={i}>
                <div style={{
                  opacity: op, transform: `translateY(${y}px)`,
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16,
                  width: layout.isPortrait ? '100%' : 240,
                }}>
                  {/* Step number circle */}
                  <div style={{
                    width: layout.isPortrait ? 64 : 80,
                    height: layout.isPortrait ? 64 : 80,
                    borderRadius: '50%',
                    background: av.bg,
                    border: `2px solid ${av.strong}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: `0 0 24px ${av.glow}`,
                  }}>
                    <span style={{ fontSize: layout.isPortrait ? 28 : 36, fontFamily: DISPLAY_FONT, color: accentColor }}>{step.number}</span>
                  </div>
                  {/* Icon */}
                  <div style={{ fontSize: layout.isPortrait ? 28 : 36 }}>{step.icon}</div>
                  {/* Title */}
                  <div style={{ fontSize: layout.bodySize - 4, fontWeight: '700', color: '#f1f5f9', fontFamily: FONT, textAlign: 'center' as const, lineHeight: 1.3 }}>{step.title}</div>
                  {/* Description */}
                  <div style={{ fontSize: layout.labelSize + 2, color: 'rgba(148,163,184,0.7)', fontFamily: FONT, textAlign: 'center' as const, lineHeight: 1.55 }}>{step.description}</div>
                </div>

                {/* Connector between steps */}
                {i < displaySteps.length - 1 && (
                  layout.isPortrait
                    ? (
                      /* Portrait: vertical connector */
                      <div style={{
                        width: 2, height: 32,
                        background: `linear-gradient(to bottom, ${av.strong}, ${av.border})`,
                        transform: `scaleY(${connectors[i]})`,
                        transformOrigin: 'top',
                      }} />
                    ) : (
                      /* Landscape: horizontal connector */
                      <div style={{
                        flex: 1, height: 2, marginTop: 39,
                        background: `linear-gradient(90deg, ${av.strong}, ${av.border})`,
                        transform: `scaleX(${connectors[i]})`,
                        transformOrigin: 'left',
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
