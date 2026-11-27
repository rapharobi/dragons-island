// Le couvoir sur la carte : plus d'onglet. On touche le couvoir (ou le bouton « Couvoir ») et la caméra
// plonge sur le rocher central. Tout se fait en touchant les ateliers 3D de la cour :
// l'autel des œufs, la couveuse, le sablier, l'établi de l'architecte (améliorer), le Livre, le dirigeable.
import { E, changer, maintenant, avancement, manqueChantier } from "./etat.js";
import { COUVOIR, CHANTIER_COUVOIR, fmtDuree, attenteOeuf } from "./regles.js";
import { mat, mesh, cone } from "./outils3d.js";
import { construireOeuf, RAYON_CENTRE } from "./monde.js";
import { el, styles, icone, toast } from "./ui.js";
import { Son } from "./son.js";
import { versEcran } from "./scene.js";
import { extensions, moteurIles, focaliser, particule, fermerFiche, nouvelleFiche, enTete, ctxJeuIles } from "./iles.js";
import { blocHub, majHub, initHub } from "./couvoir.js";
import { etape as etapeTuto } from "./tuto.js";
import { ouvrirVillage, villageOuvert } from "./village.js";
import { portOuvert } from "./expeditions.js";

const T = window.THREE;
const deg = (d) => (d * Math.PI) / 180;

styles("couvoir3d", `
.cv-etiqs { position: fixed; inset: 0; pointer-events: none; z-index: 12; }
.cv-etiq { position: absolute; transform: translate(-50%, -100%); pointer-events: auto; display: grid; justify-items: center; gap: 1px; padding: 5px 10px 6px; border-radius: 12px;
  background: rgba(14, 12, 24, .78); border: 1px solid rgba(242, 181, 68, .35); color: var(--texte); font-size: 12px; line-height: 1.15; white-space: nowrap; cursor: pointer;
  box-shadow: 0 6px 18px rgba(0,0,0,.35); backdrop-filter: blur(6px); transition: transform .15s, border-color .15s; }
.cv-etiq:hover { border-color: var(--ambre); }
.cv-etiq b { font-family: var(--titre); font-size: 13px; color: var(--ambre); letter-spacing: .02em; }
.cv-etiq small { color: var(--doux); font-family: var(--mono); font-size: 11px; }
.cv-etiq.chaud { border-color: var(--ambre); box-shadow: 0 0 0 2px rgba(242,181,68,.25), 0 0 22px rgba(242,181,68,.45); animation: cv-pulse 1.4s infinite; }
.cv-etiq.chaud small { color: #ffe3a0; }
.cv-etiq::after { content: ""; position: absolute; left: 50%; bottom: -6px; width: 10px; height: 10px; transform: translateX(-50%) rotate(45deg); background: rgba(14, 12, 24, .78); border-right: 1px solid rgba(242,181,68,.35); border-bottom: 1px solid rgba(242,181,68,.35); }
@keyframes cv-pulse { 50% { transform: translate(-50%, -100%) scale(1.06); } }
.iles-choix .pastille { display: inline-grid; place-items: center; min-width: 17px; height: 17px; margin-left: 6px; padding: 0 4px; border-radius: 9px; background: var(--mal); color: #fff; font: 600 10px var(--mono); }
.fiche-ile .carte { padding: 12px; border-radius: 12px; background: rgba(255,255,255,.04); border: 1px solid var(--trait); display: grid; gap: 8px; }
.fiche-ile .ligne { display: flex; justify-content: space-between; align-items: center; gap: 8px; font-size: 13px; }
.fiche-ile .chaine { display: flex; gap: 4px; flex-wrap: wrap; }
.fiche-ile .chaine span { font-family: var(--mono); font-size: 11px; padding: 2px 6px; border-radius: 6px; background: rgba(255,255,255,.06); color: var(--doux); }
.fiche-ile .chaine span.ici { background: rgba(242,181,68,.2); color: var(--ambre); }
.cv-tuiles { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
.cv-tuile { display: grid; justify-items: center; gap: 3px; padding: 10px 6px; border-radius: 12px; border: 1px solid var(--trait); background: rgba(255,255,255,.04); color: var(--texte); font-size: 12px; text-align: center; cursor: pointer; }
.cv-tuile:hover { border-color: var(--ambre); }
.cv-tuile .ic { font-size: 22px; line-height: 1; }
.cv-tuile small { color: var(--doux); font-family: var(--mono); font-size: 10.5px; }
.cv-tuile.chaud { border-color: var(--ambre); background: rgba(242,181,68,.12); }
.cv-tuile.chaud small { color: #ffe3a0; }
.cv-retour { background: none; border: none; color: var(--doux); font-size: 12px; padding: 0; cursor: pointer; text-decoration: underline; }
.cv-fete { position: fixed; inset: 0; z-index: 40; display: grid; place-items: center; pointer-events: none; }
.cv-fete > div { text-align: center; padding: 18px 26px; border-radius: 18px; background: radial-gradient(ellipse at 50% 30%, rgba(90, 60, 20, .92), rgba(16, 12, 24, .92)); border: 1px solid var(--ambre);
  box-shadow: 0 0 60px rgba(242,181,68,.45); animation: cv-fete 3.6s ease forwards; max-width: calc(100vw - 40px); }
.cv-fete .etiquette { color: var(--ambre); }
.cv-fete h2 { font-size: clamp(26px, 7vw, 40px); margin: 4px 0 6px; }
.cv-fete p { color: var(--doux); margin: 0; font-size: 13px; }
@keyframes cv-fete { 0% { opacity: 0; transform: scale(.6); } 12% { opacity: 1; transform: scale(1.06); } 20% { transform: scale(1); } 85% { opacity: 1; } 100% { opacity: 0; transform: scale(1.04); } }
@media (max-width: 560px) { .cv-etiq { padding: 4px 8px 5px; font-size: 11px; } .cv-etiq b { font-size: 12px; } }
`);

