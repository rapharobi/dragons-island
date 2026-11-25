// Le Livre des dragons : un wiki interactif avec les modèles 3D, les stats de chaque niveau, les règles et l'équilibrage.
import { construireDragon } from "./modele.js";
import { Animateur, ANIMATIONS } from "./anim.js";
import { ciel, eclairage, Orbite, socle } from "./scene.js";
import { E, changer, possede, livreComplet } from "./etat.js";
import { DONNEES } from "./donnees.js";
import { DRAGONS, PAR_ID, ELEMENTS, ELEMENTS_FUTURS, STADES, PALIERS, R, TOURS, NIDS, COUVOIR, COUT, recetteNid, SOURCES, NIVEAU_PERCEE, attenteOeuf, armuresDe, xpSuivant, ENERGIE_MAX } from "./regles.js";
import { GENOMES } from "./genomes.js";
import { el, styles, toast, modale, icone, barre } from "./ui.js";
import { Son, Musique } from "./son.js";

const T = window.THREE;
let D = null, ctxJeu = null, ui = null;
const vue = { onglet: "dragons", filtre: "tous", id: "braisil", stade: 3, armure: null, ul: false, niveau: 10, sous: "fiche", anim: "repos", auto: true };

styles("livre", `
.lv-gauche { position: fixed; z-index: 15; left: var(--bord-g); top: calc(var(--hud) + 8px); bottom: calc(var(--bas) + 84px); width: 250px; padding: 12px; display: flex; flex-direction: column; gap: 10px; }
.lv-onglets { display: flex; gap: 4px; flex-wrap: wrap; }
.lv-onglets button { flex: 1; padding: 7px 6px; border-radius: 8px; border: 1px solid var(--trait); background: none; font-size: 12px; font-weight: 600; color: var(--doux); }
.lv-onglets button.actif { color: var(--ambre); border-color: var(--ambre); background: rgba(242,181,68,.1); }
.lv-liste { overflow: auto; display: grid; gap: 4px; align-content: start; min-height: 0; flex: 1; }
.lv-item { display: grid; grid-template-columns: 8px 1fr auto; gap: 8px; align-items: center; padding: 7px 9px; border-radius: 9px; border: 1px solid transparent; background: none; text-align: left; }
.lv-item:hover { background: rgba(255,255,255,.05); }
.lv-item.actif { border-color: var(--trait-fort); background: rgba(255,255,255,.07); }
.lv-item i { width: 8px; height: 8px; border-radius: 50%; background: var(--el); }
.lv-item b { font-family: var(--titre); font-size: 14px; font-weight: 600; }
.lv-item small { font-size: 10px; color: var(--doux); }
.lv-item .possede { color: var(--bon); font-size: 10px; font-weight: 700; }
.lv-droite { position: fixed; z-index: 15; right: var(--bord-d); top: calc(var(--hud) + 8px); bottom: calc(var(--bas) + 84px); width: min(400px, 34vw); padding: 16px; overflow: auto; display: grid; gap: 12px; align-content: start; }
.lv-droite h2 { font-size: 30px; line-height: 1; }
.lv-droite h3 { font-size: 15px; }
.lv-droite p { margin: 0; line-height: 1.5; color: #d8d2c6; }
.sous-onglets { display: flex; gap: 6px; border-bottom: 1px solid var(--trait); }
.sous-onglets button { background: none; border: 0; padding: 8px 4px; color: var(--doux); font-weight: 600; border-bottom: 2px solid transparent; }
.sous-onglets button.actif { color: var(--texte); border-color: var(--ambre); }
.choix-ligne { display: flex; gap: 5px; flex-wrap: wrap; }
.choix-ligne button { padding: 6px 9px; border-radius: 8px; border: 1px solid var(--trait-fort); background: rgba(255,255,255,.04); font-size: 12px; font-weight: 600; }
.choix-ligne button.actif { border-color: var(--ambre); color: var(--ambre); background: rgba(242,181,68,.12); }
.tbl { width: 100%; border-collapse: collapse; font-size: 12px; }
.tbl th, .tbl td { padding: 5px 6px; text-align: left; border-bottom: 1px solid var(--trait); }
.tbl th { color: var(--doux); font-weight: 600; font-size: 10px; letter-spacing: .08em; text-transform: uppercase; }
.tbl td.num, .tbl th.num { text-align: right; font-family: var(--mono); }
.tbl tr.bloque td { color: #6a665e; }
.tbl tr.ici td { background: rgba(242,181,68,.08); }
.defile { overflow-x: auto; }
.lv-plein { position: fixed; z-index: 15; left: calc(var(--bord-g) + 262px); right: var(--bord-d); top: calc(var(--hud) + 8px); bottom: calc(var(--bas) + 84px); padding: 18px 20px; overflow: auto; display: grid; gap: 16px; align-content: start; }
.lv-plein h2 { font-size: 26px; }
.lv-plein section { display: grid; gap: 8px; max-width: 900px; }
.lv-plein p { margin: 0; line-height: 1.55; color: #d8d2c6; max-width: 70ch; }
.formule { font-family: var(--mono); font-size: 13px; padding: 12px; border-radius: 10px; background: rgba(255,255,255,.05); border: 1px solid var(--trait); overflow-x: auto; white-space: nowrap; }
.barres-eq { display: grid; gap: 3px; }
.barres-eq .l { display: grid; grid-template-columns: 96px 1fr 1fr 1fr; gap: 6px; align-items: center; font-size: 12px; }
.barres-eq .b { height: 10px; border-radius: 3px; background: rgba(255,255,255,.06); position: relative; overflow: hidden; }
.barres-eq .b i { position: absolute; left: 0; top: 0; bottom: 0; background: var(--el); opacity: .85; }
.barres-eq .b::after { content: ""; position: absolute; left: 50%; top: -2px; bottom: -2px; width: 1px; background: rgba(255,255,255,.5); }
.carte-mat { display: grid; grid-template-columns: 90px repeat(21, minmax(14px, 1fr)); gap: 1px; font-size: 9px; min-width: 520px; }
.carte-mat div { aspect-ratio: 1; display: grid; place-items: center; }
.carte-mat .tete { aspect-ratio: auto; justify-content: start; padding-right: 4px; font-size: 10px; }
.livre-prog { padding: 10px; border-radius: 10px; background: rgba(255,255,255,.04); border: 1px solid var(--trait); display: grid; gap: 6px; font-size: 12px; }
@media (max-width: 900px) {
  .lv-gauche { right: var(--bord-d); width: auto; bottom: auto; padding: 8px; gap: 6px; }
  .lv-liste { display: flex; overflow-x: auto; overflow-y: hidden; gap: 4px; flex: none; }
  .lv-item { grid-template-columns: 8px auto; padding: 5px 8px; white-space: nowrap; }
  .lv-item small, .lv-item .possede { display: none; }
  .lv-droite { left: var(--bord-g); right: var(--bord-d); width: auto; top: 52vh; bottom: calc(var(--bas) + 78px); padding: 12px; }
  .lv-droite h2 { font-size: 22px; }
  .lv-plein { left: var(--bord-g); top: calc(var(--hud) + 100px); bottom: calc(var(--bas) + 78px); padding: 14px; }
  .livre-prog { display: none; }
}
`);

