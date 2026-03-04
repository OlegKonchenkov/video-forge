// apps/worker/src/jobs/scraper.ts
import axios from 'axios';

export interface ScrapeResult {
  text:          string
  brandImageUrl: string | null
  imageUrls:     string[]           // collected content images from the page
  accentColor:   string | null      // from <meta name="theme-color">
  language:      string             // from <html lang="...">
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

// ─── Image URL extraction ─────────────────────────────────────────────────────
// Patterns that indicate small utility images to skip
const SKIP_IMAGE = /icon|logo|avatar|badge|sprite|pixel|tracking|placeholder|blank|loading|spinner|\.gif|\.svg|\.ico/i;
const GOOD_EXT   = /\.(jpe?g|png|webp)(\?|$)/i;

function extractImageUrls(html: string, baseUrl: string): string[] {
  let origin: string;
  try { origin = new URL(baseUrl).origin; } catch { return []; }

  const found = new Set<string>();

  // 1. og:image / og:image:secure_url / twitter:image (highest quality, curated by site)
  const META_PATTERNS = [
    /<meta[^>]+property=["']og:image(?::secure_url)?["'][^>]+content=["']([^"']+)["']/gi,
    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image(?::secure_url)?["']/gi,
    /<meta[^>]+name=["']twitter:image(?::src)?["'][^>]+content=["']([^"']+)["']/gi,
    /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image(?::src)?["']/gi,
  ];
  for (const rx of META_PATTERNS) {
    for (const m of html.matchAll(rx)) {
      const url = m[1].trim();
      if (url && !url.startsWith('data:') && GOOD_EXT.test(url)) {
        try { found.add(new URL(url, origin).href); } catch { /* skip */ }
      }
    }
  }

  // 2. JSON-LD images (schema.org)
  const jsonldMatches = [...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  for (const m of jsonldMatches) {
    try {
      const obj = JSON.parse(m[1]);
      const imgs: string[] = [];
      if (obj.image) imgs.push(...(Array.isArray(obj.image) ? obj.image : [obj.image]));
      if (obj.logo?.url) imgs.push(obj.logo.url);
      for (const img of imgs) {
        if (typeof img === 'string' && GOOD_EXT.test(img)) {
          try { found.add(new URL(img, origin).href); } catch { /* skip */ }
        }
      }
    } catch { /* invalid JSON, skip */ }
  }

  // 3. <img src> — hero / product images (skip small utilities)
  const imgMatches = [...html.matchAll(/<img[^>]+src=["']([^"']+)["']/gi)].map(m => m[1]);
  for (const src of imgMatches) {
    if (found.size >= 10) break;
    if (!src || src.startsWith('data:')) continue;
    if (SKIP_IMAGE.test(src)) continue;
    if (!GOOD_EXT.test(src)) continue;
    try {
      found.add(new URL(src, origin).href);
    } catch { /* skip invalid */ }
  }

  return [...found].slice(0, 8);
}

// ─────────────────────────────────────────────────────────────────────────────

export async function scrapeUrl(url: string): Promise<ScrapeResult> {
  try {
    const { data } = await axios.get(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; VideoForgeBot/1.0)' },
      timeout: 15000,
    });

    const html = data as string;

    // Extract og:image (primary brand image — kept separate for scene 0)
    const ogMatch  = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)
                  || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
    const brandImageUrl = ogMatch ? ogMatch[1] : null;

    // Collect all usable image URLs from this page
    const imageUrls = extractImageUrls(html, url);

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
        const subHtmlStr = subHtml as string;
        allText += ' ' + extractText(subHtmlStr);
        // Also collect images from subpages
        const subImages = extractImageUrls(subHtmlStr, subUrl);
        for (const img of subImages) {
          if (!imageUrls.includes(img) && imageUrls.length < 12) imageUrls.push(img);
        }
        console.log(`[scraper] scraped subpage: ${subUrl}`);
      } catch { /* skip failed subpages */ }
    }

    const text         = allText.slice(0, 8000);
    const businessType = detectBusinessType(text);

    console.log(`[scraper] language=${language} businessType=${businessType} chars=${text.length} images=${imageUrls.length}`);
    return { text, brandImageUrl, imageUrls, accentColor, language, businessType };

  } catch {
    throw new Error(`Failed to scrape URL: ${url}`);
  }
}
