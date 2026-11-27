/* Renditja.
   GET  /api/leaderboard?p=d|w|m|a  → {p, period, top:[{u, xp, s, l}], me:{u, rank, score}|null, total}
        d = sot, w = java (e hënë–e diel), m = muaji, a = gjithsej. Lexohet nga të gjithë; "me" vetëm me seancë.
   POST /api/leaderboard {action:'hide'|'unhide', u}  vetëm administratori: heq / rikthen një përdorues (p.sh. për mashtrim) */
'use strict';
const { db, auth, adminOf, periods, LBK, lbRemove, lbPick, body, send, wrap } = require('./_lib');
const G = require('./_groups');

const TOP = 50;

module.exports = wrap(async (req, res) => {
  if (req.method === 'GET') {
    const sp = new URL(req.url, 'http://x').searchParams, q = sp.get('p');
    const p = ['d', 'w', 'm', 'a'].includes(q) ? q : 'w', P = periods(), k = LBK(P)[p];
    if (sp.get('g')) {   /* renditja brenda një grupi: të gjithë anëtarët, edhe me 0 pikë */
      const me = await auth(req);
      if (!me) return send(res, 401, { error: 'Hyr në llogari.' });
      const g = await G.getG(sp.get('g'));
      if (!g || !g.members.includes(me)) return send(res, 404, { error: 'Nuk je më anëtar i këtij grupi.' });
      const metas = await db.mget(g.members.map(u => 'lbm:' + u));
      const rows = g.members.map((u, i) => { let m = {}; try { m = JSON.parse(metas[i]) || {}; } catch (e) {} return { u, xp: lbPick(m, p, P), s: +m.s || 0, l: +m.l || 0 }; })
        .sort((a, b) => b.xp - a.xp || (a.u < b.u ? -1 : 1));
      const i = rows.findIndex(r => r.u === me);
      return send(res, 200, { p, period: P, top: rows, me: { u: me, rank: i + 1, score: rows[i].xp }, total: rows.length, group: G.pub(g) });
    }
    const top = await db.ztop(k, TOP);
    const metas = await db.mget(top.map(([u]) => 'lbm:' + u));
    const list = top.map(([u, xp], i) => { let m = {}; try { m = JSON.parse(metas[i]) || {}; } catch (e) {} return { u, xp, s: +m.s || 0, l: +m.l || 0 }; });
    const me = await auth(req);
    const mine = me ? await db.zme(k, me) : null;
    return send(res, 200, { p, period: P, top: list, me: me ? { u: me, rank: mine ? mine.rank : 0, score: mine ? mine.score : 0 } : null, total: await db.zcard(k), admin: await adminOf(me) });
  }

  if (req.method === 'POST') {
    const me = await auth(req);
    if (!me) return send(res, 401, { error: 'Seanca ka skaduar. Hyr sërish.' });
    if (!(await adminOf(me))) return send(res, 403, { error: 'Vetëm administratori.' });
    const b = await body(req), u = String((b && b.u) || '').trim().toLowerCase();
    if (!/^[a-z0-9_.]{3,20}$/.test(u)) return send(res, 400, { error: 'Emër i pavlefshëm.' });
    if (b.action === 'hide') { await db.set('lbban:' + u, '1'); await lbRemove(u); return send(res, 200, { ok: true }); }
    if (b.action === 'unhide') { await db.del('lbban:' + u); return send(res, 200, { ok: true }); }
    return send(res, 400, { error: 'Veprim i panjohur.' });
  }

  return send(res, 405, { error: 'Metoda nuk lejohet.' });
});
