// Le couvoir : choisir ses œufs, les faire éclore avec le temps (ou des braises), voir le minuteur.
import { construireDragon } from "./modele.js";
import { Animateur } from "./anim.js";
import { ciel, eclairage, Orbite } from "./scene.js";
import { construireCouvoir, construireOeuf } from "./monde.js";
import { mat, mesh, bloc } from "./outils3d.js";
import { E, changer, choisirOeuf, avancement, tempsRestant, eclore, defCouvoir, maintenant, elementComplet, nouveauDragon, demarrerMinuteur, payer, assez, energie, noter, livreComplet, chaufferOeuf, braisesPourFinir, manqueChantier, dureeChantier, finirChantier } from "./etat.js";
import { PAR_ID, ELEMENTS, COUVOIR, RECETTE_COUVOIR, attenteOeuf, fmtDuree, STADES, CHANTIER_COUVOIR } from "./regles.js";
import { el, styles, toast, modale, barre, recette, icone } from "./ui.js";
import { signaler, apresPremierOeuf, enApprentissage, MENTOR, etape as etapeTuto } from "./tuto.js";
import { revelerIle } from "./iles.js";
import { blocExpedition } from "./expeditions.js";
import { Son, Musique } from "./son.js";

const T = window.THREE;
let D = null, ctxJeu = null, ui = null, mode = "couvoir", intro = false, minuteurUI = null;

styles("couvoir", `
.couv-panneau { position: fixed; z-index: 15; left: var(--bord-g); top: calc(var(--hud) + var(--tuto, 0px) + 8px); width: min(400px, calc(100vw - 32px)); padding: 16px; display: grid; gap: 12px; max-height: calc(100vh - 170px); overflow: auto; }
.couv-panneau h2 { font-size: 24px; }
.couv-panneau .carte { padding: 12px; border-radius: 12px; background: rgba(255,255,255,.04); border: 1px solid var(--trait); display: grid; gap: 8px; }
.couv-panneau .ligne { display: flex; justify-content: space-between; align-items: center; gap: 8px; font-size: 13px; }
.couv-panneau .chaine { display: flex; gap: 4px; flex-wrap: wrap; }
.couv-panneau .chaine span { font-family: var(--mono); font-size: 11px; padding: 2px 6px; border-radius: 6px; background: rgba(255,255,255,.06); color: var(--doux); }
.couv-panneau .chaine span.ici { background: rgba(242,181,68,.2); color: var(--ambre); }
.choix-oeufs { position: fixed; z-index: 16; left: 50%; transform: translateX(-50%); bottom: calc(var(--bas) + 90px); display: flex; gap: 10px; width: min(640px, calc(100vw - 32px)); }
.choix-oeufs button { flex: 1; padding: 12px; border-radius: 14px; border: 1px solid color-mix(in srgb, var(--el) 50%, transparent); background: color-mix(in srgb, var(--el) 14%, var(--panneau-plein)); text-align: left; display: grid; gap: 4px; min-width: 0; }
.choix-oeufs button.choisi { border-color: var(--el); background: color-mix(in srgb, var(--el) 34%, var(--panneau-plein)); box-shadow: 0 0 0 2px var(--el), 0 0 24px color-mix(in srgb, var(--el) 50%, transparent); }
.choix-oeufs { flex-wrap: wrap; }
.oeuf-confirmer { flex: 1 0 100%; display: grid; animation: entre .25s; }
.oeuf-confirmer .btn { width: 100%; }
.choix-oeufs button:hover { background: color-mix(in srgb, var(--el) 26%, var(--panneau-plein)); }
.choix-oeufs b { font-family: var(--titre); font-size: 18px; color: var(--el); }
.choix-oeufs small { color: var(--doux); font-size: 11px; }
.titre-intro { position: fixed; z-index: 16; top: calc(var(--hud) + var(--tuto, 0px) + 20px); left: 0; right: 0; text-align: center; padding: 0 var(--bord-d) 0 var(--bord-g); pointer-events: none; }
.titre-intro h2 { font-size: clamp(26px, 5vw, 44px); }
.titre-intro p { color: var(--doux); margin: 6px auto 0; max-width: 46ch; }
@media (max-width: 560px) { .couv-panneau { left: var(--bord-g); right: var(--bord-d); width: auto; top: auto; bottom: calc(var(--bas) + 78px); max-height: 46vh; } .choix-oeufs { bottom: calc(var(--bas) + 78px); gap: 8px; } .choix-oeufs > button { padding: 8px 10px; text-align: center; } .choix-oeufs b { font-size: 16px; } .titre-intro h2 { font-size: 26px; } .titre-intro p { font-size: 13px; } }
.choix-oeufs > button.plus-tard { flex: 1 0 100%; padding: 6px; background: none; border: none; text-align: center; }
.choix-oeufs > button.plus-tard b { font-size: 14px; color: var(--doux); font-family: inherit; text-decoration: underline; }
`);

