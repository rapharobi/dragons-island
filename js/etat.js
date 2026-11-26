// La partie du joueur : ce qu'il possède, ses minuteurs, et la sauvegarde.
// Dans la bêta, tout tourne dans le navigateur. Dans le vrai jeu, ces calculs iront sur le serveur (anti-triche).
import {
  DRAGONS, PAR_ID, ELEMENTS, pvMax, xpSuivant, NIVEAU_MAX, stadeEffectif, stadeDuNiveau, attenteOeuf, COUVOIR, niveauMaxDragon, CHANTIER_COUVOIR,
  ENERGIE_MAX, ENERGIE_PAR_HEURE, FERMES, SOIN_RATION, CHANCE_OEUF_JOUR,
  PRODUCTION_SOURCE, SOURCES, XP_RATION_ELEMENT, NIVEAU_PERCEE, CONDITIONS_SOURCE,
} from "./regles.js";

const H = 3600 * 1000;
const CLE = "couvee-sauvage-partie-v1";

let etat = null;
const ecouteurs = new Set();
export const surChangement = (f) => ecouteurs.add(f);

export function maintenant() { return Date.now() + (etat ? etat.decalage || 0 : 0); }

export function nouvellePartie() {
  const t = Date.now();
  return {
    version: 1, cree: t, decalage: 0, compteur: 0,
    energie: { val: ENERGIE_MAX, maj: t },
    ressources: { brindilles: 20, pierres: 20, obsidienne: 0, givrite: 0, corail: 0, coeurs: 0, rations: 10, rations_feu: 0, rations_glace: 0, rations_eau: 0, braises: 0, gemmes: 60 },
    achats: {},
    dragons: [],
    oeufs: { choix: 0, reserve: [], couvoir: { niveau: 0, slots: [], ruine: true }, minuteur: { compte: 1, prochain: null }, dernierJour: null },
    ilesVisibles: [], joueur: null,
    pas: { total: 0 },
    fermes: { feu: { niveau: 0, stock: 0, maj: t }, glace: { niveau: 0, stock: 0, maj: t }, eau: { niveau: 0, stock: 0, maj: t } },
    sources: { feu: { niveau: 0, stock: 0, maj: t }, glace: { niveau: 0, stock: 0, maj: t }, eau: { niveau: 0, stock: 0, maj: t } },
    noeuds: {},
    livre: { vus: [], ulDebloque: false, ulChoisi: null },
    combats: { gagnes: 0, perdus: 0, nuls: 0 },
    reglages: { mode: "temps", son: true, musique: true, chrono: 20, qualite: "haute", combatAuto: false },
    tourNid: { run: null, record: 0, sommets: 0 },
    intro: true,
    tuto: { etape: "nom" },
    journal: [],
  };
}

export function E() { return etat; }

// ---------- Sauvegarde : base de données de l'artefact si possible, sinon le navigateur ----------
let stockage = null;
async function preparerStockage() {
  try {
    for (let i = 0; i < 30 && !(window.claude && window.claude.use); i++) await new Promise((r) => setTimeout(r, 100));
    if (window.claude && window.claude.use) {
      const [db, user] = await Promise.all([window.claude.use("db"), window.claude.use("user")]);
      const id = user ? await user.id() : null;
      if (db && id) {
        const doc = db.doc("data/users/" + id + "/partie");
        return {
          nom: "compte",
          lire: async () => { const s = await doc.get(); return s.exists ? JSON.parse(s.data().json) : null; },
          ecrire: async (o) => { await doc.set({ json: JSON.stringify(o), maj: Date.now() }); },
        };
      }
    }
  } catch (e) { console.warn("Sauvegarde en ligne indisponible", e); }
  return {
    nom: "navigateur",
    lire: async () => { try { const t = localStorage.getItem(CLE); return t ? JSON.parse(t) : null; } catch (e) { return null; } },
    ecrire: async (o) => { try { localStorage.setItem(CLE, JSON.stringify(o)); } catch (e) { /* stockage refusé */ } },
  };
}

