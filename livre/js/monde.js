// Décors : les trois îles flottantes, le rocher du couvoir, les nids, les fermes, les ressources.
import { rng, mat, bloc, peindre, mesh, cone, bosseler, geoOeuf } from "./outils3d.js";

const T = window.THREE;
export const DIST_ILES = 30;
export const POS_ILES = {
  feu: new T.Vector3(Math.cos(Math.PI / 2) * DIST_ILES, 0, -Math.sin(Math.PI / 2) * DIST_ILES),
  glace: new T.Vector3(Math.cos(Math.PI / 2 + 2.094) * DIST_ILES, -0.8, -Math.sin(Math.PI / 2 + 2.094) * DIST_ILES),
  eau: new T.Vector3(Math.cos(Math.PI / 2 + 4.188) * DIST_ILES, 0.6, -Math.sin(Math.PI / 2 + 4.188) * DIST_ILES),
};
export const RAYON_ILE = 12;
export const GRAINES = { feu: 11, glace: 23, eau: 37 };

// Contour irrégulier (organique) : rayon relatif selon l'angle
export function bord(graine, ang) {
  return 1 + Math.sin(ang * 2 + graine) * 0.09 + Math.sin(ang * 3 + graine * 1.7) * 0.06 + Math.sin(ang * 5 + graine * 2.3) * 0.035 + Math.sin(ang * 11 + graine) * 0.015;
}
export function rayonBord(element, ang) { return RAYON_ILE * bord(GRAINES[element], ang); }

// Relief propre à chaque île : collines au bord, plateau, montagnes (glace), lagon et îlots (eau)
const ELEMENT_DE_GRAINE = { 11: "feu", 23: "glace", 37: "eau" };
export const NIVEAU_EAU = -0.12;
const COLLINES = {};
function collines(graine) {
  if (COLLINES[graine]) return COLLINES[graine];
  const el = ELEMENT_DE_GRAINE[graine];
  const r = rng(graine * 13 + 1);
  const l = [];
  const bordR = (a) => RAYON_ILE * bord(graine, a);
  if (el === "glace") {
    // Massif montagneux sur un côté, quelques sommets isolés, des crêtes
    for (let k = 0; k < 6; k++) { const a = 0.3 + k * 0.55 + r() * 0.25; const d = bordR(a) * (0.72 + r() * 0.1); l.push({ x: Math.cos(a) * d, z: Math.sin(a) * d, r: 2.6 + r() * 1.6, h: 2.6 + r() * 2.4, sommet: true }); }
    for (let k = 0; k < 2; k++) { const a = 4.2 + k * 1.1; const d = bordR(a) * 0.78; l.push({ x: Math.cos(a) * d, z: Math.sin(a) * d, r: 2.4, h: 2.2 + r(), sommet: true }); }
    for (let k = 0; k < 3; k++) { const a = r() * 6.28, d = 4 + r() * 2.5; l.push({ x: Math.cos(a) * d, z: Math.sin(a) * d, r: 1.6 + r(), h: 0.4 + r() * 0.5 }); }
  } else {
    const n = el === "eau" ? 3 : 4;
    for (let k = 0; k < n; k++) { const a = (k / n) * Math.PI * 2 + r() * 1.2; const d = bordR(a) * 0.84; l.push({ x: Math.cos(a) * d, z: Math.sin(a) * d, r: 2.2 + r() * 1.4, h: el === "eau" ? 0.8 + r() * 0.8 : 1.2 + r() * 1.2, sommet: true }); }
    if (el === "feu") {
      const ap = 2.2;
      l.push({ x: Math.cos(ap) * bordR(ap) * 0.8, z: Math.sin(ap) * bordR(ap) * 0.8, r: 2.6, h: 1.5, plat: true, sommet: true });
      for (let k = 0; k < 3; k++) { const a = r() * 6.28, d = 3.8 + r() * 3.5; l.push({ x: Math.cos(a) * d, z: Math.sin(a) * d, r: 1.3 + r() * 1.2, h: 0.22 + r() * 0.3 }); }
    }
    if (el === "eau") {
      l.push({ x: 3.6, z: 2.6, r: 1.9, h: 3.9, ilot: true });
      l.push({ x: -2.9, z: -3.5, r: 1.5, h: 3.7, ilot: true });
    }
  }
  COLLINES[graine] = l;
  return l;
}
export function sommets(element) { return collines(GRAINES[element]).filter((c) => c.sommet); }
const lisse01 = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

// Hauteur du sol d'une île au point (x, z), dans le repère de l'île. Sert aussi à poser les dragons.
export function hauteurSol(graine, rayon, x, z) {
  const dist = Math.hypot(x, z);
  const rn = dist / (rayon * bord(graine, Math.atan2(z, x)));
  let h = Math.sin(x * 0.45 + graine) * Math.cos(z * 0.38 + graine) * 0.16 + Math.sin(x * 1.1 + z * 0.9 + graine) * 0.06;
  if (ELEMENT_DE_GRAINE[graine] === "eau") {
    // Grand lagon au centre, plus profond vers le gouffre
    h -= 3.4 * lisse01(7.9, 5.6, dist) + 1.6 * lisse01(2.2, 0.4, dist);
  }
  for (const c of collines(graine)) {
    const d = Math.hypot(x - c.x, z - c.z) / c.r;
    if (d >= 1) continue;
    h += c.plat ? c.h * lisse01(1, 0.6, d) : c.h * (1 - d * d) * (1 - d * d);
  }
  return h * (1 - lisse01(0.9, 1.0, rn));
}
export function solIle(element, x, z) { return hauteurSol(GRAINES[element], RAYON_ILE, x, z); }
export function dansLEau(element, x, z, profond = false) { return element === "eau" && solIle(element, x, z) < (profond ? -1.4 : -0.5); }

// Emplacements de nids : chaque dragon a un habitat (terre, perchoir, cheminée, surface, fond)
export const CHEMINEES = [0.9, 2.5, 4.1, 5.5];
const EMPL = {};
export function emplacements(element) {
  if (EMPL[element]) return EMPL[element];
  const l = [];
  const loin = (x, z, d) => l.every((e) => Math.hypot(e.x - x, e.z - z) > d);
  const ajouter = (x, z, type) => { l.push({ id: `${element}-${l.length}`, x, z, type }); };
  const centreLibre = { feu: [-0.8, -1.2, 3.8], glace: [0.4, 0.6, 2.8], eau: [0, 0, 1.8] }[element];
  const okCentre = (x, z) => Math.hypot(x - centreLibre[0], z - centreLibre[1]) > centreLibre[2];
  if (element === "feu") for (const a of CHEMINEES) for (const s of [-1, 1]) { const aa = a + s * 0.27; ajouter(Math.cos(aa) * 6.4, Math.sin(aa) * 6.4, "cheminee"); }
  for (const c of sommets(element)) if (loin(c.x, c.z, 2.2)) ajouter(c.x, c.z, "perchoir");
  if (element === "eau") {
    for (let k = 0; k < 7; k++) { const a = k * 0.9 + 0.2; const x = Math.cos(a) * 4.4, z = Math.sin(a) * 4.4; if (dansLEau(element, x, z) && loin(x, z, 1.8)) ajouter(x, z, "surface"); }
    for (let k = 0; k < 7; k++) { const a = k * 0.9 + 0.65; const d = k % 2 ? 3.1 : 5.6; const x = Math.cos(a) * d, z = Math.sin(a) * d; if (dansLEau(element, x, z, true) && loin(x, z, 1.8)) ajouter(x, z, "fond"); }
  }
  for (const rr of [4.8, 7.4, 6.1, 8.4]) for (let k = 0; k < 14; k++) {
    const a = k * 0.449 + rr * 0.37;
    const R = RAYON_ILE * bord(GRAINES[element], a);
    const d = Math.min(rr, R - 3.2);
    const x = Math.cos(a) * d, z = Math.sin(a) * d;
    if (!okCentre(x, z) || !loin(x, z, 2.3)) continue;
    const h = solIle(element, x, z);
    if (element === "eau" && h < 0.05) continue;
    if (element === "glace" && h > 1.3) continue;
    ajouter(x, z, "terre");
  }
  EMPL[element] = l;
  return l;
}