// Les ateliers de la cour : angle (sens des îles : atan2(z, x)), distance au centre
const ATELIERS = [
  { quoi: "autel", nom: "Autel des œufs", ic: "🥚", angle: deg(76), r: 3.25 },
  { quoi: "livre", nom: "Livre des dragons", ic: "📖", angle: deg(110), r: 3.35 },
  { quoi: "sablier", nom: "Sablier", ic: "⏳", angle: deg(-50), r: 3.3 },
  { quoi: "chantier", nom: "Architecte", ic: "🏗️", angle: deg(-14), r: 3.3 },
  { quoi: "quai", nom: "Dirigeable", ic: "🎈", angle: deg(190), r: 3.35 },
  { quoi: "village", nom: "Île Mère", ic: "🏛️", angle: deg(234), r: 3.2 },
  { quoi: "noir", nom: "Œuf noir", ic: "🖤", angle: deg(160), r: 2.1, cache: true },
];
const NOMS = { noir: "Œuf noir", village: "Île Mère", oeufs: "Couveuse", autel: "Autel des œufs", livre: "Livre des dragons", sablier: "Sablier", chantier: "Architecte", quai: "Dirigeable des expéditions" };
const ICONES = { noir: "🖤", village: "🏛️", oeufs: "🪺", autel: "🥚", livre: "📖", sablier: "⏳", chantier: "🏗️", quai: "🎈" };

let G = null; // { groupe, ateliers: {quoi: {g, haut, anim}}, echafaudage, lumiere }
let calque = null, ficheQuoi = null, dernierNiv = null, fete = null, rafraichi = 0;

