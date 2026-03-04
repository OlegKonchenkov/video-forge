// apps/worker/src/jobs/scriptgen.ts
import OpenAI from 'openai';
import type { VideoScript } from '../types/script';

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

SELECTION RULES:
- Always end with "cta" as the last scene
- Always include "brand_reveal" for strong brand identity
- Choose scenes that tell a compelling story arc: problem → solution → proof → CTA
- For local businesses: prefer "map_location" + "team_intro"
- For SaaS/tech: prefer "comparison" + "how_it_works"
- For e-commerce: prefer "product_showcase" + "offer_countdown"
- For service businesses: prefer "testimonial" + "before_after"
- For B2B: prefer "how_it_works" + "stats_grid" + "comparison"; avoid "offer_countdown"
- For B2C: prefer "product_showcase" + "offer_countdown" + "testimonial"
`;

function buildPrompt(
  sourceText:       string,
  inputType:        string,
  language:         string,
  businessType:     string,
  knownAccentColor: string | null,
): string {
  const colorHint = knownAccentColor
    ? `Use this exact hex color as accentColor: "${knownAccentColor}"`
    : `Pick a strong brand accent color (hex) that matches the brand personality — NOT generic blue #3b82f6 unless it genuinely fits`;

  const langInstruction = language !== 'en'
    ? `CRITICAL LANGUAGE RULE: Write ALL copy (voiceovers, headlines, taglines, labels, CTAs) in "${language}" — the language of the source website. Never mix in English words unless they are brand names or technical terms universally understood.`
    : `Write all copy in English.`;

  const b2bHint = businessType === 'b2b'
    ? `BUSINESS TYPE: B2B — focus on ROI, efficiency, cost savings, professional benefits. Avoid consumer/retail language like prices, discounts, or "shop now".`
    : businessType === 'b2c'
    ? `BUSINESS TYPE: B2C — focus on lifestyle, desire, personal value, convenience. Use emotional and aspirational language.`
    : `BUSINESS TYPE: Mixed — balance professional credibility with approachable consumer appeal.`;

  return `Analyse this ${inputType} content and create a 5-7 scene video ad script.

SOURCE CONTENT:
${sourceText.slice(0, 7000)}

${SCENE_CATALOGUE}

${b2bHint}

${langInstruction}

Return a JSON object with this EXACT structure:
{
  "brandName": "Company/product name from content",
  "tagline": "Compelling one-line tagline (max 6 words)",
  "ctaText": "CTA button text matching the business type",
  "ctaUrl": "Website URL from content or infer from brand",
  "accentColor": "#hex — ${colorHint}",
  "language": "${language}",
  "scenes": [
    { "type": "<scene_type>", "props": { /* matching schema above */ } },
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
- ctaText: match the action ("Prenota una Demo" for SaaS, "Richiedi un Preventivo" for services, "Acquista Ora" for retail)`;
}

export async function generateScript(
  sourceText:       string,
  inputType:        string,
  language:         string = 'en',
  businessType:     string = 'mixed',
  knownAccentColor: string | null = null,
): Promise<VideoScript> {
  const response = await client.chat.completions.create({
    model: 'gpt-5.2',
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: SYSTEM },
      { role: 'user',   content: buildPrompt(sourceText, inputType, language, businessType, knownAccentColor) },
    ],
    max_completion_tokens: 4000,
    temperature: 0.7,
  });

  const text = response.choices[0].message.content!;
  try {
    return JSON.parse(text) as VideoScript;
  } catch {
    throw new Error(`GPT returned invalid JSON: ${text.slice(0, 200)}`);
  }
}
