const createCard = ({ title = "Torus" } = {}) => {
  const card = document.createElement("div");
  card.className = "card_div";
  card.dataset.name = "Card";
  card.dataset.nodeId = "223:127";

  const inner = document.createElement("div");
  inner.className = "card_inner_div";
  inner.dataset.name = "Inner Card";
  inner.dataset.nodeId = "223:128";

  const stage = document.createElement("div");
  stage.className = "card_stage_div";

  const media = document.createElement("div");
  media.className = "card_media_div";
  media.dataset.name = "Img. Placeholder";
  media.dataset.nodeId = "224:136";

  const back = document.createElement("div");
  back.className = "card_back_div";
  back.setAttribute("aria-hidden", "true");

  stage.append(media, back);
  inner.append(stage);

  const text = document.createElement("p");
  text.className = "card_title type-h2";
  text.dataset.nodeId = "223:132";
  text.textContent = title;

  card.append(inner, text);
  return card;
};

window.SandboxComponents = window.SandboxComponents || {};
window.SandboxComponents.createCard = createCard;

const setupCardFlipOnEnter = ({
  cardSelector = ".card_div",
  observeSelector = ".card_inner_div",
  threshold = 0.7,
  initialFlipped = true,
} = {}) => {
  const cards = document.querySelectorAll(cardSelector);
  if (!cards.length) return;

  const prefersReducedMotion = window.matchMedia?.(
    "(prefers-reduced-motion: reduce)",
  )?.matches;

  for (const card of cards) {
    if (initialFlipped) card.classList.add("is_flipped");
    if (prefersReducedMotion) card.classList.remove("is_flipped");
  }

  if (prefersReducedMotion) return;

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        if (entry.intersectionRatio < threshold) continue;

        const card = entry.target.closest(cardSelector);
        if (!card) continue;

        card.classList.remove("is_flipped");
        observer.unobserve(entry.target);
      }
    },
    { threshold },
  );

  for (const card of cards) {
    const target = card.querySelector(observeSelector);
    if (target) observer.observe(target);
  }
};

setupCardFlipOnEnter();
