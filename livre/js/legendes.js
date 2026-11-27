// Le mode histoire : le Portail des Légendes. Chaque niveau de l'île Mère ouvre une quête de 5 étapes qui alternent
// combats de dragons et attaques de bases ennemies, jusqu'au chef de la quête. La dernière quête se termine par le
// boss final, qu'on ne bat qu'avec ses meilleurs dragons : c'est là, et seulement là, qu'on trouve l'œuf noir.
import { E, changer, maintenant, noter } from "./etat.js";
import { PAR_ID, ELEMENTS } from "./regles.js";
import { el, styles, toast, modale, barre } from "./ui.js";
import { Son } from "./son.js";

styles("legendes", `
.lg-quetes { display: grid; gap: 6px; }
.lg-q { display: grid; grid-template-columns: 1fr auto; gap: 2px 8px; align-items: center; text-align: left; padding: 9px 11px; border-radius: 12px; border: 1px solid var(--trait); background: rgba(255,255,255,.04); color: var(--texte); }
.lg-q.actif { border-color: #ffd27a; background: rgba(255,210,122,.1); }
.lg-q.ferme { opacity: .5; }
.lg-q b { font-family: var(--titre); font-size: 14px; }
.lg-q small { grid-column: 1 / -1; color: var(--doux); font-size: 11px; }
.lg-q .num { font: 700 12px var(--mono); color: #ffd27a; }
.lg-etapes { display: grid; gap: 5px; }
.lg-e { display: grid; grid-template-columns: 30px 1fr auto; gap: 8px; align-items: center; padding: 8px 10px; border-radius: 10px; background: rgba(255,255,255,.04); font-size: 12.5px; }
.lg-e .i { font-size: 18px; text-align: center; }
.lg-e.fait { opacity: .6; }
.lg-e.suivante { border: 1px solid #ffd27a; background: rgba(255,210,122,.12); }
.lg-e small { display: block; color: var(--doux); font-size: 11px; }
.lg-recit { font-style: italic; color: #e0d4b8; font-size: 12.5px; margin: 0; }
`);

