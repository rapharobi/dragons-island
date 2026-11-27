// L'archipel des combats : l'écran Combat n'est plus un menu. Chaque île flottante est un mode de jeu :
// l'arène (duel classé), la tour du nid (des dragons tournent au sommet), l'île sauvage (dragons faciles),
// l'archipel des villages (attaques) et l'île des amis (même téléphone ou en ligne).
import { construireDragon } from "./modele.js";
import { Animateur } from "./anim.js";
import { ciel, eclairage, Orbite, versEcran } from "./scene.js";
import { construireIleEnnemie, construireForteresse, sapin, palmier, arbreRond, arbreMort } from "./monde.js";
import { mat, mesh, cone, rng } from "./outils3d.js";
import { E } from "./etat.js";
import { el, styles } from "./ui.js";
import { Son, Musique } from "./son.js";

const T = window.THREE;
const etroit = () => window.innerWidth / window.innerHeight < 0.8;

styles("archipel", `
.ar-titre { position: fixed; z-index: 14; top: calc(var(--hud) + var(--tuto, 0px) + 10px); left: 0; right: 0; text-align: center; pointer-events: none; padding: 0 var(--bord-d) 0 var(--bord-g); }
.ar-titre .etiquette { color: var(--ambre); }
.ar-titre h2 { font-size: clamp(24px, 6vw, 36px); text-shadow: 0 2px 18px rgba(0,0,0,.6); }
.ar-etiqs { position: fixed; inset: 0; pointer-events: none; z-index: 13; }
.ar-etiq { position: absolute; transform: translate(-50%, -100%); pointer-events: auto; cursor: pointer; display: grid; justify-items: center; gap: 2px; padding: 7px 12px 8px; border-radius: 14px;
  background: linear-gradient(180deg, rgba(30, 24, 48, .9), rgba(14, 12, 24, .9)); border: 1px solid color-mix(in srgb, var(--c) 60%, transparent); color: var(--texte); white-space: nowrap;
  box-shadow: 0 8px 22px rgba(0,0,0,.4), 0 0 18px color-mix(in srgb, var(--c) 25%, transparent); transition: transform .15s; }
.ar-etiq:hover, .ar-etiq.choisi { transform: translate(-50%, -100%) scale(1.06); border-color: var(--c); }
.ar-etiq b { font-family: var(--titre); font-size: 15px; color: var(--c); }
.ar-etiq small { color: var(--doux); font-size: 11px; }
.ar-etiq.ferme { filter: grayscale(.7); opacity: .8; }
.ar-etiq::after { content: ""; position: absolute; left: 50%; bottom: -7px; width: 12px; height: 12px; transform: translateX(-50%) rotate(45deg); background: rgba(14,12,24,.9); border-right: 1px solid color-mix(in srgb, var(--c) 60%, transparent); border-bottom: 1px solid color-mix(in srgb, var(--c) 60%, transparent); }
.ar-fiche { position: fixed; z-index: 16; left: 50%; transform: translateX(-50%); bottom: calc(var(--bas) + 84px); width: min(420px, calc(100vw - 32px)); padding: 16px; display: grid; gap: 10px; animation: entre .25s; }
.ar-fiche header { display: flex; justify-content: space-between; gap: 10px; align-items: flex-start; }
.ar-fiche h3 { font-size: 22px; color: var(--c); }
.ar-fiche p { margin: 0; color: var(--doux); font-size: 13px; }
.ar-fiche .choix { display: grid; gap: 8px; }
.ar-fiche .choix .btn { justify-content: flex-start; text-align: left; display: grid; gap: 2px; padding: 11px 14px; }
.ar-fiche .choix .btn small { color: inherit; opacity: .8; font-weight: 400; font-size: 12px; }
@media (max-width: 560px) { .ar-fiche { bottom: calc(var(--bas) + 76px); padding: 13px 14px; } .ar-etiq { padding: 5px 9px 6px; } .ar-etiq b { font-size: 13px; } .ar-etiq small { font-size: 10px; } }
`);