function construireDecor() {
  const scene = new T.Scene();
  scene.fog = new T.Fog(0x1a1420, 12, 40);
  scene.add(ciel(0x0e0c1c, 0x3a2838, 0x140e14));
  eclairage(scene, { ciel: 0xffd8b0, sol: 0x2a1a20, hemi: 0.55, soleil: 0xffd0a0, force: 1.2, zoneOmbre: 6, x: 3, y: 7, z: 4 });
  const sol = mesh(new T.CylinderGeometry(7, 7.5, 0.4, 16).translate(0, -0.2, 0), mat(0x3a332e, { r: 1 }));
  scene.add(sol);
  for (let k = 0; k < 14; k++) {
    const a = (k / 14) * Math.PI * 2;
    const p = mesh(bloc(0.5, 0.25 + Math.random() * 0.2, 0.4, 0, 0.3, k), mat(0x4a423a, { r: 1 }));
    p.position.set(Math.cos(a) * 6.2, 0.1, Math.sin(a) * 6.2); scene.add(p);
  }
  // Lucioles
  const lucioles = [];
  for (let k = 0; k < 24; k++) {
    const l = mesh(new T.OctahedronGeometry(0.035, 0), mat(0xffd070, { e: 0xffc040, ei: 1.5 }), false);
    l.userData = { a: Math.random() * 6.28, r: 1.5 + Math.random() * 4, h: 0.5 + Math.random() * 2.5, v: 0.1 + Math.random() * 0.3 };
    scene.add(l); lucioles.push(l);
  }
  const camera = new T.PerspectiveCamera(40, 1, 0.1, 200);
  const orbite = new Orbite(camera, document.getElementById("scene3d"));
  installerToucherOeufs();
  orbite.min = 3; orbite.max = 14;
  orbite.viser(new T.Vector3(0, 0.9, 0), 6.5, 0.0, 1.2);
  const zone = new T.Group(); scene.add(zone);
  D = {
    scene, camera, orbite, zone, lucioles, t: 0, oeufsChoix: [], couvoir: null, nouveau: null, eclats: [], etincelles: [],
    update(dt) {
      D.t += dt;
      orbite.update(dt);
      for (const l of lucioles) { const u = l.userData; u.a += u.v * dt; l.position.set(Math.cos(u.a) * u.r, u.h + Math.sin(D.t * 1.3 + u.a) * 0.3, Math.sin(u.a) * u.r); }
      for (const o of D.oeufsChoix) {
        const u = o.userData, ch = u.choisi, elx = u.element;
        let y = Math.sin(D.t * 2 + u.x0) * 0.06 + (ch ? 0.85 : 0.5);
        o.rotation.z = 0; o.rotation.x = 0;
        if (ch && elx === "feu") { o.rotation.y += dt * 1.2; o.rotation.z = Math.sin(D.t * 23) * 0.05 + Math.sin(D.t * 3) * 0.04; y += Math.abs(Math.sin(D.t * 4)) * 0.12; }
        else if (ch && elx === "glace") { o.rotation.y += dt * 3.2; y += Math.sin(D.t * 1.5) * 0.08; }
        else if (ch && elx === "eau") { o.rotation.y += dt * 0.8; y += Math.sin(D.t * 2.2) * 0.16; o.rotation.z = Math.sin(D.t * 1.6) * 0.14; o.rotation.x = Math.cos(D.t * 1.3) * 0.1; }
        else o.rotation.y += dt * 0.5;
        o.position.y = y;
        const s = (ch ? 1.22 : 1) + (u.pop || 0);
        u.pop = Math.max(0, (u.pop || 0) - dt * 1.2);
        o.scale.x += (s - o.scale.x) * Math.min(1, dt * 8); o.scale.y = o.scale.z = o.scale.x;
        // lueur de la coquille et lumière qui pulse
        u.coque.material.emissiveIntensity += ((ch ? 0.55 + Math.sin(D.t * (elx === "feu" ? 11 : 4)) * 0.2 : selection ? 0.02 : 0.08) - u.coque.material.emissiveIntensity) * Math.min(1, dt * 6);
        if (u.lum) u.lum.intensity = ch ? (elx === "feu" ? 3 + Math.sin(D.t * 17) * 0.6 + Math.random() * 0.5 : 2.8 + Math.sin(D.t * 3) * 0.7) : selection ? 0.5 : 1.4;
        if (u.halo) { const hm = u.halo.material; hm.opacity += ((ch ? 0.55 + Math.sin(D.t * 3) * 0.2 : 0) - hm.opacity) * Math.min(1, dt * 5); u.halo.rotation.z += dt * 0.8; u.halo.scale.setScalar(1 + (ch ? Math.sin(D.t * 2.5) * 0.12 : 0)); u.halo.position.y = 0.52; }
        if (ch) { u.reste = (u.reste || 0) + dt * (elx === "glace" ? 22 : 30); while (u.reste >= 1) { u.reste--; etincelle(o, elx, false); } }
      }
      animerEtincelles(dt);
      if (D.couvoir) for (const o of D.couvoir.userData.oeufs || []) {
        const pret = o.userData.pret;
        o.rotation.z = pret ? Math.sin(D.t * 18) * 0.06 * (Math.sin(D.t * 2) > 0.3 ? 1 : 0) : 0;
        o.userData.coque.material.emissiveIntensity = 0.08 + (pret ? 0.25 + Math.sin(D.t * 4) * 0.15 : o.userData.av * 0.2);
      }
      if (D.nouveau) D.nouveau.anim.update(dt);
      for (let i = D.eclats.length - 1; i >= 0; i--) {
        const e = D.eclats[i]; const u = e.userData; u.v.y -= 9 * dt; e.position.addScaledVector(u.v, dt); e.rotation.x += dt * 6; u.vie -= dt;
        if (u.vie <= 0 || e.position.y < 0) { D.zone.remove(e); D.eclats.splice(i, 1); }
      }
    },
  };
}

function viderZone() {
  while (D.zone.children.length) D.zone.remove(D.zone.children[0]);
  D.oeufsChoix = []; D.couvoir = null; D.nouveau = null; D.etincelles = [];
}

function afficherCouvoir() {
  viderZone();
  const e = E();
  const c = construireCouvoir(e.oeufs.couvoir.niveau);
  c.userData.oeufs = [];
  e.oeufs.couvoir.slots.forEach((s, i) => {
    const o = construireOeuf(s.oeuf.element, 0.7);
    c.userData.nids[i].add(o);
    o.userData.av = avancement(s);
    o.userData.pret = o.userData.av >= 1;
    c.userData.oeufs.push(o);
  });
  D.zone.add(c);
  D.couvoir = c;
  D.orbite.viser(new T.Vector3(0, 0.9, 0), 6.2, D.orbite.thetaV, 1.15);
}

