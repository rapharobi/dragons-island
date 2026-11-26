// Boutique : on achète des gemmes (de 1 € à 100 €, paiement simulé pendant la bêta), puis tout le reste en gemmes :
// packs de démarrage, braises d'éclosion, ressources, œufs, énergie, versions UL des dragons.
import { construireDragon } from "./modele.js";
import { Animateur } from "./anim.js";
import { ciel, eclairage, Orbite, socle } from "./scene.js";
import { E, changer } from "./etat.js";
import { PAR_ID, ELEMENTS, ENERGIE_MAX, COUVOIR, stadeEffectif } from "./regles.js";
import { el, styles, toast, modale, icone } from "./ui.js";
import { Son, Musique } from "./son.js";

const T = window.THREE;
let D = null, ctxJeu = null, ui = null;
const vue = { uid: null, ul: false };

styles("boutique", `
.bq-panneau { position: fixed; z-index: 15; right: var(--bord-d); top: calc(var(--hud) + var(--tuto, 0px) + 8px); bottom: calc(var(--bas) + 84px); width: min(430px, 40vw); padding: 16px; overflow: auto; display: grid; gap: 12px; align-content: start; }
.bq-panneau h2 { font-size: 26px; }
.bq-note { font-size: 12px; padding: 8px 10px; border-radius: 8px; background: rgba(111,214,138,.1); border: 1px solid rgba(111,214,138,.35); color: #b8f0c8; }
.bq-dragons { display: flex; gap: 6px; flex-wrap: wrap; }
.bq-dragons button { padding: 6px 10px; border-radius: 8px; border: 1px solid var(--trait-fort); background: rgba(255,255,255,.04); font-size: 12px; font-weight: 600; border-left: 3px solid var(--el); }
.bq-dragons button.actif { background: color-mix(in srgb, var(--el) 18%, transparent); border-color: var(--el); }
.article { display: grid; grid-template-columns: 1fr auto; gap: 4px 10px; align-items: center; padding: 12px; border-radius: 12px; border: 1px solid var(--trait); background: rgba(255,255,255,.03); cursor: pointer; text-align: left; }
.article.actif { border-color: var(--ambre); background: rgba(242,181,68,.08); }
.article b { font-family: var(--titre); font-size: 15px; }
.article .prix { font-family: var(--mono); color: var(--ambre); }
.article small { color: var(--doux); grid-column: 1 / -1; font-size: 12px; }
.article.pack { border-color: rgba(242,181,68,.4); background: linear-gradient(135deg, rgba(242,181,68,.12), rgba(255,255,255,.02)); }
.article.pack.vedette { border-color: var(--ambre); box-shadow: 0 0 0 1px rgba(242,181,68,.35) inset; }
.article .contenu { grid-column: 1 / -1; display: flex; flex-wrap: wrap; gap: 4px 10px; font-size: 12px; }
.article .contenu span { display: inline-flex; align-items: center; gap: 4px; }
.article .contenu svg { width: 15px; height: 15px; }
.article.deja { opacity: .5; cursor: default; }
.bq-solde { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 12px 14px; border-radius: 12px; border: 1px solid rgba(190,120,255,.5); background: linear-gradient(135deg, rgba(180,92,255,.2), rgba(255,255,255,.02)); }
.bq-solde b { font: 700 22px var(--mono); color: #f0d8ff; display: inline-flex; align-items: center; gap: 8px; }
.bq-solde svg { width: 26px; height: 26px; }
.bq-gemmes { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; }
.bq-gemmes button { display: grid; justify-items: center; gap: 3px; padding: 10px 6px; border-radius: 12px; border: 1px solid rgba(190,120,255,.4); background: rgba(180,92,255,.08); color: var(--texte); position: relative; }
.bq-gemmes button svg { width: 26px; height: 26px; }
.bq-gemmes button b { font: 700 15px var(--mono); color: #f0d8ff; }
.bq-gemmes button span { font-size: 12px; color: var(--ambre); font-weight: 700; }
.bq-gemmes button i { position: absolute; top: -7px; right: -4px; font-style: normal; font-size: 10px; font-weight: 700; background: #b45cff; color: #fff; border-radius: 6px; padding: 1px 5px; }
.article .prix.g { color: #e8c8ff; display: inline-flex; align-items: center; gap: 4px; }
.article .prix.g svg { width: 16px; height: 16px; }
.bq-ruban { justify-self: start; font-size: 10px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; color: #1a1208; background: var(--ambre); border-radius: 6px; padding: 1px 6px; }
.bq-apercu { position: fixed; z-index: 15; left: 50%; transform: translateX(-50%); top: calc(var(--hud) + var(--tuto, 0px) + 10px); padding: 5px 12px; border-radius: 999px; background: rgba(13,14,19,.75); border: 1px solid var(--trait); font-size: 12px; color: var(--doux); white-space: nowrap; }
@media (max-width: 420px) { .bq-gemmes { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (max-width: 760px) { .bq-panneau { left: var(--bord-g); right: var(--bord-d); width: auto; top: 50vh; bottom: calc(var(--bas) + 78px); } }
`);

