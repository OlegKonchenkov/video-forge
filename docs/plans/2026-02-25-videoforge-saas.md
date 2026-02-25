# VideoForge SaaS — Full Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task.

**Goal:** Build a full-stack SaaS that lets users generate professional video ads from a URL, PDF, PPT, or text prompt — with credits, auth, billing, and a VPS-based Remotion render pipeline.

**Architecture:** Next.js 14 (App Router) on Vercel for frontend + Supabase for auth/db/storage + Express + BullMQ + Redis on user's VPS for the render worker. Videos flow: user submits → Vercel API stores job in Supabase → VPS worker picks up → runs full pipeline (scrape/parse → Claude script → ElevenLabs TTS → Gemini images → Remotion render) → uploads MP4 to Supabase Storage → Supabase Realtime notifies frontend.

**Tech Stack:** Next.js 14, TypeScript, Tailwind CSS, shadcn/ui, Framer Motion, Supabase (Auth + Postgres + Storage + Realtime), Stripe, Express.js, BullMQ, Redis, Remotion, ElevenLabs, Gemini, Playwright, PM2, Nginx

---

## Design System

**Colors (dark tech, matches AgentForge video):**
```ts
bg:        '#050d1a'   // page background
bgCard:    '#0a1628'   // card background
bgCardHover: '#0f1f38' // card hover
border:    'rgba(59,130,246,0.15)' // default border
borderHover: 'rgba(59,130,246,0.4)'
accent:    '#3b82f6'   // primary blue
accentGlow: '#60a5fa'
cyan:      '#06b6d4'
white:     '#ffffff'
gray:      '#94a3b8'
muted:     '#475569'
danger:    '#ef4444'
success:   '#22c55e'
```

**Gradient text:** `bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent`
**Glow effect:** `box-shadow: 0 0 40px rgba(59,130,246,0.3)`
**Glassmorphism card:** `bg-white/5 backdrop-blur-sm border border-white/10`

---

## Project Structure

```
resend-web-adv/
├── apps/
│   ├── web/                    ← Next.js 14 (deploy to Vercel)
│   └── worker/                 ← Node.js worker (deploy to VPS)
├── packages/
│   └── shared/                 ← shared TypeScript types
├── supabase/
│   └── migrations/             ← SQL migration files
├── package.json                ← npm workspaces root
└── docs/plans/
```

---

## Task 1: Monorepo Scaffold

**Files to create:**
- `package.json` (root workspaces)
- `apps/web/` — Next.js app
- `apps/worker/` — Node.js worker
- `packages/shared/` — shared types

**Step 1: Init monorepo**
```bash
cd "C:/Users/Oleg/OneDrive - Enereco S.p.A/Documents/GitHub/resend-web-adv"
```

Create root `package.json`:
```json
{
  "name": "videoforge",
  "private": true,
  "workspaces": ["apps/*", "packages/*"],
  "scripts": {
    "dev:web": "npm run dev --workspace=apps/web",
    "dev:worker": "npm run dev --workspace=apps/worker",
    "build:web": "npm run build --workspace=apps/web",
    "type-check": "tsc --noEmit"
  }
}
```

**Step 2: Create Next.js app**
```bash
cd apps
npx create-next-app@latest web --typescript --tailwind --eslint --app --src-dir=false --import-alias="@/*" --no-git
```

**Step 3: Install web dependencies**
```bash
cd apps/web
npm install @supabase/supabase-js @supabase/ssr \
  framer-motion \
  lucide-react \
  @stripe/stripe-js \
  stripe \
  class-variance-authority clsx tailwind-merge \
  @radix-ui/react-dialog @radix-ui/react-dropdown-menu \
  @radix-ui/react-tabs @radix-ui/react-accordion \
  @radix-ui/react-progress @radix-ui/react-avatar \
  @radix-ui/react-select @radix-ui/react-toast \
  next-themes
```

**Step 4: Install shadcn/ui**
```bash
cd apps/web
npx shadcn@latest init
# Choose: Dark, CSS variables, default style
npx shadcn@latest add button card badge input label \
  dialog dropdown-menu tabs accordion progress avatar \
  select toast sheet separator
```

**Step 5: Create worker package**
```bash
mkdir -p apps/worker/src/{api,queue,jobs,lib}
cd apps/worker
npm init -y
npm install express bullmq ioredis @supabase/supabase-js \
  @anthropic-ai/sdk axios form-data pdf-parse mammoth \
  playwright dotenv cors helmet morgan
npm install -D typescript ts-node @types/express @types/node nodemon
```

**Step 6: Create shared package**
```bash
mkdir -p packages/shared/src
```

Create `packages/shared/src/types.ts`:
```ts
export type InputType = 'url' | 'pdf' | 'ppt' | 'prompt';
export type VideoStatus = 'queued' | 'processing' | 'complete' | 'failed';
export type Plan = 'free' | 'starter' | 'pro' | 'agency';

export interface VideoJob {
  id: string;
  userId: string;
  title: string;
  inputType: InputType;
  inputData: { url?: string; text?: string; fileName?: string };
  status: VideoStatus;
  progress: number;
  currentStep?: string;
  outputUrl?: string;
  thumbnailUrl?: string;
  durationS?: number;
  errorMsg?: string;
  createdAt: string;
}

export interface Profile {
  id: string;
  fullName: string;
  credits: number;
  plan: Plan;
  stripeCustomerId?: string;
}

export const PLAN_CREDITS: Record<Plan, number> = {
  free: 1,
  starter: 5,
  pro: 20,
  agency: 60,
};

export const PLAN_PRICE: Record<Exclude<Plan, 'free'>, number> = {
  starter: 29,
  pro: 79,
  agency: 199,
};
```

---

## Task 2: Supabase Schema

**File:** `supabase/migrations/001_initial.sql`

```sql
-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Profiles (extends auth.users)
create table profiles (
  id uuid references auth.users on delete cascade primary key,
  full_name text,
  company text,
  avatar_url text,
  credits integer not null default 1,
  plan text not null default 'free' check (plan in ('free','starter','pro','agency')),
  stripe_customer_id text unique,
  created_at timestamptz default now()
);

-- Auto-create profile on signup
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into profiles (id, full_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- Subscriptions
create table subscriptions (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references profiles on delete cascade not null,
  stripe_subscription_id text unique not null,
  plan text not null,
  status text not null,
  current_period_end timestamptz not null,
  credits_per_period integer not null,
  created_at timestamptz default now()
);

-- Videos
create table videos (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references profiles on delete cascade not null,
  title text not null default 'Untitled Video',
  status text not null default 'queued' check (status in ('queued','processing','complete','failed')),
  input_type text not null check (input_type in ('url','pdf','ppt','prompt')),
  input_data jsonb not null default '{}',
  output_url text,
  thumbnail_url text,
  duration_s integer,
  progress integer default 0,
  current_step text,
  error_msg text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Credit ledger
create table credit_ledger (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references profiles on delete cascade not null,
  delta integer not null,
  reason text not null check (reason in ('subscription','purchase','usage','bonus','refund')),
  reference_id uuid,
  created_at timestamptz default now()
);

-- RLS policies
alter table profiles enable row level security;
alter table subscriptions enable row level security;
alter table videos enable row level security;
alter table credit_ledger enable row level security;

create policy "Users see own profile" on profiles for all using (auth.uid() = id);
create policy "Users see own subscriptions" on subscriptions for all using (auth.uid() = user_id);
create policy "Users see own videos" on videos for all using (auth.uid() = user_id);
create policy "Users see own ledger" on credit_ledger for select using (auth.uid() = user_id);

-- Realtime for videos
alter publication supabase_realtime add table videos;

-- Helper: deduct credit and log
create or replace function use_credit(p_user_id uuid, p_video_id uuid)
returns void as $$
begin
  update profiles set credits = credits - 1 where id = p_user_id and credits > 0;
  if not found then raise exception 'Insufficient credits'; end if;
  insert into credit_ledger (user_id, delta, reason, reference_id)
  values (p_user_id, -1, 'usage', p_video_id);
end;
$$ language plpgsql security definer;
```

