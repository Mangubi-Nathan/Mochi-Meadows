/**
 * Mochi Meadows 2 — Architectural & Landmark 3D Model Pack
 * Shared shader-enhanced model builders for settlements, houses, shrines,
 * portals, docks, and architectural props across all 5 world layers.
 */

import * as THREE from 'three';
import type { TownArchStyle } from './engine';
import {
  SharedWorldShaderUniforms,
  applyArchitectureShader,
  applyFoliageShader,
  createOrganicLeafClusterGeometry,
} from './worldShaders3D';

export type TrackGeoFn = <T extends THREE.BufferGeometry>(g: T) => T;
export type TrackMatFn = <T extends THREE.Material>(m: T) => T;

export interface ArchMaterialPack {
  plaster: THREE.MeshStandardMaterial;
  masonry: THREE.MeshStandardMaterial;
  basalt: THREE.MeshStandardMaterial;
  marble: THREE.MeshStandardMaterial;
  darkSlate: THREE.MeshStandardMaterial;
  timber: THREE.MeshStandardMaterial;
  gold: THREE.MeshStandardMaterial;
  copper: THREE.MeshStandardMaterial;
  crystalCyan: THREE.MeshStandardMaterial;
  crystalViolet: THREE.MeshStandardMaterial;
  shingleCoral: THREE.MeshStandardMaterial;
  shingleTeal: THREE.MeshStandardMaterial;
  shinglePlum: THREE.MeshStandardMaterial;
  warmWindow: THREE.MeshStandardMaterial;
  waterPool: THREE.MeshStandardMaterial;
}

export function createArchMaterialPack(
  uniforms: SharedWorldShaderUniforms,
  trackMat: TrackMatFn
): ArchMaterialPack {
  const mk = (
    color: number,
    style: 'plaster' | 'shingles' | 'masonry' | 'timber' | 'marble' | 'crystal',
    extra: Partial<THREE.MeshStandardMaterialParameters> = {}
  ) => {
    const m = new THREE.MeshStandardMaterial({ color, roughness: 0.72, ...extra });
    applyArchitectureShader(m, uniforms, style);
    return trackMat(m);
  };

  return {
    plaster: mk(0xfff5e6, 'plaster', { roughness: 0.84 }),
    masonry: mk(0xcbc4d8, 'masonry', { roughness: 0.88 }),
    basalt: mk(0x473c4f, 'masonry', { roughness: 0.92 }),
    marble: mk(0xfbf7ff, 'marble', { roughness: 0.36, metalness: 0.04 }),
    darkSlate: mk(0x3a4059, 'masonry', { roughness: 0.68, metalness: 0.14 }),
    timber: mk(0x7c4e3a, 'timber', { roughness: 0.76 }),
    gold: trackMat(
      new THREE.MeshStandardMaterial({
        color: 0xffd23f,
        emissive: 0xffaa18,
        emissiveIntensity: 0.52,
        roughness: 0.24,
        metalness: 0.62,
      })
    ),
    copper: trackMat(
      new THREE.MeshStandardMaterial({
        color: 0xd98657,
        roughness: 0.38,
        metalness: 0.55,
      })
    ),
    crystalCyan: mk(0x6ff2ff, 'crystal', {
      emissive: 0x26c7e8,
      emissiveIntensity: 0.72,
      roughness: 0.16,
      transparent: true,
      opacity: 0.9,
    }),
    crystalViolet: mk(0xc99eff, 'crystal', {
      emissive: 0x7e4dff,
      emissiveIntensity: 0.62,
      roughness: 0.18,
      transparent: true,
      opacity: 0.9,
    }),
    shingleCoral: mk(0xe86c58, 'shingles', { roughness: 0.64 }),
    shingleTeal: mk(0x4bb39a, 'shingles', { roughness: 0.64 }),
    shinglePlum: mk(0x8b67d1, 'shingles', { roughness: 0.62 }),
    warmWindow: trackMat(
      new THREE.MeshStandardMaterial({
        color: 0xffe896,
        emissive: 0xffc83b,
        emissiveIntensity: 0.82,
        roughness: 0.2,
      })
    ),
    waterPool: trackMat(
      new THREE.MeshStandardMaterial({
        color: 0x62ebff,
        emissive: 0x24bee6,
        emissiveIntensity: 0.62,
        roughness: 0.12,
        metalness: 0.15,
      })
    ),
  };
}

/**
 * Rich Half-Timbered Storybook Town Cottage:
 * Stepped stone plinth + front cobble stoop + half-timbered stucco walls +
 * shingled pitched gable roof & dormer + brick chimney + wooden shutters,
 * flower boxes, hanging brass lantern & side rain barrel.
 */
