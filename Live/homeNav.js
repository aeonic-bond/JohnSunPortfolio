const HEADER_BAR_CLASS = "cs-header-bar";
const HEADER_BAR_STICKY_CLASS = "is-sticky";
const HEADER_BACK_CLASS = "cs-header-back";
const HEADER_BACK_ICON_CLASS = "cs-header-back-icon";
const HEADER_MENU_CLASS = "cs-header-menu";
const HEADER_MENU_ANCHOR_CLASS = "cs-header-menu-anchor";
const HEADER_CURRENT_SIGN_CLASS = "cs-header-current-sign";
const HEADER_TITLE_CLASS = "cs-header-title";
const HEADER_SIGN_ICON_CLASS = "cs-header-sign-icon";
const HEADER_CHEVRON_CLASS = "cs-header-chevron";
const HEADER_STICKY_ENTER_THRESHOLD_PX = 44;
const HEADER_STICKY_EXIT_THRESHOLD_PX = 36;
const HEADER_BACK_HREF = "/home.html";
const BACK_BUTTON_ICON_SRC = "/Assets/JSLogo.svg";
const HEADER_STICKY_TRANSITION_LOCK_MS = 1000;
const MAIN_SCROLL_RESTORE_FLAG_KEY = "live.main.restore_scroll";

let headerBarRafId = 0;
let headerBarEventsBound = false;
let headerStickyTransitionLock = false;
let headerStickyTransitionLockTimeoutId = 0;
let headerLastScrollY = 0;
let headerUpwardScrollAccumulator = 0;

const findHeaderNavItem = (content = {}, navItems = []) => {
  const contentId = String(content?.id || "").trim().toLowerCase();
  if (!contentId) return null;
  return (
    navItems.find((item) => String(item?.id || "").trim().toLowerCase() === contentId) || null
  );
};

const setWindowActiveIDFromContent = (content = {}) => {
  const contentId = String(content?.id || "").trim().toLowerCase();
  if (!contentId) return;
  window.activeID = `case-study-${contentId}`;
};

const ensureHeaderBar = () => {
  const existing = document.querySelector(`.${HEADER_BAR_CLASS}`);
  if (existing instanceof HTMLElement) return existing;
  if (!(document.body instanceof HTMLBodyElement)) return null;

  const headerBar = document.createElement("header");
  headerBar.className = HEADER_BAR_CLASS;

  const backLink = document.createElement("a");
  backLink.className = HEADER_BACK_CLASS;
  backLink.href = HEADER_BACK_HREF;
  backLink.setAttribute("aria-label", "Back to case studies");

  const backIcon = document.createElement("span");
  backIcon.className = HEADER_BACK_ICON_CLASS;
  backIcon.style.setProperty("--back-icon-src", `url("${BACK_BUTTON_ICON_SRC}")`);
  backIcon.setAttribute("aria-hidden", "true");

  const menuAnchor = document.createElement("div");
  menuAnchor.className = HEADER_MENU_ANCHOR_CLASS;

  const menu = document.createElement("button");
  menu.type = "button";
  menu.className = HEADER_MENU_CLASS;
  menu.setAttribute("aria-label", "Case study menu");
  menu.setAttribute("aria-haspopup", "menu");
  menu.setAttribute("aria-expanded", "false");

  const currentSign = document.createElement("div");
  currentSign.className = HEADER_CURRENT_SIGN_CLASS;

  const title = document.createElement("p");
  title.className = HEADER_TITLE_CLASS;

  const signIcon = document.createElement("img");
  signIcon.className = HEADER_SIGN_ICON_CLASS;
  signIcon.alt = "";
  signIcon.setAttribute("aria-hidden", "true");

  const chevron = document.createElement("span");
  chevron.className = HEADER_CHEVRON_CLASS;
  chevron.setAttribute("aria-hidden", "true");

  const dropdown = createNavDropdown();

  currentSign.append(signIcon, title);
  menu.append(currentSign, chevron);
  menuAnchor.append(menu, dropdown);
  backLink.append(backIcon);
  headerBar.append(backLink, menuAnchor);

  backLink.addEventListener("click", (event) => {
    event.preventDefault();
    try {
      window.sessionStorage?.setItem(MAIN_SCROLL_RESTORE_FLAG_KEY, "1");
    } catch (error) {
      void error;
    }

    const referrerIsHome = (() => {
      try {
        if (!document.referrer) return false;
        const ref = new URL(document.referrer);
        return (
          ref.origin === window.location.origin &&
          (ref.pathname === "/home" || ref.pathname === "/home.html")
        );
      } catch (error) {
        void error;
        return false;
      }
    })();

    if (referrerIsHome && window.history.length > 1) {
      window.history.back();
      return;
    }
    window.location.assign(HEADER_BACK_HREF);
  });

  const main = document.querySelector(".cs-main");
  if (main?.parentNode) {
    main.parentNode.insertBefore(headerBar, main);
  } else {
    document.body.prepend(headerBar);
  }

  menu.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    toggleNavDropdown(menuAnchor);
  });

  document.addEventListener("click", (event) => {
    if (!(event.target instanceof Node)) return;
    if (headerBar.contains(event.target)) return;
    closeNavDropdown(menuAnchor);
  });

  window.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    closeNavDropdown(menuAnchor);
  });

  return headerBar;
};