**Run migration:** In Supabase dashboard → SQL editor → paste and run.

---

## Task 3: Next.js Config + Design System

**File:** `apps/web/tailwind.config.ts`
```ts
import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#050d1a',
        'bg-card': '#0a1628',
        'bg-card-hover': '#0f1f38',
        accent: '#3b82f6',
        'accent-glow': '#60a5fa',
        cyan: '#06b6d4',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'glow-pulse': 'glowPulse 3s ease-in-out infinite',
        float: 'float 6s ease-in-out infinite',
        'gradient-x': 'gradientX 8s ease infinite',
      },
      keyframes: {
        glowPulse: {
          '0%, 100%': { boxShadow: '0 0 20px rgba(59,130,246,0.3)' },
          '50%': { boxShadow: '0 0 60px rgba(59,130,246,0.6)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-12px)' },
        },
        gradientX: {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};
export default config;
```

**File:** `apps/web/app/globals.css`
```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --bg: #050d1a;
  --bg-card: #0a1628;
  --accent: #3b82f6;
}

* { box-sizing: border-box; }
html { scroll-behavior: smooth; }
body {
  background-color: var(--bg);
  color: #ffffff;
  font-family: 'Inter', sans-serif;
  -webkit-font-smoothing: antialiased;
}

/* Custom scrollbar */
::-webkit-scrollbar { width: 6px; }
::-webkit-scrollbar-track { background: #050d1a; }
::-webkit-scrollbar-thumb { background: #1e3a5f; border-radius: 3px; }
::-webkit-scrollbar-thumb:hover { background: #3b82f6; }

/* Gradient text utility */
.gradient-text {
  background: linear-gradient(135deg, #60a5fa, #06b6d4);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

/* Glow utilities */
.glow-blue { box-shadow: 0 0 40px rgba(59,130,246,0.3); }
.glow-blue-intense { box-shadow: 0 0 80px rgba(59,130,246,0.5); }

/* Glass card */
.glass {
  background: rgba(255,255,255,0.03);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255,255,255,0.08);
}

/* Gradient border */
.gradient-border {
  border: 1px solid transparent;
  background: linear-gradient(#0a1628, #0a1628) padding-box,
              linear-gradient(135deg, #3b82f6, #06b6d4) border-box;
}
```

**File:** `apps/web/lib/utils.ts`
```ts
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

**File:** `apps/web/app/layout.tsx`
```tsx
import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'VideoForge — AI Video Ads in Minutes',
  description: 'Turn any website, PDF, or prompt into a professional video ad with AI. No editing skills needed.',
  openGraph: {
    title: 'VideoForge — AI Video Ads in Minutes',
    description: 'Turn any website, PDF, or prompt into a professional video ad.',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="bg-bg text-white antialiased">{children}</body>
    </html>
  );
}
```

---

## Task 4: Landing Page — Navbar + Hero

**File:** `apps/web/components/landing/Navbar.tsx`
```tsx
'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Zap } from 'lucide-react';

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', fn);
    return () => window.removeEventListener('scroll', fn);
  }, []);

  return (
    <motion.nav
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5 }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? 'bg-bg/90 backdrop-blur-xl border-b border-white/5' : ''
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent to-cyan flex items-center justify-center group-hover:glow-blue transition-all duration-300">
            <Zap className="w-4 h-4 text-white fill-white" />
          </div>
          <span className="text-lg font-bold tracking-tight">
            Video<span className="gradient-text">Forge</span>
          </span>
        </Link>

        {/* Links */}
        <div className="hidden md:flex items-center gap-8 text-sm text-slate-400">
          {['Features', 'How it works', 'Pricing', 'FAQ'].map((item) => (
            <a key={item} href={`#${item.toLowerCase().replace(' ', '-')}`}
              className="hover:text-white transition-colors duration-200">{item}</a>
          ))}
        </div>

        {/* CTA */}
        <div className="flex items-center gap-3">
          <Link href="/login" className="text-sm text-slate-400 hover:text-white transition-colors">Sign in</Link>
          <Link href="/signup"
            className="px-4 py-2 text-sm font-semibold rounded-lg bg-gradient-to-r from-accent to-cyan text-white hover:opacity-90 transition-all duration-200 glow-blue">
            Start Free →
          </Link>
        </div>
      </div>
    </motion.nav>
  );
}
```

**File:** `apps/web/components/landing/Hero.tsx`
```tsx
'use client';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { ArrowRight, Play } from 'lucide-react';

const inputExamples = [
  { type: '🔗 URL', text: 'automagical-teams.lovable.app' },
  { type: '📄 PDF', text: 'product-brochure.pdf' },
  { type: '📊 PPT', text: 'pitch-deck.pptx' },
  { type: '✍️ Prompt', text: 'A SaaS that automates HR workflows...' },
];

export function Hero() {
  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center px-6 pt-24 pb-16 overflow-hidden">
      {/* Background radial */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full"
          style={{ background: 'radial-gradient(ellipse, rgba(59,130,246,0.12) 0%, transparent 70%)' }} />
        <div className="absolute top-0 right-0 w-96 h-96"
          style={{ background: 'radial-gradient(ellipse, rgba(6,182,212,0.06) 0%, transparent 70%)' }} />
      </div>

      {/* Badge */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
        className="mb-6 flex items-center gap-2 px-4 py-1.5 rounded-full border border-accent/30 bg-accent/10 text-sm text-accent font-medium">
        <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
        AI-powered · No editing skills needed · Ready in minutes
      </motion.div>

      {/* Headline */}
      <motion.h1 initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1 }}
        className="text-center text-5xl md:text-7xl font-black tracking-tight leading-[1.05] max-w-5xl">
        Turn Any Content Into a{' '}
        <span className="gradient-text">Professional Video Ad</span>{' '}
        in Minutes
      </motion.h1>

      {/* Subheadline */}
      <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2 }}
        className="mt-6 text-center text-xl text-slate-400 max-w-2xl leading-relaxed">
        Paste a website URL, upload a PDF or PowerPoint, or just describe your product.
        We handle the script, voiceover, visuals, and editing — you get a polished video.
      </motion.p>

      {/* CTAs */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.3 }}
        className="mt-10 flex flex-col sm:flex-row items-center gap-4">
        <Link href="/signup"
          className="flex items-center gap-2 px-8 py-4 rounded-xl bg-gradient-to-r from-accent to-cyan text-white font-bold text-lg hover:opacity-90 transition-all duration-200 glow-blue-intense">
          Create Your First Video Free
          <ArrowRight className="w-5 h-5" />
        </Link>
        <button className="flex items-center gap-2 px-8 py-4 rounded-xl border border-white/10 text-white font-semibold hover:border-accent/50 transition-colors duration-200">
          <Play className="w-5 h-5 text-accent fill-accent" />
          Watch 60-sec Demo
        </button>
      </motion.div>

      {/* Input type pills */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.4 }}
        className="mt-12 flex flex-wrap justify-center gap-3">
        {inputExamples.map((ex, i) => (
          <motion.div key={ex.type} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5 + i * 0.08 }}
            className="glass px-4 py-2 rounded-lg text-sm text-slate-300">
            <span className="text-slate-500">{ex.type}: </span>{ex.text}
          </motion.div>
        ))}
      </motion.div>

      {/* Floating video mockup */}
      <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.5 }}
        className="mt-16 w-full max-w-4xl animate-float">
        <div className="relative rounded-2xl overflow-hidden border border-white/10 glow-blue"
          style={{ background: '#0a1628', aspectRatio: '16/9' }}>
          {/* Mockup video player */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-accent to-cyan flex items-center justify-center glow-blue-intense mb-4">
                <Play className="w-8 h-8 text-white fill-white ml-1" />
              </div>
              <p className="text-slate-400 text-sm">AgentForge · AI Automation</p>
              <p className="text-xs text-slate-600 mt-1">Generated in 3 min 42 sec</p>
            </div>
          </div>
          {/* Progress-like overlay bar */}
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-accent via-cyan to-accent" />
          {/* Corner badge */}
          <div className="absolute top-4 right-4 px-3 py-1 rounded-full bg-success/20 border border-success/40 text-success text-xs font-semibold">
            ✓ AI Generated
          </div>
        </div>
      </motion.div>

      {/* Social proof numbers */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.9 }}
        className="mt-12 flex flex-wrap justify-center gap-12 text-center">
        {[
          { value: '2,400+', label: 'Videos generated' },
          { value: '< 5 min', label: 'Average render time' },
          { value: '30×', label: 'Faster than manual' },
        ].map(({ value, label }) => (
          <div key={label}>
            <div className="text-3xl font-black gradient-text">{value}</div>
            <div className="text-sm text-slate-500 mt-1">{label}</div>
          </div>
        ))}
      </motion.div>
    </section>
  );
}
```

---

## Task 5: Landing — How It Works + Input Types

**File:** `apps/web/components/landing/HowItWorks.tsx`
```tsx
'use client';
import { motion } from 'framer-motion';
import { useInView } from 'framer-motion';
import { useRef } from 'react';
import { Upload, Sparkles, Download } from 'lucide-react';

