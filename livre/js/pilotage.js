// Pilotage : le poste de commande du créateur du jeu.
// Aujourd'hui il agit sur la partie de cet appareil (ressources, dragons, événements du monde).
// Quand les comptes Google (Firebase) seront branchés, la partie « Joueurs » permettra de modérer tout le monde :
// donner ou retirer, restreindre, bannir, et lancer un séisme chez tous les joueurs en même temps.
import { E, changer, nouveauDragon } from "./etat.js";
import { DRAGONS, PAR_ID, MATERIAUX, ENERGIE_MAX, pvMax } from "./regles.js";
import { el, styles, toast, modale, icone } from "./ui.js";
import { Son } from "./son.js";
import * as Iles from "./iles.js";

let ctxJeu = null, ui = null;
const vue = { res: "gemmes", qte: 100, espece: DRAGONS[0].id, niveau: 10, uid: null, ile: "feu" };

styles("pilotage", `
.pil-p { position: fixed; z-index: 15; top: calc(var(--hud) + var(--tuto, 0px) + 8px); bottom: calc(var(--bas) + 80px); left: 50%; transform: translateX(-50%); width: min(620px, calc(100vw - 24px)); overflow: auto; padding: 16px; display: grid; gap: 12px; align-content: start; background: rgba(13,12,22,.94); border-color: rgba(190,120,255,.45); }
.pil-p h2 { font-size: 24px; }
.pil-b { display: grid; gap: 8px; padding: 12px; border-radius: 12px; border: 1px solid var(--trait); background: rgba(255,255,255,.03); }
.pil-b h3 { font-size: 15px; display: flex; align-items: center; gap: 8px; }
.pil-b p { margin: 0; font-size: 12px; color: var(--doux); line-height: 1.5; }
.pil-l { display: flex; gap: 6px; flex-wrap: wrap; align-items: center; }
.pil-l select, .pil-l input { padding: 8px 9px; border-radius: 9px; border: 1px solid var(--trait-fort); background: #1a1b24; color: inherit; font: inherit; font-size: 13px; min-width: 0; }
.pil-l input[type=number] { width: 96px; }
.pil-l input[type=range] { flex: 1; min-width: 120px; accent-color: #b45cff; }
.pil-ev { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
.pil-ev button { display: grid; gap: 4px; justify-items: center; padding: 12px 6px; border-radius: 12px; border: 1px solid rgba(255,140,80,.45); background: rgba(255,120,60,.08); color: inherit; font-weight: 700; font-size: 13px; }
.pil-ev button span { font-size: 26px; line-height: 1; }
.pil-ev button small { font-weight: 400; font-size: 10px; color: var(--doux); }
.pil-verrou { opacity: .55; }
.pil-tag { font-size: 10px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; padding: 2px 6px; border-radius: 6px; background: rgba(180,92,255,.25); color: #ecd8ff; }
`);

export function ouvrir(ctx) { ctxJeu = ctx; ui = document.getElementById("ecran"); rendre(); }
export function fermer() {}

const RES = () => [["gemmes", "Gemmes"], ...Object.entries(MATERIAUX).filter(([k]) => k !== "gemmes").map(([k, m]) => [k, m.nom])];

