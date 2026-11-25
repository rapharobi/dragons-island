// Petits outils 3D partagés : matériaux, formes low poly, peinture des faces.
const T = window.THREE;

// Générateur pseudo-aléatoire reproductible (même dragon = même forme).
export function rng(graine) {
  let s = typeof graine === "string" ? [...graine].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7) : graine >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const cacheMat = new Map();
// Matériau facetté. Options : r (rugosité), m (métal), e (couleur émise), ei, o (opacité), vc (couleurs par face), d (double face)
export function mat(couleur, o = {}) {
  const cle = JSON.stringify([couleur, o]);
  if (!o.unique && cacheMat.has(cle)) return cacheMat.get(cle);
  const m = new T.MeshStandardMaterial({
    color: o.vc ? 0xffffff : couleur,
    flatShading: true,
    roughness: o.r ?? 0.72,
    metalness: o.m ?? 0.04,
    emissive: o.e ?? 0x000000,
    emissiveIntensity: (o.ei ?? 1) * 0.75, // lueurs un peu atténuées
    transparent: o.o !== undefined && o.o < 1,
    opacity: o.o ?? 1,
    vertexColors: !!o.vc,
    side: o.d ? T.DoubleSide : T.FrontSide,
    depthWrite: o.o !== undefined && o.o < 1 ? false : true,
  });
  if (!o.unique) cacheMat.set(cle, m);
  return m;
}

// Déplace chaque sommet d'un petit décalage, en gardant les faces collées.
export function bosseler(geo, force, graine = 1) {
  const p = geo.attributes.position;
  const v = new T.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const h = Math.sin(v.x * 127.1 + v.y * 311.7 + v.z * 74.7 + graine * 13.13) * 43758.5453;
    const h2 = Math.sin(v.x * 269.5 + v.y * 183.3 + v.z * 246.1 + graine * 7.7) * 12345.678;
    const h3 = Math.sin(v.x * 113.5 + v.y * 271.9 + v.z * 124.6 + graine * 3.3) * 24634.634;
    p.setXYZ(i, v.x + (h - Math.floor(h) - 0.5) * force, v.y + (h2 - Math.floor(h2) - 0.5) * force, v.z + (h3 - Math.floor(h3) - 0.5) * force);
  }
  p.needsUpdate = true;
  geo.computeVertexNormals();
  return geo;
}

function nonIndexe(geo) {
  return geo.index ? geo.toNonIndexed() : geo;
}

// Ellipsoïde facetté.
export function bloc(rx, ry, rz, detail = 1, bosse = 0.06, graine = 1) {
  const g = new T.IcosahedronGeometry(1, detail);
  g.scale(rx, ry, rz);
  if (bosse) bosseler(g, bosse * Math.min(rx, ry, rz), graine);
  return g;
}

// Colore chaque face selon une fonction (centre de la face, normale) -> T.Color
export function peindre(geo, fn) {
  geo = nonIndexe(geo);
  const p = geo.attributes.position;
  const cols = new Float32Array(p.count * 3);
  const a = new T.Vector3(), b = new T.Vector3(), c = new T.Vector3(), centre = new T.Vector3(), n = new T.Vector3();
  for (let i = 0; i < p.count; i += 3) {
    a.fromBufferAttribute(p, i); b.fromBufferAttribute(p, i + 1); c.fromBufferAttribute(p, i + 2);
    centre.copy(a).add(b).add(c).divideScalar(3);
    n.subVectors(c, b).cross(new T.Vector3().subVectors(a, b)).normalize();
    const col = fn(centre, n, i / 3);
    for (let k = 0; k < 3; k++) { cols[(i + k) * 3] = col.r; cols[(i + k) * 3 + 1] = col.g; cols[(i + k) * 3 + 2] = col.b; }
  }
  geo.setAttribute("color", new T.BufferAttribute(cols, 3));
  return geo;
}

