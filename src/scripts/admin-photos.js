/* The photo gallery editor.

   Talks to /api/photos, which commits to the repository. A save is therefore
   a real commit and the site rebuilds — about two minutes — so the page says
   so plainly rather than implying the change is instant.

   Photographs are shrunk here, in the browser, before they are sent. A phone
   photograph is 4–8 MB and 4000 px wide; nothing on the site displays wider
   than about 1600 px, so sending the original would waste the visitor's data,
   the repository's history and the editor's patience for no visible gain. */

const MAX_EDGE = 1600;
const QUALITY = 0.82;
const MAX_BATCH = 8;

const api = '/api/photos';
const $ = (id) => document.getElementById(id);

let photos = [];     /* what the server last told us */
let queue = [];      /* chosen but not yet uploaded */
let dirty = false;
let busy = false;

/* ── talking to the API ── */

async function send(method, body, query) {
  const res = await fetch(api + (query || ''), {
    method,
    credentials: 'include',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });

  let data = {};
  try { data = await res.json(); } catch { /* an empty or non-JSON body */ }

  if (!res.ok) {
    const err = new Error(data.message || 'That did not work. Try again in a moment.');
    err.code = data.code || `http_${res.status}`;
    throw err;
  }
  return data;
}

/* ── status line ── */

function say(text, kind) {
  const el = $('ph-status');
  el.textContent = text;
  el.className = `ph-status${kind ? ' ' + kind : ''}`;
  el.hidden = !text;
}

function fail(err) {
  if (err.code === 'signed_out') {
    say('Your sign-in has expired. Reload the page to sign in again.', 'bad');
  } else if (err.code === 'no_role') {
    say('This account is signed in but has not been given permission to edit the site.', 'bad');
  } else if (err.code === 'no_token') {
    say('The panel cannot reach the website’s repository — its access token has not been set up in Azure yet. Nothing you do here can save until that is done.', 'bad');
  } else if (err.code === 'http_404') {
    say('The panel\u2019s API is not answering. If the site was updated in the last few minutes it is probably still deploying — wait a moment and reload.', 'bad');
  } else {
    say(err.message, 'bad');
  }
}

/* ── shrinking, in the browser ── */

function loadImage(file) {
  /* createImageBitmap with from-image applies the EXIF rotation, which is why
     photographs taken in portrait used to appear on their side. */
  if (window.createImageBitmap) {
    return createImageBitmap(file, { imageOrientation: 'from-image' }).catch(() => viaElement(file));
  }
  return viaElement(file);
}

function viaElement(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('That file could not be opened as an image.')); };
    img.src = url;
  });
}

async function shrink(file) {
  const src = await loadImage(file);
  const sw = src.width, sh = src.height;
  const scale = Math.min(1, MAX_EDGE / Math.max(sw, sh));
  const w = Math.round(sw * scale), h = Math.round(sh * scale);

  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(src, 0, 0, w, h);
  if (src.close) src.close();

  const type = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
  const dataUrl = canvas.toDataURL(type, QUALITY);
  return { dataUrl, w, h, bytes: Math.floor((dataUrl.length * 3) / 4) };
}

