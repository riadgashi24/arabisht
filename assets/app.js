/* Mëso Arabisht — logjika e aplikacionit (pa framework, pa build) */
(() => {
'use strict';
const U = window.UNITS || [], SOON = window.SOON || [];
const DN = ['Fjalor i ri', 'Dialogu 1', 'Gramatika', 'Fjalor + Dialogu 2', 'Përsëritje e përzier', 'Fol dhe ndërto', 'Testi i javës'];
const INT = [1, 2, 4, 7, 15, 30, 60];
const PASS = 80;
const KEY = 'bayna-sq-v1', AKEY = 'bayna-auth';
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- GJENDJA ---------- */
const fresh = () => ({ done: {}, cards: {}, log: {}, xp: {}, scores: {}, badges: {}, frz: {}, freezes: 0, frzAt: '', best: 0, free: false, tr: true, goal: 100, sound: true, theme: 'auto', at: 0 });
const OBJS = ['done', 'cards', 'log', 'xp', 'scores', 'badges', 'frz'];
const norm = o => { const s = { ...fresh(), ...(o && typeof o === 'object' ? o : {}) }; OBJS.forEach(k => { if (!s[k] || typeof s[k] !== 'object' || Array.isArray(s[k])) s[k] = {}; }); return s; };
const load = k => { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } };
let S = norm(load(KEY));
let AUTH = load(AKEY) || {};
const ME = () => AUTH && AUTH.t ? AUTH : null;
const persist = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} };
const save = () => { S.at = Date.now(); persist(); queuePush(); };
const setAuth = a => { AUTH = a || {}; try { a ? localStorage.setItem(AKEY, JSON.stringify(a)) : localStorage.removeItem(AKEY); } catch (e) {} };

/* bashkimi i dy gjendjeve (njëlloj si në server) */
const obj = x => x && typeof x === 'object' && !Array.isArray(x) ? x : {};
const maxO = (x, y) => { const o = {}; for (const k in obj(x)) o[k] = +x[k] || 0; for (const k in obj(y)) o[k] = Math.max(o[k] || 0, +y[k] || 0); return o; };
const minD = (x, y) => { const o = { ...obj(x) }; for (const k in obj(y)) o[k] = o[k] && o[k] < y[k] ? o[k] : y[k]; return o; };
function merge(a, b) {
  a = norm(a); b = norm(b);
  const nw = (b.at || 0) >= (a.at || 0) ? b : a, cards = { ...a.cards };
  for (const k in b.cards) { const x = cards[k], y = b.cards[k]; if (!y || typeof y !== 'object') continue; cards[k] = !x || y.b > x.b || (y.b === x.b && String(y.due) > String(x.due)) ? y : x; }
  return norm({ ...nw, done: minD(a.done, b.done), cards, log: maxO(a.log, b.log), xp: maxO(a.xp, b.xp), scores: maxO(a.scores, b.scores),
    badges: minD(a.badges, b.badges), frz: { ...a.frz, ...b.frz }, best: Math.max(a.best || 0, b.best || 0), at: Math.max(a.at || 0, b.at || 0) });
}

/* ---------- DATAT ---------- */
const fmt = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
const dayAt = n => { const d = new Date(); d.setDate(d.getDate() + n); return fmt(d); };
const today = () => dayAt(0);
const shift = (k, n) => { const d = new Date(k + 'T12:00:00'); d.setDate(d.getDate() + n); return fmt(d); };
const between = (a, b) => Math.round((new Date(b + 'T12:00:00') - new Date(a + 'T12:00:00')) / 864e5);
const WD = ['D', 'H', 'M', 'M', 'E', 'P', 'S'];

/* ---------- SERIA, XP, MEDALJET ---------- */
const actSet = () => new Set([...Object.keys(S.log), ...Object.keys(S.frz)]);
const runEnd = (set, d) => { let n = 0; while (set.has(shift(d, -n))) n++; return n; };
function streakInfo() {
  const s = actSet(), t = today(), y = dayAt(-1);
  if (s.has(t)) return { n: runEnd(s, t), done: true };
  if (s.has(y)) return { n: runEnd(s, y), done: false };
  const last = Object.keys(S.log).sort().pop();
  if (!last) return { n: 0, done: false };
  const miss = between(last, t) - 1;
  if (miss > 0 && miss <= S.freezes) return { n: runEnd(s, last), done: false, frozen: miss };
  return { n: 0, done: false, lost: runEnd(s, last) };
}
function activity() {
  const t = today(), before = streakInfo();
  if (!S.log[t] && before.frozen) { for (let i = 1; i <= before.frozen; i++) S.frz[shift(t, -i)] = 1; S.freezes -= before.frozen; }
  S.log[t] = (S.log[t] || 0) + 1;
  const after = streakInfo();
  S.best = Math.max(S.best || 0, after.n);
  let earned = false;
  if (!before.done && after.n > 0 && after.n % 7 === 0 && S.frzAt !== t && S.freezes < 2) { S.freezes++; S.frzAt = t; earned = true; }
  return { first: !before.done, n: after.n, prev: before.done ? after.n : before.n, used: before.done ? 0 : before.frozen || 0, earned };
}
const xpToday = () => S.xp[today()] || 0;
const xpTotal = () => Object.values(S.xp).reduce((a, b) => a + (+b || 0), 0);
const addXP = n => { const t = today(); S.xp[t] = (S.xp[t] || 0) + n; };

const BADGES = [
  ['first', 'Hapi i parë', 'Kreve mësimin e parë', 'star', () => Object.keys(S.done).length >= 1],
  ['s3', 'Zjarri u ndez', '3 ditë radhazi', 'flame', () => S.best >= 3],
  ['s7', 'Javë e plotë', '7 ditë radhazi', 'flame', () => S.best >= 7],
  ['s14', 'I palëkundur', '14 ditë radhazi', 'flame', () => S.best >= 14],
  ['s30', 'Një muaj', '30 ditë radhazi', 'flame', () => S.best >= 30],
  ['s100', 'Njëqind ditë', '100 ditë radhazi', 'crown', () => S.best >= 100],
  ['goal', 'Qëllimi i ditës', 'Arrite qëllimin ditor', 'target', () => Object.values(S.xp).some(v => v >= S.goal)],
  ['u1', 'Njësia e parë', 'Kalove testin e javës 1', 'trophy', () => !!S.scores.u1],
  ['perfect', 'Pa asnjë gabim', '100% në një test', 'gem', () => Object.values(S.scores).some(v => v >= 100)],
  ['w50', '50 fjalë', '50 fjalë në kujtesë', 'book', () => Object.keys(S.cards).length >= 50],
  ['w150', '150 fjalë', '150 fjalë në kujtesë', 'book', () => Object.keys(S.cards).length >= 150],
  ['xp1k', '1000 XP', 'Mblodhe 1000 XP', 'bolt', () => xpTotal() >= 1000],
  ['all', 'Libri i parë', 'Kalove të gjitha njësitë', 'crown', () => U.length > 0 && U.every(u => S.scores['u' + u.n])],
];
function checkBadges() { const nb = []; BADGES.forEach(b => { if (!S.badges[b[0]] && b[4]()) { S.badges[b[0]] = today(); nb.push(b); } }); return nb; }

/* ---------- MJETE ---------- */
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const pick = a => a[Math.floor(Math.random() * a.length)];
const DAYS = []; U.forEach((u, ui) => DN.forEach((n, di) => DAYS.push({ ui, di, id: 'u' + u.n + 'd' + (di + 1) })));
const unlocked = i => { if (i === 0) return true; const p = S.done[DAYS[i - 1].id]; return !!p && (S.free || p < today()); };
const curIdx = () => DAYS.findIndex(d => !S.done[d.id]);
const due = () => Object.entries(S.cards).filter(([, c]) => c.due <= today());
const ALLW = U.flatMap(u => u.A.concat(u.B).map(w => ({ ar: w[0], sq: w[1], tr: w[2], u: u.n })));
const app = document.getElementById('app'), top = document.getElementById('top');
let toastT;
const toast = (m, kind) => { let t = document.querySelector('.toast'); if (!t) { t = document.createElement('div'); t.className = 'toast'; t.setAttribute('role', 'status'); document.body.appendChild(t); } t.className = 'toast ' + (kind || ''); t.innerHTML = m; clearTimeout(toastT); toastT = setTimeout(() => t.classList.add('out'), 3000); setTimeout(() => { if (t.classList.contains('out')) t.remove(); }, 3400); };
const buzz = p => { try { navigator.vibrate && navigator.vibrate(p); } catch (e) {} };

