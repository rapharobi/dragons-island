// Expéditions : on envoie 1 à 3 dragons explorer au-delà des îles pour trouver un œuf (et un peu de butin).
// Plus ils sont nombreux, plus ça va vite. Pendant ce temps ils ne combattent pas. Les gemmes ramènent l'expédition tout de suite.
import { E, changer, maintenant, noter } from "./etat.js";
import { PAR_ID } from "./regles.js";
import { el, toast, barre, icone } from "./ui.js";
import { Son } from "./son.js";

const H = 3600e3;
// Toujours 3 h (pendant le guide : quelques minutes). Le port des dirigeables s'améliore pour envoyer plus de dragons.
export function dureeExpedition(nb, rapide = false) { return rapide ? 6 * 60e3 : 3 * H; }
export const NIVEAU_EXPEDITION = 5;
export const PORT = [null, { places: 1 }, { places: 2, cout: { brindilles: 150, pierres: 150, obsidienne: 20, givrite: 20, corail: 20 } }, { places: 3, cout: { brindilles: 400, pierres: 400, obsidienne: 50, givrite: 50, corail: 50, coeurs: 1 } }];
export const niveauPort = () => (E().port && E().port.niveau) || 1;
export const portOuvert = () => E().oeufs.couvoir.niveau >= 1;
export function expeditionEnCours() { return E().expedition || null; }

function retour(s) {
  const ex = s.expedition;
  if (!ex) return null;
  const r = s.ressources;
  const nb = s.dragons.filter((d) => d.expedition).length;
  const gains = { rations: 8 + Math.floor(Math.random() * 10), brindilles: 10 + Math.floor(Math.random() * 15), pierres: 10 + Math.floor(Math.random() * 15) };
  for (const [k, v] of Object.entries(gains)) r[k] += v;
  // Un œuf n'est pas garanti : plus il y a de dragons, plus la chance est grande (garanti pendant le guide)
  const oeuf = ex.guide || Math.random() < 0.25 + 0.12 * nb;
  if (oeuf) { s.oeufs.choix += 1; gains.oeuf = 1; }
  else { const t = Math.random(); if (t < 0.4) { gains.gemmes = 10 + Math.floor(Math.random() * 16); r.gemmes = (r.gemmes || 0) + gains.gemmes; } else if (t < 0.7) { gains.braises = 2 + Math.floor(Math.random() * 3); r.braises = (r.braises || 0) + gains.braises; } else { const m = ["obsidienne", "givrite", "corail"][Math.floor(Math.random() * 3)]; gains[m] = 10 + Math.floor(Math.random() * 15); r[m] += gains[m]; } }
  for (const d of s.dragons) if (d.expedition) delete d.expedition;
  s.expedition = null;
  noter(oeuf ? "Expédition revenue avec un œuf !" : "Expédition revenue avec du butin.");
  return gains;
}
// Appelé régulièrement : l'expédition revient toute seule quand le temps est écoulé
export function verifierExpedition() {
  const ex = expeditionEnCours();
  if (!ex || maintenant() < ex.fin) return;
  let g = null;
  changer((s) => { g = retour(s); });
  if (g) { Son.eclosion(); toast(g.oeuf ? "L'expédition est revenue avec un œuf ! Il t'attend sur l'autel du couvoir." : `L'expédition est revenue : ${texteGains(g)}.`, "bon"); }
}
function texteGains(g) { return Object.entries(g).filter(([k]) => k !== "oeuf").map(([k, v]) => `+${v} ${k}`).join(", "); }

