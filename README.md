# mermaid-png

Zero-browser Mermaid → PNG rendering pipeline.

## Two renderers

| Renderer | File | Dependency | Best for |
|----------|------|-----------|----------|
| **beautiful-mermaid** | `render-beautiful.mjs` | zero-DOM, sync | Flowcharts, simple diagrams |
| **CDN mermaid** | `render.cjs` | Chromium (Playwright) | Complex diagrams with subgraphs |

## Usage

```bash
# beautiful-mermaid (fast, zero-DOM)
node render-beautiful.mjs

# CDN mermaid (full mermaid features)
node render.cjs input.mmd output.png [scale]
```

## Notes

- `beautiful-mermaid` does not support `subgraph` — use CDN mermaid for those
- Chromium binary expected at `~/.cache/ms-playwright/chromium-1228/chrome-linux64/chrome`
- WSL proxy: `export https_proxy=http://172.19.112.1:7897`