export function buildDetailedCottage(
  roofHex: number,
  uniforms: SharedWorldShaderUniforms,
  pack: ArchMaterialPack,
  trackGeo: TrackGeoFn,
  trackMat: TrackMatFn,
  flowerMatsOut?: THREE.MeshStandardMaterial[],
  archStyle: TownArchStyle = 'meadow'
): { group: THREE.Group; roofMat: THREE.MeshStandardMaterial; smokePuffs: THREE.Mesh[] } {
  const group = new THREE.Group();
  const roofMat = trackMat(new THREE.MeshStandardMaterial({ color: roofHex, roughness: 0.64 }));
  applyArchitectureShader(roofMat, uniforms, 'shingles');

  const chimneyMat = archStyle === 'coastal' ? pack.timber : pack.masonry;
  const flowerMat = trackMat(new THREE.MeshStandardMaterial({ color: archStyle === 'blossom' ? 0xff82bc : 0xff5a96, roughness: 0.56 }));
  const leafMat = trackMat(new THREE.MeshStandardMaterial({ color: 0x3ea664, roughness: 0.72 }));
  const shutterMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: archStyle === 'coastal' ? 0x3b96b8 : archStyle === 'desert' ? 0xc7773c : 0x5288a8,
      roughness: 0.68,
    })
  );
  const brassMat = pack.gold;
  if (flowerMatsOut) flowerMatsOut.push(flowerMat);

  const wallMat =
    archStyle === 'desert'
      ? trackMat(new THREE.MeshStandardMaterial({ color: 0xf4d8af, roughness: 0.9 }))
      : archStyle === 'nordic'
      ? trackMat(new THREE.MeshStandardMaterial({ color: 0x9c6b4b, roughness: 0.82 }))
      : archStyle === 'coastal'
      ? trackMat(new THREE.MeshStandardMaterial({ color: 0xf4f9fc, roughness: 0.78 }))
      : pack.plaster;

  if (archStyle === 'desert') {
    applyArchitectureShader(wallMat, uniforms, 'plaster');
  } else if (archStyle === 'nordic') {
    applyArchitectureShader(wallMat, uniforms, 'timber');
  }

  // Foundation plinth & cobbled entry steps
  const plinthMat = archStyle === 'coastal' ? pack.timber : archStyle === 'desert' ? pack.copper : pack.masonry;
  const plinth = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(2.44, archStyle === 'coastal' ? 0.34 : 0.26, 1.84)),
    plinthMat
  );
  plinth.position.y = archStyle === 'coastal' ? 0.17 : 0.13;
  plinth.castShadow = true;
  plinth.receiveShadow = true;

  const stoop = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(0.92, archStyle === 'coastal' ? 0.2 : 0.15, 0.58)),
    plinthMat
  );
  stoop.position.set(0, archStyle === 'coastal' ? 0.1 : 0.075, 1.08);
  stoop.receiveShadow = true;

  // Main house body
  const baseElevation = archStyle === 'coastal' ? 0.08 : 0;
  const body = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(2.16, 1.1, 1.56)), wallMat);
  body.position.y = 0.76 + baseElevation;
  body.castShadow = true;
  body.receiveShadow = true;

  const postMat = archStyle === 'blossom' ? pack.shingleCoral : pack.timber;
  const cornerGeo = trackGeo(new THREE.BoxGeometry(0.11, 1.12, 0.11));
  for (const [cx, cz] of [
    [-1.06, -0.76],
    [1.06, -0.76],
    [-1.06, 0.76],
    [1.06, 0.76],
  ]) {
    const post = new THREE.Mesh(cornerGeo, postMat);
    post.position.set(cx, 0.76 + baseElevation, cz);
    post.castShadow = true;
    group.add(post);
  }

  const beltBeam = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(2.28, 0.1, 1.66)), postMat);
  beltBeam.position.y = 1.3 + baseElevation;

  // Biome-specific roofs & silhouette accents
  if (archStyle === 'desert') {
    // Terraced Adobe roof with stepped parapet & timber vigas roof beams
    const terraceRim = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(2.36, 0.24, 1.76)), wallMat);
    terraceRim.position.y = 1.44;
    terraceRim.castShadow = true;
    const shadeCanopy = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(1.72, 0.12, 1.12)), roofMat);
    shadeCanopy.position.set(0, 1.98, -0.04);
    shadeCanopy.castShadow = true;
    const pGeo = trackGeo(new THREE.CylinderGeometry(0.055, 0.06, 0.48, 6));
    for (const [px, pz] of [[-0.72, -0.44], [0.72, -0.44], [-0.72, 0.38], [0.72, 0.38]]) {
      const p = new THREE.Mesh(pGeo, pack.timber);
      p.position.set(px, 1.74, pz);
      group.add(p);
    }
    const vigaGeo = trackGeo(new THREE.CylinderGeometry(0.045, 0.045, 2.52, 6));
    vigaGeo.rotateZ(Math.PI / 2);
    for (const vz of [-0.48, 0, 0.48]) {
      const v = new THREE.Mesh(vigaGeo, pack.timber);
      v.position.set(0, 1.28, vz);
      group.add(v);
    }
    // Terracotta desert amphora jars
    const jarGeo = trackGeo(new THREE.SphereGeometry(0.18, 9, 7));
    const jar1 = new THREE.Mesh(jarGeo, pack.copper);
    jar1.scale.set(0.95, 1.35, 0.95);
    jar1.position.set(1.24, 0.32, 0.56);
    group.add(terraceRim, shadeCanopy, jar1);
  } else if (archStyle === 'blossom') {
    // Tiered upturned pagoda-eave roof & warm vermilion lanterns
    const lowerEave = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(2.62, 0.12, 2.02)), roofMat);
    lowerEave.position.y = 1.42;
    lowerEave.castShadow = true;
    const upperBody = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(1.48, 0.46, 1.06)), wallMat);
    upperBody.position.y = 1.66;
    upperBody.castShadow = true;
    const upperRoof = new THREE.Mesh(trackGeo(new THREE.ConeGeometry(1.42, 0.72, 4)), roofMat);
    upperRoof.position.y = 2.18;
    upperRoof.rotation.y = Math.PI / 4;
    upperRoof.scale.set(1.22, 1, 0.95);
    upperRoof.castShadow = true;
    const finial = new THREE.Mesh(trackGeo(new THREE.OctahedronGeometry(0.14, 0)), pack.gold);
    finial.position.y = 2.6;
    // Hanging red-paper lanterns under eaves
    const pLantGeo = trackGeo(new THREE.SphereGeometry(0.11, 8, 6));
    for (const lx of [-0.95, 0.95]) {
      const pl = new THREE.Mesh(pLantGeo, pack.shingleCoral);
      pl.scale.set(1, 1.35, 1);
      pl.position.set(lx, 1.2, 0.96);
      const glow = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.06, 6, 5)), pack.warmWindow);
      glow.position.set(lx, 1.2, 0.96);
      group.add(pl, glow);
    }
    group.add(lowerEave, upperBody, upperRoof, finial);
  } else if (archStyle === 'nordic') {
    // Steep alpine A-frame cabin roof with snow-frost trim + heavy stone hearth
    const roof = new THREE.Mesh(trackGeo(new THREE.ConeGeometry(1.88, 1.38, 4)), roofMat);
    roof.position.y = 1.98;
    roof.rotation.y = Math.PI / 4;
    roof.scale.set(1.2, 1, 0.96);
    roof.castShadow = true;
    const snowTrimMat = trackMat(new THREE.MeshStandardMaterial({ color: 0xf4faff, roughness: 0.72 }));
    const snowCap = new THREE.Mesh(trackGeo(new THREE.ConeGeometry(1.42, 0.78, 4)), snowTrimMat);
    snowCap.position.y = 2.34;
    snowCap.rotation.y = Math.PI / 4;
    snowCap.scale.set(1.16, 1, 0.92);
    const woodLogGeo = trackGeo(new THREE.CylinderGeometry(0.06, 0.06, 0.36, 6));
    woodLogGeo.rotateZ(Math.PI / 2);
    for (let r = 0; r < 2; r++) {
      const lg = new THREE.Mesh(woodLogGeo, pack.timber);
      lg.position.set(1.24, 0.24 + r * 0.11, 0.36);
      group.add(lg);
    }
    group.add(roof, snowCap);
  } else {
    // Meadow or Coastal gable pitched roof + front dormer peak
    const roof = new THREE.Mesh(trackGeo(new THREE.ConeGeometry(1.74, 1.08, 4)), roofMat);
    roof.position.y = 1.84 + baseElevation;
    roof.rotation.y = Math.PI / 4;
    roof.scale.set(1.18, 1, 0.94);
    roof.castShadow = true;

    const dormerWalls = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.68, 0.42, 0.62)), wallMat);
    dormerWalls.position.set(0, 1.55 + baseElevation, 0.56);
    const dormerRoof = new THREE.Mesh(trackGeo(new THREE.ConeGeometry(0.56, 0.44, 4)), roofMat);
    dormerRoof.position.set(0, 1.94 + baseElevation, 0.58);
    dormerRoof.rotation.y = Math.PI / 4;
    const dormerWin = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.115, 10, 8)), pack.warmWindow);
    dormerWin.position.set(0, 1.56 + baseElevation, 0.875);
    dormerWin.scale.set(1, 1, 0.42);
    group.add(roof, dormerWalls, dormerRoof, dormerWin);

    if (archStyle === 'coastal') {
      // Nautical lifebuoy ring & dockside mooring post
      const buoyMat = trackMat(new THREE.MeshStandardMaterial({ color: 0xff5a5f, roughness: 0.45 }));
      const buoy = new THREE.Mesh(trackGeo(new THREE.TorusGeometry(0.16, 0.055, 8, 14)), buoyMat);
      buoy.position.set(-0.62, 0.92, 0.84);
      const buoyStripe = new THREE.Mesh(trackGeo(new THREE.TorusGeometry(0.16, 0.058, 6, 6, 1.1)), pack.marble);
      buoyStripe.position.set(-0.62, 0.92, 0.84);
      group.add(buoy, buoyStripe);
    }
  }

  // Stone chimney with cap (always positioned cleanly for curling chimney smoke)
  const chimney = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.34, 0.92, 0.34)), chimneyMat);
  chimney.position.set(0.68, 1.88 + baseElevation, -0.22);
  chimney.castShadow = true;
  const chCap = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.44, 0.1, 0.44)), pack.darkSlate);
  chCap.position.set(0.68, 2.36 + baseElevation, -0.22);

  // Entry door + porch awning + hanging brass lantern
  const doorFrame = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.54, 0.78, 0.1)), postMat);
  doorFrame.position.set(0, 0.5 + baseElevation, 0.785);
  const door = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.42, 0.68, 0.12)), pack.copper);
  door.position.set(0, 0.48 + baseElevation, 0.805);
  const doorKnob = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.04, 6, 6)), brassMat);
  doorKnob.position.set(0.13, 0.46 + baseElevation, 0.88);

  const awningMat = archStyle === 'coastal' ? pack.shingleTeal : roofMat;
  const awning = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.92, 0.08, 0.5)), awningMat);
  awning.position.set(0, 0.98 + baseElevation, 0.96);
  awning.rotation.x = 0.28;
  const porchLamp = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.085, 8, 6)), pack.warmWindow);
  porchLamp.position.set(0.32, 0.84 + baseElevation, 1.04);

  // Mullioned side windows with shutters & flower boxes
  const winGeo = trackGeo(new THREE.BoxGeometry(0.42, 0.38, 0.07));
  const shutterGeo = trackGeo(new THREE.BoxGeometry(0.11, 0.4, 0.08));
  const planterGeo = trackGeo(new THREE.BoxGeometry(0.48, 0.13, 0.18));
  const blossomGeo = trackGeo(new THREE.SphereGeometry(0.075, 7, 6));
  for (const wx of [-0.64, 0.64]) {
    const win = new THREE.Mesh(winGeo, pack.warmWindow);
    win.position.set(wx, 0.82 + baseElevation, 0.78);
    const shL = new THREE.Mesh(shutterGeo, shutterMat);
    shL.position.set(wx - 0.28, 0.82 + baseElevation, 0.795);
    const shR = new THREE.Mesh(shutterGeo, shutterMat);
    shR.position.set(wx + 0.28, 0.82 + baseElevation, 0.795);
    const planter = new THREE.Mesh(planterGeo, pack.timber);
    planter.position.set(wx, 0.54 + baseElevation, 0.86);
    const foliage = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.42, 0.08, 0.14)), leafMat);
    foliage.position.set(wx, 0.62 + baseElevation, 0.85);
    group.add(win, shL, shR, planter, foliage);
    for (const fx of [-0.14, 0, 0.14]) {
      const fl = new THREE.Mesh(blossomGeo, flowerMat);
      fl.position.set(wx + fx, 0.68 + baseElevation, 0.86);
      group.add(fl);
    }
  }

  // Side rain barrel / garden accent
  const barrel = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.18, 0.16, 0.38, 10)), pack.timber);
  barrel.position.set(-1.26, 0.24 + baseElevation, 0.45);
  barrel.castShadow = true;

  // Soft curling chimney smoke wisps
  const smokeMat = trackMat(new THREE.MeshBasicMaterial({ color: 0xfff8f0, transparent: true, opacity: 0.36 }));
  const puffGeo = trackGeo(new THREE.SphereGeometry(0.11, 8, 6));
  const smokePuffs: THREE.Mesh[] = [];
  for (let s = 0; s < 3; s++) {
    const puff = new THREE.Mesh(puffGeo, smokeMat);
    puff.name = `cottageSmoke${s}`;
    puff.position.set(0.68, 2.48 + baseElevation + s * 0.28, -0.22);
    group.add(puff);
    smokePuffs.push(puff);
  }

  group.add(
    plinth,
    stoop,
    body,
    beltBeam,
    chimney,
    chCap,
    doorFrame,
    door,
    doorKnob,
    awning,
    porchLamp,
    barrel
  );
  return { group, roofMat, smokePuffs };
}

