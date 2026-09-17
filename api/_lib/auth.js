'use strict';

/* Who is calling.

   Static Web Apps has already refused this request if the caller has no role:
   /api/* carries allowedRoles in public/staticwebapp.config.json and the check
   happens at the edge, before the function is invoked. So this is the second
   lock, not the first.

   It is worth having anyway. The role check lives in a config file that one
   careless edit could widen, and a function that writes to the company's
   GitHub repository should not depend on a single line of JSON somewhere else
   being right. The x-ms-client-principal header is injected by the platform
   and cannot be set by a browser — SWA strips any inbound copy of it — so
   reading it here is a genuine check, not a decoration. */

const WRITERS = ['admin', 'editor'];

function principal(req) {
  const raw = (req.headers && (req.headers['x-ms-client-principal'] || req.headers['X-MS-CLIENT-PRINCIPAL'])) || '';
  if (!raw) return null;
  try {
    const json = Buffer.from(raw, 'base64').toString('utf8');
    const p = JSON.parse(json);
    if (!p || typeof p !== 'object') return null;
    return {
      id: p.userId || '',
      name: p.userDetails || '',
      provider: p.identityProvider || '',
      roles: Array.isArray(p.userRoles) ? p.userRoles : [],
    };
  } catch {
    return null;
  }
}

/* Returns the user, or a ready-to-send refusal. Callers do:
     const who = requireWriter(req);
     if (who.error) return respond(context, who.status, who.error);  */
function requireWriter(req) {
  const p = principal(req);
  if (!p || !p.id) {
    return { status: 401, error: { code: 'signed_out', message: 'You are not signed in.' } };
  }
  const mine = p.roles.filter((r) => WRITERS.includes(r));
  if (!mine.length) {
    return { status: 403, error: { code: 'no_role', message: 'This account has not been given access to edit the site.' } };
  }
  return { user: { ...p, roles: mine } };
}

module.exports = { principal, requireWriter, WRITERS };
