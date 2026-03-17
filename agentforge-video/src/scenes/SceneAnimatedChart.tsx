// agentforge-video/src/scenes/SceneAnimatedChart.tsx
// Visual: BAR CHART — horizontal bars growing L→R, count-up values, TechGrid background
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
import { TechGrid } from '../shared/SvgDecorations';
import { SceneBackground } from '../shared/SceneBackground';
import type { SceneAnimatedChartProps, SharedSceneProps } from '../types';

export const SceneAnimatedChart: React.FC<SceneAnimatedChartProps & SharedSceneProps> = ({
  title, bars,
  accentColor, bgColor, showImage, audioPath, sceneIndex, sceneTotal, variantId,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames: dur } = useVideoConfig();
  const variant = useVisualVariant(variantId, accentColor);
  const av = variant.av;
  const layout = useSceneLayout();

  const CUE_TITLE = dur * 0.04;
  const numBars = Math.min(bars.length, 4);
  const barCues = Array.from({ length: numBars }, (_, i) => dur * 0.18 + i * dur * 0.14);

  const titleOp = interpolate(frame - CUE_TITLE, [0, 16], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const titleY  = interpolate(spring({ frame: frame - CUE_TITLE, fps, config: { damping: 200 } }), [0, 1], [20, 0]);

  const exitOp = interpolate(frame, [dur * 0.88, dur * 0.88 + 10], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  // Find max value for proportional bar sizing
  const maxVal = Math.max(...bars.slice(0, numBars).map(b => b.value), 1);

  const barMaxWidth = layout.isPortrait
    ? layout.width - layout.outerPadding * 2 - 140
    : layout.width - layout.outerPadding * 2 - 300;

  return (
    <AbsoluteFill style={{ backgroundColor: bgColor, overflow: 'hidden' }}>
      <SceneBackground showImage={showImage} sceneIndex={sceneIndex} />

      <VariantBackground variant={variant} accentColor={accentColor} />
      <TechGrid color={accentColor} cellSize={layout.isPortrait ? 44 : 52} opacity={0.04} />
      <NoiseOverlay />

      <AbsoluteFill style={{
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: `0 ${layout.outerPadding}px`,
        gap: layout.innerGap,
        opacity: exitOp,
      }}>
        {/* Title */}
        <div style={{ opacity: titleOp, transform: `translateY(${titleY}px)`, textAlign: 'center' as const }}>
          <div style={{
            fontSize: layout.labelSize, color: accentColor, fontFamily: MONO_FONT,
            letterSpacing: '3px', textTransform: 'uppercase' as const, marginBottom: 10,
            textShadow: `0 0 16px ${av.glow}`,
          }}>
            ◈ DATA
          </div>
          <div style={{
            fontSize: layout.headingSize, fontWeight: '800', color: '#f1f5f9',
            fontFamily: FONT, letterSpacing: '-1.5px',
            textShadow: '0 2px 16px rgba(0,0,0,0.7)',
          }}>
            {title}
          </div>
        </div>

        {/* Bar chart */}
        <div style={{
          display: 'flex', flexDirection: 'column',
          gap: layout.cardGap,
          width: '100%', maxWidth: layout.isPortrait ? undefined : 900,
        }}>
          {bars.slice(0, numBars).map((bar, i) => {
            const cue = barCues[i];
            const p   = spring({ frame: frame - cue, fps, config: { damping: 200 } });
            const op  = interpolate(frame - cue, [0, 14], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

            // Bar growth animation (30 frames)
            const growP = interpolate(frame - cue, [0, 30], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
            const barWidth = Math.round((bar.value / maxVal) * barMaxWidth * growP);

            // Count-up for display value (extract number, animate)
            const numMatch = bar.displayValue.match(/[\d,.]+/);
            const numVal = numMatch ? parseFloat(numMatch[0].replace(/,/g, '')) : 0;
            const countP = interpolate(frame - cue - 5, [0, 35], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
            const currentNum = Math.round(numVal * countP);
            const formatted = numVal >= 1000 ? currentNum.toLocaleString() : String(currentNum);
            const displayStr = numMatch
              ? bar.displayValue.replace(numMatch[0], formatted)
              : bar.displayValue;

            const isHighlight = bar.highlight ?? i === 0;

            return (
              <div key={i} style={{ opacity: op }}>
                {/* Label row */}
                <div style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
                  marginBottom: 6,
                }}>
                  <span style={{
                    fontSize: layout.bodySize - 4, color: 'rgba(148,163,184,0.8)',
                    fontFamily: FONT, fontWeight: '500',
                  }}>
                    {bar.label}
                  </span>
                  <span style={{
                    fontSize: layout.bodySize - 2, fontWeight: '800',
                    color: isHighlight ? accentColor : '#f1f5f9',
                    fontFamily: MONO_FONT,
                    textShadow: isHighlight ? `0 0 16px ${av.glow}` : 'none',
                  }}>
                    {displayStr}
                  </span>
                </div>

                {/* Bar track */}
                <div style={{
                  width: '100%', height: layout.isPortrait ? 24 : 32,
                  background: 'rgba(255,255,255,0.04)',
                  borderRadius: 8,
                  border: `1px solid ${av.border}`,
                  overflow: 'hidden',
                  position: 'relative' as const,
                }}>
                  {/* Bar fill */}
                  <div style={{
                    width: barWidth,
                    height: '100%',
                    background: isHighlight
                      ? `linear-gradient(90deg, ${accentColor}, ${av.strong})`
                      : 'linear-gradient(90deg, rgba(148,163,184,0.3), rgba(148,163,184,0.15))',
                    borderRadius: 7,
                    boxShadow: isHighlight ? `0 0 20px ${av.glow}` : 'none',
                  }} />
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
