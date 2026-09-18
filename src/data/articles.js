/* Loading the Insights articles at build time.

   Two sources, deliberately:

   - `articles.json` is the index. It is what the homepage and /insights/ list
     from, and it is the only place that knows about the four legacy articles,
     which are hand-written HTML in public/ rather than markdown.
   - `src/content/articles/<slug>.md` is the article itself. Astro's own
     markdown pipeline renders it; there is no markdown dependency here.

   The admin panel writes both in a single commit, so they agree. A person
   editing by hand can make them disagree, which is why the checks below run at
   build time — an article listed on the homepage with no file behind it is a
   404 in front of a customer, and it should stop the build rather than ship. */

import index from './articles.json';

const modules = import.meta.glob('../content/articles/*.md', { eager: true });

/* Underscore-prefixed files are ignored, the same convention Astro uses for
   pages. It is how you park a half-finished draft without it being built. */
const files = {};
for (const [path, mod] of Object.entries(modules)) {
  const slug = path.split('/').pop().replace(/\.md$/, '');
  if (slug.startsWith('_')) continue;
  files[slug] = mod;
}

const listed = new Set(index.articles.map((a) => a.slug));

for (const entry of index.articles) {
  if (entry.legacy) continue;
  if (!files[entry.slug]) {
    throw new Error(
      `articles.json lists "${entry.slug}" but src/content/articles/${entry.slug}.md does not exist. ` +
        `The site would link to a page that is not built. Add the file, or remove the entry.`
    );
  }
}

for (const slug of Object.keys(files)) {
  if (!listed.has(slug)) {
    /* Not fatal: the article exists and is readable at its URL, it is simply
       not listed anywhere. Worth saying out loud, because the usual cause is a
       hand edit that forgot the index. */
    console.warn(
      `[articles] src/content/articles/${slug}.md is not in articles.json, so nothing links to it.`
    );
  }
}

function merge(entry) {
  const mod = files[entry.slug];
  const fm = (mod && mod.frontmatter) || {};
  return {
    slug: entry.slug,
    legacy: entry.legacy === true,
    /* The markdown file wins where it exists: it is the thing a person edits
       by hand, and the index is generated alongside it. */
    title: fm.title || entry.title,
    description: fm.description || entry.description,
    category: fm.category || entry.category,
    date: fm.date || entry.date,
    updated: fm.updated || entry.updated || fm.date || entry.date,
    author: fm.author || entry.author || 'JMC Engineering',
    status: fm.status || entry.status || 'draft',
    url: entry.legacy ? entry.url : `/insights/${entry.slug}/`,
    Content: mod ? mod.Content : null,
    headings: mod && mod.getHeadings ? mod.getHeadings() : [],
  };
}

const newestFirst = (a, b) => new Date(b.date) - new Date(a.date);

export const articles = index.articles.map(merge).sort(newestFirst);
export const published = articles.filter((a) => a.status === 'published');
export const drafts = articles.filter((a) => a.status !== 'published');

/* Articles this site renders itself, i.e. everything with a markdown file
   behind it. The four legacy entries are NOT in here: they are hand-written
   HTML in public/ and keep their own /blog-*.html URLs, so building an
   /insights/ page for them would produce an empty page at a second URL for
   content that already exists — duplicate content, and a broken one. */
export const hosted = published.filter((a) => !a.legacy);

/* Everything the panel can preview but the public cannot reach. */
export const previewable = articles.filter((a) => !a.legacy);
