import { defineConfig } from 'astro/config';

// Static output. Everything already written by hand — the homepage, the
// calculators, the blog posts, the legal pages — sits in public/ and is
// copied through untouched. Astro generates the new section pages on top,
// so nothing that already works had to be rewritten to get here.
export default defineConfig({
  site: 'https://jmcengg.com',
  output: 'static',
  build: { format: 'directory' },
  devToolbar: { enabled: false },
});