// Choisir un œuf : on le touche (le bouton ou l'œuf en 3D), il s'illumine, puis « Choisir cet œuf » confirme
let selection = null, valider = null;
function selectionner(elx, confirmer) {
  const nouveau = selection !== elx;
  selection = elx; valider = confirmer;
  for (const o of D.oeufsChoix) o.userData.choisi = o.userData.element === elx;
  const o = D.oeufsChoix.find((x) => x.userData.element === elx);
  if (o && nouveau) {
    Son.oeuf(elx);
    o.userData.pop = 0.35;
    for (let k = 0; k < 36; k++) etincelle(o, elx, true);
    const p = o.position;
    D.orbite.viser(new T.Vector3(p.x * 0.6, 1.75, p.z), etroit() ? 10.5 : 6, D.orbite.thetaV, 1.22);
  } else Son.clic();
  document.querySelectorAll(".choix-oeufs > button").forEach((b) => b.classList.toggle("choisi", b.classList.contains(elx)));
  let barre = document.getElementById("oeuf-confirmer");
  if (!barre) { barre = el("div", { id: "oeuf-confirmer", class: "oeuf-confirmer" }); (document.querySelector(".choix-oeufs") || ui).prepend(barre); }
  barre.innerHTML = "";
  barre.append(el("button", { class: "btn principal", style: { padding: "13px 26px", fontSize: "16px" }, onclick: () => { const f = valider; selection = null; valider = null; barre.remove(); if (f) f(); } }, `Choisir l'œuf ${elx === "eau" ? "d'Eau" : elx === "feu" ? "de Feu" : "de Glace"}`));
}
function installerToucherOeufs() {
  const canvas = document.getElementById("scene3d"), ray = new T.Raycaster();
  let d0 = null;
  canvas.addEventListener("pointerdown", (e) => { d0 = { x: e.clientX, y: e.clientY }; });
  canvas.addEventListener("pointerup", (e) => {
    if (!d0 || !ctxJeu || ctxJeu.ecran !== "couvoir" || !D || !D.oeufsChoix.length) return;
    if (Math.hypot(e.clientX - d0.x, e.clientY - d0.y) > 8) return;
    ray.setFromCamera(new T.Vector2((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1), D.camera);
    const h = ray.intersectObjects(D.oeufsChoix, true)[0];
    if (!h) return;
    let o = h.object; while (o && !o.userData.element) o = o.parent;
    const bouton = o && document.querySelector(`.choix-oeufs > button.${o.userData.element}`);
    if (bouton) bouton.click();
  });
}
const etroit = () => window.innerWidth / window.innerHeight < 0.8;
let vueChoix = null;
function afficherChoix(starters, liste = ["feu", "glace", "eau"]) {
  viderZone();
  selection = null;
  const ecart = etroit() ? 1.5 : 1.9;
  liste.forEach((elx, i) => {
    const x = (i - (liste.length - 1) / 2) * ecart;
    const o = construireOeuf(elx, 1.1);
    o.position.set(x, 0.5, 0.6);
    const socle = mesh(new T.CylinderGeometry(0.55, 0.65, 0.5, 8).translate(0, 0.25, 0), mat(0x5a5048, { r: 1 }));
    socle.position.set(x, 0, 0.6);
    const lum = new T.PointLight(ELEMENTS[elx].couleur, 1.4, 3, 2); lum.position.set(x, 1.6, 1.2);
    // Halo au sol, visible quand l'œuf est choisi
    const halo = new T.Mesh(new T.RingGeometry(0.55, 0.85, 32), new T.MeshBasicMaterial({ color: ELEMENTS[elx].couleur, transparent: true, opacity: 0, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide }));
    halo.rotation.x = -Math.PI / 2; halo.position.set(x, 0.52, 0.6);
    D.zone.add(o, socle, lum, halo);
    o.userData.element = elx; o.userData.lum = lum; o.userData.halo = halo; o.userData.x0 = x;
    D.oeufsChoix.push(o);
  });
  // Les œufs se placent entre le titre (en haut) et les boutons (en bas)
  vueChoix = etroit() ? [new T.Vector3(0, 1.3, 0.6), 8 + liste.length * 1.8, 0, 1.22] : [new T.Vector3(0, 1.0, 0.6), 7.0, 0, 1.25];
  D.orbite.viser(...vueChoix);
}

// ---------- Étincelles autour de l'œuf choisi ----------
const GEO_ETINCELLE = new T.OctahedronGeometry(0.05, 0);
const MAT_ETINCELLE = {};
function matEtincelle(c) {
  if (!MAT_ETINCELLE[c]) MAT_ETINCELLE[c] = new T.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.95, blending: T.AdditiveBlending, depthWrite: false });
  return MAT_ETINCELLE[c];
}
const COULEURS_ETINCELLES = { feu: [0xffd060, 0xff8a2a, 0xff4a1a], glace: [0xffffff, 0xbfeaff, 0x7fd6ff], eau: [0x9ffff0, 0x4ad8ff, 0xe0ffff] };
function etincelle(o, elx, burst) {
  const cs = COULEURS_ETINCELLES[elx];
  const m = new T.Mesh(GEO_ETINCELLE, matEtincelle(cs[Math.floor(Math.random() * cs.length)]));
  const a = Math.random() * Math.PI * 2;
  const p = o.position;
  const u = { vie: 0, max: 0.9 + Math.random() * 0.8, elx, phase: Math.random() * 6.28, taille: 0.6 + Math.random() * 0.9 };
  if (burst) {
    m.position.set(p.x, p.y + 0.6, p.z);
    const v = 1.6 + Math.random() * 1.8;
    u.v = new T.Vector3(Math.cos(a) * v, 0.6 + Math.random() * 2.2, Math.sin(a) * v);
    u.g = 3; u.max = 0.7 + Math.random() * 0.5;
  } else if (elx === "feu") {
    // braises qui montent en tremblant
    m.position.set(p.x + Math.cos(a) * 0.4, p.y + 0.15 + Math.random() * 0.3, p.z + Math.sin(a) * 0.4);
    u.v = new T.Vector3(Math.cos(a) * 0.25, 1 + Math.random() * 0.9, Math.sin(a) * 0.25); u.g = -0.4;
  } else if (elx === "glace") {
    // éclats de givre en orbite autour de l'œuf
    u.orbite = { a, r: 0.6 + Math.random() * 0.35, h: 0.1 + Math.random() * 1.3, va: (Math.random() < 0.5 ? -1 : 1) * (1.4 + Math.random()) };
    u.max = 1.4 + Math.random() * 0.8;
  } else {
    // bulles qui remontent en ondulant
    m.position.set(p.x + Math.cos(a) * 0.35, p.y + 0.05, p.z + Math.sin(a) * 0.35);
    u.v = new T.Vector3(0, 0.7 + Math.random() * 0.5, 0); u.g = 0; u.x0 = m.position.x; u.z0 = m.position.z;
    u.taille *= 1.4;
  }
  m.userData = u; m.userData.o = o;
  D.zone.add(m); D.etincelles.push(m);
}
function animerEtincelles(dt) {
  for (let i = D.etincelles.length - 1; i >= 0; i--) {
    const m = D.etincelles[i], u = m.userData;
    u.vie += dt;
    const k = u.vie / u.max;
    if (k >= 1 || !m.parent) { m.parent && m.parent.remove(m); D.etincelles.splice(i, 1); continue; }
    if (u.orbite) {
      const ob = u.orbite, p = u.o.position; ob.a += ob.va * dt;
      m.position.set(p.x + Math.cos(ob.a) * ob.r, p.y + ob.h + Math.sin(D.t * 3 + u.phase) * 0.05, p.z + Math.sin(ob.a) * ob.r);
      m.scale.setScalar(u.taille * (0.5 + 0.5 * Math.abs(Math.sin(D.t * 9 + u.phase))) * Math.sin(k * Math.PI));
    } else {
      u.v.y -= (u.g || 0) * dt;
      m.position.addScaledVector(u.v, dt);
      if (u.x0 !== undefined) { m.position.x = u.x0 + Math.sin(D.t * 7 + u.phase) * 0.08; m.position.z = u.z0 + Math.cos(D.t * 6 + u.phase) * 0.05; }
      m.scale.setScalar(u.taille * (1 - k));
    }
    m.rotation.y += dt * 5; m.rotation.x += dt * 3;
  }
}

