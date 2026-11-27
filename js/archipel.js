// Le continent des mages : l'écran Combat est une maquette isométrique (caméra fixe, vue 2,5D).
// Ton portail t'y emmène. Au centre, la cité des mages (l'arène et le hall de la ligue), l'auberge des
// Deux Lunes où l'on défie ses amis, la forêt sauvage à l'ouest, la tour du nid dans les montagnes du nord,
// les villages volants au large du nord-est, le port des dirigeables à l'est et, au sud, le volcan où dort
// le dragon de la semaine. Toucher un lieu zoome dessus et ouvre sa fiche.
import { construireDragon } from "./modele.js";
import { Animateur } from "./anim.js";
import { ciel, eclairage, versEcran } from "./scene.js";
import { construireIleEnnemie, construireForteresse, sapin, arbreRond, arbreMort } from "./monde.js";
import { mat, mesh, cone, rng } from "./outils3d.js";
import { E, maintenant } from "./etat.js";
import { el, styles } from "./ui.js";
import { Son, Musique } from "./son.js";
import { boss } from "./boss.js";

const T = window.THREE;
const etroit = () => window.innerWidth / window.innerHeight < 0.8;

styles("archipel", `
.ar-titre { position: fixed; z-index: 14; top: calc(var(--hud) + var(--tuto, 0px) + 8px); left: 0; right: 0; text-align: center; pointer-events: none; padding: 0 var(--bord-d) 0 var(--bord-g); }
.ar-titre .etiquette { color: var(--ambre); }
.ar-titre h2 { font-size: clamp(22px, 5.5vw, 34px); text-shadow: 0 2px 18px rgba(0,0,0,.7); }
.ar-etiqs { position: fixed; inset: 0; pointer-events: none; z-index: 13; }
.ar-etiq { position: absolute; transform: translate(-50%, -100%); pointer-events: auto; cursor: pointer; display: grid; justify-items: center; gap: 1px; padding: 5px 10px 6px; border-radius: 12px;
  background: linear-gradient(180deg, rgba(30, 24, 48, .92), rgba(14, 12, 24, .92)); border: 1px solid color-mix(in srgb, var(--c) 60%, transparent); color: var(--texte); white-space: nowrap;
  box-shadow: 0 6px 18px rgba(0,0,0,.45), 0 0 14px color-mix(in srgb, var(--c) 25%, transparent); transition: transform .15s; }
.ar-etiq:hover, .ar-etiq.choisi { transform: translate(-50%, -100%) scale(1.07); border-color: var(--c); }
.ar-etiq b { font-family: var(--titre); font-size: 13px; color: var(--c); }
@media (max-width: 420px) { .ar-etiq { padding: 4px 8px 5px; } .ar-etiq b { font-size: 12px; } .ar-etiq small { font-size: 10px; } }
.ar-etiq small { color: var(--doux); font-size: 10.5px; }
.ar-etiq.ferme { filter: grayscale(.7); opacity: .85; }
.ar-etiq.chaud { animation: ar-pulse 1.4s infinite; }
@keyframes ar-pulse { 50% { box-shadow: 0 0 0 3px color-mix(in srgb, var(--c) 40%, transparent), 0 0 22px var(--c); } }
.ar-etiq::after { content: ""; position: absolute; left: 50%; bottom: -6px; width: 10px; height: 10px; transform: translateX(-50%) rotate(45deg); background: rgba(14,12,24,.92); border-right: 1px solid color-mix(in srgb, var(--c) 60%, transparent); border-bottom: 1px solid color-mix(in srgb, var(--c) 60%, transparent); }
.ar-fiche { position: fixed; z-index: 16; left: 50%; transform: translateX(-50%); bottom: calc(var(--bas) + 84px); width: min(440px, calc(100vw - 32px)); max-height: 52vh; overflow: auto; padding: 16px; display: grid; gap: 10px; }
.ar-fiche header { display: flex; justify-content: space-between; gap: 10px; align-items: flex-start; }
.ar-fiche h3 { font-size: 22px; color: var(--c); }
.ar-fiche .lore { margin: 0; color: var(--doux); font-size: 12px; font-style: italic; }
.ar-fiche p { margin: 0; font-size: 13px; }
.ar-fiche .choix { display: grid; gap: 8px; }
.ar-fiche .choix .btn { justify-content: flex-start; text-align: left; display: grid; gap: 2px; padding: 11px 14px; }
.ar-fiche .choix .btn small { color: inherit; opacity: .8; font-weight: 400; font-size: 12px; }
@media (max-width: 560px) { .ar-fiche { bottom: calc(var(--bas) + 76px); padding: 13px 14px; } }
`);

// Les lieux du continent : position sur la maquette, couleur, modes de combat
export const ILES_COMBAT = [
  { id: "arene", nom: "L'Arène", c: "#f2b544", pos: [-1, 9], modes: ["bot"], texte: "Les duels classés contre les mages de ta ligue. Chaque victoire rapporte des trophées.", lore: "Au cœur de la cité des mages, les gradins grondent chaque soir." },
  { id: "hall", nom: "Hall de la ligue", c: "#d08aff", pos: [6, 6.5], modes: [], texte: "Ton classement, la saison en cours et son coffre, l'historique de tes combats, ta salle des trophées et ton équipe.", lore: "Les bannières des six ligues pendent sous la grande voûte." },
  { id: "amis", nom: "Auberge des Deux Lunes", c: "#7fd6ff", pos: [-8, 6], modes: ["ami", "ligne"], texte: "Défie un ami : sur le même téléphone, ou chacun sur le sien avec un code.", lore: "On y trinque avant de croiser les souffles, entre amis." },
  { id: "sauvage", nom: "La Forêt sauvage", c: "#8ee6a6", pos: [-8, -4], modes: ["sauvage"], texte: "Des dragons sauvages, plus faibles que les tiens : de l'expérience et des rations sans trop de risques.", lore: "Sous les grands arbres, de jeunes dragons chassent en liberté." },
  { id: "tour", nom: "La Tour du nid", c: "#b48aff", pos: [-4, -16], modes: ["tour"], texte: "Roguelite : entre sans dragon, choisis 3 œufs et grimpe 21 étages. Au sommet, un œuf mystère UL.", lore: "Plantée sur le pic du nord, ses dragons-gardiens ne dorment jamais." },
  { id: "villages", nom: "Les Villages volants", c: "#ff8a5a", pos: [7, -10], modes: ["village"], texte: "Un archipel de villages de mages : attaque-les, détruis leurs bâtiments et surtout leur couvoir.", lore: "Au large du nord-est, des îlots flottent au-dessus des nuages." },
  { id: "port", nom: "Le Port des dirigeables", c: "#6fd6c8", pos: [10, -1], modes: [], texte: "Envoie tes dragons en expédition chercher des œufs, à bord des dirigeables.", lore: "Les ballons rouges partent vers les terres inconnues." },
  { id: "legendes", nom: "Le Portail des Légendes", c: "#ffd27a", pos: [7, 13], modes: ["histoire", "village"], texte: "Le mode histoire. À chaque niveau de l'île Mère, une nouvelle quête s'ouvre : 5 étapes qui alternent duels de dragons et attaques de bases, jusqu'au chef. Tout au bout attend le boss final.", lore: "Un portail de pierre plus vieux que le continent. Ceux qui le franchissent écrivent la légende." },
  { id: "boss", nom: "Le Volcan du dragon-roi", c: "#ff5a4a", pos: [-2, 17], modes: ["boss"], texte: "Chaque semaine, un dragon géant se réveille. Chaque combat lui retire des PV ; abats-le avant dimanche pour les meilleures récompenses.", lore: "Le sol tremble quand il respire." },
];
export function lieu(id) { return ILES_COMBAT.find((l) => l.id === id); }

