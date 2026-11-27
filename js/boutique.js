// Boutique : on achète des gemmes (de 1 € à 100 €, paiement simulé pendant la bêta), puis tout le reste en gemmes :
// packs de démarrage, braises d'éclosion, ressources, œufs, énergie, versions UL des dragons.
import { construireDragon } from "./modele.js";
import { Animateur } from "./anim.js";
import { ciel, eclairage, Orbite, socle } from "./scene.js";
import { E, changer } from "./etat.js";
import { PAR_ID, ELEMENTS, ENERGIE_MAX, COUVOIR, stadeEffectif } from "./regles.js";
import { el, styles, toast, modale, icone, fermerModale } from "./ui.js";
import { Son, Musique } from "./son.js";
import { utiliserCode } from "./codes.js";

const T = window.THREE;
let D = null, ctxJeu = null, ui = null;
const vue = { uid: null, ul: false, cat: "gemmes", cle: null };

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
.bq-code { display: grid; gap: 4px; }
.bq-code-ligne { display: flex; gap: 6px; }
.bq-code-champ { flex: 1; min-width: 0; padding: 10px 12px; border-radius: 10px; border: 1px solid rgba(190,120,255,.5); background: rgba(255,255,255,.05); color: inherit; font: 13px var(--mono); }
.bq-ruban { justify-self: start; font-size: 10px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; color: #1a1208; background: var(--ambre); border-radius: 6px; padding: 1px 6px; }
.bq-apercu { position: fixed; z-index: 15; left: 50%; transform: translateX(-50%); top: calc(var(--hud) + var(--tuto, 0px) + 10px); padding: 5px 12px; border-radius: 999px; background: rgba(13,14,19,.75); border: 1px solid var(--trait); font-size: 12px; color: var(--doux); white-space: nowrap; }
.bq-vol { position: fixed; left: 0; top: 0; z-index: 60; pointer-events: none; width: 28px; height: 28px; margin: -14px 0 0 -14px; filter: drop-shadow(0 0 8px rgba(242,181,68,.8)); }
.bq-vol svg { width: 28px; height: 28px; }
.bq2 { position: fixed; z-index: 15; right: var(--bord-d); top: calc(var(--hud) + var(--tuto, 0px) + 8px); bottom: calc(var(--bas) + 84px); width: min(450px, 42vw); padding: 14px; display: flex; flex-direction: column; gap: 10px; }
.bq2-tete { display: flex; justify-content: space-between; align-items: flex-end; gap: 10px; }
.bq2-tete h2 { font-size: 24px; }
.bq2 .bq-solde { padding: 7px 12px; cursor: pointer; color: inherit; }
.bq2 .bq-solde b { font-size: 17px; }
.bq2 .bq-solde svg { width: 20px; height: 20px; }
.bq2-onglets { display: flex; gap: 6px; overflow-x: auto; scrollbar-width: none; flex: none; }
.bq2-onglets button { flex: none; padding: 7px 12px; border-radius: 999px; border: 1px solid var(--trait-fort); background: rgba(255,255,255,.04); color: var(--doux); font-weight: 600; font-size: 13px; }
.bq2-onglets button.actif { color: #1a1208; background: var(--ambre); border-color: var(--ambre); }
.bq-liste { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; overflow: auto; align-content: start; flex: 1; min-height: 0; padding: 6px 2px 2px; }
.bq-carte { position: relative; display: grid; justify-items: center; gap: 2px; padding: 10px 6px 9px; border-radius: 14px; border: 1px solid var(--trait); background: rgba(255,255,255,.04); color: var(--texte); text-align: center; transition: transform .15s, border-color .15s, background .15s; border-bottom: 3px solid var(--el, transparent); }
.bq-carte:hover { transform: translateY(-2px); }
.bq-carte.actif { border-color: var(--ambre); background: rgba(242,181,68,.12); box-shadow: 0 0 0 1px rgba(242,181,68,.4) inset, 0 6px 18px rgba(242,181,68,.18); }
.bq-carte.deja { opacity: .5; }
.bq-carte .ic svg { width: 28px; height: 28px; }
.bq-carte b { font-family: var(--titre); font-size: 13px; line-height: 1.1; }
.bq-carte small { font: 11px var(--mono); color: var(--doux); }
.bq-carte .prix { font: 700 12px var(--mono); color: var(--ambre); display: inline-flex; align-items: center; gap: 3px; }
.bq-carte .prix.g { color: #e8c8ff; }
.bq-carte .prix svg { width: 13px; height: 13px; }
.bq-carte i { position: absolute; top: -7px; right: -4px; font-style: normal; font-size: 9.5px; font-weight: 700; background: #b45cff; color: #fff; border-radius: 6px; padding: 1px 5px; white-space: nowrap; max-width: 100%; overflow: hidden; text-overflow: ellipsis; }
.bq2-achat { display: grid; gap: 8px; padding: 12px; border-radius: 14px; border: 1px solid rgba(242,181,68,.4); background: linear-gradient(135deg, rgba(242,181,68,.1), rgba(255,255,255,.02)); flex: none; animation: entre .2s; }
.bq2-achat b { font-family: var(--titre); font-size: 16px; }
.bq2-achat p { margin: 2px 0 0; font-size: 12px; color: var(--doux); }
.bq2-achat .contenu { display: flex; flex-wrap: wrap; gap: 4px 10px; font-size: 12px; margin-top: 4px; }
.bq2-achat .contenu span { display: inline-flex; align-items: center; gap: 4px; }
.bq2-achat .contenu svg { width: 15px; height: 15px; }
.bq2-actions { display: flex; gap: 8px; flex-wrap: wrap; justify-content: flex-end; }
.bq2-actions .btn.principal { min-width: 46%; justify-content: center; }
.bq2-code summary { cursor: pointer; font-size: 12px; color: var(--doux); }
.bq2-code .bq-code { margin-top: 6px; }
@media (max-width: 760px) {
  .bq2 { left: var(--bord-g); right: var(--bord-d); width: auto; top: auto; bottom: calc(var(--bas) + 76px); max-height: 56vh; padding: 12px; gap: 8px; }
  .bq2-tete h2 { font-size: 20px; } .bq2-tete .etiquette { display: none; }
  .bq-liste { display: flex; overflow-x: auto; overflow-y: hidden; flex: none; scroll-snap-type: x proximity; padding-top: 8px; }
  .bq-carte { flex: 0 0 104px; scroll-snap-align: start; }
  .bq2-achat p { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
}
@media (max-width: 420px) { .bq-gemmes { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (max-width: 760px) { .bq-panneau { left: var(--bord-g); right: var(--bord-d); width: auto; top: calc(var(--hud) + var(--tuto, 0px) + 25vh); bottom: calc(var(--bas) + 78px); } }
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
  const etroit = window.innerWidth / window.innerHeight < 0.8 ? 1.7 : 1;
  D.orbite.viser(new T.Vector3(0, h * 0.45, 0), Math.max(2.4, Math.max(h * 1.4, l) * 1.5) * etroit, 0.7, 1.2);
}

export function ouvrir(ctx, params = {}) {
  ctxJeu = ctx;
  if (!D) construireVitrine();
  ui = document.getElementById("ecran");
  Musique.jouer("livre");
  const e = E();
  if (params.uid) { vue.uid = params.uid; vue.ul = true; vue.cat = "ul"; vue.cle = "u" + params.uid; } else vue.ul = false;
  if (!vue.uid || !e.dragons.some((d) => d.uid === vue.uid)) vue.uid = e.dragons[0] ? e.dragons[0].uid : null;
  // Arrivée depuis une fiche : directement le bon rayon
  if (params.voir === "gemmes") { vue.cat = "gemmes"; vue.cle = null; }
  else if (params.voir === "braises") { vue.cat = "braises"; vue.cle = null; }
  else if (params.voir) { vue.cat = "ressources"; vue.cle = null; const r = RESSOURCES.find((x) => x.ic === params.voir); if (r) vue.cle = "r" + r.nom; }
  D.cle = null;
  rendre();
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

// Les gemmes s'obtiennent uniquement avec un code à usage unique, donné par le créateur du jeu
function champCode(apres) {
  const champ = el("input", { type: "text", placeholder: "DW-…", autocomplete: "off", autocapitalize: "characters", spellcheck: "false", class: "bq-code-champ" });
  const msg = el("small", { class: "doux" });
  const bouton = el("button", { class: "btn principal petit", onclick: async () => {
    bouton.disabled = true; msg.textContent = "Vérification…";
    const r = await utiliserCode(champ.value);
    bouton.disabled = false;
    if (!r.ok) { Son.erreur(); msg.textContent = r.raison; msg.style.color = "#ff9a9a"; return; }
    Son.achat(); toast(`Code accepté : +${nb(r.gemmes)} gemmes !`, "bon"); animerAchat("gemmes", 10);
    ctxJeu.majHud(); if (apres) apres(); rendre();
  } }, "Valider le code");
  return el("div", { class: "bq-code" }, el("div", { class: "bq-code-ligne" }, champ, bouton), msg);
}
function acheterGemmes(g) {
  modale({
    titre: `${nb(g.n)} gemmes · ${g.prix}`,
    contenu: el("div", { style: { display: "grid", gap: "10px" } },
      el("p", { style: { margin: 0 } }, `Pour obtenir ${nb(g.n)} gemmes, demande un code au créateur du jeu. Chaque code ne marche qu'une seule fois.`),
      el("p", { class: "doux", style: { margin: 0, fontSize: "12px" } }, "Tu as déjà ton code ? Colle-le ici :"),
      champCode(() => fermerModale())),
    boutons: [{ texte: "Fermer" }],
  });
}
// Achat en gemmes : vérifie le solde, demande confirmation, débite puis donne
// Animation d'achat : l'objet jaillit de la vitrine et vole jusqu'à ta réserve en haut de l'écran
function animerAchat(ic, n = 6) {
  const cible = document.querySelector(`#hud .puce[data-res="${ic}"]`) || document.querySelector('#hud .puce[data-res="gemmes"]');
  const rc = cible ? cible.getBoundingClientRect() : { left: innerWidth / 2, top: 20, width: 0, height: 0 };
  const x1 = rc.left + rc.width / 2, y1 = rc.top + rc.height / 2;
  const x0 = innerWidth * (innerWidth > 760 ? 0.3 : 0.5), y0 = innerHeight * 0.28;
  for (let i = 0; i < n; i++) {
    const e = el("div", { class: "bq-vol" }, icone(ic));
    document.body.append(e);
    const dx = (Math.random() - 0.5) * 120, dy = -40 - Math.random() * 60;
    const a = e.animate([
      { transform: `translate(${x0}px, ${y0}px) scale(.4)`, opacity: 0 },
      { transform: `translate(${x0 + dx}px, ${y0 + dy}px) scale(1.4)`, opacity: 1, offset: 0.3 },
      { transform: `translate(${x1}px, ${y1}px) scale(.6)`, opacity: 0.9 },
    ], { duration: 900 + i * 90, easing: "cubic-bezier(.3,.7,.4,1)", fill: "forwards" });
    a.onfinish = () => { e.remove(); if (cible) cible.animate([{ transform: "scale(1)" }, { transform: "scale(1.25)" }, { transform: "scale(1)" }], { duration: 260 }); };
  }
}
function payer(prix, nom, donner, ic = "gemmes") {
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
      if (ok) { Son.achat(); toast(`${nom} : c'est à toi !`, "bon"); animerAchat(ic); }
      ctxJeu.majHud(); rendre();
    } }],
  });
}
function montrerGemmes() { vue.cat = "gemmes"; vue.cle = null; rendre(); }


// ---------- Modèles de la vitrine : un objet propre à chaque article ----------
const matTissu = (c) => new T.MeshStandardMaterial({ color: c, roughness: 0.95, flatShading: true });
const matBois = () => new T.MeshStandardMaterial({ color: 0x7a4220, roughness: 0.7, flatShading: true });
// Un tas de gemmes en monticule
function tasGemmes(n, rayon, haut, couleurs = [0xb45cff, 0xd08aff, 0x7fd6ff, 0xff6ad8]) {
  const g = new T.Group();
  for (let i = 0; i < n; i++) {
    const a = Math.random() * 6.28, r = Math.sqrt(Math.random()) * rayon;
    const p = gemme(couleurs[i % couleurs.length], 0.06 + Math.random() * 0.06);
    p.position.set(Math.cos(a) * r, (1 - r / rayon) * haut + Math.random() * 0.05, Math.sin(a) * r); p.rotation.set(Math.random(), Math.random() * 6, Math.random());
    g.add(p);
  }
  return g;
}
// Coffre : taille, ouverture, cerclages dorés, contenu qui déborde
// Un vrai coffre creux : fond, quatre parois, doublure en velours, couvercle bombé doublé à l'intérieur.
// Il arrive fermé et s'ouvre (grincement, gemmes qui jaillissent). magique = coffre doré à runes qui brillent.
function coffre(taille, contenu, magique = false) {
  const g = new T.Group();
  const corps = magique ? matOr() : matBois();
  const ferrure = magique ? new T.MeshStandardMaterial({ color: 0x6a3aa8, emissive: 0x4a1a8a, emissiveIntensity: 0.5, metalness: 0.6, roughness: 0.3, flatShading: true }) : matOr();
  const velours = new T.MeshStandardMaterial({ color: magique ? 0x4a1a6a : 0x7a1a2a, roughness: 1, flatShading: true, side: T.DoubleSide, emissive: magique ? 0x3a0a6a : 0x000000, emissiveIntensity: magique ? 0.5 : 0 });
  const L = 1.3 * taille, H = 0.6 * taille, P = 0.85 * taille, e = 0.06 * Math.max(1, taille);
  const c = new T.Group(); g.add(c);
  const boite = (sx, sy, sz, m, x, y, z) => { const b = new T.Mesh(new T.BoxGeometry(sx, sy, sz), m); b.position.set(x, y, z); c.add(b); return b; };
  boite(L, e, P, corps, 0, e / 2, 0);
  boite(L, H, e, corps, 0, H / 2, P / 2 - e / 2); boite(L, H, e, corps, 0, H / 2, -P / 2 + e / 2);
  boite(e, H, P - 2 * e, corps, L / 2 - e / 2, H / 2, 0); boite(e, H, P - 2 * e, corps, -L / 2 + e / 2, H / 2, 0);
  // Doublure intérieure
  const fond = new T.Mesh(new T.PlaneGeometry(L - 2 * e, P - 2 * e), velours); fond.rotation.x = -Math.PI / 2; fond.position.y = e + 0.005; c.add(fond);
  for (const s of [-1, 1]) { const m = new T.Mesh(new T.PlaneGeometry(L - 2 * e, H - e), velours); m.position.set(0, (H + e) / 2, s * (P / 2 - e - 0.004)); c.add(m); }
  // Cerclages et bordure du haut
  for (const x of [-0.36, 0.36]) { boite(0.07 * taille, H + 0.02, 0.02, ferrure, x * L, H / 2, P / 2 + 0.005); boite(0.07 * taille, H + 0.02, 0.02, ferrure, x * L, H / 2, -P / 2 - 0.005); }
  boite(L + 0.03, 0.05, 0.04, ferrure, 0, H, P / 2); boite(L + 0.03, 0.05, 0.04, ferrure, 0, H, -P / 2);
  const serrure = boite(0.16 * taille, 0.2 * taille, 0.05, ferrure, 0, H - 0.12 * taille, P / 2 + 0.02);
  if (magique) for (let k = 0; k < 4; k++) boite(0.12 * taille, 0.03, 0.02, new T.MeshBasicMaterial({ color: 0xd8a8ff }), (k - 1.5) * 0.22 * L, H * 0.35, P / 2 + 0.012);
  // Couvercle bombé : bois dehors, velours dedans, articulé à l'arrière
  const couvercle = new T.Group(); couvercle.position.set(0, H, -P / 2); c.add(couvercle);
  const geoC = (r) => new T.CylinderGeometry(r, r, L, 14, 1, false, 0, Math.PI).rotateZ(Math.PI / 2).translate(0, 0, P / 2);
  couvercle.add(new T.Mesh(geoC(P / 2), corps));
  const dedans = new T.Mesh(geoC(P / 2 - 0.02), velours); couvercle.add(dedans);
  for (const x of [-0.36, 0.36]) { const b = new T.Mesh(new T.CylinderGeometry(P / 2 + 0.015, P / 2 + 0.015, 0.07 * taille, 14, 1, true, 0, Math.PI).rotateZ(Math.PI / 2).translate(x * L, 0, P / 2), ferrure); b.material.side = T.DoubleSide; couvercle.add(b); }
  const fermoir = new T.Mesh(new T.BoxGeometry(0.14 * taille, 0.12 * taille, 0.04), ferrure); fermoir.position.set(0, -0.02, P + 0.01); couvercle.add(fermoir);
  couvercle.rotation.x = 0;
  if (contenu) { contenu.position.y = e + 0.02; c.add(contenu); contenu.scale.setScalar(0.001); }
  const lumiere = new T.PointLight(magique ? 0xc08aff : 0xffd27a, 0, 3); lumiere.position.y = H * 0.8; c.add(lumiere);
  // Gemmes qui jaillissent à l'ouverture
  const jets = [];
  let ouvert = 0, jailli = false;
  const maj = (t, dt = 0.016) => {
    ouvert = Math.min(1, ouvert + dt / 1.1);
    const k = ouvert < 0.25 ? 0 : (ouvert - 0.25) / 0.75;
    const e2 = 1 - Math.pow(1 - k, 3);
    couvercle.rotation.x = -1.95 * e2 + (ouvert < 0.25 ? Math.sin(ouvert * 80) * 0.03 : Math.sin(t * 1.4) * 0.04 * e2);
    if (contenu) contenu.scale.setScalar(Math.max(0.001, Math.min(1, k * 1.4)));
    lumiere.intensity = e2 * (magique ? 2.4 : 1.6) * (0.85 + Math.sin(t * 4) * 0.15);
    if (!jailli && k > 0.15) {
      jailli = true;
      Son.coffre && Son.coffre(magique);
      for (let i = 0; i < 16; i++) { const m = gemme([0xb45cff, 0x7fd6ff, 0xffd86a, 0xff6ad8][i % 4], 0.05 + Math.random() * 0.04); m.position.set(0, H, 0); m.userData.v = new T.Vector3((Math.random() - 0.5) * 2.4, 2.5 + Math.random() * 2, (Math.random() - 0.5) * 2.4); m.userData.vie = 1.4; c.add(m); jets.push(m); }
    }
    for (let i = jets.length - 1; i >= 0; i--) { const m = jets[i]; m.userData.v.y -= 6 * dt; m.position.addScaledVector(m.userData.v, dt); m.rotation.y += dt * 6; m.userData.vie -= dt; if (m.position.y < 0.04) { m.position.y = 0.04; m.userData.v.set(0, 0, 0); } if (m.userData.vie <= 0) { m.scale.multiplyScalar(0.9); if (m.scale.x < 0.05) { c.remove(m); jets.splice(i, 1); } } }
  };
  void serrure; void dedans;
  return { g, couvercle, H, L, P, maj };
}
function bourse(pleine) {
  const g = new T.Group();
  const sac = new T.Mesh(new T.SphereGeometry(0.42, 12, 9), matTissu(0x8a5a32)); sac.scale.set(1, pleine ? 0.95 : 0.8, 1); sac.position.y = 0.36; g.add(sac);
  const col = new T.Mesh(new T.CylinderGeometry(0.14, 0.22, 0.22, 10), matTissu(0x7a4a28)); col.position.y = 0.76; g.add(col);
  const lien = new T.Mesh(new T.TorusGeometry(0.16, 0.025, 5, 16), matOr()); lien.rotation.x = Math.PI / 2; lien.position.y = 0.72; g.add(lien);
  const haut = tasGemmes(pleine ? 7 : 3, 0.12, 0.08); haut.position.y = 0.86; g.add(haut);
  if (pleine) { const sol = tasGemmes(10, 0.9, 0.05); sol.position.y = 0.02; g.add(sol); }
  return g;
}
function objetGemmes(niv) {
  const g = new T.Group(), majs = [];
  const lum = (c, i, y) => { const l = new T.PointLight(c, i, 6); l.position.y = y; g.add(l); return l; };
  let haut = 1;
  if (niv <= 1) g.add(bourse(niv === 1));
  else {
    const taille = [0, 0, 0.6, 0.85, 1.15, 1.5][niv];
    const magique = niv >= 4;
    const contenu = tasGemmes([0, 0, 18, 32, 55, 85][niv], 0.36 * taille, 0.7 * taille);
    const c = coffre(taille, contenu, magique); g.add(c.g); haut = c.H + 0.4;
    majs.push((t, dt) => c.maj(t, dt));
    if (magique) {
      // Des gemmes flottent au-dessus du coffre ouvert
      const flott = new T.Group(); flott.position.y = c.H + 0.5; g.add(flott);
      for (let k = 0; k < 6; k++) { const gm = gemme([0xb45cff, 0x7fd6ff, 0xff6ad8][k % 3], 0.09); const a = (k / 6) * 6.28; gm.position.set(Math.cos(a) * 0.55 * taille, 0, Math.sin(a) * 0.55 * taille); flott.add(gm); }
      majs.push((t) => { flott.rotation.y = t * 0.7; flott.children.forEach((gm, i) => { gm.position.y = Math.sin(t * 2 + i) * 0.1; gm.rotation.y = t * 2; }); flott.scale.setScalar(Math.min(1, Math.max(0.001, c.couvercle.rotation.x / -1.95))); });
    }
    if (niv >= 4) { const tas = tasGemmes(niv === 5 ? 60 : 30, niv === 5 ? 1.7 : 1.3, niv === 5 ? 0.35 : 0.2); g.add(tas); }
    if (niv === 5) {
      // La couronne au sommet et des rayons de lumière
      const cour = new T.Group(); cour.position.y = c.H + 0.85; g.add(cour);
      cour.add(new T.Mesh(new T.CylinderGeometry(0.28, 0.28, 0.16, 12, 1, true), matOr()));
      for (let k = 0; k < 6; k++) { const p = new T.Mesh(new T.ConeGeometry(0.06, 0.18, 4), matOr()); const a = (k / 6) * 6.28; p.position.set(Math.cos(a) * 0.28, 0.16, Math.sin(a) * 0.28); cour.add(p); const gm = gemme([0xff4a6a, 0x7fd6ff, 0x8aff8a][k % 3], 0.04); gm.position.set(Math.cos(a) * 0.29, 0.02, Math.sin(a) * 0.29); cour.add(gm); }
      const rayons = new T.Group(); rayons.position.y = c.H; g.add(rayons);
      for (let k = 0; k < 7; k++) { const r = new T.Mesh(new T.ConeGeometry(0.22, 3.2, 4, 1, true).translate(0, 1.6, 0), new T.MeshBasicMaterial({ color: 0xe0b0ff, transparent: true, opacity: 0.16, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide })); r.rotation.z = (k - 3) * 0.22; rayons.add(r); }
      majs.push((t) => { cour.rotation.y = t * 0.8; cour.position.y = c.H + 0.85 + Math.sin(t * 1.6) * 0.06; rayons.rotation.y = t * 0.3; rayons.children.forEach((r, i) => { r.material.opacity = 0.1 + Math.max(0, Math.sin(t * 2 + i)) * 0.12; }); });
      haut = c.H + 1.4;
    }
  }
  const l = lum(0xc08aff, 1.2 + niv * 0.45, haut + 0.3);
  g.add(etincelles(12 + niv * 8, 0.8 + niv * 0.25, haut + 0.4, 0xffffff));
  majs.push((t) => { l.intensity = 1.2 + niv * 0.45 + Math.sin(t * 3) * 0.3; });
  return { g, majs, haut };
}
function objetPack(n, taille, coeur) {
  const g = new T.Group(), majs = [];
  const oeufs = new T.Group();
  const couls = [0xff7a3a, 0x7fd6ff, 0x2fd0c0];
  // Paille au fond, œufs couchés dedans
  for (let k = 0; k < 18; k++) { const b = new T.Mesh(new T.CylinderGeometry(0.012, 0.012, 0.3 * taille, 3), new T.MeshStandardMaterial({ color: 0xd8b860, roughness: 1 })); b.rotation.set(Math.PI / 2, 0, Math.random() * 3); b.position.set((Math.random() - 0.5) * 0.9 * taille, 0.02, (Math.random() - 0.5) * 0.5 * taille); oeufs.add(b); }
  for (let i = 0; i < n; i++) { const o = oeuf(couls[i % 3]); const k = n <= 3 ? (i - 1) * 0.33 : ((i % 4) - 1.5) * 0.26; o.position.set(k * taille, 0.16 + Math.floor(i / 4) * 0.14, ((Math.floor(i / 4) % 2) - 0.5) * 0.2 * taille); o.rotation.z = (i % 2 ? 0.4 : -0.4); o.scale.setScalar(Math.min(1, 0.75 + taille * 0.12)); oeufs.add(o); }
  const c = coffre(taille, oeufs, coeur); g.add(c.g);
  majs.push((t, dt) => c.maj(t, dt));
  if (coeur) { const h = new T.Mesh(new T.SphereGeometry(0.16, 10, 8), new T.MeshStandardMaterial({ color: 0xff3a5a, emissive: 0xff1a3a, emissiveIntensity: 0.8, roughness: 0.3, flatShading: true })); h.position.set(0.9 * taille, 0.2, 0.5); g.add(h); majs.push((t) => { h.scale.setScalar(1 + Math.max(0, Math.sin(t * 5)) * 0.15); }); }
  for (let i = 0; i < 8 + n * 2; i++) { const p = piece(); const a = Math.random() * 6.28, r = 0.6 * taille + 0.3 + Math.random() * 0.6; p.position.set(Math.cos(a) * r, 0.02 + Math.random() * 0.04, Math.sin(a) * r); g.add(p); }
  const l = new T.PointLight(0xffc86a, 2, 6); l.position.y = c.H + 0.6; g.add(l);
  g.add(etincelles(16 + n * 2, 1 + taille * 0.4, 1.4, 0xffe8a0));
  majs.push((t) => { l.intensity = 1.7 + Math.sin(t * 4) * 0.35; oeufs.children.forEach((o, i) => { o.position.y = 0.16 + Math.floor(i / 4) * 0.14 + Math.sin(t * 2 + i) * 0.03; }); });
  return { g, majs, haut: c.H + 0.8 };
}
function objetBraises(n) {
  const o = objetVitrine("braises");
  // Plus de braises dans le tas pour les gros lots
  const extra = n >= 80 ? 14 : n >= 30 ? 7 : 0;
  for (let i = 0; i < extra; i++) {
    const m = new T.Mesh(new T.DodecahedronGeometry(0.1 + Math.random() * 0.1, 0), new T.MeshStandardMaterial({ color: 0x2a1610, emissive: 0xff5a0a, emissiveIntensity: 0.7, roughness: 0.8, flatShading: true }));
    const a = Math.random() * 6.28, r = 0.6 + Math.random() * 0.5; m.position.set(Math.cos(a) * r, 0.1, Math.sin(a) * r); o.g.add(m);
  }
  return { ...o, haut: 1.2 };
}
// Ressources : un petit tas ou un objet qui dit ce qu'on achète
function objetRessource(ic) {
  const g = new T.Group(), majs = [];
  const tas = (fab, n, r) => { for (let i = 0; i < n; i++) { const m = fab(i); const a = Math.random() * 6.28, d = Math.sqrt(Math.random()) * r; m.position.set(Math.cos(a) * d, m.position.y + (1 - d / r) * 0.25, Math.sin(a) * d); m.rotation.y = Math.random() * 6; g.add(m); } };
  const std = (c, o = {}) => new T.MeshStandardMaterial({ color: c, roughness: o.r ?? 0.7, metalness: o.m ?? 0.05, emissive: o.e ?? 0, emissiveIntensity: o.ei ?? 0, flatShading: true });
  if (ic === "energie") return objetVitrine("ressources");
  if (ic === "oeuf") { const cous = new T.Mesh(new T.CylinderGeometry(0.55, 0.6, 0.18, 12), matTissu(0x8a2a4a)); cous.position.y = 0.09; g.add(cous); const o = oeuf(0xf2e6cc); o.scale.setScalar(1.9); o.position.y = 0.55; g.add(o); majs.push((t) => { o.rotation.y = t; o.position.y = 0.55 + Math.sin(t * 2) * 0.04; }); }
  else if (ic === "rations") tas((i) => { const v = new T.Group(); v.add(new T.Mesh(new T.SphereGeometry(0.14, 8, 6).scale(1.3, 0.8, 1), std(0x9a3a22))); const os = new T.Mesh(new T.CylinderGeometry(0.03, 0.03, 0.28, 5).rotateZ(Math.PI / 2), std(0xf0e6d0)); os.position.x = 0.2; v.add(os); v.position.y = 0.1; return v; }, 12, 0.7);
  else if (ic === "brindilles") tas(() => { const b = new T.Mesh(new T.CylinderGeometry(0.03, 0.04, 0.7, 5).rotateZ(Math.PI / 2), std(0x8a6a44)); b.position.y = 0.05; return b; }, 26, 0.55);
  else if (ic === "pierres") tas(() => { const p = new T.Mesh(new T.DodecahedronGeometry(0.12 + Math.random() * 0.08, 0), std(0x8a8478)); p.position.y = 0.1; return p; }, 18, 0.7);
  else if (ic === "obsidienne" || ic === "givrite" || ic === "corail") {
    const c = { obsidienne: [0x2a1a2a, 0xff4a1a], givrite: [0xbfeaff, 0x5ab0e8], corail: [0xff7aa8, 0xff4a7a] }[ic];
    for (let i = 0; i < 9; i++) { const m = new T.Mesh(new T.OctahedronGeometry(0.16 + Math.random() * 0.14, 0).scale(0.6, 1.8, 0.6), std(c[0], { r: 0.2, m: 0.3, e: c[1], ei: 0.35 })); const a = (i / 9) * 6.28, d = i === 0 ? 0 : 0.35 + Math.random() * 0.2; m.position.set(Math.cos(a) * d, 0.3, Math.sin(a) * d); m.rotation.set((Math.random() - 0.5) * 0.6, 0, (Math.random() - 0.5) * 0.6); g.add(m); }
  }
  else if (ic === "rations_feu") tas(() => { const p = new T.Mesh(new T.ConeGeometry(0.07, 0.32, 6).rotateZ(Math.PI / 2), std(0xd8261a, { e: 0x6a0a00, ei: 0.4 })); p.position.y = 0.08; return p; }, 16, 0.55);
  else if (ic === "rations_glace") tas(() => { const p = new T.Mesh(new T.IcosahedronGeometry(0.08, 0), std(0x7fd6ff, { e: 0x2a6a9a, ei: 0.4 })); p.position.y = 0.08; return p; }, 30, 0.55);
  else if (ic === "rations_eau") tas(() => { const p = new T.Group(); p.add(new T.Mesh(new T.SphereGeometry(0.1, 8, 6).scale(1.8, 0.8, 0.7), std(0x2f9fb0))); const q = new T.Mesh(new T.ConeGeometry(0.08, 0.12, 4).rotateZ(Math.PI / 2), std(0x2f9fb0)); q.position.x = -0.22; p.add(q); p.position.y = 0.09; return p; }, 12, 0.6);
  else if (ic === "coeurs") { const h = new T.Mesh(new T.SphereGeometry(0.32, 12, 10), std(0xff3a5a, { r: 0.3, e: 0xff1a3a, ei: 0.8 })); h.position.y = 0.7; g.add(h); majs.push((t) => { h.scale.setScalar(1 + Math.max(0, Math.sin(t * 5)) * 0.14); h.rotation.y = t; }); }
  const l = new T.PointLight(0xffe0b0, 1.4, 5); l.position.y = 1.3; g.add(l);
  g.add(etincelles(14, 0.9, 1.2, 0xfff2b0));
  g.traverse((c) => { if (c.userData.maj) majs.push(c.userData.maj); });
  return { g, majs, haut: 1 };
}

// Quel article est montré ? On reconstruit la vitrine seulement quand il change
function montrerArticle(art) {
  if (!art) return;
  if (art.cat === "ul") { const d = E().dragons.find((x) => x.uid === art.uid); if (d) montrer(d, vue.ul); return; }
  const cle = "art|" + art.cle;
  if (cle === D.cle) return;
  D.cle = cle; D.anim = null;
  while (D.support.children.length) D.support.remove(D.support.children[0]);
  const o = art.modele();
  D.support.add(o.g); D.majs = o.majs || [];
  o.g.traverse((c) => { if (c.userData.maj && !D.majs.includes(c.userData.maj)) D.majs.push(c.userData.maj); });
  // Petit bond d'arrivée
  o.g.scale.setScalar(0.4); D.majs.push((t, dt) => { if (o.g.scale.x < 1) o.g.scale.setScalar(Math.min(1, o.g.scale.x + dt * 3.5)); });
  const etroit = window.innerWidth / window.innerHeight < 0.8 ? 2.05 : 1;
  const h = o.haut || 1.2;
  D.orbite.viser(new T.Vector3(0, h * 0.5, 0), (3.4 + h * 1.5) * etroit, 0.7, 1.15);
}

// ---------- Les articles ----------
const CATS = [["gemmes", "Gemmes"], ["packs", "Packs"], ["braises", "Braises"], ["ressources", "Ressources"], ["ul", "Robes UL"]];
const NOMS_GEMMES = ["Petite bourse", "Bourse pleine", "Coffret", "Coffre", "Grand coffre", "Coffre du dragon-roi"];
function articles(cat) {
  const e = E();
  if (cat === "gemmes") return GEMMES.map((g, i) => ({ cat, cle: "g" + i, nom: `${NOMS_GEMMES[i]} · ${nb(g.n)} gemmes`, court: NOMS_GEMMES[i], sous: nb(g.n), ic: "gemmes", prixTxt: g.prix, ruban: g.bonus,
    texte: `${nb(g.n)} gemmes${g.bonus ? ` (${g.bonus} offertes)` : ""}. Pour les obtenir, demande un code au créateur du jeu : chaque code ne marche qu'une fois.`,
    modele: () => objetGemmes(i), acheter: () => acheterGemmes(g) }));
  if (cat === "packs") return PACKS.map((pk, i) => {
    const deja = pk.unique && e.achats && e.achats[pk.id];
    return { cat, cle: "p" + pk.id, nom: pk.nom, court: pk.nom.replace("Pack du ", "").replace("Pack de l'", "").replace(/^./, (c) => c.toUpperCase()), sous: pk.contenu[0][1], ic: "oeuf", prix: pk.prix, ruban: pk.ruban, texte: pk.texte, contenu: pk.contenu, deja: deja ? "Déjà acheté" : null,
      modele: () => objetPack([3, 6, 12][i], [0.75, 1, 1.3][i], i === 2), acheter: () => payer(pk.prix, pk.nom, (s) => { pk.donner(s); s.achats = s.achats || {}; s.achats[pk.id] = (s.achats[pk.id] || 0) + 1; }, "oeuf") };
  });
  if (cat === "braises") return BRAISES.map(([n, prix, txt]) => ({ cat, cle: "b" + n, nom: `${n} braises d'éclosion`, court: `${n} braises`, sous: "", ic: "braises", prix,
    texte: `${txt} Une braise fait avancer un œuf d'un quart : 4 braises = éclosion immédiate. Tu en as ${e.ressources.braises || 0}.`, modele: () => objetBraises(n), acheter: () => payer(prix, `${n} braises d'éclosion`, (s) => { s.ressources.braises = (s.ressources.braises || 0) + n; }, "braises") }));
  if (cat === "ressources") return RESSOURCES.map((r) => ({ cat, cle: "r" + r.nom, nom: r.nom, court: r.nom.replace(/^\d+ /, "").replace("Recharge d'", "").replace(/^./, (c) => c.toUpperCase()), sous: (r.nom.match(/^\d+/) || [""])[0], ic: r.ic, prix: r.prix, texte: r.texte, modele: () => objetRessource(r.ic), acheter: () => payer(r.prix, r.nom, r.donner, r.ic) }));
  if (cat === "ul") return e.dragons.map((d) => ({ cat, cle: "u" + d.uid, uid: d.uid, nom: `${PAR_ID[d.id].nom} UL`, court: PAR_ID[d.id].nom, sous: d.ulPossede ? "✦ possédée" : "", ic: "oeuf", prix: d.ulPossede ? null : PRIX_UL, el: PAR_ID[d.id].element,
    texte: "Une robe rare, aux reflets métalliques et aux couleurs uniques. Seule l'apparence change : aucun avantage en combat.",
    acheter: () => d.ulPossede ? (changer((s) => { const x = s.dragons.find((y) => y.uid === d.uid); x.ul = !x.ul; }), Son.achat(), rendre()) : payer(PRIX_UL, `${PAR_ID[d.id].nom} UL`, (s) => { const x = s.dragons.find((y) => y.uid === d.uid); x.ulPossede = true; x.ul = true; }) }));
  return [];
}

function rendre() {
  const ancien = document.querySelector(".bq-liste");
  const defile = ancien ? [ancien.scrollLeft, ancien.scrollTop] : [0, 0];
  ui.innerHTML = "";
  const e = E();
  const large = window.innerWidth > 760;
  if (!CATS.some(([k]) => k === vue.cat)) vue.cat = "gemmes";
  const liste = articles(vue.cat);
  if (!liste.some((a) => a.cle === vue.cle)) vue.cle = liste[0] ? liste[0].cle : null;
  const art = liste.find((a) => a.cle === vue.cle);
  const p = el("section", { class: "bq2 panneau" });
  // En-tête : solde et code
  p.append(el("div", { class: "bq2-tete" }, el("div", {}, el("div", { class: "etiquette" }, "Marché des dragonniers"), el("h2", {}, "Boutique")),
    el("button", { class: "bq-solde", onclick: () => { vue.cat = "gemmes"; vue.cle = "g0"; Son.clic(); rendre(); } }, icone("gemmes"), el("b", {}, nb(e.ressources.gemmes || 0)))));
  // Onglets
  p.append(el("div", { class: "bq2-onglets" }, CATS.map(([k, nom]) => el("button", { class: vue.cat === k ? "actif" : "", onclick: () => { Son.clic(); vue.cat = k; vue.cle = null; rendre(); } }, nom))));
  // Les articles : on touche pour voir l'objet dans la vitrine
  const l = el("div", { class: "bq-liste" });
  for (const a of liste) {
    l.append(el("button", { class: `bq-carte ${a.cle === vue.cle ? "actif" : ""} ${a.deja ? "deja" : ""}`, style: a.el ? { "--el": ELEMENTS[a.el].couleur } : null, onclick: () => { Son.clic(); vue.cle = a.cle; if (a.cat === "ul") { vue.uid = a.uid; } rendre(); } },
      a.ruban ? el("i", {}, a.ruban) : null,
      el("span", { class: "ic" }, icone(a.ic)), el("b", {}, a.court), a.sous ? el("small", {}, a.sous) : null,
      el("span", { class: "prix" + (a.prixTxt ? "" : " g") }, a.deja ? a.deja : a.prixTxt ? a.prixTxt : a.prix ? [icone("gemmes"), nb(a.prix)] : "à toi")));
  }
  if (!liste.length) l.append(el("p", { class: "doux" }, vue.cat === "ul" ? "Fais éclore un dragon pour voir sa robe UL." : "Rien ici pour l'instant."));
  p.append(l);
  // Barre d'achat de l'article choisi
  if (art) {
    const barreAchat = el("div", { class: "bq2-achat" },
      el("div", {}, el("b", {}, art.nom), el("p", {}, art.texte),
        art.contenu ? el("div", { class: "contenu" }, art.contenu.map(([i, t]) => el("span", {}, icone(i), t))) : null));
    const actions = el("div", { class: "bq2-actions" });
    if (art.cat === "ul") {
      const d = e.dragons.find((x) => x.uid === art.uid);
      actions.append(el("button", { class: "btn petit", onclick: () => { vue.ul = !vue.ul; Son.evolution(); D.cle = null; rendre(); } }, vue.ul ? "Voir la robe normale" : "Voir la robe UL"));
      actions.append(el("button", { class: "btn principal", onclick: art.acheter }, d && d.ulPossede ? (d.ul ? "Remettre la robe normale" : "Porter la robe UL") : [icone("gemmes"), `Acheter · ${nb(PRIX_UL)}`]));
    } else actions.append(el("button", { class: "btn principal", disabled: !!art.deja, onclick: art.acheter }, art.deja ? art.deja : art.prixTxt ? `Acheter · ${art.prixTxt}` : [icone("gemmes"), `Acheter · ${nb(art.prix)}`]));
    barreAchat.append(actions);
    p.append(barreAchat);
  }
  if (vue.cat === "gemmes") p.append(el("details", { class: "bq2-code" }, el("summary", {}, "J'ai déjà un code"), champCode()));
  ui.append(p);
  ctxJeu.moteur.montrer(D, large ? { x: 0, y: 0, l: 1 - Math.min(470, window.innerWidth * 0.42) / window.innerWidth, h: 1 } : { x: 0, y: 0.02, l: 1, h: Math.max(0.2, (p.getBoundingClientRect().top - 8) / window.innerHeight - 0.02) });
  l.scrollLeft = defile[0]; l.scrollTop = defile[1];
  // Garde l'article choisi visible dans la liste
  const actif = l.querySelector(".bq-carte.actif");
  if (actif && !large) { const r = actif.getBoundingClientRect(), rl = l.getBoundingClientRect(); if (r.left < rl.left || r.right > rl.right) l.scrollLeft += r.left - rl.left - 20; }
  if (art && art.cat === "ul") { const d = e.dragons.find((x) => x.uid === art.uid); if (d) montrer(d, vue.ul); }
  else montrerArticle(art);
}
