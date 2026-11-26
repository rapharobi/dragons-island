// Écran d'accueil : un portail magique qui fait tout le tour de l'écran du téléphone.
// Des filaments de lumière ondulent le long du bord, des reflets courent dessus, des étincelles
// s'en échappent et un tourbillon aspire la poussière d'étoiles au centre.
// Quand on touche « Jouer », le portail s'ouvre : tout accélère, la lumière envahit l'écran et on passe de l'autre côté.
import { el, styles } from "./ui.js";

styles("portail", `
.accueil { position: fixed; inset: 0; z-index: 40; background: #05030c; overflow: hidden; }
.accueil canvas { position: absolute; inset: 0; width: 100%; height: 100%; display: block; }
.accueil .reflet { position: absolute; inset: -20%; pointer-events: none; background: linear-gradient(115deg, transparent 38%, rgba(255,255,255,.07) 46%, rgba(255,236,200,.13) 50%, rgba(255,255,255,.05) 54%, transparent 62%); mix-blend-mode: screen; animation: acc-reflet 7s ease-in-out infinite; }
@keyframes acc-reflet { 0%, 15% { transform: translateX(-70%); } 60%, 100% { transform: translateX(70%); } }
.accueil .contenu { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 14px; padding: calc(env(safe-area-inset-top) + 40px) 34px calc(env(safe-area-inset-bottom) + 40px); text-align: center; }
.accueil .note { font-size: 11px; letter-spacing: .3em; text-transform: uppercase; color: rgba(230,210,255,.7); }
.accueil h1 { margin: 0; font-family: var(--titre); font-size: clamp(46px, 15vw, 120px); line-height: .86; letter-spacing: .05em; text-transform: uppercase; color: transparent;
  background: linear-gradient(100deg, #fff6e0 0%, #ffd98a 25%, #fff 40%, #c9a8ff 55%, #7fe6ff 70%, #fff6e0 100%); background-size: 250% 100%; -webkit-background-clip: text; background-clip: text;
  filter: drop-shadow(0 0 18px rgba(190,140,255,.55)) drop-shadow(0 0 42px rgba(255,170,80,.25)); animation: acc-titre 6s linear infinite; }
.accueil h1 span { display: block; font-size: .62em; letter-spacing: .32em; margin-top: .12em; }
@keyframes acc-titre { to { background-position: -250% 0; } }
.accueil p { margin: 0; max-width: 34ch; color: rgba(236,228,255,.78); font-size: 14px; line-height: 1.5; text-shadow: 0 2px 12px #000; }
.accueil .jouer { margin-top: 10px; font: 700 18px var(--titre); letter-spacing: .08em; padding: 15px 44px; border-radius: 999px; border: 1px solid rgba(255,230,170,.9); color: #1d1206;
  background: radial-gradient(120% 140% at 50% 0%, #fff4d0 0%, #ffcf6a 45%, #f29a3a 100%); box-shadow: 0 0 0 4px rgba(255,200,110,.15), 0 0 30px rgba(255,180,80,.55), 0 0 70px rgba(180,110,255,.45); animation: acc-pulse 2.2s ease-in-out infinite; }
.accueil .jouer:active { transform: scale(.97); }
@keyframes acc-pulse { 50% { box-shadow: 0 0 0 7px rgba(255,200,110,.08), 0 0 44px rgba(255,190,90,.75), 0 0 100px rgba(180,110,255,.6); } }
.accueil .petits { display: flex; gap: 8px; flex-wrap: wrap; justify-content: center; }
.accueil .petits button { font-size: 12px; padding: 8px 14px; border-radius: 999px; border: 1px solid rgba(220,200,255,.35); background: rgba(20,12,40,.55); color: rgba(240,232,255,.9); backdrop-filter: blur(6px); }
.accueil .indice-son { flex-basis: 100%; text-align: center; font-size: 12px; color: rgba(236,228,255,.6); animation: acc-pulse-texte 2s ease-in-out infinite; }
@keyframes acc-pulse-texte { 50% { opacity: .45; } }
.accueil.ouvre .contenu { animation: acc-sortie .9s ease-in forwards; }
@keyframes acc-sortie { to { opacity: 0; transform: scale(1.35); filter: blur(6px); } }
.accueil.fond { animation: acc-fond .8s ease-out forwards; pointer-events: none; }
@keyframes acc-fond { to { opacity: 0; } }
`);

