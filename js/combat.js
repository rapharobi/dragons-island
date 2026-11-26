// Combats : 9 tours, choix secrets simultanés (dragon puis posture), le plus de dégâts infligés gagne.
import { construireDragon } from "./modele.js";
import { Animateur } from "./anim.js";
import { ciel, eclairage, Orbite, versEcran } from "./scene.js";
import { mat, mesh, bloc } from "./outils3d.js";
import { E, changer, depenserEnergie, energie, gagnerXp, maintenant, noter, rationsPourSoigner, soignerEquipe, remplirCouvoir } from "./etat.js";
import { DRAGONS, PAR_ID, ELEMENTS, TOURS, COUT, degats, tirerAlea, domine, postures, pvMax, stadeEffectif, stadeDuNiveau, xpCombat, ESPERANCE, nomStade, armuresDe } from "./regles.js";
import { preparer, ouvrirSalon, nouveauCode, codeValide, identifiant, modeReseau, lienInvitation, VERSION_RESEAU, aleaGraine } from "./reseau.js";
import { el, styles, toast, modale, fermerModale, barre, icone, couleurElement } from "./ui.js";
import { signaler, etape as etapeTuto, afficher as afficherTuto, cacherBulle } from "./tuto.js";
import { Son, Musique } from "./son.js";

const T = window.THREE;
let D = null, ctxJeu = null, ui = null, C = null;

styles("combat", `
.cb-prep { position: fixed; z-index: 15; inset: calc(var(--hud) + var(--tuto, 0px) + 8px) var(--bord-d) calc(var(--bas) + 84px) var(--bord-g); display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1.4fr); gap: 14px; max-width: 1100px; margin: 0 auto; }
.cb-prep > section { padding: 16px; overflow: auto; overflow-x: hidden; display: grid; gap: 12px; align-content: start; min-width: 0; }
.cb-prep > section > * { min-width: 0; max-width: 100%; }
.cb-prep .mode-btn, .cb-ligne, .cb-ligne * { min-width: 0; overflow-wrap: anywhere; }
.cb-prep h2 { font-size: 24px; }
.mode-btn { display: grid; gap: 4px; padding: 14px; border-radius: 14px; border: 1px solid var(--trait-fort); background: rgba(255,255,255,.04); text-align: left; }
.mode-btn.actif { border-color: var(--ambre); background: rgba(242,181,68,.1); }
.mode-btn b { font-family: var(--titre); font-size: 17px; }
.mode-btn span { font-size: 12px; color: var(--doux); }
.cb-ligne { display: grid; gap: 8px; padding: 12px; border-radius: 12px; border: 1px solid rgba(242,181,68,.35); background: rgba(242,181,68,.05); }
.cb-ligne p { margin: 0; font-size: 13px; }
.cb-ligne .rang { display: flex; gap: 6px; align-items: center; }
.cb-ligne input { flex: 1; min-width: 0; min-height: 42px; padding: 8px 10px; border-radius: 10px; border: 1px solid var(--trait-fort); background: rgba(255,255,255,.05); color: var(--texte); font: inherit; user-select: text; -webkit-user-select: text; }
.cb-ligne input.code { font: 700 18px var(--mono); letter-spacing: .3em; text-transform: uppercase; }
.cb-ligne input.lien { font-size: 12px; color: var(--doux); }
.code-gros { font: 700 38px var(--mono); letter-spacing: .3em; text-align: center; color: var(--ambre); padding: 4px 0 4px .3em; border: 1px dashed var(--ambre-sombre); border-radius: 12px; user-select: text; -webkit-user-select: text; }
.statut-ami { display: flex; gap: 8px; align-items: center; font-size: 13px; }
.statut-ami i { width: 9px; height: 9px; border-radius: 50%; background: var(--doux); flex: none; }
.statut-ami i.la { background: var(--bon); box-shadow: 0 0 8px var(--bon); }
.statut-ami i.pret { background: var(--ambre); box-shadow: 0 0 8px var(--ambre); }
.cb-attente { position: fixed; z-index: 15; left: var(--bord-g); right: var(--bord-d); bottom: calc(var(--bas) + 16px); max-width: 520px; margin: 0 auto; padding: 16px; display: grid; gap: 8px; text-align: center; }
.cb-attente h2 { font-size: 22px; }
.cb-attente .points::after { content: ''; animation: points 1.4s steps(4) infinite; }
@keyframes points { 0% { content: ''; } 25% { content: '.'; } 50% { content: '..'; } 75% { content: '...'; } }
.equipe-grille { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 8px; }
.carte-dr { position: relative; padding: 10px; border-radius: 12px; border: 1px solid var(--trait); background: rgba(255,255,255,.03); text-align: left; display: grid; gap: 5px; border-left: 3px solid var(--el); }
.carte-dr.choisi { border-color: var(--el); background: color-mix(in srgb, var(--el) 14%, transparent); }
.carte-dr.ko { opacity: .45; }
.carte-dr b { font-family: var(--titre); font-size: 15px; }
.carte-dr .meta { display: flex; justify-content: space-between; font-size: 11px; color: var(--doux); }
.carte-dr .num { font-size: 11px; }
.cb-haut { position: fixed; z-index: 15; top: calc(var(--haut) + 10px); left: var(--bord-g); right: var(--bord-d); display: grid; grid-template-columns: 1fr auto 1fr; gap: 10px; align-items: start; pointer-events: none; }
.cb-haut > * { pointer-events: auto; }
.score { padding: 10px 14px; display: grid; gap: 4px; min-width: 0; }
.score .nom { font-family: var(--titre); font-size: 14px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.score .tot { font-family: var(--mono); font-size: 28px; line-height: 1; }
.score.droite { text-align: right; }
.tour { padding: 8px 16px; text-align: center; display: grid; gap: 2px; }
.tour b { font-family: var(--titre); font-size: 20px; }
.tour .chrono { font-family: var(--mono); font-size: 13px; color: var(--ambre); }
.points-eq { display: flex; gap: 4px; flex-wrap: wrap; }
.score.droite .points-eq { justify-content: flex-end; }
.points-eq i { width: 22px; height: 6px; border-radius: 3px; background: var(--el); opacity: .9; position: relative; overflow: hidden; }
.points-eq i.ko { opacity: .2; }
.cb-bas { position: fixed; z-index: 15; left: var(--bord-g); right: var(--bord-d); bottom: calc(var(--bas) + 10px); padding: 12px; display: grid; gap: 10px; max-width: 980px; margin: 0 auto; }
.cb-bas .rangee { display: flex; gap: 8px; overflow-x: auto; padding-bottom: 2px; }
.cb-bas .rangee > * { flex: 0 0 auto; }
.cb-bas .carte-dr { width: 138px; cursor: pointer; }
.posture { width: 168px; padding: 10px; border-radius: 12px; border: 1px solid var(--trait-fort); background: rgba(255,255,255,.04); text-align: left; display: grid; gap: 6px; cursor: pointer; }
.posture.choisi { border-color: var(--ambre); background: rgba(242,181,68,.12); }
.posture b { font-family: var(--titre); font-size: 14px; }
.posture .stats { display: flex; gap: 10px; font-family: var(--mono); font-size: 13px; }
.posture .stats span { display: inline-flex; align-items: center; gap: 3px; }
.posture .stats svg { width: 14px; height: 14px; }
.posture .el { font-size: 11px; color: var(--doux); line-height: 1.35; }
.cb-bas .valider { display: flex; gap: 8px; align-items: center; justify-content: space-between; flex-wrap: wrap; }
.cb-elements { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; }
.el-btn { display: grid; gap: 2px; padding: 9px 11px; border-radius: 12px; text-align: left; border: 1px solid color-mix(in srgb, var(--el) 45%, transparent); background: color-mix(in srgb, var(--el) 10%, transparent); min-width: 0; }
.el-btn b { font-family: var(--titre); font-size: 17px; color: var(--el); }
.el-btn small { font-size: 11px; color: var(--doux); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.el-btn.choisi { background: color-mix(in srgb, var(--el) 28%, transparent); box-shadow: 0 0 0 2px var(--el) inset; }
.el-btn[disabled] { opacity: .35; }
.degat { position: fixed; z-index: 30; pointer-events: none; font-family: var(--titre); font-weight: 700; font-size: 30px; transform: translate(-50%, -50%); text-shadow: 0 2px 0 #000, 0 0 18px rgba(0,0,0,.7); animation: monte 1.6s ease-out forwards; white-space: nowrap; text-align: center; }
.degat small { display: block; font-size: 13px; letter-spacing: .06em; text-transform: uppercase; }
@keyframes monte { 0% { opacity: 0; transform: translate(-50%, -30%) scale(.6); } 15% { opacity: 1; transform: translate(-50%, -60%) scale(1.15); } 100% { opacity: 0; transform: translate(-50%, -160%) scale(1); } }
.relais { position: fixed; inset: 0; z-index: 45; background: rgba(8,8,12,.96); display: grid; place-items: center; text-align: center; padding: 24px var(--bord-d) 24px var(--bord-g); }
.relais h2 { font-size: 34px; margin-bottom: 8px; }
.annonce { position: fixed; z-index: 25; left: 50%; top: 32%; transform: translate(-50%, -50%); font-family: var(--titre); font-size: clamp(28px, 6vw, 56px); font-weight: 700; text-transform: uppercase; letter-spacing: .06em; text-shadow: 0 4px 30px rgba(0,0,0,.8); pointer-events: none; animation: entre .3s; text-align: center; }
.posture .style { font-size: 10px; letter-spacing: .05em; text-transform: uppercase; color: var(--ambre); }
.fiche-coup { position: fixed; z-index: 16; left: var(--bord-g); right: var(--bord-d); bottom: calc(var(--bas) + 10px); max-width: 640px; margin: 0 auto; padding: 12px 14px; display: grid; gap: 8px; animation: entre .25s; border-top: 3px solid var(--accent); }
.fiche-coup.nous { --accent: var(--ambre); }
.fiche-coup.eux { --accent: #ff6b6b; }
.fc-tete { display: flex; justify-content: space-between; align-items: center; gap: 8px; }
.fc-tete b { font-family: var(--titre); font-size: 19px; color: var(--accent); }
.fc-tete .btn { padding: 5px 10px; font-size: 12px; }
.fc-outils { display: flex; gap: 8px; align-items: center; }
.fc-auto { display: inline-flex; gap: 5px; align-items: center; font-size: 12px; color: var(--doux); white-space: nowrap; }
.fc-auto input { width: 16px; height: 16px; accent-color: var(--ambre); }
.fc-suite { display: flex; justify-content: flex-end; animation: entre .25s; }
.fc-suite .btn { padding: 10px 22px; }
.tour-etages { display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px; direction: rtl; }
.tour-etages span { direction: ltr; height: 26px; border-radius: 6px; display: grid; place-items: center; font: 600 11px var(--mono); border: 1px solid var(--trait); color: var(--doux); background: rgba(255,255,255,.03); }
.tour-etages span.fait { background: rgba(111,214,138,.16); border-color: rgba(111,214,138,.45); color: #b8f0c8; }
.tour-etages span.ici { background: rgba(242,181,68,.2); border-color: var(--ambre); color: var(--ambre); box-shadow: 0 0 12px rgba(242,181,68,.35); }
.tour-etages span.sommet { background: rgba(180,92,255,.18); border-color: #b45cff; color: #ecd8ff; }
.tour-oeufs { display: grid; gap: 8px; }
.tour-slot { display: grid; grid-template-columns: 54px repeat(3, 1fr); gap: 6px; align-items: center; }
.tour-slot > span { font-size: 12px; color: var(--doux); }
.tour-slot button { padding: 9px 4px; border-radius: 10px; border: 1px solid var(--trait-fort); background: rgba(255,255,255,.04); font-weight: 700; font-size: 13px; display: grid; justify-items: center; gap: 2px; }
.tour-slot button i { width: 18px; height: 23px; border-radius: 50% 50% 46% 46% / 60% 60% 40% 40%; background: var(--el); box-shadow: inset -3px -4px 0 rgba(0,0,0,.25); }
.tour-slot button.actif { border-color: var(--el); background: color-mix(in srgb, var(--el) 20%, transparent); }
.tour-equipe { display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 6px; }
.tour-equipe .carte-dr { cursor: default; }
.tour-equipe .carte-dr.relache { border-color: #ff8a8a; background: rgba(255,90,90,.12); }
.fc-duel { display: grid; grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr); gap: 8px; align-items: center; }
.fc-cote { display: grid; gap: 2px; min-width: 0; padding: 8px 10px; border-radius: 10px; background: rgba(255,255,255,.04); border-left: 3px solid var(--el); }
.fc-cote.droite { text-align: right; border-left: 0; border-right: 3px solid var(--el); }
.fc-cote .nm { font-family: var(--titre); font-size: 15px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.fc-cote .ps { font-size: 12px; color: var(--doux); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.fc-cote .tag { font-size: 10px; letter-spacing: .06em; text-transform: uppercase; color: var(--el); }
.fc-cote .val { font-family: var(--mono); font-size: 20px; display: inline-flex; gap: 4px; align-items: center; }
.fc-cote.droite .val { justify-content: flex-end; }
.fc-cote .val svg { width: 16px; height: 16px; }
.fc-fleche { font-size: 22px; color: var(--accent); }
.fc-calc { display: grid; gap: 3px; font-size: 13px; }
.fc-ligne { display: flex; justify-content: space-between; gap: 10px; opacity: 0; animation: fcApparait .3s forwards; }
.fc-ligne span:last-child { font-family: var(--mono); white-space: nowrap; }
.fc-ligne small { color: var(--doux); font-size: 11px; }
.fc-ligne.bon span:last-child { color: #ffd04a; }
.fc-ligne.mal span:last-child { color: #a8b0c0; }
.fc-ligne.chance span:last-child { color: #ff9ad0; }
.fc-total { display: flex; justify-content: space-between; align-items: baseline; border-top: 1px solid var(--trait); padding-top: 6px; font-family: var(--titre); font-size: 16px; opacity: .25; transition: opacity .2s; }
.fc-total b { font-family: var(--mono); font-size: 26px; color: var(--accent); }
.fc-total.vu { opacity: 1; }
@keyframes fcApparait { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: none; } }
@media (max-width: 760px) {
  .fiche-coup { padding: 9px 10px; gap: 6px; }
  .fc-cote { padding: 6px 8px; }
  .fc-cote .nm { font-size: 13px; }
  .fc-cote .val { font-size: 16px; }
  .fc-calc { font-size: 12px; }
  .fc-total b { font-size: 22px; }
  .cb-prep { grid-template-columns: 1fr; overflow: auto; inset: calc(var(--hud) + var(--tuto, 0px) + 8px) var(--bord-d) calc(var(--bas) + 80px) var(--bord-g); display: block; }
  .cb-prep > section { margin-bottom: 10px; }
  .cb-bas .carte-dr { width: 116px; padding: 7px; }
  .posture { width: 140px; padding: 8px; }
  .score .tot { font-size: 22px; }
  .score { padding: 7px 10px; }
  .points-eq i { width: 12px; }
}
`);

