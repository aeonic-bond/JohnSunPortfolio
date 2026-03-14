const canvas = document.getElementById('smoke');
const ctx = canvas.getContext('2d');

const dpr = window.devicePixelRatio || 1;
let W = 0, H = 0;

const introSection = document.querySelector('.intro-section');

function resizeCanvas() {
  W = introSection.offsetWidth;
  H = introSection.offsetHeight;
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.scale(dpr, dpr);
  if (typeof smoke !== 'undefined') {
    smoke.cx = W / 2;
    smoke.cy = H * 0.15;
  }
}
window.addEventListener('resize', resizeCanvas);

// ── Scroll progress over the intro-section's scrollable distance ──
let scrollProgress = 0;

window.addEventListener('scroll', () => {
  const rect = introSection.getBoundingClientRect();
  const scrollable = introSection.offsetHeight - window.innerHeight;
  scrollProgress = scrollable > 0 ? Math.min(1, Math.max(0, -rect.top / scrollable)) : 0;
}, { passive: true });

// ── Aurora color palette ──
const auroraColors = [
  { h: 220, s: 70, l: 30 },
  { h: 270, s: 60, l: 25 },
  { h: 175, s: 65, l: 28 },
  { h: 310, s: 55, l: 22 },
  { h: 145, s: 50, l: 24 },
];

function getAuroraColor(index, t, intensity) {
  const base = auroraColors[index % auroraColors.length];
  const hueDrift = Math.sin(t * 0.15 + index * 1.8) * 25
                 + Math.sin(t * 0.08 + index * 0.7) * 15;
  const satDrift = Math.sin(t * 0.2 + index * 2.1) * 12;
  const lumDrift = Math.sin(t * 0.12 + index * 1.3) * 8;
  const h = base.h + hueDrift;
  const s = Math.max(20, Math.min(90, base.s + satDrift)) * intensity;
  const l = Math.max(8, Math.min(45, base.l + lumDrift)) * intensity;
  return { h, s, l };
}

function hsla(h, s, l, a) {
  return `hsla(${h.toFixed(1)}, ${s.toFixed(1)}%, ${l.toFixed(1)}%, ${a})`;
}

class SmokeBlade {
  constructor(cx, cy, baseRadius, numPoints) {
    this.cx = cx;
    this.cy = cy;
    this.baseRadius = baseRadius;
    this.numPoints = numPoints;

    this.points = [];
    for (let i = 0; i < numPoints; i++) {
      const angle = (i / numPoints) * Math.PI * 2;
      this.points.push({
        angle,
        baseR: baseRadius * (0.75 + Math.random() * 0.5),
        phaseR: Math.random() * Math.PI * 2,
        phaseA: Math.random() * Math.PI * 2,
        speedR: 0.12 + Math.random() * 0.15,
        speedA: 0.06 + Math.random() * 0.1,
        ampR: baseRadius * (0.06 + Math.random() * 0.1),
        ampA: 0.03 + Math.random() * 0.05,
      });
    }

    this.gradDriftPhaseX = Math.random() * Math.PI * 2;
    this.gradDriftPhaseY = Math.random() * Math.PI * 2;
    this.gradDriftSpeedX = 0.12;
    this.gradDriftSpeedY = 0.15;
    this.gradDriftAmp = baseRadius * 0.5;
  }

  getPoints(t, scaleX, scaleY) {
    const pts = [];
    for (const p of this.points) {
      const r = p.baseR
        + Math.sin(t * p.speedR + p.phaseR) * p.ampR
        + Math.sin(t * p.speedR * 0.6 + p.phaseR * 1.4) * p.ampR * 0.4;
      const a = p.angle + Math.sin(t * p.speedA + p.phaseA) * p.ampA;
      pts.push({
        x: this.cx + Math.cos(a) * r * scaleX,
        y: this.cy + Math.sin(a) * r * scaleY,
      });
    }
    return pts;
  }

  buildPath(ctx, pts) {
    const n = pts.length;
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const p0 = pts[(i - 1 + n) % n];
      const p1 = pts[i];
      const p2 = pts[(i + 1) % n];
      const p3 = pts[(i + 2) % n];
      const tension = 0.3;
      const cp1x = p1.x + (p2.x - p0.x) * tension;
      const cp1y = p1.y + (p2.y - p0.y) * tension;
      const cp2x = p2.x - (p3.x - p1.x) * tension;
      const cp2y = p2.y - (p3.y - p1.y) * tension;
      if (i === 0) ctx.moveTo(p1.x, p1.y);
      ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2.x, p2.y);
    }
    ctx.closePath();
  }
}

