/* Tests for the fortnightly drafter, run with `npm run test:draft`.

   No network and no API key: a fake client stands in for Anthropic and the
   whole flow runs against a throwaway copy of the repository.

   The cases that matter are the refusals. This job commits to the live site
   on a schedule with nobody watching, so the thing worth proving is not that
   a good draft gets written — it is that a bad one does not. */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

let pass = 0, fail = 0;
const check = (n, c, x) => { if (c) { pass++; console.log('  ok  ', n); } else { fail++; console.log('  FAIL', n, x === undefined ? '' : JSON.stringify(x)); } };

/* A throwaway repo with just the files the job touches. */
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'draft-test-'));
fs.mkdirSync(path.join(tmp, 'src/data'), { recursive: true });
fs.mkdirSync(path.join(tmp, 'src/content/articles'), { recursive: true });
fs.writeFileSync(path.join(tmp, 'src/data/articles.json'), JSON.stringify({
  _comment: 'test',
  articles: [{
    slug: 'progressive-dies', title: 'How We Design Progressive Dies for Tight Tolerances',
    description: 'Strip layout to tryout.', category: 'Press Tools',
    date: '2025-05-01', status: 'published', url: '/blog-progressive-dies.html', legacy: true,
  }],
}, null, 2));
process.env.ARTICLE_ROOT = tmp;

const { parseDraft, complain, runDraft } = await import('../draft-article.mjs');

const GOOD_BODY = `## What moved

Argus reported on 3 September 2026 that European APT prices rose sharply.

## What a buyer should do

${'Check the strip layout before the tool is cut. '.repeat(30)}

## Where it lands

${'The cost shows up in the die block, not the shoe. '.repeat(20)}`;

const good = {
  title: 'Carbide prices moved again — what it means for die costs',
  description: 'Tungsten carbide has moved sharply again, and it changes what a press tool quotation should look like this quarter.',
  category: 'Materials',
  body: GOOD_BODY,
};

const block = (d) => `<<<TITLE>>>\n${d.title}\n<<<SUMMARY>>>\n${d.description}\n<<<CATEGORY>>>\n${d.category}\n<<<BODY>>>\n${d.body}`;

/* A fake Anthropic client. Each queued reply is one turn. */
function fakeClient(turns) {
  const seen = [];
  return {
    seen,
    messages: {
      stream(params) {
        seen.push(params);
        const turn = turns.shift();
        if (!turn) throw new Error('fake client ran out of turns');
        return { finalMessage: async () => turn };
      },
    },
  };
}
const reply = (text, extra = {}) => ({
  stop_reason: 'end_turn',
  content: [{ type: 'text', text }],
  usage: { input_tokens: 1000, output_tokens: 500, server_tool_use: { web_search_requests: 6 } },
  ...extra,
});

console.log('\n[parsing]');
const p = parseDraft(block(good));
check('title', p.title === good.title);
check('summary', p.description === good.description);
check('category', p.category === good.category);
check('body kept verbatim, markdown and all', p.body === good.body.trim());
check('missing section is an error', (() => { try { parseDraft('no markers here'); return false; } catch { return true; } })());

console.log('\n[what it refuses]');
check('a thin article', /too thin/.test(complain({ ...good, body: '## Hi\n\nShort.' })));
check('an article with no headings', /heading/.test(complain({ ...good, body: 'x'.repeat(900) })));
check('a summary over 160 characters', /160/.test(complain({ ...good, description: 'x'.repeat(200) })));
check('a summary under 50 characters', /too short/.test(complain({ ...good, description: 'Carbide moved.' })));
check('a category it invented', /not one of the categories/.test(complain({ ...good, category: 'Market News' })));
check('a stuffed title', /once/.test(complain({ ...good, title: 'Press tool press tool press tool Chennai supplier' })));
check('a clean draft passes', complain(good) === null, complain(good));

console.log('\n[no prices in the title or summary]');
check('a dollar figure in the summary',
  /contains a price/.test(complain({ ...good, description: 'Copper crossed $14,800 a tonne this month and it shows up in mould and press tool builds across the south.' }) || ''));
check('a rupee figure in the title',
  /contains a price/.test(complain({ ...good, title: 'Tool steel at ₹450 a kg changes the sums' }) || ''));
check('a per-tonne figure in the summary',
  /contains a price/.test(complain({ ...good, description: 'Tungsten carbide moved to 58,000 per tonne this month, and it changes what a press tool quotation should look like.' }) || ''));
check('prices in the BODY are still fine',
  complain({ ...good, body: `## What moved\n\nBloomberg reported on 7 September that copper passed $14,600 a tonne.\n\n${'Detail follows here for the reader. '.repeat(40)}` }) === null);
check('an ordinary summary with a number passes',
  complain({ ...good, description: 'Why the web between two pierced holes should stay above 1.5 times material thickness, and what happens when it does not.' }) === null);

