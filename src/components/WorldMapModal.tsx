import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import {
  N,
  T,
  BIOME_NAMES,
  BIOME_COLORS,
  Town,
  NPC,
  StarGem,
  Pearl,
  Feather,
  Quest,
  Ring,
  HollowCreature,
  hash,
  vn,
  fbm,
} from '../game/engine';
import { MEMORY_ECHOES, MOON_DIARY_PAGES, TOWNS_DATA_MM2 } from '../game/worldData';
import { distToSegment, getGlowdeepCell, getMoonRoadCell } from '../game/realmCells';

export type MapLayerId = 0 | 1 | 2 | 3 | 4;

const MIN_ZOOM = 0.35;
const MAX_ZOOM = 8.0;
const BASE_MAP_SIZE = N * 4; // 1040px base coordinate canvas

interface WorldMapModalProps {
  terrain: Uint8Array;
  underwaterDecor?: Uint8Array;
  townMap?: Uint8Array;
  skyTerrain?: Uint8Array;
  skyDecor?: Uint8Array;
  towns: Town[];
  npcs: NPC[];
  hollows?: HollowCreature[];
  rings?: Ring[];
  playerPos: { x: number; y: number; sky: boolean; dive: boolean; glowdeep?: boolean; moonroad?: boolean };
  playerName: string;
  currentBiomeName: string;
  stars: StarGem[];
  pearls: Pearl[];
  feathers: Feather[];
  quests: Quest[];
  mana?: number;
  onTeleportToTown?: (town: Town) => void;
  onClose: () => void;
}

interface AreaDetail {
  id: string;
  title: string;
  subtitle: string;
  type: 'town' | 'npc' | 'tree' | 'landmark' | 'hollow' | 'point';
  x: number;
  y: number;
  icon: string;
  description: string;
  residents?: string[];
  collectiblesInfo?: string;
  distancePaces?: number;
  direction?: string;
  townObj?: Town;
}

interface PhaseLandmark {
  id: string;
  layer: MapLayerId;
  name: string;
  subtitle: string;
  icon: string;
  tx: number;
  ty: number;
  color: string;
  description: string;
  residents?: string[];
}

interface FocusHub {
  id: string;
  label: string;
  icon: string;
  tx: number;
  ty: number;
  zoom: number;
  detail: Omit<AreaDetail, 'distancePaces' | 'direction'>;
}

const ARCHIPELAGO_ISLANDS = [
  { name: 'Lantern Isle', tx: 130, ty: 128, icon: '🏮', desc: 'The verdant heart of the Starlit Archipelago where the Sacred Lantern Tree takes root.' },
  { name: 'Honeycomb Hills', tx: 48, ty: 52, icon: '🍯', desc: 'Golden clover terraces, honey windmills, and Bumble’s humming apiaries.' },
  { name: 'Tidepool Atoll', tx: 42, ty: 202, icon: '🐚', desc: 'Crescent coral lagoons, starlight tidepools, and Tidbit’s coastal lighthouse.' },
  { name: 'Cinder Cradle', tx: 126, ty: 222, icon: '🌋', desc: 'Steaming volcanic hot springs, glowing lava lamps, and Ember’s warm hearth.' },
  { name: 'Mirror Fens', tx: 210, ty: 208, icon: '🪷', desc: 'Misty weeping willows, luminous lily pads, and echoing opera lagoons.' },
  { name: 'Aurora Reach', tx: 214, ty: 52, icon: '❄️', desc: 'Frosted crystal caves and snowfields crowned by dancing emerald auroras.' },
  { name: 'Chime Canopy', tx: 130, ty: 32, icon: '🔔', desc: 'Towering bellwood boughs linked by pentatonic rope bridges.' },
  { name: 'Dawn Spire', tx: 235, ty: 135, icon: '🌅', desc: 'The golden eastern summit where Aurelle awaits the Dawn Duet.' },
];

const PHASE_LANDMARKS: PhaseLandmark[] = [
  // Layer 0: Ground portals & docks
  {
    id: 'lm-lantern-tree',
    layer: 0,
    name: 'Sacred Lantern Tree',
    subtitle: 'Heart of Lantern Isle · Portal Roots',
    icon: '🌟',
    tx: 130,
    ty: 126,
    color: '#ffd23f',
    description: 'Ancient glowing tree whose roots descend into Glowdeep Caverns and whose Lantern Doors connect the 8 realms.',
    residents: ['Wick', 'Pip'],
  },
  {
    id: 'lm-mochi-hamlet',
    layer: 0,
    name: 'Moonlit Cottage & Hamlet',
    subtitle: 'Home Sanctuary',
    icon: '🏡',
    tx: 136,
    ty: 132,
    color: '#ff9ebb',
    description: 'Your cozy cottage sanctuary with botanical garden plots, music box, coral aquarium, and neighbors.',
  },
  {
    id: 'lm-dawn-spire',
    layer: 0,
    name: 'Dawn Spire Summit',
    subtitle: 'Eastern Sanctuary',
    icon: '🌅',
    tx: 235,
    ty: 135,
    color: '#ffd23f',
    description: 'A soaring golden spire on the eastern horizon where the Dawn Chorus will one day be sung.',
    residents: ['Aurelle'],
  },

  // Layer 1: Reef / Sea landmarks
  {
    id: 'lm-coral-hall',
    layer: 1,
    name: 'Coral Concert Hall',
    subtitle: 'Resonant Undersea Amphitheater',
    icon: '🪸',
    tx: 90,
    ty: 175,
    color: '#ff7aa8',
    description: 'A natural prism of singing pink coral tubes where sea currents carry ancient whale-song echoes.',
  },
  {
    id: 'lm-atoll-trench',
    layer: 1,
    name: 'Atoll Sunken Ruins',
    subtitle: 'Submerged Tidepool Cavern',
    icon: '🏛️',
    tx: 46,
    ty: 196,
    color: '#52d6c6',
    description: 'Ancient stone arches beneath Tidepool Atoll accessible at low tide, guarding lost sea pearls.',
    residents: ['Tidbit'],
  },
  {
    id: 'lm-abyss-trench',
    layer: 1,
    name: 'Starlit Kelp Trench',
    subtitle: 'Deep Bioluminescent Reef',
    icon: '🌿',
    tx: 178,
    ty: 176,
    color: '#7bd88f',
    description: 'Towering emerald sea-kelp sway beside deep sapphire trenches where Moon Koi and Lantern Eels glide.',
  },
  {
    id: 'lm-dock-whirlpool',
    layer: 1,
    name: 'Driftwood Dive Lagoon',
    subtitle: 'Surface Entry Reef',
    icon: '🌀',
    tx: 100,
    ty: 162,
    color: '#68c4e4',
    description: 'Clear turquoise plunge-basin just off Driftwood Dock. Great starting spot for pearl diving.',
  },

  // Layer 2: Sky Kingdom landmarks
  {
    id: 'lm-cirrus-castle',
    layer: 2,
    name: 'Cirrus Castle',
    subtitle: 'Royal Cloud Citadel',
    icon: '🏰',
    tx: 136,
    ty: 70,
    color: '#ffd23f',
    description: 'Gleaming alabaster palace floating high above Lantern Isle, home to the Sky Court and rainbow rings.',
  },
  {
    id: 'lm-nimbus-market',
    layer: 2,
    name: 'Nimbus Market',
    subtitle: 'Floating Cloud Bazaar',
    icon: '🛍️',
    tx: 88,
    ty: 88,
    color: '#8fd5ff',
    description: 'An airy trade terrace draped in rainbow awnings where skyfarers barter cloud feathers and starlight wares.',
  },
  {
    id: 'lm-updraft-spire',
    layer: 2,
    name: 'Sunrise Updraft Spire',
    subtitle: 'Eastern Wind Thermal',
    icon: '🌬️',
    tx: 215,
    ty: 120,
    color: '#ffe37a',
    description: 'Warm rising currents spiraling high above Dawn Spire, lifting gliders effortlessly toward the upper clouds.',
  },

  // Layer 3: Glowdeep landmarks
  {
    id: 'lm-rooted-rest',
    layer: 3,
    name: 'Rooted Rest & Nana’s Hearth',
    subtitle: 'Heart of Glowdeep Caverns',
    icon: '🌳',
    tx: 130,
    ty: 130,
    color: '#7bd88f',
    description: 'Golden roots of Nana Mochi cradle a tranquil cavern hub with the cauldron for the Soup of Remembering.',
    residents: ['Lumi'],
  },
  {
    id: 'lm-gondola-west',
    layer: 3,
    name: 'Spore Grotto Gondola Pier',
    subtitle: 'Western Canal Station',
    icon: '🚤',
    tx: 62,
    ty: 145,
    color: '#45e3f5',
    description: 'Lantern-lit crystal gondola dock floating on liquid starlight currents beneath Tidepool Atoll.',
  },
  {
    id: 'lm-cinder-geode',
    layer: 3,
    name: 'Magma Geode Vault',
    subtitle: 'Southern Thermal Cavern',
    icon: '💎',
    tx: 128,
    ty: 215,
    color: '#ff9f70',
    description: 'Warm amber amethyst veins beneath Cinder Cradle where underground springs boil peacefully.',
  },
  {
    id: 'lm-aurora-cavern',
    layer: 3,
    name: 'Prism Ice Grotto',
    subtitle: 'Northeastern Crystal Hall',
    icon: '💠',
    tx: 198,
    ty: 68,
    color: '#b48cff',
    description: 'Refracting quartz pillars singing softly with crystal Cave Echoes below Aurora Reach.',
  },

  // Layer 4: Moon Road landmarks
  {
    id: 'lm-moons-teahouse',
    layer: 4,
    name: 'The Moon’s Tea House',
    subtitle: 'Chamomile & Twilight Pavilion',
    icon: '🍵',
    tx: 130,
    ty: 125,
    color: '#ffd23f',
    description: 'A cozy starlit veranda suspended on silver beams where The Moon pours chamomile twilight tea.',
    residents: ['The Moon'],
  },
  {
    id: 'lm-twin-stars',
    layer: 4,
    name: 'Twin Stars Gazebo',
    subtitle: 'Northern Constellation Arch',
    icon: '✨',
    tx: 90,
    ty: 72,
    color: '#b48cff',
    description: 'Crystal arch dedicated to Kevin & Kevin, shimmering along the northwestern silver ribbon road.',
  },
  {
    id: 'lm-unsung-shrine',
    layer: 4,
    name: 'Shrine of the Unsung Verse',
    subtitle: 'Bridge of Two Notes',
    icon: '🎶',
    tx: 185,
    ty: 112,
    color: '#ff7aa8',
    description: 'Where the 9th Unsung Verse waits between the notes of the Lullaby and the Reveille.',
  },
  {
    id: 'lm-edge-silence',
    layer: 4,
    name: 'The Edge of Silence',
    subtitle: 'Dusk’s Watchtower',
    icon: '🖤',
    tx: 235,
    ty: 135,
    color: '#cbd5e1',
    description: 'Quiet twilight horizon where Dusk the Hollow King whistles his unresolved 4-note melody.',
    residents: ['Dusk'],
  },
];

const PHASE_META: Record<
  MapLayerId,
  {
    label: string;
    shortLabel: string;
    title: string;
    howToReach: string;
    accent: string;
    bgVoid: string;
    legend: { dot: string; label: string }[];
  }
> = {
  0: {
    label: '🌿 Ground',
    shortLabel: 'Ground',
    title: 'Surface Archipelago (8 Islands)',
    howToReach: 'Default Realm · Sail docks with B or walk shores',
    accent: '#ff7aa8',
    bgVoid: '#2f7db8',
    legend: [
      { dot: '#ffd23f', label: 'Star Gems / Tree' },
      { dot: '#ff7aa8', label: 'Towns & Friends' },
      { dot: '#94a3b8', label: 'Hollows' },
      { dot: '#ffffff', label: 'Ferry Lanes' },
    ],
  },
  1: {
    label: '🌊 Reef',
    shortLabel: 'Reef',
    title: 'Coral Kingdom & Abyssal Seafloor',
    howToReach: 'Swim in water and press Dive (V)',
    accent: '#52d6c6',
    bgVoid: '#091f3a',
    legend: [
      { dot: '#3bc1cf', label: 'Coral Shelf' },
      { dot: '#2e9e75', label: 'Kelp Forest' },
      { dot: '#ff7aa8', label: 'Coral Beds / Ruins' },
      { dot: '#ffb3c7', label: 'Sea Pearls' },
    ],
  },
  2: {
    label: '☁️ Sky',
    shortLabel: 'Sky',
    title: 'Cirrus Kingdom & Floating Atolls',
    howToReach: 'Cast Cloud Wings (Key 2) to soar',
    accent: '#8fd5ff',
    bgVoid: '#63b8ec',
    legend: [
      { dot: '#ffffff', label: 'Cirrus Peaks' },
      { dot: '#a7efb0', label: 'Cloud Meadows' },
      { dot: '#ffd23f', label: 'Rainbow Rings' },
      { dot: '#ffe37a', label: 'Feathers / Castle' },
    ],
  },
  3: {
    label: '🍄 Glowdeep',
    shortLabel: 'Glowdeep',
    title: 'Bioluminescent Cavern & Root Canals',
    howToReach: 'Enter Lantern Tree Roots · Ride Crystal Gondola',
    accent: '#b48cff',
    bgVoid: '#0e071a',
    legend: [
      { dot: '#38d6e8', label: 'Gondola Canals' },
      { dot: '#64f5c1', label: 'Glowcap Groves' },
      { dot: '#e85a4f', label: 'Cinder Geodes' },
      { dot: '#7bd88f', label: 'Nana’s Roots' },
    ],
  },
  4: {
    label: '🌙 Moon Road',
    shortLabel: 'Moon Road',
    title: 'Celestial Night Dream Highway',
    howToReach: 'Cast Dreamwalk (Key -) on starry nights',
    accent: '#ffd23f',
    bgVoid: '#05020f',
    legend: [
      { dot: '#ffd23f', label: 'Starlight Road' },
      { dot: '#b48cff', label: 'Constellations' },
      { dot: '#ff7aa8', label: 'Memory / Diary' },
      { dot: '#cbd5e1', label: 'Edge of Silence' },
    ],
  },
};

// Layer bitmap builders use shared getGlowdeepCell / getMoonRoadCell from ../game/realmCells

