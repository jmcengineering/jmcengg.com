'use strict';

/* The Insights articles: src/data/articles.json plus one markdown file each.

   Why two files rather than one. The index is what the homepage and /insights/
   list from, so it has to be readable without opening twenty markdown files at
   build time — and the API has to be able to list articles without fetching
   each one from GitHub. The markdown file is the article. They are written in
   the same commit, always, so they cannot drift apart.

   Nothing here parses YAML. The frontmatter is written by this module from
   known fields, and reading only ever needs the body, which is everything
   after the second `---`. Pulling in a YAML parser to read back what we
   ourselves wrote would be a dependency bought for nothing. */

const { checkName, repeatedWord, slugify, uniqueSlug, tidy } = require('./validate');

const MANIFEST_PATH = 'src/data/articles.json';
const CONTENT_DIR = 'src/content/articles';

const COMMENT =
  'The Insights index. Written by the admin panel at /admin/blog/. Entries with `legacy: true` are the four hand-written HTML articles in public/ that predate this system — they keep their own URLs and their own markup, and the panel will not edit them. Everything else is a markdown file in src/content/articles/<slug>.md and is served at /insights/<slug>/. Newest first is the display order; `date` decides it, not position in this file.';

/* Must match src/data/article-meta.js. A category that is not on this list has
   no colour and no icon, so the card renders looking broken. */
const CATEGORIES = [
  'Press Tools', 'Fixtures', 'Moulds', 'Gauges',
  'Machining', 'Materials', 'Industry', 'Our Story',
];

const STATUSES = ['draft', 'published'];

function today() {
  return new Date().toISOString().slice(0, 10);
}

/* ── validation ──
   Looser than the photo rules in one respect and stricter in another. Looser:
   a headline is allowed to be a sentence. Stricter: the description is a meta
   description, which Google truncates around 160 characters and which is
   often the only thing a searcher reads before deciding whether to click. */

function checkTitle(raw) {
  const title = tidy(raw);
  if (!title) return { error: 'The article needs a title.' };
  if (title.length < 12) return { error: 'That title is too short to tell anyone what the article is about.' };
  if (title.length > 90) return { error: 'Keep the title under 90 characters — Google cuts it off around there.' };
  const words = title.split(/\s+/);
  if (words.length < 3) return { error: 'Three words at least. A title is a sentence, not a label.' };
  const rep = repeatedWord(title);
  if (rep) return { error: `"${rep}" appears three times in that title. Say it once.` };
  return { value: title };
}

function checkDescription(raw) {
  const text = tidy(raw);
  if (!text) return { error: 'Add a summary. It is the line under the title in Google results, and it decides whether anyone clicks.' };
  if (text.length < 50) return { error: 'The summary is too short. Aim for a full sentence — around 120 characters is the sweet spot.' };
  if (text.length > 160) return { error: `That summary is ${text.length} characters. Google cuts it off at about 160, so trim it to fit.` };
  if (text.split(/\s+/).length < 8) return { error: 'A few more words — this is the whole pitch for the article.' };
  const rep = repeatedWord(text);
  if (rep) return { error: `"${rep}" appears three times in that summary. Repetition reads as spam, to people and to search engines.` };
  return { value: text };
}

function checkCategory(raw) {
  const cat = tidy(raw);
  if (!cat) return { error: 'Pick a category.' };
  if (!CATEGORIES.includes(cat)) {
    return { error: `"${cat}" is not one of the categories. Choose one of: ${CATEGORIES.join(', ')}.` };
  }
  return { value: cat };
}

/* A draft may be a paragraph and a title — that is what a draft is for. A
   published article may not be, because a thin page is worse than no page:
   Google treats it as low quality and it drags on the rest of the site. */
function checkBody(raw, { publishing }) {
  const body = String(raw == null ? '' : raw).replace(/\r\n/g, '\n').trim();
  if (!publishing) return { value: body };
  if (body.length < 600) {
    return {
      error: `This article is about ${body.length} characters. That is too thin to publish — a page with very little on it is treated as low quality and drags on the whole site. Six hundred honest words is plenty; two hundred is not.`,
    };
  }
  if (!/^##\s+/m.test(body)) {
    return {
      error: 'Add at least one heading (a line starting with ## ). Long text with no headings is hard to read on a phone, and headings are how search engines work out what the article covers.',
    };
  }
  return { value: body };
}

/* ── the markdown file ── */

/* JSON string syntax is a valid YAML double-quoted scalar, so this escapes
   quotes, backslashes and newlines correctly without a YAML library. */
const yamlString = (v) => JSON.stringify(String(v));

function buildMarkdown(meta, body) {
  const lines = [
    '---',
    `title: ${yamlString(meta.title)}`,
    `description: ${yamlString(meta.description)}`,
    `category: ${yamlString(meta.category)}`,
    `date: ${meta.date}`,
    `updated: ${meta.updated}`,
    `author: ${yamlString(meta.author || 'JMC Engineering')}`,
    `status: ${meta.status}`,
    '---',
    '',
    body.trim(),
    '',
  ];
  return lines.join('\n');
}

