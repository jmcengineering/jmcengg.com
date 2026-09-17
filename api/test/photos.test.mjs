/* End-to-end test for /api/photos, run with `npm run test:api`.

   It drives the real handler against a simulated GitHub held in memory: blobs,
   trees, commits and the branch ref all behave as the real API does, including
   refusing a non-fast-forward push. Nothing here touches the network.

   Worth running before any change to the photos API. The cases that matter
   most are the ones that are invisible until they bite: that a photograph and
   its manifest entry land in ONE commit, that a stale browser tab cannot
   delete photographs it did not know about, that a path with .. in it cannot
   reach a workflow file, and that GitHub's own error text never reaches the
   browser. */
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
const require = createRequire(import.meta.url);
process.env.GITHUB_TOKEN = 'ghp_fake';
delete process.env.GH_TOKEN;
process.env.GH_REPO = 'jmcengineering/jmcengg.com';

const handler = require('../photos/index.js');

/* ── the fake repository ── */
let repo, blobs, trees, commits, headSha, commitLog, raceOnce;
function reset() {
  repo = new Map();
  repo.set('src/data/works.json', JSON.stringify({ _comment: 'c', photos: [
    { file: '/work-1.jpg', label: 'Jig fixture assembly', featured: true, order: 1, w: 1024, h: 458 },
    { file: '/work-2.jpg', label: 'Press tool detail', featured: false, order: 2, w: 1024, h: 458 },
  ] }, null, 2));
  blobs = new Map(); trees = new Map(); commits = new Map();
  headSha = 'head0'; commits.set('head0', { tree: { sha: 'tree0' } });
  trees.set('tree0', []); commitLog = []; raceOnce = false;
}

globalThis.fetch = async (url, init = {}) => {
  const u = new URL(url);
  const p = u.pathname.replace('/repos/jmcengineering/jmcengg.com', '');
  const m = (init.method || 'GET').toUpperCase();
  const body = init.body ? JSON.parse(init.body) : null;
  const ok = (o) => ({ ok: true, status: 200, text: async () => JSON.stringify(o) });
  const err = (s, t) => ({ ok: false, status: s, text: async () => t });

  if (m === 'GET' && p.startsWith('/contents/')) {
    const path = decodeURIComponent(p.slice('/contents/'.length));
    if (!repo.has(path)) return { ok: false, status: 404, text: async () => '' };
    return ok({ content: Buffer.from(repo.get(path)).toString('base64'), encoding: 'base64' });
  }
  if (m === 'GET' && p === '/git/ref/heads/main') return ok({ object: { sha: headSha } });
  if (m === 'GET' && p.startsWith('/git/commits/')) return ok(commits.get(p.split('/').pop()));
  if (m === 'POST' && p === '/git/blobs') {
    const sha = 'blob' + blobs.size; blobs.set(sha, body); return ok({ sha });
  }
  if (m === 'POST' && p === '/git/trees') {
    const sha = 'tree' + trees.size; trees.set(sha, body.tree); return ok({ sha });
  }
  if (m === 'POST' && p === '/git/commits') {
    const sha = 'commit' + commits.size;
    commits.set(sha, { tree: { sha: body.tree }, message: body.message, author: body.author, parents: body.parents });
    return ok({ sha });
  }
  if (m === 'PATCH' && p === '/git/refs/heads/main') {
    if (raceOnce) { raceOnce = false; return err(422, '{"message":"Update is not a fast forward"}'); }
    /* apply the tree to the fake working copy */
    const c = commits.get(body.sha);
    for (const e of trees.get(c.tree.sha)) {
      if (e.sha === null) repo.delete(e.path);
      else {
        const b = blobs.get(e.sha);
        repo.set(e.path, b.encoding === 'base64' ? Buffer.from(b.content, 'base64').toString('binary') : b.content);
      }
    }
    headSha = body.sha;
    commitLog.push({ sha: body.sha, message: c.message, author: c.author, files: trees.get(c.tree.sha).map((e) => (e.sha === null ? '- ' + e.path : '+ ' + e.path)) });
    return ok({});
  }
  throw new Error('unstubbed ' + m + ' ' + p);
};

