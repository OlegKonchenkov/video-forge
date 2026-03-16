// agentforge-video/src/scenes/SceneCostCounter.tsx
// Visual: COST IMPACT — GradientMesh, ParticleField, animated counting numbers, deep glow orbs
import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate, spring, AbsoluteFill, staticFile } from 'remotion';
import { Audio } from '@remotion/media';
import { FONT, MONO_FONT } from '../font';
import { NoiseOverlay } from '../shared/NoiseOverlay';
import { SceneCounter } from '../shared/SceneCounter';
import { accentVariants } from '../shared/colorUtils';
import { useSceneLayout } from '../shared/useSceneLayout';
import { useVisualVariant } from '../shared/useVisualVariant';
import { VariantBackground } from '../shared/VariantBackground';
import type { SceneCostCounterProps, SharedSceneProps } from '../types';

const CountStat: React.FC<{
  value: number; unit: string; label: string;
  cue: number; frame: number; fps: number;
  accentColor: string; displaySize: number; bodySize: number;
}> = ({ value, unit, label, cue, frame, fps, accentColor, displaySize, bodySize }) => {
  const av = accentVariants(accentColor);
  const p  = spring({ frame: frame - cue, fps, config: { damping: 200 } });
  const y  = interpolate(p, [0, 1], [50, 0]);
  const op = interpolate(frame - cue, [0, 18], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  const countProgress = interpolate(frame - cue - 10, [0, 50], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const displayValue  = Math.round(value * countProgress);

  const glowSize = interpolate(p, [0, 1], [0, 90]);
  const glowOp   = interpolate(p, [0, 1], [0, 0.55]);

  const formatted    = displayValue >= 1000 ? displayValue.toLocaleString() : String(displayValue);
  const isCurrency   = unit.startsWith('€') || unit.startsWith('$');

  return (
    <div style={{ opacity: op, transform: `translateY(${y}px)`, position: 'relative' as const, textAlign: 'center' as const }}>
      {/* Deep glow orb behind number */}
      <div style={{
        position: 'absolute' as const, top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        width: glowSize * 2.2, height: glowSize * 2.2,
        borderRadius: '50%',
        background: `radial-gradient(circle, ${accentColor}40 0%, transparent 70%)`,
        opacity: glowOp,
        pointerEvents: 'none',
      }} />

      {/* Number */}
      <div style={{
        display: 'flex', alignItems: 'baseline', gap: 6,
        justifyContent: 'center', position: 'relative' as const,
      }}>
        <span style={{
          fontSize: Math.round(displaySize * 1.6),
          color: accentColor,
          fontFamily: MONO_FONT,
          fontWeight: '900',
          lineHeight: 1,
          letterSpacing: '-3px',
          textShadow: `0 0 40px ${av.glow}, 0 2px 16px rgba(0,0,0,0.9)`,
        }}>
          {isCurrency ? unit : ''}{formatted}{isCurrency ? '' : unit}
        </span>
      </div>

      {/* Label */}
      <div style={{
        fontSize: bodySize,
        color: 'rgba(148,163,184,0.8)',
        fontFamily: FONT,
        fontWeight: '500',
        marginTop: -6,
        letterSpacing: '0.5px',
        textShadow: '0 1px 8px rgba(0,0,0,0.8)',
      }}>
        {label}
      </div>

      {/* Separator line */}
      <div style={{
        width: '80%', height: 1,
        background: `linear-gradient(90deg, transparent, ${av.border}, transparent)`,
        margin: '14px auto 0',
      }} />
    </div>
  );
};

export const SceneCostCounter: React.FC<SceneCostCounterProps & SharedSceneProps> = ({
  intro, stat1, stat2,
  accentColor, bgColor, showImage, audioPath, sceneIndex, sceneTotal, variantId,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames: dur } = useVideoConfig();
  const variant = useVisualVariant(variantId, accentColor);
  const layout = useSceneLayout();

  const CUE_INTRO = 0;
  const CUE_STAT1 = dur * 0.22;
  const CUE_STAT2 = dur * 0.54;

  const introOp = interpolate(frame, [CUE_INTRO, CUE_INTRO + 20], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const introY  = interpolate(spring({ frame, fps, config: { damping: 200 } }), [0, 1], [24, 0]);

  const exitOp = interpolate(frame, [dur * 0.88, dur * 0.88 + 10], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{ backgroundColor: bgColor, overflow: 'hidden' }}>
      {showImage && (
        <>
          <AbsoluteFill style={{ backgroundImage: `url(${staticFile(`images/scene_${sceneIndex}.png`)})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
          <AbsoluteFill style={{ backgroundColor: 'rgba(0,0,0,0.80)' }} />
        </>
      )}

      {/* Variant background */}
      <VariantBackground variant={variant} accentColor={accentColor} />

      <NoiseOverlay />

      <AbsoluteFill style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        gap: layout.innerGap,
        padding: `0 ${layout.outerPadding}px`,
        opacity: exitOp,
      }}>
        {/* Intro text */}
        <div style={{ opacity: introOp, transform: `translateY(${introY}px)`, textAlign: 'center' as const }}>
          <div style={{
            fontSize: layout.bodySize + 4,
            color: 'rgba(148,163,184,0.88)',
            fontFamily: FONT,
            fontWeight: '400',
            maxWidth: 800,
            lineHeight: 1.55,
            textShadow: '0 1px 12px rgba(0,0,0,0.85)',
          }}>
            {intro}
          </div>
        </div>

        {/* Stats */}
        <div style={{
          display: 'flex',
          flexDirection: layout.direction,
          gap: layout.isPortrait ? layout.innerGap : 100,
          alignItems: 'center',
        }}>
          <CountStat
            {...stat1}
            cue={CUE_STAT1}
            frame={frame}
            fps={fps}
            accentColor={accentColor}
            displaySize={layout.displaySize}
            bodySize={layout.bodySize}
          />

          {/* Divider */}
          <div style={layout.isPortrait
            ? { width: 160, height: 1, background: `linear-gradient(to right, transparent, rgba(148,163,184,0.2), transparent)` }
            : { width: 1, height: 160, background: `linear-gradient(to bottom, transparent, rgba(148,163,184,0.2), transparent)` }
          } />

          <CountStat
            {...stat2}
            cue={CUE_STAT2}
            frame={frame}
            fps={fps}
            accentColor={accentColor}
            displaySize={layout.displaySize}
            bodySize={layout.bodySize}
          />
        </div>
      </AbsoluteFill>

      <SceneCounter current={sceneIndex + 1} total={sceneTotal} />
      {audioPath && <Audio src={staticFile(audioPath)} />}
    </AbsoluteFill>
  );
};