export function pleinEcranPossible() { return !!(document.fullscreenEnabled || document.webkitFullscreenEnabled); }
export function basculerPleinEcran() {
  const d = document, r = d.documentElement;
  if (d.fullscreenElement || d.webkitFullscreenElement) { (d.exitFullscreen || d.webkitExitFullscreen).call(d); return; }
  const f = r.requestFullscreen || r.webkitRequestFullscreen;
  if (!f) return;
  try { const p = f.call(r, { navigationUI: "hide" }); if (p && p.catch) p.catch(() => {}); } catch (e) { /* refusé */ }
}

// Bord de l'écran : rectangle arrondi (comme les coins du téléphone), échantillonné à pas réguliers
function perimetre(W, H) {
  const m = 7, r = Math.min(W, H) * 0.1, w = W - 2 * m, h = H - 2 * m;
  const segs = [];
  const ligne = (x0, y0, x1, y1, nx, ny) => segs.push({ l: Math.hypot(x1 - x0, y1 - y0), f: (k) => [x0 + (x1 - x0) * k, y0 + (y1 - y0) * k, nx, ny] });
  const arc = (cx, cy, a0) => segs.push({ l: (Math.PI / 2) * r, f: (k) => { const a = a0 + k * Math.PI / 2; return [cx + Math.cos(a) * r, cy + Math.sin(a) * r, -Math.cos(a), -Math.sin(a)]; } });
  ligne(m + r, m, m + w - r, m, 0, 1); arc(m + w - r, m + r, -Math.PI / 2);
  ligne(m + w, m + r, m + w, m + h - r, -1, 0); arc(m + w - r, m + h - r, 0);
  ligne(m + w - r, m + h, m + r, m + h, 0, -1); arc(m + r, m + h - r, Math.PI / 2);
  ligne(m, m + h - r, m, m + r, 1, 0); arc(m + r, m + r, Math.PI);
  const L = segs.reduce((s, x) => s + x.l, 0);
  const N = Math.max(160, Math.round(L / 7));
  const pts = [];
  let i = 0, base = 0;
  for (let k = 0; k < N; k++) {
    const s = (k / N) * L;
    while (s > base + segs[i].l && i < segs.length - 1) { base += segs[i].l; i++; }
    const [x, y, nx, ny] = segs[i].f((s - base) / segs[i].l);
    pts.push({ x, y, nx, ny });
  }
  return { pts, L, r, m };
}

const BRINS = [
  { c: "255,206,110", w: 2.4, amp: 12, f: 6, v: 0.55, ph: 0 },
  { c: "255,120,60", w: 1.7, amp: 17, f: 4, v: -0.42, ph: 1.7 },
  { c: "196,130,255", w: 2.0, amp: 15, f: 9, v: 0.8, ph: 3.1 },
  { c: "90,214,255", w: 1.6, amp: 20, f: 3, v: -0.65, ph: 4.4 },
  { c: "80,240,205", w: 1.3, amp: 10, f: 11, v: 0.36, ph: 5.2 },
  { c: "255,255,255", w: 0.9, amp: 7, f: 14, v: 1.1, ph: 2.3 },
];

