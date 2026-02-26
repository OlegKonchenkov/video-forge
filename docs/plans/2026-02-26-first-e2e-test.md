# First End-to-End Test — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix all code bugs and infrastructure gaps blocking the first end-to-end video generation test (URL → AI script → TTS → images → Remotion render → Supabase Storage → playback).

**Architecture:** Next.js (Vercel) → Supabase (DB + Storage) → Worker API (VPS Docker Compose: `worker-api` + `worker-queue` + `redis`) → Remotion render → Supabase Storage → `videos/[id]` playback page

**Tech Stack:** Next.js 14 App Router, Supabase (Postgres + Storage + Realtime), BullMQ/Redis, Remotion, ElevenLabs TTS, Gemini image gen, Claude Anthropic (script gen)

---

## Status Summary

| Component | Status |
|-----------|--------|
| VPS Docker Compose live | ✅ |
| Full pipeline code | ✅ |
| Supabase migrations written | ✅ (not yet applied) |
| Stripe routes | ✅ |
| Voiceover paths (worker ↔ Remotion) | ✅ match |
| **Composition name in render.ts** | ❌ `VideoForgeAd` should be `AgentForgeAd` |
| **bg-hero.png filename in render.ts** | ❌ `bg-pain` should be `bg-hero` |
| **Supabase schema on cloud** | ❌ migrations not run |
| **Storage buckets** | ❌ not created |
| **Worker .env on VPS** | ❓ unknown |
| `videos/[id]` UI | ⚠️ old glass/blue design |
| `billing/page.tsx` | ⚠️ bypasses dev mock |

---

## Phase 1 — Code Fixes (local → commit → deploy to VPS)

### Task 1: Fix `render.ts` — composition name + image filename

**Files:**
- Modify: `apps/worker/src/jobs/render.ts`

Root cause A: `Root.tsx` registers composition `id="AgentForgeAd"` but `render.ts` runs `npx remotion render VideoForgeAd` → Remotion exits with "No composition with ID VideoForgeAd found" error.

Root cause B: `Scene1Pain.tsx` reads `staticFile('images/bg-hero.png')` but `render.ts` copies the Gemini-generated image as `images/bg-pain.png` → Scene 1 gets a blank background.

**Step 1: Edit `apps/worker/src/jobs/render.ts`**

Change line 29: `bgNames` array, first element from `'bg-pain'` to `'bg-hero'`:
```ts
const bgNames = ['bg-hero', 'bg-chaos', 'bg-cost', 'bg-logo', 'bg-solution', 'bg-stats', 'bg-cta'];
```

Change line 36: render command:
```ts
execSync(
  `npx remotion render AgentForgeAd "${outPath}" --codec h264`,
  { cwd: REMOTION_ROOT, stdio: 'pipe', timeout: 300_000 }
);
```

**Step 2: Commit**
```bash
git add apps/worker/src/jobs/render.ts
git commit -m "fix(worker): correct Remotion composition name VideoForgeAd→AgentForgeAd, fix bg-hero filename"
```

---

### Task 2: Restyle `videos/[id]/page.tsx` — film noir design

**Files:**
- Modify: `apps/web/app/(app)/videos/[id]/page.tsx`

The page still uses old blue/glassmorphism tokens (`glass`, `text-accent`, `glow-blue`). Replace with film noir tokens.

**Step 1: Rewrite the file**