const steps = [
  {
    icon: Upload,
    number: '01',
    title: 'Upload Your Content',
    description: 'Paste a website URL, upload a PDF or PowerPoint, or write a short prompt describing your product or service.',
    color: '#3b82f6',
  },
  {
    icon: Sparkles,
    number: '02',
    title: 'AI Does the Work',
    description: 'Our AI writes the script, records the voiceover, generates visuals, picks background music, and edits the full video.',
    color: '#06b6d4',
  },
  {
    icon: Download,
    number: '03',
    title: 'Download & Publish',
    description: 'Get your 1080p MP4 in minutes. Use it on LinkedIn, YouTube, your website, or anywhere you need to make an impression.',
    color: '#22c55e',
  },
];

export function HowItWorks() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-100px' });

  return (
    <section id="how-it-works" ref={ref} className="py-32 px-6">
      <div className="max-w-7xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 30 }} animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }} className="text-center mb-20">
          <p className="text-accent text-sm font-semibold uppercase tracking-widest mb-4">How it works</p>
          <h2 className="text-4xl md:text-5xl font-black tracking-tight">
            Three steps to your{' '}
            <span className="gradient-text">perfect video</span>
          </h2>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8 relative">
          {/* Connecting line */}
          <div className="hidden md:block absolute top-12 left-1/4 right-1/4 h-px bg-gradient-to-r from-accent/50 via-cyan/50 to-success/50" />

          {steps.map((step, i) => (
            <motion.div key={step.number}
              initial={{ opacity: 0, y: 40 }} animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: i * 0.15 }}
              className="relative group">
              <div className="glass rounded-2xl p-8 hover:border-accent/30 transition-all duration-300 hover:-translate-y-1">
                {/* Step number */}
                <div className="text-6xl font-black mb-6 opacity-10" style={{ color: step.color }}>{step.number}</div>
                {/* Icon */}
                <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-6"
                  style={{ background: `${step.color}20`, border: `1px solid ${step.color}40` }}>
                  <step.icon className="w-6 h-6" style={{ color: step.color }} />
                </div>
                <h3 className="text-xl font-bold mb-3">{step.title}</h3>
                <p className="text-slate-400 leading-relaxed">{step.description}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
```

**File:** `apps/web/components/landing/InputTypes.tsx`
```tsx
'use client';
import { motion } from 'framer-motion';
import { useInView } from 'framer-motion';
import { useRef, useState } from 'react';
import { Globe, FileText, Presentation, MessageSquare } from 'lucide-react';

const types = [
  {
    icon: Globe,
    type: 'Website URL',
    description: 'Paste any URL. We scrape the page, extract the key messages, and build the entire video around your product.',
    example: 'https://yourproduct.com',
    color: '#3b82f6',
    tag: 'Most popular',
  },
  {
    icon: FileText,
    type: 'PDF Document',
    description: 'Upload brochures, proposals, case studies, or reports. We extract the narrative and turn it into a compelling video.',
    example: 'product-brochure.pdf',
    color: '#f59e0b',
    tag: 'Great for B2B',
  },
  {
    icon: Presentation,
    type: 'PowerPoint',
    description: 'Drop in your slide deck. We use your existing structure and talking points to build the perfect video version.',
    example: 'pitch-deck.pptx',
    color: '#ef4444',
    tag: 'Fast & easy',
  },
  {
    icon: MessageSquare,
    type: 'Text Prompt',
    description: "Describe your product in plain English. Our AI researches and structures the video narrative from scratch.",
    example: '"A SaaS that automates HR workflows..."',
    color: '#22c55e',
    tag: 'Maximum flexibility',
  },
];

export function InputTypes() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-100px' });
  const [active, setActive] = useState(0);

  return (
    <section id="features" ref={ref} className="py-32 px-6">
      <div className="max-w-7xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 30 }} animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }} className="text-center mb-20">
          <p className="text-accent text-sm font-semibold uppercase tracking-widest mb-4">Input types</p>
          <h2 className="text-4xl md:text-5xl font-black tracking-tight">
            Works with <span className="gradient-text">whatever you have</span>
          </h2>
          <p className="mt-4 text-xl text-slate-400 max-w-2xl mx-auto">
            No special format required. Start from anything.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {types.map((t, i) => (
            <motion.button key={t.type} onClick={() => setActive(i)}
              initial={{ opacity: 0, y: 30 }} animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: i * 0.1 }}
              className={`text-left p-6 rounded-2xl border transition-all duration-300 hover:-translate-y-1 ${
                active === i
                  ? 'border-accent/50 bg-accent/5 glow-blue'
                  : 'glass hover:border-accent/20'
              }`}>
              {/* Tag */}
              <div className="mb-4">
                <span className="text-xs px-2 py-1 rounded-full font-medium"
                  style={{ background: `${t.color}20`, color: t.color, border: `1px solid ${t.color}30` }}>
                  {t.tag}
                </span>
              </div>
              {/* Icon */}
              <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-4"
                style={{ background: `${t.color}15`, border: `1px solid ${t.color}30` }}>
                <t.icon className="w-5 h-5" style={{ color: t.color }} />
              </div>
              <h3 className="text-lg font-bold mb-2">{t.type}</h3>
              <p className="text-sm text-slate-400 leading-relaxed mb-4">{t.description}</p>
              <code className="text-xs text-slate-500 bg-white/5 px-2 py-1 rounded">{t.example}</code>
            </motion.button>
          ))}
        </div>
      </div>
    </section>
  );
}
```

---

## Task 6: Landing — Pricing Section

**File:** `apps/web/components/landing/Pricing.tsx`
```tsx
'use client';
import { motion } from 'framer-motion';
import { useInView } from 'framer-motion';
import { useRef, useState } from 'react';
import { Check, Zap } from 'lucide-react';
import Link from 'next/link';

const plans = [
  {
    name: 'Starter',
    price: { monthly: 29, annual: 23 },
    credits: 5,
    description: 'Perfect for solo founders and small teams testing AI video.',
    features: [
      '5 videos per month',
      'URL, PDF, PPT & Prompt inputs',
      'AI voiceover (7 languages)',
      'AI-generated visuals',
      '1080p MP4 download',
      'Email support',
    ],
    cta: 'Start with Starter',
    color: '#3b82f6',
    popular: false,
  },
  {
    name: 'Pro',
    price: { monthly: 79, annual: 63 },
    credits: 20,
    description: 'For marketing teams who need regular video content.',
    features: [
      '20 videos per month',
      'Everything in Starter',
      'Priority rendering queue',
      'Custom intro/outro branding',
      'Video history & re-download',
      'Priority email support',
    ],
    cta: 'Go Pro',
    color: '#06b6d4',
    popular: true,
  },
  {
    name: 'Agency',
    price: { monthly: 199, annual: 159 },
    credits: 60,
    description: 'For agencies and teams producing videos at scale.',
    features: [
      '60 videos per month',
      'Everything in Pro',
      'API access (coming soon)',
      'Team seats (up to 5)',
      'White-label export',
      'Dedicated support',
    ],
    cta: 'Scale with Agency',
    color: '#8b5cf6',
    popular: false,
  },
];

