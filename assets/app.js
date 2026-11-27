/* Mëso Arabisht — logjika e aplikacionit (pa framework, pa build) */
(() => {
'use strict';
const DN =['Fjalor i ri', 'Dialogu 1', 'Gramatika', 'Fjalor + Dialogu 2', 'Përsëritje e përzier', 'Fol dhe ndërto', 'Testi i javës'];
const INT = [1, 2, 4, 7, 15, 30, 60];
const PASS = 80;
const KEY = 'bayna-sq-v1', AKEY = 'bayna-auth', CKEY = 'bayna-cur';
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- GJENDJA ---------- */
const fresh = () => ({ done: {}, cards: {}, log: {}, xp: {}, scores: {}, lv: {}, badges: {}, frz: {}, freezes: 0, frzAt: '', best: 0, free: false, tr: true, lb: true, goal: 100, sound: true, theme: 'auto', at: 0 });
const OBJS = ['done', 'cards', 'log', 'xp', 'scores', 'lv', 'badges', 'frz'];
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
  return norm({ ...nw, done: minD(a.done, b.done), cards, log: maxO(a.log, b.log), xp: maxO(a.xp, b.xp), scores: maxO(a.scores, b.scores), lv: maxO(a.lv, b.lv),
    badges: minD(a.badges, b.badges), frz: { ...a.frz, ...b.frz }, best: Math.max(a.best || 0, b.best || 0), at: Math.max(a.at || 0, b.at || 0) });
}

/* ---------- PROGRAMI: NIVELET DHE NJËSITË ----------
   Vjen nga serveri (/api/curriculum, i rregulluar nga administratori) ose, nëse s'ka, nga assets/data.js. */
const arrs = (x, m) => Array.isArray(x) ? x.filter(Boolean) : [];
const fixD = d => ({ t: (d && d.t) || '', l: arrs(d && d.l), q: arrs(d && d.q).filter(q => q.p && Array.isArray(q.o) && q.o.length > 1) });
const fixU = u => ({ ...u, n: +u.n, ar: u.ar || '', sq: u.sq || 'Njësi', A: arrs(u.A), B: arrs(u.B), D1: fixD(u.D1), D2: fixD(u.D2),
  G: { t: (u.G && u.G.t) || '', h: (u.G && u.G.h) || '', ex: fixD({ q: u.G && u.G.ex }).q }, build: arrs(u.build).filter(b => Array.isArray(b[1]) && b[1].length), say: arrs(u.say) });
function defaultCur() {
  const by = {}; (window.UNITS || []).forEach(u => { by[u.n] = u; });
  const ls = window.LEVELS || [{ id: 'L1', t: 'Niveli 1', units: (window.UNITS || []).map(u => u.n) }];
  return { v: 0, levels: ls.map(l => ({ id: l.id, t: l.t, d: l.d || '', pass: l.pass || PASS, m: l.m || 'dialog', units: (l.units || []).map(n => by[n]).filter(Boolean) })) };
}
function fixCur(c) {
  try {
    if (!c || !Array.isArray(c.levels) || !c.levels.length) return null;
    return { v: +c.v || 0, by: c.by || '', levels: c.levels.map((l, i) => ({ id: String(l.id || 'L' + (i + 1)), t: l.t || 'Nivel', d: l.d || '', pass: +l.pass || PASS, m: MODES_OK.includes(l.m) ? l.m : 'dialog', units: arrs(l.units).map(fixU) })) };
  } catch (e) { return null; }
}
const MODES_OK = ['dialog', 'read', 'text'];
let CUR, LV, U, UL, LVI, DAYS, ALLW, PENDING = null;
function useCur(c) {
  CUR = fixCur(c) || defaultCur();
  LV = CUR.levels; U = []; UL = []; LVI = LV.map(() => []);
  LV.forEach((l, li) => l.units.forEach(u => { LVI[li].push(U.length); UL.push(li); U.push(u); }));
  DAYS = []; U.forEach((u, ui) => DN.forEach((n, di) => DAYS.push({ ui, di, id: 'u' + u.n + 'd' + (di + 1) })));
  ALLW = U.flatMap((u, ui) => u.A.concat(u.B).map(w => ({ ar: w[0], sq: w[1], tr: w[2], n: u.n, no: ui + 1 })));
}
useCur(load(CKEY));
/* sistemi i çdo niveli: si në «العربية بين يديك», mënyra e mësimit ndryshon nga niveli në nivel */
const MODES = {
  dialog: { t: 'Dialogë', d: 'Fjalor, dialogë të shkurtër dhe gramatikë bazë. Me transliterim.', tr: true,
    days: DN },
  read: { t: 'Dialog + lexim', d: 'Një dialog dhe një tekst leximi në çdo njësi. Transliterimi vetëm te fjalët e reja.', tr: true,
    days: ['Fjalor i ri', 'Dialogu', 'Gramatika', 'Fjalor + Leximi', 'Përsëritje e përzier', 'Shkrim dhe të folur', 'Testi i javës'] },
  text: { t: 'Tekste dhe nahv', d: 'Dy tekste leximi, gramatikë (nahv) dhe shprehje. Pa transliterim.', tr: false,
    days: ['Fjalor i ri', 'Teksti i leximit', 'Gramatika (nahv)', 'Fjalor + Teksti 2', 'Përsëritje e përzier', 'Shprehje dhe ndërtim', 'Testi i javës'] },
};
const lvMode = li => (LV[li] && MODES[LV[li].m]) ? LV[li].m : 'dialog';
const uMode = ui => lvMode(UL[ui]);
const dname = (ui, di) => MODES[uMode(ui)].days[di];
function setCur(c) {
  if (document.body.classList.contains('inlesson')) { PENDING = { c }; return; }
  useCur(c);
  try { c ? localStorage.setItem(CKEY, JSON.stringify(c)) : localStorage.removeItem(CKEY); } catch (e) {}
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
  ['lv1', 'Niveli i parë', 'Kalove testin e një niveli', 'trophy', () => Object.keys(S.lv).length >= 1],
  ['lv2', 'Dy nivele', 'Kalove testet e dy niveleve', 'crown', () => Object.keys(S.lv).length >= 2],
  ['perfect', 'Pa asnjë gabim', '100% në një test', 'gem', () => Object.values(S.scores).concat(Object.values(S.lv)).some(v => v >= 100)],
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
/* nivelet: hapet niveli i parë; tjetri hapet kur kalon testin e nivelit para tij.
   Kush di më shumë mund ta bëjë testin e nivelit direkt dhe të kalojë te tjetri. */
const lvPassed = li => !!(LV[li] && S.lv[LV[li].id]);
const lvDays = li => LVI[li].flatMap(ui => DN.map((_, di) => ui * 7 + di));
const lvStarted = li => lvDays(li).some(i => S.done[DAYS[i].id]);
const lvOpen = li => li === 0 || lvPassed(li - 1) || lvPassed(li) || lvStarted(li);
const lvAllDone = li => { const ds = lvDays(li); return ds.length > 0 && ds.every(i => S.done[DAYS[i].id]); };
const lvLast = li => lvDays(li).map(i => S.done[DAYS[i].id] || '').sort().pop() || '';
const lvReady = li => lvOpen(li) && lvAllDone(li) && (S.free || lvPassed(li) || lvLast(li) < today());
const lvPass = li => LV[li].pass || PASS;
const lvName = li => 'Niveli ' + (li + 1);
function unlocked(i) {
  const d = DAYS[i]; if (!d) return false;
  const li = UL[d.ui];
  if (!lvOpen(li)) return false;
  if (lvPassed(li) || i === LVI[li][0] * 7) return true;
  const p = S.done[DAYS[i - 1].id]; return !!p && (S.free || p < today());
}
/* çfarë vjen tani: {k:'day',i} | {k:'lv',li} (testi i nivelit) | {k:'soon',li} (niveli pa përmbajtje) | null (gjithçka u krye) */
function nextUp() {
  for (let li = 0; li < LV.length; li++) {
    if (lvPassed(li)) continue;
    if (!LVI[li].length) return { k: 'soon', li };
    const i = lvDays(li).find(i => !S.done[DAYS[i].id]);
    return i !== undefined ? { k: 'day', i, li } : { k: 'lv', li };
  }
  return null;
}
const curIdx = () => { const n = nextUp(); return n && n.k === 'day' ? n.i : -1; };
const due = () => Object.entries(S.cards).filter(([, c]) => c.due <= today());
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
  share: '<path d="M12 3v12M8 7l4-4 4 4"/><path d="M7 10H6a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2h-1"/>',
  addsq: '<rect x="4" y="4" width="16" height="16" rx="4"/><path d="M12 8v8M8 12h8"/>',
  phone: '<rect x="6" y="2" width="12" height="20" rx="3"/><path d="M11 18h2"/>',
  dots: '<circle cx="5" cy="12" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="19" cy="12" r="1.3"/>',
  compass: '<circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2 5-5 2 2-5z"/>',
  link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  up: '<path d="M12 19V5M6 11l6-6 6 6"/>',
  down: '<path d="M12 5v14M6 13l6 6 6-6"/>',
  trash: '<path d="M4 7h16M10 11v6M14 11v6M9 7V4h6v3M6 7l1 13h10l1-13"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="m13.5 6.5 4 4"/>',
  layers: '<path d="m12 3 9 5-9 5-9-5z"/><path d="m3 13 9 5 9-5"/>',
  skip: '<path d="m5 5 8 7-8 7zM15 5v14"/>',
  dl: '<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>',
  ul: '<path d="M12 15V4M7 9l5-5 5 5M5 20h14"/>',
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
    loadGroups(true);
    if (ME() && !!j.admin !== !!ME().a) { setAuth({ ...ME(), a: !!j.admin }); if (tab === 'admin' && !j.admin) tab = 'home'; }
    lastSync = Date.now(); syncState = 'ok'; dirty = true; push();
    if (!document.body.classList.contains('inlesson') && !document.body.classList.contains('bare')) refresh();
  } catch (e) { syncState = 'off'; if (e.status === 401) expired(); }
  paintSync();
}
/* programi nga serveri; nëse s'ka lidhje mbetet ai i ruajturi në pajisje */
let curAt = 0;
async function fetchCur() {
  try {
    const j = await api('curriculum'); curAt = Date.now();
    const v = j.cur ? +j.cur.v || 0 : 0;
    if (v === CUR.v && !PENDING) return;
    setCur(j.cur);
    if (!document.body.classList.contains('inlesson') && !document.body.classList.contains('bare') && !(tab === 'admin' && AE)) refresh();
  } catch (e) {}
}
function expired() { const u = ME() && ME().u; setAuth(null); toast('Seanca skadoi. Hyr sërish që të sinkronizohet progresi.'); if (!document.body.classList.contains('inlesson')) authView('login', u); }
addEventListener('online', () => push());
document.addEventListener('visibilitychange', () => {
  if (!ME()) return;
  if (document.visibilityState === 'hidden' && dirty) { clearTimeout(pushT); dirty = false; api('progress', { method: 'PUT', keepalive: true, body: { data: S } }).catch(() => { dirty = true; }); }
  if (document.visibilityState === 'visible' && Date.now() - lastSync > 60000) pull();
  if (document.visibilityState === 'visible' && Date.now() - curAt > 60000) fetchCur();
});
const ago = t => { const s = Math.round((Date.now() - t) / 1000); return s < 10 ? 'tani' : s < 60 ? 'para ' + s + ' sekondash' : s < 3600 ? 'para ' + Math.round(s / 60) + ' min' : 'para ' + Math.round(s / 3600) + ' orësh'; };
function paintSync() {
  const el = document.getElementById('sync'); if (!el) return;
  el.className = 'sync ' + syncState;
  el.innerHTML = ic('cloud') + (syncState === 'busy' ? 'Duke ruajtur…' : syncState === 'off' ? 'Pa lidhje: do të ruhet kur të kthehet interneti' : lastSync ? 'I ruajtur në llogari · ' + ago(lastSync) : 'I ruajtur në llogari');
}

