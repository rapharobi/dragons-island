// Attaquer un village : une île ennemie avec ses tours, ses fermes et son couvoir-forteresse.
// Tes dragons débarquent au bord de l'île et foncent sur les bâtiments ; touche un bâtiment pour qu'ils le visent.
// Victoire : le couvoir ennemi tombe. Étoiles : 1 pour le couvoir, +1 si la moitié du village est détruite, +1 si tout l'est.
import { E, changer, noter } from "./etat.js";
import { PAR_ID, pvMax, stadeEffectif } from "./regles.js";
import { construireIleEnnemie, construireForteresse, construireCouvoir } from "./monde.js";
import { ciel, eclairage, Orbite } from "./scene.js";
import { construireDragon } from "./modele.js";
import { Animateur } from "./anim.js";
import { mat, mesh, rng } from "./outils3d.js";
import { BATIMENTS, modeleBatiment } from "./village.js";
import { el, styles, toast, modale } from "./ui.js";
import { Son, Musique } from "./son.js";
import { bots } from "./ligues.js";

const T = window.THREE;
let A = null, ctxJeu = null;

styles("attaque", `
.at-bandeau { position: fixed; z-index: 18; top: calc(var(--haut) + 10px); left: 50%; transform: translateX(-50%); padding: 8px 14px; display: flex; gap: 10px; align-items: center; white-space: nowrap; font-size: 13px; }
.at-bandeau b { font-family: var(--titre); color: #ffb08a; }
.at-aide { position: fixed; z-index: 18; bottom: calc(var(--bas) + 20px); left: 50%; transform: translateX(-50%); padding: 8px 14px; font-size: 12px; color: var(--doux); text-align: center; width: min(420px, calc(100vw - 32px)); }
.at-etoiles { font-size: 34px; letter-spacing: 6px; text-align: center; }
`);

// Niveau du prochain village à attaquer : il grandit avec tes victoires
export function niveauVillage() { const a = E().attaques || {}; return Math.min(8, 1 + (a.victoires || 0)); }

function barre3D(l) {
  const g = new T.Group(), geo = new T.PlaneGeometry(1, 0.1);
  const fond = new T.Mesh(geo, new T.MeshBasicMaterial({ color: 0x1a1010, transparent: true, opacity: 0.8, depthTest: false }));
  const plein = new T.Mesh(geo, new T.MeshBasicMaterial({ color: 0x6fd68a, depthTest: false }));
  fond.scale.x = plein.scale.x = l; plein.position.z = 0.001; fond.renderOrder = 10; plein.renderOrder = 11;
  g.add(fond, plein); g.userData = { plein, l };
  return g;
}
function regler(b, k, cam) { const p = b.userData.plein; k = Math.max(0, k); p.scale.x = Math.max(0.001, k) * b.userData.l; p.position.x = -(1 - k) * b.userData.l / 2; p.material.color.setHex(k > 0.5 ? 0x6fd68a : k > 0.25 ? 0xf2b544 : 0xff5a4a); b.quaternion.copy(cam.quaternion); }