/**
 * Hero Mochi Home Cottage (Full Multi-Wing 3D Exterior matching all 6 interior rooms:
 * Main Living Foyer & Porch + West Kitchen Wing & Baker's Chimney + NW Bedroom Moon Loft +
 * NE Study Observatory Bay + East Glass Sunroom Conservatory with visible plants +
 * SE Bath & Reef Porthole Alcove + Garden Path, Picket Fence & Mailbox)
 */
export function buildDetailedHeroMochiHouse(
  uniforms: SharedWorldShaderUniforms,
  pack: ArchMaterialPack,
  trackGeo: TrackGeoFn,
  trackMat: TrackMatFn
): { group: THREE.Group; smokePuffs: THREE.Mesh[] } {
  const { group, smokePuffs } = buildDetailedCottage(0xe9718e, uniforms, pack, trackGeo, trackMat);
  group.scale.setScalar(1.24);

  const sunGlassMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xc8f4ff,
      roughness: 0.14,
      metalness: 0.08,
      transparent: true,
      opacity: 0.44,
      depthWrite: false,
    })
  );
  const fenceMat = trackMat(new THREE.MeshStandardMaterial({ color: 0xfff8ef, roughness: 0.7 }));
  const mailBoxMat = trackMat(new THREE.MeshStandardMaterial({ color: 0x5ea0de, roughness: 0.45 }));
  const herbLeafMat = trackMat(new THREE.MeshStandardMaterial({ color: 0x3ea664, roughness: 0.68 }));
  const blossomMat = trackMat(new THREE.MeshStandardMaterial({ color: 0xff80b0, roughness: 0.52 }));
  const reefGlowMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x5be8ff,
      emissive: 0x24bee6,
      emissiveIntensity: 0.78,
      roughness: 0.16,
    })
  );
  const moonWindowMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xd9c2ff,
      emissive: 0x9b72ff,
      emissiveIntensity: 0.55,
      roughness: 0.25,
    })
  );
  const ironFrameMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0x456e62, roughness: 0.42, metalness: 0.45 })
  );

  // 1. West Wing: Kitchen & Bakery Bay (-X) with coral pitched roof & stacked firewood
  const kitchenPlinth = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.96, 0.22, 1.32)), pack.masonry);
  kitchenPlinth.position.set(-1.66, 0.11, -0.02);
  kitchenPlinth.castShadow = true;
  kitchenPlinth.receiveShadow = true;

  const kitchenBody = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(1.06, 0.96, 1.2)), pack.plaster);
  kitchenBody.position.set(-1.46, 0.72, -0.02);
  kitchenBody.castShadow = true;
  kitchenBody.receiveShadow = true;

  const kitchenRoof = new THREE.Mesh(trackGeo(new THREE.ConeGeometry(0.96, 0.72, 4)), pack.shingleCoral);
  kitchenRoof.position.set(-1.46, 1.54, -0.02);
  kitchenRoof.rotation.y = Math.PI / 4;
  kitchenRoof.scale.set(1.02, 1, 1.08);
  kitchenRoof.castShadow = true;

  const kitchenWin = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.46, 0.36, 0.08)), pack.warmWindow);
  kitchenWin.position.set(-1.46, 0.78, 0.61);
  const cafeAwning = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.62, 0.07, 0.32)), pack.shingleTeal);
  cafeAwning.position.set(-1.46, 1.02, 0.73);
  cafeAwning.rotation.x = 0.32;

  // Firewood log rack beside kitchen
  const logGeo = trackGeo(new THREE.CylinderGeometry(0.055, 0.055, 0.3, 6));
  logGeo.rotateZ(Math.PI / 2);
  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < 3; col++) {
      const log = new THREE.Mesh(logGeo, pack.timber);
      log.position.set(-2.06, 0.12 + row * 0.1, 0.22 + col * 0.12);
      group.add(log);
    }
  }

  // 2. North-West Wing: Bedroom Loft Gable & Circular Moon Skylight Window
  const bedLoft = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(1.08, 0.62, 0.92)), pack.plaster);
  bedLoft.position.set(-0.62, 1.58, -0.34);
  bedLoft.castShadow = true;
  const bedLoftRoof = new THREE.Mesh(trackGeo(new THREE.ConeGeometry(0.84, 0.62, 4)), pack.shinglePlum);
  bedLoftRoof.position.set(-0.62, 2.18, -0.34);
  bedLoftRoof.rotation.y = Math.PI / 4;
  bedLoftRoof.castShadow = true;

  const moonFrame = new THREE.Mesh(trackGeo(new THREE.TorusGeometry(0.18, 0.04, 8, 16)), pack.timber);
  moonFrame.position.set(-0.62, 1.62, 0.155);
  const moonGlass = new THREE.Mesh(trackGeo(new THREE.CircleGeometry(0.16, 14)), moonWindowMat);
  moonGlass.position.set(-0.62, 1.62, 0.145);

  // 3. North-East Wing: Study & Observatory Turret Bay with Brass Telescope Finial
  const studyBase = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.56, 0.62, 1.72, 8)), pack.plaster);
  studyBase.position.set(0.92, 0.96, -0.62);
  studyBase.castShadow = true;
  const studyBelt = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.62, 0.62, 0.1, 8)), pack.timber);
  studyBelt.position.set(0.92, 1.38, -0.62);
  const studyRoof = new THREE.Mesh(trackGeo(new THREE.ConeGeometry(0.68, 0.78, 8)), pack.shinglePlum);
  studyRoof.position.set(0.92, 2.2, -0.62);
  studyRoof.castShadow = true;
  const studyFinial = new THREE.Mesh(trackGeo(new THREE.OctahedronGeometry(0.1, 0)), pack.gold);
  studyFinial.position.set(0.92, 2.66, -0.62);
  const studyWin = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.24, 0.34, 0.08)), pack.warmWindow);
  studyWin.position.set(0.92, 1.56, -0.02);

  // 4. East Wing: Glass Sunroom Conservatory (+X) with visible indoor potted greenery & iron mullions
  const sunBase = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.96, 0.23, 1.24)), pack.masonry);
  sunBase.position.set(1.69, 0.115, -0.14);
  sunBase.castShadow = true;
  sunBase.receiveShadow = true;

  const sunRoom = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(1.1, 0.84, 1.14)), sunGlassMat);
  sunRoom.position.set(1.56, 0.66, -0.14);
  const sunRoof = new THREE.Mesh(trackGeo(new THREE.ConeGeometry(0.88, 0.48, 4)), sunGlassMat);
  sunRoof.position.set(1.56, 1.38, -0.14);
  sunRoof.rotation.y = Math.PI / 4;

  // Conservatory dark-green iron corner mullions & ridge frame
  const mullionGeo = trackGeo(new THREE.BoxGeometry(0.055, 0.88, 0.055));
  for (const [mx, mz] of [
    [1.03, -0.68],
    [2.09, -0.68],
    [1.03, 0.4],
    [2.09, 0.4],
  ]) {
    const mullion = new THREE.Mesh(mullionGeo, ironFrameMat);
    mullion.position.set(mx, 0.68, mz);
    group.add(mullion);
  }
  const sunRidge = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(1.14, 0.05, 1.18)), ironFrameMat);
  sunRidge.position.set(1.56, 1.11, -0.14);

  // Visible 3D potted blooms inside Conservatory glass
  const potGeo = trackGeo(new THREE.CylinderGeometry(0.11, 0.08, 0.14, 8));
  const bushGeo = trackGeo(new THREE.SphereGeometry(0.15, 8, 6));
  const bloomDotGeo = trackGeo(new THREE.SphereGeometry(0.055, 6, 5));
  for (const [px, pz] of [
    [1.36, -0.34],
    [1.72, -0.22],
    [1.52, 0.12],
  ]) {
    const pot = new THREE.Mesh(potGeo, pack.copper);
    pot.position.set(px, 0.31, pz);
    const bush = new THREE.Mesh(bushGeo, herbLeafMat);
    bush.position.set(px, 0.48, pz);
    const bl = new THREE.Mesh(bloomDotGeo, blossomMat);
    bl.position.set(px, 0.61, pz);
    group.add(pot, bush, bl);
  }

  // 5. South-East Wing: Bath & Coral Reef Spa Alcove with Turquoise Porthole Window (cleanly non-coplanar with sunBase & plinth)
  const bathBase = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.7, 0.21, 0.6)), pack.masonry);
  bathBase.position.set(1.56, 0.105, 0.8);
  const bathBody = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.84, 0.72, 0.64)), pack.plaster);
  bathBody.position.set(1.42, 0.58, 0.74);
  bathBody.castShadow = true;
  const bathRoof = new THREE.Mesh(trackGeo(new THREE.ConeGeometry(0.68, 0.44, 4)), pack.shingleTeal);
  bathRoof.position.set(1.42, 1.16, 0.74);
  bathRoof.rotation.y = Math.PI / 4;
  const portholeRim = new THREE.Mesh(trackGeo(new THREE.TorusGeometry(0.15, 0.035, 8, 14)), pack.gold);
  portholeRim.position.set(1.42, 0.66, 1.08);
  const portholeGlass = new THREE.Mesh(trackGeo(new THREE.CircleGeometry(0.135, 12)), reefGlowMat);
  portholeGlass.position.set(1.42, 0.66, 1.095);

  // 6. Front Garden Picket Fence, Stepping Stones & Blue Mochi Mailbox
  const postGeo = trackGeo(new THREE.BoxGeometry(0.09, 0.38, 0.08));
  const railGeo = trackGeo(new THREE.BoxGeometry(1.18, 0.06, 0.04));
  const railL = new THREE.Mesh(railGeo, fenceMat);
  railL.position.set(-1.02, 0.24, 1.44);
  const railR = new THREE.Mesh(railGeo, fenceMat);
  railR.position.set(1.02, 0.24, 1.44);
  group.add(railL, railR);
  for (let i = -3; i <= 3; i++) {
    if (i === 0) continue;
    const post = new THREE.Mesh(postGeo, fenceMat);
    post.position.set(i * 0.44, 0.19, 1.44);
    group.add(post);
  }

  // Flagstone garden stepping stones cleanly raised above terrain terrace
  const stoneGeo = trackGeo(new THREE.CylinderGeometry(0.2, 0.22, 0.045, 7));
  for (let s = 0; s < 3; s++) {
    const stone = new THREE.Mesh(stoneGeo, pack.masonry);
    stone.position.set((s % 2 === 0 ? -0.06 : 0.06), 0.038, 1.44 + s * 0.36);
    stone.receiveShadow = true;
    group.add(stone);
  }

  // Mailbox
  const mailPost = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.08, 0.48, 0.08)), pack.timber);
  mailPost.position.set(-1.62, 0.24, 1.48);
  const mailBox = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.24, 0.16, 0.34)), mailBoxMat);
  mailBox.position.set(-1.62, 0.52, 1.48);

  group.add(
    kitchenPlinth,
    kitchenBody,
    kitchenRoof,
    kitchenWin,
    cafeAwning,
    bedLoft,
    bedLoftRoof,
    moonFrame,
    moonGlass,
    studyBase,
    studyBelt,
    studyRoof,
    studyFinial,
    studyWin,
    sunBase,
    sunRoom,
    sunRoof,
    sunRidge,
    bathBase,
    bathBody,
    bathRoof,
    portholeRim,
    portholeGlass,
    mailPost,
    mailBox
  );

  return { group, smokePuffs };
}

