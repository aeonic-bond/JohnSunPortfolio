const DESKTOP_ICON_SRC = "http://localhost:3845/assets/2370a2c22219829ffcd883885dd9e935e0ea2c7a.svg";
const MOBILE_ICON_SRC = "http://localhost:3845/assets/0253910616877c7d6156a2ffec07d136fe9deba6.svg";
const TORUS_ICON_SRC = "/Assets/TorusIcon.svg";
const BLUEPRINT_ICON_SRC = "/Assets/BlueprintIcon.svg";
const CUSTOMIZER_ICON_SRC = "/Assets/CustomizerIcon.svg";
const TOLLEY_ICON_SRC = "/Assets/TolleyIcon.svg";
const MAIN_SCROLL_STORAGE_KEY = "live.main.scroll_y";
const MAIN_SCROLL_RESTORE_FLAG_KEY = "live.main.restore_scroll";
const NAV_REVEAL_MOBILE_ENTER_PX = 8;
const NAV_REVEAL_MOBILE_EXIT_PX = 26;
const NAV_REVEAL_DESKTOP_ENTER_RATIO = 0.8;
const NAV_REVEAL_DESKTOP_EXIT_RATIO = 0.9;
const NAV_REVEAL_TRANSITION_LOCK_MS = 1000;
const MAIN_BODY_NAV_STICKY_CLASS = "is-nav-sticky";

let navRevealTransitionLock = false;
let navRevealTransitionLockTimeoutId = 0;
let navRevealRootRef = null;
let navRevealShowcaseRootRef = null;

const syncMainBodyNavStickyState = (isSticky) => {
  if (!(document.body instanceof HTMLBodyElement)) return;
  document.body.classList.toggle(MAIN_BODY_NAV_STICKY_CLASS, isSticky);
};

const saveMainScrollPosition = () => {
  try {
    window.sessionStorage?.setItem(MAIN_SCROLL_STORAGE_KEY, String(window.scrollY || 0));
  } catch (error) {
    void error;
  }
};

const restoreMainScrollPositionIfNeeded = () => {
  let shouldRestore = false;
  let scrollY = 0;
  try {
    shouldRestore = window.sessionStorage?.getItem(MAIN_SCROLL_RESTORE_FLAG_KEY) === "1";
    if (!shouldRestore) return;
    window.sessionStorage?.removeItem(MAIN_SCROLL_RESTORE_FLAG_KEY);
    scrollY = Number.parseFloat(window.sessionStorage?.getItem(MAIN_SCROLL_STORAGE_KEY) || "");
  } catch (error) {
    void error;
    return;
  }

  if (!Number.isFinite(scrollY)) return;
  const apply = () => {
    window.scrollTo({ top: scrollY, left: 0, behavior: "auto" });
  };
  apply();
  window.requestAnimationFrame(apply);
  window.setTimeout(apply, 200);
};

const bindMainScrollPersistence = () => {
  window.addEventListener("scroll", saveMainScrollPosition, { passive: true });
  window.addEventListener("pagehide", saveMainScrollPosition);
  window.addEventListener("beforeunload", saveMainScrollPosition);
};

const normalizeTargetId = (item = {}) => {
  if (typeof item?.targetId === "string" && item.targetId.trim()) {
    return item.targetId.trim();
  }
  const base = String(item?.id || item?.kind || item?.title || "").trim().toLowerCase();
  if (!base) return "";
  const slug = base.replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return slug ? `case-study-${slug}` : "";
};

const buildNavItems = (items = []) => {
  const normalized = items
    .map((item) => ({
      title: String(item?.title || item?.kind || "Untitled").trim() || "Untitled",
      text: String(item?.text || item?.subtitle || item?.category || item?.kind || "").trim(),
      icon: String(item?.icon || "").trim(),
      targetId: normalizeTargetId(item),
      href: String(item?.href || "").trim(),
      selected: item?.selected === true,
    }))
    .filter((item) => item.title);

  if (normalized.length > 0) return normalized;
  return [{ title: "Torus", text: "Architecture/CAD", targetId: "case-study-torus", href: "", selected: true }];
};

