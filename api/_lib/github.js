'use strict';

/* Writing to the repository.

   The site is static: the only way to change it is to commit. So the panel
   commits, GitHub Actions builds, and Azure publishes — about two minutes end
   to end. Nothing is written at runtime, which means the site cannot be broken
   by this function being down, and a bad change can be undone with `git
   revert` like any other.

   Everything goes through the Git Data API rather than the simpler Contents
   API, for one reason: a photograph and the manifest entry that points at it
   must land in the SAME commit. With the Contents API that is two commits, and
   between them the site either references an image that does not exist or
   holds an image nothing references — and each commit triggers its own build.
   Blobs, tree, commit, ref is more code and is correct.

   The token is a fine-grained GitHub token with Contents: read and write on
   this repository only. It lives in the Static Web App's application settings
   and is never sent to the browser. */

const API = 'https://api.github.com';

function config() {
  const slug = process.env.GH_REPO || 'jmcengineering/jmcengg.com';
  const [owner, repo] = slug.split('/');
  return {
    owner,
    repo,
    branch: process.env.GH_BRANCH || 'main',
    token: process.env.GITHUB_TOKEN || process.env.GH_TOKEN || '',
  };
}

class GitHubError extends Error {
  constructor(message, status, detail) {
    super(message);
    this.status = status;
    this.detail = detail;
  }
}

async function gh(path, init = {}) {
  const { token } = config();
  if (!token) throw new GitHubError('no_token', 503, 'GITHUB_TOKEN is not set on the Static Web App.');

  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'jmcengg-admin',
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  });

  if (res.status === 404) return null;

  const text = await res.text();
  if (!res.ok) {
    /* Never echo the raw GitHub body to the browser — it can carry the token's
       own metadata. Log it, return the shape only. */
    throw new GitHubError(`github_${res.status}`, res.status, text.slice(0, 500));
  }
  return text ? JSON.parse(text) : {};
}

/* Read a file at the tip of the branch. Returns its text, or null if absent.
   Reading from GitHub rather than from the deployed site means the panel shows
   a change the moment it is saved, not two minutes later when the build lands. */
async function readFile(path) {
  const { owner, repo, branch } = config();
  const out = await gh(`/repos/${owner}/${repo}/contents/${encodeURI(path)}?ref=${encodeURIComponent(branch)}`);
  if (!out || !out.content) return null;
  return Buffer.from(out.content, out.encoding === 'base64' ? 'base64' : 'utf8').toString('utf8');
}

/* files: [{ path, text }] or [{ path, base64 }] or [{ path, remove: true }]
   Returns the new commit sha. */
async function commitFiles({ message, files, author }) {
  const { owner, repo, branch } = config();
  const base = `/repos/${owner}/${repo}`;

  /* One retry. If another editor commits between us reading the head and
     updating the ref, GitHub refuses the non-fast-forward and we rebuild the
     tree on the new head rather than overwriting their work. */
  for (let attempt = 0; attempt < 2; attempt++) {
    const ref = await gh(`${base}/git/ref/heads/${encodeURIComponent(branch)}`);
    if (!ref) throw new GitHubError('no_branch', 500, `Branch ${branch} not found.`);
    const headSha = ref.object.sha;
    const headCommit = await gh(`${base}/git/commits/${headSha}`);

    const tree = [];
    for (const f of files) {
      if (f.remove) {
        tree.push({ path: f.path, mode: '100644', type: 'blob', sha: null });
        continue;
      }
      const blob = await gh(`${base}/git/blobs`, {
        method: 'POST',
        body: JSON.stringify(
          f.base64 ? { content: f.base64, encoding: 'base64' } : { content: f.text, encoding: 'utf-8' }
        ),
      });
      tree.push({ path: f.path, mode: '100644', type: 'blob', sha: blob.sha });
    }

    const newTree = await gh(`${base}/git/trees`, {
      method: 'POST',
      body: JSON.stringify({ base_tree: headCommit.tree.sha, tree }),
    });

    const commit = await gh(`${base}/git/commits`, {
      method: 'POST',
      body: JSON.stringify({
        message,
        tree: newTree.sha,
        parents: [headSha],
        ...(author ? { author } : {}),
      }),
    });

    try {
      await gh(`${base}/git/refs/heads/${encodeURIComponent(branch)}`, {
        method: 'PATCH',
        body: JSON.stringify({ sha: commit.sha, force: false }),
      });
      return commit.sha;
    } catch (err) {
      /* 422 is the fast-forward refusal — someone else got there first. */
      if (err.status === 422 && attempt === 0) continue;
      throw err;
    }
  }
  throw new GitHubError('busy', 409, 'Another change landed while this one was saving.');
}

module.exports = { config, readFile, commitFiles, gh, GitHubError };
