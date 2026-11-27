/* POST /api/auth  {action: signup|login|logout|password|delete, username, password, newPassword} */
'use strict';
const { db, adminOf, userIdxAdd, userIdxDel, lbRemove, hashPw, checkPw, newSession, auth, bearer, th, body, send, ip, wrap } = require('./_lib');

const UN = /^[a-z0-9_.]{3,20}$/;
const UN_MSG = 'Emri: 3–20 shenja, vetëm shkronja latine (pa ë/ç), numra, _ ose pikë.';
const PW_OK = p => p.length >= 6 && p.length <= 200;
const PW_MSG = 'Fjalëkalimi duhet të ketë së paku 6 shenja.';

module.exports = wrap(async (req, res) => {
  if (req.method !== 'POST') return send(res, 405, { error: 'Metoda nuk lejohet.' });
  const b = await body(req);
  if (!b || typeof b !== 'object') return send(res, 400, { error: 'Kërkesë e pavlefshme.' });
  const a = b.action, u = String(b.username || '').trim().toLowerCase(), p = String(b.password || '');

  if (a === 'signup' || a === 'login') {
    if (!UN.test(u)) return send(res, 400, { error: UN_MSG });
    if (!PW_OK(p)) return send(res, 400, { error: PW_MSG });
  }

  if (a === 'signup') {
    if ((await db.incr('rls:' + ip(req), 3600)) > 20) return send(res, 429, { error: 'Shumë llogari nga kjo lidhje. Provo më vonë.' });
    const rec = JSON.stringify({ h: await hashPw(p), c: Date.now() });
    if (!(await db.set('user:' + u, rec, { nx: true }))) return send(res, 409, { error: 'Ky emër është i zënë. Provo një tjetër.' });
    try { await userIdxAdd(u); } catch (e) { console.error(e); }
    return send(res, 200, { username: u, token: await newSession(u), data: null, admin: await adminOf(u) });
  }

  if (a === 'login') {
    if ((await db.incr('rl:' + u, 900)) > 10) return send(res, 429, { error: 'Shumë përpjekje. Provo sërish pas 15 minutash.' });
    const rec = await db.get('user:' + u);
    if (!rec || !(await checkPw(p, JSON.parse(rec).h))) return send(res, 401, { error: 'Emri ose fjalëkalimi është gabim.' });
    await db.del('rl:' + u);
    if (JSON.parse(rec).dis) return send(res, 403, { error: 'Kjo llogari është bllokuar nga administratori.' });
    const d = await db.get('prog:' + u);
    return send(res, 200, { username: u, token: await newSession(u), data: d ? JSON.parse(d) : null, admin: await adminOf(u) });
  }

  if (a === 'logout') {
    const t = bearer(req);
    if (t && t.length <= 100) await db.del('sess:' + th(t));
    return send(res, 200, { ok: true });
  }

  const me = await auth(req);
  if (!me) return send(res, 401, { error: 'Seanca ka skaduar. Hyr sërish.' });
  if ((await db.incr('rl:' + me, 900)) > 10) return send(res, 429, { error: 'Shumë përpjekje. Provo sërish pas 15 minutash.' });
  const rec = JSON.parse(await db.get('user:' + me));
  if (!(await checkPw(p, rec.h))) return send(res, 403, { error: 'Fjalëkalimi aktual është gabim.' });
  await db.del('rl:' + me);

  if (a === 'password') {
    const np = String(b.newPassword || '');
    if (!PW_OK(np)) return send(res, 400, { error: PW_MSG });
    rec.h = await hashPw(np);
    await db.set('user:' + me, JSON.stringify(rec));
    return send(res, 200, { ok: true });
  }

  if (a === 'delete') {
    await db.del('user:' + me, 'prog:' + me, 'sess:' + th(bearer(req)));
    try { await userIdxDel(me); await lbRemove(me, true); await require('./_groups').purgeUser(me); } catch (e) { console.error(e); }
    return send(res, 200, { ok: true });
  }

  return send(res, 400, { error: 'Veprim i panjohur.' });
});
