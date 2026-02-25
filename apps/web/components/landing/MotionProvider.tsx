'use client';
import { MotionConfig } from 'framer-motion';

/**
 * Forces Framer Motion to run all animations regardless of the OS
 * prefers-reduced-motion setting. This keeps the cinematic scroll
 * effects alive even on machines where reduced-motion is on (common
 * in accessibility testing or developer setups).
 */
export function MotionProvider({ children }: { children: React.ReactNode }) {
  return (
    <MotionConfig reducedMotion="never">
      {children}
    </MotionConfig>
  );
}
