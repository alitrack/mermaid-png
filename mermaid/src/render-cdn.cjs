const { chromium } = require('playwright');
const fs = require('fs');

const MERMAID_SRC = fs.readFileSync(process.argv[2], 'utf-8');
const OUTPUT = process.argv[3];
const SCALE = parseInt(process.argv[4] || '3', 10);

const HTML = `<!DOCTYPE html>
<html><head><meta charset="utf-8">
<script src="https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js"></script>
<script>mermaid.initialize({startOnLoad:true,securityLevel:'loose',theme:'default'});</script>
<style>body{margin:0;background:white;}</style>
</head><body>
<div id="wrapper" style="display:inline-block;padding:10px;background:white;">
<pre class="mermaid">${MERMAID_SRC}</pre>
</div>
</body></html>`;

(async () => {
  const browser = await chromium.launch({
    executablePath: '/home/lhy/.cache/ms-playwright/chromium-1228/chrome-linux64/chrome',
    args: ['--no-sandbox','--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  await page.setViewportSize({width:10000, height:10000});
  await page.setContent(HTML, {waitUntil:'networkidle'});
  await page.waitForSelector('svg', {timeout:15000});
  await page.waitForTimeout(2000);

  // Get SVG viewBox
  const svgBox = await page.$eval('svg', el => {
    const vb = el.getAttribute('viewBox');
    if (!vb) return {x:0,y:0,w:800,h:600};
    const [x,y,w,h] = vb.split(/\s+/).map(Number);
    return {x,y,w,h};
  });

  // Scale SVG via CSS — override mermaid's inline max-width
  await page.$eval('svg', (el, s) => {
    el.style.width = (parseFloat(el.getAttribute('viewBox').split(/\s+/)[2]) * s) + 'px';
    el.style.height = (parseFloat(el.getAttribute('viewBox').split(/\s+/)[3]) * s) + 'px';
    el.style.maxWidth = 'none';
    el.setAttribute('style', el.getAttribute('style').replace(/max-width:\s*[^;]+;?/g, '') + ';max-width:none');
  }, SCALE);

  await page.waitForTimeout(500);

  // Screenshot the wrapper div
  const wrapper = await page.$('#wrapper');
  const box = await wrapper.boundingBox();
  
  await page.screenshot({
    path: OUTPUT,
    clip: {
      x: box.x,
      y: box.y,
      width: box.width,
      height: box.height
    }
  });

  await browser.close();
  const stats = fs.statSync(OUTPUT);
  console.log(`✅ ${OUTPUT} (${stats.size} bytes, viewBox=${svgBox.w}×${svgBox.h}@${SCALE}x, output=${Math.round(box.width)}×${Math.round(box.height)})`);
})();
