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
  cardWrap.className = "case_study_card_div";

  const card = document.createElement("article");
  card.className = "case_study_card";
  if (kind) card.dataset.cardKind = kind;

  const mediaEl = document.createElement("div");
  mediaEl.className = "card_media_div";

  const mediaMount = document.createElement("div");
  mediaMount.className = "card_media_mount";
  mediaMount.setAttribute("aria-hidden", "true");

  window.LiveCaseStudyData?.renderCardMedia?.({
    kind,
    mediaRoot: mediaMount,
    media,
  });
  mediaEl.append(mediaMount);

  const content = document.createElement("div");
  content.className = "card_textAll";

  const head = document.createElement("div");
  head.className = "card_head";

  const titleWrap = document.createElement("div");
  titleWrap.className = "card_title_wrap";

  const titleEl = document.createElement("h2");
  titleEl.className = "card_title";
  titleEl.textContent = title;
  titleWrap.append(titleEl);

  const textWrap = document.createElement("div");
  textWrap.className = "card_text_wrap";

  const descriptionEl = document.createElement("p");
  descriptionEl.className = "card_text";
  descriptionEl.textContent = description;
  textWrap.append(descriptionEl);

  head.append(titleWrap, textWrap);

  const tagsWrap = document.createElement("div");
  tagsWrap.className = "card_tags";
  for (const tagText of tags) {
    const trimmed = String(tagText || "").trim();
    if (!trimmed) continue;
    const tag = document.createElement("span");
    tag.className = "card_tag";
    tag.textContent = trimmed;
    tagsWrap.append(tag);
  }

  const ctaContainer = document.createElement("div");
  ctaContainer.className = "card_cta_container";
  const ctaButton = document.createElement("button");
  ctaButton.className = "card_cta";
  ctaButton.type = "button";
  ctaButton.textContent = ctaLabel;
  ctaContainer.append(ctaButton);

  content.append(head, tagsWrap, ctaContainer);
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

  const syncCaseStudyCardWidths = () => {
    const cards = Array.from(root.querySelectorAll(".case_study_card"));
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

  const renderCards = (caseStudies = []) => {
    root.replaceChildren(...caseStudies.map((item) => createCaseStudyCard(item)));
    scheduleWidthSync();
  };

  const load = window.LiveCaseStudyData?.loadCaseStudies;
  if (typeof load === "function") {
    load().then(renderCards);
  } else {
    renderCards(window.LiveCaseStudyData?.items || []);
  }

  window.addEventListener("resize", scheduleWidthSync);
  if (typeof desktopQuery.addEventListener === "function") {
    desktopQuery.addEventListener("change", scheduleWidthSync);
  } else if (typeof desktopQuery.addListener === "function") {
    desktopQuery.addListener(scheduleWidthSync);
  }

  if (document.fonts?.ready) {
    document.fonts.ready.then(scheduleWidthSync);
  }
}
