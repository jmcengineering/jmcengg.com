'use strict';

/* /api/articles — the Insights articles.

   GET                 the index: every article, drafts included
   GET    ?slug=x      one article, with its markdown body
   POST                create a draft
   PUT    ?slug=x      save changes; status decides draft or published
   DELETE ?slug=x      delete it

   Same two locks as /api/photos: Static Web Apps refuses the route at the edge
   to anyone without a role, and requireWriter checks the platform-signed
   principal again here.

   Publishing is not a separate endpoint. It is PUT with status "published",
   which means the same validation runs on the way in and an article cannot be
   published by a route that skipped the checks. */

const { requireWriter } = require('../_lib/auth');
const { respond, readBody, commitAuthor, fail } = require('../_lib/http');
const gh = require('../_lib/github');
const articles = require('../_lib/articles');

async function loadIndex() {
  const text = await gh.readFile(articles.MANIFEST_PATH);
  return articles.parse(text);
}

module.exports = async function (context, req) {
  const who = requireWriter(req);
  if (who.error) return respond(context, who.status, who.error);
  const user = who.user;
  const slug = (req.query && req.query.slug) || '';

  try {
    const manifest = await loadIndex();

    /* ── read ── */
    if (req.method === 'GET') {
      if (!slug) {
        return respond(context, 200, {
          articles: articles.sortIndex(manifest.articles),
          categories: articles.CATEGORIES,
          you: { name: user.name, roles: user.roles },
        });
      }

      const entry = articles.find(manifest, slug);
      if (entry.legacy) {
        return respond(context, 200, { article: entry, body: null, editable: false });
      }
      const markdown = await gh.readFile(articles.contentPath(slug));
      if (markdown === null) {
        return respond(context, 404, {
          code: 'missing_file',
          message: 'The index lists this article but its file is missing from the repository.',
        });
      }
      return respond(context, 200, {
        article: entry,
        body: articles.extractBody(markdown),
        editable: true,
      });
    }

    /* ── create ── */
    if (req.method === 'POST') {
      const body = readBody(req);
      const result = articles.create(manifest, body);
      const sha = await gh.commitFiles({
        message: `Start an article: ${result.entry.title}`,
        author: commitAuthor(user),
        files: [
          ...result.files,
          { path: articles.MANIFEST_PATH, text: articles.serialise({ ...manifest, articles: result.articles }) },
        ],
      });
      context.log(`articles: ${user.name} created ${result.entry.slug} (${sha.slice(0, 7)})`);
      return respond(context, 200, { ok: true, commit: sha, article: result.entry, articles: result.articles });
    }

    /* ── save ── */
    if (req.method === 'PUT') {
      if (!slug) return respond(context, 400, { code: 'no_slug', message: 'Which article?' });
      const body = readBody(req);
      const wasPublished = articles.find(manifest, slug).status === 'published';
      const result = articles.update(manifest, slug, body);

      const published = result.entry.status === 'published';
      const message = published
        ? wasPublished
          ? `Update a published article: ${result.entry.title}`
          : `Publish: ${result.entry.title}`
        : `Save a draft: ${result.entry.title}`;

      const sha = await gh.commitFiles({
        message,
        author: commitAuthor(user),
        files: [
          ...result.files,
          { path: articles.MANIFEST_PATH, text: articles.serialise({ ...manifest, articles: result.articles }) },
        ],
      });
      context.log(`articles: ${user.name} saved ${slug} as ${result.entry.status} (${sha.slice(0, 7)})`);
      return respond(context, 200, { ok: true, commit: sha, article: result.entry, articles: result.articles });
    }

    /* ── delete ── */
    if (req.method === 'DELETE') {
      if (!slug) return respond(context, 400, { code: 'no_slug', message: 'Which article?' });
      const result = articles.remove(manifest, slug);
      const sha = await gh.commitFiles({
        message: `Delete an article: ${result.entry.title}`,
        author: commitAuthor(user),
        files: [
          ...result.files,
          { path: articles.MANIFEST_PATH, text: articles.serialise({ ...manifest, articles: result.articles }) },
        ],
      });
      context.log(`articles: ${user.name} deleted ${slug} (${sha.slice(0, 7)})`);
      return respond(context, 200, { ok: true, commit: sha, articles: result.articles });
    }

    return respond(context, 405, { code: 'method', message: `${req.method} is not supported here.` });
  } catch (err) {
    return fail(context, err);
  }
};
