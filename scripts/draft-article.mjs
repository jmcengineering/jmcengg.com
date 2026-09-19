#!/usr/bin/env node
/* The fortnightly article drafter.

   Runs from .github/workflows/article-draft.yml on the 1st and 15th. Asks
   Claude to research the trade, pick a topic and write a draft, then writes
   the draft into the repository exactly as the admin panel would — as a
   DRAFT, never published.

   Why a draft and not a published article. Google has a spam policy called
   scaled content abuse, and "AI writes it, a schedule publishes it, nobody
   reads it" is close to its definition; the penalty is not a warning, it is
   not ranking. The second reason matters more to JMC: the readers are
   engineers, and a page under the company's name that gets a technical fact
   wrong costs more than a missing article ever would. So the machine does
   the research and the first draft, and a person spends five minutes before
   it goes live.

   The draft is validated by the SAME rules the admin panel enforces on a
   human — length, headings, summary, category, keyword stuffing. A draft
   this job would not let a person publish is not one it will commit. */

import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import Anthropic from '@anthropic-ai/sdk';
import { systemPrompt, userPrompt, CATEGORIES } from './lib/article-brief.mjs';

const require = createRequire(import.meta.url);
const articles = require('../api/_lib/articles.js');

const MODEL = process.env.ARTICLE_MODEL || 'claude-sonnet-5';
const MAX_SEARCHES = Number(process.env.ARTICLE_MAX_SEARCHES || 12);
/* Overridable so the tests can run the whole flow against a throwaway copy of
   the repository rather than the real one. */
const ROOT = process.env.ARTICLE_ROOT
  ? path.resolve(process.env.ARTICLE_ROOT)
  : path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');

const log = (...a) => console.log('[draft]', ...a);

/* ── the model call ──
   Server tools run inside the request, so a research-heavy turn can pause and
   ask to be resumed. Streaming because the turn is long: a non-streaming
   request doing a dozen searches can outlast the HTTP timeout. */
async function research(client, { system, user }) {
  const messages = [{ role: 'user', content: user }];
  let searches = 0;

  for (let turn = 0; turn < 8; turn++) {
    const stream = client.messages.stream({
      model: MODEL,
      max_tokens: 32000,
      system,
      messages,
      thinking: { type: 'adaptive' },
      output_config: { effort: 'high' },
      tools: [
        {
          type: 'web_search_20260209',
          name: 'web_search',
          max_uses: MAX_SEARCHES,
          /* Chennai, so "this week" and local sources resolve sensibly. */
          user_location: {
            type: 'approximate',
            city: 'Chennai',
            region: 'Tamil Nadu',
            country: 'IN',
            timezone: 'Asia/Kolkata',
          },
        },
      ],
    });

    const response = await stream.finalMessage();
    searches += response.usage?.server_tool_use?.web_search_requests || 0;

    if (response.stop_reason === 'refusal') {
      throw new Error(
        `The model declined the request (${response.stop_details?.category || 'no category'}). Nothing was written.`
      );
    }

    /* A paused turn is resumed by handing the assistant message straight back,
       unchanged — including the encrypted search results. */
    if (response.stop_reason === 'pause_turn') {
      messages.push({ role: 'assistant', content: response.content });
      continue;
    }

    const text = response.content
      .filter((b) => b.type === 'text')
      .map((b) => b.text)
      .join('');

    return { text, usage: response.usage, searches, stopReason: response.stop_reason };
  }

  throw new Error('The model kept pausing without finishing. Nothing was written.');
}

/* ── parsing ──
   A delimited block rather than JSON or structured outputs: the body is
   markdown full of quotes, backticks and newlines, and every JSON round trip
   is a chance to mangle it. These markers do not occur in prose. */
export function parseDraft(text) {
  const section = (name, next) => {
    const start = text.indexOf(`<<<${name}>>>`);
    if (start === -1) throw new Error(`The model's output had no <<<${name}>>> section.`);
    const from = start + `<<<${name}>>>`.length;
    const to = next ? text.indexOf(`<<<${next}>>>`, from) : text.length;
    return text.slice(from, to === -1 ? text.length : to).trim();
  };

  return {
    title: section('TITLE', 'SUMMARY'),
    description: section('SUMMARY', 'CATEGORY'),
    category: section('CATEGORY', 'BODY'),
    body: section('BODY', null),
  };
}

/* The same gate a person meets in the panel, plus the publish-level checks —
   a draft from this job is meant to be publishable after a read, not after a
   rewrite. Returns the first complaint, or null. */