function construireVitrine() {
  const scene = new T.Scene();
  scene.add(ciel(0x1a1410, 0x3a2c20, 0x100c08));
  eclairage(scene, { ciel: 0xffe0c0, sol: 0x2a1a10, hemi: 0.8, soleil: 0xfff0d8, force: 1.6, zoneOmbre: 4, x: 3, y: 6, z: 4, carte: 2048 });
  scene.add(socle(2.4, 0x3a2c22, 0xf2b544));
  const camera = new T.PerspectiveCamera(38, 1, 0.05, 200);
  const orbite = new Orbite(camera, document.getElementById("scene3d"));
  const support = new T.Group(); scene.add(support);
  // Une lumière qui tourne autour de la vitrine : les reflets bougent sur les gemmes et l'or
  const reflet = new T.PointLight(0xffffff, 1.2, 7); scene.add(reflet);
  D = { scene, camera, orbite, support, anim: null, cle: null, t: 0, majs: [], update(dt) {
    D.t += dt; orbite.update(dt); support.rotation.y += dt * 0.3; if (D.anim) D.anim.update(dt);
    reflet.position.set(Math.cos(D.t * 0.9) * 2.4, 2 + Math.sin(D.t * 1.3) * 0.4, Math.sin(D.t * 0.9) * 2.4);
    for (const f of D.majs) f(D.t, dt);
  } };
}

