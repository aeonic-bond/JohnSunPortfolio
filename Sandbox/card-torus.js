const isTorusCard = (card) =>
  card instanceof HTMLElement && card.dataset.cardKind === "torus";

const setupTorusCard = (card) => {
  if (!isTorusCard(card)) return;
  card.classList.remove("media_revealed");
  card.classList.remove("bottom_panel_revealed");
};

const revealTorusForReducedMotion = (card) => {
  if (!isTorusCard(card)) return;
  card.classList.add("media_revealed");
  card.classList.add("bottom_panel_revealed");
};

const triggerTorusFlipReveal = (card) => {
  if (!isTorusCard(card)) return;

  setTimeout(() => {
    if (!card.classList.contains("is_flipped")) {
      card.classList.add("media_revealed");
    }
  }, 100);

  setTimeout(() => {
    if (!card.classList.contains("is_flipped")) {
      card.classList.add("bottom_panel_revealed");
    }
  }, 200);
};

window.SandboxTorusCard = {
  setup: setupTorusCard,
  revealForReducedMotion: revealTorusForReducedMotion,
  revealOnFlip: triggerTorusFlipReveal,
};