/* ---------- LOGOJA: merr ngjyrat e temës aktive ---------- */
const GLYPH = 'M287.3 200.8L277.9 231.3Q264.2 237.0 251.3 244.4Q238.4 251.8 228.4 260.7Q218.3 269.6 212.2 279.8Q206.1 290.1 206.1 301.3L206.1 301.3Q206.1 310.2 212.8 316.8Q219.5 323.4 233.3 327.7Q247.1 332.0 268.3 334.1Q289.6 336.2 318.6 336.2L318.6 336.2L319.9 341.5Q313.7 344.3 305.1 347.8Q296.5 351.3 287.3 354.5Q278.2 357.7 269.7 359.8Q261.3 362 255.6 362L255.6 362Q242.3 362 232.8 359.5Q223.3 357.0 216.7 352.6Q210.2 348.3 206.2 342.6Q202.2 336.9 200.1 330.4Q198.0 324.0 197.3 317.3Q196.6 310.5 196.6 304.2L196.6 304.2Q196.6 292.7 198.8 283.2Q201.1 273.8 204.4 266.2Q207.7 258.6 211.5 253.0Q215.4 247.4 218.6 243.6L218.6 243.6Q214.0 241.2 209.2 237.9Q204.5 234.5 200.7 230.4Q196.9 226.4 194.5 221.8Q192.1 217.3 192.1 212.6L192.1 212.6Q192.1 204.2 195.4 195.3Q198.7 186.4 203.9 179.0Q209.1 171.5 215.4 166.8Q221.7 162.0 227.9 162.0L227.9 162.0Q233.5 162.0 238.7 163.8Q244.0 165.5 248.6 168.4Q253.1 171.3 257.1 175.0Q261.0 178.8 263.9 182.8L263.9 182.8L261.3 185.6Q259.6 184.7 257.1 183.7Q254.7 182.8 251.9 181.9Q249.2 181.1 246.4 180.5Q243.6 180.0 241.1 180.0L241.1 180.0Q237.8 180.0 233.1 180.9Q228.3 181.9 223.3 183.7Q218.2 185.4 213.4 187.8Q208.5 190.2 205.2 192.9L205.2 192.9Q205.2 196.2 207.1 199.6Q209.1 203.0 212.1 205.9Q215.1 208.8 219.0 211.4Q222.8 214.0 226.6 215.9Q230.4 217.7 233.8 218.7Q237.3 219.8 239.4 219.8L239.4 219.8Q244.1 219.8 247.9 218.5L247.9 218.5L287.3 200.8Z';
/* c = { h1, h2, g, on } ; pa c përdor variablat CSS (logoja brenda faqes ndryshon vetë me temën) */
const logoSvg = (c, id) => { id = id || 'lg'; c = c || { h1: 'var(--hero1)', h2: 'var(--hero2)', g: 'var(--gold)', on: 'var(--onhero)' };
  const sq = '<rect x="-131.5" y="-131.5" width="263" height="263" rx="14"/>';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><defs><linearGradient id="${id}b" x1="0" y1="0" x2="1" y2="1"><stop offset="0" style="stop-color:${c.h2}"/><stop offset="1" style="stop-color:${c.h1}"/></linearGradient><radialGradient id="${id}l" cx=".5" cy=".38" r=".6"><stop offset="0" stop-color="#fff" stop-opacity=".2"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient></defs>`
    + `<rect width="512" height="512" rx="112" style="fill:url(#${id}b)"/><rect width="512" height="512" rx="112" fill="url(#${id}l)"/>`
    + `<g transform="translate(256 256)" fill="none" stroke-width="11" stroke-linejoin="round" style="stroke:${c.g}">${sq}<g transform="rotate(45)">${sq}</g></g>`
    + `<circle cx="256" cy="256" r="124" fill="#000" fill-opacity=".28"/><path d="${GLYPH}" style="fill:${c.on}"/></svg>`; };
let favLink = null;
function themeFavicon() {
  try {
    const cs = getComputedStyle(document.documentElement), v = n => cs.getPropertyValue(n).trim();
    const c = { h1: v('--hero1') || '#0f4c5c', h2: v('--hero2') || '#16707f', g: v('--gold') || '#f4b13e', on: v('--onhero') || '#f6f2ea' };
    if (!favLink) { document.querySelectorAll('link[rel=icon]').forEach(l => l.remove()); favLink = document.createElement('link'); favLink.rel = 'icon'; favLink.type = 'image/svg+xml'; document.head.appendChild(favLink); }
    favLink.href = 'data:image/svg+xml,' + encodeURIComponent(logoSvg(c, 'f'));
  } catch (e) {}
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
  themeFavicon();
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

/* ---------- MOTIVIMI: thënie nga selefi dhe dijetarët ---------- */
const MOTIV = [
  { k: 'Gjuha', ar: 'تَعَلَّمُوا الْعَرَبِيَّةَ فَإِنَّهَا مِنْ دِينِكُمْ', sq: 'Mësoni arabishten, sepse ajo është pjesë e fesë suaj.', by: 'Umer ibn el-Hattabi (r.a.)' },
  { k: 'Gjuha', ar: 'تَعَلَّمُوا الْعَرَبِيَّةَ فَإِنَّهَا تُثَبِّتُ الْعَقْلَ وَتَزِيدُ فِي الْمُرُوءَةِ', sq: 'Mësoni arabishten, sepse ajo e forcon mendjen dhe e shton fisnikërinë.', by: 'Umer ibn el-Hattabi (r.a.)' },
  { k: 'Gjuha', ar: 'تَفَقَّهُوا فِي السُّنَّةِ، وَتَفَقَّهُوا فِي الْعَرَبِيَّةِ، وَأَعْرِبُوا الْقُرْآنَ فَإِنَّهُ عَرَبِيٌّ', sq: 'Kuptojeni mirë Sunnetin, kuptojeni mirë arabishten dhe lexojeni Kuranin me i‘rab të saktë, sepse ai është arab.', by: 'Umer (r.a.), në letrën drejtuar Ebu Musës' },
  { k: 'Gjuha', ar: 'تَعَلَّمُوا اللَّحْنَ وَالْفَرَائِضَ وَالسُّنَنَ كَمَا تَعَلَّمُونَ الْقُرْآنَ', sq: 'Mësoni gjuhën e saktë, ndarjen e trashëgimisë dhe sunnetet, ashtu siç e mësoni Kuranin.', by: 'Umer ibn el-Hattabi (r.a.)' },
  { k: 'Gjuha', ar: 'تَعَلَّمُوهَا، فَإِنَّ الرَّجُلَ يَقْرَأُ الْآيَةَ فَيَعْيَى بِوَجْهِهَا فَيَهْلِكُ فِيهَا', sq: 'E pyetën për mësimin e arabishtes dhe tha: Mësojeni, sepse njeriu e lexon ajetin, nuk ia gjen kuptimin dhe shkatërrohet në të.', by: 'El-Hasen el-Basri' },
  { k: 'Gjuha', ar: 'مَا جَهِلَ النَّاسُ وَلَا اخْتَلَفُوا إِلَّا لِتَرْكِهِمْ لِسَانَ الْعَرَبِ', sq: 'Njerëzit nuk ranë në padije dhe në përçarje, veçse kur e lanë gjuhën e arabëve.', by: 'Imam Shafiu' },
  { k: 'Gjuha', ar: 'فَإِنَّ اللُّغَةَ الْعَرَبِيَّةَ مِنَ الدِّينِ، وَمَعْرِفَتُهَا فَرْضٌ وَاجِبٌ', sq: 'Gjuha arabe është pjesë e fesë dhe njohja e saj është detyrë, sepse Kurani dhe Sunneti nuk kuptohen pa të.', by: 'Ibn Tejmije, «Iktida es-Sirat el-Mustekim»' },
  { k: 'Gjuha', ar: 'إِنَّا أَنزَلْنَاهُ قُرْآنًا عَرَبِيًّا لَّعَلَّكُمْ تَعْقِلُونَ', sq: 'Ne e zbritëm atë Kuran në arabisht, që ju ta kuptoni.', by: 'Kurani, Jusuf 12:2' },
  { k: 'Dija', ar: 'لَا يُسْتَطَاعُ الْعِلْمُ بِرَاحَةِ الْجِسْمِ', sq: 'Dija nuk arrihet me rehatinë e trupit.', by: 'Jahja ibn Ebi Kethir (te «Sahihu» i Muslimit)' },
  { k: 'Dija', ar: 'ذَكَاءٌ وَحِرْصٌ وَاجْتِهَادٌ وَبُلْغَةٌ ... وَصُحْبَةُ أُسْتَاذٍ وَطُولُ زَمَانِ', sq: 'Dijen s’e arrin pa gjashtë gjëra: zgjuarsi, zell, përpjekje, mjete jetese, shoqërimin e mësuesit dhe kohë të gjatë.', by: 'Imam Shafiu' },
  { k: 'Dija', ar: 'أَحَبُّ الْأَعْمَالِ إِلَى اللهِ أَدْوَمُهَا وَإِنْ قَلَّ', sq: 'Veprat më të dashura te Allahu janë ato më të vazhdueshmet, edhe nëse janë të pakta.', by: 'Pejgamberi ﷺ (Buhariu dhe Muslimi)' },
  { k: 'Koha', ar: 'مَا نَدِمْتُ عَلَى شَيْءٍ نَدَمِي عَلَى يَوْمٍ غَرَبَتْ شَمْسُهُ نَقَصَ فِيهِ أَجَلِي وَلَمْ يَزْدَدْ فِيهِ عَمَلِي', sq: 'Për asgjë s’jam penduar si për një ditë që i perëndoi dielli: m’u pakësua jeta, e nuk m’u shtua vepra.', by: 'Abdullah ibn Mes‘udi (r.a.)' },
  { k: 'Koha', ar: 'يَا ابْنَ آدَمَ، إِنَّمَا أَنْتَ أَيَّامٌ، كُلَّمَا ذَهَبَ يَوْمٌ ذَهَبَ بَعْضُكَ', sq: 'O bir i Ademit, ti je vetëm disa ditë; sa herë që shkon një ditë, shkon një pjesë prej teje.', by: 'El-Hasen el-Basri' },
  { k: 'Gara', ar: 'وَفِي ذَٰلِكَ فَلْيَتَنَافَسِ الْمُتَنَافِسُونَ', sq: 'E për këtë le të garojnë garuesit.', by: 'Kurani, El-Mutaffifin 83:26' },
  { k: 'Gara', ar: 'فَاسْتَبِقُوا الْخَيْرَاتِ', sq: 'Garoni në punë të mira.', by: 'Kurani, El-Bekare 2:148' },
  { k: 'Gara', ar: 'لَا أُسَابِقُكَ إِلَى شَيْءٍ أَبَدًا', sq: 'Umeri solli gjysmën e pasurisë për sadaka, Ebu Bekri e solli të gjithën. Umeri tha: «Nuk do të garoj më kurrë me ty për asgjë», sepse e kuptoi se s’e kalonte dot.', by: 'Umeri për Ebu Bekrin (r.a.) · Ebu Davudi, Tirmidhiu' },
  { k: 'Gara', ar: 'إِذَا رَأَيْتَ الرَّجُلَ يُنَافِسُكَ فِي الدُّنْيَا فَنَافِسْهُ فِي الْآخِرَةِ', sq: 'Kur sheh dikë që garon me ty për dynjanë, garo ti me të për ahiretin.', by: 'El-Hasen el-Basri' },
  { k: 'Gara', ar: 'إِنِ اسْتَطَعْتَ أَلَّا يَسْبِقَكَ إِلَى اللهِ أَحَدٌ فَافْعَلْ', sq: 'Nëse mundesh që askush të mos të paraprijë drejt Allahut, bëje.', by: 'Uhejb ibn el-Verd' }
];
const MKT = { Gjuha: 'Për gjuhën arabe', Dija: 'Për kërkimin e dijes', Koha: 'Për vlerën e kohës', Gara: 'Garoni në të mira' };
let mvi = -1;
const motivIdx = () => { if (mvi < 0) { const t = today(); let h = 0; for (const c of t) h = (h * 31 + c.charCodeAt(0)) >>> 0; mvi = h % MOTIV.length; } return mvi; };
const motivCard = (q, more) => `<figure class="motiv"><figcaption class="mk">${ic('book')} ${esc(MKT[q.k] || 'Motivim')}</figcaption>
  <blockquote><p class="ar">${esc(q.ar)}</p><p class="msq">${esc(q.sq)}</p></blockquote>
  <div class="mby"><cite>${esc(q.by)}</cite>${more ? '<button class="btn sec sm" data-motiv>Një thënie tjetër</button>' : ''}</div></figure>`;
document.addEventListener('click', e => {
  const b = e.target.closest('[data-motiv]'); if (!b) return;
  mvi = (motivIdx() + 1 + Math.floor(Math.random() * (MOTIV.length - 1))) % MOTIV.length;
  const f = b.closest('.motiv'); if (f) f.outerHTML = motivCard(MOTIV[mvi], true);
});

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
  const old = prev.length ? vq(shuffle(prev).slice(0, 3), prev) : [], md = uMode(d.ui);
  switch (d.di) {
    case 0: return [{ k: 'cards', w: u.A }, { k: 'quiz', q: vq(u.A, u.A) }];
    case 1: return [{ k: md === 'text' ? 'read' : 'dialog', d: u.D1 }, { k: 'quiz', q: u.D1.q.map(mk) }];
    case 2: return [{ k: 'gram', g: u.G }, { k: 'quiz', q: shuffle(u.G.ex.map(mk)) }];
    case 3: return [{ k: 'cards', w: u.B }, { k: md === 'dialog' ? 'dialog' : 'read', d: u.D2 }, { k: 'quiz', q: vq(u.B, all).concat(u.D2.q.map(mk)) }];
    case 4: return [{ k: 'quiz', q: shuffle(vq(all, all, 12).concat(shuffle(u.G.ex).slice(0, 4).map(mk), old)) }];
    case 5: return [{ k: 'quiz', q: bq(u, all).concat(u.say.map(s => ({ k: 'say', p: s[0], a: s[1] }))) }];
    case 6: return [{ k: 'quiz', test: true, q: shuffle(vq(all, all, 10).concat(shuffle(u.G.ex).slice(0, 4).map(mk), old, bq(u, all).slice(0, 2))) }];
  }
}
/* testi i nivelit: fjalor, gramatikë dhe ndërtim fjalish nga të gjitha njësitë e nivelit (pa dialogë) */
function lvQuestions(li) {
  const us = LVI[li].map(ui => U[ui]), all = us.flatMap(u => u.A.concat(u.B));
  const per = Math.max(1, Math.ceil(8 / us.length));
  const g = shuffle(us.flatMap(u => shuffle(u.G.ex).slice(0, per))).slice(0, 8).map(mk);
  const b = shuffle(us.flatMap(u => shuffle(bq(u, all)).slice(0, 1))).slice(0, 4);
  /* pa pyetje nga dialogët: ato janë për kuptim gjatë mësimit, jo për provim */
  return shuffle(vq(shuffle(all).slice(0, 15), all).concat(g, b));
}

/* ---------- KOKA DHE NAVIGIMI ---------- */
const TABS0 = [['home', 'Mësimi', 'home'], ['dict', 'Fjalori', 'book'], ['rank', 'Renditja', 'trophy'], ['stats', 'Progresi', 'chart'], ['me', 'Profili', 'user']];
const isAdm = () => !!(ME() && ME().a);
const TABSF = () => TABS0;
let tab = 'home';
function chrome() {
  const si = streakInfo(), TABS = TABSF();
  top.innerHTML = `<div class="in">
  <button class="brand" data-tab="home" aria-label="Mëso Arabisht, faqja kryesore"><span class="logo" aria-hidden="true">${logoSvg()}</span><span class="bt">Mëso <b>Arabisht</b></span></button>
  <nav class="tabs" aria-label="Navigimi kryesor">${TABS.map(([k, l, i]) => `<button class="tab" data-tab="${k}"${tab === k ? ' aria-current="page"' : ''}>${ic(i)}<span>${l}</span>${k === 'rank' && GRP.invites.length ? '<i class="dot" aria-label="ftesë e re"></i>' : ''}</button>`).join('')}</nav>
  <div class="chips">
   <button class="chip fire${si.done ? ' lit' : ''}" data-tab="stats" aria-label="Seria: ${si.n} ditë radhazi">${ic('flame')}<b>${si.n}</b></button>
   <button class="chip bolt" data-tab="stats" aria-label="XP sot: ${xpToday()}">${ic('bolt')}<b>${xpToday()}</b></button>
   ${isAdm() ? `<button class="chip adm" data-tab="admin"${tab === 'admin' ? ' aria-current="page"' : ''} aria-label="Paneli i administratorit" title="Paneli i administratorit">${ic('gear')}</button>` : ''}
  </div></div>`;
}
const VIEWS = { home, dict, rank, stats, me, admin };
function setTab(t) {
  if (!VIEWS[t] || (t === 'admin' && !isAdm())) t = 'home';
  hush(); L = Q = R = null;
  if (!ME() && !AUTH.guest) return authView();
  tab = t;
  document.body.classList.remove('inlesson', 'bare');
  if (PENDING) { const p = PENDING; PENDING = null; setCur(p.c); }
  try { history.replaceState(null, '', t === 'home' ? location.pathname : '#' + t); } catch (e) {}
  const go = () => { VIEWS[t](); chrome(); anim(); scrollTo(0, 0); };
  if (document.startViewTransition && !reduce && app.dataset.view) document.startViewTransition(go); else go();
  app.dataset.view = t;
}
const refresh = () => { if (VIEWS[tab] && !document.body.classList.contains('inlesson') && !document.body.classList.contains('bare')) { VIEWS[tab](); chrome(); } };
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
   ${STANDALONE() ? '' : `<button class="link inst-l" data-inst>${ic('phone')} Shkarkoje në ${IOS ? 'iPhone' : ANDROID ? 'telefon' : 'telefon (iPhone / Android)'}</button>`}
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
    setAuth({ u: j.username, t: j.token, a: !!j.admin });
    GRP = { groups: [], invites: [], at: 0 }; LBC = {}; lbScope = 'all';
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
function clearAccount() { GRP = { groups: [], invites: [], at: 0 }; LBC = {}; lbScope = 'all'; const th = S.theme; S = fresh(); S.theme = th; persist(); setAuth(null); dirty = false; applyTheme(); authView('login'); }

/* ---------- KRYEFAQJA ---------- */
const hello = () => { const h = new Date().getHours(); return h < 5 ? 'Natë e mbarë' : h < 12 ? 'Mirëmëngjes' : h < 18 ? 'Mirëdita' : 'Mirëmbrëma'; };
function streakMsg(si) {
  if (si.done) return 'Seria është e sigurt për sot. Shihemi nesër!';
  if (si.frozen) return `${ic('snow')} Ngrirja e mbron serinë për ${si.frozen === 1 ? 'ditën' : si.frozen + ' ditët'} që mungove. Bëje mësimin sot!`;
  if (si.n > 0) { const h = 24 - new Date().getHours(); return `Bëje një mësim sot që të mos e humbësh. Të kanë mbetur <b>${h} orë</b>.`; }
  if (si.lost) return `Seria prej ${si.lost} ditësh u ndal. Asgjë s'ka humbur nga dija, fillo një të re sot!`;
  return 'Bëje mësimin e parë dhe ndeze flakën e parë.';
}
const lvGen = li => 'Nivelit ' + (li + 1);
function unitCard(ui, ci) {
  const u = U[ui], n = DN.filter((_, di) => S.done[DAYS[ui * 7 + di].id]).length, sc = S.scores['u' + u.n];
  return `<article class="unit${n === 7 ? ' fin' : ''}"><div class="uh"><div><div class="ul">Njësia ${ui + 1}${sc ? ` · <span class="pill ok">${ic('trophy')} ${sc}%</span>` : ''}</div><h2>${esc(u.sq)}</h2></div><span class="ar">${esc(u.ar)}</span></div>
     <div class="ubar"><b style="width:${Math.round(n / 7 * 100)}%"></b></div>
     <div class="path">${MODES[uMode(ui)].days.map((nm, di) => { const i = ui * 7 + di, d = DAYS[i], done = !!S.done[d.id], ok = unlocked(i), cur = i === ci && ok;
       return `<button class="node${done ? ' done' : ''}${cur ? ' cur' : ''}${di === 6 ? ' test' : ''}" data-go="${i}"${ok ? '' : ' disabled'} aria-label="Dita ${di + 1}: ${esc(nm)}${done ? ' (e kryer)' : ok ? '' : ' (e mbyllur)'}">${cur ? '<em>SOT</em>' : ''}<i>${done ? ic('check') : !ok ? ic('lock') : di === 6 ? ic('trophy') : di + 1}</i><small>${esc(nm)}</small></button>`; }).join('')}</div></article>`;
}
function skipBox(li) {
  const nothing = !Object.keys(S.done).length && !Object.keys(S.lv).length, last = li >= LV.length - 1;
  return `<div class="skip">${ic('skip')}<div><b>${nothing ? 'E di tashmë pak arabisht?' : `E di tashmë ${lvName(li)}?`}</b><span>Bëj testin e ${lvGen(li)} (duhen ${lvPass(li)}%) dhe ${last ? 'përfundoje programin' : `fillo direkt nga ${lvName(li + 1)}`}.</span></div><button class="btn sec sm" data-lvt="${li}">Kalo me test</button></div>`;
}
function levelSec(li, nx, ci) {
  const l = LV[li], open = lvOpen(li), passed = lvPassed(li), ds = lvDays(li), dn = ds.filter(i => S.done[DAYS[i].id]).length, has = LVI[li].length > 0, ready = lvReady(li);
  const cur = !!nx && nx.li === li;
  const st = passed ? `<span class="pill ok">${ic('trophy')} I kaluar · ${S.lv[l.id]}%</span>` : !has ? `<span class="pill">Së shpejti</span>` : open ? `<span class="pill gold">${ic('play')} Në vazhdim</span>` : `<span class="pill">${ic('lock')} I mbyllur</span>`;
  const nextName = li < LV.length - 1 ? lvName(li + 1) : 'fundi i programit';
  let body;
  if (!has) body = `<div class="empty sm">Njësitë e këtij niveli po përgatiten.</div>`;
  else if (!open) body = `<p class="lvlock">${ic('lock')} Hapet kur kalon testin e ${lvGen(li - 1)}.</p><div class="lvu">${LVI[li].map(ui => `<span><b>${ui + 1}.</b> ${esc(U[ui].sq)}</span>`).join('')}</div>`;
  else body = LVI[li].map(ui => unitCard(ui, ci)).join('') +
    `<div class="lvtest${passed ? ' done' : ''}${ready && !passed ? ' ready' : ''}"><button class="node test${passed ? ' done' : ''}${cur && nx.k === 'lv' && ready ? ' cur' : ''}" data-lvt="${li}"${ready || passed ? '' : ' disabled'} aria-label="Testi i ${lvGen(li)}"><i>${passed ? ic('check') : ready ? ic('trophy') : ic('lock')}</i></button>
      <div class="lvtt"><b>Testi i ${lvGen(li)}</b><span>${passed ? `Kaluar me ${S.lv[l.id]}%. Mund ta bësh sërish për ushtrim.` : ready ? `Gati! Duhen ${lvPass(li)}% për të kaluar te ${nextName}.` : `Hapet pasi t'i kryesh të gjitha njësitë e nivelit. Duhen ${lvPass(li)}%.`}</span></div>
      ${!passed && !ready ? `<button class="btn sec sm" data-lvt="${li}">${ic('skip')} Kalo me test</button>` : ''}</div>`;
  return `<section class="lev${passed ? ' pass' : ''}${open ? '' : ' lock'}${cur ? ' cur' : ''}"><header class="lvh"><div class="lvb">${passed ? ic('check') : open && has ? li + 1 : ic(has ? 'lock' : 'clock')}</div><div class="lvt"><div class="ul">${lvName(li)} ${st} <span class="pill" title="${esc(MODES[lvMode(li)].d)}">${ic('book')} ${esc(MODES[lvMode(li)].t)}</span></div><h2>${esc(l.t)}</h2>${l.d ? `<p class="mut">${esc(l.d)}</p>` : ''}</div></header>
   ${ds.length && open ? `<div class="ubar"><b style="width:${Math.round(dn / ds.length * 100)}%"></b></div>` : ''}${body}</section>`;
}
function home() {
  const nx = nextUp(), ci = curIdx(), nd = due().length, si = streakInfo(), xt = xpToday(), g = S.goal, doneN = Object.keys(S.done).length;
  const name = ME() ? ME().u : '';
  const rev = nd ? `<button class="btn sec" data-rev>${ic('repeat')} Përsërit ${nd} fjalë</button>` : '';
  const revBig = nd ? `<div class="row">${rev.replace('btn sec', 'btn big')}</div>` : '';
  let th, skip = '';
  if (!nx) th = `<div class="k">Mashallah!</div><div class="t">I kalove të gjitha nivelet që janë gati.</div><p class="mut">Vazhdo me përsëritjen e përditshme derisa të shtohen njësitë e reja.</p>${revBig}`;
  else if (nx.k === 'soon') th = `<div class="k">${ic('layers')} ${lvName(nx.li)} · ${esc(LV[nx.li].t)}</div><div class="t">Niveli i ri po përgatitet.</div><p class="mut">${nx.li ? `E kalove ${lvName(nx.li - 1)}. ` : ''}Njësitë e reja shtohen së shpejti; ndërkohë vazhdo me përsëritjen.</p>${revBig}`;
  else if (nx.k === 'lv') {
    const li = nx.li;
    if (lvReady(li)) th = `<div class="k">${ic('trophy')} ${lvName(li)} · testi përfundimtar</div><div class="t">Testi i ${lvGen(li)}</div><p class="mut">Duhen ${lvPass(li)}% për të kaluar ${li < LV.length - 1 ? 'te ' + lvName(li + 1) : 'nivelin'}.</p><div class="row"><button class="btn big" data-lvt="${li}">${ic('play')} Fillo testin</button>${rev}</div>`;
    else { th = `<div class="k">${ic('check')} Mësimi i sotëm u krye</div><div class="t">Testi i ${lvGen(li)} hapet nesër.</div><p class="mut">Pushimi mes mësimeve e ndihmon kujtesën.${nd ? ' Ndërkohë ke fjalë për përsëritje.' : ''}</p>${revBig}`; skip = skipBox(li); }
  } else {
    const cd = DAYS[nx.i];
    th = unlocked(nx.i) ? `<div class="k">Mësimi i sotëm · ${lvName(nx.li)} · Njësia ${cd.ui + 1}, dita ${cd.di + 1} nga 7</div><div class="t">${esc(dname(cd.ui, cd.di))}</div><div class="row"><button class="btn big" data-go="${nx.i}">${ic('play')} Fillo mësimin</button>${rev}</div>`
      : `<div class="k">${ic('check')} Mësimi i sotëm u krye</div><div class="t">Dita e radhës (${esc(dname(cd.ui, cd.di))}) hapet nesër.</div><p class="mut">Pushimi mes mësimeve e ndihmon kujtesën.${nd ? ' Ndërkohë ke fjalë për përsëritje.' : ''}</p>${revBig}`;
    skip = skipBox(nx.li);
  }
  const nudge = !ME() && doneN ? `<div class="nudge">${ic('cloud')}<div><b>Mos e humb progresin</b><span>Krijo llogari me emër dhe fjalëkalim. Progresi ruhet dhe e ke në çdo pajisje.</span></div><button class="btn sm" data-auth="signup">Krijo llogari</button></div>` : '';
  app.innerHTML = `<section class="hero"><div class="wrap">
   <p class="hello">${hello()}${name ? `, <b>${esc(name)}</b>` : ''}</p>
   <div class="duo">
    <div class="panel streakp${si.done ? ' lit' : ''}"><div class="ph"><span class="fl">${ic('flame')}</span><div><b>${si.n}</b><span>ditë radhazi</span></div>${S.freezes ? `<span class="frz" title="Ngrirje: e mbron serinë kur mungon një ditë">${ic('snow')}${S.freezes}</span>` : ''}</div>${week()}<p class="pm">${streakMsg(si)}</p></div>
    <div class="panel goalp${xt >= g ? ' full' : ''}"><div class="rw">${ring(xt, g)}<div class="rc">${xt >= g ? ic('check') : ic('bolt')}</div></div><div><b>${xt}<small>/${g} XP</small></b><span>${xt >= g ? 'Qëllimi u arrit sot!' : 'Qëllimi i ditës'}</span></div></div>
   </div>
   <div class="today">${th}${skip}</div>
  </div></section>
  ${nudge || installBanner() ? `<section class="band tight"><div class="wrap">${nudge}${installBanner()}</div></section>` : ''}
  <section class="band tight"><div class="wrap">${motivCard(MOTIV[motivIdx()], true)}</div></section>
  <section class="band"><div class="wrap">
   ${LV.map((_, li) => levelSec(li, nx, ci)).join('')}
   <details class="how"><summary>Pse funksionon kjo mënyrë?</summary><div class="howg">
    <div><b>Nivele me test.</b> Çdo nivel mbyllet me një test. Kur e kalon, hapet niveli tjetër. Nëse di më shumë, bëje testin direkt dhe kalo përpara.</div>
    <div><b>Sistemi ndryshon me nivelin.</b> Niveli 1: dialogë me transliterim. Niveli 2: dialog dhe tekst leximi. Nivelet 3–4: tekste, nahv dhe shprehje, pa transliterim.</div>
    <div><b>Nxjerrja nga kujtesa.</b> Nuk e lexon vetëm mësimin: përgjigjesh, ndërton fjali dhe flet. Kështu fjalët ngulen më mirë se me rilexim.</div>
    <div><b>Përsëritje me intervale.</b> Fjalët kthehen pas 1, 2, 4, 7, 15, 30 e 60 ditësh, pikërisht kur fillon t'i harrosh.</div>
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
   <div class="seg">${[['learned', `Të mësuarat (${learned})`], ['all', `Të gjitha (${ALLW.length})`], ...U.map((u, ui) => ['u' + u.n, 'Njësia ' + (ui + 1)])].map(([k, l]) => `<button data-dm="${k}" aria-pressed="${dmode === k}">${l}</button>`).join('')}</div>
   <div class="words" id="wl"></div></div></section>`;
  renderWords();
}
const strip = s => s.replace(/[ً-ْٰـ]/g, '').toLowerCase();
function renderWords() {
  const q = strip(dq.trim());
  let ws = ALLW.filter(w => dmode === 'all' || (dmode === 'learned' ? S.cards[w.ar] : 'u' + w.n === dmode));
  if (q) ws = ws.filter(w => strip(w.ar).includes(q) || w.sq.toLowerCase().includes(q) || (w.tr || '').toLowerCase().includes(q));
  const seen = new Set(); ws = ws.filter(w => !seen.has(w.ar) && seen.add(w.ar));
  const el = document.getElementById('wl');
  el.innerHTML = ws.length ? ws.map(w => { const c = S.cards[w.ar], lv = c ? c.b + 1 : 0; return `<button class="word" data-say="${esc(w.ar)}"><span><span class="m">${esc(w.sq)}</span><span class="u">Njësia ${w.no}${S.tr ? ' · ' + esc(w.tr) : ''}</span></span><span class="lvl" aria-label="Niveli ${lv} nga 7">${INT.map((x, i) => `<i class="${i < lv ? 'on' : ''}"></i>`).join('')}</span><span class="ar">${esc(w.ar)}</span></button>`; }).join('')
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
   <h3>Nivelet</h3><div class="bars">${LV.map((l, li) => { const ds = lvDays(li), n = ds.filter(i => S.done[DAYS[i].id]).length, p = lvPassed(li); return `<div class="bar"><span>${lvName(li)}</span><span class="t"><b style="width:${p ? 100 : ds.length ? Math.round(n / ds.length * 100) : 0}%"></b></span><span class="v">${p ? S.lv[l.id] + '%' : !ds.length ? '–' : lvOpen(li) ? Math.round(n / ds.length * 100) + '%' : ic('lock')}</span></div>`; }).join('')}</div>
   <h3>Njësitë</h3><div class="bars">${U.map(u => { const n = DN.filter((_, i) => S.done['u' + u.n + 'd' + (i + 1)]).length, sc = S.scores['u' + u.n]; return `<div class="bar"><span>${esc(u.sq)}</span><span class="t"><b style="width:${Math.round(n / 7 * 100)}%"></b></span><span class="v">${sc ? sc + '%' : n + '/7'}</span></div>`; }).join('')}</div>
  </div></section>`;
  countUp();
}

