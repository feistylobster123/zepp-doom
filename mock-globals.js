// mock-globals.js
// Node.js mock for Zepp OS global APIs
// Run: node --experimental-vm-modules --require ./mock-globals.js page/doom/index.js
// Or just use for syntax checking with: node --check page/doom/index.js

// Mock widget IDs for tracking
let _widgetId = 1;
const _widgets = new Map();

// Zepp OS widget types
const WIDGETS = {
  FILL_RECT: 'FILL_RECT',
  TEXT: 'TEXT',
  IMAGE: 'IMAGE',
  CIRCLE: 'CIRCLE',
  RECT: 'RECT',
  LINE: 'LINE',
  POLYLINE: 'POLYLINE',
  ARC: 'ARC',
};

// Mock hmUI global
global.hmUI = {
  widget: WIDGETS,

  // Widget creation
  createWidget(type, options) {
    const id = _widgetId++;
    const widget = { id, type, options, _updated: {} };
    _widgets.set(id, widget);
    console.log(`[MOCK] hmUI.createWidget(${type}, ${JSON.stringify(options)}) → #${id}`);
    return id;
  },

  // Widget property setter
  prop: {
    FILL_COLOR: 'FILL_COLOR',
    TEXT: 'TEXT',
    MORE: 'MORE',
    SRC: 'SRC',
    X: 'X',
    Y: 'Y',
  },

  // Alignment constants
  align: {
    center: 'center',
    left: 'left',
    right: 'right',
    top: 'top',
    bottom: 'bottom',
  },

  // Disable scrolling
  setLayerScrolling(enabled) {
    console.log(`[MOCK] hmUI.setLayerScrolling(${enabled})`);
  },

  // Toast notification
  showToast({ text, duration }) {
    console.log(`[MOCK] hmUI.showToast("${text}", ${duration}ms)`);
  },

  // Global button handlers
  onGlobalButtonDown(btn, fn) {
    console.log(`[MOCK] hmUI.onGlobalButtonDown(${btn})`);
  },

  // Not all constants needed but add as needed
  button: {
    MENU: 'MENU',
    BACK: 'BACK',
    UP: 'UP',
    DOWN: 'DOWN',
  },
};

// Mock timer global
global.timer = {
  createTimer(startDelay, interval, callback) {
    const id = setInterval(() => {
      try {
        callback(Date.now());
      } catch (e) {
        console.error(`[MOCK] Timer callback error: ${e}`);
      }
    }, interval);
    console.log(`[MOCK] timer.createTimer(${startDelay}, ${interval}ms) → interval #${id}`);
    return id;
  },
  stopTimer(id) {
    clearInterval(id);
    console.log(`[MOCK] timer.stopTimer(#${id})`);
  },
};

// Mock hmApp global
global.hmApp = {
  // Page navigation
  gotoPage({ url, param }) {
    console.log(`[MOCK] hmApp.gotoPage(${url}, ${param})`);
  },
  exit() {
    console.log('[MOCK] hmApp.exit()');
  },
};

// Mock hmSetting
global.hmSetting = {
  setDialHomeButton({ longpress }) {
    console.log('[MOCK] hmSetting.setDialHomeButton()');
  },
};

// Mock getApp()
global.getApp = () => ({
  _options: {
    globalData: {
      maxScore: 0,
      localStorage: {
        set(data) { console.log('[MOCK] localStorage.set', JSON.stringify(data)); },
      },
    },
  },
});

// Mock App
global.App = {
  register(opts) {
    console.log('[MOCK] App.register()');
    console.log('  globalData:', JSON.stringify(opts.globalData));
  },
};

// Mock Page
global.Page = function(opts) {
  console.log('[MOCK] Page()');
  console.log('  build defined:', typeof opts.build === 'function');
  console.log('  onInit defined:', typeof opts.onInit === 'function');
  console.log('  onDestroy defined:', typeof opts.onDestroy === 'function');
  // Auto-call build for testing
  if (opts.build) {
    try {
      opts.build();
    } catch (e) {
      console.error('[MOCK] Page.build() error:', e.message);
    }
  }
  return opts;
};

// Mock console
if (!global.console._mock) {
  global.console._mock = true;
  const _orig = console.log;
  console.log = (...args) => {
    process.stdout.write('[ZEPPCODE] ' + args.map(a => String(a)).join(' ') + '\n');
  };
}

// Mock hmFS
global.hmFS = {
  SYNC_I: {},
  readFile(path) { console.log(`[MOCK] hmFS.readFile(${path})`); },
  writeFile(path, data) { console.log(`[MOCK] hmFS.writeFile(${path}, ${data.length}b)`); },
};

console.log('[MOCK] Zepp OS globals loaded');