/* ── harness ── */
const principal = (roles) => Buffer.from(JSON.stringify({ userId: 'u1', userDetails: 'ravi@jmcengg.com', identityProvider: 'aad', userRoles: roles })).toString('base64');
const ctx = () => { const c = { log: Object.assign(() => {}, { error: () => {} }) }; return c; };
async function call(method, { roles = ['authenticated', 'editor'], body, query } = {}) {
  const c = ctx();
  const req = { method, headers: roles ? { 'x-ms-client-principal': principal(roles) } : {}, body, query: query || {}, rawBody: body ? JSON.stringify(body) : undefined };
  await handler(c, req);
  return { status: c.res.status, body: JSON.parse(c.res.body) };
}
const jpeg = 'data:image/jpeg;base64,' + Buffer.alloc(40000, 7).toString('base64');
let pass = 0, fail = 0;
function check(name, cond, extra) {
  if (cond) { pass++; console.log('  ok  ', name); }
  else { fail++; console.log('  FAIL', name, extra === undefined ? '' : JSON.stringify(extra)); }
}

/* ── 1. auth ── */
reset();
console.log('\n[auth]');
check('no header -> 401 signed_out', (await call('GET', { roles: null })).body.code === 'signed_out');
check('signed in, no role -> 403 no_role', (await call('GET', { roles: ['authenticated'] })).body.code === 'no_role');
check('editor -> 200', (await call('GET')).status === 200);

/* ── 2. read ── */
console.log('\n[read]');
let r = await call('GET');
check('returns both photos', r.body.photos.length === 2, r.body);
check('featured first', r.body.photos[0].file === '/work-1.jpg');
check('orders renumbered from 1', r.body.photos.map((p) => p.order).join(',') === '1,2');

/* ── 3. add ── */
console.log('\n[add]');
r = await call('POST', { body: { photos: [
  { name: 'Blanking die for 3 mm mild steel', description: 'Finished blanking die on the bench with the punch located', dataUrl: jpeg, w: 1600, h: 1200, featured: true },
  { name: 'Wire cut EDM cutting a punch profile', description: 'Wire cut machine part way through a punch profile in D2', dataUrl: jpeg, w: 1600, h: 900 },
] } });
check('200', r.status === 200, r.body);
check('exactly one commit for 2 images + manifest', commitLog.length === 1, commitLog);
check('commit carries 3 files', commitLog[0].files.length === 3, commitLog[0].files);
check('filenames are slugs', commitLog[0].files.includes('+ public/works/blanking-die-for-3-mm-mild-steel.jpg'), commitLog[0].files);
check('author is the signed-in editor', commitLog[0].author.email === 'ravi@jmcengg.com', commitLog[0].author);
check('new featured displaced the old', r.body.photos.filter((p) => p.featured).length === 1 && r.body.photos[0].label.startsWith('Blanking'), r.body.photos.map((p) => [p.label, p.featured]));
check('alt stored', r.body.photos[0].alt.startsWith('Finished blanking'), r.body.photos[0]);
check('manifest on disk is valid JSON', (() => { try { return JSON.parse(repo.get('src/data/works.json')).photos.length === 4; } catch { return false; } })());
check('manifest ends with a newline', repo.get('src/data/works.json').endsWith('\n'));

/* ── 4. validation ── */
console.log('\n[validation]');
const bad = async (photo) => (await call('POST', { body: { photos: [photo] } }));
r = await bad({ name: 'IMG_4471', description: 'Something on the bench in the tool room', dataUrl: jpeg });
check('camera filename refused, quoting it', r.status === 400 && r.body.message.includes('IMG_4471'), r.body);
r = await bad({ name: 'press tool press tool press tool chennai', description: 'A press tool on the bench ready for dispatch', dataUrl: jpeg });
check('keyword stuffing refused', r.status === 400 && r.body.message.includes('penalise'), r.body);
r = await bad({ name: 'Blanking die set', description: 'die die die', dataUrl: jpeg });
check('stuffed description refused', r.status === 400, r.body);
r = await bad({ name: 'Blanking die set', description: 'A blanking die set open on the bench', dataUrl: 'data:text/html;base64,AAAA' });
check('non-image refused', r.status === 400 && r.body.message.includes('JPEG'), r.body);
r = await bad({ name: 'Blanking die set', description: 'A blanking die set open on the bench', dataUrl: 'data:image/jpeg;base64,' + Buffer.alloc(6 * 1024 * 1024, 1).toString('base64') });
check('oversize refused with the size named', r.status === 400 && /6\.0 MB/.test(r.body.message), r.body);
r = await call('POST', { body: { photos: new Array(9).fill({ name: 'Blanking die set', description: 'A blanking die set on the bench', dataUrl: jpeg }) } });
check('more than 8 refused', r.body.code === 'too_many', r.body);
const before = commitLog.length;
check('no rejected attempt committed anything', before === 1, commitLog.length);

