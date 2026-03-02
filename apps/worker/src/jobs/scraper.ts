// apps/worker/src/jobs/scraper.ts
import axios from 'axios';

export interface ScrapeResult {
  text:          string
  brandImageUrl: string | null
  accentColor:   string | null  // from <meta name="theme-color"> hex value
}

export async function scrapeUrl(url: string): Promise<ScrapeResult> {
  try {
    const { data } = await axios.get(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; VideoForgeBot/1.0)' },
      timeout: 15000,
    });

    const html = data as string;

    // Extract og:image
    const ogMatch  = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)
                  || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
    const brandImageUrl = ogMatch ? ogMatch[1] : null;

    // Extract theme-color (brand accent color)
    const themeMatch = html.match(/<meta[^>]+name=["']theme-color["'][^>]+content=["'](#[0-9a-fA-F]{3,6})["']/i)
                    || html.match(/<meta[^>]+content=["'](#[0-9a-fA-F]{3,6})["'][^>]+name=["']theme-color["']/i);
    const accentColor = themeMatch ? themeMatch[1] : null;

    // Strip HTML to plain text
    const text = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 5000);

    return { text, brandImageUrl, accentColor };
  } catch {
    throw new Error(`Failed to scrape URL: ${url}`);
  }
}
