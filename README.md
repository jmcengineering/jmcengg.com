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

`.github/workflows/azure-swa.yml` builds and publishes to **Azure Static Web
Apps** on every push to `main`. Every pull request gets its own preview URL,
torn down when the pull request closes.

| | |
|---|---|
| Live at | <https://jmcengg.com> and <https://www.jmcengg.com> |
| Hosted on | Azure Static Web Apps, Free tier, East Asia |
| Resource | `swa-jmcengg-prod` in `rg-jmcengg-prod` |
| Azure hostname | `black-mud-0cdfad000.1.azurestaticapps.net` — still works, useful for testing |
| Cost | ₹0. The Free tier covers 100 GB/month, SSL and custom domains |

The infrastructure is code: `infra/main.bicep` declares the Static Web App and
`.github/workflows/azure-infra.yml` applies it on demand. It is deliberately
not run on every push — content changes many times a day, infrastructure a few
times a year.

**No deployment token is stored in this repository.** GitHub proves its
identity to Entra ID with a short-lived OIDC token and reads the Static Web
App's deployment token from Azure at run time, masked, for that one run. There
is no password to rotate and nothing to leak. The federated trust is pinned to
this repository and to either the `azure-production` environment or a pull
request, and the identity holds Contributor on one resource group and nothing
wider.

The full setup, including everything that had to be done by hand in the Azure
portal and at GoDaddy, is in **[docs/azure-setup.md](docs/azure-setup.md)**.

### DNS

Records live at **GoDaddy** — My Products → Domains → jmcengg.com → DNS.

| Host | Type | Value | What it does |
|---|---|---|---|
| `@` | A | `52.175.64.109` | The apex, pointed at the Static Web App's `stableInboundIP` |
| `www` | CNAME | `black-mud-0cdfad000.1.azurestaticapps.net` | The www subdomain |
| `@` | TXT | `_381pzek3…` | Azure's proof of domain ownership. Leave it |

GoDaddy supports neither ALIAS nor ANAME, so the apex has to be an A record.
That pins apex traffic to a single Static Web Apps host rather than the global
edge — an accepted trade for a business whose visitors are mostly in India.

**Never touch the `MX`, SPF `TXT`, `_domainkey` or `autodiscover` rows.** Those
carry the company's Microsoft 365 email. There are three TXT records on `@` and
all three must stay: Azure's, the SPF one, and the `MS=` one.

### GitHub Pages is gone

The site served from GitHub Pages until 17 September 2026. `deploy.yml`, the
repo-root `CNAME` and `public/CNAME` were all deleted once Azure was live and
verified, and Pages was switched off in Settings → Pages.

Two things worth keeping from that era:

- **A custom domain is settings state, not just a file.** Moving `CNAME` out of
  the repository root once cleared GitHub's custom-domain setting and
  jmcengg.com returned *"There isn't a GitHub Pages site here"* — a whole-site
  outage, with the build and deploy both green and DNS untouched. Azure works
  differently: the custom domain is a resource on the Static Web App, declared
  in the portal, and no file in this repository affects it.
- **Rollback, if ever needed**, is to restore the four GitHub Pages A records
  (`185.199.108.153`, `.109.153`, `.110.153`, `.111.153`) at GoDaddy, re-enable
  Pages, re-save the custom domain, and `git revert` the commit that removed
  `deploy.yml`. It is recorded here because the knowledge is worth keeping, not
  because it is expected.

### The Node 20 deprecation warning

Every Actions run ends with a warning that some actions target Node.js 20 and
are being forced onto Node.js 24. As of September 2026 the remaining ones are
`setup-node@v4`, `upload-artifact@v5` and `download-artifact@v5`.

**Do not chase it.** `checkout` and `azure/login` were moved to v5 and v3,
which did clear them. The artifact actions were then moved v4 to v5 and the
warning stayed, because v5 is the current major and still targets Node 20
upstream — there is no newer tag to move to that fixes it. Nothing is broken:
the actions run on Node 24 and every job passes. Revisit when the maintainers
ship Node 24 builds, not before. Guessing at version tags to silence a log
line is how a working pipeline collects changes nobody validated.

### The placeholder gate