/* Everything after the closing `---` of the frontmatter. If the file has no
   frontmatter at all, it is all body. */
function extractBody(markdown) {
  const text = String(markdown || '').replace(/\r\n/g, '\n');
  if (!text.startsWith('---')) return text.trim();
  const end = text.indexOf('\n---', 3);
  if (end === -1) return text.trim();
  const after = text.indexOf('\n', end + 1);
  return after === -1 ? '' : text.slice(after + 1).trim();
}

/* ── the index ── */

function parse(text) {
  if (!text) return { _comment: COMMENT, articles: [] };
  const raw = JSON.parse(text);
  const articles = Array.isArray(raw && raw.articles) ? raw.articles : [];
  return { _comment: raw._comment || COMMENT, articles: articles.filter((a) => a && typeof a.slug === 'string') };
}

function serialise(manifest) {
  return `${JSON.stringify({ _comment: manifest._comment || COMMENT, articles: manifest.articles }, null, 2)}\n`;
}

const newestFirst = (a, b) => new Date(b.date) - new Date(a.date);

function sortIndex(articles) {
  return [...articles].sort(newestFirst);
}

function find(manifest, slug) {
  const entry = manifest.articles.find((a) => a.slug === slug);
  if (!entry) throw new Error('That article is not in the index. Reload the page and try again.');
  return entry;
}

function refuseLegacy(entry) {
  if (entry.legacy) {
    throw new Error(
      `"${entry.title}" is one of the four older articles written as a standalone HTML page. The panel does not edit those — they live in public/${entry.url.replace(/^\//, '')}.`
    );
  }
}

function contentPath(slug) {
  if (!/^[a-z0-9][a-z0-9-]*$/.test(slug)) throw new Error('That article has an unusable name.');
  return `${CONTENT_DIR}/${slug}.md`;
}

/* ── operations ──
   Each returns { articles, files } — the new index and the files to commit.
   The caller commits them together, always. */

function create(manifest, input) {
  const title = checkTitle(input.title);
  if (title.error) throw new Error(title.error);
  const description = checkDescription(input.description);
  if (description.error) throw new Error(description.error);
  const category = checkCategory(input.category);
  if (category.error) throw new Error(category.error);
  const body = checkBody(input.body, { publishing: false });
  if (body.error) throw new Error(body.error);

  const taken = new Set(manifest.articles.map((a) => a.slug));
  const slug = uniqueSlug(slugify(title.value), taken);
  const date = today();

  const entry = {
    slug,
    title: title.value,
    description: description.value,
    category: category.value,
    date,
    updated: date,
    status: 'draft',
  };

  return {
    articles: sortIndex([...manifest.articles, entry]),
    files: [
      { path: contentPath(slug), text: buildMarkdown({ ...entry, author: 'JMC Engineering' }, body.value) },
    ],
    entry,
  };
}

function update(manifest, slug, input) {
  const existing = find(manifest, slug);
  refuseLegacy(existing);

  const status = input.status === undefined ? existing.status : tidy(input.status);
  if (!STATUSES.includes(status)) throw new Error(`"${status}" is not a status.`);
  const publishing = status === 'published';

  const title = checkTitle(input.title === undefined ? existing.title : input.title);
  if (title.error) throw new Error(title.error);
  const description = checkDescription(input.description === undefined ? existing.description : input.description);
  if (description.error) throw new Error(description.error);
  const category = checkCategory(input.category === undefined ? existing.category : input.category);
  if (category.error) throw new Error(category.error);
  const body = checkBody(input.body, { publishing });
  if (body.error) throw new Error(body.error);

  /* An article drafted three weeks ago and published today is dated today.
     Once published, the date is fixed and only `updated` moves — rewriting a
     published article's date to today every time a typo is fixed would tell
     Google the whole archive changes constantly, which is not true. */
  const firstPublish = publishing && existing.status !== 'published';
  const date = firstPublish ? today() : existing.date;

  const entry = {
    ...existing,
    title: title.value,
    description: description.value,
    category: category.value,
    date,
    updated: today(),
    status,
  };

  const articles = manifest.articles.map((a) => (a.slug === slug ? entry : a));

  return {
    articles: sortIndex(articles),
    files: [
      { path: contentPath(slug), text: buildMarkdown({ ...entry, author: existing.author }, body.value) },
    ],
    entry,
  };
}

function remove(manifest, slug) {
  const existing = find(manifest, slug);
  refuseLegacy(existing);
  return {
    articles: sortIndex(manifest.articles.filter((a) => a.slug !== slug)),
    files: [{ path: contentPath(slug), remove: true }],
    entry: existing,
  };
}

module.exports = {
  MANIFEST_PATH, CONTENT_DIR, CATEGORIES, STATUSES, COMMENT,
  parse, serialise, sortIndex, find, contentPath,
  buildMarkdown, extractBody,
  checkTitle, checkDescription, checkCategory, checkBody,
  create, update, remove,
};
