/* Homepage-only behaviour. Everything the section pages also need - navbar,
   mobile menu, floats, reveal, smooth anchors, footer year - moved to
   chrome.js, which this file imports from. */

import { reduceMotion, io, measure } from './chrome.js';

/* ── HERO ENTRANCE + STAT COUNTERS ──────────────────────────────────────
      The stats are above the fold, so the counters ride the end of the
      entrance sequence rather than waiting on an observer. Under reduced
      motion the real figures are already in the markup and stay put. ── */
(function () {
  const wrap = document.querySelector('.hero-wrap');
  if (!wrap) return;

  const start = () => {
    wrap.classList.add('hero-in');
    if (reduceMotion) return;
    document.querySelectorAll('.cnt').forEach(el => {
      const to = +el.dataset.to;
      if (!to) return;
      el.textContent = '0';
      const t0 = performance.now(), dur = 1000;
      const tick = now => {
        const p = Math.min((now - t0) / dur, 1);
        el.textContent = Math.round(to * (1 - Math.pow(1 - p, 3)));
        if (p < 1) requestAnimationFrame(tick);
        else el.textContent = to;
      };
      setTimeout(() => requestAnimationFrame(tick), 780);
    });
  };

  if (document.readyState === 'complete') start();
  else addEventListener('load', start, { once: true });
  /* Belt and braces: if load never fires, show the hero anyway. */
  setTimeout(() => wrap.classList.add('hero-in'), 1600);
})();


/* ── HERO ROTATOR — slower hold so it is never caught mid-word ── */
(function () {
  const el = document.getElementById('rotator-text');
  if (!el || reduceMotion) return;
  const lines = [
    'JIG FIXTURES \u00b7 PRESS TOOLS \u00b7 MOULDS \u00b7 GAUGES',
    'BLANKING \u00b7 PIERCING \u00b7 FORMING \u00b7 PROGRESSIVE DIES',
    'DRAWING IN \u2192 REVIEW IN 24 HRS \u2192 TOOL OUT',
    'PADI \u00b7 CHENNAI \u00b7 MADE IN INDIA'
  ];
  let li = 0, ci = lines[0].length, del = false;
  setTimeout(function tick() {
    const t = lines[li];
    if (del) {
      ci--; el.textContent = t.substring(0, ci);
      if (ci === 0) { del = false; li = (li + 1) % lines.length; return setTimeout(tick, 420); }
      return setTimeout(tick, 16);
    }
    ci++; el.textContent = lines[li].substring(0, ci);
    if (ci === lines[li].length) { del = true; return setTimeout(tick, 4600); }
    setTimeout(tick, 40);
  }, 4600);
})();

/* ── HERO CANVAS — grid painted once to an offscreen layer, DPR-aware ── */
(function () {
  const cv = document.getElementById('hero-canvas');
  if (!cv) return;
  const ctx = cv.getContext('2d');
  let W, H, dpr = 1, raf = null, t = 0, grid = null;
  const motes = [];

  function buildGrid() {
    grid = document.createElement('canvas');
    grid.width = cv.width; grid.height = cv.height;
    const g = grid.getContext('2d');
    g.scale(dpr, dpr);
    g.strokeStyle = 'rgba(77,141,255,.05)'; g.lineWidth = 1;
    for (let x = .5; x < W; x += 36) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.stroke(); }
    for (let y = .5; y < H; y += 36) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
    g.strokeStyle = 'rgba(77,141,255,.09)';
    for (let x = .5; x < W; x += 180) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.stroke(); }
    for (let y = .5; y < H; y += 180) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
  }

  function resize() {
    dpr = Math.min(devicePixelRatio || 1, 2);
    W = cv.offsetWidth; H = cv.offsetHeight;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    motes.length = 0;
    for (let i = 0; i < 26; i++) motes.push({
      x: Math.random() * W, y: Math.random() * H,
      vx: (Math.random() - .5) * .22, vy: (Math.random() - .5) * .22,
      r: Math.random() * 1.3 + .4, a: Math.random() * .35 + .08
    });
    buildGrid();
  }
  resize();
  addEventListener('resize', resize, { passive: true });

  function frame() {
    t += .004;
    ctx.clearRect(0, 0, W, H);
    if (grid) ctx.drawImage(grid, 0, 0, W, H);

    const cx = W * .5 + Math.sin(t) * W * .34, cy = H * .42 + Math.cos(t * .7) * H * .26;
    ctx.strokeStyle = 'rgba(245,166,35,.16)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(cx, 0); ctx.lineTo(cx, H); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, cy); ctx.lineTo(W, cy); ctx.stroke();
    ctx.strokeStyle = 'rgba(245,166,35,.4)';
    ctx.beginPath(); ctx.arc(cx, cy, 9, 0, Math.PI * 2); ctx.stroke();
    ctx.font = '10px IBM Plex Mono, monospace'; ctx.fillStyle = 'rgba(245,166,35,.35)';
    ctx.fillText('X' + (cx | 0) + ' Y' + (cy | 0), cx + 14, cy - 8);

    for (const p of motes) {
      p.x += p.vx; p.y += p.vy;
      if (p.x < 0) p.x = W; if (p.x > W) p.x = 0;
      if (p.y < 0) p.y = H; if (p.y > H) p.y = 0;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(125,165,235,' + p.a + ')'; ctx.fill();
    }
    raf = requestAnimationFrame(frame);
  }

  if (reduceMotion) { ctx.drawImage(grid, 0, 0, W, H); return; }
  new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting && !raf) raf = requestAnimationFrame(frame);
    else if (!e.isIntersecting && raf) { cancelAnimationFrame(raf); raf = null; }
  })).observe(cv);
})();