const THEMES = {
  feu: { dessus: [0x3a2c28, 0x45332d, 0x2e2420, 0x50382c], roche: 0x221a18, cote: 0x2a1e1c, dessous: 0x1e1614, haut: 0x5a4034 },
  glace: { dessus: [0xe8f0f8, 0xd6e6f2, 0xf4f8fc, 0xc8dcec], roche: 0x5e6e84, cote: 0x5a6a80, dessous: 0x3a4658, haut: 0xffffff },
  eau: { dessus: [0x4aa860, 0x58b468, 0x3c9a54, 0x6ab870], roche: 0x7a7468, cote: 0x7a6248, dessous: 0x4a3c30, haut: 0x8ac878, sable: 0xe8dca4, fond: 0x58c4bc },
};

function socleIle(rayon, theme, graine, plat = false) {
  const r = rng(graine);
  const g = new T.Group();
  // Dessus : disque fin, contour irrégulier, relief
  const dessus = new T.RingGeometry(0.001, rayon, 80, 30);
  dessus.rotateX(-Math.PI / 2);
  const p = dessus.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i);
    const k = bord(graine, Math.atan2(z, x));
    p.setXYZ(i, x * k, plat ? 0 : hauteurSol(graine, rayon, x * k, z * k), z * k);
  }
  const cs = theme.dessus || [0x555555];
  const geoDessus = peindre(dessus, (c, n) => {
    if (theme.fond && c.y < -0.35) return new T.Color(theme.sable).lerp(new T.Color(theme.fond), Math.min(1, (-c.y - 0.35) / 2.6)).multiplyScalar(0.9 + r() * 0.15);
    if (theme.sable && c.y < 0.3 && Math.hypot(c.x, c.z) < 9) return new T.Color(theme.sable).multiplyScalar(0.92 + r() * 0.1);
    if (n.y < 0.82 && !plat) return new T.Color(theme.roche || theme.cote).multiplyScalar(0.85 + r() * 0.3);
    const tache = Math.sin(c.x * 0.35 + graine) * Math.cos(c.z * 0.3 - graine) + Math.sin(c.x * 0.9 + c.z * 0.7) * 0.4;
    const base = new T.Color(cs[tache > 0.5 ? 2 % cs.length : tache < -0.6 ? 3 % cs.length : Math.floor(r() * 2)]);
    if (theme.haut && c.y > 0.5) base.lerp(new T.Color(theme.haut), Math.min(0.6, (c.y - 0.5) * 0.5));
    return base.multiplyScalar(0.93 + r() * 0.1);
  });
  const m1 = mesh(geoDessus, mat(0xffffff, { vc: true, r: 0.95 }));
  m1.castShadow = false;
  g.add(m1);
  // Flanc
  const flanc = new T.CylinderGeometry(rayon, rayon * 0.92, 1.2, 72, 2, true);
  const pf = flanc.attributes.position;
  for (let i = 0; i < pf.count; i++) { const x = pf.getX(i), z = pf.getZ(i); const k = bord(graine, Math.atan2(z, x)) * (pf.getY(i) < 0 ? 0.97 + r() * 0.03 : 1); pf.setX(i, x * k); pf.setZ(i, z * k); }
  const geoFlanc = peindre(flanc, () => new T.Color(theme.cote).multiplyScalar(0.8 + r() * 0.35));
  const mf = mesh(geoFlanc, mat(0xffffff, { vc: true, r: 1, d: true }), false);
  mf.position.y = -0.6;
  g.add(mf);
  // Dessous rocheux en pointe, qui suit le contour
  // Sous l'île d'Eau, pas de couvercle : il passerait au-dessus du fond du lagon et cacherait tout.
  const dessous = new T.ConeGeometry(rayon * 0.95, rayon * 1.5, 30, 5, !!theme.fond);
  dessous.rotateX(Math.PI);
  const pd = dessous.attributes.position;
  for (let i = 0; i < pd.count; i++) { const x = pd.getX(i), z = pd.getZ(i); const k = bord(graine, Math.atan2(z, x)); pd.setX(i, x * k); pd.setZ(i, z * k); }
  bosseler(dessous, rayon * 0.14, graine);
  const geoDs = peindre(dessous, (c) => new T.Color(theme.dessous).lerp(new T.Color(theme.cote), Math.max(0, Math.min(1, 1 + c.y / (rayon * 0.6)))).multiplyScalar(0.85 + r() * 0.3));
  const m2 = mesh(geoDs, mat(0xffffff, { vc: true, r: 1 }), false);
  m2.position.y = -1.2 - rayon * 0.75;
  g.add(m2);
  // Rochers suspendus
  for (let k = 0; k < 9; k++) {
    const a = r() * Math.PI * 2, d = rayon * (0.35 + r() * 0.5) * bord(graine, a);
    const pr = mesh(bloc(0.4 + r() * 0.7, 0.8 + r() * 1.2, 0.4 + r() * 0.7, 0, 0.3, k), mat(theme.dessous, { r: 1 }), false);
    pr.position.set(Math.cos(a) * d, (theme.fond ? -7 : -2) - r() * 3, Math.sin(a) * d);
    g.add(pr);
  }
  return g;
}

