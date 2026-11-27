// Moteur 3D : un seul rendu WebGL pour tout le jeu, on change juste de « décor ».
const T = window.THREE;

export class Moteur {
  constructor(canvas) {
    this.canvas = canvas;
    let r;
    try {
      r = new T.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
    } catch (e) {
      this.erreur = e; return;
    }
    r.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    // Couleurs affichées telles qu'écrites dans les génomes (pas de correction gamma).
    r.outputEncoding = T.LinearEncoding;
    r.toneMapping = T.NoToneMapping;
    r.shadowMap.enabled = true;
    r.shadowMap.type = T.PCFSoftShadowMap;
    this.r = r;
    this.horloge = new T.Clock();
    this.decor = null;
    this.zone = null; // partie de l'écran où l'action doit être centrée {x, y, l, h} en fractions
    this.taille();
    window.addEventListener("resize", () => this.taille());
    const boucle = () => {
      requestAnimationFrame(boucle);
      const dt = Math.min(0.05, this.horloge.getDelta());
      if (!this.decor) return;
      try { this.decor.update && this.decor.update(dt); } catch (e) { console.error(e); }
      this.r.render(this.decor.scene, this.decor.camera);
    };
    boucle();
  }
  taille() {
    if (!this.r) return;
    const l = window.innerWidth, h = window.innerHeight;
    this.r.setSize(l, h, false);
    this.canvas.style.width = l + "px"; this.canvas.style.height = h + "px";
    if (this.decor) this.cadrer(this.decor.camera);
  }
  cadrer(cam) {
    const l = window.innerWidth, h = window.innerHeight;
    cam.aspect = l / h;
    const z = this.zone;
    if (z) {
      // Décale le centre de l'image vers la zone visible (le reste est couvert par l'interface)
      const cx = (z.x + z.l / 2) * l, cy = (z.y + z.h / 2) * h;
      cam.setViewOffset(l, h, l / 2 - cx, h / 2 - cy, l, h);
    } else cam.clearViewOffset();
    cam.updateProjectionMatrix();
  }
  // Graphismes : « basse » (sans ombres, image plus légère), « moyenne », « haute »
  regler(q) {
    if (!this.r) return;
    const dpr = window.devicePixelRatio || 1;
    this.qualite = q;
    this.r.setPixelRatio(q === "basse" ? Math.min(dpr, 1) : q === "moyenne" ? Math.min(dpr, 1.5) : Math.min(dpr, 2));
    this.r.shadowMap.enabled = q !== "basse";
    this.r.shadowMap.type = q === "haute" ? T.PCFSoftShadowMap : T.PCFShadowMap;
    this.taille();
    if (this.decor) this.rafraichirMateriaux(this.decor);
  }
  rafraichirMateriaux(decor) {
    decor._qualite = this.qualite;
    decor.scene.traverse((o) => { if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => { m.needsUpdate = true; }); });
  }
  montrer(decor, zone = null) {
    if (this.qualite && decor._qualite !== this.qualite) this.rafraichirMateriaux(decor);
    if (this.decor && this.decor !== decor && this.decor.cacher) this.decor.cacher();
    if (this.decor && this.decor.orbite) this.decor.orbite.actif = false;
    this.decor = decor;
    if (decor.orbite) { decor.orbite.actif = true; decor.orbite.pointeurs.clear(); }
    this.zone = zone;
    this.cadrer(decor.camera);
    decor.montrer && decor.montrer();
  }
  definirZone(zone) { this.zone = zone; if (this.decor) this.cadrer(this.decor.camera); }
}

// Dôme de ciel en dégradé.
export function ciel(haut, milieu, bas, rayon = 120) {
  const g = new T.SphereGeometry(rayon, 24, 12);
  const m = new T.ShaderMaterial({
    side: T.BackSide, depthWrite: false, fog: false,
    uniforms: { cH: { value: new T.Color(haut) }, cM: { value: new T.Color(milieu) }, cB: { value: new T.Color(bas) } },
    vertexShader: "varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }",
    fragmentShader: "uniform vec3 cH; uniform vec3 cM; uniform vec3 cB; varying vec3 vP; void main(){ float y = vP.y; vec3 c = y > 0.0 ? mix(cM, cH, pow(y, 0.6)) : mix(cM, cB, pow(-y, 0.5)); gl_FragColor = vec4(c, 1.0); }",
  });
  const s = new T.Mesh(g, m);
  s.userData.ciel = true;
  s.setColors = (a, b, c) => { m.uniforms.cH.value.set(a); m.uniforms.cM.value.set(b); m.uniforms.cB.value.set(c); };
  return s;
}

