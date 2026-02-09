const createCaseStudyCard = ({
  kind = "",
  title = "Title",
  description = "Default decscription text",
  ctaLabel = "Read",
  media,
} = {}) => {
  const wrapper = document.createElement("article");
  wrapper.className = "case_study_div";

  const card = document.createElement("div");
  card.className = "card_div";
  if (kind) card.dataset.cardKind = kind;

  const inner = document.createElement("div");
  inner.className = "card_inner_div";

  const mediaEl = document.createElement("div");
  mediaEl.className = "card_media_div";
  mediaEl.setAttribute("aria-hidden", "true");
  window.LiveCaseStudyData?.renderCardMedia?.({
    kind,
    mediaRoot: mediaEl,
    media,
  });
  inner.append(mediaEl);

  const titleEl = document.createElement("h2");
  titleEl.className = "card_title type-h2";
  titleEl.textContent = title;

  card.append(inner, titleEl);

  const footer = document.createElement("div");
  footer.className = "card_footer_div";

  const descriptionEl = document.createElement("p");
  descriptionEl.className = "card_description type-body2";
  descriptionEl.textContent = description;

  const ctaButton = document.createElement("button");
  ctaButton.className = "card_cta_button type-action";
  ctaButton.type = "button";
  ctaButton.textContent = ctaLabel;

  footer.append(descriptionEl, ctaButton);
  wrapper.append(card, footer);

  return wrapper;
};

window.LiveComponents = window.LiveComponents || {};
window.LiveComponents.createCaseStudyCard = createCaseStudyCard;

const root = document.getElementById("case-studies-root");
if (root) {
  const caseStudies = window.LiveCaseStudyData?.items || [];
  root.append(...caseStudies.map((item) => createCaseStudyCard(item)));
  window.LiveCardAnimation?.initializeCaseStudyFlip?.();
}
