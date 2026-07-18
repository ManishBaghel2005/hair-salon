// component-loader.js

async function loadComponent(elementId, componentPath) {
  const targetElement = document.getElementById(elementId);
  if (!targetElement) return;

  try {
    const response = await fetch(componentPath);
    if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
    
    const htmlContent = await response.text();
    targetElement.innerHTML = htmlContent;
    
    // ✅ 1. Re-initialize AOS if it exists on the page
    if (window.AOS) {
        AOS.refresh();
    }

    // ✅ 2. Initialize Responsive Mobile Menu Toggle (Since HTML is now in the DOM)
    initMobileMenu();

  } catch (error) {
    console.error("Layout engine failure:", error);
  }
}

// Separate Initialization Engine for Responsive Drawer Toggle
// component-loader.js me is function ko replace karein:
function initMobileMenu() {
  const toggleBtn = document.getElementById('menuToggle');
  const navLinks = document.getElementById('navLinks');
  const menuIcon = document.getElementById('menuIcon');

  if (toggleBtn && navLinks && menuIcon) {
    toggleBtn.addEventListener('click', () => {
      // Direct class structural toggle
      navLinks.classList.toggle('hidden');
      navLinks.classList.toggle('flex');
      
      if (navLinks.classList.contains('hidden')) {
        menuIcon.setAttribute('d', 'M4 6h16M4 12h16M4 18h16');
      } else {
        menuIcon.setAttribute('d', 'M6 18L18 6M6 6l12 12');
      }
    });
  }
}
// Domestic DOM layout initialization listener
document.addEventListener("DOMContentLoaded", () => {
  loadComponent("global-header", "header.html");
});