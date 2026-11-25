// Construction des dragons en 3D low poly, à partir de leur génome (genomes.js).
// Tout est fait de formes simples assemblées en squelette (groupes) : le fichier anim.js les fait bouger.
import { rng, mat, bloc, peindre, veines, mesh, cone, corne, plaque, couleur } from "./outils3d.js";
import { GENOMES, PALETTES_UL, ARMURES_STYLES } from "./genomes.js";

const T = window.THREE;

const ECHELLE_STADE = [0.5, 0.68, 0.85, 1.0, 1.15];
const TETE_STADE = [1.55, 1.3, 1.12, 1.0, 1.0];
const COU_STADE = [0.55, 0.75, 0.92, 1.0, 1.08];
const QUEUE_STADE = [0.6, 0.8, 0.95, 1.0, 1.1];
const CORNE_STADE = [0.3, 0.6, 0.85, 1.0, 1.25];
const CRETE_STADE = [0.35, 0.6, 0.88, 1.0, 1.2];
const AILE_STADE = [0.5, 0.7, 0.88, 1.0, 1.1];
const PATTE_STADE = [0.72, 0.85, 0.95, 1.0, 1.0];

function clone(o) { return JSON.parse(JSON.stringify(o)); }
function fusion(a, b) {
  if (!b) return a;
  for (const k of Object.keys(b)) {
    const v = b[k];
    if (v && typeof v === "object" && !Array.isArray(v) && a[k] && typeof a[k] === "object" && !Array.isArray(a[k])) fusion(a[k], v);
    else a[k] = clone(v === undefined ? null : v);
  }
  return a;
}

export function genomeDe(id, stade) {
  const g = GENOMES[id];
  const r = clone(g.base);
  fusion(r, g.st && g.st[stade]);
  r.extras = r.extras || [];
  return r;
}

function varier(c, r, force = 0.06) {
  const k = 1 + (r() - 0.5) * force * 2;
  return new T.Color(Math.min(1, c.r * k), Math.min(1, c.g * k), Math.min(1, c.b * k));
}

// Matériau du corps : couleurs par face (dos / ventre), un peu de variation pour l'effet écailles.
function geoCorps(geo, coul, graine, seuil = -0.15) {
  const r = rng(graine);
  const dos = couleur(coul.corps), ventre = couleur(coul.ventre);
  return peindre(geo, (c, n) => varier(n.y < seuil ? ventre : dos, r));
}

// ---------- Pièces de crête ----------
function pieceCrete(style, t, m, i, r) {
  const g = new T.Group();
  switch (style) {
    case "pointes": { g.add(mesh(cone(t * 0.35, t, 4), m.accent)); g.children[0].rotation.x = -0.35; break; }
    case "plaques": {
      const p = mesh(bloc(0.04 * t / 0.2, t * 0.55, t * 0.45, 0, 0), m.accent); p.position.y = t * 0.35; p.rotation.x = -0.25; g.add(p); break;
    }
    case "cristaux": {
      const c = new T.OctahedronGeometry(t * 0.35, 0); c.scale(0.6, 1.8, 0.6);
      const p = mesh(c, m.cristal); p.position.y = t * 0.45; p.rotation.z = (r() - 0.5) * 0.6; g.add(p);
      if (r() > 0.5) { const p2 = mesh(c, m.cristal); p2.scale.setScalar(0.6); p2.position.set(t * 0.18, t * 0.25, 0); p2.rotation.z = -0.7; g.add(p2); }
      break;
    }
    case "nageoire": {
      const f = mesh(plaque([[0, 0], [t * 0.7, t * 0.05], [t * 0.25, t * 1.0], [-t * 0.1, t * 0.5]]), m.membrane);
      f.rotation.y = Math.PI / 2; g.add(f); break;
    }
    case "flammes": {
      const f = mesh(cone(t * 0.3, t * 1.1, 4), m.flamme); f.rotation.x = -0.4; f.userData.flamme = 1; g.add(f);
      const f2 = mesh(cone(t * 0.18, t * 0.7, 4), m.flammeClaire); f2.rotation.x = -0.4; f2.position.z = 0.01; g.add(f2);
      break;
    }
    case "stalactites": {
      const s = mesh(cone(t * 0.16, t * (0.7 + r() * 0.6), 5), m.cristal); s.rotation.set(-0.3 + r() * 0.2, 0, (r() - 0.5) * 0.9); g.add(s); break;
    }
    case "coraux": {
      const col = r() > 0.5 ? m.accent : m.lueur;
      const tronc = mesh(new T.CylinderGeometry(t * 0.05, t * 0.08, t * 0.7, 5), col); tronc.position.y = t * 0.35; g.add(tronc);
      for (let k = 0; k < 3; k++) {
        const b = mesh(new T.CylinderGeometry(t * 0.03, t * 0.05, t * 0.45, 4), col);
        b.position.set((k - 1) * t * 0.14, t * 0.6, 0); b.rotation.z = (k - 1) * 0.7; g.add(b);
        const bout = mesh(new T.IcosahedronGeometry(t * 0.06, 0), col); bout.position.set((k - 1) * t * 0.28, t * 0.8, 0); g.add(bout);
      }
      break;
    }
    case "seracs": {
      const b = new T.BoxGeometry(t * 0.45, t * 0.9, t * 0.45); b.translate(0, t * 0.4, 0);
      const s = mesh(b, m.cristal); s.rotation.set(r() * 0.3, r(), (r() - 0.5) * 0.5); g.add(s); break;
    }
    case "rochers": {
      const s = mesh(bloc(t * 0.4, t * 0.32, t * 0.4, 0, 0.3, i), m.accent); s.position.y = t * 0.12; g.add(s); break;
    }
    case "plumes": {
      const p = mesh(bloc(t * 0.18, t * 0.5, t * 0.12, 0, 0), m.ventre); p.position.y = t * 0.3; p.rotation.x = -0.6; g.add(p); break;
    }
    default: break;
  }
  return g;
}

