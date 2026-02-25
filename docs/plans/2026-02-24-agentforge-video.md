# AgentForge Ad Video — Remotion Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a 45-second, 1920×1080 Remotion video ad for AgentForge (automagical-teams.lovable.app) using a Pain→Solution narrative arc.

**Architecture:** Single Remotion composition with 7 scenes using TransitionSeries + fade transitions. Each scene is a self-contained React component. All animations use `useCurrentFrame()` + `interpolate()`/`spring()` — no CSS transitions.

**Tech Stack:** Remotion, @remotion/transitions, TypeScript, React

---

## Scene Plan (30fps)

| Scene | Duration | Frames | Content |
|-------|----------|--------|---------|
| 1 | 5s | 150 | "Your team is drowning in busywork." |
| 2 | 5s | 150 | Inbox / data entry / follow-up chaos |
| 3 | 5s | 150 | "25+ hours/week. €25,000/year. Gone." |
| 4 | 3s | 90 | Black screen → AgentForge logo reveal |
| 5 | 12s | 360 | AI agents dashboard animation |
| 6 | 8s | 240 | Stats flying in one-by-one |
| 7 | 7s | 210 | CTA screen |

6 fade transitions × 15 frames = −90 frames.
**Total: 1260 frames = 42 seconds**

---

## Task 1: Scaffold the Remotion project

**Files:**
- Create: `agentforge-video/` (new Remotion project)

**Step 1: Bootstrap**

```bash
cd "C:/Users/Oleg/OneDrive - Enereco S.p.A/Documents/GitHub/resend-web-adv"
npm create video@latest agentforge-video -- --template empty
cd agentforge-video
npm install @remotion/transitions
```

**Step 2: Verify dev server starts**

```bash
npx remotion studio
```

Expected: Browser opens Remotion Studio at localhost:3000.

---

## Task 2: Create shared constants and helpers

**Files:**
- Create: `agentforge-video/src/constants.ts`

**Step 1: Write constants**

```ts
// agentforge-video/src/constants.ts
export const FPS = 30;
export const WIDTH = 1920;
export const HEIGHT = 1080;

// Colors matching AgentForge dark tech aesthetic
export const COLORS = {
  bg: '#050d1a',           // near-black navy
  bgCard: '#0a1628',       // slightly lighter
  accent: '#3b82f6',       // bright blue
  accentGlow: '#60a5fa',   // lighter blue glow
  cyan: '#06b6d4',         // cyan accent
  white: '#ffffff',
  gray: '#94a3b8',
  danger: '#ef4444',
};

// Scene durations in frames
export const SCENES = {
  s1: 150, // 5s - pain opener
  s2: 150, // 5s - chaos details
  s3: 150, // 5s - cost
  s4: 90,  // 3s - logo reveal
  s5: 360, // 12s - solution
  s6: 240, // 8s - stats
  s7: 210, // 7s - CTA
};

export const TRANSITION_FRAMES = 15;

export const TOTAL_FRAMES =
  SCENES.s1 + SCENES.s2 + SCENES.s3 + SCENES.s4 +
  SCENES.s5 + SCENES.s6 + SCENES.s7 -
  6 * TRANSITION_FRAMES; // 1260
```

---

## Task 3: Create Root.tsx with the composition

**Files:**
- Modify: `agentforge-video/src/Root.tsx`

```tsx
import { Composition } from 'remotion';
import { AgentForgeAd } from './AgentForgeAd';
import { TOTAL_FRAMES, FPS, WIDTH, HEIGHT } from './constants';

export const RemotionRoot = () => (
  <Composition
    id="AgentForgeAd"
    component={AgentForgeAd}
    durationInFrames={TOTAL_FRAMES}
    fps={FPS}
    width={WIDTH}
    height={HEIGHT}
  />
);
```

---

## Task 4: Scene 1 — Pain Opener

**Files:**
- Create: `agentforge-video/src/scenes/Scene1Pain.tsx`

**Step 1: Write Scene1Pain**

