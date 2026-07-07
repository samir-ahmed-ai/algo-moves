#!/usr/bin/env node
/**
 * Static Lighthouse / a11y budget guard — checks HTML shell, PWA manifest, and
 * key transport a11y patterns without launching a browser.
 * Run: npm run check:lighthouse-budget
 */
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const failures = [];
const fileCache = new Map();

function read(rel) {
  if (fileCache.has(rel)) return fileCache.get(rel);
  const path = join(root, rel);
  if (!existsSync(path)) {
    failures.push(`${rel}: missing`);
    fileCache.set(rel, '');
    return '';
  }
  const text = readFileSync(path, 'utf8');
  fileCache.set(rel, text);
  return text;
}

function requireMatch(rel, label, re) {
  const text = read(rel);
  if (!text) return;
  if (!re.test(text)) failures.push(`${rel}: ${label}`);
}

// --- HTML shell (SEO + a11y baseline) ---
requireMatch('index.html', 'missing lang attribute', /<html[^>]*\slang="/);
requireMatch('index.html', 'missing viewport meta', /name="viewport"/);
requireMatch('index.html', 'missing description meta', /name="description"/);
requireMatch('index.html', 'missing noscript fallback', /<noscript>/);

// --- PWA manifest ---
const manifestPath = 'public/manifest.webmanifest';
const manifestRaw = read(manifestPath);
if (manifestRaw) {
  try {
    const manifest = JSON.parse(manifestRaw);
    if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest)) {
      failures.push(`${manifestPath}: root must be an object`);
    }
    if (typeof manifest.name !== 'string' || !manifest.name.trim()) {
      failures.push(`${manifestPath}: missing name`);
    }
    if (typeof manifest.short_name !== 'string' || !manifest.short_name.trim()) {
      failures.push(`${manifestPath}: missing short_name`);
    }
    if (typeof manifest.start_url !== 'string' || !manifest.start_url.trim()) {
      failures.push(`${manifestPath}: missing start_url`);
    }
    if (typeof manifest.display !== 'string' || !manifest.display.trim()) {
      failures.push(`${manifestPath}: missing display`);
    }
    if (!Array.isArray(manifest.icons) || manifest.icons.length === 0) {
      failures.push(`${manifestPath}: missing icons`);
    } else {
      for (const [index, icon] of manifest.icons.entries()) {
        if (!icon || typeof icon !== 'object' || Array.isArray(icon)) {
          failures.push(`${manifestPath}: icons[${index}] must be an object`);
          continue;
        }
        if (typeof icon.src !== 'string' || !icon.src.trim()) {
          failures.push(`${manifestPath}: icons[${index}] missing src`);
        }
        if (typeof icon.sizes !== 'string' || !icon.sizes.trim()) {
          failures.push(`${manifestPath}: icons[${index}] missing sizes`);
        }
        if (typeof icon.type !== 'string' || !icon.type.trim()) {
          failures.push(`${manifestPath}: icons[${index}] missing type`);
        }
      }
    }
  } catch {
    failures.push(`${manifestPath}: invalid JSON`);
  }
}

// --- Transport bar a11y (role + labelled controls) ---
requireMatch(
  'src/shell/canvas/ui/TransportBarCore.tsx',
  'transport toolbar missing role="toolbar"',
  /role="toolbar"/,
);
requireMatch(
  'src/shell/canvas/ui/TransportBarCore.tsx',
  'play button missing aria-label',
  /aria-label=\{player\.isPlaying/,
);
requireMatch(
  'src/shell/canvas/ui/TransportBarCore.tsx',
  'scrubber missing aria-label',
  /aria-label="Scrub timeline"/,
);

// --- Presentation hint is exposed to assistive tech ---
requireMatch(
  'src/shell/workspace/PresentationModeHint.tsx',
  'presentation hint missing role="status"',
  /role="status"/,
);

// --- Shiki is lazy-loaded (puzzle tray only) — must not ship in main entry chunk ---
requireMatch(
  'src/lib/editor/shikiSnippet.tsx',
  'Shiki must use dynamic import for bundle budget',
  /import\(\s*['"]shiki\/bundle\/web['"]\s*\)/,
);
requireMatch(
  'src/lib/editor/shikiSnippet.tsx',
  'Shiki languages must load on demand',
  /@shikijs\/langs\//,
);

// --- Hocuspocus provider is lazy-loaded (collab sessions only) ---
requireMatch(
  'src/shell/collab/yjs/useYjsCanvasCollab.ts',
  'Hocuspocus must use dynamic import for bundle budget',
  /import\(\s*['"]@hocuspocus\/provider['"]\s*\)/,
);

const LIGHTHOUSE_BUDGET = {
  performance: 0.75,
  accessibility: 0.9,
  'best-practices': 0.9,
  seo: 0.9,
};

if (failures.length) {
  console.error('check:lighthouse-budget: failures:\n');
  for (const f of failures) console.error(`  ${f}`);
  console.error('\nManual budget targets:', LIGHTHOUSE_BUDGET);
  process.exit(1);
}

console.log('check:lighthouse-budget: ok');
console.log('  manual Lighthouse targets:', JSON.stringify(LIGHTHOUSE_BUDGET));
