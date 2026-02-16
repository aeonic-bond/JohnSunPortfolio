const DESKTOP_ICON_SRC = "http://localhost:3845/assets/2370a2c22219829ffcd883885dd9e935e0ea2c7a.svg";
const MOBILE_ICON_SRC = "http://localhost:3845/assets/0253910616877c7d6156a2ffec07d136fe9deba6.svg";

const buildNavItems = (items = []) => {
  const normalized = items
    .map((item) => ({
      title: String(item?.title || item?.kind || "Untitled").trim() || "Untitled",
      text: String(item?.text || item?.subtitle || item?.category || item?.kind || "").trim(),
    }))
    .filter((item) => item.title);

  if (normalized.length > 0) return normalized;
  return [{ title: "Torus", text: "Architecture/CAD" }];
};

const createNavItem = ({ title, text, selected = false } = {}) => {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "case-study-nav-item";
  if (selected) button.classList.add("is-selected");

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
  const navRoot = document.querySelector(".case-study-nav");
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
      selected: item?.selected === true || (item?.selected == null && index === 0),
    });
    navItem.setAttribute("role", "tab");
    navItem.setAttribute("aria-selected", navItem.classList.contains("is-selected") ? "true" : "false");
    navList.append(navItem);
  }

  navRoot.replaceChildren(navList);
  updateNavIconsForViewport(navRoot, desktopQuery);

  if (typeof desktopQuery.addEventListener === "function") {
    desktopQuery.addEventListener("change", () => updateNavIconsForViewport(navRoot, desktopQuery));
  } else if (typeof desktopQuery.addListener === "function") {
    desktopQuery.addListener(() => updateNavIconsForViewport(navRoot, desktopQuery));
  }
};

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initCaseStudyNav, { once: true });
} else {
  initCaseStudyNav();
}
