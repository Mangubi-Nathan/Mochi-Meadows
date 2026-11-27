import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import {
  CottageDecoration,
  CottageState,
  FurnitureAnimationKind,
  HamletResident,
  HouseRoomId,
  PlayerLook,
} from '../game/engine';
import { audio } from '../game/audio';
import { WeatherConfig, WeatherId } from '../game/constants';
import { createArchMaterialPack } from '../game/architecturePack3D';
import { createWorldShaderUniforms } from '../game/worldShaders3D';
import {
  HOUSE_ROOM_LOCAL_CENTERS,
  buildHouseInterior3D,
  mapRoomPercentToHouseWorld,
  unmapHouseWorldToRoomPercent,
} from '../game/houseInterior3D';
import { createMochiRig, updateMochiRig } from '../game/mochiModel3D';

type TabKey = HouseRoomId | 'hamlet';

interface FurnitureCatalogItem {
  id: string;
  name: string;
  icon: string;
  cost: number;
  room: HouseRoomId;
  note: string;
}

interface CottageModalProps {
  cottage: CottageState;
  hamletResidents: HamletResident[];
  playerLook: PlayerLook;
  activeWeather: WeatherConfig;
  fishLog: Record<string, number>;
  stamina: number;
  mana: number;
  coins: number;
  inHouse3D?: boolean;
  currentRoom3D?: HouseRoomId;
  onSelectRoom3D?: (room: HouseRoomId) => void;
  onEnterHouse3D?: () => void;
  onUpdateCottage: (updated: Partial<CottageState>) => void;
  onSpendCoins: (amount: number, reason: string) => boolean;
  onEarnCoins: (amount: number, reason: string) => void;
  onRestRestore: () => void;
  onRestoreVitals: (staminaDelta: number, manaDelta: number, message: string) => void;
  onInviteToHamlet: (npcName: string) => void;
  onOpenSongWeaver: () => void;
  onOpenWardrobe: () => void;
  onPlayMusicBox: () => void;
  onStepOutside?: () => void;
  onClose: () => void;
}

const ROOM_META: Record<
  TabKey,
  { label: string; shortLabel: string; icon: string; subtitle: string; roleTitle: string }
> = {
  living: {
    label: 'Living Room',
    shortLabel: 'Living Room',
    icon: '🛋️',
    subtitle: 'Brick hearth, weather picture window & music box parlor',
    roleTitle: 'Hearth & Parlor',
  },
  kitchen: {
    label: 'Kitchen & Tea Bar',
    shortLabel: 'Kitchen',
    icon: '🍳',
    subtitle: 'Cloud pastry oven, copper kettle & cold-mist icebox',
    roleTitle: 'Bakery & Tea Bar',
  },
  bedroom: {
    label: 'Bedroom',
    shortLabel: 'Bedroom',
    icon: '🛏️',
    subtitle: 'Patchwork four-poster bed, bedside lamp & carved wardrobe',
    roleTitle: 'Rest & Dressing',
  },
  study: {
    label: 'Study & Studio',
    shortLabel: 'Study',
    icon: '📚',
    subtitle: 'Archipelago shelves, skylight telescope & Song Weaver desk',
    roleTitle: 'Lore & Composition',
  },
  conservatory: {
    label: 'Sunroom',
    shortLabel: 'Sunroom',
    icon: '🌿',
    subtitle: 'Glass-arched botanical greenhouse & sunlit flower benches',
    roleTitle: 'Botanical Conservatory',
  },
  bath: {
    label: 'Bath & Reef',
    shortLabel: 'Bath & Reef',
    icon: '🛁',
    subtitle: 'Steaming cedar soaking tub & panoramic saltwater wall aquarium',
    roleTitle: 'Spa & Coral Reef',
  },
  hamlet: {
    label: 'Mochi Hamlet',
    shortLabel: 'Hamlet',
    icon: '🏘️',
    subtitle: 'Invite island friends to build cottages & shops beside your yard',
    roleTitle: 'Island Neighborhood',
  },
};

const FURNITURE_CATALOG: FurnitureCatalogItem[] = [
  // Living Room
  { id: 'cloud_sofa_mini', name: 'Cloud Cushion', icon: '☁️', cost: 20, room: 'living', note: 'Soft sunlit pouf' },
  { id: 'hearth_rug', name: 'Braided Rug', icon: '🧶', cost: 28, room: 'living', note: 'Warm woven floor mat' },
  { id: 'lava_lantern', name: 'Amber Lantern', icon: '🏮', cost: 35, room: 'living', note: 'Soft evening glow' },
  { id: 'cat_plush', name: 'Mochi Plushie', icon: '🧸', cost: 25, room: 'living', note: 'Cozy armchair friend' },

  // Kitchen
  { id: 'tea_set', name: 'Porcelain Tea Set', icon: '🫖', cost: 30, room: 'kitchen', note: 'Chamomile steepware' },
  { id: 'croissant_tray', name: 'Pastry Stand', icon: '🥐', cost: 24, room: 'kitchen', note: 'Fresh glazed rolls' },
  { id: 'herb_rack', name: 'Kitchen Herb Jar', icon: '🫙', cost: 18, room: 'kitchen', note: 'Mint & cinnamon' },
  { id: 'berry_bowl', name: 'Berry Basket', icon: '🍓', cost: 22, room: 'kitchen', note: 'Sweet morning berries' },

  // Bedroom
  { id: 'dream_catcher', name: 'Moon Mobile', icon: '🌙', cost: 32, room: 'bedroom', note: 'Gentle crescent charm' },
  { id: 'silk_pillow', name: 'Cloud Pillows', icon: '🛏️', cost: 26, room: 'bedroom', note: 'Down-feather cushions' },
  { id: 'vanity_mirror', name: 'Pearl Mirror', icon: '🪞', cost: 40, room: 'bedroom', note: 'Ribbon-framed vanity' },
  { id: 'flower_vase', name: 'Bedside Bouquet', icon: '🌷', cost: 18, room: 'bedroom', note: 'Fresh cut tulips' },

  // Study
  { id: 'inkwell_shelf', name: 'Oak Bookshelf', icon: '📚', cost: 45, room: 'study', note: 'Bound island atlases' },
  { id: 'brass_globe', name: 'Crystal Globe', icon: '🔮', cost: 50, room: 'study', note: 'Maps starlight currents' },
  { id: 'quill_desk', name: 'Wax Seal Desk', icon: '🕯️', cost: 30, room: 'study', note: 'Warm reading taper' },
  { id: 'violin_stand', name: 'Breeze Lute', icon: '🎻', cost: 55, room: 'study', note: 'Tuned for harmonies' },

  // Conservatory
  { id: 'blossom_pot', name: 'Cherry Bonsai', icon: '🌸', cost: 25, room: 'conservatory', note: 'Blooms year-round' },
  { id: 'hanging_fern', name: 'Macramé Fern', icon: '🪴', cost: 22, room: 'conservatory', note: 'Trails morning dew' },
  { id: 'sun_chime', name: 'Sun Prism Chime', icon: '🎐', cost: 32, room: 'conservatory', note: 'Rings in glasshouse breeze' },
  { id: 'honey_hive', name: 'Glass Terrarium', icon: '🫧', cost: 38, room: 'conservatory', note: 'Moss & firefly dome' },

  // Bath & Reef
  { id: 'scented_candles', name: 'Lavender Candles', icon: '🕯️', cost: 20, room: 'bath', note: 'Calming cedar scent' },
  { id: 'shell_basket', name: 'Pearl Shell Tray', icon: '🐚', cost: 26, room: 'bath', note: 'Collected cove shells' },
  { id: 'ducky_friend', name: 'Bath Toy Duck', icon: '🐤', cost: 15, room: 'bath', note: 'Floats in warm bubbles' },
  { id: 'coral_fan', name: 'Coral Branch Art', icon: '🪸', cost: 34, room: 'bath', note: 'Pink reef sculpture' },
];

interface FurnitureInteractionSpec {
  animation: FurnitureAnimationKind;
  chime?: boolean;
  lines: string[];
}