// ---------- Éclosion animée ----------
function animerEclosion(element, id, double, apres) {
  viderZone();
  const o = construireOeuf(element, 1.1);
  o.position.set(0, 0.4, 0);
  D.zone.add(o);
  D.orbite.viser(new T.Vector3(0, 1.0, 0), 5.2, D.orbite.thetaV, 1.2);
  Musique.jouer("couvoir");
  let t = 0;
  const lum = new T.PointLight(ELEMENTS[element].couleur, 0, 6, 2); lum.position.set(0, 1.4, 0.8); D.zone.add(lum);
  const fissures = [];
  const couleur = new T.Color(ELEMENTS[element].couleur).getHex();
  const moments = [0.7, 1.4, 2.0, 2.5];
  const etape = setInterval(() => {
    t += 0.05;
    // L'œuf tremble par à-coups, de plus en plus fort, et monte doucement
    const secousse = (t % 0.7) < 0.32 ? Math.sin(t * 38) * (0.05 + t * 0.03) : 0;
    o.rotation.z = secousse; o.rotation.x = secousse * 0.5;
    o.position.y = 0.4 + Math.min(0.35, t * 0.12);
    o.userData.coque.material.emissiveIntensity = Math.min(0.55, 0.1 + t * 0.15);
    lum.intensity = t * 1.4;
    D.orbite.viser(new T.Vector3(0, 1.0 + t * 0.05, 0), (etroit() ? 8.5 : 5.6) - t * 0.4, D.orbite.thetaV + 0.004, 1.2);
    for (const m of moments) if (Math.abs(t - m) < 0.026) {
      Son.craque();
      // Une fissure en zigzag, lumineuse, avec un rayon de lumière qui s'en échappe
      const a = Math.random() * Math.PI * 2, y0 = 0.75 + Math.random() * 0.5;
      const f = new T.Group(); f.position.set(Math.sin(a) * 0.46, y0, Math.cos(a) * 0.46); f.rotation.y = a; o.add(f);
      for (let s = 0; s < 3; s++) { const seg = mesh(new T.BoxGeometry(0.03, 0.18, 0.02), mat(0xffffff, { e: couleur, ei: 2.2 }), false); seg.position.set((s % 2 ? 0.04 : -0.04), s * 0.15 - 0.15, 0); seg.rotation.z = s % 2 ? 0.5 : -0.5; f.add(seg); }
      const rayon = mesh(new T.ConeGeometry(0.14, 1.6, 8, 1, true).rotateX(Math.PI / 2).translate(0, 0, 0.8), new T.MeshBasicMaterial({ color: couleur, transparent: true, opacity: 0.35, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide }), false);
      f.add(rayon); fissures.push(f);
    }
    if (t >= 3.0) {
      clearInterval(etape);
      Son.eclosion();
      // L'œuf éclate : colonne de lumière et onde de choc
      const col = new T.Mesh(new T.CylinderGeometry(0.5, 1.1, 10, 16, 1, true), new T.MeshBasicMaterial({ color: couleur, transparent: true, opacity: 0.6, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide }));
      col.position.y = 5; D.zone.add(col);
      const onde = new T.Mesh(new T.TorusGeometry(0.6, 0.08, 6, 40), new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9, depthWrite: false }));
      onde.rotation.x = Math.PI / 2; onde.position.y = 0.3; D.zone.add(onde);
      let k = 0; const fondu = setInterval(() => { k += 0.05; col.material.opacity = 0.6 * (1 - k); col.scale.set(1 + k, 1, 1 + k); onde.scale.setScalar(1 + k * 6); onde.material.opacity = 0.9 * (1 - k); if (k >= 1) { clearInterval(fondu); D.zone.remove(col); D.zone.remove(onde); } }, 40);
      D.zone.remove(o);
      const mc = o.userData.coque.material;
      for (let k = 0; k < 14; k++) {
        const e = mesh(new T.TetrahedronGeometry(0.12 + Math.random() * 0.1, 0), mc, false);
        e.position.set(0, 0.9, 0);
        e.userData = { v: new T.Vector3((Math.random() - 0.5) * 5, 2 + Math.random() * 4, (Math.random() - 0.5) * 5), vie: 2 };
        D.zone.add(e); D.eclats.push(e);
      }
      const rig = construireDragon(id, 0, {});
      const ech = Math.min(1.6, 1.4 / Math.max(rig.taille.x, rig.taille.z, rig.taille.y));
      rig.racine.scale.setScalar(ech * 1.4);
      D.zone.add(rig.racine);
      const anim = new Animateur(rig);
      anim.jouer("joie");
      D.nouveau = { rig, anim };
      setTimeout(() => { Son.crier(element, 0, id, "joie"); anim.jouer("rugir"); }, 700);
      setTimeout(() => apres && apres(), 1500);
      lum.intensity = 3;
    }
  }, 50);
}

