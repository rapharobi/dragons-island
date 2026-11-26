// Les trois îles : on y voit ses dragons vivre (marcher, nager, voler, dormir…), on récolte, on nourrit,
// on place les nids et on réveille les sources magiques (volcan, glacier, tourbillon).
import { construireDragon } from "./modele.js";
import { Animateur } from "./anim.js";
import { ciel, eclairage, Orbite, versEcran } from "./scene.js";
import {
  POS_ILES, NIVEAU_EAU, rayonBord, solIle, dansLEau, emplacements, construireIle, construireCentre, construireCouvoir,
  pont, construireNid, construireNoeud, construireOeuf, construireSource,
} from "./monde.js";
import { mat, mesh, rng } from "./outils3d.js";
import {
  E, changer, nourrir, nourrirElement, payer, assez, energie, recolter, noeudDispo, maintenant, noter, recolterSource, manqueSource,
  attendPercee, depenserEnergie,
} from "./etat.js";
import {
  PAR_ID, ELEMENTS, NIDS, SOURCES, PRODUCTION_SOURCE, CONDITIONS_SOURCE, NOMS_HABITAT, COULEUR_HABITAT, habitatDe, MATERIAUX,
  recetteNid, stadeEffectif, stadeDuNiveau, evolutionBloquee, pvMax, xpSuivant, nomStade, fmtDuree, armuresDe, NIVEAU_PERCEE,
} from "./regles.js";
import { el, styles, toast, barre, recette, icone } from "./ui.js";
import { Son, Musique } from "./son.js";
import { GENOMES } from "./genomes.js";
import { signaler, afficher as afficherTuto } from "./tuto.js";

const T = window.THREE;
let D = null;
let ctxJeu = null;
export const LIEN_LIVRE = window.DRAGONS_SITE ? "livre/" : "https://claude.ai/artifact/LvMeuxAvSM8wsMbph4SgZM";

styles("iles", `
.iles-choix { position: fixed; top: calc(var(--hud) + var(--tuto, 0px) + 6px); left: var(--bord-g); display: flex; gap: 6px; flex-wrap: wrap; z-index: 15; }
.iles-choix .btn.actif { border-color: var(--ambre); color: var(--ambre); }
.iles-aide { position: fixed; left: 50%; transform: translateX(-50%); bottom: calc(var(--bas) + 86px); z-index: 12; font-size: 12px; color: var(--doux); background: var(--panneau); border: 1px solid var(--trait); padding: 6px 12px; border-radius: 999px; white-space: nowrap; }
.fiche-ile { position: fixed; z-index: 16; right: var(--bord-d); bottom: calc(var(--bas) + 84px); width: min(380px, calc(100vw - 32px)); padding: 14px 16px 16px; max-height: calc(100vh - 220px); overflow: auto; }
.fiche-ile header { display: flex; align-items: flex-start; gap: 10px; justify-content: space-between; }
.fiche-ile h3 { font-size: 22px; line-height: 1; }
.fiche-ile .sous { display: flex; gap: 6px; align-items: center; flex-wrap: wrap; margin-top: 6px; }
.fiche-ile .ligne { display: grid; grid-template-columns: 46px 1fr auto; gap: 8px; align-items: center; margin-top: 8px; font-size: 12px; }
.fiche-ile .bloc { margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--trait); display: grid; gap: 8px; }
.fiche-ile .actions { display: flex; flex-wrap: wrap; gap: 6px; }
.fiche-ile .alerte { padding: 8px 10px; border-radius: 8px; background: rgba(242,181,68,.12); border: 1px solid rgba(242,181,68,.35); color: #ffd98a; font-size: 12px; }
.fiche-ile .info { font-size: 12px; color: var(--doux); }
.fermer-fiche { background: none; border: 0; padding: 4px; color: var(--doux); }
.fermer-fiche svg { width: 18px; height: 18px; }
#ecran > .etiquettes-3d { position: fixed; inset: 0; pointer-events: none; z-index: 11; }
.etiq { position: absolute; transform: translate(-50%, -100%); padding: 3px 7px; border-radius: 7px; background: rgba(13,14,19,.72); border: 1px solid var(--trait); font-size: 11px; white-space: nowrap; display: grid; gap: 3px; }
.etiq b { font-family: var(--titre); font-size: 12px; }
.etiq .barre { height: 4px; width: 64px; }
.etiq.alerte { border-color: var(--ambre); }
.etiq .humeur { font-size: 10px; color: var(--doux); }
.etiq .recolte { font-size: 11px; color: var(--ambre); font-weight: 600; }
.bandeau-placement { position: fixed; z-index: 18; top: calc(var(--hud) + var(--tuto, 0px) + 54px); left: 50%; transform: translateX(-50%); padding: 10px 14px; display: flex; gap: 10px; align-items: center; flex-wrap: wrap; justify-content: center; width: min(560px, calc(100vw - 32px)); text-align: center; }
.fleche-fiche { position: fixed; z-index: 17; width: 34px; height: 52px; border-radius: 12px; border: 1px solid var(--trait-fort); background: rgba(13,14,19,.86); color: var(--ambre); font-size: 30px; line-height: 1; display: grid; place-items: center; padding: 0 0 4px; box-shadow: 0 4px 14px rgba(0,0,0,.4); }
.fleche-fiche.g { left: 5px; } .fleche-fiche.d { right: 5px; }
@media (max-width: 560px) { .fiche-ile.avec-fleches { left: 44px !important; right: 44px !important; } }
@media (min-width: 561px) { .fleche-fiche.g { left: auto; right: calc(var(--bord-d) + min(380px, calc(100vw - 32px)) + 6px); } .fleche-fiche.d { right: calc(var(--bord-d) - 40px); } }
.fiche-rang { display: flex; gap: 8px; align-items: center; justify-content: space-between; margin-top: 8px; font-size: 12px; }
.pil.ul { border-color: #d8b0ff; color: #e8ccff; background: rgba(170,110,255,.16); }
.liste-dragons { position: fixed; z-index: 19; top: calc(var(--hud) + var(--tuto, 0px) + 8px); bottom: calc(var(--bas) + 80px); left: 50%; transform: translateX(-50%); width: min(460px, calc(100vw - 24px)); padding: 14px; display: flex; flex-direction: column; gap: 10px; }
.liste-dragons header { display: flex; justify-content: space-between; align-items: flex-start; }
.liste-dragons h3 { font-size: 22px; }
.liste-dragons input { width: 100%; padding: 10px 12px; border-radius: 10px; border: 1px solid var(--trait-fort); background: rgba(255,255,255,.05); color: inherit; font: inherit; }
.ld-outils { display: flex; gap: 8px; align-items: center; justify-content: space-between; flex-wrap: wrap; }
.ld-filtres { display: flex; gap: 5px; flex-wrap: wrap; }
.ld-filtres .btn.actif { border-color: var(--ambre); color: var(--ambre); }
.ld-outils select { padding: 7px 8px; border-radius: 9px; border: 1px solid var(--trait-fort); background: #1a1b24; color: inherit; font: inherit; font-size: 12px; }
.ld-corps { overflow: auto; display: grid; gap: 6px; align-content: start; flex: 1; min-height: 0; }
.ld-ligne { display: grid; grid-template-columns: 10px 1fr auto; gap: 10px; align-items: center; text-align: left; padding: 9px 10px; border-radius: 10px; border: 1px solid var(--trait); background: rgba(255,255,255,.03); color: inherit; }
.ld-ligne:active { background: rgba(255,255,255,.08); }
.ld-pastille { width: 10px; height: 34px; border-radius: 4px; background: var(--doux); }
.ld-ligne.feu .ld-pastille { background: var(--feu); } .ld-ligne.glace .ld-pastille { background: var(--glace); } .ld-ligne.eau .ld-pastille { background: var(--eau); }
.ld-nom { display: grid; gap: 2px; min-width: 0; } .ld-nom b { font-family: var(--titre); font-size: 15px; } .ld-nom small { color: var(--doux); font-size: 11px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.ld-ul { color: #e8ccff; font-size: 11px; }
.ld-droite { display: grid; gap: 4px; justify-items: end; font-size: 12px; } .ld-droite .barre { width: 70px; height: 5px; }
.ld-alerte { color: var(--ambre); font-size: 10px; }
.iles-choix .mes-dragons { border-color: var(--ambre); color: var(--ambre); }
@media (max-width: 560px) { .fiche-ile { left: var(--bord-g); right: var(--bord-d); width: auto; bottom: calc(var(--bas) + 76px); max-height: min(40vh, calc(100vh - var(--hud) - var(--tuto, 0px) - var(--bas) - 240px)); padding: 12px 14px 14px; } .fiche-ile h3 { font-size: 19px; } body.avec-fiche .iles-choix { display: none; } .iles-aide { display: none; } .etiq .humeur { display: none; } }
`);

// Ressources à récolter : [type, angle]
const NOEUDS = {
  feu: [["buisson", 0.3], ["buisson", 2.4], ["rocher", 1.3], ["rocher", 3.6], ["gisement", 4.6], ["gisement", 5.6], ["buisson", 5.1], ["rocher", 0.8], ["buisson", 3.1]],
  glace: [["buisson", 0.8], ["buisson", 3.0], ["rocher", 1.9], ["rocher", 4.2], ["gisement", 5.2], ["gisement", 0.1], ["rocher", 5.8], ["buisson", 2.4], ["buisson", 4.8]],
  eau: [["buisson", 0.5], ["buisson", 2.7], ["rocher", 1.6], ["rocher", 4.4], ["gisement", 3.5], ["gisement", 5.4], ["buisson", 6.0], ["rocher", 2.2], ["buisson", 3.9]],
};
// Objets cassables du lagon de l'île d'Eau : [type, angle, distance du centre]. Seuls les dragons nageurs y vont.
const LAGON = [["epave", 1.4, 4.6], ["epave", 2.45, 3.6], ["epave", 4.2, 4.4], ["epave", 5.25, 4.6], ["epave", 0.35, 2.6], ["recif", 1.25, 6.0], ["recif", 3.15, 6.2], ["recif", 4.95, 6.0], ["recif", 6.0, 2.6]];
const AQUA = (type) => type === "epave" || type === "recif";
// Décor cassable en plus sur chaque île (placé au hasard, toujours au même endroit)
const DECORS = { feu: [["arbre_mort", 4], ["basalte", 4]], glace: [["sapin", 4], ["bloc_glace", 4]], eau: [["palmier", 4]] };
// Récolte plus généreuse : les buissons donnent aussi des rations
const GAINS = {
  buisson: { brindilles: 7, rations: 2 }, rocher: { pierres: 5 }, gisement: null, epave: { brindilles: 6, rations: 3 }, recif: { corail: 3, pierres: 4 },
  arbre_mort: { brindilles: 8 }, basalte: { pierres: 4, obsidienne: 2 }, sapin: { brindilles: 6, rations: 1 }, bloc_glace: { pierres: 3, givrite: 2 }, palmier: { brindilles: 5, rations: 3 },
};
const CENTRE = { feu: [-0.8, -1.2, 3.6], glace: [0.4, 0.6, 2.8], eau: [0, 0, 1.4] };
const POS_SOURCE = { feu: [-0.8, -1.2], glace: [0.4, 0.6], eau: [0, 0] };

