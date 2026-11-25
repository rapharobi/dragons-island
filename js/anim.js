// Animations des dragons (procédurales) et petites particules d'ambiance.
import { mat } from "./outils3d.js";

const T = window.THREE;

export const ANIMATIONS = [
  { id: "repos", nom: "Repos", boucle: true },
  { id: "marche", nom: "Marche", boucle: true },
  { id: "vol", nom: "Vol", boucle: true },
  { id: "nage", nom: "Nage", boucle: true },
  { id: "attaque", nom: "Attaque" },
  { id: "coup", nom: "Coup reçu" },
  { id: "parade", nom: "Se protéger" },
  { id: "esquive", nom: "Esquiver" },
  { id: "rugir", nom: "Rugir" },
  { id: "joie", nom: "Joie" },
  { id: "manger", nom: "Manger" },
  { id: "jouer", nom: "Jouer" },
  { id: "renifler", nom: "Renifler" },
  { id: "etirer", nom: "S'étirer" },
  { id: "secouer", nom: "Se secouer" },
  { id: "regarder", nom: "Regarder autour" },
  { id: "bailler", nom: "Bâiller" },
  { id: "creuser", nom: "Récolter" },
  { id: "dormir", nom: "Dormir", boucle: true },
  { id: "ko", nom: "K.O.", boucle: true },
  { id: "evolution", nom: "Évolution" },
];
const BOUCLES = ["repos", "marche", "vol", "ko", "dormir", "nage"];

const DUREES = { attaque: 1.15, coup: 0.6, rugir: 1.5, joie: 1.1, manger: 1.8, entree: 0.9, sortie: 0.7, evolution: 2.2, jouer: 1.7, renifler: 2.2, etirer: 2.4, secouer: 1.1, regarder: 2.6, bailler: 1.8, creuser: 0.85, parade: 1.7, esquive: 1.2 };

const lisse = (x) => x * x * (3 - 2 * x);
const cloche = (p, a, b) => (p < a || p > b ? 0 : Math.sin(((p - a) / (b - a)) * Math.PI));

export class Animateur {
  constructor(rig) {
    this.rig = rig;
    this.t = Math.random() * 20;
    this.boucle = "repos";
    this.action = null;
    this.p = 0;
    this.poids = { marche: 0, vol: 0, ko: 0, dormir: 0, nage: 0 };
    this.cadence = 6.5; // vitesse des pas
    this.flash = 0;
    this.flashCouleur = new T.Color(1, 0.2, 0.1);
    this.particules = new Particules(rig);
    this.vitesse = 1;
  }

  // Lance une action ponctuelle. surImpact est appelé au moment du coup (attaque).
  jouer(nom, opts = {}) {
    if (BOUCLES.includes(nom)) { this.boucle = nom; return; }
    // Une action interrompue déclenche quand même ses rappels (sinon un combat pourrait rester bloqué)
    if (this.action) {
      const imp = this.action === "attaque" && !this.impactFait ? this.surImpact : null, fin = this.surFin;
      this.surImpact = null; this.surFin = null; this.impactFait = true;
      imp && imp(); fin && fin();
    }
    this.action = nom;
    this.p = 0;
    this.duree = (DUREES[nom] || 1) / (opts.vitesse || 1);
    this.surImpact = opts.surImpact || null;
    this.surFin = opts.surFin || null;
    this.style = opts.style || null;
    this.impactFait = false;
    if (nom === "coup") this.flash = 1;
  }

