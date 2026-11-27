// L'histoire continue après l'apprentissage : de temps en temps, quand le moment est venu,
// Lia raconte un nouveau chapitre (le village qui s'éveille, les pillards, la tour du nid…).
// Chaque chapitre ne se montre qu'une fois.
import { E, changer } from "./etat.js";
import { el } from "./ui.js";
import { Son } from "./son.js";
import { parler, MENTOR } from "./tuto.js";

const CHAPITRES = [
  {
    id: "village",
    quand: (e) => e.oeufs.couvoir.niveau >= 1,
    pages: [
      ["Un village s'éveille", "Ton couvoir a grandi. Les dragons sauvages des alentours le sentent : c'est devenu le cœur d'un vrai village."],
      [`${MENTOR}`, "Sur tes trois îles, des cercles dorés montrent où bâtir. Touche-en un : scierie, carrière et verger travaillent même quand tu dors. Les entrepôts gardent tes réserves, et les tours protègent le tout."],
      ["Le niveau du couvoir", "Chaque niveau du couvoir permet de construire plus de bâtiments et de les améliorer, et laisse tes dragons monter plus haut. Garde un œil sur lui."],
    ],
  },
  {
    id: "pillards",
    quand: (e) => e.recits && e.recits.village && e.village && e.village.vague && e.village.vague.enAttente,
    pages: [
      ["Des silhouettes au loin", "Une poignée de jeunes dragons sauvages a vu tes réserves. Ils arrivent par le bord de l'île, droit sur tes bâtiments."],
      [`${MENTOR}`, "Ouvre le Village : tu peux défendre en direct (touche un pillard, ta tablette le frappe et tes dragons foncent dessus) ou laisser tes dragons faire. Les tours tirent toutes seules."],
    ],
  },
  {
    id: "quatrieme",
    quand: (e) => e.tuto.etape === "fini" && e.oeufs.couvoir.niveau >= 2,
    pages: [
      ["La légende oubliée", "Les anciens mages gravaient trois symboles sur les portes du couvoir : le feu, la glace et l'eau. Mais sous la poussière, il y en a un quatrième, effacé…"],
      [`${MENTOR}`, "On raconte qu'il existait un quatrième élément, et une quatrième île, perdue au-delà du continent. Personne ne l'a revue depuis des siècles. Si un jour tu trouves un œuf qui ne ressemble à aucun autre… garde-le précieusement."],
    ],
  },
  {
    id: "tour",
    quand: (e) => e.tuto.etape === "fini" && e.dragons.length >= 6 && e.oeufs.couvoir.niveau >= 1,
    pages: [
      ["La tour du nid", "On raconte que sur le continent des mages, au pic du nord, se dresse une tour faite de nids. Ceux qui y entrent n'ont droit qu'à trois œufs… et ceux qui atteignent le sommet en ressortent avec un œuf que personne n'a jamais vu."],
      [`${MENTOR}`, "Tu la trouveras dans Combat. Choisis bien tes trois premiers œufs !"],
    ],
  },
];

export function verifierRecits(ctx) {
  const e = E();
  if (!e || !ctx || ctx.ecran !== "iles") return;
  if (document.querySelector(".histoire") || document.querySelector(".accueil") || !document.getElementById("modale").hidden) return;
  e.recits = e.recits || {};
  for (const c of CHAPITRES) if (!e.recits[c.id] && c.quand(e)) { montrer(c); return; }
}
export function chapitreVu(id) { const e = E(); return !!(e && e.recits && e.recits[id]); }

function montrer(c) {
  let i = 0;
  const z = el("div", { class: "histoire" });
  const etoiles = () => Array.from({ length: 26 }, () => el("i", { style: { left: Math.random() * 100 + "%", top: Math.random() * 60 + "%" } }));
  const fin = () => { z.remove(); if (window.speechSynthesis) speechSynthesis.cancel(); changer((s) => { s.recits = s.recits || {}; s.recits[c.id] = true; }); };
  const rendre = () => {
    z.innerHTML = "";
    const [t, p] = c.pages[i];
    z.append(el("div", { class: "carte" },
      el("div", { class: "etiquette", style: { color: "#c9a8ff" } }, "Nouveau chapitre"),
      el("div", { class: "fenetre" }, etoiles(), el("div", { class: "ile" })),
      el("h2", {}, t), el("p", {}, p),
      el("div", { style: { display: "flex", gap: "10px" } },
        el("button", { class: "btn principal", onclick: () => { Son.clic(); i++; if (i >= c.pages.length) fin(); else rendre(); } }, i < c.pages.length - 1 ? "Suite" : "Continuer"))));
    parler(p);
  };
  Son.portail();
  rendre();
  document.body.append(z);
}
