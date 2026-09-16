/* PCD hole calculator.
 *
 * Coordinates for jig boring, CNC drilling, wire-cut and punch layout.
 * The maths is unit-agnostic - everything is a ratio or a linear scale - so
 * the mm/inch switch converts the values in the fields and changes what the
 * exporters declare, rather than maintaining a second internal scale.
 */

'use strict';

const $ = (id) => document.getElementById(id);
const F = (v, d = 3) => Number(v).toFixed(d);

/* Linear inputs, converted when the unit changes. Counts and angles are not. */
const LINEAR = ['pcd', 'dia', 'cx', 'cy', 'thk', 'mchord'];
const INPUTS = ['pcd', 'n', 'dia', 'start', 'dir', 'cx', 'cy', 'thk', 'part', 'drg', 'wo', 'cust'];

let UNIT = 'mm';
const U = () => (UNIT === 'mm' ? 'mm' : 'in');
const DEC = () => (UNIT === 'mm' ? 3 : 4);

/* ── Thread presets. Clearance is a medium (H13-ish) fit; tap drill is the
      coarse-pitch value fitters actually use. Both in mm; converted on use. */
const THREADS = {
  M3:  { clear: 3.4,  tap: 2.5  },
  M4:  { clear: 4.5,  tap: 3.3  },
  M5:  { clear: 5.5,  tap: 4.2  },
  M6:  { clear: 6.6,  tap: 5.0  },
  M8:  { clear: 9.0,  tap: 6.8  },
  M10: { clear: 11.0, tap: 8.5  },
  M12: { clear: 13.5, tap: 10.2 },
  M16: { clear: 17.5, tap: 14.0 },
  M20: { clear: 22.0, tap: 17.5 },
};

/* ───────────────────────────── maths ───────────────────────────── */
function compute() {
  let pcd = parseFloat($('pcd').value);
  let n = parseInt($('n').value, 10);
  let dia = parseFloat($('dia').value);
  let start = parseFloat($('start').value);
  let cx = parseFloat($('cx').value);
  let cy = parseFloat($('cy').value);
  const thk = parseFloat($('thk').value);
  const cw = $('dir').value === 'cw';

  if (!isFinite(pcd) || pcd <= 0) pcd = 0;
  if (!isFinite(n) || n < 1) n = 1;
  if (!isFinite(dia) || dia < 0) dia = 0;
  if (!isFinite(start)) start = 0;
  if (!isFinite(cx)) cx = 0;
  if (!isFinite(cy)) cy = 0;

  const r = pcd / 2;
  const step = 360 / n;
  const pts = [];
  for (let i = 0; i < n; i++) {
    const a = start + (cw ? -1 : 1) * step * i;
    const rad = (a * Math.PI) / 180;
    const dx = r * Math.cos(rad);
    const dy = r * Math.sin(rad);
    pts.push({ i: i + 1, a: ((a % 360) + 360) % 360, x: cx + dx, y: cy + dy, dx, dy, r });
  }

  const chord = n > 1 ? pcd * Math.sin(Math.PI / n) : 0;
  const arc = n > 1 ? (Math.PI * pcd) / n : 0;
  const web = n > 1 ? chord - dia : Infinity;
  /* Across-flats / across-corners: a span the fitter can check with a vernier. */
  const across = n > 1 ? (n % 2 === 0 ? pcd : pcd * Math.cos(Math.PI / (2 * n))) : 0;

  return { pcd, n, dia, start, cx, cy, thk, cw, r, step, pts, chord, arc, web, across };
}

/* ───────────────────────────── readout ───────────────────────────── */
function paintDRO(m) {
  const d = DEC();
  $('d-angle').innerHTML = F(m.step) + '<small>&deg;</small>';
  $('d-chord').innerHTML = m.n > 1 ? F(m.chord, d) + '<small>' + U() + '</small>' : '&mdash;';
  $('d-arc').innerHTML = m.n > 1 ? F(m.arc, d) + '<small>' + U() + '</small>' : '&mdash;';
  $('d-web').innerHTML = m.n > 1 && m.dia > 0 ? F(m.web, d) + '<small>' + U() + '</small>' : '&mdash;';
}

