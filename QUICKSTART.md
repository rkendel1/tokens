# Quick Reference

## Setup (one-time)
```bash
git clone https://github.com/rkendel1/tokens.git
cd tokens
npm install
npm run install-browser
```

Or use the setup script:
```bash
./setup.sh
```

## Basic Usage

```bash
# Extract design tokens
node index.js example.com

# Extract contact info only
node index.js example.com --contact-only

# Save output files
node index.js example.com --save-output

# Generate PDF brand guide
node index.js example.com --brand-guide

# JSON output
node index.js example.com --json-only
```

## Common Options

| Option | Description |
|--------|-------------|
| `--contact-only` | Extract only contact information |
| `--json-only` | Output as JSON |
| `--save-output` | Save JSON to output/ folder |
| `--brand-guide` | Generate PDF brand guide |
| `--design-md` | Generate DESIGN.md file |
| `--dark-mode` | Extract dark mode colors |
| `--mobile` | Use mobile viewport |
| `--pages <n>` | Crawl multiple pages (default: 5) |
| `--sitemap` | Use sitemap.xml for page discovery |
| `--no-sandbox` | Disable browser sandbox (for Docker/CI) |

## Create a Shell Alias

Add to `~/.bashrc` or `~/.zshrc`:

```bash
alias extract='node /full/path/to/tokens/index.js'
```

Then use:
```bash
extract example.com --contact-only
```

## Local Web UI

```bash
npm run local-ui
```

Then open http://localhost:5173

## Examples

```bash
# Extract contact info from business website
node index.js billswelding.com/contact --contact-only

# Full design system with PDF
node index.js stripe.com --save-output --brand-guide --design-md

# Multi-page crawl
node index.js example.com --pages 20 --sitemap

# Dark mode palette
node index.js github.com --dark-mode --save-output

# Just get JSON data
node index.js example.com --json-only > tokens.json
```

## Output Location

Files are saved to: `output/<domain>/`
- JSON files: `<timestamp>.json`
- Brand guides: `<domain>-brand-guide-<date>-<time>.pdf`
- Design docs: `DESIGN.md`

## Troubleshooting

### Browser not found
```bash
npm run install-browser
```

### Linux missing dependencies
```bash
npx playwright install-deps
```

### Permission errors
```bash
node index.js example.com --no-sandbox
```

### Out of memory
```bash
node --max-old-space-size=4096 index.js example.com
```