/**
 * Monumental Marble Fountain Waystone for Settlement Centers
 */
export function buildDetailedFountainWaystone(
  pack: ArchMaterialPack,
  trackGeo: TrackGeoFn
): THREE.Group {
  const g = new THREE.Group();

  // Octagonal stone plaza base
  const apron = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(1.42, 1.54, 0.14, 8)), pack.masonry);
  apron.position.y = 0.07;
  apron.receiveShadow = true;

  const basin = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(1.0, 1.12, 0.34, 16)), pack.marble);
  basin.position.y = 0.24;
  basin.castShadow = true;
  basin.receiveShadow = true;

  const rim = new THREE.Mesh(trackGeo(new THREE.TorusGeometry(0.96, 0.09, 8, 24)), pack.marble);
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 0.42;

  const pool = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.88, 0.88, 0.08, 18)), pack.waterPool);
  pool.position.y = 0.36;

  const rippleGeo = trackGeo(new THREE.TorusGeometry(0.56, 0.032, 8, 22));
  rippleGeo.rotateX(Math.PI / 2);
  const ripple = new THREE.Mesh(rippleGeo, pack.waterPool);
  ripple.position.y = 0.42;
  ripple.name = 'waystoneRipple';

  const ped = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.24, 0.36, 0.82, 8)), pack.marble);
  ped.position.y = 0.66;
  ped.castShadow = true;

  const bowl = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.46, 0.18, 0.16, 12)), pack.gold);
  bowl.position.y = 1.06;

  const gem = new THREE.Mesh(trackGeo(new THREE.OctahedronGeometry(0.28, 0)), pack.gold);
  gem.position.y = 1.44;
  gem.name = 'waystoneGem';

  // 4 bronze corner spouts + lively sparkling water droplets
  const spoutGeo = trackGeo(new THREE.BoxGeometry(0.12, 0.12, 0.28));
  for (let k = 0; k < 4; k++) {
    const a = (k / 4) * Math.PI * 2;
    const sp = new THREE.Mesh(spoutGeo, pack.gold);
    sp.position.set(Math.cos(a) * 0.96, 0.46, Math.sin(a) * 0.96);
    sp.rotation.y = -a + Math.PI / 2;
    g.add(sp);
  }

  const dropGeo = trackGeo(new THREE.SphereGeometry(0.068, 7, 5));
  for (let d = 0; d < 6; d++) {
    const drop = new THREE.Mesh(dropGeo, pack.waterPool);
    drop.name = `waterSpray${d}`;
    drop.position.set(Math.cos(d * 1.05) * 0.28, 1.08, Math.sin(d * 1.05) * 0.28);
    g.add(drop);
  }

  g.add(apron, basin, rim, pool, ripple, ped, bowl, gem);
  return g;
}

/**
 * Undersea Bubble Shell Cottage Dome for Coral Reef Settlements
 */
