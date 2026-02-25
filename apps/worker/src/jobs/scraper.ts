import axios from 'axios';

export async function scrapeUrl(url: string): Promise<string> {
  // Use a lightweight HTTP fetch + basic text extraction
  // For JS-heavy sites, replace with Playwright
  try {
    const { data } = await axios.get(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; VideoForgeBot/1.0)' },
      timeout: 15000,
    });
    // Strip HTML tags and get text
    const text = (data as string)
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    return text.slice(0, 5000);
  } catch {
    throw new Error(`Failed to scrape URL: ${url}`);
  }
}
