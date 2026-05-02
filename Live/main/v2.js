if ("scrollRestoration" in history) {
  history.scrollRestoration = "manual";
}

const savedScroll = (() => {
  try {
    const raw = sessionStorage.getItem("v2.home.scroll");
    if (raw === null) return 0;
    sessionStorage.removeItem("v2.home.scroll");
    const n = parseInt(raw, 10);
    return Number.isFinite(n) ? n : 0;
  } catch {
    return 0;
  }
})();

const EXPAND_THRESHOLD = 80;

const updateExpandedState = () => {
  document.body.classList.toggle("is-scrolled", window.scrollY > 0);
  document.body.classList.toggle("is-expanded", window.scrollY > EXPAND_THRESHOLD);
};

const enableTransitions = () => {
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      document.body.classList.remove("v2-no-transition");
    });
  });
};

// Suppress animations for the entire initial state + scroll restore.
document.body.classList.add("v2-no-transition");

if (savedScroll > 0) {
  // Best-effort immediate scroll (page may be short before cards load).
  window.scrollTo(0, savedScroll);
  updateExpandedState();

  // MutationObserver fires the moment renderCards calls replaceChildren —
  // exactly when the page reaches full height. No timeout needed.
  const root = document.getElementById("case-studies-root");
  if (root) {
    const observer = new MutationObserver(() => {
      observer.disconnect();
      requestAnimationFrame(() => {
        window.scrollTo(0, savedScroll);
        updateExpandedState();
        enableTransitions();
      });
    });
    observer.observe(root, { childList: true });
  } else {
    enableTransitions();
  }
} else {
  window.scrollTo(0, 0);
  updateExpandedState();
  enableTransitions();
}

window.addEventListener("scroll", updateExpandedState, { passive: true });

window.addEventListener("pagehide", () => {
  try {
    sessionStorage.setItem("v2.home.scroll", String(window.scrollY));
  } catch {}
});
