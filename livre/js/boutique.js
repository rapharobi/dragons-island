// Boutique : on achète des gemmes (de 1 € à 100 €, paiement simulé pendant la bêta), puis tout le reste en gemmes :
// packs de démarrage, braises d'éclosion, ressources, œufs, énergie, armures.
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
.bq-ruban { justify-self: start; font-size: 10px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; color: #1a1208; background: var(--ambre); border-radius: 6px; padding: 1px 6px; }
@media (max-width: 420px) { .bq-gemmes { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
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

// Gemmes : la seule chose qui se paie en euros (simulé pendant la bêta)
const GEMMES = [
  { n: 100, prix: "1 €" },
  { n: 550, prix: "5 €", bonus: "+10 %" },
  { n: 1200, prix: "10 €", bonus: "+20 %" },
  { n: 2500, prix: "20 €", bonus: "+25 %" },
  { n: 6500, prix: "50 €", bonus: "+30 %" },
  { n: 14000, prix: "100 €", bonus: "+40 %" },
];
const PRIX_ARMURE = 500;
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

// Achat de gemmes : paiement simulé pendant la bêta
function acheterGemmes(g) {
  modale({
    titre: `${nb(g.n)} gemmes`,
    contenu: el("div", {}, el("p", {}, `${nb(g.n)} gemmes pour ${g.prix}.`), el("p", { class: "doux" }, "Bêta : le paiement est simulé, rien n'est débité. Dans le vrai jeu, il passera par Google Play ou l'App Store.")),
    boutons: [{ texte: "Annuler" }, { texte: `Payer ${g.prix} (simulé)`, classe: "principal", action: () => { changer((s) => { s.ressources.gemmes = (s.ressources.gemmes || 0) + g.n; }); Son.achat(); toast(`+${nb(g.n)} gemmes`, "bon"); ctxJeu.majHud(); rendre(); } }],
  });
}
// Achat en gemmes : vérifie le solde, demande confirmation, débite puis donne
function payer(prix, nom, donner) {
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
      if (ok) { Son.achat(); toast(`${nom} : c'est à toi !`, "bon"); }
      ctxJeu.majHud(); rendre();
    } }],
  });
}
function montrerGemmes() {
  const b = document.getElementById("bq-gemmes"), p = document.querySelector(".bq-panneau");
  if (b && p) p.scrollTo({ top: Math.max(0, b.offsetTop - 70), behavior: "smooth" });
}

function article({ nom, ic, prix, texte, onclick, classe = "", ruban = null, contenu = null, deja = null }) {
  return el("div", { class: `article ${classe} ${deja ? "deja" : ""}`, role: "button", tabindex: 0, onclick: () => { if (!deja) onclick(); } },
    ruban ? el("span", { class: "bq-ruban" }, ruban) : null, ruban ? el("span") : null,
    el("b", {}, ic ? el("span", { style: { display: "inline-flex", alignItems: "center", gap: "6px" } }, icone(ic), nom) : nom),
    deja ? el("span", { class: "prix" }, deja) : prixG(prix),
    contenu ? el("div", { class: "contenu" }, contenu.map(([i, t]) => el("span", {}, icone(i), t))) : null,
    texte ? el("small", {}, texte) : null);
}

