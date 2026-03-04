// apps/worker/src/types/script.ts
// Mirrors agentforge-video/src/types.ts — keep in sync

// ─── Per-scene prop interfaces ────────────────────────────────────────────────

export interface ScenePainHookProps {
  voiceover:  string
  headline:   string
  sub:        string
  painPoints: [string, string, string]
}

export interface SceneInboxChaosProps {
  voiceover:  string
  items: Array<{ subject: string; from: string; time: string; urgent?: boolean }>
  punchWords: [string, string, string]
}

export interface SceneCostCounterProps {
  voiceover: string
  intro:     string
  stat1:     { value: number; unit: string; label: string }
  stat2:     { value: number; unit: string; label: string }
}

export interface SceneBrandRevealProps {
  voiceover: string
}

export interface SceneFeatureListProps {
  voiceover:     string
  headlineLines: [string, string, string, string]
  sub:           string
  features:      Array<{ icon: string; title: string; detail: string; status: string }>
}

export interface SceneStatsGridProps {
  voiceover: string
  title:     string
  sub:       string
  stats:     Array<{ value: string; label: string; sub: string }>
}

export interface SceneCTAProps {
  voiceover:  string
  headline:   string
  accentLine: string
  sub:        string
}

export interface SceneTestimonialProps {
  voiceover: string
  quote:     string
  name:      string
  role:      string
  company?:  string
}

export interface SceneBeforeAfterProps {
  voiceover:    string
  beforeLabel:  string
  beforePoints: [string, string, string]
  afterLabel:   string
  afterPoints:  [string, string, string]
}

export interface SceneHowItWorksProps {
  voiceover: string
  title:     string
  steps:     Array<{ number: string; icon: string; title: string; description: string }>
}

export interface SceneProductShowcaseProps {
  voiceover:   string
  productName: string
  tagline:     string
  price?:      string
}

export interface SceneOfferCountdownProps {
  voiceover: string
  badge:     string
  offer:     string
  benefit:   string
  urgency:   string
}

export interface SceneMapLocationProps {
  voiceover: string
  address:   string
  city:      string
  hours:     string
  phone?:    string
}

export interface SceneTeamIntroProps {
  voiceover: string
  title:     string
  members:   Array<{ name: string; role: string; initials: string }>
}

export interface SceneComparisonProps {
  voiceover:       string
  competitorLabel: string
  brandLabel:      string
  features:        Array<{ label: string; competitor: boolean; brand: boolean }>
}

export interface SceneBigStatProps {
  voiceover: string
  value:     string   // e.g. "847" or "1,247" or "98%"
  unit:      string   // e.g. "MW" or "clients"
  label:     string   // e.g. "installed capacity"
  sub:       string   // e.g. "powering 400,000 homes"
}

export interface SceneMissionStatementProps {
  voiceover: string
  statement: string                   // full brand statement
  values:    [string, string, string] // 3 core values
}

export interface SceneSocialProofProps {
  voiceover: string
  title:     string
  badges:    Array<{ label: string; value: string }>  // 3-4 items
}

export interface SceneTimelineProps {
  voiceover: string
  title:     string
  events:    Array<{ year: string; label: string }>   // 3-4 items
}

// ─── Discriminated union ──────────────────────────────────────────────────────

export type SceneConfig =
  | { type: 'pain_hook';         showImage: boolean; props: ScenePainHookProps }
  | { type: 'inbox_chaos';       showImage: boolean; props: SceneInboxChaosProps }
  | { type: 'cost_counter';      showImage: boolean; props: SceneCostCounterProps }
  | { type: 'brand_reveal';      showImage: boolean; props: SceneBrandRevealProps }
  | { type: 'feature_list';      showImage: boolean; props: SceneFeatureListProps }
  | { type: 'stats_grid';        showImage: boolean; props: SceneStatsGridProps }
  | { type: 'cta';               showImage: boolean; props: SceneCTAProps }
  | { type: 'testimonial';       showImage: boolean; props: SceneTestimonialProps }
  | { type: 'before_after';      showImage: boolean; props: SceneBeforeAfterProps }
  | { type: 'how_it_works';      showImage: boolean; props: SceneHowItWorksProps }
  | { type: 'product_showcase';  showImage: boolean; props: SceneProductShowcaseProps }
  | { type: 'offer_countdown';   showImage: boolean; props: SceneOfferCountdownProps }
  | { type: 'map_location';      showImage: boolean; props: SceneMapLocationProps }
  | { type: 'team_intro';        showImage: boolean; props: SceneTeamIntroProps }
  | { type: 'comparison';        showImage: boolean; props: SceneComparisonProps }
  | { type: 'big_stat';          showImage: boolean; props: SceneBigStatProps }
  | { type: 'mission_statement'; showImage: boolean; props: SceneMissionStatementProps }
  | { type: 'social_proof';      showImage: boolean; props: SceneSocialProofProps }
  | { type: 'timeline';          showImage: boolean; props: SceneTimelineProps }

// ─── Root video script ────────────────────────────────────────────────────────

export interface VideoScript {
  brandName:    string
  tagline:      string
  ctaText:      string
  ctaUrl:       string
  accentColor:  string   // hex e.g. "#3b82f6"
  bgColor:      string   // hex e.g. "#050d1a"
  surfaceColor: string   // hex e.g. "#0a1628"
  language:     string   // 'it', 'en', 'de', etc.
  scenes:       SceneConfig[]
}
