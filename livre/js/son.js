// Sons et musique de l'audio du navigateur : des sons enregistrés (pack Kenney, licence CC0, dans sons/)
// mélangés à des sons fabriqués en direct. Si un navigateur ne lit pas les fichiers OGG, les sons fabriqués prennent le relais.
let ctx = null, maitre, busEffets, busMusique, reverb, bruitBuf;
let sonActif = true, musiqueActive = true;

export function initAudio() {
  if (ctx) { if (ctx.state === "suspended") ctx.resume(); return; }
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  ctx = new AC();
  maitre = ctx.createGain(); maitre.gain.value = 0.8;
  const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 4;
  maitre.connect(comp); comp.connect(ctx.destination);
  busEffets = ctx.createGain(); busEffets.gain.value = sonActif ? 0.9 : 0; busEffets.connect(maitre);
  busMusique = ctx.createGain(); busMusique.gain.value = musiqueActive ? 0.32 : 0; busMusique.connect(maitre);
  // Réverbération : réponse impulsionnelle générée
  reverb = ctx.createConvolver();
  const n = ctx.sampleRate * 2.6, ir = ctx.createBuffer(2, n, ctx.sampleRate);
  for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 2.6); }
  reverb.buffer = ir;
  chargerSons();
  const rg = ctx.createGain(); rg.gain.value = 0.35; reverb.connect(rg); rg.connect(maitre);
  bruitBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const b = bruitBuf.getChannelData(0); for (let i = 0; i < b.length; i++) b[i] = Math.random() * 2 - 1;
  if (pisteVoulue) Musique.jouer(pisteVoulue);
}
export function reglerSon(son, musique) {
  sonActif = son; musiqueActive = musique;
  if (!ctx) return;
  busEffets.gain.setTargetAtTime(son ? 0.9 : 0, ctx.currentTime, 0.05);
  busMusique.gain.setTargetAtTime(musique ? 0.32 : 0, ctx.currentTime, 0.3);
}

function env(g, t, a, d, pic = 1, fin = 0.0001) {
  g.gain.cancelScheduledValues(t);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(pic, t + a);
  g.gain.exponentialRampToValueAtTime(fin, t + a + d);
}
function osc(type, f, t, duree, vol, dest = busEffets, opts = {}) {
  if (!ctx) return;
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type; o.frequency.setValueAtTime(f, t);
  if (opts.vers) o.frequency.exponentialRampToValueAtTime(opts.vers, t + duree);
  if (opts.detune) o.detune.value = opts.detune;
  env(g, t, opts.a ?? 0.005, duree, vol);
  let sortie = g;
  if (opts.filtre) { const fi = ctx.createBiquadFilter(); fi.type = "lowpass"; fi.frequency.value = opts.filtre; fi.Q.value = opts.q ?? 1; g.connect(fi); sortie = fi; }
  o.connect(g); sortie.connect(dest);
  if (opts.rev) { const s = ctx.createGain(); s.gain.value = opts.rev; sortie.connect(s); s.connect(reverb); }
  o.start(t); o.stop(t + (opts.a ?? 0.005) + duree + 0.05);
}
function bruit(t, duree, vol, type, f0, f1, dest = busEffets, opts = {}) {
  if (!ctx) return;
  const s = ctx.createBufferSource(); s.buffer = bruitBuf; s.loop = true;
  const fi = ctx.createBiquadFilter(); fi.type = type; fi.frequency.setValueAtTime(f0, t); fi.Q.value = opts.q ?? 1;
  if (f1) fi.frequency.exponentialRampToValueAtTime(f1, t + duree);
  const g = ctx.createGain(); env(g, t, opts.a ?? 0.01, duree, vol);
  s.connect(fi); fi.connect(g); g.connect(dest);
  if (opts.rev) { const r = ctx.createGain(); r.gain.value = opts.rev; g.connect(r); r.connect(reverb); }
  s.start(t, Math.random()); s.stop(t + (opts.a ?? 0.01) + duree + 0.05);
}
const T0 = () => (ctx ? ctx.currentTime + 0.01 : 0);

