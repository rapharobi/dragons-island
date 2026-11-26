// Vignettes 3D vivantes : chaque dragon de la liste tourne doucement sur lui-même
// et fait la même chose qu'au même moment sur son île (il vole, nage, dort, mange…).
// Un seul petit moteur 3D à part dessine toutes les vignettes, l'une après l'autre.
import { construireDragon } from "./modele.js";
import { Animateur } from "./anim.js";
import { stadeEffectif } from "./regles.js";

const T = window.THREE;
let R = null, scene = null, camera = null, support = null;
const portraits = new Map(); // canvas → { d, rig, anim, cle, phase }
let boucle = null, avant = 0;

function preparer() {
  if (R) return true;
  try {
    const c = document.createElement("canvas");
    R = new T.WebGLRenderer({ canvas: c, alpha: true, antialias: true, preserveDrawingBuffer: true });
  } catch (e) { R = null; return false; }
  R.setPixelRatio(1);
  R.setSize(160, 160, false);
  R.setClearColor(0x000000, 0);
  scene = new T.Scene();
  scene.add(new T.HemisphereLight(0xdfe8ff, 0x3a2a30, 0.9));
  const s = new T.DirectionalLight(0xfff0d8, 1.1); s.position.set(2, 4, 3); scene.add(s);
  const c2 = new T.DirectionalLight(0x8ab8ff, 0.4); c2.position.set(-3, 2, -3); scene.add(c2);
  camera = new T.PerspectiveCamera(30, 1, 0.05, 100);
  support = new T.Group(); scene.add(support);
  return true;
}

// sourceAnim(uid) donne l'animateur du dragon sur son île (pour copier ce qu'il fait)
export function attacher(canvas, d, sourceAnim) {
  if (!preparer()) return;
  canvas.width = 160; canvas.height = 160;
  portraits.set(canvas, { d, sourceAnim, cle: null, phase: Math.random() * 6 });
  if (!boucle) { avant = performance.now(); boucle = requestAnimationFrame(tourner); }
}
export function detacherTout() { portraits.clear(); }

function tourner(t) {
  boucle = null;
  // On oublie les vignettes qui ne sont plus à l'écran
  for (const c of portraits.keys()) if (!c.isConnected) portraits.delete(c);
  if (!portraits.size) return;
  const dt = Math.min(0.1, (t - avant) / 1000); avant = t;
  for (const [c, p] of portraits) {
    const st = stadeEffectif(p.d);
    const cle = `${p.d.id}|${st}|${p.d.ul}`;
    if (p.cle !== cle) {
      p.cle = cle;
      p.rig = construireDragon(p.d.id, st, { ul: p.d.ul });
      p.anim = new Animateur(p.rig);
      const h = p.rig.taille.y, l = Math.max(p.rig.taille.x, p.rig.taille.z);
      p.vue = { y: h * 0.42, dist: Math.max(h * 1.35, l * 1.0) + 0.15 };
    }
    // Copie ce que fait le dragon sur l'île
    const src = p.sourceAnim && p.sourceAnim(p.d.uid);
    if (src) {
      if (p.anim.boucle !== src.boucle) p.anim.jouer(src.boucle);
      if (src.action && src.action !== p.derniereAction) { p.anim.jouer(src.action); }
      p.derniereAction = src.action;
    }
    p.anim.update(dt);
    p.phase += dt;
    while (support.children.length) support.remove(support.children[0]);
    support.add(p.rig.racine);
    support.rotation.y = -0.6 + Math.sin(p.phase * 0.5) * 0.55;
    camera.position.set(0, p.vue.y + p.vue.dist * 0.32, p.vue.dist);
    camera.lookAt(0, p.vue.y, 0);
    R.render(scene, camera);
    const g = c.getContext("2d");
    g.clearRect(0, 0, c.width, c.height);
    g.drawImage(R.domElement, 0, 0, c.width, c.height);
  }
  boucle = requestAnimationFrame(tourner);
}
