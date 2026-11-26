// Tutoriel : l'histoire des mages et la prise en main (10 à 15 minutes).
// Objectif : un dragon de chaque élément, tous au niveau 3, un premier duel contre un mage, puis le choix d'un 4e dragon.
import { E, changer, nouveauDragon, gagnerXp, demarrerMinuteur, remplirCouvoir, noter, fixerNiveau, soignerTout } from "./etat.js";
import { PAR_ID, ELEMENTS, DRAGONS, pvMax, xpSuivant } from "./regles.js";
import { DONNEES } from "./donnees.js";
import { el, styles, modale, toast, fermerModale } from "./ui.js";
import { Son } from "./son.js";

let ctx = null, bulle = null, reduite = false;
export const MENTOR = "Lia";
const NB_ETAPES = 12;

styles("tuto", `
.tuto-bulle { position: fixed; z-index: 30; top: calc(var(--hud) + 6px); left: 50%; transform: translateX(-50%); width: min(520px, calc(100vw - 32px)); padding: 14px 16px; display: grid; grid-template-columns: 46px 1fr; gap: 12px; background: rgba(20, 16, 30, .94); border: 1px solid rgba(190, 150, 255, .45); border-radius: 16px; box-shadow: 0 10px 40px rgba(0,0,0,.5); animation: entre .3s; }
.tuto-bulle.haut { bottom: auto; top: calc(var(--hud) + 46px); left: 50%; transform: translateX(-50%); }
.tuto-bulle.reduite { grid-template-columns: 30px auto; padding: 4px 12px 4px 4px; width: auto; bottom: auto; top: calc(var(--hud) + 6px); left: auto; right: var(--bord-d); transform: none; cursor: pointer; align-items: center; gap: 8px; }
.tuto-bulle.reduite .portrait { width: 30px; height: 30px; }
.tuto-bulle.reduite .portrait svg { width: 20px; height: 20px; }
.tuto-bulle .reduire { position: absolute; top: 6px; right: 8px; background: none; border: 0; color: var(--doux); font-size: 18px; line-height: 1; padding: 2px 6px; }
.tuto-bulle .portrait { width: 46px; height: 46px; border-radius: 50%; background: radial-gradient(circle at 50% 35%, #c8a8ff, #4a2a8a 70%); display: grid; place-items: center; box-shadow: 0 0 18px rgba(170, 120, 255, .5); }
.tuto-bulle .portrait svg { width: 30px; height: 30px; }
.tuto-bulle b { font-family: var(--titre); color: #cdb4ff; font-size: 14px; }
.tuto-bulle p { margin: 4px 0 0; font-size: 13px; line-height: 1.5; }
.tuto-bulle .bas { display: flex; gap: 8px; justify-content: space-between; align-items: center; margin-top: 8px; flex-wrap: wrap; }
.tuto-bulle .passer { background: none; border: 0; color: var(--doux); font-size: 11px; text-decoration: underline; padding: 0; }
.tuto-bulle .etape { font-size: 10px; color: var(--doux); font-family: var(--mono); }
#nav a.tuto-cible { animation: pulse 1.2s infinite; color: #cdb4ff; }
@keyframes pulse { 0%, 100% { box-shadow: 0 0 0 0 rgba(190,150,255,.0); } 50% { box-shadow: 0 0 0 4px rgba(190,150,255,.55); } }
.histoire { position: fixed; inset: 0; z-index: 45; display: grid; place-items: center; background: radial-gradient(ellipse at 50% 40%, rgba(40, 20, 80, .97), rgba(8, 6, 14, .99) 70%); padding: 24px var(--bord-d) 24px var(--bord-g); text-align: center; }
.histoire .carte { max-width: 560px; display: grid; gap: 18px; justify-items: center; }
.histoire .fenetre { width: 140px; height: 200px; border-radius: 18px; border: 6px solid #2a2238; outline: 2px solid #b896ff; box-shadow: 0 0 60px rgba(170, 120, 255, .6), inset 0 0 50px rgba(170, 120, 255, .45); background: radial-gradient(circle at 50% 45%, #ffd6a0 0, #b05aff 18%, #3a1a7a 45%, #120c26 75%); position: relative; overflow: hidden; }
.histoire .fenetre::before { content: ""; position: absolute; inset: -40%; background: conic-gradient(from 0deg, transparent, rgba(255,255,255,.35), transparent 30%, rgba(170,120,255,.5), transparent 60%); animation: tourne 6s linear infinite; }
@keyframes tourne { to { transform: rotate(360deg); } }
.histoire .fenetre i { position: absolute; border-radius: 50%; background: #fff; opacity: .8; width: 2px; height: 2px; }
.histoire .fenetre .ile { position: absolute; left: 30px; right: 30px; bottom: 40px; height: 22px; border-radius: 50% 50% 40% 40%; background: #2a3a2a; }
.histoire h2 { font-size: clamp(24px, 5vw, 34px); }
.histoire p { margin: 0; font-size: 16px; line-height: 1.6; color: #e0d8f0; }
.choix-4 { display: grid; gap: 10px; }
.choix-4 .col { display: grid; gap: 5px; }
.choix-4 button { text-align: left; padding: 9px 11px; border-radius: 10px; border: 1px solid var(--trait-fort); background: rgba(255,255,255,.04); border-left: 3px solid var(--el); display: grid; gap: 2px; }
.choix-4 button:hover { background: color-mix(in srgb, var(--el) 16%, transparent); }
.choix-4 button b { font-family: var(--titre); }
.choix-4 button small { color: var(--doux); font-size: 11px; }
@media (max-width: 560px) { .tuto-bulle { left: var(--bord-g); right: var(--bord-d); width: auto; transform: none; grid-template-columns: 30px 1fr; gap: 10px; padding: 8px 12px; max-height: 34vh; overflow: auto; } .tuto-bulle .portrait { width: 30px !important; height: 30px !important; } .tuto-bulle .portrait svg { width: 20px; height: 20px; } .tuto-bulle .bas { margin-top: 4px; } .tuto-bulle .portrait { width: 36px; height: 36px; } .tuto-bulle p { font-size: 12px; } .tuto-bulle.haut { top: calc(var(--hud) + 34px); left: var(--bord-g); right: var(--bord-d); transform: none; } .tuto-bulle.haut2 { bottom: auto; top: calc(var(--hud) + 100px); } .tuto-bulle.reduite { left: auto; right: var(--bord-d); top: calc(var(--hud) + 54px); } }
`);

