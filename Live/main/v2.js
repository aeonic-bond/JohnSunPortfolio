const EXPAND_THRESHOLD = 80;

const updateExpandedState = () => {
  document.body.classList.toggle("is-scrolled", window.scrollY > 0);
  document.body.classList.toggle("is-expanded", window.scrollY > EXPAND_THRESHOLD);
};

window.addEventListener("scroll", updateExpandedState, { passive: true });
updateExpandedState();
