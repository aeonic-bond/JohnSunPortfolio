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
const HEADER_DROPDOWN_CLASS = "cs-header-dropdown";
const HEADER_DROPDOWN_LIST_CLASS = "cs-header-dropdown-list";
const HEADER_DROPDOWN_OPEN_CLASS = "is-dropdown-open";
const HEADER_STICKY_ENTER_THRESHOLD_PX = 44;
const HEADER_STICKY_EXIT_THRESHOLD_PX = 36;
const HEADER_NAV_DATA_PATH = "/Live/main/nav.json";
const HEADER_CASE_STUDY_STATUS_PATHS = {
  torus: "/Live/torus/TorusContent.json",
  blueprint: "/Live/blueprint/BlueprintContent.json",
  hcustomizer: "/Live/hcustomizer/HCustomizerContent.json",
  tolley: "/Live/tolley/TolleyContent.json",
};
const HEADER_BACK_HREF = "/home";
const BACK_BUTTON_ICON_SRC = "/Assets/JSLogo.svg";
const HEADER_STICKY_TRANSITION_LOCK_MS = 1000;
const MAIN_SCROLL_RESTORE_FLAG_KEY = "live.main.restore_scroll";

let headerBarRafId = 0;
let headerBarEventsBound = false;
let headerNavItemsPromise = null;
const headerStatusByKindPromise = new Map();
let headerStickyTransitionLock = false;
let headerStickyTransitionLockTimeoutId = 0;
let headerLastScrollY = 0;
let headerUpwardScrollAccumulator = 0;

const normalizeHeaderItemStatus = (value) => {
  const status = String(value || "").trim().toLowerCase();
  if (status === "ready") return "ready";
  if (status === "draft") return "draft";
  return "";
};

const loadHeaderNavItems = async () => {
  if (!headerNavItemsPromise) {
    headerNavItemsPromise = fetch(HEADER_NAV_DATA_PATH, { cache: "no-store" })
      .then((response) => {
        if (!response.ok) throw new Error(`Failed to load ${HEADER_NAV_DATA_PATH}: ${response.status}`);
        return response.json();
      })
      .then((payload) => {
        const items = Array.isArray(payload) ? payload : payload?.items;
        return Array.isArray(items) ? items : [];
      })
      .catch((error) => {
        console.warn("[case-study-header] Failed to load nav items.", error);
        return [];
      });
  }
  return headerNavItemsPromise;
};

const findHeaderNavItem = (content = {}, navItems = []) => {
  const contentId = String(content?.id || "").trim().toLowerCase();
  if (!contentId) return null;
  return (
    navItems.find((item) => String(item?.id || "").trim().toLowerCase() === contentId) || null
  );
};

const loadHeaderStatusForKind = async (kind = "") => {
  const normalizedKind = String(kind || "").trim().toLowerCase();
  if (!normalizedKind) return "";
  if (headerStatusByKindPromise.has(normalizedKind)) {
    return headerStatusByKindPromise.get(normalizedKind);
  }

  const path = HEADER_CASE_STUDY_STATUS_PATHS[normalizedKind];
  if (!path) {
    headerStatusByKindPromise.set(normalizedKind, Promise.resolve(""));
    return "";
  }

  const promise = fetch(path, { cache: "no-store" })
    .then((response) => {
      if (!response.ok) throw new Error(`Failed to load ${path}`);
      return response.json();
    })
    .then((content) => normalizeHeaderItemStatus(content?.status))
    .catch((error) => {
      console.warn(`[case-study-header] Failed to load status for ${normalizedKind}.`, error);
      return "";
    });

  headerStatusByKindPromise.set(normalizedKind, promise);
  return promise;
};

const resolveHeaderDropdownItems = async (navItems = []) => {
  const results = await Promise.all(
    navItems.map(async (item) => {
      const href = String(item?.href || "").trim();
      if (!href) return null;

      const id = String(item?.id || "").trim().toLowerCase();
      const status = await loadHeaderStatusForKind(id);
      if (status === "draft") return null;
      return item;
    })
  );
  return results.filter(Boolean);
};

const closeCaseStudyDropdown = (headerBar) => {
  if (!(headerBar instanceof HTMLElement)) return;
  headerBar.classList.remove(HEADER_DROPDOWN_OPEN_CLASS);
  const menu = headerBar.querySelector(`.${HEADER_MENU_CLASS}`);
  const dropdown = headerBar.querySelector(`.${HEADER_DROPDOWN_CLASS}`);
  if (menu instanceof HTMLButtonElement) {
    menu.setAttribute("aria-expanded", "false");
  }
  if (dropdown instanceof HTMLElement) {
    dropdown.setAttribute("aria-hidden", "true");
  }
};

const toggleCaseStudyDropdown = (headerBar) => {
  if (!(headerBar instanceof HTMLElement)) return;
  const shouldOpen = !headerBar.classList.contains(HEADER_DROPDOWN_OPEN_CLASS);
  headerBar.classList.toggle(HEADER_DROPDOWN_OPEN_CLASS, shouldOpen);
  const menu = headerBar.querySelector(`.${HEADER_MENU_CLASS}`);
  const dropdown = headerBar.querySelector(`.${HEADER_DROPDOWN_CLASS}`);
  if (menu instanceof HTMLButtonElement) {
    menu.setAttribute("aria-expanded", shouldOpen ? "true" : "false");
  }
  if (dropdown instanceof HTMLElement) {
    dropdown.setAttribute("aria-hidden", shouldOpen ? "false" : "true");
  }
};