function construireStudio() {
  const scene = new T.Scene();
  scene.add(ciel(0x14121e, 0x2a2434, 0x0e0d12));
  eclairage(scene, { ciel: 0xd8d0ff, sol: 0x2a2220, hemi: 0.8, soleil: 0xfff2e0, force: 1.5, zoneOmbre: 4, x: 3, y: 6, z: 4, carte: 2048 });
  const s = socle(2.6, 0x2a2630, 0xf2b544); scene.add(s);
  const camera = new T.PerspectiveCamera(38, 1, 0.05, 200);
  const orbite = new Orbite(camera, document.getElementById("scene3d"));
  orbite.min = 1.5; orbite.max = 12;
  const support = new T.Group(); scene.add(support);
  D = {
    scene, camera, orbite, support, socle: s, rig: null, anim: null, cle: null,
    update(dt) { orbite.update(dt); if (vue.auto) support.rotation.y += dt * 0.25; if (D.anim) D.anim.update(dt); },
  };
}

function montrerModele(force = false) {
  const cle = `${vue.id}|${vue.stade}|${vue.armure}|${vue.ul}`;
  if (!force && cle === D.cle) return;
  D.cle = cle;
  while (D.support.children.length) D.support.remove(D.support.children[0]);
  const rig = construireDragon(vue.id, vue.stade, { armure: vue.armure, ul: vue.ul });
  D.support.add(rig.racine);
  D.rig = rig;
  D.anim = new Animateur(rig);
  if (vue.anim === "marche" || vue.anim === "vol" || vue.anim === "ko") D.anim.jouer(vue.anim);
  const h = rig.taille.y, l = Math.max(rig.taille.x, rig.taille.z);
  const taille = Math.max(h * 1.4, l);
  const etroit = window.innerWidth / window.innerHeight < 0.8 ? 2.5 : 1;
  D.orbite.viser(new T.Vector3(0, h * 0.45, 0), Math.max(2.2, taille * 1.55) * etroit, D.orbite.thetaV || 0.7, 1.22);
  D.socle.scale.setScalar(Math.max(0.5, l / 4));
}

export function ouvrir(ctx, params = {}) {
  ctxJeu = ctx;
  if (!D) construireStudio();
  if (params.id) { vue.id = params.id; vue.onglet = "dragons"; if (params.stade !== undefined) vue.stade = params.stade; }
  ui = document.getElementById("ecran");
  Musique.jouer("livre");
  rendre();
}
export function fermer() { ctxJeu.moteur.definirZone(null); }

