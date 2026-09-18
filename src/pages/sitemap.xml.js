/* The sitemap, generated at build time.

   It used to be a hand-written file in public/, and the README said so: "that
   file is still maintained by hand; it is the one place adding a page needs a
   second edit." That was a wart when pages were added a few times a year. It
   becomes a real problem the moment the admin panel can publish an article,
   because an article nobody adds to the sitemap is an article Google finds
   late or not at all — which defeats the point of writing it.

   Capability and industry pages come from the same data the pages themselves
   are built from, so they cannot drift. The static list below is the handful
   of routes that are not generated from data. */

import { capabilities } from '../data/capabilities.js';
import { industries } from '../data/industries.js';
import { published } from '../data/articles.js';
import { isoDate } from '../data/article-meta.js';

const SITE = 'https://jmcengg.com';

/* Pages with no data file behind them. `lastmod` is the date the content last
   meaningfully changed — not the build date, which would tell Google every
   page changed every time anyone touched anything. */
const STATIC = [
  { path: '/', changefreq: 'weekly', priority: '1.0', lastmod: '2026-09-17' },
  { path: '/capabilities/', changefreq: 'weekly', priority: '0.9', lastmod: '2026-09-15' },
  { path: '/industries/', changefreq: 'weekly', priority: '0.9', lastmod: '2026-09-15' },
  { path: '/insights/', changefreq: 'weekly', priority: '0.8', lastmod: '2026-09-18' },
  { path: '/pcd-calculator/', changefreq: 'monthly', priority: '0.8', lastmod: '2026-09-15' },
  { path: '/drill-calculator.html', changefreq: 'monthly', priority: '0.8', lastmod: '2026-09-15' },
  { path: '/weight-calculator.html', changefreq: 'monthly', priority: '0.8', lastmod: '2026-09-15' },
  { path: '/privacy-policy.html', changefreq: 'yearly', priority: '0.3', lastmod: '2026-09-17' },
  { path: '/terms.html', changefreq: 'yearly', priority: '0.3', lastmod: '2026-09-15' },
];

function url({ path, lastmod, changefreq, priority }) {
  return `  <url>
    <loc>${SITE}${path}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`;
}

export function GET() {
  const entries = [
    ...STATIC.map(url),

    ...capabilities.map((c) =>
      url({ path: `/capabilities/${c.slug}/`, lastmod: '2026-09-15', changefreq: 'monthly', priority: '0.9' })
    ),

    ...industries.map((i) =>
      url({ path: `/industries/${i.slug}/`, lastmod: '2026-09-15', changefreq: 'monthly', priority: '0.8' })
    ),

    /* Articles carry their own dates. `updated` is what Google wants in
       lastmod — when the writing last changed, not when it first appeared. */
    ...published.map((a) =>
      url({
        path: a.url,
        lastmod: isoDate(a.updated) || isoDate(a.date),
        changefreq: 'yearly',
        priority: '0.7',
      })
    ),
  ];

  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries.join('\n\n')}\n</urlset>\n`,
    { headers: { 'Content-Type': 'application/xml; charset=utf-8' } }
  );
}
