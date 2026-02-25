# AgentForge Ad v3 — Voiceover-Synced Animations + Declutter

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Upgrade v2 to v3 with proportional timing (animations cued to `durationInFrames` fraction so they sync with voiceover), exit animations for key elements, and reduced information density per scene.

**Architecture:** Each scene uses `const { fps, durationInFrames: dur } = useVideoConfig()`. Cue points are `dur * fraction` instead of `fps * N`. Since `calculateMetadata` sets each TransitionSeries.Sequence duration to actual voiceover length + 25-frame padding, all animations automatically align to the voiceover cadence regardless of TTS speed. Exit animations use `interpolate` to fade/scale elements out before the scene ends.

**Tech Stack:** Remotion 4.x · @remotion/transitions · @remotion/google-fonts · @remotion/media · @remotion/media-utils · TypeScript strict mode

---

## Key Principle: Proportional Cue Pattern

Every scene follows this pattern. Copy verbatim:

```ts
const { fps, durationInFrames: dur } = useVideoConfig();
const frame = useCurrentFrame();

// Entry: appears at 12% of scene duration
const CUE_HEADLINE = dur * 0.12;
const headlineOp = interpolate(frame - CUE_HEADLINE, [0, 12], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
const headlineY = interpolate(spring({ frame: frame - CUE_HEADLINE, fps, config: { damping: 200 } }), [0, 1], [35, 0]);

// Exit: dims from 88% to 95% of duration
const EXIT_START = dur * 0.88;
const headlineExitOp = interpolate(frame, [EXIT_START, EXIT_START + 8], [1, 0.35], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

// Combine: entry opacity × exit opacity
const finalOp = Math.min(headlineOp, headlineExitOp);
```

Exit scale-to-zero pattern (for dramatic disappearance):
```ts
const EXIT_SCALE_START = dur * 0.68;
const exitScale = interpolate(frame, [EXIT_SCALE_START, EXIT_SCALE_START + 15], [1, 0], {
  extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  easing: (t) => t * t,
});
```

---

## Task 1: Scene 1 — Pain (sync + exit)

**File:** `agentforge-video/src/scenes/Scene1Pain.tsx` (replace entirely)

**Changes:**
- All cues become proportional fractions of `dur`
- Exit: icons dim to 0.4 opacity at 88% of duration
- Keep 3 icons but add subtle group exit

```tsx
import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate, spring, AbsoluteFill, Img, staticFile } from 'remotion';
import { Audio } from '@remotion/media';
import { COLORS, WIDTH, HEIGHT } from '../constants';
import { FONT } from '../font';
import { EmailIcon, ClockIcon, ChartIcon } from '../icons';

export const Scene1Pain: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames: dur } = useVideoConfig();

  // ── Proportional cue points ──────────────────────────────
  const CUE_BG       = 0;
  const CUE_TAG      = dur * 0.03;
  const CUE_HEADLINE = dur * 0.12;
  const CUE_SUB      = dur * 0.36;
  const CUE_ICON1    = dur * 0.54;
  const CUE_ICON2    = dur * 0.64;
  const CUE_ICON3    = dur * 0.74;
  const EXIT_ICONS   = dur * 0.88;

  // ── Background ───────────────────────────────────────────
  const bgOpacity = interpolate(frame, [CUE_BG, CUE_BG + fps * 0.8], [0, 1], { extrapolateRight: 'clamp' });
  const overlayOpacity = interpolate(frame, [0, fps], [0, 0.82], { extrapolateRight: 'clamp' });

  // ── Tag badge ────────────────────────────────────────────
  const tagOp = interpolate(frame - CUE_TAG, [0, 12], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  // ── Headline ─────────────────────────────────────────────
  const headlineProgress = spring({ frame: frame - CUE_HEADLINE, fps, config: { damping: 200 }, durationInFrames: 35 });
  const headlineY = interpolate(headlineProgress, [0, 1], [55, 0]);
  const headlineOp = interpolate(frame - CUE_HEADLINE, [0, 18], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  // ── Subtitle ─────────────────────────────────────────────
  const subProgress = spring({ frame: frame - CUE_SUB, fps, config: { damping: 200 } });
  const subY = interpolate(subProgress, [0, 1], [30, 0]);
  const subOp = interpolate(frame - CUE_SUB, [0, 15], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  // ── Icons entry ───────────────────────────────────────────
  const icon1Scale = spring({ frame: frame - CUE_ICON1, fps, config: { damping: 15 } });
  const icon2Scale = spring({ frame: frame - CUE_ICON2, fps, config: { damping: 15 } });
  const icon3Scale = spring({ frame: frame - CUE_ICON3, fps, config: { damping: 15 } });
  const iconsProgress1 = spring({ frame: frame - CUE_ICON1, fps, config: { damping: 200 } });

  // ── Icons exit (dim) ─────────────────────────────────────
  const iconsExitOp = interpolate(frame, [EXIT_ICONS, EXIT_ICONS + 10], [1, 0.35], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.bg, overflow: 'hidden' }}>
      <Img src={staticFile('images/bg-hero.png')} style={{ width: WIDTH, height: HEIGHT, objectFit: 'cover', opacity: bgOpacity }} />
      <AbsoluteFill style={{ background: `rgba(5,13,26,${overlayOpacity})` }} />
      <AbsoluteFill style={{ background: `linear-gradient(to right, rgba(239,68,68,0.18), transparent)`, opacity: bgOpacity }} />

      <AbsoluteFill style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 140px', gap: 40, overflow: 'hidden' }}>
        {/* Tag */}
        <div style={{
          opacity: tagOp,
          display: 'inline-flex', alignItems: 'center', gap: 10,
          background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)',
          borderRadius: 100, padding: '8px 20px', width: 'fit-content',
        }}>
          <div style={{ width: 8, height: 8, background: COLORS.danger, borderRadius: '50%' }} />
          <span style={{ fontSize: 22, color: COLORS.danger, fontFamily: FONT, fontWeight: '600', letterSpacing: '1px', textTransform: 'uppercase' }}>
            Sound familiar?
          </span>
        </div>

        {/* Headline */}
        <div style={{ opacity: headlineOp, transform: `translateY(${headlineY}px)`, overflow: 'hidden' }}>
          <div style={{ fontSize: 88, fontWeight: '800', color: COLORS.white, fontFamily: FONT, lineHeight: 1.1, letterSpacing: '-2.5px', maxWidth: 1000 }}>
            Your team is{' '}
            <span style={{ color: COLORS.danger }}>drowning</span>
            <br />in busywork.
          </div>
        </div>

        {/* Subtitle */}
        <div style={{ opacity: subOp, transform: `translateY(${subY}px)` }}>
          <div style={{ fontSize: 30, color: 'rgba(148,163,184,0.9)', fontFamily: FONT, fontWeight: '400', maxWidth: 680, lineHeight: 1.5 }}>
            Every day your best people spend hours on tasks that don&apos;t grow your business.
          </div>
        </div>

        {/* Icons row — with exit dim */}
        <div style={{ display: 'flex', gap: 28, marginTop: 8, opacity: iconsExitOp }}>
          {[
            { icon: <EmailIcon size={44} color={COLORS.danger} frame={frame} fps={fps} />, label: '50+ emails/day', scale: icon1Scale },
            { icon: <ChartIcon size={44} color={COLORS.danger} progress={iconsProgress1} />, label: 'Data entry backlog', scale: icon2Scale },
            { icon: <ClockIcon size={44} color={COLORS.danger} frame={frame} fps={fps} />, label: 'Missed follow-ups', scale: icon3Scale },
          ].map(({ icon, label, scale }) => (
            <div key={label} style={{
              transform: `scale(${scale})`,
              display: 'flex', alignItems: 'center', gap: 14,
              background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.22)',
              borderRadius: 14, padding: '14px 24px',
            }}>
              {icon}
              <span style={{ fontSize: 24, color: COLORS.gray, fontFamily: FONT, fontWeight: '600', whiteSpace: 'nowrap' }}>{label}</span>
            </div>
          ))}
        </div>
      </AbsoluteFill>

      <Audio src={staticFile('audio/voiceover/scene1.mp3')} />
    </AbsoluteFill>
  );
};
```

