/* Chrome behaviour shared by every page: navbar state, scroll spy, the
   mobile menu, the back-to-top and WhatsApp floats, scroll reveal, smooth
   anchors and the footer year.

   This used to run only on the homepage, which is why the section pages had
   no working mobile menu - their nav links simply vanished below 900px with
   nothing to open. Importing this from both page types fixes that.

   `reduceMotion`, `io` and `measure` are exported because the homepage's own
   script builds on them: the works gallery observes the cards it injects and
   re-measures the scroll offsets afterwards. */

'use strict';

export const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

/* Reveal styles only apply once JS is alive - a script failure can never
   leave the page invisible now. */
document.documentElement.classList.add('js-on');

/* ── SCROLL: offsets cached, so no layout read per frame ── */
const navbar  = document.getElementById('navbar');
const backTop = document.getElementById('back-top');
const navAs   = [...document.querySelectorAll('.nav-links a')];
const secs    = [...document.querySelectorAll('main section[id]')];
let offsets = [], ticking = false;

export function measure() {
  offsets = secs.map(s => ({ id: s.id, top: s.getBoundingClientRect().top + scrollY }));
}
function onScroll() {
  if (ticking) return;
  ticking = true;
  requestAnimationFrame(() => {
    const y = scrollY;
    navbar?.classList.toggle('scrolled', y > 60);
    backTop?.classList.toggle('show', y > 480);
    let cur = '';
    for (const o of offsets) { if (y >= o.top - 120) cur = o.id; }
    /* Section pages carry the same nav with /#anchor hrefs, so compare on the
       fragment alone rather than the whole href. */
    navAs.forEach(a => {
      const h = (a.getAttribute('href') || '');
      a.classList.toggle('active', cur !== '' && h.slice(h.indexOf('#')) === '#' + cur);
    });
    ticking = false;
  });
}
addEventListener('scroll', onScroll, { passive: true });
addEventListener('resize', () => { measure(); onScroll(); }, { passive: true });
addEventListener('load', measure);
measure();

backTop?.addEventListener('click', () => scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' }));

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
if (menu && burger) {
  burger.addEventListener('click', () => toggleMenu());
  menu.querySelectorAll('a').forEach(a => a.addEventListener('click', () => toggleMenu(false)));
  addEventListener('keydown', e => { if (e.key === 'Escape' && menu.classList.contains('open')) { toggleMenu(false); burger.focus(); } });
}

/* ── WHATSAPP FLOAT — held back until the visitor is past the hero, so it
      never sits on top of the key facts on a phone ── */
(function () {
  const wa = document.getElementById('wa-float');
  if (!wa) return;
  const show = () => wa.classList.toggle('on', scrollY > 520);
  show();
  addEventListener('scroll', show, { passive: true });
})();

/* ── SCROLL REVEAL ── */
export const io = new IntersectionObserver(es => {
  es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in-view'); io.unobserve(e.target); } });
}, { threshold: 0.12 });
document.querySelectorAll('.rv,.rv-l,.rv-r').forEach(el => io.observe(el));

/* ── SMOOTH ANCHORS + YEAR ── */
document.querySelectorAll('a[href^="#"]').forEach(a => a.addEventListener('click', function (e) {
  const href = this.getAttribute('href');
  if (href === '#') return;
  const t = document.querySelector(href);
  if (t) { e.preventDefault(); t.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' }); }
}));
const yrEl = document.getElementById('yr');
if (yrEl) yrEl.textContent = new Date().getFullYear();
