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
