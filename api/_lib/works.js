'use strict';

/* The gallery manifest: src/data/works.json.

   The homepage imports this file and renders the gallery at build time, so
   whatever is written here is in the HTML Google reads. That is the whole
   reason the panel edits a file in the repository instead of a database. */

const { checkName, checkDescription, slugify, uniqueSlug, tidy } = require('./validate');

const MANIFEST_PATH = 'src/data/works.json';
const PHOTO_DIR = 'public/works';
const COMMENT =
  'The Our Work gallery. Written by the admin panel at /admin/photos/ — you can edit it by hand, but the panel is the expected route. Files live in public/works/ except the two originals, which predate this and sit at the site root. Order is: featured first, then by `order`, then by the order they appear here.';

/* Where a manifest entry's file actually lives in the repository. The `file`
   value is a site-absolute URL path; public/ is the site root at build time. */
function repoPathFor(file) {
  if (typeof file !== 'string' || !file.startsWith('/') || file.includes('..') || file.includes('//')) return null;
  return `public${file}`;
}

function parse(text) {
  if (!text) return { _comment: COMMENT, photos: [] };
  const raw = JSON.parse(text);
  const photos = Array.isArray(raw && raw.photos) ? raw.photos : [];
  return { _comment: raw._comment || COMMENT, photos: photos.filter((p) => p && typeof p.file === 'string') };
}

function serialise(manifest) {
  /* Two-space JSON with a trailing newline: the same shape a person editing
     the file by hand would leave, so the diffs stay readable. */
  return `${JSON.stringify({ _comment: manifest._comment || COMMENT, photos: manifest.photos }, null, 2)}\n`;
}

/* Exactly one featured photograph, orders renumbered 1..n in display order.
   Called after every mutation so the file never drifts into a state the
   homepage has to guess about. */
function normalise(photos) {
  const sorted = [...photos].sort(
    (a, b) => (b.featured === true) - (a.featured === true) || (a.order ?? 0) - (b.order ?? 0)
  );
  let seenFeatured = false;
  return sorted.map((p, i) => {
    const featured = p.featured === true && !seenFeatured;
    if (featured) seenFeatured = true;
    return {
      file: p.file,
      label: p.label,
      alt: p.alt || '',
      featured,
      order: i + 1,
      w: p.w || null,
      h: p.h || null,
    };
  });
}

function takenSlugs(photos) {
  const set = new Set();
  for (const p of photos) {
    const m = /([^/]+)\.[a-z0-9]+$/i.exec(p.file || '');
    if (m) set.add(m[1].toLowerCase());
  }
  return set;
}

/* Turn submitted photographs into manifest entries plus the files to commit.
   Throws a plain Error whose message is safe to show the person: every one of
   these is something they typed and can fix. */
function addPhotos(manifest, incoming) {
  const taken = takenSlugs(manifest.photos);
  const photos = [...manifest.photos];
  const files = [];
  const added = [];

  incoming.forEach((item, i) => {
    const where = incoming.length > 1 ? ` (photograph ${i + 1})` : '';

    const name = checkName(item.name);
    if (name.error) throw new Error(name.error + where);
    const desc = checkDescription(item.description);
    if (desc.error) throw new Error(desc.error + where);

    const ext = item.type === 'image/png' ? 'png' : 'jpg';
    const slug = uniqueSlug(slugify(name.value), taken);
    const file = `/works/${slug}.${ext}`;

    files.push({ path: `${PHOTO_DIR}/${slug}.${ext}`, base64: item.base64 });

    const entry = {
      file,
      label: name.value,
      alt: desc.value,
      featured: item.featured === true,
      order: photos.length + i + 1,
      w: Number(item.w) || null,
      h: Number(item.h) || null,
    };
    photos.push(entry);
    added.push(entry);
  });

  /* A new featured photograph displaces the old one; normalise keeps the
     first in sort order and clears the rest. */
  if (added.some((p) => p.featured)) {
    for (const p of photos) if (!added.includes(p)) p.featured = false;
  }

  return { photos: normalise(photos), files, added };
}

/* A full replacement of the ordering and wording. The caller may only send
   files that are already in the manifest — this is not a route for inventing
   entries that point at images nobody uploaded. */
function applyEdits(manifest, incoming) {
  const known = new Map(manifest.photos.map((p) => [p.file, p]));
  const seen = new Set();
  const out = [];

  for (const item of incoming) {
    const existing = known.get(item.file);
    if (!existing) throw new Error('That photograph is no longer in the gallery — reload the page and try again.');
    if (seen.has(item.file)) throw new Error('The same photograph was sent twice.');
    seen.add(item.file);

    const name = checkName(item.label);
    if (name.error) throw new Error(`${name.error} (${existing.label || item.file})`);
    const desc = checkDescription(item.alt);
    if (desc.error) throw new Error(`${desc.error} (${existing.label || item.file})`);

    out.push({
      ...existing,
      label: name.value,
      alt: desc.value,
      featured: item.featured === true,
      order: Number(item.order) || out.length + 1,
    });
  }

  /* Anything the browser did not send stays exactly where it was — a stale
     tab must not be able to silently delete photographs. */
  for (const p of manifest.photos) if (!seen.has(p.file)) out.push(p);

  return normalise(out);
}

function removePhoto(manifest, file) {
  const entry = manifest.photos.find((p) => p.file === file);
  if (!entry) throw new Error('That photograph is not in the gallery.');
  const repoPath = repoPathFor(file);
  if (!repoPath) throw new Error('That photograph has an unusable path and was not removed.');
  return { photos: normalise(manifest.photos.filter((p) => p.file !== file)), repoPath, entry };
}

module.exports = { MANIFEST_PATH, PHOTO_DIR, COMMENT, parse, serialise, normalise, addPhotos, applyEdits, removePhoto, repoPathFor, tidy };
