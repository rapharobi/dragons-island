// Toutes les règles du jeu au même endroit. Les chiffres des dragons viennent de donnees.js (calculés par outils/generer.py).
import { DONNEES } from "./donnees.js";
import { ARMURES_STYLES, MOTIFS } from "./genomes.js";

export const R = DONNEES.regles;
export const TOURS = DONNEES.tours_combat || 9;
export const DRAGONS = DONNEES.dragons;
export const PAR_ID = Object.fromEntries(DRAGONS.map((d) => [d.id, d]));
export const STADES = R.stades;
export const PALIERS = R.paliers;

// Relations entre éléments : une table, pour pouvoir en ajouter plus tard.
export const ELEMENTS = {
  feu: { nom: "Feu", couleur: "#ff6a3d", bat: ["glace"], materiau: "obsidienne" },
  glace: { nom: "Glace", couleur: "#7fd6ff", bat: ["eau"], materiau: "givrite" },
  eau: { nom: "Eau", couleur: "#2fd0c0", bat: ["feu"], materiau: "corail" },
};
// Proposition pour la mise à jour des 3 nouveaux éléments (pas encore en jeu).
// Chacun bat 2 éléments (un ancien, un nouveau), perd contre 2, et reste neutre contre 1.
export const ELEMENTS_FUTURS = {
  feu: { nom: "Feu", couleur: "#ff6a3d", bat: ["glace", "vent"] },
  glace: { nom: "Glace", couleur: "#7fd6ff", bat: ["eau", "foudre"] },
  eau: { nom: "Eau", couleur: "#2fd0c0", bat: ["feu", "terre"] },
  foudre: { nom: "Foudre", couleur: "#f4e04a", bat: ["eau", "vent"], futur: true },
  terre: { nom: "Terre", couleur: "#b88a5a", bat: ["feu", "foudre"], futur: true },
  vent: { nom: "Vent", couleur: "#bfe8c8", bat: ["glace", "terre"], futur: true },
};

export const domine = (a, b) => ELEMENTS[a].bat.includes(b);

export const MATERIAUX = {
  brindilles: { nom: "Brindilles", desc: "On les trouve en cassant les buissons, ou les épaves qui flottent dans le lagon de l'île d'Eau." },
  pierres: { nom: "Pierres", desc: "On les trouve en cassant les rochers." },
  obsidienne: { nom: "Obsidienne", desc: "Roche noire de l'île de Feu." },
  givrite: { nom: "Givrite", desc: "Cristal bleu de l'île de Glace." },
  corail: { nom: "Corail", desc: "Branches roses de l'île d'Eau, et morceaux des récifs du lagon que cassent les dragons nageurs." },
  coeurs: { nom: "Cœurs de dragon", desc: "Gagnés en remportant un duel de mage classé (+1 par victoire), ou dans le pack Seigneur des dragons. Servent aux nids uniques." },
  braises: { nom: "Braises d'éclosion", desc: "Réchauffent un œuf du couvoir : chaque braise le fait avancer d'un quart. S'achètent à la boutique." },
  rations: { nom: "Rations", desc: "Nourriture de base, gagnée en combat et sur les buissons. Rend des PV." },
  rations_feu: { nom: "Piments de lave", desc: "Nourriture de feu, donnée par le volcan. Donne de l'expérience et permet aux dragons de feu de dépasser le niveau 10." },
  rations_glace: { nom: "Baies de givre", desc: "Nourriture de glace, donnée par le glacier. Donne de l'expérience et permet aux dragons de glace de dépasser le niveau 10." },
  rations_eau: { nom: "Poissons des abysses", desc: "Nourriture d'eau, donnée par le tourbillon. Donne de l'expérience et permet aux dragons d'eau de dépasser le niveau 10." },
};

