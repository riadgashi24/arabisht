/* Grupet: garë me XP mes shokëve. Anëtarët shtohen vetëm me pranim (ftesë), dhe secili mund të dalë kur të dojë.
   grp:<id>  → {id, name, owner, members:[u], inv:[u], c}
   ugrp:<u>  → [id…] grupet ku është anëtar      uinv:<u> → [id…] ftesat që e presin */
'use strict';
const crypto = require('crypto');
const { db } = require('./_lib');

const MAXG = 20, MAXM = 50, MAXINV = 30;
const UN = /^[a-z0-9_.]{3,20}$/;
const parse = (v, d) => { if (!v) return d; try { return JSON.parse(v); } catch (e) { return d; } };
const jset = (k, v) => db.set(k, JSON.stringify(v));
const list = async k => parse(await db.get(k), []).filter(x => typeof x === 'string');
const okId = id => /^[a-f0-9]{12}$/.test(String(id || ''));
const getG = async id => okId(id) ? parse(await db.get('grp:' + id), null) : null;
const saveG = g => jset('grp:' + g.id, g);
const newId = () => crypto.randomBytes(6).toString('hex');
const cleanName = n => String(n || '').replace(/\s+/g, ' ').trim().slice(0, 40);

async function addTo(k, id, max) {
  const l = await list(k);
  if (l.includes(id)) return true;
  if (max && l.length >= max) return false;
  l.push(id); await jset(k, l); return true;
}
async function delFrom(k, id) {
  const l = await list(k), n = l.filter(x => x !== id);
  if (n.length !== l.length) { if (n.length) await jset(k, n); else await db.del(k); }
}
const pub = g => ({ id: g.id, name: g.name, owner: g.owner, members: g.members, inv: g.inv, c: g.c });

async function mine(u) {
  const ids = await list('ugrp:' + u), invs = await list('uinv:' + u);
  const gs = await db.mget(ids.map(id => 'grp:' + id)), is = await db.mget(invs.map(id => 'grp:' + id));
  return {
    groups: gs.map(v => parse(v, null)).filter(g => g && g.members.includes(u)).map(pub),
    invites: is.map(v => parse(v, null)).filter(g => g && g.inv.includes(u)).map(g => ({ id: g.id, name: g.name, owner: g.owner, n: g.members.length })),
  };
}

/* emrat e shkruar nga përdoruesi → ekzistojnë apo jo */
async function checkUsers(users, exclude) {
  const raw = Array.isArray(users) ? users : String(users || '').split(/[\s,;]+/);
  const uniq = [...new Set(raw.map(x => String(x).trim().toLowerCase().replace(/^@/, '')).filter(Boolean))].slice(0, MAXM + 10);
  const cand = uniq.filter(u => UN.test(u) && !exclude.includes(u));
  const recs = await db.mget(cand.map(u => 'user:' + u));
  return { ok: cand.filter((u, i) => recs[i]), bad: uniq.filter(u => !exclude.includes(u) && (!UN.test(u) || !recs[cand.indexOf(u)])) };
}
async function invite(g, users) {
  const { ok, bad } = await checkUsers(users, g.members.concat(g.inv));
  const room = Math.max(0, MAXM - g.members.length - g.inv.length), added = [], full = [];
  for (const u of ok.slice(0, room)) { if (await addTo('uinv:' + u, g.id, MAXINV)) { g.inv.push(u); added.push(u); } else full.push(u); }
  return { added, bad, full: full.concat(ok.slice(room)) };
}
async function deleteGroup(g) {
  for (const u of g.members) await delFrom('ugrp:' + u, g.id);
  for (const u of g.inv) await delFrom('uinv:' + u, g.id);
  await db.del('grp:' + g.id);
}
async function leave(g, u) {
  g.members = g.members.filter(x => x !== u);
  await delFrom('ugrp:' + u, g.id);
  if (!g.members.length) return deleteGroup(g);
  if (g.owner === u) g.owner = g.members[0];
  await saveG(g);
}
/* kur fshihet llogaria */
async function purgeUser(u) {
  for (const id of await list('ugrp:' + u)) { const g = await getG(id); if (g && g.members.includes(u)) await leave(g, u); }
  for (const id of await list('uinv:' + u)) { const g = await getG(id); if (g) { g.inv = g.inv.filter(x => x !== u); await saveG(g); } }
  await db.del('ugrp:' + u, 'uinv:' + u);
}

module.exports = { MAXG, MAXM, list, getG, saveG, newId, cleanName, addTo, delFrom, pub, mine, invite, deleteGroup, leave, purgeUser };