// ---------- Modèles ----------
const pierre = () => mat(0x8a8276, { r: 0.95 });
const bois = () => mat(0x7a5434, { r: 0.9 });
const or = () => mat(0xf2b544, { r: 0.35, m: 0.6, e: 0x7a4a00, ei: 0.5 });
function socle(g, r = 0.55) {
  const s = mesh(new T.CylinderGeometry(r, r * 1.15, 0.22, 8).translate(0, 0.11, 0), mat(0x5a544c, { r: 1 })); g.add(s);
}
function modeleAutel() {
  const g = new T.Group(); socle(g, 0.6);
  g.add(mesh(new T.CylinderGeometry(0.28, 0.36, 0.75, 8).translate(0, 0.6, 0), pierre()));
  g.add(mesh(new T.CylinderGeometry(0.52, 0.32, 0.18, 10).translate(0, 1.05, 0), pierre()));
  const anneau = mesh(new T.TorusGeometry(0.55, 0.035, 6, 28), mat(0xffd27a, { e: 0xffb030, ei: 1.2 }), false); anneau.rotation.x = Math.PI / 2; anneau.position.y = 1.6; g.add(anneau);
  const oeuf = construireOeuf("inconnu", 0.52); oeuf.position.y = 1.1; g.add(oeuf);
  const lum = new T.PointLight(0xffc060, 0, 4, 2); lum.position.y = 1.7; g.add(lum);
  // Les œufs qui attendent : posés en cercle autour de l'autel (inconnus), et ceux en réserve avec leur couleur
  const attente = new T.Group(); g.add(attente);
  let cleAttente = "";
  return { g, haut: 2.3, anim: (t, s) => {
    const e = E(), cle = `${e.oeufs.choix}|${e.oeufs.reserve.map((o) => o.element).join(",")}`;
    if (cle !== cleAttente) {
      cleAttente = cle;
      while (attente.children.length) attente.remove(attente.children[0]);
      const liste = [...Array(Math.min(10, e.oeufs.choix)).fill("inconnu"), ...e.oeufs.reserve.slice(0, 8).map((o) => o.element)];
      liste.forEach((elx, i) => { const o = construireOeuf(elx, 0.28); const a = (i / Math.max(6, liste.length)) * Math.PI * 2; o.position.set(Math.cos(a) * 0.95, 0.22, Math.sin(a) * 0.95); o.rotation.z = 0.15; attente.add(o); });
    }
    attente.rotation.y = t * 0.15;
    const actif = (E().oeufs.choix || 0) > 0;
    oeuf.position.y = 1.15 + (actif ? 0.25 + Math.sin(t * 2.2) * 0.12 : 0.05);
    oeuf.rotation.y = t * (actif ? 1.6 : 0.3);
    anneau.rotation.z = t * 1.2; anneau.visible = actif; anneau.scale.setScalar(1 + Math.sin(t * 3) * 0.06);
    lum.intensity = actif ? 1.6 + Math.sin(t * 4) * 0.5 : 0;
    oeuf.userData.coque.material.emissiveIntensity = actif ? 0.5 + Math.sin(t * 4) * 0.2 : 0.06;
    if (actif && Math.random() < 0.12) particule(s, new T.Vector3((Math.random() - 0.5) * 0.6, 1.2, (Math.random() - 0.5) * 0.6), 0xffd27a, new T.Vector3(0, 0.6, 0), { vie: 1, taille: 0.5, e: true });
  } };
}
function modeleLivre() {
  const g = new T.Group(); socle(g, 0.45);
  const pied = mesh(new T.CylinderGeometry(0.07, 0.1, 0.9, 6).translate(0, 0.55, 0), bois()); g.add(pied);
  const pupitre = new T.Group(); pupitre.position.y = 1.0; pupitre.rotation.x = -0.55; g.add(pupitre);
  pupitre.add(mesh(new T.BoxGeometry(0.85, 0.05, 0.6), bois()));
  const couv = mat(0x6a2a4a, { r: 0.6 }), page = mat(0xf4ead0, { r: 1, e: 0xffe6a0, ei: 0.25 });
  const pages = [];
  for (const s of [-1, 1]) {
    const p = new T.Group(); p.position.set(0, 0.05, 0); pupitre.add(p);
    const c = mesh(new T.BoxGeometry(0.4, 0.03, 0.52).translate(s * 0.2, 0, 0), couv); p.add(c);
    const f = mesh(new T.BoxGeometry(0.37, 0.04, 0.48).translate(s * 0.19, 0.03, 0), page); p.add(f);
    p.rotation.z = -s * 0.12; pages.push(p);
  }
  const feuille = mesh(new T.PlaneGeometry(0.36, 0.46).translate(0.18, 0, 0), mat(0xfff4d8, { d: true, e: 0xffe6a0, ei: 0.4 }), false);
  feuille.rotation.x = -Math.PI / 2; const pivot = new T.Group(); pivot.position.y = 0.08; pivot.add(feuille); pupitre.add(pivot);
  return { g, haut: 1.9, anim: (t, s) => {
    const k = (t * 0.35) % 1; pivot.rotation.z = k < 0.5 ? Math.min(1, k * 4) * Math.PI : Math.PI;
    if (Math.random() < 0.05) particule(s, new T.Vector3((Math.random() - 0.5) * 0.4, 1.3, (Math.random() - 0.5) * 0.3), 0xffe6a0, new T.Vector3(0, 0.4, 0), { vie: 1.2, taille: 0.35, e: true });
  } };
}
function modeleSablier() {
  const g = new T.Group(); socle(g, 0.5);
  const cadre = new T.Group(); cadre.position.y = 0.95; g.add(cadre);
  for (const y of [-0.62, 0.62]) cadre.add(mesh(new T.CylinderGeometry(0.42, 0.42, 0.08, 10).translate(0, y, 0), bois()));
  for (let k = 0; k < 3; k++) { const a = (k / 3) * Math.PI * 2; const p = mesh(new T.CylinderGeometry(0.04, 0.04, 1.2, 5), bois()); p.position.set(Math.cos(a) * 0.36, 0, Math.sin(a) * 0.36); cadre.add(p); }
  const verre = mat(0xcfe8ff, { o: 0.28, r: 0.1, m: 0.1 });
  const haut = mesh(new T.ConeGeometry(0.3, 0.55, 12, 1, true).rotateX(Math.PI).translate(0, 0.3, 0), verre, false); cadre.add(haut);
  const bas = mesh(new T.ConeGeometry(0.3, 0.55, 12, 1, true).translate(0, -0.3, 0), verre, false); cadre.add(bas);
  const sable = mat(0xf2c56a, { r: 0.9, e: 0x7a5a10, ei: 0.3 });
  const sHaut = mesh(new T.ConeGeometry(0.26, 0.45, 12).rotateX(Math.PI).translate(0, 0.32, 0), sable, false); cadre.add(sHaut);
  const sBas = mesh(new T.ConeGeometry(0.27, 0.42, 12).translate(0, -0.37, 0), sable, false); cadre.add(sBas);
  const filet = mesh(new T.CylinderGeometry(0.012, 0.012, 0.55, 4).translate(0, -0.27, 0), sable, false); cadre.add(filet);
  return { g, haut: 2.05, anim: (t) => {
    const mi = E().oeufs.minuteur;
    // Le sable descend à mesure que le prochain œuf approche
    let f = 0.5;
    if (mi.prochain) { const reste = mi.prochain - maintenant(); const total = attenteOeuf(mi.compte + 1) * 3600e3; f = Math.max(0.02, Math.min(1, reste / total)); }
    sHaut.scale.set(0.4 + f * 0.6, Math.max(0.05, f), 0.4 + f * 0.6); sBas.scale.set(0.4 + (1 - f) * 0.6, Math.max(0.05, 1 - f), 0.4 + (1 - f) * 0.6);
    filet.visible = !!mi.prochain; cadre.rotation.y = t * 0.25;
  } };
}
function modeleChantier() {
  const g = new T.Group(); socle(g, 0.6);
  const table = new T.Group(); table.position.y = 0.22; g.add(table);
  table.add(mesh(new T.BoxGeometry(0.9, 0.06, 0.6).translate(0, 0.55, 0), bois()));
  for (const [x, z] of [[-0.38, -0.24], [0.38, -0.24], [-0.38, 0.24], [0.38, 0.24]]) table.add(mesh(new T.BoxGeometry(0.06, 0.55, 0.06).translate(x, 0.27, z), bois()));
  const plan = mesh(new T.PlaneGeometry(0.7, 0.45), mat(0x3a6ab8, { e: 0x2a5aa8, ei: 0.4, d: true }), false); plan.rotation.x = -Math.PI / 2; plan.position.y = 0.59; table.add(plan);
  for (let k = 0; k < 4; k++) { const l = mesh(new T.PlaneGeometry(0.5 - k * 0.08, 0.012), mat(0xdfeaff, { d: true, e: 0xdfeaff, ei: 0.6 }), false); l.rotation.x = -Math.PI / 2; l.position.set(0, 0.595, -0.15 + k * 0.1); table.add(l); }
  // Petite grue
  const mat_ = mat(0xd8a030, { r: 0.6, m: 0.3 });
  const mat2 = mesh(new T.BoxGeometry(0.09, 1.7, 0.09).translate(0, 0.85, 0), mat_); mat2.position.set(0.55, 0.2, 0.3); g.add(mat2);
  const fleche = new T.Group(); fleche.position.set(0.55, 1.9, 0.3); g.add(fleche);
  fleche.add(mesh(new T.BoxGeometry(1.3, 0.07, 0.07).translate(-0.35, 0, 0), mat_));
  const cable = mesh(new T.CylinderGeometry(0.008, 0.008, 0.6, 3).translate(0, -0.3, 0), mat(0x222222), false); cable.position.x = -0.9; fleche.add(cable);
  const charge = mesh(new T.BoxGeometry(0.18, 0.14, 0.18), pierre()); charge.position.set(-0.9, -0.66, 0); fleche.add(charge);
  return { g, haut: 2.45, anim: (t) => {
    const actif = !!E().oeufs.couvoir.chantier;
    fleche.rotation.y = actif ? Math.sin(t * 0.5) * 1.3 : Math.sin(t * 0.15) * 0.3;
    charge.position.y = -0.66 + (actif ? Math.sin(t * 1.3) * 0.25 : 0);
    cable.scale.y = 1 - (charge.position.y + 0.66) / 0.6;
  } };
}
function modeleQuai() {
  const g = new T.Group(); socle(g, 0.4);
  const poteau = mesh(new T.CylinderGeometry(0.07, 0.09, 1.1, 6).translate(0, 0.65, 0), bois()); g.add(poteau);
  const nef = new T.Group(); g.add(nef);
  const ballon = mesh(new T.SphereGeometry(0.55, 14, 10), mat(0xc8443a, { r: 0.7 })); ballon.scale.set(1.7, 0.85, 0.85); ballon.position.y = 2.25; nef.add(ballon);
  for (const s of [-0.5, 0, 0.5]) { const b = mesh(new T.TorusGeometry(0.47 * (1 - Math.abs(s) * 0.45), 0.03, 4, 18), mat(0xf2c56a, { r: 0.6 }), false); b.rotation.y = Math.PI / 2; b.position.set(s * 0.9 * 1.0, 2.25, 0); b.scale.set(1, 0.9, 0.9); nef.add(b); }
  const nacelle = mesh(new T.BoxGeometry(0.62, 0.22, 0.32).translate(0, 1.55, 0), bois()); nef.add(nacelle);
  for (const [x, z] of [[-0.25, -0.12], [0.25, -0.12], [-0.25, 0.12], [0.25, 0.12]]) nef.add(mesh(new T.CylinderGeometry(0.008, 0.008, 0.5, 3).translate(x, 1.88, z), mat(0x3a2a1a), false));
  const helice = new T.Group(); helice.position.set(-0.45, 1.58, 0); nef.add(helice);
  for (let k = 0; k < 3; k++) { const p = mesh(new T.BoxGeometry(0.03, 0.26, 0.06).translate(0, 0.13, 0), bois(), false); p.rotation.x = (k / 3) * Math.PI * 2; helice.add(p); }
  const corde = mesh(new T.CylinderGeometry(0.01, 0.01, 0.5, 3).translate(0, 0.25, 0), mat(0x5a4632), false); corde.position.y = 1.2; g.add(corde);
  return { g, haut: 3.0, anim: (t) => {
    const ex = E().expedition;
    const parti = ex && ex.fin > maintenant();
    // Pendant l'expédition, le dirigeable est parti : il ne reste que le poteau
    const cible = parti ? 1 : 0;
    nef.userData.k = (nef.userData.k || 0) + (cible - (nef.userData.k || 0)) * 0.02;
    const k = nef.userData.k;
    nef.visible = k < 0.98; corde.visible = k < 0.1;
    nef.position.set(-k * 14, Math.sin(t * 1.1) * 0.06 + k * 8, 0);
    nef.rotation.z = Math.sin(t * 0.8) * 0.04;
    helice.rotation.x = t * (parti ? 30 : 6);
  } };
}
// Hôtel de ville : un beffroi et son panneau d'annonces (le village, les vagues, l'aménagement)
function modeleVillage() {
  const g = new T.Group(); socle(g, 0.55);
  g.add(mesh(new T.BoxGeometry(0.55, 1.3, 0.55).translate(0, 0.87, 0), pierre()));
  g.add(mesh(new T.BoxGeometry(0.7, 0.08, 0.7).translate(0, 1.56, 0), bois()));
  const toit = mesh(cone(0.55, 0.6, 4), mat(0x6a3a5a, { r: 0.8 })); toit.position.y = 2.05; toit.rotation.y = Math.PI / 4; g.add(toit);
  const cloche = new T.Group(); cloche.position.y = 1.72; g.add(cloche);
  cloche.add(mesh(new T.CylinderGeometry(0.08, 0.16, 0.2, 10).translate(0, -0.1, 0), or()));
  const panneau = mesh(new T.BoxGeometry(0.6, 0.4, 0.04), bois()); panneau.position.set(0, 0.75, 0.31); g.add(panneau);
  for (let k = 0; k < 3; k++) { const f = mesh(new T.PlaneGeometry(0.14, 0.16), mat(0xf4ead0, { d: true }), false); f.position.set(-0.18 + k * 0.18, 0.76, 0.335); f.rotation.z = (k - 1) * 0.1; g.add(f); }
  const drap = mesh(new T.PlaneGeometry(0.3, 0.18).translate(0.15, 0, 0), mat(0x6fd68a, { d: true }), false); drap.position.set(0, 2.5, 0); g.add(drap);
  g.add(mesh(new T.CylinderGeometry(0.015, 0.015, 0.5, 4).translate(0, 2.4, 0), bois()));
  return { g, haut: 2.8, anim: (t) => {
    drap.rotation.y = Math.sin(t * 2.5) * 0.4;
    const alerte = E().village && E().village.vague && E().village.vague.enAttente;
    cloche.rotation.z = alerte ? Math.sin(t * 9) * 0.5 : Math.sin(t * 0.8) * 0.05;
  } };
}
function modeleNoir() {
  const g = new T.Group();
  const socleN = mesh(new T.CylinderGeometry(0.35, 0.45, 0.3, 7).translate(0, 0.15, 0), mat(0x1a1420, { r: 0.6 })); g.add(socleN);
  const oeuf = construireOeuf("inconnu", 0.55);
  oeuf.userData.coque.material.color.setHex(0x0a0810); oeuf.userData.coque.material.emissive.setHex(0x3a0a5a); oeuf.userData.coque.material.vertexColors = false; oeuf.userData.coque.material.needsUpdate = true;
  oeuf.position.y = 0.3; g.add(oeuf);
  const aura = new T.Mesh(new T.SphereGeometry(0.55, 14, 10), new T.MeshBasicMaterial({ color: 0x5a1a8a, transparent: true, opacity: 0.15, blending: T.AdditiveBlending, depthWrite: false }));
  aura.position.y = 0.85; aura.scale.y = 1.3; g.add(aura);
  return { g, haut: 1.7, anim: (t, s) => {
    g.visible = !!E().oeufNoir;
    const k = (Math.sin(t * 0.9) + 1) / 2;
    oeuf.userData.coque.material.emissiveIntensity = 0.2 + k * 0.5; aura.material.opacity = 0.08 + k * 0.14; aura.scale.setScalar(1 + k * 0.15);
    oeuf.rotation.y = Math.sin(t * 0.3) * 0.4;
    if (E().oeufNoir && Math.random() < 0.04) particule(s, new T.Vector3((Math.random() - 0.5) * 0.4, 0.6, (Math.random() - 0.5) * 0.4), 0x2a0a3a, new T.Vector3(0, 0.5, 0), { vie: 1.4, taille: 0.6, e: true });
  } };
}
const FABRIQUES = { noir: modeleNoir, village: modeleVillage, autel: modeleAutel, livre: modeleLivre, sablier: modeleSablier, chantier: modeleChantier, quai: modeleQuai };

