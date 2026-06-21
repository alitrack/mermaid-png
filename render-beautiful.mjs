import { renderMermaidSVG } from 'beautiful-mermaid';
import { chromium } from 'playwright';
import fs from 'fs';

async function render(inputFile, outputFile, theme = { bg: '#ffffff', fg: '#1a1a2e' }) {
  const src = fs.readFileSync(inputFile, 'utf-8');
  const svg = renderMermaidSVG(src, theme);
  
  const browser = await chromium.launch({
    executablePath: '/home/lhy/.cache/ms-playwright/chromium-1228/chrome-linux64/chrome',
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

await render('flowchart.mmd', '/tmp/three-pipeline-demo/1-mermaid-flowchart.png', { bg: '#ffffff', fg: '#2c3e50', accent: '#3498db' });
await render('complex.mmd', '/tmp/three-pipeline-demo/2-mermaid-complex.png', { bg: '#ffffff', fg: '#2c3e50', accent: '#3498db', line: '#95a5a6' });
