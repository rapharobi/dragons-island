// Les crottes de dragons : chaque dragon en laisse sur son île de temps en temps (flottantes dans le lagon pour les nageurs).
// On les ramasse à la main (en les touchant), avec un dragon nettoyeur (un par île), ou avec des aspirateurs-robots :
// terrestre, aquatique (pour le lagon de l'île d'Eau), ou hybride (fusion des deux : fait tout, mais plus lentement).
// Les crottes deviennent de l'engrais de leur élément. L'engrais ne sert que sur une AUTRE île : il la rend fertile
// pendant 6 h (ressources qui repoussent deux fois plus vite, fermes +50 %). Une île trop sale (6 crottes ou plus) repousse moins vite.
import { E, changer, maintenant } from "./etat.js";
import { PAR_ID, ELEMENTS } from "./regles.js";
import { emplacements, solIle, dansLEau, NIVEAU_EAU, rayonBord } from "./monde.js";
import { mat, mesh } from "./outils3d.js";
import { el, styles, toast, icone, modale } from "./ui.js";
import { Son } from "./son.js";
import { extensions, moteurIles, focaliser, fermerFiche } from "./iles.js";

const T = window.THREE;
const MIN = 60e3;
const NOM_ILE = { feu: "Île de Feu", glace: "Île de Glace", eau: "Île d'Eau" };
export const ASPIRATEURS = {
  terre: { nom: "Aspirateur terrestre", vitesse: 0.9, cout: { pierres: 40, brindilles: 20 }, gemmes: 150, desc: "Ramasse les crottes sur la terre ferme d'une île." },
  eau: { nom: "Aspirateur aquatique", vitesse: 0.9, cout: { pierres: 40, corail: 20 }, gemmes: 150, desc: "Ramasse les crottes qui flottent dans le lagon de l'île d'Eau." },
  hybride: { nom: "Aspirateur hybride", vitesse: 0.5, cout: null, desc: "Fusion d'un terrestre et d'un aquatique : il fait tout, mais plus lentement." },
};

function etat() {
  const e = E();
  if (!e.crottes) e.crottes = { feu: [], glace: [], eau: [] };
  if (!e.aspirateurs) e.aspirateurs = [];
  if (!e.nettoyeurs) e.nettoyeurs = {};
  if (!e.fertilite) e.fertilite = {};
  if (!e.prochaineCrotte) e.prochaineCrotte = {};
  return e;
}
export const fertile = (elx) => { const f = E() && E().fertilite && E().fertilite[elx]; return !!f && f > maintenant(); };
export const sale = (elx) => (E() && E().crottes && E().crottes[elx] ? E().crottes[elx].length >= 6 : false);

// ---------- Les dragons font leurs besoins ----------
let compteur = 0;
function pondre(e, d, pos) {
  const elx = PAR_ID[d.id].element;
  const l = e.crottes[elx];
  if (l.length >= 14) return;
  let x, z;
  if (pos) { x = pos.x + (Math.random() - 0.5) * 0.6; z = pos.z + (Math.random() - 0.5) * 0.6; }
  else { const s = emplacements(elx).find((p) => p.id === d.place) || { x: 4, z: 0 }; x = s.x + (Math.random() - 0.5) * 3; z = s.z + (Math.random() - 0.5) * 3; }
  const r = Math.hypot(x, z), lim = rayonBord(elx, Math.atan2(z, x)) - 1.5;
  if (r > lim) { x *= lim / r; z *= lim / r; }
  l.push({ id: "c" + Date.now().toString(36) + (++compteur), x, z, eau: dansLEau(elx, x, z) });
}
function verifierPontes() {
  const e = etat(), t = maintenant();
  const D = moteurIles();
  let change = false;
  for (const d of e.dragons) {
    if (d.expedition) continue;
    const p = e.prochaineCrotte[d.uid];
    if (!p) { e.prochaineCrotte[d.uid] = t + (25 + Math.random() * 35) * MIN; change = true; continue; }
    if (t < p) continue;
    // Absent depuis longtemps : au plus 3 crottes rattrapées par dragon
    const n = Math.min(3, 1 + Math.floor((t - p) / (45 * MIN)));
    const v = D && D.dragons.get(d.uid);
    for (let i = 0; i < n; i++) pondre(e, d, v ? v.mobile.position : null);
    e.prochaineCrotte[d.uid] = t + (35 + Math.random() * 40) * MIN;
    change = true;
  }
  if (change) changer(() => {});
}