function construireDecor() {
  const scene = new T.Scene();
  scene.fog = new T.Fog(0x241e36, 70, 230);
  const sky = ciel(0x080c20, 0x3e3050, 0x140e1a, 340);
  scene.add(sky);
  const lum = eclairage(scene, { ciel: 0xa8b8e8, sol: 0x3a2838, hemi: 0.6, soleil: 0xffd8b8, force: 1.05, zoneOmbre: 18, carte: 2048, x: 14, y: 22, z: 10 });
  const ng = new T.PlaneGeometry(560, 560, 50, 50);
  const np = ng.attributes.position;
  for (let i = 0; i < np.count; i++) np.setZ(i, Math.sin(np.getX(i) * 0.08) * Math.cos(np.getY(i) * 0.07) * 3 + Math.random() * 0.8);
  ng.computeVertexNormals();
  const nuages = new T.Mesh(ng, new T.MeshStandardMaterial({ color: 0x3a3050, flatShading: true, roughness: 1, transparent: true, opacity: 0.92 }));
  nuages.rotation.x = -Math.PI / 2; nuages.position.y = -24; scene.add(nuages);
  const sg = new T.BufferGeometry(); const sp = [];
  for (let i = 0; i < 700; i++) { const a = Math.random() * Math.PI * 2, b = Math.random() * 0.45 + 0.1, R = 320; sp.push(Math.cos(a) * Math.cos(b) * R, Math.sin(b) * R, Math.sin(a) * Math.cos(b) * R); }
  sg.setAttribute("position", new T.Float32BufferAttribute(sp, 3));
  scene.add(new T.Points(sg, new T.PointsMaterial({ color: 0xffffff, size: 1.1, fog: false })));

  const camera = new T.PerspectiveCamera(42, 1, 0.1, 760);
  const orbite = new Orbite(camera, document.getElementById("scene3d"));
  orbite.min = 2; orbite.max = 140; orbite.phiMax = 1.45;
  orbite.deplacement = true;
  orbite.limite = { centre: new T.Vector3(0, 0, 0), rayon: 55 };
  orbite.viser(new T.Vector3(0, 0, 0), 90, 0.3, 0.95);
  orbite.surDeplacement = () => { if (D && D.suivi) { D.suivi = null; majBoutons(); } };

  const iles = {};
  for (const elx of ["feu", "glace", "eau"]) {
    const g = construireIle(elx);
    g.position.copy(POS_ILES[elx]);
    scene.add(g);
    iles[elx] = { groupe: g, noeuds: [], source: null, niveauSource: -1, sol: g.userData.sol };
    iles[elx].obstacles = obstaclesIle(g, elx);
  }
  const centre = construireCentre();
  scene.add(centre.groupe);
  for (const elx of ["feu", "glace", "eau"]) {
    const dir = POS_ILES[elx].clone().setY(0).normalize();
    const a = dir.clone().multiplyScalar(3.2).setY(-0.05);
    const angLocal = Math.atan2(-dir.z, -dir.x);
    const rb = rayonBord(elx, angLocal) - 0.4;
    const b = POS_ILES[elx].clone().sub(dir.clone().multiplyScalar(rb)); b.y += iles[elx].sol(Math.cos(angLocal) * rb, Math.sin(angLocal) * rb) - 0.05;
    scene.add(pont(a, b));
  }
  for (const elx of ["feu", "glace", "eau"]) {
    NOEUDS[elx].forEach(([type, ang], i) => {
      const n = construireNoeud(type, elx, i * 31 + elx.length);
      const rb = rayonBord(elx, ang) * 0.78;
      const x = Math.cos(ang) * rb, z = Math.sin(ang) * rb;
      n.position.set(x, iles[elx].sol(x, z), z);
      n.scale.setScalar(1.3);
      n.userData.base = 1.3; n.userData.cassable = true; n.userData.y = n.position.y;
      const cle = `${elx}-${i}`;
      n.userData.action = { type: "noeud", cle, noeud: type, element: elx };
      iles[elx].groupe.add(n);
      iles[elx].noeuds.push({ objet: n, cle });
    });
  }
  // Arbres, roches et blocs de glace cassables, posés là où il y a de la place
  for (const elx of ["feu", "glace", "eau"]) {
    const r = rng(elx.length * 97 + 5);
    const nids = emplacements(elx);
    const [cx, cz, cr] = CENTRE[elx];
    const pris = iles[elx].noeuds.map((n) => n.objet.position);
    let i = 0;
    for (const [type, nb] of DECORS[elx]) for (let k = 0; k < nb; k++, i++) {
      for (let essai = 0; essai < 250; essai++) {
        const a = r() * Math.PI * 2, d = rayonBord(elx, a) * (elx === "eau" ? 0.7 + r() * 0.22 : 0.3 + r() * 0.52);
        const x = Math.cos(a) * d, z = Math.sin(a) * d, y = iles[elx].sol(x, z);
        if ((elx === "eau" && y < 0.12) || (elx === "glace" && y > 1.9)) continue;
        if (Math.hypot(x - cx, z - cz) < cr + 1.3) continue;
        if (nids.some((e) => Math.hypot(e.x - x, e.z - z) < 2.1) || pris.some((p) => Math.hypot(p.x - x, p.z - z) < 1.7)) continue;
        const n = construireNoeud(type, elx, 300 + i * 13 + elx.length);
        n.position.set(x, y, z); n.rotation.y = r() * 6;
        const base = type === "basalte" || type === "bloc_glace" ? 1.3 : 1.05;
        n.scale.setScalar(base);
        n.userData.base = base; n.userData.cassable = true; n.userData.y = y;
        const cle = `${elx}-d${i}`;
        n.userData.action = { type: "noeud", cle, noeud: type, element: elx };
        iles[elx].groupe.add(n);
        iles[elx].noeuds.push({ objet: n, cle });
        pris.push(n.position);
        break;
      }
    }
  }
  // Le lagon : épaves qui flottent et récifs au fond, à casser
  {
    const nids = emplacements("eau");
    LAGON.forEach(([type, ang, d], i) => {
      const x = Math.cos(ang) * d, z = Math.sin(ang) * d;
      if (!dansLEau("eau", x, z, type === "recif") || nids.some((e) => Math.hypot(e.x - x, e.z - z) < 1.2)) return;
      const n = construireNoeud(type, "eau", 500 + i * 17);
      const y = type === "epave" ? NIVEAU_EAU : iles.eau.sol(x, z);
      n.position.set(x, y, z); n.rotation.y = ang * 2.3;
      n.scale.setScalar(1.3);
      n.userData.base = 1.3; n.userData.cassable = true; n.userData.y = y; n.userData.phase = i * 1.7;
      const cle = `eau-l${i}`;
      n.userData.action = { type: "noeud", cle, noeud: type, element: "eau" };
      iles.eau.groupe.add(n);
      iles.eau.noeuds.push({ objet: n, cle });
    });
  }
  D = {
    scene, camera, orbite, iles, centre, sky, nuages, lum,
    dragons: new Map(),
    couvoir: null, couvoirCle: null,
    focus: null, t: 0, fond: false, suivi: null, placement: null, marqueurs: [], repas: [], rituel: null, eclats: [], meteores: [], secousse: 0, eclipse: 0,
    lumBase: { hemi: lum.hemi.intensity, soleil: lum.soleil.intensity, contre: lum.contre.intensity },
    update(dt) {
      D.t += dt;
      if (D.suivi && orbite.distV > (D.suiviDist || 1e9) * 1.6) { D.suivi = null; majBoutons(); }
      if (D.suivi) { const v = new T.Vector3(); D.suivi.mobile.getWorldPosition(v); v.y += D.suivi.hauteur * 0.45; orbite.cibleVoulue.copy(v); }
      orbite.update(dt);
      majEvenements(dt);
      for (const ile of Object.values(iles)) {
        for (const f of ile.groupe.userData.animes || []) f(D.t);
        if (ile.source) for (const f of ile.source.userData.animes || []) f(D.t);
        if (ile.croissance !== undefined && ile.source) {
          ile.croissance = Math.min(1, ile.croissance + dt / 2.5);
          const k = ile.croissance;
          ile.source.scale.setScalar(0.05 + 0.95 * (1 - Math.pow(1 - k, 3)));
          ile.source.position.y = ile.baseSource - (1 - k) * 2;
          if (k >= 1) ile.croissance = undefined;
        }
      }
      nuages.position.x = Math.sin(D.t * 0.03) * 8;
      for (const [, v] of D.dragons) { vivre(v, dt); v.anim.update(dt); }
      majRepas(dt);
      for (const m of D.marqueurs) { m.rotation.y += dt; m.children[0].material.opacity = 0.5 + Math.sin(D.t * 4) * 0.25; }
      if (E()) for (const ile of Object.values(iles)) for (const n of ile.noeuds) {
        const u = n.objet.userData;
        const k = (noeudDispo(n.cle) ? 1 : 0.001) * u.base;
        n.objet.scale.setScalar(n.objet.scale.x + (k - n.objet.scale.x) * Math.min(1, dt * (u.cassable && k > n.objet.scale.x ? 1.5 : 4)));
        if (u.cassable) {
          n.objet.visible = n.objet.scale.x > 0.03;
          if (n.objet.userData.flotte) { n.objet.position.y = u.y + Math.sin(D.t * 1.4 + u.phase) * 0.05; n.objet.rotation.z = Math.sin(D.t * 1.1 + u.phase) * 0.06; n.objet.rotation.x = Math.cos(D.t * 0.9 + u.phase) * 0.05; }
        }
      }
      majEclats(dt);
      if (D.couvoir) for (const o of D.couvoir.userData.oeufs || []) { o.rotation.y += dt * 0.6; o.position.y = Math.sin(D.t * 2) * 0.03; }
      if (D.rituel) majRituel(dt);
      if (D.fond) orbite.thetaV += dt * 0.035;
      majEtiquettes();
    },
  };
  installerClics();
  return D;
}

export function decor(ctx) {
  ctxJeu = ctx;
  if (!D) construireDecor();
  return {
    afficherFond() { synchroniser(); D.fond = true; D.orbite.viser(new T.Vector3(0, 0, 0), 84, 0.3, 1.08); ctx.moteur.montrer(D); },
    // Arrivée par le portail : la caméra part de très haut dans le ciel et plonge vers les îles
    plongee() { D.orbite.dist = 210; D.orbite.phi = 0.28; D.orbite.theta = D.orbite.thetaV + 1.4; D.orbite.cible.set(0, 30, 0); D.orbite.douceur = 0.9; },
  };
}

// ---------- Obstacles : cheminées, colonnes, pics, arbres, la source ----------
// Chaque gros objet du décor devient un cylindre (x, z, rayon, haut) que les dragons contournent ou survolent.
function obstaclesIle(g, elx) {
  g.updateMatrixWorld(true);
  const l = [], b = new T.Box3(), base = g.position;
  for (const o of (g.userData.deco || { children: [] }).children) {
    if (o.isInstancedMesh || (o.material && o.material.transparent)) continue;
    b.setFromObject(o);
    if (b.isEmpty()) continue;
    const x = (b.min.x + b.max.x) / 2 - base.x, z = (b.min.z + b.max.z) / 2 - base.z;
    const haut = b.max.y - base.y;
    if (haut - solIle(elx, x, z) < 0.55) continue;
    l.push({ x, z, r: Math.max(0.35, Math.max(b.max.x - b.min.x, b.max.z - b.min.z) * 0.45), haut });
  }
  return l;
}
function obstacles(v) { const ile = D.iles[v.element]; return ile.obstSource ? ile.obstacles.concat([ile.obstSource]) : ile.obstacles; }
// Rayon à garder autour d'un obstacle (plus petit si le nid du dragon est collé à l'obstacle)
function rayonAutour(v, o) {
  const rr = o.r + 0.2 + v.taille * 0.18;
  const dm = Math.hypot(v.maison.x - o.x, v.maison.z - o.z);
  return dm < rr ? dm - 0.15 : rr;
}
function dansObstacle(v, x, z) {
  for (const o of obstacles(v)) { if (o.source) continue; const rr = rayonAutour(v, o); if (rr > 0 && Math.hypot(x - o.x, z - o.z) < rr) return true; }
  return false;
}
// Repousse le dragon hors des obstacles en le faisant glisser autour
function repousser(v, dt) {
  const p = v.mobile.position;
  let pousse = false;
  for (const o of obstacles(v)) {
    const rr = o.source ? o.r : rayonAutour(v, o);
    if (rr <= 0) continue;
    const dx = p.x - o.x, dz = p.z - o.z, d = Math.hypot(dx, dz);
    if (d >= rr || d < 1e-4) continue;
    p.x = o.x + (dx / d) * rr; p.z = o.z + (dz / d) * rr;
    // Petit pas de côté pour ne pas rester coincé face à l'obstacle
    p.x += (-dz / d) * dt * 0.8; p.z += (dx / d) * dt * 0.8;
    pousse = true;
  }
  v.bloque = pousse ? (v.bloque || 0) + dt : 0;
  if (v.bloque > 2.5 && (v.etat === "marche" || v.etat === "rejoindre")) { v.etat = "pause"; v.minuteur = 0.5; v.bloque = 0; v.anim.jouer("repos"); }
}
// Hauteur minimale de vol au-dessus du relief et des obstacles autour de (x, z)
function plafondVol(v, x, z) {
  let h = solIle(v.element, x, z);
  for (const o of obstacles(v)) if (Math.hypot(x - o.x, z - o.z) < o.r + 1.4 + v.taille * 0.3) h = Math.max(h, o.haut + 0.5);
  return h;
}
// Cercle de vol qui reste au-dessus de l'île (pas au-dessus du vide ni des ponts)
function cercleDeVol(v, centre, rayon) {
  const c = centre.clone();
  for (let k = 0; k < 8; k++) {
    let ok = true;
    for (let a = 0; a < 6.28 && ok; a += 0.4) {
      const x = c.x + Math.cos(a) * rayon, z = c.z + Math.sin(a) * rayon;
      if (Math.hypot(x, z) > rayonBord(v.element, Math.atan2(z, x)) - 1.6) ok = false;
    }
    if (ok) break;
    rayon = Math.max(1.4, rayon * 0.8); c.multiplyScalar(0.85);
  }
  return { centre: c, rayon };
}

// ---------- Terrain : où chaque dragon peut aller ----------
const nage = (v) => v.habitat === "surface" || v.habitat === "fond";
function terrainOk(v, x, z) {
  const r = Math.hypot(x, z);
  if (r > rayonBord(v.element, Math.atan2(z, x)) - 2.4) return false;
  const [cx, cz, cr] = CENTRE[v.element];
  const h = solIle(v.element, x, z);
  if (nage(v)) return dansLEau(v.element, x, z, v.habitat === "fond") && Math.hypot(x - cx, z - cz) > cr && !dansObstacle(v, x, z);
  if (dansObstacle(v, x, z)) return false;
  if (v.element === "eau" && h < 0.08) return false;
  if (v.element === "glace" && h > 2.2) return false;
  return Math.hypot(x - cx, z - cz) > cr;
}
function cheminLibre(v, x0, z0, x1, z1) {
  for (let k = 1; k <= 8; k++) { const t = k / 8; if (!terrainOk(v, x0 + (x1 - x0) * t, z0 + (z1 - z0) * t)) return false; }
  return true;
}
function pointAuHasard(v, autour, rayon) {
  const p = v.mobile.position;
  for (let k = 0; k < 14; k++) {
    const a = Math.random() * Math.PI * 2, d = 0.8 + Math.random() * rayon;
    const x = autour.x + Math.cos(a) * d, z = autour.z + Math.sin(a) * d;
    if (terrainOk(v, x, z) && cheminLibre(v, p.x, p.z, x, z)) return new T.Vector3(x, 0, z);
  }
  return null;
}
function allerVers(v, cible, etat, vitesse = 1) { v.cible = cible; v.etat = etat; v.vitesse = vitesse; }

// ---------- La vie des dragons ----------
const ACTIONS_SEUL = ["renifler", "regarder", "secouer", "etirer", "bailler", "joie", "jouer", "rugir"];
const ACTIONS_EAU = ["regarder", "joie", "secouer", "rugir"];
const HUMEURS = { marche: "se promène", pause: "observe", dort: "fait la sieste", vol: "vole", rejoindre: "va voir un ami", attendre: "attend un ami", jeu: "joue", action: "s'amuse", nid: "rentre au nid", ko: "K.O.", versRecolte: "part récolter", recolte: "récolte", rituel: "rejoint la source", rituelPret: "attend", repas: "mange", nage: "nage", plonge: "nage au fond" };