export function buildDetailedBubbleDome(
  pack: ArchMaterialPack,
  trackGeo: TrackGeoFn,
  trackMat: TrackMatFn
): THREE.Group {
  const g = new THREE.Group();
  const glassMat = trackMat(
    new THREE.MeshPhysicalMaterial({
      color: 0xaaf5ff,
      roughness: 0.06,
      metalness: 0.05,
      transmission: 0.52,
      transparent: true,
      opacity: 0.32,
      depthWrite: false,
    })
  );
  const innerWallMat = trackMat(new THREE.MeshStandardMaterial({ color: 0xffb3cf, roughness: 0.56 }));
  const shellRoofMat = pack.shingleTeal;
  const coralMat = trackMat(new THREE.MeshStandardMaterial({ color: 0xff7da8, roughness: 0.52 }));
  const goldCoralMat = trackMat(new THREE.MeshStandardMaterial({ color: 0xffb26b, roughness: 0.54 }));

  const stoneRing = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(1.38, 1.48, 0.18, 20)), pack.masonry);
  stoneRing.position.y = 0.09;
  const rim = new THREE.Mesh(trackGeo(new THREE.TorusGeometry(1.28, 0.08, 8, 26)), pack.crystalCyan);
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 0.18;

  const dome = new THREE.Mesh(
    trackGeo(new THREE.SphereGeometry(1.28, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.55)),
    glassMat
  );
  dome.position.y = 0.14;

  const house = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.96, 0.58, 0.82)), innerWallMat);
  house.position.y = 0.42;
  const roof = new THREE.Mesh(trackGeo(new THREE.ConeGeometry(0.74, 0.48, 8)), shellRoofMat);
  roof.position.y = 0.92;
  const chimney = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.08, 0.12, 0.34, 8)), coralMat);
  chimney.position.set(0.28, 1.0, -0.14);

  const porthole = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.16, 0.16, 0.08, 12)), pack.warmWindow);
  porthole.rotation.x = Math.PI / 2;
  porthole.position.set(0, 0.52, 0.42);
  const door = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.28, 0.42, 0.08)), pack.timber);
  door.position.set(0, 0.34, 0.41);

  const coralGeo = trackGeo(new THREE.ConeGeometry(0.15, 0.48, 7));
  for (const [cx, cz, rz, mat] of [
    [-1.24, 0.55, 0.24, coralMat],
    [1.26, 0.48, -0.22, goldCoralMat],
    [0.92, -0.92, 0.18, coralMat],
    [-0.95, -0.84, -0.16, goldCoralMat],
  ] as const) {
    const c = new THREE.Mesh(coralGeo, mat);
    c.position.set(cx, 0.24, cz);
    c.rotation.z = rz;
    g.add(c);
  }

  g.add(stoneRing, house, roof, chimney, door, porthole, rim, dome);
  return g;
}

/**
 * Ancient Great Lantern Tree Sanctuary (terraced mossy stone shrine + wooden lantern ring + 7 lush foliage crowns)
 */
export function buildDetailedGreatLanternTree(
  uniforms: SharedWorldShaderUniforms,
  pack: ArchMaterialPack,
  trackGeo: TrackGeoFn,
  trackMat: TrackMatFn
): {
  group: THREE.Group;
  barkMat: THREE.MeshStandardMaterial;
  crownMat1: THREE.MeshStandardMaterial;
  crownMat2: THREE.MeshStandardMaterial;
  lanternOrbs: THREE.Mesh[];
} {
  const ltGroup = new THREE.Group();
  const barkMat = trackMat(new THREE.MeshStandardMaterial({ color: 0x66392c, roughness: 0.88 }));
  applyArchitectureShader(barkMat, uniforms, 'timber');
  const crownMat1 = trackMat(new THREE.MeshStandardMaterial({ color: 0x268f56, roughness: 0.66 }));
  const crownMat2 = trackMat(new THREE.MeshStandardMaterial({ color: 0x52d97b, roughness: 0.6 }));
  applyFoliageShader(crownMat1, uniforms);
  applyFoliageShader(crownMat2, uniforms);
  const orbMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xffe98f,
      emissive: 0xffc83b,
      emissiveIntensity: 0.92,
      roughness: 0.2,
    })
  );

  // Sanctuary mossy stone dais & terrace step
  const daisLower = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(2.15, 2.38, 0.22, 16)), pack.masonry);
  daisLower.position.y = 0.11;
  daisLower.receiveShadow = true;
  const daisUpper = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(1.55, 1.7, 0.22, 16)), pack.marble);
  daisUpper.position.y = 0.28;
  daisUpper.receiveShadow = true;
  ltGroup.add(daisLower, daisUpper);

  const trunk = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.46, 0.94, 2.55, 14)), barkMat);
  trunk.position.y = 1.42;
  trunk.castShadow = true;
  ltGroup.add(trunk);

  const rootGeo = trackGeo(new THREE.CylinderGeometry(0.18, 0.36, 1.15, 8));
  const shrinePostGeo = trackGeo(new THREE.CylinderGeometry(0.08, 0.1, 0.68, 6));
  const miniOrbGeo = trackGeo(new THREE.SphereGeometry(0.1, 8, 6));
  for (let r = 0; r < 6; r++) {
    const ang = (r / 6) * Math.PI * 2 + 0.25;
    const root = new THREE.Mesh(rootGeo, barkMat);
    root.position.set(Math.cos(ang) * 0.74, 0.44, Math.sin(ang) * 0.74);
    root.rotation.z = Math.cos(ang) * 0.68;
    root.rotation.x = -Math.sin(ang) * 0.68;
    root.castShadow = true;
    ltGroup.add(root);

    // Outer shrine perimeter lantern posts
    const sp = new THREE.Mesh(shrinePostGeo, pack.timber);
    sp.position.set(Math.cos(ang + 0.32) * 1.92, 0.42, Math.sin(ang + 0.32) * 1.92);
    const lCap = new THREE.Mesh(miniOrbGeo, orbMat);
    lCap.position.set(Math.cos(ang + 0.32) * 1.92, 0.82, Math.sin(ang + 0.32) * 1.92);
    ltGroup.add(sp, lCap);
  }

  const organicLobeBase = trackGeo(createOrganicLeafClusterGeometry());
  for (const [cx, cy, cz, r, mat] of [
    [0, 2.95, 0, 1.68, crownMat1],
    [-1.16, 2.55, 0.35, 1.22, crownMat2],
    [1.16, 2.55, 0.25, 1.22, crownMat2],
    [0, 2.68, -0.98, 1.14, crownMat1],
    [0, 3.74, -0.08, 1.24, crownMat2],
    [0.68, 3.34, 0.68, 0.96, crownMat1],
    [-0.7, 3.26, -0.58, 0.98, crownMat2],
  ] as const) {
    const lobe = new THREE.Mesh(organicLobeBase, mat);
    lobe.position.set(cx, cy, cz);
    lobe.scale.setScalar(r / 0.56);
    lobe.rotation.y = cx * 0.9 + cz;
    lobe.castShadow = true;
    ltGroup.add(lobe);
  }

  const orbGeo = trackGeo(new THREE.SphereGeometry(0.19, 10, 8));
  const lanternOrbs: THREE.Mesh[] = [];
  for (const [lx, ly, lz] of [
    [-1.26, 1.88, 0.78],
    [1.22, 1.92, 0.74],
    [0, 2.18, 1.28],
    [-0.62, 3.12, 0.98],
    [0.68, 3.08, 0.96],
  ]) {
    const orb = new THREE.Mesh(orbGeo, orbMat);
    orb.position.set(lx, ly, lz);
    ltGroup.add(orb);
    lanternOrbs.push(orb);
  }

  return { group: ltGroup, barkMat, crownMat1, crownMat2, lanternOrbs };
}

/**
 * Carved Rune-Stone Portal Archway (Glowdeep & Moon Gate Portals)
 */