/* ───────────────────────────── advisories ───────────────────────────── */
function paintNotes(m) {
  const out = [];
  const d = DEC();
  const u = ' ' + U();
  if (m.n > 1 && m.dia > 0) {
    if (m.web <= 0) {
      out.push(['warn', 'Holes overlap. The web is ' + F(m.web, d) + u +
        ' — reduce the hole size or open out the PCD.']);
    } else if (isFinite(m.thk) && m.thk > 0 && m.web < 2 * m.thk) {
      out.push(['warn', 'Web of ' + F(m.web, d) + u + ' is under 2× material thickness (' +
        F(2 * m.thk, 2) + u + '). Thin for piercing — check punch strength and strip breakage.']);
    } else if (m.web < (UNIT === 'mm' ? 2 : 0.08)) {
      out.push(['warn', 'Web of ' + F(m.web, d) + u +
        ' is very thin. Confirm it suits the process before cutting.']);
    } else {
      out.push(['ok', 'Web between holes is ' + F(m.web, d) + u + '.']);
    }
  }
  if (m.n > 1) {
    out.push(['', m.n % 2 === 0
      ? 'Diametrically opposite holes measure ' + F(m.across, d) + u +
        ' centre to centre — a straight vernier check across the plate.'
      : 'Odd hole count, so no pair sits straight across the centre. The widest centre-to-centre span is ' +
        F(m.across, d) + u + ', hole to hole.']);
  }
  $('notes').innerHTML = out.map((o) => '<div class="note ' + o[0] + '">' + o[1] + '</div>').join('');
}

/* ───────────────────────────── preview ───────────────────────────── */
function paintPlot(m) {
  const W = 640, H = 520, cxp = W / 2, cyp = H / 2;
  const span = Math.max(m.r + m.dia / 2, 1) * 2 * 1.28;
  const s = Math.min(W, H) / span;
  const mapx = (x) => cxp + x * s;
  const mapy = (y) => cyp - y * s;
  const R = m.r * s, hr = Math.max((m.dia / 2) * s, 2.2);
  const e = [];
  const d = DEC();

  e.push('<rect x="0" y="0" width="' + W + '" height="' + H + '" fill="#fff"/>');
  e.push('<line x1="' + (cxp - R - 38) + '" y1="' + cyp + '" x2="' + (cxp + R + 38) + '" y2="' + cyp +
    '" stroke="#B23B2E" stroke-width="1" stroke-dasharray="16 4 3 4"/>');
  e.push('<line x1="' + cxp + '" y1="' + (cyp - R - 38) + '" x2="' + cxp + '" y2="' + (cyp + R + 38) +
    '" stroke="#B23B2E" stroke-width="1" stroke-dasharray="16 4 3 4"/>');
  if (m.n > 1) {
    e.push('<circle cx="' + cxp + '" cy="' + cyp + '" r="' + R +
      '" fill="none" stroke="#2563EB" stroke-width="1.2" stroke-dasharray="14 4 3 4"/>');
  }
  if (m.n > 2) {
    const p1 = m.pts[0], p2 = m.pts[1];
    e.push('<line x1="' + mapx(p1.dx) + '" y1="' + mapy(p1.dy) + '" x2="' + mapx(p2.dx) + '" y2="' +
      mapy(p2.dy) + '" stroke="#3C7A4B" stroke-width="1.4"/>');
    const mx = (mapx(p1.dx) + mapx(p2.dx)) / 2, my = (mapy(p1.dy) + mapy(p2.dy)) / 2;
    e.push('<text x="' + mx + '" y="' + (my - 7) +
      '" font-family="IBM Plex Mono, monospace" font-size="13" fill="#3C7A4B" text-anchor="middle">' +
      F(m.chord, 2) + '</text>');
  }
  m.pts.forEach((p) => {
    const X = mapx(p.dx), Y = mapy(p.dy);
    e.push('<circle cx="' + X + '" cy="' + Y + '" r="' + hr + '" fill="#EDEEEA" stroke="#081530" stroke-width="1.3"/>');
    e.push('<line x1="' + (X - hr - 5) + '" y1="' + Y + '" x2="' + (X + hr + 5) + '" y2="' + Y + '" stroke="#B23B2E" stroke-width=".8"/>');
    e.push('<line x1="' + X + '" y1="' + (Y - hr - 5) + '" x2="' + X + '" y2="' + (Y + hr + 5) + '" stroke="#B23B2E" stroke-width=".8"/>');
    const lr = hr + 17, ang = Math.atan2(p.dy, p.dx);
    let lx = X + lr * Math.cos(ang), ly = Y - lr * Math.sin(ang);
    if (m.r === 0) { lx = X + lr; ly = Y; }
    e.push('<text x="' + lx + '" y="' + (ly + 4.5) +
      '" font-family="IBM Plex Mono, monospace" font-size="13" font-weight="600" fill="#081530" text-anchor="middle">' + p.i + '</text>');
  });
  e.push('<circle cx="' + cxp + '" cy="' + cyp + '" r="2.4" fill="#081530"/>');
  e.push('<text x="' + cxp + '" y="' + (H - 14) +
    '" font-family="IBM Plex Mono, monospace" font-size="14" fill="#2563EB" text-anchor="middle">' +
    m.n + ' holes &#216;' + F(m.dia, 2) + '  on  &#216;' + F(m.pcd, 2) + ' PCD (' + U() + ')</text>');

  $('plot').innerHTML = e.join('');
}