function choisirEnvie(v) {
  const p = v.mobile.position;
  if (nage(v)) {
    const r = Math.random();
    if (r < 0.6) { const c = pointAuHasard(v, v.maison, 4); if (c) { v.profondeurVoulue = v.habitat === "fond" ? (Math.random() < 0.3 ? 0.15 : 1) : 0; return allerVers(v, c, "nage", 0.8 + Math.random() * 0.5); } }
    if (r < 0.8) { v.etat = "action"; v.anim.jouer(ACTIONS_EAU[Math.floor(Math.random() * ACTIONS_EAU.length)]); v.minuteur = 2.4; return; }
    if (r < 0.9) return allerVers(v, v.maison.clone(), "nid", 0.8);
    v.etat = "pause"; v.minuteur = 2 + Math.random() * 3; return;
  }
  const voisins = [...D.dragons.values()].filter((o) => o !== v && o.element === v.element && !o.ko && !nage(o) && (o.etat === "pause" || o.etat === "marche"));
  const ailes = v.rig.ailes.length > 0 && v.stade >= 1;
  const perche = v.habitat === "perchoir";
  const tirage = [
    ["marche", perche ? 12 : 30], ["action", 24], ["dort", v.fatigue > 40 ? 16 : 4], ["vol", ailes ? (perche ? 38 : 8) : 0],
    ["ami", voisins.length && !perche ? 16 : 0], ["nid", perche ? 14 : 6],
  ];
  const total = tirage.reduce((s, x) => s + x[1], 0);
  let r = Math.random() * total, choix = "marche";
  for (const [n, w] of tirage) { r -= w; if (r <= 0) { choix = n; break; } }
  if (choix === "marche") { const c = pointAuHasard(v, v.habitat === "cheminee" || perche ? v.maison : p, perche ? 2 : v.habitat === "cheminee" ? 3 : 4.5); if (c) return allerVers(v, c, "marche", 0.7 + Math.random() * 0.6); choix = "action"; }
  if (choix === "action") { v.etat = "action"; const a = ACTIONS_SEUL[Math.floor(Math.random() * ACTIONS_SEUL.length)]; v.anim.jouer(a); v.minuteur = 2.6; if (a === "rugir" && v.proche) Son.crier(v.element, Math.min(1, v.stade / 4)); return; }
  if (choix === "dort" || choix === "nid") return allerVers(v, v.maison.clone(), "nid", 0.8);
  if (choix === "vol") return decoller(v);
  if (choix === "ami") {
    const ami = voisins[Math.floor(Math.random() * voisins.length)];
    const milieu = p.clone().lerp(ami.mobile.position, 0.5);
    const dir = ami.mobile.position.clone().sub(p).setY(0).normalize();
    const ecart = 0.6 + (v.taille + ami.taille) * 0.35;
    allerVers(v, milieu.clone().sub(dir.clone().multiplyScalar(ecart)), "rejoindre", 1.1);
    allerVers(ami, milieu.clone().add(dir.clone().multiplyScalar(ecart)), "rejoindre", 1.1);
    v.ami = ami; ami.ami = v;
  }
}

function decoller(v, duree) {
  const p = v.mobile.position;
  const c = cercleDeVol(v, (v.habitat === "perchoir" ? v.maison : p).clone().setY(0), 2.5 + Math.random() * 3);
  v.etat = "vol"; v.volT = 0; v.volCentre = c.centre; v.volR = c.rayon;
  v.volA = Math.atan2(p.z - c.centre.z, p.x - c.centre.x);
  v.volDuree = duree || 8 + Math.random() * 6; v.volY = p.y;
  v.anim.jouer("vol");
}

function tourner(v, angle, dt, vitesse = 5) {
  let d = angle - v.mobile.rotation.y;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  v.mobile.rotation.y += d * Math.min(1, dt * vitesse);
  return Math.abs(d);
}

// v.libre : le dragon est en mission hors de son milieu (un terrestre dans le lagon, un nageur sur la plage)
const enEau = (v) => (v.libre ? dansLEau(v.element, v.mobile.position.x, v.mobile.position.z) : nage(v));
function hauteurVoulue(v, x, z) {
  const sol = solIle(v.element, x, z);
  const surface = NIVEAU_EAU - v.hauteur * 0.35;
  // Pour casser un récif, le dragon plonge jusqu'en bas
  const plonge = v.recolte && v.recolte.type === "recif" && (v.etat === "recolte" || v.etat === "versRecolte");
  if (v.libre) {
    if (!dansLEau(v.element, x, z)) return sol;
    if (plonge) return Math.max(sol + 0.1, Math.min(surface, v.recolte.objet.position.y + 0.35));
    if (!nage(v)) return Math.max(sol, surface);
  }
  if (!nage(v)) return sol;
  if (plonge) return Math.min(surface, v.recolte.objet.position.y + 0.35);
  if (v.habitat === "surface") return Math.max(sol + 0.1, surface);
  // Au fond, mais pas collé au sable : on les voit nager à travers l'eau
  const fond = sol + 0.25;
  const milieu = fond + (surface - fond) * 0.4;
  return milieu + (surface - milieu) * (1 - (v.profondeurVoulue ?? 1)) * 0.8;
}

function vivre(v, dt) {
  const p = v.mobile.position;
  if (v.ko) { p.lerp(v.maison, Math.min(1, dt * 2)); p.y = hauteurVoulue(v, p.x, p.z); return; }
  v.minuteur -= dt;
  v.fatigue += dt * (v.etat === "dort" ? -6 : 0.4);
  let hauteurVol = 0;
  switch (v.etat) {
    case "marche": case "nid": case "rejoindre": case "versRecolte": case "nage": case "rituel": {
      const dx = v.cible.x - p.x, dz = v.cible.z - p.z, dist = Math.hypot(dx, dz);
      if (dist < 0.25) {
        v.anim.jouer(enEau(v) ? "nage" : "repos");
        if (v.etapes && v.etapes.length) { v.cible = v.etapes.shift(); break; }
        if (v.etat === "versRecolte") { v.etat = "recolte"; v.recolte.t = 0; v.prochainCoup = 0; break; }
        if (v.etat === "rituel") { v.etat = "rituelPret"; break; }
        if (v.etat === "nid") {
          v.libre = false;
          if (!nage(v) && (v.fatigue > 30 || Math.random() < 0.4)) { v.etat = "dort"; v.anim.jouer("dormir"); v.minuteur = 14 + Math.random() * 14; }
          else { v.etat = "pause"; v.minuteur = 1 + Math.random() * 2; }
        } else if (v.etat === "rejoindre") { v.etat = "attendre"; v.minuteur = 4; }
        else { v.etat = "pause"; v.minuteur = 0.8 + Math.random() * 2.5; }
        break;
      }
      const ecart = tourner(v, Math.atan2(dx, dz), dt, 4);
      const vit = 1.0 * v.vitesse * Math.max(0.6, v.echelle) * (ecart > 1 ? 0.3 : 1);
      p.x += (dx / dist) * vit * dt; p.z += (dz / dist) * vit * dt;
      v.anim.cadence = 5.5 * v.vitesse / Math.max(0.6, v.echelle);
      v.anim.jouer(enEau(v) ? "nage" : "marche");
      break;
    }
    case "attendre": {
      const ami = v.ami;
      if (!ami || (ami.etat === "pause" && ami.ami !== v)) { v.etat = "pause"; v.minuteur = 1; break; }
      tourner(v, Math.atan2(ami.mobile.position.x - p.x, ami.mobile.position.z - p.z), dt, 3);
      if (ami.etat === "attendre") {
        const jeu = ["jouer", "renifler", "joie", "jouer"][Math.floor(Math.random() * 4)];
        for (const o of [v, ami]) { o.etat = "jeu"; o.minuteur = 2.2 + Math.random(); o.anim.jouer(o === v ? jeu : (jeu === "renifler" ? "joie" : jeu)); o.ami = null; }
      } else if (v.minuteur <= 0) { v.etat = "pause"; v.minuteur = 1; v.ami = null; }
      break;
    }
    case "vol": {
      v.volT += dt;
      const duree = v.volDuree || 9;
      const env = Math.max(0, Math.min(1, v.volT / 1.5, (duree - v.volT) / 1.5));
      v.volA += dt * 0.5;
      // Le dragon rejoint son cercle en douceur (pas de saut au décollage)
      const tx = v.volCentre.x + Math.cos(v.volA) * v.volR * env, tz = v.volCentre.z + Math.sin(v.volA) * v.volR * env;
      const k = Math.min(1, dt * 2.5);
      const ax = p.x, az = p.z;
      p.x += (tx - p.x) * k; p.z += (tz - p.z) * k;
      if (Math.hypot(p.x - ax, p.z - az) > 1e-4) tourner(v, Math.atan2(p.x - ax, p.z - az), dt, 3);
      // Altitude : au-dessus du relief, des cheminées, des pics et de la source, en regardant un peu devant
      const devant = v.volA + 0.6;
      const fx = v.volCentre.x + Math.cos(devant) * v.volR * env, fz = v.volCentre.z + Math.sin(devant) * v.volR * env;
      const plancher = Math.max(plafondVol(v, p.x, p.z), plafondVol(v, fx, fz));
      const voulu = solIle(v.element, p.x, p.z) + env * (v.habitat === "perchoir" ? 4.5 : 2.8);
      v.volY = Math.max(voulu, env > 0.05 ? plancher + 0.4 : voulu);
      if (v.volT >= duree) {
        v.anim.jouer("repos");
        if (v.habitat === "perchoir") allerVers(v, v.maison.clone(), "nid", 0.8);
        else { v.etat = "pause"; v.minuteur = 1.5; v.anim.jouer("secouer"); }
      }
      break;
    }
    case "recolte": {
      const rc = v.recolte;
      const o = rc.objet.position;
      tourner(v, Math.atan2(o.x - p.x, o.z - p.z), dt, 5);
      rc.t += dt;
      v.prochainCoup -= dt;
      if (v.prochainCoup <= 0) {
        const aqua = AQUA(rc.type);
        v.prochainCoup = aqua ? 1.2 : 0.95;
        v.anim.jouer(aqua ? "attaque" : "creuser");
        rc.objet.scale.setScalar(rc.objet.userData.base * (0.9 + Math.random() * 0.12));
        eclater(rc.objet, rc.type, 4, rc.element);
        if (v.proche) Son.recolte(SON_RECOLTE[rc.type] || "cristal");
      }
      if (rc.t >= rc.duree) finirRecolte(v);
      break;
    }
    case "rituelPret": {
      const [sx, sz] = POS_SOURCE[v.element];
      tourner(v, Math.atan2(sx - p.x, sz - p.z), dt, 4);
      break;
    }
    case "atterrir": {
      // Il se pose d'abord (au sol, ou à son nid s'il survole un obstacle), puis il mange
      const dx = v.cible.x - p.x, dz = v.cible.z - p.z, dist = Math.hypot(dx, dz);
      if (dist > 0.15) { tourner(v, Math.atan2(dx, dz), dt, 4); const vit = Math.min(dist, 2.2 * dt); p.x += (dx / dist) * vit; p.z += (dz / dist) * vit; }
      const sol = hauteurVoulue(v, p.x, p.z);
      if (dist <= 0.15 && p.y - sol < 0.1) { v.anim.jouer("repos"); poserRepas(v); }
      break;
    }
    case "repas": {
      if (v.minuteur <= 0) { v.etat = "pause"; v.minuteur = 1; }
      break;
    }
    case "dort": {
      if (v.minuteur <= 0) { v.anim.jouer("repos"); v.anim.jouer(Math.random() < 0.5 ? "bailler" : "etirer"); v.etat = "action"; v.minuteur = 2.6; v.fatigue = 0; }
      break;
    }
    default: {
      if (v.etat === "pause" && Math.random() < dt * 0.3) tourner(v, v.mobile.rotation.y + (Math.random() - 0.5), dt, 1);
      if (nage(v) && v.etat === "pause") v.anim.jouer("nage");
      // Mission finie : le dragon rentre chez lui
      if (v.libre && v.minuteur <= 0 && !v.anim.action) { allerVers(v, v.maison.clone(), "nid", 1.1); break; }
      if (v.minuteur <= 0 && !v.anim.action && D.suivi !== v) choisirEnvie(v);
    }
  }
  if (v.etat !== "vol" && v.etat !== "atterrir") repousser(v, dt);
  const y = v.etat === "vol" ? v.volY : hauteurVoulue(v, p.x, p.z) + hauteurVol;
  p.y += (y - p.y) * Math.min(1, dt * (v.etat === "vol" ? 3 : v.etat === "atterrir" ? 1.8 : nage(v) ? 2 : 6));
}

// ---------- Récolte : un dragon de l'île va chercher la ressource ----------
const DUREE_RECOLTE = { buisson: 3, rocher: 4, gisement: 5, epave: 3.5, recif: 4.5, arbre_mort: 3.5, basalte: 4.5, sapin: 3.5, bloc_glace: 4, palmier: 3.5 };
const SON_RECOLTE = { buisson: "bois", rocher: "pierre", epave: "eau", recif: "eau", arbre_mort: "bois", sapin: "bois", palmier: "bois", basalte: "pierre", bloc_glace: "pierre" };
function nomIle(elx) { return elx === "eau" ? "d'Eau" : elx === "feu" ? "de Feu" : "de Glace"; }
const occupe = (v) => ["recolte", "versRecolte", "rituel", "rituelPret"].includes(v.etat);
function lancerRecolte(a, objet) {
  if ([...D.dragons.values()].some((v) => v.recolte && v.recolte.cle === a.cle && (v.etat === "recolte" || v.etat === "versRecolte"))) { toast("Un dragon s'en occupe déjà."); return; }
  const o = objet.position;
  const aqua = AQUA(a.noeud);
  // Tous les dragons de l'île peuvent y aller, qu'ils nagent ou marchent
  const bon = (v) => v.element === a.element && !v.ko;
  const libres = [...D.dragons.values()].filter((v) => bon(v) && !occupe(v));
  if (!libres.length) {
    const tous = [...D.dragons.values()].some(bon);
    Son.erreur();
    toast(tous ? "Tous les dragons de cette île sont déjà au travail." : `Il faut un dragon sur l'île ${nomIle(a.element)}.`, "mal");
    return;
  }
  // Dans le lagon, on préfère un plongeur pour un récif et un dragon de surface pour une épave
  const malus = (v) => (aqua ? (v.habitat === (a.noeud === "recif" ? "fond" : "surface") ? 0 : nage(v) ? 2 : 4) : nage(v) ? 4 : 0);
  libres.sort((x, y) => x.mobile.position.distanceTo(o) + malus(x) - y.mobile.position.distanceTo(o) - malus(y));
  const v = libres[0];
  if (v.ami) { const ami = v.ami; ami.ami = null; if (ami.etat === "rejoindre" || ami.etat === "attendre") { ami.etat = "pause"; ami.minuteur = 1; } v.ami = null; }
  v.libre = aqua !== nage(v);
  if (aqua || nage(v)) {
    // Tout droit : en surface pour une épave, au fond pour un récif, ou de l'eau jusqu'à la plage
    const dir = o.clone().sub(v.mobile.position).setY(0).normalize();
    const fin = o.clone().sub(dir.multiplyScalar(0.8 + v.taille * 0.4)); fin.y = 0;
    v.etapes = [];
    v.profondeurVoulue = a.noeud === "recif" ? 1 : 0;
    allerVers(v, fin, "versRecolte", 1.7);
    v.anim.jouer(enEau(v) ? "nage" : "marche");
  } else envoyer(v, o, "versRecolte", 2.2, 0.9 + v.taille * 0.45);
  v.recolte = { cle: a.cle, type: a.noeud, element: a.element, objet, duree: DUREE_RECOLTE[a.noeud] || 4, t: 0 };
  Son.clic();
  toast(aqua ? `${PAR_ID[v.d.id].nom} part ${a.noeud === "epave" ? "fracasser l'épave" : "casser le récif"}.` : `${PAR_ID[v.d.id].nom} part récolter.`);
}
// Envoie un dragon près d'un point, en contournant le centre de l'île si besoin
function envoyer(v, o, etat, vitesse, approche) {
  const p = v.mobile.position;
  const dir = o.clone().sub(p).setY(0);
  const fin = o.clone().sub(dir.normalize().multiplyScalar(approche)); fin.y = 0;
  v.etapes = [];
  if (!cheminLibre({ ...v, habitat: "terre" }, p.x, p.z, fin.x, fin.z)) {
    const a0 = Math.atan2(p.z, p.x), a1 = Math.atan2(fin.z, fin.x);
    let d = a1 - a0; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2;
    const rr = v.element === "eau" ? 9 : 6.6;
    for (const k of [1 / 3, 2 / 3]) { const ang = a0 + d * k; v.etapes.push(new T.Vector3(Math.cos(ang) * rr, 0, Math.sin(ang) * rr)); }
    v.etapes.push(fin);
    allerVers(v, v.etapes.shift(), etat, vitesse);
  } else allerVers(v, fin, etat, vitesse);
  v.anim.jouer("repos");
}
function finirRecolte(v) {
  const rc = v.recolte;
  const gains = GAINS[rc.type] || { [ELEMENTS[rc.element].materiau]: 4 };
  let ok = false;
  changer(() => { ok = recolter(rc.cle, gains); });
  v.etat = "action"; v.minuteur = 1.6; v.anim.jouer("joie");
  v.recolte = null;
  if (!ok) return;
  Son.recolte(SON_RECOLTE[rc.type] || "cristal");
  toast(`${PAR_ID[v.d.id].nom} rapporte ${Object.entries(gains).map(([k, n]) => `${n} ${(MATERIAUX[k] ? MATERIAUX[k].nom : k).toLowerCase()}`).join(" et ")}.`, "bon");
  eclater(rc.objet, rc.type, 24, rc.element); rc.objet.scale.setScalar(0.001); rc.objet.visible = false;
  signaler("recolte");
}

