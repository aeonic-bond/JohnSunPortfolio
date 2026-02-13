const NAV_BAR_ID = "cs-nav-bar";

const createNavBarElement = () => {
  const navBar = document.createElement("nav");
  navBar.id = NAV_BAR_ID;
  navBar.className = "navBar";
  navBar.setAttribute("aria-label", "Case Study Navigation");

  const link = document.createElement("a");
  link.className = "cs-back-link type-action";
  link.href = document.body.dataset.navHref || "../main/main.html";
  link.textContent = document.body.dataset.navLabel || "Back";

  navBar.append(link);
  return navBar;
};

const initCaseStudyNavBar = () => {
  if (!(document.body instanceof HTMLBodyElement)) return;

  const existingById = document.getElementById(NAV_BAR_ID);
  if (existingById) return;

  const existingNav = document.querySelector(".navBar");
  if (existingNav instanceof HTMLElement) {
    existingNav.id = NAV_BAR_ID;
    return;
  }

  const navBar = createNavBarElement();
  const main = document.querySelector(".cs-main");

  if (main?.parentNode) {
    main.parentNode.insertBefore(navBar, main);
    return;
  }

  document.body.prepend(navBar);
};

window.LiveNavBar = { initCaseStudyNavBar };

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initCaseStudyNavBar, { once: true });
} else {
  initCaseStudyNavBar();
}