// ---------- Tête ----------
function construireTete(gn, ech, m, coul, r, rig) {
  const st = gn.tete.style;
  const hs = gn.tete.taille * ech;
  const mus = gn.tete.museau;
  const tete = new T.Group();
  let crane = [0.5, 0.42, 0.52], museau = [0.3, 0.24, 0.45 * mus], mach = [0.27, 0.1, 0.42 * mus];
  if (st === "massif") { crane = [0.6, 0.48, 0.55]; museau = [0.42, 0.3, 0.42 * mus]; mach = [0.38, 0.14, 0.4 * mus]; }
  if (st === "fin") { crane = [0.38, 0.34, 0.48]; museau = [0.2, 0.17, 0.5 * mus]; mach = [0.17, 0.07, 0.48 * mus]; }
  if (st === "rond") { crane = [0.56, 0.52, 0.54]; museau = [0.3, 0.22, 0.3 * mus]; mach = [0.25, 0.09, 0.28 * mus]; }
  if (st === "renard") { crane = [0.46, 0.4, 0.48]; museau = [0.2, 0.17, 0.52 * mus]; mach = [0.16, 0.07, 0.48 * mus]; }
  const gCrane = geoCorps(bloc(crane[0] * hs, crane[1] * hs, crane[2] * hs, 1, 0.08, 11), coul, r() * 1e6, -0.4);
  tete.add(mesh(gCrane, m.corps));
  const gMus = geoCorps(bloc(museau[0] * hs, museau[1] * hs, museau[2] * hs, 1, 0.06, 12), coul, r() * 1e6, -0.5);
  const mus3 = mesh(gMus, m.corps);
  mus3.position.set(0, -crane[1] * hs * 0.12, crane[2] * hs * 0.55 + museau[2] * hs * 0.55);
  tete.add(mus3);
  // Narines
  const bout = mus3.position.z + museau[2] * hs * 0.85;
  if (gn.tete.nez) {
    const nez = mesh(new T.IcosahedronGeometry(hs * 0.07, 0), mat(gn.tete.nez, { r: 0.4 }));
    nez.position.set(0, mus3.position.y + museau[1] * hs * 0.6, bout); tete.add(nez);
  } else {
    for (const s of [-1, 1]) {
      const n = mesh(new T.IcosahedronGeometry(hs * 0.035, 0), m.sombre);
      n.position.set(s * museau[0] * hs * 0.45, mus3.position.y + museau[1] * hs * 0.55, bout - museau[2] * hs * 0.1); tete.add(n);
    }
  }
  // Mâchoire articulée
  const machoire = new T.Group();
  machoire.position.set(0, -crane[1] * hs * 0.45, crane[2] * hs * 0.2);
  const gMach = geoCorps(bloc(mach[0] * hs, mach[1] * hs, mach[2] * hs, 1, 0.05, 13), coul, r() * 1e6, 0.2);
  const mach3 = mesh(gMach, m.corps);
  mach3.position.set(0, -mach[1] * hs * 0.2, mach[2] * hs * 0.9);
  machoire.add(mach3);
  // Intérieur de la gueule
  const gorge = mesh(bloc(mach[0] * hs * 0.8, mach[1] * hs * 0.4, mach[2] * hs * 0.8, 0, 0), gn.extras.includes("siphon") || gn.extras.includes("gorge_lumineuse") ? m.lueur : m.gorge);
  gorge.position.set(0, mach[1] * hs * 0.4, mach[2] * hs * 0.9); machoire.add(gorge);
  if (gn.tete.dents) {
    for (let k = 0; k < 6; k++) {
      const s = k % 2 ? 1 : -1, z = mach[2] * hs * (0.4 + Math.floor(k / 2) * 0.45);
      const d = mesh(cone(hs * 0.028, hs * 0.1, 3), m.dent);
      d.position.set(s * mach[0] * hs * 0.7, mach[1] * hs * 0.5, z); machoire.add(d);
    }
  }
  if (gn.extras.includes("double_machoire")) {
    const m2 = mesh(bloc(mach[0] * hs * 0.6, mach[1] * hs * 0.6, mach[2] * hs * 0.6, 0, 0), m.lueur);
    m2.position.set(0, mach[1] * hs * 1.2, mach[2] * hs * 1.1); machoire.add(m2); rig.secondeMachoire = m2;
  }
  tete.add(machoire);
  // Yeux
  const yeux = [];
  const ry = gn.tete.yeux * ech * (st === "rond" ? 1.1 : 1);
  for (const s of [-1, 1]) {
    const oeil = mesh(new T.IcosahedronGeometry(ry, 1), m.yeux);
    oeil.scale.set(0.75, 1, 1);
    oeil.position.set(s * crane[0] * hs * 0.72, crane[1] * hs * 0.18, crane[2] * hs * 0.55);
    oeil.rotation.y = s * 0.5;
    const pupille = mesh(new T.IcosahedronGeometry(ry * 0.32, 0), m.pupille);
    pupille.scale.set(0.35, 1.35, 0.35); pupille.position.set(s * ry * 0.3, 0, ry * 0.72); oeil.add(pupille);
    tete.add(oeil); yeux.push(oeil);
    if (st !== "rond") {
      const sourcil = mesh(geoCorps(bloc(ry * 1.2, ry * 0.35, ry * 1.1, 0, 0), coul, 5 + s), m.corps);
      sourcil.position.set(s * crane[0] * hs * 0.66, crane[1] * hs * 0.18 + ry * 0.95, crane[2] * hs * 0.52);
      sourcil.rotation.z = s * -0.35; tete.add(sourcil);
    }
  }
  // Cornes
  const cs = gn.cornes.style, cl = gn.cornes.long * ech, n = gn.cornes.n || 2;
  const haut = crane[1] * hs * 0.75, arriere = -crane[2] * hs * 0.2;
  if (cs === "arriere" || cs === "bouc") {
    for (let k = 0; k < n; k++) {
      const s = k % 2 ? 1 : -1, rang = Math.floor(k / 2);
      const c = corne(cl * (1 - rang * 0.3), hs * 0.1 * (1 - rang * 0.25), cs === "bouc" ? 0.75 : 0.28, m.accent, cs === "bouc" ? 4 : 3);
      c.position.set(s * crane[0] * hs * (0.55 + rang * 0.15), haut - rang * hs * 0.12, arriere - rang * hs * 0.12);
      c.rotation.set(-1.15 - rang * 0.2, 0, s * (cs === "bouc" ? 0.9 : 0.35));
      tete.add(c);
    }
  } else if (cs === "couronne") {
    for (let k = 0; k < n; k++) {
      const a = (k / (n - 1) - 0.5) * 2.4;
      const c = corne(cl * (1 - Math.abs(a) * 0.15), hs * 0.07, 0.2, m.accent, 3);
      c.position.set(Math.sin(a) * crane[0] * hs * 0.8, haut * 0.9, arriere + Math.cos(a) * crane[2] * hs * 0.1 - hs * 0.15);
      c.rotation.set(-0.9, 0, -Math.sin(a) * 0.8); tete.add(c);
    }
  } else if (cs === "cristaux") {
    for (let k = 0; k < n; k++) {
      const s = k % 2 ? 1 : -1;
      const g = new T.OctahedronGeometry(hs * 0.12, 0); g.scale(0.6, 2.8 * (cl / ech / 0.45), 0.6);
      const c = mesh(g, m.cristal);
      c.position.set(n === 1 ? 0 : s * crane[0] * hs * (0.45 + 0.1 * Math.floor(k / 2)), haut + hs * 0.12, arriere - Math.floor(k / 2) * hs * 0.15);
      c.rotation.set(-0.7, 0, s * 0.4); tete.add(c);
    }
  } else if (cs === "oreilles") {
    for (const s of [-1, 1]) {
      const g = cone(hs * 0.16, cl, 4); g.scale(1, 1, 0.45);
      const o = mesh(geoCorps(g, coul, 7 + s), m.corps); o.position.set(s * crane[0] * hs * 0.6, haut * 0.9, arriere);
      o.rotation.set(-0.3, 0, s * -0.55); tete.add(o);
      const int = mesh(cone(hs * 0.09, cl * 0.75, 3), m.ventre); int.position.set(0, cl * 0.05, hs * 0.03); o.add(int);
      rig.oreilles.push(o);
    }
  } else if (cs === "antennes") {
    for (const s of [-1, 1]) {
      const c = corne(cl, hs * 0.03, -0.25, m.cristal, 3);
      c.position.set(s * crane[0] * hs * 0.4, haut, arriere); c.rotation.set(-0.6, 0, s * 0.3); tete.add(c);
      const b = mesh(new T.IcosahedronGeometry(hs * 0.05, 0), m.lueur); b.position.set(s * (crane[0] * hs * 0.4 + Math.sin(0.3) * cl), haut + cl * 0.75, arriere - cl * 0.55); tete.add(b);
    }
  } else if (cs === "crete") {
    const f = mesh(plaque([[0, 0], [-cl * 0.9, cl * 0.25], [-cl * 0.6, cl * 0.9], [-cl * 0.1, cl * 0.5]]), m.membrane);
    f.rotation.y = Math.PI / 2; f.position.set(0, haut * 0.9, arriere + hs * 0.2); tete.add(f);
  }
  if (gn.extras.includes("nageoires_joues")) {
    for (const s of [-1, 1]) {
      const f = mesh(plaque([[0, 0], [hs * 0.45, hs * 0.08], [hs * 0.35, -hs * 0.2], [hs * 0.05, -hs * 0.12]]), m.membrane);
      f.position.set(s * crane[0] * hs * 0.85, -hs * 0.05, -hs * 0.05); f.rotation.y = s > 0 ? -0.6 : Math.PI + 0.6; tete.add(f);
      rig.oreilles.push(f);
    }
  }
  if (gn.extras.includes("lune") || gn.extras.includes("lune_pleine")) {
    const plein = gn.extras.includes("lune_pleine");
    const g = new T.TorusGeometry(hs * 0.18, hs * 0.045, 4, 10, plein ? Math.PI * 2 : Math.PI * 1.25);
    const l = mesh(g, m.lueur); l.position.set(0, haut + hs * 0.06, crane[2] * hs * 0.45); l.rotation.set(-0.25, 0, -0.6); tete.add(l);
  }
  if (gn.extras.includes("enclume")) {
    const e = mesh(new T.BoxGeometry(hs * 0.5, hs * 0.14, hs * 0.26), mat(0x2a2d31, { m: 0.6, r: 0.4 }));
    e.position.set(0, haut + hs * 0.05, crane[2] * hs * 0.3); tete.add(e);
  }
  if (gn.extras.includes("anemones")) {
    for (let k = 0; k < 7; k++) {
      const a = mesh(new T.CylinderGeometry(hs * 0.015, hs * 0.03, hs * 0.3, 4), m.lueur);
      a.position.set((r() - 0.5) * crane[0] * hs, haut + hs * 0.1, (r() - 0.5) * crane[2] * hs); a.rotation.set(r() - 0.5, 0, r() - 0.5); tete.add(a);
    }
  }
  if (gn.extras.includes("couronne_plasma")) {
    const c = mesh(new T.TorusGeometry(hs * 0.85, hs * 0.04, 4, 18), m.lueur);
    c.position.set(0, haut * 0.3, -hs * 0.2); c.rotation.x = Math.PI / 2 - 0.3; tete.add(c); rig.tournants.push({ o: c, v: 0.6, axe: "z" });
  }
  if (gn.extras.includes("halo")) {
    const c = mesh(new T.TorusGeometry(hs * 0.7, hs * 0.02, 3, 16), mat(gn.couleurs.lueur, { e: gn.couleurs.lueur, ei: 0.8, o: 0.55 }));
    c.position.set(0, haut + hs * 0.3, -hs * 0.1); c.rotation.x = Math.PI / 2; tete.add(c);
  }
  if (gn.extras.includes("yeux_brulants")) for (const y of yeux) y.scale.multiplyScalar(1.25);
  rig.boutMuseau = new T.Object3D();
  rig.boutMuseau.position.set(0, -hs * 0.08, bout + hs * 0.05);
  tete.add(rig.boutMuseau);
  return { tete, machoire, yeux, hs, crane };
}

