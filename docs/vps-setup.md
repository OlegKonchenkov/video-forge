# VideoForge — VPS Setup Guide

Target: **Ubuntu 22.04 LTS** on a fresh VPS (minimum 2 vCPU, 4GB RAM, 40GB SSD).

---

## Step-by-step

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

## Secrets checklist (`apps/worker/.env`)

| Variable | Where to get it |
|---|---|
| `SUPABASE_URL` | Supabase project settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase project settings → API |
| `REDIS_URL` | `redis://:YOUR_REDIS_PASSWORD@127.0.0.1:6379` |
| `ANTHROPIC_API_KEY` | console.anthropic.com |
| `ELEVENLABS_API_KEY` | elevenlabs.io → Profile |
| `GEMINI_API_KEY` | aistudio.google.com |
| `API_SECRET_KEY` | Generate: `openssl rand -hex 32` |
| `WORKER_CONCURRENCY` | `2` (start low) |

---

## Deploying updates

```bash
cd /var/www/videoforge
git pull origin main
npm install
cd apps/worker && npm run build
pm2 reload all
```

---

## Monitoring

```bash
pm2 logs videoforge-api    # Express API logs
pm2 logs videoforge-worker # BullMQ worker logs
pm2 monit                  # CPU/RAM dashboard
redis-cli -a YOUR_REDIS_PASSWORD ping  # Redis check
```