// Échafaudage et grue géante pendant le chantier du couvoir
function modeleEchafaudage() {
  const g = new T.Group();
  const b = bois(), R = 5.15;
  for (let k = 0; k < 18; k++) {
    const a = (k / 18) * Math.PI * 2;
    const p = mesh(new T.BoxGeometry(0.08, 3.2, 0.08).translate(0, 1.6, 0), b); p.position.set(Math.cos(a) * R, 0, Math.sin(a) * R); g.add(p);
  }
  for (const y of [1.1, 2.2, 3.1]) { const t = mesh(new T.TorusGeometry(R, 0.04, 4, 48), b, false); t.rotation.x = Math.PI / 2; t.position.y = y; g.add(t); }
  const mt = mat(0xd8a030, { r: 0.6, m: 0.3 });
  const mat2 = mesh(new T.BoxGeometry(0.22, 6.5, 0.22).translate(0, 3.25, 0), mt); mat2.position.set(-3.6, 0, 3.6); g.add(mat2);
  const fl = new T.Group(); fl.position.set(-3.6, 6.4, 3.6); g.add(fl);
  fl.add(mesh(new T.BoxGeometry(6, 0.18, 0.18).translate(2, 0, 0), mt));
  fl.add(mesh(new T.BoxGeometry(0.6, 0.4, 0.4).translate(-1.2, 0, 0), pierre()));
  const charge = mesh(new T.BoxGeometry(0.5, 0.4, 0.5), pierre()); charge.position.set(4, -2, 0); fl.add(charge);
  g.userData.anim = (t) => { fl.rotation.y = Math.sin(t * 0.3) * 1.6; charge.position.y = -2 + Math.sin(t * 0.9) * 1.2; };
  return g;
}

