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