// ---------- Éclats : l'objet cassé vole en morceaux (bois qui flotte, corail qui coule, bulles) ----------
const GEO_ECLAT = [new T.BoxGeometry(0.16, 0.05, 0.08), new T.TetrahedronGeometry(0.08, 0), new T.IcosahedronGeometry(0.05, 0)];
const GEO_BULLE = new T.IcosahedronGeometry(0.045, 1);
function eclater(objet, type, n, elx = "eau") {
  const parent = objet.parent;
  if (!parent || D.eclats.length > 160) return;
  const couleurs = [];
  objet.traverse((o) => { if (o.isMesh && o.material && o.material.color) couleurs.push(o.material.color.getHex()); });
  const flotte = type === "epave", terre = !AQUA(type);
  const sol = (x, z) => D.iles[elx].sol(x, z);
  const c = objet.position.clone(); c.y += flotte ? 0.1 : terre ? 0.5 : 0.35;
  for (let i = 0; i < n; i++) {
    const coul = couleurs[Math.floor(Math.random() * couleurs.length)] || 0x8a5a32;
    const m = new T.Mesh(GEO_ECLAT[i % 3], mat(coul, { unique: true, o: 0.999, r: 0.8 }));
    m.position.copy(c).add(new T.Vector3((Math.random() - 0.5) * 0.4, Math.random() * 0.2, (Math.random() - 0.5) * 0.4));
    m.scale.setScalar(0.8 + Math.random() * 0.9);
    const a = Math.random() * 6.28, f = (flotte ? 1.6 : 1.0) * (0.5 + Math.random());
    parent.add(m);
    D.eclats.push({ o: m, v: new T.Vector3(Math.cos(a) * f, (flotte || terre ? 2.6 : 1.2) * (0.4 + Math.random()), Math.sin(a) * f), rot: new T.Vector3(Math.random() * 6, Math.random() * 6, Math.random() * 6), t: 0, vie: flotte ? 4 + Math.random() * 2 : 2.5 + Math.random(), flotte, terre, sol: flotte ? NIVEAU_EAU : sol(m.position.x, m.position.z) + 0.04, elx });
  }
  if (terre) {
    // Un petit nuage de poussière (de neige sur l'île de Glace)
    const coul = elx === "glace" ? 0xffffff : elx === "feu" ? 0x6a5a52 : 0xe8dcb0;
    for (let i = 0; i < Math.ceil(n / 3); i++) {
      const m = new T.Mesh(GEO_BULLE, mat(coul, { unique: true, o: 0.7, r: 1 }));
      m.position.copy(objet.position).add(new T.Vector3((Math.random() - 0.5) * 0.8, 0.1, (Math.random() - 0.5) * 0.8));
      m.scale.setScalar(2 + Math.random() * 2.5);
      parent.add(m);
      D.eclats.push({ o: m, v: new T.Vector3((Math.random() - 0.5) * 0.6, 0.4 + Math.random() * 0.4, (Math.random() - 0.5) * 0.6), rot: new T.Vector3(), t: 0, vie: 1.1, bulle: true, poussiere: true });
    }
    return;
  }
  // Des bulles (récif) ou des gerbes d'écume (épave)
  for (let i = 0; i < Math.ceil(n / 2); i++) {
    const m = new T.Mesh(GEO_BULLE, mat(0xffffff, { unique: true, o: 0.8, r: 0.1, e: 0x8adfff, ei: 0.3 }));
    m.position.copy(c).add(new T.Vector3((Math.random() - 0.5) * 0.6, 0, (Math.random() - 0.5) * 0.6));
    m.scale.setScalar(0.6 + Math.random() * 1.2);
    parent.add(m);
    D.eclats.push({ o: m, v: flotte ? new T.Vector3((Math.random() - 0.5) * 1.5, 2 + Math.random() * 2, (Math.random() - 0.5) * 1.5) : new T.Vector3((Math.random() - 0.5) * 0.3, 0.8 + Math.random() * 0.8, (Math.random() - 0.5) * 0.3), rot: new T.Vector3(), t: 0, vie: flotte ? 0.9 : 3, bulle: true, flotte });
  }
}
function majEclats(dt) {
  for (let i = D.eclats.length - 1; i >= 0; i--) {
    const e = D.eclats[i], p = e.o.position;
    e.t += dt;
    if (e.libre) {
      e.v.y += e.g * dt; if (e.frein !== 1) e.v.multiplyScalar(Math.pow(e.frein, dt));
      p.addScaledVector(e.v, dt); if (e.grossit) e.o.scale.multiplyScalar(1 + e.grossit * dt);
      if (e.o.geometry === GEO_COEUR) e.o.quaternion.copy(D.camera.quaternion);
    } else if (e.poussiere) {
      p.addScaledVector(e.v, dt); e.o.scale.multiplyScalar(1 + dt * 0.8);
    } else if (e.terre) {
      // Morceaux qui retombent et rebondissent sur le sol
      e.v.y -= 9 * dt; p.addScaledVector(e.v, dt);
      e.o.rotation.x += e.rot.x * dt; e.o.rotation.z += e.rot.z * dt;
      const s = D.iles[e.elx].sol(p.x, p.z) + 0.04;
      if (p.y < s) { p.y = s; e.v.y = Math.abs(e.v.y) * 0.3; e.v.x *= 0.5; e.v.z *= 0.5; e.rot.multiplyScalar(0.5); }
    } else if (e.bulle) {
      if (e.flotte) e.v.y -= 9 * dt; // écume : retombe
      else { e.v.x += (Math.random() - 0.5) * dt * 2; if (p.y > NIVEAU_EAU) e.t = Math.max(e.t, e.vie - 0.2); }
      p.addScaledVector(e.v, dt);
    } else if (e.flotte) {
      // Morceaux de bois : sautent, retombent dans l'eau puis dérivent en se balançant
      if (p.y > e.sol || e.v.y > 0) { e.v.y -= 9 * dt; p.addScaledVector(e.v, dt); e.o.rotation.x += e.rot.x * dt; e.o.rotation.z += e.rot.z * dt; }
      if (p.y <= e.sol && e.v.y <= 0) { e.v.multiplyScalar(Math.pow(0.4, dt)); e.v.y = 0; p.x += e.v.x * dt; p.z += e.v.z * dt; p.y = e.sol + Math.sin(D.t * 3 + i) * 0.02; e.o.rotation.x *= 0.95; e.o.rotation.z *= 0.95; }
    } else {
      // Morceaux de corail : freinés par l'eau, puis coulent
      e.v.multiplyScalar(Math.pow(0.15, dt)); e.v.y -= 1.2 * dt;
      p.addScaledVector(e.v, dt);
      if (p.y < e.sol) { p.y = e.sol; e.v.set(0, 0, 0); }
      e.o.rotation.x += e.rot.x * dt * 0.3; e.o.rotation.y += e.rot.y * dt * 0.3;
    }
    const reste = e.vie - e.t;
    if (reste < 0.8) e.o.material.opacity = Math.max(0, reste / 0.8) * (e.bulle ? 0.8 : 1);
    if (e.libre && e.o.geometry !== GEO_COEUR && reste < e.vie) e.o.material.opacity = Math.max(0, Math.min(e.o.material.opacity, reste / e.vie));
    if (e.t >= e.vie) { e.o.parent && e.o.parent.remove(e.o); e.o.material.dispose(); D.eclats.splice(i, 1); }
  }
}

// ---------- Réveil d'une source : le dragon clé et un autre dragon s'y rendent ----------
function lancerRituel(elx) {
  const src = SOURCES[elx];
  const f = E().sources[elx];
  const vs = [...D.dragons.values()].filter((v) => v.element === elx && !v.ko);
  let groupe;
  if (f.niveau === 0) {
    const cle = vs.find((v) => v.d.id === src.cle);
    const autre = vs.find((v) => v !== cle);
    groupe = [cle, autre].filter(Boolean);
  } else groupe = vs.slice(0, 7);
  if (!groupe.length) return;
  const [sx, sz] = POS_SOURCE[elx];
  groupe.forEach((v, i) => {
    v.recolte = null; v.ami = null;
    const a = (i / groupe.length) * Math.PI * 2 + 0.6;
    const cible = new T.Vector3(sx + Math.cos(a) * (CENTRE[elx][2] + 0.7), 0, sz + Math.sin(a) * (CENTRE[elx][2] + 0.7));
    if (nage(v)) { v.etapes = []; allerVers(v, cible, "rituel", 1.4); }
    else envoyer(v, cible, "rituel", 1.8, 0.01);
  });
  D.rituel = { elx, groupe, t: 0 };
  focaliser(elx);
  D.orbite.viser(POS_ILES[elx].clone().add(new T.Vector3(sx, 1, sz)), 18, D.orbite.thetaV, 1.0);
  toast(`${groupe.map((v) => PAR_ID[v.d.id].nom).join(" et ")} rejoignent la source…`);
}
function majRituel(dt) {
  const r = D.rituel;
  r.t += dt;
  const prets = r.groupe.every((v) => v.etat === "rituelPret");
  if (!r.fini && (prets || r.t > 14)) {
    r.fini = true;
    for (const v of r.groupe) { v.anim.jouer("rugir"); Son.crier(v.element, Math.min(1, v.stade / 4)); }
    setTimeout(() => {
      Son.portail();
      changer((s) => { s.sources[r.elx].niveau += 1; s.sources[r.elx].maj = maintenant(); });
      const niv = E().sources[r.elx].niveau;
      majSource(r.elx, true);
      toast(`${SOURCES[r.elx].noms[niv]} ! La source donne maintenant des ${MATERIAUX[SOURCES[r.elx].nourriture].nom.toLowerCase()}.`, "bon");
      noter(`${SOURCES[r.elx].noms[niv]} sur l'île ${nomIle(r.elx)}.`);
      for (const v of r.groupe) { v.etat = "action"; v.minuteur = 2.5; v.anim.jouer("joie"); }
      D.rituel = null;
      signaler("source_reveillee");
    }, 1300);
  }
}

function majSource(elx, animer = false) {
  const ile = D.iles[elx];
  const niv = E().sources[elx].niveau;
  if (ile.niveauSource === niv && ile.source) return;
  if (ile.source) ile.groupe.remove(ile.source);
  const s = construireSource(elx, niv);
  const [x, z] = POS_SOURCE[elx];
  ile.baseSource = elx === "eau" ? 0 : ile.sol(x, z);
  s.position.set(x, ile.baseSource, z);
  s.userData.action = { type: "source", element: elx };
  const zc = new T.Mesh(new T.CylinderGeometry(2.2, 2.2, 3, 10), new T.MeshBasicMaterial({ visible: false })); zc.position.y = elx === "eau" ? -0.5 : 1; s.add(zc);
  ile.groupe.add(s);
  ile.source = s; ile.niveauSource = niv;
  if (elx !== "eau") {
    s.updateMatrixWorld(true);
    const bb = new T.Box3().setFromObject(s);
    ile.obstSource = bb.isEmpty() ? null : { x, z, r: CENTRE[elx][2] * 0.85, haut: bb.max.y - ile.groupe.position.y, source: true };
  }
  if (animer && niv > 0) ile.croissance = 0;
}

