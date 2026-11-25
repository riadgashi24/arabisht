/* Programi mësimor (nivelet dhe njësitë).
   GET    /api/curriculum            → {cur}  (null = përdoret programi parazgjedhur nga assets/data.js)
   PUT    /api/curriculum {cur, base} → {cur}  vetëm administratori; base = versioni (v) mbi të cilin u bë ndryshimi
   DELETE /api/curriculum            → {cur:null}  vetëm administratori; rikthen parazgjedhjen */
'use strict';
const { db, auth, isAdmin, body, send, wrap } = require('./_lib');

const KEY = 'curriculum';
const MAX = 1500000;

const str = (x, m = 500) => String(x == null ? '' : x).trim().slice(0, m);
const arr = (x, m) => Array.isArray(x) ? x.slice(0, m) : [];
const ob = x => x && typeof x === 'object' && !Array.isArray(x) ? x : {};

const word = w => { const a = arr(w, 3).map(s => str(s, 200)); return a[0] && a[1] ? [a[0], a[1], a[2] || ''] : null; };
const ques = x => {
  x = ob(x);
  const p = str(x.p, 500), o = arr(x.o, 6).map(s => str(s, 300)).filter(Boolean);
  if (!p || o.length < 2) return null;
  return x.ar ? { p, o, ar: 1 } : { p, o };
};
const dlg = d => {
  d = ob(d);
  return {
    t: str(d.t, 200),
    l: arr(d.l, 80).map(l => arr(l, 3).map(s => str(s, 600))).filter(l => l[1]).map(l => [l[0] || '', l[1], l[2] || '']),
    q: arr(d.q, 40).map(ques).filter(Boolean),
  };
};
function unit(u) {
  u = ob(u);
  const n = Math.floor(+u.n);
  if (!(n > 0 && n < 1e6)) throw new Error('Një njësi nuk ka numër (n) të vlefshëm.');
  const g = ob(u.G);
  return {
    n, ar: str(u.ar, 200), sq: str(u.sq, 200) || 'Njësi pa titull',
    A: arr(u.A, 120).map(word).filter(Boolean),
    B: arr(u.B, 120).map(word).filter(Boolean),
    D1: dlg(u.D1), D2: dlg(u.D2),
    G: { t: str(g.t, 200), h: str(g.h, 30000), ex: arr(g.ex, 40).map(ques).filter(Boolean) },
    build: arr(u.build, 40).map(b => [str(arr(b, 2)[0], 300), arr(arr(b, 2)[1], 25).map(s => str(s, 100)).filter(Boolean)]).filter(b => b[0] && b[1].length),
    say: arr(u.say, 40).map(s => arr(s, 2).map(x => str(x, 300))).filter(s => s[0] && s[1]),
  };
}
function clean(c) {
  c = ob(c);
  const levels = arr(c.levels, 30), ids = new Set(), ns = new Set(), out = [];
  if (!levels.length) throw new Error('Programi duhet të ketë së paku një nivel.');
  for (const l0 of levels) {
    const l = ob(l0), id = str(l.id, 24);
    if (!/^[A-Za-z0-9_-]{1,24}$/.test(id) || ids.has(id)) throw new Error('Çdo nivel duhet të ketë një id të vetëm.');
    ids.add(id);
    const units = arr(l.units, 100).map(unit);
    units.forEach(u => { if (ns.has(u.n)) throw new Error('Dy njësi kanë të njëjtin numër (n = ' + u.n + ').'); ns.add(u.n); });
    const pass = Math.round(+l.pass) || 80;
    const m = ['dialog', 'read', 'text'].includes(l.m) ? l.m : 'dialog';
    out.push({ id, t: str(l.t, 120) || 'Nivel', d: str(l.d, 400), pass: Math.min(100, Math.max(50, pass)), m, units });
  }
  return { levels: out };
}

module.exports = wrap(async (req, res) => {
  if (req.method === 'GET') {
    const d = await db.get(KEY);
    return send(res, 200, { cur: d ? JSON.parse(d) : null });
  }

  const me = await auth(req);
  if (!me) return send(res, 401, { error: 'Seanca ka skaduar. Hyr sërish.' });
  if (!isAdmin(me)) return send(res, 403, { error: 'Vetëm administratori mund ta ndryshojë programin.' });

  const old = await db.get(KEY), oldV = old ? +JSON.parse(old).v || 0 : 0;

  if (req.method === 'DELETE') {
    await db.del(KEY);
    return send(res, 200, { cur: null });
  }

  if (req.method === 'PUT' || req.method === 'POST') {
    const b = await body(req, MAX + 10000);
    if (!b || typeof b !== 'object') return send(res, 400, { error: 'Kërkesë e pavlefshme.' });
    if (b.base !== undefined && +b.base !== oldV) return send(res, 409, { error: 'Programi u ndryshua ndërkohë (nga një administrator tjetër ose në një dritare tjetër). U ngarkua versioni i fundit, provo sërish.' });
    let cur;
    try { cur = clean(b.cur); } catch (e) { return send(res, 400, { error: e.message }); }
    cur.v = Math.max(Date.now(), oldV + 1);
    cur.by = me;
    const s = JSON.stringify(cur);
    if (s.length > MAX) return send(res, 413, { error: 'Programi është shumë i madh.' });
    await db.set(KEY, s);
    return send(res, 200, { cur });
  }

  return send(res, 405, { error: 'Metoda nuk lejohet.' });
});
