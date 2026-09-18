'use strict';

/* The plumbing both endpoints share: how a reply is shaped, how a request body
   is read, how a commit is attributed, and — the part worth keeping in one
   place — how a failure is described to the person looking at the screen.

   Error wording is deliberately centralised. "GitHub refused the panel's
   access token" has to mean exactly one thing, in exactly one place, or the
   troubleshooting table in docs/admin-panel.md stops being true. */

const gh = require('./github');

function respond(context, status, body) {
  context.res = {
    status,
    headers: {
      'Content-Type': 'application/json',
      /* Never cache: this is the editing surface, and a stale answer here
         means someone edits something that has already changed. */
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    },
    body: JSON.stringify(body),
  };
}

function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  const raw = req.rawBody || req.body;
  if (!raw) return {};
  return JSON.parse(typeof raw === 'string' ? raw : raw.toString('utf8'));
}

/* Attribution in git history, so "who changed this" is answerable a year from
   now. The email is the signed-in account's own; no address is invented. */
function commitAuthor(user) {
  const name = (user.name || 'JMC admin panel').split('@')[0];
  const email = /.+@.+\..+/.test(user.name || '') ? user.name : 'admin-panel@jmcengg.com';
  return { name, email, date: new Date().toISOString() };
}

/* Two shapes of failure, and they deserve different words. Something the
   person typed is theirs to fix and is quoted back verbatim. Anything else is
   ours: logged in full, described in one plain sentence. A stack trace on
   screen helps nobody standing in a tool room. */
function fail(context, err) {
  if (err instanceof gh.GitHubError) {
    context.log.error(`github failure: ${err.message} ${err.detail || ''}`);
    if (err.status === 503) {
      return respond(context, 503, {
        code: 'no_token',
        message: 'The panel cannot reach the website’s repository yet — its access token has not been set up.',
      });
    }
    if (err.status === 401 || err.status === 403) {
      return respond(context, 502, {
        code: 'token_rejected',
        message: 'GitHub refused the panel’s access token. It has most likely expired and needs replacing.',
      });
    }
    if (err.status === 409) {
      return respond(context, 409, {
        code: 'busy',
        message: 'Someone else saved a change at the same moment. Reload the page and try again.',
      });
    }
    return respond(context, 502, {
      code: 'github',
      message: 'The website’s repository did not accept the change. Nothing was saved.',
    });
  }
  context.log.error(`request failed: ${err && err.stack ? err.stack : err}`);
  return respond(context, 400, {
    code: 'rejected',
    message: String((err && err.message) || 'That could not be saved.'),
  });
}

module.exports = { respond, readBody, commitAuthor, fail };