// ---------- Ramasser ----------
function ramasser(elx, id, par) {
  let ok = false;
  changer((s) => {
    const l = s.crottes[elx], i = l.findIndex((c) => c.id === id);
    if (i < 0) return;
    l.splice(i, 1);
    const k = "engrais_" + elx;
    s.ressources[k] = (s.ressources[k] || 0) + 1;
    ok = true;
  });
  if (ok && par === "main") { Son.croquer("rations"); }
  return ok;
}

// ---------- 3D : crottes, mouches, aspirateurs ----------
const V = { objets: new Map(), robots: new Map(), t: 0, dernier: 0, panneau: null };
function modeleCrotte(eau) {
  const g = new T.Group();
  const m = mat(0x5a3a1e, { r: 0.6, m: 0.05 });
  if (eau) { const b = mesh(new T.SphereGeometry(0.16, 7, 5).scale(1.3, 0.45, 1), m, false); g.add(b); }
  else {
    [[0.17, 0.08], [0.13, 0.19], [0.08, 0.28]].forEach(([r, y]) => { const s = mesh(new T.SphereGeometry(r, 7, 5).scale(1, 0.62, 1), m, false); s.position.y = y; g.add(s); });
    const pointe = mesh(new T.ConeGeometry(0.05, 0.1, 5), m, false); pointe.position.y = 0.36; g.add(pointe);
  }
  // Deux mouches qui tournent autour
  const mouches = [];
  for (let i = 0; i < 2; i++) { const f = mesh(new T.SphereGeometry(0.025, 4, 3), mat(0x111111, { r: 0.5 }), false); g.add(f); mouches.push(f); }
  g.userData.mouches = mouches;
  const zone = new T.Mesh(new T.SphereGeometry(0.55, 6, 4), new T.MeshBasicMaterial({ visible: false })); zone.position.y = 0.2; g.add(zone);
  return g;
}
function modeleRobot(type) {
  const g = new T.Group();
  const coque = mat(type === "eau" ? 0x2fa0c0 : type === "hybride" ? 0x8a6ad8 : 0xd8d8e0, { r: 0.35, m: 0.5 });
  const corps = mesh(new T.CylinderGeometry(0.32, 0.34, 0.14, 16), coque); corps.position.y = 0.09; g.add(corps);
  const dome = mesh(new T.SphereGeometry(0.12, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), mat(0x1a1a22, { r: 0.2, m: 0.6 })); dome.position.y = 0.16; g.add(dome);
  const voyant = mesh(new T.SphereGeometry(0.04, 6, 4), mat(0x6fd68a, { e: 0x6fd68a, ei: 1.2 }), false); voyant.position.set(0, 0.2, 0.24); g.add(voyant);
  if (type !== "terre") { const flotteur = mesh(new T.TorusGeometry(0.36, 0.05, 6, 18).rotateX(Math.PI / 2), mat(0xff8a4a, { r: 0.6 }), false); flotteur.position.y = 0.06; g.add(flotteur); }
  g.userData.voyant = voyant;
  return g;
}
function synchro() {
  const D = moteurIles();
  if (!D || !E()) return;
  const e = etat();
  const vus = new Set();
  for (const elx of ["feu", "glace", "eau"]) for (const c of e.crottes[elx]) {
    vus.add(c.id);
    if (V.objets.has(c.id)) continue;
    const g = modeleCrotte(c.eau);
    g.position.set(c.x, c.eau ? NIVEAU_EAU + 0.02 : solIle(elx, c.x, c.z), c.z);
    g.rotation.y = Math.random() * 6;
    g.userData.action = { type: "crotte", id: c.id, ile: elx };
    D.iles[elx].groupe.add(g);
    V.objets.set(c.id, { g, elx });
  }
  for (const [id, o] of V.objets) if (!vus.has(id)) { o.g.parent && o.g.parent.remove(o.g); V.objets.delete(id); }
  const vusR = new Set();
  for (const a of e.aspirateurs) {
    vusR.add(a.id);
    if (V.robots.has(a.id)) continue;
    const g = modeleRobot(a.type);
    const x = (Math.random() - 0.5) * 4, z = 4 + Math.random() * 2;
    g.position.set(x, solIle(a.ile, x, z), z);
    D.iles[a.ile].groupe.add(g);
    V.robots.set(a.id, { g, a, cible: null });
  }
  for (const [id, r] of V.robots) if (!vusR.has(id)) { r.g.parent && r.g.parent.remove(r.g); V.robots.delete(id); }
}
function update(dt) {
  if (!E()) return;
  V.t += dt;
  if (V.t - V.dernier > 3) { V.dernier = V.t; verifierPontes(); verifierNettoyeurs(); }
  synchro();
  for (const [, o] of V.objets) o.g.userData.mouches.forEach((f, i) => { const a = V.t * (5 + i * 2) + i * 3; f.position.set(Math.cos(a) * 0.3, 0.4 + Math.sin(V.t * 7 + i) * 0.08, Math.sin(a) * 0.3); });
  // Les aspirateurs vont de crotte en crotte
  const e = etat();
  for (const [, r] of V.robots) {
    const a = r.a, p = r.g.position, def = ASPIRATEURS[a.type];
    r.g.userData.voyant.material.emissiveIntensity = 0.8 + Math.sin(V.t * 6) * 0.4;
    const l = e.crottes[a.ile].filter((c) => (a.type === "hybride" ? true : a.type === "eau" ? c.eau : !c.eau));
    if (!r.cible || !l.some((c) => c.id === r.cible.id)) {
      let best = null, dm = 1e9;
      for (const c of l) { const d = Math.hypot(c.x - p.x, c.z - p.z); if (d < dm) { dm = d; best = c; } }
      r.cible = best;
    }
    if (!r.cible) { r.g.rotation.y += dt * 0.5; continue; }
    const dx = r.cible.x - p.x, dz = r.cible.z - p.z, d = Math.hypot(dx, dz);
    r.g.rotation.y = Math.atan2(dx, dz);
    if (d > 0.3) {
      const pas = Math.min(d, def.vitesse * dt);
      p.x += (dx / d) * pas; p.z += (dz / d) * pas;
      p.y = dansLEau(a.ile, p.x, p.z) ? NIVEAU_EAU + 0.02 : solIle(a.ile, p.x, p.z);
    } else { ramasser(a.ile, r.cible.id, "robot"); r.cible = null; }
  }
}

