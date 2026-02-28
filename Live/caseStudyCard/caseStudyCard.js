const createCaseStudyCard = ({
  kind = "",
  status = "draft",
  manualDisabled = false,
  title = "Title",
  description = "",
  tags = [],
  ctaLabel = "Read",
  href = "",
  media,
} = {}) => {
  const normalizedStatus = String(status || "ready").trim().toLowerCase();
  const isDisabled = manualDisabled || normalizedStatus !== "ready";
  const isNavigable = Boolean(href) && !isDisabled;

  const cardWrap = document.createElement("div");
  cardWrap.className = "case-study-card-container";
  if (kind) {
    cardWrap.id = `case-study-${String(kind).trim().toLowerCase()}`;
  }

  const card = document.createElement("article");
  card.className = "case-study-card";
  if (isDisabled) card.classList.add("is-draft");
  card.dataset.status = normalizedStatus;
  if (manualDisabled) card.dataset.manualDisabled = "true";
  if (kind) card.dataset.cardKind = kind;
  if (kind) card.setAttribute("aria-labelledby", `card-title-${String(kind).trim().toLowerCase()}`);

  const mediaEl = document.createElement("div");
  mediaEl.className = "card-media-div";

  const mediaMount = document.createElement("div");
  mediaMount.className = "card-media-mount";
  mediaMount.setAttribute("aria-hidden", "true");

  window.LiveCaseStudyData?.renderCardMedia?.({
    kind,
    mediaRoot: mediaMount,
    media,
    isDisabled,
  });
  mediaEl.append(mediaMount);

  const content = document.createElement("div");
  content.className = "card-texts-group";

  const titleWrap = document.createElement("div");
  titleWrap.className = "card-title-wrap";

  const titleEl = document.createElement("h2");
  titleEl.className = "card-title";
  titleEl.textContent = title;
  const titleId = kind ? `card-title-${String(kind).trim().toLowerCase()}` : "";
  if (titleId) titleEl.id = titleId;
  titleWrap.append(titleEl);

  const textWrap = document.createElement("div");
  textWrap.className = "card-text-wrap";

  const descriptionEl = document.createElement("p");
  descriptionEl.className = "card-text";
  descriptionEl.textContent = description;
  textWrap.append(descriptionEl);

  const tagsWrap = document.createElement("div");
  tagsWrap.className = "card-tags-group";
  for (const tagText of tags) {
    const trimmed = String(tagText || "").trim();
    if (!trimmed) continue;
    const tag = document.createElement("span");
    tag.className = "card-tag";
    tag.textContent = trimmed;
    tagsWrap.append(tag);
  }

  const body = document.createElement("div");
  body.className = "card-body";
  body.append(textWrap, tagsWrap);

  const { container: ctaContainer, button: ctaButton } = window.LivePrimitives.createCtaButton({
    label: ctaLabel,
    disabled: isDisabled,
  });

  content.append(titleWrap, body, ctaContainer);
  card.append(mediaEl, content);

  if (isNavigable) {
    const navigate = () => {
      window.location.href = href;
    };

    card.setAttribute("role", "link");
    card.tabIndex = 0;
    card.addEventListener("click", navigate);
    card.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        navigate();
      }
    });
    // Card is the interactive link; hide the CTA button from screen readers to avoid
    // a duplicate nested interactive element.
    ctaButton.setAttribute("aria-hidden", "true");
    ctaButton.tabIndex = -1;
    ctaButton.addEventListener("click", (event) => {
      event.stopPropagation();
      navigate();
    });
  }

  cardWrap.append(card);
  return cardWrap;
};

window.LiveComponents = window.LiveComponents || {};
window.LiveComponents.createCaseStudyCard = createCaseStudyCard;

