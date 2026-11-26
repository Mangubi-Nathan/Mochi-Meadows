/**
 * Mochi Meadows 2 — Full 3D Mochi House Interior (6 Connected Architectural Rooms)
 *
 * Architectural Floorplan (Local House Units; 1 unit = T = 40px, centered at HOUSE_ORIGIN_TX/TZ):
 *   North (dz = -7.5)
 *   ┌──────────────────┬──────────────────┬──────────────────┐
 *   │     BEDROOM      │  STUDY & STUDIO  │     SUNROOM      │
 *   │   (-10.5..-3.5)  │   (-3.5..+3.5)   │   CONSERVATORY   │
 *   │    (-7.5..0)     │    (-7.5..0)     │  (+3.5..+10.5)   │
 *   ├───── arch ───────┼───── arch ───────┼───── arch ───────┤
 *   │  KITCHEN & TEA   │   LIVING ROOM    │   BATH & REEF    │
 *   │   (-10.5..-3.5)  │    & FOYER       │      SPA         │
 *   │     (0..+7.5)    │   (-3.5..+3.5)   │  (+3.5..+10.5)   │
 *   └──────────────────┴── [FRONT DOOR] ──┴──────────────────┘
 *   South (dz = +7.5)
 */

import * as THREE from 'three';
import { T, WeatherId } from './constants';
import { CottageDecoration, CottageState, HouseRoomId } from './engine';
import { ArchMaterialPack, TrackGeoFn, TrackMatFn } from './architecturePack3D';

export const HOUSE_ORIGIN_TX = 130;
export const HOUSE_ORIGIN_TZ = 130;
export const HOUSE_HALF_W = 10.5;
export const HOUSE_HALF_D = 7.5;

export const HOUSE_SPAWN_POS = {
  x: HOUSE_ORIGIN_TX * T,
  y: (HOUSE_ORIGIN_TZ + 5.75) * T,
};

export const HOUSE_DOOR_POS = {
  x: HOUSE_ORIGIN_TX * T,
  y: (HOUSE_ORIGIN_TZ + 6.9) * T,
};

