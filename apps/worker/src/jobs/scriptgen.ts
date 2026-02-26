import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();

export async function generateScript(sourceText: string, inputType: string): Promise<string[]> {
  const response = await client.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 2000,
    messages: [{
      role: 'user',
      content: `You are an expert video ad scriptwriter. Based on the following content, write a 7-scene professional video advertisement script.

Source content (${inputType}):
${sourceText.slice(0, 3000)}

Output a JSON array of exactly 7 strings. Each string is the voiceover text for one scene (15-25 words each). Follow this narrative arc:
1. Pain/problem hook
2. Amplify the problem
3. Cost of the problem
4. Brand introduction
5. Solution explanation (features)
6. Social proof / results
7. Call to action

Respond ONLY with valid JSON array, no other text. Example: ["Scene 1 text.", "Scene 2 text.", ...]`,
    }],
  });

  const text = (response.content[0] as any).text;
  return JSON.parse(text);
}