// Les îles : position, couleur, modes
export const ILES_COMBAT = [
  { id: "arene", nom: "L'Arène", c: "#f2b544", pos: [0, 0, 9], modes: ["bot"], texte: "Les duels classés contre les mages de ta ligue. Chaque victoire rapporte des trophées." },
  { id: "tour", nom: "La Tour du nid", c: "#b48aff", pos: [-12, 1.5, -4], modes: ["tour"], texte: "Roguelite : entre sans dragon, choisis 3 œufs et grimpe 21 étages. Au sommet, un œuf mystère UL." },
  { id: "sauvage", nom: "L'Île sauvage", c: "#8ee6a6", pos: [12, -0.5, -3], modes: ["sauvage"], texte: "Des dragons sauvages, plus faibles que les tiens : parfait pour gagner de l'expérience et des rations." },
  { id: "villages", nom: "Les Villages volants", c: "#ff8a5a", pos: [6, 2.5, -15], modes: ["village"], texte: "Un archipel de villages ennemis : attaque-les, détruis leurs bâtiments et surtout leur couvoir." },
  { id: "amis", nom: "L'Île des amis", c: "#7fd6ff", pos: [-8, -1, 8], modes: ["ami", "ligne"], texte: "Défie un ami : sur le même téléphone, ou chacun sur le sien avec un code." },
];

// Sur un téléphone en hauteur, les îles s'étagent en zigzag du bas vers le haut de l'écran
const POS_ETROIT = { arene: [-2, 0, 12], amis: [5.5, -0.5, 4.5], sauvage: [-5.5, 0, -3], villages: [5, 3, -11], tour: [-4, 2, -19] };
function placer() {
  for (const [id, ile] of Object.entries(A.iles)) {
    const p = etroit() ? POS_ETROIT[id] : ile.def.pos;
    ile.g.position.set(p[0], p[1], p[2]); ile.y0 = p[1]; ile.px = p[0];
  }
  A.camera.fov = etroit() ? 58 : 45; A.camera.updateProjectionMatrix();
}
let A = null, ui = null, ctxJeu = null, choisie = null, surChoix = null, calque = null;

