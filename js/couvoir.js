// Le couvoir : choisir ses œufs, les faire éclore avec le temps (ou des braises), voir le minuteur.
import { construireDragon } from "./modele.js";
import { Animateur } from "./anim.js";
import { ciel, eclairage, Orbite } from "./scene.js";
import { construireCouvoir, construireOeuf } from "./monde.js";
import { mat, mesh, bloc } from "./outils3d.js";
import { E, changer, choisirOeuf, avancement, tempsRestant, eclore, defCouvoir, maintenant, elementComplet, nouveauDragon, demarrerMinuteur, payer, assez, energie, noter, livreComplet, chaufferOeuf, braisesPourFinir } from "./etat.js";
import { PAR_ID, ELEMENTS, COUVOIR, RECETTE_COUVOIR, attenteOeuf, fmtDuree, STADES } from "./regles.js";
import { el, styles, toast, modale, barre, recette, icone } from "./ui.js";
import { signaler, apresPremierOeuf, enApprentissage, MENTOR } from "./tuto.js";
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
.choix-oeufs button:hover { background: color-mix(in srgb, var(--el) 26%, var(--panneau-plein)); }
.choix-oeufs b { font-family: var(--titre); font-size: 18px; color: var(--el); }
.choix-oeufs small { color: var(--doux); font-size: 11px; }
.titre-intro { position: fixed; z-index: 16; top: calc(var(--hud) + var(--tuto, 0px) + 20px); left: 0; right: 0; text-align: center; padding: 0 var(--bord-d) 0 var(--bord-g); pointer-events: none; }
.titre-intro h2 { font-size: clamp(26px, 5vw, 44px); }
.titre-intro p { color: var(--doux); margin: 6px auto 0; max-width: 46ch; }
@media (max-width: 560px) { .couv-panneau { left: var(--bord-g); right: var(--bord-d); width: auto; top: auto; bottom: calc(var(--bas) + 78px); max-height: 46vh; } .choix-oeufs { flex-direction: column; bottom: calc(var(--bas) + 80px); } .choix-oeufs button { padding: 9px 12px; } }
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
  orbite.min = 3; orbite.max = 14;
  orbite.viser(new T.Vector3(0, 0.9, 0), 6.5, 0.0, 1.2);
  const zone = new T.Group(); scene.add(zone);
  D = {
    scene, camera, orbite, zone, lucioles, t: 0, oeufsChoix: [], couvoir: null, nouveau: null, eclats: [],
    update(dt) {
      D.t += dt;
      orbite.update(dt);
      for (const l of lucioles) { const u = l.userData; u.a += u.v * dt; l.position.set(Math.cos(u.a) * u.r, u.h + Math.sin(D.t * 1.3 + u.a) * 0.3, Math.sin(u.a) * u.r); }
      for (const o of D.oeufsChoix) { o.rotation.y += dt * 0.5; o.position.y = Math.sin(D.t * 2 + o.position.x) * 0.06 + 0.5; }
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
  D.oeufsChoix = []; D.couvoir = null; D.nouveau = null;
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

function afficherChoix(starters) {
  viderZone();
  ["feu", "glace", "eau"].forEach((elx, i) => {
    const o = construireOeuf(elx, 1.1);
    o.position.set((i - 1) * 1.9, 0.5, 0.6);
    const socle = mesh(new T.CylinderGeometry(0.55, 0.65, 0.5, 8).translate(0, 0.25, 0), mat(0x5a5048, { r: 1 }));
    socle.position.set((i - 1) * 1.9, 0, 0.6);
    const lum = new T.PointLight(ELEMENTS[elx].couleur, 1.4, 3, 2); lum.position.set((i - 1) * 1.9, 1.6, 1.2);
    D.zone.add(o, socle, lum);
    o.userData.element = elx;
    D.oeufsChoix.push(o);
  });
  D.orbite.viser(new T.Vector3(0, 1.0, 0.6), 7.0, 0, 1.25);
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
  const etape = setInterval(() => {
    t += 0.05;
    o.rotation.z = Math.sin(t * 30) * 0.08 * Math.min(1, t);
    o.userData.coque.material.emissiveIntensity = 0.1 + t * 0.3;
    lum.intensity = t * 1.5;
    if (Math.abs(t - 0.6) < 0.026 || Math.abs(t - 1.2) < 0.026 || Math.abs(t - 1.7) < 0.026) {
      Son.craque();
      const f = mesh(new T.BoxGeometry(0.03, 0.35, 0.02), mat(0xffffff, { e: ELEMENTS[element].couleur, ei: 2 }), false);
      f.position.set((Math.random() - 0.5) * 0.4, 0.9 + Math.random() * 0.4, 0.43); f.rotation.z = Math.random() - 0.5; D.zone.add(f); fissures.push(f);
    }
    if (t >= 2.1) {
      clearInterval(etape);
      Son.eclosion();
      D.zone.remove(o); fissures.forEach((f) => D.zone.remove(f));
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
      setTimeout(() => { Son.crier(element, 0); anim.jouer("rugir"); }, 700);
      setTimeout(() => apres && apres(), 1500);
      lum.intensity = 3;
    }
  }, 50);
}

// ---------- Écran ----------
export function ouvrir(ctx, params = {}) {
  ctxJeu = ctx;
  if (!D) construireDecor();
  intro = !!params.intro || E().intro;
  if (params.celebrer) { ctx.moteur.montrer(D, null); Musique.jouer("couvoir"); ui = document.getElementById("ecran"); ui.innerHTML = ""; ctx.cacherInterface(true); celebrer(params.celebrer, params.apres); return; }
  ctx.moteur.montrer(D, window.innerWidth > 560 ? { x: 0.32, y: 0, l: 0.68, h: 1 } : { x: 0, y: 0, l: 1, h: 0.5 });
  Musique.jouer("couvoir");
  ui = document.getElementById("ecran");
  if (intro) { ctx.cacherInterface(true); ctx.moteur.definirZone(null); ecranIntro(); }
  else { mode = E().oeufs.choix > 0 && params.choisir ? "choix" : "couvoir"; rendre(); }
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

function ecranIntro() {
  ui.innerHTML = "";
  afficherChoix(true);
  ui.append(el("div", { class: "titre-intro" }, el("h2", {}, "Choisis ton premier œuf"), el("p", {}, "Chaque œuf cache un dragon d'un élément. Le Feu bat la Glace, la Glace bat l'Eau, l'Eau bat le Feu.")));
  const starters = { feu: "braisil", glace: "givrelin", eau: "ondin" };
  const z = el("div", { class: "choix-oeufs" });
  for (const elx of ["feu", "glace", "eau"]) {
    z.append(el("button", { class: elx, onclick: () => {
      Son.ok();
      z.remove(); ui.querySelector(".titre-intro")?.remove();
      animerEclosion(elx, starters[elx], false, () => {
        const tuto = enApprentissage();
        changer((e) => {
          const d = nouveauDragon(starters[elx]);
          e.intro = false;
          if (tuto) apresPremierOeuf(e, d);
          else { e.ressources.brindilles += 15; demarrerMinuteur(); }
          noter(`${PAR_ID[d.id].nom} est né.`);
        });
        const src = PAR_ID[starters[elx]];
        modale({
          titre: `${src.nom} est né !`,
          contenu: el("div", {},
            el("p", {}, `${src.titre}. ${src.histoire}`),
            tuto
              ? el("p", { class: "doux" }, `${MENTOR} : « Ton premier dragon ! Il vit sur l'île ${elx === "eau" ? "d'Eau" : elx === "feu" ? "de Feu" : "de Glace"}. Allons le voir, je vais t'apprendre à t'en occuper. »`)
              : el("p", { class: "doux" }, "Il lui faut un nid pour grandir. Sur son île, touche-le puis « Construire le nid ». Le prochain œuf arrive dans 1 heure."),
          ),
          boutons: [{ texte: "Aller sur son île", classe: "principal", action: () => { ctxJeu.cacherInterface(false); intro = false; ctxJeu.aller("iles"); } }],
          fermable: false,
        });
      });
    } }, el("b", {}, ELEMENTS[elx].nom), el("span", {}, PAR_ID[starters[elx]].nom), el("small", {}, `Bat ${ELEMENTS[ELEMENTS[elx].bat[0]].nom}`)));
  }
  ui.append(z);
}

let blocProgression = null;
function rendre() {
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
    el("div", { class: "ligne" }, el("span", {}, "Prochain œuf"), el("b", { class: "num", id: "couv-minuteur" }, mi.prochain ? fmtDuree(mi.prochain - maintenant()) : "—")),
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
    el("a", { class: "doux", style: { fontSize: "12px" }, href: window.DRAGONS_SITE ? "livre/" : "https://claude.ai/artifact/LvMeuxAvSM8wsMbph4SgZM", target: "_blank", rel: "noopener" }, "Ouvrir le Livre des dragons"));
  if (livreComplet() && !e.livre.ulChoisi) coll.append(el("button", { class: "btn principal petit", onclick: () => {
    const liste = el("div", { style: { display: "grid", gap: "6px" } });
    for (const d of e.dragons) liste.append(el("button", { class: "btn", onclick: () => { changer((s) => { const x = s.dragons.find((y) => y.uid === d.uid); x.ul = true; s.livre.ulDebloque = true; s.livre.ulChoisi = d.id; }); Son.evolution(); toast(`${PAR_ID[d.id].nom} devient UL !`, "bon"); modale({ titre: "Version UL", contenu: "Sa nouvelle robe t'attend sur son île." }); rendre(); return false; } }, `${PAR_ID[d.id].nom} · Nv ${d.niveau}`));
    modale({ titre: "Choisis ton dragon UL", contenu: el("div", {}, el("p", { class: "doux" }, "Tu as complété le Livre ! Un de tes dragons reçoit une robe Ultime, rare. Seule l'apparence change."), liste), boutons: [{ texte: "Plus tard" }] });
  } }, "Choisir mon dragon UL"));
  p.append(coll);
  // Amélioration
  if (e.oeufs.couvoir.niveau === 0) {
    p.append(el("div", { class: "carte" },
      el("b", {}, "Grand couvoir"),
      el("div", { class: "doux", style: { fontSize: "12px" } }, `2 œufs en même temps, qui éclosent ensemble après ${COUVOIR[1].heures} h (au lieu de ${COUVOIR[0].heures} h pour un seul).`),
      recette(RECETTE_COUVOIR, e.ressources, energie()),
      el("button", { class: "btn" + (assez(RECETTE_COUVOIR) ? " principal" : ""), disabled: !assez(RECETTE_COUVOIR), onclick: () => {
        let ok = false;
        changer((s) => { ok = payer(RECETTE_COUVOIR); if (ok) { s.oeufs.couvoir.niveau = 1; for (const sl of s.oeufs.couvoir.slots) { sl.debut = maintenant(); } } });
        if (ok) { Son.ok(); toast("Grand couvoir construit : 2 places !", "bon"); rendre(); }
      } }, "Améliorer le couvoir"),
    ));
  }
  ui.append(p);
}

function majProgression() {
  const e = E();
  const m = document.getElementById("couv-minuteur");
  if (m) { const mi = e.oeufs.minuteur; m.textContent = mi.prochain ? fmtDuree(mi.prochain - maintenant()) : "—"; }
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
    if (D.couvoir && D.couvoir.userData.oeufs[i]) { D.couvoir.userData.oeufs[i].userData.av = av; D.couvoir.userData.oeufs[i].userData.pret = pret; }
  });
  if (unPret) b.append(el("button", { class: "btn principal", onclick: () => faireEclore() }, def.places > 1 ? "Faire éclore les œufs prêts" : "Faire éclore"));
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
    if (k >= res.length) { ctxJeu.cacherInterface(false); rendre(); signaler("eclosion"); return; }
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
    z.append(el("button", { class: elx, onclick: () => {
      Son.ok();
      changer(() => choisirOeuf(elx));
      toast(`Œuf ${elx === "eau" ? "d'" : "de "}${ELEMENTS[elx].nom} ajouté au couvoir.`, "bon");
      mode = E().oeufs.choix > 0 ? "choix" : "couvoir";
      rendre();
    } }, el("b", {}, ELEMENTS[elx].nom), el("small", {}, complet ? "Tu les as déjà tous : ce sera un double au hasard." : `${7 - E().dragons.filter((d) => PAR_ID[d.id].element === elx && true).map((d) => d.id).filter((v, i, a) => a.indexOf(v) === i).length} dragon(s) encore à découvrir`)));
  }
  z.append(el("button", { style: { "--el": "var(--doux)", flex: "0 0 auto" }, onclick: () => { mode = "couvoir"; rendre(); } }, el("b", {}, "Plus tard")));
  ui.append(z);
}
