/* The Writing screen.

   Two panes on one page — a list, and an editor — rather than two URLs. The
   editor is the only place anything is typed, and losing what is typed because
   a link was clicked is the single worst thing this screen could do, so every
   route out of it checks for unsaved work first.

   Saving commits to the repository and the site rebuilds, about two minutes.
   The page says so rather than implying it is instant, and the preview link
   says plainly that it shows the last saved version — an editor who previews
   immediately and sees yesterday's text otherwise concludes the panel is
   broken. */

const api = '/api/articles';
const $ = (id) => document.getElementById(id);

let list = [];
let current = null;      /* the article being edited, or null for a new one */
let loaded = { title: '', description: '', category: '', body: '' };
let busy = false;

/* ── API ── */

async function send(method, body, query) {
  const res = await fetch(api + (query || ''), {
    method,
    credentials: 'include',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = {};
  try { data = await res.json(); } catch { /* empty or non-JSON */ }
  if (!res.ok) {
    const err = new Error(data.message || 'That did not work. Try again in a moment.');
    err.code = data.code || `http_${res.status}`;
    throw err;
  }
  return data;
}

function say(text, kind) {
  const el = $('wr-status');
  el.textContent = text;
  el.className = `ph-status${kind ? ' ' + kind : ''}`;
  el.hidden = !text;
  if (kind === 'bad') el.scrollIntoView({ block: 'nearest' });
}

function fail(err) {
  if (err.code === 'signed_out') say('Your sign-in has expired. Reload the page to sign in again.', 'bad');
  else if (err.code === 'no_role') say('This account is signed in but has not been given permission to edit the site.', 'bad');
  else if (err.code === 'no_token') say('The panel cannot reach the website’s repository — its access token has not been set up in Azure yet.', 'bad');
  else if (err.code === 'http_404') say('The panel’s API is not answering. If the site was updated in the last few minutes it is probably still deploying — wait a moment and reload.', 'bad');
  else say(err.message, 'bad');
}

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
    if (btn) { btn.textContent = label; btn.disabled = false; }
  }
}

/* ── the list ── */

const STATUS_LABEL = { draft: 'Draft', published: 'Published' };

function longDate(v) {
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
}

function renderList() {
  const wrap = $('wr-list');
  wrap.textContent = '';

  const drafts = list.filter((a) => a.status !== 'published').length;
  const live = list.length - drafts;
  $('wr-count').textContent = list.length === 0
    ? 'Nothing written yet.'
    : `${live} published, ${drafts} draft${drafts === 1 ? '' : 's'}.`;

  list.forEach((a) => {
    const row = document.createElement('div');
    row.className = 'wr-row';

    const main = document.createElement('div');
    main.className = 'wr-row-main';

    const pill = document.createElement('span');
    pill.className = `wr-pill wr-${a.legacy ? 'legacy' : a.status}`;
    pill.textContent = a.legacy ? 'Older article' : (STATUS_LABEL[a.status] || a.status);
    main.appendChild(pill);

    const h = document.createElement('h3');
    h.textContent = a.title;
    main.appendChild(h);

    const meta = document.createElement('p');
    meta.className = 'wr-row-meta';
    meta.textContent = `${a.category} · ${longDate(a.date)}`;
    main.appendChild(meta);

    row.appendChild(main);

    const acts = document.createElement('div');
    acts.className = 'wr-row-acts';

    if (a.legacy) {
      acts.appendChild(link('View ↗', a.url));
      const note = document.createElement('span');
      note.className = 'wr-row-note';
      note.textContent = 'Written as its own page — not editable here';
      acts.appendChild(note);
    } else {
      const edit = document.createElement('button');
      edit.type = 'button';
      edit.className = 'ph-btn-s';
      edit.textContent = 'Edit';
      edit.addEventListener('click', () => open(a.slug));
      acts.appendChild(edit);
      acts.appendChild(link(a.status === 'published' ? 'View ↗' : 'Preview ↗',
        a.status === 'published' ? `/insights/${a.slug}/` : `/admin/preview/${a.slug}/`));
    }

    row.appendChild(acts);
    wrap.appendChild(row);
  });
}

function link(text, href) {
  const el = document.createElement('a');
  el.className = 'ph-btn-s';
  el.textContent = text;
  el.href = href;
  el.target = '_blank';
  el.rel = 'noopener';
  return el;
}

/* ── the editor ── */

function form() {
  return {
    title: $('wr-title').value.trim(),
    description: $('wr-desc').value.trim(),
    category: $('wr-cat').value,
    body: $('wr-body').value,
  };
}

function isDirty() {
  const f = form();
  return f.title !== loaded.title || f.description !== loaded.description
    || f.category !== loaded.category || f.body !== loaded.body;
}

