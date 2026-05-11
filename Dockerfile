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
    # Clean up
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /opt/tokens

# Copy package files first for better layer caching
COPY package*.json ./

# Install production dependencies only
RUN npm ci --omit=dev

# Install Playwright browsers
RUN npx playwright install chromium firefox --with-deps

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
