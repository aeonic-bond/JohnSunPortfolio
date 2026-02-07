const createCard = ({ title = "Torus" } = {}) => {
  const isTorus = String(title).trim().toLowerCase() === "torus";
  const card = document.createElement("div");
  card.className = "card_div";
  card.dataset.name = "Card";
  card.dataset.nodeId = "223:127";
  if (isTorus) card.dataset.cardKind = "torus";

  const inner = document.createElement("div");
  inner.className = "card_inner_div";
  inner.dataset.name = "Inner Card";
  inner.dataset.nodeId = "223:128";

  const media = document.createElement("div");
  media.className = "card_media_div";
  media.dataset.name = "Img. Placeholder";
  media.dataset.nodeId = "224:136";
  if (isTorus) {
    const picture = document.createElement("picture");
    picture.className = "top_nav_asset";
    const desktopSource = document.createElement("source");
    desktopSource.media = "(min-width: 1024px)";
    desktopSource.srcset = "../assets/Torus/Card/Top%20Nav-D.png";
    const mediaImg = document.createElement("img");
    mediaImg.className = "card_media_img top_nav_img";
    mediaImg.src = "../assets/Torus/Card/Top%20Nav.png";
    mediaImg.alt = "";
    picture.append(desktopSource, mediaImg);
    media.append(picture);

    const bottomPanelImg = document.createElement("img");
    bottomPanelImg.className = "card_media_img bottom_panel_asset";
    bottomPanelImg.src = "../assets/Torus/Card/Bottom%20Panel.png";
    bottomPanelImg.alt = "";
    media.append(bottomPanelImg);
  }

  const back = document.createElement("div");
  back.className = "card_back_div";
  back.setAttribute("aria-hidden", "true");

  inner.append(media, back);

  const text = document.createElement("p");
  text.className = "card_title type-h2";
  text.dataset.nodeId = "223:132";
  text.textContent = title;

  card.append(inner, text);
  return card;
};

window.SandboxComponents = window.SandboxComponents || {};
window.SandboxComponents.createCard = createCard;

const torusHooks = window.SandboxTorusCard || {};

const initialFlip = ({
  cardSelector = ".card_div",
  observeSelector = ".card_inner_div",
  threshold = 0.2,
  initialFlipped = true,
} = {}) => {
  const cards = document.querySelectorAll(cardSelector);
  if (!cards.length) return;

  const prefersReducedMotion = window.matchMedia?.(
    "(prefers-reduced-motion: reduce)",
  )?.matches;

  for (const card of cards) {
    torusHooks.setup?.(card);
    if (initialFlipped) card.classList.add("is_flipped");
    if (prefersReducedMotion) {
      card.classList.remove("is_flipped");
      torusHooks.revealForReducedMotion?.(card);
    }
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
        torusHooks.revealOnFlip?.(card);

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

initialFlip();
