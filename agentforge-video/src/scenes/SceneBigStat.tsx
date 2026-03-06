// agentforge-video/src/scenes/SceneBigStat.tsx
// IMPACT NUMBER — gradient mesh + kinetic scale-in number + geometric circles + deep glow
import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate, spring, AbsoluteFill, staticFile } from 'remotion';
import { Audio } from '@remotion/media';
import { FONT, MONO_FONT } from '../font';
import { NoiseOverlay } from '../shared/NoiseOverlay';
import { SceneCounter } from '../shared/SceneCounter';
import { accentVariants } from '../shared/colorUtils';
import { useSceneLayout } from '../shared/useSceneLayout';
import { GradientMesh } from '../shared/GradientMesh';
import { KineticText } from '../shared/KineticText';
import { GeometricShapes } from '../shared/GeometricShapes';
import type { SceneBigStatProps, SharedSceneProps } from '../types';

export const SceneBigStat: React.FC<SceneBigStatProps & SharedSceneProps> = ({
  value, unit, label, sub,
  accentColor, bgColor, showImage, audioPath, sceneIndex, sceneTotal,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames: dur, height } = useVideoConfig();
  const av = accentVariants(accentColor);
  const layout = useSceneLayout();

  const CUE_VALUE = dur * 0.10;
  const CUE_UNIT  = dur * 0.36;
  const CUE_LABEL = dur * 0.48;
  const CUE_SUB   = dur * 0.60;

  const bgGlow  = interpolate(frame - CUE_VALUE, [0, 40], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const unitOp  = interpolate(frame - CUE_UNIT, [0, 18], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const unitY   = interpolate(spring({ frame: frame - CUE_UNIT, fps, config: { damping: 200 } }), [0, 1], [24, 0]);
  const labelOp = interpolate(frame - CUE_LABEL, [0, 15], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const subOp   = interpolate(frame - CUE_SUB, [0, 15], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const exitOp  = interpolate(frame, [dur * 0.88, dur * 0.88 + 12], [1, 0.3], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  const rawFontSize   = Math.max(layout.headingSize, Math.round(layout.displaySize * 2.2) - value.length * 6);
  const valueFontSize = Math.min(rawFontSize, Math.round(height * 0.32));

  return (
    <AbsoluteFill style={{ backgroundColor: bgColor, overflow: 'hidden' }}>
      {showImage && (
        <>
          <AbsoluteFill style={{ backgroundImage: `url(${staticFile(`images/scene_${sceneIndex}.png`)})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
          <AbsoluteFill style={{ backgroundColor: 'rgba(0,0,0,0.78)' }} />
        </>
      )}

      {/* Gradient mesh — dynamic centrepiece */}
      <GradientMesh colors={[accentColor, accentColor, bgColor]} speed={1.0} opacity={0.4} />
      {/* Expanding circles — suggest magnitude */}
      <GeometricShapes color={accentColor} opacity={0.06} count={4} style="circles" />
      {/* Central radial glow that blooms with stat */}
      <AbsoluteFill style={{
        background: `radial-gradient(ellipse at 50% 50%, ${av.glow} 0%, transparent 55%)`,
        opacity: bgGlow * 0.75,
      }} />
      <NoiseOverlay />

      <AbsoluteFill style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        gap: layout.isPortrait ? layout.cardGap : 20,
        padding: `0 ${layout.outerPadding}px`,
        opacity: exitOp,
      }}>
        {/* Giant kinetic stat value */}
        <div style={{ position: 'relative' as const, textAlign: 'center' as const }}>
          {/* Inner glow orb */}
          <div style={{
            position: 'absolute' as const, top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '220%', height: '220%',
            background: `radial-gradient(circle, ${av.glow} 0%, transparent 60%)`,
            opacity: bgGlow * 0.55,
            pointerEvents: 'none',
          }} />
          <KineticText
            text={value}
            startFrame={CUE_VALUE}
            fps={fps}
            type="scale-in"
            staggerFrames={3}
            style={{
              fontSize: valueFontSize,
              fontFamily: FONT,
              fontWeight: '900' as const,
              color: accentColor,
              lineHeight: 1,
              letterSpacing: '-4px',
              textShadow: `0 2px 20px rgba(0,0,0,0.9), 0 0 80px ${av.glow}`,
            }}
          />
        </div>

        {/* Unit */}
        <div style={{ opacity: unitOp, transform: `translateY(${unitY}px)` }}>
          <div style={{
            fontSize: layout.headingSize - 4, fontWeight: '700',
            color: '#f1f5f9', fontFamily: FONT,
            textAlign: 'center' as const, letterSpacing: '3px',
            textTransform: 'uppercase' as const,
            textShadow: '0 2px 16px rgba(0,0,0,0.9)',
          }}>
            {unit}
          </div>
        </div>

        {/* Divider */}
        <div style={{ width: 90, height: 2, background: `linear-gradient(90deg, transparent, ${accentColor}, transparent)`, boxShadow: `0 0 10px ${accentColor}` }} />

        {/* Label */}
        <div style={{ opacity: labelOp, textAlign: 'center' as const }}>
          <div style={{ fontSize: layout.bodySize + 4, color: 'rgba(241,245,249,0.85)', fontFamily: FONT, fontWeight: '500', letterSpacing: '0.3px', textShadow: '0 1px 12px rgba(0,0,0,0.85)' }}>
            {label}
          </div>
        </div>

        {/* Sub */}
        <div style={{ opacity: subOp, textAlign: 'center' as const }}>
          <div style={{ fontSize: layout.bodySize - 2, color: 'rgba(148,163,184,0.80)', fontFamily: MONO_FONT, fontWeight: '400', maxWidth: layout.maxContentWidth, textShadow: '0 1px 8px rgba(0,0,0,0.8)' }}>
            {sub}
          </div>
        </div>
      </AbsoluteFill>

      <SceneCounter current={sceneIndex + 1} total={sceneTotal} />
      {audioPath && <Audio src={staticFile(audioPath)} />}
    </AbsoluteFill>
  );
};
