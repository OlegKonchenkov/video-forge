import { Composition } from 'remotion';
import { AgentForgeAd } from './AgentForgeAd';
import { calculateMetadata } from './calculateMetadata';
import { FPS, WIDTH, HEIGHT } from './constants';
import type { AgentForgeAdProps } from './types';

const DEFAULT_SCENE_DURATIONS = [210, 270, 180, 90, 360, 330, 240];

export const RemotionRoot = () => (
  <Composition
    id="AgentForgeAd"
    component={AgentForgeAd}
    durationInFrames={
      DEFAULT_SCENE_DURATIONS.reduce((s, d) => s + d, 0) - 6 * 15
    }
    fps={FPS}
    width={WIDTH}
    height={HEIGHT}
    defaultProps={{ sceneDurations: DEFAULT_SCENE_DURATIONS } satisfies AgentForgeAdProps}
    calculateMetadata={calculateMetadata}
  />
);
