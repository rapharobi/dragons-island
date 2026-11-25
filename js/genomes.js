// L'apparence de chaque dragon, décrite par des réglages.
// `base` vaut pour tous les stades, `st[n]` modifie le stade n (0 = Nouveau-né … 4 = Ascendant).
// Pour ajouter un dragon : copier un bloc, changer les couleurs et les formes.
//
// forme : quadrupede | wyverne (pattes arrière seulement) | serpent (sans pattes) | boule
// tete.style : lezard | massif | fin | rond
// cornes.style : arriere | bouc | couronne | cristaux | oreilles | antennes | crete | aucune
// crete.style : pointes | plaques | cristaux | nageoire | flammes | stalactites | coraux | seracs | rochers | plumes | aucune
// ailes.style : membrane | plumes | nageoire | cristal | flamme | brume | rayons | aucune
// queue.bout : pointe | flamme | lame | nageoire | touffe | cristal | massue | aucune

export const GENOMES = {
  // ---------------- FEU ----------------
  braisil: {
    base: {
      forme: "quadrupede", taille: 1,
      couleurs: { corps: 0xb8361f, ventre: 0xf0a24a, accent: 0x1d1412, lueur: 0xff7a1a, aile: 0xff8a3d, yeux: 0xffc23a },
      corps: { L: 1.5, T: 0.85, H: 0.7 }, cou: { n: 3, long: 0.75, r: 0.24, angle: 0.75 },
      tete: { style: "lezard", taille: 0.5, museau: 1, yeux: 0.085 },
      cornes: { style: "arriere", n: 2, long: 0.45 }, crete: { style: "pointes", n: 9, taille: 0.16 },
      ailes: { style: "membrane", taille: 1.25 }, queue: { n: 7, long: 1.6, r: 0.2, bout: "flamme" },
      pattes: { long: 0.55, r: 0.12 }, particules: "braises",
    },
    st: {
      0: { ailes: { style: "aucune" }, cornes: { style: "aucune" }, tete: { yeux: 0.12 }, crete: { style: "aucune" } },
      1: { crete: { style: "flammes", taille: 0.12 } },
      2: { cornes: { style: "arriere", n: 4 }, ailes: { style: "flamme" }, corps: { L: 1.7 } },
      3: { extras: ["magma"], cornes: { style: "arriere", n: 4, long: 0.6 } },
      4: { extras: ["magma", "aura_chaleur"], cornes: { style: "couronne", n: 7, long: 0.4 }, ailes: { style: "flamme", taille: 1.5 } },
    },
  },
  pyrok: {
    base: {
      forme: "quadrupede", taille: 1.12,
      couleurs: { corps: 0x2b2524, ventre: 0x4a3a33, accent: 0x161010, lueur: 0xff5a10, aile: 0x3a2e2a, yeux: 0xff8a1a },
      corps: { L: 1.6, T: 1.25, H: 1.0 }, cou: { n: 2, long: 0.45, r: 0.36, angle: 0.4 },
      tete: { style: "massif", taille: 0.62, museau: 0.6, yeux: 0.07 },
      cornes: { style: "bouc", n: 2, long: 0.35 }, crete: { style: "rochers", n: 7, taille: 0.22 },
      ailes: { style: "aucune" }, queue: { n: 4, long: 0.9, r: 0.3, bout: "massue" },
      pattes: { long: 0.5, r: 0.22 }, particules: "fumee", extras: ["magma"],
    },
    st: {
      0: { forme: "boule", cornes: { style: "aucune" }, crete: { style: "aucune" }, queue: { n: 2, long: 0.3, bout: "aucune" } },
      1: { extras: ["magma", "vapeur"] },
      2: { extras: ["magma", "cratere"] },
      3: { extras: ["magma", "cratere", "coulees"], pattes: { r: 0.3, long: 0.6 } },
      4: { extras: ["magma", "couronne_cratere", "coulees"], cornes: { style: "couronne", n: 6, long: 0.35 }, particules: "cendres" },
    },
  },
  ignivelle: {
    base: {
      forme: "wyverne", taille: 0.95,
      couleurs: { corps: 0xff7a2a, ventre: 0xffd27a, accent: 0xfff0d0, lueur: 0xffe0a0, aile: 0xffb050, yeux: 0xffffff },
      corps: { L: 1.3, T: 0.6, H: 0.55 }, cou: { n: 4, long: 1.0, r: 0.17, angle: 0.85 },
      tete: { style: "fin", taille: 0.42, museau: 1.35, yeux: 0.07 },
      cornes: { style: "arriere", n: 2, long: 0.55 }, crete: { style: "flammes", n: 10, taille: 0.12 },
      ailes: { style: "flamme", taille: 1.45 }, queue: { n: 9, long: 2.0, r: 0.13, bout: "flamme" },
      pattes: { long: 0.6, r: 0.08 }, particules: "braises",
    },
    st: {
      0: { forme: "quadrupede", ailes: { style: "aucune" }, cornes: { style: "aucune" }, tete: { yeux: 0.1 }, extras: ["plumes_pattes"] },
      1: { ailes: { style: "flamme", taille: 1.1 }, corps: { L: 1.5 } },
      2: { extras: ["flamme_poitrine"] },
      3: { extras: ["flamme_poitrine", "trainee"], ailes: { style: "flamme", paires: 2 }, couleurs: { lueur: 0xbfe4ff } },
      4: { extras: ["flamme_poitrine", "trainee", "translucide"], ailes: { style: "flamme", paires: 2, taille: 1.7 }, couleurs: { corps: 0xfff3dc, lueur: 0xc8e8ff, aile: 0xfffaf0 } },
    },
  },
  cendrak: {
    base: {
      forme: "quadrupede", taille: 0.92,
      couleurs: { corps: 0x5b5653, ventre: 0x34302e, accent: 0x1a1716, lueur: 0xff3a10, aile: 0x403b39, yeux: 0xff2a0a },
      corps: { L: 1.45, T: 0.65, H: 0.55 }, cou: { n: 3, long: 0.6, r: 0.18, angle: 0.4 },
      tete: { style: "fin", taille: 0.47, museau: 1.5, yeux: 0.065, dents: true },
      cornes: { style: "arriere", n: 2, long: 0.3 }, crete: { style: "pointes", n: 12, taille: 0.1 },
      ailes: { style: "membrane", taille: 1.1, dechiree: true }, queue: { n: 8, long: 1.7, r: 0.14, bout: "pointe" },
      pattes: { long: 0.5, r: 0.09 }, particules: "fumee",
    },
    st: {
      0: { ailes: { style: "aucune" }, cornes: { style: "aucune" }, crete: { style: "aucune" }, tete: { museau: 1.1, yeux: 0.09 } },
      2: { extras: ["braises_sous"] },
      3: { extras: ["braises_sous", "manteau_fumee"] },
      4: { extras: ["braises_sous", "manteau_fumee", "yeux_brulants"], couleurs: { corps: 0x2a2726 }, ailes: { taille: 1.4 } },
    },
  },
  solarion: {
    base: {
      forme: "quadrupede", taille: 1.05,
      couleurs: { corps: 0xd9a531, ventre: 0xfbe6a2, accent: 0xfff3c4, lueur: 0xffd23a, aile: 0xffe07a, yeux: 0xfffbe0 },
      corps: { L: 1.55, T: 0.85, H: 0.72 }, cou: { n: 3, long: 0.85, r: 0.22, angle: 0.8 },
      tete: { style: "lezard", taille: 0.5, museau: 0.95, yeux: 0.08 },
      cornes: { style: "arriere", n: 2, long: 0.4 }, crete: { style: "plaques", n: 7, taille: 0.14 },
      ailes: { style: "rayons", taille: 1.5 }, queue: { n: 7, long: 1.5, r: 0.18, bout: "pointe" },
      pattes: { long: 0.55, r: 0.12 }, particules: "etincelles",
    },
    st: {
      0: { couleurs: { corps: 0x9a8350, ventre: 0xc8b68a }, ailes: { style: "membrane", taille: 0.45 }, cornes: { style: "aucune" }, crete: { style: "aucune" }, tete: { yeux: 0.1 }, particules: null },
      1: { couleurs: { corps: 0xc59a3a }, ailes: { style: "membrane", taille: 0.75 }, extras: ["halo"] },
      2: { extras: ["disque"], ailes: { style: "membrane", taille: 1.1 } },
      3: { extras: ["disque"], ailes: { style: "rayons", taille: 1.5 } },
      4: { extras: ["disque_grand", "couronne_plasma"], ailes: { style: "rayons", taille: 1.8 }, cornes: { style: "couronne", n: 8, long: 0.35 } },
    },
  },
  fournaise: {
    base: {
      forme: "quadrupede", taille: 1.05,
      couleurs: { corps: 0x4d5258, ventre: 0xff6a1a, accent: 0x23262a, lueur: 0xff5a10, aile: 0x5c4a40, yeux: 0xffa040 },
      corps: { L: 1.45, T: 1.1, H: 0.9 }, cou: { n: 2, long: 0.45, r: 0.3, angle: 0.5 },
      tete: { style: "massif", taille: 0.55, museau: 0.75, yeux: 0.065 },
      cornes: { style: "bouc", n: 2, long: 0.28 }, crete: { style: "plaques", n: 6, taille: 0.18 },
      ailes: { style: "aucune" }, queue: { n: 5, long: 1.0, r: 0.24, bout: "massue" },
      pattes: { long: 0.48, r: 0.19 }, particules: "fumee", extras: ["ventre_four"],
    },
    st: {
      0: { cornes: { style: "aucune" }, crete: { style: "aucune" }, tete: { yeux: 0.09 } },
      1: { extras: ["ventre_four", "epaulieres"] },
      2: { extras: ["ventre_four", "epaulieres", "soufflets"] },
      3: { extras: ["ventre_four", "epaulieres", "soufflets", "enclume"] },
      4: { extras: ["ventre_four", "epaulieres", "soufflets", "enclume", "cheminees"], ailes: { style: "membrane", taille: 0.9 } },
    },
  },
  micho: {
    base: {
      forme: "quadrupede", taille: 0.82,
      couleurs: { corps: 0xff8a2a, ventre: 0xffe08a, accent: 0xffd23a, lueur: 0xffa020, aile: 0xffb860, yeux: 0x2a1a10 },
      corps: { L: 1.15, T: 0.75, H: 0.68 }, cou: { n: 2, long: 0.4, r: 0.24, angle: 0.7 },
      tete: { style: "rond", taille: 0.56, museau: 0.6, yeux: 0.12 },
      cornes: { style: "oreilles", n: 2, long: 0.42 }, crete: { style: "flammes", n: 5, taille: 0.12 },
      ailes: { style: "membrane", taille: 0.7, rapide: true }, queue: { n: 6, long: 1.2, r: 0.16, bout: "flamme" },
      pattes: { long: 0.45, r: 0.1 }, particules: "braises", extras: ["taches"],
    },
    st: {
      0: { forme: "boule", ailes: { style: "aucune" }, crete: { style: "aucune" }, extras: ["duvet_flamme"] },
      1: { extras: [] },
      2: { extras: ["taches"], queue: { bout: "flamme", r: 0.2 } },
      3: { extras: ["taches", "criniere"], pattes: { long: 0.55, r: 0.08 } },
      4: { extras: ["taches", "criniere"], queue: { n: 9, long: 1.9, r: 0.12 }, ailes: { taille: 0.9 } },
    },
  },

  // ---------------- GLACE ----------------
  givrelin: {
    base: {
      forme: "quadrupede", taille: 1,
      couleurs: { corps: 0x8cc7e8, ventre: 0xe6f6ff, accent: 0xd8f2ff, lueur: 0x9ae8ff, aile: 0xc8ecff, yeux: 0x2a6aff },
      corps: { L: 1.5, T: 0.85, H: 0.7 }, cou: { n: 3, long: 0.78, r: 0.23, angle: 0.75 },
      tete: { style: "lezard", taille: 0.5, museau: 1, yeux: 0.085 },
      cornes: { style: "cristaux", n: 2, long: 0.45 }, crete: { style: "cristaux", n: 8, taille: 0.15 },
      ailes: { style: "membrane", taille: 1.25, translucide: true }, queue: { n: 7, long: 1.6, r: 0.2, bout: "cristal" },
      pattes: { long: 0.55, r: 0.12 }, particules: "flocons",
    },
    st: {
      0: { ailes: { style: "aucune" }, cornes: { style: "aucune" }, crete: { style: "aucune" }, tete: { yeux: 0.12 }, queue: { bout: "pointe" }, extras: ["givre"] },
      1: { cornes: { style: "aucune" }, crete: { style: "aucune" } },
      2: { extras: ["souffle_visible"], crete: { style: "aucune" } },
      3: {},
      4: { extras: ["aurore", "armure_glace"], ailes: { taille: 1.5 } },
    },
  },
  glaciarque: {
    base: {
      forme: "quadrupede", taille: 1.15,
      couleurs: { corps: 0x5f9fc9, ventre: 0xbfe2f5, accent: 0xeaf8ff, lueur: 0x4ad0ff, aile: 0x9fd4f0, yeux: 0x0a3a8a },
      corps: { L: 1.7, T: 1.3, H: 1.0 }, cou: { n: 2, long: 0.5, r: 0.36, angle: 0.4 },
      tete: { style: "massif", taille: 0.6, museau: 0.7, yeux: 0.06 },
      cornes: { style: "bouc", n: 2, long: 0.4 }, crete: { style: "seracs", n: 6, taille: 0.25 },
      ailes: { style: "aucune" }, queue: { n: 4, long: 0.9, r: 0.3, bout: "massue" },
      pattes: { long: 0.5, r: 0.24 }, particules: "flocons",
    },
    st: {
      0: { forme: "boule", cornes: { style: "aucune" }, crete: { style: "aucune" }, queue: { n: 2, long: 0.3, bout: "aucune" }, extras: ["cube"] },
      1: { crete: { style: "aucune" } },
      2: {},
      3: { extras: ["crevasses"] },
      4: { extras: ["crevasses", "icebergs"], particules: "brouillard" },
    },
  },
  stalak: {
    base: {
      forme: "quadrupede", taille: 1.0,
      couleurs: { corps: 0x3e6d8c, ventre: 0x9ccbe0, accent: 0xdff4ff, lueur: 0x7fe0ff, aile: 0x8cc4dc, yeux: 0x6ff0ff },
      corps: { L: 1.3, T: 1.0, H: 0.75 }, cou: { n: 2, long: 0.4, r: 0.24, angle: 0.3 },
      tete: { style: "massif", taille: 0.46, museau: 0.8, yeux: 0.07 },
      cornes: { style: "cristaux", n: 3, long: 0.25 }, crete: { style: "stalactites", n: 14, taille: 0.3 },
      ailes: { style: "aucune" }, queue: { n: 4, long: 0.8, r: 0.2, bout: "cristal" },
      pattes: { long: 0.38, r: 0.17 }, particules: "flocons", extras: ["carapace"],
    },
    st: {
      0: { crete: { style: "stalactites", n: 10, taille: 0.18 }, cornes: { style: "aucune" }, tete: { yeux: 0.09 } },
      1: {},
      2: { extras: ["carapace_dome"] },
      3: { extras: ["carapace_dome"], crete: { style: "stalactites", n: 20, taille: 0.42 } },
      4: { extras: ["carapace_dome", "colonnes"], crete: { style: "stalactites", n: 22, taille: 0.45 } },
    },
  },
  blizzar: {
    base: {
      forme: "wyverne", taille: 0.95,
      couleurs: { corps: 0xeaf4fb, ventre: 0xffffff, accent: 0x8fb8d8, lueur: 0xbfeaff, aile: 0xf4fbff, yeux: 0x2a8cff },
      corps: { L: 1.3, T: 0.6, H: 0.55 }, cou: { n: 3, long: 0.8, r: 0.16, angle: 0.7 },
      tete: { style: "fin", taille: 0.42, museau: 1.25, yeux: 0.07 },
      cornes: { style: "arriere", n: 2, long: 0.5 }, crete: { style: "plumes", n: 8, taille: 0.15 },
      ailes: { style: "plumes", taille: 1.5 }, queue: { n: 8, long: 1.7, r: 0.13, bout: "lame" },
      pattes: { long: 0.6, r: 0.08 }, particules: "flocons", extras: ["tourbillon"],
    },
    st: {
      0: { forme: "quadrupede", ailes: { style: "aucune" }, cornes: { style: "aucune" }, crete: { style: "aucune" }, tete: { yeux: 0.1 } },
      1: { ailes: { style: "plumes", taille: 1.1 } },
      2: { extras: ["tourbillon", "flocons_tranchants"] },
      3: { ailes: { style: "cristal", taille: 1.6 } },
      4: { ailes: { style: "cristal", taille: 1.8 }, extras: ["tourbillon", "flocons_tranchants", "blizzard"] },
    },
  },
  crysalis: {
    base: {
      forme: "quadrupede", taille: 1.08,
      couleurs: { corps: 0x6a6f8c, ventre: 0xa8acc4, accent: 0xc89bff, lueur: 0xb68aff, aile: 0xd6b8ff, yeux: 0xe0c8ff },
      corps: { L: 1.5, T: 1.0, H: 0.8 }, cou: { n: 3, long: 0.6, r: 0.26, angle: 0.6 },
      tete: { style: "lezard", taille: 0.5, museau: 0.85, yeux: 0.075 },
      cornes: { style: "cristaux", n: 5, long: 0.4 }, crete: { style: "cristaux", n: 9, taille: 0.22 },
      ailes: { style: "cristal", taille: 1.6, prisme: true }, queue: { n: 6, long: 1.3, r: 0.22, bout: "cristal" },
      pattes: { long: 0.5, r: 0.15 }, particules: "etincelles",
    },
    st: {
      0: { forme: "boule", couleurs: { corps: 0x7d7f8a }, cornes: { style: "aucune" }, crete: { style: "aucune" }, ailes: { style: "aucune" }, queue: { n: 2, long: 0.3, bout: "aucune" }, particules: null },
      1: { cornes: { style: "cristaux", n: 3, long: 0.25 }, crete: { style: "aucune" }, ailes: { style: "aucune" } },
      2: { extras: ["geode"], ailes: { style: "aucune" } },
      3: { extras: ["geode"] },
      4: { extras: ["geode", "prisme_aura"], ailes: { taille: 2.0 }, crete: { taille: 0.3 }, couleurs: { corps: 0x8c86b8 } },
    },
  },
  frimas: {
    base: {
      forme: "quadrupede", taille: 0.95,
      couleurs: { corps: 0xcfe6f2, ventre: 0xf4fbff, accent: 0xa6d6ee, lueur: 0x5ac8ff, aile: 0xe8f6ff, yeux: 0x1ab0ff },
      corps: { L: 1.4, T: 0.6, H: 0.55 }, cou: { n: 4, long: 1.1, r: 0.15, angle: 0.8 },
      tete: { style: "fin", taille: 0.44, museau: 1.3, yeux: 0.08, dents: true },
      cornes: { style: "antennes", n: 2, long: 0.5 }, crete: { style: "aucune" },
      ailes: { style: "brume", taille: 1.35 }, queue: { n: 8, long: 1.8, r: 0.12, bout: "pointe" },
      pattes: { long: 0.55, r: 0.08 }, particules: "brume", extras: ["translucide"],
    },
    st: {
      0: { ailes: { style: "aucune" }, cou: { long: 0.6 }, cornes: { style: "aucune" } },
      2: { cou: { long: 1.4 } },
      3: { extras: ["translucide", "traces_givre"], cou: { long: 1.4 } },
      4: { extras: ["translucide", "traces_givre", "air_gele"], cou: { long: 1.5 }, ailes: { taille: 1.7 } },
    },
  },
  neve: {
    base: {
      forme: "quadrupede", taille: 0.85,
      couleurs: { corps: 0xf5f8fc, ventre: 0xffffff, accent: 0xffb0c0, lueur: 0xc8ecff, aile: 0xffffff, yeux: 0x24304a },
      corps: { L: 1.2, T: 0.75, H: 0.68 }, cou: { n: 2, long: 0.4, r: 0.24, angle: 0.65 },
      tete: { style: "rond", taille: 0.55, museau: 0.65, yeux: 0.11, nez: 0xff8aa6 },
      cornes: { style: "oreilles", n: 2, long: 0.35 }, crete: { style: "plumes", n: 5, taille: 0.12 },
      ailes: { style: "plumes", taille: 0.75 }, queue: { n: 6, long: 1.2, r: 0.2, bout: "touffe" },
      pattes: { long: 0.45, r: 0.11 }, particules: "flocons", extras: ["fourrure"],
    },
    st: {
      0: { forme: "boule", ailes: { style: "aucune" }, crete: { style: "aucune" }, cornes: { style: "aucune" } },
      1: { cornes: { style: "aucune" } },
      2: { queue: { r: 0.28, long: 1.5 } },
      3: { tete: { style: "renard", museau: 1.0 }, cornes: { style: "oreilles", long: 0.5 }, pattes: { long: 0.6, r: 0.09 } },
      4: { tete: { style: "renard", museau: 1.0 }, cornes: { style: "oreilles", long: 0.55 }, extras: ["fourrure", "flocons_orbite"], ailes: { taille: 1.0 } },
    },
  },

  // ---------------- EAU ----------------
  ondin: {
    base: {
      forme: "quadrupede", taille: 1,
      couleurs: { corps: 0x2c86c9, ventre: 0xa6e6f0, accent: 0x7ff0e0, lueur: 0x5ff0ff, aile: 0x6fd8ff, yeux: 0xffe070 },
      corps: { L: 1.5, T: 0.82, H: 0.68 }, cou: { n: 3, long: 0.8, r: 0.22, angle: 0.75 },
      tete: { style: "lezard", taille: 0.5, museau: 1, yeux: 0.085 },
      cornes: { style: "crete", n: 1, long: 0.4 }, crete: { style: "nageoire", n: 8, taille: 0.18 },
      ailes: { style: "nageoire", taille: 1.3 }, queue: { n: 7, long: 1.7, r: 0.19, bout: "nageoire" },
      pattes: { long: 0.52, r: 0.12 }, particules: "gouttes", extras: ["nageoires_joues"],
    },
    st: {
      0: { ailes: { style: "aucune" }, cornes: { style: "aucune" }, crete: { style: "aucune" }, tete: { yeux: 0.12 } },
      1: { ailes: { style: "nageoire", taille: 0.9 }, cornes: { style: "aucune" } },
      2: {},
      3: { ailes: { taille: 1.6 }, extras: ["nageoires_joues", "ruissellement"] },
      4: { ailes: { taille: 1.7 }, extras: ["nageoires_joues", "ruissellement", "vague"] },
    },
  },
  abyssor: {
    base: {
      forme: "serpent", taille: 1.15,
      couleurs: { corps: 0x152a3e, ventre: 0x2c4c5e, accent: 0x0a1218, lueur: 0x2affd5, aile: 0x1f3c52, yeux: 0x6affea },
      corps: { L: 1.6, T: 1.05, H: 0.9 }, cou: { n: 3, long: 0.7, r: 0.4, angle: 0.55 },
      tete: { style: "massif", taille: 0.66, museau: 1.0, yeux: 0.06, dents: true },
      cornes: { style: "arriere", n: 2, long: 0.3 }, crete: { style: "plaques", n: 9, taille: 0.2 },
      ailes: { style: "aucune" }, queue: { n: 9, long: 2.6, r: 0.36, bout: "nageoire" },
      pattes: { long: 0.3, r: 0.2 }, particules: "bulles", extras: ["lumieres"],
    },
    st: {
      0: { taille: 0.9, crete: { style: "aucune" }, cornes: { style: "aucune" }, tete: { style: "rond", yeux: 0.1 }, queue: { n: 5, long: 1.2 } },
      1: {},
      2: { extras: ["lumieres_fortes"] },
      3: { extras: ["lumieres_fortes", "coquillages"], tete: { taille: 0.8 } },
      4: { extras: ["lumieres_fortes", "coquillages", "gorge_lumineuse"], tete: { taille: 0.85 }, ailes: { style: "nageoire", taille: 1.2 } },
    },
  },
  coralys: {
    base: {
      forme: "quadrupede", taille: 1.05,
      couleurs: { corps: 0x2f7d8a, ventre: 0x9ce0d0, accent: 0xff7aa8, lueur: 0xffa0c8, aile: 0x6cc8c0, yeux: 0xfff080 },
      corps: { L: 1.45, T: 1.1, H: 0.85 }, cou: { n: 2, long: 0.45, r: 0.27, angle: 0.4 },
      tete: { style: "massif", taille: 0.5, museau: 0.8, yeux: 0.07 },
      cornes: { style: "aucune" }, crete: { style: "coraux", n: 8, taille: 0.25 },
      ailes: { style: "aucune" }, queue: { n: 5, long: 1.0, r: 0.24, bout: "nageoire" },
      pattes: { long: 0.42, r: 0.18 }, particules: "bulles", extras: ["carapace_corail"],
    },
    st: {
      0: { crete: { style: "coraux", n: 5, taille: 0.12 }, tete: { yeux: 0.09 }, extras: [] },
      1: {},
      2: { extras: ["carapace_corail", "poissons"] },
      3: { extras: ["carapace_corail", "poissons", "anemones"] },
      4: { extras: ["carapace_corail", "poissons", "anemones", "atoll"] },
    },
  },
  tsunagi: {
    base: {
      forme: "wyverne", taille: 0.95,
      couleurs: { corps: 0x1a6fc0, ventre: 0xd8f6ff, accent: 0xeafcff, lueur: 0x6ff6ff, aile: 0x5ad0ff, yeux: 0xffffff },
      corps: { L: 1.4, T: 0.6, H: 0.55 }, cou: { n: 3, long: 0.85, r: 0.16, angle: 0.7 },
      tete: { style: "fin", taille: 0.42, museau: 1.35, yeux: 0.07 },
      cornes: { style: "crete", n: 1, long: 0.55 }, crete: { style: "nageoire", n: 12, taille: 0.2, tranchante: true },
      ailes: { style: "nageoire", taille: 1.5 }, queue: { n: 8, long: 1.8, r: 0.13, bout: "lame" },
      pattes: { long: 0.6, r: 0.08 }, particules: "gouttes", extras: ["lames_nageoires"],
    },
    st: {
      0: { forme: "quadrupede", ailes: { style: "aucune" }, cornes: { style: "aucune" }, tete: { yeux: 0.1 } },
      1: { ailes: { style: "aucune" } },
      2: { extras: ["lames_nageoires", "ecume"] },
      3: { extras: ["lames_nageoires", "ecume", "liquide"] },
      4: { extras: ["lames_nageoires", "ecume", "liquide", "vague"], ailes: { taille: 1.8 } },
    },
  },
  marenith: {
    base: {
      forme: "quadrupede", taille: 1.02,
      couleurs: { corps: 0xd8dbe6, ventre: 0xfaf4ee, accent: 0xb8c8ff, lueur: 0xd8e4ff, aile: 0xc8d4f0, yeux: 0x3a4aa0 },
      corps: { L: 1.45, T: 0.8, H: 0.66 }, cou: { n: 3, long: 0.8, r: 0.21, angle: 0.75 },
      tete: { style: "lezard", taille: 0.48, museau: 0.9, yeux: 0.09 },
      cornes: { style: "arriere", n: 2, long: 0.35 }, crete: { style: "nageoire", n: 7, taille: 0.14 },
      ailes: { style: "membrane", taille: 1.4, argent: true }, queue: { n: 8, long: 1.9, r: 0.2, bout: "nageoire" },
      pattes: { long: 0.5, r: 0.11 }, particules: "bulles", extras: ["nacre"],
    },
    st: {
      0: { ailes: { style: "aucune" }, cornes: { style: "aucune" }, crete: { style: "aucune" }, tete: { yeux: 0.12 }, queue: { r: 0.26, long: 2.0 } },
      1: { ailes: { style: "aucune" }, cornes: { style: "aucune" } },
      2: { extras: ["nacre", "lune"], ailes: { style: "nageoire", taille: 0.9 } },
      3: { extras: ["nacre", "lune"] },
      4: { extras: ["nacre", "lune_pleine", "maree"], ailes: { taille: 1.7 } },
    },
  },
  vorasque: {
    base: {
      forme: "serpent", taille: 0.95,
      couleurs: { corps: 0x2d4a3a, ventre: 0xb8c860, accent: 0x182418, lueur: 0xf0ff5a, aile: 0x4a7a5a, yeux: 0xffea2a },
      corps: { L: 1.2, T: 0.5, H: 0.45 }, cou: { n: 4, long: 0.9, r: 0.17, angle: 0.5 },
      tete: { style: "fin", taille: 0.44, museau: 1.4, yeux: 0.07, dents: true },
      cornes: { style: "crete", n: 1, long: 0.3 }, crete: { style: "nageoire", n: 14, taille: 0.12 },
      ailes: { style: "aucune" }, queue: { n: 12, long: 2.8, r: 0.16, bout: "nageoire" },
      pattes: { long: 0.3, r: 0.08 }, particules: "etincelles_eau",
    },
    st: {
      0: { crete: { style: "aucune" }, cornes: { style: "aucune" }, tete: { yeux: 0.09 }, queue: { n: 8, long: 1.8 } },
      1: { extras: ["etincelles"] },
      2: { extras: ["etincelles", "double_machoire"] },
      3: { extras: ["etincelles", "double_machoire", "remous"] },
      4: { extras: ["etincelles", "double_machoire", "remous", "siphon"], ailes: { style: "nageoire", taille: 1.0 } },
    },
  },
  ruisselin: {
    base: {
      forme: "quadrupede", taille: 0.85,
      couleurs: { corps: 0x6fd2f0, ventre: 0xc8f6ff, accent: 0xe8ffff, lueur: 0x8ff8ff, aile: 0xaaeeff, yeux: 0x10304a },
      corps: { L: 1.2, T: 0.72, H: 0.62 }, cou: { n: 2, long: 0.45, r: 0.22, angle: 0.65 },
      tete: { style: "rond", taille: 0.5, museau: 0.75, yeux: 0.1 },
      cornes: { style: "aucune" }, crete: { style: "nageoire", n: 5, taille: 0.12 },
      ailes: { style: "nageoire", taille: 0.8 }, queue: { n: 6, long: 1.2, r: 0.16, bout: "nageoire" },
      pattes: { long: 0.45, r: 0.1 }, particules: "gouttes", extras: ["translucide"],
    },
    st: {
      0: { forme: "boule", ailes: { style: "aucune" }, crete: { style: "aucune" }, queue: { n: 2, long: 0.25, bout: "aucune" }, extras: ["translucide", "goutte"] },
      1: { ailes: { style: "aucune" } },
      2: { extras: ["translucide", "courant"] },
      3: { extras: ["translucide", "courant", "galets"] },
      4: { extras: ["translucide", "courant", "galets", "source"], ailes: { taille: 1.1 } },
    },
  },
};