function counts() {
  const f = form();
  $('wr-title-count').textContent = `${f.title.length} of 90 characters`;

  const d = f.description.length;
  const dEl = $('wr-desc-count');
  dEl.textContent = d === 0 ? 'Around 120 characters is the sweet spot. Under 50 is too short.'
    : `${d} of 160 characters` + (d < 50 ? ' — too short to be useful yet' : '');
  dEl.classList.toggle('warn', d > 0 && d < 50);

  const words = (f.body.trim().match(/\S+/g) || []).length;
  const bEl = $('wr-body-count');
  bEl.textContent = f.body.trim().length < 600
    ? `${words} words — too thin to publish yet. Six hundred honest words is plenty.`
    : `${words} words`;
  bEl.classList.toggle('warn', f.body.trim().length < 600);
}

function showList() {
  $('wr-list-pane').hidden = false;
  $('wr-edit-pane').hidden = true;
  current = null;
  renderList();
}

function showEditor(article, body) {
  current = article;
  $('wr-list-pane').hidden = true;
  $('wr-edit-pane').hidden = false;

  $('wr-title').value = article ? article.title : '';
  $('wr-desc').value = article ? article.description : '';
  $('wr-cat').value = article ? article.category : 'Press Tools';
  $('wr-body').value = body || '';
  loaded = form();

  $('wr-edit-title').textContent = article ? 'Edit article' : 'New article';
  $('wr-edit-sub').textContent = article
    ? `${article.status === 'published' ? 'Published' : 'Draft'} · /insights/${article.slug}/`
    : 'Saved as a draft first. Nothing is public until you press Publish.';

  const isPub = article && article.status === 'published';
  $('wr-save').textContent = isPub ? 'Save changes' : 'Save draft';
  $('wr-publish').hidden = !!isPub;
  $('wr-delete').hidden = !article;

  const prev = $('wr-preview');
  prev.hidden = !article;
  if (article) prev.href = isPub ? `/insights/${article.slug}/` : `/admin/preview/${article.slug}/`;
  $('wr-preview-note').hidden = !article;

  counts();
  $('wr-title').focus();
}

async function open(slug) {
  await run(null, async () => {
    say('Opening…');
    const out = await send('GET', null, `?slug=${encodeURIComponent(slug)}`);
    say('');
    showEditor(out.article, out.body);
  });
}

async function save(status, btn) {
  await run(btn, async () => {
    const f = form();
    if (!current) {
      say('Saving…');
      const out = await send('POST', f);
      list = out.articles;
      loaded = f;
      showEditor(out.article, f.body);
      saved('Draft saved.');
      return;
    }
    say(status === 'published' ? 'Publishing…' : 'Saving…');
    const out = await send('PUT', { ...f, status }, `?slug=${encodeURIComponent(current.slug)}`);
    list = out.articles;
    loaded = f;
    showEditor(out.article, f.body);
    saved(status === 'published' ? 'Published.' : 'Saved.');
  });
}

function saved(what) {
  say(`${what} The website is rebuilding and will show the change in about two minutes.`, 'good');
}

async function remove() {
  if (!current) return;
  const what = current.status === 'published'
    ? `Delete "${current.title}"?\n\nIt is published, so this removes it from the website.`
    : `Delete the draft "${current.title}"?`;
  if (!window.confirm(`${what}\n\nIt stays in the site's history and can be recovered with git, but not from this page.`)) return;

  await run($('wr-delete'), async () => {
    say('Deleting…');
    const out = await send('DELETE', null, `?slug=${encodeURIComponent(current.slug)}`);
    list = out.articles;
    loaded = form();
    showList();
    saved('Deleted.');
  });
}

function leaveEditor() {
  if (isDirty() && !window.confirm('You have changes that have not been saved.\n\nLeave and lose them?')) return;
  loaded = form();
  say('');
  showList();
}

/* ── wiring ── */

$('wr-new').addEventListener('click', () => { say(''); showEditor(null, ''); });
$('wr-back').addEventListener('click', leaveEditor);
$('wr-save').addEventListener('click', () => save(current && current.status === 'published' ? 'published' : 'draft', $('wr-save')));
$('wr-publish').addEventListener('click', () => save('published', $('wr-publish')));
$('wr-delete').addEventListener('click', remove);

['wr-title', 'wr-desc', 'wr-body'].forEach((id) => $(id).addEventListener('input', counts));

/* Tab should indent inside the article, not jump to the next control. Anyone
   writing a list or a code block expects it, and losing focus mid-sentence is
   maddening. Escape still moves on, so the textarea is not a keyboard trap. */
$('wr-body').addEventListener('keydown', (e) => {
  if (e.key !== 'Tab' || e.shiftKey) return;
  e.preventDefault();
  const el = e.target;
  const { selectionStart: s, selectionEnd: t } = el;
  el.value = el.value.slice(0, s) + '  ' + el.value.slice(t);
  el.selectionStart = el.selectionEnd = s + 2;
  counts();
});

window.addEventListener('beforeunload', (e) => {
  if (!$('wr-edit-pane').hidden && isDirty()) { e.preventDefault(); e.returnValue = ''; }
});

(async function start() {
  try {
    const out = await send('GET');
    list = out.articles;
    $('wr-loading').hidden = true;
    showList();
  } catch (err) {
    $('wr-loading').hidden = true;
    $('wr-list-pane').hidden = false;
    fail(err);
    renderList();
  }
})();
