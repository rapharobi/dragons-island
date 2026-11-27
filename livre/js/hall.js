// Le hall de la ligue : classement, saison du mois et son coffre, historique des combats (avec revanche),
// salle des trophées (succès) et ton équipe.
import { E, changer, maintenant } from "./etat.js";
import { PAR_ID, ELEMENTS, fmtDuree } from "./regles.js";
import { el, styles, toast, modale, icone } from "./ui.js";
import { blocLigue, trophees, ligueDe, LIGUES } from "./ligues.js";
import { Son } from "./son.js";

styles("hall", `
.hl-onglets { display: flex; gap: 6px; overflow-x: auto; scrollbar-width: none; }
.hl-onglets button { flex: none; padding: 6px 11px; border-radius: 999px; border: 1px solid var(--trait-fort); background: rgba(255,255,255,.04); color: var(--doux); font-weight: 600; font-size: 12px; }
.hl-onglets button.actif { background: #d08aff; color: #1a0f20; border-color: #d08aff; }
.hl-histo { display: grid; gap: 5px; font-size: 12px; }
.hl-histo > div { display: grid; grid-template-columns: auto 1fr auto; gap: 8px; align-items: center; padding: 6px 8px; border-radius: 8px; background: rgba(255,255,255,.04); }
.hl-histo .v { color: #8ee6a6; } .hl-histo .d { color: #ff9a9a; }
.hl-succes { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; }
.hl-succes > div { display: grid; justify-items: center; gap: 2px; padding: 8px 4px; border-radius: 10px; border: 1px solid var(--trait); text-align: center; font-size: 11px; opacity: .45; filter: grayscale(1); }
.hl-succes > div.ok { opacity: 1; filter: none; border-color: rgba(242,181,68,.5); background: rgba(242,181,68,.08); }
.hl-succes .i { font-size: 24px; }
.hl-equipe { display: grid; grid-template-columns: repeat(2, 1fr); gap: 6px; font-size: 12px; }
.hl-equipe > div { padding: 7px 9px; border-radius: 9px; background: rgba(255,255,255,.04); border-left: 3px solid var(--el); }
.hl-coffre { display: grid; gap: 6px; padding: 10px; border-radius: 12px; border: 1px solid rgba(208,138,255,.45); background: linear-gradient(135deg, rgba(208,138,255,.14), rgba(255,255,255,.02)); font-size: 13px; }
`);

// ---------- Historique ----------
export function historiser(type, titre, issue, extra = {}) {
  changer((e) => {
    const l = e.historique || (e.historique = []);
    l.unshift({ t: maintenant(), type, titre, issue, ...extra });
    if (l.length > 40) l.length = 40;
  });
}
const ICONES = { duel: "⚔️", attaque: "🏹", defense: "🛡️", boss: "🐉", tour: "🗼", sauvage: "🌿" };