function zone() {
  const l = window.innerWidth;
  if (vue.onglet !== "dragons") return null;
  if (l <= 900) return { x: 0, y: 0.25, l: 1, h: 0.27 };
  const g = 280 / l, d = Math.min(420, l * 0.34 + 20) / l;
  return { x: g, y: 0, l: 1 - g - d, h: 1 };
}

function rendre() {
  ui.innerHTML = "";
  ctxJeu.moteur.montrer(D, zone());
  const g = el("aside", { class: "lv-gauche panneau" });
  const ong = el("div", { class: "lv-onglets" });
  for (const [id, nom] of [["dragons", "Dragons"], ["elements", "Éléments"], ["regles", "Règles"], ["equilibrage", "Équilibrage"]]) {
    ong.append(el("button", { class: vue.onglet === id ? "actif" : "", onclick: () => { Son.clic(); vue.onglet = id; rendre(); } }, nom));
  }
  g.append(ong);
  if (vue.onglet === "dragons") {
    const f = el("div", { class: "choix-ligne" });
    for (const [id, nom] of [["tous", "Tous"], ["feu", "Feu"], ["glace", "Glace"], ["eau", "Eau"]]) f.append(el("button", { class: vue.filtre === id ? "actif" : "", onclick: () => { vue.filtre = id; rendre(); } }, nom));
    g.append(f);
    const liste = el("div", { class: "lv-liste" });
    for (const d of DRAGONS) {
      if (vue.filtre !== "tous" && d.element !== vue.filtre) continue;
      liste.append(el("button", { class: `lv-item ${d.element} ${vue.id === d.id ? "actif" : ""}`, onclick: () => { Son.clic(); vue.id = d.id; vue.ul = false; vue.armure = null; rendre(); } },
        el("i"), el("span", {}, el("b", {}, d.nom), el("br"), el("small", {}, DONNEES.archetypes[d.archetype].nom)), possede(d.id) ? el("span", { class: "possede" }, "✓") : el("span")));
    }
    g.append(liste);
    const e = E();
    const n = e.livre.vus.length;
    if (!e.stub) g.append(el("div", { class: "livre-prog" }, el("div", { style: { display: "flex", justifyContent: "space-between" } }, el("b", {}, "Livre des dragons"), el("span", { class: "num" }, `${n}/21`)), barre(n, 21, ""), el("span", { class: "doux" }, livreComplet() ? "Complet ! Version UL et création débloquées." : "Complète-le pour débloquer une version UL et créer un dragon.")));
  }
  ui.append(g);
  if (vue.onglet === "dragons") { montrerModele(); ui.append(ficheDragon()); }
  else if (vue.onglet === "elements") ui.append(pageElements());
  else if (vue.onglet === "regles") ui.append(pageRegles());
  else ui.append(pageEquilibrage());
}