let A = null, ui = null, ctxJeu = null, choisie = null, surChoix = null, calque = null;

// ---------- Relief du continent ----------
const LARG = 13.5, PROF = 25;
function bruit(x, z) { return Math.sin(x * 0.55 + 1.3) * Math.cos(z * 0.47 - 0.7) * 0.5 + Math.sin(x * 1.3 + z * 1.1) * 0.25 + Math.cos(x * 2.1 - z * 1.7) * 0.12; }
function lisse(a, b, x) { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); }
export function hauteur(x, z) {
  const d = Math.hypot(x / LARG, z / PROF) + bruit(x * 0.6, z * 0.6) * 0.08;
  const terre = lisse(1.02, 0.86, d);
  let h = -0.8 + terre * 1.4 + bruit(x, z) * 0.25 * terre;
  // Montagnes du nord
  if (z < -8) h += Math.max(0, (-8 - z) / 9) * 4.2 * (0.6 + 0.4 * Math.abs(bruit(x * 1.4, z * 1.4))) * terre;
  // Volcan du sud
  const dv = Math.hypot(x + 2, z - 17);
  if (dv < 6) h += (1 - dv / 6) * 4 * terre - (dv < 1.4 ? (1.4 - dv) * 2.2 : 0);
  // La cité est sur un plateau
  const dc = Math.hypot(x - 1, z - 7.5);
  if (dc < 7) h += (0.5 - h) * lisse(7, 4, dc) * 0.8;
  return h;
}
function couleurSol(x, z, h) {
  const c = new T.Color();
  if (h < -0.05) c.setHex(0x2a5a6a);
  else if (h < 0.18) c.setHex(0xd8c890);
  else if (h > 3.2) c.setHex(0xf0f4f8);
  else if (h > 1.8) c.setHex(0x7a7468);
  else if (x < -3 && z > -9 && z < 2) c.setHex(0x2f6a3a);
  else if (Math.hypot(x + 2, z - 17) < 5) c.setHex(0x3a2a26);
  else c.setHex(0x5a9a4a);
  return c.multiplyScalar(0.9 + Math.random() * 0.12);
}

