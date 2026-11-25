// Boutique : packs de démarrage, braises d'éclosion, armures (3 par dragon), œufs, recharge d'énergie. Pendant la bêta, tout est simulé et gratuit.
import { construireDragon } from "./modele.js";
import { Animateur } from "./anim.js";
import { ciel, eclairage, Orbite, socle } from "./scene.js";
import { E, changer } from "./etat.js";
import { PAR_ID, ELEMENTS, armuresDe, ENERGIE_MAX, COUVOIR } from "./regles.js";
import { el, styles, toast, modale, icone } from "./ui.js";
import { Son, Musique } from "./son.js";

const T = window.THREE;
let D = null, ctxJeu = null, ui = null;
const vue = { uid: null, armure: "cuirasse" };

styles("boutique", `
.bq-panneau { position: fixed; z-index: 15; right: var(--bord-d); top: calc(var(--hud) + 8px); bottom: calc(var(--bas) + 84px); width: min(430px, 40vw); padding: 16px; overflow: auto; display: grid; gap: 12px; align-content: start; }
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
.bq-ruban { justify-self: start; font-size: 10px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; color: #1a1208; background: var(--ambre); border-radius: 6px; padding: 1px 6px; }
@media (max-width: 760px) { .bq-panneau { left: var(--bord-g); right: var(--bord-d); width: auto; top: 50vh; bottom: calc(var(--bas) + 78px); } }
`);

function construireVitrine() {
  const scene = new T.Scene();
  scene.add(ciel(0x1a1410, 0x3a2c20, 0x100c08));
  eclairage(scene, { ciel: 0xffe0c0, sol: 0x2a1a10, hemi: 0.8, soleil: 0xfff0d8, force: 1.6, zoneOmbre: 4, x: 3, y: 6, z: 4, carte: 2048 });
  scene.add(socle(2.4, 0x3a2c22, 0xf2b544));
  const camera = new T.PerspectiveCamera(38, 1, 0.05, 200);
  const orbite = new Orbite(camera, document.getElementById("scene3d"));
  const support = new T.Group(); scene.add(support);
  D = { scene, camera, orbite, support, anim: null, cle: null, update(dt) { orbite.update(dt); support.rotation.y += dt * 0.3; if (D.anim) D.anim.update(dt); } };
}

function montrer(d, armure) {
  const cle = `${d.id}|${armure}`;
  if (cle === D.cle) return;
  D.cle = cle;
  while (D.support.children.length) D.support.remove(D.support.children[0]);
  const st = Math.max(2, Math.min(4, d.stadeVue ?? 3));
  const rig = construireDragon(d.id, st, { armure });
  D.support.add(rig.racine);
  D.anim = new Animateur(rig); D.anim.jouer("joie");
  const h = rig.taille.y, l = Math.max(rig.taille.x, rig.taille.z);
  const etroit = window.innerWidth / window.innerHeight < 0.8 ? 1.9 : 1;
  D.orbite.viser(new T.Vector3(0, h * 0.45, 0), Math.max(2.4, Math.max(h * 1.4, l) * 1.5) * etroit, 0.7, 1.2);
}

export function ouvrir(ctx, params = {}) {
  ctxJeu = ctx;
  if (!D) construireVitrine();
  ui = document.getElementById("ecran");
  Musique.jouer("livre");
  const e = E();
  if (params.uid) vue.uid = params.uid;
  if (!vue.uid || !e.dragons.some((d) => d.uid === vue.uid)) vue.uid = e.dragons[0] ? e.dragons[0].uid : null;
  rendre();
}
export function fermer() { ctxJeu.moteur.definirZone(null); }

