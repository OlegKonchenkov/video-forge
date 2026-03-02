// agentforge-video/src/shared/useSceneLayout.ts
import { useVideoConfig } from 'remotion';

export interface SceneLayout {
  isPortrait:      boolean;
  width:           number;
  height:          number;
  // Typography scale
  displaySize:     number;   // hero numbers / giant text
  headingSize:     number;   // main scene headings
  bodySize:        number;   // body / description text
  labelSize:       number;   // mono labels / caps text
  // Spacing
  outerPadding:    number;   // left/right scene padding
  innerGap:        number;   // gap between major sections
  cardGap:         number;   // gap between cards / items
  // Layout direction for split-panel scenes
  direction:       'row' | 'column';
  maxContentWidth: number;   // max-width for centered text blocks
}

export function useSceneLayout(): SceneLayout {
  const { width, height } = useVideoConfig();
  const isPortrait = height > width;

  return {
    isPortrait,
    width,
    height,
    // Portrait (9:16): smaller text to fit narrower canvas
    displaySize:     isPortrait ? 72  : 96,
    headingSize:     isPortrait ? 44  : 56,
    bodySize:        isPortrait ? 22  : 28,
    labelSize:       isPortrait ? 13  : 16,
    outerPadding:    isPortrait ? 48  : 80,
    innerGap:        isPortrait ? 28  : 40,
    cardGap:         isPortrait ? 16  : 28,
    direction:       isPortrait ? 'column' : 'row',
    maxContentWidth: isPortrait ? width - 96 : 1200,
  };
}
