/* A Horse With No Name — a quiet desert to wander. */
(() => {
'use strict';

/* ============================== utils ============================== */
const TAU = Math.PI * 2;
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const R = Math.random;
const rand = (a, b) => a + (b - a) * R();
const pick = a => a[(R() * a.length) | 0];
const dist = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);
function seeded(seed) { let s = (seed >>> 0) || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }
const hexc = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const mixc = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const css = (c, a) => a == null ? 'rgb(' + (c[0] | 0) + ',' + (c[1] | 0) + ',' + (c[2] | 0) + ')' : 'rgba(' + (c[0] | 0) + ',' + (c[1] | 0) + ',' + (c[2] | 0) + ',' + a + ')';
const mk = (w, h) => { const c = document.createElement('canvas'); c.width = Math.max(1, w); c.height = Math.max(1, h); return c; };
const $ = id => document.getElementById(id);
const SAVEKEY = 'hwnn_wander_v1';
const store = {
  get() { try { const v = localStorage.getItem(SAVEKEY); return v ? JSON.parse(v) : null; } catch (e) { return null; } },
  set(o) { try { localStorage.setItem(SAVEKEY, JSON.stringify(o)); } catch (e) {} },
  clear() { try { localStorage.removeItem(SAVEKEY); } catch (e) {} },
  mute(v) { try { if (v === undefined) return localStorage.getItem('hwnn_mute') === '1'; localStorage.setItem('hwnn_mute', v ? '1' : '0'); } catch (e) { return false; } }
};
function hash(x, y, s) { let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(s | 0, 1442695041)) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16; return (h >>> 0) / 4294967296; }
function vnoise(x, y, s) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash(xi, yi, s), b = hash(xi + 1, yi, s), c = hash(xi, yi + 1, s), d = hash(xi + 1, yi + 1, s);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
const fbm = (x, y, s) => vnoise(x, y, s) * .6 + vnoise(x * 2.03, y * 2.03, s + 7) * .3 + vnoise(x * 4.1, y * 4.1, s + 13) * .1;
const BAY = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const bay = (x, y) => BAY[(y & 3) * 4 + (x & 3)] / 16;

/* ============================== pixel builder ============================== */
const ccache = {};
function pix(w, h, draw, outline) {
  let g = new Array(w * h).fill(null);
  const set = (x, y, c) => { x = Math.round(x); y = Math.round(y); if (x >= 0 && y >= 0 && x < w && y < h) g[y * w + x] = c; };
  const P = {
    w, h, set,
    get: (x, y) => (x < 0 || y < 0 || x >= w || y >= h) ? null : g[y * w + x],
    rect: (x, y, rw, rh, c) => { for (let j = 0; j < rh; j++) for (let i = 0; i < rw; i++) set(x + i, y + j, c); },
    dot: (cx, cy, s, c) => { const x0 = Math.round(cx - s / 2), y0 = Math.round(cy - s / 2); for (let j = 0; j < s; j++) for (let i = 0; i < s; i++) set(x0 + i, y0 + j, c); },
    ell: (cx, cy, rx, ry, c) => { for (let y = Math.floor(cy - ry - 1); y <= Math.ceil(cy + ry + 1); y++) for (let x = Math.floor(cx - rx - 1); x <= Math.ceil(cx + rx + 1); x++) { const dx = (x + .5 - cx) / rx, dy = (y + .5 - cy) / ry; if (dx * dx + dy * dy <= 1) set(x, y, c); } },
    line: (x0, y0, x1, y1, w0, w1, c) => { if (c === undefined) { c = w1; w1 = w0; } const n = Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 2) + 1; for (let i = 0; i <= n; i++) { const t = i / n; P.dot(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, Math.max(1, Math.round(w0 + (w1 - w0) * t)), c); } },
    map: fn => { for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const c = g[y * w + x]; if (c) { const n = fn(x, y, c); if (n !== undefined) g[y * w + x] = n; } } }
  };
  draw(P);
  if (outline) {
    const o = g.slice();
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      if (g[y * w + x]) continue;
      if ((x > 0 && g[y * w + x - 1]) || (x < w - 1 && g[y * w + x + 1]) || (y > 0 && g[(y - 1) * w + x]) || (y < h - 1 && g[(y + 1) * w + x])) o[y * w + x] = outline;
    }
    g = o;
  }
  const c = mk(w, h), cx = c.getContext('2d'), id = cx.createImageData(w, h);
  for (let i = 0; i < w * h; i++) { const col = g[i]; if (!col) continue; const v = ccache[col] || (ccache[col] = hexc(col)); id.data[i * 4] = v[0]; id.data[i * 4 + 1] = v[1]; id.data[i * 4 + 2] = v[2]; id.data[i * 4 + 3] = 255; }
  cx.putImageData(id, 0, 0);
  return c;
}

/* ============================== the horse ============================== */
const HP = { o: '#4a2616', b: '#cf8048', s: '#a65d31', h: '#eba66a', m: '#5c3423', mh: '#81503a', mu: '#f1c9a0', w: '#fff6e8', e: '#2a1810', hf: '#55403a', bl: '#f59a8c', sock: '#fbefdc' };
const HB = 26; // hoof row inside horse sprites
function horseSide(pose, p, blink) {
  return pix(34, 29, P => {
    const T = TAU;
    let bob = 0;
    if (pose === 'walk') bob = Math.round(Math.sin(T * p * 2) * .45);
    else if (pose === 'trot') bob = Math.round(-Math.abs(Math.sin(T * p)) * 1.2);
    else if (pose === 'canter') bob = Math.round(-Math.sin(T * p) * 1.4);
    else if (pose === 'idle') bob = 0;
    const rest = pose === 'rest';
    const BY = (rest ? 21 : 17) + bob;
    const L1 = 3.7, L2 = 3.7;
    const amp = { walk: .38, trot: .52, canter: .78 }[pose] || 0;
    const fold = { walk: .9, trot: 1.3, canter: 1.9 }[pose] || 0;
    const off = pose === 'walk' ? { nh: 0, nf: .25, fh: .5, ff: .75 } : pose === 'trot' ? { nf: 0, fh: 0, ff: .5, nh: .5 } : { nh: 0, fh: .15, nf: .3, ff: .45 };
    const angF = q => { const s = Math.sin(T * q), c = Math.cos(T * q); const a = .05 + amp * s; return [a, a - fold * Math.max(0, c)]; };
    const angH = q => { const s = Math.sin(T * q), c = Math.cos(T * q); const a = -.08 + amp * s; return [a, a + .25 - fold * .8 * Math.max(0, c)]; };
    let NF, FF, NH, FH;
    if (pose === 'hop') { NF = [1.1, -.8]; FF = [.9, -.9]; NH = [-.6, .4]; FH = [-.4, .5]; }
    else if (pose === 'paw') { NF = [.55 + .55 * Math.sin(T * p), .1 - .7 * Math.max(0, Math.cos(T * p))]; FF = [0, 0]; NH = [-.05, .05]; FH = [-.05, .05]; }
    else if (amp) { NF = angF(p + off.nf); FF = angF(p + off.ff); NH = angH(p + off.nh); FH = angH(p + off.fh); }
    else { NF = [.06, .02]; FF = [-.05, -.03]; NH = [-.05, .06]; FH = [.06, .1]; }
    const leg = (hx, hy, a, near, sock) => {
      const kx = hx + Math.sin(a[0]) * L1, ky = hy + Math.cos(a[0]) * L1;
      const fx = kx + Math.sin(a[1]) * L2, fy = ky + Math.cos(a[1]) * L2;
      P.line(hx, hy, kx, ky, 3, 2, near ? HP.b : HP.s);
      P.line(kx, ky, fx, fy, 2, 2, near ? (sock ? HP.sock : HP.b) : HP.s);
      P.rect(Math.round(fx - .5), Math.round(fy), 2, 1, near ? HP.hf : HP.o);
    };
    // tail
    const still = pose === 'idle' || pose === 'graze' || pose === 'rest' || pose === 'paw';
    const lift = { canter: .9, trot: .5, walk: .2 }[pose] || 0;
    const sw = still ? Math.sin(T * p) * 1.8 : Math.sin(T * p * 2) * .7;
    for (let i = 0; i <= 8; i++) { const t = i / 8; const x = 7 - t * (3 + lift * 4) - (rest ? t * 2 : 0) + sw * t * t; const y = BY - 3 + t * (rest ? 4 : 8 - lift * 6); P.dot(x, y, t < .75 ? 3 : 2, i % 3 === 1 ? HP.mh : HP.m); }
    if (!rest) { leg(19, BY + 2, FF, false); leg(11, BY + 2, FH, false); }
    // body
    P.ell(14.5, BY, 7.6, 5.2, HP.s); P.ell(14.5, BY - .7, 7.2, 4.5, HP.b); P.ell(13.5, BY - 3, 4.8, 1.4, HP.h);
    if (rest) { P.line(19, BY + 3, 23, BY + 4.5, 2, HP.b); P.rect(23, Math.round(BY + 4), 2, 1, HP.hf); P.line(10, BY + 3, 14, BY + 4.5, 2, HP.s); P.rect(14, Math.round(BY + 4), 2, 1, HP.hf); }
    else { leg(20.5, BY + 2, NF, true, true); leg(12, BY + 2, NH, true, false); }
    // neck & head
    let hx = 23.5, hy = BY - 8.5;
    if (pose === 'graze') { hx = 26; hy = BY + 5 + Math.round(Math.sin(T * p * 2) * .5); }
    else if (pose === 'canter') { hx = 24.5; hy = BY - 7.5 + Math.round(Math.sin(T * p + 1) * .6); }
    else if (pose === 'hop') { hx = 23.5; hy = BY - 9.5; }
    else if (rest) { hx = 23; hy = BY - 7; }
    else if (pose === 'idle') hy += (p > .5 ? 0 : 0);
    P.line(19, BY - 1.5, hx - 1.5, hy + 1.5, 5, 4, HP.b);
    P.ell(hx, hy, 4.1, 3.7, HP.b);
    const mx = hx + 3.3, my = hy + 1.9;
    P.ell(mx, my, 2.6, 2.1, HP.mu); P.set(mx + 1.6, my - .4, HP.s);
    P.line(hx - 1.7, hy - 3, hx - 2.3, hy - 5.8, 2, 1, HP.b); P.line(hx + .1, hy - 3.2, hx + .3, hy - 6, 2, 1, HP.b); P.set(hx + .2, hy - 4.6, HP.bl);
    const ex = Math.round(hx), ey = Math.round(hy - 1.2);
    const closed = blink || (rest && p > .5);
    if (closed) { P.set(ex, ey + 1, HP.e); P.set(ex + 1, ey + 1, HP.e); }
    else { P.rect(ex, ey, 2, 2, HP.e); P.set(ex, ey, HP.w); }
    P.set(ex + 2, ey + 2, HP.bl);
    P.set(ex + 3, ey - 2, HP.w); P.set(ex + 3, ey - 1, HP.w); P.set(ex + 4, ey, HP.w);
    // mane
    for (let k = 0; k < 6; k++) { const t = k / 5; const x = lerp(hx - 2.6, 17.5, t), y = lerp(hy - 3, BY - 4.2, t); const wv = Math.sin(T * p * (still ? 1 : 2) + k) * (still ? .4 : .9); P.dot(x - .6, y + wv * .5, k < 2 ? 3 : 2, k % 2 ? HP.mh : HP.m); }
    P.dot(hx + .6, hy - 3.6, 2, HP.m);
  }, HP.o);
}
function horseFront(p, blink, moving) {
  return pix(22, 29, P => {
    const T = TAU; const lift = q => moving ? Math.round(Math.max(0, Math.sin(T * (p + q))) * 2) : 0;
    const bob = moving ? Math.round(Math.abs(Math.sin(T * p)) * .8) : 0;
    P.rect(8, 20 - lift(.5), 2, 6, HP.s); P.rect(12, 20 - lift(0), 2, 6, HP.s);
    P.ell(11, 17 - bob, 6.2, 4.6, HP.s); P.ell(11, 16.4 - bob, 5.8, 4, HP.b);
    const lL = lift(0), lR = lift(.5);
    P.rect(6, 19 - lL, 3, 7 - 0, HP.b); P.rect(6, 23 - lL, 3, 3, HP.sock); P.rect(6, 26 - lL, 3, 1, HP.hf);
    P.rect(13, 19 - lR, 3, 7, HP.b); P.rect(13, 26 - lR, 3, 1, HP.hf);
    P.rect(8, 9 - bob, 6, 6, HP.b);
    const hy = 8 - bob;
    P.ell(11, hy, 4.7, 4.4, HP.b); P.ell(11, hy + 4, 3.3, 2.4, HP.mu); P.set(9.6, hy + 4.5, HP.s); P.set(12.4, hy + 4.5, HP.s);
    P.line(7.4, hy - 3, 6.4, hy - 6.4, 2, 1, HP.b); P.line(14.6, hy - 3, 15.6, hy - 6.4, 2, 1, HP.b);
    P.set(7, hy - 4.5, HP.bl); P.set(15, hy - 4.5, HP.bl);
    if (blink) { P.rect(7, hy, 2, 1, HP.e); P.rect(13, hy, 2, 1, HP.e); }
    else { P.rect(7, hy - 1, 2, 2, HP.e); P.set(7, hy - 1, HP.w); P.rect(13, hy - 1, 2, 2, HP.e); P.set(13, hy - 1, HP.w); }
    P.set(6, hy + 2, HP.bl); P.set(16, hy + 2, HP.bl);
    P.set(11, hy - 2, HP.w); P.set(11, hy - 1, HP.w); P.set(11, hy, HP.w);
    P.dot(11, hy - 3.8, 3, HP.m); P.dot(6.6, hy + 5.5, 2, HP.m); P.dot(15.4, hy + 5.5, 2, HP.m);
  }, HP.o);
}
function horseBack(p, moving) {
  return pix(22, 29, P => {
    const T = TAU; const lift = q => moving ? Math.round(Math.max(0, Math.sin(T * (p + q))) * 2) : 0;
    const bob = moving ? Math.round(Math.abs(Math.sin(T * p)) * .8) : 0;
    P.ell(11, 7 - bob, 3.6, 3.2, HP.s);
    P.line(8.5, 4.5 - bob, 8, 1 - bob, 2, 1, HP.s); P.line(13.5, 4.5 - bob, 14, 1 - bob, 2, 1, HP.s);
    P.line(11, 4 - bob, 11, 11 - bob, 2, HP.m);
    P.rect(8.5, 20 - lift(0), 2, 6, HP.s); P.rect(11.5, 20 - lift(.5), 2, 6, HP.s);
    P.ell(11, 15.5 - bob, 6.6, 5.4, HP.s); P.ell(11, 14.8 - bob, 6.2, 4.8, HP.b); P.ell(10, 12.5 - bob, 3.5, 1.4, HP.h);
    P.rect(5.5, 19 - lift(.5), 3, 7, HP.b); P.rect(5.5, 26 - lift(.5), 3, 1, HP.hf);
    P.rect(13.5, 19 - lift(0), 3, 7, HP.b); P.rect(13.5, 26 - lift(0), 3, 1, HP.hf);
    const sw = Math.sin(T * p * (moving ? 2 : 1)) * 1.6;
    for (let i = 0; i <= 7; i++) { const t = i / 7; P.dot(11 + sw * t, 13 - bob + t * 9, t < .7 ? 3 : 2, i % 3 === 1 ? HP.mh : HP.m); }
  }, HP.o);
}

/* ============================== world sprites ============================== */
const G = { g: '#69b06e', d: '#468a55', l: '#93d08f', o: '#2e5c3c' };
function saguaro(h, arms, flower) {
  return pix(17, h + 2, P => {
    const cx = 8;
    for (let y = 3; y <= h + 1; y++) { P.set(cx - 2, y, G.l); P.set(cx - 1, y, G.g); P.set(cx, y, G.d); P.set(cx + 1, y, G.g); P.set(cx + 2, y, G.d); }
    P.ell(cx + .5, 3.6, 2.6, 2.2, G.g); P.set(cx - 1, 2, G.l); P.set(cx - 2, 3, G.l);
    for (const a of arms) {
      const s = a.s, y = a.y, ex = cx + s * (3 + a.l);
      for (let x = cx + s * 3; s > 0 ? x <= ex : x >= ex; x += s) { P.set(x, y, G.l); P.set(x, y + 1, G.g); P.set(x, y + 2, G.d); }
      for (let yy = y - a.u; yy <= y + 2; yy++) { P.set(ex - 1, yy, G.l); P.set(ex, yy, G.g); P.set(ex + 1, yy, G.d); }
      P.set(ex, y - a.u - 1, G.g);
    }
    P.map((x, y, c) => { if (c === G.d && (x * 7 + y * 5) % 4 === 0) return '#d9efc0'; });
    if (flower) { P.set(cx, 0, '#ff8fb8'); P.set(cx - 1, 1, '#ff8fb8'); P.set(cx + 1, 1, '#ff8fb8'); P.set(cx, 1, '#ffe27a'); }
  }, G.o);
}
const SPR = {};
function buildSprites() {
  // horse
  SPR.idle = []; SPR.idleB = []; SPR.walk = []; SPR.trot = []; SPR.canter = []; SPR.graze = []; SPR.paw = [];
  for (let i = 0; i < 8; i++) { const p = i / 8; SPR.idle.push(horseSide('idle', p, false)); SPR.idleB.push(horseSide('idle', p, true)); SPR.walk.push(horseSide('walk', p)); SPR.trot.push(horseSide('trot', p)); SPR.canter.push(horseSide('canter', p)); }
  for (let i = 0; i < 4; i++) { SPR.graze.push(horseSide('graze', i / 4)); }
  for (let i = 0; i < 6; i++) SPR.paw.push(horseSide('paw', i / 6));
  SPR.rest = [horseSide('rest', 0), horseSide('rest', .75)];
  SPR.hop = horseSide('hop', 0);
  SPR.front = []; SPR.back = [];
  for (let i = 0; i < 4; i++) { SPR.front.push(horseFront(i / 4, false, true)); SPR.back.push(horseBack(i / 4, true)); }
  SPR.frontIdle = [horseFront(0, false, false), horseFront(0, true, false)]; SPR.backIdle = horseBack(0, false);
  // plants
  SPR.sag = [saguaro(24, [{ s: -1, y: 9, l: 2, u: 5 }, { s: 1, y: 6, l: 2, u: 4 }], true), saguaro(20, [{ s: 1, y: 9, l: 2, u: 5 }], false), saguaro(15, [], true), saguaro(22, [{ s: -1, y: 7, l: 2, u: 5 }, { s: 1, y: 11, l: 2, u: 4 }], false)];
  SPR.prickly = pix(18, 15, P => {
    const pd = (x, y, rx, ry) => { P.ell(x, y, rx, ry, '#7cbf6a'); P.ell(x - .8, y - .8, rx - 1.4, ry - 1.6, '#a2da8a'); };
    pd(6, 10, 3.6, 4.2); pd(12, 9, 3.4, 4); pd(9, 4.5, 2.8, 3.2);
    P.map((x, y, c) => { if ((x * 5 + y * 3) % 7 === 0) return '#eef5c2'; });
    P.set(7, 5, '#ef6a9e'); P.set(11, 2, '#ef6a9e'); P.set(14, 5, '#ef6a9e'); P.set(4, 6, '#ef6a9e');
  }, '#3c6a40');
  SPR.barrel = pix(12, 12, P => { P.ell(6, 7, 4.4, 4.2, '#72b46a'); P.map((x, y) => { if (x % 2 === 0) return '#4e9257'; if (x < 5 && y < 8) return '#9fd28e'; }); P.set(5, 2, '#f2564d'); P.set(7, 2, '#f2564d'); P.set(6, 1, '#f2564d'); P.set(6, 2, '#ffd23f'); }, '#2e5c3c');
  SPR.marigoldB = pix(13, 10, P => { P.ell(6.5, 7, 5, 2.4, '#9ab585'); P.ell(6, 6.5, 3.5, 1.6, '#b9cfa2'); for (const [x, y] of [[3, 3], [7, 2], [10, 4], [5, 5], [9, 6]]) { P.dot(x, y, 2, '#ffd23f'); P.set(x, y, '#ff9a3a'); } }, '#6f8a5a');
  SPR.marigold = pix(11, 6, P => { P.ell(5.5, 3.5, 4, 1.8, '#a3b48c'); P.set(4, 2, '#c6d6ae'); P.set(7, 2, '#c6d6ae'); }, null);
  SPR.sage = [0, 1, 2].map(v => pix(14, 9, P => { const r = seeded(v + 4); for (let i = 0; i < 16; i++) P.dot(2 + r() * 10, 3 + r() * 5, 2, r() < .4 ? '#c9d8bd' : r() < .7 ? '#a3b896' : '#7e9672'); }, '#5d7356'));
  SPR.ocotillo = pix(17, 23, P => { const r = seeded(9); for (let i = 0; i < 7; i++) { const a = -.9 + i * .3 + (r() - .5) * .15; const L = 14 + r() * 6; const x1 = 8.5 + Math.sin(a) * L, y1 = 22 - Math.cos(a) * L; P.line(8.5, 22, x1, y1, 1, '#8a7452'); for (let k = 3; k < L - 2; k += 3) { const t = k / L; P.set(8.5 + (x1 - 8.5) * t + 1, 22 + (y1 - 22) * t, '#7fb36a'); } P.set(x1, y1, '#f0583c'); P.set(x1, y1 + 1, '#f0583c'); P.set(x1 + (r() < .5 ? 1 : -1), y1 + 1, '#ff8a5a'); } }, null);
  SPR.palm = pix(26, 32, P => {
    for (let i = 0; i <= 20; i++) { const t = i / 20; P.dot(11 + Math.sin(t * 1.7) * 3.5, 31 - t * 21, 3, i % 3 === 0 ? '#7a4f2e' : '#a06c40'); }
    const cx = 14.5, cy = 9;
    const fr = [[-11, 2], [-8, -5], [-2, -8], [5, -7], [10, -2], [11, 5], [-6, 7], [6, 8]];
    fr.forEach(([dx, dy], i) => { const mx = cx + dx * .55, my = cy + dy * .55 - 3; for (let k = 0; k <= 10; k++) { const t = k / 10; const x = (1 - t) * (1 - t) * cx + 2 * (1 - t) * t * mx + t * t * (cx + dx); const y = (1 - t) * (1 - t) * cy + 2 * (1 - t) * t * my + t * t * (cy + dy + 3); P.dot(x, y, t < .7 ? 2 : 1, i % 2 ? '#4f9a4a' : '#72bf5c'); } });
    P.dot(13.5, 10.5, 2, '#7a5426'); P.dot(16, 11, 2, '#6a4620');
  }, '#2c5230');
  SPR.reed = pix(10, 10, P => { for (let i = 0; i < 5; i++) { const x = 2 + i * 1.5; P.line(x, 9, x + (i - 2) * .8, 2 + (i % 3) * 2, 1, i % 2 ? '#5f9a4a' : '#86c060'); } P.set(3, 2, '#8a5428'); P.set(3, 3, '#8a5428'); P.set(7, 3, '#8a5428'); P.set(7, 4, '#8a5428'); }, null);
  SPR.tuft = [0, 1, 2].map(v => pix(9, 7, P => { const r = seeded(v * 13 + 2); for (let i = 0; i < 6; i++) { const x = 2 + r() * 5; P.line(x, 6, x + (r() - .5) * 4, 1 + r() * 3, 1, r() < .5 ? '#c8b46e' : '#a99556'); } }, null));
  // rocks & things
  const rock = (w, h, base, sh, hi, ol) => pix(w, h, P => { P.ell(w / 2, h / 2 + .5, w / 2 - 1, h / 2 - 1, base); P.ell(w / 2 - 1, h / 2 - .4, w / 2 - 2.4, h / 2 - 2.2, hi); P.map((x, y) => { if (y >= h - 3) return sh; }); }, ol);
  SPR.rockS = rock(9, 7, '#c49b84', '#9c7765', '#e0bea6', '#6a4a3c');
  SPR.rockB = rock(17, 12, '#c09078', '#94705e', '#dcb39c', '#5e4234');
  SPR.hoodoo = pix(13, 25, P => { P.ell(6.5, 22, 4.8, 2.6, '#cc7a52'); P.rect(3, 9, 7, 13, '#d98a5e'); P.ell(6.5, 13, 3.6, 2.4, '#e6a072'); P.rect(4, 6, 5, 4, '#cf8056'); P.ell(6.5, 4.5, 5.2, 2.6, '#a8573c'); P.ell(6, 3.8, 4, 1.4, '#c56c4a'); P.map((x, y, c) => { if (y > 8 && y % 4 === 0 && c !== '#a8573c') return '#b86844'; if (x >= 9 && y > 7) return '#b86844'; }); }, '#6a3424');
  SPR.skull = pix(11, 8, P => { P.ell(5.5, 4.5, 2.7, 2.2, '#f3ead6'); P.rect(4.5, 5, 2, 2, '#f3ead6'); P.line(3.8, 3.5, 1, 1.5, 2, 1, '#f3ead6'); P.line(7.2, 3.5, 10, 1.5, 2, 1, '#f3ead6'); P.set(4.5, 4, '#5a4636'); P.set(6.5, 4, '#5a4636'); }, '#7a6650');
  SPR.shell = pix(9, 8, P => { P.ell(4.5, 4.5, 3.6, 3, '#f8cdbd'); P.line(4.5, 7, 1.6, 3, 1, '#dc9c8a'); P.line(4.5, 7, 4.5, 2, 1, '#dc9c8a'); P.line(4.5, 7, 7.4, 3, 1, '#dc9c8a'); P.set(4, 2, '#fff0e8'); }, '#a8685a');
  SPR.rose = pix(10, 8, P => { for (const [x, y, r] of [[3, 5, 2.2], [6.5, 4.5, 2.4], [4.8, 2.8, 2]]) { P.ell(x, y, r, r * .8, '#e9b99e'); P.set(x - .5, y - .5, '#fbe2d0'); P.set(x + .8, y + .5, '#c98c72'); } }, '#8a5a46');
  SPR.obsidian = pix(9, 7, P => { P.ell(4.5, 4, 3.6, 2.6, '#2c2636'); P.set(3, 3, '#a39ad0'); P.set(4, 2, '#d8d2ff'); P.set(6, 5, '#4a3f60'); }, '#120e18');
  SPR.log = pix(20, 8, P => { P.rect(2, 2, 15, 4, '#b98a6a'); P.map((x, y) => { if (y === 2) return '#d9b294'; if (y === 5) return '#8f6a58'; if (x % 4 === 1) return '#a47660'; }); P.ell(17.5, 4, 1.8, 2.2, '#e6c29c'); P.set(17.5, 4, '#b47a58'); }, '#5c4234');
  SPR.geode = pix(10, 9, P => { P.ell(5, 4.5, 4, 3.4, '#a89a8e'); P.ell(5, 4.5, 2.6, 2.2, '#8a5ac8'); P.set(4, 4, '#d7b8ff'); P.set(5, 3, '#f1e4ff'); P.set(6, 5, '#b48ae8'); }, '#5a4c44');
  SPR.fossil = pix(12, 9, P => { P.ell(6, 4.5, 5, 3.6, '#d8c6a8'); P.line(2.5, 4.5, 9, 4.5, 1, '#9a8468'); for (let i = 3; i < 9; i += 2) { P.set(i, 3, '#9a8468'); P.set(i, 6, '#9a8468'); } P.set(9.5, 3.5, '#9a8468'); P.set(1.8, 3.6, '#9a8468'); P.set(1.8, 5.4, '#9a8468'); }, '#6e5c46');
  SPR.spur = pix(11, 8, P => { P.line(1, 4, 6, 4, 1, '#8a5a3a'); P.ell(7.5, 4, 2.2, 2.2, '#b07a44'); P.ell(7.5, 4, 1, 1, '#f4d8a0'); P.set(1, 3, '#8a5a3a'); P.set(1, 5, '#8a5a3a'); }, '#4a2c1c');
  SPR.stone = [0, 1, 2].map(v => pix(7, 10, P => { P.ell(3.5, 5.5, 2.6, 4, '#b3a798'); P.ell(3, 4.5, 1.6, 3, '#d1c6b8'); P.map((x, y) => { if (y >= 8) return '#8f8476'; }); if (v === 1) P.set(3, 3, '#8f8476'); if (v === 2) P.set(4, 6, '#8f8476'); }, '#5a5048'));
  SPR.center = pix(9, 12, P => { P.ell(4.5, 7, 3.4, 4.6, '#c9d6e2'); P.ell(4, 6, 2, 3.2, '#eef6ff'); P.line(4.5, 4, 4.5, 9, 1, '#8fb6d6'); P.set(3.5, 6, '#8fb6d6'); P.set(5.5, 7, '#8fb6d6'); P.map((x, y) => { if (y >= 10) return '#9aa8b8'; }); }, '#4e5e70');
  SPR.centerDim = pix(9, 12, P => { P.ell(4.5, 7, 3.4, 4.6, '#b8b2a8'); P.ell(4, 6, 2, 3.2, '#d4cec4'); P.line(4.5, 4, 4.5, 9, 1, '#9a9286'); P.map((x, y) => { if (y >= 10) return '#958e84'; }); }, '#5a5048');
  SPR.tumble = []; for (let f = 0; f < 6; f++) { const r = seeded(31); SPR.tumble.push(pix(13, 13, P => { const a0 = f / 6 * TAU; for (let i = 0; i < 12; i++) { const a = r() * TAU + a0, b = a + 1.3 + r() * 2.2, r1 = 2.5 + r() * 3.2, r2 = 2.5 + r() * 3.2; P.line(6.5 + Math.cos(a) * r1, 6.5 + Math.sin(a) * r1, 6.5 + Math.cos(b) * r2, 6.5 + Math.sin(b) * r2, 1, i % 3 ? '#c9a066' : '#8a6a3c'); } }, null)); }
  // critters
  SPR.rr = [0, 1].map(f => pix(15, 11, P => { P.line(4, 5.5, 0.5, 2.5, 2, 1, '#5a4a3c'); P.ell(6.5, 6, 3.6, 2.2, '#7d6c5a'); P.set(5, 5, '#d8c4a8'); P.set(7, 6, '#d8c4a8'); P.ell(10, 3.5, 1.8, 1.6, '#7d6c5a'); P.line(9.5, 2, 8.5, 0, 1, '#3c2e26'); P.line(11.5, 4, 14, 4.6, 1, '#3c2e26'); P.set(10.5, 3, '#fff'); P.set(10.5, 4, '#e8604a'); const c = '#a57a4e'; if (f) { P.line(6, 8, 4, 10.4, 1, c); P.line(7.5, 8, 9.5, 10.4, 1, c); } else { P.line(6, 8, 7.5, 10.4, 1, c); P.line(7.5, 8, 6, 10.4, 1, c); } }, '#2e2620'));
  SPR.quail = [0, 1].map(f => pix(9, 9, P => { P.ell(4, 5.5, 3, 2.4, '#8d94ab'); P.ell(3.6, 6.6, 2.2, 1.2, '#dccbaa'); P.ell(6.4, 3.5, 1.7, 1.5, '#6c6c80'); P.set(7, 3.6, '#222'); P.set(6.5, 1.5, '#2a2a30'); P.set(7, 1, '#2a2a30'); P.set(7.6, 4, '#3a3a3a'); P.set(3 + f, 8, '#8a6a4a'); P.set(5 - f, 8, '#8a6a4a'); }, '#3a3a48'));
  SPR.chick = [0, 1].map(f => pix(6, 5, P => { P.ell(2.8, 2.6, 2, 1.5, '#cfae80'); P.set(4.3, 1.6, '#3a2a1a'); P.set(1 + f, 4, '#8a6a4a'); P.set(3 - f, 4, '#8a6a4a'); }, '#6a5034'));
  SPR.rabbit = [0, 1].map(f => pix(11, 11, P => { const y0 = f ? -1 : 0; P.ell(4.5, 7.5 + y0, f ? 3.6 : 3, 2.3, '#b9a48e'); P.ell(7.4, 5 + y0, 1.9, 1.7, '#b9a48e'); P.line(7, 3.6 + y0, 6.4, 0.5 + y0, 1, '#b9a48e'); P.line(8, 3.6 + y0, 8.6, 0.5 + y0, 1, '#b9a48e'); P.set(6.5, 1.5 + y0, '#eaa6a0'); P.set(8.3, 1.5 + y0, '#eaa6a0'); P.set(8, 4.6 + y0, '#2a1a12'); P.set(1.4, 6.6 + y0, '#fff'); P.set(9.2, 5.5 + y0, '#e88a8a'); }, '#5a4636'));
  SPR.lizard = [0, 1].map(f => pix(12, 6, P => { P.line(1, 3, 3.5, 3, 1, '#9fae68'); P.line(3.5, 3, 9, 3, 2, '#a9b870'); P.ell(10, 3, 1.6, 1.2, '#a9b870'); P.set(10.4, 2.4, '#222'); P.set(5, 2.5, '#6d7a44'); P.set(7, 3, '#6d7a44'); P.set(5 + f, 1, '#8a9a58'); P.set(8 - f, 5, '#8a9a58'); P.set(5 - f, 5, '#8a9a58'); P.set(8 + f, 1, '#8a9a58'); }, '#4a5430'));
  SPR.tortoise = [0, 1].map(f => pix(13, 9, P => { P.set(2 + f, 7, '#a0926a'); P.set(8 - f, 7, '#a0926a'); P.ell(10.5, 5.5, 1.8, 1.4, '#b0a276'); P.set(11, 5, '#222'); P.ell(6, 4.6, 4.4, 3.2, '#8a7448'); P.map((x, y, c) => { if (c === '#8a7448' && (x + y * 2) % 5 === 0) return '#c9ad6a'; if (c === '#8a7448' && y < 3) return '#a68c56'; }); }, '#4a3c24'));
  SPR.raven = [0, 1].map(f => pix(13, 8, P => { P.ell(6, 4.5, 3.2, 1.6, '#2c2c3c'); if (f) { P.line(5, 4, 2, 0.5, 2, 1, '#3c3c50'); P.line(7, 4, 9, 0.5, 2, 1, '#3c3c50'); } else { P.line(5, 5, 1.5, 7, 2, 1, '#3c3c50'); P.line(7, 5, 10, 7, 2, 1, '#3c3c50'); } P.ell(9.6, 3.6, 1.4, 1.2, '#2c2c3c'); P.set(11.5, 4, '#555'); P.set(10, 3, '#ddd'); P.line(3, 4.5, 1, 5, 1, '#2c2c3c'); }, '#141420'));
  SPR.hawk = [0, 1].map(f => pix(19, 8, P => { const y = f ? 3 : 4; P.line(1, y, 8, 3.5, 2, '#8a6a46'); P.line(17, y, 10, 3.5, 2, '#8a6a46'); P.set(1, y + 1, '#5a4430'); P.set(2, y + 1, '#5a4430'); P.set(16, y + 1, '#5a4430'); P.set(17, y + 1, '#5a4430'); P.ell(9, 4, 2.2, 1.6, '#d6b88e'); P.set(9, 6, '#c8643a'); P.set(8, 6, '#c8643a'); P.set(10, 6, '#c8643a'); P.set(9, 2.4, '#5a4430'); }, '#3e2c1c'));
  SPR.owl = [0, 1].map(f => pix(9, 10, P => { P.ell(4.5, 6, 3.4, 3.6, '#8f6c4c'); P.ell(4.5, 5, 2.8, 2.2, '#e0c095'); P.set(1.5, 1.6, '#6a4c34'); P.set(7.5, 1.6, '#6a4c34'); P.set(2, 2.5, '#8f6c4c'); P.set(7, 2.5, '#8f6c4c'); if (f) { P.rect(2.5, 4.5, 2, 1, '#3a2a1a'); P.rect(5.5, 4.5, 2, 1, '#3a2a1a'); } else { P.rect(2.5, 4, 2, 2, '#ffd23f'); P.set(3.5, 5, '#1a1208'); P.rect(5.5, 4, 2, 2, '#ffd23f'); P.set(5.5, 5, '#1a1208'); } P.set(4.5, 6, '#c8903a'); P.set(3, 8, '#b49170'); P.set(6, 8, '#b49170'); }, '#3e2a1a'));
  SPR.hum = [0, 1].map(f => pix(9, 7, P => { P.ell(4, 4, 2, 1.4, '#3fae7a'); P.set(5, 4.6, '#e8405a'); P.line(6, 3.6, 8.6, 3.4, 1, '#2a2a2a'); P.set(5, 3, '#111'); P.set(1.4, 4.6, '#2d7a58'); if (f) { P.set(3, 1, '#cfeee0'); P.set(4, 1.5, '#cfeee0'); } else { P.set(3, 6, '#cfeee0'); P.set(2.5, 5.5, '#cfeee0'); } }, null));
  SPR.fly = pix(4, 3, P => { P.set(1.5, 1.5, '#2a2420'); P.set(2.5, 1.5, '#2a2420'); }, null);
  SPR.butter = ['#ffb84d', '#a8d8ff', '#ffd9ef', '#fff2a0'].map(c => [0, 1].map(f => pix(7, 5, P => { if (f) { P.rect(1, 1, 2, 2, c); P.rect(4, 1, 2, 2, c); } else { P.rect(2, 0, 1, 3, c); P.rect(4, 0, 1, 3, c); } P.set(3, 1, '#3a2a1a'); P.set(3, 2, '#3a2a1a'); }, null)));
  // the cowboys' camp
  SPR.cowboyA = pix(32, 15, P => {
    // lying on his back, hat over his face, boots to the sky
    P.rect(15, 8, 11, 4, '#4d6c9c'); P.rect(15, 8, 11, 1, '#7393c4'); P.rect(15, 11, 11, 1, '#3c5888');
    P.rect(24, 2, 4, 7, '#6e3c1e'); P.rect(24, 2, 4, 1, '#a06a3a'); P.set(28, 8, '#6e3c1e'); P.set(28, 7, '#e8c860');
    P.rect(6, 6, 10, 6, '#c8463a'); for (let x = 6; x < 16; x += 3) for (let y = 6; y < 12; y++) P.set(x, y, '#e27c6c'); for (let y = 7; y < 12; y += 3) for (let x = 6; x < 16; x++) P.set(x, y, '#a8342c');
    P.rect(15, 7, 1, 5, '#3a2414'); P.set(15, 9, '#f2cc60');
    P.ell(11, 7, 2.2, 1.4, '#ecb88e');
    P.ell(4, 9, 3, 2.7, '#ecb88e'); P.rect(6, 9, 1, 2, '#2a5aa8');
    P.ell(4, 7, 4.8, 1.6, '#7a4a24'); P.rect(1.5, 3, 5, 4, '#946032'); P.rect(1.5, 5, 5, 1, '#3a2414'); P.set(2, 3, '#b07a44');
  }, '#2a1a10');
  SPR.cowboyB = pix(24, 23, P => {
    // dozing against his saddle, hat tipped down, bottle in hand
    P.ell(5, 15, 5, 4, '#8a4e26'); P.ell(5, 14, 4, 2.6, '#a8642e'); P.rect(1, 18, 9, 2, '#6a3a1c'); P.set(8, 12, '#d8b070');
    P.rect(9, 18, 11, 3, '#4d6c9c'); P.rect(9, 18, 11, 1, '#7393c4'); P.rect(18, 13, 3, 6, '#6e3c1e'); P.rect(18, 13, 3, 1, '#a06a3a'); P.set(21, 18, '#6e3c1e'); P.set(21, 17, '#e8c860');
    P.rect(7, 9, 5, 9, '#d6ae68'); P.rect(7, 9, 1, 9, '#8a5a32'); P.rect(11, 9, 1, 9, '#8a5a32'); P.set(9, 12, '#f2cc60');
    P.ell(9.5, 6.6, 2.7, 2.5, '#ecb88e'); P.set(11.5, 7.6, '#c07a5a');
    P.ell(10, 5, 5, 1.5, '#7a4a24'); P.rect(7.5, 1.5, 5, 3, '#946032'); P.rect(7.5, 3.5, 5, 1, '#3a2414'); P.set(8, 1.5, '#b07a44');
    P.line(11, 12, 14, 15, 2, 1, '#d6ae68'); P.set(14.5, 15.5, '#ecb88e');
    P.rect(14, 11, 3, 6, '#2a1216'); P.rect(15, 9, 1, 2, '#2a1216'); P.set(15, 8, '#d8342c'); P.rect(14, 13, 3, 2, '#f3efe4');
  }, '#2a1a10');
  SPR.bottle = pix(6, 18, P => {
    P.rect(1, 7, 4, 10, '#2a1216'); P.rect(2, 4, 2, 3, '#2a1216'); P.set(1, 6, '#2a1216'); P.set(4, 6, '#2a1216');
    P.rect(2, 1, 2, 3, '#d8342c'); P.set(2, 1, '#ff7a6a');
    P.rect(1, 10, 4, 5, '#f3efe4'); P.set(2, 11, '#b8b2a6'); P.set(3, 11, '#b8b2a6');
    P.set(2, 13, '#3a3436'); P.set(3, 12, '#3a3436'); P.set(3, 13, '#3a3436'); P.set(2, 14, '#8a8478');
    P.rect(1, 7, 1, 3, '#5e3a42'); P.set(2, 5, '#5e3a42');
  }, '#120808');
  { const c = mk(18, 6), g = c.getContext('2d'); g.imageSmoothingEnabled = false; g.translate(18, 0); g.rotate(Math.PI / 2); g.drawImage(SPR.bottle, 0, 0); SPR.bottleS = c; }
  SPR.guitar = pix(20, 9, P => {
    P.ell(4, 4.5, 3.4, 3.4, '#d9a05a'); P.ell(8, 4.5, 2.6, 2.6, '#d9a05a'); P.ell(5.6, 4.5, 1.2, 1.2, '#3a2010');
    P.line(10, 4.5, 17, 4.5, 2, '#6a4426'); P.rect(17, 3, 3, 3, '#4a2c18'); P.set(18, 2.5, '#e8d8b0'); P.set(18, 6.5, '#e8d8b0');
    P.line(2, 4.5, 17, 4.5, 1, '#f2e6c8'); P.set(3, 2, '#f0c27a');
  }, '#3a2010');
  // ---------- tiny pixel font for signs ----------
  const FONT = { A: '010101111101101', S: '011100010001110', L: '100100100100111', O: '010101101101010', N: '101111111101101', G: '011100101101011', E: '111100110100111', R: '110101110101101', H: '101101111101101', T: '111010010010010', P: '110101110100100' };
  const word = (P, s, x, y, c) => { for (const ch of s) { const gl = FONT[ch]; if (gl) for (let i = 0; i < 15; i++) if (gl[i] === '1') P.set(x + (i % 3), y + ((i / 3) | 0), c); x += 4; } };
  // ---------- new plants & rocks ----------
  SPR.joshua = [0, 1].map(v => pix(24, 32, P => {
    const tr = '#8a7a5a', td = '#5e5240';
    P.line(12, 31, 12, 16, 3, 2, tr);
    const arms = v ? [[12, 17, 5, 8], [12, 19, 19, 6], [12, 22, 17, 15]] : [[12, 16, 6, 6], [12, 18, 18, 9]];
    for (const [x0, y0, x1, y1] of arms) P.line(x0, y0, x1, y1, 2, tr);
    P.map((x, y, c) => { if (c === tr && (x + y * 3) % 4 === 0) return td; });
    const tips = arms.map(a => [a[2], a[3]]).concat([[12, 14]]);
    for (const [cx, cy] of tips) { for (let k = 0; k < 12; k++) { const a = k / 12 * TAU; P.line(cx, cy, cx + Math.cos(a) * 3.4, cy + Math.sin(a) * 2.8, 1, k % 3 ? '#7a9a52' : '#a8c070'); } P.dot(cx, cy, 2, '#4e6a36'); }
  }, '#3a3424'));
  SPR.yucca = pix(15, 24, P => {
    P.line(7.5, 17, 7.5, 3, 1, '#9a8a5a');
    for (let y = 3; y < 10; y += 2) { P.set(6.5, y, '#fbf6e8'); P.set(8.5, y + 1, '#fbf6e8'); P.set(7.5, y - 1, '#ffffff'); }
    for (let k = 0; k < 11; k++) { const a = Math.PI * (1.05 + k / 10 * .9); P.line(7.5, 21, 7.5 + Math.cos(a) * 7, 21 + Math.sin(a) * 6, 1, k % 2 ? '#86a85a' : '#a8c47a'); }
    P.dot(7.5, 21, 3, '#5e7a3e');
  }, '#3a4a28');
  SPR.poppy = pix(13, 8, P => {
    for (let i = 0; i < 6; i++) P.line(2 + i * 1.8, 7, 2 + i * 1.8 + (i - 2.5) * .4, 4, 1, '#6a9a4a');
    for (const [x, y] of [[3, 3], [7, 2], [10, 4], [5, 5]]) { P.dot(x, y, 2, '#f28a2e'); P.set(x - .5, y - .5, '#ffc05a'); }
  }, null);
  SPR.lupine = pix(11, 12, P => {
    for (const [x, h] of [[2.5, 8], [5.5, 10], [8.5, 7]]) { P.line(x, 11, x, 11 - h, 1, '#6a9a4a'); for (let y = 11 - h; y < 11 - h + h * .6; y++) { P.set(x, y, (y & 1) ? '#8a6ad0' : '#b49cf0'); P.set(x - 1, y + 1, '#7a5ac0'); P.set(x + 1, y, '#9a7ae0'); } }
  }, null);
  SPR.lily = pix(10, 10, P => {
    for (let i = 0; i < 4; i++) P.line(2 + i * 2, 9, 1 + i * 2.6, 4, 1, '#7aa85a');
    for (const [x, y] of [[3, 3], [6.5, 2], [5, 5]]) { P.dot(x, y, 2, '#fff8f0'); P.set(x, y + 1, '#f4e2c8'); P.set(x - .5, y - .5, '#ffe27a'); }
  }, null);
  SPR.selenite = pix(11, 12, P => {
    const pr = (x, y, h, w) => { P.rect(x, y - h, w, h, '#dceaf4'); P.rect(x, y - h, 1, h, '#ffffff'); P.rect(x + w - 1, y - h, 1, h, '#b4cadc'); P.set(x + (w >> 1), y - h - 1, '#eef6fc'); };
    pr(2, 11, 6, 3); pr(5, 11, 9, 3); pr(8, 11, 5, 2);
  }, '#6a7e92');
  SPR.lavarock = pix(16, 12, P => {
    P.ell(8, 7, 6.6, 4.4, '#3c3236'); P.ell(7, 6, 4.6, 2.8, '#54464a');
    P.map((x, y) => { const hh = hash(x, y, 71); if (hh < .12) return '#221a1e'; if (hh > .93) return '#7a3e32'; if (y >= 9) return '#2e262a'; });
  }, '#140e10');
  SPR.cindercone = pix(46, 26, P => {
    for (let y = 5; y <= 22; y++) { const t = (y - 5) / 17, hw = 6 + 16 * Math.pow(t, .8); for (let x = Math.round(23 - hw); x <= Math.round(23 + hw); x++) { const rel = (x - 23) / hw; let c = rel < -.35 ? '#6e4e48' : rel > .4 ? '#3a2a2e' : '#54403e'; if (hash(x, y, 72) < .08) c = '#8a4434'; if (((x * 3 + y * 5) % 11) === 0) c = '#2e2226'; P.set(x, y, c); } }
    P.ell(23, 22, 22, 3, '#4a3638');
    P.ell(23, 5.5, 6.5, 2.2, '#7a5450'); P.ell(23, 5.5, 4.5, 1.3, '#1e1416');
  }, '#120a0c');
  // ---------- small treasures ----------
  SPR.arrowhead = pix(9, 12, P => { for (let y = 1; y < 9; y++) { const hw = (y - 1) * .45; for (let x = Math.round(4.5 - hw); x <= Math.round(4.5 + hw); x++) P.set(x, y, (x + y) % 3 ? '#5a5a66' : '#7a7a88'); } P.rect(3, 9, 3, 2, '#5a5a66'); P.set(4, 2, '#b8b8c8'); }, '#22222a');
  SPR.horseshoe = pix(12, 12, P => { P.ell(6, 5.5, 4.8, 4.8, '#9a7a5a'); P.ell(6, 5.5, 2.6, 2.6, null); P.rect(4, 6, 5, 6, null); P.set(2, 4, '#5a4432'); P.set(10, 4, '#5a4432'); P.set(2, 7, '#5a4432'); P.set(10, 7, '#5a4432'); P.set(4, 1, '#c8a47a'); }, '#3a2a1c');
  SPR.harmonica = pix(15, 7, P => { P.rect(1, 1, 13, 5, '#c8ccd4'); P.rect(1, 1, 13, 1, '#eef0f4'); P.rect(1, 3, 13, 1, '#7a5a3a'); for (let x = 2; x < 13; x += 2) P.set(x, 3, '#2a1a10'); P.rect(1, 5, 13, 1, '#8a8e96'); }, '#3a3a44');
  SPR.ticket = pix(14, 9, P => { P.rect(1, 1, 12, 7, '#f4e6c4'); P.rect(1, 1, 3, 7, '#d8402c'); P.rect(6, 3, 6, 1, '#8a6a4a'); P.rect(6, 5, 4, 1, '#8a6a4a'); P.set(2, 3, '#f4e6c4'); P.set(2, 5, '#f4e6c4'); }, '#5a3a24');
  SPR.devilIcon = pix(12, 14, P => { for (let k = 0; k < 18; k++) { const a = k * .9, h = k * .7, r = 1 + k * .26; P.set(6 + Math.cos(a) * r, 12 - h + Math.sin(a) * r * .3, k & 1 ? '#e8c494' : '#c9a070'); } }, null);
  SPR.starIcon = pix(11, 11, P => { P.line(5.5, 0, 5.5, 10, 1, '#ffe27a'); P.line(0, 5.5, 10, 5.5, 1, '#ffe27a'); P.line(2, 2, 9, 9, 1, '#fff2b0'); P.line(9, 2, 2, 9, 1, '#fff2b0'); P.dot(5.5, 5.5, 3, '#fff8d8'); }, null);
  // ---------- landmarks ----------
  SPR.lm_windmill = pix(26, 56, P => {
    const w1 = '#8a6a4a', w2 = '#6a4e36';
    P.line(4, 55, 11, 12, 2, w1); P.line(22, 55, 15, 12, 2, w1);
    for (let y = 18; y < 54; y += 9) { const t1 = (y - 12) / 43, t2 = Math.min(1, (y + 9 - 12) / 43); const xl1 = 11 - 7 * t1, xr1 = 15 + 7 * t1, xl2 = 11 - 7 * t2, xr2 = 15 + 7 * t2; P.line(xl1, y, xr2, Math.min(55, y + 9), 1, w2); P.line(xr1, y, xl2, Math.min(55, y + 9), 1, w2); P.line(xl1, y, xr1, y, 1, w1); }
    P.rect(9, 10, 8, 2, '#5a4030'); P.line(13, 10, 13, 6, 1, '#4a3a30');
  }, '#3a2a1c');
  SPR.lm_tank = pix(24, 28, P => {
    P.rect(4, 19, 2, 8, '#5a4030'); P.rect(18, 19, 2, 8, '#5a4030'); P.rect(11, 19, 2, 8, '#4a3428');
    P.rect(2, 6, 20, 14, '#9a6a42'); for (let x = 3; x < 22; x += 3) P.rect(x, 6, 1, 14, '#845832'); P.rect(2, 6, 2, 14, '#b4825a');
    for (const y of [8, 13, 18]) P.rect(2, y, 20, 1, '#4a3a30');
    P.ell(12, 5.5, 10, 2.6, '#7a5232'); P.ell(12, 5, 8, 1.6, '#5a3a22');
  }, '#2a1c14');
  const building = (txt, wall, wallD, trim, tall) => pix(42, 40, P => {
    const top = tall ? 1 : 5;
    P.rect(4, top, 34, 20 - top, wall); for (let y = top + 2; y < 20; y += 3) P.rect(4, y, 34, 1, wallD);
    P.rect(4, top, 34, 1, trim); P.rect(3, top + 1, 1, 3, trim); P.rect(38, top + 1, 1, 3, trim);
    const sw = txt.length * 4 + 3, sx = 21 - (sw >> 1);
    P.rect(sx, top + 3, sw, 8, '#4a2e22'); P.rect(sx + 1, top + 4, sw - 2, 6, '#e8d2a8'); word(P, txt, sx + 2, top + 5, '#5a2e1e');
    P.rect(2, 18, 38, 20, wall); for (let y = 20; y < 38; y += 3) P.rect(2, y, 38, 1, wallD);
    P.rect(2, 18, 38, 1, wallD);
    P.rect(0, 20, 42, 2, '#5a3a28'); P.rect(0, 22, 42, 1, '#3a2418'); P.rect(1, 22, 2, 16, '#6a4a32'); P.rect(39, 22, 2, 16, '#6a4a32');
    P.rect(6, 26, 7, 6, '#2a2028'); P.rect(6, 26, 7, 1, trim); P.rect(9, 26, 1, 6, '#4a3a40');
    P.rect(29, 26, 7, 6, '#2a2028'); P.rect(29, 26, 7, 1, trim); P.rect(32, 26, 1, 6, '#4a3a40');
    P.rect(17, 25, 8, 13, '#2a1a14');
    if (tall) { P.rect(8, top + 12, 5, 4, '#2a2028'); P.rect(29, top + 12, 5, 4, '#2a2028'); }
    P.rect(2, 37, 38, 1, '#5a3a28');
  }, '#2a1a10');
  SPR.lm_saloon = building('SALOON', '#b07a4c', '#946038', '#e8c890', false);
  { const g2 = SPR.lm_saloon.getContext('2d'); g2.fillStyle = '#d8a86a'; g2.fillRect(17, 28, 3, 6); g2.fillRect(22, 28, 3, 6); g2.fillStyle = '#8a5a30'; g2.fillRect(17, 28, 3, 1); g2.fillRect(22, 28, 3, 1); }
  SPR.lm_store = building('GENERAL', '#9a8a6a', '#7e7056', '#e8dcc0', false);
  SPR.lm_hotel = building('HOTEL', '#a8604a', '#8a4a38', '#f0c8a0', true);
  SPR.lm_barrel = pix(9, 11, P => { P.ell(4.5, 6, 3.8, 4.6, '#9a6a42'); P.rect(1, 3, 7, 1, '#4a3a30'); P.rect(1, 8, 7, 1, '#4a3a30'); P.rect(2, 2, 1, 8, '#b4825a'); P.ell(4.5, 1.6, 3, 1, '#6a4a2e'); }, '#2a1c14');
  const bone = '#ece2cc', boneD = '#cbbd9e', boneL = '#fffaf0';
  SPR.lm_wskull = pix(30, 16, P => {
    P.ell(13, 8, 12, 5.6, bone); P.ell(12, 7, 9, 3.4, boneL); P.ell(24, 10, 5.5, 3.6, bone);
    P.ell(8, 8, 2.4, 1.8, '#5a4a38'); P.line(3, 11, 27, 12, 1, boneD);
    P.map((x, y) => { if (y >= 13) return '#e2c08c'; });
  }, '#6e604a');
  SPR.lm_ribB = pix(7, 20, P => { for (let i = 0; i <= 12; i++) { const t = i / 12; P.dot(1.5 + Math.sin(t * 2.2) * 3.5, 19 - t * 17, 2, t > .8 ? boneD : bone); } }, '#6e604a');
  SPR.lm_ribF = pix(7, 22, P => { for (let i = 0; i <= 12; i++) { const t = i / 12; P.dot(5.5 - Math.sin(t * 2.2) * 3.5, 21 - t * 19, 2, t > .8 ? boneL : bone); } }, '#6e604a');
  SPR.lm_wtail = pix(16, 9, P => { P.line(1, 5, 7, 5, 2, bone); P.line(7, 5, 14, 1, 2, 1, bone); P.line(7, 5, 14, 8, 2, 1, bone); }, '#6e604a');
  const ss = '#d98a5e', ssD = '#b86a44', ssL = '#eaa47a';
  SPR.lm_archL = pix(18, 36, P => { for (let y = 0; y < 36; y++) { const hw = 6 + Math.max(0, y - 26) * .35 + Math.sin(y * .7) * .5, x0 = Math.round(9 - hw), x1 = Math.round(9 + hw); for (let x = x0; x <= x1; x++) P.set(x, y, x - x0 < 3 ? ssL : x1 - x < 3 ? ssD : (y % 6 === 4 ? ssD : ss)); } P.ell(9, 34, 8.4, 2.2, ssD); }, '#6a3424');
  SPR.lm_archR = SPR.lm_archL;
  SPR.lm_archTop = pix(70, 20, P => { for (let x = 0; x < 70; x++) { const s = Math.sin(Math.PI * x / 69); const yo = Math.round(4 - 3 * s), yi = Math.round(19 - 11 * s); for (let y = yo; y <= yi; y++) { let c = ss; if (y - yo < 2) c = ssL; else if (yi - y < 2) c = ssD; else if (y % 5 === 0) c = ssD; P.set(x, y, c); } } }, '#6a3424');
  SPR.lm_wagon = pix(40, 28, P => {
    P.line(0, 21, 8, 19, 1, '#6a4a32');
    P.rect(5, 14, 30, 6, '#8a5a36'); P.rect(5, 14, 30, 1, '#a87448'); for (let x = 8; x < 35; x += 5) P.rect(x, 15, 1, 5, '#6a4228');
    for (let x = 6; x <= 34; x++) { const t = (x - 6) / 28; const hh = Math.round(Math.sin(t * Math.PI) * 4 + 8); for (let y = 14 - hh; y < 14; y++) P.set(x, y, (x % 6 === 0) ? '#d8ccb4' : '#f2ead8'); }
    P.ell(22, 8, 2.4, 2, '#3a2a20');
    const wh = (cx, cy, r) => { for (let a = 0; a < 18; a++) { const t = a / 18 * TAU; P.set(cx + Math.cos(t) * r, cy + Math.sin(t) * r, '#4a3428'); } for (let a = 0; a < 4; a++) { const t = a / 4 * Math.PI; P.line(cx - Math.cos(t) * r, cy - Math.sin(t) * r, cx + Math.cos(t) * r, cy + Math.sin(t) * r, 1, '#6a4a32'); } P.set(cx, cy, '#2a1c14'); };
    wh(10, 22, 4.5); P.rect(28, 20, 6, 6, '#7a5232');
  }, '#2a1c14');
  SPR.lm_wheel = pix(15, 8, P => { P.ell(7.5, 4, 6.4, 2.8, '#4a3428'); P.ell(7.5, 4, 4.8, 1.7, null); P.line(2, 4, 13, 4, 1, '#6a4a32'); P.line(7.5, 1.5, 7.5, 6.5, 1, '#6a4a32'); P.set(7.5, 4, '#2a1c14'); }, '#2a1c14');
  SPR.lm_station = pix(40, 32, P => {
    P.rect(2, 10, 36, 21, '#e8e0d0'); P.rect(2, 10, 36, 1, '#fff8ec'); for (let y = 13; y < 31; y += 4) P.rect(2, y, 36, 1, '#d6ccba');
    P.rect(0, 6, 40, 4, '#c8402c'); for (let x = 0; x < 40; x += 4) P.rect(x, 6, 2, 4, '#f4ece0');
    P.rect(0, 10, 40, 1, '#8a2a1e');
    P.rect(5, 0, 15, 7, '#3a2a30'); word(P, 'EAT', 7, 1, '#ff6a5a');
    P.rect(6, 15, 9, 7, '#5a7a8a'); P.rect(6, 15, 9, 1, '#9ab8c8'); P.rect(10, 15, 1, 7, '#e8e0d0');
    P.rect(24, 15, 7, 16, '#6a4a3a'); P.set(29, 23, '#e8c060');
    P.rect(2, 30, 36, 1, '#8a8278');
  }, '#3a2a28');
  SPR.lm_pump = pix(9, 18, P => { P.rect(1, 5, 7, 12, '#d8402c'); P.rect(1, 5, 2, 12, '#f06a50'); P.rect(2, 8, 5, 3, '#f4ece0'); P.ell(4.5, 2.5, 3, 2.4, '#fff4e0'); P.rect(0, 16, 9, 2, '#6a6058'); P.line(8, 10, 8, 14, 1, '#2a2a2a'); }, '#3a1a14');
  SPR.lm_sign = pix(15, 32, P => { P.rect(6, 10, 2, 22, '#6a5a52'); P.rect(0, 0, 15, 10, '#2a2030'); P.rect(1, 1, 13, 8, '#3a2e40'); word(P, 'GAS', 2, 3, '#ff5a6a'); }, '#140e18');
  const mbox = up => pix(10, 15, P => { P.rect(4, 6, 2, 9, '#7a5a3a'); P.rect(1, 2, 7, 5, '#9aa4ae'); P.ell(4.5, 2.5, 3.5, 1.5, '#b8c2cc'); P.rect(1, 5, 7, 2, '#7a848e'); P.rect(0, 3, 1, 4, '#5a646e'); if (up) { P.rect(8, 0, 1, 5, '#e0392c'); P.rect(9, 0, 1, 2, '#e0392c'); } else P.rect(8, 4, 2, 1, '#e0392c'); }, '#2a2a30');
  SPR.lm_mailbox = mbox(true); SPR.lm_mailboxD = mbox(false);
  SPR.lm_glyph = pix(26, 20, P => {
    P.ell(13, 11, 12, 8.4, '#b0724e'); P.ell(11, 9, 9, 5.4, '#c4865e');
    P.map((x, y) => { const n = vnoise(x / 4, y / 4, 33); if (n < .3) return '#7a4430'; if (y >= 16) return '#8a5038'; });
    const cv = '#f0d0a8';
    for (let a = 0; a < 14; a++) { const t = a * .55, r = .4 + a * .24; P.set(7 + Math.cos(t) * r, 9 + Math.sin(t) * r, cv); }
    P.rect(13, 8, 4, 1, cv); P.set(13, 9, cv); P.set(16, 9, cv); P.set(17, 7, cv); P.set(18, 6, cv); P.set(12, 7, cv);
    P.rect(19, 12, 3, 1, cv); P.set(18, 11, cv); P.set(18, 13, cv); P.set(22, 11, cv); P.set(22, 13, cv);
  }, '#4a2618');
  SPR.glyphBig = pix(96, 64, P => {
    P.ell(48, 34, 46, 29, '#9a5a3c'); P.ell(44, 30, 38, 22, '#b0724e');
    P.map((x, y) => { const n = vnoise(x / 7, y / 7, 34); if (n < .28) return '#6e3a28'; if (n > .78) return '#c4865e'; });
    const cv = '#f4d8b4';
    for (let a = 0; a < 60; a++) { const t = a * .32, r = 1 + a * .17; P.dot(22 + Math.cos(t) * r, 26 + Math.sin(t) * r, 1, cv); }
    P.line(42, 30, 58, 30, 2, cv); P.line(58, 30, 62, 23, 2, 1, cv); P.line(62, 23, 66, 24, 2, cv); P.set(61, 21, cv);
    for (const x of [44, 47, 54, 57]) P.line(x, 31, x + (x < 50 ? -1 : 1), 38, 1, cv);
    P.line(42, 30, 38, 34, 1, cv);
    const hand = (x, y) => { P.ell(x, y, 2.2, 2.6, cv); for (let i = 0; i < 4; i++) P.line(x - 1.5 + i, y - 2, x - 2.5 + i * 1.4, y - 6, 1, cv); P.line(x + 2, y, x + 4, y - 2, 1, cv); };
    hand(26, 48); hand(33, 50);
    P.ell(70, 46, 5, 2.4, cv); P.ell(70, 46, 3.4, 1.2, '#9a5a3c'); P.line(75, 46, 79, 43, 1, cv); P.line(75, 46, 79, 49, 1, cv); P.set(67, 45, cv);
    for (let a = 0; a < 8; a++) { const t = a / 8 * TAU; P.line(76 + Math.cos(t) * 5, 18 + Math.sin(t) * 5, 76 + Math.cos(t) * 8, 18 + Math.sin(t) * 8, 1, cv); } for (let a = 0; a < 20; a++) { const t = a / 20 * TAU; P.set(76 + Math.cos(t) * 3.4, 18 + Math.sin(t) * 3.4, cv); }
    P.ell(48, 13, 1.4, 1.4, cv); P.line(48, 15, 48, 21, 1, cv); P.line(45, 17, 51, 17, 1, cv); P.line(48, 21, 46, 25, 1, cv); P.line(48, 21, 50, 25, 1, cv);
  }, '#4a2618');
  SPR.lm_dskull = pix(14, 9, P => { P.ell(6, 5, 5, 3, '#e6dcc4'); P.ell(11, 6, 3, 1.6, '#e6dcc4'); P.set(5, 4, '#5a4a38'); P.line(3, 7, 13, 7, 1, '#cbbd9e'); for (let x = 8; x < 13; x += 2) P.set(x, 8, '#fffaf0'); }, '#6e604a');
  SPR.lm_bell = pix(26, 32, P => {
    P.rect(2, 4, 3, 28, '#7a5a3a'); P.rect(21, 4, 3, 28, '#7a5a3a'); P.rect(2, 4, 1, 28, '#9a7650');
    P.rect(0, 3, 26, 3, '#5a4030'); P.rect(1, 1, 24, 2, '#6a4a36');
    P.rect(12, 6, 2, 3, '#3a2a20');
    for (let y = 9; y <= 20; y++) { const t = (y - 9) / 11, hw = 2.5 + t * t * 5; for (let x = Math.round(13 - hw); x <= Math.round(13 + hw); x++) P.set(x, y, x < 11 ? '#e8b860' : x > 15 ? '#8a5a22' : '#c08a3a'); }
    P.rect(7, 20, 13, 1, '#6a4418'); P.dot(13, 22, 2, '#4a3010');
    P.rect(0, 30, 26, 2, '#6a5a4a');
  }, '#2a1c10');
  // ---------- the train ----------
  const twheel = (P, cx, cy, r, col) => { P.ell(cx, cy, r, r, col); P.ell(cx, cy, Math.max(.8, r - 1.2), Math.max(.8, r - 1.2), '#3a2a2a'); P.set(cx, cy, col); };
  SPR.loco = [0, 1].map(f => pix(48, 30, P => {
    P.rect(2, 4, 14, 18, '#a83a2c'); P.rect(1, 3, 16, 2, '#2a2224'); P.rect(5, 7, 7, 5, '#f4d890'); P.rect(2, 4, 2, 18, '#c85a44');
    P.rect(14, 10, 29, 10, '#2c3a3a'); P.rect(14, 10, 29, 2, '#4c5e5c'); P.rect(14, 18, 29, 2, '#1e2828');
    P.rect(21, 10, 1, 10, '#c9a04a'); P.rect(31, 10, 1, 10, '#c9a04a');
    P.ell(27, 9, 2.4, 2, '#c9a04a');
    P.rect(36, 2, 5, 8, '#2a2224'); P.rect(35, 1, 7, 2, '#3a3234');
    P.rect(42, 9, 3, 3, '#ffe27a');
    P.rect(2, 20, 42, 2, '#2a2224');
    for (let i = 0; i < 4; i++) P.line(43 + i * .6, 20, 47, 26, 1, '#c84a3a');
    twheel(P, 12, 24, 4.5, '#c8402c'); twheel(P, 22, 24, 4.5, '#c8402c'); twheel(P, 32, 24, 4.5, '#c8402c'); twheel(P, 40, 26, 2.5, '#c8402c');
    P.line(12, f ? 22 : 26, 32, f ? 22 : 26, 1, '#b8bcc4');
  }, '#120c0c'));
  SPR.tender = pix(26, 24, P => { P.rect(1, 6, 24, 13, '#2a2e30'); P.rect(1, 6, 24, 2, '#4a5052'); for (let x = 2; x < 24; x += 3) P.dot(x, 5, 2, '#141414'); P.rect(1, 18, 24, 2, '#1a1a1c'); twheel(P, 6, 20, 3, '#5a5050'); twheel(P, 19, 20, 3, '#5a5050'); }, '#0c0c0c');
  SPR.boxcar = pix(40, 26, P => { P.rect(1, 3, 38, 16, '#9a4a32'); P.rect(1, 2, 38, 2, '#5a2a1e'); for (let x = 3; x < 38; x += 4) P.rect(x, 4, 1, 15, '#7e3a26'); P.rect(15, 6, 10, 13, '#7e3a26'); P.rect(16, 7, 8, 11, '#8a4230'); P.rect(23, 12, 1, 2, '#d8c8a0'); P.rect(1, 19, 38, 2, '#2a1a16'); twheel(P, 6, 21, 3, '#5a5050'); twheel(P, 11, 21, 3, '#5a5050'); twheel(P, 29, 21, 3, '#5a5050'); twheel(P, 34, 21, 3, '#5a5050'); }, '#140a08');
  SPR.passcar = pix(42, 26, P => { P.rect(1, 4, 40, 15, '#3f6e58'); P.ell(21, 4, 20, 2.4, '#2a3a32'); P.rect(1, 12, 40, 1, '#c9a04a'); for (let k = 0; k < 6; k++) P.rect(4 + k * 6, 6, 4, 5, '#f2dfa0'); P.rect(1, 19, 40, 2, '#1e2a24'); twheel(P, 6, 21, 3, '#5a5050'); twheel(P, 11, 21, 3, '#5a5050'); twheel(P, 31, 21, 3, '#5a5050'); twheel(P, 36, 21, 3, '#5a5050'); }, '#0e1410');
  SPR.caboose = pix(32, 28, P => { P.rect(2, 8, 28, 13, '#b0402c'); P.rect(2, 8, 28, 1, '#d06048'); P.rect(10, 2, 12, 7, '#b0402c'); P.rect(9, 1, 14, 2, '#3a2420'); P.rect(12, 4, 3, 3, '#f2dfa0'); P.rect(17, 4, 3, 3, '#f2dfa0'); P.rect(6, 11, 5, 5, '#f2dfa0'); P.rect(21, 11, 5, 5, '#f2dfa0'); P.rect(0, 7, 32, 1, '#3a2420'); P.rect(0, 21, 32, 2, '#2a1a16'); twheel(P, 8, 23, 3, '#5a5050'); twheel(P, 24, 23, 3, '#5a5050'); }, '#140a08');
  // ---------- more creatures ----------
  SPR.coyote = [0, 1, 2].map(f => pix(16, 14, P => {
    const c = '#a8907a', d = '#7a6656', l = '#d8c4ac';
    if (f === 2) {
      P.ell(8, 7, 5, 2.6, c); P.line(4, 6, 1, 4, 2, 1, d);
      P.ell(13, 4.5, 2.2, 1.8, c); P.line(14, 4, 15.5, 5, 1, d); P.set(12, 2.4, d); P.set(13.6, 2.2, d); P.set(13.5, 4, '#222');
      P.line(5, 9, 4, 13, 1, d); P.line(7, 9, 8, 13, 1, d); P.line(10, 9, 9, 13, 1, d); P.line(12, 9, 13, 13, 1, d); P.set(7, 6, l);
    } else {
      P.line(4, 12, 1, 12, 2, 1, d);
      P.ell(6, 9, 3.4, 3.6, c); P.ell(7.5, 6, 2.4, 3, c); P.set(6, 8, l); P.set(7, 9, l);
      const hx = 9, hy = f ? 1.8 : 3;
      P.ell(hx, hy + 1, 2, 1.7, c); P.line(hx + 1, hy + (f ? 0 : 1.4), hx + 3, hy - (f ? 1.4 : -1.2), 1, d);
      P.set(hx - 1, hy - .6, d); P.set(hx + .5, hy - 1, d); P.set(hx + .6, hy + .6, '#222');
      P.line(8, 10, 8, 13, 1, d); P.line(5, 12, 9, 13, 1, d);
    }
  }, '#3a2e26'));
  SPR.bighorn = [0, 1].map(f => pix(16, 15, P => {
    const c = '#8a6a4c', d = '#6a4e36', w = '#efe4d2';
    P.ell(7, 8, 5, 3, c); P.ell(3, 8, 1.8, 2, w);
    P.ell(12, 5, 2, 1.8, c); P.set(13.8, 6, d); P.set(12.6, 4.5, '#222');
    for (let a = 0; a < 9; a++) { const t = a / 8 * TAU * .8; P.set(11 + Math.cos(t + 2.2) * 2, 3.6 + Math.sin(t + 2.2) * 2, '#d8c49a'); }
    const k = f ? 1 : 0; P.line(4, 10, 4 - k, 14, 1, d); P.line(6, 10, 6 + k, 14, 1, d); P.line(9, 10, 9 - k, 14, 1, d); P.line(11, 10, 11 + k, 14, 1, d);
  }, '#2e2216'));
  SPR.scorp = [0, 1].map(f => pix(11, 8, P => { const c = '#8a6a3a'; P.ell(5, 5, 2.4, 1.4, c); P.line(3, 5, 1, 4, 1, c); P.line(1, 4, 1.5, 1.5, 1, c); P.set(2.5, 1, '#5a3a1a'); P.line(7, 4, 9.5, 3 + f, 1, c); P.line(7, 6, 9.5, 7 - f, 1, c); for (let i = 0; i < 3; i++) { P.set(4 + i, 7, '#6a4a2a'); P.set(4 + i, 3, '#6a4a2a'); } }, null));
  SPR.wren = [0, 1, 2].map(f => pix(7, 6, P => {
    if (f < 2) { P.ell(3, 3.5, 2, 1.4, '#8a6a4a'); P.set(2, 3, '#e8dcc8'); P.set(4, 4, '#e8dcc8'); P.set(5, f ? 3 : 2, '#6a4a32'); P.set(5.6, f ? 3.6 : 2.4, '#3a2a1a'); P.set(.6, 2.6, '#6a4a32'); P.set(2.5, 5, '#5a3a2a'); P.set(3.5, 5, '#5a3a2a'); }
    else { P.ell(3, 3, 1.6, 1, '#8a6a4a'); P.line(1, 1, 3, 3, 1, '#6a4a32'); P.line(5, 1, 3, 3, 1, '#6a4a32'); }
  }, '#2a1c12'));
  SPR.wrenUp = pix(7, 6, P => { P.ell(3, 3, 1.6, 1, '#8a6a4a'); P.line(.5, 4.5, 3, 3, 1, '#6a4a32'); P.line(5.5, 4.5, 3, 3, 1, '#6a4a32'); }, '#2a1c12');
  // M., made of light
  SPR.mfig = [0, 1, 2, 3].map(f => pix(14, 25, P => {
    const c = '#e8f4ff', s2 = '#b8d2f2', d = '#86a8d8';
    P.rect(2, 4, 10, 1, d); P.rect(4, 1, 6, 3, s2); P.rect(4, 3, 6, 1, d); P.set(5, 1, c);
    P.rect(5, 5, 4, 3, c); P.set(6, 6, d); P.set(8, 6, d);
    P.rect(4, 8, 6, 9, s2); P.rect(5, 8, 4, 9, c); P.rect(3, 14, 8, 4, s2); P.rect(5, 8, 4, 1, '#ffd6e0');
    if (f === 3) { P.line(9, 9, 13, 8, 1, c); P.set(13, 7, c); P.rect(3, 9, 1, 6, s2); } else { P.rect(3, 9, 1, 6, s2); P.rect(10, 9, 1, 6, s2); }
    const k = f === 1 ? 1 : 0, k2 = f === 2 ? 1 : 0;
    P.rect(5 - k, 18, 1, 6, d); P.rect(8 + k2, 18, 1, 6, d); P.rect(4 - k, 23, 2, 1, d); P.rect(8 + k2, 23, 2, 1, d);
  }, '#5a78b0'));
  // ghost sea
  const ghost = (w, h, fn) => pix(w, h, fn, null);
  SPR.gfish = ghost(12, 6, P => { P.ell(5, 3, 4, 2, '#8feaff'); P.ell(5, 3, 2.8, 1, '#2a8fb8'); P.line(9, 3, 11.5, .8, 1, '#8feaff'); P.line(9, 3, 11.5, 5.2, 1, '#8feaff'); P.set(3, 2.6, '#e8ffff'); });
  SPR.gwhale = ghost(46, 16, P => { P.ell(19, 8, 17, 6.4, '#8feaff'); P.ell(19, 8.6, 15.6, 5, '#256f96'); P.line(35, 8, 44, 3, 2, 1, '#8feaff'); P.line(35, 8, 44, 12.6, 2, 1, '#8feaff'); P.line(14, 11, 11, 15, 2, 1, '#8feaff'); P.set(7, 6, '#e8ffff'); for (let x = 6; x < 30; x += 3) P.set(x, 11, '#8feaff'); });
  SPR.gjelly = ghost(9, 12, P => { P.ell(4.5, 3.5, 3.8, 3, '#d8b8ff'); P.ell(4.5, 4, 2.6, 1.8, '#6a4aa8'); for (let i = 1; i < 9; i += 2) P.line(i, 6, i + Math.sin(i) * .8, 11, 1, '#b89aff'); });
}

/* ============================== glow sprites ============================== */
const GLOW = {};
function makeGlow(r, rgb, maxA) {
  const s = r * 2 + 1, c = mk(s, s), g = c.getContext('2d'), id = g.createImageData(s, s);
  for (let y = 0; y < s; y++) for (let x = 0; x < s; x++) {
    const d = Math.hypot(x - r, y - r) / r; if (d >= 1) continue;
    const a = Math.pow(1 - d, 1.6); const lvl = Math.floor(a * 4 + bay(x, y) * .999) / 4; if (lvl <= 0) continue;
    const o = (y * s + x) * 4; id.data[o] = rgb[0]; id.data[o + 1] = rgb[1]; id.data[o + 2] = rgb[2]; id.data[o + 3] = Math.round(255 * lvl * maxA);
  }
  g.putImageData(id, 0, 0); return c;
}
function buildGlows() {
  GLOW.stone = makeGlow(22, [150, 210, 255], .55);
  GLOW.stoneS = makeGlow(9, [190, 230, 255], .7);
  GLOW.fly = makeGlow(14, [255, 220, 140], .55);
  GLOW.tiny = makeGlow(4, [255, 240, 190], .9);
  GLOW.moth = makeGlow(6, [200, 255, 170], .8);
  GLOW.horse = makeGlow(40, [255, 214, 160], .16);
  GLOW.sea = makeGlow(12, [120, 230, 255], .35);
  GLOW.uv = makeGlow(7, [110, 255, 225], .8);
  GLOW.neon = makeGlow(16, [255, 90, 110], .5);
  GLOW.lamp = makeGlow(26, [255, 230, 160], .45);
  GLOW.win = makeGlow(5, [255, 220, 150], .7);
  GLOW.m = makeGlow(22, [190, 222, 255], .5);
}

/* ============================== world ============================== */
const CHS = 128;
const riverY = x => 150 + 80 * Math.sin(x / 330) + 30 * Math.sin(x / 127 + 2.1);
const riverHW = x => 9 + 3 * Math.sin(x / 210 + 1);
const inRiverBed = (x, y, pad) => Math.abs(y - riverY(x)) < riverHW(x) + (pad || 0);
// the old railroad runs east to west forever
const RAILY = -560;
const nearRail = (y, pad) => Math.abs(y - RAILY) < pad;
// regions: big warped cells, each its own little land with its own name
const RC = 560, regCache = new Map();
let RGX = 0, RGY = 0, ORX = 0, ORY = 0;
function regionOf(x, y) {
  const wx = x + (vnoise(x / 260, y / 260, 77) - .5) * 240 + (vnoise(x / 70, y / 70, 79) - .5) * 34;
  const wy = y + (vnoise(x / 260, y / 260, 78) - .5) * 240 + (vnoise(x / 70, y / 70, 80) - .5) * 34;
  const gx = Math.floor(wx / RC), gy = Math.floor(wy / RC); let best = 1e18;
  for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) {
    const cx = gx + i, cy = gy + j, px = (cx + .12 + .76 * hash(cx, cy, 81)) * RC, py = (cy + .12 + .76 * hash(cx, cy, 82)) * RC;
    const d = (wx - px) * (wx - px) + (wy - py) * (wy - py); if (d < best) { best = d; RGX = cx; RGY = cy; }
  }
}
const BW = [1.1, 1.15, .8, .8, 1, .95, .8, .7, .65];
const RN_A = ['Coyote', 'Lonesome', 'Sleeping', 'Little', 'Whistling', 'Copper', 'Rattlesnake', 'Bluebird', 'Sixmile', 'Dry Bell', 'Lantern', 'Hollow', 'Juniper', 'Moonlight', 'Saddle', 'Thimble', 'Quiet', 'Honey', 'Tin Cup', 'Velvet', 'Kestrel', 'Sundown', 'Two Moon', 'Crooked', 'Cricket', 'Feather', 'Pinto', 'Mockingbird', 'Silver', 'Paper', 'Starling', 'Button', 'Cinnamon', 'Peach', 'Lavender', 'Halfway', "Old Pete's", 'Biscuit', 'Wishbone', 'Lullaby', 'Echo', 'Gentle', 'Buttercup', 'Sparrow', 'Harmonica', 'Blue Mule', 'Dandelion', 'Sugar', 'Wagon Wheel', 'Tumbleweed', 'Hush', 'Marigold', 'Pocket', 'Cloudy', 'Sleepy Owl', 'Forgotten'];
const RN_B = [['Dunes', 'Sands', 'Drifts', 'Sandhills'], ['Wash', 'Flats', 'Draw', 'Hollow', 'Basin'], ['Springs', 'Gardens', 'Green', 'Bottoms'], ['Salt Pan', 'Dry Lake', 'Playa', 'Salt Flats'], ['Mesa', 'Canyon', 'Buttes', 'Bluffs', 'Red Rocks'], ['Woods', 'Grove', 'Thicket'], ['Meadow', 'Fields', 'Bloom'], ['White Sands', 'Gypsum Hills', 'Pale Dunes'], ['Cinders', 'Lava Beds', 'Black Rocks']];
function regionInfo(gx, gy) {
  const k = gx + ',' + gy; let r = regCache.get(k); if (r) return r;
  const dx = gx - ORX, dy = gy - ORY; let b;
  if (!dx && !dy) b = 1;
  else if (Math.abs(dx) <= 1 && Math.abs(dy) <= 1) b = [0, 2, 4, 5, 1, 0, 6, 2][Math.floor(hash(gx, gy, 83) * 8)];
  else { let tot = 0; for (const w of BW) tot += w; let u = hash(gx, gy, 84) * tot; b = 0; for (let i = 0; i < BW.length; i++) { u -= BW[i]; if (u <= 0) { b = i; break; } } }
  const name = (!dx && !dy) ? 'Nowhere in Particular' : RN_A[Math.floor(hash(gx, gy, 85) * RN_A.length)] + ' ' + RN_B[b][Math.floor(hash(gx, gy, 86) * RN_B[b].length)];
  r = { gx, gy, b, name, key: k }; regCache.set(k, r); return r;
}
function regionAt(x, y) { regionOf(x, y); return regionInfo(RGX, RGY); }
regionOf(0, 0); ORX = RGX; ORY = RGY;
function biomeAt(x, y) { const b = regionAt(x, y).b; if (b === 1 && fbm(x / 300, y / 300, 29) > .64) return 2; return b; }
const BIOME_NAME = ['dunes', 'scrub', 'green scrub', 'salt flats', 'red rock', 'Joshua woods', 'wildflower meadow', 'white sands', 'cinder fields'];

// story stones
const LINES = [
  'The sand keeps every hoofprint for a little while. Then it lets them go, kindly.',
  'Somewhere under all this quiet, something is still swimming.',
  'A river lived here once. It left its shape behind, like a coat on a chair.',
  'The sun is loud and the shade is a whisper. Rest whenever you like.',
  'Seashells, this far from any shore. The desert was a sea that fell asleep.',
  'Nobody out here needs anything from you. Not even a name.',
  'At night the stars come down to drink. Watch the water.',
  'Every stone in the ring is still warm, as if someone just left.',
  'You have walked long enough to hear it now. Under the sand, the old sea is singing.'
];
const RINGS = [];
function placeRings() {
  for (let i = 0; i < 9; i++) {
    const a = -1.1 + i * 2.39996, d = 210 + i * 155;
    let x = Math.cos(a) * d, y = Math.sin(a) * d;
    let tries = 0; while (inRiverBed(x, y, 40) && tries++ < 12) y += (y > riverY(x) ? 26 : -26);
    if (Math.abs(y - RAILY) < 80) y = RAILY + (y < RAILY ? -80 : 80);
    const stones = [];
    for (let k = 0; k < 8; k++) { const t = k / 8 * TAU + .2; stones.push({ x: x + Math.cos(t) * 17, y: y + Math.sin(t) * 11, v: k % 3 }); }
    RINGS.push({ i, x, y, stones, found: false, pulse: 0 });
  }
}
function nearRing(x, y, r) { for (const g of RINGS) if (dist(x, y, g.x, g.y) < r) return g; return null; }

// oases
const OCELL = 520, oasisCache = new Map();
const FIXED_OASIS = { x: -150, y: -60, rx: 30, ry: 15 };
function makeOasis(o, seed) {
  const r = seeded(seed); o.palms = []; o.reeds = []; o.flowers = [];
  const n = 3 + (r() * 2 | 0);
  for (let k = 0; k < n; k++) { const t = (k / n) * TAU + r() * .6; o.palms.push({ x: o.x + Math.cos(t) * (o.rx + 8), y: o.y + Math.sin(t) * (o.ry + 7), kind: 'palm' }); }
  for (let k = 0; k < 6; k++) { const t = r() * TAU; o.reeds.push({ x: o.x + Math.cos(t) * (o.rx - 1), y: o.y + Math.sin(t) * (o.ry - 1) + 1, kind: 'reed' }); }
  for (let k = 0; k < 4; k++) { const t = r() * TAU; o.flowers.push({ x: o.x + Math.cos(t) * (o.rx + 16), y: o.y + Math.sin(t) * (o.ry + 12), kind: 'marigold' }); }
  return o;
}
function oasisCell(gx, gy) {
  const k = gx + ',' + gy; if (oasisCache.has(k)) return oasisCache.get(k);
  let o = null;
  if (gx === -1 && gy === -1) o = makeOasis(Object.assign({}, FIXED_OASIS), 77);
  else if (hash(gx, gy, 51) < .38) {
    const x = gx * OCELL + 90 + hash(gx, gy, 52) * (OCELL - 180), y = gy * OCELL + 90 + hash(gx, gy, 53) * (OCELL - 180);
    const ok = !inRiverBed(x, y, 50) && !nearRail(y, 70) && dist(x, y, 0, 0) > 300 && !nearRing(x, y, 90) && dist(x, y, FIXED_OASIS.x, FIXED_OASIS.y) > 300;
    if (ok) o = makeOasis({ x, y, rx: 24 + hash(gx, gy, 54) * 12, ry: 12 + hash(gx, gy, 55) * 6 }, gx * 31 + gy * 17);
  }
  oasisCache.set(k, o); return o;
}
function oasesNear(x, y, r) { const out = []; const x0 = Math.floor((x - r) / OCELL), x1 = Math.floor((x + r) / OCELL), y0 = Math.floor((y - r) / OCELL), y1 = Math.floor((y + r) / OCELL); for (let gy = y0; gy <= y1; gy++) for (let gx = x0; gx <= x1; gx++) { const o = oasisCell(gx, gy); if (o) out.push(o); } return out; }
const inEll = (x, y, o, pad) => { const dx = (x - o.x) / (o.rx + pad), dy = (y - o.y) / (o.ry + pad); return dx * dx + dy * dy < 1; };

// mesas
const MCELL = 380, mesaCache = new Map();
function mesaSprite(w, top, cliff, seed) {
  const r = seeded(seed);
  return pix(w + 2, top + cliff + 3, P => {
    const cx = w / 2 + 1, cy = top / 2 + 1, rx = w / 2 - 1, ry = top / 2;
    const edge = []; for (let x = 0; x < w + 2; x++) { const dx = (x + .5 - cx) / rx; edge[x] = Math.abs(dx) < 1 ? cy + ry * Math.sqrt(1 - dx * dx) : -1; }
    const jag = []; for (let x = 0; x < w + 2; x++) jag[x] = Math.round((vnoise(x / 6, seed, 3) - .5) * 4);
    for (let x = 0; x < w + 2; x++) { if (edge[x] < 0) continue; const y0 = Math.round(edge[x]) - 1, y1 = y0 + cliff + jag[x]; for (let y = y0; y <= y1; y++) { const rel = (y - y0) / cliff; let c = '#c96f45'; if (((y + jag[x]) % 5) === 0) c = '#ad5934'; if ((x + .5 - cx) / rx < -.55) c = c === '#c96f45' ? '#dc8556' : '#c06a40'; if ((x + .5 - cx) / rx > .55) c = '#a3502f'; if (rel > .82) c = '#b76240'; P.set(x, y, c); } }
    P.ell(cx, cy, rx, ry, '#e8a874');
    P.map((x, y, c) => { if (c !== '#e8a874') return; const n = vnoise(x / 5, y / 4, seed); if (n > .7) return '#f2c08e'; if (n < .25) return '#d99766'; if (hash(x, y, seed) < .06) return '#9fae6a'; });
    for (let k = 0; k < 5; k++) { const a = r() * TAU, d = r() * .6; P.dot(cx + Math.cos(a) * rx * d, cy + Math.sin(a) * ry * d, 2, '#8faa62'); }
  }, '#6a2e1a');
}
function mesaCell(gx, gy) {
  const k = gx + ',' + gy; if (mesaCache.has(k)) return mesaCache.get(k);
  let m = null;
  const x = gx * MCELL + 70 + hash(gx, gy, 61) * (MCELL - 140), y = gy * MCELL + 70 + hash(gx, gy, 62) * (MCELL - 140);
  const prob = biomeAt(x, y) === 4 ? .75 : .16;
  if (hash(gx, gy, 60) < prob) {
    const w = Math.round(56 + hash(gx, gy, 63) * 50), top = Math.round(16 + hash(gx, gy, 64) * 10), cliff = Math.round(18 + hash(gx, gy, 65) * 12);
    const ok = !inRiverBed(x, y, 60) && !nearRail(y, 80) && dist(x, y, 0, 0) > 170 && !nearRing(x, y, 110) && oasesNear(x, y, 140).every(o => dist(x, y, o.x, o.y) > 130);
    if (ok) m = { x, y, rx: w / 2 - 1, ry: top / 2, w, top, cliff, seed: gx * 97 + gy * 13, spr: null };
  }
  mesaCache.set(k, m); return m;
}
function mesasNear(x, y, r) { const out = []; const x0 = Math.floor((x - r) / MCELL), x1 = Math.floor((x + r) / MCELL), y0 = Math.floor((y - r) / MCELL), y1 = Math.floor((y + r) / MCELL); for (let gy = y0; gy <= y1; gy++) for (let gx = x0; gx <= x1; gx++) { const m = mesaCell(gx, gy); if (m) out.push(m); } return out; }

// a camp where some cowboys had a long night
const CCELL = 900, campCache = new Map();
function campOk(x, y) { return !inRiverBed(x, y, 40) && !nearRail(y, 90) && !nearRing(x, y, 110) && oasesNear(x, y, 160).every(o => dist(x, y, o.x, o.y) > 120) && mesasNear(x, y, 160).every(m => !inEll(x, y, m, 44)) && dist(x, y, 0, 0) > 200; }
function makeCamp(x, y) {
  const c = { x, y, items: [], snoreT: 0, said: 0 };
  const add = (kind, dx, dy) => c.items.push({ kind, x: x + dx, y: y + dy });
  add('cowboyA', -27, 9); add('cowboyB', 24, -6); add('bottleS', -6, 17); add('bottle', 12, 15); add('bottle', 34, 6); add('bottleS', -40, -6); add('bottle', 3, -15); add('guitar', 36, 22);
  c.puddle = { x: x - 10, y: y + 20 }; return c;
}
function campCell(gx, gy) {
  const k = gx + ',' + gy; if (campCache.has(k)) return campCache.get(k);
  let c = null;
  if (gx === 0 && gy === -1) { let x = 330, y = -170, n = 0; while (!campOk(x, y) && n++ < 20) { x += 37; y -= 23; } c = makeCamp(x, y); }
  else if (hash(gx, gy, 71) < .3) { const x = gx * CCELL + 150 + hash(gx, gy, 72) * (CCELL - 300), y = gy * CCELL + 150 + hash(gx, gy, 73) * (CCELL - 300); if (campOk(x, y)) c = makeCamp(x, y); }
  campCache.set(k, c); return c;
}
function campsNear(x, y, r) { const out = []; const x0 = Math.floor((x - r) / CCELL), x1 = Math.floor((x + r) / CCELL), y0 = Math.floor((y - r) / CCELL), y1 = Math.floor((y + r) / CCELL); for (let gy = y0; gy <= y1; gy++) for (let gx = x0; gx <= x1; gx++) { const c = campCell(gx, gy); if (c) out.push(c); } return out; }
// landmarks: little places with little stories
const LCELL = 600, lmCache = new Map(), LM_FIXED = [];
const LMT = {
  windmill: { b: [0, 1, 2, 5, 6], rad: 36 }, ghosttown: { b: [1, 3, 5, 0], rad: 84 }, whale: { b: [0, 7, 3], rad: 62 }, arch: { b: [4, 8, 5], rad: 40 },
  wagon: { b: [0, 1, 2, 3, 5, 6], rad: 30 }, station: { b: [1, 3, 5, 0], rad: 50 }, mailbox: { b: null, rad: 12 }, petroglyph: { b: [4, 5, 8, 1], rad: 16 },
  dinobones: { b: [3, 7, 0, 4], rad: 46 }, bell: { b: [2, 6, 1, 5], rad: 22 }
};
function lmOk(x, y, rad) {
  if (inRiverBed(x, y, rad * .7 + 30) || nearRail(y, rad * .6 + 40)) return false;
  if (dist(x, y, 0, 0) < 150 + rad) return false;
  if (nearRing(x, y, 90 + rad)) return false;
  for (const o of oasesNear(x, y, 220)) if (dist(x, y, o.x, o.y) < 75 + rad) return false;
  for (const m of mesasNear(x, y, 220)) if (inEll(x, y, m, rad + 24)) return false;
  for (const c of campsNear(x, y, 320)) if (dist(x, y, c.x, c.y) < 100 + rad) return false;
  for (const f of LM_FIXED) if (dist(x, y, f.x, f.y) < 130 + rad) return false;
  return true;
}
function makeLM(type, x, y, id) {
  const L = { type, x, y, id, rad: LMT[type].rad, items: [] };
  const add = (kind, dx, dy) => L.items.push({ kind, x: x + dx, y: y + dy });
  switch (type) {
    case 'windmill': add('lm_windmill', 0, 0); add('lm_tank', 22, 4); L.trough = { x: x - 12, y: y + 13 }; break;
    case 'ghosttown': add('lm_store', -52, 3); add('lm_saloon', 0, 0); add('lm_hotel', 52, -1); add('lm_barrel', -26, 9); add('lm_barrel', 76, 7); break;
    case 'whale': add('lm_wskull', -46, 1); for (let i = 0; i < 6; i++) { add('lm_ribB', -30 + i * 11, -5); add('lm_ribF', -30 + i * 11, 6); } add('lm_wtail', 46, 0); break;
    case 'arch': add('lm_archL', -25, 0); add('lm_archR', 25, 0); break;
    case 'wagon': add('lm_wagon', 0, 0); add('lm_wheel', 25, 10); break;
    case 'station': add('lm_station', 0, 0); add('lm_pump', 28, 7); add('lm_sign', -32, 6); break;
    case 'mailbox': add('lm_mailbox', 0, 0); break;
    case 'petroglyph': add('lm_glyph', 0, 0); break;
    case 'dinobones': add('lm_dskull', 34, 1); break;
    case 'bell': add('lm_bell', 0, 0); break;
  }
  return L;
}
LM_FIXED.push(makeLM('mailbox', -78, -112, 'F1'), makeLM('windmill', 236, 52, 'F2'));
function lmPick(gx, gy, t) {
  const x = gx * LCELL + 110 + hash(gx, gy, 92 + t * 3) * (LCELL - 220), y = gy * LCELL + 110 + hash(gx, gy, 93 + t * 3) * (LCELL - 220);
  const b = biomeAt(x, y), cands = Object.keys(LMT).filter(n => !LMT[n].b || LMT[n].b.includes(b));
  let tot = 0; const ws = cands.map(n => { const w = n === 'mailbox' ? 1.7 : 1; tot += w; return w; });
  let u = hash(gx, gy, 140 + t) * tot, type = cands[0]; for (let i = 0; i < cands.length; i++) { u -= ws[i]; if (u <= 0) { type = cands[i]; break; } }
  return { x, y, type };
}
function lmCell(gx, gy) {
  const k = gx + ',' + gy; if (lmCache.has(k)) return lmCache.get(k);
  const out = LM_FIXED.filter(f => Math.floor(f.x / LCELL) === gx && Math.floor(f.y / LCELL) === gy);
  if (hash(gx, gy, 91) < .66) {
    for (let t = 0; t < 5; t++) {
      const c = lmPick(gx, gy, t);
      if (c.type !== 'mailbox') { let dup = false; for (let j = -1; j <= 1 && !dup; j++) for (let i = -1; i <= 1; i++) { if (!i && !j) continue; if (hash(gx + i, gy + j, 91) < .66 && lmPick(gx + i, gy + j, 0).type === c.type) { dup = true; break; } } if (dup) continue; }
      if (lmOk(c.x, c.y, LMT[c.type].rad)) { out.push(makeLM(c.type, c.x, c.y, 'L' + gx + ',' + gy)); break; }
    }
  }
  lmCache.set(k, out); return out;
}
function lmsNear(x, y, r) { const out = []; const x0 = Math.floor((x - r) / LCELL), x1 = Math.floor((x + r) / LCELL), y0 = Math.floor((y - r) / LCELL), y1 = Math.floor((y + r) / LCELL); for (let gy = y0; gy <= y1; gy++) for (let gx = x0; gx <= x1; gx++) { const c = lmCell(gx, gy); for (const L of c) out.push(L); } return out; }
const LM_ICON = { windmill: 'lm_windmill', ghosttown: 'lm_saloon', whale: 'lm_wskull', wagon: 'lm_wagon', station: 'lm_sign', mailbox: 'lm_mailbox', petroglyph: 'lm_glyph', dinobones: 'lm_dskull', bell: 'lm_bell' };
function archIcon() { if (SPR.archIcon) return SPR.archIcon; const c = mk(70, 52), g = c.getContext('2d'); g.drawImage(SPR.lm_archL, 0, 16); g.drawImage(SPR.lm_archR, 52, 16); g.drawImage(SPR.lm_archTop, 0, 0); return SPR.archIcon = c; }
const lmIcon = t => t === 'arch' ? archIcon() : SPR[LM_ICON[t]];
function blocked(x, y, pad) {
  if (nearRail(y, 9 + pad)) return true;
  for (const L of lmsNear(x, y, 140)) if (dist(x, y, L.x, L.y) < L.rad + 8 + pad) return true;
  for (const c of campsNear(x, y, 60)) if (dist(x, y, c.x, c.y) < 58 + pad) return true;
  for (const m of mesasNear(x, y, 80)) if (inEll(x, y, m, pad + 4)) return true;
  for (const o of oasesNear(x, y, 80)) if (inEll(x, y, o, pad + 14)) return true;
  if (nearRing(x, y, 26 + pad)) return true;
  return false;
}

// object definitions
const DEF = {
  saguaro: { r: 3, disc: 'saguaro', sh: 6 }, prickly: { r: 4, disc: 'prickly', sh: 7 }, barrel: { r: 3, disc: 'barrel', sh: 5 },
  marigold: { r: 0, disc: 'marigold' }, sage: { r: 0, sway: 1 }, ocotillo: { r: 2, disc: 'ocotillo', sh: 4 },
  rockS: { r: 2.5, sh: 4 }, rockB: { r: 5.5, sh: 8 }, hoodoo: { r: 4, disc: 'hoodoo', sh: 6 },
  skull: { r: 0, disc: 'skull' }, shell: { r: 0, disc: 'shell' }, rose: { r: 0, disc: 'desertrose' }, obsidian: { r: 0, disc: 'obsidian' },
  log: { r: 0, disc: 'petlog' },
  joshua: { r: 3, disc: 'joshua', sh: 7 }, yucca: { r: 2, disc: 'yucca', sh: 4 }, poppy: { r: 0, disc: 'poppy' }, lupine: { r: 0, disc: 'lupine' }, lily: { r: 0, disc: 'lily' },
  selenite: { r: 0, disc: 'selenite' }, lavarock: { r: 4.5, disc: 'lavarock', sh: 7 }, cindercone: { box: [19, 8], disc: 'cindercone' },
  lm_windmill: { r: 4, sh: 7 }, lm_tank: { r: 8, sh: 11 }, lm_saloon: { box: [21, 12] }, lm_store: { box: [21, 12] }, lm_hotel: { box: [21, 12] }, lm_barrel: { r: 3, sh: 4 },
  lm_wskull: { r: 8, sh: 10 }, lm_ribB: { r: 0 }, lm_ribF: { r: 0 }, lm_wtail: { r: 3 }, lm_archL: { r: 6, sh: 8 }, lm_archR: { r: 6, sh: 8 },
  lm_wagon: { box: [17, 7] }, lm_wheel: { r: 0 }, lm_station: { box: [20, 12] }, lm_pump: { r: 3, sh: 3 }, lm_sign: { r: 2, sh: 3 },
  lm_mailbox: { r: 2, sh: 3 }, lm_glyph: { r: 9, sh: 11 }, lm_dskull: { r: 4, sh: 5 }, lm_bell: { box: [12, 3] }, cowboyA: { r: 7, sh: 12 }, cowboyB: { r: 6, sh: 9 }, bottle: { r: 1.5, sh: 2 }, bottleS: { r: 0 }, guitar: { r: 0 }, tuft: { r: 0 }, dig: { r: 0 }, palm: { r: 3, disc: 'palm', sh: 8 }, reed: { r: 0 }
};
const TABLE = [
  [['tuft', .3], ['sage', .16], ['shell', .12], ['skull', .07], ['barrel', .1], ['dig', .14], ['saguaro', .06]],
  [['saguaro', .2], ['prickly', .14], ['barrel', .1], ['sage', .24], ['ocotillo', .07], ['rockS', .12], ['dig', .05], ['tuft', .08]],
  [['saguaro', .14], ['prickly', .18], ['marigold', .26], ['sage', .16], ['ocotillo', .1], ['barrel', .07], ['tuft', .06], ['dig', .03]],
  [['rockS', .22], ['skull', .08], ['rose', .16], ['dig', .2], ['log', .1], ['tuft', .14], ['obsidian', .05]],
  [['hoodoo', .2], ['rockB', .24], ['rockS', .18], ['obsidian', .09], ['ocotillo', .07], ['log', .07], ['dig', .12]],
  [['joshua', .34], ['yucca', .14], ['sage', .2], ['rockS', .1], ['tuft', .12], ['dig', .07], ['barrel', .03]],
  [['poppy', .3], ['lupine', .24], ['lily', .12], ['marigold', .14], ['sage', .08], ['tuft', .06], ['dig', .04], ['prickly', .02]],
  [['selenite', .2], ['yucca', .22], ['tuft', .2], ['dig', .16], ['shell', .06], ['skull', .04]],
  [['lavarock', .3], ['cindercone', .06], ['obsidian', .14], ['rockS', .12], ['tuft', .1], ['dig', .14], ['ocotillo', .06]]
];
const DENS = [4, 6, 8, 3, 6, 6, 11, 3, 5];
const FIXED = [{ kind: 'saguaro', x: 38, y: -22, v: 0 }, { kind: 'skull', x: -24, y: 18 }, { kind: 'dig', x: 26, y: 26 }, { kind: 'barrel', x: -40, y: -18 }, { kind: 'sage', x: 12, y: -34, v: 1 }];

const chunks = new Map();
function chunkKey(cx, cy) { return cx + ',' + cy; }
function getChunk(cx, cy) {
  const k = chunkKey(cx, cy); let ch = chunks.get(k); if (ch) return ch;
  ch = { cx, cy, img: null, objs: [] }; chunks.set(k, ch);
  const r = seeded(Math.floor(hash(cx, cy, 99) * 4294967295));
  const x0 = cx * CHS, y0 = cy * CHS;
  const bc = biomeAt(x0 + 64, y0 + 64);
  const n = DENS[bc];
  for (let i = 0; i < n; i++) {
    const x = x0 + r() * CHS, y = y0 + r() * CHS; const b = biomeAt(x, y); const tb = TABLE[b];
    let u = r(), kind = null; for (const [k2, w] of tb) { u -= w; if (u <= 0) { kind = k2; break; } }
    const v = (r() * 4) | 0;
    if (!kind) continue; const d = DEF[kind];
    if (inRiverBed(x, y, 3) && kind !== 'tuft' && kind !== 'shell') continue;
    if (blocked(x, y, d.r ? 6 : d.box ? 22 : 2)) continue;
    if (x * x + y * y < 46 * 46) continue;
    ch.objs.push(mkObj(kind, x, y, v, cx + ',' + cy + ',' + i));
  }
  for (const f of FIXED) if (Math.floor(f.x / CHS) === cx && Math.floor(f.y / CHS) === cy) ch.objs.push(mkObj(f.kind, f.x, f.y, f.v || 0, 'f' + f.x + ',' + f.y));
  for (const o of oasesNear(x0 + 64, y0 + 64, 200)) { for (const p of [...o.palms, ...o.reeds, ...o.flowers]) if (Math.floor(p.x / CHS) === cx && Math.floor(p.y / CHS) === cy) ch.objs.push(mkObj(p.kind, p.x, p.y, 0, 'o' + Math.round(p.x) + ',' + Math.round(p.y))); }
  for (const cp of campsNear(x0 + 64, y0 + 64, 200)) for (const p of cp.items) if (Math.floor(p.x / CHS) === cx && Math.floor(p.y / CHS) === cy) { const o = mkObj(p.kind, p.x, p.y, 0, 'c' + Math.round(p.x) + ',' + Math.round(p.y)); o.camp = cp; ch.objs.push(o); }
  for (const L of lmsNear(x0 + 64, y0 + 64, 200)) for (const p of L.items) if (Math.floor(p.x / CHS) === cx && Math.floor(p.y / CHS) === cy) { const o = mkObj(p.kind, p.x, p.y, 0, L.id + p.kind + Math.round(p.x)); o.lm = L; ch.objs.push(o); }
  ch.objs = ch.objs.filter(o => !(o.kind === 'dig' && S.dug[o.id]));
  return ch;
}
function mkObj(kind, x, y, v, id) {
  const o = { kind, x, y, v, id, r: DEF[kind].r || 0, box: DEF[kind].box || null, disc: DEF[kind].disc || null, t: R() * 10 };
  if (kind === 'marigold') o.bl = biomeAt(x, y);
  switch (kind) {
    case 'saguaro': o.spr = SPR.sag[v % SPR.sag.length]; break;
    case 'sage': o.spr = SPR.sage[v % 3]; break;
    case 'tuft': o.spr = SPR.tuft[v % 3]; break;
    case 'marigold': o.spr = SPR.marigold; break;
    case 'joshua': o.spr = SPR.joshua[v & 1]; break;
    case 'dig': o.spr = null; break;
    default: o.spr = SPR[kind];
  }
  return o;
}
// ground palettes
const PAL = {
  dunes: ['#f3c995', '#fadcaf', '#e4b07d', '#d9a06e'].map(hexc),
  scrub: ['#ebbf8b', '#f4d2a0', '#dba877', '#b7a868'].map(hexc),
  lush: ['#e3c08e', '#eed2a2', '#d2ac7c', '#a3b072'].map(hexc),
  flats: ['#f2e4c9', '#faf0dc', '#dccaa8', '#c9b593'].map(hexc),
  rock: ['#df9e72', '#ebb58b', '#c98460', '#b06e50'].map(hexc),
  bed: ['#cfa67e', '#dcb994', '#b28962', '#9a7a62'].map(hexc),
  joshua: ['#e2c39a', '#ecd3ad', '#cfae84', '#a9a978'].map(hexc),
  bloom: ['#dcc08e', '#e8d1a0', '#c9ab7a', '#93ad66'].map(hexc),
  gypsum: ['#f6f1ea', '#fffdf8', '#e2dde0', '#cdc8d4'].map(hexc),
  cinder: ['#4c4246', '#5e5257', '#3a3236', '#7a5a4c'].map(hexc)
};
const FLW = ['#f28a2e', '#9a7ad8', '#f6d24a', '#fff6ea'].map(hexc);
const RB = ['#a89a8a', '#8f8274', '#c0b2a0'].map(hexc), RWD = ['#6e4a32', '#8a6040'].map(hexc), RST = ['#5a5c64', '#c8ccd4'].map(hexc);
function crackD(wx, wy, cs, seed) {
  const gx = Math.floor(wx / cs), gy = Math.floor(wy / cs); let d1 = 1e9, d2 = 1e9;
  for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) { const px = (gx + i + hash(gx + i, gy + j, seed)) * cs, py = (gy + j + hash(gx + i, gy + j, seed + 1)) * cs; const d = (wx - px) * (wx - px) + (wy - py) * (wy - py); if (d < d1) { d2 = d1; d1 = d; } else if (d < d2) d2 = d; }
  return Math.sqrt(d2) - Math.sqrt(d1);
}
function genChunkStep(ch, rows) {
  let G = ch.gen;
  if (!G) {
    const c = mk(CHS, CHS), g = c.getContext('2d'), id = g.createImageData(CHS, CHS);
    const x0 = ch.cx * CHS, y0 = ch.cy * CHS, GS = 8, gn = CHS / GS + 1, bg = new Uint8Array(gn * gn);
    for (let j = 0; j < gn; j++) for (let i = 0; i < gn; i++) bg[j * gn + i] = biomeAt(x0 + i * GS, y0 + j * GS);
    const rings = RINGS.filter(r => r.x > x0 - 60 && r.x < x0 + CHS + 60 && r.y > y0 - 60 && r.y < y0 + CHS + 60);
    const rv = []; for (let x = 0; x < CHS; x++) rv.push([riverY(x0 + x), riverHW(x0 + x)]);
    G = ch.gen = { c, g, id, x0, y0, GS, gn, bg, rings, rv, y: 0 };
  }
  const { id, x0, y0, GS, gn, bg, rings, rv } = G, d = id.data;
  const pals = [PAL.dunes, PAL.scrub, PAL.lush, PAL.flats, PAL.rock, PAL.joshua, PAL.bloom, PAL.gypsum, PAL.cinder];
  const yEnd = Math.min(CHS, G.y + rows);
  for (let y = G.y; y < yEnd; y++) {
    const wy = y0 + y;
    for (let x = 0; x < CHS; x++) {
      const wx = x0 + x;
      const jx = (hash(wx, wy, 5) - .5) * 9, jy = (hash(wx, wy, 6) - .5) * 9;
      const bi = clamp(Math.round((x + jx) / GS), 0, gn - 1), bj = clamp(Math.round((y + jy) / GS), 0, gn - 1);
      const b = bg[bj * gn + bi], P = pals[b];
      const bv = bay(wx, wy), hs = hash(wx, wy, 9);
      const lo = vnoise(wx / 26, wy / 26, 41 + b);
      let col = P[0];
      if (lo + bv * .22 > .72) col = P[1]; else if (lo - bv * .22 < .2) col = P[2];
      if (b === 0 || b === 7) { const n = vnoise(wx / 40, wy / 40, 7); const rp = ((wx * .85 + wy * .5 + n * 16) / 6.5) % 1; const rr = rp < 0 ? rp + 1 : rp; if (rr < .13) col = P[1]; else if (rr < .2) col = P[2]; if (b === 7 && hs < .012) col = P[3]; }
      else if (b === 1 || b === 2 || b === 5) { if (hs < .028) col = P[2]; else if (hs < .045) col = P[1]; else if (hs < (b === 2 ? .062 : b === 5 ? .07 : .052)) col = P[3]; }
      else if (b === 6) { const fl = vnoise(wx / 16, wy / 16, 63), ty = vnoise(wx / 46, wy / 46, 64); if (fl > .52 && hs < (fl - .5) * .42) col = FLW[ty < .42 ? 0 : ty < .66 ? 1 : ty < .82 ? 2 : 3]; else if (hs < .05) col = P[3]; }
      else if (b === 8) { if (hs < .045) col = P[3]; else if (hs > .988) col = [150, 150, 165]; else if (vnoise(wx / 7, wy / 7, 61) > .72) col = P[1]; }
      else if (b === 3) { if (crackD(wx, wy, 13, 17) < 1.05) col = P[2]; else if (hs < .02) col = P[3]; }
      else if (b === 4) { const st = ((wy + vnoise(wx / 18, wy / 18, 23) * 7) / 8) % 1; if ((st < 0 ? st + 1 : st) < .1) col = P[2]; else if (hs < .03) col = P[3]; }
      const ry = rv[x][0], hw = rv[x][1], dy = Math.abs(wy - ry);
      if (dy < hw + 3) {
        const B = PAL.bed;
        if (dy < hw) { col = B[0]; if (crackD(wx, wy, 9, 27) < 1) col = B[2]; else if (hs < .05) col = B[1]; if (dy > hw - 2 && bv > .4) col = B[2]; }
        else if (bv > .5 || hs < .3) col = hs < .12 ? B[3] : B[1];
      }
      for (const r of rings) { const dd = Math.hypot((wx - r.x), (wy - r.y) * 1.5); if (dd > 21 && dd < 52) { const f = (dd / 4.5) % 1; if (f < .22) col = mixc(col, [255, 246, 226], .55); } }
      const ry2 = wy - RAILY;
      if (ry2 > -8 && ry2 < 7) {
        if (ry2 >= -6 && ry2 <= 5) col = hs < .3 ? RB[1] : hs < .6 ? RB[2] : RB[0]; else col = mixc(col, RB[0], .45);
        if (ry2 >= -5 && ry2 <= 4 && ((wx % 6) + 6) % 6 < 2) col = ry2 === -5 ? RWD[1] : RWD[0];
        if (ry2 === -3 || ry2 === 2) col = RST[0]; else if (ry2 === -4 || ry2 === 1) col = RST[1];
      }
      const o = (y * CHS + x) * 4; d[o] = col[0]; d[o + 1] = col[1]; d[o + 2] = col[2]; d[o + 3] = 255;
    }
  }
  G.y = yEnd;
  if (G.y >= CHS) { G.g.putImageData(id, 0, 0); ch.img = G.c; ch.gen = null; return true; }
  return false;
}
function genChunkImg(ch) { while (!genChunkStep(ch, CHS)); }

/* ============================== journal data ============================== */
const ENTRIES = [
  ['plants', 'saguaro', 'Saguaro', 'Tall and patient. It grows its first arm at around seventy years old. No rush.', 'Stands tall in the scrub.'],
  ['plants', 'prickly', 'Prickly Pear', 'Flat green paddles with pink fruit on top, like it is wearing earrings.', 'Grows in the scrub.'],
  ['plants', 'barrel', 'Barrel Cactus', 'Round, ribbed, and leaning a little south. Wears a red flower like a hat.', 'Round and low to the ground.'],
  ['plants', 'marigold', 'Desert Marigold', 'Only shows its face after rain, or out in the meadows. Bright yellow and a little proud of it.', 'Blooms after it rains.'],
  ['plants', 'ocotillo', 'Ocotillo', 'Looks like a bundle of sticks until you notice the small red flame on every tip.', 'Spiky whips with red tips.'],
  ['plants', 'palm', 'Fan Palm', 'Where there is a palm there is water. The horse knew that before you did.', 'Grows where there is water.'],
  ['plants', 'joshua', 'Joshua Tree', 'Arms up like it is waving hello, or asking a question. It is actually a very tall yucca.', 'In the Joshua woods.'],
  ['plants', 'yucca', 'Soaptree Yucca', 'A burst of spiky leaves with a tall stalk of white bells. It grows even in the white sands.', 'Spiky, with a tall flower stalk.'],
  ['plants', 'poppy', 'Desert Poppy', 'Bright orange cups that close up at night and open again in the morning.', 'In the wildflower meadows.'],
  ['plants', 'lupine', 'Lupine', 'Purple spires that smell a little like grape soda.', 'In the wildflower meadows.'],
  ['plants', 'lily', 'Desert Lily', 'Waits underground for years, then blooms white like it never left.', 'In the wildflower meadows.'],
  ['birds', 'roadrunner', 'Roadrunner', 'Would rather run than fly. Stops, looks right at you, then leaves at once.', 'Fast, on foot, in open sand.'],
  ['birds', 'quail', 'Quail Family', 'A tiny family walking in a line. The feather on top bounces as they go.', 'Little families in the scrub.'],
  ['birds', 'wrens', 'Cactus Wrens', 'A noisy little crowd. They all leave at once, then pretend that was the plan.', 'Little birds pecking in a group. Trot right up.'],
  ['birds', 'raven', 'Raven', 'Clever and loud. Almost certainly talking about you.', 'Flies over now and then.'],
  ['birds', 'hawk', 'Red-tailed Hawk', 'A slow circle high up. Its shadow slides over you like a cool hand.', 'Look for a shadow circling in the daytime.'],
  ['birds', 'owl', 'Great Horned Owl', 'Comes out at night and sits on the tallest cactus around. Blinks slowly.', 'Only out at night.'],
  ['birds', 'hummingbird', 'Hummingbird', 'A green flash that hums. Visits the flowers.', 'Near flowers, after rain or in the meadows.'],
  ['creatures', 'wildhorses', 'Wild Horses', 'A herd that has never been named either. If you run, they run with you.', 'Out in the open. Whinny if you see them.'],
  ['creatures', 'coyote', 'Coyote', 'Sings at the moon from the top of a hill, then acts like it was someone else.', 'Listen at dusk and at night.'],
  ['creatures', 'bighorn', 'Bighorn Sheep', 'Climbs where nothing should be able to climb, then just stands there looking proud.', 'In the red rocks and cinders.'],
  ['creatures', 'jackrabbit', 'Jackrabbit', 'Mostly ears. Hops off in a zigzag the moment you get close.', 'Almost anywhere, if you are quiet.'],
  ['creatures', 'lizard', 'Collared Lizard', 'Does push-ups on warm rocks to show off. Very fast when it wants to be.', 'On the flats and the rocks.'],
  ['creatures', 'scorpion', 'Scorpion', 'Under the moon it glows blue-green. Nobody is quite sure why. Admire from a distance.', 'Only at night.'],
  ['creatures', 'tortoise', 'Desert Tortoise', 'Moves at exactly the right speed for the desert. Older than the road.', 'Slow, in the greener places.'],
  ['rocks', 'hoodoo', 'Hoodoo', 'A stack of stone with a hat on top. The wind spent a very long time on it.', 'In the red rock country.'],
  ['rocks', 'mesa', 'Mesa', 'A table of red rock as big as a town. Something very tall must eat there.', 'Big, flat-topped, red.'],
  ['rocks', 'petlog', 'Petrified Log', 'A tree that slowly turned to stone. The bark is still there, only harder.', 'Lying on the flats and rock.'],
  ['rocks', 'desertrose', 'Desert Rose', 'Sand and gypsum grown into petals. A flower that never needs water.', 'On the pale salt flats.'],
  ['rocks', 'obsidian', 'Obsidian', 'Black glass from an old volcano. There is a tiny sky inside it.', 'Shiny black, among the rocks.'],
  ['rocks', 'geode', 'Geode', 'A plain stone with a purple cave inside. Pawed up out of the sand.', 'Paw at sparkles in the sand.'],
  ['rocks', 'selenite', 'Selenite', 'Clear as ice and made of gypsum. The white sands are full of tiny broken pieces of it.', 'In the white sands.'],
  ['rocks', 'lavarock', 'Lava Rock', 'Light and full of holes. It was liquid once, and very upset about it.', 'In the black cinder fields.'],
  ['rocks', 'cindercone', 'Cinder Cone', 'A small sleeping volcano. Sleeping is the important part.', 'In the black cinder fields.'],
  ['things', 'shell', 'Seashell', 'A seashell, this far from any shore. The desert was the sea once.', 'Lying out in the dunes.'],
  ['things', 'fossilfish', 'Fossil Fish', 'A fish pressed into stone, still mid-swim. It was here first.', 'Paw at sparkles in the sand.'],
  ['things', 'skull', 'Cow Skull', 'Bleached clean by the sun. Quiet company.', 'Bones in the sand.'],
  ['things', 'spur', 'Rusty Spur', 'A rusty spur. Whoever wore it is not riding anymore.', 'Paw at sparkles in the sand.'],
  ['things', 'arrowhead', 'Arrowhead', 'Chipped from stone a long, long time ago by somebody very patient.', 'Paw at sparkles in the sand.'],
  ['things', 'horseshoe', 'Old Horseshoe', 'Somebody else\'s horse lost this. Yours looks at it thoughtfully.', 'Paw at sparkles in the sand.'],
  ['things', 'harmonica', 'Harmonica', 'Left behind in an old wagon. It still plays, mostly in the key of lonesome. Scratched into the side: M.', 'Peek inside an old wagon.'],
  ['things', 'ticket', 'Train Ticket', 'One ticket to the Sea, stamped and never used. The name on it is smudged, but it starts with M.', 'Ring the bell at an old gas station.'],
  ['things', 'wine', 'Big Bottle of Red', 'Two snoozing cowboys, a pile of big bottles of red from somewhere called Jura, and a puddle that smells like a very good evening. They will be fine. Probably.', 'Somebody had a long night out here.'],
  ['things', 'dustdevil', 'Dust Devil', 'Ran straight through a little whirlwind. The horse looked very proud of itself.', 'Whirlwinds out on the open sand and flats.'],
  ['things', 'wish', 'A Wish', 'Caught a falling star at night. You do not have to say what you wished for.', 'Tap a shooting star at night.'],
  ['things', 'fly', 'A Fly', 'A fly has decided you are its horse now. It hums along wherever you go, and glows a little at night.', 'Keep wandering.'],
  ['places', 'windmill', 'Old Windmill', 'Still turning for nobody. The trough underneath is full of cool water.', 'Out in the scrub and dunes.'],
  ['places', 'ghosttown', 'Ghost Town', 'A saloon, a store, and a hotel with no guests. Knock on the saloon and the piano plays.', 'Somewhere on the flats.'],
  ['places', 'whale', 'Whale Bones', 'A whole whale, resting in the sand. Proof the sea was really here. Listen closely.', 'In the dunes, or the white sands.'],
  ['places', 'arch', 'Stone Arch', 'The wind made a doorway. You rode right through it.', 'In red rock or cinder country. Ride under it.'],
  ['places', 'wagon', 'Covered Wagon', 'Its travelers walked on without it. The canvas still flaps like it wants to go too.', 'Out in the open.'],
  ['places', 'station', 'Gas Station', 'No gas, no cars, one very good bell. The sign still lights up at night.', 'Near the scrub and the flats.'],
  ['places', 'mailbox', 'Lonely Mailbox', 'A mailbox in the middle of nowhere. Someone named M. keeps leaving letters.', 'Look for a little red flag.'],
  ['places', 'petroglyph', 'Rock Drawings', 'A spiral, a fish, some hands, and a horse. Someone was here long before you.', 'A big boulder near red rock and Joshua trees.'],
  ['places', 'dinobones', 'Dinosaur Bones', 'A long neck, a long tail, and a very long nap.', 'On the flats and in the dunes.'],
  ['places', 'bell', 'Mission Bell', 'An old bell on a wooden frame. Ring it and every bird nearby takes off.', 'Near the flowers.'],
  ['places', 'rider', 'The Rider', 'Under a full moon at the whale bones, someone made of light came walking over the dunes. The horse knew them right away.', 'Some things only happen under a full moon.'],
  ['places', 'train', 'The Train', 'Comes through now and then on the old tracks. Fast, but a happy canter can keep up.', 'Follow the railroad north.']
];
const ENT = {}; ENTRIES.forEach(e => ENT[e[1]] = { cat: e[0], id: e[1], name: e[2], text: e[3], hint: e[4] });
const ESPR = {
  saguaro: () => SPR.sag[0], prickly: () => SPR.prickly, barrel: () => SPR.barrel, marigold: () => SPR.marigoldB, ocotillo: () => SPR.ocotillo, palm: () => SPR.palm,
  joshua: () => SPR.joshua[1], yucca: () => SPR.yucca, poppy: () => SPR.poppy, lupine: () => SPR.lupine, lily: () => SPR.lily,
  roadrunner: () => SPR.rr[0], quail: () => SPR.quail[0], wrens: () => SPR.wren[0], raven: () => SPR.raven[1], hawk: () => SPR.hawk[0], owl: () => SPR.owl[0], hummingbird: () => SPR.hum[0],
  wildhorses: () => herdSet(2).walk[2], coyote: () => SPR.coyote[1], bighorn: () => SPR.bighorn[0], jackrabbit: () => SPR.rabbit[0], lizard: () => SPR.lizard[0], scorpion: () => SPR.scorp[0], tortoise: () => SPR.tortoise[0],
  hoodoo: () => SPR.hoodoo, mesa: () => mesaSprite(40, 12, 12, 5), petlog: () => SPR.log, desertrose: () => SPR.rose, obsidian: () => SPR.obsidian, geode: () => SPR.geode, selenite: () => SPR.selenite, lavarock: () => SPR.lavarock, cindercone: () => SPR.cindercone,
  shell: () => SPR.shell, fossilfish: () => SPR.fossil, skull: () => SPR.skull, spur: () => SPR.spur, arrowhead: () => SPR.arrowhead, horseshoe: () => SPR.horseshoe, harmonica: () => SPR.harmonica, ticket: () => SPR.ticket, wine: () => SPR.bottle, dustdevil: () => SPR.devilIcon, wish: () => SPR.starIcon,
  fly: () => pix(9, 7, P => { P.ell(4.5, 4, 1.6, 1.3, '#2a2420'); P.ell(3, 2.4, 1.4, 1, '#d8ecff'); P.ell(6, 2.4, 1.4, 1, '#d8ecff'); P.set(5.6, 3.6, '#c0392b'); }, null),
  windmill: () => SPR.lm_windmill, ghosttown: () => SPR.lm_saloon, whale: () => SPR.lm_wskull, arch: () => archIcon(), wagon: () => SPR.lm_wagon, station: () => SPR.lm_station, mailbox: () => SPR.lm_mailbox, petroglyph: () => SPR.lm_glyph, dinobones: () => SPR.lm_dskull, bell: () => SPR.lm_bell, train: () => SPR.loco[0], rider: () => SPR.mfig[3]
};

const EIMG = {};
function entryImg(id) {
  if (EIMG[id]) return EIMG[id];
  const s = ESPR[id](); const n = 32, c = mk(n, n), g = c.getContext('2d'); g.imageSmoothingEnabled = false;
  const k = Math.max(1, Math.floor(Math.min(28 / s.width, 28 / s.height)) || 1); const sc = Math.min(k, 3) || 1;
  const w = s.width * sc, h = s.height * sc; if (w > n || h > n) { const f = Math.min(n / s.width, n / s.height); g.drawImage(s, (n - s.width * f) / 2, (n - s.height * f) / 2, s.width * f, s.height * f); }
  else g.drawImage(s, Math.floor((n - w) / 2), Math.floor((n - h) / 2), w, h);
  return EIMG[id] = c.toDataURL();
}

/* ============================== state ============================== */
const S = { x: 0, y: 0, hour: 8.2, day: 1, found: {}, rings: [], dug: {}, name: '', river: false, fly: false, rainSeen: false, played: 0, letters: 0, mail: {}, wishes: 0, races: 0, regions: {}, curRegion: '', dist: 0, ranHerd: 0, mready: 0, mdone: 0 };
let seen = new Set(), trail = [];
function save() { store.set({ x: Math.round(H.x), y: Math.round(H.y), hour: S.hour, day: S.day, found: S.found, rings: RINGS.map(r => r.found), dug: S.dug, name: S.name, river: S.river, fly: S.fly, rainSeen: S.rainSeen, played: S.played, letters: S.letters, mail: S.mail, wishes: S.wishes, races: S.races, regions: S.regions, dist: Math.round(S.dist), ranHerd: S.ranHerd, mready: S.mready, mdone: S.mdone, seen: Array.from(seen).join(';'), trail }); }
function load() {
  const s = store.get(); if (!s) return false;
  Object.assign(S, { hour: s.hour ?? 8.2, day: s.day || 1, found: s.found || {}, dug: s.dug || {}, name: s.name || '', river: !!s.river, fly: !!s.fly, rainSeen: !!s.rainSeen, played: s.played || 0, letters: s.letters || 0, mail: s.mail || {}, wishes: s.wishes || 0, races: s.races || 0, regions: s.regions || {}, dist: s.dist || 0, ranHerd: s.ranHerd || 0, mready: s.mready || 0, mdone: s.mdone || 0 });
  if (s.seen) seen = new Set(s.seen.split(';')); if (Array.isArray(s.trail)) trail = s.trail;
  (s.rings || []).forEach((f, i) => { if (RINGS[i]) RINGS[i].found = !!f; });
  H.x = s.x || 0; H.y = s.y || 0; return true;
}

const H = { x: 0, y: 0, vx: 0, vy: 0, face: 1, view: 'side', anim: 0, holdT: 0, idleT: 0, state: 'free', stT: 0, z: 0, vz: 0, blinkT: 2, blink: 0, tp: 0, target: null, inWater: false, gait: 'idle', stepAcc: 0, grazeCD: 6, biome: 1, wetT: 0, shakeIn: 0, shakeT: 0 };
const input = { x: 0, y: 0, run: false, keys: new Set() };
let cam = { x: 0, y: 0 }, mode = 'title', cine = null, T = 0;
const W = { rain: 0, rainTarget: 0, rainT: 0, nextRain: 140, bloom: 0, rainbow: 0, wind: 1, clouds: [] };
const critters = [], parts = [], prints = [], drops = [], ghosts = [];
let fly = { x: 0, y: 0, vx: 0, vy: 0, t: 0, buzzT: 4 };
let tumbles = [];

/* ============================== canvas sizing ============================== */
const canvas = $('c'), ctx = canvas.getContext('2d', { alpha: false });
const buf = mk(320, 180), bctx = buf.getContext('2d');
let LW = 320, LH = 180, SC = 4, CW = 1, CHh = 1, OX = 0, OY = 0;
function titleOff() { return LW > LH * 1.6 && LH < 230 ? .33 : .22; }
function resize() {
  const DPR = Math.min(window.devicePixelRatio || 1, 2);
  CW = Math.max(1, Math.round(innerWidth * DPR)); CHh = Math.max(1, Math.round(innerHeight * DPR));
  canvas.width = CW; canvas.height = CHh;
  const big = Math.min(innerWidth, innerHeight) > 620 && !(matchMedia('(pointer: coarse)').matches);
  SC = Math.max(2, Math.floor(Math.min(CW, CHh) / (big ? 205 : 168)));
  LW = Math.ceil(CW / SC); LH = Math.ceil(CHh / SC);
  OX = Math.floor((CW - LW * SC) / 2); OY = Math.floor((CHh - LH * SC) / 2);
  buf.width = LW; buf.height = LH;
}

/* ============================== audio ============================== */
let AC = null, master, musicBus, sfxBus, ambBus, noiseBuf, windSrc, windF, windG, rainG, rainF, KS = {}, muted = store.mute();
const NOTE = { G2: 98, C3: 130.81, C4: 261.63, E2: 82.41, 'F#2': 92.5, A2: 110, B2: 123.47, D3: 146.83, E3: 164.81, 'F#3': 185, G3: 196, A3: 220, B3: 246.94, D4: 293.66, E4: 329.63, 'F#4': 369.99, G4: 392, A4: 440, B4: 493.88, D5: 587.33, E5: 659.26, G5: 783.99, A5: 880, B5: 987.77 };
function ksBuffer(f, dur, damp, soft) {
  const sr = AC.sampleRate, n = Math.floor(sr * dur), b = AC.createBuffer(1, n, sr), d = b.getChannelData(0);
  const N = Math.max(2, Math.round(sr / f)), ring = new Float32Array(N);
  for (let i = 0; i < N; i++) ring[i] = Math.random() * 2 - 1;
  for (let k = 0; k < soft; k++) for (let i = 1; i < N; i++) ring[i] = (ring[i] + ring[i - 1]) * .5;
  let idx = 0;
  for (let i = 0; i < n; i++) { const a = ring[idx], nx = (idx + 1) % N; const y = damp * .5 * (a + ring[nx]); ring[idx] = y; d[i] = a; idx = nx; }
  let mx = 0; for (let i = 0; i < n; i++) mx = Math.max(mx, Math.abs(d[i])); if (mx > 0) for (let i = 0; i < n; i++) d[i] /= mx;
  for (let i = 0; i < 64 && i < n; i++) d[i] *= i / 64;
  return b;
}
function makeImpulse(sec, decay) { const sr = AC.sampleRate, n = Math.floor(sr * sec), b = AC.createBuffer(2, n, sr); for (let c = 0; c < 2; c++) { const d = b.getChannelData(c); for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, decay); } return b; }
function audioInit() {
  if (AC) { if (AC.state === 'suspended') AC.resume(); return; }
  try {
    AC = new (window.AudioContext || window.webkitAudioContext)();
    master = AC.createGain(); master.gain.value = muted ? 0 : .9; master.connect(AC.destination);
    const rev = AC.createConvolver(); rev.buffer = makeImpulse(2.8, 2.6); const revG = AC.createGain(); revG.gain.value = .32; rev.connect(revG); revG.connect(master);
    musicBus = AC.createGain(); musicBus.gain.value = .5; musicBus.connect(master); musicBus.connect(rev);
    sfxBus = AC.createGain(); sfxBus.gain.value = .6; sfxBus.connect(master); const sfxRev = AC.createGain(); sfxRev.gain.value = .35; sfxBus.connect(sfxRev); sfxRev.connect(rev);
    ambBus = AC.createGain(); ambBus.gain.value = .5; ambBus.connect(master);
    noiseBuf = AC.createBuffer(1, AC.sampleRate * 2, AC.sampleRate); const nd = noiseBuf.getChannelData(0); for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
    windSrc = AC.createBufferSource(); windSrc.buffer = noiseBuf; windSrc.loop = true; windF = AC.createBiquadFilter(); windF.type = 'bandpass'; windF.frequency.value = 420; windF.Q.value = .7; windG = AC.createGain(); windG.gain.value = .0; windSrc.connect(windF); windF.connect(windG); windG.connect(ambBus); windSrc.start();
    const rs = AC.createBufferSource(); rs.buffer = noiseBuf; rs.loop = true; rainF = AC.createBiquadFilter(); rainF.type = 'highpass'; rainF.frequency.value = 1400; rainG = AC.createGain(); rainG.gain.value = 0; rs.connect(rainF); rainF.connect(rainG); rainG.connect(ambBus); rs.start();
    for (const k in NOTE) KS[k] = ksBuffer(NOTE[k], NOTE[k] < 150 ? 3.2 : 2.4, NOTE[k] < 150 ? .9975 : .996, 2);
    mus.next = AC.currentTime + .3;
    soundInit(rev);
  } catch (e) { AC = null; }
}
function pluck(note, t, vel, pan) { if (!AC || !KS[note]) return; const s = AC.createBufferSource(); s.buffer = KS[note]; const g = AC.createGain(); g.gain.value = vel; let node = g; if (AC.createStereoPanner) { const p = AC.createStereoPanner(); p.pan.value = pan || 0; g.connect(p); node = p; } s.connect(g); node.connect(musicBus); s.start(t); }
function tone(f, d, type, v, f2, t0, bus) { if (!AC) return; const t = AC.currentTime + (t0 || 0); const o = AC.createOscillator(), g = AC.createGain(); o.type = type || 'sine'; o.frequency.setValueAtTime(f, t); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + d); g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(v, t + .01); g.gain.exponentialRampToValueAtTime(.0001, t + d); o.connect(g); g.connect(bus || sfxBus); o.start(t); o.stop(t + d + .05); }
function noise(d, v, fc, type, t0) { if (!AC) return; const t = AC.currentTime + (t0 || 0); const s = AC.createBufferSource(); s.buffer = noiseBuf; const f = AC.createBiquadFilter(); f.type = type || 'lowpass'; f.frequency.value = fc; const g = AC.createGain(); g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(.0001, t + d); s.connect(f); f.connect(g); g.connect(sfxBus); s.start(t, Math.random() * 1.5); s.stop(t + d + .05); }
function reed(f, d, t0) { if (!AC) return; const t = AC.currentTime + t0; const o = AC.createOscillator(); o.type = 'square'; o.frequency.value = f; const l = AC.createOscillator(); l.frequency.value = 5.5; const lg = AC.createGain(); lg.gain.value = f * .012; l.connect(lg); lg.connect(o.frequency); const fl = AC.createBiquadFilter(); fl.type = 'bandpass'; fl.frequency.value = 1300; fl.Q.value = 1.2; const g = AC.createGain(); g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(.05, t + .05); g.gain.setValueAtTime(.05, t + d * .8); g.gain.exponentialRampToValueAtTime(.0001, t + d); o.connect(fl); fl.connect(g); g.connect(sfxBus); o.start(t); l.start(t); o.stop(t + d + .05); l.stop(t + d + .05); }
function snore(v) { if (!AC) return; const t = AC.currentTime; const s = AC.createBufferSource(); s.buffer = noiseBuf; const f = AC.createBiquadFilter(); f.type = 'lowpass'; f.frequency.setValueAtTime(220, t); f.frequency.linearRampToValueAtTime(420, t + .7); const g = AC.createGain(); g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(.09 * v + .001, t + .5); g.gain.exponentialRampToValueAtTime(.0001, t + 1.1); s.connect(f); f.connect(g); g.connect(sfxBus); s.start(t, Math.random()); s.stop(t + 1.2); }
const sfx = {
  hoof(water, g) { if (water) noise(.09, .1, 1800, 'highpass'); else noise(.05, g === 'canter' ? .12 : .08, g === 'canter' ? 900 : 650); },
  whinny(kk, dl, vol) {
    if (!AC) return; const t = AC.currentTime + (dl || 0), k = kk || rand(.9, 1.12), v = vol || .2;
    const o = AC.createOscillator(); o.type = 'sawtooth';
    o.frequency.setValueAtTime(480 * k, t); o.frequency.linearRampToValueAtTime(980 * k, t + .14); o.frequency.linearRampToValueAtTime(820 * k, t + .45); o.frequency.linearRampToValueAtTime(560 * k, t + .75); o.frequency.linearRampToValueAtTime(380 * k, t + .95);
    const l = AC.createOscillator(); l.frequency.value = 23; const lg = AC.createGain(); lg.gain.value = 42 * k; l.connect(lg); lg.connect(o.frequency);
    const g = AC.createGain(); g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(v, t + .05); g.gain.setValueAtTime(v * .9, t + .6); g.gain.exponentialRampToValueAtTime(.0001, t + 1.0);
    for (const [fc, gv] of [[1100, 1], [2500, .5]]) { const f = AC.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = fc * k; f.Q.value = 3; const fg = AC.createGain(); fg.gain.value = gv; o.connect(f); f.connect(fg); fg.connect(g); }
    g.connect(sfxBus); o.start(t); l.start(t); o.stop(t + 1.05); l.stop(t + 1.05);
    noise(.25, .12 * v / .2 + .001, 800, 'bandpass', (dl || 0) + 1.0);
  },
  snort() { noise(.22, .14, 700, 'bandpass'); noise(.12, .08, 500, 'bandpass', .22); },
  discover() { ['E5', 'G5', 'B5'].forEach((n, i) => pluck(n, AC ? AC.currentTime + i * .09 : 0, .5, .3)); },
  ring() { if (!AC) return; const t = AC.currentTime; ['E4', 'B4', 'E5', 'G5', 'B5'].forEach((n, i) => pluck(n, t + i * .16, .45, -.3 + i * .15)); tone(330, 3.5, 'sine', .07, 332, 0); tone(495, 3.5, 'sine', .05, 497, .2); },
  chirp() { const b = rand(2600, 3400); for (let i = 0; i < 2 + (R() * 2 | 0); i++) tone(b, .07, 'sine', .05, b * 1.3, i * .11); },
  hoot() { tone(370, .28, 'sine', .08, 350, 0); tone(330, .45, 'sine', .08, 300, .38); },
  caw() { for (let i = 0; i < 2; i++) { tone(720, .14, 'square', .025, 520, i * .22); noise(.12, .04, 1500, 'bandpass', i * .22); } },
  buzz() { if (!AC) return; const t = AC.currentTime; const o = AC.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(205, t); o.frequency.linearRampToValueAtTime(240, t + .3); o.frequency.linearRampToValueAtTime(190, t + .6); const tr = AC.createOscillator(); tr.frequency.value = 31; const tg = AC.createGain(); tg.gain.value = .5; const g = AC.createGain(); g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(.014, t + .08); g.gain.exponentialRampToValueAtTime(.0001, t + .65); const f = AC.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 900; o.connect(f); f.connect(g); tr.connect(tg); tg.connect(g.gain); g.connect(sfxBus); o.start(t); tr.start(t); o.stop(t + .7); tr.stop(t + .7); },
  drink() { for (let i = 0; i < 3; i++) tone(240, .1, 'sine', .07, 150, i * .32); noise(.1, .04, 2500, 'highpass', .1); },
  paw() { noise(.12, .14, 500); },
  pop() { pluck('B4', AC ? AC.currentTime : 0, .4, 0); pluck('E5', AC ? AC.currentTime + .08 : 0, .4, 0); },
  strum(ch) { if (!AC) return; const t = AC.currentTime; CHORDS[ch].forEach((n, i) => pluck(n, t + i * .028, .38, -.4 + i * .16)); },
  splash() { noise(.25, .14, 1600, 'highpass'); },
  hoofS(s, g) {
    const v = g === 'canter' ? 1.25 : 1;
    switch (s) {
      case 'water': noise(.09, .1, 1800, 'highpass'); break;
      case 'wood': tone(200, .06, 'triangle', .1 * v, 150); noise(.03, .05, 2600, 'bandpass'); break;
      case 'rail': tone(1500, .03, 'square', .015); noise(.04, .06, 900); break;
      case 'stone': tone(340, .05, 'triangle', .07 * v, 230); noise(.035, .05, 1600, 'bandpass'); break;
      case 'crunch': noise(.07, .11 * v, 1400, 'bandpass'); noise(.04, .06, 2800, 'bandpass', .025); break;
      case 'soft': noise(.09, .06 * v, 420); break;
      case 'crust': noise(.05, .09 * v, 2000, 'bandpass'); break;
      default: noise(.05, g === 'canter' ? .12 : .08, g === 'canter' ? 900 : 650);
    }
  },
  creak() { tone(110, .5, 'sawtooth', .015, 92); },
  knock() { for (let i = 0; i < 3; i++) { tone(150, .07, 'triangle', .14, 110, i * .16); noise(.04, .08, 900, 'bandpass', i * .16); } },
  piano() { const nt = [523.25, 659.25, 783.99, 659.25, 587.33, 698.46, 880, 698.46, 523.25, 659.25, 783.99, 1046.5]; nt.forEach((f, i) => { tone(f, .35, 'triangle', .05, null, .5 + i * .14 + (i % 2) * .03); tone(f / 2, .3, 'triangle', .03, null, .5 + i * .14); }); },
  whale() { tone(140, 2.6, 'sine', .09, 260, 0); tone(260, 1.8, 'sine', .05, 190, 1.6); tone(320, 2.2, 'sine', .04, 410, .9); },
  harmonica() { let t0 = 0; for (const [f, d] of [[392, .4], [440, .3], [493.9, .6], [440, .3], [392, .8]]) { reed(f, d, t0); t0 += d * .9; } },
  ding() { tone(1760, 1.2, 'sine', .08); tone(2637, .8, 'sine', .04); },
  bell() { [1, 2.0, 2.42, 3.0, 4.18].forEach((m, i) => tone(196 * m, 4 - i * .5, 'sine', .07 / (i + 1) + .01)); noise(.06, .1, 1200, 'bandpass'); },
  whistle(n) { for (let k = 0; k < (n || 1); k++) { tone(415, .9, 'sawtooth', .025, 400, k * 1.05); tone(523, .9, 'sawtooth', .02, 505, k * 1.05); tone(622, .9, 'sawtooth', .015, 600, k * 1.05); } },
  chug(v) { noise(.09, .1 * v + .002, 420); },
  howl() { tone(520, 2.2, 'sine', .07, 760, 0); tone(760, 1.2, 'sine', .05, 600, 1.2); },
  flutter() { for (let i = 0; i < 9; i++) noise(.05, .05, 3500, 'highpass', i * .035); },
  shutter() { noise(.03, .2, 3000, 'highpass'); noise(.05, .12, 1500, 'bandpass', .07); },
  wish() { if (!AC) return; ['B4', 'E5', 'G5', 'B5'].forEach((n, i) => pluck(n, AC.currentTime + i * .07, .32, .4)); },
  shake() { for (let i = 0; i < 6; i++) noise(.06, .07, 1100, 'bandpass', i * .06); },
  paper() { noise(.08, .08, 4000, 'highpass'); noise(.1, .06, 3000, 'highpass', .12); },
  swirl() { noise(.8, .1, 700, 'bandpass'); },
  mSong() { let t0 = .3; for (const [f, d] of [[493.9, .55], [440, .35], [392, .55], [329.6, 1], [392, .45], [440, .45], [493.9, .7], [587.3, .45], [493.9, 1.1], [440, .55], [392, .55], [440, .45], [329.6, 1.6]]) { reed(f, d, t0); t0 += d * .92; } },
  cricket() { for (let i = 0; i < 3; i++) tone(4300, .03, 'sine', .012, null, i * .06); }
};
// music: slow fingerpicking over two chords, E minor and D6/9 over F#
const CHORDSETS = {
  home: [['E2', 'B2', 'E3', 'G3', 'B3', 'E4'], ['F#2', 'A2', 'D3', 'A3', 'B3', 'E4']],
  red: [['E2', 'B2', 'E3', 'G3', 'B3', 'E4'], ['C3', 'G3', 'C4', 'E4', 'G4', 'B4']],
  bloom: [['G2', 'D3', 'G3', 'B3', 'D4', 'G4'], ['F#2', 'A2', 'D3', 'A3', 'D4', 'F#4']],
  pale: [['E3', 'B3', 'E4', 'F#4', 'G4', 'B4'], ['C3', 'G3', 'B3', 'E4', 'G4', 'B4']],
  ash: [['E2', 'B2', 'E3', 'G3', 'B3', 'D4'], ['C3', 'G3', 'C4', 'E4', 'G4', 'D4']]
};
const CHIMESETS = { home: ['B4', 'D5', 'E5', 'G4', 'A4', 'E5', 'G5'], red: ['E5', 'G4', 'B4', 'D5'], bloom: ['B4', 'D5', 'G5', 'A5', 'G4', 'D5'], pale: ['B5', 'G5', 'E5', 'F#4', 'B4'], ash: ['E4', 'G4', 'B4', 'D4'] };
const BIOME_MUS = ['home', 'home', 'home', 'pale', 'red', 'red', 'bloom', 'pale', 'ash'];
const CHORDS = CHORDSETS.home;
const PATTERN = [0, 4, 2, 5, 1, 4, 3, 5];
const CHIME = ['B4', 'D5', 'E5', 'G4', 'A4', 'E5', 'G5'];
const mus = { next: 0, step: 0, lvl: 0, set: 'home', en: 0 };
function musicTick() {
  if (!AC || AC.state !== 'running') return;
  const target = mode === 'title' ? .6 : (cine ? (cine.kind === 'm' ? .3 : 1) : .85) * (1 - W.rain * .35);
  mus.lvl += (target - mus.lvl) * .05;
  padTick(muted ? 0 : .055 * mus.lvl * clamp(1 - mus.en * 2.4, 0, 1));
  const enT = mode !== 'play' || cine ? .6 : ({ idle: .05, walk: .55, trot: .75, canter: 1 })[H.gait] ?? .3; mus.en += (enT - mus.en) * .012;
  const bpm = 66, e8 = 60 / bpm / 2;
  if (mus.next < AC.currentTime) mus.next = AC.currentTime + .05;
  while (mus.next < AC.currentTime + .2) {
    const st0 = mus.step, i = st0 & 7; if (i === 0 && (st0 & 15) === 0) mus.set = BIOME_MUS[H.biome] || 'home';
    const st = st0, bar = (st >> 3), chord = CHORDSETS[mus.set][bar & 1];
    const night = nightAmt();
    const t = mus.next + rand(-.008, .012);
    const sparse = mus.en < .3 && !(i === 0 || i === 3 || (i === 6 && R() < .5));
    if (!sparse && !(night > .6 && (i === 3 || i === 7) && R() < .5) && !(mus.set === 'ash' && PATTERN[i] > 1 && R() < .35)) {
      const ni = PATTERN[i], bass = ni < 2;
      pluck(chord[ni], t, (bass ? .42 : .26) * mus.lvl * rand(.85, 1.05) * (.8 + mus.en * .25), bass ? -.15 : (ni - 3) * .18);
    }
    if (i === 6 && (bar % 2 === 1) && R() < .3 + mus.en * .25) pluck(pick(CHIMESETS[mus.set]), t + e8 * .5, .16 * mus.lvl, rand(-.6, .6));
    if (mus.en > .9 && (i === 2 || i === 5) && R() < .4) pluck(pick(CHIMESETS[mus.set]), t + e8 * .5, .09 * mus.lvl, rand(-.5, .5));
    if (cine && (cine.kind !== 'm' || cine.t > 4) && i % 2 === 0) pluck(pick(['E5', 'B5', 'G5', 'D5']), t + .03, .14, rand(-.7, .7));
    mus.next += e8; mus.step = (mus.step + 1) % 64;
  }
}
/* ============================== soundscape ============================== */
// Hoofbeats are small synthesized recordings, one set per kind of ground, played with a little
// variation each step. Around them sit soft ambience layers that follow the place, the hour and the pace.
let hoofBus = null, padLP = null, musLP = null, PINK = null, hoofSide = 1;
const HOOF = {}, AMB = {};
const HOOFP = {
  sand: { f0: 72, td: 42, tg: .75, rf: 0, nlp: .07, nd: 26, ng: .9, sc: .03 },
  grass: { f0: 70, td: 40, tg: .7, rf: 0, nlp: .16, nd: 20, ng: .55, sc: .05 },
  soft: { f0: 62, td: 38, tg: .55, rf: 0, nlp: .05, nd: 22, ng: .8, sc: .04 },
  crust: { f0: 92, td: 58, tg: .55, rf: 0, nlp: .32, nd: 44, ng: .8, sc: .06 },
  crunch: { f0: 80, td: 50, tg: .45, rf: 0, nlp: .45, nd: 32, ng: .95, sc: .1 },
  stone: { f0: 125, td: 70, tg: .6, rf: 880, rd: 70, rg: .22, nlp: .55, nd: 90, ng: .45, sc: 0 },
  wood: { f0: 150, td: 34, tg: .8, rf: 270, rd: 24, rg: .45, nlp: .3, nd: 70, ng: .3, sc: 0 },
  rail: { f0: 115, td: 60, tg: .5, rf: 1900, rd: 38, rg: .16, nlp: .5, nd: 80, ng: .4, sc: 0 },
  water: { f0: 52, td: 22, tg: .25, rf: 0, nlp: .22, nd: 11, ng: .9, sc: .12 }
};
function synthHoof(p, seed) {
  const sr = AC.sampleRate, n = Math.floor(sr * .26), b = AC.createBuffer(1, n, sr), d = b.getChannelData(0), r = seeded(seed);
  let lp = 0, lp2 = 0, ph = 0, ph2 = 0, mx = 0;
  for (let i = 0; i < n; i++) {
    const t = i / sr, w = r() * 2 - 1;
    ph += TAU * p.f0 * (1 + 1.4 * Math.exp(-t * 55)) / sr;
    const thump = Math.sin(ph) * Math.exp(-t * p.td) * p.tg;
    let res = 0; if (p.rf) { ph2 += TAU * p.rf * (1 + .02 * r()) / sr; res = Math.sin(ph2) * Math.exp(-t * p.rd) * p.rg; }
    lp += (w - lp) * p.nlp; lp2 += (lp - lp2) * p.nlp;
    const grit = (p.rf ? (w - lp2) * .5 : lp2 * 2.2) * Math.exp(-t * p.nd) * p.ng;
    const sc = p.sc && t > .015 && r() < p.sc ? (r() * 2 - 1) * Math.exp(-t * 16) * .35 : 0;
    const v = (thump + res + grit + sc) * Math.min(1, i / 40);
    d[i] = v; mx = Math.max(mx, Math.abs(v));
  }
  if (mx > 0) for (let i = 0; i < n; i++) d[i] *= .9 / mx;
  return b;
}
function makePink(sec) {
  const sr = AC.sampleRate, n = Math.floor(sr * sec), b = AC.createBuffer(1, n, sr), d = b.getChannelData(0);
  let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
  for (let i = 0; i < n; i++) { const w = Math.random() * 2 - 1; b0 = .99886 * b0 + w * .0555179; b1 = .99332 * b1 + w * .0750759; b2 = .969 * b2 + w * .153852; b3 = .8665 * b3 + w * .3104856; b4 = .55 * b4 + w * .5329522; b5 = -.7616 * b5 - w * .016898; d[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * .5362) * .11; b6 = w * .115926; }
  const f = Math.floor(sr * .05); for (let i = 0; i < f; i++) { const k = i / f; d[i] = d[i] * k + d[n - f + i] * (1 - k); }
  return b;
}
const bq = (type, f, q) => { const x = AC.createBiquadFilter(); x.type = type; x.frequency.value = f; if (q) x.Q.value = q; return x; };
function ambLayer(buf, filters) {
  const s = AC.createBufferSource(); s.buffer = buf; s.loop = true; let node = s;
  for (const f of filters) { node.connect(f); node = f; }
  const g = AC.createGain(); g.gain.value = 0; node.connect(g); g.connect(ambBus); s.start(0, Math.random() * (buf.duration - .2)); return g;
}
function soundInit(rev) {
  for (const k in HOOFP) HOOF[k] = [0, 1, 2, 3].map(v => synthHoof(HOOFP[k], k.length * 97 + v * 13 + 5));
  hoofBus = AC.createGain(); hoofBus.gain.value = 1; hoofBus.connect(sfxBus);
  PINK = makePink(6);
  AMB.rush = ambLayer(PINK, [bq('highpass', 650), bq('lowpass', 3200)]);
  AMB.water = ambLayer(PINK, [bq('lowpass', 850), bq('highpass', 140)]);
  AMB.shimmer = ambLayer(noiseBuf, [bq('bandpass', 7400, 2.2)]);
  { const trem = AC.createGain(); trem.gain.value = .55; const lfo = AC.createOscillator(); lfo.frequency.value = 21; const lg = AC.createGain(); lg.gain.value = .45; lfo.connect(lg); lg.connect(trem.gain); lfo.start(); AMB.cicada = ambLayer(noiseBuf, [bq('bandpass', 5600, 7), trem]); }
  { const g = AC.createGain(); g.gain.value = 0; const lp = bq('lowpass', 260); for (const f of [55, 82.4, 110.3]) { const o = AC.createOscillator(); o.frequency.value = f; const og = AC.createGain(); og.gain.value = f > 100 ? .3 : 1; o.connect(og); og.connect(lp); o.start(); } lp.connect(g); g.connect(ambBus); AMB.drone = g; }
  // the old white-noise wind becomes a softer pink wind
  try { windSrc.stop(); } catch (e) {}
  windSrc = AC.createBufferSource(); windSrc.buffer = PINK; windSrc.loop = true; windSrc.connect(windF); windSrc.start(0, Math.random() * 4); windF.Q.value = .55;
  // gentle glue: a soft compressor on everything, a darker filter on the music at night, a warm pad
  const comp = AC.createDynamicsCompressor(); comp.threshold.value = -20; comp.knee.value = 18; comp.ratio.value = 3; comp.attack.value = .02; comp.release.value = .3;
  master.disconnect(); master.connect(comp); comp.connect(AC.destination);
  musLP = bq('lowpass', 6000, .5); musicBus.disconnect(); musicBus.connect(musLP); musLP.connect(master); musicBus.connect(rev);
  padLP = bq('lowpass', 1100, .3); padLP.connect(musicBus);
}
function playHoof(surf, gait, vol, pan, t0) {
  if (!AC || !HOOF[surf]) return;
  const arr = HOOF[surf], s = AC.createBufferSource(); s.buffer = arr[(R() * arr.length) | 0];
  s.playbackRate.value = rand(.9, 1.1) * (gait === 'canter' ? 1.05 : gait === 'walk' ? .96 : 1);
  const g = AC.createGain(); g.gain.value = vol * rand(.82, 1.04); let node = g;
  hoofSide = -hoofSide; if (AC.createStereoPanner) { const p = AC.createStereoPanner(); p.pan.value = pan != null ? pan : hoofSide * .1; g.connect(p); node = p; }
  s.connect(g); node.connect(hoofBus); s.start(AC.currentTime + (t0 || 0));
}
function ptone(f, d, v, pan, f2, t0, type) {
  if (!AC) return; const t = AC.currentTime + (t0 || 0), o = AC.createOscillator(), g = AC.createGain(); o.type = type || 'sine';
  o.frequency.setValueAtTime(f, t); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + d);
  g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(v, t + Math.min(.02, d * .3)); g.gain.exponentialRampToValueAtTime(.0001, t + d);
  let node = g; if (AC.createStereoPanner) { const p = AC.createStereoPanner(); p.pan.value = pan || 0; g.connect(p); node = p; }
  o.connect(g); node.connect(sfxBus); o.start(t); o.stop(t + d + .05);
}
const nsfx = {
  cricket(pan) { const f = rand(4100, 4700), n = 3 + (R() * 3 | 0); for (let i = 0; i < n; i++) ptone(f, .028, .009, pan, null, i * .05); },
  songbird(pan, v) {
    const kind = (R() * 3) | 0; let t = 0;
    if (kind === 0) { for (let i = 0; i < 4; i++) { const f = rand(2900, 3500) - i * 180; ptone(f, .11, .016 * v, pan, f * .82, t); t += .14; } }
    else if (kind === 1) { const a = rand(3300, 3800), b2 = a * .84; for (let i = 0; i < 7; i++) { ptone(i & 1 ? b2 : a, .05, .012 * v, pan, null, t); t += .06; } }
    else { ptone(rand(2400, 2700), .2, .016 * v, pan, rand(3600, 4000), 0); ptone(rand(3000, 3300), .16, .013 * v, pan, rand(2200, 2500), .28); }
  },
  dove(pan) { const v = .02; ptone(500, .32, v, pan, 560, 0); ptone(600, .55, v * 1.2, pan, 520, .36); ptone(470, .3, v * .8, pan, 450, 1.0); ptone(470, .3, v * .7, pan, 445, 1.36); },
  breath(k) { if (!AC) return; const t = AC.currentTime, s = AC.createBufferSource(); s.buffer = PINK; const f = bq('bandpass', 520 * k, 1.1), g = AC.createGain(); g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(.05, t + .05); g.gain.exponentialRampToValueAtTime(.0001, t + .26); s.connect(f); f.connect(g); g.connect(sfxBus); s.start(t, Math.random() * 4); s.stop(t + .3); },
  rustle(pan, v) { if (!AC) return; const t = AC.currentTime, s = AC.createBufferSource(); s.buffer = PINK; const f = bq('bandpass', rand(1800, 2800), .9), g = AC.createGain(); g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(.03 * (v || 1), t + .04); g.gain.exponentialRampToValueAtTime(.0001, t + .22); let node = g; if (AC.createStereoPanner) { const p = AC.createStereoPanner(); p.pan.value = pan; g.connect(p); node = p; } s.connect(f); f.connect(g); node.connect(sfxBus); s.start(t, Math.random() * 4); s.stop(t + .25); },
  splashIn() { playHoof('water', 'walk', .5); noise(.35, .06, 1800, 'highpass', .03); },
  nicker() { if (!AC) return; const t = AC.currentTime, s = AC.createBufferSource(); s.buffer = PINK; const f = bq('bandpass', 380, 1.4), g = AC.createGain(), am = AC.createGain(), l = AC.createOscillator(); l.frequency.value = 9; const lg = AC.createGain(); lg.gain.value = .5; l.connect(lg); lg.connect(am.gain); am.gain.value = .5; g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(.035, t + .12); g.gain.exponentialRampToValueAtTime(.0001, t + .7); s.connect(f); f.connect(am); am.connect(g); g.connect(sfxBus); s.start(t, Math.random() * 4); l.start(t); s.stop(t + .75); l.stop(t + .75); }
};
// A soft, steady warmth under the music while you rest. It never re-attacks: one gentle chord that
// fades in when you stop, fades out when you move, and slowly crossfades when the region's music changes.
const padS = { key: null, g: null };
function padVoice(notes) {
  const g = AC.createGain(); g.gain.value = 0; g.connect(padLP); const oscs = [];
  notes.forEach((nn, k) => { let f = NOTE[nn]; if (!f) return; while (f < 230) f *= 2;
    for (const [m, a] of [[1, 1], [2, .12]]) { const o = AC.createOscillator(); o.type = 'sine'; o.frequency.value = f * m; const og = AC.createGain(); og.gain.value = a / notes.length;
      if (AC.createStereoPanner) { const pn = AC.createStereoPanner(); pn.pan.value = (k - 1) * .3; o.connect(og); og.connect(pn); pn.connect(g); } else { o.connect(og); og.connect(g); }
      o.start(); oscs.push(o); } });
  return { g, oscs };
}
function padTick(level) {
  if (!AC || !padLP) return; const now = AC.currentTime, key = mus.set;
  if (padS.key !== key) {
    if (padS.v) { const old = padS.v; old.g.gain.cancelScheduledValues(now); old.g.gain.setTargetAtTime(0, now, 1.6); setTimeout(() => old.oscs.forEach(o => { try { o.stop(); } catch (e) {} }), 9000); }
    const ch = CHORDSETS[key][0]; padS.v = padVoice([ch[0], ch[2], ch[4] || ch[3]]); padS.key = key;
  }
  padS.v.g.gain.setTargetAtTime(level, now, 2.2);
}
function waterDist() {
  let best = 999;
  for (const o of waterBodies(H.x - LW / 2, H.y - LH / 2)) { if (!o.rx) continue; const e = Math.hypot((H.x - o.x) / o.rx, (H.y - o.y) / o.ry); best = Math.min(best, Math.max(0, e - 1) * (o.rx + o.ry) / 2); }
  if (S.river) best = Math.min(best, Math.max(0, Math.abs(H.y - riverY(H.x)) - riverHW(H.x)));
  for (const L of lmsNear(H.x, H.y, 100)) if (L.type === 'windmill') best = Math.min(best, Math.max(0, dist(H.x, H.y, L.trough.x, L.trough.y) - 10) * 1.6);
  return best;
}
let ambSetT = 0;
function ambTick(dt) {
  if (!AC || !AMB.rush) return;
  ambSetT -= dt; if (ambSetT > 0) return; ambSetT = .15;
  const now = AC.currentTime, b = mode === 'title' ? 1 : H.biome, n = nightAmt(), h = S.hour, sp = Math.hypot(H.vx, H.vy);
  const set = (g, v, tc) => g.gain.setTargetAtTime(v, now, tc || 1.2);
  const windB = [.05, .032, .024, .045, .04, .03, .022, .055, .045][b] || .035;
  set(windG, windB * (1 + W.rain * .8) * (1 - n * .3) * (.72 + .28 * Math.sin(T * .13) * Math.sin(T * .05 + 1)), 2);
  windF.frequency.setTargetAtTime(320 + 140 * Math.sin(T * .11) + (b === 7 || b === 0 ? 140 : 0), now, 2);
  set(AMB.rush, mode === 'play' ? clamp((sp - 40) / 42, 0, 1) * .06 : 0, .45);
  const wd = mode === 'play' ? waterDist() : 999;
  set(AMB.water, wd < 90 ? (1 - wd / 90) * .085 * (.65 + .35 * Math.abs(Math.sin(T * .9) * Math.sin(T * .37 + 1))) : 0, .5);
  const hot = h > 9.5 && h < 17.5 ? Math.min(1, (h - 9.5) / 1.5, (17.5 - h) / 1.5) : 0;
  set(AMB.cicada, hot * ([1, 2, 5].includes(b) ? .02 : b === 6 ? .011 : .004) * (1 - W.rain), 2.5);
  set(AMB.shimmer, (b === 7 ? .02 : b === 3 ? .011 : 0) * (1 - n * .4), 2.5);
  set(AMB.drone, b === 8 ? .04 : 0, 3);
  rainG.gain.setTargetAtTime(W.rain * .2, now, 1);
  musLP.frequency.setTargetAtTime(1700 + (1 - n) * 4500, now, 3);
}

const GAITV = { walk: .26, trot: .3, canter: .34 };
function playStep(surf, bi) {
  if (!AC || !HOOF.sand) return;
  if (surf === 'sand' && (H.biome === 2 || H.biome === 6)) surf = 'grass';
  const g = H.gait === 'idle' ? 'walk' : H.gait, v = (g === 'canter' ? [.36, .26, .42][bi % 3] : GAITV[g] || .26) * (cine ? .6 : 1);
  playHoof(surf, g, v);
  if (g === 'trot') playHoof(surf, g, v * .55, -hoofSide * .1, .028);
  if (g === 'canter' && bi % 3 === 2 && R() < .7) nsfx.breath(rand(.9, 1.1));
}
let ambSchedT = 1;
function ambient(dt) {
  ambSchedT -= dt; if (ambSchedT > 0) return; ambSchedT = rand(.5, 1.3);
  const n = nightAmt(), h = S.hour, b = H.biome, life = [1, 2, 5, 6].includes(b) ? 1 : b === 0 || b === 3 ? .45 : .6, side = () => rand(-.75, .75);
  if (W.rain > .5) return;
  if (n > .5 && R() < .75 * life) nsfx.cricket(side());
  if (n > .8 && R() < .025) { const p = side(); ptone(392, .32, .013, p, 370); ptone(392, .45, .011, p, 360, .5); }
  const dawn = h > 5.2 && h < 8.6 ? 1 - Math.abs(h - 6.8) / 1.8 : 0, dusk = h > 17.6 && h < 19.6 ? .6 : 0;
  if (dawn > 0 && R() < dawn * .8 * life) nsfx.songbird(side(), .7 + dawn * .5);
  else if (n < .2 && R() < .1 * life) nsfx.songbird(side(), .45);
  if ((dawn > .3 || dusk) && R() < .06 * life) nsfx.dove(side());
  for (const L of lmsNear(H.x, H.y, 160)) if (L.type === 'windmill' && dist(L.x, L.y, H.x, H.y) < 140 && R() < .3) sfx.creak();
}
const BENDK = { tuft: 1, sage: 1, poppy: 1, lupine: 1, lily: 1, marigold: 1, reed: 1, yucca: 1 };
let bendScanT = 0, rustleCD = 0;
function bendFoliage(dt) {
  rustleCD -= dt; bendScanT -= dt; if (bendScanT > 0) return; bendScanT = .08;
  const sp = Math.hypot(H.vx, H.vy); if (sp < 4 || H.z > 2) return;
  forObjsNear(H.x, H.y, 16, o => {
    if (!BENDK[o.kind]) return; const d = Math.hypot(o.x - H.x, (o.y - H.y) * 1.6); if (d > 10) return;
    if (o.bendAt && T - o.bendAt < .7) return;
    o.bendAt = T; o.bendDir = Math.sign(o.x - H.x) || (H.vx > 0 ? 1 : -1);
    if (rustleCD <= 0) { rustleCD = .14; nsfx.rustle(clamp((o.x - H.x) / 20, -.5, .5), H.gait === 'walk' ? .6 : 1); }
    if (o.kind === 'poppy' || o.kind === 'lupine' || o.kind === 'marigold' || o.kind === 'lily') if (R() < .3) part(o.x, o.y - 5, o.bendDir * rand(4, 12), rand(-18, -8), 1, pick(['#f28a2e', '#b49cf0', '#f6d24a', '#fff6ea']), 'petal', 40);
  });
}
const bendOff = o => { if (!o.bendAt) return 0; const k = 1 - (T - o.bendAt) / .9; if (k <= 0) return 0; return Math.round(o.bendDir * 2 * k * Math.cos((1 - k) * 11)); };

setInterval(musicTick, 40);
function setMute(m) { muted = m; store.mute(m); if (master) master.gain.value = m ? 0 : .9; $('muteBtn').style.opacity = m ? .55 : 1; $('noteP').setAttribute('fill', m ? '#a08070' : '#4a2c1f'); }

/* ============================== time & light ============================== */
const TINT = [[0, [84, 94, 168]], [4.6, [84, 94, 168]], [5.8, [190, 155, 190]], [6.8, [255, 196, 182]], [8, [255, 240, 225]], [9.5, [255, 255, 255]], [16.5, [255, 255, 255]], [17.8, [255, 226, 190]], [18.8, [252, 190, 165]], [19.7, [170, 140, 185]], [20.8, [84, 94, 168]], [24, [84, 94, 168]]];
function tintAt(h) { for (let i = 0; i < TINT.length - 1; i++) { const [a, ca] = TINT[i], [b, cb] = TINT[i + 1]; if (h >= a && h <= b) return mixc(ca, cb, (h - a) / (b - a || 1)); } return TINT[0][1]; }
function nightAmt() { const h = S.hour; if (h < 4.8 || h > 20.6) return 1; if (h < 6.6) return 1 - (h - 4.8) / 1.8; if (h > 18.8) return (h - 18.8) / 1.8; return 0; }
function partOfDay() { const h = S.hour; if (h < 5) return 'night'; if (h < 7.5) return 'dawn'; if (h < 11.5) return 'morning'; if (h < 14) return 'midday'; if (h < 17.5) return 'afternoon'; if (h < 19.8) return 'dusk'; return 'night'; }

/* ============================== UI helpers ============================== */
const toastQ = []; let toastBusy = false;
function toast(kicker, title, img) { toastQ.push({ kicker, title, img }); if (!toastBusy) nextToast(); }
function nextToast() {
  const t = toastQ.shift(); if (!t) { toastBusy = false; return; } toastBusy = true;
  const el = document.createElement('div'); el.className = 'toast';
  el.innerHTML = (t.img ? '<img alt="" src="' + t.img + '">' : '') + '<div><b></b><span></span></div>';
  el.querySelector('b').textContent = t.kicker; el.querySelector('span').textContent = t.title;
  $('toasts').appendChild(el);
  setTimeout(() => { el.classList.add('out'); setTimeout(() => { el.remove(); }, 500); nextToast(); }, 2900);
}
let cardTimer = 0;
function card(k, t, s, secs) { $('cardK').textContent = k; $('cardT').textContent = t; $('cardS').textContent = s || ''; $('card').classList.remove('hide'); cardTimer = secs || 7; }
function hideCard() { $('card').classList.add('hide'); cardTimer = 0; }
let dayCardT = 0;
function dayCard(txt) { const el = $('dayCard'); el.textContent = txt; el.classList.remove('hide'); dayCardT = 3.2; }
let hintT = 0;
function hint(txt, secs) { const el = $('hint'); el.innerHTML = txt; el.classList.remove('hide'); hintT = secs || 6; }
const isTouch = matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0;
function updateHUD() {
  $('nameLbl').textContent = S.name ? S.name : 'A horse with no name';
  $('dayLbl').textContent = 'Day ' + S.day + ' · ' + partOfDay() + (W.rain > .3 ? ' · rain' : '') + (fullMoon() && nightAmt() > .5 ? ' · full moon' : '');
  const st = $('stones'); if (st.children.length !== 9) { st.innerHTML = ''; for (let i = 0; i < 9; i++) st.appendChild(document.createElement('i')); }
  RINGS.forEach((r, i) => st.children[i].classList.toggle('on', r.found));
  $('jCount').textContent = Object.keys(S.found).filter(k => ENT[k]).length + '/' + ENTRIES.length;
}
function discover(id, x, y) {
  if (!ENT[id] || S.found[id]) return;
  S.found[id] = true; save();
  toast('New in your journal', ENT[id].name, entryImg(id)); sfx.discover();
  for (let i = 0; i < 8; i++) part(H.x + rand(-6, 6), H.y - 18, rand(-14, 14), rand(-30, -12), 1.1, pick(['#ff8fa8', '#ffd0dc', '#fff2a8']), 'heart');
  updateHUD();
}

/* ============================== particles ============================== */
function part(x, y, vx, vy, life, c, kind, g) { if (parts.length > 300) parts.shift(); parts.push({ x, y, vx, vy, life, max: life, c, kind: kind || 'dot', g: g == null ? 0 : g, z: 0 }); }
function dust(x, y, n, s, bb) { const cs = dustCols(bb == null ? H.biome : bb); for (let i = 0; i < n; i++) part(x + rand(-3, 3), y + rand(-1, 1), rand(-8, 8) - H.vx * .15 * s, rand(-10, -3), rand(.35, .7), R() < .5 ? cs[0] : cs[1], 'dust', 20); }

/* ============================== critters ============================== */
function spawnCritters(dt) {
  if (mode !== 'play') return;
  spawnCritters.t = (spawnCritters.t || 0) - dt; if (spawnCritters.t > 0) return; spawnCritters.t = 1.5;
  for (let i = critters.length - 1; i >= 0; i--) if (dist(critters[i].x, critters[i].y, H.x, H.y) > 320 && critters[i].type !== 'hawk') critters.splice(i, 1);
  const n = nightAmt(), count = t => critters.filter(c => c.type === t).length;
  if (critters.length > 14) return;
  const a = R() * TAU, d = rand(150, 210), x = H.x + Math.cos(a) * d, y = H.y + Math.sin(a) * d * .8;
  const b = biomeAt(x, y), isB = (...bs) => bs.includes(b), meadow = H.biome === 6;
  const opts = [];
  if (n < .5) {
    if (isB(1, 2, 5, 6) && count('quail') < 1) opts.push('quail');
    if (isB(0, 1, 3, 5) && count('roadrunner') < 1) opts.push('roadrunner');
    if (isB(0, 1, 2, 5, 6, 7) && count('rabbit') < 2) opts.push('rabbit');
    if (isB(3, 4, 7, 8) && count('lizard') < 2) opts.push('lizard');
    if (isB(2, 5, 6) && count('tortoise') < 1) opts.push('tortoise');
    if (isB(1, 2, 5, 6, 0) && count('flock') < 1) opts.push('flock', 'flock');
    if (isB(4, 8) && count('bighorn') < 1) opts.push('bighorn', 'bighorn');
    if (count('raven') < 1 && R() < .4) opts.push('raven');
    if (count('hawk') < 1 && R() < .5) opts.push('hawk');
    if ((W.bloom > 0 || meadow) && count('hum') < 2) opts.push('hum');
    if ((W.bloom > 0 || meadow) && count('butter') < (meadow ? 8 : 5)) opts.push('butter', 'butter', 'butter');
  }
  if (n > .3 && count('coyote') < 1 && R() < .5) opts.push('coyote');
  if (n >= .5) {
    if (count('owl') < 1) opts.push('owl');
    if (count('rabbit') < 1) opts.push('rabbit');
    if (count('moth') < 6) opts.push('moth', 'moth');
    if (isB(0, 3, 4, 7, 8) && count('scorp') < 3) opts.push('scorp', 'scorp');
  }
  if (!opts.length) return;
  const type = pick(opts);
  if ((type === 'flock' || type === 'bighorn' || type === 'coyote' || type === 'scorp' || type === 'tortoise') && blocked(x, y, 2)) return;
  if (type === 'quail') { const fam = { type: 'quail', x, y, vx: 0, vy: 0, t: 0, dir: R() * TAU, flee: 0, kids: [] }; for (let k = 0; k < 3; k++) fam.kids.push({ x: x - 6 * (k + 1), y: y + rand(-2, 2) }); critters.push(fam); }
  else if (type === 'roadrunner') { const dir = R() < .5 ? 1 : -1; critters.push({ type, x: H.x - dir * 170, y: H.y + rand(-60, 60), vx: dir * 95, vy: 0, t: 0, stopT: rand(.8, 1.6), stopped: 0 }); }
  else if (type === 'rabbit') critters.push({ type, x, y, vx: 0, vy: 0, t: 0, z: 0, vz: 0, hop: 0 });
  else if (type === 'lizard') critters.push({ type, x, y, vx: 0, vy: 0, t: 0, dart: 0 });
  else if (type === 'tortoise') critters.push({ type, x, y, vx: rand(-4, 4), vy: rand(-2, 2), t: 0 });
  else if (type === 'raven') { const dir = R() < .5 ? 1 : -1; critters.push({ type, x: H.x - dir * 200, y: H.y + rand(-80, 40), vx: dir * 38, vy: rand(-6, 6), t: 0, z: 34 }); }
  else if (type === 'hawk') critters.push({ type, cx: H.x + rand(-60, 60), cy: H.y + rand(-50, 50), a: R() * TAU, x: H.x, y: H.y, t: 0, z: 70, life: rand(40, 70) });
  else if (type === 'hum') critters.push({ type, x: H.x + rand(-80, 80), y: H.y + rand(-60, 60), vx: 0, vy: 0, t: 0, z: 10, tx: 0, ty: 0, k: 0 });
  else if (type === 'butter') critters.push({ type, x: H.x + rand(-90, 90), y: H.y + rand(-70, 70), vx: 0, vy: 0, t: R() * 9, z: 8, c: (R() * 4) | 0 });
  else if (type === 'moth') critters.push({ type, x: H.x + rand(-90, 90), y: H.y + rand(-70, 70), t: R() * 9, z: 10 });
  else if (type === 'owl') { const sg = []; forObjsNear(H.x, H.y, 170, o => { if ((o.kind === 'saguaro' || o.kind === 'joshua') && dist(o.x, o.y, H.x, H.y) > 50) sg.push(o); }); if (sg.length) { const o = pick(sg); critters.push({ type, x: o.x, y: o.y + .1, perchH: o.spr.height - 2, t: 0, blinkT: 2 }); } }
  else if (type === 'flock') { const fl = { type, x, y, t: 0, burst: 0, birds: [] }; const nb = 5 + (R() * 4 | 0); for (let k = 0; k < nb; k++) fl.birds.push({ x: x + rand(-14, 14), y: y + rand(-8, 8), z: 0, vx: 0, vy: 0, vz: 0, ph: R() * 9, peck: R() * 2 }); critters.push(fl); }
  else if (type === 'bighorn') critters.push({ type, x, y, vx: 0, vy: 0, t: 0, flee: 0, face: R() < .5 ? 1 : -1 });
  else if (type === 'coyote') critters.push({ type, x, y, vx: 0, vy: 0, t: 0, howl: 0, did: 0, st: 'sit', face: x < H.x ? 1 : -1 });
  else if (type === 'scorp') critters.push({ type, x, y, vx: rand(-6, 6), vy: rand(-3, 3), t: 0 });
}
function updCritters(dt) {
  const hs = Math.hypot(H.vx, H.vy);
  for (let i = critters.length - 1; i >= 0; i--) {
    const c = critters[i]; c.t += dt; const dH = dist(c.x, c.y, H.x, H.y);
    switch (c.type) {
      case 'quail': {
        if (dH < 34 && hs > 30) c.flee = 1.4;
        if (c.flee > 0) { c.flee -= dt; const a = Math.atan2(c.y - H.y, c.x - H.x); c.vx = Math.cos(a) * 55; c.vy = Math.sin(a) * 55; }
        else { c.dir += rand(-1, 1) * dt; c.vx = Math.cos(c.dir) * 9; c.vy = Math.sin(c.dir) * 6; }
        c.x += c.vx * dt; c.y += c.vy * dt;
        let px = c.x, py = c.y; for (const k of c.kids) { const dx = px - k.x, dy = py - k.y, d = Math.hypot(dx, dy); if (d > 6) { k.x += dx / d * (d - 6); k.y += dy / d * (d - 6); } px = k.x; py = k.y; }
        if (dH < 40) discover('quail'); if (c.t % 3 < dt && R() < .3) sfx.chirp();
        break;
      }
      case 'roadrunner': {
        if (!c.stopped && Math.abs(c.x - H.x) < 50) { c.stopped = c.stopT; }
        if (c.stopped > 0) { c.stopped -= dt; if (c.stopped <= 0) c.stopped = -1; } else c.x += c.vx * dt;
        if (dH < 60) discover('roadrunner');
        if (Math.abs(c.x - H.x) > 260) { critters.splice(i, 1); continue; }
        break;
      }
      case 'rabbit': {
        if (dH < 38 && c.hop <= 0 && hs > 8) { const a = Math.atan2(c.y - H.y, c.x - H.x) + rand(-.5, .5); c.vx = Math.cos(a) * 60; c.vy = Math.sin(a) * 40; c.hop = 1.2; }
        if (c.hop > 0) { c.hop -= dt; if (c.z <= 0) { c.vz = 70; c.z = .01; } }
        if (c.z > 0) { c.vz -= 400 * dt; c.z += c.vz * dt; c.x += c.vx * dt; c.y += c.vy * dt; if (c.z <= 0) c.z = 0; }
        if (dH < 40) discover('jackrabbit');
        break;
      }
      case 'lizard': {
        if (dH < 26 && c.dart <= 0) { c.dart = .5; const a = Math.atan2(c.y - H.y, c.x - H.x); c.vx = Math.cos(a) * 80; c.vy = Math.sin(a) * 80; }
        if (c.dart > 0) { c.dart -= dt; c.x += c.vx * dt; c.y += c.vy * dt; }
        if (dH < 32) discover('lizard');
        break;
      }
      case 'tortoise': { c.x += c.vx * dt; c.y += c.vy * dt; if (dH < 30) discover('tortoise'); break; }
      case 'raven': { c.x += c.vx * dt; c.y += c.vy * dt; if (dH < 60) discover('raven'); if (c.t > .5 && R() < dt * .2) sfx.caw(); if (c.t > 14) { critters.splice(i, 1); continue; } break; }
      case 'hawk': { c.a += dt * .35; c.x = c.cx + Math.cos(c.a) * 58; c.y = c.cy + Math.sin(c.a) * 40; c.cx += (H.x - c.cx) * dt * .05; c.cy += (H.y - c.cy) * dt * .05; if (dH < 52) discover('hawk'); c.life -= dt; if (c.life < 0 || nightAmt() > .5) { critters.splice(i, 1); continue; } break; }
      case 'hum': {
        c.k -= dt; if (c.k <= 0) { c.k = rand(.4, 1.2); let fl = null; forObjsNear(c.x, c.y, 90, o => { if ((o.kind === 'marigold' || o.kind === 'poppy' || o.kind === 'lupine' || o.kind === 'lily') && (!fl || R() < .4)) fl = o; }); c.tx = fl ? fl.x + rand(-4, 4) : c.x + rand(-30, 30); c.ty = fl ? fl.y - 2 : c.y + rand(-20, 20); }
        c.x += (c.tx - c.x) * Math.min(1, dt * 5); c.y += (c.ty - c.y) * Math.min(1, dt * 5);
        if (dH < 40) discover('hummingbird'); if (W.bloom <= 0 && H.biome !== 6) { critters.splice(i, 1); continue; } break;
      }
      case 'butter': { c.x += Math.sin(c.t * 1.3) * 12 * dt + 5 * dt; c.y += Math.cos(c.t * .9) * 9 * dt; c.z = 8 + Math.sin(c.t * 3) * 3; if (W.bloom <= 0 && c.t > 5 && H.biome !== 6) { critters.splice(i, 1); continue; } break; }
      case 'moth': { c.x += Math.sin(c.t * 1.7) * 10 * dt; c.y += Math.cos(c.t * 1.3) * 8 * dt; c.z = 10 + Math.sin(c.t * 2.2) * 4; if (nightAmt() < .3) { critters.splice(i, 1); continue; } break; }
      case 'flock': {
        if (!c.burst) {
          for (const bd of c.birds) { bd.ph += dt; if (bd.ph > 6) { bd.ph = 0; bd.x += rand(-3, 3); bd.y += rand(-2, 2); } bd.peck = (bd.peck + dt * 2.2) % 2; }
          if (dH < 44 && hs > 22) burstFlock(c);
          if (dH < 70 && c.t % 4 < dt && R() < .5) sfx.chirp();
        } else {
          c.burst += dt;
          for (const bd of c.birds) { bd.vz += (12 - bd.vz) * dt; bd.z += bd.vz * dt; bd.x += bd.vx * dt; bd.y += bd.vy * dt; }
          if (c.burst > 5) { critters.splice(i, 1); continue; }
        }
        break;
      }
      case 'bighorn': {
        if (dH < 55 && c.flee <= 0 && hs > 10) { c.flee = 1.3; const a = Math.atan2(c.y - H.y, c.x - H.x); c.vx = Math.cos(a) * 55; c.vy = Math.sin(a) * 40; c.face = c.vx > 0 ? 1 : -1; }
        if (c.flee > 0) { c.flee -= dt; const p = collide(c.x + c.vx * dt, c.y + c.vy * dt, 3); c.x = p.x; c.y = p.y; }
        if (dH < 75) discover('bighorn');
        break;
      }
      case 'coyote': {
        if (c.st === 'sit' && dH < 165 && !c.did) { c.st = 'howl'; c.howl = 2.6; c.did = 1; sfx.howl(); }
        if (c.st === 'howl') { c.howl -= dt; if (c.howl <= 0) c.st = 'sit'; }
        if (c.did && dH < 180) discover('coyote');
        if (dH < 46 && c.st !== 'trot') { c.st = 'trot'; const a = Math.atan2(c.y - H.y, c.x - H.x); c.vx = Math.cos(a) * 42; c.vy = Math.sin(a) * 30; c.face = c.vx > 0 ? 1 : -1; }
        if (c.st === 'trot') { c.x += c.vx * dt; c.y += c.vy * dt; if (dH > 240) { critters.splice(i, 1); continue; } }
        if (nightAmt() < .2) { critters.splice(i, 1); continue; }
        break;
      }
      case 'scorp': { c.x += c.vx * dt; c.y += c.vy * dt; if (R() < dt * .5) { c.vx = rand(-6, 6); c.vy = rand(-3, 3); } if (dH < 30) discover('scorpion'); if (nightAmt() < .3) { critters.splice(i, 1); continue; } break; }
      case 'owl': { c.blinkT -= dt; if (c.blinkT < -.15) c.blinkT = rand(1.5, 4); if (dH < 46) discover('owl'); if (R() < dt * .06) sfx.hoot(); if (nightAmt() < .3) { critters.splice(i, 1); continue; } break; }
    }
  }
}

/* ============================== world queries ============================== */
function forObjsNear(x, y, r, fn) {
  const c0 = Math.floor((x - r) / CHS), c1 = Math.floor((x + r) / CHS), r0 = Math.floor((y - r) / CHS), r1 = Math.floor((y + r) / CHS);
  for (let cy = r0; cy <= r1; cy++) for (let cx = c0; cx <= c1; cx++) { const ch = getChunk(cx, cy); for (const o of ch.objs) fn(o); }
}
function spring() { const g = RINGS[8]; let k = 0; if (S.river) k = 1; else if (cine && !cine.kind) k = clamp((cine.t - 3) / 4, 0, 1); if (k <= 0) return null; return { x: g.x, y: g.y + 1, rx: 13 * k, ry: 7.5 * k }; }
function waterBodies(cx, cy) { const out = oasesNear(cx + LW / 2, cy + LH / 2, Math.max(LW, LH)).slice(); const sp = spring(); if (sp && sp.rx > 2) out.push(sp); return out; }
function waterAt(x, y) {
  { const sp = spring(); if (sp && inEll(x, y, sp, -1)) return true; }
  for (const o of oasesNear(x, y, 60)) if (inEll(x, y, o, -1)) return true;
  if (S.river && inRiverBed(x, y, -1)) return true;
  if (cine && cine.fill && inRiverBed(x, y, -1) && Math.abs(x - cine.fx) < cine.fill) return true;
  return false;
}
function nearWater(x, y, pad) {
  { const sp = spring(); if (sp && inEll(x, y, sp, pad)) return true; }
  for (const o of oasesNear(x, y, 60)) if (inEll(x, y, o, pad)) return true;
  if (S.river && inRiverBed(x, y, pad)) return true;
  return false;
}
function collide(px, py, rad) {
  let nx = 0, ny = 0;
  forObjsNear(px, py, 30, o => {
    if (o.box) { const hw = o.box[0] + rad, y0 = o.y - o.box[1] - rad * .6, y1 = o.y + 1 + rad * .6; if (px > o.x - hw && px < o.x + hw && py > y0 && py < y1) { const pl = px - (o.x - hw), pr = o.x + hw - px, pt = py - y0, pb = y1 - py, mn = Math.min(pl, pr, pt, pb); if (mn === pl) { px = o.x - hw; nx -= 1; } else if (mn === pr) { px = o.x + hw; nx += 1; } else if (mn === pt) { py = y0; ny -= 1; } else { py = y1; ny += 1; } } return; }
    if (!o.r) return; const dx = px - o.x, dy = (py - o.y) * 1.3, d = Math.hypot(dx, dy), m = o.r + rad;
    if (d < m && d > .001) { px = o.x + dx / d * m; py = o.y + dy / d * m / 1.3; nx += dx / d; ny += dy / d; }
  });
  for (const m of mesasNear(px, py, 80)) {
    const ex = m.rx + rad, ey = m.ry + rad * .8; const dx = (px - m.x) / ex, dy = (py - m.y) / ey, d = Math.hypot(dx, dy);
    if (d < 1 && d > .001) { px = m.x + dx / d * ex; py = m.y + dy / d * ey; nx += dx; ny += dy; }
  }
  for (const g of RINGS) { if (Math.abs(g.x - px) > 30 || Math.abs(g.y - py) > 30) continue; for (const s of g.stones) { const dx = px - s.x, dy = (py - s.y) * 1.3, d = Math.hypot(dx, dy), m = 2.6 + rad; if (d < m && d > .001) { px = s.x + dx / d * m; py = s.y + dy / d * m / 1.3; nx += dx / d; ny += dy / d; } } }
  if (train.on && Math.abs(py - RAILY) < 7 + rad * .5) for (const c of train.cars) if (Math.abs(px - c.cx) < c.w / 2 + rad) { const up = py < RAILY; py = RAILY + (up ? -(7 + rad * .5) : (7 + rad * .5)); ny += up ? -1 : 1; break; }
  return { x: px, y: py, nx, ny };
}

/* ============================== horse update ============================== */
function setState(s) { H.state = s; H.stT = 0; }
function screenToWorld(clx, cly) { const r = canvas.getBoundingClientRect(), dpr = CW / r.width; return [cam.x + ((clx - r.left) * dpr - OX) / SC, cam.y + ((cly - r.top) * dpr - OY) / SC]; }
function updHorse(dt) {
  if (ptr && ptr.mouse && mode === 'play' && !(cine && cine.lock)) { if (!ptr.steer && performance.now() - ptr.t > 220) ptr.steer = true; if (ptr.steer) { const [wx, wy] = screenToWorld(ptr.cx, ptr.cy); H.target = dist(wx, wy, H.x, H.y) > 10 ? { x: wx, y: wy } : null; } }
  let ix = input.x, iy = input.y;
  if (!ix && !iy) { const kx = (input.keys.has('ArrowRight') || input.keys.has('KeyD') ? 1 : 0) - (input.keys.has('ArrowLeft') || input.keys.has('KeyA') ? 1 : 0); const ky = (input.keys.has('ArrowDown') || input.keys.has('KeyS') ? 1 : 0) - (input.keys.has('ArrowUp') || input.keys.has('KeyW') ? 1 : 0); ix = kx; iy = ky; }
  let mag = Math.hypot(ix, iy);
  if (mag > 0 && cine && cine.lock) { ix = iy = mag = 0; }
  if (mag < .1 && H.target) { const dx = H.target.x - H.x, dy = H.target.y - H.y, d = Math.hypot(dx, dy); if (d < 5) H.target = null; else { ix = dx / d; iy = dy / d; mag = d > 70 ? 1 : .55; } }
  if (mag > 1) { ix /= mag; iy /= mag; mag = 1; }
  H.stT += dt;
  if (H.state !== 'free' && H.state !== 'hop') { if (mag > .15) { if (H.state === 'rest') { sfx.snort(); } setState('free'); } else mag = 0; }
  if (H.state === 'paw' && H.stT > 1.1) setState('free');
  if (H.state === 'drink' && H.stT > 2.4) setState('free');
  if (H.state === 'graze' && H.stT > 3.2) setState('free');
  // speed by how long you keep going: walk, then trot, then a happy canter
  if (mag > .15) H.holdT += dt; else H.holdT = Math.max(0, H.holdT - dt * 4);
  let top = input.run ? 82 : (H.holdT < 1.4 ? 30 : H.holdT < 3.4 ? 52 : 80);
  if (mag < .8) top = Math.min(top, 30 * mag / .8 + 4);
  { const wasW = H.inWater; H.inWater = waterAt(H.x, H.y); if (H.inWater && !wasW && mode === 'play') { nsfx.splashIn(); for (let k = 0; k < 3; k++) parts.push({ x: H.x + rand(-3, 3), y: H.y, vx: 0, vy: 0, life: .5 + k * .2, max: .5 + k * .2, c: '#e8f4ff', kind: 'ripple', g: 0, z: 0 }); for (let k = 0; k < 6; k++) part(H.x + rand(-4, 4), H.y, rand(-20, 20), rand(-40, -18), .5, R() < .5 ? '#cfefff' : '#ffffff', 'drop', 140); } }
  if (mode === 'play') bendFoliage(dt);
  if (H.inWater) { top *= .55; H.wetT += dt; } else { if (H.wetT > .6) H.shakeIn = .35; H.wetT = 0; }
  if (H.shakeIn > 0) { H.shakeIn -= dt; if (H.shakeIn <= 0) { H.shakeT = .6; sfx.shake(); for (let i = 0; i < 16; i++) part(H.x + rand(-9, 9), H.y - rand(8, 18), rand(-40, 40), rand(-30, -5), .6, R() < .5 ? '#cfefff' : '#ffffff', 'drop', 160); } }
  if (H.shakeT > 0) H.shakeT -= dt;
  const tx = ix * top, ty = iy * top * .85;
  const rate = mag > .1 ? 2.6 : 4.2;
  H.vx += (tx - H.vx) * Math.min(1, rate * dt); H.vy += (ty - H.vy) * Math.min(1, rate * dt);
  const ox = H.x, oy = H.y;
  let nx = H.x + H.vx * dt, ny = H.y + H.vy * dt;
  const c = collide(nx, ny, 4.5);
  if (c.nx || c.ny) { const l = Math.hypot(c.nx, c.ny); const ux = c.nx / l, uy = c.ny / l; const vn = H.vx * ux + H.vy * uy; if (vn < 0) { H.vx -= vn * ux; H.vy -= vn * uy; } if (H.target && Math.hypot(c.x - ox, c.y - oy) < .02) H.target = null; }
  H.x = c.x; H.y = c.y;
  const sp = Math.hypot(H.vx, H.vy);
  if (mode === 'play') S.dist += sp * dt * .2;
  H.gait = sp < 2.5 ? 'idle' : sp < 40 ? 'walk' : sp < 64 ? 'trot' : 'canter';
  if (Math.abs(H.vx) > 3) H.face = H.vx > 0 ? 1 : -1;
  if (sp > 3) H.view = Math.abs(H.vy) > Math.abs(H.vx) * 1.5 ? (H.vy > 0 ? 'front' : 'back') : 'side';
  const stride = { walk: 24, trot: 32, canter: 44 }[H.gait] || 24;
  if (sp > 2.5) { const before = H.anim; H.anim += sp * dt / stride; const beats = H.gait === 'walk' ? 4 : H.gait === 'trot' ? 2 : 3; if (Math.floor(before * beats) !== Math.floor(H.anim * beats)) footfall(Math.floor(H.anim * beats) % beats); }
  else H.anim += dt * .5;
  // idle life
  if (H.state === 'free' && H.gait === 'idle' && mode === 'play') { H.idleT += dt; H.grazeCD -= dt; if (H.idleT > 5 && R() < dt * .025) nsfx.nicker(); if (H.grazeCD < 0 && H.idleT > 4) { H.grazeCD = rand(7, 14); setState('graze'); } } else H.idleT = 0;
  H.blinkT -= dt; if (H.blinkT < 0) { H.blink = .14; H.blinkT = rand(2, 5); } if (H.blink > 0) H.blink -= dt;
  H.tp += dt * (H.gait === 'idle' ? .35 : 1);
  if (H.state === 'hop') { H.vz -= 380 * dt; H.z += H.vz * dt; if (H.z <= 0) { H.z = 0; setState('free'); dust(H.x, H.y, 4, 0); } }
  if (H.state === 'rest' && mode === 'play') S.hour += dt * .9;
}
function whinny() {
  audioInit(); if (H.state === 'rest') setState('free');
  if (H.state !== 'hop') { setState('hop'); H.vz = 78; H.z = .1; }
  sfx.whinny();
  for (let i = 0; i < 6; i++) part(H.x + H.face * 8 + rand(-4, 4), H.y - 22, rand(-12, 12), rand(-26, -10), 1.2, pick(['#ff8fa8', '#ffd0dc']), 'heart');
  for (const c of critters) { const d = dist(c.x, c.y, H.x, H.y); if ((c.type === 'raven' || c.type === 'quail') && d < 80) { if (c.type === 'quail') c.flee = 1.2; else c.vy -= 30; } if (c.type === 'flock' && d < 100) burstFlock(c); }
  if (herd && !herd.joined && mode === 'play') { const d = dist(herd.cx, herd.cy, H.x, H.y); if (d < 210) { herd.curious = 8; herd.mem.forEach((m, i) => { if (i < 3) sfx.whinny(rand(1, 1.3), .5 + i * .35, .09 * Math.max(.3, 1 - d / 210)); m.st = 'walk'; }); } }
}
function action() {
  audioInit();
  const a = currentAction();
  const lt = lmThing(); if (lt && lt.a === a) { doLM(lt); return; }
  if (a === 'Drink') { setState('drink'); sfx.drink(); setTimeout(() => { for (let i = 0; i < 4; i++) part(H.x + H.face * 12, H.y - 2, rand(-8, 8), rand(-18, -6), .6, '#cfefff', 'drop', 60); }, 300); }
  else if (a === 'Paw') { const d = nearestDig(); if (d) { setState('paw'); H.face = d.x > H.x ? 1 : -1; H.view = 'side'; sfx.paw(); setTimeout(() => dig(d), 650); } }
  else if (a === 'Nudge' || a === 'Strum' || a === 'Sniff') {
    const cs = campThing(); if (!cs) return; H.view = 'side';
    if (a === 'Strum') { setState('paw'); sfx.strum(cs.cp.said & 1); cs.cp.said++; for (let i = 0; i < 5; i++) part(cs.it.x + rand(-4, 4), cs.it.y - 6, rand(-8, 8), rand(-20, -10), 1.2, '#fff2a8', 'note'); if (cs.cp.said === 2) setTimeout(() => toast('One cowboy mumbles', '"Play the one about the horse."', entryImg('wine')), 900); }
    else if (a === 'Sniff') { setState('graze'); H.stT = 2; sfx.snort(); setTimeout(() => { sfx.snort(); hint('The horse sniffs the wine, sneezes, and decides against it.', 4); }, 700); }
    else { setState('graze'); H.stT = 2.2; sfx.snort(); toast('A cowboy mumbles', pick(MUMBLES), entryImg('wine')); for (let i = 0; i < 3; i++) part(cs.it.x, cs.it.y - 12, rand(-4, 6), rand(-14, -8), 1.8, '#fff8ea', 'z'); }
  }
  else if (a === 'Rest') { setState('rest'); H.vx = H.vy = 0; if (!S.restHinted) { S.restHinted = 1; hint('Resting lets time drift by. Move to get up.', 4); } }
  else if (a === 'Get up') setState('free');
}
function campThing() {
  const hx = H.x + H.face * 8;
  for (const cp of campsNear(H.x, H.y, 80)) {
    if (dist(H.x, H.y, cp.x, cp.y) > 64) continue;
    let best = null, bd = 18;
    for (const it of cp.items) { if (it.kind !== 'guitar' && it.kind !== 'cowboyA' && it.kind !== 'cowboyB') continue; const d = dist(hx, H.y, it.x, it.y); if (d < bd) { bd = d; best = { kind: it.kind, cp, it }; } }
    if (!best && dist(hx, H.y, cp.puddle.x, cp.puddle.y) < 14) best = { kind: 'puddle', cp };
    if (best) return best;
  }
  return null;
}
const MUMBLES = ['"Five more minutes, Ma."', '"Mmf. Tell the horse I said howdy."', '"Is it still Tuesday?"', '"Who drank all the... oh. Me."', '"Nice horse. Real nice. Goodnight."', '"Play the one about the horse."'];
function nearestDig() { let best = null, bd = 18; forObjsNear(H.x, H.y, 24, o => { if (o.kind === 'dig') { const d = dist(o.x, o.y, H.x + H.face * 6, H.y); if (d < bd) { bd = d; best = o; } } }); return best; }
function currentAction() {
  if (cine) return '';
  if (H.state === 'rest') return 'Get up';
  if (nearestDig()) return 'Paw';
  const lt = lmThing(); if (lt) return lt.a;
  const cs = campThing(); if (cs) return cs.kind === 'guitar' ? 'Strum' : cs.kind === 'puddle' ? 'Sniff' : 'Nudge';
  if (nearWater(H.x + H.face * 10, H.y, 4) || waterAt(H.x, H.y)) return 'Drink';
  return 'Rest';
}
function dig(o) {
  const ch = getChunk(Math.floor(o.x / CHS), Math.floor(o.y / CHS)); ch.objs = ch.objs.filter(q => q !== o); S.dug[o.id] = 1;
  const b = biomeAt(o.x, o.y);
  const cands = [['shell', 'fossilfish', 'spur', 'horseshoe'], ['spur', 'arrowhead', 'horseshoe', 'fossilfish'], ['arrowhead', 'spur', 'geode'], ['geode', 'fossilfish', 'spur'], ['geode', 'fossilfish', 'arrowhead'], ['arrowhead', 'horseshoe', 'spur'], ['arrowhead', 'horseshoe', 'shell'], ['shell', 'fossilfish', 'horseshoe'], ['geode', 'arrowhead', 'fossilfish']][b] || ['spur', 'fossilfish', 'geode'];
  const fresh = cands.filter(c => !S.found[c]); const id = fresh.length ? pick(fresh) : pick(cands);
  const spr = ESPR[id]();
  parts.push({ x: o.x, y: o.y - 2, vx: 0, vy: -28, life: 1.6, max: 1.6, kind: 'item', spr, g: 22, z: 0 });
  for (let i = 0; i < 10; i++) part(o.x + rand(-4, 4), o.y, rand(-26, 26), rand(-40, -10), .6, R() < .5 ? '#f6dcb4' : '#d9b07c', 'dust', 90);
  sfx.pop();
  if (S.found[id]) toast('Pawed up', 'Another ' + ENT[id].name.toLowerCase(), entryImg(id)); else setTimeout(() => discover(id), 300);
  save();
}

/* ============================== discoveries & rings ============================== */
let scanT = 0;
function scanDiscoveries(dt) {
  scanT -= dt; if (scanT > 0) return; scanT = .25;
  H.biome = biomeAt(H.x, H.y);
  forObjsNear(H.x, H.y, 40, o => {
    if (!o.disc || S.found[o.disc]) return;
    if (o.disc === 'marigold' && W.bloom <= 0 && o.bl !== 6) return;
    if (dist(o.x, o.y, H.x, H.y) < (o.r ? 26 : 22)) discover(o.disc);
  });
  if (!S.found.mesa) for (const m of mesasNear(H.x, H.y, 120)) { const dx = (H.x - m.x) / (m.rx + 26), dy = (H.y - m.y) / (m.ry + 26); if (dx * dx + dy * dy < 1) discover('mesa'); }
  if (!S.found.palm) for (const o of oasesNear(H.x, H.y, 80)) if (inEll(H.x, H.y, o, 30)) discover('palm');
  for (const g of RINGS) {
    if (g.found) continue; const d = dist(H.x, H.y, g.x, g.y);
    if (d < 8) activateRing(g);
  }
  for (const cp of campsNear(H.x, H.y, 120)) if (dist(H.x, H.y, cp.x, cp.y) < 48) discover('wine');
  for (const L of lmsNear(H.x, H.y, 160)) {
    if (L.type === 'arch') { if (Math.abs(H.x - L.x) < 15 && Math.abs(H.y - L.y) < 8 && !L.under) { L.under = 1; discover('arch'); for (let i = 0; i < 16; i++) part(L.x + rand(-14, 14), L.y - rand(10, 40), rand(-8, 8), rand(-8, 8), 1.2, pick(['#fff6c8', '#ffffff']), 'spark'); } }
    else if (dist(H.x, H.y, L.x, L.y) < L.rad + 26) discover(L.type);
  }
  if (!S.fly && S.played > 35) { S.fly = true; fly.x = H.x + 40; fly.y = H.y - 40; discover('fly'); }
}
function activateRing(g) {
  g.found = true; g.pulse = 1; const n = RINGS.filter(r => r.found).length;
  sfx.ring();
  for (let i = 0; i < 26; i++) { const a = i / 26 * TAU; part(g.x + Math.cos(a) * 6, g.y - 6 + Math.sin(a) * 3, Math.cos(a) * 22, Math.sin(a) * 12 - 8, 1.4, pick(['#cfeeff', '#ffffff', '#9fd8ff']), 'spark'); }
  card('Humming stone ' + n + ' of 9', LINES[g.i], n < 9 ? 'Another one hums somewhere out there.' : '', 9);
  updateHUD(); save();
  if (n === 2 && !S.rainSeen) W.nextRain = Math.min(W.nextRain, 22);
  if (n === 9) startFinale();
}

/* ============================== finale ============================== */
function startFinale() {
  cine = { t: 0, lock: true, fx: H.x, fill: 0, named: false, asked: false }; W.rainTarget = 0; W.rainT = 0; W.nextRain = 300;
  hideCard(); setTimeout(() => card('The ninth stone', LINES[8], '', 6), 600);
}
function updFinale(dt) {
  const c = cine; c.t += dt;
  const target = 22.2;
  if (S.hour < target && S.hour > 6) S.hour = Math.min(target, S.hour + dt * 3.2);
  if (c.t > 3) c.fill += dt * 170;
  if (c.t > 3 && ghosts.length < 11 && R() < dt * 3) spawnGhost(true);
  if (c.t > 9.5 && !c.asked) { c.asked = true; openName(); }
}
function spawnGhost(near) {
  const r = R(); const type = r < .08 && !ghosts.some(g => g.type === 'whale') ? 'whale' : r < .25 ? 'jelly' : 'fish';
  const a = R() * TAU, d = near ? rand(20, 120) : rand(60, 160);
  const dir = R() < .5 ? 1 : -1;
  const n = type === 'fish' ? 3 + (R() * 4 | 0) : 1; const school = [];
  for (let k = 0; k < n; k++) school.push({ ox: rand(-14, 14), oy: rand(-8, 8), ph: R() * TAU });
  ghosts.push({ type, x: H.x + Math.cos(a) * d - dir * 60, y: H.y + Math.sin(a) * d * .7, vx: dir * (type === 'whale' ? 9 : type === 'jelly' ? 3 : 18), vy: type === 'jelly' ? -3 : rand(-2, 2), t: 0, life: type === 'whale' ? 30 : 16, school, dir });
}
function openName() {
  const chips = ['Dune', 'Sol', 'Biscuit', 'Clementine', 'Juniper', 'Mesa'];
  $('chips').innerHTML = ''; for (const nm of chips) { const b = document.createElement('button'); b.textContent = nm; b.onclick = () => { $('nameIn').value = nm; }; $('chips').appendChild(b); }
  $('nameIn').value = ''; $('nameDlg').classList.remove('hide'); setTimeout(() => $('nameIn').focus(), 300);
}
function confirmName() {
  let nm = $('nameIn').value.trim().replace(/\s+/g, ' ').slice(0, 16); if (!nm) nm = 'Dune';
  S.name = nm; S.river = true; $('nameDlg').classList.add('hide'); if (mapBuilt) buildMap();
  cine.lock = false; save(); updateHUD();
  card('You remember', nm + '.', 'The river is running again. Go anywhere you like.', 8);
  setTimeout(() => { whinny(); }, 400); setTimeout(() => { cine = null; }, 6000);
  for (let i = 0; i < 30; i++) part(H.x + rand(-10, 10), H.y - 14, rand(-30, 30), rand(-50, -10), 1.6, pick(['#ff8fa8', '#ffd0dc', '#fff2a8', '#cfeeff']), 'heart');
}

/* ============================== weather ============================== */
function updWeather(dt) {
  if (mode !== 'play') return;
  W.nextRain -= dt;
  if (W.rainTarget === 0 && W.nextRain <= 0 && !cine) { W.rainTarget = 1; W.rainT = rand(45, 70); S.rainSeen = true; hint('It is raining. Something in the desert has been waiting for this.', 6); }
  if (W.rainTarget > 0) { W.rainT -= dt; W.bloom = 260; if (W.rainT <= 0) { W.rainTarget = 0; W.nextRain = rand(260, 420); W.rainbow = 26; } }
  W.rain += (W.rainTarget - W.rain) * Math.min(1, dt * .35);
  if (W.bloom > 0 && W.rain < .2) W.bloom -= dt;
  if (W.rainbow > 0) W.rainbow -= dt;
  W.wind = 1 + Math.sin(T * .07) * .6 + W.rain;
  if (AC) ambTick(dt);
  // drops
  if (W.rain > .05) { const n = Math.floor(W.rain * 4 + R()); for (let i = 0; i < n; i++) drops.push({ x: rand(-20, LW + 20), y: rand(-20, LH), l: rand(.3, .8), t: 0 }); }
  for (let i = drops.length - 1; i >= 0; i--) { const d = drops[i]; d.t += dt; if (d.t > d.l) { drops.splice(i, 1); if (R() < .5) parts.push({ x: d.x + cam.x - 4 + d.t * 20, y: d.y + d.t * 160 + cam.y, vx: 0, vy: 0, life: .35, max: .35, c: '#e8f4ff', kind: 'ripple', g: 0, z: 0 }); } }
}

/* ============================== main update ============================== */
function update(dt) {
  T += dt;
  if (mode === 'play' && !(cine && cine.kind === 'm')) { S.played += dt; S.hour += dt * (24 / 360) * (H.state === 'rest' ? 1 : 1); }
  else S.hour += dt * .01;
  if (S.hour >= 24) S.hour -= 24;
  const pd = update.lastHour ?? S.hour; if (pd < 6 && S.hour >= 6 && mode === 'play') { S.day++; dayCard('Day ' + S.day); save(); }
  update.lastHour = S.hour;
  if (cine) { if (cine.kind === 'm') updM(dt); else updFinale(dt); }
  if (mode === 'play') checkM(dt);
  updHorse(dt);
  if (mode === 'play') { spawnCritters(dt); scanDiscoveries(dt); }
  updCritters(dt); updWeather(dt);
  updHerd(dt); updTrain(dt); updDevils(dt); updStar(dt);
  if (mode === 'play') { checkRegion(dt); ambient(dt); seenT -= dt; if (seenT < 0) { seenT = .4; markSeen(); } }
  if (bannerT > 0) { bannerT -= dt; if (bannerT <= 0) $('region').classList.remove('show'); }
  // fly companion
  if (S.fly) {
    fly.t += dt; const tx = H.x + H.face * 9 + Math.sin(fly.t * 2.3) * 7 + Math.sin(fly.t * 5.1) * 2, ty = H.y - 20 - H.z + Math.cos(fly.t * 1.7) * 5;
    fly.vx += ((tx - fly.x) * 6 - fly.vx * 2.5) * dt; fly.vy += ((ty - fly.y) * 6 - fly.vy * 2.5) * dt; fly.x += fly.vx * dt; fly.y += fly.vy * dt;
    fly.buzzT -= dt; if (fly.buzzT < 0) { fly.buzzT = rand(7, 16); if (mode === 'play') sfx.buzz(); }
  }
  // snoring cowboys
  if (mode === 'play') for (const cp of campsNear(H.x, H.y, 200)) { const d = dist(H.x, H.y, cp.x, cp.y); if (d > 170) continue; cp.snoreT -= dt; if (cp.snoreT < 0) { cp.snoreT = rand(1.6, 2.6); const who = R() < .5 ? [cp.x - 39, cp.y - 2] : [cp.x + 22, cp.y - 26]; parts.push({ x: who[0], y: who[1], vx: rand(3, 7), vy: -9, life: 1.8, max: 1.8, c: '#fff8ea', kind: 'z', g: 0, z: 0 }); if (d < 110) snore(1 - d / 110); } }
  for (const cp of campsNear(H.x, H.y, 220)) if (R() < dt * 1.5) part(cp.x + rand(-1, 1), cp.y - 2, rand(-2, 4), -8, 2.5, 'rgba(230,226,220,.5)', 'dot');
  // tumbleweeds
  if (mode === 'play' && tumbles.length < 2 && R() < dt * .03 && W.rain < .3) tumbles.push({ x: cam.x - 30, y: H.y + rand(-70, 70), vx: rand(16, 28), z: 0, vz: 0, rot: 0 });
  for (let i = tumbles.length - 1; i >= 0; i--) { const t = tumbles[i]; t.vx += (22 * W.wind - t.vx) * dt * .5; t.x += t.vx * dt; t.rot += t.vx * dt / 6; t.vz -= 300 * dt; t.z += t.vz * dt; if (t.z <= 0) { t.z = 0; t.vz = rand(20, 60); } const d = dist(t.x, t.y, H.x, H.y); if (d < 8) { t.vx += (t.x - H.x) * 4 * dt * 20; t.y += (t.y - H.y) * dt * 4; } if (t.x > cam.x + LW + 80) tumbles.splice(i, 1); }
  // ghosts: during the finale, and every night after
  if (S.river && !cine && nightAmt() > .6 && ghosts.length < 10 && R() < dt * .6) spawnGhost(false);
  for (let i = ghosts.length - 1; i >= 0; i--) { const g = ghosts[i]; g.t += dt; g.x += g.vx * dt; g.y += g.vy * dt; if (g.t > g.life || (nightAmt() < .2 && !cine && !g.day)) ghosts.splice(i, 1); }
  // particles & prints
  for (let i = parts.length - 1; i >= 0; i--) { const p = parts[i]; p.life -= dt; if (p.life <= 0) { parts.splice(i, 1); continue; } p.vy += p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt; if (p.kind === 'dust' || p.kind === 'drop') { p.vx *= 1 - dt * 2; } }
  for (let i = prints.length - 1; i >= 0; i--) { prints[i].t += dt; if (prints[i].t > 40) prints.splice(i, 1); }
  for (const g of RINGS) if (g.pulse > 0) g.pulse -= dt * .3;
  // camera
  const lx = H.vx * .45, ly = H.vy * .35;
  let fx = H.x, fy = H.y; if (cine && cine.kind === 'm') { fx = (H.x + (cine.m.vis ? cine.m.x : cine.sx)) / 2; fy = (H.y + cine.meet.y) / 2 - 4; }
  const tx = fx + lx - LW / 2, ty = fy + ly - LH / 2 - (mode === 'title' ? LH * titleOff() : 8);
  cam.x += (tx - cam.x) * Math.min(1, dt * 3); cam.y += (ty - cam.y) * Math.min(1, dt * 3);
  // timers
  if (cardTimer > 0) { cardTimer -= dt; if (cardTimer <= 0) hideCard(); }
  if (dayCardT > 0) { dayCardT -= dt; if (dayCardT <= 0) $('dayCard').classList.add('hide'); }
  if (hintT > 0) { hintT -= dt; if (hintT <= 0) $('hint').classList.add('hide'); }
  saveT -= dt; if (saveT < 0 && mode === 'play') { saveT = 6; save(); updateHUD(); }
  actT -= dt; if (actT < 0 && mode === 'play') { actT = .2; const a = currentAction(); const b = $('actBtn'); if (b.textContent !== a) b.textContent = a; b.style.visibility = a ? 'visible' : 'hidden'; }
}
let saveT = 4, actT = 0;

/* ============================== render ============================== */
let genBudget = 0;
function render() {
  const cx = Math.floor(cam.x), cy = Math.floor(cam.y);
  const b = bctx; b.imageSmoothingEnabled = false;
  // ground
  const c0 = Math.floor(cx / CHS), c1 = Math.floor((cx + LW) / CHS), r0 = Math.floor(cy / CHS), r1 = Math.floor((cy + LH) / CHS);
  genBudget = 40;
  const want = [];
  for (let ry = r0 - 1; ry <= r1 + 1; ry++) for (let rx = c0 - 1; rx <= c1 + 1; rx++) {
    const ch = getChunk(rx, ry); const vis = ry >= r0 && ry <= r1 && rx >= c0 && rx <= c1;
    if (!ch.img) want.push([vis ? 0 : 1, ch]);
    if (vis) { if (ch.img) b.drawImage(ch.img, rx * CHS - cx, ry * CHS - cy); else { b.fillStyle = '#efc592'; b.fillRect(rx * CHS - cx, ry * CHS - cy, CHS, CHS); } }
  }
  want.sort((a, c) => a[0] - c[0] || (c[1].gen ? 1 : 0) - (a[1].gen ? 1 : 0));
  for (const [, ch] of want) { if (genBudget <= 0) break; const before = ch.gen ? ch.gen.y : 0; const done = genChunkStep(ch, Math.min(genBudget, CHS)); genBudget -= (done ? CHS - before : CHS); if (done) { const vis = true; if (vis && ch.cx >= c0 && ch.cx <= c1 && ch.cy >= r0 && ch.cy <= r1) b.drawImage(ch.img, ch.cx * CHS - cx, ch.cy * CHS - cy); } }
  const night = nightAmt();
  // water: oases & river
  const tt = T;
  for (const o of waterBodies(cx, cy)) if (o.rx > 2) drawWater(o, cx, cy, tt, night);
  if (S.river || (cine && cine.fill > 0)) drawRiver(cx, cy, tt, night);
  for (const cp of campsNear(cx + LW / 2, cy + LH / 2, Math.max(LW, LH))) drawCampFlat(cp, cx, cy, tt);
  const LMV = lmsNear(cx + LW / 2, cy + LH / 2, Math.max(LW, LH));
  for (const L of LMV) drawLMFlat(L, cx, cy, tt);
  // hoofprints
  for (const p of prints) { const a = 1 - p.t / 40; if (a <= 0) continue; b.fillStyle = 'rgba(' + (p.c || '150,100,60') + ',' + (.3 * a).toFixed(3) + ')'; b.fillRect(Math.floor(p.x - cx), Math.floor(p.y - cy), 2, 1); }
  // ring glow on the sand
  for (const g of RINGS) { if (g.x < cx - 60 || g.x > cx + LW + 60 || g.y < cy - 60 || g.y > cy + LH + 60) continue; if (g.found) { b.fillStyle = 'rgba(255,250,235,.12)'; ellipseFill(b, g.x - cx, g.y - cy, 15, 9); } }
  // sprites list
  const list = [];
  const m = 40;
  forObjsNear(cx + LW / 2, cy + LH / 2, Math.max(LW, LH) / 2 + m, o => { if (o.x < cx - m || o.x > cx + LW + m || o.y < cy - 10 || o.y > cy + LH + 50) return; list.push(o); });
  for (const me of mesasNear(cx + LW / 2, cy + LH / 2, Math.max(LW, LH))) { if (!me.spr) me.spr = mesaSprite(me.w, me.top, me.cliff, me.seed); list.push({ kind: 'mesa', x: me.x, y: me.y + me.ry, me }); }
  for (const g of RINGS) { if (g.x < cx - 60 || g.x > cx + LW + 60 || g.y < cy - 60 || g.y > cy + LH + 80) continue; for (const s of g.stones) list.push({ kind: 'stone', x: s.x, y: s.y, spr: SPR.stone[s.v] }); list.push({ kind: 'center', x: g.x, y: g.y + 1, g }); }
  for (const c of critters) if (c.type !== 'hawk' && c.type !== 'moth') list.push({ kind: 'critter', x: c.x, y: c.y, c });
  for (const t of tumbles) list.push({ kind: 'tumble', x: t.x, y: t.y, t });
  if (herd) for (const m of herd.mem) list.push({ kind: 'herd', x: m.x, y: m.y, m });
  if (train.on) for (const c of train.cars) list.push({ kind: 'car', x: c.cx, y: RAILY + 4, c });
  for (const d of devils) list.push({ kind: 'devil', x: d.x, y: d.y, d });
  list.push({ kind: 'horse', x: H.x, y: H.y });
  if (cine && cine.kind === 'm') { if (cine.t < 32) list.push({ kind: 'harm', x: cine.sx, y: cine.sy + 1 }); }
  // ground shadows
  for (const o of list) {
    if (o.kind === 'horse') { b.fillStyle = 'rgba(90,50,30,.22)'; ellipseFill(b, H.x - cx, H.y - cy, Math.max(4, 9 - H.z * .1), 2.4); continue; }
    const d = DEF[o.kind]; if (d && d.sh) { b.fillStyle = 'rgba(90,50,30,.2)'; ellipseFill(b, o.x - cx + 1, o.y - cy, d.sh, 2); }
    if (o.kind === 'critter' && o.c.z > 4) { b.fillStyle = 'rgba(90,50,30,.18)'; ellipseFill(b, o.x - cx, o.y - cy, 3, 1); }
    if (o.kind === 'herd') { b.fillStyle = 'rgba(90,50,30,.2)'; ellipseFill(b, o.x - cx, o.y - cy, 8, 2.2); }
    if (o.kind === 'car') { b.fillStyle = 'rgba(40,30,30,.22)'; ellipseFill(b, o.x - cx, o.y - cy, o.c.w / 2, 2.5); }
    if (o.kind === 'devil') { b.fillStyle = 'rgba(90,50,30,.15)'; ellipseFill(b, o.x - cx, o.y - cy, 5, 1.6); }
  }
  list.sort((a, b2) => a.y - b2.y);
  for (const o of list) drawThing(o, cx, cy, tt);
  for (const L of LMV) if (L.type === 'arch') { const x = Math.floor(L.x - cx) - 35, y = Math.floor(L.y - cy) - 51; if (x < LW && x > -80 && y < LH && y > -40) b.drawImage(SPR.lm_archTop, x, y); }
  // dig sparkles
  forObjsNear(cx + LW / 2, cy + LH / 2, Math.max(LW, LH) / 2 + 20, o => { if (o.kind !== 'dig') return; const x = Math.floor(o.x - cx), y = Math.floor(o.y - cy); b.fillStyle = 'rgba(160,110,60,.35)'; b.fillRect(x - 2, y, 5, 1); b.fillRect(x - 1, y - 1, 3, 1); const ph = (tt * 1.7 + o.t) % 2.2; if (ph < .5) { const s = ph < .25 ? 1 : 2; b.fillStyle = '#fffbe8'; b.fillRect(x, y - 3 - s, 1, s * 2 + 1); b.fillRect(x - s, y - 3, s * 2 + 1, 1); } else { b.fillStyle = '#fff3c8'; b.fillRect(x, y - 3, 1, 1); } });
  // particles
  for (const p of parts) {
    const x = Math.floor(p.x - cx), y = Math.floor(p.y - cy), a = Math.min(1, p.life / p.max * 1.8);
    if (p.kind === 'heart') { b.globalAlpha = a; b.fillStyle = p.c; b.fillRect(x - 1, y, 1, 1); b.fillRect(x + 1, y, 1, 1); b.fillRect(x - 1, y + 1, 3, 1); b.fillRect(x, y + 2, 1, 1); b.globalAlpha = 1; }
    else if (p.kind === 'z') { b.globalAlpha = a * .9; b.fillStyle = p.c; b.fillRect(x, y, 3, 1); b.fillRect(x + 1, y + 1, 1, 1); b.fillRect(x, y + 2, 3, 1); b.globalAlpha = 1; }
    else if (p.kind === 'note') { b.globalAlpha = a; b.fillStyle = p.c; b.fillRect(x, y, 1, 3); b.fillRect(x - 1, y + 2, 1, 1); b.fillRect(x + 1, y, 1, 1); b.globalAlpha = 1; }
    else if (p.kind === 'item') { b.drawImage(p.spr, x - (p.spr.width >> 1), y - p.spr.height); }
    else if (p.kind === 'smoke') { const sz = 1 + Math.floor((1 - p.life / p.max) * 4); b.globalAlpha = a * .55; b.fillStyle = p.c; b.fillRect(x - (sz >> 1), y - (sz >> 1), sz, sz); b.globalAlpha = 1; }
    else if (p.kind === 'petal') { b.globalAlpha = a; b.fillStyle = p.c; b.fillRect(x, y, 2, 1); b.globalAlpha = 1; }
    else if (p.kind === 'ripple') { b.globalAlpha = a * .6; b.strokeStyle = p.c; const r = Math.floor((1 - p.life / p.max) * 3) + 1; b.fillStyle = p.c; b.fillRect(x - r, y, 1, 1); b.fillRect(x + r, y, 1, 1); b.fillRect(x, y - 1, 1, 1); b.globalAlpha = 1; }
    else { b.globalAlpha = a; b.fillStyle = p.c; b.fillRect(x, y, 1, 1); b.globalAlpha = 1; }
  }
  // flying things: moths, hawk
  for (const c of critters) {
    if (c.type === 'hawk') { const x = Math.floor(c.x - cx), y = Math.floor(c.y - cy); b.fillStyle = 'rgba(80,45,30,.18)'; ellipseFill(b, x + 10, y + 14, 8, 2.5); b.drawImage(SPR.hawk[(c.t * 2 | 0) & 1], x - 9, y - c.z); }
  }
  // fly
  if (S.fly) { const x = Math.floor(fly.x - cx), y = Math.floor(fly.y - cy); b.fillStyle = '#2a2420'; b.fillRect(x, y, 2, 1); if ((tt * 30 | 0) & 1) { b.fillStyle = 'rgba(230,245,255,.9)'; b.fillRect(x, y - 1, 1, 1); b.fillRect(x + 1, y - 1, 1, 1); } }
  // cloud shadows
  drawClouds(cx, cy, tt);
  // wind streaks when galloping
  if (Math.abs(H.vx) > 58 && mode === 'play') { const a = clamp((Math.abs(H.vx) - 58) / 24, 0, 1) * .3; b.fillStyle = 'rgba(255,250,240,' + a.toFixed(2) + ')'; for (let i = 0; i < 8; i++) { const y = Math.floor(hash(i, 7, 2) * LH), len = 6 + Math.floor(hash(i, 8, 2) * 10), x = Math.floor(((hash(i, 3, 4) * LW * 4 - T * H.vx * 2.4) % (LW + 40) + LW + 40) % (LW + 40)) - 20; b.fillRect(x, y, len, 1); } }
  // rain
  if (drops.length) { b.fillStyle = 'rgba(220,235,255,.55)'; for (const d of drops) { const x = Math.floor(d.x + d.t * 20), y = Math.floor(d.y + d.t * 160); b.fillRect(x, y, 1, 3); } }
  // light: multiply tint
  let tint = tintAt(S.hour); if (fullMoon() && night > 0) tint = mixc(tint, [150, 168, 218], night * .5); if (W.rain > 0) tint = mixc(tint, mixc(tint, [190, 196, 214], .9), W.rain);
  b.globalCompositeOperation = 'multiply'; b.fillStyle = css(tint); b.fillRect(0, 0, LW, LH); b.globalCompositeOperation = 'source-over';
  // lights
  b.globalCompositeOperation = 'lighter';
  for (const g of RINGS) {
    if (g.x < cx - 80 || g.x > cx + LW + 80 || g.y < cy - 80 || g.y > cy + LH + 80) continue;
    const x = Math.floor(g.x - cx), y = Math.floor(g.y - cy);
    if (!g.found) { const p = .65 + .35 * Math.sin(tt * 2); b.globalAlpha = p * (.45 + night * .55); b.drawImage(GLOW.stone, x - 22, y - 28); b.globalAlpha = 1; }
    else if (g.pulse > 0 || night > .3) { b.globalAlpha = Math.max(g.pulse, night * .35); b.drawImage(GLOW.stone, x - 22, y - 28); b.globalAlpha = 1; }
  }
  if (night > .05) {
    if (cine && cine.kind === 'm' && cine.m.vis) { b.globalAlpha = cine.m.a; b.drawImage(GLOW.m, Math.floor(cine.m.x - cx) - 22, Math.floor(cine.m.y - cy) - 34); b.globalAlpha = 1; b.globalCompositeOperation = 'source-over'; drawMFig(cx, cy); b.globalCompositeOperation = 'lighter'; }
    b.globalAlpha = night; b.drawImage(GLOW.horse, Math.floor(H.x - cx) - 40, Math.floor(H.y - cy) - 52); b.globalAlpha = 1;
    if (S.fly) { b.globalAlpha = night; b.drawImage(GLOW.fly, Math.floor(fly.x - cx) - 14, Math.floor(fly.y - cy) - 14); b.drawImage(GLOW.tiny, Math.floor(fly.x - cx) - 4, Math.floor(fly.y - cy) - 4); b.globalAlpha = 1; }
    for (const c of critters) if (c.type === 'moth') { const x = Math.floor(c.x - cx), y = Math.floor(c.y - cy - c.z); b.globalAlpha = night * (.6 + .4 * Math.sin(c.t * 5)); b.drawImage(GLOW.moth, x - 6, y - 6); b.fillStyle = '#f4ffd8'; b.fillRect(x, y, 1, 1); b.globalAlpha = 1; }
    forObjsNear(cx + LW / 2, cy + LH / 2, Math.max(LW, LH) / 2 + 20, o => { if (o.kind === 'dig') { b.globalAlpha = night * (.4 + .4 * Math.sin(tt * 2 + o.t)); b.drawImage(GLOW.tiny, Math.floor(o.x - cx) - 4, Math.floor(o.y - cy) - 7); b.globalAlpha = 1; } });
    for (const L of LMV) {
      if (L.type === 'station' && Math.sin(T * 13) + Math.sin(T * 7.3) > -1.5) { b.globalAlpha = night; b.drawImage(GLOW.neon, Math.floor(L.x - 32 - cx) - 16, Math.floor(L.y - 21 - cy) - 16); b.globalAlpha = 1; }
      if (L.type === 'ghosttown') { b.globalAlpha = night * (.75 + .25 * Math.sin(T * 3)); b.drawImage(GLOW.win, Math.floor(L.x - 12 - cx) - 5, Math.floor(L.y - 11 - cy) - 5); b.drawImage(GLOW.win, Math.floor(L.x + 11 - cx) - 5, Math.floor(L.y - 11 - cy) - 5); b.globalAlpha = 1; }
    }
    if (train.on) { b.globalAlpha = night; b.drawImage(GLOW.lamp, Math.floor(train.x - cx) + train.dir * 14 - 26, Math.floor(RAILY - 16 - cy) - 26); for (const c of train.cars) if (c.k === 'passcar' || c.k === 'caboose') for (let k = -2; k <= 2; k++) b.drawImage(GLOW.win, Math.floor(c.cx + k * 7 - cx) - 5, Math.floor(RAILY - 13 - cy) - 5); b.globalAlpha = 1; }
    for (const c of critters) if (c.type === 'scorp') { b.globalAlpha = night; b.drawImage(GLOW.uv, Math.floor(c.x - cx) - 7, Math.floor(c.y - cy) - 9); b.globalAlpha = 1; }
  }
  // the stars come down to drink
  if (night > .2) {
    for (const o of waterBodies(cx, cy)) { const x = Math.floor(o.x - cx), y = Math.floor(o.y - cy); for (let k = 0; k < 16; k++) { const sx = (hash(k, o.x | 0, 3) - .5) * o.rx * 1.7, sy = (hash(k, o.y | 0, 4) - .5) * o.ry * 1.7; if ((sx * sx) / (o.rx * o.rx) + (sy * sy) / (o.ry * o.ry) > .8) continue; const tw = .45 + .55 * Math.sin(tt * (1.5 + hash(k, 1, 9)) + k * 1.7); b.fillStyle = 'rgba(255,250,225,' + (night * tw).toFixed(2) + ')'; b.fillRect(x + Math.floor(sx), y + Math.floor(sy), 1, 1); if (hash(k, o.x | 0, 5) > .85) { b.fillRect(x + Math.floor(sx) - 1, y + Math.floor(sy), 3, 1); } } }
    if (S.river) for (let wx = cx; wx < cx + LW; wx++) { if (hash(wx, 7, 1) > .07) continue; const ry = riverY(wx), hw = riverHW(wx) - 1, y0 = Math.floor(ry - hw - cy), h = Math.ceil(hw * 2); if (y0 > LH || y0 + h < 0) continue; const tw = .45 + .55 * Math.sin(tt * 2 + wx); b.fillStyle = 'rgba(255,250,225,' + (night * tw).toFixed(2) + ')'; b.fillRect(wx - cx, y0 + 2 + Math.floor(hash(wx, 8, 2) * (h - 4)), 1, 1); }
  }
  // ghost sea
  for (const g of ghosts) {
    const a = Math.min(1, g.t / 2, (g.life - g.t) / 3) * (cine ? 1 : g.day ? Math.max(.6, night) : night) * .62; if (a <= 0) continue;
    const spr = g.type === 'whale' ? SPR.gwhale : g.type === 'jelly' ? SPR.gjelly : SPR.gfish;
    b.globalAlpha = a;
    for (const s of g.school) {
      const x = Math.floor(g.x + s.ox + Math.sin(g.t * 1.5 + s.ph) * 2 - cx), y = Math.floor(g.y + s.oy + Math.sin(g.t * 2 + s.ph) * 1.5 - cy);
      if (g.dir < 0) b.drawImage(spr, x - (spr.width >> 1), y - (spr.height >> 1)); else { b.save(); b.scale(-1, 1); b.drawImage(spr, -x - (spr.width >> 1), y - (spr.height >> 1)); b.restore(); }
      b.globalAlpha = a * .35; b.drawImage(GLOW.sea, x - 12, y - 12); b.globalAlpha = a;
    }
    b.globalAlpha = 1;
  }
  if (star) { const a = Math.min(1, (star.life - star.t) / .5, star.t / .15) * (star.wished ? .5 : 1); const hx = star.x + star.vx * star.t, hy = star.y + star.vy * star.t, l = Math.hypot(star.vx, star.vy), ux = star.vx / l, uy = star.vy / l; for (let i = 0; i < 20; i++) { b.fillStyle = 'rgba(255,250,220,' + (a * (1 - i / 20)).toFixed(2) + ')'; b.fillRect(Math.floor(hx - ux * i * 1.3), Math.floor(hy - uy * i * 1.3), i < 2 ? 2 : 1, 1); } }
  b.globalCompositeOperation = 'source-over';
  // rainbow
  if (W.rainbow > 0) { const a = Math.min(1, W.rainbow / 4, (26 - W.rainbow) / 3) * .22; const cols = ['#ff6a6a', '#ffb05a', '#ffe66a', '#7ed87e', '#6ab8ff', '#a88aff']; const R0 = Math.max(LW, LH) * .75; for (let k = 0; k < cols.length; k++) { b.strokeStyle = cols[k]; b.globalAlpha = a; b.lineWidth = 3; b.beginPath(); b.arc(LW * .5, LH * 1.15, R0 - k * 3, Math.PI * 1.1, Math.PI * 1.9); b.stroke(); } b.globalAlpha = 1; }
  // guidance: a soft glint at the screen edge pointing to the next humming stone
  drawCompass(cx, cy, tt);
  // blit
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(buf, OX, OY, LW * SC, LH * SC);
}
function ellipseFill(b, x, y, rx, ry) { x = Math.floor(x); y = Math.floor(y); for (let j = -Math.ceil(ry); j <= Math.ceil(ry); j++) { const w = Math.floor(rx * Math.sqrt(Math.max(0, 1 - (j * j) / (ry * ry)))); if (w > 0) b.fillRect(x - w, y + j, w * 2 + 1, 1); } }
function drawWater(o, cx, cy, tt, night) {
  const b = bctx; const x = Math.floor(o.x - cx), y = Math.floor(o.y - cy);
  if (x + o.rx + 20 < 0 || x - o.rx - 20 > LW || y + o.ry + 20 < 0 || y - o.ry - 20 > LH) return;
  b.fillStyle = '#c99a6a'; ellipseFill(b, x, y + 1, o.rx + 2, o.ry + 2);
  b.fillStyle = '#4fa6d8'; ellipseFill(b, x, y, o.rx, o.ry);
  b.fillStyle = '#3c8cc4'; ellipseFill(b, x, y + 2, o.rx - 4, o.ry - 3);
  b.fillStyle = '#a6e0f5';
  for (let k = 0; k < 7; k++) { const rx2 = Math.floor(((k * 37 + tt * 6) % (o.rx * 1.6)) - o.rx * .8), ry2 = Math.floor(((k * 23) % (o.ry * 1.2)) - o.ry * .6); if ((rx2 * rx2) / (o.rx * o.rx) + (ry2 * ry2) / (o.ry * o.ry) < .7) b.fillRect(x + rx2, y + ry2, 3, 1); }
  b.fillStyle = 'rgba(255,255,255,.55)'; b.fillRect(x - o.rx + 4, y - o.ry + 2, Math.floor(o.rx * .6), 1);
}
function drawCampFlat(cp, cx, cy, tt) {
  const b = bctx, x = Math.floor(cp.x - cx), y = Math.floor(cp.y - cy);
  if (x < -60 || x > LW + 60 || y < -60 || y > LH + 60) return;
  // the old fire
  b.fillStyle = '#6a5a52'; ellipseFill(b, x, y, 6, 3.5); b.fillStyle = '#3a2e2a'; ellipseFill(b, x, y, 3.5, 2);
  b.fillStyle = '#2a201c'; b.fillRect(x - 3, y - 1, 6, 1); b.fillRect(x - 1, y - 2, 3, 3);
  if (Math.sin(tt * 3) > .2) { b.fillStyle = '#ff7a3a'; b.fillRect(x, y - 1, 1, 1); } if (Math.sin(tt * 2.3 + 1) > .4) { b.fillStyle = '#ffb04a'; b.fillRect(x - 2, y, 1, 1); }
  b.fillStyle = '#a99c8f'; for (let k = 0; k < 9; k++) { const a = k / 9 * TAU; b.fillRect(Math.round(x + Math.cos(a) * 7), Math.round(y + Math.sin(a) * 4), 2, 1); }
  // a puddle of red
  const px = Math.floor(cp.puddle.x - cx), py = Math.floor(cp.puddle.y - cy);
  b.fillStyle = '#4a0e18'; ellipseFill(b, px, py + 1, 9, 3.5); ellipseFill(b, px + 7, py - 1, 4, 2.2);
  b.fillStyle = '#7a1628'; ellipseFill(b, px, py, 8, 2.8); ellipseFill(b, px + 7, py - 1, 3, 1.6);
  b.fillStyle = '#c04a5e'; b.fillRect(px - 4, py - 1, 3, 1); b.fillRect(px + 6, py - 2, 1, 1);
  if (((tt * 1.3) % 3) < .3) { b.fillStyle = '#ffd0d8'; b.fillRect(px - 2, py - 1, 1, 1); }
}
function drawRiver(cx, cy, tt, night) {
  const b = bctx; let lo = cx - 2, hi = cx + LW + 2;
  if (!S.river && cine) { lo = Math.max(lo, Math.floor(cine.fx - cine.fill)); hi = Math.min(hi, Math.ceil(cine.fx + cine.fill)); }
  for (let wx = lo; wx < hi; wx++) {
    const ry = riverY(wx), hw = riverHW(wx) - 1; const y0 = Math.floor(ry - hw - cy), h = Math.ceil(hw * 2);
    if (y0 > LH || y0 + h < 0) continue;
    b.fillStyle = '#4fa6d8'; b.fillRect(wx - cx, y0, 1, h);
    b.fillStyle = '#3c8cc4'; b.fillRect(wx - cx, y0 + 3, 1, Math.max(0, h - 6));
    if (((wx * 7 + Math.floor(tt * 14)) % 23) < 3) { b.fillStyle = '#a6e0f5'; b.fillRect(wx - cx, y0 + 2 + ((wx * 13) % Math.max(1, h - 4)), 1, 1); }
    b.fillStyle = 'rgba(255,255,255,.5)'; b.fillRect(wx - cx, y0, 1, 1);
  }
}
function drawThing(o, cx, cy, tt) {
  const b = bctx;
  const at = (spr, x, y, flip) => { const dx = Math.floor(x - cx) - (spr.width >> 1), dy = Math.floor(y - cy) - spr.height + 1; if (flip) { b.save(); b.scale(-1, 1); b.drawImage(spr, -dx - spr.width, dy); b.restore(); } else b.drawImage(spr, dx, dy); };
  switch (o.kind) {
    case 'horse': return drawHorse(cx, cy);
    case 'harm': return at(SPR.harmonica, o.x, o.y - 10);
    case 'm': return drawMFig(cx, cy);
    case 'mesa': { const me = o.me; b.drawImage(me.spr, Math.floor(me.x - cx - me.w / 2 - 1), Math.floor(me.y - cy - me.top / 2 - 1 - me.cliff)); return; }
    case 'stone': return at(o.spr, o.x, o.y);
    case 'center': { const g = o.g; at(g.found ? SPR.centerDim : SPR.center, g.x, g.y + 1); return; }
    case 'tumble': { const t = o.t; b.fillStyle = 'rgba(90,50,30,.18)'; ellipseFill(b, t.x - cx, t.y - cy, 5, 1.5); at(SPR.tumble[Math.floor(t.rot) % 6 < 0 ? 0 : Math.floor(t.rot) % 6], t.x, t.y - t.z); return; }
    case 'critter': return drawCritter(o.c, at, tt, cx, cy);
    case 'herd': return drawHerdHorse(o.m, cx, cy);
    case 'car': { const c = o.c, spr = c.k === 'loco' ? SPR.loco[(T * 7 | 0) & 1] : SPR[c.k]; return at(spr, c.cx, RAILY + 4, train.dir < 0); }
    case 'devil': { const d = o.d, a = clamp(Math.min(d.t / 2, (d.life - d.t) / 2), 0, 1), cs = dustCols(H.biome); b.globalAlpha = .8 * a; for (let k = 0; k < 22; k++) { const ang = T * 9 + k * .75, h = k * 1.5, r = 1.5 + k * .42; b.fillStyle = cs[k & 1]; b.fillRect(Math.floor(d.x - cx + Math.cos(ang) * r), Math.floor(d.y - cy - h + Math.sin(ang) * r * .3), k > 14 ? 1 : 2, 1); } b.globalAlpha = 1; return; }
    case 'lm_windmill': { at(o.spr, o.x, o.y); drawBlades(Math.floor(o.x - cx), Math.floor(o.y - cy) - 49); return; }
    case 'lm_mailbox': return at(o.lm && S.mail[o.lm.id] ? SPR.lm_mailboxD : SPR.lm_mailbox, o.x, o.y);
    case 'poppy': case 'lupine': case 'lily': { const sway = Math.sin(tt * 1.4 + o.t) * W.wind; return at(o.spr, o.x + bendOff(o) + (Math.abs(sway) > 1.2 ? Math.sign(sway) : 0), o.y); }
    case 'marigold': return at(W.bloom > 0 || o.bl === 6 ? SPR.marigoldB : SPR.marigold, o.x + bendOff(o), o.y);
    case 'dig': return;
    case 'sage': case 'tuft': { const sway = Math.sin(tt * 1.6 + o.t) * W.wind, bo = bendOff(o); if (Math.abs(sway) > 1.1 && o.kind === 'tuft') { at(o.spr, o.x + bo + (sway > 0 ? 1 : -1), o.y); return; } return at(o.spr, o.x + bo, o.y); }
    case 'reed': { const sway = Math.sin(tt * 1.3 + o.t) * W.wind; return at(o.spr, o.x + bendOff(o) + (Math.abs(sway) > 1 ? Math.sign(sway) : 0), o.y); }
    default: if (o.spr) return at(o.spr, o.x, o.y, o.kind === 'saguaro' && (o.v & 4));
  }
}
function drawCritter(c, at, tt, cx, cy) {
  const f = (tt * 8 | 0) & 1;
  switch (c.type) {
    case 'flock': { for (const bd of c.birds) { if (bd.z > 1) { bctx.fillStyle = 'rgba(90,50,30,.15)'; bctx.fillRect(Math.floor(bd.x - cx), Math.floor(bd.y - cy), 2, 1); at(((tt * 14 + bd.ph) | 0) & 1 ? SPR.wren[2] : SPR.wrenUp, bd.x, bd.y - bd.z, bd.vx < 0); } else at(SPR.wren[bd.peck > 1.6 ? 1 : 0], bd.x, bd.y, bd.ph > 4.5); } return; }
    case 'bighorn': return at(SPR.bighorn[c.flee > 0 ? (tt * 8 | 0) & 1 : 0], c.x, c.y, c.face < 0);
    case 'coyote': return at(SPR.coyote[c.st === 'trot' ? 2 : c.st === 'howl' ? 1 : 0], c.x, c.y, c.face < 0);
    case 'scorp': return at(SPR.scorp[(tt * 6 | 0) & 1], c.x, c.y, c.vx < 0);
    case 'quail': { const mv = Math.hypot(c.vx, c.vy) > 3; const fl = c.vx < 0; for (const k of c.kids) at(SPR.chick[mv ? f : 0], k.x, k.y, fl); at(SPR.quail[mv ? f : 0], c.x, c.y, fl); return; }
    case 'roadrunner': return at(SPR.rr[c.stopped > 0 ? 0 : f], c.x, c.y, c.vx < 0);
    case 'rabbit': return at(SPR.rabbit[c.z > 0 ? 1 : 0], c.x, c.y - c.z, c.vx < 0);
    case 'lizard': return at(SPR.lizard[c.dart > 0 ? f : 0], c.x, c.y, c.vx < 0);
    case 'tortoise': return at(SPR.tortoise[(tt * 2 | 0) & 1], c.x, c.y, c.vx < 0);
    case 'raven': return at(SPR.raven[(tt * 5 | 0) & 1], c.x, c.y - c.z, c.vx < 0);
    case 'hum': return at(SPR.hum[(tt * 20 | 0) & 1], c.x, c.y - c.z, (c.tx - c.x) < 0);
    case 'butter': return at(SPR.butter[c.c][(tt * 6 + c.t | 0) & 1], c.x, c.y - c.z);
    case 'owl': return at(SPR.owl[c.blinkT < 0 ? 1 : 0], c.x, c.y - c.perchH);
  }
}
function drawHorse(cx, cy) {
  const b = bctx; let spr;
  const fi = n => Math.floor((H.anim % 1 + 1) % 1 * n) % n;
  const st = H.state;
  if (st === 'rest') spr = SPR.rest[(T % 6) > 3 ? 1 : 0];
  else if (st === 'hop') spr = SPR.hop;
  else if (st === 'graze' || st === 'drink') spr = SPR.graze[Math.floor(H.stT * 3) % 4];
  else if (st === 'paw') spr = SPR.paw[Math.floor(H.stT * 7) % 6];
  else if (H.view === 'front') spr = H.gait === 'idle' ? SPR.frontIdle[H.blink > 0 ? 1 : 0] : SPR.front[fi(4)];
  else if (H.view === 'back') spr = H.gait === 'idle' ? SPR.backIdle : SPR.back[fi(4)];
  else if (H.gait === 'idle') spr = (H.blink > 0 ? SPR.idleB : SPR.idle)[Math.floor((H.tp % 1) * 8) % 8];
  else spr = SPR[H.gait][fi(8)];
  const side = spr.width === 34;
  const ax = side ? 15 : 11;
  const jit = H.shakeT > 0 ? (((T * 30) | 0) & 1 ? 1 : -1) : 0;
  const dx = Math.floor(H.x - cx) - (side && H.face < 0 ? spr.width - 1 - ax : ax) + jit, dy = Math.floor(H.y - cy - H.z) - HB;
  if (H.inWater) { b.save(); b.beginPath(); b.rect(0, 0, LW, Math.floor(H.y - cy) - 2); b.clip(); }
  if (side && H.face < 0) { b.save(); b.scale(-1, 1); b.drawImage(spr, -dx - spr.width, dy); b.restore(); } else b.drawImage(spr, dx, dy);
  if (H.inWater) { b.restore(); b.fillStyle = 'rgba(200,240,255,.8)'; b.fillRect(Math.floor(H.x - cx) - 8, Math.floor(H.y - cy) - 2, 16, 1); }
}
function drawClouds(cx, cy, tt) {
  const b = bctx;
  if (!W.clouds.length) for (let i = 0; i < 5; i++) { const w = 70 + R() * 90, h = 30 + R() * 30, m = mk(w, h), g = m.getContext('2d'), id = g.createImageData(w, h); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const nx = (x - w / 2) / (w / 2), ny = (y - h / 2) / (h / 2); const v = 1 - (nx * nx + ny * ny) - (vnoise(x / 9, y / 9, i) - .5) * .8; if (v > bay(x, y) * .6) { const o = (y * w + x) * 4; id.data[o] = 140; id.data[o + 1] = 120; id.data[o + 2] = 150; id.data[o + 3] = 255; } } g.putImageData(id, 0, 0); W.clouds.push({ m, w, h, ox: R() * 900, oy: R() * 700 }); }
  b.globalCompositeOperation = 'multiply'; b.globalAlpha = .13 + W.rain * .2;
  const span = 900, spanY = 700;
  for (const c of W.clouds) { const x = ((c.ox + tt * 7 * W.wind - cx) % span + span) % span - 200, y = ((c.oy + tt * 1.5 - cy) % spanY + spanY) % spanY - 150; b.drawImage(c.m, Math.floor(x), Math.floor(y)); }
  b.globalAlpha = 1; b.globalCompositeOperation = 'source-over';
}
function drawCompass(cx, cy, tt) {
  if (mode !== 'play' || cine || noCompass) return;
  let next = RINGS.find(r => !r.found); const mw = mWhale(), gold = !!mw; if (gold) next = mw; if (!next) return;
  if (!gold && S.played < 25 && RINGS.every(r => !r.found)) return;
  const sx = next.x - cx, sy = next.y - cy;
  if (sx > 8 && sx < LW - 8 && sy > 8 && sy < LH - 8) return;
  const mx = LW / 2, my = LH / 2, dx = sx - mx, dy = sy - my;
  const k = Math.min((LW / 2 - 12) / Math.abs(dx || 1e-6), (LH / 2 - 14) / Math.abs(dy || 1e-6));
  const x = Math.floor(mx + dx * k), y = Math.floor(my + dy * k);
  const b = bctx, p = .6 + .4 * Math.sin(tt * 2.4);
  b.globalCompositeOperation = 'lighter'; b.globalAlpha = .55 * p; b.drawImage(gold ? GLOW.fly : GLOW.stoneS, x - (gold ? 14 : 9), y - (gold ? 14 : 9)); b.globalAlpha = 1; b.globalCompositeOperation = 'source-over';
  b.fillStyle = gold ? 'rgba(255,236,170,' + (.75 + .25 * p).toFixed(2) + ')' : 'rgba(232,248,255,' + (.75 + .25 * p).toFixed(2) + ')'; b.fillRect(x, y - 2, 1, 5); b.fillRect(x - 2, y, 5, 1); b.fillRect(x - 1, y - 1, 3, 3);
}

/* ============================== surfaces, dust, prints ============================== */
const DUSTC = [['#f6dcb4', '#e8c494'], ['#f2d6ae', '#e0be90'], ['#eed6a8', '#d8bc8c'], ['#fbf3e2', '#e9dcc2'], ['#eeb08a', '#d48e66'], ['#ead2ae', '#d6b68e'], ['#f0d6a8', '#e2be8e'], ['#ffffff', '#e8e4ee'], ['#6a5e62', '#4a4044']];
const dustCols = b => DUSTC[b] || DUSTC[0];
const PRINTC = ['150,100,60', '140,96,60', '120,96,60', '170,150,120', '140,70,44', '130,100,70', '120,90,60', '150,150,175', '24,18,20'];
function addPrint(x, y, b) { if (b == null) b = biomeAt(x, y); prints.push({ x, y, t: 0, c: PRINTC[b] || PRINTC[0] }); if (prints.length > 320) prints.shift(); }
function surfaceAt(x, y) {
  if (H.inWater) return 'water';
  if (nearRail(y, 6)) return 'rail';
  for (const L of lmsNear(x, y, 100)) {
    if (L.type === 'ghosttown' && Math.abs(x - L.x) < 79 && y > L.y && y < L.y + 8) return 'wood';
    if (L.type === 'station' && x > L.x - 14 && x < L.x + 44 && y > L.y && y < L.y + 13) return 'stone';
  }
  const b = H.biome; return b === 7 ? 'soft' : b === 8 ? 'crunch' : b === 4 ? 'stone' : b === 3 ? 'crust' : 'sand';
}
function footfall(bi) {
  const surf = surfaceAt(H.x, H.y); playStep(surf, bi || 0);
  if (H.inWater) { for (let k = 0; k < 3; k++) part(H.x + rand(-4, 4), H.y, rand(-14, 14), rand(-30, -14), .4, R() < .5 ? '#cfefff' : '#ffffff', 'drop', 140); return; }
  if (H.gait === 'walk' && [0, 3, 7, 8].includes(H.biome) && R() < .3) part(H.x - H.face * 4 + rand(-2, 2), H.y, -H.face * rand(2, 8), rand(-8, -3), .5, dustCols(H.biome)[0], 'dust', 0);
  if (H.gait === 'canter' || (H.gait === 'trot' && R() < .4)) dust(H.x - H.face * 6, H.y, H.gait === 'canter' ? 2 : 1, 1);
  if (H.biome === 6 && H.gait !== 'walk' && R() < .7) part(H.x + rand(-5, 5), H.y - 2, rand(-14, 14), rand(-26, -10), 1, pick(['#f28a2e', '#b49cf0', '#f6d24a', '#fff6ea']), 'petal', 50);
  if (surf !== 'wood' && surf !== 'rail' && surf !== 'stone') addPrint(H.x + rand(-2, 2) - H.face * 2, H.y + (prints.length & 1 ? 1 : -1), H.biome);
}

/* ============================== wild horses ============================== */
const COATS = [
  { b: '#b9b4b0', s: '#8e8986', h: '#dcd8d2', m: '#5e5a58', mh: '#7a7674', mu: '#cfc6bf', sock: '#f2eee8' },
  { b: '#3e3438', s: '#2a2226', h: '#5e5056', m: '#1c1416', mh: '#30262a', mu: '#6a5a5a', sock: '#3e3438', o: '#120a0c' },
  { b: '#e8bc6a', s: '#c99a4a', h: '#f6d898', m: '#fbf0d8', mh: '#eadcc0', mu: '#f0d2a8', sock: '#fbf0d8' },
  { b: '#f2ece2', s: '#d4cabc', h: '#ffffff', m: '#e2d8cc', mh: '#c8bcae', mu: '#f0d8cc', sock: '#ffffff' },
  { b: '#c9a678', s: '#a6845a', h: '#e2c49a', m: '#3e2c22', mh: '#5a4232', mu: '#e0c8a8', sock: '#c9a678' },
  { b: '#b8683a', s: '#94502a', h: '#d88a56', m: '#3a2418', mh: '#5a3a28', mu: '#f1c9a0', sock: '#fbefdc', pinto: true }
];
const herdCache = {}, PINTO_W = { c: hexc('#fbf3e6') };
function recolor(src, map, pinto) {
  const w = src.width, h = src.height, c = mk(w, h), g = c.getContext('2d'); g.drawImage(src, 0, 0);
  const id = g.getImageData(0, 0, w, h), d = id.data;
  for (let i = 0; i < d.length; i += 4) {
    if (!d[i + 3]) continue;
    let n = map.get(d[i] << 16 | d[i + 1] << 8 | d[i + 2]);
    if (pinto && n && n.body) { const p = i >> 2, x = p % w, y = (p / w) | 0; if (vnoise(x / 3.2, y / 3.2, 7) > .56) n = PINTO_W; }
    if (n) { d[i] = n.c[0]; d[i + 1] = n.c[1]; d[i + 2] = n.c[2]; }
  }
  g.putImageData(id, 0, 0); return c;
}
function herdSet(ci) {
  if (herdCache[ci]) return herdCache[ci];
  const co = COATS[ci], map = new Map();
  for (const k of ['b', 's', 'h', 'm', 'mh', 'mu', 'sock', 'o']) if (co[k]) { const src = hexc(HP[k]); map.set(src[0] << 16 | src[1] << 8 | src[2], { c: hexc(co[k]), body: k === 'b' || k === 's' || k === 'h' }); }
  const rc = a => a.map(s => recolor(s, map, co.pinto));
  return herdCache[ci] = { walk: rc(SPR.walk), trot: rc(SPR.trot), canter: rc(SPR.canter), idle: rc([SPR.idle[0], SPR.idle[4]]), graze: rc(SPR.graze) };
}
let herd = null, herdCD = 45, herdSndT = 0;
const SLOTS = [[-22, -15], [-24, 15], [-44, 0], [6, -22], [6, 22], [-62, -12]];
function spawnHerd() {
  const hd = Math.hypot(H.vx, H.vy) > 10 ? Math.atan2(H.vy, H.vx) : R() * TAU;
  for (let t = 0; t < 8; t++) {
    const a = hd + rand(-1, 1), d = rand(200, 250), x = H.x + Math.cos(a) * d, y = H.y + Math.sin(a) * d * .8;
    const b = biomeAt(x, y); if (![0, 1, 2, 3, 5, 6, 7].includes(b) || blocked(x, y, 10) || waterAt(x, y) || nearRail(y, 30)) continue;
    const n = 4 + (R() * 3 | 0), mem = [];
    for (let k = 0; k < n; k++) { const p = collide(x + rand(-30, 30), y + rand(-16, 16), 4.5); mem.push({ x: p.x, y: p.y, vx: 0, vy: 0, face: R() < .5 ? 1 : -1, anim: R(), coat: (R() * COATS.length) | 0, st: 'graze', stT: rand(0, 3), tx: p.x, ty: p.y, gait: 'idle', slot: k }); }
    for (const m of mem) herdSet(m.coat);
    herd = { mem, joined: false, idle: 0, t: 0, curious: 0, cx: x, cy: y, head: 0 };
    return;
  }
}
function updHerd(dt) {
  if (mode !== 'play') return;
  if (!herd) { herdCD -= dt; if (herdCD <= 0 && S.played > 45 && !cine) { spawnHerd(); herdCD = rand(70, 130); } return; }
  const h = herd; h.t += dt;
  const hs = Math.hypot(H.vx, H.vy);
  let mind = 1e9, sx = 0, sy = 0;
  for (const m of h.mem) { const d = dist(m.x, m.y, H.x, H.y); if (d < mind) mind = d; sx += m.x; sy += m.y; }
  h.cx = sx / h.mem.length; h.cy = sy / h.mem.length;
  if (mind < 90) discover('wildhorses');
  if (!h.joined) {
    if ((mind < 70 && hs > 42) || (h.curious > 0 && mind < 60 && hs > 30)) {
      h.joined = true; h.idle = 0;
      if (!S.ranHerd) { S.ranHerd = 1; toast('The herd runs with you', 'Keep going. They will follow.', entryImg('wildhorses')); }
      h.mem.forEach((m, i) => { if (i < 3) sfx.whinny(rand(1, 1.3), rand(0, .6) + i * .25, .06); });
    }
    if (h.curious > 0) h.curious -= dt;
    if (mind > 460) { herd = null; return; }
  } else {
    h.idle = hs < 10 ? h.idle + dt : 0;
    if (h.idle > 5 || cine) { h.joined = false; for (const m of h.mem) { m.st = 'graze'; m.stT = rand(1, 4); } }
  }
  if (hs > 8) h.head = Math.atan2(H.vy, H.vx);
  const ca = Math.cos(h.head), sa = Math.sin(h.head);
  let steps = 0;
  for (const m of h.mem) {
    let dvx = 0, dvy = 0, top = 14;
    if (h.joined) {
      const [ox, oy] = SLOTS[m.slot % SLOTS.length];
      const tx = H.x + ox * ca - oy * sa, ty = H.y + (ox * sa + oy * ca) * .8;
      dvx = H.vx + (tx - m.x) * 1.6; dvy = H.vy + (ty - m.y) * 1.6; top = 92;
    } else if (h.curious > 0) {
      const dx = H.x - m.x, dy = H.y - m.y, d = Math.hypot(dx, dy) || 1; if (d > 26 + m.slot * 4) { dvx = dx / d * 34; dvy = dy / d * 26; } top = 40;
    } else {
      m.stT -= dt; if (m.stT <= 0) { if (m.st === 'graze') { m.st = 'walk'; m.tx = h.cx + rand(-34, 34); m.ty = h.cy + rand(-18, 18); m.stT = rand(2, 4); } else { m.st = 'graze'; m.stT = rand(3, 7); } }
      if (m.st === 'walk') { const dx = m.tx - m.x, dy = m.ty - m.y, d = Math.hypot(dx, dy); if (d > 3) { dvx = dx / d * 12; dvy = dy / d * 9; } }
      if (mind < 34 && hs > 20) { const dx = m.x - H.x, dy = m.y - H.y, d = Math.hypot(dx, dy) || 1; dvx = dx / d * 40; dvy = dy / d * 30; m.st = 'walk'; m.stT = 1; top = 40; }
    }
    for (const o of h.mem) if (o !== m) { const dx = m.x - o.x, dy = m.y - o.y, d = Math.hypot(dx, dy); if (d < 13 && d > .01) { dvx += dx / d * (13 - d) * 6; dvy += dy / d * (13 - d) * 6; } }
    { const dx = m.x - H.x, dy = m.y - H.y, d = Math.hypot(dx, dy); if (d < 14 && d > .01) { dvx += dx / d * (14 - d) * 8; dvy += dy / d * (14 - d) * 8; } }
    const s0 = Math.hypot(dvx, dvy); if (s0 > top) { dvx *= top / s0; dvy *= top / s0; }
    const k = Math.min(1, (h.joined ? 3.2 : 2) * dt);
    m.vx += (dvx - m.vx) * k; m.vy += (dvy - m.vy) * k;
    const p = collide(m.x + m.vx * dt, m.y + m.vy * dt, 4.5);
    if (p.nx || p.ny) { const l = Math.hypot(p.nx, p.ny), ux = p.nx / l, uy = p.ny / l, vn = m.vx * ux + m.vy * uy; if (vn < 0) { m.vx -= vn * ux; m.vy -= vn * uy; } }
    m.x = p.x; m.y = p.y;
    const sp = Math.hypot(m.vx, m.vy);
    m.gait = sp < 2.5 ? 'idle' : sp < 40 ? 'walk' : sp < 64 ? 'trot' : 'canter';
    if (Math.abs(m.vx) > 3) m.face = m.vx > 0 ? 1 : -1;
    const stride = { walk: 24, trot: 32, canter: 44 }[m.gait] || 24;
    if (sp > 2.5) { const bf = m.anim; m.anim += sp * dt / stride; const beats = m.gait === 'walk' ? 4 : m.gait === 'trot' ? 2 : 3; if (Math.floor(bf * beats) !== Math.floor(m.anim * beats)) { steps++; if (m.gait === 'canter' && R() < .5) dust(m.x - m.face * 6, m.y, 1, 0, biomeAt(m.x, m.y)); if (R() < .5) addPrint(m.x - m.face * 2, m.y); } }
    else m.anim += dt * .4;
  }
  herdSndT -= dt; if (steps && herdSndT <= 0 && dist(h.cx, h.cy, H.x, H.y) < 220) { herdSndT = .09; const hd = dist(h.cx, h.cy, H.x, H.y); playHoof('sand', 'trot', .16 * (1 - hd / 240), clamp((h.cx - H.x) / 160, -.8, .8)); }
}
function drawHerdHorse(m, cx, cy) {
  const b = bctx, set = herdSet(m.coat); let spr;
  const fi = n => Math.floor((m.anim % 1 + 1) % 1 * n) % n;
  if (m.gait === 'idle') spr = (!herd.joined && m.st === 'graze') ? set.graze[Math.floor(T * 1.5 + m.slot) % 4] : set.idle[(T + m.slot * 1.3) % 6 > 5.8 ? 1 : 0];
  else spr = set[m.gait][fi(8)];
  const ax = 15, dx = Math.floor(m.x - cx) - (m.face < 0 ? spr.width - 1 - ax : ax), dy = Math.floor(m.y - cy) - HB;
  if (m.face < 0) { b.save(); b.scale(-1, 1); b.drawImage(spr, -dx - spr.width, dy); b.restore(); } else b.drawImage(spr, dx, dy);
}

/* ============================== the train ============================== */
const train = { on: false, x: 0, dir: 1, sp: 74, cars: [], cd: 18, raceT: 0, raced: false, whistled: false, chugT: 0 };
const CARDEF = [['loco', 46], ['tender', 24], ['boxcar', 38], ['passcar', 40], ['boxcar', 38], ['passcar', 40], ['caboose', 30]];
function updTrain(dt) {
  if (mode !== 'play') return;
  const near = Math.abs(H.y - RAILY) < 340;
  if (!train.on) {
    train.cd -= dt * (near ? 1 : .25);
    if (train.cd <= 0 && near && !cine) { train.on = true; train.dir = R() < .5 ? 1 : -1; train.x = H.x - train.dir * (LW / 2 + 240); train.cars = CARDEF.map(([k, w]) => ({ k, w, cx: 0 })); train.raceT = 0; train.raced = false; train.whistled = false; }
    return;
  }
  train.x += train.dir * train.sp * dt;
  let off = 0; for (const c of train.cars) { c.cx = train.x - train.dir * (off + c.w / 2); off += c.w + 2; }
  const tail = train.x - train.dir * off;
  if ((train.dir > 0 && tail > H.x + LW / 2 + 260) || (train.dir < 0 && tail < H.x - LW / 2 - 260)) { train.on = false; train.cd = rand(45, 85); return; }
  const nx = clamp(H.x, Math.min(train.x, tail), Math.max(train.x, tail)), dNear = dist(nx, RAILY, H.x, H.y);
  train.chugT -= dt; if (train.chugT <= 0) { train.chugT = .2; if (dNear < 320) sfx.chug(1 - dNear / 320); }
  if (!train.whistled && Math.abs(train.x - H.x) < LW / 2 + 60 && dNear < 260) { train.whistled = true; sfx.whistle(1); }
  if (R() < dt * 14) parts.push({ x: train.x - train.dir * 7 + rand(-1, 1), y: RAILY - 27, vx: -train.dir * rand(8, 20), vy: rand(-16, -8), life: rand(1.4, 2.2), max: 2, c: R() < .5 ? '#f2eee8' : '#d8d2cc', kind: 'smoke', g: -2, z: 0 });
  if (dNear < 190) discover('train');
  const racing = Math.hypot(H.vx, H.vy) > 64 && Math.abs(H.y - RAILY) < 80 && Math.abs(H.x - train.x) < 70 && Math.sign(H.vx) === train.dir;
  train.raceT = racing ? train.raceT + dt : Math.max(0, train.raceT - dt * .5);
  if (train.raceT > 3 && !train.raced) {
    train.raced = true; S.races = (S.races || 0) + 1; sfx.whistle(2);
    toast('The engineer tips his hat', S.races > 1 ? 'Another good race. That makes ' + S.races + '.' : 'That was a good race.', entryImg('train'));
    for (let i = 0; i < 14; i++) part(H.x + rand(-8, 8), H.y - 20, rand(-20, 20), rand(-40, -14), 1.4, pick(['#ff8fa8', '#ffd0dc', '#fff2a8']), 'heart');
  }
}

/* ============================== dust devils & falling stars ============================== */
const devils = [];
function updDevils(dt) {
  if (mode !== 'play') return;
  if (devils.length < 1 && nightAmt() < .3 && [0, 3, 7, 1].includes(H.biome) && R() < dt * .03) { const a = R() * TAU; devils.push({ x: H.x + Math.cos(a) * 170, y: H.y + Math.sin(a) * 110, vx: rand(-12, 12), vy: rand(-8, 8), t: 0, life: rand(16, 26), hit: false }); }
  for (let i = devils.length - 1; i >= 0; i--) {
    const d = devils[i]; d.t += dt;
    d.vx = clamp(d.vx + rand(-20, 20) * dt + (H.x - d.x) * .02 * dt, -22, 22); d.vy = clamp(d.vy + rand(-14, 14) * dt + (H.y - d.y) * .02 * dt, -16, 16);
    d.x += d.vx * dt; d.y += d.vy * dt;
    if (R() < dt * 16) part(d.x + rand(-4, 4), d.y, rand(-14, 14), rand(-6, -2), .6, pick(dustCols(H.biome)), 'dust', 0);
    if (!d.hit && dist(d.x, d.y, H.x, H.y) < 11) {
      d.hit = true; discover('dustdevil'); sfx.swirl();
      if (H.state !== 'hop') { setState('hop'); H.vz = 95; H.z = .1; }
      for (let k = 0; k < 26; k++) { const a = k / 26 * TAU; part(H.x + Math.cos(a) * 8, H.y - 8 + Math.sin(a) * 4, -Math.sin(a) * 40, Math.cos(a) * 20 - 10, .9, pick(dustCols(H.biome)), 'dust', 10); }
    }
    if (d.t > d.life) devils.splice(i, 1);
  }
}
let star = null, starCD = 16;
function updStar(dt) {
  if (mode !== 'play') return;
  if (star) { star.t += dt; if (star.t > star.life) star = null; return; }
  if (nightAmt() > .75) { starCD -= dt; if (starCD <= 0) { starCD = rand(14, 32); const dir = R() < .5 ? -1 : 1; star = { x: rand(LW * .15, LW * .85), y: rand(LH * .06, LH * .35), vx: dir * rand(110, 160), vy: rand(36, 60), t: 0, life: 1.6 }; } }
}
function makeWish() {
  if (!star || star.wished || mode !== 'play') return false; star.wished = true;
  const sx = cam.x + star.x + star.vx * star.t, sy = cam.y + star.y + star.vy * star.t;
  for (let i = 0; i < 18; i++) part(sx, sy, rand(-30, 30), rand(-20, 30), 1.2, pick(['#fff6c8', '#ffffff', '#cfeeff']), 'spark');
  S.wishes = (S.wishes || 0) + 1; sfx.wish();
  if (!S.found.wish) discover('wish'); else toast('You made a wish', S.wishes + ' wishes so far. Nobody has to know what they were.', entryImg('wish'));
  return true;
}

/* ============================== regions & the map ============================== */
let regT = 0, bannerT = 0, lastBanner = -99, seenT = 0, ambT = 2;
const MC = 48, mapColCache = new Map();
function checkRegion(dt) {
  regT -= dt; if (regT > 0) return; regT = .5;
  if (cardTimer > 0) return;
  const r = regionAt(H.x, H.y);
  if (r.key !== S.curRegion) {
    const first = !S.regions[r.key]; S.regions[r.key] = 1; S.curRegion = r.key;
    if (T - lastBanner > 5) { $('rgN').textContent = r.name; $('rgB').textContent = (first ? 'New place · ' : '') + BIOME_NAME[r.b]; $('region').classList.add('show'); bannerT = 3.6; lastBanner = T; if (first) sfx.discover(); }
  }
}
const MAPPAL = ['#f0c58e', '#dcbf86', '#c3c27e', '#f4ead6', '#d98e62', '#c7bd8e', '#eaa66c', '#fbf9f4', '#5c5054'];
// The map is painted once, one pixel per explored cell, into tiles. Drawing it is then just scaling those tiles.
const MT = 64, mapTiles = new Map(), regAcc = new Map();
let mapBuilt = false;
function mapCellColor(wx, wy) {
  if (Math.abs(wy - RAILY) < MC / 2) return '#6e5c54';
  for (const o of oasesNear(wx, wy, 120)) if (inEll(wx, wy, o, 18)) return '#4f9ed2';
  for (const m of mesasNear(wx, wy, 140)) if (inEll(wx, wy, m, 8)) return '#b8603e';
  if (inRiverBed(wx, wy, 4)) return S.river ? '#4f9ed2' : '#c8a07a';
  return MAPPAL[biomeAt(wx, wy)];
}
function paintCell(cx, cy) {
  const tx = Math.floor(cx / MT), ty = Math.floor(cy / MT), k = tx + ',' + ty;
  let t = mapTiles.get(k); if (!t) { const c = mk(MT, MT); t = { c, g: c.getContext('2d'), tx, ty }; mapTiles.set(k, t); }
  const wx = cx * MC + MC / 2, wy = cy * MC + MC / 2;
  t.g.fillStyle = mapCellColor(wx, wy); t.g.fillRect(cx - tx * MT, cy - ty * MT, 1, 1);
  const rg = regionAt(wx, wy); let a = regAcc.get(rg.key); if (!a) regAcc.set(rg.key, a = { n: 0, x: 0, y: 0, r: rg }); a.n++; a.x += wx; a.y += wy;
}
function buildMap() { mapTiles.clear(); regAcc.clear(); for (const k of seen) { const i = k.indexOf(','); paintCell(+k.slice(0, i), +k.slice(i + 1)); } mapBuilt = true; }
function markSeen() {
  const x0 = Math.floor((cam.x - 24) / MC), x1 = Math.floor((cam.x + LW + 24) / MC), y0 = Math.floor((cam.y - 24) / MC), y1 = Math.floor((cam.y + LH + 24) / MC);
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { const k = x + ',' + y; if (!seen.has(k)) { seen.add(k); if (mapBuilt) paintCell(x, y); } }
  const lt = trail[trail.length - 1]; if (!lt || dist(lt[0], lt[1], H.x, H.y) > 28) { trail.push([Math.round(H.x), Math.round(H.y)]); if (trail.length > 4000) trail.splice(0, 500); }
}
// view: world point at the canvas center, and canvas pixels per world pixel
const MV = { x: 0, y: 0, s: .1, dirty: false, raf: 0 };
const MAP_MIN = .012, MAP_MAX = .45;
const mapDPR = () => Math.min(window.devicePixelRatio || 1, 2);
function openMap() {
  audioInit(); markSeen(); if (!mapBuilt) buildMap();
  $('mapDlg').classList.remove('hide'); sfx.paper();
  MV.x = H.x; MV.y = H.y; MV.s = .11 * mapDPR();
  requestAnimationFrame(() => { sizeMap(); drawMap(); });
}
function closeMap() { $('mapDlg').classList.add('hide'); mapPtrs.clear(); }
function sizeMap() { const cv = $('mapC'), r = cv.getBoundingClientRect(), d = mapDPR(); const w = Math.round(r.width * d), h = Math.round(r.height * d); if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; } }
function mapDirty() { if (MV.raf) return; MV.raf = requestAnimationFrame(() => { MV.raf = 0; drawMap(); }); }
function zoomMapAt(factor, px, py) {
  // px, py in canvas pixels; keep the world point under them fixed
  const cv = $('mapC'), wx = MV.x + (px - cv.width / 2) / MV.s, wy = MV.y + (py - cv.height / 2) / MV.s;
  const d = mapDPR(); MV.s = clamp(MV.s * factor, MAP_MIN * d, MAP_MAX * d);
  MV.x = wx - (px - cv.width / 2) / MV.s; MV.y = wy - (py - cv.height / 2) / MV.s; mapDirty();
}
function drawMap() {
  const cv = $('mapC'); if ($('mapDlg').classList.contains('hide')) return; sizeMap();
  const g = cv.getContext('2d'), W2 = cv.width, H2 = cv.height, d = mapDPR(), s = MV.s; if (!W2 || !H2) return;
  g.imageSmoothingEnabled = false;
  const wx0 = MV.x - W2 / 2 / s, wy0 = MV.y - H2 / 2 / s, wx1 = wx0 + W2 / s, wy1 = wy0 + H2 / s;
  const X = wx => (wx - wx0) * s, Y = wy => (wy - wy0) * s;
  g.fillStyle = '#ead9b8'; g.fillRect(0, 0, W2, H2);
  g.fillStyle = 'rgba(140,100,60,.08)'; for (let y = 0; y < H2; y += Math.round(6 * d)) g.fillRect(0, y, W2, 1);
  // explored land
  const tw = MT * MC, tx0 = Math.floor(wx0 / tw), tx1 = Math.floor(wx1 / tw), ty0 = Math.floor(wy0 / tw), ty1 = Math.floor(wy1 / tw);
  for (let ty = ty0; ty <= ty1; ty++) for (let tx = tx0; tx <= tx1; tx++) { const t = mapTiles.get(tx + ',' + ty); if (!t) continue; const sx = Math.floor(X(tx * tw)), sy = Math.floor(Y(ty * tw)), ex = Math.floor(X((tx + 1) * tw)), ey = Math.floor(Y((ty + 1) * tw)); g.drawImage(t.c, sx, sy, ex - sx, ey - sy); }
  const seenAt = (x, y) => seen.has(Math.floor(x / MC) + ',' + Math.floor(y / MC));
  // hoofprint trail
  const ds = Math.max(1, Math.round(1.2 * d)); g.fillStyle = 'rgba(122,70,40,.6)';
  for (const [tx, ty] of trail) { if (tx < wx0 || tx > wx1 || ty < wy0 || ty > wy1) continue; g.fillRect(Math.round(X(tx)), Math.round(Y(ty)), ds, ds); }
  // icons (only when zoomed in enough to read them)
  const iconPx = clamp(s * 140, 10 * d, 30 * d), cxw = (wx0 + wx1) / 2, cyw = (wy0 + wy1) / 2, rad = Math.max(wx1 - wx0, wy1 - wy0) * .72;
  const icon = (spr, wx, wy, sz) => { if (!spr) return; const k = sz / Math.max(spr.width, spr.height), w = Math.max(1, Math.round(spr.width * k)), h = Math.max(1, Math.round(spr.height * k)); g.drawImage(spr, Math.round(X(wx) - w / 2), Math.round(Y(wy) - h * .8), w, h); };
  if (s > .03 * d) {
    for (const L of lmsNear(cxw, cyw, rad)) if (seenAt(L.x, L.y)) icon(lmIcon(L.type), L.x, L.y, iconPx);
    for (const cp of campsNear(cxw, cyw, rad)) if (seenAt(cp.x, cp.y)) icon(SPR.bottle, cp.x, cp.y, iconPx * .7);
  }
  for (const ri of RINGS) if (seenAt(ri.x, ri.y)) icon(ri.found ? SPR.centerDim : SPR.center, ri.x, ri.y, Math.max(10 * d, iconPx * .7));
  // place names, biggest first, never overlapping
  const fs = Math.round(clamp(11 * d + s * 8, 10 * d, 15 * d)); g.font = '600 ' + fs + 'px "Pixelify Sans", monospace'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round';
  const here = regionAt(H.x, H.y).key, placed = [], minN = s < .04 * d ? 30 : 4;
  for (const a of [...regAcc.values()].sort((p, q) => (q.r.key === here) - (p.r.key === here) || q.n - p.n)) {
    if (a.n < minN && a.r.key !== here) continue;
    const x = X(a.x / a.n), y = Y(a.y / a.n); if (x < -100 || y < -20 || x > W2 + 100 || y > H2 + 20) continue;
    const w = g.measureText(a.r.name).width + 10 * d, h = fs + 6 * d, box = [x - w / 2, y - h / 2, x + w / 2, y + h / 2];
    if (placed.some(p => p[0] < box[2] && p[2] > box[0] && p[1] < box[3] && p[3] > box[1])) continue;
    placed.push(box); g.lineWidth = 4 * d; g.strokeStyle = 'rgba(250,240,220,.9)'; g.strokeText(a.r.name, x, y); g.fillStyle = '#5a3424'; g.fillText(a.r.name, x, y);
  }
  // you are here
  const hx = X(H.x), hy = Y(H.y);
  g.fillStyle = '#fff6e6'; g.beginPath(); g.arc(hx, hy, 7 * d, 0, TAU); g.fill(); g.fillStyle = '#e9845a'; g.beginPath(); g.arc(hx, hy, 4.5 * d, 0, TAU); g.fill();
  if (hx < 0 || hy < 0 || hx > W2 || hy > H2) { const ax = clamp(hx, 14 * d, W2 - 14 * d), ay = clamp(hy, 14 * d, H2 - 14 * d); g.fillStyle = '#e9845a'; g.beginPath(); g.arc(ax, ay, 5 * d, 0, TAU); g.fill(); }
  $('mapTitle').textContent = regionAt(H.x, H.y).name;
  $('mapInfo').textContent = Object.keys(S.regions).length + ' places wandered · ' + ((S.dist || 0) / 1000).toFixed(1) + ' km of hoofprints';
}
// touch, mouse, trackpad
const mapPtrs = new Map(); let mapGesture = null, mapTapT = 0, mapTapP = null;
function mapLocal(e) { const r = $('mapC').getBoundingClientRect(), d = mapDPR(); return [(e.clientX - r.left) * d, (e.clientY - r.top) * d]; }
function mapStartGesture() {
  const pts = [...mapPtrs.values()];
  if (pts.length >= 2) { const [a, b] = pts; mapGesture = { kind: 'pinch', d0: Math.hypot(a[0] - b[0], a[1] - b[1]) || 1, s0: MV.s, mx: (a[0] + b[0]) / 2, my: (a[1] + b[1]) / 2, vx: MV.x, vy: MV.y }; }
  else if (pts.length === 1) mapGesture = { kind: 'pan', x0: pts[0][0], y0: pts[0][1], vx: MV.x, vy: MV.y };
  else mapGesture = null;
}
function initMapInput() {
  const cv = $('mapC');
  cv.addEventListener('pointerdown', e => { e.preventDefault(); try { cv.setPointerCapture(e.pointerId); } catch (er) {} mapPtrs.set(e.pointerId, mapLocal(e)); mapStartGesture(); cv.style.cursor = 'grabbing'; });
  cv.addEventListener('pointermove', e => {
    if (!mapPtrs.has(e.pointerId)) return; e.preventDefault(); mapPtrs.set(e.pointerId, mapLocal(e));
    const G = mapGesture; if (!G) return; const pts = [...mapPtrs.values()]; const d = mapDPR();
    if (G.kind === 'pan' && pts.length === 1) { MV.x = G.vx - (pts[0][0] - G.x0) / MV.s; MV.y = G.vy - (pts[0][1] - G.y0) / MV.s; mapDirty(); }
    else if (G.kind === 'pinch' && pts.length >= 2) {
      const [a, b] = pts, dd = Math.hypot(a[0] - b[0], a[1] - b[1]) || 1, mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
      const s1 = clamp(G.s0 * dd / G.d0, MAP_MIN * d, MAP_MAX * d), W2 = cv.width / 2, H2 = cv.height / 2;
      const wx = G.vx + (G.mx - W2) / G.s0, wy = G.vy + (G.my - H2) / G.s0;   // the world point that started under the fingers
      MV.s = s1; MV.x = wx - (mx - W2) / s1; MV.y = wy - (my - H2) / s1; mapDirty();
    }
  });
  const up = e => {
    if (!mapPtrs.has(e.pointerId)) return; const p = mapPtrs.get(e.pointerId); mapPtrs.delete(e.pointerId);
    if (!mapPtrs.size && mapGesture && mapGesture.kind === 'pan' && Math.hypot(p[0] - mapGesture.x0, p[1] - mapGesture.y0) < 8 * mapDPR()) {
      const now = performance.now(); if (now - mapTapT < 320 && mapTapP && Math.hypot(p[0] - mapTapP[0], p[1] - mapTapP[1]) < 30 * mapDPR()) { zoomMapAt(1.8, p[0], p[1]); mapTapT = 0; } else { mapTapT = now; mapTapP = p; }
    }
    mapStartGesture(); if (!mapPtrs.size) cv.style.cursor = 'grab';
  };
  cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
  cv.addEventListener('wheel', e => { e.preventDefault(); const [px, py] = mapLocal(e); const k = e.ctrlKey ? .012 : .0018; zoomMapAt(Math.exp(-e.deltaY * k), px, py); }, { passive: false });
  cv.addEventListener('touchmove', e => e.preventDefault(), { passive: false });
  $('zIn').addEventListener('click', () => { const cv2 = $('mapC'); zoomMapAt(1.6, cv2.width / 2, cv2.height / 2); });
  $('zOut').addEventListener('click', () => { const cv2 = $('mapC'); zoomMapAt(1 / 1.6, cv2.width / 2, cv2.height / 2); });
  $('zHome').addEventListener('click', () => { MV.x = H.x; MV.y = H.y; mapDirty(); });
  addEventListener('resize', () => { if (!$('mapDlg').classList.contains('hide')) mapDirty(); });
}

/* ============================== postcards ============================== */
let lastCard = null, noCompass = false;
async function makeCard(title, sub) {
  const k = clamp(Math.round(1080 / LW), 2, 6), pw = LW * k, ph = LH * k, pad = Math.round(Math.min(pw, ph) * .05), band = Math.round(Math.max(pw, ph) * .08 + 34);
  const c = mk(pw + pad * 2, ph + pad + band), g = c.getContext('2d'); g.imageSmoothingEnabled = false;
  g.fillStyle = '#fff6e6'; g.fillRect(0, 0, c.width, c.height);
  g.drawImage(buf, pad, pad, pw, ph);
  g.fillStyle = '#4a2c1f'; g.fillRect(pad - 3, pad - 3, pw + 6, 3); g.fillRect(pad - 3, pad + ph, pw + 6, 3); g.fillRect(pad - 3, pad, 3, ph); g.fillRect(pad + pw, pad, 3, ph);
  try { await document.fonts.load('600 32px "Pixelify Sans"'); } catch (e) {}
  const st = Math.round(band * .78);
  g.textBaseline = 'middle'; g.fillStyle = '#4a2c1f'; g.font = '600 ' + Math.round(band * .32) + 'px "Pixelify Sans", monospace';
  g.fillText(title, pad, pad + ph + band * .4, c.width - pad * 3 - st);
  g.fillStyle = '#8a5f45'; g.font = Math.round(band * .21) + 'px "Pixelify Sans", monospace';
  g.fillText(sub, pad, pad + ph + band * .74, c.width - pad * 3 - st);
  const sx = c.width - pad - st, sy = Math.round(pad + ph + (band - st) / 2);
  g.fillStyle = '#e9845a'; g.fillRect(sx, sy, st, st); g.fillStyle = '#fff6e6'; g.fillRect(sx + 3, sy + 3, st - 6, st - 6); g.fillStyle = '#f2c894'; g.fillRect(sx + 6, sy + 6, st - 12, st - 12);
  const hs = SPR.idle[0], f = Math.max(1, Math.floor((st - 14) / hs.width)); g.drawImage(hs, Math.round(sx + st / 2 - hs.width * f / 2), Math.round(sy + st - 7 - hs.height * f), hs.width * f, hs.height * f);
  return c;
}
async function postcard() {
  if (mode !== 'play') return;
  audioInit(); sfx.shutter();
  noCompass = true; render(); noCompass = false;
  const c = await makeCard('Greetings from ' + regionAt(H.x, H.y).name, 'Day ' + S.day + ' · ' + (S.name ? 'with ' + S.name : 'with a horse with no name'));
  lastCard = c; $('pImg').src = c.toDataURL('image/png');
  const fl = $('flash'); fl.classList.add('on'); requestAnimationFrame(() => requestAnimationFrame(() => fl.classList.remove('on')));
  setTimeout(() => $('photo').classList.remove('hide'), 260);
}
function savePostcard() { if (!lastCard) return; const a = document.createElement('a'); a.download = 'horse-postcard.png'; a.href = lastCard.toDataURL('image/png'); document.body.appendChild(a); a.click(); a.remove(); }
function sharePostcard() {
  if (!lastCard) return;
  lastCard.toBlob(async bl => {
    try { const file = new File([bl], 'horse-postcard.png', { type: 'image/png' }); if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: 'A Horse With No Name', text: 'Greetings from the desert.' }); return; } } catch (e) { if (e && e.name === 'AbortError') return; }
    savePostcard();
  }, 'image/png');
}

/* ============================== letters & landmark actions ============================== */
const LETTERS = [
  'Whoever finds this: the water at the palm groves is sweet. Drink slow, and let the horse drink first.',
  'Day three. The horse walks a little ahead of me, like it already knows the way. I think it does.',
  'I tried to give it a name today. It looked at me like I had said something silly.',
  'There is a whale asleep in the sand. Once, under a full moon, I played it a song on my harmonica. It sang back.',
  'There is a camp of cowboys who sleep all day and sing all night. Lovely voices. Terrible wine.',
  'The tall stones hum when nobody is near. When you walk up they go quiet, like shy birds.',
  'It rained this morning. The whole desert opened its eyes at once.',
  'Last night I saw fish swimming through the sand. The horse saw them too. We have not told anyone.',
  'Nine days now. I am slower than I was. The horse waits for me every single time.',
  'I am letting the horse go free. It has somewhere to be, and I think somebody to find.',
  'If you are reading this, it found you.',
  'Be good to each other. That is all the desert ever asks.'
];
const EMPTYMAIL = ['Nothing inside but a pressed desert flower.', 'Empty, except for a very small spider who seems happy here.', 'Someone left a peppermint. The horse eats it before you can say anything.', 'Just sand. Someone has written HI in it with a finger.', 'A postcard of the ocean, unsigned.'];
const PIANO_LINES = ['Nobody home. Just the old piano, playing itself.', 'The piano plays a little faster this time.', 'Somebody upstairs laughs. Then it is quiet.', 'The swinging doors creak. The piano keeps going.'];
const WAGON_LINES = ['An old quilt and a tin of beans.', 'A map of somewhere that is not here.', 'A sleeping lizard. Shh.', 'A cracked mirror. The horse looks very handsome in it.'];
function showLetter(k, txt, sign, img) {
  $('lK').textContent = k; $('lT').textContent = txt; $('lS').textContent = sign || '';
  const im = $('lImg'); if (img) { im.src = img.toDataURL(); im.style.display = 'block'; } else { im.removeAttribute('src'); im.style.display = 'none'; }
  $('letter').classList.remove('hide');
}
function closeLetter() { const was = !$('letter').classList.contains('hide'); $('letter').classList.add('hide'); if (was) afterMLetter(); }
function openLetter(L) {
  setState('paw'); H.stT = .5; sfx.paper();
  const st = S.mail[L.id];
  if (!st && S.letters < LETTERS.length) { S.letters++; S.mail[L.id] = S.letters; showLetter('Letter ' + S.letters + ' of ' + LETTERS.length, LETTERS[S.letters - 1], '— M.'); discover('mailbox'); }
  else if (st > 0) showLetter('Letter ' + st + ' of ' + LETTERS.length + ', again', LETTERS[st - 1], '— M.');
  else {
    if (!st) S.mail[L.id] = -1;
    const e = EMPTYMAIL[Math.floor(hash(L.x | 0, L.y | 0, 5) * EMPTYMAIL.length)]; showLetter('An empty mailbox', e, '');
    if (e.includes('peppermint')) setTimeout(() => { setState('graze'); H.stT = 1.5; for (let i = 0; i < 8; i++) part(H.x + H.face * 10, H.y - 16, rand(-10, 10), rand(-24, -10), 1.2, pick(['#ff8fa8', '#ffd0dc']), 'heart'); }, 400);
  }
  save(); updateHUD();
}
function lmThing() {
  const hx = H.x + H.face * 8, hy = H.y;
  for (const L of lmsNear(H.x, H.y, 140)) {
    if (dist(H.x, H.y, L.x, L.y) > L.rad + 34) continue;
    switch (L.type) {
      case 'windmill': if (dist(hx, hy, L.trough.x, L.trough.y) < 17) return { L, a: 'Drink' }; break;
      case 'ghosttown': if (dist(hx, hy, L.x, L.y + 4) < 17) return { L, a: 'Knock' }; break;
      case 'whale': if (dist(hx, hy, L.x - 46, L.y + 2) < 21) return { L, a: fullMoon() && !S.mdone && nightAmt() > .5 && S.found.harmonica ? 'Play' : 'Listen' }; break;
      case 'wagon': if (dist(hx, hy, L.x, L.y + 6) < 23) return { L, a: 'Peek' }; break;
      case 'station': if (dist(hx, hy, L.x + 28, L.y + 8) < 17) return { L, a: 'Ding' }; break;
      case 'mailbox': if (dist(hx, hy, L.x, L.y + 2) < 16) return { L, a: 'Open' }; break;
      case 'petroglyph': if (dist(hx, hy, L.x, L.y + 2) < 21) return { L, a: 'Look' }; break;
      case 'dinobones': if (dist(hx, hy, L.x + 34, L.y + 2) < 17) return { L, a: 'Sniff' }; break;
      case 'bell': if (dist(hx, hy, L.x, L.y + 5) < 18) return { L, a: 'Ring' }; break;
    }
  }
  return null;
}
function itemPop(x, y, spr) { parts.push({ x, y: y - 2, vx: 0, vy: -28, life: 1.6, max: 1.6, kind: 'item', spr, g: 22, z: 0 }); sfx.pop(); }
function burstFlock(c) {
  if (c.burst) return; c.burst = .001; sfx.flutter(); discover('wrens');
  const a0 = Math.atan2(c.y - H.y, c.x - H.x);
  for (const bd of c.birds) { const a = a0 + rand(-.9, .9); bd.vx = Math.cos(a) * rand(40, 70); bd.vy = Math.sin(a) * rand(25, 45); bd.vz = rand(30, 55); }
}
function doLM(lt) {
  const L = lt.L; H.view = 'side';
  switch (lt.a) {
    case 'Drink': setState('drink'); sfx.drink(); H.face = L.trough.x > H.x ? 1 : -1; break;
    case 'Knock': {
      setState('paw'); sfx.knock(); setTimeout(() => sfx.piano(), 300); L.knock = (L.knock || 0) + 1;
      toast('The saloon', PIANO_LINES[(L.knock - 1) % PIANO_LINES.length], entryImg('ghosttown'));
      setTimeout(() => tumbles.push({ x: L.x, y: L.y + 6, vx: rand(18, 30), z: 0, vz: 30, rot: 0 }), 900);
      for (let i = 0; i < 6; i++) setTimeout(() => part(L.x + rand(-8, 8), L.y - 14, rand(-8, 8), rand(-18, -8), 1.4, '#fff2a8', 'note'), 600 + i * 140);
      break;
    }
    case 'Listen': {
      setState('graze'); H.stT = 1; sfx.whale();
      for (let i = 0; i < 3; i++) setTimeout(() => spawnGhostAt(L.x + rand(-40, 40), L.y + rand(-30, 20), true), 400 + i * 700);
      if (!L.heard) { L.heard = 1; setTimeout(() => card('Whale bones', 'Put your ear to the sand. Somewhere down there, it is still singing.', '', 7), 1300); }
      break;
    }
    case 'Peek':
      setState('paw'); sfx.paper();
      if (!S.found.harmonica) setTimeout(() => { itemPop(L.x, L.y, SPR.harmonica); discover('harmonica'); sfx.harmonica(); }, 500);
      else { toast('Inside the wagon', pick(WAGON_LINES), entryImg('wagon')); if (R() < .5) setTimeout(() => sfx.harmonica(), 400); }
      break;
    case 'Ding':
      sfx.ding(); setState('paw');
      if (!S.found.ticket) setTimeout(() => { itemPop(L.x + 28, L.y + 6, SPR.ticket); discover('ticket'); }, 600);
      else toast('Ding!', pick(['Nobody comes. The bell is happy anyway.', 'A tumbleweed rolls by, like a customer.', 'Somewhere far off, a train whistles back.']), entryImg('station'));
      break;
    case 'Open': openLetter(L); break;
    case 'Play': startM(L); break;
    case 'Look': setState('graze'); H.stT = 1.5; showLetter('Rock drawings', 'A spiral, a fish, two hands, a sun, and a horse. Someone was here long before you. The horse looks a lot like yours.', '', SPR.glyphBig); break;
    case 'Sniff': setState('graze'); H.stT = 1.6; sfx.snort(); setTimeout(() => hint('The bones smell like very old rain.', 4), 600); break;
    case 'Ring': {
      sfx.bell(); setState('paw');
      for (let i = 0; i < 8; i++) part(L.x + rand(-6, 6), L.y - 20, rand(-16, 16), rand(-26, -10), 1.6, '#fff2a8', 'note');
      for (const c of critters) if (dist(c.x, c.y, L.x, L.y) < 220) { if (c.type === 'flock') burstFlock(c); if (c.type === 'quail') c.flee = 1.5; if (c.type === 'raven') c.vy -= 30; }
      const fl = { type: 'flock', x: L.x, y: L.y - 2, t: 0, burst: 0, birds: [] }; for (let k = 0; k < 7; k++) fl.birds.push({ x: L.x + rand(-10, 10), y: L.y + rand(-4, 4), z: rand(14, 22), vx: 0, vy: 0, vz: 0, ph: R() * 9, peck: 0 }); critters.push(fl); setTimeout(() => burstFlock(fl), 60);
      break;
    }
  }
  save();
}
function spawnGhostAt(x, y, day) { const dir = R() < .5 ? 1 : -1, n = 3 + (R() * 3 | 0), school = []; for (let k = 0; k < n; k++) school.push({ ox: rand(-12, 12), oy: rand(-7, 7), ph: R() * TAU }); ghosts.push({ type: R() < .2 ? 'jelly' : 'fish', x, y, vx: dir * 14, vy: rand(-2, 2), t: 0, life: 9, school, dir, day }); }
function drawLMFlat(L, cx, cy, tt) {
  const b = bctx, x = Math.floor(L.x - cx), y = Math.floor(L.y - cy);
  if (x < -130 || x > LW + 130 || y < -90 || y > LH + 90) return;
  switch (L.type) {
    case 'windmill': { const tx = Math.floor(L.trough.x - cx), ty = Math.floor(L.trough.y - cy); b.fillStyle = 'rgba(120,80,50,.25)'; ellipseFill(b, tx, ty + 4, 14, 3); b.fillStyle = '#6a4630'; b.fillRect(tx - 10, ty - 2, 20, 5); b.fillStyle = '#4fa6d8'; b.fillRect(tx - 8, ty - 1, 16, 2); b.fillStyle = '#a6e0f5'; b.fillRect(tx - 7 + ((tt * 3 | 0) % 12), ty - 1, 2, 1); b.fillStyle = '#8a5e3e'; b.fillRect(tx - 10, ty - 2, 20, 1); break; }
    case 'ghosttown': { b.fillStyle = '#8a6040'; b.fillRect(x - 78, y + 1, 156, 6); b.fillStyle = '#a87a52'; for (let k = -78; k < 78; k += 4) b.fillRect(x + k, y + 1, 3, 6); b.fillStyle = '#6a4630'; b.fillRect(x - 78, y + 7, 156, 1); break; }
    case 'whale': { b.fillStyle = 'rgba(90,60,40,.16)'; ellipseFill(b, x, y + 1, 54, 9); for (let k = -36; k <= 42; k += 4) { const yy = y - 1 + Math.round(Math.sin(k / 18)); b.fillStyle = '#e6dcc4'; b.fillRect(x + k, yy, 3, 2); b.fillStyle = '#b8a888'; b.fillRect(x + k, yy + 2, 3, 1); } break; }
    case 'station': { b.fillStyle = '#b8b0a4'; b.fillRect(x - 14, y + 1, 58, 12); b.fillStyle = '#a49c90'; for (let k = 0; k < 58; k += 10) b.fillRect(x - 14 + k, y + 1, 1, 12); b.fillStyle = '#cfc8bc'; b.fillRect(x - 14, y + 1, 58, 1); break; }
    case 'dinobones': {
      const bo = '#e6dcc4', sh = '#b8a888'; b.fillStyle = 'rgba(90,60,40,.14)'; ellipseFill(b, x - 6, y + 2, 46, 10);
      for (let k = 0; k <= 60; k++) { const t = k / 60, px = x + 30 - t * 74, py = y + Math.sin(t * 5) * 4 * (1 - t * .4); b.fillStyle = k % 3 ? bo : sh; b.fillRect(Math.floor(px), Math.floor(py), 2, 2); }
      b.fillStyle = bo; for (let k = 0; k < 7; k++) { const px = x - 4 - k * 4; b.fillRect(px, y - 6, 1, 5); b.fillRect(px, y + 3, 1, 5); }
      b.fillRect(x - 10, y + 6, 1, 8); b.fillRect(x - 24, y + 6, 1, 8); b.fillRect(x - 10, y - 12, 1, 7); b.fillRect(x - 24, y - 12, 1, 7); break;
    }
    case 'wagon': { b.fillStyle = 'rgba(90,50,30,.16)'; ellipseFill(b, x, y + 1, 22, 4); break; }
    case 'bell': { b.fillStyle = 'rgba(90,50,30,.16)'; ellipseFill(b, x, y + 1, 14, 3); break; }
  }
}
function pxLine(b, x0, y0, x1, y1) { x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1); const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1; let e = dx + dy; for (let i = 0; i < 64; i++) { b.fillRect(x0, y0, 1, 1); if (x0 === x1 && y0 === y1) break; const e2 = 2 * e; if (e2 >= dy) { e += dy; x0 += sx; } if (e2 <= dx) { e += dx; y0 += sy; } } }
function drawBlades(hx, hy) {
  const b = bctx, ang = T * (.6 + W.wind * .7);
  b.fillStyle = '#b8b0a0'; pxLine(b, hx, hy, hx + 11, hy - 1); b.fillRect(hx + 10, hy - 3, 3, 5);
  for (let k = 0; k < 10; k++) { const a = ang + k / 10 * TAU; b.fillStyle = k & 1 ? '#d8d0c0' : '#a8a090'; pxLine(b, hx + Math.cos(a) * 3, hy + Math.sin(a) * 3, hx + Math.cos(a) * 10, hy + Math.sin(a) * 10); }
  b.fillStyle = '#4a3a30'; b.fillRect(hx - 1, hy - 1, 3, 3);
}

/* ============================== the secret: M. comes back ============================== */
// Twelve letters, M.'s harmonica and M.'s ticket. Then every night has a full moon,
// and if you play the harmonica at the whale bones, M. walks back over the dunes.
const M13 = () => 'You took good care of it. I could tell by the way it walked up to me, slow, like there was nowhere else it would rather be. I never gave it a name. I think it was waiting to hear one from you.';
const fullMoon = () => !!S.mready;
let mCheckT = 1, mWhaleL = null, mWhaleT = 0, mCard = null, mAfter = false;
function checkM(dt) {
  mCheckT -= dt; if (mCheckT > 0) return; mCheckT = 1;
  if (S.mready || cine || cardTimer > 0) return;
  if (S.letters >= LETTERS.length && S.found.harmonica && S.found.ticket) {
    S.mready = 1; save();
    card('Something is different', 'You have everything M. left behind. Twelve letters, a harmonica, and a ticket. From now on, the moon comes up full.', 'M. once wrote about playing a song to a whale.', 11);
    sfx.wish();
  }
}
function mWhale() {
  if (!fullMoon() || S.mdone || nightAmt() < .5) return null;
  if (T - mWhaleT > 4 || !mWhaleL) { mWhaleT = T; let best = null, bd = 1e9; for (const L of lmsNear(H.x, H.y, 2600)) if (L.type === 'whale') { const d = dist(L.x, L.y, H.x, H.y); if (d < bd) { bd = d; best = L; } } mWhaleL = best; }
  return mWhaleL;
}
function startM(L) {
  const sx = L.x - 46, sy = L.y + 2;
  cine = { kind: 'm', t: 0, lock: true, L, sx, sy, hx0: H.x, hy0: H.y, meet: { x: sx + 6, y: sy + 30 }, m: { x: L.x + 150, y: sy + 46, a: 0, f: 0, face: -1, vis: false, wk: 0 }, step: 0 };
  H.target = null; H.vx = H.vy = 0; setState('free'); H.face = -1; H.view = 'side';
  W.rainTarget = 0; W.rain = 0; hideCard();
  sfx.mSong();
}
function walkM(m, tx, ty, sp, dt) {
  const dx = tx - m.x, dy = ty - m.y, d = Math.hypot(dx, dy);
  if (d > 1) { m.x += dx / d * Math.min(d, sp * dt); m.y += dy / d * Math.min(d, sp * dt); m.face = dx < 0 ? -1 : 1; m.wk += dt * 3.2; m.f = 1 + ((m.wk | 0) & 1); return false; }
  m.f = 0; return true;
}
function mSay(t, secs) { card('M.', t, '', secs || 4.4); }
function updM(dt) {
  const c = cine, m = c.m; c.t += dt;
  if (S.hour > 4 && S.hour < 21.5) S.hour = 22.5;
  if (c.t < 9 && R() < dt * 5) part(c.sx + rand(-3, 3), c.sy - 14, rand(-6, 6), rand(-16, -8), 1.8, pick(['#fff2a8', '#cfeeff']), 'note');
  if (c.t > 1.5 && c.t < 30 && ghosts.length < 12 && R() < dt * 2) spawnGhostAt(c.L.x + rand(-100, 100), c.L.y + rand(-60, 40), false);
  if (c.step < 2 && c.t > 1.2) H.target = dist(H.x, H.y, c.meet.x, c.meet.y) > 3 ? { x: c.meet.x, y: c.meet.y } : null;
  if (c.step === 0 && c.t > 3.5) { c.step = 1; ghosts.push({ type: 'whale', x: c.L.x - 80, y: c.L.y - 14, vx: 5.5, vy: -.5, t: 0, life: 34, school: [{ ox: 0, oy: 0, ph: 0 }], dir: 1 }); sfx.whale(); }
  if (c.step === 1 && c.t > 7) { c.step = 2; m.vis = true; }
  if (m.vis && c.step < 5) m.a = Math.min(1, m.a + dt * .45);
  if (c.step === 2) { H.target = null; H.face = 1; const done = walkM(m, c.meet.x + 28, c.meet.y, 18, dt); if (done || c.t > 17) { c.step = 3; c.t3 = c.t; } }
  if (c.step === 3) { H.target = { x: m.x - 14, y: m.y }; m.face = -1; m.f = 0; if (c.t - c.t3 > 1.8 || dist(H.x, H.y, m.x - 14, m.y) < 3) { c.step = 4; c.t4 = c.t; H.target = null; H.vx = H.vy = 0; H.face = 1; m.f = 3; sfx.whinny(1.05, 0, .12); for (let i = 0; i < 16; i++) part((H.x + m.x) / 2 + rand(-6, 6), H.y - 20, rand(-14, 14), rand(-30, -10), 1.8, pick(['#ff8fa8', '#ffd0dc', '#fff2a8']), 'heart'); mSay('There you are.'); } }
  if (c.step === 4) {
    const e = c.t - c.t4; H.face = 1;
    if (e > 1.3 && !c.shot) { c.shot = 1; snapM(); }
    if (e > 2.5 && e < 3) m.f = 0;
    if (e > 4.8 && !c.l2) { c.l2 = 1; m.f = 3; mSay('You found somebody. I knew you would.'); }
    if (e > 9.6 && !c.l3) { c.l3 = 1; m.f = 0; mSay(S.name ? S.name + '. That is a good name. I never could pick one.' : 'Still no name? Let them give you one. That was always theirs to do.', 5); }
    if (e > 15) { c.step = 5; c.t5 = c.t; mSay('Go on, now. Be good to each other.', 4.6); }
  }
  if (c.step === 5) {
    const e = c.t - c.t5;
    if (e > 1.6) H.target = dist(H.x, H.y, c.hx0, c.hy0) > 4 ? { x: c.hx0, y: c.hy0 } : null;
    if (e > 2.6) { walkM(m, c.L.x + 260, c.L.y - 100, 13, dt); m.a = Math.max(0, m.a - dt * .17); }
    if (e > 9.5) endM();
  }
  if (m.vis && m.a > .1 && R() < dt * 12) part(m.x + rand(-4, 4), m.y - rand(2, 22), rand(-4, 4), rand(-10, -4), 1.2, pick(['#e4f2ff', '#b4cff0', '#ffffff']), 'spark');
}
function endM() {
  cine = null; H.target = null; S.mdone = 1; save(); discover('rider');
  setTimeout(() => { showLetter('Letter 13', M13(), '— M.'); mAfter = true; }, 700);
}
async function snapM() {
  noCompass = true; render(); noCompass = false;
  mCard = await makeCard('Greetings from the Whale Bones', 'Day ' + S.day + ' · the night M. came back');
  try { const s = mk(Math.round(mCard.width / 2), Math.round(mCard.height / 2)), g = s.getContext('2d'); g.drawImage(mCard, 0, 0, s.width, s.height); localStorage.setItem('hwnn_mcard', s.toDataURL('image/jpeg', .85)); } catch (e) {}
}
function afterMLetter() {
  if (!mAfter) return; mAfter = false; if (!mCard) return;
  lastCard = mCard; $('pImg').src = mCard.toDataURL('image/png');
  setTimeout(() => { $('photo').classList.remove('hide'); toast('A postcard for you', 'It is in your journal, under The Rider.', entryImg('rider')); }, 300);
}
function drawMFig(cx, cy) {
  const c = cine, m = c.m, b = bctx, spr = SPR.mfig[m.f] || SPR.mfig[0];
  const dx = Math.floor(m.x - cx) - (spr.width >> 1), dy = Math.floor(m.y - cy) - spr.height + 1;
  b.globalAlpha = m.a * .92;
  if (m.face < 0) { b.save(); b.scale(-1, 1); b.drawImage(spr, -dx - spr.width, dy); b.restore(); } else b.drawImage(spr, dx, dy);
  b.globalAlpha = 1;
}

/* ============================== journal UI ============================== */
let jTab = 'plants', jSel = null;
const TABS = [['plants', 'Plants'], ['birds', 'Birds'], ['creatures', 'Creatures'], ['rocks', 'Rocks'], ['things', 'Things'], ['places', 'Places'], ['letters', 'Letters'], ['stones', 'Stones']];
function openJournal() {
  audioInit(); $('journal').classList.remove('hide'); renderJournal();
}
function closeJournal() { $('journal').classList.add('hide'); }
function renderJournal() {
  $('jTitle').textContent = S.name ? S.name + "'s journal" : 'Journal';
  const tabs = $('jtabs'); tabs.innerHTML = '';
  for (const [k, l] of TABS) { const bt = document.createElement('button'); bt.textContent = l + (k === 'stones' ? ' ' + RINGS.filter(r => r.found).length + '/9' : k === 'letters' ? ' ' + (S.letters + (S.mdone ? 1 : 0)) + '/' + LETTERS.length : ' ' + ENTRIES.filter(e => e[0] === k && S.found[e[1]]).length + '/' + ENTRIES.filter(e => e[0] === k).length); bt.className = k === jTab ? 'on' : ''; bt.onclick = () => { jTab = k; jSel = null; renderJournal(); }; tabs.appendChild(bt); }
  const body = $('jbody'); body.innerHTML = '';
  if (jTab === 'stones') {
    const m = document.createElement('div'); m.className = 'mem';
    RINGS.forEach((r, i) => { const d = document.createElement('div'); if (r.found) { d.innerHTML = '<i>STONE ' + (i + 1) + '</i>'; d.appendChild(document.createTextNode(LINES[i])); } else { d.className = 'no'; d.innerHTML = '<i>STONE ' + (i + 1) + '</i>Still humming somewhere. Follow the little glint at the edge of your view.'; } m.appendChild(d); });
    body.appendChild(m);
    $('jHint').textContent = S.name ? 'Every stone found. The river runs again.' : 'Nine stones hum in the desert. They remember something.';
    return;
  }
  if (jTab === 'letters') {
    const m = document.createElement('div'); m.className = 'mem';
    for (let i = 0; i < LETTERS.length; i++) { const d = document.createElement('div'); if (i < S.letters) { d.className = 'let'; d.innerHTML = '<i>LETTER ' + (i + 1) + '</i>'; d.appendChild(document.createTextNode(LETTERS[i] + ' — M.')); } else { d.className = 'no'; d.innerHTML = '<i>LETTER ' + (i + 1) + '</i>Still waiting in a mailbox somewhere. Look for a little red flag.'; } m.appendChild(d); }
    if (S.mdone) { const d = document.createElement('div'); d.className = 'let'; d.innerHTML = '<i>LETTER 13</i>'; d.appendChild(document.createTextNode(M13() + ' — M.')); m.appendChild(d); }
    body.appendChild(m); $('jHint').textContent = 'Letters from someone called M., left in lonely mailboxes.'; return;
  }
  const grid = document.createElement('div'); grid.className = 'grid';
  for (const e of ENTRIES.filter(x => x[0] === jTab)) {
    const id = e[1], known = !!S.found[id];
    const bt = document.createElement('button'); bt.className = 'ent' + (known ? '' : ' unk') + (jSel === id ? ' sel' : '');
    bt.innerHTML = '<img alt="" src="' + entryImg(id) + '"><div class="n"></div>'; bt.querySelector('.n').textContent = known ? e[2] : '???';
    bt.onclick = () => { jSel = id; renderJournal(); };
    grid.appendChild(bt);
  }
  body.appendChild(grid);
  const det = document.createElement('div'); det.id = 'jdet';
  if (jSel) { const e = ENT[jSel]; if (S.found[jSel]) { det.innerHTML = '<b></b><span></span>'; det.querySelector('b').textContent = e.name; det.querySelector('span').textContent = e.text; if (jSel === 'rider') { try { const u = localStorage.getItem('hwnn_mcard'); if (u) { const im = document.createElement('img'); im.src = u; im.alt = 'Postcard from the night M. came back'; im.style.cssText = 'display:block;width:100%;margin-top:10px;image-rendering:pixelated;box-shadow:0 0 0 2px #8a5f45'; det.appendChild(im); } } catch (er) {} } } else { det.innerHTML = '<b>Not found yet</b><span></span>'; det.querySelector('span').textContent = 'Hint: ' + e.hint; } }
  else det.textContent = 'Tap an entry to read about it.';
  body.appendChild(det);
  $('jHint').textContent = jTab === 'places' ? Object.keys(S.regions).length + ' places wandered · ' + ((S.dist || 0) / 1000).toFixed(1) + ' km · ' + (S.races || 0) + ' train races · ' + (S.wishes || 0) + ' wishes' : 'Everything you have met out here.';
}

/* ============================== input ============================== */
const DIRK = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyW', 'KeyA', 'KeyS', 'KeyD']);
const OVERLAYS = ['journal', 'mapDlg', 'letter', 'photo'];
const anyOverlay = () => OVERLAYS.some(id => !$(id).classList.contains('hide'));
function closeAll() { closeJournal(); closeMap(); closeLetter(); $('photo').classList.add('hide'); }
addEventListener('keydown', e => {
  if (!$('nameDlg').classList.contains('hide')) { if (e.code === 'Enter') confirmName(); return; }
  if (DIRK.has(e.code) || e.code === 'Space') e.preventDefault();
  if (mode === 'title') { if (!e.repeat && (e.code === 'Space' || e.code === 'Enter' || DIRK.has(e.code))) begin(); return; }
  if (e.code === 'Escape') { closeAll(); return; }
  if (!e.repeat && e.code === 'KeyJ') { if (!$('journal').classList.contains('hide')) closeJournal(); else { closeAll(); openJournal(); } return; }
  if (!e.repeat && e.code === 'KeyM') { if (!$('mapDlg').classList.contains('hide')) closeMap(); else { closeAll(); openMap(); } return; }
  if (!$('mapDlg').classList.contains('hide')) { const cv = $('mapC'), st = 60 / MV.s * mapDPR(); if (e.key === '+' || e.key === '=') zoomMapAt(1.4, cv.width / 2, cv.height / 2); else if (e.key === '-' || e.key === '_') zoomMapAt(1 / 1.4, cv.width / 2, cv.height / 2); else if (e.code === 'ArrowLeft' || e.code === 'KeyA') { MV.x -= st; mapDirty(); } else if (e.code === 'ArrowRight' || e.code === 'KeyD') { MV.x += st; mapDirty(); } else if (e.code === 'ArrowUp' || e.code === 'KeyW') { MV.y -= st; mapDirty(); } else if (e.code === 'ArrowDown' || e.code === 'KeyS') { MV.y += st; mapDirty(); } else if (e.code === 'Digit0' || e.code === 'KeyC') { MV.x = H.x; MV.y = H.y; mapDirty(); } return; }
  if (anyOverlay()) { if (!e.repeat && (e.code === 'Space' || e.code === 'Enter') && !$('letter').classList.contains('hide')) closeLetter(); return; }
  audioInit();
  if (DIRK.has(e.code)) { input.keys.add(e.code); H.target = null; }
  if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') input.run = true;
  if (e.repeat) return;
  if (e.code === 'Space' || e.code === 'KeyE' || e.code === 'Enter') { if (!makeWish()) action(); }
  if (e.code === 'KeyH' || e.code === 'KeyQ') whinny();
  if (e.code === 'KeyP') postcard();
});
addEventListener('keyup', e => { input.keys.delete(e.code); if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') input.run = false; });
addEventListener('blur', () => { input.keys.clear(); input.run = false; input.x = input.y = 0; $('stick').classList.add('hide'); ptr = null; });
let ptr = null;
canvas.addEventListener('pointerdown', e => {
  if (mode === 'title') { begin(); return; }
  if (ptr) return;
  audioInit(); e.preventDefault();
  ptr = { id: e.pointerId, sx: e.clientX, sy: e.clientY, cx: e.clientX, cy: e.clientY, t: performance.now(), moved: false, mouse: e.pointerType === 'mouse', steer: false };
  try { canvas.setPointerCapture(e.pointerId); } catch (er) {}
});
canvas.addEventListener('pointermove', e => {
  if (!ptr || e.pointerId !== ptr.id) return;
  const dx = e.clientX - ptr.sx, dy = e.clientY - ptr.sy, d = Math.hypot(dx, dy);
  ptr.cx = e.clientX; ptr.cy = e.clientY;
  if (ptr.mouse) { if (d > 8) ptr.steer = true; return; }
  if (!ptr.moved && d > 12) { ptr.moved = true; H.target = null; const st = $('stick'); st.style.left = ptr.sx + 'px'; st.style.top = ptr.sy + 'px'; st.classList.remove('hide'); }
  if (ptr.moved) { const R0 = 44, k = Math.min(1, d / R0); input.x = dx / (d || 1) * k; input.y = dy / (d || 1) * k; $('knob').style.transform = 'translate(' + (dx / (d || 1) * Math.min(d, R0)) + 'px,' + (dy / (d || 1) * Math.min(d, R0)) + 'px)'; }
});
function ptrEnd(e) {
  if (!ptr || e.pointerId !== ptr.id) return;
  if (ptr.steer) { H.target = null; ptr = null; return; }
  if (!ptr.moved && performance.now() - ptr.t < 400 && mode === 'play' && !(cine && cine.lock)) {
    const r = canvas.getBoundingClientRect(); const dpr = CW / r.width;
    const lx = ((e.clientX - r.left) * dpr - OX) / SC, ly = ((e.clientY - r.top) * dpr - OY) / SC;
    const wx = cam.x + lx, wy = cam.y + ly;
    if (makeWish()) {}
    else if (dist(wx, wy, H.x, H.y - 12) < 14) whinny();
    else { H.target = { x: wx, y: wy }; for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; part(wx + Math.cos(a) * 3, wy + Math.sin(a) * 2, Math.cos(a) * 10, Math.sin(a) * 6, .5, '#fff6e0'); } }
  }
  ptr = null; input.x = input.y = 0; $('stick').classList.add('hide'); $('knob').style.transform = '';
}
canvas.addEventListener('pointerup', ptrEnd); canvas.addEventListener('pointercancel', ptrEnd);
addEventListener('contextmenu', e => e.preventDefault());
for (const ev of ['gesturestart', 'gesturechange', 'gestureend']) document.addEventListener(ev, e => e.preventDefault(), { passive: false });
document.addEventListener('touchmove', e => { if (e.target === canvas) e.preventDefault(); }, { passive: false });
addEventListener('resize', resize);
$('actBtn').addEventListener('click', action);
$('whinBtn').addEventListener('click', whinny);
$('card').addEventListener('click', hideCard);
$('journalBtn').addEventListener('click', openJournal);
$('jClose').addEventListener('click', closeJournal);
$('journal').addEventListener('click', e => { if (e.target === $('journal')) closeJournal(); });
$('muteBtn').addEventListener('click', () => { audioInit(); setMute(!muted); });
$('nameOk').addEventListener('click', confirmName);
$('mapBtn').addEventListener('click', () => { closeAll(); openMap(); });
$('camBtn').addEventListener('click', postcard);
$('mapClose').addEventListener('click', closeMap);
$('mapDlg').addEventListener('click', e => { if (e.target === $('mapDlg')) closeMap(); });
initMapInput();
$('lOk').addEventListener('click', closeLetter);
$('letter').addEventListener('click', e => { if (e.target === $('letter')) closeLetter(); });
$('pClose').addEventListener('click', () => $('photo').classList.add('hide'));
$('pSave').addEventListener('click', savePostcard);
$('pShare').addEventListener('click', sharePostcard);
if (!navigator.share) $('pShare').style.display = 'none';
addEventListener('visibilitychange', () => { if (document.hidden && mode === 'play') save(); });
addEventListener('pagehide', () => { if (mode === 'play') save(); });
let resetArm = 0;
$('resetBtn').addEventListener('click', () => {
  const bt = $('resetBtn');
  if (performance.now() - resetArm > 3000) { resetArm = performance.now(); bt.textContent = 'Tap again to forget everything'; setTimeout(() => { bt.textContent = 'Start over'; }, 3000); return; }
  store.clear(); location.reload();
});
$('beginBtn').addEventListener('click', e => { e.stopPropagation(); begin(); });
$('title').addEventListener('pointerdown', e => { if (e.target.tagName !== 'BUTTON') begin(); });

function begin() {
  if (mode !== 'title') return;
  audioInit(); mode = 'play';
  $('title').classList.add('hide'); ['hud', 'topR', 'btmR', 'btmL'].forEach(id => $(id).classList.remove('hide'));
  S.curRegion = regionAt(H.x, H.y).key; S.regions[S.curRegion] = 1; H.biome = biomeAt(H.x, H.y); markSeen();
  updateHUD();
  const first = S.played < 2;
  if (first) {
    setTimeout(() => card('Day 1', 'No map and no hurry. Just you, the sand, and a horse who does not have a name yet.', '', 7), 500);
    setTimeout(() => hint(isTouch ? 'Drag anywhere to wander, or tap a spot to walk there. Keep going to speed up. Tap the horse to say hello.' : 'Arrow keys or WASD to wander. Keep holding to speed up. Space to interact, H to whinny, J journal, M map, P postcard.', 9), 8200);
  } else card('Welcome back', S.name ? S.name + ' is glad to see you.' : 'The horse is glad to see you.', '', 4);
  W.nextRain = S.rainSeen ? rand(200, 360) : 9999;
}

/* ============================== loop & boot ============================== */
let last = performance.now();
function frame(now) {
  requestAnimationFrame(frame);
  let dt = (now - last) / 1000; last = now; if (dt > .1) dt = .1; if (dt <= 0) return;
  const n = Math.ceil(dt / (1 / 90)), h = dt / n;
  for (let i = 0; i < n; i++) update(h);
  render();
}
resize();
buildSprites(); buildGlows(); placeRings();
const had = load();
if (had) { $('beginBtn').textContent = 'Continue'; $('titleNote').textContent = S.name ? 'With ' + S.name : 'Best with sound on'; }
cam.x = H.x - LW / 2; cam.y = H.y - LH / 2 - LH * titleOff();
setMute(muted); updateHUD();
if (new URLSearchParams(location.search).has('og')) { $('titleNote').style.display = 'none'; $('beginBtn').parentElement.style.display = 'none'; S.hour = +new URLSearchParams(location.search).get('og') || 17.6; }
window.__hw = { get AC() { return AC; }, AMB, get mus() { return mus; }, padS, HOOF, mTest: () => { S.letters = 12; S.found.harmonica = true; S.found.ticket = true; }, get mCine() { return cine; }, mWhale,  drawMap, MV, zoomMapAt, buildMap, get mapTiles() { return mapTiles; }, get herd() { return herd; }, train, lms: (x, y, r) => lmsNear(x, y, r), regionAt, biomeAt, postcard, openMap, drawMap, makeWish, setStar: v => { star = v; }, devils, spawnHerd, seen, camps: (x, y, r) => campsNear(x, y, r), SPR, H, S, RINGS, input, update, render, begin, action, whinny, activateRing, critters, W, get mode() { return mode; }, get cine() { return cine; }, confirmName, discover, spawnGhost, set hour(v) { S.hour = v; } };
requestAnimationFrame(t => { last = t; requestAnimationFrame(frame); });
})();
