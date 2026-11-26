// Le village : sur chacune des trois îles, on construit des bâtiments autour des nids.
// Hôtel du village (débloque et limite le reste), entrepôts (protègent et agrandissent les réserves),
// fermes (verger, scierie, carrière : produisent toutes seules) et tours de défense (lave, givre, eau).
// Des vagues de pillards attaquent : on les repousse en direct (on touche les ennemis) ou on laisse faire ses dragons.
import { E, changer, maintenant, noter } from "./etat.js";
import { DRAGONS, PAR_ID, MATERIAUX, pvMax } from "./regles.js";
import { POS_ILES, rayonBord, solIle, dansLEau, emplacements } from "./monde.js";
import { mat, mesh, rng, cone } from "./outils3d.js";
import { construireDragon } from "./modele.js";
import { Animateur } from "./anim.js";
import { el, styles, toast, modale, icone, barre } from "./ui.js";
import { Son, Musique } from "./son.js";
import { extensions, moteurIles, focaliser, souffler, particule, fermerFiche } from "./iles.js";
import { signaler } from "./tuto.js";

const T = window.THREE;
const H = 3600e3;
const NOM_ILE = { feu: "Île de Feu", glace: "Île de Glace", eau: "Île d'Eau" };
const MAT_ILE = { feu: "obsidienne", glace: "givrite", eau: "corail" };

// ---------- Règles ----------
export const BATIMENTS = {
  hotel: { nom: "Hôtel du village", desc: "Le cœur du village. Son niveau fixe combien de bâtiments de chaque sorte tu peux construire, et jusqu'à quel niveau.", pv: 500, base: { brindilles: 40, pierres: 40 }, max: 5 },
  entrepot: { nom: "Entrepôt", desc: "Agrandit les réserves des fermes de 50 % par niveau, et protège tes ressources quand des pillards gagnent.", pv: 260, base: { brindilles: 30, pierres: 25 } },
  verger: { nom: "Verger", desc: "Produit des rations toutes seules.", pv: 160, base: { brindilles: 25, pierres: 10 }, produit: "rations", parHeure: 4, stock: 30 },
  scierie: { nom: "Scierie", desc: "Produit des brindilles toutes seules.", pv: 160, base: { brindilles: 10, pierres: 25 }, produit: "brindilles", parHeure: 6, stock: 40 },
  carriere: { nom: "Carrière", desc: "Produit des pierres toutes seules.", pv: 180, base: { brindilles: 25, pierres: 10 }, produit: "pierres", parHeure: 5, stock: 40 },
  tourLave: { nom: "Tour de lave", desc: "Lance des boules de lave qui brûlent l'ennemi touché et ceux qui l'entourent.", pv: 300, base: { brindilles: 20, pierres: 45 }, mat: "obsidienne", tour: { portee: 4.6, cadence: 1.6, degats: 16, couleur: 0xff5a0a } },
  tourGivre: { nom: "Tour de givre", desc: "Tire des éclats de glace qui ralentissent l'ennemi.", pv: 300, base: { brindilles: 20, pierres: 45 }, mat: "givrite", tour: { portee: 5, cadence: 1.1, degats: 9, couleur: 0x9fe8ff } },
  tourEau: { nom: "Tour à jets d'eau", desc: "Un jet puissant qui repousse l'ennemi loin des bâtiments.", pv: 300, base: { brindilles: 20, pierres: 45 }, mat: "corail", tour: { portee: 4.2, cadence: 1.3, degats: 11, couleur: 0x48c8e0 } },
};
const ORDRE = ["entrepot", "verger", "scierie", "carriere", "tourLave", "tourGivre", "tourEau"];
// Le village s'ouvre avec le chapitre d'histoire « Un village s'éveille » (couvoir niveau 2)
const ouvert = () => !!(E() && E().recits && E().recits.village);
function vil() { const e = E(); if (!e.village) e.village = { batiments: [], vague: { numero: 1, prochaine: null, enAttente: null }, compteur: 0 }; return e.village; }
// L'hôtel du village, c'est le couvoir : son niveau (1 à 5) fixe le nombre et le niveau des bâtiments
export function niveauHotel() { return E().oeufs.couvoir.niveau + 1; }
function cout(type, niveau) {
  const b = BATIMENTS[type], c = {};
  const k = type === "hotel" ? niveau * niveau : niveau;
  for (const [r, v] of Object.entries(b.base)) c[r] = Math.round(v * k);
  if (b.mat && niveau > 1) c[b.mat] = 4 * (niveau - 1);
  if (type === "hotel" && niveau >= 3) { c.obsidienne = 5 * (niveau - 2); c.givrite = 5 * (niveau - 2); c.corail = 5 * (niveau - 2); }
  return c;
}
function assez(c) { const r = E().ressources; return Object.entries(c).every(([k, v]) => (r[k] || 0) >= v); }
function payer(s, c) { for (const [k, v] of Object.entries(c)) s.ressources[k] -= v; }
const texteCout = (c) => Object.entries(c).map(([k, v]) => `${v} ${(MATERIAUX[k] ? MATERIAUX[k].nom : k).toLowerCase()}`).join(", ");
function combien(type) { return vil().batiments.filter((b) => b.type === type).length; }
function maxDe(type) { return type === "hotel" ? 1 : niveauHotel(); }
function bonusEntrepot() { return 1 + 0.5 * vil().batiments.filter((b) => b.type === "entrepot").reduce((s, b) => s + b.niveau, 0); }
function protection() { return Math.min(0.7, 0.12 * vil().batiments.filter((b) => b.type === "entrepot").reduce((s, b) => s + b.niveau, 0)); }
// Production des fermes, calculée au moment où on la regarde
function majProduction(b) {
  const d = BATIMENTS[b.type];
  if (!d.produit) return;
  const t = maintenant();
  const max = d.stock * b.niveau * bonusEntrepot();
  b.stock = Math.min(max, (b.stock || 0) + ((t - (b.maj || t)) / H) * d.parHeure * b.niveau);
  b.maj = t;
}
function stockMax(b) { const d = BATIMENTS[b.type]; return d.stock * b.niveau * bonusEntrepot(); }

// ---------- Emplacements de construction sur chaque île ----------
const PLACES = {};
function places(elx) {
  if (PLACES[elx]) return PLACES[elx];
  const D = moteurIles();
  const ile = D.iles[elx];
  const r = rng(elx.length * 131 + 7);
  const nids = emplacements(elx);
  const l = [];
  for (let essai = 0; essai < 3000 && l.length < 12; essai++) {
    const a = r() * 6.28, d = rayonBord(elx, a) * (elx === "eau" ? 0.6 + r() * 0.3 : 0.2 + r() * 0.62);
    const x = Math.cos(a) * d, z = Math.sin(a) * d;
    const y = solIle(elx, x, z);
    if (elx === "eau" ? y < 0.1 || dansLEau(elx, x, z) : elx === "glace" ? y > 2.4 : false) continue;
    if (nids.some((n) => Math.hypot(n.x - x, n.z - z) < 1.8)) continue;
    if (ile.noeuds.some((n) => Math.hypot(n.objet.position.x - x, n.objet.position.z - z) < 1.3)) continue;
    if (ile.obstacles.some((o) => Math.hypot(o.x - x, o.z - z) < o.r + 0.7)) continue;
    if (ile.obstSource && Math.hypot(ile.obstSource.x - x, ile.obstSource.z - z) < ile.obstSource.r + 1.4) continue;
    if (l.some((p) => Math.hypot(p.x - x, p.z - z) < 2.05)) continue;
    l.push({ id: `${elx}-p${l.length}`, x, z, y });
  }
  PLACES[elx] = l;
  return l;
}

