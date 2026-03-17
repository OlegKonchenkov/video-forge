// agentforge-video/src/AgentForgeAd.tsx
import React from 'react';
import { AbsoluteFill, staticFile, useVideoConfig } from 'remotion';
import { Audio } from '@remotion/media';
import { TransitionSeries, linearTiming, type TransitionPresentation } from '@remotion/transitions';
import { fade }      from '@remotion/transitions/fade';
import { slide }     from '@remotion/transitions/slide';
import { wipe }      from '@remotion/transitions/wipe';
import { clockWipe } from '@remotion/transitions/clock-wipe';
import { flip }      from '@remotion/transitions/flip';
import { TRANSITION_FRAMES } from './constants';
import { SCENE_REGISTRY } from './sceneRegistry';
import type { AgentForgeAdProps, SharedSceneProps } from './types';

export const AgentForgeAd: React.FC<AgentForgeAdProps> = ({
  scenes,
  sceneDurations,
  brandName,
  tagline,
  ctaText,
  ctaUrl,
  accentColor,
  bgColor,
  surfaceColor,
  hasVoiceover,
}) => {
  // Must be inside component so useVideoConfig() receives live width/height from calculateMetadata
  const { width, height } = useVideoConfig();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const TRANSITIONS: TransitionPresentation<any>[] = [
    slide({ direction: 'from-right' }),
    wipe({ direction: 'from-left' }),
    fade(),
    slide({ direction: 'from-bottom' }),
    clockWipe({ width, height }),
    flip(),
  ];

  const tf = TRANSITION_FRAMES;
  const totalFrames = sceneDurations.reduce((s, d) => s + d, 0) - (scenes.length - 1) * tf;

  return (
    <AbsoluteFill>
      {/* Background music — always present */}
      <Audio
        src={staticFile('audio/music/background.mp3')}
        volume={(f) => {
          const fadeIn  = Math.min(f / 60, 1);
          const fadeOut = Math.min((totalFrames - f) / 60, 1);
          return Math.min(fadeIn, fadeOut) * 0.12;
        }}
        loop
      />

      <TransitionSeries>
        {scenes.map((scene, i) => {
          const Component = SCENE_REGISTRY[scene.type];
          if (!Component) {
            console.warn(`Unknown scene type: ${scene.type}`);
            return null;
          }

          const shared: SharedSceneProps = {
            accentColor,
            bgColor:      bgColor      ?? '#050d1a',
            surfaceColor: surfaceColor ?? '#0a1628',
            showImage:    scene.showImage ?? true,
            brandName,
            tagline,
            ctaText,
            ctaUrl,
            audioPath:    hasVoiceover ? `audio/voiceover/scene_${i}.mp3` : '',
            sceneIndex:   i,
            sceneTotal:   scenes.length,
            variantId:    scene.variantId ?? 0,
          };

          return (
            <React.Fragment key={i}>
              <TransitionSeries.Sequence durationInFrames={sceneDurations[i] ?? 150}>
                <Component {...(scene.props as any)} {...shared} />
              </TransitionSeries.Sequence>
              {i < scenes.length - 1 && (
                <TransitionSeries.Transition
                  presentation={TRANSITIONS[i % TRANSITIONS.length]}
                  timing={linearTiming({ durationInFrames: tf })}
                />
              )}
            </React.Fragment>
          );
        })}
      </TransitionSeries>

      {/* NOTE: LightLeak removed — requires WebGL which is unavailable on headless VPS */}
    </AbsoluteFill>
  );
};
