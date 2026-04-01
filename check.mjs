import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const u = require('./node_modules/zeppos-app-utils/dist/index.js');
console.log('modules:', Object.keys(u.modules || {}));
console.log('buildSupportV3Config:', typeof u.modules?.buildSupportV3Config);