// ---------- Habitats : où chaque dragon peut faire son nid ----------
export const HABITATS = {
  braisil: "terre", pyrok: "cheminee", ignivelle: "perchoir", cendrak: "cheminee", solarion: "perchoir", fournaise: "cheminee", micho: "terre",
  givrelin: "terre", glaciarque: "terre", stalak: "terre", blizzar: "perchoir", crysalis: "terre", frimas: "perchoir", neve: "terre",
  ondin: "surface", abyssor: "fond", coralys: "fond", tsunagi: "surface", marenith: "surface", vorasque: "fond", ruisselin: "terre",
};
export const NOMS_HABITAT = {
  terre: "Sur la terre ferme", perchoir: "En hauteur, sur un perchoir", cheminee: "Près d'une cheminée de lave",
  surface: "À la surface de l'eau", fond: "Au fond de l'eau",
};
export const COULEUR_HABITAT = { terre: 0x8ad06a, perchoir: 0xffd04a, cheminee: 0xff6a2a, surface: 0x5ad8ff, fond: 0x3a6aff };
export const habitatDe = (id) => HABITATS[id] || "terre";

// ---------- Sources magiques (une par île, à la place des fermes) ----------
// Niveau 0 : endormie. 1 : réveillée par le dragon clé + un autre dragon de l'élément.
// 2 : 3 dragons de l'élément au niveau 5. 3 : les 7 dragons de l'élément au niveau 15.
export const SOURCES = {
  feu: { cle: "pyrok", nomCle: "dragon magma", noms: ["Fissure de lave", "Volcan", "Volcan grondant", "Volcan ancestral"], nourriture: "rations_feu", verbe: "Réveiller le volcan" },
  glace: { cle: "glaciarque", nomCle: "dragon glacier", noms: ["Crevasse gelée", "Glacier", "Glacier bleu", "Glacier ancestral"], nourriture: "rations_glace", verbe: "Éveiller le glacier" },
  eau: { cle: "abyssor", nomCle: "léviathan", noms: ["Gouffre endormi", "Tourbillon", "Grand tourbillon", "Tourbillon ancestral"], nourriture: "rations_eau", verbe: "Ouvrir le tourbillon" },
};
export const PRODUCTION_SOURCE = [{ parHeure: 0, max: 0 }, { parHeure: 6, max: 24 }, { parHeure: 15, max: 60 }, { parHeure: 30, max: 150 }];
export const CONDITIONS_SOURCE = [null, null, { nombre: 3, niveau: 5 }, { nombre: 7, niveau: 15 }];
export const XP_RATION_ELEMENT = 40;
export const NIVEAU_PERCEE = 10; // au-delà, chaque niveau demande une ration de l'élément

// ---------- Combat ----------
export function degats(atk, def, elA, elD, bonusA, faibD, alea = 1) {
  const base = atk * R.force * R.amorti / (R.amorti + def);
  // Frapper l'élément qu'on bat : bonus + faiblesse adverse. Frapper l'élément qui nous bat : malus.
  const mult = domine(elA, elD) ? 1 + bonusA + faibD : domine(elD, elA) ? (R.malus_domine ?? 0.7) : 1;
  return base * mult * alea;
}
export function tirerAlea(rnd = Math.random) {
  let a = R.alea[0] + rnd() * (R.alea[1] - R.alea[0]);
  let chance = false;
  if (rnd() < R.chance) { a *= R.mult_chance; chance = true; }
  return { a, chance };
}
export const ESPERANCE = ((R.alea[0] + R.alea[1]) / 2) * (1 + R.chance * (R.mult_chance - 1));

// ---------- Progression ----------
export const NIVEAU_MAX = 20;
export function stadeDuNiveau(n) { let s = 0; PALIERS.forEach((p, i) => { if (n >= p) s = i; }); return s; }
// Ce que chaque nid permet : 0 = pas de nid, 1 = nid de base, 2 = nid de l'élément, 3 = nid unique
export const NIDS = [
  { nom: "Pas de nid", stadeMax: 0, desc: "Le dragon reste Nouveau-né tant qu'il n'a pas de nid." },
  { nom: "Nid de base", stadeMax: 1, desc: "Évolution jusqu'au niveau 5 (Juvénile)." },
  { nom: "Nid de l'élément", stadeMax: 3, desc: "Évolution jusqu'au niveau 15 (Ancien)." },
  { nom: "Nid unique", stadeMax: 4, desc: "Évolution du niveau 20 (Ascendant)." },
];
export function stadeEffectif(d) { return Math.min(stadeDuNiveau(d.niveau), NIDS[d.nid || 0].stadeMax); }
export function evolutionBloquee(d) { return stadeDuNiveau(d.niveau) > stadeEffectif(d); }

