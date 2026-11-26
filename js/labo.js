// Labo : les triches pour tester le jeu comme on veut (bêta uniquement).
import { E, changer, nouveauDragon, fixerNiveau, soignerTout, maintenant, reinitialiser, lieuSauvegarde, mettreAJour } from "./etat.js";
import { DRAGONS, PAR_ID, ELEMENTS, ENERGIE_MAX, stadeDuNiveau, NIDS } from "./regles.js";
import { el, styles, toast, modale } from "./ui.js";
import { Son, Musique } from "./son.js";

let ctxJeu = null, ui = null;
const H = 3600 * 1000;

styles("labo", `
.lb { position: fixed; z-index: 15; inset: calc(var(--hud) + var(--tuto, 0px) + 8px) var(--bord-d) calc(var(--bas) + 84px) var(--bord-g); max-width: 1100px; margin: 0 auto; padding: 18px; overflow: auto; display: grid; gap: 16px; align-content: start; background: rgba(13,14,19,.92); }
.lb h2 { font-size: 26px; }
.lb .groupes { display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 12px; }
.lb .g { padding: 12px; border-radius: 12px; border: 1px solid var(--trait); background: rgba(255,255,255,.03); display: grid; gap: 8px; align-content: start; }
.lb .g h3 { font-size: 15px; }
.lb .g .b { display: flex; gap: 6px; flex-wrap: wrap; }
.lb select, .lb input[type=number] { padding: 7px; border-radius: 8px; background: #1a1a22; color: var(--texte); border: 1px solid var(--trait-fort); font: inherit; }
.lb .avert { font-size: 12px; color: #ffd98a; }
@media (max-width: 560px) { .lb { inset: calc(var(--hud) + var(--tuto, 0px) + 8px) var(--bord-d) calc(var(--bas) + 78px) var(--bord-g); padding: 12px; } }
`);

export function ouvrir(ctx) {
  ctxJeu = ctx;
  ui = document.getElementById("ecran");
  Musique.jouer("livre");
  rendre();
}
export function fermer() {}

function act(nom, fn, classe = "") {
  return el("button", { class: "btn petit " + classe, onclick: () => { changer(fn); mettreAJour(); Son.ok(); toast(nom, "bon"); ctxJeu.majHud(); rendre(); } }, nom);
}

