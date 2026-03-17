// agentforge-video/src/shared/SceneCounter.tsx
import React from 'react';
import { useVideoConfig } from 'remotion';
import { MONO_FONT } from '../font';

interface SceneCounterProps {
  current: number;  // 1-based display
  total:   number;
}

export const SceneCounter: React.FC<SceneCounterProps> = ({ current, total }) => {
  const { width, height } = useVideoConfig();
  const isPortrait = height > width;
  return (
    <div style={{
      position: 'absolute' as const,
      bottom: isPortrait ? 56 : 44,
      left: isPortrait ? 56 : 80,
      fontFamily: MONO_FONT,
      fontSize: isPortrait ? 16 : 18,
      color: 'rgba(148,163,184,0.32)',
      letterSpacing: '3px',
      pointerEvents: 'none',
    }}>
      {String(current).padStart(2, '0')} / {String(total).padStart(2, '0')}
    </div>
  );
};