const createNavItem = ({ title, text, icon: iconOverride = "", targetId = "", href = "", selected = false } = {}) => {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "case-study-nav-item";
  if (selected) button.classList.add("is-selected");
  if (targetId) button.dataset.targetId = targetId;
  if (href) button.dataset.href = href;

  const icon = document.createElement("img");
  icon.className = "case-study-nav-icon";
  const isTorusItem = String(title || "").trim().toLowerCase() === "torus" || targetId === "case-study-torus";
  const isBlueprintItem =
    String(title || "").trim().toLowerCase() === "blueprint" || targetId === "case-study-blueprint";
  const isCustomizerItem =
    String(title || "").trim().toLowerCase() === "customizer" || targetId === "case-study-hcustomizer";
  const isTolleyItem = String(title || "").trim().toLowerCase() === "tolley" || targetId === "case-study-tolley";
  let desktopIconSrc = DESKTOP_ICON_SRC;
  let mobileIconSrc = MOBILE_ICON_SRC;
  if (iconOverride) {
    desktopIconSrc = iconOverride;
    mobileIconSrc = iconOverride;
  } else if (isTorusItem) {
    desktopIconSrc = TORUS_ICON_SRC;
    mobileIconSrc = TORUS_ICON_SRC;
  } else if (isBlueprintItem) {
    desktopIconSrc = BLUEPRINT_ICON_SRC;
    mobileIconSrc = BLUEPRINT_ICON_SRC;
  } else if (isCustomizerItem) {
    desktopIconSrc = CUSTOMIZER_ICON_SRC;
    mobileIconSrc = CUSTOMIZER_ICON_SRC;
  } else if (isTolleyItem) {
    desktopIconSrc = TOLLEY_ICON_SRC;
    mobileIconSrc = TOLLEY_ICON_SRC;
  }
  icon.src = desktopIconSrc;
  icon.alt = "";
  icon.setAttribute("aria-hidden", "true");
  icon.dataset.desktopSrc = desktopIconSrc;
  icon.dataset.mobileSrc = mobileIconSrc;

  const textWrap = document.createElement("span");
  textWrap.className = "case-study-nav-texts-group";

  const titleEl = document.createElement("span");
  titleEl.className = "case-study-nav-title";
  titleEl.textContent = title;

  const subtitleEl = document.createElement("span");
  subtitleEl.className = "case-study-nav-subtitle";
  subtitleEl.textContent = text;

  textWrap.append(titleEl, subtitleEl);
  button.append(icon, textWrap);
  return button;
};

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const isElementVisibleInViewport = (element) => {
  if (!(element instanceof HTMLElement)) return false;
  const rect = element.getBoundingClientRect();
  return rect.bottom > 0 && rect.top < window.innerHeight && rect.right > 0 && rect.left < window.innerWidth;
};

const centerNavActiveID = (
  navRoot,
  activeItem,
  { desktop = false, behavior = "auto", viewportElement = null } = {},
) => {
  if (!(navRoot instanceof HTMLElement) || !(activeItem instanceof HTMLElement)) return;
  if (viewportElement instanceof HTMLElement && !isElementVisibleInViewport(viewportElement)) return;

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const resolvedBehavior = prefersReducedMotion ? "auto" : behavior;
  const itemRect = activeItem.getBoundingClientRect();

  if (desktop) {
    const targetMidpointY = window.innerHeight * 0.5;
    const itemMidpointY = itemRect.top + itemRect.height * 0.5;
    const deltaY = itemMidpointY - targetMidpointY;
    const maxScrollTop = Math.max(0, navRoot.scrollHeight - navRoot.clientHeight);
    const nextScrollTop = clamp(navRoot.scrollTop + deltaY, 0, maxScrollTop);

    navRoot.scrollTo({
      top: nextScrollTop,
      behavior: resolvedBehavior,
    });
    return;
  }

  const navRect = navRoot.getBoundingClientRect();
  const targetMidpointX = navRect.left + navRect.width * 0.5;
  const itemMidpointX = itemRect.left + itemRect.width * 0.5;
  const deltaX = itemMidpointX - targetMidpointX;
  const maxScrollLeft = Math.max(0, navRoot.scrollWidth - navRoot.clientWidth);
  const nextScrollLeft = clamp(navRoot.scrollLeft + deltaX, 0, maxScrollLeft);

  navRoot.scrollTo({
    left: nextScrollLeft,
    behavior: resolvedBehavior,
  });
};

