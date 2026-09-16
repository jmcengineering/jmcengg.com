# jmcengg.com

Website for **JMC Engineering** — a precision tool room in Padi, Chennai making
jig fixtures, press tools, progressive dies, plastic moulds and gauges.

Live at <https://jmcengg.com>.

---

## How this repo is put together

An [Astro](https://astro.build) static site. The section pages are generated
from data files; everything hand-written predates that and is served as-is.

```
src/
  components/     Nav, Footer, Floats — the chrome, used by every page
  data/           capabilities.js, industries.js — one object per page
  layouts/        Page.astro — head, meta and JSON-LD for section pages
  pages/          index.astro (homepage) + the generated routes
  scripts/        chrome.js (shared) · home.js · pcd.js
  styles/         base.css (shared) · home.css · site.css · pcd.css
public/           copied to the output untouched
  *-calculator.html, blog-*.html, privacy-policy.html, terms.html, …
scripts/          check-placeholders.sh — build gate
dist/             build output (gitignored)
```

**Where the migration has got to.** The homepage is now `src/pages/index.astro`
rather than a 92 KB hand-written file in `public/`; its CSS and JS are real
files that a browser caches and a person can edit without scrolling through
markup. The markup itself was moved, not rewritten — page height, section list,
nav targets, form action and element counts are byte-identical to the version
that was live before the move, at both 1280px and 390px.

The calculators, blog posts and legal pages are still hand-written HTML in
`public/`, and that is fine: nothing is duplicated between them.

**Nothing is duplicated any more.** The nav, footer and floating buttons are
components in `src/components/`, their styling is in `base.css` and their
behaviour is in `chrome.js` — all three loaded by every page. A nav change is
one edit.

The two stylesheets had quietly drifted apart before this: buttons at 14px vs
13px padding, the eyebrow rule 26px vs 24px, body type 15/1.7 vs 15.5/1.68.
`base.css` takes the homepage's values as canonical, because that is the
design that has been live and approved, so the section pages moved onto them.
The homepage is byte-identical; the section pages shifted by 9–72px in height
and now match it exactly.

**The section pages gained a working mobile menu.** They never had one — their
nav links simply vanished below 900px with nothing to open. Sharing the nav
fixed that by construction, along with the WhatsApp and back-to-top buttons.

One thing to watch when editing `.band`: the shared navbar is `position:fixed`,
so the first element on a page needs top padding to clear it. The section pages'
old nav was `position:sticky` and needed none, which is how the breadcrumb ended
up hidden behind the navbar the first time these were merged.

## Running it

```bash
npm install
npm run dev      # http://localhost:4321
npm run build    # -> dist/
npm run preview  # serve dist/ locally
```

## The PCD calculator

`/pcd-calculator/` is an Astro page (`src/pages/pcd-calculator.astro`) with its
logic in `src/scripts/pcd.js`. It exports DXF, G-code, CSV and PDF.

Two things to know before changing it:

- **The maths is unit-agnostic.** Everything is a ratio or a linear scale, so
  the mm/inch switch converts the values in the fields and changes what the
  exporters declare — there is no second internal scale to keep in step.
- **The DXF is deliberately R12 ASCII, ENTITIES only.** That is the dialect
  every CAD package and wire-EDM controller still reads without complaint.
  Holes, centre marks and the pitch circle go on separate named layers so the
  holes can be selected on their own.

The thread presets in `THREADS` are medium-fit clearance and coarse-pitch tap
drill sizes in mm. If your shop works to a different standard, that object is
the only place to change them.

jsPDF loads from cdnjs. If it fails to load the Export PDF button falls back to
the print dialogue rather than sitting dead.

## Adding a capability or an industry page

Add one object to `src/data/capabilities.js` or `src/data/industries.js`. That
single edit creates the page, its card on the hub page, its footer nav entry
and its cross-links from related pages. There is no second place to update.

Each entry drives: the `<title>` and meta description, the H1 and lede, the
"what we build" list, the spec table, the numbered process, the "what to send
us" panel, and the FAQ — which is also emitted as FAQ structured data so the
questions can appear directly in Google results.

**Then add the URL to `public/sitemap.xml`.** That file is still maintained by
hand; it is the one place adding a page needs a second edit.

## Deploying

`.github/workflows/deploy.yml` builds and publishes to GitHub Pages on every
push to `main`, and builds (without deploying) on every pull request.

> **One-time setup before the first deploy from `main`:**
> Settings → Pages → Build and deployment → Source must be changed from
> **"Deploy from a branch"** to **"GitHub Actions"**. Until it is, Pages keeps
> serving the old branch contents and the deploy step fails.

### The custom domain is settings state, not just a file

`public/CNAME` contains `jmcengg.com` and is copied to the root of `dist/`.
**That file alone does not bind the domain.** The binding lives in
Settings → Pages → Custom domain.

Moving `CNAME` out of the repository root once cleared that setting, and
`jmcengg.com` started returning *"There isn't a GitHub Pages site here"* —
a whole-site outage, not a 404, even though the build and deploy had both
succeeded and DNS was untouched.

If that happens again: Settings → Pages → Custom domain → enter
`jmcengg.com` → Save, wait for the DNS check, then tick **Enforce HTTPS**
once the certificate has been issued. Do not add a `base` to
`astro.config.mjs` to "fix" a 404 — every path on the site is root-absolute
and correct for the apex domain.

**There are deliberately two CNAME files. Do not delete either.**

| File | Who owns it | What it does |
|---|---|---|
| `CNAME` (repo root) | Written by GitHub when you save the custom domain | Records the setting. Deleting it unbinds the domain again. |
| `public/CNAME` | Ours | Copied into `dist/` so the deployed artifact carries the domain. |

They must hold the same value (`jmcengg.com`). Two identical files in one
repo looks like a mistake and invites a tidy-up; that tidy-up is an outage.

### The placeholder gate

`scripts/check-placeholders.sh` fails the build if placeholder text reaches the
output. This exists because the site has shipped placeholders to real visitors
twice — a contact form posting to `REPLACE_WITH_YOUR_FORMSUBMIT_HASH` that
binned every enquiry, and a gallery pointed at
`REPLACE_WITH_YOUR_STORAGE_ACCOUNT` that told visitors the portfolio was "being
photographed". Both were live for months.

Exceptions are listed in the script with a reason. **There is one outstanding**:
the storage account below.

## Outstanding configuration

### Works gallery storage — not yet set

```js
// public/index.html, config block at the top of the inline <script>
const STORAGE_ACCOUNT = 'REPLACE_WITH_YOUR_STORAGE_ACCOUNT';
```

Until a real account name is set, the loader detects the placeholder, skips the
network call entirely and shows `work-1.jpg` and `work-2.jpg` from this repo.
Nothing is broken and no failing request is made.

Once storage exists, set the name and upload a `manifest.json` to the `works`
container:

```json
{ "photos": [
    { "id": "jig-001", "label": "Jig fixture assembly",
      "featured": true, "order": 1, "w": 1600, "h": 1200 }
] }
```

Each entry expects `<id>.webp` alongside it. The first `featured` photo also
fills the About section image.

### Enquiry form

Posts to [FormSubmit](https://formsubmit.co) → `info@jmcengg.com`.

> **One-time activation required.** The first submission triggers a confirmation
> email to that address. Click the link in it once and every later enquiry is
> delivered silently. Until that click, nothing arrives.

`_captcha` is `false` deliberately — the interstitial captcha page loses real
enquiries, and the `_honey` honeypot plus the required consent checkbox handle
most bots. Remove that hidden input to re-enable it.

**Known limitation:** attachments pass through FormSubmit's servers, outside
India. Disclosed in the privacy policy; customers under NDA are told to email
drawings directly. Replacing this with a self-hosted endpoint is planned.

### Vlog section

Hidden while `videoConfig` in `public/index.html` is empty. Paste real YouTube
IDs in and it appears.

## Editing the homepage

Everything is in `public/index.html`. Sections in order:

`hero` · `about` · `services` · `machinery` · `works` · `industries` ·
`process` · `tools` · `insights` · `vlog` (hidden) · `credentials` · `contact`

Business details that appear in more than one place — phone, email, address,
GSTIN, UDYAM — are also in the `LocalBusiness` JSON-LD in `<head>`, and again
in `src/layouts/Page.astro` for the generated pages. **Change a phone number or
address and you must change all three**, or Google will keep showing the old one.

## Conventions worth keeping

- **Never ship a placeholder to visitors.** A section with no content is
  `hidden`, not filled with an apology. The build gate enforces this.
- **Never create a detached image with `loading="lazy"`.** A detached lazy image
  is never in a viewport, so it never loads. Set `src` last and attach on
  `onload`. This silently broke the About image for months.
- **Scroll-reveal styles stay scoped to `.js-on`.** A script failure must leave
  content visible, never blank.
- **Check the title block after editing the hero SVG.** Its cells are
  fixed-width; text that outgrows one collides with its neighbour.
- **Test at 390 px.** Most visitors are on a phone.

## Restoring older content

Five blog files were deleted on 27 July 2026 and restored on 15 September 2026.
If anything else goes missing, it is recoverable:

```bash
git log --diff-filter=D --name-only   # find the deleting commit
git show <sha>^:<path> > <path>       # restore from its parent
```

## Licence

© JMC Engineering. All rights reserved. Not open source — the code and content
here are the property of JMC Engineering.