  update(dt) {
    const r = this.rig;
    this.t += dt;
    const t = this.t;
    for (const k of Object.keys(this.poids)) this.poids[k] += ((this.boucle === k ? 1 : 0) - this.poids[k]) * (1 - Math.exp(-5 * dt));
    const wM = this.poids.marche, wV = this.poids.vol, wK = this.poids.ko, wD = this.poids.dormir, wN = this.poids.nage;
    let p = 0, a = this.action;
    if (a) {
      this.p += dt / this.duree;
      p = Math.min(1, this.p);
      if (a === "attaque" && !this.impactFait && p >= 0.45) { this.impactFait = true; this.surImpact && this.surImpact(); }
      if (this.p >= 1) { const f = this.surFin; this.action = null; a = null; f && f(); }
    }
    const e = r.ech;
    // ----- Corps -----
    const pivot = r.pivot;
    let px = 0, py = 0, pz = 0, rx = 0, rz = 0, tourne = null, patteAv = 0;
    const souffle = Math.sin(t * (2.1 - wD * 1.2)) * (0.018 + wD * 0.02);
    r.tronc.scale.set(1 + souffle, 1 + souffle * 1.3, 1);
    // Vol
    py += wV * (0.55 * e + Math.sin(t * 3.2) * 0.07 * e + 0.3);
    rx += wV * -0.08;
    // Marche
    this.phasePas = (this.phasePas || 0) + dt * this.cadence;
    const w = this.phasePas;
    py += wM * Math.abs(Math.sin(w)) * 0.03 * e;
    // Nage : le corps ondule, léger roulis
    rz += wN * Math.sin(t * 1.6) * 0.06;
    rx += wN * Math.sin(t * 2.1) * 0.04;
    // Sommeil : couché, la tête posée
    py -= wD * r.hauteur * 0.32;
    // KO
    rz += wK * 1.4;
    py -= wK * r.hauteur * 0.45;
    // Actions
    let ouv = 0.04 + Math.max(0, Math.sin(t * 0.7)) * 0.03; // mâchoire
    let couX = wD * 0.55, teteX = wD * 0.35, teteY = Math.sin(t * 0.37) * 0.22 * (1 - wK) * (1 - wD), ailesOuv = 0, battre = 0;
    ouv *= 1 - wD;
    // Petit battement d'ailes de temps en temps, même au repos
    const frisson = Math.pow(Math.max(0, Math.sin(t * 0.45 + r.ech * 7)), 30) * (1 - wD) * (1 - wK);
    battre += frisson * 0.6;
    if (a === "attaque" && this.style && this.style !== "morsure") {
      // Chaque famille de postures a son propre geste
      const st = this.style;
      const recul = lisse(Math.min(1, p / 0.35)) * (1 - lisse(Math.max(0, (p - 0.35) / 0.15)));
      if (st === "souffle") {
        const long = cloche(p, 0.3, 1);
        rx += -0.12 * recul + 0.06 * long; couX += -0.6 * recul + 0.22 * long; teteX += -0.35 * recul + 0.12 * long;
        ouv += 0.3 * recul + 1.0 * long; ailesOuv += cloche(p, 0, 1) * 1.0; teteY *= 1 - cloche(p, 0, 1); py += cloche(p, 0, 1) * 0.06 * e;
      } else if (st === "griffe") {
        const leve = cloche(p, 0, 0.5), frappe = cloche(p, 0.38, 0.8);
        rx += -0.38 * leve + 0.28 * frappe; py += leve * 0.32 * e; pz += frappe * 0.35 * e; rz += Math.sin(p * Math.PI * 2) * 0.2 * frappe;
        couX += -0.2 * leve + 0.35 * frappe; teteX += 0.15 * frappe; ouv += 0.45 * frappe; ailesOuv += leve * 1.1;
        patteAv = -1.1 * leve + 0.6 * frappe;
      } else if (st === "charge") {
        const baisse = cloche(p, 0, 0.75), choc = cloche(p, 0.35, 0.7);
        rx += 0.2 * baisse; couX += 0.5 * baisse; teteX += 0.3 * baisse; pz += choc * 0.5 * e; py -= baisse * 0.05 * e;
        ailesOuv += 0.35 * baisse; ouv += 0.25 * choc; teteY *= 1 - baisse;
      } else if (st === "tourbillon") {
        const c = cloche(p, 0, 1);
        tourne = lisse(Math.min(1, Math.max(0, (p - 0.08) / 0.62))) * Math.PI * 2;
        py += c * 0.28 * e; ailesOuv += c * 1.2; battre += c * 0.5; ouv += c * 0.45; teteY *= 1 - c;
      } else if (st === "pluie") {
        const c = cloche(p, 0, 1);
        rx -= c * 0.32; couX -= c * 0.75; teteX -= c * 0.6; ouv += c * 1.0; ailesOuv += c * 1.25; py += c * 0.22 * e; teteY *= 1 - c;
        patteAv = -0.5 * c;
      } else if (st === "onde") {
        const ramasse = cloche(p, 0, 0.45), pulse = cloche(p, 0.4, 0.8);
        py += -ramasse * 0.12 * e + pulse * 0.16 * e; ailesOuv += ramasse * 0.2 + pulse * 1.5; couX -= pulse * 0.3;
        ouv += pulse * 0.7; rx -= pulse * 0.1; battre += pulse * 0.5;
      }
    } else if (a === "parade") {
      // Se ramasse derrière ses ailes, tête rentrée
      const c = cloche(p, 0, 1);
      py -= c * 0.09 * e; rx += c * 0.12; couX += c * 0.4; teteX += c * 0.3; ailesOuv += c * 0.9; ouv += c * 0.12; teteY *= 1 - c;
    } else if (a === "esquive") {
      // Pas de côté rapide, roulis, puis retour
      const c = cloche(p, 0.1, 0.8), sens = this.sens || 1;
      px += c * 0.9 * e * sens; rz -= c * 0.35 * sens; py += c * 0.14 * e; battre += c * 0.6; teteY += c * 0.3 * sens;
    } else if (a === "attaque") {
      const recul = lisse(Math.min(1, p / 0.35)) * (1 - lisse(Math.max(0, (p - 0.35) / 0.15)));
      const elan = cloche(p, 0.35, 0.85);
      rx += -0.22 * recul + 0.18 * elan;
      pz += elan * 0.45 * e;
      couX += -0.35 * recul + 0.3 * elan;
      teteX += -0.2 * recul + 0.15 * elan;
      ouv += 0.25 * recul + 0.75 * cloche(p, 0.3, 0.8);
      ailesOuv += cloche(p, 0, 1) * 0.8;
      teteY *= 1 - cloche(p, 0, 1);
    } else if (a === "coup") {
      const c = cloche(p, 0, 1);
      pz -= c * 0.25 * e; rx += c * 0.18; rz += Math.sin(p * 30) * 0.05 * c;
      ouv += c * 0.35; teteX += c * 0.25;
    } else if (a === "rugir") {
      const c = cloche(p, 0.05, 0.95);
      couX -= c * 0.45; teteX -= c * 0.45; ouv += c * 0.95; ailesOuv += c; rx -= c * 0.12;
      rz += Math.sin(t * 40) * 0.012 * c; teteY *= 1 - c;
    } else if (a === "joie") {
      py += (Math.abs(Math.sin(p * Math.PI * 2))) * 0.28 * e * (1 - p * 0.3);
      battre += cloche(p, 0, 1); ouv += cloche(p, 0, 1) * 0.4; teteX -= cloche(p, 0, 1) * 0.2;
    } else if (a === "manger") {
      const c = cloche(p, 0, 1);
      const pique = Math.abs(Math.sin(p * Math.PI * 3));
      couX += c * 0.55 + pique * 0.25 * c; teteX += c * 0.4; ouv += (1 - pique) * 0.35 * c; teteY *= 1 - c;
    } else if (a === "jouer") {
      // Courbette (avant bas, arrière haut) puis bond
      const c1 = cloche(p, 0, 0.55), c2 = cloche(p, 0.5, 1);
      rx += c1 * 0.22; py += c2 * 0.35 * e; pz += c2 * 0.25 * e; couX += c1 * 0.25 - c2 * 0.2; ouv += c2 * 0.4; battre += c2 * 0.8;
      teteY += Math.sin(p * 18) * 0.15 * c1;
    } else if (a === "renifler") {
      const c = cloche(p, 0, 1);
      couX += c * 0.7 + Math.sin(p * Math.PI * 10) * 0.04 * c; teteX += c * 0.45; teteY = Math.sin(p * Math.PI * 2) * 0.4 * c;
    } else if (a === "etirer") {
      const c = cloche(p, 0, 1);
      rx += c * 0.18; couX -= c * 0.35; teteX -= c * 0.25; ailesOuv += c * 1.1; ouv += cloche(p, 0.3, 0.8) * 0.9;
    } else if (a === "secouer") {
      const c = cloche(p, 0, 1);
      rz += Math.sin(p * 45) * 0.1 * c; teteY += Math.sin(p * 35) * 0.45 * c; battre += c * 0.5;
    } else if (a === "regarder") {
      const c = cloche(p, 0, 1);
      teteY = Math.sin(p * Math.PI * 2) * 0.85 * c; couX -= c * 0.15; teteX -= c * 0.1;
    } else if (a === "creuser") {
      // Coup de tête et de griffes vers le sol (récolte)
      const leve = cloche(p, 0, 0.45), frappe = cloche(p, 0.4, 0.8);
      rx += -0.12 * leve + 0.2 * frappe; couX += -0.25 * leve + 0.75 * frappe; teteX += 0.45 * frappe; ouv += 0.5 * frappe;
      pz += frappe * 0.12 * e;
    } else if (a === "bailler") {
      const c = cloche(p, 0, 1);
      couX -= c * 0.3; teteX -= c * 0.35; ouv += c * 1.0;
    } else if (a === "entree") {
      const q = 1 - lisse(p);
      py += q * 3.2 * Math.max(1, e); battre += q; pz -= q * 1.2;
    } else if (a === "sortie") {
      const q = lisse(p);
      py += q * 4; battre += 1; pz -= q * 2;
    } else if (a === "evolution") {
      const c = cloche(p, 0, 1);
      py += c * 0.6 * e; ailesOuv += c; ouv += c * 0.6; couX -= c * 0.4;
      pivot.rotation.y = lisse(p) * Math.PI * 2;
      this.flash = Math.max(this.flash, c * 0.9); this.flashCouleur.set(0xffffff);
    }
    if (tourne !== null) pivot.rotation.y = tourne % (Math.PI * 2);
    else if (a !== "evolution") pivot.rotation.y *= 0.9;
    pivot.position.set(px, py, pz);
    pivot.rotation.x = rx;
    pivot.rotation.z = rz;

    // ----- Cou et tête -----
    r.baseCou.rotation.x = -r.angleCou + couX * 0.6 + wK * 0.5;
    r.cou.forEach((s, i) => {
      s.rotation.x = s.userData.base + Math.sin(t * 1.1 + i * 0.7) * 0.03 + couX * 0.15;
      s.rotation.y = Math.sin(t * 0.5 + i * 0.4) * 0.07 * (1 - wK);
    });
    if (r.tete) {
      r.tete.rotation.x = r.teteBase + Math.sin(t * 0.8) * 0.05 + teteX;
      r.tete.rotation.y = teteY;
    }
    if (r.machoire) r.machoire.rotation.x = Math.min(0.75, ouv);
    if (r.secondeMachoire) { const sm = r.secondeMachoire; if (sm.userData.z0 === undefined) sm.userData.z0 = sm.position.z; sm.position.z = sm.userData.z0 + ouv * 0.12 * r.ech; }
    // Clignement
    const cligne = (t % 4.3) < 0.12 || wK > 0.5 || wD > 0.5;
    for (const y of r.yeux || []) y.scale.y = cligne ? 0.15 : 1;
    for (const o of r.oreilles) o.rotation.x = (o.userData.rx0 ?? (o.userData.rx0 = o.rotation.x)) + Math.sin(t * 2.3) * 0.06;

    // ----- Queue -----
    const n = r.queue.length;
    r.queue.forEach((s, i) => {
      const amp = (0.06 + (i / n) * 0.12) * (1 - wK * 0.8) * (1 + wM * 0.5 + wN * 1.8);
      const fouet = a === "jouer" ? 2.5 : 1;
      s.rotation.y = (s.userData.baseY || 0) * (1 - wV) + Math.sin(t * 1.8 * fouet - i * 0.6) * amp + wD * 0.18;
      s.rotation.x = s.userData.base * (1 - wV * 0.7) + Math.sin(t * 1.2 - i * 0.5) * 0.03;
    });

    // ----- Pattes -----
    for (const pt of r.pattes) {
      const off = (pt.avant ? 0 : Math.PI) + (pt.cote > 0 ? 0 : Math.PI);
      const s = Math.sin(w + off);
      const brasse = wN * Math.sin(t * 3 + off) * 0.35;
      pt.haut.rotation.x = pt.base[0] + (pt.avant ? patteAv : 0) + wM * s * 0.5 + (wV + wN * 0.8) * (pt.avant ? -0.6 : 0.9) + wD * (pt.avant ? -0.9 : 0.6) + brasse;
      pt.genou.rotation.x = pt.base[1] - wM * Math.max(0, -s) * 0.6 + wV * (pt.avant ? 0.9 : -0.4) + wD * (pt.avant ? 1.2 : -0.9);
      pt.cheville.rotation.x = pt.base[2] + wV * 0.6;
      pt.haut.rotation.z = wK * pt.cote * 0.3;
    }

    // ----- Ailes -----
    const ft = t * (r.gn.ailes.rapide ? 14 : 6.5);
    for (const al of r.ailes) {
      const cs = al.cote;
      const vol = Math.max(wV, battre);
      const repli = Math.max(0, 1 - vol - ailesOuv);
      const flap = Math.sin(ft + al.decal * 0.8);
      // Repos : ailes détendues, à moitié ouvertes, qui respirent doucement.
      // Ouvert : bien déployées. Vol : battement. Sommeil : rabattues sur le corps.
      const ouvert = Math.min(1, ailesOuv) * (1 - vol);
      const lent = Math.sin(t * 1.25 + al.decal) * 0.07;
      const ry = repli * (0.62 + wD * 0.5) + ouvert * 0.12 + vol * 0.15;
      const rzv = repli * (0.42 + lent - wD * 0.3) + ouvert * 0.62 + vol * (0.2 + flap * 0.78);
      al.racine.rotation.set(-0.06 * repli, cs * ry, cs * rzv);
      const cy = repli * (1.05 + wD * 0.9 + lent * 0.5) + ouvert * 0.2 + vol * 0.15;
      const cz = repli * (0.1 + lent * 0.7) + ouvert * 0.05 + vol * Math.sin(ft - 0.9 + al.decal) * 0.45;
      al.coude.rotation.set(0, cy, cz);
    }

    // ----- Effets -----
    for (let i = 0; i < r.flammes.length; i++) {
      const f = r.flammes[i];
      const k = 1 + Math.sin(t * 13 + i * 1.7) * 0.15 + Math.sin(t * 7.3 + i) * 0.08;
      f.scale.set(1 / Math.sqrt(k), k, 1 / Math.sqrt(k));
    }
    if (r.m.aileFlamme) r.m.aileFlamme.emissiveIntensity = 0.45 + Math.sin(t * 9) * 0.12;
    for (const o of r.tournants) o.o.rotation[o.axe] += o.v * dt;
    for (const f of r.flotteurs) {
      const o = f.o;
      if (f.type === "orbite") {
        const ang = t * f.v + f.phase;
        o.position.set(Math.cos(ang) * f.rayon, f.h + Math.sin(t * 1.7 + f.phase) * 0.05, Math.sin(ang) * f.rayon);
        o.rotation.y = -ang; o.rotation.x += dt * 2;
        if (f.oriente) o.rotation.set(0, -ang, 0);
      } else if (f.type === "pulse") {
        const k = 1 + Math.sin(t * 3) * 0.08; o.scale.setScalar(k);
      } else if (f.type === "courant") {
        o.position.z = Math.sin(t * 1.5) * r.dims.demiL * 0.25; o.rotation.z += dt;
      } else if (f.type === "souffle") {
        o.scale.y = 1 + Math.max(0, Math.sin(t * 2.1)) * 0.25;
      } else if (f.type === "vague") {
        o.rotation.z = 0.15 + Math.sin(t * 1.2) * 0.12; o.scale.setScalar(1 + Math.sin(t * 1.7) * 0.04);
      } else if (f.type === "anneau") {
        const k = (t * 0.5) % 1; o.scale.setScalar(0.7 + k * 0.6); o.material.opacity = 0.6 * (1 - k);
      } else if (f.type === "aurore") {
        const pos = o.geometry.attributes.position;
        if (!o.userData.y0) o.userData.y0 = Array.from({ length: pos.count }, (_, i) => pos.getZ(i));
        for (let i = 0; i < pos.count; i++) pos.setZ(i, Math.sin(t * 1.5 + pos.getX(i) * 3) * 0.12);
        pos.needsUpdate = true;
      } else if (f.type === "fumee") {
        if (Math.random() < dt * 5) this.particules.emettre("fumee", o);
      }
    }
    if (r.cape) {
      const pos = r.cape.geometry.attributes.position, b = r.cape.userData.base;
      for (let i = 0; i < pos.count; i++) {
        const y = b[i * 3 + 1];
        pos.setZ(i, b[i * 3 + 2] + Math.sin(t * 2.5 + y * 4) * 0.03 * (0.5 - y / (r.dims.demiL * 1.4)) * (1 + wV * 3));
      }
      pos.needsUpdate = true;
    }
    // Flash quand on est touché
    if (this.flash > 0) {
      this.flash = Math.max(0, this.flash - dt * 2.5);
      r.m.corps.emissive.copy(this.flashCouleur).multiplyScalar(this.flash * 0.8);
    } else if (r.m.corps.emissive.r || r.m.corps.emissive.g) {
      r.m.corps.emissive.setRGB(0, 0, 0); this.flashCouleur.setRGB(1, 0.2, 0.1);
    }
    this.particules.update(dt, wK);
  }
}

