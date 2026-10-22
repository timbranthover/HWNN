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
}

/* ============================== world ============================== */
const CHS = 128;
const riverY = x => 150 + 80 * Math.sin(x / 330) + 30 * Math.sin(x / 127 + 2.1);
const riverHW = x => 9 + 3 * Math.sin(x / 210 + 1);
const inRiverBed = (x, y, pad) => Math.abs(y - riverY(x)) < riverHW(x) + (pad || 0);
function biomeAt(x, y) {
  const r = fbm(x / 420, y / 420, 3), b = fbm(x / 560, y / 560, 11), m = fbm(x / 380, y / 380, 29);
  if (r > .64) return 4;      // red rock
  if (b < .37) return 0;      // dunes
  if (b > .66) return 3;      // salt flats
  if (m > .58) return 2;      // lush scrub
  return 1;                   // scrub
}
const BIOME_NAME = ['dunes', 'scrub', 'blooming scrub', 'salt flats', 'red rock'];

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
    const ok = !inRiverBed(x, y, 50) && dist(x, y, 0, 0) > 300 && !nearRing(x, y, 90) && dist(x, y, FIXED_OASIS.x, FIXED_OASIS.y) > 300;
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
    const ok = !inRiverBed(x, y, 60) && dist(x, y, 0, 0) > 170 && !nearRing(x, y, 110) && oasesNear(x, y, 140).every(o => dist(x, y, o.x, o.y) > 130);
    if (ok) m = { x, y, rx: w / 2 - 1, ry: top / 2, w, top, cliff, seed: gx * 97 + gy * 13, spr: null };
  }
  mesaCache.set(k, m); return m;
}
function mesasNear(x, y, r) { const out = []; const x0 = Math.floor((x - r) / MCELL), x1 = Math.floor((x + r) / MCELL), y0 = Math.floor((y - r) / MCELL), y1 = Math.floor((y + r) / MCELL); for (let gy = y0; gy <= y1; gy++) for (let gx = x0; gx <= x1; gx++) { const m = mesaCell(gx, gy); if (m) out.push(m); } return out; }

