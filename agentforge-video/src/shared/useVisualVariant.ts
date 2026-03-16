// agentforge-video/src/shared/useVisualVariant.ts
// Hook that returns a VisualVariant object for a given variantId (0-4) + accentColor

import { useMemo } from 'react';
import { accentVariants, type AccentVariants } from './colorUtils';

export interface VisualVariant {
  bgPrimitive: 'particles' | 'gradient_mesh' | 'geometric' | 'scanlines' | 'none';
  bgPrimitiveConfig: Record<string, unknown>;
  entryDirection: 'left' | 'right' | 'bottom' | 'top';
  entryType: 'slide' | 'scale' | 'fade';
  cardRadius: number;
  cardBorderSide: 'left' | 'top' | 'bottom' | 'all';
  cardShadowIntensity: number;
  cardBgOpacity: number;
  mirrorLayout: boolean;
  colorTreatment: 'standard' | 'inverted' | 'monochrome' | 'vibrant' | 'muted';
  overlayOpacity: number;
  badgeShape: 'pill' | 'square' | 'tag';
  dividerStyle: 'gradient' | 'solid' | 'dotted' | 'none';
}

export type VariantPresetName = 'TECH' | 'ELEGANT' | 'MINIMAL' | 'BOLD' | 'RETRO';

const PRESETS: Record<VariantPresetName, VisualVariant> = {
  TECH: {
    bgPrimitive: 'particles',
    bgPrimitiveConfig: { count: 45, opacity: 0.22, speed: 1.2, maxRadius: 3 },
    entryDirection: 'left',
    entryType: 'slide',
    cardRadius: 8,
    cardBorderSide: 'left',
    cardShadowIntensity: 0.6,
    cardBgOpacity: 0.45,
    mirrorLayout: false,
    colorTreatment: 'standard',
    overlayOpacity: 0.80,
    badgeShape: 'pill',
    dividerStyle: 'gradient',
  },
  ELEGANT: {
    bgPrimitive: 'gradient_mesh',
    bgPrimitiveConfig: { speed: 0.8, opacity: 0.50 },
    entryDirection: 'bottom',
    entryType: 'scale',
    cardRadius: 24,
    cardBorderSide: 'top',
    cardShadowIntensity: 0.3,
    cardBgOpacity: 0.06,
    mirrorLayout: false,
    colorTreatment: 'muted',
    overlayOpacity: 0.78,
    badgeShape: 'pill',
    dividerStyle: 'gradient',
  },
  MINIMAL: {
    bgPrimitive: 'none',
    bgPrimitiveConfig: {},
    entryDirection: 'bottom',
    entryType: 'fade',
    cardRadius: 4,
    cardBorderSide: 'bottom',
    cardShadowIntensity: 0.1,
    cardBgOpacity: 0.03,
    mirrorLayout: false,
    colorTreatment: 'monochrome',
    overlayOpacity: 0.85,
    badgeShape: 'square',
    dividerStyle: 'solid',
  },
  BOLD: {
    bgPrimitive: 'geometric',
    bgPrimitiveConfig: { count: 8, opacity: 0.08, style: 'mixed' },
    entryDirection: 'bottom',
    entryType: 'slide',
    cardRadius: 16,
    cardBorderSide: 'all',
    cardShadowIntensity: 0.9,
    cardBgOpacity: 0.55,
    mirrorLayout: true,
    colorTreatment: 'vibrant',
    overlayOpacity: 0.75,
    badgeShape: 'tag',
    dividerStyle: 'solid',
  },
  RETRO: {
    bgPrimitive: 'scanlines',
    bgPrimitiveConfig: { opacity: 0.06, spacing: 5 },
    entryDirection: 'right',
    entryType: 'slide',
    cardRadius: 0,
    cardBorderSide: 'left',
    cardShadowIntensity: 0.4,
    cardBgOpacity: 0.40,
    mirrorLayout: true,
    colorTreatment: 'standard',
    overlayOpacity: 0.82,
    badgeShape: 'square',
    dividerStyle: 'dotted',
  },
};

const PRESET_ORDER: VariantPresetName[] = ['TECH', 'ELEGANT', 'MINIMAL', 'BOLD', 'RETRO'];

export function getVisualVariant(variantId: number): VisualVariant {
  const idx = Math.abs(variantId) % PRESET_ORDER.length;
  return PRESETS[PRESET_ORDER[idx]];
}

export function useVisualVariant(
  variantId: number,
  accentColor: string,
): VisualVariant & { av: AccentVariants } {
  return useMemo(() => {
    const variant = getVisualVariant(variantId);
    const av = accentVariants(accentColor);
    return { ...variant, av };
  }, [variantId, accentColor]);
}