**Verify:** No TypeScript errors. All cue values are `dur * fraction` (numbers). `iconsExitOp` uses raw `frame`, not offset.

---

## Task 2: Scene 2 — Chaos (4 emails, focus shift, "Every. Single. Day.")

**File:** `agentforge-video/src/scenes/Scene2Chaos.tsx` (replace entirely)

**Changes:**
- Cut from 6 to 4 emails
- Proportional cues
- Inbox dims (blurs via opacity) at 50% to shift focus to right text
- Right text: each word/phrase appears separately for rhythmic punch
- "Every. Single. Day." displays on full right column, bigger (72px), with danger color on "Day."

```tsx
import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate, spring, AbsoluteFill, staticFile } from 'remotion';
import { Audio } from '@remotion/media';
import { COLORS } from '../constants';
import { FONT } from '../font';

const EmailRow: React.FC<{ subject: string; from: string; time: string; delay: number; urgent?: boolean }> = ({
  subject, from, time, delay, urgent
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const progress = spring({ frame: frame - delay, fps, config: { damping: 200 } });
  const x = interpolate(progress, [0, 1], [-300, 0]);
  const opacity = interpolate(frame - delay, [0, 12], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return (
    <div style={{
      transform: `translateX(${x}px)`, opacity,
      background: urgent ? 'rgba(239,68,68,0.07)' : 'rgba(255,255,255,0.03)',
      border: `1px solid ${urgent ? 'rgba(239,68,68,0.25)' : 'rgba(255,255,255,0.07)'}`,
      borderRadius: 12, padding: '16px 22px',
      display: 'flex', alignItems: 'center', gap: 14, overflow: 'hidden',
    }}>
      <div style={{ width: 8, height: 8, borderRadius: '50%', background: urgent ? COLORS.danger : COLORS.accent, flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 24, color: COLORS.white, fontFamily: FONT, fontWeight: '600', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{subject}</div>
        <div style={{ fontSize: 19, color: COLORS.gray, fontFamily: FONT, marginTop: 2 }}>{from}</div>
      </div>
      <div style={{ fontSize: 19, color: COLORS.gray, fontFamily: FONT, flexShrink: 0 }}>{time}</div>
      {urgent && <div style={{ background: COLORS.danger, borderRadius: 6, padding: '2px 10px', fontSize: 16, color: '#fff', fontFamily: FONT, fontWeight: '700', flexShrink: 0 }}>URGENT</div>}
    </div>
  );
};

export const Scene2Chaos: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames: dur } = useVideoConfig();

  // ── Proportional cue points ───────────────────────────────
  const CUE_HEADER  = 0;
  const CUE_EMAIL1  = dur * 0.04;
  const CUE_EMAIL2  = dur * 0.17;
  const CUE_EMAIL3  = dur * 0.29;
  const CUE_EMAIL4  = dur * 0.40;
  const INBOX_DIM   = dur * 0.50;   // inbox fades to 35%
  const CUE_TEXT1   = dur * 0.52;   // "Emails. Data entry."
  const CUE_TEXT2   = dur * 0.61;   // "Follow-ups."
  const CUE_EVERY   = dur * 0.68;   // "Every."
  const CUE_SINGLE  = dur * 0.76;   // "Single."
  const CUE_DAY     = dur * 0.83;   // "Day."

  const headerOp = interpolate(frame, [CUE_HEADER, CUE_HEADER + 18], [0, 1], { extrapolateRight: 'clamp' });
  const headerY  = interpolate(spring({ frame, fps, config: { damping: 200 } }), [0, 1], [30, 0]);
  const badgeCount = Math.min(Math.floor(frame / 5), 63);

  // Inbox dims to shift focus to right text
  const inboxDimOp = interpolate(frame, [INBOX_DIM, INBOX_DIM + 20], [1, 0.25], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  // Helper: fade+slide for right text blocks
  const textEntry = (cue: number) => ({
    op: interpolate(frame - cue, [0, 15], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
    y: interpolate(spring({ frame: frame - cue, fps, config: { damping: 200 } }), [0, 1], [30, 0]),
  });

  const t1 = textEntry(CUE_TEXT1);
  const t2 = textEntry(CUE_TEXT2);
  const tE = textEntry(CUE_EVERY);
  const tS = textEntry(CUE_SINGLE);
  const tD = textEntry(CUE_DAY);

  const emails = [
    { subject: 'Invoice #4821 — Action Required', from: 'billing@vendor.io', time: '09:14', delay: CUE_EMAIL1 },
    { subject: 'Re: Follow-up on proposal (3rd attempt)', from: 'client@bigco.com', time: '09:32', delay: CUE_EMAIL2, urgent: true },
    { subject: 'CRM data entry — still pending', from: 'ops@company.com', time: '10:28', delay: CUE_EMAIL3, urgent: true },
    { subject: 'Spreadsheet needs updating', from: 'finance@company.com', time: '11:47', delay: CUE_EMAIL4 },
  ];

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.bg, overflow: 'hidden' }}>
      <AbsoluteFill style={{ background: 'radial-gradient(ellipse at 25% 50%, rgba(239,68,68,0.07) 0%, transparent 55%)' }} />

      <AbsoluteFill style={{ display: 'flex', padding: '60px 100px', gap: 70, alignItems: 'center', overflow: 'hidden' }}>

        {/* Left: inbox (dims at 50%) */}
        <div style={{ width: 820, display: 'flex', flexDirection: 'column', gap: 12, overflow: 'hidden', opacity: inboxDimOp }}>
          <div style={{ opacity: headerOp, transform: `translateY(${headerY}px)`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <div style={{ fontSize: 14, color: COLORS.gray, fontFamily: FONT, fontWeight: '600', textTransform: 'uppercase', letterSpacing: '2px' }}>INBOX</div>
            <div style={{ background: COLORS.danger, borderRadius: 100, padding: '4px 14px', fontSize: 22, color: '#fff', fontFamily: FONT, fontWeight: '800', minWidth: 44, textAlign: 'center' }}>
              {badgeCount}
            </div>
          </div>
          {emails.map((e) => <EmailRow key={e.subject} {...e} />)}
        </div>

        {/* Right: punchy statements */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 20, overflow: 'hidden' }}>
          <div style={{ opacity: t1.op, transform: `translateY(${t1.y}px)`, overflow: 'hidden' }}>
            <div style={{ fontSize: 60, fontWeight: '800', color: COLORS.white, fontFamily: FONT, lineHeight: 1.1, letterSpacing: '-1.5px' }}>Emails. Data entry.</div>
          </div>
          <div style={{ opacity: t2.op, transform: `translateY(${t2.y}px)`, overflow: 'hidden' }}>
            <div style={{ fontSize: 60, fontWeight: '800', color: COLORS.white, fontFamily: FONT, lineHeight: 1.1, letterSpacing: '-1.5px' }}>Follow-ups.</div>
          </div>
          <div style={{ height: 2, background: 'rgba(255,255,255,0.08)', margin: '4px 0', opacity: t2.op }} />
          <div style={{ opacity: tE.op, transform: `translateY(${tE.y}px)`, overflow: 'hidden' }}>
            <div style={{ fontSize: 78, fontWeight: '800', color: COLORS.danger, fontFamily: FONT, lineHeight: 1, letterSpacing: '-2px' }}>Every.</div>
          </div>
          <div style={{ opacity: tS.op, transform: `translateY(${tS.y}px)`, overflow: 'hidden' }}>
            <div style={{ fontSize: 78, fontWeight: '800', color: COLORS.danger, fontFamily: FONT, lineHeight: 1, letterSpacing: '-2px' }}>Single.</div>
          </div>
          <div style={{ opacity: tD.op, transform: `translateY(${tD.y}px)`, overflow: 'hidden' }}>
            <div style={{ fontSize: 78, fontWeight: '800', color: COLORS.white, fontFamily: FONT, lineHeight: 1, letterSpacing: '-2px' }}>Day.</div>
          </div>
        </div>
      </AbsoluteFill>

      <Audio src={staticFile('audio/voiceover/scene2.mp3')} />
    </AbsoluteFill>
  );
};
```