interface LocalBoxCollider {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

const ROOM_LOCAL_BOUNDS: Record<
  HouseRoomId,
  { minX: number; maxX: number; minZ: number; maxZ: number; floorPadX: number; floorPadZ: number }
> = {
  bedroom: { minX: -10.5, maxX: -3.5, minZ: -7.5, maxZ: 0, floorPadX: 1.0, floorPadZ: 1.0 },
  study: { minX: -3.5, maxX: 3.5, minZ: -7.5, maxZ: 0, floorPadX: 1.0, floorPadZ: 1.0 },
  conservatory: { minX: 3.5, maxX: 10.5, minZ: -7.5, maxZ: 0, floorPadX: 0.9, floorPadZ: 0.95 },
  kitchen: { minX: -10.5, maxX: -3.5, minZ: 0, maxZ: 7.5, floorPadX: 1.0, floorPadZ: 1.0 },
  living: { minX: -3.5, maxX: 3.5, minZ: 0, maxZ: 7.5, floorPadX: 0.95, floorPadZ: 0.95 },
  bath: { minX: 3.5, maxX: 10.5, minZ: 0, maxZ: 7.5, floorPadX: 0.95, floorPadZ: 0.95 },
};

// Partition walls with framed 2.4-unit arched doorways left open, plus immovable furniture footprints
const INTERIOR_COLLIDERS: LocalBoxCollider[] = [
  // Internal North-South partition along x = -3.5 (doorways at z = -3.75 and z = +3.75)
  { minX: -3.68, maxX: -3.32, minZ: -7.5, maxZ: -5.0 },
  { minX: -3.68, maxX: -3.32, minZ: -2.5, maxZ: 2.5 },
  { minX: -3.68, maxX: -3.32, minZ: 5.0, maxZ: 7.5 },

  // Internal North-South partition along x = +3.5 (doorways at z = -3.75 and z = +3.75)
  { minX: 3.32, maxX: 3.68, minZ: -7.5, maxZ: -5.0 },
  { minX: 3.32, maxX: 3.68, minZ: -2.5, maxZ: 2.5 },
  { minX: 3.32, maxX: 3.68, minZ: 5.0, maxZ: 7.5 },

  // Internal East-West partition along z = 0 (doorways at x = -7.0, x = 0, x = +7.0)
  { minX: -10.5, maxX: -8.25, minZ: -0.18, maxZ: 0.18 },
  { minX: -5.75, maxX: -1.25, minZ: -0.18, maxZ: 0.18 },
  { minX: 1.25, maxX: 5.75, minZ: -0.18, maxZ: 0.18 },
  { minX: 8.25, maxX: 10.5, minZ: -0.18, maxZ: 0.18 },

  // Living Room furniture (Hearth left wall, Sofa center-back, Music box table right)
  { minX: -3.35, maxX: -1.75, minZ: 0.4, maxZ: 2.2 }, // Brick Hearth
  { minX: -1.45, maxX: 1.45, minZ: 1.65, maxZ: 2.85 }, // Cloud Sofa
  { minX: 1.75, maxX: 3.1, minZ: 1.25, maxZ: 2.4 }, // Music Box Side Table

  // Kitchen furniture (Back/West counter + fridge + breakfast table)
  { minX: -10.35, maxX: -4.85, minZ: 0.35, maxZ: 1.6 }, // Counter, Oven & Kettle
  { minX: -10.35, maxX: -8.75, minZ: 4.35, maxZ: 6.2 }, // Cold-Mist Icebox Fridge
  { minX: -7.85, maxX: -5.85, minZ: 3.6, maxZ: 5.2 }, // Breakfast Table

  // Bedroom furniture (Four-Poster Bed, Wardrobe left, Nightstand right)
  { minX: -10.3, maxX: -8.75, minZ: -6.9, maxZ: -5.0 }, // Carved Wardrobe
  { minX: -8.2, maxX: -5.3, minZ: -7.15, maxZ: -4.2 }, // Four-Poster Bed
  { minX: -5.1, maxX: -3.95, minZ: -6.95, maxZ: -5.7 }, // Bedside Lamp Nightstand

  // Study furniture (Twin Bookcases back wall, Writing Desk center, Telescope corner)
  { minX: -3.15, maxX: -1.2, minZ: -7.25, maxZ: -6.1 }, // Left Bookcase
  { minX: 1.2, maxX: 3.15, minZ: -7.25, maxZ: -6.1 }, // Right Bookcase
  { minX: -1.15, maxX: 1.15, minZ: -4.75, maxZ: -3.2 }, // Song Weaver Desk
  { minX: 1.85, maxX: 3.05, minZ: -2.4, maxZ: -1.15 }, // Brass Telescope Tripod

  // Sunroom Conservatory furniture (Cedar Potting Bench along north glass wall)
  { minX: 4.75, maxX: 9.6, minZ: -6.95, maxZ: -5.45 }, // Potting Bench

  // Bath & Reef Spa furniture (Cedar Tub + Bath Stool; Aquarium is flush on East wall)
  { minX: 4.75, maxX: 7.45, minZ: 3.3, maxZ: 5.55 }, // Cedar Soaking Tub
  { minX: 8.65, maxX: 10.2, minZ: 2.1, maxZ: 5.5 }, // Wall Aquarium Bench
];

export type HouseInteractionAction =
  | 'exit_house'
  | 'toggle_fireplace'
  | 'play_music_box'
  | 'lounge_sofa'
  | 'bake_muffin'
  | 'brew_tea'
  | 'icebox_snack'
  | 'rest_bed'
  | 'toggle_lamp'
  | 'open_wardrobe'
  | 'open_songweaver'
  | 'stargaze'
  | 'open_sunroom'
  | 'soak_tub'
  | 'open_aquarium';

export interface HouseInteractable {
  id: HouseInteractionAction;
  label: string;
  icon: string;
  room: HouseRoomId;
  localX: number;
  localZ: number;
  radius: number;
}

export const HOUSE_INTERACTABLES: HouseInteractable[] = [
  { id: 'exit_house', label: 'Step Outside', icon: '🚪', room: 'living', localX: 0, localZ: 6.75, radius: 1.65 },
  { id: 'toggle_fireplace', label: 'Hearth Fire', icon: '🔥', room: 'living', localX: -2.35, localZ: 1.9, radius: 1.9 },
  { id: 'lounge_sofa', label: 'Curl Up on Sofa', icon: '🛋️', room: 'living', localX: 0, localZ: 3.0, radius: 1.85 },
  { id: 'play_music_box', label: 'Play Music Box', icon: '🎠', room: 'living', localX: 2.3, localZ: 2.35, radius: 1.8 },

  { id: 'bake_muffin', label: 'Cloud Pastry Oven', icon: '🧁', room: 'kitchen', localX: -8.6, localZ: 1.85, radius: 1.85 },
  { id: 'brew_tea', label: 'Steep Copper Kettle', icon: '🫖', room: 'kitchen', localX: -6.3, localZ: 1.85, radius: 1.85 },
  { id: 'icebox_snack', label: 'Cold-Mist Icebox', icon: '🍓', room: 'kitchen', localX: -8.55, localZ: 5.2, radius: 1.85 },

  { id: 'rest_bed', label: 'Rest in Patchwork Bed', icon: '🛏️', room: 'bedroom', localX: -6.75, localZ: -3.75, radius: 2.15 },
  { id: 'open_wardrobe', label: 'Carved Wardrobe', icon: '👒', room: 'bedroom', localX: -8.9, localZ: -4.65, radius: 1.95 },
  { id: 'toggle_lamp', label: 'Bedside Lamp', icon: '💡', room: 'bedroom', localX: -4.55, localZ: -5.3, radius: 1.85 },

  { id: 'open_songweaver', label: 'Song Weaver Desk', icon: '🎼', room: 'study', localX: 0, localZ: -3.1, radius: 2.0 },
  { id: 'stargaze', label: 'Brass Telescope', icon: '🔭', room: 'study', localX: 2.05, localZ: -1.85, radius: 1.95 },

  { id: 'open_sunroom', label: 'Tend Sunroom Planters', icon: '🌿', room: 'conservatory', localX: 7.0, localZ: -4.85, radius: 2.4 },

  { id: 'soak_tub', label: 'Cedar Soaking Tub', icon: '🛁', room: 'bath', localX: 6.1, localZ: 3.35, radius: 2.15 },
  { id: 'open_aquarium', label: 'Saltwater Reef Tank', icon: '🐠', room: 'bath', localX: 8.65, localZ: 3.85, radius: 2.1 },
];

export function getHouseRoomAt(worldX: number, worldY: number): HouseRoomId {
  const lx = worldX / T - HOUSE_ORIGIN_TX;
  const lz = worldY / T - HOUSE_ORIGIN_TZ;
  if (lz < 0) {
    if (lx < -3.5) return 'bedroom';
    if (lx > 3.5) return 'conservatory';
    return 'study';
  }
  if (lx < -3.5) return 'kitchen';
  if (lx > 3.5) return 'bath';
  return 'living';
}

export function getHouseRoomCenterWorld(room: HouseRoomId): { x: number; y: number } {
  const centers: Record<HouseRoomId, [number, number]> = {
    living: [0, 4.45],
    kitchen: [-6.85, 2.95],
    bedroom: [-6.75, -2.85],
    study: [0, -2.3],
    conservatory: [7.0, -3.5],
    bath: [7.1, 2.25],
  };
  const [lx, lz] = centers[room];
  return {
    x: (HOUSE_ORIGIN_TX + lx) * T,
    y: (HOUSE_ORIGIN_TZ + lz) * T,
  };
}

export function getNearestHouseInteractable(worldX: number, worldY: number): HouseInteractable | null {
  const lx = worldX / T - HOUSE_ORIGIN_TX;
  const lz = worldY / T - HOUSE_ORIGIN_TZ;
  let best: HouseInteractable | null = null;
  let bestDist = Infinity;
  for (const item of HOUSE_INTERACTABLES) {
    const d = Math.hypot(lx - item.localX, lz - item.localZ);
    if (d <= item.radius && d < bestDist) {
      bestDist = d;
      best = item;
    }
  }
  return best;
}

export function isHouseInteriorBlocked(worldX: number, worldY: number): boolean {
  const lx = worldX / T - HOUSE_ORIGIN_TX;
  const lz = worldY / T - HOUSE_ORIGIN_TZ;
  const pad = 0.28;
  // Outer walls boundary
  if (
    lx < -HOUSE_HALF_W + 0.42 ||
    lx > HOUSE_HALF_W - 0.42 ||
    lz < -HOUSE_HALF_D + 0.42 ||
    lz > HOUSE_HALF_D - 0.42
  ) {
    return true;
  }
  for (let i = 0; i < INTERIOR_COLLIDERS.length; i++) {
    const c = INTERIOR_COLLIDERS[i];
    if (lx + pad > c.minX && lx - pad < c.maxX && lz + pad > c.minZ && lz - pad < c.maxZ) {
      return true;
    }
  }
  return false;
}

export function mapRoomPercentToHouseWorld(room: HouseRoomId, xPct: number, yPct: number): { x: number; y: number; z: number } {
  const b = ROOM_LOCAL_BOUNDS[room] || ROOM_LOCAL_BOUNDS.living;
  const nx = Math.max(0.08, Math.min(0.92, xPct / 100));
  const nz = Math.max(0.15, Math.min(0.9, yPct / 100));
  const lx = b.minX + b.floorPadX + nx * (b.maxX - b.minX - b.floorPadX * 2);
  const lz = b.minZ + b.floorPadZ + nz * (b.maxZ - b.minZ - b.floorPadZ * 2);
  return { x: lx, y: 0.03, z: lz };
}

export const HOUSE_ROOM_LOCAL_CENTERS: Record<HouseRoomId, { x: number; z: number }> = {
  living: { x: 0, z: 3.75 },
  kitchen: { x: -7.0, z: 3.75 },
  bedroom: { x: -7.0, z: -3.75 },
  study: { x: 0, z: -3.75 },
  conservatory: { x: 7.0, z: -3.75 },
  bath: { x: 7.0, z: 3.75 },
};

export function unmapHouseWorldToRoomPercent(
  room: HouseRoomId,
  localX: number,
  localZ: number
): { x: number; y: number } {
  const b = ROOM_LOCAL_BOUNDS[room] || ROOM_LOCAL_BOUNDS.living;
  const spanX = Math.max(0.1, b.maxX - b.minX - b.floorPadX * 2);
  const spanZ = Math.max(0.1, b.maxZ - b.minZ - b.floorPadZ * 2);
  const nx = Math.max(0.08, Math.min(0.92, (localX - (b.minX + b.floorPadX)) / spanX));
  const nz = Math.max(0.15, Math.min(0.9, (localZ - (b.minZ + b.floorPadZ)) / spanZ));
  return {
    x: Math.round(nx * 100),
    y: Math.round(nz * 100),
  };
}

export interface HouseInteriorHandle {
  group: THREE.Group;
  setCutaway: (cutaway: boolean) => void;
  update: (
    time: number,
    cottage: CottageState | undefined,
    weatherId: WeatherId,
    aquariumFishList: string[]
  ) => void;
  dispose: () => void;
}

interface PlacedDecoEntry {
  key: string;
  mesh: THREE.Group;
  baseY: number;
  lastTrigger: number;
}

export function buildHouseInterior3D(
  pack: ArchMaterialPack,
  trackGeo: TrackGeoFn,
  trackMat: TrackMatFn
): HouseInteriorHandle {
  const root = new THREE.Group();
  const cutawayWallGroup = new THREE.Group();
  const ceilingGroup = new THREE.Group();
  root.add(cutawayWallGroup, ceilingGroup);

  // Materials dedicated to architectural interior
  const warmWallMat = trackMat(new THREE.MeshStandardMaterial({ color: 0xfff5e9, roughness: 0.85 }));
  const wainscotMat = trackMat(new THREE.MeshStandardMaterial({ color: 0xd9b396, roughness: 0.72 }));
  const kitchenWallMat = trackMat(new THREE.MeshStandardMaterial({ color: 0xfff9ee, roughness: 0.84 }));
  const bedroomWallMat = trackMat(new THREE.MeshStandardMaterial({ color: 0xf6eaf8, roughness: 0.84 }));
  const studyWallMat = trackMat(new THREE.MeshStandardMaterial({ color: 0xefe1d1, roughness: 0.82 }));
  const bathWallMat = trackMat(new THREE.MeshStandardMaterial({ color: 0xe8f6f8, roughness: 0.78 }));

  const oakFloorMat = trackMat(new THREE.MeshStandardMaterial({ color: 0xc5926b, roughness: 0.68 }));
  const walnutFloorMat = trackMat(new THREE.MeshStandardMaterial({ color: 0x8e5d3e, roughness: 0.64 }));
  const lavenderFloorMat = trackMat(new THREE.MeshStandardMaterial({ color: 0xd3a98d, roughness: 0.68 }));
  const tileCreamMat = trackMat(new THREE.MeshStandardMaterial({ color: 0xf4dec8, roughness: 0.56 }));
  const tileTerraMat = trackMat(new THREE.MeshStandardMaterial({ color: 0xde9e79, roughness: 0.62 }));
  const flagstoneMat = trackMat(new THREE.MeshStandardMaterial({ color: 0xc4beb4, roughness: 0.78 }));
  const spaTileMat = trackMat(new THREE.MeshStandardMaterial({ color: 0xdccbb8, roughness: 0.62 }));
  const yardGrassMat = trackMat(new THREE.MeshStandardMaterial({ color: 0x62bd6b, roughness: 0.9 }));

  const ironMat = trackMat(new THREE.MeshStandardMaterial({ color: 0x456e62, roughness: 0.42, metalness: 0.45 }));
  const glassMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xd2f5ff,
      roughness: 0.14,
      metalness: 0.08,
      transparent: true,
      opacity: 0.34,
      depthWrite: false,
    })
  );
  const brickMat = trackMat(new THREE.MeshStandardMaterial({ color: 0xc47360, roughness: 0.86 }));
  const creamCabinetMat = trackMat(new THREE.MeshStandardMaterial({ color: 0xfff3e2, roughness: 0.64 }));
  const pastelPinkMat = trackMat(new THREE.MeshStandardMaterial({ color: 0xffa6c4, roughness: 0.52 }));
  const sofaCreamMat = trackMat(new THREE.MeshStandardMaterial({ color: 0xffdfe9, roughness: 0.62 }));
  const mintFridgeMat = trackMat(new THREE.MeshStandardMaterial({ color: 0xa4e4e7, roughness: 0.32, metalness: 0.12 }));
  const softPlumMat = trackMat(new THREE.MeshStandardMaterial({ color: 0xb796e8, roughness: 0.62 }));
  const leafMat = trackMat(new THREE.MeshStandardMaterial({ color: 0x42ad65, roughness: 0.68 }));
  const cherryPetalMat = trackMat(new THREE.MeshStandardMaterial({ color: 0xff8ab5, roughness: 0.55 }));

  // Helper to add floor planes slightly raised or polygon-offset to avoid Z-fighting
  const addBox = (
    parent: THREE.Object3D,
    w: number,
    h: number,
    d: number,
    x: number,
    y: number,
    z: number,
    mat: THREE.Material,
    castShadow = true,
    receiveShadow = true
  ) => {
    const m = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(w, h, d)), mat);
    m.position.set(x, y, z);
    m.castShadow = castShadow;
    m.receiveShadow = receiveShadow;
    parent.add(m);
    return m;
  };

  // === 0. SURROUNDING SUNLIT GARDEN APRON (Seen through windows & conservatory glass) ===
  const gardenApron = new THREE.Mesh(trackGeo(new THREE.PlaneGeometry(34, 28)), yardGrassMat);
  gardenApron.rotation.x = -Math.PI / 2;
  gardenApron.position.set(0, -0.06, 0);
  gardenApron.receiveShadow = true;
  root.add(gardenApron);

  // Garden flower beds outside conservatory & windows
  const flowerBedGeo = trackGeo(new THREE.SphereGeometry(0.18, 7, 5));
  for (let i = 0; i < 16; i++) {
    const fx = 11.4 + (i % 3) * 0.7;
    const fz = -6.8 + i * 0.85;
    const bush = new THREE.Mesh(flowerBedGeo, leafMat);
    bush.position.set(fx, 0.08, fz);
    const bloom = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.08, 6, 5)), i % 2 === 0 ? cherryPetalMat : pack.gold);
    bloom.position.set(fx, 0.22, fz);
    root.add(bush, bloom);
  }

  // Stone foundation plinth seated cleanly below all room floors (prevents Y=0 coplanar Z-fighting)
  addBox(root, HOUSE_HALF_W * 2 + 0.6, 0.14, HOUSE_HALF_D * 2 + 0.6, 0, -0.105, 0, pack.masonry, false, true);

  // === 1. DISTINCTIVE 3D FLOORS FOR ALL 6 ROOMS (inset slightly so room slabs never share coplanar edges) ===
  // Living Room (South-Center: -3.5..3.5, 0..7.5)
  addBox(root, 6.96, 0.03, 7.46, 0, -0.015, 3.75, oakFloorMat, false, true);
  // Kitchen (South-West: -10.5..-3.5, 0..7.5) — 8x8 terracotta & cream checkerboard
  const checkW = 6.96 / 8;
  const checkD = 7.46 / 8;
  const checkTileGeo = trackGeo(new THREE.BoxGeometry(checkW - 0.012, 0.03, checkD - 0.012));
  for (let cx = 0; cx < 8; cx++) {
    for (let cz = 0; cz < 8; cz++) {
      const tile = new THREE.Mesh(checkTileGeo, (cx + cz) % 2 === 0 ? tileCreamMat : tileTerraMat);
      tile.position.set(-10.48 + (cx + 0.5) * checkW, -0.015, 0.02 + (cz + 0.5) * checkD);
      tile.receiveShadow = true;
      root.add(tile);
    }
  }
  // Bedroom (North-West: -10.5..-3.5, -7.5..0)
  addBox(root, 6.96, 0.03, 7.46, -7.0, -0.015, -3.75, lavenderFloorMat, false, true);
  // Study & Studio (North-Center: -3.5..3.5, -7.5..0)
  addBox(root, 6.96, 0.03, 7.46, 0, -0.015, -3.75, walnutFloorMat, false, true);
  // Sunroom Conservatory (North-East: 3.5..10.5, -7.5..0)
  addBox(root, 6.96, 0.03, 7.46, 7.0, -0.015, -3.75, flagstoneMat, false, true);
  // Bath & Reef Spa (South-East: 3.5..10.5, 0..7.5)
  addBox(root, 6.96, 0.03, 7.46, 7.0, -0.015, 3.75, spaTileMat, false, true);

  // === 2. ARCHITECTURAL WALLS, WAINSCOTING, ARCHED DOORWAYS & CONSERVATORY GLASS ===
  const wallH = 2.85;
  const wainscotH = 0.92;
  const addWallSegment = (
    parent: THREE.Object3D,
    len: number,
    thick: number,
    x: number,
    z: number,
    rotY: number,
    upperMat: THREE.Material
  ) => {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    g.rotation.y = rotY;
    // Lower timber wainscoting
    addBox(g, len, wainscotH, thick + 0.03, 0, wainscotH * 0.5, 0, wainscotMat, true, true);
    // Chair rail molding
    addBox(g, len + 0.04, 0.07, thick + 0.07, 0, wainscotH + 0.035, 0, pack.timber, false, true);
    // Upper plaster wall
    addBox(g, len, wallH - wainscotH, thick, 0, wainscotH + (wallH - wainscotH) * 0.5, 0, upperMat, true, true);
    // Crown molding
    addBox(g, len + 0.04, 0.08, thick + 0.06, 0, wallH + 0.04, 0, pack.timber, false, false);
    parent.add(g);
    return g;
  };

  const addDoorwayFrame = (x: number, z: number, rotY: number) => {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    g.rotation.y = rotY;
    // Twin vertical jamb posts + header lintel (opening width 2.24, height 2.2) — non-overlapping bounds
    addBox(g, 0.16, 2.22, 0.36, -1.16, 1.11, 0, pack.timber, true, true);
    addBox(g, 0.16, 2.22, 0.36, 1.16, 1.11, 0, pack.timber, true, true);
    addBox(g, 2.48, 0.56, 0.25, 0, 2.57, 0, warmWallMat, true, true);
    addBox(g, 2.58, 0.14, 0.38, 0, 2.22, 0, pack.timber, true, true);
    // Oak floor threshold strip cleanly above floor
    addBox(g, 2.28, 0.025, 0.36, 0, 0.016, 0, pack.timber, false, true);
    root.add(g);
  };

  // North Outer Wall (z = -7.5): Bedroom | Study | Sunroom Glass Wall (clean non-overlapping spans)
  addWallSegment(root, 6.96, 0.28, -7.02, -7.5, 0, bedroomWallMat);
  addWallSegment(root, 6.96, 0.28, 0.0, -7.5, 0, studyWallMat);
  // Conservatory North Glasshouse Wall (z = -7.5, x = 3.5..10.5)
  addBox(root, 6.96, 0.65, 0.28, 7.02, 0.325, -7.5, pack.masonry, true, true);
  addBox(root, 6.96, 2.16, 0.06, 7.02, 1.73, -7.5, glassMat, false, false);
  for (const mx of [3.62, 5.3, 7.0, 8.7, 10.42]) {
    addBox(root, 0.1, 2.22, 0.14, mx, 1.75, -7.5, ironMat, true, false);
  }
  addBox(root, 7.02, 0.12, 0.18, 7.02, 2.87, -7.5, ironMat, true, false);

  // West Outer Wall (x = -10.5): inset cleanly in Z so it never overlaps North/South/partition walls
  addWallSegment(root, 7.2, 0.28, -10.5, -3.76, Math.PI / 2, bedroomWallMat);
  addWallSegment(root, 7.2, 0.28, -10.5, 3.76, Math.PI / 2, kitchenWallMat);

  // East Outer Wall (x = +10.5): Sunroom Glasshouse Wall + Bath Spa Wall
  addBox(root, 0.28, 0.65, 7.2, 10.5, 0.325, -3.76, pack.masonry, true, true);
  addBox(root, 0.06, 2.16, 7.2, 10.5, 1.73, -3.76, glassMat, false, false);
  for (const mz of [-7.34, -5.0, -2.5, -0.16]) {
    addBox(root, 0.14, 2.22, 0.1, 10.5, 1.75, mz, ironMat, true, false);
  }
  addBox(root, 0.18, 0.12, 7.26, 10.5, 2.87, -3.76, ironMat, true, false);
  addWallSegment(root, 7.2, 0.28, 10.5, 3.76, Math.PI / 2, bathWallMat);

  // South Front Outer Wall (z = +7.5): Low front baseboard always visible + upper cutaway wall starting cleanly at y=0.36
  addBox(root, 9.2, 0.36, 0.27, -5.9, 0.18, 7.5, wainscotMat, true, true);
  addBox(root, 9.2, 0.36, 0.27, 5.9, 0.18, 7.5, wainscotMat, true, true);
  const addCutawayFrontWall = (len: number, cx: number, upperMat: THREE.Material) => {
    const g = new THREE.Group();
    g.position.set(cx, 0, 7.5);
    addBox(g, len, wainscotH - 0.36, 0.26, 0, 0.36 + (wainscotH - 0.36) * 0.5, 0, wainscotMat, true, true);
    addBox(g, len + 0.02, 0.07, 0.31, 0, wainscotH + 0.035, 0, pack.timber, false, true);
    addBox(g, len, wallH - wainscotH, 0.25, 0, wainscotH + (wallH - wainscotH) * 0.5, 0, upperMat, true, true);
    addBox(g, len + 0.02, 0.08, 0.3, 0, wallH + 0.04, 0, pack.timber, false, false);
    cutawayWallGroup.add(g);
  };
  addCutawayFrontWall(6.8, -7.0, kitchenWallMat);
  addCutawayFrontWall(2.26, -2.35, warmWallMat);
  addCutawayFrontWall(2.26, 2.35, warmWallMat);
  addCutawayFrontWall(6.8, 7.0, bathWallMat);

  // Front Entrance Door (x = 0, z = +7.5)
  addBox(root, 0.16, 0.36, 0.32, -1.05, 0.18, 7.5, pack.timber);
  addBox(root, 0.16, 0.36, 0.32, 1.05, 0.18, 7.5, pack.timber);
  addBox(cutawayWallGroup, 1.9, 2.2, 0.16, 0, 1.1, 7.5, pack.copper, true, true);
  addBox(cutawayWallGroup, 2.2, 0.62, 0.25, 0, 2.54, 7.5, warmWallMat, true, true);
  addBox(cutawayWallGroup, 0.16, 1.88, 0.32, -1.05, 1.3, 7.5, pack.timber);
  addBox(cutawayWallGroup, 0.16, 1.88, 0.32, 1.05, 1.3, 7.5, pack.timber);
  const doorHandle = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.08, 8, 6)), pack.gold);
  doorHandle.position.set(0.7, 1.05, 7.36);
  cutawayWallGroup.add(doorHandle);
  // Cozy Welcome Doormat cleanly above floor!
  addBox(root, 1.8, 0.035, 0.95, 0, 0.022, 6.75, pastelPinkMat, false, true);
  addBox(root, 1.4, 0.04, 0.62, 0, 0.032, 6.75, pack.gold, false, true);

  // Internal Partition Walls (clean non-overlapping spans between doorways & outer walls)
  // x = -3.5 (Bedroom <-> Study arch at z = -3.75; Kitchen <-> Living arch at z = +3.75)
  addWallSegment(root, 2.36, 0.24, -3.5, -6.18, Math.PI / 2, bedroomWallMat);
  addWallSegment(root, 4.76, 0.24, -3.5, 0, Math.PI / 2, warmWallMat);
  addWallSegment(root, 2.36, 0.24, -3.5, 6.18, Math.PI / 2, kitchenWallMat);
  addDoorwayFrame(-3.5, -3.75, Math.PI / 2);
  addDoorwayFrame(-3.5, 3.75, Math.PI / 2);

  // x = +3.5 (Study <-> Sunroom arch at z = -3.75; Living <-> Bath arch at z = +3.75)
  addWallSegment(root, 2.36, 0.24, 3.5, -6.18, Math.PI / 2, studyWallMat);
  addWallSegment(root, 4.76, 0.24, 3.5, 0, Math.PI / 2, warmWallMat);
  addWallSegment(root, 2.36, 0.24, 3.5, 6.18, Math.PI / 2, bathWallMat);
  addDoorwayFrame(3.5, -3.75, Math.PI / 2);
  addDoorwayFrame(3.5, 3.75, Math.PI / 2);

  // z = 0 (Bedroom <-> Kitchen at x = -7.0; Study <-> Living at x = 0; Sunroom <-> Bath at x = +7.0)
  addWallSegment(root, 2.12, 0.24, -9.3, 0, 0, kitchenWallMat);
  addWallSegment(root, 2.14, 0.24, -4.69, 0, 0, warmWallMat);
  addWallSegment(root, 2.14, 0.24, -2.31, 0, 0, warmWallMat);
  addWallSegment(root, 2.14, 0.24, 2.31, 0, 0, warmWallMat);
  addWallSegment(root, 2.14, 0.24, 4.69, 0, 0, warmWallMat);
  addWallSegment(root, 2.12, 0.24, 9.3, 0, 0, bathWallMat);
  addDoorwayFrame(-7.0, 0, 0);
  addDoorwayFrame(0, 0, 0);
  addDoorwayFrame(7.0, 0, 0);

  // Exposed Timber Ceiling Rafters, Hanging Lanterns & Sunroom Glass Roof (cleanly stacked above crown)
  for (const bz of [-5.2, -2.2, 2.2, 5.2]) {
    addBox(ceilingGroup, 13.8, 0.14, 0.2, -3.5, 2.95, bz, pack.timber, false, false);
  }
  addBox(ceilingGroup, 14.2, 0.14, 15.2, -3.5, 3.1, 0, warmWallMat, false, true);
  // Conservatory Glass Roof Panels
  addBox(ceilingGroup, 7.0, 0.08, 7.5, 7.0, 2.98, -3.75, glassMat, false, false);
  // Hanging Warm Paper Lanterns in center of main rooms
  const ceilLanternGeo = trackGeo(new THREE.SphereGeometry(0.24, 10, 8));
  for (const [lx, lz] of [
    [0, 3.8],
    [-7.0, 3.8],
    [-7.0, -3.8],
    [0, -3.8],
    [7.0, 3.8],
  ]) {
    addBox(ceilingGroup, 0.04, 0.55, 0.04, lx, 2.68, lz, pack.timber, false, false);
    const lOrb = new THREE.Mesh(ceilLanternGeo, pack.warmWindow);
    lOrb.position.set(lx, 2.36, lz);
    ceilingGroup.add(lOrb);
  }

  // === 3. ROOM 1: LIVING ROOM & FOYER ===
  // Braided Hearth Rug
  const rugOuterMat = trackMat(new THREE.MeshStandardMaterial({ color: 0xffd7e5, roughness: 0.92 }));
  const rugTrimMat = trackMat(new THREE.MeshStandardMaterial({ color: 0xe67099, roughness: 0.9 }));
  const braidedRug = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(1.75, 1.75, 0.035, 24)), rugOuterMat);
  braidedRug.scale.set(1.25, 1, 0.85);
  braidedRug.position.set(0, 0.025, 4.35);
  braidedRug.receiveShadow = true;
  const rugBorder = new THREE.Mesh(trackGeo(new THREE.TorusGeometry(1.68, 0.06, 6, 26)), rugTrimMat);
  rugBorder.rotation.x = Math.PI / 2;
  rugBorder.scale.set(1.25, 0.85, 1);
  rugBorder.position.set(0, 0.035, 4.35);
  root.add(braidedRug, rugBorder);

  // Brick Hearth Fireplace (Left side of Living Room: x = -2.55, z = 1.25)
  const hearthGroup = new THREE.Group();
  hearthGroup.position.set(-2.55, 0, 1.25);
  addBox(hearthGroup, 1.5, 0.16, 1.4, 0.1, 0.08, 0, pack.masonry);
  addBox(hearthGroup, 1.25, 2.65, 1.25, 0, 1.32, 0, brickMat);
  addBox(hearthGroup, 1.38, 0.14, 1.36, 0.04, 1.48, 0, pack.timber); // Mantel shelf
  // Firebox recess
  const fireBackMat = trackMat(new THREE.MeshStandardMaterial({ color: 0x261a24, roughness: 0.95 }));
  addBox(hearthGroup, 0.25, 0.82, 0.78, 0.56, 0.56, 0, fireBackMat);
  // Firewood logs
  const logHGeo = trackGeo(new THREE.CylinderGeometry(0.08, 0.08, 0.62, 8));
  logHGeo.rotateX(Math.PI / 2);
  const log1 = new THREE.Mesh(logHGeo, pack.timber);
  log1.position.set(0.56, 0.24, 0);
  hearthGroup.add(log1);
  // Framed portrait & candlestick on mantel
  addBox(hearthGroup, 0.06, 0.36, 0.42, 0.12, 1.76, -0.25, pack.timber);
  addBox(hearthGroup, 0.07, 0.26, 0.32, 0.13, 1.76, -0.25, creamCabinetMat);
  const candle = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.04, 0.04, 0.22, 8)), creamCabinetMat);
  candle.position.set(0.25, 1.66, 0.32);
  hearthGroup.add(candle);
  // Crackling 3D Flames + Warm Hearth PointLight
  const flameMat1 = trackMat(
    new THREE.MeshBasicMaterial({ color: 0xff7b33, transparent: true, opacity: 0.92 })
  );
  const flameMat2 = trackMat(
    new THREE.MeshBasicMaterial({ color: 0xffdf66, transparent: true, opacity: 0.95 })
  );
  const flameGroup = new THREE.Group();
  flameGroup.position.set(0.58, 0.34, 0);
  const fCone1 = new THREE.Mesh(trackGeo(new THREE.ConeGeometry(0.18, 0.48, 7)), flameMat1);
  fCone1.position.y = 0.2;
  const fCone2 = new THREE.Mesh(trackGeo(new THREE.ConeGeometry(0.11, 0.34, 7)), flameMat2);
  fCone2.position.set(0.02, 0.16, 0.06);
  flameGroup.add(fCone1, fCone2);
  hearthGroup.add(flameGroup);
  const hearthLight = new THREE.PointLight(0xff9f45, 2.4, 9.5, 1.4);
  hearthLight.position.set(0.95, 0.72, 0);
  hearthGroup.add(hearthLight);
  root.add(hearthGroup);

  // Plush Cloud Sofa (Center of Living Room facing South Door, x = 0, z = 2.2)
  const sofaGroup = new THREE.Group();
  sofaGroup.position.set(0, 0, 2.2);
  addBox(sofaGroup, 2.45, 0.32, 0.92, 0, 0.26, 0, pastelPinkMat); // Base
  addBox(sofaGroup, 2.45, 0.62, 0.26, 0, 0.66, -0.34, pastelPinkMat); // Backrest
  addBox(sofaGroup, 0.28, 0.52, 0.96, -1.18, 0.46, 0, pastelPinkMat); // Left Arm
  addBox(sofaGroup, 0.28, 0.52, 0.96, 1.18, 0.46, 0, pastelPinkMat); // Right Arm
  addBox(sofaGroup, 1.0, 0.18, 0.78, -0.52, 0.46, 0.06, sofaCreamMat); // Cushion L
  addBox(sofaGroup, 1.0, 0.18, 0.78, 0.52, 0.46, 0.06, sofaCreamMat); // Cushion R
  const pillowGold = addBox(sofaGroup, 0.34, 0.28, 0.14, -0.78, 0.64, -0.1, pack.gold);
  pillowGold.rotation.z = 0.22;
  root.add(sofaGroup);

  // Side Table & Spinning Carousel Music Box (x = 2.35, z = 1.8)
  const musicTableGroup = new THREE.Group();
  musicTableGroup.position.set(2.35, 0, 1.8);
  addBox(musicTableGroup, 0.96, 0.1, 0.78, 0, 0.62, 0, pack.timber);
  for (const [lx, lz] of [
    [-0.38, -0.28],
    [0.38, -0.28],
    [-0.38, 0.28],
    [0.38, 0.28],
  ]) {
    addBox(musicTableGroup, 0.09, 0.58, 0.09, lx, 0.29, lz, pack.timber);
  }
  const mbBase = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.24, 0.26, 0.24, 12)), pastelPinkMat);
  mbBase.position.y = 0.78;
  const mbCanopy = new THREE.Mesh(trackGeo(new THREE.ConeGeometry(0.28, 0.24, 12)), pack.shingleCoral);
  mbCanopy.position.y = 1.06;
  const mbSpire = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.055, 8, 6)), pack.gold);
  mbSpire.position.y = 1.22;
  const musicBoxRotor = new THREE.Group();
  musicBoxRotor.position.y = 0.92;
  for (let k = 0; k < 4; k++) {
    const a = (k / 4) * Math.PI * 2;
    const pole = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.015, 0.015, 0.18, 6)), pack.gold);
    pole.position.set(Math.cos(a) * 0.14, 0, Math.sin(a) * 0.14);
    musicBoxRotor.add(pole);
  }
  musicTableGroup.add(mbBase, mbCanopy, mbSpire, musicBoxRotor);
  root.add(musicTableGroup);

  // Arched Weather Picture Window on x = +2.05, z = 0.05 (Living Room back-right wall)
  const weatherWinMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0x7bc6f7, emissive: 0x3b8ed6, emissiveIntensity: 0.45, roughness: 0.2 })
  );
  const weatherWinGroup = new THREE.Group();
  weatherWinGroup.position.set(2.05, 1.62, 0.15);
  addBox(weatherWinGroup, 1.36, 1.15, 0.08, 0, 0, 0, pack.timber);
  const weatherPane = new THREE.Mesh(trackGeo(new THREE.PlaneGeometry(1.18, 0.96)), weatherWinMat);
  weatherPane.position.z = 0.045;
  addBox(weatherWinGroup, 0.06, 0.98, 0.05, 0, 0, 0.04, pack.timber);
  addBox(weatherWinGroup, 1.2, 0.06, 0.05, 0, 0, 0.04, pack.timber);
  addBox(weatherWinGroup, 1.46, 0.1, 0.22, 0, -0.58, 0.08, pack.timber);
  weatherWinGroup.add(weatherPane);
  root.add(weatherWinGroup);

  // === 4. ROOM 2: KITCHEN & TEA BAR ===
  // Oak Counter & Cream Cabinetry along North wall of Kitchen (x = -10.2..-4.9, z = 0.9)
  const kitchenCounter = new THREE.Group();
  kitchenCounter.position.set(-7.6, 0, 0.95);
  addBox(kitchenCounter, 5.2, 0.88, 1.05, 0, 0.44, 0, creamCabinetMat);
  addBox(kitchenCounter, 5.34, 0.1, 1.14, 0, 0.93, 0, pack.timber); // Countertop
  // Upper Spice Shelves
  addBox(kitchenCounter, 2.2, 0.08, 0.36, 1.1, 1.75, -0.34, pack.timber);
  for (let j = 0; j < 4; j++) {
    const jar = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.08, 0.08, 0.22, 8)),
      j % 2 === 0 ? pastelPinkMat : leafMat
    );
    jar.position.set(0.35 + j * 0.46, 1.9, -0.34);
    kitchenCounter.add(jar);
  }

  // Pink Cloud Pastry Oven integrated in counter (left side)
  addBox(kitchenCounter, 1.32, 0.95, 1.12, -1.65, 0.48, 0.04, pastelPinkMat);
  const ovenWindowMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0x3b2a40, emissive: 0xff8c2b, emissiveIntensity: 0.2, roughness: 0.2 })
  );
  addBox(kitchenCounter, 0.88, 0.46, 0.08, -1.65, 0.46, 0.58, ovenWindowMat);
  // Chimney hood above oven
  const ovenHood = new THREE.Mesh(trackGeo(new THREE.ConeGeometry(0.78, 0.65, 4)), creamCabinetMat);
  ovenHood.position.set(-1.65, 2.22, -0.08);
  ovenHood.rotation.y = Math.PI / 4;
  kitchenCounter.add(ovenHood);

  // Copper Kettle steaming on stovetop beside oven
  const kettle = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.22, 12, 10)), pack.copper);
  kettle.position.set(0.75, 1.18, 0.08);
  kettle.scale.set(1.1, 0.88, 1.1);
  const kettleHandle = new THREE.Mesh(trackGeo(new THREE.TorusGeometry(0.18, 0.03, 6, 14, Math.PI)), pack.darkSlate);
  kettleHandle.position.set(0.75, 1.34, 0.08);
  kitchenCounter.add(kettle, kettleHandle);
  root.add(kitchenCounter);

  // Cold-Mist Icebox Fridge (West Kitchen Wall: x = -9.55, z = 5.25)
  const fridgeGroup = new THREE.Group();
  fridgeGroup.position.set(-9.55, 0, 5.25);
  addBox(fridgeGroup, 1.15, 2.15, 1.25, 0, 1.075, 0, mintFridgeMat);
  addBox(fridgeGroup, 0.08, 0.36, 0.08, 0.59, 1.62, 0.36, creamCabinetMat);
  addBox(fridgeGroup, 0.08, 0.48, 0.08, 0.59, 0.92, 0.36, creamCabinetMat);
  root.add(fridgeGroup);

  // Round Breakfast Table & Twin Stools (Center Kitchen: x = -6.85, z = 4.4)
  const bTableGroup = new THREE.Group();
  bTableGroup.position.set(-6.85, 0, 4.4);
  const bTop = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.88, 0.88, 0.1, 16)), pack.timber);
  bTop.position.y = 0.72;
  bTop.castShadow = true;
  const bPed = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.14, 0.24, 0.7, 10)), pack.timber);
  bPed.position.y = 0.35;
  // Croissant plate + tea cup on table
  const plate = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.24, 0.2, 0.04, 12)), creamCabinetMat);
  plate.position.set(-0.2, 0.79, 0.08);
  const croissant = new THREE.Mesh(trackGeo(new THREE.TorusGeometry(0.09, 0.045, 6, 10, Math.PI * 1.2)), pack.gold);
  croissant.rotation.x = Math.PI / 2;
  croissant.position.set(-0.2, 0.83, 0.08);
  const mug = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.08, 0.07, 0.14, 10)), pastelPinkMat);
  mug.position.set(0.24, 0.84, -0.1);
  bTableGroup.add(bTop, bPed, plate, croissant, mug);
  for (const sx of [-1.05, 1.05]) {
    const stoolTop = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.26, 0.24, 0.08, 12)), pastelPinkMat);
    stoolTop.position.set(sx, 0.46, 0);
    const stoolLeg = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.08, 0.12, 0.44, 8)), pack.timber);
    stoolLeg.position.set(sx, 0.22, 0);
    bTableGroup.add(stoolTop, stoolLeg);
  }
  root.add(bTableGroup);

  // === 5. ROOM 3: BEDROOM ===
  // Soft Moon Bedroom Rug
  const bedRug = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(1.6, 1.6, 0.03, 24)), softPlumMat);
  bedRug.position.set(-6.75, 0.02, -2.55);
  bedRug.scale.set(1.2, 1, 0.85);
  bedRug.receiveShadow = true;
  root.add(bedRug);

  // Carved Timber Wardrobe (x = -9.5, z = -5.9)
  const wardrobeGroup = new THREE.Group();
  wardrobeGroup.position.set(-9.5, 0, -5.9);
  addBox(wardrobeGroup, 1.12, 2.25, 1.65, 0, 1.125, 0, pack.timber);
  addBox(wardrobeGroup, 0.08, 1.9, 0.72, 0.56, 1.12, -0.4, walnutFloorMat);
  addBox(wardrobeGroup, 0.08, 1.9, 0.72, 0.56, 1.12, 0.4, walnutFloorMat);
  const knobGeo = trackGeo(new THREE.SphereGeometry(0.045, 6, 6));
  const k1 = new THREE.Mesh(knobGeo, pack.gold);
  k1.position.set(0.62, 1.12, -0.1);
  const k2 = new THREE.Mesh(knobGeo, pack.gold);
  k2.position.set(0.62, 1.12, 0.1);
  wardrobeGroup.add(k1, k2);
  root.add(wardrobeGroup);

  // Four-Poster Patchwork Bed (x = -6.75, z = -5.75)
  const bedGroup = new THREE.Group();
  bedGroup.position.set(-6.75, 0, -5.75);
  addBox(bedGroup, 2.45, 0.45, 2.55, 0, 0.28, 0, pack.timber); // Bed frame
  addBox(bedGroup, 2.45, 1.15, 0.18, 0, 0.85, -1.25, walnutFloorMat); // Headboard
  addBox(bedGroup, 2.26, 0.28, 2.35, 0, 0.56, 0.02, creamCabinetMat); // Mattress
  addBox(bedGroup, 2.28, 0.22, 1.56, 0, 0.68, 0.4, pastelPinkMat); // Patchwork Quilt
  addBox(bedGroup, 1.96, 0.04, 0.92, 0, 0.8, 0.54, pack.gold); // Gold Patchwork Accent
  addBox(bedGroup, 0.78, 0.2, 0.46, -0.56, 0.78, -0.86, creamCabinetMat); // Pillow L
  addBox(bedGroup, 0.78, 0.2, 0.46, 0.56, 0.78, -0.86, creamCabinetMat); // Pillow R
  // Four Turned Canopy Posts + Draped Pink Valance
  const postGeo = trackGeo(new THREE.CylinderGeometry(0.075, 0.09, 2.15, 8));
  for (const [px, pz] of [
    [-1.18, -1.22],
    [1.18, -1.22],
    [-1.18, 1.22],
    [1.18, 1.22],
  ]) {
    const p = new THREE.Mesh(postGeo, pack.timber);
    p.position.set(px, 1.075, pz);
    p.castShadow = true;
    bedGroup.add(p);
  }
  addBox(bedGroup, 2.52, 0.16, 2.6, 0, 2.16, 0, pastelPinkMat);
  root.add(bedGroup);

  // Nightstand & Toggleable Amber Bedside Lamp (x = -4.55, z = -6.3)
  const lampTableGroup = new THREE.Group();
  lampTableGroup.position.set(-4.55, 0, -6.3);
  addBox(lampTableGroup, 0.88, 0.72, 0.88, 0, 0.36, 0, walnutFloorMat);
  const lampStem = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.05, 0.11, 0.34, 8)), pack.gold);
  lampStem.position.y = 0.88;
  const lampShadeMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xffe488,
      emissive: 0xffb833,
      emissiveIntensity: 0.9,
      roughness: 0.35,
    })
  );
  const lampShade = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.18, 0.28, 0.32, 12)), lampShadeMat);
  lampShade.position.y = 1.15;
  const bedroomLampLight = new THREE.PointLight(0xffd27a, 2.0, 8.5, 1.4);
  bedroomLampLight.position.set(0, 1.3, 0.2);
  lampTableGroup.add(lampStem, lampShade, bedroomLampLight);
  root.add(lampTableGroup);

  // Round Moon Skylight on Bedroom North Wall (cleanly proud of interior wall face at z=-7.36)
  const moonFrame = new THREE.Mesh(trackGeo(new THREE.TorusGeometry(0.62, 0.08, 8, 22)), pack.timber);
  moonFrame.position.set(-6.75, 1.98, -7.28);
  const moonSkyMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0x202758, emissive: 0x303a7a, emissiveIntensity: 0.6 })
  );
  const moonDisk = new THREE.Mesh(trackGeo(new THREE.CircleGeometry(0.58, 20)), moonSkyMat);
  moonDisk.position.set(-6.75, 1.98, -7.305);
  const crescentOrb = new THREE.Mesh(trackGeo(new THREE.CircleGeometry(0.18, 14)), pack.gold);
  crescentOrb.position.set(-6.92, 2.08, -7.27);
  root.add(moonFrame, moonDisk, crescentOrb);

  // === 6. ROOM 4: STUDY & STUDIO ===
  const studyRugMat = trackMat(new THREE.MeshStandardMaterial({ color: 0x4b8f74, roughness: 0.92 }));
  addBox(root, 3.8, 0.025, 2.8, 0, 0.016, -3.5, studyRugMat, false, true);

  // Twin Archipelago Bookshelves along North Study Wall (x = -2.15 & x = +2.15, z = -6.75)
  const bookCols = [0xff7aa8, 0x52d6c6, 0xffd23f, 0x9a82f6, 0x7bd88f, 0xf49b6c];
  const bookMats = bookCols.map((hex) => trackMat(new THREE.MeshStandardMaterial({ color: hex, roughness: 0.62 })));
  const bookGeo = trackGeo(new THREE.BoxGeometry(0.16, 0.36, 0.28));
  for (const bx of [-2.15, 2.15]) {
    const shelf = new THREE.Group();
    shelf.position.set(bx, 0, -6.75);
    addBox(shelf, 1.75, 2.35, 0.62, 0, 1.175, 0, walnutFloorMat);
    for (let tier = 0; tier < 3; tier++) {
      const sy = 0.56 + tier * 0.62;
      addBox(shelf, 1.62, 0.07, 0.56, 0, sy, 0.04, pack.timber);
      for (let b = 0; b < 7; b++) {
        const book = new THREE.Mesh(bookGeo, bookMats[(b + tier) % bookMats.length]);
        book.position.set(-0.62 + b * 0.2, sy + 0.21, 0.12);
        book.scale.y = 0.85 + ((b + tier) % 3) * 0.14;
        shelf.add(book);
      }
    }
    root.add(shelf);
  }

  // Song Weaver Writing Desk + Brass Gramophone + Crystal Globe (x = 0, z = -4.0)
  const deskGroup = new THREE.Group();
  deskGroup.position.set(0, 0, -4.0);
  addBox(deskGroup, 2.05, 0.12, 1.1, 0, 0.78, 0, pack.timber);
  addBox(deskGroup, 0.48, 0.74, 0.96, -0.72, 0.37, 0, walnutFloorMat);
  addBox(deskGroup, 0.48, 0.74, 0.96, 0.72, 0.37, 0, walnutFloorMat);
  // Brass Gramophone
  addBox(deskGroup, 0.38, 0.22, 0.38, -0.58, 0.95, -0.1, pack.copper);
  const gramHorn = new THREE.Mesh(trackGeo(new THREE.ConeGeometry(0.24, 0.42, 12, 1, true)), pack.gold);
  gramHorn.position.set(-0.58, 1.24, -0.02);
  gramHorn.rotation.x = 0.88;
  // Glowing Crystal Starlight Globe
  const globeBase = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.12, 0.16, 0.14, 10)), pack.gold);
  globeBase.position.set(0.58, 0.91, -0.08);
  const globeOrb = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.2, 14, 12)), pack.crystalCyan);
  globeOrb.position.set(0.58, 1.15, -0.08);
  // Sheet music scroll
  addBox(deskGroup, 0.46, 0.02, 0.34, 0.02, 0.85, 0.14, creamCabinetMat);
  deskGroup.add(gramHorn, globeBase, globeOrb);
  root.add(deskGroup);

  // Brass Telescope on Mahogany Tripod (x = 2.45, z = -1.75)
  const scopeGroup = new THREE.Group();
  scopeGroup.position.set(2.45, 0, -1.75);
  const legGeo = trackGeo(new THREE.CylinderGeometry(0.035, 0.035, 1.18, 6));
  for (let k = 0; k < 3; k++) {
    const a = (k / 3) * Math.PI * 2;
    const leg = new THREE.Mesh(legGeo, walnutFloorMat);
    leg.position.set(Math.cos(a) * 0.22, 0.56, Math.sin(a) * 0.22);
    leg.rotation.z = Math.cos(a) * 0.34;
    leg.rotation.x = -Math.sin(a) * 0.34;
    scopeGroup.add(leg);
  }
  const barrel = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.09, 0.13, 1.05, 12)), pack.gold);
  barrel.position.set(0, 1.24, 0);
  barrel.rotation.set(0.55, -0.65, 0);
  scopeGroup.add(barrel);
  root.add(scopeGroup);

  // === 7. ROOM 5: SUNROOM CONSERVATORY ===
  // Cedar Potting Bench (x = 7.15, z = -6.2) holding 6 live Terracotta Planter Slots
  const benchGroup = new THREE.Group();
  benchGroup.position.set(7.15, 0, -6.2);
  addBox(benchGroup, 4.6, 0.12, 1.15, 0, 0.88, 0, pack.timber);
  for (const bx of [-2.05, 2.05]) {
    addBox(benchGroup, 0.16, 0.85, 0.96, bx, 0.425, 0, walnutFloorMat);
  }
  root.add(benchGroup);

  // 6 Dynamic Terracotta Planter Slots synced to cottage.gardenPlots
  const soilMat = trackMat(new THREE.MeshStandardMaterial({ color: 0x5c3c2a, roughness: 0.92 }));
  const terraPotMat = trackMat(new THREE.MeshStandardMaterial({ color: 0xc96b47, roughness: 0.72 }));
  const sproutMat = trackMat(new THREE.MeshStandardMaterial({ color: 0x62d672, roughness: 0.6 }));
  const bloomMats = [
    trackMat(new THREE.MeshStandardMaterial({ color: 0xffd23f, roughness: 0.45 })), // Sunny Daisy
    trackMat(new THREE.MeshStandardMaterial({ color: 0x6cd8ff, roughness: 0.45 })), // Cirrus Sky Flower
    trackMat(
      new THREE.MeshStandardMaterial({
        color: 0x64f5c1,
        emissive: 0x2de8a6,
        emissiveIntensity: 0.75,
        roughness: 0.25,
      })
    ), // Glowcap
    trackMat(new THREE.MeshStandardMaterial({ color: 0xff5a85, roughness: 0.45 })), // Ember Rose
  ];

  const gardenSlotGroups: {
    sprout: THREE.Mesh;
    leafCrown: THREE.Mesh;
    flowerHead: THREE.Mesh;
  }[] = [];

  for (let i = 0; i < 6; i++) {
    const px = 5.25 + i * 0.76;
    const pz = -6.2;
    const slotG = new THREE.Group();
    slotG.position.set(px, 0.94, pz);

    const pot = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.24, 0.18, 0.28, 10)), terraPotMat);
    pot.position.y = 0.14;
    const soil = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.22, 0.22, 0.04, 10)), soilMat);
    soil.position.y = 0.27;
    const sprout = new THREE.Mesh(trackGeo(new THREE.ConeGeometry(0.08, 0.24, 6)), sproutMat);
    sprout.position.y = 0.4;
    const leafCrown = new THREE.Mesh(trackGeo(new THREE.DodecahedronGeometry(0.2, 0)), leafMat);
    leafCrown.position.y = 0.46;
    const flowerHead = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.14, 10, 8)), bloomMats[0]);
    flowerHead.position.y = 0.65;

    sprout.visible = false;
    leafCrown.visible = false;
    flowerHead.visible = false;
    slotG.add(pot, soil, sprout, leafCrown, flowerHead);
    root.add(slotG);
    gardenSlotGroups.push({ sprout, leafCrown, flowerHead });
  }

  // Hanging Macramé Fern & Solar Conservatory Lantern
  const fernBasket = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.32, 10, 8)), leafMat);
  fernBasket.position.set(5.2, 2.05, -2.5);
  root.add(fernBasket);

  // === 8. ROOM 6: BATH & CORAL REEF SPA ===
  // Banded Cedar Soaking Tub (x = 6.1, z = 4.4)
  const tubGroup = new THREE.Group();
  tubGroup.position.set(6.1, 0, 4.4);
  const cedarOuter = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(1.18, 1.05, 0.88, 18)), pack.timber);
  cedarOuter.scale.set(1.18, 1, 0.88);
  cedarOuter.position.y = 0.44;
  cedarOuter.castShadow = true;
  const tubHoop = new THREE.Mesh(trackGeo(new THREE.TorusGeometry(1.14, 0.045, 8, 24)), pack.darkSlate);
  tubHoop.rotation.x = Math.PI / 2;
  tubHoop.scale.set(1.18, 0.88, 1);
  tubHoop.position.y = 0.56;
  const tubWater = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(1.06, 1.06, 0.08, 18)), pack.waterPool);
  tubWater.scale.set(1.15, 1, 0.85);
  tubWater.position.y = 0.78;
  // Floating Yellow Bath Toy Duck
  const duckBody = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.13, 8, 6)), pack.gold);
  duckBody.position.set(-0.3, 0.86, 0.12);
  duckBody.scale.set(1.2, 0.85, 0.9);
  // Tub steam puffs
  const steamMat = trackMat(new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.45 }));
  const tubSteams: THREE.Mesh[] = [];
  for (let s = 0; s < 4; s++) {
    const sm = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.14, 8, 6)), steamMat);
    sm.position.set((s - 1.5) * 0.35, 1.05 + s * 0.14, (s % 2 === 0 ? 1 : -1) * 0.15);
    tubGroup.add(sm);
    tubSteams.push(sm);
  }
  tubGroup.add(cedarOuter, tubHoop, tubWater, duckBody);
  root.add(tubGroup);

  // Built-In Panoramic Saltwater Wall Aquarium (East Wall of Bath: x = 9.95, z = 3.85)
  const aqGroup = new THREE.Group();
  aqGroup.position.set(9.85, 0, 3.85);
  addBox(aqGroup, 0.95, 0.62, 3.35, 0, 0.31, 0, pack.timber); // Base cabinet
  const aqWaterBackMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x0d5c86,
      emissive: 0x1680b8,
      emissiveIntensity: 0.62,
      roughness: 0.16,
    })
  );
  addBox(aqGroup, 0.72, 1.48, 3.15, 0.05, 1.38, 0, aqWaterBackMat);
  // Wooden aquarium frame + glass front
  addBox(aqGroup, 0.88, 0.14, 3.35, 0, 2.15, 0, pack.timber);
  addBox(aqGroup, 0.06, 1.48, 3.16, -0.36, 1.38, 0, glassMat, false, false);
  // Coral & kelp silhouettes inside tank
  const coralPink = new THREE.Mesh(trackGeo(new THREE.ConeGeometry(0.16, 0.48, 7)), cherryPetalMat);
  coralPink.position.set(-0.08, 0.88, -0.95);
  const kelpGreen = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.06, 0.09, 0.76, 6)), leafMat);
  kelpGreen.position.set(0.02, 1.0, 0.98);
  const aqLight = new THREE.PointLight(0x4be0ff, 1.6, 7.0, 1.4);
  aqLight.position.set(-0.85, 1.45, 0);
  aqGroup.add(coralPink, kelpGreen, aqLight);

  // Up to 8 live swimming 3D fish inside the wall aquarium
  const fishBodyGeo = trackGeo(new THREE.SphereGeometry(0.1, 8, 6));
  const fishTailGeo = trackGeo(new THREE.ConeGeometry(0.08, 0.14, 4));
  fishTailGeo.rotateX(Math.PI / 2);
  const fishPal = [0xff8c66, 0xffd23f, 0x64f5c1, 0xff7aa8, 0x8fd5ff];
  const aqFishMeshes: THREE.Group[] = [];
  for (let f = 0; f < 8; f++) {
    const fg = new THREE.Group();
    const fMat = trackMat(new THREE.MeshStandardMaterial({ color: fishPal[f % fishPal.length], roughness: 0.25 }));
    const fb = new THREE.Mesh(fishBodyGeo, fMat);
    fb.scale.set(0.75, 0.85, 1.35);
    const ft = new THREE.Mesh(fishTailGeo, fMat);
    ft.position.z = -0.14;
    fg.add(fb, ft);
    aqGroup.add(fg);
    aqFishMeshes.push(fg);
  }
  root.add(aqGroup);

  // === 9. DYNAMIC CUSTOM PLACED 3D FURNITURE (cottage.decorationsPlaced) ===
  const decoGroup = new THREE.Group();
  root.add(decoGroup);
  const placedMap = new Map<string, PlacedDecoEntry>();
  const decoLocalGeos: THREE.BufferGeometry[] = [];
  const decoLocalMats: THREE.Material[] = [];

  const trackDecoGeo = <T extends THREE.BufferGeometry>(g: T): T => {
    decoLocalGeos.push(g);
    return g;
  };
  const trackDecoMat = <T extends THREE.Material>(m: T): T => {
    decoLocalMats.push(m);
    return m;
  };

  const buildFurniture3DModel = (name: string): THREE.Group => {
    const g = new THREE.Group();
    const lower = name.toLowerCase();

    if (lower.includes('cushion') || lower.includes('pillow')) {
      const poufMat = trackDecoMat(new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.78 }));
      const base = new THREE.Mesh(trackDecoGeo(new THREE.SphereGeometry(0.28, 12, 8)), poufMat);
      base.scale.set(1.2, 0.56, 1.2);
      base.position.y = 0.15;
      const top = new THREE.Mesh(trackDecoGeo(new THREE.SphereGeometry(0.18, 10, 8)), pastelPinkMat);
      top.scale.set(1.2, 0.5, 1.2);
      top.position.y = 0.28;
      g.add(base, top);
    } else if (lower.includes('rug')) {
      const rMat = trackDecoMat(new THREE.MeshStandardMaterial({ color: 0xffd2e2, roughness: 0.9 }));
      const disc = new THREE.Mesh(trackDecoGeo(new THREE.CylinderGeometry(0.68, 0.68, 0.03, 18)), rMat);
      disc.position.y = 0.015;
      const ring = new THREE.Mesh(trackDecoGeo(new THREE.TorusGeometry(0.54, 0.04, 6, 20)), pack.gold);
      ring.rotation.x = Math.PI / 2;
      ring.position.y = 0.03;
      g.add(disc, ring);
    } else if (lower.includes('lantern') || lower.includes('lamp') || lower.includes('candle') || lower.includes('terrarium')) {
      const stand = new THREE.Mesh(trackDecoGeo(new THREE.CylinderGeometry(0.16, 0.2, 0.12, 10)), pack.timber);
      stand.position.y = 0.06;
      const orb = new THREE.Mesh(trackDecoGeo(new THREE.CylinderGeometry(0.14, 0.16, 0.38, 10)), pack.warmWindow);
      orb.position.y = 0.31;
      const cap = new THREE.Mesh(trackDecoGeo(new THREE.ConeGeometry(0.2, 0.14, 10)), pack.copper);
      cap.position.y = 0.55;
      g.add(stand, orb, cap);
    } else if (lower.includes('tea') || lower.includes('pastry') || lower.includes('berry') || lower.includes('herb')) {
      const ped = new THREE.Mesh(trackDecoGeo(new THREE.CylinderGeometry(0.28, 0.22, 0.38, 10)), pack.timber);
      ped.position.y = 0.19;
      const tray = new THREE.Mesh(trackDecoGeo(new THREE.CylinderGeometry(0.32, 0.28, 0.05, 12)), creamCabinetMat);
      tray.position.y = 0.4;
      const item = new THREE.Mesh(
        trackDecoGeo(new THREE.SphereGeometry(0.12, 10, 8)),
        lower.includes('tea') ? pack.crystalCyan : lower.includes('herb') ? leafMat : pastelPinkMat
      );
      item.position.y = 0.52;
      g.add(ped, tray, item);
    } else if (lower.includes('bonsai') || lower.includes('fern') || lower.includes('bouquet')) {
      const pot = new THREE.Mesh(trackDecoGeo(new THREE.CylinderGeometry(0.2, 0.15, 0.22, 10)), terraPotMat);
      pot.position.y = 0.11;
      const trunk = new THREE.Mesh(trackDecoGeo(new THREE.CylinderGeometry(0.05, 0.08, 0.28, 6)), pack.timber);
      trunk.position.y = 0.3;
      const crown = new THREE.Mesh(
        trackDecoGeo(new THREE.SphereGeometry(0.24, 10, 8)),
        lower.includes('fern') ? leafMat : cherryPetalMat
      );
      crown.position.y = 0.52;
      g.add(pot, trunk, crown);
    } else if (lower.includes('plush') || lower.includes('duck')) {
      const col = lower.includes('duck') ? pack.gold : pastelPinkMat;
      const body = new THREE.Mesh(trackDecoGeo(new THREE.SphereGeometry(0.22, 12, 10)), col);
      body.position.y = 0.22;
      const earL = new THREE.Mesh(trackDecoGeo(new THREE.SphereGeometry(0.08, 8, 6)), col);
      earL.position.set(-0.14, 0.41, 0);
      const earR = new THREE.Mesh(trackDecoGeo(new THREE.SphereGeometry(0.08, 8, 6)), col);
      earR.position.set(0.14, 0.41, 0);
      g.add(body, earL, earR);
    } else if (lower.includes('globe') || lower.includes('mirror') || lower.includes('mobile') || lower.includes('chime')) {
      const base = new THREE.Mesh(trackDecoGeo(new THREE.CylinderGeometry(0.14, 0.18, 0.36, 10)), pack.gold);
      base.position.y = 0.18;
      const orb = new THREE.Mesh(trackDecoGeo(new THREE.OctahedronGeometry(0.18, 1)), pack.crystalViolet);
      orb.position.y = 0.52;
      g.add(base, orb);
    } else if (lower.includes('book') || lower.includes('desk')) {
      const box = new THREE.Mesh(trackDecoGeo(new THREE.BoxGeometry(0.64, 0.82, 0.36)), walnutFloorMat);
      box.position.y = 0.41;
      const b1 = new THREE.Mesh(trackDecoGeo(new THREE.BoxGeometry(0.12, 0.22, 0.22)), pastelPinkMat);
      b1.position.set(-0.12, 0.92, 0);
      const b2 = new THREE.Mesh(trackDecoGeo(new THREE.BoxGeometry(0.12, 0.26, 0.22)), pack.crystalCyan);
      b2.position.set(0.05, 0.94, 0);
      g.add(box, b1, b2);
    } else {
      // Lute, shell tray, coral art, etc.
      const plinth = new THREE.Mesh(trackDecoGeo(new THREE.CylinderGeometry(0.22, 0.24, 0.28, 10)), creamCabinetMat);
      plinth.position.y = 0.14;
      const ornament = new THREE.Mesh(trackDecoGeo(new THREE.TorusKnotGeometry(0.13, 0.045, 32, 8)), pack.gold);
      ornament.position.y = 0.42;
      g.add(plinth, ornament);
    }
    return g;
  };

  let spinRotorBoost = 0;
  const activeKeys = new Set<string>();

  return {
    group: root,
    setCutaway: (cutaway: boolean) => {
      cutawayWallGroup.visible = cutaway;
      ceilingGroup.visible = !cutaway;
    },
    update: (time, cottage, weatherId, aquariumFishList) => {
      const fireplaceLit = cottage ? cottage.fireplaceLit !== false : true;
      const lampOn = cottage ? cottage.lampOn !== false : true;
      const tubFilled = cottage ? cottage.tubFilled !== false : true;
      const ovenWarm = Boolean(cottage?.ovenWarm);

      // 1. Living Room Fireplace & Music Box (smooth cozy light breath — zero strobe flicker)
      flameGroup.visible = fireplaceLit;
      hearthLight.visible = fireplaceLit;
      if (fireplaceLit) {
        const flameWave = 0.96 + Math.sin(time * 5.4) * 0.08 + Math.cos(time * 8.1) * 0.04;
        flameGroup.scale.set(1, flameWave, 1);
        hearthLight.intensity = 2.15 + Math.sin(time * 2.6) * 0.07;
      }
      if ((cottage?.furnitureInteractCount || 0) > 0) {
        spinRotorBoost = Math.max(spinRotorBoost, 0.4);
      }
      musicBoxRotor.rotation.y += 0.025 + spinRotorBoost * 0.05;
      spinRotorBoost = Math.max(0, spinRotorBoost - 0.01);

      // 2. Live Weather Picture Window Tint
      if (weatherId === 'stardust' || weatherId === 'aurora') {
        weatherWinMat.color.setHex(0x1f2857);
        weatherWinMat.emissive.setHex(0x3a488f);
      } else if (weatherId === 'drizzle') {
        weatherWinMat.color.setHex(0x5e7d9e);
        weatherWinMat.emissive.setHex(0x2e4e6e);
      } else if (weatherId === 'snowy') {
        weatherWinMat.color.setHex(0xcbe8ff);
        weatherWinMat.emissive.setHex(0x7fb4e0);
      } else {
        weatherWinMat.color.setHex(0x7bc6f7);
        weatherWinMat.emissive.setHex(0x3b8ed6);
      }

      // 3. Kitchen Oven Glow
      ovenWindowMat.emissiveIntensity = ovenWarm ? 0.95 + Math.sin(time * 5.2) * 0.12 : 0.05;

      // 4. Bedroom Night Lamp
      bedroomLampLight.visible = lampOn;
      lampShadeMat.emissiveIntensity = lampOn ? 0.92 : 0.04;
      lampShadeMat.color.setHex(lampOn ? 0xffe488 : 0x9ca3af);

      // 5. Sunroom Garden Planters (up to 6 live plots)
      const plots = cottage?.gardenPlots || [];
      for (let i = 0; i < gardenSlotGroups.length; i++) {
        const slot = gardenSlotGroups[i];
        const plot = plots[i];
        if (!plot) {
          slot.sprout.visible = false;
          slot.leafCrown.visible = false;
          slot.flowerHead.visible = false;
        } else {
          const st = plot.stage || 1;
          slot.sprout.visible = st === 1;
          slot.leafCrown.visible = st >= 2;
          slot.flowerHead.visible = st >= 3;
          if (st >= 3) {
            const sn = (plot.seedType || '').toLowerCase();
            const matIdx = sn.includes('sky') || sn.includes('cirrus') ? 1 : sn.includes('glow') ? 2 : sn.includes('ember') ? 3 : 0;
            slot.flowerHead.material = bloomMats[matIdx];
            slot.flowerHead.position.y = 0.66 + Math.sin(time * 2.4 + i) * 0.02;
          }
        }
      }

      // 6. Bath Tub Water, Rubber Duck Bob & Steam
      tubWater.visible = tubFilled;
      duckBody.visible = tubFilled;
      if (tubFilled) {
        duckBody.position.y = 0.85 + Math.sin(time * 3.1) * 0.025;
        duckBody.rotation.y = Math.sin(time * 1.4) * 0.35;
      }
      for (let s = 0; s < tubSteams.length; s++) {
        const stMesh = tubSteams[s];
        stMesh.visible = tubFilled;
        if (tubFilled) {
          const ph = (time * 0.45 + s * 0.25) % 1;
          stMesh.position.y = 0.95 + ph * 0.85;
          stMesh.scale.setScalar(0.55 + Math.sin(ph * Math.PI) * 0.65);
        }
      }

      // 7. Panoramic Wall Aquarium Live Swimming 3D Fish
      const fishCount = Math.min(aqFishMeshes.length, Math.max(2, aquariumFishList.length));
      for (let f = 0; f < aqFishMeshes.length; f++) {
        const fm = aqFishMeshes[f];
        fm.visible = f < fishCount;
        if (fm.visible) {
          const speed = 0.65 + (f % 3) * 0.22;
          const phase = time * speed + f * 1.37;
          const travel = Math.sin(phase);
          fm.position.set(
            (f % 2 === 0 ? -0.08 : 0.08) + Math.sin(time * 1.4 + f) * 0.08,
            1.02 + (f % 3) * 0.34 + Math.sin(time * 2.2 + f * 2) * 0.08,
            travel * 1.18
          );
          fm.rotation.y = Math.cos(phase) >= 0 ? 0 : Math.PI;
        }
      }

      // 8. Custom Placed Furniture Sync (cottage.decorationsPlaced)
      const placed = cottage?.decorationsPlaced || [];
      activeKeys.clear();
      const now = placed.length > 0 ? Date.now() : 0;
      for (let i = 0; i < placed.length; i++) {
        const deco = placed[i];
        activeKeys.add(deco.id);
        let entry = placedMap.get(deco.id);
        if (!entry) {
          const model = buildFurniture3DModel(deco.name);
          decoGroup.add(model);
          entry = {
            key: deco.id,
            mesh: model,
            baseY: 0.03,
            lastTrigger: deco.lastInteractedAt || 0,
          };
          placedMap.set(deco.id, entry);
        }
        const room = (deco.room || 'living') as HouseRoomId;
        const pos = mapRoomPercentToHouseWorld(room, deco.x, deco.y);
        const ageMs = deco.lastInteractedAt ? now - deco.lastInteractedAt : 99999;
        const bounce = ageMs < 1400 ? Math.abs(Math.sin((ageMs / 1000) * Math.PI * 3)) * 0.24 : 0;
        entry.mesh.position.set(pos.x, entry.baseY + bounce, pos.z);
        if (ageMs < 1400) {
          entry.mesh.rotation.y = Math.sin((ageMs / 1000) * Math.PI * 2) * 0.25;
        } else {
          entry.mesh.rotation.y = 0;
        }
      }
      for (const [k, entry] of placedMap.entries()) {
        if (!activeKeys.has(k)) {
          decoGroup.remove(entry.mesh);
          placedMap.delete(k);
        }
      }
    },
    dispose: () => {
      for (const g of decoLocalGeos) g.dispose();
      for (const m of decoLocalMats) m.dispose();
      placedMap.clear();
    },
  };
}