export async function charger() {
  // Lecture locale immédiate (l'écran titre s'affiche tout de suite),
  // puis la sauvegarde liée au compte en arrière-plan : elle gagne si elle est plus récente.
  let local = null;
  try { const t = localStorage.getItem(CLE); local = t ? JSON.parse(t) : null; } catch (e) { local = null; }
  etat = local ? migrer(local) : nouvellePartie();
  mettreAJour();
  synchroniserCompte(local);
  return etat;
}
async function synchroniserCompte(local) {
  stockage = await preparerStockage();
  if (stockage.nom !== "compte") return;
  try {
    const distant = await stockage.lire();
    if (distant && (!local || (distant.sauve || 0) > (local.sauve || 0))) {
      etat = migrer(distant);
      mettreAJour();
      try { localStorage.setItem(CLE, JSON.stringify(etat)); } catch (e) { /* refusé */ }
      for (const f of ecouteurs) { try { f(etat, "compte"); } catch (e) { console.error(e); } }
    } else if (local) sauver(true);
  } catch (e) { /* on garde la version locale */ }
}
export function lieuSauvegarde() { return stockage ? stockage.nom : "navigateur"; }

function migrer(o) {
  // Anciennes parties : toutes les îles sont déjà là
  if (!("ilesVisibles" in o)) o.ilesVisibles = null;
  const base = nouvellePartie();
  for (const k of Object.keys(base)) if (o[k] === undefined) o[k] = base[k];
  for (const k of Object.keys(base.ressources)) if (o.ressources[k] === undefined) o.ressources[k] = 0;
  for (const k of Object.keys(base.reglages)) if (o.reglages[k] === undefined) o.reglages[k] = base.reglages[k];
  if (!o.sources) o.sources = base.sources;
  if (!o.tuto || o.tuto.etape === undefined) o.tuto = { etape: o.intro ? "histoire" : "fini" };
  // Bêta 0.10 : plus de podomètre, les œufs éclosent avec le temps. On garde l'avancement déjà fait.
  if (o.reglages.mode !== "temps") {
    const maintenantO = Date.now() + (o.decalage || 0);
    const def = COUVOIR[o.oeufs.couvoir.niveau] || COUVOIR[0];
    for (const sl of o.oeufs.couvoir.slots) {
      const b = sl.oeuf.tuto ? { pas: 300, heures: 1 / 60 } : def;
      const av = Math.max(0, Math.min(1, ((o.pas ? o.pas.total : 0) - (sl.pasDepart || 0)) / b.pas));
      sl.debut = maintenantO - av * b.heures * H;
    }
    o.reglages.mode = "temps";
  }
  // Bêta 0.12 : les armures sont retirées (remboursées en gemmes), les robes UL deviennent un achat
  if (!o.migre12) {
    for (const d of o.dragons) {
      if (d.ul) d.ulPossede = true;
      const n = (d.armures || []).length;
      if (n) o.ressources.gemmes = (o.ressources.gemmes || 0) + n * 500;
      d.armures = []; d.armure = null;
    }
    o.migre12 = true;
  }
  return o;
}

let minuteurSauve = null;
let enCours = false;
export function sauver(immediat = false) {
  etat.sauve = Date.now();
  try { localStorage.setItem(CLE, JSON.stringify(etat)); } catch (e) { /* refusé */ }
  clearTimeout(minuteurSauve);
  const go = async () => {
    if (!stockage || stockage.nom !== "compte") return;
    if (enCours) { minuteurSauve = setTimeout(go, 1500); return; }
    enCours = true;
    try { await stockage.ecrire(etat); } catch (e) { console.warn(e); }
    enCours = false;
  };
  minuteurSauve = setTimeout(go, immediat ? 0 : 2500);
}

export function changer(fn) {
  fn && fn(etat);
  mettreAJour();
  sauver();
  for (const f of ecouteurs) { try { f(etat); } catch (e) { console.error(e); } }
}

export function reinitialiser() {
  etat = nouvellePartie();
  sauver(true);
  for (const f of ecouteurs) f(etat);
}

export function noter(texte) {
  etat.journal.unshift({ t: maintenant(), texte });
  etat.journal = etat.journal.slice(0, 40);
}