---

## Task 3: Scene 3 — Cost (stats exit before "Gone." enters)

**File:** `agentforge-video/src/scenes/Scene3Cost.tsx` (replace entirely)

**Changes:**
- Proportional cues
- Stats scale to 0 at 68–80% of duration
- "Gone." punches in at 78% with bouncy spring

```tsx
import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate, spring, AbsoluteFill, staticFile } from 'remotion';
import { Audio } from '@remotion/media';
import { COLORS } from '../constants';
import { FONT } from '../font';

const BigStat: React.FC<{ value: number; unit: string; label: string; cue: number; exitStart: number }> = ({
  value, unit, label, cue, exitStart,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames: dur } = useVideoConfig();

  const countDuration = dur * 0.35; // count-up runs for 35% of scene
  const progress = interpolate(frame - cue, [0, countDuration], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
    easing: (t) => 1 - Math.pow(1 - t, 3),
  });
  const displayed = Math.round(progress * value);

  const scaleIn = spring({ frame: frame - cue, fps, config: { damping: 200 } });
  const entryOp = interpolate(frame - cue, [0, 12], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  // Exit: scale to 0
  const exitScale = interpolate(frame, [exitStart, exitStart + 18], [1, 0], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
    easing: (t) => t * t,
  });
  const finalScale = Math.min(scaleIn, exitScale + (1 - entryOp)); // keep 0 until entry
  const finalOp = entryOp * interpolate(frame, [exitStart, exitStart + 18], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  return (
    <div style={{ opacity: finalOp, transform: `scale(${scaleIn * exitScale})`, textAlign: 'center', overflow: 'hidden' }}>
      <div style={{ fontSize: 130, fontWeight: '800', color: COLORS.danger, fontFamily: FONT, lineHeight: 1, letterSpacing: '-4px' }}>
        {displayed.toLocaleString()}{unit}
      </div>
      <div style={{ fontSize: 28, color: COLORS.gray, fontFamily: FONT, fontWeight: '500', marginTop: 10, letterSpacing: '0.5px' }}>
        {label}
      </div>
    </div>
  );
};

export const Scene3Cost: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames: dur } = useVideoConfig();

  const CUE_TITLE  = 0;
  const CUE_STAT1  = dur * 0.08;
  const CUE_STAT2  = dur * 0.28;
  const EXIT_STATS = dur * 0.68;
  const CUE_GONE   = dur * 0.78;

  const titleOp = interpolate(frame - CUE_TITLE, [0, 18], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const titleY  = interpolate(spring({ frame, fps, config: { damping: 200 } }), [0, 1], [40, 0]);
  const titleExitOp = interpolate(frame, [EXIT_STATS, EXIT_STATS + 15], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  const dividerOp = interpolate(frame - CUE_STAT1, [0, 20], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const dividerExitOp = interpolate(frame, [EXIT_STATS, EXIT_STATS + 18], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  const goneScale = spring({ frame: frame - CUE_GONE, fps, config: { damping: 8, stiffness: 160 } });
  const goneOp   = interpolate(frame - CUE_GONE, [0, 10], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.bg, overflow: 'hidden' }}>
      <AbsoluteFill style={{ background: 'radial-gradient(ellipse at 50% 55%, rgba(239,68,68,0.14) 0%, transparent 65%)' }} />

      <AbsoluteFill style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 140px', gap: 56, overflow: 'hidden' }}>

        {/* Title — exits with stats */}
        <div style={{ opacity: Math.min(titleOp, titleExitOp), transform: `translateY(${titleY}px)`, textAlign: 'center' }}>
          <div style={{ fontSize: 36, color: COLORS.gray, fontFamily: FONT, fontWeight: '500', letterSpacing: '1px' }}>
            That&apos;s what your team wastes every year
          </div>
        </div>

        {/* Two stats */}
        <div style={{ display: 'flex', gap: 100, alignItems: 'center', opacity: dividerOp * dividerExitOp }}>
          <BigStat value={25} unit="+ hrs" label="wasted every week" cue={CUE_STAT1} exitStart={EXIT_STATS} />
          <div style={{ width: 1, height: 140, background: 'rgba(255,255,255,0.1)' }} />
          <BigStat value={25000} unit="€" label="lost every single year" cue={CUE_STAT2} exitStart={EXIT_STATS} />
        </div>

        {/* "Gone." — enters after stats exit */}
        <div style={{ opacity: goneOp, transform: `scale(${goneScale})`, fontSize: 128, fontWeight: '800', color: COLORS.white, fontFamily: FONT, letterSpacing: '-4px', position: 'absolute' }}>
          Gone.
        </div>

      </AbsoluteFill>

      <Audio src={staticFile('audio/voiceover/scene3.mp3')} />
    </AbsoluteFill>
  );
};
```