// ---------- Vitrine : des objets qui brillent, selon la section regardée ----------
const matGemme = (c, o = 0.9) => new T.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 0.4, metalness: 0.35, roughness: 0.06, flatShading: true, transparent: o < 1, opacity: o });
const matOr = () => new T.MeshStandardMaterial({ color: 0xf2b544, emissive: 0x6a4200, emissiveIntensity: 0.35, metalness: 0.85, roughness: 0.22, flatShading: true });
function gemme(c, t) {
  const g = new T.Group(), m = matGemme(c);
  const couronne = new T.CylinderGeometry(t * 0.62, t, t * 0.38, 8); couronne.translate(0, t * 0.19, 0);
  const pavillon = new T.ConeGeometry(t, t * 1.05, 8); pavillon.rotateX(Math.PI); pavillon.translate(0, -t * 0.52, 0);
  g.add(new T.Mesh(couronne, m), new T.Mesh(pavillon, m));
  return g;
}
function piece() { const m = new T.Mesh(new T.CylinderGeometry(0.11, 0.11, 0.025, 14), matOr()); m.rotation.set(Math.random() * 0.5, 0, Math.random() * 0.5); return m; }
function oeuf(c) { return new T.Mesh(new T.SphereGeometry(0.22, 14, 10).scale(0.82, 1.08, 0.82), new T.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 0.35, roughness: 0.35, metalness: 0.1, flatShading: true })); }
// Petites étoiles qui scintillent autour de l'objet
function etincelles(n, rayon, haut, couleur) {
  const g = new T.Group(), geo = new T.OctahedronGeometry(0.035, 0);
  for (let i = 0; i < n; i++) {
    const m = new T.Mesh(geo, new T.MeshBasicMaterial({ color: couleur, transparent: true, depthWrite: false }));
    const a = Math.random() * 6.28, r = rayon * (0.3 + Math.random() * 0.7);
    m.position.set(Math.cos(a) * r, 0.15 + Math.random() * haut, Math.sin(a) * r); m.userData.ph = Math.random() * 6.28;
    g.add(m);
  }
  g.userData.maj = (t) => g.children.forEach((m) => { const k = Math.max(0, Math.sin(t * 2.6 + m.userData.ph)); m.scale.setScalar(0.2 + k * 1.8); m.material.opacity = k; m.rotation.y = t * 3; });
  return g;
}
function objetVitrine(type) {
  const g = new T.Group(), majs = [];
  const lum = (c, i, y) => { const l = new T.PointLight(c, i, 5); l.position.y = y; g.add(l); return l; };
  if (type === "gemmes") {
    const grande = gemme(0xb45cff, 0.46); grande.position.y = 1.15; g.add(grande);
    const tour = new T.Group(); g.add(tour);
    [0xff6ad8, 0x7fd6ff, 0xb45cff, 0xffd86a, 0x8a7bff, 0xff8ab4].forEach((c, i) => { const p = gemme(c, 0.16); const a = (i / 6) * 6.28; p.position.set(Math.cos(a) * 0.85, 1.1 + Math.sin(i) * 0.12, Math.sin(a) * 0.85); tour.add(p); });
    for (let i = 0; i < 12; i++) { const p = gemme([0xb45cff, 0xd08aff, 0x7fd6ff][i % 3], 0.08 + Math.random() * 0.07); const a = Math.random() * 6.28, r = 0.25 + Math.random() * 0.7; p.position.set(Math.cos(a) * r, 0.1, Math.sin(a) * r); p.rotation.set(Math.random(), Math.random() * 6, Math.random()); g.add(p); }
    const l = lum(0xc08aff, 1.6, 1.3);
    g.add(etincelles(26, 1.3, 1.8, 0xffffff));
    majs.push((t) => { grande.rotation.y = t * 0.8; grande.position.y = 1.15 + Math.sin(t * 1.6) * 0.08; tour.rotation.y = -t * 0.5; tour.children.forEach((p, i) => { p.rotation.y = t * 2 + i; }); l.intensity = 1.4 + Math.sin(t * 3) * 0.4; });
  } else if (type === "packs") {
    const bois = new T.MeshStandardMaterial({ color: 0x7a4220, roughness: 0.7, flatShading: true });
    const coffre = new T.Group(); coffre.position.y = 0.3; g.add(coffre);
    coffre.add(new T.Mesh(new T.BoxGeometry(1.3, 0.6, 0.85), bois));
    for (const x of [-0.5, 0.5]) { const b = new T.Mesh(new T.BoxGeometry(0.08, 0.62, 0.87), matOr()); b.position.x = x; coffre.add(b); }
    const serrure = new T.Mesh(new T.BoxGeometry(0.16, 0.2, 0.05), matOr()); serrure.position.set(0, 0.12, 0.44); coffre.add(serrure);
    const couvercle = new T.Group(); couvercle.position.set(0, 0.3, -0.42); coffre.add(couvercle);
    const dessus = new T.Mesh(new T.BoxGeometry(1.34, 0.12, 0.88).translate(0, 0.06, 0.44), bois); couvercle.add(dessus);
    for (const x of [-0.5, 0.5]) { const b = new T.Mesh(new T.BoxGeometry(0.08, 0.14, 0.9).translate(x, 0.06, 0.44), matOr()); couvercle.add(b); }
    couvercle.rotation.x = -1.9;
    [[0xff7a3a, -0.33], [0x7fd6ff, 0], [0x2fd0c0, 0.33]].forEach(([c, x], i) => { const o = oeuf(c); o.position.set(x, 0.38 + (i === 1 ? 0.08 : 0), 0); o.rotation.z = (i - 1) * 0.25; coffre.add(o); });
    for (let i = 0; i < 14; i++) { const p = piece(); const a = Math.random() * 6.28, r = 0.85 + Math.random() * 0.6; p.position.set(Math.cos(a) * r, 0.02 + Math.random() * 0.04, Math.sin(a) * r); g.add(p); }
    const l = lum(0xffc86a, 2, 0.9);
    g.add(etincelles(22, 1.2, 1.4, 0xffe8a0));
    majs.push((t) => { couvercle.rotation.x = -1.9 + Math.sin(t * 1.5) * 0.06; l.intensity = 1.7 + Math.sin(t * 4) * 0.35; coffre.children.forEach((c, i) => { if (c.geometry && c.geometry.type === "SphereGeometry") c.position.y = 0.4 + Math.sin(t * 2 + i) * 0.04; }); });
  } else if (type === "braises") {
    const pierres = [];
    for (let i = 0; i < 7; i++) {
      const m = new T.Mesh(new T.DodecahedronGeometry(0.16 + Math.random() * 0.12, 0), new T.MeshStandardMaterial({ color: 0x2a1610, emissive: 0xff5a0a, emissiveIntensity: 0.8, roughness: 0.8, flatShading: true }));
      const a = (i / 7) * 6.28, r = i === 0 ? 0 : 0.45 + Math.random() * 0.2;
      m.position.set(Math.cos(a) * r, i === 0 ? 0.35 : 0.15, Math.sin(a) * r); m.rotation.set(Math.random() * 3, Math.random() * 3, 0); m.userData.ph = Math.random() * 6;
      g.add(m); pierres.push(m);
    }
    const flammes = [];
    for (let i = 0; i < 5; i++) { const f = new T.Mesh(new T.ConeGeometry(0.12, 0.5, 6), new T.MeshBasicMaterial({ color: [0xffd23a, 0xff8a1a, 0xff4a0a][i % 3], transparent: true, opacity: 0.75, depthWrite: false })); f.position.set((Math.random() - 0.5) * 0.5, 0.55, (Math.random() - 0.5) * 0.5); f.userData.ph = Math.random() * 6; g.add(f); flammes.push(f); }
    const escarbilles = [];
    for (let i = 0; i < 18; i++) { const m = new T.Mesh(new T.TetrahedronGeometry(0.03, 0), new T.MeshBasicMaterial({ color: 0xffb040, transparent: true })); m.userData.ph = Math.random(); g.add(m); escarbilles.push(m); }
    const l = lum(0xff7a2a, 2.2, 0.8);
    majs.push((t) => {
      pierres.forEach((m) => { m.material.emissiveIntensity = 0.6 + Math.sin(t * 2.4 + m.userData.ph) * 0.35; });
      flammes.forEach((f) => { const k = Math.sin(t * 9 + f.userData.ph) * 0.15; f.scale.set(1 - k, 1 + k * 2, 1 - k); f.rotation.y = t * 2; });
      escarbilles.forEach((m, i) => { const u = (t * 0.35 + m.userData.ph) % 1; m.position.set(Math.sin(i * 2.3 + t * 0.7) * 0.4 * (1 - u), 0.4 + u * 2, Math.cos(i * 1.7) * 0.4 * (1 - u)); m.material.opacity = 1 - u; });
      l.intensity = 2 + Math.sin(t * 7) * 0.4 + Math.sin(t * 13) * 0.2;
    });
  } else {
    // Énergie et ressources : un cristal d'énergie entouré d'anneaux, un œuf et de la nourriture
    const cristal = new T.Mesh(new T.OctahedronGeometry(0.42, 0).scale(1, 1.7, 1), matGemme(0xffd23a, 0.95)); cristal.position.y = 1.05; g.add(cristal);
    const anneaux = [0, 1].map((i) => { const a = new T.Mesh(new T.TorusGeometry(0.7 + i * 0.18, 0.025, 6, 40), matOr()); a.position.y = 1.05; g.add(a); return a; });
    const o = oeuf(0xf2e6cc); o.position.set(-0.75, 0.24, 0.2); g.add(o);
    for (let i = 0; i < 5; i++) { const p = gemme([0x7fd6ff, 0xff6a3a, 0x2fd0c0][i % 3], 0.09); p.position.set(0.55 + Math.random() * 0.4, 0.09, -0.3 + Math.random() * 0.6); g.add(p); }
    const l = lum(0xffe08a, 1.8, 1.1);
    g.add(etincelles(20, 1.1, 1.8, 0xfff2b0));
    majs.push((t) => { cristal.rotation.y = t; cristal.position.y = 1.05 + Math.sin(t * 2) * 0.07; anneaux[0].rotation.set(t * 0.9, t * 0.4, 0); anneaux[1].rotation.set(-t * 0.6, 0, t * 0.8); l.intensity = 1.6 + Math.sin(t * 3.4) * 0.4; });
  }
  g.traverse((c) => { if (c.userData.maj) majs.push(c.userData.maj); });
  return { g, majs };
}
function montrerObjet(type) {
  const cle = "objet|" + type;
  if (cle === D.cle) return;
  D.cle = cle; D.anim = null;
  while (D.support.children.length) D.support.remove(D.support.children[0]);
  const o = objetVitrine(type);
  D.support.add(o.g); D.majs = o.majs;
  const etroit = window.innerWidth / window.innerHeight < 0.8 ? 2.1 : 1;
  D.orbite.viser(new T.Vector3(0, 0.8, 0), 5.4 * etroit, 0.7, 1.2);
}
// Quelle section est à l'écran : la vitrine change avec elle
const SECTIONS = [["gemmes", "bq-gemmes"], ["packs", "bq-packs"], ["braises", "bq-braises"], ["ressources", "bq-res"], ["ul", "bq-ul"]];
function majVitrine() {
  const p = document.querySelector(".bq-panneau");
  if (!p || !D) return;
  // En bas de la liste, c'est la dernière section (les versions UL) qui compte
  const ligne = p.scrollTop + p.clientHeight >= p.scrollHeight - 6 ? 1e9 : p.scrollTop + p.clientHeight * 0.4;
  let cur = "gemmes";
  for (const [k, id] of SECTIONS) { const s = document.getElementById(id); if (s && s.offsetTop <= ligne) cur = k; }
  const d = E().dragons.find((x) => x.uid === vue.uid);
  const leg = document.querySelector(".bq-apercu");
  if (cur === "ul" && d) { montrer(d, vue.ul); if (leg) { leg.hidden = false; leg.textContent = `${PAR_ID[d.id].nom} · ${vue.ul ? "version UL" : "version normale"}`; } }
  else { montrerObjet(cur); if (leg) leg.hidden = true; }
}

