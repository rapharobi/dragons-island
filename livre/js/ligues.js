// Les ligues du duel classé : Bronze → Argent → Or → Platine → Diamant → Maître.
// Des mages bots (pseudos crédibles) remplissent chaque ligue ; leurs trophées bougent un peu chaque jour.
// Un match classé se joue contre un mage de ton niveau de trophées : +25 environ si tu gagnes, −15 si tu perds.
import { E, changer, maintenant } from "./etat.js";
import { rng } from "./outils3d.js";
import { el, styles } from "./ui.js";

export const LIGUES = [
  { nom: "Bronze", min: 0, couleur: "#c8834a" },
  { nom: "Argent", min: 400, couleur: "#c9d2dc" },
  { nom: "Or", min: 900, couleur: "#f2c544" },
  { nom: "Platine", min: 1500, couleur: "#7fe0d8" },
  { nom: "Diamant", min: 2300, couleur: "#9ab8ff" },
  { nom: "Maître", min: 3200, couleur: "#d08aff" },
];
const DIV = ["III", "II", "I"];
export function ligueDe(t) { let i = 0; LIGUES.forEach((l, k) => { if (t >= l.min) i = k; }); return i; }
export function nomRang(t) {
  const i = ligueDe(t), l = LIGUES[i];
  if (i === LIGUES.length - 1) return l.nom;
  const pas = (LIGUES[i + 1].min - l.min) / 3;
  return `${l.nom} ${DIV[Math.min(2, Math.floor((t - l.min) / pas))]}`;
}

// ---------- Les mages bots ----------
const PRENOMS = ["Lucas", "Léa", "Hugo", "Chloé", "Nathan", "Inès", "Enzo", "Jade", "Mathis", "Lina", "Noah", "Manon", "Tom", "Zoé", "Yanis", "Camille", "Théo", "Sarah", "Kenzo", "Maëlle", "Adam", "Lou", "Rayan", "Emma", "Sacha", "Nina", "Ethan", "Lola", "Malo", "Alice", "Axel", "Romane", "Ilyes", "Clara", "Gabin", "Elsa", "Timéo", "Anaïs", "Mehdi", "Louna", "Bastien", "Océane", "Kylian", "Mila", "Noé", "Agathe", "Sofiane", "Juliette", "Marius", "Rose"];
const MOTS = ["Dragon", "Pyro", "Givre", "Abysse", "Ombre", "Lave", "Tempête", "Écaille", "Braise", "Cristal", "Wyrm", "Drake", "Rune", "Mage", "Nova", "Flamme", "Glacier", "Marée", "Foudre", "Obsidienne", "Phénix", "Corail", "Sombre", "Lune", "Aube"];
const ANGLAIS = ["Shadow", "Frost", "Blaze", "Storm", "Dark", "Night", "Fire", "Ice", "Hydra", "Titan", "Void", "Ghost", "Wild", "Iron", "Neon"];
function pseudo(r) {
  const p = PRENOMS[Math.floor(r() * PRENOMS.length)], m = MOTS[Math.floor(r() * MOTS.length)], a = ANGLAIS[Math.floor(r() * ANGLAIS.length)];
  const n = Math.floor(r() * 99) + 1, an = 2000 + Math.floor(r() * 16);
  const sans = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "");
  const formes = [
    () => `${p}_${m}`, () => `${sans(p)}${n}`, () => `${m}${p}`, () => `xX${a}${sans(m)}Xx`, () => `${sans(p).toLowerCase()}.${sans(m).toLowerCase()}`,
    () => `${a}_${sans(p)}`, () => `Le${m}${n}`, () => `${sans(p)}${an}`, () => `${a}${m}`, () => `${p}-${m}${n}`,
    () => `Mage${sans(p)}`, () => `${sans(m).toLowerCase()}_${n}`, () => `${sans(p)}DuNord`, () => `${a}Rider${n}`, () => `${p}.${a}`,
  ];
  return formes[Math.floor(r() * formes.length)]();
}
let BOTS = null;
export function bots() {
  if (BOTS) return BOTS;
  const r = rng(4242);
  const vus = new Set();
  BOTS = [];
  while (BOTS.length < 220) {
    const nom = pseudo(r);
    if (vus.has(nom)) continue;
    vus.add(nom);
    // Beaucoup de joueurs en bas, de moins en moins en haut
    const base = Math.round(Math.pow(r(), 1.7) * 3900);
    BOTS.push({ nom, base, element: ["feu", "glace", "eau"][Math.floor(r() * 3)], graine: Math.floor(r() * 1e6) });
  }
  return BOTS;
}
// Les trophées des bots bougent un peu chaque jour : le classement a l'air vivant
function tropheesBot(b) {
  const jour = Math.floor(maintenant() / 864e5);
  const r = rng(b.graine + jour);
  return Math.max(0, b.base + Math.round((r() - 0.45) * 120));
}
function etat() { const e = E(); if (!e.ligue) e.ligue = { trophees: 0, record: 0, matchs: 0, victoires: 0 }; return e.ligue; }
export function trophees() { return etat().trophees; }

