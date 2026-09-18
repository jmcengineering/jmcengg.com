/* End-to-end test for /api/articles, run with `npm run test:api`.

   Same shape as photos.test.mjs: the real handler against a simulated GitHub
   held in memory. The cases that matter most here are the ones that protect
   the site rather than the editor — that a thin page cannot be published, that
   the four legacy HTML articles cannot be edited or deleted through a route
   that would only half-work on them, and that the index and the markdown file
   always move in the same commit. */

import { createRequire } from 'module';
const require = createRequire(import.meta.url);
process.env.GITHUB_TOKEN = 'ghp_fake';
delete process.env.GH_TOKEN;
process.env.GH_REPO = 'jmcengineering/jmcengg.com';

const handler = require('../articles/index.js');
const INDEX = 'src/data/articles.json';

let repo, blobs, trees, commits, headSha, commitLog;
function reset() {
  repo = new Map();
  repo.set(INDEX, JSON.stringify({ _comment: 'c', articles: [
    { slug: 'progressive-dies', title: 'How We Design Progressive Dies for Tight Tolerances',
      description: 'Our design methodology for complex progressive dies, from strip layout to tryout.',
      category: 'Press Tools', date: '2025-05-01', status: 'published',
      url: '/blog-progressive-dies.html', legacy: true },
  ] }, null, 2));
  blobs = new Map(); trees = new Map(); commits = new Map();
  headSha = 'head0'; commits.set('head0', { tree: { sha: 'tree0' } });
  trees.set('tree0', []); commitLog = [];
}

globalThis.fetch = async (url, init = {}) => {
  const u = new URL(url);
  const p = u.pathname.replace('/repos/jmcengineering/jmcengg.com', '');
  const m = (init.method || 'GET').toUpperCase();
  const body = init.body ? JSON.parse(init.body) : null;
  const ok = (o) => ({ ok: true, status: 200, text: async () => JSON.stringify(o) });

  if (m === 'GET' && p.startsWith('/contents/')) {
    const path = decodeURIComponent(p.slice('/contents/'.length));
    if (!repo.has(path)) return { ok: false, status: 404, text: async () => '' };
    return ok({ content: Buffer.from(repo.get(path)).toString('base64'), encoding: 'base64' });
  }
  if (m === 'GET' && p === '/git/ref/heads/main') return ok({ object: { sha: headSha } });
  if (m === 'GET' && p.startsWith('/git/commits/')) return ok(commits.get(p.split('/').pop()));
  if (m === 'POST' && p === '/git/blobs') { const sha = 'blob' + blobs.size; blobs.set(sha, body); return ok({ sha }); }
  if (m === 'POST' && p === '/git/trees') { const sha = 'tree' + trees.size; trees.set(sha, body.tree); return ok({ sha }); }
  if (m === 'POST' && p === '/git/commits') {
    const sha = 'commit' + commits.size;
    commits.set(sha, { tree: { sha: body.tree }, message: body.message, author: body.author });
    return ok({ sha });
  }
  if (m === 'PATCH' && p === '/git/refs/heads/main') {
    const c = commits.get(body.sha);
    for (const e of trees.get(c.tree.sha)) {
      if (e.sha === null) repo.delete(e.path);
      else {
        const b = blobs.get(e.sha);
        repo.set(e.path, b.encoding === 'base64' ? Buffer.from(b.content, 'base64').toString('utf8') : b.content);
      }
    }
    headSha = body.sha;
    commitLog.push({ message: c.message, files: trees.get(c.tree.sha).map((e) => (e.sha === null ? '- ' + e.path : '+ ' + e.path)) });
    return ok({});
  }
  throw new Error('unstubbed ' + m + ' ' + p);
};

const principal = (roles) => Buffer.from(JSON.stringify({ userId: 'u1', userDetails: 'ravi@jmcengg.com', identityProvider: 'aad', userRoles: roles })).toString('base64');
async function call(method, { roles = ['authenticated', 'editor'], body, query } = {}) {
  const c = { log: Object.assign(() => {}, { error: () => {} }) };
  const req = { method, headers: roles ? { 'x-ms-client-principal': principal(roles) } : {}, body, query: query || {}, rawBody: body ? JSON.stringify(body) : undefined };
  await handler(c, req);
  return { status: c.res.status, body: JSON.parse(c.res.body) };
}

let pass = 0, fail = 0;
const check = (n, c, x) => { if (c) { pass++; console.log('  ok  ', n); } else { fail++; console.log('  FAIL', n, x === undefined ? '' : JSON.stringify(x)); } };

const GOOD = {
  title: 'Minimum web between pierced holes',
  description: 'The rule we use for the web between two pierced holes, why it exists, and what goes wrong on the press when it is ignored.',
  category: 'Press Tools',
  body: 'A first draft.',
};
const LONG = ['## Why the web matters', '', 'x'.repeat(700)].join('\n');

reset();

console.log('\n[auth]');
check('no header -> 401', (await call('GET', { roles: null })).body.code === 'signed_out');
check('no role -> 403', (await call('GET', { roles: ['authenticated'] })).body.code === 'no_role');