// ---------- Décors des îles ----------
function ajouterArbres(g, r, n, rayon, fab) { for (let k = 0; k < n; k++) { const a = r() * 6.28, d = rayon * (0.55 + r() * 0.35); const t = fab(r); t.position.set(Math.cos(a) * d, 0, Math.sin(a) * d); t.rotation.y = r() * 6; g.add(t); } }
function ileArene() {
  const g = new T.Group(), r = rng(11);
  g.add(construireIleEnnemie("feu", 5.5, 21));
  const pierre = mat(0xb8a890, { r: 0.9 }), sable = mat(0xd8c08a, { r: 1 }), or = mat(0xf2b544, { r: 0.35, m: 0.6, e: 0x7a4a00, ei: 0.5 });
  g.add(mesh(new T.CylinderGeometry(3.2, 3.2, 0.12, 28).translate(0, 0.06, 0), sable));
  // Gradins et arches tout autour
  for (let k = 0; k < 22; k++) {
    const a = (k / 22) * Math.PI * 2;
    const p = mesh(new T.BoxGeometry(0.5, 1.8, 0.4).translate(0, 0.9, 0), pierre); p.position.set(Math.cos(a) * 3.9, 0, Math.sin(a) * 3.9); p.rotation.y = -a; g.add(p);
  }
  const anneau = mesh(new T.TorusGeometry(3.9, 0.22, 5, 44), pierre); anneau.rotation.x = Math.PI / 2; anneau.position.y = 1.9; g.add(anneau);
  const anneau2 = mesh(new T.TorusGeometry(3.6, 0.15, 5, 44), pierre); anneau2.rotation.x = Math.PI / 2; anneau2.position.y = 0.9; g.add(anneau2);
  const drapeaux = [];
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI * 2;
    const m = mesh(new T.CylinderGeometry(0.04, 0.04, 1.4, 4).translate(0, 0.7, 0), mat(0x5a4632)); m.position.set(Math.cos(a) * 3.9, 2, Math.sin(a) * 3.9); g.add(m);
    const d = mesh(new T.PlaneGeometry(0.6, 0.38).translate(0.3, 0, 0), mat([0xff6a3d, 0x7fd6ff, 0x2fd0c0][k % 3], { d: true, r: 0.8 }), false); d.position.set(Math.cos(a) * 3.9, 3.15, Math.sin(a) * 3.9); g.add(d); drapeaux.push(d);
  }
  // Le trophée au centre
  const trophee = new T.Group(); trophee.position.y = 0.12; g.add(trophee);
  trophee.add(mesh(new T.CylinderGeometry(0.35, 0.45, 0.3, 8).translate(0, 0.15, 0), pierre));
  trophee.add(mesh(new T.CylinderGeometry(0.06, 0.1, 0.5, 6).translate(0, 0.55, 0), or));
  trophee.add(mesh(new T.CylinderGeometry(0.38, 0.12, 0.5, 10).translate(0, 1.0, 0), or));
  const lum = new T.PointLight(0xffc060, 1.2, 6, 2); lum.position.y = 1.8; g.add(lum);
  return { g, haut: 4.2, anim: (t) => { drapeaux.forEach((d, i) => { d.rotation.y = Math.sin(t * 2 + i) * 0.4; }); trophee.rotation.y = t * 0.6; lum.intensity = 1 + Math.sin(t * 2) * 0.3; } };
}
function ileTour() {
  const g = new T.Group();
  g.add(construireIleEnnemie("glace", 4.6, 33));
  const pierre = mat(0x6a6480, { r: 0.9 }), fonce = mat(0x4a4460, { r: 0.9 }), cristal = mat(0xc8a8ff, { e: 0x8a5aff, ei: 1.2, r: 0.2, m: 0.3 });
  // Tour en étages qui s'affinent, avec des fenêtres lumineuses
  let y = 0, r0 = 1.7;
  for (let k = 0; k < 7; k++) {
    const h = 1.25, r1 = r0 * 0.88;
    g.add(mesh(new T.CylinderGeometry(r1, r0, h, 9).translate(0, y + h / 2, 0), k % 2 ? fonce : pierre));
    g.add(mesh(new T.CylinderGeometry(r1 + 0.12, r1 + 0.12, 0.14, 9).translate(0, y + h, 0), fonce));
    for (let f = 0; f < 4; f++) { const a = (f / 4) * Math.PI * 2 + k * 0.4; const w = mesh(new T.BoxGeometry(0.16, 0.3, 0.04), mat(0xffd27a, { e: 0xffb030, ei: 1.3 }), false); w.position.set(Math.cos(a) * (r1 + r0) / 2.02, y + h * 0.55, Math.sin(a) * (r1 + r0) / 2.02); w.rotation.y = -a + Math.PI / 2; g.add(w); }
    y += h; r0 = r1;
  }
  const toit = mesh(cone(r0 + 0.2, 1.6, 9), mat(0x5a3a8a, { r: 0.7 })); toit.position.y = y; g.add(toit);
  const c = mesh(new T.OctahedronGeometry(0.45, 0).scale(1, 1.6, 1), cristal); c.position.y = y + 2.4; g.add(c);
  const lum = new T.PointLight(0xa07aff, 1.6, 10, 2); lum.position.y = y + 2.4; g.add(lum);
  ajouterArbres(g, rng(5), 6, 4.2, (r) => sapin(r, true));
  // Dragons qui tournent autour du sommet
  const vols = [];
  const ids = ["pyrok", "glaciarque", "abyssor"];
  ids.forEach((id, i) => {
    try {
      const rig = construireDragon(id, 2, {});
      const s = 1.1 / Math.max(rig.taille.x, rig.taille.z, rig.taille.y); rig.racine.scale.setScalar(s);
      const pivot = new T.Group(); pivot.position.y = y + 1.2 + i * 0.7; g.add(pivot);
      rig.racine.position.x = 2.8 + i * 0.5; pivot.add(rig.racine);
      const an = new Animateur(rig); an.jouer("vol");
      vols.push({ pivot, rig, an, v: 0.55 + i * 0.12, ph: i * 2.1 });
    } catch (e) { /* modèle indisponible */ }
  });
  return { g, haut: y + 3.4, anim: (t, dt) => {
    c.rotation.y = t; c.position.y = y + 2.4 + Math.sin(t * 1.5) * 0.15;
    for (const v of vols) { v.pivot.rotation.y = -(t * v.v + v.ph); v.rig.racine.rotation.y = 0; v.rig.racine.rotation.z = -0.25; v.rig.racine.position.y = Math.sin(t * 1.3 + v.ph) * 0.35; v.an.update(dt); }
  } };
}
function ileSauvage() {
  const g = new T.Group();
  g.add(construireIleEnnemie("eau", 5, 44));
  ajouterArbres(g, rng(8), 9, 4.6, (r) => (r() < 0.5 ? palmier(r) : arbreRond(r, 0x3a8a4a)));
  const herbe = mat(0x4aa05a, { r: 1 });
  for (let k = 0; k < 14; k++) { const a = k * 2.4, d = 1 + (k % 4) * 0.8; const b = mesh(cone(0.18, 0.4, 4), herbe); b.position.set(Math.cos(a) * d, 0.2, Math.sin(a) * d); g.add(b); }
  // Petits dragons sauvages qui se promènent
  const promeneurs = [];
  ["micho", "ruisselin", "neve"].forEach((id, i) => {
    try {
      const rig = construireDragon(id, 0, {});
      const s = 0.75 / Math.max(rig.taille.x, rig.taille.z, rig.taille.y); rig.racine.scale.setScalar(s);
      g.add(rig.racine);
      const an = new Animateur(rig); an.jouer("repos");
      promeneurs.push({ rig, an, a: i * 2.1, r: 1.6 + i * 0.7, v: 0.25 + i * 0.08 });
    } catch (e) { /* modèle indisponible */ }
  });
  return { g, haut: 3.2, anim: (t, dt) => {
    for (const p of promeneurs) {
      p.a += p.v * dt;
      p.rig.racine.position.set(Math.cos(p.a) * p.r, Math.abs(Math.sin(t * 6 + p.a)) * 0.05, Math.sin(p.a) * p.r);
      p.rig.racine.rotation.y = -p.a;
      if (Math.random() < dt * 0.15) p.an.jouer(Math.random() < 0.5 ? "joie" : "regarder");
      p.an.update(dt);
    }
  } };
}
function ileVillages() {
  const g = new T.Group();
  const flots = [];
  // Un conglomérat d'îlots qui flottent à des hauteurs différentes, chacun avec son petit village
  const pos = [[0, 0, 0, "feu", 3.2], [5.2, 1.4, 1.5, "glace", 2.2], [-4.6, -0.8, 2, "eau", 2.4], [2, 2.6, -4.4, "eau", 1.9], [-3, 1.8, -4, "feu", 1.7], [5.6, -1.2, -3, "glace", 1.6]];
  const toitC = { feu: 0x8a3a2a, glace: 0x4a6a9a, eau: 0x2a7a6a };
  pos.forEach(([x, y, z, elx, ray], i) => {
    const ilot = new T.Group(); ilot.position.set(x, y, z); g.add(ilot);
    const socle = construireIleEnnemie(elx, ray, 60 + i); socle.scale.setScalar(1); ilot.add(socle);
    if (i === 0) { const f = construireForteresse(2, false, 2.2); f.scale.setScalar(0.7); ilot.add(f); }
    else {
      const r = rng(70 + i);
      for (let k = 0; k < 3; k++) {
        const a = r() * 6.28, d = ray * 0.45 * r();
        const m = mesh(new T.BoxGeometry(0.55, 0.45, 0.5).translate(0, 0.22, 0), mat(0xc8b8a0, { r: 0.9 })); m.position.set(Math.cos(a) * d, 0, Math.sin(a) * d); ilot.add(m);
        const t = mesh(cone(0.48, 0.42, 4), mat(toitC[elx], { r: 0.8 })); t.position.set(m.position.x, 0.66, m.position.z); t.rotation.y = Math.PI / 4; ilot.add(t);
      }
      const tour = mesh(new T.CylinderGeometry(0.22, 0.28, 1.2, 7).translate(0, 0.6, 0), mat(0x8a8276, { r: 0.9 })); tour.position.set(ray * 0.35, 0, -ray * 0.2); ilot.add(tour);
      const feu = mesh(new T.OctahedronGeometry(0.16, 0), mat(0xffa040, { e: 0xff7a20, ei: 1.4 })); feu.position.set(ray * 0.35, 1.45, -ray * 0.2); ilot.add(feu);
    }
    flots.push({ ilot, y, ph: i * 1.3 });
  });
  // Ponts de corde entre les îlots
  const corde = mat(0x5a4632, { r: 1 });
  for (let i = 1; i < pos.length; i++) {
    const a = new T.Vector3(...pos[0].slice(0, 3)), b = new T.Vector3(...pos[i].slice(0, 3));
    const c = new T.CatmullRomCurve3([a.clone().lerp(b, 0.3).add(new T.Vector3(0, 0.1, 0)), a.clone().lerp(b, 0.5).add(new T.Vector3(0, -0.4, 0)), a.clone().lerp(b, 0.72).add(new T.Vector3(0, 0.1, 0))]);
    g.add(mesh(new T.TubeGeometry(c, 12, 0.05, 4), corde, false));
  }
  return { g, haut: 4.6, anim: (t) => { for (const f of flots) f.ilot.position.y = f.y + Math.sin(t * 0.7 + f.ph) * 0.18; } };
}
function ileAmis() {
  const g = new T.Group();
  g.add(construireIleEnnemie("eau", 4.6, 55));
  ajouterArbres(g, rng(9), 5, 4.2, (r) => arbreRond(r, 0x4a9a6a));
  // Deux pavillons face à face, reliés par une arche-portail
  const tissu = [mat(0xff6a3d, { r: 0.8 }), mat(0x7fd6ff, { r: 0.8 })];
  [-1, 1].forEach((s, i) => {
    const p = new T.Group(); p.position.set(s * 2, 0, 0); g.add(p);
    p.add(mesh(new T.CylinderGeometry(0.9, 1, 0.9, 8).translate(0, 0.45, 0), tissu[i]));
    p.add(mesh(cone(1.1, 1.0, 8).translate(0, 1.4, 0), tissu[i]));
    p.add(mesh(new T.CylinderGeometry(0.03, 0.03, 0.8, 4).translate(0, 2.2, 0), mat(0x5a4632)));
  });
  const arche = mesh(new T.TorusGeometry(1.1, 0.12, 6, 20, Math.PI), mat(0xf2b544, { r: 0.4, m: 0.5, e: 0x6a4200, ei: 0.4 })); arche.position.y = 0.1; g.add(arche);
  const voile = mesh(new T.CircleGeometry(1.0, 24, 0, Math.PI), new T.MeshBasicMaterial({ color: 0x9ad8ff, transparent: true, opacity: 0.35, side: T.DoubleSide, blending: T.AdditiveBlending, depthWrite: false }), false); voile.position.y = 0.1; g.add(voile);
  return { g, haut: 3.4, anim: (t) => { voile.material.opacity = 0.25 + Math.sin(t * 2) * 0.12; voile.rotation.y = Math.sin(t) * 0.1; } };
}
const FABRIQUES = { arene: ileArene, tour: ileTour, sauvage: ileSauvage, villages: ileVillages, amis: ileAmis };