// ---------- Décors des lieux ----------
function arene() {
  const g = new T.Group();
  const pierre = mat(0xc8b8a0, { r: 0.9 }), sable = mat(0xe0c890, { r: 1 }), or = mat(0xf2b544, { r: 0.35, m: 0.6, e: 0x7a4a00, ei: 0.5 });
  g.add(mesh(new T.CylinderGeometry(2.1, 2.1, 0.1, 24).translate(0, 0.05, 0), sable));
  for (let k = 0; k < 20; k++) { const a = (k / 20) * Math.PI * 2; const p = mesh(new T.BoxGeometry(0.32, 1.1, 0.3).translate(0, 0.55, 0), pierre); p.position.set(Math.cos(a) * 2.5, 0, Math.sin(a) * 2.5); p.rotation.y = -a; g.add(p); }
  const anneau = mesh(new T.TorusGeometry(2.5, 0.16, 5, 40), pierre); anneau.rotation.x = Math.PI / 2; anneau.position.y = 1.15; g.add(anneau);
  // La foule dans les gradins
  const foule = [];
  for (let k = 0; k < 36; k++) { const a = (k / 36) * Math.PI * 2; const f = mesh(new T.BoxGeometry(0.12, 0.16, 0.12), mat([0xff6a3d, 0x7fd6ff, 0x2fd0c0, 0xf2b544, 0xd08aff][k % 5]), false); f.position.set(Math.cos(a) * 2.15, 0.25, Math.sin(a) * 2.15); g.add(f); foule.push(f); }
  const drapeaux = [];
  for (let k = 0; k < 4; k++) { const a = (k / 4) * Math.PI * 2 + 0.4; const m = mesh(new T.CylinderGeometry(0.03, 0.03, 1, 4).translate(0, 0.5, 0), mat(0x5a4632)); m.position.set(Math.cos(a) * 2.5, 1.2, Math.sin(a) * 2.5); g.add(m); const d = mesh(new T.PlaneGeometry(0.45, 0.28).translate(0.22, 0, 0), mat([0xff6a3d, 0x7fd6ff, 0x2fd0c0, 0xf2b544][k], { d: true }), false); d.position.set(Math.cos(a) * 2.5, 2.05, Math.sin(a) * 2.5); g.add(d); drapeaux.push(d); }
  const trophee = mesh(new T.CylinderGeometry(0.25, 0.08, 0.35, 10).translate(0, 0.45, 0), or); g.add(trophee);
  // Deux petits dragons qui s'affrontent au centre
  const duel = [];
  ["braisil", "ondin"].forEach((id, i) => { try { const rig = construireDragon(id, 1, {}); rig.racine.scale.setScalar(0.55 / Math.max(rig.taille.x, rig.taille.z, rig.taille.y)); rig.racine.position.set(i ? 0.7 : -0.7, 0.1, 0); rig.racine.rotation.y = i ? -Math.PI / 2 : Math.PI / 2; g.add(rig.racine); const an = new Animateur(rig); an.jouer("repos"); duel.push(an); } catch (e) { /* */ } });
  let prochain = 1;
  return { g, haut: 2.4, anim: (t, dt) => {
    drapeaux.forEach((d, i) => { d.rotation.y = Math.sin(t * 2.5 + i) * 0.4; });
    foule.forEach((f, i) => { f.position.y = 0.25 + Math.max(0, Math.sin(t * 6 + i * 0.7)) * 0.08; });
    duel.forEach((a) => a.update(dt));
    prochain -= dt; if (prochain < 0 && duel.length) { prochain = 2 + Math.random() * 2; duel[Math.floor(Math.random() * duel.length)].jouer("attaque"); }
  } };
}
function hall() {
  const g = new T.Group();
  const marbre = mat(0xe8e0d0, { r: 0.6 }), toit = mat(0x5a3a7a, { r: 0.7 }), or = mat(0xf2b544, { r: 0.35, m: 0.6, e: 0x7a4a00, ei: 0.5 });
  g.add(mesh(new T.BoxGeometry(3, 0.3, 2.2).translate(0, 0.15, 0), marbre));
  for (let k = 0; k < 6; k++) g.add(mesh(new T.CylinderGeometry(0.12, 0.14, 1.4, 8).translate(-1.25 + k * 0.5, 1, 0.9), marbre));
  g.add(mesh(new T.BoxGeometry(2.6, 1.4, 1.5).translate(0, 1, -0.2), marbre));
  const fronton = mesh(new T.CylinderGeometry(0.001, 1.5, 0.8, 3, 1).rotateX(Math.PI / 2).rotateY(Math.PI / 2).scale(1.1, 1, 1.2), toit); fronton.position.set(0, 2.05, 0); g.add(fronton);
  g.add(mesh(new T.BoxGeometry(3.1, 0.12, 2.3).translate(0, 1.72, 0), marbre));
  // Bannières des six ligues
  const ban = [0xc8834a, 0xc9d2dc, 0xf2c544, 0x7fe0d8, 0x9ab8ff, 0xd08aff].map((c, k) => { const b = mesh(new T.PlaneGeometry(0.3, 0.6), mat(c, { d: true, e: c, ei: 0.2 }), false); b.position.set(-1.25 + k * 0.5, 1.2, 0.98); g.add(b); return b; });
  const statue = mesh(new T.OctahedronGeometry(0.3, 0).scale(1, 1.6, 1), or); statue.position.set(0, 2.7, 0); g.add(statue);
  return { g, haut: 3.2, anim: (t) => { statue.rotation.y = t; ban.forEach((b, i) => { b.rotation.x = Math.sin(t * 2 + i) * 0.12; }); } };
}
function auberge() {
  const g = new T.Group();
  const bois = mat(0x8a5a32, { r: 0.85 }), toit = mat(0x3a5a8a, { r: 0.8 }), pierre = mat(0x8a8478, { r: 0.95 });
  g.add(mesh(new T.BoxGeometry(2, 0.3, 1.5).translate(0, 0.15, 0), pierre));
  g.add(mesh(new T.BoxGeometry(1.8, 1.1, 1.3).translate(0, 0.85, 0), bois));
  const t1 = mesh(new T.CylinderGeometry(0.001, 1.25, 0.9, 4).rotateY(Math.PI / 4).scale(1.3, 1, 1), toit); t1.position.y = 1.85; g.add(t1);
  g.add(mesh(new T.CylinderGeometry(0.1, 0.12, 0.6, 6).translate(0.55, 2.2, -0.3), pierre));
  const fen = [];
  for (const x of [-0.5, 0.5]) { const f = mesh(new T.PlaneGeometry(0.25, 0.3), mat(0xffd27a, { e: 0xffb040, ei: 1.2, unique: true }), false); f.position.set(x, 0.95, 0.66); g.add(f); fen.push(f); }
  // L'enseigne aux deux lunes
  const ens = new T.Group(); ens.position.set(1.05, 1.2, 0.5); g.add(ens);
  for (const [x, c] of [[-0.09, 0xf2e6cc], [0.09, 0x9ab8ff]]) { const l = mesh(new T.CylinderGeometry(0.1, 0.1, 0.03, 12).rotateX(Math.PI / 2), mat(c, { e: c, ei: 0.6 }), false); l.position.set(x, -0.2, 0); ens.add(l); }
  // Deux mages amis devant la porte
  const mages = [0xff6a3d, 0x2fd0c0].map((c, i) => { const m = new T.Group(); m.position.set(-0.35 + i * 0.7, 0.3, 1.0); m.add(mesh(cone(0.14, 0.42, 6).translate(0, 0.21, 0), mat(c))); m.add(mesh(new T.SphereGeometry(0.08, 6, 5).translate(0, 0.5, 0), mat(0xe8c890))); m.add(mesh(cone(0.1, 0.22, 6).translate(0, 0.66, 0), mat(c))); g.add(m); return m; });
  const fumee = [];
  for (let i = 0; i < 4; i++) { const p = new T.Mesh(new T.IcosahedronGeometry(0.1, 0), new T.MeshBasicMaterial({ color: 0xc8c0b8, transparent: true, opacity: 0.5, depthWrite: false })); g.add(p); fumee.push(p); }
  return { g, haut: 2.6, anim: (t) => {
    ens.rotation.z = Math.sin(t * 1.5) * 0.12;
    fen.forEach((f, i) => { f.material.emissiveIntensity = 0.9 + Math.sin(t * 7 + i * 2) * 0.12; });
    mages.forEach((m, i) => { m.rotation.y = Math.sin(t * 1.2 + i * 3) * 0.6 + (i ? -0.6 : 0.6); m.position.y = 0.3 + Math.abs(Math.sin(t * 3 + i)) * 0.03; });
    fumee.forEach((p, i) => { const k = (t * 0.3 + i / 4) % 1; p.position.set(0.55 + Math.sin(t + i) * 0.1 * k, 2.55 + k * 1.1, -0.3); p.scale.setScalar(0.6 + k * 1.5); p.material.opacity = 0.45 * (1 - k); });
  } };
}
function foret() {
  const g = new T.Group();
  const prom = [];
  ["micho", "ruisselin", "neve", "pyrok"].forEach((id, i) => {
    try {
      const rig = construireDragon(id, i === 3 ? 1 : 0, {});
      rig.racine.scale.setScalar(0.65 / Math.max(rig.taille.x, rig.taille.z, rig.taille.y));
      g.add(rig.racine);
      const an = new Animateur(rig); an.jouer("marche");
      prom.push({ rig, an, a: i * 1.6, r: 0.8 + i * 0.6, v: (i % 2 ? -1 : 1) * (0.25 + i * 0.05) });
    } catch (e) { /* */ }
  });
  for (let k = 0; k < 4; k++) { const b = mesh(new T.CylinderGeometry(0.05, 0.05, 0.02, 6), mat(0x9ad8ff, { e: 0x5ab0e8, ei: 0.4 })); b.position.set(-0.5 + k * 0.3, 0.02, 0.6); g.add(b); }
  return { g, haut: 1.8, anim: (t, dt) => {
    for (const p of prom) { p.a += p.v * dt; p.rig.racine.position.set(Math.cos(p.a) * p.r, 0.05, Math.sin(p.a) * p.r); p.rig.racine.rotation.y = -p.a + (p.v > 0 ? 0 : Math.PI); p.an.update(dt); if (Math.random() < dt * 0.1) p.an.jouer(Math.random() < 0.5 ? "joie" : "rugir"); }
  } };
}
function tour() {
  const g = new T.Group();
  const pierre = mat(0x6a6480, { r: 0.9 }), fonce = mat(0x4a4460, { r: 0.9 }), cristal = mat(0xc8a8ff, { e: 0x8a5aff, ei: 1.2, r: 0.2, m: 0.3 });
  let y = 0, r0 = 0.9;
  for (let k = 0; k < 7; k++) {
    const h = 0.7, r1 = r0 * 0.88;
    g.add(mesh(new T.CylinderGeometry(r1, r0, h, 9).translate(0, y + h / 2, 0), k % 2 ? fonce : pierre));
    for (let f = 0; f < 3; f++) { const a = (f / 3) * Math.PI * 2 + k * 0.5; const w = mesh(new T.BoxGeometry(0.1, 0.18, 0.03), mat(0xffd27a, { e: 0xffb030, ei: 1.3 }), false); w.position.set(Math.cos(a) * (r1 + r0) / 2.02, y + h * 0.55, Math.sin(a) * (r1 + r0) / 2.02); w.rotation.y = -a + Math.PI / 2; g.add(w); }
    y += h; r0 = r1;
  }
  const toit = mesh(cone(r0 + 0.12, 1, 9), mat(0x5a3a8a, { r: 0.7 })); toit.position.y = y; g.add(toit);
  const c = mesh(new T.OctahedronGeometry(0.28, 0).scale(1, 1.6, 1), cristal); c.position.y = y + 1.5; g.add(c);
  const lum = new T.PointLight(0xa07aff, 1.4, 6, 2); lum.position.y = y + 1.5; g.add(lum);
  const vols = [];
  ["pyrok", "glaciarque", "abyssor"].forEach((id, i) => {
    try {
      const rig = construireDragon(id, 2, {});
      rig.racine.scale.setScalar(0.7 / Math.max(rig.taille.x, rig.taille.z, rig.taille.y));
      const pivot = new T.Group(); pivot.position.y = y + 0.6 + i * 0.45; g.add(pivot);
      rig.racine.position.x = 1.6 + i * 0.3; pivot.add(rig.racine);
      const an = new Animateur(rig); an.jouer("vol");
      vols.push({ pivot, rig, an, v: 0.6 + i * 0.12, ph: i * 2.1 });
    } catch (e) { /* */ }
  });
  return { g, haut: y + 2.2, anim: (t, dt) => {
    c.rotation.y = t; c.position.y = y + 1.5 + Math.sin(t * 1.5) * 0.12;
    for (const v of vols) { v.pivot.rotation.y = -(t * v.v + v.ph); v.rig.racine.rotation.z = -0.25; v.rig.racine.position.y = Math.sin(t * 1.3 + v.ph) * 0.25; v.an.update(dt); }
  } };
}
function villages() {
  const g = new T.Group();
  const flots = [];
  const pos = [[0, 2.6, 0, "feu", 1.7], [2.6, 3.4, 1.2, "glace", 1.1], [-2.4, 2.2, 1.4, "eau", 1.2], [1, 4, -2.3, "eau", 1], [-1.7, 3.6, -2, "feu", 0.9]];
  const toitC = { feu: 0x8a3a2a, glace: 0x4a6a9a, eau: 0x2a7a6a };
  pos.forEach(([x, y, z, elx, ray], i) => {
    const ilot = new T.Group(); ilot.position.set(x, y, z); g.add(ilot);
    ilot.add(construireIleEnnemie(elx, ray, 60 + i));
    if (i === 0) { const f = construireForteresse(2, false, 1.2); f.scale.setScalar(0.55); ilot.add(f); }
    else { const r = rng(70 + i); for (let k = 0; k < 2; k++) { const a = r() * 6.28, d = ray * 0.4 * r(); const m = mesh(new T.BoxGeometry(0.32, 0.26, 0.3).translate(0, 0.13, 0), mat(0xc8b8a0)); m.position.set(Math.cos(a) * d, 0, Math.sin(a) * d); ilot.add(m); const tt = mesh(cone(0.28, 0.26, 4), mat(toitC[elx])); tt.position.set(m.position.x, 0.39, m.position.z); tt.rotation.y = Math.PI / 4; ilot.add(tt); } }
    flots.push({ ilot, y, ph: i * 1.3 });
  });
  return { g, haut: 5.2, anim: (t) => { for (const f of flots) f.ilot.position.y = f.y + Math.sin(t * 0.7 + f.ph) * 0.14; } };
}
function port() {
  const g = new T.Group();
  const bois = mat(0x7a5434, { r: 0.9 });
  // Quais qui avancent dans la mer
  for (let k = 0; k < 3; k++) { g.add(mesh(new T.BoxGeometry(2.6, 0.08, 0.4).translate(1.6, 0.25, -0.9 + k * 0.9), bois)); for (let p = 0; p < 4; p++) g.add(mesh(new T.CylinderGeometry(0.05, 0.05, 0.9, 5).translate(0.6 + p * 0.8, -0.1, -0.9 + k * 0.9 + 0.2), bois)); }
  g.add(mesh(new T.BoxGeometry(1.2, 0.9, 1).translate(-0.6, 0.45, 0), mat(0xb89870, { r: 0.9 })));
  const t1 = mesh(new T.CylinderGeometry(0.001, 0.95, 0.6, 4).rotateY(Math.PI / 4), mat(0x8a2a1a)); t1.position.set(-0.6, 1.2, 0); g.add(t1);
  // Phare et son faisceau
  g.add(mesh(new T.CylinderGeometry(0.18, 0.25, 1.6, 8).translate(-0.4, 0.8, -1.2), mat(0xf0ece0)));
  const feu = mesh(new T.SphereGeometry(0.15, 8, 6), mat(0xffd27a, { e: 0xffb040, ei: 1.6 }), false); feu.position.set(-0.4, 1.75, -1.2); g.add(feu);
  const faisceau = mesh(new T.ConeGeometry(0.35, 3, 8, 1, true).rotateZ(Math.PI / 2).translate(1.5, 0, 0), new T.MeshBasicMaterial({ color: 0xfff0b0, transparent: true, opacity: 0.18, depthWrite: false, side: T.DoubleSide }), false);
  const pivot = new T.Group(); pivot.position.set(-0.4, 1.75, -1.2); pivot.add(faisceau); g.add(pivot);
  // Dirigeables amarrés
  const nefs = [0, 1].map((i) => {
    const n = new T.Group(); n.position.set(1.4 + i * 1, 1.4, -0.45 + i * 0.9); g.add(n);
    const b = mesh(new T.SphereGeometry(0.4, 12, 8), mat(i ? 0xc8443a : 0xe8a040, { r: 0.7 })); b.scale.set(1.7, 0.8, 0.8); n.add(b);
    n.add(mesh(new T.BoxGeometry(0.45, 0.14, 0.24).translate(0, -0.5, 0), bois));
    return n;
  });
  return { g, haut: 2.4, anim: (t) => {
    pivot.rotation.y = t * 0.8;
    const ex = E().expedition, parti = ex && ex.fin > maintenant();
    nefs.forEach((n, i) => { n.position.y = 1.4 + Math.sin(t * 1.1 + i) * 0.08; n.rotation.y = Math.sin(t * 0.4 + i) * 0.1; });
    // Pendant une expédition, le premier dirigeable est parti au loin
    nefs[0].visible = !parti;
  } };
}
function volcan() {
  const g = new T.Group();
  const lave = mat(0xff5a0a, { e: 0xff3a00, ei: 1.4 });
  const lac = mesh(new T.CylinderGeometry(1.2, 1.2, 0.08, 16), lave, false); lac.position.y = -0.2; g.add(lac);
  const lum = new T.PointLight(0xff5a1a, 2, 8, 2); lum.position.y = 1; g.add(lum);
  // Le dragon-roi endormi dans le cratère
  let roi = null, an = null;
  try {
    roi = construireDragon(boss().id, 4, {});
    roi.racine.scale.setScalar(1.9 / Math.max(roi.taille.x, roi.taille.z, roi.taille.y));
    roi.racine.position.y = 0.05; g.add(roi.racine);
    an = new Animateur(roi); an.jouer("dormir");
  } catch (e) { /* */ }
  const fumee = [];
  for (let i = 0; i < 6; i++) { const p = new T.Mesh(new T.IcosahedronGeometry(0.2, 0), new T.MeshBasicMaterial({ color: 0x5a4a48, transparent: true, opacity: 0.5, depthWrite: false })); g.add(p); fumee.push(p); }
  const base = roi ? roi.racine.scale.x : 1;
  return { g, haut: 2.2, anim: (t, dt) => {
    lum.intensity = 1.8 + Math.sin(t * 3) * 0.4 + Math.random() * 0.2;
    if (an) { an.update(dt); roi.racine.scale.y = base * (1 + Math.sin(t * 1.2) * 0.04); }
    fumee.forEach((p, i) => { const k = (t * 0.2 + i / 6) % 1; p.position.set(Math.sin(t * 0.5 + i) * 0.4 * k, 1 + k * 3, Math.cos(i) * 0.3 * k); p.scale.setScalar(0.8 + k * 2.4); p.material.opacity = 0.45 * (1 - k); });
  } };
}
function portail() {
  const g = new T.Group();
  const pierre = mat(0x8a8070, { r: 0.9 }), or = mat(0xf2b544, { r: 0.35, m: 0.6, e: 0x7a4a00, ei: 0.5 });
  g.add(mesh(new T.CylinderGeometry(1.6, 1.8, 0.25, 10).translate(0, 0.12, 0), mat(0x6a6458)));
  for (const s of [-1, 1]) { g.add(mesh(new T.BoxGeometry(0.45, 2.4, 0.45).translate(s * 1, 1.45, 0), pierre)); g.add(mesh(new T.OctahedronGeometry(0.16, 0).translate(s * 1, 2.85, 0), or)); }
  const arche = mesh(new T.TorusGeometry(1, 0.22, 6, 16, Math.PI), pierre); arche.position.y = 2.65; g.add(arche);
  for (let k = 0; k < 5; k++) { const a = (k / 4) * Math.PI; const r = mesh(new T.BoxGeometry(0.1, 0.1, 0.05), mat(0xffd27a, { e: 0xffb040, ei: 1.4 }), false); r.position.set(Math.cos(a) * 1, 2.65 + Math.sin(a) * 1, 0.24); g.add(r); }
  // Le voile du portail, qui tourbillonne
  const voile = mesh(new T.CircleGeometry(0.85, 24), new T.MeshBasicMaterial({ color: 0xffc860, transparent: true, opacity: 0.45, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide }), false);
  voile.position.set(0, 1.8, 0); voile.scale.y = 1.25; g.add(voile);
  const lum = new T.PointLight(0xffc860, 1.4, 6, 2); lum.position.set(0, 1.8, 0.4); g.add(lum);
  const etincelles = [];
  for (let k = 0; k < 10; k++) { const e = mesh(new T.OctahedronGeometry(0.05, 0), new T.MeshBasicMaterial({ color: 0xfff0c0 }), false); g.add(e); etincelles.push(e); }
  return { g, haut: 3.4, anim: (t) => {
    voile.rotation.z = t * 0.8; voile.material.opacity = 0.35 + Math.sin(t * 2.2) * 0.12; lum.intensity = 1.2 + Math.sin(t * 2.2) * 0.4;
    etincelles.forEach((e, i) => { const a = t * 1.5 + i * 0.63; const r = 0.4 + (i % 3) * 0.2; e.position.set(Math.cos(a) * r, 1.8 + Math.sin(a) * r * 1.2, 0.1); });
  } };
}
const FABRIQUES = { legendes: portail, arene, hall, amis: auberge, sauvage: foret, tour, villages, port, boss: volcan };