// ---------- Modèles 3D des bâtiments ----------
function modele(type, niveau, elx) {
  const g = new T.Group();
  const bois = mat(0x8a5a32, { r: 0.85 }), boisFonce = mat(0x5a3820, { r: 0.9 }), pierre = mat(0x8a8478, { r: 0.95 }), toit = mat(elx === "feu" ? 0x7a2a1a : elx === "glace" ? 0x3a5a8a : 0x2a7a6a, { r: 0.8 });
  const boite = (sx, sy, sz, m, x = 0, y = 0, z = 0) => { const b = mesh(new T.BoxGeometry(sx, sy, sz), m); b.position.set(x, y + sy / 2, z); g.add(b); return b; };
  const toitPrisme = (l, p, h, y) => { const t = mesh(new T.CylinderGeometry(0.001, p * 0.75, h, 4, 1).rotateY(Math.PI / 4).scale(l / (p * 1.06), 1, 1), toit); t.position.y = y + h / 2; g.add(t); return t; };
  if (type === "hotel") {
    boite(1.9, 0.35, 1.6, pierre);
    boite(1.5, 0.9, 1.25, bois, 0, 0.35);
    toitPrisme(1.8, 1.55, 0.8, 1.25);
    boite(0.3, 0.45, 0.05, boisFonce, 0, 0.35, 0.64);
    const mat2 = mesh(new T.CylinderGeometry(0.025, 0.025, 1.1, 5), boisFonce); mat2.position.set(0.6, 2.2, 0); g.add(mat2);
    const drapeau = mesh(new T.BoxGeometry(0.4, 0.25, 0.02), mat(0xf2b544, { r: 0.6, e: 0x5a3a00, ei: 0.3 })); drapeau.position.set(0.82, 2.6, 0); g.add(drapeau);
    g.userData.anim = (t) => { drapeau.rotation.y = Math.sin(t * 3) * 0.25; };
  } else if (type === "entrepot") {
    boite(1.6, 0.75, 1.1, bois);
    toitPrisme(1.75, 1.2, 0.55, 0.75);
    boite(0.5, 0.55, 0.05, boisFonce, 0, 0, 0.56);
    for (let i = 0; i < 3; i++) boite(0.3, 0.3, 0.3, boisFonce, 0.95, i === 2 ? 0.3 : 0, i === 1 ? 0.35 : -0.2);
  } else if (type === "verger") {
    boite(1.7, 0.06, 1.3, mat(0x5a3a22, { r: 1 }));
    for (const [x, z] of [[-0.5, -0.3], [0.45, -0.25], [0, 0.35]]) {
      const tr = mesh(new T.CylinderGeometry(0.05, 0.07, 0.5, 5), boisFonce); tr.position.set(x, 0.3, z); g.add(tr);
      const f = mesh(new T.IcosahedronGeometry(0.32, 0), mat(elx === "glace" ? 0x4a8a6a : 0x3a9a3a, { r: 0.9 })); f.position.set(x, 0.72, z); g.add(f);
      for (let k = 0; k < 3; k++) { const p = mesh(new T.SphereGeometry(0.06, 5, 4), mat(0xd83a2a, { r: 0.5 }), false); p.position.set(x + Math.cos(k * 2) * 0.25, 0.7 + (k - 1) * 0.08, z + Math.sin(k * 2) * 0.25); g.add(p); }
    }
    for (let i = 0; i < 8; i++) { const a = (i / 8) * 6.28; const p = mesh(new T.BoxGeometry(0.06, 0.3, 0.06), boisFonce); p.position.set(Math.cos(a) * 0.95, 0.15, Math.sin(a) * 0.75); g.add(p); }
  } else if (type === "scierie") {
    boite(1.1, 0.6, 0.9, bois, -0.25, 0, -0.1);
    toitPrisme(1.25, 1.0, 0.45, 0.6).position.x = -0.25;
    for (let i = 0; i < 4; i++) { const b = mesh(new T.CylinderGeometry(0.12, 0.12, 1.0, 7).rotateZ(Math.PI / 2), mat(0x9a6a3a, { r: 0.9 })); b.position.set(0.55, 0.12 + (i > 2 ? 0.22 : 0), -0.35 + (i % 3) * 0.25); b.rotation.y = Math.PI / 2; g.add(b); }
    const lame = mesh(new T.CylinderGeometry(0.28, 0.28, 0.03, 12).rotateX(Math.PI / 2), mat(0xc8c8c8, { m: 0.7, r: 0.3 })); lame.position.set(-0.25, 0.45, 0.47); g.add(lame);
    g.userData.anim = (t) => { lame.rotation.z = t * 4; };
  } else if (type === "carriere") {
    for (let i = 0; i < 6; i++) { const p = mesh(new T.DodecahedronGeometry(0.22 + (i % 3) * 0.08, 0), pierre); p.position.set(Math.cos(i * 1.1) * 0.45, 0.18 + (i === 0 ? 0.2 : 0), Math.sin(i * 1.1) * 0.35); p.rotation.set(i, i * 2, 0); g.add(p); }
    boite(0.5, 0.25, 0.35, boisFonce, 0.75, 0.1, 0.4);
    for (const s of [-1, 1]) { const ro = mesh(new T.CylinderGeometry(0.09, 0.09, 0.05, 8).rotateX(Math.PI / 2), boisFonce); ro.position.set(0.75 + s * 0.18, 0.09, 0.6); g.add(ro); }
    const manche = mesh(new T.CylinderGeometry(0.02, 0.02, 0.6, 4), boisFonce); manche.position.set(-0.3, 0.5, 0.2); manche.rotation.z = 0.6; g.add(manche);
  } else {
    // Tour de défense : socle de pierre, fût, et au sommet son cœur élémentaire
    const tr = BATIMENTS[type].tour;
    const fut = mesh(new T.CylinderGeometry(0.42, 0.55, 1.6, 7), pierre); fut.position.y = 0.8; g.add(fut);
    const crenaux = mesh(new T.CylinderGeometry(0.58, 0.5, 0.25, 7), pierre); crenaux.position.y = 1.72; g.add(crenaux);
    for (let i = 0; i < 7; i++) { const c = mesh(new T.BoxGeometry(0.16, 0.18, 0.16), pierre); const a = (i / 7) * 6.28; c.position.set(Math.cos(a) * 0.5, 1.93, Math.sin(a) * 0.5); g.add(c); }
    const coeur = mesh(type === "tourGivre" ? new T.OctahedronGeometry(0.28, 0).scale(1, 1.5, 1) : new T.IcosahedronGeometry(0.26, 0), mat(tr.couleur, { e: tr.couleur, ei: 1, r: 0.2, m: 0.2 }));
    coeur.position.y = 2.25; g.add(coeur);
    const l = new T.PointLight(tr.couleur, 0.8, 3.5); l.position.y = 2.25; g.add(l);
    g.userData.coeur = coeur;
    g.userData.anim = (t) => { coeur.rotation.y = t * 1.5; coeur.position.y = 2.25 + Math.sin(t * 2) * 0.06; l.intensity = 0.7 + Math.sin(t * 4) * 0.2; };
  }
  // Petits fanions : un par niveau
  for (let i = 1; i < niveau; i++) { const f = mesh(new T.ConeGeometry(0.07, 0.16, 3).rotateZ(-Math.PI / 2), mat(0xf2b544, { r: 0.6 }), false); f.position.set(-0.7 + i * 0.18, 0.08, 0.75); g.add(f); }
  g.scale.setScalar(0.85 + niveau * 0.06);
  return g;
}

