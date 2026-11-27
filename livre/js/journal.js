// Le journal d'aventure : trois quêtes du jour, choisies selon ce que tu as débloqué, avec leurs récompenses,
// et un coffre bonus quand les trois sont finies.
import { E, changer, maintenant } from "./etat.js";
import { el, styles, toast, modale, icone } from "./ui.js";
import { Son } from "./son.js";
import { ecouteurs } from "./tuto.js";
import { extensions, majBoutons } from "./iles.js";

styles("journal", `
.jr { display: grid; gap: 8px; }
.jr-q { display: grid; grid-template-columns: auto 1fr auto; gap: 4px 10px; align-items: center; padding: 10px; border-radius: 12px; border: 1px solid var(--trait); background: rgba(255,255,255,.03); }
.jr-q.ok { border-color: rgba(111,214,138,.5); background: rgba(111,214,138,.08); }
.jr-q.pris { opacity: .55; }
.jr-q .i { font-size: 22px; }
.jr-q b { font-size: 13px; }
.jr-q small { grid-column: 2 / 3; color: var(--doux); font-size: 11.5px; }
.jr-barre { grid-column: 2 / 3; height: 6px; border-radius: 3px; background: rgba(255,255,255,.08); overflow: hidden; }
.jr-barre i { display: block; height: 100%; background: linear-gradient(90deg, #6fd68a, #f2b544); }
.jr-bonus { padding: 10px; border-radius: 12px; border: 1px dashed rgba(242,181,68,.5); text-align: center; font-size: 13px; }
`);

const ouvertVillage = (e) => !!(e.recits && e.recits.village);
const classe = (e) => e.dragons.length >= 7 && e.dragons.some((d) => d.niveau >= 5);
// [id, icône, texte, objectif, événement, condition d'accès, récompense (texte, donner)]
const QUETES = [
  ["recolte", "🪓", "Récolte 5 fois sur tes îles", 5, (n) => n === "recolte", () => true, ["20 brindilles · 20 pierres", (r) => { r.brindilles += 20; r.pierres += 20; }]],
  ["nourri", "🍖", "Nourris tes dragons 3 fois", 3, (n) => n === "nourri", () => true, ["10 rations", (r) => { r.rations += 10; }]],
  ["victoires", "⚔️", "Gagne 2 combats", 2, (n, d) => n === "combat_fini" && d && d.victoire, (e) => e.dragons.length >= 2, ["15 gemmes", (r) => { r.gemmes = (r.gemmes || 0) + 15; }]],
  ["sauvage", "🌿", "Affronte 2 fois les dragons sauvages", 2, (n, d) => n === "combat_fini" && d && d.mode === "sauvage", (e) => e.dragons.length >= 2, ["15 rations · 5 obsidiennes", (r) => { r.rations += 15; r.obsidienne += 5; }]],
  ["eclosion", "🥚", "Fais éclore un œuf", 1, (n) => n === "eclosion", (e) => e.dragons.length < 40, ["4 braises", (r) => { r.braises = (r.braises || 0) + 4; }]],
  ["attaque", "🏹", "Attaque un village", 1, (n) => n === "attaque_village", ouvertVillage, ["20 gemmes", (r) => { r.gemmes = (r.gemmes || 0) + 20; }]],
  ["construit", "🏗️", "Construis ou améliore un bâtiment", 1, (n) => n === "construit" || n === "ameliore", ouvertVillage, ["30 pierres · 10 givrites", (r) => { r.pierres += 30; r.givrite += 10; }]],
  ["boss", "🌋", "Affronte le dragon-roi", 1, (n, d) => n === "combat_fini" && d && d.mode === "boss", classe, ["1 cœur de dragon", (r) => { r.coeurs += 1; }]],
  ["classe", "🏆", "Gagne un duel classé", 1, (n, d) => n === "combat_fini" && d && d.mode === "bot" && d.victoire, classe, ["20 gemmes", (r) => { r.gemmes = (r.gemmes || 0) + 20; }]],
  ["expedition", "🎈", "Envoie une expédition", 1, (n) => n === "expedition", (e) => e.dragons.length >= 3, ["2 braises · 10 coraux", (r) => { r.braises = (r.braises || 0) + 2; r.corail += 10; }]],
];
const BONUS = ["30 gemmes · 1 œuf", (r, e) => { r.gemmes = (r.gemmes || 0) + 30; e.oeufs.choix += 1; }];

