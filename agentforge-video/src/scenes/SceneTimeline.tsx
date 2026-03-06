// agentforge-video/src/scenes/SceneTimeline.tsx
import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate, spring, AbsoluteFill, staticFile } from 'remotion';
import { Audio } from '@remotion/media';
import { FONT, MONO_FONT } from '../font';
import { NoiseOverlay } from '../shared/NoiseOverlay';
import { SceneCounter } from '../shared/SceneCounter';
import { accentVariants } from '../shared/colorUtils';
import { useSceneLayout } from '../shared/useSceneLayout';
import type { SceneTimelineProps, SharedSceneProps } from '../types';

export const SceneTimeline: React.FC<SceneTimelineProps & SharedSceneProps> = ({
  title, events,
  accentColor, bgColor, showImage, audioPath, sceneIndex, sceneTotal,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames: dur } = useVideoConfig();
  const av = accentVariants(accentColor);
  const layout = useSceneLayout();

  const CUE_TITLE   = 0;
  const CUE_LINE    = dur * 0.18;
  const CUE_EVENT_0 = dur * 0.22;
  const EVENT_STEP  = dur * 0.16;

  const titleOp = interpolate(frame, [CUE_TITLE, CUE_TITLE + 20], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const titleY  = interpolate(spring({ frame, fps, config: { damping: 200 } }), [0, 1], [20, 0]);

  // Animated line that grows to reveal events
  const lineProgress = interpolate(
    spring({ frame: frame - CUE_LINE, fps, config: { damping: 300 } }),
    [0, 1], [0, 1],
  );

  const displayEvents = events.slice(0, layout.maxListItems + 1); // 3 portrait, 4 landscape
  const totalEvents = displayEvents.length;

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
      <AbsoluteFill style={{ background: `radial-gradient(ellipse at 50% 60%, ${av.bg} 0%, transparent 65%)` }} />
      <NoiseOverlay />

      <AbsoluteFill style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: `${layout.isPortrait ? layout.outerPadding : 0}px ${layout.outerPadding}px`,
        gap: layout.innerGap,
      }}>
        {/* Title */}
        <div style={{ opacity: titleOp, transform: `translateY(${titleY}px)`, textAlign: 'center' as const }}>
          <div style={{ fontSize: layout.headingSize, fontWeight: '800', color: '#f1f5f9', fontFamily: FONT, letterSpacing: '-1.5px' }}>
            {title}
          </div>
        </div>

        {/* Timeline — horizontal in landscape, vertical in portrait */}
        <div style={{
          width: '100%',
          maxWidth: layout.maxContentWidth,
          position: 'relative' as const,
          display: 'flex',
          flexDirection: layout.isPortrait ? 'column' : 'row',
          alignItems: layout.isPortrait ? 'flex-start' : 'center',
          gap: 0,
        }}>
          {/* Backbone line */}
          {layout.isPortrait ? (
            /* Vertical line */
            <div style={{
              position: 'absolute' as const,
              left: 20, top: 24, bottom: 24,
              width: 2,
              background: `linear-gradient(to bottom, ${accentColor}, ${av.border})`,
              height: `${Math.round(lineProgress * 100)}%`,
              borderRadius: 1,
            }} />
          ) : (
            /* Horizontal line */
            <div style={{
              position: 'absolute' as const,
              top: '50%', left: 20,
              height: 2,
              background: `linear-gradient(to right, ${accentColor}, ${av.border})`,
              width: `calc(${Math.round(lineProgress * 100)}% - 40px)`,
              transform: 'translateY(-50%)',
              borderRadius: 1,
            }} />
          )}

          {/* Events */}
          {displayEvents.map((event, i) => {
            const cue  = CUE_EVENT_0 + i * EVENT_STEP;
            const p    = spring({ frame: frame - cue, fps, config: { damping: 200 } });
            const op   = interpolate(frame - cue, [0, 18], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
            const sc   = interpolate(p, [0, 1], [0.6, 1]);

            // Alternate label position in landscape (above/below)
            const isAbove = !layout.isPortrait && i % 2 === 0;

            return (
              <div key={i} style={{
                flex: layout.isPortrait ? undefined : 1,
                display: 'flex',
                flexDirection: layout.isPortrait ? 'row' : 'column',
                alignItems: layout.isPortrait ? 'flex-start' : 'center',
                gap: layout.isPortrait ? 18 : 12,
                paddingLeft: layout.isPortrait ? 48 : 0,
                paddingTop: layout.isPortrait ? 8 : 0,
                paddingBottom: layout.isPortrait ? (i < totalEvents - 1 ? layout.innerGap * 0.6 : 0) : 0,
                position: 'relative' as const,
              }}>
                {/* Dot */}
                <div style={{
                  position: layout.isPortrait ? 'absolute' as const : 'relative' as const,
                  left: layout.isPortrait ? -28 : undefined,
                  top: layout.isPortrait ? 4 : undefined,
                  width: 18, height: 18, borderRadius: '50%',
                  background: accentColor,
                  border: `3px solid ${bgColor}`,
                  boxShadow: `0 0 16px ${av.glow}`,
                  opacity: op,
                  transform: `scale(${sc})`,
                  flexShrink: 0,
                  zIndex: 2,
                }} />

                {/* Label block */}
                {!layout.isPortrait && isAbove && (
                  <div style={{ height: layout.bodySize * 2.5 }} />
                )}
                <div style={{
                  opacity: op,
                  textAlign: layout.isPortrait ? 'left' as const : 'center' as const,
                  order: layout.isPortrait ? undefined : isAbove ? -1 : undefined,
                }}>
                  <div style={{
                    fontSize: layout.isPortrait ? layout.bodySize : layout.labelSize + 2,
                    fontWeight: '700',
                    color: accentColor,
                    fontFamily: MONO_FONT,
                    letterSpacing: '1px',
                    marginBottom: 4,
                  }}>
                    {event.year}
                  </div>
                  <div style={{
                    fontSize: layout.isPortrait ? layout.bodySize - 2 : layout.labelSize,
                    color: 'rgba(241,245,249,0.85)',
                    fontFamily: FONT,
                    fontWeight: '600',
                    lineHeight: 1.3,
                    maxWidth: layout.isPortrait ? undefined : 120,
                  }}>
                    {event.label}
                  </div>
                </div>
                {!layout.isPortrait && !isAbove && (
                  <div style={{ height: layout.bodySize * 2.5 }} />
                )}
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
