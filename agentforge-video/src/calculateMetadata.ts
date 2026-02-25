import { CalculateMetadataFunction, staticFile } from 'remotion';
import { getAudioDurationInSeconds } from '@remotion/media-utils';
import { FPS, TRANSITION_FRAMES } from './constants';
import type { AgentForgeAdProps } from './types';

const VOICEOVER_FILES = [
  'audio/voiceover/scene1.mp3',
  'audio/voiceover/scene2.mp3',
  'audio/voiceover/scene3.mp3',
  'audio/voiceover/scene4.mp3',
  'audio/voiceover/scene5.mp3',
  'audio/voiceover/scene6.mp3',
  'audio/voiceover/scene7.mp3',
];

const PADDING_FRAMES = 25;

export const calculateMetadata: CalculateMetadataFunction<AgentForgeAdProps> = async ({ props }) => {
  const durations = await Promise.all(
    VOICEOVER_FILES.map((f) => getAudioDurationInSeconds(staticFile(f)))
  );
  const sceneDurations = durations.map((d: number) => Math.ceil(d * FPS) + PADDING_FRAMES);
  const totalFrames =
    sceneDurations.reduce((sum: number, d: number) => sum + d, 0) - 6 * TRANSITION_FRAMES;
  return {
    durationInFrames: totalFrames,
    props: { ...props, sceneDurations },
  };
};
