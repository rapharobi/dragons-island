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
  const bonusFertile = E().fertilite && E().fertilite[b.ile] > t ? 1.5 : 1;
  b.stock = Math.min(max, (b.stock || 0) + ((t - (b.maj || t)) / H) * d.parHeure * b.niveau * bonusFertile);
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
    if (nids.some((n) => Math.hypot(n.x - x, n.z - z) < 2.1)) continue;
    if (ile.noeuds.some((n) => Math.hypot(n.objet.position.x - x, n.objet.position.z - z) < 1.3)) continue;
    if (ile.obstacles.some((o) => Math.hypot(o.x - x, o.z - z) < o.r + 0.7)) continue;
    if (ile.obstSource && Math.hypot(ile.obstSource.x - x, ile.obstSource.z - z) < ile.obstSource.r + 1.4) continue;
    if (l.some((p) => Math.hypot(p.x - x, p.z - z) < 2.6)) continue;
    l.push({ id: `${elx}-p${l.length}`, x, z, y });
  }
  PLACES[elx] = l;
  return l;
}

// ---------- Modèles 3D des bâtiments ----------
function modele(type, niveau, elx) {
  const g = new T.Group();
  const anims = [];
  const bois = mat(0x8a5a32, { r: 0.85 }), boisFonce = mat(0x5a3820, { r: 0.9 }), boisClair = mat(0xb08050, { r: 0.85 }), pierre = mat(0x8a8478, { r: 0.95 }), pierreFoncee = mat(0x6a645a, { r: 0.95 });
  const toit = mat(elx === "feu" ? 0x8a2a1a : elx === "glace" ? 0x3a5a9a : 0x2a7a6a, { r: 0.75 });
  const metal = mat(0xb8b8c0, { m: 0.7, r: 0.3 }), fenetreM = mat(0xffd27a, { e: 0xffb040, ei: 1.1 });
  const boite = (sx, sy, sz, m, x = 0, y = 0, z = 0, parent = g) => { const b = mesh(new T.BoxGeometry(sx, sy, sz), m); b.position.set(x, y + sy / 2, z); parent.add(b); return b; };
  const cyl = (r1, r2, h, m, x = 0, y = 0, z = 0, seg = 8, parent = g) => { const c = mesh(new T.CylinderGeometry(r1, r2, h, seg), m); c.position.set(x, y + h / 2, z); parent.add(c); return c; };
  const toitPrisme = (l, p, h, y, x = 0, z = 0) => { const t = mesh(new T.CylinderGeometry(0.001, p * 0.75, h, 4, 1).rotateY(Math.PI / 4).scale(l / (p * 1.06), 1, 1), toit); t.position.set(x, y + h / 2, z); g.add(t); return t; };
  const fenetre = (x, y, z, ry = 0) => { const f = mesh(new T.PlaneGeometry(0.18, 0.22), fenetreM, false); f.position.set(x, y, z); f.rotation.y = ry; g.add(f); return f; };
  // Fumée qui sort d'une cheminée, en boucle
  const fumee = (x, y, z) => {
    const puffs = [];
    for (let i = 0; i < 5; i++) { const p = new T.Mesh(new T.IcosahedronGeometry(0.12, 0), new T.MeshBasicMaterial({ color: 0xb8b0a8, transparent: true, opacity: 0.5, depthWrite: false })); g.add(p); puffs.push(p); }
    anims.push((t) => puffs.forEach((p, i) => { const k = (t * 0.35 + i / 5) % 1; p.position.set(x + Math.sin(t + i) * 0.08 * k, y + k * 1.3, z + k * 0.2); p.scale.setScalar(0.6 + k * 1.6); p.material.opacity = 0.45 * (1 - k); }));
  };
  if (type === "hotel") {
    boite(1.9, 0.35, 1.6, pierre);
    boite(1.5, 0.9, 1.25, bois, 0, 0.35);
    toitPrisme(1.8, 1.55, 0.8, 1.25);
    boite(0.3, 0.45, 0.05, boisFonce, 0, 0.35, 0.64);
    const mat2 = mesh(new T.CylinderGeometry(0.025, 0.025, 1.1, 5), boisFonce); mat2.position.set(0.6, 2.2, 0); g.add(mat2);
    const drapeau = mesh(new T.BoxGeometry(0.4, 0.25, 0.02), mat(0xf2b544, { r: 0.6, e: 0x5a3a00, ei: 0.3 })); drapeau.position.set(0.82, 2.6, 0); g.add(drapeau);
    anims.push((t) => { drapeau.rotation.y = Math.sin(t * 3) * 0.25; });
  } else if (type === "entrepot") {
    // Grange à étage, portes doubles, croisillons, poulie qui monte les caisses
    boite(1.9, 0.12, 1.4, pierreFoncee);
    boite(1.7, 1.15, 1.2, bois, 0, 0.12);
    toitPrisme(1.95, 1.4, 0.75, 1.27);
    for (const s of [-1, 1]) { const p = boite(0.36, 0.62, 0.04, boisFonce, s * 0.19, 0.12, 0.62); p.rotation.y = s * 0.15; }
    for (const s of [-1, 1]) { const c = mesh(new T.BoxGeometry(0.05, 0.85, 0.03), boisFonce); c.position.set(s * 0.55, 0.7, 0.61); c.rotation.z = s * 0.7; g.add(c); const c2 = c.clone(); c2.rotation.z = -s * 0.7; g.add(c2); }
    fenetre(0, 1.05, 0.61);
    const poutre = boite(0.08, 0.08, 0.6, boisFonce, 0, 1.45, 0.85);
    const corde = mesh(new T.CylinderGeometry(0.01, 0.01, 1, 3), mat(0x3a2a1a), false); g.add(corde);
    const caisse = boite(0.26, 0.26, 0.26, boisClair, 0, 0, 1.1);
    for (let i = 0; i < 4; i++) boite(0.3, 0.3, 0.3, i % 2 ? boisClair : bois, 1.05 + (i % 2) * 0.05, i > 1 ? 0.3 : 0, -0.3 + (i % 2) * 0.36);
    for (let i = 0; i < 3; i++) cyl(0.13, 0.13, 0.36, boisFonce, -1.05, 0, -0.35 + i * 0.3, 10);
    anims.push((t) => { const k = (Math.sin(t * 0.8) + 1) / 2; caisse.position.y = 0.13 + k * 1.15; corde.position.set(0, (1.45 + caisse.position.y + 0.13) / 2, 1.1); corde.scale.y = Math.max(0.05, 1.45 - caisse.position.y - 0.13); caisse.rotation.y = Math.sin(t * 1.6) * 0.2; });
    void poutre;
  } else if (type === "verger") {
    // Verger clos : arbres qui se balancent, fruits qui mûrissent, panier et épouvantail
    boite(2.2, 0.06, 1.8, mat(0x5a3a22, { r: 1 }));
    const fruit = elx === "glace" ? 0x7fd6ff : elx === "feu" ? 0xff4a1a : 0xd83a2a;
    const arbres = [];
    for (const [x, z] of [[-0.6, -0.45], [0.55, -0.4], [-0.55, 0.45], [0.6, 0.4]]) {
      const a = new T.Group(); a.position.set(x, 0, z); g.add(a);
      cyl(0.06, 0.09, 0.6, boisFonce, 0, 0.06, 0, 6, a);
      const f = mesh(new T.IcosahedronGeometry(0.36, 0), mat(elx === "glace" ? 0x4a8a6a : 0x3a9a3a, { r: 0.9 })); f.position.y = 0.88; a.add(f);
      const f2 = mesh(new T.IcosahedronGeometry(0.24, 0), mat(elx === "glace" ? 0x5a9a7a : 0x4aaa4a, { r: 0.9 })); f2.position.set(0.18, 1.08, 0.1); a.add(f2);
      const fruits = [];
      for (let k = 0; k < 5; k++) { const p = mesh(new T.SphereGeometry(0.06, 6, 4), mat(fruit, { r: 0.4, e: fruit, ei: 0.15 }), false); p.position.set(Math.cos(k * 1.3) * 0.3, 0.78 + (k % 3) * 0.12, Math.sin(k * 1.3) * 0.3); a.add(p); fruits.push(p); }
      arbres.push({ a, fruits, ph: x * 3 + z });
    }
    for (let i = 0; i < 12; i++) { const a = (i / 12) * 6.28; const p = mesh(new T.BoxGeometry(0.06, 0.32, 0.06), boisFonce); p.position.set(Math.cos(a) * 1.15, 0.16, Math.sin(a) * 0.95); g.add(p); }
    const panier = cyl(0.16, 0.12, 0.16, boisClair, 0.05, 0.06, 0.05, 10);
    for (let k = 0; k < 4; k++) { const p = mesh(new T.SphereGeometry(0.06, 6, 4), mat(fruit, { r: 0.4 }), false); p.position.set(0.02 + (k % 2) * 0.07, 0.24, 0.02 + Math.floor(k / 2) * 0.07); g.add(p); }
    const epou = new T.Group(); epou.position.set(-1.0, 0, 0.0); g.add(epou);
    cyl(0.03, 0.03, 0.8, boisFonce, 0, 0, 0, 5, epou); const bras = mesh(new T.BoxGeometry(0.5, 0.04, 0.04), boisFonce); bras.position.y = 0.6; epou.add(bras);
    const tete = mesh(new T.SphereGeometry(0.09, 6, 5), mat(0xe8c890)); tete.position.y = 0.86; epou.add(tete); const chap = mesh(new T.ConeGeometry(0.13, 0.14, 6), mat(0x6a4a2a)); chap.position.y = 0.97; epou.add(chap);
    anims.push((t) => { for (const a of arbres) { a.a.rotation.z = Math.sin(t * 1.2 + a.ph) * 0.04; a.fruits.forEach((p, k) => p.scale.setScalar(0.7 + ((t * 0.12 + k * 0.2 + a.ph) % 1) * 0.5)); } epou.rotation.y = Math.sin(t * 0.6) * 0.3; });
    void panier;
  } else if (type === "scierie") {
    // Atelier, grande scie circulaire, tapis où avance une bûche, sciure et fumée
    boite(1.5, 0.12, 1.3, pierreFoncee, -0.25, 0, -0.15);
    boite(1.3, 0.85, 1.1, bois, -0.25, 0.12, -0.15);
    toitPrisme(1.5, 1.25, 0.6, 0.97, -0.25, -0.15);
    fenetre(-0.25, 0.65, 0.41);
    cyl(0.09, 0.11, 0.6, pierreFoncee, -0.7, 1.2, -0.4, 6); fumee(-0.7, 1.85, -0.4);
    // Tapis et scie
    boite(0.5, 0.42, 1.9, boisFonce, 0.75, 0, 0);
    const lame = mesh(new T.CylinderGeometry(0.34, 0.34, 0.03, 16).rotateZ(Math.PI / 2), metal); lame.position.set(0.75, 0.6, 0.2); g.add(lame);
    for (let k = 0; k < 8; k++) { const d = mesh(new T.ConeGeometry(0.04, 0.08, 3), metal, false); d.position.set(0, Math.cos(k * 0.785) * 0.36, Math.sin(k * 0.785) * 0.36); d.rotation.x = k * 0.785; lame.add(d); }
    const buche = mesh(new T.CylinderGeometry(0.13, 0.13, 0.8, 8).rotateX(Math.PI / 2), mat(0x9a6a3a, { r: 0.9 })); buche.position.set(0.75, 0.55, 0); g.add(buche);
    const sciure = [];
    for (let i = 0; i < 6; i++) { const p = mesh(new T.TetrahedronGeometry(0.035, 0), mat(0xe0b878), false); g.add(p); sciure.push(p); }
    for (let i = 0; i < 5; i++) { const b = mesh(new T.BoxGeometry(0.9, 0.06, 0.18), boisClair); b.position.set(-0.3, 0.03 + i * 0.065, 0.75); g.add(b); }
    anims.push((t) => {
      lame.rotation.x = -t * 9;
      const k = (t * 0.25) % 1; buche.position.z = -0.9 + k * 1.4; buche.scale.z = k > 0.75 ? 1 - (k - 0.75) * 2 : 1;
      sciure.forEach((p, i) => { const u = (t * 1.6 + i / 6) % 1; p.position.set(0.75 + Math.sin(i * 2) * 0.25 * u, 0.6 + u * 0.4 - u * u * 0.6, 0.2 + u * 0.4); p.rotation.set(t * 5, i, 0); p.visible = k > 0.35 && k < 0.95; });
    });
  } else if (type === "carriere") {
    // Falaise de pierre, grue à godet, wagonnet sur rails, pioche qui frappe
    for (let i = 0; i < 7; i++) { const p = mesh(new T.DodecahedronGeometry(0.3 + (i % 3) * 0.12, 0), i % 2 ? pierre : pierreFoncee); p.position.set(-0.5 + Math.cos(i * 0.9) * 0.45, 0.25 + (i < 3 ? 0.35 : 0), -0.4 + Math.sin(i * 0.9) * 0.3); p.rotation.set(i, i * 2, 0); g.add(p); }
    // Rails et wagonnet
    for (const s of [-0.14, 0.14]) boite(1.9, 0.03, 0.04, metal, 0.15, 0, 0.6 + s);
    for (let i = 0; i < 8; i++) boite(0.06, 0.02, 0.4, boisFonce, -0.75 + i * 0.26, 0, 0.6);
    const wagon = new T.Group(); wagon.position.set(0, 0.08, 0.6); g.add(wagon);
    boite(0.42, 0.24, 0.32, metal, 0, 0.06, 0, wagon);
    for (let k = 0; k < 3; k++) { const p = mesh(new T.DodecahedronGeometry(0.08, 0), pierre); p.position.set((k - 1) * 0.11, 0.33, 0); wagon.add(p); }
    for (const [x, z] of [[-0.14, -0.16], [0.14, -0.16], [-0.14, 0.16], [0.14, 0.16]]) { const r = mesh(new T.CylinderGeometry(0.07, 0.07, 0.04, 8).rotateX(Math.PI / 2), boisFonce); r.position.set(x, 0.04, z); wagon.add(r); }
    // Grue à godet
    cyl(0.05, 0.06, 1.7, boisFonce, 0.85, 0, -0.45, 6);
    const bras = new T.Group(); bras.position.set(0.85, 1.7, -0.45); g.add(bras);
    const fl = mesh(new T.BoxGeometry(1.2, 0.06, 0.06), boisFonce); fl.position.x = -0.45; bras.add(fl);
    const godet = mesh(new T.BoxGeometry(0.22, 0.16, 0.22), metal); bras.add(godet);
    const cable = mesh(new T.CylinderGeometry(0.008, 0.008, 1, 3), mat(0x222222), false); bras.add(cable);
    // Pioche
    const pioche = new T.Group(); pioche.position.set(-0.1, 0.35, 0.05); g.add(pioche);
    const manche = mesh(new T.CylinderGeometry(0.02, 0.02, 0.55, 4), boisFonce); manche.position.y = 0.27; pioche.add(manche);
    const fer = mesh(new T.BoxGeometry(0.32, 0.04, 0.04), metal); fer.position.y = 0.55; pioche.add(fer);
    anims.push((t) => {
      wagon.position.x = Math.sin(t * 0.6) * 0.65;
      bras.rotation.y = Math.sin(t * 0.4) * 0.9;
      const h = 0.7 + Math.sin(t * 1.2) * 0.45; godet.position.set(-0.95, -h, 0); cable.position.set(-0.95, -h / 2, 0); cable.scale.y = h;
      pioche.rotation.z = -0.4 - Math.abs(Math.sin(t * 3)) * 0.9;
    });
  } else {
    // Tour de défense : socle, fût avec meurtrières, escalier en spirale, cœur élémentaire et anneaux
    const tr = BATIMENTS[type].tour;
    cyl(0.75, 0.85, 0.3, pierreFoncee, 0, 0, 0, 8);
    const fut = cyl(0.48, 0.62, 2.1, pierre, 0, 0.3, 0, 8);
    for (let i = 0; i < 10; i++) { const a = (i / 10) * 6.28 * 1.5; boite(0.22, 0.05, 0.12, pierreFoncee, Math.cos(a) * 0.6, 0.4 + i * 0.18, Math.sin(a) * 0.6).rotation.y = -a; }
    for (let i = 0; i < 4; i++) { const a = (i / 4) * 6.28; const m = mesh(new T.PlaneGeometry(0.08, 0.26), fenetreM, false); m.position.set(Math.cos(a) * 0.56, 1.5, Math.sin(a) * 0.56); m.rotation.y = -a + Math.PI / 2; g.add(m); }
    cyl(0.72, 0.6, 0.28, pierreFoncee, 0, 2.4, 0, 8);
    for (let i = 0; i < 8; i++) { const a = (i / 8) * 6.28; boite(0.18, 0.22, 0.18, pierre, Math.cos(a) * 0.62, 2.68, Math.sin(a) * 0.62); }
    const coeur = mesh(type === "tourGivre" ? new T.OctahedronGeometry(0.32, 0).scale(1, 1.6, 1) : new T.IcosahedronGeometry(0.3, 0), mat(tr.couleur, { e: tr.couleur, ei: 1.2, r: 0.2, m: 0.2 }));
    coeur.position.y = 3.2; g.add(coeur);
    const anneaux = [0, 1].map((i) => { const a = mesh(new T.TorusGeometry(0.5 + i * 0.12, 0.025, 5, 28), mat(tr.couleur, { e: tr.couleur, ei: 0.8 }), false); a.position.y = 3.2; g.add(a); return a; });
    const l = new T.PointLight(tr.couleur, 1, 4.5); l.position.y = 3.2; g.add(l);
    g.userData.coeur = coeur;
    // Détails propres à chaque élément
    const detail = [];
    if (type === "tourLave") for (let i = 0; i < 4; i++) { const d = mesh(new T.SphereGeometry(0.05, 5, 4), mat(0xff5a0a, { e: 0xff5a0a, ei: 1.5 }), false); g.add(d); detail.push(d); }
    if (type === "tourGivre") for (let i = 0; i < 6; i++) { const s = mesh(new T.ConeGeometry(0.07, 0.4, 4), mat(0xcff4ff, { e: 0x7fd6ff, ei: 0.4 })); const a = (i / 6) * 6.28; s.position.set(Math.cos(a) * 0.78, 0.45, Math.sin(a) * 0.78); s.rotation.set(Math.sin(a) * 0.4, 0, -Math.cos(a) * 0.4); g.add(s); }
    if (type === "tourEau") for (let i = 0; i < 3; i++) { const j = mesh(new T.ConeGeometry(0.06, 0.5, 6), new T.MeshBasicMaterial({ color: 0x7fe0ff, transparent: true, opacity: 0.7 }), false); const a = (i / 3) * 6.28; j.position.set(Math.cos(a) * 0.62, 2.9, Math.sin(a) * 0.62); g.add(j); detail.push(j); }
    anims.push((t) => {
      coeur.rotation.y = t * 1.5; coeur.position.y = 3.2 + Math.sin(t * 2) * 0.08; l.intensity = 0.9 + Math.sin(t * 4) * 0.3;
      anneaux[0].rotation.set(t * 1.1, t * 0.4, 0); anneaux[1].rotation.set(-t * 0.7, 0, t * 0.9);
      if (type === "tourLave") detail.forEach((d, i) => { const k = (t * 0.6 + i / 4) % 1; const a = i * 1.57; d.position.set(Math.cos(a) * 0.55, 2.6 - k * 2.2, Math.sin(a) * 0.55); });
      if (type === "tourEau") detail.forEach((j, i) => { j.scale.y = 0.6 + Math.abs(Math.sin(t * 3 + i)) * 0.8; });
    });
  }
  // Fanions : un par niveau
  for (let i = 1; i < niveau; i++) { const f = mesh(new T.ConeGeometry(0.07, 0.16, 3).rotateZ(-Math.PI / 2), mat(0xf2b544, { r: 0.6 }), false); f.position.set(-0.7 + i * 0.18, 0.08, 0.85); g.add(f); }
  if (anims.length) g.userData.anim = (t) => { for (const a of anims) a(t); };
  g.scale.setScalar(1.05 + niveau * 0.07);
  return g;
}

