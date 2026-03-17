// agentforge-video/src/font.ts
import { loadFont as loadDMSans }       from '@remotion/google-fonts/DMSans';
import { loadFont as loadJetBrainsMono } from '@remotion/google-fonts/JetBrainsMono';

// Body font — modern, legible, all descriptive copy
export const { fontFamily: FONT } = loadDMSans('normal', {
  weights: ['400', '500', '700'],
  subsets: ['latin'],
});

// Mono font — stats, URLs, percentages, counters
export const { fontFamily: MONO_FONT } = loadJetBrainsMono('normal', {
  weights: ['400', '600'],
  subsets: ['latin'],
});
