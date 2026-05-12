# Dembrandt.

[![npm version](https://img.shields.io/npm/v/dembrandt.svg)](https://www.npmjs.com/package/dembrandt)
[![npm downloads](https://img.shields.io/npm/dm/dembrandt.svg)](https://www.npmjs.com/package/dembrandt)
[![license](https://img.shields.io/npm/l/dembrandt.svg)](https://github.com/dembrandt/dembrandt/blob/main/LICENSE)

Extract a website's design system into design tokens in a few seconds: logo, colors, typography, borders, and more. One command.

![Dembrandt — Any website to design tokens](https://raw.githubusercontent.com/dembrandt/dembrandt/main/docs/images/banner.png)

# Design Token & Contact Extractor

Extract design tokens and contact information from any website.

## Setup

### Local Installation

1. Clone the repository:
```bash
git clone https://github.com/rkendel1/tokens.git
cd tokens
```

2. Install dependencies:
```bash
npm install
```

3. Install browsers (required for Playwright):
```bash
npm run install-browser
```

### Docker Installation

Alternatively, use Docker for a containerized environment with all dependencies pre-installed:

```bash
# Build the image
docker build -t tokens-extractor .

# Run the extractor
docker run --rm tokens-extractor example.com
```

See [DEPLOYMENT.md](DEPLOYMENT.md) for production deployment options including fly.io, Kubernetes, and more.

### Using as a Dependency

If you're integrating tokens-extractor into another application, see the [Using Tokens Extractor as a Dependency](DEPLOYMENT.md#using-tokens-extractor-as-a-dependency) section in DEPLOYMENT.md. Key requirements:
- Use Debian-based Docker images (`node:20-slim`, not Alpine)
- Install Playwright system dependencies before cloning/installing tokens
- Use `main` branch for latest browser installation fixes
- Example: [examples/bakeoff-dockerfile-corrected](examples/bakeoff-dockerfile-corrected)

## Usage

Run the extractor directly with Node:

```bash
# Basic extraction
node index.js example.com

# Extract only contact information
node index.js example.com --contact-only

# Save output to file
node index.js example.com --save-output

# Extract with dark mode
node index.js example.com --dark-mode

# Multiple pages
node index.js example.com --pages 10

# JSON output
node index.js example.com --json-only

# All options
node index.js example.com --contact-only --json-only --save-output
```

### Using npm scripts

```bash
# Run with npm start (you'll need to edit package.json to add URL)
npm start example.com

# Or use the extract alias
npm run extract example.com
```

### Create a shell alias (optional)

Add to your `~/.bashrc` or `~/.zshrc`:

```bash
alias extract-tokens='node /path/to/tokens/index.js'
```

Then use:
```bash
extract-tokens example.com --contact-only
```

## Local Web UI

Launch the web interface:

```bash
npm run local-ui
```

Then open http://localhost:5173 in your browser.

## Available Options

```
Options:
  --browser <type>     Browser to use (chromium|firefox) (default: "chromium")
  --json-only          Output raw JSON
  --save-output        Save JSON file to output folder
  --dtcg               Export in W3C Design Tokens (DTCG) format
  --dark-mode          Extract colors from dark mode
  --mobile             Extract from mobile viewport
  --slow               3x longer timeouts for slow-loading sites
  --brand-guide        Export a brand guide PDF
  --design-md          Export a DESIGN.md file
  --no-sandbox         Disable browser sandbox (needed for Docker/CI)
  --raw-colors         Include pre-filter raw colors in JSON output
  --screenshot <path>  Save a screenshot of the page
  --pages <n>          Analyze up to N total pages (default: 5)
  --sitemap            Discover pages from sitemap.xml
  --contact-only       Extract only contact information
```

## What Gets Extracted

### Design Tokens
- **Colors**: Semantic colors, palette, CSS variables
- **Typography**: Fonts, sizes, weights, sources (Google Fonts, Adobe Fonts)
- **Spacing**: Margin/padding scales
- **Shadows**: Box shadows
- **Borders**: Border radius, widths, styles, colors
- **Components**: Buttons, links, inputs (with hover/focus states)
- **Breakpoints**: Responsive breakpoints
- **Logo & Favicons**: Brand assets
- **Frameworks**: Detected CSS frameworks
- **Icon Systems**: Icon libraries in use

### Contact Information
- **Emails**: Found in mailto: links and text
- **Phone Numbers**: From tel: links and various formats
- **Addresses**: Physical addresses with street, city, state, ZIP
- **Business Hours**: Operating hours
- **Business Names**: From meta tags and structured data

## Output

Results are saved to `output/<domain>/` directory:
- JSON files with timestamps
- Optional PDF brand guides
- Optional DESIGN.md files

## Examples

```bash
# Quick contact extraction
node index.js https://www.billswelding.com/contact_us --contact-only

# Full design system + save files
node index.js stripe.com --save-output --brand-guide

# JSON only (no terminal output)
node index.js example.com --json-only > design-tokens.json

# Multi-page crawl
node index.js example.com --pages 20 --sitemap
```

## Requirements

- Node.js 18+
- ~1GB disk space for Playwright browsers

## Troubleshooting

### Browser Installation Issues

If browsers don't install automatically:
```bash
npx playwright install chromium firefox
```

### Linux Dependencies

On Linux, you may need system dependencies:
```bash
npx playwright install-deps
```

### Permission Errors

If you get permission errors, try:
```bash
node index.js example.com --no-sandbox
```

## Project Structure

```
tokens/
├── index.js           # Main CLI entry point
├── lib/
│   ├── extractors.js  # Extraction logic
│   ├── display.js     # Terminal output formatting
│   ├── merger.js      # Multi-page result merging
│   ├── pdf.js         # PDF generation
│   └── ...
├── local-ui/          # Web interface
└── output/            # Generated files
```

## AI Agent Integration (MCP)

Use Dembrandt as a tool in Claude Code, Cursor, Windsurf, or any MCP-compatible client. Ask your agent to "extract the color palette from example.com" and it calls Dembrandt automatically.

```bash
claude mcp add --transport stdio dembrandt -- npx -y dembrandt-mcp
```

Or add to your project's `.mcp.json`:

```json
{
  "mcpServers": {
    "dembrandt": {
      "command": "npx",
      "args": ["-y", "dembrandt-mcp"]
    }
  }
}
```

7 tools available: `get_design_tokens`, `get_color_palette`, `get_typography`, `get_component_styles`, `get_surfaces`, `get_spacing`, `get_brand_identity`.

## What to expect from extraction?

- Colors (semantic, palette, CSS variables)
- Typography (fonts, sizes, weights, sources)
- Spacing (margin/padding scales)
- Borders (radius, widths, styles, colors)
- Shadows
- Components (buttons, badges, inputs, links)
- Breakpoints
- Icons & frameworks

## Usage

```bash
dembrandt <url>                        # Basic extraction (terminal display only)
dembrandt example.com --json-only      # Output raw JSON to terminal (no formatted display, no file save)
dembrandt example.com --save-output    # Save JSON to output/example.com/YYYY-MM-DDTHH-MM-SS.json
dembrandt example.com --dtcg           # Export in W3C Design Tokens (DTCG) format (auto-saves as .tokens.json)
dembrandt example.com --dark-mode      # Extract colors from dark mode variant
dembrandt example.com --mobile         # Use mobile viewport (390x844) for responsive analysis
dembrandt example.com --slow           # 3x longer timeouts (24s hydration) for JavaScript-heavy sites
dembrandt example.com --brand-guide    # Generate a brand guide PDF
dembrandt example.com --design-md      # Generate a DESIGN.md file for AI agents
dembrandt example.com --pages 5        # Analyze 5 pages (homepage + 4 discovered pages), merges results
dembrandt example.com --sitemap        # Discover pages from sitemap.xml instead of DOM links
dembrandt example.com --pages 10 --sitemap # Combine: up to 10 pages discovered via sitemap
dembrandt example.com --contact-only   # Extract only contact information (emails, phones, addresses, hours)
dembrandt example.com --no-sandbox     # Disable Chromium sandbox (required for Docker/CI)
dembrandt example.com --browser=firefox # Use Firefox instead of Chromium (better for Cloudflare bypass)
```

Default: formatted terminal display only. Use `--save-output` to persist results as JSON files. Browser automatically retries in visible mode if headless extraction fails.

### Multi-Page Extraction

Analyze multiple pages to get a more complete picture of a site's design system. Results are merged into a single unified output with cross-page confidence boosting — tokens appearing on multiple pages get higher confidence scores.

```bash
# Analyze homepage + 4 auto-discovered pages (default: 5 total)
dembrandt example.com --pages 5

# Use sitemap.xml for page discovery instead of DOM link scraping
dembrandt example.com --sitemap

# Combine both: up to 10 pages from sitemap
dembrandt example.com --pages 10 --sitemap
```

**Page discovery** works two ways:
- **DOM links** (default): Reads navigation, header, and footer links from the homepage, prioritizing key pages like /pricing, /about, /features
- **Sitemap** (`--sitemap`): Parses sitemap.xml (checks robots.txt first), follows sitemapindex references, and scores URLs by importance

Pages are fetched sequentially with polite delays. Failed pages are skipped without aborting the run.

### Browser Selection

By default, dembrandt uses Chromium. If you encounter bot detection or timeouts (especially on sites behind Cloudflare), try Firefox which is often more successful at bypassing these protections:

```bash
# Use Firefox instead of Chromium
dembrandt example.com --browser=firefox

# Combine with other flags
dembrandt example.com --browser=firefox --save-output --dtcg
```

**When to use Firefox:**
- Sites behind Cloudflare or other bot detection systems
- Timeout issues on heavily protected sites
- WSL environments where headless Chromium may struggle

**Installation:**
Firefox browser is installed automatically with `npm install`. If you need to install manually:

```bash
npx playwright install firefox
```

### W3C Design Tokens (DTCG) Format

Use `--dtcg` to export in the standardized [W3C Design Tokens Community Group](https://www.designtokens.org/) format:

```bash
dembrandt example.com --dtcg
# Saves to: output/example.com/TIMESTAMP.tokens.json
```

The DTCG format is an industry-standard JSON schema that can be consumed by design tools and token transformation libraries like [Style Dictionary](https://styledictionary.com).

### DESIGN.md

Use `--design-md` to generate a [DESIGN.md](https://stitch.withgoogle.com/docs/design-md) file — a plain-text design system document readable by AI agents.

```bash
dembrandt example.com --design-md
# Saves to: output/example.com/DESIGN.md
```

### Brand Guide PDF

Use `--brand-guide` to generate a printable PDF summarizing the extracted design system — colors, typography, components, and logo on a single document.

```bash
dembrandt example.com --brand-guide
# Saves to: output/example.com/TIMESTAMP.brand-guide.pdf
```

### Contact Information Extraction

Extract contact information (emails, phone numbers, addresses, business hours, and names) from any website. Dembrandt automatically extracts contact information alongside design tokens, or you can use `--contact-only` for focused extraction.

```bash
# Extract only contact information (faster, focused output)
dembrandt example.com/contact --contact-only

# Extract contact info as JSON
dembrandt example.com/contact --contact-only --json-only

# Full extraction includes contact info automatically
dembrandt example.com
```

**What's extracted:**
- **Emails**: From mailto: links and text patterns
- **Phone numbers**: From tel: links and text patterns (various formats)
- **Addresses**: Physical addresses with street, city, state, ZIP
- **Business hours**: Operating hours in various formats
- **Business names**: From meta tags and structured data

**Contact extraction features:**
- Searches footer, contact sections, and page-wide content
- Handles multiple formats (US/international phones, various address formats)
- Confidence scoring (high/medium based on source)
- Multi-page support (use `--pages` to extract from multiple pages)

## Local UI

Browse your extractions in a visual interface.

### Setup

```bash
cd local-ui
npm install
```

### Running

```bash
npm start
```

Opens http://localhost:5173 with API on port 3002.

### Features

- Visual grid of all extractions
- Color palettes with click-to-copy
- Typography specimens
- Spacing, shadows, border radius visualization
- Button and link component previews
- Dark/light theme toggle
- Section nav links on extraction pages — jump directly to Colors, Typography, Shadows, etc. via a sticky sidebar

Extractions are performed via CLI (`dembrandt <url> --save-output`) and automatically appear in the UI.

## Use Cases

- Design system documentation
- Multi-site design consolidation
- Internal design audits on your own properties
- Learning how design tokens map to real CSS

## How It Works

Uses Playwright to render the page, reads computed styles from the DOM, analyzes color usage and confidence, groups similar typography, detects spacing patterns, and returns design tokens.

### Extraction Process

1. Browser Launch - Launches browser (Chromium by default, Firefox optional) with stealth configuration
2. Anti-Detection - Injects scripts to bypass bot detection
3. Navigation - Navigates to target URL with retry logic
4. Hydration - Waits for SPAs to fully load (8s initial + 4s stabilization)
5. Content Validation - Verifies page content is substantial (>500 chars)
6. Parallel Extraction - Runs all extractors concurrently for speed
7. Analysis - Analyzes computed styles, DOM structure, and CSS variables
8. Scoring - Assigns confidence scores based on context and usage

### Color Confidence

- High — Logo, primary interactive elements
- Medium — Secondary interactive elements, icons, navigation
- Low — Generic UI components (filtered from display)
- Only shows high and medium confidence colors in terminal. Full palette in JSON.

## Limitations

- Dark mode requires `--dark-mode` flag (not automatically detected)
- Hover/focus states extracted from CSS (not fully interactive)
- Canvas/WebGL-rendered sites cannot be analyzed (no DOM to read)
- JavaScript-heavy sites require hydration time (8s initial + 4s stabilization)
- Some dynamically-loaded content may be missed
- Default viewport is 1920x1080 (use `--mobile` for 390x844 mobile viewport)

## Intended Use

Dembrandt reads publicly available CSS and computed styles from website DOMs for documentation, learning, and analysis of design systems you own or have permission to analyze.

Only run Dembrandt against sites whose Terms of Service permit automated access, or against your own properties. Do not use extracted material to reproduce third-party brand identities, logos, or trademarks. Respect robots.txt, rate limits, and copyright.

Dembrandt does not host, redistribute, or claim rights to any third-party brand assets.

## Contributing

Bugs, weird sites, pull requests — all welcome.

Open an [Issue](https://github.com/dembrandt/dembrandt/issues) or PR.

@thevangelist

---

MIT — do whatever you want with it.