// ---------- Particules ----------
const GEOS = {};
function geo(nom) {
  if (GEOS[nom]) return GEOS[nom];
  const g = {
    tetra: new T.TetrahedronGeometry(1, 0),
    octa: new T.OctahedronGeometry(1, 0),
    ico: new T.IcosahedronGeometry(1, 0),
  }[nom];
  GEOS[nom] = g;
  return g;
}

const TYPES = {
  braises: { geo: "tetra", col: 0xff8a2a, e: true, taux: 6, vie: 1.6, taille: 0.035, vy: 0.6, dispersion: 0.6 },
  cendres: { geo: "tetra", col: 0x2a2220, taux: 8, vie: 2, taille: 0.04, vy: 0.5, dispersion: 0.9 },
  etincelles: { geo: "octa", col: 0xfff0a0, e: true, taux: 5, vie: 1.0, taille: 0.025, vy: 0.4, dispersion: 0.8 },
  etincelles_eau: { geo: "octa", col: 0xf0ff6a, e: true, taux: 5, vie: 0.6, taille: 0.025, vy: 0.1, dispersion: 0.9 },
  flocons: { geo: "octa", col: 0xffffff, e: true, taux: 5, vie: 2.4, taille: 0.03, vy: -0.25, dispersion: 1.1, haut: true },
  bulles: { geo: "ico", col: 0xbff4ff, o: 0.55, taux: 4, vie: 2.2, taille: 0.04, vy: 0.45, dispersion: 0.8 },
  gouttes: { geo: "ico", col: 0x7fe0ff, o: 0.75, taux: 4, vie: 0.9, taille: 0.025, vy: -0.8, dispersion: 0.6 },
  fumee: { geo: "ico", col: 0x6a625e, o: 0.45, taux: 3, vie: 2.2, taille: 0.09, vy: 0.4, dispersion: 0.3, grossit: 2.2 },
  brume: { geo: "ico", col: 0xe0f4ff, o: 0.3, taux: 3, vie: 2.4, taille: 0.12, vy: 0.08, dispersion: 0.7, grossit: 1.8 },
  brouillard: { geo: "ico", col: 0xe8f6ff, o: 0.25, taux: 5, vie: 3, taille: 0.18, vy: 0.02, dispersion: 1.4, sol: true, grossit: 1.6 },
};
const ALIAS = { manteau_fumee: "fumee", vapeur: "fumee", ecume: "bulles", ruissellement: "gouttes", traces_givre: "brume", trainee: "etincelles", liquide: "gouttes", souffle_visible: "brume" };