// ---------- État 3D ----------
const V = { cle: null, objets: new Map(), marqueurs: [], libres: [], bataille: null, t: 0, panneau: null, ile: "feu" };
function synchro() {
  const D = moteurIles();
  if (!D || !E()) return;
  const cle = vil().batiments.map((b) => `${b.uid}:${b.niveau}:${b.place}`).join("|");
  if (cle === V.cle) return;
  V.cle = cle;
  const vus = new Set();
  for (const b of vil().batiments) {
    vus.add(b.uid);
    const ancien = V.objets.get(b.uid);
    if (ancien && ancien.niveau === b.niveau) continue;
    if (ancien) ancien.g.parent && ancien.g.parent.remove(ancien.g);
    const p = places(b.ile).find((x) => x.id === b.place);
    if (!p) continue;
    const g = modele(b.type, b.niveau, b.ile);
    g.position.set(p.x, p.y, p.z);
    g.rotation.y = Math.atan2(-p.x, -p.z);
    g.userData.action = { type: "batiment", uid: b.uid };
    // Zone de toucher généreuse
    const zone = new T.Mesh(new T.CylinderGeometry(1, 1, 2, 8), new T.MeshBasicMaterial({ visible: false })); zone.position.y = 1; g.add(zone);
    // Icône flottante quand une ferme a de quoi récolter
    if (BATIMENTS[b.type].produit) {
      const bulle = new T.Mesh(new T.IcosahedronGeometry(0.16, 1), mat({ rations: 0xe8a070, brindilles: 0xc89a5a, pierres: 0xb8b8c0 }[BATIMENTS[b.type].produit], { e: 0xffd880, ei: 0.5 }));
      bulle.position.y = 1.7; bulle.visible = false; g.add(bulle); g.userData.bulle = bulle;
    }
    moteurIles().iles[b.ile].groupe.add(g);
    V.objets.set(b.uid, { g, niveau: b.niveau, b });
  }
  for (const [uid, o] of V.objets) if (!vus.has(uid)) { o.g.parent && o.g.parent.remove(o.g); V.objets.delete(uid); }
  // Cercles dorés sur les emplacements libres : on les touche pour construire
  for (const m of V.libres) m.parent && m.parent.remove(m);
  V.libres = [];
  const prises = new Set(vil().batiments.map((b) => b.place));
  for (const elx of ["feu", "glace", "eau"]) for (const p of places(elx)) {
    if (prises.has(p.id)) continue;
    const m = new T.Group();
    const anneau = new T.Mesh(new T.RingGeometry(0.55, 0.68, 20), new T.MeshBasicMaterial({ color: 0xf2b544, transparent: true, opacity: 0.32, side: T.DoubleSide, depthWrite: false }));
    anneau.rotation.x = -Math.PI / 2; m.add(anneau);
    const plus = new T.Mesh(new T.PlaneGeometry(0.34, 0.07), anneau.material); plus.rotation.x = -Math.PI / 2; m.add(plus);
    const plus2 = plus.clone(); plus2.rotation.z = Math.PI / 2; m.add(plus2);
    const zone = new T.Mesh(new T.CylinderGeometry(0.9, 0.9, 0.6, 8), new T.MeshBasicMaterial({ visible: false })); zone.position.y = 0.3; m.add(zone);
    m.position.set(p.x, p.y + 0.05, p.z);
    m.userData.action = { type: "vlibre", place: p.id, ile: elx };
    D.iles[elx].groupe.add(m);
    V.libres.push(m);
  }
}
let dernierProd = 0;
function update(dt) {
  if (!E()) return;
  V.t += dt;
  synchro();
  for (const [, o] of V.objets) {
    if (o.g.userData.anim) o.g.userData.anim(V.t);
    if (o.g.userData.bulle) { o.g.userData.bulle.position.y = 1.7 + Math.sin(V.t * 2.5) * 0.1; o.g.userData.bulle.rotation.y += dt * 2; }
  }
  // Les bulles de récolte (vérifiées une fois par seconde)
  if (V.t - dernierProd > 1) {
    dernierProd = V.t;
    for (const [, o] of V.objets) if (o.g.userData.bulle) { majProduction(o.b); o.g.userData.bulle.visible = (o.b.stock || 0) >= 1 && !V.bataille; }
    verifierVague();
  }
  for (const m of V.marqueurs) { m.rotation.y += dt; m.children[0].material.opacity = 0.45 + Math.sin(V.t * 4) * 0.25; }
  const D = moteurIles();
  const voirLibres = ouvert() && !V.bataille && !(D && D.placement) && D && D.focus && D.focus !== "tout" && D.focus !== "centre";
  for (const m of V.libres) { m.visible = voirLibres && m.userData.action.ile === D.focus; m.children[0].material.opacity = 0.22 + Math.sin(V.t * 2) * 0.1; }
  if (V.bataille) majBataille(dt * V.bataille.vitesse);
}