// ---------- Décorations par élément ----------
function arbreMort(r) {
  const g = new T.Group();
  const m = mat(0x1a1210, { r: 1 });
  const tronc = mesh(cone(0.12, 1.4, 5), m); g.add(tronc);
  for (let k = 0; k < 3; k++) {
    const b = mesh(cone(0.05, 0.6, 4), m); b.position.y = 0.6 + k * 0.25; b.rotation.set(0, k * 2.1, 0.9 + r() * 0.4); g.add(b);
  }
  return g;
}
function sapin(r, neige = true) {
  const g = new T.Group();
  g.add(mesh(new T.CylinderGeometry(0.07, 0.1, 0.4, 5).translate(0, 0.2, 0), mat(0x4a3424)));
  for (let k = 0; k < 3; k++) {
    const c = mesh(cone(0.55 - k * 0.14, 0.7, 7), mat(0x1f4a3a, { r: 0.9 })); c.position.y = 0.3 + k * 0.38; g.add(c);
    if (neige) { const n = mesh(cone(0.33 - k * 0.09, 0.3, 7), mat(0xf4f8fc)); n.position.y = 0.72 + k * 0.38; g.add(n); }
  }
  g.scale.setScalar(0.8 + r() * 0.6);
  return g;
}
function palmier(r) {
  const g = new T.Group();
  const mt = mat(0x8a6a44, { r: 0.9 });
  let y = 0;
  for (let k = 0; k < 5; k++) { const s = mesh(new T.CylinderGeometry(0.07, 0.09, 0.32, 5).translate(0, 0.16, 0), mt); s.position.set(k * 0.04, y, 0); s.rotation.z = -0.08; g.add(s); y += 0.3; }
  const mf = mat(0x3aa04a, { r: 0.8, d: true });
  for (let k = 0; k < 6; k++) {
    const f = mesh(new T.PlaneGeometry(0.22, 1.0, 1, 2).translate(0, 0.5, 0), mf);
    f.position.set(0.2, y, 0); f.rotation.set(1.0, (k / 6) * Math.PI * 2, 0, "YXZ"); g.add(f);
  }
  const noix = mesh(new T.IcosahedronGeometry(0.08, 0), mat(0x5a3a20)); noix.position.set(0.22, y - 0.08, 0.05); g.add(noix);
  g.scale.setScalar(0.9 + r() * 0.5);
  return g;
}
function volcan() {
  const g = new T.Group();
  const geo = new T.CylinderGeometry(0.45, 1.6, 2.0, 10, 3, true);
  bosseler(geo, 0.15, 3);
  const c = mesh(peindre(geo, (ce) => new T.Color(ce.y > 0.6 ? 0x5a3020 : 0x2e2220).multiplyScalar(0.9 + Math.random() * 0.2)), mat(0xffffff, { vc: true, r: 1, d: true }));
  c.position.y = 1.0; g.add(c);
  const lave = mesh(new T.CircleGeometry(0.42, 10), mat(0xff5a10, { e: 0xff3a0a, ei: 1.0, unique: true }), false);
  lave.rotation.x = -Math.PI / 2; lave.position.y = 1.85; g.add(lave);
  for (let k = 0; k < 3; k++) {
    const coulee = mesh(new T.BoxGeometry(0.14, 0.04, 1.3), mat(0xd8400a, { e: 0xff3a0a, ei: 0.8 }), false);
    const a = k * 2.2 + 0.3; coulee.position.set(Math.cos(a) * 0.75, 1.1, Math.sin(a) * 0.75); coulee.rotation.set(0.75 * Math.sin(a), -a + Math.PI / 2, 0.75 * Math.cos(a)); g.add(coulee);
  }
  const lum = new T.PointLight(0xff6a2a, 2.2, 6, 2); lum.position.y = 2.3; g.add(lum);
  g.userData.lave = lave; g.userData.lum = lum;
  return g;
}
function cristaux(r, coul = 0x9adfff) {
  const g = new T.Group();
  const m = mat(coul, { e: coul, ei: 0.35, o: 0.85, r: 0.1, m: 0.2 });
  for (let k = 0; k < 5; k++) {
    const og = new T.OctahedronGeometry(0.18 + r() * 0.12, 0); og.scale(0.6, 2.4, 0.6);
    const c = mesh(og, m); c.position.set((r() - 0.5) * 0.5, 0.25, (r() - 0.5) * 0.5); c.rotation.set((r() - 0.5) * 0.7, r() * 3, (r() - 0.5) * 0.7); g.add(c);
  }
  return g;
}
function cascade() {
  const g = new T.Group();
  const geo = new T.PlaneGeometry(0.9, 5, 3, 10);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) pos.setZ(i, Math.pow((2.5 - pos.getY(i)) / 5, 2) * 1.2);
  const eau = mesh(geo, mat(0x7fe8ff, { o: 0.55, e: 0x2aa0c0, ei: 0.35, d: true }), false);
  eau.position.y = -2.5; g.add(eau);
  g.userData.eau = eau;
  return g;
}

// Petits objets posés en grand nombre (herbes, fleurs, cailloux) : un seul objet 3D par type, pour rester fluide.
function semis(deco, geo, materiau, points, ombre = false) {
  if (!points.length) return;
  const im = new T.InstancedMesh(geo, materiau, points.length);
  const m = new T.Matrix4(), q = new T.Quaternion(), e = new T.Euler(), sc = new T.Vector3(), pos = new T.Vector3();
  points.forEach((pt, i) => {
    e.set(pt.rx || 0, pt.ry || 0, pt.rz || 0); q.setFromEuler(e);
    sc.set(pt.s * (pt.sx || 1), pt.s * (pt.sy || 1), pt.s * (pt.sz || 1));
    pos.set(pt.x, pt.y, pt.z);
    m.compose(pos, q, sc);
    im.setMatrixAt(i, m);
  });
  im.castShadow = ombre; im.receiveShadow = true;
  deco.add(im);
  return im;
}
function arbreRond(r, couleur) {
  const g = new T.Group();
  g.add(mesh(new T.CylinderGeometry(0.1, 0.16, 1.2, 6).translate(0, 0.6, 0), mat(0x6a4a2c, { r: 1 })));
  for (let k = 0; k < 3; k++) { const b = mesh(bloc(0.7 - k * 0.12, 0.55, 0.7 - k * 0.1, 0, 0.25, k + 3), mat(couleur, { r: 0.9 })); b.position.set((r() - 0.5) * 0.4, 1.3 + k * 0.35, (r() - 0.5) * 0.4); g.add(b); }
  g.scale.setScalar(0.8 + r() * 0.6);
  return g;
}
function colonneBasalte(r) {
  const g = new T.Group();
  const m = mat(0x231c1a, { r: 0.9 });
  for (let k = 0; k < 5 + Math.floor(r() * 4); k++) {
    const h = 0.6 + r() * 2.2;
    const c = mesh(new T.CylinderGeometry(0.28, 0.3, h, 6).translate(0, h / 2, 0), m);
    c.position.set((r() - 0.5) * 1.4, 0, (r() - 0.5) * 1.4); c.rotation.y = r(); g.add(c);
  }
  return g;
}
function piqueGlace(r) {
  const g = new T.Group();
  const m = mat(0xbfe6ff, { e: 0x4aa0e0, ei: 0.25, o: 0.85, r: 0.1 });
  for (let k = 0; k < 4; k++) { const h = 1 + r() * 2.2; const c = mesh(cone(0.25 + r() * 0.2, h, 5), m); c.position.set((r() - 0.5) * 1.2, 0, (r() - 0.5) * 1.2); c.rotation.set((r() - 0.5) * 0.5, r() * 3, (r() - 0.5) * 0.5); g.add(c); }
  return g;
}
function falaise(r, couleur) {
  const g = new T.Group();
  for (let k = 0; k < 4; k++) { const b = mesh(bloc(0.9 + r() * 0.9, 0.8 + r() * 1.4, 0.8 + r() * 0.8, 0, 0.35, k * 7), mat(couleur, { r: 1 })); b.position.set((r() - 0.5) * 2.2, 0.3, (r() - 0.5) * 1.6); b.rotation.y = r() * 3; g.add(b); }
  return g;
}

// Cheminée de lave (île de Feu) : petite butte qui fume, les dragons de feu aiment nicher à côté
function cheminee() {
  const g = new T.Group();
  const geo = new T.CylinderGeometry(0.35, 1.1, 0.9, 8, 2, true); bosseler(geo, 0.12, 4);
  g.add(mesh(peindre(geo, () => new T.Color(0x2a1e1a).multiplyScalar(0.85 + Math.random() * 0.3)), mat(0xffffff, { vc: true, r: 1, d: true })).translateY(0.45));
  const braise = mesh(new T.CircleGeometry(0.34, 8), mat(0xc8300a, { e: 0xff4a0a, ei: 1 }), false); braise.rotation.x = -Math.PI / 2; braise.position.y = 0.88; g.add(braise);
  const fumees = [];
  for (let k = 0; k < 5; k++) { const f = mesh(new T.IcosahedronGeometry(0.25, 0), mat(0x5a5250, { o: 0.4 }), false); g.add(f); fumees.push(f); }
  g.userData.anim = (t) => fumees.forEach((f, i) => { const k = ((t * 0.35 + i / 5) % 1); f.position.set(Math.sin(i * 2 + t * 0.4) * 0.3 * k, 1 + k * 3, Math.cos(i * 3) * 0.3 * k); f.scale.setScalar(0.5 + k * 1.6); f.material.opacity = 0.45 * (1 - k); });
  return g;
}