/* ---------- IKONAT ---------- */
const I = {
  home: '<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"/>',
  book: '<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z"/><path d="M4 20.5A2.5 2.5 0 0 1 6.5 18H20v3H6.5"/>',
  chart: '<path d="M5 20V11M12 20V4M19 20v-6"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c.5-4 4-6 8-6s7.5 2 8 6"/>',
  flame: '<path d="M12 2c.8 3.4-2 5.3-2 8.4 0 1.4.9 2.4 2 2.4 1.6 0 2.3-1.5 1.9-3.6 2.8 1.7 4.6 4.6 4.6 7.5A6.5 6.5 0 0 1 12 23a6.4 6.4 0 0 1-6.5-6.3C5.5 10.9 11 8.4 12 2z"/>',
  bolt: '<path d="M13.5 2 4 13.5h6.5L9.5 22 20 9.5h-6.6z"/>',
  snow: '<path d="M12 2v20M3.3 7l17.4 10M20.7 7 3.3 17M9 3.5l3 2.2 3-2.2M9 20.5l3-2.2 3 2.2M3.6 10.7l3.4-.5-1.3-3.2M20.4 13.3l-3.4.5 1.3 3.2M5.7 17.1l1.3-3.2-3.4-.6M18.3 6.9 17 10.1l3.4.6"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  lock: '<rect x="5" y="11" width="14" height="10" rx="2.5"/><path d="M8 11V7.5a4 4 0 0 1 8 0V11"/>',
  sound: '<path d="M11 5 6.5 9H3v6h3.5L11 19z"/><path d="M15.5 9a4.5 4.5 0 0 1 0 6M18.5 6a8.5 8.5 0 0 1 0 12"/>',
  x: '<path d="M6 6l12 12M18 6 6 18"/>',
  trophy: '<path d="M8 21h8M12 17v4M7 3h10v6a5 5 0 0 1-10 0z"/><path d="M17 5h3v1.5A3.5 3.5 0 0 1 16.6 10M7 5H4v1.5A3.5 3.5 0 0 0 7.4 10"/>',
  star: '<path d="m12 2.8 2.8 5.8 6.3.9-4.6 4.4 1.1 6.3L12 17.2l-5.6 3 1.1-6.3L2.9 9.5l6.3-.9z"/>',
  crown: '<path d="m3 7 4.5 4L12 4l4.5 7L21 7l-2 12H5z"/>',
  gem: '<path d="M6 3h12l3.5 6L12 21 2.5 9z"/><path d="M2.5 9h19M9 3l3 6 3-6M12 21 9 9M12 21l3-12"/>',
  target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.2"/>',
  cloud: '<path d="M7 18.5a4.5 4.5 0 0 1-.6-9 6 6 0 0 1 11.5 1.6A3.7 3.7 0 0 1 17.5 18.5z"/>',
  out: '<path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 16l4-4-4-4M14 12H4"/>',
  eye: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  repeat: '<path d="M17 2l4 4-4 4"/><path d="M3 11V9a3 3 0 0 1 3-3h15M7 22l-4-4 4-4"/><path d="M21 13v2a3 3 0 0 1-3 3H3"/>',
  play: '<path d="M7 4.5v15l12-7.5z"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
};
const FILLED = { flame: 1, bolt: 1, play: 1, star: 1, crown: 1 };
const ic = (n, c) => `<svg class="ic${FILLED[n] ? ' f' : ''}${c ? ' ' + c : ''}" viewBox="0 0 24 24" aria-hidden="true">${I[n]}</svg>`;
const FLAME = `<svg viewBox="0 0 64 84" class="bigflame" aria-hidden="true"><defs><linearGradient id="fg1" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#ff4d1a"/><stop offset=".55" stop-color="#ff9a1a"/><stop offset="1" stop-color="#ffd447"/></linearGradient><linearGradient id="fg2" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#ffc23d"/><stop offset="1" stop-color="#fff4b8"/></linearGradient></defs><path class="fo" fill="url(#fg1)" d="M33 2c4.5 13-9 19.5-9 32 0 5 3.3 8.5 7.5 8.5 6.5 0 9-6.5 7-14.5C49 34.5 57 45 57 57A25 25 0 0 1 32 82 24 24 0 0 1 7 58C7 35 29 27 33 2z"/><path class="fi" fill="url(#fg2)" d="M33 47c6.5 4.5 11 11 11 17.5a12.5 12.5 0 0 1-25 0c0-6.5 5-10 8.5-13 1 4.5 3 5.5 5 5.5 3.5 0 3-6 .5-10z"/></svg>`;

/* ---------- TINGUJT (sintetizuar, pa skedarë) ---------- */
let AC;
function tone(f, t0, d, type, g) { const t = AC.currentTime + t0, o = AC.createOscillator(), v = AC.createGain(); o.type = type || 'sine'; o.frequency.setValueAtTime(f, t); v.gain.setValueAtTime(0, t); v.gain.linearRampToValueAtTime(g || .14, t + .012); v.gain.exponentialRampToValueAtTime(.0001, t + d); o.connect(v).connect(AC.destination); o.start(t); o.stop(t + d + .05); }
const SFX = {
  ok: () => { tone(880, 0, .12); tone(1318.5, .075, .28); },
  no: () => { tone(233, 0, .2, 'triangle', .2); tone(175, .11, .3, 'triangle', .18); },
  tap: () => tone(660, 0, .06, 'sine', .05),
  combo: () => { tone(988, 0, .1); tone(1319, .06, .1); tone(1760, .12, .25); },
  win: () => [523.3, 659.3, 784, 1046.5, 1318.5].forEach((f, i) => tone(f, i * .085, .35, 'sine', .12)),
  fire: () => { [392, 523.3, 659.3, 784].forEach((f, i) => tone(f, i * .06, .3, 'triangle', .1)); tone(1568, .3, .6, 'sine', .08); },
};
const sfx = k => { if (!S.sound) return; try { AC = AC || new (window.AudioContext || window.webkitAudioContext)(); if (AC.state === 'suspended') AC.resume(); SFX[k](); } catch (e) {} };

/* ---------- ZËRI (Web Speech API) ---------- */
let V = null;
const pickV = () => { try { const vs = speechSynthesis.getVoices(); V = vs.find(v => /^ar[-_]SA/i.test(v.lang)) || vs.find(v => /^ar/i.test(v.lang)) || null; } catch (e) {} };
try { pickV(); speechSynthesis.onvoiceschanged = pickV; } catch (e) {}
let warned = false;
const utter = (t, cb) => { const u = new SpeechSynthesisUtterance(t); u.lang = 'ar-SA'; if (V) u.voice = V; u.rate = .8; if (cb) u.onend = cb; speechSynthesis.speak(u); };
const speak = t => { try { speechSynthesis.cancel(); if (!V && !warned) { warned = true; toast('Pajisja mund të mos ketë zë arabisht. Shtoje te cilësimet e gjuhës ose provo Chrome.'); } utter(t); } catch (e) { toast('Zëri nuk punon në këtë shfletues.'); } };
const playAll = (ls, i = 0) => { try { if (i === 0) speechSynthesis.cancel(); if (i < ls.length) utter(ls[i], () => playAll(ls, i + 1)); } catch (e) {} };
const hush = () => { try { speechSynthesis.cancel(); } catch (e) {} };

/* ---------- SERVERI DHE SINKRONIZIMI ---------- */
async function api(p, o = {}) {
  let r;
  try {
    r = await fetch('/api/' + p, { method: o.method || 'GET', keepalive: !!o.keepalive, headers: { 'Content-Type': 'application/json', ...(ME() ? { Authorization: 'Bearer ' + ME().t } : {}) }, body: o.body ? JSON.stringify(o.body) : undefined });
  } catch (e) { const x = new Error('Nuk ka lidhje me serverin. Kontrollo internetin.'); x.status = 0; throw x; }
  let j = {}; try { j = await r.json(); } catch (e) {}
  if (!r.ok) { const x = new Error(j.error || 'Serveri nuk u përgjigj si duhet (' + r.status + ').'); x.status = r.status; throw x; }
  return j;
}
let pushT, dirty = false, syncing = null, lastSync = 0, syncState = 'idle';
const queuePush = () => { if (!ME()) return; dirty = true; clearTimeout(pushT); pushT = setTimeout(push, 1500); };
function push(replace) {
  if (!ME()) return Promise.resolve();
  if (syncing) return syncing.then(() => dirty && push());
  if (!dirty && !replace) return Promise.resolve();
  dirty = false; syncState = 'busy'; paintSync();
  syncing = api('progress', { method: 'PUT', body: { data: S, replace: !!replace } }).then(j => {
    if (j.data) { S = merge(S, j.data); persist(); applyTheme(); }
    lastSync = Date.now(); syncState = 'ok';
  }).catch(e => { dirty = true; syncState = 'off'; if (e.status === 401) expired(); }).finally(() => { syncing = null; paintSync(); });
  return syncing;
}
async function pull() {
  if (!ME()) return;
  try {
    const j = await api('progress');
    if (j.data) { S = merge(S, j.data); persist(); applyTheme(); }
    lastSync = Date.now(); syncState = 'ok'; dirty = true; push();
    if (!document.body.classList.contains('inlesson') && !document.body.classList.contains('bare')) refresh();
  } catch (e) { syncState = 'off'; if (e.status === 401) expired(); }
  paintSync();
}
function expired() { const u = ME() && ME().u; setAuth(null); toast('Seanca skadoi. Hyr sërish që të sinkronizohet progresi.'); if (!document.body.classList.contains('inlesson')) authView('login', u); }
addEventListener('online', () => push());
document.addEventListener('visibilitychange', () => {
  if (!ME()) return;
  if (document.visibilityState === 'hidden' && dirty) { clearTimeout(pushT); dirty = false; api('progress', { method: 'PUT', keepalive: true, body: { data: S } }).catch(() => { dirty = true; }); }
  if (document.visibilityState === 'visible' && Date.now() - lastSync > 60000) pull();
});
const ago = t => { const s = Math.round((Date.now() - t) / 1000); return s < 10 ? 'tani' : s < 60 ? 'para ' + s + ' sekondash' : s < 3600 ? 'para ' + Math.round(s / 60) + ' min' : 'para ' + Math.round(s / 3600) + ' orësh'; };
function paintSync() {
  const el = document.getElementById('sync'); if (!el) return;
  el.className = 'sync ' + syncState;
  el.innerHTML = ic('cloud') + (syncState === 'busy' ? 'Duke ruajtur…' : syncState === 'off' ? 'Pa lidhje: do të ruhet kur të kthehet interneti' : lastSync ? 'I ruajtur në llogari · ' + ago(lastSync) : 'I ruajtur në llogari');
}