export function Pricing() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-100px' });
  const [annual, setAnnual] = useState(false);

  return (
    <section id="pricing" ref={ref} className="py-32 px-6">
      <div className="max-w-7xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 30 }} animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }} className="text-center mb-16">
          <p className="text-accent text-sm font-semibold uppercase tracking-widest mb-4">Pricing</p>
          <h2 className="text-4xl md:text-5xl font-black tracking-tight">
            Simple, <span className="gradient-text">credit-based</span> pricing
          </h2>
          <p className="mt-4 text-xl text-slate-400">1 credit = 1 video. No surprises.</p>

          {/* Toggle */}
          <div className="mt-8 flex items-center justify-center gap-4">
            <span className={`text-sm ${!annual ? 'text-white' : 'text-slate-500'}`}>Monthly</span>
            <button onClick={() => setAnnual(!annual)}
              className={`relative w-12 h-6 rounded-full transition-colors duration-300 ${annual ? 'bg-accent' : 'bg-white/10'}`}>
              <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform duration-300 ${annual ? 'translate-x-7' : 'translate-x-1'}`} />
            </button>
            <span className={`text-sm ${annual ? 'text-white' : 'text-slate-500'}`}>
              Annual <span className="text-success text-xs ml-1">Save 20%</span>
            </span>
          </div>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8">
          {plans.map((plan, i) => (
            <motion.div key={plan.name}
              initial={{ opacity: 0, y: 40 }} animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: i * 0.1 }}
              className={`relative rounded-2xl p-8 flex flex-col ${
                plan.popular
                  ? 'gradient-border glow-blue scale-105'
                  : 'glass'
              }`}>
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-gradient-to-r from-accent to-cyan text-xs font-bold text-white">
                  MOST POPULAR
                </div>
              )}

              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="w-4 h-4" style={{ color: plan.color }} />
                  <span className="font-semibold text-sm" style={{ color: plan.color }}>{plan.name}</span>
                </div>
                <div className="flex items-end gap-1 mb-2">
                  <span className="text-5xl font-black">
                    ${annual ? plan.price.annual : plan.price.monthly}
                  </span>
                  <span className="text-slate-400 mb-2">/mo</span>
                </div>
                <p className="text-sm text-slate-400 mb-6">{plan.description}</p>
                <div className="text-center py-3 rounded-xl mb-6 font-bold text-lg"
                  style={{ background: `${plan.color}15`, color: plan.color, border: `1px solid ${plan.color}30` }}>
                  {plan.credits} videos / month
                </div>
              </div>

              <ul className="space-y-3 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-3 text-sm text-slate-300">
                    <Check className="w-4 h-4 text-success mt-0.5 flex-shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>

              <Link href="/signup" className={`mt-8 w-full py-3 rounded-xl font-bold text-center transition-all duration-200 ${
                plan.popular
                  ? 'bg-gradient-to-r from-accent to-cyan text-white hover:opacity-90 glow-blue'
                  : 'border border-white/10 text-white hover:border-accent/50 hover:bg-accent/5'
              }`}>
                {plan.cta}
              </Link>
            </motion.div>
          ))}
        </div>

        {/* Pay per video */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-8 glass rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <p className="font-semibold">Just need one video?</p>
            <p className="text-sm text-slate-400">No subscription required. Pay per video, no commitment.</p>
          </div>
          <Link href="/signup" className="px-6 py-3 rounded-xl border border-white/10 hover:border-accent/50 font-semibold transition-colors whitespace-nowrap">
            Pay $9 per video →
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
```

---

## Task 7: Landing — FAQ + Footer + Page Assembly

**File:** `apps/web/components/landing/FAQ.tsx`
```tsx
'use client';
import { motion } from 'framer-motion';
import { useInView } from 'framer-motion';
import { useRef, useState } from 'react';
import { Plus, Minus } from 'lucide-react';

const faqs = [
  { q: 'How long does it take to generate a video?', a: 'Most videos render in 3–6 minutes depending on length. You\'ll get a real-time progress bar and an email notification when it\'s ready.' },
  { q: 'What video formats do you support as output?', a: '1080p MP4 (H.264), ready for YouTube, LinkedIn, Instagram, your website, or any other platform.' },
  { q: 'Do I need any video editing skills?', a: 'Zero. Just provide your content (URL, PDF, or text) and the AI handles everything: script, voiceover, visuals, music, and editing.' },
  { q: 'Can I customize the video style?', a: 'Yes — you can choose from multiple visual themes and voiceover styles. Custom branding (logo, colors) is available on Pro and Agency plans.' },
  { q: 'What happens to unused credits?', a: 'Credits roll over for up to 3 months on Starter and Pro. Agency credits never expire.' },
  { q: 'Is there a free trial?', a: 'Yes. Every new account gets 1 free video credit — no credit card required.' },
];

export function FAQ() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-100px' });
  const [open, setOpen] = useState<number | null>(null);

  return (
    <section id="faq" ref={ref} className="py-32 px-6">
      <div className="max-w-3xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 30 }} animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }} className="text-center mb-16">
          <h2 className="text-4xl font-black tracking-tight">
            Common <span className="gradient-text">questions</span>
          </h2>
        </motion.div>

        <div className="space-y-3">
          {faqs.map((faq, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: i * 0.08 }}
              className={`glass rounded-xl overflow-hidden transition-all duration-300 ${open === i ? 'border-accent/30' : ''}`}>
              <button onClick={() => setOpen(open === i ? null : i)}
                className="w-full flex items-center justify-between p-6 text-left">
                <span className="font-semibold pr-4">{faq.q}</span>
                {open === i
                  ? <Minus className="w-4 h-4 text-accent flex-shrink-0" />
                  : <Plus className="w-4 h-4 text-slate-400 flex-shrink-0" />}
              </button>
              {open === i && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                  transition={{ duration: 0.3 }} className="px-6 pb-6 text-slate-400 leading-relaxed text-sm">
                  {faq.a}
                </motion.div>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
```

**File:** `apps/web/components/landing/CTA.tsx`
```tsx
'use client';
import { motion } from 'framer-motion';
import { useInView } from 'framer-motion';
import { useRef } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

export function CTASection() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-100px' });

  return (
    <section ref={ref} className="py-32 px-6">
      <motion.div initial={{ opacity: 0, y: 40 }} animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.8 }}
        className="max-w-4xl mx-auto text-center relative">
        {/* Glow backdrop */}
        <div className="absolute inset-0 rounded-3xl"
          style={{ background: 'radial-gradient(ellipse at 50% 50%, rgba(59,130,246,0.15) 0%, transparent 70%)' }} />

        <div className="relative glass rounded-3xl p-16 border-accent/20">
          <h2 className="text-4xl md:text-6xl font-black tracking-tight">
            Your first video is <span className="gradient-text">free.</span>
          </h2>
          <p className="mt-6 text-xl text-slate-400 max-w-xl mx-auto">
            No credit card required. No editing software. No waiting.
            Just your content — and a finished video in minutes.
          </p>
          <Link href="/signup"
            className="mt-10 inline-flex items-center gap-2 px-10 py-5 rounded-xl bg-gradient-to-r from-accent to-cyan text-white font-bold text-xl hover:opacity-90 transition-all duration-200 glow-blue-intense">
            Create My First Video
            <ArrowRight className="w-6 h-6" />
          </Link>
          <p className="mt-4 text-sm text-slate-600">Takes 30 seconds to sign up · No card required</p>
        </div>
      </motion.div>
    </section>
  );
}
```

**File:** `apps/web/components/landing/Footer.tsx`
```tsx
import Link from 'next/link';
import { Zap } from 'lucide-react';

export function Footer() {
  return (
    <footer className="border-t border-white/5 py-12 px-6">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-accent to-cyan flex items-center justify-center">
            <Zap className="w-3.5 h-3.5 text-white fill-white" />
          </div>
          <span className="font-bold">Video<span className="gradient-text">Forge</span></span>
        </div>
        <div className="flex items-center gap-8 text-sm text-slate-500">
          {['Privacy', 'Terms', 'Pricing', 'Contact'].map((l) => (
            <Link key={l} href={`/${l.toLowerCase()}`} className="hover:text-white transition-colors">{l}</Link>
          ))}
        </div>
        <p className="text-sm text-slate-600">© 2026 VideoForge. All rights reserved.</p>
      </div>
    </footer>
  );
}
```

**File:** `apps/web/app/(marketing)/page.tsx` — assembles everything
```tsx
import { Navbar } from '@/components/landing/Navbar';
import { Hero } from '@/components/landing/Hero';
import { HowItWorks } from '@/components/landing/HowItWorks';
import { InputTypes } from '@/components/landing/InputTypes';
import { Pricing } from '@/components/landing/Pricing';
import { FAQ } from '@/components/landing/FAQ';
import { CTASection } from '@/components/landing/CTA';
import { Footer } from '@/components/landing/Footer';

export default function HomePage() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <HowItWorks />
        <InputTypes />
        <Pricing />
        <FAQ />
        <CTASection />
      </main>
      <Footer />
    </>
  );
}
```

---

## Task 8: Auth Pages (Login + Signup)

**Files:**
- `apps/web/lib/supabase/client.ts`
- `apps/web/lib/supabase/server.ts`
- `apps/web/app/(auth)/login/page.tsx`
- `apps/web/app/(auth)/signup/page.tsx`
- `apps/web/app/(auth)/layout.tsx`

**File:** `apps/web/lib/supabase/client.ts`
```ts
import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

**File:** `apps/web/lib/supabase/server.ts`
```ts
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          try { cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)); }
          catch {}
        },
      },
    }
  );
}
```

**File:** `apps/web/app/(auth)/layout.tsx`
```tsx
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center px-6 relative">
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse at 50% 30%, rgba(59,130,246,0.1) 0%, transparent 60%)' }} />
      {children}
    </div>
  );
}
```

**File:** `apps/web/app/(auth)/signup/page.tsx`
```tsx
'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Zap, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError('');
    const supabase = createClient();
    const { error } = await supabase.auth.signUp({
      email, password,
      options: { data: { full_name: name } },
    });
    if (error) { setError(error.message); setLoading(false); return; }
    router.push('/dashboard');
  }

  return (
    <div className="w-full max-w-md">
      {/* Logo */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent to-cyan flex items-center justify-center glow-blue">
            <Zap className="w-5 h-5 text-white fill-white" />
          </div>
          <span className="text-2xl font-black">Video<span className="gradient-text">Forge</span></span>
        </div>
        <h1 className="text-3xl font-black mb-2">Create your account</h1>
        <p className="text-slate-400">Start with 1 free video — no card needed</p>
      </div>

      <form onSubmit={handleSignup} className="glass rounded-2xl p-8 space-y-4">
        {error && <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">{error}</div>}

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1.5">Full name</label>
          <input value={name} onChange={e => setName(e.target.value)} required placeholder="Jane Smith"
            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-accent/50 transition-colors" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1.5">Email</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="you@company.com"
            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-accent/50 transition-colors" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1.5">Password</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="Min 8 characters"
            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-accent/50 transition-colors" />
        </div>

        <button type="submit" disabled={loading}
          className="w-full py-3 rounded-xl bg-gradient-to-r from-accent to-cyan text-white font-bold text-lg hover:opacity-90 transition-all duration-200 glow-blue flex items-center justify-center gap-2 disabled:opacity-50">
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Create Account →'}
        </button>
      </form>

      <p className="text-center text-sm text-slate-500 mt-4">
        Already have an account?{' '}
        <Link href="/login" className="text-accent hover:underline">Sign in</Link>
      </p>
    </div>
  );
}
```

**File:** `apps/web/app/(auth)/login/page.tsx` — Same structure as signup, call `supabase.auth.signInWithPassword`.

---

## Task 9: App Layout + Dashboard

**Files:**
- `apps/web/app/(app)/layout.tsx` — sidebar layout (auth-guarded)
- `apps/web/app/(app)/dashboard/page.tsx`
- `apps/web/components/app/Sidebar.tsx`
- `apps/web/components/app/VideoCard.tsx`

**File:** `apps/web/components/app/Sidebar.tsx`
```tsx
'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Zap, LayoutDashboard, PlusCircle, CreditCard, Settings, LogOut } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

const nav = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/videos/new', icon: PlusCircle, label: 'New Video' },
  { href: '/billing', icon: CreditCard, label: 'Billing' },
  { href: '/settings', icon: Settings, label: 'Settings' },
];