// ---------- Construction dans la scène des îles ----------
function installer() {
  const D = moteurIles();
  if (!D || G) return;
  const groupe = new T.Group();
  D.centre.groupe.add(groupe);
  G = { groupe, ateliers: {}, echafaudage: null };
  for (const a of ATELIERS) {
    const m = FABRIQUES[a.quoi]();
    m.g.position.set(Math.cos(a.angle) * a.r, 0, Math.sin(a.angle) * a.r);
    m.g.rotation.y = -a.angle - Math.PI / 2;
    m.g.userData.action = { type: "couv", quoi: a.quoi };
    m.g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    groupe.add(m.g);
    G.ateliers[a.quoi] = m;
  }
}

// Position d'un atelier à l'écran (pour les étiquettes et la flèche de Lia)
function monde(quoi) {
  const D = moteurIles();
  if (!D || !G) return null;
  if (quoi === "oeufs") return D.centre.groupe.localToWorld(new T.Vector3(0, 1.9, 0));
  const a = G.ateliers[quoi];
  if (!a) return null;
  return a.g.localToWorld(new T.Vector3(0, a.haut, 0));
}

function etat(quoi) {
  const e = E(), c = e.oeufs.couvoir;
  if (quoi === "autel") return e.oeufs.choix > 0 ? [`${e.oeufs.choix} œuf${e.oeufs.choix > 1 ? "s" : ""} à choisir !`, true] : ["Aucun œuf", false];
  if (quoi === "oeufs") {
    if (!c.slots.length) return ["Vide", false];
    const prets = c.slots.filter((s) => avancement(s) >= 1).length;
    if (prets) return [`${prets} prêt${prets > 1 ? "s" : ""} à éclore !`, true];
    const min = Math.min(...c.slots.map((s) => Math.max(0, (1 - avancement(s)))));
    return [`${c.slots.length}/${COUVOIR[c.niveau].places} · ${Math.round((1 - min) * 100)} %`, false];
  }
  if (quoi === "sablier") { const mi = e.oeufs.minuteur; return [e.dragons.length >= 10 ? "Endormi (10 dragons)" : mi.prochain ? fmtDuree(mi.prochain - maintenant()) : "dès 3 dragons", false]; }
  if (quoi === "chantier") {
    if (c.chantier) { const r = c.chantier.fin - maintenant(); return [r > 0 ? `Travaux · ${fmtDuree(r)}` : "Terminé !", r <= 0]; }
    if (!CHANTIER_COUVOIR[c.niveau + 1]) return [`Niveau ${c.niveau + 1}/5 · max`, false];
    return [`Niveau ${c.niveau + 1}/5`, !manqueChantier()];
  }
  if (quoi === "livre") return [`${e.livre.vus.length}/21`, false];
  if (quoi === "noir") return ["???", true];
  if (quoi === "village") {
    if (!villageOuvert()) return ["Couvoir niveau 2", false];
    const v = e.village; if (v && v.vague && v.vague.enAttente) return ["Pillards en vue !", true];
    return [`${(v && v.batiments.length) || 0} bâtiments`, false];
  }
  if (quoi === "quai") {
    if (!portOuvert()) return ["Couvoir niveau 2", false];
    const ex = e.expedition;
    if (!ex) return ["Prêt à partir", false];
    const r = ex.fin - maintenant();
    return r > 0 ? [`En route · ${fmtDuree(r)}`, false] : ["De retour !", true];
  }
  return ["", false];
}