// Packs : plusieurs œufs (à choisir au couvoir), des braises pour les faire éclore vite, et de quoi démarrer.
const PACKS = [
  {
    id: "apprenti", nom: "Pack de l'apprenti", prix: "4,99 €", unique: true, ruban: "Une seule fois",
    contenu: [["oeuf", "3 œufs"], ["braises", "8 braises"], ["rations", "30 rations"], ["energie", "Énergie pleine"]],
    texte: "Le coup de pouce du début : trois dragons de plus, et de quoi les faire éclore tout de suite.",
    donner: (s) => { s.oeufs.choix += 3; s.ressources.braises = (s.ressources.braises || 0) + 8; s.ressources.rations += 30; s.energie.val = ENERGIE_MAX; },
  },
  {
    id: "maitre", nom: "Pack du maître des œufs", prix: "9,99 €", vedette: true, ruban: "Le plus choisi",
    contenu: [["oeuf", "6 œufs"], ["braises", "20 braises"], ["rations", "60 rations"], ["obsidienne", "20"], ["givrite", "20"], ["corail", "20"]],
    texte: "Six œufs et assez de braises pour en faire éclore cinq aussitôt. Les matériaux aident à bâtir les nids.",
    donner: (s) => { s.oeufs.choix += 6; s.ressources.braises = (s.ressources.braises || 0) + 20; s.ressources.rations += 60; s.ressources.obsidienne += 20; s.ressources.givrite += 20; s.ressources.corail += 20; },
  },
  {
    id: "seigneur", nom: "Pack du seigneur des dragons", prix: "19,99 €",
    contenu: [["oeuf", "12 œufs"], ["braises", "48 braises"], ["coeurs", "3 cœurs de dragon"], ["rations", "120 rations"], ["obsidienne", "50"], ["givrite", "50"], ["corail", "50"], ["energie", "Énergie pleine"]],
    texte: "Pour remplir le Livre vite : douze œufs, tous accélérables, et trois cœurs pour un nid unique.",
    donner: (s) => { s.oeufs.choix += 12; s.ressources.braises = (s.ressources.braises || 0) + 48; s.ressources.coeurs += 3; s.ressources.rations += 120; s.ressources.obsidienne += 50; s.ressources.givrite += 50; s.ressources.corail += 50; s.energie.val = ENERGIE_MAX; },
  },
];

function acheter(texte, fn) {
  modale({
    titre: "Achat simulé",
    contenu: el("div", {}, el("p", {}, texte), el("p", { class: "doux" }, "Pendant la bêta, aucun paiement n'est demandé : l'objet est offert pour tester. Dans le vrai jeu, le paiement passera par la boutique Google Play ou App Store.")),
    boutons: [{ texte: "Annuler" }, { texte: "Obtenir (bêta)", classe: "principal", action: () => { changer(fn); Son.achat(); toast("Obtenu !", "bon"); rendre(); } }],
  });
}