export function Sidebar({ credits }: { credits: number }) {
  const pathname = usePathname();
  const router = useRouter();

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/');
  }

  return (
    <aside className="w-64 flex-shrink-0 flex flex-col h-screen sticky top-0 border-r border-white/5 bg-bg">
      {/* Logo */}
      <div className="p-6 border-b border-white/5">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent to-cyan flex items-center justify-center">
            <Zap className="w-4 h-4 text-white fill-white" />
          </div>
          <span className="font-bold">Video<span className="gradient-text">Forge</span></span>
        </Link>
      </div>

      {/* Credits badge */}
      <div className="mx-4 mt-4 p-3 rounded-xl bg-accent/10 border border-accent/20">
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-400">Credits remaining</span>
          <span className="text-xs text-accent font-bold">Buy more</span>
        </div>
        <div className="mt-1 text-2xl font-black text-white">{credits}</div>
        <div className="mt-2 h-1.5 rounded-full bg-white/10 overflow-hidden">
          <div className="h-full bg-gradient-to-r from-accent to-cyan rounded-full" style={{ width: `${Math.min(credits * 10, 100)}%` }} />
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-4 space-y-1">
        {nav.map(({ href, icon: Icon, label }) => (
          <Link key={href} href={href}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
              pathname === href
                ? 'bg-accent/10 text-accent border border-accent/20'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}>
            <Icon className="w-4 h-4" />
            {label}
          </Link>
        ))}
      </nav>

      {/* Sign out */}
      <div className="p-4 border-t border-white/5">
        <button onClick={signOut} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-slate-400 hover:text-white hover:bg-white/5 transition-all duration-200 w-full">
          <LogOut className="w-4 h-4" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
