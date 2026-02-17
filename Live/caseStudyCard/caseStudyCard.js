const createCaseStudyCard = ({
  kind = "",
  title = "Title",
  description = "",
  tags = [],
  ctaLabel = "Read",
  href = "",
  media,
} = {}) => {
  const cardWrap = document.createElement("div");
  cardWrap.className = "case-study-card-div";
  if (kind) {
    cardWrap.id = `case-study-${String(kind).trim().toLowerCase()}`;
  }

  const card = document.createElement("article");
  card.className = "case-study-card";
  if (kind) card.dataset.cardKind = kind;

  const mediaEl = document.createElement("div");
  mediaEl.className = "card-media-div";

  const mediaMount = document.createElement("div");
  mediaMount.className = "card-media-mount";
  mediaMount.setAttribute("aria-hidden", "true");

  window.LiveCaseStudyData?.renderCardMedia?.({
    kind,
    mediaRoot: mediaMount,
    media,
  });
  mediaEl.append(mediaMount);

  const content = document.createElement("div");
  content.className = "card-text-all";

  const titleWrap = document.createElement("div");
  titleWrap.className = "card-title-wrap";

  const titleEl = document.createElement("h2");
  titleEl.className = "card-title";
  titleEl.textContent = title;
  titleWrap.append(titleEl);

  const textWrap = document.createElement("div");
  textWrap.className = "card-text-wrap";

  const descriptionEl = document.createElement("p");
  descriptionEl.className = "card-text";
  descriptionEl.textContent = description;
  textWrap.append(descriptionEl);

  const tagsWrap = document.createElement("div");
  tagsWrap.className = "card-tags-all";
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

  const ctaContainer = document.createElement("div");
  ctaContainer.className = "card-cta-container";
  const ctaButton = document.createElement("button");
  ctaButton.className = "card-cta";
  ctaButton.type = "button";
  ctaButton.textContent = ctaLabel;
  ctaContainer.append(ctaButton);

  content.append(titleWrap, body, ctaContainer);
  card.append(mediaEl, content);

  if (href) {
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

  const setActiveID = (nextId) => {
    if (!nextId || nextId === activeID) return;
    activeID = nextId;
    window.activeID = nextId;
    root.dataset.activeId = nextId;
    if (typeof window.syncCaseStudyNavActiveID === "function") {
      window.syncCaseStudyNavActiveID(nextId, "smooth");
    }
  };

  const scrollObserveActiveID = () => {
    if (!scrollObserveActiveIDEnabled) return;

    const { startY, endY, centerY } = getActiveThresholdRangeY();
    const cardDivs = Array.from(root.querySelectorAll(".case-study-card-div"));
    if (!cardDivs.length) return;

    let inRangeCandidateId = "";
    let inRangeDistance = Number.POSITIVE_INFINITY;
    let nearestId = "";
    let nearestDistance = Number.POSITIVE_INFINITY;

    for (const cardDiv of cardDivs) {
      if (!(cardDiv instanceof HTMLElement)) continue;
      const rect = cardDiv.getBoundingClientRect();
      const midpointY = rect.top + rect.height * 0.5;
      const currentDistance = Math.abs(midpointY - centerY);
      const inRange = midpointY >= startY && midpointY <= endY;

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
    scheduleWidthSync();
    scheduleActiveSync();
  };

  const load = window.LiveCaseStudyData?.loadCaseStudies;
  if (typeof load === "function") {
    load().then(renderCards);
  } else {
    renderCards(window.LiveCaseStudyData?.items || []);
  }

  window.addEventListener("scroll", scheduleActiveSync, { passive: true });
  window.addEventListener("resize", () => {
    scheduleWidthSync();
    scheduleActiveSync();
  });
  if (typeof desktopQuery.addEventListener === "function") {
    desktopQuery.addEventListener("change", () => {
      scheduleWidthSync();
      scheduleActiveSync();
    });
  } else if (typeof desktopQuery.addListener === "function") {
    desktopQuery.addListener(() => {
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
