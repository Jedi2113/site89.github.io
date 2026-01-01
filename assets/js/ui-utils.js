/**
 * Shared UI Components & Utilities
 * Consolidates reusable styles and logic across the site
 */

/* Card Grid Utility */
export function createCardGrid(columns = 'repeat(auto-fill, minmax(240px, 1fr))') {
  return {
    display: 'grid',
    gridTemplateColumns: columns,
    gap: '1.5rem',
    marginBottom: '2rem'
  };
}

/* Modal Overlay */
export function createModalOverlay() {
  return {
    display: 'none',
    position: 'fixed',
    zIndex: '2000',
    left: '0',
    top: '0',
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    animation: 'fadeIn 0.3s ease'
  };
}

/* Button States */
export const ButtonState = {
  PRIMARY: 'btn-primary',
  SECONDARY: 'btn-secondary',
  DANGER: 'btn-danger',
  SMALL: 'btn-small'
};

/* Form Field Wrapper */
export function wrapFormField(label, input, error = null) {
  const wrapper = document.createElement('div');
  wrapper.className = 'form-field';
  
  if (label) {
    const labelEl = document.createElement('label');
    labelEl.textContent = label;
    wrapper.appendChild(labelEl);
  }
  
  wrapper.appendChild(input);
  
  if (error) {
    const errorEl = document.createElement('span');
    errorEl.className = 'form-error';
    errorEl.textContent = error;
    wrapper.appendChild(errorEl);
  }
  
  return wrapper;
}

/* Notification Toast */
export function showToast(message, type = 'info', duration = 3000) {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  toast.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    padding: 1rem 1.5rem;
    background: var(--bg-card);
    border: 1px solid var(--card-border);
    border-radius: 6px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    z-index: 5000;
    animation: slideIn 0.3s ease;
  `;
  
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.style.animation = 'slideOut 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

/* Loading State */
export function setLoading(element, isLoading) {
  if (isLoading) {
    element.setAttribute('data-loading', 'true');
    element.disabled = true;
    const spinner = document.createElement('i');
    spinner.className = 'fa-solid fa-spinner fa-spin';
    spinner.style.marginRight = '0.5rem';
    element.insertBefore(spinner, element.firstChild);
  } else {
    element.removeAttribute('data-loading');
    element.disabled = false;
    const spinner = element.querySelector('.fa-spinner');
    if (spinner) spinner.remove();
  }
}

/* Debounce Helper */
export function debounce(func, delay) {
  let timeoutId;
  return function (...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
}

/* Safe localStorage */
export const StorageManager = {
  set: (key, value) => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.warn('localStorage not available:', e);
    }
  },
  get: (key, defaultValue = null) => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (e) {
      console.warn('Error reading from localStorage:', e);
      return defaultValue;
    }
  },
  remove: (key) => {
    try {
      localStorage.removeItem(key);
    } catch (e) {
      console.warn('Error removing from localStorage:', e);
    }
  }
};