// a camp where some cowboys had a long night
const CCELL = 900, campCache = new Map();
function campOk(x, y) { return !inRiverBed(x, y, 40) && !nearRing(x, y, 110) && oasesNear(x, y, 160).every(o => dist(x, y, o.x, o.y) > 120) && mesasNear(x, y, 160).every(m => !inEll(x, y, m, 44)) && dist(x, y, 0, 0) > 200; }
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
function blocked(x, y, pad) {
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
  log: { r: 0, disc: 'petlog' }, cowboyA: { r: 7, sh: 12 }, cowboyB: { r: 6, sh: 9 }, bottle: { r: 1.5, sh: 2 }, bottleS: { r: 0 }, guitar: { r: 0 }, tuft: { r: 0 }, dig: { r: 0 }, palm: { r: 3, disc: 'palm', sh: 8 }, reed: { r: 0 }
};
const TABLE = [
  [['tuft', .3], ['sage', .16], ['shell', .12], ['skull', .07], ['barrel', .1], ['dig', .14], ['saguaro', .06]],
  [['saguaro', .2], ['prickly', .14], ['barrel', .1], ['sage', .24], ['ocotillo', .07], ['rockS', .12], ['dig', .05], ['tuft', .08]],
  [['saguaro', .14], ['prickly', .18], ['marigold', .26], ['sage', .16], ['ocotillo', .1], ['barrel', .07], ['tuft', .06], ['dig', .03]],
  [['rockS', .22], ['skull', .08], ['rose', .16], ['dig', .2], ['log', .1], ['tuft', .14], ['obsidian', .05]],
  [['hoodoo', .2], ['rockB', .24], ['rockS', .18], ['obsidian', .09], ['ocotillo', .07], ['log', .07], ['dig', .12]]
];
const DENS = [4, 6, 8, 3, 6];
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
    if (blocked(x, y, d.r ? 6 : 2)) continue;
    if (x * x + y * y < 46 * 46) continue;
    ch.objs.push(mkObj(kind, x, y, v, cx + ',' + cy + ',' + i));
  }
  for (const f of FIXED) if (Math.floor(f.x / CHS) === cx && Math.floor(f.y / CHS) === cy) ch.objs.push(mkObj(f.kind, f.x, f.y, f.v || 0, 'f' + f.x + ',' + f.y));
  for (const o of oasesNear(x0 + 64, y0 + 64, 200)) { for (const p of [...o.palms, ...o.reeds, ...o.flowers]) if (Math.floor(p.x / CHS) === cx && Math.floor(p.y / CHS) === cy) ch.objs.push(mkObj(p.kind, p.x, p.y, 0, 'o' + Math.round(p.x) + ',' + Math.round(p.y))); }
  for (const cp of campsNear(x0 + 64, y0 + 64, 200)) for (const p of cp.items) if (Math.floor(p.x / CHS) === cx && Math.floor(p.y / CHS) === cy) { const o = mkObj(p.kind, p.x, p.y, 0, 'c' + Math.round(p.x) + ',' + Math.round(p.y)); o.camp = cp; ch.objs.push(o); }
  ch.objs = ch.objs.filter(o => !(o.kind === 'dig' && S.dug[o.id]));
  return ch;
}
function mkObj(kind, x, y, v, id) {
  const o = { kind, x, y, v, id, r: DEF[kind].r, disc: DEF[kind].disc || null, t: R() * 10 };
  switch (kind) {
    case 'saguaro': o.spr = SPR.sag[v % SPR.sag.length]; break;
    case 'sage': o.spr = SPR.sage[v % 3]; break;
    case 'tuft': o.spr = SPR.tuft[v % 3]; break;
    case 'marigold': o.spr = SPR.marigold; break;
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
  bed: ['#cfa67e', '#dcb994', '#b28962', '#9a7a62'].map(hexc)
};
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
  const pals = [PAL.dunes, PAL.scrub, PAL.lush, PAL.flats, PAL.rock];
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
      if (b === 0) { const n = vnoise(wx / 40, wy / 40, 7); const rp = ((wx * .85 + wy * .5 + n * 16) / 6.5) % 1; const rr = rp < 0 ? rp + 1 : rp; if (rr < .13) col = P[1]; else if (rr < .2) col = P[2]; }
      else if (b === 1 || b === 2) { if (hs < .028) col = P[2]; else if (hs < .045) col = P[1]; else if (hs < (b === 2 ? .062 : .052)) col = P[3]; }
      else if (b === 3) { if (crackD(wx, wy, 13, 17) < 1.05) col = P[2]; else if (hs < .02) col = P[3]; }
      else if (b === 4) { const st = ((wy + vnoise(wx / 18, wy / 18, 23) * 7) / 8) % 1; if ((st < 0 ? st + 1 : st) < .1) col = P[2]; else if (hs < .03) col = P[3]; }
      const ry = rv[x][0], hw = rv[x][1], dy = Math.abs(wy - ry);
      if (dy < hw + 3) {
        const B = PAL.bed;
        if (dy < hw) { col = B[0]; if (crackD(wx, wy, 9, 27) < 1) col = B[2]; else if (hs < .05) col = B[1]; if (dy > hw - 2 && bv > .4) col = B[2]; }
        else if (bv > .5 || hs < .3) col = hs < .12 ? B[3] : B[1];
      }
      for (const r of rings) { const dd = Math.hypot((wx - r.x), (wy - r.y) * 1.5); if (dd > 21 && dd < 52) { const f = (dd / 4.5) % 1; if (f < .22) col = mixc(col, [255, 246, 226], .55); } }
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
  ['plants', 'marigold', 'Desert Marigold', 'Only shows its face after rain. Bright yellow and a little proud of it.', 'Blooms after it rains.'],
  ['plants', 'ocotillo', 'Ocotillo', 'Looks like a bundle of sticks until you notice the small red flame on every tip.', 'Spiky whips with red tips.'],
  ['plants', 'palm', 'Fan Palm', 'Where there is a palm there is water. The horse knew that before you did.', 'Grows where there is water.'],
  ['birds', 'roadrunner', 'Roadrunner', 'Would rather run than fly. Stops, looks right at you, then leaves at once.', 'Fast, on foot, in open sand.'],
  ['birds', 'quail', 'Quail Family', 'A tiny family walking in a line. The feather on top bounces as they go.', 'Little families in the scrub.'],
  ['birds', 'raven', 'Raven', 'Clever and loud. Almost certainly talking about you.', 'Flies over now and then.'],
  ['birds', 'hawk', 'Red-tailed Hawk', 'A slow circle high up. Its shadow slides over you like a cool hand.', 'Look for a shadow circling in the daytime.'],
  ['birds', 'owl', 'Great Horned Owl', 'Comes out at night and sits on the tallest cactus around. Blinks slowly.', 'Only out at night.'],
  ['birds', 'hummingbird', 'Hummingbird', 'A green flash that hums. Visits the flowers that open after rain.', 'Near flowers after rain.'],
  ['rocks', 'hoodoo', 'Hoodoo', 'A stack of stone with a hat on top. The wind spent a very long time on it.', 'In the red rock country.'],
  ['rocks', 'mesa', 'Mesa', 'A table of red rock as big as a town. Something very tall must eat there.', 'Big, flat-topped, red.'],
  ['rocks', 'petlog', 'Petrified Log', 'A tree that slowly turned to stone. The bark is still there, only harder.', 'Lying on the flats and rock.'],
  ['rocks', 'desertrose', 'Desert Rose', 'Sand and gypsum grown into petals. A flower that never needs water.', 'On the pale salt flats.'],
  ['rocks', 'obsidian', 'Obsidian', 'Black glass from an old volcano. There is a tiny sky inside it.', 'Shiny black, among the rocks.'],
  ['rocks', 'geode', 'Geode', 'A plain stone with a purple cave inside. Pawed up out of the sand.', 'Paw at sparkles in the sand.'],
  ['things', 'shell', 'Seashell', 'A seashell, this far from any shore. The desert was the sea once.', 'Lying out in the dunes.'],
  ['things', 'fossilfish', 'Fossil Fish', 'A fish pressed into stone, still mid-swim. It was here first.', 'Paw at sparkles in the sand.'],
  ['things', 'skull', 'Cow Skull', 'Bleached clean by the sun. Quiet company.', 'Bones in the sand.'],
  ['things', 'spur', 'Rusty Spur', 'A rusty spur. Whoever wore it is not riding anymore.', 'Paw at sparkles in the sand.'],
  ['things', 'tortoise', 'Desert Tortoise', 'Moves at exactly the right speed for the desert. Older than the road.', 'Slow, in the greener scrub.'],
  ['things', 'wine', 'Big Bottle of Red', 'Two snoozing cowboys, a pile of big bottles of red from somewhere called Jura, and a puddle that smells like a very good evening. They will be fine. Probably.', 'Somebody had a long night out here.'],
  ['things', 'fly', 'A Fly', 'A fly has decided you are its horse now. It hums along wherever you go, and glows a little at night.', 'Keep wandering.']
];
const ENT = {}; ENTRIES.forEach(e => ENT[e[1]] = { cat: e[0], id: e[1], name: e[2], text: e[3], hint: e[4] });
const ESPR = { saguaro: () => SPR.sag[0], prickly: () => SPR.prickly, barrel: () => SPR.barrel, marigold: () => SPR.marigoldB, ocotillo: () => SPR.ocotillo, palm: () => SPR.palm, roadrunner: () => SPR.rr[0], quail: () => SPR.quail[0], raven: () => SPR.raven[1], hawk: () => SPR.hawk[0], owl: () => SPR.owl[0], hummingbird: () => SPR.hum[0], hoodoo: () => SPR.hoodoo, mesa: () => mesaSprite(40, 12, 12, 5), petlog: () => SPR.log, desertrose: () => SPR.rose, obsidian: () => SPR.obsidian, geode: () => SPR.geode, shell: () => SPR.shell, fossilfish: () => SPR.fossil, skull: () => SPR.skull, spur: () => SPR.spur, tortoise: () => SPR.tortoise[0], wine: () => SPR.bottle, fly: () => pix(9, 7, P => { P.ell(4.5, 4, 1.6, 1.3, '#2a2420'); P.ell(3, 2.4, 1.4, 1, '#d8ecff'); P.ell(6, 2.4, 1.4, 1, '#d8ecff'); P.set(5.6, 3.6, '#c0392b'); }, null) };
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
const S = { x: 0, y: 0, hour: 8.2, day: 1, found: {}, rings: [], dug: {}, name: '', river: false, fly: false, rainSeen: false, played: 0 };
function save() { store.set({ x: Math.round(H.x), y: Math.round(H.y), hour: S.hour, day: S.day, found: S.found, rings: RINGS.map(r => r.found), dug: S.dug, name: S.name, river: S.river, fly: S.fly, rainSeen: S.rainSeen, played: S.played }); }
function load() {
  const s = store.get(); if (!s) return false;
  Object.assign(S, { hour: s.hour ?? 8.2, day: s.day || 1, found: s.found || {}, dug: s.dug || {}, name: s.name || '', river: !!s.river, fly: !!s.fly, rainSeen: !!s.rainSeen, played: s.played || 0 });
  (s.rings || []).forEach((f, i) => { if (RINGS[i]) RINGS[i].found = !!f; });
  H.x = s.x || 0; H.y = s.y || 0; return true;
}