const FURNITURE_INTERACTIONS: Record<string, FurnitureInteractionSpec> = {
  'Porcelain Tea Set': {
    animation: 'steam',
    chime: true,
    lines: [
      'A curl of warm chamomile & starlight steam rises gently from the spout.',
      'The porcelain lid clinks softly — fresh honey-clover tea is ready to sip!',
      'Swirling amber tea reflects the kitchen lanterns like a miniature sunset.',
    ],
  },
  'Cloud Cushion': {
    animation: 'bounce',
    lines: [
      'Fluff-poof! Soft as a summer cloud drifted straight from Cirrus Kingdom.',
      'You squish a corner of the cushion and it springs back with a tiny golden puff.',
    ],
  },
  'Braided Rug': {
    animation: 'sparkle',
    lines: [
      'Warm wool loops hug your paws like an old meadow lullaby.',
      'Sunlight catches tiny golden threads woven along the braided border.',
    ],
  },
  'Starry Rug': {
    animation: 'sparkle',
    chime: true,
    lines: ['Little star patterns shimmer softly as you step onto the weave.'],
  },
  'Amber Lantern': {
    animation: 'glow',
    chime: true,
    lines: [
      'Warm honey light spills across the floorboards in cozy golden rings.',
      'Tiny luminous motes dance happily around the painted paper shade.',
    ],
  },
  'Lava Lamp': {
    animation: 'glow',
    lines: ['Rosy wax bubbles drift lazily upward inside the warm glass spire.'],
  },
  'Mochi Plushie': {
    animation: 'heart',
    lines: [
      'Squeak-purr! Mochi Plushie gives you an extra-warm embroidered paw hug.',
      'Its round stitched cheeks look proud to keep the living room cozy.',
    ],
  },
  'Pastry Stand': {
    animation: 'steam',
    lines: [
      'Warm cinnamon & flaky butter aroma curls off the freshly glazed croissants!',
      'Pip would definitely approve — not a single crumb wasted.',
    ],
  },
  'Kitchen Herb Jar': {
    animation: 'petals',
    lines: ['Pop goes the cork! Crisp mint leaves and sweet wild thyme scent the air.'],
  },
  'Berry Basket': {
    animation: 'bounce',
    lines: ['Plump ruby strawberries from Lantern Isle — still cool with morning dew!'],
  },
  'Moon Mobile': {
    animation: 'notes',
    chime: true,
    lines: [
      'Little silver crescents spin lazily, humming a sleepy bedtime chime.',
      'Soft starlight glints off each dangling moon charm above the bed.',
    ],
  },
  'Cloud Pillows': {
    animation: 'bounce',
    lines: ['Puffed high with eiderdown feathers — practically begging for an afternoon snooze.'],
  },
  'Pearl Mirror': {
    animation: 'sparkle',
    chime: true,
    lines: ['You strike a cheerful whiskered pose in the mother-of-pearl frame!'],
  },
  'Bedside Bouquet': {
    animation: 'petals',
    lines: ['Fresh pastel tulip petals unfurl gently in the warm bedroom breeze.'],
  },
  'Oak Bookshelf': {
    animation: 'sparkle',
    lines: [
      'You open "Songs of the Lantern Roots" — a pressed four-leaf clover flutters out!',
      'Every spine smells faintly of cedar wood and rainy-day tea.',
    ],
  },
  'Crystal Globe': {
    animation: 'glow',
    chime: true,
    lines: [
      'Swirling starlight currents trace sea routes toward Dawn Spire inside the orb.',
      'Tiny constellation sparks blink in rhythm with your heartbeat.',
    ],
  },
  'Wax Seal Desk': {
    animation: 'glow',
    lines: ['The beeswax candle flickers warmly beside a stack of stamped island postcards.'],
  },
  'Breeze Lute': {
    animation: 'notes',
    chime: true,
    lines: ['A gentle strum sends honeyed pentatonic notes floating around the study!'],
  },
  'Cherry Bonsai': {
    animation: 'petals',
    lines: [
      'Delicate pink blossoms drift slowly from the twisted branches like snow.',
      'Even indoors, Lantern Isle springs bloom all year round on this sunny shelf.',
    ],
  },
  'Macramé Fern': {
    animation: 'petals',
    lines: ['Emerald fronds sway softly in the sunlit greenhouse draft.'],
  },
  'Sun Prism Chime': {
    animation: 'notes',
    chime: true,
    lines: ['Crystal chimes tinkle merrily, painting tiny rainbows across the flagstones!'],
  },
  'Glass Terrarium': {
    animation: 'glow',
    lines: ['Two sleepy moss fireflies blink a golden hello beneath the tiny fern dome!'],
  },
  'Lavender Candles': {
    animation: 'glow',
    lines: ['Soothing purple lavender ribbons drift peacefully across the warm bathhouse.'],
  },
  'Pearl Shell Tray': {
    animation: 'bubbles',
    chime: true,
    lines: ['Hold a spiral shell to your ear — Pearl Reef’s chorus still echoes softly inside.'],
  },
  'Bath Toy Duck': {
    animation: 'bubbles',
    lines: ['Squeak-splash! Ducky hops happily through an imaginary cloud of soap suds.'],
  },
  'Coral Branch Art': {
    animation: 'bubbles',
    lines: ['Rose-pink coral shimmers with pearly droplets like sunset at Tidepool Atoll.'],
  },
};

function getFurnitureInteraction(name: string): FurnitureInteractionSpec {
  return (
    FURNITURE_INTERACTIONS[name] || {
      animation: 'sparkle',
      lines: [
        `You tidy and admire your ${name} — it makes this room feel extra warm and lived-in.`,
      ],
    }
  );
}

const SEED_TYPES = [
  { id: 'daisy', name: 'Sunny Daisy', icon: '🌼', coinYield: 8, desc: 'Cheerful sunlit petals' },
  { id: 'sky_seed', name: 'Cirrus Sky Flower', icon: '🩵', coinYield: 12, desc: 'Soft cloud-blue blooms' },
  { id: 'glow_spore', name: 'Glowcap Lantern', icon: '🍄', coinYield: 14, desc: 'Bioluminescent cap' },
  { id: 'ember_blossom', name: 'Ember Rose', icon: '🌹', coinYield: 16, desc: 'Warm ruby hearth petals' },
];

const STARGAZE_READINGS = [
  'The Lantern Constellation tilts east — lucky gusts carry drifted bottle notes toward Pearl Reef.',
  'The Silver Harp aligns over Cirrus Castle, boosting musical inspiration across Mochi Hamlet.',
  'Dewdrop Crescent glimmers brightly; newly watered blooms in your Sunroom will flourish tonight.',
  'Comet Whisker arcs past Aurora Reach, promising joyful reunions with island friends.',
];

interface ProjectedHotspot {
  deco: CottageDecoration;
  leftPct: number;
  topPct: number;
}

/**
 * Interactive Three.js 3D Architectural Preview of all 6 connected rooms
 * (Rendered whenever CottageModal is opened from outside or pause menu)
 */
