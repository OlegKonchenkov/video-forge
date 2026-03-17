# VPS Deploy Prompt — Post-Pull Setup

> Copy-paste this to the VPS agent after `git pull origin main`.

---

## What Changed

Last 2 commits (`581f03c`, `ae40a6e`) bring:

1. **7 new Remotion scene types** (26 total): `pricing_table`, `case_study`, `faq`, `feature_spotlight`, `guarantee`, `closing_recap`, `animated_chart`
2. **Remotion best practices audit fixes**: CSS `backgroundImage` → `<Img>` component across 25 scenes, `fitText` upgraded to `@remotion/layout-utils`, `@remotion/light-leaks` global overlay, `@remotion/paths` for SVG draw-in, `DISPLAY_FONT` removed
3. **New shared components**: `SceneBackground.tsx`, `VariantBackground.tsx`, `useVisualVariant.ts`, `colorUtils.ts`, `SvgDecorations.tsx`, `emojiMap.ts`, `fitText.ts`, `variantAnimations.ts`
4. **CODEX generation mode** (AI-generated scenes): new `apps/worker/src/jobs/codexgen.ts`, updated `pipeline.ts`, `render.ts`, `scriptgen.ts`
5. **New Remotion dependencies**: `@remotion/layout-utils`, `@remotion/light-leaks`
6. **New worker dependency**: `openai` (v6.25+) for GPT-5 Responses API in codex mode
7. **Web UI update**: generation mode toggle in `apps/web/app/(app)/videos/new/page.tsx`

## Setup Steps

```bash
# 1. Pull latest
cd /path/to/resend-web-adv
git pull origin main

# 2. Install Remotion deps (new: @remotion/layout-utils, @remotion/light-leaks)
cd agentforge-video
npm install

# 3. Install worker deps (new: openai)
cd ../apps/worker
npm install

# 4. Install web deps (no new deps, but rebuild needed)
cd ../web
npm install

# 5. TypeScript check — both must pass with zero errors
cd ../../agentforge-video
npx tsc --noEmit

cd ../apps/worker
npx tsc --noEmit

# 6. Rebuild worker
cd ../apps/worker
npm run build

# 7. Rebuild web
cd ../web
npm run build
```

## Environment Variables

Check `apps/worker/.env` has these (new vars marked with ⭐):

```env
# Existing (must already be set)
PORT=3001
REDIS_URL=redis://127.0.0.1:6379
REDIS_PASSWORD=...
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
ELEVENLABS_API_KEY=sk_...
GEMINI_API_KEY=AIza...
API_SECRET_KEY=...
ALLOWED_ORIGIN=https://yourdomain.vercel.app

# Script generation (existing)
OPENAI_API_KEY=sk-proj-...
OPENAI_MODEL=gpt-4.1-mini

# ⭐ CODEX mode (new — optional, only needed for AI-generated scenes)
# Uses the same OPENAI_API_KEY above, but these control codex behavior:
CODEX_MODEL=gpt-5                    # default: gpt-5
CODEX_REASONING_EFFORT=medium        # low | medium | high
CODEX_SCENE_TIMEOUT_MS=120000        # per-scene generation timeout

# ⭐ Remotion skill directory (new — usually NOT needed)
# Skill rules are now bundled in the repo at agentforge-video/skill-rules/
# The worker auto-detects them. Only set this to override:
# REMOTION_SKILL_DIR=/custom/path/to/rules
```

## Remotion Skill for Codex Mode

The 14 Remotion skill rule files + the project-specific codex reference doc (`docs/remotion-codex-skill.md`) are now **bundled in the repo**:

- `agentforge-video/skill-rules/` — 14 `.md` rule files (animations, timing, fonts, etc.)
- `docs/remotion-codex-skill.md` — project-specific scene generation reference (17 sections)

The worker auto-detects `agentforge-video/skill-rules/` first, then falls back to `~/.agents/skills/...`, then to an embedded summary. **No manual setup needed after `git pull`.**

## Restart Services

```bash
# Restart worker (PM2, systemd, or however it runs)
pm2 restart worker
# or
systemctl restart videoforge-worker

# Restart/rebuild web (if self-hosted, not Vercel)
pm2 restart web
# or
systemctl restart videoforge-web
```

## Verify

```bash
# 1. Worker health check
curl http://localhost:3001/health

# 2. Test a prefab render (quick smoke test)
# Trigger a video generation from the web UI or via API
# Check worker logs for clean scene rendering with all 26 types available

# 3. Check Remotion can render
cd /path/to/resend-web-adv/agentforge-video
npx remotion render AgentForgeAd out/test.mp4 --codec h264 --frames=0-30
# Should render first 30 frames without errors
```

## Rollback

If anything breaks:
```bash
git log --oneline -5    # find the commit before these changes
git checkout <commit>   # likely a20660e (the one before the big batch)
cd agentforge-video && npm install
cd ../apps/worker && npm install && npm run build
```
