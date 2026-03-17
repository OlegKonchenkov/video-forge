// agentforge-video/src/shared/VariantBackground.tsx
// Renders the appropriate background primitive based on variant.bgPrimitive
import React from 'react';
import type { VisualVariant } from './useVisualVariant';
import { hueRotate } from './colorUtils';
import { ParticleField } from './ParticleField';
import { GradientMesh } from './GradientMesh';
import { GeometricShapes } from './GeometricShapes';
import { ScanlineEffect } from './ScanlineEffect';

interface VariantBackgroundProps {
  variant: VisualVariant;
  accentColor: string;
}

export const VariantBackground: React.FC<VariantBackgroundProps> = ({ variant, accentColor }) => {
  const cfg = variant.bgPrimitiveConfig;

  switch (variant.bgPrimitive) {
    case 'particles':
      return (
        <ParticleField
          color={accentColor}
          count={(cfg.count as number) ?? 40}
          opacity={(cfg.opacity as number) ?? 0.25}
          speed={(cfg.speed as number) ?? 1}
          maxRadius={(cfg.maxRadius as number) ?? 3.5}
        />
      );

    case 'gradient_mesh':
      return (
        <GradientMesh
          colors={[accentColor, hueRotate(accentColor, 45), hueRotate(accentColor, -55)]}
          speed={(cfg.speed as number) ?? 1}
          opacity={(cfg.opacity as number) ?? 0.55}
        />
      );

    case 'geometric':
      return (
        <GeometricShapes
          color={accentColor}
          count={(cfg.count as number) ?? 7}
          opacity={(cfg.opacity as number) ?? 0.07}
          style={(cfg.style as 'circles' | 'triangles' | 'hexagons' | 'mixed') ?? 'mixed'}
        />
      );

    case 'scanlines':
      return (
        <ScanlineEffect
          opacity={(cfg.opacity as number) ?? 0.06}
          spacing={(cfg.spacing as number) ?? 4}
        />
      );

    case 'none':
    default:
      return null;
  }
};
