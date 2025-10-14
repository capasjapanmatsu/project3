// Simple QR generator for store links
// Usage: node scripts/generate-qr.mjs

import fs from 'fs';
import path from 'path';
import QRCode from 'qrcode';

const playStoreUrl = 'https://play.google.com/store/apps/details?id=com.dogparkjp.app2';

async function ensureDirectory(dirPath) {
  await fs.promises.mkdir(dirPath, { recursive: true });
}

async function generateQrFiles() {
  const outputDir = path.resolve(process.cwd(), 'public', 'qr');
  await ensureDirectory(outputDir);

  const outputs = [
    { name: 'google-play-qr-300.png', width: 300 },
    { name: 'google-play-qr-512.png', width: 512 },
    { name: 'google-play-qr.svg', width: 512 },
  ];

  for (const o of outputs) {
    const filePath = path.join(outputDir, o.name);
    if (o.name.endsWith('.svg')) {
      const svg = await QRCode.toString(playStoreUrl, {
        type: 'svg',
        width: o.width,
        margin: 1,
      });
      await fs.promises.writeFile(filePath, svg, 'utf8');
    } else {
      await QRCode.toFile(filePath, playStoreUrl, {
        width: o.width,
        margin: 1,
      });
    }
    console.log('Generated', filePath);
  }
}

generateQrFiles().catch((err) => {
  console.error('QR generation failed:', err);
  process.exit(1);
});