/* ---------- TEMAT ---------- */
const THEMES = [['auto', 'Automatike', 'Oaza ditën, Mesnata natën'], ['oaz', 'Oaza', 'Kaltër e thellë dhe koral'], ['rere', 'Shkretëtira', 'Rërë, terrakotë, diell'], ['trendafil', 'Trëndafili', 'Rozë e butë dhe vishnje'], ['smerald', 'Smeraldi', 'Gjelbër e errët dhe ar'], ['mesnate', 'Mesnata', 'Indigo, yje dhe rozë']];
const mq = matchMedia('(prefers-color-scheme: dark)');
function applyTheme() {
  let t = S.theme || 'auto';
  if (t === 'auto' || !THEMES.some(x => x[0] === t)) t = mq.matches ? 'mesnate' : 'oaz';
  document.documentElement.dataset.theme = t;
  const m = document.querySelector('meta[name=theme-color]');
  if (m) m.content = getComputedStyle(document.documentElement).getPropertyValue('--hero1').trim() || '#0f4c5c';
}
try { mq.addEventListener('change', applyTheme); } catch (e) {}

/* ---------- EFEKTET ---------- */
function confetti(n = 150) {
  if (reduce) return;
  const c = document.createElement('canvas'), dpr = Math.min(2, devicePixelRatio || 1); c.className = 'confetti'; document.body.appendChild(c);
  const x = c.getContext('2d'), W = c.width = innerWidth * dpr, H = c.height = innerHeight * dpr, cs = getComputedStyle(document.documentElement);
  const cols = ['--acc', '--pri', '--gold', '--ok'].map(v => cs.getPropertyValue(v).trim()).concat(['#ff9a1a', '#ffffff']);
  const P = [...Array(n)].map(() => ({ x: W / 2 + (Math.random() - .5) * W * .2, y: H * .42, vx: (Math.random() - .5) * W * .028, vy: -(Math.random() * .028 + .008) * H, r: Math.random() * 6, vr: (Math.random() - .5) * .35, s: (5 + Math.random() * 7) * dpr, c: pick(cols), w: Math.random() * 6 }));
  const t0 = performance.now();
  (function f(t) {
    const k = t - t0; x.clearRect(0, 0, W, H);
    P.forEach(p => { p.vy += H * .0007; p.vx *= .985; p.vy *= .99; p.x += p.vx; p.y += p.vy; p.r += p.vr; x.save(); x.translate(p.x, p.y); x.rotate(p.r); x.scale(1, Math.cos(k / 120 + p.w)); x.globalAlpha = Math.max(0, 1 - k / 3200); x.fillStyle = p.c; x.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2); x.restore(); });
    k < 3200 ? requestAnimationFrame(f) : c.remove();
  })(t0);
}
function countUp(root) {
  (root || app).querySelectorAll('[data-count]').forEach(el => {
    const to = +el.dataset.count, from = +(el.dataset.from || 0), suf = el.dataset.suf || '', d = reduce ? 0 : 900, t0 = performance.now();
    const f = t => { const k = d ? Math.min(1, (t - t0) / d) : 1, e = 1 - Math.pow(1 - k, 3); el.textContent = Math.round(from + (to - from) * e) + suf; if (k < 1) requestAnimationFrame(f); };
    requestAnimationFrame(f);
  });
}
function floatXP(n, at) {
  if (!at) return;
  const r = at.getBoundingClientRect(), e = document.createElement('div');
  e.className = 'xpfloat'; e.innerHTML = ic('bolt') + '+' + n;
  e.style.left = (r.left + r.width / 2) + 'px'; e.style.top = (r.top + 4) + 'px';
  document.body.appendChild(e); setTimeout(() => e.remove(), 1100);
}
const anim = () => { app.classList.remove('anim'); void app.offsetWidth; app.classList.add('anim'); };
const ring = (v, max, cls) => { const r = 26, c = 2 * Math.PI * r, f = Math.min(1, v / Math.max(1, max)); return `<svg class="ring ${cls || ''}" viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="${r}" class="rt"/><circle cx="32" cy="32" r="${r}" class="rv" style="--c:${c.toFixed(1)};stroke-dasharray:${c.toFixed(1)};stroke-dashoffset:${(c * (1 - f)).toFixed(1)}" transform="rotate(-90 32 32)"/></svg>`; };
const week = () => { const t = today(); return `<div class="week">${[6, 5, 4, 3, 2, 1, 0].map(n => { const k = shift(t, -n), on = !!S.log[k], fz = !on && S.frz[k]; return `<div class="wd${on ? ' on' : ''}${fz ? ' fz' : ''}${n === 0 ? ' now' : ''}"><i>${on ? ic('flame') : fz ? ic('snow') : ''}</i><span>${WD[new Date(k + 'T12:00').getDay()]}</span></div>`; }).join('')}</div>`; };

/* ---------- PYETJET ---------- */
const mk = q => ({ k: 'mcq', t: 'Zgjidh përgjigjen e saktë', p: q.p, opts: shuffle(q.o), a: q.o[0], optAr: !!q.ar });
const vq = (ws, pool, n) => shuffle(ws.map((w, i) => {
  const o = shuffle(pool.filter(x => x[0] !== w[0] && x[1] !== w[1])).slice(0, 3);
  return i % 2 ? { k: 'mcq', t: 'Si thuhet në arabisht?', p: w[1], opts: shuffle([w[0], ...o.map(x => x[0])]), a: w[0], optAr: true }
    : { k: 'mcq', t: 'Çfarë do të thotë?', p: w[0], pAr: true, opts: shuffle([w[1], ...o.map(x => x[1])]), a: w[1] };
})).slice(0, n || 99);
const bq = (u, all) => u.build.map(b => { const ex = shuffle(all.map(w => w[0]).filter(w => !w.includes(' ') && !b[1].includes(w)))[0]; return { k: 'build', p: b[0], tiles: b[1], pool: shuffle(ex ? b[1].concat(ex) : b[1]) }; });
function steps(i) {
  const d = DAYS[i], u = U[d.ui], all = u.A.concat(u.B), prev = U.slice(0, d.ui).flatMap(x => x.A.concat(x.B));
  const old = prev.length ? vq(shuffle(prev).slice(0, 3), prev) : [];
  switch (d.di) {
    case 0: return [{ k: 'cards', w: u.A }, { k: 'quiz', q: vq(u.A, u.A) }];
    case 1: return [{ k: 'dialog', d: u.D1 }, { k: 'quiz', q: u.D1.q.map(mk) }];
    case 2: return [{ k: 'gram', g: u.G }, { k: 'quiz', q: shuffle(u.G.ex.map(mk)) }];
    case 3: return [{ k: 'cards', w: u.B }, { k: 'dialog', d: u.D2 }, { k: 'quiz', q: vq(u.B, all).concat(u.D2.q.map(mk)) }];
    case 4: return [{ k: 'quiz', q: shuffle(vq(all, all, 12).concat(shuffle(u.G.ex).slice(0, 4).map(mk), old)) }];
    case 5: return [{ k: 'quiz', q: bq(u, all).concat(u.say.map(s => ({ k: 'say', p: s[0], a: s[1] }))) }];
    case 6: return [{ k: 'quiz', test: true, q: shuffle(vq(all, all, 10).concat(shuffle(u.G.ex).slice(0, 4).map(mk), old, bq(u, all).slice(0, 2))) }];
  }
}

/* ---------- KOKA DHE NAVIGIMI ---------- */
const TABS = [['home', 'Mësimi', 'home'], ['dict', 'Fjalori', 'book'], ['stats', 'Progresi', 'chart'], ['me', 'Profili', 'user']];
let tab = 'home';
function chrome() {
  const si = streakInfo();
  top.innerHTML = `<div class="in">
  <button class="brand" data-tab="home" aria-label="Mëso Arabisht, faqja kryesore"><span class="logo">ع</span><span class="bt">Mëso Arabisht</span></button>
  <nav class="tabs" aria-label="Navigimi kryesor">${TABS.map(([k, l, i]) => `<button class="tab" data-tab="${k}"${tab === k ? ' aria-current="page"' : ''}>${ic(i)}<span>${l}</span></button>`).join('')}</nav>
  <div class="chips">
   <button class="chip fire${si.done ? ' lit' : ''}" data-tab="stats" aria-label="Seria: ${si.n} ditë radhazi">${ic('flame')}<b>${si.n}</b></button>
   <button class="chip bolt" data-tab="stats" aria-label="XP sot: ${xpToday()}">${ic('bolt')}<b>${xpToday()}</b></button>
  </div></div>`;
}
const VIEWS = { home, dict, stats, me };
function setTab(t) {
  if (!VIEWS[t]) t = 'home';
  hush(); L = Q = R = null;
  if (!ME() && !AUTH.guest) return authView();
  tab = t;
  document.body.classList.remove('inlesson', 'bare');
  try { history.replaceState(null, '', t === 'home' ? location.pathname : '#' + t); } catch (e) {}
  const go = () => { VIEWS[t](); chrome(); anim(); scrollTo(0, 0); };
  if (document.startViewTransition && !reduce && app.dataset.view) document.startViewTransition(go); else go();
  app.dataset.view = t;
}
const refresh = () => { if (VIEWS[tab] && !document.body.classList.contains('inlesson')) { VIEWS[tab](); chrome(); } };
document.addEventListener('click', e => { const b = e.target.closest('[data-tab]'); if (b) { sfx('tap'); setTab(b.dataset.tab); } });

