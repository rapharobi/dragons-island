// Pour le Livre ouvert seul (hors du jeu) : une partie vide, rien n'est sauvegardé.
const etat = { stub: true, dragons: [], livre: { vus: [], ulChoisi: null }, reglages: { chrono: 20 }, ressources: {} };
export const E = () => etat;
export const changer = (f) => { f && f(etat); };
export const possede = () => false;
export const livreComplet = () => false;
