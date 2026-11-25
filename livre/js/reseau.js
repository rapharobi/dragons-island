// Réseau : défis en ligne entre amis, chacun sur son téléphone, avec un code à 4 caractères.
// Sur claude.ai : la capacité « room » (un salon nommé par code, chaque joueur publie son état complet).
// Sur le site (GitHub Pages) : connexion directe entre les deux téléphones (PeerJS, WebRTC).
// En test local sans Internet : les onglets du même navigateur se parlent par BroadcastChannel.
export const ADRESSE_JEU = "https://claude.ai/artifact/4bf8hnnX43dnnPSYPdm5bp";
// La page du site pose window.DRAGONS_SITE = true : les liens pointent alors vers le site lui-même.
export const SUR_SITE = !!window.DRAGONS_SITE;
export function lienInvitation(code) {
  const base = mode === "salon" ? ADRESSE_JEU : location.href.split("#")[0].split("?")[0];
  return `${base}#duel-${code}`;
}
export const VERSION_RESEAU = 1;

let base = null, mode = null, attente = null;
const monId = Math.random().toString(36).slice(2, 10);
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

export function identifiant() { return monId; }
export function modeReseau() { return mode; }

// Charge PeerJS (connexion directe) quand on n'est pas sur claude.ai
function chargerPeer() {
  return new Promise((ok) => {
    if (window.Peer) { ok(true); return; }
    const s = document.createElement("script");
    s.src = "https://unpkg.com/peerjs@1.5.4/dist/peerjs.min.js";
    s.onload = () => ok(!!window.Peer);
    s.onerror = () => ok(false);
    document.head.appendChild(s);
    setTimeout(() => ok(!!window.Peer), 12000);
  });
}

// Prépare la connexion une seule fois. Renvoie "salon", "p2p", "local" ou "aucun".
export function preparer() {
  if (attente) return attente;
  attente = (async () => {
    try {
      for (let i = 0; i < (SUR_SITE ? 0 : 30) && !(window.claude && window.claude.use); i++) await dormir(100);
      if (window.claude && window.claude.use) {
        const r = await Promise.race([window.claude.use("room"), dormir(11000).then(() => null)]);
        if (r) { base = r; mode = "salon"; return mode; }
      }
    } catch (e) { /* pas de salon */ }
    if (window.RTCPeerConnection && await chargerPeer()) { mode = "p2p"; return mode; }
    const local = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
    mode = local && "BroadcastChannel" in window ? "local" : "aucun";
    return mode;
  })();
  return attente;
}

export function nouveauCode() {
  const A = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let c = "";
  for (let i = 0; i < 4; i++) c += A[Math.floor(Math.random() * A.length)];
  return c;
}
export const codeValide = (c) => /^[A-Z0-9]{4}$/.test(c || "");

// Ouvre le salon d'un code. surChange(etatDeLAutre) est appelé à chaque nouvelle de l'autre joueur
// (null s'il n'est pas là ou vient de partir). On garde le premier joueur rencontré comme partenaire.
export async function ouvrirSalon(code, surChange, hote = false) {
  await preparer();
  const nom = "dragons-" + code.toLowerCase();
  let partenaire = null;
  const choisir = (liste) => {
    const ok = liste.filter((d) => d && typeof d === "object" && d.v === VERSION_RESEAU && typeof d.id === "string" && d.id !== monId);
    if (partenaire) return ok.find((d) => d.id === partenaire) || null;
    const d = ok[0] || null;
    if (d) partenaire = d.id;
    return d;
  };
  if (mode === "salon") {
    let rm = null;
    for (let i = 0; i < 3 && !rm; i++) {
      try { rm = await base.join(nom); } catch (e) { if (e && e.code === "not_permitted") break; await dormir(900); }
    }
    if (rm) {
      const lire = () => choisir(rm.peers().filter((p) => !p.sameTab && p.presence).map((p) => p.presence.dj));
      const stop = rm.onPeers(() => surChange(lire()));
      return { envoyer: (o) => rm.presence({ dj: o }).catch(() => {}), lire, fermer: () => { try { stop(); } catch (e) { /* déjà fermé */ } rm.leave().catch(() => {}); } };
    }
    // Repli : le salon commun de la page, filtré par code
    const lire = () => choisir(base.peers().filter((p) => !p.sameTab && p.presence && p.presence.g === code).map((p) => p.presence.dj));
    const stop = base.onPeers(() => surChange(lire()));
    return { envoyer: (o) => base.presence({ g: code, dj: o }).catch(() => {}), lire, fermer: () => { try { stop(); } catch (e) { /* déjà fermé */ } base.presence({ g: null, dj: null }).catch(() => {}); } };
  }
  if (mode === "p2p") return salonDirect(code, hote, choisir, surChange);
  if (mode === "local") {
    const bc = new BroadcastChannel(nom);
    const autres = new Map();
    let moi = null;
    const lire = () => choisir([...autres.values()].map((x) => x.d));
    bc.onmessage = (ev) => {
      const m = ev.data;
      if (!m || m.de === monId) return;
      if (m.qui) { if (moi) bc.postMessage({ de: monId, d: moi }); return; }
      if (m.d) autres.set(m.de, { d: m.d, t: Date.now() }); else autres.delete(m.de);
      surChange(lire());
    };
    bc.postMessage({ de: monId, qui: true });
    // Chacun redit son état toutes les 3 s ; un onglet muet depuis 10 s est considéré comme parti
    const vivant = setInterval(() => {
      if (moi) bc.postMessage({ de: monId, d: moi });
      let parti = false;
      for (const [k, x] of autres) if (Date.now() - x.t > 10000) { autres.delete(k); parti = true; }
      if (parti) surChange(lire());
    }, 3000);
    const partir = () => { try { bc.postMessage({ de: monId, d: null }); } catch (e) { /* fermé */ } };
    window.addEventListener("pagehide", partir);
    return {
      envoyer: (o) => { moi = o; bc.postMessage({ de: monId, d: o }); },
      lire,
      fermer: () => { clearInterval(vivant); partir(); window.removeEventListener("pagehide", partir); bc.close(); },
    };
  }
  return null;
}