/* The Our Work gallery and the About photograph are rendered at build time
   from src/data/works.json — see index.astro. They used to be fetched from
   blob storage and assembled here, which kept the photographs out of the HTML
   and therefore out of Google's index. Nothing about them needs JavaScript. */

/* ── ENQUIRY FORM — size-check attachments and show a sending state, so a
      slow upload never looks like a dead button ── */
(function () {
  const form = document.getElementById('enquiry-form');
  if (!form) return;
  const file = document.getElementById('f-file');
  const err  = document.getElementById('f-file-err');
  const btn  = document.getElementById('f-submit');
  const MAX  = 10 * 1024 * 1024;

  function tooBig() {
    const f = file && file.files && file.files[0];
    return !!(f && f.size > MAX);
  }
  function showErr(on, name, mb) {
    if (!err) return;
    err.hidden = !on;
    if (on) err.textContent = name + ' is ' + mb + ' MB. Please attach a file under 10 MB, ' +
      'or email it to info@jmcengg.com and we will match it to your enquiry.';
  }
  if (file) file.addEventListener('change', function () {
    const f = file.files[0];
    showErr(tooBig(), f ? f.name : '', f ? (f.size / 1048576).toFixed(1) : 0);
  });

  form.addEventListener('submit', function (e) {
    if (tooBig()) {
      e.preventDefault();
      const f = file.files[0];
      showErr(true, f.name, (f.size / 1048576).toFixed(1));
      err.scrollIntoView({ block: 'center', behavior: 'smooth' });
      return;
    }
    if (btn) { btn.disabled = true; btn.classList.add('sending'); btn.lastChild.textContent = ' Sending your enquiry\u2026'; }
  });
})();

/* ── VLOG — the section stays hidden until real IDs are pasted in ── */
const videoConfig = [
  // { id: 'YOUTUBE_ID_HERE', title: 'Jig Fixture Manufacturing — Full Process' },
];
(function () {
  const grid = document.getElementById('vlog-grid');
  const live = videoConfig.filter(v => v.id && v.id.length > 5);
  if (!grid || !live.length) return;
  document.getElementById('vlog').hidden = false;
  live.forEach(v => {
    const a = document.createElement('a');
    a.className = 'vlog-card rv';
    a.href = 'https://www.youtube.com/watch?v=' + v.id;
    a.target = '_blank'; a.rel = 'noopener';
    a.innerHTML = `<div class="vlog-th">
        <img src="https://img.youtube.com/vi/${v.id}/hqdefault.jpg" alt="${v.title}" loading="lazy" width="480" height="360"/>
        <div class="vlog-play"><span><svg viewBox="0 0 24 24"><path d="M5 3l14 9-14 9z"/></svg></span></div>
      </div>
      <div class="vlog-bd"><h3></h3><p>YouTube \u00b7 @JMCEngineering</p></div>`;
    a.querySelector('h3').textContent = v.title;
    grid.appendChild(a); io.observe(a);
  });
})();