styles("tuto-lia", `
.tuto-fleche { position: fixed; z-index: 45; width: 34px; height: 44px; transform: translate(-50%, -100%); pointer-events: none; filter: drop-shadow(0 0 10px rgba(242,181,68,.8)); animation: lia-rebond .9s ease-in-out infinite; }
.tuto-fleche svg { width: 100%; height: 100%; }
@keyframes lia-rebond { 50% { margin-top: -12px; } }
@media (prefers-reduced-motion: reduce) { .tuto-fleche { animation: none; } }
.tuto-bulle .voix { position: absolute; top: 8px; right: 34px; background: none; border: 0; font-size: 15px; padding: 2px 4px; opacity: .85; }
.triangle-boite { display: grid; gap: 10px; } .triangle-boite svg { width: min(300px, 100%); display: block; margin: 0 auto; font-family: var(--titre); }
.triangle-boite p { margin: 0; line-height: 1.5; }
`);
const RUNE = '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.6" stroke-linecap="round"><path d="M12 3v18M7 7l10 10M17 7 7 17"/><circle cx="12" cy="12" r="8" stroke-opacity=".6"/></svg>';

const nomPremier = () => { const d = E().dragons[0]; return d ? PAR_ID[d.id].nom : "ton dragon"; };
const tous3 = () => { const els = new Set(E().dragons.map((d) => PAR_ID[d.id].element)); return els.size >= 3; };

