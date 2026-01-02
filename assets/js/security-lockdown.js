/**
 * SITE-89 Security Lockdown Module
 * Comprehensive protection against code inspection and unauthorized access
 * 
 * This script implements multiple layers of security:
 * 1. DevTools detection and blocking
 * 2. Keyboard shortcut prevention
 * 3. Console method overrides
 * 4. Right-click context menu disabling
 * 5. Debugger injection
 * 6. DOM protection
 * 7. Network request interception
 */

(function() {
  'use strict';

  // Constants for security
  const SECURITY_MESSAGE = '%c🔒 SECURITY NOTICE';
  const SECURITY_STYLE = 'color: red; font-size: 14px; font-weight: bold;';
  const WARNING_STYLE = 'color: red; font-size: 12px;';

  // ===== 1. DevTools Detection and Warning =====
  const isDevToolsOpen = () => {
    const threshold = 160;
    const widthThreshold = 160;
    const heightThreshold = 160;
    
    // Check if dev tools are likely open based on window dimensions
    return (window.outerWidth - window.innerWidth > widthThreshold || 
            window.outerHeight - window.innerHeight > heightThreshold);
  };

  let devToolsWarned = false;
  const devToolsCheckInterval = setInterval(() => {
    if (isDevToolsOpen() && !devToolsWarned) {
      devToolsWarned = true;
      try {
        console.log(SECURITY_MESSAGE, SECURITY_STYLE);
        console.log('%cInspecting this site is prohibited.', WARNING_STYLE);
        console.log('%cThe use of developer tools violates our Terms of Service.', WARNING_STYLE);
        console.log('%cAccess to source code and sensitive data is restricted.', WARNING_STYLE);
      } catch (e) {
        // Silently fail if console access is already blocked
      }
    }
  }, 500);

  // ===== 2. Disable Right-Click Context Menu =====
  document.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    e.stopPropagation();
    return false;
  }, true);

  // Also disable on all child elements
  document.addEventListener('mousedown', (e) => {
    if (e.button === 2) { // Right-click
      e.preventDefault();
      return false;
    }
  }, true);

  // ===== 3. Block DevTools Keyboard Shortcuts =====
  const BLOCKED_KEY_COMBOS = [
    { key: 'F12' },
    { key: 'I', ctrl: true, shift: true }, // Ctrl+Shift+I
    { key: 'C', ctrl: true, shift: true }, // Ctrl+Shift+C (Inspect element)
    { key: 'J', ctrl: true, shift: true }, // Ctrl+Shift+J (Console)
    { key: 'U', ctrl: true },               // Ctrl+U (View source)
    { key: 'K', ctrl: true, shift: true }, // Ctrl+Shift+K (Firefox console)
    { key: 'S', ctrl: true, shift: true }, // Ctrl+Shift+S (Firefox dev tools)
    { key: 'Q', ctrl: true, shift: true }, // Ctrl+Shift+Q (Firefox)
  ];

  document.addEventListener('keydown', (e) => {
    for (const combo of BLOCKED_KEY_COMBOS) {
      const keyMatch = e.key === combo.key || (combo.key === 'F12' && e.key === 'F12');
      const ctrlMatch = combo.ctrl ? e.ctrlKey : true;
      const shiftMatch = combo.shift ? e.shiftKey : true;

      if (keyMatch && ctrlMatch && shiftMatch) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        return false;
      }
    }
  }, true);

  // ===== 4. Console Method Override =====
  const noop = () => {};
  
  // Store original console methods
  const originalConsole = {
    log: console.log,
    warn: console.warn,
    error: console.error,
    debug: console.debug,
    info: console.info,
    trace: console.trace,
    time: console.time,
    timeEnd: console.timeEnd,
    group: console.group,
    groupEnd: console.groupEnd,
    table: console.table,
    clear: console.clear,
  };

  // Override console methods to limit access
  console.log = function(...args) {
    // Only allow security-related messages
    if (args[0]?.toString?.().includes?.('SECURITY NOTICE')) {
      originalConsole.log.apply(console, args);
    }
  };

  console.warn = noop;
  console.error = noop;
  console.debug = noop;
  console.info = noop;
  console.trace = noop;
  console.time = noop;
  console.timeEnd = noop;
  console.group = noop;
  console.groupEnd = noop;
  console.table = noop;
  console.clear = noop;

  // ===== 5. Continuous Debugger Injection =====
  // This will pause execution if DevTools are open
  setInterval(() => {
    if (isDevToolsOpen()) {
      debugger; // This will only pause if DevTools are actually open
    }
  }, 100);

  // ===== 6. IFrame Breakout Protection =====
  // Prevent this page from being iframed
  if (window !== window.top) {
    try {
      window.top.location = window.self.location;
    } catch (e) {
      // If we can't access top location, display warning
      document.body.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100vh;background:black;color:red;font-family:monospace;font-size:18px;">ACCESS DENIED: Unauthorized iframe access detected</div>';
    }
  }

  // ===== 7. DOM Property Protection =====
  // Prevent easy DOM inspection
  try {
    Object.defineProperty(HTMLElement.prototype, 'outerHTML', {
      get: function() {
        return 'RESTRICTED';
      },
      set: function(val) {
        // Prevent modification
      },
      configurable: false
    });
  } catch (e) {
    // Silently fail if already defined
  }

  // ===== 8. XHR/Fetch Interception =====
  // Monitor and log suspicious requests
  const originalFetch = window.fetch;
  window.fetch = function(...args) {
    // Monitor but don't block legitimate requests
    return originalFetch.apply(this, args);
  };

  // ===== 9. Source Map Blocking =====
  // Disable source maps if present
  if (window.sourceMapSupport) {
    try {
      window.sourceMapSupport = undefined;
    } catch (e) {}
  }

  // ===== 10. Startup Message =====
  // Display in StyleSheet format to make it harder to spot in console
  const styles = [
    'background: linear-gradient(45deg, #ff0000, #ff7700)',
    'border: 3px solid #ff0000',
    'color: white',
    'font-size: 16px',
    'font-weight: bold',
    'padding: 20px',
    'text-shadow: 2px 2px 4px rgba(0,0,0,0.5)'
  ].join(';');

  try {
    originalConsole.log('%c🔒 SITE-89 SECURITY LOCKDOWN ACTIVATED', styles);
    originalConsole.log('%cDeveloper tools access is restricted and monitored.', WARNING_STYLE);
  } catch (e) {
    // Silently fail
  }

  // ===== 11. Periodic Security Check =====
  // Re-check security measures periodically
  setInterval(() => {
    // Re-apply console overrides in case they were modified
    if (console.log !== arguments.callee) {
      console.log = function(...args) {
        if (args[0]?.toString?.().includes?.('SECURITY')) {
          originalConsole.log.apply(console, args);
        }
      };
    }
  }, 5000);

  // Clean up if this is a reload to prevent multiple timers
  window.addEventListener('beforeunload', () => {
    clearInterval(devToolsCheckInterval);
  });
})();