// ---------- Arène ----------
function construireArene() {
  const scene = new T.Scene();
  scene.fog = new T.Fog(0x1a1626, 18, 60);
  scene.add(ciel(0x120e24, 0x4a2a3a, 0x0c0a12));
  eclairage(scene, { ciel: 0xc8b8ff, sol: 0x3a2020, hemi: 0.7, soleil: 0xfff0d8, force: 1.4, zoneOmbre: 7, x: 4, y: 10, z: 6 });
  const piste = new T.Group(); scene.add(piste);
  const sol = mesh(new T.CylinderGeometry(6, 6.6, 0.6, 18).translate(0, -0.3, 0), mat(0x4a423c, { r: 1 })); piste.add(sol);
  const cercle = mesh(new T.RingGeometry(4.6, 4.8, 36), mat(0xf2b544, { e: 0xf2b544, ei: 0.5, d: true }), false); cercle.rotation.x = -Math.PI / 2; cercle.position.y = 0.01; piste.add(cercle);
  const ligne = mesh(new T.PlaneGeometry(9, 0.06), mat(0xf2b544, { e: 0xf2b544, ei: 0.4 }), false); ligne.rotation.x = -Math.PI / 2; ligne.position.y = 0.012; piste.add(ligne);
  const braseros = [];
  ["feu", "glace", "eau", "feu", "glace", "eau"].forEach((elx, k) => {
    const a = (k / 6) * Math.PI * 2 + Math.PI / 6;
    const g = new T.Group(); g.position.set(Math.cos(a) * 5.6, 0, Math.sin(a) * 5.6);
    g.add(mesh(new T.CylinderGeometry(0.22, 0.32, 1.3, 6).translate(0, 0.65, 0), mat(0x2e2a28, { r: 0.9 })));
    const coupe = mesh(new T.CylinderGeometry(0.42, 0.25, 0.25, 7).translate(0, 1.42, 0), mat(0x2e2a28, { m: 0.4, r: 0.6 })); g.add(coupe);
    const c = new T.Color(ELEMENTS[elx].couleur);
    const f = mesh(new T.ConeGeometry(0.26, 0.6, 5).translate(0, 1.82, 0), mat(c.getHex(), { e: c.getHex(), ei: 1.4, o: 0.9 }), false); g.add(f);
    const l = new T.PointLight(c.getHex(), 0.9, 5, 2); l.position.y = 2; g.add(l);
    braseros.push(f);
    piste.add(g);
  });
  for (let k = 0; k < 22; k++) {
    const a = Math.random() * Math.PI * 2, r = 12 + Math.random() * 12;
    const rc = mesh(bloc(0.8 + Math.random() * 1.4, 0.6 + Math.random(), 0.8 + Math.random(), 0, 0.3, k), mat(0x2a2430, { r: 1 }), false);
    rc.position.set(Math.cos(a) * r, -2 + Math.random() * 6, Math.sin(a) * r); scene.add(rc);
  }
  const camera = new T.PerspectiveCamera(45, 1, 0.1, 200);
  const orbite = new Orbite(camera, document.getElementById("scene3d"));
  orbite.min = 5; orbite.max = 16; orbite.phiMin = 0.6; orbite.phiMax = 1.4;
  orbite.viser(new T.Vector3(0, 0.7, 0), 8, 0.55, 1.1);
  const flash = new T.PointLight(0xffffff, 0, 8, 2); scene.add(flash);
  D = {
    scene, camera, orbite, braseros, flash, t: 0, cotes: [null, null], projectiles: [], eclats: [], secousse: 0,
    vitesse: E().reglages.vitesseCombat || 1, tweens: [], ondes: [], marques: [], boucliers: [],
    update(dtReel) {
      // Les effets du combat suivent la vitesse choisie (× 1 ou × 2)
      const dt = dtReel * D.vitesse;
      D.t += dt;
      orbite.update(dtReel);
      if (D.secousse > 0) { D.secousse = Math.max(0, D.secousse - dt * 2); camera.position.x += (Math.random() - 0.5) * D.secousse * 0.3; camera.position.y += (Math.random() - 0.5) * D.secousse * 0.3; }
      D.braseros.forEach((f, i) => { const k = 1 + Math.sin(D.t * 11 + i) * 0.12; f.scale.set(1, k, 1); });
      D.flash.intensity = Math.max(0, D.flash.intensity - dt * 8);
      for (const c of D.cotes) if (c) c.anim.update(dt);
      majProjectiles(dt);
      majEffets(dt);
    },
  };
}

function placerDragon(cote, membre, entree = true) {
  const ancien = D.cotes[cote];
  if (ancien && ancien.membre === membre) return;
  if (ancien) {
    const r = ancien.rig;
    ancien.anim.jouer("sortie", { surFin: () => D.scene.remove(ancien.support) });
    setTimeout(() => D.scene.remove(ancien.support), 900);
  }
  const rig = construireDragon(membre.id, membre.stade, { armure: membre.armure, ul: membre.ul });
  const taille = Math.max(rig.taille.x, rig.taille.z);
  const ech = Math.max(0.65, Math.min(1.7, 2.6 / taille));
  rig.racine.scale.setScalar(ech);
  const support = new T.Group();
  support.position.set(0, 0, cote === 0 ? 2.3 : -2.3);
  support.rotation.y = cote === 0 ? Math.PI : 0;
  support.add(rig.racine);
  D.scene.add(support);
  const anim = new Animateur(rig);
  if (entree) anim.jouer("entree");
  if (membre.pv <= 0) anim.jouer("ko");
  D.cotes[cote] = { membre, rig, anim, support, ech };
}

// ---------- Effets de souffle ----------
const GEO_P = { feu: new T.TetrahedronGeometry(1, 0), glace: new T.OctahedronGeometry(1, 0), eau: new T.IcosahedronGeometry(1, 0) };
const posMonde = (o) => { const v = new T.Vector3(); o.getWorldPosition(v); return v; };
const alea3 = (k) => new T.Vector3((Math.random() - 0.5) * k, (Math.random() - 0.5) * k, (Math.random() - 0.5) * k);
// Un nuage de particules. Chaque particule suit sa trajectoire : « ligne » (avec un arc), « chute » ou « spirale ».
function nuee(element, fort, parts, cible, surArrivee, multi = false) {
  const c = new T.Color(ELEMENTS[element].couleur);
  const groupe = parts.map((u, i) => {
    const m = new T.Mesh(GEO_P[element], mat(i % 3 ? c.getHex() : 0xffffff, { e: c.getHex(), ei: 1.4, o: element === "eau" ? 0.75 : 0.95 }));
    m.scale.setScalar((u.taille ?? (element === "glace" ? 0.09 : 0.11)) * (fort ? 1.3 : 1) * (0.6 + Math.random() * 0.8));
    m.position.copy(u.debut);
    m.visible = !(u.delai > 0);
    m.userData = { t: 0, arc: 0, mode: "ligne", duree: 0.42, delai: 0, ...u };
    D.scene.add(m);
    return m;
  });
  D.projectiles.push({ groupe, surArrivee, arrive: false, fin: cible, element, fort, multi });
}
function souffle(depuis, vers, element, fort, surArrivee, n = fort ? 26 : 18) {
  const debut = posMonde(depuis.rig.boutMuseau), fin = posMonde(vers.rig.tronc);
  const parts = [];
  for (let i = 0; i < n; i++) parts.push({ delai: i * 0.018, debut: debut.clone(), fin: fin.clone().add(alea3(0.5)), arc: 0.3 + Math.random() * 0.6 });
  nuee(element, fort, parts, fin, surArrivee);
}
const AXE_Y = new T.Vector3(0, 1, 0);
function positionParticule(m, u) {
  if (u.mode === "chute") { m.position.lerpVectors(u.debut, u.fin, u.t * u.t); return; }
  m.position.lerpVectors(u.debut, u.fin, u.t);
  if (u.mode === "spirale") {
    const axe = u.fin.clone().sub(u.debut).normalize();
    const a = new T.Vector3().crossVectors(axe, AXE_Y).normalize(), b = new T.Vector3().crossVectors(axe, a);
    const r = u.rayon * Math.sin(u.t * Math.PI), ang = u.phase + u.t * Math.PI * 2 * u.tours;
    m.position.addScaledVector(a, Math.cos(ang) * r).addScaledVector(b, Math.sin(ang) * r);
  } else m.position.y += Math.sin(u.t * Math.PI) * u.arc * 0.5;
}
function majProjectiles(dt) {
  for (let i = D.projectiles.length - 1; i >= 0; i--) {
    const p = D.projectiles[i];
    let tous = true;
    for (const m of p.groupe) {
      const u = m.userData;
      if (u.delai > 0) { u.delai -= dt; tous = false; continue; }
      m.visible = m.visible || u.t === 0;
      u.t += dt / u.duree;
      if (u.t < 1) {
        tous = false;
        positionParticule(m, u);
        m.rotation.x += dt * 9; m.rotation.y += dt * 7;
      } else if (m.visible) {
        m.visible = false;
        if (p.multi) petitEclat(u.fin, p.element);
      }
    }
    if (!p.arrive && p.groupe.some((m) => m.userData.t >= 1)) {
      p.arrive = true;
      if (p.fin) eclatement(p.fin, p.element, p.fort);
      p.surArrivee && p.surArrivee();
    }
    if (tous) { p.groupe.forEach((m) => D.scene.remove(m)); D.projectiles.splice(i, 1); }
  }
  for (let i = D.eclats.length - 1; i >= 0; i--) {
    const e = D.eclats[i], u = e.userData;
    u.vie -= dt; u.v.y -= 6 * dt; e.position.addScaledVector(u.v, dt); e.scale.multiplyScalar(1 - dt * 1.5);
    if (u.vie <= 0) { D.scene.remove(e); D.eclats.splice(i, 1); }
  }
}
function eclatement(pos, element, fort) {
  const c = new T.Color(ELEMENTS[element].couleur);
  D.flash.color.copy(c); D.flash.position.copy(pos); D.flash.intensity = fort ? 6 : 3.5;
  D.secousse = fort ? 1 : 0.5;
  for (let i = 0; i < (fort ? 22 : 14); i++) {
    const m = new T.Mesh(GEO_P[element], mat(c.getHex(), { e: c.getHex(), ei: 1.2 }));
    m.scale.setScalar(0.06 + Math.random() * 0.06);
    m.position.copy(pos);
    m.userData = { vie: 0.6 + Math.random() * 0.4, v: new T.Vector3((Math.random() - 0.5) * 6, Math.random() * 5, (Math.random() - 0.5) * 6) };
    D.scene.add(m); D.eclats.push(m);
  }
  Son.impact(element, fort);
}
function petitEclat(pos, element) {
  const c = new T.Color(ELEMENTS[element].couleur);
  for (let i = 0; i < 5; i++) {
    const m = new T.Mesh(GEO_P[element], mat(c.getHex(), { e: c.getHex(), ei: 1.2 }));
    m.scale.setScalar(0.04 + Math.random() * 0.04);
    m.position.copy(pos);
    m.userData = { vie: 0.4 + Math.random() * 0.3, v: new T.Vector3((Math.random() - 0.5) * 4, Math.random() * 3, (Math.random() - 0.5) * 4) };
    D.scene.add(m); D.eclats.push(m);
  }
}

