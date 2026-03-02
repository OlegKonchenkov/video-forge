// agentforge-video/src/scenes/SceneComparison.tsx
import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate, spring, AbsoluteFill, staticFile } from 'remotion';
import { Audio } from '@remotion/media';
import { FONT, MONO_FONT } from '../font';
import { NoiseOverlay } from '../shared/NoiseOverlay';
import { SceneCounter } from '../shared/SceneCounter';
import { accentVariants } from '../shared/colorUtils';
import { useSceneLayout } from '../shared/useSceneLayout';
import type { SceneComparisonProps, SharedSceneProps } from '../types';

export const SceneComparison: React.FC<SceneComparisonProps & SharedSceneProps> = ({
  competitorLabel, brandLabel, features,
  accentColor, brandName, audioPath, sceneIndex, sceneTotal,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames: dur } = useVideoConfig();
  const av = accentVariants(accentColor);
  const layout = useSceneLayout();

  const CUE_HEADER = 0;
  const rowCues    = features.map((_, i) => dur * 0.18 + i * (dur * 0.09));

  const headerOp = interpolate(frame, [CUE_HEADER, CUE_HEADER + 20], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const headerY  = interpolate(spring({ frame, fps, config: { damping: 200 } }), [0, 1], [20, 0]);

  const displayFeatures = features.slice(0, 6);

  const compColW  = layout.isPortrait ? 130 : 180;
  const brandColW = layout.isPortrait ? 150 : 200;

  return (
    <AbsoluteFill style={{ backgroundColor: '#050d1a', overflow: 'hidden' }}>
      <AbsoluteFill style={{ background: `radial-gradient(ellipse at 75% 50%, ${av.bg} 0%, transparent 55%)` }} />
      <NoiseOverlay />

      <AbsoluteFill style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: `0 ${layout.outerPadding}px`, gap: 0 }}>
        {/* Table */}
        <div style={{ width: '100%', maxWidth: layout.isPortrait ? layout.maxContentWidth : 860 }}>
          {/* Header row */}
          <div style={{ opacity: headerOp, transform: `translateY(${headerY}px)`, display: 'flex', marginBottom: 16 }}>
            <div style={{ flex: 1 }} />
            {/* Competitor header */}
            <div style={{ width: compColW, textAlign: 'center' as const, padding: '12px 0' }}>
              <span style={{ fontSize: layout.labelSize, color: 'rgba(148,163,184,0.55)', fontFamily: MONO_FONT, letterSpacing: '2px', textTransform: 'uppercase' as const }}>
                {competitorLabel}
              </span>
            </div>
            {/* Brand header — highlighted */}
            <div style={{
              width: brandColW,
              background: av.bg,
              borderRadius: '12px 12px 0 0',
              border: `1px solid ${av.border}`,
              borderBottom: 'none',
              borderTop: `2px solid ${accentColor}`,
              textAlign: 'center' as const,
              padding: '14px 0',
            }}>
              <span style={{ fontSize: layout.labelSize, color: accentColor, fontFamily: MONO_FONT, letterSpacing: '2px', textTransform: 'uppercase' as const, fontWeight: '600' }}>
                {brandLabel || brandName}
              </span>
            </div>
          </div>

          {/* Feature rows */}
          {displayFeatures.map((feat, i) => {
            const cue = rowCues[i];
            const p   = spring({ frame: frame - cue, fps, config: { damping: 200 } });
            const x   = interpolate(p, [0, 1], [-30, 0]);
            const op  = interpolate(frame - cue, [0, 14], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
            const isLast = i === displayFeatures.length - 1;

            return (
              <div key={i} style={{
                opacity: op, transform: `translateX(${x}px)`,
                display: 'flex',
                borderBottom: isLast ? 'none' : `1px solid rgba(148,163,184,0.08)`,
              }}>
                {/* Feature label */}
                <div style={{ flex: 1, padding: '14px 0', display: 'flex', alignItems: 'center' }}>
                  <span style={{ fontSize: layout.bodySize - 4, color: 'rgba(241,245,249,0.85)', fontFamily: FONT, fontWeight: '500' }}>{feat.label}</span>
                </div>

                {/* Competitor cell */}
                <div style={{ width: compColW, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: '50%',
                    background: feat.competitor ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.12)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <span style={{ fontSize: 18, color: feat.competitor ? '#22c55e' : '#ef4444' }}>
                      {feat.competitor ? '✓' : '✗'}
                    </span>
                  </div>
                </div>

                {/* Brand cell — highlighted column */}
                <div style={{
                  width: brandColW,
                  background: av.bg,
                  border: `1px solid ${av.border}`,
                  borderTop: 'none',
                  borderBottom: isLast ? `1px solid ${av.border}` : 'none',
                  borderRadius: isLast ? '0 0 12px 12px' : 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: '50%',
                    background: feat.brand ? `${av.bg}` : 'rgba(239,68,68,0.12)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: feat.brand ? `0 0 10px ${av.glow}` : 'none',
                  }}>
                    <span style={{ fontSize: 18, color: feat.brand ? accentColor : '#ef4444', fontWeight: '700' }}>
                      {feat.brand ? '✓' : '✗'}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </AbsoluteFill>

      <SceneCounter current={sceneIndex + 1} total={sceneTotal} />
      <Audio src={staticFile(audioPath)} />
    </AbsoluteFill>
  );
};