function montrer(d, ul) {
  const st = Math.max(1, stadeEffectif(d));
  const cle = `${d.id}|${ul}|${st}`;
  if (cle === D.cle) return;
  D.cle = cle; D.majs = [];
  while (D.support.children.length) D.support.remove(D.support.children[0]);
  const rig = construireDragon(d.id, st, { ul });
  D.support.add(rig.racine);
  D.anim = new Animateur(rig); D.anim.jouer("joie");
  const h = rig.taille.y, l = Math.max(rig.taille.x, rig.taille.z);
  const etroit = window.innerWidth / window.innerHeight < 0.8 ? 2.4 : 1;
  D.orbite.viser(new T.Vector3(0, h * 0.45, 0), Math.max(2.4, Math.max(h * 1.4, l) * 1.5) * etroit, 0.7, 1.2);
}

export function ouvrir(ctx, params = {}) {
  ctxJeu = ctx;
  if (!D) construireVitrine();
  ui = document.getElementById("ecran");
  Musique.jouer("livre");
  const e = E();
  if (params.uid) { vue.uid = params.uid; vue.ul = true; } else vue.ul = false;
  if (!vue.uid || !e.dragons.some((d) => d.uid === vue.uid)) vue.uid = e.dragons[0] ? e.dragons[0].uid : null;
  rendre();
  // Arrivée depuis une fiche : on descend directement à la bonne section
  const cible = params.voir === "gemmes" ? "bq-gemmes" : params.voir ? "bq-res" : params.uid ? "bq-ul" : null;
  if (cible) setTimeout(() => { const b = document.getElementById(cible), p = document.querySelector(".bq-panneau"); if (b && p) p.scrollTo({ top: Math.max(0, b.offsetTop - 70), behavior: "smooth" }); }, 60);
}
export function fermer() { ctxJeu.moteur.definirZone(null); }

