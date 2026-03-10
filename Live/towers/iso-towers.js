class IsoTowers extends HTMLElement {
  static get observedAttributes() { return ['active']; }

  connectedCallback() {
    const shadow = this.attachShadow({ mode: 'open' });
    shadow.innerHTML = `
      <link rel="stylesheet" href="/Live/towers/iso-towers.css">
      <div class="stage">
        <slot></slot>
      </div>
    `;
    this.update();
  }

  attributeChangedCallback() {
    this.update();
  }

  update() {
    if (!this.shadowRoot) return;

    const towers = [...this.querySelectorAll(':scope > iso-tower')];
    const activeIndex = parseInt(this.getAttribute('active') ?? '0', 10);

    const STEP_X = 168;
    const STEP_Y = 180;

    towers.forEach((tower, i) => {
      const n = i - activeIndex;

      if (n === 0) {
        tower.removeAttribute('state');
        tower.style.transform = 'translate(0, 0)';
      } else {
        tower.setAttribute('state', n > 0 && n === 1 ? 'ghost1' : 'ghost2');
        tower.style.transform = `translate(${n * STEP_X}px, ${n * STEP_Y}px)`;
      }
    });
  }
}

customElements.define('iso-towers', IsoTowers);