**Note:** `position: 'absolute'` on "Gone." so it overlays the (now-exited) stats space in the center.

---

## Task 4: Scene 4 — Logo sting (fast proportional, short scene)

**File:** `agentforge-video/src/scenes/Scene4Logo.tsx` (replace entirely)

**Changes:**
- Proportional cues — scene is ~1.7s so everything fires quickly
- Fast spring configs (damping 14) since we have very few frames

```tsx
import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate, spring, AbsoluteFill, staticFile } from 'remotion';
import { Audio } from '@remotion/media';
import { COLORS } from '../constants';
import { FONT } from '../font';

export const Scene4Logo: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames: dur } = useVideoConfig();

  const CUE_RINGS    = 0;
  const CUE_ICON     = dur * 0.12;
  const CUE_NAME     = dur * 0.30;
  const CUE_TAGLINE  = dur * 0.52;

  const glowProgress = interpolate(frame, [0, dur * 0.8], [0, 1], { extrapolateRight: 'clamp' });

  const iconScale = spring({ frame: frame - CUE_ICON, fps, config: { damping: 12, stiffness: 120 } });
  const iconOp    = interpolate(frame - CUE_ICON, [0, 10], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  const nameProgress = spring({ frame: frame - CUE_NAME, fps, config: { damping: 14, stiffness: 140 } });
  const nameY = interpolate(nameProgress, [0, 1], [30, 0]);
  const nameOp = interpolate(frame - CUE_NAME, [0, 10], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  const taglineOp = interpolate(frame - CUE_TAGLINE, [0, 10], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const taglineY  = interpolate(spring({ frame: frame - CUE_TAGLINE, fps, config: { damping: 14 } }), [0, 1], [20, 0]);

  // Pulsing rings (keep as-is, they're frame-relative not cue-relative)
  const ring1    = interpolate(frame % (fps * 2), [0, fps * 2], [0.7, 2.0]);
  const ring1Op  = interpolate(frame % (fps * 2), [0, fps * 0.4, fps * 2], [0.5, 0.2, 0]);
  const ring2    = interpolate((frame + fps) % (fps * 2), [0, fps * 2], [0.7, 2.0]);
  const ring2Op  = interpolate((frame + fps) % (fps * 2), [0, fps * 0.4, fps * 2], [0.5, 0.2, 0]);

  return (
    <AbsoluteFill style={{ backgroundColor: '#000', overflow: 'hidden' }}>
      <AbsoluteFill style={{ background: `radial-gradient(ellipse at 50% 50%, rgba(59,130,246,${glowProgress * 0.28}) 0%, transparent 55%)` }} />

      <AbsoluteFill style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ position: 'absolute', width: 260, height: 260, border: `1.5px solid rgba(59,130,246,${ring1Op * glowProgress})`, borderRadius: '50%', transform: `scale(${ring1})` }} />
        <div style={{ position: 'absolute', width: 260, height: 260, border: `1.5px solid rgba(59,130,246,${ring2Op * glowProgress})`, borderRadius: '50%', transform: `scale(${ring2})` }} />
      </AbsoluteFill>

      <AbsoluteFill style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 28, overflow: 'hidden' }}>
        <div style={{
          opacity: iconOp, transform: `scale(${iconScale})`,
          width: 110, height: 110,
          background: `linear-gradient(135deg, ${COLORS.accent}, ${COLORS.cyan})`,
          borderRadius: 26, display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: `0 0 80px rgba(59,130,246,${glowProgress * 0.55}), 0 0 30px rgba(59,130,246,0.3)`,
        }}>
          <svg width="56" height="56" viewBox="0 0 56 56" fill="none">
            <path d="M28 8L42 22H34V40H22V22H14L28 8Z" fill="white" />
            <circle cx="28" cy="44" r="4" fill="white" opacity="0.6" />
          </svg>
        </div>

        <div style={{ opacity: nameOp, transform: `translateY(${nameY}px)` }}>
          <div style={{ fontSize: 100, fontWeight: '800', color: COLORS.white, fontFamily: FONT, letterSpacing: '-3px', lineHeight: 1 }}>
            Agent<span style={{ color: COLORS.accent }}>Forge</span>
          </div>
        </div>

        <div style={{ opacity: taglineOp, transform: `translateY(${taglineY}px)` }}>
          <div style={{ fontSize: 28, color: COLORS.gray, fontFamily: FONT, fontWeight: '400', letterSpacing: '3px', textTransform: 'uppercase' }}>
            Custom AI Agents · Fully Managed
          </div>
        </div>
      </AbsoluteFill>

      <Audio src={staticFile('audio/voiceover/scene4.mp3')} />
    </AbsoluteFill>
  );
};
```

