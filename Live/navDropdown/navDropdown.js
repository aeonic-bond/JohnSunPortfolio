const NAV_DATA_PATH = "/Live/main/nav.json";
const NAV_STATUS_PATHS = {
  torus: "/Live/torus/TorusContent.json",
  blueprint: "/Live/blueprint/BlueprintContent.json",
  hcustomizer: "/Live/hcustomizer/HCustomizerContent.json",
  chatbot: "/Live/chatbot/ChatbotContent.json",
};
const NAV_DROPDOWN_CLASS = "cs-header-dropdown";
const NAV_DROPDOWN_LIST_CLASS = "dropdown-list";
const NAV_DROPDOWN_ANCHOR_CLASS = "cs-header-menu-anchor";
const NAV_DROPDOWN_OPEN_CLASS = "is-dropdown-open";
const NAV_DROPDOWN_VARIANT_ATTR = "data-nav-variant";
const NAV_DROPDOWN_VARIANT_DEFAULT = "default";
const NAV_DROPDOWN_VARIANT_CASE_STUDY_ONLY = "caseStudyOnly";
const NAV_DROPDOWN_VARIANT_CONTACT = "contact";
const NAV_DROPDOWN_PANEL_ATTR = "data-active-panel";
const NAV_DROPDOWN_PANEL_MAIN = "main";
const NAV_DROPDOWN_PANEL_CONTACT = "contact";
const NAV_DROPDOWN_CONTACT_PANEL_CLASS = "dropdown-contact-panel";

const NAV_DROPDOWN_STATIC_ITEMS = [
  { title: "Contact", panel: NAV_DROPDOWN_PANEL_CONTACT, icon: "/Assets/Contact.svg" },
  { title: "Resume", href: "/Assets/John Sun Resume - 2026.pdf", icon: "/Assets/Resume.svg", target: "_blank" },
];

const NAV_CONTACT_ITEMS = [
  { label: "Email", value: "jsunzhe@gmail.com" },
  { label: "LinkedIn", value: "linkedin.com/in/john-sun1" },
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
  if (dropdown instanceof HTMLElement) {
    dropdown.setAttribute("aria-hidden", "true");
    if (dropdown.hasAttribute(NAV_DROPDOWN_PANEL_ATTR)) {
      dropdown.setAttribute(NAV_DROPDOWN_PANEL_ATTR, NAV_DROPDOWN_PANEL_MAIN);
    }
  }
};

let dropdownOpenScrollY = null;

window.addEventListener("scroll", () => {
  const openAnchors = document.querySelectorAll(`.${NAV_DROPDOWN_ANCHOR_CLASS}.${NAV_DROPDOWN_OPEN_CLASS}`);
  if (openAnchors.length === 0) { dropdownOpenScrollY = null; return; }
  if (dropdownOpenScrollY === null) return;
  if (Math.abs(window.scrollY - dropdownOpenScrollY) >= 24) {
    openAnchors.forEach(closeNavDropdown);
    dropdownOpenScrollY = null;
  }
}, { passive: true });

const toggleNavDropdown = (anchor) => {
  if (!(anchor instanceof HTMLElement)) return;
  const shouldOpen = !anchor.classList.contains(NAV_DROPDOWN_OPEN_CLASS);
  if (shouldOpen) {
    document.querySelectorAll(`.${NAV_DROPDOWN_ANCHOR_CLASS}.${NAV_DROPDOWN_OPEN_CLASS}`).forEach((other) => {
      if (other !== anchor) closeNavDropdown(other);
    });
    dropdownOpenScrollY = window.scrollY;
  }
  anchor.classList.toggle(NAV_DROPDOWN_OPEN_CLASS, shouldOpen);
  const menu = anchor.querySelector("button[aria-haspopup]");
  const dropdown = anchor.querySelector(`.${NAV_DROPDOWN_CLASS}`);
  if (menu instanceof HTMLButtonElement) menu.setAttribute("aria-expanded", shouldOpen ? "true" : "false");
  if (dropdown instanceof HTMLElement) dropdown.setAttribute("aria-hidden", shouldOpen ? "false" : "true");
};

