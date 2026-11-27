// Attaquer un village : un village ennemi construit comme le tien — trois îles élémentaires autour d'une
// quatrième, celle du couvoir. On trouve un adversaire de son niveau (un mage IA en attendant les vrais joueurs),
// puis on pose ses dragons où l'on veut. Sur une île que son élément domine (Feu sur Glace…), un dragon frappe
// +40 % et les défenseurs y sont plus faibles contre lui. Les dragons ennemis défendent ; ceux qui volent se
// battent en vol. Étoiles : la moitié du village détruite, le couvoir détruit, tout le village détruit.
import { E, changer, noter } from "./etat.js";
import { PAR_ID, DRAGONS, ELEMENTS, pvMax, stadeEffectif, stadeDuNiveau, habitatDe } from "./regles.js";
import { construireIleEnnemie, construireForteresse, construireCouvoir, construireCentre, pont, sapin, palmier, arbreMort, arbreRond, RAYON_CENTRE } from "./monde.js";
import { ciel, eclairage, Orbite, versEcran } from "./scene.js";
import { construireDragon } from "./modele.js";
import { Animateur } from "./anim.js";
import { mat, mesh, rng } from "./outils3d.js";
import { BATIMENTS, modeleBatiment } from "./village.js";
import { el, styles, toast, modale, fermerModale } from "./ui.js";
import { Son, Musique } from "./son.js";
import { adversaire } from "./ligues.js";

const T = window.THREE;
let A = null, ctxJeu = null;
const etroit = () => window.innerWidth / window.innerHeight < 0.8;
const ELS = ["feu", "glace", "eau"];
const ANGLES = { feu: -Math.PI / 2, glace: (150 * Math.PI) / 180, eau: (30 * Math.PI) / 180 };
const DIST = 15.5, R_ILE = 7.4, DUREE = 150;
const COUL = { feu: 0xff7a2a, glace: 0x9fe8ff, eau: 0x48c8e0 };
const domine = (a, b) => ELEMENTS[a].bat.includes(b);

styles("attaque", `
.at-bandeau { position: fixed; z-index: 18; top: calc(var(--haut) + 8px); left: 50%; transform: translateX(-50%); padding: 7px 12px; display: flex; gap: 8px 12px; align-items: center; flex-wrap: wrap; justify-content: center; font-size: 13px; width: max-content; max-width: calc(100vw - 20px); }
.at-bandeau b { font-family: var(--titre); color: #ffb08a; }
.at-bandeau .pct { font: 700 15px var(--mono); color: var(--ambre); }
.at-bandeau .et { color: var(--ambre); letter-spacing: 2px; }
.at-plateau { position: fixed; z-index: 18; left: 50%; transform: translateX(-50%); bottom: calc(var(--bas) + 10px); width: min(640px, calc(100vw - 20px)); padding: 8px; display: grid; gap: 6px; }
.at-plateau .aide { font-size: 12px; color: var(--doux); text-align: center; }
.at-cartes { display: flex; gap: 6px; overflow-x: auto; scrollbar-width: none; }
.at-carte { flex: 0 0 84px; display: grid; gap: 2px; justify-items: center; padding: 7px 4px; border-radius: 12px; border: 1px solid var(--trait); background: rgba(255,255,255,.05); color: var(--texte); border-bottom: 3px solid var(--el); font-size: 11px; position: relative; }
.at-carte b { font-family: var(--titre); font-size: 12px; }
.at-carte.choisi { border-color: var(--ambre); background: rgba(242,181,68,.16); transform: translateY(-4px); box-shadow: 0 8px 18px rgba(242,181,68,.25); }
.at-carte.pose { opacity: .35; }
.at-carte .vol { position: absolute; top: 3px; right: 5px; font-size: 11px; }
.at-iles { position: fixed; inset: 0; pointer-events: none; z-index: 17; }
.at-ile { position: absolute; transform: translate(-50%, -50%); padding: 4px 9px; border-radius: 999px; font: 600 11px var(--mono); background: rgba(14,12,24,.8); border: 1px solid var(--trait); white-space: nowrap; }
.at-ile.bon { border-color: #6fd68a; color: #b8f0c8; box-shadow: 0 0 14px rgba(111,214,138,.4); }
.at-ile.mal { border-color: #ff8a8a; color: #ffc8c8; }
.at-etoiles { font-size: 34px; letter-spacing: 6px; text-align: center; color: var(--ambre); }
.at-trouve { display: grid; gap: 8px; text-align: center; }
.at-trouve .nom { font-family: var(--titre); font-size: 22px; color: var(--ambre); }
.at-trouve .infos { display: flex; gap: 8px; justify-content: center; flex-wrap: wrap; font-size: 12px; }
.at-trouve .infos span { padding: 3px 8px; border-radius: 8px; background: rgba(255,255,255,.06); }
`);

// Niveau du village adverse : à ton niveau (couvoir et dragons), un peu plus fort avec tes victoires
export function niveauVillage() {
  const e = E();
  const moy = e.dragons.length ? e.dragons.reduce((s, d) => s + d.niveau, 0) / e.dragons.length : 1;
  const v = (e.attaques && e.attaques.victoires) || 0;
  return Math.max(1, Math.min(10, Math.round(e.oeufs.couvoir.niveau + 1 + moy / 4 + Math.min(2, v / 4) - 0.5)));
}