---

## Task 5: Scene 5 — Solution (3 agents, staggered reveal, glow exit)

**File:** `agentforge-video/src/scenes/Scene5Solution.tsx` (replace entirely)

**Changes:**
- Cut from 5 to 3 agent cards (Email, Spreadsheet, Follow-Up — most relatable)
- Proportional cues
- Exit: at 90% all cards glow green pulse

```tsx
import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate, spring, AbsoluteFill, Img, staticFile } from 'remotion';
import { Audio } from '@remotion/media';
import { COLORS, WIDTH, HEIGHT } from '../constants';
import { FONT } from '../font';
import { CheckIcon } from '../icons';

const AgentCard: React.FC<{ icon: string; title: string; status: string; detail: string; cue: number; exitGlowStart: number }> = ({
  icon, title, status, detail, cue, exitGlowStart,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const progress = spring({ frame: frame - cue, fps, config: { damping: 200 } });
  const y = interpolate(progress, [0, 1], [30, 0]);
  const opacity = interpolate(frame - cue, [0, 12], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const dotPulse = interpolate(frame % 50, [0, 25, 50], [0.7, 1, 0.7]);
  const checkProgress = interpolate(frame - cue - 15, [0, 30], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  // Exit glow: cards pulse green at exitGlowStart
  const glowPulse = interpolate(frame - exitGlowStart, [0, 12, 24], [0, 0.6, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  return (
    <div style={{
      opacity, transform: `translateY(${y}px)`,
      background: 'rgba(59,130,246,0.05)', border: '1px solid rgba(59,130,246,0.18)',
      borderRadius: 14, padding: '18px 24px',
      display: 'flex', alignItems: 'center', gap: 16, overflow: 'hidden',
      boxShadow: `0 0 ${glowPulse * 30}px rgba(34,197,94,${glowPulse})`,
    }}>
      <div style={{ fontSize: 34, flexShrink: 0, width: 44, textAlign: 'center' }}>{icon}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 24, fontWeight: '700', color: COLORS.white, fontFamily: FONT, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{title}</div>
        <div style={{ fontSize: 19, color: COLORS.gray, fontFamily: FONT, marginTop: 2, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{detail}</div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
        <CheckIcon size={22} color="#22c55e" progress={checkProgress} />
        <div style={{ fontSize: 18, color: '#22c55e', fontFamily: FONT, fontWeight: '600', whiteSpace: 'nowrap' }}>{status}</div>
        <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#22c55e', transform: `scale(${dotPulse})`, boxShadow: '0 0 6px #22c55e', marginLeft: 4 }} />
      </div>
    </div>
  );
};

export const Scene5Solution: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames: dur } = useVideoConfig();

  const CUE_H1       = 0;
  const CUE_H2       = dur * 0.12;
  const CUE_H3       = dur * 0.24;
  const CUE_H4       = dur * 0.36;  // "Automatically."
  const CUE_SUB      = dur * 0.44;
  const CUE_HEADER   = dur * 0.50;
  const CUE_CARD1    = dur * 0.54;
  const CUE_CARD2    = dur * 0.64;
  const CUE_CARD3    = dur * 0.74;
  const EXIT_GLOW    = dur * 0.90;

  const bgOp = interpolate(frame, [0, fps], [0, 1], { extrapolateRight: 'clamp' });

  const headlines: { text: string; cue: number; accent?: boolean }[] = [
    { text: 'AgentForge builds', cue: CUE_H1 },
    { text: 'custom AI agents', cue: CUE_H2 },
    { text: 'that handle it all.', cue: CUE_H3 },
    { text: 'Automatically.', cue: CUE_H4, accent: true },
  ];

  const subOp = interpolate(frame - CUE_SUB, [0, 18], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const dashHeaderOp = interpolate(frame - CUE_HEADER, [0, 15], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  const agents = [
    { icon: '📧', title: 'AI Email Manager', status: '47 handled', detail: 'Auto-sorted, drafted & sent routine replies', cue: CUE_CARD1 },
    { icon: '📊', title: 'AI Spreadsheet Assistant', status: 'Synced live', detail: 'CRM updated in real-time, zero manual entry', cue: CUE_CARD2 },
    { icon: '🔔', title: 'AI Follow-Up Agent', status: '12 sent today', detail: 'No lead ever forgotten again', cue: CUE_CARD3 },
  ];

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.bg, overflow: 'hidden' }}>
      <Img src={staticFile('images/bg-solution.png')} style={{ width: WIDTH, height: HEIGHT, objectFit: 'cover', opacity: bgOp * 0.35 }} />
      <AbsoluteFill style={{ background: 'rgba(5,13,26,0.82)' }} />
      <AbsoluteFill style={{ background: 'radial-gradient(ellipse at 75% 30%, rgba(59,130,246,0.13) 0%, transparent 55%)' }} />

      <AbsoluteFill style={{ display: 'flex', padding: '50px 100px', gap: 70, alignItems: 'center', overflow: 'hidden' }}>
        {/* Left: copy */}
        <div style={{ width: 520, display: 'flex', flexDirection: 'column', gap: 14, overflow: 'hidden', flexShrink: 0 }}>
          {headlines.map(({ text, cue, accent }) => {
            const op = interpolate(frame - cue, [0, 15], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
            const y  = interpolate(spring({ frame: frame - cue, fps, config: { damping: 200 } }), [0, 1], [25, 0]);
            return (
              <div key={text} style={{ opacity: op, transform: `translateY(${y}px)`, overflow: 'hidden' }}>
                <div style={{ fontSize: 58, fontWeight: '800', color: accent ? COLORS.accent : COLORS.white, fontFamily: FONT, lineHeight: 1.15, letterSpacing: '-1.5px' }}>
                  {text}
                </div>
              </div>
            );
          })}
          <div style={{ opacity: subOp, marginTop: 8, overflow: 'hidden' }}>
            <div style={{ fontSize: 24, color: COLORS.gray, fontFamily: FONT, lineHeight: 1.6, maxWidth: 480 }}>
              No setup. No learning curve.<br />
              <strong style={{ color: 'rgba(255,255,255,0.7)' }}>Fully managed</strong> · <strong style={{ color: 'rgba(255,255,255,0.7)' }}>Deployed in 5 days</strong>
            </div>
          </div>
        </div>

        {/* Right: dashboard */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 14, overflow: 'hidden' }}>
          <div style={{ opacity: dashHeaderOp, display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 6px #22c55e' }} />
            <div style={{ fontSize: 16, color: COLORS.gray, fontFamily: FONT, fontWeight: '600', textTransform: 'uppercase', letterSpacing: '2px' }}>Live Dashboard</div>
          </div>
          {agents.map((a) => <AgentCard key={a.title} {...a} exitGlowStart={EXIT_GLOW} />)}
        </div>
      </AbsoluteFill>

      <Audio src={staticFile('audio/voiceover/scene5.mp3')} />
    </AbsoluteFill>
  );
};
```