const kb = (b) => (b > 900000 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.round(b / 1024)} KB`);

/* ── the existing gallery ── */

function renderGallery() {
  const list = $('ph-list');
  list.textContent = '';

  $('ph-count').textContent = photos.length === 0
    ? 'No photographs yet.'
    : `${photos.length} photograph${photos.length === 1 ? '' : 's'} on the homepage.`;

  photos.forEach((p, i) => {
    const row = document.createElement('div');
    row.className = 'ph-row';

    const img = document.createElement('img');
    img.className = 'ph-thumb';
    img.src = p.file;
    img.alt = '';
    img.loading = 'lazy';
    row.appendChild(img);

    const fields = document.createElement('div');
    fields.className = 'ph-fields';

    fields.appendChild(field('What it is', 'input', p.label, (v) => { p.label = v; markDirty(); }));
    fields.appendChild(field('Description (read aloud to blind visitors, and by Google)', 'textarea', p.alt || '', (v) => { p.alt = v; markDirty(); }));

    const meta = document.createElement('p');
    meta.className = 'ph-meta';
    meta.textContent = p.file + (p.w && p.h ? ` · ${p.w}×${p.h}` : '');
    fields.appendChild(meta);
    row.appendChild(fields);

    const acts = document.createElement('div');
    acts.className = 'ph-acts';

    const feat = document.createElement('label');
    feat.className = 'ph-feat';
    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = 'featured';
    radio.checked = p.featured === true;
    radio.addEventListener('change', () => {
      photos.forEach((q) => { q.featured = q === p; });
      markDirty();
    });
    feat.appendChild(radio);
    feat.appendChild(document.createTextNode('Main photo'));
    acts.appendChild(feat);

    const moves = document.createElement('div');
    moves.className = 'ph-move';
    moves.appendChild(button('↑', 'Move up', i === 0, () => move(i, -1)));
    moves.appendChild(button('↓', 'Move down', i === photos.length - 1, () => move(i, 1)));
    acts.appendChild(moves);

    const del = button('Remove', 'Remove this photograph', false, () => remove(p, del));
    del.classList.add('ph-del');
    acts.appendChild(del);

    row.appendChild(acts);
    list.appendChild(row);
  });
}

function field(labelText, tag, value, onInput) {
  const wrap = document.createElement('label');
  wrap.className = 'ph-field';
  const span = document.createElement('span');
  span.textContent = labelText;
  const input = document.createElement(tag);
  if (tag === 'textarea') input.rows = 2;
  input.value = value;
  input.addEventListener('input', () => onInput(input.value));
  wrap.appendChild(span);
  wrap.appendChild(input);
  return wrap;
}

function button(text, title, disabled, onClick) {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'ph-btn-s';
  b.textContent = text;
  b.title = title;
  b.setAttribute('aria-label', title);
  b.disabled = disabled;
  b.addEventListener('click', onClick);
  return b;
}

function move(i, by) {
  const j = i + by;
  if (j < 0 || j >= photos.length) return;
  [photos[i], photos[j]] = [photos[j], photos[i]];
  markDirty();
  renderGallery();
}

function markDirty() {
  dirty = true;
  $('ph-save').disabled = false;
  $('ph-save').textContent = 'Save changes';
}

async function remove(p, btn) {
  /* Removing reloads the gallery from the server, which would quietly throw
     away anything typed and not yet saved. Say so first. */
  if (dirty && !window.confirm('You have changes that have not been saved yet.\n\nRemoving a photograph now will discard them. Continue?')) return;
  if (!window.confirm(`Remove "${p.label}" from the website?\n\nThe photograph is deleted from the site. It stays in the site's history, so it can be brought back, but not from this page.`)) return;

  await run(btn, async () => {
    say('Removing\u2026');
    const out = await send('DELETE', null, `?file=${encodeURIComponent(p.file)}`);
    photos = out.photos;
    dirty = false;
    $('ph-save').disabled = true;
    $('ph-save').textContent = 'Saved';
    renderGallery();
    saved('Removed.');
  });
}

async function save() {
  if (!dirty) return;
  await run($('ph-save'), async () => {
    say('Saving…');
    const out = await send('PUT', {
      photos: photos.map((p, i) => ({ file: p.file, label: p.label, alt: p.alt, featured: p.featured === true, order: i + 1 })),
    });
    photos = out.photos;
    dirty = false;
    $('ph-save').disabled = true;
    renderGallery();
    saved('Saved.');
  });
}

function saved(what) {
  say(`${what} The website is rebuilding and will show the change in about two minutes.`, 'good');
}

/* One place that owns the busy state, so a double click cannot send a second
   commit while the first is still in flight. */
async function run(btn, fn) {
  if (busy) return;
  busy = true;
  const label = btn && btn.textContent;
  if (btn) { btn.disabled = true; btn.textContent = 'Working…'; }
  try {
    await fn();
  } catch (err) {
    fail(err);
  } finally {
    busy = false;
    if (btn) { btn.textContent = label; btn.disabled = btn === $('ph-save') ? !dirty : false; }
    syncUpload();
  }
}

/* ── the upload queue ── */

