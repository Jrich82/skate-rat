// Skate Rat — halfpipe edition (StreamElements custom widget)
// The rat waits on a deck at the edge of the screen. On a stream event he drops in,
// rides the halfpipe and airs out of the far wall with a trick. More money = bigger air + bigger trick.
let F = {
  tier1: 5, tier2: 20, tier3: 50, tier4: 100, currency: "$",
  followerTrick: "grab", subscriberTrick: "grab", memberTrick: "t0",
  chatCommand: "!kickflip", chatCooldown: 30, bailChance: 15,
  idleMode: "perch", rampHeight: 220, rampOpacity: 85, rampText: "RATZ",
  hangTime: 100, size: 100, accent: "#ff2bd6", accent2: "#27f5ff", ratColor: "#8a7b96",
  ratImage: "https://raw.githubusercontent.com/Jrich82/skate-rat/main/art/rat-ride.png", ratIdleImage: "https://raw.githubusercontent.com/Jrich82/skate-rat/main/art/rat-idle.png",
  ratAirImage: "https://raw.githubusercontent.com/Jrich82/skate-rat/main/art/rat-air.png", boardImage: "https://raw.githubusercontent.com/Jrich82/skate-rat/main/art/board.png",
  showBanner: "yes", bannerSeconds: 6, sound: "", volume: 50
};

// ---------- trick catalog ----------
// spin: body rotation in degrees (180 = a normal air turn). flip: board flips (y = kick/heel axis, x = shove-it axis).
// grab: grab pose. invert: in-plane flip (McTwist). h: share of available sky. slowmo: hang at the peak.
const GRABS = {
  INDY:      { bx: 0,   by: -30, br: -6,  lean: 0 },
  MELON:     { bx: 8,   by: -24, br: 18,  lean: 4 },
  STALEFISH: { bx: -10, by: -26, br: -16, lean: -6 },
  METHOD:    { bx: -34, by: -50, br: -40, lean: 14 },
  MUTE:      { bx: 12,  by: -28, br: 10,  lean: 0 },
  JAPAN:     { bx: 18,  by: -44, br: 36,  lean: -8 },
  ROCKET:    { bx: 34,  by: -64, br: -78, lean: -4 }
};
const FLIPS = {
  KICKFLIP: { y: 1, x: 0 }, HEELFLIP: { y: -1, x: 0 }, VARIAL: { y: 0, x: 1 },
  "360 FLIP": { y: 1, x: 2 }, "DOUBLE KICKFLIP": { y: 2, x: 0 }
};
const T = (spin, flip, grab, h, extra = {}) => ({ spin, flip, grab, h, ...extra });
const POOLS = {
  grab: () => T(180, null, pick(["INDY", "MELON", "STALEFISH", "MUTE", "JAPAN"]), .40),
  t0:   () => pick([T(180, "KICKFLIP", null, .45), T(180, "HEELFLIP", null, .45), T(180, null, "METHOD", .48), T(180, "VARIAL", null, .45)]),
  t1:   () => pick([T(180, "360 FLIP", null, .55), T(360, null, "INDY", .58), T(360, null, "MUTE", .58), T(180, "360 FLIP", "INDY", .58)]),
  t2:   () => pick([T(540, null, "MELON", .70), T(540, null, "MUTE", .72, { invert: 1, name: "540 McTWIST" }), T(360, "KICKFLIP", null, .68), T(180, null, "ROCKET", .66)]),
  t3:   () => pick([T(720, null, "STALEFISH", .86, { slowmo: .7 }), T(720, "KICKFLIP", null, .86, { slowmo: .7 }), T(540, "360 FLIP", null, .84, { slowmo: .7 })]),
  t4:   () => pick([T(900, null, null, 1, { slowmo: .5, mega: 1, name: "THE 900" }), T(900, null, "INDY", 1, { slowmo: .5, mega: 1 })]),
  bail: () => T(180, "KICKFLIP", null, .45, { bail: 1 })
};
function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
function trickName(t) {
  if (t.bail) return "BAIL!";
  if (t.name) return t.name;
  const parts = [];
  if (t.spin > 180) parts.push(String(t.spin));
  if (t.flip) parts.push(t.flip);
  if (t.grab) parts.push(t.grab + (t.spin === 180 && !t.flip ? " AIR" : ""));
  return parts.join(" ") || "AIR";
}
function makeTrick(key) { const t = (POOLS[key] || POOLS.t0)(); t.label = trickName(t); return t; }

