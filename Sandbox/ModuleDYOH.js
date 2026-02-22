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

export const OptionGroup = {
  name: "OptionGroup",
  defaults: {
    type: "independent",
    option: {
      optionText: "Alternate Kitchen Island",
      state: "unselected",
      iconSrc: ASSETS.optionDefault,
    },
  },
  icons: ASSETS,
};

export const Option = {
  name: "Option",
  states: ["selected", "unselected", "disabled"],
  create({
    optionText,
    state = "unselected",
    type = "independent",
    isLastChild = false,
    lockedDisabled = false,
    iconSrc = ASSETS.optionDefault,
    onToggle = null,
  } = {}) {
    const normalizedState = Option.states.includes(String(state).toLowerCase())
      ? String(state).toLowerCase()
      : "unselected";
    const normalizedType = String(type).toLowerCase() === "parent"
      ? "parent"
      : String(type).toLowerCase() === "child"
        ? "child"
        : "independent";
    let currentOptionState = normalizedState;
    let isLockedDisabled = Boolean(lockedDisabled);
    const root = el("div", "option");

    const row = el("div", "option__row");
    const left = el("div", "option__left");
    const iconContainer = el("div", "option__icon-container");
    const symbol = el("div", "option__symbol");
    const icon = el("img", "option__icon");
    const label = el("p", "option__label", optionText);
    const ctaWrap = el("div", "option__cta-wrap");

    icon.alt = "";
    icon.src = iconSrc || ASSETS.optionDefault;

    symbol.appendChild(icon);
    iconContainer.appendChild(symbol);

    left.append(iconContainer, label);
    
    function renderState() {
      const isSelected = currentOptionState === "selected";
      const isDisabled = currentOptionState === "disabled" || isLockedDisabled;
      const effectiveState = isDisabled ? "disabled" : currentOptionState;
      root.className = `option option--${normalizedType}${isLastChild ? " option--last-child" : ""} ${isDisabled ? "option--disabled" : isSelected ? "option--selected" : "option--unselected"}`;
      root.setAttribute("aria-pressed", String(isSelected));
      root.setAttribute("aria-disabled", String(isDisabled));
      root.dataset.state = effectiveState;
      root.dataset.type = normalizedType;
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
      if (currentOptionState === "disabled" || isLockedDisabled) return;
      currentOptionState = currentOptionState === "selected" ? "unselected" : "selected";
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
    root.optionApi = {
      getState() {
        return currentOptionState;
      },
      setLockedDisabled(locked) {
        isLockedDisabled = Boolean(locked);
        renderState();
      },
    };
    return root;
  },
};

OptionGroup.create = function createOptionGroup({
  type = "independent",
  option,
  children = [],
  onToggle = null,
} = {}) {
  const rawType = String(type).toLowerCase();
  const normalizedType = rawType === "parentchild" ? "parentChild" : "independent";
  const normalizedParent = option || OptionGroup.defaults.option;
  const root = el("div", "option-group");
  root.className = `option-group ${normalizedType === "parentChild" ? "option-group--parent-child" : "option-group--independent"}`;
  root.dataset.type = normalizedType;
  const childNodes = [];
  const handleParentToggle = (parentState) => {
    const shouldLockChildren = parentState !== "selected";
    childNodes.forEach((childNode) => childNode.optionApi?.setLockedDisabled(shouldLockChildren));
    if (typeof onToggle === "function") onToggle(parentState);
  };
  const parentNode = Option.create({
    ...normalizedParent,
    type: normalizedType === "parentChild" ? "parent" : "independent",
    onToggle: normalizedType === "parentChild" ? handleParentToggle : onToggle,
  });
  root.appendChild(parentNode);

  if (normalizedType === "parentChild") {
    const childrenContainer = el("div", "option-group__children");
    const rawChildren = Array.isArray(children) ? children : [];
    const parentStartsSelected = String(normalizedParent.state || "unselected").toLowerCase() === "selected";
    rawChildren.forEach((childOption, index) => {
      const childBaseState = String(childOption?.state || "unselected").toLowerCase();
      const normalizedChildState =
        childBaseState === "selected" || childBaseState === "disabled"
          ? childBaseState
          : "unselected";
      const childNode = Option.create({
        ...childOption,
        state: normalizedChildState,
        type: "child",
        isLastChild: index === rawChildren.length - 1,
        lockedDisabled: normalizedChildState !== "disabled" && !parentStartsSelected,
        onToggle,
      });
      childNodes.push(childNode);
      childrenContainer.appendChild(childNode);
    });
    handleParentToggle(parentNode.optionApi?.getState() || "unselected");
    root.appendChild(childrenContainer);

    const connectorsLayer = el("div", "option-group__connectors");
    root.appendChild(connectorsLayer);

    const optionNodes = [parentNode, ...childNodes];
    const drawConnectorLines = () => {
      connectorsLayer.innerHTML = "";
      if (optionNodes.length < 2) return;

      const rootRect = root.getBoundingClientRect();
      for (let i = 0; i < optionNodes.length - 1; i += 1) {
        const currentAnchor = i === 0
          ? optionNodes[i]?.querySelector(".option__icon-container")
          : optionNodes[i]?.querySelector(".option__symbol");
        const nextAnchor = optionNodes[i + 1]?.querySelector(".option__symbol");
        if (!currentAnchor || !nextAnchor) continue;

        const currentRect = currentAnchor.getBoundingClientRect();
        const nextRect = nextAnchor.getBoundingClientRect();
        const lineTop = currentRect.bottom - rootRect.top;
        const lineBottom = nextRect.top - rootRect.top;
        const lineHeight = Math.max(0, lineBottom - lineTop);
        if (lineHeight === 0) continue;

        const lineClass =
          i === 0
            ? "option-group__connector-line option-group__connector-line--parent-child"
            : "option-group__connector-line option-group__connector-line--child-child";
        const line = el("div", lineClass);
        line.style.left = `${currentRect.left - rootRect.left + currentRect.width / 2}px`;
        line.style.top = `${lineTop}px`;
        line.style.height = `${lineHeight}px`;
        connectorsLayer.appendChild(line);
      }
    };

    requestAnimationFrame(() => {
      drawConnectorLines();
      requestAnimationFrame(drawConnectorLines);
    });
    setTimeout(drawConnectorLines, 0);
    window.addEventListener("resize", drawConnectorLines);
  }
  return root;
};

export const ModuleDYOH = {
  name: "module-dyoh",
  create({ state = "default", optionGroup = [OptionGroup.defaults] } = {}) {
    const normalizedOptionGroup = Array.isArray(optionGroup) && optionGroup.length > 0
      ? optionGroup
      : [OptionGroup.defaults];
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
      const total = optionsContainer.querySelectorAll(".option").length;
      const selectedCount = optionsContainer.querySelectorAll('.option[data-state="selected"]').length;
      const suffix = total > 1 ? "s" : "";
      metaCount.textContent = `${total} upgrade option${suffix} available`;
      metaAdded.textContent = `${selectedCount} added`;
    }

    normalizedOptionGroup.forEach((groupConfig) => {
      const normalizedType =
        String(groupConfig.type || OptionGroup.defaults.type).toLowerCase() === "parentchild"
          ? "parentChild"
          : "independent";
      const optionConfig = groupConfig.option || OptionGroup.defaults.option;
      const normalizedState = optionConfig.state
        ? String(optionConfig.state).toLowerCase()
        : "unselected";
      const normalizedChildren = Array.isArray(groupConfig.children)
        ? groupConfig.children.map((childOption) => ({
            ...childOption,
            state: childOption?.state ? String(childOption.state).toLowerCase() : "unselected",
          }))
        : [];
      optionsContainer.appendChild(
        OptionGroup.create({
          type: normalizedType,
          option: {
            ...optionConfig,
            state: normalizedState,
          },
          children: normalizedChildren,
          onToggle: updateMeta,
        }),
      );
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
