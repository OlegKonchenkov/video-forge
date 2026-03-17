// agentforge-video/src/shared/WordByWord.tsx
import React from 'react';
import { interpolate, spring } from 'remotion';

interface WordByWordProps {
  text:          string;
  frame:         number;
  fps:           number;
  startFrame:    number;
  staggerFrames?: number;
  style?:        React.CSSProperties;
  wordStyle?:    React.CSSProperties;
  accentWords?:  string[];
  accentColor?:  string;
}

export const WordByWord: React.FC<WordByWordProps> = ({
  text, frame, fps, startFrame,
  staggerFrames = 4,
  style = {},
  wordStyle = {},
  accentWords = [],
  accentColor = '#3b82f6',
}) => {
  const words = text.split(' ');
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 0, alignItems: 'baseline', ...style }}>
      {words.map((word, i) => {
        const localFrame = frame - startFrame - i * staggerFrames;
        const progress = spring({ frame: localFrame, fps, config: { damping: 200 } });
        const y  = interpolate(progress, [0, 1], [28, 0]);
        const op = interpolate(localFrame, [0, 10], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
        const stripped = word.replace(/[.,!?:;]/g, '');
        const isAccent = accentWords.includes(stripped);
        return (
          <span key={i} style={{
            opacity: op,
            transform: `translateY(${y}px)`,
            display: 'inline-block',
            marginRight: i < words.length - 1 ? 8 : 0,
            color: isAccent ? accentColor : undefined,
            ...wordStyle,
          }}>
            {word}
          </span>
        );
      })}
    </div>
  );
};