// ---------- Mise à jour avec le temps (énergie, fermes, faim, minuteurs) ----------
export function mettreAJour() {
  const t = maintenant();
  const en = etat.energie;
  if (en.val < ENERGIE_MAX) {
    const gagne = ((t - en.maj) / H) * ENERGIE_PAR_HEURE;
    en.val = Math.min(ENERGIE_MAX, en.val + gagne);
  }
  en.maj = t;
  for (const el of Object.keys(etat.sources)) {
    const f = etat.sources[el], def = PRODUCTION_SOURCE[f.niveau];
    if (def.parHeure) f.stock = Math.min(def.max, f.stock + ((t - f.maj) / H) * def.parHeure);
    f.maj = t;
  }
  // Faim : chaque jour complet sans repas coûte 5 % des PV (jamais sous 1).
  for (const d of etat.dragons) {
    const jours = Math.floor((t - (d.repas || t)) / (24 * H));
    const deja = d.faimComptee || 0;
    if (jours > deja) {
      const perte = Math.round(pvMax(d) * 0.05 * (jours - deja));
      d.pv = Math.max(1, d.pv - perte);
      d.faimComptee = jours;
    }
  }
  // Réparation du couvoir en ruine (début du jeu)
  const cv = etat.oeufs.couvoir;
  if (cv.reparation && t >= cv.reparation.fin) { cv.ruine = false; cv.reparation = null; etat.cineReparation = true; }
  if (etat.oeufs.couvoir.chantier && t >= etat.oeufs.couvoir.chantier.fin) { finirChantier(); etat.chantierFini = true; }
  // Minuteur des œufs
  const mi = etat.oeufs.minuteur;
  while (mi.prochain && t >= mi.prochain) {
    etat.oeufs.choix += 1;
    mi.compte += 1;
    mi.prochain = mi.prochain + attenteOeuf(mi.compte + 1) * H;
  }
  // Petite chance quotidienne d'un œuf gratuit
  const jour = Math.floor(t / (24 * H));
  if (etat.dragons.length && etat.oeufs.dernierJour !== jour) {
    if (etat.oeufs.dernierJour !== null && Math.random() < CHANCE_OEUF_JOUR) {
      etat.oeufs.choix += 1;
      noter("Un œuf gratuit est apparu aujourd'hui !");
      etat.cadeauJour = true;
    }
    etat.oeufs.dernierJour = jour;
  }
  remplirCouvoir();
}

// ---------- Énergie ----------
export const energie = () => Math.floor(etat.energie.val);
export function depenserEnergie(n) {
  if (etat.energie.val < n) return false;
  etat.energie.val -= n;
  return true;
}

// ---------- Ressources ----------
export function assez(recette) {
  for (const [k, v] of Object.entries(recette)) {
    if (k === "energie") { if (etat.energie.val < v) return false; }
    else if ((etat.ressources[k] || 0) < v) return false;
  }
  return true;
}
export function payer(recette) {
  if (!assez(recette)) return false;
  for (const [k, v] of Object.entries(recette)) {
    if (k === "energie") etat.energie.val -= v; else etat.ressources[k] -= v;
  }
  return true;
}

// ---------- Dragons ----------
export function nouveauDragon(id) {
  const d = { uid: "d" + (++etat.compteur) + "-" + Date.now().toString(36), id, niveau: 1, xp: 0, nid: 0, armure: null, armures: [], ul: false, repas: maintenant(), faimComptee: 0, obtenu: maintenant() };
  d.pv = pvMax(d);
  etat.dragons.push(d);
  if (!etat.livre.vus.includes(id)) etat.livre.vus.push(id);
  return d;
}
export const dragon = (uid) => etat.dragons.find((d) => d.uid === uid);
export const possede = (id) => etat.dragons.some((d) => d.id === id);