function jour(t = maintenant()) { const d = new Date(t); return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`; }
// Les quêtes du jour : tirées au sort (toujours les mêmes pour une journée) parmi celles débloquées
export function journal() {
  const e = E();
  if (!e) return null;
  const j = jour();
  if (!e.journal || e.journal.jour !== j) {
    let h = 0; for (const c of j) h = (h * 31 + c.charCodeAt(0)) >>> 0;
    const dispo = QUETES.filter((q) => q[5](e));
    const choix = [];
    while (choix.length < Math.min(3, dispo.length)) { h = (h * 1103515245 + 12345) >>> 0; const q = dispo[h % dispo.length]; if (!choix.includes(q[0])) choix.push(q[0]); }
    e.journal = { jour: j, quetes: choix.map((id) => ({ id, n: 0, pris: false })), bonus: false };
  }
  return e.journal;
}
const def = (id) => QUETES.find((q) => q[0] === id);
export function nonPris() { const j = journal(); return j ? j.quetes.filter((q) => !q.pris && q.n >= def(q.id)[3]).length + (j.quetes.every((q) => q.pris) && !j.bonus ? 1 : 0) : 0; }

// Chaque événement du jeu fait avancer les quêtes
let derniereEclosion = 0;
ecouteurs.push((nom, d) => {
  const e = E();
  if (!e || !e.tuto || e.tuto.etape !== "fini") return;
  if (nom === "eclosion") { if (maintenant() - derniereEclosion < 3000) return; derniereEclosion = maintenant(); }
  const j = journal();
  let change = false;
  for (const q of j.quetes) { const dq = def(q.id); if (q.n < dq[3] && dq[4](nom, d)) { q.n++; change = true; if (q.n === dq[3]) toast(`Quête finie : ${dq[2]} !`, "bon"); } }
  if (change) { changer(() => {}); majBoutons && majBoutons(); }
});

export function ouvrirJournal() {
  const j = journal();
  const rendu = el("div", { class: "jr" });
  const remplir = () => {
    rendu.innerHTML = "";
    rendu.append(el("p", { class: "doux", style: { margin: 0, fontSize: "12px" } }, "Trois quêtes par jour. Elles changent à minuit."));
    for (const q of j.quetes) {
      const [, i, texte, but, , , [rec, donner]] = def(q.id);
      const fini = q.n >= but;
      rendu.append(el("div", { class: `jr-q ${fini ? "ok" : ""} ${q.pris ? "pris" : ""}` },
        el("span", { class: "i" }, i), el("b", {}, texte),
        q.pris ? el("span", { class: "doux" }, "✓") : fini ? el("button", { class: "btn principal petit", onclick: () => { changer((s) => { donner(s.ressources, s); q.pris = true; }); Son.achat(); toast(`Récompense : ${rec}`, "bon"); remplir(); majBoutons && majBoutons(); } }, "Prendre") : el("span", { class: "num doux" }, `${q.n}/${but}`),
        el("small", {}, `Récompense : ${rec}`),
        el("div", { class: "jr-barre" }, el("i", { style: { width: `${Math.min(100, (q.n / but) * 100)}%` } }))));
    }
    const tout = j.quetes.every((q) => q.pris);
    rendu.append(el("div", { class: "jr-bonus" }, `🎁 Coffre du jour (les 3 quêtes) : ${BONUS[0]} `,
      j.bonus ? el("b", {}, "· pris ✓") : el("button", { class: "btn petit" + (tout ? " principal" : ""), disabled: !tout, onclick: () => { changer((s) => { BONUS[1](s.ressources, s); s.journal.bonus = true; }); Son.evolution(); toast("Coffre du jour ouvert !", "bon"); remplir(); majBoutons && majBoutons(); } }, "Ouvrir")));
  };
  remplir();
  modale({ titre: "📜 Journal d'aventure", contenu: rendu, boutons: [{ texte: "Fermer" }] });
}

// Le bouton du journal, sur la carte des îles
extensions.boutons.push(() => {
  const e = E();
  if (!e || !e.tuto || e.tuto.etape !== "fini") return null;
  const n = nonPris();
  return el("button", { class: "btn petit", style: { borderColor: "rgba(242,181,68,.55)" }, onclick: () => { Son.clic(); ouvrirJournal(); } }, "📜 Journal", n ? el("span", { class: "pastille" }, n) : null);
});
export { icone };