const lane = document.getElementById("lane");
const rampsSvg = document.getElementById("ramps");
const rider = document.getElementById("rider");
const spin = rider.querySelector(".spin");
const rat = rider.querySelector(".rat");
const board = rider.querySelector(".board");
const banner = document.getElementById("banner");

const BASE = 6;          // ground offset from bottom
let G = 650;             // gravity px/s² (lower = floatier)
let W = 0, Hh = 0, R = 200, D = 100, A = 0, FL = 0, L = 0;

let mode = "perch";      // perch | drop | ride | air | home
let side = -1;           // deck he's on (-1 left, 1 right)
let u = 0, v = 0, dir = 1, dirS = 1, fakie = false;
let air = null, tween = null;
let pending = null, current = null, crashed = false, recoverAt = 0, goingHome = false;
const queue = [];
let lastChat = 0, last = performance.now();

const S = () => F.size / 100;
const sky = () => Math.max(60, Math.min(Hh - R - BASE - 140 * S(), 560 * S()));

function applyFields() {
  const r = document.documentElement.style;
  r.setProperty("--a", F.accent); r.setProperty("--b", F.accent2);
  r.setProperty("--rat", F.ratColor); r.setProperty("--s", S());
  G = 650 * 100 / Math.max(40, F.hangTime);
  // custom art: transparent PNGs, side view, facing RIGHT
  const ride = F.ratImage || F.ratIdleImage || F.ratAirImage;
  if (ride) {
    rat.innerHTML = ["ride", "idle", "air"].map(p => {
      const src = (p === "idle" && F.ratIdleImage) || (p === "air" && F.ratAirImage) || ride;
      return `<img class="p-${p}" src="${esc(src)}" alt="">`;
    }).join("");
    lane.classList.add("art");
  }
  if (F.boardImage) { board.innerHTML = `<img src="${esc(F.boardImage)}" alt="">`; lane.classList.add("art-board"); }
  layout();
}

// ---------- halfpipe geometry ----------
function layout() {
  W = lane.clientWidth; Hh = lane.clientHeight;
  D = 100 * S();
  R = Math.max(80, Math.min(+F.rampHeight, Hh * 0.6, (W - 2 * D) * 0.35));
  A = Math.PI * R / 2; FL = Math.max(0, W - 2 * D - 2 * R); L = 2 * A + FL;
  drawRamps();
}
function at(q) {                     // point on the pipe, q = distance from top-left coping
  if (q <= A) { const a = (Math.PI / 2) * (1 - q / A);
    return { x: D + R - R * Math.sin(a), y: R - R * Math.cos(a), rot: a * 57.2958, dy: -Math.sin(a) }; }
  if (q <= A + FL) return { x: D + R + (q - A), y: 0, rot: 0, dy: 0 };
  const a = Math.min(Math.PI / 2, (q - A - FL) / R);
  return { x: W - D - R + R * Math.sin(a), y: R - R * Math.cos(a), rot: -a * 57.2958, dy: Math.sin(a) };
}
function drawRamps() {
  const Y = Hh - BASE, t = Y - R, txt = esc(F.rampText || ""), fs = Math.min(D * .42, 40);
  rampsSvg.setAttribute("viewBox", `0 0 ${W} ${Hh}`);
  rampsSvg.style.opacity = F.rampOpacity / 100;
  rampsSvg.innerHTML = `
    <defs><linearGradient id="rg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#1c1030" stop-opacity=".92"/><stop offset="1" stop-color="#0b0612" stop-opacity=".96"/></linearGradient></defs>
    <path d="M0 ${t} L${D} ${t} A${R} ${R} 0 0 0 ${D + R} ${Y} L0 ${Y} Z" fill="url(#rg)"/>
    <path d="M${W} ${t} L${W - D} ${t} A${R} ${R} 0 0 1 ${W - D - R} ${Y} L${W} ${Y} Z" fill="url(#rg)"/>
    <path d="M${D} ${t} A${R} ${R} 0 0 0 ${D + R} ${Y} L${W - D - R} ${Y} A${R} ${R} 0 0 0 ${W - D} ${t}"
      fill="none" stroke="var(--a)" stroke-width="5" style="filter:drop-shadow(0 0 8px var(--a))"/>
    <path d="M0 ${t} L${D} ${t} M${W - D} ${t} L${W} ${t}" stroke="var(--b)" stroke-width="4" style="filter:drop-shadow(0 0 6px var(--b))"/>
    <circle cx="${D}" cy="${t}" r="6" fill="#dfe3ea"/><circle cx="${W - D}" cy="${t}" r="6" fill="#dfe3ea"/>
    <text x="${D * .45}" y="${t + R * .55}" transform="rotate(-90 ${D * .45} ${t + R * .55})" text-anchor="middle"
      font-family="Rubik Mono One, Arial Black, sans-serif" font-size="${fs}" fill="var(--b)" opacity=".55">${txt}</text>
    <text x="${W - D * .45}" y="${t + R * .55}" transform="rotate(90 ${W - D * .45} ${t + R * .55})" text-anchor="middle"
      font-family="Rubik Mono One, Arial Black, sans-serif" font-size="${fs}" fill="var(--a)" opacity=".55">${txt}</text>`;
}
const perchX = s => s < 0 ? D - 8 * S() : W - D + 8 * S();

