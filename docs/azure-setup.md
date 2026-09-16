# Azure setup — jmcengg.com

Everything in this repository that can be written as code already is. What is
left is nine things only you can do, because they need an Azure sign-in that no
build agent has. They are all in the browser and take about forty minutes.

**Nothing here touches the live site.** jmcengg.com keeps serving from GitHub
Pages throughout. Azure gets built alongside it, you test it on a temporary
Azure hostname, and only step 9 — which you do days later, when you are happy —
moves the domain across.

Sign in everywhere as **info@jmcengg.com**. That account owns the JMC
Engineering directory, and the whole point is to keep Azure inside the tenant
you already pay for rather than starting a second, unrelated account.

---

## What this costs

| | |
|---|---|
| Microsoft 365 Business Basic | ~₹300/month — already paying |
| Azure subscription | ₹0 to exist |
| Static Web Apps, Free tier | ₹0 — 100 GB bandwidth/month, free SSL, custom domains |
| **New spend** | **₹0** |

The subscription is a billing container, not a bill. It charges for resources
you create, and the only resource we create is on the Free tier. Set the budget
alert in step 1 anyway — it costs nothing and it means a mistake wakes you up
by email instead of by invoice.

---

## Step 1 — Get an Azure subscription in your existing tenant

This is the step that stopped you last time, when you saw no Pay-As-You-Go
option. The reason is that your Microsoft 365 tenant gives you a *directory* —
users, sign-in, groups — but a directory is not a subscription. Azure will not
show you a subscription to pick because you do not have one yet. You have to
add one.

1. Go to **https://signup.azure.com** and make sure the account shown top-right
   is info@jmcengg.com. If it is not, sign out and back in — otherwise the
   subscription lands in the wrong tenant and nothing later will line up.
2. Take the **free trial** if it is offered. It converts to Pay-As-You-Go at the
   end of the trial, and Pay-As-You-Go is the offer we want. Going in through
   the trial is simply the path that is open to you.
3. It asks for a phone number and a card. The card is for identity
   verification. Free-tier resources do not charge it.
4. Once it finishes, go to **https://portal.azure.com** → search
   **Subscriptions** → your subscription should be listed. Open it and copy the
   **Subscription ID** somewhere — you need it in step 6.
5. While you are in the subscription, open **Budgets** → **Add** → set a monthly
   budget of ₹500 with an alert at 80% to info@jmcengg.com. Belt and braces.

> If signup.azure.com refuses because the account is not a billing
> administrator, it is because info@jmcengg.com is not a Global Administrator of
> the tenant. Check at **admin.microsoft.com → Users → Active users →
> info@jmcengg.com → Roles**.

---

## Step 2 — Create the resource group

A resource group is a folder. Everything we build goes in one folder so it can
be found, billed and deleted as a unit.

1. Portal → search **Resource groups** → **Create**.
2. Subscription: the one from step 1.
3. Resource group name: **`rg-jmcengg-prod`** — exactly that, it is referenced
   by the workflows.
4. Region: **Central India**. A resource group's region only decides where its
   metadata record lives, so pick the one nearest home.
5. **Review + create** → **Create**.

---

## Step 3 — Register the identity GitHub will use

GitHub needs to be able to act in your Azure subscription. The old way to do
that is to create a password and paste it into GitHub, where it sits forever
and is as good as a key to the building. We are not doing that. We are
registering an application and telling Azure to trust tokens that GitHub mints
for this one repository — tokens that live for a few minutes and cannot be
reused anywhere else. There is no password to leak.

1. Portal → search **Microsoft Entra ID** → **App registrations** → **New
   registration**.
2. Name: **`github-jmcengg-deploy`**.
3. Supported account types: **Single tenant only - JMC Engineering** — the top
   option, and the one already selected. Older portal builds word this
   "Accounts in this organizational directory only"; it is the same setting.
   The other three let accounts outside your company use the registration.
4. Redirect URI: leave empty.
5. **Register**.
6. On the Overview page that appears, copy both:
   - **Application (client) ID**
   - **Directory (tenant) ID**

   You need both in step 6.

---

## Step 4 — Tell Azure which GitHub workflows to trust

Still on the `github-jmcengg-deploy` registration:

1. **Certificates & secrets** → **Federated credentials** tab → **Add
   credential**.
2. Scenario: **GitHub Actions deploying Azure resources**.

Add **two** credentials. Entity type is one value per credential, so you go
through this form **twice** — there is no screen on which you tick both. The
values must match exactly: they are compared character for character, and they
are case-sensitive.

**The newer portal asks for numeric IDs.** If the form has *Organization ID*
and *Repository ID* fields, these are the real values for this repository,
read from the GitHub API:

| | |
|---|---|
| Organization ID | `281013465` |
| Repository ID | `1236850364` |

**Credential 1 — production deploys**

| Field | Value |
|---|---|
| Organization | `jmcengineering` |
| Organization ID | `281013465` |
| Repository | `jmcengg.com` |
| Repository ID | `1236850364` |
| Entity type | **Environment** |
| Environment name | `azure-production` |
| Subject identifier | click **Edit (optional)** and set it by hand — see below |
| Name | `github-production` |