// ---------- Sons enregistrés (Kenney « Impact Sounds » et « RPG Audio », licence CC0) ----------
// nom : nombre de variantes (sons/nom1.ogg, sons/nom2.ogg…). On en tire une au hasard, avec une petite variation de hauteur.
const BANQUE = { bois: 5, planche: 5, pierre: 5, verre: 10, coup: 5, doux: 5, neige: 5, roche: 5, herbe: 5, cloche: 3, pieces: 2, tissu: 4, cuir: 1, hache: 1 };
const tampons = {};
let chargement = null;
function chargerSons() {
  if (chargement || !ctx) return chargement;
  const base = new URL("../sons/", import.meta.url).href;
  const decoder = (b) => new Promise((ok, ko) => { const p = ctx.decodeAudioData(b, ok, ko); if (p && p.catch) p.catch(ko); });
  chargement = Promise.all(Object.entries(BANQUE).flatMap(([k, n]) => Array.from({ length: n }, (_, i) =>
    fetch(`${base}${k}${i + 1}.ogg`).then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(r.status))).then(decoder)
      .then((buf) => { (tampons[k] = tampons[k] || []).push(buf); }).catch(() => { /* format non lu : on garde le son fabriqué */ }))));
  return chargement;
}
export const sonsCharges = () => Object.values(tampons).reduce((s, l) => s + l.length, 0);
// Joue une variante enregistrée ; renvoie false si elle n'est pas (encore) disponible
function ech(k, t, o = {}) {
  const l = tampons[k];
  if (!ctx || !l || !l.length) return false;
  const s = ctx.createBufferSource();
  s.buffer = l[Math.floor(Math.random() * l.length)];
  s.playbackRate.value = (o.vitesse || 1) * (1 + (Math.random() - 0.5) * 2 * (o.varier ?? 0.07));
  const g = ctx.createGain(); g.gain.value = o.vol ?? 0.6;
  let sortie = s;
  if (o.filtre) { const f = ctx.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = o.filtre; s.connect(f); sortie = f; }
  sortie.connect(g); g.connect(busEffets);
  if (o.rev) { const r = ctx.createGain(); r.gain.value = o.rev; g.connect(r); r.connect(reverb); }
  s.start(t);
  return true;
}