// ---------- Panneau du village ----------
styles("village", `
.vl-p { position: fixed; z-index: 17; left: var(--bord-g); right: var(--bord-d); bottom: calc(var(--bas) + 80px); max-width: 560px; margin: 0 auto; max-height: min(52vh, 460px); overflow: auto; padding: 14px; display: grid; gap: 10px; }
.vl-p header { display: flex; justify-content: space-between; align-items: flex-start; gap: 8px; }
.vl-p h3 { font-size: 20px; }
.vl-p .info { font-size: 12px; color: var(--doux); line-height: 1.5; margin: 0; }
.vl-liste { display: grid; gap: 6px; }
.vl-art { display: grid; grid-template-columns: 1fr auto; gap: 2px 8px; align-items: center; padding: 10px; border-radius: 10px; border: 1px solid var(--trait); background: rgba(255,255,255,.03); }
.vl-art b { font-family: var(--titre); font-size: 14px; }
.vl-art small { grid-column: 1 / -1; color: var(--doux); font-size: 11px; }
.vl-art .cout { grid-column: 1 / -1; font-size: 11px; color: var(--ambre); }
.vl-art.non { opacity: .55; }
.vl-alerte { padding: 9px 11px; border-radius: 10px; background: rgba(255,80,60,.14); border: 1px solid rgba(255,110,90,.5); color: #ffc8c0; font-size: 13px; }
.vl-bandeau { position: fixed; z-index: 18; top: calc(var(--hud) + var(--tuto, 0px) + 6px); left: 50%; transform: translateX(-50%); padding: 8px 14px; display: flex; gap: 10px; align-items: center; white-space: nowrap; font-size: 13px; }
.vl-bandeau b { font-family: var(--titre); color: #ff9a7a; }
.vl-fin { display: grid; gap: 8px; }
`);
function fermerPanneau() { if (V.panneau) { V.panneau.remove(); V.panneau = null; } }
function panneau(titre, sous, ...contenu) {
  fermerFiche(); fermerPanneau(); arreterPlacement();
  const p = el("section", { class: "vl-p panneau" },
    el("header", {}, el("div", {}, el("div", { class: "etiquette" }, sous), el("h3", {}, titre)), el("button", { class: "fermer-fiche", "aria-label": "Fermer", onclick: () => fermerPanneau(), html: icone("fermer").innerHTML })),
    ...contenu);
  document.getElementById("ecran").append(p);
  V.panneau = p;
  return p;
}
export function ouvrirVillage(elx) {
  const D = moteurIles();
  elx = elx || (D && D.iles[D.focus] ? D.focus : "feu");
  V.ile = elx;
  if (D && D.focus !== elx) focaliser(elx);
  const v = vil();
  const nh = niveauHotel();
  const sur = v.batiments.filter((b) => b.ile === elx);
  const vg = v.vague;
  const contenu = [];
  {
    const attente = vg.enAttente ? el("div", { class: "vl-alerte" }, `Des pillards approchent de l'${NOM_ILE[vg.enAttente]} ! Vague ${vg.numero}.`) : null;
    if (attente) contenu.push(attente);
    contenu.push(el("p", { class: "info" }, `Couvoir niveau ${nh} : jusqu'à ${nh} bâtiment${nh > 1 ? "s" : ""} de chaque sorte, niveau ${nh} maximum. ${vg.prochaine && !vg.enAttente ? `Prochaine attaque dans ${duree(vg.prochaine - maintenant())}.` : ""}`));
    contenu.push(el("div", { class: "actions", style: { display: "flex", gap: "6px", flexWrap: "wrap" } },
      el("button", { class: "btn principal petit", onclick: () => lancerBataille(vg.enAttente || elx, false) }, `Défendre la vague ${vg.numero} (en direct)`),
      el("button", { class: "btn petit", onclick: () => lancerBataille(vg.enAttente || elx, true) }, "Laisser mes dragons défendre")));
  }
  const liste = el("div", { class: "vl-liste" });
  for (const type of ORDRE) {
    const d = BATIMENTS[type];
    const n = combien(type), max = maxDe(type);
    const c = cout(type, 1);
    const bloque = type !== "hotel" && !nh;
    const plein = n >= max;
    liste.append(el("div", { class: `vl-art ${bloque || plein ? "non" : ""}` },
      el("b", {}, d.nom), el("span", { class: "num doux", style: { fontSize: "12px" } }, `${n}/${max || 1}`),
      el("small", {}, d.desc),
      bloque ? null : plein ? el("small", {}, "Améliore le couvoir pour en construire plus.") : el("span", { class: "cout" }, `Coût : ${texteCout(c)}`),
      !bloque && !plein ? el("button", { class: "btn petit" + (assez(c) ? " principal" : ""), style: { gridColumn: "1 / -1", justifySelf: "start" }, disabled: !assez(c), onclick: () => placer(type) }, `Construire sur l'${NOM_ILE[elx]}`) : null));
  }
  panneau(`Village · ${NOM_ILE[elx]}`, `${sur.length} bâtiment${sur.length > 1 ? "s" : ""} sur cette île`, ...contenu, el("div", { class: "etiquette" }, "Construire"), liste);
}
const duree = (ms) => { const m = Math.max(0, Math.round(ms / 60000)); return m >= 60 ? `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, "0")}` : `${m} min`; };

// ---------- Placement ----------
function arreterPlacement() {
  const D = moteurIles();
  for (const m of V.marqueurs) m.parent && m.parent.remove(m);
  V.marqueurs = [];
  if (D && D.placement && D.placement.village) D.placement = null;
  const b = document.getElementById("vl-placement"); if (b) b.remove();
}
function placer(type) {
  const D = moteurIles();
  const elx = V.ile;
  fermerPanneau(); arreterPlacement();
  const prises = new Set(vil().batiments.map((b) => b.place));
  const libres = places(elx).filter((p) => !prises.has(p.id));
  if (!libres.length) { toast("Plus de place sur cette île : construis sur une autre.", "mal"); return; }
  D.placement = { village: true };
  for (const p of libres) {
    const m = new T.Group();
    const anneau = new T.Mesh(new T.RingGeometry(0.75, 0.95, 24), new T.MeshBasicMaterial({ color: 0xf2b544, transparent: true, opacity: 0.6, side: T.DoubleSide, depthWrite: false }));
    anneau.rotation.x = -Math.PI / 2; m.add(anneau);
    const zone = new T.Mesh(new T.CylinderGeometry(1, 1, 1.5, 8), new T.MeshBasicMaterial({ visible: false })); zone.position.y = 0.5; m.add(zone);
    m.position.set(p.x, p.y + 0.06, p.z);
    m.userData.action = { type: "vplace", place: p.id, bat: type };
    D.iles[elx].groupe.add(m);
    V.marqueurs.push(m);
  }
  document.getElementById("ecran").append(el("div", { class: "bandeau-placement panneau", id: "vl-placement" },
    el("span", {}, `Touche un cercle doré pour poser : ${BATIMENTS[type].nom}`),
    el("button", { class: "btn petit", onclick: () => { arreterPlacement(); ouvrirVillage(elx); } }, "Annuler")));
  focaliser(elx);
}
function construireSur(elx, place) {
  V.ile = elx;
  const nh = niveauHotel();
  const liste = el("div", { class: "vl-liste" });
  for (const type of ORDRE) {
    const d = BATIMENTS[type];
    const n = combien(type), max = maxDe(type);
    const c = cout(type, 1);
    const plein = n >= max;
    liste.append(el("div", { class: `vl-art ${plein ? "non" : ""}` },
      el("b", {}, d.nom), el("span", { class: "num doux", style: { fontSize: "12px" } }, `${n}/${max}`),
      el("small", {}, d.desc),
      plein ? el("small", {}, "Améliore le couvoir pour en construire plus.") : el("span", { class: "cout" }, `Coût : ${texteCout(c)}`),
      !plein ? el("button", { class: "btn petit" + (assez(c) ? " principal" : ""), style: { gridColumn: "1 / -1", justifySelf: "start" }, disabled: !assez(c), onclick: () => construireIci({ bat: type, place }) }, "Construire ici") : null));
  }
  panneau("Construire ici", `${NOM_ILE[elx]} · couvoir niveau ${nh}`, liste);
}
function construireIci(a) {
  const c = cout(a.bat, 1);
  let ok = false;
  changer((s) => {
    if (!assez(c)) return;
    payer(s, c);
    const v = s.village;
    v.batiments.push({ uid: "b" + (++v.compteur), type: a.bat, ile: V.ile, place: a.place, niveau: 1, stock: 0, maj: maintenant() });
    if (!v.vague.prochaine) v.vague.prochaine = maintenant() + 4 * H;
    noter(`${BATIMENTS[a.bat].nom} construit sur l'${NOM_ILE[V.ile]}.`);
    ok = true;
  });
  arreterPlacement();
  if (!ok) { toast("Pas assez de ressources.", "mal"); return; }
  Son.recolte("bois"); setTimeout(() => Son.recolte("pierre"), 180);
  toast(`${BATIMENTS[a.bat].nom} construit !`, "bon");
  signaler("construit", a.bat);
  synchro();
  const o = [...V.objets.values()].find((x) => x.b.place === a.place);
  if (o) poussiere(o.g);
  ouvrirVillage(V.ile);
}
function poussiere(g) {
  const D = moteurIles();
  for (let i = 0; i < 16; i++) particule(g.parent, g.position.clone().add(new T.Vector3((Math.random() - 0.5) * 1.6, 0.2, (Math.random() - 0.5) * 1.6)), 0xd8c8a8, new T.Vector3((Math.random() - 0.5) * 1.2, 0.8 + Math.random(), (Math.random() - 0.5) * 1.2), { vie: 1.2, grossit: 1.2, taille: 3, o: 0.6, frein: 0.4 });
  if (D) D.secousse = Math.max(D.secousse || 0, 0.25);
}