// ---------- Ailes ----------
function construireAile(gn, ech, m, cote, r, decal = 0) {
  const st = gn.ailes.style;
  const W = gn.ailes.taille * ech * (decal ? 0.75 : 1);
  const racine = new T.Group();
  const interieur = new T.Group(); interieur.scale.x = cote; racine.add(interieur);
  const coude = new T.Group();
  const a1 = W * 0.45, a2 = W * 0.55;
  coude.position.x = a1;
  interieur.add(coude);
  const os = (l, rr) => { const g = new T.CylinderGeometry(rr * 0.7, rr, l, 4); g.rotateZ(-Math.PI / 2); g.translate(l / 2, 0, 0); return g; };
  const rot90 = (g) => { g.rotateX(-Math.PI / 2); return g; }; // plan XY -> plan XZ (y devient -z)
  const membrane = st === "flamme" ? m.aileFlamme : st === "brume" ? m.aileBrume : st === "nageoire" ? m.membrane : gn.ailes.translucide ? m.aileTranslucide : gn.ailes.argent ? m.aileArgent : m.aile;
  if (st === "membrane" || st === "flamme" || st === "brume" || st === "nageoire") {
    interieur.add(mesh(os(a1, W * 0.035), m.os));
    coude.add(mesh(os(a2 * 0.5, W * 0.03), m.os));
    const doigts = st === "nageoire" ? 4 : 3;
    const pts = [[0, 0], [a2 * 0.5, 0]];
    for (let k = 0; k < doigts; k++) {
      const ang = (k / (doigts - 1)) * 1.15 + 0.15;
      const l = a2 * (0.95 - k * 0.12);
      const g = os(l, W * 0.018); g.rotateY(ang); g.translate(a2 * 0.5, 0, 0);
      if (st !== "nageoire") coude.add(mesh(g, m.os));
      const x = a2 * 0.5 + Math.cos(ang) * l, y = Math.sin(ang) * l;
      if (k > 0) {
        // Bord festonné entre deux doigts
        const pr = pts[pts.length - 1];
        const ech2 = gn.ailes.dechiree && r() > 0.5 ? 0.5 : 0.78;
        pts.push([(pr[0] + x) / 2 * 0.96, (pr[1] + y) / 2 * ech2 + y * 0.05]);
      }
      pts.push([x, y]);
    }
    pts.push([-a1 * 0.05, W * 0.42]);
    const geoExt = rot90(plaque(pts));
    const ext = mesh(geoExt, membrane); coude.add(ext);
    const geoInt = rot90(plaque([[0, 0], [a1, 0], [a1 + a2 * 0.0, W * 0.4], [a1 * 0.5, W * 0.33], [0, W * 0.38]]));
    const int = mesh(geoInt, membrane); interieur.add(int);
    if (st === "flamme") { ext.userData.flammeAile = 1; int.userData.flammeAile = 1; }
  } else if (st === "plumes" || st === "rayons") {
    interieur.add(mesh(os(a1, W * 0.04), st === "rayons" ? m.lueur : m.os));
    coude.add(mesh(os(a2 * 0.45, W * 0.035), st === "rayons" ? m.lueur : m.os));
    const nb = 7;
    for (let k = 0; k < nb; k++) {
      const parent = k < 3 ? interieur : coude;
      const base = k < 3 ? a1 * (0.2 + k * 0.3) : a2 * 0.45 * ((k - 3) / 3);
      const l = W * (k < 3 ? 0.42 : 0.5 + (k - 3) * 0.1);
      const pl = st === "rayons"
        ? rot90(plaque([[-W * 0.03, 0], [W * 0.03, 0], [0, l * 1.1]]))
        : rot90(plaque([[-W * 0.05, 0], [W * 0.05, 0], [W * 0.06, l * 0.8], [0, l], [-W * 0.04, l * 0.8]]));
      const p = mesh(pl, st === "rayons" ? m.lueurTranslucide : (k % 2 ? m.aile : m.ventreDouble));
      p.position.x = base; p.rotation.y = k < 3 ? 0.05 : -0.15 - (k - 3) * 0.28;
      parent.add(p);
    }
  } else if (st === "cristal") {
    interieur.add(mesh(os(a1, W * 0.035), m.os));
    coude.add(mesh(os(a2 * 0.3, W * 0.03), m.os));
    const prisme = gn.ailes.prisme;
    const cols = [0xff9ad0, 0x9ad0ff, 0xc8ff9a, 0xffe08a, 0xb89aff];
    for (let k = 0; k < 6; k++) {
      const parent = k < 2 ? interieur : coude;
      const l = W * (k < 2 ? 0.35 : 0.45 + (k - 2) * 0.08);
      const g = new T.OctahedronGeometry(1, 0); g.scale(W * 0.06, l / 2, W * 0.02); g.translate(0, l / 2, 0); rot90(g);
      const mm = prisme ? mat(cols[k % cols.length], { e: cols[k % cols.length], ei: 0.35, o: 0.82, r: 0.15, m: 0.2 }) : m.cristal;
      const c = mesh(g, mm);
      c.position.x = k < 2 ? a1 * (0.35 + k * 0.4) : a2 * 0.3 * ((k - 2) / 3);
      c.rotation.y = k < 2 ? 0 : -0.1 - (k - 2) * 0.32;
      parent.add(c);
    }
  }
  return { racine, coude, cote, decal };
}

// ---------- Pattes ----------
function construirePatte(gn, ech, m, cote, avant, r) {
  const L = gn.pattes.long * ech, rr = gn.pattes.r * ech;
  const haut = new T.Group();
  const cuisse = mesh(geoCorps(bloc(rr * 1.1, L * 0.34, rr * 1.25, 1, 0.08, 21), gn.couleurs, r() * 1e6), m.corps);
  cuisse.position.y = -L * 0.22; haut.add(cuisse);
  const genou = new T.Group(); genou.position.y = -L * 0.5; haut.add(genou);
  const tibia = mesh(geoCorps(bloc(rr * 0.85, L * 0.3, rr * 0.9, 1, 0.06, 22), gn.couleurs, r() * 1e6), m.corps);
  tibia.position.y = -L * 0.24; genou.add(tibia);
  const cheville = new T.Group(); cheville.position.y = -L * 0.48; genou.add(cheville);
  const pied = mesh(geoCorps(bloc(rr * 1.0, rr * 0.45, rr * 1.4, 0, 0.05, 23), gn.couleurs, r() * 1e6), m.corps);
  pied.position.set(0, -rr * 0.05, rr * 0.4); cheville.add(pied);
  for (let k = -1; k <= 1; k++) {
    const g = cone(rr * 0.22, rr * 0.7, 4); g.rotateX(Math.PI / 2);
    const gr = mesh(g, m.accent); gr.position.set(k * rr * 0.55, -rr * 0.15, rr * 1.4); cheville.add(gr);
  }
  if (gn.extras.includes("plumes_pattes")) {
    for (let k = 0; k < 3; k++) { const f = mesh(cone(rr * 0.4, rr * 1.6, 4), m.flamme); f.position.set(0, L * 0.05, -rr * 0.3); f.rotation.set(-2.2 + k * 0.25, 0, (k - 1) * 0.4); f.userData.flamme = 1; genou.add(f); }
  }
  // Pose : pattes avant presque droites, pattes arrière coudées
  const a1 = avant ? 0.12 : 0.5, a2 = avant ? -0.18 : -0.9, a3 = avant ? 0.06 : 0.4;
  haut.rotation.x = a1; genou.rotation.x = a2; cheville.rotation.x = a3;
  const vertical = L * 0.5 * Math.cos(a1) + L * 0.48 * Math.cos(a1 + a2) + rr * 0.3;
  return { haut, genou, cheville, cote, avant, base: [a1, a2, a3], vertical, L };
}

