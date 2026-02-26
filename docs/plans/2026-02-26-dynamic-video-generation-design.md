# Dynamic Video Generation — Design Doc
_Date: 2026-02-26_

## Problem

The Remotion composition (`AgentForgeAd`) has hardcoded copy specific to the AgentForge brand. The pipeline already generates dynamic audio (ElevenLabs TTS) and dynamic background images (Gemini), but the on-screen text in all 7 scenes is static. Every video looks identical except for the audio track.

## Goal

Every video generated from any input (URL, PDF, PPT, or text prompt) must produce a fully unique output — different text, different stats, different brand identity, different background images — all driven by the source content.

## Approach: Option A — Fixed 7-Scene Template, Fully Dynamic Content

Keep the proven 7-scene narrative arc (pain → chaos → cost → brand → solution → proof → CTA) but make every piece of text and every number dynamic via Remotion `--props`.

Future templates (V2+) will be additional Remotion compositions. The AI or user will pick which template to use from the UI. This design adds a `templateId` field to leave room for that without any rework.

---

## Data Flow

```
USER INPUT (URL / PDF / PPT / prompt)
         │
         ▼
1. CONTENT EXTRACTION
   • URL    → scrape text (max 4000 chars) + extract OG image + hero images
   • PDF    → extract all text + embedded images
   • PPT    → extract slide text + embedded images
   • prompt → use directly as source text
   Output: { text: string, imageUrls: string[] }
         │
         ▼
2. GPT-4o SCRIPT GENERATION
   Input:  extracted text
   Output: VideoScript JSON (see schema below)
   Model:  gpt-4o (structured JSON output mode)
         │
         ├─────────────────────────────────┐
         ▼                                 ▼
3. ElevenLabs TTS               4. BACKGROUND IMAGES
   7× scenes[i].voiceover          Priority order:
   → public/audio/voiceover/        1. Scraped brand images (URL input)
     scene1-7.mp3                   2. Embedded images (PDF/PPT)
                                    3. Gemini AI generation (fallback)
         │                          → public/images/bg-*.png
         └─────────────┬────────────┘
                       ▼
5. REMOTION RENDER
   npx remotion render AgentForgeAd out.mp4 --codec h264
     --props '{ brandName, tagline, ctaText, ctaUrl, scenes[7] }'
   calculateMetadata reads audio durations → sets scene timings
   All props flow through via spread operator (no change needed)
         │
         ▼
6. UPLOAD → Supabase Storage → mark video complete
```

---

## VideoScript JSON Schema

This is the single source of truth that GPT-4o generates and that drives the entire render.

```typescript
interface ScenePain {
  voiceover:   string          // 15-25 words for TTS
  headline:    string          // 5-8 words, main display text
  sub:         string          // 1-2 supporting sentences
  painPoints:  [string, string, string]  // e.g. ["No-shows", "Paper forms", "Lost referrals"]
}

interface SceneChaos {
  voiceover:  string
  items: [    // 4 realistic inbox/task items for this business type
    { subject: string; from: string; time: string; urgent?: boolean },
    { subject: string; from: string; time: string; urgent?: boolean },
    { subject: string; from: string; time: string; urgent?: boolean },
    { subject: string; from: string; time: string; urgent?: boolean },
  ]
  punchWords: [string, string, string]  // e.g. ["No-shows.", "Paperwork.", "Chaos."]
}

interface SceneCost {
  voiceover: string
  intro:     string                                          // "That's what [biz type] loses every year"
  stat1:     { value: number; unit: string; label: string } // { 23, "hrs",  "wasted per week"  }
  stat2:     { value: number; unit: string; label: string } // { 34000, "€", "lost per year"     }
}

interface SceneBrand {
  voiceover: string   // Scene 4 uses root brandName + tagline, only voiceover needed here
}

interface SceneSolution {
  voiceover:     string
  headlineLines: [string, string, string, string]  // 4 staggered lines, last one in accent colour
  sub:           string
  features: [
    { icon: string; title: string; detail: string; status: string },
    { icon: string; title: string; detail: string; status: string },
    { icon: string; title: string; detail: string; status: string },
  ]
}

interface SceneStats {
  voiceover: string
  title:     string  // "Average results after 30 days"
  sub:       string  // "Across 50+ [business type] clients"
  stats: [
    { value: string; label: string; sub: string },
    { value: string; label: string; sub: string },
    { value: string; label: string; sub: string },
  ]
}

interface SceneCTA {
  voiceover:  string
  headline:   string      // "Stop losing customers to"
  accentLine: string      // "outdated manual processes."
  sub:        string      // "Book your free 15-minute call today."
}

interface VideoScript {
  brandName: string
  tagline:   string
  ctaText:   string   // "Book a Free Demo"
  ctaUrl:    string   // "acmedental.io"
  scenes: [ScenePain, SceneChaos, SceneCost, SceneBrand, SceneSolution, SceneStats, SceneCTA]
}
```