// ---------- Le grand guide de Lia ----------
// De la ruine du couvoir jusqu'à la ligue : 3 œufs, 3 îles qui surgissent, des combats de plus en plus grands,
// le village, une défense, une attaque, une expédition, puis le duel classé. Lia laisse souffler entre les étapes.
const dernier = () => { const l = E().dragons; return l[l.length - 1]; };
const nomDernier = () => { const d = dernier(); return d ? PAR_ID[d.id].nom : "ton dragon"; };
const ileDe = () => { const d = dernier(); return d ? PAR_ID[d.id].element : "feu"; };
const nomIle = (elx) => (elx === "eau" ? "d'Eau" : elx === "feu" ? "de Feu" : "de Glace");
const nomJoueur = () => (E().joueur && E().joueur.nom) || "mage";
function combattre(conf) { import("./combat.js").then((m) => m.combatGuide(ctx, conf)); }
function recompenseIle(e) { e.ressources.brindilles += 25; e.ressources.pierres += 20; e.ressources.rations += 10; }
function etapesIle(k) {
  const suite = k < 3 ? `oeuf${k + 1}` : "eclore";
  return {
    [`oeuf${k}`]: {
      cible: "couvoir",
      entree: k > 1 ? (e) => recompenseIle(e) : null,
      texte: () => (k === 1 ? "Trois œufs dormaient sous les ruines ! Touche celui que tu veux, puis confirme : il va éclore." : `Bravo, l'île est à toi ! Il reste ${4 - k} œuf${4 - k > 1 ? "s" : ""} au couvoir : choisis le prochain.`),
      quand: (n) => n === "ile_revelee", suite: `mini${k}`,
    },
    [`mini${k}`]: {
      cible: "iles", triangle: k === 1,
      texte: () => `Un dragon sauvage rôde sur l'île ${nomIle(ileDe())} ! ${nomDernier()} va lui montrer qui commande : un petit combat de 3 tours, contre un élément que tu bats.`,
      bouton: { texte: "Combattre !", action: () => combattre({ tours: 3, eux: 1, faible: true, uids: [dernier().uid], nom: "Dragon sauvage", titre: "Mini-combat · 3 tours", texte: "Choisis ton dragon, puis une posture. ATK frappe fort, DEF protège." }) },
      quand: (n, d) => n === "combat_fini" && d && d.mode === "guide", suite: `nid${k}`,
    },
    [`nid${k}`]: {
      cible: "iles",
      vise: () => { const r = E().ressources; return r.brindilles < 20 ? "buisson" : r.pierres < 5 ? "rocher" : "dragon"; },
      texte: () => { const r = E().ressources; return `${nomDernier()} a besoin d'un nid pour grandir. Touche un buisson, puis un rocher : il ira récolter (${Math.min(20, r.brindilles)}/20 brindilles, ${Math.min(5, r.pierres)}/5 pierres). Ensuite touche-le, puis « Construire le nid ».`; },
      quand: (n) => n === "nid", fini: () => !!dernier() && dernier().nid >= 1, suite: `ile${k}`,
    },
    [`ile${k}`]: {
      cible: "iles",
      texte: () => `Le chef des dragons sauvages de l'île ${nomIle(ileDe())} te défie avec ${k} dragon${k > 1 ? "s" : ""} ! Vrai combat : 9 manches, ou jusqu'à ce qu'une équipe tombe.${k > 1 ? " Toute ta couvée se bat avec toi." : ""} Si tu perds, soigne-toi et recommence.`,
      bouton: { texte: "Affronter le chef", action: () => combattre({ tours: 9, eux: k, faible: false, nom: "Chef des dragons sauvages", titre: `Île ${nomIle(ileDe())} · ${k} contre ${k}`, texte: "9 manches, ou jusqu'au K.O. de toute une équipe." }) },
      quand: (n, d) => n === "combat_fini" && d && d.mode === "guide" && d.victoire, suite,
    },
  };
}
const ETAPES = {
  reparer: {
    cible: "iles", vise: () => "couvoir",
    texte: () => (E().oeufs.couvoir.reparation
      ? "Les pierres se remettent en place… Deux minutes de travaux. Tu peux aussi tout finir maintenant avec tes gemmes : je t'en ai offert 60. Touche le couvoir."
      : `Bienvenue, ${nomJoueur()} ! Voici tout ce qu'il reste du couvoir des dragons… Touche les ruines pour le réparer : tu as juste assez de pierres et de brindilles.`),
    quand: (n) => n === "reparation_finie", suite: "oeuf1",
  },
  ...etapesIle(1), ...etapesIle(2), ...etapesIle(3),
  eclore: {
    cible: "couvoir",
    entree: (e) => { recompenseIle(e); e.oeufs.choix += 2; e.ressources.braises = (e.ressources.braises || 0) + 8; },
    texte: () => `Les trois îles sont libres ! En récompense, deux nouveaux œufs t'attendent au couvoir, avec 8 braises : 4 braises font éclore un œuf tout de suite. Tu as ${E().dragons.length}/5 dragons.`,
    fini: () => E().dragons.length >= 5, suite: "chantier",
  },
  chantier: {
    cible: "couvoir",
    entree: (e) => { e.ressources.gemmes = (e.ressources.gemmes || 0) + 30; },
    texte: () => { const r = E().ressources; return `Cinq dragons ! Le couvoir peut grandir. Il faut 40 brindilles (${Math.min(40, r.brindilles)}) et 40 pierres (${Math.min(40, r.pierres)}) : récolte sur tes îles si besoin. Puis choisis tes bâtisseurs et lance le chantier : 6 h, une heure de moins par dragon. Je t'ai donné 30 gemmes pour le finir tout de suite.`; },
    fini: () => E().oeufs.couvoir.niveau >= 1, suite: "batir",
  },
  batir: {
    cible: "iles", vise: () => "libre",
    entree: (e) => { e.ressources.brindilles += 30; e.ressources.pierres += 40; },
    texte: () => "Ton couvoir est devenu le cœur d'un village ! Je t'offre des pierres et des brindilles pour commencer. Va sur une île et touche un cercle doré : construis une scierie ou une carrière. Elles produisent toutes seules, même quand tu dors.",
    quand: (n, d) => n === "construit" && ["scierie", "carriere", "verger"].includes(d), suite: "tourd",
  },
  tourd: {
    cible: "iles", vise: () => "libre",
    entree: (e) => { e.ressources.brindilles += 20; e.ressources.pierres += 50; },
    texte: () => "Il faut aussi défendre tout ça. Touche un autre cercle doré et construis une tour : la lave brûle, le givre ralentit, l'eau repousse. Elle tirera toute seule.",
    quand: (n, d) => n === "construit" && String(d).startsWith("tour"), suite: "defense",
  },
  defense: {
    cible: "iles",
    texte: () => "Attention, des pillards ont repéré ton village ! Ils arrivent par les bords des îles et visent tes bâtiments, puis le couvoir par les ponts. Touche-les : ta tablette les frappe et tes dragons foncent dessus.",
    bouton: { texte: "Défendre !", action: () => import("./village.js").then((m) => m.lancerVagueGuide()) },
    quand: (n) => n === "vague_finie", suite: "attaque",
  },
  attaque: {
    cible: "combat",
    texte: () => "À ton tour d'attaquer ! Dans Combat, choisis « Attaquer un village », garde ton équipe, puis lance l'assaut. Touche un bâtiment pour que tes dragons le visent ; le couvoir au centre fait gagner.",
    quand: (n, d) => n === "attaque_finie" && d && d.victoire, suite: "expedition",
  },
  expedition: {
    cible: "couvoir",
    entree: (e) => { e.ressources.braises = (e.ressources.braises || 0) + 4; },
    texte: () => `Le butin contenait un œuf ! Fais-le éclore au couvoir (4 braises offertes). Puis envoie une expédition chercher un autre œuf : pour cette première, quelques minutes suffisent. Tu as ${E().dragons.length}/7 dragons.`,
    fini: () => E().dragons.length >= 7, suite: "ligue",
  },
  ligue: {
    cible: "combat",
    entree: (e) => { const m = [...e.dragons].sort((a, b) => b.niveau - a.niveau)[0]; if (m && m.niveau < 5) fixerNiveau(m, 5); soignerTout(); },
    texte: () => "Sept dragons, et ton meilleur atteint le niveau 5 : le duel classé s'ouvre ! Tu entres en ligue Bronze. Chaque victoire rapporte des trophées : Argent à 400, Or à 900… Va dans Combat, « Duel de mage (classé) ».",
    quand: (n, d) => n === "combat_fini" && d && d.mode === "bot", suite: "fin",
  },
  fin: {
    cible: null,
    texte: () => `Tu as tout vu, ${nomJoueur()} ! Récolte, nourris tes dragons, agrandis le couvoir (8 dragons pour le niveau 3), défends ton village, attaque, pars en expédition et grimpe dans les ligues. La tour du nid t'attend aussi dans Combat. Les dragons comptent sur toi !`,
    bouton: { texte: "Terminer le guide", action: () => terminer() },
  },
};

