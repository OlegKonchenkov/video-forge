// agentforge-video/src/types.ts

export interface ScenePainProps {
  voiceover:  string
  headline:   string
  sub:        string
  painPoints: [string, string, string]
}

export interface SceneChaosProps {
  voiceover:  string
  items:      Array<{ subject: string; from: string; time: string; urgent?: boolean }>
  punchWords: [string, string, string]
}

export interface SceneCostProps {
  voiceover: string
  intro:     string
  stat1:     { value: number; unit: string; label: string }
  stat2:     { value: number; unit: string; label: string }
}

export interface SceneBrandProps {
  voiceover: string
}

export interface SceneSolutionProps {
  voiceover:     string
  headlineLines: [string, string, string, string]
  sub:           string
  features:      Array<{ icon: string; title: string; detail: string; status: string }>
}

export interface SceneStatsProps {
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

export type AgentForgeAdProps = {
  sceneDurations: number[]
  brandName:      string
  tagline:        string
  ctaText:        string
  ctaUrl:         string
  scenes: [
    ScenePainProps,
    SceneChaosProps,
    SceneCostProps,
    SceneBrandProps,
    SceneSolutionProps,
    SceneStatsProps,
    SceneCTAProps,
  ]
}
