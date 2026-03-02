// agentforge-video/src/scenes/SceneTestimonial.tsx
import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate, spring, AbsoluteFill, staticFile } from 'remotion';
import { Audio } from '@remotion/media';
import { FONT, DISPLAY_FONT, MONO_FONT } from '../font';
import { NoiseOverlay } from '../shared/NoiseOverlay';
import { SceneCounter } from '../shared/SceneCounter';
import { WordByWord } from '../shared/WordByWord';
import { accentVariants } from '../shared/colorUtils';
import { useSceneLayout } from '../shared/useSceneLayout';
import type { SceneTestimonialProps, SharedSceneProps } from '../types';

export const SceneTestimonial: React.FC<SceneTestimonialProps & SharedSceneProps> = ({
  quote, name, role, company,
  accentColor, audioPath, sceneIndex, sceneTotal,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames: dur } = useVideoConfig();
  const av = accentVariants(accentColor);
  const layout = useSceneLayout();

  const CUE_QUOTE  = 0;
  const CUE_AUTHOR = dur * 0.68;
  const CUE_MARK   = 0;

  const markOp = interpolate(frame, [CUE_MARK, CUE_MARK + 20], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const markSc = interpolate(spring({ frame, fps, config: { damping: 200 } }), [0, 1], [0.6, 1]);

  const authorP  = spring({ frame: frame - CUE_AUTHOR, fps, config: { damping: 200 } });
  const authorY  = interpolate(authorP, [0, 1], [30, 0]);
  const authorOp = interpolate(frame - CUE_AUTHOR, [0, 18], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  const displayCompany = company ? ` · ${company}` : '';

  return (
    <AbsoluteFill style={{ backgroundColor: '#050d1a', overflow: 'hidden' }}>
      <AbsoluteFill style={{ background: `radial-gradient(ellipse at 30% 50%, ${av.bg} 0%, transparent 60%)` }} />
      <NoiseOverlay />

      {/* Giant decorative quote mark */}
      <AbsoluteFill style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-start', pointerEvents: 'none', padding: `${layout.outerPadding * 0.5}px ${layout.outerPadding}px` }}>
        <div style={{
          fontSize: layout.isPortrait ? 180 : 300,
          fontFamily: DISPLAY_FONT,
          color: accentColor,
          opacity: markOp * 0.12,
          transform: `scale(${markSc})`,
          lineHeight: 1,
          transformOrigin: 'top left',
        }}>
          "
        </div>
      </AbsoluteFill>

      <AbsoluteFill style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: `0 ${layout.outerPadding + 40}px`, gap: layout.innerGap }}>
        {/* Quote text — word by word */}
        <div style={{ maxWidth: layout.maxContentWidth, textAlign: 'center' as const }}>
          <WordByWord
            text={quote}
            frame={frame}
            fps={fps}
            startFrame={CUE_QUOTE}
            staggerFrames={3}
            wordStyle={{
              fontSize: layout.headingSize - 12,
              fontWeight: '600',
              color: '#f1f5f9',
              fontFamily: FONT,
              lineHeight: 1.45,
              letterSpacing: '-0.5px',
            }}
          />
        </div>

        {/* Author */}
        <div style={{ opacity: authorOp, transform: `translateY(${authorY}px)`, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          {/* Divider line */}
          <div style={{ width: 48, height: 2, background: accentColor, borderRadius: 1 }} />
          <div style={{ fontSize: layout.bodySize, color: accentColor, fontFamily: FONT, fontWeight: '700', letterSpacing: '0.3px' }}>
            {name}
          </div>
          <div style={{ fontSize: layout.labelSize + 2, color: 'rgba(148,163,184,0.65)', fontFamily: MONO_FONT, letterSpacing: '1.5px', textTransform: 'uppercase' as const }}>
            {role}{displayCompany}
          </div>
        </div>
      </AbsoluteFill>

      <SceneCounter current={sceneIndex + 1} total={sceneTotal} />
      <Audio src={staticFile(audioPath)} />
    </AbsoluteFill>
  );
};