function rendre() {
  ui.innerHTML = "";
  const e = E();
  const p = el("section", { class: "lb panneau" });
  p.append(el("div", {}, el("div", { class: "etiquette" }, "Bêta · outils de test"), el("h2", {}, "Labo"), el("p", { class: "doux", style: { margin: "4px 0 0" } }, `Ces boutons trichent pour tester vite. Ils n'existeront pas dans le vrai jeu. Sauvegarde : ${lieuSauvegarde() === "compte" ? "liée à ton compte Claude" : "dans ce navigateur"}.`)));
  const gr = el("div", { class: "groupes" });

  gr.append(el("div", { class: "g" }, el("h3", {}, "Ressources"), el("div", { class: "b" },
    act("Énergie au max", (s) => { s.energie.val = ENERGIE_MAX; }),
    act("+50 rations", (s) => { s.ressources.rations += 50; }),
    act("+100 brindilles et pierres", (s) => { s.ressources.brindilles += 100; s.ressources.pierres += 100; }),
    act("+50 de chaque matériau", (s) => { s.ressources.obsidienne += 50; s.ressources.givrite += 50; s.ressources.corail += 50; }),
    act("+5 cœurs", (s) => { s.ressources.coeurs += 5; }),
    act("+10 braises d'éclosion", (s) => { s.ressources.braises = (s.ressources.braises || 0) + 10; }),
    act("Tout en grand", (s) => { s.energie.val = ENERGIE_MAX; Object.keys(s.ressources).forEach((k) => { s.ressources[k] += k === "coeurs" ? 20 : 300; }); }, "principal"),
  )));

  gr.append(el("div", { class: "g" }, el("h3", {}, "Œufs et couvoir"), el("div", { class: "b" },
    act("+1 œuf à choisir", (s) => { s.oeufs.choix += 1; }),
    act("+5 œufs à choisir", (s) => { s.oeufs.choix += 5; }),
    act("Œufs du couvoir prêts", (s) => { for (const sl of s.oeufs.couvoir.slots) { sl.pasDepart = -1e9; sl.debut = 0; } }),
    act("Minuteur : œuf maintenant", (s) => { if (s.oeufs.minuteur.prochain) s.oeufs.minuteur.prochain = maintenant(); }),
    act("Grand couvoir", (s) => { s.oeufs.couvoir.niveau = 1; }),
  )));

  gr.append(el("div", { class: "g" }, el("h3", {}, "Temps"), el("p", { class: "doux", style: { margin: 0, fontSize: "12px" } }, "Avance l'horloge du jeu (énergie, fermes, faim, minuteur des œufs)."), el("div", { class: "b" },
    act("+1 heure", (s) => { s.decalage += H; }),
    act("+6 heures", (s) => { s.decalage += 6 * H; }),
    act("+1 jour", (s) => { s.decalage += 24 * H; }),
    act("Remettre l'heure", (s) => { s.decalage = 0; }),
  )));

  // Dragons
  const sel = el("select", { id: "lb-dragon" }, DRAGONS.map((d) => el("option", { value: d.id }, `${d.nom} (${ELEMENTS[d.element].nom})`)));
  gr.append(el("div", { class: "g" }, el("h3", {}, "Obtenir un dragon"), sel, el("div", { class: "b" },
    el("button", { class: "btn petit principal", onclick: () => { changer(() => nouveauDragon(sel.value)); Son.eclosion(); toast(`${PAR_ID[sel.value].nom} ajouté.`, "bon"); rendre(); } }, "Ajouter"),
    act("Les 21 dragons", () => { for (const d of DRAGONS) if (!E().dragons.some((x) => x.id === d.id)) nouveauDragon(d.id); }),
    act("Compléter le Livre", (s) => { for (const d of DRAGONS) if (!s.livre.vus.includes(d.id)) s.livre.vus.push(d.id); }),
  )));

  const niv = el("input", { type: "number", min: 1, max: 20, value: 20, id: "lb-niv", style: { width: "70px" } });
  gr.append(el("div", { class: "g" }, el("h3", {}, "Mes dragons"), el("div", { class: "b" },
    act("Soigner et nourrir tout le monde", () => soignerTout()),
    act("+1 niveau à tous", (s) => { for (const d of s.dragons) fixerNiveau(d, d.niveau + 1); }),
    el("span", { style: { display: "inline-flex", gap: "6px", alignItems: "center" } }, "Niveau", niv, el("button", { class: "btn petit", onclick: () => { changer((s) => { for (const d of s.dragons) fixerNiveau(d, +niv.value); }); Son.niveau(); toast("Niveaux changés.", "bon"); rendre(); } }, "pour tous")),
    act("Nids uniques pour tous", (s) => { for (const d of s.dragons) d.nid = 3; }),
    act("Nids adaptés au niveau", (s) => { for (const d of s.dragons) { const st = stadeDuNiveau(d.niveau); d.nid = st >= 4 ? 3 : st >= 2 ? 2 : st >= 1 ? 1 : d.nid; } }),
    act("Toutes les armures", (s) => { for (const d of s.dragons) d.armures = ["cuirasse", "runes", "parure"]; }),
    act("Fermes de l'élément partout", (s) => { for (const k of Object.keys(s.fermes)) { s.fermes[k].niveau = 2; s.fermes[k].stock = 48; } }),
    act("Mettre tout le monde K.O.", (s) => { for (const d of s.dragons) d.pv = 0; }, "danger"),
  )));

  gr.append(el("div", { class: "g" }, el("h3", {}, "Partie"), el("div", { class: "b" },
    el("button", { class: "btn petit", onclick: () => { const t = JSON.stringify(E()); navigator.clipboard && navigator.clipboard.writeText(t).then(() => toast("Sauvegarde copiée.", "bon"), () => toast("Copie refusée par le navigateur.", "mal")); } }, "Copier la sauvegarde"),
    el("button", { class: "btn petit danger", onclick: () => modale({ titre: "Recommencer à zéro ?", contenu: "Toute la partie sera effacée : dragons, ressources, œufs.", boutons: [{ texte: "Annuler" }, { texte: "Tout effacer", classe: "danger", action: () => { reinitialiser(); location.hash = ""; location.reload(); } }] }) }, "Recommencer à zéro"),
  ), el("p", { class: "avert", style: { margin: 0 } }, `Combats : ${e.combats.gagnes} gagnés, ${e.combats.perdus} perdus, ${e.combats.nuls} nuls.`)));

  p.append(gr);
  if (e.journal.length) p.append(el("div", { class: "g" }, el("h3", {}, "Journal"), ...e.journal.slice(0, 12).map((j) => el("div", { class: "doux", style: { fontSize: "12px" } }, new Date(j.t).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" }), " · ", j.texte))));
  ui.append(p);
}