export function construireIle(element) {
  const theme = THEMES[element];
  const graine = GRAINES[element];
  const r = rng(graine * 7);
  const R = RAYON_ILE;
  const sol = (x, z) => hauteurSol(graine, R, x, z);
  const bordA = (a) => R * bord(graine, a);
  const g = new T.Group();
  g.add(socleIle(R, theme, graine));
  const animes = [];
  const deco = new T.Group(); g.add(deco);
  const poser = (o, x, z) => { o.position.set(x, sol(x, z), z); deco.add(o); return o; };
  const centre = { feu: [-0.8, -1.2, 3.4], glace: [0.4, 0.6, 2.6], eau: [0, 0, 8.2] }[element];
  const libre = (x, z, marge) => Math.hypot(x - centre[0], z - centre[1]) > centre[2] + marge && !emplacements(element).some((e) => Math.hypot(e.x - x, e.z - z) < 1.1);
  const bosquet = (n, fab, rmin = 0.86, rmax = 0.97) => {
    for (let k = 0; k < n; k++) {
      const a = r() * Math.PI * 2;
      const nb = 2 + Math.floor(r() * 4);
      for (let j = 0; j < nb; j++) {
        const aa = a + (r() - 0.5) * 0.28, d = bordA(aa) * (rmin + r() * (rmax - rmin));
        const x = Math.cos(aa) * d, z = Math.sin(aa) * d;
        if (!libre(x, z, 0)) continue;
        const o = fab(); o.rotation.y = r() * 6; poser(o, x, z);
      }
    }
  };
  const points = (n, rmin, rmax, opts = {}) => {
    const l = [];
    for (let k = 0; k < n * 3 && l.length < n; k++) {
      const a = r() * Math.PI * 2, d = Math.sqrt(r()) * bordA(a) * rmax;
      if (d < rmin) continue;
      const x = Math.cos(a) * d, z = Math.sin(a) * d;
      if (!libre(x, z, opts.marge ?? 0.3)) continue;
      const y = sol(x, z);
      if (opts.surTerre && y < 0.05) continue;
      const s = (opts.s ?? 1) * (0.6 + r() * 0.8);
      l.push({ x, z, y: y + (opts.dy ?? 0), s, ry: r() * 6, rx: (r() - 0.5) * (opts.penche ?? 0.3), rz: (r() - 0.5) * (opts.penche ?? 0.3), sy: opts.sy ?? 1 });
    }
    return l;
  };
  const angPont = Math.atan2(-POS_ILES[element].z, -POS_ILES[element].x);
  const sentier = [];
  for (let k = 0; k < 16; k++) {
    const t = k / 15, d = bordA(angPont) * (0.95 - t * (element === "eau" ? 0.22 : 0.6));
    const ang = angPont + Math.sin(t * 5 + graine) * 0.12;
    const x = Math.cos(ang) * d + (r() - 0.5) * 0.4, z = Math.sin(ang) * d + (r() - 0.5) * 0.4;
    sentier.push({ x, z, y: sol(x, z) + 0.02, s: 0.9 + r() * 0.4, ry: r() * 6, sy: 0.25 });
  }
  const pierrePlate = new T.CylinderGeometry(0.42, 0.46, 0.2, 7);

  if (element === "feu") {
    bosquet(6, () => arbreMort(r));
    bosquet(3, () => colonneBasalte(r), 0.82, 0.92);
    for (const a of CHEMINEES) { const c = cheminee(); c.scale.setScalar(1.2); poser(c, Math.cos(a) * 6.4, Math.sin(a) * 6.4); animes.push(c.userData.anim); }
    semis(deco, cone(0.06, 0.35, 3), mat(0x6a4a30, { r: 1 }), points(170, 3.6, 0.95, { penche: 0.6 }));
    semis(deco, new T.DodecahedronGeometry(0.14, 0), mat(0x1c1614, { r: 1 }), points(120, 2, 0.95, { sy: 0.6 }));
    semis(deco, new T.TetrahedronGeometry(0.06, 0), mat(0xff6a1a, { e: 0xff4a0a, ei: 1.1 }), points(60, 3, 0.9, { dy: 0.04 }));
  } else if (element === "glace") {
    bosquet(9, () => sapin(r), 0.55, 0.95);
    bosquet(3, () => piqueGlace(r), 0.6, 0.9);
    for (const c of sommets("glace")) {
      // Neige au sommet des montagnes
      const n = mesh(bloc(c.r * 0.42, 0.28, c.r * 0.42, 1, 0.3, Math.round(c.x * 10)), mat(0xffffff, { r: 0.8 }), false);
      n.position.set(c.x, sol(c.x, c.z) - 0.18, c.z); deco.add(n);
    }
    semis(deco, bloc(0.3, 0.12, 0.3, 0, 0.2, 3), mat(0xffffff, { r: 0.9 }), points(150, 2.6, 0.95, { sy: 1 }));
    semis(deco, cone(0.05, 0.3, 3), mat(0x9ab8a8, { r: 1 }), points(140, 2.6, 0.95, { penche: 0.5 }));
    semis(deco, new T.DodecahedronGeometry(0.12, 0), mat(0x7a8aa0, { r: 1 }), points(80, 2.6, 0.95, { sy: 0.6 }));
    semis(deco, new T.OctahedronGeometry(0.1, 0), mat(0xbfeaff, { e: 0x5ab0e0, ei: 0.4, r: 0.1 }), points(50, 2.6, 0.9, { sy: 2 }));
  } else {
    // Le grand lagon : eau animée, transparente, on voit les dragons nager dessous
    const eauGeo = new T.CircleGeometry(8.6, 64, 0, Math.PI * 2);
    eauGeo.rotateX(-Math.PI / 2);
    const surf = new T.RingGeometry(0.001, 8.6, 56, 16); surf.rotateX(-Math.PI / 2);
    const plan = surf.toNonIndexed();
    const pos = plan.attributes.position;
    const base = pos.array.slice();
    const eau = new T.Mesh(plan, new T.MeshStandardMaterial({ color: 0x48c8e0, emissive: 0x0a4a5a, emissiveIntensity: 0.3, roughness: 0.15, metalness: 0, transparent: true, opacity: 0.3, flatShading: true, depthWrite: false, side: T.DoubleSide }));
    eau.position.y = NIVEAU_EAU; eau.renderOrder = 2; eau.receiveShadow = true;
    deco.add(eau);
    animes.push((t) => {
      for (let i = 0; i < pos.count; i++) {
        const x = base[i * 3], z = base[i * 3 + 2];
        pos.setY(i, Math.sin(x * 0.9 + t * 1.3) * 0.07 + Math.cos(z * 1.1 - t * 1.1) * 0.06 + Math.sin((x + z) * 2.1 + t * 2.2) * 0.02);
      }
      pos.needsUpdate = true; plan.computeVertexNormals();
    });
    // Écume le long du rivage
    const ecume = mesh(new T.RingGeometry(7.55, 7.9, 64, 1), mat(0xffffff, { o: 0.35 }), false); ecume.rotation.x = -Math.PI / 2; ecume.position.y = NIVEAU_EAU + 0.05; deco.add(ecume);
    animes.push((t) => { ecume.material.opacity = 0.25 + Math.sin(t * 1.7) * 0.1; ecume.scale.setScalar(1 + Math.sin(t * 0.9) * 0.008); });
    // Algues et coraux au fond
    const fond = [];
    for (let k = 0; k < 120; k++) { const a = r() * 6.28, d = 1.6 + Math.sqrt(r()) * 6; const x = Math.cos(a) * d, z = Math.sin(a) * d; const y = sol(x, z); if (y > -0.7) continue; fond.push({ x, z, y, s: 0.7 + r() * 1.2, ry: r() * 6, rx: (r() - 0.5) * 0.4, sy: 1 + r() * 2 }); }
    const algues = semis(deco, cone(0.06, 0.8, 3), mat(0x2a8a5a, { r: 0.8 }), fond.filter((_, i) => i % 2));
    semis(deco, new T.IcosahedronGeometry(0.16, 0), mat(0xff7aa8, { r: 0.6 }), fond.filter((_, i) => i % 4 === 0));
    semis(deco, new T.IcosahedronGeometry(0.12, 0), mat(0xffb05a, { r: 0.6 }), fond.filter((_, i) => i % 4 === 2));
    bosquet(6, () => palmier(r), 0.82, 0.95);
    bosquet(3, () => arbreRond(r, [0x3a8a3a, 0x4a9a3a, 0x2a7a4a][Math.floor(r() * 3)]), 0.8, 0.9);
    for (const c of collines(graine).filter((c) => c.ilot)) { const pm = palmier(r); pm.position.set(c.x + 0.3, sol(c.x + 0.3, c.z), c.z); deco.add(pm); }
    const c = cascade(); c.position.set(bordA(0) * 0.98, 0, 0); c.rotation.y = -Math.PI / 2; c.scale.setScalar(1.5); deco.add(c);
    animes.push((t) => { c.userData.eau.material.opacity = 0.5 + Math.sin(t * 6) * 0.05; c.userData.eau.position.y = -2.5 + Math.sin(t * 8) * 0.02; });
    semis(deco, cone(0.07, 0.4, 3), mat(0x2e8a3a, { r: 1 }), points(320, 8, 0.97, { penche: 0.5, surTerre: true }));
    semis(deco, cone(0.05, 0.28, 3), mat(0x5ab04a, { r: 1 }), points(200, 8, 0.97, { penche: 0.6, surTerre: true }));
    const fleurs = points(90, 8.2, 0.96, { dy: 0.22, surTerre: true });
    semis(deco, cone(0.02, 0.24, 3), mat(0x3a7a2a), fleurs.map((f) => ({ ...f, y: f.y - 0.22 })));
    for (const [i, coul] of [0xff5a8a, 0xffd04a, 0xffffff, 0xb07aff].entries()) semis(deco, new T.IcosahedronGeometry(0.07, 0), mat(coul, { r: 0.6 }), fleurs.filter((_, j) => j % 4 === i));
    semis(deco, new T.ConeGeometry(0.08, 0.12, 6), mat(0xf4d8c8, { r: 0.6 }), points(50, 7.6, 0.86, { dy: 0.04, surTerre: true }));
  }
  semis(deco, pierrePlate, mat(theme.roche || 0x777777, { r: 1 }), sentier.filter((p) => p.y > NIVEAU_EAU + 0.05));
  g.userData.animes = animes;
  g.userData.sol = sol;
  g.userData.bord = (a) => bordA(a);
  return g;
}

