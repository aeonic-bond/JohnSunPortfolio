const DESKTOP_ICON_SRC = "http://localhost:3845/assets/2370a2c22219829ffcd883885dd9e935e0ea2c7a.svg";
const MOBILE_ICON_SRC = "http://localhost:3845/assets/0253910616877c7d6156a2ffec07d136fe9deba6.svg";

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
      targetId: normalizeTargetId(item),
      href: String(item?.href || "").trim(),
      selected: item?.selected === true,
    }))
    .filter((item) => item.title);

  if (normalized.length > 0) return normalized;
  return [{ title: "Torus", text: "Architecture/CAD", targetId: "case-study-torus", href: "", selected: true }];
};

const createNavItem = ({ title, text, targetId = "", href = "", selected = false } = {}) => {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "case-study-nav-item";
  if (selected) button.classList.add("is-selected");
  if (targetId) button.dataset.targetId = targetId;
  if (href) button.dataset.href = href;

  const icon = document.createElement("img");
  icon.className = "case-study-nav-icon";
  icon.src = DESKTOP_ICON_SRC;
  icon.alt = "";
  icon.setAttribute("aria-hidden", "true");
  icon.dataset.desktopSrc = DESKTOP_ICON_SRC;
  icon.dataset.mobileSrc = MOBILE_ICON_SRC;

  const textWrap = document.createElement("span");
  textWrap.className = "case-study-text-all";

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

const centerActiveNavItem = (navRoot, activeItem, { desktop = false, behavior = "auto" } = {}) => {
  if (!(navRoot instanceof HTMLElement) || !(activeItem instanceof HTMLElement)) return;

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

  const targetMidpointX = window.innerWidth * 0.5;
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
  activeCardDivID,
  { desktop = false, behavior = "auto" } = {},
) => {
  const items = root.querySelectorAll(".case-study-nav-item");
  let activeItem = null;
  for (const item of items) {
    if (!(item instanceof HTMLButtonElement)) continue;
    const isActive = item.dataset.targetId === activeCardDivID;
    item.classList.toggle("is-selected", isActive);
    item.setAttribute("aria-selected", isActive ? "true" : "false");
    if (isActive) activeItem = item;
  }

  if (activeItem) {
    centerActiveNavItem(root, activeItem, { desktop, behavior });
  }
};

const updateNavIconsForViewport = (root, mediaQuery) => {
  const icons = root.querySelectorAll(".case-study-nav-icon");
  for (const icon of icons) {
    if (!(icon instanceof HTMLImageElement)) continue;
    icon.src = mediaQuery.matches ? icon.dataset.desktopSrc || DESKTOP_ICON_SRC : icon.dataset.mobileSrc || MOBILE_ICON_SRC;
  }
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

const initCaseStudyNav = async () => {
  const navRoot = document.querySelector(".case-study-nav-div");
  if (!(navRoot instanceof HTMLElement)) return;

  const desktopQuery = window.matchMedia("(min-width: 1024px)");
  const items = await loadNavItems();

  const navList = document.createElement("div");
  navList.className = "case-study-nav-list";
  navList.setAttribute("role", "tablist");
  navList.setAttribute("aria-label", "Case Studies");

  const navItems = buildNavItems(items);
  for (const [index, item] of navItems.entries()) {
    const navItem = createNavItem({
      ...item,
      selected: item?.selected === true || (item?.selected === false ? false : index === 0),
    });
    navItem.setAttribute("role", "tab");
    navItem.setAttribute("aria-selected", navItem.classList.contains("is-selected") ? "true" : "false");

    navItem.addEventListener("click", () => {
      const targetId = navItem.dataset.targetId;
      if (targetId) {
        const target = document.getElementById(targetId);
        if (target instanceof HTMLElement) {
          target.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      } else if (navItem.dataset.href) {
        window.location.href = navItem.dataset.href;
      }
    });

    navList.append(navItem);
  }

  navRoot.replaceChildren(navList);
  updateNavIconsForViewport(navList, desktopQuery);

  const initialActive = window.activeCardDivID || "";
  if (initialActive) {
    setActiveNavItem(navList, initialActive, {
      desktop: desktopQuery.matches,
      behavior: "auto",
    });
  }

  window.addEventListener("case-study-active-change", (event) => {
    const nextId = event?.detail?.activeCardDivID;
    if (typeof nextId !== "string" || !nextId) return;
    setActiveNavItem(navList, nextId, {
      desktop: desktopQuery.matches,
      behavior: "smooth",
    });
  });

  if (typeof desktopQuery.addEventListener === "function") {
    desktopQuery.addEventListener("change", () => {
      updateNavIconsForViewport(navList, desktopQuery);
      const selected = navList.querySelector(".case-study-nav-item.is-selected");
      if (selected instanceof HTMLElement) {
        centerActiveNavItem(navList, selected, {
          desktop: desktopQuery.matches,
          behavior: "auto",
        });
      }
    });
  } else if (typeof desktopQuery.addListener === "function") {
    desktopQuery.addListener(() => {
      updateNavIconsForViewport(navList, desktopQuery);
      const selected = navList.querySelector(".case-study-nav-item.is-selected");
      if (selected instanceof HTMLElement) {
        centerActiveNavItem(navList, selected, {
          desktop: desktopQuery.matches,
          behavior: "auto",
        });
      }
    });
  }

  window.addEventListener("resize", () => {
    const selected = navList.querySelector(".case-study-nav-item.is-selected");
    if (selected instanceof HTMLElement) {
      centerActiveNavItem(navList, selected, {
        desktop: desktopQuery.matches,
        behavior: "auto",
      });
    }
  });
};

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initCaseStudyNav, { once: true });
} else {
  initCaseStudyNav();
}
