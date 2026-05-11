# Deployment Guide

This document provides instructions for deploying the Tokens Extractor to various environments.

## Prerequisites

- Docker and Docker Compose (for containerized deployment)
- Node.js 20.x or later (Dockerfile uses 20.x; Node.js 18.x reached EOL in April 2025)
- fly CLI (for fly.io deployment)

## Local Deployment

### Option 1: Direct Node.js

1. Clone the repository:
```bash
git clone https://github.com/rkendel1/tokens.git
cd tokens
```

2. Install dependencies:
```bash
npm install
```

3. Install Playwright browsers:
```bash
npm run install-browser
```

4. Run the extractor:
```bash
node index.js example.com
```

### Option 2: Docker

1. Build the Docker image:
```bash
docker build -t tokens-extractor .
```

2. Run the container:
```bash
docker run --rm tokens-extractor example.com
```

For the MCP hosted server:
```bash
docker run -p 3001:3001 tokens-extractor node mcp-hosted.js
```

## Fly.io Deployment

### Initial Setup

1. Install the fly CLI:
```bash
curl -L https://fly.io/install.sh | sh
```

2. Authenticate with fly.io:
```bash
fly auth login
```

3. Create a new app (first time only):
```bash
fly apps create tokens-extractor
```

### Deploy

1. Deploy the application:
```bash
fly deploy
```

2. Check logs:
```bash
fly logs
```

3. Scale the application:
```bash
fly scale count 1
```

### Configuration

The `fly.toml` file contains the deployment configuration. Key settings:

- **Memory**: 1024 MB (adjust based on workload)
- **CPU**: 1 shared CPU
- **Auto-scaling**: Enabled (stops when idle, starts on demand)
- **Port**: 3001 (for MCP hosted server)

### Environment Variables

Set environment variables using fly secrets:

```bash
# Example: Set a custom browser CDP endpoint
fly secrets set BROWSER_CDP_ENDPOINT=ws://browser:3000

# Example: Set Node environment
fly secrets set NODE_ENV=production
```

### Troubleshooting

**Module not found errors:**
- Ensure the Dockerfile is building correctly
- Verify `npm ci` is running during build
- Check that node_modules is not excluded in .dockerignore

**Browser installation issues:**
- Increase memory if browser installation fails
- Ensure system dependencies are installed (see Dockerfile)
- Use --no-sandbox flag if needed: `node index.js example.com --no-sandbox`

**Out of memory errors:**
- Increase memory in fly.toml: `memory_mb = 2048`
- Use `--slow` flag for heavy sites
- Limit concurrent crawling with `--pages 5`

## Other Container Platforms

### Docker Compose

Create a `docker-compose.yml`:

```yaml
version: '3.8'

services:
  tokens-extractor:
    build: .
    image: tokens-extractor
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=production
    volumes:
      - ./output:/opt/tokens/output
    command: node mcp-hosted.js
```

Run with:
```bash
docker-compose up -d
```

### Kubernetes

Example deployment manifest:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: tokens-extractor
spec:
  replicas: 1
  selector:
    matchLabels:
      app: tokens-extractor
  template:
    metadata:
      labels:
        app: tokens-extractor
    spec:
      containers:
      - name: tokens-extractor
        image: tokens-extractor:latest
        ports:
        - containerPort: 3001
        env:
        - name: NODE_ENV
          value: "production"
        resources:
          requests:
            memory: "1Gi"
            cpu: "500m"
          limits:
            memory: "2Gi"
            cpu: "1000m"
```

## Production Best Practices

1. **Dependencies**: Always run `npm ci` instead of `npm install` in production
2. **Browsers**: Pre-install Playwright browsers in the Docker image
3. **Memory**: Allocate at least 1GB RAM for browser operations
4. **Timeouts**: Use `--slow` flag for heavy or slow-loading sites
5. **Security**: Use `--no-sandbox` only in trusted containerized environments
6. **Monitoring**: Monitor memory usage and adjust scaling policies
7. **Updates**: Regularly update dependencies for security patches

## Architecture Notes

The tokens extractor can be deployed in several modes:

1. **CLI Mode**: Direct command-line usage
2. **MCP Server Mode**: Stdio-based MCP server (mcp-server.js)
3. **MCP Hosted Mode**: HTTP/SSE-based MCP server (mcp-hosted.js)

Choose the appropriate mode based on your use case:
- CLI: One-off extractions, CI/CD pipelines
- MCP Server: Integration with Claude Code, Cursor, etc.
- MCP Hosted: Web-based access, API integration