---

## Task 6: Scene 6 — Stats (proportional count-up, simultaneous glow at end)

**File:** `agentforge-video/src/scenes/Scene6Stats.tsx` (replace entirely)

**Changes:**
- Proportional cues
- Count-up runs for `dur * 0.40` frames after each card entry
- At `dur * 0.85`, all 3 cards simultaneously glow accent color

```tsx
import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate, spring, AbsoluteFill, staticFile } from 'remotion';
import { Audio } from '@remotion/media';
import { COLORS } from '../constants';
import { FONT } from '../font';
import { ArrowUpIcon, ClockIcon, BrainIcon } from '../icons';

const StatCard: React.FC<{ value: string; label: string; sub: string; icon: React.ReactNode; cue: number; glowStart: number }> = ({
  value, label, sub, icon, cue, glowStart,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames: dur } = useVideoConfig();

  const scale   = spring({ frame: frame - cue, fps, config: { damping: 14, stiffness: 140 } });
  const opacity = interpolate(frame - cue, [0, 12], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const lineW   = interpolate(frame - cue - 15, [0, dur * 0.35], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  // Exit glow: simultaneous accent pulse
  const glowPulse = interpolate(frame - glowStart, [0, 15, 30], [0, 0.5, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  return (
    <div style={{
      opacity, transform: `scale(${scale})`,
      background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.18)',
      borderRadius: 20, padding: '44px 52px', flex: 1,
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, overflow: 'hidden',
      boxShadow: `0 0 ${glowPulse * 60}px rgba(59,130,246,${glowPulse})`,
    }}>
      <div style={{ marginBottom: 4 }}>{icon}</div>
      <div style={{ fontSize: 100, fontWeight: '800', color: COLORS.accent, fontFamily: FONT, lineHeight: 1, letterSpacing: '-3px' }}>{value}</div>
      <div style={{ width: `${lineW * 60}px`, height: 2, background: COLORS.accent, borderRadius: 2, opacity: 0.5 }} />
      <div style={{ fontSize: 30, fontWeight: '700', color: COLORS.white, fontFamily: FONT, textAlign: 'center', lineHeight: 1.2 }}>{label}</div>
      <div style={{ fontSize: 22, color: COLORS.gray, fontFamily: FONT, textAlign: 'center' }}>{sub}</div>
    </div>
  );
};

export const Scene6Stats: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames: dur } = useVideoConfig();

  const CUE_TITLE  = 0;
  const CUE_SUB    = dur * 0.08;
  const CUE_CARD1  = dur * 0.15;
  const CUE_CARD2  = dur * 0.32;
  const CUE_CARD3  = dur * 0.49;
  const GLOW_START = dur * 0.85;

  const titleOp = interpolate(frame - CUE_TITLE, [0, 18], [0, 1], { extrapolateRight: 'clamp' });
  const titleY  = interpolate(spring({ frame, fps, config: { damping: 200 } }), [0, 1], [35, 0]);
  const subOp   = interpolate(frame - CUE_SUB, [0, 15], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  const progress1 = interpolate(frame - CUE_CARD1, [0, 1], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.bg, overflow: 'hidden' }}>
      <AbsoluteFill style={{ background: 'radial-gradient(ellipse at 50% 15%, rgba(59,130,246,0.18) 0%, transparent 55%)' }} />

      <AbsoluteFill style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 120px', gap: 48, overflow: 'hidden' }}>
        <div style={{ textAlign: 'center', overflow: 'hidden' }}>
          <div style={{ opacity: titleOp, transform: `translateY(${titleY}px)` }}>
            <div style={{ fontSize: 58, fontWeight: '800', color: COLORS.white, fontFamily: FONT, letterSpacing: '-1.5px', lineHeight: 1.1 }}>
              Average results after{' '}
              <span style={{ color: COLORS.accent }}>30 days</span>
            </div>
          </div>
          <div style={{ opacity: subOp, marginTop: 10 }}>
            <div style={{ fontSize: 26, color: COLORS.gray, fontFamily: FONT, fontWeight: '400' }}>
              Measured across 50+ teams on AgentForge
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 32, width: '100%', overflow: 'hidden' }}>
          <StatCard value="28hrs" label="Saved per week" sub="Per team, on average" icon={<ClockIcon size={44} color={COLORS.accent} frame={frame} fps={fps} />} cue={CUE_CARD1} glowStart={GLOW_START} />
          <StatCard value="5 days" label="To go live" sub="From first call to active agents" icon={<BrainIcon size={44} color={COLORS.accent} frame={frame} fps={fps} />} cue={CUE_CARD2} glowStart={GLOW_START} />
          <StatCard value="$5.6K" label="Monthly ROI" sub="Average return on investment" icon={<ArrowUpIcon size={44} color={COLORS.accent} progress={progress1} />} cue={CUE_CARD3} glowStart={GLOW_START} />
        </div>
      </AbsoluteFill>

      <Audio src={staticFile('audio/voiceover/scene6.mp3')} />
    </AbsoluteFill>
  );
};
```