// ---------- Barres de vie ----------
function barre3D(l) {
  const g = new T.Group(), geo = new T.PlaneGeometry(1, 0.1);
  const fond = new T.Mesh(geo, new T.MeshBasicMaterial({ color: 0x1a1010, transparent: true, opacity: 0.8, depthTest: false }));
  const plein = new T.Mesh(geo, new T.MeshBasicMaterial({ color: 0x6fd68a, depthTest: false }));
  fond.scale.x = plein.scale.x = l; plein.position.z = 0.001; fond.renderOrder = 10; plein.renderOrder = 11;
  g.add(fond, plein); g.userData = { plein, l };
  return g;
}
function regler(b, k, cam, ennemi) { const p = b.userData.plein; k = Math.max(0, k); p.scale.x = Math.max(0.001, k) * b.userData.l; p.position.x = -(1 - k) * b.userData.l / 2; p.material.color.setHex(ennemi ? (k > 0.5 ? 0xff7a5a : 0xff3a3a) : k > 0.5 ? 0x6fd68a : k > 0.25 ? 0xf2b544 : 0xff5a4a); b.quaternion.copy(cam.quaternion); }

// ---------- Le village ennemi ----------
function centreIle(elx) { const a = ANGLES[elx]; return new T.Vector3(Math.cos(a) * DIST, 0, Math.sin(a) * DIST); }
function decorIle(g, elx, r) {
  const fab = elx === "feu" ? () => arbreMort(r) : elx === "glace" ? () => sapin(r, true) : () => (r() < 0.6 ? palmier(r) : arbreRond(r, 0x3a8a4a));
  for (let k = 0; k < 7; k++) { const a = r() * 6.28, d = R_ILE * (0.72 + r() * 0.2); const t = fab(); t.position.set(Math.cos(a) * d, 0, Math.sin(a) * d); g.add(t); }
}
function construireVillage(n, moy) {
  const scene = new T.Scene();
  scene.fog = new T.Fog(0x241e36, 50, 140);
  scene.add(ciel(0x0a0c20, 0x4a3050, 0x140e1a, 220));
  const lum = eclairage(scene, { ciel: 0xb8c8f0, sol: 0x3a2838, hemi: 0.75, soleil: 0xffd8b8, force: 1.3, zoneOmbre: 26, carte: 2048, x: 12, y: 22, z: 8 });
  const camera = new T.PerspectiveCamera(etroit() ? 55 : 44, 1, 0.1, 400);
  const orbite = new Orbite(camera, document.getElementById("scene3d"));
  orbite.min = 8; orbite.max = 95; orbite.phiMax = 1.3; orbite.deplacement = true;
  orbite.limite = { centre: new T.Vector3(0, 0, 0), rayon: 30 };
  const r = rng(n * 97 + 13);
  // Le rocher du couvoir et sa forteresse
  const centre = construireCentre(); scene.add(centre.groupe);
  const nivC = Math.min(4, Math.floor(n / 2));
  const fort = construireForteresse(nivC); scene.add(fort);
  const autel = construireCouvoir(nivC); scene.add(autel);
  const iles = {};
  for (const elx of ELS) {
    const g = new T.Group(); g.position.copy(centreIle(elx)); scene.add(g);
    g.add(construireIleEnnemie(elx, R_ILE, 300 + n * 7 + elx.length));
    decorIle(g, elx, r);
    // Pont jusqu'au rocher central
    const dir = centreIle(elx).normalize();
    const a = dir.clone().multiplyScalar(RAYON_CENTRE - 0.3).setY(-0.05), b = dir.clone().multiplyScalar(DIST - R_ILE + 0.5).setY(-0.05);
    scene.add(pont(a, b));
    iles[elx] = { g, elx, c: centreIle(elx), bout: b.clone().setY(0), porte: a.clone().setY(0) };
  }
  // Bâtiments : tours, fermes, entrepôts, répartis sur les trois îles
  const bats = [];
  const tours = { feu: "tourLave", glace: "tourGivre", eau: "tourEau" };
  const prod = ["scierie", "carriere", "verger"];
  ELS.forEach((elx, k) => {
    const types = [];
    for (let i = 0; i < Math.min(2, Math.ceil(n / 3)); i++) types.push(tours[elx]);
    types.push(prod[k]);
    if (n >= 3) types.push(prod[(k + 1) % 3]);
    if (n >= 2 && k === 0) types.push("entrepot");
    if (n >= 5) types.push("entrepot");
    types.forEach((type, i) => {
      const a = (i / types.length) * Math.PI * 2 + r() * 0.5, d = 2.4 + r() * 2.6;
      const nv = Math.max(1, Math.min(5, Math.ceil(n / 2) + (r() < 0.3 ? 1 : 0)));
      const g = modeleBatiment(type, nv, elx);
      const w = iles[elx].c.clone().add(new T.Vector3(Math.cos(a) * d, 0, Math.sin(a) * d));
      g.position.copy(w); g.rotation.y = r() * 6;
      const zone = new T.Mesh(new T.CylinderGeometry(1.1, 1.1, 2.4, 8), new T.MeshBasicMaterial({ visible: false })); zone.position.y = 1; g.add(zone);
      g.userData.cible = bats.length;
      const b3 = barre3D(1.2); b3.position.y = 2.8; g.add(b3);
      scene.add(g);
      const pv = BATIMENTS[type].pv * (1 + 0.3 * (nv - 1)) * 1.3;
      bats.push({ type, nv, g, pv, max: pv, barre: b3, recharge: r(), w, ile: elx, element: elx, chute: 0 });
    });
  });
  const pvC = 900 + 320 * n;
  const bc = barre3D(3); bc.position.y = 5.2; fort.add(bc);
  fort.traverse((o) => { o.userData.cible = "couvoir"; });
  const couvoir = { type: "couvoir", g: fort, pv: pvC, max: pvC, barre: bc, w: new T.Vector3(0, 0, 0), ile: "centre", element: null, tourelles: (fort.userData.tourelles || []).map((c) => ({ c, recharge: Math.random() })) };
  return { scene, camera, orbite, lum, iles, bats, couvoir, fort, autel, parts: [], tirs: [], unites: [], defenseurs: [], t: 0, n, moy, secousse: 0 };
}

