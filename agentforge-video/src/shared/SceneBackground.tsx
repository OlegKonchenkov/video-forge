// agentforge-video/src/shared/SceneBackground.tsx
// Shared image background using Remotion's <Img> (ensures frame-perfect loading)
import React from 'react';
import { AbsoluteFill, Img, staticFile } from 'remotion';

interface SceneBackgroundProps {
  showImage: boolean;
  sceneIndex: number;
  overlayOpacity?: number;
}

export const SceneBackground: React.FC<SceneBackgroundProps> = ({
  showImage,
  sceneIndex,
  overlayOpacity = 0.80,
}) => {
  if (!showImage) return null;
  return (
    <>
      <AbsoluteFill>
        <Img
          src={staticFile(`images/scene_${sceneIndex}.png`)}
          style={{ width: '100%', height: '100%', objectFit: 'cover' as const }}
        />
      </AbsoluteFill>
      <AbsoluteFill style={{ backgroundColor: `rgba(0,0,0,${overlayOpacity})` }} />
    </>
  );
};