const setActiveNavItem = (
  root,
  activeID,
  { desktop = false, behavior = "auto", viewportElement = null, selectorEl = null } = {},
) => {
  const items = root.querySelectorAll(".case-study-nav-item");
  let activeItem = null;
  for (const item of items) {
    if (!(item instanceof HTMLButtonElement)) continue;
    const isActive = item.dataset.targetId === activeID;
    item.classList.toggle("is-selected", isActive);
    item.setAttribute("aria-selected", isActive ? "true" : "false");
    if (isActive) activeItem = item;
  }

  if (activeItem) {
    centerNavActiveID(root, activeItem, { desktop, behavior, viewportElement });
  }
  updateSelectorWidth(activeItem, selectorEl);
};

const updateSelectorWidth = (activeItem, selectorEl) => {
  if (!(selectorEl instanceof HTMLElement)) return;
  if (!(activeItem instanceof HTMLElement)) {
    selectorEl.style.width = "0px";
    return;
  }
  selectorEl.style.width = `${Math.round(activeItem.getBoundingClientRect().width)}px`;
};

const updateNavIconsForViewport = (root, mediaQuery) => {
  const icons = root.querySelectorAll(".case-study-nav-icon");
  for (const icon of icons) {
    if (!(icon instanceof HTMLImageElement)) continue;
    icon.src = mediaQuery.matches ? icon.dataset.desktopSrc || DESKTOP_ICON_SRC : icon.dataset.mobileSrc || MOBILE_ICON_SRC;
  }
};

const clickNavUpdateActiveID = (navItem) => {
  if (!(navItem instanceof HTMLElement)) return;

  const targetId = navItem.dataset.targetId;
  if (!targetId) return;

  const target = document.getElementById(targetId);
  if (!(target instanceof HTMLElement)) return;

  if (typeof window.disableScrollObserveActiveID === "function") {
    window.disableScrollObserveActiveID();
  }

  if (typeof window.setActiveID === "function") {
    window.setActiveID(targetId);
  }

  let didReenable = false;
  const reenableObserve = () => {
    if (didReenable) return;
    didReenable = true;
    if (typeof window.enableScrollObserveActiveID === "function") {
      window.enableScrollObserveActiveID();
    }
  };

  target.scrollIntoView({ behavior: "smooth", block: "center" });
  const scroller = document.scrollingElement || document.documentElement;
  const maxWaitMs = 4000;
  const stableFrameTarget = 6;
  const positionTolerancePx = 1;
  const startAt = performance.now();
  let stableFrames = 0;
  let lastTop = scroller.scrollTop;
  let lastLeft = scroller.scrollLeft;

  const waitForScrollSettle = () => {
    if (didReenable) return;

    const nextTop = scroller.scrollTop;
    const nextLeft = scroller.scrollLeft;
    const deltaTop = Math.abs(nextTop - lastTop);
    const deltaLeft = Math.abs(nextLeft - lastLeft);
    const moved = deltaTop > positionTolerancePx || deltaLeft > positionTolerancePx;

    if (moved) {
      stableFrames = 0;
      lastTop = nextTop;
      lastLeft = nextLeft;
    } else {
      stableFrames += 1;
    }

    const timedOut = performance.now() - startAt >= maxWaitMs;
    if (stableFrames >= stableFrameTarget || timedOut) {
      reenableObserve();
      return;
    }

    window.requestAnimationFrame(waitForScrollSettle);
  };

  window.requestAnimationFrame(waitForScrollSettle);
};

