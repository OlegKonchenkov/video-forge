// apps/worker/src/jobs/scraper.ts
import axios from 'axios';

export interface BrandPalette {
  bg:      string;   // primary background hex
  surface: string;   // card/panel background hex
  accent:  string;   // brand accent hex
  text:    string;   // primary text hex
  isDark:  boolean;  // luminance(bg) < 0.5
}

export interface ScrapeResult {
  text:          string
  brandImageUrl: string | null
  imageUrls:     string[]           // collected content images from the page
  accentColor:   string | null      // from <meta name="theme-color">
  palette:       BrandPalette | null // CSS-mined brand palette
  language:      string             // from <html lang="...">
  businessType:  'b2b' | 'b2c' | 'mixed'
}

// ─── Brand Palette Extraction ─────────────────────────────────────────────────

function hexToRgbPalette(hex: string): { r: number; g: number; b: number } | null {
  const clean = hex.replace('#', '');
  const full = clean.length === 3
    ? clean.split('').map(c => c + c).join('')
    : clean;
  if (full.length !== 6) return null;
  const n = parseInt(full, 16);
  if (isNaN(n)) return null;
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function relativeLuminancePalette(hex: string): number {
  const rgb = hexToRgbPalette(hex);
  if (!rgb) return 0;
  const [rs, gs, bs] = [rgb.r, rgb.g, rgb.b].map(c => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

function normalizeHex(hex: string): string | null {
  const clean = hex.replace('#', '');
  const full = clean.length === 3
    ? clean.split('').map(c => c + c).join('')
    : clean;
  if (full.length !== 6) return null;
  if (isNaN(parseInt(full, 16))) return null;
  return '#' + full.toLowerCase();
}

export function extractBrandPalette(html: string): BrandPalette | null {
  // Extract all hex colors from <style> blocks and inline style="" attributes
  const styleBlocks: string[] = [];
  for (const m of html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)) styleBlocks.push(m[1]);
  for (const m of html.matchAll(/style="([^"]*)"/gi)) styleBlocks.push(m[1]);
  const combined = styleBlocks.join(' ');

  const freq = new Map<string, number>();
  for (const m of combined.matchAll(/#[0-9a-fA-F]{3,6}\b/g)) {
    const n = normalizeHex(m[0]);
    if (n) freq.set(n, (freq.get(n) || 0) + 1);
  }
  if (freq.size < 2) return null;

  const sorted = [...freq.entries()].sort((a, b) => b[1] - a[1]);

  const darks  = sorted.filter(([h]) => relativeLuminancePalette(h) < 0.15);
  const mids   = sorted.filter(([h]) => { const l = relativeLuminancePalette(h); return l >= 0.1 && l <= 0.6; });
  const lights = sorted.filter(([h]) => relativeLuminancePalette(h) > 0.7);

  const bg      = darks[0]?.[0]  ?? sorted[0][0];
  const surface = darks[1]?.[0]  ?? mids[0]?.[0] ?? bg;
  const accent  = mids[0]?.[0]   ?? lights[0]?.[0] ?? '#3b82f6';
  const isDark  = relativeLuminancePalette(bg) < 0.5;
  const text    = isDark ? '#f1f5f9' : '#0f172a';

  console.log(`[scraper] palette: bg=${bg} accent=${accent} isDark=${isDark} (from ${freq.size} colors)`);
  return { bg, surface, accent, text, isDark };
}

// ─────────────────────────────────────────────────────────────────────────────

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
  let html = '';
  let jinaText = '';
  let usedJina = false;

  // Attempt 1: raw HTML (fast, gets metadata)
  try {
    const { data } = await axios.get(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; VideoForgeBot/1.0)' },
      timeout: 12000,
    });
    html = data as string;
    // Sanity check: if response looks like bot-blocking page, body will be very short
    const bodyTextLen = extractText(html).length;
    if (bodyTextLen < 200) throw new Error('Response too short — likely bot-blocked');
  } catch (axiosErr) {
    console.log(`[scraper] axios failed (${(axiosErr as Error).message?.slice(0, 60)}), trying Jina Reader...`);
    // Attempt 2: Jina Reader (handles JS/Cloudflare-protected sites, no API key needed)
    try {
      const jinaUrl = `https://r.jina.ai/${url}`;
      const { data } = await axios.get(jinaUrl, {
        headers: { 'Accept': 'text/plain', 'X-Return-Format': 'text' },
        timeout: 25000,
      });
      jinaText = data as string;
      usedJina = true;
      console.log(`[scraper] Jina Reader success — chars=${jinaText.length}`);
    } catch {
      throw new Error(`Failed to scrape URL: ${url}`);
    }
  }

  // Extract HTML metadata (only available from axios path)
  const ogMatch = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)
               || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
  const brandImageUrl = ogMatch ? ogMatch[1] : null;
  const imageUrls = html ? extractImageUrls(html, url) : [];
  const themeMatch = html.match(/<meta[^>]+name=["']theme-color["'][^>]+content=["'](#[0-9a-fA-F]{3,6})["']/i)
                  || html.match(/<meta[^>]+content=["'](#[0-9a-fA-F]{3,6})["'][^>]+name=["']theme-color["']/i);
  const accentColor = themeMatch ? themeMatch[1] : null;
  const palette = html ? extractBrandPalette(html) : null;
  const language = html ? detectLanguage(html) : 'it'; // Jina path: assume Italian if URL had /it-IT/

  let allText = usedJina ? jinaText : extractText(html);

  // Subpage crawl only on axios path (Jina already returns full text)
  if (!usedJina && html) {
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
        const subImages = extractImageUrls(subHtmlStr, subUrl);
        for (const img of subImages) {
          if (!imageUrls.includes(img) && imageUrls.length < 12) imageUrls.push(img);
        }
      } catch { /* skip */ }
    }
  }

  const text = allText.slice(0, 8000);
  const businessType = detectBusinessType(text);
  console.log(`[scraper] language=${language} businessType=${businessType} chars=${text.length} images=${imageUrls.length} jinaFallback=${usedJina}`);
  return { text, brandImageUrl, imageUrls, accentColor, palette, language, businessType };
}