// Équipe ennemie : [espèce, niveau]. Type : « duel » (combat de dragons), « base » (attaque d'une base), « chef ».
export const QUETES = [
  {
    titre: "Les Pillards des brumes", ile: 1,
    recit: "Une bande de pillards rôde dans les brumes autour de l'île Mère. Leur chef, Grakk, veut voler tes œufs.",
    etapes: [
      { type: "duel", nom: "Éclaireurs des brumes", texte: "Deux dragons éclaireurs te barrent la route.", ennemis: [["micho", 3], ["neve", 3]] },
      { type: "base", nom: "Camp des pillards", texte: "Leur camp flotte à la lisière des brumes. Rase-le !", niveau: 2 },
      { type: "duel", nom: "Les Jumeaux de cendre", texte: "Deux dragons de feu jumeaux, rapides et rusés.", ennemis: [["pyrok", 4], ["braisil", 4], ["ruisselin", 3]] },
      { type: "base", nom: "Forteresse des brumes", texte: "La forteresse de Grakk, protégée par des tours.", niveau: 3 },
      { type: "chef", nom: "Grakk le Pillard", texte: "Le chef des pillards et ses dragons les plus féroces.", ennemis: [["cendrak", 6], ["stalak", 5], ["coralys", 5]], pv: 1.2 },
    ],
  },
  {
    titre: "Le Culte de la Glace noire", ile: 2,
    recit: "Des mages en robe noire gèlent les sources des îles. Ils prient un dragon de glace oublié.",
    etapes: [
      { type: "duel", nom: "Gardiens du givre", texte: "Les dragons gardiens du culte, tous de glace.", ennemis: [["givrelin", 7], ["frimas", 7], ["neve", 6]] },
      { type: "base", nom: "Le Sanctuaire gelé", texte: "Le sanctuaire du culte, sur une île de glace.", niveau: 4 },
      { type: "duel", nom: "Les Sœurs de l'hiver", texte: "Trois prêtresses et leurs dragons.", ennemis: [["glaciarque", 8], ["crysalis", 8], ["abyssor", 7]] },
      { type: "base", nom: "La Citadelle de glace noire", texte: "Le cœur du culte : des murs de glace noire.", niveau: 5 },
      { type: "chef", nom: "Morvane, la Prêtresse noire", texte: "Elle a réveillé un blizzard vivant.", ennemis: [["blizzar", 10], ["glaciarque", 9], ["stalak", 9], ["tsunagi", 8]], pv: 1.25 },
    ],
  },
  {
    titre: "Les Abysses rugissantes", ile: 3,
    recit: "Sous la mer du continent, quelque chose se réveille. Les marins disparaissent et les vagues hurlent.",
    etapes: [
      { type: "duel", nom: "Les Chasseurs des récifs", texte: "Des dragons d'eau affamés sortent des récifs.", ennemis: [["coralys", 11], ["tsunagi", 11], ["ondin", 10]] },
      { type: "base", nom: "Le Port englouti", texte: "Un port pirate à moitié noyé.", niveau: 6 },
      { type: "duel", nom: "La Garde des abysses", texte: "Les gardiens des profondeurs, lourds et puissants.", ennemis: [["abyssor", 12], ["marenith", 12], ["fournaise", 11], ["stalak", 11]] },
      { type: "base", nom: "La Cité des marées", texte: "Une cité sous une bulle d'eau, bien défendue.", niveau: 7 },
      { type: "chef", nom: "Vorasque, l'Avaleur de navires", texte: "Le monstre des abysses lui-même.", ennemis: [["vorasque", 14], ["marenith", 13], ["tsunagi", 13], ["blizzar", 12]], pv: 1.3 },
    ],
  },
  {
    titre: "La Couronne de Feu", ile: 4,
    recit: "Un roi-mage veut régner sur tout le continent. Il porte une couronne forgée dans la lave d'un volcan.",
    etapes: [
      { type: "duel", nom: "L'Avant-garde royale", texte: "Les chevaliers-dragons du roi.", ennemis: [["solarion", 15], ["ignivelle", 15], ["crysalis", 14], ["coralys", 14]] },
      { type: "base", nom: "Le Bastion de lave", texte: "Un bastion bâti sur une coulée de lave.", niveau: 8 },
      { type: "duel", nom: "Les Généraux de braise", texte: "Les trois généraux du roi.", ennemis: [["fournaise", 16], ["cendrak", 16], ["glaciarque", 15], ["vorasque", 15]] },
      { type: "base", nom: "Le Palais du roi-mage", texte: "Le palais royal, ses tours et sa garde.", niveau: 9 },
      { type: "chef", nom: "Ignar, le Roi couronné", texte: "Le roi-mage et ses dragons d'élite.", ennemis: [["solarion", 18], ["fournaise", 18], ["blizzar", 17], ["marenith", 17], ["ignivelle", 17]], pv: 1.35 },
    ],
  },
  {
    titre: "Le Cœur du Néant", ile: 5,
    recit: "Au-delà du continent, là où la carte s'arrête, une ombre dévore les îles une à une. Lia tremble : c'est le quatrième élément.",
    etapes: [
      { type: "duel", nom: "Les Ombres errantes", texte: "Des dragons vidés de leur couleur, possédés par l'ombre.", ennemis: [["pyrok", 19], ["stalak", 19], ["abyssor", 19], ["ignivelle", 19]] },
      { type: "base", nom: "La Brèche", texte: "Une île déchirée par l'ombre, hérissée de tours noires.", niveau: 10 },
      { type: "duel", nom: "Les Sentinelles du vide", texte: "Les gardiens du Néant.", ennemis: [["fournaise", 20], ["crysalis", 20], ["tsunagi", 20], ["cendrak", 20]] },
      { type: "base", nom: "Le Sanctuaire du Néant", texte: "La dernière forteresse avant le cœur.", niveau: 10 },
      { type: "chef", nom: "Le Dragon sans Nom", texte: "Le boss final. Il ne peut être vaincu qu'avec tes meilleurs dragons, tous au sommet de leur puissance.", ennemis: [["solarion", 20], ["blizzar", 20], ["vorasque", 20], ["fournaise", 20], ["marenith", 20]], pv: 1.8, final: true },
    ],
  },
];

const etat = () => { const e = E(); if (!e.legendes) e.legendes = {}; return e.legendes; };
export const progres = (q) => etat()[q] || 0;
export const ouverte = (q) => E().oeufs.couvoir.niveau >= q;
export function etape(q, s) { return QUETES[q] && QUETES[q].etapes[s]; }
// Où en est le joueur : la première quête ouverte et pas finie
export function enCours() { for (let q = 0; q < QUETES.length; q++) if (ouverte(q) && progres(q) < 5) return q; return -1; }
export function statutLegendes() {
  const q = enCours();
  if (q < 0) return [progres(4) >= 5 ? "Légende accomplie !" : "Améliore l'île Mère", false, false];
  return [`Quête ${q + 1} · étape ${progres(q) + 1}/5`, false, progres(q) === 0];
}