// ---------- État 3D ----------
const V = { cle: null, objets: new Map(), marqueurs: [], libres: [], bataille: null, t: 0, panneau: null, ile: "feu" };
function synchro() {
  const D = moteurIles();
  if (!D || !E()) return;
  const cle = vil().batiments.map((b) => `${b.uid}:${b.niveau}:${b.place}:${b.pos ? b.pos.x.toFixed(2) + "," + b.pos.z.toFixed(2) : ""}`).join("|");
  if (cle === V.cle) return;
  V.cle = cle;
  const vus = new Set();
  for (const b of vil().batiments) {
    vus.add(b.uid);
    const ancien = V.objets.get(b.uid);
    if (ancien && ancien.niveau === b.niveau && ancien.pos === (b.pos ? b.pos.x + "," + b.pos.z : "")) continue;
    if (ancien) ancien.g.parent && ancien.g.parent.remove(ancien.g);
    const p = b.pos ? { x: b.pos.x, y: solIle(b.ile, b.pos.x, b.pos.z), z: b.pos.z } : places(b.ile).find((x) => x.id === b.place);
    if (!p) continue;
    const g = modele(b.type, b.niveau, b.ile);
    g.position.set(p.x, p.y, p.z);
    g.rotation.y = Math.atan2(-p.x, -p.z);
    g.userData.action = { type: "batiment", uid: b.uid };
    // Zone de toucher généreuse
    const zone = new T.Mesh(new T.CylinderGeometry(1, 1, 2, 8), new T.MeshBasicMaterial({ visible: false })); zone.position.y = 1; g.add(zone);
    // Icône flottante quand une ferme a de quoi récolter
    if (BATIMENTS[b.type].produit) {
      // Une grosse icône flottante (pastille dorée + la ressource) : la toucher vide toutes les fermes d'un coup
      const bulle = new T.Group(); bulle.position.y = 2.6; bulle.visible = false;
      const disque = new T.Mesh(new T.CylinderGeometry(0.42, 0.42, 0.08, 20).rotateX(Math.PI / 2), mat(0xf2b544, { e: 0xa86a10, ei: 0.6, m: 0.4, r: 0.35 }), false); bulle.add(disque);
      const anneau = new T.Mesh(new T.TorusGeometry(0.42, 0.05, 6, 24), mat(0xfff0c0, { e: 0xffd27a, ei: 0.8 }), false); bulle.add(anneau);
      const res = new T.Mesh(BATIMENTS[b.type].produit === "pierres" ? new T.DodecahedronGeometry(0.2, 0) : BATIMENTS[b.type].produit === "brindilles" ? new T.CylinderGeometry(0.06, 0.06, 0.42, 6).rotateZ(0.8) : new T.SphereGeometry(0.19, 10, 8),
        mat({ rations: 0xd8462a, brindilles: 0x9a6a3a, pierres: 0xb8b8c0 }[BATIMENTS[b.type].produit], { r: 0.6 }), false);
      res.position.z = 0.12; bulle.add(res);
      const zoneB = new T.Mesh(new T.SphereGeometry(0.7, 8, 6), new T.MeshBasicMaterial({ visible: false })); bulle.add(zoneB);
      bulle.userData.action = { type: "recolteTout" };
      g.add(bulle); g.userData.bulle = bulle;
    }
    moteurIles().iles[b.ile].groupe.add(g);
    V.objets.set(b.uid, { g, niveau: b.niveau, b, pos: b.pos ? b.pos.x + "," + b.pos.z : "" });
  }
  for (const [uid, o] of V.objets) if (!vus.has(uid)) { o.g.parent && o.g.parent.remove(o.g); V.objets.delete(uid); }
  // Cercles dorés sur les emplacements libres : on les touche pour construire
  for (const m of V.libres) m.parent && m.parent.remove(m);
  V.libres = [];
  const prises = new Set(vil().batiments.map((b) => b.place));
  const posees = vil().batiments.filter((b) => b.pos);
  for (const elx of ["feu", "glace", "eau"]) for (const p of places(elx)) {
    if (prises.has(p.id)) continue;
    if (posees.some((b) => b.ile === elx && Math.hypot(b.pos.x - p.x, b.pos.z - p.z) < 1.8)) continue;
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
  garderBandeau();
  synchro();
  for (const [, o] of V.objets) {
    if (o.g.userData.anim) o.g.userData.anim(V.t);
    if (o.g.userData.bulle) { const bl = o.g.userData.bulle; bl.position.y = 2.6 + Math.sin(V.t * 2.5) * 0.12; const cam = moteurIles() && moteurIles().camera; if (cam) bl.quaternion.copy(o.g.getWorldQuaternion(new T.Quaternion()).invert().multiply(cam.quaternion)); }
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
.vl-bandeau { position: fixed; z-index: 22; top: calc(var(--hud) + var(--tuto, 0px) + 6px); left: 50%; transform: translateX(-50%); padding: 8px 14px; display: flex; flex-wrap: wrap; justify-content: center; gap: 4px 10px; align-items: center; font-size: 13px; width: max-content; max-width: calc(100vw - 24px); }
.vl-bandeau > * { white-space: nowrap; }
body.en-bataille .iles-choix, body.en-bataille .fiche-ile, body.en-bataille .vl-p { display: none !important; }
.vl-bandeau b { font-family: var(--titre); color: #ff9a7a; }
.vl-fin { display: grid; gap: 8px; }
`);
const hudLigne = (on) => { document.body.classList.toggle("hud-ligne", on); window.__jeu && window.__jeu.majHauteurHud && window.__jeu.majHauteurHud(); };
function fermerPanneau() { if (V.panneau) { V.panneau.remove(); V.panneau = null; hudLigne(false); } }
function panneau(titre, sous, ...contenu) {
  fermerFiche(); fermerPanneau(); arreterPlacement();
  const p = el("section", { class: "vl-p panneau" },
    el("header", {}, el("div", {}, el("div", { class: "etiquette" }, sous), el("h3", {}, titre)), el("button", { class: "fermer-fiche", "aria-label": "Fermer", onclick: () => fermerPanneau(), html: icone("fermer").innerHTML })),
    ...contenu);
  document.getElementById("ecran").append(p);
  V.panneau = p;
  hudLigne(true);
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
  contenu.push(el("button", { class: "btn petit", onclick: () => { fermerPanneau(); amenager(true); } }, "🛠️ Aménager : déplacer mes bâtiments et mes tours"));
  panneau(`Village · ${NOM_ILE[elx]}`, `${sur.length} bâtiment${sur.length > 1 ? "s" : ""} sur cette île`, ...contenu, el("div", { class: "etiquette" }, "Construire"), liste);
}
const duree = (ms) => { const m = Math.max(0, Math.round(ms / 60000)); return m >= 60 ? `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, "0")}` : `${m} min`; };

// ---------- Aménager : glisser ses bâtiments sur l'île pour organiser sa défense ----------
let drag = null;
function amenager(on) {
  V.amenager = on;
  document.getElementById("vl-amenager")?.remove();
  if (!on) return;
  document.getElementById("ecran").append(el("div", { id: "vl-amenager", class: "bandeau-placement panneau" },
    el("span", {}, "🛠️ Glisse un bâtiment pour le déplacer sur son île."), el("button", { class: "btn principal petit", onclick: () => { Son.ok(); amenager(false); } }, "Terminé")));
  toast("Mode aménagement : glisse tes bâtiments.", "bon");
}
function sourisVersIle(e, elx) {
  const D = moteurIles(), ray = new T.Raycaster();
  ray.setFromCamera(new T.Vector2((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1), D.camera);
  const h = ray.intersectObject(D.iles[elx].groupe, true).find((x) => !x.object.userData.action || x.object === D.iles[elx].groupe);
  const h2 = h || ray.intersectObject(D.iles[elx].groupe, true)[0];
  return h2 ? D.iles[elx].groupe.worldToLocal(h2.point.clone()) : null;
}
function emplacementValide(b, x, z) {
  const elx = b.ile, y = solIle(elx, x, z);
  if (Math.hypot(x, z) > rayonBord(elx, Math.atan2(z, x)) * 0.86) return false;
  if (elx === "eau" ? y < 0.1 || dansLEau(elx, x, z) : elx === "glace" ? y > 2.4 : false) return false;
  if (emplacements(elx).some((n) => Math.hypot(n.x - x, n.z - z) < 1.7)) return false;
  for (const o of vil().batiments) {
    if (o.uid === b.uid || o.ile !== elx) continue;
    const p = o.pos || places(elx).find((q) => q.id === o.place);
    if (p && Math.hypot(p.x - x, p.z - z) < 1.9) return false;
  }
  return true;
}
function installerAmenagement() {
  const canvas = document.getElementById("scene3d");
  canvas.addEventListener("pointerdown", (e) => {
    const D = moteurIles();
    if (!V.amenager || !D || !window.__jeu || window.__jeu.ecran !== "iles" || window.__jeu.moteur.decor !== D) return;
    const ray = new T.Raycaster();
    ray.setFromCamera(new T.Vector2((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1), D.camera);
    const objets = [...V.objets.values()];
    const h = ray.intersectObjects(objets.map((o) => o.g), true)[0];
    if (!h) return;
    let g = h.object; while (g && !(g.userData.action && g.userData.action.type === "batiment")) g = g.parent;
    const o = g && objets.find((x) => x.g === g);
    if (!o) return;
    D.orbite.actif = false;
    drag = { o, depart: g.position.clone(), ok: true };
    g.position.y += 0.4; Son.clic();
  });
  canvas.addEventListener("pointermove", (e) => {
    if (!drag) return;
    const p = sourisVersIle(e, drag.o.b.ile);
    if (!p) return;
    drag.ok = emplacementValide(drag.o.b, p.x, p.z);
    drag.o.g.position.set(p.x, solIle(drag.o.b.ile, p.x, p.z) + 0.4, p.z);
    drag.o.g.traverse((m) => { if (m.isMesh && m.material && m.material.emissive && !m.userData.emi0) m.userData.emi0 = m.material.emissive.getHex(); });
    drag.o.g.scale.setScalar(drag.ok ? 1.05 : 0.95);
  });
  const lacher = () => {
    if (!drag) return;
    const D = moteurIles(); if (D) D.orbite.actif = true;
    const { o, depart, ok } = drag; drag = null;
    const g = o.g;
    if (ok && g.position.distanceTo(depart) > 0.3) {
      const x = g.position.x, z = g.position.z;
      changer(() => { const b = vil().batiments.find((q) => q.uid === o.b.uid); if (b) b.pos = { x, z }; });
      Son.recolte("pierre"); g.position.y = solIle(o.b.ile, x, z); g.scale.setScalar(1);
      o.pos = x + "," + z; V.cle = null;
    } else { if (!ok) toast("Impossible ici : trop près d'un nid ou d'un autre bâtiment.", "mal"); g.position.copy(depart); g.scale.setScalar(1); }
  };
  canvas.addEventListener("pointerup", lacher); canvas.addEventListener("pointercancel", lacher);
}
installerAmenagement();
export { amenager };

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
// Vider toutes les fermes d'un coup (en touchant l'icône au-dessus de n'importe laquelle)
function recolterTout() {
  const total = {};
  changer((s) => { for (const b of s.village.batiments) { const d = BATIMENTS[b.type]; if (!d.produit) continue; majProduction(b); const n = Math.floor(b.stock); if (n < 1) continue; s.ressources[d.produit] = (s.ressources[d.produit] || 0) + n; b.stock -= n; total[d.produit] = (total[d.produit] || 0) + n; } });
  const l = Object.entries(total);
  if (!l.length) return;
  Son.recolte("bois"); setTimeout(() => Son.recolte("pierre"), 120);
  for (const [, o] of V.objets) if (o.g.userData.bulle && o.g.userData.bulle.visible) { particule(o.g.parent, o.g.position.clone().add(new T.Vector3(0, 2.6, 0)), 0xf2b544, new T.Vector3(0, 2, 0), { vie: 0.8, taille: 1.4, e: true }); o.g.userData.bulle.visible = false; }
  toast(l.map(([k, n]) => `+${n} ${MATERIAUX[k].nom.toLowerCase()}`).join(" · "), "bon");
}
extensions.action.recolteTout = () => { if (V.bataille || V.amenager) return; recolterTout(); };
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
  Son.evolution(); toast(`${BATIMENTS[b.type].nom} niveau ${b.niveau} !`, "bon"); signaler("ameliore", b.type);
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
    toast(`Des pillards approchent de l'${NOM_ILE[cible]} ! Touche « Défendre » ou l'île Mère dans la cour du couvoir.`, "mal");
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
  // Pendant l'attaque : ressources en ligne en haut, bandeau juste dessous, boutons des îles cachés
  garderBandeau();
  if (!auto) toast("Touche les pillards : ta tablette les frappe, et tes dragons foncent dessus.", "bon");
}
// Le bandeau suit la bataille : recréé si l'écran a été reconstruit, retiré dès qu'elle est finie ou qu'on quitte les îles
function garderBandeau() {
  const enCours = !!(V.bataille && !V.bataille.fini) && (!window.__jeu || window.__jeu.ecran === "iles");
  const b = document.getElementById("vl-bandeau");
  if (enCours && !b) {
    document.body.classList.add("hud-ligne", "en-bataille");
    document.getElementById("ecran").append(el("div", { class: "vl-bandeau panneau", id: "vl-bandeau" }));
    majBandeau();
    window.__jeu && window.__jeu.majHauteurHud && window.__jeu.majHauteurHud();
  } else if (!enCours && document.body.classList.contains("en-bataille")) {
    if (b) b.remove();
    document.body.classList.remove("hud-ligne", "en-bataille");
    window.__jeu && window.__jeu.majHauteurHud && window.__jeu.majHauteurHud();
  }
}
window.addEventListener("hashchange", () => setTimeout(garderBandeau, 0));
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
    garderBandeau();
    modale({ titre: victoire ? `Vague ${n} repoussée !` : `Les pillards ont gagné`, contenu: el("div", { class: "vl-fin" },
      el("p", { style: { margin: 0 } }, victoire ? "Tes tours et tes dragons ont protégé le village." : `Ils ont atteint le couvoir et pillé les fermes${protection() ? `, mais tes entrepôts ont protégé ${Math.round(protection() * 100)} % de tes réserves` : ""}. Construis des tours et améliore-les !`),
      gains.length ? el("p", { class: "doux", style: { margin: 0 } }, gains.join(" · ")) : null),
      boutons: [{ texte: "Fermer" }, { texte: "Voir le village", classe: "principal", action: () => ouvrirVillage() }] });
  }, 1500);
}

// ---------- Branchement sur les îles ----------
extensions.update.push(update);
extensions.action.batiment = (a) => { if (V.bataille || V.amenager) return; Son.clic(); ficheBatiment(a.uid); };
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
// Le village s'ouvre depuis l'atelier « Hôtel de ville » de la cour du couvoir (couvoir3d.js)
export const villageOuvert = () => ouvert();
// Quand des pillards attendent, un bouton « Défendre » apparaît en haut
extensions.boutons.push(() => ouvert() && vil().vague.enAttente && !V.bataille && el("button", { class: "btn petit", style: { borderColor: "rgba(255,120,90,.7)", color: "#ffb8a8" }, onclick: () => { Son.clic(); ouvrirVillage(vil().vague.enAttente); } }, "⚔️ Défendre"));
export function lancerVagueGuide() { V.vagueGuide = true; lancerBataille(null, false); }
export function lancerVagueTest(elx) { const v = vil(); const iles = [...new Set(v.batiments.map((b) => b.ile))]; lancerBataille(elx && iles.includes(elx) ? elx : iles[0], false); }

export const _places = (elx) => places(elx).length;

export { modele as modeleBatiment };