**Credential 2 — pull request previews.** Add credential again. This one has
no environment name field; Pull request does not take one.

| Field | Value |
|---|---|
| Organization | `jmcengineering` |
| Organization ID | `281013465` |
| Repository | `jmcengg.com` |
| Repository ID | `1236850364` |
| Entity type | **Pull request** |
| Subject identifier | click **Edit (optional)** and set it by hand — see below |
| Name | `github-pull-request` |

Leave the audience as the default `api://AzureADTokenExchange`.

### Override the generated subject identifier

The newer portal generates a subject in GitHub's *immutable* format, which
embeds the numeric IDs:

```
repo:jmcengineering@281013465/jmcengg.com@1236850364:environment:azure-production
```

**That will not work for this repository, and the failure is silent until the
first deploy.** GitHub only sends that format for repositories created after
15 July 2026, or for older ones that have opted in. `jmcengg.com` was created
on 12 May 2026 and has not opted in, so what GitHub actually sends is the
name-based form. Click **Edit (optional)** under *Subject identifier* and set
each credential by hand to exactly:

```
repo:jmcengineering/jmcengg.com:environment:azure-production
repo:jmcengineering/jmcengg.com:pull_request
```

> **If deploys ever start failing with AADSTS70021 out of nowhere**, check
> whether the repository was renamed or transferred to an organisation. GitHub
> switches a repository to the immutable format automatically when either
> happens, and these credentials stop matching. The fix is to add the same two
> credentials again without editing the subject, letting the portal generate
> it. Keeping both formats side by side is supported and is what Microsoft
> recommends during a migration.

> Why two: the production jobs run inside a GitHub environment called
> `azure-production`, and GitHub stamps the environment name into the token it
> issues. Preview builds for pull requests do not run in that environment, so
> they carry a different stamp. One credential each. There is no wildcard —
> that is the feature, not a limitation.

---

## Step 5 — Give that identity permission, and only where it is needed

1. Portal → **Resource groups** → **`rg-jmcengg-prod`**.
2. **Access control (IAM)** → **Add** → **Add role assignment**.
3. Role: **Contributor** → **Next**.
4. Assign access to: **User, group, or service principal** → **Select members**
   → search **`github-jmcengg-deploy`** → select it → **Select**.
5. **Review + assign**.

The assignment is on the resource group, not the subscription. GitHub can build
and read the site's deployment token inside this one folder and has no rights
anywhere else in your Azure account.

---

## Step 6 — Put the identifiers into GitHub

Repository → **Settings** → **Secrets and variables** → **Actions** → the
**Variables** tab → **New repository variable**, five times:

| Name | Value |
|---|---|
| `AZURE_CLIENT_ID` | Application (client) ID from step 3 |
| `AZURE_TENANT_ID` | Directory (tenant) ID from step 3 |
| `AZURE_SUBSCRIPTION_ID` | Subscription ID from step 1 |
| `AZURE_RESOURCE_GROUP` | `rg-jmcengg-prod` |
| `AZURE_STATIC_WEB_APP` | `swa-jmcengg-prod` |

Variables, not Secrets. These are identifiers, not credentials — they are
useless to anyone without the federated trust you configured in step 4, and
having them readable makes the workflow logs far easier to debug.

---

## Step 7 — Create the GitHub environment

Repository → **Settings** → **Environments** → **New environment** → name it
**`azure-production`** → **Configure environment**.

The name has to match credential 1 exactly or every deploy will fail
authentication.

Optional, and worth considering: tick **Required reviewers** and add yourself.
Every production deploy then waits for you to press a button. Good discipline
once employees start editing the site; unnecessary while it is just us.

---

## Step 8 — Create the hosting

**First, switch on the resource provider.** A new Azure subscription has most
resource providers switched off until something asks for one. `Microsoft.Web`
is the provider that owns Static Web Apps, and without it the deployment fails
with `MissingSubscriptionRegistration`.

Portal → **Subscriptions** → your subscription → **Resource providers** →
search **`Microsoft.Web`** → select the row → **Register**. It takes a minute or
two to move from *Registering* to *Registered*; refresh until it does.

*Resource providers* sits well down the subscription's left-hand menu, in the
**Settings** group, below Cost Management and Billing — the menu scrolls, and
it is not visible from the top. The quickest route is the **Search** box at the
top of that menu: type `resource providers` and it filters straight to it.

Or do it in Cloud Shell — the `>_` icon in the portal toolbar — which is the
same action without the menu hunt:

```bash
az provider register --namespace Microsoft.Web --wait
az provider show --namespace Microsoft.Web --query registrationState -o tsv
```

The second line prints `Registered` when it is done.

This is a subscription-level action, so the GitHub identity cannot do it — it
holds Contributor on one resource group and nothing wider. That is the design
working as intended, not an obstacle to route around. Do it once, by hand, as
the subscription Owner.

Then: Repository → **Actions** → **Azure infrastructure** (left sidebar) →
**Run workflow**.