export function complain(draft) {
  const title = articles.checkTitle(draft.title);
  if (title.error) return title.error;
  const description = articles.checkDescription(draft.description);
  if (description.error) return description.error;
  const category = articles.checkCategory(draft.category);
  if (category.error) return category.error;
  const body = articles.checkBody(draft.body, { publishing: true });
  if (body.error) return body.error;

  /* A price in the headline or the summary. Those two lines are what a search
     result shows long after the number is stale, and 160 characters leaves no
     room to attribute it to anyone. The body may carry figures; it has to
     name a source for them. */
  const price = /(?:[$₹£€]\s?[\d,]+(?:\.\d+)?)|(?:[\d,]+(?:\.\d+)?\s*(?:\/|\s(?:a|per)\s)\s*(?:tonne|ton|kg|kilo|lb|pound|mtu|piece))/i;
  for (const [what, value] of [['title', draft.title], ['summary', draft.description]]) {
    const hit = price.exec(value);
    if (hit) {
      return `The ${what} contains a price ("${hit[0].trim()}"). Those two lines are what a search result still shows months later, when the figure is stale — keep prices in the body, with their source.`;
    }
  }

  /* Rule 2 in the brief, checked rather than trusted. "JMC supplies Hyundai"
     is a false claim about two real companies, and no amount of prompt
     wording makes an unchecked one acceptable. */
  const claim = /\bJMC\b[^.]{0,80}\b(supplies?|supplied|supplier to|vendor to|approved by|partners? with|works with|client|customer)\b/i.exec(draft.body);
  if (claim) {
    return `The draft claims a relationship between JMC and another company: "${claim[0].trim()}". That is not something this job may assert.`;
  }
  return null;
}

/* ── writing it into the repository ── */
function writeDraft(draft) {
  const manifestPath = path.join(ROOT, articles.MANIFEST_PATH);
  const manifest = articles.parse(fs.readFileSync(manifestPath, 'utf8'));

  const result = articles.create(manifest, {
    title: draft.title,
    description: draft.description,
    category: draft.category,
    body: draft.body,
  });

  for (const file of result.files) {
    const full = path.join(ROOT, file.path);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, file.text);
  }
  fs.writeFileSync(manifestPath, articles.serialise({ ...manifest, articles: result.articles }));

  return result.entry;
}

/* The whole flow, given a client. main() supplies a real one; the tests
   supply a fake, so every branch here is exercised without a network. */
export async function runDraft(client) {
  const manifest = articles.parse(fs.readFileSync(path.join(ROOT, articles.MANIFEST_PATH), 'utf8'));
  const existing = manifest.articles.map((a) => ({ title: a.title, category: a.category, date: a.date }));
  const today = new Date().toISOString().slice(0, 10);

  const system = systemPrompt();

  let draft = null;
  let lastComplaint = null;

  /* Two attempts. The second is told what was wrong with the first, which
     fixes almost every failure — usually a summary a few characters over. */
  for (let attempt = 1; attempt <= 2; attempt++) {
    let user = userPrompt({ existing, today });
    if (lastComplaint) {
      user += `\n\nYour previous attempt was rejected: ${lastComplaint}\nWrite it again, fixing exactly that. Keep the same topic.`;
    }

    log(`attempt ${attempt}: researching with ${MODEL}…`);
    const out = await research(client, { system, user });
    log(`  ${out.searches} searches, ${out.usage.input_tokens} in / ${out.usage.output_tokens} out`);

    let parsed;
    try {
      parsed = parseDraft(out.text);
    } catch (err) {
      lastComplaint = err.message;
      log(`  rejected: ${lastComplaint}`);
      continue;
    }

    lastComplaint = complain(parsed);
    if (!lastComplaint) {
      draft = parsed;
      break;
    }
    log(`  rejected: ${lastComplaint}`);
  }

  if (!draft) {
    throw new Error(
      `Both attempts were rejected. Last reason: ${lastComplaint}\nNothing was written. This is the job refusing to commit a bad draft, not a crash.`
    );
  }

  const entry = writeDraft(draft);
  log(`wrote src/content/articles/${entry.slug}.md as a draft`);

  /* The workflow reads these to decide whether to commit and what to say. */
  if (process.env.GITHUB_OUTPUT) {
    fs.appendFileSync(
      process.env.GITHUB_OUTPUT,
      `wrote=true\nslug=${entry.slug}\ntitle=${entry.title.replace(/\n/g, ' ')}\n`
    );
  }
  return entry;
}

async function main() {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('[draft] ANTHROPIC_API_KEY is not set. Add it to the repository secrets.');
    process.exit(1);
  }
  await runDraft(new Anthropic());
}

/* Only run when executed, so the tests can import the pure parts. */
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname)) {
  main().catch((err) => {
    console.error(`[draft] ${err && err.stack ? err.stack : err}`);
    process.exit(1);
  });
}