/* ---------- RENDITJA ---------- */
const LBP = [['d', 'Sot'], ['w', 'Java'], ['m', 'Muaji'], ['a', 'Gjithsej']];
const MUAJT = ['janar', 'shkurt', 'mars', 'prill', 'maj', 'qershor', 'korrik', 'gusht', 'shtator', 'tetor', 'nëntor', 'dhjetor'];
let lbP = 'w', lbScope = 'all', LBC = {}, LBE = null, lbBusy = false;
let GRP = { groups: [], invites: [], at: 0 };
const lbKey = () => lbScope + ':' + lbP;
const curGroup = () => GRP.groups.find(g => g.id === lbScope) || null;
const dm = k => +k.slice(8) + ' ' + MUAJT[+k.slice(5, 7) - 1].slice(0, 3);
const leftTo = end => { const n = between(today(), end); return n <= 0 ? 'mbaron sot' : n === 1 ? 'mbaron nesër' : 'mbaron pas ' + n + ' ditësh'; };
function lbLabel(d) {
  const P = d && d.period; if (!P) return '';
  if (lbP === 'd') return 'Sot · rifillon në mesnatë';
  if (lbP === 'w') return `Java ${dm(P.w)} – ${dm(P.we)} · ${leftTo(P.we)}`;
  if (lbP === 'm') { const y = +P.m.slice(0, 4), mo = +P.m.slice(5, 7), nm = MUAJT[mo - 1]; return `${nm[0].toUpperCase() + nm.slice(1)} ${y} · ${leftTo(fmt(new Date(y, mo, 0)))}`; }
  return 'Që nga fillimi';
}
const rankOpen = () => tab === 'rank' && !document.body.classList.contains('inlesson') && !document.body.classList.contains('bare');
async function loadLB(force) {
  if (lbBusy) return;
  const key = lbKey(), c = LBC[key];
  if (!force && c && Date.now() - c.at < 30000) return;
  lbBusy = true; LBE = null;
  try {
    if (ME() && (dirty || syncing)) await push();
    const j = await api('leaderboard?p=' + lbP + (lbScope !== 'all' ? '&g=' + lbScope : '')); j.at = Date.now(); LBC[key] = j;
    if (j.group) { const i = GRP.groups.findIndex(g => g.id === j.group.id); if (i >= 0) GRP.groups[i] = j.group; }
  } catch (e) {
    if (e.status === 404 && lbScope !== 'all') { lbScope = 'all'; toast(esc(e.message)); loadGroups(true); }
    else LBE = e.message;
  }
  lbBusy = false;
  if (rankOpen()) rank();
}
/* grupet e mia dhe ftesat */
async function loadGroups(force) {
  if (!ME() || (!force && Date.now() - GRP.at < 60000)) return;
  GRP.at = Date.now();
  try { useGroups(await api('groups')); } catch (e) { GRP.at = 0; }
}
function useGroups(j) {
  const had = GRP.invites.length;
  GRP = { groups: j.groups || [], invites: j.invites || [], at: Date.now() };
  if (lbScope !== 'all' && !curGroup()) lbScope = 'all';
  if (!document.body.classList.contains('inlesson') && !document.body.classList.contains('bare')) chrome();
  if (rankOpen()) rank();
  if (!had && GRP.invites.length && tab !== 'rank') toast(`${ic('user')} Ke një ftesë për një grup. Shiko te Renditja.`);
}
async function gAct(body, btn) {
  if (btn) { btn.disabled = true; btn.classList.add('busy'); }
  try {
    const j = await api('groups', { method: 'POST', body });
    Object.keys(LBC).forEach(k => { if (!k.startsWith('all:')) delete LBC[k]; });
    useGroups(j);
    const warn = [];
    if (j.bad && j.bad.length) warn.push(`Nuk u gjet asnjë llogari me emrin: <b>${j.bad.map(esc).join(', ')}</b>`);
    if (j.full && j.full.length) warn.push(`Nuk mund të ftohen tani (kanë shumë ftesa ose grupi është plot): <b>${j.full.map(esc).join(', ')}</b>`);
    j.warn = warn.join('<br>');
    return j;
  } catch (x) {
    toast(esc(x.message)); sfx('no');
    if (x.status === 404) loadGroups(true);
    return null;
  } finally { if (btn && btn.isConnected) { btn.disabled = false; btn.classList.remove('busy'); } }
}
const lvlOf = l => 'Niveli ' + Math.min(l + 1, Math.max(1, LV.length));
const hue = u => { let h = 7; for (const ch of u) h = (h * 31 + ch.charCodeAt(0)) % 360; return h; };
const lav = (u, cls) => `<span class="lav${cls ? ' ' + cls : ''}" style="--h:${hue(u)}">${esc(u[0].toUpperCase())}</span>`;
function board(d, meU, adm) {
  const hide = u => adm && u !== meU ? `<button class="ib bad lbhide" data-lbhide="${esc(u)}" aria-label="Hiqe ${esc(u)} nga renditja" title="Hiqe nga renditja">${ic('x')}</button>` : '';
  const t = d.top, POS = [2, 1, 3];
  return `<div class="podium">${[t[1], t[0], t[2]].map((r, j) => r ? `<div class="pod p${POS[j]}${r.u === meU ? ' me' : ''}">${POS[j] === 1 ? `<span class="crown">${ic('crown')}</span>` : ''}${lav(r.u, 'big')}<b>${esc(r.u)}${r.u === meU ? ' <small>(ti)</small>' : ''}</b><span class="pxp">${ic('bolt')}${r.xp}</span><small class="mut">${r.s ? ic('flame') + r.s + ' · ' : ''}${lvlOf(r.l)}</small>${hide(r.u)}<div class="step">${POS[j]}</div></div>` : '<div class="pod none"></div>').join('')}</div>
    ${t.length > 3 ? `<ol class="lbl">${t.slice(3).map((r, i) => `<li class="lbr${r.u === meU ? ' me' : ''}" style="--i:${i}"><span class="lbn">${i + 4}</span>${lav(r.u)}<span class="lbu"><b>${esc(r.u)}${r.u === meU ? ' <small>(ti)</small>' : ''}</b><small>${r.s ? ic('flame') + ' ' + r.s + ' ditë · ' : ''}${lvlOf(r.l)}</small></span><b class="lbxp">${r.xp} XP</b>${hide(r.u)}</li>`).join('')}</ol>` : ''}`;
}
function rank() {
  const m = ME(), meU = m ? m.u : '', g = curGroup(), d = LBC[lbKey()], adm = !!(d && d.admin) && !g, hidden = m && S.lb === false && !g;
  let body;
  if (!d) body = LBE ? `<div class="empty">${esc(LBE)}<br><button class="btn sec sm" data-lbr style="margin-top:12px">Provo sërish</button></div>` : `<div class="lbsk" aria-label="Duke u ngarkuar">${'<i></i>'.repeat(6)}</div>`;
  else if (!d.top.length) body = `<div class="empty">${{ d: 'Ende askush sot.', w: 'Ende askush këtë javë.', m: 'Ende askush këtë muaj.', a: 'Renditja është ende bosh.' }[lbP]} Bëj një mësim dhe dil i pari!</div>`;
  else body = board(d, meU, adm) + (adm ? `<p class="mut sm">Si administrator mund të heqësh nga renditja këdo që mashtron (butoni ${ic('x')} pranë emrit).</p>` : '')
    + (g && d.top.length === 1 ? `<div class="empty sm">Je vetëm në grup. ${g.inv.length ? `Prit që të ftuarit (${g.inv.map(esc).join(', ')}) ta pranojnë ftesën.` : 'Fto shokët që të filloni garën.'}</div>` : '');
  const inTop = !!(d && d.top.some(r => r.u === meU));
  const mine = !m || hidden || !d || !d.me || g ? '' : d.me.rank ? (inTop ? '' : `<div class="lbme">${lav(meU)}<span>Je në vendin e <b>${d.me.rank}</b> nga ${d.total}</span><b>${d.me.score} XP</b></div>`)
    : `<div class="lbme">${ic('bolt')}<span>Ende pa pikë ${{ d: 'sot', w: 'këtë javë', m: 'këtë muaj', a: '' }[lbP]}. Bëj një mësim dhe futu në renditje!</span></div>`;
  const note = !m ? `<div class="nudge">${ic('trophy')}<div><b>Futu edhe ti në renditje</b><span>Krijo llogari me emër dhe fjalëkalim; XP-ja jote numërohet menjëherë. Me llogari mund të krijosh edhe grupe me shokët.</span></div><button class="btn sm" data-auth="signup">Krijo llogari</button></div>`
    : hidden ? `<div class="nudge">${ic('eye')}<div><b>Je i fshehur nga renditja e përgjithshme</b><span>Të tjerët nuk të shohin këtu. Në grupet ku je anëtar dukesh gjithsesi.</span></div><button class="btn sm" data-lbon>Shfaqmë</button></div>` : '';
  const invites = m ? GRP.invites.map(v => `<div class="ginv">${lav(v.owner)}<div><b>${esc(v.owner)} të fton në grupin «${esc(v.name)}»</b><span>${v.n} ${v.n === 1 ? 'anëtar' : 'anëtarë'} · garë me XP brenda grupit</span></div><div class="row"><button class="btn sm" data-gacc="${v.id}">${ic('check')} Prano</button><button class="btn sec sm" data-gdec="${v.id}">Refuzo</button></div></div>`).join('') : '';
  const scopes = m ? `<div class="gscope" role="tablist" aria-label="Renditja"><button role="tab" data-gsc="all" aria-selected="${lbScope === 'all'}">${ic('trophy')} Të gjithë</button>${GRP.groups.map(x => `<button role="tab" data-gsc="${x.id}" aria-selected="${lbScope === x.id}">${ic('user')} ${esc(x.name)}</button>`).join('')}<button class="gnew" data-gnew>${ic('plus')} Grup i ri</button></div>` : '';
  const ghead = g ? `<div class="ghead"><div><b>${esc(g.name)}</b><span>${g.members.length} ${g.members.length === 1 ? 'anëtar' : 'anëtarë'}${g.inv.length ? ` · ${g.inv.length} të ftuar` : ''} · krijuar nga ${esc(g.owner)}${g.owner === meU ? ' (ti)' : ''}</span></div><button class="btn sec sm" data-gman="${g.id}">${ic('gear')} ${g.owner === meU ? 'Menaxho' : 'Grupi'}</button></div>` : '';
  app.innerHTML = `<section class="band"><div class="wrap lb">
   <div class="lbh"><h1>Renditja</h1><button class="ib" data-lbr aria-label="Rifresko" title="Rifresko">${ic('repeat')}</button></div>
   <p class="lead">${g ? 'Gara brenda grupit. Pikët janë XP-ja nga mësimet, testet dhe përsëritja.' : 'Kush mësoi më shumë? Pikët janë XP-ja nga mësimet, testet dhe përsëritja.'}</p>
   ${invites}${scopes}${ghead}
   <div class="lbseg" role="tablist">${LBP.map(([k, l]) => `<button role="tab" data-lbp="${k}" aria-selected="${lbP === k}">${l}</button>`).join('')}</div>
   <p class="lbper">${ic('clock')} ${lbLabel(d) || 'Duke u ngarkuar…'}</p>
   ${note}${body}
  </div></section>${mine ? `<div class="lbmew"><div class="wrap">${mine}</div></div>` : ''}`;
  if (!lbBusy && !LBE && (!d || Date.now() - d.at > 30000)) loadLB();
  if (m) loadGroups();
}
/* dritaret: grup i ri, menaxhimi */
function openSheet(html) {
  closeInstall();
  const w = document.createElement('div');
  w.className = 'isheet'; w.setAttribute('role', 'dialog'); w.setAttribute('aria-modal', 'true');
  w.innerHTML = `<div class="ibg" data-instx></div><div class="ipanel">${html}</div>`;
  document.body.appendChild(w);
  requestAnimationFrame(() => w.classList.add('on'));
  const f = w.querySelector('input,textarea'); if (f && matchMedia('(hover:hover)').matches) f.focus();
}
const sheetX = `<button class="x" data-instx aria-label="Mbyll">${ic('x')}</button>`;
function newGroupSheet() {
  openSheet(`${sheetX}<h2>${ic('user')} Grup i ri</h2><p class="lead">Krijo një grup me shokët dhe garoni me XP: sot, këtë javë, këtë muaj. Secili merr një ftesë dhe vendos vetë nëse hyn; mund të dalë kur të dojë.</p>
   <form id="gcf" class="gform" novalidate>
    <label class="fld"><span>Emri i grupit</span><input name="name" maxlength="40" placeholder="p.sh. Klasa e arabishtes" required></label>
    <label class="fld"><span>Emrat e përdoruesve</span><textarea name="users" rows="3" autocapitalize="none" autocorrect="off" spellcheck="false" placeholder="ardit_99, fatime, blerim"></textarea><small class="mut">Ndaji me presje ose hapësirë. Mund të ftosh edhe më vonë.</small></label>
    <p class="err" role="alert"></p>
    <button class="btn big full" type="submit">${ic('check')} Krijo grupin</button>
   </form>`);
}
function manageSheet(id) {
  const g = GRP.groups.find(x => x.id === id), meU = ME() ? ME().u : '';
  if (!g) return closeInstall();
  const own = g.owner === meU;
  const row = (u, pend) => `<li>${lav(u)}<span class="gm"><b>${esc(u)}${u === meU ? ' <small>(ti)</small>' : ''}</b><small>${u === g.owner ? 'krijuesi' : pend ? 'pret të pranojë' : 'anëtar'}</small></span>${own && u !== meU ? `<button class="ib bad" data-grm="${esc(u)}" data-gid="${g.id}" aria-label="${pend ? 'Anulo ftesën' : 'Hiqe nga grupi'}" title="${pend ? 'Anulo ftesën' : 'Hiqe nga grupi'}">${ic('x')}</button>` : ''}</li>`;
  openSheet(`${sheetX}<h2>${ic('user')} ${esc(g.name)}</h2>
   ${own ? `<form id="grf" class="gform inline" data-gid="${g.id}" novalidate><label class="fld"><span>Emri i grupit</span><input name="name" maxlength="40" value="${esc(g.name)}"></label><button class="btn sec" type="submit">Ruaje</button></form>` : ''}
   <h3>Anëtarët (${g.members.length})</h3><ul class="glist">${g.members.map(u => row(u, false)).join('')}</ul>
   ${g.inv.length ? `<h3>Të ftuar (${g.inv.length})</h3><ul class="glist">${g.inv.map(u => row(u, true)).join('')}</ul>` : ''}
   ${own ? `<form id="gif" class="gform" data-gid="${g.id}" novalidate><label class="fld"><span>Fto shokë të tjerë</span><textarea name="users" rows="2" autocapitalize="none" autocorrect="off" spellcheck="false" placeholder="emrat e përdoruesve, të ndarë me presje"></textarea></label><button class="btn" type="submit">${ic('plus')} Fto</button></form>` : ''}
   <div class="gdanger">
    <button class="btn sec" data-gleave="${g.id}">${ic('out')} Dil nga grupi</button>
    ${own ? `<button class="btn bad" data-gdel="${g.id}">${ic('trash')} Fshi grupin</button>` : ''}
   </div>
   <p class="mut sm">${own ? 'Nëse del ti, krijues bëhet anëtari tjetër. Fshirja e heq grupin për të gjithë.' : 'Mund të dalësh kur të duash; progresi yt nuk preket.'}</p>`);
}
document.addEventListener('click', async e => {
  const t = e.target.closest('[data-gsc],[data-gnew],[data-gman],[data-gacc],[data-gdec],[data-grm],[data-gleave],[data-gdel]'); if (!t) return;
  const ds = t.dataset;
  if (ds.gsc !== undefined) { lbScope = ds.gsc; LBE = null; sfx('tap'); return rank(); }
  if (ds.gnew !== undefined) { sfx('tap'); return newGroupSheet(); }
  if (ds.gman !== undefined) return manageSheet(ds.gman);
  if (ds.gacc !== undefined) { if (await gAct({ action: 'accept', id: ds.gacc }, t)) { lbScope = ds.gacc; toast(`${ic('check')} Hyre në grup. Suksese në garë!`, 'good'); sfx('ok'); rank(); } return; }
  if (ds.gdec !== undefined) { if (await gAct({ action: 'decline', id: ds.gdec }, t)) toast('Ftesa u refuzua.'); return; }
  if (ds.grm !== undefined) { if (!armed(t, 'Hiqe?')) return; if (await gAct({ action: 'remove', id: ds.gid, u: ds.grm })) manageSheet(ds.gid); return; }
  if (ds.gleave !== undefined) { if (!armed(t, 'Kliko sërish për të dalë')) return; if (await gAct({ action: 'leave', id: ds.gleave }, t)) { closeInstall(); lbScope = 'all'; toast('Dole nga grupi.'); rank(); } return; }
  if (ds.gdel !== undefined) { if (!armed(t, 'Kliko sërish: fshihet për të gjithë')) return; if (await gAct({ action: 'delete', id: ds.gdel }, t)) { closeInstall(); lbScope = 'all'; toast('Grupi u fshi.'); rank(); } }
});
document.addEventListener('submit', async e => {
  const f = e.target; if (!['gcf', 'gif', 'grf'].includes(f.id)) return;
  e.preventDefault();
  const b = f.querySelector('[type=submit]'), err = f.querySelector('.err');
  if (f.id === 'gcf') {
    const name = f.name.value.trim();
    if (name.length < 2) { err.textContent = 'Shkruaj emrin e grupit (së paku 2 shenja).'; return; }
    const j = await gAct({ action: 'create', name, users: f.users.value }, b);
    if (j) { closeInstall(); lbScope = j.id; sfx('win'); toast(`${ic('check')} Grupi u krijua${j.added && j.added.length ? '. Ftesat u dërguan te: ' + j.added.map(esc).join(', ') : ''}.${j.warn ? '<br>' + j.warn : ''}`, j.warn ? '' : 'good'); rank(); }
  }
  if (f.id === 'gif') { const j = await gAct({ action: 'invite', id: f.dataset.gid, users: f.users.value }, b); if (j) { const ok = j.added && j.added.length ? `${ic('check')} Ftesa u dërgua te: ${j.added.map(esc).join(', ')}` : ''; if (ok || j.warn) toast([ok, j.warn].filter(Boolean).join('<br>'), j.warn ? '' : 'good'); manageSheet(f.dataset.gid); } }
  if (f.id === 'grf') { if (await gAct({ action: 'rename', id: f.dataset.gid, name: f.name.value }, b)) { toast(`${ic('check')} Emri u ruajt.`, 'good'); manageSheet(f.dataset.gid); } }
});