// ---------- Fiche d'un dragon ----------
function ficheDragon() {
  const d = PAR_ID[vue.id];
  const arch = DONNEES.archetypes[d.archetype];
  const p = el("section", { class: "lv-droite panneau" });
  const moi = E().dragons.filter((x) => x.id === d.id);
  p.append(el("div", {},
    el("div", { class: "choix-ligne", style: { marginBottom: "6px" } }, el("span", { class: "pil " + d.element }, ELEMENTS[d.element].nom), el("span", { class: "pil" }, arch.nom), d.starter ? el("span", { class: "pil", style: { "--el": "var(--doux)" } }, "Œuf de départ") : null),
    el("h2", {}, d.nom), el("div", { class: "doux", style: { marginTop: "4px" } }, d.titre)));
  const so = el("div", { class: "sous-onglets" });
  for (const [id, nom] of [["fiche", "Fiche"], ["apparence", "Apparence"], ["niveaux", "20 niveaux"]]) so.append(el("button", { class: vue.sous === id ? "actif" : "", onclick: () => { vue.sous = id; rendre(); } }, nom));
  p.append(so);
  if (vue.sous === "fiche") {
    p.append(el("p", {}, d.histoire));
    p.append(el("p", { class: "doux", style: { fontSize: "12px" } }, `${arch.nom} : ${arch.resume}`));
    if (moi.length) p.append(el("div", { class: "livre-prog", style: { display: "grid" } }, el("b", {}, moi.length > 1 ? `Tu en as ${moi.length}` : "Dans ta couvée"), ...moi.map((x) => el("span", { class: "doux" }, `Niveau ${x.niveau} · ${x.pv} PV · ${NIDS[x.nid].nom}`))));
    // Niveau
    const val = el("b", { class: "num" }, vue.niveau);
    p.append(el("label", { style: { display: "grid", gap: "6px" } }, el("span", { class: "etiquette" }, "Voir au niveau ", val), el("input", { type: "range", min: 1, max: 20, value: vue.niveau, id: "lv-niveau", oninput: (ev) => { vue.niveau = +ev.target.value; val.textContent = vue.niveau; const t = document.getElementById("lv-tbl-post"); if (t) t.replaceWith(tablePostures(d)); } })));
    p.append(tablePostures(d));
    p.append(el("h3", {}, "Les 5 stades"));
    const tb = el("table", { class: "tbl" }, el("tr", {}, el("th", {}, "Stade"), el("th", {}, "Apparence")));
    d.stades.forEach((s, i) => tb.append(el("tr", { class: vue.stade === i ? "ici" : "", style: { cursor: "pointer" }, onclick: () => { vue.stade = i; rendre(); } }, el("td", {}, el("b", {}, s.nom), el("br"), el("small", { class: "doux" }, `Nv ${s.niveau}`)), el("td", {}, s.apparence))));
    p.append(tb);
    p.append(el("h3", {}, "Armures (boutique)"));
    for (const a of armuresDe(d.id)) p.append(el("div", { style: { display: "flex", justifyContent: "space-between", fontSize: "13px", gap: "8px" } }, el("span", {}, a.nomComplet), el("span", { class: "doux" }, a.texte)));
  } else if (vue.sous === "apparence") {
    p.append(el("div", { class: "etiquette" }, "Stade"));
    const st = el("div", { class: "choix-ligne" });
    STADES.forEach((s, i) => st.append(el("button", { class: vue.stade === i ? "actif" : "", onclick: () => { vue.stade = i; rendre(); } }, `${s} (${PALIERS[i]})`)));
    p.append(st);
    p.append(el("p", { class: "doux", style: { fontSize: "12px" } }, d.stades[vue.stade].apparence));
    p.append(el("div", { class: "etiquette" }, "Armure"));
    const ar = el("div", { class: "choix-ligne" });
    ar.append(el("button", { class: !vue.armure ? "actif" : "", onclick: () => { vue.armure = null; rendre(); } }, "Aucune"));
    for (const a of armuresDe(d.id)) ar.append(el("button", { class: vue.armure === a.id ? "actif" : "", onclick: () => { vue.armure = a.id; Son.achat(); rendre(); } }, a.nomComplet));
    p.append(ar);
    p.append(el("div", { class: "etiquette" }, "Version"));
    p.append(el("div", { class: "choix-ligne" },
      el("button", { class: !vue.ul ? "actif" : "", onclick: () => { vue.ul = false; rendre(); } }, "Normale"),
      el("button", { class: vue.ul ? "actif" : "", onclick: () => { vue.ul = true; Son.evolution(); rendre(); } }, "UL (Ultime)")));
    p.append(el("div", { class: "etiquette" }, "Animations"));
    const an = el("div", { class: "choix-ligne" });
    for (const a of ANIMATIONS) an.append(el("button", { class: vue.anim === a.id ? "actif" : "", onclick: () => {
      vue.anim = a.id;
      if (a.id === "rugir") Son.crier(d.element, vue.stade / 4);
      if (a.id === "attaque") Son.souffle(d.element);
      D.anim.jouer(a.boucle ? a.id : a.id);
      if (!a.boucle && D.anim.boucle !== "repos" && D.anim.boucle !== "vol" && D.anim.boucle !== "marche") D.anim.jouer("repos");
      an.querySelectorAll("button").forEach((b) => b.classList.toggle("actif", b.textContent === a.nom));
    } }, a.nom));
    p.append(an);
    p.append(el("div", { class: "choix-ligne" }, el("button", { class: vue.auto ? "actif" : "", onclick: (ev) => { vue.auto = !vue.auto; ev.currentTarget.classList.toggle("actif", vue.auto); } }, "Rotation automatique")));
    p.append(el("p", { class: "doux", style: { fontSize: "12px" } }, "Glisse sur le dragon pour tourner autour, molette ou pincement pour zoomer."));
    // Création (récompense du livre complet)
    const e = E();
    if (livreComplet()) {
      p.append(el("h3", {}, "Récompense du Livre complet"));
      const elig = e.dragons.filter((x) => x.id === vue.id);
      if (elig.length && !e.livre.ulChoisi) p.append(el("button", { class: "btn principal petit", onclick: () => { changer((s) => { const x = s.dragons.find((y) => y.id === vue.id); x.ul = true; s.livre.ulDebloque = true; s.livre.ulChoisi = vue.id; }); Son.evolution(); toast(`${d.nom} UL rejoint ta couvée !`, "bon"); rendre(); } }, `Prendre ${d.nom} en version UL`));
      else if (e.livre.ulChoisi) p.append(el("p", { class: "doux" }, `Ton dragon UL : ${PAR_ID[e.livre.ulChoisi].nom}.`));
      p.append(el("button", { class: "btn petit", onclick: () => atelierCreation() }, "Créer un dragon de la prochaine génération"));
    }
  } else {
    p.append(tableNiveaux(d));
  }
  return p;
}