export function eclairage(scene, o = {}) {
  // Lumière volontairement douce (ambiance sombre et sauvage)
  const doux = 0.8;
  const hemi = new T.HemisphereLight(o.ciel ?? 0xbfd8ff, o.sol ?? 0x3a2a20, (o.hemi ?? 0.65) * doux);
  scene.add(hemi);
  const soleil = new T.DirectionalLight(o.soleil ?? 0xfff0d8, (o.force ?? 1.5) * doux);
  soleil.position.set(o.x ?? 5, o.y ?? 9, o.z ?? 4);
  soleil.castShadow = true;
  const s = o.zoneOmbre ?? 6;
  soleil.shadow.camera.left = -s; soleil.shadow.camera.right = s;
  soleil.shadow.camera.top = s; soleil.shadow.camera.bottom = -s;
  soleil.shadow.camera.near = 0.5; soleil.shadow.camera.far = 40;
  soleil.shadow.mapSize.set(o.carte ?? 1024, o.carte ?? 1024);
  soleil.shadow.bias = -0.0008;
  soleil.shadow.normalBias = 0.02;
  scene.add(soleil);
  scene.add(soleil.target);
  const contre = new T.DirectionalLight(o.contre ?? 0x8ab8ff, (o.forceContre ?? 0.45) * doux);
  contre.position.set(-4, 3, -6);
  scene.add(contre);
  return { hemi, soleil, contre };
}

