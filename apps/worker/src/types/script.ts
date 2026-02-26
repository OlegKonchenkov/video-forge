// apps/worker/src/types/script.ts

export interface ScenePain {
  voiceover:   string
  headline:    string
  sub:         string
  painPoints:  [string, string, string]
}

export interface SceneChaos {
  voiceover:  string
  items: Array<{ subject: string; from: string; time: string; urgent?: boolean }>
  punchWords: [string, string, string]
}

export interface SceneCost {
  voiceover: string
  intro:     string
  stat1:     { value: number; unit: string; label: string }
  stat2:     { value: number; unit: string; label: string }
}

export interface SceneBrand {
  voiceover: string
}

export interface SceneSolution {
  voiceover:     string
  headlineLines: [string, string, string, string]
  sub:           string
  features:      Array<{ icon: string; title: string; detail: string; status: string }>
}

export interface SceneStats {
  voiceover: string
  title:     string
  sub:       string
  stats:     Array<{ value: string; label: string; sub: string }>
}

export interface SceneCTA {
  voiceover:  string
  headline:   string
  accentLine: string
  sub:        string
}

export interface VideoScript {
  brandName: string
  tagline:   string
  ctaText:   string
  ctaUrl:    string
  scenes: [ScenePain, SceneChaos, SceneCost, SceneBrand, SceneSolution, SceneStats, SceneCTA]
}
