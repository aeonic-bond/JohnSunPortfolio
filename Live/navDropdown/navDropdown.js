const NAV_DATA_PATH = "/Live/main/nav.json";
const NAV_STATUS_PATHS = {
  torus: "/Live/torus/TorusContent.json",
  blueprint: "/Live/blueprint/BlueprintContent.json",
  hcustomizer: "/Live/hcustomizer/HCustomizerContent.json",
  tolley: "/Live/tolley/TolleyContent.json",
};
const NAV_DROPDOWN_CLASS = "cs-header-dropdown";
const NAV_DROPDOWN_LIST_CLASS = "cs-header-dropdown-list";
const NAV_DROPDOWN_ANCHOR_CLASS = "cs-header-menu-anchor";
const NAV_DROPDOWN_OPEN_CLASS = "is-dropdown-open";
const NAV_DROPDOWN_VARIANT_ATTR = "data-nav-variant";
const NAV_DROPDOWN_VARIANT_DEFAULT = "default";
const NAV_DROPDOWN_VARIANT_CASE_STUDY_ONLY = "caseStudyOnly";

const NAV_DROPDOWN_STATIC_ITEMS = [
  { title: "Contact", href: "#contact", icon: "/Assets/Contact.svg" },
  { title: "Resume", href: "/Assets/John Sun Resume - 2026.pdf", icon: "/Assets/Resume.svg", target: "_blank" },
];

let navItemsPromise = null;
const navStatusByKindMap = new Map();

const normalizeNavItemStatus = (value) => {
  const status = String(value || "").trim().toLowerCase();
  if (status === "ready") return "ready";
  if (status === "draft") return "draft";
  return "";
};

const loadNavItems = async () => {
  if (!navItemsPromise) {
    navItemsPromise = fetch(NAV_DATA_PATH, { cache: "no-store" })
      .then((r) => {
        if (!r.ok) throw new Error(`Failed to load ${NAV_DATA_PATH}: ${r.status}`);
        return r.json();
      })
      .then((payload) => {
        const items = Array.isArray(payload) ? payload : payload?.items;
        return Array.isArray(items) ? items : [];
      })
      .catch((err) => {
        console.warn("[nav-dropdown] Failed to load nav items.", err);
        return [];
      });
  }
  return navItemsPromise;
};

const loadNavStatusForKind = async (kind = "") => {
  const key = String(kind || "").trim().toLowerCase();
  if (!key) return "";
  if (navStatusByKindMap.has(key)) return navStatusByKindMap.get(key);

  const path = NAV_STATUS_PATHS[key];
  if (!path) {
    navStatusByKindMap.set(key, Promise.resolve(""));
    return "";
  }

  const promise = fetch(path, { cache: "no-store" })
    .then((r) => {
      if (!r.ok) throw new Error(`Failed to load ${path}`);
      return r.json();
    })
    .then((content) => normalizeNavItemStatus(content?.status))
    .catch((err) => {
      console.warn(`[nav-dropdown] Failed to load status for ${key}.`, err);
      return "";
    });

  navStatusByKindMap.set(key, promise);
  return promise;
};

const resolveNavDropdownItems = async (navItems = []) => {
  const results = await Promise.all(
    navItems.map(async (item) => {
      const href = String(item?.href || "").trim();
      if (!href) return null;
      const id = String(item?.id || "").trim().toLowerCase();
      const status = await loadNavStatusForKind(id);
      if (status === "draft") return null;
      return item;
    })
  );
  return results.filter(Boolean);
};

const closeNavDropdown = (anchor) => {
  if (!(anchor instanceof HTMLElement)) return;
  anchor.classList.remove(NAV_DROPDOWN_OPEN_CLASS);
  const menu = anchor.querySelector("button[aria-haspopup]");
  const dropdown = anchor.querySelector(`.${NAV_DROPDOWN_CLASS}`);
  if (menu instanceof HTMLButtonElement) menu.setAttribute("aria-expanded", "false");
  if (dropdown instanceof HTMLElement) dropdown.setAttribute("aria-hidden", "true");
};