// ---------- Saisons : une par mois ----------
const RECOMP = [[20, 4, 0], [40, 6, 1], [80, 10, 1], [140, 15, 2], [220, 20, 3], [350, 30, 5]]; // gemmes, braises, cœurs
function idSaison(t = maintenant()) { const d = new Date(t); return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`; }
function finSaison() { const d = new Date(maintenant()); return Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1) - maintenant(); }
export function verifierSaison() {
  const e = E();
  if (!e) return;
  const id = idSaison();
  if (!e.saison) { changer((s) => { s.saison = { id }; }); return; }
  if (e.saison.id === id) return;
  // Nouvelle saison : coffre selon la ligue atteinte, puis les trophées redescendent un peu
  const i = ligueDe(trophees()), [g, b, c] = RECOMP[i];
  changer((s) => {
    s.ressources.gemmes = (s.ressources.gemmes || 0) + g; s.ressources.braises = (s.ressources.braises || 0) + b; s.ressources.coeurs += c;
    if (s.ligue) s.ligue.trophees = Math.round(s.ligue.trophees * 0.75);
    s.saison = { id, derniere: { ligue: LIGUES[i].nom, g, b, c } };
  });
  Son.evolution();
  modale({ titre: `Fin de saison : ligue ${LIGUES[i].nom}`, contenu: `Ton coffre de saison : ${g} gemmes, ${b} braises${c ? `, ${c} cœur${c > 1 ? "s" : ""} de dragon` : ""}. Une nouvelle saison commence : tes trophées redescendent un peu.`, boutons: [{ texte: "Ouvrir le coffre", classe: "principal" }] });
}

// ---------- Succès : la salle des trophées ----------
const SUCCES = [
  ["🥚", "Première éclosion", (e) => e.dragons.length >= 1],
  ["🐲", "Couvée de 7", (e) => e.dragons.length >= 7],
  ["🏰", "Couvée de 14", (e) => e.dragons.length >= 14],
  ["📖", "Livre complet", (e) => e.livre.vus.length >= 21],
  ["✨", "Couvoir céleste", (e) => e.oeufs.couvoir.niveau >= 4],
  ["🗼", "Sommet de la tour", (e) => (e.tourNid && e.tourNid.sommets) > 0],
  ["🥇", "Ligue d'Or", (e) => (e.ligue && e.ligue.record) >= 900],
  ["👑", "Maître", (e) => (e.ligue && e.ligue.record) >= 3200],
  ["🌋", "Dragon-roi abattu", (e) => (e.bossTues || 0) > 0],
  ["🔥", "Village rasé", (e) => (e.attaques && e.attaques.rases) > 0],
  ["⭐", "Un dragon niveau 20", (e) => e.dragons.some((d) => d.niveau >= 20)],
  ["⚔️", "10 victoires classées", (e) => (e.combats && e.combats.gagnes) >= 10],
];

let onglet = "classement";
export function contenuHall(refaire) {
  verifierSaison();
  const e = E();
  const b = el("div", { style: { display: "grid", gap: "10px" } });
  b.append(el("div", { class: "hl-onglets" }, [["classement", "Classement"], ["saison", "Saison"], ["historique", "Historique"], ["trophees", "Trophées"], ["equipe", "Équipe"]].map(([k, n]) =>
    el("button", { class: onglet === k ? "actif" : "", onclick: () => { onglet = k; Son.clic(); refaire(); } }, n))));
  if (onglet === "classement") b.append(blocLigue());
  else if (onglet === "saison") {
    const i = ligueDe(trophees()), [g, br, c] = RECOMP[i];
    b.append(el("div", { class: "hl-coffre" }, el("b", {}, `Saison ${idSaison()} · fin dans ${fmtDuree(finSaison())}`),
      el("span", {}, `Si la saison finissait maintenant (ligue ${LIGUES[i].nom}) : ${g} gemmes, ${br} braises${c ? `, ${c} cœur${c > 1 ? "s" : ""}` : ""}.`),
      el("span", { class: "doux", style: { fontSize: "12px" } }, "À chaque nouvelle saison, tes trophées redescendent de 25 %."),
      e.saison && e.saison.derniere ? el("span", { class: "doux", style: { fontSize: "12px" } }, `Saison passée : ligue ${e.saison.derniere.ligue}.`) : null));
    const tab = el("div", { class: "hl-histo" });
    LIGUES.forEach((l, k) => tab.append(el("div", {}, el("span", { style: { color: l.couleur } }, "◆"), el("span", {}, `${l.nom} (${l.min}+)`), el("span", { class: "num" }, `${RECOMP[k][0]} 💎`))));
    b.append(tab);
  } else if (onglet === "historique") {
    const l = e.historique || [];
    const h = el("div", { class: "hl-histo" });
    if (!l.length) h.append(el("p", { class: "doux" }, "Aucun combat pour l'instant."));
    for (const x of l.slice(0, 25)) {
      const ligne = el("div", {}, el("span", {}, ICONES[x.type] || "•"), el("span", {}, x.titre, el("small", { class: "doux", style: { display: "block" } }, new Date(x.t).toLocaleString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }))),
        el("span", { class: x.issue === "victoire" ? "v" : x.issue === "defaite" ? "d" : "" }, x.issue === "victoire" ? "Victoire" : x.issue === "defaite" ? "Défaite" : x.issue || ""));
      if (x.revanche && window.__revanche) ligne.append(el("button", { class: "btn petit", style: { gridColumn: "1 / -1" }, onclick: () => window.__revanche(x.revanche) }, "Revanche !"));
      h.append(ligne);
    }
    b.append(h);
  } else if (onglet === "trophees") {
    const s = el("div", { class: "hl-succes" });
    let n = 0;
    for (const [i, nom, ok] of SUCCES) { const v = ok(e); if (v) n++; s.append(el("div", { class: v ? "ok" : "" }, el("span", { class: "i" }, i), el("span", {}, nom))); }
    b.append(el("div", { class: "doux", style: { fontSize: "12px" } }, `${n}/${SUCCES.length} trophées dans ta salle.`), s);
  } else {
    const eq = (Array.isArray(e.equipe) ? e.equipe : []).map((u) => e.dragons.find((d) => d.uid === u)).filter(Boolean);
    const l = el("div", { class: "hl-equipe" });
    if (!eq.length) l.append(el("p", { class: "doux" }, "Ton équipe se choisit avant un combat."));
    for (const d of eq) { const src = PAR_ID[d.id]; l.append(el("div", { style: { "--el": ELEMENTS[src.element].couleur } }, el("b", {}, src.nom), el("div", { class: "doux" }, `Niveau ${d.niveau} · ${ELEMENTS[src.element].nom}`))); }
    b.append(el("div", { class: "doux", style: { fontSize: "12px" } }, "L'équipe que tu emmènes en duel classé : c'est elle que voient les autres mages."), l);
  }
  return b;
}
export { icone, toast };