export function ecranAccueil({ note, texte, bouton, surJouer, surPleinEcran }) {
  const cv = el("canvas", { "aria-hidden": "true" });
  const g = cv.getContext("2d");
  const racine = el("div", { class: "accueil" });
  const contenu = el("div", { class: "contenu" },
    el("div", { class: "note" }, note),
    el("h1", {}, "Dragon", el("span", {}, "World")),
    el("p", {}, texte),
    el("button", { class: "jouer", onclick: () => surJouer() }, bouton),
    el("div", { class: "petits" }, pleinEcranPossible() ? el("button", { onclick: () => { basculerPleinEcran(); if (surPleinEcran) surPleinEcran(); } }, "⛶  Plein écran") : null));
  racine.append(cv, el("div", { class: "reflet" }), contenu);

  let W = 0, H = 0, dpr = 1, P = null, t = 0, vivant = true, ouverture = 0, ouvre = false, avant = performance.now();
  const poussiere = [], etincelles = [], cometes = [0, 0.25, 0.5, 0.75].map((p, i) => ({ p, v: (i % 2 ? -1 : 1) * (0.05 + i * 0.012), c: i % 2 ? "160,220,255" : "255,225,160" }));
  const taille = () => {
    dpr = Math.min(2, window.devicePixelRatio || 1);
    W = window.innerWidth; H = window.innerHeight;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    P = perimetre(W, H);
  };
  taille();
  window.addEventListener("resize", taille);
  const centre = () => [W / 2, H * 0.44];
  const R = () => Math.hypot(W, H) * 0.55;
  for (let i = 0; i < 150; i++) poussiere.push({ a: Math.random() * 6.28, r: Math.random() * R(), v: 0.3 + Math.random(), s: 0.5 + Math.random() * 1.4 });

  function dessiner(dt) {
    t += dt;
    if (ouvre) ouverture = Math.min(1, ouverture + dt / 1.7);
    const o = ouverture * ouverture;
    const vit = 1 + o * 7;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.globalCompositeOperation = "source-over";
    // Fond : nuit profonde, un peu violette au centre
    const [cx, cy] = centre();
    const fond = g.createRadialGradient(cx, cy, 0, cx, cy, R());
    fond.addColorStop(0, `rgba(${60 + o * 120},${30 + o * 90},${110 + o * 80},1)`);
    fond.addColorStop(0.45, "rgba(18,10,42,1)");
    fond.addColorStop(1, "rgba(4,2,10,1)");
    g.fillStyle = fond; g.fillRect(0, 0, W, H);
    g.globalCompositeOperation = "lighter";

    // Poussière d'étoiles aspirée par le tourbillon (et projetée vers nous à l'ouverture)
    for (const d of poussiere) {
      if (ouvre) d.r += dt * (60 + d.v * 200) * (0.3 + o * 4);
      else d.r -= dt * (8 + d.v * 14);
      d.a += dt * (0.25 + 30 / (d.r + 40)) * vit * 0.6;
      if (d.r < 4) { d.r = R(); d.a = Math.random() * 6.28; }
      if (d.r > R() * 1.1) { d.r = 6 + Math.random() * 30; }
      const x = cx + Math.cos(d.a) * d.r, y = cy + Math.sin(d.a) * d.r * 0.9;
      const al = Math.min(1, d.r / 120) * (0.35 + 0.4 * Math.sin(t * 3 + d.a * 5) ** 2);
      g.fillStyle = `rgba(220,210,255,${al})`;
      if (ouvre && o > 0.05) { g.strokeStyle = `rgba(255,236,210,${al})`; g.lineWidth = d.s; g.beginPath(); g.moveTo(x, y); g.lineTo(cx + Math.cos(d.a) * d.r * (1 - 0.12 * o), cy + Math.sin(d.a) * d.r * 0.9 * (1 - 0.12 * o)); g.stroke(); }
      else { g.beginPath(); g.arc(x, y, d.s * 0.7, 0, 6.28); g.fill(); }
    }

    // Tourbillon au centre : bras en spirale qui tournent
    const Rv = Math.min(W, H) * (0.46 + o * 0.6);
    for (let k = 0; k < 4; k++) {
      g.beginPath();
      for (let j = 0; j <= 60; j++) {
        const rr = (j / 60) * Rv;
        const a = k * Math.PI / 2 + rr * 0.016 - t * 0.9 * vit;
        const x = cx + Math.cos(a) * rr, y = cy + Math.sin(a) * rr * 0.92;
        j ? g.lineTo(x, y) : g.moveTo(x, y);
      }
      g.strokeStyle = k % 2 ? `rgba(150,110,255,${0.1 + o * 0.25})` : `rgba(255,170,90,${0.07 + o * 0.25})`;
      g.lineWidth = 10 + o * 30; g.stroke();
      g.lineWidth = 1.5; g.strokeStyle = `rgba(255,240,220,${0.12 + o * 0.4})`; g.stroke();
    }
    // Cœur lumineux
    const pulse = 0.85 + Math.sin(t * 2.1) * 0.15;
    const rc = Math.min(W, H) * (0.18 * pulse + o * 1.4);
    const coeur = g.createRadialGradient(cx, cy, 0, cx, cy, rc);
    coeur.addColorStop(0, `rgba(255,250,235,${0.55 + o * 0.45})`);
    coeur.addColorStop(0.25, `rgba(255,200,130,${0.3 + o * 0.5})`);
    coeur.addColorStop(0.6, `rgba(160,100,255,${0.15 + o * 0.4})`);
    coeur.addColorStop(1, "rgba(80,40,160,0)");
    g.fillStyle = coeur; g.fillRect(cx - rc, cy - rc, rc * 2, rc * 2);

    // Le portail : un liseré de lumière qui épouse le bord du téléphone
    const pts = P.pts, N = pts.length;
    const halo = (lw, c) => { g.lineWidth = lw; g.strokeStyle = c; g.beginPath(); pts.forEach((p, i) => (i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y))); g.closePath(); g.stroke(); };
    halo(34 + o * 60, `rgba(140,90,255,${0.07 + o * 0.2})`);
    halo(14 + o * 20, `rgba(255,190,110,${0.1 + o * 0.25})`);
    halo(3, `rgba(255,240,220,${0.45 + o * 0.5})`);
    // Filaments d'énergie qui ondulent vers l'intérieur
    for (const b of BRINS) {
      const chemin = () => {
        g.beginPath();
        for (let i = 0; i <= N; i++) {
          const p = pts[i % N], u = i / N;
          const ond = Math.sin(6.283 * (b.f * u + b.v * t * vit) + b.ph) * Math.sin(6.283 * (3 * u - 0.21 * t) + 2 * b.ph);
          const d = 5 + b.amp * (0.55 + 0.45 * ond) * (1 + o * 2.5);
          const x = p.x + p.nx * d, y = p.y + p.ny * d;
          i ? g.lineTo(x, y) : g.moveTo(x, y);
        }
      };
      chemin();
      g.lineWidth = b.w * 5; g.strokeStyle = `rgba(${b.c},${0.07 + o * 0.15})`; g.stroke();
      g.lineWidth = b.w; g.strokeStyle = `rgba(${b.c},${0.75})`; g.stroke();
    }
    // Reflets : des éclats brillants qui font le tour du portail
    for (const c of cometes) {
      c.p = (c.p + c.v * dt * vit + 1) % 1;
      for (let k = 0; k < 26; k++) {
        const q = (c.p - Math.sign(c.v) * k * 0.0025 + 1) % 1;
        const p = pts[Math.floor(q * N) % N];
        const a = (1 - k / 26);
        g.fillStyle = `rgba(${c.c},${a * 0.5})`;
        g.beginPath(); g.arc(p.x + p.nx * 6, p.y + p.ny * 6, 1 + a * 4.5, 0, 6.28); g.fill();
      }
    }
    // Étincelles qui s'échappent vers l'intérieur
    const n = dt * (26 + o * 160);
    for (let k = 0; k < n; k++) {
      if (Math.random() > n - k) break;
      const p = pts[Math.floor(Math.random() * N)];
      const s = 25 + Math.random() * 70;
      etincelles.push({ x: p.x + p.nx * 6, y: p.y + p.ny * 6, vx: p.nx * s + (Math.random() - 0.5) * 30, vy: p.ny * s + (Math.random() - 0.5) * 30, t: 0, vie: 0.8 + Math.random() * 1.4, c: BRINS[Math.floor(Math.random() * BRINS.length)].c });
    }
    for (let i = etincelles.length - 1; i >= 0; i--) {
      const e = etincelles[i];
      e.t += dt; e.x += e.vx * dt; e.y += e.vy * dt; e.vx *= 0.985; e.vy *= 0.985;
      if (e.t > e.vie) { etincelles.splice(i, 1); continue; }
      const a = 1 - e.t / e.vie;
      g.fillStyle = `rgba(${e.c},${a})`;
      g.beginPath(); g.arc(e.x, e.y, 0.6 + a * 1.6, 0, 6.28); g.fill();
    }
    // Ouverture : un éclair blanc doré qui envahit tout
    if (ouvre && o > 0.55) { g.globalCompositeOperation = "source-over"; g.fillStyle = `rgba(255,248,232,${Math.min(1, (o - 0.55) / 0.4)})`; g.fillRect(0, 0, W, H); }
  }
  function boucle(maintenant) {
    if (!vivant) return;
    const dt = Math.min(0.05, (maintenant - avant) / 1000); avant = maintenant;
    dessiner(dt);
    requestAnimationFrame(boucle);
  }
  requestAnimationFrame(boucle);

  return {
    racine,
    // Le portail s'ouvre ; « traverser » est appelé en pleine lumière, puis le voile s'efface
    ouvrir(traverser) {
      if (ouvre) return;
      ouvre = true;
      racine.classList.add("ouvre");
      setTimeout(() => { try { traverser(); } catch (e) { console.error(e); } racine.classList.add("fond"); }, 1650);
      setTimeout(() => { vivant = false; window.removeEventListener("resize", taille); racine.remove(); }, 2500);
    },
  };
}