```tsx
'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Download, CheckCircle, Loader2, AlertCircle, Clock } from 'lucide-react';

export default function VideoPage({ params }: { params: { id: string } }) {
  const [video, setVideo] = useState<any>(null);

  useEffect(() => {
    const supabase = createClient();

    supabase.from('videos').select('*').eq('id', params.id).single()
      .then(({ data }: { data: any }) => setVideo(data));

    const channel = supabase.channel('video-' + params.id)
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'videos', filter: `id=eq.${params.id}`,
      }, ({ new: updated }: { new: any }) => setVideo(updated))
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [params.id]);

  if (!video) return (
    <div className="p-8 text-film-gray font-sans text-sm">Loading...</div>
  );

  return (
    <div className="max-w-4xl mx-auto px-6 py-10 space-y-8">
      {/* Header */}
      <div className="border-b border-film-border pb-6">
        <span className="section-label mb-2 block">Your Video</span>
        <h1 className="font-display text-4xl tracking-wider text-film-cream">{video.title}</h1>
      </div>

      {/* Status card — shown while not complete */}
      {video.status !== 'complete' && (
        <div className="film-card p-10 text-center space-y-4">
          {video.status === 'queued' && (
            <>
              <Clock className="w-10 h-10 text-film-gray mx-auto" />
              <p className="font-display text-2xl tracking-wider text-film-cream">Queued</p>
              <p className="text-film-gray font-sans text-sm">Your video will start processing shortly</p>
            </>
          )}
          {video.status === 'processing' && (
            <>
              <Loader2 className="w-10 h-10 text-film-amber mx-auto animate-spin" />
              <p className="font-display text-2xl tracking-wider text-film-cream">
                {video.current_step || 'Processing…'}
              </p>
              <div className="max-w-xs mx-auto">
                <div className="h-0.5 bg-film-border overflow-hidden">
                  <div
                    className="h-full bg-film-amber transition-all duration-1000"
                    style={{ width: `${video.progress}%` }}
                  />
                </div>
                <p className="text-film-gray font-sans text-xs mt-2">{video.progress}% complete</p>
              </div>
            </>
          )}
          {video.status === 'failed' && (
            <>
              <AlertCircle className="w-10 h-10 text-red-500 mx-auto" />
              <p className="font-display text-2xl tracking-wider text-red-400">Generation Failed</p>
              <p className="text-film-gray font-sans text-sm">{video.error_msg}</p>
            </>
          )}
        </div>
      )}

      {/* Video player — shown when complete */}
      {video.status === 'complete' && video.output_url && (
        <div className="space-y-5">
          <div className="film-card overflow-hidden p-0">
            <video controls className="w-full block" src={video.output_url}>
              Your browser does not support video.
            </video>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-film-amber font-sans text-sm font-semibold">
              <CheckCircle className="w-4 h-4" />
              Ready to use
            </div>
            <a
              href={video.output_url}
              download
              className="btn-amber ml-auto flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Download MP4
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
```

**Step 2: Commit**
```bash
git add apps/web/app/\(app\)/videos/\[id\]/page.tsx
git commit -m "style(web): restyle videos/[id] page to film noir design system"
```

---

### Task 3: Fix `billing/page.tsx` — use shared `createClient()`

**Files:**
- Modify: `apps/web/app/(app)/billing/page.tsx`

Current: `createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, ...)` — bypasses the dev mock client.
Fix: import from `@/lib/supabase/client` so dev mode works.

**Step 1: Replace the import + instantiation**

Remove:
```ts
import { createBrowserClient } from '@supabase/ssr';
// ...
const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);
```

Add at top (after `'use client'`):
```ts
import { createClient } from '@/lib/supabase/client';
```

And inside `BillingPage()` body, replace the `const supabase = ...` line with:
```ts
const supabase = createClient();
```

**Step 2: Commit**
```bash
git add apps/web/app/\(app\)/billing/page.tsx
git commit -m "fix(web): billing page — use shared createClient() so dev mock works"
```

---

## Phase 2 — Infrastructure (manual steps — do once)

### Task 4: Apply Supabase Migrations

> Do this in the Supabase dashboard → SQL Editor, or via `supabase db push` if CLI is set up.

**Step 1: Run migration 001**

Copy-paste contents of `supabase/migrations/001_initial.sql` into SQL Editor → Run.

This creates: `profiles`, `videos`, `subscriptions`, `credit_ledger` tables, RLS policies, `use_credit` and `handle_new_user` functions, Realtime on `videos`.

**Step 2: Run migration 002**

Copy-paste contents of `supabase/migrations/002_stripe.sql` into SQL Editor → Run.

This creates the `add_credits` RPC and adds Stripe columns.

**Step 3: Create storage buckets**

In Supabase dashboard → Storage:

1. Create bucket `videos` — **Public** (so the generated MP4 URLs work without auth)
2. Create bucket `uploads` — **Private** (used by `/videos/new` for PDF/PPT uploads)

