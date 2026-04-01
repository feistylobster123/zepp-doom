// fix_zeus.mjs — Patch zeppos-app-utils to add missing exports
// Run this after npm install to fix compatibility

import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const utilsPath = join(__dirname, 'node_modules/zeppos-app-utils/dist/index.js');

const src = readFileSync(utilsPath, 'utf8');

// Add getDeviceConf to config
if (!src.includes('getDeviceConf')) {
  // Find config object and add getDeviceConf
  const patched = src.replace(
    'exports.config = {',
    `exports.config = {
  AppType: { APP: 'app', WATCHFACE: 'watchface', SETTINGS: 'settings' },
  getDeviceConf: () => ({ deviceTargets: [], OSV2Devices: [] }),
`
  );
  writeFileSync(utilsPath, patched);
  console.log('Patched zeppos-app-utils: added getDeviceConf + AppType');
} else {
  console.log('Already patched or has getDeviceConf');
}