// ---------- render ----------
let pose = "";
function setPose(p) { if (p !== pose) { pose = p; rat.dataset.pose = p; } }
function place(x, y, rot, dS) {
  setPose(crashed ? "ride" : mode === "perch" || mode === "home" ? "idle" : mode === "air" || mode === "drop" ? "air" : "ride");
  rider.style.transform =
    `translate(${x - 80}px, ${Hh - BASE - y - 150}px) rotate(${rot}deg) scaleX(${dS}) scale(${S()})`;
}
const clamp01 = k => Math.max(0, Math.min(1, k));
const ease = k => k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;      // ease-in-out
const win = (k, a, b) => ease(clamp01((k - a) / (b - a)));                  // eased 0→1 between a and b
const hold = (k, a, b, f = .12) => Math.min(win(k, a, a + f), 1 - win(k, b - f, b)); // 0→1→0 with plateau

// pose of rider + board during the air, all driven by air progress k (0..1)
function airPose(k) {
  const t = air.trick, s = air.s;
  const rot = -s * 90 * (1 - Math.sin(Math.PI * k));        // vertical on the wall → upright at the peak
  const turn = t ? t.spin : 180;
  const theta = turn * win(k, .14, .86) * Math.PI / 180;    // body spin around the vertical axis
  const dS = s * Math.cos(theta);                            // seen from the side, a spin is a squash + mirror
  let bT = "", sT = "";
  if (t) {
    const fl = t.flip && FLIPS[t.flip];
    if (fl) {
      const fk = win(k, .26, .66);
      const ky = Math.cos(fk * Math.PI * 2 * Math.abs(fl.y)) || 1, kx = Math.cos(fk * Math.PI * 2 * fl.x * .5);
      bT += ` translateY(${-14 * Math.sin(fk * Math.PI)}px) scale(${fl.x ? kx : 1}, ${fl.y ? ky : 1})`;
    }
    const g = t.grab && GRABS[t.grab];
    if (g) {
      const gk = hold(k, .22, .78);
      bT = `translate(${g.bx * gk}px, ${g.by * gk}px) rotate(${g.br * gk}deg)` + bT;
      sT += ` rotate(${g.lean * gk}deg)`;
    }
    if (t.invert) sT += ` rotate(${-360 * win(k, .3, .75)}deg)`;
    if (t.bail) sT += ` rotate(${150 * win(k, .35, 1)}deg)`;
  }
  board.style.transform = bT;
  spin.style.transform = sT;
  return { rot, dS };
}

// ---------- main loop ----------
function targetHeight() {
  if (crashed) return 0;
  if (pending) return R + sky() * pending.h;
  if (goingHome) return R + 26 * S();
  return F.idleMode === "ride" ? R * 0.5 : R * 0.3;
}

