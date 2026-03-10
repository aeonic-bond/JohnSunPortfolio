class IsoTower extends HTMLElement {
  connectedCallback() {
    const label   = this.getAttribute('label') ?? '';
    const bullets = [...this.querySelectorAll('li')].map(li => li.textContent.trim());

    const tilePositions = { 1: [170], 2: [125, 213], 3: [85, 169, 253] };
    const tilesAttr = this.getAttribute('tiles') ?? '1';
    const tileNames = isNaN(tilesAttr) ? tilesAttr.split(' ') : null;
    const tileCount = tileNames ? tileNames.length : parseInt(tilesAttr, 10);
    const REF_WIDTH = 340;
    const positions = (tilePositions[tileCount] ?? tilePositions[1]).map(x => (x / REF_WIDTH * 100).toFixed(2) + '%');
    const tilesHTML = positions.map((x, i) => {
      const src = tileNames
        ? `/Assets/IsoTower/IsoTile${tileNames[i]}.svg`
        : '/Assets/IsoTower/IsoTileResearch.svg';
      return `
      <div class="iso-tile" style="left: ${x}">
        <img class="iso-tile-img" src="${src}" alt="">
      </div>`;
    }).join('');

    const shadow = this.attachShadow({ mode: 'open' });
    shadow.innerHTML = `
      <link rel="stylesheet" href="/Live/towers/iso-tower.css">

      <div class="label-group">
        <div class="tag">${label}</div>
        <ul class="bullets">
          ${bullets.map(b => `
            <li class="bullet">
              <span class="bullet-text">${b}</span>
            </li>
          `).join('')}
        </ul>
      </div>

      <div class="iso-structure">
        <img class="iso-table" src="/Assets/IsoTower/IsoTable.svg" alt="">
        ${tilesHTML}
      </div>
    `;
  }
}

customElements.define('iso-tower', IsoTower);