export function buildDetailedPortalArch(
  ringHex: number,
  coreHex: number,
  uniforms: SharedWorldShaderUniforms,
  pack: ArchMaterialPack,
  trackGeo: TrackGeoFn,
  trackMat: TrackMatFn
): THREE.Group {
  const g = new THREE.Group();
  const runeMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: ringHex,
      emissive: ringHex,
      emissiveIntensity: 0.6,
      roughness: 0.3,
    })
  );
  applyArchitectureShader(runeMat, uniforms, 'crystal');
  const coreMat = trackMat(
    new THREE.MeshBasicMaterial({
      color: coreHex,
      transparent: true,
      opacity: 0.62,
      side: THREE.DoubleSide,
    })
  );

  // Stepped masonry shrine threshold
  const step = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(1.38, 1.54, 0.22, 12)), pack.masonry);
  step.position.y = 0.11;
  step.receiveShadow = true;

  const colGeo = trackGeo(new THREE.CylinderGeometry(0.17, 0.23, 1.02, 8));
  const capGeo = trackGeo(new THREE.BoxGeometry(0.46, 0.18, 0.46));
  const brazierGeo = trackGeo(new THREE.CylinderGeometry(0.14, 0.1, 0.34, 8));
  const flameGeo = trackGeo(new THREE.OctahedronGeometry(0.14, 0));

  for (const sx of [-0.84, 0.84]) {
    const col = new THREE.Mesh(colGeo, pack.masonry);
    col.position.set(sx, 0.66, 0);
    col.castShadow = true;
    const cap = new THREE.Mesh(capGeo, runeMat);
    cap.position.set(sx, 1.18, 0);
    const brazier = new THREE.Mesh(brazierGeo, pack.darkSlate);
    brazier.position.set(sx * 1.48, 0.38, 0.35);
    const flame = new THREE.Mesh(flameGeo, runeMat);
    flame.position.set(sx * 1.48, 0.64, 0.35);
    g.add(col, cap, brazier, flame);
  }

  const arch = new THREE.Mesh(trackGeo(new THREE.TorusGeometry(0.84, 0.16, 10, 24, Math.PI)), runeMat);
  arch.position.y = 1.14;
  const keystone = new THREE.Mesh(trackGeo(new THREE.OctahedronGeometry(0.24, 0)), pack.gold);
  keystone.position.y = 2.04;

  const core = new THREE.Mesh(trackGeo(new THREE.CircleGeometry(0.74, 22)), coreMat);
  core.position.y = 1.06;
  core.name = 'portalCore';

  g.add(step, arch, keystone, core);
  return g;
}

/**
 * Glowdeep Nana Mochi Hearth & Soup Cauldron
 */
export function buildDetailedCauldronShrine(
  pack: ArchMaterialPack,
  trackGeo: TrackGeoFn,
  trackMat: TrackMatFn
): { group: THREE.Group; bubbles: THREE.Mesh[] } {
  const cG = new THREE.Group();
  const ironMat = trackMat(new THREE.MeshStandardMaterial({ color: 0x3b314a, roughness: 0.42, metalness: 0.64 }));
  const soupMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x64f5c1,
      emissive: 0x38e8a8,
      emissiveIntensity: 0.95,
      roughness: 0.16,
    })
  );
  const emberMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xff7b4d,
      emissive: 0xff5226,
      emissiveIntensity: 0.9,
    })
  );
  const bubbleMat = trackMat(new THREE.MeshBasicMaterial({ color: 0xb2ffe4, transparent: true, opacity: 0.85 }));

  const hearth = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(1.18, 1.32, 0.22, 12)), pack.basalt);
  hearth.position.y = 0.11;
  const coals = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.75, 0.85, 0.1, 12)), emberMat);
  coals.position.y = 0.24;

  const pot = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.76, 16, 12)), ironMat);
  pot.position.y = 0.64;
  pot.scale.set(1.14, 0.82, 1.14);
  pot.castShadow = true;

  const rim = new THREE.Mesh(trackGeo(new THREE.TorusGeometry(0.74, 0.08, 8, 22)), pack.gold);
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 1.02;

  const soup = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.68, 0.68, 0.08, 18)), soupMat);
  soup.position.y = 1.02;

  const ladleHandle = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.04, 0.05, 1.05, 6)), pack.timber);
  ladleHandle.position.set(0.32, 1.28, 0.16);
  ladleHandle.rotation.z = -0.58;

  // Spice barrel beside hearth
  const spiceCrate = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.42, 0.34, 0.42)), pack.timber);
  spiceCrate.position.set(-1.18, 0.28, 0.38);

  const bubbles: THREE.Mesh[] = [];
  const bubGeo = trackGeo(new THREE.SphereGeometry(0.11, 8, 6));
  for (let b = 0; b < 4; b++) {
    const bub = new THREE.Mesh(bubGeo, bubbleMat);
    bub.position.set(Math.cos(b * 1.6) * 0.26, 1.1 + b * 0.14, Math.sin(b * 1.6) * 0.26);
    cG.add(bub);
    bubbles.push(bub);
  }

  cG.add(hearth, coals, pot, rim, soup, ladleHandle, spiceCrate);
  return { group: cG, bubbles };
}

/**
 * Moon Road Celestial Tea House Pavilion
 */
export function buildDetailedTeaHouseGazebo(
  pack: ArchMaterialPack,
  trackGeo: TrackGeoFn,
  trackMat: TrackMatFn
): { group: THREE.Group; crescent: THREE.Mesh } {
  const tG = new THREE.Group();
  const domeMat = pack.shinglePlum;

  const terrace = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(1.75, 1.92, 0.24, 8)), pack.marble);
  terrace.position.y = 0.12;
  terrace.receiveShadow = true;

  const pGeo = trackGeo(new THREE.CylinderGeometry(0.1, 0.14, 1.65, 8));
  const lantGeo = trackGeo(new THREE.SphereGeometry(0.13, 8, 6));
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI * 2;
    const px = Math.cos(a) * 1.38;
    const pz = Math.sin(a) * 1.2;
    const p = new THREE.Mesh(pGeo, pack.marble);
    p.position.set(px, 1.0, pz);
    const l = new THREE.Mesh(lantGeo, pack.gold);
    l.position.set(px * 1.06, 1.64, pz * 1.06);
    tG.add(p, l);
  }

  const roof = new THREE.Mesh(
    trackGeo(new THREE.SphereGeometry(1.78, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.5)),
    domeMat
  );
  roof.position.y = 1.72;
  roof.scale.set(1.06, 0.68, 0.94);

  const roofTrim = new THREE.Mesh(trackGeo(new THREE.TorusGeometry(1.74, 0.07, 8, 24)), pack.gold);
  roofTrim.rotation.x = Math.PI / 2;
  roofTrim.position.y = 1.74;
  roofTrim.scale.set(1.06, 0.94, 1);

  const crescent = new THREE.Mesh(trackGeo(new THREE.OctahedronGeometry(0.3, 0)), pack.gold);
  crescent.position.y = 3.06;

  // Low tea table + glowing teapot
  const table = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.58, 0.46, 0.42, 12)), pack.timber);
  table.position.y = 0.42;
  const pot = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.16, 10, 8)), pack.gold);
  pot.position.y = 0.72;

  tG.add(terrace, roof, roofTrim, crescent, table, pot);
  return { group: tG, crescent };
}

/**
 * Striped Storybook Market Stall (`dk === 17`):
 * Timber counter, alternating striped sloped canvas canopy, front hanging sign,
 * brass hanging lantern, side crate/barrel, and curated merchandise display.
 */