// Extrait une partie des faces (veines de lave, taches lumineuses), légèrement décollées.
export function veines(geo, part, graine = 3, filtre = null) {
  geo = nonIndexe(geo);
  const r = rng(graine);
  const p = geo.attributes.position;
  const garde = [];
  const a = new T.Vector3(), b = new T.Vector3(), c = new T.Vector3(), n = new T.Vector3(), ce = new T.Vector3();
  for (let i = 0; i < p.count; i += 3) {
    a.fromBufferAttribute(p, i); b.fromBufferAttribute(p, i + 1); c.fromBufferAttribute(p, i + 2);
    ce.copy(a).add(b).add(c).divideScalar(3);
    if (filtre && !filtre(ce)) continue;
    if (r() > part) continue;
    n.subVectors(c, b).cross(new T.Vector3().subVectors(a, b)).normalize().multiplyScalar(0.012);
    // Triangle rétréci vers son centre : ressemble à une fissure ou une écaille brillante.
    for (const v of [a, b, c]) {
      const w = v.clone().lerp(ce, 0.42).add(n);
      garde.push(w.x, w.y, w.z);
    }
  }
  const g = new T.BufferGeometry();
  g.setAttribute("position", new T.Float32BufferAttribute(garde, 3));
  g.computeVertexNormals();
  return g;
}

export function couleur(c) { return new T.Color(c); }

export function mesh(geo, materiau, ombre = true) {
  const m = new T.Mesh(geo, materiau);
  m.castShadow = ombre;
  m.receiveShadow = ombre;
  return m;
}

// Cône orienté vers +Y, base au point d'origine.
export function cone(r, h, seg = 5) {
  const g = new T.ConeGeometry(r, h, seg, 1);
  g.translate(0, h / 2, 0);
  return g;
}

// Corne recourbée faite de plusieurs cônes empilés. Renvoie un groupe dont la base est à l'origine, pointant vers +Y.
export function corne(longueur, rayon, courbure, materiau, nseg = 3) {
  const racine = new T.Group();
  let parent = racine;
  const l = longueur / nseg;
  for (let i = 0; i < nseg; i++) {
    const r0 = rayon * (1 - i / nseg), r1 = rayon * (1 - (i + 1) / nseg);
    const g = new T.CylinderGeometry(Math.max(r1, 0.002), r0, l, 5, 1);
    g.translate(0, l / 2, 0);
    const m = mesh(g, materiau);
    const piv = new T.Group();
    piv.add(m);
    piv.rotation.x = i === 0 ? 0 : courbure;
    parent.add(piv);
    const suite = new T.Group();
    suite.position.y = l;
    piv.add(suite);
    parent = suite;
  }
  const pointe = mesh(cone(rayon / nseg + 0.004, l * 0.6, 5), materiau);
  pointe.rotation.x = courbure * 0.5;
  parent.add(pointe);
  return racine;
}

// Œuf facetté (profil tourné).
export function geoOeuf(r = 0.5, h = 1.3, seg = 9) {
  const pts = [];
  const n = 12;
  for (let i = 0; i <= n; i++) {
    const th = (i / n) * Math.PI;
    const y = -Math.cos(th);
    const x = Math.sin(th) * (1 - Math.max(0, y) * 0.28);
    pts.push(new T.Vector2(Math.max(0.0001, x * r), y * h / 2));
  }
  return new T.LatheGeometry(pts, seg);
}

// Forme plate (aile, nageoire) à partir de points 2D (x, y), épaisseur nulle, double face.
export function plaque(points) {
  const s = new T.Shape(points.map(([x, y]) => new T.Vector2(x, y)));
  return new T.ShapeGeometry(s);
}

export function lisser(a, b, k, dt) {
  return a + (b - a) * (1 - Math.exp(-k * dt));
}

export const ELEMENTS_COULEUR = {
  feu: { clair: 0xffb35c, fort: 0xff5a1f, sombre: 0x5a1408 },
  glace: { clair: 0xd6f4ff, fort: 0x6fd0ff, sombre: 0x16405e },
  eau: { clair: 0x9ff3e4, fort: 0x1fb5c9, sombre: 0x08364a },
};
