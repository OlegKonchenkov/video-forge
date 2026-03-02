// agentforge-video/src/types.ts

// ─── Shared props injected by AgentForgeAd assembler into every scene ───────
export interface SharedSceneProps {
  accentColor: string;
  brandName:   string;
  tagline:     string;
  ctaText:     string;
  ctaUrl:      string;
  audioPath:   string;   // e.g. "audio/voiceover/scene_2.mp3"
  sceneIndex:  number;
  sceneTotal:  number;
}

// ─── Per-scene prop interfaces ───────────────────────────────────────────────
export interface ScenePainHookProps {
  voiceover:  string;
  headline:   string;
  sub:        string;
  painPoints: [string, string, string];
}

export interface SceneInboxChaosProps {
  voiceover:  string;
  items: Array<{ subject: string; from: string; time: string; urgent?: boolean }>;
  punchWords: [string, string, string];
}

export interface SceneCostCounterProps {
  voiceover: string;
  intro:     string;
  stat1:     { value: number; unit: string; label: string };
  stat2:     { value: number; unit: string; label: string };
}

export interface SceneBrandRevealProps {
  voiceover: string;
}

export interface SceneFeatureListProps {
  voiceover:     string;
  headlineLines: [string, string, string, string];
  sub:           string;
  features:      Array<{ icon: string; title: string; detail: string; status: string }>;
}

export interface SceneStatsGridProps {
  voiceover: string;
  title:     string;
  sub:       string;
  stats:     Array<{ value: string; label: string; sub: string }>;
}

export interface SceneCTAProps {
  voiceover:  string;
  headline:   string;
  accentLine: string;
  sub:        string;
}

export interface SceneTestimonialProps {
  voiceover: string;
  quote:     string;
  name:      string;
  role:      string;
  company?:  string;
}

export interface SceneBeforeAfterProps {
  voiceover:    string;
  beforeLabel:  string;
  beforePoints: [string, string, string];
  afterLabel:   string;
  afterPoints:  [string, string, string];
}

export interface SceneHowItWorksProps {
  voiceover: string;
  title:     string;
  steps:     Array<{ number: string; icon: string; title: string; description: string }>;
}

export interface SceneProductShowcaseProps {
  voiceover:   string;
  productName: string;
  tagline:     string;
  price?:      string;
}

export interface SceneOfferCountdownProps {
  voiceover: string;
  badge:     string;
  offer:     string;
  benefit:   string;
  urgency:   string;
}

export interface SceneMapLocationProps {
  voiceover: string;
  address:   string;
  city:      string;
  hours:     string;
  phone?:    string;
}

export interface SceneTeamIntroProps {
  voiceover: string;
  title:     string;
  members:   Array<{ name: string; role: string; initials: string }>;
}

export interface SceneComparisonProps {
  voiceover:        string;
  competitorLabel:  string;
  brandLabel:       string;
  features:         Array<{ label: string; competitor: boolean; brand: boolean }>;
}

// ─── Discriminated union ─────────────────────────────────────────────────────
export type SceneConfig =
  | { type: 'pain_hook';        props: ScenePainHookProps }
  | { type: 'inbox_chaos';      props: SceneInboxChaosProps }
  | { type: 'cost_counter';     props: SceneCostCounterProps }
  | { type: 'brand_reveal';     props: SceneBrandRevealProps }
  | { type: 'feature_list';     props: SceneFeatureListProps }
  | { type: 'stats_grid';       props: SceneStatsGridProps }
  | { type: 'cta';              props: SceneCTAProps }
  | { type: 'testimonial';      props: SceneTestimonialProps }
  | { type: 'before_after';     props: SceneBeforeAfterProps }
  | { type: 'how_it_works';     props: SceneHowItWorksProps }
  | { type: 'product_showcase'; props: SceneProductShowcaseProps }
  | { type: 'offer_countdown';  props: SceneOfferCountdownProps }
  | { type: 'map_location';     props: SceneMapLocationProps }
  | { type: 'team_intro';       props: SceneTeamIntroProps }
  | { type: 'comparison';       props: SceneComparisonProps };
  // Adding a new scene type: add entry here + sceneRegistry.ts + scriptgen.ts prompt

// ─── Root composition props ───────────────────────────────────────────────────
export type AgentForgeAdProps = {
  sceneDurations: number[];
  brandName:      string;
  tagline:        string;
  ctaText:        string;
  ctaUrl:         string;
  accentColor:    string;
  scenes:         SceneConfig[];
};
