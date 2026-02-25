import { loadFont } from '@remotion/google-fonts/Inter';

export const { fontFamily: FONT } = loadFont('normal', {
  weights: ['400', '600', '700', '800'],
  subsets: ['latin'],
});
