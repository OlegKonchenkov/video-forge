// agentforge-video/src/calculateMetadata.ts
import { CalculateMetadataFunction, staticFile } from 'remotion';
import { getAudioDurationInSeconds } from '@remotion/media-utils';
import { FPS, TRANSITION_FRAMES } from './constants';
import type { AgentForgeAdProps } from './types';

const PADDING_FRAMES = 25;

export const calculateMetadata: CalculateMetadataFunction<AgentForgeAdProps> = async ({ props }) => {
  const sceneCount = props.scenes.length;
  const files = Array.from({ length: sceneCount }, (_, i) => `audio/voiceover/scene_${i}.mp3`);

  const durations = await Promise.all(
    files.map((f) => getAudioDurationInSeconds(staticFile(f)))
  );

  const sceneDurations = durations.map((d: number) => Math.ceil(d * FPS) + PADDING_FRAMES);
  const totalFrames =
    sceneDurations.reduce((sum: number, d: number) => sum + d, 0) -
    (sceneCount - 1) * TRANSITION_FRAMES;

  return {
    durationInFrames: Math.max(totalFrames, 30),
    props: { ...props, sceneDurations },
  };
};
