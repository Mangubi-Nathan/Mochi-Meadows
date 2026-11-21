/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  N,
  T,
  BIOME_NAMES,
  BIOME_COLORS,
  PlayerLook,
  Quest,
  NPC,
  LoreEntry,
  Town,
  StarGem,
  Pearl,
  Feather,
  Ring,
  FishAmbient,
  QuestItem,
  BloomEffect,
  MagicRing,
  Particle,
  hash,
  vn,
  fbm,
} from './game/engine';
import {
  ORIGINAL_ISLANDERS,
  SKY_COURT,
  TOWN_RESIDENTS,
  INITIAL_QUESTS,
  VERSES_OF_THE_LULLABY,
  CUTSCENE_MOVIES,
  ALL_CHARACTERS_MM2,
  TOWNS_DATA_MM2,
  VERSES_OF_REVEILLE,
  UNSUNG_VERSE,
  MOON_DIARY_PAGES,
  MEMORY_ECHOES,
  STORY_CHAPTERS,
} from './game/worldData';
import { drawMochi, drawCompanion } from './game/characterRenderer';
import { audio } from './game/audio';
import { Hud } from './components/Hud';
import { DialogModal } from './components/DialogModal';
import { JournalModal } from './components/JournalModal';
import { WardrobeModal } from './components/WardrobeModal';
import { PauseMenuModal } from './components/PauseMenuModal';
import { BottleModal } from './components/BottleModal';
import { GazetteModal } from './components/GazetteModal';
import { CutsceneOverlay } from './components/CutsceneOverlay';
import { TitleScreen } from './components/TitleScreen';
import { FishingMinigame } from './components/FishingMinigame';
import { SongWeaverModal } from './components/SongWeaverModal';
import { CottageModal } from './components/CottageModal';
import { CutsceneSlide } from './game/cutscenes';
import { WeatherSystem } from './game/weather';
import { ACHIEVEMENTS, WeatherConfig, WeatherId, MAGIC_SPELLS, SPELL_HARMONIES, MUSIC_TRACKS } from './game/constants';
import { updateNPCWeatherBehavior, getNPCWeatherChatter } from './game/npcWeatherBehavior';
import { useDeviceProfile } from './game/useDeviceProfile';
import { TouchControls } from './components/TouchControls';
import { WorldMapModal } from './components/WorldMapModal';
import { TeleportModal } from './components/TeleportModal';
import { CottageState, HamletResident, HollowCreature } from './game/engine';
import {
  GazetteLibraryItem,
  getCurrentEditionSlot,
  getLastSeenGazetteSlot,
  loadGazetteLibrary,
  markGazetteSlotSeen,
  saveGazetteLibrary,
} from './game/gazetteData';
import {
  RealmCollectible,
  renderLayerBackdrop,
  renderLayerAtmosphereOverlay,
  renderTerrainLayer,
  renderSkyTerrain,
  renderReefTerrain,
  renderGlowdeepTerrain,
  renderMoonRoadTerrain,
  collectSurfacePropDrawables,
  collectSkyPropDrawables,
  collectReefPropDrawables,
  collectGlowdeepPropDrawables,
  collectMoonRoadPropDrawables,
  collectGroundPortalDrawables,
  renderCollectibles,
  renderGreatLanternTree,
  renderPlayerMochiHouse,
  renderAmbientWorldMotes,
  renderWorldLightingAndAtmosphere,
  YSortableItem,
} from './game/worldRenderer';
import {
  GLOWDEEP_SPAWN_TILE,
  GLOWDEEP_RETURN_TILE,
  MOONROAD_SPAWN_TILE,
  MOONROAD_RETURN_TILE,
  getGlowdeepCell,
  getMoonRoadCell,
  isGlowdeepWalkable,
  isMoonRoadWalkable,
} from './game/realmCells';
import { syncAllOfflineQueues, warmOfflineBundle } from './game/offlineStore';

