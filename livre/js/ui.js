// Petits outils d'interface : création d'éléments, icônes, messages, fenêtres.
import { Son } from "./son.js";

export function el(tag, attrs = {}, ...enfants) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v === null || v === undefined || v === false) continue;
    if (k === "class") e.className = v;
    else if (k === "style" && typeof v === "object") Object.assign(e.style, v);
    else if (k.startsWith("on")) e.addEventListener(k.slice(2), v);
    else if (k === "html") e.innerHTML = v; // réservé au texte écrit dans le code (icônes)
    else e.setAttribute(k, v === true ? "" : v);
  }
  for (const c of enfants.flat()) {
    if (c === null || c === undefined || c === false) continue;
    e.append(c.nodeType ? c : document.createTextNode(String(c)));
  }
  return e;
}
export const $ = (s, r = document) => r.querySelector(s);

const deja = new Set();
export function styles(cle, css) {
  if (deja.has(cle)) return;
  deja.add(cle);
  document.getElementById("styles-ecrans").textContent += "\n" + css;
}

const P = (d, extra = "") => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" ${extra}>${d}</svg>`;
export const ICONES = {
  energie: P('<path d="M13 2 4 14h7l-1 8 9-12h-7z" fill="#f2b544" stroke="#f2b544"/>'),
  rations: P('<path d="M7 14c-2-3 0-8 5-8s7 5 5 8" stroke="#e8a070"/><path d="M5 14h14l-2 6H7z" fill="#c8703a" stroke="#c8703a"/>'),
  rations_feu: P('<path d="M9 5c3-1 6 1 6 5 0 5-3 9-6 10-1-3 0-6 0-9 0-2-1-4 0-6z" fill="#e8401a" stroke="#ff8a4a"/><path d="M9 5c0-2 1-3 3-3" stroke="#4a8a3a"/>'),
  rations_glace: P('<circle cx="8" cy="14" r="3.2" fill="#7fd6ff" stroke="#bfeaff"/><circle cx="15" cy="15" r="3.2" fill="#5ab0ff" stroke="#bfeaff"/><circle cx="12" cy="9" r="3" fill="#a8e4ff" stroke="#bfeaff"/>'),
  rations_eau: P('<path d="M3 12c3-4 8-5 12-2l5-3v10l-5-3c-4 3-9 2-12-2z" fill="#2fd0c0" stroke="#8af0e0"/><circle cx="8" cy="11.5" r="1" fill="#0a2a30" stroke="none"/>'),
  brindilles: P('<path d="M4 20 18 6M9 15l-3-1M13 11l4 1M15 9l-1-4" stroke="#c89a5a"/>'),
  pierres: P('<path d="M4 17 7 9l6-3 6 5-1 7H6z" fill="#8a8f98" stroke="#b8bcc4"/>'),
  obsidienne: P('<path d="m12 3 6 7-6 11-6-11z" fill="#2a1a20" stroke="#ff6a3d"/>'),
  givrite: P('<path d="m12 2 5 9-5 11-5-11z" fill="#bfeaff" stroke="#7fd6ff"/>'),
  engrais_feu: P('<path d="M6 18c0-2 2-3 3-3 0-2 1-4 3-4 0-2 1-3 2-3 1 2 1 3 0 3 2 0 3 2 3 4 1 0 3 1 3 3z" fill="#7a4a24" stroke="#ff6a3d"/>'),
  engrais_glace: P('<path d="M6 18c0-2 2-3 3-3 0-2 1-4 3-4 0-2 1-3 2-3 1 2 1 3 0 3 2 0 3 2 3 4 1 0 3 1 3 3z" fill="#7a4a24" stroke="#7fd6ff"/>'),
  engrais_eau: P('<path d="M6 18c0-2 2-3 3-3 0-2 1-4 3-4 0-2 1-3 2-3 1 2 1 3 0 3 2 0 3 2 3 4 1 0 3 1 3 3z" fill="#7a4a24" stroke="#2fd0c0"/>'),
  corail: P('<path d="M12 21v-8M12 13 7 8M7 8V4M12 13l5-4M17 9V5M9 10 6 11" stroke="#ff7aa8" stroke-width="2.2"/>'),
  braises: P('<path d="M12 3c1 3 4 4 4 8a4 4 0 0 1-8 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3-1-5 0-7z" fill="#ff8a3c" stroke="#ffd27a"/><path d="M6 20h12" stroke="#c8703a"/>'),
  gemmes: P('<path d="M7 4h10l4 6-9 11L3 10z" fill="#b45cff" stroke="#f0c8ff"/><path d="M3 10h18M10 4l2 6 2-6M12 21l-3-11M12 21l3-11" stroke="#f0c8ff" stroke-width="1"/>'),
  coeurs: P('<path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.5-7 10-7 10z" fill="#e8405a" stroke="#ff8a9a"/>'),
  pas: P('<path d="M8 3c2 0 3 2 3 5s-1 5-3 5-3-2-3-5 1-5 3-5zM16 10c2 0 3 2 3 5s-1 5-3 5-3-2-3-5 1-5 3-5z" fill="#a7a196" stroke="none"/>'),
  oeuf: P('<path d="M12 3c4 0 7 6 7 11a7 7 0 0 1-14 0c0-5 3-11 7-11z" fill="#f2e6cc" stroke="#f2b544"/>'),
  iles: P('<path d="M3 14c3-2 6-2 9 0s6 2 9 0"/><path d="M6 11 9 6l3 5M14 11l2-3 2 3"/><path d="M8 17h8"/>'),
  couvoir: P('<path d="M12 4c3 0 5 4 5 8a5 5 0 0 1-10 0c0-4 2-8 5-8z"/><path d="M4 20h16M6 20c0-2 2-3 6-3s6 1 6 3"/>'),
  combat: P('<path d="m4 20 7-7M9 13l2 2M14 4h6v6L11 19l-6-6z"/>'),
  livre: P('<path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z"/><path d="M4 19V5M9 8h6"/>'),
  boutique: P('<path d="M5 8h14l-1 12H6z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>'),
  labo: P('<path d="M9 3h6M10 3v6L5 19a1 1 0 0 0 1 2h12a1 1 0 0 0 1-2l-5-10V3"/><path d="M8 15h8"/>'),
  reglages: P('<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M5 19l2-2M17 7l2-2"/>'),
  fermer: P('<path d="M6 6l12 12M18 6 6 18"/>'),
  retour: P('<path d="M15 5 8 12l7 7"/>'),
  son: P('<path d="M4 9h4l5-4v14l-5-4H4z"/><path d="M17 9a4 4 0 0 1 0 6"/>'),
  epee: P('<path d="M14 4h6v6L9 21l-6-6zM5 15l4 4"/>', 'stroke="#ff8a6a"'),
  bouclier: P('<path d="M12 3 5 6v6c0 4 3 7 7 9 4-2 7-5 7-9V6z"/>', 'stroke="#8ac8ff"'),
};