// Accueil : Lia se présente et demande le nom du joueur
export function accueillir() {
  const champ = el("input", { type: "text", maxlength: 18, placeholder: "Ton nom de mage", style: { width: "100%", padding: "12px", borderRadius: "10px", border: "1px solid rgba(190,150,255,.5)", background: "rgba(255,255,255,.05)", color: "inherit", font: "inherit", fontSize: "16px" } });
  const valider = () => {
    const nom = String(champ.value || "").trim().slice(0, 18) || "Mage";
    changer((e) => { e.joueur = { nom }; e.reglages.nomMage = nom; e.tuto.etape = "reparer"; });
    fermerModale(); dernierParle = null; afficher();
  };
  champ.addEventListener("keydown", (e) => { if (e.key === "Enter") valider(); });
  modale({
    titre: `Je suis ${MENTOR}`,
    contenu: el("div", { style: { display: "grid", gap: "10px" } },
      el("p", { style: { margin: 0 } }, "Bienvenue, voyageur du portail. Je suis la gardienne des dragons de ces îles… enfin, de ce qu'il en reste. Comment t'appelles-tu ?"), champ),
    boutons: [{ texte: "C'est moi !", classe: "principal", action: valider }],
    fermable: false,
  });
  parler("Bienvenue, voyageur du portail. Je suis Lia, la gardienne des dragons de ces îles. Comment t'appelles-tu ?");
  setTimeout(() => champ.focus(), 300);
}

