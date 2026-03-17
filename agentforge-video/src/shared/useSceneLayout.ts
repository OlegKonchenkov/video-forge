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
  maxListItems:    number;   // max items to render (portrait: 2, landscape: 3)
}

export function useSceneLayout(): SceneLayout {
  const { width, height } = useVideoConfig();
  const isPortrait = height > width;

  return {
    isPortrait,
    width,
    height,
    // Portrait (9:16): Instagram Reel style — fill vertical space generously
    // Landscape (16:9): Video text needs ~35-40% larger than UI text
    displaySize:     isPortrait ? 120 : 140,
    headingSize:     isPortrait ? 64  : 76,
    bodySize:        isPortrait ? 32  : 36,
    labelSize:       isPortrait ? 17  : 19,
    outerPadding:    isPortrait ? 52  : 72,
    innerGap:        isPortrait ? 48  : 40,
    cardGap:         isPortrait ? 24  : 24,
    direction:       isPortrait ? 'column' : 'row',
    maxContentWidth: isPortrait ? width - 104 : 1500,
    maxListItems:    isPortrait ? 3 : 3,
  };
}
