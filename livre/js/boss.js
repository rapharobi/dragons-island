// Le dragon-roi de la semaine : un dragon géant se réveille chaque lundi dans le volcan du sud.
// Sa barre de vie est partagée sur toute la semaine : chaque combat lui en retire. Des paliers de
// récompenses tombent à 25 %, 50 %, 75 % et 100 %.
import { E, changer, maintenant } from "./etat.js";
import { PAR_ID, fmtDuree } from "./regles.js";
import { el, styles, barre, icone } from "./ui.js";

const ROIS = ["fournaise", "blizzar", "vorasque", "solarion", "crysalis", "marenith"];
const JOUR = 864e5;
export const PALIERS = [
  { k: 0.25, texte: "25 gemmes", donner: (r) => { r.gemmes = (r.gemmes || 0) + 25; } },
  { k: 0.5, texte: "40 gemmes · 6 braises", donner: (r) => { r.gemmes = (r.gemmes || 0) + 40; r.braises = (r.braises || 0) + 6; } },
  { k: 0.75, texte: "60 gemmes · 1 cœur de dragon", donner: (r) => { r.gemmes = (r.gemmes || 0) + 60; r.coeurs = (r.coeurs || 0) + 1; } },
  { k: 1, texte: "1 œuf · 100 gemmes · 2 cœurs", donner: (r, e) => { r.gemmes = (r.gemmes || 0) + 100; r.coeurs = (r.coeurs || 0) + 2; e.oeufs.choix += 1; } },
];

styles("boss", `
.bs { display: grid; gap: 8px; }
.bs-tete { display: flex; justify-content: space-between; align-items: baseline; gap: 8px; }
.bs-tete b { font-family: var(--titre); font-size: 17px; color: #ff8a6a; }
.bs-pal { display: grid; gap: 4px; font-size: 12px; }
.bs-pal div { display: flex; justify-content: space-between; gap: 8px; padding: 5px 8px; border-radius: 8px; background: rgba(255,255,255,.04); }
.bs-pal div.ok { background: rgba(111,214,138,.14); color: #b8f0c8; }
`);

// Lundi 0 h (UTC) de la semaine en cours
export function semaine() {
  const d = new Date(maintenant());
  const j = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  return j - ((new Date(j).getUTCDay() + 6) % 7) * JOUR;
}
export function boss() {
  const e = E(), s = semaine();
  if (!e.boss || e.boss.semaine !== s) {
    const id = ROIS[Math.floor(s / (7 * JOUR)) % ROIS.length];
    const meilleur = e.dragons.reduce((m, d) => Math.max(m, d.niveau), 1);
    const niveau = Math.min(20, meilleur + 3);
    const max = 2400 + niveau * 380;
    e.boss = { semaine: s, id, niveau, max, pv: max, paliers: [], combats: 0, tues: (e.boss && e.boss.tues) || 0 };
  }
  return e.boss;
}
export const nomBoss = () => `${PAR_ID[boss().id].nom}, le dragon-roi`;
export function resteSemaine() { return semaine() + 7 * JOUR - maintenant(); }
// Inflige des dégâts au dragon-roi ; renvoie les récompenses débloquées
export function infliger(n) {
  const gains = [];
  changer((e) => {
    const B = boss();
    B.pv = Math.max(0, B.pv - Math.round(n)); B.combats++;
    const fait = 1 - B.pv / B.max;
    PALIERS.forEach((p, i) => { if (fait >= p.k - 1e-9 && !B.paliers.includes(i)) { B.paliers.push(i); p.donner(e.ressources, e); gains.push(`Palier ${Math.round(p.k * 100)} % : ${p.texte}`); } });
    if (B.pv <= 0 && !B.mort) { B.mort = true; B.tues = (B.tues || 0) + 1; e.bossTues = (e.bossTues || 0) + 1; }
  });
  return gains;
}
export function blocBoss(lancer) {
  const B = boss();
  const fait = 1 - B.pv / B.max;
  const b = el("div", { class: "bs" },
    el("div", { class: "bs-tete" }, el("b", {}, nomBoss()), el("span", { class: "num doux" }, `niv. ${B.niveau}`)),
    barre(B.pv, B.max, "pv"),
    el("div", { class: "doux", style: { fontSize: "12px" } }, B.pv > 0 ? `${B.pv.toLocaleString("fr-FR")} / ${B.max.toLocaleString("fr-FR")} PV · il repart dans ${fmtDuree(resteSemaine())} · ${B.combats} combat${B.combats > 1 ? "s" : ""} cette semaine` : "Abattu cette semaine ! Un nouveau dragon-roi se réveille lundi."));
  const pal = el("div", { class: "bs-pal" });
  PALIERS.forEach((p, i) => pal.append(el("div", { class: B.paliers.includes(i) ? "ok" : "" }, el("span", {}, `${B.paliers.includes(i) ? "✓" : "○"} ${Math.round(p.k * 100)} %`), el("span", {}, p.texte))));
  b.append(pal);
  if (B.pv > 0) b.append(el("button", { class: "btn principal", onclick: lancer }, `Affronter le dragon-roi (${Math.round(fait * 100)} % abattu)`));
  return b;
}