function chaine(parent, n, longueur, rayon0, rayon1, materiau, dir, coul, r, aplati = 1) {
  const segs = [];
  let p = parent;
  const l = longueur / n;
  for (let i = 0; i < n; i++) {
    const g = new T.Group();
    if (i > 0) g.position.z = dir * l;
    const rr = rayon0 + (rayon1 - rayon0) * (i / Math.max(1, n - 1));
    const geo = geoCorps(bloc(rr, rr * 0.92 * aplati, l * 0.92, 1, 0.07, 30 + i), coul, r() * 1e6, -0.25);
    const s = mesh(geo, materiau);
    s.position.z = dir * l * 0.5;
    g.add(s);
    g.userData.r = rr; g.userData.l = l;
    p.add(g);
    segs.push(g);
    p = g;
  }
  return segs;
}

function materiaux(gn, ul) {
  const c = gn.couleurs;
  const transl = gn.extras.includes("translucide");
  return {
    corps: mat(0xffffff, { vc: true, r: transl ? 0.25 : 0.68, m: ul ? 0.25 : 0.04, o: transl ? 0.62 : 1, unique: true }),
    accent: mat(c.accent, { r: 0.45, m: ul ? 0.6 : 0.1 }),
    sombre: mat(0x120c0a, { r: 0.9 }),
    gorge: mat(0x5a1820, { r: 0.8 }),
    dent: mat(0xf4eee0, { r: 0.4 }),
    ventre: mat(c.ventre, { r: 0.7 }),
    ventreDouble: mat(c.ventre, { r: 0.7, d: true }),
    lueur: mat(new T.Color(c.lueur).multiplyScalar(0.55).getHex(), { e: c.lueur, ei: 0.7, r: 0.4 }),
    lueurTranslucide: mat(c.lueur, { e: c.lueur, ei: 0.9, o: 0.7, d: true }),
    flamme: mat(new T.Color(c.lueur).multiplyScalar(0.6).getHex(), { e: c.lueur, ei: 0.85, o: 0.9 }),
    flammeClaire: mat(0xc8b890, { e: 0xffe8a0, ei: 0.8, o: 0.85 }),
    cristal: mat(c.accent, { e: c.lueur, ei: 0.25, r: 0.15, m: 0.25, o: 0.88 }),
    membrane: mat(c.aile, { d: true, o: 0.72, e: c.lueur, ei: 0.12, r: 0.5 }),
    aile: mat(c.aile, { d: true, r: 0.7 }),
    aileTranslucide: mat(c.aile, { d: true, o: 0.6, e: c.lueur, ei: 0.2, r: 0.3 }),
    aileArgent: mat(c.aile, { d: true, m: 0.6, r: 0.25 }),
    aileFlamme: mat(new T.Color(c.aile).multiplyScalar(0.75).getHex(), { d: true, o: 0.82, e: c.lueur, ei: 0.6, unique: true }),
    aileBrume: mat(c.aile, { d: true, o: 0.35, e: c.lueur, ei: 0.25 }),
    os: mat(c.accent, { r: 0.6 }),
    yeux: mat(c.yeux, { e: c.yeux, ei: 0.85, r: 0.2 }),
    pupille: mat(0x050505, { r: 0.2 }),
  };
}

