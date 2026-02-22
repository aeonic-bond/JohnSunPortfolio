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
  states: ["selected", "unselected", "disabled", "canswap"],
  create({
    optionText,
    state = "unselected",
    type = "",
    isLastChild = false,
    lockedDisabled = false,
    allowDeselect = true,
    iconSrc = ASSETS.optionDefault,
    onToggle = null,
  } = {}) {
    const normalizeState = (rawState) => (Option.states.includes(String(rawState).toLowerCase())
      ? String(rawState).toLowerCase()
      : "unselected");
    const normalizedState = normalizeState(state);
    const normalizedType = String(type).toLowerCase() === "parent"
      ? "parent"
      : String(type).toLowerCase() === "child"
        ? "child"
        : "";
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
      const isCanSwap = currentOptionState === "canswap";
      const isDisabled = currentOptionState === "disabled" || isLockedDisabled;
      const effectiveState = isDisabled ? "disabled" : currentOptionState;
      const optionVariantClass = normalizedType ? ` option--${normalizedType}` : "";
      const optionStateClass = isDisabled
        ? "option--disabled"
        : isSelected
          ? "option--selected"
          : isCanSwap
            ? "option--can-swap"
            : "option--unselected";
      root.className = `option${optionVariantClass}${isLastChild ? " option--last-child" : ""} ${optionStateClass}`;
      root.setAttribute("aria-pressed", String(isSelected));
      root.setAttribute("aria-disabled", String(isDisabled));
      root.dataset.state = effectiveState;
      if (normalizedType) {
        root.dataset.type = normalizedType;
      } else {
        delete root.dataset.type;
      }
      ctaWrap.innerHTML = "";
      if (isSelected) {
        ctaWrap.appendChild(el("p", "option__remove", "Remove"));
      } else if (isCanSwap) {
        ctaWrap.appendChild(el("p", "option__swap", "Swap"));
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
      if (currentOptionState === "canswap") {
        if (typeof onToggle === "function") onToggle(currentOptionState);
        return;
      }
      if (currentOptionState === "selected" && !allowDeselect) {
        if (typeof onToggle === "function") onToggle(currentOptionState);
        return;
      }
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
      setState(nextState) {
        currentOptionState = normalizeState(nextState);
        renderState();
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
  bundle = false,
  option,
  children = [],
  options = [],
  entries = [],
  onToggle = null,
  registerConflictNode = null,
  onConflictToggle = null,
} = {}) {
  const createConflictOptionNode = (entry) => {
    const optionState = entry?.state ? String(entry.state).toLowerCase() : "unselected";
    let optionNode = null;
    optionNode = Option.create({
      ...entry,
      state: optionState,
      onToggle: (nextState) => {
        if (typeof onConflictToggle === "function") {
          onConflictToggle(optionNode, nextState);
          return;
        }
        if (typeof onToggle === "function") onToggle(nextState);
      },
    });
    if (typeof registerConflictNode === "function") {
      registerConflictNode(optionNode);
    }
    return optionNode;
  };

  const appendBundleEntries = (bundleEntries, container) => {
    const rawEntries = Array.isArray(bundleEntries) ? bundleEntries : [];
    rawEntries.forEach((bundleEntry) => {
      if (bundleEntry?.bundle === true) {
        container.appendChild(
          OptionGroup.create({
            type: "optionBundle",
            bundle: true,
            entries: Array.isArray(bundleEntry.entries)
              ? bundleEntry.entries
              : (Array.isArray(bundleEntry.options) ? bundleEntry.options : []),
            onToggle,
            registerConflictNode,
            onConflictToggle,
          }),
        );
        return;
      }
      container.appendChild(createConflictOptionNode(bundleEntry));
    });
  };

  const rawType = String(type).toLowerCase();
  const normalizedType =
    bundle || rawType === "optionbundle"
      ? "optionBundle"
      : rawType === "parentchild"
      ? "parentChild"
      : rawType === "closeconflict"
        ? "closeConflict"
        : "independent";
  const normalizedParent = option || OptionGroup.defaults.option;
  const root = el("div", "option-group");
  root.className = `option-group ${
    normalizedType === "optionBundle"
      ? "option-group--option-bundle"
      : normalizedType === "parentChild"
      ? "option-group--parent-child"
      : normalizedType === "closeConflict"
        ? "option-group--close-conflict"
        : "option-group--independent"
  }`;
  root.dataset.type = normalizedType;

  if (normalizedType === "optionBundle") {
    const bundleContainer = el("div", "option-group__bundle");
    const rawEntries = Array.isArray(entries) ? entries : options;
    appendBundleEntries(rawEntries, bundleContainer);
    root.appendChild(bundleContainer);
    return root;
  }

  if (normalizedType === "closeConflict") {
    const conflictContainer = el("div", "option-group__conflict-options");
    const rawOptions = Array.isArray(options) ? options : [];
    const conflictNodes = [];
    const markerAnchors = [];
    const registerNode = (node) => {
      conflictNodes.push(node);
    };
    const applyConflictSelection = (selectedIndex) => {
      conflictNodes.forEach((conflictNode, index) => {
        conflictNode.optionApi?.setState(index === selectedIndex ? "selected" : "canswap");
      });
      if (typeof onToggle === "function") onToggle("selected");
    };
    const clearConflictSelection = () => {
      conflictNodes.forEach((conflictNode) => {
        conflictNode.optionApi?.setState("unselected");
      });
      if (typeof onToggle === "function") onToggle("unselected");
    };
    const handleConflictToggle = (index, nextState) => {
      if (nextState === "unselected") {
        clearConflictSelection();
        return;
      }
      applyConflictSelection(index);
    };
    const handleConflictOptionToggle = (optionNode, nextState) => {
      const optionIndex = conflictNodes.indexOf(optionNode);
      if (optionIndex < 0) return;
      handleConflictToggle(optionIndex, nextState);
    };

    rawOptions.forEach((conflictOption) => {
      if (conflictOption?.bundle === true) {
        const bundleConflictNodes = [];
        conflictContainer.appendChild(
          OptionGroup.create({
            type: "optionBundle",
            bundle: true,
            entries: Array.isArray(conflictOption.entries)
              ? conflictOption.entries
              : (Array.isArray(conflictOption.options) ? conflictOption.options : []),
            onToggle,
            registerConflictNode: (node) => {
              registerNode(node);
              bundleConflictNodes.push(node);
            },
            onConflictToggle: handleConflictOptionToggle,
          }),
        );
        if (bundleConflictNodes.length > 0) {
          markerAnchors.push({
            firstNode: bundleConflictNodes[0],
            lastNode: bundleConflictNodes[bundleConflictNodes.length - 1],
          });
        }
        return;
      }
      const optionState = conflictOption?.state
        ? String(conflictOption.state).toLowerCase()
        : "unselected";
      let conflictNode = null;
      conflictNode = Option.create({
        ...conflictOption,
        state: optionState,
        onToggle: (nextState) => handleConflictOptionToggle(conflictNode, nextState),
      });
      registerNode(conflictNode);
      markerAnchors.push({
        firstNode: conflictNode,
        lastNode: conflictNode,
      });
      conflictContainer.appendChild(conflictNode);
    });

    const preselectedIndex = conflictNodes.findIndex(
      (conflictNode) => conflictNode.optionApi?.getState() === "selected",
    );
    if (preselectedIndex >= 0) {
      applyConflictSelection(preselectedIndex);
    }

    root.appendChild(conflictContainer);

    const orMarkersLayer = el("div", "option-group__or-markers");
    root.appendChild(orMarkersLayer);

    const drawOrMarkers = () => {
      orMarkersLayer.innerHTML = "";
      if (markerAnchors.length < 2) return;
      const rootRect = root.getBoundingClientRect();
      if (!rootRect.width || !rootRect.height) return;

      for (let i = 0; i < markerAnchors.length - 1; i += 1) {
        const currentNode = markerAnchors[i]?.lastNode;
        const nextNode = markerAnchors[i + 1]?.firstNode;
        const currentRow = currentNode?.querySelector(".option__row");
        const nextRow = nextNode?.querySelector(".option__row");
        const anchor = currentNode?.querySelector(".option__symbol");
        if (!currentRow || !nextRow || !anchor) continue;

        const currentRect = currentRow.getBoundingClientRect();
        const nextRect = nextRow.getBoundingClientRect();
        const anchorRect = anchor.getBoundingClientRect();
        const markerTop = (currentRect.bottom + nextRect.top) / 2 - rootRect.top;
        const markerLeft = anchorRect.left + anchorRect.width / 2 - rootRect.left;

        const marker = el("div", "option-group__or-marker", "or");
        marker.style.left = `${markerLeft}px`;
        marker.style.top = `${markerTop}px`;
        orMarkersLayer.appendChild(marker);
      }
    };

    requestAnimationFrame(() => {
      drawOrMarkers();
      requestAnimationFrame(drawOrMarkers);
    });
    setTimeout(drawOrMarkers, 0);
    window.addEventListener("resize", drawOrMarkers);
    root.optionGroupApi = {
      redraw() {
        drawOrMarkers();
      },
    };
    return root;
  }

  const childNodes = [];
  const handleParentToggle = (parentState) => {
    const shouldLockChildren = parentState !== "selected";
    childNodes.forEach((childNode) => childNode.optionApi?.setLockedDisabled(shouldLockChildren));
    if (typeof onToggle === "function") onToggle(parentState);
  };
  let parentNode = null;
  if (normalizedType !== "closeConflict" && normalizedType !== "optionBundle") {
    parentNode = Option.create({
      ...normalizedParent,
      type: normalizedType === "parentChild" ? "parent" : "",
      onToggle: normalizedType === "parentChild" ? handleParentToggle : onToggle,
    });
    root.appendChild(parentNode);
  }

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
    root.optionGroupApi = {
      redraw() {
        drawConnectorLines();
      },
    };
  }

  return root;
};

