class WorkflowCard extends HTMLElement {
  static get observedAttributes() {
    return ['title', 'body'];
  }

  connectedCallback() {
    this._render();
    this._observeCard();
  }

  disconnectedCallback() {
    this._cardObserver?.disconnect();
  }

  attributeChangedCallback() {
    if (this.shadowRoot) this._render();
  }

  _observeCard() {
    const firstTile = this.querySelector('iso-tile');
    if (!firstTile) return;
    this._cardObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const delay = firstTile.style.getPropertyValue('--stroke-stagger-delay') || '0s';
            this.style.setProperty('--card-raise-delay', delay);
            this.classList.add('card-raised');
          } else if (entry.boundingClientRect.top > 0) {
            this.style.removeProperty('--card-raise-delay');
            this.classList.remove('card-raised');
          }
        }
      },
      { rootMargin: '0px 0px -30% 0px' }
    );
    this._cardObserver.observe(firstTile);
  }

  _render() {
    const title = this.getAttribute('title') ?? '';
    const body  = this.getAttribute('body') ?? '';

    if (!this.shadowRoot) this.attachShadow({ mode: 'open' });

    this.shadowRoot.innerHTML = `
      <link rel="stylesheet" href="/Live/workflow-card/workflow-card.css">
      <div class="card">
        <div class="tile"><slot></slot></div>
        <div class="text">
          <p class="title">${title}</p>
          <p class="body">${body}</p>
        </div>
      </div>
    `;
  }
}

customElements.define('workflow-card', WorkflowCard);
