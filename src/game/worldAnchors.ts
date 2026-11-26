/**
 * Centralized 1:1 world coordinate anchors for Mochi Meadows 2 (N = 420 tiles, 16,800 x 16,800 px).
 * Imported across constants, terrain generation, realm layouts, 2D/3D renderers, landmarks,
 * world data, and interactive maps so all five realms stay locked in exact parity.
 */

export const WORLD_GRID_SIZE = 420;
export const WORLD_TILE_PX = 40;
export const WORLD_CENTER_TILE = WORLD_GRID_SIZE / 2; // 210

export const WORLD_ANCHORS = {
  islands: {
    lanternIsle: { tx: 210, ty: 206, name: 'Lantern Isle' },
    honeycombHills: { tx: 78, ty: 82, name: 'Honeycomb Hills' },
    tidepoolAtoll: { tx: 58, ty: 318, name: 'Tidepool Atoll' },
    starfishCay: { tx: 88, ty: 346, name: 'Starfish Shallows' },
    cinderCradle: { tx: 204, ty: 358, name: 'Cinder Cradle' },
    mirrorFens: { tx: 338, ty: 336, name: 'Mirror Fens' },
    auroraReach: { tx: 346, ty: 84, name: 'Aurora Reach' },
    chimeCanopy: { tx: 210, ty: 52, name: 'Chime Canopy' },
    dawnSpire: { tx: 378, ty: 216, name: 'Dawn Spire' },
    // Expanded outer islands new to the vast archipelago
    sapphireBluff: { tx: 42, ty: 198, name: 'Sapphire Bluff' },
    mapleMist: { tx: 104, ty: 152, name: 'Maple Mist Isle' },
    starfallShoals: { tx: 364, ty: 294, name: 'Starfall Shoals' },
  },
  towns: {
    // Lantern Isle core & crossroads
    willowbrook: { tx: 192, ty: 210 },
    mochiHamlet: { tx: 220, ty: 214 },
    lanternTree: { tx: 210, ty: 203 },
    mossgate: { tx: 128, ty: 194 },
    oasisRest: { tx: 254, ty: 236 },
    frostholm: { tx: 202, ty: 120 },
    pebblePeaks: { tx: 228, ty: 168 },
    driftwoodDock: { tx: 162, ty: 258 },
    petalHollow: { tx: 154, ty: 152 },
    bramblebridge: { tx: 258, ty: 182 },

    // Outer Islands
    honeycombVillage: { tx: 72, ty: 88 },
    wildflowerMill: { tx: 88, ty: 72 },
    tidepoolHaven: { tx: 62, ty: 314 },
    starfishShallows: { tx: 88, ty: 346 },
    cinderSpas: { tx: 202, ty: 362 },
    lilyPavilion: { tx: 338, ty: 338 },
    auroraStation: { tx: 346, ty: 88 },
    bellwoodTreetops: { tx: 210, ty: 56 },
    dawnSpireSummit: { tx: 378, ty: 216 },
    sapphireHaven: { tx: 42, ty: 198 },
    mapleCrossing: { tx: 104, ty: 152 },
    starfallObservatory: { tx: 364, ty: 294 },
  },
  reef: {
    coralConcertHall: { tx: 145, ty: 282 },
    pearlReef: { tx: 238, ty: 282 },
    atollSunkenRuins: { tx: 74, ty: 316 },
    starlitKelpTrench: { tx: 286, ty: 284 },
    driftwoodDiveLagoon: { tx: 162, ty: 263 },
    sunkenPearlGrotto: { tx: 104, ty: 236 },
  },
  sky: {
    cirrusCastle: { tx: 218, ty: 112 },
    nimbusMarket: { tx: 142, ty: 142 },
    sunriseUpdraftSpire: { tx: 346, ty: 194 },
    aetherGarden: { tx: 102, ty: 248 },
  },
  glowdeep: {
    rootedRest: { tx: 210, ty: 210 },
    returnTile: { tx: 210, ty: 204 },
    lumiHome: { tx: 210, ty: 212 },
    sporeGrotto: { tx: 100, ty: 234 },
    magmaGeode: { tx: 206, ty: 346 },
    prismIce: { tx: 318, ty: 110 },
    deepCanalHub: { tx: 90, ty: 90 },
    seEchoCavern: { tx: 332, ty: 320 },
    crystalConservatory: { tx: 340, ty: 206 },
  },
  moonroad: {
    teaHouse: { tx: 210, ty: 202 },
    returnTile: { tx: 210, ty: 207 },
    twinStars: { tx: 144, ty: 116 },
    unsungShrine: { tx: 298, ty: 180 },
    edgeOfSilence: { tx: 378, ty: 216 },
    southStairLanding: { tx: 204, ty: 346 },
    westCrescentLanding: { tx: 58, ty: 316 },
    crescentBelvedere: { tx: 96, ty: 206 },
  },
} as const;
