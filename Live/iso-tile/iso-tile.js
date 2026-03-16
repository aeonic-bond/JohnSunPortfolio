let _tileCount = 0;

class IsoTile extends HTMLElement {
  static get observedAttributes() {
    return ['icon', 'stroke', 'stroke-from', 'stroke-to', 'stroke-stops'];
  }

  connectedCallback() {
    this._uid = ++_tileCount;
    this._render();
  }

  attributeChangedCallback() {
    if (this.shadowRoot) this._render();
  }

  _render() {
    const icon  = this.getAttribute('icon') ?? '';
    const solid = this.getAttribute('stroke') ?? 'var(--color-accent)';
    const gid   = `iso-stroke-${this._uid}`;

    let stops = null;
    const stopsAttr = this.getAttribute('stroke-stops');
    const from = this.getAttribute('stroke-from');
    const to   = this.getAttribute('stroke-to');

    if (stopsAttr) {
      try { stops = JSON.parse(stopsAttr); } catch {}
    } else if (from !== null && to !== null) {
      stops = [{ offset: '0%', color: from }, { offset: '100%', color: to }];
    }

    const useGradient = stops !== null && stops.length >= 2;
    const tileStyle = useGradient ? '' : `--_stroke-color:${solid}`;

    const strokeDef = useGradient ? `
      <defs>
        <linearGradient id="${gid}" x1="0" y1="0" x2="39" y2="54" gradientUnits="userSpaceOnUse">
          ${stops.map(s => `<stop offset="${s.offset}" style="stop-color:${s.color}"/>`).join('')}
        </linearGradient>
      </defs>` : '';

    const pathStyle = useGradient ? `style="stroke:url(#${gid})"` : '';

    if (!this.shadowRoot) this.attachShadow({ mode: 'open' });

    this.shadowRoot.innerHTML = `
      <link rel="stylesheet" href="/Live/iso-tile/iso-tile.css">
      <div class="tile" style="${tileStyle}">
        <div class="extrusion">
          <img src="/Assets/IsoTile/Extrusion.svg" alt="">
        </div>
        <svg class="stroke" viewBox="0 0 39 54" fill="none" xmlns="http://www.w3.org/2000/svg">
          ${strokeDef}
          <path d="M25.2451 1.29817C27.4419 0.0227104 30.1246 -0.0959237 32.4248 0.98176L34.2881 1.85481C37.0109 3.13049 38.75 5.86656 38.75 8.87336V33.6868C38.75 36.4489 37.2802 39.0031 34.8916 40.39L14.2275 52.387C11.7822 53.8067 8.7577 53.7821 6.33594 52.3226L3.99902 50.9134C1.6726 49.511 0.250093 46.9931 0.25 44.2767V20.2728C0.25 17.5107 1.71977 14.9565 4.1084 13.5696L25.2451 1.29817Z" ${pathStyle}/>
        </svg>
        <div class="mount">
          <img src="/Assets/IsoTile/Mount.svg" alt="">
        </div>
        <div class="icon">
          ${icon ? `<img src="${icon}" alt="">` : ''}
        </div>
      </div>
    `;
  }
}

customElements.define('iso-tile', IsoTile);
