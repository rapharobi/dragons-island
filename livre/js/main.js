// Démarrage du jeu : chargement de la partie, écran titre, navigation entre les écrans.
import { charger, E, surChangement, mettreAJour, energie } from "./etat.js";
import { Moteur } from "./scene.js";
import { enregistrerElements } from "./modele.js";
import { DRAGONS, ENERGIE_MAX, MATERIAUX } from "./regles.js";
import { initAudio, Musique, reglerSon, Son } from "./son.js";
import { el, icone, toast, modale } from "./ui.js";
import { ecranAccueil } from "./portail.js";
import * as Iles from "./iles.js";
import * as Couvoir from "./couvoir.js";
import * as Combat from "./combat.js";
import * as Boutique from "./boutique.js";
import * as Reglages from "./reglages.js";
import * as Pilotage from "./pilotage.js";
import "./village.js";
import { verifierRecits } from "./recit.js";
import { initTuto, histoire, afficher as afficherTuto, etape as etapeTuto } from "./tuto.js";

enregistrerElements(DRAGONS);

const ECRANS = { iles: Iles, couvoir: Couvoir, combat: Combat, boutique: Boutique, reglages: Reglages, pilotage: Pilotage };
const NAV = [["iles", "Îles"], ["couvoir", "Couvoir"], ["combat", "Combat"], ["boutique", "Boutique"], ["reglages", "Réglages"]];

const ctx = {
  moteur: null,
  ecran: null,
  aller(nom, params) {
    if (!ECRANS[nom]) nom = "iles";
    if (ctx.ecran && ECRANS[ctx.ecran].fermer) ECRANS[ctx.ecran].fermer();
    document.getElementById("ecran").innerHTML = "";
    ctx.ecran = nom;
    document.body.classList.toggle("ecran-iles", nom === "iles");
    majHud();
    if (ctx.majHauteurHud) ctx.majHauteurHud();
    if (location.hash !== "#" + nom) history.replaceState(null, "", "#" + nom);
    majNav();
    ECRANS[nom].ouvrir(ctx, params);
    afficherTuto();
  },
  cacherInterface(cacher) {
    document.getElementById("nav").hidden = cacher;
    document.getElementById("hud").hidden = cacher;
  },
  majHud,
};
window.__jeu = ctx;

function majNav() {
  const nav = document.getElementById("nav");
  nav.innerHTML = "";
  const e = E();
  for (const [id, nom] of NAV) {
    const a = el("a", { href: "#" + id, class: ctx.ecran === id ? "actif" : "", onclick: (ev) => { ev.preventDefault(); Son.clic(); ctx.aller(id); } }, icone(id), nom);
    if (id === "couvoir") {
      const n = e.oeufs.choix + e.oeufs.couvoir.slots.filter((s) => s.pret).length;
      if (e.oeufs.choix > 0) a.append(el("span", { class: "pastille" }, e.oeufs.choix));
    }
    nav.append(a);
  }
}