// L'adversaire : un mage de ton niveau de trophées (un peu au-dessus ou en dessous)
export function adversaire() {
  const t = trophees();
  const proches = bots().map((b) => ({ ...b, t: tropheesBot(b) })).filter((b) => Math.abs(b.t - t) < 180);
  const l = proches.length ? proches : bots().map((b) => ({ ...b, t: tropheesBot(b) })).sort((a, b) => Math.abs(a.t - t) - Math.abs(b.t - t)).slice(0, 8);
  return l[Math.floor(Math.random() * l.length)];
}
// Bonus de niveau des dragons adverses selon la ligue (plus haut = plus fort)
export function bonusNiveau(t) { return Math.floor(ligueDe(t) / 2); }

export function resultat(issue, adv) {
  let delta = 0;
  changer((e) => {
    const l = e.ligue || (e.ligue = { trophees: 0, record: 0, matchs: 0, victoires: 0 });
    const ecart = adv ? Math.max(-10, Math.min(10, Math.round((adv.t - l.trophees) / 15))) : 0;
    // Battre plus fort que soi rapporte plus ; perdre contre plus fort coûte moins
    delta = issue === "victoire" ? 25 + ecart : issue === "defaite" ? -Math.max(5, 15 - ecart) : 3;
    const avant = ligueDe(l.trophees);
    l.trophees = Math.max(0, l.trophees + delta);
    l.record = Math.max(l.record, l.trophees);
    l.matchs++; if (issue === "victoire") l.victoires++;
    l.monte = ligueDe(l.trophees) > avant ? LIGUES[ligueDe(l.trophees)].nom : null;
  });
  return { delta, monte: E().ligue.monte };
}

// ---------- Affichage : ta ligue et son classement ----------
styles("ligues", `
.lg { display: grid; gap: 8px; padding: 12px; border-radius: 12px; border: 1px solid var(--trait); background: rgba(255,255,255,.03); }
.lg-tete { display: flex; align-items: center; gap: 10px; }
.lg-blason { width: 40px; height: 44px; flex: none; display: grid; place-items: center; font: 700 12px var(--titre); color: #120d08; clip-path: polygon(50% 0, 100% 20%, 100% 70%, 50% 100%, 0 70%, 0 20%); }
.lg-tete b { font-family: var(--titre); font-size: 16px; } .lg-tete small { color: var(--doux); font-size: 12px; display: block; }
.lg-liste { display: grid; gap: 2px; font-size: 12px; max-height: 210px; overflow: auto; }
.lg-ligne { display: grid; grid-template-columns: 28px 1fr auto; gap: 6px; padding: 4px 6px; border-radius: 6px; }
.lg-ligne.moi { background: rgba(242,181,68,.16); color: var(--ambre); font-weight: 700; }
.lg-ligne .num { text-align: right; }
`);
export function blocLigue() {
  const t = trophees(), i = ligueDe(t), l = LIGUES[i];
  const suivant = LIGUES[i + 1];
  const moi = E().reglages.nomMage || E().joueur?.nom || "Toi";
  const autour = bots().map((b) => ({ nom: b.nom, t: tropheesBot(b) })).filter((b) => ligueDe(b.t) === i);
  autour.push({ nom: moi, t, moi: true });
  autour.sort((a, b) => b.t - a.t);
  const rang = autour.findIndex((x) => x.moi) + 1;
  const liste = el("div", { class: "lg-liste" });
  autour.slice(0, 40).forEach((x, k) => liste.append(el("div", { class: "lg-ligne" + (x.moi ? " moi" : "") }, el("span", { class: "num" }, `${k + 1}.`), el("span", {}, x.nom), el("span", { class: "num" }, `🏆 ${x.t}`))));
  if (rang > 40) liste.append(el("div", { class: "lg-ligne moi" }, el("span", { class: "num" }, `${rang}.`), el("span", {}, moi), el("span", { class: "num" }, `🏆 ${t}`)));
  return el("div", { class: "lg" },
    el("div", { class: "lg-tete" }, el("div", { class: "lg-blason", style: { background: l.couleur } }, l.nom.slice(0, 2).toUpperCase()),
      el("div", {}, el("b", {}, nomRang(t)), el("small", {}, `🏆 ${t} trophées · ${rang}e sur ${autour.length}${suivant ? ` · ${suivant.nom} à ${suivant.min}` : ""}`))),
    liste);
}
