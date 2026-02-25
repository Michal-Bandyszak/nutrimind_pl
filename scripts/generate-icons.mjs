/**
 * Generates PNG icons for PWA from SVG sources.
 * Run: node scripts/generate-icons.mjs
 * Requires: npm install --save-dev sharp
 */

import sharp from 'sharp';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

const ICON_SVG          = readFileSync(join(root, 'public/icons/icon.svg'));
const ICON_MASKABLE_SVG = readFileSync(join(root, 'public/icons/icon-maskable.svg'));

const icons = [
  { src: ICON_SVG,          out: 'public/icons/icon-192.png',         size: 192 },
  { src: ICON_SVG,          out: 'public/icons/icon-512.png',         size: 512 },
  { src: ICON_MASKABLE_SVG, out: 'public/icons/icon-maskable-512.png', size: 512 },
  // apple-touch-icon needs to be 180×180 PNG
  { src: ICON_SVG,          out: 'public/icons/apple-touch-icon.png',  size: 180 },
];

for (const { src, out, size } of icons) {
  const outPath = join(root, out);
  await sharp(src).resize(size, size).png().toFile(outPath);
  console.log(`✓ ${out} (${size}×${size})`);
}

console.log('\nDone! PNG icons generated in public/icons/');