---

## Remotion Props Type

```typescript
// agentforge-video/src/types.ts
export type AgentForgeAdProps = {
  sceneDurations: number[]     // set by calculateMetadata from audio durations
  brandName: string
  tagline:   string
  ctaText:   string
  ctaUrl:    string
  scenes: [ScenePain, SceneChaos, SceneCost, SceneBrand, SceneSolution, SceneStats, SceneCTA]
}
```

`calculateMetadata` already spreads `...props` — no change needed there.

---

## Files Changed

### Worker (`apps/worker/src/`)

| File | Change |
|---|---|
| `jobs/scriptgen.ts` | Switch Anthropic → OpenAI SDK; new structured prompt; return `VideoScript` |
| `jobs/scraper.ts` | Enhanced: also return `imageUrls[]` (OG + hero images) from websites |
| `jobs/images.ts` | Priority logic: scraped images → Gemini fallback |
| `jobs/pipeline.ts` | Thread `VideoScript` from scriptgen through to renderVideo |
| `jobs/render.ts` | Serialize `VideoScript` to `--props` JSON string |

### Remotion (`agentforge-video/src/`)

| File | Change |
|---|---|
| `types.ts` | Full `AgentForgeAdProps` with all scene sub-types |
| `AgentForgeAd.tsx` | Pass `scenes[i]` + root props to each scene component |
| `scenes/Scene1Pain.tsx` | `headline`, `sub`, `painPoints[]` from props |
| `scenes/Scene2Chaos.tsx` | `items[]`, `punchWords[]` from props |
| `scenes/Scene3Cost.tsx` | `intro`, `stat1`, `stat2` from props |
| `scenes/Scene4Logo.tsx` | `brandName`, `tagline` from root props |
| `scenes/Scene5Solution.tsx` | `headlineLines[]`, `sub`, `features[]` from props |
| `scenes/Scene6Stats.tsx` | `title`, `sub`, `stats[]` from props |
| `scenes/Scene7CTA.tsx` | `brandName`, `headline`, `accentLine`, `sub`, `ctaText`, `ctaUrl` |

`calculateMetadata.ts` — **no change needed** (already spreads all props).

---

## Image Strategy Detail

```
For URL input:
  scraper.ts extracts:
    1. og:image meta tag
    2. First hero/banner <img> with width > 600px
    3. Up to 5 more content images
  images.ts:
    - Use extracted images for bg-hero, bg-chaos, bg-cost, etc. where available
    - Call Gemini for any slots without a scraped image

For PDF / PPT:
  parser.ts already extracts text
  Enhancement: also extract embedded images (base64 → temp files)
  Same fallback to Gemini

For prompt:
  No images to extract → all 7 slots use Gemini
```

---

## GPT-4o Prompt Design

Key principles for a high-quality, sellable output:
- Use GPT-4o with `response_format: { type: "json_object" }` for deterministic JSON
- Prime it with the business type so stats are industry-plausible
- Stat values should feel realistic: not too round (not "50hrs"), not too precise (not "47.3hrs")
- Features in Scene 5 should match the actual business (not generic "AI Email Manager")
- CTA URL extracted from scraped content where possible, else guessed from brandName

---

## Future Template System (V2)

- Each template = new Remotion composition ID + new set of scene components
- `VideoScript` adds `templateId: string` field
- Worker selects composition based on templateId
- UI shows template picker with preview thumbnails
- "AI picks best" mode: GPT receives template descriptions and picks based on business type

Zero rework required on this design to add templates later.

---

## Success Criteria

- [ ] A dental clinic URL produces a video with dental-specific copy, stats, and images
- [ ] A SaaS PDF pitch deck produces a video with SaaS-specific copy
- [ ] A text prompt "make an ad for my gym" produces a believable gym ad
- [ ] No hardcoded "AgentForge" text visible in any generated video
- [ ] Video render time stays under 5 minutes end-to-end
