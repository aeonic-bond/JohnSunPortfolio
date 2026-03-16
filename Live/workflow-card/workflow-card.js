class WorkflowCard extends HTMLElement {
  static get observedAttributes() {
    return ['title', 'body'];
  }

  connectedCallback() {
    this._render();
  }

  attributeChangedCallback() {
    if (this.shadowRoot) this._render();
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