function construireScene(niveau, element) {
  const scene = new T.Scene();
  scene.fog = new T.Fog(0x241e36, 40, 120);
  scene.add(ciel(0x0a0c20, 0x4a3050, 0x140e1a, 200));
  eclairage(scene, { ciel: 0xb8c8f0, sol: 0x3a2838, hemi: 0.7, soleil: 0xffd8b8, force: 1.2, zoneOmbre: 12, carte: 2048, x: 8, y: 16, z: 6 });
  const camera = new T.PerspectiveCamera(42, 1, 0.1, 400);
  const orbite = new Orbite(camera, document.getElementById("scene3d"));
  orbite.min = 6; orbite.max = 34; orbite.phiMax = 1.3;
  orbite.viser(new T.Vector3(0, 0.5, 0.5), window.innerWidth / window.innerHeight < 0.8 ? 25 : 19, 0, 0.95);
  const R = 9.5;
  const ile = construireIleEnnemie(element, R, 77 + niveau * 13);
  scene.add(ile);
  // Le couvoir-forteresse ennemi au centre
  const nivC = Math.min(4, Math.floor((niveau - 1) / 2) + (niveau >= 2 ? 1 : 0));
  const fort = construireForteresse(nivC); scene.add(fort);
  const autel = construireCouvoir(Math.min(4, nivC)); scene.add(autel);
  // Les bâtiments en couronne
  const r = rng(niveau * 31 + element.length);
  const tours = ["tourLave", "tourGivre", "tourEau"];
  const types = [];
  for (let i = 0; i < Math.min(3, 1 + Math.floor(niveau / 2)); i++) types.push(tours[(i + niveau) % 3]);
  types.push("scierie", "carriere", "verger");
  if (niveau >= 2) types.push("entrepot");
  for (let i = 0; i < Math.floor(niveau / 2); i++) types.push(tours[(i + 1) % 3]);
  const bats = [];
  types.slice(0, 11).forEach((type, i) => {
    const a = (i / Math.min(11, types.length)) * Math.PI * 2 + r() * 0.3, d = 4.7 + r() * 2.2;
    const nv = Math.max(1, Math.min(5, Math.ceil(niveau / 2) + (r() < 0.3 ? 1 : 0)));
    const g = modeleBatiment(type, nv, element);
    g.position.set(Math.cos(a) * d, 0, Math.sin(a) * d - 0.6); g.rotation.y = Math.atan2(-g.position.x, -g.position.z);
    const zone = new T.Mesh(new T.CylinderGeometry(1.1, 1.1, 2.2, 8), new T.MeshBasicMaterial({ visible: false })); zone.position.y = 1; g.add(zone);
    g.userData.cible = i;
    const b3 = barre3D(1.2); b3.position.y = 2.7; g.add(b3);
    scene.add(g);
    const pv = BATIMENTS[type].pv * (1 + 0.3 * (nv - 1));
    bats.push({ type, nv, g, pv, max: pv, barre: b3, recharge: r(), w: g.position.clone() });
  });
  const pvC = 650 + 260 * niveau;
  const bc = barre3D(2.4); bc.position.y = 4.6; fort.add(bc);
  fort.traverse((o) => { o.userData.cible = "couvoir"; });
  const couvoir = { type: "couvoir", g: fort, pv: pvC, max: pvC, barre: bc, w: new T.Vector3(0, 0, 0), tourelles: (fort.userData.tourelles || []).map((c) => ({ c, recharge: Math.random() })) };
  return { scene, camera, orbite, R, bats, couvoir, fort, parts: [], tirs: [], t: 0 };
}