// Gemmes : la seule chose qui se paie en euros (simulé pendant la bêta)
const GEMMES = [
  { n: 100, prix: "1 €" },
  { n: 550, prix: "5 €", bonus: "+10 %" },
  { n: 1200, prix: "10 €", bonus: "+20 %" },
  { n: 2500, prix: "20 €", bonus: "+25 %" },
  { n: 6500, prix: "50 €", bonus: "+30 %" },
  { n: 14000, prix: "100 €", bonus: "+40 %" },
];
const PRIX_UL = 800;
// Packs : plusieurs œufs (à choisir au couvoir), des braises pour les faire éclore vite, et de quoi démarrer.
const PACKS = [
  {
    id: "apprenti", nom: "Pack de l'apprenti", prix: 450, unique: true, ruban: "Une seule fois",
    contenu: [["oeuf", "3 œufs"], ["braises", "8 braises"], ["rations", "30 rations"], ["energie", "Énergie pleine"]],
    texte: "Le coup de pouce du début : trois dragons de plus, et de quoi les faire éclore tout de suite.",
    donner: (s) => { s.oeufs.choix += 3; s.ressources.braises = (s.ressources.braises || 0) + 8; s.ressources.rations += 30; s.energie.val = ENERGIE_MAX; },
  },
  {
    id: "maitre", nom: "Pack du maître des œufs", prix: 900, vedette: true, ruban: "Le plus choisi",
    contenu: [["oeuf", "6 œufs"], ["braises", "20 braises"], ["rations", "60 rations"], ["obsidienne", "20"], ["givrite", "20"], ["corail", "20"]],
    texte: "Six œufs et assez de braises pour en faire éclore cinq aussitôt. Les matériaux aident à bâtir les nids.",
    donner: (s) => { s.oeufs.choix += 6; s.ressources.braises = (s.ressources.braises || 0) + 20; s.ressources.rations += 60; s.ressources.obsidienne += 20; s.ressources.givrite += 20; s.ressources.corail += 20; },
  },
  {
    id: "seigneur", nom: "Pack du seigneur des dragons", prix: 1800,
    contenu: [["oeuf", "12 œufs"], ["braises", "48 braises"], ["coeurs", "3 cœurs de dragon"], ["rations", "120 rations"], ["obsidienne", "50"], ["givrite", "50"], ["corail", "50"], ["energie", "Énergie pleine"]],
    texte: "Pour remplir le Livre vite : douze œufs, tous accélérables, et trois cœurs pour un nid unique.",
    donner: (s) => { s.oeufs.choix += 12; s.ressources.braises = (s.ressources.braises || 0) + 48; s.ressources.coeurs += 3; s.ressources.rations += 120; s.ressources.obsidienne += 50; s.ressources.givrite += 50; s.ressources.corail += 50; s.energie.val = ENERGIE_MAX; },
  },
];
const BRAISES = [[5, 90, "De quoi faire éclore un œuf tout de suite."], [30, 450, "7 œufs et demi accélérés."], [80, 900, "Le meilleur prix, pour les collectionneurs pressés."]];
// Tout ce qu'on gagne en jouant peut aussi s'acheter
const RESSOURCES = [
  { nom: "Recharge d'énergie", ic: "energie", prix: 60, texte: "Remet l'énergie au maximum.", donner: (s) => { s.energie.val = ENERGIE_MAX; } },
  { nom: "Un œuf", ic: "oeuf", prix: 200, texte: "Un œuf à choisir parmi les trois, au couvoir.", donner: (s) => { s.oeufs.choix += 1; } },
  { nom: "50 rations", ic: "rations", prix: 60, texte: "Soignent tes dragons (20 % des PV chacune).", donner: (s) => { s.ressources.rations += 50; } },
  { nom: "100 brindilles", ic: "brindilles", prix: 40, texte: "Pour construire les nids.", donner: (s) => { s.ressources.brindilles += 100; } },
  { nom: "100 pierres", ic: "pierres", prix: 40, texte: "Pour construire les nids.", donner: (s) => { s.ressources.pierres += 100; } },
  { nom: "20 obsidiennes", ic: "obsidienne", prix: 80, texte: "Matériau de l'île de Feu.", donner: (s) => { s.ressources.obsidienne += 20; } },
  { nom: "20 givrites", ic: "givrite", prix: 80, texte: "Matériau de l'île de Glace.", donner: (s) => { s.ressources.givrite += 20; } },
  { nom: "20 coraux", ic: "corail", prix: 80, texte: "Matériau de l'île d'Eau.", donner: (s) => { s.ressources.corail += 20; } },
  { nom: "20 piments de lave", ic: "rations_feu", prix: 120, texte: "Nourriture de feu : XP et passage du niveau 10.", donner: (s) => { s.ressources.rations_feu = (s.ressources.rations_feu || 0) + 20; } },
  { nom: "20 baies de givre", ic: "rations_glace", prix: 120, texte: "Nourriture de glace : XP et passage du niveau 10.", donner: (s) => { s.ressources.rations_glace = (s.ressources.rations_glace || 0) + 20; } },
  { nom: "20 poissons des abysses", ic: "rations_eau", prix: 120, texte: "Nourriture d'eau : XP et passage du niveau 10.", donner: (s) => { s.ressources.rations_eau = (s.ressources.rations_eau || 0) + 20; } },
  { nom: "1 cœur de dragon", ic: "coeurs", prix: 300, texte: "Pour les nids uniques. Se gagne aussi en duel classé.", donner: (s) => { s.ressources.coeurs += 1; } },
];