export function icone(nom) { return el("span", { class: "ico", html: ICONES[nom] || "", style: { display: "inline-flex" }, "aria-hidden": "true" }); }

export function toast(texte, type = "") {
  // « +12 rations » : déjà montré par le chiffre qui monte à côté de la ressource
  if (/^[+−-]\s?\d/.test(String(texte))) return;
  const boite = document.getElementById("toasts");
  // En combat (barres cachées) les messages restent en haut, sinon ils se posent en bas au-dessus du menu
  const nav = document.getElementById("nav");
  boite.classList.toggle("haut", !!(nav && nav.hidden));
  // Même message qu'un message encore affiché : on le compte au lieu d'en ajouter un
  const cle = String(texte).replace(/\s*·\s*niveau \d+ !$/, "");
  const deja = [...boite.children].find((x) => x._cle === cle && !x._fin);
  const t = deja || el("div", { class: "toast " + type, onclick: () => t.remove() });
  t._cle = cle; t._n = (t._n || 0) + 1;
  t.innerHTML = "";
  t.append(el("i", { "aria-hidden": "true" }, type === "bon" ? "✓" : type === "mal" ? "!" : "✦"), el("span", {}, t._n > 1 ? `${texte}  ×${t._n}` : texte));
  if (!deja) boite.append(t);
  else boite.append(t); // remonte en dernier
  t.style.transition = ""; t.style.opacity = "1";
  clearTimeout(t._a); clearTimeout(t._b);
  const duree = Math.min(4200, 1800 + String(texte).length * 30);
  t._a = setTimeout(() => { t._fin = true; t.style.transition = "opacity .35s, transform .35s"; t.style.opacity = "0"; t.style.transform = "translateY(6px)"; }, duree);
  t._b = setTimeout(() => t.remove(), duree + 400);
  // Jamais plus de 2 messages à l'écran
  while (boite.children.length > 2) boite.firstElementChild.remove();
}

// Fenêtre par-dessus le jeu. boutons : [{ texte, classe, action }]
export function modale({ titre, contenu, boutons = [{ texte: "Fermer" }], large = false, fermable = true }) {
  const m = document.getElementById("modale");
  m.innerHTML = "";
  const boite = el("div", { class: "boite", role: "dialog", "aria-modal": "true", style: large ? { width: "min(760px, 100%)" } : null });
  if (titre) boite.append(el("h2", {}, titre));
  if (contenu) boite.append(contenu.nodeType ? contenu : el("p", {}, contenu));
  const actions = el("div", { class: "actions" });
  for (const b of boutons) {
    actions.append(el("button", {
      class: "btn " + (b.classe || ""), disabled: b.desactive,
      onclick: () => { Son.clic(); if (b.action && b.action() === false) return; fermerModale(); },
    }, b.texte));
  }
  if (boutons.length) boite.append(actions);
  m.append(boite);
  m.hidden = false;
  m.onclick = (e) => { if (fermable && e.target === m) fermerModale(); };
  return boite;
}
export function fermerModale() { const m = document.getElementById("modale"); m.hidden = true; m.innerHTML = ""; }

export function barre(val, max, classe = "") {
  const p = Math.max(0, Math.min(1, max ? val / max : 0));
  const c = classe.includes("pv") ? (p < 0.25 ? " bas" : p < 0.55 ? " moyen" : "") : "";
  return el("div", { class: "barre " + classe + c }, el("i", { style: { width: (p * 100).toFixed(1) + "%" } }));
}

export function puceRessource(nom, valeur, titre, manque = false) {
  return el("span", { class: "puce" + (manque ? " manque" : ""), title: titre || nom }, icone(nom), el("span", {}, valeur));
}

export function recette(rec, ressources, energie) {
  const r = el("div", { class: "recette" });
  for (const [k, v] of Object.entries(rec)) {
    const dispo = k === "energie" ? energie : ressources[k] || 0;
    r.append(puceRessource(k, `${Math.floor(dispo)}/${v}`, k, dispo < v));
  }
  return r;
}

export function couleurElement(el) { return { feu: "#ff6a3d", glace: "#7fd6ff", eau: "#2fd0c0" }[el] || "#f2b544"; }