function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

let smoke;
let startTime = null;

function render(timestamp) {
  if (!startTime) startTime = timestamp;
  const t = (timestamp - startTime) / 1000;

  ctx.fillStyle = '#0a0a0a';
  ctx.fillRect(0, 0, W, H);

  const p = easeInOutCubic(scrollProgress);

  const scaleX = 1 - p * 0.996;
  const targetScaleY = (H * 0.125) / smoke.baseRadius;
  const scaleY = 1 + (targetScaleY - 1) * p;

  const blurP = Math.max(0, (p - 0.6) / 0.4);
  const blur = 40 * (1 - blurP * blurP * blurP);

  const lineBlend = Math.min(1, (p - 0.85) / 0.15);

  const blobStartY = H * 0.15;
  const bladeCenter = H * 0.125;
  const cyOffset = (bladeCenter - blobStartY) * p;
  const cxOffset = (16 - smoke.cx) * p;

  const currentCx = smoke.cx + cxOffset;
  const currentCy = smoke.cy + cyOffset;

  const offsetPts = smoke.getPoints(t, scaleX, scaleY).map(pt => ({
    x: pt.x + cxOffset,
    y: pt.y + cyOffset,
  }));

  const gcx = currentCx
    + Math.sin(t * smoke.gradDriftSpeedX + smoke.gradDriftPhaseX) * smoke.gradDriftAmp * (1 - p * 0.7)
    + Math.cos(t * 0.07 + 1.3) * smoke.gradDriftAmp * 0.4 * (1 - p * 0.7);
  const gcy = currentCy
    + Math.sin(t * smoke.gradDriftSpeedY + smoke.gradDriftPhaseY) * smoke.gradDriftAmp * (1 - p * 0.9)
    + Math.sin(t * 0.09 + 0.7) * smoke.gradDriftAmp * 0.3 * (1 - p * 0.9);

  const gradR = 320 * (1 - p * 0.5);
  const auroraBase = 0.6 + Math.sin(t * 0.3) * 0.15 + Math.sin(t * 0.17) * 0.1;
  const auroraScrollBoost = 1 + p * 0.6;

  ctx.save();
  ctx.filter = `blur(${blur}px)`;

  // LAYER 1: Base dark fill
  if (p < 1) {
    ctx.save();
    smoke.buildPath(ctx, offsetPts);
    const rimBrightness = Math.floor(35 + p * 40);
    const outerBrightness = Math.floor(25 + p * 50);
    const radGrad = ctx.createRadialGradient(gcx, gcy, 0, gcx, gcy, gradR);
    radGrad.addColorStop(0, 'rgba(7, 7, 7, 1)');
    radGrad.addColorStop(0.5, 'rgba(10, 10, 10, 1)');
    radGrad.addColorStop(0.78, 'rgba(14, 14, 13, 1)');
    radGrad.addColorStop(0.90, 'rgba(4, 4, 4, 1)');
    radGrad.addColorStop(0.96, `rgba(${rimBrightness}, ${rimBrightness - 2}, ${rimBrightness - 7}, 1)`);
    radGrad.addColorStop(1, `rgba(${outerBrightness}, ${outerBrightness - 2}, ${outerBrightness - 5}, 1)`);
    ctx.fillStyle = radGrad;
    ctx.fill();
    ctx.restore();
  }

  // LAYER 2: Aurora bands
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 5; i++) {
    const bandAngle = t * (0.08 + i * 0.02) + i * (Math.PI * 2 / 5);
    const bandDist = smoke.baseRadius * (0.25 + 0.15 * Math.sin(t * 0.1 + i * 1.5));
    const bx = gcx + Math.cos(bandAngle) * bandDist * (1 - p * 0.6);
    const by = gcy + Math.sin(bandAngle) * bandDist * (1 - p * 0.5);
    const col = getAuroraColor(i, t, auroraBase * auroraScrollBoost);
    const bandRadius = gradR * (0.5 + 0.3 * Math.sin(t * 0.13 + i * 2));
    const bandAlpha = (0.12 + 0.06 * Math.sin(t * 0.25 + i * 1.2)) * (1 - lineBlend);

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
    ctx.globalCompositeOperation = 'lighter';
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

  // LAYER 4: Linear blade fill
  if (p > 0) {
    let minY = Infinity, maxY = -Infinity;
    for (const pt of offsetPts) {
      if (pt.y < minY) minY = pt.y;
      if (pt.y > maxY) maxY = pt.y;
    }
    const rimBrightness = Math.floor(35 + p * 40);
    const outerBrightness = Math.floor(25 + p * 50);
    ctx.save();
    ctx.globalAlpha = p * (1 - lineBlend);
    smoke.buildPath(ctx, offsetPts);
    const linGrad = ctx.createLinearGradient(currentCx, minY - 20, currentCx, maxY + 20);
    linGrad.addColorStop(0, 'rgba(4, 4, 4, 1)');
    linGrad.addColorStop(0.3, 'rgba(10, 10, 10, 1)');
    linGrad.addColorStop(0.7, `rgba(${rimBrightness}, ${rimBrightness - 2}, ${rimBrightness - 7}, 1)`);
    linGrad.addColorStop(1, `rgba(${outerBrightness + 15}, ${outerBrightness + 12}, ${outerBrightness + 5}, 1)`);
    ctx.fillStyle = linGrad;
    ctx.fill();
    ctx.restore();

    if (p > 0.3) {
      const bladeHue = (t * 20) % 360;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = (p - 0.3) * 0.25 * (1 - lineBlend);
      smoke.buildPath(ctx, offsetPts);
      const auroraLinGrad = ctx.createLinearGradient(currentCx, minY, currentCx, maxY);
      auroraLinGrad.addColorStop(0, hsla(bladeHue, 50, 15, 0));
      auroraLinGrad.addColorStop(0.3, hsla(bladeHue + 40, 60, 25, 0.8));
      auroraLinGrad.addColorStop(0.6, hsla(bladeHue + 120, 55, 20, 0.6));
      auroraLinGrad.addColorStop(1, hsla(bladeHue + 200, 50, 25, 0.9));
      ctx.fillStyle = auroraLinGrad;
      ctx.fill();
      ctx.restore();
    }
  }

  // LAYER 5: Blade line (grows from center)
  if (lineBlend > 0) {
    const bladeFullTop = 0;
    const bladeFullBottom = H * 0.4;
    const bladeMid = (bladeFullTop + bladeFullBottom) / 2;
    const bladeTop = bladeMid - (bladeMid - bladeFullTop) * lineBlend;
    const bladeBottom = bladeMid + (bladeFullBottom - bladeMid) * lineBlend;
    const bladeHue = (t * 22) % 360;

    ctx.save();
    ctx.globalAlpha = lineBlend * 0.4;
    const lineGrad = ctx.createLinearGradient(currentCx, bladeTop, currentCx, bladeBottom);
    lineGrad.addColorStop(0, 'rgba(4, 4, 4, 0)');
    lineGrad.addColorStop(0.1, hsla(bladeHue, 40, 12, 0.8));
    lineGrad.addColorStop(0.3, hsla(bladeHue + 60, 55, 30, 1));
    lineGrad.addColorStop(0.55, hsla(bladeHue + 140, 60, 35, 1));
    lineGrad.addColorStop(0.8, hsla(bladeHue + 220, 50, 28, 1));
    lineGrad.addColorStop(1, hsla(bladeHue + 280, 45, 32, 0.9));
    ctx.strokeStyle = lineGrad;
    ctx.lineWidth = 1.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(currentCx, bladeTop);
    ctx.lineTo(currentCx, bladeBottom);
    ctx.stroke();

    ctx.globalAlpha = lineBlend * 0.12;
    const glowGrad = ctx.createLinearGradient(currentCx, bladeTop, currentCx, bladeBottom);
    glowGrad.addColorStop(0, 'rgba(4, 4, 4, 0)');
    glowGrad.addColorStop(0.3, hsla(bladeHue + 60, 45, 20, 0.6));
    glowGrad.addColorStop(0.6, hsla(bladeHue + 140, 50, 25, 0.5));
    glowGrad.addColorStop(1, hsla(bladeHue + 220, 40, 18, 0.4));
    ctx.strokeStyle = glowGrad;
    ctx.lineWidth = 8;
    ctx.stroke();
    ctx.restore();
  }

  ctx.restore();

  requestAnimationFrame(render);
}

// ── Init after first paint to ensure layout is complete ──
requestAnimationFrame(() => {
  resizeCanvas();
  smoke = new SmokeBlade(W / 2, H * 0.15, 250, 8);
  requestAnimationFrame(render);
});