// ---------- Fiche d'un bâtiment ----------
function ficheBatiment(uid) {
  const b = vil().batiments.find((x) => x.uid === uid);
  if (!b) return;
  V.ile = b.ile;
  const d = BATIMENTS[b.type];
  const contenu = [el("p", { class: "info" }, d.desc)];
  if (d.produit) {
    majProduction(b);
    const n = Math.floor(b.stock || 0), max = Math.floor(stockMax(b));
    contenu.push(el("div", { class: "ligne", style: { display: "grid", gridTemplateColumns: "60px 1fr auto", gap: "8px", alignItems: "center", fontSize: "12px" } }, el("span", { class: "etiquette" }, "Réserve"), barre(n, max), el("span", { class: "num" }, `${n}/${max}`)),
      el("p", { class: "info" }, `Produit ${d.parHeure * b.niveau} ${MATERIAUX[d.produit].nom.toLowerCase()} par heure.`),
      el("button", { class: "btn principal petit", disabled: n < 1, onclick: () => recolter(b.uid) }, icone(d.produit), `Récolter ${n}`));
  }
  if (d.tour) contenu.push(el("p", { class: "info" }, `Dégâts ${Math.round(d.tour.degats * (1 + 0.35 * (b.niveau - 1)))} · portée ${d.tour.portee.toFixed(1)} · un tir toutes les ${d.tour.cadence.toFixed(1)} s.`));
  if (b.type === "entrepot") contenu.push(el("p", { class: "info" }, `Tous tes entrepôts : réserves des fermes × ${bonusEntrepot().toFixed(1)}, ${Math.round(protection() * 100)} % de tes ressources protégées des pillards.`));
  const nh = niveauHotel();
  const maxNiv = b.type === "hotel" ? d.max : nh;
  if (b.niveau < maxNiv) {
    const c = cout(b.type, b.niveau + 1);
    contenu.push(el("div", { class: "vl-art" }, el("b", {}, `Niveau ${b.niveau + 1}`), el("span"), el("span", { class: "cout" }, `Coût : ${texteCout(c)}`),
      el("button", { class: "btn petit" + (assez(c) ? " principal" : ""), style: { gridColumn: "1 / -1", justifySelf: "start" }, disabled: !assez(c), onclick: () => ameliorer(b.uid) }, "Améliorer")));
  } else contenu.push(el("p", { class: "info" }, b.type === "hotel" ? "Niveau maximum." : `Niveau maximum pour l'instant : améliore le couvoir (niveau ${nh}).`));
  contenu.push(el("button", { class: "btn petit", onclick: () => ouvrirVillage(b.ile) }, "Tout le village"));
  panneau(d.nom, `${NOM_ILE[b.ile]} · niveau ${b.niveau}`, ...contenu);
}
function recolter(uid) {
  let n = 0, quoi = "";
  changer((s) => { const b = s.village.batiments.find((x) => x.uid === uid); majProduction(b); n = Math.floor(b.stock); quoi = BATIMENTS[b.type].produit; s.ressources[quoi] = (s.ressources[quoi] || 0) + n; b.stock -= n; });
  if (!n) return;
  Son.recolte(quoi === "pierres" ? "pierre" : "bois");
  toast(`+${n} ${MATERIAUX[quoi].nom.toLowerCase()}`, "bon");
  ficheBatiment(uid);
}
function ameliorer(uid) {
  const b = vil().batiments.find((x) => x.uid === uid);
  const c = cout(b.type, b.niveau + 1);
  let ok = false;
  changer((s) => { const x = s.village.batiments.find((y) => y.uid === uid); if (!assez(c)) return; majProduction(x); payer(s, c); x.niveau++; ok = true; });
  if (!ok) return;
  Son.evolution(); toast(`${BATIMENTS[b.type].nom} niveau ${b.niveau} !`, "bon");
  synchro();
  const o = V.objets.get(uid); if (o) poussiere(o.g);
  ficheBatiment(uid);
}

// ---------- Les vagues ----------
function verifierVague() {
  if (!ouvert()) return;
  const v = vil();
  if (!v.vague.prochaine || v.vague.enAttente || V.bataille) return;
  if (maintenant() >= v.vague.prochaine) {
    const iles = [...new Set(v.batiments.map((b) => b.ile))];
    const cible = iles[Math.floor(Math.random() * iles.length)] || "feu";
    changer((s) => { s.village.vague.enAttente = cible; });
    toast(`Des pillards approchent de l'${NOM_ILE[cible]} ! Touche « Village » pour défendre.`, "mal");
    Son.crier("feu", 0.9);
  }
}
const GEO_BARRE = new T.PlaneGeometry(1, 0.1);
function barre3D(largeur) {
  const g = new T.Group();
  const fond = new T.Mesh(GEO_BARRE, new T.MeshBasicMaterial({ color: 0x1a1010, transparent: true, opacity: 0.8, depthTest: false }));
  const plein = new T.Mesh(GEO_BARRE, new T.MeshBasicMaterial({ color: 0x6fd68a, depthTest: false }));
  fond.scale.x = largeur; plein.scale.x = largeur; plein.position.z = 0.001; fond.renderOrder = 10; plein.renderOrder = 11;
  g.add(fond, plein); g.userData.plein = plein; g.userData.l = largeur;
  return g;
}
function regler(b3, k, cam) { const p = b3.userData.plein; p.scale.x = Math.max(0.001, k) * b3.userData.l; p.position.x = -(1 - k) * b3.userData.l / 2; p.material.color.setHex(k > 0.5 ? 0x6fd68a : k > 0.25 ? 0xf2b544 : 0xff5a4a); b3.quaternion.copy(cam.quaternion); }

