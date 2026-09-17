# The admin panel

At **https://jmcengg.com/admin/** — for JMC Engineering staff, so the website
can be updated without anyone touching GitHub.

## How access actually works

Two separate things, and keeping them separate is the point.

**Signing in** proves who you are. Any Microsoft account can do it. On its own
it grants nothing at all.

**A role** grants access. Roles are handed out one account at a time, by
invitation, from the Azure portal. Someone who finds `/admin` and signs in
without an invitation is told plainly that their account has no access — and
told that signing in again will not change it, because that is the thing people
otherwise try five times before concluding the site is broken.

The check is enforced by Azure at the edge, in `public/staticwebapp.config.json`,
before any page is served. It is not a JavaScript check that can be edited away
in a browser console.

### The two roles

| Role | Can |
|---|---|
| `editor` | Add photographs, write and publish articles |
| `admin` | Everything an editor can, plus invite other people |

Add more roles by adding them to `allowedRoles` in `staticwebapp.config.json`
and to `ROLE_LABEL` in `src/scripts/admin.js`. Both, or the panel will let
someone in and then not know what to call them.

### Why not restrict sign-in to the JMC tenant

Because that is "custom authentication", and Azure Static Web Apps only offers
it on the **Standard** plan — roughly ₹800 a month. On the Free plan a custom
provider registration is ignored.

It buys very little here. Restricting the tenant would stop a stranger reaching
a login page; it would not stop them reaching anything, because reaching
anything requires a role and roles are invitation-only. The plan is worth paying
for when the panel holds something worth attacking. It does not yet.

## Known fault: the built-in Entra ID sign-in is broken (17 Sep 2026)

Signing in fails with **401: Unauthorized** at
`identity.N.azurestaticapps.net/.auth/login/done`, and `/.auth/me` keeps
returning `clientPrincipal: null`. The login never completes, so roles and
invitations are not involved — there is nothing to fix on the invitation side.

This is a Microsoft platform fault, not a misconfiguration here. It is reported
against Static Web Apps **created within the last 48 hours**, on both Free and
Standard plans, across several `identity.N` hosts. `swa-jmcengg-prod` was
created on 16 September 2026, which puts it squarely in that window. Nothing in
`staticwebapp.config.json` can cause it: the failure happens on Microsoft's own
identity host before control returns to jmcengg.com.

**What to do, in order:**

1. **Retry over the next day or two.** Platform faults of this shape are
   normally fixed without anyone doing anything, and this costs nothing.
2. **Try GitHub sign-in** — `/.auth/login/github`. It is the other
   pre-configured provider and exercises a different path. If it works, the
   broker is fine and the fault is specific to Entra ID. It is also a usable
   fallback: roles still come from invitations, so the provider only decides
   how someone proves who they are. The cost is that staff need GitHub
   accounts, which are free but are one more thing to explain.
3. **Custom authentication on the Standard plan**, about ₹800 a month. This
   uses our own app registration and bypasses the broken pre-configured path
   entirely, which is the workaround Microsoft's own support threads point to.
   It also brings tenant restriction and an SLA. Only worth it if the panel
   has to work now and the first two options have not delivered.

The invitation you generate is unaffected and does not need redoing — it grants
a role to an identity, and no identity has been established yet.

## Inviting someone

Only an Owner or Contributor on the Azure resource can do this.

1. Azure portal → `rg-jmcengg-prod` → **`swa-jmcengg-prod`**
2. Left menu → **Role management** (under Settings)
3. **Invite**
4. Fill in:

   | Field | Value |
   |---|---|
   | Authorization provider | **Microsoft Entra ID** |
   | Invitee details | the person's email, e.g. `name@jmcengg.com` |
   | Domain | `jmcengg.com` |
   | Role | `editor` — or `admin` for someone who should invite others |
   | Maximum hours | up to `168` (7 days), which is how long the *invitation* is valid |

5. **Generate** produces an invitation link. Azure does not email it. Send it to
   them yourself — WhatsApp or email is fine, it is single-use and expires.
6. They open the link, sign in with their Microsoft account, and accept. The
   role is theirs from then on; the expiry applies to the unaccepted invitation,
   not to the access.

Up to **25 users** can be invited. That is a platform limit on both the Free
and Standard plans, and it is not a number this business is going to run into.

### Removing someone

Same screen: Role management → select the person → **Delete**. Access stops at
once. Do this on the day someone leaves, in the same pass as their email
account — an ex-employee keeping the ability to publish to the company website
is a worse problem than it first sounds.

## When it will not let you in

| What you see | What it means |
|---|---|
| "Use your @jmcengg.com account" | Signed out. Sign in |
| "this account has not been given access" | Signed in, never invited, or invited on a different account than the one you signed in with |
| Sent back here after signing in | The account you chose is not the invited one. Sign out fully, then sign in again and pick the right account |
| A blank page under /admin | Not expected. Report it rather than working around it |

A common one: someone is invited as `name@jmcengg.com` but signs in with a
personal `@outlook.com` or `@gmail.com` Microsoft account. Those are different
identities, and the role is attached to the invited one.

## What is built so far

- Sign-in, roles and route protection — **done**
- The panel shell: header, navigation, who you are signed in as — **done**
- Photos — not yet
- Writing — not yet

`/admin` and `/api` are disallowed in `robots.txt` and every admin page carries
`noindex, nofollow`. Neither is the actual protection — the role check is — but
they stop a URL that leaks into a link from being indexed.

## Files

| File | What it does |
|---|---|
| `public/staticwebapp.config.json` | The role check on `/admin`, `/admin/*` and `/api/*`, and the rewrite to the sign-in page on 401 and 403 |
| `src/layouts/Admin.astro` | The panel's shell. Deliberately not the public `Page` layout |
| `src/pages/admin/index.astro` | The dashboard |
| `src/pages/admin-signin/index.astro` | The sign-in and no-access page. Lives outside `/admin` on purpose — inside, the response to "you have no role" would itself need a role, which is a redirect loop |
| `src/scripts/admin.js` | Reads `/.auth/me` for display. Not a security control |
| `src/styles/admin.css` | Panel styling, on the site's own tokens |