const applyHeaderBarContent = (content = {}, navItems = []) => {
  const headerBar = ensureHeaderBar();
  if (!(headerBar instanceof HTMLElement)) return;

  const title = headerBar.querySelector(`.${HEADER_TITLE_CLASS}`);
  const signIcon = headerBar.querySelector(`.${HEADER_SIGN_ICON_CLASS}`);
  if (!(title instanceof HTMLElement) || !(signIcon instanceof HTMLImageElement)) return;

  const navItem = findHeaderNavItem(content, navItems);
  const resolvedTitle = String(navItem?.title || "").trim();
  title.textContent = resolvedTitle;
  title.style.setProperty("--cs-header-title-width", `${Math.ceil(title.scrollWidth)}px`);

  const signIconSrc = String(navItem?.icon || "").trim();
  if (signIconSrc) {
    signIcon.src = signIconSrc;
    signIcon.hidden = false;
  } else {
    signIcon.removeAttribute("src");
    signIcon.hidden = true;
  }

  const menuAnchor = headerBar.querySelector(`.${HEADER_MENU_ANCHOR_CLASS}`);
  const activeId = String(content?.id || "").trim().toLowerCase();
  void renderNavDropdown(menuAnchor, navItems, activeId);
};

const lockHeaderStickyTransition = () => {
  headerStickyTransitionLock = true;
  if (headerStickyTransitionLockTimeoutId) {
    window.clearTimeout(headerStickyTransitionLockTimeoutId);
  }
  headerStickyTransitionLockTimeoutId = window.setTimeout(() => {
    headerStickyTransitionLock = false;
    headerStickyTransitionLockTimeoutId = 0;
    scheduleHeaderBarStickyStateUpdate();
  }, HEADER_STICKY_TRANSITION_LOCK_MS);
};

const updateHeaderBarStickyState = () => {
  const headerBar = document.querySelector(`.${HEADER_BAR_CLASS}`);
  if (!(headerBar instanceof HTMLElement)) return;

  const currentScrollY = window.scrollY;
  const delta = currentScrollY - headerLastScrollY;
  headerLastScrollY = currentScrollY;

  if (delta < 0) {
    headerUpwardScrollAccumulator += Math.abs(delta);
  } else if (delta > 0) {
    headerUpwardScrollAccumulator = 0;
  }

  const isCompact = headerBar.classList.contains(HEADER_BAR_STICKY_CLASS);

  if (currentScrollY <= HEADER_STICKY_EXIT_THRESHOLD_PX) {
    if (isCompact) headerBar.classList.remove(HEADER_BAR_STICKY_CLASS);
    headerUpwardScrollAccumulator = 0;
    return;
  }

  if (headerStickyTransitionLock) return;

  if (!isCompact && delta > 0 && currentScrollY >= HEADER_STICKY_ENTER_THRESHOLD_PX) {
    headerBar.classList.add(HEADER_BAR_STICKY_CLASS);
    lockHeaderStickyTransition();
    return;
  }

  if (isCompact && headerUpwardScrollAccumulator >= window.innerHeight * 2) {
    headerBar.classList.remove(HEADER_BAR_STICKY_CLASS);
    headerUpwardScrollAccumulator = 0;
    lockHeaderStickyTransition();
  }
};

const scheduleHeaderBarStickyStateUpdate = () => {
  if (headerBarRafId) return;
  headerBarRafId = window.requestAnimationFrame(() => {
    headerBarRafId = 0;
    updateHeaderBarStickyState();
  });
};

const bindHeaderBarEvents = () => {
  if (headerBarEventsBound) return;
  headerBarEventsBound = true;
  window.addEventListener("scroll", scheduleHeaderBarStickyStateUpdate, { passive: true });
  window.addEventListener("resize", scheduleHeaderBarStickyStateUpdate);
};

const MENU_ICON_SRC = "/Assets/Menu.svg";