// ---------- Autres effets : déplacements, ondes, griffures, boucliers ----------
function glisser(obj, z, duree) {
  return new Promise((fin) => D.tweens.push({ obj, de: obj.position.z, a: z, t: 0, duree, fin }));
}
function materiauEffet(element, o = 0.9) {
  const c = ELEMENTS[element].couleur;
  return new T.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 1.3, transparent: true, opacity: o, depthWrite: false, flatShading: true, side: T.DoubleSide });
}
function onde(k, element, surArrivee) {
  const depart = D.cotes[k].support.position, arrivee = D.cotes[1 - k].support.position;
  const m = new T.Mesh(new T.TorusGeometry(1, 0.07, 6, 48), materiauEffet(element));
  m.rotation.x = Math.PI / 2;
  m.position.set(depart.x, 0.35, depart.z);
  D.scene.add(m);
  const rMax = depart.distanceTo(arrivee);
  D.ondes.push({ m, r: 0.3, rMax, v: rMax / 0.55, cb: surArrivee, fait: false });
}
function griffures(cote, element) {
  const c = D.cotes[cote];
  const p = posMonde(c.rig.tronc);
  const vers = cote === 1 ? 1 : -1; // côté de l'attaquant
  for (let i = 0; i < 3; i++) {
    const m = new T.Mesh(new T.BoxGeometry(0.06, 1.1, 0.06), materiauEffet(element, 1));
    m.position.copy(p).add(new T.Vector3((i - 1) * 0.28, 0.1, vers * 0.6));
    m.rotation.z = 0.65; m.scale.y = 0.01;
    D.scene.add(m);
    D.marques.push({ m, t: -i * 0.05 });
  }
}
function montrerBouclier(cote, element) {
  const c = D.cotes[cote];
  const r = Math.max(c.rig.taille.x, c.rig.taille.y, c.rig.taille.z) * c.ech * 0.62 + 0.25;
  const m = new T.Mesh(new T.IcosahedronGeometry(1, 1), materiauEffet(element, 0));
  m.material.emissiveIntensity = 0.7;
  m.scale.setScalar(r);
  m.position.copy(posMonde(c.rig.tronc));
  D.scene.add(m);
  const b = { m, cote, vise: 0.22, eclat: 0 };
  D.boucliers.push(b);
  return b;
}
function majEffets(dt) {
  for (let i = D.tweens.length - 1; i >= 0; i--) {
    const w = D.tweens[i];
    w.t = Math.min(1, w.t + dt / w.duree);
    const q = w.t * w.t * (3 - 2 * w.t);
    w.obj.position.z = w.de + (w.a - w.de) * q;
    if (w.t >= 1) { D.tweens.splice(i, 1); w.fin(); }
  }
  for (let i = D.ondes.length - 1; i >= 0; i--) {
    const o = D.ondes[i];
    o.r += o.v * dt;
    o.m.scale.set(o.r, o.r, 1 + o.r * 0.25);
    o.m.material.opacity = Math.max(0, 0.9 * (1 - o.r / (o.rMax * 1.35)));
    if (!o.fait && o.r >= o.rMax) { o.fait = true; o.cb && o.cb(); }
    if (o.r >= o.rMax * 1.35) { D.scene.remove(o.m); D.ondes.splice(i, 1); }
  }
  for (let i = D.marques.length - 1; i >= 0; i--) {
    const g = D.marques[i];
    g.t += dt;
    if (g.t < 0) continue;
    g.m.scale.y = Math.min(1, g.t / 0.1);
    g.m.material.opacity = Math.max(0, 1 - Math.max(0, g.t - 0.2) / 0.5);
    if (g.t > 0.7) { D.scene.remove(g.m); D.marques.splice(i, 1); }
  }
  for (let i = D.boucliers.length - 1; i >= 0; i--) {
    const b = D.boucliers[i];
    b.eclat = Math.max(0, b.eclat - dt * 2.2);
    const o = b.m.material;
    o.opacity += (b.vise + b.eclat * 0.6 - o.opacity) * (1 - Math.exp(-10 * dt));
    o.emissiveIntensity = 0.7 + b.eclat * 1.5;
    b.m.rotation.y += dt * 0.6;
    const c = D.cotes[b.cote];
    if (c) b.m.position.copy(posMonde(c.rig.tronc));
    if (b.vise === 0 && o.opacity < 0.02) { D.scene.remove(b.m); D.boucliers.splice(i, 1); }
  }
}

