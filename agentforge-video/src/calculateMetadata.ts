// agentforge-video/src/calculateMetadata.ts
import { CalculateMetadataFunction, staticFile } from 'remotion';
import { getAudioDurationInSeconds } from '@remotion/media-utils';
import { FPS, TRANSITION_FRAMES } from './constants';
import type { AgentForgeAdProps } from './types';

const PADDING_FRAMES  = 25;
const FALLBACK_FRAMES = 180; // 6 s @ 30 fps — used when hasVoiceover=false

export const calculateMetadata: CalculateMetadataFunction<AgentForgeAdProps> = async ({ props }) => {
  const sceneCount = props.scenes.length;

  let sceneDurations: number[];

  if (props.hasVoiceover) {
    const files = Array.from({ length: sceneCount }, (_, i) => `audio/voiceover/scene_${i}.mp3`);
    const durations = await Promise.all(
      files.map((f) => getAudioDurationInSeconds(staticFile(f)))
    );
    sceneDurations = durations.map((d: number) => Math.ceil(d * FPS) + PADDING_FRAMES);
  } else {
    sceneDurations = Array(sceneCount).fill(FALLBACK_FRAMES);
  }

  const totalFrames =
    sceneDurations.reduce((sum: number, d: number) => sum + d, 0) -
    (sceneCount - 1) * TRANSITION_FRAMES;

  // Dynamic canvas size from aspectRatio prop
  const isPortrait = props.aspectRatio === '9:16';
  const width  = isPortrait ? 1080 : 1920;
  const height = isPortrait ? 1920 : 1080;

  return {
    durationInFrames: Math.max(totalFrames, 30),
    width,
    height,
    props: { ...props, sceneDurations },
  };
};