function construire() {
  const scene = new T.Scene();
  scene.fog = new T.Fog(0x2a2040, 40, 110);
  scene.add(ciel(0x0c0a24, 0x4a3060, 0x120c1c));
  eclairage(scene, { ciel: 0xd8c8ff, sol: 0x2a1a30, hemi: 0.75, soleil: 0xffe0c0, force: 1.4, zoneOmbre: 22, x: 10, y: 20, z: 8, carte: 2048 });
  const camera = new T.PerspectiveCamera(45, 1, 0.1, 300);
  const orbite = new Orbite(camera, document.getElementById("scene3d"));
  orbite.min = 8; orbite.max = 60; orbite.phiMax = 1.35;
  const iles = {};
  for (const def of ILES_COMBAT) {
    const m = FABRIQUES[def.id]();
    m.g.position.set(...def.pos);
    m.g.traverse((o) => { if (o.isMesh) o.userData.ile = def.id; });
    scene.add(m.g);
    iles[def.id] = { ...m, def, y0: def.pos[1] };
  }
  // Nuages bas sous l'archipel
  const nuages = [];
  const mn = new T.MeshBasicMaterial({ color: 0x8a7aa8, transparent: true, opacity: 0.18, depthWrite: false });
  for (let k = 0; k < 16; k++) { const n = new T.Mesh(new T.SphereGeometry(3 + Math.random() * 3, 8, 6), mn); n.scale.y = 0.35; n.position.set((Math.random() - 0.5) * 60, -9 - Math.random() * 4, (Math.random() - 0.5) * 60); scene.add(n); nuages.push(n); }
  A = {
    scene, camera, orbite, iles, t: 0,
    update(dt) {
      A.t += dt;
      orbite.update(dt);
      for (const ile of Object.values(iles)) { ile.g.position.y = ile.y0 + Math.sin(A.t * 0.5 + (ile.px || 0)) * 0.25; ile.anim(A.t, dt); }
      for (const n of nuages) { n.position.x += dt * 0.4; if (n.position.x > 32) n.position.x = -32; }
      majEtiquettes();
    },
  };
  installerToucher();
}

