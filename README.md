# diagram-pipelines

Three pipelines for generating PNG images — zero heavy dependencies.

## Pipelines

| Pipeline | Input | Engine | Browser |
|----------|-------|--------|:-------:|
| **mermaid** | Mermaid text | beautiful-mermaid + CDN mermaid | ❌ SVG / ✅ PNG |
| **markdown-card** | Markdown | marknative + skia-canvas | ❌ |
| **drawio-bridge** | draw.io SVG | Playwright Chromium | ✅ (SVG→PNG) |

## Structure

```
├── mermaid/              # Mermaid → PNG (+ MCP server)
│   ├── src/
│   │   ├── mcp-server.mjs       # MCP: render_mermaid tool
│   │   ├── render-beautiful.mjs # zero-DOM renderer
│   │   └── render-cdn.cjs       # CDN mermaid (subgraphs OK)
│   └── examples/
│       ├── flowchart.mmd
│       └── complex.mmd
├── markdown-card/        # Markdown → PNG (zero browser)
│   └── src/render.js
├── drawio-bridge/        # draw.io SVG → PNG
│   └── src/svg2png.js
└── README.md
```

## Usage

### Mermaid

```bash
# CLI
node mermaid/src/render-beautiful.mjs input.mmd output.png
node mermaid/src/render-cdn.cjs input.mmd output.png [scale]

# MCP (register in Hermes config.yaml)
# Tool: render_mermaid(source, output?, scale?, mode?)
```

### Markdown Card

```bash
cd diagram-pipelines/markdown-card
npm install marknative
node src/render.js input.md output.png
```

### draw.io Bridge

```bash
cd diagram-pipelines/drawio-bridge
npm install playwright
node src/svg2png.js input.svg output.png [scale]
```

## Hermes MCP Config

```yaml
mermaid-png:
  args:
  - -c
  - cd /path/to/diagram-pipelines && exec node mermaid/src/mcp-server.mjs
  command: bash
  connect_timeout: 60
  enabled: true
  timeout: 120
```
