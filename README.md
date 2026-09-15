# jmcengg.com

Website for **JMC Engineering** — a precision tool room in Padi, Chennai making
jig fixtures, press tools, progressive dies, plastic moulds and gauges.

Live at <https://jmcengg.com> · served by GitHub Pages from `main` (see `CNAME`).

---

## What's in here

A hand-written static site. No build step, no framework, no dependencies —
open any `.html` file in a browser and it works.

| File | What it is |
|---|---|
| `index.html` | The whole marketing site. All CSS and JS are inline. |
| `drill-calculator.html` | Free tool — drill sizes and fit tolerances |
| `weight-calculator.html` | Free tool — material weight by shape and grade |
| `thanks.html` | Where the enquiry form lands after a successful send |
| `404.html` | Not-found page |
| `privacy-policy.html` | Privacy notice (DPDP Act 2023) |
| `terms.html` | Terms of use |
| `legal.css` | Shared styling for the two legal pages |
| `og-cover.png` | 1200×630 social preview, generated from the hero drawing |
| `sitemap.xml` · `robots.txt` | Search engine files |
| `logo.png` · `work-1.jpg` · `work-2.jpg` | Images |

## Running it locally

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

Use a server rather than opening the file directly — `file://` breaks the
gallery loader and relative paths.

## The two configuration placeholders

### 1. Works gallery storage — not yet set

```js
// index.html, in the config block at the top of the inline <script>
const STORAGE_ACCOUNT = 'REPLACE_WITH_YOUR_STORAGE_ACCOUNT';
```

Until a real storage account name is set, the gallery skips the network call
entirely and shows `work-1.jpg` and `work-2.jpg` from this repo. Nothing is
broken and no failing request is made.

Once cloud storage exists, put the account name here and upload a
`manifest.json` to the `works` container:

```json
{ "photos": [
    { "id": "jig-001", "label": "Jig fixture assembly",
      "featured": true, "order": 1, "w": 1600, "h": 1200 }
] }
```

Each entry expects `<id>.webp` in the same container. The first `featured`
photo also fills the About section image.

### 2. Vlog section — hidden until populated

```js
const videoConfig = [
  // { id: 'YOUTUBE_ID_HERE', title: 'Jig Fixture Manufacturing' },
];
```

The section stays hidden while this array is empty. Same for the Insights
section, which is `hidden` in the markup until real blog posts exist.

## The enquiry form

Posts to [FormSubmit](https://formsubmit.co) → `info@jmcengg.com`.

> **One-time activation required.** The first submission triggers a
> confirmation email to `info@jmcengg.com`. Click the link in it once and
> every later enquiry is delivered silently. Until that click, nothing
> arrives.

Client-side it checks attachments against a 10 MB limit and shows a sending
state. `_captcha` is set to `false` deliberately — the interstitial captcha
page loses real enquiries, and the `_honey` honeypot field plus the required
consent checkbox handle most bot traffic. Re-enable it by removing that hidden
input if spam becomes a problem.

**Known limitation:** attachments pass through FormSubmit's servers, outside
India. This is disclosed in the privacy policy, and replacing it with a
self-hosted form endpoint is planned. Customers under NDA are told to email
drawings directly instead.

## Editing content

Everything is in `index.html`. The sections, in order:

`hero` · `about` · `services` · `machinery` · `works` · `industries` ·
`process` · `tools` · `insights` (hidden) · `vlog` (hidden) · `credentials` ·
`contact`

Business details that appear in more than one place — phone, email, address,
GSTIN, UDYAM number — are also in the `LocalBusiness` JSON-LD block in
`<head>`. **If you change a phone number or address, change it there too**, or
Google will keep showing the old one.

## Restoring the deleted blog posts

Five blog files were deleted on 27 July 2026. They are still in git history:

```bash
git show 8fb2dfd^:blog-progressive-dies.html    > blog-progressive-dies.html
git show b4c3a02^:blog-msme-toolmakers.html     > blog-msme-toolmakers.html
git show acaaae3^:blog-engineering-business.html > blog-engineering-business.html
git show 4b82ca1^:blog-fixture-mistakes.html    > blog-fixture-mistakes.html
git show 90db604^:blog-post-template.html       > blog-post-template.html
```

Then remove `hidden` from `<section id="insights">`, restore the cards, and add
the URLs back to `sitemap.xml`.

## Conventions worth keeping

- **Never ship a placeholder to visitors.** A section with no content is
  `hidden`, not filled with an apology. This is why the works gallery falls
  back to real photos rather than a "coming soon" note.
- **Never create a detached image with `loading="lazy"`.** A detached lazy
  image is never in a viewport, so it never loads. Set `src` last, attach on
  `onload`. This bug silently broke the About image for months.
- **Check the title block after editing the hero SVG.** The drawing's title
  block cells are fixed-width; text that outgrows a cell collides with its
  neighbour.
- **Test at 390 px.** Most visitors are on a phone.

## Deploying

Push to `main`. GitHub Pages publishes within a minute or two.

A move to Azure Static Web Apps is planned — global CDN, free TLS, preview
builds per pull request, and a staff admin panel so photos and posts can be
published without touching this repository.

## Licence

© JMC Engineering. All rights reserved. Not open source — the code and content
here are the property of JMC Engineering.