// ---------- Dragons nettoyeurs : un par île, il va ramasser les crottes de son île ----------
function verifierNettoyeurs() {
  const D = moteurIles();
  if (!D) return;
  const e = etat();
  for (const elx of ["feu", "glace", "eau"]) {
    const uid = e.nettoyeurs[elx];
    const v = uid && D.dragons.get(uid);
    if (!v || v.ko || v.d.expedition) continue;
    const p = v.mobile.position;
    if (v.crotteCible) {
      const c = e.crottes[elx].find((x) => x.id === v.crotteCible);
      if (!c) { v.crotteCible = null; continue; }
      if (Math.hypot(c.x - p.x, c.z - p.z) < 0.9) { ramasser(elx, c.id, "dragon"); v.crotteCible = null; v.anim.jouer("creuser"); }
      else if (v.etat === "pause" || v.etat === "action") { v.cible = new T.Vector3(c.x, 0, c.z); v.etat = "marche"; v.vitesse = 1.1; }
      continue;
    }
    if (v.etat !== "pause") continue;
    const nage = v.habitat === "surface" || v.habitat === "fond";
    const c = e.crottes[elx].find((x) => x.eau === nage || (!nage && !x.eau));
    if (c) { v.crotteCible = c.id; v.cible = new T.Vector3(c.x, 0, c.z); v.etat = "marche"; v.vitesse = 1.1; }
  }
}