export function buildDetailedMarketStall(
  variant: 'bakery' | 'produce' | 'alchemy' | 'fish' = 'bakery',
  uniforms: SharedWorldShaderUniforms,
  pack: ArchMaterialPack,
  trackGeo: TrackGeoFn,
  trackMat: TrackMatFn
): THREE.Group {
  const g = new THREE.Group();
  const stripeHex =
    variant === 'bakery'
      ? 0xff7096
      : variant === 'produce'
      ? 0xf5a638
      : variant === 'alchemy'
      ? 0x8e66e6
      : 0x3baad9;
  const stripeMat = trackMat(new THREE.MeshStandardMaterial({ color: stripeHex, roughness: 0.56 }));
  const creamMat = trackMat(new THREE.MeshStandardMaterial({ color: 0xfff9ee, roughness: 0.62 }));
  applyArchitectureShader(stripeMat, uniforms, 'shingles');

  const basePlinth = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(1.56, 0.08, 1.02)), pack.masonry);
  basePlinth.position.y = 0.04;
  basePlinth.receiveShadow = true;

  const counter = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(1.38, 0.44, 0.62)), pack.timber);
  counter.position.set(0, 0.28, 0.08);
  counter.castShadow = true;
  counter.receiveShadow = true;

  const counterTop = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(1.48, 0.06, 0.7)), pack.copper);
  counterTop.position.set(0, 0.51, 0.08);
  counterTop.castShadow = true;

  // Front wooden apron & menu plaque
  const signBoard = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.68, 0.22, 0.05)), creamMat);
  signBoard.position.set(0, 0.28, 0.41);

  // 4 Timber canopy corner posts
  const postGeo = trackGeo(new THREE.CylinderGeometry(0.042, 0.052, 1.18, 6));
  for (const [px, pz] of [
    [-0.64, -0.26],
    [0.64, -0.26],
    [-0.64, 0.36],
    [0.64, 0.36],
  ]) {
    const p = new THREE.Mesh(postGeo, pack.timber);
    p.position.set(px, 0.68, pz);
    p.castShadow = true;
    g.add(p);
  }

  // Alternating striped canvas awning roof + scalloped front valance
  const stripGeo = trackGeo(new THREE.BoxGeometry(0.24, 0.06, 0.98));
  const valGeo = trackGeo(new THREE.SphereGeometry(0.11, 7, 5));
  for (let i = 0; i < 6; i++) {
    const sx = -0.6 + i * 0.24;
    const mat = i % 2 === 0 ? stripeMat : creamMat;
    const slat = new THREE.Mesh(stripGeo, mat);
    slat.position.set(sx, 1.32, 0.06);
    slat.rotation.x = 0.22;
    slat.castShadow = true;
    const val = new THREE.Mesh(valGeo, mat);
    val.position.set(sx, 1.18, 0.52);
    val.scale.set(1.05, 0.72, 0.35);
    g.add(slat, val);
  }

  // Hanging warm stall lantern
  const hook = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.05, 0.05, 0.24)), pack.darkSlate);
  hook.position.set(0.54, 1.18, 0.46);
  const lamp = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.09, 8, 6)), pack.warmWindow);
  lamp.position.set(0.54, 1.06, 0.56);

  // Merchandise atop counter tailored to market variant
  if (variant === 'alchemy') {
    for (let j = 0; j < 3; j++) {
      const jar = new THREE.Mesh(
        trackGeo(new THREE.SphereGeometry(0.1, 8, 6)),
        j === 1 ? pack.crystalViolet : pack.crystalCyan
      );
      jar.scale.set(0.95, 1.25, 0.95);
      jar.position.set(-0.34 + j * 0.34, 0.64, 0.08);
      g.add(jar);
    }
  } else if (variant === 'fish') {
    const tray = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.68, 0.08, 0.36)), pack.marble);
    tray.position.set(-0.2, 0.58, 0.08);
    const fishA = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.09, 7, 5)), pack.crystalCyan);
    fishA.scale.set(1.8, 0.65, 0.8);
    fishA.position.set(-0.32, 0.64, 0.08);
    const fishB = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.09, 7, 5)), pack.shingleCoral);
    fishB.scale.set(1.7, 0.65, 0.8);
    fishB.position.set(-0.08, 0.64, 0.14);
    const jar = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.1, 0.08, 0.22, 8)), pack.gold);
    jar.position.set(0.36, 0.65, 0.08);
    g.add(tray, fishA, fishB, jar);
  } else {
    // Bakery loaves/tarts or orchard produce baskets
    const loafMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: variant === 'bakery' ? 0xe0924b : 0xff627d,
        roughness: 0.6,
      })
    );
    const basketGeo = trackGeo(new THREE.CylinderGeometry(0.18, 0.14, 0.12, 8));
    const itemGeo = trackGeo(new THREE.SphereGeometry(0.09, 7, 6));
    for (const bx of [-0.36, 0.02, 0.38]) {
      const b = new THREE.Mesh(basketGeo, pack.copper);
      b.position.set(bx, 0.59, 0.08);
      const it = new THREE.Mesh(itemGeo, bx === 0.38 ? pack.gold : loafMat);
      it.position.set(bx, 0.68, 0.08);
      g.add(b, it);
    }
  }

  // Side wooden barrel
  const barrel = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.16, 0.14, 0.34, 9)), pack.timber);
  barrel.position.set(-0.84, 0.22, 0.08);
  barrel.castShadow = true;

  g.add(basePlinth, counter, counterTop, signBoard, hook, lamp, barrel);
  return g;
}

/**
 * Storybook Covered Town Wishing Well (`dk === 18`)
 */
export function buildDetailedTownWell(
  pack: ArchMaterialPack,
  trackGeo: TrackGeoFn,
  trackMat: TrackMatFn
): THREE.Group {
  const g = new THREE.Group();
  const base = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.66, 0.74, 0.14, 12)), pack.masonry);
  base.position.y = 0.07;
  base.receiveShadow = true;

  const curb = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.5, 0.54, 0.44, 12)), pack.masonry);
  curb.position.y = 0.34;
  curb.castShadow = true;

  const waterDisc = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.38, 0.38, 0.04, 12)), pack.waterPool);
  waterDisc.position.y = 0.55;

  const postGeo = trackGeo(new THREE.CylinderGeometry(0.05, 0.055, 0.94, 7));
  for (const px of [-0.42, 0.42]) {
    const post = new THREE.Mesh(postGeo, pack.timber);
    post.position.set(px, 0.96, 0);
    post.castShadow = true;
    g.add(post);
  }

  const spindle = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.04, 0.04, 0.88, 6)), pack.timber);
  spindle.rotation.z = Math.PI / 2;
  spindle.position.set(0, 1.04, 0);

  const bucket = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.11, 0.09, 0.18, 8)), pack.copper);
  bucket.position.set(0, 0.78, 0);

  const roof = new THREE.Mesh(trackGeo(new THREE.ConeGeometry(0.76, 0.52, 4)), pack.shingleCoral);
  roof.position.y = 1.62;
  roof.rotation.y = Math.PI / 4;
  roof.castShadow = true;

  const lamp = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.08, 8, 6)), pack.warmWindow);
  lamp.position.set(0.36, 1.24, 0.2);

  g.add(base, curb, waterDisc, spindle, bucket, roof, lamp);
  return g;
}

/**
 * Walkable Festival Bunting Arch & Hanging Street Garland (`dk === 19`)
 * Twin outer timber posts (>= 1.8m clearance) let Mochi stroll right underneath.
 */
export function buildDetailedFestivalArch(
  uniforms: SharedWorldShaderUniforms,
  pack: ArchMaterialPack,
  trackGeo: TrackGeoFn,
  trackMat: TrackMatFn
): THREE.Group {
  const g = new THREE.Group();
  const flagCols = [0xff7aa8, 0xffd23f, 0x6ac7ff, 0x7bd88f];
  const flagMats = flagCols.map((hex) => {
    const m = trackMat(new THREE.MeshStandardMaterial({ color: hex, roughness: 0.48 }));
    applyArchitectureShader(m, uniforms, 'shingles');
    return m;
  });

  const postGeo = trackGeo(new THREE.CylinderGeometry(0.065, 0.085, 2.04, 8));
  const plinthGeo = trackGeo(new THREE.BoxGeometry(0.24, 0.16, 0.24));
  for (const sx of [-0.96, 0.96]) {
    const plinth = new THREE.Mesh(plinthGeo, pack.masonry);
    plinth.position.set(sx, 0.08, 0);
    const post = new THREE.Mesh(postGeo, pack.timber);
    post.position.set(sx, 1.02, 0);
    post.castShadow = true;
    const cap = new THREE.Mesh(trackGeo(new THREE.OctahedronGeometry(0.11, 0)), pack.gold);
    cap.position.set(sx, 2.1, 0);
    g.add(plinth, post, cap);
  }

  const beam = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(2.18, 0.1, 0.1)), pack.timber);
  beam.position.set(0, 1.98, 0);
  beam.castShadow = true;

  const flagGeo = trackGeo(new THREE.ConeGeometry(0.11, 0.24, 3));
  flagGeo.rotateX(Math.PI);
  for (let i = 0; i < 6; i++) {
    const fx = -0.68 + i * 0.27;
    const sag = Math.sin(((i + 0.5) / 6) * Math.PI) * 0.14;
    const fl = new THREE.Mesh(flagGeo, flagMats[i % flagMats.length]);
    fl.position.set(fx, 1.84 - sag, 0);
    g.add(fl);
  }

  const orbGeo = trackGeo(new THREE.SphereGeometry(0.085, 8, 6));
  for (const lx of [-0.46, 0, 0.46]) {
    const orb = new THREE.Mesh(orbGeo, pack.warmWindow);
    orb.position.set(lx, 1.84 - (lx === 0 ? 0.1 : 0.04), 0.09);
    g.add(orb);
  }

  g.add(beam);
  return g;
}

/**
 * Flower & Cider Market Pushcart (`dk === 20`)
 */
