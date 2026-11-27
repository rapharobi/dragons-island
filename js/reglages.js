// Réglages : son, chrono des combats, sauvegarde.
import { E, changer, lieuSauvegarde, reinitialiser } from "./etat.js";
import { COUVOIR } from "./regles.js";
import { el, styles, toast, modale } from "./ui.js";
import { Son, Musique, reglerSon, reglerVolumes, initAudio } from "./son.js";
import { pleinEcranPossible, basculerPleinEcran } from "./portail.js";

let ctxJeu = null, ui = null;

styles("reglages", `
.rg { position: fixed; z-index: 15; top: calc(var(--hud) + var(--tuto, 0px) + 8px); left: 50%; transform: translateX(-50%); width: min(560px, calc(100vw - 32px)); max-height: calc(100vh - 170px); overflow: auto; padding: 18px; display: grid; gap: 14px; background: rgba(13,14,19,.92); }
.rg h2 { font-size: 26px; }
.rg .opt { display: grid; gap: 8px; padding: 12px; border-radius: 12px; border: 1px solid var(--trait); background: rgba(255,255,255,.03); }
.rg .opt h3 { font-size: 15px; }
.rg .opt p { margin: 0; font-size: 12px; color: var(--doux); line-height: 1.5; }
.rg .seg { display: flex; gap: 6px; flex-wrap: wrap; }
.rg .seg button { padding: 8px 12px; border-radius: 9px; border: 1px solid var(--trait-fort); background: rgba(255,255,255,.04); font-weight: 600; font-size: 13px; }
.rg .vol { display: grid; grid-template-columns: 90px 1fr 48px; gap: 10px; align-items: center; font-size: 13px; }
.rg .vol input { width: 100%; accent-color: var(--ambre); }
.rg .vol b { text-align: right; }
.rg .seg button.actif { border-color: var(--ambre); color: var(--ambre); background: rgba(242,181,68,.12); }
`);

export function ouvrir(ctx) { ctxJeu = ctx; ui = document.getElementById("ecran"); rendre(); }
export function fermer() {}

function seg(options, valeur, choisir) {
  const s = el("div", { class: "seg", role: "radiogroup" });
  for (const [v, nom] of options) s.append(el("button", { class: valeur === v ? "actif" : "", role: "radio", "aria-checked": valeur === v ? "true" : "false", onclick: () => { Son.clic(); choisir(v); rendre(); } }, nom));
  return s;
}