// ---------- Dragons (les tiens et les défenseurs) ----------
function creerUnite(id, niveau, camp, opts = {}) {
  const stade = opts.stade ?? stadeDuNiveau(niveau);
  const rig = construireDragon(id, stade, { ul: opts.ul });
  const taille = Math.max(rig.taille.x, rig.taille.z);
  const ech = Math.min(1.3, 2.3 / taille);
  rig.racine.scale.setScalar(ech);
  const m = new T.Group(); m.add(rig.racine);
  const haut = rig.taille.y * ech;
  const b3 = barre3D(1); b3.position.y = haut + 0.45; m.add(b3);
  A.scene.add(m);
  const anim = new Animateur(rig);
  const vol = rig.ailes && rig.ailes.length > 0 && stade >= 1 && habitatDe(id) !== "fond";
  const d = opts.d || { id, niveau, nid: 2, armure: null };
  const pv = Math.round(pvMax(d) * (camp === "moi" ? 2.2 : 1.9));
  return { id, camp, d: opts.d, niveau, element: PAR_ID[id].element, nom: PAR_ID[id].nom, m, rig, anim, pv, max: pv, barre: b3, taille: taille * ech, haut, vol, alt: vol ? 2.4 + Math.random() * 0.8 : 0,
    recharge: 0.4 + Math.random() * 0.6, lent: 0, cible: null, chemin: [], vitesse: (vol ? 2.7 : 1.9) * (camp === "moi" ? 1 : 0.9), garde: opts.garde ? opts.garde.clone() : null, ph: Math.random() * 6 };
}
function placerDefenseurs() {
  const nb = Math.min(3, 1 + Math.floor(A.n / 3));
  for (const elx of ELS) {
    const especes = DRAGONS.filter((x) => x.element === elx);
    for (let k = 0; k < nb; k++) {
      const sp = especes[(k * 3 + A.n) % especes.length];
      const niv = Math.max(1, Math.round(A.moy - 1 + (Math.random() - 0.5) * 2));
      const a = (k / nb) * Math.PI * 2 + 0.7, garde = A.iles[elx].c.clone().add(new T.Vector3(Math.cos(a) * 3.2, 0, Math.sin(a) * 3.2));
      const u = creerUnite(sp.id, niv, "eux", { garde });
      u.m.position.copy(garde); u.m.position.y = u.alt;
      u.anim.jouer(u.vol ? "vol" : "repos");
      A.defenseurs.push(u);
    }
  }
}

// ---------- Déplacements : îles, ponts et rocher central ----------
function zoneDe(p) {
  if (Math.hypot(p.x, p.z) < RAYON_CENTRE + 0.6) return "centre";
  let best = "feu", dm = 1e9;
  for (const elx of ELS) { const d = Math.hypot(p.x - A.iles[elx].c.x, p.z - A.iles[elx].c.z); if (d < dm) { dm = d; best = elx; } }
  return dm < R_ILE + 0.8 ? best : "pont:" + best;
}
// Chemin au sol d'un point à un autre en passant par les ponts (les dragons volants vont tout droit)
function chemin(depuis, vers) {
  const za = zoneDe(depuis).replace("pont:", ""), zb = zoneDe(vers).replace("pont:", "");
  if (za === zb) return [{ p: vers.clone() }];
  const l = [];
  if (za !== "centre") l.push({ p: A.iles[za].bout.clone() }, { p: A.iles[za].porte.clone(), pont: [A.iles[za].bout, A.iles[za].porte] });
  if (zb !== "centre") l.push({ p: A.iles[zb].porte.clone() }, { p: A.iles[zb].bout.clone(), pont: [A.iles[zb].porte, A.iles[zb].bout] });
  l.push({ p: vers.clone() });
  return l;
}

