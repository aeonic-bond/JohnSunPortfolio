class ArkCard extends HTMLElement {
  static observedAttributes = ["title", "inner-face"];

  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._intersectionObserver = null;
    this._hasDoneFullReveal = false;
    this._wasAboveTen = false;
    this._wasAboveSeventyFive = false;
    this._wiggleAnimation = null;
  }

  connectedCallback() {
    this.#render();
    this.#revealInnerCardOnAppear();
  }

  disconnectedCallback() {
    this._intersectionObserver?.disconnect?.();
    this._intersectionObserver = null;
  }

  attributeChangedCallback() {
    this.#render();
    if (this.isConnected) this.#revealInnerCardOnAppear();
  }

  get title() {
    return this.getAttribute("title") ?? "";
  }

  #render() {
    const titleText = this.title || "Torus";
    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;

    const finalInnerFace =
      (this.getAttribute("inner-face") || "front").toLowerCase() === "back"
        ? "back"
        : "front";
    const initialInnerFace = prefersReducedMotion
      ? finalInnerFace
      : this._hasDoneFullReveal
        ? "front"
        : "back";

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          max-width: var(--ark-card-max-width, 420px);
          --inner-flip-duration: 1000ms;
          --inner-reset-rotation: -45deg; /* 25% of 180deg */
          position: relative;
          z-index: 2;
        }

        .card {
          border: 1px solid rgba(236, 188, 42, 0.25); /* Saffron-Fade */
          border-radius: 12px; /* Large */
          padding: 16px; /* Spacer500 */
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px; /* Spacer500 */
          overflow: visible;
          perspective: 1000px;
        }

        .inner-rotator {
          width: 100%;
          aspect-ratio: 3 / 4;
          position: relative;
          border: 1px solid #ecbc2a; /* Saffron */
          border-radius: 8px; /* Base */
          box-sizing: border-box;
          transform-style: preserve-3d;
          transition: transform var(--inner-flip-duration) cubic-bezier(0.2, 0.7, 0.2, 1);
          overflow: hidden;
        }

        .inner-side {
          position: absolute;
          inset: 0;
          backface-visibility: hidden;
          border-radius: 8px;
        }

        .inner-front {
          background: #3a3a3a; /* gray */
        }

        .inner-back {
          background: rgba(236, 188, 42, 0.25); /* Saffron-Fade */
          transform: rotateY(-180deg);
        }

        .inner-rotator.is-front {
          transform: rotateY(0deg);
        }

        .inner-rotator.is-back {
          transform: rotateY(-180deg);
        }

        .inner-rotator.is-reset {
          transform: rotateY(var(--inner-reset-rotation));
        }

        .title {
          margin: 0;
          text-align: center;
          color: #ecbc2a; /* Saffron */
          font-family: "Crimson Text", Georgia, serif;
          font-weight: 700;
          font-size: 28px;
          line-height: 1;
          letter-spacing: 0;
        }
      </style>

      <div class="card" part="card" data-node-id="223:127">
        <div
          class="inner-rotator is-${initialInnerFace}"
          part="inner"
          data-node-id="223:128"
          data-inner-final="${finalInnerFace}"
        >
          <div class="inner-side inner-front" part="inner-front"></div>
          <div class="inner-side inner-back" part="inner-back"></div>
        </div>
        <p class="title" part="title" data-node-id="223:132">${escapeHtml(
          titleText,
        )}</p>
      </div>
    `;
  }

  #revealInnerCardOnAppear() {
    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    if (prefersReducedMotion) return;

    const inner = this.shadowRoot?.querySelector?.(".inner-rotator");
    if (!inner) return;

    const finalFace = inner.getAttribute("data-inner-final") || "front";
    if (finalFace !== "front") return;

    const setFace = (face, { instant } = { instant: false }) => {
      const apply = () => {
        inner.classList.toggle("is-front", face === "front");
        inner.classList.toggle("is-back", face === "back");
        inner.classList.toggle("is-reset", face === "reset");
      };

      if (!instant) {
        requestAnimationFrame(apply);
        return;
      }

      const previousTransition = inner.style.transition;
      inner.style.transition = "none";
      apply();
      // Force reflow so the transition reset "sticks".
      void inner.offsetHeight;
      inner.style.transition = previousTransition;
    };

    const flipToFront = () => {
      setFace("front");
    };

    const wiggle = () => {
      // Keep the card on the front face and add a subtle "wiggle" gesture.
      setFace("front", { instant: true });

      this._wiggleAnimation?.cancel?.();
      this._wiggleAnimation = inner.animate(
        [
          { transform: "rotateY(-15deg)", offset: 0 },
          { transform: "rotateY(15deg)", offset: 0.18 },
          { transform: "rotateY(-10deg)", offset: 0.36 },
          { transform: "rotateY(10deg)", offset: 0.54 },
          { transform: "rotateY(-6deg)", offset: 0.72 },
          { transform: "rotateY(6deg)", offset: 0.88 },
          { transform: "rotateY(0deg)", offset: 1 },
        ],
        {
          duration: 1500,
          easing: "cubic-bezier(0.2, 0.7, 0.2, 1)",
        },
      );

      this._wiggleAnimation.addEventListener("finish", () => {
        this._wiggleAnimation = null;
      });
      this._wiggleAnimation.addEventListener("cancel", () => {
        this._wiggleAnimation = null;
      });
    };

    if (typeof IntersectionObserver === "undefined") {
      flipToFront();
      return;
    }

    this._intersectionObserver?.disconnect?.();
    this._intersectionObserver = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry) return;
        const ratio = entry.intersectionRatio ?? 0;
        const isAboveTen = entry.isIntersecting && ratio >= 0.8;
        const isAboveSeventyFive = entry.isIntersecting && ratio >= 0.75;

        if (!this._hasDoneFullReveal) {
          if (isAboveSeventyFive && !this._wasAboveSeventyFive) {
            this._wasAboveSeventyFive = true;
            setFace("back", { instant: true });
            flipToFront();
            this._hasDoneFullReveal = true;
            this._wasAboveTen = isAboveTen;
            return;
          }
        } else {
          if (isAboveTen && !this._wasAboveTen) {
            this._wasAboveTen = true;
            wiggle();
            return;
          }
        }

        // Reset once the card is effectively out of view so it can replay
        // cleanly the next time it appears.
        const isMostlyGone = !entry.isIntersecting || ratio <= 0.05;
        if (isMostlyGone) {
          this._wasAboveSeventyFive = false;
          if (this._hasDoneFullReveal) {
            this._wasAboveTen = false;
            this._wiggleAnimation?.cancel?.();
            setFace("front", { instant: true });
          } else {
            setFace("back", { instant: true });
          }
        }
      },
      { threshold: [0, 0.75, 0.8, 1] },
    );

    this._intersectionObserver.observe(this);
  }
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

customElements.define("ark-card", ArkCard);
