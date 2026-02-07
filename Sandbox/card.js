const createCard = ({ title = "Torus" } = {}) => {
  const card = document.createElement("div");
  card.className = "card_div";
  card.dataset.name = "Card";
  card.dataset.nodeId = "223:127";

  const inner = document.createElement("div");
  inner.className = "card_inner_div";
  inner.dataset.name = "Inner Card";
  inner.dataset.nodeId = "223:128";

  const media = document.createElement("div");
  media.className = "card_media_div";
  media.dataset.name = "Img. Placeholder";
  media.dataset.nodeId = "224:136";

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

const shakeOnce = (cardInner) => {
  if (!(cardInner instanceof HTMLElement)) return;
  if (cardInner.classList.contains("is_shaking")) return;

  cardInner.classList.add("is_shaking");
  cardInner.addEventListener(
    "animationend",
    () => {
      cardInner.classList.remove("is_shaking");
    },
    { once: true },
  );
};

const initialFlip = ({
  cardSelector = ".card_div",
  observeSelector = ".card_inner_div",
  threshold = 0.7,
  shakeThreshold = 0.8,
  shakeCooldownMs = 1000,
  initialFlipped = true,
} = {}) => {
  const cards = document.querySelectorAll(cardSelector);
  if (!cards.length) return;

  const prefersReducedMotion = window.matchMedia?.(
    "(prefers-reduced-motion: reduce)",
  )?.matches;

  const lastShakeAt = new WeakMap();

  const shakeObserver = prefersReducedMotion
    ? null
    : new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (!entry.isIntersecting) continue;
            if (entry.intersectionRatio < shakeThreshold) continue;

            const card = entry.target.closest(cardSelector);
            if (!card) continue;
            if (card.classList.contains("is_flipped")) continue;
            if (entry.target.dataset.flipDone !== "true") continue;

            const now = Date.now();
            const last = lastShakeAt.get(entry.target) ?? 0;
            if (now - last < shakeCooldownMs) continue;
            lastShakeAt.set(entry.target, now);

            shakeOnce(entry.target);
          }
        },
        { threshold: shakeThreshold },
      );

  for (const card of cards) {
    const inner = card.querySelector(observeSelector);
    if (inner instanceof HTMLElement) inner.dataset.flipDone = "false";
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

        const inner = entry.target;
        const onFlipEnd = (event) => {
          if (event.propertyName !== "transform") return;
          if (card.classList.contains("is_flipped")) return;
          if (!(inner instanceof HTMLElement)) return;

          inner.dataset.flipDone = "true";
          shakeObserver?.observe(inner);
        };

        if (inner instanceof HTMLElement) {
          inner.addEventListener("transitionend", onFlipEnd, { once: true });
          setTimeout(() => {
            if (card.classList.contains("is_flipped")) return;
            inner.dataset.flipDone = "true";
            shakeObserver?.observe(inner);
          }, 900); // slightly longer than the 800ms flip transition
        }

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
