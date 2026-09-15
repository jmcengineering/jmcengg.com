/* Homepage behaviour, lifted verbatim out of the inline <script> block in
   the old public/index.html. Same rule as home.css: moved, not rewritten. */

'use strict';

/* ═══ CONFIG — set this once after running scripts/azure-setup.sh ═══ */
const STORAGE_ACCOUNT = 'REPLACE_WITH_YOUR_STORAGE_ACCOUNT';
const WORKS_CONTAINER = 'works';
const BLOB_BASE = `https://${STORAGE_ACCOUNT}.blob.core.windows.net/${WORKS_CONTAINER}`;

const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

/* Reveal styles only apply once JS is alive — a script failure can never
   leave the page invisible now. */
document.documentElement.classList.add('js-on');

/* ── SCROLL: offsets cached, so no layout read per frame ── */
const navbar  = document.getElementById('navbar');
const backTop = document.getElementById('back-top');
const navAs   = [...document.querySelectorAll('.nav-links a')];
const secs    = [...document.querySelectorAll('main section[id]')];
let offsets = [], ticking = false;

function measure() {
  offsets = secs.map(s => ({ id: s.id, top: s.getBoundingClientRect().top + scrollY }));
}
function onScroll() {
  if (ticking) return;
  ticking = true;
  requestAnimationFrame(() => {
    const y = scrollY;
    navbar.classList.toggle('scrolled', y > 60);
    backTop.classList.toggle('show', y > 480);
    let cur = '';
    for (const o of offsets) { if (y >= o.top - 120) cur = o.id; }
    navAs.forEach(a => a.classList.toggle('active', a.getAttribute('href') === '#' + cur));
    ticking = false;
  });
}
addEventListener('scroll', onScroll, { passive: true });
addEventListener('resize', () => { measure(); onScroll(); }, { passive: true });
addEventListener('load', measure);
measure();