const H = { x: 0, y: 0, vx: 0, vy: 0, face: 1, view: 'side', anim: 0, holdT: 0, idleT: 0, state: 'free', stT: 0, z: 0, vz: 0, blinkT: 2, blink: 0, tp: 0, target: null, inWater: false, gait: 'idle', stepAcc: 0, grazeCD: 6 };
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
  const DPR = Math.min(window.devicePixelRatio || 1, 3);
  CW = Math.max(1, Math.round(innerWidth * DPR)); CHh = Math.max(1, Math.round(innerHeight * DPR));
  canvas.width = CW; canvas.height = CHh;
  SC = Math.max(2, Math.floor(Math.min(CW, CHh) / 168));
  LW = Math.ceil(CW / SC); LH = Math.ceil(CHh / SC);
  OX = Math.floor((CW - LW * SC) / 2); OY = Math.floor((CHh - LH * SC) / 2);
  buf.width = LW; buf.height = LH;
}

/* ============================== audio ============================== */
let AC = null, master, musicBus, sfxBus, ambBus, noiseBuf, windSrc, windF, windG, rainG, rainF, KS = {}, muted = store.mute();
const NOTE = { E2: 82.41, 'F#2': 92.5, A2: 110, B2: 123.47, D3: 146.83, E3: 164.81, 'F#3': 185, G3: 196, A3: 220, B3: 246.94, D4: 293.66, E4: 329.63, 'F#4': 369.99, G4: 392, A4: 440, B4: 493.88, D5: 587.33, E5: 659.26, G5: 783.99, A5: 880, B5: 987.77 };
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
  } catch (e) { AC = null; }
}
function pluck(note, t, vel, pan) { if (!AC || !KS[note]) return; const s = AC.createBufferSource(); s.buffer = KS[note]; const g = AC.createGain(); g.gain.value = vel; let node = g; if (AC.createStereoPanner) { const p = AC.createStereoPanner(); p.pan.value = pan || 0; g.connect(p); node = p; } s.connect(g); node.connect(musicBus); s.start(t); }
function tone(f, d, type, v, f2, t0, bus) { if (!AC) return; const t = AC.currentTime + (t0 || 0); const o = AC.createOscillator(), g = AC.createGain(); o.type = type || 'sine'; o.frequency.setValueAtTime(f, t); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + d); g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(v, t + .01); g.gain.exponentialRampToValueAtTime(.0001, t + d); o.connect(g); g.connect(bus || sfxBus); o.start(t); o.stop(t + d + .05); }
function noise(d, v, fc, type, t0) { if (!AC) return; const t = AC.currentTime + (t0 || 0); const s = AC.createBufferSource(); s.buffer = noiseBuf; const f = AC.createBiquadFilter(); f.type = type || 'lowpass'; f.frequency.value = fc; const g = AC.createGain(); g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(.0001, t + d); s.connect(f); f.connect(g); g.connect(sfxBus); s.start(t, Math.random() * 1.5); s.stop(t + d + .05); }
function snore(v) { if (!AC) return; const t = AC.currentTime; const s = AC.createBufferSource(); s.buffer = noiseBuf; const f = AC.createBiquadFilter(); f.type = 'lowpass'; f.frequency.setValueAtTime(220, t); f.frequency.linearRampToValueAtTime(420, t + .7); const g = AC.createGain(); g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(.09 * v + .001, t + .5); g.gain.exponentialRampToValueAtTime(.0001, t + 1.1); s.connect(f); f.connect(g); g.connect(sfxBus); s.start(t, Math.random()); s.stop(t + 1.2); }
const sfx = {
  hoof(water, g) { if (water) noise(.09, .1, 1800, 'highpass'); else noise(.05, g === 'canter' ? .12 : .08, g === 'canter' ? 900 : 650); },
  whinny() {
    if (!AC) return; const t = AC.currentTime, k = rand(.9, 1.12);
    const o = AC.createOscillator(); o.type = 'sawtooth';
    o.frequency.setValueAtTime(480 * k, t); o.frequency.linearRampToValueAtTime(980 * k, t + .14); o.frequency.linearRampToValueAtTime(820 * k, t + .45); o.frequency.linearRampToValueAtTime(560 * k, t + .75); o.frequency.linearRampToValueAtTime(380 * k, t + .95);
    const l = AC.createOscillator(); l.frequency.value = 23; const lg = AC.createGain(); lg.gain.value = 42 * k; l.connect(lg); lg.connect(o.frequency);
    const g = AC.createGain(); g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(.2, t + .05); g.gain.setValueAtTime(.18, t + .6); g.gain.exponentialRampToValueAtTime(.0001, t + 1.0);
    for (const [fc, gv] of [[1100, 1], [2500, .5]]) { const f = AC.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = fc * k; f.Q.value = 3; const fg = AC.createGain(); fg.gain.value = gv; o.connect(f); f.connect(fg); fg.connect(g); }
    g.connect(sfxBus); o.start(t); l.start(t); o.stop(t + 1.05); l.stop(t + 1.05);
    noise(.25, .12, 800, 'bandpass', 1.0);
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
  splash() { noise(.25, .14, 1600, 'highpass'); }
};
// music: slow fingerpicking over two chords, E minor and D6/9 over F#
const CHORDS = [['E2', 'B2', 'E3', 'G3', 'B3', 'E4'], ['F#2', 'A2', 'D3', 'A3', 'B3', 'E4']];
const PATTERN = [0, 4, 2, 5, 1, 4, 3, 5];
const CHIME = ['B4', 'D5', 'E5', 'G4', 'A4', 'E5', 'G5'];
const mus = { next: 0, step: 0, lvl: 0 };
function musicTick() {
  if (!AC || AC.state !== 'running') return;
  const target = mode === 'title' ? .6 : (cine ? 1 : .85) * (1 - W.rain * .35);
  mus.lvl += (target - mus.lvl) * .05;
  const bpm = 66, e8 = 60 / bpm / 2;
  if (mus.next < AC.currentTime) mus.next = AC.currentTime + .05;
  while (mus.next < AC.currentTime + .2) {
    const st = mus.step, bar = (st >> 3), chord = CHORDS[bar & 1], i = st & 7;
    const night = nightAmt();
    const t = mus.next + rand(-.008, .012);
    if (!(night > .6 && (i === 3 || i === 7) && R() < .5)) {
      const ni = PATTERN[i], bass = ni < 2;
      pluck(chord[ni], t, (bass ? .42 : .26) * mus.lvl * rand(.85, 1.05), bass ? -.15 : (ni - 3) * .18);
    }
    if (i === 6 && (bar % 2 === 1) && R() < .45) pluck(pick(CHIME), t + e8 * .5, .16 * mus.lvl, rand(-.6, .6));
    if (cine && i % 2 === 0) pluck(pick(['E5', 'B5', 'G5', 'D5']), t + .03, .14, rand(-.7, .7));
    mus.next += e8; mus.step = (mus.step + 1) % 64;
  }
}
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
  $('dayLbl').textContent = 'Day ' + S.day + ' · ' + partOfDay() + (W.rain > .3 ? ' · rain' : '');
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
function dust(x, y, n, s) { for (let i = 0; i < n; i++) part(x + rand(-3, 3), y + rand(-1, 1), rand(-8, 8) - H.vx * .15 * s, rand(-10, -3), rand(.35, .7), R() < .5 ? '#f6dcb4' : '#e8c494', 'dust', 20); }

/* ============================== critters ============================== */
function spawnCritters(dt) {
  if (mode !== 'play') return;
  spawnCritters.t = (spawnCritters.t || 0) - dt; if (spawnCritters.t > 0) return; spawnCritters.t = 1.6;
  for (let i = critters.length - 1; i >= 0; i--) if (dist(critters[i].x, critters[i].y, H.x, H.y) > 300 && critters[i].type !== 'hawk') critters.splice(i, 1);
  const n = nightAmt(), count = t => critters.filter(c => c.type === t).length;
  if (critters.length > 12) return;
  const a = R() * TAU, d = rand(150, 210), x = H.x + Math.cos(a) * d, y = H.y + Math.sin(a) * d * .8;
  const b = biomeAt(x, y);
  const opts = [];
  if (n < .5) {
    if ((b === 1 || b === 2) && count('quail') < 1) opts.push('quail');
    if ((b === 0 || b === 1) && count('roadrunner') < 1) opts.push('roadrunner');
    if ((b === 1 || b === 2 || b === 0) && count('rabbit') < 2) opts.push('rabbit');
    if ((b === 3 || b === 4) && count('lizard') < 2) opts.push('lizard');
    if (b === 2 && count('tortoise') < 1) opts.push('tortoise');
    if (count('raven') < 1 && R() < .4) opts.push('raven');
    if (count('hawk') < 1 && R() < .5) opts.push('hawk');
    if (W.bloom > 0 && count('hum') < 2) opts.push('hum');
    if (W.bloom > 0 && count('butter') < 5) opts.push('butter', 'butter');
  } else {
    if (count('owl') < 1) opts.push('owl');
    if (count('rabbit') < 1) opts.push('rabbit');
    if (count('moth') < 6) opts.push('moth', 'moth');
  }
  if (!opts.length) return;
  const type = pick(opts);
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
  else if (type === 'owl') { const sg = []; forObjsNear(H.x, H.y, 170, o => { if (o.kind === 'saguaro' && dist(o.x, o.y, H.x, H.y) > 50) sg.push(o); }); if (sg.length) { const o = pick(sg); critters.push({ type, x: o.x, y: o.y + .1, perchH: o.spr.height - 2, t: 0, blinkT: 2 }); } }
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
        break;
      }
      case 'lizard': {
        if (dH < 26 && c.dart <= 0) { c.dart = .5; const a = Math.atan2(c.y - H.y, c.x - H.x); c.vx = Math.cos(a) * 80; c.vy = Math.sin(a) * 80; }
        if (c.dart > 0) { c.dart -= dt; c.x += c.vx * dt; c.y += c.vy * dt; }
        break;
      }
      case 'tortoise': { c.x += c.vx * dt; c.y += c.vy * dt; if (dH < 30) discover('tortoise'); break; }
      case 'raven': { c.x += c.vx * dt; c.y += c.vy * dt; if (dH < 60) discover('raven'); if (c.t > .5 && R() < dt * .2) sfx.caw(); if (c.t > 14) { critters.splice(i, 1); continue; } break; }
      case 'hawk': { c.a += dt * .35; c.x = c.cx + Math.cos(c.a) * 58; c.y = c.cy + Math.sin(c.a) * 40; c.cx += (H.x - c.cx) * dt * .05; c.cy += (H.y - c.cy) * dt * .05; if (dH < 52) discover('hawk'); c.life -= dt; if (c.life < 0 || nightAmt() > .5) { critters.splice(i, 1); continue; } break; }
      case 'hum': {
        c.k -= dt; if (c.k <= 0) { c.k = rand(.4, 1.2); let fl = null; forObjsNear(c.x, c.y, 90, o => { if (o.kind === 'marigold' && (!fl || R() < .4)) fl = o; }); c.tx = fl ? fl.x + rand(-4, 4) : c.x + rand(-30, 30); c.ty = fl ? fl.y - 2 : c.y + rand(-20, 20); }
        c.x += (c.tx - c.x) * Math.min(1, dt * 5); c.y += (c.ty - c.y) * Math.min(1, dt * 5);
        if (dH < 40) discover('hummingbird'); if (W.bloom <= 0) { critters.splice(i, 1); continue; } break;
      }
      case 'butter': { c.x += Math.sin(c.t * 1.3) * 12 * dt + 5 * dt; c.y += Math.cos(c.t * .9) * 9 * dt; c.z = 8 + Math.sin(c.t * 3) * 3; if (W.bloom <= 0 && c.t > 5) { critters.splice(i, 1); continue; } break; }
      case 'moth': { c.x += Math.sin(c.t * 1.7) * 10 * dt; c.y += Math.cos(c.t * 1.3) * 8 * dt; c.z = 10 + Math.sin(c.t * 2.2) * 4; if (nightAmt() < .3) { critters.splice(i, 1); continue; } break; }
      case 'owl': { c.blinkT -= dt; if (c.blinkT < -.15) c.blinkT = rand(1.5, 4); if (dH < 46) discover('owl'); if (R() < dt * .06) sfx.hoot(); if (nightAmt() < .3) { critters.splice(i, 1); continue; } break; }
    }
  }
}