```

**File:** `apps/web/app/(app)/layout.tsx`
```tsx
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Sidebar } from '@/components/app/Sidebar';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('credits, plan')
    .eq('id', user.id)
    .single();

  return (
    <div className="flex min-h-screen">
      <Sidebar credits={profile?.credits ?? 0} />
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
```

**File:** `apps/web/app/(app)/dashboard/page.tsx`
```tsx
import { createClient } from '@/lib/supabase/server';
import { VideoCard } from '@/components/app/VideoCard';
import { PlusCircle } from 'lucide-react';
import Link from 'next/link';

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: videos } = await supabase
    .from('videos')
    .select('*')
    .eq('user_id', user!.id)
    .order('created_at', { ascending: false })
    .limit(20);

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-black">Your Videos</h1>
          <p className="text-slate-400 mt-1">{videos?.length ?? 0} videos generated</p>
        </div>
        <Link href="/videos/new"
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-accent to-cyan text-white font-semibold hover:opacity-90 transition-all glow-blue">
          <PlusCircle className="w-4 h-4" />
          New Video
        </Link>
      </div>

      {videos?.length === 0 ? (
        <div className="glass rounded-2xl p-16 text-center">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center mb-4">
            <PlusCircle className="w-8 h-8 text-accent" />
          </div>
          <h3 className="text-xl font-bold mb-2">No videos yet</h3>
          <p className="text-slate-400 mb-6">Create your first video in minutes</p>
          <Link href="/videos/new" className="px-6 py-3 rounded-xl bg-gradient-to-r from-accent to-cyan text-white font-semibold hover:opacity-90 transition-all glow-blue">
            Create First Video →
          </Link>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
          {videos?.map((video) => <VideoCard key={video.id} video={video} />)}
        </div>
      )}
    </div>
  );
}
```

**File:** `apps/web/components/app/VideoCard.tsx`
```tsx
'use client';
import { Play, Download, Clock, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';

const statusConfig = {
  queued:     { icon: Clock,         color: 'text-slate-400', label: 'Queued' },
  processing: { icon: Loader2,       color: 'text-accent',    label: 'Processing...' },
  complete:   { icon: CheckCircle,   color: 'text-success',   label: 'Ready' },
  failed:     { icon: AlertCircle,   color: 'text-danger',    label: 'Failed' },
};

export function VideoCard({ video }: { video: any }) {
  const status = statusConfig[video.status as keyof typeof statusConfig];
  const StatusIcon = status.icon;

  return (
    <div className="glass rounded-2xl overflow-hidden group hover:border-accent/20 transition-all duration-300 hover:-translate-y-0.5">
      {/* Thumbnail */}
      <div className="relative aspect-video bg-bg-card flex items-center justify-center">
        {video.thumbnail_url
          ? <img src={video.thumbnail_url} alt={video.title} className="w-full h-full object-cover" />
          : <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
              <Play className="w-6 h-6 text-accent" />
            </div>
        }
        {video.status === 'processing' && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/10">
            <div className="h-full bg-gradient-to-r from-accent to-cyan animate-pulse" style={{ width: `${video.progress}%` }} />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="font-semibold text-sm truncate">{video.title}</h3>
          <div className={`flex items-center gap-1 text-xs ${status.color} flex-shrink-0`}>
            <StatusIcon className={`w-3 h-3 ${video.status === 'processing' ? 'animate-spin' : ''}`} />
            {status.label}
          </div>
        </div>
        <p className="text-xs text-slate-500">{formatDistanceToNow(new Date(video.created_at), { addSuffix: true })}</p>

        {video.status === 'complete' && (
          <div className="mt-3 flex gap-2">
            <Link href={`/videos/${video.id}`} className="flex-1 py-2 rounded-lg bg-accent/10 border border-accent/20 text-accent text-xs font-medium text-center hover:bg-accent/20 transition-colors">
              View
            </Link>
            <a href={video.output_url} download className="flex items-center gap-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-xs font-medium hover:bg-white/10 transition-colors">
              <Download className="w-3 h-3" />
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
```

---

## Task 10: New Video Wizard

**File:** `apps/web/app/(app)/videos/new/page.tsx`

4-step wizard: ① Input type → ② Provide content → ③ Style (future) → ④ Review & Submit

```tsx
'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Globe, FileText, Presentation, MessageSquare, ArrowRight, ArrowLeft, Loader2, Upload } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

const inputTypes = [
  { id: 'url',    label: 'Website URL',    icon: Globe,         desc: 'We scrape and extract key messages' },
  { id: 'pdf',    label: 'PDF Document',   icon: FileText,      desc: 'Brochure, proposal, report, case study' },
  { id: 'ppt',    label: 'PowerPoint',     icon: Presentation,  desc: 'Upload your existing slide deck' },
  { id: 'prompt', label: 'Text Prompt',    icon: MessageSquare, desc: 'Describe your product in plain English' },
];

export default function NewVideoPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [inputType, setInputType] = useState<string>('');
  const [url, setUrl] = useState('');
  const [prompt, setPrompt] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit() {
    setLoading(true); setError('');
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      let inputData: any = {};
      let uploadedFileName: string | undefined;

      // Upload file to Supabase Storage if needed
      if (file && (inputType === 'pdf' || inputType === 'ppt')) {
        const ext = file.name.split('.').pop();
        const path = `${user!.id}/${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage.from('uploads').upload(path, file);
        if (upErr) throw new Error('File upload failed: ' + upErr.message);
        uploadedFileName = path;
        inputData = { fileName: uploadedFileName };
      } else if (inputType === 'url') {
        inputData = { url };
      } else {
        inputData = { text: prompt };
      }

      // Create video record
      const { data: video, error: dbErr } = await supabase
        .from('videos')
        .insert({ title: title || `Video ${new Date().toLocaleDateString()}`, input_type: inputType, input_data: inputData, user_id: user!.id })
        .select()
        .single();
      if (dbErr) throw new Error(dbErr.message);

      // Submit job to VPS worker API
      await fetch(`${process.env.NEXT_PUBLIC_WORKER_URL}/jobs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': process.env.NEXT_PUBLIC_WORKER_API_KEY! },
        body: JSON.stringify({ videoId: video.id, userId: user!.id, inputType, inputData }),
      });

      router.push(`/videos/${video.id}`);
    } catch (e: any) {
      setError(e.message);
      setLoading(false);
    }
  }

  return (
    <div className="p-8 max-w-3xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-black">Create New Video</h1>
        <div className="mt-4 flex items-center gap-2">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${s <= step ? 'bg-accent text-white' : 'bg-white/10 text-slate-500'}`}>{s}</div>
              {s < 3 && <div className={`w-16 h-px transition-all ${s < step ? 'bg-accent' : 'bg-white/10'}`} />}
            </div>
          ))}
          <span className="ml-2 text-sm text-slate-500">
            {step === 1 ? 'Input type' : step === 2 ? 'Your content' : 'Review'}
          </span>
        </div>
      </div>

      {error && <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">{error}</div>}

      {/* Step 1: Input type */}
      {step === 1 && (
        <div className="grid grid-cols-2 gap-4">
          {inputTypes.map((t) => (
            <button key={t.id} onClick={() => { setInputType(t.id); setStep(2); }}
              className={`glass p-6 rounded-2xl text-left hover:border-accent/30 transition-all duration-200 hover:-translate-y-0.5 ${inputType === t.id ? 'border-accent/50 bg-accent/5' : ''}`}>
              <t.icon className="w-8 h-8 text-accent mb-3" />
              <div className="font-bold mb-1">{t.label}</div>
              <div className="text-sm text-slate-400">{t.desc}</div>
            </button>
          ))}
        </div>
      )}

      {/* Step 2: Content */}
      {step === 2 && (
        <div className="glass rounded-2xl p-8 space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Video title (optional)</label>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="My Product Ad"
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-accent/50 transition-colors" />
          </div>

          {inputType === 'url' && (
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Website URL</label>
              <input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://yourproduct.com"
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-accent/50 transition-colors" />
            </div>
          )}

          {(inputType === 'pdf' || inputType === 'ppt') && (
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Upload {inputType.toUpperCase()}</label>
              <label className="flex flex-col items-center justify-center w-full h-32 rounded-xl border-2 border-dashed border-white/20 hover:border-accent/40 cursor-pointer transition-colors">
                <Upload className="w-8 h-8 text-slate-500 mb-2" />
                <span className="text-sm text-slate-400">{file ? file.name : 'Click to upload or drag & drop'}</span>
                <input type="file" className="hidden" accept={inputType === 'pdf' ? '.pdf' : '.ppt,.pptx'}
                  onChange={e => setFile(e.target.files?.[0] ?? null)} />
              </label>
            </div>
          )}

          {inputType === 'prompt' && (
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Describe your product</label>
              <textarea value={prompt} onChange={e => setPrompt(e.target.value)} rows={5}
                placeholder="We sell a SaaS platform that helps HR teams automate onboarding. Our main features are..."
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-accent/50 transition-colors resize-none" />
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button onClick={() => setStep(1)} className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-white/10 text-slate-400 hover:text-white transition-colors">
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
            <button onClick={() => setStep(3)} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent/10 border border-accent/20 text-accent hover:bg-accent/20 transition-colors">
              Review <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Review & Submit */}
      {step === 3 && (
        <div className="glass rounded-2xl p-8">
          <h2 className="text-xl font-bold mb-6">Ready to generate</h2>
          <div className="space-y-3 mb-8">
            {[
              { label: 'Input type', value: inputTypes.find(t => t.id === inputType)?.label },
              { label: 'Content', value: url || (file?.name) || prompt?.slice(0, 80) + '...' },
              { label: 'Title', value: title || 'Auto-generated' },
              { label: 'Credit cost', value: '1 credit' },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-center justify-between py-3 border-b border-white/5">
                <span className="text-slate-400 text-sm">{label}</span>
                <span className="text-sm font-medium">{value}</span>
              </div>
            ))}
          </div>

          <div className="flex gap-3">
            <button onClick={() => setStep(2)} className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-white/10 text-slate-400 hover:text-white transition-colors">
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
            <button onClick={handleSubmit} disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-accent to-cyan text-white font-bold hover:opacity-90 transition-all glow-blue disabled:opacity-50">
              {loading ? <><Loader2 className="w-5 h-5 animate-spin" /> Submitting...</> : <>Generate Video — 1 Credit <ArrowRight className="w-4 h-4" /></>}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
```

---

## Task 11: Video Result Page (with Realtime progress)

**File:** `apps/web/app/(app)/videos/[id]/page.tsx`
```tsx
'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Download, CheckCircle, Loader2, AlertCircle, Clock } from 'lucide-react';

export default function VideoPage({ params }: { params: { id: string } }) {
  const [video, setVideo] = useState<any>(null);

  useEffect(() => {
    const supabase = createClient();

    // Initial fetch
    supabase.from('videos').select('*').eq('id', params.id).single()
      .then(({ data }) => setVideo(data));

    // Realtime subscription
    const channel = supabase.channel('video-' + params.id)
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'videos', filter: `id=eq.${params.id}`,
      }, ({ new: updated }) => setVideo(updated))
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [params.id]);

  if (!video) return <div className="p-8 text-slate-400">Loading...</div>;

  return (
    <div className="p-8 max-w-4xl">
      <h1 className="text-3xl font-black mb-8">{video.title}</h1>

      {/* Status */}
      {video.status !== 'complete' && (
        <div className="glass rounded-2xl p-8 mb-8 text-center">
          {video.status === 'queued' && <><Clock className="w-12 h-12 text-slate-400 mx-auto mb-3" /><p className="text-xl font-bold">Queued</p><p className="text-slate-400 mt-1">Your video will start processing shortly</p></>}
          {video.status === 'processing' && (
            <>
              <Loader2 className="w-12 h-12 text-accent mx-auto mb-3 animate-spin" />
              <p className="text-xl font-bold">{video.current_step || 'Processing...'}</p>
              <div className="mt-4 max-w-xs mx-auto h-2 rounded-full bg-white/10 overflow-hidden">
                <div className="h-full bg-gradient-to-r from-accent to-cyan rounded-full transition-all duration-1000" style={{ width: `${video.progress}%` }} />
              </div>
              <p className="text-slate-400 mt-2 text-sm">{video.progress}% complete</p>
            </>
          )}
          {video.status === 'failed' && <><AlertCircle className="w-12 h-12 text-danger mx-auto mb-3" /><p className="text-xl font-bold text-danger">Generation failed</p><p className="text-slate-400 mt-1 text-sm">{video.error_msg}</p></>}
        </div>
      )}

      {/* Video player */}
      {video.status === 'complete' && video.output_url && (
        <div className="space-y-6">
          <div className="rounded-2xl overflow-hidden border border-white/10 glow-blue">
            <video controls className="w-full" src={video.output_url}>
              Your browser does not support video.
            </video>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-success">
              <CheckCircle className="w-5 h-5" />
              <span className="font-semibold">Ready to use</span>
            </div>
            <a href={video.output_url} download
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-accent to-cyan text-white font-bold hover:opacity-90 transition-all glow-blue ml-auto">
              <Download className="w-5 h-5" />
              Download MP4
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
```

---

## Task 12: Environment Variables

**File:** `apps/web/.env.local`
```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
NEXT_PUBLIC_WORKER_URL=https://api.yourdomain.com
NEXT_PUBLIC_WORKER_API_KEY=your_random_secret_32chars
```

**File:** `apps/worker/.env`
```env
PORT=3001
REDIS_URL=redis://127.0.0.1:6379
REDIS_PASSWORD=your_redis_password
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
ELEVENLABS_API_KEY=sk_...
GEMINI_API_KEY=AIza...
ANTHROPIC_API_KEY=sk-ant-...
API_SECRET_KEY=your_random_secret_32chars
WORKER_CONCURRENCY=2
```

---

## Task 13: VPS Worker — Express API

**File:** `apps/worker/src/api/index.ts`
```ts
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import { jobsRouter } from './jobs';

const app = express();
app.use(helmet());
app.use(cors({ origin: process.env.ALLOWED_ORIGIN || '*' }));
app.use(express.json());
app.use(morgan('short'));

// Auth middleware
app.use((req, res, next) => {
  if (req.headers['x-api-key'] !== process.env.API_SECRET_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
});

app.use('/jobs', jobsRouter);
app.get('/health', (_, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Worker API on :${PORT}`));
export default app;
```

**File:** `apps/worker/src/api/jobs.ts`
```ts
import { Router } from 'express';
import { videoQueue } from '../queue';
import { supabase } from '../lib/supabase';

export const jobsRouter = Router();

jobsRouter.post('/', async (req, res) => {
  const { videoId, userId, inputType, inputData } = req.body;
  if (!videoId || !userId || !inputType) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  // Deduct credit via Supabase RPC
  const { error } = await supabase.rpc('use_credit', { p_user_id: userId, p_video_id: videoId });
  if (error) return res.status(402).json({ error: 'Insufficient credits' });

  // Enqueue
  const job = await videoQueue.add('generate-video', { videoId, userId, inputType, inputData }, {
    attempts: 2, backoff: { type: 'exponential', delay: 5000 },
  });
  res.json({ jobId: job.id, videoId });
});

jobsRouter.get('/:id', async (req, res) => {
  const job = await videoQueue.getJob(req.params.id);
  if (!job) return res.status(404).json({ error: 'Not found' });
  res.json({ id: job.id, status: await job.getState(), progress: job.progress });
});
```

---

## Task 14: VPS Worker — Video Pipeline

**File:** `apps/worker/src/jobs/pipeline.ts`
```ts
import { supabase } from '../lib/supabase';
import { scrapeUrl } from './scraper';
import { parsePdf, parsePpt } from './parser';
import { generateScript } from './scriptgen';
import { generateVoiceovers } from './tts';
import { generateImages } from './images';
import { renderVideo } from './render';
import { uploadVideo } from './upload';

async function updateStatus(videoId: string, status: string, progress: number, currentStep: string) {
  await supabase.from('videos').update({ status, progress, current_step: currentStep, updated_at: new Date().toISOString() }).eq('id', videoId);
}

export async function runVideoPipeline(job: any) {
  const { videoId, inputType, inputData } = job.data;
  const workDir = `/tmp/videoforge/${videoId}`;

  try {
    await updateStatus(videoId, 'processing', 5, 'Extracting content...');

    // 1. Extract text from source
    let sourceText = '';
    if (inputType === 'url') sourceText = await scrapeUrl(inputData.url);
    else if (inputType === 'pdf') sourceText = await parsePdf(inputData.fileName);
    else if (inputType === 'ppt') sourceText = await parsePpt(inputData.fileName);
    else sourceText = inputData.text;

    await updateStatus(videoId, 'processing', 15, 'Writing script...');

    // 2. Generate 7-scene script via Claude
    const scenes = await generateScript(sourceText, inputType);

    await updateStatus(videoId, 'processing', 25, 'Recording voiceover...');

    // 3. ElevenLabs TTS for each scene
    const audioPaths = await generateVoiceovers(scenes, workDir);

    await updateStatus(videoId, 'processing', 45, 'Generating visuals...');

    // 4. Gemini free-tier images
    const imagePaths = await generateImages(scenes, workDir);

    await updateStatus(videoId, 'processing', 60, 'Rendering video...');

    // 5. Remotion render
    const mp4Path = await renderVideo({ videoId, scenes, audioPaths, imagePaths, workDir });

    await updateStatus(videoId, 'processing', 85, 'Uploading...');

    // 6. Upload to Supabase Storage
    const outputUrl = await uploadVideo(mp4Path, videoId);

    // 7. Mark complete
    await supabase.from('videos').update({
      status: 'complete', progress: 100, output_url: outputUrl,
      current_step: 'Done', updated_at: new Date().toISOString(),
    }).eq('id', videoId);

  } catch (err: any) {
    await supabase.from('videos').update({
      status: 'failed', error_msg: err.message, updated_at: new Date().toISOString(),
    }).eq('id', videoId);
    throw err;
  }
}
```

**File:** `apps/worker/src/jobs/scriptgen.ts`
```ts
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();

export async function generateScript(sourceText: string, inputType: string): Promise<string[]> {
  const response = await client.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 2000,
    messages: [{
      role: 'user',
      content: `You are an expert video ad scriptwriter. Based on the following content, write a 7-scene professional video advertisement script.

Source content (${inputType}):
${sourceText.slice(0, 3000)}

Output a JSON array of exactly 7 strings. Each string is the voiceover text for one scene (15-25 words each). Follow this narrative arc:
1. Pain/problem hook
2. Amplify the problem
3. Cost of the problem
4. Brand introduction
5. Solution explanation (features)
6. Social proof / results
7. Call to action

Respond ONLY with valid JSON array, no other text. Example: ["Scene 1 text.", "Scene 2 text.", ...]`,
    }],
  });

  const text = (response.content[0] as any).text;
  return JSON.parse(text);
}
```

**File:** `apps/worker/src/jobs/render.ts`
```ts
import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';

const REMOTION_ROOT = path.resolve(__dirname, '../../../packages/remotion');

export async function renderVideo({ videoId, scenes, audioPaths, imagePaths, workDir }: any): Promise<string> {
  const outPath = path.join(workDir, 'output.mp4');
  fs.mkdirSync(workDir, { recursive: true });

  // Write scene data as JSON for Remotion to read
  const sceneDataPath = path.join(workDir, 'scenes.json');
  fs.writeFileSync(sceneDataPath, JSON.stringify({ scenes, audioPaths, imagePaths }));

  // Copy assets to Remotion public directory
  // (Remotion reads from its own public/ folder)
  const remotionPublic = path.join(REMOTION_ROOT, 'public');
  fs.mkdirSync(path.join(remotionPublic, 'audio/voiceover'), { recursive: true });
  fs.mkdirSync(path.join(remotionPublic, 'images'), { recursive: true });

  audioPaths.forEach((src: string, i: number) => {
    fs.copyFileSync(src, path.join(remotionPublic, `audio/voiceover/scene${i + 1}.mp3`));
  });
  imagePaths.forEach((src: string, label: string) => {
    fs.copyFileSync(src, path.join(remotionPublic, `images/${label}`));
  });

  execSync(
    `npx remotion render VideoForgeAd ${outPath} --codec h264`,
    { cwd: REMOTION_ROOT, stdio: 'pipe', timeout: 300_000 }
  );

  return outPath;
}
```

---

## Task 15: VPS Setup Guide

Run these commands on the VPS (Ubuntu 22.04, logged in as root or sudo user):

```bash
# ── 1. System update ────────────────────────────────────────
apt update && apt upgrade -y
apt install -y curl git build-essential nginx certbot python3-certbot-nginx

# ── 2. Swap file (2GB) ──────────────────────────────────────
fallocate -l 2G /swapfile
chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab

# ── 3. Node.js 20 via nvm ───────────────────────────────────
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
source ~/.bashrc
nvm install 20 && nvm use 20 && nvm alias default 20
npm i -g pm2

# ── 4. Redis ────────────────────────────────────────────────
apt install -y redis-server
# Set password in /etc/redis/redis.conf:
sed -i 's/# requirepass foobared/requirepass YOUR_REDIS_PASSWORD/' /etc/redis/redis.conf
systemctl restart redis && systemctl enable redis

# ── 5. ffmpeg + Chromium (for Remotion) ─────────────────────
apt install -y ffmpeg chromium-browser
# Fonts for Remotion text rendering:
apt install -y fonts-noto fonts-liberation2

# ── 6. Playwright (for URL scraping) ────────────────────────
npx playwright install chromium --with-deps

# ── 7. UFW firewall ─────────────────────────────────────────
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw enable

# ── 8. Clone repo ───────────────────────────────────────────
mkdir -p /var/www/videoforge
git clone https://github.com/YOUR_USERNAME/resend-web-adv.git /var/www/videoforge
cd /var/www/videoforge
npm install

# ── 9. Worker .env ──────────────────────────────────────────
cp apps/worker/.env.example apps/worker/.env
nano apps/worker/.env  # fill in all secrets

# ── 10. Build worker ────────────────────────────────────────
cd apps/worker && npm run build

# ── 11. PM2 ecosystem config ────────────────────────────────
# Create /var/www/videoforge/ecosystem.config.js:
cat > /var/www/videoforge/ecosystem.config.js << 'EOF'
module.exports = {
  apps: [
    {
      name: 'videoforge-api',
      cwd: '/var/www/videoforge/apps/worker',
      script: 'dist/api/index.js',
      env_file: '.env',
      instances: 1,
      autorestart: true,
    },
    {
      name: 'videoforge-worker',
      cwd: '/var/www/videoforge/apps/worker',
      script: 'dist/queue/worker.js',
      env_file: '.env',
      instances: 1,
      autorestart: true,
    },
  ],
};
EOF

pm2 start ecosystem.config.js
pm2 save && pm2 startup

# ── 12. Nginx config ────────────────────────────────────────
cat > /etc/nginx/sites-available/videoforge-api << 'EOF'
server {
    server_name api.yourdomain.com;
    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        client_max_body_size 50M;
    }
}
EOF