function tablePostures(d) {
  const lv = d.niveaux[vue.niveau - 1];
  const w = el("div", { id: "lv-tbl-post", style: { display: "grid", gap: "8px" } });
  w.append(el("div", { style: { display: "flex", gap: "14px", fontSize: "13px", flexWrap: "wrap" } },
    el("span", {}, "PV ", el("b", { class: "num" }, lv.pv)), el("span", {}, "Stade ", el("b", {}, STADES[lv.stade] ?? lv.stade)), el("span", {}, "XP pour monter ", el("b", { class: "num" }, lv.xp_suivant ?? "—"))));
  const t = el("table", { class: "tbl" }, el("tr", {}, el("th", {}, "Posture"), el("th", { class: "num" }, "ATK"), el("th", { class: "num" }, "DEF"), el("th", { class: "num", title: "Dégâts en plus contre l'élément battu" }, "Bonus"), el("th", { class: "num", title: "Dégâts subis en plus contre l'élément qui nous bat" }, "Faibl.")));
  d.postures.forEach((p, i) => {
    const s = lv.postures[i];
    t.append(el("tr", { class: s ? "" : "bloque" }, el("td", {}, p.nom, s ? null : el("small", { class: "doux" }, ` · Nv ${p.palier}`)), el("td", { class: "num" }, s ? s[0] : "—"), el("td", { class: "num" }, s ? s[1] : "—"), el("td", { class: "num" }, `+${Math.round(p.bonus * 100)} %`), el("td", { class: "num" }, `+${Math.round(p.faib * 100)} %`)));
  });
  w.append(t);
  return w;
}

function tableNiveaux(d) {
  const w = el("div", { class: "defile" });
  const t = el("table", { class: "tbl" });
  const h = el("tr", {}, el("th", { class: "num" }, "Nv"), el("th", { class: "num" }, "PV"), el("th", { class: "num" }, "XP"));
  d.postures.forEach((p, i) => h.append(el("th", { class: "num", title: p.nom }, `P${i + 1}`)));
  t.append(h);
  for (const lv of d.niveaux) {
    const r = el("tr", { class: PALIERS.includes(lv.n) ? "ici" : "" }, el("td", { class: "num" }, lv.n), el("td", { class: "num" }, lv.pv), el("td", { class: "num" }, lv.xp_suivant ?? "—"));
    lv.postures.forEach((s) => r.append(el("td", { class: "num" }, s ? `${s[0]}/${s[1]}` : "·")));
    t.append(r);
  }
  w.append(t);
  w.append(el("p", { class: "doux", style: { fontSize: "11px", marginTop: "8px" } }, "Chaque case : ATK/DEF. Les lignes surlignées sont les évolutions (nouvelle posture et nouvelle apparence)."));
  return w;
}

// ---------- Création d'un dragon (récompense) ----------
function atelierCreation() {
  const e = E();
  const c = e.livre.creation || { nom: "", base: vue.id, element: "feu", corps: "#8a3aff", lueur: "#ffd23a" };
  const nom = el("input", { type: "text", id: "crea-nom", value: c.nom, placeholder: "Nom du dragon", maxlength: 18, style: { padding: "9px", borderRadius: "8px", border: "1px solid var(--trait-fort)", background: "rgba(255,255,255,.05)", color: "var(--texte)" } });
  const base = el("select", { id: "crea-base", style: { padding: "8px", borderRadius: "8px", background: "#1a1a22", color: "var(--texte)", border: "1px solid var(--trait-fort)" } }, DRAGONS.map((d) => el("option", { value: d.id, selected: d.id === c.base }, `Silhouette de ${d.nom}`)));
  const corps = el("input", { type: "color", id: "crea-corps", value: c.corps });
  const lueur = el("input", { type: "color", id: "crea-lueur", value: c.lueur });
  modale({
    titre: "Créer un dragon de la prochaine génération",
    contenu: el("div", { style: { display: "grid", gap: "10px" } },
      el("p", { class: "doux", style: { margin: 0 } }, "Les premiers joueurs à compléter le Livre imagineront un dragon des futures mises à jour. Choisis sa silhouette et ses couleurs : l'aperçu s'affiche derrière."),
      nom, base, el("label", { style: { display: "flex", gap: "10px", alignItems: "center" } }, "Couleur du corps", corps), el("label", { style: { display: "flex", gap: "10px", alignItems: "center" } }, "Couleur de la lueur", lueur)),
    boutons: [
      { texte: "Aperçu", action: () => { apercu(base.value, corps.value, lueur.value); return false; } },
      { texte: "Enregistrer", classe: "principal", action: () => { changer((s) => { s.livre.creation = { nom: nom.value.trim() || "Sans nom", base: base.value, corps: corps.value, lueur: lueur.value }; }); apercu(base.value, corps.value, lueur.value); toast("Ton dragon est enregistré.", "bon"); } },
    ],
  });
}
function apercu(baseId, corps, lueur) {
  GENOMES.__creation = JSON.parse(JSON.stringify(GENOMES[baseId]));
  const g = GENOMES.__creation;
  g.base.couleurs = { ...g.base.couleurs, corps: parseInt(corps.slice(1), 16), lueur: parseInt(lueur.slice(1), 16), accent: 0xf4f0e8, aile: parseInt(lueur.slice(1), 16) };
  for (const s of Object.values(g.st || {})) if (s.couleurs) delete s.couleurs;
  vue.id = baseId;
  while (D.support.children.length) D.support.remove(D.support.children[0]);
  const rig = construireDragon("__creation", 4, {});
  D.support.add(rig.racine); D.rig = rig; D.anim = new Animateur(rig); D.anim.jouer("rugir"); D.cle = "creation";
}