/* ---------- HYRJA / LLOGARIA ---------- */
function authView(mode, prefill) {
  mode = mode || 'signup';
  document.body.classList.add('bare'); document.body.classList.remove('inlesson');
  top.innerHTML = '';
  const su = mode === 'signup';
  app.innerHTML = `<section class="auth"><div class="auth-in">
   <div class="auth-hero"><p class="display ar">أَهْلًا وَسَهْلًا</p><h1>Mëso Arabisht</h1><p class="lead">15 minuta në ditë. Fjalë, dialogë, gramatikë dhe një seri ditësh që të mban në rrugë.</p></div>
   <form class="authcard" id="authf" data-mode="${mode}" novalidate>
    <div class="seg2" role="tablist"><button type="button" role="tab" data-amode="signup" aria-selected="${su}">Krijo llogari</button><button type="button" role="tab" data-amode="login" aria-selected="${!su}">Hyr</button></div>
    <label class="fld"><span>Emri i përdoruesit</span><input name="u" autocomplete="username" autocapitalize="none" autocorrect="off" spellcheck="false" maxlength="20" placeholder="p.sh. ardit_99" value="${esc(prefill || '')}" required></label>
    <label class="fld"><span>Fjalëkalimi</span><span class="pw"><input name="p" type="password" autocomplete="${su ? 'new-password' : 'current-password'}" minlength="6" placeholder="${su ? 'Së paku 6 shenja' : '••••••'}" required><button type="button" class="eye" data-eye aria-label="Shfaq fjalëkalimin">${ic('eye')}</button></span></label>
    <p class="err" role="alert"></p>
    <button class="btn big full" type="submit"><span>${su ? 'Krijo llogarinë' : 'Hyr'}</span></button>
    <p class="fine">${su ? 'Vetëm emër dhe fjalëkalim. Pa email. Progresi ruhet në llogari dhe e gjen në çdo pajisje.' : 'Mirë se u ktheve! Progresi yt të pret.'}</p>
   </form>
   <button class="link" data-guest>Vazhdo pa llogari →</button>
  </div></section>`;
  anim();
  const inp = app.querySelector(prefill ? '[name=p]' : '[name=u]');
  if (matchMedia('(hover:hover)').matches) inp.focus();
}
async function doAuth(f) {
  const mode = f.dataset.mode, u = f.u.value.trim().toLowerCase(), p = f.p.value, err = f.querySelector('.err'), b = f.querySelector('[type=submit]');
  const fail = m => { err.textContent = m; f.classList.remove('shake'); void f.offsetWidth; f.classList.add('shake'); sfx('no'); buzz([20, 40, 20]); };
  if (!/^[a-z0-9_.]{3,20}$/.test(u)) return fail('Emri: 3–20 shenja, vetëm shkronja latine (pa ë/ç), numra, _ ose pikë.');
  if (p.length < 6) return fail('Fjalëkalimi duhet të ketë së paku 6 shenja.');
  err.textContent = ''; b.disabled = true; b.classList.add('busy');
  try {
    const j = await api('auth', { method: 'POST', body: { action: mode, username: u, password: p } });
    setAuth({ u: j.username, t: j.token });
    if (j.data) S = merge(S, j.data);
    persist(); applyTheme(); dirty = true; push();
    sfx('win'); buzz(20);
    setTab('home');
    toast(`${ic('check')} ${mode === 'signup' ? 'Mirë se erdhe' : 'Mirë se u ktheve'}, <b>${esc(j.username)}</b>!`, 'good');
    if (mode === 'signup') setTimeout(() => confetti(90), 200);
  } catch (x) { fail(x.message); } finally { b.disabled = false; b.classList.remove('busy'); }
}
let outArm = false;
async function logout(btn) {
  if (dirty || syncing) {
    btn.classList.add('busy'); await push(); btn.classList.remove('busy');
    if (dirty && !outArm) { outArm = true; btn.innerHTML = 'Pa internet: ndryshimet e fundit humbin. Kliko sërish për të dalë'; return; }
  }
  outArm = false;
  api('auth', { method: 'POST', body: { action: 'logout' } }).catch(() => {});
  clearAccount();
  toast('Dole nga llogaria.');
}
function clearAccount() { const th = S.theme; S = fresh(); S.theme = th; persist(); setAuth(null); dirty = false; applyTheme(); authView('login'); }

/* ---------- KRYEFAQJA ---------- */
const hello = () => { const h = new Date().getHours(); return h < 5 ? 'Natë e mbarë' : h < 12 ? 'Mirëmëngjes' : h < 18 ? 'Mirëdita' : 'Mirëmbrëma'; };
function streakMsg(si) {
  if (si.done) return 'Seria është e sigurt për sot. Shihemi nesër!';
  if (si.frozen) return `${ic('snow')} Ngrirja e mbron serinë për ${si.frozen === 1 ? 'ditën' : si.frozen + ' ditët'} që mungove. Bëje mësimin sot!`;
  if (si.n > 0) { const h = 24 - new Date().getHours(); return `Bëje një mësim sot që të mos e humbësh. Të kanë mbetur <b>${h} orë</b>.`; }
  if (si.lost) return `Seria prej ${si.lost} ditësh u ndal. Asgjë s'ka humbur nga dija, fillo një të re sot!`;
  return 'Bëje mësimin e parë dhe ndeze flakën e parë.';
}
function home() {
  const ci = curIdx(), cd = ci >= 0 ? DAYS[ci] : null, open = ci >= 0 && unlocked(ci), nd = due().length, si = streakInfo(), xt = xpToday(), g = S.goal, doneN = Object.keys(S.done).length;
  const name = ME() ? ME().u : '';
  let th;
  const rev = nd ? `<button class="btn sec" data-rev>${ic('repeat')} Përsërit ${nd} fjalë</button>` : '';
  if (!cd) th = `<div class="k">Mashallah!</div><div class="t">I përfundove të gjitha njësitë që janë gati.</div><p class="mut">Vazhdo me përsëritjen e përditshme derisa të shtohen njësitë e reja.</p>${nd ? `<div class="row">${rev.replace('btn sec', 'btn big')}</div>` : ''}`;
  else if (open) th = `<div class="k">Mësimi i sotëm · Njësia ${U[cd.ui].n}, dita ${cd.di + 1} nga 7</div><div class="t">${esc(DN[cd.di])}</div><div class="row"><button class="btn big" data-go="${ci}">${ic('play')} Fillo mësimin</button>${rev}</div>`;
  else th = `<div class="k">${ic('check')} Mësimi i sotëm u krye</div><div class="t">Dita e radhës (${esc(DN[cd.di])}) hapet nesër.</div><p class="mut">Pushimi mes mësimeve e ndihmon kujtesën.${nd ? ' Ndërkohë ke fjalë për përsëritje.' : ''}</p>${nd ? `<div class="row">${rev.replace('btn sec', 'btn big')}</div>` : ''}`;
  const nudge = !ME() && doneN ? `<div class="nudge">${ic('cloud')}<div><b>Mos e humb progresin</b><span>Krijo llogari me emër dhe fjalëkalim. Progresi ruhet dhe e ke në çdo pajisje.</span></div><button class="btn sm" data-auth="signup">Krijo llogari</button></div>` : '';
  app.innerHTML = `<section class="hero"><div class="wrap">
   <p class="hello">${hello()}${name ? `, <b>${esc(name)}</b>` : ''}</p>
   <div class="duo">
    <div class="panel streakp${si.done ? ' lit' : ''}"><div class="ph"><span class="fl">${ic('flame')}</span><div><b>${si.n}</b><span>${si.n === 1 ? 'ditë radhazi' : 'ditë radhazi'}</span></div>${S.freezes ? `<span class="frz" title="Ngrirje: e mbron serinë kur mungon një ditë">${ic('snow')}${S.freezes}</span>` : ''}</div>${week()}<p class="pm">${streakMsg(si)}</p></div>
    <div class="panel goalp${xt >= g ? ' full' : ''}"><div class="rw">${ring(xt, g)}<div class="rc">${xt >= g ? ic('check') : ic('bolt')}</div></div><div><b>${xt}<small>/${g} XP</small></b><span>${xt >= g ? 'Qëllimi u arrit sot!' : 'Qëllimi i ditës'}</span></div></div>
   </div>
   <div class="today">${th}</div>
  </div></section>
  ${nudge ? `<section class="band tight"><div class="wrap">${nudge}</div></section>` : ''}
  <section class="band"><div class="wrap">
   ${U.map((u, ui) => { const n = DN.filter((_, di) => S.done[DAYS[ui * 7 + di].id]).length, sc = S.scores['u' + u.n];
     return `<article class="unit${n === 7 ? ' fin' : ''}"><div class="uh"><div><div class="ul">Njësia ${u.n}${sc ? ` · <span class="pill ok">${ic('trophy')} ${sc}%</span>` : ''}</div><h2>${esc(u.sq)}</h2></div><span class="ar">${esc(u.ar)}</span></div>
     <div class="ubar"><b style="width:${Math.round(n / 7 * 100)}%"></b></div>
     <div class="path">${DN.map((nm, di) => { const i = ui * 7 + di, d = DAYS[i], done = !!S.done[d.id], ok = unlocked(i), cur = i === ci && ok;
       return `<button class="node${done ? ' done' : ''}${cur ? ' cur' : ''}${di === 6 ? ' test' : ''}" data-go="${i}"${ok ? '' : ' disabled'} aria-label="Dita ${di + 1}: ${esc(nm)}${done ? ' (e kryer)' : ok ? '' : ' (e mbyllur)'}">${cur ? '<em>SOT</em>' : ''}<i>${done ? ic('check') : !ok ? ic('lock') : di === 6 ? ic('trophy') : di + 1}</i><small>${esc(nm)}</small></button>`; }).join('')}</div></article>`; }).join('')}
   <h3>Njësitë që vijnë</h3><div class="soon">${SOON.map((s, i) => `<div><span class="ar">${esc(s[0])}</span>${U.length + i + 1}. ${esc(s[1])}</div>`).join('')}</div>
   <details class="how"><summary>Pse funksionon kjo mënyrë?</summary><div class="howg">
    <div><b>Nxjerrja nga kujtesa.</b> Nuk e lexon vetëm mësimin: përgjigjesh, ndërton fjali dhe flet. Kështu fjalët ngulen më mirë se me rilexim.</div>
    <div><b>Përsëritje me intervale.</b> Fjalët kthehen pas 1, 2, 4, 7, 15, 30 e 60 ditësh, pikërisht kur fillon t'i harrosh.</div>
    <div><b>Përzierje.</b> Dita 5 dhe testi e përziejnë fjalorin, gramatikën dhe fjalët e njësive të kaluara.</div>
    <div><b>Pak, por çdo ditë.</b> Një mësim në ditë dhe seria e ditëve. Gabimet kthehen në fund derisa t'i bësh saktë.</div>
   </div></details>
   <p class="fine">Dialogët dhe ushtrimet janë shkruar posaçërisht për këtë platformë sipas temave të librit 1 të «العربية بين يديك». Nuk janë kopje e tekstit të librit.</p>
  </div></section>`;
}