/* ============================== world queries ============================== */
function forObjsNear(x, y, r, fn) {
  const c0 = Math.floor((x - r) / CHS), c1 = Math.floor((x + r) / CHS), r0 = Math.floor((y - r) / CHS), r1 = Math.floor((y + r) / CHS);
  for (let cy = r0; cy <= r1; cy++) for (let cx = c0; cx <= c1; cx++) { const ch = getChunk(cx, cy); for (const o of ch.objs) fn(o); }
}
function spring() { const g = RINGS[8]; let k = 0; if (S.river) k = 1; else if (cine) k = clamp((cine.t - 3) / 4, 0, 1); if (k <= 0) return null; return { x: g.x, y: g.y + 1, rx: 13 * k, ry: 7.5 * k }; }
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
  forObjsNear(px, py, 20, o => {
    if (!o.r) return; const dx = px - o.x, dy = (py - o.y) * 1.3, d = Math.hypot(dx, dy), m = o.r + rad;
    if (d < m && d > .001) { px = o.x + dx / d * m; py = o.y + dy / d * m / 1.3; nx += dx / d; ny += dy / d; }
  });
  for (const m of mesasNear(px, py, 80)) {
    const ex = m.rx + rad, ey = m.ry + rad * .8; const dx = (px - m.x) / ex, dy = (py - m.y) / ey, d = Math.hypot(dx, dy);
    if (d < 1 && d > .001) { px = m.x + dx / d * ex; py = m.y + dy / d * ey; nx += dx; ny += dy; }
  }
  for (const g of RINGS) { if (Math.abs(g.x - px) > 30 || Math.abs(g.y - py) > 30) continue; for (const s of g.stones) { const dx = px - s.x, dy = (py - s.y) * 1.3, d = Math.hypot(dx, dy), m = 2.6 + rad; if (d < m && d > .001) { px = s.x + dx / d * m; py = s.y + dy / d * m / 1.3; nx += dx / d; ny += dy / d; } } }
  return { x: px, y: py, nx, ny };
}