export const Son = {
  clic() { const t = T0(); osc("triangle", 900, t, 0.05, 0.12, busEffets, { vers: 600 }); },
  ok() { const t = T0(); osc("triangle", 660, t, 0.08, 0.15); osc("triangle", 990, t + 0.07, 0.12, 0.13, busEffets, { rev: 0.2 }); },
  erreur() { const t = T0(); osc("square", 180, t, 0.12, 0.08, busEffets, { filtre: 900 }); osc("square", 140, t + 0.1, 0.16, 0.08, busEffets, { filtre: 900 }); },
  recolte(type = "bois") {
    const t = T0();
    const vrai = type === "bois" ? ech(Math.random() < 0.6 ? "bois" : "planche", t, { vol: 0.75 }) && (Math.random() < 0.3 ? ech("hache", t + 0.02, { vol: 0.35 }) || true : true)
      : type === "pierre" ? ech("pierre", t, { vol: 0.8, vitesse: 0.9 })
      : type === "cristal" ? ech("verre", t, { vol: 0.55, rev: 0.25 })
      : false;
    if (vrai) { if (type === "pierre") osc("sine", 110, t, 0.15, 0.2, busEffets, { vers: 55 }); }
    else if (type === "bois") { bruit(t, 0.08, 0.5, "bandpass", 1800, 600, busEffets, { q: 2 }); bruit(t + 0.05, 0.15, 0.3, "lowpass", 800); }
    else if (type === "eau") { bruit(t, 0.35, 0.55, "bandpass", 1400, 260, busEffets, { q: 1.2 }); bruit(t + 0.04, 0.12, 0.3, "bandpass", 500, 200, busEffets, { q: 3 }); osc("sine", 300, t, 0.2, 0.12, busEffets, { vers: 900 }); }
    else if (type === "pierre") { bruit(t, 0.12, 0.6, "bandpass", 500, 200, busEffets, { q: 3 }); osc("sine", 120, t, 0.15, 0.3, busEffets, { vers: 60 }); }
    else { osc("sine", 1800, t, 0.4, 0.12, busEffets, { rev: 0.5 }); osc("sine", 2700, t + 0.05, 0.4, 0.08, busEffets, { rev: 0.5 }); }
    osc("triangle", 880, t + 0.12, 0.1, 0.05); osc("triangle", 1320, t + 0.2, 0.15, 0.05);
  },
  seisme() {
    const t = T0();
    bruit(t, 4.2, 0.55, "lowpass", 90, 45, busEffets, { a: 0.4 });
    osc("sine", 38, t, 4.2, 0.35, busEffets, { a: 0.3, vers: 30 });
    for (let i = 0; i < 9; i++) bruit(t + 0.3 + Math.random() * 3.6, 0.12, 0.25, "bandpass", 300 + Math.random() * 500, null, busEffets, { q: 1.2 });
    for (let i = 0; i < 12; i++) ech("pierre", t + 0.2 + Math.random() * 3.8, { vol: 0.35 + Math.random() * 0.3, vitesse: 0.45 + Math.random() * 0.25, filtre: 1600, rev: 0.2 });
  },
  sifflement() { const t = T0(); bruit(t, 1.5, 0.12, "bandpass", 3200, 600, busEffets, { q: 6, a: 0.3, rev: 0.3 }); },
  eclipse() { const t = T0(); [110, 138.6, 164.8].forEach((f, i) => osc("sine", f, t + i * 0.4, 5, 0.06, busEffets, { a: 1.2, rev: 0.8 })); },
  croquer(sorte = "rations") {
    const t = T0();
    const f = sorte === "rations_glace" ? 3200 : sorte === "rations_eau" ? 1400 : sorte === "rations_feu" ? 2400 : 1100;
    for (let i = 0; i < 4; i++) bruit(t + i * 0.035 + Math.random() * 0.02, 0.05, 0.32, "bandpass", f * (0.7 + Math.random() * 0.6), null, busEffets, { q: 2.5 });
    bruit(t, 0.12, 0.18, "lowpass", 500);
    ech("doux", t, { vol: 0.3, vitesse: 1.7 });
  },
  ronron(element = "feu", grave = 0.5) {
    const t = T0(); const f0 = 70 + (1 - grave) * 60;
    osc("sawtooth", f0, t, 0.9, 0.06, busEffets, { filtre: 380, vers: f0 * 0.92 });
    osc("sine", f0 * 2, t + 0.05, 0.8, 0.05);
  },
  joie() { const t = T0(); osc("triangle", 520, t, 0.12, 0.08, busEffets, { vers: 880 }); osc("triangle", 700, t + 0.12, 0.14, 0.07, busEffets, { vers: 1100, rev: 0.2 }); },
  ailes(grave = 0.5) {
    const t = T0();
    for (let i = 0; i < 3; i++) if (!ech("tissu", t + i * 0.26, { vol: 0.75, vitesse: 0.62 - grave * 0.18, filtre: 2200 })) bruit(t + i * 0.22, 0.16, 0.22, "lowpass", 700 - i * 80, 260, busEffets, { a: 0.05 });
    bruit(t, 0.8, 0.08, "lowpass", 300, 120, busEffets, { a: 0.1 });
  },
  atterrir(grave = 0.5) {
    const t = T0();
    ech("cuir", t, { vol: 0.6, vitesse: 0.7 - grave * 0.25 });
    ech("roche", t + 0.03, { vol: 0.35, vitesse: 0.6 });
    osc("sine", 90 - grave * 30, t, 0.2, 0.3, busEffets, { vers: 40 });
  },
  glisse() { const t = T0(); bruit(t, 0.12, 0.12, "bandpass", 1800, 900, busEffets, { q: 1.5 }); },
  pas(sol = "roche", grave = 0.5) { const t = T0(); if (!ech(sol, t, { vol: 0.28 + grave * 0.2, vitesse: 0.85 - grave * 0.3, filtre: 3000 - grave * 1500 })) bruit(t, 0.06, 0.25, "lowpass", 400); },
  // Cri d'un dragon : grave = 0 (petit) à 1 (énorme)
  crier(element = "feu", grave = 0.5) {
    if (!ctx) return;
    const t = T0(), base = 520 - grave * 380, d = 0.5 + grave * 0.6;
    const o = ctx.createOscillator(), o2 = ctx.createOscillator(), g = ctx.createGain(), fi = ctx.createBiquadFilter();
    o.type = "sawtooth"; o2.type = "square";
    o.frequency.setValueAtTime(base * 0.8, t); o.frequency.linearRampToValueAtTime(base * 1.25, t + d * 0.3); o.frequency.exponentialRampToValueAtTime(base * 0.55, t + d);
    o2.frequency.setValueAtTime(base * 0.405, t); o2.frequency.exponentialRampToValueAtTime(base * 0.3, t + d);
    const lfo = ctx.createOscillator(), lg = ctx.createGain(); lfo.frequency.value = 28 + grave * 10; lg.gain.value = base * 0.06; lfo.connect(lg); lg.connect(o.frequency);
    fi.type = "bandpass"; fi.frequency.setValueAtTime(900 + (1 - grave) * 1200, t); fi.frequency.linearRampToValueAtTime(500, t + d); fi.Q.value = 2.5;
    env(g, t, 0.05, d, 0.45);
    o.connect(fi); o2.connect(fi); fi.connect(g); g.connect(busEffets);
    const r = ctx.createGain(); r.gain.value = 0.5; g.connect(r); r.connect(reverb);
    [o, o2, lfo].forEach((x) => { x.start(t); x.stop(t + d + 0.1); });
    bruit(t, d * 0.8, 0.12, "bandpass", element === "glace" ? 3500 : element === "eau" ? 900 : 1600, 400, busEffets, { q: 1.5 });
  },
  souffle(element = "feu") {
    const t = T0();
    if (element === "feu") { bruit(t, 0.7, 0.55, "lowpass", 400, 2600, busEffets, { a: 0.08, rev: 0.3 }); bruit(t + 0.1, 0.5, 0.3, "bandpass", 300, 120); }
    else if (element === "glace") { bruit(t, 0.6, 0.35, "highpass", 2500, 6000, busEffets, { a: 0.05, rev: 0.4 }); for (let i = 0; i < 6; i++) osc("sine", 2000 + Math.random() * 3000, t + i * 0.07, 0.25, 0.05, busEffets, { rev: 0.6 }); }
    else { bruit(t, 0.7, 0.5, "bandpass", 700, 300, busEffets, { a: 0.05, q: 0.8, rev: 0.3 }); for (let i = 0; i < 5; i++) osc("sine", 300 + Math.random() * 500, t + i * 0.08, 0.12, 0.08, busEffets, { vers: 900 + Math.random() * 600 }); }
  },
  impact(element = "feu", fort = false) {
    const t = T0();
    ech(fort ? "coup" : "doux", t, { vol: fort ? 0.85 : 0.65, vitesse: fort ? 0.8 : 1 });
    if (element === "glace") ech("verre", t + 0.02, { vol: 0.4, rev: 0.3 });
    osc("sine", fort ? 110 : 150, t, 0.25, fort ? 0.7 : 0.45, busEffets, { vers: 40 });
    bruit(t, 0.18, fort ? 0.6 : 0.4, "lowpass", 2200, 300);
    if (element === "glace") for (let i = 0; i < 4; i++) osc("triangle", 1800 + i * 700, t + i * 0.02, 0.18, 0.05, busEffets, { rev: 0.5 });
    if (element === "eau") bruit(t, 0.35, 0.3, "bandpass", 1200, 400, busEffets, { q: 2 });
    if (element === "feu") bruit(t, 0.4, 0.25, "highpass", 3000, 1500);
    if (fort) { osc("sawtooth", 880, t + 0.05, 0.25, 0.08, busEffets, { vers: 1760, filtre: 3000 }); }
  },
  craque() { const t = T0(); for (let i = 0; i < 3; i++) bruit(t + i * 0.05, 0.04, 0.4, "bandpass", 2500 + Math.random() * 1500, null, busEffets, { q: 4 }); },
  eclosion() {
    const t = T0();
    bruit(t, 0.35, 0.5, "bandpass", 1800, 500, busEffets, { q: 1.2 });
    [523, 659, 784, 1047, 1319].forEach((f, i) => osc("triangle", f, t + 0.15 + i * 0.09, 0.6, 0.12, busEffets, { rev: 0.6 }));
  },
  victoire() { const t = T0(); [392, 523, 659, 784, 1047].forEach((f, i) => { osc("sawtooth", f, t + i * 0.12, 0.5, 0.08, busEffets, { filtre: 2500, rev: 0.4 }); osc("triangle", f / 2, t + i * 0.12, 0.6, 0.1); }); },
  defaite() { const t = T0(); [392, 349, 311, 262].forEach((f, i) => osc("triangle", f, t + i * 0.22, 0.6, 0.12, busEffets, { rev: 0.5 })); },
  niveau() { const t = T0(); [659, 880, 1175].forEach((f, i) => osc("square", f, t + i * 0.08, 0.2, 0.06, busEffets, { filtre: 3000, rev: 0.3 })); },
  evolution() { const t = T0(); ech("cloche", t, { vol: 0.35, vitesse: 0.8, rev: 0.6, varier: 0 }); for (let i = 0; i < 12; i++) osc("sine", 300 * Math.pow(2, i / 6), t + i * 0.08, 0.5, 0.07, busEffets, { rev: 0.7 }); bruit(t, 1.2, 0.15, "highpass", 2000, 8000, busEffets, { a: 0.6, rev: 0.6 }); },
  achat() { const t = T0(); ech("pieces", t, { vol: 0.7 }); [1047, 1319, 1568, 2093].forEach((f, i) => osc("sine", f, t + 0.08 + i * 0.05, 0.35, 0.06, busEffets, { rev: 0.5 })); },
  portail() {
    if (!ctx) return;
    const t = T0();
    bruit(t, 1.8, 0.35, "bandpass", 200, 3000, busEffets, { a: 0.9, q: 2, rev: 0.6 });
    for (let i = 0; i < 10; i++) osc("sine", 220 * Math.pow(2, i / 4), t + i * 0.11, 0.7, 0.06, busEffets, { rev: 0.8 });
    osc("sine", 55, t, 1.6, 0.4, busEffets, { a: 0.8, vers: 30 });
    bruit(t + 1.45, 0.5, 0.5, "highpass", 1500, 6000, busEffets, { rev: 0.7 });
  },
  tic() { const t = T0(); osc("square", 1200, t, 0.03, 0.04, busEffets, { filtre: 3000 }); },
};

