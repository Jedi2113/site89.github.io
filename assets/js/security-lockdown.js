/**
 * SITE-89 AGGRESSIVE SECURITY LOCKDOWN
 * Detects console/DevTools access and redirects
 */

(function() {
  'use strict';

  const REDIRECT_URL = 'https://youtu.be/B4tJmlW6wWg';
  let hasRedirected = false;

  // ===== CONSOLE ACCESS DETECTION =====
  // Override console methods - if ANY are called, user accessed console
  const redirect = () => {
    if (!hasRedirected) {
      hasRedirected = true;
      window.location.href = REDIRECT_URL;
    }
  };

  // Create a proxy that detects when console is accessed
  const originalLog = console.log;
  const originalError = console.error;
  const originalWarn = console.warn;
  const originalDebug = console.debug;

  let consoleAccessed = false;

  // Override and detect console usage
  console.log = new Proxy(originalLog, {
    apply() {
      consoleAccessed = true;
      redirect();
      return undefined;
    }
  });

  console.error = new Proxy(originalError, {
    apply() {
      consoleAccessed = true;
      redirect();
      return undefined;
    }
  });

  console.warn = new Proxy(originalWarn, {
    apply() {
      consoleAccessed = true;
      redirect();
      return undefined;
    }
  });

  console.debug = new Proxy(originalDebug, {
    apply() {
      consoleAccessed = true;
      redirect();
      return undefined;
    }
  });

  // Detect console evaluation attempts
  const handler = {
    apply(target, thisArg, args) {
      consoleAccessed = true;
      redirect();
      return undefined;
    }
  };

  console.table = new Proxy(console.table, handler);
  console.trace = new Proxy(console.trace, handler);
  console.time = new Proxy(console.time, handler);
  console.timeEnd = new Proxy(console.timeEnd, handler);
  console.group = new Proxy(console.group, handler);
  console.clear = new Proxy(console.clear, handler);

  // ===== DEVTOOLS WINDOW SIZE DETECTION =====
  // When DevTools opens, window size changes
  let lastWidth = window.innerWidth;
  let lastHeight = window.innerHeight;

  window.addEventListener('resize', () => {
    const currentWidth = window.innerWidth;
    const currentHeight = window.innerHeight;
    
    // If window resized by more than 160px (typical DevTools open size)
    if (Math.abs(currentWidth - lastWidth) > 160 || Math.abs(currentHeight - lastHeight) > 160) {
      redirect();
    }
    
    lastWidth = currentWidth;
    lastHeight = currentHeight;
  });

  // ===== DEBUGGER DETECTION WITH TIMING =====
  // Periodically check if debugger is running
  setInterval(() => {
    const start = performance.now();
    debugger;
    const end = performance.now();
    
    // If there's a significant delay, debugger caught execution
    if (end - start > 50) {
      redirect();
    }
  }, 500);

  // ===== KEYBOARD SHORTCUT BLOCKING =====
  // Block DevTools shortcuts
  document.addEventListener('keydown', (e) => {
    if (e.key === 'F12') {
      e.preventDefault();
      e.stopImmediatePropagation();
      redirect();
      return false;
    }
    if (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'i')) {
      e.preventDefault();
      e.stopImmediatePropagation();
      redirect();
      return false;
    }
    if (e.ctrlKey && e.shiftKey && (e.key === 'C' || e.key === 'c')) {
      e.preventDefault();
      e.stopImmediatePropagation();
      redirect();
      return false;
    }
    if (e.ctrlKey && e.shiftKey && (e.key === 'J' || e.key === 'j')) {
      e.preventDefault();
      e.stopImmediatePropagation();
      redirect();
      return false;
    }
    if (e.ctrlKey && (e.key === 'U' || e.key === 'u')) {
      e.preventDefault();
      e.stopImmediatePropagation();
      redirect();
      return false;
    }
  }, true);

  // ===== RIGHT-CLICK BLOCKING =====
  document.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    e.stopImmediatePropagation();
    redirect();
    return false;
  }, true);

  // ===== PREVENT IFRAME =====
  if (window !== window.top) {
    window.top.location = window.self.location;
  }

  // ===== CONTINUOUS DEBUGGER LOOP =====
  setInterval(() => {
    debugger;
  }, 100);

})();
