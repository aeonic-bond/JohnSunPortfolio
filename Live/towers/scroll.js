const section = document.querySelector('.towers-scroll');
const el = document.querySelector('iso-towers');
if (section && el) {
  const count = el.querySelectorAll(':scope > iso-tower').length;
  const vhPerTower = 50;
  section.style.height = (count * vhPerTower + vhPerTower) + 'vh';

  function update() {
    const rect = section.getBoundingClientRect();
    const center = window.innerHeight / 2;
    const scrolled = Math.max(0, center - rect.top);
    const totalTravel = section.offsetHeight - center;
    const index = Math.min(count - 1, Math.floor(scrolled / (totalTravel / count)));
    el.setAttribute('active', index);
  }

  window.addEventListener('scroll', update, { passive: true });
  update();
}
