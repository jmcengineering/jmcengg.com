'use strict';

/* /api/photos — the gallery.

   GET     the current gallery, read from the branch tip
   POST    add photographs (one commit, images and manifest together)
   PUT     rename, re-describe, reorder, change which one is featured
   DELETE  remove one photograph and its file

   authLevel is "anonymous" in function.json and that is not a mistake: the
   Functions-level key is the wrong lock here. Access is decided by Static Web
   Apps at the edge from staticwebapp.config.json, and again by requireWriter
   below from the platform-signed principal header. A function key would only
   add a shared secret that every editor's browser would have to carry. */

const { requireWriter } = require('../_lib/auth');
const { respond, readBody, commitAuthor, fail } = require('../_lib/http');
const gh = require('../_lib/github');
const works = require('../_lib/works');

/* Client-side resizing brings a phone photograph down to a few hundred KB, so
   these ceilings are generous. They exist to stop an accidental 40 MB raw file
   from being pushed into the repository, where it would stay for ever: git
   keeps every version of every file, and a repository is not a photo library. */
const MAX_FILES = 8;
const MAX_ONE_BYTES = 5 * 1024 * 1024;
const MAX_TOTAL_BYTES = 12 * 1024 * 1024;

/* "data:image/jpeg;base64,/9j/4AA..." -> { base64, type, bytes } */
function decodeImage(dataUrl, where) {
  const m = /^data:(image\/(?:jpeg|png));base64,([A-Za-z0-9+/=\s]+)$/.exec(String(dataUrl || ''));
  if (!m) throw new Error(`That file is not a JPEG or PNG image${where}.`);
  const base64 = m[2].replace(/\s+/g, '');
  const bytes = Math.floor((base64.length * 3) / 4);
  if (bytes < 1024) throw new Error(`That image is empty or corrupt${where}.`);
  if (bytes > MAX_ONE_BYTES) {
    throw new Error(`That photograph is ${(bytes / 1048576).toFixed(1)} MB, over the 5 MB limit${where}. Try it again — the page normally shrinks photographs before sending them.`);
  }
  return { base64, type: m[1], bytes };
}

async function loadManifest() {
  const text = await gh.readFile(works.MANIFEST_PATH);
  return works.parse(text);
}

module.exports = async function (context, req) {
  const who = requireWriter(req);
  if (who.error) return respond(context, who.status, who.error);
  const user = who.user;

  try {
    const manifest = await loadManifest();

    /* ── read ── */
    if (req.method === 'GET') {
      return respond(context, 200, {
        photos: works.normalise(manifest.photos),
        you: { name: user.name, roles: user.roles },
      });
    }

    /* ── add ── */
    if (req.method === 'POST') {
      const body = readBody(req);
      const incoming = Array.isArray(body.photos) ? body.photos : [];
      if (!incoming.length) return respond(context, 400, { code: 'empty', message: 'No photographs were sent.' });
      if (incoming.length > MAX_FILES) {
        return respond(context, 400, {
          code: 'too_many',
          message: `${MAX_FILES} photographs at a time. Send the rest in a second batch — each batch is one commit and one rebuild.`,
        });
      }

      let total = 0;
      const prepared = incoming.map((item, i) => {
        const where = incoming.length > 1 ? ` (photograph ${i + 1})` : '';
        const img = decodeImage(item.dataUrl, where);
        total += img.bytes;
        return { ...item, base64: img.base64, type: img.type };
      });
      if (total > MAX_TOTAL_BYTES) {
        return respond(context, 400, {
          code: 'too_big',
          message: `That batch is ${(total / 1048576).toFixed(1)} MB in total, over the 12 MB limit. Send fewer at a time.`,
        });
      }

      const result = works.addPhotos(manifest, prepared);
      const names = result.added.map((p) => p.label);
      const sha = await gh.commitFiles({
        message:
          names.length === 1
            ? `Add a photograph: ${names[0]}`
            : `Add ${names.length} photographs to the gallery\n\n${names.map((n) => `- ${n}`).join('\n')}`,
        author: commitAuthor(user),
        files: [
          ...result.files,
          { path: works.MANIFEST_PATH, text: works.serialise({ ...manifest, photos: result.photos }) },
        ],
      });

      context.log(`photos: ${user.name} added ${names.length} (${sha.slice(0, 7)})`);
      return respond(context, 200, { ok: true, commit: sha, photos: result.photos, added: result.added });
    }

    /* ── rename, reorder, re-feature ── */
    if (req.method === 'PUT') {
      const body = readBody(req);
      const incoming = Array.isArray(body.photos) ? body.photos : [];
      if (!incoming.length) return respond(context, 400, { code: 'empty', message: 'Nothing to save.' });

      const photos = works.applyEdits(manifest, incoming);
      const sha = await gh.commitFiles({
        message: 'Update the gallery captions and order',
        author: commitAuthor(user),
        files: [{ path: works.MANIFEST_PATH, text: works.serialise({ ...manifest, photos }) }],
      });

      context.log(`photos: ${user.name} edited the gallery (${sha.slice(0, 7)})`);
      return respond(context, 200, { ok: true, commit: sha, photos });
    }

    /* ── remove ── */
    if (req.method === 'DELETE') {
      const file = (req.query && req.query.file) || readBody(req).file;
      if (!file) return respond(context, 400, { code: 'no_file', message: 'Which photograph?' });

      const result = works.removePhoto(manifest, file);
      const sha = await gh.commitFiles({
        message: `Remove a photograph: ${result.entry.label || file}`,
        author: commitAuthor(user),
        files: [
          { path: result.repoPath, remove: true },
          { path: works.MANIFEST_PATH, text: works.serialise({ ...manifest, photos: result.photos }) },
        ],
      });

      context.log(`photos: ${user.name} removed ${file} (${sha.slice(0, 7)})`);
      return respond(context, 200, { ok: true, commit: sha, photos: result.photos });
    }

    return respond(context, 405, { code: 'method', message: `${req.method} is not supported here.` });
  } catch (err) {
    return fail(context, err);
  }
};