function frame(t) {
  let dt = Math.min(0.033, (t - last) / 1000); last = t;
  if (mode === "perch") {
    place(perchX(side), R, 0, -side);
  } else if (mode === "drop" || mode === "home") {
    tween.t += dt;
    const k = Math.min(1, tween.t / tween.dur), e = k * k * (3 - 2 * k);
    place(tween.x0 + (tween.x1 - tween.x0) * e,
          tween.y0 + (tween.y1 - tween.y0) * e + Math.sin(k * Math.PI) * tween.arc,
          tween.r0 + (tween.r1 - tween.r0) * e, tween.d);
    if (k >= 1) tween.done();
  } else if (mode === "ride") {
    const p0 = at(u);
    v += -G * p0.dy * dt;
    if (p0.dy === 0) {                                  // pump / brake on the flat
      const tgt = Math.sqrt(2 * G * targetHeight()), sp = Math.abs(v);
      v = (v === 0 ? dir : Math.sign(v)) * (sp + (tgt - sp) * Math.min(1, dt * 5));
      if (fakie && Math.abs(at(u).x - W / 2) < W * .15) fakie = false;   // switch back around mid-flat
    }
    u += v * dt;
    if (v > 1) dir = 1; else if (v < -1) dir = -1;
    const want = fakie ? -dir : dir;
    dirS += (want - dirS) * Math.min(1, dt * (fakie ? 14 : 7));
    if (u >= L || u <= 0) {                             // reached a coping
      const s = u >= L ? 1 : -1; u = s > 0 ? L : 0;
      const vy = Math.abs(v);
      if (goingHome && !pending && !crashed) { goHome(s); requestAnimationFrame(frame); return; }
      if (vy < 40) v = -v * 0.5;
      else { mode = "air"; air = { s, y: R, vy, t: 0, tot: 2 * vy / G, trick: null }; startAir(); }
    }
    if (crashed && p0.dy === 0 && Math.abs(v) < 12) {
      if (!recoverAt) recoverAt = t + 1300;
      else if (t > recoverAt) recover();
    }
    if (mode === "ride") { const p = at(u); place(p.x, p.y, p.rot, dirS); }
  }
  if (mode === "air") {
    let k = air.t / air.tot;
    const slow = air.trick && air.trick.slowmo;
    if (slow) dt *= 1 - (1 - slow) * Math.sin(Math.PI * clamp01(k));   // ease into slow motion at the peak
    air.t += dt; air.vy -= G * dt; air.y += air.vy * dt;
    k = clamp01(air.t / air.tot);
    const p = airPose(k);
    place(air.s > 0 ? W - D : D, air.y, p.rot, p.dS);
    if (air.vy < 0 && air.y <= R) land();
  }
  requestAnimationFrame(frame);
}

// ---------- transitions ----------
function dropIn() {
  const s = side;
  mode = "drop";
  tween = { t: 0, dur: .55, x0: perchX(s), x1: s < 0 ? D : W - D, y0: R, y1: R, arc: 6 * S(),
    r0: 0, r1: s < 0 ? 90 : -90, d: -s,
    done() { mode = "ride"; u = s < 0 ? 0.5 : L - 0.5; v = -s * 50; dir = -s; dirS = dir; } };
}
function goHome(s) {
  goingHome = false; mode = "home";
  tween = { t: 0, dur: .6, x0: s < 0 ? D : W - D, x1: perchX(s), y0: R, y1: R, arc: 70 * S(),
    r0: s < 0 ? 90 : -90, r1: 0, d: -s,
    done() { mode = "perch"; side = s; next(); } };
}
function startAir() {
  if (!pending) return;
  current = pending; pending = null;
  air.trick = current;
  if (F.sound) { try { const a = new Audio(F.sound); a.volume = F.volume / 100; a.play(); } catch (e) {} }
  if (!current.bail) pop(current.label + "!", current.mega ? "mega" : "", air.tot * 1000 * (current.slowmo ? 1.6 : 1.1));
  if (current.mega) { setTimeout(() => confetti(air ? (air.s > 0 ? W - D - 160 * S() : D + 160 * S()) : W / 2, Hh * .55), air.tot * 450); flash(); }
}
function land() {
  const s = air.s, t = air.trick;
  const endFacing = s * Math.cos((t ? t.spin : 180) * Math.PI / 180);
  mode = "ride"; u = s > 0 ? L : 0; v = -s * Math.abs(air.vy); dir = -s;
  dirS = Math.sign(endFacing) || dir;
  fakie = dirS !== dir;
  board.style.transform = ""; spin.style.transform = "";
  sparks(s > 0 ? W - D : D, R, 8);
  air = null;
  if (current) {
    const wasBail = current.bail;
    current = null;
    if (wasBail) crash(); else setTimeout(next, 300);
  }
}
function crash() {
  crashed = true; recoverAt = 0; fakie = false;
  pop("BAIL!", "bail", 1800);
  anim(board, [{ transform: "none", opacity: 1 }, { transform: "translate(-140px,-60px) rotate(-200deg)", opacity: 0 }],
    { duration: 700, easing: "ease-out", fill: "forwards" });
  anim(rat, [{ transform: "translateY(-112px) rotate(178deg)" }, { transform: "translateY(-112px) rotate(166deg)" },
    { transform: "translateY(-112px) rotate(190deg)" }, { transform: "translateY(-112px) rotate(178deg)" }],
    { duration: 700, iterations: Infinity });
}
function recover() {
  crashed = false; recoverAt = 0;
  rat.getAnimations().forEach(a => a.cancel());
  board.getAnimations().forEach(a => a.cancel());
  anim(board, [{ opacity: 0 }, { opacity: 1 }], 300);
  anim(rat, [{ transform: "translateY(-18px)" }, { transform: "none" }], 300);
  v = dir * 80;
  next();
}