1. Run it first with **"Preview the changes without applying them" ticked**. It
   signs in, checks the template and prints what it *would* create without
   creating anything. If sign-in fails here, the problem is step 4 or 5, and
   nothing has been built yet.
2. When the preview looks right, run it again with that box **unticked**.

When it finishes, open the run and read the summary box at the top. It gives
you the **default hostname** — something like
`polite-sand-0a1b2c3d4.5.azurestaticapps.net`. That is your Azure copy of the
site. Save that address.

---

## Step 9 — Publish, and check it properly

Repository → **Actions** → **Deploy to Azure Static Web Apps** → **Run
workflow**. From now on it runs by itself on every push to `main`.

Then open the azurestaticapps.net address and go through the site honestly:

- [ ] Homepage — hero animation, the CAD drawing, the counters
- [ ] Every capability page and every industry page
- [ ] The PCD calculator — change the inputs, download a DXF, download G-code
- [ ] The drill and weight calculators
- [ ] The blog posts and the legal pages
- [ ] The contact form — send a real test enquiry
- [ ] All of it again on your phone
- [ ] A URL that does not exist, e.g. `/nonsense/` — you should get our 404
      page, not an Azure one

Live on the temporary address for a few days. The domain has not moved and
there is no deadline.

---

## Step 10 — Moving jmcengg.com across (only when step 9 is clean)

Do not start this until you are happy. This is the part that can take the site
down, so it gets its own section and its own order of operations.

First, tell me who hosts the DNS for jmcengg.com — the registrar or provider
where the records live. It matters: an apex domain like `jmcengg.com` cannot use
a plain CNAME, so the right record depends on whether your provider supports
**ALIAS**/**ANAME** records or only **A** records. Cloudflare and most modern
providers do; GoDaddy does not.

The shape of it, verified against Microsoft's current documentation:

**www first, as a rehearsal.** In the portal, open `swa-jmcengg-prod` →
**Custom domains** → **Add** → `www.jmcengg.com` → hostname record type
**CNAME**. Azure asks you to add a CNAME at host `www` pointing to the
azurestaticapps.net hostname. Add it at your DNS provider, wait, then
**Validate**. Azure issues the SSL certificate itself, free.

**Then the apex.** **Add** → `jmcengg.com` → hostname record type **TXT** →
**Generate code**. Add a TXT record at host `@` with that code as the value,
wait for it to propagate, then **Validate**. Once validated, point the apex at
Azure — an **ALIAS**/**ANAME** record at host `@` whose value is the
azurestaticapps.net hostname without the `https://`, or, if your provider has
no ALIAS support, an **A** record at host `@` pointing to the
**`stableInboundIP`** shown in the app's Overview → **JSON View**. Prefer ALIAS:
an A record pins every visitor to one Azure host and gives up the global edge.

**Only then, remove the old wiring.** Delete the GitHub Pages A records, turn
off Pages under repository Settings → Pages, and delete
`.github/workflows/deploy.yml` and the `CNAME` files. Not before — leaving Pages
configured is the safety net while DNS propagates, which can take up to 72
hours.

Do not touch any **MX**, **SPF**, **DKIM** or **autodiscover** record. Those
carry your email. We are only changing the records that point at the website.

---

## What is already in the repository

| File | What it does |
|---|---|
| `infra/main.bicep` | Declares the Static Web App. The hosting is code, not clicks — it can be rebuilt identically if it is ever lost |
| `infra/main.bicepparam` | The settings: name, region, tier |
| `.github/workflows/azure-infra.yml` | Creates and updates that infrastructure, on demand |
| `.github/workflows/azure-swa.yml` | Builds and publishes on every push to `main`; gives every pull request its own preview URL |
| `public/staticwebapp.config.json` | Routing, our own 404 page, cache rules and security headers |

The Azure jobs check for `AZURE_CLIENT_ID` and skip themselves quietly until
step 6 is done, so all of this is already merged and harmless.

## A note on the region

The Static Web App resource is created in **East Asia**, not Central India. The
Free tier is only offered in five regions and Central India is not one of them;
East Asia is the closest. This does not decide where your visitors are served
from — static content is distributed to Azure's global edge regardless. The
region only fixes where the management plane lives.

## If something fails

| Symptom | Cause |
|---|---|
| `AADSTS700213` / no matching federated credential | Step 4 values do not match. Check the organization is `jmcengineering`, the repository is `jmcengg.com`, and the environment name is exactly `azure-production` |
| `AuthorizationFailed` | Step 5 did not take, or was assigned at the wrong scope. It must be on `rg-jmcengg-prod` |
| Azure jobs show as skipped | `AZURE_CLIENT_ID` is not set, or was added under Secrets instead of Variables |
| Empty deployment token | The role assignment exists but has not propagated. Wait five minutes and re-run |
| `MissingSubscriptionRegistration` for `Microsoft.Web` | The resource provider has never been switched on for this subscription. Register it as described at the top of step 8, then run the workflow again |
| Custom domain will not validate | DNS has not propagated. Re-check the record, then wait — up to 72 hours for an apex |