const initHomeNav = () => {
  if (!(document.body instanceof HTMLBodyElement)) return;

  const headerBar = document.createElement("header");
  headerBar.className = HEADER_BAR_CLASS;

  const backLink = document.createElement("a");
  backLink.className = HEADER_BACK_CLASS;
  backLink.href = HEADER_BACK_HREF;
  backLink.setAttribute("aria-label", "Home");

  const backIcon = document.createElement("span");
  backIcon.className = HEADER_BACK_ICON_CLASS;
  backIcon.style.setProperty("--back-icon-src", `url("${BACK_BUTTON_ICON_SRC}")`);
  backIcon.setAttribute("aria-hidden", "true");

  backLink.append(backIcon);

  // --- Mobile nav: single Menu.svg icon button → default dropdown ---
  const mobileNav = document.createElement("nav");
  mobileNav.className = "cs-header-home-nav cs-header-home-nav--mobile";
  mobileNav.setAttribute("aria-label", "Site navigation");

  const mobileMenuAnchor = document.createElement("div");
  mobileMenuAnchor.className = HEADER_MENU_ANCHOR_CLASS;

  const mobileMenu = document.createElement("button");
  mobileMenu.type = "button";
  mobileMenu.className = HEADER_MENU_CLASS;
  mobileMenu.setAttribute("aria-label", "Navigation menu");
  mobileMenu.setAttribute("aria-haspopup", "menu");
  mobileMenu.setAttribute("aria-expanded", "false");

  const mobileMenuIcon = document.createElement("span");
  mobileMenuIcon.className = "cs-header-menu-icon";
  mobileMenuIcon.setAttribute("aria-hidden", "true");
  mobileMenuIcon.style.setProperty("mask-image", `url("${MENU_ICON_SRC}")`);
  mobileMenuIcon.style.setProperty("-webkit-mask-image", `url("${MENU_ICON_SRC}")`);

  const mobileDropdown = createNavDropdown(NAV_DROPDOWN_VARIANT_DEFAULT);

  mobileMenu.append(mobileMenuIcon);
  mobileMenuAnchor.append(mobileMenu, mobileDropdown);
  mobileNav.append(mobileMenuAnchor);

  // --- Desktop nav: Contact Me + Resume links + full case studies dropdown ---
  const desktopNav = document.createElement("nav");
  desktopNav.className = "cs-header-home-nav cs-header-home-nav--desktop";
  desktopNav.setAttribute("aria-label", "Site navigation");

  const contactLink = document.createElement("a");
  contactLink.className = "cs-header-home-nav-link";
  contactLink.href = "#contact";
  contactLink.textContent = "Contact";

  const resumeLink = document.createElement("a");
  resumeLink.className = "cs-header-home-nav-link";
  resumeLink.href = "/Assets/John Sun Resume - 2026.pdf";
  resumeLink.target = "_blank";
  resumeLink.rel = "noopener noreferrer";
  resumeLink.textContent = "Resume";

  const desktopMenuAnchor = document.createElement("div");
  desktopMenuAnchor.className = HEADER_MENU_ANCHOR_CLASS;

  const desktopMenu = document.createElement("button");
  desktopMenu.type = "button";
  desktopMenu.className = `${HEADER_MENU_CLASS} cs-header-home-nav-link`;
  desktopMenu.setAttribute("aria-label", "Full case studies");
  desktopMenu.setAttribute("aria-haspopup", "menu");
  desktopMenu.setAttribute("aria-expanded", "false");

  const desktopMenuLabel = document.createElement("span");
  desktopMenuLabel.textContent = "Work";

  const desktopChevron = document.createElement("span");
  desktopChevron.className = HEADER_CHEVRON_CLASS;
  desktopChevron.setAttribute("aria-hidden", "true");

  const desktopDropdown = createNavDropdown(NAV_DROPDOWN_VARIANT_CASE_STUDY_ONLY);

  desktopMenu.append(desktopMenuLabel, desktopChevron);
  desktopMenuAnchor.append(desktopMenu, desktopDropdown);
  desktopNav.append(contactLink, resumeLink, desktopMenuAnchor);

  headerBar.append(backLink, mobileNav, desktopNav);

  const main = document.querySelector(".live-main");
  if (main?.parentNode) {
    main.parentNode.insertBefore(headerBar, main);
  } else {
    document.body.prepend(headerBar);
  }

  mobileMenu.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    toggleNavDropdown(mobileMenuAnchor);
  });

  desktopMenu.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    toggleNavDropdown(desktopMenuAnchor);
  });

  document.addEventListener("click", (event) => {
    if (!(event.target instanceof Node)) return;
    if (headerBar.contains(event.target)) return;
    closeNavDropdown(mobileMenuAnchor);
    closeNavDropdown(desktopMenuAnchor);
  });

  window.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    closeNavDropdown(mobileMenuAnchor);
    closeNavDropdown(desktopMenuAnchor);
  });

  loadNavItems().then((navItems) => {
    void renderNavDropdown(mobileMenuAnchor, navItems, "");
    void renderNavDropdown(desktopMenuAnchor, navItems, "");
  });

  bindHeaderBarEvents();
};

document.addEventListener("DOMContentLoaded", () => {
  if (document.body.dataset.homenav !== undefined) initHomeNav();
});