const RoomInterior3DCanvas: React.FC<{
  activeRoom: HouseRoomId;
  cottage: CottageState;
  playerLook: PlayerLook;
  weatherId: WeatherId;
  aquariumFishList: string[];
  roomDecorations: CottageDecoration[];
  isArrangeMode: boolean;
  movingDecoId: string | null;
  activeEffect: { decoId: string; kind: FurnitureAnimationKind; nonce: number } | null;
  onPlaceMovingAt: (xPct: number, yPct: number) => void;
  onSelectDecoration: (deco: CottageDecoration) => void;
  onMoveDecorationStart: (decoId: string) => void;
  onRemoveDecoration: (id: string, name: string) => void;
}> = ({
  activeRoom,
  cottage,
  playerLook,
  weatherId,
  aquariumFishList,
  roomDecorations,
  isArrangeMode,
  movingDecoId,
  activeEffect,
  onPlaceMovingAt,
  onSelectDecoration,
  onMoveDecorationStart,
  onRemoveDecoration,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const propsRef = useRef({
    activeRoom,
    cottage,
    playerLook,
    weatherId,
    aquariumFishList,
    roomDecorations,
  });
  propsRef.current = {
    activeRoom,
    cottage,
    playerLook,
    weatherId,
    aquariumFishList,
    roomDecorations,
  };

  const [hotspots, setHotspots] = useState<ProjectedHotspot[]>([]);
  const [webglError, setWebglError] = useState(false);

  const orbitRef = useRef({ yaw: 0.14, pitch: 0.56, dragging: false, moved: false, lastX: 0, lastY: 0 });
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const isCompactViewport = typeof window !== 'undefined' && (window.innerWidth < 640 || window.innerHeight <= 520);
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: !isCompactViewport,
        preserveDrawingBuffer: false,
        powerPreference: isCompactViewport ? 'default' : 'high-performance',
      });
    } catch {
      setWebglError(true);
      return;
    }

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isCompactViewport ? 1.1 : 1.5));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = isCompactViewport ? THREE.PCFShadowMap : THREE.PCFSoftShadowMap;
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.style.display = 'block';
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    let contextLost = false;
    const onLost = (e: Event) => {
      e.preventDefault();
      contextLost = true;
      setWebglError(true);
    };
    renderer.domElement.addEventListener('webglcontextlost', onLost);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x281e38);

    const camera = new THREE.PerspectiveCamera(
      44,
      Math.max(1, container.clientWidth) / Math.max(1, container.clientHeight),
      0.45,
      90
    );
    cameraRef.current = camera;

    const hemi = new THREE.HemisphereLight(0xfff4e0, 0x5c426b, 1.35);
    scene.add(hemi);
    const sun = new THREE.DirectionalLight(0xfff0d4, 1.65);
    sun.position.set(7, 14, 9);
    sun.castShadow = true;
    sun.shadow.mapSize.set(512, 512);
    sun.shadow.camera.near = 2;
    sun.shadow.camera.far = 36;
    const d = 14;
    sun.shadow.camera.left = -d;
    sun.shadow.camera.right = d;
    sun.shadow.camera.top = d;
    sun.shadow.camera.bottom = -d;
    sun.shadow.bias = -0.0008;
    sun.shadow.normalBias = 0.035;
    sun.shadow.radius = 1.6;
    scene.add(sun);

    const ownedGeos: THREE.BufferGeometry[] = [];
    const ownedMats: THREE.Material[] = [];
    const trackGeo = <T extends THREE.BufferGeometry>(g: T): T => {
      ownedGeos.push(g);
      return g;
    };
    const trackMat = <T extends THREE.Material>(m: T): T => {
      ownedMats.push(m);
      return m;
    };

    const uniforms = createWorldShaderUniforms();
    const archPack = createArchMaterialPack(uniforms, trackMat);
    const interior = buildHouseInterior3D(archPack, trackGeo, trackMat);
    interior.setCutaway(true);
    scene.add(interior.group);

    // 3D Player Mochi inside the focused room
    const mochiRig = createMochiRig();
    mochiRig.root.scale.setScalar(0.88);
    scene.add(mochiRig.root);

    const initialCenter = HOUSE_ROOM_LOCAL_CENTERS[propsRef.current.activeRoom];
    const camTarget = new THREE.Vector3(initialCenter.x, 0.9, initialCenter.z);
    const mochiPos = new THREE.Vector3(initialCenter.x - 0.6, 0.04, initialCenter.z + 1.25);

    const projVec = new THREE.Vector3();
    let raf = 0;
    let lastTime = performance.now();
    let elapsed = 0;
    let frameIdx = 0;
    let prevSpots: ProjectedHotspot[] = [];

    const handleResize = () => {
      const w = Math.max(1, container.clientWidth);
      const h = Math.max(1, container.clientHeight);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h, false);
    };
    handleResize();

    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(handleResize) : null;
    ro?.observe(container);

    const tick = (now: number) => {
      if (contextLost) return;
      const dt = Math.min(0.05, Math.max(0.001, (now - lastTime) / 1000));
      lastTime = now;
      elapsed += dt;
      frameIdx++;

      const cur = propsRef.current;
      const center = HOUSE_ROOM_LOCAL_CENTERS[cur.activeRoom] || HOUSE_ROOM_LOCAL_CENTERS.living;
      const lerpAmt = Math.min(1, dt * 6.5);
      camTarget.x += (center.x - camTarget.x) * lerpAmt;
      camTarget.z += (center.z - camTarget.z) * lerpAmt;

      const mochiGoalX = center.x + (cur.activeRoom === 'kitchen' || cur.activeRoom === 'study' ? -0.9 : 0.4);
      const mochiGoalZ = center.z + 1.45;
      const distToGoal = Math.hypot(mochiGoalX - mochiPos.x, mochiGoalZ - mochiPos.z);
      mochiPos.x += (mochiGoalX - mochiPos.x) * lerpAmt;
      mochiPos.z += (mochiGoalZ - mochiPos.z) * lerpAmt;

      mochiRig.root.position.copy(mochiPos);
      const isBlinking = elapsed % 3.8 < 0.14;
      updateMochiRig(mochiRig, {
        look: cur.playerLook,
        time: elapsed,
        isMoving: distToGoal > 0.2,
        isBlinking,
        facingYaw: Math.sin(elapsed * 0.7) * 0.25,
        bobOffset: Math.sin(elapsed * 2.4) * 0.02,
        dt,
      });

      const orb = orbitRef.current;
      const radius = 8.4;
      const cosP = Math.cos(orb.pitch);
      camera.position.set(
        camTarget.x + Math.sin(orb.yaw) * cosP * radius,
        camTarget.y + Math.sin(orb.pitch) * radius + 1.0,
        camTarget.z + Math.cos(orb.yaw) * cosP * radius
      );
      camera.lookAt(camTarget);

      interior.update(elapsed, cur.cottage, cur.weatherId, cur.aquariumFishList);
      renderer.render(scene, camera);

      // Refresh projected hotspot tags only when positions move meaningfully (eliminates idle React re-renders)
      if (frameIdx % 4 === 0) {
        const nextSpots: ProjectedHotspot[] = [];
        for (let i = 0; i < cur.roomDecorations.length; i++) {
          const deco = cur.roomDecorations[i];
          const wp = mapRoomPercentToHouseWorld(cur.activeRoom, deco.x, deco.y);
          projVec.set(wp.x, wp.y + 0.52, wp.z).project(camera);
          if (projVec.z < 1 && projVec.x >= -0.95 && projVec.x <= 0.95 && projVec.y >= -0.9 && projVec.y <= 0.9) {
            nextSpots.push({
              deco,
              leftPct: (projVec.x * 0.5 + 0.5) * 100,
              topPct: (-projVec.y * 0.5 + 0.5) * 100,
            });
          }
        }
        let changed = nextSpots.length !== prevSpots.length;
        if (!changed) {
          for (let i = 0; i < nextSpots.length; i++) {
            const a = nextSpots[i];
            const b = prevSpots[i];
            if (
              a.deco !== b.deco ||
              Math.abs(a.leftPct - b.leftPct) > 0.35 ||
              Math.abs(a.topPct - b.topPct) > 0.35
            ) {
              changed = true;
              break;
            }
          }
        }
        if (changed) {
          prevSpots = nextSpots;
          setHotspots(nextSpots);
        }
      }

      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      ro?.disconnect();
      renderer.domElement.removeEventListener('webglcontextlost', onLost);
      interior.dispose();
      mochiRig.root.traverse((obj) => {
        if ((obj as THREE.Mesh).isMesh) {
          const m = obj as THREE.Mesh;
          m.geometry?.dispose();
        }
      });
      for (const g of ownedGeos) g.dispose();
      for (const m of ownedMats) m.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
      cameraRef.current = null;
    };
  }, []);

  const raycasterRef = useRef(new THREE.Raycaster());
  const floorPlaneRef = useRef(new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.03));
  const hitPointRef = useRef(new THREE.Vector3());
  const pointerNdcRef = useRef(new THREE.Vector2());

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    orbitRef.current.dragging = true;
    orbitRef.current.moved = false;
    orbitRef.current.lastX = e.clientX;
    orbitRef.current.lastY = e.clientY;
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const orb = orbitRef.current;
    if (!orb.dragging) return;
    const dx = e.clientX - orb.lastX;
    const dy = e.clientY - orb.lastY;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) orb.moved = true;
    orb.lastX = e.clientX;
    orb.lastY = e.clientY;
    orb.yaw = Math.max(-0.95, Math.min(0.95, orb.yaw - dx * 0.008));
    orb.pitch = Math.max(0.28, Math.min(1.08, orb.pitch + dy * 0.006));
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const wasMoved = orbitRef.current.moved;
    orbitRef.current.dragging = false;
    if (wasMoved || !movingDecoId) return;

    const container = mountRef.current;
    const cam = cameraRef.current;
    if (!container || !cam) return;
    const rect = container.getBoundingClientRect();
    pointerNdcRef.current.set(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1
    );
    raycasterRef.current.setFromCamera(pointerNdcRef.current, cam);
    if (raycasterRef.current.ray.intersectPlane(floorPlaneRef.current, hitPointRef.current)) {
      const pct = unmapHouseWorldToRoomPercent(activeRoom, hitPointRef.current.x, hitPointRef.current.z);
      onPlaceMovingAt(pct.x, pct.y);
    }
  };

  if (webglError) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-[#281e38] text-white/90 text-xs font-bold p-4 text-center">
        3D Preview unavailable in this browser mode — step through your front door to walk around the 3D house!
      </div>
    );
  }

  return (
    <div
      className={`relative w-full aspect-16/10 min-h-[200px] sm:min-h-[265px] max-h-[42dvh] sm:max-h-none rounded-2xl border-2 border-[#e8bfd1] dark:border-[#5d3d70] overflow-hidden shadow-inner select-none ${
        movingDecoId ? 'cursor-crosshair ring-2 ring-[#ffd23f]' : 'cursor-grab active:cursor-grabbing'
      }`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={() => {
        orbitRef.current.dragging = false;
      }}
    >
      <div ref={mountRef} className="w-full h-full" />

      {/* 3D Orbit Hint Pill */}
      <div className="pointer-events-none absolute top-2 left-2 px-2 py-0.5 rounded-lg bg-[#20142f]/85 text-[#fdeeff] text-[10px] font-extrabold">
        🔄 Drag to orbit 3D {ROOM_META[activeRoom].shortLabel}
      </div>

      {/* Projected Interactive 3D Furniture Badges */}
      {hotspots.map(({ deco, leftPct, topPct }) => {
        const isMovingThis = movingDecoId === deco.id;
        const effectHere = activeEffect?.decoId === deco.id ? activeEffect : null;
        return (
          <div
            key={deco.id}
            style={{ left: `${leftPct}%`, top: `${topPct}%` }}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              if (isArrangeMode) {
                onMoveDecorationStart(deco.id);
              } else {
                onSelectDecoration(deco);
              }
            }}
            title={isArrangeMode ? `${deco.name} (click to move)` : `${deco.name} (click to interact)`}
            className={`group absolute -translate-x-1/2 -translate-y-1/2 flex items-center gap-1 px-1.5 py-0.5 rounded-xl text-[11px] font-black shadow-md cursor-pointer transition-transform ${
              isMovingThis
                ? 'bg-[#ffd23f] text-[#4a3550] ring-2 ring-white scale-115 z-20'
                : 'bg-[#fffaf4]/90 dark:bg-[#2a1d35]/90 text-[#4a3550] dark:text-[#fdeeff] border border-[#f2a8c2] hover:scale-110 z-10'
            }`}
          >
            <span>{deco.icon}</span>
            {effectHere && <span>✨</span>}
            {isArrangeMode && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onRemoveDecoration(deco.id, deco.name);
                }}
                aria-label={`Remove ${deco.name}`}
                className="ml-0.5 w-4 h-4 rounded-full bg-[#ff5c8a] text-white text-[9px] flex items-center justify-center cursor-pointer"
              >
                ×
              </button>
            )}
          </div>
        );
      })}

      {movingDecoId && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-30 px-3 py-1 rounded-xl bg-[#4a3550]/90 text-white text-[11px] font-black shadow-md pointer-events-none whitespace-nowrap">
          Tap anywhere on the 3D floor in {ROOM_META[activeRoom].label} to place item
        </div>
      )}
    </div>
  );
};