// Lien d'invitation : …#duel-ABCD ouvre directement le défi en ligne de l'ami
function codeDuel() { const m = /^#duel-([a-z0-9]{4})$/i.exec(location.hash || ""); return m ? m[1].toUpperCase() : null; }

let dernierChoix = -1;
let dernieres = null;
const jaillis = {};
function jaillir(k, d) {
  const puce = document.querySelector(`#hud .puce[data-res="${k}"]`);
  if (!puce || puce.offsetParent === null || document.getElementById("hud").hidden) return;
  let f = jaillis[k];
  if (f && f.isConnected) f._v += d; else { f = el("div", { class: "gain" }); document.body.append(f); f._v = d; jaillis[k] = f; }
  f.textContent = (f._v > 0 ? "+" : "−") + Math.abs(f._v).toLocaleString("fr-FR");
  f.classList.toggle("perte", f._v < 0);
  const r = puce.getBoundingClientRect();
  const colonne = document.body.classList.contains("ecran-iles") && !document.body.classList.contains("hud-ligne");
  f.classList.toggle("dessous", !colonne);
  f.style.left = Math.round(colonne ? r.right + 8 : r.left + r.width / 2) + "px";
  f.style.top = Math.round(colonne ? r.top + r.height / 2 : r.bottom + 2) + "px";
  f.style.animation = "none"; void f.offsetWidth; f.style.animation = "";
  puce.animate([{ transform: "scale(1)" }, { transform: "scale(1.12)" }, { transform: "scale(1)" }], { duration: 380 });
  clearTimeout(f._t); f._t = setTimeout(() => { f.remove(); }, 1900);
}
const PUCES = [["rations", "Rations"], ["brindilles", "Brindilles"], ["pierres", "Pierres"], ["obsidienne", "Obsidienne (île de Feu)"], ["givrite", "Givrite (île de Glace)"], ["corail", "Corail (île d'Eau)"], ["coeurs", "Cœurs de dragon"], ["rations_feu", "Piments de lave"], ["rations_glace", "Baies de givre"], ["rations_eau", "Poissons des abysses"], ["braises", "Braises d'éclosion"]];
// À quoi sert chaque ressource (MATERIAUX dit déjà comment on l'obtient)
const USAGES = {
  energie: ["Énergie", "Sert à lancer les duels de mage, la tour du nid et à réveiller les sources.", "Se recharge toute seule de 1 par heure, jusqu'à 100. Le Grand couvoir et les sources l'améliorent."],
  gemmes: ["Gemmes", "La monnaie de la boutique : packs, œufs, braises, ressources, versions UL."],
  rations: ["Rations", "Nourrissent et soignent tes dragons (20 % des PV par ration). Les dragons K.O. en ont besoin pour combattre."],
  brindilles: ["Brindilles", "Servent à construire et améliorer les nids."],
  pierres: ["Pierres", "Servent à construire et améliorer les nids."],
  obsidienne: ["Obsidienne", "Pour les nids des dragons de feu."],
  givrite: ["Givrite", "Pour les nids des dragons de glace."],
  corail: ["Corail", "Pour les nids des dragons d'eau."],
  coeurs: ["Cœurs de dragon", "Indispensables pour construire les nids uniques, ceux des dragons les plus évolués."],
  rations_feu: ["Piments de lave", "Font gagner 40 XP à un dragon de feu et le soignent de 30 %. Au-delà du niveau 10, ils le font monter de niveau."],
  rations_glace: ["Baies de givre", "Font gagner 40 XP à un dragon de glace et le soignent de 30 %. Au-delà du niveau 10, elles le font monter de niveau."],
  rations_eau: ["Poissons des abysses", "Font gagner 40 XP à un dragon d'eau et le soignent de 30 %. Au-delà du niveau 10, ils le font monter de niveau."],
  braises: ["Braises d'éclosion", "Chaque braise fait avancer un œuf du couvoir d'un quart."],
};
function infoRessource(k) {
  const e = E();
  const [nom, usage, obtenir] = USAGES[k] || [k, ""];
  const qte = k === "energie" ? `${energie()} / ${ENERGIE_MAX}` : (e.ressources[k] || 0).toLocaleString("fr-FR");
  const comment = obtenir || (MATERIAUX[k] ? MATERIAUX[k].desc : "");
  modale({
    titre: nom,
    contenu: el("div", { class: "info-res" },
      el("div", { class: "info-res-tete" }, icone(k), el("b", { class: "num" }, qte)),
      el("div", {}, el("div", { class: "etiquette" }, "À quoi ça sert"), el("p", {}, usage)),
      comment ? el("div", {}, el("div", { class: "etiquette" }, "Comment l'obtenir"), el("p", {}, comment)) : null),
    boutons: [{ texte: "Fermer" }, { texte: k === "gemmes" ? "Acheter des gemmes" : "En acheter à la boutique", classe: "principal", action: () => ctx.aller("boutique", { voir: k }) }],
  });
}
function majHud() {
  const e = E();
  if (!e) return;
  mettreAJour();
  const hud = document.getElementById("hud");
  const r = e.ressources;
  const en = energie();
  // Une ressource n'apparaît qu'après avoir été obtenue une première fois
  e.resVues = e.resVues || [];
  for (const k of Object.keys(r)) if (r[k] > 0 && !e.resVues.includes(k)) e.resVues.push(k);
  const vue = (k) => e.resVues.includes(k);
  hud.innerHTML = "";
  hud.append(
    el("div", { class: "logo" }, "Dragon World", el("small", {}, "bêta 0.12")),
    el("div", { class: "ressources" },
      el("span", { class: "puce energie", "data-res": "energie", title: "Énergie : se recharge de 1 par heure", role: "button", onclick: () => { Son.clic(); infoRessource("energie"); } }, icone("energie"), el("span", { class: "jauge" }, el("i", { style: { width: (en / ENERGIE_MAX) * 100 + "%" } })), `${en}`),
      vue("gemmes") && el("span", { class: "puce gemmes", "data-res": "gemmes", title: "Gemmes : touche pour ouvrir la boutique", role: "button", style: { pointerEvents: "auto", cursor: "pointer" }, onclick: () => { Son.clic(); ctx.aller("boutique"); } }, icone("gemmes"), `${(r.gemmes || 0).toLocaleString("fr-FR")}`),
      ...PUCES.filter(([k]) => vue(k)).map(([k, titre]) => el("span", { class: "puce", "data-res": k, title: titre, role: "button", onclick: () => { Son.clic(); infoRessource(k); } }, icone(k), `${r[k] || 0}`)),
    ),
  );
  // Ce qui a changé depuis la dernière fois : un « +12 » jaillit à côté de la ressource
  const now = { energie: en, ...r };
  if (dernieres) for (const [k, v] of Object.entries(now)) { const d = Math.round(v - (dernieres[k] ?? v)); if (d && typeof v === "number") jaillir(k, d); }
  dernieres = { ...now };
  if (e.oeufs.choix !== dernierChoix) { dernierChoix = e.oeufs.choix; majNav(); }
}

function suivreHud() {
  const hud = document.getElementById("hud");
  const maj = () => {
    if (document.body.classList.contains("ecran-iles") && !document.body.classList.contains("hud-ligne")) { document.documentElement.style.setProperty("--hud", "calc(var(--haut) + 6px)"); return; }
    const b = hud.hidden ? 0 : hud.getBoundingClientRect().bottom; if (b > 0) document.documentElement.style.setProperty("--hud", Math.round(b) + "px");
  };
  ctx.majHauteurHud = maj;
  if (window.ResizeObserver) new ResizeObserver(maj).observe(hud);
  window.addEventListener("resize", maj);
  setInterval(maj, 1500);
}

async function demarrer() {
  const canvas = document.getElementById("scene3d");
  ctx.moteur = new Moteur(canvas);
  initTuto(ctx);
  suivreHud();
  if (!ctx.moteur.r) {
    document.getElementById("ecran").append(el("div", { class: "ecran-titre" }, el("h1", {}, "Oups"), el("p", {}, "Ton navigateur n'arrive pas à afficher la 3D (WebGL). Essaie avec Chrome, Edge, Firefox ou Safari à jour.")));
    return;
  }
  await charger();
  const e = E();
  reglerSon(e.reglages.son, e.reglages.musique);
  surChangement((etatNeuf, source) => {
    majHud();
    // La sauvegarde du compte vient d'arriver : on réaffiche l'écran courant avec elle.
    if (source === "compte" && ctx.ecran && !document.querySelector(".accueil") && ctx.ecran !== "combat") { ctx.cacherInterface(false); ctx.aller(ctx.ecran); }
  });
  setInterval(majHud, 1000);
  // L'histoire reprend de temps en temps, et le chantier du couvoir prévient quand il est fini
  setInterval(() => {
    verifierRecits(ctx);
    if (E().chantierFini) { delete E().chantierFini; toast("Le chantier du couvoir est terminé !", "bon"); Son.evolution(); if (ctx.ecran === "couvoir") ctx.aller("couvoir"); }
  }, 2000);
  // Écran d'accueil : le portail magique (sans les îles derrière)
  const entrer = () => {
    document.getElementById("hud").hidden = false;
    document.getElementById("nav").hidden = false;
    majHud();
    // On arrive du ciel : la caméra plonge vers les îles
    Iles.decor(ctx).plongee();
    if (E().intro && etapeTuto() === "histoire") { document.getElementById("hud").hidden = true; document.getElementById("nav").hidden = true; histoire(() => { ctx.aller("couvoir", { intro: true }); }); }
    else if (E().intro) ctx.aller("couvoir", { intro: true });
    else if (codeDuel()) ctx.aller("combat", { rejoindre: codeDuel() });
    else {
      const h = location.hash.slice(1);
      ctx.aller(ECRANS[h] ? h : "iles");
    }
    if (E().intro && codeDuel()) toast(`Ton ami t'attend avec le code ${codeDuel()}. Fais d'abord éclore ton premier dragon, puis va dans Combat › Défi en ligne.`, "bon");
    if (E().cadeauJour) { toast("Un œuf gratuit est apparu aujourd'hui ! Va au couvoir.", "bon"); E().cadeauJour = false; }
  };
  const accueil = ecranAccueil({
    note: "Bêta jouable",
    texte: e.intro ? "Tu es un mage. Grâce à ta tablette magique, un portail s'ouvre sur le monde des dragons." : `${e.dragons.length} dragon${e.dragons.length > 1 ? "s" : ""} t'attend${e.dragons.length > 1 ? "ent" : ""} de l'autre côté du portail.`,
    bouton: e.intro ? "Commencer l'aventure" : "Jouer",
    surJouer: () => { initAudio(); Son.portail(); accueil.ouvrir(entrer); },
  });
  document.body.append(accueil.racine);
  window.addEventListener("hashchange", () => {
    if (codeDuel() && !document.querySelector(".accueil") && !E().intro) { ctx.aller("combat", { rejoindre: codeDuel() }); return; }
    const h = location.hash.slice(1);
    if (ECRANS[h] && h !== ctx.ecran && !document.querySelector(".accueil")) ctx.aller(h);
  });
}

demarrer().catch((err) => {
  console.error(err);
  document.getElementById("ecran").append(el("div", { class: "ecran-titre" }, el("h1", {}, "Erreur"), el("p", {}, String(err && err.message || err))));
});
export { Musique };