const createNavDropdownItem = (item, activeId = "") => {
  const navItem = document.createElement("button");
  navItem.type = "button";
  navItem.className = "dropdown-item";
  navItem.setAttribute("role", "menuitem");

  const itemId = String(item?.id || "").trim().toLowerCase();
  if (itemId && itemId === activeId) navItem.classList.add("is-selected");

  const href = String(item?.href || "").trim();
  const target = String(item?.target || "").trim();
  const panel = String(item?.panel || "").trim();
  if (href) navItem.dataset.href = href;
  if (target) navItem.dataset.target = target;
  if (panel) navItem.dataset.panel = panel;

  const title = String(item?.title || "").trim();
  const subtitle = String(item?.subtitle || "").trim();
  const iconSrc = String(item?.icon || "").trim();

  const icon = document.createElement("span");
  icon.className = "dropdown-item-icon";
  icon.setAttribute("aria-hidden", "true");
  if (iconSrc) {
    icon.style.setProperty("mask-image", `url("${iconSrc}")`);
    icon.style.setProperty("-webkit-mask-image", `url("${iconSrc}")`);
  } else {
    icon.hidden = true;
  }

  const textGroup = document.createElement("span");
  textGroup.className = "dropdown-item-group";

  const titleEl = document.createElement("span");
  titleEl.className = "dropdown-item-title";
  titleEl.textContent = title;

  const subtitleEl = document.createElement("span");
  subtitleEl.className = "dropdown-item-subtitle";
  subtitleEl.textContent = subtitle;

  textGroup.append(titleEl, subtitleEl);
  navItem.append(icon, textGroup);

  navItem.addEventListener("click", () => {
    if (navItem.dataset.panel) {
      const dropdown = navItem.closest(`.${NAV_DROPDOWN_CLASS}`);
      if (dropdown instanceof HTMLElement) {
        dropdown.setAttribute(NAV_DROPDOWN_PANEL_ATTR, navItem.dataset.panel);
      }
      return;
    }
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

const createContactDropdownItem = ({ label, value }) => {
  const item = document.createElement("div");
  item.className = "dropdown-contact-item";

  const info = document.createElement("div");
  info.className = "dropdown-contact-info";

  const labelEl = document.createElement("span");
  labelEl.className = "dropdown-contact-label";
  labelEl.textContent = label;

  const valueEl = document.createElement("span");
  valueEl.className = "dropdown-contact-value";
  valueEl.textContent = value;

  info.append(labelEl, valueEl);

  const copyBtn = document.createElement("button");
  copyBtn.type = "button";
  copyBtn.className = "dropdown-contact-copy";
  copyBtn.textContent = "Copy";

  copyBtn.addEventListener("click", () => {
    navigator.clipboard?.writeText(value).then(() => {
      copyBtn.textContent = "Copied!";
      copyBtn.classList.add("is-copied");
      window.setTimeout(() => {
        copyBtn.textContent = "Copy";
        copyBtn.classList.remove("is-copied");
      }, 1500);
    }).catch(() => {});
  });

  item.append(info, copyBtn);
  return item;
};

const createNavDropdown = (variant = NAV_DROPDOWN_VARIANT_CASE_STUDY_ONLY) => {
  const dropdown = document.createElement("div");
  dropdown.className = NAV_DROPDOWN_CLASS;
  dropdown.setAttribute("aria-hidden", "true");
  dropdown.setAttribute(NAV_DROPDOWN_VARIANT_ATTR, variant);

  const navList = document.createElement("div");
  navList.className = NAV_DROPDOWN_LIST_CLASS;
  navList.setAttribute("role", "menu");
  navList.setAttribute("aria-label", "Navigation");

  dropdown.append(navList);

  if (variant === NAV_DROPDOWN_VARIANT_DEFAULT) {
    dropdown.setAttribute(NAV_DROPDOWN_PANEL_ATTR, NAV_DROPDOWN_PANEL_MAIN);

    const contactPanel = document.createElement("div");
    contactPanel.className = NAV_DROPDOWN_CONTACT_PANEL_CLASS;

    const backBtn = document.createElement("button");
    backBtn.type = "button";
    backBtn.className = "dropdown-back-btn";
    backBtn.setAttribute("aria-label", "Back to navigation");

    const backIcon = document.createElement("span");
    backIcon.className = "dropdown-back-icon";
    backIcon.setAttribute("aria-hidden", "true");

    backBtn.append(backIcon);
    backBtn.addEventListener("click", () => {
      dropdown.setAttribute(NAV_DROPDOWN_PANEL_ATTR, NAV_DROPDOWN_PANEL_MAIN);
    });

    for (const item of NAV_CONTACT_ITEMS) {
      contactPanel.append(createContactDropdownItem(item));
    }

    contactPanel.prepend(backBtn);
    dropdown.append(contactPanel);
  }

  return dropdown;
};

const renderNavDropdown = async (anchor, navItems = [], activeId = "") => {
  if (!(anchor instanceof HTMLElement)) return;
  const dropdown = anchor.querySelector(`.${NAV_DROPDOWN_CLASS}`);
  const navList = anchor.querySelector(`.${NAV_DROPDOWN_LIST_CLASS}`);
  if (!(navList instanceof HTMLElement)) return;

  const variant = dropdown?.getAttribute(NAV_DROPDOWN_VARIANT_ATTR);
  const elements = [];

  if (variant !== NAV_DROPDOWN_VARIANT_CONTACT) {
    const filteredItems = await resolveNavDropdownItems(navItems);
    for (const item of filteredItems) {
      const title = String(item?.title || "").trim();
      if (!title) continue;
      elements.push(createNavDropdownItem(item, activeId));
    }
  }

  if (variant === NAV_DROPDOWN_VARIANT_DEFAULT) {
    for (const item of NAV_DROPDOWN_STATIC_ITEMS) {
      elements.push(createNavDropdownItem(item, activeId));
    }
  }

  if (variant === NAV_DROPDOWN_VARIANT_CONTACT) {
    for (const item of NAV_CONTACT_ITEMS) {
      elements.push(createContactDropdownItem(item));
    }
  }

  navList.replaceChildren(...elements);
};