export function initTuto(c) {
  ctx = c;
  // Les conditions « finies » (ressources, niveaux…) sont revérifiées régulièrement
  setInterval(() => { if (tutoActif()) { const et = ETAPES[etape()]; if (et && et.fini && et.fini()) signaler("tick"); } }, 2000);
  requestAnimationFrame(placerFleche);
}

// ---------- La voix de Lia (synthèse vocale du navigateur, en français) ----------
let dernierParle = null;
function voixActive() { const e = E(); return !e || !e.reglages || e.reglages.voixLia !== false; }
function basculerVoix() { const v = !voixActive(); changer((s) => { s.reglages.voixLia = v; }); if (!v && window.speechSynthesis) speechSynthesis.cancel(); else dernierParle = null; }
function voixFr() {
  const l = (window.speechSynthesis ? speechSynthesis.getVoices() : []).filter((v) => /^fr/i.test(v.lang));
  return l.find((v) => /amélie|amelie|audrey|julie|denise|hortense|marie|léa|celine|céline|female|femme/i.test(v.name)) || l.find((v) => /google/i.test(v.name)) || l[0] || null;
}
export function parler(texte) {
  if (!voixActive() || !window.speechSynthesis || !texte) return;
  try {
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(texte.replace(/[«»]/g, ""));
    const v = voixFr(); if (v) u.voice = v;
    u.lang = "fr-FR"; u.rate = 1.04; u.pitch = 1.15;
    u.volume = Math.max(0, Math.min(1, E().reglages.volVoix ?? 1));
    speechSynthesis.speak(u);
  } catch (e) { /* pas de voix sur ce navigateur */ }
}