// ---------- Sources magiques (centre de chaque île) ----------
// niveau 0 : endormie (fissure, crevasse, gouffre) ; 1 à 3 : volcan, glacier, tourbillon de plus en plus grands.
export function construireSource(element, niveau) {
  const g = new T.Group();
  const animes = [];
  const r = rng(niveau * 17 + element.length);
  if (element === "feu") {
    if (niveau === 0) {
      for (let k = 0; k < 7; k++) {
        const f = mesh(new T.BoxGeometry(0.12, 0.06, 1 + r() * 1.6), mat(0x6a1a08, { e: 0xff3a0a, ei: 0.8, unique: true }), false);
        f.position.set((r() - 0.5) * 2.6, 0.03, (r() - 0.5) * 2.6); f.rotation.y = r() * 3; g.add(f);
        animes.push((t) => { f.material.emissiveIntensity = 0.5 + Math.sin(t * 2 + k) * 0.25; });
      }
      const trou = mesh(new T.CircleGeometry(0.7, 9), mat(0x1a0a06, { e: 0x5a1004, ei: 1 }), false); trou.rotation.x = -Math.PI / 2; trou.position.y = 0.02; g.add(trou);
    } else {
      const v = volcan(); v.scale.setScalar([0, 1.25, 1.55, 1.9][niveau]); g.add(v);
      animes.push((t) => { v.userData.lave.material.emissiveIntensity = 0.7 + Math.sin(t * 2) * 0.18; v.userData.lum.intensity = 1.4 + niveau * 0.4 + Math.sin(t * 2.3) * 0.4; });
      for (let k = 0; k < niveau * 4; k++) { const a = r() * 6.28, d = 2.6 + r() * 1.6; const p = mesh(cone(0.12, 0.45, 4), mat(0x8a1a0a, { e: 0xff3a0a, ei: 0.7 })); p.position.set(Math.cos(a) * d, 0, Math.sin(a) * d); g.add(p); }
    }
  } else if (element === "glace") {
    if (niveau === 0) {
      for (let k = 0; k < 6; k++) { const f = mesh(new T.BoxGeometry(0.14, 0.05, 1.2 + r() * 1.4), mat(0x2a5a8a, { e: 0x4ab0ff, ei: 0.6 }), false); f.position.set((r() - 0.5) * 2.4, 0.03, (r() - 0.5) * 2.4); f.rotation.y = r() * 3; g.add(f); }
    } else {
      const m = mat(0xbfe8ff, { e: 0x4aa8e8, ei: 0.35, o: 0.85, r: 0.08, m: 0.2 });
      const n = 5 + niveau * 4;
      for (let k = 0; k < n; k++) { const h = (1.2 + r() * 2.2) * (0.7 + niveau * 0.35); const og = new T.OctahedronGeometry(0.4 + r() * 0.3, 0); og.scale(0.7, h, 0.7); const c = mesh(og, m); const a = r() * 6.28, d = r() * (0.6 + niveau * 0.35); c.position.set(Math.cos(a) * d, h * 0.45, Math.sin(a) * d); c.rotation.set((r() - 0.5) * 0.4, r() * 3, (r() - 0.5) * 0.4); g.add(c); }
      const lum = new T.PointLight(0x7fd6ff, 1 + niveau * 0.5, 8, 2); lum.position.y = 3; g.add(lum);
      for (let k = 0; k < niveau * 4; k++) { const a = r() * 6.28, d = 2.2 + r() * 1.2; const b = new T.Group(); b.add(mesh(bloc(0.25, 0.2, 0.25, 0, 0.3, k), mat(0x3a6a5a))); for (let j = 0; j < 4; j++) { const ba = mesh(new T.IcosahedronGeometry(0.06, 0), mat(0x7fd6ff, { e: 0x4ab0ff, ei: 0.8 })); ba.position.set((r() - 0.5) * 0.4, 0.15 + r() * 0.15, (r() - 0.5) * 0.4); b.add(ba); } b.position.set(Math.cos(a) * d, 0, Math.sin(a) * d); g.add(b); }
      animes.push((t) => { lum.intensity = 1 + niveau * 0.5 + Math.sin(t * 1.4) * 0.3; });
    }
  } else {
    // Eau : le gouffre au fond du lagon, puis un tourbillon à la surface
    const fondY = solIle("eau", 0, 0);
    const trou = mesh(new T.CircleGeometry(1.1, 12), mat(0x061418, { e: 0x0a2a40, ei: 1 }), false); trou.rotation.x = -Math.PI / 2; trou.position.y = fondY + 0.05; g.add(trou);
    if (niveau > 0) {
      const tours = [];
      for (let k = 0; k < 3 + niveau; k++) {
        const tor = mesh(new T.TorusGeometry(0.6 + k * 0.45, 0.05, 3, 24, Math.PI * 1.3), mat(0xffffff, { o: 0.55 }), false);
        tor.rotation.x = -Math.PI / 2; tor.position.y = NIVEAU_EAU + 0.06 - k * 0.04; g.add(tor); tours.push(tor);
      }
      animes.push((t) => tours.forEach((tor, k) => { tor.rotation.z = t * (2.4 - k * 0.3); }));
      for (let k = 0; k < niveau * 6; k++) { const a = r() * 6.28, d = 1.2 + r() * 1.5; const c = mesh(new T.CylinderGeometry(0.04, 0.08, 0.6 + r() * 0.6, 4).translate(0, 0.3, 0), mat([0xff7aa8, 0xffb05a, 0xb07aff][k % 3])); c.position.set(Math.cos(a) * d, solIle("eau", Math.cos(a) * d, Math.sin(a) * d), Math.sin(a) * d); c.rotation.set(r() - 0.5, 0, r() - 0.5); g.add(c); }
      const poissons = [];
      for (let k = 0; k < 4 + niveau * 3; k++) { const pg = new T.ConeGeometry(0.06, 0.22, 4); pg.rotateX(Math.PI / 2); const pf = mesh(pg, mat([0xffd04a, 0xff7a4a, 0x7ae0ff][k % 3]), false); g.add(pf); poissons.push(pf); }
      animes.push((t) => poissons.forEach((pf, k) => { const a = t * (0.8 + k * 0.07) + k; const d = 1.4 + (k % 3) * 0.7; pf.position.set(Math.cos(a) * d, fondY * 0.5 + Math.sin(t + k) * 0.3, Math.sin(a) * d); pf.rotation.y = -a; }));
    }
  }
  g.userData.animes = animes;
  return g;
}

