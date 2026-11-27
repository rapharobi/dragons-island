// Expéditions : on envoie 1 à 3 dragons explorer au-delà des îles pour trouver un œuf (et un peu de butin).
// Plus ils sont nombreux, plus ça va vite. Pendant ce temps ils ne combattent pas. Les gemmes ramènent l'expédition tout de suite.
import { E, changer, maintenant, noter } from "./etat.js";
import { PAR_ID } from "./regles.js";
import { el, toast, barre, icone } from "./ui.js";
import { Son } from "./son.js";

const H = 3600e3;
// Durée : 3 h avec un dragon, 2 h 15 avec deux, 1 h 30 avec trois (pendant le guide : quelques minutes)
export function dureeExpedition(nb, rapide = false) { return (rapide ? 6 * 60e3 : 3 * H) * [1, 1, 0.75, 0.5][Math.min(3, nb)]; }
export function expeditionEnCours() { return E().expedition || null; }

function retour(s) {
  const ex = s.expedition;
  if (!ex) return null;
  const r = s.ressources;
  const gains = { rations: 8 + Math.floor(Math.random() * 10), brindilles: 10 + Math.floor(Math.random() * 15), pierres: 10 + Math.floor(Math.random() * 15) };
  for (const [k, v] of Object.entries(gains)) r[k] += v;
  s.oeufs.choix += 1;
  for (const d of s.dragons) if (d.expedition) delete d.expedition;
  s.expedition = null;
  noter("Expédition revenue avec un œuf !");
  return gains;
}
// Appelé régulièrement : l'expédition revient toute seule quand le temps est écoulé
export function verifierExpedition() {
  const ex = expeditionEnCours();
  if (!ex || maintenant() < ex.fin) return;
  let g = null;
  changer((s) => { g = retour(s); });
  if (g) { Son.eclosion(); toast("L'expédition est revenue avec un œuf ! Va au couvoir pour le choisir.", "bon"); }
}

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
          if (g) { Son.eclosion(); toast("L'expédition rentre avec un œuf !", "bon"); rendre(); }
        } }, icone("gemmes"), `Rappeler · ${gem}`)));
    return b;
  }
  b.append(el("div", { class: "doux", style: { fontSize: "12px" } }, `Envoie 1 à 3 dragons explorer au-delà des îles : ils reviennent avec un œuf et un peu de butin. ${rapide ? "Pour cette première fois, quelques minutes suffisent." : "3 h avec un dragon, 1 h 30 avec trois."} Ils ne peuvent pas combattre pendant ce temps.`));
  const liste = el("div", { style: { display: "flex", gap: "5px", flexWrap: "wrap" } });
  for (const u of [...choisis]) if (!e.dragons.some((d) => d.uid === u && !d.chantier)) choisis.delete(u);
  for (const d of e.dragons) {
    if (d.chantier) continue;
    const on = choisis.has(d.uid);
    liste.append(el("button", { class: "btn petit" + (on ? " principal" : ""), disabled: d.pv <= 0 || (!on && choisis.size >= 3), onclick: () => { on ? choisis.delete(d.uid) : choisis.add(d.uid); Son.clic(); rendre(); } }, `${PAR_ID[d.id].nom} · ${d.niveau}`));
  }
  const nb = choisis.size;
  b.append(liste, el("button", { class: "btn" + (nb ? " principal" : ""), disabled: !nb, onclick: () => {
    setTimeout(() => import("./tuto.js").then((m) => m.signaler("expedition")), 0);
    changer((s) => { const t0 = maintenant(); s.expedition = { debut: t0, fin: t0 + dureeExpedition(nb, rapide) }; for (const d of s.dragons) if (choisis.has(d.uid)) d.expedition = true; });
    choisis.clear(); Son.ailes(0.5); toast("L'expédition s'envole !", "bon"); rendre();
  } }, nb ? `Partir en expédition (${Math.round(dureeExpedition(nb, rapide) / 60000)} min)` : "Choisis 1 à 3 dragons"));
  return b;
}
