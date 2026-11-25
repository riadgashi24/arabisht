/* Pjesë e përbashkët për /api: ruajtja, fjalëkalimet, seancat.
   Ruajtja: Upstash Redis (Vercel → Storage → Upstash for Redis, falas).
   Pa Redis dhe jashtë Vercel (provë lokale) përdoret skedari .data/db.json. */
'use strict';
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const RURL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || '';
const RTOK = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || '';
const HAS_REDIS = !!(RURL && RTOK);
const CONFIGURED = HAS_REDIS || !process.env.VERCEL;

async function redis(cmd) {
  const r = await fetch(RURL, {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + RTOK, 'Content-Type': 'application/json' },
    body: JSON.stringify(cmd),
  });
  const j = await r.json().catch(() => ({ error: 'bad response' }));
  if (!r.ok || j.error) throw new Error('redis: ' + (j.error || r.status));
  return j.result;
}

/* ruajtja lokale për provë */
const DBFILE = path.join(process.env.LOCAL_DB_DIR || path.join(__dirname, '..', '.data'), 'db.json');
let mem = null;
const fload = () => { if (mem) return mem; try { mem = JSON.parse(fs.readFileSync(DBFILE, 'utf8')); } catch (e) { mem = {}; } return mem; };
const fsave = () => { fs.mkdirSync(path.dirname(DBFILE), { recursive: true }); fs.writeFileSync(DBFILE, JSON.stringify(mem)); };
const live = k => { const m = fload(), e = m[k]; if (!e) return null; if (e.x && e.x < Date.now()) { delete m[k]; return null; } return e; };

const db = HAS_REDIS ? {
  get: k => redis(['GET', k]),
  set: async (k, v, o = {}) => { const c = ['SET', k, v]; if (o.ex) c.push('EX', String(o.ex)); if (o.nx) c.push('NX'); return (await redis(c)) === 'OK'; },
  del: (...k) => redis(['DEL', ...k]),
  incr: async (k, ex) => { const n = await redis(['INCR', k]); if (n === 1 && ex) await redis(['EXPIRE', k, String(ex)]); return n; },
} : {
  get: async k => { const e = live(k); return e ? e.v : null; },
  set: async (k, v, o = {}) => { if (o.nx && live(k)) return false; fload()[k] = { v, x: o.ex ? Date.now() + o.ex * 1000 : 0 }; fsave(); return true; },
  del: async (...ks) => { const m = fload(); ks.forEach(k => delete m[k]); fsave(); },
  incr: async (k, ex) => { const e = live(k), n = (e ? +e.v : 0) + 1; fload()[k] = { v: String(n), x: e ? e.x : (ex ? Date.now() + ex * 1000 : 0) }; fsave(); return n; },
};

/* fjalëkalimet: scrypt me kripë */
const scrypt = (p, salt) => new Promise((ok, no) => crypto.scrypt(p, salt, 64, { N: 16384, r: 8, p: 1 }, (e, k) => e ? no(e) : ok(k)));
async function hashPw(p) { const s = crypto.randomBytes(16); return 's1$' + s.toString('base64') + '$' + (await scrypt(p, s)).toString('base64'); }
async function checkPw(p, stored) {
  const [v, s, h] = String(stored || '').split('$');
  if (v !== 's1' || !s || !h) return false;
  const k = await scrypt(p, Buffer.from(s, 'base64')), hb = Buffer.from(h, 'base64');
  return hb.length === k.length && crypto.timingSafeEqual(hb, k);
}

/* seancat: token i rastësishëm, në databazë ruhet vetëm hash-i i tij */
const SESS_TTL = 60 * 60 * 24 * 180;
const th = t => crypto.createHash('sha256').update(t).digest('hex');
async function newSession(u) { const t = crypto.randomBytes(32).toString('base64url'); await db.set('sess:' + th(t), u, { ex: SESS_TTL }); return t; }
const bearer = req => { const h = String(req.headers.authorization || ''); return h.startsWith('Bearer ') ? h.slice(7).trim() : ''; };
async function auth(req) {
  const t = bearer(req); if (!t || t.length > 100) return null;
  const u = await db.get('sess:' + th(t)); if (!u) return null;
  return (await db.get('user:' + u)) ? u : null;
}