// ---------- Éléments ----------
function roue(table, taille = 300) {
  const ids = Object.keys(table);
  const n = ids.length, c = taille / 2, R = taille * 0.36;
  const pos = Object.fromEntries(ids.map((id, i) => { const a = -Math.PI / 2 + (i / n) * Math.PI * 2; return [id, [c + Math.cos(a) * R, c + Math.sin(a) * R]]; }));
  const ns = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(ns, "svg");
  svg.setAttribute("viewBox", `0 0 ${taille} ${taille}`); svg.setAttribute("width", "100%"); svg.style.maxWidth = taille + "px";
  const defs = document.createElementNS(ns, "defs");
  defs.innerHTML = `<marker id="fl-${n}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0 10 5 0 10z" fill="#ece6da"/></marker>`;
  svg.append(defs);
  for (const a of ids) for (const b of table[a].bat) {
    const [x1, y1] = pos[a], [x2, y2] = pos[b];
    const dx = x2 - x1, dy = y2 - y1, l = Math.hypot(dx, dy), k = 30 / l;
    const line = document.createElementNS(ns, "line");
    line.setAttribute("x1", x1 + dx * k); line.setAttribute("y1", y1 + dy * k); line.setAttribute("x2", x2 - dx * k); line.setAttribute("y2", y2 - dy * k);
    line.setAttribute("stroke", table[a].futur || table[b].futur ? "rgba(236,230,218,.45)" : "#ece6da"); line.setAttribute("stroke-width", "1.6");
    if (table[a].futur || table[b].futur) line.setAttribute("stroke-dasharray", "4 4");
    line.setAttribute("marker-end", `url(#fl-${n})`);
    svg.append(line);
  }
  for (const id of ids) {
    const [x, y] = pos[id];
    const g = document.createElementNS(ns, "g");
    g.innerHTML = `<circle cx="${x}" cy="${y}" r="24" fill="${table[id].couleur}" fill-opacity="${table[id].futur ? 0.25 : 0.9}" stroke="${table[id].couleur}" stroke-width="2"/><text x="${x}" y="${y + 4}" text-anchor="middle" font-family="Chakra Petch, sans-serif" font-size="12" font-weight="700" fill="${table[id].futur ? table[id].couleur : "#15161f"}">${table[id].nom}</text>`;
    svg.append(g);
  }
  return svg;
}
function pageElements() {
  const p = el("section", { class: "lv-plein panneau" });
  p.append(el("section", {}, el("div", { class: "etiquette" }, "Le cœur du jeu"), el("h2", {}, "Pierre, feuille, ciseaux"),
    el("p", {}, "Chaque flèche va de l'élément qui gagne vers celui qui perd. Quand ton dragon frappe l'élément qu'il bat, il ajoute le bonus de sa posture, et l'adversaire subit en plus sa faiblesse. À l'inverse, frapper l'élément qui te bat est peu efficace (dégâts × 0,7). Entre deux dragons du même élément, le coup est normal."),
    roue(ELEMENTS, 260)));
  p.append(el("section", {}, el("div", { class: "etiquette" }, "Prévu pour une mise à jour"), el("h3", { style: { fontSize: "20px" } }, "Six éléments"),
    el("p", {}, "Trois nouveaux éléments arriveront plus tard. Chacun bat un ancien élément et un nouveau, et il est battu par un ancien et un nouveau. Chaque élément bat donc 2 éléments, perd contre 2, et reste neutre contre 1. Les noms Foudre, Terre et Vent sont une proposition."),
    roue(ELEMENTS_FUTURS, 340),
    tableauFuturs()));
  return p;
}
function tableauFuturs() {
  const t = el("table", { class: "tbl", style: { maxWidth: "520px" } }, el("tr", {}, el("th", {}, "Élément"), el("th", {}, "Bat"), el("th", {}, "Perd contre"), el("th", {}, "Neutre")));
  const ids = Object.keys(ELEMENTS_FUTURS);
  for (const a of ids) {
    const bat = ELEMENTS_FUTURS[a].bat, perd = ids.filter((b) => ELEMENTS_FUTURS[b].bat.includes(a));
    const neutre = ids.filter((b) => b !== a && !bat.includes(b) && !perd.includes(b));
    const n = (l) => l.map((x) => ELEMENTS_FUTURS[x].nom).join(", ");
    t.append(el("tr", {}, el("td", {}, el("b", { style: { color: ELEMENTS_FUTURS[a].couleur } }, ELEMENTS_FUTURS[a].nom)), el("td", {}, n(bat)), el("td", {}, n(perd)), el("td", {}, n(neutre))));
  }
  return el("div", { class: "defile" }, t);
}