console.log('\n[read]');
let r = await call('GET');
check('lists the legacy article', r.body.articles.length === 1 && r.body.articles[0].legacy === true);
check('hands back the category list', Array.isArray(r.body.categories) && r.body.categories.includes('Press Tools'));

console.log('\n[create]');
r = await call('POST', { body: GOOD });
check('200', r.status === 200, r.body);
const slug = r.body.article.slug;
check('slug from the title', slug === 'minimum-web-between-pierced-holes', slug);
check('starts as a draft', r.body.article.status === 'draft');
check('one commit, file + index', commitLog.length === 1 && commitLog[0].files.length === 2, commitLog);
check('commit message names the article', commitLog[0].message.includes('Minimum web'), commitLog[0].message);
check('markdown written with frontmatter', repo.get(`src/content/articles/${slug}.md`).startsWith('---\ntitle: "Minimum web'), repo.get(`src/content/articles/${slug}.md`).slice(0, 40));
check('index is valid JSON', JSON.parse(repo.get(INDEX)).articles.length === 2);

console.log('\n[read one]');
r = await call('GET', { query: { slug } });
check('body round-trips exactly', r.body.body === 'A first draft.', r.body.body);
check('editable', r.body.editable === true);
r = await call('GET', { query: { slug: 'progressive-dies' } });
check('legacy is readable but not editable', r.body.editable === false && r.body.body === null, r.body);

console.log('\n[publishing rules]');
r = await call('PUT', { query: { slug }, body: { ...GOOD, status: 'published', body: 'Still far too short.' } });
check('thin article refused', r.status === 400 && r.body.message.includes('too thin'), r.body);
r = await call('PUT', { query: { slug }, body: { ...GOOD, status: 'published', body: 'x'.repeat(700) } });
check('no headings refused', r.status === 400 && r.body.message.includes('heading'), r.body);
r = await call('PUT', { query: { slug }, body: { ...GOOD, description: 'Too short.', status: 'draft', body: 'ok' } });
check('short summary refused', r.status === 400 && r.body.message.includes('summary'), r.body);
r = await call('PUT', { query: { slug }, body: { ...GOOD, description: 'x'.repeat(200), status: 'draft', body: 'ok' } });
check('long summary refused, length named', r.status === 400 && r.body.message.includes('200 characters'), r.body);
r = await call('PUT', { query: { slug }, body: { ...GOOD, category: 'Invented', status: 'draft', body: 'ok' } });
check('unknown category refused, options listed', r.status === 400 && r.body.message.includes('Press Tools'), r.body);
check('nothing was committed by any refusal', commitLog.length === 1, commitLog.length);

console.log('\n[publish]');
r = await call('PUT', { query: { slug }, body: { ...GOOD, status: 'published', body: LONG } });
check('200', r.status === 200, r.body);
check('now published', r.body.article.status === 'published');
check('dated today, not the draft date', r.body.article.date === new Date().toISOString().slice(0, 10), r.body.article.date);
check('commit says Publish', commitLog.at(-1).message.startsWith('Publish:'), commitLog.at(-1).message);
check('status written into the file', /\nstatus: published\n/.test(repo.get(`src/content/articles/${slug}.md`)));
const published = JSON.parse(repo.get(INDEX)).articles.find((a) => a.slug === slug);
check('index agrees with the file', published.status === 'published');

console.log('\n[edit after publishing]');
const dateBefore = published.date;
r = await call('PUT', { query: { slug }, body: { ...GOOD, status: 'published', body: LONG + '\n\nA correction.' } });
check('published date is not rewritten', r.body.article.date === dateBefore, [r.body.article.date, dateBefore]);
check('commit says Update', commitLog.at(-1).message.startsWith('Update a published'), commitLog.at(-1).message);

console.log('\n[legacy is protected]');
r = await call('PUT', { query: { slug: 'progressive-dies' }, body: { ...GOOD, body: LONG, status: 'published' } });
check('cannot be edited', r.status === 400 && r.body.message.includes('does not edit those'), r.body);
r = await call('DELETE', { query: { slug: 'progressive-dies' } });
check('cannot be deleted', r.status === 400 && r.body.message.includes('does not edit those'), r.body);
check('still in the index', JSON.parse(repo.get(INDEX)).articles.some((a) => a.slug === 'progressive-dies'));

console.log('\n[delete]');
r = await call('DELETE', { query: { slug } });
check('200', r.status === 200, r.body);
check('file and index in one commit', commitLog.at(-1).files.length === 2 && commitLog.at(-1).files.includes(`- src/content/articles/${slug}.md`), commitLog.at(-1).files);
check('markdown gone', !repo.has(`src/content/articles/${slug}.md`));
r = await call('DELETE', { query: { slug: 'never-existed' } });
check('unknown slug refused', r.status === 400 && r.body.message.includes('not in the index'), r.body);

console.log('\n[duplicate titles]');
await call('POST', { body: GOOD });
r = await call('POST', { body: GOOD });
check('second gets a -2 slug', r.body.article.slug === 'minimum-web-between-pierced-holes-2', r.body.article.slug);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