const loadNavItems = async () => {
  try {
    const response = await fetch("./nav.json", { cache: "no-store" });
    if (!response.ok) throw new Error(`Failed to load nav.json: ${response.status}`);
    const payload = await response.json();
    const items = Array.isArray(payload?.items) ? payload.items : [];
    if (items.length > 0) return items;
  } catch (error) {
    console.warn("[case-study-nav] Falling back to case study data.", error);
  }

  if (typeof window.LiveCaseStudyData?.loadCaseStudies === "function") {
    return window.LiveCaseStudyData.loadCaseStudies();
  }
  return window.LiveCaseStudyData?.items || [];
};

const navDivReveal = (navRoot, showcaseRoot) => {
  if (!(navRoot instanceof HTMLElement) || !(showcaseRoot instanceof HTMLElement)) return;
  navRevealRootRef = navRoot;
  navRevealShowcaseRootRef = showcaseRoot;
  const currentlyVisible = navRoot.classList.contains("is-visible");
  syncMainBodyNavStickyState(currentlyVisible);
  const isDesktop = window.matchMedia("(min-width: 1024px)").matches;
  let shouldShow = false;

  if (isDesktop) {
    const showcaseTop = showcaseRoot.getBoundingClientRect().top;
    const enterThreshold = window.innerHeight * NAV_REVEAL_DESKTOP_ENTER_RATIO;
    const exitThreshold = window.innerHeight * NAV_REVEAL_DESKTOP_EXIT_RATIO;
    shouldShow = currentlyVisible ? showcaseTop <= exitThreshold : showcaseTop <= enterThreshold;
  } else {
    const navTop = navRoot.getBoundingClientRect().top;
    shouldShow = currentlyVisible ? navTop <= NAV_REVEAL_MOBILE_EXIT_PX : navTop <= NAV_REVEAL_MOBILE_ENTER_PX;
  }

  if (shouldShow === currentlyVisible) return;
  if (navRevealTransitionLock) return;

  navRoot.classList.toggle("is-visible", shouldShow);
  syncMainBodyNavStickyState(shouldShow);
  navRevealTransitionLock = true;
  if (navRevealTransitionLockTimeoutId) {
    window.clearTimeout(navRevealTransitionLockTimeoutId);
  }
  navRevealTransitionLockTimeoutId = window.setTimeout(() => {
    navRevealTransitionLock = false;
    navRevealTransitionLockTimeoutId = 0;
    if (
      navRevealRootRef instanceof HTMLElement &&
      navRevealShowcaseRootRef instanceof HTMLElement
    ) {
      window.requestAnimationFrame(() =>
        navDivReveal(navRevealRootRef, navRevealShowcaseRootRef)
      );
    }
  }, NAV_REVEAL_TRANSITION_LOCK_MS);
};

