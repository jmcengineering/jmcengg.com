/* Article categories.

   One list, used by the public pages, the admin panel and the API validator.
   A category that is not on this list is refused rather than silently
   rendered without a colour — the alternative is a card that looks broken and
   nobody knows why.

   `tint` is the accent on the card and the article header. They come from the
   site's own palette; do not invent new ones per article. */
export const CATEGORIES = [
  { id: 'Press Tools', tint: '#4C8DFF', icon: 'die' },
  { id: 'Fixtures',    tint: '#7DE3B0', icon: 'fixture' },
  { id: 'Moulds',      tint: '#9C8CFF', icon: 'mould' },
  { id: 'Gauges',      tint: '#FFC46B', icon: 'gauge' },
  { id: 'Machining',   tint: '#6FD3E8', icon: 'machine' },
  { id: 'Materials',   tint: '#F0A868', icon: 'material' },
  { id: 'Industry',    tint: '#4C8DFF', icon: 'industry' },
  { id: 'Our Story',   tint: '#FF8A8A', icon: 'story' },
];

export const CATEGORY_IDS = CATEGORIES.map((c) => c.id);
export const byCategory = Object.fromEntries(CATEGORIES.map((c) => [c.id, c]));

/* The small line-art marks on the cards. Kept as path data rather than files
   so a card is one request, not two. */
export const ICONS = {
  die:      'M3 3h18v14H3zM3 9h18M9 9v8',
  fixture:  'M4 21V8l8-5 8 5v13M9 21v-7h6v7',
  mould:    'M4 6h16v12H4zM9 6v12M15 6v12',
  gauge:    'M12 20a8 8 0 110-16 8 8 0 010 16zM12 12l4-3',
  machine:  'M3 20h18M6 20V9l6-4 6 4v11M10 20v-5h4v5',
  material: 'M3 8l9-5 9 5-9 5-9-5zM3 12l9 5 9-5M3 16l9 5 9-5',
  industry: 'M2 20h20M4 20V10l8-7 8 7v10M10 20v-6h4v6',
  story:    'M12 2a7 7 0 00-4 12.7V17a1 1 0 001 1h6a1 1 0 001-1v-2.3A7 7 0 0012 2zM9 21h6',
};

export function iconFor(category) {
  const c = byCategory[category];
  return ICONS[c ? c.icon : 'die'] || ICONS.die;
}

export function tintFor(category) {
  const c = byCategory[category];
  return c ? c.tint : '#4C8DFF';
}

/* "18 September 2026" — written out, because 09/18 and 18/09 mean different
   things to different readers and this site has readers in both camps. */
export function longDate(value) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
}

export function isoDate(value) {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10);
}