// ---------- Effets ----------
function particules(pos, couleur, n, force = 1.5, vie = 0.7, taille = 0.07) {
  for (let i = 0; i < n; i++) {
    const m = new T.Mesh(new T.IcosahedronGeometry(taille, 0), new T.MeshBasicMaterial({ color: couleur, transparent: true }));
    m.position.copy(pos); A.scene.add(m);
    A.parts.push({ m, v: new T.Vector3((Math.random() - 0.5) * 2 * force, Math.random() * 2 * force, (Math.random() - 0.5) * 2 * force), t: 0, vie });
  }
}
function projectile(dep, cible, degats, couleur, opts = {}) {
  const boule = mesh(new T.IcosahedronGeometry(opts.gros ? 0.24 : 0.16, 1), mat(couleur, { e: couleur, ei: 1.3 }), false);
  boule.position.copy(dep); A.scene.add(boule);
  A.tirs.push({ boule, dep: dep.clone(), cible, degats, couleur, t: 0, duree: opts.duree || 0.45, type: opts.type, source: opts.source, arc: opts.arc ?? 0.6 });
}
function pointVise(c) { return c.m ? c.m.position.clone().add(new T.Vector3(0, c.vol ? 0.3 : c.haut * 0.5, 0)) : c.w.clone().setY(c === A.couvoir ? 2 : 1.2); }

// ---------- Lancer ----------
export function lancerAttaque(ctx, dragons, opts = {}) {
  ctxJeu = ctx;
  const n = opts.niveau || niveauVillage();
  const moy = dragons.length ? dragons.reduce((s, d) => s + d.niveau, 0) / dragons.length : 1;
  const adv = adversaire();
  const nom = opts.nom || `Village de ${adv.nom}`;
  // L'adversaire trouvé : on peut en chercher un autre
  modale({
    titre: "Adversaire trouvé !",
    contenu: el("div", { class: "at-trouve" }, el("div", { class: "nom" }, nom),
      el("div", { class: "infos" }, el("span", {}, `🏆 ${adv.t} trophées`), el("span", {}, `Village niveau ${n}`), el("span", {}, `${Math.min(3, 1 + Math.floor(n / 3)) * 3} dragons défenseurs`)),
      el("p", { class: "doux", style: { margin: 0, fontSize: "12px" } }, "Pose tes dragons où tu veux. Sur une île que leur élément domine, ils frappent +40 %. Détruis le plus de choses possible, surtout le couvoir au centre !")),
    boutons: [{ texte: "Chercher un autre", action: () => setTimeout(() => lancerAttaque(ctx, dragons, opts), 50) }, { texte: "Attaquer !", classe: "principal", action: () => demarrer(ctx, dragons, opts, n, moy, nom) }],
  });
}
function demarrer(ctx, dragons, opts, n, moy, nom) {
  A = construireVillage(n, moy);
  A.opts = opts; A.nom = nom; A.update = majAttaque;
  A.reserve = dragons.slice(0, 7).map((d) => ({ d, pose: false }));
  A.choisi = 0;
  placerDefenseurs();
  ctx.cacherInterface(true);
  ctx.moteur.montrer(A);
  ctx.moteur.definirZone({ x: 0, y: 0.06, l: 1, h: 0.72 });
  A.orbite.viser(new T.Vector3(0, 0, 2), etroit() ? 74 : 46, 0, 0.78);
  A.orbite.dist = 80;
  Musique.jouer("attaque");
  Son.crier("feu", 0.9);
  const ui = document.getElementById("ecran");
  ui.innerHTML = "";
  A.bandeau = el("div", { class: "at-bandeau panneau" }); ui.append(A.bandeau);
  A.calque = el("div", { class: "at-iles" }); ui.append(A.calque);
  A.etiqs = {};
  for (const elx of ELS) { const e = el("div", { class: "at-ile" }); A.calque.append(e); A.etiqs[elx] = e; }
  A.plateau = el("div", { class: "at-plateau panneau" }); ui.append(A.plateau);
  installerToucher();
  majPlateau(); majBandeau();
}