// ---------- Dragon complet ----------
// options : { armure: "cuirasse" | "runes" | "parure" | null, ul: bool }
export function construireDragon(id, stade, options = {}) {
  const src = GENOMES[id];
  if (!src) throw new Error("Dragon inconnu : " + id);
  const gn = genomeDe(id, stade);
  const element = id in ELEMENT_DE ? ELEMENT_DE[id] : "feu";
  if (options.ul) {
    gn.couleurs = { ...gn.couleurs, ...PALETTES_UL[element] };
    gn.extras = [...gn.extras, "aura_ul"];
  }
  const r = rng(id + stade);
  const ech = ECHELLE_STADE[stade] * (gn.taille || 1);
  const m = materiaux(gn, options.ul);
  const coul = gn.couleurs;
  const rig = { m, id, stade, gn, ech, cou: [], queue: [], pattes: [], ailes: [], flammes: [], tournants: [], oreilles: [], flotteurs: [], emissifs: [], element };
  const racine = new T.Group(); racine.name = "dragon-" + id;
  const pivot = new T.Group(); racine.add(pivot); // sert aux sauts, chutes, secousses
  rig.racine = racine; rig.pivot = pivot;

  const forme = gn.forme;
  const L = gn.corps.L * ech, Tw = gn.corps.T * ech, H = gn.corps.H * ech;
  // Pattes : on les crée d'abord pour connaître la hauteur du corps
  const avecPattes = forme !== "serpent";
  const pattesAvant = forme === "quadrupede" || forme === "boule";
  const ps = PATTE_STADE[stade];
  const gnP = clone(gn); gnP.pattes.long *= ps * (forme === "boule" ? 0.55 : 1);
  let hauteur = forme === "serpent" ? H * 0.42 : 0;
  const pattes = [];
  if (avecPattes) {
    for (const avant of pattesAvant ? [true, false] : [false]) for (const cote of [-1, 1]) pattes.push(construirePatte(gnP, ech, m, cote, avant, r));
    hauteur = Math.max(...pattes.map((p) => p.vertical)) + H * (forme === "boule" ? 0.05 : 0.18);
  }
  const corps = new T.Group(); corps.position.y = hauteur; pivot.add(corps); rig.corps = corps; rig.hauteur = hauteur;
  let geoTronc;
  if (forme === "boule") geoTronc = bloc(Math.max(Tw, H) * 0.62, Math.max(Tw, H) * 0.58, L * 0.42, 2, 0.05, 1);
  else geoTronc = bloc(Tw / 2, H / 2, L / 2, 2, 0.05, 1);
  const tronc = mesh(geoCorps(geoTronc, coul, 99), m.corps);
  corps.add(tronc); rig.tronc = tronc;
  const demiH = forme === "boule" ? Math.max(Tw, H) * 0.58 : H / 2;
  const demiL = forme === "boule" ? L * 0.42 : L / 2;
  const demiT = forme === "boule" ? Math.max(Tw, H) * 0.62 : Tw / 2;
  rig.dims = { L, Tw, H, demiH, demiL, demiT };

  for (const p of pattes) {
    const z = p.avant ? demiL * 0.55 : -demiL * (pattesAvant ? 0.55 : 0.15);
    p.haut.position.set(p.cote * demiT * 0.62, p.vertical - hauteur, z);
    corps.add(p.haut);
    rig.pattes.push(p);
  }

  // Cou et tête
  const nc = gn.cou.n, lc = gn.cou.long * ech * COU_STADE[stade] * (forme === "boule" ? 0.35 : 1);
  const baseCou = new T.Group();
  baseCou.position.set(0, demiH * 0.45, demiL * 0.78);
  rig.angleCou = gn.cou.angle * (forme === "boule" ? 1 : 1.2);
  baseCou.rotation.x = -rig.angleCou;
  corps.add(baseCou);
  rig.baseCou = baseCou;
  rig.cou = chaine(baseCou, nc, lc, gn.cou.r * ech, gn.cou.r * ech * 0.78, m.corps, 1, coul, r);
  rig.cou.forEach((s, i) => { s.rotation.x = i === 0 ? 0 : gn.cou.angle * 0.28; s.userData.base = s.rotation.x; });
  const bout = new T.Group(); bout.position.z = lc / nc; rig.cou[nc - 1].add(bout);
  const angleTotal = -rig.angleCou + gn.cou.angle * 0.28 * (nc - 1);
  const ht = construireTete(gn, ech * TETE_STADE[stade], m, coul, r, rig);
  ht.tete.rotation.x = -angleTotal * 0.9;
  bout.add(ht.tete);
  rig.tete = ht.tete; rig.machoire = ht.machoire; rig.yeux = ht.yeux; rig.teteBase = ht.tete.rotation.x;

  // Queue
  const nq = gn.queue.n, lq = gn.queue.long * ech * QUEUE_STADE[stade];
  const baseQueue = new T.Group();
  baseQueue.position.set(0, forme === "serpent" ? -demiH * 0.2 : demiH * 0.05, -demiL * 0.82);
  corps.add(baseQueue);
  rig.queue = chaine(baseQueue, nq, lq, gn.queue.r * ech, gn.queue.r * ech * 0.3, m.corps, -1, coul, r, forme === "serpent" ? 0.85 : 1);
  rig.queue.forEach((s, i) => {
    s.rotation.x = forme === "serpent" ? 0 : i === 0 ? -0.35 : 0.07;
    s.userData.base = s.rotation.x;
  });
  if (forme === "serpent") {
    // Le serpent repose sur le sol en S
    rig.queue.forEach((s, i) => { s.userData.baseY = Math.sin(i * 0.9) * 0.35; s.rotation.y = s.userData.baseY; });
  }
  const finQueue = new T.Group(); finQueue.position.z = -lq / nq; rig.queue[nq - 1].add(finQueue);
  const tb = gn.queue.bout, tq = gn.queue.r * ech * 2.2;
  if (tb === "pointe") { const g = cone(tq * 0.3, tq * 1.2, 4); g.rotateX(-Math.PI / 2); finQueue.add(mesh(g, m.accent)); }
  if (tb === "flamme") {
    for (let k = 0; k < 3; k++) { const g = cone(tq * (0.45 - k * 0.1), tq * (1.6 - k * 0.3), 5); g.rotateX(-Math.PI / 2 + 0.5); const f = mesh(g, k ? m.flammeClaire : m.flamme); f.userData.flamme = 1; f.rotation.z = k * 2; finQueue.add(f); }
  }
  if (tb === "lame") { const g = new T.OctahedronGeometry(1, 0); g.scale(tq * 0.08, tq * 0.6, tq * 1.4); g.translate(0, 0, -tq * 0.9); finQueue.add(mesh(g, m.cristal)); }
  if (tb === "nageoire") { const f = mesh(plaque([[0, 0], [tq * 0.9, -tq * 1.3], [0, -tq * 0.8], [-tq * 0.9, -tq * 1.3]]), m.membrane); f.rotation.x = -Math.PI / 2; finQueue.add(f); }
  if (tb === "touffe") { for (let k = 0; k < 5; k++) { const t = mesh(bloc(tq * 0.45, tq * 0.4, tq * 0.6, 0, 0.1, k), m.ventre); t.position.set((r() - 0.5) * tq * 0.4, (r() - 0.5) * tq * 0.4, -tq * 0.5 - k * tq * 0.12); finQueue.add(t); } }
  if (tb === "cristal") { for (let k = 0; k < 3; k++) { const g = new T.OctahedronGeometry(tq * 0.3, 0); g.scale(0.6, 0.6, 2.2); const c = mesh(g, m.cristal); c.position.z = -tq * 0.6; c.rotation.set(0, (k - 1) * 0.5, k); finQueue.add(c); } }
  if (tb === "massue") { const b = mesh(bloc(tq * 0.6, tq * 0.55, tq * 0.7, 0, 0.2, 5), m.accent); b.position.z = -tq * 0.4; finQueue.add(b); for (let k = 0; k < 5; k++) { const s = mesh(cone(tq * 0.12, tq * 0.4, 4), m.accent); s.position.z = -tq * 0.4; s.rotation.set(k * 1.25, k * 0.7, 0); s.translateY(tq * 0.45); finQueue.add(s); } }
  rig.finQueue = finQueue;

  // Ailes
  if (gn.ailes.style && gn.ailes.style !== "aucune") {
    const gA = clone(gn); gA.ailes.taille *= AILE_STADE[stade];
    const paires = gn.ailes.paires || 1;
    for (let p = 0; p < paires; p++) {
      for (const cote of [-1, 1]) {
        const a = construireAile(gA, ech, m, cote, r, p);
        a.racine.position.set(cote * demiT * 0.55, demiH * 0.72, demiL * (0.3 - p * 0.45));
        corps.add(a.racine);
        rig.ailes.push(a);
      }
    }
  }

  // Crête le long du dos, du cou et de la queue
  if (gn.crete.style && gn.crete.style !== "aucune") {
    const n = gn.crete.n, t = gn.crete.taille * ech * CRETE_STADE[stade];
    for (let k = 0; k < n; k++) {
      const f = k / Math.max(1, n - 1);
      let parent, pos;
      if (f < 0.25 && rig.cou.length) {
        const s = rig.cou[Math.min(rig.cou.length - 1, Math.floor((1 - f / 0.25) * rig.cou.length))];
        parent = s; pos = new T.Vector3(0, s.userData.r * 0.85, s.userData.l * 0.5);
      } else if (f < 0.65) {
        const z = demiL * (0.7 - ((f - 0.25) / 0.4) * 1.4);
        parent = corps; pos = new T.Vector3(0, demiH * Math.sqrt(Math.max(0, 1 - (z / demiL) ** 2)) * 0.95, z);
      } else {
        const idx = Math.min(rig.queue.length - 1, Math.floor(((f - 0.65) / 0.35) * rig.queue.length));
        const s = rig.queue[idx]; parent = s; pos = new T.Vector3(0, s.userData.r * 0.85, -s.userData.l * 0.5);
      }
      const taille = t * (f < 0.25 ? 0.75 : f < 0.65 ? 1.1 : 1 - (f - 0.65) * 1.6);
      const p = pieceCrete(gn.crete.style, Math.max(t * 0.3, taille), m, k, r);
      p.position.copy(pos);
      if (gn.crete.style === "stalactites" && parent === corps) {
        // carapace hérissée : répartit sur tout le dos
        p.position.x = (r() - 0.5) * demiT * 1.2; p.position.y *= 0.95;
      }
      parent.add(p);
    }
  }

  ajouterExtras(gn, rig, m, r, corps, { demiH, demiL, demiT, ech });
  rig.particules = gn.particules || null;
  // Liste des objets qui flambent (pour l'animation)
  racine.traverse((o) => {
    if (o.userData.flamme) rig.flammes.push(o);
    if (o.isMesh && o.material && o.material.emissiveIntensity > 0.5) rig.emissifs.push(o);
  });
  if (options.armure) ajouterArmure(rig, options.armure, m);
  racine.userData.rig = rig;
  // Hauteur totale (pour cadrer la caméra)
  const boite = new T.Box3().setFromObject(racine);
  rig.boite = boite;
  rig.taille = boite.getSize(new T.Vector3());
  return rig;
}