// Un chemin plat posé sur le relief
function ruban(pts, l, m) {
  const pos = [], idx = [];
  pts.forEach((p, i) => {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
    const dx = b.x - a.x, dz = b.z - a.z, n = Math.hypot(dx, dz) || 1;
    const ox = (-dz / n) * l / 2, oz = (dx / n) * l / 2;
    pos.push(p.x + ox, hauteur(p.x + ox, p.z + oz) + 0.06, p.z + oz, p.x - ox, hauteur(p.x - ox, p.z - oz) + 0.06, p.z - oz);
    if (i) { const k = i * 2; idx.push(k - 2, k - 1, k, k - 1, k + 1, k); }
  });
  const g = new T.BufferGeometry(); g.setAttribute("position", new T.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
  const r = new T.Mesh(g, m); r.receiveShadow = true; return r;
}

// ---------- La maquette ----------
function construire() {
  const scene = new T.Scene();
  scene.fog = new T.Fog(0x1a1a2e, 160, 320);
  scene.add(ciel(0x14183a, 0x5a4a78, 0x1a1428, 300));
  eclairage(scene, { ciel: 0xe8e0ff, sol: 0x3a3040, hemi: 0.85, soleil: 0xfff0d8, force: 1.6, zoneOmbre: 30, x: 14, y: 24, z: 10, carte: 2048 });
  const camera = new T.OrthographicCamera(-10, 10, 10, -10, 0.1, 400);
  // Terrain
  const geo = new T.PlaneGeometry(LARG * 2.3, PROF * 2.25, 92, 140).rotateX(-Math.PI / 2);
  const p = geo.attributes.position, cols = [];
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i), h = hauteur(x, z); p.setY(i, h); const c = couleurSol(x, z, h); cols.push(c.r, c.g, c.b); }
  geo.setAttribute("color", new T.Float32BufferAttribute(cols, 3));
  geo.computeVertexNormals();
  const sol = new T.Mesh(geo, new T.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.95 }));
  sol.receiveShadow = true; scene.add(sol);
  // Mer qui ondule
  const mer = new T.Mesh(new T.PlaneGeometry(140, 140, 50, 50).rotateX(-Math.PI / 2), new T.MeshStandardMaterial({ color: 0x2a7a9a, flatShading: true, roughness: 0.3, metalness: 0.1 }));
  mer.position.y = -0.02; scene.add(mer);
  const pm = mer.geometry.attributes.position;
  // Forêts, sapins enneigés au nord, arbres morts près du volcan
  const r = rng(42);
  for (let k = 0; k < 260; k++) {
    const x = (r() - 0.5) * LARG * 2, z = (r() - 0.5) * PROF * 2, h = hauteur(x, z);
    if (h < 0.25 || h > 3.4) continue;
    if (ILES_COMBAT.some((l) => Math.hypot(l.pos[0] - x, l.pos[1] - z) < (l.id === "arene" || l.id === "hall" ? 3.6 : 2.4))) continue;
    if (Math.hypot(x - 1, z - 7.5) < 5.5) continue;
    let a;
    if (z < -7) a = sapin(r, h > 2);
    else if (Math.hypot(x + 2, z - 17) < 7) { if (r() < 0.6) continue; a = arbreMort(r); }
    else if (x < -3 && z > -9 && z < 2) a = arbreRond(r, r() < 0.5 ? 0x2f7a3a : 0x3a8a4a);
    else { if (r() < 0.55) continue; a = arbreRond(r, 0x4a9a4a); }
    a.position.set(x, h, z); a.scale.multiplyScalar(0.5); scene.add(a);
  }
  // La cité : petites maisons autour de l'arène
  for (let k = 0; k < 22; k++) {
    const a = r() * 6.28, d = 3.4 + r() * 2.6, x = 1 + Math.cos(a) * d, z = 7.5 + Math.sin(a) * d;
    if (ILES_COMBAT.some((l) => Math.hypot(l.pos[0] - x, l.pos[1] - z) < 2.1)) continue;
    const h = hauteur(x, z);
    const m = mesh(new T.BoxGeometry(0.5, 0.45, 0.45).translate(0, 0.22, 0), mat(0xd8c8b0)); m.position.set(x, h, z); m.rotation.y = r() * 3; scene.add(m);
    const t = mesh(cone(0.42, 0.35, 4), mat([0x8a3a2a, 0x3a5a8a, 0x2a7a6a][k % 3])); t.position.set(x, h + 0.62, z); t.rotation.y = m.rotation.y + Math.PI / 4; scene.add(t);
  }
  // Routes depuis la cité
  const routes = [];
  const centre = new T.Vector3(1, 0, 7.5);
  for (const l of ILES_COMBAT) {
    if (l.id === "arene" || l.id === "hall" || l.id === "villages") continue;
    const a = centre.clone(), b = new T.Vector3(l.pos[0], 0, l.pos[1]);
    const m = a.clone().lerp(b, 0.5).add(new T.Vector3((r() - 0.5) * 3, 0, (r() - 0.5) * 3));
    const courbe = new T.CatmullRomCurve3([a, m, b]);
    const pts = courbe.getPoints(40).map((v) => v.setY(Math.max(0.05, hauteur(v.x, v.z)) + 0.05));
    const c2 = new T.CatmullRomCurve3(pts);
    scene.add(ruban(c2.getPoints(80), 0.32, mat(0xa88a5a, { r: 1, d: true })));
    routes.push(c2);
  }
  // Charrettes sur les routes
  const charrettes = routes.slice(0, 4).map((c, i) => { const m = new T.Group(); m.add(mesh(new T.BoxGeometry(0.3, 0.16, 0.2).translate(0, 0.14, 0), mat(0x8a5a32))); m.add(mesh(new T.BoxGeometry(0.18, 0.14, 0.1).translate(0.22, 0.12, 0), mat(0x6a4a3a))); scene.add(m); return { m, c, u: i * 0.25, v: 0.025 + i * 0.006 }; });
  // Nuages qui passent (avec leur ombre)
  const nuages = [];
  const matNuage = new T.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.55, flatShading: true, depthWrite: false });
  for (let k = 0; k < 10; k++) { const n = new T.Group(); for (let j = 0; j < 3; j++) { const s = mesh(new T.IcosahedronGeometry(0.7 + r() * 0.6, 1), matNuage, true); s.scale.y = 0.5; s.position.set(j * 0.9, r() * 0.3, r() * 0.5); n.add(s); } const cote = k % 2 ? 1 : -1; n.position.set(cote * (LARG + 3 + r() * 6), 3 + r() * 2, (r() - 0.5) * PROF * 2); n.userData.v = 0.15 + r() * 0.2; scene.add(n); nuages.push(n); }
  // Oiseaux (petits dragons lointains)
  const oiseaux = [];
  for (let k = 0; k < 5; k++) { const o = new T.Group(); for (const s of [-1, 1]) { const a = mesh(new T.BoxGeometry(0.3, 0.02, 0.08).translate(s * 0.15, 0, 0), mat(0x2a2030), false); o.add(a); } scene.add(o); oiseaux.push({ o, a: r() * 6, r: 6 + r() * 10, y: 6 + r() * 3, v: 0.2 + r() * 0.2 }); }
  // Les lieux
  const lieux = {};
  for (const def of ILES_COMBAT) {
    const m = FABRIQUES[def.id]();
    const [x, z] = def.pos;
    m.g.position.set(x, def.id === "villages" ? 0 : Math.max(0.05, hauteur(x, z)), z);
    m.g.traverse((o) => { if (o.isMesh) o.userData.lieu = def.id; });
    // Zone de toucher généreuse autour de chaque lieu
    const zone = new T.Mesh(new T.CylinderGeometry(2.4, 2.4, m.haut + 1, 10), new T.MeshBasicMaterial({ visible: false })); zone.position.y = (m.haut + 1) / 2; zone.userData.lieu = def.id; m.g.add(zone);
    scene.add(m.g);
    lieux[def.id] = { ...m, def };
  }
  A = {
    scene, camera, lieux, t: 0, vue: { cible: new T.Vector3(0, 0, 0), zoom: 1, az: 0 }, voulu: { cible: new T.Vector3(0, 0, 0), zoom: 1, az: 0 }, libre: { x: 0, z: 0, zoom: 1, az: 0 },
    update(dt) {
      A.t += dt;
      const t = A.t;
      for (let i = 0; i < pm.count; i++) { const x = pm.getX(i), z = pm.getZ(i); pm.setY(i, Math.sin(x * 0.4 + t * 1.2) * 0.06 + Math.cos(z * 0.5 + t) * 0.05); }
      pm.needsUpdate = true;
      for (const l of Object.values(lieux)) l.anim(t, dt);
      for (const c of charrettes) { c.u = (c.u + c.v * dt) % 1; const pt = c.c.getPointAt(c.u), tg = c.c.getTangentAt(c.u); c.m.position.copy(pt); c.m.rotation.y = Math.atan2(-tg.z, tg.x); }
      for (const n of nuages) { n.position.z += dt * n.userData.v; if (n.position.z > PROF * 1.2) n.position.z = -PROF * 1.2; }
      for (const o of oiseaux) { o.a += o.v * dt; o.o.position.set(Math.cos(o.a) * o.r, o.y, Math.sin(o.a) * o.r * 1.4); o.o.rotation.y = -o.a; o.o.children.forEach((w, i) => { w.rotation.z = (i ? 1 : -1) * Math.sin(t * 8 + o.a) * 0.5; }); }
      // Caméra : glisse doucement vers la vue voulue
      const k = 1 - Math.exp(-5 * dt);
      const vc = A.voulu.cible.clone().add(new T.Vector3(A.libre.x, 0, A.libre.z));
      A.vue.cible.lerp(vc, k); A.vue.zoom += (A.voulu.zoom * A.libre.zoom - A.vue.zoom) * k; A.vue.az += (A.libre.az - A.vue.az) * k;
      cadrer();
      majEtiquettes();
    },
  };
  installerToucher();
}