// ---------- La flèche de Lia : montre où toucher ----------
const fleche = el("div", { class: "tuto-fleche", hidden: true, html: '<svg viewBox="0 0 40 52" aria-hidden="true"><path d="M20 50 4 28h10V2h12v26h10z" fill="#f2b544" stroke="#fff6d8" stroke-width="2.5" stroke-linejoin="round"/></svg>' });
function placerFleche() {
  requestAnimationFrame(placerFleche);
  if (!fleche.isConnected) document.body.append(fleche);
  let p = null;
  const et = tutoActif() ? ETAPES[etape()] : null;
  const modaleOuverte = !document.getElementById("modale")?.hidden || document.querySelector(".histoire");
  if (et && !modaleOuverte && ctx) {
    if (et.cible && ctx.ecran !== et.cible) {
      const a = document.querySelector(`#nav a[href="#${et.cible}"]`);
      if (a && !document.getElementById("nav").hidden) { const r = a.getBoundingClientRect(); p = { x: r.left + r.width / 2, y: r.top - 4 }; }
    } else if (et.vise && ctx.cibleTuto && ctx.ecran === "iles" && !document.querySelector(".fiche-ile")) p = ctx.cibleTuto(et.vise());
  }
  fleche.hidden = !p;
  if (p) { fleche.style.left = Math.round(p.x) + "px"; fleche.style.top = Math.round(p.y) + "px"; }
}

// ---------- Le triangle des éléments ----------
export function montrerTriangle() {
  const svg = `<svg viewBox="0 0 300 250" class="triangle" role="img" aria-label="Le feu bat la glace, la glace bat l'eau, l'eau bat le feu">
    <defs><marker id="pointe" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0 10 5 0 10z" fill="#f2b544"/></marker></defs>
    <path d="M128 62 72 160" stroke="#f2b544" stroke-width="4" fill="none" marker-end="url(#pointe)"/>
    <path d="M92 196 H208" stroke="#f2b544" stroke-width="4" fill="none" marker-end="url(#pointe)"/>
    <path d="M228 160 172 62" stroke="#f2b544" stroke-width="4" fill="none" marker-end="url(#pointe)"/>
    <circle cx="150" cy="40" r="34" fill="#ff6a3d"/><text x="150" y="46" text-anchor="middle" font-size="17" font-weight="700" fill="#1a0f08">Feu</text>
    <circle cx="62" cy="196" r="34" fill="#7fd6ff"/><text x="62" y="202" text-anchor="middle" font-size="17" font-weight="700" fill="#08141a">Glace</text>
    <circle cx="238" cy="196" r="34" fill="#2fd0c0"/><text x="238" y="202" text-anchor="middle" font-size="17" font-weight="700" fill="#06181a">Eau</text>
    <text x="80" y="108" font-size="13" fill="#f2b544" transform="rotate(-60 80 108)">bat</text>
    <text x="150" y="222" text-anchor="middle" font-size="13" fill="#f2b544">bat</text>
    <text x="214" y="104" font-size="13" fill="#f2b544" transform="rotate(60 214 104)">bat</text></svg>`;
  modale({
    titre: "Le triangle des éléments",
    contenu: el("div", { class: "triangle-boite" }, el("div", { html: svg }),
      el("p", {}, "Le feu bat la glace, la glace bat l'eau, l'eau bat le feu. Quand ton dragon frappe l'élément qu'il bat, ses dégâts grimpent. Quand l'élément qui le bat le frappe, il prend plus cher."),
      el("p", { class: "doux" }, "À chaque tour, toi et ton adversaire choisissez en secret un dragon puis une posture : ATK, c'est la force du coup ; DEF, la protection. Les deux frappent en même temps. Après 9 tours, celui qui a fait le plus de dégâts gagne.")),
    boutons: [{ texte: "J'ai compris", classe: "principal" }],
  });
  parler("Le feu bat la glace, la glace bat l'eau, et l'eau bat le feu. À chaque tour, choisis en secret un dragon puis une posture. Celui qui fait le plus de dégâts en neuf tours gagne.");
}
export function etape() { const t = E() && E().tuto; return t ? t.etape : "fini"; }
export function tutoActif() { const et = etape(); return !!ETAPES[et]; }
export function enApprentissage() { return etape() !== "fini"; }