backTop.addEventListener('click', () => scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' }));

/* ── MOBILE MENU: Escape closes, label reflects state ── */
const menu = document.getElementById('mobileMenu');
const burger = document.getElementById('hamburger');
function toggleMenu(force) {
  const open = force !== undefined ? force : !menu.classList.contains('open');
  menu.classList.toggle('open', open);
  burger.setAttribute('aria-expanded', String(open));
  burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  document.body.style.overflow = open ? 'hidden' : '';
  if (open) menu.querySelector('a').focus();
}
burger.addEventListener('click', () => toggleMenu());
menu.querySelectorAll('a').forEach(a => a.addEventListener('click', () => toggleMenu(false)));
addEventListener('keydown', e => { if (e.key === 'Escape' && menu.classList.contains('open')) { toggleMenu(false); burger.focus(); } });

/* ── WHATSAPP FLOAT — held back until the visitor is past the hero, so it
      never sits on top of the key facts on a phone ── */
(function () {
  const wa = document.getElementById('wa-float');
  if (!wa) return;
  const show = () => wa.classList.toggle('on', scrollY > 520);
  show();
  addEventListener('scroll', show, { passive: true });
})();

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

/* ── SCROLL REVEAL ── */
const io = new IntersectionObserver(es => {
  es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in-view'); io.unobserve(e.target); } });
}, { threshold: 0.12 });
document.querySelectorAll('.rv,.rv-l,.rv-r').forEach(el => io.observe(el));

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

/* ══════════════════════════════════════════════════════════════
   WORKS GALLERY — driven by the admin panel.
   Reads manifest.json straight from blob storage: no API call,
   no cost, and the order is exactly what was set in /admin.
   ══════════════════════════════════════════════════════════════ */
/* Shown when blob storage has nothing yet: the real photographs that are
   already in the repository, rather than a note telling visitors we have
   nothing to show. */
const LOCAL_WORKS = [
  { src: 'work-1.jpg', label: 'Jig fixture assembly' },
  { src: 'work-2.jpg', label: 'Press tool detail' }
];

(async function () {
  const grid = document.getElementById('works-grid');
  const note = document.getElementById('works-note');
  if (!grid) return;

  function renderLocal() {
    if (!LOCAL_WORKS.length) return;
    note?.remove();
    LOCAL_WORKS.forEach((p, i) => {
      const card = document.createElement('div');
      card.className = 'work-item rv';
      card.style.transitionDelay = (i * .08) + 's';
      const img = new Image();
      img.src = p.src;
      img.alt = p.label + ' manufactured by JMC Engineering, Chennai';
      img.loading = 'lazy';
      img.decoding = 'async';
      card.append(img, Object.assign(document.createElement('div'), { className: 'work-ol' }));
      const lb = document.createElement('div');
      lb.className = 'work-lb';
      lb.innerHTML = '<span></span><small>JMC-' + String(i + 1).padStart(2, '0') + '</small>';
      lb.firstChild.textContent = p.label;
      card.appendChild(lb);
      grid.appendChild(card);
      io.observe(card);
    });
    const box = document.getElementById('about-visual');
    if (box) {
      const img = new Image();
      /* Deliberately NOT lazy: the element is detached until it loads, and a
         lazy detached image is never in a viewport, so it never loads at all. */
      img.decoding = 'async';
      img.alt = 'JMC Engineering tool room, Padi, Chennai';
      img.onload = () => { box.querySelector('.ph')?.remove(); box.prepend(img); };
      img.src = LOCAL_WORKS[0].src;
    }
    measure();
  }

  let photos = [];
  /* Only reach for blob storage once a real account name is configured —
     otherwise every visitor pays for a DNS lookup that can never resolve. */
  if (STORAGE_ACCOUNT && !/^REPLACE_WITH/.test(STORAGE_ACCOUNT)) {
    try {
      const r = await fetch(`${BLOB_BASE}/manifest.json`, { cache: 'no-cache' });
      if (r.ok) photos = (await r.json()).photos || [];
    } catch { /* fall through to the local set below */ }
  }

  if (!photos.length) { renderLocal(); return; }

  photos.sort((a, b) => (b.featured === true) - (a.featured === true) || (a.order ?? 0) - (b.order ?? 0));
  note?.remove();

  const frag = document.createDocumentFragment();
  photos.forEach((p, i) => {
    const card = document.createElement('div');
    card.className = 'work-item rv';
    card.style.transitionDelay = ((i % 4) * .08) + 's';
    const img = new Image();
    img.src = `${BLOB_BASE}/${p.id}.webp`;
    img.alt = `${p.label} manufactured by JMC Engineering, Chennai`;
    img.loading = 'lazy';
    img.decoding = 'async';
    img.width = p.w || 1600;
    img.height = p.h || 1200;
    card.append(img, Object.assign(document.createElement('div'), { className: 'work-ol' }));
    const lb = document.createElement('div');
    lb.className = 'work-lb';
    lb.innerHTML = `<span></span><small>JMC-${String(i + 1).padStart(2, '0')}</small>`;
    lb.firstChild.textContent = p.label;
    card.appendChild(lb);
    frag.appendChild(card);
    io.observe(card);
  });
  grid.appendChild(frag);

  /* The About photo fills itself from the first featured work —
     so there is never a placeholder sitting on the live site again. */
  const hero = photos.find(p => p.featured) || photos[0];
  const box = document.getElementById('about-visual');
  if (hero && box) {
    const img = new Image();
    /* Not lazy — see the note in renderLocal(); a detached lazy image never loads. */
    img.decoding = 'async';
    img.alt = `${hero.label} — JMC Engineering tool room, Padi, Chennai`;
    img.onload = () => { box.querySelector('.ph')?.remove(); box.prepend(img); };
    img.src = `${BLOB_BASE}/${hero.id}.webp`;
  }
  measure();
})();

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

/* ── SMOOTH ANCHORS + YEAR ── */
document.querySelectorAll('a[href^="#"]').forEach(a => a.addEventListener('click', function (e) {
  const href = this.getAttribute('href');
  if (href === '#') return;
  const t = document.querySelector(href);
  if (t) { e.preventDefault(); t.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' }); }
}));
document.getElementById('yr').textContent = new Date().getFullYear();