const nb = (n) => n.toLocaleString("fr-FR");
const prixG = (n) => el("span", { class: "prix g" }, icone("gemmes"), nb(n));

// Achat de gemmes : paiement simulé pendant la bêta
function acheterGemmes(g) {
  modale({
    titre: `${nb(g.n)} gemmes`,
    contenu: el("div", {}, el("p", {}, `${nb(g.n)} gemmes pour ${g.prix}.`), el("p", { class: "doux" }, "Bêta : le paiement est simulé, rien n'est débité. Dans le vrai jeu, il passera par Google Play ou l'App Store.")),
    boutons: [{ texte: "Annuler" }, { texte: `Payer ${g.prix} (simulé)`, classe: "principal", action: () => { changer((s) => { s.ressources.gemmes = (s.ressources.gemmes || 0) + g.n; }); Son.achat(); toast(`+${nb(g.n)} gemmes`, "bon"); ctxJeu.majHud(); rendre(); } }],
  });
}
// Achat en gemmes : vérifie le solde, demande confirmation, débite puis donne
function payer(prix, nom, donner) {
  const solde = E().ressources.gemmes || 0;
  if (solde < prix) {
    Son.erreur();
    modale({
      titre: "Pas assez de gemmes",
      contenu: `${nom} coûte ${nb(prix)} gemmes. Tu en as ${nb(solde)} : il t'en manque ${nb(prix - solde)}.`,
      boutons: [{ texte: "Fermer" }, { texte: "Acheter des gemmes", classe: "principal", action: () => setTimeout(montrerGemmes, 50) }],
    });
    return;
  }
  modale({
    titre: nom,
    contenu: `Acheter ${nom.charAt(0).toLowerCase() + nom.slice(1)} pour ${nb(prix)} gemmes ? Il t'en restera ${nb(solde - prix)}.`,
    boutons: [{ texte: "Annuler" }, { texte: `Acheter · ${nb(prix)} gemmes`, classe: "principal", action: () => {
      let ok = false;
      changer((s) => { if ((s.ressources.gemmes || 0) >= prix) { s.ressources.gemmes -= prix; donner(s); ok = true; } });
      if (ok) { Son.achat(); toast(`${nom} : c'est à toi !`, "bon"); }
      ctxJeu.majHud(); rendre();
    } }],
  });
}
function montrerGemmes() {
  const b = document.getElementById("bq-gemmes"), p = document.querySelector(".bq-panneau");
  if (b && p) p.scrollTo({ top: Math.max(0, b.offsetTop - 70), behavior: "smooth" });
}