/* ---------- FJALORI ---------- */
let dq = '', dmode = 'learned';
function dict() {
  const learned = Object.keys(S.cards).length;
  app.innerHTML = `<section class="band"><div class="wrap"><h1>Fjalori</h1><p class="lead">Të gjitha fjalët e platformës. Prek një fjalë për ta dëgjuar. Pikat tregojnë sa mirë e di.</p>
   <input class="search" id="dq" type="search" placeholder="Kërko shqip ose arabisht…" value="${esc(dq)}" autocomplete="off">
   <div class="seg">${[['learned', `Të mësuarat (${learned})`], ['all', `Të gjitha (${ALLW.length})`], ...U.map(u => ['u' + u.n, 'Njësia ' + u.n])].map(([k, l]) => `<button data-dm="${k}" aria-pressed="${dmode === k}">${l}</button>`).join('')}</div>
   <div class="words" id="wl"></div></div></section>`;
  renderWords();
}
const strip = s => s.replace(/[ً-ْٰـ]/g, '').toLowerCase();
function renderWords() {
  const q = strip(dq.trim());
  let ws = ALLW.filter(w => dmode === 'all' || (dmode === 'learned' ? S.cards[w.ar] : 'u' + w.u === dmode));
  if (q) ws = ws.filter(w => strip(w.ar).includes(q) || w.sq.toLowerCase().includes(q) || (w.tr || '').toLowerCase().includes(q));
  const seen = new Set(); ws = ws.filter(w => !seen.has(w.ar) && seen.add(w.ar));
  const el = document.getElementById('wl');
  el.innerHTML = ws.length ? ws.map(w => { const c = S.cards[w.ar], lv = c ? c.b + 1 : 0; return `<button class="word" data-say="${esc(w.ar)}"><span><span class="m">${esc(w.sq)}</span><span class="u">Njësia ${w.u}${S.tr ? ' · ' + esc(w.tr) : ''}</span></span><span class="lvl" aria-label="Niveli ${lv} nga 7">${INT.map((x, i) => `<i class="${i < lv ? 'on' : ''}"></i>`).join('')}</span><span class="ar">${esc(w.ar)}</span></button>`; }).join('')
    : `<div class="empty">${dmode === 'learned' && !q ? 'Ende s\'ke fjalë të mësuara. Fillo mësimin e parë dhe fjalët do të shfaqen këtu.' : 'Asnjë fjalë nuk përputhet me kërkimin.'}</div>`;
}

/* ---------- PROGRESI ---------- */
function stats() {
  const cards = Object.values(S.cards), mast = cards.filter(c => c.b >= 3).length, si = streakInfo(), t = today();
  const dow = (new Date(t + 'T12:00').getDay() + 6) % 7, start = shift(t, -dow - 28);
  const cal = [...Array(35)].map((_, i) => { const k = shift(start, i), n = S.log[k] || 0, fut = k > t; return `<i class="${n ? 'a' + Math.min(3, n) : ''}${S.frz[k] && !n ? ' fz' : ''}${k === t ? ' now' : ''}${fut ? ' fut' : ''}" title="${k}">${n ? ic('flame') : S.frz[k] ? ic('snow') : fut ? '' : +k.slice(8)}</i>`; }).join('');
  const days7 = [6, 5, 4, 3, 2, 1, 0].map(n => shift(t, -n)), mx = Math.max(S.goal, ...days7.map(k => S.xp[k] || 0));
  app.innerHTML = `<section class="band"><div class="wrap"><h1>Progresi</h1>
   <div class="grid2">
    <div class="box fire">${ic('flame')}<b data-count="${si.n}">${si.n}</b><span>ditë radhazi</span></div>
    <div class="box">${ic('trophy')}<b data-count="${S.best || 0}">${S.best || 0}</b><span>seria më e gjatë</span></div>
    <div class="box bolt">${ic('bolt')}<b data-count="${xpTotal()}">${xpTotal()}</b><span>XP gjithsej</span></div>
    <div class="box">${ic('book')}<b>${mast}<small>/${cards.length}</small></b><span>fjalë të forta</span></div>
   </div>
   <div class="split">
    <div class="pane"><h3>Kalendari</h3><div class="calh">${['H', 'M', 'M', 'E', 'P', 'S', 'D'].map(x => `<span>${x}</span>`).join('')}</div><div class="cal">${cal}</div>
     <p class="mut sm">${ic('snow')} Ngrirje: <b>${S.freezes}</b>/2. Fiton një çdo 7 ditë radhazi; e mbron serinë kur mungon një ditë.</p></div>
    <div class="pane"><h3>XP këtë javë</h3><div class="xpch">${days7.map(k => { const v = S.xp[k] || 0; return `<div class="xc${v >= S.goal ? ' hit' : ''}${k === t ? ' now' : ''}"><span class="xv">${v || ''}</span><span class="xb"><b style="height:${Math.round(v / mx * 100)}%"></b></span><span class="xl">${WD[new Date(k + 'T12:00').getDay()]}</span></div>`; }).join('')}<div class="gl" style="bottom:calc(22px + ${Math.round(S.goal / mx * 100)}% * .82)"><span>qëllimi</span></div></div></div>
   </div>
   <h3>Medaljet <span class="mut">${Object.keys(S.badges).length}/${BADGES.length}</span></h3>
   <div class="badges">${BADGES.map(b => { const got = S.badges[b[0]]; return `<div class="bd${got ? ' got' : ''}" title="${esc(b[2])}"><i>${ic(got ? b[3] : 'lock')}</i><b>${esc(b[1])}</b><span>${esc(b[2])}</span></div>`; }).join('')}</div>
   <h3>Njësitë</h3><div class="bars">${U.map(u => { const n = DN.filter((_, i) => S.done['u' + u.n + 'd' + (i + 1)]).length, sc = S.scores['u' + u.n]; return `<div class="bar"><span>${esc(u.sq)}</span><span class="t"><b style="width:${Math.round(n / 7 * 100)}%"></b></span><span class="v">${sc ? sc + '%' : n + '/7'}</span></div>`; }).join('')}</div>
  </div></section>`;
  countUp();
}