const choisis = new Set();
export function blocExpedition(rendre, rapide = false) {
  const e = E();
  const b = el("div", { class: "carte", style: { display: "grid", gap: "8px" } }, el("div", { class: "ligne" }, el("b", {}, "Expédition")));
  const ex = e.expedition;
  if (ex) {
    const reste = Math.max(0, ex.fin - maintenant()), total = ex.fin - ex.debut;
    const gem = Math.max(1, Math.ceil(reste / 60000 / 6));
    const noms = e.dragons.filter((d) => d.expedition).map((d) => PAR_ID[d.id].nom).join(", ");
    b.append(el("div", { class: "doux", style: { fontSize: "12px" } }, `${noms} explorent les nuages à la recherche d'un œuf.`), barre(total - reste, total, "xp"),
      el("div", { style: { display: "flex", gap: "6px", flexWrap: "wrap", alignItems: "center" } }, el("span", { class: "num", style: { fontSize: "13px" } }, reste ? `Retour dans ${Math.ceil(reste / 60000)} min` : "Retour imminent…"),
        el("button", { class: "btn petit principal", disabled: (e.ressources.gemmes || 0) < gem, onclick: () => {
          let g = null; changer((s) => { if ((s.ressources.gemmes || 0) >= gem) { s.ressources.gemmes -= gem; g = retour(s); } });
          if (g) { Son.eclosion(); toast(g.oeuf ? "L'expédition rentre avec un œuf !" : `L'expédition rentre : ${texteGains(g)}.`, "bon"); rendre(); }
        } }, icone("gemmes"), `Rappeler · ${gem}`)));
    return b;
  }
  if (!portOuvert() && !rapide) { b.append(el("div", { class: "doux", style: { fontSize: "12px" } }, "Le port des dirigeables ouvre quand le couvoir atteint le niveau 2.")); return b; }
  const places = rapide ? 1 : PORT[niveauPort()].places;
  b.append(el("div", { class: "doux", style: { fontSize: "12px" } }, `Envoie ${places > 1 ? `jusqu'à ${places} dragons` : "un dragon"} de niveau ${NIVEAU_EXPEDITION} ou plus explorer les terres inconnues : ${rapide ? "pour cette première fois, quelques minutes suffisent, et un œuf est garanti." : "3 h de voyage. Ils reviennent avec du butin et, parfois, un œuf (plus de chances à plusieurs)."} Ils ne peuvent pas combattre pendant ce temps.`));
  const liste = el("div", { style: { display: "flex", gap: "5px", flexWrap: "wrap" } });
  for (const u of [...choisis]) if (!e.dragons.some((d) => d.uid === u && !d.chantier)) choisis.delete(u);
  for (const d of e.dragons) {
    if (d.chantier) continue;
    const on = choisis.has(d.uid);
    const tropJeune = !rapide && d.niveau < NIVEAU_EXPEDITION;
    liste.append(el("button", { class: "btn petit" + (on ? " principal" : ""), title: tropJeune ? `Niveau ${NIVEAU_EXPEDITION} requis` : "", disabled: d.pv <= 0 || tropJeune || (!on && choisis.size >= places), onclick: () => { on ? choisis.delete(d.uid) : choisis.add(d.uid); Son.clic(); rendre(); } }, `${PAR_ID[d.id].nom} · ${d.niveau}${tropJeune ? " 🔒" : ""}`));
  }
  // Améliorer le port : plus de dragons à la fois
  const np = niveauPort(), suiv = PORT[np + 1];
  if (!rapide && suiv) {
    const ok = Object.entries(suiv.cout).every(([k, v]) => (e.ressources[k] || 0) >= v);
    b.append(el("button", { class: "btn petit", disabled: !ok, onclick: () => {
      changer((s) => { for (const [k, v] of Object.entries(suiv.cout)) s.ressources[k] -= v; s.port = { niveau: np + 1 }; });
      Son.evolution(); toast(`Le port des dirigeables passe au niveau ${np + 1} : ${suiv.places} dragons à la fois !`, "bon"); rendre();
    } }, `⚓ Agrandir le port (niv. ${np + 1}) : ${Object.entries(suiv.cout).map(([k, v]) => `${v} ${k}`).join(", ")}`));
  }
  const nb = choisis.size;
  b.append(liste, el("button", { class: "btn" + (nb ? " principal" : ""), disabled: !nb, onclick: () => {
    setTimeout(() => import("./tuto.js").then((m) => m.signaler("expedition")), 0);
    changer((s) => { const t0 = maintenant(); s.expedition = { debut: t0, fin: t0 + dureeExpedition(nb, rapide), guide: rapide }; for (const d of s.dragons) if (choisis.has(d.uid)) d.expedition = true; });
    choisis.clear(); Son.ailes(0.5); toast("L'expédition s'envole !", "bon"); rendre();
  } }, nb ? `Partir en expédition (${rapide ? `${Math.round(dureeExpedition(nb, rapide) / 60000)} min` : "3 h"})` : places > 1 ? `Choisis 1 à ${places} dragons` : "Choisis un dragon"));
  return b;
}