export function lancerAttaque(ctx, dragons, opts = {}) {
  ctxJeu = ctx;
  const niveau = opts.niveau || niveauVillage();
  const element = ["feu", "glace", "eau"][Math.floor(Math.random() * 3)];
  const b = bots()[Math.floor(Math.random() * bots().length)];
  A = construireScene(niveau, element);
  A.niveau = niveau; A.opts = opts; A.nom = opts.nom || `Village de ${b.nom}`;
  A.update = majAttaque;
  // Tes dragons débarquent au bord de l'île, côté caméra
  A.unites = dragons.slice(0, 7).map((d, i, l) => {
    const rig = construireDragon(d.id, stadeEffectif(d), { ul: d.ul });
    const taille = Math.max(rig.taille.x, rig.taille.z);
    const ech = Math.min(1.25, 2.4 / taille);
    rig.racine.scale.setScalar(ech);
    const m = new T.Group(); m.add(rig.racine);
    m.position.set((i - (l.length - 1) / 2) * 1.5, 0, A.R * 0.86);
    m.rotation.y = Math.PI;
    const b3 = barre3D(1); b3.position.y = rig.taille.y * ech + 0.4; m.add(b3);
    A.scene.add(m);
    const anim = new Animateur(rig); anim.jouer("marche");
    const pv = Math.round(pvMax(d) * 2.2);
    return { d, m, anim, pv, max: pv, barre: b3, taille: taille * ech, haut: rig.taille.y * ech, recharge: 0.5 + i * 0.15, lent: 0, element: PAR_ID[d.id].element };
  });
  ctx.cacherInterface(true);
  ctx.moteur.montrer(A);
  ctx.moteur.definirZone(null);
  Musique.jouer("combat");
  Son.crier("feu", 0.9);
  const ui = document.getElementById("ecran");
  ui.innerHTML = "";
  A.bandeau = el("div", { class: "at-bandeau panneau" }); ui.append(A.bandeau);
  ui.append(el("div", { class: "at-aide panneau" }, "Touche un bâtiment : tous tes dragons le visent. Détruis le couvoir au centre pour gagner !"));
  installerToucher();
  majBandeau();
}
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
    for (const h of ray.intersectObjects(A.scene.children, true)) {
      let o = h.object; while (o && o.userData.cible === undefined) o = o.parent;
      if (!o) continue;
      const c = o.userData.cible === "couvoir" ? A.couvoir : A.bats[o.userData.cible];
      if (c && c.pv > 0) { A.cible = c; Son.clic(); for (const u of A.unites) u.cible = c; particules(c.w.clone().setY(2.5), 0xf2b544, 10, 2); }
      return;
    }
  });
}
function majBandeau() {
  if (!A || !A.bandeau) return;
  const debout = A.bats.filter((b) => b.pv > 0).length;
  const vivants = A.unites.filter((u) => u.pv > 0).length;
  A.bandeau.innerHTML = "";
  A.bandeau.append(el("b", {}, A.nom), el("span", {}, `🐉 ${vivants}`), el("span", {}, `🏚 ${A.bats.length - debout}/${A.bats.length}`), el("span", { class: "num doux" }, `${Math.max(0, Math.ceil(120 - A.t))} s`),
    el("button", { class: "btn petit", onclick: () => finAttaque(false, true) }, "Retraite"));
}
function particules(pos, couleur, n, force = 1.5) {
  for (let i = 0; i < n; i++) {
    const m = new T.Mesh(new T.IcosahedronGeometry(0.07, 0), new T.MeshBasicMaterial({ color: couleur, transparent: true }));
    m.position.copy(pos); A.scene.add(m);
    A.parts.push({ m, v: new T.Vector3((Math.random() - 0.5) * 2 * force, Math.random() * 2 * force, (Math.random() - 0.5) * 2 * force), t: 0, vie: 0.7 });
  }
}
const COUL = { feu: 0xff7a2a, glace: 0x9fe8ff, eau: 0x48c8e0 };
function majAttaque(dt) {
  if (!A) return;
  A.orbite.update(dt);
  A.fort.userData.anim && A.fort.userData.anim(A.t);
  for (let i = A.parts.length - 1; i >= 0; i--) { const p = A.parts[i]; p.t += dt; p.v.y -= 4 * dt; p.m.position.addScaledVector(p.v, dt); p.m.material.opacity = 1 - p.t / p.vie; if (p.t > p.vie) { A.scene.remove(p.m); A.parts.splice(i, 1); } }
  if (A.fini) { for (const u of A.unites) u.anim.update(dt); return; }
  A.t += dt;
  if (Math.floor(A.t) !== Math.floor(A.t - dt)) majBandeau();
  const cam = A.camera;
  regler(A.couvoir.barre, A.couvoir.pv / A.couvoir.max, cam);
  const cibles = [...A.bats, A.couvoir].filter((b) => b.pv > 0);
  // Tes dragons
  for (const u of A.unites) {
    u.anim.update(dt);
    regler(u.barre, u.pv / u.max, cam);
    if (u.pv <= 0) continue;
    u.lent = Math.max(0, u.lent - dt);
    if (!u.cible || u.cible.pv <= 0) {
      let best = null, dm = 1e9;
      for (const c of cibles) { const d = c.w.distanceTo(u.m.position) + (c === A.couvoir ? 2 : 0); if (d < dm) { dm = d; best = c; } }
      u.cible = best;
    }
    if (!u.cible) continue;
    const p = u.m.position, q = u.cible.w;
    const dx = q.x - p.x, dz = q.z - p.z, d = Math.hypot(dx, dz);
    u.m.rotation.y = Math.atan2(dx, dz);
    const portee = (u.cible === A.couvoir ? 3.3 : 1.3) + u.taille * 0.35;
    if (d > portee) { const pas = 1.7 * (u.lent > 0 ? 0.5 : 1) * dt; p.x += (dx / d) * pas; p.z += (dz / d) * pas; u.anim.jouer("marche"); continue; }
    u.recharge -= dt;
    if (u.recharge > 0) continue;
    u.recharge = 1.2;
    u.anim.jouer("attaque");
    const degats = 9 + u.d.niveau * 2.8;
    u.cible.pv -= degats;
    particules(q.clone().setY(1.2).add(new T.Vector3((Math.random() - 0.5), 0, (Math.random() - 0.5))), COUL[u.element], 6);
    if (Math.random() < 0.5) Son.impact(u.element, false);
    if (u.cible.pv <= 0) {
      if (u.cible !== A.couvoir) { u.cible.g.scale.y *= 0.4; u.cible.barre.visible = false; }
      Son.impact("feu", true); A.orbite.dist += 0.4;
      particules(q.clone().setY(1), 0x8a7a68, 18, 2.4);
    }
  }
  // Les défenses ennemies : tours et tourelles du couvoir
  const vivants = A.unites.filter((u) => u.pv > 0);
  const viser = (w, portee) => { let m = null, dm = portee; for (const u of vivants) { const d = u.m.position.distanceTo(w); if (d < dm) { dm = d; m = u; } } return m; };
  for (const b of A.bats) {
    regler(b.barre, b.pv / b.max, cam);
    const tr = BATIMENTS[b.type].tour;
    if (!tr || b.pv <= 0) continue;
    b.recharge -= dt;
    if (b.recharge > 0) continue;
    const u = viser(b.w, tr.portee * (1 + 0.08 * (b.nv - 1)) + 0.5);
    if (!u) continue;
    b.recharge = tr.cadence;
    tir(b.w.clone().setY(2.3 * b.g.scale.y), u, tr.degats * (1 + 0.35 * (b.nv - 1)) * 1.3, b.type, tr.couleur);
  }
  for (const t of A.couvoir.tourelles) {
    if (A.couvoir.pv <= 0) break;
    t.recharge -= dt;
    if (t.recharge > 0) continue;
    const w = t.c.getWorldPosition(new T.Vector3());
    const u = viser(w, 8);
    if (!u) continue;
    t.recharge = 1.3;
    tir(w, u, 12 + 6 * A.niveau, "couvoir", 0xffd27a);
  }
  for (let i = A.tirs.length - 1; i >= 0; i--) {
    const s = A.tirs[i];
    s.t += dt;
    const k = Math.min(1, s.t / 0.5);
    const vise = s.u.m.position.clone().add(new T.Vector3(0, s.u.haut * 0.5, 0));
    s.boule.position.lerpVectors(s.dep, vise, k); s.boule.position.y += Math.sin(k * Math.PI) * 0.8;
    if (k < 1) continue;
    A.scene.remove(s.boule); A.tirs.splice(i, 1);
    s.u.pv -= s.degats;
    particules(vise, s.couleur, 8);
    if (s.type === "tourGivre") s.u.lent = 2;
    if (s.type === "tourEau") { const p = s.u.m.position; const d = Math.hypot(p.x, p.z) || 1; p.x += (p.x / d) * 1; p.z += (p.z / d) * 1; }
    if (s.u.pv <= 0) { s.u.anim.jouer("ko"); Son.crier(s.u.element, 0.6); }
  }
  // Fin
  if (A.couvoir.pv <= 0) finAttaque(true);
  else if (!A.unites.some((u) => u.pv > 0) || A.t > 120) finAttaque(false);
}
function tir(dep, u, degats, type, couleur) {
  const boule = mesh(new T.IcosahedronGeometry(0.17, 1), mat(couleur, { e: couleur, ei: 1 }), false);
  boule.position.copy(dep); A.scene.add(boule);
  A.tirs.push({ boule, dep: dep.clone(), u, degats, type, couleur, t: 0 });
}
function finAttaque(victoire, retraite = false) {
  if (!A || A.fini) return;
  A.fini = true;
  const detruits = A.bats.filter((b) => b.pv <= 0).length;
  const etoiles = victoire ? 1 + (detruits >= A.bats.length / 2 ? 1 : 0) + (detruits === A.bats.length ? 1 : 0) : 0;
  const n = A.niveau, gains = [];
  let oeuf = false;
  changer((e) => {
    const a = e.attaques || (e.attaques = { victoires: 0, total: 0 });
    a.total++;
    const r = e.ressources;
    // Le butin : une part des réserves du village, plus grosse avec les étoiles
    const k = victoire ? 1 + etoiles * 0.5 : detruits / Math.max(1, A.bats.length) * 0.6;
    const ra = Math.round(12 * n * k), br = Math.round(18 * n * k), pi = Math.round(18 * n * k);
    if (ra + br + pi > 0) { r.rations += ra; r.brindilles += br; r.pierres += pi; gains.push(`+${ra} rations`, `+${br} brindilles`, `+${pi} pierres`); }
    if (victoire) {
      a.victoires++;
      const gm = 3 + 2 * n + etoiles; r.gemmes = (r.gemmes || 0) + gm; gains.push(`+${gm} gemmes`);
      oeuf = A.opts.oeufGaranti || Math.random() < 0.25;
      if (oeuf) { e.oeufs.choix += 1; gains.push("+1 œuf !"); }
    }
    noter(`Attaque de ${A.nom} : ${victoire ? `victoire ${etoiles}★` : "échec"}.`);
  });
  if (victoire) Son.victoire(); else Son.defaite();
  for (const u of A.unites) if (u.pv > 0) u.anim.jouer(victoire ? "joie" : "repos");
  const apres = A.opts.apres;
  setTimeout(() => {
    modale({
      titre: victoire ? "Village conquis !" : retraite ? "Retraite" : "L'attaque a échoué",
      contenu: el("div", { style: { display: "grid", gap: "10px" } },
        el("div", { class: "at-etoiles" }, "★".repeat(etoiles) + "☆".repeat(3 - etoiles)),
        el("p", { style: { margin: 0 } }, `${detruits} bâtiment${detruits > 1 ? "s" : ""} détruit${detruits > 1 ? "s" : ""} sur ${A.bats.length}${victoire ? ", et le couvoir est tombé." : "."}`),
        gains.length ? el("p", { class: "doux", style: { margin: 0 } }, gains.join(" · ")) : null),
      boutons: [{ texte: "Retour", classe: "principal", action: () => { ctxJeu.cacherInterface(false); A = null; if (apres) apres(victoire); else ctxJeu.aller("combat"); } }],
      fermable: false,
    });
  }, retraite ? 100 : 1500);
}