// Caméra orbitale : glisser pour tourner, molette ou pincement pour zoomer,
// deux doigts (ou clic droit / Maj + glisser) pour se déplacer sur la carte.
export class Orbite {
  constructor(camera, dom) {
    this.camera = camera;
    this.cible = new T.Vector3(0, 0.8, 0);
    this.cibleVoulue = this.cible.clone();
    this.theta = 0.6; this.phi = 1.2; this.dist = 5;
    this.thetaV = this.theta; this.phiV = this.phi; this.distV = this.dist;
    this.min = 1.5; this.max = 14; this.phiMin = 0.25; this.phiMax = 1.52;
    this.auto = 0; // rotation automatique
    this.actif = true;
    this.pointeurs = new Map();
    this.bouge = 0;
    this.deplacement = false; // le déplacement libre est permis sur ce décor
    this.limite = null; // { centre: Vector3, rayon }
    this.surDeplacement = null;
    dom.addEventListener("contextmenu", (e) => { if (this.actif && this.deplacement) e.preventDefault(); });
    dom.addEventListener("pointerdown", (e) => {
      if (!this.actif) return;
      this.pointeurs.set(e.pointerId, { x: e.clientX, y: e.clientY, pan: e.button === 2 || e.shiftKey });
      this.bouge = 0;
      try { dom.setPointerCapture && dom.setPointerCapture(e.pointerId); } catch (err) { /* pointeur déjà relâché */ }
    });
    dom.addEventListener("pointermove", (e) => {
      if (!this.actif || !this.pointeurs.has(e.pointerId)) return;
      const p = this.pointeurs.get(e.pointerId);
      const dx = e.clientX - p.x, dy = e.clientY - p.y;
      if (this.pointeurs.size === 1 && p.pan && this.deplacement) {
        this.glisser(dx, dy);
      } else if (this.pointeurs.size === 1) {
        this.thetaV -= dx * 0.008; this.phiV = Math.max(this.phiMin, Math.min(this.phiMax, this.phiV - dy * 0.006));
        this.bouge += Math.abs(dx) + Math.abs(dy);
        this.auto = 0;
      } else if (this.pointeurs.size === 2) {
        const autres = [...this.pointeurs.entries()].filter(([id]) => id !== e.pointerId)[0][1];
        const avant = Math.hypot(p.x - autres.x, p.y - autres.y);
        const apres = Math.hypot(e.clientX - autres.x, e.clientY - autres.y);
        if (avant > 0) this.distV = Math.max(this.min, Math.min(this.max, this.distV * (avant / apres)));
        // Les deux doigts qui glissent ensemble déplacent la vue (le milieu bouge de la moitié du geste)
        if (this.deplacement) this.glisser(dx / 2, dy / 2);
        this.bouge += 10;
      }
      p.x = e.clientX; p.y = e.clientY;
    });
    const fin = (e) => { this.pointeurs.delete(e.pointerId); };
    dom.addEventListener("pointerup", fin);
    dom.addEventListener("pointercancel", fin);
    dom.addEventListener("wheel", (e) => {
      if (!this.actif) return;
      e.preventDefault();
      this.distV = Math.max(this.min, Math.min(this.max, this.distV * (1 + Math.sign(e.deltaY) * 0.1)));
    }, { passive: false });
  }
  glisser(dx, dy) {
    const echelle = (this.dist * 2 * Math.tan((this.camera.fov * Math.PI) / 360)) / window.innerHeight;
    const droite = new T.Vector3(Math.cos(this.theta), 0, -Math.sin(this.theta));
    const avant = new T.Vector3(-Math.sin(this.theta), 0, -Math.cos(this.theta));
    this.cibleVoulue.addScaledVector(droite, -dx * echelle).addScaledVector(avant, dy * echelle);
    if (this.limite) {
      const d = this.cibleVoulue.clone().sub(this.limite.centre).setY(0);
      if (d.length() > this.limite.rayon) { d.setLength(this.limite.rayon); this.cibleVoulue.x = this.limite.centre.x + d.x; this.cibleVoulue.z = this.limite.centre.z + d.z; }
    }
    this.bouge += Math.abs(dx) + Math.abs(dy);
    this.surDeplacement && this.surDeplacement();
  }
  viser(cible, dist, theta, phi) {
    this.cibleVoulue.copy(cible);
    if (dist !== undefined) this.distV = dist;
    if (theta !== undefined) this.thetaV = theta;
    if (phi !== undefined) this.phiV = phi;
  }
  update(dt) {
    // douceur : mouvement de caméra plus lent pendant un moment (la plongée à l'arrivée), qui revient à la normale
    const k = 1 - Math.exp(-(this.douceur || 7) * dt);
    if (this.douceur) { this.douceur += dt * 2; if (this.douceur >= 7) this.douceur = 0; }
    this.thetaV += this.auto * dt;
    this.theta += (this.thetaV - this.theta) * k;
    this.phi += (this.phiV - this.phi) * k;
    this.dist += (this.distV - this.dist) * k;
    this.cible.lerp(this.cibleVoulue, k);
    const c = this.camera;
    c.position.set(
      this.cible.x + this.dist * Math.sin(this.phi) * Math.sin(this.theta),
      this.cible.y + this.dist * Math.cos(this.phi),
      this.cible.z + this.dist * Math.sin(this.phi) * Math.cos(this.theta));
    c.lookAt(this.cible);
  }
}

// Petit sol rond facetté pour présenter un dragon.
export function socle(rayon, couleur, couleur2) {
  const g = new T.CylinderGeometry(rayon, rayon * 1.08, 0.3, 14, 1);
  g.translate(0, -0.15, 0);
  const m = new T.Mesh(g, new T.MeshStandardMaterial({ color: couleur, flatShading: true, roughness: 0.9 }));
  m.receiveShadow = true;
  const bord = new T.Mesh(new T.TorusGeometry(rayon * 1.02, 0.03, 3, 28), new T.MeshStandardMaterial({ color: couleur2, emissive: couleur2, emissiveIntensity: 0.9 }));
  bord.rotation.x = Math.PI / 2; bord.position.y = 0.005;
  m.add(bord);
  m.userData.bord = bord;
  return m;
}

// Projette un point 3D en position écran (pixels), pour placer les chiffres de dégâts.
export function versEcran(v, camera) {
  const p = v.clone().project(camera);
  return { x: (p.x * 0.5 + 0.5) * window.innerWidth, y: (-p.y * 0.5 + 0.5) * window.innerHeight, devant: p.z < 1 };
}