// ---------- Écran ----------
export function ouvrir(ctx, params = {}) {
  ctxJeu = ctx;
  if (!D) construireDecor();
  // Pendant le guide, les 3 premiers œufs se choisissent sur l'écran d'intro
  intro = !!params.intro || E().intro || ["oeuf1", "oeuf2", "oeuf3"].includes(etapeTuto());
  if (params.celebrer) { ctx.moteur.montrer(D, null); Musique.jouer("couvoir"); ui = document.getElementById("ecran"); ui.innerHTML = ""; ctx.cacherInterface(true); celebrer(params.celebrer, params.apres); return; }
  ctx.moteur.montrer(D, null);
  Musique.jouer("couvoir");
  ui = document.getElementById("ecran");
  if (params.eclore) { ui.innerHTML = ""; afficherCouvoir(); faireEclore(); return; }
  if (E().oeufs.couvoir.ruine) {
    // Le couvoir est encore en ruine : on le répare depuis les îles
    ui.innerHTML = ""; ctx.moteur.definirZone(null);
    ui.append(el("section", { class: "couv-panneau panneau" }, el("div", { class: "etiquette" }, "Rocher central"), el("h2", {}, "Le couvoir en ruine"),
      el("p", { class: "doux" }, "Il faut d'abord le réparer. Va sur les îles et touche les ruines du couvoir."),
      el("button", { class: "btn principal", onclick: () => ctx.aller("iles") }, "Aller aux ruines")));
  }
  else if (intro) { ctx.cacherInterface(true); ctx.moteur.definirZone(null); ecranIntro(); }
  else if (E().oeufs.choix > 0) { mode = "choix"; rendre(); }
  else { retourHub(); return; }
  clearInterval(minuteurUI);
  minuteurUI = setInterval(() => { if (!intro && mode === "couvoir") majProgression(); }, 1000);
  if (!intro) signaler("ecran", "couvoir");
}

// Naissance offerte (récompense) : éclosion animée puis retour aux îles
function celebrer(id, apres) {
  const src = PAR_ID[id];
  animerEclosion(src.element, id, false, () => {
    modale({
      titre: `${src.nom} rejoint ta couvée !`,
      contenu: el("div", {}, el("p", {}, `${src.titre}. ${src.histoire}`), el("p", { class: "doux" }, `Il arrive au niveau 3 sur l'île ${src.element === "eau" ? "d'Eau" : src.element === "feu" ? "de Feu" : "de Glace"}, avec son nid.`)),
      boutons: [{ texte: "Continuer", classe: "principal", action: () => { ctxJeu.cacherInterface(false); ctxJeu.aller("iles"); apres && apres(); } }],
      fermable: false,
    });
  });
}
export function fermer() { clearInterval(minuteurUI); ctxJeu.moteur.definirZone(null); }
function retourHub() { ctxJeu.cacherInterface(false); setTimeout(() => ctxJeu.aller("iles", { couvoir: true }), 0); }
// Faut-il vraiment l'écran du couvoir (une cérémonie) ? Sinon on reste sur la carte des îles.
export function ceremonie(params = {}) {
  const e = E();
  return !!(params.intro || params.celebrer || params.eclore || params.choisir || e.intro || ["oeuf1", "oeuf2", "oeuf3"].includes(etapeTuto()));
}

function ecranIntro() {
  ui.innerHTML = "";
  const deja = E().ilesVisibles || [];
  const restants = ["feu", "glace", "eau"].filter((x) => !deja.includes(x));
  afficherChoix(true, restants);
  ui.append(el("div", { class: "titre-intro" }, el("h2", {}, restants.length === 3 ? "Trois œufs !" : "Choisis le prochain œuf"), el("p", {}, "Touche un œuf pour le choisir. Chaque œuf cache un dragon d'un élément, et son île surgira quand il éclora. Le Feu bat la Glace, la Glace bat l'Eau, l'Eau bat le Feu.")));
  const starters = { feu: "braisil", glace: "givrelin", eau: "ondin" };
  const z = el("div", { class: "choix-oeufs" });
  for (const elx of restants) {
    z.append(el("button", { class: `${elx} ${selection === elx ? "choisi" : ""}`, onclick: () => selectionner(elx, () => {
      Son.ok();
      z.remove(); ui.querySelector(".titre-intro")?.remove();
      animerEclosion(elx, starters[elx], false, () => {
        const tuto = enApprentissage();
        changer((e) => {
          const d = nouveauDragon(starters[elx]);
          if (Array.isArray(e.ilesVisibles) && !e.ilesVisibles.includes(elx)) e.ilesVisibles.push(elx);
          if (!Array.isArray(e.ilesVisibles) || e.ilesVisibles.length >= 3) e.intro = false;
          if (!tuto) { e.ressources.brindilles += 15; demarrerMinuteur(); }
          noter(`${PAR_ID[d.id].nom} est né.`);
        });
        const src = PAR_ID[starters[elx]];
        modale({
          titre: `${src.nom} est né !`,
          contenu: el("div", {},
            el("p", {}, `${src.titre}. ${src.histoire}`),
            tuto
              ? el("p", { class: "doux" }, `${MENTOR} : « Regarde bien : son île va surgir des nuages ! »`)
              : el("p", { class: "doux" }, "Il lui faut un nid pour grandir. Sur son île, touche-le puis « Construire le nid ». Le prochain œuf arrive dans 1 heure."),
          ),
          boutons: [{ texte: "Voir son île apparaître", classe: "principal", action: () => { ctxJeu.cacherInterface(false); intro = false; ctxJeu.aller("iles"); setTimeout(() => revelerIle(elx, () => signaler("ile_revelee", elx)), 200); } }],
          fermable: false,
        });
      });
    }) }, el("b", {}, ELEMENTS[elx].nom), el("span", {}, PAR_ID[starters[elx]].nom), el("small", {}, `Bat ${ELEMENTS[ELEMENTS[elx].bat[0]].nom}`)));
  }
  ui.append(z);
}

