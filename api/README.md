# The admin API

Azure Static Web Apps **managed functions**, serving `/api/*` for the admin
panel. Included in the Free plan: 1,000,000 executions a month, against which
this uses perhaps fifty.

## It has no dependencies, deliberately

No `node_modules`, no `npm install`, nothing to bundle. Node 20 has `fetch`
built in, and the GitHub REST API is JSON over HTTPS — a dependency would buy
nothing and cost a supply chain.

This is why the deploy workflow passes `skip_api_build: true`: there is nothing
to build. `platform.apiRuntime` in `public/staticwebapp.config.json` tells the
platform which Node to run it on, and without that line the functions never
start.

It also uses the classic programming model (`function.json` beside
`index.js`) rather than the v4 model, for the same reason: v4 requires the
`@azure/functions` package, and that would mean a build step.

## Routes

| | |
|---|---|
| `GET /api/photos` | The gallery, read from the tip of `main` |
| `POST /api/photos` | Add photographs — images and manifest in one commit |
| `PUT /api/photos` | Captions, descriptions, order, which one is featured |
| `DELETE /api/photos?file=…` | Remove one photograph and its file |
| `GET /api/articles` | The article index, drafts included |
| `GET /api/articles?slug=…` | One article, with its markdown body |
| `POST /api/articles` | Start a draft |
| `PUT /api/articles?slug=…` | Save it; `status` decides draft or published |
| `DELETE /api/articles?slug=…` | Delete it |

Publishing is not its own route. It is `PUT` with `status: "published"`, so the
same validation runs either way and nothing can reach the public site through a
path that skipped the checks.

Every write is one commit containing every file it touches — the image and the
manifest, or the markdown and the index. Never two.

## Access

Two locks, and neither is `authLevel` in `function.json` — that is set to
`anonymous` on purpose, because a function key would just be a shared secret
every editor's browser would have to carry.

1. **Static Web Apps, at the edge.** `/api/*` carries `allowedRoles` in
   `public/staticwebapp.config.json`. A caller without `admin` or `editor`
   never reaches the function.
2. **`_lib/auth.js`, in the function.** Reads the `x-ms-client-principal`
   header, which the platform injects and strips from inbound requests, so it
   cannot be forged from a browser.

The second exists because the first lives in a config file that one careless
edit could widen.

## Tests

```
npm run test:api
```

Drives the real handlers against a simulated GitHub held in memory — 73 cases
across the two endpoints. No network, no token needed. CI runs them on every
push, before anything is deployed.
