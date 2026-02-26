// apps/worker/src/jobs/scriptgen.ts
import OpenAI from 'openai';
import type { VideoScript } from '../types/script';

const client = new OpenAI(); // reads OPENAI_API_KEY from env

const SYSTEM = `You are an expert video ad scriptwriter and marketing strategist.
Analyse business content and output a 7-scene video advertisement script.
Always respond with valid JSON matching the EXACT schema given. No extra keys.`;

function buildPrompt(sourceText: string, inputType: string): string {
  return `Analyse this ${inputType} content and create a complete 7-scene video ad script.

SOURCE CONTENT:
${sourceText.slice(0, 4000)}

Return a JSON object with this EXACT structure (fill every field, no nulls):
{
  "brandName": "Company/product name from content",
  "tagline": "Compelling one-line tagline (max 6 words)",
  "ctaText": "CTA button text e.g. 'Book a Free Demo'",
  "ctaUrl": "Website URL from content or guess from brand name",
  "scenes": [
    {
      "voiceover": "15-25 word narration for scene 1 (pain hook, grabs attention)",
      "headline": "5-8 word punchy display headline about the pain",
      "sub": "1-2 supporting sentences expanding the pain point",
      "painPoints": ["Specific pain 1", "Specific pain 2", "Specific pain 3"]
    },
    {
      "voiceover": "15-25 word narration for scene 2 (amplify chaos, makes it visceral)",
      "items": [
        {"subject": "Relevant realistic task/email subject", "from": "sender@domain.com", "time": "09:14", "urgent": true},
        {"subject": "Another relevant task", "from": "ops@thisbusiness.com", "time": "10:32", "urgent": false},
        {"subject": "Third relevant problem", "from": "team@thisbusiness.com", "time": "11:15", "urgent": true},
        {"subject": "Fourth relevant issue", "from": "admin@thisbusiness.com", "time": "14:22", "urgent": false}
      ],
      "punchWords": ["One word.", "Two words.", "Three word."]
    },
    {
      "voiceover": "15-25 word narration for scene 3 (cost of problem, shocking numbers)",
      "intro": "That's what [this type of business] loses every year",
      "stat1": {"value": 25, "unit": "hrs", "label": "wasted per week"},
      "stat2": {"value": 32000, "unit": "€", "label": "lost per year"}
    },
    {
      "voiceover": "15-25 word narration for scene 4 (brand introduction, turning point)"
    },
    {
      "voiceover": "15-25 word narration for scene 5 (solution, what the product does)",
      "headlineLines": ["First line about the solution", "second line here", "third compelling line", "Automatically."],
      "sub": "One short line: setup time + key differentiator (e.g. 'No setup. Fully managed.')",
      "features": [
        {"icon": "📧", "title": "Specific feature name 1", "detail": "One line: exactly what it does", "status": "47 handled"},
        {"icon": "📊", "title": "Specific feature name 2", "detail": "One line: exactly what it does", "status": "Synced live"},
        {"icon": "🔔", "title": "Specific feature name 3", "detail": "One line: exactly what it does", "status": "Running now"}
      ]
    },
    {
      "voiceover": "15-25 word narration for scene 6 (social proof, real-feeling results)",
      "title": "Average results after 30 days",
      "sub": "Across 50+ [this type of business] clients",
      "stats": [
        {"value": "28hrs", "label": "Saved per week", "sub": "Per team average"},
        {"value": "5 days", "label": "To go live", "sub": "From first call"},
        {"value": "$5.6K", "label": "Monthly ROI", "sub": "Average return"}
      ]
    },
    {
      "voiceover": "15-25 word narration for scene 7 (call to action, urgency + offer)",
      "headline": "Stop losing [customers/patients/clients] to",
      "accentLine": "[the specific problem this brand solves].",
      "sub": "Book your free 15-minute call today."
    }
  ]
}

RULES:
- Extract real numbers/stats from the content where possible
- If no real stats found, invent plausible ones for this industry (not too round, not too precise)
- Make ALL copy specific to this business type — never generic
- Voiceovers must flow naturally read aloud (conversational, not corporate)
- headlineLines[3] in scene 5 must be one punchy word + period ("Automatically." / "Instantly." / "Effortlessly.")
- punchWords in scene 2 must be short (1-3 words each) and punchy
- ctaText matches the business ("Book a Demo" for SaaS, "Book Appointment" for clinics, etc.)`;
}

export async function generateScript(sourceText: string, inputType: string): Promise<VideoScript> {
  const response = await client.chat.completions.create({
    model: 'gpt-4o',
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: SYSTEM },
      { role: 'user',   content: buildPrompt(sourceText, inputType) },
    ],
    max_tokens: 3000,
    temperature: 0.7,
  });

  const text = response.choices[0].message.content!;
  try {
    return JSON.parse(text) as VideoScript;
  } catch {
    throw new Error(`GPT returned invalid JSON: ${text.slice(0, 200)}`);
  }
}
