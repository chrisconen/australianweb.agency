/**
 * Living.js Build Script
 * Bundles src/core/* into dist/living.min.js and dist/living.esm.js
 * Zero dependencies — uses native Node.js only.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const BANNER = `/**
 * Living.js v0.1.0
 * Turn any website into an autonomous AI agent.
 * https://github.com/chrisconen/livingjs
 * MIT License — Australian Web Agency
 */`;

// Read source files in dependency order
const files = [
  'src/core/observer.js',
  'src/core/brain.js',
  'src/core/actor.js',
  'src/core/living.js',
];

function buildESM() {
  // For ESM, just concatenate but fix imports
  let output = BANNER + '\n\n';

  const observer = readFileSync(join(__dirname, files[0]), 'utf8')
    .replace(/^export /gm, '');

  const brain = readFileSync(join(__dirname, files[1]), 'utf8')
    .replace(/^export /gm, '');

  const actor = readFileSync(join(__dirname, files[2]), 'utf8')
    .replace(/^export /gm, '');

  const living = readFileSync(join(__dirname, files[3]), 'utf8')
    .replace(/import.*from.*;\n/g, '')
    .replace('export default instance;', '');

  output += observer + '\n\n';
  output += brain + '\n\n';
  output += actor + '\n\n';
  output += living + '\n\n';
  output += 'export default instance;\n';
  output += 'export { Observer, Brain, Actor };\n';

  return output;
}

function buildIIFE() {
  // For IIFE (browser <script> tag), wrap everything
  let esm = buildESM();

  // Remove export statements
  esm = esm.replace(/^export default.*$/gm, '');
  esm = esm.replace(/^export \{.*\}.*$/gm, '');

  return `${BANNER}
(function() {
  'use strict';

${esm}

  // Expose globally
  if (typeof window !== 'undefined') {
    window.Living = instance;
  }
})();
`;
}

// Build
const distDir = join(__dirname, 'dist');
if (!existsSync(distDir)) mkdirSync(distDir);

const esm = buildESM();
const iife = buildIIFE();

writeFileSync(join(distDir, 'living.esm.js'), esm);
writeFileSync(join(distDir, 'living.min.js'), iife);

console.log(`✅ Built dist/living.esm.js (${(esm.length / 1024).toFixed(1)} KB)`);
console.log(`✅ Built dist/living.min.js (${(iife.length / 1024).toFixed(1)} KB)`);
console.log('');
console.log('⚡ Living.js is ready to ship.');