function rendre() {
  ui.innerHTML = "";
  const e = E();
  const r = e.reglages;
  const p = el("section", { class: "rg panneau" });
  p.append(el("div", {}, el("div", { class: "etiquette" }, "Préférences"), el("h2", {}, "Réglages")));
  p.append(el("div", { class: "opt" }, el("h3", {}, "Faire éclore les œufs"),
    el("p", {}, `Un nouvel œuf arrive avec le temps (1 h, puis 2 h, 4 h… jusqu'à 24 h), puis il éclôt dans le couvoir : ${COUVOIR[0].heures} h, ou ${COUVOIR[1].heures} h pour deux œufs à la fois dans le grand couvoir. Les braises d'éclosion de la boutique font tout avancer plus vite.`)));
  // Volumes séparés : musique, bruitages, voix de Lia
  const curseur = (cle, nom, appliquer) => {
    const val = Math.round((r[cle] ?? 1) * 100);
    const aff = el("b", { class: "num" }, `${val} %`);
    return el("label", { class: "vol" }, el("span", {}, nom), el("input", { type: "range", min: 0, max: 100, step: 5, value: val, id: "vol-" + cle,
      oninput: (ev) => { const v = +ev.target.value / 100; aff.textContent = `${Math.round(v * 100)} %`; r[cle] = v; appliquer(v); },
      onchange: (ev) => { const v = +ev.target.value / 100; changer((s) => { s.reglages[cle] = v; }); if (cle === "volEffets") Son.clic(); } }), aff);
  };
  p.append(el("div", { class: "opt" }, el("h3", {}, "Volumes"),
    curseur("volMusique", "Musique", (v) => { initAudio(); reglerVolumes(r.volEffets ?? 1, v); }),
    curseur("volEffets", "Bruitages", (v) => { initAudio(); reglerVolumes(v, r.volMusique ?? 1); }),
    curseur("volVoix", "Voix de Lia", () => {})));
  p.append(el("div", { class: "opt" }, el("h3", {}, "Son"),
    seg([[true, "Bruitages activés"], [false, "Bruitages coupés"]], r.son, (v) => { changer((s) => { s.reglages.son = v; }); initAudio(); reglerSon(v, E().reglages.musique); }),
    seg([[true, "Musique activée"], [false, "Musique coupée"]], r.musique, (v) => { changer((s) => { s.reglages.musique = v; }); initAudio(); reglerSon(E().reglages.son, v); })));
  p.append(el("div", { class: "opt" }, el("h3", {}, "Graphismes"),
    el("p", {}, "Si le jeu rame sur ton téléphone, baisse la qualité : moins d'ombres et une image plus légère."),
    seg([["basse", "Basse"], ["moyenne", "Moyenne"], ["haute", "Haute"]], r.qualite || "haute", (v) => { changer((s) => { s.reglages.qualite = v; }); window.__jeu.moteur.regler(v); })));
  if (pleinEcranPossible()) p.append(el("div", { class: "opt" }, el("h3", {}, "Affichage"),
    el("p", {}, "Le jeu prend tout l'écran du téléphone, sans la barre du navigateur."),
    el("div", { class: "seg" }, el("button", { onclick: () => basculerPleinEcran() }, "⛶ Plein écran (activer / quitter)"))));
  p.append(el("div", { class: "opt" }, el("h3", {}, "Temps pour choisir en combat"),
    el("p", {}, "20 secondes dans le jeu final. Tu peux l'enlever pour tester tranquillement."),
    seg([[20, "20 secondes"], [40, "40 secondes"], [0, "Sans limite"]], r.chrono, (v) => changer((s) => { s.reglages.chrono = v; }))));
  p.append(el("div", { class: "opt" }, el("h3", {}, "Sauvegarde"),
    el("p", {}, lieuSauvegarde() === "compte" ? "Ta partie est enregistrée avec ton compte : tu la retrouves sur tes autres appareils en ouvrant ce lien." : "Ta partie est enregistrée dans ce navigateur. Si tu effaces les données du site, elle sera perdue."),
    el("div", { class: "seg" },
      el("button", { onclick: () => { const t = JSON.stringify(E()); navigator.clipboard && navigator.clipboard.writeText(t).then(() => toast("Sauvegarde copiée.", "bon"), () => toast("Copie refusée par le navigateur.", "mal")); } }, "Copier la sauvegarde"),
      el("button", { onclick: () => modale({ titre: "Recommencer à zéro ?", contenu: "Toute la partie sera effacée : dragons, ressources, œufs et gemmes.", boutons: [{ texte: "Annuler" }, { texte: "Tout effacer", classe: "danger", action: () => { reinitialiser(); location.hash = ""; location.reload(); } }] }) }, "Recommencer à zéro"))));
  let tapes = 0;
  let admin = false; try { admin = localStorage.getItem("dw-pilote") === "1"; } catch (e) { /* stockage refusé */ }
  if (admin) p.append(el("div", { class: "opt", style: { borderColor: "rgba(190,120,255,.5)" } }, el("h3", {}, "Pilotage du jeu"),
    el("p", {}, "Ton poste de commande : ressources, dragons, séismes, météorites, éclipses et, avec les comptes, la modération des joueurs."),
    el("div", { class: "seg" }, el("button", { class: "actif", onclick: () => ctxJeu.aller("pilotage") }, "Ouvrir le pilotage"))));
  p.append(el("div", { class: "opt" }, el("h3", {}, "À propos"), el("p", { onclick: () => {
    if (++tapes < 7) return;
    try { localStorage.setItem("dw-pilote", "1"); } catch (e) { /* stockage refusé */ }
    toast("Pilotage débloqué.", "bon"); rendre();
  } }, "Dragon World, bêta 0.12 : jeu complet, avec des bots à la place des vrais adversaires et le défi en ligne entre amis. Le GPS et les nids NFC arriveront avec l'appli mobile.")));
  ui.append(p);
}
