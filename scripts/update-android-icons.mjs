// Generate Android launcher icons from a 512x512 source and write to mipmap dirs
// Usage: node scripts/update-android-icons.mjs

import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const projectRoot = path.resolve(process.cwd());
const srcCandidates = [
  path.join(projectRoot, 'public', 'icons', 'dogpark_icon_512x512.png'),
  path.join(projectRoot, 'public', 'icons', 'icon_android_512x512.png'),
  path.join(projectRoot, 'public', 'icons', 'icon_android_384x384.png'),
  path.join(projectRoot, 'public', 'icons', 'icon_android_192x192.png'),
];

const srcPath = srcCandidates.find((p) => fs.existsSync(p));
if (!srcPath) {
  console.error('No source icon found. Expected one of:', srcCandidates);
  process.exit(1);
}

const resDir = path.join(projectRoot, 'android', 'app', 'src', 'main', 'res');

const densities = {
  mdpi: 1,
  hdpi: 1.5,
  xhdpi: 2,
  xxhdpi: 3,
  xxxhdpi: 4,
};

// Base DP sizes per Android spec
const launcherDp = 48; // ic_launcher.png size in dp
const roundDp = 48; // ic_launcher_round.png
const foregroundDp = 108; // ic_launcher_foreground.png

async function ensureDir(p) {
  await fs.promises.mkdir(p, { recursive: true });
}

async function writeResized(outPath, sizePx) {
  await sharp(srcPath).resize(sizePx, sizePx).png({ compressionLevel: 9 }).toFile(outPath);
}

async function generate() {
  console.log('Using source:', srcPath);
  const tasks = [];
  for (const [density, scale] of Object.entries(densities)) {
    const dir = path.join(resDir, `mipmap-${density}`);
    await ensureDir(dir);
    const launcherPx = Math.round(launcherDp * scale);
    const roundPx = Math.round(roundDp * scale);
    const foregroundPx = Math.round(foregroundDp * scale);

    tasks.push(writeResized(path.join(dir, 'ic_launcher.png'), launcherPx));
    tasks.push(writeResized(path.join(dir, 'ic_launcher_round.png'), roundPx));
    tasks.push(writeResized(path.join(dir, 'ic_launcher_foreground.png'), foregroundPx));
  }
  await Promise.all(tasks);
  console.log('Android launcher icons updated under res/mipmap-*');
}

generate().catch((e) => {
  console.error(e);
  process.exit(1);
});



