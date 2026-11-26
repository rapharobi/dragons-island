// Réglages : son, chrono des combats, sauvegarde.
import { E, changer, lieuSauvegarde, reinitialiser } from "./etat.js";
import { COUVOIR } from "./regles.js";
import { el, styles, toast, modale } from "./ui.js";
import { Son, Musique, reglerSon, initAudio } from "./son.js";

let ctxJeu = null, ui = null;

styles("reglages", `
.rg { position: fixed; z-index: 15; top: calc(var(--hud) + var(--tuto, 0px) + 8px); left: 50%; transform: translateX(-50%); width: min(560px, calc(100vw - 32px)); max-height: calc(100vh - 170px); overflow: auto; padding: 18px; display: grid; gap: 14px; background: rgba(13,14,19,.92); }
.rg h2 { font-size: 26px; }
.rg .opt { display: grid; gap: 8px; padding: 12px; border-radius: 12px; border: 1px solid var(--trait); background: rgba(255,255,255,.03); }
.rg .opt h3 { font-size: 15px; }
.rg .opt p { margin: 0; font-size: 12px; color: var(--doux); line-height: 1.5; }
.rg .seg { display: flex; gap: 6px; flex-wrap: wrap; }
.rg .seg button { padding: 8px 12px; border-radius: 9px; border: 1px solid var(--trait-fort); background: rgba(255,255,255,.04); font-weight: 600; font-size: 13px; }
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
    el("p", {}, `Les œufs éclosent avec le temps : ${COUVOIR[0].heures} h par œuf, ${COUVOIR[1].heures} h pour les deux œufs du grand couvoir. Les braises d'éclosion de la boutique les font avancer plus vite.`)));
  p.append(el("div", { class: "opt" }, el("h3", {}, "Son"),
    seg([[true, "Bruitages activés"], [false, "Bruitages coupés"]], r.son, (v) => { changer((s) => { s.reglages.son = v; }); initAudio(); reglerSon(v, E().reglages.musique); }),
    seg([[true, "Musique activée"], [false, "Musique coupée"]], r.musique, (v) => { changer((s) => { s.reglages.musique = v; }); initAudio(); reglerSon(E().reglages.son, v); })));
  p.append(el("div", { class: "opt" }, el("h3", {}, "Temps pour choisir en combat"),
    el("p", {}, "20 secondes dans le jeu final. Tu peux l'enlever pour tester tranquillement."),
    seg([[20, "20 secondes"], [40, "40 secondes"], [0, "Sans limite"]], r.chrono, (v) => changer((s) => { s.reglages.chrono = v; }))));
  p.append(el("div", { class: "opt" }, el("h3", {}, "Sauvegarde"),
    el("p", {}, lieuSauvegarde() === "compte" ? "Ta partie est enregistrée avec ton compte : tu la retrouves sur tes autres appareils en ouvrant ce lien." : "Ta partie est enregistrée dans ce navigateur. Si tu effaces les données du site, elle sera perdue."),
    el("div", { class: "seg" },
      el("button", { onclick: () => { const t = JSON.stringify(E()); navigator.clipboard && navigator.clipboard.writeText(t).then(() => toast("Sauvegarde copiée.", "bon"), () => toast("Copie refusée par le navigateur.", "mal")); } }, "Copier la sauvegarde"),
      el("button", { onclick: () => modale({ titre: "Recommencer à zéro ?", contenu: "Toute la partie sera effacée : dragons, ressources, œufs et gemmes.", boutons: [{ texte: "Annuler" }, { texte: "Tout effacer", classe: "danger", action: () => { reinitialiser(); location.hash = ""; location.reload(); } }] }) }, "Recommencer à zéro"))));
  p.append(el("div", { class: "opt" }, el("h3", {}, "À propos"), el("p", {}, "Dragons Island, bêta 0.11 : jeu complet, avec des bots à la place des vrais adversaires et le défi en ligne entre amis. Le GPS et les nids NFC arriveront avec l'appli mobile.")));
  ui.append(p);
}
