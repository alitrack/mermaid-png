#!/usr/bin/env node
/**
 * MCP Server: mermaid-png
 * Tool: render_mermaid(source, output?, scale?, mode?)
 *   mode: "beautiful" (zero-DOM, fast) | "cdn" (full mermaid, subgraphs)
 */
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { renderMermaidSVG } from 'beautiful-mermaid';
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CHROMIUM_PATH = process.env.CHROMIUM_PATH || 
  path.join(process.env.HOME, '.cache/ms-playwright/chromium-1228/chrome-linux64/chrome');
const DEFAULT_OUTPUT = '/tmp/mermaid-output.png';

// ── beautiful-mermaid renderer ──────────────────────
async function renderBeautiful(source, outputPath) {
  const svg = renderMermaidSVG(source, {
    bg: '#ffffff',
    fg: '#2c3e50',
    accent: '#3498db',
    line: '#95a5a6'
  });
  
  const browser = await chromium.launch({
    executablePath: CHROMIUM_PATH,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 12000, height: 8000 });
  await page.setContent(`<!DOCTYPE html>
<html><body style="margin:0;background:white;">
<div id="wrapper" style="display:inline-block;">${svg}</div>
</body></html>`);
  
  await page.waitForTimeout(500);
  const wrapper = await page.$('#wrapper');
  const box = await wrapper.boundingBox();
  await page.screenshot({ path: outputPath, clip: box });
  await browser.close();
  
  return { width: Math.round(box.width), height: Math.round(box.height) };
}

// ── CDN mermaid renderer (subgraphs) ────────────────
async function renderCDN(source, outputPath, scale = 2) {
  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8">
<script src="https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js"></script>
<script>mermaid.initialize({startOnLoad:true,securityLevel:'loose',theme:'default'});</script>
<style>body{margin:0;background:white;}</style>
</head><body>
<div id="wrapper" style="display:inline-block;padding:10px;background:white;">
<pre class="mermaid">${source}</pre>
</div>
</body></html>`;

  const browser = await chromium.launch({
    executablePath: CHROMIUM_PATH,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 4000, height: 8000 });
  await page.setContent(html, { waitUntil: 'networkidle' });
  await page.waitForSelector('svg', { timeout: 15000 });
  await page.waitForTimeout(2000);
  
  await page.$eval('svg', (el, s) => {
    el.style.width = (parseFloat(el.getAttribute('viewBox').split(/\s+/)[2]) * s) + 'px';
    el.style.height = (parseFloat(el.getAttribute('viewBox').split(/\s+/)[3]) * s) + 'px';
    el.style.maxWidth = 'none';
  }, scale);
  
  await page.waitForTimeout(500);
  const wrapper = await page.$('#wrapper');
  const box = await wrapper.boundingBox();
  await page.screenshot({ path: outputPath, clip: box });
  await browser.close();
  
  return { width: Math.round(box.width), height: Math.round(box.height) };
}

// ── Tool definitions ─────────────────────────────────
const tools = [
  {
    name: 'render_mermaid',
    description: `Render a Mermaid diagram to PNG. Two modes:
- "beautiful" (default): zero-DOM sync renderer, fast, professional themes. For flowcharts, simple diagrams. NO subgraph support.
- "cdn": full mermaid via CDN + Chromium. Supports subgraphs, all diagram types. Slower but complete.`,
    inputSchema: {
      type: 'object',
      properties: {
        source: { type: 'string', description: 'Mermaid diagram source code (e.g., "graph TD\\n  A-->B")' },
        output: { type: 'string', description: `Output PNG path. Default: ${DEFAULT_OUTPUT}` },
        scale: { type: 'number', description: 'Scale factor for CDN mode (1-5). Default: 2' },
        mode: { type: 'string', enum: ['beautiful', 'cdn'], description: 'Render mode. Default: beautiful' }
      },
      required: ['source']
    }
  }
];

// ── Server ───────────────────────────────────────────
const server = new Server(
  { name: 'mermaid-png', version: '1.0.0' },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools }));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  
  if (name !== 'render_mermaid') {
    throw new Error(`Unknown tool: ${name}`);
  }
  
  const source = args.source;
  const outputPath = args.output || DEFAULT_OUTPUT;
  const scale = args.scale || 2;
  const mode = args.mode || 'beautiful';
  
  const startTime = Date.now();
  let dims;
  
  if (mode === 'cdn') {
    dims = await renderCDN(source, outputPath, scale);
  } else {
    dims = await renderBeautiful(source, outputPath);
  }
  
  const size = fs.statSync(outputPath).size;
  const elapsed = Date.now() - startTime;
  
  return {
    content: [{
      type: 'text',
      text: JSON.stringify({
        output: outputPath,
        width: dims.width,
        height: dims.height,
        size_bytes: size,
        mode,
        elapsed_ms: elapsed
      })
    }]
  };
});

const transport = new StdioServerTransport();
await server.connect(transport);
console.error('mermaid-png MCP server ready (beautiful + CDN renderers)');