/* ───────────────────────────── table ───────────────────────────── */
function paintTable(m) {
  const d = DEC();
  $('tbody').innerHTML = m.pts.map((p) =>
    '<tr><td>' + p.i + '</td><td>' + F(p.a) + '</td><td>' + F(p.x, d) + '</td><td>' + F(p.y, d) +
    '</td><td>' + F(p.dx, d) + '</td><td>' + F(p.dy, d) + '</td><td>' + F(p.r, d) + '</td></tr>').join('');
}

/* ───────────────────────────── reverse ───────────────────────────── */
function paintReverse() {
  const c = parseFloat($('mchord').value);
  const n = parseInt($('mn').value, 10);
  const el = $('revout');
  if (!isFinite(c) || c <= 0 || !isFinite(n) || n < 2) {
    el.innerHTML = 'Enter a measured chord to find the PCD <small>— useful when the print has no PCD called out</small>';
    return;
  }
  const pcd = c / Math.sin(Math.PI / n);
  el.innerHTML = '&#216;' + F(pcd, DEC()) + ' ' + U() + ' PCD <small>— radius ' + F(pcd / 2, DEC()) +
    ', included angle ' + F(360 / n) + '&deg;</small>';
}

/* ───────────────────────────── exports ───────────────────────────── */
function download(name, text, mime) {
  const blob = new Blob([text], { type: mime || 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = name;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function tag() {
  return ($('drg').value || $('part').value || 'PCD').replace(/[^A-Za-z0-9_-]+/g, '-');
}

function csv(m) {
  const d = DEC();
  const head = 'Hole,Angle_deg,X,Y,dX,dY,Radius,Unit';
  const rows = m.pts.map((p) =>
    [p.i, F(p.a), F(p.x, d), F(p.y, d), F(p.dx, d), F(p.dy, d), F(p.r, d), UNIT].join(','));
  return head + '\n' + rows.join('\n') + '\n';
}

/* DXF R12 ASCII. Deliberately minimal - ENTITIES only - because that is the
   dialect every CAD package and wire-EDM controller still reads without
   complaint. Layers are named so the holes can be selected separately from
   the construction geometry. */
function dxf(m) {
  const o = [];
  const p = (code, val) => { o.push(String(code)); o.push(String(val)); };

  p(0, 'SECTION'); p(2, 'ENTITIES');

  const circle = (layer, x, y, r) => {
    p(0, 'CIRCLE'); p(8, layer); p(10, x.toFixed(6)); p(20, y.toFixed(6)); p(30, '0.0'); p(40, r.toFixed(6));
  };
  const line = (layer, x1, y1, x2, y2) => {
    p(0, 'LINE'); p(8, layer);
    p(10, x1.toFixed(6)); p(20, y1.toFixed(6)); p(30, '0.0');
    p(11, x2.toFixed(6)); p(21, y2.toFixed(6)); p(31, '0.0');
  };

  if (m.n > 1 && m.r > 0) circle('PCD', m.cx, m.cy, m.r);

  const cl = Math.max(m.dia * 0.75, m.r * 0.06, 1);
  line('CENTRE', m.cx - cl, m.cy, m.cx + cl, m.cy);
  line('CENTRE', m.cx, m.cy - cl, m.cx, m.cy + cl);

  m.pts.forEach((pt) => {
    if (m.dia > 0) circle('HOLES', pt.x, pt.y, m.dia / 2);
    const t = Math.max(m.dia * 0.7, 1);
    line('CENTRE', pt.x - t, pt.y, pt.x + t, pt.y);
    line('CENTRE', pt.x, pt.y - t, pt.x, pt.y + t);
  });

  p(0, 'ENDSEC'); p(0, 'EOF');
  return o.join('\r\n') + '\r\n';
}

/* A plain G81 drill cycle. Conservative defaults, every value on screen so
   the setter can see and change what will be posted rather than discovering
   it at the machine. */
function gcode(m) {
  const depth = parseFloat($('g-depth').value);
  const feed = parseFloat($('g-feed').value);
  const rpm = parseFloat($('g-rpm').value);
  const clear = parseFloat($('g-clear').value);
  const safe = parseFloat($('g-safe').value);
  const d = DEC();
  const L = [];

  L.push('(JMC ENGINEERING - PCD DRILL PROGRAM)');
  L.push('(PART ' + ($('part').value || '-') + '  DRG ' + ($('drg').value || '-') + ')');
  L.push('(' + m.n + ' HOLES DIA ' + F(m.dia, 2) + ' ON DIA ' + F(m.pcd, 2) + ' PCD, ' + UNIT.toUpperCase() + ')');
  L.push('(DATUM X' + F(m.cx, d) + ' Y' + F(m.cy, d) + ' - CONFIRM ON PART BEFORE RUNNING)');
  L.push('');
  L.push(UNIT === 'mm' ? 'G21 (MM)' : 'G20 (INCH)');
  L.push('G90 G17 G40 G80');
  L.push('G54');
  L.push('T1 M06');
  L.push('S' + (isFinite(rpm) ? rpm : 1200) + ' M03');
  L.push('G00 Z' + F(isFinite(safe) ? safe : 25, 1));
  L.push('G00 X' + F(m.pts[0].x, d) + ' Y' + F(m.pts[0].y, d));
  L.push('G43 H01 Z' + F(isFinite(safe) ? safe : 25, 1) + ' M08');
  L.push('G81 X' + F(m.pts[0].x, d) + ' Y' + F(m.pts[0].y, d) +
    ' Z' + F(-Math.abs(isFinite(depth) ? depth : 10), d) +
    ' R' + F(isFinite(clear) ? clear : 2, 1) +
    ' F' + (isFinite(feed) ? feed : 80));
  m.pts.slice(1).forEach((p) => L.push('X' + F(p.x, d) + ' Y' + F(p.y, d)));
  L.push('G80');
  L.push('G00 Z' + F(isFinite(safe) ? safe : 25, 1) + ' M09');
  L.push('M05');
  L.push('G91 G28 Z0');
  L.push('M30');
  L.push('%');
  return L.join('\n');
}

/* ───────────────────────────── URL state ───────────────────────────── */
function toURL() {
  const q = new URLSearchParams();
  q.set('u', UNIT);
  INPUTS.forEach((id) => {
    const v = $(id).value;
    if (v !== '' && v != null) q.set(id, v);
  });
  const url = location.origin + location.pathname + '?' + q.toString();
  const done = (t) => { const b = $('share'); b.textContent = t; setTimeout(() => (b.textContent = 'Copy shareable link'), 1600); };
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(url).then(() => done('Link copied'), () => done('Copy failed'));
  } else {
    done('Copy failed');
  }
  history.replaceState(null, '', '?' + q.toString());
}

function fromURL() {
  const q = new URLSearchParams(location.search);
  if (![...q.keys()].length) return;
  if (q.get('u') === 'in') { UNIT = 'in'; }
  INPUTS.forEach((id) => { if (q.has(id)) $(id).value = q.get(id); });
  syncUnitLabels();
}

/* ───────────────────────────── units ───────────────────────────── */
function syncUnitLabels() {
  document.querySelectorAll('[data-unit]').forEach((el) => (el.textContent = U()));
  document.querySelectorAll('.unit-btn').forEach((b) =>
    b.setAttribute('aria-pressed', String(b.dataset.u === UNIT)));
  const st = UNIT === 'mm' ? '0.001' : '0.0001';
  LINEAR.forEach((id) => { const el = $(id); if (el) el.step = st; });
}

function setUnit(next) {
  if (next === UNIT) return;
  const factor = next === 'in' ? 1 / 25.4 : 25.4;
  LINEAR.forEach((id) => {
    const el = $(id);
    if (!el) return;
    const v = parseFloat(el.value);
    if (isFinite(v)) el.value = String(Number((v * factor).toFixed(next === 'in' ? 4 : 3)));
  });
  /* G-code depths and clearances are lengths too. */
  ['g-depth', 'g-clear', 'g-safe'].forEach((id) => {
    const el = $(id); const v = parseFloat(el.value);
    if (isFinite(v)) el.value = String(Number((v * factor).toFixed(next === 'in' ? 4 : 2)));
  });
  UNIT = next;
  syncUnitLabels();
  refresh();
  paintReverse();
}

/* ───────────────────────────── wiring ───────────────────────────── */
let M = null;
function refresh() {
  M = compute();
  paintDRO(M); paintPlot(M); paintNotes(M); paintTable(M);
}

export function init() {
  fromURL();

  INPUTS.forEach((id) => {
    $(id).addEventListener('input', refresh);
    $(id).addEventListener('change', refresh);
  });
  ['mchord', 'mn'].forEach((id) => {
    $(id).addEventListener('input', paintReverse);
    $(id).addEventListener('change', paintReverse);
  });

  document.querySelectorAll('.unit-btn').forEach((b) =>
    b.addEventListener('click', () => setUnit(b.dataset.u)));

  $('thread').addEventListener('change', function () {
    const [size, kind] = this.value.split(':');
    if (!size || !THREADS[size]) return;
    const mm = THREADS[size][kind];
    $('dia').value = String(Number((UNIT === 'in' ? mm / 25.4 : mm).toFixed(UNIT === 'in' ? 4 : 2)));
    refresh();
  });

  $('copy').addEventListener('click', function () {
    const d = DEC();
    const txt = 'Hole\tAngle\tX\tY\tdX\tdY\tRadius\n' + M.pts.map((p) =>
      [p.i, F(p.a), F(p.x, d), F(p.y, d), F(p.dx, d), F(p.dy, d), F(p.r, d)].join('\t')).join('\n');
    const done = (t) => { this.textContent = t; setTimeout(() => (this.textContent = 'Copy table'), 1400); };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(txt).then(() => done('Copied'), () => done('Press Ctrl+C'));
    } else { done('Press Ctrl+C'); }
  });

  $('csv').addEventListener('click', () => download('JMC-PCD-' + tag() + '.csv', csv(M), 'text/csv'));
  $('dxf').addEventListener('click', () => download('JMC-PCD-' + tag() + '.dxf', dxf(M), 'application/dxf'));
  $('gcode').addEventListener('click', () => download('JMC-PCD-' + tag() + '.nc', gcode(M), 'text/plain'));
  $('share').addEventListener('click', toURL);
  $('print').addEventListener('click', () => window.print());
  $('pdf').addEventListener('click', () => buildPDF(M));

  syncUnitLabels();
  refresh();
  paintReverse();

  /* jsPDF is a CDN script; enable its button when it lands, and fall back to
     the print dialogue if it never does rather than leaving a dead control. */
  (function wait(tries) {
    if (window.jspdf && window.jspdf.jsPDF) {
      $('pdf').disabled = false; $('status').textContent = ''; return;
    }
    if (tries > 40) {
      $('pdf').disabled = false;
      $('status').textContent = 'PDF engine offline — Export PDF will open the print dialogue. Choose Save as PDF.';
      return;
    }
    setTimeout(() => wait(tries + 1), 100);
  })(0);
}

/* ───────────────────────────── PDF ───────────────────────────── */
function buildPDF(m) {
  const jsPDF = window.jspdf && window.jspdf.jsPDF;
  if (!jsPDF) { window.print(); return; }
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
  const L = 15, R = 195;
  const d = DEC();
  let y = 0;
  const rule = (yy, w) => { doc.setLineWidth(w || 0.2); doc.line(L, yy, R, yy); };

  doc.setFont('helvetica', 'bold'); doc.setFontSize(16);
  doc.text('JMC ENGINEERING', L, 18);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(90);
  doc.text('Precision tooling — jigs, fixtures, press tools, forming tools, plastic moulds', L, 23);
  doc.text('Padi, Chennai', R, 14, { align: 'right' });
  doc.text('GSTIN 33AXRPJ5951H1Z5', R, 18, { align: 'right' });
  doc.text('Ph 7305187874', R, 22, { align: 'right' });
  doc.setTextColor(0); rule(26, 0.6);

  doc.setFont('helvetica', 'bold'); doc.setFontSize(11);
  doc.text('PCD hole coordinate sheet', L, 33);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(90);
  doc.text(new Date().toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }), R, 33, { align: 'right' });
  doc.setTextColor(0); rule(36);

  y = 42;
  doc.setFontSize(8.5);
  [['Part / tool', $('part').value || '—', 'Drawing no.', $('drg').value || '—'],
   ['Work order', $('wo').value || '—', 'Customer', $('cust').value || '—']].forEach((rw) => {
    doc.setTextColor(110); doc.text(rw[0], L, y); doc.setTextColor(0); doc.text(String(rw[1]), L + 24, y);
    doc.setTextColor(110); doc.text(rw[2], L + 105, y); doc.setTextColor(0); doc.text(String(rw[3]), L + 131, y);
    y += 5.5;
  });
  doc.setTextColor(0); rule(y);

  y += 6;
  doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.text('Pattern', L, y);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); y += 5;
  const u = ' ' + U();
  const sum = [
    ['Pitch circle dia', F(m.pcd, d) + u], ['Number of holes', String(m.n)],
    ['Hole diameter', F(m.dia, d) + u], ['Included angle', F(m.step) + ' deg'],
    ['First hole at', F(m.start) + ' deg'], ['Direction', m.cw ? 'Clockwise' : 'Anticlockwise'],
    ['Centre', 'X ' + F(m.cx, d) + '  Y ' + F(m.cy, d)],
    ['Chord, hole to hole', m.n > 1 ? F(m.chord, d) + u : '—'],
    ['Arc pitch', m.n > 1 ? F(m.arc, d) + u : '—'],
    ['Web between holes', m.n > 1 && m.dia > 0 ? F(m.web, d) + u : '—'],
  ];
  const y0 = y;
  sum.forEach((rw, i) => {
    const xx = L + (i < 5 ? 0 : 100), yy = y0 + (i % 5) * 5;
    doc.setTextColor(110); doc.text(rw[0], xx, yy); doc.setTextColor(0); doc.text(rw[1], xx + 42, yy);
  });
  doc.setTextColor(0); y = y0 + 26; rule(y);

  const dTop = y + 5, dH = 74, dcx = 105, dcy = dTop + dH / 2;
  const sc = Math.min(dH, 150) / (Math.max(m.r + m.dia / 2, 1) * 2 * 1.3);
  const Rr = m.r * sc, hr = Math.max((m.dia / 2) * sc, 0.7);
  doc.setDrawColor(178, 59, 46); doc.setLineWidth(0.15); doc.setLineDashPattern([3, 1, 0.6, 1], 0);
  doc.line(dcx - Rr - 7, dcy, dcx + Rr + 7, dcy); doc.line(dcx, dcy - Rr - 7, dcx, dcy + Rr + 7);
  if (m.n > 1) { doc.setDrawColor(37, 99, 235); doc.setLineWidth(0.25); doc.circle(dcx, dcy, Rr, 'S'); }
  doc.setLineDashPattern([], 0); doc.setDrawColor(8, 21, 48); doc.setLineWidth(0.3);
  doc.setFontSize(7); doc.setFont('helvetica', 'bold');
  m.pts.forEach((p) => {
    const X = dcx + p.dx * sc, Y = dcy - p.dy * sc;
    doc.circle(X, Y, hr, 'S');
    const lr = hr + 4.2, ang = Math.atan2(p.dy, p.dx);
    doc.text(String(p.i), m.r === 0 ? X + lr : X + lr * Math.cos(ang), (m.r === 0 ? Y : Y - lr * Math.sin(ang)) + 1.2, { align: 'center' });
  });
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8);
  doc.text(m.n + ' holes DIA ' + F(m.dia, 2) + ' on DIA ' + F(m.pcd, 2) + ' PCD (' + UNIT + ')', dcx, dTop + dH + 4, { align: 'center' });
  y = dTop + dH + 8; rule(y);

  y += 6;
  const cols = [
    { t: 'Hole', x: L + 6 }, { t: 'Angle deg', x: L + 34 }, { t: 'X', x: L + 62 },
    { t: 'Y', x: L + 90 }, { t: 'dX', x: L + 120 }, { t: 'dY', x: L + 150 }, { t: 'Radius', x: L + 178 },
  ];
  const header = () => {
    doc.setFont('helvetica', 'bold'); doc.setFontSize(8);
    cols.forEach((c) => doc.text(c.t, c.x, y, { align: 'right' }));
    y += 1.8; doc.setLineWidth(0.3); doc.line(L, y, R, y); y += 4.2;
    doc.setFont('helvetica', 'normal');
  };
  header(); doc.setFontSize(8);
  m.pts.forEach((p) => {
    if (y > 276) {
      doc.addPage(); y = 20;
      doc.setFont('helvetica', 'bold'); doc.setFontSize(9);
      doc.text('PCD hole coordinate sheet (continued)', L, y); y += 6;
      doc.setFontSize(8); header();
    }
    const v = [p.i, F(p.a), F(p.x, d), F(p.y, d), F(p.dx, d), F(p.dy, d), F(p.r, d)];
    cols.forEach((c, i) => doc.text(String(v[i]), c.x, y, { align: 'right' }));
    y += 4.6;
  });
  y += 1; rule(y);

  y += 6;
  if (y > 255) { doc.addPage(); y = 20; }
  doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.text('Inspection notes', L, y); y += 5;
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8);
  const checks = [];
  if (m.n > 1) {
    checks.push(m.n % 2 === 0
      ? 'Diametrically opposite holes: ' + F(m.across, d) + u + ' centre to centre.'
      : 'Odd hole count - no pair sits straight across the centre. Widest centre-to-centre span: ' + F(m.across, d) + u + ', hole to hole.');
    checks.push('Adjacent hole centres: ' + F(m.chord, d) + u + '.');
  }
  if (m.n > 1 && m.dia > 0) {
    checks.push('Web between adjacent holes: ' + F(m.web, d) + u + '.');
    if (m.web <= 0) checks.push('WARNING - holes overlap at this hole size and PCD.');
    else if (isFinite(m.thk) && m.thk > 0 && m.web < 2 * m.thk)
      checks.push('WARNING - web is under 2x material thickness (' + F(2 * m.thk, 2) + u + '). Review before piercing.');
  }
  checks.push('Coordinates are relative to the datum entered above. Confirm the datum on the part before setting.');
  checks.forEach((t) => { const lines = doc.splitTextToSize(t, R - L); doc.text(lines, L, y); y += lines.length * 4.4; });

  y += 8;
  if (y > 262) { doc.addPage(); y = 24; }
  doc.setLineWidth(0.2);
  doc.line(L, y, L + 50, y); doc.line(L + 72, y, L + 122, y); doc.line(L + 144, y, R, y);
  doc.setFontSize(7.5); doc.setTextColor(110);
  doc.text('Prepared by', L, y + 4); doc.text('Checked by', L + 72, y + 4); doc.text('Approved by', L + 144, y + 4);
  doc.setTextColor(0);

  const pages = doc.internal.getNumberOfPages();
  for (let pg = 1; pg <= pages; pg++) {
    doc.setPage(pg); doc.setFontSize(7); doc.setTextColor(130);
    doc.text('JMC Engineering, Padi, Chennai · GSTIN 33AXRPJ5951H1Z5 · Ph 7305187874', L, 289);
    doc.text('Page ' + pg + ' of ' + pages, R, 289, { align: 'right' });
    doc.setTextColor(0);
  }
  doc.save('JMC-PCD-' + tag() + '-' + m.n + 'x' + F(m.pcd, 1) + '.pdf');
}
