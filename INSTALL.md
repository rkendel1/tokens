# Installation Guide

This is a fork of dembrandt with additional features. Since we don't own the npm package name, you can install this version directly from GitHub.

## Installation Options

### Option 1: Install Globally from GitHub (Recommended)

```bash
npm install -g github:rkendel1/tokens
```

This installs the CLI globally. After installation, you can use:

```bash
dembrandt example.com
dembrandt example.com --contact-only
```

### Option 2: Install as Project Dependency

```bash
npm install github:rkendel1/tokens
```

Then use with npx:

```bash
npx dembrandt example.com
```

### Option 3: Install Specific Branch or Commit

```bash
# Install from specific branch
npm install -g github:rkendel1/tokens#copilot/fix-contact-info-command

# Install from specific commit
npm install -g github:rkendel1/tokens#455fbdb
```

### Option 4: Local Development with npm link

If you're developing locally:

```bash
# In this repository directory
npm install
npm link

# Now 'dembrandt' command is available globally
dembrandt example.com
```

To unlink:

```bash
npm unlink -g dembrandt
```

### Option 5: Clone and Run Directly

```bash
git clone https://github.com/rkendel1/tokens.git
cd tokens
npm install
node index.js example.com
```

## Verifying Installation

Check the installed version:

```bash
dembrandt --version
```

Should show: `0.11.1`

## Using in Other Projects

Add to your `package.json`:

```json
{
  "dependencies": {
    "dembrandt": "github:rkendel1/tokens#main"
  }
}
```

Or specify the exact commit:

```json
{
  "dependencies": {
    "dembrandt": "github:rkendel1/tokens#455fbdb"
  }
}
```

## Features Available

All features work the same as the original package:

- ✅ `--contact-only` flag for contact extraction
- ✅ Local UI with contact information display
- ✅ All design token extraction features
- ✅ Multi-page crawling
- ✅ Dark mode extraction
- ✅ PDF brand guides
- ✅ MCP server integration

## Updating

To update to the latest version:

```bash
npm install -g github:rkendel1/tokens
```

## Troubleshooting

### Browser Installation

If Playwright browsers aren't installed automatically:

```bash
npm run install-browser
# or
npx playwright install chromium firefox
```

### Permission Issues

On Linux/Mac, you may need sudo for global installation:

```bash
sudo npm install -g github:rkendel1/tokens
```

### SSH vs HTTPS

If you have SSH keys configured with GitHub:

```bash
npm install -g git+ssh://git@github.com:rkendel1/tokens.git
```

## Local UI

To run the local web interface:

```bash
cd local-ui
npm install
npm start
```

Then visit: http://localhost:5173