export function signaler(nom, donnee) {
  if (!tutoActif()) return;
  const id = etape();
  const et = ETAPES[id];
  if (!et) return;
  if ((et.quand && et.quand(nom, donnee)) || (et.fini && et.fini())) aller(et.suite);
  else afficher();
}
function aller(id) {
  reduite = false;
  changer((e) => { e.tuto.etape = id; ETAPES[id] && ETAPES[id].entree && ETAPES[id].entree(e); });
  Son.ok();
  afficher();
  // Une étape peut déjà être remplie en arrivant
  const et = ETAPES[id];
  if (et && et.fini && et.fini()) aller(et.suite);
}

// Le conseil se pose en haut de l'écran et réserve sa hauteur (variable --tuto) : les panneaux
// et les boutons se placent en dessous au lieu d'être recouverts.
function reserver() {
  const h = bulle && !bulle.hidden ? Math.ceil(bulle.getBoundingClientRect().height) + 8 : 0;
  document.documentElement.style.setProperty("--tuto", h + "px");
}
export function afficher() {
  if (bulle) { bulle.remove(); bulle = null; }
  reserver();
  document.querySelectorAll("#nav a.tuto-cible").forEach((a) => a.classList.remove("tuto-cible"));
  if (!tutoActif()) return;
  const id = etape(), et = ETAPES[id];
  if (!et) return;
  const enCombat = ctx && ctx.ecran === "combat" && document.querySelector(".cb-haut");
  // Pendant un combat, seulement la pastille (le conseil du combat s'affiche ailleurs)
  if (reduite || enCombat) {
    bulle = el("aside", { class: "tuto-bulle reduite", role: "button", tabindex: 0, title: "Afficher le conseil", onclick: () => { reduite = false; afficher(); } },
      el("div", { class: "portrait", html: RUNE }), el("b", {}, MENTOR));
    document.body.append(bulle);
    reserver();
    if (et.cible && (!ctx || ctx.ecran !== et.cible)) document.querySelector(`#nav a[href="#${et.cible}"]`)?.classList.add("tuto-cible");
    return;
  }
  bulle = el("aside", { class: "tuto-bulle", role: "status" },
    el("button", { class: "reduire", "aria-label": "Réduire le conseil", title: "Réduire", onclick: () => { reduite = true; afficher(); } }, "–"),
    el("div", { class: "portrait", html: RUNE }),
    el("div", {},
      el("b", {}, MENTOR),
      el("button", { class: "voix", "aria-label": voixActive() ? "Couper la voix de Lia" : "Activer la voix de Lia", title: "Voix de Lia", onclick: () => { basculerVoix(); afficher(); } }, voixActive() ? "🔊" : "🔇"),
      el("p", {}, et.texte()),
      el("div", { class: "bas" },
        el("button", { class: "passer", onclick: () => modale({ titre: "Passer l'apprentissage ?", contenu: "Tu pourras retrouver toutes les règles dans le Livre.", boutons: [{ texte: "Continuer l'apprentissage" }, { texte: "Passer", classe: "danger", action: () => terminer(true) }] }) }, "Passer l'apprentissage"),
        et.triangle ? el("button", { class: "btn petit", onclick: () => montrerTriangle() }, "Le triangle des éléments") : null,
        et.bouton ? el("button", { class: "btn principal petit", onclick: et.bouton.action }, et.bouton.texte) : null),
    ),
  );
  document.body.append(bulle);
  reserver();
  if (et.cible && (!ctx || ctx.ecran !== et.cible)) document.querySelector(`#nav a[href="#${et.cible}"]`)?.classList.add("tuto-cible");
  if (dernierParle !== id) { dernierParle = id; parler(et.texte()); }
  if (et.triangle && ctx && ctx.ecran === "combat" && !E().tuto.triangleVu) { changer((e) => { e.tuto.triangleVu = true; }); setTimeout(montrerTriangle, 400); }
}
export function cacherBulle(c) { if (bulle) bulle.hidden = c; reserver(); }

