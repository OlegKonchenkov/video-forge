// agentforge-video/src/scenes/SceneBigStat.tsx
import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate, spring, AbsoluteFill, staticFile } from 'remotion';
import { Audio } from '@remotion/media';
import { FONT, DISPLAY_FONT } from '../font';
import { NoiseOverlay } from '../shared/NoiseOverlay';
import { SceneCounter } from '../shared/SceneCounter';
import { PulseRing } from '../shared/svg/PulseRing';
import { accentVariants } from '../shared/colorUtils';
import { useSceneLayout } from '../shared/useSceneLayout';
import type { SceneBigStatProps, SharedSceneProps } from '../types';

const CHARS = '0123456789';

function scrambleNum(target: string, frame: number, startFrame: number): string {
  const elapsed = frame - startFrame;
  if (elapsed < 0) return target.replace(/[0-9]/g, '0');
  if (elapsed >= 40) return target;
  return target.split('').map((ch) => {
    if (!/[0-9]/.test(ch)) return ch;
    const progress = elapsed / 40;
    const settled = Math.random() < progress * 1.4;
    return settled ? ch : CHARS[Math.floor(Math.random() * CHARS.length)];
  }).join('');
}

export const SceneBigStat: React.FC<SceneBigStatProps & SharedSceneProps> = ({
  value, unit, label, sub,
  accentColor, bgColor, showImage, audioPath, sceneIndex, sceneTotal,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames: dur, height } = useVideoConfig();
  const av = accentVariants(accentColor);
  const layout = useSceneLayout();

  const CUE_VALUE = dur * 0.12;
  const CUE_UNIT  = dur * 0.38;
  const CUE_LABEL = dur * 0.50;
  const CUE_SUB   = dur * 0.62;

  const bgGlow  = interpolate(frame - CUE_VALUE, [0, 40], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const valueP  = spring({ frame: frame - CUE_VALUE, fps, config: { damping: 200 } });
  const valueY  = interpolate(valueP, [0, 1], [60, 0]);
  const valueOp = interpolate(frame - CUE_VALUE, [0, 20], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const unitOp  = interpolate(frame - CUE_UNIT, [0, 18], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const labelOp = interpolate(frame - CUE_LABEL, [0, 15], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const subOp   = interpolate(frame - CUE_SUB, [0, 15], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  const displayValue = scrambleNum(value, frame, CUE_VALUE);
  const rawFontSize  = Math.max(layout.headingSize, Math.round(layout.displaySize * 2.2) - value.length * 6);
  const valueFontSize = Math.min(rawFontSize, Math.round(height * 0.32));

  return (
    <AbsoluteFill style={{ backgroundColor: bgColor, overflow: 'hidden' }}>
      {showImage && (
        <>
          <AbsoluteFill style={{ backgroundImage: `url(${staticFile(`images/scene_${sceneIndex}.png`)})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
          <AbsoluteFill style={{ backgroundColor: 'rgba(0,0,0,0.62)' }} />
        </>
      )}
      {/* Radial glow that blooms with the stat */}
      <AbsoluteFill style={{
        background: `radial-gradient(ellipse at 50% 50%, ${av.glow} 0%, transparent 55%)`,
        opacity: bgGlow * 0.8,
      }} />
      <PulseRing color={av.border} baseSize={300} minScale={0.7} maxScale={2.0} period={70} count={2} />
      <NoiseOverlay />

      <AbsoluteFill style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        gap: layout.isPortrait ? layout.cardGap : 20,
        padding: `0 ${layout.outerPadding}px`,
      }}>
        {/* Giant stat value */}
        <div style={{ opacity: valueOp, transform: `translateY(${valueY}px)`, textAlign: 'center' as const, position: 'relative' as const }}>
          <div style={{
            position: 'absolute' as const, top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '200%', height: '200%',
            background: `radial-gradient(circle, ${av.glow} 0%, transparent 60%)`,
            opacity: bgGlow * 0.6,
            pointerEvents: 'none',
          }} />
          <div style={{
            fontSize: valueFontSize,
            fontFamily: DISPLAY_FONT,
            color: accentColor,
            lineHeight: 1,
            letterSpacing: '-4px',
            textShadow: `0 0 60px ${av.glow}`,
          }}>
            {displayValue}
          </div>
        </div>

        {/* Unit */}
        <div style={{ opacity: unitOp }}>
          <div style={{
            fontSize: layout.headingSize - 4,
            fontWeight: '700',
            color: '#f1f5f9',
            fontFamily: FONT,
            textAlign: 'center' as const,
            letterSpacing: '2px',
            textTransform: 'uppercase' as const,
          }}>
            {unit}
          </div>
        </div>

        {/* Divider */}
        <div style={{ width: 80, height: 1, background: `linear-gradient(90deg, transparent, ${accentColor}, transparent)` }} />

        {/* Label */}
        <div style={{ opacity: labelOp, textAlign: 'center' as const }}>
          <div style={{ fontSize: layout.bodySize + 4, color: 'rgba(241,245,249,0.8)', fontFamily: FONT, fontWeight: '500', letterSpacing: '0.3px' }}>
            {label}
          </div>
        </div>

        {/* Sub */}
        <div style={{ opacity: subOp, textAlign: 'center' as const }}>
          <div style={{ fontSize: layout.bodySize - 2, color: 'rgba(148,163,184,0.80)', fontFamily: FONT, fontWeight: '400', maxWidth: layout.maxContentWidth }}>
            {sub}
          </div>
        </div>
      </AbsoluteFill>

      <SceneCounter current={sceneIndex + 1} total={sceneTotal} />
      {audioPath && <Audio src={staticFile(audioPath)} />}
    </AbsoluteFill>
  );
};