// ---------- Étiquettes au-dessus des ateliers ----------
const etiqs = new Map();
function majEtiquettes() {
  const ctx = ctxJeuIles(), D = moteurIles();
  const visible = ctx && D && ctx.ecran === "iles" && ctx.moteur.decor === D && D.focus === "centre" && !E().oeufs.couvoir.ruine && !D.cine && !document.body.classList.contains("en-bataille") && !(G && G.fete);
  document.body.classList.toggle("vue-couvoir", !!visible);
  if (!visible) { if (calque) calque.hidden = true; return; }
  if (!calque || !calque.isConnected) { calque = el("div", { class: "cv-etiqs" }); document.getElementById("ecran").append(calque); etiqs.clear(); }
  calque.hidden = false;
  const fiche = document.querySelector(".fiche-ile");
  // Sur téléphone, la fiche ouverte suffit : on garde la cour bien visible, sans étiquettes
  if (fiche && window.innerWidth <= 560) { calque.hidden = true; return; }
  const hud = document.getElementById("hud"), gaucheMin = hud && !document.body.classList.contains("hud-ligne") ? hud.getBoundingClientRect().right + 50 : 10, hudBas = hud ? hud.getBoundingClientRect().bottom + 24 : 0;
  // …ni sur les boutons des îles à droite
  const choix = document.getElementById("iles-choix"), rc = choix && !choix.hidden ? choix.getBoundingClientRect() : null;
  const droiteMax = rc && rc.width && rc.width < window.innerWidth * 0.6 ? rc.left - 50 : window.innerWidth - 10;
  const basMax = fiche ? fiche.getBoundingClientRect().top - 4 : window.innerHeight - 90;
  const hautMin = (document.querySelector(".tuto-bulle:not([hidden])")?.getBoundingClientRect().bottom || 0) + 30;
  for (const quoi of ["oeufs", ...ATELIERS.map((a) => a.quoi)]) {
    if (quoi === "noir" && !E().oeufNoir) { const x = etiqs.get(quoi); if (x) x.hidden = true; continue; }
    let e = etiqs.get(quoi);
    if (!e) {
      e = el("button", { class: "cv-etiq", onclick: () => ouvrirFiche(quoi) }, el("b", {}, `${ICONES[quoi]} ${NOMS[quoi].replace(" des expéditions", "")}`), el("small"));
      calque.append(e); etiqs.set(quoi, e);
    }
    const w = monde(quoi);
    const p = w && versEcran(w, D.camera);
    const ok = p && p.devant && p.y < basMax && p.y > hautMin && (p.x > gaucheMin || p.y > hudBas) && (p.x < droiteMax || (rc && p.y > rc.bottom + 30)) && p.x < window.innerWidth - 10 && ficheQuoi !== quoi;
    e.hidden = !ok;
    if (!ok) continue;
    e.style.left = Math.round(p.x) + "px"; e.style.top = Math.round(p.y) + "px";
    const [txt, chaud] = etat(quoi);
    const s = e.querySelector("small"); if (s.textContent !== txt) s.textContent = txt;
    e.classList.toggle("chaud", chaud);
  }
}

