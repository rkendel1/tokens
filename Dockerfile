# Dockerfile for Tokens Extractor
# Ensures all dependencies are properly installed for deployment

FROM node:20-slim

# Install system dependencies required by Playwright
RUN apt-get update && apt-get install -y \
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
    # Missing dependencies identified by Playwright
    libx11-xcb1 \
    libxcursor1 \
    libgtk-3-0 \
    libpangocairo-1.0-0 \
    libcairo-gobject2 \
    libgdk-pixbuf-2.0-0 \
    # Additional useful dependencies
    fonts-liberation \
    xdg-utils \
    # Clean up
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /opt/tokens

# Copy package files first for better layer caching
COPY package*.json ./

# Install production dependencies only
# The @playwright/browser-chromium and @playwright/browser-firefox packages
# will automatically download and install the browsers during npm install
RUN npm ci --omit=dev

# Verify that Playwright browsers were installed correctly
# This ensures the build fails early if browsers are missing
# Uses wildcard to be version-agnostic
RUN test -n "$(find /root/.cache/ms-playwright -name 'chrome-headless-shell' -o -name 'chromium' 2>/dev/null | head -1)" || \
    (echo "ERROR: Chromium browser not found after npm install!" && \
     echo "Browser packages installed:" && \
     ls -la /root/.cache/ms-playwright/ 2>/dev/null || echo "No browsers found" && \
     exit 1)

# Copy application code
COPY . .

# Make index.js executable
RUN chmod +x index.js

# Set NODE_ENV to production
ENV NODE_ENV=production

# Expose port if needed for MCP hosted server
EXPOSE 3001

# Default command (can be overridden)
CMD ["node", "index.js", "--help"]
