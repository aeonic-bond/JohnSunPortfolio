const canvas = document.getElementById('smoke');
const ctx = canvas.getContext('2d');

// Fixed-position canvas for the sticky blade line
const bladeCanvas = document.createElement('canvas');
bladeCanvas.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:100;';
document.body.appendChild(bladeCanvas);
const bCtx = bladeCanvas.getContext('2d');

const dpr = window.devicePixelRatio || 1;
let W = 0, H = 0;
let VW = 0, VH = 0;

const introSection = document.querySelector('.intro-section');
const introGroup = document.querySelector('.intro-group');
const introAction = document.querySelector('.intro-action');

let bladeTargetX = 0;

function updateBladeTarget() {
  const groupRect = introGroup.getBoundingClientRect();
  const sectionRect = introSection.getBoundingClientRect();
  bladeTargetX = groupRect.left - sectionRect.left + introGroup.offsetWidth / 2;
}

function resizeCanvas() {
  W = introSection.offsetWidth;
  H = introSection.offsetHeight;
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.scale(dpr, dpr);

  VW = window.innerWidth;
  VH = window.innerHeight;
  bladeCanvas.width = VW * dpr;
  bladeCanvas.height = VH * dpr;
  bCtx.setTransform(1, 0, 0, 1, 0, 0);
  bCtx.scale(dpr, dpr);

  updateBladeTarget();
  if (typeof smoke !== 'undefined') {
    smoke.cx = W / 2;
    smoke.cy = window.innerHeight * 0.66;
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

function easeInCubic(t) {
  return t * t * t;
}

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

  const lineBlendRaw = Math.min(1, (p - 0.85) / 0.15);
  const lineBlend = easeInCubic(Math.min(1, Math.max(0, (p - 0.85) / 0.15)));

  const blobStartY = window.innerHeight * 0.66;
  const targetY = window.innerHeight * 0.75;
  const cyOffset = (targetY - blobStartY) * pRamp;
  const cxOffset = (bladeTargetX - smoke.cx) * pRamp;

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

  const gradR = 320 * (1 - p * 0.85);
  const auroraR = 320 * (1 + p * 1.5);
  const auroraBase = 0.6 + Math.sin(t * 0.3) * 0.15 + Math.sin(t * 0.17) * 0.1;
  const auroraScrollBoost = 1 + p * 1.2;

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
    const bandAlpha = (0.12 + 0.06 * Math.sin(t * 0.25 + i * 1.2)) * (1 - lineBlendRaw);

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

  // LAYER 5: Blade line — drawn on fixed-position canvas (sticky)
  bCtx.clearRect(0, 0, VW, VH);
  if (lineBlend > 0) {
    const bladeFullTop = 0;
    const bladeFullBottom = VH * 0.4;
    const bladeMid = (bladeFullTop + bladeFullBottom) / 2;
    const bladeTop = bladeMid - (bladeMid - bladeFullTop) * lineBlend;
    const bladeBottom = bladeMid + (bladeFullBottom - bladeMid) * lineBlend;
    const bladeHue = (t * 22) % 360;

    // blade X is bladeTargetX offset from section left edge, converted to viewport X
    const sectionLeft = introSection.getBoundingClientRect().left;
    const bladeCx = sectionLeft + bladeTargetX;

    bCtx.save();
    bCtx.globalAlpha = lineBlend * 0.4;
    bCtx.filter = `blur(${20 * (1 - lineBlend)}px)`;
    const lineGrad = bCtx.createLinearGradient(bladeCx, bladeTop, bladeCx, bladeBottom);
    lineGrad.addColorStop(0, 'rgba(4, 4, 4, 0)');
    lineGrad.addColorStop(0.1, hsla(bladeHue, 65, 35, 0.9));
    lineGrad.addColorStop(0.3, hsla(bladeHue + 60, 75, 50, 1));
    lineGrad.addColorStop(0.55, hsla(bladeHue + 140, 72, 52, 1));
    lineGrad.addColorStop(0.8, hsla(bladeHue + 220, 68, 45, 1));
    lineGrad.addColorStop(1, hsla(bladeHue + 280, 65, 48, 0.9));
    bCtx.strokeStyle = lineGrad;
    bCtx.lineWidth = 1.5;
    bCtx.lineCap = 'round';
    bCtx.beginPath();
    bCtx.moveTo(bladeCx, bladeTop);
    bCtx.lineTo(bladeCx, bladeBottom);
    bCtx.stroke();

    bCtx.globalAlpha = lineBlend * 0.12;
    bCtx.filter = 'blur(6px)';
    const glowGrad = bCtx.createLinearGradient(bladeCx, bladeTop, bladeCx, bladeBottom);
    glowGrad.addColorStop(0, 'rgba(4, 4, 4, 0)');
    glowGrad.addColorStop(0.3, hsla(bladeHue + 60, 70, 40, 0.6));
    glowGrad.addColorStop(0.6, hsla(bladeHue + 140, 68, 42, 0.5));
    glowGrad.addColorStop(1, hsla(bladeHue + 220, 62, 38, 0.4));
    bCtx.strokeStyle = glowGrad;
    bCtx.lineWidth = 8;
    bCtx.stroke();
    bCtx.restore();
  }

requestAnimationFrame(render);
}

// ── Init after first paint to ensure layout is complete ──
requestAnimationFrame(() => {
  resizeCanvas();
  updateBladeTarget();
  smoke = new SmokeBlade(W / 2, window.innerHeight * 0.66, 250, 8);
  requestAnimationFrame(render);
});