function ajouterExtras(gn, rig, m, r, corps, d) {
  const ex = new Set(gn.extras);
  const { demiH, demiL, demiT, ech } = d;
  const c = gn.couleurs;
  const surDos = (z) => demiH * Math.sqrt(Math.max(0, 1 - (z / demiL) ** 2));
  const ajouterVeines = (part, materiau, filtre) => {
    const g = veines(rig.tronc.geometry, part, 5, filtre);
    corps.add(mesh(g, materiau, false));
    for (const s of [...rig.cou, ...rig.queue]) {
      const seg = s.children.find((o) => o.isMesh);
      if (!seg) continue;
      const gv = veines(seg.geometry, part, s.id, filtre); const v = mesh(gv, materiau, false); v.position.copy(seg.position); s.add(v);
    }
  };
  if (ex.has("magma")) ajouterVeines(0.22, m.lueur);
  if (ex.has("crevasses")) ajouterVeines(0.18, mat(0x4ad0ff, { e: 0x2ab0ff, ei: 1.2 }));
  if (ex.has("lumieres")) ajouterVeines(0.1, m.lueur, (p) => p.y > -0.05);
  if (ex.has("lumieres_fortes")) ajouterVeines(0.2, m.lueur, (p) => p.y > -0.1);
  if (ex.has("braises_sous")) ajouterVeines(0.12, m.lueur, (p) => p.y < 0);
  if (ex.has("nacre")) ajouterVeines(0.25, mat(0xffe8f4, { m: 0.7, r: 0.15, e: 0x8a90c0, ei: 0.25 }));
  if (ex.has("taches")) ajouterVeines(0.15, mat(0xffd23a, { r: 0.6 }), (p) => p.y > 0);
  if (ex.has("givre")) ajouterVeines(0.25, mat(0xffffff, { r: 0.4, e: 0x9ae8ff, ei: 0.2 }), (p) => p.y > 0);
  if (ex.has("ventre_four")) {
    const g = veines(rig.tronc.geometry, 0.9, 8, (p) => p.y < -demiH * 0.2); corps.add(mesh(g, m.lueur, false));
  }
  if (ex.has("cratere") || ex.has("couronne_cratere")) {
    const n = ex.has("couronne_cratere") ? 5 : 1;
    for (let k = 0; k < n; k++) {
      const a = n === 1 ? 0 : (k / n) * Math.PI * 2;
      const rc = demiT * (n === 1 ? 0.45 : 0.25);
      const g = new T.CylinderGeometry(rc * 0.65, rc, rc * 0.9, 7, 1, true);
      const cr = mesh(g, m.accent); const z = n === 1 ? -demiL * 0.1 : Math.cos(a) * demiL * 0.45;
      const x = n === 1 ? 0 : Math.sin(a) * demiT * 0.4;
      cr.position.set(x, surDos(z) + rc * 0.25, z); corps.add(cr);
      const lave = mesh(new T.CircleGeometry(rc * 0.62, 7), m.lueur); lave.rotation.x = -Math.PI / 2; lave.position.set(x, surDos(z) + rc * 0.62, z); corps.add(lave);
      rig.flotteurs.push({ type: "fumee", o: lave });
    }
  }
  if (ex.has("coulees")) {
    for (const s of [-1, 1]) for (let k = 0; k < 3; k++) {
      const g = new T.BoxGeometry(demiT * 0.08, demiH * 0.9, demiT * 0.12); const cl = mesh(g, m.lueur, false);
      cl.position.set(s * demiT * 0.92, 0, demiL * (0.4 - k * 0.4)); cl.rotation.z = s * 0.35; corps.add(cl);
    }
  }
  if (ex.has("disque") || ex.has("disque_grand")) {
    const rr = (ex.has("disque_grand") ? 1.1 : 0.7) * demiH * 1.6;
    const grp = new T.Group(); grp.position.set(0, demiH * 1.25 + rr * 0.5, -demiL * 0.15);
    const disque = mesh(new T.CircleGeometry(rr * 0.55, 12), mat(c.lueur, { e: c.lueur, ei: 1.0, o: 0.85, d: true }), false);
    grp.add(disque);
    const anneau = mesh(new T.TorusGeometry(rr * 0.72, rr * 0.05, 3, 18), m.lueur, false); grp.add(anneau);
    for (let k = 0; k < 12; k++) {
      const g = cone(rr * 0.07, rr * 0.4, 3); const ray = mesh(g, mat(0xfff0a0, { e: 0xffe070, ei: 1.2, o: 0.8 }), false);
      ray.rotation.z = (k / 12) * Math.PI * 2; ray.translateY(rr * 0.78); grp.add(ray);
    }
    corps.add(grp); rig.tournants.push({ o: grp, v: 0.35, axe: "z" });
  }
  if (ex.has("epaulieres")) {
    for (const s of [-1, 1]) {
      const g = new T.SphereGeometry(demiT * 0.42, 6, 4, 0, Math.PI * 2, 0, Math.PI / 2);
      const e = mesh(g, mat(0x3a3e44, { m: 0.65, r: 0.35 })); e.position.set(s * demiT * 0.75, demiH * 0.25, demiL * 0.5); e.rotation.z = s * -0.6; corps.add(e);
      for (let k = 0; k < 4; k++) { const rv = mesh(new T.IcosahedronGeometry(demiT * 0.04, 0), mat(0x8a8f96, { m: 0.8, r: 0.3 })); rv.position.set(Math.cos(k * 1.6) * demiT * 0.3, demiT * 0.22, Math.sin(k * 1.6) * demiT * 0.3); e.add(rv); }
    }
  }
  if (ex.has("soufflets")) {
    for (const s of [-1, 1]) {
      const g = new T.CylinderGeometry(demiH * 0.3, demiH * 0.3, demiT * 0.18, 6); g.rotateZ(Math.PI / 2);
      const b = mesh(g, mat(0x5a3a28, { r: 0.85 })); b.position.set(s * demiT * 0.98, -demiH * 0.05, -demiL * 0.1); corps.add(b);
      rig.flotteurs.push({ type: "souffle", o: b });
    }
  }
  if (ex.has("cheminees")) {
    for (const s of [-1, 1]) {
      const g = new T.CylinderGeometry(demiT * 0.12, demiT * 0.15, demiH * 0.9, 6);
      const ch = mesh(g, mat(0x2a2d31, { m: 0.5, r: 0.5 })); ch.position.set(s * demiT * 0.35, surDos(-demiL * 0.35) + demiH * 0.35, -demiL * 0.35); corps.add(ch);
      const feu = mesh(new T.CircleGeometry(demiT * 0.1, 6), m.lueur); feu.rotation.x = -Math.PI / 2; feu.position.y = demiH * 0.46; ch.add(feu);
      rig.flotteurs.push({ type: "fumee", o: feu });
    }
  }
  if (ex.has("geode")) {
    const g = new T.SphereGeometry(demiT * 0.55, 8, 5, 0, Math.PI * 2, 0, Math.PI / 2);
    const coque = mesh(g, mat(0x5a5f6e, { r: 0.9, d: true })); coque.position.set(0, surDos(0) * 0.85, -demiL * 0.05); coque.scale.y = 0.6; corps.add(coque);
    const cols = [0xb68aff, 0x8ad0ff, 0xd08aff];
    for (let k = 0; k < 9; k++) {
      const og = new T.OctahedronGeometry(demiT * (0.1 + r() * 0.1), 0); og.scale(0.6, 2, 0.6);
      const cr = mesh(og, mat(cols[k % 3], { e: cols[k % 3], ei: 0.5, o: 0.9, r: 0.15 })); cr.position.set((r() - 0.5) * demiT * 0.7, surDos(0) * 0.9 + demiT * 0.1, (r() - 0.5) * demiT * 0.6 - demiL * 0.05); cr.rotation.set(r() - 0.5, r(), r() - 0.5); corps.add(cr);
    }
  }
  if (ex.has("prisme_aura")) {
    const cols = [0xff6a8a, 0xffd06a, 0x8aff8a, 0x6ad0ff, 0xb06aff];
    for (let k = 0; k < 5; k++) {
      const og = new T.OctahedronGeometry(demiT * 0.12, 0); og.scale(0.5, 1.6, 0.5);
      const cr = mesh(og, mat(cols[k], { e: cols[k], ei: 0.9, o: 0.85 }), false); corps.add(cr);
      rig.flotteurs.push({ type: "orbite", o: cr, rayon: demiL * 1.2, h: demiH * 1.1, v: 0.6, phase: (k / 5) * Math.PI * 2 });
    }
  }
  if (ex.has("carapace") || ex.has("carapace_dome")) {
    const dome = ex.has("carapace_dome");
    const g = new T.SphereGeometry(demiT * (dome ? 0.95 : 0.8), 9, 5, 0, Math.PI * 2, 0, Math.PI / 2);
    g.scale(1, dome ? 0.95 : 0.6, demiL / demiT * 0.9);
    const ca = mesh(g, mat(0x8cc8e0, { r: 0.2, m: 0.2, e: 0x4ab0e0, ei: 0.15, o: 0.92 })); ca.position.y = demiH * 0.15; corps.add(ca);
  }
  if (ex.has("colonnes")) {
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2;
      const g = new T.CylinderGeometry(demiT * 0.07, demiT * 0.09, demiH * 1.6, 6);
      const co = mesh(g, mat(0xd8f4ff, { o: 0.75, e: 0x8ae0ff, ei: 0.3, r: 0.1 })); co.position.set(Math.cos(a) * demiT * 0.6, demiH * 1.1, Math.sin(a) * demiL * 0.6); corps.add(co);
    }
  }
  if (ex.has("icebergs")) {
    for (let k = 0; k < 5; k++) {
      const g = new T.ConeGeometry(demiT * 0.2, demiH * (0.8 + r() * 0.5), 4);
      const ic = mesh(g, m.cristal); const z = demiL * (0.5 - k * 0.25); ic.position.set((r() - 0.5) * demiT * 0.6, surDos(z) + demiH * 0.35, z); ic.rotation.z = (r() - 0.5) * 0.4; corps.add(ic);
    }
  }
  if (ex.has("cube")) {
    const g = new T.BoxGeometry(demiT * 1.5, demiH * 1.4, demiL * 1.5); const cu = mesh(g, mat(0xbfe8ff, { o: 0.45, r: 0.05, e: 0x4ab0e0, ei: 0.15 })); corps.add(cu);
  }
  if (ex.has("carapace_corail") || ex.has("atoll")) {
    for (let k = 0; k < 7; k++) {
      const z = demiL * (0.5 - k * 0.17);
      const p = pieceCrete("coraux", demiT * 0.45, m, k, r); p.position.set((r() - 0.5) * demiT * 1.1, surDos(z) * 0.9, z); corps.add(p);
    }
  }
  if (ex.has("atoll")) {
    const sable = mesh(new T.TorusGeometry(demiT * 0.55, demiT * 0.14, 4, 10), mat(0xf0dca0, { r: 0.9 })); sable.rotation.x = Math.PI / 2; sable.position.set(0, surDos(-demiL * 0.1) + demiT * 0.12, -demiL * 0.1); corps.add(sable);
    const eau = mesh(new T.CircleGeometry(demiT * 0.45, 10), mat(0x2ad0e0, { o: 0.8, e: 0x1a90a0, ei: 0.3 })); eau.rotation.x = -Math.PI / 2; eau.position.copy(sable.position); eau.position.y += demiT * 0.05; corps.add(eau);
    const tronc = mesh(new T.CylinderGeometry(demiT * 0.03, demiT * 0.05, demiT * 0.7, 5), mat(0x8a6a40)); tronc.position.set(demiT * 0.5, sable.position.y + demiT * 0.35, sable.position.z); tronc.rotation.z = -0.3; corps.add(tronc);
    for (let k = 0; k < 5; k++) { const f = mesh(cone(demiT * 0.06, demiT * 0.4, 3), mat(0x3aa040)); f.position.set(demiT * 0.6, sable.position.y + demiT * 0.68, sable.position.z); f.rotation.set(Math.cos(k * 1.25) * 1.6, 0, Math.sin(k * 1.25) * 1.6); corps.add(f); }
  }
  if (ex.has("poissons")) {
    for (let k = 0; k < 4; k++) {
      const g = new T.ConeGeometry(demiT * 0.06, demiT * 0.2, 4); g.rotateX(Math.PI / 2);
      const po = mesh(g, mat([0xffa040, 0xffe040, 0xff6aa0, 0x6ae0ff][k], { r: 0.4 }), false); corps.add(po);
      rig.flotteurs.push({ type: "orbite", o: po, rayon: demiL * (0.9 + k * 0.1), h: demiH * (0.4 + k * 0.15), v: 0.9 + k * 0.15, phase: k * 1.6, oriente: true });
    }
  }
  if (ex.has("coquillages")) {
    for (let k = 0; k < 8; k++) {
      const g = new T.ConeGeometry(demiT * 0.1, demiT * 0.22, 6); const co = mesh(g, mat(0xd8c0a0, { r: 0.6 }));
      const a = r() * Math.PI * 2; co.position.set(Math.cos(a) * demiT * 0.85, Math.sin(a) * demiH * 0.6, (r() - 0.5) * demiL); co.rotation.set(r() * 3, r() * 3, 0); corps.add(co);
    }
  }
  if (ex.has("flamme_poitrine")) {
    const f = mesh(new T.IcosahedronGeometry(demiT * 0.35, 0), mat(0xffffff, { e: 0xfff4e0, ei: 1.6, o: 0.85 }), false);
    f.position.set(0, -demiH * 0.1, demiL * 0.75); corps.add(f); rig.flotteurs.push({ type: "pulse", o: f });
  }
  if (ex.has("criniere") || ex.has("duvet_flamme")) {
    const n = ex.has("criniere") ? 9 : 12;
    const support = ex.has("criniere") && rig.cou.length ? rig.cou[0] : corps;
    for (let k = 0; k < n; k++) {
      const a = (k / n) * Math.PI * 2;
      const f = mesh(cone(demiT * 0.12, demiT * 0.5, 4), k % 2 ? m.flamme : m.flammeClaire, false);
      if (support === corps) { f.position.set(Math.cos(a) * demiT * 0.85, Math.sin(a) * demiH * 0.85, (r() - 0.5) * demiL * 0.8); f.rotation.z = a - Math.PI / 2; }
      else { f.position.set(Math.cos(a) * demiT * 0.4, Math.abs(Math.sin(a)) * demiT * 0.4, 0); f.rotation.set(-0.6, 0, a - Math.PI / 2); }
      f.userData.flamme = 1; support.add(f);
    }
  }
  if (ex.has("fourrure")) {
    for (let k = 0; k < 10; k++) {
      const z = demiL * (0.6 - k * 0.13);
      const t = mesh(bloc(demiT * 0.22, demiT * 0.16, demiT * 0.25, 0, 0.2, k), m.ventre); t.position.set((r() - 0.5) * demiT * 0.9, surDos(z) * 0.92, z); corps.add(t);
    }
  }
  if (ex.has("translucide") || ex.has("goutte") || ex.has("courant")) {
    const coeur = mesh(bloc(demiT * 0.45, demiH * 0.45, demiL * 0.5, 0, 0), mat(c.lueur, { e: c.lueur, ei: 0.7, o: 0.55 }), false);
    corps.add(coeur); rig.flotteurs.push({ type: ex.has("courant") ? "courant" : "pulse", o: coeur });
  }
  if (ex.has("galets")) {
    for (let k = 0; k < 6; k++) { const g = mesh(bloc(demiT * 0.1, demiT * 0.07, demiT * 0.1, 0, 0.2, k), mat([0x8a8a80, 0x6a7a6a, 0xa09a88][k % 3])); g.position.set((r() - 0.5) * demiT * 0.9, (r() - 0.6) * demiH * 0.6, (r() - 0.5) * demiL * 0.9); corps.add(g); }
    for (let k = 0; k < 4; k++) { const a = mesh(new T.CylinderGeometry(demiT * 0.015, demiT * 0.02, demiH * 0.7, 3), mat(0x3a9a5a)); a.position.set((r() - 0.5) * demiT * 0.8, -demiH * 0.2, (r() - 0.5) * demiL * 0.8); a.rotation.z = r() - 0.5; corps.add(a); }
  }
  if (ex.has("lames_nageoires")) {
    for (const s of [-1, 1]) for (let k = 0; k < 2; k++) {
      const og = new T.OctahedronGeometry(1, 0); og.scale(demiT * 0.05, demiH * 0.3, demiL * 0.35);
      const l = mesh(og, m.cristal); l.position.set(s * demiT * 0.9, -demiH * 0.1, demiL * (0.2 - k * 0.5)); l.rotation.set(0.3, 0, s * 0.9); corps.add(l);
    }
  }
  if (ex.has("vague") || ex.has("maree")) {
    const g = new T.TorusGeometry(demiL * 1.5, demiT * 0.25, 4, 16, Math.PI * 0.9);
    const v = mesh(g, mat(0x5ad8f0, { o: 0.55, e: 0x2a90c0, ei: 0.3, d: true }), false);
    v.position.set(0, 0, -demiL * 0.6); v.rotation.set(0, Math.PI / 2, 0.15); corps.add(v);
    rig.flotteurs.push({ type: "vague", o: v });
  }
  if (ex.has("aurore")) {
    const geo = new T.PlaneGeometry(demiL * 3.2, demiH * 1.4, 10, 1);
    const cols = [];
    for (let i = 0; i < geo.attributes.position.count; i++) { const y = geo.attributes.position.getY(i); const col = new T.Color(y > 0 ? 0x8a6aff : 0x3affb0); cols.push(col.r, col.g, col.b); }
    geo.setAttribute("color", new T.Float32BufferAttribute(cols, 3));
    const au = mesh(geo, new T.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.45, side: T.DoubleSide, depthWrite: false }), false);
    au.position.set(0, demiH * 2.4, -demiL * 0.2); au.rotation.y = Math.PI / 2; corps.add(au); rig.flotteurs.push({ type: "aurore", o: au });
  }
  if (ex.has("armure_glace")) {
    for (const s of [-1, 1]) { const g = new T.SphereGeometry(demiT * 0.4, 6, 4, 0, Math.PI * 2, 0, Math.PI / 2); const e = mesh(g, m.cristal); e.position.set(s * demiT * 0.75, demiH * 0.2, demiL * 0.5); e.rotation.z = s * -0.6; corps.add(e); }
  }
  if (ex.has("tourbillon") || ex.has("remous") || ex.has("flocons_orbite") || ex.has("blizzard") || ex.has("flocons_tranchants")) {
    const n = ex.has("blizzard") ? 14 : 8;
    const eau = ex.has("remous");
    for (let k = 0; k < n; k++) {
      const g = eau ? new T.IcosahedronGeometry(demiT * 0.06, 0) : new T.OctahedronGeometry(demiT * (ex.has("flocons_tranchants") ? 0.08 : 0.05), 0);
      const fl = mesh(g, eau ? mat(0x8af0ff, { o: 0.7, e: 0x2ab0d0, ei: 0.4 }) : mat(0xffffff, { e: 0xbfeaff, ei: 0.5 }), false); corps.add(fl);
      rig.flotteurs.push({ type: "orbite", o: fl, rayon: demiL * (1.1 + (k % 3) * 0.25), h: demiH * (0.2 + (k % 4) * 0.35), v: 1.4 + (k % 3) * 0.3, phase: k * 0.8 });
    }
  }
  if (ex.has("aura_chaleur") || ex.has("aura_ul") || ex.has("air_gele") || ex.has("source")) {
    const col = ex.has("aura_ul") ? c.lueur : ex.has("air_gele") ? 0xbfeaff : ex.has("source") ? 0x8af8ff : 0xff8a3a;
    const g = new T.TorusGeometry(demiL * 1.4, demiT * 0.03, 3, 24);
    const a = mesh(g, mat(col, { e: col, ei: 1, o: 0.5 }), false); a.rotation.x = Math.PI / 2; a.position.y = -rig.hauteur + 0.03; corps.add(a);
    rig.flotteurs.push({ type: "anneau", o: a });
    if (ex.has("aura_ul")) {
      for (let k = 0; k < 6; k++) {
        const og = new T.OctahedronGeometry(demiT * 0.07, 0); const p = mesh(og, mat(col, { e: col, ei: 1.3 }), false); corps.add(p);
        rig.flotteurs.push({ type: "orbite", o: p, rayon: demiL * 1.3, h: demiH * (0.6 + k * 0.2), v: 0.8, phase: k });
      }
    }
  }
  if (ex.has("manteau_fumee") || ex.has("vapeur") || ex.has("brouillard") || ex.has("ecume") || ex.has("ruissellement") || ex.has("traces_givre") || ex.has("trainee") || ex.has("liquide") || ex.has("souffle_visible") || ex.has("etincelles") || ex.has("siphon") || ex.has("gorge_lumineuse")) {
    rig.particulesExtra = [...ex].filter((x) => ["manteau_fumee", "vapeur", "brouillard", "ecume", "ruissellement", "traces_givre", "trainee", "liquide", "souffle_visible", "etincelles"].includes(x));
  }
}