let blocProgression = null;
const batisseurs = new Set();
let refaireHub = null;
const refaire = () => (refaireHub ? refaireHub() : rendre());
export function initHub(ctx) { ctxJeu = ctx; }
// Contenu d'une fiche du couvoir, sur la carte : « oeufs », « chantier », « livre », « quai », « sablier »
export function blocHub(quoi, refaireFiche) {
  refaireHub = refaireFiche;
  const e = E();
  if (quoi === "oeufs") { blocProgression = el("div", { class: "carte" }); setTimeout(majProgression, 0); return blocProgression; }
  if (quoi === "chantier") return blocChantier();
  if (quoi === "quai") return blocExpedition(refaire, e.tuto && e.tuto.etape === "expedition");
  if (quoi === "sablier") {
    const mi = e.oeufs.minuteur;
    const chaine = el("div", { class: "chaine" });
    for (let k = mi.compte + 1; k <= mi.compte + 6; k++) chaine.append(el("span", { class: k === mi.compte + 1 ? "ici" : "" }, `${attenteOeuf(k)} h`));
    const b = el("div", { class: "carte" },
      el("div", { class: "ligne" }, el("span", {}, "Prochain œuf"), el("b", { class: "num", id: "couv-minuteur" }, mi.prochain ? fmtDuree(mi.prochain - maintenant()) : "dès ton 3e dragon")),
      el("div", { class: "doux", style: { fontSize: "12px" } }, "Les attentes suivantes :"), chaine,
      el("div", { class: "doux", style: { fontSize: "12px" } }, e.dragons.length >= 10 ? "Le sablier s'est endormi : à partir de 10 dragons, les œufs viennent des expéditions, des attaques de village, du dragon-roi et de la boutique." : `Œufs reçus : ${mi.compte}. Le sablier s'arrête à 10 dragons.`));
    if (e.oeufs.reserve.length) {
      const r = el("div", { class: "chaine" });
      for (const o of e.oeufs.reserve) r.append(el("span", { style: { color: ELEMENTS[o.element].couleur } }, ELEMENTS[o.element].nom));
      b.append(el("div", { class: "ligne" }, el("span", {}, "En attente d'une place"), el("b", { class: "num" }, e.oeufs.reserve.length)), r);
    }
    return b;
  }
  if (quoi === "livre") {
    const vus = e.livre.vus.length;
    const coll = el("div", { class: "carte" }, el("div", { class: "ligne" }, el("span", {}, "Dragons découverts"), el("b", { class: "num" }, `${vus}/21`)), barre(vus, 21, ""),
      el("button", { class: "btn petit", onclick: () => ctxJeu.aller("livre") }, "Ouvrir le Livre des dragons"));
    if (livreComplet() && !e.livre.ulChoisi) coll.append(boutonUL());
    return coll;
  }
  return el("div");
}
export function majHub() { majProgression(); }
function boutonUL() {
  const e = E();
  return el("button", { class: "btn principal petit", onclick: () => {
    const liste = el("div", { style: { display: "grid", gap: "6px" } });
    for (const d of e.dragons) liste.append(el("button", { class: "btn", onclick: () => { changer((s) => { const x = s.dragons.find((y) => y.uid === d.uid); x.ul = true; x.ulPossede = true; s.livre.ulDebloque = true; s.livre.ulChoisi = d.id; }); Son.evolution(); toast(`${PAR_ID[d.id].nom} devient UL !`, "bon"); modale({ titre: "Version UL", contenu: "Sa nouvelle robe t'attend sur son île." }); refaire(); return false; } }, `${PAR_ID[d.id].nom} · Nv ${d.niveau}`));
    modale({ titre: "Choisis ton dragon UL", contenu: el("div", {}, el("p", { class: "doux" }, "Tu as complété le Livre ! Un de tes dragons reçoit une robe Ultime, rare. Seule l'apparence change."), liste), boutons: [{ texte: "Plus tard" }] });
  } }, "Choisir mon dragon UL");
}
function blocChantier() {
  const e = E();
  const niv = e.oeufs.couvoir.niveau;
  const def = COUVOIR[niv];
  const b = el("div", { class: "carte", style: { display: "grid", gap: "8px" } },
    el("div", { class: "ligne" }, el("b", {}, `Niveau ${niv + 1}/5 · île Mère`)),
    el("div", { class: "doux", style: { fontSize: "12px" } }, `Tes dragons peuvent monter jusqu'au niveau ${def.nivMax}, et les bâtiments du village jusqu'au niveau ${niv + 1}. ${def.places} œuf${def.places > 1 ? "s" : ""} à la fois.`));
  const ch = e.oeufs.couvoir.chantier;
  if (ch) {
    const reste = Math.max(0, ch.fin - maintenant()), total = ch.fin - ch.debut;
    const gem = Math.max(1, Math.ceil(reste / 60000 / 4));
    const noms = e.dragons.filter((d) => d.chantier).map((d) => PAR_ID[d.id].nom);
    b.append(el("div", { class: "doux", style: { fontSize: "12px" } }, `Chantier en cours vers « ${COUVOIR[ch.niveau].nom} » : ${noms.join(", ")} y travaillent (ils ne peuvent pas combattre).`),
      barre(total - reste, total, "xp"), el("div", { class: "num", style: { fontSize: "13px" } }, `Encore ${fmtDuree(reste)}`),
      el("div", { style: { display: "flex", gap: "6px", flexWrap: "wrap" } },
        el("button", { class: "btn petit principal", disabled: (e.ressources.gemmes || 0) < gem, onclick: () => {
          let ok = false; changer((s) => { if ((s.ressources.gemmes || 0) >= gem) { s.ressources.gemmes -= gem; finirChantier(); ok = true; } });
          if (ok) { Son.evolution(); toast(`${COUVOIR[ch.niveau].nom} terminé !`, "bon"); refaire(); }
        } }, icone("gemmes"), `Finir maintenant · ${gem}`)));
    return b;
  }
  const n = niv + 1, c = CHANTIER_COUVOIR[n];
  if (!c) { b.append(el("div", { class: "doux" }, "Ton couvoir est au niveau maximum.")); return b; }
  const manque = manqueChantier();
  const hauts = e.dragons.filter((d) => d.niveau >= c.haut).length;
  const ok = (v) => el("span", { style: { color: v ? "#8ee6a6" : "#ff9a9a" } }, v ? "✓ " : "✗ ");
  b.append(el("b", { style: { marginTop: "4px" } }, `Prochain niveau : ${COUVOIR[n].nom}`),
    el("div", { style: { fontSize: "12px", display: "grid", gap: "3px" } },
      el("span", {}, ok(e.dragons.length >= c.dragons), `${c.dragons} dragons (${e.dragons.length})`),
      c.nbHaut ? el("span", {}, ok(hauts >= c.nbHaut), `${c.nbHaut} dragon${c.nbHaut > 1 ? "s" : ""} au niveau ${c.haut} (${hauts})`) : null),
    recette(c.recette, e.ressources, energie()));
  // Bâtisseurs : plus il y en a, plus le chantier va vite (ils ne combattent pas pendant ce temps)
  for (const u of [...batisseurs]) if (!e.dragons.some((d) => d.uid === u)) batisseurs.delete(u);
  const choix = el("div", { style: { display: "flex", gap: "5px", flexWrap: "wrap" } });
  for (const d of [...e.dragons].sort((x, y) => y.niveau - x.niveau)) {
    const on = batisseurs.has(d.uid);
    choix.append(el("button", { class: "btn petit" + (on ? " principal" : ""), disabled: !!d.expedition, onclick: () => { on ? batisseurs.delete(d.uid) : batisseurs.add(d.uid); Son.clic(); refaire(); } }, `${PAR_ID[d.id].nom} · ${d.niveau}`));
  }
  const nb = batisseurs.size;
  b.append(el("div", { class: "doux", style: { fontSize: "12px" } }, `Choisis tes bâtisseurs : ${nb ? `chantier de ${fmtDuree(dureeChantier(n, nb))} avec ${nb} dragon${nb > 1 ? "s" : ""}` : `${c.heures - 1} h avec un seul dragon, une heure de moins par dragon en plus`}.`), choix);
  if (manque) b.append(el("div", { class: "alerte", style: { fontSize: "12px" } }, manque));
  b.append(el("button", { class: "btn" + (!manque && nb && assez(c.recette) ? " principal" : ""), disabled: !!manque || !nb || !assez(c.recette), onclick: () => {
    let lance = false;
    changer((s) => {
      if (manqueChantier() || !payer(c.recette)) return;
      const t0 = maintenant();
      s.oeufs.couvoir.chantier = { niveau: n, debut: t0, fin: t0 + dureeChantier(n, nb) };
      for (const d of s.dragons) if (batisseurs.has(d.uid)) d.chantier = true;
      lance = true;
    });
    if (lance) { batisseurs.clear(); Son.recolte("bois"); toast("Le chantier commence !", "bon"); refaire(); }
  } }, "Lancer le chantier"));
  return b;
}
function rendre() {
  const defile = ui && ui.querySelector(".couv-panneau") ? ui.querySelector(".couv-panneau").scrollTop : 0;
  ui.innerHTML = "";
  const e = E();
  ctxJeu.moteur.definirZone(mode === "choix" ? null : window.innerWidth > 560 ? { x: 0.32, y: 0, l: 0.68, h: 1 } : { x: 0, y: 0, l: 1, h: 0.5 });
  if (mode === "choix") { rendreChoix(); return; }
  afficherCouvoir();
  const p = el("section", { class: "couv-panneau panneau" });
  p.append(el("div", {}, el("div", { class: "etiquette" }, "Rocher central"), el("h2", {}, COUVOIR[e.oeufs.couvoir.niveau].nom)));
  // Œufs à choisir
  if (e.oeufs.choix > 0) {
    p.append(el("div", { class: "carte", style: { borderColor: "rgba(242,181,68,.5)" } },
      el("div", { class: "ligne" }, el("b", {}, `${e.oeufs.choix} œuf${e.oeufs.choix > 1 ? "s" : ""} à choisir`), icone("oeuf")),
      el("button", { class: "btn principal", onclick: () => { Son.ok(); mode = "choix"; rendre(); } }, "Choisir un œuf"),
    ));
  }
  // Couvoir
  const def = defCouvoir();
  blocProgression = el("div", { class: "carte" });
  p.append(blocProgression);
  majProgression();
  // Minuteur
  const mi = e.oeufs.minuteur;
  const chaine = el("div", { class: "chaine" });
  for (let k = mi.compte + 1; k <= mi.compte + 6; k++) chaine.append(el("span", { class: k === mi.compte + 1 ? "ici" : "" }, `${attenteOeuf(k)} h`));
  p.append(el("div", { class: "carte" },
    el("div", { class: "ligne" }, el("span", {}, "Prochain œuf"), el("b", { class: "num", id: "couv-minuteur" }, mi.prochain ? fmtDuree(mi.prochain - maintenant()) : "dès ton 3e dragon")),
    el("div", { class: "doux", style: { fontSize: "12px" } }, "Les attentes suivantes :"), chaine,
    el("div", { class: "doux", style: { fontSize: "12px" } }, `Œufs reçus : ${mi.compte}. Il y a aussi une petite chance chaque jour d'un œuf gratuit.`),
  ));
  // Réserve
  if (e.oeufs.reserve.length) {
    const r = el("div", { class: "chaine" });
    for (const o of e.oeufs.reserve) r.append(el("span", { style: { color: ELEMENTS[o.element].couleur } }, ELEMENTS[o.element].nom));
    p.append(el("div", { class: "carte" }, el("div", { class: "ligne" }, el("span", {}, "En attente d'une place"), el("b", { class: "num" }, e.oeufs.reserve.length)), r));
  }
  // Collection et récompense UL
  const vus = e.livre.vus.length;
  const coll = el("div", { class: "carte" }, el("div", { class: "ligne" }, el("span", {}, "Collection"), el("b", { class: "num" }, `${vus}/21`)), barre(vus, 21, ""),
    el("button", { class: "btn petit", onclick: () => ctxJeu.aller("livre") }, "Ouvrir le Livre des dragons"));
  if (livreComplet() && !e.livre.ulChoisi) coll.append(el("button", { class: "btn principal petit", onclick: () => {
    const liste = el("div", { style: { display: "grid", gap: "6px" } });
    for (const d of e.dragons) liste.append(el("button", { class: "btn", onclick: () => { changer((s) => { const x = s.dragons.find((y) => y.uid === d.uid); x.ul = true; x.ulPossede = true; s.livre.ulDebloque = true; s.livre.ulChoisi = d.id; }); Son.evolution(); toast(`${PAR_ID[d.id].nom} devient UL !`, "bon"); modale({ titre: "Version UL", contenu: "Sa nouvelle robe t'attend sur son île." }); rendre(); return false; } }, `${PAR_ID[d.id].nom} · Nv ${d.niveau}`));
    modale({ titre: "Choisis ton dragon UL", contenu: el("div", {}, el("p", { class: "doux" }, "Tu as complété le Livre ! Un de tes dragons reçoit une robe Ultime, rare. Seule l'apparence change."), liste), boutons: [{ texte: "Plus tard" }] });
  } }, "Choisir mon dragon UL"));
  p.append(coll);
  // Le couvoir est aussi l'hôtel du village : on l'agrandit par un chantier
  p.append(blocChantier());
  // Expéditions pour trouver des œufs (rapides pendant le guide)
  p.append(blocExpedition(rendre, E().tuto && E().tuto.etape === "expedition"));
  ui.append(p);
  majProgression();
  p.scrollTop = defile;
}