async function choose(files) {
  const room = MAX_BATCH - queue.length;
  if (room <= 0) {
    say(`${MAX_BATCH} photographs at a time. Upload these first, then choose more.`, 'bad');
    return;
  }
  const chosen = Array.from(files).slice(0, room);
  if (files.length > room) say(`Taking the first ${room} — ${MAX_BATCH} at a time.`, 'warn');

  for (const file of chosen) {
    if (!/^image\/(jpeg|png|webp|heic|heif)$/.test(file.type) && !/\.(jpe?g|png|webp|heic|heif)$/i.test(file.name)) {
      say(`"${file.name}" is not a photograph.`, 'bad');
      continue;
    }
    try {
      const shrunk = await shrink(file);
      queue.push({ id: Math.random().toString(36).slice(2), from: file.name, name: '', description: '', ...shrunk });
    } catch {
      say(`"${file.name}" could not be opened. If it came from an iPhone it may be in HEIC format — share it as JPEG and try again.`, 'bad');
    }
  }
  renderQueue();
}

function renderQueue() {
  const wrap = $('ph-queue');
  wrap.textContent = '';
  wrap.hidden = queue.length === 0;

  queue.forEach((item) => {
    const row = document.createElement('div');
    row.className = 'ph-row ph-new';

    const img = document.createElement('img');
    img.className = 'ph-thumb';
    img.src = item.dataUrl;
    img.alt = '';
    row.appendChild(img);

    const fields = document.createElement('div');
    fields.className = 'ph-fields';
    fields.appendChild(field('What is it?', 'input', item.name, (v) => { item.name = v; syncUpload(); }));
    fields.appendChild(field('Describe it in one line', 'textarea', item.description, (v) => { item.description = v; syncUpload(); }));

    const meta = document.createElement('p');
    meta.className = 'ph-meta';
    meta.textContent = `${item.from} · resized to ${item.w}×${item.h} · ${kb(item.bytes)}`;
    fields.appendChild(meta);
    row.appendChild(fields);

    const acts = document.createElement('div');
    acts.className = 'ph-acts';
    const drop = button('Remove', 'Take this photograph out of the queue', false, () => {
      queue = queue.filter((q) => q !== item);
      renderQueue();
      syncUpload();
    });
    drop.classList.add('ph-del');
    acts.appendChild(drop);
    row.appendChild(acts);

    wrap.appendChild(row);
  });

  syncUpload();
}

function syncUpload() {
  const btn = $('ph-upload');
  const ready = queue.length > 0 && queue.every((q) => q.name.trim() && q.description.trim());
  btn.hidden = queue.length === 0;
  btn.disabled = !ready || busy;
  btn.textContent = queue.length === 1 ? 'Add this photograph' : `Add these ${queue.length} photographs`;

  const hint = $('ph-hint');
  if (queue.length && !ready) {
    hint.textContent = 'Every photograph needs a name and a description before it can be added.';
    hint.hidden = false;
  } else {
    hint.hidden = true;
  }
}

async function upload() {
  await run($('ph-upload'), async () => {
    say(`Adding ${queue.length} photograph${queue.length === 1 ? '' : 's'}…`);
    const out = await send('POST', {
      photos: queue.map((q) => ({ name: q.name, description: q.description, dataUrl: q.dataUrl, w: q.w, h: q.h })),
    });
    photos = out.photos;
    queue = [];
    $('ph-file').value = '';
    renderQueue();
    renderGallery();
    saved(`Added ${out.added.length} photograph${out.added.length === 1 ? '' : 's'}.`);
  });
}

/* ── wiring ── */

async function start() {
  try {
    const out = await send('GET');
    photos = out.photos;
    $('ph-panel').hidden = false;
    $('ph-loading').hidden = true;
    renderGallery();
  } catch (err) {
    $('ph-loading').hidden = true;
    $('ph-panel').hidden = false;
    fail(err);
    renderGallery();
  }
}

$('ph-file').addEventListener('change', (e) => choose(e.target.files));
$('ph-upload').addEventListener('click', upload);
$('ph-save').addEventListener('click', save);

const zone = $('ph-drop');
['dragenter', 'dragover'].forEach((ev) =>
  zone.addEventListener(ev, (e) => { e.preventDefault(); zone.classList.add('over'); })
);
['dragleave', 'drop'].forEach((ev) =>
  zone.addEventListener(ev, (e) => { e.preventDefault(); zone.classList.remove('over'); })
);
zone.addEventListener('drop', (e) => {
  if (e.dataTransfer && e.dataTransfer.files) choose(e.dataTransfer.files);
});

/* Losing twenty minutes of typing to a stray browser-back is a bad afternoon. */
window.addEventListener('beforeunload', (e) => {
  if (dirty || queue.length) { e.preventDefault(); e.returnValue = ''; }
});

start();