For the `videos` bucket, also add a public policy:
```sql
create policy "Public read videos"
  on storage.objects for select
  using (bucket_id = 'videos');

create policy "Service role upload videos"
  on storage.objects for insert
  using (bucket_id = 'videos');
```

**Step 4: Set Supabase env vars in Vercel**

In Vercel project settings → Environment Variables, ensure these are set:
- `NEXT_PUBLIC_SUPABASE_URL` — from Supabase project settings
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — from Supabase project settings
- `SUPABASE_SERVICE_ROLE_KEY` — from Supabase project settings (secret, server-only)

**Step 5: Set Stripe env vars in Vercel**

- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `NEXT_PUBLIC_STRIPE_STARTER_PRICE_ID`
- `NEXT_PUBLIC_STRIPE_PRO_PRICE_ID`
- `NEXT_PUBLIC_STRIPE_AGENCY_PRICE_ID`
- `NEXT_PUBLIC_STRIPE_CREDITS_PRICE_ID`
- `NEXT_PUBLIC_APP_URL` = `https://video-forge-sable.vercel.app`

---

### Task 5: Verify / Fill Worker `.env` on VPS

**Step 1: SSH to VPS**
```bash
ssh root@<vps-ip>
cd /opt/videoforge
cat apps/worker/.env
```

**Step 2: Confirm these are set (not placeholder values)**
```
SUPABASE_URL=https://<your-project>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...  (long JWT, NOT anon key)
ELEVENLABS_API_KEY=sk_...
GEMINI_API_KEY=AIza...
ANTHROPIC_API_KEY=sk-ant-...
REDIS_URL=redis://redis:6379       (uses Docker service name)
REDIS_PASSWORD=<the password in docker-compose.yml>
API_SECRET_KEY=<32-char random>
ALLOWED_ORIGIN=https://video-forge-sable.vercel.app
WORKER_CONCURRENCY=2
```

**Step 3: Rebuild and restart containers after filling .env**
```bash
cd /opt/videoforge
git pull origin main
docker compose down
docker compose up -d --build
docker compose logs -f worker-queue  # watch for "Worker started" message
```

---

## Phase 3 — First End-to-End Test

### Task 6: Run First Test

**Step 1: Submit a test video from Vercel**

1. Go to `https://video-forge-sable.vercel.app/login` and sign in
2. Navigate to **New Video**
3. Select **Text Prompt**, enter: `"AgentForge: AI automation platform for business teams. Eliminates manual email sorting, data entry, and report generation."`
4. Title: `"Test Video 1"`
5. Submit

**Step 2: Watch Supabase Realtime on `/videos/[id]`**

The progress bar should increment:
- 5% → Extracting content
- 15% → Writing script
- 25% → Recording voiceover
- 45% → Generating visuals
- 60% → Rendering video
- 85% → Uploading
- 100% → Done

**Step 3: Watch worker logs in real time**
```bash
ssh root@<vps-ip>
docker compose -f /opt/videoforge/docker-compose.yml logs -f worker-queue
```

**Expected happy path:** ~3–6 minutes, then video appears in `/videos/[id]` with a working player.

**Common failure modes:**

| Error | Cause | Fix |
|-------|-------|-----|
| `No composition with ID VideoForgeAd` | render.ts not updated | Apply Task 1 fix |
| `Insufficient credits` | `use_credit` RPC fails → migration not run | Apply Task 4 |
| `Upload failed` | `videos` bucket missing or not public | Apply Task 4 Step 3 |
| `Cannot find module 'elevenlabs'` | ELEVENLABS_API_KEY empty | Task 5 |
| `400 from Gemini` | GEMINI_API_KEY wrong | Task 5 |
| Worker never picks job | Redis URL wrong or password mismatch | Task 5 |

---

## Quick Fix Reference

If you want to apply just the critical code fix right now (composition name), it's a 1-line change:

```bash
# On VPS:
sed -i 's/npx remotion render VideoForgeAd/npx remotion render AgentForgeAd/' \
  /opt/videoforge/apps/worker/src/jobs/render.ts
# Then rebuild:
cd /opt/videoforge && docker compose up -d --build worker-queue worker-api
```