`scripts/check-placeholders.sh` fails the build if placeholder text reaches the
output. This exists because the site has shipped placeholders to real visitors
twice — a contact form posting to `REPLACE_WITH_YOUR_FORMSUBMIT_HASH` that
binned every enquiry, and a gallery pointed at
`REPLACE_WITH_YOUR_STORAGE_ACCOUNT` that told visitors the portfolio was "being
photographed". Both were live for months.

Exceptions are listed in the script with a reason. **There is one outstanding**:
the storage account below.

## The works gallery

Lives in this repository — `src/data/works.json` for the captions and ordering,
`public/works/` for the files. The homepage imports the manifest and renders the
gallery at build time, so the photographs are in the HTML that Google fetches.

There is no storage account and no runtime fetch. That was the earlier design
and it was wrong for this site: it put the photographs outside the HTML, cost
money, and added a service that could be down. At twenty photographs the whole
gallery is smaller than one page of most websites.

Staff add photographs at **[/admin/photos/](https://jmcengg.com/admin/photos/)**,
which commits to this repository through `/api/photos`. Editing the JSON by hand
works too; the panel is just the expected route.

```json
{ "photos": [
    { "file": "/works/blanking-die-for-3-mm-mild-steel.jpg",
      "label": "Blanking die for 3 mm mild steel",
      "alt": "Finished blanking die on the bench with the punch located",
      "featured": true, "order": 1, "w": 1600, "h": 1067 }
] }
```

`label` is the caption and the filename; `alt` is the alt text and the
`ImageObject` description in the page's structured data. The `featured` photo
also fills the About section image. Exactly one is featured — the API enforces
that on every write, so the file cannot drift into a state the homepage has to
guess about.

## Outstanding configuration

### Enquiry form

Posts to [FormSubmit](https://formsubmit.co) → `info@jmcengg.com`.

> **Activation is per origin, and it is not a one-time thing.** The first
> submission from any new hostname triggers a confirmation email to that
> address; until someone clicks the link, submissions from that host are
> silently not delivered.
>
> **This makes every hostname change an outage in waiting.** The activation
> email fires only *when someone submits* — so the first person to use the form
> on a new host has their enquiry consumed as the trigger rather than delivered
> to us. If that person is a customer, the enquiry is simply gone.
>
> **So whenever this site starts serving from a new hostname, submit a test
> enquiry yourself and click the link before anyone else finds the form.**
>
> **Activated:** `jmcengg.com` and the `azurestaticapps.net` host, both on
> 17 September 2026, reported confirmed by the owner. Before that the form had
> been unactivated on the live domain since 16 July 2026, so nothing submitted
> in that window was ever delivered.
>
> Update this line only when a test enquiry has genuinely landed in the inbox,
> never when a link has merely been clicked.

### Enquiries land in Junk, and that is not FormSubmit's fault

Microsoft 365 files `submissions@formsubmit.co` as spam. The three test
enquiries on 17 September 2026 were all delivered correctly and all went
straight to **Junk Email**, unread.

This is the worst kind of failure for this business: FormSubmit reports
success, the enquiry exists, and nobody sees it. It is indistinguishable from
the form being broken unless you think to look in Junk.

The filter dislikes the shape of the message — the From is
`submissions@formsubmit.co` while the Reply-To is the customer's own address,
and the body is a table of form fields. It will not correct itself.

**Fixed 17 September 2026** by adding `formsubmit.co` to the safe senders list:
Outlook → Settings → Mail → Junk email → Safe senders and domains. Marking a
message *Not junk* does the same thing and offers to trust the sender
permanently.

**If enquiries ever seem to stop, look in Junk before assuming the form broke.**

`_captcha` is `false` deliberately — the interstitial captcha page loses real
enquiries, and the `_honey` honeypot plus the required consent checkbox handle
most bots. Remove that hidden input to re-enable it.

**Known limitation:** attachments pass through FormSubmit's servers, outside
India. Disclosed in the privacy policy; customers under NDA are told to email
drawings directly. Replacing this with a self-hosted endpoint is planned.

### Vlog section

Hidden while `videoConfig` in `src/scripts/home.js` is empty. Paste real YouTube
IDs in and it appears.

## Editing the homepage

The markup is `src/pages/index.astro`, the styling `src/styles/home.css`, the
behaviour `src/scripts/home.js`. (`public/index.html` no longer exists — it was
migrated in September 2026.) Sections in order:

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