function rendre() {
  ui.innerHTML = "";
  const e = E();
  const large = window.innerWidth > 760;
  ctxJeu.moteur.montrer(D, large ? { x: 0, y: 0, l: 1 - Math.min(450, window.innerWidth * 0.42) / window.innerWidth, h: 1 } : { x: 0, y: 0.08, l: 1, h: 0.42 });
  const p = el("section", { class: "bq-panneau panneau" });
  p.append(el("div", {}, el("div", { class: "etiquette" }, "Marché des dragonniers"), el("h2", {}, "Boutique")));
  p.append(el("div", { class: "bq-note" }, "Bêta : les achats sont simulés et gratuits. Aucun moyen de paiement n'est demandé."));
  // Packs de démarrage
  p.append(el("div", { class: "etiquette" }, "Packs de démarrage"));
  for (const pk of PACKS) {
    const deja = pk.unique && e.achats && e.achats[pk.id];
    p.append(el("div", { class: `article pack ${pk.vedette ? "vedette" : ""} ${deja ? "deja" : ""}`, role: "button", tabindex: 0, onclick: () => { if (deja) return; acheter(`${pk.nom} (${pk.prix}) : ${pk.contenu.map((c) => c[1]).join(", ")}.`, (s) => { pk.donner(s); s.achats = s.achats || {}; s.achats[pk.id] = (s.achats[pk.id] || 0) + 1; }); } },
      pk.ruban ? el("span", { class: "bq-ruban" }, pk.ruban) : null, pk.ruban ? el("span") : null,
      el("b", {}, pk.nom), el("span", { class: "prix" }, deja ? "déjà acheté" : pk.prix),
      el("div", { class: "contenu" }, pk.contenu.map(([ic, t]) => el("span", {}, icone(ic), t))),
      el("small", {}, pk.texte)));
  }
  // Accélérer l'éclosion
  p.append(el("div", { class: "etiquette", style: { marginTop: "8px" } }, "Accélérer l'éclosion"));
  p.append(el("div", { class: "bq-note", style: { background: "rgba(255,138,60,.08)", borderColor: "rgba(255,138,60,.35)", color: "#ffd2b0" } },
    `Une braise fait avancer un œuf du couvoir d'un quart (environ ${Math.round(COUVOIR[0].pas / 4)} pas ou ${Math.round(COUVOIR[0].heures * 60 / 4)} minutes). 4 braises = éclosion immédiate. Tu en as ${e.ressources.braises || 0}.`));
  for (const [n, prix, txt] of [[5, "0,99 €", "De quoi faire éclore un œuf tout de suite."], [30, "4,99 €", "Le meilleur prix : 7 œufs et demi accélérés."], [80, "9,99 €", "Pour les collectionneurs pressés."]]) {
    p.append(el("div", { class: "article", role: "button", tabindex: 0, onclick: () => acheter(`${n} braises d'éclosion (${prix}).`, (s) => { s.ressources.braises = (s.ressources.braises || 0) + n; }) },
      el("b", {}, el("span", { style: { display: "inline-flex", alignItems: "center", gap: "6px" } }, icone("braises"), `${n} braises d'éclosion`)), el("span", { class: "prix" }, prix), el("small", {}, txt)));
  }
  const d = e.dragons.find((x) => x.uid === vue.uid);
  if (d) {
    const src = PAR_ID[d.id];
    montrer(d, vue.armure);
    const choix = el("div", { class: "bq-dragons" });
    for (const x of e.dragons) choix.append(el("button", { class: `${PAR_ID[x.id].element} ${x.uid === vue.uid ? "actif" : ""}`, onclick: () => { vue.uid = x.uid; rendre(); } }, PAR_ID[x.id].nom));
    p.append(el("div", { class: "etiquette" }, "Armures pour"), choix);
    for (const a of armuresDe(d.id)) {
      const a_deja = d.armures.includes(a.id);
      p.append(el("div", { class: "article" + (vue.armure === a.id ? " actif" : ""), role: "button", tabindex: 0, onclick: () => { vue.armure = a.id; Son.clic(); rendre(); } },
        el("b", {}, a.nomComplet), el("span", { class: "prix" }, a_deja ? "possédée" : a.prix),
        el("small", {}, `Surtout pour le style. Petit bonus : ${a.texte}.`)));
    }
    const a = armuresDe(d.id).find((x) => x.id === vue.armure);
    const deja = d.armures.includes(vue.armure);
    p.append(el("div", { style: { display: "flex", gap: "8px", flexWrap: "wrap" } },
      deja
        ? el("button", { class: "btn principal", onclick: () => { changer(() => { d.armure = vue.armure; }); Son.achat(); toast(`${src.nom} porte ${a.nomComplet}.`, "bon"); } }, "Équiper")
        : el("button", { class: "btn principal", onclick: () => acheter(`${a.nomComplet} pour ${src.nom} (${a.prix}).`, () => { d.armures.push(a.id); d.armure = a.id; }) }, `Acheter ${a.prix}`),
    ));
  } else p.append(el("p", { class: "doux" }, "Fais éclore un dragon pour lui acheter des armures."));
  p.append(el("div", { class: "etiquette", style: { marginTop: "8px" } }, "Autres articles"));
  p.append(el("div", { class: "article", role: "button", tabindex: 0, onclick: () => acheter("Un œuf à choisir parmi les trois (1,99 €).", (s) => { s.oeufs.choix += 1; }) }, el("b", {}, "Un œuf"), el("span", { class: "prix" }, "1,99 €"), el("small", {}, "En quantité limitée dans le vrai jeu.")));
  p.append(el("div", { class: "article", role: "button", tabindex: 0, onclick: () => acheter("Recharge complète de l'énergie (0,99 €).", (s) => { s.energie.val = ENERGIE_MAX; }) }, el("b", {}, "Recharge d'énergie"), el("span", { class: "prix" }, "0,99 €"), el("small", {}, "Remet l'énergie à 100.")));
  ui.append(p);
}
