// Full Wikipedia article for each "theme=Exact title" argument, merged into sources.json.
// Usage: node scripts/bank/collect.mjs [--lang=es] "Thème=Titre exact de l'article" …   (fr by default; behind a proxy: NODE_USE_ENV_PROXY=1)
import { readFileSync, writeFileSync } from 'node:fs';
const UA = 'TheDiggerQuizBot/1.0 (quiz question bank; Node.js fetch)';
const file = new URL('./sources.json', import.meta.url);
const all = JSON.parse(readFileSync(file, 'utf8'));
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function get(url) {
  for (let i = 0; ; i++) {
    const r = await fetch(url, { headers: { 'User-Agent': UA, 'Api-User-Agent': UA } });
    if (r.ok) return r.json();
    if (r.status === 429 && i < 8) { const w = (+r.headers.get('retry-after') || 10) * 1000 + 1500; console.error('429, attente', w / 1000, 's'); await sleep(w); continue; }
    throw new Error('HTTP ' + r.status);
  }
}
const lang = (process.argv.find(a => a.startsWith('--lang=')) || '--lang=fr').slice(7);
for (const arg of process.argv.slice(2).filter(a => !a.startsWith('--'))) {
  const [theme, query] = arg.split('=');
  const u = 'https://' + lang + '.wikipedia.org/w/api.php?' + new URLSearchParams({ action: 'query', format: 'json', titles: query, redirects: '1', prop: 'extracts|info', inprop: 'url', explaintext: '1', exlimit: 'max' });
  const d = await get(u);
  const pages = Object.values((d.query && d.query.pages) || {}).sort((a, b) => a.index - b.index);
  console.log(theme, '->', pages.map(p => p.title + ' (' + (p.extract || '').length + ' car.)').join(' | '));
  const p = pages[0];
  if (p && p.extract) all[theme] = [...(all[theme] || []).filter(x => x.url !== p.fullurl), { title: p.title, url: p.fullurl, text: p.extract.replace(/\s+/g, ' ').trim().slice(0, 14000) }];
  await sleep(2500);
}
writeFileSync(file, JSON.stringify(all, null, 1));