// ---------- Musique générative ----------
const PISTES = {
  iles: { tempo: 72, gamme: [0, 3, 5, 7, 10], racine: 50, accords: [[0, 7, 15, 22], [-4, 3, 10, 19], [-2, 5, 12, 17], [-7, 0, 7, 15]], mesure: 8 },
  couvoir: { tempo: 60, gamme: [0, 2, 5, 7, 9], racine: 55, accords: [[0, 7, 14, 21], [5, 12, 16, 21], [-3, 4, 12, 19], [2, 9, 14, 17]], mesure: 8, cloches: true },
  combat: { tempo: 128, gamme: [0, 3, 5, 7, 8, 10], racine: 45, accords: [[0, 7, 12, 15], [-4, 3, 8, 15], [-2, 5, 10, 14], [-5, 2, 7, 14]], mesure: 4, rythme: true },
  livre: { tempo: 84, gamme: [0, 2, 4, 7, 9], racine: 52, accords: [[0, 7, 16, 23], [-3, 4, 12, 19], [5, 12, 16, 24], [7, 14, 19, 23]], mesure: 8 },
};
let pisteVoulue = null, planif = null, prochaineMesure = 0, pas = 0, pisteCourante = null;
const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

export const Musique = {
  jouer(nom) {
    pisteVoulue = nom;
    if (!ctx) return;
    if (pisteCourante === nom) return;
    pisteCourante = nom;
    clearInterval(planif);
    if (!nom) return;
    const P = PISTES[nom];
    prochaineMesure = ctx.currentTime + 0.1; pas = 0;
    const duree = 60 / P.tempo;
    planif = setInterval(() => {
      while (prochaineMesure < ctx.currentTime + 0.4) {
        jouerTemps(P, pas, prochaineMesure, duree);
        prochaineMesure += duree; pas++;
      }
    }, 100);
  },
};

