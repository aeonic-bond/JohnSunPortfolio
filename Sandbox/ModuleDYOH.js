import { ModuleMount } from "/Sandbox/ModuleMount.js";

const ASSETS = {
  floorplan: "http://localhost:3845/assets/6ef9e2770ed69614d5df78e88cf61d08ea88e98f.png",
  optionDefault: "/Assets/DYOH-Icons/StackedDoor.svg",
};

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (typeof text === "string") node.textContent = text;
  return node;
}

export const Option = {
  name: "Option",
  defaults: {
    optionText: "Alternate Kitchen Island",
    state: "Unselected",
  },
  icons: ASSETS,
  create({
    optionText = Option.defaults.optionText,
    state = Option.defaults.state,
    iconSrc = ASSETS.optionDefault,
    onToggle = null,
  } = {}) {
    let currentOptionState =
      state === "Selected" || state === "Disabled" ? state : "Unselected";
    const root = el("div", "option");

    const row = el("div", "option__row");
    const left = el("div", "option__left");
    const symbol = el("div", "option__symbol");
    const icon = el("img", "option__icon");
    const label = el("p", "option__label", optionText);
    const ctaWrap = el("div", "option__cta-wrap");

    icon.alt = "";
    icon.src = iconSrc || ASSETS.optionDefault;

    symbol.appendChild(icon);
    left.append(symbol, label);
    
    function renderState() {
      const isSelected = currentOptionState === "Selected";
      const isDisabled = currentOptionState === "Disabled";
      root.className = `option ${isDisabled ? "option--disabled" : isSelected ? "option--selected" : "option--unselected"}`;
      root.setAttribute("aria-pressed", String(isSelected));
      root.setAttribute("aria-disabled", String(isDisabled));
      root.dataset.state = currentOptionState;
      ctaWrap.innerHTML = "";
      if (isSelected) {
        ctaWrap.appendChild(el("p", "option__remove", "Remove"));
      } else {
        const add = el("button", "option__pill", "Add +");
        add.type = "button";
        add.disabled = isDisabled;
        ctaWrap.appendChild(add);
      }

      row.tabIndex = isDisabled ? -1 : 0;
      row.setAttribute("role", isDisabled ? "group" : "button");
    }

    function toggle() {
      if (currentOptionState === "Disabled") return;
      currentOptionState = currentOptionState === "Selected" ? "Unselected" : "Selected";
      renderState();
      if (typeof onToggle === "function") onToggle(currentOptionState);
    }

    row.addEventListener("click", toggle);
    row.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        toggle();
      }
    });
    renderState();

    row.append(left, ctaWrap);
    root.appendChild(row);
    return root;
  },
};

export const ModuleDYOH = {
  name: "module-dyoh",
  create({ state = "default", option = Option.defaults, options = null } = {}) {
    const normalizedOptions = Array.isArray(options) && options.length > 0 ? options : [option];
    const root = el("div", "module-dyoh");
    let currentState = state === "panel" ? "panel" : "default";

    function applyState(nextState) {
      currentState = nextState === "panel" ? "panel" : "default";
      root.className = `module-dyoh ${currentState === "panel" ? "module-dyoh--panel" : "module-dyoh--default"}`;
    }

    const floorplanContainer = el("div", "module-dyoh__floorplan-container");
    const floorplan = el("img", "module-dyoh__floorplan");
    floorplan.alt = "";
    floorplan.src = ASSETS.floorplan;
    floorplanContainer.appendChild(floorplan);
    floorplanContainer.addEventListener("click", () => {
      if (currentState !== "default") applyState("default");
    });

    const panel = el("div", "module-dyoh__panel");
    const panelIndicator = el("div", "module-dyoh__panel-indicator");
    const tabs = el("div", "module-dyoh__tabs");
    const tabOne = el("p", "module-dyoh__tab module-dyoh__tab--active", "1st Floor");
    const tabTwo = el("p", "module-dyoh__tab module-dyoh__tab--inactive", "2nd Floor");
    tabs.append(tabOne, tabTwo);

    const meta = el("div", "module-dyoh__meta");
    const metaCount = el("p", "module-dyoh__meta-count");
    const metaAdded = el("p", "module-dyoh__meta-added");
    meta.append(metaCount, metaAdded);

    const optionWrap = el("div", "module-dyoh__option-wrap");
    const optionsContainer = el("div", "options-container");
    function updateMeta() {
      const total = normalizedOptions.length;
      const selectedCount = optionsContainer.querySelectorAll('.option[data-state="Selected"]').length;
      const suffix = total > 1 ? "s" : "";
      metaCount.textContent = `${total} upgrade option${suffix} available`;
      metaAdded.textContent = `${selectedCount} added`;
    }

    normalizedOptions.forEach((optionConfig) => {
      const normalizedState =
        optionConfig.state === "Selected" || optionConfig.state === "Disabled" || optionConfig.state === "Unselected"
          ? optionConfig.state
          : optionConfig.selected
            ? "Selected"
            : "Unselected";
      optionsContainer.appendChild(Option.create({
        ...optionConfig,
        state: normalizedState,
        onToggle: updateMeta,
      }));
    });
    updateMeta();
    optionWrap.appendChild(optionsContainer);

    panel.addEventListener("click", () => {
      if (currentState !== "panel") applyState("panel");
    });

    panel.append(panelIndicator, tabs, meta, optionWrap);
    root.append(floorplanContainer, panel);
    applyState(currentState);
    return root;
  },
};

export function createModuleDYOH(container, config = {}) {
  if (!container) return;
  container.innerHTML = "";
  container.appendChild(ModuleMount.create(ModuleDYOH.create(config)));
}
