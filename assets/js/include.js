// include.js — loads all [data-include] elements
document.addEventListener("DOMContentLoaded", async () => {
  const includeElements = document.querySelectorAll('[data-include]');

  for (const el of includeElements) {
    const url = el.getAttribute('data-include');
    if (!url) continue;

    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Failed to load ${url}: ${res.statusText}`);
      el.innerHTML = await res.text();
      el.removeAttribute('data-include');
    } catch (err) {
      console.error(err);
      el.innerHTML = `<p style="color:red;">Error loading component: ${url}</p>`;
    }
  }

  // Dispatch event once all includes are loaded
  document.dispatchEvent(new Event('includesLoaded'));
});