class Particules {
  constructor(rig) {
    this.rig = rig;
    this.groupe = new T.Group();
    rig.racine.add(this.groupe);
    this.liste = [];
    this.types = [rig.particules, ...(rig.particulesExtra || []).map((x) => ALIAS[x] || x)].filter((x) => x && TYPES[x]);
    this.acc = {};
    this.mats = {};
  }
  materiau(nom) {
    if (this.mats[nom]) return this.mats[nom];
    const ty = TYPES[nom];
    const m = ty.e ? mat(ty.col, { e: ty.col, ei: 1.2, o: ty.o ?? 0.95 }) : mat(ty.col, { o: ty.o ?? 1 });
    this.mats[nom] = m;
    return m;
  }
  emettre(nom, depuis) {
    const ty = TYPES[nom];
    if (!ty || this.liste.length > 40) return;
    const r = this.rig, d = r.dims;
    const m = new T.Mesh(geo(ty.geo), this.materiau(nom));
    const s = ty.taille * Math.max(0.6, r.ech);
    m.scale.setScalar(s);
    if (depuis) {
      depuis.getWorldPosition(m.position); r.racine.worldToLocal(m.position);
    } else {
      m.position.set((Math.random() - 0.5) * d.demiT * 2 * ty.dispersion, ty.sol ? 0.05 : ty.haut ? r.hauteur + d.demiH * 2.5 : r.hauteur + (Math.random() - 0.3) * d.demiH * 1.6, (Math.random() - 0.5) * d.demiL * 2 * ty.dispersion);
    }
    m.userData = { vie: 0, max: ty.vie * (0.7 + Math.random() * 0.6), v: new T.Vector3((Math.random() - 0.5) * 0.2, ty.vy * (0.7 + Math.random() * 0.6), (Math.random() - 0.5) * 0.2), s, ty };
    this.groupe.add(m);
    this.liste.push(m);
  }
  update(dt, ko) {
    for (const nom of this.types) {
      this.acc[nom] = (this.acc[nom] || 0) + dt * TYPES[nom].taux * (ko > 0.5 ? 0.2 : 1);
      while (this.acc[nom] > 1) { this.acc[nom] -= 1; this.emettre(nom); }
    }
    for (let i = this.liste.length - 1; i >= 0; i--) {
      const m = this.liste[i], u = m.userData;
      u.vie += dt;
      const k = u.vie / u.max;
      if (k >= 1) { this.groupe.remove(m); this.liste.splice(i, 1); continue; }
      m.position.addScaledVector(u.v, dt);
      m.rotation.x += dt * 2; m.rotation.y += dt * 1.5;
      const g = u.ty.grossit ? 1 + k * (u.ty.grossit - 1) : 1;
      m.scale.setScalar(u.s * g * (k < 0.15 ? k / 0.15 : k > 0.7 ? (1 - k) / 0.3 : 1));
    }
  }
}