// Petit générateur pseudo-aléatoire reproductible : les deux téléphones tirent les mêmes dégâts.
export function aleaGraine(...nombres) {
  let a = 0x9e3779b9;
  for (const n of nombres) a = Math.imul(a ^ (n >>> 0), 0x85ebca6b) + 0x27d4eb2f | 0;
  return () => {
    a = a + 0x6d2b79f5 | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = t + Math.imul(t ^ (t >>> 7), 61 | t) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Connexion directe (hors claude.ai) : celui qui crée la partie prend l'adresse « dragons-island-<code> »,
// l'autre s'y connecte. Chacun renvoie son état complet à chaque changement et toutes les 3 s.
function salonDirect(code, hote, choisir, surChange) {
  return new Promise((fini) => {
    const idHote = "dragons-island-" + code.toLowerCase();
    let peer = null, conn = null, autre = null, vu = 0, moi = null, ferme = false, termine = false;
    const repondre = (v) => { if (!termine) { termine = true; fini(v); } };
    const lire = () => (autre && Date.now() - vu < 10000 ? choisir([autre]) : null);
    const envoyer = (o) => { moi = o; if (conn && conn.open) try { conn.send(o); } catch (e) { /* coupé */ } };
    const brancher = (c) => {
      conn = c;
      c.on("open", () => { if (moi) envoyer(moi); });
      c.on("data", (d) => { if (d && typeof d === "object") { autre = d; vu = Date.now(); surChange(lire()); } });
      c.on("close", () => { if (conn === c) { conn = null; autre = null; surChange(null); } });
      c.on("error", () => {});
    };
    const essayer = () => { if (ferme || hote || (conn && conn.open)) return; try { brancher(peer.connect(idHote, { serialization: "json", reliable: true })); } catch (e) { /* on réessaie */ } };
    const api = {
      envoyer, lire,
      fermer: () => { ferme = true; clearInterval(vivant); try { peer.destroy(); } catch (e) { /* déjà fermé */ } },
    };
    const vivant = setInterval(() => {
      if (moi && conn && conn.open) envoyer(moi);
      if (autre && Date.now() - vu > 10000) { autre = null; surChange(null); }
      if (!hote && !(conn && conn.open)) essayer();
    }, 3000);
    try { peer = hote ? new window.Peer(idHote) : new window.Peer(); } catch (e) { clearInterval(vivant); repondre(null); return; }
    peer.on("open", () => { essayer(); repondre(api); });
    peer.on("connection", (c) => { if (!hote) { c.close(); return; } if (conn && conn.open) { c.on("open", () => c.close()); return; } brancher(c); });
    peer.on("disconnected", () => { if (!ferme) try { peer.reconnect(); } catch (e) { /* plus tard */ } });
    peer.on("error", (e) => {
      const t = e && e.type;
      if (t === "unavailable-id") { clearInterval(vivant); try { peer.destroy(); } catch (x) { /* rien */ } repondre(null); return; }
      if (t === "peer-unavailable") return; // l'hôte n'est pas encore là : on réessaie toutes les 3 s
      if (!termine) { clearInterval(vivant); repondre(null); }
    });
    setTimeout(() => { if (!termine) { clearInterval(vivant); try { peer.destroy(); } catch (x) { /* rien */ } repondre(null); } }, 15000);
  });
}