```tsx
import { useCurrentFrame, useVideoConfig, interpolate, spring, AbsoluteFill } from 'remotion';
import { COLORS } from '../constants';

export const Scene1Pain = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Background gradient animation
  const gradientOpacity = interpolate(frame, [0, fps], [0, 1], { extrapolateRight: 'clamp' });

  // Main headline: slide up + fade in
  const headlineY = interpolate(
    spring({ frame, fps, config: { damping: 200 }, durationInFrames: 40 }),
    [0, 1], [60, 0]
  );
  const headlineOpacity = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: 'clamp' });

  // Stress icons appear after headline
  const icon1Scale = spring({ frame: frame - fps * 1.5, fps, config: { damping: 12 } });
  const icon2Scale = spring({ frame: frame - fps * 2, fps, config: { damping: 12 } });
  const icon3Scale = spring({ frame: frame - fps * 2.5, fps, config: { damping: 12 } });

  // Notification badges pulse
  const pulse = interpolate(frame % 20, [0, 10, 20], [1, 1.2, 1]);

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.bg }}>
      {/* Animated background gradient */}
      <AbsoluteFill style={{
        background: `radial-gradient(ellipse at 50% 60%, rgba(59,130,246,${gradientOpacity * 0.15}) 0%, transparent 70%)`,
      }} />

      {/* Grid overlay for tech feel */}
      <AbsoluteFill style={{
        backgroundImage: `linear-gradient(rgba(59,130,246,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(59,130,246,0.05) 1px, transparent 1px)`,
        backgroundSize: '80px 80px',
        opacity: gradientOpacity * 0.5,
      }} />

      {/* Central content */}
      <AbsoluteFill style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 48,
      }}>
        {/* Headline */}
        <div style={{
          transform: `translateY(${headlineY}px)`,
          opacity: headlineOpacity,
          textAlign: 'center',
        }}>
          <div style={{
            fontSize: 96,
            fontWeight: 800,
            color: COLORS.white,
            fontFamily: 'Inter, sans-serif',
            lineHeight: 1.1,
            letterSpacing: '-2px',
          }}>
            Your team is{' '}
            <span style={{ color: COLORS.danger }}>drowning</span>
          </div>
          <div style={{
            fontSize: 96,
            fontWeight: 800,
            color: COLORS.white,
            fontFamily: 'Inter, sans-serif',
            lineHeight: 1.1,
            letterSpacing: '-2px',
          }}>
            in busywork.
          </div>
        </div>

        {/* Chaos icons row */}
        <div style={{ display: 'flex', gap: 60, alignItems: 'center' }}>
          {[
            { icon: '📧', label: '50+ emails/day', delay: 1.5 * fps, scale: icon1Scale },
            { icon: '📊', label: 'Data entry', delay: 2 * fps, scale: icon2Scale },
            { icon: '📅', label: 'Missed follow-ups', delay: 2.5 * fps, scale: icon3Scale },
          ].map(({ icon, label, scale }) => (
            <div key={label} style={{
              transform: `scale(${scale})`,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 12,
            }}>
              <div style={{
                width: 120,
                height: 120,
                background: 'rgba(239,68,68,0.1)',
                border: '2px solid rgba(239,68,68,0.4)',
                borderRadius: 24,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 52,
                transform: `scale(${pulse})`,
              }}>
                {icon}
              </div>
              <div style={{
                fontSize: 28,
                color: COLORS.gray,
                fontFamily: 'Inter, sans-serif',
                fontWeight: 500,
              }}>{label}</div>
            </div>
          ))}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
```

---

## Task 5: Scene 2 — Chaos Details

**Files:**
- Create: `agentforge-video/src/scenes/Scene2Chaos.tsx`

```tsx
import { useCurrentFrame, useVideoConfig, interpolate, spring, AbsoluteFill } from 'remotion';
import { COLORS } from '../constants';

const EmailRow = ({ subject, from, delay, fps }: { subject: string; from: string; delay: number; fps: number }) => {
  const frame = useCurrentFrame();
  const slideX = interpolate(
    spring({ frame: frame - delay, fps, config: { damping: 200 } }),
    [0, 1], [-400, 0]
  );
  const opacity = interpolate(frame - delay, [0, 15], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  return (
    <div style={{
      transform: `translateX(${slideX}px)`,
      opacity,
      background: 'rgba(255,255,255,0.04)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: 12,
      padding: '16px 24px',
      display: 'flex',
      gap: 20,
      alignItems: 'center',
    }}>
      <div style={{ width: 10, height: 10, background: COLORS.accent, borderRadius: '50%', flexShrink: 0 }} />
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 26, color: COLORS.white, fontFamily: 'Inter, sans-serif', fontWeight: 600 }}>{subject}</div>
        <div style={{ fontSize: 22, color: COLORS.gray, fontFamily: 'Inter, sans-serif' }}>From: {from}</div>
      </div>
      <div style={{ fontSize: 22, color: COLORS.gray, fontFamily: 'Inter, sans-serif' }}>2h ago</div>
    </div>
  );
};

export const Scene2Chaos = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleOpacity = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: 'clamp' });
  const titleY = interpolate(spring({ frame, fps, config: { damping: 200 } }), [0, 1], [40, 0]);

  const emails = [
    { subject: 'Invoice #4821 — Action Required', from: 'billing@vendor.io', delay: 15 },
    { subject: 'Re: Follow-up on proposal', from: 'client@bigco.com', delay: 25 },
    { subject: 'Weekly report needs updating', from: 'boss@company.com', delay: 35 },
    { subject: 'Data entry backlog — URGENT', from: 'ops@company.com', delay: 45 },
    { subject: 'Lead didn\'t respond — follow up?', from: 'sales@company.com', delay: 55 },
    { subject: 'CRM not updated again', from: 'manager@company.com', delay: 65 },
  ];

  const badgeCount = Math.min(Math.floor(frame / 8), 50);

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.bg }}>
      <AbsoluteFill style={{
        background: `radial-gradient(ellipse at 30% 50%, rgba(239,68,68,0.08) 0%, transparent 60%)`,
      }} />

      <AbsoluteFill style={{
        display: 'flex',
        padding: '80px 160px',
        gap: 80,
        alignItems: 'center',
      }}>
        {/* Left: email inbox */}
        <div style={{ flex: 1.2, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Inbox header */}
          <div style={{
            opacity: titleOpacity,
            transform: `translateY(${titleY}px)`,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 8,
          }}>
            <div style={{ fontSize: 36, color: COLORS.white, fontFamily: 'Inter, sans-serif', fontWeight: 700 }}>
              Inbox
            </div>
            <div style={{
              background: COLORS.danger,
              borderRadius: 20,
              padding: '4px 16px',
              fontSize: 28,
              color: COLORS.white,
              fontFamily: 'Inter, sans-serif',
              fontWeight: 700,
              minWidth: 60,
              textAlign: 'center',
            }}>
              {badgeCount}
            </div>
          </div>
          {emails.map((e) => (
            <EmailRow key={e.subject} {...e} fps={fps} />
          ))}
        </div>

        {/* Right: key stats */}
        <div style={{ flex: 0.8, display: 'flex', flexDirection: 'column', gap: 32 }}>
          {[
            { label: 'Emails. Data entry.', sub: 'Follow-ups.' },
            { label: 'Every.', sub: 'Single. Day.' },
          ].map(({ label, sub }, i) => {
            const delay = i * fps * 1.5 + fps;
            const op = interpolate(frame - delay, [0, 20], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
            const y = interpolate(
              spring({ frame: frame - delay, fps, config: { damping: 200 } }),
              [0, 1], [40, 0]
            );
            return (
              <div key={label} style={{ opacity: op, transform: `translateY(${y}px)` }}>
                <div style={{
                  fontSize: 56,
                  fontWeight: 800,
                  color: COLORS.white,
                  fontFamily: 'Inter, sans-serif',
                  lineHeight: 1.1,
                }}>{label}</div>
                <div style={{
                  fontSize: 56,
                  fontWeight: 800,
                  color: COLORS.danger,
                  fontFamily: 'Inter, sans-serif',
                  lineHeight: 1.1,
                }}>{sub}</div>
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
```

---

## Task 6: Scene 3 — The Cost

**Files:**
- Create: `agentforge-video/src/scenes/Scene3Cost.tsx`

```tsx
import { useCurrentFrame, useVideoConfig, interpolate, spring, AbsoluteFill } from 'remotion';
import { COLORS } from '../constants';

const CountUp = ({ target, unit, label, delay, fps }: {
  target: number; unit: string; label: string; delay: number; fps: number;
}) => {
  const frame = useCurrentFrame();
  const progress = interpolate(frame - delay, [0, fps * 2], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
    easing: (t) => 1 - Math.pow(1 - t, 3),
  });
  const value = Math.round(progress * target);
  const op = interpolate(frame - delay, [0, 15], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const scaleIn = spring({ frame: frame - delay, fps, config: { damping: 200 } });

  return (
    <div style={{ opacity: op, transform: `scale(${scaleIn})`, textAlign: 'center' }}>
      <div style={{
        fontSize: 120,
        fontWeight: 900,
        color: COLORS.danger,
        fontFamily: 'Inter, sans-serif',
        lineHeight: 1,
        letterSpacing: '-4px',
      }}>
        {value.toLocaleString()}{unit}
      </div>
      <div style={{
        fontSize: 32,
        color: COLORS.gray,
        fontFamily: 'Inter, sans-serif',
        fontWeight: 500,
        marginTop: 8,
      }}>{label}</div>
    </div>
  );
};

export const Scene3Cost = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const headlineOp = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: 'clamp' });
  const headlineY = interpolate(spring({ frame, fps, config: { damping: 200 } }), [0, 1], [50, 0]);

  // "Gone." text
  const goneOp = interpolate(frame, [fps * 3.5, fps * 4], [0, 1], { extrapolateRight: 'clamp' });
  const goneScale = spring({ frame: frame - fps * 3.5, fps, config: { damping: 10 } });

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.bg }}>
      <AbsoluteFill style={{
        background: `radial-gradient(ellipse at 50% 50%, rgba(239,68,68,0.12) 0%, transparent 70%)`,
      }} />

      <AbsoluteFill style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 64,
      }}>
        <div style={{
          opacity: headlineOp,
          transform: `translateY(${headlineY}px)`,
          fontSize: 52,
          color: COLORS.gray,
          fontFamily: 'Inter, sans-serif',
          fontWeight: 500,
          textAlign: 'center',
        }}>
          That's what your team wastes every year
        </div>

        <div style={{ display: 'flex', gap: 120, alignItems: 'flex-start' }}>
          <CountUp target={25} unit="+ hrs" label="wasted per week" delay={20} fps={fps} />
          <div style={{
            width: 2,
            height: 160,
            background: 'rgba(255,255,255,0.1)',
            alignSelf: 'center',
          }} />
          <CountUp target={25000} unit="€" label="lost every year" delay={fps} fps={fps} />
        </div>

        <div style={{
          opacity: goneOp,
          transform: `scale(${goneScale})`,
          fontSize: 120,
          fontWeight: 900,
          color: COLORS.white,
          fontFamily: 'Inter, sans-serif',
          letterSpacing: '-4px',
        }}>
          Gone.
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
```

---

## Task 7: Scene 4 — Logo Reveal

**Files:**
- Create: `agentforge-video/src/scenes/Scene4Logo.tsx`

```tsx
import { useCurrentFrame, useVideoConfig, interpolate, spring, AbsoluteFill } from 'remotion';
import { COLORS } from '../constants';

export const Scene4Logo = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Deep black at start, then glow emerges
  const glowOpacity = interpolate(frame, [0, fps * 1.5], [0, 1], { extrapolateRight: 'clamp' });

  // Logo scale + fade in
  const logoScale = spring({ frame: frame - fps * 0.5, fps, config: { damping: 15, stiffness: 120 } });
  const logoOpacity = interpolate(frame - fps * 0.5, [0, 20], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  // Tagline slides up after logo
  const taglineY = interpolate(
    spring({ frame: frame - fps * 1.2, fps, config: { damping: 200 } }),
    [0, 1], [40, 0]
  );
  const taglineOp = interpolate(frame - fps * 1.2, [0, 20], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  // Ring pulse
  const ringScale = interpolate(frame % (fps * 1.5), [0, fps * 1.5], [1, 1.5]);
  const ringOpacity = interpolate(frame % (fps * 1.5), [0, fps * 0.5, fps * 1.5], [0.6, 0.3, 0]);

  return (
    <AbsoluteFill style={{ backgroundColor: '#000000' }}>
      {/* Glow */}
      <AbsoluteFill style={{
        background: `radial-gradient(ellipse at 50% 50%, rgba(59,130,246,${glowOpacity * 0.3}) 0%, transparent 60%)`,
      }} />

      <AbsoluteFill style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 32,
      }}>
        {/* Pulsing ring */}
        <div style={{
          position: 'absolute',
          width: 300,
          height: 300,
          border: `2px solid rgba(59,130,246,${ringOpacity * glowOpacity})`,
          borderRadius: '50%',
          transform: `scale(${ringScale})`,
        }} />

        {/* Logo mark */}
        <div style={{
          opacity: logoOpacity,
          transform: `scale(${logoScale})`,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 24,
        }}>
          {/* Icon */}
          <div style={{
            width: 120,
            height: 120,
            background: `linear-gradient(135deg, ${COLORS.accent}, ${COLORS.cyan})`,
            borderRadius: 28,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 64,
            boxShadow: `0 0 60px rgba(59,130,246,0.5)`,
          }}>
            ⚡
          </div>

          {/* Name */}
          <div style={{
            fontSize: 96,
            fontWeight: 900,
            color: COLORS.white,
            fontFamily: 'Inter, sans-serif',
            letterSpacing: '-3px',
          }}>
            Agent<span style={{ color: COLORS.accent }}>Forge</span>
          </div>
        </div>

        {/* Tagline */}
        <div style={{
          opacity: taglineOp,
          transform: `translateY(${taglineY}px)`,
          fontSize: 36,
          color: COLORS.gray,
          fontFamily: 'Inter, sans-serif',
          fontWeight: 400,
          letterSpacing: '2px',
          textTransform: 'uppercase',
        }}>
          Custom AI Agents — Fully Managed
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
```

---

## Task 8: Scene 5 — Solution Dashboard

**Files:**
- Create: `agentforge-video/src/scenes/Scene5Solution.tsx`

```tsx
import { useCurrentFrame, useVideoConfig, interpolate, spring, AbsoluteFill, Sequence } from 'remotion';
import { COLORS } from '../constants';

const AgentCard = ({ icon, title, status, detail, delay, fps }: {
  icon: string; title: string; status: string; detail: string; delay: number; fps: number;
}) => {
  const frame = useCurrentFrame();
  const op = interpolate(frame - delay, [0, 15], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const y = interpolate(spring({ frame: frame - delay, fps, config: { damping: 200 } }), [0, 1], [40, 0]);
  const pulse = interpolate(frame % 60, [0, 30, 60], [0.8, 1, 0.8]);

  return (
    <div style={{
      opacity: op,
      transform: `translateY(${y}px)`,
      background: 'rgba(59,130,246,0.06)',
      border: '1px solid rgba(59,130,246,0.2)',
      borderRadius: 16,
      padding: '24px 28px',
      display: 'flex',
      gap: 20,
      alignItems: 'flex-start',
    }}>
      <div style={{ fontSize: 40, flexShrink: 0 }}>{icon}</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 26, fontWeight: 700, color: COLORS.white, fontFamily: 'Inter, sans-serif' }}>
          {title}
        </div>
        <div style={{ fontSize: 22, color: COLORS.gray, fontFamily: 'Inter, sans-serif', marginTop: 4 }}>
          {detail}
        </div>
      </div>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        flexShrink: 0,
      }}>
        <div style={{
          width: 10,
          height: 10,
          background: '#22c55e',
          borderRadius: '50%',
          transform: `scale(${pulse})`,
          boxShadow: '0 0 8px #22c55e',
        }} />
        <div style={{ fontSize: 22, color: '#22c55e', fontFamily: 'Inter, sans-serif', fontWeight: 600 }}>
          {status}
        </div>
      </div>
    </div>
  );
};

export const Scene5Solution = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const headerOp = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: 'clamp' });
  const headerY = interpolate(spring({ frame, fps, config: { damping: 200 } }), [0, 1], [40, 0]);

  const agents = [
    { icon: '📧', title: 'AI Email Manager', status: 'Handled 47 emails', detail: 'Sorted, drafted & sent routine replies', delay: fps * 0.5 },
    { icon: '📊', title: 'AI Spreadsheet Assistant', status: 'Auto-updated', detail: 'CRM synced in real-time — zero manual entry', delay: fps * 1.0 },
    { icon: '🔔', title: 'AI Follow-Up Agent', status: '12 sent today', detail: 'Zero leads forgotten — ever', delay: fps * 1.5 },
    { icon: '📋', title: 'AI Project Coordinator', status: 'On track', detail: 'Deadlines monitored, team notified', delay: fps * 2.0 },
    { icon: '📈', title: 'AI Report Generator', status: 'Weekly ready', detail: 'Performance reports delivered automatically', delay: fps * 2.5 },
  ];

  // Headline copy
  const headlineFrames = [
    { text: "AgentForge builds custom AI agents", delay: 0 },
    { text: "that handle it all.", delay: fps * 0.8 },
    { text: "Automatically.", delay: fps * 1.4 },
  ];

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.bg }}>
      <AbsoluteFill style={{
        background: `radial-gradient(ellipse at 70% 30%, rgba(59,130,246,0.12) 0%, transparent 60%)`,
      }} />

      <AbsoluteFill style={{
        display: 'flex',
        padding: '60px 100px',
        gap: 80,
      }}>
        {/* Left: headline + copy */}
        <div style={{ width: 600, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 24 }}>
          {headlineFrames.map(({ text, delay }) => {
            const op = interpolate(frame - delay, [0, 15], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
            const y = interpolate(spring({ frame: frame - delay, fps, config: { damping: 200 } }), [0, 1], [30, 0]);
            return (
              <div key={text} style={{
                opacity: op,
                transform: `translateY(${y}px)`,
                fontSize: 60,
                fontWeight: 800,
                color: text === 'Automatically.' ? COLORS.accent : COLORS.white,
                fontFamily: 'Inter, sans-serif',
                lineHeight: 1.15,
                letterSpacing: '-1px',
              }}>{text}</div>
            );
          })}

          <div style={{
            opacity: interpolate(frame - fps * 2, [0, 20], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
            marginTop: 16,
            fontSize: 30,
            color: COLORS.gray,
            fontFamily: 'Inter, sans-serif',
            lineHeight: 1.5,
          }}>
            No setup. No learning curve.<br />Fully managed. Deployed in 5 days.
          </div>
        </div>

        {/* Right: agent cards dashboard */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 16, justifyContent: 'center' }}>
          {/* Dashboard header */}
          <div style={{
            opacity: headerOp,
            transform: `translateY(${headerY}px)`,
            fontSize: 24,
            color: COLORS.gray,
            fontFamily: 'Inter, sans-serif',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '2px',
            marginBottom: 8,
          }}>
            ● Live Dashboard
          </div>
          {agents.map((a) => <AgentCard key={a.title} {...a} fps={fps} />)}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
```

---

## Task 9: Scene 6 — Stats

**Files:**
- Create: `agentforge-video/src/scenes/Scene6Stats.tsx`

```tsx
import { useCurrentFrame, useVideoConfig, interpolate, spring, AbsoluteFill } from 'remotion';
import { COLORS } from '../constants';

const StatBlock = ({ value, label, sub, delay, fps }: {
  value: string; label: string; sub: string; delay: number; fps: number;
}) => {
  const frame = useCurrentFrame();
  const scale = spring({ frame: frame - delay, fps, config: { damping: 12, stiffness: 180 } });
  const op = interpolate(frame - delay, [0, 15], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  return (
    <div style={{
      opacity: op,
      transform: `scale(${scale})`,
      textAlign: 'center',
      padding: '48px 64px',
      background: 'rgba(59,130,246,0.06)',
      border: '1px solid rgba(59,130,246,0.2)',
      borderRadius: 24,
      flex: 1,
    }}>
      <div style={{
        fontSize: 120,
        fontWeight: 900,
        color: COLORS.accent,
        fontFamily: 'Inter, sans-serif',
        lineHeight: 1,
        letterSpacing: '-4px',
      }}>{value}</div>
      <div style={{
        fontSize: 36,
        fontWeight: 700,
        color: COLORS.white,
        fontFamily: 'Inter, sans-serif',
        marginTop: 16,
      }}>{label}</div>
      <div style={{
        fontSize: 26,
        color: COLORS.gray,
        fontFamily: 'Inter, sans-serif',
        marginTop: 8,
      }}>{sub}</div>
    </div>
  );
};

export const Scene6Stats = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleOp = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: 'clamp' });
  const titleY = interpolate(spring({ frame, fps, config: { damping: 200 } }), [0, 1], [40, 0]);

  const stats = [
    { value: '28hrs', label: 'Saved per week', sub: 'Average across 50+ teams', delay: fps * 0.5 },
    { value: '5 days', label: 'To go live', sub: 'From call to deployed agents', delay: fps * 1.2 },
    { value: '$5.6K', label: 'Monthly ROI', sub: 'Average return on investment', delay: fps * 1.9 },
  ];

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.bg }}>
      <AbsoluteFill style={{
        background: `radial-gradient(ellipse at 50% 20%, rgba(59,130,246,0.15) 0%, transparent 60%)`,
      }} />

      <AbsoluteFill style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '80px 120px',
        gap: 64,
      }}>
        <div style={{
          opacity: titleOp,
          transform: `translateY(${titleY}px)`,
          textAlign: 'center',
        }}>
          <div style={{
            fontSize: 64,
            fontWeight: 800,
            color: COLORS.white,
            fontFamily: 'Inter, sans-serif',
            letterSpacing: '-2px',
          }}>
            Results after <span style={{ color: COLORS.accent }}>30 days</span>
          </div>
          <div style={{
            fontSize: 32,
            color: COLORS.gray,
            fontFamily: 'Inter, sans-serif',
            marginTop: 12,
          }}>
            Average across 50+ teams
          </div>
        </div>

        <div style={{ display: 'flex', gap: 40, width: '100%' }}>
          {stats.map((s) => <StatBlock key={s.value} {...s} fps={fps} />)}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
```

---

## Task 10: Scene 7 — CTA

**Files:**
- Create: `agentforge-video/src/scenes/Scene7CTA.tsx`

```tsx
import { useCurrentFrame, useVideoConfig, interpolate, spring, AbsoluteFill } from 'remotion';
import { COLORS } from '../constants';

export const Scene7CTA = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const bgGlow = interpolate(frame, [0, fps * 2], [0, 1], { extrapolateRight: 'clamp' });

  const logoScale = spring({ frame, fps, config: { damping: 200 } });
  const logoOp = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: 'clamp' });

  const headlineOp = interpolate(frame - fps * 0.5, [0, 20], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const headlineY = interpolate(spring({ frame: frame - fps * 0.5, fps, config: { damping: 200 } }), [0, 1], [40, 0]);

  const subOp = interpolate(frame - fps * 1.2, [0, 20], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const subY = interpolate(spring({ frame: frame - fps * 1.2, fps, config: { damping: 200 } }), [0, 1], [30, 0]);

  const ctaScale = spring({ frame: frame - fps * 2, fps, config: { damping: 15, stiffness: 150 } });
  const ctaOp = interpolate(frame - fps * 2, [0, 20], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  const urlOp = interpolate(frame - fps * 2.5, [0, 20], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  // CTA button pulse
  const btnPulse = interpolate(
    Math.max(0, frame - fps * 2.5) % (fps * 2),
    [0, fps, fps * 2], [1, 1.04, 1]
  );

  return (
    <AbsoluteFill style={{ backgroundColor: '#000' }}>
      {/* Blue glow backdrop */}
      <AbsoluteFill style={{
        background: `radial-gradient(ellipse at 50% 50%, rgba(59,130,246,${bgGlow * 0.25}) 0%, transparent 65%)`,
      }} />

      <AbsoluteFill style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 40,
      }}>
        {/* Logo */}
        <div style={{ opacity: logoOp, transform: `scale(${logoScale})`, display: 'flex', alignItems: 'center', gap: 20 }}>
          <div style={{
            width: 72,
            height: 72,
            background: `linear-gradient(135deg, ${COLORS.accent}, ${COLORS.cyan})`,
            borderRadius: 16,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 36,
            boxShadow: '0 0 40px rgba(59,130,246,0.4)',
          }}>⚡</div>
          <div style={{
            fontSize: 64,
            fontWeight: 900,
            color: COLORS.white,
            fontFamily: 'Inter, sans-serif',
            letterSpacing: '-2px',
          }}>
            Agent<span style={{ color: COLORS.accent }}>Forge</span>
          </div>
        </div>

        {/* Headline */}
        <div style={{
          opacity: headlineOp,
          transform: `translateY(${headlineY}px)`,
          textAlign: 'center',
          fontSize: 72,
          fontWeight: 800,
          color: COLORS.white,
          fontFamily: 'Inter, sans-serif',
          lineHeight: 1.2,
          letterSpacing: '-2px',
          maxWidth: 1100,
        }}>
          Stop paying people to do what<br />
          <span style={{ color: COLORS.accent }}>AI does better.</span>
        </div>

        {/* Sub */}
        <div style={{
          opacity: subOp,
          transform: `translateY(${subY}px)`,
          fontSize: 36,
          color: COLORS.gray,
          fontFamily: 'Inter, sans-serif',
          textAlign: 'center',
        }}>
          Book your free 15-minute call today.
        </div>

        {/* CTA Button */}
        <div style={{
          opacity: ctaOp,
          transform: `scale(${ctaScale * btnPulse})`,
          background: `linear-gradient(135deg, ${COLORS.accent}, ${COLORS.cyan})`,
          borderRadius: 16,
          padding: '28px 80px',
          fontSize: 40,
          fontWeight: 700,
          color: COLORS.white,
          fontFamily: 'Inter, sans-serif',
          boxShadow: '0 0 60px rgba(59,130,246,0.4)',
          letterSpacing: '-0.5px',
        }}>
          Book Free Call →
        </div>

        {/* URL */}
        <div style={{
          opacity: urlOp,
          fontSize: 32,
          color: COLORS.gray,
          fontFamily: 'Inter, sans-serif',
          letterSpacing: '1px',
        }}>
          automagical-teams.lovable.app
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
```

---

## Task 11: Assemble AgentForgeAd.tsx

**Files:**
- Create: `agentforge-video/src/AgentForgeAd.tsx`

```tsx
import { AbsoluteFill } from 'remotion';
import { TransitionSeries, linearTiming } from '@remotion/transitions';
import { fade } from '@remotion/transitions/fade';
import { SCENES, TRANSITION_FRAMES } from './constants';
import { Scene1Pain } from './scenes/Scene1Pain';
import { Scene2Chaos } from './scenes/Scene2Chaos';
import { Scene3Cost } from './scenes/Scene3Cost';
import { Scene4Logo } from './scenes/Scene4Logo';
import { Scene5Solution } from './scenes/Scene5Solution';
import { Scene6Stats } from './scenes/Scene6Stats';
import { Scene7CTA } from './scenes/Scene7CTA';

const fadeTiming = linearTiming({ durationInFrames: TRANSITION_FRAMES });

export const AgentForgeAd = () => (
  <AbsoluteFill>
    <TransitionSeries>
      <TransitionSeries.Sequence durationInFrames={SCENES.s1}>
        <Scene1Pain />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={fade()} timing={fadeTiming} />

      <TransitionSeries.Sequence durationInFrames={SCENES.s2}>
        <Scene2Chaos />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={fade()} timing={fadeTiming} />

      <TransitionSeries.Sequence durationInFrames={SCENES.s3}>
        <Scene3Cost />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={fade()} timing={fadeTiming} />

      <TransitionSeries.Sequence durationInFrames={SCENES.s4}>
        <Scene4Logo />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={fade()} timing={fadeTiming} />

      <TransitionSeries.Sequence durationInFrames={SCENES.s5}>
        <Scene5Solution />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={fade()} timing={fadeTiming} />

      <TransitionSeries.Sequence durationInFrames={SCENES.s6}>
        <Scene6Stats />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={fade()} timing={fadeTiming} />

      <TransitionSeries.Sequence durationInFrames={SCENES.s7}>
        <Scene7CTA />
      </TransitionSeries.Sequence>
    </TransitionSeries>
  </AbsoluteFill>
);
```

---

## Task 12: Bootstrap, install & preview

```bash
cd agentforge-video
npm install
npx remotion studio
```

Open Remotion Studio, select `AgentForgeAd`, scrub through all scenes and verify visuals.

---

## Task 13: Render to MP4

```bash
npx remotion render AgentForgeAd out/agentforge-ad.mp4 --codec h264
```

Expected: `out/agentforge-ad.mp4` created (~42 seconds, 1920×1080).
