const canvas = document.getElementById('smoke');
const ctx = canvas.getContext('2d');

const dpr = window.devicePixelRatio || 1;
let W = 0, H = 0;

const introSection = document.querySelector('.intro-section');
const introAction = document.querySelector('.intro-button');

function resizeCanvas() {
  W = window.innerWidth;
  H = window.innerHeight;
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.scale(dpr, dpr);

  if (typeof smoke !== 'undefined') {
    smoke.cx = W / 2;
    smoke.cy = H * 0.55;
  }
}
window.addEventListener('resize', resizeCanvas);

// ── Scroll progress: 0 when intro is in view, 1 when fully scrolled past ──
let scrollProgress = 0;

window.addEventListener('scroll', () => {
  const rect = introSection.getBoundingClientRect();
  scrollProgress = Math.min(1, Math.max(0, -rect.top / (introSection.offsetHeight || 1)));
}, { passive: true });

let smoke;
let startTime = null;

function render(timestamp) {
  if (!startTime) startTime = timestamp;
  const t = (timestamp - startTime) / 1000;

  ctx.fillStyle = '#0a0a0a';
  ctx.fillRect(0, 0, W, H);

  const p = easeInOutCubic(Math.min(1, scrollProgress / 0.8));
  const pRamp = easeInCubic(p);

  const scale = 1 - pRamp;
  const irregX = 1 + (Math.sin(t * 2.1 + 0.5) * 0.6 + Math.sin(t * 3.7 + 1.1) * 0.3) * pRamp;
  const irregY = 1 + (Math.cos(t * 1.8 + 1.2) * 0.7 + Math.cos(t * 4.3 + 0.8) * 0.25) * pRamp;
  const scaleX = scale * irregX;
  const scaleY = scale * irregY;

  const blurP = Math.max(0, (p - 0.6) / 0.4);
  const blur = 5 + 35 * (1 - blurP * blurP * blurP);

  const blobStartY = window.innerHeight * 0.55;
  const targetY = window.innerHeight * 0.75;
  const cyOffset = (targetY - blobStartY) * pRamp;

  const currentCy = smoke.cy + cyOffset;

  const offsetPts = smoke.getPoints(t, scaleX, scaleY).map(pt => ({
    x: pt.x,
    y: pt.y + cyOffset,
  }));

  const gcx = smoke.cx
    + Math.sin(t * smoke.gradDriftSpeedX + smoke.gradDriftPhaseX) * smoke.gradDriftAmp * (1 - p * 0.7)
    + Math.cos(t * 0.07 + 1.3) * smoke.gradDriftAmp * 0.4 * (1 - p * 0.7);
  const gcy = currentCy
    + Math.sin(t * smoke.gradDriftSpeedY + smoke.gradDriftPhaseY) * smoke.gradDriftAmp * (1 - p * 0.9)
    + Math.sin(t * 0.09 + 0.7) * smoke.gradDriftAmp * 0.3 * (1 - p * 0.9);

  const gradR = 320 * (1 - p * 0.85);
  const auroraR = 320 * (1 + p * 1.5);
  const auroraBase = 0.85 + Math.sin(t * 0.3) * 0.15 + Math.sin(t * 0.17) * 0.1;
  const auroraScrollBoost = 1 - p * 0.5;

  ctx.save();
  ctx.filter = `blur(${blur}px)`;

  // LAYER 1: Base dark fill
  if (p < 1) {
    ctx.save();
    smoke.buildPath(ctx, offsetPts);
    const rimBrightness = Math.floor(35 * (1 - p));
    const outerBrightness = Math.floor(25 * (1 - p));
    const radGrad = ctx.createRadialGradient(gcx, gcy, 0, gcx, gcy, gradR);
    radGrad.addColorStop(0, 'rgba(7, 7, 7, 1)');
    radGrad.addColorStop(0.5, 'rgba(10, 10, 10, 1)');
    radGrad.addColorStop(0.78, 'rgba(14, 14, 13, 1)');
    radGrad.addColorStop(0.90, 'rgba(4, 4, 4, 1)');
    radGrad.addColorStop(0.96, `rgba(${rimBrightness}, ${rimBrightness}, ${rimBrightness}, 1)`);
    radGrad.addColorStop(1, `rgba(${outerBrightness}, ${outerBrightness}, ${outerBrightness}, 1)`);
    ctx.fillStyle = radGrad;
    ctx.fill();
    ctx.restore();
  }

  // LAYER 2: Aurora bands
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  for (let i = 0; i < 5; i++) {
    const bandAngle = t * (0.08 + i * 0.02) + i * (Math.PI * 2 / 5);
    const bandDist = smoke.baseRadius * (0.25 + 0.15 * Math.sin(t * 0.1 + i * 1.5)) * (1 - p * 0.95);
    const bx = gcx + Math.cos(bandAngle) * bandDist;
    const by = gcy + Math.sin(bandAngle) * bandDist;
    const col = getAuroraColor(i, t, auroraBase * auroraScrollBoost);
    const bandRadius = auroraR * (0.5 + 0.3 * Math.sin(t * 0.13 + i * 2));
    const bandAlpha = 0.22 + 0.08 * Math.sin(t * 0.25 + i * 1.2);

    smoke.buildPath(ctx, offsetPts);
    ctx.save();
    ctx.globalAlpha = bandAlpha;
    const aGrad = ctx.createRadialGradient(bx, by, 0, bx, by, bandRadius);
    aGrad.addColorStop(0, hsla(col.h, col.s * 1.2, col.l * 1.4, 1));
    aGrad.addColorStop(0.3, hsla(col.h + 10, col.s, col.l * 1.1, 0.7));
    aGrad.addColorStop(0.6, hsla(col.h + 20, col.s * 0.8, col.l * 0.7, 0.3));
    aGrad.addColorStop(1, 'hsla(0, 0%, 0%, 0)');
    ctx.fillStyle = aGrad;
    ctx.fill();
    ctx.restore();
  }
  ctx.restore();

  // LAYER 3: Rim glow
  if (p < 0.9) {
    ctx.save();
    const rimAlpha = (0.3 + 0.15 * Math.sin(t * 0.4)) * (1 - p * 0.8);
    const rimHue = (t * 18 + scrollProgress * 120) % 360;
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = rimAlpha;
    smoke.buildPath(ctx, offsetPts);
    ctx.strokeStyle = hsla(rimHue, 55, 35, 1);
    ctx.lineWidth = 3 + Math.sin(t * 0.6) * 1.5;
    ctx.stroke();
    ctx.globalAlpha = rimAlpha * 0.5;
    smoke.buildPath(ctx, offsetPts);
    ctx.strokeStyle = hsla(rimHue + 60, 65, 45, 1);
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();
  }

  ctx.restore(); // end blur filter

  requestAnimationFrame(render);
}

// ── Init after first paint to ensure layout is complete ──
requestAnimationFrame(() => {
  resizeCanvas();
  smoke = new SmokeBlade(W / 2, window.innerHeight * 0.55, 250, 8);
  requestAnimationFrame(render);
});