// ---------- Fiches ----------
function sousTitre() { const c = E().oeufs.couvoir; return el("span", { class: "pil" }, `${COUVOIR[c.niveau].nom} · niveau ${c.niveau + 1}/5`); }
function ficheResume() {
  ficheQuoi = "resume";
  const f = nouvelleFiche();
  f.append(enTete(COUVOIR[E().oeufs.couvoir.niveau].nom, sousTitre()));
  const t = el("div", { class: "cv-tuiles" });
  for (const quoi of ["autel", "oeufs", "sablier", "chantier", "village", "livre", "quai", ...(E().oeufNoir ? ["noir"] : [])]) {
    const [txt, chaud] = etat(quoi);
    t.append(el("button", { class: "cv-tuile" + (chaud ? " chaud" : ""), "data-quoi": quoi, onclick: () => ouvrirFiche(quoi) }, el("span", { class: "ic" }, ICONES[quoi]), el("b", {}, NOMS[quoi].replace(" des expéditions", "").replace("Livre des dragons", "Livre")), el("small", {}, txt)));
  }
  f.append(el("div", { class: "bloc" }, el("div", { class: "info" }, "Touche un atelier dans la cour, ou une tuile ci-dessous."), t));
}
export function ouvrirFiche(quoi) {
  const ctx = ctxJeuIles();
  if (!ctx) return;
  initHub(ctx);
  if (quoi === "resume") { ficheResume(); return; }
  if (quoi === "livre") { Son.clic(); fermerFiche(); ctx.aller("livre"); return; }
  if (quoi === "autel" && E().oeufs.choix > 0) { Son.ok(); fermerFiche(); ctx.aller("couvoir", { choisir: true }); return; }
  if (quoi === "village") {
    if (villageOuvert()) { Son.clic(); fermerFiche(); const v = E().village; ouvrirVillage((v && v.vague && v.vague.enAttente) || null); return; }
  }
  Son.clic();
  const ancienne = document.querySelector(".fiche-ile");
  const defile = ancienne && ficheQuoi === quoi ? ancienne.scrollTop : 0;
  ficheQuoi = quoi;
  const D = moteurIles();
  if (D.focus !== "centre") focaliser("centre");
  const f = nouvelleFiche();
  f.append(enTete(NOMS[quoi], sousTitre(), el("button", { class: "cv-retour", onclick: () => ouvrirFiche("resume") }, "← Couvoir")));
  if (quoi === "noir") {
    f.append(el("div", { class: "bloc" }, el("div", { class: "info" }, "Un œuf noir, froid comme la nuit. Il ne ressemble à aucun élément connu : ni feu, ni glace, ni eau. Quand on l'approche de la couveuse, elle s'éteint."),
      el("p", { class: "doux", style: { fontSize: "12px", fontStyle: "italic" } }, "Lia : « Les anciens parlaient d'un quatrième élément, oublié de tous… Cet œuf vient peut-être de là-bas. Ici, il ne pourra jamais éclore. »"),
      el("button", { class: "btn petit", onclick: () => { Son.erreur(); toast("La couveuse refuse l'œuf noir : il ne peut pas éclore ici.", "mal"); const a = G && G.ateliers.noir; if (a) { let k = 0; const sec = setInterval(() => { a.g.rotation.z = Math.sin(k * 1.8) * 0.12 * (1 - k / 20); if (++k > 20) { clearInterval(sec); a.g.rotation.z = 0; } }, 30); } } }, "Essayer de le couver")));
  } else if (quoi === "village") {
    f.append(el("div", { class: "bloc" }, el("div", { class: "info" }, "Au niveau 2, le couvoir réveille l'île Mère : c'est elle qui gouverne ton village. Tu pourras alors construire des fermes, des entrepôts et des tours sur tes îles, et les aménager comme tu veux.")));
  } else if (quoi === "autel") {
    f.append(el("div", { class: "bloc" }, el("div", { class: "info" }, "Aucun œuf à choisir pour l'instant. Ils arrivent avec le sablier, les expéditions, les attaques de village et la boutique. Quand un œuf t'attend, l'autel s'illumine.")));
  } else {
    f.append(el("div", { class: "bloc" }, blocHub(quoi, () => ouvrirFiche(quoi))));
  }
  f.scrollTop = defile;
}
// Toucher le couvoir (la forteresse) : zoom et résumé. Pendant le guide des premiers œufs, la cérémonie.
function entrer(quoi) {
  const ctx = ctxJeuIles();
  if (!ctx) return;
  installer();
  if (E().intro || ["oeuf1", "oeuf2", "oeuf3"].includes(etapeTuto())) { ctx.aller("couvoir", { intro: true }); return; }
  focaliser("centre");
  if (quoi) ouvrirFiche(quoi); else ficheResume();
}
extensions.couvoir = entrer;
extensions.action.couv = (a) => { installer(); ouvrirFiche(a.quoi); };
extensions.cibleNom = (nom) => {
  if (!["autel", "oeufs", "sablier", "chantier", "livre", "quai", "village"].includes(nom)) return null;
  installer();
  const w = monde(nom); if (w) w.y += 0.3; return w;
};