// Une vague : des pillards apparaissent au hasard sur les trois îles. Ils s'en prennent aux bâtiments de leur île,
// puis traversent le pont pour attaquer le couvoir (l'hôtel de ville). Si le couvoir tombe, la vague est perdue.
const ILES3 = ["feu", "glace", "eau"];
const monde = (o) => o.getWorldPosition(new T.Vector3());
function solMonde(elx, x, z) { const p = POS_ILES[elx]; return p.y + solIle(elx, x - p.x, z - p.z); }
function lancerBataille(elxIgnore, auto) {
  const D = moteurIles();
  if (V.bataille || !D) return;
  const v = vil();
  fermerPanneau(); fermerFiche();
  focaliser("tout");
  const n = v.vague.numero;
  // Les défenseurs : tous les dragons en forme qui ne sont pas sur le chantier
  const dragons = [...D.dragons.values()].filter((x) => !x.ko && !x.d.chantier);
  for (const x of dragons) { x.etatAvant = x.etat; x.etat = "bataille"; x.cibleB = null; x.recharge = 0; }
  // Les bâtiments et le couvoir ont des PV
  const bats = v.batiments.map((b) => { const o = V.objets.get(b.uid); if (!o) return null; const pv = BATIMENTS[b.type].pv * (1 + 0.3 * (b.niveau - 1)); const b3 = barre3D(1.2); b3.position.y = 2.6; o.g.add(b3); return { b, o, pv, max: pv, barre: b3, recharge: Math.random(), w: monde(o.g), elx: b.ile }; }).filter(Boolean);
  const nivC = E().oeufs.couvoir.niveau;
  const pvC = 420 + 260 * nivC;
  const bc = barre3D(2.2); bc.position.y = 4.4; D.forteresse.add(bc);
  const couvoir = { pv: pvC, max: pvC, barre: bc, w: monde(D.forteresse), tourelles: (D.forteresse.userData.tourelles || []).map((c) => ({ c, recharge: Math.random() })) };
  // Les pillards : de jeunes dragons sauvages, plus nombreux et plus solides à chaque vague
  const groupe = new T.Group(); D.scene.add(groupe); extensions.cibles.push(groupe);
  const nb = V.vagueGuide ? 3 : Math.min(16, 3 + n), ennemis = [];
  for (let i = 0; i < nb; i++) {
    const elx = ILES3[Math.floor(Math.random() * 3)];
    const brute = i % 4 === 3;
    const autres = DRAGONS.filter((d) => d.element !== elx);
    const id = autres[Math.floor(Math.random() * autres.length)].id;
    const rig = construireDragon(id, brute ? 1 : 0, {});
    const taille = Math.max(rig.taille.x, rig.taille.z);
    const ech = (brute ? 1.35 : 0.95) / Math.max(0.6, taille);
    rig.racine.scale.setScalar(ech);
    const m = new T.Group(); m.add(rig.racine);
    const a = Math.random() * 6.28, rb = rayonBord(elx, a) - 1.2;
    const x = POS_ILES[elx].x + Math.cos(a) * rb, z = POS_ILES[elx].z + Math.sin(a) * rb;
    m.position.set(x, solMonde(elx, x, z), z);
    const zone = new T.Mesh(new T.SphereGeometry(1.1, 6, 4), new T.MeshBasicMaterial({ visible: false })); zone.position.y = 0.5; m.add(zone);
    m.userData.action = { type: "ennemi", i };
    const b3 = barre3D(0.9); b3.position.y = rig.taille.y * ech + 0.4; m.add(b3);
    m.visible = false;
    groupe.add(m);
    const anim = new Animateur(rig); anim.jouer("marche");
    const pv = (34 + 11 * n) * (brute ? 2.6 : 1);
    ennemis.push({ m, anim, elx, pv, max: pv, vitesse: brute ? 0.8 : 1.2, degats: (5 + 2 * n) * (brute ? 2 : 1), lent: 0, recharge: 0, arrivee: i * 1.3 + Math.random(), barre: b3, cible: null, chemin: null, mort: false, haut: rig.taille.y * ech });
  }
  V.bataille = { auto, vitesse: auto ? 2 : 1, n, bats, couvoir, ennemis, dragons, groupe, t: 0, tirs: [], fini: false, coupDeMain: 0 };
  Son.crier("eau", 1);
  Musique.jouer("attaque");
  const bandeau = el("div", { class: "vl-bandeau panneau", id: "vl-bandeau" });
  document.getElementById("ecran").append(bandeau);
  majBandeau();
  if (!auto) toast("Touche les pillards : ta tablette les frappe, et tes dragons foncent dessus.", "bon");
}
function majBandeau() {
  const B = V.bataille, b = document.getElementById("vl-bandeau");
  if (!B || !b) return;
  const restants = B.ennemis.filter((e) => !e.mort).length;
  b.innerHTML = "";
  b.append(el("b", {}, `Vague ${B.n}`), el("span", {}, `${restants} pillard${restants > 1 ? "s" : ""}`), el("span", { class: "num doux" }, `couvoir ${Math.max(0, Math.round((B.couvoir.pv / B.couvoir.max) * 100))} %`), el("span", { class: "num doux" }, `${Math.max(0, Math.ceil(150 - B.t))} s`),
    el("button", { class: "btn petit", onclick: () => { B.vitesse = B.vitesse >= 2 ? 1 : 2; majBandeau(); } }, `× ${B.vitesse}`));
}
// Toucher un pillard : coup de la tablette, et les dragons de son île le prennent pour cible
function toucherEnnemi(a) {
  const B = V.bataille;
  if (!B || B.auto) return;
  const e = B.ennemis[a.i];
  if (!e || e.mort) return;
  for (const x of B.dragons) if (x.element === e.elx) x.cibleB = e;
  if (B.coupDeMain <= 0) {
    B.coupDeMain = 0.45;
    blesser(e, 6 + B.n);
    particule(B.groupe, e.m.position.clone().add(new T.Vector3(0, e.haut * 0.6, 0)), 0xd8b0ff, new T.Vector3(0, 1.2, 0), { e: true, vie: 0.5, grossit: 3, taille: 2.5 });
    Son.impact("glace", false);
  }
}
function blesser(e, d) {
  if (e.mort) return;
  e.pv -= d;
  e.anim.flash = 1;
  if (e.pv <= 0) {
    e.mort = true; e.anim.jouer("ko");
    setTimeout(() => { e.m.parent && e.m.parent.remove(e.m); }, 1400);
    majBandeau();
  }
}
function tirer(B, depart, e, degats, type, source) {
  const couleur = type === "couvoir" ? 0xffd27a : BATIMENTS[type].tour.couleur;
  const boule = mesh(new T.IcosahedronGeometry(0.17, 1), mat(couleur, { e: couleur, ei: 1 }), false);
  boule.position.copy(depart); B.groupe.add(boule);
  B.tirs.push({ boule, dep: depart.clone(), e, t: 0, duree: type === "couvoir" ? 0.6 : 0.45, type, degats, source });
}
function majBataille(dt) {
  const B = V.bataille, D = moteurIles();
  if (!B || B.fini) return;
  B.t += dt; B.coupDeMain -= dt;
  if (Math.floor(B.t) !== Math.floor(B.t - dt)) majBandeau();
  regler(B.couvoir.barre, Math.max(0, B.couvoir.pv / B.couvoir.max), D.camera);
  // Pillards : bâtiments de leur île d'abord, puis le pont et le couvoir
  for (const e of B.ennemis) {
    if (e.mort || B.t < e.arrivee) continue;
    e.m.visible = true;
    e.anim.update(dt);
    regler(e.barre, e.pv / e.max, D.camera);
    e.lent = Math.max(0, e.lent - dt);
    const p = e.m.position;
    if (!e.chemin && (!e.cible || e.cible.pv <= 0)) {
      let best = null, dm = 1e9;
      for (const b of B.bats) if (b.pv > 0 && b.elx === e.elx) { const d = Math.hypot(b.w.x - p.x, b.w.z - p.z); if (d < dm) { dm = d; best = b; } }
      e.cible = best;
      if (!best) {
        // Plus rien à piller sur l'île : direction le couvoir, par le pont
        const pt = D.ponts[e.elx];
        const dir = new T.Vector3(pt.a.x, 0, pt.a.z).normalize();
        e.chemin = [pt.b.clone(), pt.a.clone(), new T.Vector3(dir.x * 3.3, B.couvoir.w.y + 0.05, dir.z * 3.3)];
        e.depuis = p.clone();
      }
    }
    let q, rayon;
    if (e.chemin) { q = e.chemin[0]; rayon = e.chemin.length === 1 ? 0.3 : 0.25; }
    else if (e.cible) { q = e.cible.w; rayon = 1.3; }
    else continue;
    const dx = q.x - p.x, dz = q.z - p.z, d = Math.hypot(dx, dz);
    e.m.rotation.y = Math.atan2(dx, dz);
    if (d > rayon) {
      const pas = Math.min(d, e.vitesse * (e.lent > 0 ? 0.45 : 1) * dt);
      p.x += (dx / d) * pas; p.z += (dz / d) * pas;
      if (e.chemin) { const tot = Math.hypot(q.x - e.depuis.x, q.z - e.depuis.z) || 1; const k = 1 - Math.min(1, Math.hypot(q.x - p.x, q.z - p.z) / tot); p.y = e.depuis.y + (q.y - e.depuis.y) * k; }
      else p.y = solMonde(e.elx, p.x, p.z);
      e.anim.jouer("marche");
      continue;
    }
    if (e.chemin && e.chemin.length > 1) { e.depuis = e.chemin.shift(); continue; }
    // Au contact : il frappe
    e.recharge -= dt;
    if (e.recharge > 0) continue;
    e.recharge = 1.1;
    e.anim.jouer("attaque");
    if (Math.random() < 0.4) Son.recolte("bois");
    if (e.chemin) {
      B.couvoir.pv -= e.degats;
      particule(B.groupe, p.clone().add(new T.Vector3(0, 0.6, 0)), 0xa08a70, new T.Vector3(0, 1.4, 0), { geo: new T.TetrahedronGeometry(0.08, 0), g: -6, vie: 0.8, taille: 1.4 });
      if (B.couvoir.pv <= 0) { D.secousse = Math.max(D.secousse || 0, 0.8); Son.impact("feu", true); }
    } else {
      e.cible.pv -= e.degats;
      particule(B.groupe, e.cible.w.clone().add(new T.Vector3((Math.random() - 0.5), 0.6, (Math.random() - 0.5))), 0xa08a70, new T.Vector3(0, 1.4, 0), { geo: new T.TetrahedronGeometry(0.08, 0), g: -6, vie: 0.8, taille: 1.4 });
      if (e.cible.pv <= 0) { e.cible.o.g.scale.y *= 0.45; e.cible.barre.visible = false; Son.impact("feu", true); D.secousse = Math.max(D.secousse || 0, 0.4); }
    }
  }
  const vivants = (filtre) => B.ennemis.filter((x) => !x.mort && B.t >= x.arrivee && filtre(x));
  const plusProcheDe = (w, portee, filtre = () => true) => { let m = null, dm = portee; for (const x of vivants(filtre)) { const d = x.m.position.distanceTo(w); if (d < dm) { dm = d; m = x; } } return m; };
  // Tours des îles
  for (const b of B.bats) {
    regler(b.barre, Math.max(0, b.pv / b.max), D.camera);
    const tr = BATIMENTS[b.b.type].tour;
    if (!tr || b.pv <= 0) continue;
    b.recharge -= dt;
    if (b.recharge > 0) continue;
    const e = plusProcheDe(b.w, tr.portee * (1 + 0.08 * (b.b.niveau - 1)) + 1);
    if (!e) continue;
    b.recharge = tr.cadence;
    tirer(B, b.w.clone().add(new T.Vector3(0, 2.25 * b.o.g.scale.y, 0)), e, tr.degats * (1 + 0.35 * (b.b.niveau - 1)), b.b.type, b);
  }
  // Tourelles du couvoir (dès le niveau 2)
  const nivC = E().oeufs.couvoir.niveau;
  for (const t of B.couvoir.tourelles) {
    t.recharge -= dt;
    if (t.recharge > 0) continue;
    const w = monde(t.c);
    const e = plusProcheDe(w, 9);
    if (!e) continue;
    t.recharge = 1.1;
    tirer(B, w, e, 12 + 6 * nivC, "couvoir", null);
  }
  for (let i = B.tirs.length - 1; i >= 0; i--) {
    const s = B.tirs[i];
    s.t += dt;
    const k = Math.min(1, s.t / s.duree);
    const vise = s.e.m.position.clone().add(new T.Vector3(0, s.e.haut * 0.5, 0));
    s.boule.position.lerpVectors(s.dep, vise, k); s.boule.position.y += Math.sin(k * Math.PI) * 0.9;
    if (k < 1) continue;
    s.boule.parent && s.boule.parent.remove(s.boule);
    B.tirs.splice(i, 1);
    blesser(s.e, s.degats);
    const couleur = s.type === "couvoir" ? 0xffd27a : BATIMENTS[s.type].tour.couleur;
    for (let j = 0; j < 8; j++) particule(B.groupe, vise, couleur, new T.Vector3((Math.random() - 0.5) * 2, Math.random() * 2, (Math.random() - 0.5) * 2), { e: true, vie: 0.5, grossit: 1.5, taille: 1.4, frein: 0.3 });
    if (s.type === "tourLave") { for (const o of B.ennemis) if (o !== s.e && !o.mort && o.m.position.distanceTo(s.e.m.position) < 1.4) blesser(o, s.degats * 0.5); Son.impact("feu", false); }
    else if (s.type === "tourGivre") { s.e.lent = 2.2; Son.impact("glace", false); }
    else if (s.type === "tourEau" && !s.e.chemin) { const p = s.e.m.position, t0 = s.source.w; const dx = p.x - t0.x, dz = p.z - t0.z, d = Math.hypot(dx, dz) || 1; p.x += (dx / d) * 1.3; p.z += (dz / d) * 1.3; p.y = solMonde(s.e.elx, p.x, p.z); Son.impact("eau", false); }
    else Son.impact("feu", false);
  }
  // Dragons défenseurs : foncent sur les pillards de leur île
  for (const x of B.dragons) {
    if (x.ko) continue;
    const base = POS_ILES[x.element];
    const p = x.mobile.position;
    const w = new T.Vector3(p.x + base.x, p.y + base.y, p.z + base.z);
    if (!x.cibleB || x.cibleB.mort || x.cibleB.chemin) x.cibleB = plusProcheDe(w, 1e9, (e) => e.elx === x.element && !e.chemin);
    const e = x.cibleB;
    if (!e) { x.anim.jouer(enEauVillage(x) ? "nage" : "repos"); continue; }
    const q = e.m.position, dx = q.x - w.x, dz = q.z - w.z, d = Math.hypot(dx, dz);
    x.mobile.rotation.y = Math.atan2(dx, dz);
    const portee = 1.2 + x.taille * 0.4;
    if (d > portee) { const pas = 1.9 * dt; p.x += (dx / d) * pas; p.z += (dz / d) * pas; x.anim.jouer("marche"); }
    else {
      x.recharge -= dt;
      if (x.recharge <= 0) { x.recharge = 1.2; x.anim.jouer("attaque"); souffler(x); blesser(e, 8 + x.d.niveau * 2.6); }
    }
  }
  // Fin : tous les pillards sont tombés, ou le couvoir est tombé, ou le temps est écoulé
  const restants = B.ennemis.filter((e) => !e.mort).length;
  if (!restants) finBataille(true);
  else if (B.couvoir.pv <= 0 || B.t > 150) finBataille(false);
}
const enEauVillage = (x) => x.habitat === "surface" || x.habitat === "fond";
function finBataille(victoire) {
  const B = V.bataille;
  if (!B || B.fini) return;
  B.fini = true;
  const n = B.n;
  const gains = [];
  changer((s) => {
    const v = s.village;
    const r = s.ressources;
    if (victoire) {
      r.rations += 5 * n; r.brindilles += 6 * n; r.pierres += 6 * n; r.gemmes = (r.gemmes || 0) + 5 + 2 * n;
      gains.push(`+${5 * n} rations`, `+${6 * n} brindilles`, `+${6 * n} pierres`, `+${5 + 2 * n} gemmes`);
      v.vague.numero++;
    } else {
      // Les pillards emportent une part des ressources (moins avec des entrepôts) et vident les fermes
      const part = 0.12 * (1 - protection());
      for (const k of ["rations", "brindilles", "pierres"]) { const p = Math.floor((r[k] || 0) * part); r[k] -= p; if (p) gains.push(`−${p} ${k}`); }
      for (const b of v.batiments) if (BATIMENTS[b.type].produit) { majProduction(b); b.stock = 0; }
    }
    if (v.vague.enAttente) { v.vague.enAttente = null; v.vague.prochaine = maintenant() + 4 * H; }
    noter(`Vague ${n} : ${victoire ? "repoussée" : "les pillards ont gagné"}.`);
  });
  if (victoire) Son.victoire(); else Son.defaite();
  setTimeout(() => {
    // Tout se répare après l'attaque, les dragons reprennent leur vie
    for (const b of B.bats) { b.barre.parent && b.barre.parent.remove(b.barre); }
    for (const e of B.ennemis) e.m.parent && e.m.parent.remove(e.m);
    B.groupe.parent && B.groupe.parent.remove(B.groupe); extensions.cibles.splice(extensions.cibles.indexOf(B.groupe), 1);
    B.couvoir.barre.parent && B.couvoir.barre.parent.remove(B.couvoir.barre);
    for (const t of B.tirs) t.boule.parent && t.boule.parent.remove(t.boule);
    for (const x of B.dragons) { x.etat = "nid"; x.cible = x.maison.clone(); x.vitesse = 0.9; if (!x.ko) x.anim.jouer(victoire ? "joie" : "repos"); }
    V.bataille = null; V.cle = null; V.vagueGuide = false;
    setTimeout(() => signaler("vague_finie", { victoire }), 100);
    Musique.jouer("iles");
    for (const [, o] of V.objets) { o.g.parent && o.g.parent.remove(o.g); }
    V.objets.clear(); synchro();
    const bd = document.getElementById("vl-bandeau"); if (bd) bd.remove();
    modale({ titre: victoire ? `Vague ${n} repoussée !` : `Les pillards ont gagné`, contenu: el("div", { class: "vl-fin" },
      el("p", { style: { margin: 0 } }, victoire ? "Tes tours et tes dragons ont protégé le village." : `Ils ont atteint le couvoir et pillé les fermes${protection() ? `, mais tes entrepôts ont protégé ${Math.round(protection() * 100)} % de tes réserves` : ""}. Construis des tours et améliore-les !`),
      gains.length ? el("p", { class: "doux", style: { margin: 0 } }, gains.join(" · ")) : null),
      boutons: [{ texte: "Fermer" }, { texte: "Voir le village", classe: "principal", action: () => ouvrirVillage() }] });
  }, 1500);
}

