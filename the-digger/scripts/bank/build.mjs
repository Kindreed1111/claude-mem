// Validates the hand-written questions (q-<theme>.json) against the collected sources and merges them into the bank.
// Same rules as scripts/generate-questions.mjs, plus: every word of the right answer must be written in the cited page.
// Usage: node scripts/bank/build.mjs            -> report only
//        node scripts/bank/build.mjs --write    -> append the valid questions to public/data/questions.json
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
const here = new URL('.', import.meta.url).pathname;
const OUT = new URL('../../public/data/questions.json', import.meta.url).pathname;
const MAX_Q = 95, MAX_OPT = 35, MAX_ANECDOTE = 170, DIFF = { f: 'facile', m: 'moyen', d: 'difficile' };
const norm = s => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
const clean = s => String(s == null ? '' : s).replace(/\s+/g, ' ').trim();
const sources = JSON.parse(readFileSync(here + 'sources.json', 'utf8'));
const bank = JSON.parse(readFileSync(OUT, 'utf8'));
const taken = { ids: new Set(bank.map(q => q.id)), q: new Set(bank.map(q => norm(q.question))) };
const added = [], bad = [];
for (const f of readdirSync(here).filter(f => /^q-.*\.json$/.test(f)).sort()) {
  const { theme, items } = JSON.parse(readFileSync(here + f, 'utf8'));
  const docs = sources[theme];
  if (!docs) { bad.push([f, 'thème sans sources : ' + theme]); continue; }
  for (const it of items) {
    const question = clean(it.q), opts = it.o.map(clean), anecdote = clean(it.e), url = it.u;
    const fail = m => bad.push([theme, m, question]);
    const src = docs.find(d => d.url === url || d.url.endsWith('/' + url) || d.url.endsWith('/' + encodeURIComponent(url).replace(/%2F/g, '/')));
    if (!src) { fail('sourceUrl absente des URLs collectées : ' + url); continue; }
    if (question.length < 12 || question.length > MAX_Q || !question.endsWith('?')) { fail('question hors format (' + question.length + ')'); continue; }
    if (opts.length !== 4 || opts.some(o => !o || o.length > MAX_OPT)) { fail('options hors format'); continue; }
    if (new Set(opts.map(norm)).size !== 4) { fail('options en double'); continue; }
    if (!DIFF[it.d]) { fail('difficulté'); continue; }
    if (anecdote.length < 10 || anecdote.length > MAX_ANECDOTE) { fail('anecdote hors format (' + anecdote.length + ')'); continue; }
    const len = opts.map(o => o.length);
    if (Math.max(...len) - Math.min(...len) > 18 || len[0] - Math.max(...len.slice(1)) > 6) { fail('longueurs non homogènes ' + len.join('/')); continue; }
    const answer = opts[0], text = ' ' + norm(src.text) + ' ';
    if (norm(question).includes(norm(answer)) && norm(answer).length > 3) { fail('réponse dans la question'); continue; }
    let miss = '';
    for (const n of answer.match(/\d[\d\s.,]*\d|\d/g) || []) { const dg = n.replace(/[\s.,]/g, ''); if (dg.length >= 2 && !src.text.replace(/[\s.,  ]/g, '').includes(dg)) miss = 'chiffre ' + dg; }
    for (const w of norm(answer).split(' ').filter(w => w.length > 2)) if (!text.includes(' ' + w + ' ')) miss = miss || 'mot « ' + w + ' »';
    if (miss) { fail('réponse introuvable dans la source (' + miss + ')'); continue; }
    const key = norm(question), id = 'q-' + createHash('sha1').update(key).digest('hex').slice(0, 10);
    if (taken.q.has(key) || taken.ids.has(id)) { fail('doublon'); continue; }
    taken.q.add(key); taken.ids.add(id);
    const k = createHash('sha1').update(id).digest()[0] % 4, options = [...opts.slice(1)]; options.splice(k, 0, answer);   // fixed, varied position
    added.push({ id, question, options, correctAnswerIndex: k, difficulty: DIFF[it.d], anecdote, sourceUrl: src.url, theme });
  }
}
// Theme naming rule (same matching as the game): typing a theme's full name must open that theme and no other;
// a name of 3 letters or less is only recognised when typed exactly.
{
  const tk = x => norm(String(x).replace(/[-‐–]/g, '')).replace(/s\b/g, ''), w = x => ' ' + x + ' ';
  const themes = [...new Set([...bank, ...added].map(q => q.theme).filter(Boolean))];
  const match = raw => { const m = tk(raw); return themes.map(t => ({ t, k: tk(t) })).filter(({ k }) => k === m || w(m).includes(w(k)) || (m.length >= 4 && w(k).includes(w(m)))).sort((a, b) => b.k.length - a.k.length)[0]; };
  for (const t of themes) {
    const h = match(t);
    if (!h || h.t !== t) console.log('RÈGLE THÈME', `« ${t} » tapé en entier ouvre « ${h ? h.t : 'Gemini'} » : renommer le thème.`);
    else if (tk(t).replace(/ /g, '').length <= 3) console.log('NOTE THÈME', `« ${t} » est court : reconnu seulement s'il est tapé tel quel ou comme mot entier.`);
    for (const o of themes) if (o !== t && w(tk(o)).includes(w(tk(t)))) console.log('NOTE THÈME', `« ${t} » est contenu dans « ${o} » : taper « ${o} » ouvre « ${o} » (le nom le plus long gagne).`);
  }
}
const count = {}; for (const q of added) { const c = count[q.theme] = count[q.theme] || { facile: 0, moyen: 0, difficile: 0 }; c[q.difficulty]++; }
console.log('valides', added.length, JSON.stringify(count));
for (const b of bad) console.log('REJET', b.join(' | '));
if (process.argv.includes('--write')) { writeFileSync(OUT, JSON.stringify([...bank, ...added], null, 1) + '\n'); console.log('banque :', bank.length + added.length, 'questions'); }
