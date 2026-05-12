# Browser Installation Issue - Root Cause and Fix

## Problem Summary

When the tokens-extractor is deployed as a dependency in another Docker container (like bakeoff-1), the Playwright browser executable is not found, resulting in:

```
browserType.launch: Failed to launch: Error: spawn /root/.cache/ms-playwright/chromium_headless_shell-1217/chrome-headless-shell-linux64/chrome-headless-shell ENOENT
```

## Root Cause

The issue occurs when ALL of these conditions are present:

1. **Alpine-based base image**: The bakeoff Dockerfile used `node:20-alpine`
2. **Missing system dependencies**: Alpine doesn't include the shared libraries Chromium needs
3. **Old commit reference**: Pinned to commit `9fbcea4492af3624530005479e7dc48db0991195` which may predate browser installation fixes

## Why The Fix Works

### Change 1: Use Debian-based image

```dockerfile
# Before (doesn't work):
FROM node:20-alpine

# After (works):
FROM node:20-slim
```

**Reason**: Debian slim has compatible `glibc` and system architecture that Playwright browsers expect. Alpine uses `musl libc` which has compatibility issues.

### Change 2: Install system dependencies

```dockerfile
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

**Reason**: Chromium requires these shared libraries to run. Without them, the browser binary exists but cannot execute.

### Change 3: Use latest main branch

```dockerfile
# Before:
RUN git clone https://github.com/rkendel1/tokens.git /opt/tokens \
  && cd /opt/tokens \
  && git checkout 9fbcea4492af3624530005479e7dc48db0991195 \
  && npm ci --omit=dev

# After:
RUN git clone https://github.com/rkendel1/tokens.git /opt/tokens \
  && cd /opt/tokens \
  && git checkout main \
  && npm ci --omit=dev
```

**Reason**: The main branch includes:
- Updated `@playwright/browser-*` package versions
- Postinstall script that verifies browser installation
- Dockerfile verification step

## How Browser Installation Works

1. When `npm ci` runs in the tokens directory, it installs `@playwright/browser-chromium` and `@playwright/browser-firefox`
2. These packages have `install` scripts that download browsers to `/root/.cache/ms-playwright/`
3. The browsers need system dependencies to be present FIRST
4. Our Dockerfile now verifies the browser executable exists after installation

## Verification Steps

After applying the fix, verify browsers are installed:

```bash
# Build the image
docker build -t my-app .

# Check browser installation
docker run --rm my-app ls -la /root/.cache/ms-playwright/

# Test browser launch (requires Node.js ESM support)
docker run --rm my-app node --input-type=module -e "import('playwright-core').then(async ({ chromium }) => { const browser = await chromium.launch(); console.log('✓ Browser works!'); await browser.close(); });"
```

## Files Changed in This Fix

1. **package.json**: Added postinstall script to verify browser installation
2. **Dockerfile**: Added verification step that fails build if browsers are missing
3. **DEPLOYMENT.md**: Added section on using tokens as a dependency
4. **ALPINE-DOCKERFILE.md**: Complete guide for Alpine users (with caveats)
5. **examples/bakeoff-dockerfile-corrected**: Ready-to-use corrected Dockerfile
6. **README.md**: Added note about using as a dependency

## Why `npm ci --omit=dev` Still Works

The `@playwright/browser-*` packages are in `dependencies` (not `devDependencies`), so they install even with `--omit=dev`. Each package has an `install` script that downloads the browser binary during installation.

## Long-term Solution

For the bakeoff application, update the Dockerfile with these three changes:
1. Change base image from `node:20-alpine` to `node:20-slim`
2. Install system dependencies before cloning tokens
3. Use `main` branch instead of pinned commit

See [examples/bakeoff-dockerfile-corrected](examples/bakeoff-dockerfile-corrected) for the complete working example.