// Rocher central avec le couvoir et des ponts de cordes vers les îles.
export function construireCentre() {
  const g = new T.Group();
  g.add(socleIle(3.4, { dessus: [0x5a5248, 0x4e483f, 0x666056, 0x5a5248], cote: 0x3a342e, dessous: 0x2a2622, roche: 0x4a443c }, 5, true));
  const couvoir = new T.Group();
  g.add(couvoir);
  return { groupe: g, couvoir };
}

// Le couvoir : un autel de pierre avec 1 ou 2 places pour les œufs.
export function construireCouvoir(niveau, oeufs) {
  const g = new T.Group();
  const pierre = mat(0x6a6258, { r: 0.95 });
  const base = mesh(new T.CylinderGeometry(1.15, 1.35, 0.35, 9).translate(0, 0.17, 0), pierre); g.add(base);
  const marche = mesh(new T.CylinderGeometry(0.85, 1.0, 0.25, 9).translate(0, 0.47, 0), pierre); g.add(marche);
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI * 2;
    const pil = mesh(new T.BoxGeometry(0.22, 1.1 + (k % 2) * 0.3, 0.22).translate(0, 0.55, 0), pierre);
    pil.position.set(Math.cos(a) * 1.55, 0, Math.sin(a) * 1.55); pil.rotation.y = -a; g.add(pil);
    const rune = mesh(new T.BoxGeometry(0.1, 0.25, 0.02), mat(0xf2b544, { e: 0xf2b544, ei: 1.2 }), false);
    rune.position.set(Math.cos(a) * 1.43, 0.75, Math.sin(a) * 1.43); rune.rotation.y = -a + Math.PI / 2; g.add(rune);
  }
  const places = niveau >= 1 ? 2 : 1;
  const nids = [];
  for (let k = 0; k < places; k++) {
    const x = places === 1 ? 0 : (k - 0.5) * 0.85;
    const nid = new T.Group(); nid.position.set(x, 0.6, 0);
    const paille = mat(0xc8a04a, { r: 1 });
    for (let i = 0; i < 12; i++) { const b = mesh(new T.CylinderGeometry(0.03, 0.03, 0.5, 4), paille); const a = (i / 12) * Math.PI * 2; b.position.set(Math.cos(a) * 0.3, 0.06, Math.sin(a) * 0.3); b.rotation.set(Math.PI / 2, 0, -a + 0.4); nid.add(b); }
    g.add(nid); nids.push(nid);
  }
  const lum = new T.PointLight(0xffc870, 1.2, 5, 2); lum.position.set(0, 1.6, 0); g.add(lum);
  g.userData.nids = nids; g.userData.lum = lum;
  return g;
}

export function pont(depuis, vers) {
  const g = new T.Group();
  const corde = mat(0x5a4632, { r: 1 });
  const planche = mat(0x7a5a3a, { r: 1 });
  const n = 26;
  const a = depuis.clone(), b = vers.clone();
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const p = a.clone().lerp(b, t);
    p.y -= Math.sin(t * Math.PI) * 0.9;
    pts.push(p);
  }
  const dir = b.clone().sub(a).setY(0).normalize();
  const cote = new T.Vector3(-dir.z, 0, dir.x).multiplyScalar(0.45);
  for (let i = 1; i < n; i++) {
    const p = pts[i];
    const pl = mesh(new T.BoxGeometry(0.95, 0.05, 0.22), planche);
    pl.position.copy(p); pl.lookAt(p.clone().add(dir)); g.add(pl);
  }
  for (const s of [-1, 1]) {
    const courbe = new T.CatmullRomCurve3(pts.map((p) => p.clone().add(cote.clone().multiplyScalar(s)).add(new T.Vector3(0, 0.45, 0))));
    g.add(mesh(new T.TubeGeometry(courbe, 30, 0.025, 4), corde, false));
  }
  return g;
}

