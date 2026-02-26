function extractJsonArray(raw: string): string[] {
  const trimmed = raw.trim();
  const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenceMatch ? fenceMatch[1].trim() : trimmed;

  const start = candidate.indexOf('[');
  const end = candidate.lastIndexOf(']');
  if (start === -1 || end === -1 || end <= start) {
    throw new Error('Model did not return a JSON array');
  }

  const parsed = JSON.parse(candidate.slice(start, end + 1));
  if (!Array.isArray(parsed) || parsed.length !== 7 || !parsed.every((s) => typeof s === 'string')) {
    throw new Error('Model returned invalid scene format');
  }

  return parsed;
}

export async function generateScript(sourceText: string, inputType: string): Promise<string[]> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('Missing OPENAI_API_KEY');
  }

  const model = process.env.OPENAI_MODEL || 'gpt-4.1-mini';
  const prompt = `You are an expert video ad scriptwriter. Based on the following content, write a 7-scene professional video advertisement script.\n\nSource content (${inputType}):\n${sourceText.slice(0, 3000)}\n\nOutput a JSON array of exactly 7 strings. Each string is the voiceover text for one scene (15-25 words each). Follow this narrative arc:\n1. Pain/problem hook\n2. Amplify the problem\n3. Cost of the problem\n4. Brand introduction\n5. Solution explanation (features)\n6. Social proof / results\n7. Call to action\n\nRespond ONLY with valid JSON array, no other text. Example: [\"Scene 1 text.\", \"Scene 2 text.\", ...]`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      temperature: 0.7,
      max_tokens: 500,
      messages: [
        {
          role: 'system',
          content: 'Return only valid JSON. No markdown or commentary.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`OpenAI error ${response.status}: ${body}`);
  }

  const data = await response.json() as {
    choices?: Array<{ message?: { content?: string } }>;
  };

  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('OpenAI returned empty response');
  }

  return extractJsonArray(content);
}