// ---------- Règles ----------
function pageRegles() {
  const p = el("section", { class: "lv-plein panneau" });
  p.append(el("section", {}, el("div", { class: "etiquette" }, "Combat"), el("h2", {}, "Neuf tours, le plus de dégâts gagne"),
    el("p", {}, `Équipe de 7 dragons au plus. À chaque tour, les deux joueurs choisissent en secret un dragon puis une posture (${E().reglages.chrono || "sans limite de"} s pour choisir). Les deux dragons frappent en même temps. Après ${TOURS} tours, celui qui a infligé le plus de dégâts gagne. Un dragon à 0 PV est K.O. : il ne peut plus être choisi, et il reste K.O. après le combat tant qu'il n'a pas mangé.`),
    el("div", { class: "formule" }, `dégâts = ATK × ${R.force} × ${R.amorti} / (${R.amorti} + DEF adverse) × (1 + bonus + faiblesse adverse si on bat son élément, ou × ${R.malus_domine ?? 0.7} si on frappe l'élément qui nous bat) × hasard (${R.alea[0]} à ${R.alea[1]}, et 1 coup sur ${Math.round(1 / R.chance)} fait ×${R.mult_chance})`),
    el("p", {}, "Matchmaking : un adversaire de ton niveau. S'il n'y en a pas, un bot du même niveau. Contre un ami, l'écart de niveau est permis."),
  ));
  // Progression
  const xp = el("table", { class: "tbl", style: { maxWidth: "520px" } }, el("tr", {}, el("th", { class: "num" }, "Niveau"), el("th", { class: "num" }, "XP pour monter"), el("th", { class: "num" }, "Total")));
  let tot = 0;
  for (let n = 1; n < 20; n++) { tot += xpSuivant(n); xp.append(el("tr", { class: PALIERS.includes(n + 1) ? "ici" : "" }, el("td", { class: "num" }, `${n} → ${n + 1}`), el("td", { class: "num" }, xpSuivant(n)), el("td", { class: "num" }, tot))); }
  p.append(el("section", {}, el("div", { class: "etiquette" }, "Progression"), el("h2", {}, "Niveaux, évolutions et nids"),
    el("p", {}, "Niveaux 1 à 20. Aux niveaux 5, 10, 15 et 20, le dragon change d'apparence et gagne une posture, à condition d'avoir un nid assez grand. Sinon il continue de monter en niveau et en stats, et il évolue dès que son nid est amélioré. XP par combat : 20 + 4 × le niveau moyen adverse en cas de victoire, 40 % de ça en cas de défaite, pour chaque dragon envoyé au moins une fois."),
    el("div", { class: "defile" }, el("table", { class: "tbl", style: { maxWidth: "720px" } }, el("tr", {}, el("th", {}, "Nid"), el("th", {}, "Permet"), el("th", {}, "Recette (Feu)")), ...NIDS.slice(1).map((n, i) => el("tr", {}, el("td", {}, n.nom), el("td", {}, n.desc), el("td", { class: "doux" }, Object.entries(recetteNid(i + 1, "feu")).map(([k, v]) => `${v} ${k}`).join(", ")))))),
    el("div", { class: "defile" }, xp)));
  // Œufs
  const oe = el("table", { class: "tbl", style: { maxWidth: "520px" } }, el("tr", {}, el("th", { class: "num" }, "Œuf n°"), el("th", { class: "num" }, "Attente"), el("th", { class: "num" }, "Depuis le 1er")));
  let cumul = 0;
  for (let k = 2; k <= 21; k++) { cumul += attenteOeuf(k); oe.append(el("tr", { class: k === 7 || k === 21 ? "ici" : "" }, el("td", { class: "num" }, k), el("td", { class: "num" }, `${attenteOeuf(k)} h`), el("td", { class: "num" }, cumul < 48 ? `${cumul} h` : `${(cumul / 24).toFixed(1)} j`))); }
  p.append(el("section", {}, el("div", { class: "etiquette" }, "Œufs"), el("h2", {}, "Minuteur et couvoir"),
    el("p", {}, "Au début, on choisit un œuf parmi trois (Feu, Glace, Eau). Ensuite, le minuteur double à chaque œuf jusqu'à 24 h, puis ajoute 1 h à chaque œuf. Chaque œuf obtenu est choisi parmi les trois mêmes œufs ; le dragon qui sort est un de ceux qu'on n'a pas encore. Quand on les a tous, l'œuf donne un double. Il y a aussi une chance sur 10 chaque jour d'un œuf gratuit, des œufs trouvés en marchant, et des œufs dans les nids NFC."),
    el("p", {}, `Tous les œufs passent par le couvoir : 1 œuf à la fois, qui éclot après ${COUVOIR[0].pas.toLocaleString("fr-FR")} pas. Le grand couvoir accueille 2 œufs qui éclosent ensemble après ${COUVOIR[1].pas.toLocaleString("fr-FR")} pas. Dans les réglages, on peut remplacer les pas par du temps (${COUVOIR[0].heures} h, ou ${COUVOIR[1].heures} h pour le grand couvoir).`),
    el("div", { class: "defile" }, oe)));
  p.append(el("section", {}, el("div", { class: "etiquette" }, "Îles"), el("h2", {}, "Nourriture, fermes, énergie"),
    el("p", {}, `Une ration rend 20 % des PV. On en gagne en combat et sur les buissons. Un dragon doit manger chaque jour : chaque jour sans repas lui coûte 5 % de ses PV, sans jamais descendre sous 1. L'énergie va jusqu'à ${ENERGIE_MAX} et remonte de 1 par heure. Un combat classé coûte ${COUT.combat} d'énergie.`),
    el("p", {}, `Sources magiques : au centre de chaque île dort une source. ${Object.entries(SOURCES).map(([k, v]) => `${v.noms[0]} → ${v.noms[1]} (avec ${PAR_ID[v.cle].nom})`).join(" ; ")}. Niveau 2 : 3 dragons de l'élément au niveau 5. Niveau 3 : les 7 au niveau 15. Leur nourriture soigne 30 %, donne 40 XP, et elle est obligatoire pour passer chaque niveau au-delà du niveau ${NIVEAU_PERCEE}.`),
    el("p", {}, `Habitats : chaque dragon niche sur la terre ferme, sur un perchoir en hauteur, près d'une cheminée de lave, à la surface de l'eau ou au fond du lagon. On peut déplacer son nid vers une autre place de son habitat.`),
    el("p", {}, "Récolte : les buissons donnent des brindilles, les rochers des pierres, les gisements le matériau de l'île (obsidienne, givrite, corail). Ils repoussent en 10 minutes. Les cœurs de dragon se gagnent en remportant des combats et servent aux nids uniques.")));
  return p;
}