// ---------- Nids des dragons ----------
// niveau : 0 aucun, 1 base, 2 élément, 3 unique. taille : rayon voulu.
export function construireNid(niveau, element, taille, stade, couleurs) {
  const g = new T.Group();
  const r = rng(niveau * 100 + stade * 7 + element.length);
  const R = taille;
  if (niveau === 0) {
    const sol = mesh(new T.CircleGeometry(R * 0.9, 9), mat(0x5a4a38, { r: 1 }), false); sol.rotation.x = -Math.PI / 2; sol.position.y = 0.02; g.add(sol);
    for (let k = 0; k < 5; k++) { const f = mesh(new T.PlaneGeometry(0.15, 0.08), mat(0x8a7a40, { d: true })); f.rotation.set(-Math.PI / 2, 0, r() * 3); f.position.set((r() - 0.5) * R, 0.03, (r() - 0.5) * R); g.add(f); }
    return g;
  }
  // Fond de paille commun
  const fond = mesh(new T.CylinderGeometry(R * 0.85, R * 0.7, 0.12, 10).translate(0, 0.06, 0), mat(niveau === 1 ? 0xc8a04a : 0xb8944a, { r: 1 }), false); g.add(fond);
  if (niveau === 1) {
    const brin = mat(0x8a6034, { r: 1 });
    for (let i = 0; i < 26; i++) {
      const a = (i / 26) * Math.PI * 2;
      const b = mesh(new T.CylinderGeometry(0.035, 0.045, R * 0.9, 4), brin);
      b.position.set(Math.cos(a) * R * 0.92, 0.14 + (i % 2) * 0.06, Math.sin(a) * R * 0.92);
      b.rotation.set(Math.PI / 2, 0, -a + 0.5 + r() * 0.3); g.add(b);
    }
  } else {
    const n = 11;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      let piece;
      if (element === "feu") piece = mesh(bloc(R * 0.2, R * 0.16 + r() * 0.06, R * 0.18, 0, 0.25, i), mat(0x2a2220, { r: 0.9 }));
      else if (element === "glace") { const og = new T.OctahedronGeometry(R * 0.13, 0); og.scale(0.7, 2.2, 0.7); piece = mesh(og, mat(0xbfeaff, { e: 0x5ac0ff, ei: 0.25, o: 0.88, r: 0.1 })); }
      else { const cg = new T.ConeGeometry(R * 0.12, R * 0.28, 7); piece = mesh(cg, mat(i % 2 ? 0xf0d8c0 : 0xff9ab8, { r: 0.6 })); }
      piece.position.set(Math.cos(a) * R * 0.95, 0.15 + (element === "glace" ? R * 0.18 : 0), Math.sin(a) * R * 0.95);
      piece.rotation.y = r() * 3; g.add(piece);
    }
    const centre = element === "feu" ? mat(0xff5a1a, { e: 0xff4a0a, ei: 0.8 }) : element === "glace" ? mat(0xe8f6ff, { e: 0x7fd6ff, ei: 0.3 }) : mat(0x2ad0d8, { o: 0.8, e: 0x1a8aa0, ei: 0.3 });
    const c = mesh(new T.CircleGeometry(R * 0.7, 10), centre, false); c.rotation.x = -Math.PI / 2; c.position.y = 0.13; g.add(c);
  }
  if (niveau === 3) {
    // Nid unique : totems aux couleurs du dragon, bannière et gemme
    const cl = couleurs || { lueur: 0xffffff, corps: 0x888888, accent: 0x444444 };
    for (const s of [-1, 1]) {
      const tot = new T.Group(); tot.position.set(s * R * 1.15, 0, -R * 0.55);
      const pierreT = mat(cl.accent, { r: 0.7, m: 0.2 });
      for (let k = 0; k < 3; k++) { const b = mesh(new T.CylinderGeometry(0.11 - k * 0.02, 0.13 - k * 0.02, 0.42, 6).translate(0, 0.21 + k * 0.42, 0), k === 1 ? mat(cl.corps, { r: 0.6 }) : pierreT); tot.add(b); }
      const gem = mesh(new T.OctahedronGeometry(0.13, 0), mat(cl.lueur, { e: cl.lueur, ei: 1.2 })); gem.position.y = 1.45; tot.add(gem);
      tot.userData.gemme = gem;
      g.add(tot);
    }
    const ban = mesh(new T.PlaneGeometry(R * 1.6, 0.5, 6, 1), mat(cl.corps, { d: true, r: 0.8 })); ban.position.set(0, 1.15, -R * 0.55); g.add(ban);
    g.userData.banniere = ban;
  }
  // Le nid s'embellit avec le stade du dragon
  for (let k = 0; k < stade; k++) {
    const a = r() * Math.PI * 2;
    const ob = element === "feu" ? mesh(new T.IcosahedronGeometry(0.06, 0), mat(0xff8a2a, { e: 0xff5a10, ei: 1.2 }), false)
      : element === "glace" ? mesh(new T.OctahedronGeometry(0.07, 0), mat(0xffffff, { e: 0x9ae8ff, ei: 0.8 }), false)
      : mesh(new T.IcosahedronGeometry(0.06, 1), mat(0xfff4e8, { m: 0.6, r: 0.2 }), false);
    ob.position.set(Math.cos(a) * R * 0.75, 0.18, Math.sin(a) * R * 0.75); g.add(ob);
  }
  return g;
}

// ---------- Fermes ----------
export function construireFerme(niveau, element) {
  const g = new T.Group();
  if (niveau === 0) {
    const poteau = mesh(new T.BoxGeometry(0.08, 0.9, 0.08).translate(0, 0.45, 0), mat(0x6a4a2a)); g.add(poteau);
    const pan = mesh(new T.BoxGeometry(0.7, 0.38, 0.05), mat(0xa07a4a)); pan.position.y = 0.85; g.add(pan);
    const croix = mesh(new T.BoxGeometry(0.4, 0.05, 0.06), mat(0xf2b544, { e: 0xf2b544, ei: 0.6 })); croix.position.set(0, 0.85, 0.04); g.add(croix);
    const croix2 = croix.clone(); croix2.rotation.z = Math.PI / 2; g.add(croix2);
    return g;
  }
  const terre = mesh(new T.BoxGeometry(1.8, 0.12, 1.3).translate(0, 0.06, 0), mat(0x5a3e28, { r: 1 })); g.add(terre);
  const bois = mat(0x8a6034);
  for (const [x, z, l, rot] of [[0, 0.7, 1.9, 0], [0, -0.7, 1.9, 0], [0.95, 0, 1.4, Math.PI / 2], [-0.95, 0, 1.4, Math.PI / 2]]) {
    const b = mesh(new T.BoxGeometry(l, 0.05, 0.05), bois); b.position.set(x, 0.32, z); b.rotation.y = rot; g.add(b);
    for (let k = -1; k <= 1; k += 2) { const p = mesh(new T.BoxGeometry(0.06, 0.4, 0.06).translate(0, 0.2, 0), bois); p.position.set(x + (rot ? 0 : k * l / 2.1), 0, z + (rot ? k * l / 2.1 : 0)); g.add(p); }
  }
  const plants = [];
  const cPlante = niveau === 1 ? 0x6aa040 : element === "feu" ? 0xff4a2a : element === "glace" ? 0x7fd6ff : 0x2ad08a;
  const mp = niveau === 2 ? mat(cPlante, { e: cPlante, ei: 0.5 }) : mat(cPlante, { r: 0.8 });
  for (let i = 0; i < 3; i++) for (let j = 0; j < 4; j++) {
    const p = new T.Group(); p.position.set(-0.6 + j * 0.4, 0.12, -0.4 + i * 0.4);
    const tige = mesh(cone(0.07, 0.3, 4), mat(0x3a7a30)); p.add(tige);
    const fruit = mesh(new T.IcosahedronGeometry(0.07, 0), mp); fruit.position.y = 0.3; p.add(fruit);
    g.add(p); plants.push(p);
  }
  g.userData.plants = plants;
  return g;
}