// ---------- Branchement sur les îles ----------
extensions.update.push(update);
extensions.action.batiment = (a) => { if (V.bataille) return; Son.clic(); ficheBatiment(a.uid); };
extensions.action.vplace = (a) => construireIci(a);
extensions.cibleLibre = () => { const D = moteurIles(); const m = V.libres.find((x) => x.visible); return m ? m.getWorldPosition(new T.Vector3()).add(new T.Vector3(0, 0.8, 0)) : null; };
extensions.action.vlibre = (a) => { if (V.bataille) return; Son.clic(); construireSur(a.ile, a.place); };
// Toucher le sol près d'un emplacement libre ouvre aussi « Construire ici »
extensions.sol = (elx, p) => {
  if (V.bataille || !E() || !ouvert()) return false;
  const prises = new Set(vil().batiments.map((b) => b.place));
  let best = null, dm = 1.6;
  for (const q of places(elx)) { if (prises.has(q.id)) continue; const d = Math.hypot(q.x - p.x, q.z - p.z); if (d < dm) { dm = d; best = q; } }
  if (!best) return false;
  Son.clic(); construireSur(elx, best.id);
  return true;
};
extensions.action.ennemi = (a) => toucherEnnemi(a);
extensions.boutons.push(() => ouvert() && el("button", { class: "btn petit", style: { borderColor: "rgba(111,214,138,.55)", color: "#b8f0c8" }, onclick: () => { Son.clic(); ouvrirVillage(); } }, "Village"));
export function lancerVagueGuide() { V.vagueGuide = true; lancerBataille(null, false); }
export function lancerVagueTest(elx) { const v = vil(); const iles = [...new Set(v.batiments.map((b) => b.ile))]; lancerBataille(elx && iles.includes(elx) ? elx : iles[0], false); }

export const _places = (elx) => places(elx).length;

export { modele as modeleBatiment };