/* ---------- PROFILI ---------- */
const GOALS = [[50, 'Lehtë', 'një përsëritje'], [100, 'Mesatar', 'një mësim'], [200, 'Seriozisht', 'mësim + përsëritje'], [300, 'Intensiv', 'si kampion']];
function me() {
  const m = ME();
  app.innerHTML = `<section class="band"><div class="wrap">
   ${m ? `<div class="prof"><div class="av">${esc(m.u[0].toUpperCase())}</div><div class="pi"><h1>${esc(m.u)}</h1><p id="sync" class="sync"></p></div><button class="btn sec sm" data-logout>${ic('out')} Dil</button></div>`
     : `<div class="prof guest"><div class="av">?</div><div class="pi"><h1>Pa llogari</h1><p class="mut">Progresi ruhet vetëm në këtë pajisje. Me llogari e ke kudo.</p></div><div class="row"><button class="btn sm" data-auth="signup">Krijo llogari</button><button class="btn sec sm" data-auth="login">Hyr</button></div></div>`}
   <h2>Tema</h2>
   <div class="themes">${THEMES.map(([k, n, d]) => `<button class="tp${(S.theme || 'auto') === k ? ' sel' : ''}" data-theme-pick="${k}" ${k === 'auto' ? '' : `data-theme="${k}"`} aria-pressed="${(S.theme || 'auto') === k}"><span class="pv">${k === 'auto' ? '<span class="half" data-theme="oaz"></span><span class="half" data-theme="mesnate"></span>' : '<span class="h"></span><span class="c"><i></i><i></i></span><span class="b"></span>'}</span><b>${n}</b><small>${d}</small>${(S.theme || 'auto') === k ? `<span class="tick">${ic('check')}</span>` : ''}</button>`).join('')}</div>
   <h2>Qëllimi ditor</h2>
   <div class="goals">${GOALS.map(([v, n, d]) => `<button data-goal="${v}" aria-pressed="${S.goal === v}"><b>${n}</b><span>${v} XP · ${d}</span></button>`).join('')}</div>
   <h2>Cilësimet</h2>
   <div class="sets">
    <label class="sw"><span><b>Tingujt</b><small>Tinguj të lehtë kur përgjigjesh</small></span><input type="checkbox" id="snd"${S.sound ? ' checked' : ''}><i></i></label>
    <label class="sw"><span><b>Transliterimi</b><small>Shqiptimi me shkronja latine te fjalët e reja</small></span><input type="checkbox" id="tr"${S.tr ? ' checked' : ''}><i></i></label>
    <label class="sw"><span><b>Mënyra e lirë</b><small>Hap ditën tjetër pa pritur nesër</small></span><input type="checkbox" id="free"${S.free ? ' checked' : ''}><i></i></label>
   </div>
   ${m ? `<h2>Llogaria</h2>
   <details class="acc"><summary>Ndrysho fjalëkalimin</summary><form id="pwf" class="mini" novalidate>
    <label class="fld"><span>Fjalëkalimi aktual</span><input name="p" type="password" autocomplete="current-password" required></label>
    <label class="fld"><span>Fjalëkalimi i ri</span><input name="np" type="password" autocomplete="new-password" minlength="6" required></label>
    <p class="err" role="alert"></p><button class="btn" type="submit"><span>Ruaje</span></button></form></details>
   <details class="acc danger"><summary>Fshi llogarinë</summary><form id="delf" class="mini" novalidate>
    <p class="mut">Llogaria dhe i gjithë progresi fshihen përgjithmonë nga serveri.</p>
    <label class="fld"><span>Shkruaj fjalëkalimin për ta konfirmuar</span><input name="p" type="password" autocomplete="current-password" required></label>
    <p class="err" role="alert"></p><button class="btn bad" type="submit"><span>Fshije përgjithmonë</span></button></form></details>` : ''}
   <details class="acc danger"><summary>Fillo nga e para</summary><div class="mini"><p class="mut">Fshin mësimet, fjalët, serinë dhe XP-në${m ? ' edhe në llogari' : ''}.</p><button class="btn bad" id="reset">Fshi progresin</button></div></details>
  </div></section>`;
  paintSync();
}