// Bulle d'aide pendant un combat (premier tour)
export function conseilCombat() {
  if (!tutoActif()) return null;
  return "Touche un dragon en bas, puis une posture. ATK = force du coup, DEF = protection. Le bonus s'applique quand tu frappes l'élément que tu bats ; la faiblesse, quand l'élément qui te bat te frappe. Ton adversaire choisit en même temps : essaie de deviner !";
}

function terminer(passe = false) {
  changer((e) => { e.tuto.etape = "fini"; demarrerMinuteur(); noter(passe ? "Apprentissage passé." : "Apprentissage terminé."); });
  afficher();
  if (!passe) { Son.victoire(); toast("Le portail restera ouvert. Bonne chance, mage !", "bon"); }
  if (ctx) ctx.majHud();
}

// ---------- Histoire d'ouverture ----------
export function histoire(suite) {
  const pages = [
    ["Ta tablette magique", "Tu es un mage. Ta tablette n'est pas un simple objet : quand tu la touches, elle ouvre un portail vers un autre monde."],
    ["Le monde des dragons", "À travers ta tablette, tu découvres trois îles qui flottent dans le ciel : une île de feu, une île de glace, une île d'eau. Sur un rocher, au milieu, trois œufs t'attendent."],
    [`Je suis ${MENTOR}`, `Gardienne des portails, je guide les nouveaux venus. D'autres mages ont une tablette comme la tienne, et ils adorent les duels. Pour leur tenir tête, il te faudra une couvée forte. Commence par choisir un œuf.`],
  ];
  let i = 0;
  const z = el("div", { class: "histoire" });
  const etoiles = () => Array.from({ length: 26 }, () => el("i", { style: { left: Math.random() * 100 + "%", top: Math.random() * 60 + "%" } }));
  const rendre = () => {
    z.innerHTML = "";
    const [t, p] = pages[i];
    z.append(el("div", { class: "carte" },
      el("div", { class: "fenetre" }, etoiles(), el("div", { class: "ile" })),
      el("h2", {}, t), el("p", {}, p),
      el("div", { style: { display: "flex", gap: "10px" } },
        i === 0 ? el("button", { class: "btn", onclick: () => { z.remove(); changer((e) => { e.tuto.etape = "fini"; }); suite(); } }, "Passer l'histoire") : null,
        el("button", { class: "btn principal", onclick: () => { Son.clic(); i++; if (i >= pages.length) { z.remove(); suite(); } else rendre(); } }, i < pages.length - 1 ? "Suite" : "Choisir mon œuf"))));
  };
  rendre();
  document.body.append(z);
}

// Appelé quand l'œuf de départ éclot
export function apresPremierOeuf() {}

// ---------- Le 4e dragon ----------
function choisirQuatrieme() {
  const e = E();
  const box = el("div", { class: "choix-4" });
  for (const elx of ["feu", "glace", "eau"]) {
    const col = el("div", { class: "col" }, el("div", { class: "etiquette", style: { color: ELEMENTS[elx].couleur } }, ELEMENTS[elx].nom));
    for (const d of DRAGONS.filter((x) => x.element === elx && !e.dragons.some((y) => y.id === x.id))) {
      col.append(el("button", { class: elx, onclick: () => {
        fermerModale();
        changer((s) => { const n = nouveauDragon(d.id); n.nid = 1; fixerNiveau(n, 3); noter(`${d.nom} rejoint la couvée.`); });
        ctx.aller("couvoir", { celebrer: d.id, apres: () => signaler("quatrieme") });
      } }, el("b", {}, d.nom), el("small", {}, `${DONNEES.archetypes[d.archetype].nom} · ${d.titre}`)));
    }
    box.append(col);
  }
  modale({ titre: "Ton 4e dragon", contenu: el("div", {}, el("p", { class: "doux" }, "Il arrive directement au niveau 3, avec son nid."), box), boutons: [{ texte: "Plus tard" }], large: true });
}
