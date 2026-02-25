export const FPS = 30;
export const WIDTH = 1920;
export const HEIGHT = 1080;

export const COLORS = {
  bg: '#050d1a',
  bgCard: '#0a1628',
  accent: '#3b82f6',
  accentGlow: '#60a5fa',
  cyan: '#06b6d4',
  white: '#ffffff',
  gray: '#94a3b8',
  danger: '#ef4444',
};

export const SCENES = {
  s1: 150,
  s2: 150,
  s3: 150,
  s4: 90,
  s5: 360,
  s6: 240,
  s7: 210,
};

export const TRANSITION_FRAMES = 15;

export const TOTAL_FRAMES =
  SCENES.s1 + SCENES.s2 + SCENES.s3 + SCENES.s4 +
  SCENES.s5 + SCENES.s6 + SCENES.s7 -
  6 * TRANSITION_FRAMES;