export const CottageModal: React.FC<CottageModalProps> = ({
  cottage,
  hamletResidents,
  playerLook,
  activeWeather,
  fishLog,
  stamina,
  mana,
  coins,
  inHouse3D = false,
  currentRoom3D,
  onSelectRoom3D,
  onEnterHouse3D,
  onUpdateCottage,
  onSpendCoins,
  onEarnCoins,
  onRestRestore,
  onRestoreVitals,
  onInviteToHamlet,
  onOpenSongWeaver,
  onOpenWardrobe,
  onPlayMusicBox,
  onStepOutside,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<TabKey>(currentRoom3D || 'living');
  const [feedback, setFeedback] = useState<string>('');
  const [isArrangeMode, setIsArrangeMode] = useState(false);
  const [movingDecoId, setMovingDecoId] = useState<string | null>(null);
  const [activeEffect, setActiveEffect] = useState<{
    decoId: string;
    kind: FurnitureAnimationKind;
    nonce: number;
  } | null>(null);
  const [furnitureDialogue, setFurnitureDialogue] = useState<{
    decoId: string;
    name: string;
    icon: string;
    line: string;
    count: number;
  } | null>(null);
  const [stargazeNote, setStargazeNote] = useState<string | null>(null);
  const [showAllFurniture, setShowAllFurniture] = useState(false);

  // Sync active tab when player walks between rooms inside the live 3D house
  useEffect(() => {
    if (inHouse3D && currentRoom3D && activeTab !== 'hamlet') {
      setActiveTab(currentRoom3D);
    }
  }, [inHouse3D, currentRoom3D]);

  const fireplaceLit = cottage.fireplaceLit !== false;
  const lampOn = cottage.lampOn !== false;
  const tubFilled = cottage.tubFilled !== false;
  const ovenWarm = Boolean(cottage.ovenWarm);

  const showRoomFeedback = (msg: string) => setFeedback(msg);

  useEffect(() => {
    if (!feedback) return;
    const id = window.setTimeout(() => setFeedback(''), 3200);
    return () => window.clearTimeout(id);
  }, [feedback]);

  useEffect(() => {
    if (!activeEffect) return;
    const id = window.setTimeout(() => setActiveEffect(null), 2600);
    return () => window.clearTimeout(id);
  }, [activeEffect]);

  useEffect(() => {
    if (!furnitureDialogue) return;
    const id = window.setTimeout(() => setFurnitureDialogue(null), 4800);
    return () => window.clearTimeout(id);
  }, [furnitureDialogue]);

  const activeRoomId: HouseRoomId = activeTab === 'hamlet' ? 'living' : activeTab;

  const roomDecorations = useMemo(() => {
    return cottage.decorationsPlaced.filter((d) => (d.room || 'living') === activeRoomId);
  }, [cottage.decorationsPlaced, activeRoomId]);

  const catalogList = useMemo(() => {
    if (showAllFurniture) return FURNITURE_CATALOG;
    return FURNITURE_CATALOG.filter((f) => f.room === activeRoomId);
  }, [activeRoomId, showAllFurniture]);

  const aquariumRoster = useMemo(() => {
    const caughtEntries = Object.entries(fishLog).filter(([, count]) => count > 0);
    const starter = cottage.aquariumFish.filter((name) => !fishLog[name]);
    return [
      ...caughtEntries.map(([name, count]) => ({ name, count, caught: true })),
      ...starter.map((name) => ({ name, count: 1, caught: false })),
    ];
  }, [fishLog, cottage.aquariumFish]);

  const aquariumFishList = useMemo(() => aquariumRoster.map((f) => f.name), [aquariumRoster]);

  const handlePlaceMovingAt = (xPct: number, yPct: number) => {
    if (!movingDecoId) return;
    onUpdateCottage({
      decorationsPlaced: cottage.decorationsPlaced.map((d) =>
        d.id === movingDecoId ? { ...d, x: xPct, y: yPct, room: activeRoomId } : d
      ),
    });
    setMovingDecoId(null);
    audio.pop();
    showRoomFeedback('Moved 3D furniture into its cozy new spot!');
  };

  const handleInteractDecoration = (deco: CottageDecoration) => {
    const spec = getFurnitureInteraction(deco.name);
    const nextCount = (deco.interactionCount || 0) + 1;
    const lineIdx = (nextCount - 1) % spec.lines.length;
    const now = Date.now();

    onUpdateCottage({
      decorationsPlaced: cottage.decorationsPlaced.map((d) =>
        d.id === deco.id ? { ...d, lastInteractedAt: now, interactionCount: nextCount } : d
      ),
      lastInteractedFurnitureId: deco.id,
      furnitureInteractCount: (cottage.furnitureInteractCount || 0) + 1,
    });

    if (spec.chime) audio.chime();
    else audio.pop();

    setActiveEffect({ decoId: deco.id, kind: spec.animation, nonce: now });
    setFurnitureDialogue({
      decoId: deco.id,
      name: deco.name,
      icon: deco.icon,
      line: spec.lines[lineIdx],
      count: nextCount,
    });
  };

  const handleAddDecoration = (item: FurnitureCatalogItem) => {
    if (!onSpendCoins(item.cost, `Crafted ${item.name}`)) return;
    const newDeco: CottageDecoration = {
      id: `deco-${Date.now()}-${Math.floor(Math.random() * 999)}`,
      x: 24 + Math.round(Math.random() * 52),
      y: 44 + Math.round(Math.random() * 34),
      name: item.name,
      icon: item.icon,
      room: activeRoomId,
      interactionCount: 0,
    };
    onUpdateCottage({
      decorationsPlaced: [...cottage.decorationsPlaced, newDeco],
    });
    audio.chime();
    showRoomFeedback(`Placed 3D ${item.name} in the ${ROOM_META[activeRoomId].label}!`);
  };

  const handleRemoveDecoration = (id: string, name: string) => {
    onUpdateCottage({
      decorationsPlaced: cottage.decorationsPlaced.filter((d) => d.id !== id),
    });
    if (movingDecoId === id) setMovingDecoId(null);
    if (furnitureDialogue?.decoId === id) setFurnitureDialogue(null);
    audio.pop();
    showRoomFeedback(`Tidied away ${name} into storage.`);
  };

  const handlePlantSeed = (seed: (typeof SEED_TYPES)[number]) => {
    if (cottage.gardenPlots.length >= 6) {
      showRoomFeedback('All 6 greenhouse planter boxes are full! Harvest a mature bloom first.');
      return;
    }
    const newPlot = { seedType: seed.name, stage: 1, plantedAt: Date.now() };
    onUpdateCottage({
      gardenPlots: [...cottage.gardenPlots, newPlot],
    });
    audio.pop();
    showRoomFeedback(`Planted ${seed.name} in the 3D Sunroom planter! Water it to help it bloom.`);
  };

  const handleWaterAllPlots = () => {
    if (cottage.gardenPlots.length === 0) {
      showRoomFeedback('Plant a seed packet first so the watering can has sprouts to mist!');
      return;
    }
    onUpdateCottage({
      gardenPlots: cottage.gardenPlots.map((p) => ({
        ...p,
        stage: Math.min(3, (p.stage || 1) + 1),
      })),
    });
    audio.chime();
    showRoomFeedback('Misted every 3D planter with sun-warmed spring water! Blooms grew taller.');
  };

  const handleHarvestPlot = (index: number, seedType: string) => {
    const matched = SEED_TYPES.find((s) => s.name === seedType || s.id === seedType);
    const reward = matched?.coinYield ?? 10;
    onUpdateCottage({
      gardenPlots: cottage.gardenPlots.filter((_, idx) => idx !== index),
    });
    onEarnCoins(reward, `Harvested ${matched?.name ?? seedType}`);
    showRoomFeedback(`Harvested radiant ${matched?.name ?? seedType} for +${reward} Coins!`);
  };

  const handleTabSwitch = (key: TabKey) => {
    setActiveTab(key);
    setMovingDecoId(null);
    setFurnitureDialogue(null);
    setActiveEffect(null);
    audio.pop();
    if (inHouse3D && key !== 'hamlet' && onSelectRoom3D) {
      onSelectRoom3D(key);
    }
  };

  const controlsPanel = (
    <div className="space-y-3">
      {/* Room-Specific Interactive Appliances */}
      <div className="p-3.5 storybook-card rounded-2xl space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-black text-xs uppercase tracking-wide text-[#c94a77] dark:text-[#ff9ec0]">
            {ROOM_META[activeRoomId].icon} {ROOM_META[activeRoomId].label} Appliances
          </h3>
          <span className="text-[11px] font-bold opacity-75">
            {activeWeather.icon} {activeWeather.name}
          </span>
        </div>

        {activeTab === 'living' && (
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => {
                onUpdateCottage({ fireplaceLit: !fireplaceLit });
                audio.pop();
                showRoomFeedback(
                  !fireplaceLit
                    ? 'Crackling logs lit up the 3D living room hearth!'
                    : 'Banked the hearth embers into warm coals.'
                );
              }}
              className="min-h-[42px] p-2.5 rounded-xl storybook-well hover:border-[#ff7aa8] border border-transparent text-left cursor-pointer transition-all"
            >
              <p className="font-black text-xs text-[#4a3550] dark:text-[#fdeeff]">
                🔥 {fireplaceLit ? 'Bank Hearth Fire' : 'Light Hearth Fire'}
              </p>
              <p className="text-[10px] opacity-75">Cozy amber chimney glow</p>
            </button>

            <button
              onClick={() => {
                audio.chime();
                onPlayMusicBox();
              }}
              className="min-h-[42px] p-2.5 rounded-xl storybook-well hover:border-[#ff7aa8] border border-transparent text-left cursor-pointer transition-all"
            >
              <p className="font-black text-xs text-[#4a3550] dark:text-[#fdeeff]">🎠 Play Music Box</p>
              <p className="text-[10px] opacity-75">Chiming Song Weaver tune</p>
            </button>

            <button
              onClick={() => {
                audio.pop();
                onRestoreVitals(15, 10, 'Lounged on the Cloud Sofa (+15% ⚡ Stamina, +10% ✨ Mana)');
              }}
              className="col-span-2 min-h-[42px] p-2.5 rounded-xl bg-linear-to-r from-[#ff7aa8] to-[#f46496] text-white font-black text-xs shadow-xs cursor-pointer transition-transform active:scale-98"
            >
              🛋️ Curl Up on Cloud Sofa (+15% ⚡ · +10% ✨)
            </button>
          </div>
        )}

        {activeTab === 'kitchen' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button
              onClick={() => {
                onUpdateCottage({ ovenWarm: true });
                audio.chime();
                onRestoreVitals(25, 0, 'Baked warm honey muffins in the Cloud Oven (+25% ⚡ Stamina)!');
              }}
              className="min-h-[42px] p-2.5 rounded-xl bg-[#ff87a6] hover:brightness-105 text-white font-black text-xs text-left cursor-pointer shadow-xs"
            >
              🧁 Bake Cloud Muffin
              <span className="block text-[10px] font-bold opacity-90">+25% ⚡ Stamina</span>
            </button>

            <button
              onClick={() => {
                audio.chime();
                onRestoreVitals(0, 30, 'Steeped Starlight Chamomile Tea (+30% ✨ Mana)!');
              }}
              className="min-h-[42px] p-2.5 rounded-xl bg-[#52b8c6] hover:brightness-105 text-white font-black text-xs text-left cursor-pointer shadow-xs"
            >
              🫖 Brew Starlight Tea
              <span className="block text-[10px] font-bold opacity-90">+30% ✨ Mana</span>
            </button>

            <button
              onClick={() => {
                audio.pop();
                onRestoreVitals(15, 15, 'Shared a chilled Berry Parfait from the icebox (+15% ⚡ & +15% ✨)!');
              }}
              className="sm:col-span-2 min-h-[40px] p-2.5 rounded-xl storybook-well hover:border-[#ff7aa8] border border-transparent font-black text-xs text-[#4a3550] dark:text-[#fdeeff] cursor-pointer"
            >
              🍓 Cold-Mist Icebox Snack (+15% ⚡ &amp; +15% ✨)
            </button>
          </div>
        )}

        {activeTab === 'bedroom' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button
              onClick={() => {
                onRestRestore();
                showRoomFeedback('Took a cozy patchwork nap — Stamina & Mana 100% restored!');
              }}
              className="sm:col-span-2 min-h-[44px] p-3 rounded-xl bg-linear-to-r from-[#8d74e8] to-[#b57be8] text-white font-black text-xs shadow-xs cursor-pointer transition-transform active:scale-98"
            >
              🛏️ Rest in Patchwork Bed (Restore 100% ⚡ Stamina &amp; ✨ Mana)
            </button>

            <button
              onClick={() => {
                onUpdateCottage({ lampOn: !lampOn });
                audio.pop();
                showRoomFeedback(!lampOn ? 'Switched on the amber bedside lamp!' : 'Dimmed the bedroom for stargazing.');
              }}
              className="min-h-[40px] p-2.5 rounded-xl storybook-well hover:border-[#ff7aa8] border border-transparent font-black text-xs text-[#4a3550] dark:text-[#fdeeff] cursor-pointer"
            >
              💡 {lampOn ? 'Dim Night Lamp' : 'Turn On Lamp'}
            </button>

            <button
              onClick={onOpenWardrobe}
              className="min-h-[40px] p-2.5 rounded-xl storybook-well hover:border-[#ff7aa8] border border-transparent font-black text-xs text-[#4a3550] dark:text-[#fdeeff] cursor-pointer"
            >
              👒 Carved Wardrobe
            </button>
          </div>
        )}

        {activeTab === 'study' && (
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={onOpenSongWeaver}
                className="min-h-[42px] p-2.5 rounded-xl bg-linear-to-r from-[#ff7aa8] to-[#f46496] text-white font-black text-xs cursor-pointer shadow-xs"
              >
                🎼 Song Weaver
              </button>
              <button
                onClick={() => {
                  const reading =
                    STARGAZE_READINGS[Math.floor(Math.random() * STARGAZE_READINGS.length)];
                  setStargazeNote(reading);
                  onRestoreVitals(0, 12, 'Stargazed through the brass telescope (+12% ✨ Mana)');
                }}
                className="min-h-[42px] p-2.5 rounded-xl bg-[#5b6ad0] text-white font-black text-xs cursor-pointer shadow-xs"
              >
                🔭 Gaze at Stars
              </button>
            </div>
            {stargazeNote && (
              <p className="text-[11px] italic text-[#5a425f] dark:text-[#e6d7ec] bg-white/60 dark:bg-black/25 p-2.5 rounded-xl">
                {stargazeNote}
              </p>
            )}
          </div>
        )}

        {activeTab === 'conservatory' && (
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-black text-[#4a3550] dark:text-[#fdeeff] tabular-nums">
                {cottage.gardenPlots.length}/6 Planter Boxes Used
              </span>
              <button
                onClick={handleWaterAllPlots}
                className="min-h-[36px] px-3 py-1.5 rounded-xl bg-[#4eb8a9] hover:brightness-105 text-white font-black text-xs cursor-pointer shadow-xs"
              >
                💧 Water All Sprouts
              </button>
            </div>

            {cottage.gardenPlots.length > 0 && (
              <div className="grid grid-cols-2 gap-1.5">
                {cottage.gardenPlots.slice(0, 6).map((plot, idx) => {
                  const seedInfo = SEED_TYPES.find((s) => s.name === plot.seedType || s.id === plot.seedType);
                  const stage = plot.stage || 1;
                  const stageIcon = stage >= 3 ? (seedInfo?.icon || '🌸') : stage === 2 ? '🌿' : '🌱';
                  return (
                    <button
                      key={`${plot.seedType}-${idx}`}
                      onClick={() => {
                        if (stage >= 3) {
                          handleHarvestPlot(idx, plot.seedType);
                        } else {
                          onUpdateCottage({
                            gardenPlots: cottage.gardenPlots.map((p, pIdx) =>
                              pIdx === idx ? { ...p, stage: Math.min(3, stage + 1) } : p
                            ),
                          });
                          audio.chime();
                          showRoomFeedback(`Watered ${plot.seedType}!`);
                        }
                      }}
                      className="p-2 rounded-xl storybook-well hover:border-[#52b870] border border-transparent flex items-center justify-between gap-1.5 text-left cursor-pointer"
                    >
                      <span className="flex items-center gap-1.5 min-w-0">
                        <span className="text-lg shrink-0">{stageIcon}</span>
                        <span className="text-[11px] font-black truncate text-[#4a3550] dark:text-[#fdeeff]">
                          {plot.seedType}
                        </span>
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-[#a45c3f] text-[9px] font-black text-white shrink-0">
                        {stage >= 3 ? 'Harvest' : `${stage}/3`}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            <div className="grid grid-cols-2 gap-1.5">
              {SEED_TYPES.map((seed) => (
                <button
                  key={seed.id}
                  onClick={() => handlePlantSeed(seed)}
                  className="p-2 rounded-xl storybook-well hover:border-[#52b870] border border-transparent flex items-center gap-2 text-left cursor-pointer"
                >
                  <span className="text-xl shrink-0">{seed.icon}</span>
                  <div className="min-w-0">
                    <p className="text-[11px] font-black truncate text-[#4a3550] dark:text-[#fdeeff]">
                      {seed.name}
                    </p>
                    <p className="text-[10px] text-[#35854b] dark:text-[#8fe0a3] font-bold tabular-nums">
                      +{seed.coinYield} 🪙 harvest
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'bath' && (
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  if (!tubFilled) onUpdateCottage({ tubFilled: true });
                  onRestoreVitals(35, 10, 'Soaked in warm lavender cedar water (+35% ⚡ Stamina, +10% ✨ Mana)!');
                }}
                className="min-h-[42px] p-2.5 rounded-xl bg-[#4eaec4] hover:brightness-105 text-white font-black text-xs cursor-pointer shadow-xs"
              >
                🛁 Herbal Cedar Soak
                <span className="block text-[10px] font-bold opacity-90">+35% ⚡ · +10% ✨</span>
              </button>

              <button
                onClick={() => {
                  onUpdateCottage({ tubFilled: !tubFilled });
                  audio.pop();
                  showRoomFeedback(!tubFilled ? 'Filled the cedar tub with steaming lavender water!' : 'Drained the cedar bath.');
                }}
                className="min-h-[42px] p-2.5 rounded-xl storybook-well hover:border-[#4eaec4] border border-transparent font-black text-xs text-[#4a3550] dark:text-[#fdeeff] cursor-pointer"
              >
                🚿 {tubFilled ? 'Drain Tub' : 'Fill Warm Bath'}
              </button>
            </div>
            <div className="flex flex-wrap gap-1">
              {aquariumRoster.slice(0, 6).map((fish) => (
                <span
                  key={fish.name}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-[#0d4d6d]/85 text-white text-[10px] font-bold"
                >
                  <span>🐠</span>
                  <span>{fish.name}</span>
                  {fish.caught && <span className="text-[#ffd23f] tabular-nums">×{fish.count}</span>}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Placed 3D Items in Active Room */}
      {roomDecorations.length > 0 && (
        <div className="p-3 storybook-card rounded-2xl space-y-2">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-black text-xs uppercase tracking-wide text-[#c94a77] dark:text-[#ff9ec0]">
              Placed in {ROOM_META[activeRoomId].shortLabel} ({roomDecorations.length})
            </h3>
            {!inHouse3D && (
              <button
                onClick={() => {
                  const next = !isArrangeMode;
                  setIsArrangeMode(next);
                  if (!next) setMovingDecoId(null);
                  audio.pop();
                }}
                className={`px-2 py-0.5 rounded-lg text-[10px] font-black cursor-pointer ${
                  isArrangeMode ? 'bg-[#ffd23f] text-[#4a3550]' : 'storybook-well text-[#4a3550] dark:text-[#fdeeff]'
                }`}
              >
                {isArrangeMode ? '✓ Done Moving' : '✥ Reposition'}
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {roomDecorations.map((deco) => (
              <div
                key={deco.id}
                className="inline-flex items-center gap-1.5 px-2 py-1 rounded-xl storybook-well text-[11px] font-black text-[#4a3550] dark:text-[#fdeeff]"
              >
                <button
                  onClick={() => handleInteractDecoration(deco)}
                  className="inline-flex items-center gap-1 cursor-pointer hover:text-[#ff7aa8]"
                  title="Interact with 3D item"
                >
                  <span>{deco.icon}</span>
                  <span>{deco.name}</span>
                </button>
                {!inHouse3D && (
                  <button
                    onClick={() => {
                      setIsArrangeMode(true);
                      setMovingDecoId(movingDecoId === deco.id ? null : deco.id);
                    }}
                    title="Move on 3D floor"
                    className={`px-1 rounded text-[10px] cursor-pointer ${
                      movingDecoId === deco.id ? 'bg-[#ffd23f] text-[#4a3550]' : 'opacity-70 hover:opacity-100'
                    }`}
                  >
                    ✥
                  </button>
                )}
                <button
                  onClick={() => handleRemoveDecoration(deco.id, deco.name)}
                  title="Store away"
                  className="text-[#ff5c8a] hover:brightness-110 text-xs leading-none cursor-pointer"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Furniture Interaction Note */}
      {furnitureDialogue && !movingDecoId && (
        <div
          onClick={() => setFurnitureDialogue(null)}
          className="p-2.5 rounded-2xl bg-[#fffaf4] dark:bg-[#2a1d35] border-2 border-[#f2a8c2] dark:border-[#855296] shadow-sm cursor-pointer animate-in fade-in duration-150"
        >
          <div className="flex items-start gap-2">
            <span className="text-xl shrink-0">{furnitureDialogue.icon}</span>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-black text-[#4a3550] dark:text-[#fdeeff] leading-tight">
                {furnitureDialogue.name}
              </p>
              <p className="text-[11px] font-semibold text-[#5f4763] dark:text-[#e3d2eb] mt-0.5 leading-snug">
                {furnitureDialogue.line}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Room Furniture & Decor Crafting */}
      <div className="p-3.5 storybook-card rounded-2xl space-y-2">
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-black text-xs uppercase tracking-wide text-[#c94a77] dark:text-[#ff9ec0]">
            Craft 3D Furniture ({coins} 🪙)
          </h3>
          <button
            onClick={() => setShowAllFurniture((v) => !v)}
            className="text-[11px] font-black text-[#7c5c75] dark:text-[#d8c7df] hover:text-[#ff7aa8] cursor-pointer"
          >
            {showAllFurniture ? 'Room Picks Only' : 'Show All Rooms'}
          </button>
        </div>

        <div className="grid grid-cols-1 xs:grid-cols-2 gap-2 max-h-[200px] overflow-y-auto pr-0.5">
          {catalogList.map((furn) => {
            const affordable = coins >= furn.cost;
            return (
              <button
                key={furn.id}
                onClick={() => handleAddDecoration(furn)}
                className={`p-2 rounded-xl border text-left flex items-center justify-between gap-1.5 transition-all cursor-pointer ${
                  affordable
                    ? 'storybook-well border-transparent hover:border-[#ff7aa8]'
                    : 'storybook-well border-transparent opacity-60'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-xl shrink-0">{furn.icon}</span>
                  <div className="min-w-0">
                    <p className="text-[11px] font-black text-[#4a3550] dark:text-[#fdeeff] truncate">
                      {furn.name}
                    </p>
                    <p className="text-[10px] font-bold text-[#c94a77] dark:text-[#ff9ec0] tabular-nums">
                      {furn.cost} 🪙
                    </p>
                  </div>
                </div>
                <span className="text-xs shrink-0 font-black">＋</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );

  const hamletPanel = (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-2xl storybook-card">
        <div>
          <h3 className="font-black text-sm text-[#4a3550] dark:text-[#fdeeff]">
            Mochi Hamlet · {hamletResidents.length} Neighbors Settled
          </h3>
          <p className="text-xs text-[#6d546e] dark:text-[#ceb7d4]">
            Invite befriended islanders to build cozy cottages and artisan stalls beside your yard.
          </p>
        </div>
      </div>

      <div className={`grid gap-2.5 ${inHouse3D ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2'}`}>
        {[
          { name: 'Pip', shop: 'Pip’s Floating Bakery', icon: '🧁', desc: 'Bakes fresh cloud muffins every morning' },
          { name: 'Captain Barnacle', shop: 'Driftwood Boatshop', icon: '⛵', desc: 'Tends lanterns and harbor breezes' },
          { name: 'Fennel', shop: 'Fennel’s Map Stall', icon: '🗺️', desc: 'Drafts enthusiastic treasure charts' },
          { name: 'Tidbit', shop: 'Tidbit’s Lantern Workshop', icon: '🏮', desc: 'Crafts colorful glowing evening lanterns' },
          { name: 'Gran Dumpling', shop: 'Soup Kitchen of Remembering', icon: '🍲', desc: 'Simmers warm memory broths' },
          { name: 'Bellamy', shop: 'Bellamy’s Chime Foundry', icon: '🔔', desc: 'Tunes golden bells for the Hamlet gate' },
        ].map((res) => {
          const isMovedIn = hamletResidents.some((h) => h.npcName === res.name);
          return (
            <div
              key={res.name}
              className="p-3.5 storybook-card rounded-2xl flex items-center justify-between gap-3"
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="w-11 h-11 rounded-2xl bg-[#fff4f8] dark:bg-[#3a2645] flex items-center justify-center text-2xl shrink-0">
                  {res.icon}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-black text-sm text-[#4a3550] dark:text-[#fdeeff] truncate">{res.name}</p>
                  <p className="text-[11px] text-[#c94a77] dark:text-[#ff9ec0] font-extrabold truncate">{res.shop}</p>
                  <p className="text-[11px] opacity-75 line-clamp-2">{res.desc}</p>
                </div>
              </div>
              <button
                onClick={() => onInviteToHamlet(res.name)}
                className={`min-h-[36px] px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                  isMovedIn
                    ? 'bg-[#5ab870] text-white'
                    : 'bg-[#ff7aa8] hover:brightness-105 text-white shadow-xs'
                }`}
              >
                {isMovedIn ? 'Moved In ✓' : 'Invite'}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );

  // Side-Drawer UI when standing inside the live 3D House so player sees their 3D rooms updating in real time
  if (inHouse3D) {
    return (
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-[430px] p-2 sm:p-3 pointer-events-auto select-none flex flex-col animate-in fade-in slide-in-from-right-4 duration-200">
        <div className="flex-1 min-h-0 storybook-modal rounded-2xl sm:rounded-3xl p-3 sm:p-4 flex flex-col gap-2.5 shadow-2xl border-2 border-[#f2c4d7] dark:border-[#6a447c] overflow-hidden">
          <div className="flex items-center justify-between gap-2 border-b border-[#f0c7d8]/80 dark:border-[#5b3b6b]/80 pb-2 shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-[#ffe6f0] dark:bg-[#492c56] border border-[#f5bfd6] dark:border-[#6a447c] flex items-center justify-center text-xl shrink-0">
                🏡
              </div>
              <div className="min-w-0">
                <h2 className="text-sm font-black text-[#4a3550] dark:text-[#fdeeff] leading-tight truncate">
                  Home Architect &amp; Hamlet
                </h2>
                <p className="text-[10px] font-bold text-[#7c5c75] dark:text-[#d5bddb] truncate tabular-nums">
                  {ROOM_META[activeTab].label} · ⚡ {Math.round(stamina)}% · ✨ {Math.round(mana)}% · 🪙 {coins}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              aria-label="Close decorator"
              className="w-8 h-8 rounded-full storybook-card hover:bg-[#ff7aa8] hover:text-white text-[#4a3550] dark:text-[#fdeeff] font-black text-sm flex items-center justify-center cursor-pointer shrink-0"
            >
              ✕
            </button>
          </div>

          <div className="flex storybook-well p-1 rounded-xl gap-1 overflow-x-auto scrollbar-none shrink-0">
            {(Object.keys(ROOM_META) as TabKey[]).map((key) => {
              const meta = ROOM_META[key];
              const active = activeTab === key;
              return (
                <button
                  key={key}
                  onClick={() => handleTabSwitch(key)}
                  className={`min-w-fit min-h-[34px] py-1 px-2.5 rounded-lg text-[11px] font-black transition-all cursor-pointer whitespace-nowrap shrink-0 flex items-center gap-1 ${
                    active
                      ? 'bg-[#ff7aa8] text-white shadow-xs'
                      : 'text-[#5a425f] dark:text-[#d8c7df] hover:bg-white/60 dark:hover:bg-black/25'
                  }`}
                >
                  <span>{meta.icon}</span>
                  <span>{meta.shortLabel}</span>
                </button>
              );
            })}
          </div>

          {feedback && (
            <div className="px-3 py-1.5 bg-[#fff2cc] dark:bg-[#493822] border border-[#ffd23f] rounded-xl text-center text-xs font-black text-[#4a3550] dark:text-[#fff2c2] shrink-0">
              {feedback}
            </div>
          )}

          <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain pr-1">
            {activeTab === 'hamlet' ? hamletPanel : controlsPanel}
          </div>

          <div className="pt-2 border-t border-[#f0c7d8]/80 dark:border-[#5b3b6b]/80 flex items-center justify-between gap-2 shrink-0">
            {onStepOutside && (
              <button
                onClick={() => {
                  onStepOutside();
                  onClose();
                }}
                className="min-h-[36px] px-3 py-1.5 rounded-xl storybook-card hover:border-[#ff7aa8] text-xs font-black text-[#4a3550] dark:text-[#fdeeff] cursor-pointer"
              >
                🚪 Step Outside
              </button>
            )}
            <button
              onClick={onClose}
              className="ml-auto min-h-[36px] px-4 py-1.5 rounded-xl bg-linear-to-r from-[#ff7aa8] to-[#f46496] hover:brightness-105 text-white font-black text-xs shadow-xs cursor-pointer"
            >
              Walk Around 3D Room
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Full Centered Modal with Real Interactive Three.js 3D Architectural Preview
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-modal-safe bg-[#160f24]/92 pointer-events-auto select-none animate-in fade-in duration-200">
      <div className="w-full max-w-5xl storybook-modal rounded-2xl sm:rounded-3xl p-3 sm:p-5 flex flex-col gap-2.5 sm:gap-3 max-h-[94dvh] overflow-hidden">
        {/* Top Header */}
        <div className="flex items-center justify-between gap-2 sm:gap-3 border-b border-[#f0c7d8]/80 dark:border-[#5b3b6b]/80 pb-2 shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-[#ffe6f0] dark:bg-[#492c56] border border-[#f5bfd6] dark:border-[#6a447c] flex items-center justify-center text-xl sm:text-2xl shrink-0">
              🏡
            </div>
            <div className="min-w-0">
              <h2 className="text-sm xs:text-base sm:text-xl font-black text-[#4a3550] dark:text-[#fdeeff] leading-tight truncate">
                {playerLook.name || 'Mochi'}&apos;s 3D Home &amp; Hamlet
              </h2>
              <p className="text-[10px] sm:text-xs font-bold text-[#7c5c75] dark:text-[#d5bddb] truncate tabular-nums">
                {ROOM_META[activeTab].roleTitle} · ⚡ {Math.round(stamina)}% · ✨ {Math.round(mana)}% · 🪙 {coins} Coins
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {onEnterHouse3D && (
              <button
                onClick={() => {
                  onEnterHouse3D();
                  onClose();
                }}
                title="Walk inside the full 3D house"
                className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 min-h-[36px] rounded-xl bg-linear-to-r from-[#ff7aa8] to-[#f46496] text-white text-xs font-black cursor-pointer whitespace-nowrap shadow-xs hover:brightness-105"
              >
                <span>🚶</span>
                <span className="hidden sm:inline">Walk Inside 3D</span>
              </button>
            )}
            {onStepOutside && (
              <button
                onClick={() => {
                  onStepOutside();
                  onClose();
                }}
                title="Teleport to Front Porch"
                className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 min-h-[36px] rounded-xl storybook-card hover:border-[#ff7aa8] text-xs font-black text-[#4a3550] dark:text-[#fdeeff] cursor-pointer whitespace-nowrap transition-colors"
              >
                <span>🚪</span>
                <span className="hidden sm:inline">Front Porch</span>
              </button>
            )}
            <button
              onClick={onClose}
              aria-label="Close house"
              className="w-9 h-9 rounded-full storybook-card hover:bg-[#ff7aa8] hover:text-white text-[#4a3550] dark:text-[#fdeeff] font-black text-sm flex items-center justify-center transition-all cursor-pointer shrink-0"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Single-Line Room Navigation */}
        <div className="flex storybook-well p-1 rounded-xl sm:rounded-2xl gap-1 overflow-x-auto scrollbar-none shrink-0">
          {(Object.keys(ROOM_META) as TabKey[]).map((key) => {
            const meta = ROOM_META[key];
            const active = activeTab === key;
            return (
              <button
                key={key}
                onClick={() => handleTabSwitch(key)}
                className={`flex-1 min-w-fit min-h-[38px] py-1.5 px-3 rounded-lg sm:rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap shrink-0 flex items-center justify-center gap-1.5 ${
                  active
                    ? 'bg-[#ff7aa8] text-white shadow-xs'
                    : 'text-[#5a425f] dark:text-[#d8c7df] hover:bg-white/60 dark:hover:bg-black/25'
                }`}
              >
                <span>{meta.icon}</span>
                <span>{meta.shortLabel}</span>
              </button>
            );
          })}
        </div>

        {/* Live Feedback Strip */}
        {feedback && (
          <div className="px-3 py-1.5 bg-[#fff2cc] dark:bg-[#493822] border border-[#ffd23f] rounded-xl text-center text-xs font-black text-[#4a3550] dark:text-[#fff2c2] shrink-0 animate-in fade-in">
            {feedback}
          </div>
        )}

        {/* Body */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain pr-1">
          {activeTab === 'hamlet' ? (
            hamletPanel
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-start">
              {/* Left: Real Interactive 3D Room Stage */}
              <div className="lg:col-span-7 space-y-2">
                <RoomInterior3DCanvas
                  activeRoom={activeRoomId}
                  cottage={cottage}
                  playerLook={playerLook}
                  weatherId={activeWeather.id}
                  aquariumFishList={aquariumFishList}
                  roomDecorations={roomDecorations}
                  isArrangeMode={isArrangeMode}
                  movingDecoId={movingDecoId}
                  activeEffect={activeEffect}
                  onPlaceMovingAt={handlePlaceMovingAt}
                  onSelectDecoration={handleInteractDecoration}
                  onMoveDecorationStart={(id) => {
                    setIsArrangeMode(true);
                    setMovingDecoId(movingDecoId === id ? null : id);
                    setFurnitureDialogue(null);
                  }}
                  onRemoveDecoration={handleRemoveDecoration}
                />

                <div className="flex flex-wrap items-center justify-between gap-2 px-1">
                  <p className="text-[11px] font-bold text-[#7c5c75] dark:text-[#d5bddb] flex-1 min-w-[200px]">
                    {ROOM_META[activeRoomId].subtitle} · {isArrangeMode ? 'Click ✥ on an item, then tap the 3D floor to place it.' : 'Drag to orbit 3D view or click items to interact.'}
                  </p>
                  <button
                    onClick={() => {
                      const next = !isArrangeMode;
                      setIsArrangeMode(next);
                      if (!next) setMovingDecoId(null);
                      audio.pop();
                    }}
                    className={`min-h-[32px] px-2.5 py-1 rounded-xl text-[11px] font-black cursor-pointer whitespace-nowrap shrink-0 transition-colors ${
                      isArrangeMode
                        ? 'bg-[#ffd23f] text-[#4a3550] shadow-xs'
                        : 'storybook-card hover:border-[#ff7aa8] text-[#4a3550] dark:text-[#fdeeff]'
                    }`}
                  >
                    {isArrangeMode ? '✓ Done Arranging' : '✥ Arrange 3D Room'}
                  </button>
                </div>
              </div>

              {/* Right: Room Controls & 3D Decor Catalog */}
              <div className="lg:col-span-5">{controlsPanel}</div>
            </div>
          )}
        </div>

        {/* Clean Unboxed Footer */}
        <div className="pt-2 border-t border-[#f0c7d8]/80 dark:border-[#5b3b6b]/80 flex items-center justify-end sm:justify-between gap-3 text-xs shrink-0">
          <span className="hidden sm:inline text-[11px] opacity-75 font-bold truncate">
            Your 6-room 3D Mochi House on Lantern Isle · Walk up to the front door or press H anytime
          </span>
          <button
            onClick={onClose}
            className="w-full sm:w-auto min-h-[38px] px-4 py-1.5 rounded-xl bg-linear-to-r from-[#ff7aa8] to-[#f46496] hover:brightness-105 text-white font-black text-xs shadow-xs transition-transform active:scale-95 cursor-pointer whitespace-nowrap shrink-0"
          >
            Back to Archipelago
          </button>
        </div>
      </div>
    </div>
  );
};
