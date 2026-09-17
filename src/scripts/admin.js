/* Admin panel — shared behaviour.

   Identity comes from Static Web Apps, not from us. /.auth/me is served by the
   platform and reflects the session cookie it set at sign-in, so it cannot be
   faked from the browser console in any way that matters: the same platform
   enforces the role check on the route itself before this page is ever served.

   That is worth being clear about, because the pattern looks insecure and is
   not. Nothing here is a security control. If someone edits `role` in memory
   they change what this page *says*, not what they can reach — every /admin
   and /api route is refused at the edge by staticwebapp.config.json before a
   byte of this file loads. What follows is display and convenience only. */

export const ROLE_LABEL = {
  admin: 'Administrator',
  editor: 'Editor',
};

/* Roles that are ours, in the order we want them shown. Static Web Apps also
   hands back `anonymous` and `authenticated` on every session; they are true
   of everyone and say nothing, so they are filtered out rather than displayed
   as though they were a grant. */
const OURS = Object.keys(ROLE_LABEL);

let cached = null;

export async function whoami() {
  if (cached) return cached;
  try {
    const r = await fetch('/.auth/me', { credentials: 'include' });
    if (!r.ok) return (cached = { signedIn: false, roles: [], name: '', id: '' });
    const body = await r.json();
    const p = body && body.clientPrincipal;
    if (!p) return (cached = { signedIn: false, roles: [], name: '', id: '' });
    const roles = (p.userRoles || []).filter((x) => OURS.includes(x));
    return (cached = {
      signedIn: true,
      name: p.userDetails || '',
      id: p.userId || '',
      provider: p.identityProvider || '',
      roles,
      isAdmin: roles.includes('admin'),
    });
  } catch {
    /* Offline, or the platform is having a moment. Say so rather than
       rendering a half-page that looks signed out. */
    return (cached = { signedIn: false, roles: [], name: '', id: '', error: true });
  }
}

/* Paint the identity into the header bar. */
(async function () {
  const wrap = document.getElementById('adm-user');
  if (!wrap) return;
  const me = await whoami();
  if (!me.signedIn) return;

  const nameEl = document.getElementById('adm-name');
  const roleEl = document.getElementById('adm-role');
  if (nameEl) nameEl.textContent = me.name;
  if (roleEl) {
    roleEl.textContent = me.roles.length
      ? me.roles.map((r) => ROLE_LABEL[r] || r).join(' · ')
      : 'No role assigned';
    if (!me.roles.length) roleEl.classList.add('warn');
  }
  wrap.hidden = false;
})();