const createCaseStudyDropdown = () => {
  const dropdown = document.createElement("div");
  dropdown.className = HEADER_DROPDOWN_CLASS;
  dropdown.setAttribute("aria-hidden", "true");

  const navList = document.createElement("div");
  navList.className = `case-study-nav-list case-study-nav-list--dropdown ${HEADER_DROPDOWN_LIST_CLASS}`;
  navList.setAttribute("role", "menu");
  navList.setAttribute("aria-label", "Case studies");

  dropdown.append(navList);
  return dropdown;
};

const createCaseStudyDropdownNavItem = (item, activeId = "") => {
  const navItem = document.createElement("button");
  navItem.type = "button";
  navItem.className = "case-study-nav-item";
  navItem.setAttribute("role", "menuitem");

  const itemId = String(item?.id || "").trim().toLowerCase();
  if (itemId && itemId === activeId) navItem.classList.add("is-selected");

  const href = String(item?.href || "").trim();
  if (href) navItem.dataset.href = href;

  const title = String(item?.title || "").trim();
  const subtitle = String(item?.subtitle || "").trim();
  const iconSrc = String(item?.icon || "").trim();

  const icon = document.createElement("img");
  icon.className = "case-study-nav-icon";
  icon.alt = "";
  icon.setAttribute("aria-hidden", "true");
  if (iconSrc) {
    icon.src = iconSrc;
  } else {
    icon.hidden = true;
  }

  const textGroup = document.createElement("span");
  textGroup.className = "case-study-nav-texts-group";

  const titleEl = document.createElement("span");
  titleEl.className = "case-study-nav-title";
  titleEl.textContent = title;

  const subtitleEl = document.createElement("span");
  subtitleEl.className = "case-study-nav-subtitle";
  subtitleEl.textContent = subtitle;

  textGroup.append(titleEl, subtitleEl);
  navItem.append(icon, textGroup);

  navItem.addEventListener("click", () => {
    const nextHref = navItem.dataset.href || "";
    if (nextHref) {
      window.location.href = nextHref;
      return;
    }
    const headerBar = document.querySelector(`.${HEADER_BAR_CLASS}`);
    closeCaseStudyDropdown(headerBar);
  });

  return navItem;
};

const renderCaseStudyDropdown = async (headerBar, navItems = [], content = {}) => {
  if (!(headerBar instanceof HTMLElement)) return;
  const navList = headerBar.querySelector(`.${HEADER_DROPDOWN_LIST_CLASS}`);
  if (!(navList instanceof HTMLElement)) return;

  const filteredItems = await resolveHeaderDropdownItems(navItems);
  const activeId = String(content?.id || "").trim().toLowerCase();
  const elements = [];
  for (const item of filteredItems) {
    const title = String(item?.title || "").trim();
    if (!title) continue;
    elements.push(createCaseStudyDropdownNavItem(item, activeId));
  }
  navList.replaceChildren(...elements);
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
  menu.setAttribute("aria-label", "Open case study menu");
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

  const dropdown = createCaseStudyDropdown();

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

    const hasSameOriginReferrer = (() => {
      try {
        if (!document.referrer) return false;
        return new URL(document.referrer).origin === window.location.origin;
      } catch (error) {
        void error;
        return false;
      }
    })();

    if (hasSameOriginReferrer && window.history.length > 1) {
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
    toggleCaseStudyDropdown(headerBar);
  });

  document.addEventListener("click", (event) => {
    if (!(event.target instanceof Node)) return;
    if (headerBar.contains(event.target)) return;
    closeCaseStudyDropdown(headerBar);
  });

  window.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    closeCaseStudyDropdown(headerBar);
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

  void renderCaseStudyDropdown(headerBar, navItems, content);
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

  // Accumulate upward scroll distance; reset whenever the user scrolls down.
  if (delta < 0) {
    headerUpwardScrollAccumulator += Math.abs(delta);
  } else if (delta > 0) {
    headerUpwardScrollAccumulator = 0;
  }

  const isCompact = headerBar.classList.contains(HEADER_BAR_STICKY_CLASS);

  // Always revert to default near the top, regardless of lock or accumulator.
  if (currentScrollY <= HEADER_STICKY_EXIT_THRESHOLD_PX) {
    if (isCompact) headerBar.classList.remove(HEADER_BAR_STICKY_CLASS);
    headerUpwardScrollAccumulator = 0;
    return;
  }

  if (headerStickyTransitionLock) return;

  // Compact when scrolling down past the enter threshold.
  if (!isCompact && delta > 0 && currentScrollY >= HEADER_STICKY_ENTER_THRESHOLD_PX) {
    headerBar.classList.add(HEADER_BAR_STICKY_CLASS);
    lockHeaderStickyTransition();
    return;
  }

  // Revert to default visual only after scrolling up at least 100vh.
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
