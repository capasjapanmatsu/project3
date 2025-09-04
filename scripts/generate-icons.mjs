// Generate missing PNG icons (including 512x512) from existing SVG icon
// Usage:
// 1) npm i sharp
// 2) node scripts/generate-icons.mjs

import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const projectRoot = path.resolve(process.cwd());
// Prefer favicon.svg (exists in repo). Fallback to png 192.
const srcSvg = path.join(projectRoot, 'public', 'favicon.svg');
const fallbackPng = path.join(projectRoot, 'public', 'icons', 'icon_android_192x192.png');
const outDir = path.join(projectRoot, 'public', 'icons');

const targets = [
  { size: 512, name: 'icon_android_512x512.png' },
  { size: 384, name: 'icon_android_384x384.png' },
];

async function main() {
  if (!fs.existsSync(srcSvg)) {
    console.error('Source SVG not found:', srcSvg);
    process.exit(1);
  }
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  let inputBuffer;
  try {
    inputBuffer = fs.readFileSync(srcSvg);
  } catch (e) {
    console.warn('SVG not found, using fallback PNG:', fallbackPng);
    inputBuffer = fs.readFileSync(fallbackPng);
  }

  for (const t of targets) {
    const outPath = path.join(outDir, t.name);
    await sharp(inputBuffer)
      .resize(t.size, t.size, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
      .png({ compressionLevel: 9 })
      .toFile(outPath);
    console.log('Generated', outPath);
  }
  console.log('Done.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});


