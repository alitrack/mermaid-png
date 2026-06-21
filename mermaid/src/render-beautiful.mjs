import { renderMermaidSVG } from 'beautiful-mermaid';
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const EXAMPLES = path.join(__dirname, '..', 'examples');
const CHROMIUM = process.env.CHROMIUM_PATH || 
  path.join(process.env.HOME, '.cache/ms-playwright/chromium-1228/chrome-linux64/chrome');
const OUTPUT_DIR = process.env.OUTPUT_DIR || '/tmp/mermaid-output';

async function render(inputFile, outputFile, theme = { bg: '#ffffff', fg: '#1a1a2e' }) {
  const src = fs.readFileSync(inputFile, 'utf-8');
  const svg = renderMermaidSVG(src, theme);
  
  const browser = await chromium.launch({
    executablePath: CHROMIUM,
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
  await page.screenshot({ path: outputFile, clip: box });
  await browser.close();
  
  console.log(`✅ ${outputFile} (${fs.statSync(outputFile).size} bytes, ${Math.round(box.width)}×${Math.round(box.height)})`);
}

fs.mkdirSync(OUTPUT_DIR, { recursive: true });

if (process.argv.length >= 4) {
  // CLI mode: node src/render-beautiful.mjs input.mmd output.png
  await render(process.argv[2], process.argv[3]);
} else {
  // Default: render examples
  await render(
    path.join(EXAMPLES, 'flowchart.mmd'),
    path.join(OUTPUT_DIR, 'flowchart.png'),
    { bg: '#ffffff', fg: '#2c3e50', accent: '#3498db' }
  );
  await render(
    path.join(EXAMPLES, 'complex.mmd'),
    path.join(OUTPUT_DIR, 'complex.png'),
    { bg: '#ffffff', fg: '#2c3e50', accent: '#3498db', line: '#95a5a6' }
  );
}