// ---------- Interface ----------
function majPlateau() {
  if (!A || !A.plateau) return;
  const p = A.plateau; p.innerHTML = "";
  const restants = A.reserve.filter((r) => !r.pose).length;
  const sel = A.reserve[A.choisi];
  p.append(el("div", { class: "aide" }, restants
    ? sel && !sel.pose ? `Touche une île pour y poser ${PAR_ID[sel.d.id].nom}. Les îles en vert : son élément domine (+40 %).` : "Choisis un dragon, puis touche une île."
    : "Tous tes dragons sont posés. Touche un bâtiment pour qu'ils le visent."));
  const l = el("div", { class: "at-cartes" });
  A.reserve.forEach((r, i) => {
    const src = PAR_ID[r.d.id];
    l.append(el("button", { class: `at-carte ${i === A.choisi && !r.pose ? "choisi" : ""} ${r.pose ? "pose" : ""}`, style: { "--el": ELEMENTS[src.element].couleur }, disabled: r.pose, onclick: () => { A.choisi = i; Son.clic(); majPlateau(); } },
      stadeEffectif(r.d) >= 1 && habitatDe(r.d.id) !== "fond" ? el("span", { class: "vol" }, "🪽") : null,
      el("b", {}, src.nom), el("span", {}, `Nv ${r.d.niveau}`), el("span", { style: { color: ELEMENTS[src.element].couleur } }, ELEMENTS[src.element].nom)));
  });
  p.append(l);
}
function majBandeau() {
  if (!A || !A.bandeau) return;
  const { pct, etoiles } = bilan();
  A.bandeau.innerHTML = "";
  A.bandeau.append(el("b", {}, A.nom), el("span", { class: "pct" }, `${pct} %`), el("span", { class: "et" }, "★".repeat(etoiles) + "☆".repeat(3 - etoiles)), el("span", { class: "num doux" }, `${Math.max(0, Math.ceil(DUREE - A.t))} s`),
    el("button", { class: "btn petit", onclick: () => finAttaque(true) }, "Retraite"));
}
function bilan() {
  const tout = [...A.bats, A.couvoir];
  const total = tout.reduce((s, b) => s + b.max, 0), fait = tout.reduce((s, b) => s + (b.max - Math.max(0, b.pv)), 0);
  const pct = Math.round((fait / total) * 100);
  const detruits = A.bats.filter((b) => b.pv <= 0).length + (A.couvoir.pv <= 0 ? 1 : 0);
  const etoiles = (pct >= 50 ? 1 : 0) + (A.couvoir.pv <= 0 ? 1 : 0) + (detruits === tout.length ? 1 : 0);
  return { pct, etoiles, detruits, total: tout.length };
}
function majEtiquettes() {
  const sel = A.reserve[A.choisi];
  const elx0 = sel && !sel.pose ? PAR_ID[sel.d.id].element : null;
  for (const elx of ELS) {
    const e = A.etiqs[elx];
    const p = versEcran(A.iles[elx].c.clone().add(new T.Vector3(0, 0.3, 0)), A.camera);
    e.hidden = !elx0 || !p.devant;
    if (e.hidden) continue;
    e.style.left = Math.round(p.x) + "px"; e.style.top = Math.round(p.y) + "px";
    const bon = domine(elx0, elx), mal = domine(elx, elx0);
    e.className = "at-ile" + (bon ? " bon" : mal ? " mal" : "");
    e.textContent = `Île ${elx === "eau" ? "d'Eau" : elx === "feu" ? "de Feu" : "de Glace"}${bon ? " · +40 %" : mal ? " · défavorable" : ""}`;
  }
}

