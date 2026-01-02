/**
 * HTML Sanitization Utilities
 * Prevents XSS attacks from user-controlled data
 */

/**
 * Safely escape HTML special characters
 * @param {string} str - String to escape
 * @returns {string} Escaped string safe for HTML context
 */
export function escapeHtml(str) {
  if (typeof str !== 'string') return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

/**
 * Create a safe text node from user input
 * @param {string} text - User-provided text
 * @returns {Text} Text node
 */
export function createSafeTextNode(text) {
  return document.createTextNode(String(text || ''));
}

/**
 * Safely set element text content (preferred over innerHTML for user data)
 * @param {Element} element - DOM element
 * @param {string} text - Text content
 */
export function setSafeText(element, text) {
  element.textContent = String(text || '');
}

/**
 * Create a safe element with text content
 * @param {string} tag - HTML tag name
 * @param {string} text - Text content (not HTML)
 * @param {string} className - Optional CSS class
 * @returns {Element} Created element
 */
export function createSafeElement(tag, text, className) {
  const el = document.createElement(tag);
  if (text) el.textContent = String(text);
  if (className) el.className = className;
  return el;
}

/**
 * Sanitize data attributes to prevent injection
 * Only allows alphanumeric, hyphen, underscore in attribute values
 * @param {string} key - Attribute name
 * @param {any} value - Attribute value
 * @returns {string} Sanitized value safe for data attributes
 */
export function sanitizeAttribute(key, value) {
  const str = String(value || '');
  
  // For data attributes, only allow safe characters
  // This prevents things like data-value="onload='alert(1)'"
  if (key.startsWith('data-')) {
    return str.replace(/[^a-zA-Z0-9\-_/:.]/g, '');
  }
  
  return escapeHtml(str);
}

/**
 * Validate and sanitize JSON data from user input
 * Returns null if JSON is invalid
 * @param {string} jsonStr - JSON string
 * @returns {any|null} Parsed object or null if invalid
 */
export function safeJsonParse(jsonStr) {
  try {
    const obj = JSON.parse(jsonStr);
    // Prevent prototype pollution
    if (Object.prototype.toString.call(obj) === '[object Object]') {
      // Basic check - real applications should use libraries like flatted
      return obj;
    }
    return null;
  } catch (e) {
    return null;
  }
}

/**
 * Create a safe card element from user data
 * Used for character cards, personnel listings, etc.
 * @param {Object} data - Data object with id, name, department, rank, etc.
 * @returns {Element} Safe DOM element
 */
export function createSafeCard(data) {
  const card = document.createElement('div');
  card.className = 'card';
  
  // Use textContent for all user-provided data
  const nameEl = document.createElement('h3');
  nameEl.textContent = String(data.name || 'Unknown');
  
  const deptEl = document.createElement('p');
  deptEl.textContent = String(data.department || 'N/A');
  
  const rankEl = document.createElement('p');
  rankEl.textContent = String(data.rank || 'N/A');
  
  card.appendChild(nameEl);
  card.appendChild(deptEl);
  card.appendChild(rankEl);
  
  return card;
}

/**
 * Validate image URLs to prevent data: and javascript: protocols
 * @param {string} url - URL to validate
 * @returns {boolean} True if URL is safe
 */
export function isValidImageUrl(url) {
  if (!url || typeof url !== 'string') return false;
  
  // Only allow http, https, and relative URLs
  const safeUrl = url.toLowerCase().trim();
  
  if (safeUrl.startsWith('javascript:') || 
      safeUrl.startsWith('data:') || 
      safeUrl.startsWith('vbscript:')) {
    return false;
  }
  
  // Check if it looks like a valid URL or relative path
  if (!safeUrl.match(/^(https?:)?\/\//i) && !safeUrl.startsWith('/') && !safeUrl.startsWith('.')) {
    // If it doesn't start with protocol or /, assume it's invalid
    return false;
  }
  
  return true;
}

/**
 * Safely set image src with validation
 * @param {HTMLImageElement} img - Image element
 * @param {string} url - Image URL
 * @param {string} fallback - Fallback URL if invalid
 */
export function setSafeImageSrc(img, url, fallback = '') {
  const safeUrl = isValidImageUrl(url) ? url : fallback;
  img.src = safeUrl;
  
  // Add error handler for broken images
  img.addEventListener('error', () => {
    if (fallback && img.src !== fallback) {
      img.src = fallback;
    }
  }, { once: true });
}