// Au-delà du niveau 10, l'XP des combats remplit la barre mais il faut une ration de l'élément (percee) pour monter.
export function plafondNiveau() { return niveauMaxDragon(etat.oeufs.couvoir.niveau); }
export function gagnerXp(d, xp, percee = false) {
  const avant = { niveau: d.niveau, stade: stadeEffectif(d) };
  d.xp += xp;
  let percees = percee ? 1 : 0;
  // Le couvoir fixe le niveau maximum : au-delà, l'expérience attend qu'on l'améliore
  const plafond = Math.max(plafondNiveau(), d.niveau);
  if (d.niveau >= plafond && plafond < NIVEAU_MAX) { d.xp = Math.min(d.xp, xpSuivant(d.niveau)); return { niveaux: 0, evolution: false, plafond: true }; }
  while (d.niveau < plafond && d.xp >= xpSuivant(d.niveau)) {
    if (d.niveau >= NIVEAU_PERCEE) { if (percees <= 0) { d.xp = xpSuivant(d.niveau); break; } percees--; }
    d.xp -= xpSuivant(d.niveau);
    const ancien = pvMax(d);
    d.niveau += 1;
    d.pv += pvMax(d) - ancien;
  }
  if (d.niveau >= NIVEAU_MAX) d.xp = 0;
  return { niveaux: d.niveau - avant.niveau, evolution: stadeEffectif(d) > avant.stade };
}
export function attendPercee(d) { return d.niveau >= NIVEAU_PERCEE && d.niveau < NIVEAU_MAX && d.xp >= xpSuivant(d.niveau); }

// Nourriture de l'élément : soigne, donne de l'XP, et fait passer un palier au-delà du niveau 10.
export function nourrirElement(d) {
  const el = PAR_ID[d.id].element;
  const cle = SOURCES[el].nourriture;
  if ((etat.ressources[cle] || 0) < 1) return { ok: false, raison: "Il te faut de la nourriture de cet élément : réveille la source de son île." };
  etat.ressources[cle] -= 1;
  const max = pvMax(d);
  const avant = d.pv;
  d.pv = Math.min(max, d.pv + Math.round(max * 0.3));
  d.repas = maintenant(); d.faimComptee = 0;
  const r = gagnerXp(d, XP_RATION_ELEMENT, true);
  return { ok: true, soin: d.pv - avant, xp: XP_RATION_ELEMENT, ...r };
}

export function recolterSource(el) {
  const f = etat.sources[el];
  const n = Math.floor(f.stock);
  if (n < 1) return 0;
  f.stock -= n;
  const cle = SOURCES[el].nourriture;
  etat.ressources[cle] = (etat.ressources[cle] || 0) + n;
  return n;
}
// Ce qui manque pour faire monter la source d'un niveau (null si c'est possible)
export function manqueSource(el) {
  const f = etat.sources[el];
  if (f.niveau >= 3) return "La source est à son niveau maximum.";
  const src = SOURCES[el];
  const miens = etat.dragons.filter((d) => PAR_ID[d.id].element === el);
  if (f.niveau === 0) {
    if (!miens.some((d) => d.id === src.cle && d.pv > 0)) return `Il te faut ${PAR_ID[src.cle].nom}, le ${src.nomCle}, en forme.`;
    if (!miens.some((d) => d.id !== src.cle && d.pv > 0)) return `Il te faut un autre dragon ${el === "eau" ? "d'eau" : el === "feu" ? "de feu" : "de glace"} pour l'aider.`;
    return null;
  }
  const c = CONDITIONS_SOURCE[f.niveau + 1];
  const ok = new Set(miens.filter((d) => d.niveau >= c.niveau).map((d) => d.id)).size;
  if (ok < c.nombre) return `Il faut ${c.nombre} dragons différents de cet élément au niveau ${c.niveau} (tu en as ${ok}).`;
  return null;
}

// Soigner toute une équipe avec des rations (depuis l'écran de combat)
export function rationsPourSoigner(liste) {
  let n = 0;
  for (const d of liste) { const max = pvMax(d); const manque = max - d.pv; if (manque > 0) n += Math.ceil(manque / Math.max(8, Math.round(max * SOIN_RATION))); }
  return n;
}
export function soignerEquipe(liste) {
  let utilise = 0;
  for (const d of liste) {
    const max = pvMax(d);
    while (d.pv < max && etat.ressources.rations > 0) { etat.ressources.rations--; utilise++; d.pv = Math.min(max, d.pv + Math.max(8, Math.round(max * SOIN_RATION))); }
    if (utilise) { d.repas = maintenant(); d.faimComptee = 0; }
  }
  return utilise;
}

