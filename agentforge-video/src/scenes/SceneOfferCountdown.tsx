// agentforge-video/src/scenes/SceneOfferCountdown.tsx
import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate, spring, AbsoluteFill, staticFile } from 'remotion';
import { Audio } from '@remotion/media';
import { FONT, MONO_FONT } from '../font';
import { NoiseOverlay } from '../shared/NoiseOverlay';
import { SceneCounter } from '../shared/SceneCounter';
import { accentVariants } from '../shared/colorUtils';
import { useSceneLayout } from '../shared/useSceneLayout';
import type { SceneOfferCountdownProps, SharedSceneProps } from '../types';

export const SceneOfferCountdown: React.FC<SceneOfferCountdownProps & SharedSceneProps> = ({
  badge, offer, benefit, urgency,
  accentColor, bgColor, showImage, audioPath, sceneIndex, sceneTotal,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames: dur } = useVideoConfig();
  const av = accentVariants(accentColor);
  const layout = useSceneLayout();

  const CUE_BADGE   = 0;
  const CUE_OFFER   = dur * 0.20;
  const CUE_BENEFIT = dur * 0.40;
  const CUE_BAR     = dur * 0.55;
  const CUE_URGENCY = dur * 0.72;

  const badgeOp = interpolate(frame - CUE_BADGE, [0, 15], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const badgeSc = interpolate(spring({ frame: frame - CUE_BADGE, fps, config: { damping: 15 } }), [0, 1], [0.5, 1]);

  const offerOp = interpolate(frame - CUE_OFFER, [0, 20], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const offerY  = interpolate(spring({ frame: frame - CUE_OFFER, fps, config: { damping: 200 } }), [0, 1], [30, 0]);

  const benefitOp = interpolate(frame - CUE_BENEFIT, [0, 18], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  // Progress bar depletes from 78% → 23% over the visible duration
  const barWidth = interpolate(frame - CUE_BAR, [0, dur - CUE_BAR], [78, 23], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const barOp   = interpolate(frame - CUE_BAR, [0, 15], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  const urgencyOp = interpolate(frame - CUE_URGENCY, [0, 15], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  // Urgency flash
  const urgencyFlash = interpolate(frame % 45, [0, 22, 45], [1, 0.4, 1]);

  return (
    <AbsoluteFill style={{ backgroundColor: bgColor, overflow: 'hidden' }}>
      {showImage && (
        <>
          {/* Scene background image */}
          <AbsoluteFill style={{ backgroundImage: `url(${staticFile(`images/scene_${sceneIndex}.png`)})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
          {/* Dark overlay */}
          <AbsoluteFill style={{ backgroundColor: 'rgba(0,0,0,0.50)' }} />
        </>
      )}
      <AbsoluteFill style={{ background: `radial-gradient(ellipse at 50% 40%, ${av.bg} 0%, transparent 65%)` }} />
      <NoiseOverlay />

      <AbsoluteFill style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: `0 ${layout.outerPadding}px`, gap: layout.innerGap * 0.8 }}>
        {/* Badge */}
        <div style={{ opacity: badgeOp, transform: `scale(${badgeSc})` }}>
          <div style={{
            display: 'inline-block', background: av.bg,
            border: `1px solid ${av.strong}`, borderRadius: 100,
            padding: '8px 24px',
          }}>
            <span style={{ fontSize: layout.labelSize, color: accentColor, fontFamily: MONO_FONT, letterSpacing: '2px', textTransform: 'uppercase' as const, fontWeight: '600' }}>
              {badge}
            </span>
          </div>
        </div>

        {/* Main offer text */}
        <div style={{ opacity: offerOp, transform: `translateY(${offerY}px)`, textAlign: 'center' as const }}>
          <div style={{ fontSize: layout.headingSize + 12, fontWeight: '800', color: '#f1f5f9', fontFamily: FONT, lineHeight: 1.1, letterSpacing: '-2px' }}>
            {offer}
          </div>
        </div>

        {/* Benefit */}
        <div style={{ opacity: benefitOp, textAlign: 'center' as const }}>
          <div style={{ fontSize: layout.bodySize, color: 'rgba(148,163,184,0.8)', fontFamily: FONT, fontWeight: '400' }}>
            {benefit}
          </div>
        </div>

        {/* Progress bar */}
        <div style={{ opacity: barOp, width: '100%', maxWidth: layout.isPortrait ? layout.maxContentWidth : 600 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
            <span style={{ fontSize: layout.labelSize - 2, color: 'rgba(148,163,184,0.6)', fontFamily: MONO_FONT, letterSpacing: '1px' }}>SPOTS REMAINING</span>
            <span style={{ fontSize: layout.labelSize - 2, color: accentColor, fontFamily: MONO_FONT, letterSpacing: '1px', fontWeight: '600' }}>{Math.round(barWidth)}%</span>
          </div>
          <div style={{ width: '100%', height: 8, background: 'rgba(148,163,184,0.12)', borderRadius: 4, overflow: 'hidden' }}>
            <div style={{
              width: `${barWidth}%`, height: '100%',
              background: `linear-gradient(90deg, ${accentColor}, ${av.strong})`,
              borderRadius: 4,
              boxShadow: `0 0 12px ${av.glow}`,
            }} />
          </div>
        </div>

        {/* Urgency text */}
        <div style={{ opacity: urgencyOp * urgencyFlash }}>
          <div style={{ fontSize: layout.bodySize - 4, color: '#ef4444', fontFamily: MONO_FONT, letterSpacing: '1.5px', textTransform: 'uppercase' as const, fontWeight: '600' }}>
            ⚡ {urgency}
          </div>
        </div>
      </AbsoluteFill>

      <SceneCounter current={sceneIndex + 1} total={sceneTotal} />
      {audioPath && <Audio src={staticFile(audioPath)} />}
    </AbsoluteFill>
  );
};
