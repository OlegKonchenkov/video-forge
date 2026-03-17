// agentforge-video/src/scenes/SceneGuarantee.tsx
// Visual: TRUST SHIELD — animated shield SVG draw-in, guarantee cards, CornerBrackets
import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate, spring, AbsoluteFill, staticFile } from 'remotion';
import { Audio } from '@remotion/media';
import { evolvePath } from '@remotion/paths';
import { FONT, MONO_FONT } from '../font';
import { NoiseOverlay } from '../shared/NoiseOverlay';
import { SceneCounter } from '../shared/SceneCounter';
import { useSceneLayout } from '../shared/useSceneLayout';
import { useVisualVariant } from '../shared/useVisualVariant';
import { VariantBackground } from '../shared/VariantBackground';
import { CornerBrackets } from '../shared/SvgDecorations';
import { SceneBackground } from '../shared/SceneBackground';
import type { SceneGuaranteeProps, SharedSceneProps } from '../types';

const SHIELD_PATH = 'M60 10 L110 30 L110 70 C110 100 85 120 60 130 C35 120 10 100 10 70 L10 30 Z';
const CHECK_PATH = 'M35 68 L52 85 L85 52';

export const SceneGuarantee: React.FC<SceneGuaranteeProps & SharedSceneProps> = ({
  title, guarantees,
  accentColor, bgColor, showImage, audioPath, sceneIndex, sceneTotal, variantId,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames: dur } = useVideoConfig();
  const variant = useVisualVariant(variantId, accentColor);
  const av = variant.av;
  const layout = useSceneLayout();

  const CUE_SHIELD   = dur * 0.04;
  const SHIELD_END   = dur * 0.28;
  const CUE_TITLE    = dur * 0.30;
  const guaranteeCues = [dur * 0.44, dur * 0.58, dur * 0.72];

  // Shield stroke draw-in (0 to 1 over the draw period) — evolvePath for precise path measurement
  const shieldDraw = interpolate(frame, [CUE_SHIELD, SHIELD_END], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const shieldEvo = evolvePath(shieldDraw, SHIELD_PATH);

  // Checkmark draws after shield completes
  const checkDraw = interpolate(frame, [SHIELD_END, SHIELD_END + 15], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const checkEvo = evolvePath(checkDraw, CHECK_PATH);

  // Shield glow pulse after drawn
  const shieldGlow = shieldDraw >= 1 ? 0.5 + Math.sin(frame * 0.08) * 0.5 : 0;

  const titleOp = interpolate(frame - CUE_TITLE, [0, 16], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const titleY  = interpolate(spring({ frame: frame - CUE_TITLE, fps, config: { damping: 200 } }), [0, 1], [18, 0]);

  const exitOp = interpolate(frame, [dur * 0.88, dur * 0.88 + 10], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  const shieldScale = layout.isPortrait ? 0.9 : 1.1;

  return (
    <AbsoluteFill style={{ backgroundColor: bgColor, overflow: 'hidden' }}>
      <SceneBackground showImage={showImage} sceneIndex={sceneIndex} />

      <VariantBackground variant={variant} accentColor={accentColor} />
      <CornerBrackets color={accentColor} size={layout.isPortrait ? 16 : 24} offset={layout.isPortrait ? 28 : 40} startFrame={Math.round(CUE_SHIELD)} opacity={0.18} />
      <NoiseOverlay />

      <AbsoluteFill style={{
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: `0 ${layout.outerPadding}px`,
        gap: layout.innerGap * 0.7,
        opacity: exitOp,
      }}>
        {/* Shield SVG with draw-in animation */}
        <div style={{ position: 'relative' as const }}>
          {/* Glow behind shield */}
          <div style={{
            position: 'absolute' as const,
            top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 200 * shieldScale, height: 200 * shieldScale,
            borderRadius: '50%',
            background: `radial-gradient(circle, ${accentColor}25 0%, transparent 70%)`,
            opacity: shieldGlow,
            pointerEvents: 'none',
          }} />

          <svg
            width={120 * shieldScale}
            height={140 * shieldScale}
            viewBox="0 0 120 140"
            style={{ position: 'relative' as const, zIndex: 1 }}
          >
            {/* Shield outline */}
            <path
              d={SHIELD_PATH}
              fill="none"
              stroke={accentColor}
              strokeWidth={3}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray={shieldEvo.strokeDasharray}
              strokeDashoffset={shieldEvo.strokeDashoffset}
              style={{ filter: `drop-shadow(0 0 12px ${av.glow})` }}
            />
            {/* Shield fill (appears when fully drawn) */}
            <path
              d={SHIELD_PATH}
              fill={`${accentColor}10`}
              stroke="none"
              opacity={shieldDraw}
            />
            {/* Checkmark */}
            <path
              d={CHECK_PATH}
              fill="none"
              stroke="#ffffff"
              strokeWidth={4}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray={checkEvo.strokeDasharray}
              strokeDashoffset={checkEvo.strokeDashoffset}
              style={{ filter: 'drop-shadow(0 1px 4px rgba(0,0,0,0.5))' }}
            />
          </svg>
        </div>

        {/* Title */}
        <div style={{
          opacity: titleOp, transform: `translateY(${titleY}px)`,
          textAlign: 'center' as const,
        }}>
          <div style={{
            fontSize: layout.headingSize, fontWeight: '800', color: '#f1f5f9',
            fontFamily: FONT, letterSpacing: '-1px',
            textShadow: '0 2px 16px rgba(0,0,0,0.7)',
          }}>
            {title}
          </div>
        </div>

        {/* Guarantee points */}
        <div style={{
          display: 'flex', flexDirection: 'column', gap: layout.cardGap,
          width: '100%', maxWidth: 700,
        }}>
          {guarantees.map((g, i) => {
            const cue = guaranteeCues[i];
            const p   = spring({ frame: frame - cue, fps, config: { damping: 200 } });
            const x   = interpolate(p, [0, 1], [40, 0]);
            const op  = interpolate(frame - cue, [0, 14], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

            return (
              <div key={i} style={{
                opacity: op, transform: `translateX(${x}px)`,
                display: 'flex', alignItems: 'center', gap: 16,
                background: 'rgba(255,255,255,0.04)',
                borderRadius: 14,
                border: `1px solid ${av.border}`,
                padding: '14px 20px',
                boxShadow: `0 0 20px ${av.glow}`,
              }}>
                {/* Check circle */}
                <div style={{
                  width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                  background: `${accentColor}20`,
                  border: `1px solid ${accentColor}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: `0 0 12px ${av.glow}`,
                }}>
                  <span style={{ fontSize: 16, color: accentColor }}>✓</span>
                </div>
                <span style={{
                  fontSize: layout.bodySize - 2, color: '#f1f5f9',
                  fontFamily: FONT, fontWeight: '500', lineHeight: 1.4,
                  textShadow: '0 1px 8px rgba(0,0,0,0.5)',
                }}>
                  {g}
                </span>
              </div>
            );
          })}
        </div>
      </AbsoluteFill>

      <SceneCounter current={sceneIndex + 1} total={sceneTotal} />
      {audioPath && <Audio src={staticFile(audioPath)} />}
    </AbsoluteFill>
  );
};
