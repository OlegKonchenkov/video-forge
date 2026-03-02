// apps/worker/src/jobs/scraper.ts
import axios from 'axios';

export interface ScrapeResult {
  text:          string
  brandImageUrl: string | null
  accentColor:   string | null   // from <meta name="theme-color">
  language:      string          // from <html lang="...">
  businessType:  'b2b' | 'b2c' | 'mixed'
}

function detectLanguage(html: string): string {
  const m = html.match(/<html[^>]+lang=["']([^"']+)["']/i);
  return m ? m[1].split('-')[0].toLowerCase() : 'en';
}

const B2B_KEYWORDS = [
  'aziende', 'imprese', 'clienti business', 'soluzioni aziendali', 'enterprise', 'b2b',
  'industries', 'industrial', 'engineering', 'manufacturing', 'wholesale', 'procurement',
  'supply chain', 'ERP', 'CRM', 'corporate', 'facility', 'infrastructure',
  'partners', 'distributori', 'rivenditori', 'commessa', 'appalto',
];

const B2C_KEYWORDS = [
  'acquista ora', 'shop now', 'checkout', 'carrello', 'ordina', 'prezzo', 'sconto',
  'spedizione', 'consumer', 'household', 'lifestyle', 'personal',
  'add to cart', 'aggiungi al carrello', 'promo', 'offerta', 'voucher',
];

function detectBusinessType(text: string): 'b2b' | 'b2c' | 'mixed' {
  const low = text.toLowerCase();
  const b2b = B2B_KEYWORDS.filter(k => low.includes(k)).length;
  const b2c = B2C_KEYWORDS.filter(k => low.includes(k)).length;
  if (b2b >= 3 && b2c === 0) return 'b2b';
  if (b2c >= 3 && b2b === 0) return 'b2c';
  return 'mixed';
}

function extractSubpageLinks(html: string, baseUrl: string): string[] {
  const PRIORITY_PATHS = [
    '/about', '/chi-siamo', '/über-uns', '/uber-uns',
    '/services', '/servizi', '/leistungen',
    '/products', '/prodotti', '/produkte',
    '/contact', '/contatti', '/kontakt',
  ];
  let origin: string;
  try { origin = new URL(baseUrl).origin; } catch { return []; }

  const found: string[] = [];
  const hrefs = [...html.matchAll(/href=["']([^"'#?]+)["']/gi)].map(m => m[1]);

  for (const path of PRIORITY_PATHS) {
    const match = hrefs.find(h => h === path || h.startsWith(path + '/'));
    if (match) {
      try {
        found.push(new URL(match, origin).href);
        if (found.length >= 3) break;
      } catch { /* invalid URL, skip */ }
    }
  }
  return found;
}

function extractText(html: string): string {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
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

    const language = detectLanguage(html);
    let   allText  = extractText(html);

    // Follow up to 3 priority subpages for richer context (budget: 8000 chars total)
    const subUrls = extractSubpageLinks(html, url);
    for (const subUrl of subUrls) {
      if (allText.length >= 8000) break;
      try {
        const { data: subHtml } = await axios.get(subUrl, {
          headers: { 'User-Agent': 'Mozilla/5.0 (compatible; VideoForgeBot/1.0)' },
          timeout: 10000,
        });
        allText += ' ' + extractText(subHtml as string);
        console.log(`[scraper] scraped subpage: ${subUrl}`);
      } catch { /* skip failed subpages */ }
    }

    const text         = allText.slice(0, 8000);
    const businessType = detectBusinessType(text);

    console.log(`[scraper] language=${language} businessType=${businessType} chars=${text.length}`);
    return { text, brandImageUrl, accentColor, language, businessType };

  } catch {
    throw new Error(`Failed to scrape URL: ${url}`);
  }
}