function majProgression() {
  const e = E();
  const m = document.getElementById("couv-minuteur");
  if (m) { const mi = e.oeufs.minuteur; m.textContent = mi.prochain ? fmtDuree(mi.prochain - maintenant()) : "dès ton 3e dragon"; }
  if (!blocProgression || !blocProgression.isConnected) return;
  const def = defCouvoir();
  const b = blocProgression;
  b.innerHTML = "";
  b.append(el("div", { class: "ligne" }, el("b", {}, `Dans le couvoir (${e.oeufs.couvoir.slots.length}/${def.places})`)));
  if (!e.oeufs.couvoir.slots.length) b.append(el("div", { class: "doux", style: { fontSize: "12px" } }, "Vide. Les œufs choisis viennent se placer ici."));
  let unPret = false;
  e.oeufs.couvoir.slots.forEach((s, i) => {
    const av = avancement(s);
    const pret = av >= 1;
    unPret = unPret || pret;
    b.append(
      el("div", { class: "ligne" }, el("span", { style: { color: ELEMENTS[s.oeuf.element].couleur, fontWeight: 600 } }, `Œuf ${s.oeuf.element === "eau" ? "d'" : "de "}${ELEMENTS[s.oeuf.element].nom}`),
        el("span", { class: "num doux" }, pret ? "prêt !" : fmtDuree(tempsRestant(s)))),
      barre(av, 1, ""),
    );
    if (!pret) {
      // Braises d'éclosion : chacune fait avancer l'œuf d'un quart
      const nb = e.ressources.braises || 0, reste = braisesPourFinir(s);
      const chauffer = (n) => { let k = 0; changer(() => { k = chaufferOeuf(i, n); }); if (k) { Son.ok(); toast(`${k} braise${k > 1 ? "s" : ""} posée${k > 1 ? "s" : ""} sur l'œuf.`, "bon"); } majProgression(); };
      b.append(el("div", { style: { display: "flex", gap: "6px", flexWrap: "wrap", alignItems: "center" } },
        nb > 0
          ? [el("button", { class: "btn petit", onclick: () => chauffer(1) }, icone("braises"), "Braise (+25 %)"),
            el("button", { class: "btn petit" + (nb >= reste ? " principal" : ""), disabled: nb < reste, onclick: () => chauffer(reste) }, `Éclore maintenant (${reste} braise${reste > 1 ? "s" : ""})`)]
          : el("button", { class: "btn petit", onclick: () => { ctxJeu.aller("boutique"); } }, icone("braises"), "Accélérer avec des braises"),
        el("span", { class: "doux", style: { fontSize: "12px" } }, `${nb} braise${nb > 1 ? "s" : ""}`)));
    }
    if (D && D.couvoir && D.couvoir.userData.oeufs && D.couvoir.userData.oeufs[i]) { D.couvoir.userData.oeufs[i].userData.av = av; D.couvoir.userData.oeufs[i].userData.pret = pret; }
  });
  if (unPret) b.append(el("button", { class: "btn principal", onclick: () => ctxJeu.aller("couvoir", { eclore: true }) }, def.places > 1 ? "Faire éclore les œufs prêts" : "Faire éclore"));
}

