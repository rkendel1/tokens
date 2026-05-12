# Quick Fix Guide for Bakeoff Deployment

## The Problem
Your bakeoff-1 deployment is getting this error:
```
Error: spawn /root/.cache/ms-playwright/chromium_headless_shell-1217/chrome-headless-shell-linux64/chrome-headless-shell ENOENT
```

This means the Chromium browser binary is missing.

## The Solution (3 Steps)

### Step 1: Change Your Bakeoff Dockerfile Base Image

**Change this:**
```dockerfile
FROM node:20-alpine
```

**To this:**
```dockerfile
FROM node:20-slim
```

### Step 2: Install System Dependencies

**Add this BEFORE your other RUN commands:**
```dockerfile
# Install Playwright system dependencies
RUN apt-get update && apt-get install -y \
    git \
    libnss3 libnspr4 libatk1.0-0 libatk-bridge2.0-0 \
    libcups2 libdrm2 libdbus-1-3 libxkbcommon0 \
    libxcomposite1 libxdamage1 libxfixes3 libxrandr2 \
    libgbm1 libpango-1.0-0 libcairo2 libasound2 \
    libatspi2.0-0 libx11-xcb1 libxcursor1 libgtk-3-0 \
    libpangocairo-1.0-0 libcairo-gobject2 libgdk-pixbuf-2.0-0 \
    fonts-liberation xdg-utils \
    && rm -rf /var/lib/apt/lists/*
```

### Step 3: Update to Latest Tokens Repo

**Change this:**
```dockerfile
RUN git clone https://github.com/rkendel1/tokens.git /opt/tokens \
  && cd /opt/tokens \
  && git checkout 9fbcea4492af3624530005479e7dc48db0991195 \
  && npm ci --omit=dev
```

**To this:**
```dockerfile
RUN git clone https://github.com/rkendel1/tokens.git /opt/tokens \
  && cd /opt/tokens \
  && git checkout main \
  && npm ci --omit=dev
```

## Complete Working Dockerfile

See the complete working example in:
**[examples/bakeoff-dockerfile-corrected](examples/bakeoff-dockerfile-corrected)**

Copy that file and use it as your bakeoff Dockerfile.

## Deploy the Fix

1. Update your bakeoff Dockerfile with the changes above
2. Rebuild your Docker image:
   ```bash
   docker build -t bakeoff-1 .
   ```
3. Deploy to Fly.io:
   ```bash
   fly deploy
   ```
4. Test the endpoint:
   ```bash
   curl -X POST https://bakeoff-1.fly.dev/site-requests \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer secret" \
     -d '{
       "url": "https://prosperitynorthadvisors.com/",
       "callbackUrl": "https://requestor.example.com/webhooks/site-processing"
     }'
   ```

## Verify It Works

After deploying, the logs should show:
```
[site-worker] Processing job {...}
✓ Successfully extracted tokens from site
```

Instead of:
```
tokens extractor unavailable, falling back to basic fetch
Error: spawn ... ENOENT
```

## Why This Works

1. **Debian base image**: Has the right system libraries for Chromium
2. **System dependencies**: Provides the shared libraries Chromium needs
3. **Latest main branch**: Includes browser installation fixes and verification

## Need Help?

See these detailed guides:
- [BROWSER-FIX-SUMMARY.md](BROWSER-FIX-SUMMARY.md) - Full technical explanation
- [DEPLOYMENT.md](DEPLOYMENT.md) - Complete deployment guide
- [ALPINE-DOCKERFILE.md](ALPINE-DOCKERFILE.md) - If you must use Alpine