const root = document.getElementById("case-studies-root");
if (root) {
  const desktopQuery = window.matchMedia("(min-width: 1024px)");
  let syncWidthRafId = 0;
  let activeSyncRafId = 0;
  let activeCardObserver = null;
  const activeCardIntersectionByElement = new Map();
  let activeID = "";
  let scrollObserveActiveIDEnabled = true;
  window.activeID = activeID;

  const getActiveThresholdRangeY = () => {
    const styles = getComputedStyle(root);
    const startRaw = styles.getPropertyValue("--active-card-threshold-start-vh").trim();
    const endRaw = styles.getPropertyValue("--active-card-threshold-end-vh").trim();
    const startVh = Number.parseFloat(startRaw);
    const endVh = Number.parseFloat(endRaw);
    const normalizedStart = Number.isFinite(startVh) ? startVh : 40;
    const normalizedEnd = Number.isFinite(endVh) ? endVh : 60;
    const lowerVh = Math.min(normalizedStart, normalizedEnd);
    const upperVh = Math.max(normalizedStart, normalizedEnd);
    const startY = (window.innerHeight * lowerVh) / 100;
    const endY = (window.innerHeight * upperVh) / 100;
    const centerY = startY + (endY - startY) * 0.5;
    return { startY, endY, centerY };
  };

  const syncActiveCardByID = (nextId) => {
    const cards = root.querySelectorAll(".case-study-card-container .case-study-card");
    for (const card of cards) {
      card.classList.remove("is-active");
    }
    if (!nextId) return;

    const activeCard = root.querySelector(`.case-study-card-container#${CSS.escape(nextId)} .case-study-card`);
    if (!(activeCard instanceof HTMLElement)) return;
    activeCard.classList.add("is-active");
  };

  const setActiveID = (nextId) => {
    if (!nextId || nextId === activeID) return;
    activeID = nextId;
    window.activeID = nextId;
    root.dataset.activeId = nextId;
    syncActiveCardByID(nextId);
    if (typeof window.syncCaseStudyNavActiveID === "function") {
      window.syncCaseStudyNavActiveID(nextId, "smooth");
    }
  };

  const getObservedCardDivs = () =>
    Array.from(root.querySelectorAll(".case-study-card-container")).filter(
      (cardDiv) => cardDiv instanceof HTMLElement
    );

  const getActiveObserverRootMargin = () => {
    const { startY, endY } = getActiveThresholdRangeY();
    const topInset = Math.max(0, Math.min(startY, window.innerHeight));
    const bottomInset = Math.max(0, window.innerHeight - endY);
    return `${-Math.round(topInset)}px 0px ${-Math.round(bottomInset)}px 0px`;
  };

  const disconnectActiveCardObserver = () => {
    if (activeCardObserver instanceof IntersectionObserver) {
      activeCardObserver.disconnect();
    }
    activeCardObserver = null;
    activeCardIntersectionByElement.clear();
  };

  const observeActiveCards = () => {
    disconnectActiveCardObserver();

    const cardDivs = getObservedCardDivs();
    if (!cardDivs.length) return;
    if (typeof IntersectionObserver !== "function") return;

    activeCardObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!(entry.target instanceof HTMLElement)) continue;
          activeCardIntersectionByElement.set(entry.target, entry.isIntersecting);
        }
        scheduleActiveSync();
      },
      {
        root: null,
        rootMargin: getActiveObserverRootMargin(),
        threshold: 0,
      }
    );

    for (const cardDiv of cardDivs) {
      activeCardIntersectionByElement.set(cardDiv, false);
      activeCardObserver.observe(cardDiv);
    }
  };

  const scrollObserveActiveID = () => {
    if (!scrollObserveActiveIDEnabled) return;

    const { startY, endY, centerY } = getActiveThresholdRangeY();
    const cardDivs = getObservedCardDivs();
    if (!cardDivs.length) return;

    let inRangeCandidateId = "";
    let inRangeDistance = Number.POSITIVE_INFINITY;
    let nearestId = "";
    let nearestDistance = Number.POSITIVE_INFINITY;

    for (const cardDiv of cardDivs) {
      const rect = cardDiv.getBoundingClientRect();
      const midpointY = rect.top + rect.height * 0.5;
      const currentDistance = Math.abs(midpointY - centerY);
      const inRange =
        activeCardObserver instanceof IntersectionObserver
          ? activeCardIntersectionByElement.get(cardDiv) === true
          : midpointY >= startY && midpointY <= endY;

      if (currentDistance < nearestDistance) {
        nearestDistance = currentDistance;
        nearestId = cardDiv.id;
      }

      if (inRange && currentDistance < inRangeDistance) {
        inRangeDistance = currentDistance;
        inRangeCandidateId = cardDiv.id;
      }
    }

    if (inRangeCandidateId) {
      setActiveID(inRangeCandidateId);
      return;
    }

    if (!activeID && nearestId) {
      setActiveID(nearestId);
    }
  };

  const syncCaseStudyCardWidths = () => {
    const cards = Array.from(root.querySelectorAll(".case-study-card"));
    if (!cards.length) return;

    // Reset width so each card can report its natural size before we measure.
    for (const card of cards) {
      card.style.width = "";
    }

    if (!desktopQuery.matches) return;

    let widest = 0;
    for (const card of cards) {
      widest = Math.max(widest, Math.ceil(card.getBoundingClientRect().width));
    }

    if (!widest) return;
    for (const card of cards) {
      card.style.width = `${widest}px`;
    }
  };

  const scheduleWidthSync = () => {
    if (syncWidthRafId) return;
    syncWidthRafId = window.requestAnimationFrame(() => {
      syncWidthRafId = 0;
      syncCaseStudyCardWidths();
    });
  };

  const scheduleActiveSync = () => {
    if (activeSyncRafId) return;
    activeSyncRafId = window.requestAnimationFrame(() => {
      activeSyncRafId = 0;
      scrollObserveActiveID();
    });
  };

  const disableScrollObserveActiveID = () => {
    scrollObserveActiveIDEnabled = false;
  };

  const enableScrollObserveActiveID = () => {
    scrollObserveActiveIDEnabled = true;
    scheduleActiveSync();
  };

  window.setActiveID = setActiveID;
  window.disableScrollObserveActiveID = disableScrollObserveActiveID;
  window.enableScrollObserveActiveID = enableScrollObserveActiveID;

  const renderCards = (caseStudies = []) => {
    root.replaceChildren(...caseStudies.map((item) => createCaseStudyCard(item)));
    observeActiveCards();
    syncActiveCardByID(activeID);
    scheduleWidthSync();
    scheduleActiveSync();
  };

  const load = window.LiveCaseStudyData?.loadCaseStudies;
  if (typeof load === "function") {
    load().then((items) => {
      renderCards(items);
      window.LiveCaseStudyData?.setupSplinePrewarmCascade?.(items);
    });
  } else {
    renderCards(window.LiveCaseStudyData?.items || []);
  }

  window.addEventListener("scroll", scheduleActiveSync, { passive: true });
  window.addEventListener("resize", () => {
    observeActiveCards();
    scheduleWidthSync();
    scheduleActiveSync();
  });
  if (typeof desktopQuery.addEventListener === "function") {
    desktopQuery.addEventListener("change", () => {
      observeActiveCards();
      scheduleWidthSync();
      scheduleActiveSync();
    });
  } else if (typeof desktopQuery.addListener === "function") {
    desktopQuery.addListener(() => {
      observeActiveCards();
      scheduleWidthSync();
      scheduleActiveSync();
    });
  }

  if (document.fonts?.ready) {
    document.fonts.ready.then(() => {
      scheduleWidthSync();
      scheduleActiveSync();
    });
  }
}