// ---------- Synchronise la 3D avec la partie ----------
function attribuerPlaces() {
  const e = E();
  const prises = new Set();
  for (const d of e.dragons) {
    const ok = d.place && emplacements(PAR_ID[d.id].element).some((s) => s.id === d.place) && !prises.has(d.place);
    if (ok) prises.add(d.place); else d.place = null;
  }
  for (const d of e.dragons) {
    if (d.place) continue;
    const elx = PAR_ID[d.id].element, hab = habitatDe(d.id);
    const libres = emplacements(elx).filter((s) => !prises.has(s.id));
    const choix = libres.find((s) => s.type === hab) || libres.find((s) => s.type === "terre") || libres[0];
    if (choix) { d.place = choix.id; prises.add(choix.id); }
  }
}
function synchroniser() {
  const e = E();
  attribuerPlaces();
  const vus = new Set();
  for (const d of e.dragons) {
    const elx = PAR_ID[d.id].element;
    const ile = D.iles[elx];
    const slot = emplacements(elx).find((s) => s.id === d.place) || { x: 5, z: 0, type: "terre" };
    vus.add(d.uid);
    const stade = stadeEffectif(d);
    const cle = `${d.id}|${stade}|${d.armure}|${d.ul}|${d.nid}|${d.place}`;
    const ancien = D.dragons.get(d.uid);
    const ko = d.pv <= 0;
    if (ancien && ancien.cle === cle) {
      ancien.d = d;
      if (ancien.ko !== ko) { ancien.ko = ko; ancien.anim.jouer(ko ? "ko" : "repos"); ancien.etat = "pause"; ancien.minuteur = 1; }
      continue;
    }
    const evolue = ancien && ancien.stade < stade;
    if (ancien) { ile.groupe.remove(ancien.nid); ile.groupe.remove(ancien.mobile); }
    const habitat = habitatDe(d.id);
    // Habitat réel : l'eau seulement si le nid est dans l'eau
    const habitatReel = slot.type === "surface" || slot.type === "fond" ? slot.type : (habitat === "surface" || habitat === "fond" ? "terre" : habitat);
    const maison = new T.Vector3(slot.x, 0, slot.z);
    const rig = construireDragon(d.id, stade, { armure: d.armure, ul: d.ul });
    const taille = Math.max(rig.taille.x, rig.taille.z);
    const echelle = Math.min(1.25, 2.6 / taille);
    rig.racine.scale.setScalar(echelle);
    const rayonNid = Math.max(0.5, Math.min(1.3, Math.max(rig.taille.x, rig.taille.z * 0.5) * echelle * 0.55));
    const nid = construireNid(d.nid, elx, rayonNid, stade, GENOMES[d.id].base.couleurs);
    const yNid = slot.type === "surface" ? NIVEAU_EAU + 0.02 : solIle(elx, slot.x, slot.z);
    nid.position.set(slot.x, yNid, slot.z);
    nid.rotation.y = Math.atan2(slot.x, slot.z);
    if (slot.type === "surface") {
      for (let k = 0; k < 3; k++) { const f = mesh(new T.CircleGeometry(rayonNid * 0.9, 8, 0.3, Math.PI * 1.8), mat(0x3a9a4a, { d: true }), false); f.rotation.x = -Math.PI / 2; f.position.set((k - 1) * rayonNid * 0.7, -0.01, (k % 2) * rayonNid * 0.5); nid.add(f); }
    }
    nid.userData.action = { type: "dragon", uid: d.uid };
    ile.groupe.add(nid);
    const mobile = new T.Group();
    mobile.add(rig.racine);
    if (ancien && ancien.habitat === habitatReel && ancien.d.place === d.place) { mobile.position.copy(ancien.mobile.position); mobile.rotation.y = ancien.mobile.rotation.y; }
    else { mobile.position.set(slot.x, yNid, slot.z); mobile.rotation.y = Math.atan2(slot.x, slot.z); }
    mobile.userData.action = { type: "dragon", uid: d.uid };
    const zoneClic = new T.Mesh(new T.SphereGeometry(Math.max(0.8, Math.max(rig.taille.x, rig.taille.y, rig.taille.z) * echelle * 0.55), 8, 6), new T.MeshBasicMaterial({ visible: false }));
    zoneClic.position.y = rig.taille.y * echelle * 0.45;
    mobile.add(zoneClic);
    ile.groupe.add(mobile);
    const anim = new Animateur(rig);
    const v = {
      d, rig, anim, cle, element: elx, stade, ko, nid, mobile, maison, echelle, taille: taille * echelle, habitat: habitatReel,
      hauteur: rig.taille.y * echelle, etat: "pause", minuteur: 0.5 + Math.random() * 3, fatigue: Math.random() * 30, cible: null, vitesse: 1, profondeurVoulue: 1,
    };
    if (ko) anim.jouer("ko");
    else if (nage(v)) anim.jouer("nage");
    if (evolue) { anim.jouer("evolution"); Son.evolution(); v.minuteur = 3; v.etat = "action"; }
    if (D.suivi && ancien && D.suivi === ancien) D.suivi = v;
    D.dragons.set(d.uid, v);
  }
  for (const [uid, v] of D.dragons) if (!vus.has(uid)) { D.iles[v.element].groupe.remove(v.nid); D.iles[v.element].groupe.remove(v.mobile); D.dragons.delete(uid); }
  for (const elx of ["feu", "glace", "eau"]) majSource(elx);
  const c = e.oeufs.couvoir;
  const cleC = `${c.niveau}|${c.slots.map((s) => s.oeuf.element).join(",")}`;
  if (cleC !== D.couvoirCle) {
    if (D.couvoir) D.centre.couvoir.remove(D.couvoir);
    D.couvoir = construireCouvoir(c.niveau);
    D.couvoir.userData.action = { type: "couvoir" };
    D.couvoir.userData.oeufs = [];
    c.slots.forEach((s, i) => { const o = construireOeuf(s.oeuf.element, 0.55); D.couvoir.userData.nids[i].add(o); D.couvoir.userData.oeufs.push(o); });
    D.centre.couvoir.add(D.couvoir);
    D.couvoirCle = cleC;
  }
}

// ---------- Placement des nids ----------
function demarrerPlacement(d) {
  finirPlacement();
  const elx = PAR_ID[d.id].element, hab = habitatDe(d.id);
  const prises = new Set(E().dragons.filter((x) => x.uid !== d.uid).map((x) => x.place));
  const ok = emplacements(elx).filter((s) => !prises.has(s.id) && s.type === hab);
  const liste = ok.length ? ok : emplacements(elx).filter((s) => !prises.has(s.id) && s.type === "terre");
  D.placement = { uid: d.uid };
  const ile = D.iles[elx];
  for (const s of liste) {
    const g = new T.Group();
    const coul = COULEUR_HABITAT[s.type];
    const anneau = mesh(new T.TorusGeometry(0.9, 0.08, 4, 18), mat(coul, { e: coul, ei: 1.2, o: 0.75, unique: true }), false); anneau.rotation.x = Math.PI / 2; g.add(anneau);
    g.add(mesh(new T.CylinderGeometry(0.06, 0.06, 4, 5).translate(0, 2, 0), mat(coul, { e: coul, ei: 1, o: 0.5 }), false));
    const y = s.type === "surface" ? NIVEAU_EAU + 0.1 : solIle(elx, s.x, s.z) + 0.1;
    g.position.set(s.x, y, s.z);
    g.userData.action = { type: "emplacement", id: s.id, uid: d.uid };
    g.add(new T.Mesh(new T.SphereGeometry(1.2, 8, 6), new T.MeshBasicMaterial({ visible: false })));
    ile.groupe.add(g);
    D.marqueurs.push(g);
  }
  fermerFiche();
  focaliser(elx);
  racineUI.append(el("div", { class: "bandeau-placement panneau", id: "bandeau-placement" },
    el("span", {}, `Où placer le nid de ${PAR_ID[d.id].nom} ? `, el("b", {}, NOMS_HABITAT[hab]), ok.length ? ". Touche un anneau." : " : aucune place libre de ce type, voici les places sur la terre ferme."),
    el("button", { class: "btn petit", onclick: () => finirPlacement() }, "Annuler")));
}
function finirPlacement() {
  if (!D) return;
  for (const m of D.marqueurs) m.parent && m.parent.remove(m);
  D.marqueurs = [];
  D.placement = null;
  document.getElementById("bandeau-placement")?.remove();
}