/* ---------- PROFILI ---------- */
const GOALS = [[50, 'Lehtë', 'një përsëritje'], [100, 'Mesatar', 'një mësim'], [200, 'Seriozisht', 'mësim + përsëritje'], [300, 'Intensiv', 'si kampion']];
function me() {
  const m = ME();
  app.innerHTML = `<section class="band"><div class="wrap">
   ${m ? `<div class="prof"><div class="av">${esc(m.u[0].toUpperCase())}</div><div class="pi"><h1>${esc(m.u)}</h1><p id="sync" class="sync"></p></div><button class="btn sec sm" data-logout>${ic('out')} Dil</button></div>`
     : `<div class="prof guest"><div class="av">?</div><div class="pi"><h1>Pa llogari</h1><p class="mut">Progresi ruhet vetëm në këtë pajisje. Me llogari e ke kudo.</p></div><div class="row"><button class="btn sm" data-auth="signup">Krijo llogari</button><button class="btn sec sm" data-auth="login">Hyr</button></div></div>`}
   <h2>Aplikacioni në telefon</h2>
   ${STANDALONE() ? `<div class="nudge inst">${ic('check')}<div><b>E ke të instaluar</b><span>Po e përdor si aplikacion nga ekrani i telefonit.</span></div></div>` : `<div class="nudge inst">${ic('phone')}<div><b>Shkarkoje në ${IOS ? (IPAD ? 'iPad' : 'iPhone') : 'telefon'}</b><span>Ikonë në ekran, ekran i plotë, punon pa internet. Pa App Store.</span></div><button class="btn sm" data-inst>${ic('dl')} Shkarko</button></div>`}
   <h2>Tema</h2>
   <div class="themes">${THEMES.map(([k, n, d]) => `<button class="tp${(S.theme || 'auto') === k ? ' sel' : ''}" data-theme-pick="${k}" ${k === 'auto' ? '' : `data-theme="${k}"`} aria-pressed="${(S.theme || 'auto') === k}"><span class="pv">${k === 'auto' ? '<span class="half" data-theme="oaz"></span><span class="half" data-theme="mesnate"></span>' : `<span class="h"><span class="tl">${logoSvg(null, 'tp' + k)}</span></span><span class="c"><i></i><i></i></span><span class="b"></span>`}</span><b>${n}</b><small>${d}</small>${(S.theme || 'auto') === k ? `<span class="tick">${ic('check')}</span>` : ''}</button>`).join('')}</div>
   <h2>Qëllimi ditor</h2>
   <div class="goals">${GOALS.map(([v, n, d]) => `<button data-goal="${v}" aria-pressed="${S.goal === v}"><b>${n}</b><span>${v} XP · ${d}</span></button>`).join('')}</div>
   <h2>Cilësimet</h2>
   <div class="sets">
    <label class="sw"><span><b>Tingujt</b><small>Tinguj të lehtë kur përgjigjesh</small></span><input type="checkbox" id="snd"${S.sound ? ' checked' : ''}><i></i></label>
    <label class="sw"><span><b>Transliterimi</b><small>Shqiptimi me shkronja latine te fjalët e reja</small></span><input type="checkbox" id="tr"${S.tr ? ' checked' : ''}><i></i></label>
    <label class="sw"><span><b>Mënyra e lirë</b><small>Hap ditën tjetër pa pritur nesër</small></span><input type="checkbox" id="free"${S.free ? ' checked' : ''}><i></i></label>
    ${m ? `<label class="sw"><span><b>Shfaqu në renditje</b><small>Emri dhe XP-ja jote duken te Renditja</small></span><input type="checkbox" id="lbon"${S.lb !== false ? ' checked' : ''}><i></i></label>` : ''}
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

/* ---------- HTML I SIGURT PËR GRAMATIKËN (vetëm etiketa të thjeshta) ---------- */
const OKTAGS = new Set(['B', 'I', 'U', 'STRONG', 'EM', 'P', 'BR', 'DIV', 'SPAN', 'TABLE', 'THEAD', 'TBODY', 'TR', 'TD', 'TH', 'UL', 'OL', 'LI', 'H3', 'H4', 'SMALL', 'SUP', 'SUB', 'HR', 'MARK']);
const OKATTR = new Set(['class', 'colspan', 'rowspan', 'dir']);
function safeHTML(h) {
  try {
    const doc = new DOMParser().parseFromString('<div>' + String(h || '') + '</div>', 'text/html'), root = doc.body.firstElementChild;
    const walk = el => [...el.children].forEach(c => {
      if (!OKTAGS.has(c.tagName)) { c.replaceWith(doc.createTextNode(c.textContent)); return; }
      [...c.attributes].forEach(a => { if (!OKATTR.has(a.name)) c.removeAttribute(a.name); });
      walk(c);
    });
    walk(root); return root.innerHTML;
  } catch (e) { return esc(h); }
}

/* ---------- PANELI I ADMINISTRATORIT ---------- */
let AE = null; // njësia që po ndryshohet: {li, k} (k = -1 për njësi të re)
const clone = x => JSON.parse(JSON.stringify(x));
const AR = /[؀-ۿ]/;
const rows = s => String(s || '').split('\n').map(l => l.split('|').map(x => x.trim())).filter(r => r.some(Boolean));
const ser = {
  words: ws => ws.map(w => [w[0], w[1], w[2]].filter((x, i) => i < 2 || x).join(' | ')).join('\n'),
  lines: ls => ls.map(l => (l[0] ? [l[0], l[1], l[2]] : [l[1], l[2]]).join(' | ')).join('\n'),
  qs: qs => qs.map(q => [q.p].concat(q.o).join(' | ')).join('\n'),
  build: bs => bs.map(b => b[0] + ' | ' + b[1].join(' ')).join('\n'),
  say: ss => ss.map(s => s[0] + ' | ' + s[1]).join('\n'),
};
function parseUnit(f) {
  const errs = [], v = n => (f.elements[n] ? f.elements[n].value : '');
  const chk = (name, list, need, fn) => list.map((r, i) => { const x = fn(r); if (!x) errs.push(`${name}, rreshti ${i + 1}: ${need}`); return x; }).filter(Boolean);
  const words = (name, s) => chk(name, rows(s), 'duhet “arabisht | shqip | transliterim”', r => r[0] && r[1] ? [r[0], r[1], r[2] || ''] : null);
  const lines = (name, s) => chk(name, rows(s), 'duhet “Folësi | arabisht | shqip”', r => r.length === 2 && AR.test(r[0]) && !AR.test(r[1]) ? ['', r[0], r[1]] : r[1] ? [r[0] || '', r[1], r[2] || ''] : null);
  const qs = (name, s) => chk(name, rows(s), 'duhet “pyetja | e sakta | gabim | gabim”', r => { const o = r.slice(1).filter(Boolean); if (!r[0] || o.length < 2) return null; const q = { p: r[0], o }; if (o.every(x => AR.test(x))) q.ar = 1; return q; });
  const u = {
    sq: v('sq').trim(), ar: v('ar').trim(),
    A: words('Fjalori i ditës 1', v('A')), B: words('Fjalori i ditës 4', v('B')),
    D1: { t: v('D1t').trim(), l: lines('Dialogu 1', v('D1l')), q: qs('Pyetjet e dialogut 1', v('D1q')) },
    D2: { t: v('D2t').trim(), l: lines('Dialogu 2', v('D2l')), q: qs('Pyetjet e dialogut 2', v('D2q')) },
    G: { t: v('Gt').trim(), h: v('Gh').trim(), ex: qs('Ushtrimet e gramatikës', v('Gex')) },
    build: chk('Ndërto fjalinë', rows(v('build')), 'duhet “shqip | fjalët arabisht me hapësirë”', r => r[0] && r[1] ? [r[0], r[1].split(/\s+/).filter(Boolean)] : null),
    say: chk('Fol', rows(v('say')), 'duhet “detyra | përgjigjja arabisht”', r => r[0] && r[1] ? [r[0], r[1]] : null),
  };
  if (!u.sq) errs.unshift('Shkruaj titullin shqip të njësisë.');
  if (!u.A.length) errs.push('Fjalori i ditës 1 duhet të ketë së paku një fjalë.');
  return { u, errs };
}
const nextN = c => 1 + Math.max(0, ...c.levels.flatMap(l => l.units.map(u => +u.n || 0)));
const nextLvId = c => { let n = c.levels.length + 1; const ids = new Set(c.levels.map(l => l.id)); while (ids.has('L' + n)) n++; return 'L' + n; };
async function publish(c, btn) {
  if (btn) { btn.disabled = true; btn.classList.add('busy'); }
  try {
    const j = await api('curriculum', { method: 'PUT', body: { cur: { levels: c.levels }, base: CUR.v } });
    setCur(j.cur); toast(`${ic('check')} U ruajt. Nxënësit e shohin ndryshimin menjëherë.`, 'good'); sfx('ok');
    return true;
  } catch (x) {
    toast(esc(x.message)); sfx('no');
    if (x.status === 409) await fetchCur();
    if (x.status === 403) { setAuth({ ...ME(), a: false }); setTab('home'); }
    return false;
  } finally { if (btn && btn.isConnected) { btn.disabled = false; btn.classList.remove('busy'); } }
}
const armed = (t, msg) => { if (t.dataset.armed) return true; t.dataset.armed = '1'; const o = t.innerHTML; t.innerHTML = msg; setTimeout(() => { if (t.isConnected) { delete t.dataset.armed; t.innerHTML = o; } }, 4000); return false; };
const ibtn = (a, icon, label, attrs, cls) => `<button class="ib${cls ? ' ' + cls : ''}" data-a="${a}" ${attrs || ''} aria-label="${esc(label)}" title="${esc(label)}">${ic(icon)}</button>`;

function admin() {
  if (AE) return unitEditor();
  const c = CUR, tot = c.levels.reduce((a, l) => a + l.units.length, 0);
  app.innerHTML = `<section class="band"><div class="wrap adm">
   <h1>Paneli i administratorit</h1>
   <p class="lead">Rregullo programin mësimor. Çdo nivel ka njësitë e veta dhe mbyllet me një test; nxënësi kalon te niveli tjetër kur e kalon testin. Kush di më shumë e bën testin direkt dhe fillon nga niveli tjetër.</p>
   <div class="admbar">
    <div class="admst">${ic('cloud')}<span>${c.v ? `Ruajtur në server · ${esc(new Date(c.v).toLocaleString('sq-AL', { dateStyle: 'medium', timeStyle: 'short' }))}${c.by ? ' · nga ' + esc(c.by) : ''}` : 'Programi parazgjedhur (nga data.js). Ruhet në server me ndryshimin e parë.'}</span><b>${c.levels.length} nivele · ${tot} njësi</b></div>
    <div class="row"><button class="btn sm" data-a="addlv">${ic('plus')} Shto nivel</button><button class="btn sec sm" data-a="export">${ic('dl')} Shkarko JSON</button><label class="btn sec sm" tabindex="0">${ic('ul')} Ngarko JSON<input type="file" id="impf" accept=".json,application/json" hidden></label>${c.v ? `<button class="btn sec sm" data-a="reset">${ic('repeat')} Rikthe parazgjedhjen</button>` : ''}</div>
   </div>
   ${c.levels.map((l, li) => `<article class="adl">
    <div class="adlh"><span class="lvb">${li + 1}</span><b>${lvName(li)}</b><span class="mut sm">${l.units.length} njësi · ${l.units.length * 7} ditë + testi</span>
     <div class="adbtns">${ibtn('lvup', 'up', 'Lëviz lart', `data-li="${li}"${li ? '' : ' disabled'}`)}${ibtn('lvdn', 'down', 'Lëviz poshtë', `data-li="${li}"${li < c.levels.length - 1 ? '' : ' disabled'}`)}${ibtn('dellv', 'trash', 'Fshi nivelin', `data-li="${li}"`, 'bad')}</div></div>
    <div class="adf">
     <label class="fld"><span>Emri i nivelit</span><input data-lf="t" data-li="${li}" value="${esc(l.t)}" maxlength="120"></label>
     <label class="fld"><span>Pragu i testit (%)</span><input data-lf="pass" data-li="${li}" type="number" min="50" max="100" step="5" value="${l.pass}"></label>
     <label class="fld wide"><span>Sistemi i nivelit</span><select data-lf="m" data-li="${li}">${Object.entries(MODES).map(([k, m]) => `<option value="${k}"${(l.m || 'dialog') === k ? ' selected' : ''}>${esc(m.t)}: ${esc(m.d)}</option>`).join('')}</select></label>
     <label class="fld wide"><span>Përshkrimi (i shfaqet nxënësit)</span><input data-lf="d" data-li="${li}" value="${esc(l.d)}" maxlength="400"></label>
    </div>
    <ol class="adu">${l.units.map((u, k) => `<li>
      <div class="adui"><b>${esc(u.sq)}</b>${u.ar ? `<span class="ar">${esc(u.ar)}</span>` : ''}<small class="mut">${u.A.length + u.B.length} fjalë · ${u.D1.l.length + u.D2.l.length} rreshta dialogu · ${u.G.ex.length + u.D1.q.length + u.D2.q.length} pyetje · ${u.build.length + u.say.length} ushtrime të foluri</small></div>
      <div class="adbtns">${ibtn('edu', 'edit', 'Ndrysho njësinë', `data-li="${li}" data-k="${k}"`)}${ibtn('uup', 'up', 'Lëviz lart', `data-li="${li}" data-k="${k}"${k || li ? '' : ' disabled'}`)}${ibtn('udn', 'down', 'Lëviz poshtë', `data-li="${li}" data-k="${k}"${k < l.units.length - 1 || li < c.levels.length - 1 ? '' : ' disabled'}`)}
       <select data-mv data-li="${li}" data-k="${k}" aria-label="Zhvendose në nivel">${c.levels.map((_, j) => `<option value="${j}"${j === li ? ' selected' : ''}>${lvName(j)}</option>`).join('')}</select>${ibtn('delu', 'trash', 'Fshi njësinë', `data-li="${li}" data-k="${k}"`, 'bad')}</div></li>`).join('') || '<li class="empty sm">Ende pa njësi. Nxënësit e shohin këtë nivel si “Së shpejti”.</li>'}</ol>
    <button class="btn sec sm" data-a="addu" data-li="${li}">${ic('plus')} Shto njësi</button>
   </article>`).join('')}
   <details class="how"><summary>Si funksionojnë nivelet për nxënësin?</summary><div class="howg">
    <div><b>Rruga.</b> Çdo njësi ka 7 ditë (fjalor, dialog, gramatikë, përsëritje, të folur, test i javës). Pas njësisë së fundit të nivelit hapet testi i nivelit.</div>
    <div><b>Testi i nivelit.</b> Pyetje nga fjalori, gramatika dhe ndërtimi i fjalive të të gjitha njësive të nivelit. Pyetjet e dialogëve nuk hyjnë në provime. Kalohet me pragun që vendos këtu.</div>
    <div><b>Kalimi përpara.</b> Kush di më shumë shtyp “Kalo me test”. Nëse e kalon, niveli shënohet i kaluar dhe fillon direkt nga niveli tjetër.</div>
    <div><b>Progresi ruhet.</b> Ndryshimet e programit nuk e fshijnë progresin e nxënësve; fjalët dhe mësimet e kryera mbeten.</div>
   </div></details>
  </div></section>`;
}
function unitEditor() {
  const { li, k } = AE, l = CUR.levels[li];
  if (!l) { AE = null; return admin(); }
  const u = k >= 0 && l.units[k] ? l.units[k] : fixU({ n: 0, sq: '', ar: '' });
  const md = lvMode(li), DY = MODES[md].days, rd1 = md === 'text', rd2 = md !== 'dialog';
  const LH = 'Folësi | arabisht | shqip', TH = 'një fjali për rresht: arabisht | shqip';
  const ta = (n, label, val, help, rws, ar) => `<label class="fld"><span>${label}</span>${help ? `<small class="mut">${help}</small>` : ''}<textarea name="${n}" rows="${rws || 6}" spellcheck="false"${ar ? ' class="mixed"' : ''}>${esc(val)}</textarea></label>`;
  const inp = (n, label, val, ar) => `<label class="fld"><span>${label}</span><input name="${n}" value="${esc(val)}"${ar ? ' dir="rtl" class="ar"' : ''}></label>`;
  app.innerHTML = `<section class="band"><div class="wrap adm">
   <button class="link back" data-a="cancel">← Kthehu te paneli</button>
   <h1>${k >= 0 ? 'Ndrysho njësinë' : 'Njësi e re'}</h1>
   <p class="lead">${lvName(li)} · ${esc(l.t)}. Shkruaj një element për rresht dhe ndaji fushat me vijën <code>|</code>. Opsioni i parë te pyetjet është gjithmonë i sakti (radha përzihet vetë).</p>
   <form id="uef" class="uef" novalidate>
    <fieldset><legend>Titulli</legend><div class="adf">${inp('sq', 'Titulli shqip', u.sq)}${inp('ar', 'Titulli arabisht', u.ar, 1)}</div></fieldset>
    <fieldset><legend>Dita 1 · Fjalor i ri</legend>${ta('A', 'Fjalët', ser.words(u.A), 'arabisht | shqip | transliterim', 10)}</fieldset>
    <fieldset><legend>Dita 2 · ${DY[1]}</legend>${inp('D1t', rd1 ? 'Titulli i tekstit' : 'Titulli i dialogut', u.D1.t)}${ta('D1l', rd1 ? 'Teksti' : 'Rreshtat', ser.lines(u.D1.l), rd1 ? TH : LH, 8)}${ta('D1q', 'Pyetjet e kuptimit', ser.qs(u.D1.q), 'pyetja | përgjigjja e saktë | gabim | gabim | gabim', 5)}</fieldset>
    <fieldset><legend>Dita 3 · ${DY[2]}</legend>${inp('Gt', 'Titulli i gramatikës', u.G.t)}${ta('Gh', 'Shpjegimi (HTML i thjeshtë)', u.G.h, 'Lejohen: &lt;p&gt; &lt;b&gt; &lt;h3&gt; &lt;table&gt; &lt;tr&gt; &lt;td class="ar"&gt; &lt;span class="ar"&gt; &lt;p class="note"&gt; …', 10)}
     <details class="prev"><summary>Shiko si duket</summary><div class="gram" id="ghp"></div></details>
     ${ta('Gex', 'Ushtrimet', ser.qs(u.G.ex), 'pyetja | përgjigjja e saktë | gabim | gabim | gabim', 6)}</fieldset>
    <fieldset><legend>Dita 4 · ${DY[3]}</legend>${ta('B', 'Fjalët e reja', ser.words(u.B), 'arabisht | shqip | transliterim', 10)}${inp('D2t', rd2 ? 'Titulli i tekstit' : 'Titulli i dialogut 2', u.D2.t)}${ta('D2l', rd2 ? 'Teksti' : 'Rreshtat', ser.lines(u.D2.l), rd2 ? TH : LH, 8)}${ta('D2q', 'Pyetjet e kuptimit', ser.qs(u.D2.q), 'pyetja | përgjigjja e saktë | gabim | gabim | gabim', 5)}</fieldset>
    <fieldset><legend>Dita 6 · ${DY[5]}</legend>${ta('build', 'Ndërto fjalinë', ser.build(u.build), 'fjalia shqip | fjalët arabisht sipas radhës, të ndara me hapësirë', 5)}${ta('say', 'Thuaje me zë', ser.say(u.say), 'detyra shqip | përgjigjja arabisht', 5)}</fieldset>
    <p class="mut sm">Dita 5 (përsëritje e përzier) dhe dita 7 (testi i javës) krijohen vetë nga përmbajtja më lart. Testi i nivelit merr pyetje nga të gjitha njësitë e nivelit.</p>
    <p class="err" role="alert"></p>
    <div class="row sticky"><button class="btn" type="submit">${ic('check')} Ruaje njësinë</button><button class="btn sec" type="button" data-a="cancel">Anulo</button></div>
   </form>
  </div></section>`;
  const gp = document.getElementById('ghp'); if (gp) gp.innerHTML = safeHTML(u.G.h);
}
async function adminAct(a, t) {
  const ds = t.dataset, li = +ds.li, k = +ds.k;
  if (a === 'cancel') { AE = null; admin(); return scrollTo(0, 0); }
  if (a === 'edu') { AE = { li, k }; unitEditor(); return scrollTo(0, 0); }
  if (a === 'addu') { AE = { li, k: -1 }; unitEditor(); return scrollTo(0, 0); }
  if (a === 'export') {
    const b = new Blob([JSON.stringify({ levels: CUR.levels }, null, 1)], { type: 'application/json' }), url = URL.createObjectURL(b), x = document.createElement('a');
    x.href = url; x.download = 'programi-arabisht-' + today() + '.json'; document.body.appendChild(x); x.click(); x.remove(); setTimeout(() => URL.revokeObjectURL(url), 2000); return;
  }
  if (a === 'reset') {
    if (!armed(t, 'Kliko sërish: rikthehet programi i data.js')) return;
    try { await api('curriculum', { method: 'DELETE' }); setCur(null); toast('U rikthye programi parazgjedhur.'); } catch (x) { toast(esc(x.message)); }
    return admin();
  }
  const c = clone(CUR), L0 = c.levels[li];
  if (a === 'addlv') c.levels.push({ id: nextLvId(c), t: 'Nivel i ri', d: '', pass: PASS, m: 'dialog', units: [] });
  else if (a === 'lvup' || a === 'lvdn') { const j = a === 'lvup' ? li - 1 : li + 1; if (!c.levels[j]) return; [c.levels[li], c.levels[j]] = [c.levels[j], c.levels[li]]; }
  else if (a === 'dellv') {
    if (c.levels.length < 2) return toast('Programi duhet të ketë së paku një nivel.');
    if (!armed(t, L0.units.length ? `Fshi edhe ${L0.units.length} njësi?` : 'Fshi?')) return;
    c.levels.splice(li, 1);
  } else if (a === 'delu') { if (!armed(t, 'Fshi?')) return; L0.units.splice(k, 1); }
  else if (a === 'uup' || a === 'udn') {
    const u = L0.units.splice(k, 1)[0];
    if (a === 'uup') { if (k > 0) L0.units.splice(k - 1, 0, u); else c.levels[li - 1].units.push(u); }
    else { if (k < L0.units.length) L0.units.splice(k + 1, 0, u); else c.levels[li + 1].units.unshift(u); }
  } else return;
  if (await publish(c, t)) admin();
}

/* ---------- INSTALIMI NË TELEFON (iPhone/iPad, Android) ---------- */
const UA = navigator.userAgent;
const IOS = /iPad|iPhone|iPod/.test(UA) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const IPAD = IOS && !/iPhone|iPod/.test(UA);
const ANDROID = /Android/i.test(UA);
const INAPP = /FBAN|FBAV|FB_IAB|Instagram|Line\/|Snapchat|TikTok|musical_ly|Messenger|GSA\//i.test(UA);
const IOS_OTHER = IOS && /CriOS|FxiOS|EdgiOS|OPiOS/.test(UA);
const STANDALONE = () => { try { return matchMedia('(display-mode: standalone)').matches || navigator.standalone === true; } catch (e) { return false; } };
const IXKEY = 'bayna-inst-x';
let BIP = null;
addEventListener('beforeinstallprompt', e => { e.preventDefault(); BIP = e; if (tab === 'home' || tab === 'me') refresh(); });
addEventListener('appinstalled', () => { BIP = null; closeInstall(); toast(`${ic('check')} Aplikacioni u instalua. Gjeje te ekrani i telefonit.`, 'good'); refresh(); });
const showBanner = () => {
  if (STANDALONE() || !(IOS || ANDROID || BIP)) return false;
  let x = 0; try { x = +localStorage.getItem(IXKEY) || 0; } catch (e) {}
  return Date.now() - x > 14 * 864e5;
};
const installBanner = () => showBanner() ? `<div class="nudge inst">${ic('phone')}<div><b>Shkarkoje në ${IOS ? (IPAD ? 'iPad' : 'iPhone') : 'telefon'}</b><span>Me një ikonë në ekran: hapet menjëherë, në ekran të plotë dhe pa internet.</span></div><div class="row"><button class="btn sm" data-inst>${ic('dl')} Shkarko</button><button class="ib" data-instno aria-label="Jo tani" title="Jo tani">${ic('x')}</button></div></div>` : '';
const step = (n, h) => `<li><span class="stn">${n}</span><div>${h}</div></li>`;
const kb = (icon, label) => `<span class="kbd">${icon ? ic(icon) : ''}${label}</span>`;
function installBody() {
  const me = ME(), link = location.origin + '/';
  const acc = me ? `<p class="inote">${ic('user')} Kur ta hapësh nga ikona, hyr me emrin <b>${esc(me.u)}</b> dhe fjalëkalimin. Progresi të pret aty.</p>`
    : IOS ? `<p class="inote warn">${ic('cloud')} <span><b>Krijo llogari para se ta instalosh.</b> Në iPhone, aplikacioni nga ekrani nuk e sheh progresin e ruajtur në Safari. Me llogari, thjesht hyn dhe vazhdon aty ku e le.</span></p>` : '';
  const copy = `<div class="row ic2"><button class="btn sec sm" data-copy="${esc(link)}">${ic('link')} Kopjo linkun</button></div>`;
  if (STANDALONE()) return `<h2>${ic('check')} E ke të instaluar</h2><p class="lead">Po e përdor tashmë si aplikacion. Ikona «Arabisht» është në ekranin e telefonit.</p>`;
  if (BIP && !IOS) return `<h2>Shkarkoje me një prekje</h2><p class="lead">Instalohet si aplikacion, pa Play Store dhe pa zënë vend. Hapet nga ikona në ekran dhe punon pa internet.</p>
    <button class="btn big full" data-instgo>${ic('dl')} Instalo tani</button>${acc}`;
  if (IOS && INAPP) return `<h2>Hape në Safari</h2><p class="lead">Je brenda një aplikacioni tjetër (Instagram, Facebook…). Nga këtu iPhone nuk lejon shtimin në ekran.</p>
    <ol class="steps">${step(1, `Prek ${kb('dots', '')} ose ${kb('', 'Aa')} lart/poshtë dhe zgjidh ${kb('compass', 'Open in Safari')}.`)}${step(2, 'Ose kopjo linkun dhe ngjite te Safari.')}</ol>${copy}`;
  if (IOS && IOS_OTHER) return `<h2>Shtoje në ekranin e ${IPAD ? 'iPad-it' : 'iPhone-it'}</h2>
    <ol class="steps">${step(1, `Prek ${kb('share', 'Ndaj')} te shiriti i adresës (lart djathtas).`)}${step(2, `Zgjidh ${kb('addsq', 'Add to Home Screen')} («Shto në ekranin bazë»).`)}${step(3, `Prek ${kb('', 'Add')} («Shto»).`)}</ol>
    <p class="mut sm">S'e gjen? Hape faqen në Safari dhe ndiq hapat atje.</p>${copy}${acc}`;
  if (IOS) return `<h2>Shtoje në ekranin e ${IPAD ? 'iPad-it' : 'iPhone-it'}</h2><p class="lead">Tri prekje, pa App Store. Pastaj e hap si çdo aplikacion tjetër.</p>
    <ol class="steps">
     ${step(1, `Prek butonin ${kb('share', 'Ndaj')} ${IPAD ? 'lart djathtas' : 'poshtë në mes'}.<small>Në iOS 26: prek ${kb('dots', '')} poshtë djathtas, pastaj ${kb('share', 'Share')}.</small>`)}
     ${step(2, `Rrëshqit poshtë dhe prek ${kb('addsq', 'Add to Home Screen')}<small>(«Shto në ekranin bazë»). Nëse nuk duket, prek «View More» / «Më shumë».</small>`)}
     ${step(3, `Lëre të ndezur «Open as Web App» dhe prek ${kb('', 'Add')} lart djathtas.`)}
    </ol>
    <p class="mut sm">${ic('check')} Ikona «Arabisht» del në ekran. Hapet në ekran të plotë dhe punon edhe pa internet.</p>${acc}`;
  if (ANDROID) return `<h2>Shkarkoje në telefon</h2>
    <ol class="steps">${step(1, `Prek ${kb('dots', '')} lart djathtas te Chrome.`)}${step(2, `Zgjidh ${kb('dl', 'Instalo aplikacionin')} ose ${kb('addsq', 'Shto në ekranin kryesor')}.`)}${step(3, 'Konfirmo. Ikona del në ekran.')}</ol>${acc}`;
  return `<h2>Shkarkoje në telefon</h2><p class="lead">Hape këtë faqe në telefon (Safari në iPhone, Chrome në Android) dhe shtyp «Shkarko».</p>
    <div class="ilink">${esc(link)}</div>${copy}`;
}
function installSheet() {
  closeInstall();
  const w = document.createElement('div');
  w.className = 'isheet'; w.setAttribute('role', 'dialog'); w.setAttribute('aria-modal', 'true'); w.setAttribute('aria-label', 'Shkarko aplikacionin');
  w.innerHTML = `<div class="ibg" data-instx></div><div class="ipanel"><button class="x" data-instx aria-label="Mbyll">${ic('x')}</button>
    <div class="iapp"><img src="/icons/apple-touch-icon.png" alt="" width="64" height="64"><div><b>Arabisht</b><span>Mëso arabisht nga shqipja · falas</span></div></div>
    ${installBody()}
    ${navigator.share ? `<button class="link ishare" data-ishare>${ic('share')} Dërgoja një shoku</button>` : ''}</div>`;
  document.body.appendChild(w);
  requestAnimationFrame(() => w.classList.add('on'));
  const b = w.querySelector('[data-instgo]') || w.querySelector('.x'); if (b) b.focus({ preventScroll: true });
}
function closeInstall() { const w = document.querySelector('.isheet'); if (w) w.remove(); if (location.hash === '#install') try { history.replaceState(null, '', location.pathname); } catch (e) {} }
document.addEventListener('click', async e => {
  const t = e.target.closest('[data-inst],[data-instx],[data-instgo],[data-instno],[data-copy],[data-ishare]'); if (!t) return;
  const ds = t.dataset;
  if (ds.inst !== undefined) { sfx('tap'); return installSheet(); }
  if (ds.instx !== undefined) return closeInstall();
  if (ds.instno !== undefined) { try { localStorage.setItem(IXKEY, String(Date.now())); } catch (x) {} const n = t.closest('.band'); if (n) n.remove(); return; }
  if (ds.instgo !== undefined && BIP) { const p = BIP; BIP = null; p.prompt(); try { await p.userChoice; } catch (x) {} closeInstall(); return refresh(); }
  if (ds.copy !== undefined) { try { await navigator.clipboard.writeText(ds.copy); toast(`${ic('check')} Linku u kopjua. Ngjite te Safari.`, 'good'); } catch (x) { prompt('Kopjo linkun:', ds.copy); } return; }
  if (ds.ishare !== undefined) { try { await navigator.share({ title: 'Mëso Arabisht', text: 'Mëso arabisht nga shqipja, 15 minuta në ditë. Falas.', url: location.origin + '/#install' }); } catch (x) {} }
});
document.addEventListener('keydown', e => { if (e.key === 'Escape' && document.querySelector('.isheet')) { e.stopImmediatePropagation(); closeInstall(); } }, true);