// Les 3 armures de chaque dragon. Le style donne la forme, le motif donne le nom et les couleurs.
export const ARMURES_STYLES = [
  { id: "cuirasse", nom: "Cuirasse", bonus: { def: 1 }, texte: "+1 DEF à toutes les postures" },
  { id: "runes", nom: "Runes", bonus: { atk: 1 }, texte: "+1 ATK à toutes les postures" },
  { id: "parure", nom: "Parure", bonus: { pv: 0.04 }, texte: "+4 % de PV" },
];

export const MOTIFS = {
  braisil: "de braise", pyrok: "de basalte", ignivelle: "de flamme blanche", cendrak: "de suie",
  solarion: "d'aurore", fournaise: "de fonte", micho: "d'étincelle",
  givrelin: "de givre", glaciarque: "de banquise", stalak: "de stalactite", blizzar: "de rafale",
  crysalis: "de prisme", frimas: "de brume gelée", neve: "de poudreuse",
  ondin: "de courant", abyssor: "des abysses", coralys: "de corail", tsunagi: "d'écume",
  marenith: "de nacre", vorasque: "de remous", ruisselin: "de source",
};

// Couleurs de la version UL (Ultime) : une robe rare, seule l'apparence change.
export const PALETTES_UL = {
  feu: { corps: 0x141014, ventre: 0x3a2a1a, accent: 0xffd36a, lueur: 0xffc23a, aile: 0x2a1a12, yeux: 0xfff0b0 },
  glace: { corps: 0xf4f0ff, ventre: 0xffffff, accent: 0x9a6aff, lueur: 0xb88aff, aile: 0xe8dcff, yeux: 0x7a3aff },
  eau: { corps: 0x061418, ventre: 0x0e2a30, accent: 0x2affc8, lueur: 0x2affd0, aile: 0x0a3a40, yeux: 0x8affea },
};
