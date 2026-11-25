// Livre des dragons, ouvert seul : wiki 3D (fiches, 20 niveaux, apparence, éléments, règles, équilibrage).
import { DRAGONS } from "./regles.js";
import { Moteur } from "./scene.js";
import { enregistrerElements } from "./modele.js";
import * as Livre from "./livre.js";
import { initAudio, reglerSon } from "./son.js";

enregistrerElements(DRAGONS);
reglerSon(true, false);
const ctx = { ecran: "livre", aller() {}, majHud() {}, cacherInterface() {}, moteur: new Moteur(document.getElementById("scene3d")) };
window.addEventListener("pointerdown", () => initAudio(), { once: true });
if (!ctx.moteur.r) document.getElementById("ecran").textContent = "Ton navigateur n'arrive pas à afficher la 3D (WebGL).";
else Livre.ouvrir(ctx, {});