// ---------- Ressources à récolter ----------
export function construireNoeud(type, element, seed) {
  const r = rng(seed);
  const g = new T.Group();
  if (type === "buisson") {
    const coul = element === "feu" ? 0x8a5a2a : element === "glace" ? 0x4a7a6a : 0x3a8a3a;
    for (let k = 0; k < 4; k++) {
      const b = mesh(bloc(0.32 + r() * 0.1, 0.28 + r() * 0.1, 0.32, 0, 0.3, k), mat(coul, { r: 0.9 }));
      b.position.set((r() - 0.5) * 0.4, 0.22 + r() * 0.1, (r() - 0.5) * 0.4); g.add(b);
    }
    if (element === "glace") { const n = mesh(bloc(0.3, 0.12, 0.3, 0, 0.2), mat(0xffffff)); n.position.y = 0.5; g.add(n); }
    if (element === "eau") for (let k = 0; k < 3; k++) { const fr = mesh(new T.IcosahedronGeometry(0.05, 0), mat(0xff5a6a)); fr.position.set((r() - 0.5) * 0.5, 0.35 + r() * 0.15, (r() - 0.5) * 0.5); g.add(fr); }
  } else if (type === "arbre_mort") {
    g.add(arbreMort(r));
  } else if (type === "basalte") {
    const c = colonneBasalte(r); c.scale.setScalar(0.45); g.add(c);
    const braise = mesh(new T.IcosahedronGeometry(0.09, 0), mat(0xff6a1a, { e: 0xff4a0a, ei: 1.1 })); braise.position.set(0.2, 0.08, 0.25); g.add(braise);
  } else if (type === "sapin") {
    g.add(sapin(r));
  } else if (type === "bloc_glace") {
    const glace = mat(0xbfe6ff, { e: 0x4aa0e0, ei: 0.2, o: 0.88, r: 0.1 });
    for (let k = 0; k < 3; k++) { const b = mesh(bloc(0.32 + r() * 0.12, 0.3 + r() * 0.2, 0.3, 0, 0.12, seed + k), glace); b.position.set((r() - 0.5) * 0.6, 0.25 + k * 0.12, (r() - 0.5) * 0.5); b.rotation.y = r() * 3; g.add(b); }
    const n = mesh(bloc(0.3, 0.1, 0.28, 0, 0.2, seed), mat(0xffffff, { r: 0.8 })); n.position.y = 0.62; g.add(n);
    const pic = piqueGlace(r); pic.scale.setScalar(0.3); pic.position.set(0.3, 0, -0.2); g.add(pic);
  } else if (type === "palmier") {
    g.add(palmier(r));
  } else if (type === "epave") {
    // Débris d'épave qui flottent : une caisse, un tonneau et des planches
    const bois = mat(0x8a5a32, { r: 0.9 }), fonce = mat(0x5a3a22, { r: 0.9 }), cercle = mat(0x3a3a40, { r: 0.5, m: 0.5 });
    const caisse = mesh(new T.BoxGeometry(0.46, 0.4, 0.46), bois); caisse.position.set(-0.12, 0.08, 0.05); caisse.rotation.set(0.12, 0.5, -0.08); g.add(caisse);
    for (const y of [-0.12, 0.12]) { const l = mesh(new T.BoxGeometry(0.48, 0.05, 0.05), fonce); l.position.set(0, y, 0.235); caisse.add(l); }
    const tonneau = mesh(new T.CylinderGeometry(0.17, 0.17, 0.44, 9), fonce); tonneau.rotation.set(Math.PI / 2, 0, 0.5); tonneau.position.set(0.36, 0.02, -0.18); g.add(tonneau);
    for (const y of [-0.13, 0.13]) { const c = mesh(new T.CylinderGeometry(0.178, 0.178, 0.04, 9), cercle); c.position.y = y; tonneau.add(c); }
    for (let k = 0; k < 3; k++) { const p = mesh(new T.BoxGeometry(0.7 + r() * 0.3, 0.05, 0.13), bois); p.position.set((r() - 0.5) * 0.5, -0.06, (r() - 0.5) * 0.7); p.rotation.y = r() * 3; g.add(p); }
    g.userData.flotte = true;
  } else if (type === "recif") {
    // Récif au fond du lagon : roche, coraux et un gros coquillage
    const roche = mat(0x6a7a80, { r: 1 });
    const b = mesh(bloc(0.5, 0.32, 0.42, 0, 0.35, seed), roche); b.position.y = 0.2; g.add(b);
    const b2 = mesh(bloc(0.28, 0.22, 0.26, 0, 0.35, seed + 2), roche); b2.position.set(-0.42, 0.12, 0.2); g.add(b2);
    const couls = [0xff7a5a, 0xb07aff, 0xffc04a, 0xff7aa8];
    for (let k = 0; k < 6; k++) {
      const c = couls[k % 4];
      const t = mesh(new T.CylinderGeometry(0.025, 0.06, 0.45 + r() * 0.3, 4).translate(0, 0.25, 0), mat(c, { r: 0.6 }));
      t.position.set((r() - 0.5) * 0.6, 0.4, (r() - 0.5) * 0.5); t.rotation.set((r() - 0.5) * 0.8, r() * 3, (r() - 0.5) * 0.8); g.add(t);
      const bt = mesh(new T.IcosahedronGeometry(0.07, 0), mat(c, { r: 0.5, e: c, ei: 0.25 })); bt.position.set(0, 0.5, 0); t.add(bt);
    }
    const coq = mesh(new T.SphereGeometry(0.2, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2), mat(0xf4e0d0, { r: 0.5 })); coq.scale.set(1, 0.5, 1.2); coq.position.set(0.42, 0.06, 0.18); g.add(coq);
    const perle = mesh(new T.IcosahedronGeometry(0.06, 1), mat(0xffffff, { r: 0.2, m: 0.3, e: 0x8ad0ff, ei: 0.5 })); perle.position.set(0.42, 0.08, 0.18); g.add(perle);
  } else if (type === "rocher") {
    const c = element === "glace" ? 0x7a8aa0 : element === "feu" ? 0x4a3a36 : 0x8a8478;
    const b = mesh(bloc(0.45, 0.35, 0.4, 0, 0.35, seed), mat(c, { r: 1 })); b.position.y = 0.25; g.add(b);
    const b2 = mesh(bloc(0.25, 0.2, 0.25, 0, 0.35, seed + 1), mat(c, { r: 1 })); b2.position.set(0.35, 0.15, 0.1); g.add(b2);
  } else {
    // gisement de l'élément
    if (element === "feu") {
      for (let k = 0; k < 4; k++) { const og = new T.OctahedronGeometry(0.16, 0); og.scale(0.7, 2, 0.7); const o = mesh(og, mat(0x1a1218, { r: 0.15, m: 0.5, e: 0x5a0a0a, ei: 0.6 })); o.position.set((r() - 0.5) * 0.4, 0.25, (r() - 0.5) * 0.4); o.rotation.set(r() - 0.5, r() * 3, r() - 0.5); g.add(o); }
    } else if (element === "glace") {
      g.add(cristaux(r, 0x6fc8ff));
    } else {
      for (let k = 0; k < 4; k++) {
        const t = mesh(new T.CylinderGeometry(0.03, 0.06, 0.5, 4).translate(0, 0.25, 0), mat(0xff7aa8)); t.position.set((r() - 0.5) * 0.4, 0, (r() - 0.5) * 0.4); t.rotation.set(r() - 0.5, 0, r() - 0.5); g.add(t);
        const bt = mesh(new T.IcosahedronGeometry(0.06, 0), mat(0xffb0c8)); bt.position.copy(t.position).add(new T.Vector3(0, 0.48, 0)); g.add(bt);
      }
    }
  }
  return g;
}

// Un œuf aux couleurs de son élément.
export function construireOeuf(element, taille = 1) {
  const coul = { feu: [0xc83a1a, 0xffa040, 0xff6a1a], glace: [0x9ad0f0, 0xf4fbff, 0x5ab0e8], eau: [0x1a8ab0, 0x7ff0e0, 0x2ad0c0], inconnu: [0xe8dcc0, 0xc8b890, 0xf2b544] }[element] || [0xe8dcc0, 0xc8b890, 0xf2b544];
  const geo = geoOeuf(0.42 * taille, 1.1 * taille, 10);
  const r = rng(element.length * 13);
  const g = peindre(geo, (c) => {
    const bande = Math.sin(c.y * 9 + Math.atan2(c.z, c.x) * 2);
    if (element === "feu") return new T.Color(bande > 0.55 ? coul[1] : coul[0]).multiplyScalar(0.9 + r() * 0.2);
    if (element === "glace") return new T.Color(r() > 0.6 ? coul[1] : coul[0]).multiplyScalar(0.92 + r() * 0.16);
    if (element === "eau") return new T.Color(Math.sin(c.y * 14) > 0.3 ? coul[1] : coul[0]).multiplyScalar(0.9 + r() * 0.2);
    return new T.Color(r() > 0.7 ? coul[1] : coul[0]);
  });
  const oeuf = mesh(g, mat(0xffffff, { vc: true, r: 0.45, m: 0.1, e: coul[2], ei: 0.08, unique: true }));
  oeuf.position.y = 0.55 * taille;
  const grp = new T.Group(); grp.add(oeuf);
  if (element === "glace") for (let k = 0; k < 4; k++) { const og = new T.OctahedronGeometry(0.08 * taille, 0); og.scale(0.6, 1.8, 0.6); const c = mesh(og, mat(0xe8f8ff, { e: 0x7fd6ff, ei: 0.4, o: 0.9 })); const a = k * 1.6; c.position.set(Math.cos(a) * 0.3 * taille, 0.35 * taille + k * 0.12 * taille, Math.sin(a) * 0.3 * taille); c.rotation.z = Math.cos(a) * 0.8; grp.add(c); }
  grp.userData.coque = oeuf;
  return grp;
}