// ---------- Équilibrage ----------
function pageEquilibrage() {
  const p = el("section", { class: "lv-plein panneau" });
  p.append(el("section", {}, el("div", { class: "etiquette" }, "Simulation"), el("h2", {}, "Taux de victoire en duel"),
    el("p", {}, `Chaque paire de dragons s'affronte en duel de ${TOURS} tours, chacun jouant sa meilleure stratégie (calculée comme au pierre-feuille-ciseaux). Le trait blanc est 50 %. Les archétypes « précoces » dominent au début, les « tardifs » et « remparts » à la fin : c'est voulu. Au niveau 20, tous restent entre 45 et 60 %.`)));
  const b = el("div", { class: "barres-eq" });
  b.append(el("div", { class: "l doux" }, el("span"), el("span", {}, "Niveau 5"), el("span", {}, "Niveau 10"), el("span", {}, "Niveau 20")));
  for (const d of [...DRAGONS].sort((x, y) => y.equilibrage.victoire["20"] - x.equilibrage.victoire["20"])) {
    const v = d.equilibrage.victoire;
    b.append(el("div", { class: "l " + d.element }, el("b", { style: { fontFamily: "var(--titre)" } }, d.nom),
      ...["5", "10", "20"].map((n) => el("div", { class: "b", title: `${Math.round(v[n] * 100)} %` }, el("i", { style: { width: v[n] * 100 + "%" } })))));
  }
  p.append(el("section", {}, b));
  // Carte des duels
  const m = DONNEES.matrice20;
  const grille = el("div", { class: "carte-mat" });
  grille.append(el("div"));
  for (const d of DRAGONS) grille.append(el("div", { title: d.nom, style: { color: ELEMENTS[d.element].couleur, fontWeight: 700 } }, d.nom.slice(0, 2)));
  for (const a of DRAGONS) {
    grille.append(el("div", { class: "tete", style: { color: ELEMENTS[a.element].couleur } }, a.nom));
    for (const b2 of DRAGONS) {
      const v = m[a.id][b2.id];
      const c = v > 0.5 ? `rgba(111,214,138,${(v - 0.5) * 1.8})` : `rgba(255,93,93,${(0.5 - v) * 1.8})`;
      grille.append(el("div", { title: `${a.nom} contre ${b2.nom} : ${Math.round(v * 100)} %`, style: { background: a.id === b2.id ? "rgba(255,255,255,.06)" : c } }));
    }
  }
  p.append(el("section", {}, el("h3", { style: { fontSize: "18px" } }, "Qui bat qui au niveau 20"), el("p", { class: "doux" }, "Ligne contre colonne. Vert : la ligne gagne le plus souvent. Rouge : elle perd. Survole une case pour le chiffre."), el("div", { class: "defile" }, grille)));
  return p;
}
