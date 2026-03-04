// agentforge-video/src/shared/colorUtils.ts

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const clean = hex.replace('#', '');
  const n = parseInt(clean.length === 3
    ? clean.split('').map(c => c + c).join('')
    : clean, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function toRgba(hex: string, alpha: number): string {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r},${g},${b},${alpha})`;
}

function relativeLuminance(hex: string): number {
  const safe = /^#[0-9a-fA-F]{3,6}$/.test(hex) ? hex : '#050d1a';
  const { r, g, b } = hexToRgb(safe);
  const [rs, gs, bs] = [r, g, b].map(c => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

export interface AccentVariants {
  solid:  string;   // full opacity — accent text, icons
  glow:   string;   // 0.25 — halos, radial glow
  strong: string;   // 0.45 — card left border highlight
  border: string;   // 0.22 — card borders
  bg:     string;   // 0.07 — card backgrounds
}

export function accentVariants(hex: string): AccentVariants {
  const safe = /^#[0-9a-fA-F]{3,6}$/.test(hex) ? hex : '#3b82f6';
  return {
    solid:  safe,
    glow:   toRgba(safe, 0.25),
    strong: toRgba(safe, 0.45),
    border: toRgba(safe, 0.22),
    bg:     toRgba(safe, 0.07),
  };
}

export interface ThemeVariants {
  bg:          string;   // full background color
  surface:     string;   // card/panel background
  overlay:     string;   // image overlay rgba (0.50 dark / 0.60 light)
  textPrimary: string;   // primary text color
  textMuted:   string;   // muted/secondary text color
  accent:      string;   // accent color (pass-through)
}

export function themeVariants(
  bgColor:      string,
  surfaceColor: string,
  accentColor:  string,
): ThemeVariants {
  const safeBg      = /^#[0-9a-fA-F]{3,6}$/.test(bgColor)      ? bgColor      : '#050d1a';
  const safeSurface = /^#[0-9a-fA-F]{3,6}$/.test(surfaceColor)  ? surfaceColor : '#0a1628';
  const safeAccent  = /^#[0-9a-fA-F]{3,6}$/.test(accentColor)   ? accentColor  : '#3b82f6';

  const isDark = relativeLuminance(safeBg) < 0.5;

  return {
    bg:          safeBg,
    surface:     safeSurface,
    overlay:     isDark ? 'rgba(0,0,0,0.50)' : toRgba(safeBg, 0.60),
    textPrimary: isDark ? '#f1f5f9' : '#0f172a',
    textMuted:   isDark ? 'rgba(241,245,249,0.55)' : 'rgba(15,23,42,0.55)',
    accent:      safeAccent,
  };
}