function jouerTemps(P, n, t, d) {
  const accord = P.accords[Math.floor(n / P.mesure) % P.accords.length];
  const temps = n % P.mesure;
  if (temps === 0) {
    // Nappe
    for (const iv of accord) {
      for (const det of [-8, 8]) osc("sawtooth", mtof(P.racine + iv), t, d * P.mesure * 0.95, 0.025, busMusique, { a: d * 1.5, detune: det, filtre: P.rythme ? 1400 : 900, q: 0.7, rev: 0.4 });
    }
    osc("sine", mtof(P.racine + accord[0] - 12), t, d * P.mesure * 0.9, 0.12, busMusique, { a: 0.3 });
  }
  if (P.rythme) {
    if (temps % 2 === 0) osc("sine", 150, t, 0.18, 0.5, busMusique, { vers: 45 });
    if (temps % 2 === 1) bruit(t, 0.12, 0.22, "highpass", 1800, null, busMusique);
    bruit(t + d / 2, 0.04, 0.08, "highpass", 7000, null, busMusique);
    const b = P.racine + accord[0] - 12 + (temps === 3 ? 7 : 0);
    osc("sawtooth", mtof(b), t, d * 0.45, 0.09, busMusique, { filtre: 700, q: 4 });
    osc("sawtooth", mtof(b), t + d / 2, d * 0.4, 0.06, busMusique, { filtre: 600, q: 4 });
    if (temps === 0 && Math.random() < 0.5) osc("square", mtof(P.racine + accord[2] + 12), t, d * 0.8, 0.035, busMusique, { filtre: 2000, rev: 0.3 });
  }
  // Mélodie au hasard dans la gamme
  if (Math.random() < (P.rythme ? 0.45 : 0.35)) {
    const deg = P.gamme[Math.floor(Math.random() * P.gamme.length)];
    const oct = Math.random() < 0.5 ? 12 : 24;
    const f = mtof(P.racine + deg + oct);
    if (P.cloches) { osc("sine", f, t, 2.2, 0.06, busMusique, { rev: 0.9 }); osc("sine", f * 2.76, t, 1.2, 0.02, busMusique, { rev: 0.9 }); }
    else osc("triangle", f, t + (Math.random() < 0.3 ? d / 2 : 0), d * 1.6, 0.05, busMusique, { rev: 0.6 });
  }
}
