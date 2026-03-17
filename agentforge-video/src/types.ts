// agentforge-video/src/types.ts

// ─── Shared props injected by AgentForgeAd assembler into every scene ───────
export interface SharedSceneProps {
  accentColor:  string;
  bgColor:      string;      // brand background color
  surfaceColor: string;      // card/panel background color
  showImage:    boolean;     // whether to render background image layer
  brandName:    string;
  tagline:      string;
  ctaText:      string;
  ctaUrl:       string;
  audioPath:    string;   // e.g. "audio/voiceover/scene_2.mp3"
  sceneIndex:   number;
  sceneTotal:   number;
  variantId:    number;      // visual variant preset (0-4)
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

export interface SceneBigStatProps {
  voiceover: string;
  value:     string;   // e.g. "847" or "1,247" or "98%"
  unit:      string;   // e.g. "MW" or "clients"
  label:     string;   // e.g. "installed capacity"
  sub:       string;   // e.g. "powering 400,000 homes"
}

export interface SceneMissionStatementProps {
  voiceover: string;
  statement: string;                   // full brand statement
  values:    [string, string, string]; // 3 core values
}

export interface SceneSocialProofProps {
  voiceover: string;
  title:     string;
  badges:    Array<{ label: string; value: string }>;  // 3-4 items
}

export interface SceneTimelineProps {
  voiceover: string;
  title:     string;
  events:    Array<{ year: string; label: string }>;   // 3-4 items
}

export interface ScenePricingTableProps {
  voiceover: string;
  title:     string;
  tiers:     Array<{ name: string; price: string; features: string[]; popular?: boolean }>;
}

export interface SceneCaseStudyProps {
  voiceover:    string;
  clientName:   string;
  clientRole:   string;
  quote:        string;
  metricLabel:  string;
  metricBefore: string;
  metricAfter:  string;
}

export interface SceneFaqProps {
  voiceover: string;
  title:     string;
  items:     Array<{ question: string; answer: string }>;
}

export interface SceneFeatureSpotlightProps {
  voiceover:   string;
  icon:        string;
  featureName: string;
  description: string;
  benefits:    [string, string, string];
}

export interface SceneGuaranteeProps {
  voiceover:  string;
  title:      string;
  guarantees: [string, string, string];
}

export interface SceneClosingRecapProps {
  voiceover: string;
  title:     string;
  points:    string[];    // 3-5 points
  readyText: string;
}

export interface SceneAnimatedChartProps {
  voiceover: string;
  title:     string;
  bars:      Array<{ label: string; value: number; displayValue: string; highlight?: boolean }>;
}

// ─── Discriminated union ─────────────────────────────────────────────────────
export type SceneConfig =
  | { type: 'pain_hook';         showImage: boolean; variantId?: number; props: ScenePainHookProps }
  | { type: 'inbox_chaos';       showImage: boolean; variantId?: number; props: SceneInboxChaosProps }
  | { type: 'cost_counter';      showImage: boolean; variantId?: number; props: SceneCostCounterProps }
  | { type: 'brand_reveal';      showImage: boolean; variantId?: number; props: SceneBrandRevealProps }
  | { type: 'feature_list';      showImage: boolean; variantId?: number; props: SceneFeatureListProps }
  | { type: 'stats_grid';        showImage: boolean; variantId?: number; props: SceneStatsGridProps }
  | { type: 'cta';               showImage: boolean; variantId?: number; props: SceneCTAProps }
  | { type: 'testimonial';       showImage: boolean; variantId?: number; props: SceneTestimonialProps }
  | { type: 'before_after';      showImage: boolean; variantId?: number; props: SceneBeforeAfterProps }
  | { type: 'how_it_works';      showImage: boolean; variantId?: number; props: SceneHowItWorksProps }
  | { type: 'product_showcase';  showImage: boolean; variantId?: number; props: SceneProductShowcaseProps }
  | { type: 'offer_countdown';   showImage: boolean; variantId?: number; props: SceneOfferCountdownProps }
  | { type: 'map_location';      showImage: boolean; variantId?: number; props: SceneMapLocationProps }
  | { type: 'team_intro';        showImage: boolean; variantId?: number; props: SceneTeamIntroProps }
  | { type: 'comparison';        showImage: boolean; variantId?: number; props: SceneComparisonProps }
  | { type: 'big_stat';          showImage: boolean; variantId?: number; props: SceneBigStatProps }
  | { type: 'mission_statement'; showImage: boolean; variantId?: number; props: SceneMissionStatementProps }
  | { type: 'social_proof';      showImage: boolean; variantId?: number; props: SceneSocialProofProps }
  | { type: 'timeline';          showImage: boolean; variantId?: number; props: SceneTimelineProps }
  | { type: 'pricing_table';     showImage: boolean; variantId?: number; props: ScenePricingTableProps }
  | { type: 'case_study';        showImage: boolean; variantId?: number; props: SceneCaseStudyProps }
  | { type: 'faq';               showImage: boolean; variantId?: number; props: SceneFaqProps }
  | { type: 'feature_spotlight'; showImage: boolean; variantId?: number; props: SceneFeatureSpotlightProps }
  | { type: 'guarantee';         showImage: boolean; variantId?: number; props: SceneGuaranteeProps }
  | { type: 'closing_recap';     showImage: boolean; variantId?: number; props: SceneClosingRecapProps }
  | { type: 'animated_chart';    showImage: boolean; variantId?: number; props: SceneAnimatedChartProps };
  // Adding a new scene type: add entry here + sceneRegistry.ts + scriptgen.ts prompt

// ─── Root composition props ───────────────────────────────────────────────────
export type AgentForgeAdProps = {
  sceneDurations: number[];
  brandName:      string;
  tagline:        string;
  ctaText:        string;
  ctaUrl:         string;
  accentColor:    string;
  bgColor:        string;      // brand background color
  surfaceColor:   string;      // card/panel background color
  aspectRatio:    '16:9' | '9:16';
  hasVoiceover:   boolean;
  scenes:         SceneConfig[];
};
