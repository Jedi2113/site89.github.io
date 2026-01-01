/**
 * Theme Manager: Light/Dark Mode with Cookie Persistence
 * Provides smooth transitions and maintains user preference across sessions.
 */

export const ThemeManager = (() => {
  const COOKIE_NAME = 'site89_theme';
  const DARK_THEME = 'dark';
  const LIGHT_THEME = 'light';
  const DEFAULT_THEME = 'dark';
  const TRANSITION_DURATION = 300; // ms

  // Detect user's preferred theme (default to light)
  function getSystemTheme() {
    if (typeof window === 'undefined' || !window.matchMedia) return DEFAULT_THEME;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? DARK_THEME : LIGHT_THEME;
  }

  // Get theme from cookie, or use system/default
  function getSavedTheme() {
    if (typeof document === 'undefined') return DEFAULT_THEME;
    const cookies = document.cookie.split(';').map(c => c.trim());
    const themeCookie = cookies.find(c => c.startsWith(COOKIE_NAME + '='));
    return themeCookie ? themeCookie.split('=')[1] : null;
  }

  // Save theme to cookie (expires in 1 year)
  function saveTheme(theme) {
    if (typeof document === 'undefined') return;
    const expiryDate = new Date();
    expiryDate.setFullYear(expiryDate.getFullYear() + 1);
    document.cookie = `${COOKIE_NAME}=${theme}; expires=${expiryDate.toUTCString()}; path=/`;
  }

  // Apply theme to document with smooth transition
  function applyTheme(theme) {
    const html = document.documentElement;
    
    // Add transition class briefly to smooth the change
    html.classList.add('theme-changing');
    html.setAttribute('data-theme', theme);
    saveTheme(theme);
    
    // Remove transition class after transition completes
    setTimeout(() => {
      html.classList.remove('theme-changing');
    }, 320);
  }

  // Get current theme
  function getCurrentTheme() {
    return document.documentElement.getAttribute('data-theme') || DEFAULT_THEME;
  }

  // Initialize theme on page load
  function init() {
    const saved = getSavedTheme();
    const theme = saved || getSystemTheme();
    applyTheme(theme);
  }

  // Toggle between light and dark
  function toggle() {
    const current = getCurrentTheme();
    const next = current === LIGHT_THEME ? DARK_THEME : LIGHT_THEME;
    applyTheme(next);
    // Show beta warning if switching to light mode
    if (next === LIGHT_THEME) {
      showBetaWarning();
    }
    // Dispatch custom event for listeners
    window.dispatchEvent(new CustomEvent('themechange', { detail: { theme: next } }));
  }

  // Show beta warning modal for light mode
  function showBetaWarning() {
    // Remove existing modal if present
    const existing = document.getElementById('light-mode-beta-modal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'light-mode-beta-modal';
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 9999;
      animation: fadeIn 0.3s ease forwards;
    `;

    const content = document.createElement('div');
    content.style.cssText = `
      background: var(--bg-card);
      border: 1px solid var(--card-border);
      border-radius: 12px;
      padding: 2rem;
      max-width: 500px;
      box-shadow: 0 12px 36px rgba(0, 0, 0, 0.3);
      animation: slideIn 0.3s ease forwards;
    `;

    content.innerHTML = `
      <h2 style="margin-top: 0; color: var(--text-light); font-family: var(--font-head);">
        <i class="fa-solid fa-flask-vial" style="margin-right: 0.5rem; color: var(--accent-mint);"></i>
        Light Mode (Beta)
      </h2>
      <p style="color: var(--muted); line-height: 1.6; margin: 1rem 0;">
        Light mode is still in beta and may have visual inconsistencies across different pages. We're actively improving it based on your feedback!
      </p>
      <div style="display: flex; gap: 0.8rem; margin-top: 1.5rem;">
        <button id="light-mode-dismiss" style="
          flex: 1;
          padding: 0.7rem 1rem;
          background: var(--accent-mint);
          color: var(--bg-dark);
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 600;
          transition: all 0.2s ease;
        ">Got It!</button>
        <button id="light-mode-feedback" style="
          flex: 1;
          padding: 0.7rem 1rem;
          background: var(--bg-panel);
          color: var(--text-light);
          border: 1px solid var(--card-border);
          border-radius: 6px;
          cursor: pointer;
          font-weight: 600;
          transition: all 0.2s ease;
        ">Send Feedback</button>
      </div>
    `;

    modal.appendChild(content);
    document.body.appendChild(modal);

    // Event listeners
    document.getElementById('light-mode-dismiss').addEventListener('click', () => {
      modal.style.animation = 'fadeOut 0.3s ease forwards';
      setTimeout(() => modal.remove(), 300);
    });

    document.getElementById('light-mode-feedback').addEventListener('click', () => {
      modal.style.animation = 'fadeOut 0.3s ease forwards';
      setTimeout(() => {
        modal.remove();
        // Could open a feedback form or link here
      }, 300);
    });

    // Close on background click
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.style.animation = 'fadeOut 0.3s ease forwards';
        setTimeout(() => modal.remove(), 300);
      }
    });
  }

  // Set to specific theme
  function set(theme) {
    if ([LIGHT_THEME, DARK_THEME].includes(theme)) {
      applyTheme(theme);
      // Show beta warning if setting to light mode
      if (theme === LIGHT_THEME) {
        showBetaWarning();
      }
      window.dispatchEvent(new CustomEvent('themechange', { detail: { theme } }));
    }
  }

  // Public API
  return {
    init,
    toggle,
    set,
    get: getCurrentTheme,
    isDark: () => getCurrentTheme() === DARK_THEME,
    isLight: () => getCurrentTheme() === LIGHT_THEME,
  };
})();

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => ThemeManager.init());
} else {
  ThemeManager.init();
}
