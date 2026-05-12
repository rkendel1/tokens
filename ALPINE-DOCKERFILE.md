# Alpine-based Dockerfile for Applications Using Tokens Extractor

If you're using the tokens extractor as a dependency in an Alpine-based Docker container (like the bakeoff application), you need to install additional system dependencies for Playwright browsers.

## Updated Bakeoff Dockerfile

```dockerfile
# syntax=docker/dockerfile:1

FROM node:20-alpine

WORKDIR /app

# Install system dependencies required by Playwright on Alpine
# These are needed for Chromium/Firefox to run
RUN apk add --no-cache \
    git \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    nodejs \
    yarn

# Tell Playwright to use the system-installed Chromium
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
ENV PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium-browser

# Install dependencies
COPY package.json package-lock.json ./
RUN npm ci

# Copy source
COPY . .

# Clone tokens extractor runtime dependency used by /site-requests endpoint
# Update to latest commit with browser installation fixes
RUN git clone https://github.com/rkendel1/tokens.git /opt/tokens \
  && cd /opt/tokens \
  && git checkout main \
  && npm ci --omit=dev

ENV TOKENS_CLI_PATH=/opt/tokens/index.js
# tokens uses Playwright; sandbox can be disabled in containerized environments when needed.
ENV TOKENS_NO_SANDBOX=true

# Build (optional but safe if TS compiles)
RUN npm run build

# Expose runtime port
EXPOSE 8080

# Start runtime-core HTTP server
CMD ["npm", "run", "start:prod"]
```

## Alternative: Use Debian-based Image (Recommended)

For better Playwright compatibility, consider switching to a Debian-based image:

```dockerfile
# syntax=docker/dockerfile:1

FROM node:20-slim

WORKDIR /app

# Install system dependencies required by Playwright
RUN apt-get update && apt-get install -y \
    git \
    # Chromium dependencies
    libnss3 \
    libnspr4 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libdbus-1-3 \
    libxkbcommon0 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxrandr2 \
    libgbm1 \
    libpango-1.0-0 \
    libcairo2 \
    libasound2 \
    libatspi2.0-0 \
    libx11-xcb1 \
    libxcursor1 \
    libgtk-3-0 \
    libpangocairo-1.0-0 \
    libcairo-gobject2 \
    libgdk-pixbuf-2.0-0 \
    fonts-liberation \
    xdg-utils \
    && rm -rf /var/lib/apt/lists/*

# Install dependencies
COPY package.json package-lock.json ./
RUN npm ci

# Copy source
COPY . .

# Clone tokens extractor runtime dependency used by /site-requests endpoint
# Update to latest commit with browser installation fixes
RUN git clone https://github.com/rkendel1/tokens.git /opt/tokens \
  && cd /opt/tokens \
  && git checkout main \
  && npm ci --omit=dev

ENV TOKENS_CLI_PATH=/opt/tokens/index.js
# tokens uses Playwright; sandbox can be disabled in containerized environments when needed.
ENV TOKENS_NO_SANDBOX=true

# Build (optional but safe if TS compiles)
RUN npm run build

# Expose runtime port
EXPOSE 8080

# Start runtime-core HTTP server
CMD ["npm", "run", "start:prod"]
```

## Key Changes Required

1. **Use Debian-based image (`node:20-slim`)** instead of Alpine - This matches the dependencies in the tokens extractor Dockerfile
2. **Install system dependencies** before cloning tokens repo
3. **Update to `main` branch** instead of pinning to old commit - The main branch now includes browser installation fixes
4. **Keep `npm ci --omit=dev`** - This still works with the updated package.json postinstall script

## Why These Changes Are Needed

- The pinned commit `9fbcea4492af3624530005479e7dc48db0991195` was before the browser installation fixes were merged
- Alpine requires different system libraries than Debian for Playwright
- The `@playwright/browser-*` packages automatically install browsers during `npm ci`, but need system dependencies to be present first

## Verification

After building the updated Dockerfile, verify browsers are installed:

```bash
docker run --rm <image-name> ls -la /root/.cache/ms-playwright/
```

You should see directories like:
- `chromium_headless_shell-1217/`
- `firefox-1511/`