// ---------- Panneau « Propreté » de l'île ----------
styles("crottes", `
.cr-p { position: fixed; z-index: 21; left: var(--bord-g); right: var(--bord-d); bottom: calc(var(--bas) + 80px); max-width: 560px; margin: 0 auto; max-height: min(56vh, 520px); overflow: auto; padding: 14px; display: grid; gap: 10px; }
.cr-p header { display: flex; justify-content: space-between; align-items: flex-start; }
.cr-p h3 { font-size: 20px; }
.cr-bloc { display: grid; gap: 6px; padding: 10px; border-radius: 10px; border: 1px solid var(--trait); background: rgba(255,255,255,.03); font-size: 12px; }
.cr-bloc b { font-family: var(--titre); font-size: 14px; }
.cr-bloc .doux { line-height: 1.45; }
.cr-l { display: flex; gap: 6px; flex-wrap: wrap; align-items: center; }
.cr-etat { display: flex; gap: 8px; flex-wrap: wrap; }
.cr-etat span { padding: 3px 8px; border-radius: 999px; border: 1px solid var(--trait); }
.cr-etat .sale { border-color: rgba(255,120,90,.6); color: #ffb4a0; } .cr-etat .fertile { border-color: rgba(111,214,138,.6); color: #b8f0c8; }
`);
const hudLigne = (on) => { document.body.classList.toggle("hud-ligne", on); window.__jeu && window.__jeu.majHauteurHud && window.__jeu.majHauteurHud(); };
function fermer() { if (V.panneau) { V.panneau.remove(); V.panneau = null; hudLigne(false); } }
function assez(c) { const r = E().ressources; return Object.entries(c).every(([k, v]) => (r[k] || 0) >= v); }
export function ouvrirProprete(elx) {
  const D = moteurIles();
  elx = elx || (D && ["feu", "glace", "eau"].includes(D.focus) ? D.focus : "feu");
  fermerFiche(); fermer();
  const e = etat();
  const n = e.crottes[elx].length;
  const p = el("section", { class: "cr-p panneau" });
  const r = () => ouvrirProprete(elx);
  const restF = e.fertilite[elx] && e.fertilite[elx] > maintenant() ? Math.ceil((e.fertilite[elx] - maintenant()) / MIN) : 0;
  p.append(el("header", {}, el("div", {}, el("div", { class: "etiquette" }, NOM_ILE[elx]), el("h3", {}, "Propreté et engrais")),
    el("button", { class: "fermer-fiche", "aria-label": "Fermer", onclick: fermer, html: icone("fermer").innerHTML })));
  p.append(el("div", { class: "cr-etat" }, el("span", { class: n >= 6 ? "sale" : "" }, `💩 ${n} crotte${n > 1 ? "s" : ""}${n >= 6 ? " · île sale : les ressources repoussent moins vite" : ""}`),
    restF ? el("span", { class: "fertile" }, `🌱 fertile encore ${restF >= 60 ? `${Math.floor(restF / 60)} h ${restF % 60}` : `${restF} min`}`) : null));
  // Nettoyeur
  const dragonsIle = e.dragons.filter((d) => PAR_ID[d.id].element === elx);
  const net = e.nettoyeurs[elx];
  p.append(el("div", { class: "cr-bloc" }, el("b", {}, "Dragon nettoyeur"),
    el("div", { class: "doux" }, "Un dragon de l'île qui ramasse les crottes tout seul, une à une. Il peut toujours combattre."),
    el("div", { class: "cr-l" }, ...dragonsIle.map((d) => el("button", { class: "btn petit" + (net === d.uid ? " principal" : ""), onclick: () => { changer((s) => { s.nettoyeurs[elx] = net === d.uid ? null : d.uid; }); Son.clic(); r(); } }, `${net === d.uid ? "🧹 " : ""}${PAR_ID[d.id].nom}`)),
      dragonsIle.length ? null : el("span", { class: "doux" }, "Aucun dragon sur cette île."))));
  // Aspirateurs
  const ici = e.aspirateurs.filter((a) => a.ile === elx);
  const blocA = el("div", { class: "cr-bloc" }, el("b", {}, "Aspirateurs-robots"),
    el("div", { class: "doux" }, elx === "eau" ? "Sur l'île d'Eau, il faut un aspirateur terrestre pour la plage et un aquatique pour le lagon (ou un hybride, plus lent)." : "Un aspirateur ne travaille que sur une île."),
    el("div", { class: "cr-l" }, ici.length ? ici.map((a) => el("span", { class: "pil" }, ASPIRATEURS[a.type].nom)) : el("span", { class: "doux" }, "Aucun aspirateur ici.")));
  const types = elx === "eau" ? ["terre", "eau"] : ["terre"];
  for (const ty of types) {
    const d = ASPIRATEURS[ty];
    blocA.append(el("div", { class: "cr-l" },
      el("button", { class: "btn petit" + (assez(d.cout) ? " principal" : ""), disabled: !assez(d.cout), onclick: () => { changer((s) => { for (const [k, v] of Object.entries(d.cout)) s.ressources[k] -= v; s.aspirateurs.push({ id: "a" + Date.now().toString(36), type: ty, ile: elx }); }); Son.recolte("pierre"); toast(`${d.nom} fabriqué !`, "bon"); r(); } },
        `Fabriquer : ${d.nom.replace("Aspirateur ", "")} (${Object.entries(d.cout).map(([k, v]) => `${v} ${k}`).join(", ")})`),
      el("button", { class: "btn petit", disabled: (e.ressources.gemmes || 0) < d.gemmes, onclick: () => { changer((s) => { s.ressources.gemmes -= d.gemmes; s.aspirateurs.push({ id: "a" + Date.now().toString(36), type: ty, ile: elx }); }); Son.achat(); toast(`${d.nom} acheté !`, "bon"); r(); } }, icone("gemmes"), `${d.gemmes}`)));
  }
  if (ici.some((a) => a.type === "terre") && ici.some((a) => a.type === "eau")) blocA.append(el("button", { class: "btn petit principal", onclick: () => {
    changer((s) => { const t = s.aspirateurs.findIndex((a) => a.ile === elx && a.type === "terre"); s.aspirateurs.splice(t, 1); const w = s.aspirateurs.findIndex((a) => a.ile === elx && a.type === "eau"); s.aspirateurs.splice(w, 1); s.aspirateurs.push({ id: "a" + Date.now().toString(36), type: "hybride", ile: elx }); });
    Son.evolution(); toast("Fusion réussie : un aspirateur hybride !", "bon"); r();
  } }, "Fusionner en hybride (plus lent, fait tout)"));
  p.append(blocA);
  // Engrais
  const blocE = el("div", { class: "cr-bloc" }, el("b", {}, "Engrais"),
    el("div", { class: "doux" }, "Les crottes ramassées deviennent de l'engrais de leur élément. Il ne marche que sur une AUTRE île : 5 engrais la rendent fertile 6 h (ressources qui repoussent deux fois plus vite, fermes +50 %)."));
  for (const autre of ["feu", "glace", "eau"].filter((x) => x !== elx)) {
    const k = "engrais_" + autre, q = e.ressources[k] || 0;
    blocE.append(el("div", { class: "cr-l" }, el("span", {}, `Engrais ${ELEMENTS[autre].nom.toLowerCase()} : ${q}`),
      el("button", { class: "btn petit" + (q >= 5 ? " principal" : ""), disabled: q < 5, onclick: () => {
        changer((s) => { s.ressources[k] -= 5; const base = Math.max(maintenant(), s.fertilite[elx] || 0); s.fertilite[elx] = base + 6 * 60 * MIN; });
        Son.evolution(); toast(`${NOM_ILE[elx]} fertilisée pour 6 h !`, "bon"); r();
      } }, `Fertiliser avec 5`)));
  }
  p.append(blocE);
  document.getElementById("ecran").append(p);
  V.panneau = p;
  hudLigne(true);
}

// ---------- Branchement ----------
extensions.update.push(update);
extensions.action.crotte = (a) => { if (ramasser(a.ile, a.id, "main")) toast("Crotte ramassée : +1 engrais", "bon"); };
extensions.boutons.push(() => {
  const e = E();
  if (!e || !e.dragons.length || (e.tuto && ["reparer", "oeuf1", "mini1", "nid1"].includes(e.tuto.etape))) return null;
  const D = moteurIles();
  const elx = D && ["feu", "glace", "eau"].includes(D.focus) ? D.focus : null;
  const n = elx && e.crottes ? e.crottes[elx].length : 0;
  return el("button", { class: "btn petit", style: n >= 6 ? { borderColor: "rgba(255,120,90,.6)", color: "#ffb4a0" } : null, onclick: () => { Son.clic(); ouvrirProprete(elx); } }, `🧹 Propreté${elx ? ` (${n})` : ""}`);
});