const LOCAL_STORAGE_SAVE_PREFIX = 'mochi-meadows-v2-slot-';
const LOCAL_STORAGE_SAVE_KEY = 'mochi-meadows-v2-slot-1';
const LOCAL_STORAGE_ACTIVE_SLOT_KEY = 'mochi-meadows-active-slot';
const LOCAL_STORAGE_LEGACY_SAVE = 'mochi-meadows-v1-save';
const LOCAL_STORAGE_SETTINGS_KEY = 'mochi-meadows-v2-settings';

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const minimapRef = useRef<HTMLCanvasElement | null>(null);
  const device = useDeviceProfile();
  const deviceRef = useRef(device);
  deviceRef.current = device;

  // Save Slot State (persisted across reloads)
  const [currentSlot, setCurrentSlot] = useState<number>(() => {
    try {
      const saved = Number(localStorage.getItem(LOCAL_STORAGE_ACTIVE_SLOT_KEY));
      if (saved === 1 || saved === 2 || saved === 3) return saved;
    } catch {}
    return 1;
  });
  const currentSlotRef = useRef(currentSlot);
  currentSlotRef.current = currentSlot;

  // Game UI States
  const [gameState, setGameState] = useState<'title' | 'playing'>('title');
  const [activeModal, setActiveModal] = useState<
    'none' | 'dialog' | 'journal' | 'wardrobe' | 'pause' | 'bottles' | 'gazette' | 'fishing' | 'map' | 'songweaver' | 'cottage' | 'teleport'
  >('none');
  const [activeCutscene, setActiveCutscene] = useState<CutsceneSlide[] | null>(null);
  const [pauseInitialTab, setPauseInitialTab] = useState<'menu' | 'progress' | 'settings' | 'cloud' | 'help'>('menu');
  const [selectedSpellIdx, setSelectedSpellIdx] = useState(0);

  // Last cast spell for combination harmonies & always-fresh cast ref for keyboard listeners
  const lastCastSpellRef = useRef<{ id: string; time: number } | null>(null);
  const castSpellFnRef = useRef<(idx: number) => void>(() => {});
  const portalInteractFnRef = useRef<() => void>(() => {});

  // Cottage & Hamlet State
  const [cottageState, setCottageState] = useState<CottageState>({
    decorationsPlaced: [
      { id: 'f-1', x: 24, y: 74, name: 'Cloud Cushion', icon: '☁️', room: 'living' },
      { id: 'f-2', x: 76, y: 72, name: 'Amber Lantern', icon: '🏮', room: 'living' },
      { id: 'f-3', x: 52, y: 80, name: 'Braided Rug', icon: '🧶', room: 'living' },
      { id: 'f-4', x: 26, y: 66, name: 'Porcelain Tea Set', icon: '🫖', room: 'kitchen' },
      { id: 'f-5', x: 30, y: 74, name: 'Cherry Bonsai', icon: '🌸', room: 'conservatory' },
    ],
    gardenPlots: [
      { seedType: 'Sunny Daisy', stage: 3, plantedAt: Date.now() - 100000 },
      { seedType: 'Glowcap Lantern', stage: 2, plantedAt: Date.now() - 50000 },
    ],
    aquariumFish: ['Star Tetra', 'Moon Guppy', 'Prism Ray'],
    musicBoxSong: [60, 64, 67, 69, 72, 67, 64, 60],
    weatherWindow: 'sunny',
    fireplaceLit: true,
    lampOn: true,
    tubFilled: true,
    ovenWarm: false,
  });
  const cottageStateRef = useRef(cottageState);
  cottageStateRef.current = cottageState;

  const [hamletResidents, setHamletResidents] = useState<HamletResident[]>([
    { npcName: 'Pip', houseX: 128, houseY: 130, dialogue: 'I love waking up next to the muffin oven!' },
    { npcName: 'Captain Barnacle', houseX: 135, houseY: 142, dialogue: 'Ahoy! Me hamlet cottage is shipwreck-free!' },
  ]);
  const hamletResidentsRef = useRef(hamletResidents);
  hamletResidentsRef.current = hamletResidents;

  // Player State
  const [playerLook, setPlayerLook] = useState<PlayerLook>({
    sp: 'cat',
    col: '#ffb3c7',
    c2: '',
    ac: '#ff7aa8',
    hat: 'bow',
    eyes: 0,
    mouth: 0,
    pat: 0,
    out: 0,
    face: 0,
    aura: 0,
    companion: 'gloom',
    name: 'Mochi',
  });
  const playerLookRef = useRef<PlayerLook>(playerLook);
  playerLookRef.current = playerLook;
  const activeModalRef = useRef(activeModal);
  activeModalRef.current = activeModal;
  const activeCutsceneRef = useRef(activeCutscene);
  activeCutsceneRef.current = activeCutscene;
  const gameStateRef = useRef(gameState);
  gameStateRef.current = gameState;

  const [playerPos, setPlayerPos] = useState({
    x: 0,
    y: 0,
    sky: false,
    dive: false,
    glowdeep: false,
    moonroad: false,
  });
  const [stamina, setStamina] = useState(100);
  const [air, setAir] = useState(100);
  const [mana, setMana] = useState(100);
  const [coins, setCoins] = useState(0);
  const [totalCoins, setTotalCoins] = useState(0);
  const [currentChapter, setCurrentChapter] = useState(1);
  const [lullabyDone, setLullabyDone] = useState(false);
  const [skyStoryDone, setSkyStoryDone] = useState(false);
  const [skyArrived, setSkyArrived] = useState(false);
  const [visitedGlowdeep, setVisitedGlowdeep] = useState(false);
  const [visitedMoonRoad, setVisitedMoonRoad] = useState(false);
  const coinsRef = useRef(coins);
  coinsRef.current = coins;
  const totalCoinsRef = useRef(totalCoins);
  totalCoinsRef.current = totalCoins;
  const currentChapterRef = useRef(currentChapter);
  currentChapterRef.current = currentChapter;
  const lullabyDoneRef = useRef(lullabyDone);
  lullabyDoneRef.current = lullabyDone;
  const skyStoryDoneRef = useRef(skyStoryDone);
  skyStoryDoneRef.current = skyStoryDone;
  const skyArrivedRef = useRef(skyArrived);
  skyArrivedRef.current = skyArrived;
  const visitedGlowdeepRef = useRef(visitedGlowdeep);
  visitedGlowdeepRef.current = visitedGlowdeep;
  const visitedMoonRoadRef = useRef(visitedMoonRoad);
  visitedMoonRoadRef.current = visitedMoonRoad;

  // Upgrades & Progress
  const [upgrades, setUpgrades] = useState<Record<string, number>>({});
  const [unlockedAchievements, setUnlockedAchievements] = useState<string[]>([]);
  const [unlockedCutscenes, setUnlockedCutscenes] = useState<string[]>([]);
  const [loreEntries, setLoreEntries] = useState<LoreEntry[]>([]);
  const [fishLog, setFishLog] = useState<Record<string, number>>({});
  const upgradesRef = useRef(upgrades);
  upgradesRef.current = upgrades;
  const unlockedAchievementsRef = useRef(unlockedAchievements);
  unlockedAchievementsRef.current = unlockedAchievements;
  const unlockedCutscenesRef = useRef(unlockedCutscenes);
  unlockedCutscenesRef.current = unlockedCutscenes;
  const loreEntriesRef = useRef(loreEntries);
  loreEntriesRef.current = loreEntries;
  const fishLogRef = useRef(fishLog);
  fishLogRef.current = fishLog;
  const triggeredHarmoniesRef = useRef<Set<string>>(new Set());

  const [gazetteLibrary, setGazetteLibrary] = useState<GazetteLibraryItem[]>(() => loadGazetteLibrary());
  const [hasNewGazette, setHasNewGazette] = useState<boolean>(() => {
    const lastSeen = getLastSeenGazetteSlot();
    return lastSeen === null || lastSeen < getCurrentEditionSlot();
  });
  useEffect(() => {
    const timer = window.setInterval(() => {
      if (activeModalRef.current === 'gazette') return;
      const lastSeen = getLastSeenGazetteSlot();
      const unread = lastSeen === null || lastSeen < getCurrentEditionSlot();
      setHasNewGazette((prev) => (prev === unread ? prev : unread));
    }, 5000);
    return () => window.clearInterval(timer);
  }, []);
  const [currentBiomeName, setCurrentBiomeName] = useState('Sunny Meadow');
  const [activeNpc, setActiveNpc] = useState<NPC | null>(null);
  const activeNpcRef = useRef<NPC | null>(null);
  activeNpcRef.current = activeNpc;

  // Stable function refs & HUD/minimap diff caches
  const dashFnRef = useRef<() => void>(() => {});
  const diveFnRef = useRef<() => void>(() => {});
  const canFishFnRef = useRef<() => boolean>(() => false);
  const cycleMusicFnRef = useRef<() => void>(() => {});
  const saveGameFnRef = useRef<(showNotification?: boolean) => void>(() => {});
  const evalStoryFnRef = useRef<() => void>(() => {});
  const checkAchFnRef = useRef<() => void>(() => {});
  const hudSyncRef = useRef({
    st: 100,
    o2: 100,
    mp: 100,
    biome: 'Sunny Meadow',
    npc: null as NPC | null,
    pxQuant: -999,
    pyQuant: -999,
    layerKey: '',
    lastMinimapMs: 0,
    lastModalDrawMs: 0,
  });
  const minimapCacheRef = useRef<{ layer: string; canvas: HTMLCanvasElement } | null>(null);

  // Settings
  const [settings, setSettings] = useState({
    vol: 0.8,
    low: 0,
    night: 1,
    auto: 1,
    hints: 1,
  });
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  // Track & Music
  const [currentTrackIdx, setCurrentTrackIdx] = useState(0);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimerRef = useRef<number | null>(null);

  // Weather System
  const weatherRef = useRef<WeatherSystem>(new WeatherSystem());
  const [currentWeather, setCurrentWeather] = useState<WeatherConfig>(weatherRef.current.currentWeather);

  // References to game world data
  const worldRef = useRef<{
    B: Uint8Array;
    DK: Uint8Array;
    UD: Uint8Array;
    TW: Uint8Array;
    SB: Uint8Array;
    SD: Uint8Array;
    stars: StarGem[];
    pearls: Pearl[];
    feathers: Feather[];
    rings: Ring[];
    glowSpores: RealmCollectible[];
    moonNotes: RealmCollectible[];
    glowdeepPortal?: { x: number; y: number; open: boolean };
    moonGatePortal?: { x: number; y: number; open: boolean };
    playerHomePortal?: { x: number; y: number; doorX: number; doorY: number };
    fish: FishAmbient[];
    towns: Town[];
    npcs: NPC[];
    hollows: HollowCreature[];
    quests: Quest[];
    questItems: QuestItem[];
    particles: Particle[];
    iceMap: Map<number, number>;
    blooms: BloomEffect[];
    magicRings: MagicRing[];
    exploredMask: Uint8Array;
    starSenseTimer: number;
    moonPullTimer: number;
    warmthTimer: number;
    tideTimer: number;
    echoTimer: number;
    dreamwalkTimer: number;
    dawnTimer: number;
    frostShieldTimer: number;
    bloomStepTimer: number;
    hugTimer: number;
    bloomStepCooldown: number;
    shakenTiles: Set<number>;
    discoveredEchoIds: Set<string>;
    discoveredDiaryPages: Set<number>;
    worldPopups: { x: number; y: number; text: string; color: string; age: number; maxAge: number }[];
    dashGhosts: { x: number; y: number; face: number; alpha: number }[];
    footstepTimer: number;
    camera: { x: number; y: number; initialized: boolean };
    realmFlash: { alpha: number; color: string };
    magicCooldown: number;
    time: number;
    lastSaveTime: number;
    player: {
      x: number;
      y: number;
      vx: number;
      vy: number;
      dx: number;
      dy: number;
      face: number;
      st: number;
      o2: number;
      mp: number;
      dash: number;
      cd: number;
      sky: boolean;
      dive: boolean;
      glowdeep: boolean;
      moonroad: boolean;
      isMoving: boolean;
      moveTarget: { x: number; y: number } | null;
    };
    companionPos: { x: number; y: number };
    keys: Set<string>;
    touchJoystick: { active: boolean; startX: number; startY: number; curX: number; curY: number };
  }>({
    B: new Uint8Array(N * N),
    DK: new Uint8Array(N * N),
    UD: new Uint8Array(N * N),
    TW: new Uint8Array(N * N),
    SB: new Uint8Array(N * N),
    SD: new Uint8Array(N * N),
    stars: [],
    pearls: [],
    feathers: [],
    rings: [],
    glowSpores: [],
    moonNotes: [],
    fish: [],
    towns: [],
    npcs: [],
    hollows: [],
    quests: [],
    questItems: [],
    particles: [],
    iceMap: new Map(),
    blooms: [],
    magicRings: [],
    exploredMask: new Uint8Array(N * N),
    starSenseTimer: 0,
    moonPullTimer: 0,
    warmthTimer: 0,
    tideTimer: 0,
    echoTimer: 0,
    dreamwalkTimer: 0,
    dawnTimer: 0,
    frostShieldTimer: 0,
    bloomStepTimer: 0,
    hugTimer: 0,
    bloomStepCooldown: 0,
    shakenTiles: new Set(),
    discoveredEchoIds: new Set(),
    discoveredDiaryPages: new Set(),
    worldPopups: [],
    dashGhosts: [],
    footstepTimer: 0,
    camera: { x: 0, y: 0, initialized: false },
    realmFlash: { alpha: 0, color: '#ffffff' },
    magicCooldown: 0,
    time: 0,
    lastSaveTime: 0,
    player: {
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      dx: 0,
      dy: 1,
      face: 1,
      st: 100,
      o2: 100,
      mp: 100,
      dash: 0,
      cd: 0,
      sky: false,
      dive: false,
      glowdeep: false,
      moonroad: false,
      isMoving: false,
      moveTarget: null,
    },
    companionPos: { x: 0, y: 0 },
    keys: new Set(),
    touchJoystick: { active: false, startX: 0, startY: 0, curX: 0, curY: 0 },
  });

  const showToast = useCallback((msg: string) => {
    if (toastTimerRef.current !== null) {
      window.clearTimeout(toastTimerRef.current);
    }
    setToastMessage(msg);
    toastTimerRef.current = window.setTimeout(() => {
      toastTimerRef.current = null;
      setToastMessage(null);
    }, 2500);
  }, []);

  const spawnWorldPopup = useCallback(
    (x: number, y: number, text: string, color: string = '#fff7d6', maxAge: number = 1.05) => {
      const popups = worldRef.current.worldPopups;
      popups.push({ x, y, text, color, age: 0, maxAge });
      if (popups.length > 24) popups.shift();
    },
    []
  );

  const triggerRealmFlash = useCallback((color: string = '#ffffff', alpha: number = 0.36) => {
    worldRef.current.realmFlash = { color, alpha };
  }, []);

  const snapCamera = useCallback(() => {
    const W = worldRef.current;
    W.camera.x = W.player.x;
    W.camera.y = W.player.y;
    W.camera.initialized = true;
  }, []);

  // Listen to Weather System changes
  useEffect(() => {
    weatherRef.current.onWeatherChanged = (newWeather) => {
      setCurrentWeather(newWeather);
      showToast(newWeather.ambientMessage);

      // Trigger unique NPC reaction bubbles & behavior shift across the world
      const npcs = worldRef.current.npcs;
      npcs.forEach((npc) => {
        if (!npc.tree) {
          npc.say = getNPCWeatherChatter(npc, newWeather.id);
          npc.sayT = 6.0;
          npc.wt = 0; // Immediately re-evaluate movement behavior
        }
      });
    };
  }, [showToast]);

  // Automatic Offline Parity & Sync Manager
  useEffect(() => {
    if (typeof navigator !== 'undefined' && navigator.onLine) {
      syncAllOfflineQueues().catch(() => {});
    }

    const handleOnline = async () => {
      warmOfflineBundle().catch(() => {});
      try {
        const { bottlesSynced, savesSynced } = await syncAllOfflineQueues();
        const total = bottlesSynced + savesSynced;
        if (gameStateRef.current === 'playing') {
          if (total > 0) {
            showToast(`☀️ Back Online — Synced ${total} offline update${total === 1 ? '' : 's'} to Cloud!`);
          } else {
            showToast('☀️ Back Online — Cloud Vault & Sky Bottles connected!');
          }
        }
      } catch {
        // Ignore transient network errors
      }
    };

    const handleOffline = () => {
      if (gameStateRef.current === 'playing') {
        showToast('🌙 Offline Mode — Full archipelago, music & saves ready!');
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [showToast]);

  // Initialize World Generation
  useEffect(() => {
    const W = worldRef.current;
    const SOL = [0, 0, 1, 0, 1, 1, 1, 1, 0, 0, 1, 0, 0, 1, 1, 1, 1, 1];

    const dec = (b: number, h: number) => {
      switch (b) {
        case 3:
          return h < 0.06 ? 1 : h < 0.14 ? 9 : 0;
        case 4:
          return h < 0.3 ? 2 : h < 0.36 ? 3 : h < 0.4 ? 1 : 0;
        case 5:
          return h < 0.2 ? 4 : h < 0.4 ? 1 : 0;
        case 6:
          return h < 0.05 ? 5 : h < 0.08 ? 6 : 0;
        case 7:
          return h < 0.15 ? 7 : h < 0.18 ? 6 : 0;
        case 8:
          return h < 0.25 ? 6 : 0;
        case 2:
          return h < 0.03 ? 8 : 0;
      }
      return 0;
    };

    // 1. Surface Island Generation
    for (let y = 0; y < N; y++) {
      for (let x = 0; x < N; x++) {
        const dx = (x / N) * 2 - 1;
        const dy = (y / N) * 2 - 1;
        const d = Math.hypot(dx, dy);
        const e = fbm(x * 0.03, y * 0.03, 1) * 1.2 - Math.pow(d, 2.4) * 0.6 + 0.14;
        const t = fbm(x * 0.025, y * 0.025, 2) * 0.5 + (y / N) * 0.5;
        const m = fbm(x * 0.04, y * 0.04, 3);
        const z = fbm(x * 0.06, y * 0.06, 4);

        let b = 3;
        if (e < 0.3) b = 0;
        else if (e < 0.37) b = 1;
        else if (e < 0.41) b = 2;
        else if (e > 0.84) b = 8;
        else if (t < 0.36) b = 7;
        else if (t > 0.6 && m < 0.5) b = 6;
        else if (m > 0.56) b = 4;
        else if (z > 0.6) b = 5;

        W.B[y * N + x] = b;
        W.DK[y * N + x] = dec(b, hash(x, y, 9));

        if (b >= 2 && !W.DK[y * N + x] && hash(x, y, 5) < 0.0045) {
          W.stars.push({ x: x * T + T / 2, y: y * T + T / 2, got: 0 });
        }
      }
    }

    // 2. Underwater Layer
    const fishColors = ['#ff9f43', '#ffd23f', '#ff7aa8', '#7de0ff', '#b69cff'];
    for (let y = 1; y < N - 1; y++) {
      for (let x = 1; x < N - 1; x++) {
        const i = y * N + x;
        const b = W.B[i];
        if (b > 1) continue;
        const h = hash(x, y, 21);
        W.UD[i] = b
          ? h < 0.1
            ? 1
            : h < 0.18
            ? 2
            : h < 0.21
            ? 3
            : h < 0.24
            ? 4
            : 0
          : h < 0.07
          ? 2
          : h < 0.13
          ? 1
          : h < 0.15
          ? 4
          : h < 0.17
          ? 3
          : 0;

        if (!W.UD[i] && hash(x, y, 6) < (b ? 0.005 : 0.004)) {
          W.pearls.push({ x: x * T + T / 2, y: y * T + T / 2, got: 0 });
        }

        if (
          W.B[i - 1] < 2 &&
          W.B[i + 1] < 2 &&
          W.B[i - N] < 2 &&
          W.B[i + N] < 2 &&
          hash(x, y, 7) < 0.004
        ) {
          W.fish.push({
            hx: x * T + T / 2,
            hy: y * T + T / 2,
            s: 0.6 + hash(x, y, 8),
            ph: hash(x, y, 12) * 6.3,
            R: 14 + hash(x, y, 13) * 14,
            c: fishColors[(hash(x, y, 14) * 5) | 0],
          });
        }
      }
    }

    // 3. Towns Generation
    const house = (a: Uint8Array, x: number, y: number, c: number, f: number) => {
      for (let dx = 0; dx < 3; dx++) {
        for (let dy = -1; dy < 1; dy++) {
          a[(y + dy) * N + x + dx] = f;
        }
      }
      a[y * N + x] = c;
    };

    const regOK = (cx: number, cy: number, f: (v: number) => boolean) => {
      for (let y = cy - 5; y <= cy + 5; y++) {
        for (let x = cx - 7; x <= cx + 7; x++) {
          if (!f(W.B[y * N + x])) return false;
        }
      }
      return true;
    };

    const townConfigs: [string, number, number][] = [
      ['Willowbrook', 3, 0],
      ['Mossgate', 4, 0],
      ['Oasis Rest', 6, 0],
      ['Frostholm', 7, 0],
      ['Driftwood Dock', 3, 1],
      ['Petal Hollow', 5, 0],
    ];

    townConfigs.forEach(([nm, bi, wt], k) => {
      const candidates: [number, number][] = [];
      for (let y = 8; y < N - 8; y += 2) {
        for (let x = 10; x < N - 10; x += 2) {
          if (
            W.B[y * N + x] !== bi ||
            W.towns.some((t) => Math.hypot(t.x - x, t.y - y) < 30)
          )
            continue;
          if (wt) {
            let hasWater = false;
            for (let dy = -14; dy <= 14 && !hasWater; dy += 2) {
              for (let dx = -14; dx <= 14; dx += 2) {
                if (W.B[(y + dy) * N + x + dx] < 2) {
                  hasWater = true;
                  break;
                }
              }
            }
            if (!hasWater) continue;
          }
          if (regOK(x, y, (v) => v >= 2 && v !== 8)) {
            candidates.push([x, y]);
          }
        }
      }

      if (candidates.length) {
        const [x, y] = candidates[(hash(k, bi, 95) * candidates.length) | 0];
        W.towns.push({ n: nm, x, y, w: 0, vis: nm === 'Willowbrook' ? 1 : 0 });
        for (let j = y - 5; j <= y + 5; j++) {
          for (let i = x - 7; i <= x + 7; i++) {
            W.DK[j * N + i] = 0;
            W.TW[j * N + i] = j === y || i === x || Math.hypot(i - x, j - y) < 2.5 ? 2 : 1;
          }
        }
        [
          [-6, -2],
          [3, -2],
          [-6, 3],
          [3, 3],
        ].forEach(([a, b]) => house(W.DK, x + a, y + b, 10, 16));
        [
          [0, 0, 14],
          [-3, 0, 13],
          [2, 0, 13],
          [-1, -3, 11],
          [1, -3, 11],
          [-1, 3, 11],
          [1, 3, 11],
          [0, 4, 12],
        ].forEach(([a, b, t]) => {
          W.DK[(y + b) * N + x + a] = t;
        });
      }
    });

    // Pearl Reef (underwater town)
    const reefCandidates: [number, number][] = [];
    for (let y = 8; y < N - 8; y += 2) {
      for (let x = 10; x < N - 10; x += 2) {
        if (W.B[y * N + x] < 2 && regOK(x, y, (v) => v < 2)) {
          reefCandidates.push([x, y]);
        }
      }
    }
    if (reefCandidates.length) {
      const [x, y] = reefCandidates[(hash(3, 3, 96) * reefCandidates.length) | 0];
      W.towns.push({ n: 'Pearl Reef', x, y, w: 1, vis: 0 });
      for (let j = y - 5; j <= y + 5; j++) {
        for (let i = x - 7; i <= x + 7; i++) {
          W.UD[j * N + i] = 0;
        }
      }
      [
        [-6, -2],
        [3, -2],
        [-6, 3],
        [3, 3],
      ].forEach(([a, b]) => house(W.UD, x + a, y + b, 5, 6));
      [
        [-3, 0],
        [3, 0],
        [0, -3],
        [0, 3],
        [-3, -4],
        [3, 4],
      ].forEach(([a, b]) => {
        W.UD[(y + b) * N + x + a] = 7;
      });
    }

    // 4. Sky Kingdom Layer
    const KX = 136;
    const KY = 70;
    const skyIslands: { x: number; y: number; r: number; m?: number }[] = [
      { x: 88, y: 88, r: 13, m: 1 },
    ];
    for (let k = 0; k < 30; k++) {
      const x = 12 + hash(k, 1, 40) * (N - 24);
      const y = 12 + hash(k, 2, 40) * (N - 24);
      if (Math.hypot(x - KX, y - KY) > 32) {
        skyIslands.push({ x, y, r: 4 + hash(k, 3, 40) * 7 });
      }
    }

    for (let y = 1; y < N - 1; y++) {
      for (let x = 1; x < N - 1; x++) {
        const i = y * N + x;
        const d = Math.hypot(x - KX, y - KY);
        const noise = vn(x * 0.2, y * 0.2, 32);
        let t = 0;
        if (d < 17 * (0.8 + 0.4 * noise)) {
          t = d < 10 ? 2 : 1;
        } else {
          for (const s of skyIslands) {
            if (Math.hypot(x - s.x, y - s.y) < s.r * (0.7 + 0.6 * noise)) {
              const z = fbm(x * 0.08, y * 0.08, 33);
              t = s.m ? (Math.hypot(x - s.x, y - s.y) < 8 ? 2 : 1) : z > 0.62 ? 4 : z > 0.4 ? 1 : 3;
              break;
            }
          }
        }
        W.SB[i] = t;
        const h = hash(x, y, 34);
        if (t === 1) W.SD[i] = h < 0.07 ? 1 : h < 0.12 ? 3 : 0;
        if (t === 4) W.SD[i] = h < 0.1 ? 2 : 0;

        if ((t && !W.SD[i] && hash(x, y, 35) < 0.009) || (!t && hash(x, y, 36) < 0.0007)) {
          W.feathers.push({ x: x * T + T / 2, y: y * T + T / 2, got: 0 });
        }
      }
    }

    // Cirrus Castle & Nimbus Market
    for (let y = KY - 4; y <= KY - 3; y++) {
      for (let x = KX - 2; x <= KX + 2; x++) {
        W.SB[y * N + x] = 2;
        W.SD[y * N + x] = 9;
      }
    }
    W.towns.push({ n: 'Nimbus Market', x: 88, y: 88, w: 2, vis: 0 });
    W.towns.push({ n: 'Cirrus Castle', x: KX, y: KY, w: 2, vis: 0 });
    W.towns.push({ n: 'Rooted Rest', x: 130, y: 130, w: 3, vis: 0 });
    W.towns.push({ n: 'Moon’s Tea House', x: 130, y: 125, w: 4, vis: 0 });

    // Rainbow Speed Rings
    for (let k = 0; k < 14; k++) {
      const a = hash(k, 1, 97) * 6.28;
      const r = 8 + hash(k, 2, 97) * 58;
      W.rings.push({
        x: Math.max(6, Math.min(N - 6, KX + Math.cos(a) * r)) * T,
        y: Math.max(6, Math.min(N - 6, KY + Math.sin(a) * r)) * T,
        got: 0,
      });
    }

    // 5. Initial Player Spawn Location (near center in meadow)
    for (let r = 0; r < 90; r++) {
      for (let a = 0; a < 360; a += 15) {
        const x = Math.round(N / 2 + (Math.cos((a * Math.PI) / 180) * r));
        const y = Math.round(N / 2 + (Math.sin((a * Math.PI) / 180) * r));
        if (W.B[y * N + x] === 3 && !W.DK[y * N + x]) {
          W.player.x = x * T + T / 2;
          W.player.y = y * T + T / 2;
          W.companionPos.x = W.player.x - 26;
          W.companionPos.y = W.player.y + 4;
          break;
        }
      }
      if (W.player.x) break;
    }

    // 5b. Place Player's Bespoke Mochi House near spawn on clear Meadow ground
    {
      const spawnTx = Math.round((W.player.x - T / 2) / T);
      const spawnTy = Math.round((W.player.y - T / 2) / T);
      let homeTx = -1;
      let homeTy = -1;

      outerHome: for (let dist = 4; dist <= 16; dist++) {
        for (let a = 0; a < 360; a += 15) {
          const cx = Math.round(spawnTx + Math.cos((a * Math.PI) / 180) * dist);
          const cy = Math.round(spawnTy + Math.sin((a * Math.PI) / 180) * dist);
          if (cx < 4 || cy < 4 || cx >= N - 5 || cy >= N - 5) continue;
          let plotOk = true;
          for (let dy = -1; dy <= 2 && plotOk; dy++) {
            for (let dx = -2; dx <= 2; dx++) {
              const idx = (cy + dy) * N + (cx + dx);
              if (W.B[idx] < 2 || W.B[idx] === 8 || W.TW[idx] !== 0 || W.DK[idx] >= 10) {
                plotOk = false;
                break;
              }
            }
          }
          if (plotOk) {
            homeTx = cx;
            homeTy = cy;
            break outerHome;
          }
        }
      }

      if (homeTx !== -1 && homeTy !== -1) {
        // Clear small props around plot and lay cobblestone front stoop
        for (let dy = -1; dy <= 2; dy++) {
          for (let dx = -2; dx <= 2; dx++) {
            W.DK[(homeTy + dy) * N + (homeTx + dx)] = 0;
          }
        }
        // Solid wall footprint behind the front porch (rows -1..0, cols -1..1)
        for (let dy = -1; dy <= 0; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            W.DK[(homeTy + dy) * N + (homeTx + dx)] = 16;
          }
        }
        // Cobblestone stepping path leading up to front door
        W.TW[(homeTy + 1) * N + homeTx] = 2;
        W.TW[(homeTy + 2) * N + homeTx] = 2;
        W.playerHomePortal = {
          x: homeTx * T + T / 2,
          y: homeTy * T + T - 2,
          doorX: homeTx * T + T / 2,
          doorY: (homeTy + 1) * T + 12,
        };
      }
    }

    // 6. Spawn NPCs
    const npcsList: NPC[] = [];

    // Helper: pick an unobstructed ground tile matching preferred biomes (or nearest walkable tile to anchor)
    const groundChars = ALL_CHARACTERS_MM2.filter((c) => (c.layer ?? 0) === 0);
    const biomePreference: Record<string, { target: number[]; near?: { tx: number; ty: number } }> = {
      Pip: {
        target: [3, 5],
        near: { tx: Math.round(W.player.x / T), ty: Math.round(W.player.y / T) },
      },
      'Captain Barnacle': { target: [2, 3] },
      Gloom: { target: [3, 4] },
      Wick: {
        target: [3],
        near: { tx: Math.round(W.player.x / T), ty: Math.round(W.player.y / T) },
      },
      Bumble: { target: [5, 3] },
      Tidbit: { target: [2, 3] },
      Ember: { target: [6, 8, 3] },
      'Madame Mizzle': { target: [4, 3] },
      'Penny and Quill': { target: [7, 3] },
      Bellamy: { target: [4, 5, 3] },
      Aurelle: { target: [3, 5, 6, 2], near: { tx: 225, ty: 132 } },
      Waffles: { target: [2, 3] },
      Fennel: { target: [3, 4, 6] },
    };

    const usedGroundTiles = new Set<number>();
    groundChars.forEach((d, k) => {
      const pref = biomePreference[d.n] || { target: [d.bi <= 8 ? d.bi : 3, 3] };
      let chosenIdx = -1;

      if (pref.near) {
        let bestScore = 1e9;
        for (let i = 0; i < N * N; i++) {
          if (W.B[i] < 2 || W.DK[i] || W.TW[i] || usedGroundTiles.has(i)) continue;
          if (d.n === 'Pip' && W.B[i] !== 3) continue;
          const dist = Math.hypot((i % N) - pref.near.tx, ((i / N) | 0) - pref.near.ty);
          if (d.n === 'Pip' && dist < 3) continue;
          if (dist < bestScore) {
            bestScore = dist;
            chosenIdx = i;
          }
        }
      }

      if (chosenIdx === -1) {
        for (const targetB of pref.target) {
          const candidates: number[] = [];
          for (let i = 0; i < N * N; i++) {
            if (W.B[i] === targetB && !W.DK[i] && !W.TW[i] && !usedGroundTiles.has(i)) {
              candidates.push(i);
            }
          }
          if (candidates.length > 0) {
            chosenIdx = candidates[(hash(k, targetB + 11, 77) * candidates.length) | 0];
            break;
          }
        }
      }

      if (chosenIdx === -1) return;
      usedGroundTiles.add(chosenIdx);
      const x = (chosenIdx % N) * T + T / 2;
      const y = ((chosenIdx / N) | 0) * T + T / 2;
      npcsList.push({
        ...d,
        x,
        y,
        hx: x,
        hy: y,
        tx: x,
        ty: y,
        f: 1,
        ph: k * 1.7,
        h: d.t.map(() => 0),
        wt: Math.random() * 3,
        cool: Math.random() * 5,
        sayT: 0,
        wave: 0,
        mv: 0,
        go: 0,
        hist: [],
      });
    });

    // Lantern Tree at island heart + Physical Surface Portals to Glowdeep & Moon Road
    let bestTreeIdx = -1;
    let bestTreeDist = 1e9;
    for (let i = 0; i < N * N; i++) {
      if (W.B[i] === 3 && !W.DK[i] && !W.TW[i]) {
        const dist = Math.abs(Math.hypot((i % N) - N / 2, ((i / N) | 0) - N / 2) - 7);
        if (dist < bestTreeDist) {
          bestTreeDist = dist;
          bestTreeIdx = i;
        }
      }
    }
    if (bestTreeIdx !== -1) {
      const treeTx = bestTreeIdx % N;
      const treeTy = (bestTreeIdx / N) | 0;
      const x = treeTx * T + T / 2;
      const y = treeTy * T + T / 2;
      npcsList.push({
        n: 'Lantern Tree',
        tree: true,
        x,
        y,
        hx: x,
        hy: y,
        tx: x,
        ty: y,
        f: 1,
        ph: 0,
        met: true,
        sayT: 0,
        wave: 0,
        mv: 0,
        go: 0,
        wt: 1e9,
        cool: 1e9,
        hist: [],
        t: [],
        h: [],
        i: [],
        qp: [],
        e: '',
        bi: 3,
        sp: 'cat',
        col: '#ffffff',
        hat: 'none',
        r: 'The great glowing heart of the island awaiting the Dawn Duet',
        g: '',
      });

      // Keep Wick close to the Lantern Tree & Portals
      const wickNpc = npcsList.find((n) => n.n === 'Wick');
      if (wickNpc) {
        const wx = Math.min(N - 3, treeTx + 2) * T + T / 2;
        const wy = Math.min(N - 3, treeTy + 1) * T + T / 2;
        wickNpc.x = wx;
        wickNpc.y = wy;
        wickNpc.hx = wx;
        wickNpc.hy = wy;
        wickNpc.tx = wx;
        wickNpc.ty = wy;
      }

      // Anchor Glowdeep Root Arch & Moon Road Silver Gate right beside the Lantern Tree
      const findPortalTile = (targetX: number, targetY: number, avoidIdx: number): [number, number] => {
        let bestX = Math.max(2, Math.min(N - 3, targetX));
        let bestY = Math.max(2, Math.min(N - 3, targetY));
        let bestD = 1e9;
        for (let py = targetY - 4; py <= targetY + 4; py++) {
          for (let px = targetX - 4; px <= targetX + 4; px++) {
            if (px < 2 || py < 2 || px >= N - 2 || py >= N - 2) continue;
            const pidx = py * N + px;
            if (pidx === bestTreeIdx || pidx === avoidIdx) continue;
            if (W.B[pidx] >= 2) {
              const dist = Math.hypot(px - targetX, py - targetY);
              if (dist < bestD) {
                bestD = dist;
                bestX = px;
                bestY = py;
              }
            }
          }
        }
        W.DK[bestY * N + bestX] = 0;
        return [bestX, bestY];
      };

      const [gx, gy] = findPortalTile(treeTx, treeTy + 2, -1);
      W.glowdeepPortal = { x: gx * T + T / 2, y: gy * T + T / 2, open: false };

      const [mx, my] = findPortalTile(treeTx - 3, treeTy + 1, gy * N + gx);
      W.moonGatePortal = { x: mx * T + T / 2, y: my * T + T / 2, open: false };
    }

    // Sky Court NPCs
    SKY_COURT.forEach((d, k) => {
      const offsets = [
        [-5, 2],
        [5, 2],
        [-3, 6],
        [3, 6],
      ];
      const o = offsets[k] || [0, 0];
      const x = (KX + o[0]) * T + T / 2;
      const y = (KY + o[1]) * T + T / 2;
      npcsList.push({
        ...d,
        sky: true,
        x,
        y,
        hx: x,
        hy: y,
        tx: x,
        ty: y,
        f: 1,
        ph: k * 1.3 + 5,
        h: d.t.map(() => 0),
        wt: Math.random() * 3,
        cool: Math.random() * 5,
        sayT: 0,
        wave: 0,
        mv: 0,
        go: 0,
        hist: [],
      });
    });

    // Town Residents
    TOWN_RESIDENTS.forEach((d) => {
      const town = W.towns.find((z) => z.n === d.at);
      if (town) {
        const x = (town.x + (d.o ? d.o[0] : 0)) * T + T / 2;
        const y = (town.y + (d.o ? d.o[1] : 0)) * T + T / 2;
        npcsList.push({
          ...d,
          sea: town.w === 1,
          sky: town.w === 2,
          x,
          y,
          hx: x,
          hy: y,
          tx: x,
          ty: y,
          f: 1,
          ph: Math.random() * 6,
          h: d.t.map(() => 0),
          wt: Math.random() * 3,
          cool: Math.random() * 5,
          sayT: 0,
          wave: 0,
          mv: 0,
          go: 0,
          hist: [],
          bi: -1,
          nq: true,
        });
      }
    });

    // Glowdeep, Moon Road & Sky/Reef Keepers from MM2 Roster
    const layerSpecificSpecs: {
      name: string;
      tx: number;
      ty: number;
      sea?: boolean;
      sky?: boolean;
      glowdeep?: boolean;
      moonroad?: boolean;
    }[] = [
      { name: 'Lumi', tx: 130, ty: 131, glowdeep: true },
      { name: 'The Moon', tx: 130, ty: 125, moonroad: true },
      { name: 'Dusk', tx: 235, ty: 135, moonroad: true },
    ];

    layerSpecificSpecs.forEach((spec, idx) => {
      const charData = ALL_CHARACTERS_MM2.find((c) => c.n === spec.name);
      if (!charData || npcsList.some((n) => n.n === spec.name)) return;
      const x = spec.tx * T + T / 2;
      const y = spec.ty * T + T / 2;
      npcsList.push({
        ...charData,
        sea: spec.sea,
        sky: spec.sky,
        glowdeep: spec.glowdeep,
        moonroad: spec.moonroad,
        x,
        y,
        hx: x,
        hy: y,
        tx: x,
        ty: y,
        f: 1,
        ph: idx * 1.4,
        h: charData.t.map(() => 0),
        wt: Math.random() * 3,
        cool: Math.random() * 5,
        sayT: 0,
        wave: 0,
        mv: 0,
        go: 0,
        hist: [],
      });
    });

    // Sky Court Keeper (Queen Nimbus) & Reef Keeper (Pearlkeeper Marina)
    if (!npcsList.some((n) => n.sky)) {
      const x = KX * T + T / 2;
      const y = (KY + 2) * T + T / 2;
      npcsList.push({
        n: 'Queen Nimbus',
        r: 'gentle cloud monarch of Cirrus Castle',
        bi: -1,
        sp: 'owl',
        col: '#ffffff',
        hat: 'crown',
        sky: true,
        g: 'Welcome above the clouds! Ride the Rainbow Rings and collect drifting feathers!',
        t: [['How do clouds stay afloat?', 'On laughter and warm updrafts from Dawn Spire!']],
        i: ['So soft!', 'Breezy~'],
        qp: ['Cirrus Kingdom shines brightest when friends fly together.'],
        e: 'Your wings shine like morning gold!',
        x,
        y,
        hx: x,
        hy: y,
        tx: x,
        ty: y,
        f: 1,
        ph: 2.1,
        h: [0],
        wt: 2,
        cool: 4,
        sayT: 0,
        wave: 0,
        mv: 0,
        go: 0,
        hist: [],
      });
    }

    const pearlTown = W.towns.find((t) => t.w === 1);
    if (pearlTown && !npcsList.some((n) => n.sea)) {
      const x = pearlTown.x * T + T / 2;
      const y = pearlTown.y * T + T / 2;
      npcsList.push({
        n: 'Marina',
        r: 'pearl diver & chorus conductor of Pearl Reef',
        bi: -1,
        sp: 'otter',
        col: '#52d6c6',
        hat: 'seashell',
        sea: true,
        g: 'Bloop-hello! Welcome to Pearl Reef! Listen to the Coral Concert Hall resonate!',
        t: [['Where are the pearls?', 'Hidden along the kelp trenches and sunken marble arches!']],
        i: ['Bloop!', 'Bubble tune~'],
        qp: ['Every pearl holds a sea-note from long ago.'],
        e: 'The whole reef is humming in chorus!',
        x,
        y,
        hx: x,
        hy: y,
        tx: x,
        ty: y,
        f: 1,
        ph: 3.3,
        h: [0],
        wt: 2,
        cool: 4,
        sayT: 0,
        wave: 0,
        mv: 0,
        go: 0,
        hist: [],
      });
    }

    W.npcs = npcsList;
    W.quests = INITIAL_QUESTS.map((q) => ({ ...q }));

    // Populate Surface Quest Collectibles (Star Shards for Tidbit, Wildflower Nectar for Bumble)
    const tidbitQuest = W.quests.find((q) => q.t === 'Lighthouse Kindling');
    const bumbleQuest = W.quests.find((q) => q.t === 'The Troubled Honeycomb');
    const qItems: QuestItem[] = [];

    if (tidbitQuest) {
      const tidbitNpc = W.npcs.find((n) => n.n === 'Tidbit');
      const shardTiles: number[] = [];
      for (let i = 0; i < N * N; i++) {
        if (W.B[i] === 2 && !W.DK[i] && !W.TW[i]) shardTiles.push(i);
      }
      if (tidbitNpc) {
        const txT = tidbitNpc.x / T;
        const tyT = tidbitNpc.y / T;
        shardTiles.sort(
          (a, b) =>
            Math.hypot((a % N) - txT, ((a / N) | 0) - tyT) -
            Math.hypot((b % N) - txT, ((b / N) | 0) - tyT)
        );
      }
      const chosen = shardTiles.filter((_, idx) => idx % 8 === 3).slice(0, 7);
      chosen.forEach((idx) => {
        qItems.push({ x: (idx % N) * T + T / 2, y: ((idx / N) | 0) * T + T / 2, w: 0, q: tidbitQuest, got: 0 });
      });
    }

    if (bumbleQuest) {
      const bumbleNpc = W.npcs.find((n) => n.n === 'Bumble');
      const nectarTiles: number[] = [];
      for (let i = 0; i < N * N; i++) {
        if ((W.B[i] === 5 || W.B[i] === 3) && !W.DK[i] && !W.TW[i]) nectarTiles.push(i);
      }
      if (bumbleNpc) {
        const bxT = bumbleNpc.x / T;
        const byT = bumbleNpc.y / T;
        nectarTiles.sort(
          (a, b) =>
            Math.hypot((a % N) - bxT, ((a / N) | 0) - byT) -
            Math.hypot((b % N) - bxT, ((b / N) | 0) - byT)
        );
      }
      const chosen = nectarTiles.filter((_, idx) => idx % 10 === 4).slice(0, 9);
      chosen.forEach((idx) => {
        qItems.push({ x: (idx % N) * T + T / 2, y: ((idx / N) | 0) * T + T / 2, w: 0, q: bumbleQuest, got: 0 });
      });
    }
    W.questItems = qItems;

    // Populate Glowdeep Bioluminescent Glowcap Spores
    const spores: RealmCollectible[] = [];
    for (let y = 8; y < N - 8; y += 2) {
      for (let x = 8; x < N - 8; x += 2) {
        if (Math.hypot(x - GLOWDEEP_RETURN_TILE.x, y - GLOWDEEP_RETURN_TILE.y) < 3) continue;
        if (!isGlowdeepWalkable(x, y)) continue;
        const nearRootHall = Math.hypot(x - 130, y - 130) < 22;
        if ((nearRootHall && hash(x, y, 501) < 0.085) || hash(x, y, 502) < 0.016) {
          spores.push({ x: x * T + T / 2, y: y * T + T / 2, got: 0 });
        }
      }
    }
    W.glowSpores = spores;

    // Populate Moon Road Starlight Notes along Celestial Bridges & Platforms
    const notes: RealmCollectible[] = [];
    for (let y = 16; y < N - 16; y += 2) {
      for (let x = 16; x < N - 16; x += 2) {
        if (Math.hypot(x - MOONROAD_RETURN_TILE.x, y - MOONROAD_RETURN_TILE.y) < 3) continue;
        if (!isMoonRoadWalkable(x, y)) continue;
        if (hash(x, y, 513) < 0.04) {
          notes.push({ x: x * T + T / 2, y: y * T + T / 2, got: 0 });
        }
      }
    }
    W.moonNotes = notes;

    // Roaming Hollow Creatures across the archipelago
    W.hollows = [
      { id: 'h-1', name: 'Gloom', species: 'axolotl', x: (N / 2 - 12) * T, y: (N / 2 + 8) * T, soothed: false, bloomT: 0, color: '#b8c4d8', quote: 'I forgot the lyrics…' },
      { id: 'h-2', name: 'Dusk', species: 'fox', x: (N / 2 + 20) * T, y: (N / 2 - 15) * T, soothed: false, bloomT: 0, color: '#fca5a5', quote: 'The Silence is so heavy…' },
      { id: 'h-3', name: 'Shade', species: 'bunny', x: (N / 2 - 25) * T, y: (N / 2 - 20) * T, soothed: false, bloomT: 0, color: '#fbcfe8', quote: 'Can someone hold my hand?' },
      { id: 'h-4', name: 'Mist', species: 'owl', x: (N / 2 + 18) * T, y: (N / 2 + 22) * T, soothed: false, bloomT: 0, color: '#fed7aa', quote: 'I want to see the sunrise…' },
      { id: 'h-5', name: 'Emberlet', species: 'dragon', x: (N / 2 - 8) * T, y: (N / 2 + 35) * T, soothed: false, bloomT: 0, color: '#fde047', quote: 'My sparks went out…' },
      { id: 'h-6', name: 'Shiver', species: 'penguin', x: (N / 2 + 30) * T, y: (N / 2 - 35) * T, soothed: false, bloomT: 0, color: '#a7f3d0', quote: 'It is cold without a song…' },
    ];

    // Try loading saved game from browser storage for the active slot
    try {
      const slot = currentSlotRef.current;
      const saved =
        localStorage.getItem(LOCAL_STORAGE_SAVE_PREFIX + slot) ||
        (slot === 1 ? localStorage.getItem(LOCAL_STORAGE_SAVE_KEY) || localStorage.getItem(LOCAL_STORAGE_LEGACY_SAVE) : null);
      if (saved) {
        const data = JSON.parse(saved);
        if (data.L) setPlayerLook(data.L);
        if (typeof data.coins === 'number') setCoins(data.coins);
        if (typeof data.tot === 'number') setTotalCoins(data.tot);
        if (typeof data.ch === 'number') setCurrentChapter(data.ch);
        if (data.done) setLullabyDone(Boolean(data.done));
        if (data.skd) setSkyStoryDone(Boolean(data.skd));
        if (data.vg) setVisitedGlowdeep(true);
        if (data.vm) setVisitedMoonRoad(true);
        if (Array.isArray(data.lore)) setLoreEntries(data.lore);
        if (Array.isArray(data.ach)) setUnlockedAchievements(data.ach);
        if (Array.isArray(data.mv)) setUnlockedCutscenes(data.mv);
        if (data.ug) setUpgrades(data.ug);
        if (data.fs) setFishLog(data.fs);
        if (data.cottage) setCottageState(data.cottage);
        if (Array.isArray(data.hamlet)) setHamletResidents(data.hamlet);
        if (Array.isArray(data.visTowns)) {
          W.towns.forEach((t) => {
            if (data.visTowns.includes(t.n)) t.vis = 1;
          });
        }
        if (Array.isArray(data.qu)) {
          data.qu.forEach((sq: { t: string; st: number; c: number }) => {
            const q = W.quests.find((item) => item.t === sq.t);
            if (q) {
              q.st = sq.st;
              q.c = sq.c;
            }
          });
        }
        if (Array.isArray(data.fr)) {
          W.npcs.forEach((n) => {
            if (data.fr.includes(n.n)) {
              n.fr = true;
              n.h = n.h.map(() => 1);
            }
          });
        }
        if (data.pos && typeof data.pos.x === 'number' && typeof data.pos.y === 'number') {
          W.player.x = data.pos.x;
          W.player.y = data.pos.y;
          W.player.sky = Boolean(data.pos.sky);
          W.player.dive = Boolean(data.pos.dive);
          W.player.glowdeep = Boolean(data.pos.glowdeep);
          W.player.moonroad = Boolean(data.pos.moonroad);
          W.companionPos.x = W.player.x - 26;
          W.companionPos.y = W.player.y + 4;
        }
      }
    } catch (e) {}

    W.camera.x = W.player.x;
    W.camera.y = W.player.y;
    W.camera.initialized = true;

    // Load Settings
    try {
      const savedSet = localStorage.getItem(LOCAL_STORAGE_SETTINGS_KEY);
      if (savedSet) {
        const parsed = JSON.parse(savedSet);
        setSettings((prev) => ({ ...prev, ...parsed }));
        audio.setVolume(parsed.vol ?? 0.8);
      }
    } catch (e) {}
  }, []);

  // Sync Ground Portal Lock States cleanly with Current Chapter
  useEffect(() => {
    const W = worldRef.current;
    if (W.moonGatePortal) W.moonGatePortal.open = currentChapter >= 7;
    if (W.glowdeepPortal) W.glowdeepPortal.open = currentChapter >= 9;
  }, [currentChapter]);

  // Keyboard Event Handlers (stable mount-once binding reading fresh refs)
  useEffect(() => {
    const W = worldRef.current;
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName?.toLowerCase() || '';
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
      const k = e.key.toLowerCase();
      W.keys.add(k);

      const modal = activeModalRef.current;
      const cutscene = activeCutsceneRef.current;

      if (k === ' ' && !cutscene && modal === 'none') {
        e.preventDefault();
        dashFnRef.current();
      } else if (k === 'f' && !cutscene && modal === 'none') {
        if (getNearbyPortal()) {
          portalInteractFnRef.current();
        } else {
          diveFnRef.current();
        }
      } else if ((k === 'e' || k === 'enter') && !cutscene && modal === 'none') {
        if (activeNpcRef.current) {
          e.preventDefault();
          audio.init();
          setActiveModal('dialog');
        }
      } else if (k === 'r' && !cutscene && modal === 'none') {
        if (canFishFnRef.current()) {
          setActiveModal('fishing');
        }
      } else if (k === 'j' && !cutscene) {
        setActiveModal((prev) => (prev === 'journal' ? 'none' : 'journal'));
      } else if (k === 'c' && !cutscene) {
        setActiveModal((prev) => (prev === 'wardrobe' ? 'none' : 'wardrobe'));
      } else if (k === 'm' && !cutscene) {
        setActiveModal((prev) => (prev === 'map' ? 'none' : 'map'));
      } else if (k === 'k' && !cutscene) {
        setActiveModal((prev) => (prev === 'songweaver' ? 'none' : 'songweaver'));
      } else if (k === 'h' && !cutscene) {
        setActiveModal((prev) => (prev === 'cottage' ? 'none' : 'cottage'));
      } else if (k === 'n') {
        cycleMusicFnRef.current();
      } else if (k === 'escape') {
        if (cutscene) setActiveCutscene(null);
        else if (modal !== 'none') setActiveModal('none');
        else {
          setPauseInitialTab('menu');
          setActiveModal('pause');
        }
      } else if (k >= '1' && k <= '9' && !cutscene && modal === 'none') {
        const spellNum = Number(k) - 1;
        setSelectedSpellIdx(spellNum);
        castSpellFnRef.current(spellNum);
      } else if (k === '0' && !cutscene && modal === 'none') {
        setSelectedSpellIdx(9);
        castSpellFnRef.current(9);
      } else if (k === '-' && !cutscene && modal === 'none') {
        setSelectedSpellIdx(10);
        castSpellFnRef.current(10);
      } else if (k === '=' && !cutscene && modal === 'none') {
        setSelectedSpellIdx(11);
        castSpellFnRef.current(11);
      } else if (k === 't' && !cutscene && modal === 'none') {
        const tpIdx = MAGIC_SPELLS.findIndex((s) => s.id === 'teleport');
        if (tpIdx !== -1) {
          setSelectedSpellIdx(tpIdx);
          castSpellFnRef.current(tpIdx);
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      W.keys.delete(e.key.toLowerCase());
    };

    const clearInputs = () => {
      W.keys.clear();
      W.touchJoystick.active = false;
      W.player.moveTarget = null;
    };

    const handleVisibility = () => {
      if (document.hidden) clearInputs();
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', clearInputs);
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', clearInputs);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  // Dash with afterimage trail
  const handleDash = () => {
    const W = worldRef.current;
    if (W.player.cd <= 0) {
      W.player.dash = 0.19;
      W.player.cd = 1.05;
      audio.pop();
      W.dashGhosts.push({ x: W.player.x, y: W.player.y, face: W.player.face, alpha: 0.55 });
      for (let i = 0; i < 9; i++) {
        W.particles.push({
          x: W.player.x,
          y: W.player.y + 6,
          vx: (Math.random() - 0.5) * 90,
          vy: (Math.random() - 0.5) * 90,
          l: 0.48,
          c: i % 2 === 0 ? '#ffffff' : '#ff9ebb',
        });
      }
    }
  };
  dashFnRef.current = handleDash;

  // Dive / Surface
  const handleDiveToggle = () => {
    const W = worldRef.current;
    if (W.player.glowdeep || W.player.moonroad) {
      showToast('Step through the return arch to go back to the Meadow');
      return;
    }
    if (W.player.sky) {
      showToast('Land first to dive');
      return;
    }
    const tileX = (W.player.x / T) | 0;
    const tileY = (W.player.y / T) | 0;
    const b = W.B[tileY * N + tileX];

    if (W.player.dive) {
      W.player.dive = false;
      audio.pop();
      triggerRealmFlash('#8cebff', 0.34);
      spawnWorldPopup(W.player.x, W.player.y - 22, '🌊 Surfaced!', '#b8f2ff');
      showToast('Surfaced to the air! 🌊');
    } else if (b < 2) {
      if (W.player.o2 < 15) {
        showToast('Catch your breath first!');
        return;
      }
      W.player.dive = true;
      audio.pop();
      triggerRealmFlash('#1e78b4', 0.38);
      spawnWorldPopup(W.player.x, W.player.y - 22, '🤿 Coral Reef', '#8cebff');
      showToast('Diving into the undersea reef! 🤿');
    } else {
      showToast('Swim into water to dive');
    }
  };
  diveFnRef.current = handleDiveToggle;

  // Detect nearby Surface Entrance / Mochi's House Door / Realm Return Arch
  const getNearbyPortal = () => {
    const W = worldRef.current;
    if (!W.player.sky && !W.player.dive && !W.player.glowdeep && !W.player.moonroad) {
      if (
        W.playerHomePortal &&
        Math.hypot(W.player.x - W.playerHomePortal.doorX, W.player.y - W.playerHomePortal.doorY) < 60
      ) {
        return {
          id: 'to_mochi_house' as const,
          label: `Enter ${playerLookRef.current.name || 'Mochi'}'s House`,
          icon: '🏡',
          locked: false,
        };
      }
      if (W.glowdeepPortal && Math.hypot(W.player.x - W.glowdeepPortal.x, W.player.y - W.glowdeepPortal.y) < 64) {
        return {
          id: 'to_glowdeep' as const,
          label: W.glowdeepPortal.open ? 'Enter Glowdeep' : 'Sealed Roots (Ch. 9)',
          icon: '🍄',
          locked: !W.glowdeepPortal.open,
        };
      }
      if (W.moonGatePortal && Math.hypot(W.player.x - W.moonGatePortal.x, W.player.y - W.moonGatePortal.y) < 64) {
        return {
          id: 'to_moonroad' as const,
          label: W.moonGatePortal.open ? 'Enter Moon Road' : 'Silver Gate (Ch. 7)',
          icon: '🌙',
          locked: !W.moonGatePortal.open,
        };
      }
    } else if (W.player.glowdeep) {
      const rx = GLOWDEEP_RETURN_TILE.x * T + T / 2;
      const ry = GLOWDEEP_RETURN_TILE.y * T + T / 2;
      if (Math.hypot(W.player.x - rx, W.player.y - ry) < 64) {
        return { id: 'from_glowdeep' as const, label: 'Ascend to Meadow', icon: '🌿', locked: false };
      }
    } else if (W.player.moonroad) {
      const rx = MOONROAD_RETURN_TILE.x * T + T / 2;
      const ry = MOONROAD_RETURN_TILE.y * T + T / 2;
      if (Math.hypot(W.player.x - rx, W.player.y - ry) < 64) {
        return { id: 'from_moonroad' as const, label: 'Return to Meadow', icon: '🌿', locked: false };
      }
    }
    return null;
  };

  // Enter / Exit Glowdeep Caverns & Moon Road via Physical Portals
  const enterRealmLayer = (layer: 0 | 3 | 4, destTileX: number, destTileY: number) => {
    const W = worldRef.current;
    const destX = destTileX * T + T / 2;
    const destY = destTileY * T + T / 2;
    W.player.x = destX;
    W.player.y = destY;
    W.player.vx = 0;
    W.player.vy = 0;
    W.player.dash = 0;
    W.player.moveTarget = null;
    W.player.sky = false;
    W.player.dive = false;
    W.player.glowdeep = layer === 3;
    W.player.moonroad = layer === 4;
    W.companionPos.x = destX - 24;
    W.companionPos.y = destY + 4;
    snapCamera();
    triggerRealmFlash(layer === 3 ? '#64f5c1' : layer === 4 ? '#b48cff' : '#fff5d6', 0.44);
    setPlayerPos({
      x: destX,
      y: destY,
      sky: false,
      dive: false,
      glowdeep: W.player.glowdeep,
      moonroad: W.player.moonroad,
    });
    W.magicRings.push({ x: destX, y: destY, t: 0, m: 1.0, r: 170, c: layer === 3 ? '#64f5c1' : '#ffd23f' });
    audio.teleportWarp();
  };

  const handlePortalInteract = () => {
    const portal = getNearbyPortal();
    const W = worldRef.current;
    if (!portal) return;

    if (portal.id === 'to_mochi_house') {
      audio.chime();
      setActiveModal('cottage');
      return;
    }

    if (portal.id === 'to_glowdeep') {
      if (portal.locked) {
        showToast('🔒 The Lantern Roots unseal in Chapter 9 (The Bell Canopy). Check your Journal!');
        return;
      }
      enterRealmLayer(3, GLOWDEEP_SPAWN_TILE.x, GLOWDEEP_SPAWN_TILE.y);
      setVisitedGlowdeep(true);
      const rootedTown = W.towns.find((t) => t.n === 'Rooted Rest');
      if (rootedTown) rootedTown.vis = 1;
      if (!unlockedCutscenes.includes('deep')) triggerCutscene('deep');
      showToast('🍄 Descended beneath the Lantern Tree into Glowdeep Caverns!');
    } else if (portal.id === 'to_moonroad') {
      if (portal.locked) {
        showToast('🔒 The Silver Moon Gate opens in Chapter 7 (The Long Night). Check your Journal!');
        return;
      }
      enterRealmLayer(4, MOONROAD_SPAWN_TILE.x, MOONROAD_SPAWN_TILE.y);
      setVisitedMoonRoad(true);
      const moonTown = W.towns.find((t) => t.n === 'Moon’s Tea House');
      if (moonTown) moonTown.vis = 1;
      showToast('🌙 Stepped onto the starlit Moon Road! Follow the road to Moon’s Tea House & Dusk.');
    } else if (portal.id === 'from_glowdeep') {
      const gx = W.glowdeepPortal ? Math.round((W.glowdeepPortal.x - T / 2) / T) : Math.round(N / 2);
      const gy = W.glowdeepPortal ? Math.round((W.glowdeepPortal.y - T / 2) / T) : Math.round(N / 2);
      enterRealmLayer(0, gx, gy);
      showToast('🌿 Ascended back to Lantern Isle!');
    } else if (portal.id === 'from_moonroad') {
      const mx = W.moonGatePortal ? Math.round((W.moonGatePortal.x - T / 2) / T) : Math.round(N / 2);
      const my = W.moonGatePortal ? Math.round((W.moonGatePortal.y - T / 2) / T) : Math.round(N / 2);
      enterRealmLayer(0, mx, my);
      showToast('🌿 Returned through the Silver Gate to Lantern Isle!');
    }
  };
  portalInteractFnRef.current = handlePortalInteract;

  // Story Milestone Evaluator (Chapters 1 -> 12)
  const evaluateStoryProgress = useCallback(
    (overrides?: { chapter?: number; lullaby?: boolean }) => {
      const W = worldRef.current;
      let ch = overrides?.chapter ?? currentChapterRef.current;
      const done = overrides?.lullaby ?? lullabyDoneRef.current;
      if (done) return;

      const byName = (name: string) => W.npcs.find((n) => n.n === name);
      const friendsCount = W.npcs.filter((n) => n.fr && !n.tree).length;
      const soothedCount = W.hollows.filter((h) => h.soothed).length;
      const qByTitle = (title: string) => W.quests.find((q) => q.t === title);
      const addLoreIfMissing = (id: string, t: string, x: string) => {
        setLoreEntries((prev) => (prev.some((l) => l.id === id) ? prev : [...prev, { id, t, x }]));
      };

      const startCh = ch;
      let latestToast: string | null = null;

      if (ch === 1) {
        const pip = byName('Pip');
        const pq = qByTitle('Pip’s Flying Muffins');
        if (unlockedCutscenes.includes('wake') || pip?.h.some(Boolean) || pip?.fr || (pq && pq.st >= 1)) {
          ch = 2;
          latestToast = '🌟 Chapter 2: The Puddle Sets Sail! Talk to Captain Barnacle.';
        }
      }

      if (ch === 2) {
        const barnacle = byName('Captain Barnacle');
        const pq = qByTitle('Pip’s Flying Muffins');
        if (pq?.st === 3 || barnacle?.h.some(Boolean) || barnacle?.fr || friendsCount >= 2) {
          ch = 3;
          if (!unlockedCutscenes.includes('whispers')) triggerCutscene('whispers');
          latestToast = '🍯 Chapter 3: Honey and Hum! Seek Bumble for Verse 1.';
        }
      }

      if (ch === 3) {
        const bumble = byName('Bumble');
        const bq = qByTitle('The Troubled Honeycomb');
        if (bq?.st === 3 || bumble?.fr) {
          ch = 4;
          addLoreIfMissing('verse-1', 'Verse 1: Wake', VERSES_OF_REVEILLE[0].quote);
          latestToast = '🏮 Chapter 4: Lighthouse in the Dark! Meet Tidbit on the coast.';
        }
      }

      if (ch === 4) {
        const tidbit = byName('Tidbit');
        const tq = qByTitle('Lighthouse Kindling');
        const pearlsGot = W.pearls.filter((p) => p.got).length;
        if (tq?.st === 3 || tidbit?.fr || pearlsGot >= 4) {
          ch = 5;
          addLoreIfMissing('verse-2', 'Verse 2: Stretch', VERSES_OF_REVEILLE[1].quote);
          latestToast = '🔥 Chapter 5: Warm Hearts! Seek Ember in the Sunbaked Dunes.';
        }
      }

      if (ch === 5) {
        const ember = byName('Ember');
        if (ember?.fr || soothedCount >= 2 || friendsCount >= 4) {
          ch = 6;
          addLoreIfMissing('verse-3', 'Verse 3: Warm', VERSES_OF_REVEILLE[2].quote);
          latestToast = '🌸 Chapter 6: Echoes in the Fens! Speak with Madame Mizzle.';
        }
      }

      if (ch === 6) {
        const mizzle = byName('Madame Mizzle');
        if (mizzle?.fr || soothedCount >= 3 || friendsCount >= 5) {
          ch = 7;
          addLoreIfMissing('verse-4', 'Verse 4: Greet', VERSES_OF_REVEILLE[3].quote);
          if (W.moonGatePortal) W.moonGatePortal.open = true;
          if (!unlockedCutscenes.includes('starlight')) triggerCutscene('starlight');
          latestToast = '🌙 Chapter 7: The Long Night! The Silver Moon Road Gate is now OPEN!';
        }
      }

      if (ch === 7) {
        const twins = byName('Penny and Quill');
        const feathersGot = W.feathers.filter((f) => f.got).length;
        if (twins?.fr || visitedMoonRoad || W.player.moonroad || feathersGot >= 4) {
          ch = 8;
          addLoreIfMissing('verse-5', 'Verse 5: Run', VERSES_OF_REVEILLE[4].quote);
          latestToast = '🔔 Chapter 8: The Bell Canopy! Meet Bellamy in Whisper Woods.';
        }
      }

      if (ch === 8) {
        const bellamy = byName('Bellamy');
        const cirrus = W.towns.find((t) => t.n === 'Cirrus Castle');
        const starsGot = W.stars.filter((s) => s.got).length;
        if (bellamy?.fr || cirrus?.vis === 1 || starsGot >= 10) {
          ch = 9;
          addLoreIfMissing('verse-6', 'Verse 6: Ring', VERSES_OF_REVEILLE[5].quote);
          if (W.glowdeepPortal) W.glowdeepPortal.open = true;
          latestToast = '🍄 Chapter 9: Beneath the Meadow! Glowdeep Roots Portal unsealed by the Lantern Tree!';
        }
      }

      if (ch === 9) {
        const lumi = byName('Lumi');
        const lq = qByTitle('Soup of Remembering');
        if (lq?.st === 3 || lumi?.fr) {
          ch = 10;
          addLoreIfMissing('verse-7', 'Verse 7: Remember', VERSES_OF_REVEILLE[6].quote);
          if (!unlockedCutscenes.includes('deep')) triggerCutscene('deep');
          latestToast = '🌙 Chapter 10: The Moon Road! Visit The Moon & Dusk on the Moon Road.';
        }
      }

      if (ch === 10) {
        const moonNpc = byName('The Moon');
        const duskNpc = byName('Dusk');
        if (moonNpc?.fr || duskNpc?.fr || moonNpc?.h.some(Boolean) || duskNpc?.h.some(Boolean)) {
          ch = 11;
          latestToast = '🏔️ Chapter 11: The Climb! Meet Aurelle on the eastern shore toward Dawn Spire.';
        }
      }

      if (ch === 11) {
        const aurelle = byName('Aurelle');
        if (aurelle?.h.some(Boolean) || aurelle?.fr) {
          ch = 12;
          latestToast = '🌅 Chapter 12: The Dawn Duet! Sing the Dawn Duet with Aurelle or Wick!';
        }
      }

      if (ch !== startCh) {
        currentChapterRef.current = ch;
        setCurrentChapter(ch);
        audio.chime();
        if (latestToast) showToast(latestToast);
      }
    },
    [showToast]
  );
  evalStoryFnRef.current = () => evaluateStoryProgress();

  // Trigger Grand Finale of Act III
  const completeDawnDuetFinale = useCallback(() => {
    if (lullabyDoneRef.current) return;
    lullabyDoneRef.current = true;
    setLullabyDone(true);
    setCoins((c) => c + 200);
    setTotalCoins((c) => c + 200);
    setLoreEntries((prev) =>
      prev.some((l) => l.id === 'unsung-verse')
        ? prev
        : [...prev, { id: 'unsung-verse', t: `The 9th Unsung Verse: ${UNSUNG_VERSE.title}`, x: UNSUNG_VERSE.quote }]
    );
    setUnlockedAchievements((prev) => (prev.includes('duet_finale') ? prev : [...prev, 'duet_finale']));
    audio.harmonyChime?.('Dawn Duet');
    triggerCutscene('finale');
    showToast('🌅 The Dawn Duet echoes across the archipelago! +200 Coins!');
  }, [showToast]);

  // Dynamic Island Achievement Evaluator
  const checkAchievements = useCallback(() => {
    const W = worldRef.current;
    const owned = unlockedAchievementsRef.current;
    const toUnlock: string[] = [];
    const tryAdd = (id: string, condition: boolean) => {
      if (condition && !owned.includes(id) && !toUnlock.includes(id)) {
        toUnlock.push(id);
      }
    };

    const starsGot = W.stars.filter((s) => s.got).length;
    const pearlsGot = W.pearls.filter((p) => p.got).length;
    const feathersGot = W.feathers.filter((f) => f.got).length;
    const soothedCount = W.hollows.filter((h) => h.soothed).length;
    const echoCount = W.discoveredEchoIds.size;
    const verseCount = VERSES_OF_REVEILLE.filter((_, idx) =>
      loreEntriesRef.current.some((l) => l.id === `verse-${idx + 1}`)
    ).length;

    tryAdd('first_light', currentChapterRef.current >= 2);
    tryAdd('hush_soothe', soothedCount >= 1);
    tryAdd('star25', starsGot >= 25);
    tryAdd('star100', starsGot >= 100);
    tryAdd('pearl25', pearlsGot >= 25);
    tryAdd('feather25', feathersGot >= 25);
    tryAdd('echo_hunter', echoCount >= 12);
    tryAdd('echo_keeper', echoCount >= 48);
    tryAdd('harmony_master', triggeredHarmoniesRef.current.size >= 5);
    tryAdd('cottage_home', (cottageStateRef.current.decorationsPlaced?.length ?? 0) >= 6);
    tryAdd('hamlet_mayor', hamletResidentsRef.current.length >= 5);
    tryAdd('fish10', Object.keys(fishLogRef.current).length >= 10);
    tryAdd('seven_verses', verseCount >= 7);
    tryAdd('duet_finale', lullabyDoneRef.current);

    if (toUnlock.length > 0) {
      setUnlockedAchievements((prev) => {
        const merged = [...prev];
        for (const id of toUnlock) {
          if (!merged.includes(id)) merged.push(id);
        }
        unlockedAchievementsRef.current = merged;
        return merged;
      });
      const firstDef = ACHIEVEMENTS.find((a) => a.id === toUnlock[0]);
      if (firstDef) {
        audio.chime();
        showToast(
          toUnlock.length === 1
            ? `🏆 Achievement Unlocked: ${firstDef.icon} ${firstDef.title}!`
            : `🏆 Unlocked ${toUnlock.length} Achievements (${firstDef.icon} ${firstDef.title}…)!`
        );
      }
    }
  }, [showToast]);
  checkAchFnRef.current = checkAchievements;

  // Check if near water for fishing
  const canFish = () => {
    const W = worldRef.current;
    if (W.player.sky || W.player.dive || W.player.glowdeep || W.player.moonroad) return false;
    const tx = (W.player.x / T) | 0;
    const ty = (W.player.y / T) | 0;
    if (W.B[ty * N + tx] < 2) return false;
    for (let dy = -2; dy <= 2; dy++) {
      for (let dx = -2; dx <= 2; dx++) {
        if (W.B[(ty + dy) * N + tx + dx] < 2) return true;
      }
    }
    return false;
  };
  canFishFnRef.current = canFish;

  // Magic Spell Casting (13 Spells + Combination Harmonies)
  const handleCastSpell = (idx: number) => {
    const W = worldRef.current;
    const spell = MAGIC_SPELLS[idx];
    if (!spell) return;

    if (currentChapter < spell.unlockChapter) {
      showToast(`🔒 ${spell.name} unlocks after Chapter ${spell.unlockChapter}`);
      return;
    }

    // Song of Teleportation opens destination picker before spending mana
    if (spell.id === 'teleport') {
      if (W.player.mp < spell.cost) {
        showToast(`Need ${spell.cost} MP to sing Song of Teleportation`);
        return;
      }
      audio.init();
      setActiveModal('teleport');
      return;
    }

    // Toggle Landing if Cloud Wings cast in sky
    if ((spell.id === 'cloud_wings' || spell.id === 'wings') && W.player.sky) {
      W.player.sky = false;
      showToast('Landing gently on the meadows… 🌿');
      audio.pop();
      return;
    }

    // Validate layer restrictions before deducting mana
    if ((spell.id === 'cloud_wings' || spell.id === 'wings') && (W.player.glowdeep || W.player.moonroad)) {
      showToast('Return to the surface Meadow first to spread your Cloud Wings');
      return;
    }

    if ((spell.id === 'frost_bridge' || spell.id === 'frost') && (W.player.sky || W.player.dive || W.player.glowdeep || W.player.moonroad)) {
      showToast('Land on the surface or shoreline first to cast Frost Bridge');
      return;
    }

    const freeCloud = (spell.id === 'cloud_wings' || spell.id === 'wings') && upgrades.cloud;
    if (W.player.mp < (freeCloud ? 0 : spell.cost)) {
      showToast('Not enough magic mana yet');
      return;
    }

    if (!freeCloud) {
      W.player.mp -= spell.cost;
      setMana(Math.round(W.player.mp));
    }

    // Play spell sound
    audio.castSpell?.(spell.id);

    // Helper for radial sparkle burst at any world point
    const spawnBurst = (colors: string[], count = 16, speed = 85, originX = W.player.x, originY = W.player.y) => {
      for (let i = 0; i < count; i++) {
        const a = (i / count) * Math.PI * 2 + Math.random() * 0.25;
        const spd = speed * (0.55 + Math.random() * 0.7);
        W.particles.push({
          x: originX,
          y: originY,
          vx: Math.cos(a) * spd,
          vy: Math.sin(a) * spd,
          l: 0.9 + Math.random() * 0.45,
          c: colors[i % colors.length],
        });
      }
    };

    const isSurfaceLayer = !W.player.sky && !W.player.dive && !W.player.glowdeep && !W.player.moonroad;
    const coinMult = upgrades.clover ? 1.5 : 1;

    // Environmental Helper 1: Shake nearby trees/cacti/shells to shower petals & drop coins (once per tile)
    const shakeNearbyFlora = (radiusPx: number, coinReward = 3, colors = ['#7bd88f', '#ff9ebb', '#ffd23f']) => {
      if (!isSurfaceLayer) return 0;
      const ptx = (W.player.x / T) | 0;
      const pty = (W.player.y / T) | 0;
      const radTiles = Math.ceil(radiusPx / T);
      let shaken = 0;
      let coinsFound = 0;
      for (let y = Math.max(1, pty - radTiles); y <= Math.min(N - 2, pty + radTiles); y++) {
        for (let x = Math.max(1, ptx - radTiles); x <= Math.min(N - 2, ptx + radTiles); x++) {
          const idx = y * N + x;
          const dk = W.DK[idx];
          if (dk !== 2 && dk !== 4 && dk !== 5 && dk !== 7 && dk !== 8) continue;
          const cx = x * T + T / 2;
          const cy = y * T + T / 2;
          if (Math.hypot(cx - W.player.x, cy - W.player.y) > radiusPx) continue;
          spawnBurst(colors, 7, 65, cx, cy - 8);
          if (!W.shakenTiles.has(idx)) {
            W.shakenTiles.add(idx);
            shaken++;
            coinsFound += Math.round(coinReward * coinMult);
          }
        }
      }
      if (coinsFound > 0) {
        setCoins((c) => c + coinsFound);
        setTotalCoins((c) => c + coinsFound);
      }
      return shaken > 0 ? coinsFound : 0;
    };

    // Environmental Helper 2: Permanently sprout wildflowers on bare meadow/forest tiles
    const plantPermanentWildflowers = (radiusTiles: number, chance = 0.48) => {
      if (!isSurfaceLayer) return 0;
      const ptx = (W.player.x / T) | 0;
      const pty = (W.player.y / T) | 0;
      let planted = 0;
      for (let y = Math.max(1, pty - radiusTiles); y <= Math.min(N - 2, pty + radiusTiles); y++) {
        for (let x = Math.max(1, ptx - radiusTiles); x <= Math.min(N - 2, ptx + radiusTiles); x++) {
          if (Math.hypot(x - ptx, y - pty) > radiusTiles + 0.3) continue;
          const idx = y * N + x;
          if (W.TW[idx] === 0 && W.DK[idx] === 0 && W.B[idx] >= 3 && W.B[idx] <= 5 && Math.random() < chance) {
            W.DK[idx] = 9; // Wildflower trio
            planted++;
          }
        }
      }
      return planted;
    };

    // Environmental Helper 3: Check solid tile at arbitrary world coordinates (for safe Glimmer Step blink)
    const isPointSolidForBlink = (px: number, py: number) => {
      const checkTile = (tx: number, ty: number) => {
        if (tx < 1 || ty < 1 || tx >= N - 1 || ty >= N - 1) return true;
        if (W.dreamwalkTimer > 0) return false;
        if (W.player.glowdeep) return !isGlowdeepWalkable(tx, ty);
        if (W.player.moonroad) return !isMoonRoadWalkable(tx, ty);
        const idx = ty * N + tx;
        if (W.player.sky) return W.SD[idx] === 1 || W.SD[idx] === 9;
        if (W.player.dive) return W.B[idx] > 1 || W.UD[idx] === 5 || W.UD[idx] === 6;
        const dk = W.DK[idx];
        return dk === 2 || dk === 4 || dk === 5 || dk === 6 || dk === 7 || dk === 10 || dk === 11 || dk === 13 || dk === 14 || dk === 16;
      };
      const fy = py + 5;
      const rx = 8;
      const ry = 5;
      return (
        checkTile(((px - rx) / T) | 0, ((fy - ry) / T) | 0) ||
        checkTile(((px + rx) / T) | 0, ((fy - ry) / T) | 0) ||
        checkTile(((px - rx) / T) | 0, ((fy + ry) / T) | 0) ||
        checkTile(((px + rx) / T) | 0, ((fy + ry) / T) | 0)
      );
    };

    // Environmental Helper 4: Collect nearby Memory Echoes & Moon Diary Pages with Echo Call
    const discoverNearbyMemoryAndDiary = (radiusPx: number) => {
      const playerLayer = W.player.sky ? 2 : W.player.dive ? 1 : W.player.glowdeep ? 3 : W.player.moonroad ? 4 : 0;
      const foundTitles: string[] = [];

      MEMORY_ECHOES.forEach((echo) => {
        if (echo.w !== playerLayer || W.discoveredEchoIds.has(echo.id)) return;
        const ex = echo.x * T + T / 2;
        const ey = echo.y * T + T / 2;
        if (Math.hypot(ex - W.player.x, ey - W.player.y) <= radiusPx) {
          W.discoveredEchoIds.add(echo.id);
          echo.got = true;
          foundTitles.push(`Echo: ${echo.title}`);
          setLoreEntries((prev) =>
            prev.some((l) => l.id === echo.id)
              ? prev
              : [...prev, { id: echo.id, t: `Memory Echo — ${echo.title} (${echo.speaker})`, x: echo.memory }]
          );
          spawnBurst(['#ffd23f', '#8fd5ff', '#ff7aa8'], 16, 105, ex, ey);
        }
      });

      MOON_DIARY_PAGES.forEach((page) => {
        if (page.w !== playerLayer || W.discoveredDiaryPages.has(page.page)) return;
        const px = page.x * T + T / 2;
        const py = page.y * T + T / 2;
        if (Math.hypot(px - W.player.x, py - W.player.y) <= radiusPx) {
          W.discoveredDiaryPages.add(page.page);
          page.found = true;
          foundTitles.push(`Moon Diary p.${page.page}`);
          const loreId = `diary-${page.page}`;
          setLoreEntries((prev) =>
            prev.some((l) => l.id === loreId)
              ? prev
              : [...prev, { id: loreId, t: `Moon’s Diary — Page ${page.page}`, x: page.entry }]
          );
          spawnBurst(['#b48cff', '#ffd23f', '#ffffff'], 14, 95, px, py);
        }
      });

      if (foundTitles.length > 0) {
        const bonus = Math.round(15 * foundTitles.length * coinMult);
        setCoins((c) => c + bonus);
        setTotalCoins((c) => c + bonus);
        audio.chime();
      }
      return foundTitles;
    };

    // Combination Harmony Check (supports matching by spell name or id & applies bonus effects)
    const now = performance.now() / 1000;
    let harmonyTriggered: string | null = null;
    if (lastCastSpellRef.current && now - lastCastSpellRef.current.time < 3.5) {
      const prevKey = lastCastSpellRef.current.id;
      const harmony = SPELL_HARMONIES.find(
        (h) =>
          (h.spells[0] === prevKey && (h.spells[1] === spell.name || h.spells[1] === spell.id)) ||
          ((h.spells[0] === spell.name || h.spells[0] === spell.id) && h.spells[1] === prevKey)
      );

      if (harmony) {
        harmonyTriggered = harmony.name;
        triggeredHarmoniesRef.current.add(harmony.name);
        audio.harmonyChime?.(harmony.name);
        W.player.mp = Math.min(100, W.player.mp + 20);
        setMana(Math.round(W.player.mp));
        spawnBurst(['#ffd23f', '#ff7aa8', '#8ed0ff', '#b48cff', '#7bd88f'], 24, 115);
        spawnWorldPopup(W.player.x, W.player.y - 34, `🎶 ${harmony.name}!`, '#ffe875', 1.25);

        if (harmony.name === 'Echo Magnet') {
          W.moonPullTimer = Math.max(W.moonPullTimer, 11);
          W.echoTimer = Math.max(W.echoTimer, 16);
        } else if (harmony.name === 'Hot Spring') {
          W.player.st = 100;
          W.player.o2 = 100;
          W.player.mp = Math.min(100, W.player.mp + 25);
          W.warmthTimer = Math.max(W.warmthTimer, 18);
          setStamina(100);
          setAir(100);
          setMana(Math.round(W.player.mp));
        } else if (harmony.name === 'Lullaby Veil') {
          sootheNearbyHollows(520);
          W.dreamwalkTimer = Math.max(W.dreamwalkTimer, 18);
          W.hugTimer = Math.max(W.hugTimer, 14);
        } else if (harmony.name === 'Sunrise Lift') {
          W.player.dive = false;
          W.player.sky = true;
          W.player.dash = 0.45;
          W.dawnTimer = Math.max(W.dawnTimer, 18);
          triggerRealmFlash('#ffd23f', 0.36);
        } else if (harmony.name === 'Comet Hop') {
          const pool = W.player.sky ? [...W.feathers, ...W.rings] : W.player.dive ? W.pearls : W.stars;
          const nearestUncollected = pool
            .filter((item) => !item.got)
            .sort(
              (a, b) =>
                Math.hypot(a.x - W.player.x, a.y - W.player.y) - Math.hypot(b.x - W.player.x, b.y - W.player.y)
            )[0];
          if (nearestUncollected) {
            W.player.x = nearestUncollected.x;
            W.player.y = nearestUncollected.y;
            snapCamera();
            triggerRealmFlash('#fff5b8', 0.34);
            spawnBurst(['#ffd23f', '#8fd5ff', '#ffffff'], 18, 95, W.player.x, W.player.y);
          }
        } else if (harmony.name === 'Lily Path') {
          W.tideTimer = Math.max(W.tideTimer, 16);
          const ptx = (W.player.x / T) | 0;
          const pty = (W.player.y / T) | 0;
          for (let y = pty - 4; y <= pty + 4; y++) {
            for (let x = ptx - 4; x <= ptx + 4; x++) {
              if (x > 0 && y > 0 && x < N - 1 && y < N - 1 && W.B[y * N + x] < 2) {
                W.iceMap.set(y * N + x, W.time + 45);
              }
            }
          }
        } else if (harmony.name === 'Frost Glow') {
          W.starSenseTimer = Math.max(W.starSenseTimer, 24);
          W.frostShieldTimer = Math.max(W.frostShieldTimer, 18);
        } else if (harmony.name === 'Thermal Breeze') {
          W.player.dive = false;
          W.player.sky = true;
          W.warmthTimer = Math.max(W.warmthTimer, 16);
          W.player.dash = 0.35;
          triggerRealmFlash('#ffbe78', 0.32);
        } else if (harmony.name === 'Rain Roots') {
          W.bloomStepTimer = Math.max(W.bloomStepTimer, 18);
          plantPermanentWildflowers(4, 0.7);
          for (let k = 0; k < 24; k++) {
            const a = (k / 24) * Math.PI * 2;
            const r = 35 + Math.random() * 130;
            W.blooms.push({
              x: W.player.x + Math.cos(a) * r,
              y: W.player.y + Math.sin(a) * r * 0.85,
              u: W.player.dive,
              b: W.time,
              c: k % 4,
              e: W.time + 75,
            });
          }
        }
        checkAchFnRef.current();
        showToast(`🎶 DUET HARMONY: ${harmony.name}! ${harmony.desc}`);
      }
    }
    lastCastSpellRef.current = { id: spell.name, time: now };

    // Visual ring pulse themed per spell
    const ringColors: Record<string, string> = {
      star_sense: '#ffd23f',
      cloud_wings: '#8fd5ff',
      glimmer_step: '#7de0ff',
      frost_bridge: '#b8f2ff',
      tide_song: '#52d6c6',
      moon_pull: '#b48cff',
      bloom: '#ff9ebb',
      hush_hug: '#ff7aa8',
      ember_warmth: '#ff7b47',
      echo_call: '#ffd23f',
      dreamwalk: '#b48cff',
      dawn_break: '#ffd23f',
    };
    W.magicRings.push({
      x: W.player.x,
      y: W.player.y,
      t: 0,
      m: 1.0,
      r: spell.id === 'echo_call' || spell.id === 'dawn_break' ? 280 : 165,
      c: ringColors[spell.id] || '#ffd23f',
    });

    // Spell-specific environmental & player interactions
    if (spell.id === 'star_sense' || spell.id === 'weave') {
      W.starSenseTimer = upgrades.lens ? 36 : 20;
      W.echoTimer = Math.max(W.echoTimer, upgrades.lens ? 24 : 12);
      spawnBurst(['#ffd23f', '#fff3a8', '#ff9ebb'], 20, 105);
      if (!harmonyTriggered) {
        showToast(
          upgrades.lens
            ? '✨ Star Sense (Lens Boost): orbiting stars crown you & beacons reveal gems + Echoes!'
            : '✨ Star Sense: orbiting stars illuminate nearby treasures & Memory Echoes!'
        );
      }
    } else if (spell.id === 'glimmer_step' || spell.id === 'blink') {
      const oldX = W.player.x;
      const oldY = W.player.y;
      const rawDx = W.player.dx || 0;
      const rawDy = W.player.dy || 0;
      const dLen = Math.hypot(rawDx, rawDy);
      const stepX = dLen > 0.1 ? rawDx / dLen : W.player.face || 1;
      const stepY = dLen > 0.1 ? rawDy / dLen : 0;
      const maxJumpDist = 165;

      // Smart obstacle blink: check along the jump ray (furthest down to short hops) so you clear walls/rivers safely!
      let targetX = oldX;
      let targetY = oldY;
      for (const frac of [1.0, 0.85, 0.7, 0.55, 0.4, 0.25]) {
        const candX = Math.max(T * 1.5, Math.min((N - 1.5) * T, oldX + stepX * maxJumpDist * frac));
        const candY = Math.max(T * 1.5, Math.min((N - 1.5) * T, oldY + stepY * maxJumpDist * frac));
        if (!isPointSolidForBlink(candX, candY)) {
          targetX = candX;
          targetY = candY;
          break;
        }
      }

      // Auto-scoop any gems/pearls/feathers/spores/notes touched along the starlight blink path
      let scooped = 0;
      const scoopPool = W.player.sky
        ? [...W.feathers, ...W.rings]
        : W.player.dive
        ? W.pearls
        : W.player.glowdeep
        ? W.glowSpores
        : W.player.moonroad
        ? W.moonNotes
        : W.stars;

      for (let i = 0; i <= 12; i++) {
        const tFrac = i / 12;
        const px = oldX + (targetX - oldX) * tFrac;
        const py = oldY + (targetY - oldY) * tFrac;
        W.particles.push({
          x: px,
          y: py,
          vx: (Math.random() - 0.5) * 40,
          vy: (Math.random() - 0.5) * 40,
          l: 0.9,
          c: i % 2 === 0 ? '#ffd23f' : '#8fd5ff',
        });
        for (const item of scoopPool) {
          if (!item.got && Math.hypot(item.x - px, item.y - py) < 34) {
            item.got = 1;
            scooped++;
            const val = Math.round(3 * coinMult);
            setCoins((c) => c + val);
            setTotalCoins((c) => c + val);
          }
        }
      }

      W.player.x = targetX;
      W.player.y = targetY;
      W.player.dash = 0.16;
      W.magicRings.push({ x: targetX, y: targetY, t: 0, m: 0.75, r: 105, c: '#7de0ff' });
      spawnBurst(['#7de0ff', '#ffd23f', '#ffffff'], 16, 95, targetX, targetY);
      if (!harmonyTriggered) {
        showToast(
          scooped > 0
            ? `⚡ Glimmer Step: blinked cleanly & scooped up ${scooped} treasure${scooped > 1 ? 's' : ''}!`
            : '⚡ Glimmer Step: vaulted across the terrain in a flash of starlight!'
        );
      }
    } else if (spell.id === 'ember_warmth' || spell.id === 'warmth') {
      W.warmthTimer = 16;
      W.player.st = 100;
      const ptx = (W.player.x / T) | 0;
      const pty = (W.player.y / T) | 0;
      let melted = 0;
      let shattered = 0;

      for (let y = Math.max(1, pty - 5); y <= Math.min(N - 2, pty + 5); y++) {
        for (let x = Math.max(1, ptx - 5); x <= Math.min(N - 2, ptx + 5); x++) {
          const k = y * N + x;
          if (W.iceMap.has(k)) {
            W.iceMap.delete(k);
            melted++;
          }
          // Shatter brittle mossy boulders (DK=6) within ~2.6 tiles outside towns!
          if (isSurfaceLayer && W.DK[k] === 6 && W.TW[k] === 0 && Math.hypot(x - ptx, y - pty) <= 2.6) {
            W.DK[k] = 0;
            shattered++;
            const bx = x * T + T / 2;
            const by = y * T + T / 2;
            W.magicRings.push({ x: bx, y: by, t: 0, m: 0.65, r: 65, c: '#ff9f43' });
            spawnBurst(['#ff6b6b', '#ffd23f', '#b89f8d'], 12, 90, bx, by);
          }
        }
      }

      if (shattered > 0) {
        const rockCoins = Math.round(shattered * 6 * coinMult);
        setCoins((c) => c + rockCoins);
        setTotalCoins((c) => c + rockCoins);
      }

      if (weatherRef.current.currentWeather.id === 'snowy') {
        weatherRef.current.setWeather('sunny');
      }

      W.npcs.forEach((n) => {
        if (!n.tree && Math.hypot(n.x - W.player.x, n.y - W.player.y) < 280) {
          n.say = '🔥 Cozy fire! (+20% stride)';
          n.sayT = 3.4;
          n.wave = 1;
        }
      });
      sootheNearbyHollows(180);
      spawnBurst(['#ff6b6b', '#ffd23f', '#ff9f43'], 22, 105);
      if (!harmonyTriggered) {
        if (shattered > 0) {
          showToast(`🔥 Ember Warmth: shattered ${shattered} boulder${shattered > 1 ? 's' : ''} (+${Math.round(shattered * 6 * coinMult)} 🪙) & melted ${melted} ice!`);
        } else if (melted > 0) {
          showToast(`🔥 Ember Warmth: melted ${melted} ice tiles & ignited a swift fiery stride!`);
        } else {
          showToast('🔥 Ember Warmth: blazing +20% stride aura, stamina full & warm lantern glow!');
        }
      }
    } else if (spell.id === 'tide_song' || spell.id === 'glide') {
      W.tideTimer = 15;
      W.player.dash = 0.36;
      W.player.o2 = 100;
      if (weatherRef.current.currentWeather.id === 'drizzle') {
        weatherRef.current.setWeather('sunny');
      }

      // Surface shoreline pearls / open shells near water!
      let pearlCoins = 0;
      if (!W.player.sky && !W.player.glowdeep && !W.player.moonroad) {
        const ptx = (W.player.x / T) | 0;
        const pty = (W.player.y / T) | 0;
        let patches = 0;
        for (let y = Math.max(1, pty - 4); y <= Math.min(N - 2, pty + 4) && patches < 2; y++) {
          for (let x = Math.max(1, ptx - 4); x <= Math.min(N - 2, ptx + 4) && patches < 2; x++) {
            const k = y * N + x;
            if ((W.B[k] < 2 || W.DK[k] === 8) && !W.shakenTiles.has(k) && Math.hypot(x - ptx, y - pty) <= 4) {
              W.shakenTiles.add(k);
              patches++;
              const wx = x * T + T / 2;
              const wy = y * T + T / 2;
              spawnBurst(['#ffffff', '#8fd5ff', '#ffd23f'], 10, 75, wx, wy);
              pearlCoins += Math.round(4 * coinMult);
            }
          }
        }
        if (pearlCoins > 0) {
          setCoins((c) => c + pearlCoins);
          setTotalCoins((c) => c + pearlCoins);
        }
      }

      // Sprout temporary coastal blossoms around feet
      for (let k = 0; k < 8; k++) {
        const a = (k / 8) * Math.PI * 2;
        W.blooms.push({
          x: W.player.x + Math.cos(a) * 58,
          y: W.player.y + Math.sin(a) * 48,
          u: W.player.dive,
          b: W.time,
          c: 2,
          e: W.time + 35,
        });
      }

      spawnBurst(['#52d6c6', '#8fd5ff', '#ffffff'], 20, 100);
      if (!harmonyTriggered) {
        showToast(
          pearlCoins > 0
            ? `🌊 Tide Song: surfaced shoreline pearls (+${pearlCoins} 🪙), infinite O₂ & +35% speed!`
            : '🌊 Tide Song: infinite underwater air, +35% speed & calmed stormy skies!'
        );
      }
    } else if (spell.id === 'bloom') {
      W.bloomStepTimer = 14;
      W.player.st = 100;
      W.player.o2 = 100;
      const plantedCount = plantPermanentWildflowers(2, 0.55);
      const treeCoins = shakeNearbyFlora(135, 3, ['#ff9ebb', '#ffd23f', '#7bd88f']);
      for (let k = 0; k < 20; k++) {
        const a = (k / 20) * Math.PI * 2 + Math.random() * 0.25;
        const r = 24 + Math.random() * 115;
        W.blooms.push({
          x: W.player.x + Math.cos(a) * r,
          y: W.player.y + Math.sin(a) * r * 0.85,
          u: W.player.dive,
          b: W.time,
          c: k % 4,
          e: W.time + 60,
        });
      }
      spawnBurst(['#ff9ebb', '#ffd23f', '#7bd88f', '#b48cff'], 22, 100);
      sootheNearbyHollows(180);
      if (!harmonyTriggered) {
        if (treeCoins > 0) {
          showToast(`🌸 Bloom: shook loose +${treeCoins} 🪙, planted ${plantedCount} wildflowers & trailing petals!`);
        } else {
          showToast(`🌸 Bloom: planted ${plantedCount} wildflowers, flower footsteps active & stamina/air full!`);
        }
      }
    } else if (spell.id === 'cloud_wings' || spell.id === 'wings') {
      if (W.player.sky) {
        // Soft Petal Dive Landing when cast while flying!
        W.player.sky = false;
        W.player.dash = 0.2;
        triggerRealmFlash('#ffdfec', 0.28);
        W.magicRings.push({ x: W.player.x, y: W.player.y, t: 0, m: 0.9, r: 175, c: '#ff9ebb' });
        for (let k = 0; k < 10; k++) {
          const a = (k / 10) * Math.PI * 2;
          W.blooms.push({
            x: W.player.x + Math.cos(a) * 65,
            y: W.player.y + Math.sin(a) * 55,
            u: false,
            b: W.time,
            c: k % 4,
            e: W.time + 45,
          });
        }
        const treeCoins = shakeNearbyFlora(120, 2, ['#ffffff', '#ff9ebb', '#ffd23f']);
        if (treeCoins > 0) spawnWorldPopup(W.player.x, W.player.y - 26, `+${treeCoins} 🪙 🌿`, '#ffe875');
        spawnBurst(['#ffffff', '#8fd5ff', '#ff9ebb'], 20, 95);
        audio.pop();
        if (!harmonyTriggered) {
          showToast(
            treeCoins > 0
              ? `🌿 Petal Landing: touched down gently & rustled +${treeCoins} 🪙 from trees!`
              : '🌿 Petal Landing: touched down softly in a swirling blossom gust!'
          );
        }
        return;
      }
      W.player.sky = true;
      W.player.dive = false;
      W.player.dash = 0.26;
      triggerRealmFlash('#b8ecff', 0.34);
      spawnWorldPopup(W.player.x, W.player.y - 24, '☁️ Cirrus Sky', '#e6f6ff');
      spawnBurst(['#ffffff', '#8fd5ff', '#ffd23f'], 22, 110);
      if (!harmonyTriggered) showToast('☁️ Cloud Wings: launched skyward on a gale into Cirrus Kingdom!');
      if (!skyArrivedRef.current) {
        setSkyArrived(true);
        triggerCutscene('skyarr');
      }
    } else if (spell.id === 'hush_hug' || spell.id === 'hug') {
      W.hugTimer = 12;
      const soothedCount = sootheNearbyHollows(280);
      let huggedFriends = 0;
      let cheerBonus = 0;
      W.npcs.forEach((n) => {
        if (!n.tree && Math.hypot(n.x - W.player.x, n.y - W.player.y) < 300) {
          // Gently draw nearby NPC half-way closer to share a cozy wave & cheer
          n.tx = n.x + (W.player.x - n.x) * 0.45;
          n.ty = n.y + (W.player.y - n.y) * 0.45;
          n.wt = 4.5;
          if (!n.say && Math.random() < 0.75) {
            cheerBonus += 1;
          }
          n.say = '💖 Warm hug!';
          n.sayT = 3.8;
          n.wave = 1;
          huggedFriends++;
          spawnBurst(['#ff7aa8', '#ffb3c7', '#ffd23f'], 6, 55, n.x, n.y - 6);
        }
      });
      if (cheerBonus > 0) {
        const giftCoins = Math.round(Math.min(6, cheerBonus * 2) * coinMult);
        setCoins((c) => c + giftCoins);
        setTotalCoins((c) => c + giftCoins);
      }
      spawnBurst(['#ff7aa8', '#ff9ebb', '#ffd23f'], 22, 95);
      if (!harmonyTriggered) {
        if (soothedCount > 0) {
          showToast(`🤗 Hush Hug: Soothed ${soothedCount} Hollow${soothedCount > 1 ? 's' : ''} & activated orbiting Heart Aura!`);
        } else if (huggedFriends > 0) {
          showToast(`🤗 Hush Hug: ${huggedFriends} friend${huggedFriends > 1 ? 's' : ''} gathered close with cheers & heart regen!`);
        } else {
          showToast('🤗 Hush Hug: orbiting Heart Aura speeds mana & stamina recovery!');
        }
      }
    } else if (spell.id === 'frost_bridge' || spell.id === 'frost') {
      W.frostShieldTimer = 16;
      const tx = (W.player.x / T) | 0;
      const ty = (W.player.y / T) | 0;
      let waterFrozen = 0;
      // Freeze pond/channel around Mochi
      for (let y = ty - 5; y <= ty + 5; y++) {
        for (let x = tx - 5; x <= tx + 5; x++) {
          if (Math.hypot(x - tx, y - ty) <= 5.4 && x > 0 && y > 0 && x < N - 1 && y < N - 1 && W.B[y * N + x] < 2) {
            W.iceMap.set(y * N + x, W.time + 55);
            waterFrozen++;
          }
        }
      }
      // Also project a 7-tile forward ice bridge corridor in Mochi's facing direction!
      const rawDx = W.player.dx || W.player.face || 1;
      const rawDy = W.player.dy || 0;
      const dLen = Math.hypot(rawDx, rawDy) || 1;
      const fx = rawDx / dLen;
      const fy = rawDy / dLen;
      for (let step = 1; step <= 7; step++) {
        const bx = Math.round(tx + fx * step);
        const by = Math.round(ty + fy * step);
        for (let oy = -1; oy <= 1; oy++) {
          for (let ox = -1; ox <= 1; ox++) {
            const px = bx + ox;
            const py = by + oy;
            if (px > 0 && py > 0 && px < N - 1 && py < N - 1 && W.B[py * N + px] < 2 && !W.iceMap.has(py * N + px)) {
              W.iceMap.set(py * N + px, W.time + 55);
              waterFrozen++;
            }
          }
        }
      }
      if (waterFrozen === 0) {
        // Skateable 3x3 crystal rink underfoot when cast inland!
        for (let y = ty - 1; y <= ty + 1; y++) {
          for (let x = tx - 1; x <= tx + 1; x++) {
            if (x > 0 && y > 0 && x < N - 1 && y < N - 1) {
              W.iceMap.set(y * N + x, W.time + 55);
            }
          }
        }
      }
      spawnBurst(['#b8f2ff', '#ffffff', '#8fd5ff'], 20, 100);
      if (!harmonyTriggered) {
        if (waterFrozen > 0) {
          showToast(`❄️ Frost Bridge: froze ${waterFrozen} water tiles ahead & raised orbiting Frost Crystals!`);
        } else {
          showToast('❄️ Frost Bridge: Ice Skate pad & orbiting Frost Crystals shield Mochi (+speed)!');
        }
      }
    } else if (spell.id === 'moon_pull' || spell.id === 'pull') {
      W.moonPullTimer = 9.0;
      const groveCoins = shakeNearbyFlora(155, 2, ['#b48cff', '#e2d4ff', '#ffd23f']);
      spawnBurst(['#b48cff', '#e2d4ff', '#ffd23f'], 20, 95);
      if (!harmonyTriggered) {
        showToast(
          groveCoins > 0
            ? `🧲 Moon Pull: pulled loose +${groveCoins} 🪙 from groves & magnetizing treasures!`
            : '🧲 Moon Pull: gravity field draws distant gems, pearls, feathers & quest items!'
        );
      }
    } else if (spell.id === 'echo_call' || spell.id === 'echo') {
      W.echoTimer = 15;
      W.magicRings.push({ x: W.player.x, y: W.player.y, t: 0, m: 1.35, r: 340, c: '#8fd5ff' });
      sootheNearbyHollows(250);
      const foundLore = discoverNearbyMemoryAndDiary(185);
      W.npcs.forEach((n) => {
        if (!n.tree && Math.hypot(n.x - W.player.x, n.y - W.player.y) < 300) {
          n.say = '🔔 Such a sweet resonance!';
          n.sayT = 3.2;
          n.wave = 1;
        }
      });
      spawnBurst(['#ffd23f', '#8fd5ff', '#ff7aa8'], 20, 110);
      if (!harmonyTriggered) {
        if (foundLore.length > 0) {
          showToast(`🔔 Echo Call: recorded ${foundLore.join(', ')} into Journal (+${Math.round(15 * foundLore.length * coinMult)} 🪙)!`);
        } else {
          showToast('🔔 Echo Call: sonar wave chimes toward hidden Memory Echoes & Moon Diary Pages!');
        }
      }
    } else if (spell.id === 'dreamwalk') {
      W.dreamwalkTimer = 16;
      sootheNearbyHollows(220);
      spawnBurst(['#b48cff', '#ffd23f', '#e2f6ff'], 22, 100);
      const moonTeaTown = W.towns.find((t) => t.n === 'Moon’s Tea House');
      if (moonTeaTown && !moonTeaTown.vis) moonTeaTown.vis = 1;
      if (currentChapterRef.current >= 7) {
        if (W.player.moonroad) {
          const mx = W.moonGatePortal ? Math.round((W.moonGatePortal.x - T / 2) / T) : Math.round(N / 2);
          const my = W.moonGatePortal ? Math.round((W.moonGatePortal.y - T / 2) / T) : Math.round(N / 2);
          enterRealmLayer(0, mx, my);
          showToast('🌿 Dreamwalk: stepped through the Silver Gate with ghostly phase speed!');
        } else {
          enterRealmLayer(4, MOONROAD_SPAWN_TILE.x, MOONROAD_SPAWN_TILE.y);
          setVisitedMoonRoad(true);
          showToast('🌙 Dreamwalk: stepped onto the Moon Road! Ghost phase lets you walk through boulders!');
        }
      } else if (!harmonyTriggered) {
        showToast('🌙 Dreamwalk: ghostly Starlight Form! Pass through trees/rocks +32% speed!');
      }
      audio.duskWhistle?.();
    } else if (spell.id === 'dawn_break' || spell.id === 'sunburst') {
      W.dawnTimer = 18;
      W.starSenseTimer = Math.max(W.starSenseTimer, 24);
      W.player.st = 100;
      W.player.o2 = 100;
      // Melt surrounding ice + clear storms
      const ptx = (W.player.x / T) | 0;
      const pty = (W.player.y / T) | 0;
      for (let y = Math.max(1, pty - 6); y <= Math.min(N - 2, pty + 6); y++) {
        for (let x = Math.max(1, ptx - 6); x <= Math.min(N - 2, ptx + 6); x++) {
          W.iceMap.delete(y * N + x);
        }
      }
      plantPermanentWildflowers(3, 0.5);
      shakeNearbyFlora(160, 4, ['#ffd23f', '#ff9f43', '#ff7aa8']);
      for (let k = 0; k < 16; k++) {
        const a = (k / 16) * Math.PI * 2;
        W.blooms.push({
          x: W.player.x + Math.cos(a) * 90,
          y: W.player.y + Math.sin(a) * 78,
          u: W.player.dive,
          b: W.time,
          c: k % 4,
          e: W.time + 65,
        });
      }
      if (weatherRef.current.currentWeather.id === 'drizzle' || weatherRef.current.currentWeather.id === 'snowy') {
        weatherRef.current.setWeather('sunny');
      }
      sootheNearbyHollows(340);
      spawnBurst(['#ffd23f', '#ff9f43', '#ff7aa8', '#fff5b8'], 28, 130);
      if (currentChapterRef.current >= 12 && !lullabyDoneRef.current) {
        const finalePartner = W.npcs.find(
          (n) => (n.n === 'Aurelle' || n.n === 'Lantern Tree' || n.n === 'Wick') &&
            Math.hypot(n.x - W.player.x, n.y - W.player.y) < 190
        );
        if (finalePartner) {
          completeDawnDuetFinale();
          return;
        }
      }
      if (!harmonyTriggered) {
        showToast('🌅 Dawn Break: sunrise blooms flowers, melts ice, clears storms & magnetizes stars!');
      }
    } else if (spell.id === 'duet') {
      spawnBurst(['#ff7aa8', '#ffd23f'], 16, 85);
      showToast('🎶 Duet Harmony: harmonizing with your companion!');
      audio.harmonyChime?.();
    }
  };
  castSpellFnRef.current = handleCastSpell;

  // Fast-Travel via Song of Teleportation to an unlocked town center
  const handleTeleportToTown = useCallback(
    (town: Town) => {
      const W = worldRef.current;
      const teleportSpell = MAGIC_SPELLS.find((s) => s.id === 'teleport');
      const cost = teleportSpell?.cost ?? 25;

      if (town.vis !== 1) {
        showToast(`🔒 Visit ${town.n} in person first to unlock fast travel there!`);
        return;
      }

      if (W.player.mp < cost) {
        showToast(`Need ${cost} MP to sing the Song of Teleportation`);
        return;
      }

      W.player.mp -= cost;
      setMana(Math.round(W.player.mp));

      const destX = town.x * T + T / 2;
      const destY = town.y * T + T / 2;

      W.player.x = destX;
      W.player.y = destY;
      W.player.vx = 0;
      W.player.vy = 0;
      W.player.moveTarget = null;
      W.player.dash = 0;
      W.player.sky = town.w === 2;
      W.player.dive = town.w === 1;
      W.player.glowdeep = town.w === 3;
      W.player.moonroad = town.w === 4;
      W.companionPos.x = destX - 24;
      W.companionPos.y = destY + 4;
      snapCamera();
      triggerRealmFlash('#b48cff', 0.45);
      spawnWorldPopup(destX, destY - 26, `🌀 ${town.n}`, '#e8dcff', 1.25);
      if (town.w === 3) setVisitedGlowdeep(true);
      if (town.w === 4) setVisitedMoonRoad(true);

      setPlayerPos({
        x: destX,
        y: destY,
        sky: W.player.sky,
        dive: W.player.dive,
        glowdeep: W.player.glowdeep,
        moonroad: W.player.moonroad,
      });

      audio.teleportWarp();

      // Arrival Starway Chorus harmony check if Star Sense was just cast
      const now = performance.now() / 1000;
      if (lastCastSpellRef.current && now - lastCastSpellRef.current.time < 4.5 && lastCastSpellRef.current.id === 'Star Sense') {
        W.starSenseTimer = Math.max(W.starSenseTimer, 22);
        triggeredHarmoniesRef.current.add('Starway Chorus');
        checkAchFnRef.current();
        audio.harmonyChime('Starway Chorus');
        showToast(`🎶 DUET HARMONY: Starway Chorus at ${town.n}! ✨`);
      } else {
        showToast(`🌀 Sang Song of Teleportation to ${town.n}!`);
      }
      lastCastSpellRef.current = { id: 'Song of Teleportation', time: now };

      // Arrival visual magic ring + spiral sparkle burst
      W.magicRings.push({
        x: destX,
        y: destY,
        t: 0,
        m: 1.1,
        r: 190,
        c: '#b48cff',
      });
      for (let i = 0; i < 24; i++) {
        const a = (i / 24) * Math.PI * 2;
        const spd = 45 + (i % 3) * 35;
        W.particles.push({
          x: destX,
          y: destY,
          vx: Math.cos(a) * spd,
          vy: Math.sin(a) * spd,
          l: 1.1,
          c: ['#b48cff', '#ff7aa8', '#ffd23f', '#8fd5ff'][i % 4],
        });
      }

      setActiveModal('none');
    },
    [showToast, snapCamera, spawnWorldPopup, triggerRealmFlash]
  );

  // Soothe Hollows helper
  const sootheNearbyHollows = (radius: number): number => {
    const W = worldRef.current;
    let count = 0;
    W.hollows.forEach((h) => {
      if (!h.soothed) {
        const dist = Math.hypot(h.x - W.player.x, h.y - W.player.y);
        if (dist < radius) {
          h.soothed = true;
          h.bloomT = 1.0;
          count++;
          audio.hollowBloom?.();
          setCoins((c) => c + 15);
          setTotalCoins((c) => c + 15);
          spawnWorldPopup(h.x, h.y - 24, `💖 ${h.name} Soothed! +15 🪙`, '#ff9ebb', 1.3);
          for (let p = 0; p < 12; p++) {
            W.particles.push({
              x: h.x,
              y: h.y,
              vx: (Math.random() - 0.5) * 60,
              vy: -20 - Math.random() * 50,
              l: 1.0,
              c: '#ff7aa8',
            });
          }
        }
      }
    });
    if (count > 0) checkAchFnRef.current();
    return count;
  };

  // Music Cycling across all 15 composed themes + Mute
  const cycleMusic = () => {
    audio.init();
    const nextIdx = (currentTrackIdx + 1) % 16;
    setCurrentTrackIdx(nextIdx);
    audio.setTrack(nextIdx);
    const [icon, name] = MUSIC_TRACKS[nextIdx] || ['🎵', 'Adventure'];
    showToast(`🎵 Music: ${icon} ${name}`);
  };
  cycleMusicFnRef.current = cycleMusic;

  // Cutscene Trigger
  const triggerCutscene = (sceneKey: string) => {
    const slides = CUTSCENE_MOVIES[sceneKey];
    if (slides) {
      setActiveCutscene(slides);
      setUnlockedCutscenes((prev) => (prev.includes(sceneKey) ? prev : [...prev, sceneKey]));
    }
  };

  // Select Save Slot
  const handleSelectSlot = (slotNum: number) => {
    setCurrentSlot(slotNum);
    currentSlotRef.current = slotNum;
    try {
      localStorage.setItem(LOCAL_STORAGE_ACTIVE_SLOT_KEY, String(slotNum));
    } catch {}
    const key = LOCAL_STORAGE_SAVE_PREFIX + slotNum;
    const saved = localStorage.getItem(key) || (slotNum === 1 ? localStorage.getItem(LOCAL_STORAGE_LEGACY_SAVE) : null);
    if (saved) {
      try {
        const data = JSON.parse(saved);
        if (data.L) setPlayerLook(data.L);
        if (typeof data.coins === 'number') setCoins(data.coins);
        if (typeof data.tot === 'number') setTotalCoins(data.tot);
        if (typeof data.ch === 'number') setCurrentChapter(data.ch);
        if (data.done !== undefined) setLullabyDone(Boolean(data.done));
        if (data.skd !== undefined) setSkyStoryDone(Boolean(data.skd));
        if (data.vg) setVisitedGlowdeep(true);
        if (data.vm) setVisitedMoonRoad(true);
        if (Array.isArray(data.lore)) setLoreEntries(data.lore);
        if (Array.isArray(data.ach)) setUnlockedAchievements(data.ach);
        if (Array.isArray(data.mv)) setUnlockedCutscenes(data.mv);
        if (data.ug) setUpgrades(data.ug);
        if (data.fs) setFishLog(data.fs);
        if (data.cottage) setCottageState(data.cottage);
        if (Array.isArray(data.hamlet)) setHamletResidents(data.hamlet);
        if (Array.isArray(data.visTowns)) {
          worldRef.current.towns.forEach((t) => {
            if (data.visTowns.includes(t.n)) t.vis = 1;
          });
        }
        if (Array.isArray(data.qu)) {
          data.qu.forEach((sq: { t: string; st: number; c: number }) => {
            const q = worldRef.current.quests.find((item) => item.t === sq.t);
            if (q) {
              q.st = sq.st;
              q.c = sq.c;
            }
          });
        }
        if (Array.isArray(data.fr)) {
          worldRef.current.npcs.forEach((n) => {
            if (data.fr.includes(n.n)) {
              n.fr = true;
              n.h = n.h.map(() => 1);
            }
          });
        }
        if (data.pos && typeof data.pos.x === 'number' && typeof data.pos.y === 'number') {
          worldRef.current.player.x = data.pos.x;
          worldRef.current.player.y = data.pos.y;
          worldRef.current.player.sky = Boolean(data.pos.sky);
          worldRef.current.player.dive = Boolean(data.pos.dive);
          worldRef.current.player.glowdeep = Boolean(data.pos.glowdeep);
          worldRef.current.player.moonroad = Boolean(data.pos.moonroad);
          worldRef.current.companionPos.x = data.pos.x - 26;
          worldRef.current.companionPos.y = data.pos.y + 4;
          snapCamera();
        }
        showToast(`Loaded Slot ${slotNum}! ✨`);
      } catch (e) {}
    }
  };

  // Carry Over from Mochi Meadows 1
  const handleCarryOverMM1 = (code?: string) => {
    let legacyData: any = null;
    if (code) {
      try {
        legacyData = JSON.parse(atob(code));
      } catch (e) {
        showToast('Decoded custom save code! ✨');
      }
    } else {
      const raw = localStorage.getItem(LOCAL_STORAGE_LEGACY_SAVE);
      if (raw) {
        try {
          legacyData = JSON.parse(raw);
        } catch (e) {}
      }
    }

    // Grant exclusive First-Dream Scarf, Golden Note, and 100 Island Coins
    setCoins((c) => c + 100);
    setTotalCoins((c) => c + 100);
    setUpgrades((prev) => ({ ...prev, firstDreamScarf: 1, goldenNote: 1 }));
    if (legacyData?.L) {
      setPlayerLook((prev) => ({ ...prev, ...legacyData.L, hat: 'crown' }));
    }
    audio.chime();
    showToast('🌸 MM1 Carry-Over Blessing received! First-Dream Scarf & 100 coins!');
    setGameState('playing');
  };

  // Save game state (reads live refs so loop autosaves & beforeunload never serialize stale values)
  const handleSaveGame = useCallback(
    (showNotification: boolean = true) => {
      const W = worldRef.current;
      const slot = currentSlotRef.current;
      const snapshot = {
        L: playerLookRef.current,
        coins: coinsRef.current,
        tot: totalCoinsRef.current,
        ch: currentChapterRef.current,
        done: lullabyDoneRef.current,
        skd: skyStoryDoneRef.current,
        vg: visitedGlowdeepRef.current,
        vm: visitedMoonRoadRef.current,
        lore: loreEntriesRef.current,
        ach: unlockedAchievementsRef.current,
        mv: unlockedCutscenesRef.current,
        ug: upgradesRef.current,
        fs: fishLogRef.current,
        cottage: cottageStateRef.current,
        hamlet: hamletResidentsRef.current,
        visTowns: W.towns.filter((t) => t.vis === 1).map((t) => t.n),
        qu: W.quests.map((q) => ({ t: q.t, st: q.st, c: q.c })),
        fr: W.npcs.filter((n) => n.fr).map((n) => n.n),
        pos: {
          x: W.player.x,
          y: W.player.y,
          sky: W.player.sky,
          dive: W.player.dive,
          glowdeep: W.player.glowdeep,
          moonroad: W.player.moonroad,
        },
      };

      try {
        localStorage.setItem(LOCAL_STORAGE_ACTIVE_SLOT_KEY, String(slot));
        localStorage.setItem(LOCAL_STORAGE_SAVE_PREFIX + slot, JSON.stringify(snapshot));
        if (slot === 1) {
          localStorage.setItem(LOCAL_STORAGE_LEGACY_SAVE, JSON.stringify(snapshot));
        }
        if (showNotification) showToast(`Game saved to Slot ${slot}! 💾`);
      } catch (e) {
        if (showNotification) showToast('Saving failed');
      }
    },
    [showToast]
  );
  saveGameFnRef.current = handleSaveGame;

  // Save automatically when closing/reloading browser tab while playing
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (gameStateRef.current === 'playing' && settingsRef.current.auto) {
        saveGameFnRef.current(false);
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  // Keep game canvas backing resolution crisp and aligned with CSS viewport (no stretch or JSX resize flicker)
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      if (canvas) {
        const cw = canvas.parentElement?.clientWidth || window.innerWidth;
        const ch = canvas.parentElement?.clientHeight || window.innerHeight;
        const dpr = settingsRef.current.low ? 1 : deviceRef.current.pixelRatio || 1;
        const bw = Math.max(1, Math.round(cw * dpr));
        const bh = Math.max(1, Math.round(ch * dpr));
        if (canvas.width !== bw) canvas.width = bw;
        if (canvas.height !== bh) canvas.height = bh;
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, [device.width, device.height, device.orientation, device.pixelRatio, settings.low]);

  // Main Canvas Game Loop (mounted once with live refs — zero loop teardowns on state changes)
  useEffect(() => {
    let animId: number;
    let lastTime = performance.now();

    const loop = (now: number) => {
      if (document.hidden) {
        lastTime = now;
        animId = requestAnimationFrame(loop);
        return;
      }

      const dt = Math.max(0, Math.min(0.05, (now - lastTime) / 1000));
      lastTime = now;
      const W = worldRef.current;
      const liveUpgrades = upgradesRef.current;
      const liveSettings = settingsRef.current;
      const lowQ = Boolean(liveSettings.low);
      const liveDevice = deviceRef.current;
      const dpr = lowQ ? 1 : liveDevice.pixelRatio || 1;
      const viewScale = liveDevice.viewScale || 1;
      W.time += dt;

      // Update Weather System simulation in zoomed world-view coordinates
      const canvasEl = canvasRef.current;
      const logicalW = canvasEl ? canvasEl.clientWidth || liveDevice.width : liveDevice.width;
      const logicalH = canvasEl ? canvasEl.clientHeight || liveDevice.height : liveDevice.height;
      weatherRef.current.update(
        dt,
        logicalW / viewScale,
        logicalH / viewScale,
        W.player.dive
      );

      // Update NPC Weather Behavior (dancing in sun, sheltering under trees in rain, floating in stardust/aurora, shivering in snow)
      updateNPCWeatherBehavior(W.npcs, weatherRef.current.currentWeather.id, W.time, dt);

      // Update audio biome & HUD realm location (diff-guarded so React only updates on actual change)
      const tileX = (W.player.x / T) | 0;
      const tileY = (W.player.y / T) | 0;
      let curB = 3;
      if (tileX >= 0 && tileY >= 0 && tileX < N && tileY < N) {
        curB = W.B[tileY * N + tileX];
        let nextBiome: string;
        if (W.player.glowdeep) {
          audio.setBiome(8);
          nextBiome = 'Glowdeep Caverns';
        } else if (W.player.moonroad) {
          audio.setBiome(7);
          nextBiome = 'The Moon Road';
        } else {
          audio.setBiome(W.player.sky ? 2 : curB);
          nextBiome = W.player.sky ? 'Cirrus Sky Kingdom' : BIOME_NAMES[curB];
        }
        if (hudSyncRef.current.biome !== nextBiome) {
          hudSyncRef.current.biome = nextBiome;
          setCurrentBiomeName(nextBiome);
        }
      }

      // 1. Player Movement & Input handling (freeze cleanly when modal or cutscene is open)
      const isControlLocked =
        gameStateRef.current !== 'playing' ||
        activeModalRef.current !== 'none' ||
        activeCutsceneRef.current !== null;

      let ix = 0;
      let iy = 0;
      let touchSprint = false;

      if (isControlLocked) {
        if (W.keys.size > 0) W.keys.clear();
        W.touchJoystick.active = false;
        W.player.moveTarget = null;
      } else {
        if (W.keys.has('d') || W.keys.has('arrowright')) ix += 1;
        if (W.keys.has('a') || W.keys.has('arrowleft')) ix -= 1;
        if (W.keys.has('s') || W.keys.has('arrowdown')) iy += 1;
        if (W.keys.has('w') || W.keys.has('arrowup')) iy -= 1;

        if (W.touchJoystick.active) {
          const jx = W.touchJoystick.curX - W.touchJoystick.startX;
          const jy = W.touchJoystick.curY - W.touchJoystick.startY;
          const dist = Math.hypot(jx, jy);
          if (dist > 6) {
            const normX = jx / dist;
            const normY = jy / dist;
            const strength = Math.min(1, dist / 42);
            ix += normX * strength;
            iy += normY * strength;
            if (strength > 0.88) {
              touchSprint = true;
            }
          }
        }

        // Manual directional input overrides click-to-move destination
        if (Math.hypot(ix, iy) > 0.05) {
          W.player.moveTarget = null;
        } else if (W.player.moveTarget) {
          const tx = W.player.moveTarget.x - W.player.x;
          const ty = W.player.moveTarget.y - W.player.y;
          const tDist = Math.hypot(tx, ty);
          if (tDist < 9) {
            W.player.moveTarget = null;
          } else {
            ix = tx / tDist;
            iy = ty / tDist;
          }
        }
      }

      const len = Math.hypot(ix, iy);
      if (len > 0) {
        ix /= len;
        iy /= len;
        W.player.dx = ix;
        W.player.dy = iy;
        if (Math.abs(ix) > 0.15) W.player.face = ix > 0 ? 1 : -1;
      }

      const isRunning = (W.keys.has('shift') || touchSprint) && len > 0 && W.player.st > 0 && !W.player.dive;
      let baseSpeed = 158 * (liveUpgrades.boots ? 1.14 : 1);
      if (W.player.dive) baseSpeed = 130;
      if (W.player.sky) baseSpeed = 198;

      // Surface Dunes / Frostbite Tundra terrain feel (Cozy Scarf grants smooth traction boost)
      const isSurface = !W.player.sky && !W.player.dive && !W.player.glowdeep && !W.player.moonroad;
      if (isSurface && (curB === 6 || curB === 7)) {
        baseSpeed *= liveUpgrades.cozy_scarf ? 1.04 : 0.94;
      }

      // Active spell speed boosts, trails & buffs
      if (W.tideTimer > 0) {
        W.tideTimer = Math.max(0, W.tideTimer - dt);
        baseSpeed *= 1.35;
      }
      if (W.dreamwalkTimer > 0) {
        W.dreamwalkTimer = Math.max(0, W.dreamwalkTimer - dt);
        baseSpeed *= 1.32;
        if (len > 0 && Math.random() < 0.35 && W.particles.length < 180) {
          W.particles.push({
            x: W.player.x + (Math.random() - 0.5) * 14,
            y: W.player.y + (Math.random() - 0.5) * 10,
            vx: -ix * 25,
            vy: -iy * 25 - 10,
            l: 0.65,
            c: Math.random() > 0.5 ? '#b48cff' : '#ffd23f',
          });
        }
      }
      if (W.warmthTimer > 0) {
        W.warmthTimer = Math.max(0, W.warmthTimer - dt);
        baseSpeed *= 1.2;
        if (len > 0 && Math.random() < 0.3 && W.particles.length < 180) {
          W.particles.push({
            x: W.player.x + (Math.random() - 0.5) * 12,
            y: W.player.y + 8,
            vx: -ix * 20,
            vy: -14 - Math.random() * 14,
            l: 0.5,
            c: Math.random() > 0.5 ? '#ff7b47' : '#ffd23f',
          });
        }
      }
      if (W.frostShieldTimer > 0) {
        W.frostShieldTimer = Math.max(0, W.frostShieldTimer - dt);
        baseSpeed *= 1.15;
        if (len > 0 && Math.random() < 0.25 && W.particles.length < 180) {
          W.particles.push({
            x: W.player.x + (Math.random() - 0.5) * 16,
            y: W.player.y + 6,
            vx: -ix * 18,
            vy: -10,
            l: 0.55,
            c: '#b8f2ff',
          });
        }
      }
      if (W.bloomStepTimer > 0) {
        W.bloomStepTimer = Math.max(0, W.bloomStepTimer - dt);
        W.bloomStepCooldown = Math.max(0, W.bloomStepCooldown - dt);
        W.player.st = Math.min(100, W.player.st + 12 * dt);
        if (len > 0 && W.bloomStepCooldown <= 0) {
          W.bloomStepCooldown = 0.16;
          W.blooms.push({
            x: W.player.x + (Math.random() - 0.5) * 14,
            y: W.player.y + 8 + (Math.random() - 0.5) * 6,
            u: W.player.dive,
            b: W.time,
            c: (Math.random() * 4) | 0,
            e: W.time + 22,
          });
        }
      }
      if (W.hugTimer > 0) {
        W.hugTimer = Math.max(0, W.hugTimer - dt);
        W.player.mp = Math.min(100, W.player.mp + 6 * dt);
        W.player.st = Math.min(100, W.player.st + 10 * dt);
      }
      if (W.echoTimer > 0) W.echoTimer = Math.max(0, W.echoTimer - dt);
      if (W.dawnTimer > 0) {
        W.dawnTimer = Math.max(0, W.dawnTimer - dt);
        baseSpeed *= 1.25;
      }

      const curTileIdx = tileY * N + tileX;
      const onFrozenIce = !W.player.sky && !W.player.dive && W.iceMap.has(curTileIdx) && W.iceMap.get(curTileIdx)! > W.time;
      if (onFrozenIce) {
        baseSpeed *= 1.45;
      }

      if (isRunning) {
        baseSpeed *= 1.72;
        W.player.st = Math.max(0, W.player.st - 34 * dt);
      } else {
        W.player.st = Math.min(100, W.player.st + 24 * dt);
      }

      if (W.player.cd > 0) W.player.cd -= dt;

      if (W.player.dash > 0) {
        const prevDashBucket = Math.floor(W.player.dash * 24);
        W.player.dash -= dt;
        if (W.player.dash > 0 && Math.floor(W.player.dash * 24) !== prevDashBucket) {
          W.dashGhosts.push({ x: W.player.x, y: W.player.y, face: W.player.face, alpha: 0.42 });
          if (W.dashGhosts.length > 8) W.dashGhosts.shift();
        }
        baseSpeed = 510;
        ix = W.player.dx;
        iy = W.player.dy;
      }

      // Smooth velocity acceleration / deceleration curve
      const desiredVx = len > 0 || W.player.dash > 0 ? ix * baseSpeed : 0;
      const desiredVy = len > 0 || W.player.dash > 0 ? iy * baseSpeed : 0;
      const accelRate = W.player.dash > 0 ? 32 : len > 0 ? 18 : 15;
      const blend = Math.min(1, accelRate * dt);
      W.player.vx += (desiredVx - W.player.vx) * blend;
      W.player.vy += (desiredVy - W.player.vy) * blend;

      // Solid obstacle collision with clean wall-sliding (Dreamwalk phases through obstacles!)
      const isTileSolid = (tx: number, ty: number) => {
        if (tx < 1 || ty < 1 || tx >= N - 1 || ty >= N - 1) return true;
        if (W.dreamwalkTimer > 0) return false;
        if (W.player.glowdeep) {
          return !isGlowdeepWalkable(tx, ty);
        }
        if (W.player.moonroad) {
          return !isMoonRoadWalkable(tx, ty);
        }
        const idx = ty * N + tx;
        if (W.player.sky) {
          const sd = W.SD[idx];
          return sd === 1 || sd === 9;
        }
        if (W.player.dive) {
          return W.B[idx] > 1 || W.UD[idx] === 5 || W.UD[idx] === 6;
        }
        const dk = W.DK[idx];
        return (
          dk === 2 ||
          dk === 4 ||
          dk === 5 ||
          dk === 6 ||
          dk === 7 ||
          dk === 10 ||
          dk === 11 ||
          dk === 13 ||
          dk === 14 ||
          dk === 16
        );
      };

      const isPosBlocked = (px: number, py: number) => {
        const fy = py + 5;
        const rx = 8;
        const ry = 5;
        return (
          isTileSolid(((px - rx) / T) | 0, ((fy - ry) / T) | 0) ||
          isTileSolid(((px + rx) / T) | 0, ((fy - ry) / T) | 0) ||
          isTileSolid(((px - rx) / T) | 0, ((fy + ry) / T) | 0) ||
          isTileSolid(((px + rx) / T) | 0, ((fy + ry) / T) | 0)
        );
      };

      const stepX = Math.max(T, Math.min((N - 1) * T, W.player.x + W.player.vx * dt));
      const stepY = Math.max(T, Math.min((N - 1) * T, W.player.y + W.player.vy * dt));
      const currentlyStuck = isPosBlocked(W.player.x, W.player.y);

      if (currentlyStuck || !isPosBlocked(stepX, W.player.y)) {
        W.player.x = stepX;
      } else {
        W.player.vx = 0;
        if (W.player.moveTarget && Math.abs(stepX - W.player.x) > 0.1 && Math.abs(W.player.vy) < 5) {
          W.player.moveTarget = null;
        }
      }

      if (currentlyStuck || !isPosBlocked(W.player.x, stepY)) {
        W.player.y = stepY;
      } else {
        W.player.vy = 0;
        if (W.player.moveTarget && Math.abs(stepY - W.player.y) > 0.1 && Math.abs(W.player.vx) < 5) {
          W.player.moveTarget = null;
        }
      }

      const actualSpeed = Math.hypot(W.player.vx, W.player.vy);
      W.player.isMoving = actualSpeed > 18;

      // Biome-reactive footsteps & water ripples
      if (W.player.isMoving && !W.player.sky && !isControlLocked) {
        W.footstepTimer -= dt * (isRunning ? 1.6 : 1);
        if (W.footstepTimer <= 0) {
          W.footstepTimer = W.player.dive ? 0.28 : 0.22;
          if (isSurface && curB < 2 && !onFrozenIce) {
            W.magicRings.push({
              x: W.player.x,
              y: W.player.y + 8,
              t: 0,
              m: 0.45,
              r: 16,
              c: 'rgba(215, 248, 255, 0.72)',
            });
          } else if (W.particles.length < 180) {
            const stepColor = W.player.dive
              ? '#d4f6ff'
              : W.player.glowdeep
              ? '#78f5c8'
              : W.player.moonroad
              ? '#e2d4ff'
              : onFrozenIce || curB === 7
              ? '#e8f8ff'
              : curB === 6 || curB === 2
              ? '#f4d79b'
              : curB === 5
              ? '#ffb3c7'
              : '#ddf2cc';
            W.particles.push({
              x: W.player.x + (Math.random() - 0.5) * 6,
              y: W.player.y + 8,
              vx: (Math.random() - 0.5) * 14,
              vy: W.player.dive ? -22 - Math.random() * 14 : -10 - Math.random() * 8,
              l: 0.36,
              c: stepColor,
            });
          }
        }
      } else {
        W.footstepTimer = 0.05;
      }

      // Smooth spring-follow camera with subtle velocity look-ahead
      if (!W.camera.initialized) {
        W.camera.x = W.player.x;
        W.camera.y = W.player.y;
        W.camera.initialized = true;
      } else {
        const targetCamX = W.player.x + W.player.vx * 0.04;
        const targetCamY = W.player.y + W.player.vy * 0.04;
        const camLerp = Math.min(1, 14 * dt);
        W.camera.x += (targetCamX - W.camera.x) * camLerp;
        W.camera.y += (targetCamY - W.camera.y) * camLerp;
      }

      // Smooth spring-follow for adopted Companion Buddy
      const targetCompX = W.player.x - W.player.face * 26;
      const targetCompY = W.player.y + 4;
      const compFollow = Math.min(1, 6.2 * dt);
      W.companionPos.x += (targetCompX - W.companionPos.x) * compFollow;
      W.companionPos.y += (targetCompY - W.companionPos.y) * compFollow;

      // Natural Mana regeneration
      W.player.mp = Math.min(100, W.player.mp + (liveUpgrades.crys ? 14 : 9) * dt);

      // Diving oxygen handling (Tide Song grants infinite underwater air!)
      if (W.player.dive && W.tideTimer <= 0) {
        W.player.o2 = Math.max(0, W.player.o2 - 7 * dt);
        if (W.player.o2 <= 0) {
          W.player.dive = false;
          triggerRealmFlash('#8cebff', 0.3);
          spawnWorldPopup(W.player.x, W.player.y - 22, '🌊 Surfaced!', '#b8f2ff');
          showToast('Out of air! Surfaced gently 🌊');
        }
      } else {
        W.player.o2 = Math.min(100, W.player.o2 + 40 * dt);
      }

      // Diff-guarded React HUD sync (prevents 60-FPS unconditional re-render storms)
      const stInt = Math.round(W.player.st);
      if (stInt !== hudSyncRef.current.st) {
        hudSyncRef.current.st = stInt;
        setStamina(stInt);
      }
      const o2Int = Math.round(W.player.o2);
      if (o2Int !== hudSyncRef.current.o2) {
        hudSyncRef.current.o2 = o2Int;
        setAir(o2Int);
      }
      const mpInt = Math.round(W.player.mp);
      if (mpInt !== hudSyncRef.current.mp) {
        hudSyncRef.current.mp = mpInt;
        setMana(mpInt);
      }

      const layerKey = W.player.sky
        ? 'sky'
        : W.player.dive
        ? 'dive'
        : W.player.glowdeep
        ? 'glow'
        : W.player.moonroad
        ? 'moon'
        : 'surf';
      const pxQuant = Math.round(W.player.x / 16);
      const pyQuant = Math.round(W.player.y / 16);
      const mapOrTeleportOpen = activeModalRef.current === 'map' || activeModalRef.current === 'teleport';
      if (
        layerKey !== hudSyncRef.current.layerKey ||
        pxQuant !== hudSyncRef.current.pxQuant ||
        pyQuant !== hudSyncRef.current.pyQuant ||
        (mapOrTeleportOpen && actualSpeed > 2)
      ) {
        hudSyncRef.current.layerKey = layerKey;
        hudSyncRef.current.pxQuant = pxQuant;
        hudSyncRef.current.pyQuant = pyQuant;
        setPlayerPos({
          x: W.player.x,
          y: W.player.y,
          sky: W.player.sky,
          dive: W.player.dive,
          glowdeep: W.player.glowdeep,
          moonroad: W.player.moonroad,
        });
      }

      // Dawn Break magnetic starlight + Moon Pull attraction toward player
      const pickupRadBonus = W.dawnTimer > 0 ? 34 : 0;
      if (W.moonPullTimer > 0 || W.dawnTimer > 0) {
        if (W.moonPullTimer > 0) W.moonPullTimer = Math.max(0, W.moonPullTimer - dt);
        const pullPool: { x: number; y: number; got: number }[] = W.player.sky
          ? W.feathers
          : W.player.dive
          ? W.pearls
          : W.player.glowdeep
          ? W.glowSpores
          : W.player.moonroad
          ? W.moonNotes
          : [...W.stars, ...W.questItems.filter((qi) => qi.w === 0)];
        const pullRadius = W.moonPullTimer > 0 ? 560 : 180;
        const pullSpeed = (W.moonPullTimer > 0 ? 410 : 210) * dt;
        for (const item of pullPool) {
          if (item.got) continue;
          const dx = W.player.x - item.x;
          const dy = W.player.y - item.y;
          const dist = Math.hypot(dx, dy);
          if (dist > 4 && dist < pullRadius) {
            item.x += (dx / dist) * pullSpeed;
            item.y += (dy / dist) * pullSpeed;
          }
        }
      }

      // 2. Collectibles (Stars, Quest Items, Pearls, Feathers, Rings, Glowdeep Spores, Moon Road Notes)
      const coinMult = liveUpgrades.clover ? 1.5 : 1;
      if (!W.player.sky && !W.player.dive && !W.player.glowdeep && !W.player.moonroad) {
        for (const s of W.stars) {
          if (!s.got && Math.hypot(s.x - W.player.x, s.y - W.player.y) < 28 + pickupRadBonus) {
            s.got = 1;
            const gain = Math.round(3 * coinMult);
            setCoins((c) => c + gain);
            setTotalCoins((c) => c + 3);
            audio.chime();
            spawnWorldPopup(s.x, s.y - 12, `+${gain} 🪙 ⭐`, '#ffe875');
            showToast('Found a Star Gem! ✨');
            checkAchFnRef.current();
          }
        }
        for (const qi of W.questItems) {
          if (!qi.got && qi.w === 0 && Math.hypot(qi.x - W.player.x, qi.y - W.player.y) < 30) {
            qi.got = 1;
            qi.q.c = (qi.q.c || 0) + 1;
            audio.chime();
            spawnWorldPopup(qi.x, qi.y - 12, `✨ ${qi.q.it}`, '#b8f2ff');
            if (qi.q.st === 1 && qi.q.c >= (qi.q.n || 1)) {
              qi.q.st = 2;
              showToast(`🎁 Gathered all ${qi.q.it}! Return to ${qi.q.g}!`);
            } else {
              showToast(`✨ Found ${qi.q.it}! (${qi.q.c}/${qi.q.n || 1})`);
            }
          }
        }
      } else if (W.player.dive) {
        for (const p of W.pearls) {
          if (!p.got && Math.hypot(p.x - W.player.x, p.y - W.player.y) < 26) {
            p.got = 1;
            W.player.o2 = 100;
            const gain = Math.round(4 * coinMult);
            setCoins((c) => c + gain);
            setTotalCoins((c) => c + 4);
            audio.chime();
            spawnWorldPopup(p.x, p.y - 12, `+${gain} 🪙 🐚`, '#b8f2ff');
            showToast('Gathered a luminous Pearl! Air restored 🐚');
            checkAchFnRef.current();
          }
        }
      } else if (W.player.sky) {
        for (const f of W.feathers) {
          if (!f.got && Math.hypot(f.x - W.player.x, f.y - W.player.y) < 30) {
            f.got = 1;
            const gain = Math.round(2 * coinMult);
            setCoins((c) => c + gain);
            setTotalCoins((c) => c + 2);
            audio.chime();
            spawnWorldPopup(f.x, f.y - 12, `+${gain} 🪙 🪶`, '#fff7d6');
            showToast('Found a Cloud Feather! 🪶');
            checkAchFnRef.current();
          }
        }
        for (const r of W.rings) {
          if (!r.got && Math.hypot(r.x - W.player.x, r.y - W.player.y) < 40) {
            r.got = 1;
            W.player.dash = 0.35;
            const gain = Math.round(5 * coinMult);
            setCoins((c) => c + gain);
            audio.chime();
            spawnWorldPopup(r.x, r.y - 14, `🌈 +${gain} 🪙`, '#ff9ebb');
            showToast('Zoomed through a Rainbow Ring! 🌈');
          }
        }
      } else if (W.player.glowdeep) {
        for (const sp of W.glowSpores) {
          if (!sp.got && Math.hypot(sp.x - W.player.x, sp.y - W.player.y) < 30) {
            sp.got = 1;
            const gain = Math.round(4 * coinMult);
            setCoins((c) => c + gain);
            setTotalCoins((c) => c + 4);
            audio.chime();
            spawnWorldPopup(sp.x, sp.y - 12, `+${gain} 🪙 🍄`, '#64f5c1');
            const soupQ = W.quests.find((q) => q.t === 'Soup of Remembering');
            if (soupQ) {
              soupQ.c = (soupQ.c || 0) + 1;
              if (soupQ.st === 1 && soupQ.c >= (soupQ.n || 5)) {
                soupQ.st = 2;
                showToast('🍲 Enough Glowcap Spores! Return to Lumi in Glowdeep!');
              } else {
                showToast(`🍄 Gathered a Glowcap Spore! (${Math.min(soupQ.c, soupQ.n || 5)}/${soupQ.n || 5})`);
              }
            } else {
              showToast('🍄 Gathered a glowing Spore!');
            }
          }
        }
      } else if (W.player.moonroad) {
        for (const mn of W.moonNotes) {
          if (!mn.got && Math.hypot(mn.x - W.player.x, mn.y - W.player.y) < 30) {
            mn.got = 1;
            const gain = Math.round(5 * coinMult);
            setCoins((c) => c + gain);
            setTotalCoins((c) => c + 5);
            audio.chime();
            spawnWorldPopup(mn.x, mn.y - 12, `+${gain} 🪙 ♪`, '#e2d4ff');
            showToast('♪ Gathered a Starlight Note! ✨');
          }
        }
      }

      // Check nearby NPC on current layer (diff-guarded state sync)
      let nearest: NPC | null = null;
      let minDist = 110;
      for (const n of W.npcs) {
        const sameLayer = W.player.sky
          ? Boolean(n.sky)
          : W.player.dive
          ? Boolean(n.sea)
          : W.player.glowdeep
          ? Boolean(n.glowdeep)
          : W.player.moonroad
          ? Boolean(n.moonroad)
          : !n.sky && !n.sea && !n.glowdeep && !n.moonroad;
        if (sameLayer) {
          const d = Math.hypot(n.x - W.player.x, n.y - W.player.y);
          if (d < minDist) {
            minDist = d;
            nearest = n;
          }
        }
      }
      if (nearest !== hudSyncRef.current.npc) {
        hudSyncRef.current.npc = nearest;
        setActiveNpc(nearest);
      }

      // Unlock visited Town Centers when entering their square on the matching layer
      for (const town of W.towns) {
        if (town.vis === 1) continue;
        const onTownLayer =
          (town.w === 0 && !W.player.sky && !W.player.dive && !W.player.glowdeep && !W.player.moonroad) ||
          (town.w === 1 && W.player.dive) ||
          (town.w === 2 && W.player.sky) ||
          (town.w === 3 && W.player.glowdeep) ||
          (town.w === 4 && W.player.moonroad);
        if (!onTownLayer) continue;

        const tx = town.x * T + T / 2;
        const ty = town.y * T + T / 2;
        const unlockRadius = town.w >= 3 ? 210 : town.w === 2 ? 320 : 300;
        if (Math.hypot(W.player.x - tx, W.player.y - ty) < unlockRadius) {
          town.vis = 1;
          audio.chime();
          W.magicRings.push({ x: tx, y: ty, t: 0, m: 1.0, r: 160, c: '#7bd88f' });
          spawnWorldPopup(tx, ty - 28, `🏘️ ${town.n} Unlocked!`, '#9be8a8', 1.5);
          showToast(`🏘️ Town Center Unlocked: ${town.n}! Fast travel ready via Song of Teleportation 🌀`);
          break;
        }
      }

      // Periodically evaluate story progression milestones & achievements (~every 2s)
      if (Math.floor(W.time * 0.5) !== Math.floor((W.time - dt) * 0.5)) {
        evalStoryFnRef.current();
        checkAchFnRef.current();
      }

      // Autosave every 15s if playing
      if (liveSettings.auto && gameStateRef.current === 'playing' && W.time - W.lastSaveTime > 15) {
        W.lastSaveTime = W.time;
        saveGameFnRef.current(false);
      }

      // Throttle full canvas redraw when modal or cutscene covers screen (~15 FPS background saves CPU/GPU)
      const modalCovering = activeModalRef.current !== 'none' || activeCutsceneRef.current !== null;
      if (modalCovering && now - hudSyncRef.current.lastModalDrawMs < 65) {
        animId = requestAnimationFrame(loop);
        return;
      }
      hudSyncRef.current.lastModalDrawMs = now;

      // 3. Render Canvas
      const canvas = canvasRef.current;
      if (canvas) {
        const w = canvas.clientWidth || logicalW;
        const h = canvas.clientHeight || logicalH;
        const bw = Math.max(1, Math.round(w * dpr));
        const bh = Math.max(1, Math.round(h * dpr));
        if (canvas.width !== bw) canvas.width = bw;
        if (canvas.height !== bh) canvas.height = bh;

        const ctx = canvas.getContext('2d', { alpha: false });
        if (ctx) {
          ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

          const vw = w / viewScale;
          const vh = h / viewScale;
          const cx = W.camera.x - vw / 2;
          const cy = W.camera.y - vh / 2;

          // Scaled World-Viewport Camera Frame (keeps proportions consistent from phones to ultrawides)
          ctx.save();
          ctx.scale(viewScale, viewScale);

          // Rich Layer Backdrop (Ocean / Stratosphere / Abyssal Reef / Glowdeep / Moon Road)
          renderLayerBackdrop(
            ctx,
            vw,
            vh,
            cx,
            cy,
            W.time,
            W.player.sky,
            W.player.dive,
            W.player.glowdeep,
            W.player.moonroad
          );

          ctx.save();
          ctx.translate(-cx, -cy);

          // Visible Tile Bounds
          const startX = Math.max(0, Math.floor(cx / T));
          const endX = Math.min(N - 1, Math.ceil((cx + vw) / T));
          const startY = Math.max(0, Math.floor(cy / T));
          const endY = Math.min(N - 1, Math.ceil((cy + vh) / T));

          // 1. Rich Terrain Layer + Collect Y-sorted Props across all 5 Realms
          let propItems: YSortableItem[] = [];
          if (W.player.sky) {
            renderSkyTerrain(ctx, W, startX, endX, startY, endY);
            propItems = collectSkyPropDrawables(ctx, W, startX, endX, startY, endY);
          } else if (W.player.dive) {
            renderReefTerrain(ctx, W, startX, endX, startY, endY);
            propItems = collectReefPropDrawables(ctx, W, startX, endX, startY, endY);
          } else if (W.player.glowdeep) {
            renderGlowdeepTerrain(ctx, W, startX, endX, startY, endY);
            propItems = collectGlowdeepPropDrawables(ctx, W, startX, endX, startY, endY);
          } else if (W.player.moonroad) {
            renderMoonRoadTerrain(ctx, W, startX, endX, startY, endY);
            propItems = collectMoonRoadPropDrawables(ctx, W, startX, endX, startY, endY);
          } else {
            renderTerrainLayer(ctx, W, startX, endX, startY, endY);
            propItems = [
              ...collectSurfacePropDrawables(ctx, W, startX, endX, startY, endY),
              ...collectGroundPortalDrawables(W, ctx),
            ];
          }

          // Click-to-move destination marker on ground
          if (W.player.moveTarget) {
            const mt = W.player.moveTarget;
            const ringR = 11 + Math.sin(W.time * 7) * 2.5;
            ctx.save();
            ctx.strokeStyle = 'rgba(255, 122, 168, 0.85)';
            ctx.lineWidth = 2.2;
            ctx.beginPath();
            ctx.ellipse(mt.x, mt.y + 4, ringR, ringR * 0.55, 0, 0, Math.PI * 2);
            ctx.stroke();
            ctx.fillStyle = '#ffd23f';
            ctx.beginPath();
            ctx.arc(mt.x, mt.y + 4, 3, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
          }

          // 2. Active Spell Auras around Player (Dawn Break / Warmth / Dreamwalk / Tide / Moon Pull)
          if (W.dawnTimer > 0) {
            ctx.save();
            const grad = ctx.createRadialGradient(W.player.x, W.player.y, 12, W.player.x, W.player.y, 210);
            grad.addColorStop(0, 'rgba(255, 232, 128, 0.38)');
            grad.addColorStop(0.7, 'rgba(255, 178, 122, 0.16)');
            grad.addColorStop(1, 'rgba(255, 210, 63, 0)');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(W.player.x, W.player.y, 210, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = 'rgba(255, 215, 90, 0.7)';
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.arc(W.player.x, W.player.y, 180 + Math.sin(W.time * 4) * 6, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
          }

          if (W.warmthTimer > 0) {
            ctx.save();
            const grad = ctx.createRadialGradient(W.player.x, W.player.y, 10, W.player.x, W.player.y, 145);
            grad.addColorStop(0, 'rgba(255, 160, 75, 0.36)');
            grad.addColorStop(1, 'rgba(255, 107, 107, 0)');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(W.player.x, W.player.y, 145, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
          }

          if (W.dreamwalkTimer > 0) {
            ctx.save();
            ctx.strokeStyle = 'rgba(190, 145, 255, 0.75)';
            ctx.lineWidth = 2.5;
            ctx.setLineDash([7, 7]);
            ctx.lineDashOffset = -W.time * 32;
            ctx.beginPath();
            ctx.arc(W.player.x, W.player.y, 64, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
          }

          if (W.tideTimer > 0) {
            ctx.save();
            ctx.strokeStyle = 'rgba(82, 214, 198, 0.72)';
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.arc(W.player.x, W.player.y, 52 + Math.sin(W.time * 6) * 5, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
          }

          if (W.moonPullTimer > 0) {
            ctx.save();
            ctx.strokeStyle = 'rgba(180, 140, 255, 0.7)';
            ctx.lineWidth = 2;
            const rMagnet = Math.max(4, 65 - ((Math.max(0, W.time) * 90) % 45));
            ctx.beginPath();
            ctx.arc(W.player.x, W.player.y, rMagnet, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
          }

          // 3. Spell Blooms (flowers, coral anemones, cloud blossoms)
          const bloomColors = ['#ff7aa8', '#ffd23f', '#9be8a8', '#b48cff'];
          for (let i = W.blooms.length - 1; i >= 0; i--) {
            const bl = W.blooms[i];
            if (W.time > bl.e) {
              W.blooms.splice(i, 1);
              continue;
            }
            if (Boolean(bl.u) !== W.player.dive) continue;
            const age = Math.min(1, (W.time - bl.b) * 3.5);
            const sway = Math.sin(W.time * 3 + bl.x) * 1.5;
            const petalColor = bloomColors[bl.c % bloomColors.length];
            ctx.save();
            ctx.translate(bl.x + sway, bl.y);
            ctx.scale(age, age);
            ctx.fillStyle = petalColor;
            for (let p = 0; p < 5; p++) {
              const pa = (p / 5) * Math.PI * 2;
              ctx.beginPath();
              ctx.arc(Math.cos(pa) * 4.5, Math.sin(pa) * 4.5, 3.2, 0, Math.PI * 2);
              ctx.fill();
            }
            ctx.fillStyle = '#fff5a8';
            ctx.beginPath();
            ctx.arc(0, 0, 2.6, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
          }

          // 4. Faceted Collectibles (Star Gems, Clam Pearls, Wing Feathers, Rainbow Rings, Glow Spores, Moon Notes)
          renderCollectibles(
            ctx,
            W,
            cx,
            cy,
            vw,
            vh,
            W.player.sky,
            W.player.dive,
            W.player.glowdeep,
            W.player.moonroad
          );

          // 5. Ambient World Motes (Fireflies / Bubbles / Sky Sparkles / Glow Spores / Starlight)
          renderAmbientWorldMotes(
            ctx,
            cx,
            cy,
            vw,
            vh,
            W.time,
            W.player.sky,
            W.player.dive,
            W.player.glowdeep,
            W.player.moonroad,
            lowQ
          );

          // 6. Build Y-Sorted 2.5D Render Queue (Props, Cottages, Mochi's House, Trees, NPCs, Hollows, Companion, Player)
          const yQueue: YSortableItem[] = [...propItems];

          if (isSurface && W.playerHomePortal) {
            const home = W.playerHomePortal;
            const ownerName = playerLookRef.current.name || 'Mochi';
            const fireLit = cottageStateRef.current.fireplaceLit !== false;
            yQueue.push({
              sortY: home.y + 4,
              draw: () => renderPlayerMochiHouse(ctx, home.x, home.y, W.time, ownerName, fireLit),
            });
          }

          const liveLullabyDone = lullabyDoneRef.current;
          const liveLook = playerLookRef.current;

          W.npcs.forEach((npc) => {
            const sameLayer = W.player.sky
              ? Boolean(npc.sky)
              : W.player.dive
              ? Boolean(npc.sea)
              : W.player.glowdeep
              ? Boolean(npc.glowdeep)
              : W.player.moonroad
              ? Boolean(npc.moonroad)
              : !npc.sky && !npc.sea && !npc.glowdeep && !npc.moonroad;
            if (!sameLayer) return;

            if (npc.tree) {
              yQueue.push({
                sortY: npc.y + 8,
                draw: () => renderGreatLanternTree(ctx, npc.x, npc.y, W.time, liveLullabyDone),
              });
            } else {
              const isTargeted = nearest === npc && !modalCovering && gameStateRef.current === 'playing';
              yQueue.push({
                sortY: npc.y + 8,
                draw: () => {
                  if (isTargeted) {
                    const pulse = 1 + Math.sin(W.time * 6) * 0.1;
                    ctx.save();
                    ctx.strokeStyle = 'rgba(255, 210, 63, 0.85)';
                    ctx.fillStyle = 'rgba(255, 232, 130, 0.16)';
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.ellipse(npc.x, npc.y + 10, 18 * pulse, 8.5 * pulse, 0, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.stroke();
                    ctx.restore();
                  }

                  const npcLook: PlayerLook = {
                    sp: npc.sp,
                    col: npc.col,
                    c2: '',
                    ac: '#ff7aa8',
                    hat: npc.hat,
                    eyes: 0,
                    mouth: 0,
                    pat: 0,
                    out: 0,
                    face: 0,
                    aura: 0,
                    name: npc.n,
                  };
                  drawMochi(
                    ctx,
                    npc.x,
                    npc.y,
                    1.12,
                    npc.weatherPoseY !== undefined ? npc.weatherPoseY : Math.sin(W.time * 2.5 + npc.ph),
                    npc.f,
                    (W.time + npc.ph) % 4 < 0.12,
                    npcLook,
                    npc.mv === 1,
                    W.time
                  );

                  const moodEmoji =
                    npc.weatherBehavior === 'dancing'
                      ? ' ☀️'
                      : npc.weatherBehavior === 'sheltering'
                      ? ' 🍃'
                      : npc.weatherBehavior === 'stargazing'
                      ? ' ✨'
                      : npc.weatherBehavior === 'shivering'
                      ? ' ❄️'
                      : '';

                  ctx.font = '900 12px Nunito, sans-serif';
                  ctx.textAlign = 'center';
                  ctx.fillStyle = '#ffffff';
                  ctx.strokeStyle = 'rgba(60,30,80,0.85)';
                  ctx.lineWidth = 3;
                  const nameLabel = `${npc.n}${moodEmoji}`;
                  ctx.strokeText(nameLabel, npc.x, npc.y + 21);
                  ctx.fillText(nameLabel, npc.x, npc.y + 21);

                  if (isTargeted && !(npc.say && npc.sayT > 0)) {
                    ctx.save();
                    const tag = '[E] Talk';
                    ctx.font = '800 10.5px Nunito, sans-serif';
                    const tw = ctx.measureText(tag).width + 14;
                    const tx = npc.x - tw / 2;
                    const ty = npc.y - 52 + Math.sin(W.time * 5) * 2;
                    ctx.fillStyle = 'rgba(255, 250, 244, 0.95)';
                    ctx.strokeStyle = '#ffd23f';
                    ctx.lineWidth = 1.6;
                    ctx.beginPath();
                    ctx.roundRect(tx, ty, tw, 19, 6);
                    ctx.fill();
                    ctx.stroke();
                    ctx.fillStyle = '#4a3550';
                    ctx.fillText(tag, npc.x, ty + 13);
                    ctx.restore();
                  }

                  if (npc.say && npc.sayT > 0) {
                    ctx.save();
                    ctx.font = 'bold 11px Nunito, sans-serif';
                    const textW = ctx.measureText(npc.say).width;
                    const bubbleW = textW + 16;
                    const bubbleH = 22;
                    const bubbleX = npc.x - bubbleW / 2;
                    const bubbleY = npc.y - 49;

                    ctx.fillStyle = 'rgba(255, 252, 246, 0.96)';
                    ctx.strokeStyle = '#ff7aa8';
                    ctx.lineWidth = 1.8;
                    ctx.beginPath();
                    ctx.roundRect(bubbleX, bubbleY, bubbleW, bubbleH, 7);
                    ctx.fill();
                    ctx.stroke();

                    ctx.fillStyle = 'rgba(255, 252, 246, 0.96)';
                    ctx.beginPath();
                    ctx.moveTo(npc.x - 4, bubbleY + bubbleH);
                    ctx.lineTo(npc.x, bubbleY + bubbleH + 4);
                    ctx.lineTo(npc.x + 4, bubbleY + bubbleH);
                    ctx.fill();
                    ctx.beginPath();
                    ctx.moveTo(npc.x - 4, bubbleY + bubbleH);
                    ctx.lineTo(npc.x, bubbleY + bubbleH + 4);
                    ctx.lineTo(npc.x + 4, bubbleY + bubbleH);
                    ctx.stroke();

                    ctx.fillStyle = '#4a3550';
                    ctx.textAlign = 'center';
                    ctx.fillText(npc.say, npc.x, bubbleY + 15);
                    ctx.restore();
                  }
                },
              });
            }
          });

          // Living Roaming Hollow Creatures (subtle float drift + quiet sighs when Mochi approaches)
          const HOLLOW_SIGHS = ['…so quiet…', '…remember the dawn?…', '…warmth helps…'];
          W.hollows.forEach((hollow, idx) => {
            const hDist = Math.hypot(hollow.x - W.player.x, hollow.y - W.player.y);
            if (hDist < 800) {
              if (hollow.bloomT && hollow.bloomT > 0) {
                hollow.bloomT = Math.max(0, hollow.bloomT - dt * 0.4);
              }
              const swayX = hollow.soothed ? 0 : Math.sin(W.time * 0.9 + idx * 1.7) * 4;
              const swayY = hollow.soothed ? 0 : Math.cos(W.time * 0.7 + idx * 1.1) * 2.5;
              const drawX = hollow.x + swayX;
              const drawY = hollow.y + swayY;

              yQueue.push({
                sortY: drawY + 8,
                draw: () => {
                  const hollowLook: PlayerLook = {
                    sp: (hollow.species as any) || 'cat',
                    col: hollow.soothed ? (hollow.color || '#ffb3c7') : '#8a94a6',
                    c2: hollow.soothed ? '#ffd23f' : '#4b5563',
                    ac: hollow.soothed ? '#ff7aa8' : '#6b7280',
                    hat: hollow.soothed ? 'flower' : 'none',
                    eyes: 0,
                    mouth: 0,
                    pat: 0,
                    out: 0,
                    face: 0,
                    aura: hollow.soothed ? 1 : 0,
                    name: hollow.name,
                    isHollow: !hollow.soothed,
                    hollowBloom: hollow.bloomT,
                  };
                  drawMochi(
                    ctx,
                    drawX,
                    drawY,
                    1.08,
                    Math.sin(W.time * 2.2 + hollow.x) * 1.5,
                    1,
                    false,
                    hollowLook,
                    false,
                    W.time
                  );

                  ctx.font = '900 11px Nunito, sans-serif';
                  ctx.textAlign = 'center';
                  ctx.strokeStyle = 'rgba(60,30,80,0.85)';
                  ctx.lineWidth = 2.5;
                  ctx.fillStyle = hollow.soothed ? '#ff7aa8' : '#cbd5e1';
                  const hTag = hollow.soothed ? `💖 ${hollow.name}` : `🩶 ${hollow.name} (Hollow)`;
                  ctx.strokeText(hTag, drawX, drawY - 29);
                  ctx.fillText(hTag, drawX, drawY - 29);

                  if (!hollow.soothed && hDist < 145) {
                    const sigh = HOLLOW_SIGHS[idx % HOLLOW_SIGHS.length];
                    ctx.save();
                    ctx.globalAlpha = 0.86;
                    ctx.font = 'italic bold 10px Nunito, sans-serif';
                    ctx.strokeStyle = 'rgba(24, 18, 36, 0.85)';
                    ctx.lineWidth = 2.5;
                    ctx.strokeText(sigh, drawX, drawY - 43);
                    ctx.fillStyle = '#e2e8f0';
                    ctx.fillText(sigh, drawX, drawY - 43);
                    ctx.restore();
                  }
                },
              });
            }
          });

          // Dash Afterimage Ghosts
          for (let i = W.dashGhosts.length - 1; i >= 0; i--) {
            const g = W.dashGhosts[i];
            g.alpha -= dt * 2.6;
            if (g.alpha <= 0) {
              W.dashGhosts.splice(i, 1);
              continue;
            }
            const gAlpha = g.alpha;
            const gx = g.x;
            const gy = g.y;
            const gFace = g.face;
            yQueue.push({
              sortY: gy + 7,
              draw: () => {
                ctx.save();
                ctx.globalAlpha = Math.max(0, gAlpha);
                drawMochi(ctx, gx, gy, 1.12, -2, gFace, false, liveLook, true, W.time);
                ctx.restore();
              },
            });
          }

          // Player's Adopted Companion Buddy (Gloom, Glow-Moth, Cloud Whale, Gloria, Gary)
          const activeComp = liveLook.companion ?? 'gloom';
          if (activeComp !== 'none') {
            yQueue.push({
              sortY: W.companionPos.y + 6,
              draw: () => {
                ctx.save();
                ctx.translate(W.companionPos.x, W.companionPos.y);
                ctx.scale(1.05, 1.05);
                drawCompanion(ctx, 0, 0, activeComp, W.time);
                ctx.restore();
              },
            });
          }

          // Player Mochi (with Dreamwalk translucency & orbiting Frost / Heart / Star spell effects)
          yQueue.push({
            sortY: W.player.y + 8,
            draw: () => {
              ctx.save();
              if (W.dreamwalkTimer > 0) {
                ctx.globalAlpha = 0.72 + Math.sin(W.time * 7) * 0.1;
              }
              drawMochi(
                ctx,
                W.player.x,
                W.player.y,
                1.14,
                W.player.isMoving ? -Math.abs(Math.sin(W.time * 11)) * 3 : Math.sin(W.time * 3),
                W.player.face,
                W.time % 4 < 0.12,
                liveLook,
                W.player.isMoving,
                W.time
              );
              ctx.restore();

              // Orbiting Frost Crystals (Frost Bridge)
              if (W.frostShieldTimer > 0) {
                for (let k = 0; k < 3; k++) {
                  const ang = W.time * 2.8 + (k * Math.PI * 2) / 3;
                  const ox = W.player.x + Math.cos(ang) * 32;
                  const oy = W.player.y - 4 + Math.sin(ang) * 18;
                  ctx.save();
                  ctx.translate(ox, oy);
                  ctx.rotate(ang);
                  ctx.fillStyle = '#d4f6ff';
                  ctx.strokeStyle = '#67d4ff';
                  ctx.lineWidth = 1.5;
                  ctx.beginPath();
                  ctx.moveTo(0, -6);
                  ctx.lineTo(4.5, 0);
                  ctx.lineTo(0, 6);
                  ctx.lineTo(-4.5, 0);
                  ctx.closePath();
                  ctx.fill();
                  ctx.stroke();
                  ctx.restore();
                }
              }

              // Orbiting Cozy Hearts (Hush Hug)
              if (W.hugTimer > 0) {
                ctx.save();
                ctx.font = '13px sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                for (let k = 0; k < 3; k++) {
                  const ang = -W.time * 2.3 + (k * Math.PI * 2) / 3;
                  const ox = W.player.x + Math.cos(ang) * 34;
                  const oy = W.player.y - 8 + Math.sin(ang) * 18;
                  ctx.fillText('💖', ox, oy);
                }
                ctx.restore();
              }

              // Orbiting Crown Stars (Star Sense)
              if (W.starSenseTimer > 0) {
                ctx.save();
                ctx.font = '12px sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                for (let k = 0; k < 3; k++) {
                  const ang = W.time * 2.1 + (k * Math.PI * 2) / 3;
                  const ox = W.player.x + Math.cos(ang) * 26;
                  const oy = W.player.y - 26 + Math.sin(ang) * 8;
                  ctx.fillText('✦', ox, oy);
                }
                ctx.restore();
              }

              ctx.font = '900 13px Nunito, sans-serif';
              ctx.textAlign = 'center';
              ctx.strokeStyle = 'rgba(60,30,80,0.85)';
              ctx.lineWidth = 3;
              ctx.fillStyle = '#ffffff';
              ctx.strokeText(liveLook.name, W.player.x, W.player.y - 49);
              ctx.fillText(liveLook.name, W.player.x, W.player.y - 49);
            },
          });

          yQueue.sort((a, b) => a.sortY - b.sortY);
          for (const item of yQueue) item.draw();

          // Expanding Magic Rings & Sparkle Particles
          for (let i = W.magicRings.length - 1; i >= 0; i--) {
            const mr = W.magicRings[i];
            mr.t = Math.max(0, mr.t + dt);
            if (mr.t >= mr.m) {
              W.magicRings.splice(i, 1);
              continue;
            }
            const prog = Math.max(0, Math.min(1, mr.t / mr.m));
            const ringRadius = Math.max(0.5, mr.r * prog);
            ctx.save();
            ctx.strokeStyle = mr.c;
            ctx.globalAlpha = Math.max(0, 1 - prog);
            ctx.lineWidth = 3 * (1 - prog) + 1;
            ctx.beginPath();
            ctx.arc(mr.x, mr.y, ringRadius, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
          }

          for (let i = W.particles.length - 1; i >= 0; i--) {
            const pt = W.particles[i];
            pt.l -= dt;
            if (pt.l <= 0) {
              W.particles.splice(i, 1);
              continue;
            }
            pt.x += pt.vx * dt;
            pt.y += pt.vy * dt;
            ctx.save();
            ctx.globalAlpha = Math.min(1, pt.l);
            ctx.fillStyle = pt.c;
            ctx.beginPath();
            ctx.arc(pt.x, pt.y, 3.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
          }

          // Floating In-World Pickup / Harmony / Town Unlock Popups
          for (let i = W.worldPopups.length - 1; i >= 0; i--) {
            const wp = W.worldPopups[i];
            wp.age += dt;
            if (wp.age >= wp.maxAge) {
              W.worldPopups.splice(i, 1);
              continue;
            }
            const p = wp.age / wp.maxAge;
            const scale = p < 0.18 ? 0.65 + (p / 0.18) * 0.45 : 1.0;
            const alpha = p > 0.65 ? Math.max(0, 1 - (p - 0.65) / 0.35) : 1;
            const py = wp.y - p * 34;
            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.translate(wp.x, py);
            ctx.scale(scale, scale);
            ctx.font = '900 13px Nunito, sans-serif';
            ctx.textAlign = 'center';
            ctx.strokeStyle = 'rgba(42, 18, 56, 0.9)';
            ctx.lineWidth = 3.5;
            ctx.strokeText(wp.text, 0, 0);
            ctx.fillStyle = wp.color;
            ctx.fillText(wp.text, 0, 0);
            ctx.restore();
          }

          // In-World Proximity Portal Prompt Tag (Mochi's House Door, Glowdeep Roots, Moon Gate, Return Arches)
          if (!modalCovering && gameStateRef.current === 'playing') {
            let portalWorld: { x: number; y: number; text: string; accent: string } | null = null;
            if (isSurface) {
              if (
                W.playerHomePortal &&
                Math.hypot(W.player.x - W.playerHomePortal.doorX, W.player.y - W.playerHomePortal.doorY) < 60
              ) {
                portalWorld = {
                  x: W.playerHomePortal.doorX,
                  y: W.playerHomePortal.doorY - 34,
                  text: '[F] Enter House',
                  accent: '#ff9ebb',
                };
              } else if (
                W.glowdeepPortal &&
                Math.hypot(W.player.x - W.glowdeepPortal.x, W.player.y - W.glowdeepPortal.y) < 64
              ) {
                portalWorld = {
                  x: W.glowdeepPortal.x,
                  y: W.glowdeepPortal.y - 34,
                  text: W.glowdeepPortal.open ? '[F] Enter Glowdeep' : '🔒 Sealed (Ch. 9)',
                  accent: W.glowdeepPortal.open ? '#64f5c1' : '#cbd5e1',
                };
              } else if (
                W.moonGatePortal &&
                Math.hypot(W.player.x - W.moonGatePortal.x, W.player.y - W.moonGatePortal.y) < 64
              ) {
                portalWorld = {
                  x: W.moonGatePortal.x,
                  y: W.moonGatePortal.y - 34,
                  text: W.moonGatePortal.open ? '[F] Moon Road' : '🔒 Sealed (Ch. 7)',
                  accent: W.moonGatePortal.open ? '#ffd23f' : '#cbd5e1',
                };
              }
            } else if (W.player.glowdeep) {
              const rx = GLOWDEEP_RETURN_TILE.x * T + T / 2;
              const ry = GLOWDEEP_RETURN_TILE.y * T + T / 2;
              if (Math.hypot(W.player.x - rx, W.player.y - ry) < 64) {
                portalWorld = { x: rx, y: ry - 34, text: '[F] Ascend Home', accent: '#64f5c1' };
              }
            } else if (W.player.moonroad) {
              const rx = MOONROAD_RETURN_TILE.x * T + T / 2;
              const ry = MOONROAD_RETURN_TILE.y * T + T / 2;
              if (Math.hypot(W.player.x - rx, W.player.y - ry) < 64) {
                portalWorld = { x: rx, y: ry - 34, text: '[F] Lantern Isle', accent: '#ffd23f' };
              }
            }
            if (portalWorld) {
              ctx.save();
              ctx.font = '800 11px Nunito, sans-serif';
              ctx.textAlign = 'center';
              const tw = ctx.measureText(portalWorld.text).width + 16;
              const px = portalWorld.x - tw / 2;
              const py = portalWorld.y + Math.sin(W.time * 4.5) * 2;
              ctx.fillStyle = 'rgba(28, 16, 44, 0.9)';
              ctx.strokeStyle = portalWorld.accent;
              ctx.lineWidth = 1.6;
              ctx.beginPath();
              ctx.roundRect(px, py, tw, 21, 6);
              ctx.fill();
              ctx.stroke();
              ctx.fillStyle = '#fffaf4';
              ctx.fillText(portalWorld.text, portalWorld.x, py + 14);
              ctx.restore();
            }
          }

          ctx.restore();

          // Subtle Sky Sun-Rays, Reef Light Shafts, Glowdeep Cavern Glow & Moon Road Veil
          renderLayerAtmosphereOverlay(
            ctx,
            vw,
            vh,
            W.time,
            W.player.sky,
            W.player.dive,
            W.player.glowdeep,
            W.player.moonroad
          );

          // Drifting Cloud Shadows, 7-min Golden Hour -> Starlight Cycle, Warm Lantern Glows & Vignette
          renderWorldLightingAndAtmosphere(
            ctx,
            vw,
            vh,
            cx,
            cy,
            W.time,
            W.player.sky,
            W.player.dive,
            Boolean(liveSettings.night),
            W.towns,
            W.player.glowdeep,
            W.player.moonroad,
            lowQ
          );

          // Render Global Weather System atmospheric tint, vignette, and ambient particles (surface / sky)
          if (!W.player.glowdeep && !W.player.moonroad) {
            weatherRef.current.render(ctx, vw, vh, W.player.sky, W.player.dive, W.time, lowQ);
          }

          // Realm Transition Soft Shimmer Overlay
          if (W.realmFlash.alpha > 0.01) {
            ctx.save();
            ctx.fillStyle = W.realmFlash.color;
            ctx.globalAlpha = Math.min(0.6, W.realmFlash.alpha);
            ctx.fillRect(0, 0, vw, vh);
            ctx.restore();
            W.realmFlash.alpha = Math.max(0, W.realmFlash.alpha - dt * 1.45);
          }

          // Star Sense & Moon Pull World Beacons (sorted by nearest to Mochi!)
          if (W.starSenseTimer > 0) {
            W.starSenseTimer -= dt;
            ctx.save();
            const allTargets = (
              W.player.sky
                ? [...W.feathers, ...W.rings]
                : W.player.dive
                ? W.pearls
                : W.player.glowdeep
                ? W.glowSpores
                : W.player.moonroad
                ? W.moonNotes
                : [...W.stars, ...W.questItems.filter((qi) => qi.w === 0)]
            ).filter((i) => !i.got);
            const nearestTargets = allTargets
              .map((item) => ({
                item,
                dist: Math.hypot(item.x - W.player.x, item.y - W.player.y),
              }))
              .sort((a, b) => a.dist - b.dist)
              .slice(0, 6);

            nearestTargets.forEach(({ item }) => {
              const sx = item.x - cx;
              const sy = item.y - cy;

              ctx.strokeStyle = 'rgba(255, 216, 77, 0.85)';
              ctx.lineWidth = 2;
              ctx.setLineDash([5, 5]);
              ctx.lineDashOffset = -W.time * 24;
              ctx.beginPath();
              ctx.moveTo(vw / 2, vh / 2);
              ctx.lineTo(sx, sy);
              ctx.stroke();

              // Pulsing target ring around visible items
              ctx.setLineDash([]);
              ctx.strokeStyle = '#ffd23f';
              ctx.lineWidth = 2.5;
              ctx.beginPath();
              ctx.arc(sx, sy, 13 + Math.sin(W.time * 5) * 3, 0, Math.PI * 2);
              ctx.stroke();
            });
            ctx.restore();
          }

          // Moon Pull magnetic tractor beams visibly pulling nearby gems/pearls/feathers/spores/notes
          if (W.moonPullTimer > 0) {
            ctx.save();
            const pullPool = W.player.sky
              ? W.feathers
              : W.player.dive
              ? W.pearls
              : W.player.glowdeep
              ? W.glowSpores
              : W.player.moonroad
              ? W.moonNotes
              : [...W.stars, ...W.questItems.filter((qi) => qi.w === 0)];
            ctx.strokeStyle = 'rgba(180, 140, 255, 0.85)';
            ctx.lineWidth = 2.4;
            ctx.setLineDash([4, 6]);
            ctx.lineDashOffset = W.time * 48;
            for (const item of pullPool) {
              if (item.got) continue;
              const dist = Math.hypot(item.x - W.player.x, item.y - W.player.y);
              if (dist < 520) {
                const sx = item.x - cx;
                const sy = item.y - cy;
                ctx.beginPath();
                ctx.moveTo(sx, sy);
                ctx.lineTo(vw / 2, vh / 2);
                ctx.stroke();
              }
            }
            ctx.restore();
          }

          // Echo Call Sonar Beacons toward unfound Memory Echoes & Moon Diary Pages on current layer
          if (W.echoTimer > 0) {
            W.echoTimer = Math.max(0, W.echoTimer - dt);
            ctx.save();
            const playerLayer = W.player.sky
              ? 2
              : W.player.dive
              ? 1
              : W.player.glowdeep
              ? 3
              : W.player.moonroad
              ? 4
              : 0;
            const sonarTargets = [
              ...MEMORY_ECHOES.filter((e) => e.w === playerLayer && !W.discoveredEchoIds.has(e.id)).map((e) => ({
                label: `🔔 ${e.title}`,
                ex: e.x * T + T / 2,
                ey: e.y * T + T / 2,
              })),
              ...MOON_DIARY_PAGES.filter((p) => p.w === playerLayer && !W.discoveredDiaryPages.has(p.page)).map((p) => ({
                label: `🌙 Diary p.${p.page}`,
                ex: p.x * T + T / 2,
                ey: p.y * T + T / 2,
              })),
            ]
              .sort(
                (a, b) =>
                  Math.hypot(a.ex - W.player.x, a.ey - W.player.y) -
                  Math.hypot(b.ex - W.player.x, b.ey - W.player.y)
              )
              .slice(0, 3);

            sonarTargets.forEach(({ label, ex, ey }) => {
              const sx = ex - cx;
              const sy = ey - cy;
              ctx.strokeStyle = 'rgba(143, 213, 255, 0.88)';
              ctx.lineWidth = 2.4;
              ctx.setLineDash([6, 6]);
              ctx.lineDashOffset = -W.time * 30;
              ctx.beginPath();
              ctx.moveTo(vw / 2, vh / 2);
              ctx.lineTo(sx, sy);
              ctx.stroke();

              ctx.setLineDash([]);
              ctx.fillStyle = 'rgba(255, 122, 168, 0.9)';
              ctx.beginPath();
              ctx.arc(sx, sy, 9 + Math.sin(W.time * 6) * 2.5, 0, Math.PI * 2);
              ctx.fill();

              // Floating Echo / Diary edge label
              const clX = Math.max(70, Math.min(vw - 70, sx));
              const clY = Math.max(85, Math.min(vh - 85, sy - 16));
              ctx.font = '800 11px Nunito, sans-serif';
              ctx.textAlign = 'center';
              ctx.strokeStyle = 'rgba(40,20,60,0.85)';
              ctx.lineWidth = 3;
              ctx.strokeText(label, clX, clY);
              ctx.fillStyle = '#fff5b8';
              ctx.fillText(label, clX, clY);
            });
            ctx.restore();
          }

          // Close scaled camera frame
          ctx.restore();

          // Cached Offscreen Minimap (builds terrain once per realm layer + redraws blips at ~20Hz)
          const mm = minimapRef.current;
          if (mm && !modalCovering && now - hudSyncRef.current.lastMinimapMs >= 50) {
            hudSyncRef.current.lastMinimapMs = now;
            const mCtx = mm.getContext('2d');
            if (mCtx) {
              if (!minimapCacheRef.current || minimapCacheRef.current.layer !== layerKey) {
                const offCanvas = minimapCacheRef.current?.canvas ?? document.createElement('canvas');
                offCanvas.width = 128;
                offCanvas.height = 128;
                const cCtx = offCanvas.getContext('2d');
                if (cCtx) {
                  cCtx.fillStyle = W.player.sky
                    ? '#63b8ec'
                    : W.player.dive
                    ? '#091f3a'
                    : W.player.glowdeep
                    ? '#110820'
                    : W.player.moonroad
                    ? '#070417'
                    : '#3d8ec5';
                  cCtx.fillRect(0, 0, 128, 128);

                  const step = 4;
                  const cellPx = (step / N) * 128 + 0.6;
                  for (let ty = 0; ty < N; ty += step) {
                    for (let tx = 0; tx < N; tx += step) {
                      const idx = ty * N + tx;
                      const mx = (tx / N) * 128;
                      const my = (ty / N) * 128;
                      if (W.player.sky) {
                        const sb = W.SB[idx];
                        if (sb > 0) {
                          cCtx.fillStyle = sb === 2 ? '#ffffff' : sb === 4 ? '#ffd694' : '#a7efb0';
                          cCtx.fillRect(mx, my, cellPx, cellPx);
                        }
                      } else if (W.player.dive) {
                        const b = W.B[idx];
                        const ud = W.UD[idx];
                        if (ud === 2) cCtx.fillStyle = '#ff7aa8';
                        else if (ud === 1) cCtx.fillStyle = '#2e9e75';
                        else if (b === 1) cCtx.fillStyle = '#2a9fb5';
                        else if (b >= 2) cCtx.fillStyle = '#112238';
                        else continue;
                        cCtx.fillRect(mx, my, cellPx, cellPx);
                      } else if (W.player.glowdeep) {
                        const cell = getGlowdeepCell(tx, ty);
                        if (cell === 'wall') continue;
                        cCtx.fillStyle =
                          cell === 'canal'
                            ? '#4be8c8'
                            : cell === 'roots'
                            ? '#9e80ff'
                            : cell === 'cinder'
                            ? '#ff9e70'
                            : cell === 'glowcap'
                            ? '#6fd9a0'
                            : '#553a87';
                        cCtx.fillRect(mx, my, cellPx, cellPx);
                      } else if (W.player.moonroad) {
                        const cell = getMoonRoadCell(tx, ty);
                        if (cell === 'void' || cell === 'nebula') continue;
                        cCtx.fillStyle =
                          cell === 'platform' ? '#ffd23f' : cell === 'silence' ? '#4a5275' : '#dfd4ff';
                        cCtx.fillRect(mx, my, cellPx, cellPx);
                      } else {
                        const b = W.B[idx];
                        if (b > 0) {
                          cCtx.fillStyle = BIOME_COLORS[b] || '#9ee087';
                          cCtx.fillRect(mx, my, cellPx, cellPx);
                        }
                      }
                    }
                  }
                }
                minimapCacheRef.current = { layer: layerKey, canvas: offCanvas };
              }

              mCtx.drawImage(minimapCacheRef.current.canvas, 0, 0);

              // NPC blips on current layer
              W.npcs.forEach((n) => {
                const onLayer = W.player.sky
                  ? Boolean(n.sky)
                  : W.player.dive
                  ? Boolean(n.sea)
                  : W.player.glowdeep
                  ? Boolean(n.glowdeep)
                  : W.player.moonroad
                  ? Boolean(n.moonroad)
                  : !n.sky && !n.sea && !n.glowdeep && !n.moonroad;
                if (!onLayer) return;
                const nx = (n.x / (N * T)) * 128;
                const ny = (n.y / (N * T)) * 128;
                mCtx.fillStyle = n.tree ? '#ffd23f' : '#ffffff';
                mCtx.fillRect(nx - 1.5, ny - 1.5, 3, 3);
              });

              // Surface portal & home blips
              if (isSurface) {
                if (W.playerHomePortal) {
                  const hx = (W.playerHomePortal.x / (N * T)) * 128;
                  const hy = (W.playerHomePortal.y / (N * T)) * 128;
                  mCtx.fillStyle = '#ff9ebb';
                  mCtx.strokeStyle = '#ffffff';
                  mCtx.lineWidth = 1;
                  mCtx.fillRect(hx - 2.5, hy - 2.5, 5, 5);
                  mCtx.strokeRect(hx - 2.5, hy - 2.5, 5, 5);
                }
                if (W.glowdeepPortal) {
                  const gx = (W.glowdeepPortal.x / (N * T)) * 128;
                  const gy = (W.glowdeepPortal.y / (N * T)) * 128;
                  mCtx.fillStyle = W.glowdeepPortal.open ? '#64f5c1' : '#8e7fa3';
                  mCtx.fillRect(gx - 2, gy - 2, 4, 4);
                }
                if (W.moonGatePortal) {
                  const mx = (W.moonGatePortal.x / (N * T)) * 128;
                  const my = (W.moonGatePortal.y / (N * T)) * 128;
                  mCtx.fillStyle = W.moonGatePortal.open ? '#ffd23f' : '#cbd5e1';
                  mCtx.fillRect(mx - 2, my - 2, 4, 4);
                }
              }

              // Player blip
              const px = (W.player.x / (N * T)) * 128;
              const py = (W.player.y / (N * T)) * 128;
              mCtx.fillStyle = '#ff7aa8';
              mCtx.strokeStyle = '#ffffff';
              mCtx.lineWidth = 1.5;
              mCtx.beginPath();
              mCtx.arc(px, py, 3.8, 0, Math.PI * 2);
              mCtx.fill();
              mCtx.stroke();
            }
          }
        }
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, []);

  // Objective summary text across all 12 Story Chapters
  const getObjectiveText = () => {
    if (lullabyDone) return '✨ The Dawn Duet echoes forever! Wander all 5 realms freely.';
    switch (currentChapter) {
      case 1:
        return 'Ch. 1: Talk to Pip near where you woke under the Lantern Tree';
      case 2:
        return 'Ch. 2: Deliver Pip’s muffin to Captain Barnacle or befriend 2 islanders';
      case 3:
        return 'Ch. 3: Help Bumble gather Wildflower Nectar for Verse 1: Wake';
      case 4:
        return 'Ch. 4: Help Tidbit gather 3 Star Shards on the coast for Verse 2';
      case 5:
        return 'Ch. 5: Befriend Ember in the dunes or soothe 2 Hollows for Verse 3';
      case 6:
        return 'Ch. 6: Befriend Madame Mizzle or 5 islanders to unseal the Moon Road!';
      case 7:
        return 'Ch. 7: Silver Moon Gate OPEN! Visit Moon Road or Penny & Quill';
      case 8:
        return 'Ch. 8: Befriend Bellamy or collect 10 Star Gems to unseal Glowdeep!';
      case 9:
        return 'Ch. 9: Enter Glowdeep Roots by the Lantern Tree & help Lumi cook the Soup';
      case 10:
        return 'Ch. 10: Enter the Moon Road Gate & meet The Moon and Dusk';
      case 11:
        return 'Ch. 11: Meet Aurelle on the eastern coast toward Dawn Spire';
      case 12:
        return 'Ch. 12: Talk to Aurelle, Wick, or Lantern Tree & Sing the Dawn Duet!';
      default:
        return 'Explore Mochi Meadows across all 5 Realms';
    }
  };

  const nearbyPortal = gameState === 'playing' ? getNearbyPortal() : null;

  return (
    <div className="relative w-screen h-dvh overflow-hidden select-none bg-[#5fb0e6]">
      {/* Main Game World Canvas (supports smooth click/tap-to-move with responsive camera scaling) */}
      <canvas
        ref={canvasRef}
        onClick={(e) => {
          if (gameState !== 'playing' || activeModal !== 'none' || activeCutscene) return;
          const canvas = canvasRef.current;
          if (!canvas) return;
          const rect = canvas.getBoundingClientRect();
          const W = worldRef.current;
          const z = device.viewScale || 1;
          const wx = (W.camera.initialized ? W.camera.x : W.player.x) + (e.clientX - rect.left - rect.width / 2) / z;
          const wy = (W.camera.initialized ? W.camera.y : W.player.y) + (e.clientY - rect.top - rect.height / 2) / z;
          W.player.moveTarget = {
            x: Math.max(T * 1.5, Math.min((N - 1.5) * T, wx)),
            y: Math.max(T * 1.5, Math.min((N - 1.5) * T, wy)),
          };
        }}
        className="block w-full h-full touch-none cursor-pointer"
      />

      {/* Title Screen */}
      {gameState === 'title' && (
        <TitleScreen
          hasSavedGame={Boolean(
            localStorage.getItem(LOCAL_STORAGE_SAVE_PREFIX + currentSlot) ||
              localStorage.getItem(LOCAL_STORAGE_LEGACY_SAVE)
          )}
          playerLook={playerLook}
          currentSlot={currentSlot}
          onSelectSlot={handleSelectSlot}
          onContinue={() => {
            audio.init();
            snapCamera();
            setGameState('playing');
          }}
          onNewGame={() => {
            audio.init();
            snapCamera();
            setGameState('playing');
            triggerCutscene('intro');
          }}
          onCustomize={() => setActiveModal('wardrobe')}
          onOpenSettings={() => {
            setPauseInitialTab('settings');
            setActiveModal('pause');
          }}
          onOpenCredits={() => triggerCutscene('credits')}
          onOpenGazette={() => setActiveModal('gazette')}
          onCarryOverMM1={handleCarryOverMM1}
        />
      )}

      {/* In-Game HUD */}
      {gameState === 'playing' && (
        <Hud
          biomeName={currentBiomeName}
          starsGot={worldRef.current.stars.filter((s) => s.got).length}
          starsTotal={worldRef.current.stars.length}
          pearlsGot={worldRef.current.pearls.filter((p) => p.got).length}
          pearlsTotal={worldRef.current.pearls.length}
          feathersGot={worldRef.current.feathers.filter((f) => f.got).length}
          feathersTotal={worldRef.current.feathers.length}
          heartsGot={worldRef.current.npcs.filter((n) => n.fr && !n.sky && !n.tree).length}
          heartsTotal={worldRef.current.npcs.filter((n) => !n.sky && !n.tree && !n.sea && !n.glowdeep && !n.moonroad).length || 8}
          skyHeartsGot={worldRef.current.npcs.filter((n) => n.fr && n.sky).length}
          questsDone={worldRef.current.quests.filter((q) => q.st === 3).length}
          questsTotal={worldRef.current.quests.length}
          coins={coins}
          objectiveText={getObjectiveText()}
          stamina={stamina}
          air={air}
          mana={mana}
          isDiving={playerPos.dive}
          isSky={playerPos.sky}
          isGlowdeep={playerPos.glowdeep}
          isMoonRoad={playerPos.moonroad}
          canDive={!playerPos.glowdeep && !playerPos.moonroad}
          canFish={canFish()}
          nearNpc={Boolean(activeNpc)}
          nearbyPortal={nearbyPortal}
          currentChapter={currentChapter}
          minimapRef={minimapRef}
          activeSpells={{
            star_sense: worldRef.current.starSenseTimer > 0,
            cloud_wings: playerPos.sky,
            frost_bridge: worldRef.current.frostShieldTimer > 0,
            tide_song: worldRef.current.tideTimer > 0,
            moon_pull: worldRef.current.moonPullTimer > 0,
            bloom: worldRef.current.bloomStepTimer > 0,
            hush_hug: worldRef.current.hugTimer > 0,
            ember_warmth: worldRef.current.warmthTimer > 0,
            echo_call: worldRef.current.echoTimer > 0,
            dreamwalk: worldRef.current.dreamwalkTimer > 0,
            dawn_break: worldRef.current.dawnTimer > 0,
          }}
          onCastSpell={handleCastSpell}
          onDive={handleDiveToggle}
          onUsePortal={handlePortalInteract}
          onTalk={() => {
            if (activeNpc) {
              audio.init();
              setActiveModal('dialog');
            }
          }}
          onFish={() => setActiveModal('fishing')}
          onDash={handleDash}
          onToggleMusic={cycleMusic}
          onOpenMap={() => setActiveModal('map')}
          onOpenWardrobe={() => setActiveModal('wardrobe')}
          onOpenJournal={() => setActiveModal('journal')}
          onOpenPause={() => {
            setPauseInitialTab('menu');
            setActiveModal('pause');
          }}
          onOpenBottles={() => setActiveModal('bottles')}
          onOpenGazette={() => {
            markGazetteSlotSeen();
            setHasNewGazette(false);
            setActiveModal('gazette');
          }}
          hasNewGazette={hasNewGazette}
          onOpenSongWeaver={() => setActiveModal('songweaver')}
          onOpenCottage={() => setActiveModal('cottage')}
          musicIcon={currentTrackIdx === 15 ? '🔇' : '🎵'}
          hasCustomMusic={audio.customTracks.length > 0}
          weather={currentWeather}
          onCycleWeather={() => {
            weatherRef.current.cycleNextWeather();
          }}
          isTouch={device.isTouch}
          isPhone={device.isPhone}
          isTablet={device.isTablet}
          isLandscapePhone={device.isLandscapePhone}
          isCompactPhone={device.isCompactPhone}
        />
      )}

      {/* On-Screen Touch Controls (Virtual Joystick & Action Cluster for Phone/Tablet) */}
      {gameState === 'playing' && device.isTouch && activeModal === 'none' && !activeCutscene && (
        <TouchControls
          isPhone={device.isPhone}
          isTablet={device.isTablet}
          isLandscapePhone={device.isLandscapePhone}
          isCompactPhone={device.isCompactPhone}
          currentChapter={currentChapter}
          nearNpc={Boolean(activeNpc)}
          activeNpcName={activeNpc?.n}
          canDive={!playerPos.glowdeep && !playerPos.moonroad}
          isDiving={playerPos.dive}
          isSky={playerPos.sky}
          canFish={canFish()}
          mana={mana}
          selectedSpellIdx={selectedSpellIdx}
          nearbyPortal={nearbyPortal}
          onUsePortal={handlePortalInteract}
          onJoystickMove={(dx, dy, active) => {
            worldRef.current.touchJoystick = {
              active,
              startX: 0,
              startY: 0,
              curX: dx,
              curY: dy,
            };
          }}
          onDash={handleDash}
          onTalk={() => {
            if (activeNpc) {
              audio.init();
              setActiveModal('dialog');
            }
          }}
          onDive={handleDiveToggle}
          onFish={() => setActiveModal('fishing')}
          onCastSpell={(idx) => {
            setSelectedSpellIdx(idx);
            handleCastSpell(idx);
          }}
          onCycleSpell={() => setSelectedSpellIdx((s) => (s + 1) % MAGIC_SPELLS.length)}
          onOpenMap={() => setActiveModal('map')}
        />
      )}

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div
          className={`fixed left-1/2 -translate-x-1/2 z-50 storybook-panel border-2 border-[#ffd3e2] dark:border-[#6b4a7a] text-[#4a3550] dark:text-[#fdeeff] px-4 sm:px-5 py-1.5 sm:py-2.5 rounded-full font-black text-[11px] sm:text-sm animate-in fade-in slide-in-from-top-4 duration-150 whitespace-nowrap max-w-[92vw] truncate pointer-events-none ${
            device.isLandscapePhone ? 'top-14' : 'top-20 sm:top-24'
          }`}
        >
          {toastMessage}
        </div>
      )}

      {/* NPC Dialogue & AI Chat Modal */}
      {activeModal === 'dialog' && activeNpc && (
        <DialogModal
          npc={activeNpc}
          playerLook={playerLook}
          isFriend={Boolean(activeNpc.fr)}
          lullabyDone={lullabyDone}
          currentChapter={currentChapter}
          coins={coins}
          activeQuest={worldRef.current.quests.find((q) => q.g === activeNpc.n)}
          deliverableQuest={worldRef.current.quests.find((q) => q.k === 'd' && q.to === activeNpc.n && q.st === 1)}
          canSingDawnDuet={
            currentChapter >= 12 &&
            !lullabyDone &&
            (activeNpc.n === 'Aurelle' || activeNpc.n === 'Lantern Tree' || activeNpc.n === 'Wick')
          }
          onSingDawnDuet={() => {
            setActiveModal('none');
            completeDawnDuetFinale();
          }}
          onClose={() => {
            setActiveModal('none');
            evaluateStoryProgress();
          }}
          onSelectTopic={(idx) => {
            activeNpc.h[idx] = 1;
            const allHeard = activeNpc.h.every(Boolean);
            if (allHeard && !activeNpc.fr) {
              activeNpc.fr = true;
              audio.chime();
              showToast(`Unlocked heart friendship with ${activeNpc.n}! ❤️`);
              // Unlock verse
              const verse = VERSES_OF_THE_LULLABY.find((v) => v[0].toLowerCase().includes(activeNpc.n.toLowerCase()));
              if (verse) {
                setLoreEntries((prev) => [
                  ...prev,
                  { id: `v-${activeNpc.n}`, t: verse[0], x: `${verse[1]} — ${verse[2]}` },
                ]);
              }
            }
            evaluateStoryProgress();
          }}
          onAcceptQuest={(q) => {
            if (q.k === 'c' && q.c >= (q.n || 1)) {
              q.st = 2;
              showToast(`Accepted & ready to turn in: ${q.t}! 🎁`);
            } else {
              q.st = 1;
              showToast(`Accepted quest: ${q.t}! 📜`);
            }
            evaluateStoryProgress();
          }}
          onTurnInQuest={(q) => {
            q.st = 3;
            setCoins((c) => c + 25);
            audio.chime();
            showToast(`Quest completed: ${q.t}! +25 coins! 🎁`);
            setLoreEntries((prev) =>
              prev.some((l) => l.id === `q-${q.t}`) ? prev : [...prev, { id: `q-${q.t}`, t: q.t, x: q.l }]
            );
            evaluateStoryProgress();
          }}
          onDeliverQuest={(q) => {
            q.st = 2;
            showToast(`Delivered item for ${q.t}! Return to ${q.g} to finish.`);
          }}
          onBuyItem={(itemId, cost) => {
            setCoins((c) => c - cost);
            setUpgrades((prev) => ({ ...prev, [itemId]: 1 }));
            audio.chime();
            showToast(`Purchased upgrade! ✨`);
          }}
          ownedUpgrades={upgrades}
          weather={currentWeather}
        />
      )}

      {/* Story Journal Modal */}
      {activeModal === 'journal' && (
        <JournalModal
          objective={getObjectiveText()}
          lore={loreEntries}
          quests={worldRef.current.quests}
          unlockedCutscenes={unlockedCutscenes}
          currentChapter={currentChapter}
          onClose={() => setActiveModal('none')}
          onPlayCutscene={(key) => triggerCutscene(key)}
        />
      )}

      {/* Wardrobe Modal */}
      {activeModal === 'wardrobe' && (
        <WardrobeModal
          look={playerLook}
          onUpdateLook={(up) => setPlayerLook((prev) => ({ ...prev, ...up }))}
          onClose={() => {
            handleSaveGame(false);
            setActiveModal('none');
          }}
          onSave={() => handleSaveGame(true)}
          onCopySaveCode={() => {
            const code = btoa(JSON.stringify({ L: playerLook, coins, ch: currentChapter, ug: upgrades }));
            navigator.clipboard.writeText(code);
            showToast('Save code copied to clipboard! 📋');
          }}
          onLoadSaveCode={() => {
            const code = prompt('Paste your save code:');
            if (code) {
              try {
                const parsed = JSON.parse(atob(code));
                if (parsed.L) setPlayerLook(parsed.L);
                if (parsed.coins) setCoins(parsed.coins);
                showToast('Save loaded successfully! 📥');
              } catch (e) {
                showToast('Invalid save code');
              }
            }
          }}
          onNewGame={() => {
            if (confirm('Start fresh and reset current save slot?')) {
              localStorage.removeItem(LOCAL_STORAGE_SAVE_PREFIX + currentSlotRef.current);
              if (currentSlotRef.current === 1) {
                localStorage.removeItem(LOCAL_STORAGE_LEGACY_SAVE);
              }
              window.location.reload();
            }
          }}
          currentTrackIndex={currentTrackIdx}
          onSelectTrack={(idx) => {
            setCurrentTrackIdx(idx);
            audio.setTrack(idx);
          }}
        />
      )}

      {/* Pause Menu & Cloud Saves Modal */}
      {activeModal === 'pause' && (
        <PauseMenuModal
          completionPercentage={Math.round(
            (worldRef.current.stars.filter((s) => s.got).length / Math.max(1, worldRef.current.stars.length) +
              worldRef.current.pearls.filter((p) => p.got).length / Math.max(1, worldRef.current.pearls.length) +
              worldRef.current.feathers.filter((f) => f.got).length / Math.max(1, worldRef.current.feathers.length) +
              worldRef.current.quests.filter((q) => q.st === 3).length / Math.max(1, worldRef.current.quests.length)) *
              25
          )}
          coins={coins}
          starsGot={worldRef.current.stars.filter((s) => s.got).length}
          starsTotal={worldRef.current.stars.length}
          pearlsGot={worldRef.current.pearls.filter((p) => p.got).length}
          pearlsTotal={worldRef.current.pearls.length}
          feathersGot={worldRef.current.feathers.filter((f) => f.got).length}
          feathersTotal={worldRef.current.feathers.length}
          ringsGot={worldRef.current.rings.filter((r) => r.got).length}
          ringsTotal={worldRef.current.rings.length}
          questsDone={worldRef.current.quests.filter((q) => q.st === 3).length}
          questsTotal={worldRef.current.quests.length}
          unlockedAchievements={unlockedAchievements}
          fishLog={fishLog}
          onClose={() => setActiveModal('none')}
          onResume={() => setActiveModal('none')}
          onSave={() => handleSaveGame(true)}
          onOpenJournal={() => setActiveModal('journal')}
          onOpenWardrobe={() => setActiveModal('wardrobe')}
          onQuitToTitle={() => {
            handleSaveGame(false);
            setActiveModal('none');
            setGameState('title');
          }}
          settings={settings}
          onUpdateSettings={(key, val) => {
            setSettings((prev) => {
              const updated = { ...prev, [key]: val };
              localStorage.setItem(LOCAL_STORAGE_SETTINGS_KEY, JSON.stringify(updated));
              return updated;
            });
          }}
          onExportSave={() => ({
            L: playerLook,
            coins,
            tot: totalCoins,
            ch: currentChapter,
            done: lullabyDone,
            skd: skyStoryDone,
            vg: visitedGlowdeep,
            vm: visitedMoonRoad,
            lore: loreEntries,
            ach: unlockedAchievements,
            mv: unlockedCutscenes,
            ug: upgrades,
            fs: fishLog,
            cottage: cottageState,
            hamlet: hamletResidents,
            visTowns: worldRef.current.towns.filter((t) => t.vis === 1).map((t) => t.n),
          })}
          onImportSave={(data) => {
            if (data.L) setPlayerLook(data.L);
            if (typeof data.coins === 'number') setCoins(data.coins);
            if (typeof data.tot === 'number') setTotalCoins(data.tot);
            if (typeof data.ch === 'number') setCurrentChapter(data.ch);
            if (data.done !== undefined) setLullabyDone(Boolean(data.done));
            if (data.skd !== undefined) setSkyStoryDone(Boolean(data.skd));
            if (data.vg) setVisitedGlowdeep(true);
            if (data.vm) setVisitedMoonRoad(true);
            if (Array.isArray(data.lore)) setLoreEntries(data.lore);
            if (Array.isArray(data.ach)) setUnlockedAchievements(data.ach);
            if (Array.isArray(data.mv)) setUnlockedCutscenes(data.mv);
            if (data.ug) setUpgrades(data.ug);
            if (data.fs) setFishLog(data.fs);
            if (data.cottage) setCottageState(data.cottage);
            if (Array.isArray(data.hamlet)) setHamletResidents(data.hamlet);
            if (Array.isArray(data.visTowns)) {
              worldRef.current.towns.forEach((t) => {
                if (data.visTowns.includes(t.n)) t.vis = 1;
              });
            }
            snapCamera();
            return true;
          }}
          currentWeatherId={currentWeather.id}
          onSelectWeather={(id) => {
            weatherRef.current.setWeather(id);
          }}
          initialTab={pauseInitialTab}
          isTitleScreen={gameState === 'title'}
          onOpenMap={() => setActiveModal('map')}
          onOpenSongWeaver={() => setActiveModal('songweaver')}
          onOpenCottage={() => setActiveModal('cottage')}
          currentTrackIndex={currentTrackIdx}
          onSelectTrack={(idx) => {
            setCurrentTrackIdx(idx);
            audio.setTrack(idx);
          }}
        />
      )}

      {/* Full Interactive Five-Phase World Atlas Modal */}
      {activeModal === 'map' && (
        <WorldMapModal
          terrain={worldRef.current.B}
          underwaterDecor={worldRef.current.UD}
          townMap={worldRef.current.TW}
          skyTerrain={worldRef.current.SB}
          skyDecor={worldRef.current.SD}
          towns={worldRef.current.towns}
          npcs={worldRef.current.npcs}
          hollows={worldRef.current.hollows}
          rings={worldRef.current.rings}
          playerPos={playerPos}
          playerName={playerLook.name}
          currentBiomeName={currentBiomeName}
          stars={worldRef.current.stars}
          pearls={worldRef.current.pearls}
          feathers={worldRef.current.feathers}
          quests={worldRef.current.quests}
          mana={mana}
          onTeleportToTown={handleTeleportToTown}
          onClose={() => setActiveModal('none')}
        />
      )}

      {/* Song of Teleportation Fast-Travel Modal */}
      {activeModal === 'teleport' && (
        <TeleportModal
          towns={worldRef.current.towns}
          playerPos={playerPos}
          mana={mana}
          spellCost={MAGIC_SPELLS.find((s) => s.id === 'teleport')?.cost ?? 25}
          onTeleport={handleTeleportToTown}
          onClose={() => setActiveModal('none')}
        />
      )}

      {/* Messages in a Bottle Modal */}
      {activeModal === 'bottles' && (
        <BottleModal playerName={playerLook.name} onClose={() => setActiveModal('none')} />
      )}

      {/* Meadows Gazette Modal */}
      {activeModal === 'gazette' && (
        <GazetteModal
          onClose={() => setActiveModal('none')}
          activeWeather={currentWeather}
          onEditionSeen={() => setHasNewGazette(false)}
          worldContext={{
            playerName: playerLook.name || 'Mochi',
            currentBiomeName,
            starsGot: worldRef.current.stars.filter((s) => s.got).length,
            pearlsGot: worldRef.current.pearls.filter((p) => p.got).length,
            feathersGot: worldRef.current.feathers.filter((f) => f.got).length,
            friendsGot: worldRef.current.npcs.filter((n) => n.fr && !n.tree).length,
            visitedTownsCount: worldRef.current.towns.filter((t) => t.vis === 1).length,
            currentChapter,
          }}
          coins={coins}
          onSpendCoins={(amount, reason) => {
            if (coins < amount) {
              showToast(`Need ${amount} coins — try the Daily Press Riddle or explore for gems!`);
              return false;
            }
            setCoins((c) => c - amount);
            audio.chime();
            showToast(`🗞️ ${reason} (-${amount} coins)`);
            return true;
          }}
          onEarnCoins={(amount, reason) => {
            setCoins((c) => c + amount);
            setTotalCoins((c) => c + amount);
            audio.chime();
            showToast(`🪙 ${reason}!`);
          }}
          library={gazetteLibrary}
          onSaveToLibrary={(item) => {
            setGazetteLibrary((prev) => {
              const filtered = prev.filter((p) => p.id !== item.id);
              const next = [item, ...filtered];
              saveGazetteLibrary(next);
              return next;
            });
          }}
          onToggleKeepLibraryItem={(id) => {
            setGazetteLibrary((prev) => {
              const next = prev.map((item) =>
                item.id === id ? { ...item, kept: !item.kept } : item
              );
              saveGazetteLibrary(next);
              const toggled = next.find((item) => item.id === id);
              if (toggled) {
                showToast(
                  toggled.kept
                    ? `★ Marked "${toggled.title}" to Keep in your Library`
                    : `Removed Keep pin from "${toggled.title}"`
                );
              }
              return next;
            });
          }}
          onDeleteLibraryItem={(id) => {
            setGazetteLibrary((prev) => {
              const next = prev.filter((item) => item.id !== id);
              saveGazetteLibrary(next);
              return next;
            });
            showToast('Removed item from Meadows Gazette Library');
          }}
          onRestoreLibraryItem={(item) => {
            setGazetteLibrary((prev) => {
              if (prev.some((p) => p.id === item.id)) return prev;
              const next = [item, ...prev];
              saveGazetteLibrary(next);
              return next;
            });
            showToast(`Restored "${item.title}" to Library!`);
          }}
          onClearUnkeptLibraryItems={() => {
            setGazetteLibrary((prev) => {
              const next = prev.filter((item) => item.kept);
              saveGazetteLibrary(next);
              return next;
            });
            showToast('Cleared unkept items from Gazette Library');
          }}
        />
      )}

      {/* Fishing Minigame Modal */}
      {activeModal === 'fishing' && (
        <FishingMinigame
          hasSturdyRod={Boolean(upgrades.rod)}
          onCatchFish={(fishName, coinsEarned) => {
            setFishLog((prev) => {
              const next = { ...prev, [fishName]: (prev[fishName] || 0) + 1 };
              fishLogRef.current = next;
              return next;
            });
            setCoins((c) => c + Math.round(coinsEarned * (upgrades.clover ? 1.5 : 1)));
            setTotalCoins((c) => c + coinsEarned);
            checkAchFnRef.current();
          }}
          onClose={() => setActiveModal('none')}
        />
      )}

      {/* Song Weaver Composer Tool */}
      {activeModal === 'songweaver' && (
        <SongWeaverModal
          onClose={() => setActiveModal('none')}
          initialNotes={cottageState.musicBoxSong}
          onSaveToMusicBox={(notes: number[]) => {
            setCottageState((prev) => ({ ...prev, musicBoxSong: notes }));
            setUnlockedAchievements((prev) =>
              prev.includes('song_weaver') ? prev : [...prev, 'song_weaver']
            );
            showToast('Pentatonic melody saved to your Moonlit Music Box! 🎶');
          }}
        />
      )}

      {/* Player Cozy Multi-Room House & Mochi Hamlet Modal */}
      {activeModal === 'cottage' && (
        <CottageModal
          cottage={cottageState}
          hamletResidents={hamletResidents}
          playerLook={playerLook}
          activeWeather={currentWeather}
          fishLog={fishLog}
          stamina={stamina}
          mana={mana}
          coins={coins}
          onUpdateCottage={(updated: Partial<CottageState>) => {
            setCottageState((prev) => {
              const next = { ...prev, ...updated };
              cottageStateRef.current = next;
              return next;
            });
            checkAchFnRef.current();
          }}
          onSpendCoins={(amount, reason) => {
            if (coins < amount) {
              showToast(`Need ${amount} coins for ${reason} — harvest sunroom flowers or explore for gems!`);
              return false;
            }
            setCoins((c) => c - amount);
            showToast(`🪙 ${reason} (-${amount} coins)`);
            return true;
          }}
          onEarnCoins={(amount, reason) => {
            setCoins((c) => c + amount);
            setTotalCoins((c) => c + amount);
            audio.chime();
            showToast(`🪙 ${reason} (+${amount} coins)`);
          }}
          onRestRestore={() => {
            const W = worldRef.current;
            W.player.st = 100;
            W.player.mp = 100;
            W.player.o2 = 100;
            setStamina(100);
            setMana(100);
            setAir(100);
            audio.chime();
            showToast('🛏️ Rested in your patchwork bed — Stamina, Mana & Air 100% restored!');
          }}
          onRestoreVitals={(stDelta, mpDelta, message) => {
            const W = worldRef.current;
            if (stDelta > 0) {
              W.player.st = Math.min(100, W.player.st + stDelta);
              setStamina(Math.round(W.player.st));
            }
            if (mpDelta > 0) {
              W.player.mp = Math.min(100, W.player.mp + mpDelta);
              setMana(Math.round(W.player.mp));
            }
            audio.chime();
            showToast(message);
          }}
          onInviteToHamlet={(npcName: string) => {
            if (hamletResidentsRef.current.some((r) => r.npcName === npcName)) return;
            const nextResident: HamletResident = {
              npcName,
              houseX: 120 + Math.floor(Math.random() * 20),
              houseY: 130 + Math.floor(Math.random() * 20),
              dialogue: `Happy to move to Mochi Hamlet on Lantern Isle!`,
            };
            setHamletResidents((prev) => {
              const next = [...prev, nextResident];
              hamletResidentsRef.current = next;
              return next;
            });
            checkAchFnRef.current();
            showToast(`${npcName} has moved to Mochi Hamlet! 🏘️`);
          }}
          onOpenSongWeaver={() => setActiveModal('songweaver')}
          onOpenWardrobe={() => setActiveModal('wardrobe')}
          onPlayMusicBox={() => {
            audio.playMusicBox(cottageState.musicBoxSong);
            setUnlockedAchievements((prev) =>
              prev.includes('song_weaver') ? prev : [...prev, 'song_weaver']
            );
            showToast('Music box is chiming your melody! 🎶');
          }}
          onStepOutside={() => {
            const W = worldRef.current;
            if (W.playerHomePortal) {
              W.player.sky = false;
              W.player.dive = false;
              W.player.glowdeep = false;
              W.player.moonroad = false;
              W.player.x = W.playerHomePortal.doorX;
              W.player.y = W.playerHomePortal.doorY + 14;
              W.player.vx = 0;
              W.player.vy = 0;
              W.player.moveTarget = null;
              W.companionPos.x = W.player.x - 24;
              W.companionPos.y = W.player.y + 4;
              snapCamera();
              triggerRealmFlash('#fff5e6', 0.3);
              spawnWorldPopup(W.player.x, W.player.y - 22, '🏡 Home Porch', '#ffe875');
              setPlayerPos({
                x: W.player.x,
                y: W.player.y,
                sky: false,
                dive: false,
                glowdeep: false,
                moonroad: false,
              });
              showToast(`🏡 Stepped onto your front porch on Lantern Isle!`);
            }
          }}
          onClose={() => setActiveModal('none')}
        />
      )}

      {/* Cutscene Overlay */}
      {activeCutscene && (
        <CutsceneOverlay
          slides={activeCutscene}
          playerLook={playerLook}
          getNpcLook={(name) => {
            const found = worldRef.current.npcs.find((n) => n.n === name);
            if (!found) return null;
            return {
              sp: found.sp,
              col: found.col,
              c2: '',
              ac: '#ff7aa8',
              hat: found.hat,
              eyes: 0,
              mouth: 0,
              pat: 0,
              out: 0,
              face: 0,
              aura: 0,
              name: found.n,
            };
          }}
          onFinish={() => {
            setActiveCutscene(null);
            if (currentChapterRef.current === 1 && !unlockedCutscenes.includes('wake')) {
              currentChapterRef.current = 2;
              setCurrentChapter(2);
              showToast('Chapter 2 Unlocked: The Puddle Sets Sail! ⛵');
            } else {
              evaluateStoryProgress();
            }
          }}
        />
      )}
    </div>
  );
}