// ---------- Clics dans la 3D ----------
function installerClics() {
  const canvas = document.getElementById("scene3d");
  const ray = new T.Raycaster();
  let depart = null, nbDoigts = 0, multi = false;
  canvas.addEventListener("pointerdown", (e) => { nbDoigts++; if (nbDoigts > 1) multi = true; if (nbDoigts === 1) { depart = { x: e.clientX, y: e.clientY }; multi = false; } });
  const lacher = () => { nbDoigts = Math.max(0, nbDoigts - 1); };
  canvas.addEventListener("pointercancel", lacher);
  canvas.addEventListener("pointerup", (e) => {
    lacher();
    if (multi || !depart || !ctxJeu || ctxJeu.ecran !== "iles" || ctxJeu.moteur.decor !== D) return;
    if (Math.hypot(e.clientX - depart.x, e.clientY - depart.y) > 8 || e.button === 2) return;
    const v = new T.Vector2((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1);
    ray.setFromCamera(v, D.camera);
    const cibles = [];
    for (const ile of Object.values(D.iles)) cibles.push(ile.groupe);
    cibles.push(D.centre.groupe);
    const hits = ray.intersectObjects(cibles, true);
    for (const h of hits) {
      let o = h.object;
      while (o && !o.userData.action) o = o.parent;
      if (o && (!D.placement || o.userData.action.type === "emplacement")) { action(o.userData.action, o); return; }
    }
    if (D.placement) return;
    for (const h of hits) for (const [elx, ile] of Object.entries(D.iles)) {
      let o = h.object; while (o && o !== ile.groupe) o = o.parent;
      if (o && D.focus !== elx) { focaliser(elx); return; }
    }
  });
}

function action(a, objet) {
  const e = E();
  if (a.type === "emplacement") {
    const d = e.dragons.find((x) => x.uid === a.uid);
    changer(() => { d.place = a.id; });
    finirPlacement();
    Son.ok(); toast(`Nouveau nid pour ${PAR_ID[d.id].nom}.`, "bon");
    synchroniser();
    const v = D.dragons.get(d.uid); if (v) suivre(v);
    signaler("placement");
    return;
  }
  if (a.type === "dragon") {
    Son.clic();
    const d = e.dragons.find((x) => x.uid === a.uid);
    if (!d) return;
    const v = D.dragons.get(d.uid);
    ficheDragon(d);
    if (v) suivre(v);
    if (v && !v.ko && !["vol", "atterrir", "recolte", "versRecolte", "rituel", "rituelPret", "repas"].includes(v.etat)) { v.etat = "action"; v.minuteur = 3; v.anim.jouer(nage(v) ? "nage" : "repos"); v.anim.jouer(Math.random() < 0.5 ? "joie" : "regarder"); }
  } else if (a.type === "noeud") {
    if (!noeudDispo(a.cle)) { toast(`Ça repousse : encore ${fmtDuree(e.noeuds[a.cle] - maintenant())}.`); return; }
    lancerRecolte(a, objet);
  } else if (a.type === "source") { Son.clic(); focaliser(a.element, false); ficheSource(a.element); signaler("source"); }
  else if (a.type === "couvoir") { Son.clic(); ctxJeu.aller("couvoir"); }
}

// La caméra se rapproche du dragon et le suit
function suivre(v) {
  D.fond = false;
  D.focus = v.element;
  D.suivi = v;
  const z = ficheUI ? zoneVisible() : null;
  if (z) ctxJeu.moteur.definirZone(z);
  D.orbite.distV = D.suiviDist = distanceSuivi(v, z);
  D.orbite.phiV = 1.12;
  majBoutons();
}
// Distance de caméra pour que le dragon remplisse bien la partie visible de l'écran
function distanceSuivi(v, z) {
  const t = Math.tan((D.camera.fov * Math.PI) / 360);
  const zh = z ? z.h : 0.8, zl = z ? z.l : 1;
  const haut = v.hauteur * 1.5 + 0.6, large = v.hauteur * 2.2 + 0.8;
  const d = Math.max(haut / (2 * t * zh * 0.85), large / (2 * t * zl * D.camera.aspect * 0.85));
  return Math.max(2.2, Math.min(60, d));
}
// Recalcule la zone visible (au-dessus de la fiche) et le cadrage du dragon suivi
function majCadrage() {
  if (!D || !ficheUI || !ctxJeu || ctxJeu.ecran !== "iles") return;
  const z = zoneVisible();
  ctxJeu.moteur.definirZone(z);
  if (D.suivi) D.orbite.distV = D.suiviDist = distanceSuivi(D.suivi, z);
  placerFleches();
}

// ---------- Caméra ----------
export function focaliser(elx, rapproche = true) {
  D.fond = false;
  D.focus = elx;
  D.suivi = null;
  const s = D.lum.soleil;
  const cible = elx === "tout" || elx === "centre" ? new T.Vector3(0, 0, 0) : POS_ILES[elx].clone();
  s.target.position.copy(cible);
  s.position.copy(cible).add(new T.Vector3(14, 24, 10));
  const z = elx === "tout" ? 55 : 18;
  Object.assign(s.shadow.camera, { left: -z, right: z, top: z, bottom: -z });
  s.shadow.camera.updateProjectionMatrix();
  if (elx === "tout") D.orbite.viser(new T.Vector3(0, 0, 0), 88, D.orbite.thetaV, 0.95);
  else if (elx === "centre") D.orbite.viser(new T.Vector3(0, 0.8, 0), 11, D.orbite.thetaV, 1.1);
  else {
    const p = POS_ILES[elx];
    const theta = Math.atan2(p.x, p.z);
    const loin = window.innerWidth / window.innerHeight < 0.8 ? 38 : 27;
    D.orbite.viser(p.clone().add(new T.Vector3(0, 0.8, 0)), rapproche ? loin : D.orbite.distV < loin * 1.2 ? D.orbite.distV : loin, rapproche ? theta : D.orbite.thetaV, rapproche ? 0.92 : D.orbite.phiV);
  }
  majBoutons();
}

// ---------- Étiquettes au-dessus des dragons ----------
let calqueEtiq = null;
const etiquettes = new Map();
function majEtiquettes() {
  if (!calqueEtiq || !D.focus || D.focus === "tout" || D.focus === "centre" || ctxJeu.moteur.decor !== D) { if (calqueEtiq) calqueEtiq.hidden = true; return; }
  calqueEtiq.hidden = false;
  const vus = new Set();
  const v = new T.Vector3();
  const loin = D.orbite.dist > 34;
  for (const [uid, info] of D.dragons) {
    info.proche = info.element === D.focus && !loin;
    if (!info.proche) continue;
    vus.add(uid);
    let lab = etiquettes.get(uid);
    const d = info.d;
    if (!lab) { lab = el("div", { class: "etiq" }); calqueEtiq.append(lab); etiquettes.set(uid, lab); lab.dataset.k = ""; }
    const enRecolte = info.etat === "recolte" && info.recolte;
    const humeur = info.ko ? "ko" : nage(info) && (info.etat === "pause" || info.etat === "nage") ? (info.habitat === "fond" ? "plonge" : "nage") : info.etat;
    const k = `${d.niveau}|${d.pv}|${evolutionBloquee(d)}|${attendPercee(d)}|${humeur}|${enRecolte ? Math.ceil(info.recolte.duree - info.recolte.t) : ""}`;
    if (lab.dataset.k !== k) {
      lab.dataset.k = k; lab.innerHTML = "";
      lab.className = "etiq" + (evolutionBloquee(d) || attendPercee(d) ? " alerte" : "");
      lab.append(el("b", {}, `${PAR_ID[d.id].nom} `, el("span", { class: "doux num" }, `Nv ${d.niveau}`)), barre(d.pv, pvMax(d), "pv"),
        enRecolte ? el("span", { class: "recolte" }, `Récolte… ${Math.ceil(info.recolte.duree - info.recolte.t)} s`) : el("span", { class: "humeur" }, HUMEURS[humeur] || ""),
        ...(enRecolte ? [barre(info.recolte.t, info.recolte.duree, "xp")] : []));
    }
    info.mobile.getWorldPosition(v); v.y += info.hauteur + 0.6;
    if (nage(info)) v.y = Math.max(v.y, POS_ILES[info.element].y + NIVEAU_EAU + 0.9);
    const p = versEcran(v, D.camera);
    lab.style.left = p.x + "px"; lab.style.top = p.y + "px";
    lab.hidden = !p.devant;
  }
  for (const [uid, lab] of etiquettes) if (!vus.has(uid)) { lab.remove(); etiquettes.delete(uid); }
}

// ---------- Écran ----------
let racineUI = null, ficheUI = null;
export function ouvrir(ctx) {
  ctxJeu = ctx;
  if (!D) construireDecor();
  D.fond = false;
  synchroniser();
  ctx.moteur.montrer(D);
  Musique.jouer("iles");
  racineUI = document.getElementById("ecran");
  racineUI.append(el("div", { class: "iles-choix", id: "iles-choix" }));
  calqueEtiq = el("div", { class: "etiquettes-3d" });
  racineUI.append(calqueEtiq);
  etiquettes.clear();
  racineUI.append(el("div", { class: "iles-aide" }, "Touche un arbre, un rocher, une épave ou un récif : un dragon de l'île ira le casser. Deux doigts (ou clic droit) pour te déplacer."));
  if (!D.focus) { const premier = E().dragons[0]; focaliser(premier ? PAR_ID[premier.id].element : "tout"); } else focaliser(D.focus);
  ctx.majHud();
  signaler("ecran", "iles");
}
export function fermer() { finirPlacement(); calqueEtiq = null; ficheUI = null; fermerListe(); etiquettes.clear(); if (D) D.suivi = null; ctxJeu.moteur.definirZone(null); }

function majBoutons() {
  const c = document.getElementById("iles-choix");
  if (!c) return;
  c.innerHTML = "";
  if (E().dragons.length) c.append(el("button", { class: "btn petit mes-dragons", onclick: () => { Son.clic(); ouvrirListe(); } }, `Mes dragons (${E().dragons.length})`));
  for (const [id, nom] of [["tout", "Vue d'ensemble"], ["feu", "Île de Feu"], ["glace", "Île de Glace"], ["eau", "Île d'Eau"], ["centre", "Couvoir"]]) {
    const cls = id === "feu" || id === "glace" || id === "eau" ? id : "";
    c.append(el("button", { class: `btn petit ${D.focus === id && !D.suivi ? "actif" : ""} ${cls}`, style: cls ? { color: `var(--${cls})` } : null, onclick: () => { Son.clic(); if (id === "centre" && D.focus === "centre") { ctxJeu.aller("couvoir"); return; } fermerFiche(); focaliser(id); } }, nom));
  }
}

function retirerFiche() { if (!ficheUI) return; if (ficheUI._ro) ficheUI._ro.disconnect(); for (const f of ficheUI._fleches || []) f.remove(); ficheUI.remove(); ficheUI = null; }
function fermerFiche() { document.body.classList.remove("avec-fiche"); if (ficheUI) { retirerFiche(); afficherTuto(); ctxJeu.moteur.definirZone(null); } if (D && D.suivi) { D.suivi = null; majBoutons(); } }
function zoneVisible() {
  const l = window.innerWidth, h = window.innerHeight;
  if (l <= 560) {
    // Entre le bas de l'interface du haut (barre, conseil de Maëlis) et le haut de la fiche
    let haut = 50;
    for (const sel of ["#hud", ".tuto-bulle", "#iles-choix"]) {
      const e = document.querySelector(sel);
      if (!e || e.hidden) continue;
      const r = e.getBoundingClientRect();
      if (r.height > 0 && r.top < h * 0.5) haut = Math.max(haut, r.bottom);
    }
    const bas = ficheUI ? ficheUI.getBoundingClientRect().top : h * 0.62;
    return { x: 0, y: haut / h, l: 1, h: Math.max(0.12, (bas - haut - 6) / h) };
  }
  return { x: 0, y: 0, l: 1 - Math.min(400, l * 0.4) / l, h: 1 };
}
function nouvelleFiche() {
  retirerFiche();
  ficheUI = el("section", { class: "fiche-ile panneau" });
  racineUI.append(ficheUI);
  document.body.classList.add("avec-fiche");
  if (window.ResizeObserver) { const ro = new ResizeObserver(() => majCadrage()); ro.observe(ficheUI); ficheUI._ro = ro; }
  ctxJeu.moteur.definirZone(zoneVisible());
  setTimeout(() => { afficherTuto(); majCadrage(); }, 0);
  return ficheUI;
}
const enTete = (titre, ...sous) => el("header", {}, el("div", {}, el("h3", {}, titre), el("div", { class: "sous" }, ...sous)), el("button", { class: "fermer-fiche", "aria-label": "Fermer", onclick: () => fermerFiche(), html: icone("fermer").innerHTML }));

// ---------- Repas : la vraie nourriture, posée devant le dragon ----------
// Ration = morceau de viande sur un os ; piments de lave ; baies de givre ; poisson des abysses.
const COUL_REPAS = { rations: [0x9a3a22, 0xf0e6d0], rations_feu: [0xd8261a, 0x3a8a2a], rations_glace: [0x7fd6ff, 0x4a9a8a], rations_eau: [0x2f9fb0, 0xd8f4ff] };
function modeleRepas(sorte) {
  const g = new T.Group();
  if (sorte === "rations_feu") {
    for (const s of [-1, 1]) {
      const p = new T.Group();
      p.add(mesh(new T.ConeGeometry(0.075, 0.36, 7).rotateZ(-Math.PI / 2), mat(0xd8261a, { r: 0.3, e: 0x8a1004, ei: 0.45 }), false));
      p.add(mesh(new T.CylinderGeometry(0.03, 0.05, 0.05, 6).rotateZ(-Math.PI / 2).translate(-0.2, 0, 0), mat(0x3a8a2a, { r: 0.7 }), false));
      p.add(mesh(new T.CylinderGeometry(0.012, 0.014, 0.09, 4).rotateZ(-Math.PI / 2.6).translate(-0.25, 0.03, 0), mat(0x2a6a1a, { r: 0.7 }), false));
      p.position.set(0.02 * s, 0.075, 0.07 * s); p.rotation.set(0, s * 0.45, s * 0.12);
      g.add(p);
    }
  } else if (sorte === "rations_glace") {
    const m = mat(0x7fd6ff, { r: 0.15, e: 0x3aa0e0, ei: 0.45, m: 0.1 });
    [[0, 0.07, 0], [0.09, 0.06, 0.03], [-0.08, 0.06, 0.04], [0.02, 0.06, -0.09], [0.03, 0.15, 0.01], [-0.05, 0.13, -0.04]].forEach(([x, y, z]) => { const b = mesh(new T.IcosahedronGeometry(0.06, 1), m, false); b.position.set(x, y, z); g.add(b); });
    for (const s of [-1, 1]) { const f = mesh(new T.ConeGeometry(0.05, 0.16, 3).rotateZ(Math.PI / 2).scale(1, 0.25, 1), mat(0x4a9a8a, { r: 0.8, d: true }), false); f.position.set(0.07 * s, 0.2, 0); f.rotation.y = s * 0.6; g.add(f); }
  } else if (sorte === "rations_eau") {
    const corps = mesh(new T.SphereGeometry(0.09, 9, 7).scale(2.3, 0.95, 0.6), mat(0x2f9fb0, { r: 0.25, m: 0.45 }), false);
    const ventre = mesh(new T.SphereGeometry(0.085, 9, 7).scale(2.1, 0.6, 0.55).translate(0, -0.03, 0), mat(0xd8f4ff, { r: 0.3, m: 0.3 }), false);
    const queue = mesh(new T.ConeGeometry(0.09, 0.14, 4).rotateZ(Math.PI / 2).scale(1, 1, 0.3).translate(-0.25, 0, 0), mat(0x1f7f90, { r: 0.4, d: true }), false);
    const oeil = mesh(new T.SphereGeometry(0.018, 6, 4), mat(0x050505, { r: 0.2 }), false); oeil.position.set(0.15, 0.025, 0.045);
    g.add(corps, ventre, queue, oeil); g.position.y = 0.06; g.rotation.z = 0.15;
    const h = new T.Group(); h.add(g); h.rotation.y = 0.4; return h;
  } else {
    const viande = mesh(new T.DodecahedronGeometry(0.12, 0).scale(1.35, 0.85, 1), mat(0x9a3a22, { r: 0.65 }), false); viande.position.y = 0.1;
    const gras = mesh(new T.DodecahedronGeometry(0.06, 0), mat(0xe8b090, { r: 0.7 }), false); gras.position.set(0.06, 0.17, 0.05);
    const os = mesh(new T.CylinderGeometry(0.025, 0.025, 0.46, 6).rotateZ(Math.PI / 2), mat(0xf0e6d0, { r: 0.5 }), false); os.position.y = 0.1;
    g.add(viande, gras, os);
    for (const s of [-1, 1]) for (const t of [-1, 1]) { const b = mesh(new T.SphereGeometry(0.035, 6, 5), mat(0xf0e6d0, { r: 0.5 }), false); b.position.set(0.24 * s, 0.1, 0.025 * t); g.add(b); }
  }
  return g;
}
// Nourrir : s'il vole, le dragon se pose d'abord
function montrerRepas(v, sorte) {
  v.repasSorte = sorte;
  const p = v.mobile.position;
  const enLAir = !nage(v) && !v.libre && p.y - solIle(v.element, p.x, p.z) > 0.35;
  if (v.etat === "vol" || enLAir) {
    v.cible = terrainOk(v, p.x, p.z) ? p.clone() : v.maison.clone();
    v.etat = "atterrir"; v.anim.jouer("vol");
    return;
  }
  poserRepas(v);
}
function poserRepas(v) {
  const sorte = v.repasSorte || "rations";
  const o = modeleRepas(sorte);
  o.scale.setScalar(1.25 * Math.max(0.8, v.echelle));
  const devant = new T.Vector3(Math.sin(v.mobile.rotation.y), 0, Math.cos(v.mobile.rotation.y)).multiplyScalar(v.taille * 0.42 + 0.25);
  o.position.copy(v.mobile.position).add(devant);
  o.position.y = nage(v) ? v.mobile.position.y + v.hauteur * 0.35 : solIle(v.element, o.position.x, o.position.z) + 0.01;
  o.rotation.y = Math.random() * 6;
  D.iles[v.element].groupe.add(o);
  D.repas.push({ o, t: 0, v, sorte, bouchees: 0, base: o.scale.x });
  v.etat = "repas"; v.minuteur = 3.8;
  v.anim.jouer(nage(v) ? "nage" : "repos"); v.anim.jouer("manger");
}
const BOUCHEES = [0.75, 1.6, 2.5, 3.3];
function majRepas(dt) {
  for (let i = D.repas.length - 1; i >= 0; i--) {
    const r = D.repas[i];
    r.t += dt;
    if (r.bouchees < BOUCHEES.length && r.t >= BOUCHEES[r.bouchees]) {
      r.bouchees++;
      if (r.bouchees === 2 && r.v.etat === "repas") r.v.anim.jouer("manger");
      miettes(r.o, COUL_REPAS[r.sorte] || COUL_REPAS.rations, r.v.element);
      if (r.v.proche) Son.croquer(r.sorte);
    }
    // Chaque bouchée fait rétrécir le repas d'un coup
    const k = Math.max(0, 1 - r.bouchees / BOUCHEES.length);
    const voulu = r.base * Math.max(0.001, k);
    r.o.scale.setScalar(r.o.scale.x + (voulu - r.o.scale.x) * Math.min(1, dt * 14));
    if (r.t > 3.6) { r.o.parent && r.o.parent.remove(r.o); D.repas.splice(i, 1); }
  }
}
function miettes(objet, couleurs, elx) {
  if (!objet.parent || D.eclats.length > 200) return;
  for (let i = 0; i < 5; i++) {
    const m = new T.Mesh(GEO_ECLAT[1 + (i % 2)], mat(couleurs[i % couleurs.length], { unique: true, o: 0.999, r: 0.7 }));
    m.position.copy(objet.position); m.position.y += 0.12;
    m.scale.setScalar(0.5 + Math.random() * 0.5);
    objet.parent.add(m);
    const a = Math.random() * 6.28, f = 0.4 + Math.random() * 0.6;
    D.eclats.push({ o: m, v: new T.Vector3(Math.cos(a) * f, 1.2 + Math.random(), Math.sin(a) * f), rot: new T.Vector3(Math.random() * 8, 0, Math.random() * 8), t: 0, vie: 1.4, terre: true, elx });
  }
}

// ---------- Interactions : chaque dragon a son caractère ----------
const CARACTERES = [
  { nom: "Joueur", desc: "Il adore qu'on s'occupe de lui et ne tient pas en place.", caresse: ["joie", "jouer"],
    rep: { caresser: "se roule de bonheur", jouer: "bondit partout, ravi", rugir: "pousse un petit cri joyeux", souffle: "fait un feu d'artifice rien que pour toi", envol: "file comme une flèche" } },
  { nom: "Fier", desc: "Un vrai seigneur. Il aime qu'on l'admire.", caresse: ["regarder", "rugir"],
    rep: { caresser: "bombe le torse", jouer: "accepte de jouer… mais avec classe", rugir: "rugit à faire trembler l'île", souffle: "montre toute sa puissance", envol: "s'élève majestueusement" } },
  { nom: "Timide", desc: "Il lui faut du temps, mais il est très attachant.", caresse: ["regarder", "joie"],
    rep: { caresser: "hésite… puis se blottit contre toi", jouer: "ose enfin jouer un peu", rugir: "fait un tout petit rugissement", souffle: "souffle tout doucement", envol: "s'envole en jetant un œil derrière lui" } },
  { nom: "Gourmand", desc: "Il pense surtout à manger. Il renifle tes poches.", caresse: ["renifler", "joie"],
    rep: { caresser: "renifle tes poches pour trouver à manger", jouer: "joue en espérant une récompense", rugir: "a l'estomac qui gronde plus fort que lui", souffle: "fait cuire… rien du tout", envol: "part chercher un goûter" } },
  { nom: "Paresseux", desc: "Il passerait sa vie à dormir au soleil.", caresse: ["bailler", "etirer"],
    rep: { caresser: "bâille et s'étire de tout son long", jouer: "joue trois secondes, puis se recouche", rugir: "rugit… en bâillant", souffle: "souffle sans conviction", envol: "décolle en traînant des ailes" } },
  { nom: "Curieux", desc: "Il veut tout voir, tout sentir, tout comprendre.", caresse: ["renifler", "regarder"],
    rep: { caresser: "te renifle avec curiosité", jouer: "invente un nouveau jeu", rugir: "écoute l'écho de son rugissement", souffle: "observe ce que fait son souffle", envol: "va voir ce qu'il y a là-haut" } },
];
export function caractere(d) { let h = 0; for (const c of d.uid) h = (h * 31 + c.charCodeAt(0)) >>> 0; return CARACTERES[h % CARACTERES.length]; }
const NOM_SOUFFLE = { feu: "Souffle de feu", glace: "Souffle de givre", eau: "Jet d'eau" };
const COUL_SOUFFLE = { feu: [0xfff0a0, 0xffb02a, 0xff5a0a], glace: [0xffffff, 0xcff2ff, 0x7fd6ff], eau: [0xe8fbff, 0x9fe8ff, 0x48c8e0] };
function peutVoler(v) { return v.rig.ailes.length > 0 && v.stade >= 1 && !nage(v); }
function interagir(d, type) {
  const v = D.dragons.get(d.uid);
  const nom = PAR_ID[d.id].nom;
  if (!v) return;
  if (v.ko) { Son.erreur(); toast(`${nom} est K.O. : nourris-le d'abord.`, "mal"); return; }
  if (["recolte", "versRecolte", "rituel", "rituelPret", "repas", "atterrir"].includes(v.etat)) { toast(`${nom} est occupé.`); return; }
  if (v.etat === "vol" && type !== "souffle" && type !== "rugir") { toast(`${nom} vole : attends qu'il se pose.`); return; }
  const car = caractere(d);
  if (type === "envol") { decoller(v, 9); Son.ailes(); }
  else {
    if (v.etat !== "vol") { v.etat = "action"; v.minuteur = type === "caresser" ? 3.2 : 2.6; }
    if (type === "caresser") { v.anim.jouer(car.caresse[0]); setTimeout(() => { if (v.etat === "action") v.anim.jouer(car.caresse[1]); }, 1250); coeurs(v); Son.ronron(v.element, Math.min(1, v.stade / 4)); }
    else if (type === "jouer") { v.anim.jouer("jouer"); setTimeout(() => { if (v.etat === "action") v.anim.jouer("joie"); }, 1500); Son.joie(); }
    else if (type === "rugir") { v.anim.jouer("rugir"); Son.crier(v.element, Math.min(1, v.stade / 4)); }
    else if (type === "souffle") { v.anim.jouer("attaque"); setTimeout(() => souffler(v), 380); Son.souffle(v.element); }
  }
  toast(`${nom} ${car.rep[type]}.`, "bon");
  // Le lien grandit avec les moments passés ensemble (une fois toutes les 10 s)
  const t = maintenant();
  if (!v.dernierLien || t - v.dernierLien > 10e3) { v.dernierLien = t; changer(() => { d.lien = Math.min(100, (d.lien || 0) + 1); }); }
}
function particule(parent, pos, couleur, vitesse, opts = {}) {
  const m = new T.Mesh(opts.geo || GEO_BULLE, mat(couleur, { unique: true, o: opts.o ?? 0.95, e: opts.e ? couleur : undefined, ei: opts.e ? 0.9 : undefined, r: 0.4 }));
  m.position.copy(pos); m.scale.setScalar(opts.taille || 1);
  parent.add(m);
  D.eclats.push({ o: m, v: vitesse, rot: new T.Vector3(), t: 0, vie: opts.vie || 1, libre: true, g: opts.g || 0, frein: opts.frein ?? 1, grossit: opts.grossit || 0 });
}
function teteLocale(v) {
  const parent = D.iles[v.element].groupe;
  const w = new T.Vector3();
  if (v.rig.tete) v.rig.tete.getWorldPosition(w);
  else { v.mobile.getWorldPosition(w); w.y += v.hauteur * 0.7; }
  return parent.worldToLocal(w);
}
function souffler(v) {
  const parent = D.iles[v.element].groupe;
  const a = v.mobile.rotation.y;
  const dir = new T.Vector3(Math.sin(a), -0.18, Math.cos(a)).normalize();
  const coul = COUL_SOUFFLE[v.element] || COUL_SOUFFLE.feu;
  const depart = teteLocale(v).add(dir.clone().multiplyScalar(0.25 * v.echelle));
  for (let vague = 0; vague < 4; vague++) setTimeout(() => {
    for (let i = 0; i < 9; i++) {
      const s = 2.6 + Math.random() * 2.4;
      const ecart = new T.Vector3((Math.random() - 0.5) * 0.6, (Math.random() - 0.5) * 0.4, (Math.random() - 0.5) * 0.6);
      const vit = dir.clone().add(ecart).normalize().multiplyScalar(s * Math.max(0.7, v.echelle));
      particule(parent, depart, coul[i % 3], vit, v.element === "feu" ? { e: true, g: 1.6, frein: 0.25, grossit: 1.6, vie: 0.9, taille: 1.2 } : v.element === "glace" ? { e: true, g: -0.4, frein: 0.3, grossit: 1.2, vie: 1.2, taille: 1, o: 0.85 } : { g: -7, frein: 0.7, vie: 1, taille: 0.9, o: 0.8 });
    }
  }, vague * 90);
}
const GEO_COEUR = (() => { const s = new T.Shape(); s.moveTo(0, -0.06); s.bezierCurveTo(0.09, 0, 0.07, 0.08, 0, 0.045); s.bezierCurveTo(-0.07, 0.08, -0.09, 0, 0, -0.06); return new T.ShapeGeometry(s); })();
function coeurs(v) {
  const parent = D.iles[v.element].groupe;
  const c = teteLocale(v);
  for (let i = 0; i < 6; i++) setTimeout(() => {
    const p = c.clone().add(new T.Vector3((Math.random() - 0.5) * 0.5, 0.1, (Math.random() - 0.5) * 0.5));
    particule(parent, p, 0xff6a9a, new T.Vector3((Math.random() - 0.5) * 0.3, 0.7 + Math.random() * 0.3, (Math.random() - 0.5) * 0.3), { geo: GEO_COEUR, e: true, vie: 1.5, taille: 1.6 + Math.random() });
  }, i * 140);
}

// ---------- Événements du monde (lancés depuis le pilotage) ----------
// Séisme : la caméra tremble, les dragons sont secoués, des cailloux sautent.
// Météorites : des rochers en feu tombent du ciel et explosent sur les îles.
// Éclipse : la lumière baisse pendant une vingtaine de secondes.
export function evenement(type, elx) {
  if (!D) return;
  const ile = elx || (D.focus && D.iles[D.focus] ? D.focus : ["feu", "glace", "eau"][Math.floor(Math.random() * 3)]);
  if (type === "seisme") {
    D.secousse = 4.5; D.forceSecousse = 0.35;
    Son.seisme();
    for (const [, v] of D.dragons) if (!v.ko && v.etat !== "vol") { v.etat = "action"; v.minuteur = 3; v.anim.jouer("coup"); setTimeout(() => { if (!v.ko) v.anim.jouer(Math.random() < 0.5 ? "rugir" : "regarder"); }, 900); }
    for (const e of ["feu", "glace", "eau"]) for (const n of D.iles[e].noeuds) if (n.objet.visible && Math.random() < 0.5) setTimeout(() => eclater(n.objet, n.objet.userData.action.noeud, 4, e), Math.random() * 3000);
  } else if (type === "meteorites") {
    const n = 14;
    for (let i = 0; i < n; i++) setTimeout(() => lancerMeteore(ile), i * 380 + Math.random() * 300);
  } else if (type === "eclipse") {
    D.eclipse = 22;
    Son.eclipse();
  }
}
const GEO_METEORE = new T.DodecahedronGeometry(0.45, 0);
function lancerMeteore(elx) {
  const g = D.iles[elx].groupe;
  const a = Math.random() * 6.28, d = Math.sqrt(Math.random()) * rayonBord(elx, a) * 0.85;
  const x = Math.cos(a) * d, z = Math.sin(a) * d;
  const cible = new T.Vector3(x, D.iles[elx].sol(x, z), z);
  const dep = cible.clone().add(new T.Vector3(-14 + Math.random() * 6, 34, -10 + Math.random() * 6));
  const m = new T.Mesh(GEO_METEORE, mat(0x2a1a14, { e: 0xff5a0a, ei: 0.9, r: 0.8, unique: true }));
  m.scale.setScalar(0.7 + Math.random() * 0.8);
  m.position.copy(dep);
  g.add(m);
  D.meteores.push({ m, g, elx, dep, cible, t: 0, duree: 1.6 + Math.random() * 0.5 });
  if (Math.random() < 0.5) Son.sifflement();
}
function majEvenements(dt) {
  // Secousse : petits décalages aléatoires de la caméra
  if (D.secousse > 0) {
    D.secousse -= dt;
    const a = Math.min(1, D.secousse / 1.5) * (D.forceSecousse || 0.3) * Math.min(1.5, D.orbite.dist / 20);
    D.camera.position.x += (Math.random() - 0.5) * a; D.camera.position.y += (Math.random() - 0.5) * a; D.camera.position.z += (Math.random() - 0.5) * a;
  }
  // Éclipse : la lumière baisse puis revient
  const b = D.lumBase;
  const k = D.eclipse > 0 ? Math.max(0.18, 1 - Math.min(1, (22 - D.eclipse) / 2.5, D.eclipse / 2.5) * 0.82) : 1;
  if (D.eclipse > 0) D.eclipse -= dt;
  D.lum.hemi.intensity = b.hemi * k; D.lum.soleil.intensity = b.soleil * k; D.lum.contre.intensity = b.contre * (0.6 + 0.4 * k) * (k < 1 ? 1.6 : 1);
  for (let i = D.meteores.length - 1; i >= 0; i--) {
    const o = D.meteores[i];
    o.t += dt;
    const u = Math.min(1, o.t / o.duree);
    o.m.position.lerpVectors(o.dep, o.cible, u * u);
    o.m.rotation.x += dt * 5; o.m.rotation.y += dt * 3;
    // Traînée de feu
    for (let k2 = 0; k2 < 3; k2++) particule(o.g, o.m.position, [0xfff0a0, 0xffa02a, 0xff4a0a][k2], new T.Vector3((Math.random() - 0.5) * 0.6, 0.4 + Math.random() * 0.4, (Math.random() - 0.5) * 0.6), { e: true, vie: 0.6, grossit: 1.4, taille: 1.6 * o.m.scale.x, frein: 0.4 });
    if (u >= 1) {
      o.g.remove(o.m); o.m.material.dispose(); D.meteores.splice(i, 1);
      impactMeteore(o);
    }
  }
}
function impactMeteore(o) {
  const c = o.cible;
  const eau = dansLEau(o.elx, c.x, c.z);
  for (let i = 0; i < 26; i++) {
    const a = Math.random() * 6.28, f = 1 + Math.random() * 3.5;
    const v = new T.Vector3(Math.cos(a) * f, 2 + Math.random() * 4, Math.sin(a) * f);
    if (eau) particule(o.g, c.clone().setY(NIVEAU_EAU), [0xffffff, 0x9fe8ff, 0x48c8e0][i % 3], v.multiplyScalar(1.2), { g: -9, vie: 1.2, taille: 1.4, o: 0.85 });
    else particule(o.g, c, [0xfff0a0, 0xffa02a, 0xff4a0a, 0x3a2a24][i % 4], v, i % 4 === 3 ? { geo: GEO_ECLAT[1], g: -9, vie: 1.6, taille: 2 } : { e: true, g: 0.5, frein: 0.25, grossit: 2, vie: 0.9, taille: 2.2 });
  }
  if (!eau) {
    // Cratère fumant qui disparaît doucement
    const cr = new T.Mesh(new T.CircleGeometry(0.9 + Math.random() * 0.5, 9), mat(0x120a08, { o: 0.85, unique: true, r: 1 }));
    cr.rotation.x = -Math.PI / 2; cr.position.copy(c).add(new T.Vector3(0, 0.03, 0));
    o.g.add(cr);
    D.eclats.push({ o: cr, v: new T.Vector3(), rot: new T.Vector3(), t: 0, vie: 18, libre: true, g: 0, frein: 1, grossit: 0 });
    for (let i = 0; i < 4; i++) particule(o.g, c, 0x6a625e, new T.Vector3((Math.random() - 0.5) * 0.3, 0.6, (Math.random() - 0.5) * 0.3), { vie: 3, grossit: 0.8, taille: 3, o: 0.5 });
  }
  D.secousse = Math.max(D.secousse, 0.6); D.forceSecousse = 0.25;
  Son.impact("feu", true);
  // Les dragons proches sursautent
  for (const [, v] of D.dragons) if (v.element === o.elx && !v.ko && v.mobile.position.distanceTo(c) < 3 && v.etat !== "vol") { v.etat = "action"; v.minuteur = 2; v.anim.jouer("coup"); }
}

// ---------- Passer d'un dragon à l'autre, liste de tous les dragons ----------
const ORDRE_EL = { feu: 0, glace: 1, eau: 2 };
function dragonsTries() { return [...E().dragons].sort((a, b) => ORDRE_EL[PAR_ID[a.id].element] - ORDRE_EL[PAR_ID[b.id].element] || b.niveau - a.niveau || PAR_ID[a.id].nom.localeCompare(PAR_ID[b.id].nom)); }
function voirDragon(uid) {
  const d = E().dragons.find((x) => x.uid === uid);
  if (!d) return;
  const v = D.dragons.get(uid);
  ficheDragon(d);
  if (v) suivre(v);
}
function voisinDragon(d, sens) {
  const l = dragonsTries();
  if (l.length < 2) return;
  const i = l.findIndex((x) => x.uid === d.uid);
  Son.glisse();
  voirDragon(l[(i + sens + l.length) % l.length].uid);
}
const vueListe = { filtre: "tous", tri: "element", texte: "" };
function ouvrirListe() {
  fermerListe();
  const p = el("section", { class: "liste-dragons panneau", id: "liste-dragons" });
  const corps = el("div", { class: "ld-corps" });
  const champ = el("input", { type: "search", placeholder: "Chercher un dragon…", value: vueListe.texte, oninput: (e) => { vueListe.texte = e.target.value; remplir(); } });
  const filtres = el("div", { class: "ld-filtres" });
  const tris = el("select", { onchange: (e) => { vueListe.tri = e.target.value; remplir(); } });
  for (const [k, n] of [["element", "Par île"], ["niveau", "Par niveau"], ["nom", "Par nom"], ["pv", "PV les plus bas"], ["lien", "Par lien"]]) tris.append(el("option", { value: k, selected: vueListe.tri === k }, n));
  const majFiltres = () => {
    filtres.innerHTML = "";
    for (const [k, n] of [["tous", "Tous"], ["feu", "Feu"], ["glace", "Glace"], ["eau", "Eau"], ["ko", "K.O."], ["alerte", "À faire évoluer"]])
      filtres.append(el("button", { class: `btn petit ${vueListe.filtre === k ? "actif" : ""}`, onclick: () => { vueListe.filtre = k; majFiltres(); remplir(); } }, n));
  };
  const remplir = () => {
    corps.innerHTML = "";
    const t = vueListe.texte.trim().toLowerCase();
    let l = dragonsTries().filter((d) => {
      const s = PAR_ID[d.id];
      if (t && !(s.nom.toLowerCase().includes(t) || (s.titre || "").toLowerCase().includes(t) || ELEMENTS[s.element].nom.toLowerCase().includes(t))) return false;
      if (vueListe.filtre === "ko") return d.pv <= 0;
      if (vueListe.filtre === "alerte") return evolutionBloquee(d) || attendPercee(d);
      return vueListe.filtre === "tous" || s.element === vueListe.filtre;
    });
    if (vueListe.tri === "niveau") l.sort((a, b) => b.niveau - a.niveau);
    else if (vueListe.tri === "nom") l.sort((a, b) => PAR_ID[a.id].nom.localeCompare(PAR_ID[b.id].nom));
    else if (vueListe.tri === "pv") l.sort((a, b) => a.pv / pvMax(a) - b.pv / pvMax(b));
    else if (vueListe.tri === "lien") l.sort((a, b) => (b.lien || 0) - (a.lien || 0));
    if (!l.length) corps.append(el("p", { class: "doux", style: { textAlign: "center" } }, "Aucun dragon ne correspond."));
    for (const d of l) {
      const s = PAR_ID[d.id], v = D.dragons.get(d.uid);
      const humeur = !v ? "" : v.ko ? "K.O." : HUMEURS[v.etat] || "";
      corps.append(el("button", { class: `ld-ligne ${s.element}`, onclick: () => { Son.clic(); fermerListe(); voirDragon(d.uid); } },
        el("span", { class: "ld-pastille" }),
        el("span", { class: "ld-nom" }, el("b", {}, s.nom, d.ul ? el("span", { class: "ld-ul" }, " UL") : null), el("small", {}, `${nomStade(stadeEffectif(d))} · ${humeur}`)),
        el("span", { class: "ld-droite" }, el("span", { class: "num" }, `Nv ${d.niveau}`), barre(d.pv, pvMax(d), "pv"),
          evolutionBloquee(d) || attendPercee(d) ? el("small", { class: "ld-alerte" }, "à faire évoluer") : (d.lien ? el("small", { class: "doux" }, `lien ${d.lien}`) : null))));
    }
  };
  p.append(el("header", {}, el("div", {}, el("div", { class: "etiquette" }, `${E().dragons.length} dragons`), el("h3", {}, "Mes dragons")),
    el("button", { class: "fermer-fiche", "aria-label": "Fermer", onclick: () => fermerListe(), html: icone("fermer").innerHTML })),
    champ, el("div", { class: "ld-outils" }, filtres, tris), corps);
  racineUI.append(p);
  majFiltres(); remplir();
}
function fermerListe() { const l = document.getElementById("liste-dragons"); if (l) l.remove(); }
function flechesFiche(d) {
  const g = el("button", { class: "fleche-fiche g", "aria-label": "Dragon précédent", onclick: () => voisinDragon(d, -1) }, "‹");
  const dr = el("button", { class: "fleche-fiche d", "aria-label": "Dragon suivant", onclick: () => voisinDragon(d, 1) }, "›");
  racineUI.append(g, dr);
  ficheUI._fleches = [g, dr];
  ficheUI.classList.add("avec-fleches");
  placerFleches();
  // Glisser le doigt sur la fiche pour changer de dragon
  let x0 = null, y0 = 0;
  ficheUI.addEventListener("touchstart", (e) => { x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; }, { passive: true });
  ficheUI.addEventListener("touchend", (e) => {
    if (x0 === null) return;
    const dx = e.changedTouches[0].clientX - x0, dy = e.changedTouches[0].clientY - y0;
    x0 = null;
    if (Math.abs(dx) > 70 && Math.abs(dy) < 45) voisinDragon(d, dx < 0 ? 1 : -1);
  }, { passive: true });
}
function placerFleches() {
  if (!ficheUI || !ficheUI._fleches) return;
  const r = ficheUI.getBoundingClientRect();
  for (const f of ficheUI._fleches) f.style.top = Math.round(r.top + Math.min(r.height * 0.5, 120) - 22) + "px";
}

function ficheDragon(d) {
  const src = PAR_ID[d.id];
  const f = nouvelleFiche();
  const e = E();
  const st = stadeEffectif(d), stVoulu = stadeDuNiveau(d.niveau);
  const max = pvMax(d);
  const xpS = xpSuivant(d.niveau);
  const hab = habitatDe(d.id);
  const tous = dragonsTries();
  const rang = tous.findIndex((x) => x.uid === d.uid) + 1;
  const car = caractere(d);
  f.append(
    enTete(src.nom, el("span", { class: "pil " + src.element }, ELEMENTS[src.element].nom), el("span", { class: "pil" }, nomStade(st)), d.ul ? el("span", { class: "pil ul" }, "UL") : null, el("span", { class: "doux" }, src.titre)),
    el("div", { class: "fiche-rang" }, el("button", { class: "btn petit", onclick: () => { Son.clic(); ouvrirListe(); } }, `Mes dragons · ${rang}/${tous.length}`), el("span", { class: "doux" }, `${car.nom} · lien ${d.lien || 0}/100`)),
    el("div", { class: "ligne" }, el("span", { class: "etiquette" }, "PV"), barre(d.pv, max, "pv"), el("span", { class: "num" }, `${d.pv}/${max}`)),
    el("div", { class: "ligne" }, el("span", { class: "etiquette" }, `Nv ${d.niveau}`), barre(d.xp, xpS || 1, "xp"), el("span", { class: "num doux" }, xpS ? `${d.xp}/${xpS} XP` : "max")),
  );
  if (d.pv <= 0) f.append(el("div", { class: "alerte", style: { marginTop: "10px" } }, "K.O. : nourris-le pour qu'il puisse combattre à nouveau."));
  const cleEl = SOURCES[src.element].nourriture;
  if (attendPercee(d)) f.append(el("div", { class: "alerte", style: { marginTop: "10px" } }, `Sa barre d'expérience est pleine. Au-delà du niveau ${NIVEAU_PERCEE}, donne-lui des ${MATERIAUX[cleEl].nom.toLowerCase()} pour qu'il monte de niveau.`));
  f.append(el("div", { class: "bloc" },
    el("div", { class: "etiquette" }, "Repas"),
    el("div", { class: "info" }, `Une ration rend 20 % des PV. ${MATERIAUX[cleEl].nom} : soignent 30 % et donnent 40 XP.`),
    el("div", { class: "actions" },
      el("button", { class: "btn principal petit", disabled: d.pv >= max && maintenant() - d.repas < 12 * 3600e3, onclick: () => {
        let res; changer(() => { res = nourrir(d); });
        if (!res.ok) { Son.erreur(); toast(res.raison, "mal"); return; }
        Son.ok(); toast(`${src.nom} mange : +${res.soin} PV`, "bon");
        synchroniser(); const v2 = D.dragons.get(d.uid); if (v2 && !v2.ko) { montrerRepas(v2, "rations"); suivre(v2); }
        ficheDragon(d); signaler("nourri");
      } }, icone("rations"), `Ration (${e.ressources.rations})`),
      el("button", { class: "btn petit" + ((e.ressources[cleEl] || 0) > 0 ? " principal" : ""), disabled: (e.ressources[cleEl] || 0) < 1, title: MATERIAUX[cleEl].desc, onclick: () => {
        let res; changer(() => { res = nourrirElement(d); });
        if (!res.ok) { Son.erreur(); toast(res.raison, "mal"); return; }
        Son.niveau(); toast(`${src.nom} se régale : +${res.xp} XP${res.niveaux ? ` · niveau ${d.niveau} !` : ""}`, "bon");
        synchroniser(); const v2 = D.dragons.get(d.uid); if (v2 && !v2.ko) { montrerRepas(v2, cleEl); suivre(v2); }
        ficheDragon(d);
      } }, icone(cleEl), `${MATERIAUX[cleEl].nom} (${e.ressources[cleEl] || 0})`),
    )));
  const vv = D.dragons.get(d.uid);
  const inter = [["caresser", "Caresser"], ["jouer", "Jouer"], ["rugir", "Rugir"], ["souffle", NOM_SOUFFLE[src.element]]];
  if (vv && peutVoler(vv)) inter.push(["envol", "S'envoler"]);
  f.append(el("div", { class: "bloc" },
    el("div", { class: "etiquette" }, `Caractère : ${car.nom}`),
    el("div", { class: "info" }, car.desc),
    el("div", { class: "actions" }, ...inter.map(([k, n]) => el("button", { class: "btn petit", onclick: () => interagir(d, k) }, n)))));
  const nidBloc = el("div", { class: "bloc" }, el("div", { class: "etiquette" }, `Nid : ${NIDS[d.nid].nom}`), el("div", { class: "info" }, NIDS[d.nid].desc), el("div", { class: "info" }, `Habitat : ${NOMS_HABITAT[hab]}.`));
  if (evolutionBloquee(d)) nidBloc.append(el("div", { class: "alerte" }, `${src.nom} est prêt à devenir ${nomStade(stVoulu)}, mais son nid est trop petit.`));
  const actionsNid = el("div", { class: "actions" });
  if (d.nid < 3) {
    const rec = recetteNid(d.nid + 1, src.element);
    nidBloc.append(el("div", { style: { fontSize: "12px" } }, `${d.nid === 0 ? "Construire" : "Améliorer en"} : ${NIDS[d.nid + 1].nom}`), recette(rec, e.ressources, energie()));
    actionsNid.append(el("button", { class: "btn petit" + (assez(rec) ? " principal" : ""), disabled: !assez(rec), onclick: () => {
      let ok = false;
      changer(() => { ok = payer(rec); if (ok) { d.nid += 1; noter(`${NIDS[d.nid].nom} construit pour ${src.nom}.`); } });
      if (!ok) return;
      Son.recolte("bois");
      const evol = stadeEffectif(d) > st;
      toast(evol ? `${src.nom} évolue : ${nomStade(stadeEffectif(d))} !` : `${NIDS[d.nid].nom} construit.`, "bon");
      synchroniser(); ficheDragon(d); signaler("nid");
    } }, d.nid === 0 ? "Construire le nid" : "Améliorer le nid"));
  }
  actionsNid.append(el("button", { class: "btn petit", onclick: () => demarrerPlacement(d) }, "Déplacer le nid"));
  nidBloc.append(actionsNid);
  f.append(nidBloc);
  const robe = el("div", { class: "bloc" }, el("div", { class: "etiquette" }, "Robe"));
  if (d.ulPossede) {
    robe.append(el("div", { class: "actions" },
      el("button", { class: "btn petit" + (!d.ul ? " principal" : ""), onclick: () => { changer(() => { d.ul = false; }); synchroniser(); ficheDragon(d); } }, "Normale"),
      el("button", { class: "btn petit" + (d.ul ? " principal" : ""), onclick: () => { changer(() => { d.ul = true; }); Son.evolution(); synchroniser(); ficheDragon(d); } }, "UL (Ultime)")));
  } else {
    robe.append(el("div", { class: "info" }, "La version UL (Ultime) : une robe rare, seule l'apparence change."),
      el("div", { class: "actions" }, el("button", { class: "btn petit", onclick: () => ctxJeu.aller("boutique", { uid: d.uid }) }, icone("boutique"), "Voir la version UL")));
  }
  f.append(robe);
  flechesFiche(d);
}

function ficheSource(elx) {
  const e = E();
  const f = e.sources[elx];
  const src = SOURCES[elx];
  const fiche = nouvelleFiche();
  const nourr = MATERIAUX[src.nourriture];
  fiche.append(enTete(src.noms[f.niveau], el("span", { class: "pil " + elx }, "Île " + nomIle(elx)), el("span", { class: "pil" }, f.niveau ? `Niveau ${f.niveau}/3` : "Endormie")));
  fiche.append(el("p", { class: "info", style: { margin: "10px 0 0" } }, `${nourr.nom} : ${nourr.desc}`));
  if (f.niveau > 0) {
    const prod = PRODUCTION_SOURCE[f.niveau];
    const n = Math.floor(f.stock);
    fiche.append(el("div", { class: "bloc" },
      el("div", { class: "info" }, `Produit ${prod.parHeure} ${nourr.nom.toLowerCase()} par heure, jusqu'à ${prod.max}.`),
      el("div", { class: "ligne" }, el("span", { class: "etiquette" }, "Stock"), barre(f.stock, prod.max), el("span", { class: "num" }, `${n}/${prod.max}`)),
      el("div", { class: "actions" }, el("button", { class: "btn principal petit", disabled: n < 1, onclick: () => { let k = 0; changer(() => { k = recolterSource(elx); }); Son.recolte("cristal"); toast(`+${k} ${nourr.nom.toLowerCase()}`, "bon"); ficheSource(elx); } }, icone(src.nourriture), "Récolter"))));
  }
  if (f.niveau < 3) {
    const manque = manqueSource(elx);
    const cond = f.niveau === 0
      ? `Pour la réveiller : ${PAR_ID[src.cle].nom}, le ${src.nomCle}, et un autre dragon de l'élément doivent s'y rendre ensemble.`
      : `Pour la faire grandir : ${CONDITIONS_SOURCE[f.niveau + 1].nombre} dragons différents de l'élément au niveau ${CONDITIONS_SOURCE[f.niveau + 1].niveau}.`;
    fiche.append(el("div", { class: "bloc" }, el("div", { class: "etiquette" }, f.niveau === 0 ? "Réveil" : "Niveau suivant"), el("div", { class: "info" }, cond),
      manque ? el("div", { class: "alerte" }, manque) : null,
      el("div", { class: "actions" }, el("button", { class: "btn petit" + (manque ? "" : " principal"), disabled: !!manque || !!D.rituel, onclick: () => {
        let ok = false; changer(() => { ok = depenserEnergie(5); });
        if (!ok) { toast("Il faut 5 d'énergie.", "mal"); return; }
        fermerFiche(); lancerRituel(elx);
      } }, f.niveau === 0 ? src.verbe : "Faire grandir la source", " (5 ", icone("energie"), ")"))));
  }
}

export function rafraichir() { if (D) synchroniser(); }
