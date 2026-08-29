/* ============================================================
   OnePercent — charts.js
   Minimal canvas chart primitives. No external chart library.
   ============================================================ */

function cssVar(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function setupHiDPICanvas(canvas, cssWidth, cssHeight) {
  const ratio = window.devicePixelRatio || 1;
  canvas.width = cssWidth * ratio;
  canvas.height = cssHeight * ratio;
  canvas.style.width = cssWidth + 'px';
  canvas.style.height = cssHeight + 'px';
  const ctx = canvas.getContext('2d');
  ctx.scale(ratio, ratio);
  return ctx;
}

/**
 * Draws a simple bar chart.
 * data: [{ label, value, sub }]
 */
function drawBarChart(canvas, data, { maxValue, accent } = {}) {
  const rect = canvas.parentElement.getBoundingClientRect();
  const width = Math.max(240, rect.width);
  const height = canvas.dataset.height ? Number(canvas.dataset.height) : 200;
  const ctx = setupHiDPICanvas(canvas, width, height);
  ctx.clearRect(0, 0, width, height);

  const barColor = accent || cssVar('--accent') || '#2f6f4e';
  const trackColor = cssVar('--track') || 'rgba(120,130,120,0.15)';
  const textColor = cssVar('--text-muted') || '#6b7369';

  const padTop = 12, padBottom = 28, padSide = 8;
  const chartH = height - padTop - padBottom;
  const n = data.length;
  const gap = 14;
  const barW = Math.min(34, (width - padSide * 2 - gap * (n - 1)) / n);
  const totalW = barW * n + gap * (n - 1);
  const startX = (width - totalW) / 2;

  const max = maxValue || Math.max(1, ...data.map(d => d.value));

  ctx.font = '11px "Manrope", sans-serif';
  ctx.textAlign = 'center';

  data.forEach((d, i) => {
    const x = startX + i * (barW + gap);
    const h = max > 0 ? (d.value / max) * chartH : 0;
    const y = padTop + (chartH - h);

    // track
    ctx.fillStyle = trackColor;
    roundRect(ctx, x, padTop, barW, chartH, 6);
    ctx.fill();

    // bar
    if (h > 0) {
      ctx.fillStyle = barColor;
      roundRect(ctx, x, y, barW, Math.max(h, 3), 6);
      ctx.fill();
    }

    // label
    ctx.fillStyle = textColor;
    ctx.fillText(d.label, x + barW / 2, height - 10);
  });
}

function roundRect(ctx, x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

/**
 * Draws a progress ring with a centered percentage label.
 */
function drawProgressRing(canvas, percent, { size = 96, stroke = 10, accent } = {}) {
  const ctx = setupHiDPICanvas(canvas, size, size);
  ctx.clearRect(0, 0, size, size);
  const cx = size / 2, cy = size / 2, r = (size - stroke) / 2;
  const trackColor = cssVar('--track') || 'rgba(120,130,120,0.15)';
  const barColor = accent || cssVar('--accent') || '#2f6f4e';

  ctx.lineCap = 'round';
  ctx.lineWidth = stroke;

  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.strokeStyle = trackColor;
  ctx.stroke();

  const frac = Math.max(0, Math.min(1, percent / 100));
  ctx.beginPath();
  ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + frac * Math.PI * 2);
  ctx.strokeStyle = barColor;
  ctx.stroke();
}
