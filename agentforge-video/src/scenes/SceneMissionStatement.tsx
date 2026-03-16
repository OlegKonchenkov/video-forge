// agentforge-video/src/scenes/SceneMissionStatement.tsx
// Visual: MANIFESTO — GradientMesh, GeometricShapes circles, WordByWord reveal, glowing values
import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate, spring, AbsoluteFill, staticFile } from 'remotion';
import { Audio } from '@remotion/media';
import { FONT, MONO_FONT } from '../font';
import { NoiseOverlay } from '../shared/NoiseOverlay';
import { SceneCounter } from '../shared/SceneCounter';
import { WordByWord } from '../shared/WordByWord';
import { useSceneLayout } from '../shared/useSceneLayout';
import { useVisualVariant } from '../shared/useVisualVariant';
import { VariantBackground } from '../shared/VariantBackground';
import type { SceneMissionStatementProps, SharedSceneProps } from '../types';

export const SceneMissionStatement: React.FC<SceneMissionStatementProps & SharedSceneProps> = ({
  statement, values,
  accentColor, bgColor, showImage, audioPath, sceneIndex, sceneTotal, variantId,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames: dur } = useVideoConfig();
  const variant = useVisualVariant(variantId, accentColor);
  const av = variant.av;
  const layout = useSceneLayout();

  const CUE_STATEMENT = 0;
  const CUE_DIVIDER   = dur * 0.60;
  const CUE_VALUES    = dur * 0.68;

  const bgReveal = interpolate(frame, [0, 30], [0, 1], { extrapolateRight: 'clamp' });

  const dividerW  = interpolate(
    spring({ frame: frame - CUE_DIVIDER, fps, config: { damping: 200 } }),
    [0, 1], [0, layout.isPortrait ? layout.maxContentWidth * 0.45 : 640],
  );
  const dividerOp = interpolate(frame - CUE_DIVIDER, [0, 12], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  const valueCues = [CUE_VALUES, CUE_VALUES + dur * 0.06, CUE_VALUES + dur * 0.12];

  const statementFontSize = Math.max(
    layout.bodySize + 8,
    Math.round(layout.headingSize * (layout.isPortrait ? 0.85 : 0.90)),
  );

  // Pulsing divider glow
  const divGlow = 0.6 + Math.sin(frame * 0.10) * 0.4;

  const exitOp = interpolate(frame, [dur * 0.88, dur * 0.88 + 10], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{ backgroundColor: bgColor, overflow: 'hidden' }}>
      {showImage && (
        <>
          <AbsoluteFill style={{ backgroundImage: `url(${staticFile(`images/scene_${sceneIndex}.png`)})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
          <AbsoluteFill style={{ backgroundColor: 'rgba(0,0,0,0.78)' }} />
        </>
      )}

      {/* Variant background */}
      <VariantBackground variant={variant} accentColor={accentColor} />

      {/* Giant decorative quote mark */}
      <AbsoluteFill style={{
        display: 'flex', alignItems: 'flex-start',
        justifyContent: layout.isPortrait ? 'flex-start' : 'center',
        pointerEvents: 'none',
        padding: `${layout.outerPadding * 0.5}px ${layout.outerPadding}px`,
      }}>
        <div style={{
          fontSize: layout.isPortrait ? 200 : 320,
          fontFamily: FONT,
          color: accentColor,
          opacity: bgReveal * 0.07,
          lineHeight: 1,
          fontWeight: '900',
        }}>
          "
        </div>
      </AbsoluteFill>

      <NoiseOverlay />

      <AbsoluteFill style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: `0 ${layout.outerPadding + (layout.isPortrait ? 0 : 60)}px`,
        gap: layout.isPortrait ? layout.innerGap * 0.6 : 32,
        opacity: exitOp,
      }}>
        {/* Statement — word by word */}
        <div style={{ maxWidth: layout.maxContentWidth, textAlign: 'center' as const }}>
          <WordByWord
            text={statement}
            frame={frame}
            fps={fps}
            startFrame={CUE_STATEMENT}
            staggerFrames={3}
            wordStyle={{
              fontSize: statementFontSize,
              fontWeight: '700',
              color: '#f1f5f9',
              fontFamily: FONT,
              lineHeight: 1.45,
              letterSpacing: '-0.5px',
              textShadow: '0 2px 20px rgba(0,0,0,0.7)',
            }}
          />
        </div>

        {/* Animated divider with glow */}
        <div style={{ opacity: dividerOp }}>
          <div style={{
            width: dividerW, height: 2,
            background: `linear-gradient(90deg, transparent, ${accentColor}, transparent)`,
            boxShadow: `0 0 ${12 * divGlow}px ${av.glow}`,
          }} />
        </div>

        {/* Value pills */}
        <div style={{
          display: 'flex',
          flexDirection: 'row' as const,
          flexWrap: 'wrap' as const,
          gap: layout.cardGap,
          justifyContent: 'center',
          alignItems: 'center',
        }}>
          {values.map((val, i) => {
            const cue = valueCues[i];
            const p   = spring({ frame: frame - cue, fps, config: { damping: 15 } });
            const sc  = interpolate(p, [0, 1], [0.65, 1]);
            const op  = interpolate(frame - cue, [0, 10], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
            return (
              <div key={i} style={{ opacity: op, transform: `scale(${sc})` }}>
                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: 10,
                  background: av.bg,
                  border: `1px solid ${av.border}`,
                  borderTop: `2px solid ${accentColor}`,
                  borderRadius: 100,
                  padding: `${layout.isPortrait ? 10 : 12}px ${layout.isPortrait ? 18 : 26}px`,
                  boxShadow: `0 0 20px ${av.glow}`,
                }}>
                  <div style={{
                    width: 6, height: 6, borderRadius: '50%',
                    background: accentColor, flexShrink: 0,
                    boxShadow: `0 0 8px ${av.glow}`,
                  }} />
                  <span style={{
                    fontSize: layout.isPortrait ? layout.labelSize + 2 : layout.bodySize - 4,
                    fontFamily: MONO_FONT,
                    color: '#f1f5f9',
                    fontWeight: '600',
                    letterSpacing: '1.5px',
                    textTransform: 'uppercase' as const,
                  }}>
                    {val}
                  </span>
                </div>
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
