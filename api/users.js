/* Menaxhimi i përdoruesve (vetëm administratori).
   GET  /api/users?q=  → {users:[{u, c, a, sa, dis, ban, xp, s, l, last}], total, super}
   POST /api/users {action, u}
        password → vendos fjalëkalim të përkohshëm dhe e kthen {pw}; mbyll seancat
        logout   → e nxjerr nga të gjitha pajisjet
        disable / enable → blloko / zhblloko llogarinë
        hide / unhide    → hiq / rikthe në renditje
        admin / unadmin  → jep / hiq të drejtën e administratorit (vetëm administratori kryesor, nga ADMIN_USERS)
        delete   → fshin llogarinë, progresin, renditjen dhe grupet */
'use strict';
const crypto = require('crypto');
const { db, auth, isAdmin, adminOf, userIdxAll, userIdxDel, lbRemove, hashPw, body, send, wrap } = require('./_lib');

const UN = /^[a-z0-9_.]{3,20}$/;
const MAXL = 300;
const parse = v => { try { return JSON.parse(v) || {}; } catch (e) { return {}; } };
const tempPw = () => { const A = 'abcdefghjkmnpqrstuvwxyz23456789'; return Array.from(crypto.randomBytes(8), b => A[b % A.length]).join(''); };

module.exports = wrap(async (req, res) => {
  const me = await auth(req);
  if (!me) return send(res, 401, { error: 'Seanca ka skaduar. Hyr sërish.' });
  if (!(await adminOf(me))) return send(res, 403, { error: 'Vetëm administratori.' });
  const sup = isAdmin(me);

  if (req.method === 'GET') {
    const q = String(new URL(req.url, 'http://x').searchParams.get('q') || '').trim().toLowerCase();
    const all = (await userIdxAll()).sort((a, b) => b[1] - a[1]);
    const hit = q ? all.filter(([u]) => u.includes(q)) : all, page = hit.slice(0, MAXL), us = page.map(x => x[0]);
    const [recs, metas, bans] = await Promise.all([db.mget(us.map(u => 'user:' + u)), db.mget(us.map(u => 'lbm:' + u)), db.mget(us.map(u => 'lbban:' + u))]);
    const users = [];
    us.forEach((u, i) => {
      if (!recs[i]) return;   /* llogari e fshirë: hiqet nga lista */
      const r = parse(recs[i]), m = parse(metas[i]);
      users.push({ u, c: +r.c || 0, a: isAdmin(u) || !!r.a, sa: isAdmin(u), dis: !!r.dis, ban: !!bans[i], xp: +m.a || 0, s: +m.s || 0, l: +m.l || 0, last: m.pd || '' });
    });
    const gone = us.filter((u, i) => !recs[i]); for (const u of gone) await userIdxDel(u);
    return send(res, 200, { users, total: hit.length - gone.length, shown: users.length, super: sup, me });
  }

  if (req.method !== 'POST') return send(res, 405, { error: 'Metoda nuk lejohet.' });
  const b = await body(req), a = b && b.action, u = String((b && b.u) || '').trim().toLowerCase();
  if (!UN.test(u)) return send(res, 400, { error: 'Emër i pavlefshëm.' });
  const raw = await db.get('user:' + u);
  if (!raw) return send(res, 404, { error: 'Ky përdorues nuk ekziston.' });
  const rec = parse(raw), save = () => db.set('user:' + u, JSON.stringify(rec));
  const self = u === me, target = isAdmin(u) || !!rec.a;
  /* një administrator i zakonshëm nuk prek administratorët e tjerë; askush nuk prek administratorët kryesorë */
  if (!self && (isAdmin(u) || (target && !sup))) return send(res, 403, { error: 'Nuk mund ta ndryshosh një administrator tjetër.' });

  if (a === 'hide') { await db.set('lbban:' + u, '1'); await lbRemove(u); return send(res, 200, { ok: true }); }
  if (a === 'unhide') { await db.del('lbban:' + u); return send(res, 200, { ok: true }); }

  if (self) return send(res, 400, { error: 'Llogarinë tënde ndryshoje te Profili.' });

  if (a === 'password') { const pw = tempPw(); rec.h = await hashPw(pw); rec.rv = Date.now(); await save(); await db.del('rl:' + u); return send(res, 200, { ok: true, pw }); }
  if (a === 'logout') { rec.rv = Date.now(); await save(); return send(res, 200, { ok: true }); }
  if (a === 'disable') { rec.dis = true; rec.rv = Date.now(); await save(); return send(res, 200, { ok: true }); }
  if (a === 'enable') { delete rec.dis; await save(); return send(res, 200, { ok: true }); }
  if (a === 'admin' || a === 'unadmin') {
    if (!sup) return send(res, 403, { error: 'Vetëm administratori kryesor jep ose heq të drejtën e administratorit.' });
    if (a === 'admin') rec.a = true; else delete rec.a;
    await save(); return send(res, 200, { ok: true });
  }
  if (a === 'delete') {
    await db.del('user:' + u, 'prog:' + u, 'lbban:' + u);
    try { await userIdxDel(u); await lbRemove(u, true); await require('./_groups').purgeUser(u); } catch (e) { console.error(e); }
    return send(res, 200, { ok: true });
  }
  return send(res, 400, { error: 'Veprim i panjohur.' });
});
