const createCaseStudyCard = ({
  kind = "",
  title = "Title",
  description = "Default decscription text",
  ctaLabel = "Read",
  href = "",
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
  titleEl.className = "card_title";
  titleEl.textContent = title;

  const titleDiv = document.createElement("div");
  titleDiv.className = "card_title_div";
  titleDiv.append(titleEl);

  card.append(inner, titleDiv);

  const footer = document.createElement("div");
  footer.className = "card_footer_div";

  const descriptionEl = document.createElement("p");
  descriptionEl.className = "card_description type-body2";
  descriptionEl.textContent = description;

  const ctaButton = document.createElement("button");
  ctaButton.className = "card_cta_button type-action";
  ctaButton.type = "button";
  ctaButton.textContent = ctaLabel;

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
    ctaButton.addEventListener("click", navigate);
  }

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
