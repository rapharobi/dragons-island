// Codes de gemmes à usage unique.
// Chaque code est signé par le générateur privé du créateur du jeu (clé secrète qui ne quitte jamais ce générateur).
// Le jeu ne connaît que la clé publique : il peut vérifier un code, mais personne ne peut en fabriquer en lisant le jeu.
// Un code utilisé est retenu dans la partie. Avec les comptes (Firebase), il sera aussi bloqué pour tous les joueurs.
import { E, changer, noter } from "./etat.js";

const CLE_PUBLIQUE = { kty: "EC", crv: "P-256", x: "ZZwl_okj_J95g7tlWaex_KHRuiztF74TPNw5r3PRewg", y: "4g_4DIwLwQ86K1xxjYerJ0VuTr0njCpGVcl8Ix1iyq4", ext: true };

function octets(b64) {
  const s = b64.replace(/-/g, "+").replace(/_/g, "/");
  const t = atob(s + "=".repeat((4 - (s.length % 4)) % 4));
  return Uint8Array.from(t, (c) => c.charCodeAt(0));
}
let cle = null;
async function clePublique() {
  if (!cle) cle = await crypto.subtle.importKey("jwk", CLE_PUBLIQUE, { name: "ECDSA", namedCurve: "P-256" }, false, ["verify"]);
  return cle;
}
// Format : DW-<gemmes>-<8 caractères>-<signature>
export async function verifierCode(texte) {
  const code = String(texte || "").replace(/\s+/g, "");
  const m = /^DW-(\d{1,6})-([A-Z0-9]{8})-([A-Za-z0-9_-]{80,90})$/.exec(code);
  if (!m) return { ok: false, raison: "Ce code n'a pas le bon format. Il commence par DW-." };
  if (!window.crypto || !crypto.subtle) return { ok: false, raison: "Ton navigateur ne peut pas vérifier les codes." };
  const gemmes = +m[1], id = m[2];
  let bon = false;
  try { bon = await crypto.subtle.verify({ name: "ECDSA", hash: "SHA-256" }, await clePublique(), octets(m[3]), new TextEncoder().encode(`DW|${gemmes}|${id}`)); } catch (e) { bon = false; }
  if (!bon) return { ok: false, raison: "Ce code n'est pas valide." };
  if ((E().codes || []).includes(id)) return { ok: false, raison: "Ce code a déjà été utilisé." };
  return { ok: true, gemmes, id };
}
export async function utiliserCode(texte) {
  const r = await verifierCode(texte);
  if (!r.ok) return r;
  changer((s) => {
    s.codes = s.codes || [];
    s.codes.push(r.id);
    s.ressources.gemmes = (s.ressources.gemmes || 0) + r.gemmes;
    noter(`Code utilisé : +${r.gemmes} gemmes.`);
  });
  return r;
}