// Caméra orthographique : vue isométrique fixe, la maquette entière tient à l'écran
function cadrer() {
  const cam = A.camera, l = window.innerWidth, h = window.innerHeight, asp = l / h;
  const besoinL = LARG * 1.12, besoinH = PROF * 0.88;
  const demiH = Math.max(besoinH, besoinL / asp) / A.vue.zoom;
  cam.left = -demiH * asp; cam.right = demiH * asp; cam.top = demiH; cam.bottom = -demiH;
  const az = 0.3 + A.vue.az, elv = 1.0, d = 120;
  const c = A.vue.cible;
  cam.position.set(c.x + Math.sin(az) * Math.cos(elv) * d, c.y + Math.sin(elv) * d, c.z + Math.cos(az) * Math.cos(elv) * d);
  cam.lookAt(c);
  cam.updateProjectionMatrix();
}
function vueEnsemble() { A.voulu.cible.set(0, 0.5, etroit() ? -1.8 : 0); A.voulu.zoom = 1; A.libre.x = 0; A.libre.z = 0; A.libre.zoom = 1; if (ctxJeu) ctxJeu.moteur.definirZone(null); }
function viserLieu(id) {
  const l = A.lieux[id];
  A.libre.x = 0; A.libre.z = 0; A.libre.zoom = 1;
  A.voulu.cible.copy(l.g.position).add(new T.Vector3(0, l.haut * 0.4, 0));
  A.voulu.zoom = etroit() ? 2.6 : 2.2;
}