/* ---------- MËSIMI ---------- */
let L = null, Q = null, R = null;
function startLesson(i) {
  if (!unlocked(i)) return;
  document.body.classList.add('inlesson'); top.innerHTML = '';
  L = { i, st: steps(i).filter(s => s.k !== 'quiz' || s.q.length), s: 0, ok: 0, tot: 0, xp: 0, miss: 0, t0: Date.now(), xp0: xpToday() };
  sfx('tap'); renderStep();
}
function startLevelTest(li) {
  if (!LV[li] || !LVI[li].length || !lvOpen(li)) return;
  const q = lvQuestions(li); if (!q.length) return toast('Ky nivel nuk ka ende pyetje për test.');
  document.body.classList.add('inlesson'); top.innerHTML = '';
  const passed = lvPassed(li), skipping = !passed && !lvAllDone(li), last = li >= LV.length - 1;
  const intro = `<div class="center lvintro"><div class="lvbig">${ic('trophy')}</div><p class="k">${lvName(li)} · ${esc(LV[li].t)}</p><h2>Testi i ${lvGen(li)}</h2>
    <p class="lead" style="margin:0 auto 16px">${skipping ? `E di tashmë këtë nivel? Nëse e kalon testin, ${last ? 'niveli shënohet si i kaluar' : `hapet menjëherë <b>${lvName(li + 1)}</b> dhe fillon prej andej`}. Nëse jo, vazhdon mësimet si zakonisht. Nuk humb asgjë.` : passed ? 'E ke kaluar këtë nivel. Bëje sërish për ushtrim.' : `Testi përfundimtar i nivelit. Kur e kalon, ${last ? 'e përfundon programin' : `hapet <b>${lvName(li + 1)}</b>`}.`}</p>
    <div class="lvfacts"><span>${ic('target')} <b>${q.length}</b> pyetje</span><span>${ic('trophy')} duhen <b>${lvPass(li)}%</b></span><span>${ic('layers')} ${LVI[li].length} njësi</span></div>
    <p class="mut sm">Në test gabimet nuk përsëriten. Përgjigju me qetësi.</p></div>`;
  L = { i: -1, lv: li, first: !passed, st: [{ k: 'intro', h: intro }, { k: 'quiz', test: true, q }], s: 0, ok: 0, tot: 0, xp: 0, miss: 0, t0: Date.now(), xp0: xpToday() };
  sfx('tap'); renderStep();
}
const bar = (frac, label, combo) => `<div class="lbar"><div class="lrow"><button class="x" data-quit aria-label="Mbyll mësimin">${ic('x')}</button><div class="prog" role="progressbar" aria-label="${esc(label)}" aria-valuenow="${Math.round(frac * 100)}" aria-valuemin="0" aria-valuemax="100"><b style="width:${Math.max(3, Math.round(frac * 100))}%"></b></div><span class="combo${combo >= 2 ? ' on' : ''}">${ic('flame')}${combo || 0}</span></div><div class="llab">${esc(label)}</div></div>`;
function renderStep() {
  if (L.s >= L.st.length) return complete();
  const st = L.st[L.s], d = DAYS[L.i], lab = L.lv !== undefined ? 'Testi i ' + lvGen(L.lv) : lvName(UL[d.ui]) + ' · Njësia ' + (d.ui + 1) + ' · ' + dname(d.ui, d.di);
  if (st.k === 'quiz') { Q = { items: st.q.slice(), n: 0, total: st.q.length, ok: 0, test: !!st.test, lab, combo: 0 }; renderQ(); return; }
  let h = '';
  if (st.k === 'cards') h = `<h2>Fjalët e reja</h2><p class="lead">Prek secilën kartë për ta dëgjuar. Thuaje me zë dy herë dhe lidhe me një situatë nga jeta jote.</p><div class="cards">${st.w.map((w, j) => `<button class="card" style="--i:${j}" data-say="${esc(w[0])}"><span class="ar">${esc(w[0])}</span>${S.tr && MODES[uMode(d.ui)].tr && w[2] ? `<span class="tr">${esc(w[2])}</span>` : ''}<span class="sq">${esc(w[1])}</span><span class="spk">${ic('sound')}</span></button>`).join('')}</div>`;
  if (st.k === 'dialog') { L.lines = st.d.l.map(l => l[1]); h = `<h2>${esc(st.d.t)}</h2><p class="lead">1) Dëgjoje të gjithin pa përkthim. 2) Prek çdo rresht për përkthimin. 3) Lexoje me zë, duke luajtur njërin nga personat.</p><div class="row"><button class="btn sec" data-all>${ic('play')} Dëgjo dialogun</button><button class="btn sec" data-showall>${ic('eye')} Shfaq përkthimet</button></div><div class="dl">${st.d.l.map((l, j) => `<div class="line ${j % 2 ? 'r' : ''}" style="--i:${j}"><span class="who">${esc(l[0])}</span><div class="bub"><div class="ar" data-tog>${esc(l[1])}</div><div class="sq">${esc(l[2])}</div></div><button class="play" data-say="${esc(l[1])}" aria-label="Dëgjo">${ic('sound')}</button></div>`).join('')}</div>`; }
  if (st.k === 'read') { L.lines = [st.d.l.map(l => l[1]).join(' ')]; h = `<h2>${esc(st.d.t)}</h2><p class="lead">1) Dëgjoje tekstin. 2) Lexoje me zë, fjali pas fjalie. 3) Prek një fjali që nuk e kupton për ta parë përkthimin.</p><div class="row"><button class="btn sec" data-all>${ic('play')} Dëgjo tekstin</button><button class="btn sec" data-showall>${ic('eye')} Shfaq përkthimet</button></div><div class="rtext">${st.d.l.map((l, j) => `<div class="line" style="--i:${j}">${l[0] ? `<span class="who">${esc(l[0])}</span>` : ''}<span class="ar" data-tog>${esc(l[1])}</span> <span class="sq">${esc(l[2])}</span></div>`).join('')}</div>`; }
  if (st.k === 'gram') h = `<h2>${esc(st.g.t)}</h2><p class="lead">Lexoje ngadalë. Mbulo kolonën shqip dhe provo t'i kujtosh kuptimet. Pastaj vijnë ushtrimet.</p><div class="gram">${safeHTML(st.g.h)}</div>`;
  if (st.k === 'intro') h = st.h;
  app.innerHTML = bar(L.s / L.st.length, lab, 0) + `<section class="band lesson"><div class="wrap">${h}</div></section><div class="dock"><div class="din"><button class="btn big full" data-next>${st.k === 'intro' ? 'Fillo testin' : 'Vazhdo'}</button></div></div>`;
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
    const isLv = L.lv !== undefined, need = isLv ? lvPass(L.lv) : PASS;
    const pct = Q.total ? Math.round(Q.ok / Q.total * 100) : 100;
    if (pct < need) {
      sfx('no');
      const skipping = isLv && L.first && !lvAllDone(L.lv);
      const msg = skipping ? `Për ta kaluar ${lvName(L.lv)} me test të duhen ${need}%. S'ka problem: vazhdo mësimet e nivelit dhe testi të pret në fund.`
        : `Për ta kaluar testin të duhen ${need}%. Përsërit fjalët te Fjalori dhe gramatikën, pastaj provo sërish. Nuk ka afat.`;
      app.innerHTML = bar(1, Q.lab, 0) + `<section class="band"><div class="q center fail"><div class="score">${ring(pct, 100, 'big')}<b data-count="${pct}" data-suf="%">0%</b></div><h2>Edhe pak!</h2><p class="lead" style="margin:0 auto 16px">${msg}</p><div class="row" style="justify-content:center"><button class="btn big" ${isLv ? `data-lvt="${L.lv}"` : `data-go="${L.i}"`}>Provo sërish</button><button class="btn sec" data-home>${skipping ? 'Vazhdo mësimet' : 'Kthehu'}</button></div></div></section>`;
      countUp(); return;
    }
    if (isLv) { const id = LV[L.lv].id; S.lv[id] = Math.max(S.lv[id] || 0, pct); }
    else { const u = U[DAYS[L.i].ui]; S.scores['u' + u.n] = Math.max(S.scores['u' + u.n] || 0, pct); }
    L.pct = pct;
  }
  L.s++; if (L.s < L.st.length) return renderStep();
  complete();
}
let AFTER = null;
function complete() {
  if (L.lv !== undefined) return completeLevel();
  const d = DAYS[L.i], u = U[d.ui], first = !S.done[d.id];
  if (first) S.done[d.id] = today();
  const add = d.di === 0 ? u.A : d.di === 3 ? u.B : [];
  add.forEach(w => { if (!S.cards[w[0]]) S.cards[w[0]] = { sq: w[1], b: 0, due: dayAt(1) }; });
  const perfect = L.tot > 0 && L.miss === 0, bonus = (first ? 20 : 5) + (perfect ? 10 : 0);
  addXP(bonus); if (L.xp0 < S.goal && xpToday() >= S.goal) L.goalHit = true;
  const act = activity(), nb = checkBadges(); save();
  results({ title: d.di === 6 ? `Njësia ${d.ui + 1} u krye!` : 'Mësimi u krye!', xp: L.xp + bonus, acc: L.tot ? Math.round(L.ok / L.tot * 100) : 100, ms: Date.now() - L.t0, perfect, words: add.length, goalHit: L.goalHit, act, nb, pct: L.pct });
}
function completeLevel() {
  const li = L.lv, first = L.first, perfect = L.tot > 0 && L.miss === 0, bonus = (first ? 50 : 10) + (perfect ? 10 : 0);
  addXP(bonus); if (L.xp0 < S.goal && xpToday() >= S.goal) L.goalHit = true;
  const act = activity(), nb = checkBadges(); save();
  const nxt = li < LV.length - 1 ? li + 1 : -1;
  results({ title: `${lvName(li)} u kalua!`, xp: L.xp + bonus, acc: L.tot ? Math.round(L.ok / L.tot * 100) : 100, ms: Date.now() - L.t0, perfect, words: 0, goalHit: L.goalHit, act, nb, pct: L.pct,
    unlock: first && nxt >= 0 ? `${lvName(nxt)}: ${LV[nxt].t}${LVI[nxt].length ? '' : ' (së shpejti)'}` : '' });
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
   <div class="chipsrow">${r.perfect ? `<span class="pill gold">${ic('gem')} Pa asnjë gabim · +10 XP</span>` : ''}${r.goalHit ? `<span class="pill ok">${ic('target')} Qëllimi i ditës u arrit!</span>` : ''}${r.words ? `<span class="pill">${ic('book')} ${r.words} fjalë të reja në përsëritje</span>` : ''}${r.pct ? `<span class="pill ok">${ic('trophy')} Testi: ${r.pct}%</span>` : ''}${r.unlock ? `<span class="pill gold">${ic('layers')} U hap ${esc(r.unlock)}</span>` : ''}</div>
   ${motivCard(pick(MOTIV.filter(q => q.k === 'Gara' || q.k === 'Gjuha')), false)}
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
  if (ds.a !== undefined) return adminAct(ds.a, t);
  if (ds.lbp !== undefined) { lbP = ds.lbp; LBE = null; sfx('tap'); return rank(); }
  if (ds.lbr !== undefined) { LBE = null; delete LBC[lbP]; rank(); return loadLB(true); }
  if (ds.lbon !== undefined) { S.lb = true; save(); LBC = {}; LBE = null; toast(`${ic('check')} Tani duksh në renditje.`, 'good'); return rank(); }
  if (ds.lbhide !== undefined) {
    if (!armed(t, 'Hiqe?')) return;
    return api('leaderboard', { method: 'POST', body: { action: 'hide', u: ds.lbhide } }).then(() => { toast('U hoq nga renditja.'); LBC = {}; rank(); }).catch(x => toast(esc(x.message)));
  }
  if (ds.go !== undefined) return startLesson(+ds.go);
  if (ds.lvt !== undefined) return startLevelTest(+ds.lvt);
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
  if (f.id === 'uef') {
    if (!AE) return;
    const { u, errs } = parseUnit(f);
    if (errs.length) { err.innerHTML = errs.slice(0, 6).map(esc).join('<br>') + (errs.length > 6 ? `<br>… dhe ${errs.length - 6} të tjera` : ''); err.scrollIntoView({ block: 'center', behavior: 'smooth' }); sfx('no'); return; }
    err.textContent = '';
    const c = clone(CUR), lvl = c.levels[AE.li];
    if (!lvl) return;
    if (AE.k >= 0 && lvl.units[AE.k]) lvl.units[AE.k] = { ...u, n: lvl.units[AE.k].n }; else lvl.units.push({ ...u, n: nextN(c) });
    if (await publish(c, b)) { AE = null; admin(); scrollTo(0, 0); }
    return;
  }
  const run = async (body, ok) => { err.textContent = ''; b.disabled = true; b.classList.add('busy'); try { await api('auth', { method: 'POST', body }); ok(); } catch (x) { err.textContent = x.message; sfx('no'); } finally { b.disabled = false; b.classList.remove('busy'); } };
  if (f.id === 'pwf') { if (f.np.value.length < 6) { err.textContent = 'Fjalëkalimi i ri duhet të ketë së paku 6 shenja.'; return; } return run({ action: 'password', password: f.p.value, newPassword: f.np.value }, () => { toast(`${ic('check')} Fjalëkalimi u ndryshua.`, 'good'); f.reset(); f.closest('details').open = false; }); }
  if (f.id === 'delf') return run({ action: 'delete', password: f.p.value }, () => { clearAccount(); toast('Llogaria u fshi.'); });
});
app.addEventListener('input', e => {
  if (e.target.id === 'dq') { dq = e.target.value; renderWords(); }
  if (e.target.name === 'Gh') { const p = document.getElementById('ghp'); if (p) p.innerHTML = safeHTML(e.target.value); }
});
app.addEventListener('change', async e => {
  const id = e.target.id, ds = e.target.dataset;
  if (ds.lf !== undefined && isAdm()) {
    const c = clone(CUR), l = c.levels[+ds.li]; if (!l) return;
    let v = e.target.value.trim();
    if (ds.lf === 'pass') { v = Math.min(100, Math.max(50, Math.round(+v) || PASS)); e.target.value = v; }
    if (ds.lf === 't' && !v) { e.target.value = l.t; return; }
    if (l[ds.lf] === v) return;
    l[ds.lf] = v; if (!(await publish(c))) admin();
    return;
  }
  if (ds.mv !== undefined && isAdm()) {
    const c = clone(CUR), from = c.levels[+ds.li], to = c.levels[+e.target.value]; if (!from || !to || from === to) return;
    to.units.push(from.units.splice(+ds.k, 1)[0]);
    await publish(c); return admin();
  }
  if (id === 'impf' && isAdm()) {
    const file = e.target.files && e.target.files[0]; e.target.value = ''; if (!file) return;
    let j; try { j = JSON.parse(await file.text()); } catch (x) { return toast('Skedari nuk është JSON i vlefshëm.'); }
    const lv = Array.isArray(j) ? j : j && j.levels;
    if (!Array.isArray(lv) || !lv.length) return toast('Skedari duhet të ketë “levels”: [ … ].');
    if (await publish({ levels: lv })) admin();
    return;
  }
  if (id === 'tr') { S.tr = e.target.checked; save(); }
  if (id === 'free') { S.free = e.target.checked; save(); }
  if (id === 'lbon') { S.lb = e.target.checked; save(); LBC = {}; buzz(8); }
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
if (h0 === 'install') installSheet();
fetchCur();
if (ME()) pull();
addEventListener('hashchange', () => { const h = location.hash.slice(1); if (h === 'install') return installSheet(); if (VIEWS[h] && h !== tab && !document.body.classList.contains('inlesson')) setTab(h); });
setInterval(() => { if (tab === 'me') paintSync(); }, 30000);
if ('serviceWorker' in navigator && location.protocol === 'https:') addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}));
})();
