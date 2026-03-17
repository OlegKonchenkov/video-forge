// agentforge-video/src/shared/fitText.ts
// Text scaling using @remotion/layout-utils for precise DOM measurement.
// Falls back to char-width heuristic if DOM is unavailable.
import { fitText as remotionFitText, measureText } from '@remotion/layout-utils';
import { FONT } from '../font';

const FONT_WEIGHT = '800'; // covers 700-900 range used across scenes

/**
 * Returns a scaled fontSize to fit `text` within `containerWidth` × `maxLines`.
 * Uses Remotion's DOM measurement for precision; heuristic fallback for Node.
 */
export function fitText(
  text: string,
  baseFontSize: number,
  containerWidth: number,
  maxLines: number = 2,
): number {
  if (!text || containerWidth <= 0 || baseFontSize <= 0) return baseFontSize;
  const minSize = Math.round(baseFontSize * 0.55);

  try {
    if (maxLines <= 1) {
      // Single-line: use Remotion's official fitText
      const { fontSize } = remotionFitText({
        text,
        withinWidth: containerWidth,
        fontFamily: FONT,
        fontWeight: FONT_WEIGHT,
      });
      return Math.max(minSize, Math.min(baseFontSize, fontSize));
    }

    // Multi-line: binary search for max fontSize where text fits
    let lo = minSize;
    let hi = baseFontSize;
    while (hi - lo > 1) {
      const mid = Math.round((lo + hi) / 2);
      const { width } = measureText({
        text,
        fontFamily: FONT,
        fontSize: mid,
        fontWeight: FONT_WEIGHT,
      });
      if (Math.ceil(width / containerWidth) <= maxLines) {
        lo = mid;
      } else {
        hi = mid - 1;
      }
    }
    return lo;
  } catch {
    // Fallback: heuristic if DOM is not available (e.g. Node.js tests)
    return fitTextHeuristic(text, baseFontSize, containerWidth, maxLines);
  }
}

/** Heuristic fallback using average char-width estimation */
function fitTextHeuristic(
  text: string,
  baseFontSize: number,
  containerWidth: number,
  maxLines: number,
): number {
  const minSize = Math.round(baseFontSize * 0.55);
  const charWidth = baseFontSize * 0.56;
  const charsPerLine = Math.floor(containerWidth / charWidth);
  if (charsPerLine <= 0) return minSize;

  const words = text.split(/\s+/).filter(Boolean);
  let lines = 1;
  let lineLen = 0;
  for (const word of words) {
    if (lineLen > 0 && lineLen + 1 + word.length > charsPerLine) {
      lines++;
      lineLen = word.length;
    } else {
      lineLen += (lineLen > 0 ? 1 : 0) + word.length;
    }
  }
  if (lines <= maxLines) return baseFontSize;
  const scale = maxLines / lines;
  return Math.max(minSize, Math.round(baseFontSize * scale));
}

/**
 * Returns a font size for single-line text that fits within containerWidth.
 */
export function fitSingleLine(
  text: string,
  baseFontSize: number,
  containerWidth: number,
): number {
  return fitText(text, baseFontSize, containerWidth, 1);
}