// ---------- Toucher : poser un dragon ou désigner une cible ----------
let touchePose = false;
function installerToucher() {
  if (touchePose) return; touchePose = true;
  const canvas = document.getElementById("scene3d"), ray = new T.Raycaster();
  let d0 = null;
  canvas.addEventListener("pointerdown", (e) => { d0 = { x: e.clientX, y: e.clientY }; });
  canvas.addEventListener("pointerup", (e) => {
    if (!A || A.fini || !d0 || ctxJeu.moteur.decor !== A) return;
    if (Math.hypot(e.clientX - d0.x, e.clientY - d0.y) > 8) return;
    ray.setFromCamera(new T.Vector2((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1), A.camera);
    const hits = ray.intersectObjects(A.scene.children, true);
    // Un bâtiment touché : tous tes dragons le visent
    for (const h of hits) {
      let o = h.object; while (o && o.userData.cible === undefined) o = o.parent;
      if (!o) continue;
      const c = o.userData.cible === "couvoir" ? A.couvoir : A.bats[o.userData.cible];
      if (c && c.pv > 0 && A.unites.length) { Son.clic(); for (const u of A.unites) { u.cible = c; u.chemin = []; } particules(c.w.clone().setY(2.6), 0xf2b544, 12, 2); return; }
      break;
    }
    // Sinon : poser le dragon choisi sur l'île touchée
    const sel = A.reserve[A.choisi];
    if (!sel || sel.pose) return;
    for (const h of hits) {
      const z = zoneDe(h.point);
      if (!ELS.includes(z) || h.point.y < -1) continue;
      poser(sel, h.point.clone().setY(0));
      return;
    }
  });
}
function poser(sel, pos) {
  sel.pose = true;
  const u = creerUnite(sel.d.id, sel.d.niveau, "moi", { d: sel.d, ul: sel.d.ul, stade: stadeEffectif(sel.d) });
  u.m.position.copy(pos).setY(9);
  u.arrivee = 0.7;
  u.anim.jouer(u.vol ? "vol" : "rugir");
  A.unites.push(u);
  // Un portail de lumière et un rugissement à l'arrivée
  particules(pos.clone().setY(0.3), COUL[u.element], 26, 2.2, 0.9, 0.09);
  particules(pos.clone().setY(0.3), 0xffffff, 10, 1.2, 0.6);
  Son.crier(u.element, Math.min(1, u.taille / 3), u.id);
  const suivant = A.reserve.findIndex((r) => !r.pose);
  A.choisi = suivant;
  majPlateau();
}

// ---------- Boucle de jeu ----------
function majAttaque(dt) {
  if (!A) return;
  A.orbite.update(dt);
  A.fort.userData.anim && A.fort.userData.anim(A.t);
  // Secousse de caméra après une destruction
  if (A.secousse > 0) { A.secousse = Math.max(0, A.secousse - dt * 2.5); A.camera.position.x += (Math.random() - 0.5) * A.secousse * 0.6; A.camera.position.y += (Math.random() - 0.5) * A.secousse * 0.6; }
  for (let i = A.parts.length - 1; i >= 0; i--) { const p = A.parts[i]; p.t += dt; p.v.y -= 4 * dt; p.m.position.addScaledVector(p.v, dt); p.m.material.opacity = 1 - p.t / p.vie; if (p.t > p.vie) { A.scene.remove(p.m); A.parts.splice(i, 1); } }
  // Les bâtiments encore debout travaillent (scie, grue, wagonnet…)
  for (const b of A.bats) if (b.pv > 0 && b.g.userData.anim) b.g.userData.anim(A.t);
  for (const b of A.bats) if (b.pv <= 0 && b.chute < 1) { b.chute = Math.min(1, b.chute + dt * 1.6); b.g.scale.y = Math.max(0.25, 1 - b.chute * 0.75); b.g.rotation.z = Math.sin(b.chute * 9) * 0.06 * (1 - b.chute); }
  if (A.couvoir.pv <= 0 && A.fort.scale.y > 0.35) A.fort.scale.y = Math.max(0.35, A.fort.scale.y - dt * 0.8);
  majEtiquettes();
  if (A.fini) { for (const u of [...A.unites, ...A.defenseurs]) u.anim.update(dt); return; }
  A.t += dt;
  if (Math.floor(A.t * 2) !== Math.floor((A.t - dt) * 2)) majBandeau();
  const cam = A.camera;
  regler(A.couvoir.barre, A.couvoir.pv / A.couvoir.max, cam, true);
  for (const b of A.bats) regler(b.barre, b.pv / b.max, cam, true);
  const batsDebout = [...A.bats, A.couvoir].filter((b) => b.pv > 0);
  const miens = A.unites.filter((u) => u.pv > 0), eux = A.defenseurs.filter((u) => u.pv > 0);
  for (const u of A.unites) majUnite(u, dt, batsDebout, eux, cam);
  for (const u of A.defenseurs) majUnite(u, dt, [], miens, cam);
  majDefenses(dt, miens);
  majTirs(dt);
  // Fin : tout est détruit, plus de dragons (après la pose), ou le temps est écoulé
  const { detruits, total } = bilan();
  const plusPersonne = A.reserve.every((r) => r.pose) && !miens.length;
  if (detruits === total || plusPersonne || A.t > DUREE) finAttaque(false);
}
function degatsDe(u, cible) {
  let k = 9 + u.niveau * 2.8;
  if (u.camp === "eux") k = 7 + u.niveau * 2.4;
  const elC = cible.element;
  if (elC && domine(u.element, elC)) k *= 1.5; else if (elC && domine(elC, u.element)) k *= 0.7;
  // Avantage de terrain : sur une île que son élément domine
  const z = zoneDe(u.m.position);
  if (u.camp === "moi" && ELS.includes(z) && domine(u.element, z)) k *= 1.4;
  if (u.camp === "eux" && cible.m && ELS.includes(zoneDe(cible.m.position)) && domine(cible.element, zoneDe(cible.m.position))) k *= 0.75;
  return k;
}
function majUnite(u, dt, bats, ennemis, cam) {
  u.anim.update(dt);
  regler(u.barre, u.pv / u.max, cam, u.camp === "eux");
  if (u.pv <= 0) {
    // K.O. : il tombe du ciel s'il volait
    if (u.m.position.y > 0) u.m.position.y = Math.max(0, u.m.position.y - dt * 6);
    return;
  }
  const p = u.m.position;
  // Arrivée en piqué depuis le ciel
  if (u.arrivee > 0) {
    u.arrivee -= dt;
    p.y += ((u.alt) - p.y) * Math.min(1, dt * 6);
    if (u.arrivee <= 0) { p.y = u.alt; particules(p.clone().setY(0.1), 0xb8a890, 10, 1.4); if (!u.vol) Son.atterrir(Math.min(1, u.taille / 3)); u.anim.jouer(u.vol ? "vol" : "marche"); }
    return;
  }
  u.lent = Math.max(0, u.lent - dt);
  // Cible : un dragon ennemi proche d'abord, sinon un bâtiment (les défenseurs gardent leur île)
  const portVue = u.camp === "eux" ? 6.5 : 4.2;
  let ennemi = null, dm = portVue;
  for (const e of ennemis) { if (e.arrivee > 0) continue; const d = e.m.position.distanceTo(p); if (d < dm) { dm = d; ennemi = e; } }
  if (ennemi) { if (u.cible !== ennemi) { u.cible = ennemi; u.chemin = []; } }
  else if (u.camp === "moi" && (!u.cible || u.cible.pv <= 0 || u.cible.m)) {
    let best = null, db = 1e9;
    for (const c of bats) { const d = c.w.distanceTo(p) + (c === A.couvoir ? 3 : 0) + (zoneDe(c.w) === zoneDe(p) ? 0 : 6); if (d < db) { db = d; best = c; } }
    u.cible = best; u.chemin = [];
  } else if (u.camp === "eux" && (!u.cible || u.cible.pv <= 0 || u.cible.m && u.cible.m.position.distanceTo(u.garde) > 9)) u.cible = null;
  // Défenseur sans cible : il rentre à son poste
  if (!u.cible) {
    if (u.garde) { const d = Math.hypot(u.garde.x - p.x, u.garde.z - p.z); if (d > 0.5) avancer(u, u.garde, dt, d); else { u.anim.jouer(u.vol ? "vol" : "repos"); p.y += (u.alt + Math.sin(A.t * 2 + u.ph) * 0.2 - p.y) * Math.min(1, dt * 3); } }
    return;
  }
  const q = pointVise(u.cible);
  const dist = Math.hypot(q.x - p.x, q.z - p.z);
  const portee = (u.cible === A.couvoir ? 4.6 : u.cible.m ? 2.4 : 1.5) + u.taille * 0.3 + (u.vol ? 1.6 : 0);
  if (dist > portee) {
    // En vol : tout droit. Au sol : par les ponts.
    if (u.vol || u.cible.m) avancer(u, u.cible.m ? u.cible.m.position : u.cible.w, dt, dist);
    else {
      if (!u.chemin.length) u.chemin = chemin(p, u.cible.w);
      const etape = u.chemin[0];
      const de = Math.hypot(etape.p.x - p.x, etape.p.z - p.z);
      if (de < 0.35 && u.chemin.length > 1) u.chemin.shift();
      avancer(u, u.chemin[0].p, dt, Math.max(0.01, de), u.chemin[0].pont);
    }
    return;
  }
  u.m.rotation.y = Math.atan2(q.x - p.x, q.z - p.z);
  u.recharge -= dt;
  if (u.vol) p.y += (u.alt + Math.sin(A.t * 2.5 + u.ph) * 0.25 - p.y) * Math.min(1, dt * 3);
  if (u.recharge > 0) return;
  u.recharge = u.camp === "moi" ? 1.15 : 1.35;
  u.anim.jouer("attaque");
  const tete = p.clone().add(new T.Vector3(Math.sin(u.m.rotation.y) * u.taille * 0.4, u.vol ? 0 : u.haut * 0.7, Math.cos(u.m.rotation.y) * u.taille * 0.4));
  projectile(tete, u.cible, degatsDe(u, u.cible), COUL[u.element], { source: u, duree: 0.35, arc: 0.2 });
  if (Math.random() < 0.6) Son.souffle(u.element);
}
function avancer(u, vers, dt, d, pont) {
  const p = u.m.position;
  const dx = vers.x - p.x, dz = vers.z - p.z, dd = Math.hypot(dx, dz) || 1;
  const pas = Math.min(dd, u.vitesse * (u.lent > 0 ? 0.5 : 1) * dt);
  p.x += (dx / dd) * pas; p.z += (dz / dd) * pas;
  u.m.rotation.y = Math.atan2(dx, dz);
  if (u.vol) p.y += (u.alt + Math.sin(A.t * 2 + u.ph) * 0.3 - p.y) * Math.min(1, dt * 3);
  else if (pont) { const [a, b] = pont; const L = Math.hypot(b.x - a.x, b.z - a.z) || 1; const k = Math.min(1, Math.max(0, Math.hypot(p.x - a.x, p.z - a.z) / L)); p.y = -Math.sin(k * Math.PI) * 0.85; }
  else p.y += (0 - p.y) * Math.min(1, dt * 8);
  u.anim.jouer(u.vol ? "vol" : "marche");
}
function majDefenses(dt, miens) {
  const viser = (w, portee) => { let m = null, dm = portee; for (const u of miens) { if (u.arrivee > 0) continue; const d = u.m.position.distanceTo(w); if (d < dm) { dm = d; m = u; } } return m; };
  for (const b of A.bats) {
    const tr = BATIMENTS[b.type].tour;
    if (!tr || b.pv <= 0) continue;
    b.recharge -= dt;
    if (b.recharge > 0) continue;
    const u = viser(b.w, tr.portee * (1 + 0.08 * (b.nv - 1)) + 1.2);
    if (!u) continue;
    b.recharge = tr.cadence;
    projectile(b.w.clone().setY(2.4), u, tr.degats * (1 + 0.35 * (b.nv - 1)) * 1.3, tr.couleur, { type: b.type, duree: 0.55, arc: 0.9, gros: true });
  }
  for (const t of A.couvoir.tourelles) {
    if (A.couvoir.pv <= 0) break;
    t.recharge -= dt;
    if (t.recharge > 0) continue;
    const w = t.c.getWorldPosition(new T.Vector3());
    const u = viser(w, 9);
    if (!u) continue;
    t.recharge = 1.3;
    projectile(w, u, 12 + 6 * A.n, 0xffd27a, { type: "couvoir", duree: 0.5 });
  }
}
function majTirs(dt) {
  for (let i = A.tirs.length - 1; i >= 0; i--) {
    const s = A.tirs[i];
    s.t += dt;
    const k = Math.min(1, s.t / s.duree);
    const vise = pointVise(s.cible);
    s.boule.position.lerpVectors(s.dep, vise, k); s.boule.position.y += Math.sin(k * Math.PI) * s.arc;
    if (Math.random() < 0.6) particules(s.boule.position.clone(), s.couleur, 1, 0.3, 0.35, 0.05);
    if (k < 1) continue;
    A.scene.remove(s.boule); A.tirs.splice(i, 1);
    const c = s.cible;
    if (c.pv <= 0) continue;
    c.pv -= s.degats;
    particules(vise, s.couleur, 7, 1.4);
    if (c.m) {
      // Un dragon touché
      if (s.type === "tourGivre") c.lent = 2;
      if (s.type === "tourEau" && !c.vol) { const p = c.m.position; const dx = p.x - s.dep.x, dz = p.z - s.dep.z, d = Math.hypot(dx, dz) || 1; p.x += (dx / d) * 0.9; p.z += (dz / d) * 0.9; }
      if (c.pv <= 0) { c.anim.jouer("ko"); Son.crier(c.element, 0.6, c.id, "douleur"); particules(c.m.position.clone().setY(0.5), 0xffffff, 12, 1.6); if (c.camp === "eux") toast(`${c.nom} est vaincu !`, "bon"); }
      else if (Math.random() < 0.3) c.anim.jouer("coup");
    } else {
      if (Math.random() < 0.4) Son.impact(s.source ? s.source.element : "feu", false);
      if (c.pv <= 0) {
        // Un bâtiment s'effondre
        Son.impact("feu", true); A.secousse = c === A.couvoir ? 1.6 : 0.6;
        particules(c.w.clone().setY(1), 0x8a7a68, c === A.couvoir ? 60 : 24, c === A.couvoir ? 3.4 : 2.4, 1, 0.12);
        particules(c.w.clone().setY(1.5), 0xffa040, c === A.couvoir ? 30 : 10, 2.6, 0.8);
        c.barre.visible = false;
        if (c === A.couvoir) { Son.seisme(); toast("Le couvoir ennemi est tombé !", "bon"); }
        majBandeau();
      }
    }
  }
}

// ---------- Fin ----------
function finAttaque(retraite = false) {
  if (!A || A.fini) return;
  A.fini = true;
  const { pct, etoiles, detruits, total } = bilan();
  const victoire = etoiles > 0;
  const n = A.n, gains = [];
  let oeuf = false;
  changer((e) => {
    const a = e.attaques || (e.attaques = { victoires: 0, total: 0 });
    a.total++;
    const r = e.ressources;
    // Le butin : selon la part du village détruite et les étoiles
    const k = pct / 100 * (1 + etoiles * 0.5);
    const ra = Math.round(14 * n * k), br = Math.round(20 * n * k), pi = Math.round(20 * n * k);
    if (ra + br + pi > 0) { r.rations += ra; r.brindilles += br; r.pierres += pi; gains.push(`+${ra} rations`, `+${br} brindilles`, `+${pi} pierres`); }
    if (victoire) {
      a.victoires++;
      const gm = 3 + 2 * n + etoiles * 2; r.gemmes = (r.gemmes || 0) + gm; gains.push(`+${gm} gemmes`);
      oeuf = A.opts.oeufGaranti || (A.couvoir.pv <= 0 && Math.random() < 0.35);
      if (oeuf) { e.oeufs.choix += 1; gains.push("+1 œuf !"); }
    }
    noter(`Attaque de ${A.nom} : ${pct} % détruit, ${etoiles}★.`);
  });
  if (victoire) Son.victoire(); else Son.defaite();
  for (const u of A.unites) if (u.pv > 0) u.anim.jouer(victoire ? "joie" : "repos");
  const apres = A.opts.apres;
  if (A.plateau) A.plateau.remove();
  setTimeout(() => {
    modale({
      titre: victoire ? (etoiles === 3 ? "Village rasé !" : "Village pillé !") : retraite ? "Retraite" : "L'attaque a échoué",
      contenu: el("div", { style: { display: "grid", gap: "10px" } },
        el("div", { class: "at-etoiles" }, "★".repeat(etoiles) + "☆".repeat(3 - etoiles)),
        el("p", { style: { margin: 0, textAlign: "center" } }, `${pct} % du village détruit · ${detruits}/${total} bâtiments${A.couvoir.pv <= 0 ? " · le couvoir est tombé" : ""}`),
        gains.length ? el("p", { class: "doux", style: { margin: 0, textAlign: "center" } }, gains.join(" · ")) : null),
      boutons: [{ texte: "Retour", classe: "principal", action: () => { ctxJeu.cacherInterface(false); A = null; if (apres) apres(victoire); else ctxJeu.aller("combat"); } }],
      fermable: false,
    });
  }, retraite ? 100 : 1600);
}
export const _attaque = () => A;