export function fixerNiveau(d, n) {
  const ratio = d.pv / pvMax(d);
  d.niveau = Math.max(1, Math.min(NIVEAU_MAX, n));
  d.xp = 0;
  d.pv = Math.max(1, Math.round(pvMax(d) * ratio));
}

export function nourrir(d) {
  if (etat.ressources.rations < 1) return { ok: false, raison: "Plus de rations. Récolte la ferme ou gagne des combats." };
  const max = pvMax(d);
  const el = PAR_ID[d.id].element;
  const fois = etat.fermes[el].niveau >= 2 ? 2 : 1;
  etat.ressources.rations -= 1;
  const soin = Math.max(8, Math.round(max * SOIN_RATION * fois));
  const avant = d.pv;
  d.pv = Math.min(max, d.pv + soin);
  d.repas = maintenant();
  d.faimComptee = 0;
  return { ok: true, soin: d.pv - avant };
}

// ---------- Œufs et couvoir ----------
export function choisirOeuf(element) {
  if (etat.oeufs.choix < 1) return false;
  etat.oeufs.choix -= 1;
  etat.oeufs.reserve.push({ uid: "o" + (++etat.compteur), element });
  remplirCouvoir();
  return true;
}
export function defCouvoir() { return COUVOIR[etat.oeufs.couvoir.niveau]; }
// Chantier du couvoir : ce qui manque pour lancer le niveau suivant (null si tout est prêt)
export function manqueChantier() {
  const n = etat.oeufs.couvoir.niveau + 1;
  const c = CHANTIER_COUVOIR[n];
  if (!c) return "Le couvoir est au niveau maximum.";
  const l = etat.dragons;
  if (l.length < c.dragons) return `Il faut ${c.dragons} dragons (tu en as ${l.length}).`;
  const hauts = l.filter((d) => d.niveau >= c.haut).length;
  if (hauts < c.nbHaut) return `Il faut ${c.nbHaut} dragon${c.nbHaut > 1 ? "s" : ""} au niveau ${c.haut} (tu en as ${hauts}).`;
  const faibles = l.filter((d) => d.niveau < c.tous).length;
  if (faibles) return `Tous tes dragons doivent être au moins au niveau ${c.tous} (${faibles} en dessous).`;
  return null;
}
// Durée du chantier : plus il y a de dragons bâtisseurs, plus ça va vite
// Une heure de moins par dragon bâtisseur (au moins 1 h, ou un quart du temps pour les gros chantiers)
export function dureeChantier(n, batisseurs) { const h = CHANTIER_COUVOIR[n].heures; return Math.max(1, h / 4, h - Math.max(1, batisseurs)) * H; }
export function finirChantier() {
  const ch = etat.oeufs.couvoir.chantier;
  if (!ch) return false;
  etat.oeufs.couvoir.niveau = ch.niveau;
  for (const d of etat.dragons) if (d.chantier) delete d.chantier;
  etat.oeufs.couvoir.chantier = null;
  noter(`${COUVOIR[ch.niveau].nom} terminé !`);
  return true;
}
export function remplirCouvoir() {
  const c = etat.oeufs.couvoir, def = COUVOIR[c.niveau];
  if (c.ruine) return;
  while (c.slots.length < def.places && etat.oeufs.reserve.length) {
    const o = etat.oeufs.reserve.shift();
    c.slots.push({ oeuf: o, pasDepart: etat.pas.total, debut: maintenant() });
  }
}
// Avancement d'un œuf (0 à 1), selon le temps passé au couvoir.
// Les œufs de l'apprentissage sont pressés : une minute.
function besoin(slot) { return slot.oeuf.tuto ? { pas: 300, heures: 1 / 60 } : defCouvoir(); }
// slot.bonus : l'avance donnée par les braises d'éclosion (0,25 par braise)
export function avancement(slot) {
  const def = besoin(slot);
  const bonus = slot.bonus || 0;
  return Math.min(1, bonus + (maintenant() - slot.debut) / (def.heures * H));
}
export function pasRestants(slot) {
  const def = besoin(slot);
  return Math.max(0, Math.ceil(def.pas * (1 - (slot.bonus || 0)) - (etat.pas.total - slot.pasDepart)));
}
export function tempsRestant(slot) {
  const def = besoin(slot);
  return Math.max(0, slot.debut + def.heures * H * (1 - (slot.bonus || 0)) - maintenant());
}
export const AVANCE_BRAISE = 0.25;
// Braises qu'il faut pour finir un œuf tout de suite
export function braisesPourFinir(slot) { return Math.max(0, Math.ceil((1 - avancement(slot)) / AVANCE_BRAISE - 1e-9)); }
// Pose n braises sur un œuf du couvoir (renvoie le nombre utilisé)
export function chaufferOeuf(index, n = 1) {
  const slot = etat.oeufs.couvoir.slots[index];
  if (!slot) return 0;
  const k = Math.min(n, etat.ressources.braises || 0, braisesPourFinir(slot));
  if (k <= 0) return 0;
  etat.ressources.braises -= k;
  slot.bonus = Math.min(1, (slot.bonus || 0) + k * AVANCE_BRAISE);
  return k;
}
export function ajouterPas(n) { etat.pas.total += n; }