ln -s /etc/nginx/sites-available/videoforge-api /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx

# ── 13. SSL cert ────────────────────────────────────────────
certbot --nginx -d api.yourdomain.com --non-interactive --agree-tos -m admin@yourdomain.com

# ── 14. Verify ──────────────────────────────────────────────
curl https://api.yourdomain.com/health
# Expected: {"ok":true}
```

---

## Task 16: Stripe Billing Page + Webhook

**Files:**
- `apps/web/app/(app)/billing/page.tsx` — show plan, credits, buy more
- `apps/web/app/api/stripe/webhook/route.ts` — handle subscription events

Billing page shows current plan, credits remaining, and a Stripe Checkout button for upgrades. Webhook adds credits to `profiles.credits` and inserts into `credit_ledger`.

This is standard Stripe Checkout + webhook pattern — implement after core UI and worker are confirmed working.

---

## Execution Order

1. ✅ Tasks 1–3: Scaffold + schema + design system
2. ✅ Tasks 4–7: Full landing page (all sections)
3. ✅ Tasks 8–9: Auth + dashboard
4. ✅ Tasks 10–11: Video wizard + result page
5. ✅ Task 12: Environment variables
6. ✅ Tasks 13–14: VPS worker + pipeline
7. ✅ Task 15: VPS setup on server
8. ✅ Task 16: Stripe billing
