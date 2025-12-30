const navLogin = document.getElementById("navLogin");
const navDropdown = document.getElementById("navDropdown");

// Toggle dropdown on click
navLogin.addEventListener("click", () => {
  navDropdown.classList.toggle("hidden");
});

// Optional: close dropdown if clicked outside
document.addEventListener("click", (e) => {
  if (!navLogin.contains(e.target)) {
    navDropdown.classList.add("hidden");
  }
});

// Example: change login to show dropdown if user is logged in
const userLoggedIn = true; // Replace with actual login check
const navLoginText = document.getElementById("navLoginText");

if (userLoggedIn) {
  navLoginText.textContent = "Username"; // Replace with actual username
} else {
  navDropdown.classList.add("hidden"); // Ensure hidden if not logged in
}
