// Skate Rat — halfpipe edition (StreamElements custom widget)
// The rat waits on a deck at the edge of the screen. On a stream event he drops in,
// rides the halfpipe and airs out of the far wall with a trick. More money = bigger air + bigger trick.
let F = {
  tier1: 5, tier2: 20, tier3: 50, currency: "$",
  followerTrick: "ollie", subscriberTrick: "ollie", memberTrick: "kickflip",
  chatCommand: "!kickflip", chatCooldown: 30, bailChance: 15,
  idleMode: "perch", rampHeight: 220, rampOpacity: 85, rampText: "RATZ",
  size: 100, accent: "#ff2bd6", accent2: "#27f5ff", ratColor: "#8a7b96",
  ratImage: "", ratIdleImage: "", ratAirImage: "", boardImage: "",
  showBanner: "yes", bannerSeconds: 5, sound: "", volume: 50
};

// h = share of the available sky the air reaches
const TRICKS = {
  ollie:    { label: "AIR",          h: .30 },
  kickflip: { label: "KICKFLIP",     h: .45 },
  treflip:  { label: "360 FLIP",     h: .62 },
  mctwist:  { label: "540 McTWIST",  h: .82 },
  mega:     { label: "MEGA 720",     h: 1.0 },
  bail:     { label: "BAIL!",        h: .45 }
};

const lane = document.getElementById("lane");
const rampsSvg = document.getElementById("ramps");
const rider = document.getElementById("rider");
const spin = rider.querySelector(".spin");
const rat = rider.querySelector(".rat");
const board = rider.querySelector(".board");
const banner = document.getElementById("banner");

const G = 1250;          // gravity px/s²
const BASE = 6;          // ground offset from bottom
let W = 0, Hh = 0, R = 200, D = 100, A = 0, FL = 0, L = 0;

let mode = "perch";      // perch | drop | ride | air | home
let side = -1;           // deck he's on (-1 left, 1 right)
let u = 0, v = 0, dir = 1, dirS = 1;
let air = null, tween = null;
let pending = null, current = null, crashed = false, recoverAt = 0, goingHome = false;
const queue = [];
let lastChat = 0, last = performance.now();

const S = () => F.size / 100;
const sky = () => Math.max(60, Hh - R - BASE - 140 * S());

function applyFields() {
  const r = document.documentElement.style;
  r.setProperty("--a", F.accent); r.setProperty("--b", F.accent2);
  r.setProperty("--rat", F.ratColor); r.setProperty("--s", S());
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

// ---------- main loop ----------
function targetHeight() {
  if (crashed) return 0;
  if (pending) return R + sky() * TRICKS[pending.trick].h;
  if (goingHome) return R + 26 * S();
  return F.idleMode === "ride" ? R * 0.5 : R * 0.3;
}

function frame(t) {
  const dt = Math.min(0.033, (t - last) / 1000); last = t;
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
      v = (v === 0 ? dir : Math.sign(v)) * (sp + (tgt - sp) * Math.min(1, dt * 6));
    }
    u += v * dt;
    if (v > 1) dir = 1; else if (v < -1) dir = -1;
    dirS += (dir - dirS) * Math.min(1, dt * 14);
    if (u >= L || u <= 0) {                             // reached a coping
      const s = u >= L ? 1 : -1; u = s > 0 ? L : 0;
      const vy = Math.abs(v);
      if (goingHome && !pending && !crashed) { goHome(s); requestAnimationFrame(frame); return; }
      if (vy < 40) v = -v * 0.5;
      else { mode = "air"; air = { s, y: R, vy, t: 0, tot: 2 * vy / G }; startAir(); }
    }
    if (crashed && p0.dy === 0 && Math.abs(v) < 12) {
      if (!recoverAt) recoverAt = t + 1300;
      else if (t > recoverAt) recover();
    }
    if (mode === "ride") { const p = at(u); place(p.x, p.y, p.rot, dirS); }
  }
  if (mode === "air") {
    air.t += dt; air.vy -= G * dt; air.y += air.vy * dt;
    const k = air.t / air.tot, turn = Math.max(0, Math.min(1, (k - .38) / .24));
    place(air.s > 0 ? W - D : D, air.y, air.s > 0 ? -90 : 90, air.s > 0 ? 1 - 2 * turn : -1 + 2 * turn);
    if (air.vy < 0 && air.y <= R) land();
  }
  requestAnimationFrame(frame);
}

