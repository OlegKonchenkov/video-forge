import { Composition } from 'remotion';
import { AgentForgeAd } from './AgentForgeAd';
import { calculateMetadata } from './calculateMetadata';
import { FPS, WIDTH, HEIGHT } from './constants';
import type { AgentForgeAdProps } from './types';

const DEFAULT_SCENE_DURATIONS = [210, 270, 180, 90, 360, 330, 240];

const DEFAULT_PROPS: AgentForgeAdProps = {
  sceneDurations: DEFAULT_SCENE_DURATIONS,
  brandName: 'YourBrand',
  tagline:   'Your Tagline Here',
  ctaText:   'Get Started',
  ctaUrl:    'yourdomain.com',
  scenes: [
    { voiceover: '', headline: 'Your team is drowning in busywork.', sub: 'Every day your best people waste hours on tasks that don\'t grow the business.', painPoints: ['Manual work', 'Data entry', 'Missed follow-ups'] },
    { voiceover: '', items: [{ subject: 'Invoice overdue — action required', from: 'billing@vendor.io', time: '09:14', urgent: true }, { subject: 'Report still not updated', from: 'ops@company.com', time: '10:32', urgent: false }, { subject: 'Client follow-up (3rd attempt)', from: 'client@bigco.com', time: '11:15', urgent: true }, { subject: 'Data entry backlog piling up', from: 'admin@company.com', time: '14:22', urgent: false }], punchWords: ['Emails.', 'Reports.', 'Follow-ups.'] },
    { voiceover: '', intro: "That's what your business wastes every year", stat1: { value: 25, unit: '+hrs', label: 'wasted per week' }, stat2: { value: 32000, unit: '€', label: 'lost per year' } },
    { voiceover: '' },
    { voiceover: '', headlineLines: ['We build', 'custom AI tools', 'that handle it all.', 'Automatically.'], sub: 'No setup. No learning curve. Fully managed.', features: [{ icon: '📧', title: 'AI Email Manager', detail: 'Auto-sorted, drafted & sent', status: '47 handled' }, { icon: '📊', title: 'AI Data Assistant', detail: 'Updated in real-time, zero entry', status: 'Synced live' }, { icon: '🔔', title: 'AI Follow-Up Agent', detail: 'No lead ever forgotten again', status: '12 sent today' }] },
    { voiceover: '', title: 'Average results after 30 days', sub: 'Across 50+ business clients', stats: [{ value: '28hrs', label: 'Saved per week', sub: 'Per team average' }, { value: '5 days', label: 'To go live', sub: 'From first call' }, { value: '$5.6K', label: 'Monthly ROI', sub: 'Average return' }] },
    { voiceover: '', headline: 'Stop paying people to do what', accentLine: 'AI does better.', sub: 'Book your free 15-minute call today.' },
  ],
};

export const RemotionRoot = () => (
  <Composition
    id="AgentForgeAd"
    component={AgentForgeAd}
    durationInFrames={DEFAULT_SCENE_DURATIONS.reduce((s, d) => s + d, 0) - 6 * 15}
    fps={FPS}
    width={WIDTH}
    height={HEIGHT}
    defaultProps={DEFAULT_PROPS}
    calculateMetadata={calculateMetadata}
  />
);