// ---------- Armures ----------
export function ajouterArmure(rig, style, m) {
  const c = rig.gn.couleurs;
  const d = rig.dims;
  const ech = rig.ech;
  let metal, orne, gemme;
  if (style === "cuirasse") {
    metal = mat(new T.Color(0x3c4148).lerp(new T.Color(c.accent), 0.2).getHex(), { m: 0.75, r: 0.32 });
    orne = mat(0x9aa0a8, { m: 0.85, r: 0.25 });
    gemme = mat(c.lueur, { e: c.lueur, ei: 0.6, r: 0.2 });
  } else if (style === "runes") {
    metal = mat(new T.Color(0x4a4038).lerp(new T.Color(c.corps), 0.25).getHex(), { r: 0.85, m: 0.05 });
    orne = mat(c.lueur, { e: c.lueur, ei: 1.4 });
    gemme = orne;
  } else {
    metal = mat(0xd4a94a, { m: 0.9, r: 0.22 });
    orne = mat(0xf4e2a0, { m: 0.9, r: 0.18 });
    gemme = mat(c.lueur, { e: c.lueur, ei: 0.9, r: 0.1, m: 0.3 });
  }
  const groupe = new T.Group(); groupe.name = "armure";
  // Selle / plastron sur le dos
  const rSelle = Math.max(d.demiT, d.demiH) * 1.08;
  const g = new T.CylinderGeometry(rSelle, rSelle, d.demiL * 0.95, 9, 1, true, -Math.PI * 0.62, Math.PI * 1.24);
  g.rotateX(Math.PI / 2); g.scale(d.demiT / rSelle * 1.06, d.demiH / rSelle * 1.08, 1);
  const selle = mesh(g, mat(metal.color.getHex(), { m: metal.metalness, r: metal.roughness, d: true }));
  selle.position.set(0, 0.0, d.demiL * 0.1);
  rig.corps.add(selle);
  // Bords
  for (const z of [-1, 1]) {
    const bg = new T.TorusGeometry(rSelle, rSelle * 0.06, 3, 12, Math.PI * 1.24);
    const bord = mesh(bg, orne);
    bord.scale.set(d.demiT / rSelle * 1.08, d.demiH / rSelle * 1.1, 1);
    bord.rotation.z = Math.PI / 2 - Math.PI * 0.62;
    bord.position.set(0, 0, d.demiL * 0.1 + z * d.demiL * 0.47);
    rig.corps.add(bord);
  }
  // Ornement central
  const gem = mesh(new T.OctahedronGeometry(d.demiT * 0.16, 0), gemme);
  gem.position.set(0, d.demiH * 1.08, d.demiL * 0.1); rig.corps.add(gem);
  if (style === "runes") {
    for (let k = 0; k < 6; k++) {
      const rb = mesh(new T.BoxGeometry(d.demiT * 0.05, d.demiT * 0.05, d.demiL * 0.18), orne, false);
      const a = -0.9 + k * 0.36; rb.position.set(Math.sin(a) * d.demiT * 1.09, Math.cos(a) * d.demiH * 1.09, d.demiL * 0.1 + (k % 2 ? 0.1 : -0.1) * d.demiL); rb.rotation.z = -a; rig.corps.add(rb);
    }
  }
  if (style === "cuirasse") {
    for (let k = 0; k < 8; k++) {
      const rv = mesh(new T.IcosahedronGeometry(d.demiT * 0.045, 0), orne);
      const a = -1.6 + k * 0.45; rv.position.set(Math.sin(a) * d.demiT * 1.1, Math.cos(a) * d.demiH * 1.1, d.demiL * 0.55); rig.corps.add(rv);
    }
  }
  // Casque
  if (rig.tete) {
    const hs = rig.gn.tete.taille * ech * TETE_STADE[rig.stade];
    const cg = new T.SphereGeometry(hs * 0.62, 8, 5, 0, Math.PI * 2, 0, Math.PI * 0.42);
    const casque = mesh(cg, mat(metal.color.getHex(), { m: metal.metalness, r: metal.roughness, d: true }));
    casque.scale.set(1, 0.8, 1.1); casque.position.set(0, hs * 0.02, hs * 0.08); rig.tete.add(casque);
    const nasal = mesh(new T.BoxGeometry(hs * 0.08, hs * 0.05, hs * 0.5), orne); nasal.position.set(0, hs * 0.36, hs * 0.45); nasal.rotation.x = 0.35; rig.tete.add(nasal);
    if (style === "parure") {
      for (let k = 0; k < 5; k++) { const pl = mesh(cone(hs * 0.05, hs * 0.55, 4), gemme); pl.position.set(0, hs * 0.4, -hs * 0.05 - k * hs * 0.08); pl.rotation.x = -0.9 - k * 0.15; rig.tete.add(pl); }
    } else if (style === "runes") {
      const rn = mesh(new T.TorusGeometry(hs * 0.12, hs * 0.025, 3, 6), orne, false); rn.position.set(0, hs * 0.4, hs * 0.15); rn.rotation.x = -1.1; rig.tete.add(rn);
    } else {
      for (const s of [-1, 1]) { const ai = mesh(cone(hs * 0.06, hs * 0.35, 4), orne); ai.position.set(s * hs * 0.4, hs * 0.25, -hs * 0.05); ai.rotation.set(-1.3, 0, s * 0.6); rig.tete.add(ai); }
    }
  }
  // Anneaux de queue
  rig.queue.forEach((s, i) => {
    if (i % 2 === 1 && i < rig.queue.length - 1) {
      const rr = s.userData.r * 1.12;
      const an = mesh(new T.TorusGeometry(rr, rr * 0.18, 4, 8), style === "runes" ? orne : metal); an.position.z = -s.userData.l * 0.5; s.add(an);
    }
  });
  // Épaulières sur les pattes avant
  for (const p of rig.pattes) {
    if (!p.avant && rig.pattes.some((q) => q.avant)) continue;
    const eg = new T.SphereGeometry(p.L * 0.22, 6, 4, 0, Math.PI * 2, 0, Math.PI / 2);
    const ep = mesh(eg, metal); ep.position.set(p.cote * p.L * 0.05, -p.L * 0.05, 0); ep.rotation.z = p.cote * -0.5; p.haut.add(ep);
  }
  // Cape pour la parure
  if (style === "parure" && rig.gn.forme !== "serpent") {
    const cg = new T.PlaneGeometry(d.demiT * 1.6, d.demiL * 1.4, 4, 6);
    const cape = mesh(cg, mat(c.accent === 0xffffff ? 0x8a1a2a : new T.Color(c.lueur).multiplyScalar(0.55).getHex(), { d: true, r: 0.8 }));
    cape.rotation.x = -Math.PI / 2 + 0.25; cape.position.set(0, d.demiH * 1.12, -d.demiL * 0.55);
    rig.corps.add(cape); rig.cape = cape; cape.userData.base = cg.attributes.position.array.slice();
  }
  rig.armure = style;
  return groupe;
}

export const ELEMENT_DE = {};
export function enregistrerElements(dragons) { for (const d of dragons) ELEMENT_DE[d.id] = d.element; }
export { ARMURES_STYLES };
