import { Composition } from 'remotion';
import { AgentForgeAd } from './AgentForgeAd';
import { calculateMetadata } from './calculateMetadata';
import { FPS, WIDTH, HEIGHT } from './constants';
import type { AgentForgeAdProps } from './types';

const DEFAULT_PROPS: AgentForgeAdProps = {
  // Placeholder durations (overwritten by calculateMetadata from audio files)
  sceneDurations: [180, 180, 150, 120, 210],
  accentColor: '#3b82f6',
  brandName: 'AgentForge',
  tagline: 'AI Automation for Growing Businesses',
  ctaText: 'Book a Free Call',
  ctaUrl: 'agentforge.ai/start',
  scenes: [
    {
      type: 'pain_hook',
      props: {
        voiceover: '',
        headline: 'Your team is drowning in busywork.',
        sub: 'Every day your best people waste hours on tasks that don\'t grow the business.',
        painPoints: ['Manual data entry', 'Endless follow-ups', 'Repetitive reporting'],
      },
    },
    {
      type: 'feature_list',
      props: {
        voiceover: '',
        headlineLines: ['We build', 'custom AI tools', 'that handle it all.', 'Automatically.'],
        sub: 'No setup. No learning curve. Fully managed.',
        features: [
          { icon: '📧', title: 'AI Email Manager', detail: 'Auto-sorted, drafted & sent', status: '47 handled' },
          { icon: '📊', title: 'AI Data Assistant', detail: 'Updated in real-time, zero entry', status: 'Synced live' },
          { icon: '🔔', title: 'AI Follow-Up Agent', detail: 'No lead ever forgotten again', status: '12 sent today' },
        ],
      },
    },
    {
      type: 'stats_grid',
      props: {
        voiceover: '',
        title: 'Average results after 30 days',
        sub: 'Across 50+ business clients',
        stats: [
          { value: '28hrs', label: 'Saved per week', sub: 'Per team average' },
          { value: '5 days', label: 'To go live', sub: 'From first call' },
          { value: '$5.6K', label: 'Monthly ROI', sub: 'Average return' },
        ],
      },
    },
    {
      type: 'brand_reveal',
      props: { voiceover: '' },
    },
    {
      type: 'cta',
      props: {
        voiceover: '',
        headline: 'Stop paying people to do',
        accentLine: 'what AI does better.',
        sub: 'Book your free 15-minute call today.',
      },
    },
  ],
};

export const RemotionRoot = () => (
  <Composition
    id="AgentForgeAd"
    component={AgentForgeAd}
    durationInFrames={DEFAULT_PROPS.sceneDurations.reduce((s, d) => s + d, 0) - (DEFAULT_PROPS.scenes.length - 1) * 15}
    fps={FPS}
    width={WIDTH}
    height={HEIGHT}
    defaultProps={DEFAULT_PROPS}
    calculateMetadata={calculateMetadata}
  />
);