// ---------- transitions ----------
function dropIn() {
  const s = side;
  mode = "drop";
  tween = { t: 0, dur: .45, x0: perchX(s), x1: s < 0 ? D : W - D, y0: R, y1: R, arc: 6 * S(),
    r0: 0, r1: s < 0 ? 90 : -90, d: -s,
    done() { mode = "ride"; u = s < 0 ? 0.5 : L - 0.5; v = -s * 60; dir = -s; dirS = dir; } };
}
function goHome(s) {
  goingHome = false; mode = "home";
  tween = { t: 0, dur: .5, x0: s < 0 ? D : W - D, x1: perchX(s), y0: R, y1: R, arc: 70 * S(),
    r0: s < 0 ? 90 : -90, r1: 0, d: -s,
    done() { mode = "perch"; side = s; next(); } };
}
function startAir() {
  if (!pending) return;
  current = pending; pending = null;
  const t = current.trick, d = air.tot * 1000;
  if (F.sound) { try { const a = new Audio(F.sound); a.volume = F.volume / 100; a.play(); } catch (e) {} }
  if (t !== "bail") setTimeout(() => pop(TRICKS[t].label + "!"), d * .3);
  (TRICK_FX[t] || TRICK_FX.kickflip)(d);
}
function land() {
  const s = air.s;
  mode = "ride"; u = s > 0 ? L : 0; v = -s * Math.abs(air.vy); dir = -s; dirS = dir;
  sparks(s > 0 ? W - D : D, R, 8);
  air = null;
  if (current) {
    const wasBail = current.trick === "bail";
    current = null;
    if (wasBail) crash(); else setTimeout(next, 250);
  }
}
function crash() {
  crashed = true; recoverAt = 0;
  pop("BAIL!", "bail");
  spin.getAnimations().forEach(a => a.cancel());
  board.getAnimations().forEach(a => a.cancel());
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

// ---------- trick animations (played during the air) ----------
const anim = (el, kf, o) => el.animate(kf, typeof o === "number" ? { duration: o } : o).finished;
const FLIP = n => { const k = [{ transform: "scaleY(1)" }, { transform: "scaleY(1)", offset: .2 }];
  for (let i = 1; i <= n; i++) k.push({ transform: "scaleY(-1)", offset: .2 + (i - .5) * .5 / n }, { transform: "scaleY(1)", offset: .2 + i * .5 / n });
  k.push({ transform: "scaleY(1)" }); return k; };
const TRE = n => [{ transform: "rotate(0) scaleY(1)" }, { transform: "rotate(0) scaleY(1)", offset: .18 },
  { transform: `rotate(${-360 * n}deg) scaleY(-1)`, offset: .45 },
  { transform: `rotate(${-360 * n}deg) scaleY(1)`, offset: .72 }, { transform: `rotate(${-360 * n}deg) scaleY(1)` }];
const SPIN = deg => [{ transform: "rotate(0)" }, { transform: "rotate(0)", offset: .12 },
  { transform: `rotate(${deg}deg)`, offset: .8 }, { transform: `rotate(${deg}deg)` }];
const GRAB = [{ transform: "none" }, { transform: "translateY(10px) rotate(6deg)", offset: .3 },
  { transform: "translateY(10px) rotate(6deg)", offset: .7 }, { transform: "none" }];

const TRICK_FX = {
  ollie(d) { anim(rat, GRAB, d); anim(board, [{ transform: "rotate(0)" }, { transform: "rotate(-10deg)", offset: .3 }, { transform: "rotate(0)" }], d); },
  kickflip(d) { anim(board, FLIP(1), d); },
  treflip(d) { anim(board, TRE(1), { duration: d, easing: "ease-in-out" }); anim(rat, GRAB, d); },
  mctwist(d) { anim(spin, SPIN(-360), { duration: d, easing: "ease-in-out" }); anim(board, FLIP(1), d); },
  mega(d) {
    anim(spin, SPIN(-720), { duration: d, easing: "ease-in-out" });
    anim(board, FLIP(2), d);
    const s = air ? air.s : 1;
    setTimeout(() => confetti(s > 0 ? W - D - 160 * S() : D + 160 * S(), Hh * .5), d * .45);
    flash();
  },
  bail(d) { anim(spin, [{ transform: "rotate(0)" }, { transform: "rotate(40deg)", offset: .4 }, { transform: "rotate(150deg)" }], d); }
};

// ---------- effects ----------
function pop(text, cls = "") {
  const el = document.createElement("div");
  el.className = "pop " + cls; el.textContent = text;
  const s = air ? air.s : dir;
  el.style.left = (cls === "bail" ? W / 2 : (s > 0 ? W - D - 230 * S() : D + 230 * S())) + "px";
  el.style.bottom = (cls === "bail" ? R * .6 : Math.min(Hh - 140, R + sky() * .5)) + "px";
  lane.appendChild(el);
  anim(el, [
    { transform: "translateX(-50%) scale(.4)", opacity: 0 },
    { transform: "translateX(-50%) scale(1.15)", opacity: 1, offset: .15 },
    { transform: "translateX(-50%) translateY(-30px) scale(1)", opacity: 1, offset: .7 },
    { transform: "translateX(-50%) translateY(-60px) scale(1)", opacity: 0 }
  ], 1800).then(() => el.remove());
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
function confetti(cx, cy, n = 50) {
  const cols = [F.accent, F.accent2, "#ffe34d", "#5cff8a", "#9b5cff", "#fff"];
  for (let i = 0; i < n; i++) {
    const c = document.createElement("div"); c.className = "conf";
    c.style.background = cols[i % cols.length]; c.style.left = cx + "px"; c.style.bottom = cy + "px";
    lane.appendChild(c);
    const a = Math.random() * Math.PI * 2, d = 120 + Math.random() * 280;
    anim(c, [{ transform: "translate(0,0) rotate(0)", opacity: 1 },
      { transform: `translate(${Math.cos(a) * d}px,${-Math.sin(a) * d + 180}px) rotate(${Math.random() * 720}deg)`, opacity: 0 }],
      { duration: 1400 + Math.random() * 900, easing: "cubic-bezier(.1,.7,.4,1)" }).then(() => c.remove());
  }
}
function flash() {
  const f = document.createElement("div"); f.className = "flash"; lane.appendChild(f);
  anim(f, [{ opacity: 0 }, { opacity: .5, offset: .15 }, { opacity: 0 }], 900).then(() => f.remove());
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
  if (!TRICKS[j.trick]) j.trick = "kickflip";
  goingHome = false;
  pending = j;
  showBanner(j.name, j.sub(TRICKS[j.trick].label), j.msg);
  if (mode === "perch") dropIn();
}

function trickForAmount(amt) {
  if (amt >= F.tier3) return "mega";
  if (amt >= F.tier2) return "mctwist";
  if (amt >= F.tier1) return "treflip";
  return "kickflip";
}
const money = a => `${esc(F.currency)}${(+a).toFixed(2).replace(/\.00$/, "")}`;

// ---------- StreamElements wiring ----------
window.addEventListener("onWidgetLoad", obj => {
  F = Object.assign(F, (obj.detail && obj.detail.fieldData) || {});
  ["tier1", "tier2", "tier3", "chatCooldown", "bailChance", "size", "volume", "bannerSeconds", "rampHeight", "rampOpacity"].forEach(k => F[k] = +F[k]);
  applyFields();
  if (F.idleMode === "ride" && mode === "perch") dropIn();
});

window.addEventListener("onEventReceived", obj => {
  const d = obj.detail || {}, l = d.listener, ev = d.event || {};
  if (l === "event:test" && ev.listener === "widget-button") {
    return play({ trick: ev.value || "kickflip", name: "Test Rat", sub: L => `test · <b>${L}</b>` });
  }
  const name = esc(ev.name || ev.displayName || "someone");
  switch (l) {
    case "superchat-latest":
    case "tip-latest":
      return play({ trick: trickForAmount(+ev.amount || 0), name, msg: ev.message, sub: L => `${money(ev.amount || 0)} · <b>${L}</b>` });
    case "cheer-latest":
      return play({ trick: trickForAmount((+ev.amount || 0) / 100), name, msg: ev.message, sub: L => `${+ev.amount} bits · <b>${L}</b>` });
    case "sponsor-latest":
      return play({ trick: F.memberTrick, name, sub: L => `new member · <b>${L}</b>` });
    case "subscriber-latest":
      return play({ trick: F.subscriberTrick, name, sub: L => `subscribed · <b>${L}</b>` });
    case "follower-latest":
      return play({ trick: F.followerTrick, name, sub: L => `followed · <b>${L}</b>` });
    case "raid-latest":
      return play({ trick: "mega", name, sub: L => `raid x${+ev.amount || 0} · <b>${L}</b>` });
    case "message": {
      const data = ev.data || {};
      const text = String(data.text || ev.renderedText || "").trim().toLowerCase();
      if (!F.chatCommand || !text.startsWith(F.chatCommand.toLowerCase())) return;
      const now = Date.now();
      if (now - lastChat < F.chatCooldown * 1000 || queue.length > 2) return;
      lastChat = now;
      const who = esc(data.displayName || data.nick || "chat");
      const bail = Math.random() * 100 < F.bailChance;
      const pick = ["ollie", "kickflip", "treflip"][Math.floor(Math.random() * 3)];
      return play({ trick: bail ? "bail" : pick, name: who, sub: L => bail ? `called it… <b>${L}</b>` : `called a <b>${L}</b>` });
    }
  }
});

window.addEventListener("resize", layout);
applyFields();
requestAnimationFrame(frame);
