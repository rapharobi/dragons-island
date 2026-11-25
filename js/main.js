// Démarrage du jeu : chargement de la partie, écran titre, navigation entre les écrans.
import { charger, E, surChangement, mettreAJour, energie } from "./etat.js";
import { Moteur } from "./scene.js";
import { enregistrerElements } from "./modele.js";
import { DRAGONS, ENERGIE_MAX } from "./regles.js";
import { initAudio, Musique, reglerSon, Son } from "./son.js";
import { el, icone, toast } from "./ui.js";
import * as Iles from "./iles.js";
import * as Couvoir from "./couvoir.js";
import * as Combat from "./combat.js";
import * as Boutique from "./boutique.js";
import * as Labo from "./labo.js";
import * as Reglages from "./reglages.js";
import { initTuto, histoire, afficher as afficherTuto, etape as etapeTuto } from "./tuto.js";

enregistrerElements(DRAGONS);

const ECRANS = { iles: Iles, couvoir: Couvoir, combat: Combat, boutique: Boutique, labo: Labo, reglages: Reglages };
const NAV = [["iles", "Îles"], ["couvoir", "Couvoir"], ["combat", "Combat"], ["boutique", "Boutique"], ["labo", "Labo"], ["reglages", "Réglages"]];

const ctx = {
  moteur: null,
  ecran: null,
  aller(nom, params) {
    if (!ECRANS[nom]) nom = "iles";
    if (ctx.ecran && ECRANS[ctx.ecran].fermer) ECRANS[ctx.ecran].fermer();
    document.getElementById("ecran").innerHTML = "";
    ctx.ecran = nom;
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
function majHud() {
  const e = E();
  if (!e) return;
  mettreAJour();
  const hud = document.getElementById("hud");
  const r = e.ressources;
  const en = energie();
  hud.innerHTML = "";
  hud.append(
    el("div", { class: "logo" }, "Dragons Island", el("small", {}, "bêta 0.8")),
    el("div", { class: "ressources" },
      el("span", { class: "puce energie", title: "Énergie : se recharge de 1 par heure" }, icone("energie"), el("span", { class: "jauge" }, el("i", { style: { width: (en / ENERGIE_MAX) * 100 + "%" } })), `${en}`),
      el("span", { class: "puce", title: "Rations" }, icone("rations"), `${r.rations}`),
      el("span", { class: "puce", title: "Brindilles" }, icone("brindilles"), `${r.brindilles}`),
      el("span", { class: "puce", title: "Pierres" }, icone("pierres"), `${r.pierres}`),
      el("span", { class: "puce", title: "Obsidienne (île de Feu)" }, icone("obsidienne"), `${r.obsidienne}`),
      el("span", { class: "puce", title: "Givrite (île de Glace)" }, icone("givrite"), `${r.givrite}`),
      el("span", { class: "puce", title: "Corail (île d'Eau)" }, icone("corail"), `${r.corail}`),
      el("span", { class: "puce", title: "Cœurs de dragon" }, icone("coeurs"), `${r.coeurs}`),
      el("span", { class: "puce", title: "Piments de lave (nourriture de feu)" }, icone("rations_feu"), `${r.rations_feu || 0}`),
      el("span", { class: "puce", title: "Baies de givre (nourriture de glace)" }, icone("rations_glace"), `${r.rations_glace || 0}`),
      el("span", { class: "puce", title: "Poissons des abysses (nourriture d'eau)" }, icone("rations_eau"), `${r.rations_eau || 0}`),
      r.braises ? el("span", { class: "puce", title: "Braises d'éclosion : accélèrent les œufs du couvoir" }, icone("braises"), `${r.braises}`) : null,
    ),
  );
  if (e.oeufs.choix !== dernierChoix) { dernierChoix = e.oeufs.choix; majNav(); }
}

// Entrée dans le monde des dragons : on traverse le portail de la tablette magique.
function portail(suite) {
  Son.portail();
  const p = el("div", { class: "portail", "aria-hidden": "true" },
    el("div", { class: "anneau a1" }), el("div", { class: "anneau a2" }), el("div", { class: "anneau a3" }),
    el("div", { class: "coeur" }), el("div", { class: "eclair" }),
    ...Array.from({ length: 28 }, (_, i) => el("i", { style: { "--a": (i / 28) * 360 + "deg", "--d": (0.2 + Math.random() * 0.8) + "s", "--r": (20 + Math.random() * 30) + "vmin" } })));
  document.body.append(p);
  setTimeout(() => { try { suite(); } catch (e) { console.error(e); } }, 1500);
  setTimeout(() => p.remove(), 2300);
}

function suivreHud() {
  const hud = document.getElementById("hud");
  const maj = () => { const b = hud.hidden ? 0 : hud.getBoundingClientRect().bottom; if (b > 0) document.documentElement.style.setProperty("--hud", Math.round(b) + "px"); };
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
    if (source === "compte" && ctx.ecran && !document.querySelector(".ecran-titre") && ctx.ecran !== "combat") { ctx.cacherInterface(false); ctx.aller(ctx.ecran); }
  });
  setInterval(majHud, 1000);
  // Décor de fond de l'écran titre : les îles
  Iles.decor(ctx).afficherFond();
  const titre = el("div", { class: "ecran-titre" },
    el("div", { class: "note doux" }, "Bêta jouable"),
    el("h1", {}, "Dragons", el("br"), el("span", {}, "Island")),
    el("p", {}, e.intro ? "Tu es un mage. Grâce à ta tablette magique, un portail s'ouvre sur le monde des dragons." : `${e.dragons.length} dragon${e.dragons.length > 1 ? "s" : ""} t'attend${e.dragons.length > 1 ? "ent" : ""} sur les îles.`),
    el("button", { class: "btn principal", style: { fontSize: "16px", padding: "13px 28px" }, onclick: () => { initAudio(); portail(() => {
      titre.remove();
      document.getElementById("hud").hidden = false;
      document.getElementById("nav").hidden = false;
      majHud();
      if (E().intro && etapeTuto() === "histoire") { document.getElementById("hud").hidden = true; document.getElementById("nav").hidden = true; histoire(() => { ctx.aller("couvoir", { intro: true }); }); }
      else if (E().intro) ctx.aller("couvoir", { intro: true });
      else if (codeDuel()) ctx.aller("combat", { rejoindre: codeDuel() });
      else {
        const h = location.hash.slice(1);
        ctx.aller(ECRANS[h] ? h : "iles");
      }
      if (E().intro && codeDuel()) toast(`Ton ami t'attend avec le code ${codeDuel()}. Fais d'abord éclore ton premier dragon, puis va dans Combat › Défi en ligne.`, "bon");
      if (E().cadeauJour) { toast("Un œuf gratuit est apparu aujourd'hui ! Va au couvoir.", "bon"); E().cadeauJour = false; }
    }); } }, e.intro ? "Commencer l'aventure" : "Jouer"),
  );
  document.getElementById("ecran").append(titre);
  window.addEventListener("hashchange", () => {
    if (codeDuel() && !document.querySelector(".ecran-titre") && !E().intro) { ctx.aller("combat", { rejoindre: codeDuel() }); return; }
    const h = location.hash.slice(1);
    if (ECRANS[h] && h !== ctx.ecran && !document.querySelector(".ecran-titre")) ctx.aller(h);
  });
}

demarrer().catch((err) => {
  console.error(err);
  document.getElementById("ecran").append(el("div", { class: "ecran-titre" }, el("h1", {}, "Erreur"), el("p", {}, String(err && err.message || err))));
});
export { Musique };
