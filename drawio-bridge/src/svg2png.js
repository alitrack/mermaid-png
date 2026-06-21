#!/usr/bin/env node
/**
 * drawio-bridge: draw.io SVG → PNG via Playwright Chromium
 * Usage: node svg2png.js <input.svg> [output.png] [scale]
 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const input = process.argv[2];
const output = process.argv[3] || input.replace(/\.svg$/, '.png');
const scale = parseInt(process.argv[4] || '2', 10);

if (!input) {
  console.error('Usage: node svg2png.js <input.svg> [output.png] [scale]');
  process.exit(1);
}

const CHROMIUM = process.env.CHROMIUM_PATH ||
  path.join(process.env.HOME, '.cache/ms-playwright/chromium-1228/chrome-linux64/chrome');

(async () => {
  const svgContent = fs.readFileSync(input, 'utf-8');

  // Extract viewBox for sizing
  const vbMatch = svgContent.match(/viewBox="([^"]*)"/);
  const [vbX, vbY, vbW, vbH] = vbMatch
    ? vbMatch[1].split(/\s+/).map(Number)
    : [0, 0, 800, 600];

  const browser = await chromium.launch({
    executablePath: CHROMIUM,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();

  await page.setViewportSize({
    width: Math.ceil(vbW * scale) + 20,
    height: Math.ceil(vbH * scale) + 20
  });

  await page.setContent(`<!DOCTYPE html>
<html><body style="margin:0;background:white;">
<div id="wrapper" style="display:inline-block;">${svgContent}</div>
</body></html>`);

  await page.waitForTimeout(500);

  // Scale SVG
  await page.$eval('#wrapper svg', (el, s) => {
    el.style.width = (parseFloat(el.getAttribute('viewBox').split(/\s+/)[2]) * s) + 'px';
    el.style.height = (parseFloat(el.getAttribute('viewBox').split(/\s+/)[3]) * s) + 'px';
  }, scale);

  await page.waitForTimeout(300);

  const wrapper = await page.$('#wrapper');
  const box = await wrapper.boundingBox();
  await page.screenshot({ path: output, clip: box });
  await browser.close();

  const size = fs.statSync(output).size;
  console.log(`✅ ${output} (${size} bytes, ${Math.round(box.width)}×${Math.round(box.height)} @ ${scale}x)`);
})();
