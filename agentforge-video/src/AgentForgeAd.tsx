// agentforge-video/src/AgentForgeAd.tsx
import React from 'react';
import { AbsoluteFill, staticFile } from 'remotion';
import { Audio } from '@remotion/media';
import { TransitionSeries, linearTiming, springTiming } from '@remotion/transitions';
import { fade } from '@remotion/transitions/fade';
import { slide } from '@remotion/transitions/slide';
import { wipe } from '@remotion/transitions/wipe';
import { clockWipe } from '@remotion/transitions/clock-wipe';
import { TRANSITION_FRAMES, WIDTH, HEIGHT } from './constants';
import type { AgentForgeAdProps } from './types';
import { Scene1Pain } from './scenes/Scene1Pain';
import { Scene2Chaos } from './scenes/Scene2Chaos';
import { Scene3Cost } from './scenes/Scene3Cost';
import { Scene4Logo } from './scenes/Scene4Logo';
import { Scene5Solution } from './scenes/Scene5Solution';
import { Scene6Stats } from './scenes/Scene6Stats';
import { Scene7CTA } from './scenes/Scene7CTA';

const DEFAULT_DURATIONS = [210, 270, 180, 90, 360, 330, 240];

export const AgentForgeAd: React.FC<AgentForgeAdProps> = ({
  sceneDurations = DEFAULT_DURATIONS,
  brandName,
  tagline,
  ctaText,
  ctaUrl,
  scenes,
}) => {
  const [s1, s2, s3, s4, s5, s6, s7] = sceneDurations;
  const tf = TRANSITION_FRAMES;
  const totalFrames = s1 + s2 + s3 + s4 + s5 + s6 + s7 - 6 * tf;

  return (
    <AbsoluteFill>
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
        <TransitionSeries.Sequence durationInFrames={s1}>
          <Scene1Pain {...scenes[0]} />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={slide({ direction: 'from-right' })}
          timing={linearTiming({ durationInFrames: tf })}
        />

        <TransitionSeries.Sequence durationInFrames={s2}>
          <Scene2Chaos {...scenes[1]} />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={wipe({ direction: 'from-left' })}
          timing={linearTiming({ durationInFrames: tf })}
        />

        <TransitionSeries.Sequence durationInFrames={s3}>
          <Scene3Cost {...scenes[2]} />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={fade()}
          timing={springTiming({ config: { damping: 200 }, durationInFrames: tf })}
        />

        <TransitionSeries.Sequence durationInFrames={s4}>
          <Scene4Logo brandName={brandName} tagline={tagline} />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={slide({ direction: 'from-bottom' })}
          timing={springTiming({ config: { damping: 200 }, durationInFrames: tf })}
        />

        <TransitionSeries.Sequence durationInFrames={s5}>
          <Scene5Solution {...scenes[4]} brandName={brandName} />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={clockWipe({ width: WIDTH, height: HEIGHT })}
          timing={linearTiming({ durationInFrames: tf })}
        />

        <TransitionSeries.Sequence durationInFrames={s6}>
          <Scene6Stats {...scenes[5]} />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={wipe({ direction: 'from-right' })}
          timing={linearTiming({ durationInFrames: tf })}
        />

        <TransitionSeries.Sequence durationInFrames={s7}>
          <Scene7CTA {...scenes[6]} brandName={brandName} ctaText={ctaText} ctaUrl={ctaUrl} />
        </TransitionSeries.Sequence>
      </TransitionSeries>
    </AbsoluteFill>
  );
};
