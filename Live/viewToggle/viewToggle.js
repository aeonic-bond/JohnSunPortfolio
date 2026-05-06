const VIEW_TOGGLE_OPTIONS = [
  { id: "mobile", label: "Mobile", iconSrc: "/Live/viewToggle/Mobile.svg" },
  { id: "desktop", label: "Desktop", iconSrc: "/Live/viewToggle/Desktop.svg" },
];

export const createViewToggle = ({ initialView = "mobile", onChange = null } = {}) => {
  const container = document.createElement("div");
  container.className = "view-toggle";
  container.setAttribute("role", "group");
  container.setAttribute("aria-label", "View mode");

  const selector = document.createElement("div");
  selector.className = "view-toggle__selector";
  container.appendChild(selector);

  const buttons = [];

  function setView(nextView) {
    const view = String(nextView || "mobile").toLowerCase() === "desktop" ? "desktop" : "mobile";
    const index = VIEW_TOGGLE_OPTIONS.findIndex((o) => o.id === view);
    selector.style.transform = `translateX(${Math.max(index, 0) * 100}%)`;
    buttons.forEach((btn) => {
      const isSelected = btn.dataset.view === view;
      btn.classList.toggle("is-selected", isSelected);
      btn.setAttribute("aria-pressed", String(isSelected));
    });
    if (typeof onChange === "function") onChange(view);
  }

  VIEW_TOGGLE_OPTIONS.forEach((option) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "view-toggle__button";
    button.dataset.view = option.id;
    button.setAttribute("aria-pressed", "false");
    button.setAttribute("aria-label", option.label);

    const icon = document.createElement("span");
    icon.className = "view-toggle__icon";
    icon.style.setProperty("--view-toggle-icon", `url("${option.iconSrc}")`);
    icon.setAttribute("aria-hidden", "true");
    button.appendChild(icon);

    button.addEventListener("click", () => setView(option.id));
    buttons.push(button);
    container.appendChild(button);
  });

  setView(initialView);
  return container;
};

window.LiveViewToggle = { createViewToggle };