// Tire le dragon qui sort de l'œuf : un dragon de cet élément qu'on n'a pas encore, sinon un double au hasard.
export function tirerEspece(element) {
  const tous = DRAGONS.filter((d) => d.element === element);
  const manquants = tous.filter((d) => !possede(d.id));
  const liste = manquants.length ? manquants : tous;
  return liste[Math.floor(Math.random() * liste.length)].id;
}
export function elementComplet(element) { return DRAGONS.filter((d) => d.element === element).every((d) => possede(d.id)); }

export function eclore(index) {
  const c = etat.oeufs.couvoir;
  const slot = c.slots[index];
  if (!slot) return null;
  // Couvoir amélioré : les deux œufs éclosent ensemble
  const ids = [];
  const def = defCouvoir();
  const aEclore = def.places > 1 ? c.slots.filter((s) => avancement(s) >= 1) : [slot];
  for (const s of aEclore) {
    const id = tirerEspece(s.oeuf.element);
    const double = possede(id);
    const d = nouveauDragon(id);
    // Œuf mystère du sommet de la tour : le dragon sort en version UL
    if (s.oeuf.ul) { d.ul = true; d.ulPossede = true; }
    ids.push({ d, double, ul: !!s.oeuf.ul });
    c.slots.splice(c.slots.indexOf(s), 1);
  }
  remplirCouvoir();
  return ids;
}

export function demarrerMinuteur() {
  const mi = etat.oeufs.minuteur;
  if (!mi.prochain) mi.prochain = maintenant() + attenteOeuf(2) * H;
}

export function livreComplet() { return DRAGONS.every((d) => etat.livre.vus.includes(d.id)); }

// ---------- Récolte sur les îles ----------
export const REPOUSSE_MIN = 4;
export function noeudDispo(cle) { return !etat.noeuds[cle] || maintenant() >= etat.noeuds[cle]; }
export function recolter(cle, gains) {
  if (!noeudDispo(cle)) return false;
  for (const [k, v] of Object.entries(gains)) etat.ressources[k] = (etat.ressources[k] || 0) + v;
  etat.noeuds[cle] = maintenant() + REPOUSSE_MIN * 60 * 1000;
  return true;
}
export function recolterFerme(el) {
  const f = etat.fermes[el];
  const n = Math.floor(f.stock);
  if (n < 1) return 0;
  f.stock -= n;
  etat.ressources.rations += n;
  return n;
}

export function soignerTout() { for (const d of etat.dragons) { d.pv = pvMax(d); d.repas = maintenant(); d.faimComptee = 0; } }
export { stadeDuNiveau };