export function bonusArmure(d) {
  const s = ARMURES_STYLES.find((a) => a.id === d.armure);
  return s ? s.bonus : {};
}
export function pvMax(d) {
  const src = PAR_ID[d.id];
  const b = bonusArmure(d);
  return Math.round(src.niveaux[d.niveau - 1].pv * (1 + (b.pv || 0)));
}
// Postures disponibles pour un dragon du joueur (selon son niveau ET son stade réellement atteint).
export function postures(d) {
  const src = PAR_ID[d.id];
  const lv = src.niveaux[d.niveau - 1];
  const st = stadeEffectif(d);
  const b = bonusArmure(d);
  const out = [];
  src.postures.forEach((p, i) => {
    const s = lv.postures[i];
    if (!s || i > st) return;
    out.push({ i, nom: p.nom, atk: Math.min(20, s[0] + (b.atk || 0)), def: Math.min(20, s[1] + (b.def || 0)), bonus: p.bonus, faib: p.faib });
  });
  return out;
}
export const xpSuivant = (n) => (n >= NIVEAU_MAX ? null : R.xp[n - 1]);
export function xpCombat(victoire, niveauAdverse) {
  const base = 20 + 4 * niveauAdverse;
  return victoire ? base : Math.round(base * 0.4);
}

// ---------- Œufs ----------
// Attente (en heures) avant le k-ième œuf du minuteur (k = 2 pour le premier après l'œuf de départ).
export function attenteOeuf(k) {
  let attente = 1;
  for (let i = 2; i < k; i++) attente = attente < 24 ? Math.min(attente * 2, 24) : attente + 1;
  return attente;
}
export const COUVOIR = [
  { places: 1, pas: 2500, heures: 2, nom: "Couvoir" },
  { places: 2, pas: 3500, heures: 3, nom: "Grand couvoir" },
];
export const CHANCE_OEUF_JOUR = 0.1;

// ---------- Recettes ----------
export function recetteNid(niveauVise, element) {
  const m = ELEMENTS[element].materiau;
  if (niveauVise === 1) return { brindilles: 20, pierres: 5, energie: 3 };
  if (niveauVise === 2) return { brindilles: 30, pierres: 15, [m]: 15, energie: 6 };
  return { pierres: 30, [m]: 40, coeurs: 3, energie: 10 };
}
export const FERMES = [
  { nom: "Pas de ferme", parHeure: 0, max: 0 },
  { nom: "Ferme de base", parHeure: 4, max: 24, desc: "Produit 4 rations par heure." },
  { nom: "Ferme de l'élément", parHeure: 8, max: 48, desc: "Produit 8 rations par heure. Ses rations soignent deux fois plus les dragons de cet élément." },
];
export function recetteFerme(niveauVise, element) {
  const m = ELEMENTS[element].materiau;
  if (niveauVise === 1) return { brindilles: 15, pierres: 10, energie: 4 };
  return { pierres: 20, [m]: 20, energie: 8 };
}
export const RECETTE_COUVOIR = { pierres: 25, obsidienne: 10, givrite: 10, corail: 10, energie: 10 };
export const SOIN_RATION = 0.2; // part des PV max rendue par une ration

// ---------- Énergie ----------
export const ENERGIE_MAX = 100;
export const ENERGIE_PAR_HEURE = 1;
export const COUT = { combat: 4, ami: 0 };

// ---------- Armures ----------
export function armuresDe(id) {
  return ARMURES_STYLES.map((s) => ({ ...s, nomComplet: `${s.nom} ${MOTIFS[id] || ""}`.trim(), prix: "4,99 €" }));
}

export function nomStade(s) { return STADES[s]; }
export function fmtDuree(ms) {
  if (ms <= 0) return "maintenant";
  const s = Math.ceil(ms / 1000);
  const j = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  if (j) return `${j} j ${h} h`;
  if (h) return `${h} h ${String(m).padStart(2, "0")}`;
  if (m) return `${m} min ${String(sec).padStart(2, "0")}`;
  return `${sec} s`;
}