// ---------- effects ----------
const anim = (el, kf, o) => el.animate(kf, typeof o === "number" ? { duration: o } : o).finished;
function pop(text, cls = "", ms = 1800) {
  const el = document.createElement("div");
  el.className = "pop " + cls; el.textContent = text;
  const s = air ? air.s : dir;
  el.style.left = (cls === "bail" ? W / 2 : (s > 0 ? W - D - 250 * S() : D + 250 * S())) + "px";
  el.style.bottom = (cls === "bail" ? R * .6 : Math.min(Hh - 150, R + sky() * .45)) + "px";
  lane.appendChild(el);
  ms = Math.max(1400, ms);
  anim(el, [
    { transform: "translateX(-50%) scale(.4)", opacity: 0 },
    { transform: "translateX(-50%) scale(1.15)", opacity: 1, offset: 220 / ms },
    { transform: "translateX(-50%) scale(1)", opacity: 1, offset: 380 / ms },
    { transform: "translateX(-50%) translateY(-20px) scale(1)", opacity: 1, offset: 1 - 400 / ms },
    { transform: "translateX(-50%) translateY(-50px) scale(1)", opacity: 0 }
  ], ms).then(() => el.remove());
}
function sparks(x, y, n) {
  for (let i = 0; i < n; i++) {
    const s = document.createElement("div"); s.className = "spark";
    s.style.left = x + "px"; s.style.bottom = (y + BASE) + "px";
    lane.appendChild(s);
    const dx = (Math.random() - .5) * 120, dy = 20 + Math.random() * 70;
    anim(s, [{ transform: "translate(0,0)", opacity: 1 }, { transform: `translate(${dx}px,${-dy}px)`, opacity: 0 }],
      { duration: 350 + Math.random() * 300, easing: "ease-out" }).then(() => s.remove());
  }
}
function confetti(cx, cy, n = 60) {
  const cols = [F.accent, F.accent2, "#ffe34d", "#5cff8a", "#9b5cff", "#fff"];
  for (let i = 0; i < n; i++) {
    const c = document.createElement("div"); c.className = "conf";
    c.style.background = cols[i % cols.length]; c.style.left = cx + "px"; c.style.bottom = cy + "px";
    lane.appendChild(c);
    const a = Math.random() * Math.PI * 2, d = 120 + Math.random() * 300;
    anim(c, [{ transform: "translate(0,0) rotate(0)", opacity: 1 },
      { transform: `translate(${Math.cos(a) * d}px,${-Math.sin(a) * d + 200}px) rotate(${Math.random() * 720}deg)`, opacity: 0 }],
      { duration: 1800 + Math.random() * 1000, easing: "cubic-bezier(.1,.7,.4,1)" }).then(() => c.remove());
  }
}
function flash() {
  const f = document.createElement("div"); f.className = "flash"; lane.appendChild(f);
  anim(f, [{ opacity: 0 }, { opacity: .45, offset: .15 }, { opacity: 0 }], 1100).then(() => f.remove());
}