---

## Task 7: Scene 7 — CTA (proportional, final pulse)

**File:** `agentforge-video/src/scenes/Scene7CTA.tsx` (replace entirely)

**Changes:**
- All cues proportional
- Final CTA button scale-pulse at 88%
- URL has a subtle shimmer entrance

```tsx
import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate, spring, AbsoluteFill, Img, staticFile } from 'remotion';
import { Audio } from '@remotion/media';
import { COLORS, WIDTH, HEIGHT } from '../constants';
import { FONT } from '../font';

export const Scene7CTA: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames: dur } = useVideoConfig();

  const CUE_BG     = 0;
  const CUE_LOGO   = dur * 0.02;
  const CUE_LINE1  = dur * 0.12;
  const CUE_LINE2  = dur * 0.28;
  const CUE_SUB    = dur * 0.42;
  const CUE_CTA    = dur * 0.54;
  const CUE_URL    = dur * 0.66;
  const FINAL_PULSE = dur * 0.88;

  const bgOp       = interpolate(frame, [CUE_BG, fps], [0, 1], { extrapolateRight: 'clamp' });
  const glowProgress = interpolate(frame, [0, dur * 0.7], [0, 1], { extrapolateRight: 'clamp' });

  const logoScale = spring({ frame: frame - CUE_LOGO, fps, config: { damping: 200 } });
  const logoOp    = interpolate(frame - CUE_LOGO, [0, 15], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  const line1Op = interpolate(frame - CUE_LINE1, [0, 15], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const line1Y  = interpolate(spring({ frame: frame - CUE_LINE1, fps, config: { damping: 200 } }), [0, 1], [35, 0]);

  const line2Op = interpolate(frame - CUE_LINE2, [0, 15], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const line2Y  = interpolate(spring({ frame: frame - CUE_LINE2, fps, config: { damping: 200 } }), [0, 1], [30, 0]);

  const subOp = interpolate(frame - CUE_SUB, [0, 15], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const subY  = interpolate(spring({ frame: frame - CUE_SUB, fps, config: { damping: 200 } }), [0, 1], [25, 0]);

  const ctaScale = spring({ frame: frame - CUE_CTA, fps, config: { damping: 14, stiffness: 160 } });
  const ctaOp   = interpolate(frame - CUE_CTA, [0, 15], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  // Regular idle pulse
  const btnIdlePulse = interpolate(Math.max(0, frame - CUE_CTA - 30) % (fps * 2.2), [0, fps * 1.1, fps * 2.2], [1, 1.04, 1]);
  // Final dramatic pulse at 88%
  const finalPulse = interpolate(frame - FINAL_PULSE, [0, 8, 16], [1, 1.06, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const btnPulse = Math.max(btnIdlePulse, finalPulse);

  const urlOp = interpolate(frame - CUE_URL, [0, 15], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{ backgroundColor: '#000', overflow: 'hidden' }}>
      <Img src={staticFile('images/bg-cta.png')} style={{ width: WIDTH, height: HEIGHT, objectFit: 'cover', opacity: bgOp * 0.22 }} />
      <AbsoluteFill style={{ background: 'rgba(0,0,0,0.82)' }} />
      <AbsoluteFill style={{ background: `radial-gradient(ellipse at 50% 50%, rgba(59,130,246,${glowProgress * 0.22}) 0%, transparent 60%)` }} />

      <AbsoluteFill style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 120px', gap: 32, overflow: 'hidden' }}>
        <div style={{ opacity: logoOp, transform: `scale(${logoScale})`, display: 'flex', alignItems: 'center', gap: 18 }}>
          <div style={{
            width: 64, height: 64,
            background: `linear-gradient(135deg, ${COLORS.accent}, ${COLORS.cyan})`,
            borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: `0 0 40px rgba(59,130,246,${glowProgress * 0.45})`,
          }}>
            <svg width="34" height="34" viewBox="0 0 56 56" fill="none">
              <path d="M28 8L42 22H34V40H22V22H14L28 8Z" fill="white" />
              <circle cx="28" cy="44" r="4" fill="white" opacity="0.6" />
            </svg>
          </div>
          <div style={{ fontSize: 56, fontWeight: '800', color: COLORS.white, fontFamily: FONT, letterSpacing: '-2px', lineHeight: 1 }}>
            Agent<span style={{ color: COLORS.accent }}>Forge</span>
          </div>
        </div>

        <div style={{ opacity: line1Op, transform: `translateY(${line1Y}px)`, textAlign: 'center', overflow: 'hidden' }}>
          <div style={{ fontSize: 80, fontWeight: '800', color: COLORS.white, fontFamily: FONT, lineHeight: 1.15, letterSpacing: '-2.5px', maxWidth: 1300 }}>
            Stop paying people to do what
          </div>
        </div>

        <div style={{ opacity: line2Op, transform: `translateY(${line2Y}px)`, textAlign: 'center', overflow: 'hidden', marginTop: -18 }}>
          <div style={{ fontSize: 80, fontWeight: '800', color: COLORS.accent, fontFamily: FONT, lineHeight: 1.15, letterSpacing: '-2.5px' }}>
            AI does better.
          </div>
        </div>

        <div style={{ opacity: subOp, transform: `translateY(${subY}px)`, textAlign: 'center', overflow: 'hidden' }}>
          <div style={{ fontSize: 32, color: COLORS.gray, fontFamily: FONT, fontWeight: '400' }}>
            Book your free 15-minute call today.
          </div>
        </div>

        <div style={{
          opacity: ctaOp, transform: `scale(${ctaScale * btnPulse})`,
          background: `linear-gradient(135deg, ${COLORS.accent}, ${COLORS.cyan})`,
          borderRadius: 16, padding: '26px 80px',
          fontSize: 38, fontWeight: '700', color: '#fff', fontFamily: FONT,
          boxShadow: `0 0 70px rgba(59,130,246,${glowProgress * 0.45})`,
          letterSpacing: '-0.5px', whiteSpace: 'nowrap',
        }}>
          Book Free Call →
        </div>

        <div style={{ opacity: urlOp, fontSize: 26, color: 'rgba(148,163,184,0.7)', fontFamily: FONT, letterSpacing: '1.5px' }}>
          automagical-teams.lovable.app
        </div>
      </AbsoluteFill>

      <Audio src={staticFile('audio/voiceover/scene7.mp3')} />
    </AbsoluteFill>
  );
};
```