/* ---------- MËSIMI ---------- */
let L = null, Q = null, R = null;
function startLesson(i) {
  if (!unlocked(i)) return;
  document.body.classList.add('inlesson'); top.innerHTML = '';
  L = { i, st: steps(i), s: 0, ok: 0, tot: 0, xp: 0, miss: 0, t0: Date.now(), xp0: xpToday() };
  sfx('tap'); renderStep();
}
const bar = (frac, label, combo) => `<div class="lbar"><div class="lrow"><button class="x" data-quit aria-label="Mbyll mësimin">${ic('x')}</button><div class="prog" role="progressbar" aria-label="${esc(label)}" aria-valuenow="${Math.round(frac * 100)}" aria-valuemin="0" aria-valuemax="100"><b style="width:${Math.max(3, Math.round(frac * 100))}%"></b></div><span class="combo${combo >= 2 ? ' on' : ''}">${ic('flame')}${combo || 0}</span></div><div class="llab">${esc(label)}</div></div>`;
function renderStep() {
  const st = L.st[L.s], d = DAYS[L.i], lab = 'Njësia ' + U[d.ui].n + ' · ' + DN[d.di];
  if (st.k === 'quiz') { Q = { items: st.q.slice(), n: 0, total: st.q.length, ok: 0, test: !!st.test, lab, combo: 0 }; renderQ(); return; }
  let h = '';
  if (st.k === 'cards') h = `<h2>Fjalët e reja</h2><p class="lead">Prek secilën kartë për ta dëgjuar. Thuaje me zë dy herë dhe lidhe me një situatë nga jeta jote.</p><div class="cards">${st.w.map((w, j) => `<button class="card" style="--i:${j}" data-say="${esc(w[0])}"><span class="ar">${esc(w[0])}</span>${S.tr ? `<span class="tr">${esc(w[2])}</span>` : ''}<span class="sq">${esc(w[1])}</span><span class="spk">${ic('sound')}</span></button>`).join('')}</div>`;
  if (st.k === 'dialog') { L.lines = st.d.l.map(l => l[1]); h = `<h2>${esc(st.d.t)}</h2><p class="lead">1) Dëgjoje të gjithin pa përkthim. 2) Prek çdo rresht për përkthimin. 3) Lexoje me zë, duke luajtur njërin nga personat.</p><div class="row"><button class="btn sec" data-all>${ic('play')} Dëgjo dialogun</button><button class="btn sec" data-showall>${ic('eye')} Shfaq përkthimet</button></div><div class="dl">${st.d.l.map((l, j) => `<div class="line ${j % 2 ? 'r' : ''}" style="--i:${j}"><span class="who">${esc(l[0])}</span><div class="bub"><div class="ar" data-tog>${esc(l[1])}</div><div class="sq">${esc(l[2])}</div></div><button class="play" data-say="${esc(l[1])}" aria-label="Dëgjo">${ic('sound')}</button></div>`).join('')}</div>`; }
  if (st.k === 'gram') h = `<h2>${esc(st.g.t)}</h2><p class="lead">Lexoje ngadalë. Mbulo kolonën shqip dhe provo t'i kujtosh kuptimet. Pastaj vijnë ushtrimet.</p><div class="gram">${st.g.h}</div>`;
  app.innerHTML = bar(L.s / L.st.length, lab, 0) + `<section class="band lesson"><div class="wrap">${h}</div></section><div class="dock"><div class="din"><button class="btn big full" data-next>Vazhdo</button></div></div>`;
  anim(); scrollTo(0, 0);
}
function renderQ() {
  const it = Q.items[0]; if (!it) return finishQuiz();
  const frac = (L.s + (Q.n / (Q.n + Q.items.length))) / L.st.length;
  let h = '', dock = '';
  if (it.k === 'mcq') h = `<div class="qt">${esc(it.t)}</div><div class="qp ${it.pAr ? 'ar' : ''}">${esc(it.p)}${it.pAr ? ` <button class="play" data-say="${esc(it.p)}" aria-label="Dëgjo">${ic('sound')}</button>` : ''}</div><div class="opts">${it.opts.map((o, j) => `<button class="opt ${it.optAr ? 'ar' : ''}" style="--i:${j}" data-opt="${j}"><kbd>${j + 1}</kbd><span>${esc(o)}</span></button>`).join('')}</div>`;
  if (it.k === 'build') { it.sel = it.sel || []; h = `<div class="qt">Ndërto fjalinë në arabisht · një fjalë është e tepërt</div><div class="qp">${esc(it.p)}</div><div class="ans">${it.sel.map((t, j) => `<button class="tile${j === it.sel.length - 1 && it.pop ? ' pop' : ''}" data-un="${j}">${esc(it.pool[t])}</button>`).join('') || '<span class="hint">Prek fjalët më poshtë sipas radhës</span>'}</div><div class="tiles">${it.pool.map((t, j) => it.sel.includes(j) ? `<span class="tile ghost">${esc(t)}</span>` : `<button class="tile" data-tile="${j}">${esc(t)}</button>`).join('')}</div>`; dock = `<button class="btn big full" data-check ${it.sel.length ? '' : 'disabled'}>Kontrollo</button>`; it.pop = false; }
  if (it.k === 'say') { h = `<div class="qt">Thuaje me zë në arabisht, pastaj shiko përgjigjen</div><div class="qp">${esc(it.p)}</div><div id="rv" class="sayv"><div class="mic">${ic('sound')}</div></div>`; dock = `<button class="btn big full" data-show>E thashë, shfaq përgjigjen</button>`; }
  app.innerHTML = bar(frac, Q.lab, Q.combo) + `<section class="band lesson"><div class="q">${h}</div></section><div class="dock" id="dock"><div class="din">${dock}</div></div><div class="sheet" id="sheet" role="status" aria-live="polite"></div>`;
  if (!it.sel || !it.sel.length) anim();
}
const PRAISE = ['Saktë!', 'Shkëlqyeshëm!', 'Bravo!', 'Mashallah!', 'Përsosur!', 'Vazhdo kështu!', 'Shumë mirë!'];
function feedback(ok, correct, src) {
  const it = Q.items[0]; L.tot++;
  let gain = 0;
  if (ok) { Q.ok++; L.ok++; Q.combo++; gain = 10 + (Q.combo >= 5 ? 5 : 0); L.xp += gain; const before = xpToday(); addXP(gain); persist(); if (before < S.goal && xpToday() >= S.goal) L.goalHit = true; }
  else { Q.combo = 0; L.miss++; if (!Q.test) Q.items.push({ ...it, sel: [], answered: false, opts: it.opts ? shuffle(it.opts) : it.opts }); }
  const combo = ok && Q.combo >= 3 && Q.combo % 1 === 0;
  sfx(ok ? (Q.combo >= 3 && Q.combo % 5 === 0 ? 'combo' : 'ok') : 'no'); buzz(ok ? 12 : [25, 40, 25]);
  if (ok) floatXP(gain, src);
  const cb = app.querySelector('.combo'); if (cb) { cb.innerHTML = ic('flame') + Q.combo; cb.classList.toggle('on', Q.combo >= 2); if (ok && Q.combo >= 2) { cb.classList.remove('bump'); void cb.offsetWidth; cb.classList.add('bump'); } }
  const pg = app.querySelector('.prog b'); if (pg) pg.style.width = Math.max(3, Math.round(((L.s + ((Q.n + 1) / (Q.n + Q.items.length))) / L.st.length) * 100)) + '%';
  const sh = document.getElementById('sheet');
  sh.className = 'sheet on ' + (ok ? 'ok' : 'no');
  sh.innerHTML = `<div class="sin"><div class="smsg"><span class="si">${ic(ok ? 'check' : 'x')}</span><div><b>${ok ? pick(PRAISE) : 'Jo krejt.'}</b>${ok ? (combo ? `<span class="cmb">${ic('flame')} ${Q.combo} radhazi!</span>` : '') : `<span>Përgjigjja e saktë:</span><span class="ca ar">${esc(correct)}</span>${Q.test ? '' : '<span class="again">Do të të dalë sërish në fund.</span>'}`}</div></div><button class="btn big full" data-qn>Vazhdo</button></div>`;
  const d = document.getElementById('dock'); if (d) d.classList.add('hide');
  sh.querySelector('[data-qn]').focus({ preventScroll: true });
}
function finishQuiz() {
  if (Q.test) {
    const pct = Math.round(Q.ok / Q.total * 100), u = U[DAYS[L.i].ui];
    if (pct < PASS) {
      sfx('no');
      app.innerHTML = bar(1, Q.lab, 0) + `<section class="band"><div class="q center fail"><div class="score">${ring(pct, 100, 'big')}<b data-count="${pct}" data-suf="%">0%</b></div><h2>Edhe pak!</h2><p class="lead" style="margin:0 auto 16px">Për ta kaluar testin të duhen ${PASS}%. Përsërit fjalët te Fjalori dhe gramatikën, pastaj provo sërish. Nuk ka afat.</p><div class="row" style="justify-content:center"><button class="btn big" data-go="${L.i}">Provo sërish</button><button class="btn sec" data-home>Kthehu</button></div></div></section>`;
      countUp(); return;
    }
    S.scores['u' + u.n] = Math.max(S.scores['u' + u.n] || 0, pct); L.pct = pct;
  }
  L.s++; if (L.s < L.st.length) return renderStep();
  complete();
}
let AFTER = null;
function complete() {
  const d = DAYS[L.i], u = U[d.ui], first = !S.done[d.id];
  if (first) S.done[d.id] = today();
  const add = d.di === 0 ? u.A : d.di === 3 ? u.B : [];
  add.forEach(w => { if (!S.cards[w[0]]) S.cards[w[0]] = { sq: w[1], b: 0, due: dayAt(1) }; });
  const perfect = L.tot > 0 && L.miss === 0, bonus = (first ? 20 : 5) + (perfect ? 10 : 0);
  addXP(bonus); if (L.xp0 < S.goal && xpToday() >= S.goal) L.goalHit = true;
  const act = activity(), nb = checkBadges(); save();
  results({ title: d.di === 6 ? `Njësia ${u.n} u krye!` : 'Mësimi u krye!', xp: L.xp + bonus, acc: L.tot ? Math.round(L.ok / L.tot * 100) : 100, ms: Date.now() - L.t0, perfect, words: add.length, goalHit: L.goalHit, act, nb, pct: L.pct });
}
const mmss = ms => { const s = Math.round(ms / 1000); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
function results(r) {
  AFTER = r; L = Q = R = null; hush();
  document.body.classList.add('inlesson'); top.innerHTML = '';
  app.innerHTML = `<section class="donescr"><div class="wrap center">
   <p class="display ar pop">أَحْسَنْتَ!</p><h1>${esc(r.title)}</h1>
   <div class="rs">
    <div class="rtile xp"><span>${ic('bolt')} XP</span><b data-count="${r.xp}">0</b></div>
    <div class="rtile ac"><span>${ic('target')} Saktësia</span><b data-count="${r.acc}" data-suf="%">0%</b></div>
    <div class="rtile tm"><span>${ic('clock')} Koha</span><b>${mmss(r.ms)}</b></div>
   </div>
   <div class="chipsrow">${r.perfect ? `<span class="pill gold">${ic('gem')} Pa asnjë gabim · +10 XP</span>` : ''}${r.goalHit ? `<span class="pill ok">${ic('target')} Qëllimi i ditës u arrit!</span>` : ''}${r.words ? `<span class="pill">${ic('book')} ${r.words} fjalë të reja në përsëritje</span>` : ''}${r.pct ? `<span class="pill ok">${ic('trophy')} Testi: ${r.pct}%</span>` : ''}</div>
   ${r.nb.length ? `<div class="newb"><h3>Medalje e re!</h3>${r.nb.map((b, j) => `<div class="bd got pop" style="--i:${j}"><i>${ic(b[3])}</i><b>${esc(b[1])}</b><span>${esc(b[2])}</span></div>`).join('')}</div>` : ''}
  </div></section><div class="dock"><div class="din"><button class="btn big full" data-after>Vazhdo</button></div></div>`;
  anim(); countUp(); sfx('win'); buzz([15, 60, 15]); setTimeout(() => confetti(), 150);
}
function streakScreen(a) {
  document.body.classList.add('inlesson'); top.innerHTML = '';
  const msg = a.used ? `${ic('snow')} Ngrirja e mbrojti serinë tënde për ${a.used} ${a.used === 1 ? 'ditë' : 'ditë'}.` : a.earned ? `${ic('snow')} Fitove një ngrirje! Do ta mbrojë serinë nëse mungon një ditë.` : a.n === 1 ? 'Flaka e parë u ndez. Kthehu nesër që të rritet!' : a.n % 7 === 0 ? 'Një javë tjetër e plotë. Mashallah!' : 'Kthehu nesër që të mos shuhet flaka.';
  app.innerHTML = `<section class="donescr streaks"><div class="wrap center">
   <div class="flamewrap">${FLAME}<div class="sparks">${'<i></i>'.repeat(10)}</div></div>
   <div class="sn"><b data-count="${a.n}" data-from="${a.prev}">${a.prev}</b></div>
   <h1>${a.n === 1 ? 'ditë radhazi!' : 'ditë radhazi!'}</h1>
   ${week()}
   <p class="lead" style="margin:16px auto 0">${msg}</p>
   ${a.n >= (S.best || 0) && a.n > 1 ? `<p><span class="pill gold">${ic('crown')} Rekordi yt i ri!</span></p>` : ''}
  </div></section><div class="dock"><div class="din"><button class="btn big full fire" data-home>Vazhdo</button></div></div>`;
  anim();
  setTimeout(() => { countUp(); sfx('fire'); buzz([10, 30, 10, 30, 40]); const n = app.querySelector('.sn'); if (n) n.classList.add('bump'); const w = app.querySelector('.wd.now'); if (w) w.classList.add('ignite'); }, reduce ? 0 : 650);
}

/* ---------- PËRSËRITJA ---------- */
function startReview() {
  const d = shuffle(due()).slice(0, 30);
  if (!d.length) { toast('Sot nuk ke fjalë për përsëritje.'); return; }
  document.body.classList.add('inlesson'); top.innerHTML = '';
  R = { list: d, i: 0, shown: false, dir: d.map(() => Math.random() < .5), xp: 0, ok: 0, t0: Date.now(), xp0: xpToday() };
  sfx('tap'); renderR();
}
function renderR() {
  if (R.i >= R.list.length) {
    const goalHit = R.xp0 < S.goal && xpToday() >= S.goal, act = activity(), nb = checkBadges(); save();
    return results({ title: 'Përsëritja u krye!', xp: R.xp, acc: Math.round(R.ok / R.list.length * 100), ms: Date.now() - R.t0, perfect: false, words: 0, goalHit, act, nb });
  }
  const [ar, c] = R.list[R.i], arFirst = R.dir[R.i];
  app.innerHTML = bar(R.i / R.list.length, 'Përsëritja e ditës · ' + (R.i + 1) + '/' + R.list.length, 0) + `<section class="band lesson"><div class="q center">
   <div class="qt">${arFirst ? 'Çfarë do të thotë?' : 'Si thuhet në arabisht?'}</div>
   <div class="fc" data-flip><div class="fci">
    <div class="face front"><span class="${arFirst ? 'ar big' : 'big'}">${esc(arFirst ? ar : c.sq)}</span><small>Prek për ta kthyer</small></div>
    <div class="face back"><span class="${arFirst ? 'big' : 'ar big'}">${esc(arFirst ? c.sq : ar)}</span><small class="${arFirst ? 'ar' : ''}">${esc(arFirst ? ar : c.sq)}</small></div>
   </div></div></div></section>
   <div class="dock"><div class="din" id="ra"><button class="btn big full" data-flip>Shfaq përgjigjen</button></div></div>`;
  anim();
}
function flipR() {
  if (!R || R.shown) return;
  R.shown = true; sfx('tap');
  const fc = app.querySelector('.fc'); if (fc) fc.classList.add('on');
  speak(R.list[R.i][0]);
  document.getElementById('ra').innerHTML = `<div class="two"><button class="btn big no" data-r="0">${ic('x')} Nuk e dija</button><button class="btn big yes" data-r="1">${ic('check')} E dija</button></div>`;
}

/* ---------- NGJARJET ---------- */
let resetArm = false;
function quitAsk() {
  const busy = (Q && (Q.n > 0 || Q.items[0] && Q.items[0].answered)) || (L && L.s > 0) || (R && R.i > 0);
  if (!busy) return setTab('home');
  let sh = document.getElementById('sheet');
  if (!sh) { sh = document.createElement('div'); sh.id = 'sheet'; sh.className = 'sheet'; app.appendChild(sh); }
  sh.className = 'sheet on ask';
  sh.innerHTML = `<div class="sin"><div class="smsg"><span class="si">${ic('flame')}</span><div><b>Mos u dorëzo tani!</b><span>Nëse del, progresi i këtij mësimi humbet.</span></div></div><div class="two"><button class="btn big sec" data-home>Dil</button><button class="btn big" data-stay>Vazhdo mësimin</button></div></div>`;
}
app.addEventListener('click', e => {
  const t = e.target.closest('button,[data-tog],[data-flip]'); if (!t) return;
  const ds = t.dataset;
  if (ds.say !== undefined) { speak(ds.say); t.classList.remove('said'); void t.offsetWidth; t.classList.add('said'); return; }
  if (ds.tog !== undefined) { t.closest('.line').classList.toggle('open'); return; }
  if (ds.showall !== undefined) { app.querySelectorAll('.line').forEach(l => l.classList.add('open')); return; }
  if (ds.go !== undefined) return startLesson(+ds.go);
  if (ds.home !== undefined) return setTab('home');
  if (ds.quit !== undefined) return quitAsk();
  if (ds.stay !== undefined) { const s = document.getElementById('sheet'); if (s) { s.className = 'sheet'; } return; }
  if (ds.rev !== undefined) return startReview();
  if (ds.after !== undefined) { const a = AFTER && AFTER.act; AFTER = null; return a && a.first ? streakScreen(a) : setTab('home'); }
  if (ds.next !== undefined) { hush(); sfx('tap'); L.s++; return renderStep(); }
  if (ds.all !== undefined) return playAll(L.lines || []);
  if (ds.dm !== undefined) { dmode = ds.dm; return dict(); }
  if (ds.guest !== undefined) { setAuth({ guest: true }); return setTab('home'); }
  if (ds.auth !== undefined) return authView(ds.auth);
  if (ds.amode !== undefined) { const f = document.getElementById('authf'); return authView(ds.amode, f && f.u.value.trim()); }
  if (ds.eye !== undefined) { const i = t.parentNode.querySelector('input'); i.type = i.type === 'password' ? 'text' : 'password'; t.classList.toggle('on', i.type === 'text'); return; }
  if (ds.logout !== undefined) return logout(t);
  if (ds.themePick !== undefined) { S.theme = ds.themePick; save(); applyTheme(); sfx('tap'); return me(); }
  if (ds.goal !== undefined) { S.goal = +ds.goal; save(); sfx('tap'); return me(); }
  if (t.id === 'reset') {
    if (!resetArm) { resetArm = true; t.textContent = 'Kliko sërish: fshihet përgjithmonë'; return; }
    resetArm = false; const th = S.theme; S = fresh(); S.theme = th; S.at = Date.now(); persist();
    if (ME()) push(true);
    toast('Progresi u fshi.'); return setTab('home');
  }
  if (ds.opt !== undefined && Q) {
    const it = Q.items[0]; if (it.answered) return; it.answered = true;
    const ok = it.opts[+ds.opt] === it.a;
    app.querySelectorAll('.opt').forEach(b => { b.disabled = true; const v = it.opts[+b.dataset.opt]; if (v === it.a) b.classList.add('right'); else if (b === t) b.classList.add('wrong'); else b.classList.add('dim'); });
    if (it.pAr || it.optAr) setTimeout(() => speak(it.pAr ? it.p : it.a), 250);
    return feedback(ok, it.a, t);
  }
  if (ds.tile !== undefined) { const it = Q.items[0]; if (it.answered) return; it.sel.push(+ds.tile); it.pop = true; sfx('tap'); return renderQ(); }
  if (ds.un !== undefined) { const it = Q.items[0]; if (it.answered) return; it.sel.splice(+ds.un, 1); return renderQ(); }
  if (ds.check !== undefined) {
    const it = Q.items[0]; if (it.answered) return; it.answered = true;
    const s = it.sel.map(j => it.pool[j]).join(' '), c = it.tiles.join(' ');
    app.querySelectorAll('.tile,[data-check]').forEach(b => b.disabled = true);
    const ans = app.querySelector('.ans'); if (ans) ans.classList.add(s === c ? 'right' : 'wrong');
    setTimeout(() => speak(c), 250); return feedback(s === c, c, ans);
  }
  if (ds.show !== undefined) {
    const it = Q.items[0];
    document.getElementById('rv').innerHTML = `<div class="reveal ar pop">${esc(it.a)}</div><button class="play" data-say="${esc(it.a)}" aria-label="Dëgjo">${ic('sound')}</button>`;
    document.querySelector('#dock .din').innerHTML = `<div class="two"><button class="btn big no" data-self="0">${ic('x')} Gabova</button><button class="btn big yes" data-self="1">${ic('check')} E thashë saktë</button></div>`;
    speak(it.a); return;
  }
  if (ds.self !== undefined) { const it = Q.items[0]; if (it.answered) return; it.answered = true; return feedback(ds.self === '1', it.a, t); }
  if (ds.qn !== undefined) { hush(); Q.items.shift(); Q.n++; return renderQ(); }
  if (ds.flip !== undefined) return flipR();
  if (ds.r !== undefined && R) {
    const c = S.cards[R.list[R.i][0]], k = ds.r === '1';
    if (k) { c.b = Math.min(c.b + 1, INT.length - 1); c.due = dayAt(INT[c.b]); R.ok++; } else { c.b = 0; c.due = dayAt(1); }
    const g = k ? 5 : 2; R.xp += g; addXP(g); save(); floatXP(g, t); sfx(k ? 'ok' : 'tap'); buzz(8);
    R.i++; R.shown = false; return setTimeout(renderR, reduce ? 0 : 160);
  }
});
app.addEventListener('submit', async e => {
  e.preventDefault(); const f = e.target;
  if (f.id === 'authf') return doAuth(f);
  const err = f.querySelector('.err'), b = f.querySelector('[type=submit]');
  const run = async (body, ok) => { err.textContent = ''; b.disabled = true; b.classList.add('busy'); try { await api('auth', { method: 'POST', body }); ok(); } catch (x) { err.textContent = x.message; sfx('no'); } finally { b.disabled = false; b.classList.remove('busy'); } };
  if (f.id === 'pwf') { if (f.np.value.length < 6) { err.textContent = 'Fjalëkalimi i ri duhet të ketë së paku 6 shenja.'; return; } return run({ action: 'password', password: f.p.value, newPassword: f.np.value }, () => { toast(`${ic('check')} Fjalëkalimi u ndryshua.`, 'good'); f.reset(); f.closest('details').open = false; }); }
  if (f.id === 'delf') return run({ action: 'delete', password: f.p.value }, () => { clearAccount(); toast('Llogaria u fshi.'); });
});
app.addEventListener('input', e => { if (e.target.id === 'dq') { dq = e.target.value; renderWords(); } });
app.addEventListener('change', e => {
  const id = e.target.id;
  if (id === 'tr') { S.tr = e.target.checked; save(); }
  if (id === 'free') { S.free = e.target.checked; save(); }
  if (id === 'snd') { S.sound = e.target.checked; save(); sfx('ok'); }
  if (id === 'tr' || id === 'free' || id === 'snd') buzz(8);
});
document.addEventListener('keydown', e => {
  if (!document.body.classList.contains('inlesson') || e.target.matches('input,textarea')) return;
  const n = +e.key;
  if (n >= 1 && n <= 4) { const b = app.querySelectorAll('.opt:not([disabled])')[n - 1]; if (b) { b.click(); e.preventDefault(); } return; }
  if (e.key === ' ' && R && !R.shown) { flipR(); e.preventDefault(); return; }
  if (e.key === 'Escape') { if (L || R) quitAsk(); return; }
  if (e.key === 'Enter') { const b = app.querySelector('[data-qn],[data-next],[data-after],#ra [data-flip],[data-check]:not([disabled])') || (document.querySelector('.streaks') && app.querySelector('[data-home]')); if (b && document.activeElement !== b) { b.click(); e.preventDefault(); } }
});

/* ---------- FILLIMI ---------- */
applyTheme();
const h0 = location.hash.slice(1);
setTab(VIEWS[h0] ? h0 : 'home');
if (ME()) pull();
addEventListener('hashchange', () => { const h = location.hash.slice(1); if (VIEWS[h] && h !== tab && !document.body.classList.contains('inlesson')) setTab(h); });
setInterval(() => { if (tab === 'me') paintSync(); }, 30000);
if ('serviceWorker' in navigator && location.protocol === 'https:') addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}));
})();