const toggleNavDropdown = (anchor) => {
  if (!(anchor instanceof HTMLElement)) return;
  const shouldOpen = !anchor.classList.contains(NAV_DROPDOWN_OPEN_CLASS);
  anchor.classList.toggle(NAV_DROPDOWN_OPEN_CLASS, shouldOpen);
  const menu = anchor.querySelector("button[aria-haspopup]");
  const dropdown = anchor.querySelector(`.${NAV_DROPDOWN_CLASS}`);
  if (menu instanceof HTMLButtonElement) menu.setAttribute("aria-expanded", shouldOpen ? "true" : "false");
  if (dropdown instanceof HTMLElement) dropdown.setAttribute("aria-hidden", shouldOpen ? "false" : "true");
};

const createNavDropdownItem = (item, activeId = "") => {
  const navItem = document.createElement("button");
  navItem.type = "button";
  navItem.className = "case-study-nav-item";
  navItem.setAttribute("role", "menuitem");

  const itemId = String(item?.id || "").trim().toLowerCase();
  if (itemId && itemId === activeId) navItem.classList.add("is-selected");

  const href = String(item?.href || "").trim();
  const target = String(item?.target || "").trim();
  if (href) navItem.dataset.href = href;
  if (target) navItem.dataset.target = target;

  const title = String(item?.title || "").trim();
  const subtitle = String(item?.subtitle || "").trim();
  const iconSrc = String(item?.icon || "").trim();

  const icon = document.createElement("span");
  icon.className = "case-study-nav-icon";
  icon.setAttribute("aria-hidden", "true");
  if (iconSrc) {
    icon.style.setProperty("mask-image", `url("${iconSrc}")`);
    icon.style.setProperty("-webkit-mask-image", `url("${iconSrc}")`);
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
      if (navItem.dataset.target === "_blank") {
        window.open(nextHref, "_blank", "noopener noreferrer");
      } else {
        window.location.href = nextHref;
      }
      return;
    }
    const anchor = navItem.closest(`.${NAV_DROPDOWN_ANCHOR_CLASS}`);
    closeNavDropdown(anchor);
  });

  return navItem;
};

const createNavDropdown = (variant = NAV_DROPDOWN_VARIANT_CASE_STUDY_ONLY) => {
  const dropdown = document.createElement("div");
  dropdown.className = NAV_DROPDOWN_CLASS;
  dropdown.setAttribute("aria-hidden", "true");
  dropdown.setAttribute(NAV_DROPDOWN_VARIANT_ATTR, variant);

  const navList = document.createElement("div");
  navList.className = `case-study-nav-list case-study-nav-list--dropdown ${NAV_DROPDOWN_LIST_CLASS}`;
  navList.setAttribute("role", "menu");
  navList.setAttribute("aria-label", "Case studies");

  dropdown.append(navList);
  return dropdown;
};

const renderNavDropdown = async (anchor, navItems = [], activeId = "") => {
  if (!(anchor instanceof HTMLElement)) return;
  const dropdown = anchor.querySelector(`.${NAV_DROPDOWN_CLASS}`);
  const navList = anchor.querySelector(`.${NAV_DROPDOWN_LIST_CLASS}`);
  if (!(navList instanceof HTMLElement)) return;

  const variant = dropdown?.getAttribute(NAV_DROPDOWN_VARIANT_ATTR);
  const elements = [];

  const filteredItems = await resolveNavDropdownItems(navItems);
  for (const item of filteredItems) {
    const title = String(item?.title || "").trim();
    if (!title) continue;
    elements.push(createNavDropdownItem(item, activeId));
  }

  if (variant === NAV_DROPDOWN_VARIANT_DEFAULT) {
    for (const item of NAV_DROPDOWN_STATIC_ITEMS) {
      elements.push(createNavDropdownItem(item, activeId));
    }
  }

  navList.replaceChildren(...elements);
};