export const ModuleDYOH = {
  name: "module-dyoh",
  create({ state = "default", F1List, F2List } = {}) {
    const normalizedF1List = Array.isArray(F1List) ? F1List : [OptionGroup.defaults];
    const normalizedF2List = Array.isArray(F2List) ? F2List : [];
    const root = el("div", "module-dyoh");
    let currentState = state === "panel" ? "panel" : "default";
    let currentFloor = "first";

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
    const tabOne = el("button", "module-dyoh__tab", "1st Floor");
    const tabTwo = el("button", "module-dyoh__tab", "2nd Floor");
    const tabSelector = el("div", "module-dyoh__tab-selector");
    tabOne.type = "button";
    tabTwo.type = "button";
    tabs.append(tabOne, tabTwo, tabSelector);

    const meta = el("div", "module-dyoh__meta");
    const metaCount = el("p", "module-dyoh__meta-count");
    const metaAdded = el("p", "module-dyoh__meta-added");
    meta.append(metaCount, metaAdded);

    const optionWrap = el("div", "module-dyoh__option-wrap");
    const f1OptionsContainer = el("div", "options-container options-container--f1");
    const f2OptionsContainer = el("div", "options-container options-container--f2");
    function getActiveOptionsContainer() {
      return currentFloor === "second" ? f2OptionsContainer : f1OptionsContainer;
    }
    function updateMeta() {
      const activeOptionsContainer = getActiveOptionsContainer();
      const total = activeOptionsContainer.querySelectorAll(".option").length;
      const selectedCount = activeOptionsContainer.querySelectorAll('.option[data-state="selected"]').length;
      const suffix = total > 1 ? "s" : "";
      metaCount.textContent = `${total} upgrade option${suffix} available`;
      metaAdded.textContent = `${selectedCount} added`;
    }
    function applyFloor(nextFloor) {
      currentFloor = nextFloor === "second" ? "second" : "first";
      const isFirstFloor = currentFloor === "first";
      tabOne.className = `module-dyoh__tab ${isFirstFloor ? "module-dyoh__tab--active" : "module-dyoh__tab--inactive"}`;
      tabTwo.className = `module-dyoh__tab ${isFirstFloor ? "module-dyoh__tab--inactive" : "module-dyoh__tab--active"}`;
      tabOne.setAttribute("aria-pressed", String(isFirstFloor));
      tabTwo.setAttribute("aria-pressed", String(!isFirstFloor));
      tabSelector.style.transform = `translateX(${isFirstFloor ? 0 : 100}%)`;
      f1OptionsContainer.hidden = !isFirstFloor;
      f2OptionsContainer.hidden = isFirstFloor;
      updateMeta();
      requestAnimationFrame(() => {
        const activeOptionsContainer = getActiveOptionsContainer();
        activeOptionsContainer.querySelectorAll(".option-group").forEach((groupNode) => {
          groupNode.optionGroupApi?.redraw?.();
        });
      });
    }

    function buildGroupPayload(groupConfig) {
      const rawType = String(groupConfig.type || "").toLowerCase();
      const normalizedType =
        groupConfig?.bundle === true || rawType === "optionbundle"
          ? "optionBundle"
          : rawType === "parentchild"
          ? "parentChild"
          : rawType === "closeconflict"
            ? "closeConflict"
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
      const normalizedOptions = Array.isArray(groupConfig.options)
        ? groupConfig.options.map((conflictOption) => ({
            ...conflictOption,
            state: conflictOption?.state ? String(conflictOption.state).toLowerCase() : "unselected",
          }))
        : [];
      const normalizedEntries = Array.isArray(groupConfig.entries)
        ? groupConfig.entries
        : normalizedOptions;
      if (normalizedType === "optionBundle") {
        return {
          type: normalizedType,
          bundle: true,
          entries: normalizedEntries,
          onToggle: updateMeta,
        };
      }
      return normalizedType === "closeConflict"
        ? {
            type: normalizedType,
            option: {
              ...optionConfig,
              state: normalizedState,
            },
            options: normalizedOptions,
            onToggle: updateMeta,
          }
        : {
            type: normalizedType,
            option: {
              ...optionConfig,
              state: normalizedState,
            },
            children: normalizedChildren,
            options: normalizedOptions,
            onToggle: updateMeta,
          };
    }

    normalizedF1List.forEach((groupConfig) => {
      f1OptionsContainer.appendChild(OptionGroup.create(buildGroupPayload(groupConfig)));
    });
    normalizedF2List.forEach((groupConfig) => {
      f2OptionsContainer.appendChild(OptionGroup.create(buildGroupPayload(groupConfig)));
    });

    optionWrap.append(f1OptionsContainer, f2OptionsContainer);
    tabOne.addEventListener("click", () => applyFloor("first"));
    tabTwo.addEventListener("click", () => applyFloor("second"));
    applyFloor("first");

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
