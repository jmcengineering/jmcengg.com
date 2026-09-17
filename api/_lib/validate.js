'use strict';

/* Photograph naming, and the rules that keep it honest.

   Every photograph carries two pieces of writing: a name and a description.
   The name becomes the filename, the caption under the photograph and part of
   the alt text. The description becomes the rest of the alt text and the
   ImageObject caption in the page's structured data.

   Why the rules below exist: the obvious way to "do SEO" on an image is to
   name it "press tool press tool manufacturer chennai press tool india tool
   room chennai". That reads as spam to a person and, since 2012 or so, to
   Google as well — it is keyword stuffing, an explicit policy violation, and
   the modern penalty is not a warning but simply not ranking. A tool room's
   photographs rank because the filename and alt text say plainly what the
   thing is. So the panel refuses stuffed text rather than accepting it and
   quietly hurting the site.

   The rules are deliberately loose enough that anything a person would
   naturally type passes on the first attempt. */

const STOP = new Set(['and', 'the', 'for', 'with', 'from', 'this', 'that', 'our', 'its', 'are', 'was', 'has', 'been']);

function words(text) {
  return String(text).toLowerCase().match(/[a-z0-9]+/g) || [];
}

/* Returns the offending word, or null. A word appearing three times in a short
   caption is not emphasis, it is stuffing. */
function repeatedWord(text) {
  const counts = new Map();
  for (const w of words(text)) {
    if (w.length < 3 || STOP.has(w)) continue;
    counts.set(w, (counts.get(w) || 0) + 1);
  }
  for (const [w, n] of counts) if (n > 2) return w;
  return null;
}

function tidy(text) {
  return String(text == null ? '' : text).replace(/\s+/g, ' ').trim();
}

function checkName(raw) {
  const name = tidy(raw);
  if (!name) return { error: 'Give the photograph a name — say what the thing is, as you would to a customer.' };
  if (name.length < 3) return { error: 'That name is too short to mean anything to someone reading it.' };
  if (name.length > 70) return { error: 'Keep the name under 70 characters. The long version belongs in the description.' };
  if (!/[a-z]/i.test(name)) return { error: 'The name needs actual words in it, not only numbers.' };
  if (/^(img|dsc|image|photo|pic)[\s_-]*\d+$/i.test(name)) {
    return { error: `That is the camera\u2019s filename, not a name. Say what is in the photograph — "Blanking die, 3 mm MS" rather than "${name}".` };
  }
  const w = words(name);
  if (w.length < 2) return { error: 'Two words at least. "Punch" could be anything; "Piercing punch set" is a thing a customer searches for.' };
  if (w.length > 12) return { error: 'Twelve words is plenty for a name. Put the detail in the description.' };
  if ((name.match(/,/g) || []).length > 3) return { error: 'That reads as a list of keywords rather than a name. Describe the one thing in the photograph.' };
  const rep = repeatedWord(name);
  if (rep) return { error: `"${rep}" appears three times in that name. Repeating a word does not help the site rank — it is the thing search engines penalise. Say it once.` };
  return { value: name };
}

function checkDescription(raw) {
  const text = tidy(raw);
  if (!text) return { error: 'Add a description. It is what a blind visitor hears and what Google reads — an empty one wastes the photograph.' };
  if (text.length < 12) return { error: 'A few more words. Describe what is visible: the material, the operation, the machine.' };
  if (text.length > 160) return { error: 'Keep the description under 160 characters. Screen readers read it aloud in one breath.' };
  if (words(text).length < 3) return { error: 'Three words at least, describing what is in the photograph.' };
  if ((text.match(/,/g) || []).length > 5) return { error: 'That reads as a keyword list rather than a description. Write it as you would say it.' };
  const rep = repeatedWord(text);
  if (rep) return { error: `"${rep}" appears three times in that description. Once is enough — repetition is what search engines treat as spam.` };
  return { value: text };
}

/* The filename. Lowercase, hyphenated, no surprises for a web server, and
   readable in a URL — which is itself a small ranking signal and a large
   legibility one. */
function slugify(name) {
  return String(name)
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
    .replace(/-+$/g, '');
}

/* Two photographs of blanking dies should not fight over one filename. */
function uniqueSlug(base, taken) {
  const seed = base || 'photograph';
  let slug = seed;
  let n = 2;
  while (taken.has(slug)) slug = `${seed}-${n++}`;
  taken.add(slug);
  return slug;
}

module.exports = { checkName, checkDescription, slugify, uniqueSlug, tidy, repeatedWord };