function vueEnsemble() { if (etroit()) A.orbite.viser(new T.Vector3(0, 0.5, -5.5), 45, 0, 0.74); else A.orbite.viser(new T.Vector3(0, 0.5, -2), 38, 0, 0.95); }
function viserIle(id) { const ile = A.iles[id]; A.orbite.viser(ile.g.position.clone().add(new T.Vector3(0, 1.4, 0)), etroit() ? 21 : 17, Math.atan2(ile.g.position.x, ile.g.position.z + 14) * 0.5, 1.0); }

function installerToucher() {
  const canvas = document.getElementById("scene3d"), ray = new T.Raycaster();
  let d0 = null;
  canvas.addEventListener("pointerdown", (e) => { d0 = { x: e.clientX, y: e.clientY }; });
  canvas.addEventListener("pointerup", (e) => {
    if (!d0 || !ctxJeu || ctxJeu.moteur.decor !== A || Math.hypot(e.clientX - d0.x, e.clientY - d0.y) > 8) return;
    ray.setFromCamera(new T.Vector2((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1), A.camera);
    const h = ray.intersectObjects(Object.values(A.iles).map((i) => i.g), true)[0];
    if (h && h.object.userData.ile) choisir(h.object.userData.ile);
  });
}

// ---------- Étiquettes ----------
const etiqs = new Map();
function statut(id) {
  const e = E();
  if (id === "arene") {
    const ok = e.dragons.length >= 7 && e.dragons.some((d) => d.niveau >= 5);
    return ok ? [`🏆 ${(e.ligue && e.ligue.trophees) || 0} trophées`, false] : [`Il faut 7 dragons, dont un niv. 5`, true];
  }
  if (id === "tour") { const tn = e.tourNid || {}; return [tn.run ? `Étage ${tn.run.etage}/21 en cours` : `Record : étage ${tn.record || 0}/21`, false]; }
  if (id === "sauvage") return ["Dragons faciles", false];
  if (id === "villages") return ["Attaque un village", false];
  if (id === "amis") return ["Même téléphone · en ligne", false];
  return ["", false];
}
function majEtiquettes() {
  if (!calque || !calque.isConnected || ctxJeu.moteur.decor !== A) return;
  const fiche = document.querySelector(".ar-fiche");
  const basMax = fiche ? fiche.getBoundingClientRect().top - 6 : window.innerHeight - 90;
  const hautMin = (document.querySelector(".ar-titre")?.getBoundingClientRect().bottom || 0) + 34;
  for (const def of ILES_COMBAT) {
    let e = etiqs.get(def.id);
    if (!e) { e = el("button", { class: "ar-etiq", style: { "--c": def.c }, onclick: () => choisir(def.id) }, el("b", {}, def.nom), el("small")); calque.append(e); etiqs.set(def.id, e); }
    const ile = A.iles[def.id];
    const p = versEcran(ile.g.position.clone().add(new T.Vector3(0, ile.haut, 0)), A.camera);
    const ok = p.devant && p.y < basMax && p.y > hautMin && p.x > 30 && p.x < window.innerWidth - 30 && (!choisie || choisie === def.id);
    e.hidden = !ok;
    if (!ok) continue;
    e.style.left = Math.round(p.x) + "px"; e.style.top = Math.round(p.y) + "px";
    const [txt, ferme] = statut(def.id);
    const s = e.querySelector("small"); if (s.textContent !== txt) s.textContent = txt;
    e.classList.toggle("ferme", ferme); e.classList.toggle("choisi", choisie === def.id);
  }
}

// ---------- Choisir une île ----------
function choisir(id) {
  const def = ILES_COMBAT.find((d) => d.id === id);
  if (!def) return;
  Son.clic();
  choisie = id;
  viserIle(id);
  const titre = ui.querySelector(".ar-titre"); if (titre) titre.hidden = true;
  ui.querySelector(".ar-fiche")?.remove();
  const f = el("section", { class: "ar-fiche panneau", style: { "--c": def.c } },
    el("header", {}, el("div", {}, el("h3", {}, def.nom)), el("button", { class: "fermer-fiche", "aria-label": "Fermer", onclick: () => { Son.clic(); choisie = null; f.remove(); vueEnsemble(); ctxJeu.moteur.definirZone(null); const ti = ui.querySelector(".ar-titre"); if (ti) ti.hidden = false; } }, "✕")),
    el("p", {}, def.texte));
  const choix = el("div", { class: "choix" });
  const [, ferme] = statut(id);
  if (id === "amis") {
    choix.append(el("button", { class: "btn principal", onclick: () => surChoix(id, "ami") }, el("b", {}, "Sur le même téléphone"), el("small", {}, "Chacun choisit à son tour, sans regarder.")));
    choix.append(el("button", { class: "btn", onclick: () => surChoix(id, "ligne") }, el("b", {}, "En ligne, avec un code"), el("small", {}, "Chacun sur son téléphone, reliés par un code.")));
  } else {
    choix.append(el("button", { class: "btn principal", disabled: ferme && id === "arene", onclick: () => surChoix(id, def.modes[0]) }, el("b", {}, id === "tour" ? "Entrer dans la tour" : id === "villages" ? "Préparer l'attaque" : id === "sauvage" ? "Chasser les dragons sauvages" : "Préparer le duel classé")));
    if (ferme && id === "arene") choix.append(el("p", {}, `Le classé s'ouvre avec 7 dragons, dont au moins un au niveau 5 (tu en as ${E().dragons.length}).`));
  }
  f.append(choix);
  ui.append(f);
  ctxJeu.moteur.definirZone(etroit() ? { x: 0, y: 0, l: 1, h: Math.max(0.3, (f.getBoundingClientRect().top - 10) / window.innerHeight) } : null);
}

// ---------- Ouvrir l'archipel ----------
export function ouvrirArchipel(ctx, racine, quandChoix) {
  ctxJeu = ctx; ui = racine; surChoix = quandChoix; choisie = null;
  if (!A) construire();
  placer();
  ctx.moteur.montrer(A);
  Musique.jouer("iles");
  vueEnsemble();
  A.orbite.dist = A.orbite.distV * 1.25;
  ui.innerHTML = "";
  ui.append(el("div", { class: "ar-titre" }, el("div", { class: "etiquette" }, "Combat"), el("h2", {}, "L'archipel des combats")));
  calque = el("div", { class: "ar-etiqs" }); ui.append(calque); etiqs.clear();
}
export function cibleArchipel(id) {
  if (!A || !ctxJeu || ctxJeu.moteur.decor !== A) return null;
  const ile = A.iles[id]; if (!ile) return null;
  const p = versEcran(ile.g.position.clone().add(new T.Vector3(0, ile.haut + 1.2, 0)), A.camera);
  return p.devant ? p : null;
}