function installerToucher() {
  const canvas = document.getElementById("scene3d"), ray = new T.Raycaster();
  let d0 = null;
  // Glisser (un doigt) déplace un peu la vue ; pincer zoome ; deux doigts qui tournent (ou clic droit) pivotent légèrement
  const doigts = new Map();
  let geste = null;
  const actif = () => ctxJeu && ctxJeu.moteur.decor === A;
  const borne = () => { const L = A.libre; L.x = Math.max(-5, Math.min(5, L.x)); L.z = Math.max(-6, Math.min(6, L.z)); L.zoom = Math.max(0.85, Math.min(1.8, L.zoom)); L.az = Math.max(-0.45, Math.min(0.45, L.az)); };
  canvas.addEventListener("pointerdown", (e) => { if (!actif()) return; doigts.set(e.pointerId, { x: e.clientX, y: e.clientY }); geste = null; });
  canvas.addEventListener("pointermove", (e) => {
    if (!actif() || !doigts.has(e.pointerId)) return;
    const p = doigts.get(e.pointerId), dx = e.clientX - p.x, dy = e.clientY - p.y;
    if (doigts.size === 1) {
      const echelle = (PROF * 1.6) / (window.innerHeight * A.vue.zoom);
      if (e.buttons === 2 || e.shiftKey) A.libre.az += dx * 0.004;
      else { const c = Math.cos(0.3 + A.vue.az), s = Math.sin(0.3 + A.vue.az); A.libre.x -= (dx * c + dy * s * 0.6) * echelle; A.libre.z -= (dy * c * 1.4 - dx * s) * echelle; }
    } else if (doigts.size === 2) {
      const [a, b] = [...doigts.values()];
      const ancien = { d: Math.hypot(a.x - b.x, a.y - b.y), ang: Math.atan2(b.y - a.y, b.x - a.x) };
      p.x = e.clientX; p.y = e.clientY;
      const [a2, b2] = [...doigts.values()];
      const d2 = Math.hypot(a2.x - b2.x, a2.y - b2.y), ang2 = Math.atan2(b2.y - a2.y, b2.x - a2.x);
      if (ancien.d > 0) A.libre.zoom *= d2 / ancien.d;
      A.libre.az -= (ang2 - ancien.ang);
      borne(); return;
    }
    p.x = e.clientX; p.y = e.clientY; borne();
  });
  const lever = (e) => { doigts.delete(e.pointerId); };
  canvas.addEventListener("pointerup", lever); canvas.addEventListener("pointercancel", lever);
  canvas.addEventListener("contextmenu", (e) => { if (actif()) e.preventDefault(); });
  canvas.addEventListener("wheel", (e) => { if (!actif()) return; A.libre.zoom *= e.deltaY > 0 ? 0.92 : 1.08; borne(); }, { passive: true });
  canvas.addEventListener("pointerdown", (e) => { d0 = { x: e.clientX, y: e.clientY }; });
  canvas.addEventListener("pointerup", (e) => {
    if (!d0 || !ctxJeu || ctxJeu.moteur.decor !== A || Math.hypot(e.clientX - d0.x, e.clientY - d0.y) > 10) return;
    ray.setFromCamera(new T.Vector2((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1), A.camera);
    for (const h of ray.intersectObjects(Object.values(A.lieux).map((i) => i.g), true)) { if (h.object.userData.lieu) { choisir(h.object.userData.lieu); return; } }
    // Toucher ailleurs : retour à la vue d'ensemble
    if (choisie) fermerFiche();
  });
}

// ---------- Étiquettes ----------
const etiqs = new Map();
let statutFn = () => ["", false, false];
function majEtiquettes() {
  if (!calque || !calque.isConnected || ctxJeu.moteur.decor !== A) return;
  const fiche = document.querySelector(".ar-fiche");
  const basMax = fiche ? fiche.getBoundingClientRect().top - 6 : window.innerHeight - 86;
  const hautMin = (document.querySelector(".ar-titre:not([hidden])")?.getBoundingClientRect().bottom || document.getElementById("hud")?.getBoundingClientRect().bottom || 0) + 26;
  for (const def of ILES_COMBAT) {
    let e = etiqs.get(def.id);
    if (!e) { e = el("button", { class: "ar-etiq", style: { "--c": def.c }, onclick: () => choisir(def.id) }, el("b", {}, def.nom), el("small")); calque.append(e); etiqs.set(def.id, e); }
    const l = A.lieux[def.id];
    const p = versEcran(l.g.position.clone().add(new T.Vector3(0, l.haut + 0.2, 0)), A.camera);
    const ok = p.devant && p.y < basMax && p.y > hautMin && p.x > -40 && p.x < window.innerWidth + 40 && (!choisie || choisie === def.id);
    e.hidden = !ok;
    if (!ok) continue;
    const demi = (e.offsetWidth || 120) / 2 + 6;
    e.style.left = Math.round(Math.max(demi, Math.min(window.innerWidth - demi, p.x))) + "px"; e.style.top = Math.round(p.y) + "px";
    const [txt, ferme, chaud] = statutFn(def.id);
    const s = e.querySelector("small"); if (s.textContent !== txt) s.textContent = txt;
    e.classList.toggle("ferme", !!ferme); e.classList.toggle("chaud", !!chaud); e.classList.toggle("choisi", choisie === def.id);
  }
}

// ---------- Fiche d'un lieu ----------
let contenuFn = null;
function fermerFiche() { choisie = null; ui.querySelector(".ar-fiche")?.remove(); vueEnsemble(); const ti = ui.querySelector(".ar-titre"); if (ti) ti.hidden = false; }
export function choisir(id) {
  const def = lieu(id);
  if (!def || !A) return;
  Son.clic();
  choisie = id;
  viserLieu(id);
  const ti = ui.querySelector(".ar-titre"); if (ti) ti.hidden = true;
  const ancienne = ui.querySelector(".ar-fiche"), defile = ancienne ? ancienne.scrollTop : 0;
  if (ancienne) ancienne.remove();
  const f = el("section", { class: "ar-fiche panneau", style: { "--c": def.c } },
    el("header", {}, el("div", {}, el("h3", {}, def.nom)), el("button", { class: "fermer-fiche", "aria-label": "Fermer", onclick: () => { Son.clic(); fermerFiche(); } }, "✕")),
    el("p", { class: "lore" }, def.lore), el("p", {}, def.texte));
  f.append(contenuFn ? contenuFn(id, () => choisir(id)) : el("div"));
  ui.append(f);
  f.scrollTop = defile;
  // La caméra centre le lieu dans la partie visible, au-dessus de la fiche
  const haut = f.getBoundingClientRect().top;
  ctxJeu.moteur.definirZone({ x: 0, y: 0, l: 1, h: Math.max(etroit() ? 0.3 : 0.4, (haut - 10) / window.innerHeight) });
}

// ---------- Ouvrir ----------
// quandChoix(lieu, mode) lance un combat ; contenu(lieu, refaire) remplit la fiche ; statut(lieu) → [texte, fermé, chaud]
export function ouvrirArchipel(ctx, racine, quandChoix, opts = {}) {
  ctxJeu = ctx; ui = racine; surChoix = quandChoix; choisie = null;
  contenuFn = opts.contenu || null; statutFn = opts.statut || statutFn;
  if (!A) construire();
  ctx.moteur.montrer(A);
  Musique.jouer("iles");
  vueEnsemble();
  A.vue.zoom = 0.7; A.vue.cible.copy(A.voulu.cible);
  ui.innerHTML = "";
  ui.append(el("div", { class: "ar-titre" }, el("div", { class: "etiquette" }, "Combat"), el("h2", {}, "Le continent des mages")));
  calque = el("div", { class: "ar-etiqs" }); ui.append(calque); etiqs.clear();
  if (opts.lieu) setTimeout(() => choisir(opts.lieu), 50);
}
export function lancerMode(id, mode) { if (surChoix) surChoix(id, mode); }
export function cibleArchipel(id) {
  if (!A || !ctxJeu || ctxJeu.moteur.decor !== A) return null;
  const l = A.lieux[id]; if (!l) return null;
  const p = versEcran(l.g.position.clone().add(new T.Vector3(0, l.haut + 1.2, 0)), A.camera);
  return p.devant ? p : null;
}