export function buildDetailedFlowerCart(
  pack: ArchMaterialPack,
  trackGeo: TrackGeoFn,
  trackMat: TrackMatFn
): THREE.Group {
  const g = new THREE.Group();
  const petalCols = [0xff7aa8, 0xffd23f, 0x9b82ff, 0xff9f5a];
  const petalMats = petalCols.map((c) => trackMat(new THREE.MeshStandardMaterial({ color: c, roughness: 0.55 })));
  const leafMat = trackMat(new THREE.MeshStandardMaterial({ color: 0x43a867, roughness: 0.72 }));

  const bed = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(1.16, 0.24, 0.68)), pack.timber);
  bed.position.y = 0.36;
  bed.castShadow = true;

  const wheelGeo = trackGeo(new THREE.TorusGeometry(0.22, 0.045, 7, 14));
  for (const wz of [-0.38, 0.38]) {
    const w = new THREE.Mesh(wheelGeo, pack.copper);
    w.position.set(-0.22, 0.24, wz);
    const hub = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.05, 0.05, 0.08, 6)), pack.gold);
    hub.rotation.x = Math.PI / 2;
    hub.position.set(-0.22, 0.24, wz);
    g.add(w, hub);
  }

  const propLeg = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.04, 0.04, 0.28, 6)), pack.timber);
  propLeg.position.set(0.42, 0.14, 0);
  const handle = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.36, 0.05, 0.44)), pack.timber);
  handle.position.set(0.68, 0.38, 0);

  const potGeo = trackGeo(new THREE.CylinderGeometry(0.14, 0.1, 0.14, 7));
  const bloomGeo = trackGeo(new THREE.SphereGeometry(0.15, 7, 6));
  for (let i = 0; i < 4; i++) {
    const px = -0.36 + (i % 2) * 0.48;
    const pz = i < 2 ? -0.15 : 0.16;
    const pot = new THREE.Mesh(potGeo, pack.copper);
    pot.position.set(px, 0.52, pz);
    const foliage = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.16, 7, 5)), leafMat);
    foliage.position.set(px, 0.62, pz);
    const fl = new THREE.Mesh(bloomGeo, petalMats[i]);
    fl.position.set(px, 0.72, pz);
    g.add(pot, foliage, fl);
  }

  g.add(bed, propLeg, handle);
  return g;
}

/**
 * Cozy Outdoor Tea Café Bistro Table, Striped Parasol & Stools (`dk === 21`)
 */
export function buildDetailedBistroSet(
  pack: ArchMaterialPack,
  trackGeo: TrackGeoFn,
  trackMat: TrackMatFn
): THREE.Group {
  const g = new THREE.Group();
  const parasolMat = trackMat(new THREE.MeshStandardMaterial({ color: 0xff8ab4, roughness: 0.55, side: THREE.DoubleSide }));
  const linenMat = trackMat(new THREE.MeshStandardMaterial({ color: 0xfff8ef, roughness: 0.65 }));

  const tableBase = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.14, 0.24, 0.12, 8)), pack.darkSlate);
  tableBase.position.y = 0.06;
  const tableStem = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.05, 0.05, 0.48, 8)), pack.darkSlate);
  tableStem.position.y = 0.3;
  const tableTop = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.44, 0.44, 0.06, 14)), linenMat);
  tableTop.position.y = 0.54;
  tableTop.castShadow = true;

  // Teapot & pastry plate on table
  const teapot = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.09, 8, 6)), pack.crystalCyan);
  teapot.position.set(-0.08, 0.65, 0.04);
  const cup = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.045, 0.035, 0.07, 7)), pack.gold);
  cup.position.set(0.14, 0.61, -0.04);

  // Parasol pole & wide dome umbrella
  const pole = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.035, 0.035, 1.38, 6)), pack.timber);
  pole.position.y = 1.24;
  const canopy = new THREE.Mesh(trackGeo(new THREE.ConeGeometry(0.86, 0.36, 8)), parasolMat);
  canopy.position.y = 1.94;
  canopy.castShadow = true;
  const finial = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.06, 6, 6)), pack.gold);
  finial.position.y = 2.15;

  // Two cafe stools flanking the table
  const seatGeo = trackGeo(new THREE.CylinderGeometry(0.15, 0.14, 0.07, 10));
  const stoolLegGeo = trackGeo(new THREE.CylinderGeometry(0.05, 0.09, 0.3, 7));
  for (const sx of [-0.58, 0.58]) {
    const leg = new THREE.Mesh(stoolLegGeo, pack.timber);
    leg.position.set(sx, 0.15, 0);
    const seat = new THREE.Mesh(seatGeo, pack.shingleTeal);
    seat.position.set(sx, 0.32, 0);
    g.add(leg, seat);
  }

  g.add(tableBase, tableStem, tableTop, teapot, cup, pole, canopy, finial);
  return g;
}

/**
 * Coastal Wharf Bollard, Cargo Crates & Dock Lantern (`dk === 22`, Walkable decorative edge cluster)
 */
export function buildDetailedHarborPierCluster(
  pack: ArchMaterialPack,
  trackGeo: TrackGeoFn,
  trackMat: TrackMatFn
): THREE.Group {
  const g = new THREE.Group();
  const ropeMat = trackMat(new THREE.MeshStandardMaterial({ color: 0xd9be8a, roughness: 0.85 }));

  const bollard = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.12, 0.15, 0.56, 8)), pack.timber);
  bollard.position.set(-0.26, 0.28, -0.18);
  bollard.castShadow = true;

  const rope = new THREE.Mesh(trackGeo(new THREE.TorusGeometry(0.15, 0.04, 6, 12)), ropeMat);
  rope.rotation.x = Math.PI / 2;
  rope.position.set(-0.26, 0.18, -0.18);

  const crateA = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.36, 0.32, 0.36)), pack.copper);
  crateA.position.set(0.24, 0.16, 0.14);
  crateA.rotation.y = 0.28;
  crateA.castShadow = true;

  const crateB = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.24, 0.22, 0.24)), pack.timber);
  crateB.position.set(0.22, 0.43, 0.14);
  crateB.rotation.y = -0.35;

  const lamp = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.085, 8, 6)), pack.warmWindow);
  lamp.position.set(-0.26, 0.62, -0.18);

  g.add(bollard, rope, crateA, crateB, lamp);
  return g;
}

/**
 * Interactive Town Bulletin Noticeboard (`dk === 23`):
 * Pinned parchment notices, shingled rain hood & brass beacon lantern.
 */
export function buildDetailedNoticeboard(
  pack: ArchMaterialPack,
  trackGeo: TrackGeoFn,
  trackMat: TrackMatFn
): THREE.Group {
  const g = new THREE.Group();
  const corkMat = trackMat(new THREE.MeshStandardMaterial({ color: 0xb98253, roughness: 0.86 }));
  const paperMat = trackMat(new THREE.MeshStandardMaterial({ color: 0xfff7e2, roughness: 0.6 }));

  const plinth = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(1.18, 0.14, 0.42)), pack.masonry);
  plinth.position.y = 0.07;

  const postGeo = trackGeo(new THREE.BoxGeometry(0.1, 1.38, 0.1));
  for (const px of [-0.48, 0.48]) {
    const p = new THREE.Mesh(postGeo, pack.timber);
    p.position.set(px, 0.74, 0);
    p.castShadow = true;
    g.add(p);
  }

  const boardFrame = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.96, 0.7, 0.08)), pack.timber);
  boardFrame.position.set(0, 0.96, 0);
  boardFrame.castShadow = true;

  const cork = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.84, 0.56, 0.1)), corkMat);
  cork.position.set(0, 0.96, 0);

  // Pinned community notice sheets + wax pin dots
  const sheetGeo = trackGeo(new THREE.BoxGeometry(0.22, 0.24, 0.02));
  const pinGeo = trackGeo(new THREE.SphereGeometry(0.025, 6, 5));
  for (const [nx, ny, rot] of [
    [-0.24, 1.04, 0.06],
    [0.04, 1.01, -0.05],
    [0.26, 0.88, 0.08],
    [-0.18, 0.84, -0.04],
  ]) {
    const sh = new THREE.Mesh(sheetGeo, paperMat);
    sh.position.set(nx, ny, 0.06);
    sh.rotation.z = rot;
    const pin = new THREE.Mesh(pinGeo, pack.shingleCoral);
    pin.position.set(nx, ny + 0.08, 0.075);
    g.add(sh, pin);
  }

  // Shingled gable rain hood & glowing notice lamp
  const hood = new THREE.Mesh(trackGeo(new THREE.ConeGeometry(0.74, 0.34, 4)), pack.shingleTeal);
  hood.position.set(0, 1.48, 0);
  hood.rotation.y = Math.PI / 4;
  hood.scale.set(1.25, 1, 0.62);
  hood.castShadow = true;

  const lamp = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.085, 8, 6)), pack.warmWindow);
  lamp.position.set(0, 1.33, 0.24);

  g.add(plinth, boardFrame, cork, hood, lamp);
  return g;
}