/* ============================== horse update ============================== */
function setState(s) { H.state = s; H.stT = 0; }
function updHorse(dt) {
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
  H.inWater = waterAt(H.x, H.y);
  if (H.inWater) top *= .55;
  const tx = ix * top, ty = iy * top * .85;
  const rate = mag > .1 ? 2.6 : 4.2;
  H.vx += (tx - H.vx) * Math.min(1, rate * dt); H.vy += (ty - H.vy) * Math.min(1, rate * dt);
  const ox = H.x, oy = H.y;
  let nx = H.x + H.vx * dt, ny = H.y + H.vy * dt;
  const c = collide(nx, ny, 4.5);
  if (c.nx || c.ny) { const l = Math.hypot(c.nx, c.ny); const ux = c.nx / l, uy = c.ny / l; const vn = H.vx * ux + H.vy * uy; if (vn < 0) { H.vx -= vn * ux; H.vy -= vn * uy; } if (H.target && Math.hypot(c.x - ox, c.y - oy) < .02) H.target = null; }
  H.x = c.x; H.y = c.y;
  const sp = Math.hypot(H.vx, H.vy);
  H.gait = sp < 2.5 ? 'idle' : sp < 40 ? 'walk' : sp < 64 ? 'trot' : 'canter';
  if (Math.abs(H.vx) > 3) H.face = H.vx > 0 ? 1 : -1;
  if (sp > 3) H.view = Math.abs(H.vy) > Math.abs(H.vx) * 1.5 ? (H.vy > 0 ? 'front' : 'back') : 'side';
  const stride = { walk: 24, trot: 32, canter: 44 }[H.gait] || 24;
  if (sp > 2.5) { const before = H.anim; H.anim += sp * dt / stride; const beats = H.gait === 'walk' ? 4 : H.gait === 'trot' ? 2 : 3; if (Math.floor(before * beats) !== Math.floor(H.anim * beats)) { sfx.hoof(H.inWater, H.gait); if (H.inWater) { for (let k = 0; k < 3; k++) part(H.x + rand(-4, 4), H.y, rand(-14, 14), rand(-30, -14), .4, R() < .5 ? '#cfefff' : '#ffffff', 'drop', 140); } else { if (H.gait === 'canter' || (H.gait === 'trot' && R() < .4)) dust(H.x - H.face * 6, H.y, H.gait === 'canter' ? 2 : 1, 1); prints.push({ x: H.x + rand(-2, 2) - H.face * 2, y: H.y + (prints.length & 1 ? 1 : -1), t: 0 }); if (prints.length > 260) prints.shift(); } } }
  else H.anim += dt * .5;
  // idle life
  if (H.state === 'free' && H.gait === 'idle' && mode === 'play') { H.idleT += dt; H.grazeCD -= dt; if (H.grazeCD < 0 && H.idleT > 4) { H.grazeCD = rand(7, 14); setState('graze'); } } else H.idleT = 0;
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
  for (const c of critters) if ((c.type === 'raven' || c.type === 'quail') && dist(c.x, c.y, H.x, H.y) < 80) { if (c.type === 'quail') c.flee = 1.2; else c.vy -= 30; }
}
function action() {
  audioInit();
  const a = currentAction();
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
  const cs = campThing(); if (cs) return cs.kind === 'guitar' ? 'Strum' : cs.kind === 'puddle' ? 'Sniff' : 'Nudge';
  if (nearWater(H.x + H.face * 10, H.y, 4) || waterAt(H.x, H.y)) return 'Drink';
  return 'Rest';
}
function dig(o) {
  const ch = getChunk(Math.floor(o.x / CHS), Math.floor(o.y / CHS)); ch.objs = ch.objs.filter(q => q !== o); S.dug[o.id] = 1;
  const b = biomeAt(o.x, o.y);
  const cands = b === 0 ? ['shell', 'fossilfish', 'spur'] : b === 3 ? ['geode', 'spur', 'fossilfish'] : b === 4 ? ['geode', 'fossilfish'] : ['spur', 'fossilfish', 'geode'];
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
  forObjsNear(H.x, H.y, 40, o => {
    if (!o.disc || S.found[o.disc]) return;
    if (o.disc === 'marigold' && W.bloom <= 0) return;
    if (dist(o.x, o.y, H.x, H.y) < (o.r ? 26 : 22)) discover(o.disc);
  });
  if (!S.found.mesa) for (const m of mesasNear(H.x, H.y, 120)) { const dx = (H.x - m.x) / (m.rx + 26), dy = (H.y - m.y) / (m.ry + 26); if (dx * dx + dy * dy < 1) discover('mesa'); }
  if (!S.found.palm) for (const o of oasesNear(H.x, H.y, 80)) if (inEll(H.x, H.y, o, 30)) discover('palm');
  for (const g of RINGS) {
    if (g.found) continue; const d = dist(H.x, H.y, g.x, g.y);
    if (d < 8) activateRing(g);
  }
  for (const cp of campsNear(H.x, H.y, 120)) if (dist(H.x, H.y, cp.x, cp.y) < 48) discover('wine');
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
  S.name = nm; S.river = true; $('nameDlg').classList.add('hide');
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
  if (AC) { windG.gain.value = (.05 + .06 * Math.sin(T * .13) * Math.sin(T * .05)) * (1 + W.rain); windF.frequency.value = 380 + 160 * Math.sin(T * .11); rainG.gain.value = W.rain * .22; }
  // drops
  if (W.rain > .05) { const n = Math.floor(W.rain * 4 + R()); for (let i = 0; i < n; i++) drops.push({ x: rand(-20, LW + 20), y: rand(-20, LH), l: rand(.3, .8), t: 0 }); }
  for (let i = drops.length - 1; i >= 0; i--) { const d = drops[i]; d.t += dt; if (d.t > d.l) { drops.splice(i, 1); if (R() < .5) parts.push({ x: d.x + cam.x - 4 + d.t * 20, y: d.y + d.t * 160 + cam.y, vx: 0, vy: 0, life: .35, max: .35, c: '#e8f4ff', kind: 'ripple', g: 0, z: 0 }); } }
}