---

## Task 8: TypeScript check + render

**Step 1: TypeScript check**
```bash
cd "C:/Users/Oleg/OneDrive - Enereco S.p.A/Documents/GitHub/resend-web-adv/agentforge-video"
npx tsc --noEmit 2>&1
```
Expected: zero errors. If errors, fix before rendering.

**Common fix — `dur * fraction` returns `number`, all good.**
**If `position: 'absolute'` on "Gone." causes TS error**, add explicit type: `position: 'absolute' as const`.

**Step 2: Render v3**
```bash
cd "C:/Users/Oleg/OneDrive - Enereco S.p.A/Documents/GitHub/resend-web-adv/agentforge-video"
npx remotion render AgentForgeAd out/agentforge-ad-v3.mp4 --codec h264
```
Expected: completes with `1 composition rendered`, file at `out/agentforge-ad-v3.mp4`.

---

## Task 9: Update CLAUDE.md

After successful render, run the `claude-md-management:revise-claude-md` skill to document the full video creation workflow for future use (websites, PDFs, PPTs, or prompts-only).

Key workflow to document:
1. Scrape target website (Playwright) or read PDF/PPT to extract brand/copy
2. Generate voiceover with ElevenLabs (Daniel voice, `eleven_multilingual_v2`) — API key in `.env`
3. Generate background images with Gemini (`gemini-2.5-flash-image`) — API key in `.env`
4. Download royalty-free background music (SoundHelix CC0 URLs)
5. Scaffold Remotion project (copy `agentforge-video/` structure as template)
6. Write scenes using **proportional timing** (`durationInFrames * fraction`)
7. All animation cues: `dur * fraction`, exit animations included
8. `calculateMetadata` auto-sizes composition to actual audio lengths
9. `npx remotion render AgentForgeAd out/<name>.mp4 --codec h264`
