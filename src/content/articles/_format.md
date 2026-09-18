---
title: The format an article file takes
description: Not an article. A note for whoever opens this folder.
---

Files here are articles. One markdown file per article, named after its slug,
served at `/insights/<slug>/`.

Anything beginning with an underscore — like this file — is ignored by the
site. Park a half-finished draft as `_something.md` and it will not be built
or listed.

The admin panel at `/admin/blog/` writes these files. Editing one by hand
works, but `src/data/articles.json` holds the index the site lists from, so a
hand edit needs to change both. The panel changes both in one commit.

```
---
title: "Minimum web between pierced holes"
description: "The rule we use, why it exists, and what happens when it is ignored."
category: "Press Tools"
date: 2026-09-18
updated: 2026-09-18
author: "JMC Engineering"
status: published
---

Body in markdown. Headings start at `##` — the title above is the page's
only `<h1>`.
```

`status` is `draft` or `published`. A draft is not built into the public site
at all; it is previewed at `/admin/preview/<slug>/`, which Azure refuses to
anyone without a role.