// Une étape réussie : récompenses, et à la fin d'une quête un coffre (le boss final donne l'œuf noir)
export function reussir(q, s) {
  const gains = [];
  const et = etape(q, s);
  changer((e) => {
    const l = e.legendes || (e.legendes = {});
    if ((l[q] || 0) > s) { gains.push("Étape déjà réussie : pas de nouveau butin."); return; }
    l[q] = s + 1;
    const r = e.ressources;
    const g = 10 + q * 8 + s * 2;
    r.gemmes = (r.gemmes || 0) + g; r.brindilles += 30 + q * 20; r.pierres += 30 + q * 20;
    gains.push(`+${g} gemmes`, `+${30 + q * 20} brindilles`, `+${30 + q * 20} pierres`);
    if (et.type === "chef") {
      e.oeufs.choix += 1; r.coeurs += 1 + q; r.braises = (r.braises || 0) + 4;
      gains.push("+1 œuf", `+${1 + q} cœur${q ? "s" : ""} de dragon`, "+4 braises", `Quête « ${QUETES[q].titre} » terminée !`);
      if (et.final && !e.oeufNoir) { e.oeufNoir = { t: maintenant(), ou: "histoire" }; gains.push("… et, dans les restes du Dragon sans Nom, un œuf noir."); }
    }
    noter(`Histoire : ${et.nom} réussi.`);
  });
  return gains;
}
// Après une attaque de base de l'histoire
export function finBase(q, s, victoire) {
  if (!victoire) { toast("La base tient encore. Renforce tes dragons et réessaie !", "mal"); return; }
  const g = reussir(q, s);
  Son.victoire();
  modale({ titre: `${etape(q, s).nom} : réussi !`, contenu: g.join(" · "), boutons: [{ texte: "Continuer", classe: "principal" }] });
}

// ---------- La fiche du Portail des Légendes ----------
let quoi = null;
export function blocLegendes(lancer, refaire) {
  const b = el("div", { style: { display: "grid", gap: "10px" } });
  if (quoi === null) quoi = Math.max(0, enCours());
  const liste = el("div", { class: "lg-quetes" });
  QUETES.forEach((Q, q) => {
    const ok = ouverte(q), p = progres(q);
    liste.append(el("button", { class: `lg-q ${quoi === q ? "actif" : ""} ${ok ? "" : "ferme"}`, disabled: !ok, onclick: () => { Son.clic(); quoi = q; refaire(); } },
      el("b", {}, `${q + 1}. ${ok ? Q.titre : "???"}`), el("span", { class: "num" }, ok ? (p >= 5 ? "✓" : `${p}/5`) : "🔒"),
      el("small", {}, ok ? (p >= 5 ? "Quête terminée" : `Étape ${p + 1} sur 5`) : `S'ouvre au niveau ${Q.ile} de l'île Mère`)));
  });
  b.append(liste);
  const Q = QUETES[quoi];
  if (!Q || !ouverte(quoi)) return b;
  const p = progres(quoi);
  b.append(el("p", { class: "lg-recit" }, Q.recit), barre(p, 5, "xp"));
  const etapes = el("div", { class: "lg-etapes" });
  Q.etapes.forEach((et, s) => {
    const suivante = s === p, fait = s < p;
    const icone = et.type === "base" ? "🏰" : et.type === "chef" ? (et.final ? "🌑" : "👑") : "⚔️";
    const detail = et.type === "base" ? `Attaque de base · niveau ${et.niveau}` : `${et.ennemis.length} dragons · niveau ${Math.max(...et.ennemis.map((x) => x[1]))}${et.pv ? " · renforcés" : ""}`;
    etapes.append(el("div", { class: `lg-e ${fait ? "fait" : ""} ${suivante ? "suivante" : ""}` }, el("span", { class: "i" }, fait ? "✓" : icone),
      el("div", {}, el("b", {}, s <= p ? et.nom : "???"), el("small", {}, s <= p ? `${detail}. ${et.texte}` : "Termine l'étape précédente.")),
      suivante ? el("button", { class: "btn principal petit", onclick: () => lancer(quoi, s, et) }, et.type === "base" ? "Attaquer" : "Combattre") : el("span")));
  });
  b.append(etapes);
  if (Q.etapes[4].final) b.append(el("p", { class: "doux", style: { fontSize: "12px", margin: 0 } }, "Le Dragon sans Nom et sa garde sont tous au niveau 20, avec bien plus de PV. Emmène tes meilleurs dragons, évolués et bien nourris."));
  return b;
}
export { PAR_ID, ELEMENTS };
