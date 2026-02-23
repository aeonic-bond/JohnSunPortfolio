const VIEW_OPTIONS = [
  {
    id: "mobile",
    label: "Mobile",
    iconSrc: "/Sandbox/Mobile.svg",
  },
  {
    id: "desktop",
    label: "Desktop",
    iconSrc: "/Sandbox/Desktop.svg",
  },
];

export const ModuleMount = {
  name: "module-mount",
  create(contentNode = null) {
    const root = document.createElement("div");
    root.className = "module-mount";
    root.dataset.view = "mobile";

    const prompt = document.createElement("p");
    prompt.className = "module-mount__prompt";
    prompt.textContent = "Interactive Module";
    root.appendChild(prompt);

    const toggle = document.createElement("div");
    toggle.className = "module-mount__view-toggle";
    toggle.setAttribute("role", "group");
    toggle.setAttribute("aria-label", "Module view");

    const selector = document.createElement("div");
    selector.className = "module-mount__view-selector";
    toggle.appendChild(selector);

    const moduleNode = contentNode?.classList?.contains("module-dyoh")
      ? contentNode
      : contentNode?.querySelector?.(".module-dyoh");
    const buttons = [];

    function setView(nextView) {
      const normalizedView = String(nextView || "mobile").toLowerCase() === "desktop" ? "desktop" : "mobile";
      root.dataset.view = normalizedView;
      const selectedIndex = VIEW_OPTIONS.findIndex((option) => option.id === normalizedView);
      selector.style.transform = `translateX(${Math.max(selectedIndex, 0) * 100}%)`;
      buttons.forEach((button) => {
        const isSelected = button.dataset.view === normalizedView;
        button.classList.toggle("is-selected", isSelected);
        button.setAttribute("aria-pressed", String(isSelected));
      });

      if (moduleNode?.moduleDyohApi?.setVariant) {
        moduleNode.moduleDyohApi.setVariant(normalizedView);
      }
    }

    VIEW_OPTIONS.forEach((option) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "module-mount__view-button";
      button.dataset.view = option.id;
      button.setAttribute("aria-pressed", "false");
      button.setAttribute("aria-label", option.label);

      const icon = document.createElement("span");
      icon.className = "module-mount__view-icon";
      icon.style.setProperty("--module-toggle-icon", `url("${option.iconSrc}")`);
      icon.setAttribute("aria-hidden", "true");
      button.appendChild(icon);

      button.addEventListener("click", () => setView(option.id));
      buttons.push(button);
      toggle.appendChild(button);
    });

    setView("mobile");
    root.appendChild(toggle);

    if (contentNode) root.appendChild(contentNode);
    return root;
  },
};