// ---------- Chaque posture a son style d'attaque et de défense ----------
const STYLES_ATK = [
  [/Pluie|Éruption|Cataclysme|Boule de neige|Cascade|Effondrement|Ère glaciaire|Grande marée|Marée haute|Tsunami|Pleine lune|Couronne|Jugement|Coulée|Martelage|Zénith|Avalanche$/, "pluie"],
  [/Tourbillon|Danse|Remous|Bourrasque|Rafale|Vague|Déferlante|Ressac|Engloutissement|Étreinte|Blizzard|Siphon/, "tourbillon"],
  [/Souffle|Jet|Rayon|Flamme|Zéro|Gel soudain|Pression|Source|Étincelle|Brume|Feu follet|Lame d'eau|Lame de neige/, "souffle"],
  [/Charge|Bond|Glissade|Embuscade|Ricochet|Poing|Coup de roche|Avalanche légère|Enclume|[Nn]ageoire/, "charge"],
  [/Griffe|Lame|Estoc|Fendoir|Pichenette|Éclat|Contre-pointe|Hérisson|Aiguille|Diamant|Réfraction/, "griffe"],
  [/Morsure|Curée/, "morsure"],
  [/Carapace|Écailles|Écran|Halo|Garde|Rempart|Sérac|Dôme|Cathédrale|Facette|Prisme|Neige éternelle|Aurore|Bulle|Fosse|Abysse|Corail|Récif|Anémone|Barrière|Atoll|Perle|Cœur/, "onde"],
];
export const NOMS_STYLE = { souffle: "Souffle", morsure: "Morsure", griffe: "Griffes", charge: "Charge", tourbillon: "Tourbillon", pluie: "Pluie", onde: "Onde" };
export const NOMS_DEFENSE = { bouclier: "Bouclier", esquive: "Esquive", encaisse: "Encaisse" };
export function styleAttaque(p) {
  for (const [re, st] of STYLES_ATK) if (re.test(p.nom)) return st;
  if (p.def > p.atk) return "onde";
  return ["morsure", "griffe", "souffle"][(p.i || 0) % 3];
}
export function styleDefense(p) {
  if (/Esquive|Glissade|Brume|Voile|Reflet|Feu follet|Bond|Poudreuse|Remous|Écume|Clapotis|Ricochet|Embuscade|Gouttelette|Rafale/.test(p.nom)) return "esquive";
  if (p.def > p.atk || /Carapace|Écailles|Rempart|Dôme|Garde|Barrière|Bulle|Halo|Écran|Cathédrale|Sérac|Récif|Corail|Atoll|Prisme|Facette|Anémone|Perle/.test(p.nom)) return "bouclier";
  return "encaisse";
}

function chiffreDegat(cote, valeur, infos) {
  const c = D.cotes[cote];
  if (!c) return;
  const v = new T.Vector3(); c.rig.tronc.getWorldPosition(v); v.y += c.rig.taille.y * c.ech * 0.6 + 0.4;
  const p = versEcran(v, D.camera);
  const couleur = infos.domine ? "#ffd04a" : "#ffffff";
  const d = el("div", { class: "degat", style: { left: p.x + "px", top: p.y + "px", color: couleur } }, `-${valeur}`, infos.domine ? el("small", {}, "Super efficace") : infos.faible ? el("small", { style: { color: "#a8b0c0" } }, "Peu efficace") : null, infos.chance ? el("small", { style: { color: "#ff9ad0" } }, "Coup de chance") : null);
  document.getElementById("ecran").append(d);
  setTimeout(() => d.remove(), 1700);
}

// ---------- Adversaire ordinateur ----------
const NOMS_BOT = ["Ysolde des Cendres", "Maël le Brumeux", "Hakon Croc-de-Givre", "Lysandre l'Oblique", "Nour la Rapide", "Tiago des Récifs", "Aube Sombrécaille", "Brune l'Écailleuse", "Oskar Fend-Vague", "Iris de Basalte"];
function membreBot(id, niveau, stadeMax) {
  const d = { id, niveau, nid: 3, armure: null };
  const stade = Math.min(stadeDuNiveau(niveau), stadeMax);
  const nid = stade >= 4 ? 3 : stade >= 2 ? 2 : stade >= 1 ? 1 : 0;
  d.nid = nid;
  const max = pvMax(d);
  return { id, niveau, stade: stadeEffectif(d), pv: max, pvMax: max, postures: postures(d), element: PAR_ID[id].element, nom: PAR_ID[id].nom, ul: false, armure: null };
}
function equipeBot(niveaux, stadeMax) {
  const ids = DRAGONS.map((d) => d.id).sort(() => Math.random() - 0.5);
  // au moins un dragon de chaque élément si possible
  const parEl = { feu: [], glace: [], eau: [] };
  for (const id of ids) parEl[PAR_ID[id].element].push(id);
  const choix = [];
  let k = 0;
  while (choix.length < niveaux.length) { const elx = ["feu", "glace", "eau"][k % 3]; choix.push(parEl[elx].shift()); k++; }
  return choix.map((id, i) => membreBot(id, Math.max(1, Math.min(20, niveaux[i] + Math.round((Math.random() - 0.5) * 2))), stadeMax));
}

// Choix d'équilibre (stratégie mixte) par jeu fictif sur toutes les paires (dragon, posture).
function options(equipe) {
  const o = [];
  equipe.forEach((m, i) => { if (m.pv > 0) m.postures.forEach((p, j) => o.push({ i, j, m, p })); });
  return o;
}
function gainAttendu(a, b) {
  const da = degats(a.p.atk, b.p.def, a.m.element, b.m.element, a.p.bonus, b.p.faib) * ESPERANCE;
  const db = degats(b.p.atk, a.p.def, b.m.element, a.m.element, b.p.bonus, a.p.faib) * ESPERANCE;
  // Petit malus si on risque de perdre son dragon (il ne pourra plus jouer)
  const risque = db >= a.m.pv ? 0.25 * db : 0;
  return da - db - risque;
}
function choixOrdinateur(moi, lui, hasard = 0.12) {
  const A = options(moi), B = options(lui);
  if (!A.length) return null;
  if (!B.length) return A[Math.floor(Math.random() * A.length)];
  const m = A.map((a) => B.map((b) => gainAttendu(a, b)));
  const nl = A.length, nc = B.length;
  const cl = new Array(nl).fill(0), gl = new Array(nl).fill(0), pc = new Array(nc).fill(0);
  let i = 0;
  for (let it = 0; it < 300; it++) {
    cl[i]++;
    for (let j = 0; j < nc; j++) pc[j] += m[i][j];
    let jm = 0; for (let j = 1; j < nc; j++) if (pc[j] < pc[jm]) jm = j;
    for (let k = 0; k < nl; k++) gl[k] += m[k][jm];
    let im = 0; for (let k = 1; k < nl; k++) if (gl[k] > gl[im]) im = k;
    i = im;
  }
  if (Math.random() < hasard) return A[Math.floor(Math.random() * A.length)];
  let r = Math.random() * 300;
  for (let k = 0; k < nl; k++) { r -= cl[k]; if (r <= 0) return A[k]; }
  return A[nl - 1];
}

// ---------- Préparation ----------
let prep = { mode: "bot", equipe: [], niveauAmi: 10 };
export function ouvrir(ctx, params = {}) {
  ctxJeu = ctx;
  if (!D) construireArene();
  for (const c of [0, 1]) if (D.cotes[c]) { D.scene.remove(D.cotes[c].support); D.cotes[c] = null; }
  ctx.moteur.montrer(D);
  D.orbite.viser(new T.Vector3(0, 0.9, 0), 11, 0.6, 1.1);
  D.orbite.auto = 0.08;
  Musique.jouer("iles");
  ui = document.getElementById("ecran");
  C = null;
  if (L) { L.pret = 0; L.recu = {}; publierLigne(); }
  if (params.rejoindre && codeValide(params.rejoindre)) prep.mode = "ligne";
  const e = E();
  const dispo = e.dragons.filter((d) => d.pv > 0);
  if (Array.isArray(e.equipe) && e.equipe.length) prep.equipe = [...e.equipe];
  prep.equipe = prep.equipe.filter((uid) => dispo.some((d) => d.uid === uid));
  if (!prep.equipe.length) {
    // Équipe par défaut : les plus forts, en alternant les éléments
    const parEl = { feu: [], glace: [], eau: [] };
    for (const d of [...dispo].sort((a, b) => b.niveau - a.niveau)) parEl[PAR_ID[d.id].element].push(d);
    const eq = [];
    for (let k = 0; eq.length < Math.min(7, dispo.length); k++) { const l = parEl[["feu", "glace", "eau"][k % 3]]; if (l.length) eq.push(l.shift()); }
    prep.equipe = eq.map((d) => d.uid);
  }
  rendrePrep();
  if (params.rejoindre && codeValide(params.rejoindre) && (!L || L.code !== params.rejoindre)) rejoindreLigne(params.rejoindre);
}
export function fermer() {
  ctxJeu.moteur.definirZone(null);
  if (C && !C.fini) abandonner(true);
  quitterLigne();
  if (D) D.orbite.auto = 0;
  clearInterval(chronoInt);
  ctxJeu.cacherInterface(false);
}

// Garde la position de défilement des listes quand on redessine l'écran
function memoriserDefilement(selecteur) {
  return [...ui.querySelectorAll(selecteur)].map((n) => [n.scrollTop, n.scrollLeft]);
}
function restaurerDefilement(selecteur, pos) {
  if (!pos) return;
  [...ui.querySelectorAll(selecteur)].forEach((n, i) => { if (pos[i]) { n.scrollTop = pos[i][0]; n.scrollLeft = pos[i][1]; } });
}

function rendrePrep() {
  const defil = memoriserDefilement(".cb-prep, .cb-prep > section");
  ui.innerHTML = "";
  const e = E();
  const zone = el("div", { class: "cb-prep" });
  const gauche = el("section", { class: "panneau" },
    el("div", {}, el("div", { class: "etiquette" }, "Arène"), el("h2", {}, "Combat")),
    el("p", { class: "doux", style: { margin: 0 } }, `9 tours. À chaque tour, chacun choisit en secret un dragon puis une posture. Les deux frappent en même temps. Celui qui a infligé le plus de dégâts à la fin gagne. Les PV perdus restent perdus après le combat.`),
  );
  const et = etapeTuto();
  let modes = [
    ["bot", "Duel de mage (classé)", et === "mage" ? "Un mage rival a ouvert un portail et te défie. Gratuit pendant l'apprentissage." : `Un autre mage de ton niveau. Si aucun n'est en ligne, un mage-bot du même niveau te défie. Coûte ${COUT.combat} d'énergie.`],
    ["ligne", "Défi en ligne (code ami)", "Chacun sur son téléphone : crée une partie et envoie le code à ton ami, ou entre le sien. Combat amical : gratuit, sans expérience, et tes dragons ne perdent pas de PV."],
    ["tour", "La tour du nid", `Mode roguelite : tu entres sans dragon, tu choisis 3 œufs, et tu grimpes ${ETAGES} étages contre une IA de plus en plus forte. Au sommet : un œuf et un œuf mystère UL. Coûte ${COUT_TOUR} d'énergie par ascension.`],
    ["sauvage", "Dragons sauvages", "Des dragons sauvages rôdent autour des îles. Idéal pour apprendre. Gratuit pendant l'apprentissage."],
    ["ami", "Défi entre amis", "Sur le même appareil : chacun choisit à son tour, sans regarder. L'écart de niveau est permis. Gratuit."],
  ];
  if (et === "sauvage1" || et === "sauvage2") modes = modes.filter((m) => m[0] === "sauvage" || m[0] === "ligne");
  if (et === "mage") modes = modes.filter((m) => m[0] === "bot" || m[0] === "ligne");
  if (et !== "sauvage1" && et !== "sauvage2") modes = modes.filter((m) => m[0] !== "sauvage");
  if (!modes.some((m) => m[0] === prep.mode)) prep.mode = modes[0][0];
  for (const [id, nom, desc] of modes) gauche.append(el("button", { class: "mode-btn" + (prep.mode === id ? " actif" : ""), onclick: () => { Son.clic(); prep.mode = id; rendrePrep(); if (id === "ligne") montrerBlocLigne(); } }, el("b", {}, nom), el("span", {}, desc)));
  if (prep.mode === "ami") {
    const val = el("b", { class: "num" }, prep.niveauAmi);
    gauche.append(el("label", { style: { display: "grid", gap: "6px", fontSize: "13px" } }, el("span", {}, "Niveau des dragons de ton ami : ", val),
      el("input", { type: "range", min: 1, max: 20, value: prep.niveauAmi, id: "niveau-ami", oninput: (ev) => { prep.niveauAmi = +ev.target.value; val.textContent = prep.niveauAmi; } })));
  }
  if (prep.mode === "ligne") gauche.append(...blocNomLigne(), blocLigne());
  const nb = prep.equipe.length;
  const cout = coutMode(prep.mode);
  const peut = nb > 0 && energie() >= cout;
  // Soigner tous ses dragons d'un coup, avec des rations
  if (prep.mode === "tour") { zone.append(gauche, panneauTour()); ui.append(zone); restaurerDefilement(".cb-prep, .cb-prep > section", defil); return; }
  const blesses = e.dragons.filter((d) => d.pv < pvMax(d));
  const besoin = rationsPourSoigner(blesses);
  if (besoin > 0) gauche.append(el("div", { style: { display: "grid", gap: "6px", padding: "10px", borderRadius: "10px", border: "1px solid var(--trait)" } },
    el("span", { style: { fontSize: "13px" } }, `${blesses.length} dragon${blesses.length > 1 ? "s" : ""} blessé${blesses.length > 1 ? "s" : ""} ou K.O. : il faut ${besoin} ration${besoin > 1 ? "s" : ""} pour tout soigner (tu en as ${e.ressources.rations}).`),
    el("button", { class: "btn", disabled: e.ressources.rations < 1, onclick: () => { let n = 0; changer(() => { n = soignerEquipe(blesses); }); Son.ok(); toast(`${n} ration${n > 1 ? "s" : ""} utilisée${n > 1 ? "s" : ""} : tes dragons sont soignés.`, "bon"); rendrePrep(); } }, icone("rations"), e.ressources.rations >= besoin ? "Soigner tous mes dragons" : "Soigner avec les rations que j'ai")));
  if (prep.mode !== "ligne") gauche.append(el("button", { class: "btn principal", disabled: !peut, style: { padding: "13px" }, onclick: () => lancer() }, icone("combat"), nb ? `Lancer le combat (${nb} dragon${nb > 1 ? "s" : ""})` : "Choisis au moins un dragon"));
  if (energie() < cout) gauche.append(el("p", { class: "doux", style: { color: "#ffb0b0", margin: 0 } }, "Pas assez d'énergie. Elle remonte de 1 par heure, ou se recharge à la boutique."));
  zone.append(gauche);
  const droite = el("section", { class: "panneau" }, el("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: "8px", flexWrap: "wrap" } }, el("h2", { style: { fontSize: "18px" } }, `Ton équipe (${nb}/7)`), el("span", { class: "doux", style: { fontSize: "12px" } }, "Touche un dragon pour l'ajouter ou le retirer.")));
  const grille = el("div", { class: "equipe-grille" });
  if (!e.dragons.length) droite.append(el("p", { class: "doux" }, "Tu n'as pas encore de dragon. Va au couvoir."));
  for (const d of [...e.dragons].sort((a, b) => b.niveau - a.niveau)) {
    const src = PAR_ID[d.id];
    const choisi = prep.equipe.includes(d.uid);
    const ko = d.pv <= 0;
    grille.append(el("button", { class: `carte-dr ${src.element} ${choisi ? "choisi" : ""} ${ko ? "ko" : ""}`, disabled: ko, onclick: () => {
      if (prep.mode === "ligne" && L && L.pret) { toast("Annule « prêt » pour changer ton équipe."); return; }
      Son.clic();
      if (choisi) prep.equipe = prep.equipe.filter((u) => u !== d.uid);
      else if (prep.equipe.length < 7) prep.equipe.push(d.uid);
      else toast("7 dragons maximum.");
      if (prep.mode !== "tour") changer((s) => { s.equipe = [...prep.equipe]; });
      rendrePrep();
    } },
      el("b", {}, src.nom),
      el("div", { class: "meta" }, el("span", {}, `Nv ${d.niveau} · ${nomStade(stadeEffectif(d))}`), el("span", { style: { color: ELEMENTS[src.element].couleur } }, ELEMENTS[src.element].nom)),
      barre(d.pv, pvMax(d), "pv"),
      el("div", { class: "meta" }, el("span", { class: "num" }, ko ? "K.O." : `${d.pv}/${pvMax(d)} PV`), el("span", {}, `${postures(d).length} posture${postures(d).length > 1 ? "s" : ""}`)),
    ));
  }
  droite.append(grille);
  zone.append(droite);
  ui.append(zone);
  restaurerDefilement(".cb-prep, .cb-prep > section", defil);
  if (L) publierLigne();
}

// ---------- La tour du nid : mode roguelite ----------
// On entre sans dragon, on choisit 3 œufs, chaque étage gagné fait monter toute l'équipe d'un niveau
// et donne un nouvel œuf. L'IA a la même équipe (mêmes éléments, mêmes niveaux) et devient plus rusée.
export const ETAGES = 21;
const COUT_TOUR = 5;
const EL3 = ["feu", "glace", "eau"];
const NOMS_EL = { feu: "Feu", glace: "Glace", eau: "Eau" };
const choixTour = { oeufs: ["feu", "glace", "eau"], nouvel: "feu", relache: null };
function especeTour(elx, deja) {
  const l = DRAGONS.filter((d) => d.element === elx).map((d) => d.id);
  const libres = l.filter((id) => !deja.includes(id));
  const liste = libres.length ? libres : l;
  return liste[Math.floor(Math.random() * liste.length)];
}
function slotOeuf(titre, valeur, choisir) {
  return el("div", { class: "tour-slot" }, el("span", {}, titre), ...EL3.map((x) => el("button", { class: valeur === x ? "actif" : "", style: `--el: ${ELEMENTS[x].couleur}`, onclick: () => { Son.clic(); choisir(x); rendrePrep(); } }, el("i"), NOMS_EL[x])));
}
function carteTour(x, extra = {}) {
  const s = PAR_ID[x.id];
  const d = { id: x.id, niveau: x.niveau, nid: 3 };
  return el("div", { class: `carte-dr ${s.element} ${extra.classe || ""}`, onclick: extra.onclick, role: extra.onclick ? "button" : null },
    el("b", {}, s.nom), el("div", { class: "meta" }, el("span", {}, `Nv ${x.niveau} · ${nomStade(stadeEffectif(d))}`), el("span", { style: { color: ELEMENTS[s.element].couleur } }, NOMS_EL[s.element])));
}
function gradinsTour(etage) {
  const g = el("div", { class: "tour-etages", "aria-label": `Étage ${etage} sur ${ETAGES}` });
  // Du bas vers le haut : l'étage 1 en bas à droite… on remplit à l'envers pour que le sommet soit en haut
  for (let n = ETAGES; n >= 1; n--) g.append(el("span", { class: n < etage ? "fait" : n === etage ? "ici" : n === ETAGES ? "sommet" : "" }, n === ETAGES ? "★" : String(n)));
  return g;
}
function panneauTour() {
  const e = E();
  const tn = e.tourNid;
  const run = tn.run;
  const s = el("section", { class: "panneau", style: { display: "grid", gap: "12px", alignContent: "start" } },
    el("div", {}, el("div", { class: "etiquette" }, `Record : étage ${tn.record}/${ETAGES}${tn.sommets ? ` · sommet atteint ${tn.sommets} fois` : ""}`), el("h2", {}, "La tour du nid")));
  if (!run) {
    s.append(el("p", { class: "doux", style: { margin: 0 } }, `Tu entres sans aucun dragon. Choisis tes 3 premiers œufs : un de chaque élément, ou trois du même, c'est toi qui vois. Chaque étage gagné fait monter toute ton équipe d'un niveau et t'offre un nouvel œuf. En face, un mage a exactement les mêmes éléments et les mêmes niveaux que toi, et il devient de plus en plus rusé. Une défaite, et l'ascension s'arrête.`));
    s.append(el("div", { class: "tour-oeufs" }, ...[0, 1, 2].map((i) => slotOeuf(`Œuf ${i + 1}`, choixTour.oeufs[i], (x) => { choixTour.oeufs[i] = x; }))));
    s.append(el("div", { class: "bq-note", style: { fontSize: "12px", color: "var(--doux)" } }, `Récompenses : des ressources à chaque étage, des gemmes aux étages 7 et 14, et au sommet (étage ${ETAGES}) un œuf et un œuf mystère : on ne sait rien de lui, sauf qu'il éclot en version UL.`));
    s.append(el("button", { class: "btn principal", style: { padding: "13px" }, disabled: energie() < COUT_TOUR, onclick: () => demarrerTour() }, icone("combat"), `Faire éclore et entrer (${COUT_TOUR} d'énergie)`));
    if (energie() < COUT_TOUR) s.append(el("p", { class: "doux", style: { color: "#ffb0b0", margin: 0 } }, "Pas assez d'énergie."));
    return s;
  }
  s.append(gradinsTour(run.etage));
  if (run.attente === "oeuf") {
    s.append(el("p", { style: { margin: 0 } }, `Étage ${run.etage - 1} conquis ! Toute ton équipe a gagné un niveau. Choisis ton nouvel œuf.`));
    const plein = run.dragons.length >= 7;
    if (plein) s.append(el("p", { class: "doux", style: { margin: 0 } }, "Ton équipe est pleine (7 dragons). Touche le dragon qui laisse sa place, ou passe ton tour."));
    s.append(el("div", { class: "tour-equipe" }, ...run.dragons.map((x, i) => carteTour(x, plein ? { classe: choixTour.relache === i ? "relache" : "", onclick: () => { Son.clic(); choixTour.relache = choixTour.relache === i ? null : i; rendrePrep(); } } : {}))));
    s.append(slotOeuf("Œuf", choixTour.nouvel, (x) => { choixTour.nouvel = x; }));
    s.append(el("div", { style: { display: "flex", gap: "8px", flexWrap: "wrap" } },
      el("button", { class: "btn principal", disabled: plein && choixTour.relache === null, onclick: () => ajouterOeufTour(true) }, "Faire éclore"),
      plein ? el("button", { class: "btn", onclick: () => ajouterOeufTour(false) }, "Pas de nouvel œuf") : null));
    return s;
  }
  const sommet = run.etage >= ETAGES;
  s.append(el("p", { style: { margin: 0 } }, sommet ? "Le gardien du sommet t'attend. Il est plus fort et presque impossible à tromper." : `Étage ${run.etage} : un mage avec les mêmes éléments que toi${bonusTour(run.etage) ? `, et ${bonusTour(run.etage)} niveau${bonusTour(run.etage) > 1 ? "x" : ""} de plus` : ""}.`));
  s.append(el("div", { class: "tour-equipe" }, ...run.dragons.map((x) => carteTour(x))));
  s.append(el("div", { style: { display: "flex", gap: "8px", flexWrap: "wrap" } },
    el("button", { class: "btn principal", style: { padding: "13px" }, onclick: () => lancer() }, icone("combat"), sommet ? "Affronter le gardien" : `Combattre l'étage ${run.etage}`),
    el("button", { class: "btn", onclick: () => modale({ titre: "Quitter la tour ?", contenu: `Tu gardes les récompenses des ${run.etage - 1} étage${run.etage > 2 ? "s" : ""} conquis, mais l'ascension s'arrête.`, boutons: [{ texte: "Continuer" }, { texte: "Quitter", classe: "danger", action: () => { let g = []; changer((x) => { g = recompensesTour(x, x.tourNid.run.etage - 1, false); x.tourNid.run = null; }); toast(g.length ? g.join(" · ") : "Ascension terminée.", "bon"); rendrePrep(); } }] }) }, "Quitter la tour")));
  return s;
}
function bonusTour(etage) { return Math.floor(etage / 7) + (etage >= ETAGES ? 1 : 0); }
function demarrerTour() {
  let ok = false;
  changer((e) => {
    if (!depenserEnergie(COUT_TOUR)) return;
    const ids = [];
    for (const elx of choixTour.oeufs) ids.push(especeTour(elx, ids));
    e.tourNid.run = { etage: 1, dragons: ids.map((id) => ({ id, niveau: 1 })), attente: null, debut: maintenant() };
    ok = true;
  });
  if (!ok) { toast("Pas assez d'énergie.", "mal"); return; }
  Son.eclosion();
  toast(`Les œufs éclosent : ${E().tourNid.run.dragons.map((x) => PAR_ID[x.id].nom).join(", ")} !`, "bon");
  rendrePrep();
}
function ajouterOeufTour(nouveau) {
  let nom = "";
  changer((e) => {
    const run = e.tourNid.run;
    if (!run) return;
    if (nouveau) {
      if (run.dragons.length >= 7 && choixTour.relache !== null) run.dragons.splice(choixTour.relache, 1);
      if (run.dragons.length < 7) {
        const id = especeTour(choixTour.nouvel, run.dragons.map((x) => x.id));
        // Le nouveau venu arrive au niveau du plus faible de l'équipe
        const niv = Math.max(1, Math.min(...run.dragons.map((x) => x.niveau), run.etage));
        run.dragons.push({ id, niveau: niv });
        nom = PAR_ID[id].nom;
      }
    }
    run.attente = null;
  });
  choixTour.relache = null;
  if (nom) { Son.eclosion(); toast(`${nom} rejoint ton équipe !`, "bon"); }
  rendrePrep();
}
function equipeMiroir(dragons, bonus) {
  const ids = [];
  return dragons.map((x) => { const id = especeTour(PAR_ID[x.id].element, ids); ids.push(id); return membreBot(id, Math.min(20, x.niveau + bonus), 4); });
}
// Récompenses quand l'ascension s'arrête (n étages conquis)
function recompensesTour(e, n, sommet) {
  const g = [];
  const r = e.ressources;
  if (n > 0) { r.rations += 4 * n; r.brindilles += 3 * n; r.pierres += 3 * n; g.push(`+${4 * n} rations`, `+${3 * n} brindilles`, `+${3 * n} pierres`); }
  let gem = (n >= 7 ? 30 : 0) + (n >= 14 ? 100 : 0) + (sommet ? 300 : 0);
  if (gem) { r.gemmes = (r.gemmes || 0) + gem; g.push(`+${gem} gemmes`); }
  if (sommet) {
    e.oeufs.choix += 1;
    e.oeufs.reserve.push({ uid: "o" + (++e.compteur), element: EL3[Math.floor(Math.random() * 3)], ul: true, mystere: true });
    remplirCouvoir();
    g.push("+1 œuf", "+1 œuf mystère UL (au couvoir)");
  }
  e.tourNid.record = Math.max(e.tourNid.record, n);
  return g;
}

// ---------- Défi en ligne : chacun sur son téléphone, reliés par un code ----------
let L = null;
const NOM_MAX = 18;
function nomMage() { return String(E().reglages.nomMage || "").trim().slice(0, NOM_MAX) || "Mage"; }
function nomPropre(x) { return String(x || "").replace(/[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u2028-\u202e\u2060-\u206f\ufeff]/g, "").trim().slice(0, NOM_MAX) || "Ton ami"; }
function dragonsPrets() { const e = E(); return prep.equipe.map((u) => e.dragons.find((d) => d.uid === u)).filter((d) => d && d.pv > 0); }
function equipeCompacte() { return dragonsPrets().map((d) => [d.id, d.niveau, d.nid || 0, d.armure || "", d.ul ? 1 : 0, Math.round(d.pv)]); }
function publierLigne() {
  if (!L || !L.salon) return;
  L.salon.envoyer({ v: VERSION_RESEAU, id: identifiant(), nom: nomMage(), hote: L.hote, eq: equipeCompacte(), pret: L.pret, g: L.graine, ...L.envoi });
}
// L'équipe de l'ami arrive en abrégé : on la reconstruit avec les mêmes règles, en vérifiant chaque valeur.
function decoderEquipe(eq) {
  const out = [];
  for (const x of (Array.isArray(eq) ? eq : []).slice(0, 7)) {
    if (!Array.isArray(x) || !PAR_ID[x[0]]) continue;
    const d = { id: x[0], niveau: Math.max(1, Math.min(20, x[1] | 0)), nid: Math.max(0, Math.min(3, x[2] | 0)), armure: null, ul: !!x[4] };
    if (typeof x[3] === "string" && armuresDe(d.id).some((a) => a.id === x[3])) d.armure = x[3];
    d.pv = Math.max(1, Math.min(pvMax(d), x[5] | 0));
    const m = membreJoueur(d);
    m.d = null;
    out.push(m);
  }
  return out;
}
function nouveauLien(code, hote) { return { code, hote, salon: null, autre: null, vuAutre: false, pret: 0, manche: 0, graine: 0, recu: {}, envoi: {}, statut: "connexion", absentDepuis: 0 }; }
// Sur téléphone, le bloc du défi est sous les modes : on le fait défiler jusqu'à lui
function montrerBlocLigne() { setTimeout(() => { const b = document.getElementById("cb-ligne"); if (b) {
    // Défile seulement verticalement, dans le panneau qui défile (jamais sur le côté)
    let boite = b.parentElement;
    while (boite && !(boite.scrollHeight > boite.clientHeight + 2 && /auto|scroll/.test(getComputedStyle(boite).overflowY))) boite = boite.parentElement;
    if (!boite) return;
    const haut = b.getBoundingClientRect().top - boite.getBoundingClientRect().top + boite.scrollTop;
    boite.scrollTo({ top: Math.max(0, haut - 12), left: 0, behavior: "smooth" });
  } }, 60); }
function creerLigne() { quitterLigne(); L = nouveauLien(nouveauCode(), true); Son.ok(); rendrePrep(); montrerBlocLigne(); brancher(L); }
function rejoindreLigne(code) { quitterLigne(); L = nouveauLien(code, false); rendrePrep(); montrerBlocLigne(); brancher(L); }
function quitterLigne() { if (L && L.salon) L.salon.fermer(); L = null; }
async function brancher(l) {
  const salon = await ouvrirSalon(l.code, (autre) => surNouvelle(l, autre), l.hote);
  if (L !== l) { if (salon) salon.fermer(); return; }
  if (!salon) { l.statut = "indisponible"; majLigne(); return; }
  l.salon = salon;
  l.statut = "attente";
  publierLigne();
  surNouvelle(l, salon.lire());
  if (!l.hote) setTimeout(() => { if (L === l && !l.vuAutre) { l.statut = "introuvable"; majLigne(); } }, 12000);
}
function surNouvelle(l, autre) {
  if (L !== l) return;
  l.autre = autre && Array.isArray(autre.eq) ? autre : null;
  if (l.autre) { l.vuAutre = true; if (l.statut === "introuvable") l.statut = "attente"; }
  if (C && C.mode === "ligne") { if (!C.fini) suiteLigneCombat(); return; }
  if (C) return;
  if (pretsTousLesDeux()) { lancer(); return; }
  majLigne();
}
// « prêt » vaut le numéro de la manche attendue : un vieux « prêt » de la manche d'avant ne relance rien
function pretsTousLesDeux() { return L && L.autre && L.pret === L.manche + 1 && L.autre.pret === L.manche + 1 && L.autre.eq.length > 0 && dragonsPrets().length > 0; }
function basculerPret() {
  if (!L) return;
  if (L.pret) L.pret = 0;
  else {
    if (!dragonsPrets().length) { toast("Choisis au moins un dragon en forme."); return; }
    L.pret = L.manche + 1;
    if (L.hote) L.graine = (Math.random() * 2147483647) | 0;
  }
  Son.clic();
  publierLigne();
  if (pretsTousLesDeux()) { lancer(); return; }
  majLigne();
}
function blocNomLigne() {
  return [el("label", { style: { display: "grid", gap: "4px", fontSize: "13px" } }, el("span", { class: "doux" }, "Ton nom de mage (ton ami le verra)"),
    el("input", { type: "text", maxlength: NOM_MAX, value: E().reglages.nomMage || "", placeholder: "Mage", autocomplete: "off", spellcheck: "false", style: { minHeight: "42px", padding: "8px 10px", borderRadius: "10px", border: "1px solid var(--trait-fort)", background: "rgba(255,255,255,.05)", color: "var(--texte)", font: "inherit", userSelect: "text" },
      oninput: (ev) => { E().reglages.nomMage = ev.target.value.slice(0, NOM_MAX); }, onchange: () => { changer(); publierLigne(); } }))];
}
function blocLigne() { const b = el("div", { class: "cb-ligne", id: "cb-ligne" }); remplirLigne(b); return b; }
function majLigne() { const b = document.getElementById("cb-ligne"); if (b) { b.innerHTML = ""; remplirLigne(b); } }
function remplirLigne(b) {
  const r = modeReseau();
  if (r === null) { b.append(el("p", { class: "doux" }, "Connexion…")); preparer().then(majLigne); return; }
  if (r === "aucun") { b.append(el("p", { class: "doux" }, "Impossible de se connecter pour le défi en ligne (navigateur trop ancien ou pas d'Internet). Utilise « Défi entre amis » sur le même appareil.")); return; }
  if (!L) {
    b.append(el("p", {}, "Crée une partie et envoie le code à ton ami. Ou entre le code qu'il t'a donné."));
    b.append(el("button", { class: "btn principal", onclick: creerLigne }, "Créer une partie"));
    const saisie = el("input", { class: "code", maxlength: 4, placeholder: "CODE", autocomplete: "off", autocapitalize: "characters", spellcheck: "false", "aria-label": "Code de la partie de ton ami" });
    const rejoindre = () => { const c = saisie.value.toUpperCase().replace(/[^A-Z0-9]/g, ""); if (!codeValide(c)) { Son.erreur ? Son.erreur() : null; toast("Le code fait 4 caractères (lettres et chiffres).", "mal"); return; } Son.ok(); rejoindreLigne(c); };
    saisie.addEventListener("keydown", (ev) => { if (ev.key === "Enter") rejoindre(); });
    b.append(el("div", { class: "rang" }, saisie, el("button", { class: "btn", onclick: rejoindre }, "Rejoindre")));
    return;
  }
  if (L.hote) {
    b.append(el("p", {}, "Donne ce code à ton ami :"), el("div", { class: "code-gros" }, L.code));
    const lien = lienInvitation(L.code);
    const champ = el("input", { class: "lien", readonly: true, value: lien, "aria-label": "Lien d'invitation" });
    const copier = el("button", { class: "btn petit", onclick: async () => {
      try { await navigator.clipboard.writeText(lien); copier.textContent = "Copié !"; } catch (e) { champ.select(); copier.textContent = "Sélectionné"; }
      setTimeout(() => { copier.textContent = "Copier le lien"; }, 1600);
    } }, "Copier le lien");
    b.append(el("div", { class: "rang" }, champ, copier));
    b.append(el("p", { class: "doux", style: { fontSize: "12px" } }, modeReseau() === "salon" ? "Ton ami ouvre le jeu sur son téléphone, va dans Combat › Défi en ligne et tape le code. Il doit pouvoir ouvrir la page : invite-le depuis le menu Partager." : "Ton ami ouvre le lien, ou va dans Combat › Défi en ligne et tape le code."));
  } else b.append(el("p", {}, "Partie ", el("b", { class: "num" }, L.code)));
  const a = L.autre;
  let pastille = "", texte;
  if (L.statut === "connexion") texte = "Connexion au salon…";
  else if (L.statut === "indisponible") texte = L.hote ? "Impossible d'ouvrir la partie (ce code est peut-être déjà pris). Quitte et crée une nouvelle partie." : "Impossible de se connecter. Vérifie ta connexion, puis réessaie.";
  else if (L.statut === "introuvable" && !a) texte = `Personne avec le code ${L.code} pour l'instant. Vérifie le code, ou attends que ton ami crée la partie.`;
  else if (!a) texte = L.vuAutre ? "Ton ami a quitté la partie." : L.hote ? "En attente de ton ami…" : "Connexion à la partie…";
  else {
    const n = a.eq.length;
    pastille = a.pret === L.manche + 1 ? "pret" : "la";
    texte = `${nomPropre(a.nom)} est là · ${n} dragon${n > 1 ? "s" : ""} · ${a.pret === L.manche + 1 ? "prêt !" : "choisit son équipe"}`;
  }
  b.append(el("div", { class: "statut-ami" }, el("i", { class: pastille }), el("span", {}, texte)));
  const nb = dragonsPrets().length;
  b.append(el("button", { class: "btn" + (L.pret ? "" : " principal"), disabled: !L.salon || (!L.pret && !nb), style: { padding: "12px" }, onclick: basculerPret },
    L.pret ? "Annuler « prêt »" : nb ? `Je suis prêt (${nb} dragon${nb > 1 ? "s" : ""})` : "Choisis au moins un dragon"));
  if (L.pret && a && a.pret !== L.manche + 1) b.append(el("p", { class: "doux" }, `Le combat commence dès que ${nomPropre(a.nom)} est prêt.`));
  b.append(el("button", { class: "btn petit", onclick: () => { quitterLigne(); rendrePrep(); } }, "Quitter la partie"));
}
// Pendant le combat : on range le choix reçu pour son tour, et on révèle dès que les deux ont choisi.
function suiteLigneCombat() {
  const l = L, a = l.autre;
  if (!a) {
    if (!l.absentDepuis) { l.absentDepuis = Date.now(); toast(`${C.noms[1]} ne répond plus…`, "mal"); setTimeout(() => verifierAbsence(l), 20000); }
    return;
  }
  if (l.absentDepuis) { l.absentDepuis = 0; toast(`${C.noms[1]} est de retour.`, "bon"); }
  if (a.gc !== C.graine) return;
  if (a.ab) { finCombat("abandon"); return; }
  if (typeof a.t === "number" && Array.isArray(a.c)) l.recu[a.t] = a.c;
  essayerReveler();
}
function verifierAbsence(l) {
  if (L === l && C && C.mode === "ligne" && !C.fini && !l.autre && l.absentDepuis && Date.now() - l.absentDepuis >= 19000) finCombat("parti");
}
function essayerReveler() {
  if (!C || C.fini || C.mode !== "ligne" || !C.choix[0] || C.choix[1] || C.revele === C.tour) return;
  const c = L && L.recu[C.tour];
  if (!c) return;
  const eq = C.equipes[1];
  let i = c[0] | 0, j = c[1] | 0;
  if (!eq[i] || eq[i].pv <= 0) i = eq.findIndex((m) => m.pv > 0);
  if (i < 0) return;
  if (!eq[i].postures[j]) j = 0;
  C.choix[1] = { i, j, m: eq[i], p: eq[i].postures[j] };
  C.revele = C.tour;
  reveler();
}

function coutMode(mode) {
  const et = etapeTuto();
  if (et !== "fini") return 0;
  return mode === "bot" ? COUT.combat : mode === "sauvage" ? 2 : 0; // la tour se paie à l'entrée
}

function membreJoueur(d) {
  return { d, id: d.id, niveau: d.niveau, stade: stadeEffectif(d), pv: d.pv, pvMax: pvMax(d), postures: postures(d), element: PAR_ID[d.id].element, nom: PAR_ID[d.id].nom, armure: d.armure, ul: d.ul, utilise: false };
}

function lancer() {
  const e = E();
  const cout = coutMode(prep.mode);
  if (cout) {
    let ok = false;
    changer(() => { ok = depenserEnergie(cout); });
    if (!ok) { toast("Pas assez d'énergie.", "mal"); return; }
  }
  const et = etapeTuto();
  const run = prep.mode === "tour" ? e.tourNid.run : null;
  if (prep.mode === "tour" && (!run || run.attente)) return;
  const moi = run ? run.dragons.map((x) => membreBot(x.id, x.niveau, 4)) : (prep.mode === "ligne" ? dragonsPrets() : prep.equipe.map((u) => e.dragons.find((d) => d.uid === u)).filter(Boolean)).map(membreJoueur);
  if (!moi.length) { toast("Choisis au moins un dragon en forme.", "mal"); return; }
  const niveaux = moi.map((m) => m.niveau);
  const stadeMax = Math.max(...moi.map((m) => m.stade));
  let lui, nomAdv;
  const moyen = Math.round(niveaux.reduce((a, b) => a + b, 0) / niveaux.length);
  if (prep.mode === "bot") {
    lui = et === "mage" ? equipeBot([3, 3, 3], 0) : equipeBot(niveaux, stadeMax);
    nomAdv = "Mage " + NOMS_BOT[Math.floor(Math.random() * NOMS_BOT.length)] + (et === "mage" ? "" : " (bot)");
  } else if (prep.mode === "sauvage") {
    const n = Math.max(1, Math.min(3, moi.length));
    const nv = et === "sauvage1" ? 1 : et === "sauvage2" ? 2 : Math.max(1, moyen - 1);
    lui = equipeBot(new Array(n).fill(nv), stadeMax);
    nomAdv = "Dragons sauvages";
  } else if (prep.mode === "tour") {
    lui = equipeMiroir(run.dragons, bonusTour(run.etage));
    nomAdv = run.etage >= ETAGES ? "Gardien du sommet" : `Mage de l'étage ${run.etage}`;
  } else if (prep.mode === "ligne") {
    if (!L || !L.autre) return;
    lui = decoderEquipe(L.autre.eq);
    nomAdv = nomPropre(L.autre.nom);
    if (!lui.length || !moi.length) return;
  } else { lui = equipeBot(new Array(Math.max(3, moi.length)).fill(prep.niveauAmi), 4); nomAdv = "Joueur 2"; }
  C = { mode: prep.mode, tour: 1, totaux: [0, 0], equipes: [moi, lui], noms: ["Toi", nomAdv], choix: [null, null], fini: false, sel: [null, null], historique: [], etage: run ? run.etage : 0 };
  if (prep.mode === "ligne") {
    C.hote = L.hote;
    C.graine = L.hote ? L.graine : (L.autre.g | 0);
    L.manche++; L.recu = {}; L.envoi = {}; L.absentDepuis = 0;
  }
  ctxJeu.cacherInterface(true);
  D.orbite.auto = 0;
  viserArene();
  ctxJeu.moteur.definirZone({ x: 0, y: 0.06, l: 1, h: window.innerWidth > 760 ? 0.58 : 0.5 });
  Musique.jouer("combat");
  ui.innerHTML = "";
  if (prep.mode !== "ami") {
    const nivAdv = Math.round(lui.reduce((s, m) => s + m.niveau, 0) / lui.length);
    const textes = prep.mode === "ligne"
      ? ["Défi en ligne", `${nomAdv} est prêt !`, `${lui.length} dragon${lui.length > 1 ? "s" : ""} de niveau ${nivAdv} en moyenne. Chacun choisit en secret sur son téléphone.`]
      : prep.mode === "tour"
      ? [`La tour du nid · étage ${run.etage}/${ETAGES}`, run.etage >= ETAGES ? "Le gardien du sommet se dresse !" : `${nomAdv} t'attend`, `Même équipe que toi : ${lui.length} dragon${lui.length > 1 ? "s" : ""} de niveau ${nivAdv} en moyenne.`]
      : prep.mode === "sauvage"
      ? ["Les herbes bougent…", "Des dragons sauvages surgissent !", `${lui.length} dragon${lui.length > 1 ? "s" : ""} sauvage${lui.length > 1 ? "s" : ""} de niveau ${nivAdv}.`]
      : et === "mage"
        ? ["Un portail s'ouvre…", `${nomAdv} te défie !`, "Ton premier duel contre un autre mage. Il va essayer de deviner tes choix."]
        : ["Recherche d'un mage…", "Aucun mage de ton niveau en ligne", `${nomAdv.replace(" (bot)", "")}, mage-bot de niveau ${nivAdv}, accepte le défi.`];
    const m = el("div", { class: "relais" }, el("div", {}, el("div", { class: "etiquette" }, textes[0]), el("h2", {}, textes[1]), el("p", { class: "doux" }, textes[2])));
    ui.append(m);
    setTimeout(() => { m.remove(); debutTour(); }, 1800);
  } else debutTour();
}

// ---------- Déroulement d'un tour ----------
const etroit = () => window.innerWidth / window.innerHeight < 0.8;
function viserArene() { D.orbite.viser(new T.Vector3(0, 0.5, -0.5), etroit() ? 12.5 : 8.6, 0.5, 1.0); }
// Pendant une attaque, la caméra se place derrière l'attaquant
function viserPhase(k) { D.orbite.viser(new T.Vector3(0, 0.6, k === 0 ? -0.7 : 0.7), etroit() ? 11.5 : 8, k === 0 ? 0.6 : Math.PI - 0.6, 1.02); }
let chronoInt = null;
function debutTour() {
  if (!C || C.fini) return;
  // Fin si plus personne ne peut jouer
  const vivants = C.equipes.map((eq) => eq.some((m) => m.pv > 0));
  if (C.tour > TOURS || !vivants[0] || !vivants[1]) { finCombat(); return; }
  C.choix = [null, null];
  C.dernierChoix = null;
  viserArene();
  if (C.mode === "bot" || C.mode === "sauvage" || C.mode === "tour") C.choix[1] = choixOrdinateur(C.equipes[1], C.equipes[0], C.mode === "sauvage" ? 0.45 : C.mode === "tour" ? Math.max(0, 0.5 - C.etage * 0.024) : 0.12);
  if (!D.cotes[0]) { const m = C.equipes[0].find((x) => x.pv > 0); placerDragon(0, m); }
  if (!D.cotes[1]) { const m = C.equipes[1].find((x) => x.pv > 0); placerDragon(1, m); }
  rendreChoix(0);
}

function rendreHaut() {
  const h = el("div", { class: "cb-haut" });
  const cote = (i) => el("div", { class: "score panneau" + (i ? " droite" : "") },
    el("div", { class: "nom" }, C.noms[i]),
    el("div", { class: "tot" }, Math.round(C.totaux[i])),
    el("div", { class: "points-eq" }, C.equipes[i].map((m) => el("i", { class: (m.pv <= 0 ? "ko " : "") + m.element, title: `${m.nom} ${Math.max(0, Math.round(m.pv))}/${m.pvMax}`, style: { background: ELEMENTS[m.element].couleur, opacity: m.pv <= 0 ? 0.2 : 0.35 + 0.65 * (m.pv / m.pvMax) } }))),
  );
  h.append(cote(0), el("div", { class: "tour panneau" }, el("span", { class: "etiquette" }, "Tour"), el("b", {}, `${Math.min(C.tour, TOURS)} / ${TOURS}`), el("span", { class: "chrono", id: "chrono" }, "")), cote(1));
  return h;
}

// Choix secret, en trois temps : l'élément, puis le dragon de cet élément, puis sa posture.
function rendreChoix(joueur) {
  const defil = C.dernierChoix === joueur ? memoriserDefilement(".cb-bas .rangee") : null;
  C.dernierChoix = joueur;
  ui.innerHTML = "";
  ui.append(rendreHaut());
  if (C.tour === 1 && etapeTuto() !== "fini" && C.mode !== "ami" && C.mode !== "ligne") afficherTuto(); else cacherBulle(true);
  const equipe = C.equipes[joueur];
  let sel = C.sel[joueur];
  if (!sel || !equipe[sel.i] || equipe[sel.i].pv <= 0) {
    const i = equipe.findIndex((m) => m.pv > 0);
    sel = C.sel[joueur] = { el: equipe[i].element, i, j: meilleurePosture(equipe[i]) };
  }
  if (!sel.el) sel.el = equipe[sel.i].element;
  const bas = el("section", { class: "cb-bas panneau" });
  bas.append(el("div", { class: "valider" },
    el("b", { style: { fontFamily: "var(--titre)" } }, C.mode === "ami" ? `Joueur ${joueur + 1} : choisis en secret` : "Ton coup secret"),
    el("span", { class: "doux", style: { fontSize: "12px" } }, "1. un élément · 2. un dragon · 3. une posture")));
  const ligneEl = el("div", { class: "cb-elements" });
  for (const elx of ["feu", "glace", "eau"]) {
    const vivants = equipe.filter((m) => m.element === elx && m.pv > 0);
    const tous = equipe.filter((m) => m.element === elx);
    const craint = Object.keys(ELEMENTS).find((x) => domine(x, elx));
    ligneEl.append(el("button", { class: `el-btn ${elx} ${sel.el === elx ? "choisi" : ""}`, disabled: !vivants.length, onclick: () => {
      Son.clic();
      const m = vivants[0];
      const i = equipe.indexOf(m);
      C.sel[joueur] = { el: elx, i, j: meilleurePosture(m) };
      montrerChoix(joueur, m);
      rendreChoix(joueur);
    } },
      el("b", {}, ELEMENTS[elx].nom),
      el("small", {}, tous.length ? `${vivants.length} dragon${vivants.length > 1 ? "s" : ""} en forme` : "aucun dragon"),
      el("small", {}, `bat ${ELEMENTS[ELEMENTS[elx].bat[0]].nom} · craint ${ELEMENTS[craint].nom}`)));
  }
  bas.append(ligneEl);
  const rang = el("div", { class: "rangee" });
  equipe.forEach((m, i) => {
    if (m.element !== sel.el) return;
    rang.append(el("button", { class: `carte-dr ${m.element} ${sel.i === i ? "choisi" : ""} ${m.pv <= 0 ? "ko" : ""}`, disabled: m.pv <= 0, onclick: () => { Son.clic(); C.sel[joueur] = { el: m.element, i, j: meilleurePosture(m) }; montrerChoix(joueur, m); rendreChoix(joueur); } },
      el("b", {}, m.nom), el("div", { class: "meta" }, el("span", {}, `Nv ${m.niveau}`), el("span", {}, `${m.postures.length} posture${m.postures.length > 1 ? "s" : ""}`)),
      barre(Math.max(0, m.pv), m.pvMax, "pv"), el("span", { class: "num doux" }, m.pv <= 0 ? "K.O." : `${Math.round(m.pv)} PV`)));
  });
  bas.append(rang);
  const m = equipe[sel.i];
  const rp = el("div", { class: "rangee" });
  const battu = Object.keys(ELEMENTS).find((x) => domine(x, m.element));
  m.postures.forEach((p, j) => {
    rp.append(el("button", { class: "posture" + (sel.j === j ? " choisi" : ""), onclick: () => { Son.clic(); C.sel[joueur].j = j; rendreChoix(joueur); } },
      el("b", {}, p.nom),
      el("span", { class: "style" }, `${NOMS_STYLE[styleAttaque(p)]} · ${NOMS_DEFENSE[styleDefense(p)]}`),
      el("div", { class: "stats" }, el("span", { title: "Attaque" }, icone("epee"), p.atk), el("span", { title: "Défense" }, icone("bouclier"), p.def)),
      el("div", { class: "el" }, `Contre ${ELEMENTS[ELEMENTS[m.element].bat[0]].nom} : +${Math.round(p.bonus * 100)} %`, el("br"), `Frappé par ${ELEMENTS[battu].nom} : +${Math.round(p.faib * 100)} %`)));
  });
  bas.append(rp);
  bas.append(el("div", { class: "valider" },
    el("button", { class: "btn danger petit", onclick: () => modale({ titre: "Abandonner ?", contenu: "Le combat compte comme une défaite. Les PV déjà perdus restent perdus.", boutons: [{ texte: "Continuer le combat" }, { texte: "Abandonner", classe: "danger", action: () => abandonner() }] }) }, "Abandonner"),
    el("span", { class: "doux", style: { fontSize: "12px" } }, `${m.nom} · ${m.postures[sel.j].nom}`),
    el("button", { class: "btn principal", onclick: () => valider(joueur) }, "Valider en secret"),
  ));
  ui.append(bas);
  restaurerDefilement(".cb-bas .rangee", defil);
  demarrerChrono(joueur);
}

// Montre le dragon choisi dans l'arène (sauf entre amis : l'autre joueur pourrait le voir)
function montrerChoix(joueur, m) {
  if (C.mode === "ami" || joueur !== 0 || !D) return;
  placerDragon(0, m, true);
}

// Le chrono tourne une seule fois par joueur et par tour (changer d'avis ne le relance pas)
function demarrerChrono(joueur) {
  // En ligne, le chrono est toujours actif : personne ne peut bloquer la partie
  const limite = C.mode === "ligne" ? (E().reglages.chrono || 30) : E().reglages.chrono;
  const cle = `${C.tour}-${joueur}`;
  const majC = () => { const c = document.getElementById("chrono"); if (c && C.finChrono) c.textContent = `${Math.max(0, Math.ceil((C.finChrono - Date.now()) / 1000))} s`; };
  if (!limite) return;
  if (C.cleChrono === cle) { majC(); return; }
  C.cleChrono = cle;
  C.finChrono = Date.now() + limite * 1000;
  clearInterval(chronoInt);
  majC();
  chronoInt = setInterval(() => {
    const reste = Math.ceil((C.finChrono - Date.now()) / 1000);
    majC();
    if (reste <= 5 && reste > 0 && C.dernierTic !== reste) { C.dernierTic = reste; Son.tic(); }
    if (reste <= 0) {
      clearInterval(chronoInt);
      toast("Temps écoulé : choix au hasard.", "mal");
      const o = options(C.equipes[joueur]); const r = o[Math.floor(Math.random() * o.length)];
      C.sel[joueur] = { el: r.m.element, i: r.i, j: r.j };
      valider(joueur);
    }
  }, 250);
}

function meilleurePosture(m) { let b = 0; m.postures.forEach((p, j) => { if (p.atk + p.def > m.postures[b].atk + m.postures[b].def) b = j; }); return b; }

function valider(joueur) {
  clearInterval(chronoInt);
  Son.ok();
  const s = C.sel[joueur];
  const m = C.equipes[joueur][s.i];
  C.choix[joueur] = { i: s.i, j: s.j, m, p: m.postures[s.j] };
  if (C.mode === "ami" && joueur === 0) {
    ui.innerHTML = "";
    ui.append(el("div", { class: "relais" }, el("div", {}, el("h2", {}, "Passe l'appareil au joueur 2"), el("p", { class: "doux" }, "Joueur 1 a fait son choix. Joueur 2, à toi, sans regarder celui de l'autre."), el("button", { class: "btn principal", onclick: () => rendreChoix(1) }, "Je suis le joueur 2"))));
    return;
  }
  if (C.mode === "ligne") {
    L.envoi = { t: C.tour, c: [s.i, s.j], gc: C.graine };
    publierLigne();
    ui.innerHTML = "";
    ui.append(rendreHaut());
    ui.append(el("section", { class: "cb-attente panneau" },
      el("div", { class: "etiquette" }, "Choix envoyé"),
      el("h2", {}, `${C.noms[1]} choisit`, el("span", { class: "points" })),
      el("p", { class: "doux", style: { margin: 0, fontSize: "13px" } }, `${m.nom} · ${m.postures[s.j].nom}. Ton coup reste secret jusqu'à ce que vous ayez choisi tous les deux.`),
      el("button", { class: "btn danger petit", style: { justifySelf: "center" }, onclick: () => modale({ titre: "Abandonner ?", contenu: "Ton ami gagne le combat.", boutons: [{ texte: "Continuer" }, { texte: "Abandonner", classe: "danger", action: () => abandonner() }] }) }, "Abandonner")));
    essayerReveler();
    return;
  }
  reveler();
}

// Pause qui suit la vitesse du combat
const pause = (ms) => new Promise((r) => setTimeout(r, ms / D.vitesse));

// Calcule un coup, en gardant chaque étape pour l'afficher
function calculerCoup(att, def, rnd) {
  const r = tirerAlea(rnd);
  const base = degats(att.p.atk, def.p.def, att.m.element, att.m.element, 0, 0, 1);
  const brut = degats(att.p.atk, def.p.def, att.m.element, def.m.element, att.p.bonus, def.p.faib, 1);
  const mult = base > 0 ? brut / base : 1;
  return { base, mult, alea: r.a, chance: r.chance, d: Math.round(brut * r.a), dom: domine(att.m.element, def.m.element), faible: domine(def.m.element, att.m.element) };
}

async function reveler() {
  cacherBulle(true);
  ui.innerHTML = "";
  ui.append(rendreHaut());
  const [a, b] = C.choix;
  const jeton = C;
  placerDragon(0, a.m);
  placerDragon(1, b.m);
  const annonce = el("div", { class: "annonce" }, el("span", { style: { color: ELEMENTS[a.m.element].couleur } }, a.p.nom), el("span", { class: "doux", style: { fontSize: "0.5em", display: "block" } }, "contre"), el("span", { style: { color: ELEMENTS[b.m.element].couleur } }, b.p.nom));
  ui.append(annonce);
  // Les deux coups sont tirés en même temps (les dégâts comptent même si l'un tombe K.O.)
  // En ligne, le hasard vient d'une graine commune : les deux téléphones tirent exactement les mêmes dégâts
  const flux = (h) => (C.mode === "ligne" ? aleaGraine(C.graine, C.tour, h ? 1 : 2) : undefined);
  C.coups = [calculerCoup(a, b, flux(C.hote)), calculerCoup(b, a, flux(!C.hote))];
  a.m.utilise = true; b.m.utilise = true;
  C.historique.push({ tour: C.tour, a: `${a.m.nom} (${a.p.nom})`, b: `${b.m.nom} (${b.p.nom})`, d1: C.coups[0].d, d2: C.coups[1].d });
  await pause(1300);
  annonce.remove();
  if (C !== jeton || C.fini) return;
  await phase(0);
  if (C !== jeton || C.fini) return;
  await phase(1);
  if (C !== jeton || C.fini) return;
  ui.querySelector(".fiche-coup")?.remove();
  viserArene();
  apresCoups(C.coups[0].d, C.coups[1].d);
}

const nombre = (x, n = 2) => x.toLocaleString("fr-FR", { minimumFractionDigits: n, maximumFractionDigits: n });

// Fiche du coup : qui attaque, qui défend, et le calcul des dégâts ligne par ligne
function ficheCoup(k, sa, sd) {
  const att = C.choix[k], def = C.choix[1 - k], cp = C.coups[k];
  const titre = C.mode === "ami" ? `Joueur ${k + 1} attaque` : k === 0 ? "Tu attaques" : `${C.noms[1].replace(" (bot)", "")} attaque`;
  const sous = C.mode === "ami" ? "" : k === 0 ? "" : "Ta défense";
  const v = D.vitesse;
  const bouton = el("button", { class: "btn petit", onclick: () => { D.vitesse = D.vitesse === 1 ? 2 : 1; changer((s) => { s.reglages.vitesseCombat = D.vitesse; }); bouton.textContent = `Vitesse × ${D.vitesse}`; } }, `Vitesse × ${v}`);
  const auto = C.mode === "ligne" ? null : el("label", { class: "fc-auto" }, el("input", { type: "checkbox", checked: !!E().reglages.combatAuto, onchange: (ev) => { changer((s) => { s.reglages.combatAuto = ev.target.checked; }); if (ev.target.checked && f._suite) f._suite(); } }), "Enchaîner");
  const cote = (m, p, tag, val, ic, droite) => el("div", { class: "fc-cote" + (droite ? " droite" : ""), style: { "--el": ELEMENTS[m.element].couleur } },
    el("span", { class: "tag" }, tag), el("span", { class: "nm" }, m.nom), el("span", { class: "ps" }, p.nom),
    el("span", { class: "val" }, icone(ic), val));
  const ligne = (i, txt, petit, val, cls = "") => el("div", { class: "fc-ligne " + cls, style: { animationDelay: `${(0.25 + i * 0.35) / v}s` } }, el("span", {}, txt, petit ? el("small", {}, " " + petit) : null), el("span", {}, val));
  const eA = ELEMENTS[att.m.element].nom, eD = ELEMENTS[def.m.element].nom;
  const lElem = cp.dom
    ? ligne(1, `${eA} bat ${eD}`, `(+${Math.round(att.p.bonus * 100)} % posture, +${Math.round(def.p.faib * 100)} % faiblesse)`, `× ${nombre(cp.mult)}`, "bon")
    : cp.faible ? ligne(1, `${eA} craint ${eD}`, "(peu efficace)", `× ${nombre(cp.mult)}`, "mal")
      : ligne(1, "Même élément", "", "× 1");
  const valeur = el("b", {}, "…");
  const total = el("div", { class: "fc-total" }, el("span", {}, "Dégâts"), valeur);
  const f = el("section", { class: `fiche-coup panneau ${k === 0 ? "nous" : "eux"}` },
    el("div", { class: "fc-tete" }, el("div", {}, el("b", {}, titre), sous ? el("span", { class: "doux", style: { fontSize: "12px", marginLeft: "8px" } }, sous) : null), el("div", { class: "fc-outils" }, auto, bouton)),
    el("div", { class: "fc-duel" },
      cote(att.m, att.p, `Attaque · ${NOMS_STYLE[sa]}`, att.p.atk, "epee", false),
      el("span", { class: "fc-fleche" }, "→"),
      cote(def.m, def.p, `Défense · ${NOMS_DEFENSE[sd]}`, def.p.def, "bouclier", true)),
    el("div", { class: "fc-calc" },
      ligne(0, `Force : attaque ${att.p.atk} contre défense ${def.p.def}`, "", nombre(cp.base, 1)),
      lElem,
      cp.chance ? ligne(2, "Coup de chance !", "", `× ${nombre(cp.alea)}`, "chance") : ligne(2, "Hasard", "(entre × 0,90 et × 1,10)", `× ${nombre(cp.alea)}`)),
    total);
  f.montrerTotal = () => { valeur.textContent = `−${cp.d}`; total.classList.add("vu"); };
  return f;
}

// Une phase : le dragon du côté k attaque, l'autre défend
async function phase(k) {
  const att = D.cotes[k], cib = D.cotes[1 - k];
  const ch = C.choix[k], chD = C.choix[1 - k], cp = C.coups[k];
  const sa = styleAttaque(ch.p), sd = styleDefense(chD.p);
  const elA = ch.m.element;
  const fort = cp.dom || cp.chance;
  viserPhase(k);
  ui.querySelector(".fiche-coup")?.remove();
  const fiche = ficheCoup(k, sa, sd);
  ui.append(fiche);
  let bouclier = null;
  let touche;
  const fini = new Promise((r) => (touche = r));
  let fait = false;
  // Le coup arrive : dégâts, chiffre flottant, réaction du défenseur
  const impact = () => {
    if (fait) return;
    fait = true;
    if (sd === "esquive") cib.anim.flash = 1; else cib.anim.jouer("coup");
    if (bouclier) bouclier.eclat = 1;
    chiffreDegat(1 - k, cp.d, { domine: cp.dom, faible: cp.faible, chance: cp.chance });
    chD.m.pv -= cp.d; C.totaux[k] += cp.d;
    fiche.montrerTotal();
    const h = ui.querySelector(".cb-haut"); if (h) h.replaceWith(rendreHaut());
    touche();
  };
  // Le défenseur réagit au moment où l'attaque part
  const reagir = () => {
    if (sd === "esquive") { cib.anim.sens = Math.random() < 0.5 ? -1 : 1; cib.anim.jouer("esquive"); }
  };
  const secours = setTimeout(impact, 5000 / D.vitesse);
  await pause(350);
  if (sd === "bouclier") { cib.anim.jouer("parade"); bouclier = montrerBouclier(1 - k, chD.m.element); }
  const departZ = att.support.position.z;
  const dir = k === 0 ? -1 : 1;
  const rayon = (c) => Math.max(c.rig.taille.x, c.rig.taille.z) * c.ech * 0.5;
  const zContact = cib.support.position.z - dir * Math.max(1.3, (rayon(att) + rayon(cib)) * 0.8);
  if (sa === "souffle") {
    att.anim.jouer("attaque", { style: "souffle", surImpact: () => {
      Son.souffle(elA); reagir();
      souffle(att, cib, elA, fort, impact, fort ? 34 : 26);
    } });
  } else if (sa === "tourbillon") {
    att.anim.jouer("attaque", { style: "tourbillon", surImpact: () => {
      Son.souffle(elA); reagir();
      const debut = posMonde(att.rig.tronc), fin = posMonde(cib.rig.tronc);
      const parts = [];
      for (let i = 0; i < (fort ? 30 : 22); i++) parts.push({ mode: "spirale", delai: i * 0.02, duree: 0.6, debut: debut.clone(), fin: fin.clone().add(alea3(0.3)), rayon: 0.6 + Math.random() * 0.4, phase: (i / 6) * Math.PI * 2, tours: 1.5 });
      nuee(elA, fort, parts, fin, impact);
    } });
  } else if (sa === "pluie") {
    att.anim.jouer("attaque", { style: "pluie", surImpact: async () => {
      Son.souffle(elA);
      const bouche = posMonde(att.rig.boutMuseau);
      const haut = bouche.clone().add(new T.Vector3(0, 4, 0));
      const montee = [];
      for (let i = 0; i < 12; i++) montee.push({ delai: i * 0.02, duree: 0.35, debut: bouche.clone(), fin: haut.clone().add(alea3(0.8)), arc: 0 });
      nuee(elA, false, montee, null, null);
      await pause(380);
      reagir();
      const fin = posMonde(cib.rig.tronc);
      const pluie = [];
      for (let i = 0; i < (fort ? 18 : 13); i++) {
        const cible = fin.clone().add(new T.Vector3((Math.random() - 0.5) * 1.6, (Math.random() - 0.5) * 0.4, (Math.random() - 0.5) * 1.6));
        pluie.push({ mode: "chute", delai: i * 0.045, duree: 0.45, taille: 0.16, debut: cible.clone().add(new T.Vector3((Math.random() - 0.5) * 0.6, 5, (Math.random() - 0.5) * 0.6)), fin: cible });
      }
      nuee(elA, fort, pluie, fin, impact, true);
    } });
  } else if (sa === "onde") {
    att.anim.jouer("attaque", { style: "onde", surImpact: () => {
      Son.souffle(elA); reagir();
      onde(k, elA, () => { eclatement(posMonde(cib.rig.tronc), elA, fort); impact(); });
    } });
  } else {
    // Corps à corps : morsure, griffes ou charge
    if (sa === "charge") {
      await glisser(att.support, departZ - dir * 0.6, 0.3);
      att.anim.jouer("attaque", { style: "charge" });
      reagir();
      await glisser(att.support, zContact, 0.32);
      eclatement(posMonde(cib.rig.tronc), elA, true);
      D.secousse = 1.3;
      impact();
    } else {
      await glisser(att.support, zContact, 0.45);
      reagir();
      await new Promise((r) => att.anim.jouer("attaque", { style: sa, surImpact: () => {
        if (sa === "griffe") griffures(1 - k, elA);
        eclatement(posMonde(cib.rig.tronc), elA, fort);
        impact();
        r();
      } }));
    }
    await pause(350);
    await glisser(att.support, departZ, 0.5);
  }
  await fini;
  clearTimeout(secours);
  await pause(1100);
  if (bouclier) bouclier.vise = 0;
  await attendreSuite(fiche);
}
// Après chaque attaque, le récapitulatif reste à l'écran jusqu'à « Continuer » (sauf si « Enchaîner » est coché)
function attendreSuite(fiche) {
  if (!C || C.fini || C.mode === "ligne" || E().reglages.combatAuto) return Promise.resolve();
  return new Promise((r) => {
    const barreS = el("div", { class: "fc-suite" }, el("button", { class: "btn principal", onclick: () => { Son.clic(); fin(); } }, "Continuer ›"));
    const fin = () => { fiche._suite = null; barreS.remove(); r(); };
    fiche._suite = fin;
    fiche.append(barreS);
  });
}

function apresCoups(d1, d2) {
  for (const c of [0, 1]) {
    const m = C.choix[c].m;
    if (m.pv <= 0) { m.pv = 0; D.cotes[c].anim.jouer("ko"); Son.crier(m.element, 0.8); toast(`${m.nom} est K.O. !`, c === 0 ? "mal" : "bon"); }
  }
  // Rafraîchit le haut
  const h = ui.querySelector(".cb-haut"); if (h) h.replaceWith(rendreHaut());
  setTimeout(() => {
    for (const c of [0, 1]) if (D.cotes[c] && D.cotes[c].membre.pv <= 0) { const suivant = C.equipes[c].find((x) => x.pv > 0); if (suivant) placerDragon(c, suivant); }
    C.tour++;
    debutTour();
  }, 1700);
}

function ecrirePv() {
  // Les PV des dragons du joueur restent perdus après le combat
  changer(() => {
    for (const m of C.equipes[0]) if (m.d) m.d.pv = Math.max(0, Math.round(m.pv));
  });
}

function abandonner(silencieux = false) {
  if (!C || C.fini) return;
  C.fini = true;
  clearInterval(chronoInt);
  if (C.mode === "ligne") { if (L) { L.envoi = { ab: 1, gc: C.graine }; L.pret = 0; publierLigne(); } }
  else if (C.mode !== "tour") ecrirePv();
  changer((e) => {
    if (C.mode === "bot") e.combats.perdus++;
    if (C.mode === "tour" && e.tourNid.run) { recompensesTour(e, e.tourNid.run.etage - 1, false); e.tourNid.run = null; }
  });
  if (C.mode !== "ami" && C.mode !== "ligne") signaler("combat_fini", { mode: C.mode, victoire: false });
  if (!silencieux) { fermerModale(); ctxJeu.cacherInterface(false); ouvrir(ctxJeu); toast("Combat abandonné.", "mal"); }
}

// Bloc « soigner tous mes dragons » (fin de combat)
function blocSoins() {
  const e = E();
  const blesses = e.dragons.filter((d) => d.pv < pvMax(d));
  if (!blesses.length) return el("p", { class: "doux", style: { margin: 0, fontSize: "12px" } }, "Tous tes dragons sont en pleine forme.");
  const besoin = rationsPourSoigner(blesses);
  const b = el("div", { style: { display: "grid", gap: "6px", padding: "10px", borderRadius: "10px", border: "1px solid var(--trait)" } },
    el("span", { style: { fontSize: "13px" } }, `Les PV perdus restent perdus. ${blesses.length} dragon${blesses.length > 1 ? "s" : ""} à soigner : ${besoin} ration${besoin > 1 ? "s" : ""} (tu en as ${e.ressources.rations}).`));
  b.append(el("button", { class: "btn" + (e.ressources.rations >= besoin ? " principal" : ""), disabled: e.ressources.rations < 1, onclick: () => {
    let n = 0; changer(() => { n = soignerEquipe(blesses); });
    Son.ok(); toast(`${n} ration${n > 1 ? "s" : ""} utilisée${n > 1 ? "s" : ""} : tes dragons sont soignés.`, "bon");
    b.replaceWith(blocSoins());
  } }, icone("rations"), e.ressources.rations >= besoin ? "Soigner tous mes dragons" : "Soigner avec mes rations"));
  return b;
}

function finCombat(raison) {
  if (C.fini) return;
  C.fini = true;
  clearInterval(chronoInt);
  const enLigne = C.mode === "ligne";
  // En ligne : l'ami a abandonné ou est parti, c'est gagné
  const forfait = enLigne && (raison === "abandon" || raison === "parti");
  if (enLigne && L) { L.pret = 0; publierLigne(); }
  const [t0, t1] = C.totaux.map(Math.round);
  const resultat = forfait ? "victoire" : t0 > t1 ? "victoire" : t0 < t1 ? "defaite" : "nul";
  const victoire = resultat === "victoire";
  const niveauAdv = Math.round(C.equipes[1].reduce((s, m) => s + m.niveau, 0) / C.equipes[1].length);
  const gains = [];
  const progres = [];
  changer((e) => {
    if (!enLigne) for (const m of C.equipes[0]) if (m.d) m.d.pv = Math.max(0, Math.round(m.pv));
    if (C.mode === "tour") {
      const run = e.tourNid.run;
      if (!run) return;
      if (victoire) {
        for (const x of run.dragons) x.niveau = Math.min(20, x.niveau + 1);
        e.tourNid.record = Math.max(e.tourNid.record, run.etage);
        if (run.etage >= ETAGES) { gains.push(...recompensesTour(e, ETAGES, true)); e.tourNid.sommets++; e.tourNid.run = null; C.finTour = "sommet"; }
        else { gains.push(`Étage ${run.etage} conquis`, "+1 niveau pour toute l'équipe", "un nouvel œuf à choisir"); run.etage++; run.attente = "oeuf"; C.finTour = "suite"; }
      } else { gains.push(...recompensesTour(e, run.etage - 1, false)); e.tourNid.run = null; C.finTour = "chute"; }
      noter(`Tour du nid, étage ${C.etage} : ${resultat}.`);
      return;
    }
    if (C.mode !== "ami" && !enLigne) {
      const apprentissage = etapeTuto() !== "fini";
      if (C.mode === "bot") { if (victoire) e.combats.gagnes++; else if (resultat === "nul") e.combats.nuls++; else e.combats.perdus++; }
      for (const m of C.equipes[0]) {
        if (!m.d || (!m.utilise && !apprentissage)) continue;
        // Pendant l'apprentissage, toute l'équipe gagne 40 XP par combat sauvage
        const xp = apprentissage && C.mode === "sauvage" ? 40 : Math.round(xpCombat(victoire, niveauAdv) * (C.mode === "sauvage" ? 0.7 : 1));
        const r = gagnerXp(m.d, xp);
        progres.push({ nom: m.nom, xp, ...r, niveau: m.d.niveau });
      }
      const r = e.ressources;
      if (C.mode === "sauvage") {
        const mats = ["obsidienne", "givrite", "corail"]; const mt = mats[Math.floor(Math.random() * 3)];
        if (victoire) { r.rations += 6; r[mt] += 4; gains.push("+6 rations", `+4 ${mt}`); } else { r.rations += 4; gains.push("+4 rations"); }
      } else if (victoire) {
        r.coeurs += 1; r.rations += 10;
        const mats = ["obsidienne", "givrite", "corail"]; const mt = mats[Math.floor(Math.random() * 3)]; const q = 3 + Math.floor(Math.random() * 3);
        r[mt] += q;
        gains.push("+1 cœur de dragon", "+10 rations", `+${q} ${mt}`);
      } else { r.rations += 4; gains.push("+4 rations"); }
      noter(`Combat contre ${C.noms[1]} : ${resultat} (${t0} à ${t1}).`);
    }
  });
  if (victoire) { Son.victoire(); for (const c of [0]) D.cotes[c] && D.cotes[c].anim.jouer("joie"); } else if (resultat === "defaite") Son.defaite();
  if (D.cotes[1] && !victoire && D.cotes[1].membre.pv > 0) D.cotes[1].anim.jouer("rugir");
  ui.innerHTML = "";
  ui.append(rendreHaut());
  const titre = C.mode === "tour" ? (C.finTour === "sommet" ? "Sommet de la tour atteint !" : C.finTour === "suite" ? `Étage ${C.etage} conquis !` : `Chute à l'étage ${C.etage}`)
    : C.mode === "ami" ? (victoire ? "Le joueur 1 gagne" : resultat === "nul" ? "Égalité" : "Le joueur 2 gagne") : (victoire ? "Victoire" : resultat === "nul" ? "Égalité" : "Défaite");
  const contenu = el("div", { style: { display: "grid", gap: "10px" } },
    forfait ? el("p", { style: { margin: 0 } }, `${C.noms[1]} ${raison === "abandon" ? "a abandonné" : "a quitté la partie"}.`) : null,
    el("p", { style: { margin: 0 } }, `Dégâts infligés : ${t0} contre ${t1}.`),
    enLigne ? el("p", { class: "doux", style: { margin: 0, fontSize: "12px" } }, "Défi amical : pas d'expérience ni de butin, et tes dragons gardent tous leurs PV.") : null,
    progres.length ? el("div", {}, el("div", { class: "etiquette" }, "Expérience"), ...progres.map((p) => el("div", { style: { fontSize: "13px" } }, `${p.nom} : +${p.xp} XP` + (p.niveaux ? ` · niveau ${p.niveau} !` : "") + (p.evolution ? " · évolution !" : "")))) : null,
    gains.length ? el("div", {}, el("div", { class: "etiquette" }, "Butin"), el("div", { style: { fontSize: "13px" } }, gains.join(" · "))) : null,
    el("details", {}, el("summary", { class: "doux", style: { cursor: "pointer" } }, "Détail des tours"), el("div", { style: { fontSize: "12px", display: "grid", gap: "3px", marginTop: "6px" } }, C.historique.map((h) => el("div", { class: "num" }, `T${h.tour} · ${h.a} −${h.d1} / ${h.b} −${h.d2}`)))),
    C.mode === "tour" ? null : blocSoins(),
  );
  if (progres.some((p) => p.niveaux)) Son.niveau();
  if (C.mode !== "ami" && !enLigne) signaler("combat_fini", { mode: C.mode, victoire });
  setTimeout(() => modale({
    titre: enLigne ? `${titre} contre ${C.noms[1]}` : titre, contenu, fermable: false,
    boutons: enLigne ? [
      { texte: "Quitter", action: () => { quitterLigne(); ctxJeu.cacherInterface(false); ctxJeu.aller("iles"); } },
      { texte: L && L.autre ? "Revanche" : "Nouveau combat", classe: "principal", action: () => { ctxJeu.cacherInterface(false); ouvrir(ctxJeu); } },
    ] : C.mode === "tour" ? [
      { texte: "Retour aux îles", action: () => { ctxJeu.cacherInterface(false); ctxJeu.aller("iles"); } },
      { texte: C.finTour === "suite" ? "Continuer l'ascension" : "Retour à la tour", classe: "principal", action: () => { ctxJeu.cacherInterface(false); ouvrir(ctxJeu); } },
    ] : [
      { texte: "Retour aux îles", action: () => { ctxJeu.cacherInterface(false); ctxJeu.aller("iles"); } },
      // Relance tout de suite un combat du même type, avec la même équipe
      { texte: "Nouveau combat", classe: "principal", action: () => { ctxJeu.cacherInterface(false); ouvrir(ctxJeu); if (dragonsPrets().length) lancer(); else toast("Tes dragons sont K.O. : soigne-les d'abord.", "mal"); } },
    ],
  }), 1200);
}