console.log('\n[the claim guard]');
const claims = [
  'JMC supplies Hyundai with press tools.',
  'JMC is approved by Bosch for tooling work.',
  'JMC works with several Tier-1 suppliers in Oragadam.',
  'JMC has been a vendor to Ashok Leyland since 2021.',
];
for (const c of claims) {
  check(`refuses: "${c.slice(0, 34)}…"`, /relationship between JMC/.test(complain({ ...good, body: `## Heading\n\n${c}\n\n${GOOD_BODY}` }) || ''), c);
}
check('allows writing about OEMs without claiming a link',
  complain({ ...good, body: `## Heading\n\nHyundai's Sriperumbudur plant announced a new line.\n\n${GOOD_BODY}` }) === null);

console.log('\n[the happy path]');
let client = fakeClient([reply(block(good))]);
let entry = await runDraft(client);
check('committed as a draft, never published', entry.status === 'draft', entry.status);
check('slug from the title', entry.slug === 'carbide-prices-moved-again-what-it-means-for-die-costs', entry.slug);
const md = fs.readFileSync(path.join(tmp, `src/content/articles/${entry.slug}.md`), 'utf8');
check('markdown file written with frontmatter', md.startsWith('---\ntitle: "Carbide prices'), md.slice(0, 40));
check('status draft in the file', /\nstatus: draft\n/.test(md));
check('body survived into the file', md.includes('Argus reported on 3 September 2026'));
const idx = JSON.parse(fs.readFileSync(path.join(tmp, 'src/data/articles.json'), 'utf8'));
check('index updated', idx.articles.length === 2);
check('legacy entry untouched', idx.articles.some((a) => a.slug === 'progressive-dies' && a.legacy === true));

console.log('\n[the request it actually sends]');
const sent = client.seen[0];
check('uses the model we chose', sent.model === 'claude-sonnet-5', sent.model);
check('web search is on', sent.tools[0].type === 'web_search_20260209', sent.tools[0].type);
check('searches are capped', sent.tools[0].max_uses === 12, sent.tools[0].max_uses);
check('located in Chennai', sent.tools[0].user_location.city === 'Chennai');
check('adaptive thinking', sent.thinking.type === 'adaptive');
check('no budget_tokens (400s on Sonnet 5)', sent.thinking.budget_tokens === undefined);
check('effort set', sent.output_config.effort === 'high');
check('brief names South India', /Karnataka[\s\S]*Andhra Pradesh[\s\S]*Telangana[\s\S]*Kerala/.test(sent.system));
check('brief names OEM readers', /OEMs and at their Tier-1/.test(sent.system));
check('brief forbids stating a price', /NEVER state a material price/.test(sent.system));
check('prompt lists what is already written', /How We Design Progressive Dies/.test(sent.messages[0].content));

console.log('\n[retry with the complaint fed back]');
const bad = { ...good, description: 'Too short.' };
client = fakeClient([reply(block(bad)), reply(block({ ...good, title: 'Copper moved again and die costs follow' }))]);
entry = await runDraft(client);
check('second attempt succeeded', entry.slug === 'copper-moved-again-and-die-costs-follow', entry.slug);
check('the retry was told what was wrong', /previous attempt was rejected[\s\S]*summary/i.test(client.seen[1].messages[0].content));
check('and told to keep the topic', /Keep the same topic/.test(client.seen[1].messages[0].content));

console.log('\n[when it cannot get it right]');
const before = fs.readdirSync(path.join(tmp, 'src/content/articles')).length;
client = fakeClient([reply(block(bad)), reply(block(bad))]);
let threw = null;
try { await runDraft(client); } catch (e) { threw = e.message; }
check('fails loudly', threw !== null && /Both attempts were rejected/.test(threw), threw);
check('and writes nothing', fs.readdirSync(path.join(tmp, 'src/content/articles')).length === before);

console.log('\n[a paused research turn]');
client = fakeClient([
  { stop_reason: 'pause_turn', content: [{ type: 'server_tool_use', id: 'x', name: 'web_search', input: {} }], usage: { input_tokens: 1, output_tokens: 1 } },
  reply(block({ ...good, title: 'Tool steel supply tightened across South India' })),
]);
entry = await runDraft(client);
check('resumes and finishes', entry.slug === 'tool-steel-supply-tightened-across-south-india', entry.slug);
check('the paused turn was handed back unchanged', client.seen[1].messages.at(-1).role === 'assistant');

console.log('\n[a refusal]');
client = fakeClient([{ stop_reason: 'refusal', stop_details: { category: 'cyber' }, content: [], usage: { input_tokens: 1, output_tokens: 1 } }]);
threw = null;
try { await runDraft(client); } catch (e) { threw = e.message; }
check('surfaces it rather than committing nothing silently', /declined the request/.test(threw || ''), threw);

fs.rmSync(tmp, { recursive: true, force: true });
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
