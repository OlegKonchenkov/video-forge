// apps/worker/src/jobs/scriptgen.ts
import OpenAI from 'openai';
import type { VideoScript } from '../types/script';
import type { BrandPalette } from './scraper';

const client = new OpenAI(); // reads OPENAI_API_KEY from env

const SYSTEM = `You are an expert video ad scriptwriter. Analyse business content and output a
dynamic 5-7 scene video advertisement script. Choose the best scene types from the catalogue
below to match the business. Always respond with valid JSON matching the exact schema. No extra keys.`;

// Full scene type catalogue with schemas for GPT
const SCENE_CATALOGUE = `
AVAILABLE SCENE TYPES (pick 5-7 that best tell this business's story):

1. "pain_hook" — Opens with the customer's key frustration
   props: { voiceover, headline, sub, painPoints: [str, str, str] }

2. "inbox_chaos" — Visual overload: a flood of urgent tasks/emails
   props: { voiceover, items: [{subject, from, time, urgent?}]×4, punchWords: [str, str, str] }

3. "cost_counter" — Shocking cost-of-inaction with animated numbers
   props: { voiceover, intro, stat1: {value:number, unit, label}, stat2: {value:number, unit, label} }

4. "brand_reveal" — Cinematic reveal of the brand name (no extra props needed)
   props: { voiceover }

5. "feature_list" — The solution with 3 key features
   props: { voiceover, headlineLines: [str,str,str,str], sub, features: [{icon,title,detail,status}]×3 }

6. "stats_grid" — 3 impressive metrics in large display numbers
   props: { voiceover, title, sub, stats: [{value:str, label, sub}]×3 }

7. "cta" — Final call-to-action with urgency
   props: { voiceover, headline, accentLine, sub }

8. "testimonial" — A powerful customer quote
   props: { voiceover, quote, name, role, company? }

9. "before_after" — Side-by-side contrast of old vs new state
   props: { voiceover, beforeLabel, beforePoints: [str,str,str], afterLabel, afterPoints: [str,str,str] }

10. "how_it_works" — 3-step process explanation
    props: { voiceover, title, steps: [{number,icon,title,description}]×3 }

11. "product_showcase" — Full-screen product/service visual
    props: { voiceover, productName, tagline, price? }

12. "offer_countdown" — Limited-time offer with urgency bar
    props: { voiceover, badge, offer, benefit, urgency }

13. "map_location" — Location reveal for local businesses
    props: { voiceover, address, city, hours, phone? }

14. "team_intro" — Team members with avatar cards
    props: { voiceover, title, members: [{name,role,initials}]×2-4 }

15. "comparison" — Side-by-side vs competitor table
    props: { voiceover, competitorLabel, brandLabel, features: [{label, competitor:bool, brand:bool}]×4-6 }

16. "big_stat" — One enormous animated number, full screen impact
    props: { voiceover, value: str (e.g. "847" or "1,247+"), unit: str (e.g. "MW"), label: str, sub: str }
    USE FOR: established companies with impressive numbers (years, clients, MW, revenue, units)
    showImage: true by default

17. "mission_statement" — Brand values manifesto, words reveal one by one
    props: { voiceover, statement: str (one powerful sentence, max 12 words), values: [str, str, str] }
    USE FOR: brands with a clear sustainability/innovation/quality mission
    showImage: true by default

18. "social_proof" — Trust wall: credentials, awards, certifications
    props: { voiceover, title: str, badges: [{label: str, value: str}]×3-4 }
    USE FOR: companies where trust signals differentiate (ISO, years in business, client count, awards)
    showImage: false by default

19. "timeline" — Company milestones, animated top-to-bottom
    props: { voiceover, title: str, events: [{year: str, label: str}]×3-4 }
    USE FOR: established companies (10+ years) with a history worth showing
    showImage: false by default
`;

const SELECTION_RULES = `
SELECTION RULES:
- Always end with "cta" as the last scene
- Choose scenes that tell the most compelling story ARC for THIS specific business: problem → solution → proof → CTA
- VARY your selection: the same business type should produce different scene combinations each run (use the variation seed above)
- Each scene has a "variantId" (0-4) that controls its visual style. Pick DIFFERENT variantIds for consecutive scenes to create visual variety. Variants: 0=TECH (particles, sharp), 1=ELEGANT (gradient mesh, rounded), 2=MINIMAL (clean, fade), 3=BOLD (geometric, heavy shadow), 4=RETRO (scanlines, square)
- These are SUGGESTIONS not requirements — pick what best tells THIS brand's story:
  - Local businesses: map_location, team_intro are strong choices
  - SaaS/tech: comparison, how_it_works are strong choices
  - E-commerce: product_showcase, offer_countdown are strong choices
  - Service businesses: testimonial, before_after are strong choices
  - B2B companies: how_it_works, stats_grid, big_stat, social_proof are strong choices; avoid offer_countdown
  - B2C brands: product_showcase, offer_countdown, testimonial are strong choices
  - Established companies (10+ years): timeline, big_stat, mission_statement are strong choices
- brand_reveal is optional: include it when brand recognition is important, skip it for unknown startups needing more content scenes
`;