// ---------- Fête quand le couvoir monte de niveau ----------
function feter(niv) {
  const D = moteurIles(), ctx = ctxJeuIles();
  fermerFiche();
  focaliser("centre");
  Son.evolution(); setTimeout(() => Son.victoire(), 500);
  const def = COUVOIR[niv];
  if (fete) fete.remove();
  fete = el("div", { class: "cv-fete" }, el("div", {}, el("div", { class: "etiquette" }, `Couvoir · niveau ${niv + 1}/5`), el("h2", {}, def.nom),
    el("p", {}, `Dragons jusqu'au niveau ${def.nivMax} · ${def.places} œuf${def.places > 1 ? "s" : ""} à la fois · bâtiments niveau ${niv + 1}`)));
  document.body.append(fete);
  setTimeout(() => { if (fete) { fete.remove(); fete = null; } }, 3700);
  // Colonne de lumière dorée et pluie d'étincelles
  const col = new T.Mesh(new T.CylinderGeometry(1.4, 2.6, 30, 24, 1, true), new T.MeshBasicMaterial({ color: 0xffd27a, transparent: true, opacity: 0.0, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide }));
  col.position.y = 15; D.centre.groupe.add(col);
  G.fete = { t: 0, col };
  for (let k = 0; k < 60; k++) { const a = Math.random() * Math.PI * 2, v = 2 + Math.random() * 4; particule(D.centre.groupe, new T.Vector3(0, 2, 0), [0xffd27a, 0xfff0c0, 0xffa040][k % 3], new T.Vector3(Math.cos(a) * v, 4 + Math.random() * 5, Math.sin(a) * v), { vie: 1.8, taille: 1.2, e: true, g: 6 }); }
  if (ctx && ctx.majHud) ctx.majHud();
}

// ---------- Mise à jour à chaque image ----------
function update(dt) {
  const D = moteurIles();
  if (!D || !E()) return;
  installer();
  const c = E().oeufs.couvoir;
  G.groupe.visible = !c.ruine;
  const t = D.t;
  if (!c.ruine) for (const a of Object.values(G.ateliers)) a.anim(t, a.g);
  // Échafaudage pendant le chantier
  if (c.chantier && !G.echafaudage) { G.echafaudage = modeleEchafaudage(); D.centre.groupe.add(G.echafaudage); G.echafaudage.scale.y = 0.01; }
  if (!c.chantier && G.echafaudage) { D.centre.groupe.remove(G.echafaudage); G.echafaudage = null; }
  if (G.echafaudage) {
    G.echafaudage.scale.y += (1 - G.echafaudage.scale.y) * Math.min(1, dt * 2);
    G.echafaudage.userData.anim(t);
    if (D.focus === "centre" && Math.random() < dt * 1.5) particule(D.centre.groupe, new T.Vector3((Math.random() - 0.5) * 8, 0.4, (Math.random() - 0.5) * 8), 0xb8a890, new T.Vector3(0, 0.8, 0), { vie: 1.4, grossit: 1.4, taille: 2.2, o: 0.4 });
  }
  // Montée de niveau : la forteresse jaillit, la lumière tombe du ciel
  if (dernierNiv === null || c.ruine) dernierNiv = c.ruine ? -1 : c.niveau;
  else if (c.niveau > dernierNiv) { dernierNiv = c.niveau; feter(c.niveau); }
  if (G.fete) {
    const f = G.fete; f.t += dt;
    f.col.material.opacity = Math.max(0, Math.sin(Math.min(1, f.t / 2.6) * Math.PI) * 0.55);
    f.col.scale.set(1 + f.t * 0.3, 1, 1 + f.t * 0.3);
    if (D.forteresse) { const k = Math.min(1, f.t / 1.2); const e = 1 - Math.pow(1 - k, 3); D.forteresse.scale.set(1, 0.2 + 0.8 * e + Math.sin(k * Math.PI) * 0.12, 1); }
    if (f.t > 2.8) { D.centre.groupe.remove(f.col); if (D.forteresse) D.forteresse.scale.set(1, 1, 1); G.fete = null; }
  }
  majEtiquettes();
  // Fiche ouverte : minuteurs à jour chaque seconde
  rafraichi += dt;
  if (rafraichi > 1) {
    rafraichi = 0;
    const fiche = document.querySelector(".fiche-ile");
    if (!fiche) ficheQuoi = null;
    else if (ficheQuoi === "oeufs" || ficheQuoi === "sablier") majHub();
    else if ((ficheQuoi === "chantier" && c.chantier) || (ficheQuoi === "quai" && E().expedition)) {
      const b = fiche.querySelector(".bloc"), d = fiche.scrollTop, q = ficheQuoi;
      if (b) { b.replaceWith(el("div", { class: "bloc" }, blocHub(q, () => ouvrirFiche(q)))); fiche.scrollTop = d; }
    } else if (ficheQuoi === "resume") {
      fiche.querySelectorAll(".cv-tuile").forEach((b) => { const [txt, chaud] = etat(b.dataset.quoi); b.querySelector("small").textContent = txt; b.classList.toggle("chaud", chaud); });
    }
  }
}
extensions.update.push(update);
