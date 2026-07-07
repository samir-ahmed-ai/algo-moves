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

function read(rel) {
  const path = join(root, rel);
  if (!existsSync(path)) {
    failures.push(`${rel}: missing`);
    return '';
  }
  return readFileSync(path, 'utf8');
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
    if (!manifest.name) failures.push(`${manifestPath}: missing name`);
    if (!manifest.short_name) failures.push(`${manifestPath}: missing short_name`);
    if (!manifest.start_url) failures.push(`${manifestPath}: missing start_url`);
    if (!manifest.display) failures.push(`${manifestPath}: missing display`);
    if (!Array.isArray(manifest.icons) || manifest.icons.length === 0) {
      failures.push(`${manifestPath}: missing icons`);
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

// --- Budget thresholds (documented constants for manual Lighthouse runs) ---
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