function buildPrompt(
  sourceText:        string,
  inputType:         string,
  language:          string,
  businessType:      string,
  knownAccentColor:  string | null,
  brandPalette:      BrandPalette | null,
  seed:              string,
  userInstructions?: string,
): string {
  const langInstruction = language !== 'en'
    ? `CRITICAL LANGUAGE RULE: Write ALL copy (voiceovers, headlines, taglines, labels, CTAs) in "${language}" — the language of the source website. Never mix in English words unless they are brand names or technical terms universally understood.`
    : `Write all copy in English.`;

  const b2bHint = businessType === 'b2b'
    ? `BUSINESS TYPE: B2B — focus on ROI, efficiency, cost savings, professional benefits. Avoid consumer/retail language like prices, discounts, or "shop now".`
    : businessType === 'b2c'
    ? `BUSINESS TYPE: B2C — focus on lifestyle, desire, personal value, convenience. Use emotional and aspirational language.`
    : `BUSINESS TYPE: Mixed — balance professional credibility with approachable consumer appeal.`;

  const paletteHint = brandPalette
    ? `BRAND PALETTE (extracted from website CSS):
- Background: ${brandPalette.bg} (${brandPalette.isDark ? 'dark' : 'light'} theme)
- Surface: ${brandPalette.surface}
- Accent: ${brandPalette.accent}
Use bgColor close to "${brandPalette.bg}" (can darken/lighten slightly for cinematic feel).
Use surfaceColor close to "${brandPalette.surface}".
Use accentColor matching or complementing "${brandPalette.accent}".`
    : knownAccentColor
      ? `Use this exact hex color as accentColor: "${knownAccentColor}". For bgColor pick a deep dark that complements this accent. For surfaceColor pick a slightly lighter variant of bgColor.`
      : `Pick a strong brand accent color (hex) that matches the brand personality. For bgColor pick a deep dark version of it. For surfaceColor pick a slightly lighter variant of bgColor.`;

  return `VARIATION SEED: ${seed} — use this to vary your scene selection even for the same URL.

Analyse this ${inputType} content and create a 5-7 scene video ad script.

SOURCE CONTENT:
${sourceText.slice(0, 7000)}

${SCENE_CATALOGUE}

${SELECTION_RULES}

${b2bHint}

${langInstruction}

${paletteHint}

Return a JSON object with this EXACT structure:
{
  "brandName": "Company/product name from content",
  "tagline": "Compelling one-line tagline (max 6 words)",
  "ctaText": "CTA button text matching the business type",
  "ctaUrl": "Website URL from content or infer from brand",
  "accentColor": "#hex — brand accent color",
  "bgColor": "#hex — scene background, deep/dark version matching brand palette",
  "surfaceColor": "#hex — card/panel background, slightly lighter than bgColor",
  "language": "${language}",
  "scenes": [
    { "type": "<scene_type>", "showImage": true/false, "variantId": 0-4, "props": { /* matching schema above */ } },
    ...
  ]
}

COPY RULES:
- All voiceovers: 15-25 words, conversational, read naturally aloud
- CRITICAL: NEVER concatenate adjacent words — always keep proper spaces between every single word
- Extract real stats/numbers from content where possible; otherwise invent plausible industry-specific ones
- All copy must be specific to THIS business — never generic placeholder text
- headlineLines[3] in feature_list must be one punchy word + period ("Automaticamente." / "Instantly." / "Effortlessly.")
- punchWords in inbox_chaos: short (1-3 words each), punchy, end with period
- comparison: brandLabel should be the actual brand name; show clear advantage
- ctaText: match the action ("Prenota una Demo" for SaaS, "Richiedi un Preventivo" for services, "Acquista Ora" for retail)
- showImage: set true for atmospheric/visual scenes (brand_reveal, pain_hook, product_showcase, big_stat, mission_statement, testimonial); set false for data-heavy scenes (comparison, stats_grid, cost_counter, social_proof, timeline, how_it_works)${userInstructions ? `

USER INSTRUCTIONS (HIGHEST PRIORITY — follow these strictly, they override any default rules above):
${userInstructions}` : ''}`;
}

export async function generateScript(
  sourceText:        string,
  inputType:         string,
  language:          string = 'en',
  businessType:      string = 'mixed',
  knownAccentColor:  string | null = null,
  brandPalette:      BrandPalette | null = null,
  userInstructions?: string,
): Promise<VideoScript> {
  const seed = Math.random().toString(36).slice(2, 8);
  const model = process.env.OPENAI_MODEL || 'gpt-4.1-mini';

  const response = await client.chat.completions.create({
    model,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: SYSTEM },
      { role: 'user',   content: buildPrompt(sourceText, inputType, language, businessType, knownAccentColor, brandPalette, seed, userInstructions) },
    ],
    max_completion_tokens: 4500,
    temperature: 0.9,
  });

  const text = response.choices[0].message.content!;
  try {
    const script = JSON.parse(text) as VideoScript;
    // Defensive defaults if GPT omitted new fields
    if (!script.bgColor)      script.bgColor      = '#050d1a';
    if (!script.surfaceColor) script.surfaceColor = '#0a1628';
    for (let i = 0; i < script.scenes.length; i++) {
      const scene = script.scenes[i] as Record<string, unknown>;
      if (typeof scene.showImage === 'undefined') {
        scene.showImage = true;
      }
      // Assign deterministic variantId if GPT omitted it (rotate through 0-4)
      if (typeof scene.variantId !== 'number' || scene.variantId < 0 || scene.variantId > 4) {
        scene.variantId = i % 5;
      }
    }
    return script;
  } catch {
    throw new Error(`GPT returned invalid JSON: ${text.slice(0, 200)}`);
  }
}
