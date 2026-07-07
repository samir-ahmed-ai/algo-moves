/**
 * Generate PNG app icons from favicon.svg for PWA installability.
 *
 * Usage:  npm run generate-pwa-icons
 *
 * Outputs (committed to repo so Railway/Docker builds don't need sharp):
 *   public/assets/favicon.png         32×32   browser favicon
 *   public/assets/favicon-192.png    192×192  Android home-screen
 *   public/assets/apple-touch-icon.png 512×512 iOS home-screen / OG image
 */

import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';

const require = createRequire(import.meta.url);
const sharp = require('sharp');

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const src = join(root, 'public', 'favicon.svg');
const outDir = join(root, 'public', 'assets');

if (!existsSync(src)) {
  console.error(`Missing source icon: ${src}`);
  process.exit(1);
}

mkdirSync(outDir, { recursive: true });

const icons = [
  { name: 'favicon.png', size: 32 },
  { name: 'favicon-192.png', size: 192 },
  { name: 'apple-touch-icon.png', size: 512 },
];

const names = new Set();
for (const icon of icons) {
  if (names.has(icon.name)) {
    console.error(`Duplicate icon output: ${icon.name}`);
    process.exit(1);
  }
  if (!Number.isInteger(icon.size) || icon.size <= 0) {
    console.error(`Invalid icon size for ${icon.name}: ${icon.size}`);
    process.exit(1);
  }
  names.add(icon.name);
}

await Promise.all(
  icons.map(({ name, size }) =>
    sharp(src)
      .resize(size, size)
      .png()
      .toFile(join(outDir, name))
      .then(() => console.log(`  ✓ ${name} (${size}×${size})`)),
  ),
);

console.log('PWA icons generated.');
