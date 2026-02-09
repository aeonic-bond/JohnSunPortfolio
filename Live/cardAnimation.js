const initializeCaseStudyFlip = ({
  cardSelector = ".card_div",
  observeSelector = ".card_inner_div",
  threshold = 0.05,
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

window.LiveCardAnimation = window.LiveCardAnimation || {};
window.LiveCardAnimation.initializeCaseStudyFlip = initializeCaseStudyFlip;
