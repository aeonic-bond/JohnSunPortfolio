// ── Easing ──

function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function easeInCubic(t) {
  return t * t * t;
}

// ── Aurora color helpers ──

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

// ── SmokeBlade class ──

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

// ── Blade canvas ──

const _bladeDpr = window.devicePixelRatio || 1;
let bladeCanvas, bCtx, VW = 0, VH = 0;

function initBladeCanvas() {
  bladeCanvas = document.createElement('canvas');
  bladeCanvas.className = 'blade-canvas';
  document.body.appendChild(bladeCanvas);
  bCtx = bladeCanvas.getContext('2d');
}

function resizeBladeCanvas() {
  VW = window.innerWidth;
  VH = window.innerHeight;
  bladeCanvas.width = VW * _bladeDpr;
  bladeCanvas.height = VH * _bladeDpr;
  bCtx.setTransform(1, 0, 0, 1, 0, 0);
  bCtx.scale(_bladeDpr, _bladeDpr);
}

function renderBlade(bladeCx, lineBlend, t) {
  bCtx.clearRect(0, 0, VW, VH);
  if (lineBlend <= 0) return;

  const bladeFullTop = 0;
  const bladeFullBottom = VH * 0.4;
  const bladeMid = (bladeFullTop + bladeFullBottom) / 2;
  const bladeTop = bladeMid - (bladeMid - bladeFullTop) * lineBlend;
  const bladeBottom = bladeMid + (bladeFullBottom - bladeMid) * lineBlend;
  const bladeHue = (t * 22) % 360;

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