const initCaseStudyNav = async () => {
  const navRoot = document.querySelector(".case-study-nav-div");
  if (!(navRoot instanceof HTMLElement)) return;
  const showcaseRoot = document.querySelector(".case-study-showcase");
  if (!(showcaseRoot instanceof HTMLElement)) return;

  const desktopQuery = window.matchMedia("(min-width: 1024px)");
  const items = await loadNavItems();

  const navList = document.createElement("div");
  navList.className = "case-study-nav-list";
  navList.setAttribute("role", "tablist");
  navList.setAttribute("aria-label", "Case Studies");
  const selector = document.createElement("div");
  selector.className = "selector";
  selector.setAttribute("aria-hidden", "true");

  const navItems = buildNavItems(items);
  for (const [index, item] of navItems.entries()) {
    const navItem = createNavItem({
      ...item,
      selected: item?.selected === true || (item?.selected === false ? false : index === 0),
    });
    navItem.setAttribute("role", "tab");
    navItem.setAttribute("aria-selected", navItem.classList.contains("is-selected") ? "true" : "false");

    navItem.addEventListener("click", () => {
      clickNavUpdateActiveID(navItem);
    });

    navList.append(navItem);
  }

  navRoot.replaceChildren(selector, navList);
  updateNavIconsForViewport(navList, desktopQuery);
  navDivReveal(navRoot, showcaseRoot);

  const scheduleNavDivReveal = () => {
    window.requestAnimationFrame(() => navDivReveal(navRoot, showcaseRoot));
  };
  window.addEventListener("scroll", scheduleNavDivReveal, { passive: true });
  window.addEventListener("resize", scheduleNavDivReveal);

  window.syncCaseStudyNavActiveID = (nextId, behavior = "smooth") => {
    if (typeof nextId !== "string" || !nextId) return;
    setActiveNavItem(navList, nextId, {
      desktop: desktopQuery.matches,
      behavior,
      viewportElement: navRoot,
      selectorEl: selector,
    });
  };

  const initialActive = window.activeID || "";
  if (initialActive) {
    window.syncCaseStudyNavActiveID(initialActive, "auto");
  }

  if (typeof desktopQuery.addEventListener === "function") {
    desktopQuery.addEventListener("change", () => {
      updateNavIconsForViewport(navList, desktopQuery);
      const selected = navList.querySelector(".case-study-nav-item.is-selected");
      if (selected instanceof HTMLElement) {
        centerNavActiveID(navList, selected, {
          desktop: desktopQuery.matches,
          behavior: "auto",
          viewportElement: navRoot,
        });
        updateSelectorWidth(selected, selector);
      }
    });
  } else if (typeof desktopQuery.addListener === "function") {
    desktopQuery.addListener(() => {
      updateNavIconsForViewport(navList, desktopQuery);
      const selected = navList.querySelector(".case-study-nav-item.is-selected");
      if (selected instanceof HTMLElement) {
        centerNavActiveID(navList, selected, {
          desktop: desktopQuery.matches,
          behavior: "auto",
          viewportElement: navRoot,
        });
        updateSelectorWidth(selected, selector);
      }
    });
  }

  window.addEventListener("resize", () => {
    const selected = navList.querySelector(".case-study-nav-item.is-selected");
    if (selected instanceof HTMLElement) {
      centerNavActiveID(navList, selected, {
        desktop: desktopQuery.matches,
        behavior: "auto",
        viewportElement: navRoot,
      });
      updateSelectorWidth(selected, selector);
    }
  });

  if (window.visualViewport) {
    const recenterSelectedNavItem = () => {
      const selected = navList.querySelector(".case-study-nav-item.is-selected");
      if (!(selected instanceof HTMLElement)) return;
      centerNavActiveID(navList, selected, {
        desktop: desktopQuery.matches,
        behavior: "auto",
        viewportElement: navRoot,
      });
      updateSelectorWidth(selected, selector);
    };
    window.visualViewport.addEventListener("resize", recenterSelectedNavItem);
    window.visualViewport.addEventListener("scroll", recenterSelectedNavItem);
  }
};

const initIntroScrollIndicator = () => {
  const trigger = document.querySelector(".intro-scroll-indicator");
  if (!(trigger instanceof HTMLButtonElement)) return;

  trigger.addEventListener("click", () => {
    const target = document.querySelector(".case-study-showcase");
    if (!(target instanceof HTMLElement)) return;

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    target.scrollIntoView({
      behavior: prefersReducedMotion ? "auto" : "smooth",
      block: "start",
    });
  });
};

if (document.readyState === "loading") {
  document.addEventListener(
    "DOMContentLoaded",
    () => {
      restoreMainScrollPositionIfNeeded();
      bindMainScrollPersistence();
      initCaseStudyNav();
      initIntroScrollIndicator();
    },
    { once: true }
  );
} else {
  restoreMainScrollPositionIfNeeded();
  bindMainScrollPersistence();
  initCaseStudyNav();
  initIntroScrollIndicator();
}