/* ============================== main update ============================== */
function update(dt) {
  T += dt;
  if (mode === 'play') { S.played += dt; S.hour += dt * (24 / 360) * (H.state === 'rest' ? 1 : 1); }
  else S.hour += dt * .01;
  if (S.hour >= 24) S.hour -= 24;
  const pd = update.lastHour ?? S.hour; if (pd < 6 && S.hour >= 6 && mode === 'play') { S.day++; dayCard('Day ' + S.day); save(); }
  update.lastHour = S.hour;
  if (cine) updFinale(dt);
  updHorse(dt);
  if (mode === 'play') { spawnCritters(dt); scanDiscoveries(dt); }
  updCritters(dt); updWeather(dt);
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
  for (let i = ghosts.length - 1; i >= 0; i--) { const g = ghosts[i]; g.t += dt; g.x += g.vx * dt; g.y += g.vy * dt; if (g.t > g.life || (nightAmt() < .2 && !cine)) ghosts.splice(i, 1); }
  // particles & prints
  for (let i = parts.length - 1; i >= 0; i--) { const p = parts[i]; p.life -= dt; if (p.life <= 0) { parts.splice(i, 1); continue; } p.vy += p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt; if (p.kind === 'dust' || p.kind === 'drop') { p.vx *= 1 - dt * 2; } }
  for (let i = prints.length - 1; i >= 0; i--) { prints[i].t += dt; if (prints[i].t > 40) prints.splice(i, 1); }
  for (const g of RINGS) if (g.pulse > 0) g.pulse -= dt * .3;
  // camera
  const lx = H.vx * .45, ly = H.vy * .35;
  const tx = H.x + lx - LW / 2, ty = H.y + ly - LH / 2 - (mode === 'title' ? LH * titleOff() : 8);
  cam.x += (tx - cam.x) * Math.min(1, dt * 3); cam.y += (ty - cam.y) * Math.min(1, dt * 3);
  // timers
  if (cardTimer > 0) { cardTimer -= dt; if (cardTimer <= 0) hideCard(); }
  if (dayCardT > 0) { dayCardT -= dt; if (dayCardT <= 0) $('dayCard').classList.add('hide'); }
  if (hintT > 0) { hintT -= dt; if (hintT <= 0) $('hint').classList.add('hide'); }
  saveT -= dt; if (saveT < 0 && mode === 'play') { saveT = 4; save(); updateHUD(); }
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
  // hoofprints
  for (const p of prints) { const a = 1 - p.t / 40; if (a <= 0) continue; b.fillStyle = 'rgba(150,100,60,' + (.28 * a).toFixed(3) + ')'; b.fillRect(Math.floor(p.x - cx), Math.floor(p.y - cy), 2, 1); }
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
  list.push({ kind: 'horse', x: H.x, y: H.y });
  // ground shadows
  for (const o of list) {
    if (o.kind === 'horse') { b.fillStyle = 'rgba(90,50,30,.22)'; ellipseFill(b, H.x - cx, H.y - cy, Math.max(4, 9 - H.z * .1), 2.4); continue; }
    const d = DEF[o.kind]; if (d && d.sh) { b.fillStyle = 'rgba(90,50,30,.2)'; ellipseFill(b, o.x - cx + 1, o.y - cy, d.sh, 2); }
    if (o.kind === 'critter' && o.c.z > 4) { b.fillStyle = 'rgba(90,50,30,.18)'; ellipseFill(b, o.x - cx, o.y - cy, 3, 1); }
  }
  list.sort((a, b2) => a.y - b2.y);
  for (const o of list) drawThing(o, cx, cy, tt);
  // dig sparkles
  forObjsNear(cx + LW / 2, cy + LH / 2, Math.max(LW, LH) / 2 + 20, o => { if (o.kind !== 'dig') return; const x = Math.floor(o.x - cx), y = Math.floor(o.y - cy); b.fillStyle = 'rgba(160,110,60,.35)'; b.fillRect(x - 2, y, 5, 1); b.fillRect(x - 1, y - 1, 3, 1); const ph = (tt * 1.7 + o.t) % 2.2; if (ph < .5) { const s = ph < .25 ? 1 : 2; b.fillStyle = '#fffbe8'; b.fillRect(x, y - 3 - s, 1, s * 2 + 1); b.fillRect(x - s, y - 3, s * 2 + 1, 1); } else { b.fillStyle = '#fff3c8'; b.fillRect(x, y - 3, 1, 1); } });
  // particles
  for (const p of parts) {
    const x = Math.floor(p.x - cx), y = Math.floor(p.y - cy), a = Math.min(1, p.life / p.max * 1.8);
    if (p.kind === 'heart') { b.globalAlpha = a; b.fillStyle = p.c; b.fillRect(x - 1, y, 1, 1); b.fillRect(x + 1, y, 1, 1); b.fillRect(x - 1, y + 1, 3, 1); b.fillRect(x, y + 2, 1, 1); b.globalAlpha = 1; }
    else if (p.kind === 'z') { b.globalAlpha = a * .9; b.fillStyle = p.c; b.fillRect(x, y, 3, 1); b.fillRect(x + 1, y + 1, 1, 1); b.fillRect(x, y + 2, 3, 1); b.globalAlpha = 1; }
    else if (p.kind === 'note') { b.globalAlpha = a; b.fillStyle = p.c; b.fillRect(x, y, 1, 3); b.fillRect(x - 1, y + 2, 1, 1); b.fillRect(x + 1, y, 1, 1); b.globalAlpha = 1; }
    else if (p.kind === 'item') { b.drawImage(p.spr, x - (p.spr.width >> 1), y - p.spr.height); }
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
  // rain
  if (drops.length) { b.fillStyle = 'rgba(220,235,255,.55)'; for (const d of drops) { const x = Math.floor(d.x + d.t * 20), y = Math.floor(d.y + d.t * 160); b.fillRect(x, y, 1, 3); } }
  // light: multiply tint
  let tint = tintAt(S.hour); if (W.rain > 0) tint = mixc(tint, mixc(tint, [190, 196, 214], .9), W.rain);
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
    b.globalAlpha = night; b.drawImage(GLOW.horse, Math.floor(H.x - cx) - 40, Math.floor(H.y - cy) - 52); b.globalAlpha = 1;
    if (S.fly) { b.globalAlpha = night; b.drawImage(GLOW.fly, Math.floor(fly.x - cx) - 14, Math.floor(fly.y - cy) - 14); b.drawImage(GLOW.tiny, Math.floor(fly.x - cx) - 4, Math.floor(fly.y - cy) - 4); b.globalAlpha = 1; }
    for (const c of critters) if (c.type === 'moth') { const x = Math.floor(c.x - cx), y = Math.floor(c.y - cy - c.z); b.globalAlpha = night * (.6 + .4 * Math.sin(c.t * 5)); b.drawImage(GLOW.moth, x - 6, y - 6); b.fillStyle = '#f4ffd8'; b.fillRect(x, y, 1, 1); b.globalAlpha = 1; }
    forObjsNear(cx + LW / 2, cy + LH / 2, Math.max(LW, LH) / 2 + 20, o => { if (o.kind === 'dig') { b.globalAlpha = night * (.4 + .4 * Math.sin(tt * 2 + o.t)); b.drawImage(GLOW.tiny, Math.floor(o.x - cx) - 4, Math.floor(o.y - cy) - 7); b.globalAlpha = 1; } });
  }
  // the stars come down to drink
  if (night > .2) {
    for (const o of waterBodies(cx, cy)) { const x = Math.floor(o.x - cx), y = Math.floor(o.y - cy); for (let k = 0; k < 16; k++) { const sx = (hash(k, o.x | 0, 3) - .5) * o.rx * 1.7, sy = (hash(k, o.y | 0, 4) - .5) * o.ry * 1.7; if ((sx * sx) / (o.rx * o.rx) + (sy * sy) / (o.ry * o.ry) > .8) continue; const tw = .45 + .55 * Math.sin(tt * (1.5 + hash(k, 1, 9)) + k * 1.7); b.fillStyle = 'rgba(255,250,225,' + (night * tw).toFixed(2) + ')'; b.fillRect(x + Math.floor(sx), y + Math.floor(sy), 1, 1); if (hash(k, o.x | 0, 5) > .85) { b.fillRect(x + Math.floor(sx) - 1, y + Math.floor(sy), 3, 1); } } }
    if (S.river) for (let wx = cx; wx < cx + LW; wx++) { if (hash(wx, 7, 1) > .07) continue; const ry = riverY(wx), hw = riverHW(wx) - 1, y0 = Math.floor(ry - hw - cy), h = Math.ceil(hw * 2); if (y0 > LH || y0 + h < 0) continue; const tw = .45 + .55 * Math.sin(tt * 2 + wx); b.fillStyle = 'rgba(255,250,225,' + (night * tw).toFixed(2) + ')'; b.fillRect(wx - cx, y0 + 2 + Math.floor(hash(wx, 8, 2) * (h - 4)), 1, 1); }
  }
  // ghost sea
  for (const g of ghosts) {
    const a = Math.min(1, g.t / 2, (g.life - g.t) / 3) * (cine ? 1 : night) * .62; if (a <= 0) continue;
    const spr = g.type === 'whale' ? SPR.gwhale : g.type === 'jelly' ? SPR.gjelly : SPR.gfish;
    b.globalAlpha = a;
    for (const s of g.school) {
      const x = Math.floor(g.x + s.ox + Math.sin(g.t * 1.5 + s.ph) * 2 - cx), y = Math.floor(g.y + s.oy + Math.sin(g.t * 2 + s.ph) * 1.5 - cy);
      if (g.dir < 0) b.drawImage(spr, x - (spr.width >> 1), y - (spr.height >> 1)); else { b.save(); b.scale(-1, 1); b.drawImage(spr, -x - (spr.width >> 1), y - (spr.height >> 1)); b.restore(); }
      b.globalAlpha = a * .35; b.drawImage(GLOW.sea, x - 12, y - 12); b.globalAlpha = a;
    }
    b.globalAlpha = 1;
  }
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
    case 'mesa': { const me = o.me; b.drawImage(me.spr, Math.floor(me.x - cx - me.w / 2 - 1), Math.floor(me.y - cy - me.top / 2 - 1 - me.cliff)); return; }
    case 'stone': return at(o.spr, o.x, o.y);
    case 'center': { const g = o.g; at(g.found ? SPR.centerDim : SPR.center, g.x, g.y + 1); return; }
    case 'tumble': { const t = o.t; b.fillStyle = 'rgba(90,50,30,.18)'; ellipseFill(b, t.x - cx, t.y - cy, 5, 1.5); at(SPR.tumble[Math.floor(t.rot) % 6 < 0 ? 0 : Math.floor(t.rot) % 6], t.x, t.y - t.z); return; }
    case 'critter': return drawCritter(o.c, at, tt);
    case 'marigold': return at(W.bloom > 0 ? SPR.marigoldB : SPR.marigold, o.x, o.y);
    case 'dig': return;
    case 'sage': case 'tuft': { const sway = Math.sin(tt * 1.6 + o.t) * W.wind; if (Math.abs(sway) > 1.1 && o.kind === 'tuft') { at(o.spr, o.x + (sway > 0 ? 1 : -1), o.y); return; } return at(o.spr, o.x, o.y); }
    case 'reed': { const sway = Math.sin(tt * 1.3 + o.t) * W.wind; return at(o.spr, o.x + (Math.abs(sway) > 1 ? Math.sign(sway) : 0), o.y); }
    default: if (o.spr) return at(o.spr, o.x, o.y, o.kind === 'saguaro' && (o.v & 4));
  }
}
function drawCritter(c, at, tt) {
  const f = (tt * 8 | 0) & 1;
  switch (c.type) {
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
  const dx = Math.floor(H.x - cx) - (side && H.face < 0 ? spr.width - 1 - ax : ax), dy = Math.floor(H.y - cy - H.z) - HB;
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
  if (mode !== 'play' || cine) return;
  const next = RINGS.find(r => !r.found); if (!next) return;
  if (S.played < 25 && RINGS.every(r => !r.found)) return;
  const sx = next.x - cx, sy = next.y - cy;
  if (sx > 8 && sx < LW - 8 && sy > 8 && sy < LH - 8) return;
  const mx = LW / 2, my = LH / 2, dx = sx - mx, dy = sy - my;
  const k = Math.min((LW / 2 - 12) / Math.abs(dx || 1e-6), (LH / 2 - 14) / Math.abs(dy || 1e-6));
  const x = Math.floor(mx + dx * k), y = Math.floor(my + dy * k);
  const b = bctx, p = .6 + .4 * Math.sin(tt * 2.4);
  b.globalCompositeOperation = 'lighter'; b.globalAlpha = .55 * p; b.drawImage(GLOW.stoneS, x - 9, y - 9); b.globalAlpha = 1; b.globalCompositeOperation = 'source-over';
  b.fillStyle = 'rgba(232,248,255,' + (.75 + .25 * p).toFixed(2) + ')'; b.fillRect(x, y - 2, 1, 5); b.fillRect(x - 2, y, 5, 1); b.fillRect(x - 1, y - 1, 3, 3);
}

/* ============================== journal UI ============================== */
let jTab = 'plants', jSel = null;
const TABS = [['plants', 'Plants'], ['birds', 'Birds'], ['rocks', 'Rocks'], ['things', 'Things'], ['stones', 'Stones']];
function openJournal() {
  audioInit(); $('journal').classList.remove('hide'); renderJournal();
}
function closeJournal() { $('journal').classList.add('hide'); }
function renderJournal() {
  $('jTitle').textContent = S.name ? S.name + "'s journal" : 'Journal';
  const tabs = $('jtabs'); tabs.innerHTML = '';
  for (const [k, l] of TABS) { const bt = document.createElement('button'); bt.textContent = l + (k === 'stones' ? ' ' + RINGS.filter(r => r.found).length + '/9' : ' ' + ENTRIES.filter(e => e[0] === k && S.found[e[1]]).length + '/' + ENTRIES.filter(e => e[0] === k).length); bt.className = k === jTab ? 'on' : ''; bt.onclick = () => { jTab = k; jSel = null; renderJournal(); }; tabs.appendChild(bt); }
  const body = $('jbody'); body.innerHTML = '';
  if (jTab === 'stones') {
    const m = document.createElement('div'); m.className = 'mem';
    RINGS.forEach((r, i) => { const d = document.createElement('div'); if (r.found) { d.innerHTML = '<i>STONE ' + (i + 1) + '</i>'; d.appendChild(document.createTextNode(LINES[i])); } else { d.className = 'no'; d.innerHTML = '<i>STONE ' + (i + 1) + '</i>Still humming somewhere. Follow the little glint at the edge of your view.'; } m.appendChild(d); });
    body.appendChild(m);
    $('jHint').textContent = S.name ? 'Every stone found. The river runs again.' : 'Nine stones hum in the desert. They remember something.';
    return;
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
  if (jSel) { const e = ENT[jSel]; if (S.found[jSel]) { det.innerHTML = '<b></b><span></span>'; det.querySelector('b').textContent = e.name; det.querySelector('span').textContent = e.text; } else { det.innerHTML = '<b>Not found yet</b><span></span>'; det.querySelector('span').textContent = 'Hint: ' + e.hint; } }
  else det.textContent = 'Tap an entry to read about it.';
  body.appendChild(det);
  $('jHint').textContent = 'Plants, birds, rocks and things you have met out here.';
}

/* ============================== input ============================== */
const DIRK = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyW', 'KeyA', 'KeyS', 'KeyD']);
addEventListener('keydown', e => {
  if ($('nameDlg').classList.contains('hide') === false) { if (e.code === 'Enter') confirmName(); return; }
  if (DIRK.has(e.code) || e.code === 'Space') e.preventDefault();
  if (mode === 'title') { if (!e.repeat && (e.code === 'Space' || e.code === 'Enter' || DIRK.has(e.code))) begin(); return; }
  if (e.code === 'Escape' || (e.code === 'KeyJ' && !e.repeat)) { if (!$('journal').classList.contains('hide')) { closeJournal(); return; } if (e.code === 'KeyJ') { openJournal(); return; } }
  if (!$('journal').classList.contains('hide')) return;
  audioInit();
  if (DIRK.has(e.code)) { input.keys.add(e.code); H.target = null; }
  if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') input.run = true;
  if (e.repeat) return;
  if (e.code === 'Space' || e.code === 'KeyE' || e.code === 'Enter') action();
  if (e.code === 'KeyH' || e.code === 'KeyQ') whinny();
  if (e.code === 'KeyM') setMute(!muted);
});
addEventListener('keyup', e => { input.keys.delete(e.code); if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') input.run = false; });
addEventListener('blur', () => { input.keys.clear(); input.run = false; input.x = input.y = 0; $('stick').classList.add('hide'); ptr = null; });
let ptr = null;
canvas.addEventListener('pointerdown', e => {
  if (mode === 'title') { begin(); return; }
  if (ptr) return;
  audioInit(); e.preventDefault();
  ptr = { id: e.pointerId, sx: e.clientX, sy: e.clientY, t: performance.now(), moved: false };
  try { canvas.setPointerCapture(e.pointerId); } catch (er) {}
});
canvas.addEventListener('pointermove', e => {
  if (!ptr || e.pointerId !== ptr.id) return;
  const dx = e.clientX - ptr.sx, dy = e.clientY - ptr.sy, d = Math.hypot(dx, dy);
  if (!ptr.moved && d > 12) { ptr.moved = true; H.target = null; const st = $('stick'); st.style.left = ptr.sx + 'px'; st.style.top = ptr.sy + 'px'; st.classList.remove('hide'); }
  if (ptr.moved) { const R0 = 44, k = Math.min(1, d / R0); input.x = dx / (d || 1) * k; input.y = dy / (d || 1) * k; $('knob').style.transform = 'translate(' + (dx / (d || 1) * Math.min(d, R0)) + 'px,' + (dy / (d || 1) * Math.min(d, R0)) + 'px)'; }
});
function ptrEnd(e) {
  if (!ptr || e.pointerId !== ptr.id) return;
  if (!ptr.moved && performance.now() - ptr.t < 400 && mode === 'play' && !(cine && cine.lock)) {
    const r = canvas.getBoundingClientRect(); const dpr = CW / r.width;
    const lx = ((e.clientX - r.left) * dpr - OX) / SC, ly = ((e.clientY - r.top) * dpr - OY) / SC;
    const wx = cam.x + lx, wy = cam.y + ly;
    if (dist(wx, wy, H.x, H.y - 12) < 14) whinny();
    else { H.target = { x: wx, y: wy }; for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; part(wx + Math.cos(a) * 3, wy + Math.sin(a) * 2, Math.cos(a) * 10, Math.sin(a) * 6, .5, '#fff6e0'); } }
  }
  ptr = null; input.x = input.y = 0; $('stick').classList.add('hide'); $('knob').style.transform = '';
}
canvas.addEventListener('pointerup', ptrEnd); canvas.addEventListener('pointercancel', ptrEnd);
addEventListener('contextmenu', e => e.preventDefault());
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
  $('title').classList.add('hide'); ['hud', 'topR', 'btmR'].forEach(id => $(id).classList.remove('hide'));
  updateHUD();
  const first = S.played < 2;
  if (first) {
    setTimeout(() => card('Day 1', 'No map and no hurry. Just you, the sand, and a horse who does not have a name yet.', '', 7), 500);
    setTimeout(() => hint(isTouch ? 'Drag anywhere to wander, or tap a spot to walk there. Keep going to speed up. Tap the horse to say hello.' : 'Arrow keys or WASD to wander. Keep holding to speed up. Space to rest or drink, H to whinny, J for the journal.', 9), 8200);
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
window.__hw = { camps: (x, y, r) => campsNear(x, y, r), SPR, H, S, RINGS, input, update, render, begin, action, whinny, activateRing, critters, W, get mode() { return mode; }, get cine() { return cine; }, confirmName, discover, spawnGhost, set hour(v) { S.hour = v; } };
requestAnimationFrame(t => { last = t; requestAnimationFrame(frame); });
})();