// ---------- banner + queue ----------
function showBanner(name, sub, msg) {
  if (F.showBanner !== "yes") return;
  banner.querySelector(".bName").textContent = name || "";
  banner.querySelector(".bSub").innerHTML = sub;
  banner.querySelector(".bMsg").textContent = msg || "";
  banner.getAnimations().forEach(a => a.cancel());
  const ms = Math.max(2, +F.bannerSeconds) * 1000;
  anim(banner, [
    { transform: "translateX(-50%) scale(.6) rotate(-4deg)", opacity: 0 },
    { transform: "translateX(-50%) scale(1.06) rotate(1deg)", opacity: 1, offset: 300 / ms },
    { transform: "translateX(-50%) scale(1) rotate(0)", opacity: 1, offset: 450 / ms },
    { transform: "translateX(-50%) scale(1)", opacity: 1, offset: 1 - 350 / ms },
    { transform: "translateX(-50%) scale(.8)", opacity: 0 }
  ], { duration: ms, fill: "forwards" });
}
function esc(t) { return String(t ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])); }

function play(job) { if (queue.length < 12) queue.push(job); next(); }
function next() {
  if (pending || current || crashed || mode === "drop" || mode === "home") return;
  const j = queue.shift();
  if (!j) { if (F.idleMode !== "ride" && mode !== "perch") goingHome = true; return; }
  goingHome = false;
  pending = j.trick;
  showBanner(j.name, j.sub(esc(j.trick.label)), j.msg);
  if (mode === "perch") dropIn();
}

function tierFor(amt) {
  if (amt >= F.tier4) return "t4";
  if (amt >= F.tier3) return "t3";
  if (amt >= F.tier2) return "t2";
  if (amt >= F.tier1) return "t1";
  return "t0";
}
const money = a => `${esc(F.currency)}${(+a).toFixed(2).replace(/\.00$/, "")}`;

// ---------- StreamElements wiring ----------
window.addEventListener("onWidgetLoad", obj => {
  const fd = (obj.detail && obj.detail.fieldData) || {};
  for (const k in fd) if (fd[k] !== "" && fd[k] != null) F[k] = fd[k];   // blank settings keep the defaults
  ["tier1", "tier2", "tier3", "tier4", "chatCooldown", "bailChance", "size", "volume", "bannerSeconds", "rampHeight", "rampOpacity", "hangTime"].forEach(k => F[k] = +F[k]);
  applyFields();
  if (F.idleMode === "ride" && mode === "perch") dropIn();
});

window.addEventListener("onEventReceived", obj => {
  const d = obj.detail || {}, l = d.listener, ev = d.event || {};
  if (l === "event:test" && ev.listener === "widget-button") {
    return play({ trick: makeTrick(ev.value), name: "Test Rat", sub: L => `test · <b>${L}</b>` });
  }
  const name = esc(ev.name || ev.displayName || "someone");
  switch (l) {
    case "superchat-latest":
    case "tip-latest":
      return play({ trick: makeTrick(tierFor(+ev.amount || 0)), name, msg: ev.message, sub: L => `${money(ev.amount || 0)} · <b>${L}</b>` });
    case "cheer-latest":
      return play({ trick: makeTrick(tierFor((+ev.amount || 0) / 100)), name, msg: ev.message, sub: L => `${+ev.amount} bits · <b>${L}</b>` });
    case "sponsor-latest":
      return play({ trick: makeTrick(F.memberTrick), name, sub: L => `new member · <b>${L}</b>` });
    case "subscriber-latest":
      return play({ trick: makeTrick(F.subscriberTrick), name, sub: L => `subscribed · <b>${L}</b>` });
    case "follower-latest":
      return play({ trick: makeTrick(F.followerTrick), name, sub: L => `followed · <b>${L}</b>` });
    case "raid-latest":
      return play({ trick: makeTrick("t4"), name, sub: L => `raid x${+ev.amount || 0} · <b>${L}</b>` });
    case "message": {
      const data = ev.data || {};
      const text = String(data.text || ev.renderedText || "").trim().toLowerCase();
      if (!F.chatCommand || !text.startsWith(F.chatCommand.toLowerCase())) return;
      const now = Date.now();
      if (now - lastChat < F.chatCooldown * 1000 || queue.length > 2) return;
      lastChat = now;
      const who = esc(data.displayName || data.nick || "chat");
      const bail = Math.random() * 100 < F.bailChance;
      const trick = makeTrick(bail ? "bail" : pick(["grab", "t0", "t0", "t1"]));
      return play({ trick, name: who, sub: L => bail ? `called it… <b>${L}</b>` : `called a <b>${L}</b>` });
    }
  }
});

window.addEventListener("resize", layout);
applyFields();
requestAnimationFrame(frame);