function article({ nom, ic, prix, texte, onclick, classe = "", ruban = null, contenu = null, deja = null }) {
  return el("div", { class: `article ${classe} ${deja ? "deja" : ""}`, role: "button", tabindex: 0, onclick: () => { if (!deja) onclick(); } },
    ruban ? el("span", { class: "bq-ruban" }, ruban) : null, ruban ? el("span") : null,
    el("b", {}, ic ? el("span", { style: { display: "inline-flex", alignItems: "center", gap: "6px" } }, icone(ic), nom) : nom),
    deja ? el("span", { class: "prix" }, deja) : prixG(prix),
    contenu ? el("div", { class: "contenu" }, contenu.map(([i, t]) => el("span", {}, icone(i), t))) : null,
    texte ? el("small", {}, texte) : null);
}

function rendre() {
  const ancien = document.querySelector(".bq-panneau");
  const defile = ancien ? ancien.scrollTop : 0;
  ui.innerHTML = "";
  const e = E();
  const large = window.innerWidth > 760;
  ctxJeu.moteur.montrer(D, large ? { x: 0, y: 0, l: 1 - Math.min(450, window.innerWidth * 0.42) / window.innerWidth, h: 1 } : { x: 0, y: 0.08, l: 1, h: 0.42 });
  const p = el("section", { class: "bq-panneau panneau" });
  p.append(el("div", {}, el("div", { class: "etiquette" }, "Marché des dragonniers"), el("h2", {}, "Boutique")));
  // Solde
  p.append(el("div", { class: "bq-solde" }, el("span", { class: "doux" }, "Tes gemmes"), el("b", {}, icone("gemmes"), nb(e.ressources.gemmes || 0))));
  // Gemmes
  p.append(el("div", { class: "etiquette", id: "bq-gemmes" }, "Acheter des gemmes"));
  p.append(el("div", { class: "bq-gemmes" }, GEMMES.map((g) => el("button", { onclick: () => acheterGemmes(g) }, g.bonus ? el("i", {}, g.bonus) : null, icone("gemmes"), el("b", {}, nb(g.n)), el("span", {}, g.prix)))));
  p.append(el("div", { class: "bq-note" }, "Bêta : l'achat de gemmes est simulé, aucun paiement n'est demandé. Tout le reste de la boutique se paie en gemmes."));
  // Packs de démarrage
  p.append(el("div", { class: "etiquette", style: { marginTop: "8px" }, id: "bq-packs" }, "Packs de démarrage"));
  for (const pk of PACKS) {
    const deja = pk.unique && e.achats && e.achats[pk.id] ? "déjà acheté" : null;
    p.append(article({ nom: pk.nom, prix: pk.prix, texte: pk.texte, contenu: pk.contenu, ruban: pk.ruban, classe: `pack ${pk.vedette ? "vedette" : ""}`, deja,
      onclick: () => payer(pk.prix, pk.nom, (s) => { pk.donner(s); s.achats = s.achats || {}; s.achats[pk.id] = (s.achats[pk.id] || 0) + 1; }) }));
  }
  // Accélérer l'éclosion
  p.append(el("div", { class: "etiquette", style: { marginTop: "8px" }, id: "bq-braises" }, "Accélérer l'éclosion"));
  p.append(el("div", { class: "bq-note", style: { background: "rgba(255,138,60,.08)", borderColor: "rgba(255,138,60,.35)", color: "#ffd2b0" } },
    `Une braise fait avancer un œuf du couvoir d'un quart (environ ${Math.round(COUVOIR[0].heures * 60 / 4)} minutes). 4 braises = éclosion immédiate. Tu en as ${e.ressources.braises || 0}.`));
  for (const [n, prix, txt] of BRAISES) p.append(article({ nom: `${n} braises d'éclosion`, ic: "braises", prix, texte: txt, onclick: () => payer(prix, `${n} braises d'éclosion`, (s) => { s.ressources.braises = (s.ressources.braises || 0) + n; }) }));
  // Ressources
  p.append(el("div", { class: "etiquette", style: { marginTop: "8px" }, id: "bq-res" }, "Ressources et énergie"));
  for (const r of RESSOURCES) p.append(article({ nom: r.nom, ic: r.ic, prix: r.prix, texte: r.texte, onclick: () => payer(r.prix, r.nom, r.donner) }));
  // Versions UL (Ultime) : une robe rare pour chacun de tes dragons
  const d = e.dragons.find((x) => x.uid === vue.uid);
  p.append(el("div", { class: "etiquette", style: { marginTop: "8px" }, id: "bq-ul" }, "Versions UL (Ultime)"));
  p.append(el("div", { class: "bq-note", style: { background: "rgba(180,92,255,.1)", borderColor: "rgba(190,120,255,.4)", color: "#ecd8ff" } },
    "Une robe rare, aux reflets métalliques et aux couleurs uniques. Seule l'apparence change : aucun avantage en combat."));
  if (d) {
    const src = PAR_ID[d.id];
    const choix = el("div", { class: "bq-dragons" });
    for (const x of e.dragons) choix.append(el("button", { class: `${PAR_ID[x.id].element} ${x.uid === vue.uid ? "actif" : ""}`, onclick: () => { vue.uid = x.uid; vue.ul = true; rendre(); } }, PAR_ID[x.id].nom, x.ulPossede ? " ✦" : ""));
    p.append(choix);
    p.append(el("div", { class: "bq-dragons" },
      el("button", { class: !vue.ul ? "actif" : "", onclick: () => { vue.ul = false; Son.clic(); rendre(); } }, "Voir normale"),
      el("button", { class: vue.ul ? "actif" : "", onclick: () => { vue.ul = true; Son.evolution(); rendre(); } }, "Voir UL")));
    p.append(el("div", { style: { display: "flex", gap: "8px", flexWrap: "wrap" } },
      d.ulPossede
        ? el("button", { class: "btn principal", onclick: () => { changer((s) => { const x = s.dragons.find((y) => y.uid === d.uid); x.ul = !x.ul; }); Son.achat(); toast(d.ul ? `${src.nom} porte sa robe UL.` : `${src.nom} reprend sa robe normale.`, "bon"); rendre(); } }, d.ul ? "Remettre la robe normale" : "Porter la robe UL")
        : el("button", { class: "btn principal", onclick: () => payer(PRIX_UL, `${src.nom} UL`, (s) => { const x = s.dragons.find((y) => y.uid === d.uid); x.ulPossede = true; x.ul = true; }) }, icone("gemmes"), `${src.nom} UL · ${nb(PRIX_UL)} gemmes`),
    ));
  } else p.append(el("p", { class: "doux" }, "Fais éclore un dragon pour voir sa version UL."));
  ui.append(el("div", { class: "bq-apercu", hidden: true }));
  ui.append(p);
  p.scrollTop = defile;
  p.addEventListener("scroll", majVitrine, { passive: true });
  majVitrine();
}
