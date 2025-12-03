document.addEventListener("DOMContentLoaded", () => {
  const includes = document.querySelectorAll("[data-include]");
  includes.forEach(el => {
    fetch(el.dataset.include)
      .then(res => res.text())
      .then(data => el.innerHTML = data)
      .then(() => document.dispatchEvent(new Event("includesLoaded")))
      .catch(err => console.error("Error loading component:", el.dataset.include, err));
  });
});