function faireEclore() {
  const e = E();
  const idx = e.oeufs.couvoir.slots.findIndex((s) => avancement(s) >= 1);
  if (idx < 0) return;
  let res = null;
  const element = e.oeufs.couvoir.slots[idx].oeuf.element;
  changer(() => { res = eclore(idx); });
  if (!res || !res.length) return;
  ctxJeu.cacherInterface(true);
  ui.innerHTML = "";
  const suite = (k) => {
    if (k >= res.length) { signaler("eclosion"); retourHub(); return; }
    const { d, double } = res[k];
    const src = PAR_ID[d.id];
    animerEclosion(src.element, d.id, double, () => {
      modale({
        titre: double ? `Un double : ${src.nom} !` : `${src.nom} est né !`,
        contenu: el("div", {},
          el("p", {}, el("span", { class: "pil " + src.element }, ELEMENTS[src.element].nom), " ", src.titre),
          el("p", {}, src.histoire),
          double ? el("p", { class: "doux" }, "Tu avais déjà tous les dragons de cet élément : celui-ci est un double. Plus tard, les doubles serviront à la reproduction.") : null,
          el("p", { class: "doux" }, `Il vit sur l'île ${src.element === "eau" ? "d'Eau" : src.element === "feu" ? "de Feu" : "de Glace"}. Construis-lui un nid pour qu'il puisse grandir.`),
          livreComplet() && !E().livre.ulDebloque ? el("p", { style: { color: "var(--ambre)" } }, "Tu as complété le Livre des dragons ! Une version UL (Ultime) t'attend : va voir la carte Collection du couvoir.") : null,
        ),
        boutons: [
          { texte: "Voir son île", action: () => { ctxJeu.cacherInterface(false); ctxJeu.aller("iles"); signaler("eclosion"); } },
          { texte: k + 1 < res.length ? "Œuf suivant" : "Continuer", classe: "principal", action: () => suite(k + 1) },
        ],
        fermable: false,
      });
    });
  };
  suite(0);
}

function rendreChoix() {
  const e = E();
  afficherChoix(false);
  ui.append(el("div", { class: "titre-intro" }, el("h2", {}, "Choisis un œuf"), el("p", {}, `Il te reste ${e.oeufs.choix} œuf${e.oeufs.choix > 1 ? "s" : ""} à choisir. L'œuf révèle son élément : le dragon qui en sort est un de ceux que tu n'as pas encore.`)));
  const z = el("div", { class: "choix-oeufs" });
  for (const elx of ["feu", "glace", "eau"]) {
    const complet = elementComplet(elx);
    z.append(el("button", { class: `${elx} ${selection === elx ? "choisi" : ""}`, onclick: () => selectionner(elx, () => {
      Son.ok();
      changer(() => choisirOeuf(elx));
      toast(`Œuf ${elx === "eau" ? "d'" : "de "}${ELEMENTS[elx].nom} ajouté au couvoir.`, "bon");
      if (E().oeufs.choix > 0) { mode = "choix"; rendre(); } else retourHub();
    }) }, el("b", {}, ELEMENTS[elx].nom), el("small", {}, complet ? "Double au hasard" : `${7 - E().dragons.filter((d) => PAR_ID[d.id].element === elx && true).map((d) => d.id).filter((v, i, a) => a.indexOf(v) === i).length} à découvrir`)));
  }
  z.append(el("button", { class: "plus-tard", onclick: () => retourHub() }, el("b", {}, "Plus tard")));
  ui.append(z);
}
