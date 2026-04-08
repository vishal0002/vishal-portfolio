/**
 * nuclear-anim.js
 * ─────────────────────────────────────────────────────────────
 * India's 3-Stage Nuclear Programme — Interactive Stage Animator
 * Canvas-based physics simulation · 60fps requestAnimationFrame
 *
 * Stages:
 *   0 — PHWR    · D₂O moderation, U-238 → Pu-239 breeding chain
 *   1 — FBR     · Fast neutron core, Th blanket, breeding ratio
 *   2 — AHWR    · ²³³U + Th self-sustaining cycle, GDWP passive safety
 *   3 — Finale  · India energy independence, Th reserves, timeline
 * ─────────────────────────────────────────────────────────────
 */

'use strict';

const NuclearAnim = (() => {

/* ══════════════════════════════════════════════════════════════
   COLOUR PALETTE  (mirrors site CSS variables)
══════════════════════════════════════════════════════════════ */
const C = {
  bg:        '#080c14',
  bgCard:    '#0d1321',
  border:    'rgba(0,212,255,0.15)',
  cyan:      '#00d4ff',
  amber:     '#f59e0b',
  green:     '#22c55e',
  red:       '#ef4444',
  purple:    '#9f7aea',
  text:      '#c8d6e5',
  dim:       '#607080',
  // Stage accent colours
  s1:        '#f59e0b',    // amber  — PHWR
  s2:        '#00d4ff',    // cyan   — FBR
  s3:        '#22c55e',    // green  — AHWR
  // Physics particles
  fast_n:    '#ffee55',    // fast neutron
  thermal_n: '#44aaff',    // thermal neutron
  beta:      '#88ffaa',    // beta particle
  sodium:    '#ff8800',    // liquid sodium
  pu239:     '#9f7aea',    // plutonium
  u233:      '#22c55e',    // U-233
  u235:      '#f59e0b',    // U-235
  u238:      '#607080',    // U-238
  th232:     '#16a34a',    // Thorium
};

/* ══════════════════════════════════════════════════════════════
   UTILITY — Vec2
══════════════════════════════════════════════════════════════ */
class Vec2 {
  constructor(x = 0, y = 0) { this.x = x; this.y = y; }
  add(v)    { return new Vec2(this.x + v.x, this.y + v.y); }
  scale(s)  { return new Vec2(this.x * s,   this.y * s); }
  len()     { return Math.hypot(this.x, this.y); }
  norm()    { const l = this.len() || 1; return new Vec2(this.x / l, this.y / l); }
  static fromAngle(a, mag = 1) { return new Vec2(Math.cos(a) * mag, Math.sin(a) * mag); }
  static random(mag = 1) { return Vec2.fromAngle(Math.random() * Math.PI * 2, mag); }
}

/* ══════════════════════════════════════════════════════════════
   PARTICLE — Neutron (fast or thermal)
══════════════════════════════════════════════════════════════ */
class Neutron {
  constructor(x, y, fast = false, targetX = null, targetY = null) {
    this.pos   = new Vec2(x, y);
    this.fast  = fast;
    this.speed = fast ? (3.5 + Math.random() * 2.5) : (1.2 + Math.random() * 0.8);

    if (targetX !== null) {
      const dx = targetX - x, dy = targetY - y;
      const l  = Math.hypot(dx, dy) || 1;
      this.vel = new Vec2(dx / l * this.speed, dy / l * this.speed);
    } else {
      this.vel = Vec2.random(this.speed);
    }

    this.life  = 1.0;
    this.decay = fast ? 0.008 : 0.012;
    this.r     = fast ? 3.5 : 3;
    this.trail = [];
    this.alive = true;
  }

  update() {
    this.trail.push({ x: this.pos.x, y: this.pos.y });
    if (this.trail.length > (this.fast ? 10 : 6)) this.trail.shift();
    this.pos.x += this.vel.x;
    this.pos.y += this.vel.y;
    this.life  -= this.decay;
    if (this.life <= 0) this.alive = false;
  }

  draw(ctx) {
    const col = this.fast ? C.fast_n : C.thermal_n;
    const rgb = this.fast ? '255,238,85' : '68,170,255';

    // Trail
    for (let i = 0; i < this.trail.length; i++) {
      const t   = this.trail[i];
      const pct = i / this.trail.length;
      ctx.beginPath();
      ctx.arc(t.x, t.y, this.r * 0.5 * pct, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${rgb},${pct * this.life * 0.5})`;
      ctx.fill();
    }

    // Glow halo
    const grd = ctx.createRadialGradient(this.pos.x, this.pos.y, 0, this.pos.x, this.pos.y, this.r * 3.5);
    grd.addColorStop(0,   `rgba(${rgb},${this.life * 0.8})`);
    grd.addColorStop(1,   `rgba(${rgb},0)`);
    ctx.beginPath();
    ctx.arc(this.pos.x, this.pos.y, this.r * 3.5, 0, Math.PI * 2);
    ctx.fillStyle = grd;
    ctx.fill();

    // Core dot
    ctx.beginPath();
    ctx.arc(this.pos.x, this.pos.y, this.r, 0, Math.PI * 2);
    ctx.fillStyle = col;
    ctx.fill();
  }
}

/* ══════════════════════════════════════════════════════════════
   PARTICLE — Beta decay electron
══════════════════════════════════════════════════════════════ */
class BetaParticle {
  constructor(x, y) {
    this.pos  = new Vec2(x, y);
    this.vel  = Vec2.random(2 + Math.random() * 2);
    this.life = 1.0;
    this.alive = true;
  }
  update() {
    this.pos.x += this.vel.x;
    this.pos.y += this.vel.y;
    this.vel.x *= 0.97;
    this.vel.y *= 0.97;
    this.life  -= 0.022;
    if (this.life <= 0) this.alive = false;
  }
  draw(ctx) {
    ctx.beginPath();
    ctx.arc(this.pos.x, this.pos.y, 2.5, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(136,255,170,${this.life})`;
    ctx.fill();
    ctx.fillStyle = `rgba(136,255,170,${this.life * 0.7})`;
    ctx.font = '8px monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('β⁻', this.pos.x + 4, this.pos.y);
  }
}

/* ══════════════════════════════════════════════════════════════
   PARTICLE — Fission flash explosion
══════════════════════════════════════════════════════════════ */
class FissionFlash {
  constructor(x, y) {
    this.x     = x;
    this.y     = y;
    this.r     = 4;
    this.maxR  = 45 + Math.random() * 20;
    this.life  = 1.0;
    this.alive = true;
    this.shards = Array.from({ length: 8 }, () => ({
      angle: Math.random() * Math.PI * 2,
      speed: 2 + Math.random() * 3,
      dist:  0,
    }));
  }
  update() {
    this.r    += (this.maxR - this.r) * 0.18;
    this.life -= 0.045;
    this.shards.forEach(s => { s.dist += s.speed; });
    if (this.life <= 0) this.alive = false;
  }
  draw(ctx) {
    // Outer shockwave ring
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(255,180,50,${this.life * 0.5})`;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Inner glow
    const grd = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.r);
    grd.addColorStop(0,   `rgba(255,240,150,${this.life * 0.85})`);
    grd.addColorStop(0.3, `rgba(255,120,20,${this.life * 0.5})`);
    grd.addColorStop(1,   `rgba(255,50,0,0)`);
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
    ctx.fillStyle = grd;
    ctx.fill();

    // Energy shards
    this.shards.forEach(s => {
      const sx = this.x + Math.cos(s.angle) * s.dist;
      const sy = this.y + Math.sin(s.angle) * s.dist;
      ctx.beginPath();
      ctx.arc(sx, sy, 2.5, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,200,60,${this.life * 0.7})`;
      ctx.fill();
    });
  }
}

/* ══════════════════════════════════════════════════════════════
   PARTICLE — Sodium flow droplet
══════════════════════════════════════════════════════════════ */
class SodiumDrop {
  constructor(W, H) {
    this.pos   = new Vec2(Math.random() * W, H + 8);
    this.vel   = new Vec2((Math.random() - 0.5) * 0.6, -(0.7 + Math.random()));
    this.life  = 0.6 + Math.random() * 0.4;
    this.r     = 2 + Math.random() * 2;
    this.alive = true;
  }
  update() {
    this.pos.x += this.vel.x;
    this.pos.y += this.vel.y;
    this.life  -= 0.012;
    if (this.life <= 0) this.alive = false;
  }
  draw(ctx) {
    ctx.beginPath();
    ctx.arc(this.pos.x, this.pos.y, this.r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255,140,0,${this.life * 0.3})`;
    ctx.fill();
  }
}

/* ══════════════════════════════════════════════════════════════
   ATOM DRAW HELPER
══════════════════════════════════════════════════════════════ */
function drawAtom(ctx, x, y, r, color, label, sub = '', glow = 0.25, orbitals = 2) {
  // Extract RGB from hex for glow
  const isHex = color.startsWith('#');
  const rgb = isHex
    ? [parseInt(color.slice(1,3),16), parseInt(color.slice(3,5),16), parseInt(color.slice(5,7),16)]
    : [100, 200, 255];

  // Glow halo
  const grd = ctx.createRadialGradient(x, y, 0, x, y, r * 3);
  grd.addColorStop(0,  `rgba(${rgb},${glow})`);
  grd.addColorStop(1,  `rgba(${rgb},0)`);
  ctx.beginPath();
  ctx.arc(x, y, r * 3, 0, Math.PI * 2);
  ctx.fillStyle = grd;
  ctx.fill();

  // Electron orbital rings
  ctx.save();
  for (let i = 1; i <= orbitals; i++) {
    ctx.beginPath();
    ctx.ellipse(x, y, r * (1.7 + i * 0.55), r * (1.1 + i * 0.35), i * 0.38, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(255,255,255,${0.08 + i * 0.02})`;
    ctx.lineWidth = 0.8;
    ctx.stroke();
  }
  ctx.restore();

  // Nucleus
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.strokeStyle = `rgba(255,255,255,0.3)`;
  ctx.lineWidth = 1;
  ctx.stroke();

  // Labels
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle    = '#ffffff';
  ctx.font         = `bold ${Math.max(r * 0.68, 7)}px Rajdhani, sans-serif`;
  ctx.fillText(label, x, y - (sub ? r * 0.18 : 0));
  if (sub) {
    ctx.font      = `${Math.max(r * 0.42, 6)}px IBM Plex Mono, monospace`;
    ctx.fillStyle = 'rgba(255,255,255,0.65)';
    ctx.fillText(sub, x, y + r * 0.42);
  }
}

/* ══════════════════════════════════════════════════════════════
   MAIN SIMULATOR
══════════════════════════════════════════════════════════════ */
class ReactorSimulator {

  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;
    this.ctx   = this.canvas.getContext('2d');
    this.stage = 0;
    this.t     = 0;
    this.particles = [];
    this.effects   = [];
    this.running   = true;

    // Stage-level state accumulators
    this.puStock      = 0;
    this.u233Stock    = 0;
    this.breedRatio   = 0;
    this.fissionCount = 0;
    this.energyPct    = 0;
    this.selfSustain  = false;

    this._resizeObs = new ResizeObserver(() => this.resize());
    this._resizeObs.observe(this.canvas.parentElement);
    this.resize();
    this._raf = requestAnimationFrame(() => this.loop());
  }

  destroy() {
    this.running = false;
    if (this._resizeObs) this._resizeObs.disconnect();
    cancelAnimationFrame(this._raf);
  }

  resize() {
    const wrap = this.canvas.parentElement;
    const w    = wrap.clientWidth;
    const h    = Math.round(Math.min(w * 0.58, 520));
    this.canvas.width  = w;
    this.canvas.height = h;
    this.W  = w;
    this.H  = h;
    this.cx = w * 0.5;
    this.cy = h * 0.5;
    this.sc = Math.min(w / 800, 1.15);   // scale factor for text/radii
  }

  setStage(n) {
    this.stage      = n;
    this.particles  = [];
    this.effects    = [];
    this.t          = 0;
    this.puStock    = 0;
    this.u233Stock  = 0;
    this.breedRatio = 0;
    this.fissionCount = 0;
    this.energyPct  = 0;
    this.selfSustain = false;
  }

  // ── MAIN LOOP ──────────────────────────────────────────────
  loop() {
    if (!this.running) return;
    this._raf = requestAnimationFrame(() => this.loop());
    this.t++;

    const ctx = this.ctx;
    const { W, H } = this;

    // Clear + dark background
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = C.bg;
    ctx.fillRect(0, 0, W, H);

    // Stage bg tint
    const tints = [
      'rgba(35,18,0,0.45)',   // s1 amber
      'rgba(0,18,32,0.45)',   // s2 cyan
      'rgba(0,28,12,0.45)',   // s3 green
      'rgba(5,5,30,0.45)',    // finale indigo
    ];
    ctx.fillStyle = tints[this.stage] || tints[0];
    ctx.fillRect(0, 0, W, H);

    // Grid texture
    ctx.save();
    ctx.strokeStyle = 'rgba(0,212,255,0.035)';
    ctx.lineWidth   = 0.5;
    const gs = 32;
    for (let x = 0; x < W; x += gs) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,H); ctx.stroke(); }
    for (let y = 0; y < H; y += gs) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke(); }
    ctx.restore();

    // Render active stage
    switch (this.stage) {
      case 0: this._stage1(); break;
      case 1: this._stage2(); break;
      case 2: this._stage3(); break;
      case 3: this._finale(); break;
    }

    // Update + draw all particles and effects
    this.effects   = this.effects.filter(e  => { e.update(); return e.alive; });
    this.particles = this.particles.filter(p => { p.update(); return p.alive; });
    this.effects.forEach(e  => e.draw(ctx));
    this.particles.forEach(p => p.draw(ctx));
  }

  // ── UTILS ──────────────────────────────────────────────────
  pulse(period, phase = 0) {
    return 0.5 + 0.5 * Math.sin((this.t / period) * Math.PI * 2 + phase);
  }

  _text(text, x, y, color, size, align = 'center', base = 'middle', font = 'IBM Plex Mono, monospace') {
    const ctx = this.ctx;
    ctx.fillStyle    = color;
    ctx.font         = `${size * this.sc}px ${font}`;
    ctx.textAlign    = align;
    ctx.textBaseline = base;
    ctx.fillText(text, x, y);
  }

  _hdr(text, x, y, color = '#eef4fb', size = 14) {
    this._text(text, x, y, color, size, 'center', 'middle', 'Rajdhani, sans-serif');
    const ctx = this.ctx;
    ctx.font = `700 ${size * this.sc}px Rajdhani, sans-serif`;
    ctx.fillText(text, x, y);
  }

  _arrow(x1, y1, x2, y2, color = 'rgba(255,255,255,0.4)', dash = []) {
    const ctx = this.ctx;
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth   = 1.5;
    ctx.setLineDash(dash);
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    ctx.setLineDash([]);
    const a = Math.atan2(y2 - y1, x2 - x1);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - 10 * Math.cos(a - 0.38), y2 - 10 * Math.sin(a - 0.38));
    ctx.lineTo(x2 - 10 * Math.cos(a + 0.38), y2 - 10 * Math.sin(a + 0.38));
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  _bar(label, val, max, x, y, w, h, color) {
    const ctx = this.ctx;
    const pct = Math.min(val / max, 1);
    ctx.fillStyle   = 'rgba(255,255,255,0.04)';
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth   = 1;
    ctx.beginPath(); ctx.roundRect(x, y, w, h, 3); ctx.fill(); ctx.stroke();
    if (pct > 0) {
      const gr = ctx.createLinearGradient(x, 0, x + w, 0);
      gr.addColorStop(0, color + '88');
      gr.addColorStop(1, color);
      ctx.fillStyle = gr;
      ctx.beginPath(); ctx.roundRect(x, y, w * pct, h, 3); ctx.fill();
    }
    ctx.fillStyle    = '#607080';
    ctx.font         = `${8 * this.sc}px IBM Plex Mono, monospace`;
    ctx.textAlign    = 'left';
    ctx.textBaseline = 'bottom';
    ctx.fillText(label, x, y - 2);
    ctx.textAlign = 'right';
    ctx.fillStyle = color;
    ctx.fillText((pct * 100).toFixed(0) + '%', x + w, y - 2);
  }

  _panel(x, y, w, h, borderColor = 'rgba(0,212,255,0.2)') {
    const ctx = this.ctx;
    ctx.fillStyle   = 'rgba(13,19,33,0.88)';
    ctx.strokeStyle = borderColor;
    ctx.lineWidth   = 1;
    ctx.beginPath(); ctx.roundRect(x, y, w, h, 6); ctx.fill(); ctx.stroke();
  }

  // ══════════════════════════════════════════════════════════
  //  STAGE 1 — PHWR  (D₂O moderator + Pu-239 breeding chain)
  // ══════════════════════════════════════════════════════════
  _stage1() {
    const ctx            = this.ctx;
    const { W, H, cx, cy, sc } = this;

    // ── D₂O moderator vessel (left ~55%) ──────────────────
    const modX = W * 0.04, modY = H * 0.08;
    const modW = W * 0.50, modH = H * 0.82;
    const d2oP = this.pulse(100);

    ctx.fillStyle   = `rgba(10,35,80,0.55)`;
    ctx.strokeStyle = `rgba(0,120,200,${0.3 + d2oP * 0.15})`;
    ctx.lineWidth   = 1.5;
    ctx.beginPath(); ctx.roundRect(modX, modY, modW, modH, 8); ctx.fill(); ctx.stroke();

    // D₂O label
    ctx.save();
    ctx.globalAlpha = 0.35;
    ctx.fillStyle   = '#1a6faa';
    ctx.font        = `bold ${18 * sc}px Rajdhani, sans-serif`;
    ctx.textAlign   = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('D₂O  HEAVY WATER MODERATOR', modX + modW * 0.5, modY + 8 * sc);
    ctx.restore();

    // Animated D₂O molecules (background field)
    for (let i = 0; i < 16; i++) {
      const mx = modX + 28 * sc + (i % 8) * ((modW - 56 * sc) / 8) + Math.sin(this.t * 0.018 + i) * 5;
      const my = modY + 36 * sc + Math.floor(i / 8) * (modH * 0.38) + Math.cos(this.t * 0.013 + i * 0.9) * 4;
      ctx.beginPath();
      ctx.arc(mx, my, 8 * sc, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(0,140,210,${0.18 + 0.08 * Math.sin(this.t * 0.03 + i)})`;
      ctx.lineWidth   = 0.8;
      ctx.stroke();
      ctx.fillStyle = `rgba(0,60,140,0.25)`;
      ctx.fill();
      ctx.fillStyle = 'rgba(0,170,255,0.45)';
      ctx.font      = `${7 * sc}px monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('D₂O', mx, my + 0.5);
    }

    // ── U-235 fission atom (center of moderator) ──────────
    const u5x = modX + modW * 0.38;
    const u5y = cy + 5 * sc;
    const u5r = 22 * sc;

    drawAtom(ctx, u5x, u5y, u5r, C.u235, '²³⁵U', '92p', 0.2 + this.pulse(55) * 0.15);

    // Fission events
    if (this.t % 85 === 0) {
      this.effects.push(new FissionFlash(u5x, u5y));
      for (let i = 0; i < 3; i++) {
        const n = new Neutron(u5x, u5y, true);
        n.decay = 0.01;
        this.particles.push(n);
      }
      this.fissionCount = Math.min(this.fissionCount + 1, 18);
      this.puStock      = Math.min(this.puStock + 2.5, 100);
      this.energyPct    = Math.min(this.energyPct + 3,  100);
    }

    // Thermal neutrons drifting toward U-235
    if (this.t % 28 === 0) {
      const n = new Neutron(modX + 12 + Math.random() * 30, modY + 40 + Math.random() * (modH - 80), false, u5x, u5y);
      this.particles.push(n);
    }

    // FISSION label
    this._text('FISSION', u5x, u5y - u5r * 2.2 - 4 * sc, C.amber, 8.5);

    // Electricity bolt icon above
    ctx.fillStyle = `rgba(255,220,0,${0.4 + this.pulse(40) * 0.4})`;
    ctx.font = `${18 * sc}px serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('⚡', u5x, u5y - u5r * 3.5);

    // ── Breeding chain column (right of moderator) ─────────
    const cX  = modX + modW * 0.72;
    const cY0 = modY + modH * 0.10;
    const cY3 = modY + modH * 0.90;
    const cStep = (cY3 - cY0) / 3;
    const aR    = 16 * sc;

    // U-238 absorbs neutron → U-239
    drawAtom(ctx, cX, cY0, aR, C.u238, '²³⁸U', '', 0.12);
    // neutron absorption arrow
    const absAlpha = 0.45 + this.pulse(70) * 0.3;
    ctx.globalAlpha = absAlpha;
    this._arrow(cX - aR * 3.2, cY0, cX - aR - 1, cY0, `rgba(68,170,255,0.8)`, [3, 3]);
    ctx.globalAlpha = 1;
    this._text('+ n', cX - aR * 3.8, cY0 - 9 * sc, 'rgba(68,170,255,0.7)', 8);

    // U-239
    const u9y = cY0 + cStep;
    drawAtom(ctx, cX, u9y, aR * 0.85, '#9b7a1a', '²³⁹U', '', 0.1);
    this._arrow(cX, cY0 + aR + 1, cX, u9y - aR * 0.85 - 2, 'rgba(136,255,170,0.5)');
    this._text('β⁻  23.5 min', cX + 36 * sc, (cY0 + u9y) * 0.5, C.beta, 7.5);
    if (this.t % 70 === 15) this.particles.push(new BetaParticle(cX, (cY0 + u9y) * 0.5));

    // Np-239
    const npy = cY0 + cStep * 2;
    drawAtom(ctx, cX, npy, aR * 0.85, '#6b46c1', '²³⁹Np', '93p', 0.12);
    this._arrow(cX, u9y + aR * 0.85 + 1, cX, npy - aR * 0.85 - 2, 'rgba(136,255,170,0.5)');
    this._text('β⁻  2.36 d', cX + 36 * sc, (u9y + npy) * 0.5, C.beta, 7.5);
    if (this.t % 70 === 35) this.particles.push(new BetaParticle(cX, (u9y + npy) * 0.5));

    // Pu-239 (prize)
    const puGlow = 0.2 + this.pulse(45) * 0.3;
    drawAtom(ctx, cX, cY3, 20 * sc, C.pu239, '²³⁹Pu', '94p', puGlow);
    this._arrow(cX, npy + aR * 0.85 + 1, cX, cY3 - 22 * sc, 'rgba(159,122,234,0.6)');
    this._text('β⁻  2.36 d', cX + 36 * sc, (npy + cY3) * 0.5, C.beta, 7.5);
    if (this.t % 70 === 55) this.particles.push(new BetaParticle(cX, (npy + cY3) * 0.5));

    // ── Right stats panel ──────────────────────────────────
    const pX = W * 0.62, pY = H * 0.06, pW = W * 0.36, pH = H * 0.88;
    this._panel(pX, pY, pW, pH, `rgba(245,158,11,0.25)`);
    this._hdr('STAGE 1 · PHWR', pX + pW * 0.5, pY + 20 * sc, C.s1, 13);

    const mx = pX + pW * 0.1, mw = pW * 0.8;
    let my = pY + 42 * sc;

    this._bar('GRID POWER OUTPUT',  this.energyPct,    100, mx, my, mw, 9 * sc, C.amber);   my += 32 * sc;
    this._bar('Pu-239 STOCKPILE',   this.puStock,      100, mx, my, mw, 9 * sc, C.pu239);   my += 32 * sc;
    this._bar('FISSION EVENTS',     this.fissionCount,  18, mx, my, mw, 9 * sc, C.s1);      my += 40 * sc;

    // Callout box
    ctx.fillStyle = 'rgba(245,158,11,0.08)';
    ctx.strokeStyle = 'rgba(245,158,11,0.2)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.roundRect(mx - 2, my - 4, mw + 4, 76 * sc, 4); ctx.fill(); ctx.stroke();

    this._text('FLEET STATUS', mx + mw * 0.5, my + 10 * sc, C.amber, 9, 'center', 'middle', 'Rajdhani, sans-serif');
    const s1s = ['20+ PHWRs · 8.78 GW installed', 'KAPP-4 700MWe · Aug 2024', '10 fleet-mode PHWRs building', 'Target: Pu stockpile for FBR'];
    s1s.forEach((l, i) => this._text(l, mx + 2, my + (24 + i * 12) * sc, '#c8d6e5', 7.5, 'left'));
    my += 90 * sc;

    // Legend
    const legItems = [
      { col: C.fast_n,    label: 'Fast neutron  (~2 MeV)' },
      { col: C.thermal_n, label: 'Thermal neutron (slow)' },
      { col: C.beta,      label: 'β⁻ decay product' },
    ];
    legItems.forEach((li, i) => {
      const ly = my + i * 16 * sc;
      ctx.beginPath(); ctx.arc(mx + 6, ly, 4 * sc, 0, Math.PI * 2);
      ctx.fillStyle = li.col; ctx.fill();
      this._text(li.label, mx + 16, ly, '#607080', 7.5, 'left');
    });
  }

  // ══════════════════════════════════════════════════════════
  //  STAGE 2 — FBR  (Fast breeding, self-sustaining threshold)
  // ══════════════════════════════════════════════════════════
  _stage2() {
    const ctx               = this.ctx;
    const { W, H, cx, cy, sc } = this;

    // Sodium coolant ambient glow
    const naAlpha = 0.07 + this.pulse(70) * 0.04;
    ctx.fillStyle = `rgba(200,90,0,${naAlpha})`;
    ctx.fillRect(0, 0, W, H);

    // Sodium flow particles
    if (this.t % 5 === 0) this.particles.push(new SodiumDrop(W, H));

    // ── Left info strip ────────────────────────────────────
    const lpW = W * 0.16, lpH = H * 0.82;
    const lpX = W * 0.02, lpY = H * 0.09;
    this._panel(lpX, lpY, lpW, lpH, 'rgba(0,212,255,0.15)');
    this._hdr('FAST\nNEUTRONS', lpX + lpW * 0.5, lpY + 20 * sc, C.s2, 10);

    const lpItems = [
      ['~2 MeV', 'energy'],
      ['No', 'moderator'],
      ['Liquid Na', 'coolant'],
      ['~200°C', 'sodium temp'],
      ['η > 1', 'breeding OK'],
    ];
    lpItems.forEach(([v, l], i) => {
      const iy = lpY + 48 * sc + i * 38 * sc;
      this._text(v, lpX + lpW * 0.5, iy,         C.cyan, 11, 'center', 'middle', 'Rajdhani, sans-serif');
      this._text(l, lpX + lpW * 0.5, iy + 13 * sc, '#607080', 7.5);
    });

    // ── Core geometry (center) ─────────────────────────────
    const coreCX = W * 0.46;
    const coreCY = cy + 10 * sc;
    const coreR  = 52 * sc;
    const coreP  = this.pulse(42);

    // Core outer glow
    const cGrd = ctx.createRadialGradient(coreCX, coreCY, 0, coreCX, coreCY, coreR * 2.8);
    cGrd.addColorStop(0,   `rgba(159,122,234,${0.45 + coreP * 0.25})`);
    cGrd.addColorStop(0.55, `rgba(80,40,180,0.15)`);
    cGrd.addColorStop(1,    'rgba(0,0,0,0)');
    ctx.beginPath(); ctx.arc(coreCX, coreCY, coreR * 2.8, 0, Math.PI * 2);
    ctx.fillStyle = cGrd; ctx.fill();

    // Core body
    ctx.beginPath(); ctx.arc(coreCX, coreCY, coreR, 0, Math.PI * 2);
    ctx.fillStyle   = 'rgba(70,35,170,0.65)';
    ctx.strokeStyle = `rgba(159,122,234,${0.7 + coreP * 0.3})`;
    ctx.lineWidth   = 2;
    ctx.fill(); ctx.stroke();

    // Inner plasma rings (rotating)
    for (let i = 0; i < 3; i++) {
      const ringA = this.t * 0.008 * (i % 2 === 0 ? 1 : -1) + i * 1.2;
      ctx.save();
      ctx.globalAlpha = 0.2 + i * 0.05;
      ctx.strokeStyle = `rgba(200,160,255,0.6)`;
      ctx.lineWidth   = 1;
      ctx.beginPath();
      ctx.ellipse(coreCX, coreCY, coreR * 0.6, coreR * 0.25, ringA, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle    = '#ffffff';
    ctx.font         = `bold ${13 * sc}px Rajdhani, sans-serif`;
    ctx.fillText('Pu-239', coreCX, coreCY - 7 * sc);
    ctx.font      = `${8 * sc}px IBM Plex Mono, monospace`;
    ctx.fillStyle = 'rgba(200,190,255,0.7)';
    ctx.fillText('MOX CORE', coreCX, coreCY + 8 * sc);

    // ── Thorium blanket ring ───────────────────────────────
    const blR1 = coreR + 18 * sc;
    const blR2 = coreR + 54 * sc;
    const blMid = (blR1 + blR2) / 2;
    const blAlpha = 0.28 + this.pulse(65) * 0.15;

    ctx.beginPath(); ctx.arc(coreCX, coreCY, blMid, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(34,197,94,${blAlpha})`;
    ctx.lineWidth   = blR2 - blR1;
    ctx.stroke();

    this._text('Th-232 BLANKET', coreCX, coreCY - blR2 - 11 * sc, 'rgba(34,197,94,0.75)', 8.5);
    this._text('BREEDING ZONE',  coreCX, coreCY - blR2 - 1  * sc, 'rgba(34,197,94,0.45)', 7.5);

    // ── Fast neutrons from core ────────────────────────────
    if (this.t % 10 === 0) {
      const n = new Neutron(coreCX, coreCY, true);
      n.decay = 0.014;
      n.speed = 4.5 + Math.random() * 2.5;
      this.particles.push(n);
    }

    // ── Th-232 → U-233 conversion nodes on blanket ────────
    const convNodes = 7;
    for (let i = 0; i < convNodes; i++) {
      const angle = (i / convNodes) * Math.PI * 2 + this.t * 0.003;
      const nx = coreCX + Math.cos(angle) * blMid;
      const ny = coreCY + Math.sin(angle) * blMid;
      const conv = Math.sin(this.t * 0.05 + i * 0.9) > 0.55;
      const nP   = this.pulse(55, i);

      ctx.beginPath(); ctx.arc(nx, ny, 9 * sc, 0, Math.PI * 2);
      ctx.fillStyle   = conv ? `rgba(34,197,94,${0.5 + nP * 0.3})`  : `rgba(22,163,74,${0.2 + nP * 0.15})`;
      ctx.strokeStyle = conv ? `rgba(34,197,94,${0.8})` : `rgba(22,163,74,0.35)`;
      ctx.lineWidth   = 1;
      ctx.fill(); ctx.stroke();

      ctx.fillStyle    = conv ? '#ffffff' : 'rgba(200,255,200,0.65)';
      ctx.font         = `${6.5 * sc}px IBM Plex Mono, monospace`;
      ctx.textAlign    = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(conv ? '²³³U' : '²³²Th', nx, ny);

      // Occasional thermal neutron emitted from U-233 node
      if (conv && this.t % 45 === i * 6) {
        const tn = new Neutron(nx, ny, false, coreCX, coreCY);
        this.particles.push(tn);
      }
    }

    // ── Right panel — breeding ratio + status ──────────────
    this.breedRatio = Math.min(this.breedRatio + 0.0025, 1.3);
    const selfNow   = this.breedRatio >= 0.77;
    const bPct      = this.breedRatio / 1.3;

    const pX = W * 0.62, pY = H * 0.06, pW = W * 0.36, pH = H * 0.88;
    const pBorder = selfNow
      ? `rgba(34,197,94,${0.4 + this.pulse(28) * 0.3})`
      : 'rgba(0,212,255,0.25)';
    this._panel(pX, pY, pW, pH, pBorder);
    this._hdr('STAGE 2 · FBR', pX + pW * 0.5, pY + 20 * sc, C.s2, 13);

    const mx = pX + pW * 0.1, mw = pW * 0.8;
    let my = pY + 44 * sc;

    // Breeding ratio bar (special — threshold marker)
    ctx.fillStyle   = '#607080';
    ctx.font        = `${8 * sc}px IBM Plex Mono, monospace`;
    ctx.textAlign   = 'left';
    ctx.textBaseline = 'bottom';
    ctx.fillText('BREEDING RATIO (η)', mx, my - 2);
    ctx.textAlign = 'right';
    ctx.fillStyle = selfNow ? C.green : C.cyan;
    ctx.fillText(this.breedRatio.toFixed(2) + '×', mx + mw, my - 2);

    // Track
    ctx.fillStyle   = 'rgba(255,255,255,0.04)';
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth   = 1;
    ctx.beginPath(); ctx.roundRect(mx, my, mw, 11 * sc, 3); ctx.fill(); ctx.stroke();

    // Fill gradient (cyan → green past threshold)
    const brGrd = ctx.createLinearGradient(mx, 0, mx + mw, 0);
    brGrd.addColorStop(0,   'rgba(0,212,255,0.55)');
    brGrd.addColorStop(0.77,'rgba(0,212,255,0.75)');
    brGrd.addColorStop(0.78, 'rgba(34,197,94,0.85)');
    brGrd.addColorStop(1,    'rgba(34,197,94,1)');
    ctx.fillStyle = brGrd;
    ctx.beginPath(); ctx.roundRect(mx, my, mw * bPct, 11 * sc, 3); ctx.fill();

    // Threshold line at η = 1.0
    const thX = mx + mw * (1.0 / 1.3);
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,100,0.9)';
    ctx.lineWidth   = 1.5;
    ctx.setLineDash([3, 2]);
    ctx.beginPath(); ctx.moveTo(thX, my - 5); ctx.lineTo(thX, my + 13 * sc + 5); ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
    ctx.fillStyle    = 'rgba(255,255,100,0.8)';
    ctx.font         = `${7 * sc}px IBM Plex Mono, monospace`;
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('η = 1.0', thX, my + 14 * sc);

    my += 40 * sc;

    this._bar('U-233 PRODUCED',   Math.min(this.breedRatio * 77, 100), 100, mx, my, mw, 9 * sc, C.green);  my += 30 * sc;
    this._bar('SODIUM FLOW',      88, 100, mx, my, mw, 9 * sc, C.sodium);  my += 30 * sc;
    this._bar('NEUTRON FLUX',     96, 100, mx, my, mw, 9 * sc, C.fast_n);  my += 36 * sc;

    // Self-sustaining callout
    if (selfNow) {
      const ssA = 0.75 + this.pulse(22) * 0.25;
      ctx.fillStyle   = `rgba(34,197,94,${ssA * 0.14})`;
      ctx.strokeStyle = `rgba(34,197,94,${ssA * 0.65})`;
      ctx.lineWidth   = 1.5;
      ctx.beginPath(); ctx.roundRect(mx - 2, my, mw + 4, 58 * sc, 5); ctx.fill(); ctx.stroke();
      ctx.fillStyle    = `rgba(34,197,94,${ssA})`;
      ctx.font         = `bold ${12 * sc}px Rajdhani, sans-serif`;
      ctx.textAlign    = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('⚡ SELF-SUSTAINING', mx + mw * 0.5, my + 17 * sc);
      this._text('Breeding ratio > 1.0',          mx + mw * 0.5, my + 32 * sc, `rgba(180,255,190,${ssA * 0.85})`, 8);
      this._text('More fuel created than consumed', mx + mw * 0.5, my + 44 * sc, `rgba(180,255,190,${ssA * 0.7})`, 7.5);
      my += 68 * sc;
    } else {
      my += 16 * sc;
    }

    // Status block
    ctx.fillStyle   = 'rgba(0,212,255,0.07)';
    ctx.strokeStyle = 'rgba(0,212,255,0.15)';
    ctx.lineWidth   = 1;
    ctx.beginPath(); ctx.roundRect(mx - 2, my, mw + 4, 72 * sc, 4); ctx.fill(); ctx.stroke();

    this._text('PFBR · KALPAKKAM', mx + mw * 0.5, my + 12 * sc, C.s2, 10, 'center', 'middle', 'Rajdhani, sans-serif');
    const s2s = ['► 500 MWe · First criticality', '  April 6, 2026', '► India 2nd after Russia', '► Twin 600 MWe FBR approved'];
    s2s.forEach((l, i) => this._text(l, mx + 4, my + (26 + i * 11) * sc, '#c8d6e5', 8, 'left'));
  }

  // ══════════════════════════════════════════════════════════
  //  STAGE 3 — AHWR  (²³³U + Th self-sustaining, GDWP)
  // ══════════════════════════════════════════════════════════
  _stage3() {
    const ctx                  = this.ctx;
    const { W, H, cx, cy, sc } = this;

    // ── GDWP passive safety pool at top ───────────────────
    const gpW = W * 0.5, gpH = H * 0.17;
    const gpX = cx - gpW * 0.5, gpY = H * 0.04;
    const gP  = this.pulse(90);

    ctx.fillStyle   = `rgba(0,60,140,${0.3 + gP * 0.08})`;
    ctx.strokeStyle = `rgba(0,160,255,${0.45 + gP * 0.2})`;
    ctx.lineWidth   = 1.5;
    ctx.beginPath(); ctx.roundRect(gpX, gpY, gpW, gpH, 6); ctx.fill(); ctx.stroke();

    // Water surface ripples
    for (let i = 1; i <= 4; i++) {
      const rw = (gpW * 0.06) + i * gpW * 0.1 + gP * gpW * 0.04;
      if (rw < gpW * 0.47) {
        ctx.beginPath();
        ctx.ellipse(cx, gpY + gpH * 0.55, rw, rw * 0.2, 0, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(0,200,255,${(0.35 - i * 0.06) * gP})`;
        ctx.lineWidth   = 0.7;
        ctx.stroke();
      }
    }
    this._text('GRAVITY-DRIVEN WATER POOL  (GDWP)', cx, gpY + gpH * 0.38, 'rgba(0,160,255,0.75)', 8.5);
    this._text('Passive safety · 30-day cooling · zero power · zero operator action', cx, gpY + gpH * 0.68, 'rgba(0,130,220,0.5)', 7.5);

    // Gravity feed arrow to reactor
    this._arrow(cx, gpY + gpH, cx, gpY + gpH + 20 * sc, 'rgba(0,150,255,0.55)');

    // ── Reactor core (center) ──────────────────────────────
    const coreCX = cx;
    const coreCY = cy + 22 * sc;
    const coreR  = 44 * sc;
    const cP     = this.pulse(48);

    const cgrd = ctx.createRadialGradient(coreCX, coreCY, 0, coreCX, coreCY, coreR * 2.8);
    cgrd.addColorStop(0,   `rgba(34,197,94,${0.5 + cP * 0.2})`);
    cgrd.addColorStop(0.5, `rgba(16,120,50,0.2)`);
    cgrd.addColorStop(1,    'rgba(0,0,0,0)');
    ctx.beginPath(); ctx.arc(coreCX, coreCY, coreR * 2.8, 0, Math.PI * 2);
    ctx.fillStyle = cgrd; ctx.fill();

    ctx.beginPath(); ctx.arc(coreCX, coreCY, coreR, 0, Math.PI * 2);
    ctx.fillStyle   = 'rgba(16,100,45,0.7)';
    ctx.strokeStyle = `rgba(34,197,94,${0.75 + cP * 0.25})`;
    ctx.lineWidth   = 2;
    ctx.fill(); ctx.stroke();

    ctx.fillStyle    = '#eef4fb';
    ctx.font         = `bold ${12 * sc}px Rajdhani, sans-serif`;
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('²³³U + Th', coreCX, coreCY - 7 * sc);
    ctx.font      = `${7.5 * sc}px IBM Plex Mono, monospace`;
    ctx.fillStyle = 'rgba(200,255,200,0.7)';
    ctx.fillText('AHWR · Thermal spectrum', coreCX, coreCY + 8 * sc);

    // ── Self-sustaining cycle arcs ─────────────────────────
    const cycR = coreR + 48 * sc;
    for (let i = 0; i < 9; i++) {
      const a1 = (i / 9) * Math.PI * 2 + this.t * 0.006;
      const a2 = a1 + (Math.PI * 2 / 9) * 0.65;
      ctx.beginPath();
      ctx.arc(coreCX, coreCY, cycR, a1, a2);
      ctx.strokeStyle = `rgba(34,197,94,${0.22 + 0.14 * Math.sin(this.t * 0.04 + i)})`;
      ctx.lineWidth   = 2.5;
      ctx.stroke();
    }

    // ── Orbiting Th fuel elements ──────────────────────────
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2 + this.t * 0.009;
      const thX   = coreCX + Math.cos(angle) * (cycR + 20 * sc);
      const thY   = coreCY + Math.sin(angle) * (cycR + 20 * sc);
      const tP    = this.pulse(55, i);

      ctx.beginPath(); ctx.arc(thX, thY, 10 * sc, 0, Math.PI * 2);
      ctx.fillStyle   = `rgba(22,163,74,${0.45 + tP * 0.25})`;
      ctx.strokeStyle = `rgba(34,197,94,${0.7 + tP * 0.2})`;
      ctx.lineWidth   = 1; ctx.fill(); ctx.stroke();
      ctx.fillStyle    = '#ffffff';
      ctx.font         = `${6 * sc}px IBM Plex Mono, monospace`;
      ctx.textAlign    = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('²³²Th', thX, thY);

      // Thermal neutron toward core
      if (this.t % 38 === i * 6) {
        this.particles.push(new Neutron(thX, thY, false, coreCX, coreCY));
      }
    }

    // ── U-233 label with η > 2 note ────────────────────────
    const u3x = coreCX + cycR + 36 * sc, u3y = coreCY - 30 * sc;
    drawAtom(ctx, u3x, u3y, 13 * sc, C.u233, '²³³U', '', 0.25 + this.pulse(60) * 0.15);
    this._text('η > 2 in thermal', u3x, u3y + 24 * sc, 'rgba(34,197,94,0.65)', 7.5);
    this._text('spectrum (unique!)', u3x, u3y + 35 * sc, 'rgba(34,197,94,0.5)', 7);

    // ── Waste comparison bar (bottom) ──────────────────────
    const wY  = H * 0.82, wH = H * 0.12;
    const c1X = W * 0.03, c2X = W * 0.53, cW = W * 0.44;

    // Stage 1 waste
    ctx.fillStyle   = 'rgba(50,8,8,0.55)';
    ctx.strokeStyle = 'rgba(239,68,68,0.4)';
    ctx.lineWidth   = 1;
    ctx.beginPath(); ctx.roundRect(c1X, wY, cW, wH, 4); ctx.fill(); ctx.stroke();
    this._text('U-Pu CYCLE WASTE',            c1X + cW * 0.5, wY + 12 * sc, 'rgba(239,68,68,0.85)', 8.5);
    this._text('10,000+ YEARS radiotoxic',    c1X + cW * 0.5, wY + 25 * sc, '#c8d6e5', 8);
    this._text('Deep geological repository needed', c1X + cW * 0.5, wY + 37 * sc, '#607080', 7.5);
    // Waste volume indicator bars (tall = bad)
    for (let i = 0; i < 14; i++) {
      const bx = c1X + 10 * sc + i * (cW - 20 * sc) / 14;
      const bh = (5 + Math.random() * 6) * sc;
      ctx.fillStyle = `rgba(239,68,68,${0.25 + i / 14 * 0.4})`;
      ctx.fillRect(bx, wY + wH - bh - 4 * sc, (cW - 20 * sc) / 14 - 2, bh);
    }

    // Stage 3 waste
    ctx.fillStyle   = 'rgba(4,22,10,0.55)';
    ctx.strokeStyle = 'rgba(34,197,94,0.4)';
    ctx.lineWidth   = 1;
    ctx.beginPath(); ctx.roundRect(c2X, wY, cW, wH, 4); ctx.fill(); ctx.stroke();
    this._text('THORIUM CYCLE WASTE',         c2X + cW * 0.5, wY + 12 * sc, 'rgba(34,197,94,0.85)', 8.5);
    this._text('300–500 YEARS to safe baseline', c2X + cW * 0.5, wY + 25 * sc, '#c8d6e5', 8);
    this._text('No permanent repository needed',  c2X + cW * 0.5, wY + 37 * sc, '#607080', 7.5);
    for (let i = 0; i < 14; i++) {
      const bx = c2X + 10 * sc + i * (cW - 20 * sc) / 14;
      ctx.fillStyle = `rgba(34,197,94,${0.3 + i / 14 * 0.25})`;
      ctx.fillRect(bx, wY + wH - 2.5 * sc - 4 * sc, (cW - 20 * sc) / 14 - 2, 2.5 * sc);
    }

    // ── Right info panel ───────────────────────────────────
    const rpX = W * 0.73, rpY = H * 0.28, rpW = W * 0.25, rpH = H * 0.5;
    this._panel(rpX, rpY, rpW, rpH, `rgba(34,197,94,${0.25 + this.pulse(38) * 0.12})`);
    this._hdr('STAGE 3 · AHWR', rpX + rpW * 0.5, rpY + 18 * sc, C.s3, 11);

    const i3 = [
      ['²³³U', 'fissile driver'],
      ['²³²Th', 'fertile source'],
      ['η > 2', 'in thermal spectrum'],
      ['GDWP', '30-day passive safe'],
      ['300 MWe', 'AHWR-300 design'],
      ['BARC', 'design complete'],
    ];
    i3.forEach(([v, l], i) => {
      const iy = rpY + 42 * sc + i * 30 * sc;
      this._text(v, rpX + rpW * 0.5, iy,           C.s3, 11, 'center', 'middle', 'Rajdhani, sans-serif');
      this._text(l, rpX + rpW * 0.5, iy + 13 * sc, '#607080', 7);
    });
  }

  // ══════════════════════════════════════════════════════════
  //  FINALE — India Energy Independence
  // ══════════════════════════════════════════════════════════
  _finale() {
    const ctx                  = this.ctx;
    const { W, H, cx, cy, sc } = this;

    // ── Simplified India map (normalised outline) ──────────
    const iPath = [
      [0.36,0.05],[0.54,0.05],[0.71,0.12],[0.79,0.22],[0.81,0.34],
      [0.74,0.42],[0.77,0.52],[0.71,0.63],[0.63,0.69],[0.56,0.79],
      [0.50,0.93],[0.45,0.96],[0.40,0.86],[0.31,0.76],[0.21,0.66],
      [0.17,0.55],[0.14,0.42],[0.19,0.30],[0.24,0.20],[0.29,0.12],
    ];
    const mX = W * 0.06, mY = H * 0.05;
    const mW = W * 0.52, mH = H * 0.90;

    ctx.beginPath();
    iPath.forEach(([nx, ny], i) => {
      const px = mX + nx * mW, py = mY + ny * mH;
      i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
    });
    ctx.closePath();
    ctx.fillStyle   = 'rgba(10,22,45,0.72)';
    ctx.strokeStyle = `rgba(0,212,255,${0.3 + this.pulse(80) * 0.1})`;
    ctx.lineWidth   = 1.5;
    ctx.fill(); ctx.stroke();

    // ── Kerala coast — Thorium deposits ───────────────────
    const thDeps = [[0.38,0.83],[0.41,0.87],[0.37,0.89],[0.43,0.85],[0.45,0.81],[0.35,0.85]];
    thDeps.forEach(([nx, ny]) => {
      const px = mX + nx * mW, py = mY + ny * mH;
      const dP = this.pulse(55, nx * 8);
      ctx.beginPath(); ctx.arc(px, py, (6 + dP * 4) * sc, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(34,197,94,${0.15 + dP * 0.2})`; ctx.fill();
      ctx.beginPath(); ctx.arc(px, py, 3 * sc, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(34,197,94,${0.85 + dP * 0.15})`; ctx.fill();
    });
    ctx.fillStyle = 'rgba(34,197,94,0.7)';
    ctx.font = `${7.5 * sc}px IBM Plex Mono, monospace`;
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillText('KERALA  11.9M t Th', mX + 0.47 * mW, mY + 0.85 * mH);

    // ── Reactor sites ──────────────────────────────────────
    const sites = [
      { name: 'KALPAKKAM',  nx: 0.52, ny: 0.78, s: 2, label: 'FBR LIVE 2026' },
      { name: 'RAWATBHATA', nx: 0.34, ny: 0.40, s: 1, label: '700 MWe' },
      { name: 'KAKRAPAR',   nx: 0.28, ny: 0.47, s: 1, label: 'KAPP-4' },
      { name: 'GORAKHPUR',  nx: 0.43, ny: 0.27, s: 1, label: 'Fleet' },
      { name: 'TARAPUR',    nx: 0.25, ny: 0.51, s: 1, label: 'PHWR' },
    ];

    sites.forEach(rs => {
      const rx = mX + rs.nx * mW, ry = mY + rs.ny * mH;
      const rP = this.pulse(38, rs.nx * 6);
      const rc = rs.s === 2 ? C.s2 : C.s1;

      // Pulse ring
      ctx.beginPath(); ctx.arc(rx, ry, (9 + rP * 7) * sc, 0, Math.PI * 2);
      ctx.fillStyle = rc + (rs.s === 2 ? '22' : '18'); ctx.fill();
      // Core dot
      ctx.beginPath(); ctx.arc(rx, ry, 4 * sc, 0, Math.PI * 2);
      ctx.fillStyle = rc; ctx.fill();

      // Radiating energy lines
      ctx.save();
      ctx.globalAlpha = 0.15 + 0.1 * Math.sin(this.t * 0.04 + rs.nx * 10);
      ctx.strokeStyle = rc;
      ctx.lineWidth   = 0.8;
      ctx.setLineDash([3, 7]);
      for (let a = 0; a < 6; a++) {
        const la = (a / 6) * Math.PI * 2 + this.t * 0.008;
        ctx.beginPath();
        ctx.moveTo(rx, ry);
        ctx.lineTo(rx + Math.cos(la) * 35 * sc, ry + Math.sin(la) * 35 * sc);
        ctx.stroke();
      }
      ctx.setLineDash([]);
      ctx.restore();

      // Labels
      ctx.fillStyle    = rc;
      ctx.font         = `${7 * sc}px IBM Plex Mono, monospace`;
      ctx.textAlign    = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText(rs.name, rx, ry - 8 * sc);
      ctx.fillStyle = '#607080';
      ctx.font      = `${6.5 * sc}px IBM Plex Mono, monospace`;
      ctx.textBaseline = 'top';
      ctx.fillText(rs.label, rx, ry + 7 * sc);
    });

    // ── Right panel — independence tracker ────────────────
    const rpX = W * 0.61, rpY = H * 0.04, rpW = W * 0.37, rpH = H * 0.92;
    this._panel(rpX, rpY, rpW, rpH, `rgba(34,197,94,${0.28 + this.pulse(60) * 0.1})`);

    const pT = 0.75 + this.pulse(55) * 0.25;
    ctx.fillStyle    = `rgba(34,197,94,${pT})`;
    ctx.font         = `bold ${14 * sc}px Rajdhani, sans-serif`;
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('ENERGY INDEPENDENCE', rpX + rpW * 0.5, rpY + 20 * sc);
    this._text('INDIA · TARGET 2047', rpX + rpW * 0.5, rpY + 33 * sc, '#607080', 8);

    const mx = rpX + rpW * 0.1, mw = rpW * 0.8;
    let my = rpY + 50 * sc;

    const nucPct = Math.min(this.t / 380, 1);
    this._bar('NUCLEAR CAPACITY (GW)', nucPct * 100, 100, mx, my, mw, 9 * sc, C.s3); my += 30 * sc;
    ctx.fillStyle = C.s3; ctx.font = `${8 * sc}px IBM Plex Mono, monospace`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    ctx.fillText((nucPct * 100).toFixed(1) + ' GW  →  target 100 GW', mx + mw * 0.5, my - 26 * sc);

    const stageData = [
      { l: 'Stage 1 · PHWR', p: 85,  c: C.s1 },
      { l: 'Stage 2 · FBR',  p: 15,  c: C.s2 },
      { l: 'Stage 3 · AHWR', p: 1.5, c: C.s3 },
    ];
    stageData.forEach(s => {
      this._bar(s.l, s.p, 100, mx, my, mw, 8 * sc, s.c); my += 28 * sc;
    });
    my += 8 * sc;

    // Timeline
    this._text('PROGRAMME TIMELINE', mx + mw * 0.5, my + 6 * sc, C.amber, 9, 'center', 'middle', 'Rajdhani, sans-serif');
    my += 20 * sc;

    const milestones = [
      { yr: '2024', txt: 'KAPP-4 700MWe online',       done: true,  c: C.s1 },
      { yr: '2026', txt: 'PFBR first criticality ★',   done: true,  c: C.s2 },
      { yr: '2028', txt: 'PFBR commercial power',       done: false, c: C.s2 },
      { yr: '2032', txt: 'Twin 600MWe FBRs online',     done: false, c: C.s2 },
      { yr: '2035', txt: 'AHWR-300 construction start', done: false, c: C.s3 },
      { yr: '2047', txt: '100 GW nuclear milestone',    done: false, c: C.s3 },
    ];

    milestones.forEach((m, i) => {
      const dotX = mx + 6 * sc, dotY = my + 5 * sc;
      const isPfbr = m.yr === '2026';

      if (i < milestones.length - 1) {
        ctx.strokeStyle = 'rgba(96,112,128,0.28)';
        ctx.lineWidth   = 1;
        ctx.beginPath(); ctx.moveTo(dotX, dotY + 5 * sc); ctx.lineTo(dotX, dotY + 18 * sc); ctx.stroke();
      }

      if (isPfbr) {
        const pp = this.pulse(28);
        ctx.beginPath(); ctx.arc(dotX, dotY, (4 + pp * 4) * sc, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0,212,255,${0.2 + pp * 0.2})`; ctx.fill();
      }

      ctx.beginPath(); ctx.arc(dotX, dotY, 3.5 * sc, 0, Math.PI * 2);
      if (m.done) { ctx.fillStyle = m.c; ctx.fill(); }
      else { ctx.strokeStyle = m.c; ctx.lineWidth = 1; ctx.fillStyle = 'transparent'; ctx.fill(); ctx.stroke(); }

      ctx.fillStyle    = m.done ? m.c : '#607080';
      ctx.font         = `${8 * sc}px IBM Plex Mono, monospace`;
      ctx.textAlign    = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${m.yr} — ${m.txt}`, mx + 16 * sc, dotY);

      my += 16 * sc;
    });

    // The Thorium promise
    my += 8 * sc;
    const ta = 0.78 + this.pulse(55) * 0.22;
    ctx.fillStyle   = `rgba(34,197,94,${ta * 0.13})`;
    ctx.strokeStyle = `rgba(34,197,94,${ta * 0.45})`;
    ctx.lineWidth   = 1;
    ctx.beginPath(); ctx.roundRect(mx - 2, my, mw + 4, 68 * sc, 5); ctx.fill(); ctx.stroke();

    ctx.fillStyle    = `rgba(34,197,94,${ta})`;
    ctx.font         = `bold ${10 * sc}px Rajdhani, sans-serif`;
    ctx.textAlign    = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('THE THORIUM PROMISE', mx + mw * 0.5, my + 13 * sc);
    const lines = ['11.9M tonnes Thorium secured', 'Centuries of fuel · no imports', 'Waste safe in 300–500 years', 'Zero enrichment dependency'];
    lines.forEach((l, i) => this._text(l, mx + mw * 0.5, my + (28 + i * 10) * sc, `rgba(180,255,195,${ta * 0.85})`, 7.5));
  }
}

/* ══════════════════════════════════════════════════════════════
   BOOT
══════════════════════════════════════════════════════════════ */
let _sim = null;

function init() {
  _sim = new ReactorSimulator('nuclearCanvas');

  document.querySelectorAll('.nuk-tab').forEach((btn, i) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.nuk-tab').forEach(b => b.classList.remove('nuk-tab--active'));
      btn.classList.add('nuk-tab--active');
      _sim.setStage(i);
      if (typeof trackEvent === 'function') {
        trackEvent('nuclear_stage_view', { stage: i });
      }
    });
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

return { sim: () => _sim };

})();
