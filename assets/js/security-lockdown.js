/**
 * SITE-89 AGGRESSIVE SECURITY LOCKDOWN
 * Client-side code protection system
 * Prevents DevTools access and code inspection
 */

(function() {
  'use strict';

  // ===== DETECTION & IMMEDIATE RESPONSE =====
  const isDevToolsOpen = () => {
    const start = performance.now();
    debugger;
    const end = performance.now();
    // If debugger was executed, DevTools is open (>100ms difference)
    return (end - start) > 100;
  };

  // Check DevTools every 100ms - aggressive monitoring
  let devToolsDetected = false;
  setInterval(() => {
    if (isDevToolsOpen()) {
      if (!devToolsDetected) {
        devToolsDetected = true;
        // DevTools opened - execute countermeasures
        lockdownPage();
      }
    } else {
      devToolsDetected = false;
    }
  }, 100);

  function lockdownPage() {
    // Disable all interactions
    document.documentElement.style.pointerEvents = 'none';
    document.body.style.pointerEvents = 'none';
    document.body.innerHTML = '<div style="position:fixed;top:0;left:0;width:100%;height:100%;background:#000;color:#f00;display:flex;align-items:center;justify-content:center;font-family:monospace;font-size:20px;z-index:999999;">⚠️ DEVELOPER TOOLS DETECTED ⚠️<br/>Access Denied</div>';
    
    // Disable all events
    document.addEventListener('click', (e) => e.preventDefault(), true);
    document.addEventListener('keydown', (e) => e.preventDefault(), true);
    document.addEventListener('keyup', (e) => e.preventDefault(), true);
    document.addEventListener('mousedown', (e) => e.preventDefault(), true);
  }

  // ===== KEYBOARD SHORTCUT BLOCKING =====
  document.addEventListener('keydown', (e) => {
    // Block F12
    if (e.key === 'F12') {
      e.preventDefault();
      e.stopImmediatePropagation();
      return false;
    }
    // Block Ctrl+Shift+I
    if (e.ctrlKey && e.shiftKey && e.key === 'I') {
      e.preventDefault();
      e.stopImmediatePropagation();
      return false;
    }
    // Block Ctrl+Shift+C
    if (e.ctrlKey && e.shiftKey && e.key === 'C') {
      e.preventDefault();
      e.stopImmediatePropagation();
      return false;
    }
    // Block Ctrl+Shift+J
    if (e.ctrlKey && e.shiftKey && e.key === 'J') {
      e.preventDefault();
      e.stopImmediatePropagation();
      return false;
    }
    // Block Ctrl+U
    if (e.ctrlKey && e.key === 'U') {
      e.preventDefault();
      e.stopImmediatePropagation();
      return false;
    }
  }, true);

  // ===== RIGHT-CLICK BLOCKING =====
  document.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    e.stopImmediatePropagation();
    return false;
  }, true);

  document.addEventListener('mousedown', (e) => {
    if (e.button === 2) {
      e.preventDefault();
      e.stopImmediatePropagation();
      return false;
    }
  }, true);

  // ===== CONSOLE OVERRIDE =====
  const originalLog = console.log;
  const originalWarn = console.warn;
  const originalError = console.error;

  // Override ALL console methods
  Object.defineProperty(console, 'log', {
    value: () => {},
    writable: false,
    configurable: false
  });

  Object.defineProperty(console, 'warn', {
    value: () => {},
    writable: false,
    configurable: false
  });

  Object.defineProperty(console, 'error', {
    value: () => {},
    writable: false,
    configurable: false
  });

  Object.defineProperty(console, 'debug', {
    value: () => {},
    writable: false,
    configurable: false
  });

  Object.defineProperty(console, 'info', {
    value: () => {},
    writable: false,
    configurable: false
  });

  Object.defineProperty(console, 'trace', {
    value: () => {},
    writable: false,
    configurable: false
  });

  Object.defineProperty(console, 'table', {
    value: () => {},
    writable: false,
    configurable: false
  });

  Object.defineProperty(console, 'clear', {
    value: () => {},
    writable: false,
    configurable: false
  });

  Object.defineProperty(console, 'time', {
    value: () => {},
    writable: false,
    configurable: false
  });

  Object.defineProperty(console, 'timeEnd', {
    value: () => {},
    writable: false,
    configurable: false
  });

  Object.defineProperty(console, 'group', {
    value: () => {},
    writable: false,
    configurable: false
  });

  Object.defineProperty(console, 'groupEnd', {
    value: () => {},
    writable: false,
    configurable: false
  });

  // ===== CONTINUOUS DEBUGGER =====
  setInterval(() => {
    debugger;
  }, 50);

  // ===== SOURCE MAP BLOCKING =====
  Object.defineProperty(window, 'sourceMapSupport', {
    value: undefined,
    writable: false,
    configurable: false
  });

  // ===== PREVENT IFRAME =====
  if (window !== window.top) {
    window.top.location = window.self.location;
  }

  // ===== FETCH INTERCEPTOR =====
  const originalFetch = window.fetch;
  window.fetch = function() {
    return originalFetch.apply(this, arguments);
  };

  // ===== BLOCK DEVELOPER TOOLS DETECTION =====
  Object.defineProperty(navigator, 'webdriver', {
    get: () => false,
  });

  // ===== WINDOW PROPERTIES PROTECTION =====
  try {
    Object.defineProperty(window, 'devtools', {
      get: function() {
        throw new Error('Access Denied');
      },
      configurable: false
    });
  } catch (e) {}

  // ===== PROTECT PROTOTYPE METHODS =====
  Object.freeze(Object.prototype);
  Object.freeze(Function.prototype);
  Object.freeze(Array.prototype);
  Object.freeze(String.prototype);

})();
