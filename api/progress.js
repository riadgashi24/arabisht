/* GET /api/progress → {data}
   PUT /api/progress {data, replace?} → {data}  (bashkohet me atë që është në server, përveç kur replace:true) */
'use strict';
const { db, isAdmin, lbUpdate, auth, mergeState, body, send, wrap } = require('./_lib');

module.exports = wrap(async (req, res) => {
  const me = await auth(req);
  if (!me) return send(res, 401, { error: 'Seanca ka skaduar. Hyr sërish.' });
  const key = 'prog:' + me;

  if (req.method === 'GET') {
    const d = await db.get(key);
    return send(res, 200, { data: d ? JSON.parse(d) : null, admin: isAdmin(me) });
  }

  if (req.method === 'PUT' || req.method === 'POST') {
    const b = await body(req);
    if (!b || !b.data || typeof b.data !== 'object' || Array.isArray(b.data)) return send(res, 400, { error: 'Kërkesë e pavlefshme.' });
    let data = b.data;
    if (!b.replace) { const old = await db.get(key); if (old) data = mergeState(JSON.parse(old), data); }
    const s = JSON.stringify(data);
    if (s.length > 300000) return send(res, 413, { error: 'Progresi është shumë i madh.' });
    await db.set(key, s);
    try { await lbUpdate(me, data); } catch (e) { console.error('leaderboard', e); }
    return send(res, 200, { data });
  }

  return send(res, 405, { error: 'Metoda nuk lejohet.' });
});
