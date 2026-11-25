/* GET  /api/groups → {groups, invites}
   POST /api/groups {action, …}
     create {name, users}   krijo grup dhe fto emrat (secili duhet ta pranojë)
     accept {id} / decline {id}   përgjigju ftesës
     leave {id}             dil nga grupi (nëse del pronari, pronar bëhet anëtari tjetër)
     invite {id, users} / remove {id, u} / rename {id, name} / delete {id}   vetëm pronari */
'use strict';
const { auth, body, send, wrap } = require('./_lib');
const G = require('./_groups');

const NAME_MSG = 'Emri i grupit: 2–40 shenja.';

module.exports = wrap(async (req, res) => {
  const me = await auth(req);
  if (!me) return send(res, 401, { error: 'Hyr në llogari që të përdorësh grupet.' });
  if (req.method === 'GET') return send(res, 200, await G.mine(me));
  if (req.method !== 'POST') return send(res, 405, { error: 'Metoda nuk lejohet.' });

  const b = await body(req);
  if (!b || typeof b !== 'object') return send(res, 400, { error: 'Kërkesë e pavlefshme.' });
  const a = b.action, out = {};

  if (a === 'create') {
    const name = G.cleanName(b.name);
    if (name.length < 2) return send(res, 400, { error: NAME_MSG });
    if ((await G.list('ugrp:' + me)).length >= G.MAXG) return send(res, 400, { error: 'Mund të jesh në më së shumti ' + G.MAXG + ' grupe.' });
    const g = { id: G.newId(), name, owner: me, members: [me], inv: [], c: Date.now() };
    Object.assign(out, await G.invite(g, b.users), { id: g.id });
    await G.saveG(g); await G.addTo('ugrp:' + me, g.id);
    return send(res, 200, { ...out, ...(await G.mine(me)) });
  }

  const g = await G.getG(b.id);
  if (!g) return send(res, 404, { error: 'Ky grup nuk ekziston më.', ...(await G.mine(me)) });

  if (a === 'accept' || a === 'decline') {
    if (!g.inv.includes(me)) return send(res, 400, { error: 'Kjo ftesë nuk është më aktive.', ...(await G.mine(me)) });
    if (a === 'accept' && (await G.list('ugrp:' + me)).length >= G.MAXG) return send(res, 400, { error: 'Mund të jesh në më së shumti ' + G.MAXG + ' grupe. Dil nga ndonjë grup më parë.' });
    g.inv = g.inv.filter(x => x !== me);
    if (a === 'accept') { g.members.push(me); await G.addTo('ugrp:' + me, g.id); }
    await G.saveG(g); await G.delFrom('uinv:' + me, g.id);
  } else if (a === 'leave') {
    if (!g.members.includes(me)) return send(res, 400, { error: 'Nuk je anëtar i këtij grupi.' });
    await G.leave(g, me);
  } else {
    if (g.owner !== me) return send(res, 403, { error: 'Vetëm krijuesi i grupit mund ta bëjë këtë.' });
    if (a === 'invite') { Object.assign(out, await G.invite(g, b.users)); await G.saveG(g); }
    else if (a === 'remove') {
      const u = String(b.u || '').toLowerCase();
      if (u === me) return send(res, 400, { error: 'Për të dalë vetë, përdor “Dil nga grupi”.' });
      if (g.members.includes(u)) { g.members = g.members.filter(x => x !== u); await G.delFrom('ugrp:' + u, g.id); }
      if (g.inv.includes(u)) { g.inv = g.inv.filter(x => x !== u); await G.delFrom('uinv:' + u, g.id); }
      await G.saveG(g);
    } else if (a === 'rename') {
      const name = G.cleanName(b.name);
      if (name.length < 2) return send(res, 400, { error: NAME_MSG });
      g.name = name; await G.saveG(g);
    } else if (a === 'delete') await G.deleteGroup(g);
    else return send(res, 400, { error: 'Veprim i panjohur.' });
  }
  return send(res, 200, { ok: true, ...out, ...(await G.mine(me)) });
});