export const WorldMapModal: React.FC<WorldMapModalProps> = ({
  terrain,
  underwaterDecor,
  townMap,
  skyTerrain,
  skyDecor,
  towns,
  npcs,
  hollows = [],
  rings = [],
  playerPos,
  playerName,
  currentBiomeName,
  stars,
  pearls,
  feathers,
  quests,
  mana = 0,
  onTeleportToTown,
  onClose,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const insetCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Layer selection: 0 = Ground (8 Islands), 1 = Sea Reef, 2 = Cirrus Sky, 3 = Glowdeep, 4 = Moon Road
  const [selectedLayer, setSelectedLayer] = useState<MapLayerId>(
    playerPos.sky ? 2 : playerPos.dive ? 1 : playerPos.glowdeep ? 3 : playerPos.moonroad ? 4 : 0
  );

  // Filters & Search
  const [filterType, setFilterType] = useState<'all' | 'towns' | 'npcs' | 'treasures' | 'quests'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Camera state managed in refs for 60fps smooth animation, synced cleanly to React UI state
  const camRef = useRef({ x: 0, y: 0, zoom: 1.05 });
  const targetCamRef = useRef({ x: 0, y: 0, zoom: 1.05 });
  const lastUiSyncRef = useRef({ zoom: 1.05 });

  const [zoomUi, setZoomUi] = useState(1.05);
  const [selectedArea, setSelectedArea] = useState<AreaDetail | null>(null);
  const [hoverInfo, setHoverInfo] = useState<{ tx: number; ty: number; label: string; icon: string } | null>(null);
  const [hoveredTown, setHoveredTown] = useState<{
    town: Town;
    title: string;
    subtitle: string;
    icon: string;
  } | null>(null);
  const hoverTileRef = useRef<{ tx: number; ty: number } | null>(null);
  const townTooltipRef = useRef<HTMLDivElement | null>(null);
  const hoverCloseTimerRef = useRef<number | null>(null);

  // Gesture / Dragging refs
  const isDraggingRef = useRef(false);
  const pointerDownPosRef = useRef({ x: 0, y: 0 });
  const lastMousePosRef = useRef({ x: 0, y: 0 });
  const lastClickRef = useRef({ time: 0, x: 0, y: 0 });
  const touchModeRef = useRef<'none' | 'pan' | 'pinch'>('none');
  const touchMovedRef = useRef(false);
  const lastPinchRef = useRef<{ dist: number; midX: number; midY: number } | null>(null);
  const lastTapRef = useRef<{ time: number; x: number; y: number }>({ time: 0, x: 0, y: 0 });
  const isInsetDraggingRef = useRef(false);

  // Pre-cached bitmaps for all 5 phases so each phase renders its own authentic map!
  const layerBitmapsRef = useRef<Record<MapLayerId, HTMLCanvasElement | null>>({
    0: null,
    1: null,
    2: null,
    3: null,
    4: null,
  });

  // Keep latest selectedArea & hoveredTown accessible inside RAF without forcing effect restart
  const selectedAreaRef = useRef<AreaDetail | null>(null);
  selectedAreaRef.current = selectedArea;

  // Merge runtime towns + canonical MM2 layer towns so all 5 layers have complete settlements
  const allTowns = useMemo(() => {
    const merged: Town[] = [...towns];
    const essentialLayerTowns = TOWNS_DATA_MM2.filter((t) => t.w >= 1);
    essentialLayerTowns.forEach((lt) => {
      if (!merged.some((m) => m.n.toLowerCase() === lt.n.toLowerCase() && m.w === lt.w)) {
        merged.push({ n: lt.n, x: lt.x, y: lt.y, w: lt.w, vis: lt.vis, island: lt.island });
      }
    });
    return merged;
  }, [towns]);

  // Match a Town on the given layer by name hint or close proximity (handles landmarks coinciding with towns)
  const findMatchingTown = useCallback(
    (tx: number, ty: number, layer: MapLayerId, nameHint?: string): Town | undefined => {
      const layerTowns = allTowns.filter((t) => t.w === layer);
      if (nameHint) {
        const lower = nameHint.toLowerCase();
        const byName = layerTowns.find(
          (t) => lower.includes(t.n.toLowerCase()) || t.n.toLowerCase().includes(lower)
        );
        if (byName) return byName;
      }
      let best: Town | undefined;
      let bestDist = 9;
      for (const t of layerTowns) {
        const d = Math.hypot(t.x - tx, t.y - ty);
        if (d < bestDist) {
          bestDist = d;
          best = t;
        }
      }
      return best;
    },
    [allTowns]
  );

  const visitedTownsOnLayer = useMemo(
    () => allTowns.filter((t) => t.w === selectedLayer && t.vis === 1),
    [allTowns, selectedLayer]
  );

  // Active town to display in the anchored floating map tooltip (hovered town takes precedence over pinned town)
  const activeTooltipTown = useMemo(() => {
    if (hoveredTown && hoveredTown.town.w === selectedLayer) {
      return hoveredTown;
    }
    if (selectedArea?.townObj && selectedArea.townObj.w === selectedLayer) {
      return {
        town: selectedArea.townObj,
        title: selectedArea.title,
        subtitle: selectedArea.subtitle,
        icon: selectedArea.icon,
      };
    }
    return null;
  }, [hoveredTown, selectedArea, selectedLayer]);

  const activeTooltipTownRef = useRef(activeTooltipTown);
  activeTooltipTownRef.current = activeTooltipTown;

  useEffect(() => {
    return () => {
      if (hoverCloseTimerRef.current !== null) {
        window.clearTimeout(hoverCloseTimerRef.current);
      }
    };
  }, []);

  // Get NPC layer consistently across all 5 phases
  const getNpcLayer = useCallback((npc: NPC): MapLayerId => {
    if (npc.moonroad || npc.n === 'The Moon' || npc.n === 'Dusk') return 4;
    if (npc.glowdeep || npc.n === 'Lumi') return 3;
    if (npc.sky) return 2;
    if (npc.sea) return 1;
    return 0;
  }, []);

  // Clamp camera smoothly so map never scrolls completely out of viewport
  const clampCam = useCallback((x: number, y: number, z: number) => {
    const clampedZ = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, z));
    const container = containerRef.current;
    const cw = container?.clientWidth || 800;
    const ch = container?.clientHeight || 520;
    const mapScreenSize = BASE_MAP_SIZE * clampedZ;

    // Keep at least ~20% of the viewport anchored onto map bounds
    const minX = cw * 0.18 - mapScreenSize;
    const maxX = cw * 0.82;
    const minY = ch * 0.18 - mapScreenSize;
    const maxY = ch * 0.82;

    return {
      x: Math.max(minX, Math.min(maxX, x)),
      y: Math.max(minY, Math.min(maxY, y)),
      zoom: clampedZ,
    };
  }, []);

  // Direct camera update (for 1-finger panning & 2-finger pinching)
  const setCameraImmediate = useCallback(
    (x: number, y: number, z: number) => {
      const clamped = clampCam(x, y, z);
      camRef.current = clamped;
      targetCamRef.current = clamped;
      if (Math.abs(clamped.zoom - lastUiSyncRef.current.zoom) >= 0.015) {
        lastUiSyncRef.current.zoom = clamped.zoom;
        setZoomUi(clamped.zoom);
      }
    },
    [clampCam]
  );

  // Smooth animated camera target (for buttons, wheel, hub chips, double-click/tap, search jumps)
  const animateCameraTo = useCallback(
    (x: number, y: number, z: number) => {
      targetCamRef.current = clampCam(x, y, z);
    },
    [clampCam]
  );

  // Focal-point zoom around viewport point (anchorX, anchorY)
  const zoomAtPoint = useCallback(
    (nextZoom: number, anchorX: number, anchorY: number, immediate = false) => {
      const base = immediate ? camRef.current : targetCamRef.current;
      const clampedZ = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, nextZoom));
      const mapX = (anchorX - base.x) / base.zoom;
      const mapY = (anchorY - base.y) / base.zoom;
      const nextX = anchorX - mapX * clampedZ;
      const nextY = anchorY - mapY * clampedZ;
      if (immediate) {
        setCameraImmediate(nextX, nextY, clampedZ);
      } else {
        animateCameraTo(nextX, nextY, clampedZ);
      }
    },
    [animateCameraTo, setCameraImmediate]
  );

  // Build distinct 260x260 offscreen terrain bitmaps for each of the 5 phases
  useEffect(() => {
    const makeCanvas = (painter: (data: Uint8ClampedArray) => void) => {
      const off = document.createElement('canvas');
      off.width = N;
      off.height = N;
      const ctx = off.getContext('2d');
      if (!ctx) return null;
      const img = ctx.createImageData(N, N);
      painter(img.data);
      ctx.putImageData(img, 0, 0);
      return off;
    };

    const hexToRgb = (hex: string): [number, number, number] => {
      const num = parseInt(hex.replace('#', ''), 16);
      return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
    };

    const groundPalette = BIOME_COLORS.map(hexToRgb);

    // 0. GROUND ARCHIPELAGO BITMAP
    layerBitmapsRef.current[0] = makeCanvas((data) => {
      for (let y = 0; y < N; y++) {
        for (let x = 0; x < N; x++) {
          const i = y * N + x;
          const b = terrain[i] || 0;
          let rgb = groundPalette[b] || [95, 176, 230];

          if (b >= 2 && x > 0 && y > 0 && x < N - 1 && y < N - 1) {
            if (terrain[i - 1] < 2 || terrain[i + 1] < 2 || terrain[i - N] < 2 || terrain[i + N] < 2) {
              rgb = [252, 245, 224];
            }
          }
          if (townMap && townMap[i] === 2) {
            rgb = [225, 210, 188];
          }
          const idx = i * 4;
          data[idx] = rgb[0];
          data[idx + 1] = rgb[1];
          data[idx + 2] = rgb[2];
          data[idx + 3] = 255;
        }
      }
    });

    // 1. UNDERSEA REEF BITMAP
    layerBitmapsRef.current[1] = makeCanvas((data) => {
      for (let y = 0; y < N; y++) {
        for (let x = 0; x < N; x++) {
          const i = y * N + x;
          const b = terrain[i] || 0;
          const ud = underwaterDecor ? underwaterDecor[i] : 0;
          const ridge = fbm(x * 0.05, y * 0.05, 51);

          let r = 14,
            g = 48,
            bl = 92;

          if (b >= 2) {
            const isCliffEdge =
              x > 0 &&
              y > 0 &&
              x < N - 1 &&
              y < N - 1 &&
              (terrain[i - 1] < 2 || terrain[i + 1] < 2 || terrain[i - N] < 2 || terrain[i + N] < 2);
            if (isCliffEdge) {
              r = 45;
              g = 96;
              bl = 132;
            } else {
              r = 12 + Math.round(ridge * 12);
              g = 26 + Math.round(ridge * 14);
              bl = 46 + Math.round(ridge * 18);
            }
          } else if (b === 1) {
            r = 38 + Math.round(ridge * 24);
            g = 158 + Math.round(ridge * 38);
            bl = 186 + Math.round(ridge * 25);
          } else {
            if (ridge < 0.42) {
              r = 9;
              g = 28;
              bl = 64;
            } else {
              r = 17 + Math.round(ridge * 18);
              g = 62 + Math.round(ridge * 30);
              bl = 124 + Math.round(ridge * 24);
            }
          }

          if (ud === 1) {
            r = 42;
            g = 175;
            bl = 128;
          } else if (ud === 2) {
            r = 255;
            g = 122;
            bl = 168;
          } else if (ud === 3 || ud === 4) {
            r = 156;
            g = 228;
            bl = 248;
          } else if (ud === 5 || ud === 6 || ud === 7) {
            r = 255;
            g = 218;
            bl = 125;
          }

          const idx = i * 4;
          data[idx] = r;
          data[idx + 1] = g;
          data[idx + 2] = bl;
          data[idx + 3] = 255;
        }
      }
    });

    // 2. CIRRUS SKY KINGDOM BITMAP
    layerBitmapsRef.current[2] = makeCanvas((data) => {
      for (let y = 0; y < N; y++) {
        for (let x = 0; x < N; x++) {
          const i = y * N + x;
          const sb = skyTerrain ? skyTerrain[i] : 0;
          const sd = skyDecor ? skyDecor[i] : 0;
          const wisp = vn(x * 0.045, y * 0.045, 39);

          let r = 104 + Math.round(wisp * 38);
          let g = 188 + Math.round(wisp * 34);
          let b = 245;

          const shadowSrcX = Math.max(0, x - 2);
          const shadowSrcY = Math.max(0, y - 3);
          const hasShadow = skyTerrain && sb === 0 && skyTerrain[shadowSrcY * N + shadowSrcX] > 0;
          if (hasShadow) {
            r = 56;
            g = 122;
            b = 184;
          }

          if (sb === 1) {
            r = 174;
            g = 238;
            b = 170;
          } else if (sb === 2) {
            r = 255;
            g = 253;
            b = 250;
          } else if (sb === 3) {
            r = 216;
            g = 243;
            b = 255;
          } else if (sb === 4) {
            r = 255;
            g = 214;
            b = 148;
          }

          if (sb > 0 && x > 0 && y > 0 && x < N - 1 && y < N - 1 && skyTerrain) {
            if (skyTerrain[i - 1] === 0 || skyTerrain[i + 1] === 0 || skyTerrain[i - N] === 0 || skyTerrain[i + N] === 0) {
              r = 255;
              g = 255;
              b = 255;
            }
          }

          if (sd === 9) {
            r = 255;
            g = 210;
            b = 63;
          } else if (sd === 1 || sd === 2) {
            r = 120;
            g = 214;
            b = 148;
          } else if (sd === 3) {
            r = 255;
            g = 152;
            b = 198;
          }

          const idx = i * 4;
          data[idx] = r;
          data[idx + 1] = g;
          data[idx + 2] = b;
          data[idx + 3] = 255;
        }
      }
    });

    // 3. GLOWDEEP CAVERNS BITMAP
    layerBitmapsRef.current[3] = makeCanvas((data) => {
      for (let y = 0; y < N; y++) {
        for (let x = 0; x < N; x++) {
          const i = y * N + x;
          const cell = getGlowdeepCell(x, y);
          const nVal = vn(x * 0.14, y * 0.14, 93);

          let r = 18,
            g = 11,
            b = 34;

          switch (cell) {
            case 'wall':
              r = 16 + Math.round(nVal * 10);
              g = 10 + Math.round(nVal * 8);
              b = 32 + Math.round(nVal * 14);
              break;
            case 'chamber':
              r = 38 + Math.round(nVal * 16);
              g = 24 + Math.round(nVal * 12);
              b = 68 + Math.round(nVal * 22);
              break;
            case 'canal':
              r = 24 + Math.round(nVal * 32);
              g = 182 + Math.round(nVal * 48);
              b = 224 + Math.round(nVal * 26);
              break;
            case 'glowcap':
              if (hash(x, y, 94) > 0.45) {
                r = 98;
                g = 245;
                b = 192;
              } else {
                r = 198;
                g = 132;
                b = 255;
              }
              break;
            case 'cinder':
              r = 232;
              g = 96;
              b = 78;
              break;
            case 'roots':
              r = 255;
              g = 212;
              b = 92;
              break;
          }

          const idx = i * 4;
          data[idx] = r;
          data[idx + 1] = g;
          data[idx + 2] = b;
          data[idx + 3] = 255;
        }
      }
    });

    // 4. MOON ROAD BITMAP
    layerBitmapsRef.current[4] = makeCanvas((data) => {
      for (let y = 0; y < N; y++) {
        for (let x = 0; x < N; x++) {
          const i = y * N + x;
          const cell = getMoonRoadCell(x, y);
          const neb1 = fbm(x * 0.03, y * 0.03, 102);
          const twinkle = hash(x, y, 105);

          let r = 9,
            g = 5,
            b = 24;

          switch (cell) {
            case 'void':
              r = 8 + Math.round(neb1 * 12);
              g = 5 + Math.round(neb1 * 8);
              b = 24 + Math.round(neb1 * 22);
              if (twinkle < 0.012) {
                r = 245;
                g = 235;
                b = 255;
              }
              break;
            case 'nebula':
              r = 38 + Math.round(neb1 * 48);
              g = 18 + Math.round(neb1 * 32);
              b = 88 + Math.round(neb1 * 56);
              if (twinkle < 0.025) {
                r = 255;
                g = 220;
                b = 140;
              }
              break;
            case 'road':
              r = 166 + Math.round(neb1 * 64);
              g = 146 + Math.round(neb1 * 76);
              b = 255;
              break;
            case 'platform':
              r = 255;
              g = 226;
              b = 132;
              break;
            case 'silence':
              r = 46;
              g = 52;
              b = 76;
              if (twinkle < 0.03) {
                r = 190;
                g = 205;
                b = 230;
              }
              break;
          }

          const idx = i * 4;
          data[idx] = r;
          data[idx + 1] = g;
          data[idx + 2] = b;
          data[idx + 3] = 255;
        }
      }
    });
  }, [terrain, underwaterDecor, townMap, skyTerrain, skyDecor]);

  // Center on player on initial load
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const w = container.clientWidth;
    const h = container.clientHeight;
    const initZoom = w < 640 ? 0.85 : 1.1;

    const playerNormX = (playerPos.x / (N * T)) * BASE_MAP_SIZE;
    const playerNormY = (playerPos.y / (N * T)) * BASE_MAP_SIZE;

    setCameraImmediate(
      w / 2 - playerNormX * initZoom,
      h / 2 - playerNormY * initZoom,
      initZoom
    );
  }, [setCameraImmediate, playerPos.x, playerPos.y]);

  // Non-passive native wheel listener for smooth cursor-anchored zoom
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const rect = el.getBoundingClientRect();
      const anchorX = e.clientX - rect.left;
      const anchorY = e.clientY - rect.top;

      // Normalize deltaMode (pixels vs lines vs pages)
      let deltaY = e.deltaY;
      if (e.deltaMode === 1) deltaY *= 28;
      else if (e.deltaMode === 2) deltaY *= 240;

      const factor = Math.exp(-deltaY * 0.0018);
      const nextZ = targetCamRef.current.zoom * factor;
      zoomAtPoint(nextZ, anchorX, anchorY, false);
    };

    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [zoomAtPoint]);

  // Compute direction and distance from player
  const getNavInfo = useCallback(
    (targetWorldX: number, targetWorldY: number) => {
      const dx = targetWorldX - playerPos.x;
      const dy = targetWorldY - playerPos.y;
      const distPixels = Math.hypot(dx, dy);
      const paces = Math.round(distPixels / 20);

      const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
      let dir = 'East ➡️';
      if (angle >= -22.5 && angle < 22.5) dir = 'East ➡️';
      else if (angle >= 22.5 && angle < 67.5) dir = 'South-East ↘️';
      else if (angle >= 67.5 && angle < 112.5) dir = 'South ⬇️';
      else if (angle >= 112.5 && angle < 157.5) dir = 'South-West ↙️';
      else if (angle >= 157.5 || angle < -157.5) dir = 'West ⬅️';
      else if (angle >= -157.5 && angle < -112.5) dir = 'North-West ↖️';
      else if (angle >= -112.5 && angle < -67.5) dir = 'North ⬆️';
      else if (angle >= -67.5 && angle < -22.5) dir = 'North-East ↗️';

      return { paces, dir };
    },
    [playerPos]
  );

  // Compute Focus Hubs dynamically for the active phase (Landmarks + layer settlements/islands)
  const activeFocusHubs = useMemo<FocusHub[]>(() => {
    const hubs: FocusHub[] = [];

    PHASE_LANDMARKS.filter((lm) => lm.layer === selectedLayer).forEach((lm) => {
      const matchedTown = findMatchingTown(lm.tx, lm.ty, selectedLayer, lm.name);
      hubs.push({
        id: lm.id,
        label: lm.name.split('&')[0].trim(),
        icon: lm.icon,
        tx: lm.tx,
        ty: lm.ty,
        zoom: 2.8,
        detail: {
          id: lm.id,
          title: lm.name,
          subtitle: `${PHASE_META[selectedLayer].label} · ${lm.subtitle}`,
          type: 'landmark',
          x: (matchedTown ? matchedTown.x : lm.tx) * T,
          y: (matchedTown ? matchedTown.y : lm.ty) * T,
          icon: lm.icon,
          description: lm.description,
          residents: lm.residents,
          collectiblesInfo: matchedTown
            ? matchedTown.vis === 1
              ? '🌀 Teleportation Unlocked'
              : '🔒 Visit in person to unlock Teleport'
            : undefined,
          townObj: matchedTown,
        },
      });
    });

    // Add towns in active layer that aren't duplicates of landmarks
    allTowns
      .filter((t) => t.w === selectedLayer)
      .forEach((t) => {
        if (hubs.some((h) => Math.hypot(h.tx - t.x, h.ty - t.y) < 10)) return;
        hubs.push({
          id: `hub-town-${t.n}`,
          label: t.n,
          icon: '🏘️',
          tx: t.x,
          ty: t.y,
          zoom: 2.6,
          detail: {
            id: `town-${t.n}`,
            title: t.n,
            subtitle: `${PHASE_META[selectedLayer].label} Settlement`,
            type: 'town',
            x: t.x * T,
            y: t.y * T,
            icon: '🏘️',
            description: `A welcoming hub in the ${PHASE_META[selectedLayer].title} phase.`,
            collectiblesInfo: t.vis === 1 ? '🌀 Fast Travel Unlocked' : '🔒 Visit in person to unlock Song of Teleportation',
            townObj: t,
          },
        });
      });

    // On Ground phase, also include all 8 islands so players can zip straight into any island
    if (selectedLayer === 0) {
      ARCHIPELAGO_ISLANDS.forEach((isl) => {
        if (hubs.some((h) => h.label.toLowerCase().includes(isl.name.toLowerCase()))) return;
        hubs.push({
          id: `hub-isl-${isl.name}`,
          label: isl.name,
          icon: isl.icon,
          tx: isl.tx,
          ty: isl.ty,
          zoom: 2.1,
          detail: {
            id: `isl-${isl.name}`,
            title: isl.name,
            subtitle: 'Archipelago Island Region',
            type: 'landmark',
            x: isl.tx * T,
            y: isl.ty * T,
            icon: isl.icon,
            description: isl.desc,
          },
        });
      });
    }

    return hubs;
  }, [selectedLayer, allTowns, findMatchingTown]);

  // Smooth fly to world coords or tile coords
  const flyToWorld = useCallback(
    (worldX: number, worldY: number, targetZoom = 2.6, layer?: MapLayerId) => {
      if (layer !== undefined) {
        setSelectedLayer(layer);
      }
      const container = containerRef.current;
      if (!container) return;
      const cw = container.clientWidth;
      const ch = container.clientHeight;
      const mx = (worldX / (N * T)) * BASE_MAP_SIZE;
      const my = (worldY / (N * T)) * BASE_MAP_SIZE;
      const z = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, targetZoom));
      animateCameraTo(cw / 2 - mx * z, ch / 2 - my * z, z);
    },
    [animateCameraTo]
  );

  // Switch layer handler (preserves current zoom/pan for vertical layer comparison unless user clicks a hub or Fit Map)
  const handleSelectLayer = useCallback((layer: MapLayerId) => {
    setSelectedLayer(layer);
    setSelectedArea(null);
  }, []);

  // Center on Player handler
  const handleCenterOnPlayer = useCallback(() => {
    const targetLayer: MapLayerId = playerPos.sky ? 2 : playerPos.dive ? 1 : playerPos.glowdeep ? 3 : playerPos.moonroad ? 4 : 0;
    flyToWorld(playerPos.x, playerPos.y, 2.2, targetLayer);
  }, [flyToWorld, playerPos.dive, playerPos.glowdeep, playerPos.moonroad, playerPos.sky, playerPos.x, playerPos.y]);

  // Fit Entire Phase Map
  const handleFitAll = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    const cw = container.clientWidth;
    const ch = container.clientHeight;
    const fitZoom = Math.max(MIN_ZOOM, Math.min((cw - 36) / BASE_MAP_SIZE, (ch - 36) / BASE_MAP_SIZE));
    animateCameraTo((cw - BASE_MAP_SIZE * fitZoom) / 2, (ch - BASE_MAP_SIZE * fitZoom) / 2, fitZoom);
  }, [animateCameraTo]);

  // Zoom +/- centered on viewport middle
  const handleStepZoom = useCallback(
    (multiplier: number) => {
      const container = containerRef.current;
      if (!container) return;
      zoomAtPoint(targetCamRef.current.zoom * multiplier, container.clientWidth / 2, container.clientHeight / 2);
    },
    [zoomAtPoint]
  );

  // Keyboard navigation inside modal
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const activeTag = document.activeElement?.tagName;
      if (activeTag === 'INPUT' || activeTag === 'TEXTAREA') {
        if (e.key === 'Escape') (document.activeElement as HTMLElement).blur();
        return;
      }

      if (e.key === 'Escape') {
        e.stopPropagation();
        if (selectedAreaRef.current) setSelectedArea(null);
        else onClose();
        return;
      }

      const container = containerRef.current;
      const cw = container?.clientWidth || 800;
      const ch = container?.clientHeight || 500;
      const panStep = 85;

      if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        zoomAtPoint(targetCamRef.current.zoom * 1.35, cw / 2, ch / 2);
      } else if (e.key === '-' || e.key === '_') {
        e.preventDefault();
        zoomAtPoint(targetCamRef.current.zoom * 0.74, cw / 2, ch / 2);
      } else if (e.key === '0' || e.key.toLowerCase() === 'f') {
        e.preventDefault();
        handleFitAll();
      } else if (e.key.toLowerCase() === 'c') {
        e.preventDefault();
        handleCenterOnPlayer();
      } else if (e.key === 'ArrowLeft' || e.key.toLowerCase() === 'a') {
        e.preventDefault();
        animateCameraTo(targetCamRef.current.x + panStep, targetCamRef.current.y, targetCamRef.current.zoom);
      } else if (e.key === 'ArrowRight' || e.key.toLowerCase() === 'd') {
        e.preventDefault();
        animateCameraTo(targetCamRef.current.x - panStep, targetCamRef.current.y, targetCamRef.current.zoom);
      } else if (e.key === 'ArrowUp' || e.key.toLowerCase() === 'w') {
        e.preventDefault();
        animateCameraTo(targetCamRef.current.x, targetCamRef.current.y + panStep, targetCamRef.current.zoom);
      } else if (e.key === 'ArrowDown' || e.key.toLowerCase() === 's') {
        e.preventDefault();
        animateCameraTo(targetCamRef.current.x, targetCamRef.current.y - panStep, targetCamRef.current.zoom);
      } else if (['1', '2', '3', '4', '5'].includes(e.key)) {
        e.preventDefault();
        handleSelectLayer((parseInt(e.key, 10) - 1) as MapLayerId);
      }
    };

    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [animateCameraTo, handleCenterOnPlayer, handleFitAll, handleSelectLayer, onClose, zoomAtPoint]);

  // Describe a single tile deterministically per layer (used both for hover preview & click inspection)
  const describeTile = useCallback(
    (tileX: number, tileY: number, layer: MapLayerId): { title: string; icon: string; description: string } => {
      const idx = tileY * N + tileX;

      if (layer === 0) {
        const bIdx = terrain[idx];
        const isCobble = townMap && townMap[idx] === 2;
        if (isCobble) {
          return {
            title: 'Cobblestone Village Plaza',
            icon: '🏘️',
            description: 'Warm hand-laid flagstones connecting island cottages, shops, and glowing lantern posts.',
          };
        }
        return {
          title: BIOME_NAMES[bIdx] || 'Open Ocean',
          icon: bIdx < 2 ? '🌊' : '🌿',
          description:
            bIdx < 2
              ? 'Sparkling surface waters connecting the 8 islands. Swim here and press Dive (V) to descend to the Reef!'
              : 'Lush surface archipelago terrain dotted with wildflowers, star gems, and friendly islanders.',
        };
      }

      if (layer === 1) {
        const b = terrain[idx];
        const ud = underwaterDecor ? underwaterDecor[idx] : 0;
        if (ud === 1) {
          return {
            title: 'Giant Kelp Forest',
            icon: '🌿',
            description: 'Swaying emerald kelp fronds sheltering bright reef minnows and hidden sea pearls.',
          };
        }
        if (ud === 2) {
          return {
            title: 'Blooming Coral Reef Bed',
            icon: '🪸',
            description: 'Vibrant rose-coral formations nourished by warm shallow currents and sea pearls.',
          };
        }
        if (ud === 3 || ud === 4) {
          return {
            title: 'Sunken Marble Ruins',
            icon: '🏛️',
            description: 'Ancient sunken pillars and glowing sea anemones from before the Great Slumber.',
          };
        }
        if (ud === 5 || ud === 6 || ud === 7) {
          return {
            title: 'Reef Lantern Pavilion',
            icon: '🏮',
            description: 'Pearlescent sea-dwellings lit by glowing clam lanterns on the ocean floor.',
          };
        }
        if (b >= 2) {
          return {
            title: 'Submerged Island Bedrock',
            icon: '🪨',
            description: 'Solid basalt rock beneath the surface islands, framing undersea reef shelves.',
          };
        }
        if (b === 1) {
          return {
            title: 'Sunlit Coral Lagoon Shelf',
            icon: '🐚',
            description: 'Turquoise shallows shimmering with dappled sunlight and scattered pearl oysters.',
          };
        }
        return {
          title: 'Abyssal Sea Trench',
          icon: '🌌',
          description: 'Deep indigo undersea waters patrolled by luminescent squid and glowing moon fish.',
        };
      }

      if (layer === 2) {
        const sb = skyTerrain ? skyTerrain[idx] : 0;
        const sd = skyDecor ? skyDecor[idx] : 0;
        if (sd === 9) {
          return {
            title: 'Cirrus Castle Terrace',
            icon: '🏰',
            description: 'Gilded cloud-stone battlements standing high above the archipelago.',
          };
        }
        if (sb === 2) {
          return {
            title: 'Alabaster Cirrus Peak',
            icon: '🏔️',
            description: 'Fluffy snow-white cloud summit catching pure morning sunlight.',
          };
        }
        if (sb === 1) {
          return {
            title: 'Sky Meadow Platform',
            icon: '☁️',
            description: 'Buoyant green-turf cloud island dotted with drifting feathers and sky blossoms.',
          };
        }
        if (sb === 4) {
          return {
            title: 'Golden Sunset Cloud Atoll',
            icon: '🌅',
            description: 'Amber-tinted sky island suspended along the outer cirrus wind lanes.',
          };
        }
        if (sb === 3) {
          return {
            title: 'High Cumulus Mist Shoal',
            icon: '💨',
            description: 'Soft vapor stepping-stone ideal for gliding between major sky settlements.',
          };
        }
        return {
          title: 'Open Cirrus Jetstream',
          icon: '🪽',
          description: 'Wide cerulean sky currents. Fly through golden Rainbow Rings for speed bursts!',
        };
      }

      if (layer === 3) {
        const cell = getGlowdeepCell(tileX, tileY);
        if (cell === 'roots') {
          return {
            title: 'Nana Mochi’s Taproot Sanctuary',
            icon: '🌳',
            description: 'Luminous golden roots descending from the Sacred Lantern Tree into the cavern heart.',
          };
        }
        if (cell === 'canal') {
          return {
            title: 'Crystal Gondola Waterway',
            icon: '🚤',
            description: 'A glowing cyan subterranean river carrying crystal gondolas between underground grottoes.',
          };
        }
        if (cell === 'glowcap') {
          return {
            title: 'Glowcap Mushroom Grove',
            icon: '🍄',
            description: 'Bioluminescent mint and violet fungi illuminating the dark stone with soothing spores.',
          };
        }
        if (cell === 'cinder') {
          return {
            title: 'Cinder Thermal Magma Vein',
            icon: '🔥',
            description: 'Strawberry-warm geothermal fissures heating the southern caverns below Cinder Cradle.',
          };
        }
        if (cell === 'chamber') {
          return {
            title: 'Echoing Crystal Cavern',
            icon: '💠',
            description: 'Open subterranean hall lined with shimmering quartz veins and ancient cave echoes.',
          };
        }
        return {
          title: 'Deep Basalt Cavern Wall',
          icon: '🪨',
          description: 'Solid volcanic stone carving natural tunnels between the subterranean crystal rivers.',
        };
      }

      const cell = getMoonRoadCell(tileX, tileY);
      if (cell === 'platform') {
        return {
          title: 'Starlight Tea Pavilion',
          icon: '🍵',
          description: 'Dream-woven silver terrace floating softly above the mortal world.',
        };
      }
      if (cell === 'road') {
        return {
          title: 'The Silver Moon Road',
          icon: '🌙',
          description: 'A luminous starlight ribbon path walked only by Dreamwalkers during quiet night hours.',
        };
      }
      if (cell === 'silence') {
        return {
          title: 'The Edge of Silence',
          icon: '🖤',
          description: 'Hushed twilight border where Dusk kept lonely watch until a welcoming note arrived.',
        };
      }
      if (cell === 'nebula') {
        return {
          title: 'Chamomile Aurora Nebula',
          icon: '🌌',
          description: 'Soft violet cosmic clouds infused with memories of the Moon’s slumber.',
        };
      }
      return {
        title: 'Starlit Dream Void',
        icon: '✨',
        description: 'Deep velvet night sky speckled with distant constellations and sleeping lullabies.',
      };
    },
    [skyDecor, skyTerrain, terrain, townMap, underwaterDecor]
  );

  // Main 60fps Canvas Render Loop with Progressive Level of Detail (LOD) & Smooth Camera Interpolation
  useEffect(() => {
    let animId: number;

    const render = () => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) {
        animId = requestAnimationFrame(render);
        return;
      }

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const cw = container.clientWidth;
      const ch = container.clientHeight;
      if (canvas.width !== cw || canvas.height !== ch) {
        canvas.width = cw;
        canvas.height = ch;
      }

      // Smoothly interpolate camera toward targetCamRef
      const cam = camRef.current;
      const target = targetCamRef.current;
      const dx = target.x - cam.x;
      const dy = target.y - cam.y;
      const dz = target.zoom - cam.zoom;

      if (Math.abs(dx) > 0.08 || Math.abs(dy) > 0.08 || Math.abs(dz) > 0.0005) {
        const lerpSpeed = 0.25;
        cam.x += dx * lerpSpeed;
        cam.y += dy * lerpSpeed;
        cam.zoom += dz * lerpSpeed;
      } else {
        cam.x = target.x;
        cam.y = target.y;
        cam.zoom = target.zoom;
      }

      if (Math.abs(cam.zoom - lastUiSyncRef.current.zoom) >= 0.015) {
        lastUiSyncRef.current.zoom = cam.zoom;
        setZoomUi(cam.zoom);
      }

      const z = cam.zoom;
      // Adaptive readable scaling for overlays/labels at deep zoom
      const markerScale = Math.max(0.24, Math.min(1.05, 1 / Math.pow(z, 0.7)));
      const tileSizePx = BASE_MAP_SIZE / N; // 4 map units per tile
      const toPx = (tx: number) => (tx / N) * BASE_MAP_SIZE;

      ctx.clearRect(0, 0, cw, ch);

      // Phase-Specific Void Background
      ctx.fillStyle = PHASE_META[selectedLayer].bgVoid;
      ctx.fillRect(0, 0, cw, ch);

      ctx.save();
      ctx.translate(cam.x, cam.y);
      ctx.scale(z, z);

      const activeBitmap = layerBitmapsRef.current[selectedLayer];

      // 1. Draw Selected Phase's Own Terrain Bitmap
      if (activeBitmap) {
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(activeBitmap, 0, 0, BASE_MAP_SIZE, BASE_MAP_SIZE);
        ctx.imageSmoothingEnabled = true;
      }

      // Visible tile window for LOD micro-detail and pixel grid
      const visMinTx = Math.max(0, Math.floor((-cam.x / z / BASE_MAP_SIZE) * N) - 1);
      const visMaxTx = Math.min(N - 1, Math.ceil(((cw - cam.x) / z / BASE_MAP_SIZE) * N) + 1);
      const visMinTy = Math.max(0, Math.floor((-cam.y / z / BASE_MAP_SIZE) * N) - 1);
      const visMaxTy = Math.min(N - 1, Math.ceil(((ch - cam.y) / z / BASE_MAP_SIZE) * N) + 1);

      // 2. Progressive Micro-Detail Overlay when zoomed in (z >= 2.6)
      if (z >= 2.6 && visMaxTx - visMinTx <= 125 && visMaxTy - visMinTy <= 125) {
        ctx.save();
        for (let ty = visMinTy; ty <= visMaxTy; ty++) {
          for (let tx = visMinTx; tx <= visMaxTx; tx++) {
            const idx = ty * N + tx;
            const px = tx * tileSizePx;
            const py = ty * tileSizePx;

            if (selectedLayer === 1) {
              const ud = underwaterDecor ? underwaterDecor[idx] : 0;
              if (ud === 1) {
                // Kelp strokes
                ctx.strokeStyle = 'rgba(130, 255, 196, 0.75)';
                ctx.lineWidth = 0.55;
                ctx.beginPath();
                ctx.moveTo(px + 1.2, py + 3.4);
                ctx.quadraticCurveTo(px + 2.4, py + 2.0, px + 1.6, py + 0.6);
                ctx.stroke();
              } else if (ud === 2) {
                // Pink coral polyps
                ctx.fillStyle = 'rgba(255, 224, 238, 0.85)';
                ctx.beginPath();
                ctx.arc(px + 1.3, py + 1.6, 0.55, 0, Math.PI * 2);
                ctx.arc(px + 2.7, py + 2.5, 0.45, 0, Math.PI * 2);
                ctx.fill();
              } else if (ud === 3 || ud === 4) {
                // Marble ruin pillar square
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
                ctx.lineWidth = 0.45;
                ctx.strokeRect(px + 1, py + 1, 2, 2);
              }
            } else if (selectedLayer === 2) {
              const sb = skyTerrain ? skyTerrain[idx] : 0;
              if (sb === 2) {
                ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
                ctx.beginPath();
                ctx.arc(px + 2, py + 2, 0.8, 0, Math.PI * 2);
                ctx.fill();
              }
            } else if (selectedLayer === 3) {
              const cell = getGlowdeepCell(tx, ty);
              if (cell === 'glowcap') {
                ctx.fillStyle = 'rgba(255, 255, 255, 0.82)';
                ctx.beginPath();
                ctx.arc(px + 2, py + 1.8, 0.65, Math.PI, 0);
                ctx.fill();
              } else if (cell === 'canal' && (tx + ty) % 3 === 0) {
                ctx.strokeStyle = 'rgba(210, 255, 255, 0.6)';
                ctx.lineWidth = 0.4;
                ctx.beginPath();
                ctx.moveTo(px + 0.6, py + 2);
                ctx.lineTo(px + 3.2, py + 2);
                ctx.stroke();
              }
            } else if (selectedLayer === 4) {
              const cell = getMoonRoadCell(tx, ty);
              if (cell === 'road' && hash(tx, ty, 33) < 0.25) {
                ctx.fillStyle = 'rgba(255, 245, 200, 0.85)';
                ctx.fillRect(px + 1.6, py + 1.6, 0.8, 0.8);
              }
            } else if (selectedLayer === 0 && townMap && townMap[idx] === 2) {
              ctx.strokeStyle = 'rgba(130, 95, 70, 0.32)';
              ctx.lineWidth = 0.35;
              ctx.strokeRect(px + 0.5, py + 0.5, 3, 3);
            }
          }
        }
        ctx.restore();
      }

      // 3. Subtle Tile Coordinate Grid when zoomed deep (z >= 2.3)
      if (z >= 2.3) {
        ctx.save();
        ctx.strokeStyle =
          selectedLayer === 2 || selectedLayer === 0 ? 'rgba(25, 20, 45, 0.14)' : 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = 0.75 / z;
        ctx.beginPath();
        for (let tx = visMinTx; tx <= visMaxTx + 1; tx++) {
          const x = tx * tileSizePx;
          ctx.moveTo(x, visMinTy * tileSizePx);
          ctx.lineTo(x, (visMaxTy + 1) * tileSizePx);
        }
        for (let ty = visMinTy; ty <= visMaxTy + 1; ty++) {
          const y = ty * tileSizePx;
          ctx.moveTo(visMinTx * tileSizePx, y);
          ctx.lineTo((visMaxTx + 1) * tileSizePx, y);
        }
        ctx.stroke();
        ctx.restore();
      }

      // 4. Phase-Specific Cartographic Vectors (Routes, Contours, Constellations, Updrafts)
      if (selectedLayer === 0) {
        ctx.save();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.38)';
        ctx.lineWidth = 2 * markerScale;
        ctx.setLineDash([6 * markerScale, 6 * markerScale]);
        const hubX = toPx(118);
        const hubY = toPx(148);
        [
          [48, 52],
          [42, 202],
          [126, 222],
          [210, 208],
          [214, 52],
          [130, 32],
          [235, 135],
        ].forEach(([ix, iy]) => {
          ctx.beginPath();
          ctx.moveTo(hubX, hubY);
          ctx.lineTo(toPx(ix), toPx(iy));
          ctx.stroke();
        });
        ctx.restore();

        // 8 Archipelago Island Banner Labels
        ctx.save();
        const fontSize = Math.max(4.5, 12.5 * markerScale);
        ctx.font = `900 ${fontSize}px Nunito, sans-serif`;
        ctx.textAlign = 'center';
        ARCHIPELAGO_ISLANDS.forEach((isl) => {
          const lx = toPx(isl.tx);
          const ly = toPx(isl.ty);
          ctx.lineWidth = Math.max(1.2, 3.6 * markerScale);
          ctx.strokeStyle = 'rgba(28, 22, 48, 0.8)';
          ctx.fillStyle = '#fff5d6';
          ctx.strokeText(isl.name.toUpperCase(), lx, ly - 17 * markerScale);
          ctx.fillText(isl.name.toUpperCase(), lx, ly - 17 * markerScale);
        });
        ctx.restore();
      } else if (selectedLayer === 1) {
        ctx.save();
        ctx.strokeStyle = 'rgba(104, 240, 226, 0.6)';
        ctx.lineWidth = 2.4 * markerScale;
        ctx.setLineDash([4 * markerScale, 6 * markerScale]);
        const pts = [
          [100, 162],
          [90, 175],
          [46, 196],
          [178, 176],
          [100, 162],
        ];
        ctx.beginPath();
        pts.forEach(([px, py], i) => {
          if (i === 0) ctx.moveTo(toPx(px), toPx(py));
          else ctx.lineTo(toPx(px), toPx(py));
        });
        ctx.stroke();
        ctx.restore();
      } else if (selectedLayer === 2) {
        ctx.save();
        ctx.strokeStyle = 'rgba(255, 250, 210, 0.65)';
        ctx.lineWidth = 2.4 * markerScale;
        ctx.setLineDash([8 * markerScale, 6 * markerScale]);
        [
          [88, 88, 136, 70],
          [136, 70, 215, 120],
          [88, 88, 130, 126],
        ].forEach(([x1, y1, x2, y2]) => {
          ctx.beginPath();
          ctx.moveTo(toPx(x1), toPx(y1));
          ctx.quadraticCurveTo(toPx((x1 + x2) / 2), toPx((y1 + y2) / 2 - 14), toPx(x2), toPx(y2));
          ctx.stroke();
        });
        ctx.restore();

        if (filterType === 'all' || filterType === 'treasures') {
          rings.forEach((ring) => {
            if (!ring.got) {
              const rx = (ring.x / (N * T)) * BASE_MAP_SIZE;
              const ry = (ring.y / (N * T)) * BASE_MAP_SIZE;
              ctx.save();
              ctx.strokeStyle = '#ffd23f';
              ctx.lineWidth = 2.1 * markerScale;
              ctx.beginPath();
              ctx.arc(rx, ry, 5.2 * markerScale, 0, Math.PI * 2);
              ctx.stroke();
              ctx.restore();
            }
          });
        }
      } else if (selectedLayer === 3) {
        ctx.save();
        ctx.strokeStyle = 'rgba(69, 227, 245, 0.72)';
        ctx.lineWidth = 2.8 * markerScale;
        ctx.setLineDash([7 * markerScale, 5 * markerScale]);
        [
          [130, 130, 62, 145],
          [130, 130, 128, 215],
          [130, 130, 198, 68],
          [130, 130, 206, 198],
          [130, 130, 56, 56],
        ].forEach(([x1, y1, x2, y2]) => {
          ctx.beginPath();
          ctx.moveTo(toPx(x1), toPx(y1));
          ctx.lineTo(toPx(x2), toPx(y2));
          ctx.stroke();
        });
        ctx.restore();
      } else if (selectedLayer === 4) {
        ctx.save();
        const tPulse = 0.55 + Math.sin(Date.now() / 400) * 0.25;
        ctx.strokeStyle = `rgba(255, 226, 132, ${tPulse})`;
        ctx.lineWidth = 2.8 * markerScale;
        ctx.beginPath();
        [
          [36, 196],
          [90, 72],
          [130, 125],
          [185, 112],
          [235, 135],
        ].forEach(([mx, my], idx) => {
          if (idx === 0) ctx.moveTo(toPx(mx), toPx(my));
          else ctx.lineTo(toPx(mx), toPx(my));
        });
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(toPx(130), toPx(125));
        ctx.lineTo(toPx(126), toPx(214));
        ctx.stroke();
        ctx.restore();
      }

      // 4b. Dynamic Travel Paths Between Visited Towns on Active Layer (Prim's MST)
      if (filterType === 'all' || filterType === 'towns') {
        const visitedOnLayer = allTowns.filter((t) => t.w === selectedLayer && t.vis === 1);
        if (visitedOnLayer.length >= 2) {
          // Build Minimum Spanning Tree of visited towns so paths look like a clean connected route network
          const connected = new Set<number>([0]);
          const edges: { a: Town; b: Town }[] = [];
          while (connected.size < visitedOnLayer.length) {
            let bestU = -1;
            let bestV = -1;
            let bestDist = Infinity;
            connected.forEach((u) => {
              for (let v = 0; v < visitedOnLayer.length; v++) {
                if (connected.has(v)) continue;
                const d = Math.hypot(
                  visitedOnLayer[u].x - visitedOnLayer[v].x,
                  visitedOnLayer[u].y - visitedOnLayer[v].y
                );
                if (d < bestDist) {
                  bestDist = d;
                  bestU = u;
                  bestV = v;
                }
              }
            });
            if (bestV === -1) break;
            connected.add(bestV);
            edges.push({ a: visitedOnLayer[bestU], b: visitedOnLayer[bestV] });
          }

          const nowMs = Date.now();
          ctx.save();
          edges.forEach(({ a, b }, idx) => {
            const ax = toPx(a.x);
            const ay = toPx(a.y);
            const bx = toPx(b.x);
            const by = toPx(b.y);
            const dx = bx - ax;
            const dy = by - ay;
            const len = Math.max(1, Math.hypot(dx, dy));
            const bend = Math.min(28 * markerScale, len * 0.16) * (idx % 2 === 0 ? 1 : -1);
            const cx = (ax + bx) / 2 - (dy / len) * bend;
            const cy = (ay + by) / 2 + (dx / len) * bend;

            // Soft golden aura path under-stroke
            ctx.save();
            ctx.strokeStyle = 'rgba(255, 210, 63, 0.28)';
            ctx.lineWidth = 6 * markerScale;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(ax, ay);
            ctx.quadraticCurveTo(cx, cy, bx, by);
            ctx.stroke();

            // Crisp animated dashed route between visited towns
            ctx.strokeStyle = '#ffd23f';
            ctx.lineWidth = 2.3 * markerScale;
            ctx.setLineDash([6.5 * markerScale, 5.5 * markerScale]);
            ctx.lineDashOffset = -(nowMs / 48) * markerScale;
            ctx.beginPath();
            ctx.moveTo(ax, ay);
            ctx.quadraticCurveTo(cx, cy, bx, by);
            ctx.stroke();
            ctx.setLineDash([]);

            // Traveling starlight mote gliding along the route
            const u = (nowMs / 2600 + idx * 0.37) % 1;
            const omt = 1 - u;
            const mxPos = omt * omt * ax + 2 * omt * u * cx + u * u * bx;
            const myPos = omt * omt * ay + 2 * omt * u * cy + u * u * by;

            ctx.fillStyle = 'rgba(255, 210, 63, 0.45)';
            ctx.beginPath();
            ctx.arc(mxPos, myPos, 4.6 * markerScale, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = '#fff9d6';
            ctx.beginPath();
            ctx.arc(mxPos, myPos, 2.2 * markerScale, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
          });
          ctx.restore();
        }
      }

      // Outer Realm Frame Border
      ctx.strokeStyle = PHASE_META[selectedLayer].accent;
      ctx.globalAlpha = 0.55;
      ctx.lineWidth = 3 / Math.sqrt(z);
      ctx.strokeRect(0, 0, BASE_MAP_SIZE, BASE_MAP_SIZE);
      ctx.globalAlpha = 1;

      // 5. Collectibles, Memory Echoes & Moon Diary Pages for Active Phase
      if (filterType === 'all' || filterType === 'treasures') {
        if (selectedLayer === 0) {
          ctx.fillStyle = '#ffd23f';
          stars.forEach((s) => {
            if (!s.got) {
              const sx = (s.x / (N * T)) * BASE_MAP_SIZE;
              const sy = (s.y / (N * T)) * BASE_MAP_SIZE;
              ctx.beginPath();
              ctx.arc(sx, sy, 2.2 * markerScale, 0, Math.PI * 2);
              ctx.fill();
            }
          });
        } else if (selectedLayer === 1) {
          ctx.fillStyle = '#fff5fb';
          pearls.forEach((p) => {
            if (!p.got) {
              const px = (p.x / (N * T)) * BASE_MAP_SIZE;
              const py = (p.y / (N * T)) * BASE_MAP_SIZE;
              ctx.beginPath();
              ctx.arc(px, py, 2.6 * markerScale, 0, Math.PI * 2);
              ctx.fill();
            }
          });
        } else if (selectedLayer === 2) {
          ctx.fillStyle = '#fff8c9';
          feathers.forEach((f) => {
            if (!f.got) {
              const fx = (f.x / (N * T)) * BASE_MAP_SIZE;
              const fy = (f.y / (N * T)) * BASE_MAP_SIZE;
              ctx.beginPath();
              ctx.arc(fx, fy, 2.6 * markerScale, 0, Math.PI * 2);
              ctx.fill();
            }
          });
        }

        // Memory Echoes on selected layer
        MEMORY_ECHOES.filter((e) => e.w === selectedLayer).forEach((echo) => {
          const ex = toPx(echo.x);
          const ey = toPx(echo.y);
          ctx.save();
          ctx.fillStyle = '#ff7aa8';
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1.5 * markerScale;
          ctx.beginPath();
          ctx.arc(ex, ey, 4.2 * markerScale, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();

          if (z >= 1.65) {
            ctx.font = `bold ${Math.max(4, 9 * markerScale)}px Nunito, sans-serif`;
            ctx.textAlign = 'center';
            ctx.lineWidth = 2.4 * markerScale;
            ctx.strokeStyle = '#150d24';
            ctx.fillStyle = '#ffd1e3';
            ctx.strokeText(`📻 ${echo.title}`, ex, ey - 7 * markerScale);
            ctx.fillText(`📻 ${echo.title}`, ex, ey - 7 * markerScale);
          }
          ctx.restore();
        });

        // Moon Diary Pages on selected layer
        MOON_DIARY_PAGES.filter((p) => p.w === selectedLayer).forEach((page) => {
          const px = toPx(page.x);
          const py = toPx(page.y);
          const rw = 5.2 * markerScale;
          const rh = 6.2 * markerScale;
          ctx.save();
          ctx.fillStyle = '#e2d4ff';
          ctx.fillRect(px - rw / 2, py - rh / 2, rw, rh);
          ctx.strokeStyle = '#5b3c96';
          ctx.lineWidth = 1.1 * markerScale;
          ctx.strokeRect(px - rw / 2, py - rh / 2, rw, rh);

          if (z >= 1.65) {
            ctx.font = `bold ${Math.max(4, 8.5 * markerScale)}px Nunito, sans-serif`;
            ctx.textAlign = 'center';
            ctx.lineWidth = 2.3 * markerScale;
            ctx.strokeStyle = '#150d24';
            ctx.fillStyle = '#e2d4ff';
            ctx.strokeText(`📜 Page #${page.page}`, px, py - 7 * markerScale);
            ctx.fillText(`📜 Page #${page.page}`, px, py - 7 * markerScale);
          }
          ctx.restore();
        });
      }

      // 6. Towns on Active Layer
      if (filterType === 'all' || filterType === 'towns') {
        allTowns.forEach((town) => {
          if (town.w === selectedLayer) {
            const tx = toPx(town.x);
            const ty = toPx(town.y);
            const isVisited = town.vis === 1;
            const isActiveTooltip = activeTooltipTownRef.current?.town.n === town.n;

            ctx.save();
            if (isVisited) {
              // Illuminated travel halo for unlocked/visited towns
              ctx.fillStyle = isActiveTooltip ? 'rgba(255, 210, 63, 0.5)' : 'rgba(255, 210, 63, 0.28)';
              ctx.beginPath();
              ctx.arc(tx, ty, (isActiveTooltip ? 11.5 : 9.4) * markerScale, 0, Math.PI * 2);
              ctx.fill();
            }

            ctx.shadowColor = 'rgba(0,0,0,0.45)';
            ctx.shadowBlur = 5 * markerScale;
            ctx.fillStyle = isVisited ? PHASE_META[selectedLayer].accent : '#6e6485';
            ctx.beginPath();
            ctx.arc(tx, ty, (isVisited ? 6.6 : 5.6) * markerScale, 0, Math.PI * 2);
            ctx.fill();
            ctx.lineWidth = (isVisited ? 2.2 : 1.5) * markerScale;
            ctx.strokeStyle = isVisited ? '#ffd23f' : 'rgba(255,255,255,0.7)';
            ctx.stroke();

            ctx.font = `bold ${Math.max(4.5, 11 * markerScale)}px Nunito, sans-serif`;
            ctx.textAlign = 'center';
            ctx.fillStyle = isVisited ? '#fff8d6' : '#dcd6e8';
            ctx.lineWidth = 3 * markerScale;
            ctx.strokeStyle = '#1d1429';
            const townLabel = isVisited ? `🌀 ${town.n}` : `🔒 ${town.n}`;
            ctx.strokeText(townLabel, tx, ty - 11.5 * markerScale);
            ctx.fillText(townLabel, tx, ty - 11.5 * markerScale);
            ctx.restore();
          }
        });
      }

      // 7. Phase Landmarks
      if (filterType === 'all' || filterType === 'towns') {
        PHASE_LANDMARKS.filter((lm) => lm.layer === selectedLayer).forEach((lm) => {
          const lx = toPx(lm.tx);
          const ly = toPx(lm.ty);
          ctx.save();
          ctx.shadowColor = lm.color;
          ctx.shadowBlur = 8 * markerScale;
          ctx.fillStyle = lm.color;
          ctx.beginPath();
          ctx.arc(lx, ly, 7.2 * markerScale, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2 * markerScale;
          ctx.stroke();

          ctx.font = `900 ${Math.max(4.5, 11 * markerScale)}px Nunito, sans-serif`;
          ctx.textAlign = 'center';
          ctx.lineWidth = 3 * markerScale;
          ctx.strokeStyle = '#150d24';
          ctx.fillStyle = '#ffffff';
          ctx.strokeText(`${lm.icon} ${lm.name}`, lx, ly + 17 * markerScale);
          ctx.fillText(`${lm.icon} ${lm.name}`, lx, ly + 17 * markerScale);

          if (z >= 2.6) {
            ctx.font = `bold ${Math.max(3.6, 8.5 * markerScale)}px Nunito, sans-serif`;
            ctx.fillStyle = lm.color;
            ctx.strokeText(lm.subtitle, lx, ly + 27 * markerScale);
            ctx.fillText(lm.subtitle, lx, ly + 27 * markerScale);
          }
          ctx.restore();
        });
      }

      // 8. Roaming Hollow Creatures (Ground Layer)
      if (selectedLayer === 0 && (filterType === 'all' || filterType === 'npcs')) {
        hollows.forEach((h) => {
          const hx = (h.x / (N * T)) * BASE_MAP_SIZE;
          const hy = (h.y / (N * T)) * BASE_MAP_SIZE;
          ctx.save();
          ctx.fillStyle = h.soothed ? '#ff9ebb' : '#94a3b8';
          ctx.beginPath();
          ctx.arc(hx, hy, 4.5 * markerScale, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1.4 * markerScale;
          ctx.stroke();
          if (z >= 1.05 || selectedAreaRef.current?.title.includes(h.name)) {
            ctx.font = `bold ${Math.max(3.8, 9.5 * markerScale)}px Nunito, sans-serif`;
            ctx.textAlign = 'center';
            ctx.lineWidth = 2.4 * markerScale;
            ctx.strokeStyle = '#150d24';
            ctx.fillStyle = h.soothed ? '#ffd23f' : '#e2e8f0';
            const tag = h.soothed ? `💖 ${h.name}` : `🩶 ${h.name}`;
            ctx.strokeText(tag, hx, hy - 8 * markerScale);
            ctx.fillText(tag, hx, hy - 8 * markerScale);

            if (z >= 2.8 && h.quote) {
              ctx.font = `italic ${Math.max(3.2, 8 * markerScale)}px Nunito, sans-serif`;
              ctx.fillStyle = '#cbd5e1';
              const shortQ = h.quote.length > 36 ? `${h.quote.slice(0, 34)}…` : h.quote;
              ctx.strokeText(`“${shortQ}”`, hx, hy + 11 * markerScale);
              ctx.fillText(`“${shortQ}”`, hx, hy + 11 * markerScale);
            }
          }
          ctx.restore();
        });
      }

      // 9. NPCs on Active Layer
      if (filterType === 'all' || filterType === 'npcs' || filterType === 'quests') {
        npcs.forEach((npc) => {
          if (npc.tree) return;
          if (getNpcLayer(npc) !== selectedLayer) return;

          const nx = (npc.x / (N * T)) * BASE_MAP_SIZE;
          const ny = (npc.y / (N * T)) * BASE_MAP_SIZE;

          const hasQuest = quests.some((q) => q.g === npc.n && q.st < 3);
          if (filterType === 'quests' && !hasQuest) return;

          ctx.save();
          if (npc.fr) {
            ctx.fillStyle = 'rgba(255, 122, 168, 0.45)';
            ctx.beginPath();
            ctx.arc(nx, ny, 8.2 * markerScale, 0, Math.PI * 2);
            ctx.fill();
          } else if (hasQuest) {
            ctx.fillStyle = 'rgba(255, 210, 63, 0.45)';
            ctx.beginPath();
            ctx.arc(nx, ny, 8.2 * markerScale, 0, Math.PI * 2);
            ctx.fill();
          }

          ctx.fillStyle = npc.fr ? '#ff7aa8' : hasQuest ? '#ffd23f' : '#7bd88f';
          ctx.beginPath();
          ctx.arc(nx, ny, 4.5 * markerScale, 0, Math.PI * 2);
          ctx.fill();
          ctx.lineWidth = 1.5 * markerScale;
          ctx.strokeStyle = '#ffffff';
          ctx.stroke();

          if (z >= 1.05 || selectedLayer >= 1 || selectedAreaRef.current?.title === npc.n) {
            ctx.font = `bold ${Math.max(3.8, 9.5 * markerScale)}px Nunito, sans-serif`;
            ctx.textAlign = 'center';
            ctx.fillStyle = '#ffffff';
            ctx.lineWidth = 2.5 * markerScale;
            ctx.strokeStyle = '#150d24';
            const statusIcon = npc.fr ? '❤️ ' : hasQuest ? '📜 ' : '';
            ctx.strokeText(`${statusIcon}${npc.n}`, nx, ny + 12 * markerScale);
            ctx.fillText(`${statusIcon}${npc.n}`, nx, ny + 12 * markerScale);

            if (z >= 2.8) {
              ctx.font = `bold ${Math.max(3.2, 7.8 * markerScale)}px Nunito, sans-serif`;
              ctx.fillStyle = '#ffd3e2';
              const shortRole = npc.r.length > 34 ? `${npc.r.slice(0, 32)}…` : npc.r;
              ctx.strokeText(shortRole, nx, ny + 21 * markerScale);
              ctx.fillText(shortRole, nx, ny + 21 * markerScale);
            }
          }
          ctx.restore();
        });
      }

      // 10. Hovered Tile Highlight Box (desktop/pointer)
      if (hoverTileRef.current) {
        const { tx, ty } = hoverTileRef.current;
        if (tx >= 0 && tx < N && ty >= 0 && ty < N) {
          ctx.save();
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
          ctx.fillStyle = 'rgba(255, 255, 255, 0.14)';
          ctx.lineWidth = 1.6 / z;
          ctx.fillRect(tx * tileSizePx, ty * tileSizePx, tileSizePx, tileSizePx);
          ctx.strokeRect(tx * tileSizePx, ty * tileSizePx, tileSizePx, tileSizePx);
          ctx.restore();
        }
      }

      // 11. Selected Area Inspection Reticle
      const activeSel = selectedAreaRef.current;
      if (activeSel) {
        const sx = (activeSel.x / (N * T)) * BASE_MAP_SIZE;
        const sy = (activeSel.y / (N * T)) * BASE_MAP_SIZE;
        const ringPulse = 11 + Math.sin(Date.now() / 190) * 2.5;
        ctx.save();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2.2 * markerScale;
        ctx.setLineDash([4 * markerScale, 3 * markerScale]);
        ctx.beginPath();
        ctx.arc(sx, sy, ringPulse * markerScale, 0, Math.PI * 2);
        ctx.stroke();

        ctx.setLineDash([]);
        ctx.strokeStyle = PHASE_META[selectedLayer].accent;
        ctx.lineWidth = 1.6 * markerScale;
        ctx.beginPath();
        ctx.arc(sx, sy, (ringPulse + 3.5) * markerScale, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      // 12. Player Beacon
      const playerLayer: MapLayerId = playerPos.sky ? 2 : playerPos.dive ? 1 : playerPos.glowdeep ? 3 : playerPos.moonroad ? 4 : 0;
      const px = (playerPos.x / (N * T)) * BASE_MAP_SIZE;
      const py = (playerPos.y / (N * T)) * BASE_MAP_SIZE;
      const isPlayerOnLayer = playerLayer === selectedLayer;

      ctx.save();
      if (!isPlayerOnLayer) ctx.globalAlpha = 0.45;
      const pulse = 6 + Math.sin(Date.now() / 200) * 2;
      ctx.strokeStyle = isPlayerOnLayer ? 'rgba(255, 122, 168, 0.9)' : 'rgba(255, 255, 255, 0.5)';
      ctx.lineWidth = 2 * markerScale;
      ctx.beginPath();
      ctx.arc(px, py, pulse * 1.9 * markerScale, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = '#ff7aa8';
      ctx.beginPath();
      ctx.arc(px, py, 5.8 * markerScale, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2 * markerScale;
      ctx.stroke();

      ctx.font = `bold ${Math.max(4.5, 11 * markerScale)}px Nunito, sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ffd23f';
      ctx.lineWidth = 3 * markerScale;
      ctx.strokeStyle = '#271d31';
      const youText = isPlayerOnLayer
        ? `🐱 ${playerName} (You)`
        : `📍 ${playerName} (${PHASE_META[playerLayer].label})`;
      ctx.strokeText(youText, px, py - 11.5 * markerScale);
      ctx.fillText(youText, px, py - 11.5 * markerScale);
      ctx.restore();

      ctx.restore();

      // 13. Update Anchored Town Map Tooltip Screen Position (60fps lock to town pin)
      const tipEl = townTooltipRef.current;
      const tipTown = activeTooltipTownRef.current;
      if (tipEl && tipTown) {
        const mapPinX = (tipTown.town.x / N) * BASE_MAP_SIZE;
        const mapPinY = (tipTown.town.y / N) * BASE_MAP_SIZE;
        const screenX = cam.x + mapPinX * z;
        const screenY = cam.y + mapPinY * z;
        const clampedX = Math.max(124, Math.min(cw - 124, screenX));
        const clampedY = Math.max(115, Math.min(ch - 26, screenY - 18));
        tipEl.style.transform = `translate3d(${clampedX.toFixed(1)}px, ${clampedY.toFixed(1)}px, 0) translate(-50%, -100%)`;
        tipEl.style.opacity = '1';
      } else if (tipEl) {
        tipEl.style.opacity = '0';
      }

      // 14. Update Corner Minimap Inset Canvas (visible when zoomed in >= 1.55x)
      const insetCanvas = insetCanvasRef.current;
      if (insetCanvas && activeBitmap && z >= 1.55) {
        const ictx = insetCanvas.getContext('2d');
        if (ictx) {
          const iw = insetCanvas.width;
          const ih = insetCanvas.height;
          ictx.clearRect(0, 0, iw, ih);
          ictx.imageSmoothingEnabled = false;
          ictx.drawImage(activeBitmap, 0, 0, iw, ih);

          // Draw current camera viewport box on minimap inset
          const viewLeft = ((-cam.x / z) / BASE_MAP_SIZE) * iw;
          const viewTop = ((-cam.y / z) / BASE_MAP_SIZE) * ih;
          const viewW = ((cw / z) / BASE_MAP_SIZE) * iw;
          const viewH = ((ch / z) / BASE_MAP_SIZE) * ih;

          ictx.fillStyle = 'rgba(255, 255, 255, 0.14)';
          ictx.fillRect(viewLeft, viewTop, viewW, viewH);
          ictx.strokeStyle = '#ffd23f';
          ictx.lineWidth = 1.6;
          ictx.strokeRect(viewLeft, viewTop, viewW, viewH);
        }
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [
    allTowns,
    feathers,
    filterType,
    getNpcLayer,
    hollows,
    npcs,
    pearls,
    playerName,
    playerPos.dive,
    playerPos.glowdeep,
    playerPos.moonroad,
    playerPos.sky,
    playerPos.x,
    playerPos.y,
    quests,
    rings,
    selectedLayer,
    skyTerrain,
    stars,
    townMap,
    underwaterDecor,
  ]);

  // Inspect map point at canvas coordinates
  const inspectPointAt = useCallback(
    (mouseCanvasX: number, mouseCanvasY: number) => {
      const cam = camRef.current;
      const mapX = (mouseCanvasX - cam.x) / cam.zoom;
      const mapY = (mouseCanvasY - cam.y) / cam.zoom;

      const worldX = (mapX / BASE_MAP_SIZE) * (N * T);
      const worldY = (mapY / BASE_MAP_SIZE) * (N * T);
      const tileX = Math.floor((mapX / BASE_MAP_SIZE) * N);
      const tileY = Math.floor((mapY / BASE_MAP_SIZE) * N);

      // 1. Check Phase Landmarks
      for (const lm of PHASE_LANDMARKS) {
        if (lm.layer !== selectedLayer) continue;
        const lx = (lm.tx / N) * BASE_MAP_SIZE;
        const ly = (lm.ty / N) * BASE_MAP_SIZE;
        if (Math.hypot(lx - mapX, ly - mapY) < 20 / Math.pow(cam.zoom, 0.72)) {
          const matchedTown = findMatchingTown(lm.tx, lm.ty, selectedLayer, lm.name);
          const lwx = (matchedTown ? matchedTown.x : lm.tx) * T;
          const lwy = (matchedTown ? matchedTown.y : lm.ty) * T;
          const { paces, dir } = getNavInfo(lwx, lwy);
          setSelectedArea({
            id: lm.id,
            title: lm.name,
            subtitle: `${PHASE_META[selectedLayer].label} · ${lm.subtitle}`,
            type: 'landmark',
            x: lwx,
            y: lwy,
            icon: lm.icon,
            description: lm.description,
            residents: lm.residents,
            collectiblesInfo: matchedTown
              ? matchedTown.vis === 1
                ? '🌀 Teleportation Unlocked'
                : '🔒 Visit this settlement to unlock Teleport'
              : undefined,
            townObj: matchedTown,
            distancePaces: paces,
            direction: dir,
          });
          return;
        }
      }

      // 2. Check NPCs on selectedLayer
      let nearestNpc: NPC | null = null;
      let minNpcDist = 17 / Math.pow(cam.zoom, 0.72);
      for (const npc of npcs) {
        if (getNpcLayer(npc) !== selectedLayer) continue;
        const nx = (npc.x / (N * T)) * BASE_MAP_SIZE;
        const ny = (npc.y / (N * T)) * BASE_MAP_SIZE;
        const dist = Math.hypot(nx - mapX, ny - mapY);
        if (dist < minNpcDist) {
          minNpcDist = dist;
          nearestNpc = npc;
        }
      }

      if (nearestNpc) {
        const { paces, dir } = getNavInfo(nearestNpc.x, nearestNpc.y);
        const activeQuest = quests.find((q) => q.g === nearestNpc!.n && q.st < 3);
        setSelectedArea({
          id: `npc-${nearestNpc.n}`,
          title: nearestNpc.n,
          subtitle: nearestNpc.r,
          type: nearestNpc.tree ? 'tree' : 'npc',
          x: nearestNpc.x,
          y: nearestNpc.y,
          icon: nearestNpc.tree ? '🌳' : '👤',
          description: nearestNpc.g,
          distancePaces: paces,
          direction: dir,
          collectiblesInfo: activeQuest ? `Active Quest: ${activeQuest.t}` : undefined,
        });
        return;
      }

      // 3. Check Roaming Hollows (Ground)
      if (selectedLayer === 0) {
        for (const h of hollows) {
          const hx = (h.x / (N * T)) * BASE_MAP_SIZE;
          const hy = (h.y / (N * T)) * BASE_MAP_SIZE;
          if (Math.hypot(hx - mapX, hy - mapY) < 17 / Math.pow(cam.zoom, 0.72)) {
            const { paces, dir } = getNavInfo(h.x, h.y);
            setSelectedArea({
              id: `hollow-${h.id}`,
              title: h.soothed ? `${h.name} (Soothed)` : `${h.name} (Hollow)`,
              subtitle: h.soothed ? 'Restored Companion Spirit' : 'Lost in the Great Silence',
              type: 'hollow',
              x: h.x,
              y: h.y,
              icon: h.soothed ? '💖' : '🩶',
              description: h.quote || 'Humming quietly, waiting for warmth and kindness.',
              collectiblesInfo: h.soothed ? 'Color bloomed back!' : 'Cast Hush Hug (8) nearby to soothe with warmth',
              distancePaces: paces,
              direction: dir,
            });
            return;
          }
        }
      }

      // 4. Check Towns on selectedLayer
      let nearestTown: Town | null = null;
      let minTownDist = 22 / Math.pow(cam.zoom, 0.72);
      for (const town of allTowns) {
        if (town.w !== selectedLayer) continue;
        const tx = (town.x / N) * BASE_MAP_SIZE;
        const ty = (town.y / N) * BASE_MAP_SIZE;
        const dist = Math.hypot(tx - mapX, ty - mapY);
        if (dist < minTownDist) {
          minTownDist = dist;
          nearestTown = town;
        }
      }

      if (nearestTown) {
        const townWorldX = nearestTown.x * T;
        const townWorldY = nearestTown.y * T;
        const { paces, dir } = getNavInfo(townWorldX, townWorldY);
        const residents = npcs
          .filter((n) => getNpcLayer(n) === selectedLayer && Math.hypot(n.x - townWorldX, n.y - townWorldY) < 480)
          .map((n) => n.n);

        const townSubtitles: Record<MapLayerId, string> = {
          0: 'Island Settlement',
          1: 'Undersea Reef Sanctuary',
          2: 'Cirrus Sky Haven',
          3: 'Glowdeep Cavern Settlement',
          4: 'Moon Road Pavilion',
        };

        setSelectedArea({
          id: `town-${nearestTown.n}`,
          title: nearestTown.n,
          subtitle: townSubtitles[selectedLayer],
          type: 'town',
          x: townWorldX,
          y: townWorldY,
          icon: '🏘️',
          description: `A peaceful ${townSubtitles[selectedLayer].toLowerCase()} in the ${PHASE_META[selectedLayer].title} phase.`,
          residents,
          collectiblesInfo:
            nearestTown.vis === 1
              ? '🌀 Song of Teleportation Unlocked'
              : '🔒 Visit this town square to unlock Fast Travel',
          townObj: nearestTown,
          distancePaces: paces,
          direction: dir,
        });
        return;
      }

      // 5. Check Memory Echoes & Moon Diary Pages on selectedLayer
      for (const echo of MEMORY_ECHOES) {
        if (echo.w !== selectedLayer) continue;
        const ex = (echo.x / N) * BASE_MAP_SIZE;
        const ey = (echo.y / N) * BASE_MAP_SIZE;
        if (Math.hypot(ex - mapX, ey - mapY) < 15 / Math.pow(cam.zoom, 0.72)) {
          const { paces, dir } = getNavInfo(echo.x * T, echo.y * T);
          setSelectedArea({
            id: echo.id,
            title: `Memory Echo: ${echo.title}`,
            subtitle: `Speaker: ${echo.speaker}`,
            type: 'point',
            x: echo.x * T,
            y: echo.y * T,
            icon: '📻',
            description: echo.memory,
            collectiblesInfo: 'Cast Echo Call (0) nearby to resonate!',
            distancePaces: paces,
            direction: dir,
          });
          return;
        }
      }

      for (const page of MOON_DIARY_PAGES) {
        if (page.w !== selectedLayer) continue;
        const px = (page.x / N) * BASE_MAP_SIZE;
        const py = (page.y / N) * BASE_MAP_SIZE;
        if (Math.hypot(px - mapX, py - mapY) < 15 / Math.pow(cam.zoom, 0.72)) {
          const { paces, dir } = getNavInfo(page.x * T, page.y * T);
          setSelectedArea({
            id: `diary-${page.page}`,
            title: `Moon Diary Page #${page.page}`,
            subtitle: `${PHASE_META[selectedLayer].label} Collectible`,
            type: 'point',
            x: page.x * T,
            y: page.y * T,
            icon: '📜',
            description: `“${page.entry}”`,
            distancePaces: paces,
            direction: dir,
          });
          return;
        }
      }

      // 6. Phase-Specific Terrain Tile Inspection
      if (tileX >= 0 && tileX < N && tileY >= 0 && tileY < N) {
        const { paces, dir } = getNavInfo(worldX, worldY);
        const info = describeTile(tileX, tileY, selectedLayer);
        setSelectedArea({
          id: `coord-${selectedLayer}-${tileX}-${tileY}`,
          title: info.title,
          subtitle: `Tile (${tileX}, ${tileY}) · ${PHASE_META[selectedLayer].label}`,
          type: 'point',
          x: worldX,
          y: worldY,
          icon: info.icon,
          description: info.description,
          distancePaces: paces,
          direction: dir,
        });
      }
    },
    [allTowns, describeTile, findMatchingTown, getNavInfo, getNpcLayer, hollows, npcs, quests, selectedLayer]
  );

  // Canvas Click & Double-Click Zoom
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isDraggingRef.current || touchMovedRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;

    const now = Date.now();
    const prev = lastClickRef.current;
    if (now - prev.time < 300 && Math.hypot(cx - prev.x, cy - prev.y) < 16) {
      // Double-click toggles deep focal zoom on this spot
      lastClickRef.current = { time: 0, x: 0, y: 0 };
      const curZ = targetCamRef.current.zoom;
      const nextZ = curZ >= 4.2 ? 1.25 : Math.min(MAX_ZOOM, curZ * 2.1);
      zoomAtPoint(nextZ, cx, cy);
      return;
    }
    lastClickRef.current = { time: now, x: cx, y: cy };
    inspectPointAt(cx, cy);
  };

  // Mouse Drag & Hover Inspection
  const handleMouseDown = (e: React.MouseEvent) => {
    isDraggingRef.current = false;
    pointerDownPosRef.current = { x: e.clientX, y: e.clientY };
    lastMousePosRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (e.buttons === 1) {
      const dx = e.clientX - lastMousePosRef.current.x;
      const dy = e.clientY - lastMousePosRef.current.y;
      if (Math.hypot(e.clientX - pointerDownPosRef.current.x, e.clientY - pointerDownPosRef.current.y) > 4) {
        isDraggingRef.current = true;
      }
      setCameraImmediate(camRef.current.x + dx, camRef.current.y + dy, camRef.current.zoom);
      lastMousePosRef.current = { x: e.clientX, y: e.clientY };
      return;
    }

    // Hover live tile preview & interactive town tooltip detection
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;
    const cam = camRef.current;
    const mapX = (cx - cam.x) / cam.zoom;
    const mapY = (cy - cam.y) / cam.zoom;
    const tx = Math.floor((mapX / BASE_MAP_SIZE) * N);
    const ty = Math.floor((mapY / BASE_MAP_SIZE) * N);

    // Check if pointer is hovering near any town or town-linked landmark on selectedLayer
    let nearHoverTown: { town: Town; title: string; subtitle: string; icon: string } | null = null;
    const hitRadiusMap = 22 / Math.pow(cam.zoom, 0.72);

    let bestTownDist = hitRadiusMap;
    for (const town of allTowns) {
      if (town.w !== selectedLayer) continue;
      const tpx = (town.x / N) * BASE_MAP_SIZE;
      const tpy = (town.y / N) * BASE_MAP_SIZE;
      const d = Math.hypot(tpx - mapX, tpy - mapY);
      if (d < bestTownDist) {
        bestTownDist = d;
        nearHoverTown = {
          town,
          title: town.n,
          subtitle: town.island ? `${town.island} · ${PHASE_META[selectedLayer].shortLabel}` : PHASE_META[selectedLayer].label,
          icon: '🏘️',
        };
      }
    }

    if (!nearHoverTown) {
      for (const lm of PHASE_LANDMARKS) {
        if (lm.layer !== selectedLayer) continue;
        const lpx = (lm.tx / N) * BASE_MAP_SIZE;
        const lpy = (lm.ty / N) * BASE_MAP_SIZE;
        if (Math.hypot(lpx - mapX, lpy - mapY) < hitRadiusMap) {
          const matchedTown = findMatchingTown(lm.tx, lm.ty, selectedLayer, lm.name);
          if (matchedTown) {
            nearHoverTown = {
              town: matchedTown,
              title: lm.name,
              subtitle: lm.subtitle,
              icon: lm.icon,
            };
          }
          break;
        }
      }
    }

    if (nearHoverTown) {
      if (hoverCloseTimerRef.current !== null) {
        window.clearTimeout(hoverCloseTimerRef.current);
        hoverCloseTimerRef.current = null;
      }
      setHoveredTown((prev) => (prev?.town.n === nearHoverTown!.town.n ? prev : nearHoverTown));
    } else if (hoveredTown && hoverCloseTimerRef.current === null) {
      hoverCloseTimerRef.current = window.setTimeout(() => {
        setHoveredTown(null);
        hoverCloseTimerRef.current = null;
      }, 220);
    }

    if (tx >= 0 && tx < N && ty >= 0 && ty < N) {
      if (!hoverTileRef.current || hoverTileRef.current.tx !== tx || hoverTileRef.current.ty !== ty) {
        hoverTileRef.current = { tx, ty };

        // Quick label lookup (Landmark -> Town -> Tile)
        let label = '';
        let icon = '';
        const nearLm = PHASE_LANDMARKS.find(
          (lm) => lm.layer === selectedLayer && Math.hypot(lm.tx - tx, lm.ty - ty) <= 4
        );
        if (nearLm) {
          label = nearLm.name;
          icon = nearLm.icon;
        } else {
          const nearTown = allTowns.find(
            (t) => t.w === selectedLayer && Math.hypot(t.x - tx, t.y - ty) <= 4
          );
          if (nearTown) {
            label = nearTown.n;
            icon = '🏘️';
          } else {
            const tileDesc = describeTile(tx, ty, selectedLayer);
            label = tileDesc.title;
            icon = tileDesc.icon;
          }
        }
        setHoverInfo({ tx, ty, label, icon });
      }
    } else if (hoverTileRef.current) {
      hoverTileRef.current = null;
      setHoverInfo(null);
    }
  };

  const handleMouseLeave = () => {
    hoverTileRef.current = null;
    setHoverInfo(null);
    if (hoverCloseTimerRef.current === null && hoveredTown) {
      hoverCloseTimerRef.current = window.setTimeout(() => {
        setHoveredTown(null);
        hoverCloseTimerRef.current = null;
      }, 220);
    }
  };

  // Touch Drag, Midpoint Focal Pinch-to-Zoom & Double-Tap Zoom
  const handleTouchStart = (e: React.TouchEvent) => {
    const container = containerRef.current;
    const rect = container?.getBoundingClientRect();

    if (e.touches.length === 1) {
      touchModeRef.current = 'pan';
      touchMovedRef.current = false;
      pointerDownPosRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      lastMousePosRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      lastPinchRef.current = null;
    } else if (e.touches.length === 2 && rect) {
      touchModeRef.current = 'pinch';
      touchMovedRef.current = true;
      const d = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2 - rect.left;
      const midY = (e.touches[0].clientY + e.touches[1].clientY) / 2 - rect.top;
      lastPinchRef.current = { dist: Math.max(10, d), midX, midY };
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const container = containerRef.current;
    const rect = container?.getBoundingClientRect();

    if (e.touches.length === 1 && touchModeRef.current === 'pan') {
      const dx = e.touches[0].clientX - lastMousePosRef.current.x;
      const dy = e.touches[0].clientY - lastMousePosRef.current.y;
      if (
        Math.hypot(
          e.touches[0].clientX - pointerDownPosRef.current.x,
          e.touches[0].clientY - pointerDownPosRef.current.y
        ) > 5
      ) {
        touchMovedRef.current = true;
      }
      setCameraImmediate(camRef.current.x + dx, camRef.current.y + dy, camRef.current.zoom);
      lastMousePosRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    } else if (e.touches.length === 2 && lastPinchRef.current && rect) {
      touchMovedRef.current = true;
      const d = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2 - rect.left;
      const midY = (e.touches[0].clientY + e.touches[1].clientY) / 2 - rect.top;

      // Combine midpoint pan delta + focal pinch scale
      const panDx = midX - lastPinchRef.current.midX;
      const panDy = midY - lastPinchRef.current.midY;
      const base = camRef.current;
      const movedX = base.x + panDx;
      const movedY = base.y + panDy;

      const ratio = d / lastPinchRef.current.dist;
      const clampedZ = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, base.zoom * ratio));
      const mapX = (midX - movedX) / base.zoom;
      const mapY = (midY - movedY) / base.zoom;

      setCameraImmediate(midX - mapX * clampedZ, midY - mapY * clampedZ, clampedZ);
      lastPinchRef.current = { dist: Math.max(10, d), midX, midY };
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (e.touches.length === 0) {
      const wasTap = !touchMovedRef.current && touchModeRef.current === 'pan';
      touchModeRef.current = 'none';
      lastPinchRef.current = null;

      if (wasTap && canvasRef.current) {
        const rect = canvasRef.current.getBoundingClientRect();
        const cx = lastMousePosRef.current.x - rect.left;
        const cy = lastMousePosRef.current.y - rect.top;
        const now = Date.now();
        if (now - lastTapRef.current.time < 290 && Math.hypot(cx - lastTapRef.current.x, cy - lastTapRef.current.y) < 28) {
          lastTapRef.current = { time: 0, x: 0, y: 0 };
          const curZ = targetCamRef.current.zoom;
          zoomAtPoint(curZ >= 4.0 ? 1.2 : Math.min(MAX_ZOOM, curZ * 2.0), cx, cy);
        } else {
          lastTapRef.current = { time: now, x: cx, y: cy };
        }
      }
    } else if (e.touches.length === 1) {
      touchModeRef.current = 'pan';
      lastPinchRef.current = null;
      lastMousePosRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
  };

  // Interactive Minimap Inset scrubbing (when zoomed >= 1.55x)
  const scrubFromInset = (clientX: number, clientY: number) => {
    const inset = insetCanvasRef.current;
    const container = containerRef.current;
    if (!inset || !container) return;
    const rect = inset.getBoundingClientRect();
    const u = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const v = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height));
    const cw = container.clientWidth;
    const ch = container.clientHeight;
    const z = camRef.current.zoom;
    setCameraImmediate(cw / 2 - u * BASE_MAP_SIZE * z, ch / 2 - v * BASE_MAP_SIZE * z, z);
  };

  // Search filtered results across ALL 5 phases
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    const matches: { title: string; subtitle: string; x: number; y: number; layer: MapLayerId }[] = [];

    allTowns.forEach((t) => {
      if (t.n.toLowerCase().includes(q)) {
        matches.push({
          title: `🏘️ ${t.n}`,
          subtitle: `${PHASE_META[t.w as MapLayerId]?.label || 'Town'}`,
          x: t.x * T,
          y: t.y * T,
          layer: (t.w as MapLayerId) || 0,
        });
      }
    });

    PHASE_LANDMARKS.forEach((lm) => {
      if (lm.name.toLowerCase().includes(q) || lm.subtitle.toLowerCase().includes(q)) {
        matches.push({
          title: `${lm.icon} ${lm.name}`,
          subtitle: `${PHASE_META[lm.layer].label} · ${lm.subtitle}`,
          x: lm.tx * T,
          y: lm.ty * T,
          layer: lm.layer,
        });
      }
    });

    npcs.forEach((n) => {
      if (n.n.toLowerCase().includes(q) || n.r.toLowerCase().includes(q)) {
        const lyr = getNpcLayer(n);
        matches.push({
          title: `👤 ${n.n}`,
          subtitle: `${PHASE_META[lyr].label} · ${n.r}`,
          x: n.x,
          y: n.y,
          layer: lyr,
        });
      }
    });

    return matches.slice(0, 7);
  }, [searchQuery, allTowns, npcs, getNpcLayer]);

  const activePhase = PHASE_META[selectedLayer];
  const zoomPercent = Math.round(zoomUi * 100);

  return (
    <div className="fixed inset-0 z-50 bg-[#160f22]/80 backdrop-blur-md flex flex-col items-center justify-center p-modal-safe select-none animate-in fade-in duration-200">
      <div className="relative w-full max-w-5xl h-[94dvh] storybook-modal rounded-2xl sm:rounded-3xl flex flex-col overflow-hidden">
        {/* Top Header Bar */}
        <div className="p-2.5 sm:p-3.5 border-b border-[#f0c7d8]/80 dark:border-[#5b3b6b]/80 flex flex-wrap items-center justify-between gap-2 bg-white/55 dark:bg-black/20 shrink-0">
          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
            <span className="text-xl sm:text-2xl shrink-0">🗺️</span>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-lg font-black text-[#4a3550] dark:text-[#fdeeff] leading-tight truncate">
                Mochi Meadows 2: Five-Phase Atlas
              </h2>
              <p className="text-[10px] sm:text-xs text-[#5a425f] dark:text-[#c4b3cc] font-bold truncate">
                Now in: <span className="text-[#d85784] dark:text-[#ff9ec0]">{currentBiomeName}</span> · Viewing{' '}
                <span className="font-black" style={{ color: activePhase.accent }}>
                  {activePhase.title}
                </span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 max-w-full">
            {/* Layer / Phase Selector Segmented Controls */}
            <div className="flex storybook-well p-0.5 sm:p-1 rounded-xl sm:rounded-2xl gap-0.5 sm:gap-1 overflow-x-auto scrollbar-none max-w-[74vw] sm:max-w-none">
              <button
                onClick={() => handleSelectLayer(0)}
                className={`px-2 sm:px-2.5 py-1 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-black transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                  selectedLayer === 0
                    ? 'bg-[#ff7aa8] text-white shadow-xs'
                    : 'text-[#4a3550] dark:text-[#d4c3db] hover:text-[#ff7aa8]'
                }`}
              >
                🌿 Ground
              </button>
              <button
                onClick={() => handleSelectLayer(1)}
                className={`px-2 sm:px-2.5 py-1 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-black transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                  selectedLayer === 1
                    ? 'bg-[#52d6c6] text-white shadow-xs'
                    : 'text-[#4a3550] dark:text-[#d4c3db] hover:text-[#52d6c6]'
                }`}
              >
                🌊 Reef
              </button>
              <button
                onClick={() => handleSelectLayer(2)}
                className={`px-2 sm:px-2.5 py-1 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-black transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                  selectedLayer === 2
                    ? 'bg-[#8fd5ff] text-[#2b2340] shadow-xs'
                    : 'text-[#4a3550] dark:text-[#d4c3db] hover:text-[#8fd5ff]'
                }`}
              >
                ☁️ Sky
              </button>
              <button
                onClick={() => handleSelectLayer(3)}
                className={`px-2 sm:px-2.5 py-1 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-black transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                  selectedLayer === 3
                    ? 'bg-[#b48cff] text-white shadow-xs'
                    : 'text-[#4a3550] dark:text-[#d4c3db] hover:text-[#b48cff]'
                }`}
              >
                🍄 Glowdeep
              </button>
              <button
                onClick={() => handleSelectLayer(4)}
                className={`px-2 sm:px-2.5 py-1 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-black transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                  selectedLayer === 4
                    ? 'bg-[#ffd23f] text-[#2b2340] shadow-xs'
                    : 'text-[#4a3550] dark:text-[#d4c3db] hover:text-[#ffd23f]'
                }`}
              >
                🌙 Moon Road
              </button>
            </div>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-[#f3e4ee] dark:bg-[#1b1424] hover:bg-[#ff7aa8] hover:text-white text-[#4a3550] dark:text-[#fdeeff] font-black flex items-center justify-center transition-all cursor-pointer shadow-xs active:scale-95 text-sm shrink-0"
              title="Close Map (Esc)"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Second Utility Row: Filter Chips & Search Bar */}
        <div className="px-2.5 sm:px-3 py-1.5 border-b border-[#ffd3e2]/40 dark:border-[#5a3a6b]/40 flex items-center justify-between gap-2 bg-[#fffaf2]/80 dark:bg-[#20152b]/80 overflow-visible">
          <div className="flex items-center gap-1 overflow-x-auto text-xs font-black py-0.5 scrollbar-none flex-nowrap shrink min-w-0">
            <span className="text-[10px] sm:text-[11px] opacity-60 mr-0.5 hidden xs:inline">Show:</span>
            {[
              ['all', 'All'],
              ['towns', '🏘️ Landmarks'],
              ['npcs', '👥 Islanders'],
              ['treasures', '✨ Loot & Echoes'],
              ['quests', '📜 Quests'],
            ].map(([fKey, label]) => (
              <button
                key={fKey}
                onClick={() => setFilterType(fKey as 'all' | 'towns' | 'npcs' | 'treasures' | 'quests')}
                className={`px-2 sm:px-2.5 py-1 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                  filterType === fKey
                    ? 'bg-[#ffd23f] text-[#4a3550] shadow-xs scale-102 font-black'
                    : 'bg-white/50 dark:bg-white/5 hover:bg-white text-[#5a425f] dark:text-[#d4c3db]'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="relative w-32 xs:w-44 sm:w-56 shrink-0">
            <input
              type="text"
              placeholder="🔍 Search & Fly..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs bg-white dark:bg-[#1c1326] border border-[#ffd3e2] dark:border-[#5a3a6b] rounded-xl px-2 py-1 text-[#4a3550] dark:text-[#fdeeff] placeholder:text-[#5a425f]/50 outline-none focus:border-[#ff7aa8]"
            />
            {searchResults.length > 0 && (
              <div className="absolute right-0 top-8 w-64 bg-white dark:bg-[#271d31] border-2 border-[#ffd3e2] dark:border-[#5a3a6b] rounded-2xl shadow-xl z-40 p-1 flex flex-col gap-1">
                {searchResults.map((res, idx) => (
                  <button
                    key={`${res.title}-${idx}`}
                    onClick={() => {
                      flyToWorld(res.x, res.y, 2.75, res.layer);
                      setSearchQuery('');
                    }}
                    className="w-full text-left p-2 rounded-xl hover:bg-[#ffd3e2]/40 dark:hover:bg-[#5a3a6b]/40 text-xs flex items-center justify-between cursor-pointer"
                  >
                    <div className="min-w-0 pr-2">
                      <p className="font-black text-[#4a3550] dark:text-[#fdeeff] truncate">{res.title}</p>
                      <p className="text-[10px] text-[#ff7aa8] truncate">{res.subtitle}</p>
                    </div>
                    <span className="text-xs shrink-0 font-bold">🔎 Zoom</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Third Row: Layer Quick-Focus Hubs for Instant Detail Zoom */}
        <div className="px-2.5 sm:px-3 py-1.5 border-b border-[#ffd3e2]/40 dark:border-[#5a3a6b]/40 flex items-center gap-1.5 overflow-x-auto scrollbar-none bg-[#fdf3f9]/85 dark:bg-[#1a1124]/90">
          <span className="text-[10px] font-black text-[#5a425f] dark:text-[#c4b3cc] uppercase tracking-wide whitespace-nowrap shrink-0">
            Zoom Into:
          </span>
          <button
            onClick={handleFitAll}
            className="px-2 py-0.5 rounded-lg bg-white/80 dark:bg-white/10 hover:bg-[#ffd23f] hover:text-[#4a3550] text-[10px] sm:text-[11px] font-black text-[#4a3550] dark:text-[#fdeeff] border border-[#ffd3e2]/80 dark:border-[#5a3a6b] whitespace-nowrap shrink-0 cursor-pointer transition-colors"
          >
            🗺️ Full {activePhase.shortLabel}
          </button>
          {activeFocusHubs.map((hub) => {
            const isActive = selectedArea?.id === hub.detail.id;
            return (
              <button
                key={hub.id}
                onClick={() => {
                  flyToWorld(hub.tx * T, hub.ty * T, hub.zoom);
                  const { paces, dir } = getNavInfo(hub.tx * T, hub.ty * T);
                  setSelectedArea({
                    ...hub.detail,
                    distancePaces: paces,
                    direction: dir,
                  });
                }}
                className={`px-2 py-0.5 rounded-lg text-[10px] sm:text-[11px] font-black whitespace-nowrap shrink-0 cursor-pointer transition-all flex items-center gap-1 border ${
                  isActive
                    ? 'bg-[#ff7aa8] text-white border-[#ff7aa8] shadow-xs'
                    : 'bg-white/70 dark:bg-white/5 hover:bg-white dark:hover:bg-white/15 text-[#4a3550] dark:text-[#e7d8f0] border-[#ffd3e2]/70 dark:border-[#5a3a6b]/70'
                }`}
              >
                <span>{hub.icon}</span>
                <span>{hub.label}</span>
              </button>
            );
          })}
        </div>

        {/* Map Viewport Area */}
        <div
          ref={containerRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          className="relative flex-1 w-full h-full cursor-grab active:cursor-grabbing overflow-hidden bg-[#140d21] touch-none"
        >
          <canvas ref={canvasRef} onClick={handleCanvasClick} className="block w-full h-full" />

          {/* Active Phase Legend & Access Pill */}
          <div className="absolute left-2 top-2 sm:left-3 sm:top-3 pointer-events-none z-10 max-w-[78vw] sm:max-w-md flex flex-col gap-1">
            <div className="bg-[#1b1228]/85 text-white border border-white/15 backdrop-blur-md px-2 py-1 sm:px-2.5 sm:py-1.5 rounded-xl shadow-lg flex flex-col gap-0.5 sm:gap-1">
              <div className="flex items-center gap-1.5 text-[10px] sm:text-xs font-black">
                <span className="truncate">{activePhase.label}</span>
                <span className="hidden sm:inline opacity-40">·</span>
                <span className="hidden sm:inline opacity-85 font-bold truncate">{activePhase.howToReach}</span>
              </div>
              <div className="hidden xs:flex items-center flex-wrap gap-x-2.5 gap-y-0.5 text-[9.5px] sm:text-[10px] font-bold opacity-90">
                {activePhase.legend.map((item) => (
                  <span key={item.label} className="flex items-center gap-1">
                    <span
                      className="w-2 h-2 rounded-full inline-block border border-white/60"
                      style={{ backgroundColor: item.dot }}
                    />
                    <span>{item.label}</span>
                  </span>
                ))}
                {visitedTownsOnLayer.length >= 2 && (
                  <span className="flex items-center gap-1 text-[#ffd23f] font-black">
                    <span className="w-3 h-0.5 border-t-2 border-dashed border-[#ffd23f] inline-block" />
                    <span>Visited Routes ({visitedTownsOnLayer.length})</span>
                  </span>
                )}
              </div>
            </div>

            {/* Live Hover Coordinate & Micro-Terrain Badge */}
            {hoverInfo && (
              <div className="self-start bg-[#1b1228]/85 text-white border border-white/15 backdrop-blur-md px-2 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1.5 shadow-md">
                <span>{hoverInfo.icon}</span>
                <span className="text-[#ffd23f] font-black">{hoverInfo.label}</span>
                <span className="opacity-65">
                  ({hoverInfo.tx}, {hoverInfo.ty})
                </span>
              </div>
            )}
          </div>

          {/* Interactive Anchored Map Tooltip on Hovered or Selected Town */}
          {activeTooltipTown && (
            <div
              ref={townTooltipRef}
              onMouseEnter={() => {
                if (hoverCloseTimerRef.current !== null) {
                  window.clearTimeout(hoverCloseTimerRef.current);
                  hoverCloseTimerRef.current = null;
                }
              }}
              onMouseLeave={() => {
                if (hoverCloseTimerRef.current === null && hoveredTown) {
                  hoverCloseTimerRef.current = window.setTimeout(() => {
                    setHoveredTown(null);
                    hoverCloseTimerRef.current = null;
                  }, 180);
                }
              }}
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
              style={{ left: 0, top: 0, opacity: 0, willChange: 'transform' }}
              className="absolute z-30 w-56 sm:w-64 rounded-2xl bg-[#1b1228]/95 text-white border-2 border-[#ffd23f]/80 backdrop-blur-md shadow-2xl p-2.5 transition-opacity duration-100 pointer-events-auto"
            >
              {(() => {
                const { town, title, subtitle, icon } = activeTooltipTown;
                const isUnlocked = town.vis === 1;
                const { paces, dir } = getNavInfo(town.x * T, town.y * T);
                return (
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-start justify-between gap-1.5">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-lg shrink-0">{icon}</span>
                        <div className="min-w-0">
                          <h4 className="text-xs font-black text-[#fff8d6] leading-tight truncate">{title}</h4>
                          <p className="text-[10px] font-bold text-[#ff9ec0] truncate">{subtitle}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <span
                          className={`px-1.5 py-0.5 rounded-md text-[9px] font-black ${
                            isUnlocked
                              ? 'bg-[#ffd23f]/25 text-[#ffd23f] border border-[#ffd23f]/50'
                              : 'bg-white/10 text-slate-300 border border-white/15'
                          }`}
                        >
                          {isUnlocked ? '🌀 Unlocked' : '🔒 Locked'}
                        </span>
                        {!hoveredTown && selectedArea?.townObj && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedArea(null);
                            }}
                            className="w-5 h-5 rounded-full hover:bg-white/15 text-[10px] font-black flex items-center justify-center cursor-pointer text-slate-300"
                            title="Close tooltip"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[10px] font-bold text-slate-200/90 border-t border-white/10 pt-1">
                      <span>{paces} paces · {dir}</span>
                      {isUnlocked && visitedTownsOnLayer.length >= 2 && (
                        <span className="text-[#ffd23f]">🛤️ Connected</span>
                      )}
                    </div>

                    {isUnlocked && onTeleportToTown ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onTeleportToTown(town);
                        }}
                        disabled={mana < 25}
                        className={`w-full py-1.5 px-2.5 rounded-xl font-black text-xs shadow-md transition-all flex items-center justify-center gap-1.5 ${
                          mana >= 25
                            ? 'bg-linear-to-r from-[#9b6bff] to-[#6f42ff] hover:from-[#8952ff] hover:to-[#5b2dff] text-white active:scale-95 cursor-pointer'
                            : 'bg-white/10 text-slate-400 cursor-not-allowed'
                        }`}
                        title={mana >= 25 ? 'Sing Song of Teleportation (25 MP)' : 'Need 25 MP to teleport'}
                      >
                        <span>🌀</span>
                        <span>Teleport</span>
                        <span className="px-1.5 py-0.5 rounded-md bg-black/25 text-[9.5px] font-extrabold">
                          25 MP
                        </span>
                      </button>
                    ) : (
                      <div className="text-[10px] font-bold text-slate-300/80 bg-white/5 rounded-lg px-2 py-1 text-center">
                        Visit in person to unlock Teleport
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          )}

          {/* Interactive Overview Minimap Inset (shows automatically when zoomed >= 155%) */}
          {zoomUi >= 1.55 && (
            <div
              className="absolute right-2.5 top-2.5 sm:right-3 sm:top-3 z-10 rounded-xl overflow-hidden border-2 border-[#ffd23f]/80 bg-[#140d21]/90 shadow-xl cursor-crosshair touch-none"
              title="Overview Minimap — Click or drag box to jump across this layer"
              onMouseDown={(e) => {
                e.stopPropagation();
                isInsetDraggingRef.current = true;
                scrubFromInset(e.clientX, e.clientY);
              }}
              onMouseMove={(e) => {
                if (isInsetDraggingRef.current && e.buttons === 1) {
                  e.stopPropagation();
                  scrubFromInset(e.clientX, e.clientY);
                }
              }}
              onMouseUp={() => {
                isInsetDraggingRef.current = false;
              }}
              onMouseLeave={() => {
                isInsetDraggingRef.current = false;
              }}
              onTouchStart={(e) => {
                e.stopPropagation();
                if (e.touches[0]) scrubFromInset(e.touches[0].clientX, e.touches[0].clientY);
              }}
              onTouchMove={(e) => {
                e.stopPropagation();
                if (e.touches[0]) scrubFromInset(e.touches[0].clientX, e.touches[0].clientY);
              }}
            >
              <canvas
                ref={insetCanvasRef}
                width={96}
                height={96}
                className="block w-[72px] h-[72px] sm:w-[96px] sm:h-[96px]"
              />
              <div className="bg-black/70 text-[8.5px] font-black text-center text-[#ffd23f] py-0.5 tracking-wide">
                OVERVIEW · {zoomPercent}%
              </div>
            </div>
          )}

          {/* Floating Map Zoom Slider & Navigation Controls */}
          <div className="absolute left-2 bottom-2 sm:left-3 sm:bottom-3 max-w-[calc(100%-1rem)] overflow-x-auto scrollbar-none flex items-center gap-1 sm:gap-1.5 bg-[#fffaf2fa] dark:bg-[#271d31fa] border-2 border-[#ffd3e2] dark:border-[#5a3a6b] p-1 sm:p-1.5 rounded-xl sm:rounded-2xl shadow-xl select-none z-10">
            <button
              onClick={() => handleStepZoom(0.75)}
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-white/75 dark:bg-black/25 hover:bg-[#ffd3e2] text-xs sm:text-sm font-black flex items-center justify-center cursor-pointer shadow-xs active:scale-95 shrink-0"
              title="Zoom Out (-)"
            >
              ➖
            </button>

            <div className="hidden sm:flex items-center gap-1.5 px-1">
              <input
                type="range"
                min={MIN_ZOOM}
                max={MAX_ZOOM}
                step={0.05}
                value={zoomUi}
                onChange={(e) => {
                  const container = containerRef.current;
                  const cw = container?.clientWidth || 800;
                  const ch = container?.clientHeight || 500;
                  zoomAtPoint(parseFloat(e.target.value), cw / 2, ch / 2);
                }}
                aria-label="Map Zoom Level"
                className="w-24 accent-[#ff7aa8] cursor-pointer"
              />
            </div>

            <span className="px-1.5 py-0.5 rounded-md bg-white/70 dark:bg-black/30 text-[10px] sm:text-xs font-black text-[#4a3550] dark:text-[#fdeeff] min-w-[42px] text-center tabular-nums shrink-0">
              {zoomPercent}%
            </span>

            <button
              onClick={() => handleStepZoom(1.35)}
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-white/75 dark:bg-black/25 hover:bg-[#ffd3e2] text-xs sm:text-sm font-black flex items-center justify-center cursor-pointer shadow-xs active:scale-95 shrink-0"
              title="Zoom In (+)"
            >
              ➕
            </button>

            <div className="w-[1px] h-5 sm:h-6 bg-[#ffd3e2] dark:bg-[#5a3a6b] shrink-0" />

            <button
              onClick={handleCenterOnPlayer}
              className="px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-lg sm:rounded-xl bg-[#ff7aa8] hover:bg-[#ff6b6b] text-white text-[10px] sm:text-xs font-black flex items-center gap-1 cursor-pointer shadow-xs active:scale-95 whitespace-nowrap shrink-0"
              title="Recenter on Mochi (C)"
            >
              <span>📍</span>
              <span className="hidden xs:inline">Center Me</span>
            </button>
            <button
              onClick={handleFitAll}
              className="px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-lg sm:rounded-xl bg-white/75 dark:bg-black/25 hover:bg-[#ffd3e2] text-[#4a3550] dark:text-[#fdeeff] text-[10px] sm:text-xs font-black flex items-center gap-1 cursor-pointer shadow-xs active:scale-95 whitespace-nowrap shrink-0"
              title="Fit Entire Phase Map (F)"
            >
              <span>🔄</span>
              <span className="hidden xs:inline">Fit Layer</span>
            </button>
          </div>

          {/* Floating Area Details Inspection Card */}
          {selectedArea && (
            <div className="absolute left-2 right-2 bottom-14 sm:left-auto sm:right-3 sm:bottom-3 sm:max-w-sm max-h-[34dvh] sm:max-h-[58dvh] overflow-y-auto overscroll-contain storybook-modal p-3 sm:p-3.5 rounded-2xl z-20 animate-in fade-in slide-in-from-bottom-2 duration-150">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xl sm:text-2xl p-1 bg-white dark:bg-[#3d274c] rounded-xl border border-[#ffd3e2] dark:border-[#5a3a6b]">
                    {selectedArea.icon}
                  </span>
                  <div>
                    <h4 className="text-xs sm:text-sm font-black text-[#4a3550] dark:text-[#fdeeff] leading-tight">
                      {selectedArea.title}
                    </h4>
                    <p className="text-[10px] sm:text-[11px] font-bold text-[#ff7aa8]">{selectedArea.subtitle}</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedArea(null)}
                  className="w-6 h-6 rounded-full hover:bg-black/10 text-xs font-bold flex items-center justify-center cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <p className="text-[11px] sm:text-xs text-[#5a425f] dark:text-[#c4b3cc] mt-1.5 sm:mt-2 font-medium leading-relaxed">
                {selectedArea.description}
              </p>

              {selectedArea.distancePaces !== undefined && (
                <div className="mt-2 pt-1.5 border-t border-[#ffd3e2]/60 dark:border-[#5a3a6b]/60 flex items-center justify-between text-[11px] sm:text-xs font-black">
                  <span className="text-[#5a425f] dark:text-[#c4b3cc]">Distance from Mochi:</span>
                  <span className="text-[#ff7aa8]">
                    {selectedArea.distancePaces} paces ({selectedArea.direction})
                  </span>
                </div>
              )}

              {selectedArea.residents && selectedArea.residents.length > 0 && (
                <div className="mt-1.5 text-[11px] sm:text-xs font-black">
                  <span className="text-[#5a425f] dark:text-[#c4b3cc]">Notable Keepers: </span>
                  <span className="text-[#4a3550] dark:text-[#fdeeff]">
                    {selectedArea.residents.join(', ')}
                  </span>
                </div>
              )}

              {selectedArea.collectiblesInfo && (
                <div className="mt-1 px-2 py-0.5 rounded-lg bg-[#ffd23f]/25 text-[#4a3550] dark:text-[#ffd23f] text-[10px] sm:text-[11px] font-black">
                  {selectedArea.collectiblesInfo}
                </div>
              )}

              <div className="flex gap-1.5 mt-2">
                <button
                  onClick={() => {
                    flyToWorld(selectedArea.x, selectedArea.y, Math.max(2.6, Math.min(4.5, zoomUi * 1.45)));
                  }}
                  className="flex-1 py-1.5 px-3 rounded-xl bg-linear-to-r from-[#ff7aa8] to-[#ff6b6b] hover:from-[#ff6b6b] hover:to-[#ff5555] text-white font-black text-xs shadow-md transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <span>🔎</span>
                  <span>Inspect Close-Up</span>
                </button>
                {selectedArea.townObj?.vis === 1 && onTeleportToTown && (
                  <button
                    onClick={() => onTeleportToTown(selectedArea.townObj!)}
                    disabled={mana < 25}
                    className={`py-1.5 px-3 rounded-xl font-black text-xs shadow-md transition-all flex items-center justify-center gap-1 whitespace-nowrap ${
                      mana >= 25
                        ? 'bg-linear-to-r from-[#9b6bff] to-[#6f42ff] hover:from-[#8952ff] hover:to-[#5b2dff] text-white active:scale-95 cursor-pointer'
                        : 'bg-gray-300/70 dark:bg-white/10 text-gray-500 cursor-not-allowed'
                    }`}
                    title={mana >= 25 ? 'Sing Song of Teleportation (25 MP)' : 'Need 25 MP to fast-travel'}
                  >
                    <span>🌀</span>
                    <span>Teleport (25 MP)</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Quick Helper Tip */}
          {zoomUi < 1.55 && (
            <div className="absolute right-2.5 top-2.5 sm:right-3 sm:top-3 hidden md:block bg-black/45 text-white/90 text-[10px] px-2.5 py-1 rounded-lg backdrop-blur-xs pointer-events-none">
              🖱️ Scroll or Double-Click to zoom cursor · Drag/WASD to pan · Click tiles to inspect
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