/* administratorët: emrat te variabla ADMIN_USERS (p.sh. "riad,ardit") */
const ADMINS = String(process.env.ADMIN_USERS || '').toLowerCase().split(/[\s,;]+/).filter(Boolean);
const isAdmin = u => !!u && ADMINS.includes(String(u).toLowerCase());

/* bashkimi i dy gjendjeve (dy pajisje): asgjë nuk humbet */
const obj = x => x && typeof x === 'object' && !Array.isArray(x) ? x : {};
const BAD = k => k === '__proto__' || k === 'constructor' || k === 'prototype';
const maxO = (x, y) => { const o = {}; for (const k in obj(x)) if (!BAD(k)) o[k] = +x[k] || 0; for (const k in obj(y)) if (!BAD(k)) o[k] = Math.max(o[k] || 0, +y[k] || 0); return o; };
const minD = (x, y) => { const o = {}; for (const k in obj(x)) if (!BAD(k)) o[k] = x[k]; for (const k in obj(y)) if (!BAD(k)) o[k] = o[k] && o[k] < y[k] ? o[k] : y[k]; return o; };
function mergeState(a, b) {
  a = obj(a); b = obj(b);
  const nw = (+b.at || 0) >= (+a.at || 0) ? b : a, ca = obj(a.cards), cb = obj(b.cards), cards = {};
  for (const k in ca) if (!BAD(k) && obj(ca[k]) === ca[k]) cards[k] = ca[k];
  for (const k in cb) {
    const x = cards[k], y = cb[k];
    if (BAD(k) || obj(y) !== y) continue;
    cards[k] = !x || +y.b > +x.b || (+y.b === +x.b && String(y.due) > String(x.due)) ? y : x;
  }
  return { ...nw, done: minD(a.done, b.done), cards, log: maxO(a.log, b.log), xp: maxO(a.xp, b.xp), scores: maxO(a.scores, b.scores), lv: maxO(a.lv, b.lv),
    badges: minD(a.badges, b.badges), frz: { ...obj(a.frz), ...obj(b.frz) }, best: Math.max(+a.best || 0, +b.best || 0), at: Math.max(+a.at || 0, +b.at || 0) };
}

/* kërkesa / përgjigja */
async function body(req, max = 400000) {
  let b; try { b = req.body; } catch (e) { return null; }
  if (b !== undefined && b !== null) {
    if (Buffer.isBuffer(b)) b = b.toString('utf8');
    if (typeof b === 'string') { try { return JSON.parse(b || '{}'); } catch (e) { return null; } }
    return b;
  }
  return new Promise(ok => {
    let d = '';
    req.on('data', c => { d += c; if (d.length > max) { ok(null); req.destroy(); } });
    req.on('end', () => { try { ok(JSON.parse(d || '{}')); } catch (e) { ok(null); } });
    req.on('error', () => ok(null));
  });
}
function send(res, code, o) {
  res.statusCode = code;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(o));
}
const ip = req => String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || (req.socket && req.socket.remoteAddress) || '?';
const wrap = fn => async (req, res) => {
  try {
    if (!CONFIGURED) return send(res, 503, { error: 'Ruajtja në server nuk është lidhur ende (Upstash Redis). Shiko README.' });
    await fn(req, res);
  } catch (e) {
    console.error(e);
    send(res, 500, { error: 'Diçka shkoi keq në server. Provo sërish.' });
  }
};

module.exports = { db, isAdmin, hashPw, checkPw, newSession, auth, bearer, th, mergeState, body, send, ip, wrap };