function rendre() {
  const defile = ui.querySelector(".pil-p")?.scrollTop || 0;
  ui.innerHTML = "";
  const e = E();
  const p = el("section", { class: "pil-p panneau" });
  p.append(el("div", {}, el("div", { class: "etiquette" }, "Poste de commande"), el("h2", {}, "Pilotage du jeu")));

  // Joueurs et modération : prêts pour les comptes Google
  p.append(el("div", { class: "pil-b pil-verrou" },
    el("h3", {}, "Joueurs et modération", el("span", { class: "pil-tag" }, "avec les comptes")),
    el("p", {}, "Rechercher un joueur, lui donner ou retirer des gemmes et des dragons, le restreindre (pas de combat en ligne, pas de boutique) ou le bannir, envoyer un message à tous. Ça s'active dès que les comptes Google (Firebase) sont branchés."),
    el("div", { class: "pil-l" }, el("input", { type: "search", placeholder: "Pseudo ou e-mail du joueur", disabled: true }),
      el("button", { class: "btn petit", disabled: true }, "Restreindre"), el("button", { class: "btn petit", disabled: true }, "Bannir"), el("button", { class: "btn petit", disabled: true }, "Message à tous"))));

  // Événements du monde
  const ileSel = el("select", { onchange: (ev) => { vue.ile = ev.target.value; } }, ...[["feu", "Île de Feu"], ["glace", "Île de Glace"], ["eau", "Île d'Eau"]].map(([k, n]) => el("option", { value: k, selected: vue.ile === k }, n)));
  const lancerEv = (type) => {
    Son.clic();
    ctxJeu.aller("iles");
    Iles.focaliser(vue.ile);
    setTimeout(() => Iles.evenement(type, vue.ile), 900);
  };
  p.append(el("div", { class: "pil-b" },
    el("h3", {}, "Événements du monde"),
    el("p", {}, "Tu es renvoyé sur l'île choisie pour voir l'événement. Avec les comptes, il se produira chez tous les joueurs connectés."),
    el("div", { class: "pil-l" }, el("span", { style: { fontSize: "13px" } }, "Sur :"), ileSel),
    el("div", { class: "pil-ev" },
      el("button", { onclick: () => lancerEv("seisme") }, el("span", {}, "〰"), "Séisme", el("small", {}, "tout tremble")),
      el("button", { onclick: () => lancerEv("meteorites") }, el("span", {}, "☄"), "Météorites", el("small", {}, "pluie de feu")),
      el("button", { onclick: () => lancerEv("eclipse") }, el("span", {}, "◐"), "Éclipse", el("small", {}, "nuit en plein jour")))));

  // Ressources
  const qte = el("input", { type: "number", min: 1, value: vue.qte, oninput: (ev) => { vue.qte = Math.max(1, Math.floor(+ev.target.value || 1)); } });
  const resSel = el("select", { onchange: (ev) => { vue.res = ev.target.value; } }, ...RES().map(([k, n]) => el("option", { value: k, selected: vue.res === k }, n)));
  const bouger = (signe) => {
    changer((s) => { s.ressources[vue.res] = Math.max(0, (s.ressources[vue.res] || 0) + signe * vue.qte); });
    Son.achat(); toast(`${signe > 0 ? "+" : "−"}${vue.qte} ${RES().find((r) => r[0] === vue.res)[1].toLowerCase()} (${E().ressources[vue.res]})`, "bon");
  };
  p.append(el("div", { class: "pil-b" },
    el("h3", {}, "Donner ou retirer des ressources"),
    el("div", { class: "pil-l" }, resSel, qte, el("button", { class: "btn petit principal", onclick: () => bouger(1) }, "Donner"), el("button", { class: "btn petit", onclick: () => bouger(-1) }, "Retirer")),
    el("div", { class: "pil-l" },
      el("button", { class: "btn petit", onclick: () => { changer((s) => { s.energie.val = ENERGIE_MAX; }); Son.ok(); toast("Énergie pleine.", "bon"); } }, icone("energie"), "Énergie pleine"),
      el("button", { class: "btn petit", onclick: () => { changer((s) => { s.oeufs.choix += 1; }); Son.ok(); toast("+1 œuf à choisir au couvoir.", "bon"); } }, icone("oeuf"), "+1 œuf"),
      el("button", { class: "btn petit", onclick: () => { changer((s) => { for (const d of s.dragons) d.pv = pvMax(d); }); Son.ok(); toast("Tous les dragons sont soignés.", "bon"); } }, "Soigner tout le monde"))));

  // Dragons
  const especes = el("select", { onchange: (ev) => { vue.espece = ev.target.value; } }, ...DRAGONS.map((d) => el("option", { value: d.id, selected: vue.espece === d.id }, `${d.nom} (${d.element})`)));
  const nivVal = el("b", { class: "num" }, vue.niveau);
  const mes = e.dragons;
  if (!mes.some((d) => d.uid === vue.uid)) vue.uid = mes[0] ? mes[0].uid : null;
  const miens = el("select", { onchange: (ev) => { vue.uid = ev.target.value; } }, ...mes.map((d) => el("option", { value: d.uid, selected: vue.uid === d.uid }, `${PAR_ID[d.id].nom} · Nv ${d.niveau}${d.ul ? " · UL" : ""}`)));
  const surMien = (f, msg) => { changer((s) => { const d = s.dragons.find((x) => x.uid === vue.uid); if (d) f(s, d); }); Son.ok(); toast(msg, "bon"); rendre(); };
  p.append(el("div", { class: "pil-b" },
    el("h3", {}, "Dragons"),
    el("div", { class: "pil-l" }, especes, el("span", { style: { fontSize: "13px" } }, "Nv ", nivVal),
      el("input", { type: "range", min: 1, max: 20, value: vue.niveau, oninput: (ev) => { vue.niveau = +ev.target.value; nivVal.textContent = vue.niveau; } }),
      el("button", { class: "btn petit principal", onclick: () => {
        changer(() => { const d = nouveauDragon(vue.espece); d.niveau = vue.niveau; d.nid = vue.niveau >= 15 ? 3 : vue.niveau >= 10 ? 2 : vue.niveau >= 5 ? 1 : 0; d.pv = pvMax(d); });
        Son.eclosion(); toast(`${PAR_ID[vue.espece].nom} (Nv ${vue.niveau}) rejoint tes îles.`, "bon"); rendre();
      } }, "Donner ce dragon")),
    mes.length ? el("div", { class: "pil-l" }, miens,
      el("button", { class: "btn petit", onclick: () => surMien((s, d) => { d.niveau = Math.min(20, d.niveau + 1); d.xp = 0; d.pv = pvMax(d); }, "Un niveau de plus.") }, "+1 niveau"),
      el("button", { class: "btn petit", onclick: () => surMien((s, d) => { d.ul = true; d.ulPossede = true; }, "Version UL donnée.") }, "Donner l'UL"),
      el("button", { class: "btn petit", onclick: () => modale({ titre: "Retirer ce dragon ?", contenu: "Il disparaît de la partie de cet appareil.", boutons: [{ texte: "Annuler" }, { texte: "Retirer", classe: "danger", action: () => surMien((s, d) => { s.dragons.splice(s.dragons.indexOf(d), 1); }, "Dragon retiré.") }] }) }, "Retirer")) : null));

  p.append(el("div", { class: "pil-b" }, el("h3", {}, "Accès"),
    el("p", {}, "Ce panneau est caché. Pour le retrouver sur un autre appareil : Réglages, puis touche 7 fois le texte « À propos »."),
    el("div", { class: "pil-l" }, el("button", { class: "btn petit", onclick: () => { try { localStorage.removeItem("dw-pilote"); } catch (er) { /* rien */ } ctxJeu.aller("reglages"); } }, "Cacher le pilotage sur cet appareil"))));
  ui.append(p);
  p.scrollTop = defile;
}