/* ── 5. duplicate names ── */
console.log('\n[duplicate names]');
r = await call('POST', { body: { photos: [{ name: 'Blanking die for 3 mm mild steel', description: 'A second angle on the same blanking die', dataUrl: jpeg }] } });
check('second identical name gets -2', r.body.photos.some((p) => p.file === '/works/blanking-die-for-3-mm-mild-steel-2.jpg'), r.body.photos.map((p) => p.file));

/* ── 6. edit ── */
console.log('\n[edit]');
let cur = (await call('GET')).body.photos;
const reordered = [cur[1], cur[0], ...cur.slice(2)].map((p, i) => ({ file: p.file, label: p.label, alt: p.alt || 'A photograph taken on the JMC tool room floor', featured: i === 0, order: i + 1 }));
r = await call('PUT', { body: { photos: reordered } });
check('200', r.status === 200, r.body);
check('order swapped', r.body.photos[0].file === cur[1].file, r.body.photos.map((p) => p.file));
check('one featured only', r.body.photos.filter((p) => p.featured).length === 1);
r = await call('PUT', { body: { photos: [{ file: '/works/does-not-exist.jpg', label: 'Invented entry', alt: 'Points at nothing at all', featured: false, order: 1 }] } });
check('cannot invent an entry', r.status === 400 && r.body.message.includes('no longer in the gallery'), r.body);
cur = (await call('GET')).body.photos;
r = await call('PUT', { body: { photos: [{ file: cur[0].file, label: cur[0].label, alt: cur[0].alt, featured: true, order: 1 }] } });
check('a partial save keeps the photos it did not mention', r.body.photos.length === cur.length, r.body.photos.length + ' vs ' + cur.length);

/* ── 7. delete ── */
console.log('\n[delete]');
const n = (await call('GET')).body.photos.length;
r = await call('DELETE', { query: { file: '/works/blanking-die-for-3-mm-mild-steel-2.jpg' } });
check('200', r.status === 200, r.body);
check('gone from the manifest', r.body.photos.length === n - 1);
check('file deleted in the same commit', commitLog.at(-1).files.includes('- public/works/blanking-die-for-3-mm-mild-steel-2.jpg'), commitLog.at(-1).files);
r = await call('DELETE', { query: { file: '/../../.github/workflows/azure-swa.yml' } });
check('path traversal refused', r.status === 400, r.body);
r = await call('DELETE', { query: { file: '/works/already-gone.jpg' } });
check('unknown file refused', r.status === 400 && r.body.message.includes('not in the gallery'), r.body);

/* ── 8. the ref race ── */
console.log('\n[concurrency]');
raceOnce = true;
const cl = commitLog.length;
r = await call('POST', { body: { photos: [{ name: 'Shop floor wide view', description: 'The Padi tool room floor with machines running', dataUrl: jpeg }] } });
check('retries past a non-fast-forward and succeeds', r.status === 200 && commitLog.length === cl + 1, r.body);

/* ── 9. missing token ── */
console.log('\n[no token]');
delete process.env.GITHUB_TOKEN;
delete process.env.GH_TOKEN; /* this container has a real one; the fallback would find it */
r = await call('GET');
check('503 no_token with a plain explanation', r.status === 503 && r.body.code === 'no_token', r.body);
process.env.GITHUB_TOKEN = 'ghp_fake';

/* ── 10. token rejected ── */
console.log('\n[token rejected]');
const realFetch = globalThis.fetch;
globalThis.fetch = async () => ({ ok: false, status: 401, text: async () => '{"message":"Bad credentials"}' });
r = await call('GET');
check('502 token_rejected', r.body.code === 'token_rejected', r.body);
check('no GitHub body leaked to the browser', !JSON.stringify(r.body).includes('Bad credentials'), r.body);
globalThis.fetch = realFetch;

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