function rendre() {
  const ancien = document.querySelector(".bq-panneau");
  const defile = ancien ? ancien.scrollTop : 0;
  ui.innerHTML = "";
  const e = E();
  const large = window.innerWidth > 760;
  ctxJeu.moteur.montrer(D, large ? { x: 0, y: 0, l: 1 - Math.min(450, window.innerWidth * 0.42) / window.innerWidth, h: 1 } : { x: 0, y: 0.08, l: 1, h: 0.42 });
  const p = el("section", { class: "bq-panneau panneau" });
  p.append(el("div", {}, el("div", { class: "etiquette" }, "Marché des dragonniers"), el("h2", {}, "Boutique")));
  // Solde
  p.append(el("div", { class: "bq-solde" }, el("span", { class: "doux" }, "Tes gemmes"), el("b", {}, icone("gemmes"), nb(e.ressources.gemmes || 0))));
  // Gemmes
  p.append(el("div", { class: "etiquette", id: "bq-gemmes" }, "Acheter des gemmes"));
  p.append(el("div", { class: "bq-gemmes" }, GEMMES.map((g) => el("button", { onclick: () => acheterGemmes(g) }, g.bonus ? el("i", {}, g.bonus) : null, icone("gemmes"), el("b", {}, nb(g.n)), el("span", {}, g.prix)))));
  p.append(el("div", { class: "bq-note" }, "Bêta : l'achat de gemmes est simulé, aucun paiement n'est demandé. Tout le reste de la boutique se paie en gemmes."));
  // Packs de démarrage
  p.append(el("div", { class: "etiquette", style: { marginTop: "8px" } }, "Packs de démarrage"));
  for (const pk of PACKS) {
    const deja = pk.unique && e.achats && e.achats[pk.id] ? "déjà acheté" : null;
    p.append(article({ nom: pk.nom, prix: pk.prix, texte: pk.texte, contenu: pk.contenu, ruban: pk.ruban, classe: `pack ${pk.vedette ? "vedette" : ""}`, deja,
      onclick: () => payer(pk.prix, pk.nom, (s) => { pk.donner(s); s.achats = s.achats || {}; s.achats[pk.id] = (s.achats[pk.id] || 0) + 1; }) }));
  }
  // Accélérer l'éclosion
  p.append(el("div", { class: "etiquette", style: { marginTop: "8px" } }, "Accélérer l'éclosion"));
  p.append(el("div", { class: "bq-note", style: { background: "rgba(255,138,60,.08)", borderColor: "rgba(255,138,60,.35)", color: "#ffd2b0" } },
    `Une braise fait avancer un œuf du couvoir d'un quart (environ ${Math.round(COUVOIR[0].heures * 60 / 4)} minutes). 4 braises = éclosion immédiate. Tu en as ${e.ressources.braises || 0}.`));
  for (const [n, prix, txt] of BRAISES) p.append(article({ nom: `${n} braises d'éclosion`, ic: "braises", prix, texte: txt, onclick: () => payer(prix, `${n} braises d'éclosion`, (s) => { s.ressources.braises = (s.ressources.braises || 0) + n; }) }));
  // Ressources
  p.append(el("div", { class: "etiquette", style: { marginTop: "8px" } }, "Ressources et énergie"));
  for (const r of RESSOURCES) p.append(article({ nom: r.nom, ic: r.ic, prix: r.prix, texte: r.texte, onclick: () => payer(r.prix, r.nom, r.donner) }));
  // Armures
  const d = e.dragons.find((x) => x.uid === vue.uid);
  p.append(el("div", { class: "etiquette", style: { marginTop: "8px" } }, "Armures"));
  if (d) {
    const src = PAR_ID[d.id];
    montrer(d, vue.armure);
    const choix = el("div", { class: "bq-dragons" });
    for (const x of e.dragons) choix.append(el("button", { class: `${PAR_ID[x.id].element} ${x.uid === vue.uid ? "actif" : ""}`, onclick: () => { vue.uid = x.uid; rendre(); } }, PAR_ID[x.id].nom));
    p.append(choix);
    for (const a of armuresDe(d.id)) {
      const a_deja = d.armures.includes(a.id);
      p.append(el("div", { class: "article" + (vue.armure === a.id ? " actif" : ""), role: "button", tabindex: 0, onclick: () => { vue.armure = a.id; Son.clic(); rendre(); } },
        el("b", {}, a.nomComplet), a_deja ? el("span", { class: "prix" }, "possédée") : prixG(PRIX_ARMURE),
        el("small", {}, `Surtout pour le style. Petit bonus : ${a.texte}.`)));
    }
    const a = armuresDe(d.id).find((x) => x.id === vue.armure);
    const deja = d.armures.includes(vue.armure);
    p.append(el("div", { style: { display: "flex", gap: "8px", flexWrap: "wrap" } },
      deja
        ? el("button", { class: "btn principal", onclick: () => { changer(() => { d.armure = vue.armure; }); Son.achat(); toast(`${src.nom} porte ${a.nomComplet}.`, "bon"); } }, "Équiper")
        : el("button", { class: "btn principal", onclick: () => payer(PRIX_ARMURE, `${a.nomComplet} pour ${src.nom}`, () => { d.armures.push(a.id); d.armure = a.id; }) }, icone("gemmes"), `Acheter · ${nb(PRIX_ARMURE)} gemmes`),
    ));
  } else p.append(el("p", { class: "doux" }, "Fais éclore un dragon pour lui acheter des armures."));
  ui.append(p);
  p.scrollTop = defile;
}
