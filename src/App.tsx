/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  N,
  T,
  BIOME_NAMES,
  PlayerLook,
  Quest,
  NPC,
  LoreEntry,
  Town,
  TownArchStyle,
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
  getNpcLayer,
  getPlayerLayer,
  isNpcOnPlayerLayer,
  hasNpcDialogue,
} from './game/engine';
import {
  ORIGINAL_ISLANDERS,
  REEF_COURT,
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
import { Hud, QuestTrackerData, QuestTrackerSideQuest } from './components/Hud';
import { DialogModal } from './components/DialogModal';
import { JournalModal } from './components/JournalModal';
import { WardrobeModal } from './components/WardrobeModal';
import { PauseMenuModal } from './components/PauseMenuModal';
import { BottleModal } from './components/BottleModal';
import { GazetteModal } from './components/GazetteModal';
import { CutsceneOverlay } from './components/CutsceneOverlay';
import { TitleScreen, SaveSlotSummary } from './components/TitleScreen';
import { FishingMinigame } from './components/FishingMinigame';
import { SongWeaverModal } from './components/SongWeaverModal';
import { CottageModal } from './components/CottageModal';
import { CutsceneSlide } from './game/cutscenes';
import { WeatherSystem } from './game/weather';
import {
  ACHIEVEMENTS,
  WeatherConfig,
  SeasonId,
  MAGIC_SPELLS,
  SPELL_HARMONIES,
  MUSIC_TRACKS,
  SHOP_ITEMS,
  TOWN_MARKET_PROFILES,
  TOWN_COMMUNITY_REQUESTS,
  TownCommunityRequest,
} from './game/constants';
import { MarketModal } from './components/MarketModal';
import { SEASON_THEMES, SEASON_DURATION_SEC, getSeasonalBiomeColor, getScheduledSeasonState } from './game/seasons';
import { getSeasonalSpellVariant } from './game/seasonalSpells';
import {
  triggerMagicSurge,
  tickWorldParticles,
  tickMagicRings,
  draw2DParticle,
  spawnPooledParticle,
  spawnPooledBurst,
  spawnMagicRing,
  clearMagicPools,
  createScreenShakeState,
  triggerScreenShake,
  tickScreenShake,
  ScreenShakeState,
} from './game/magicSurge';
import { updateNPCWeatherBehavior, getNPCWeatherChatter } from './game/npcWeatherBehavior';
import { useDeviceProfile } from './game/useDeviceProfile';
import { TouchControls } from './components/TouchControls';
import { WorldMapModal } from './components/WorldMapModal';
import { multiTouchTap } from './utils/touchTap';
import { TeleportModal } from './components/TeleportModal';
import { CottageState, HamletResident, HollowCreature, HouseRoomId } from './game/engine';
import { WORLD_ANCHORS } from './game/worldAnchors';
import {
  HOUSE_DOOR_POS,
  HOUSE_ORIGIN_TX,
  HOUSE_ORIGIN_TZ,
  HOUSE_SPAWN_POS,
  HouseInteractable,
  HouseInteractionAction,
  getHouseRoomAt,
  getHouseRoomCenterWorld,
  getNearestHouseInteractable,
  isHouseInteriorBlocked,
} from './game/houseInterior3D';
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
  drawGlowHalo,
  executeYRenderQueue,
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
import { WorldRenderer3D, World3DSyncState, CameraPreset3D, getTerrainHeight3D } from './game/worldRenderer3D';
import { disposeSharedMochiTextures } from './game/mochiModel3D';

const LOCAL_STORAGE_SAVE_PREFIX = 'mochi-meadows-v2-slot-';
const LOCAL_STORAGE_SLOT1_CLEARED_KEY = 'mochi-meadows-v2-slot-1-cleared';
const LOCAL_STORAGE_ACTIVE_SLOT_KEY = 'mochi-meadows-active-slot';
const LOCAL_STORAGE_LEGACY_SAVE = 'mochi-meadows-v1-save';
const LOCAL_STORAGE_SETTINGS_KEY = 'mochi-meadows-v2-settings';

function getSlotStorageKey(slot: number): string {
  return `${LOCAL_STORAGE_SAVE_PREFIX}${slot}`;
}

function readSlotSaveRaw(slot: number): string | null {
  try {
    const direct = localStorage.getItem(getSlotStorageKey(slot));
    if (direct) return direct;
    // One-way legacy fallback ONLY for Slot 1 if it has not been explicitly cleared/reset,
    // and only if the legacy entry is an actual MM2 v2 save (has worldN), never an MM1 save.
    if (slot === 1 && !localStorage.getItem(LOCAL_STORAGE_SLOT1_CLEARED_KEY)) {
      const legacy = localStorage.getItem(LOCAL_STORAGE_LEGACY_SAVE);
      if (legacy) {
        const parsed = JSON.parse(legacy);
        if (parsed && typeof parsed.worldN === 'number') {
          return legacy;
        }
      }
    }
  } catch {
    return null;
  }
  return null;
}

function writeSlotSaveRaw(slot: number, payload: string): void {
  localStorage.setItem(LOCAL_STORAGE_ACTIVE_SLOT_KEY, String(slot));
  localStorage.setItem(getSlotStorageKey(slot), payload);
  if (slot === 1) {
    localStorage.removeItem(LOCAL_STORAGE_SLOT1_CLEARED_KEY);
  }
}

function eraseSlotSave(slot: number): void {
  localStorage.removeItem(getSlotStorageKey(slot));
  if (slot === 1) {
    localStorage.setItem(LOCAL_STORAGE_SLOT1_CLEARED_KEY, '1');
  }
}

function readSlotSummaries(): SaveSlotSummary[] {
  return [1, 2, 3].map((slot) => {
    const raw = readSlotSaveRaw(slot);
    if (!raw) return { slot, hasSave: false };
    try {
      const parsed = JSON.parse(raw);
      return {
        slot,
        hasSave: true,
        name: typeof parsed?.L?.name === 'string' && parsed.L.name.trim() ? parsed.L.name : 'Mochi',
        chapter: typeof parsed?.ch === 'number' ? parsed.ch : 1,
        coins: typeof parsed?.coins === 'number' ? parsed.coins : 0,
      };
    } catch {
      return { slot, hasSave: false };
    }
  });
}

function createDefaultCottageState(): CottageState {
  return {
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
  };
}

function createDefaultHamletResidents(): HamletResident[] {
  return [
    {
      npcName: 'Pip',
      houseX: WORLD_ANCHORS.towns.mochiHamlet.tx - 6,
      houseY: WORLD_ANCHORS.towns.mochiHamlet.ty - 2,
      dialogue: 'I love waking up next to the muffin oven!',
    },
    {
      npcName: 'Captain Barnacle',
      houseX: WORLD_ANCHORS.towns.mochiHamlet.tx + 2,
      houseY: WORLD_ANCHORS.towns.mochiHamlet.ty + 6,
      dialogue: 'Ahoy! Me hamlet cottage is shipwreck-free!',
    },
  ];
}

function createDefaultPlayerLook(): PlayerLook {
  return {
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
  };
}

const CAMERA_PRESETS_3D: CameraPreset3D[] = [
  'cozy',
  'close',
  'vista',
  'first_person',
  'third_forward',
  'third_backward',
];
const CAMERA_PRESET_LABELS = [
  'Cozy 3/4',
  'Close Up',
  'Scenic Vista',
  '1st Person',
  '3rd Person (Forward)',
  '3rd Person (Backward)',
];

function computeViewportDpr(
  w: number,
  h: number,
  pixelRatio: number,
  isPhone: boolean,
  isTablet: boolean,
  lowQ: boolean,
  isSoftwareGl: boolean
): number {
  if (isSoftwareGl) return 1;
  const maxDeviceDpr = lowQ ? 0.9 : isPhone ? 1.08 : isTablet ? 1.35 : 1.65;
  const rawDpr = Math.min(Math.max(1, pixelRatio || 1), maxDeviceDpr);
  const maxPixelBudget = lowQ ? 580_000 : isPhone ? 680_000 : 1_200_000;
  const pixelCapDpr = Math.sqrt(maxPixelBudget / Math.max(1, w * h));
  const minDpr = lowQ ? 0.75 : isPhone ? 0.85 : 1;
  return Math.max(minDpr, Math.min(rawDpr, pixelCapDpr));
}

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const threeMountRef = useRef<HTMLDivElement | null>(null);
  const renderer3DRef = useRef<WorldRenderer3D | null>(null);
  const camera3DStateRef = useRef({
    yaw: 0,
    pitch: 0,
    zoom: 1,
    pointerDown: false,
    dragging: false,
    startX: 0,
    startY: 0,
    lastX: 0,
    lastY: 0,
    didDrag: false,
    touchId: null as number | null,
    pinchStartDist: 0,
    pinchStartZoom: 1,
  });
  const [webglReady, setWebglReady] = useState(false);
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
  const [, setSaveSlotRevision] = useState(0);
  const initialDkRef = useRef<Uint8Array | null>(null);
  const baseHomeSpawnRef = useRef<{ x: number; y: number }>({
    x: WORLD_ANCHORS.towns.mochiHamlet.tx * T + T / 2,
    y: (WORLD_ANCHORS.towns.mochiHamlet.ty + 2) * T + T / 2,
  });
  const applySaveSnapshotRef = useRef<(data: any) => void>(() => {});

  // Game UI States
  const [gameState, setGameState] = useState<'title' | 'playing'>('title');
  const [activeModal, setActiveModal] = useState<
    'none' | 'dialog' | 'journal' | 'wardrobe' | 'pause' | 'bottles' | 'gazette' | 'fishing' | 'map' | 'songweaver' | 'cottage' | 'teleport' | 'market'
  >('none');
  const [activeMarketTown, setActiveMarketTown] = useState<string>('Willowbrook');
  const [marketInitialTab, setMarketInitialTab] = useState<'market' | 'board'>('market');
  const [townProsperity, setTownProsperity] = useState<Record<string, number>>({});
  const townProsperityRef = useRef(townProsperity);
  townProsperityRef.current = townProsperity;
  const [completedTownRequests, setCompletedTownRequests] = useState<string[]>([]);
  const completedTownRequestsRef = useRef(completedTownRequests);
  completedTownRequestsRef.current = completedTownRequests;
  const [nearbyTownAction, setNearbyTownAction] = useState<{
    kind: 'market' | 'board';
    townName: string;
    label: string;
    icon: string;
  } | null>(null);
  const nearbyTownActionRef = useRef(nearbyTownAction);
  nearbyTownActionRef.current = nearbyTownAction;
  const nearbyTownWorldTargetRef = useRef<{ x: number; y: number } | null>(null);
  const [activeCutscene, setActiveCutscene] = useState<CutsceneSlide[] | null>(null);
  const [activeCutsceneKey, setActiveCutsceneKey] = useState<string | null>(null);
  const [questRevision, setQuestRevision] = useState(0);
  const [pauseInitialTab, setPauseInitialTab] = useState<'menu' | 'progress' | 'settings' | 'cloud' | 'help'>('menu');
  const [journalInitialTab, setJournalInitialTab] = useState<
    'quests' | 'chapters' | 'reveille' | 'achievements' | 'diary' | 'harmonies' | 'theater'
  >('quests');
  const [selectedSpellIdx, setSelectedSpellIdx] = useState(0);

  // Last cast spell for combination harmonies & always-fresh cast ref for keyboard listeners
  const lastCastSpellRef = useRef<{ id: string; time: number } | null>(null);
  const castSpellFnRef = useRef<(idx: number) => void>(() => {});
  const portalInteractFnRef = useRef<() => void>(() => {});
  const finishCutsceneFnRef = useRef<() => void>(() => {});
  const cutsceneQueueRef = useRef<string[]>([]);
  const moveTargetStallRef = useRef<{ timer: number; lastX: number; lastY: number }>({
    timer: 0,
    lastX: 0,
    lastY: 0,
  });

  // Cottage & Hamlet State
  const [cottageState, setCottageState] = useState<CottageState>(createDefaultCottageState);
  const cottageStateRef = useRef(cottageState);
  cottageStateRef.current = cottageState;

  const [hamletResidents, setHamletResidents] = useState<HamletResident[]>(createDefaultHamletResidents);
  const hamletResidentsRef = useRef(hamletResidents);
  hamletResidentsRef.current = hamletResidents;

  // Player State
  const [playerLook, setPlayerLook] = useState<PlayerLook>(createDefaultPlayerLook);
  const playerLookRef = useRef<PlayerLook>(playerLook);
  playerLookRef.current = playerLook;
  const activeModalRef = useRef(activeModal);
  activeModalRef.current = activeModal;
  const activeCutsceneRef = useRef(activeCutscene);
  activeCutsceneRef.current = activeCutscene;
  const activeCutsceneKeyRef = useRef(activeCutsceneKey);
  activeCutsceneKeyRef.current = activeCutsceneKey;
  const gameStateRef = useRef(gameState);
  gameStateRef.current = gameState;

  const [playerPos, setPlayerPos] = useState({
    x: 0,
    y: 0,
    sky: false,
    dive: false,
    swim: false,
    glowdeep: false,
    moonroad: false,
    house: false,
  });
  const [activeHouseInteractable, setActiveHouseInteractable] = useState<HouseInteractable | null>(null);
  const is3DActiveRef = useRef(true);
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
  const jumpFnRef = useRef<() => void>(() => {});
  const diveFnRef = useRef<() => void>(() => {});
  const canFishFnRef = useRef<() => boolean>(() => false);
  const cycleMusicFnRef = useRef<() => void>(() => {});
  const cycleCameraFnRef = useRef<() => void>(() => {});
  const saveGameFnRef = useRef<(showNotification?: boolean) => void>(() => {});
  const evalStoryFnRef = useRef<() => void>(() => {});
  const checkAchFnRef = useRef<() => void>(() => {});
  const houseActionFnRef = useRef<(action: HouseInteractionAction) => void>(() => {});
  const hudSyncRef = useRef({
    st: 100,
    o2: 100,
    mp: 100,
    biome: 'Sunny Meadow',
    npc: null as NPC | null,
    houseItemId: null as string | null,
    townActionKey: '',
    pxQuant: -999,
    pyQuant: -999,
    layerKey: '',
    lastMinimapMs: 0,
    lastModalDrawMs: 0,
    lastTitle3DMs: 0,
  });
  const syncState3DRef = useRef<World3DSyncState | null>(null);
  const aquariumFishCacheRef = useRef<{
    fishLog: Record<string, number>;
    starter: string[];
    list: string[];
  } | null>(null);
  const minimapCacheRef = useRef<{ layer: string; season: SeasonId; canvas: HTMLCanvasElement } | null>(null);

  // Settings
  const [settings, setSettings] = useState<{
    vol: number;
    low: number;
    night: number;
    auto: number;
    hints: number;
    camPreset: number;
  }>({
    vol: 0.8,
    low: 0,
    night: 1,
    auto: 1,
    hints: 1,
    camPreset: 0,
  });
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  // Track & Music
  const [currentTrackIdx, setCurrentTrackIdx] = useState(0);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimerRef = useRef<number | null>(null);
  const [milestoneQueue, setMilestoneQueue] = useState<
    { id: string; kind: 'chapter' | 'achievement' | 'verse'; icon: string; eyebrow: string; title: string; subtitle: string }[]
  >([]);
  useEffect(() => {
    if (milestoneQueue.length === 0) return;
    const timer = window.setTimeout(() => {
      setMilestoneQueue((prev) => prev.slice(1));
    }, 3800);
    return () => window.clearTimeout(timer);
  }, [milestoneQueue]);

  // Automatic Periodic Seasons & Weather (progresses even when no user is playing)
  const initialSeasonState = getScheduledSeasonState(Date.now());
  const [currentSeason, setCurrentSeason] = useState<SeasonId>(initialSeasonState.season);
  const currentSeasonRef = useRef<SeasonId>(initialSeasonState.season);
  currentSeasonRef.current = currentSeason;
  const [seasonRemainingSec, setSeasonRemainingSec] = useState<number>(initialSeasonState.remainingSeconds);

  // Weather System
  const weatherRef = useRef<WeatherSystem>(new WeatherSystem());
  const [currentWeather, setCurrentWeather] = useState<WeatherConfig>(weatherRef.current.currentWeather);
  const [weatherRemainingSec, setWeatherRemainingSec] = useState<number>(
    Math.max(1, Math.ceil(weatherRef.current.weatherTimer))
  );

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
    lilyMap: Map<number, number>;
    hotSprings: { x: number; y: number; expires: number }[];
    dkRevision: number;
    echoTargets3D: { x: number; y: number; kind: 'echo' | 'diary' }[];
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
    frostGlowTimer: number;
    thermalGlideTimer: number;
    echoMagnetTimer: number;
    echoMagnetTick: number;
    bloomStepCooldown: number;
    marketSpeedTimer: number;
    marketDiveTimer: number;
    marketWarmthTimer: number;
    marketLuckTimer: number;
    shakenTiles: Set<number>;
    discoveredEchoIds: Set<string>;
    discoveredDiaryPages: Set<number>;
    dawnChimesCount: number;
    worldPopups: { x: number; y: number; text: string; color: string; age: number; maxAge: number }[];
    dashGhosts: { x: number; y: number; face: number; alpha: number }[];
    footstepTimer: number;
    camera: { x: number; y: number; initialized: boolean };
    screenShake: ScreenShakeState;
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
      swim: boolean;
      isSprinting: boolean;
      z: number;
      vz: number;
      jumpCount: number;
      coyoteTimer: number;
      wasSwimming: boolean;
      glowdeep: boolean;
      moonroad: boolean;
      house: boolean;
      isMoving: boolean;
      moveTarget: { x: number; y: number } | null;
    };
    companionPos: { x: number; y: number };
    keys: Set<string>;
    touchJoystick: { active: boolean; startX: number; startY: number; curX: number; curY: number };
    season?: SeasonId;
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
    lilyMap: new Map(),
    hotSprings: [],
    dkRevision: 0,
    echoTargets3D: [],
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
    frostGlowTimer: 0,
    thermalGlideTimer: 0,
    echoMagnetTimer: 0,
    echoMagnetTick: 0,
    bloomStepCooldown: 0,
    marketSpeedTimer: 0,
    marketDiveTimer: 0,
    marketWarmthTimer: 0,
    marketLuckTimer: 0,
    shakenTiles: new Set(),
    discoveredEchoIds: new Set(),
    discoveredDiaryPages: new Set(),
    dawnChimesCount: 0,
    worldPopups: [],
    dashGhosts: [],
    footstepTimer: 0,
    camera: { x: 0, y: 0, initialized: false },
    screenShake: createScreenShakeState(),
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
      swim: false,
      isSprinting: false,
      z: 0,
      vz: 0,
      jumpCount: 0,
      coyoteTimer: 0,
      wasSwimming: false,
      glowdeep: false,
      moonroad: false,
      house: false,
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

  const enqueueMilestone = useCallback(
    (item: { id: string; kind: 'chapter' | 'achievement' | 'verse'; icon: string; eyebrow: string; title: string; subtitle: string }) => {
      setMilestoneQueue((prev) => (prev.some((m) => m.id === item.id) ? prev : [...prev, item].slice(-6)));
    },
    []
  );

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

  const triggerCameraShake = useCallback((intensity: number = 4, duration: number = 0.28, freq: number = 24) => {
    triggerScreenShake(worldRef.current.screenShake, intensity, duration, freq);
  }, []);

  const snapCamera = useCallback(() => {
    const W = worldRef.current;
    W.camera.x = W.player.x;
    W.camera.y = W.player.y;
    W.camera.initialized = true;
    renderer3DRef.current?.snapCameraNextFrame();
  }, []);

  const alignCameraForPreset = useCallback((prevIdx: number, nextIdx: number) => {
    const prevPreset = CAMERA_PRESETS_3D[prevIdx] ?? 'cozy';
    const nextPreset = CAMERA_PRESETS_3D[nextIdx] ?? 'cozy';
    const isNextPerspective =
      nextPreset === 'first_person' || nextPreset === 'third_forward' || nextPreset === 'third_backward';
    const wasPrevPerspective =
      prevPreset === 'first_person' || prevPreset === 'third_forward' || prevPreset === 'third_backward';

    if (isNextPerspective) {
      if (!wasPrevPerspective) {
        const W = worldRef.current;
        const dLen = Math.hypot(W.player.dx, W.player.dy);
        const faceYaw = dLen > 0.01 ? Math.atan2(W.player.dx, W.player.dy) : 0;
        camera3DStateRef.current.yaw = faceYaw + Math.PI;
      }
      camera3DStateRef.current.pitch = 0;
      camera3DStateRef.current.zoom = 1;
    } else {
      camera3DStateRef.current.yaw = 0;
      camera3DStateRef.current.pitch = 0;
      camera3DStateRef.current.zoom = 1;
    }
  }, []);

  const selectCameraPreset = useCallback((nextIdx: number) => {
    const safeIdx = Math.max(0, Math.min(CAMERA_PRESETS_3D.length - 1, nextIdx));
    setSettings((prev) => {
      const prevIdx = prev.camPreset ?? 0;
      alignCameraForPreset(prevIdx, safeIdx);
      const updated = { ...prev, camPreset: safeIdx };
      localStorage.setItem(LOCAL_STORAGE_SETTINGS_KEY, JSON.stringify(updated));
      showToast(`🎥 Camera: ${CAMERA_PRESET_LABELS[safeIdx]}`);
      return updated;
    });
  }, [alignCameraForPreset, showToast]);

  const cycleCameraPreset = useCallback(() => {
    setSettings((prev) => {
      const prevIdx = prev.camPreset ?? 0;
      const nextIdx = (prevIdx + 1) % CAMERA_PRESETS_3D.length;
      alignCameraForPreset(prevIdx, nextIdx);
      const updated = { ...prev, camPreset: nextIdx };
      localStorage.setItem(LOCAL_STORAGE_SETTINGS_KEY, JSON.stringify(updated));
      showToast(`🎥 Camera: ${CAMERA_PRESET_LABELS[nextIdx]}`);
      return updated;
    });
  }, [alignCameraForPreset, showToast]);
  cycleCameraFnRef.current = cycleCameraPreset;

  // Listen to Weather System changes (works in gameplay, title screen & UI theme sync)
  useEffect(() => {
    weatherRef.current.onWeatherChanged = (newWeather) => {
      setCurrentWeather(newWeather);
      setWeatherRemainingSec(Math.max(1, Math.ceil(weatherRef.current.weatherTimer)));
      document.documentElement.dataset.weather = newWeather.id;
      const wSys = weatherRef.current;
      audio.setEnvironment({
        weatherId: wSys.currentWeather.id,
        targetWeatherId: wSys.isTransitioning ? wSys.targetWeather.id : wSys.currentWeather.id,
        transitionProgress: wSys.isTransitioning ? wSys.transitionProgress : 0,
        seasonId: currentSeasonRef.current,
      });
      if (gameStateRef.current === 'playing') {
        showToast(newWeather.ambientMessage);
      }

      // Trigger unique NPC reaction bubbles & behavior shift on the player's active layer
      const npcs = worldRef.current.npcs;
      const activePlayer = worldRef.current.player;
      npcs.forEach((npc) => {
        if (!isNpcOnPlayerLayer(npc, activePlayer)) return;
        if (!npc.tree) {
          npc.say = getNPCWeatherChatter(npc, newWeather.id);
          npc.sayT = 6.0;
          npc.wt = 0; // Immediately re-evaluate movement behavior
        }
      });
    };
  }, [showToast]);

  // Continuous World Almanac Clock (advances Seasons & Weather even when no user is playing)
  useEffect(() => {
    let lastTickMs = Date.now();

    const syncNaturalCycles = () => {
      const now = Date.now();
      const elapsedSec = Math.max(0, (now - lastTickMs) / 1000);
      lastTickMs = now;

      // 1. Periodic Season Rollover (12m per season — ~5x longer than weather spells)
      const schedSeason = getScheduledSeasonState(now);
      if (schedSeason.season !== currentSeasonRef.current) {
        currentSeasonRef.current = schedSeason.season;
        setCurrentSeason(schedSeason.season);
        minimapCacheRef.current = null;
        worldRef.current.season = schedSeason.season;
        document.documentElement.dataset.season = schedSeason.season;
        const theme = SEASON_THEMES[schedSeason.season];
        if (gameStateRef.current === 'playing') {
          showToast(`${theme.icon} ${theme.name} has arrived! ${theme.subtitle} — ${theme.badgeText}`);
        }
      }

      // 2. Advance Weather automatically when idle, on Title Screen, or returning from background sleep
      if (gameStateRef.current !== 'playing' || document.hidden || elapsedSec > 3) {
        weatherRef.current.advanceClock(elapsedSec);
      }

      // 3. Keep Ambient Audio Engine synchronized with Weather, Crossfade Progress & Season
      const wSys = weatherRef.current;
      audio.setEnvironment({
        weatherId: wSys.currentWeather.id,
        targetWeatherId: wSys.isTransitioning ? wSys.targetWeather.id : wSys.currentWeather.id,
        transitionProgress: wSys.isTransitioning ? wSys.transitionProgress : 0,
        seasonId: schedSeason.season,
      });

      // 4. Keep modal countdowns fresh while Pause/Settings Almanac is open
      if (activeModalRef.current === 'pause') {
        setSeasonRemainingSec(schedSeason.remainingSeconds);
        setWeatherRemainingSec(Math.max(1, Math.ceil(weatherRef.current.weatherTimer)));
      }
    };

    syncNaturalCycles();
    const timer = window.setInterval(syncNaturalCycles, 1000);
    const handleResume = () => syncNaturalCycles();
    document.addEventListener('visibilitychange', handleResume);
    window.addEventListener('focus', handleResume);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', handleResume);
      window.removeEventListener('focus', handleResume);
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

    // Helper: raise an organic archipelago island bulge around (cx, cy)
    const islandBulge = (
      x: number,
      y: number,
      cx: number,
      cy: number,
      r: number,
      noiseVal: number
    ) => {
      const dist = Math.hypot(x - cx, y - cy);
      const effR = r * (0.86 + 0.28 * noiseVal);
      if (dist >= effR) return -1;
      const tNorm = 1 - dist / effR;
      return 0.36 + tNorm * 0.44 + (noiseVal - 0.5) * 0.14;
    };

    // 1. Surface Archipelago Generation (Lantern Isle + 10 Outer Archipelago Islands across 420x420)
    const isl = WORLD_ANCHORS.islands;
    for (let y = 0; y < N; y++) {
      for (let x = 0; x < N; x++) {
        // Primary Central Continent (Lantern Isle)
        const dx = (x / N) * 2 - 1;
        const dy = (y / N) * 2 - 1;
        const d = Math.hypot(dx, dy);
        const shapeN = fbm(x * 0.022, y * 0.022, 1);
        let e = shapeN * 1.15 - Math.pow(d, 2.35) * 0.62 + 0.16;

        // Guarantee heart of Lantern Isle (Lantern Tree + Mochi Hamlet) is lush walkable meadow
        const distCenter = Math.hypot(x - isl.lanternIsle.tx, y - isl.lanternIsle.ty);
        if (distCenter < 26) {
          e = Math.max(e, 0.56);
        }

        const t = fbm(x * 0.02, y * 0.02, 2) * 0.5 + (y / N) * 0.5;
        const m = fbm(x * 0.032, y * 0.032, 3);
        const z = fbm(x * 0.048, y * 0.048, 4);

        let b = 3;
        if (e < 0.3) b = 0;
        else if (e < 0.37) b = 1;
        else if (e < 0.41) b = 2;
        else if (e > 0.84) b = 8;
        else if (t < 0.36) b = 7;
        else if (t > 0.6 && m < 0.5) b = 6;
        else if (m > 0.56) b = 4;
        else if (z > 0.6) b = 5;

        // Scenic Lantern Isle freshwater ponds (Mirror Pond & Meadow Brook Lagoon)
        const pondWarp = (vn(x * 0.15, y * 0.15, 29) - 0.5) * 1.4;
        if (b >= 3 && (Math.hypot(x - 174, y - 178) < 5.2 + pondWarp || Math.hypot(x - 244, y - 232) < 4.6 + pondWarp)) {
          b = 1;
        }

        // Outer Named Archipelago Islands (matching WorldMapModal & WORLD_ANCHORS.islands)
        const edgeN = vn(x * 0.1, y * 0.1, 17);

        // Island 2: Honeycomb Hills (NW)
        const hHoney = islandBulge(x, y, isl.honeycombHills.tx, isl.honeycombHills.ty, 25.5, edgeN);
        if (hHoney > 0) {
          const distH = Math.hypot(x - isl.honeycombHills.tx, y - isl.honeycombHills.ty);
          b = distH > 19.5 ? 2 : distH < 11.5 || m > 0.48 ? 5 : 3;
        }

        // Island 3: Tidepool Atoll (SW Main Cay + Starfish Shallows Cay)
        const hAtollA = islandBulge(x, y, isl.tidepoolAtoll.tx, isl.tidepoolAtoll.ty, 20.5, edgeN);
        const hAtollB = islandBulge(x, y, isl.starfishCay.tx, isl.starfishCay.ty, 16.0, edgeN);
        if (hAtollA > 0 || hAtollB > 0) {
          const dA = Math.hypot(x - isl.tidepoolAtoll.tx, y - isl.tidepoolAtoll.ty);
          const dB = Math.hypot(x - isl.starfishCay.tx, y - isl.starfishCay.ty);
          b = dA < 11.0 ? 3 : dB < 8.5 && hAtollB > 0.45 ? 2 : 2;
          if (Math.hypot(x - (isl.tidepoolAtoll.tx + 5), y - (isl.tidepoolAtoll.ty - 3)) < 8.2) b = 3;
        }

        // Island 4: Cinder Cradle (South)
        const hCinder = islandBulge(x, y, isl.cinderCradle.tx, isl.cinderCradle.ty, 23.0, edgeN);
        if (hCinder > 0) {
          const dC = Math.hypot(x - isl.cinderCradle.tx, y - isl.cinderCradle.ty);
          b = dC > 17.8 ? 2 : dC < 7.6 && y < isl.cinderCradle.ty - 3 ? 8 : 6;
        }

        // Island 5: Mirror Fens (SE)
        const hFens = islandBulge(x, y, isl.mirrorFens.tx, isl.mirrorFens.ty, 23.0, edgeN);
        if (hFens > 0) {
          const dF = Math.hypot(x - isl.mirrorFens.tx, y - isl.mirrorFens.ty);
          b = dF > 17.8 ? 2 : z > 0.54 ? 3 : 4;
        }

        // Island 6: Aurora Reach (NE)
        const hAurora = islandBulge(x, y, isl.auroraReach.tx, isl.auroraReach.ty, 23.5, edgeN);
        if (hAurora > 0) {
          const dAu = Math.hypot(x - isl.auroraReach.tx, y - isl.auroraReach.ty);
          b = dAu > 18.2 ? 2 : dAu < 7.2 && y < isl.auroraReach.ty - 3 ? 8 : 7;
        }

        // Island 7: Chime Canopy (North)
        const hChime = islandBulge(x, y, isl.chimeCanopy.tx, isl.chimeCanopy.ty, 22.0, edgeN);
        if (hChime > 0) {
          const dCh = Math.hypot(x - isl.chimeCanopy.tx, y - isl.chimeCanopy.ty);
          b = dCh > 17.2 ? 2 : m > 0.52 ? 5 : 4;
        }

        // Island 8: Dawn Spire (East)
        const hDawn = islandBulge(x, y, isl.dawnSpire.tx, isl.dawnSpire.ty, 21.5, edgeN);
        if (hDawn > 0) {
          const dDa = Math.hypot(x - isl.dawnSpire.tx, y - isl.dawnSpire.ty);
          b = dDa > 16.5 ? 2 : dDa < 6.5 && y < isl.dawnSpire.ty - 4 ? 5 : 3;
        }

        // Island 9: Sapphire Bluff (Far West)
        const hSapphire = islandBulge(x, y, isl.sapphireBluff.tx, isl.sapphireBluff.ty, 20.0, edgeN);
        if (hSapphire > 0) {
          const dSa = Math.hypot(x - isl.sapphireBluff.tx, y - isl.sapphireBluff.ty);
          b = dSa > 15.2 ? 2 : dSa < 6.0 && y < isl.sapphireBluff.ty - 3 ? 8 : m > 0.5 ? 4 : 3;
        }

        // Island 10: Maple Mist Isle (NW Strait)
        const hMaple = islandBulge(x, y, isl.mapleMist.tx, isl.mapleMist.ty, 19.0, edgeN);
        if (hMaple > 0) {
          const dMa = Math.hypot(x - isl.mapleMist.tx, y - isl.mapleMist.ty);
          b = dMa > 14.4 ? 2 : z > 0.45 ? 5 : 4;
        }

        // Island 11: Starfall Shoals (Far SE Atoll)
        const hStarfall = islandBulge(x, y, isl.starfallShoals.tx, isl.starfallShoals.ty, 20.0, edgeN);
        if (hStarfall > 0) {
          const dSt = Math.hypot(x - isl.starfallShoals.tx, y - isl.starfallShoals.ty);
          b = dSt > 14.5 ? 2 : dSt < 5.5 && y < isl.starfallShoals.ty - 3 ? 8 : m > 0.52 ? 3 : 6;
        }

        // Preserve key Undersea Reef landmark basins & Driftwood Dive Lagoon as water
        if (Math.hypot(x - WORLD_ANCHORS.reef.atollSunkenRuins.tx, y - WORLD_ANCHORS.reef.atollSunkenRuins.ty) < 4.5) {
          b = 1; // Atoll Sunken Ruins shallow turquoise cove
        }
        if (Math.hypot(x - WORLD_ANCHORS.reef.coralConcertHall.tx, y - WORLD_ANCHORS.reef.coralConcertHall.ty) < 6.8) {
          b = 0; // Coral Concert Hall basin
        }
        if (Math.hypot(x - WORLD_ANCHORS.reef.starlitKelpTrench.tx, y - WORLD_ANCHORS.reef.starlitKelpTrench.ty) < 6.8) {
          b = 0; // Starlit Kelp Trench deep reef
        }
        if (Math.hypot(x - WORLD_ANCHORS.reef.driftwoodDiveLagoon.tx, y - WORLD_ANCHORS.reef.driftwoodDiveLagoon.ty) < 3.6) {
          b = 1; // Driftwood Dive Lagoon off southern Driftwood Dock
        }
        if (Math.hypot(x - WORLD_ANCHORS.reef.sunkenPearlGrotto.tx, y - WORLD_ANCHORS.reef.sunkenPearlGrotto.ty) < 4.6) {
          b = 1; // Sunken Pearl Grotto western cove
        }

        W.B[y * N + x] = b;
        W.DK[y * N + x] = dec(b, hash(x, y, 9));

        if (b >= 2 && !W.DK[y * N + x] && hash(x, y, 5) < 0.0052) {
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

        if (!W.UD[i] && hash(x, y, 6) < (b ? 0.0054 : 0.0042)) {
          W.pearls.push({ x: x * T + T / 2, y: y * T + T / 2, got: 0 });
        }

        if (
          W.B[i - 1] < 2 &&
          W.B[i + 1] < 2 &&
          W.B[i - N] < 2 &&
          W.B[i + N] < 2 &&
          hash(x, y, 7) < 0.0044
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

    // Clear center plaza & frame Undersea Landmarks
    const frameReefSite = (cx: number, cy: number, radius: number, ringKind: number, altKind: number) => {
      for (let dy = -radius - 1; dy <= radius + 1; dy++) {
        for (let dx = -radius - 1; dx <= radius + 1; dx++) {
          const px = cx + dx;
          const py = cy + dy;
          if (px < 2 || py < 2 || px >= N - 2 || py >= N - 2) continue;
          const dist = Math.hypot(dx, dy);
          const idx = py * N + px;
          if (dist < 2.2) {
            W.UD[idx] = 0;
          } else if (dist >= radius - 0.6 && dist <= radius + 0.6 && (dx + dy) % 2 === 0) {
            if (W.B[idx] < 2) {
              W.UD[idx] = Math.abs(dx) === Math.abs(dy) ? altKind : ringKind;
            }
          }
        }
      }
    };
    frameReefSite(WORLD_ANCHORS.reef.coralConcertHall.tx, WORLD_ANCHORS.reef.coralConcertHall.ty, 3.6, 2, 7);
    frameReefSite(WORLD_ANCHORS.reef.starlitKelpTrench.tx, WORLD_ANCHORS.reef.starlitKelpTrench.ty, 3.8, 1, 7);
    frameReefSite(WORLD_ANCHORS.reef.atollSunkenRuins.tx, WORLD_ANCHORS.reef.atollSunkenRuins.ty, 2.8, 3, 4);
    frameReefSite(WORLD_ANCHORS.reef.driftwoodDiveLagoon.tx, WORLD_ANCHORS.reef.driftwoodDiveLagoon.ty, 2.5, 4, 7);
    frameReefSite(WORLD_ANCHORS.reef.sunkenPearlGrotto.tx, WORLD_ANCHORS.reef.sunkenPearlGrotto.ty, 3.4, 3, 7);

    // 3. Towns Generation (Every settlement from TOWNS_DATA_MM2 anchored to its map coordinates)
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
          if (x < 2 || y < 2 || x >= N - 2 || y >= N - 2 || !f(W.B[y * N + x])) return false;
        }
      }
      return true;
    };

    const AT = WORLD_ANCHORS.towns;
    const townConfigs: {
      nm: string;
      bi: number;
      arch: TownArchStyle;
      ax: number;
      ay: number;
      wt: number;
      island: string;
      monument?: boolean;
    }[] = [
      { nm: 'Willowbrook', bi: 3, arch: 'meadow', ax: AT.willowbrook.tx, ay: AT.willowbrook.ty, wt: 0, island: 'Lantern Isle' },
      { nm: 'Mossgate', bi: 4, arch: 'meadow', ax: AT.mossgate.tx, ay: AT.mossgate.ty, wt: 0, island: 'Lantern Isle' },
      { nm: 'Oasis Rest', bi: 6, arch: 'desert', ax: AT.oasisRest.tx, ay: AT.oasisRest.ty, wt: 0, island: 'Lantern Isle' },
      { nm: 'Frostholm', bi: 7, arch: 'nordic', ax: AT.frostholm.tx, ay: AT.frostholm.ty, wt: 0, island: 'Lantern Isle' },
      { nm: 'Pebble Peaks', bi: 8, arch: 'nordic', ax: AT.pebblePeaks.tx, ay: AT.pebblePeaks.ty, wt: 0, island: 'Lantern Isle' },
      { nm: 'Driftwood Dock', bi: 2, arch: 'coastal', ax: AT.driftwoodDock.tx, ay: AT.driftwoodDock.ty, wt: 1, island: 'Lantern Isle' },
      { nm: 'Petal Hollow', bi: 5, arch: 'blossom', ax: AT.petalHollow.tx, ay: AT.petalHollow.ty, wt: 0, island: 'Lantern Isle' },
      { nm: 'Bramblebridge', bi: 3, arch: 'meadow', ax: AT.bramblebridge.tx, ay: AT.bramblebridge.ty, wt: 0, island: 'Lantern Isle', monument: true },
      { nm: 'Honeycomb Village', bi: 5, arch: 'meadow', ax: AT.honeycombVillage.tx, ay: AT.honeycombVillage.ty, wt: 0, island: 'Honeycomb Hills' },
      { nm: 'Wildflower Mill', bi: 3, arch: 'meadow', ax: AT.wildflowerMill.tx, ay: AT.wildflowerMill.ty, wt: 0, island: 'Honeycomb Hills', monument: true },
      { nm: 'Tidepool Haven', bi: 3, arch: 'coastal', ax: AT.tidepoolHaven.tx, ay: AT.tidepoolHaven.ty, wt: 1, island: 'Tidepool Atoll', monument: true },
      { nm: 'Starfish Shallows', bi: 2, arch: 'coastal', ax: AT.starfishShallows.tx, ay: AT.starfishShallows.ty, wt: 1, island: 'Tidepool Atoll' },
      { nm: 'Cinder Spas', bi: 6, arch: 'desert', ax: AT.cinderSpas.tx, ay: AT.cinderSpas.ty, wt: 0, island: 'Cinder Cradle', monument: true },
      { nm: 'Lily Pavilion', bi: 4, arch: 'blossom', ax: AT.lilyPavilion.tx, ay: AT.lilyPavilion.ty, wt: 0, island: 'Mirror Fens', monument: true },
      { nm: 'Aurora Station', bi: 7, arch: 'nordic', ax: AT.auroraStation.tx, ay: AT.auroraStation.ty, wt: 0, island: 'Aurora Reach', monument: true },
      { nm: 'Bellwood Treetops', bi: 4, arch: 'blossom', ax: AT.bellwoodTreetops.tx, ay: AT.bellwoodTreetops.ty, wt: 0, island: 'Chime Canopy', monument: true },
      { nm: 'Dawn Spire Summit', bi: 3, arch: 'blossom', ax: AT.dawnSpireSummit.tx, ay: AT.dawnSpireSummit.ty, wt: 0, island: 'Dawn Spire', monument: true },
      { nm: 'Sapphire Haven', bi: 2, arch: 'coastal', ax: AT.sapphireHaven.tx, ay: AT.sapphireHaven.ty, wt: 1, island: 'Sapphire Bluff', monument: true },
      { nm: 'Maple Crossing', bi: 5, arch: 'blossom', ax: AT.mapleCrossing.tx, ay: AT.mapleCrossing.ty, wt: 1, island: 'Maple Mist Isle', monument: true },
      { nm: 'Starfall Observatory', bi: 6, arch: 'nordic', ax: AT.starfallObservatory.tx, ay: AT.starfallObservatory.ty, wt: 1, island: 'Starfall Shoals', monument: true },
    ];

    townConfigs.forEach(({ nm, bi, arch, ax, ay, wt, island, monument }) => {
      let bestX = ax;
      let bestY = ay;
      let bestScore = 1e9;

      for (let y = Math.max(8, ay - 22); y <= Math.min(N - 8, ay + 22); y++) {
        for (let x = Math.max(10, ax - 22); x <= Math.min(N - 10, ax + 22); x++) {
          if (W.towns.some((t) => Math.hypot(t.x - x, t.y - y) < 12.5)) continue;
          const bHere = W.B[y * N + x];
          if (bHere < 2) continue;
          if (!regOK(x, y, (v) => v >= 2)) continue;
          if (wt) {
            let hasWater = false;
            for (let dy = -12; dy <= 12 && !hasWater; dy += 2) {
              for (let dx = -12; dx <= 12; dx += 2) {
                const wx = x + dx;
                const wy = y + dy;
                if (wx >= 0 && wy >= 0 && wx < N && wy < N && W.B[wy * N + wx] < 2) {
                  hasWater = true;
                  break;
                }
              }
            }
            if (!hasWater) continue;
          }
          const biomePenalty = bHere === bi ? 0 : 6;
          const score = Math.hypot(x - ax, y - ay) + biomePenalty;
          if (score < bestScore) {
            bestScore = score;
            bestX = x;
            bestY = y;
          }
        }
      }

      // Guarantee the plaza ground is dry & biome-harmonized with cobblestone avenues
      for (let j = bestY - 5; j <= bestY + 5; j++) {
        for (let i = bestX - 7; i <= bestX + 7; i++) {
          if (i < 1 || j < 1 || i >= N - 1 || j >= N - 1) continue;
          const idx = j * N + i;
          if (W.B[idx] < 2) W.B[idx] = bi >= 2 ? bi : 3;
          W.DK[idx] = 0;
          W.TW[idx] = j === bestY || i === bestX || Math.hypot(i - bestX, j - bestY) < 2.9 ? 2 : 1;
        }
      }

      W.towns.push({
        n: nm,
        x: bestX,
        y: bestY,
        w: 0,
        vis: nm === 'Willowbrook' ? 1 : 0,
        island,
        bi,
        arch,
        prosperity: 1,
      });
      [
        [-6, -2],
        [3, -2],
        [-6, 3],
        [3, 3],
      ].forEach(([a, b]) => house(W.DK, bestX + a, bestY + b, 10, 16));

      const streetProps: [number, number, number][] = [
        [0, 0, 14],     // Central Town Fountain
        [0, -4, 19],    // North Walkable Festival Arch
        [0, 4, 19],     // South Walkable Festival Arch
        [-2, -2, 17],   // Main Market Stall Left
        [2, -2, 17],    // Main Market Stall Right
        [-2, 0, 23],    // Interactive Town Noticeboard
        [2, 0, wt ? 20 : 18], // Town Wishing Well or Flower Cart
        [-2, 2, 20],    // Blooming Flower Cart
        [2, 2, 21],     // Tea Cafe Bistro Set
        [-1, -3, 21],   // Northern Tea Table
        [-3, 0, 13],    // West Plaza Lantern
        [3, 0, 13],     // East Plaza Lantern
        [-1, 3, 13],    // South-West Lantern
        [1, 3, 13],     // South-East Lantern
        [1, 4, 12],     // Town Signpost
      ];
      if (wt) {
        streetProps.push([-4, 4, 22], [5, 4, 22]); // Harbor Wharf Bollards & Cargo
      } else if (monument) {
        streetProps.push([-3, -4, 13], [3, -4, 13]);
      } else {
        streetProps.push([-2, -3, 11], [2, -3, 11]); // Cozy plaza benches
      }
      streetProps.forEach(([a, b, t]) => {
        const sx = bestX + a;
        const sy = bestY + b;
        if (sx > 1 && sy > 1 && sx < N - 1 && sy < N - 1) {
          W.DK[sy * N + sx] = t;
        }
      });
    });

    // Connect neighboring Lantern Isle settlements with gentle winding cobblestone roads
    const roadPairs: [string, string][] = [
      ['Willowbrook', 'Mossgate'],
      ['Willowbrook', 'Driftwood Dock'],
      ['Willowbrook', 'Petal Hollow'],
      ['Petal Hollow', 'Frostholm'],
      ['Frostholm', 'Pebble Peaks'],
      ['Willowbrook', 'Pebble Peaks'],
      ['Willowbrook', 'Bramblebridge'],
      ['Bramblebridge', 'Pebble Peaks'],
      ['Bramblebridge', 'Oasis Rest'],
      ['Pebble Peaks', 'Oasis Rest'],
    ];
    roadPairs.forEach(([fromName, toName], roadIdx) => {
      const a = W.towns.find((t) => t.n === fromName && t.w === 0);
      const b = W.towns.find((t) => t.n === toName && t.w === 0);
      if (!a || !b) return;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const steps = Math.max(8, Math.ceil(Math.hypot(dx, dy) * 1.4));
      for (let s = 3; s <= steps - 3; s++) {
        const tFrac = s / steps;
        const bend = Math.sin(tFrac * Math.PI) * (roadIdx % 2 === 0 ? 2.8 : -2.8);
        const len = Math.hypot(dx, dy) || 1;
        const rx = Math.round(a.x + dx * tFrac + (-dy / len) * bend);
        const ry = Math.round(a.y + dy * tFrac + (dx / len) * bend);
        for (let oy = 0; oy <= 1; oy++) {
          for (let ox = 0; ox <= 1; ox++) {
            const tx = rx + ox;
            const ty = ry + oy;
            if (tx < 2 || ty < 2 || tx >= N - 2 || ty >= N - 2) continue;
            const idx = ty * N + tx;
            if (W.B[idx] < 2) continue;
            const existingDk = W.DK[idx];
            if (existingDk >= 10) continue; // Never overwrite houses or plaza props
            W.TW[idx] = 1;
            if (existingDk > 0 && existingDk <= 9) W.DK[idx] = 0;
          }
        }
        // Occasional roadside lamp post or wayside bench along winding trails
        if (s % 14 === 7 || s % 28 === 21) {
          const lx = rx + 2;
          const ly = ry;
          if (lx > 2 && ly > 2 && lx < N - 2 && ly < N - 2) {
            const lIdx = ly * N + lx;
            if (W.B[lIdx] >= 2 && W.DK[lIdx] === 0 && W.TW[lIdx] === 0) {
              W.DK[lIdx] = s % 28 === 21 ? 11 : 13;
            }
          }
        }
      }
    });

    // Underwater Reef Towns (Coral Concert Hall + Pearl Reef + Sunken Pearl Grotto)
    const AR = WORLD_ANCHORS.reef;
    W.towns.push({ n: 'Coral Concert Hall', x: AR.coralConcertHall.tx, y: AR.coralConcertHall.ty, w: 1, vis: 0, island: 'Sea' });
    W.towns.push({ n: 'Sunken Pearl Grotto', x: AR.sunkenPearlGrotto.tx, y: AR.sunkenPearlGrotto.ty, w: 1, vis: 0, island: 'Sea' });
    const reefCandidates: [number, number][] = [];
    for (let y = 12; y < N - 12; y += 2) {
      for (let x = 12; x < N - 12; x += 2) {
        if (
          W.B[y * N + x] < 2 &&
          regOK(x, y, (v) => v < 2) &&
          Math.hypot(x - AR.coralConcertHall.tx, y - AR.coralConcertHall.ty) > 24 &&
          Math.hypot(x - AR.starlitKelpTrench.tx, y - AR.starlitKelpTrench.ty) > 18 &&
          Math.hypot(x - AR.atollSunkenRuins.tx, y - AR.atollSunkenRuins.ty) > 22 &&
          Math.hypot(x - AR.driftwoodDiveLagoon.tx, y - AR.driftwoodDiveLagoon.ty) > 18 &&
          Math.hypot(x - AR.sunkenPearlGrotto.tx, y - AR.sunkenPearlGrotto.ty) > 20
        ) {
          reefCandidates.push([x, y]);
        }
      }
    }
    if (reefCandidates.length) {
      // Pick closest open reef site to Pearl Reef map coordinate
      let [px, py] = reefCandidates[0];
      let pBest = 1e9;
      for (const [cx, cy] of reefCandidates) {
        const d = Math.hypot(cx - AR.pearlReef.tx, cy - AR.pearlReef.ty);
        if (d < pBest) {
          pBest = d;
          px = cx;
          py = cy;
        }
      }
      W.towns.push({ n: 'Pearl Reef', x: px, y: py, w: 1, vis: 0, island: 'Sea' });
      for (let j = py - 5; j <= py + 5; j++) {
        for (let i = px - 7; i <= px + 7; i++) {
          W.UD[j * N + i] = 0;
        }
      }
      [
        [-6, -2],
        [3, -2],
        [-6, 3],
        [3, 3],
      ].forEach(([a, b]) => house(W.UD, px + a, py + b, 5, 6));
      [
        [-3, 0],
        [3, 0],
        [0, -3],
        [0, 3],
        [-3, -4],
        [3, 4],
      ].forEach(([a, b]) => {
        W.UD[(py + b) * N + px + a] = 7;
      });
    }

    // 4. Sky Kingdom Layer
    const AS = WORLD_ANCHORS.sky;
    const KX = AS.cirrusCastle.tx;
    const KY = AS.cirrusCastle.ty;
    const skyIslands: { x: number; y: number; r: number; m?: number }[] = [
      { x: AS.nimbusMarket.tx, y: AS.nimbusMarket.ty, r: 16, m: 1 }, // Nimbus Market cloud terrace
      { x: AS.sunriseUpdraftSpire.tx, y: AS.sunriseUpdraftSpire.ty, r: 14, m: 2 }, // Sunrise Updraft Spire eastern thermal island
      { x: AS.aetherGarden.tx, y: AS.aetherGarden.ty, r: 14, m: 1 }, // Aether Sky Garden western terrace
    ];
    for (let k = 0; k < 58; k++) {
      const x = 16 + hash(k, 1, 40) * (N - 32);
      const y = 16 + hash(k, 2, 40) * (N - 32);
      if (
        Math.hypot(x - KX, y - KY) > 34 &&
        Math.hypot(x - AS.sunriseUpdraftSpire.tx, y - AS.sunriseUpdraftSpire.ty) > 18 &&
        Math.hypot(x - AS.aetherGarden.tx, y - AS.aetherGarden.ty) > 18
      ) {
        skyIslands.push({ x, y, r: 5 + hash(k, 3, 40) * 7.5 });
      }
    }

    for (let y = 1; y < N - 1; y++) {
      for (let x = 1; x < N - 1; x++) {
        const i = y * N + x;
        const d = Math.hypot(x - KX, y - KY);
        const noise = vn(x * 0.2, y * 0.2, 32);
        let t = 0;
        if (d < 20 * (0.8 + 0.4 * noise)) {
          t = d < 12 ? 2 : 1;
        } else {
          for (const s of skyIslands) {
            const ds = Math.hypot(x - s.x, y - s.y);
            if (ds < s.r * (0.7 + 0.6 * noise)) {
              const z = fbm(x * 0.08, y * 0.08, 33);
              if (s.m === 1) t = ds < 9.5 ? 2 : 1;
              else if (s.m === 2) t = ds < 7.5 ? 4 : ds < 10.5 ? 2 : 1;
              else t = z > 0.62 ? 4 : z > 0.4 ? 1 : 3;
              break;
            }
          }
        }
        W.SB[i] = t;
        const h = hash(x, y, 34);
        if (t === 1) W.SD[i] = h < 0.07 ? 1 : h < 0.12 ? 3 : 0;
        if (t === 4) W.SD[i] = h < 0.1 ? 2 : 0;

        if ((t && !W.SD[i] && hash(x, y, 35) < 0.008) || (!t && hash(x, y, 36) < 0.00055)) {
          W.feathers.push({ x: x * T + T / 2, y: y * T + T / 2, got: 0 });
        }
      }
    }

    // Clear central Sky plazas for Cirrus Castle, Nimbus Market, Sunrise Updraft Spire, and Aether Sky Garden
    for (const [cx, cy, rad] of [
      [KX, KY, 3],
      [AS.nimbusMarket.tx, AS.nimbusMarket.ty, 3],
      [AS.sunriseUpdraftSpire.tx, AS.sunriseUpdraftSpire.ty, 3],
      [AS.aetherGarden.tx, AS.aetherGarden.ty, 3],
    ]) {
      for (let py = cy - rad; py <= cy + rad; py++) {
        for (let px = cx - rad; px <= cx + rad; px++) {
          if (px > 0 && py > 0 && px < N - 1 && py < N - 1) {
            W.SD[py * N + px] = 0;
          }
        }
      }
    }
    for (let y = KY - 4; y <= KY - 3; y++) {
      for (let x = KX - 2; x <= KX + 2; x++) {
        W.SB[y * N + x] = 2;
        W.SD[y * N + x] = 9;
      }
    }
    W.towns.push({ n: 'Nimbus Market', x: AS.nimbusMarket.tx, y: AS.nimbusMarket.ty, w: 2, vis: 0, island: 'Sky' });
    W.towns.push({ n: 'Cirrus Castle', x: KX, y: KY, w: 2, vis: 0, island: 'Sky' });
    W.towns.push({ n: 'Aether Sky Garden', x: AS.aetherGarden.tx, y: AS.aetherGarden.ty, w: 2, vis: 0, island: 'Sky' });
    W.towns.push({ n: 'Rooted Rest', x: WORLD_ANCHORS.glowdeep.rootedRest.tx, y: WORLD_ANCHORS.glowdeep.rootedRest.ty, w: 3, vis: 0, island: 'Glowdeep' });
    W.towns.push({ n: 'Crystal Conservatory', x: WORLD_ANCHORS.glowdeep.crystalConservatory.tx, y: WORLD_ANCHORS.glowdeep.crystalConservatory.ty, w: 3, vis: 0, island: 'Glowdeep' });
    W.towns.push({ n: 'Moon’s Tea House', x: WORLD_ANCHORS.moonroad.teaHouse.tx, y: WORLD_ANCHORS.moonroad.teaHouse.ty, w: 4, vis: 0, island: 'Moon Road' });
    W.towns.push({ n: 'Crescent Belvedere', x: WORLD_ANCHORS.moonroad.crescentBelvedere.tx, y: WORLD_ANCHORS.moonroad.crescentBelvedere.ty, w: 4, vis: 0, island: 'Moon Road' });

    // Rainbow Speed Rings (24 across the expansive sky zenith)
    for (let k = 0; k < 24; k++) {
      const a = hash(k, 1, 97) * 6.28;
      const r = 10 + hash(k, 2, 97) * 105;
      W.rings.push({
        x: Math.max(8, Math.min(N - 8, KX + Math.cos(a) * r)) * T,
        y: Math.max(8, Math.min(N - 8, KY + Math.sin(a) * r)) * T,
        got: 0,
      });
    }

    // 5. Place Player's Bespoke Mochi House & Hamlet near canonical anchor, and spawn player right outside
    {
      let homeTx: number = AT.mochiHamlet.tx;
      let homeTy: number = AT.mochiHamlet.ty;
      let bestHomeDist = 1e9;

      for (let cy = AT.mochiHamlet.ty - 12; cy <= AT.mochiHamlet.ty + 12; cy++) {
        for (let cx = AT.mochiHamlet.tx - 12; cx <= AT.mochiHamlet.tx + 12; cx++) {
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
            const dist = Math.hypot(cx - AT.mochiHamlet.tx, cy - AT.mochiHamlet.ty);
            if (dist < bestHomeDist) {
              bestHomeDist = dist;
              homeTx = cx;
              homeTy = cy;
            }
          }
        }
      }

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
      W.TW[(homeTy + 1) * N + homeTx] = 2;
      W.TW[(homeTy + 2) * N + homeTx] = 2;
      W.playerHomePortal = {
        x: homeTx * T + T / 2,
        y: homeTy * T + T - 2,
        doorX: homeTx * T + T / 2,
        doorY: (homeTy + 1) * T + 12,
      };
      W.towns.push({ n: 'Mochi Hamlet', x: homeTx, y: homeTy, w: 0, vis: 1, island: 'Lantern Isle' });

      // Spawn Player cleanly on the cobblestone garden path in front of Mochi Hamlet
      W.player.x = homeTx * T + T / 2;
      W.player.y = (homeTy + 2) * T + T / 2;
      W.companionPos.x = W.player.x - 26;
      W.companionPos.y = W.player.y + 4;
    }

    // 6. Spawn NPCs (anchored near their matching islands/settlements)
    const npcsList: NPC[] = [];

    const groundChars = ALL_CHARACTERS_MM2.filter((c) => (c.layer ?? 0) === 0);
    const biomePreference: Record<string, { target: number[]; near?: { tx: number; ty: number } }> = {
      Pip: {
        target: [3, 5],
        near: { tx: Math.round(W.player.x / T), ty: Math.round(W.player.y / T) },
      },
      'Captain Barnacle': { target: [2, 3], near: { tx: AT.driftwoodDock.tx, ty: AT.driftwoodDock.ty } },
      Gloom: { target: [4, 3], near: { tx: AT.mossgate.tx, ty: AT.mossgate.ty } },
      Wick: {
        target: [3],
        near: { tx: AT.lanternTree.tx, ty: AT.lanternTree.ty },
      },
      Bumble: { target: [5, 3], near: { tx: AT.honeycombVillage.tx, ty: AT.honeycombVillage.ty } },
      Tidbit: { target: [2, 3], near: { tx: AT.tidepoolHaven.tx, ty: AT.tidepoolHaven.ty } },
      Ember: { target: [6, 8, 3], near: { tx: AT.cinderSpas.tx, ty: AT.cinderSpas.ty } },
      'Madame Mizzle': { target: [4, 3], near: { tx: AT.lilyPavilion.tx, ty: AT.lilyPavilion.ty } },
      'Penny and Quill': { target: [7, 3], near: { tx: AT.auroraStation.tx, ty: AT.auroraStation.ty } },
      Bellamy: { target: [4, 5, 3], near: { tx: AT.bellwoodTreetops.tx, ty: AT.bellwoodTreetops.ty } },
      Aurelle: { target: [3, 5, 6, 2], near: { tx: AT.dawnSpireSummit.tx, ty: AT.dawnSpireSummit.ty } },
      Waffles: { target: [5, 2, 3], near: { tx: AT.petalHollow.tx, ty: AT.petalHollow.ty } },
      Fennel: { target: [3, 4, 6], near: { tx: AT.oasisRest.tx, ty: AT.oasisRest.ty } },
      Bramble: { target: [3, 4, 5], near: { tx: AT.bramblebridge.tx, ty: AT.bramblebridge.ty } },
      'Capt. Tidecrest': { target: [2, 3, 4], near: { tx: AT.sapphireHaven.tx, ty: AT.sapphireHaven.ty } },
      Momiji: { target: [5, 4, 2], near: { tx: AT.mapleCrossing.tx, ty: AT.mapleCrossing.ty } },
      Astra: { target: [6, 2, 3], near: { tx: AT.starfallObservatory.tx, ty: AT.starfallObservatory.ty } },
    };

    const usedGroundTiles = new Set<number>();
    groundChars.forEach((d, k) => {
      const pref = biomePreference[d.n] || { target: [d.bi <= 8 ? d.bi : 3, 3] };
      let chosenIdx = -1;

      if (pref.near) {
        let bestScore = 1e9;
        for (let pass = 0; pass < 2 && chosenIdx === -1; pass++) {
          for (let i = 0; i < N * N; i++) {
            if (W.B[i] < 2 || W.DK[i] || usedGroundTiles.has(i)) continue;
            if (pass === 0 && W.TW[i] === 2) continue; // avoid plaza center road on pass 0
            if (d.n === 'Pip' && W.B[i] !== 3) continue;
            const dist = Math.hypot((i % N) - pref.near.tx, ((i / N) | 0) - pref.near.ty);
            if (d.n === 'Pip' && dist < 2.5) continue;
            if (dist < bestScore) {
              bestScore = dist;
              chosenIdx = i;
            }
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

    // Lantern Tree at heart of Lantern Isle + Physical Surface Portals to Glowdeep & Moon Road
    let bestTreeIdx = -1;
    let bestTreeDist = 1e9;
    for (let i = 0; i < N * N; i++) {
      if (W.B[i] === 3 && !W.DK[i] && !W.TW[i]) {
        const dist = Math.hypot((i % N) - AT.lanternTree.tx, ((i / N) | 0) - AT.lanternTree.ty);
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
        t: [
          [
            'Tell me about the Lantern Doors',
            'Each glowing door beneath my boughs remembers an island melody. As you reunite old friends and restore the Verses, the sealed passages into Glowdeep and the Moon Road awaken.',
          ],
          [
            'Who slumbers in the roots below?',
            'Deep inside Glowdeep, Nana Mochi’s ancient roots cradle memories of the meadow’s first morning. Lumi watches over them beside the Soup of Remembering.',
          ],
          [
            'How will the Dawn Duet begin?',
            'Bring together the Moon’s Lullaby and Aurelle’s Reveille with warmth in your heart. When Chapter 12 shines over Dawn Spire, we can sing the Dawn Duet together!',
          ],
        ],
        h: [0, 0, 0],
        i: ['Leaves softly chime…', 'Lanterns glow warm…', 'Roots hum far below…'],
        qp: [
          'Every kind note you gather wakes another golden lantern along my branches.',
          'Listen closely—wind through my leaves still remembers when Sun and Moon sang together.',
        ],
        e: 'My golden canopy rings in timeless harmony with the Dawn Duet! 🌟',
        bi: 3,
        sp: 'owl',
        col: '#ffd86b',
        hat: 'flower',
        r: 'The ancient heart of Lantern Isle linking every realm',
        g: 'Warmth stirs through my golden boughs, little traveler. Beneath these roots and above these branches lie all five realms of the Starlit Archipelago.',
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

    // Sky Court NPCs (Layer 2)
    SKY_COURT.forEach((d, k) => {
      if (npcsList.some((n) => n.n === d.n)) return;
      const town = d.at ? W.towns.find((z) => z.n === d.at && z.w === 2) : undefined;
      const baseX = town ? town.x : KX;
      const baseY = town ? town.y : KY;
      const o = d.o || [k === 0 ? 0 : 2, 2];
      const x = (baseX + o[0]) * T + T / 2;
      const y = (baseY + o[1]) * T + T / 2;
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

    // Undersea Reef NPCs (Layer 1 — anchored to walkable water tiles)
    REEF_COURT.forEach((d, k) => {
      if (npcsList.some((n) => n.n === d.n)) return;
      const town =
        (d.at ? W.towns.find((z) => z.n === d.at && z.w === 1) : undefined) ||
        W.towns.find((z) => z.w === 1);
      if (!town) return;
      const wantX = town.x + (d.o ? d.o[0] : 0);
      const wantY = town.y + (d.o ? d.o[1] : 1);
      let bestX = wantX;
      let bestY = wantY;
      let bestDist = 1e9;
      for (let py = Math.max(2, wantY - 8); py <= Math.min(N - 3, wantY + 8); py++) {
        for (let px = Math.max(2, wantX - 8); px <= Math.min(N - 3, wantX + 8); px++) {
          const idx = py * N + px;
          if (W.B[idx] < 2 && W.UD[idx] < 3) {
            const dist = Math.hypot(px - wantX, py - wantY);
            if (dist < bestDist) {
              bestDist = dist;
              bestX = px;
              bestY = py;
            }
          }
        }
      }
      const x = bestX * T + T / 2;
      const y = bestY * T + T / 2;
      npcsList.push({
        ...d,
        sea: true,
        x,
        y,
        hx: x,
        hy: y,
        tx: x,
        ty: y,
        f: 1,
        ph: k * 1.7 + 3,
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

    // Town Residents (preserve all layer flags across all 5 realms)
    TOWN_RESIDENTS.forEach((d) => {
      if (npcsList.some((n) => n.n === d.n)) return;
      const targetW = d.layer ?? 0;
      const town =
        W.towns.find((z) => z.n === d.at && z.w === targetW) ||
        W.towns.find((z) => z.n === d.at);
      if (town) {
        const x = (town.x + (d.o ? d.o[0] : 0)) * T + T / 2;
        const y = (town.y + (d.o ? d.o[1] : 0)) * T + T / 2;
        npcsList.push({
          ...d,
          sea: town.w === 1 || d.layer === 1,
          sky: town.w === 2 || d.layer === 2,
          glowdeep: town.w === 3 || d.layer === 3,
          moonroad: town.w === 4 || d.layer === 4,
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
      { name: 'Lumi', tx: WORLD_ANCHORS.glowdeep.lumiHome.tx, ty: WORLD_ANCHORS.glowdeep.lumiHome.ty, glowdeep: true },
      { name: 'The Moon', tx: WORLD_ANCHORS.moonroad.teaHouse.tx, ty: WORLD_ANCHORS.moonroad.teaHouse.ty, moonroad: true },
      { name: 'Dusk', tx: WORLD_ANCHORS.moonroad.edgeOfSilence.tx, ty: WORLD_ANCHORS.moonroad.edgeOfSilence.ty, moonroad: true },
      { name: 'Zephyr', tx: WORLD_ANCHORS.sky.aetherGarden.tx, ty: WORLD_ANCHORS.sky.aetherGarden.ty + 2, sky: true },
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

    const pearlTown = W.towns.find((t) => t.n === 'Pearl Reef') || W.towns.find((t) => t.w === 1);
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
        const nearRootHall =
          Math.hypot(x - WORLD_ANCHORS.glowdeep.rootedRest.tx, y - WORLD_ANCHORS.glowdeep.rootedRest.ty) < 28;
        if ((nearRootHall && hash(x, y, 501) < 0.085) || hash(x, y, 502) < 0.014) {
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

    // 10 Roaming Hollow Creatures across Lantern Isle and outer archipelago islands (layer w: 0)
    W.hollows = [
      { id: 'h-1', w: 0, name: 'Whisper', species: 'axolotl', x: (isl.lanternIsle.tx - 16) * T, y: (isl.lanternIsle.ty + 12) * T, soothed: false, bloomT: 0, color: '#b8c4d8', quote: 'I forgot the lyrics…' },
      { id: 'h-2', w: 0, name: 'Murmur', species: 'fox', x: (isl.lanternIsle.tx + 28) * T, y: (isl.lanternIsle.ty - 20) * T, soothed: false, bloomT: 0, color: '#fca5a5', quote: 'The Silence is so heavy…' },
      { id: 'h-3', w: 0, name: 'Shade', species: 'bunny', x: (isl.lanternIsle.tx - 32) * T, y: (isl.lanternIsle.ty - 26) * T, soothed: false, bloomT: 0, color: '#fbcfe8', quote: 'Can someone hold my hand?' },
      { id: 'h-4', w: 0, name: 'Mist', species: 'owl', x: (isl.lanternIsle.tx + 26) * T, y: (isl.lanternIsle.ty + 30) * T, soothed: false, bloomT: 0, color: '#fed7aa', quote: 'I want to see the sunrise…' },
      { id: 'h-5', w: 0, name: 'Emberlet', species: 'dragon', x: isl.cinderCradle.tx * T, y: (isl.cinderCradle.ty - 8) * T, soothed: false, bloomT: 0, color: '#fde047', quote: 'My sparks went out…' },
      { id: 'h-6', w: 0, name: 'Shiver', species: 'penguin', x: isl.auroraReach.tx * T, y: (isl.auroraReach.ty + 6) * T, soothed: false, bloomT: 0, color: '#a7f3d0', quote: 'It is cold without a song…' },
      { id: 'h-7', w: 0, name: 'Hush', species: 'cat', x: isl.sapphireBluff.tx * T, y: (isl.sapphireBluff.ty - 5) * T, soothed: false, bloomT: 0, color: '#93c5fd', quote: 'The western tide feels lonely…' },
      { id: 'h-8', w: 0, name: 'Rustle', species: 'fox', x: (isl.mapleMist.tx - 4) * T, y: (isl.mapleMist.ty + 4) * T, soothed: false, bloomT: 0, color: '#fdba74', quote: 'Even falling leaves miss summer…' },
      { id: 'h-9', w: 0, name: 'Glimmer', species: 'bunny', x: (isl.starfallShoals.tx - 5) * T, y: (isl.starfallShoals.ty - 4) * T, soothed: false, bloomT: 0, color: '#ddd6fe', quote: 'A fallen star lost its beam…' },
      { id: 'h-10', w: 0, name: 'Chime', species: 'deer', x: (isl.chimeCanopy.tx + 5) * T, y: (isl.chimeCanopy.ty + 5) * T, soothed: false, bloomT: 0, color: '#bef264', quote: 'The high branches stopped ringing…' },
    ];

    // Snapshot pristine generated surface decor & base spawn coordinates before loading any slot save
    initialDkRef.current = new Uint8Array(W.DK);
    baseHomeSpawnRef.current = { x: W.player.x, y: W.player.y };

    // Try loading saved game from browser storage for the active slot
    try {
      const slot = currentSlotRef.current;
      const saved = readSlotSaveRaw(slot);
      if (saved) {
        const data = JSON.parse(saved);
        applySaveSnapshotRef.current(data);
      } else {
        setPlayerPos({
          x: W.player.x,
          y: W.player.y,
          sky: false,
          dive: false,
          swim: false,
          glowdeep: false,
          moonroad: false,
          house: false,
        });
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
        const { season: _legacySeason, render3d: _legacyRender3d, vibrantColors: _legacyVibrant, ...rest } = parsed;
        setSettings((prev) => ({ ...prev, ...rest }));
        audio.setVolume(parsed.vol ?? 0.8);
      }
    } catch (e) {}
  }, []);

  // Sync active Seasonal & Weather UI Theme attributes on root document
  useEffect(() => {
    document.documentElement.dataset.season = currentSeason;
  }, [currentSeason]);

  useEffect(() => {
    document.documentElement.dataset.weather = currentWeather.id;
  }, [currentWeather.id]);

  // Mount & Dispose 3D Storybook WebGL Engine cleanly
  useEffect(() => {
    const mount = threeMountRef.current;
    if (!mount) {
      if (renderer3DRef.current) {
        renderer3DRef.current.dispose();
        renderer3DRef.current = null;
      }
      setWebglReady(false);
      document.documentElement.dataset.softwareGl = '0';
      return;
    }

    let cancelled = false;
    let contextLostTimer: number | null = null;
    try {
      const r3d = new WorldRenderer3D(mount, {
        isMobile: deviceRef.current.isPhone,
        onContextLost: () => {
          if (cancelled) return;
          if (contextLostTimer !== null) {
            window.clearTimeout(contextLostTimer);
          }
          contextLostTimer = window.setTimeout(() => {
            contextLostTimer = null;
            if (cancelled) return;
            const current = renderer3DRef.current;
            if (current && current.isContextLost()) {
              console.warn('[3D] WebGL context stayed lost; waiting for graphics recovery.');
              showToast('Graphics context paused — waiting for GPU recovery ✨');
            }
          }, 1800);
        },
        onContextRestored: () => {
          if (cancelled) return;
          if (contextLostTimer !== null) {
            window.clearTimeout(contextLostTimer);
            contextLostTimer = null;
          }
          const current = renderer3DRef.current;
          if (current) {
            const cw = Math.max(1, mount.clientWidth || window.innerWidth);
            const ch = Math.max(1, mount.clientHeight || window.innerHeight);
            const dev = deviceRef.current;
            const dpr = computeViewportDpr(
              cw,
              ch,
              dev.pixelRatio || 1,
              dev.isPhone,
              dev.isTablet,
              Boolean(settingsRef.current.low),
              current.isSoftwareGl
            );
            current.resize(cw, ch, dpr);
            current.snapCameraNextFrame();
          }
        },
      });
      if (cancelled) {
        r3d.dispose();
        return;
      }
      renderer3DRef.current = r3d;
      setWebglReady(true);
      document.documentElement.dataset.softwareGl = r3d.isSoftwareGl ? '1' : '0';
      const cw = Math.max(1, mount.clientWidth || window.innerWidth);
      const ch = Math.max(1, mount.clientHeight || window.innerHeight);
      const dev = deviceRef.current;
      const dpr = computeViewportDpr(
        cw,
        ch,
        dev.pixelRatio || 1,
        dev.isPhone,
        dev.isTablet,
        Boolean(settingsRef.current.low),
        r3d.isSoftwareGl
      );
      r3d.resize(cw, ch, dpr);
      r3d.snapCameraNextFrame();
    } catch (err) {
      console.warn('[3D] WebGL initialization failed:', err);
      renderer3DRef.current = null;
      setWebglReady(false);
      document.documentElement.dataset.softwareGl = '0';
    }

    return () => {
      cancelled = true;
      if (contextLostTimer !== null) {
        window.clearTimeout(contextLostTimer);
        contextLostTimer = null;
      }
      if (renderer3DRef.current) {
        renderer3DRef.current.dispose();
        renderer3DRef.current = null;
      }
      setWebglReady(false);
    };
  }, [showToast]);

  useEffect(() => {
    return () => {
      disposeSharedMochiTextures();
    };
  }, []);

  // Immediately refresh Season & Weather Forecast countdowns when Pause Menu opens
  useEffect(() => {
    if (activeModal === 'pause') {
      const sched = getScheduledSeasonState(Date.now());
      setSeasonRemainingSec(sched.remainingSeconds);
      setWeatherRemainingSec(Math.max(1, Math.ceil(weatherRef.current.weatherTimer)));
    }
  }, [activeModal]);

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
        if (!e.repeat) jumpFnRef.current();
      } else if (k === 'q' && !cutscene && modal === 'none') {
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
          activeNpcRef.current.met = true;
          setActiveModal('dialog');
        } else if (W.player.house) {
          const nearItem = getNearestHouseInteractable(W.player.x, W.player.y);
          if (nearItem) {
            e.preventDefault();
            audio.init();
            houseActionFnRef.current(nearItem.id);
          }
        } else if (nearbyTownActionRef.current) {
          e.preventDefault();
          audio.init();
          setActiveMarketTown(nearbyTownActionRef.current.townName);
          setMarketInitialTab(nearbyTownActionRef.current.kind);
          setActiveModal('market');
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
      } else if (k === 'v' && !cutscene && modal === 'none') {
        cycleCameraFnRef.current();
      } else if (k === 'n') {
        cycleMusicFnRef.current();
      } else if (k === 'escape') {
        if (cutscene) finishCutsceneFnRef.current();
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

  // Dash / Freestyle Swim Surge with afterimage trail
  const handleDash = () => {
    const W = worldRef.current;
    if (W.player.cd <= 0) {
      W.player.dash = 0.19;
      W.player.cd = 1.05;
      audio.pop();
      W.dashGhosts.push({ x: W.player.x, y: W.player.y, face: W.player.face, alpha: 0.55 });
      if (W.player.swim) {
        W.magicRings.push({ x: W.player.x, y: W.player.y + 4, t: 0, m: 0.55, r: 46, c: '#9eeeff' });
      }
      for (let i = 0; i < 9; i++) {
        W.particles.push({
          x: W.player.x,
          y: W.player.y + 6,
          vx: (Math.random() - 0.5) * 90,
          vy: (Math.random() - 0.5) * 90,
          l: 0.48,
          c: W.player.swim ? (i % 2 === 0 ? '#ffffff' : '#8fd5ff') : i % 2 === 0 ? '#ffffff' : '#ff9ebb',
        });
      }
    }
  };
  dashFnRef.current = handleDash;

  // Jump on Land (with Double-Hop), Dolphin Leap in Water, or Sky/Reef Surge
  const handleJump = () => {
    const W = worldRef.current;
    if (gameStateRef.current !== 'playing' || activeModalRef.current !== 'none' || activeCutsceneRef.current !== null) {
      return;
    }

    if (W.player.dive) {
      // Underwater buoyant reef surge
      W.player.dash = Math.max(W.player.dash, 0.16);
      audio.pop();
      for (let i = 0; i < 7; i++) {
        W.particles.push({
          x: W.player.x + (Math.random() - 0.5) * 14,
          y: W.player.y + 6,
          vx: (Math.random() - 0.5) * 35,
          vy: -30 - Math.random() * 45,
          z: 8,
          vz: 55,
          l: 0.6,
          maxL: 0.6,
          shape: 'orb',
          size: 0.9,
          c: i % 2 === 0 ? '#d8fbff' : '#7de0ff',
        });
      }
      return;
    }

    if (W.player.swim) {
      if (W.player.jumpCount < 2) {
        const firstLeap = W.player.jumpCount === 0;
        W.player.vz = firstLeap ? 255 : 210;
        W.player.z = Math.max(W.player.z, 2);
        W.player.jumpCount += 1;
        W.player.coyoteTimer = 0;
        W.player.dash = Math.max(W.player.dash, firstLeap ? 0.14 : 0.08);
        audio.pop();
        W.magicRings.push({ x: W.player.x, y: W.player.y + 4, t: 0, m: 0.58, r: 52, c: '#9ee8ff' });
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2;
          W.particles.push({
            x: W.player.x,
            y: W.player.y + 4,
            vx: Math.cos(a) * 58,
            vy: Math.sin(a) * 44,
            z: 6,
            vz: 82,
            az: -240,
            drag: 1.2,
            shape: 'orb',
            size: 0.95,
            l: 0.48,
            maxL: 0.48,
            c: i % 2 === 0 ? '#ffffff' : '#8fd5ff',
          });
        }
      }
      return;
    }

    // Land / Sky / Glowdeep / Moonroad Jump + Flutter Double-Hop
    const frogHopMult = (playerLookRef.current.companion ?? 'gloom') === 'frog' ? 1.1 : 1.0;
    const canPrimaryJump = W.player.z <= 2 || W.player.coyoteTimer > 0 || (W.player.jumpCount === 0 && W.player.vz <= 0);
    if (canPrimaryJump) {
      W.player.vz = Math.round(272 * frogHopMult);
      W.player.z = Math.max(W.player.z, 2);
      W.player.jumpCount = 1;
      W.player.coyoteTimer = 0;
      audio.pop();
      W.magicRings.push({ x: W.player.x, y: W.player.y + 6, t: 0, m: 0.38, r: 28, c: 'rgba(255, 255, 255, 0.72)' });
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        W.particles.push({
          x: W.player.x,
          y: W.player.y + 6,
          vx: Math.cos(a) * 42,
          vy: Math.sin(a) * 28,
          z: 3,
          vz: 26,
          drag: 2.2,
          size: 0.85,
          shape: 'orb',
          l: 0.38,
          maxL: 0.38,
          c: i % 2 === 0 ? '#ffffff' : '#ffd23f',
        });
      }
    } else if (W.player.jumpCount === 1) {
      W.player.vz = Math.round(228 * frogHopMult);
      W.player.jumpCount = 2;
      audio.noteSpeech(84);
      W.magicRings.push({ x: W.player.x, y: W.player.y + 4, t: 0, m: 0.42, r: 36, c: '#ffd3e2' });
      for (let i = 0; i < 7; i++) {
        const a = (i / 7) * Math.PI * 2;
        W.particles.push({
          x: W.player.x,
          y: W.player.y,
          vx: Math.cos(a) * 52,
          vy: Math.sin(a) * 38,
          z: Math.max(6, W.player.z),
          vz: 18,
          drag: 2.0,
          size: 0.95,
          shape: 'petal',
          l: 0.44,
          maxL: 0.44,
          c: i % 2 === 0 ? '#ffffff' : '#ff9ebb',
        });
      }
    }
  };
  jumpFnRef.current = handleJump;

  // Dive / Surface
  const handleDiveToggle = () => {
    const W = worldRef.current;
    if (W.player.house) {
      showToast('Step outside to Lantern Isle first to swim or dive');
      return;
    }
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
    if (W.player.house) {
      if (Math.hypot(W.player.x - HOUSE_DOOR_POS.x, W.player.y - HOUSE_DOOR_POS.y) < 66) {
        return {
          id: 'from_mochi_house' as const,
          label: 'Step Outside',
          icon: '🚪',
          locked: false,
        };
      }
      return null;
    }
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

  // Enter / Exit Full 3D Mochi House Interior (6 connected rooms)
  const enterHouse3D = (initialRoom?: HouseRoomId) => {
    const W = worldRef.current;
    const dest = initialRoom ? getHouseRoomCenterWorld(initialRoom) : HOUSE_SPAWN_POS;
    W.player.x = dest.x;
    W.player.y = dest.y;
    W.player.vx = 0;
    W.player.vy = 0;
    W.player.dx = 0;
    W.player.dy = -1;
    W.player.dash = 0;
    W.player.moveTarget = null;
    W.player.sky = false;
    W.player.dive = false;
    W.player.swim = false;
    W.player.wasSwimming = false;
    W.player.glowdeep = false;
    W.player.moonroad = false;
    W.player.house = true;
    W.player.z = 0;
    W.player.vz = 0;
    W.player.jumpCount = 0;
    W.companionPos.x = dest.x - 24;
    W.companionPos.y = dest.y + 8;
    W.touchJoystick.active = false;
    snapCamera();
    triggerRealmFlash('#ffe6b8', 0.34);
    setPlayerPos({
      x: dest.x,
      y: dest.y,
      sky: false,
      dive: false,
      swim: false,
      glowdeep: false,
      moonroad: false,
      house: true,
    });
    audio.chime();
    showToast(`🏡 Welcome inside ${playerLookRef.current.name || 'Mochi'}'s 3D House!`);
  };

  const exitHouse3D = () => {
    const W = worldRef.current;
    const doorX = W.playerHomePortal?.doorX ?? 136 * T + T / 2;
    const doorY = (W.playerHomePortal?.doorY ?? 133 * T + 12) + 14;
    W.player.house = false;
    W.player.sky = false;
    W.player.dive = false;
    W.player.glowdeep = false;
    W.player.moonroad = false;
    W.player.swim = false;
    W.player.wasSwimming = false;
    W.player.x = doorX;
    W.player.y = doorY;
    W.player.vx = 0;
    W.player.vy = 0;
    W.player.moveTarget = null;
    W.player.z = 0;
    W.player.vz = 0;
    W.player.jumpCount = 0;
    W.companionPos.x = doorX - 24;
    W.companionPos.y = doorY + 4;
    setActiveHouseInteractable(null);
    hudSyncRef.current.houseItemId = null;
    snapCamera();
    triggerRealmFlash('#fff5e6', 0.3);
    spawnWorldPopup(doorX, doorY - 22, '🏡 Home Porch', '#ffe875');
    setPlayerPos({
      x: doorX,
      y: doorY,
      sky: false,
      dive: false,
      swim: false,
      glowdeep: false,
      moonroad: false,
      house: false,
    });
    audio.pop();
    showToast('🏡 Stepped onto your front porch on Lantern Isle!');
  };

  const jumpToHouseRoom3D = (room: HouseRoomId) => {
    const W = worldRef.current;
    if (!W.player.house) {
      enterHouse3D(room);
      return;
    }
    const dest = getHouseRoomCenterWorld(room);
    W.player.x = dest.x;
    W.player.y = dest.y;
    W.player.vx = 0;
    W.player.vy = 0;
    W.player.moveTarget = null;
    W.companionPos.x = dest.x - 22;
    W.companionPos.y = dest.y + 8;
    snapCamera();
    setPlayerPos((prev) => ({
      ...prev,
      x: dest.x,
      y: dest.y,
      house: true,
    }));
    audio.pop();
  };

  const handleHouseAction = (action: HouseInteractionAction) => {
    const W = worldRef.current;
    const curCottage = cottageStateRef.current;
    switch (action) {
      case 'exit_house':
        exitHouse3D();
        return;
      case 'toggle_fireplace': {
        const nextLit = !(curCottage.fireplaceLit !== false);
        setCottageState((prev) => {
          const next = { ...prev, fireplaceLit: nextLit };
          cottageStateRef.current = next;
          return next;
        });
        audio.pop();
        showToast(nextLit ? '🔥 Crackling logs lit up the 3D hearth!' : '🔥 Banked the hearth embers.');
        return;
      }
      case 'play_music_box': {
        audio.playMusicBox(curCottage.musicBoxSong);
        setCottageState((prev) => {
          const next = { ...prev, furnitureInteractCount: (prev.furnitureInteractCount || 0) + 1 };
          cottageStateRef.current = next;
          return next;
        });
        showToast('🎠 Carousel music box is chiming your Song Weaver melody!');
        return;
      }
      case 'lounge_sofa':
        W.player.st = Math.min(100, W.player.st + 15);
        W.player.mp = Math.min(100, W.player.mp + 10);
        setStamina(Math.round(W.player.st));
        setMana(Math.round(W.player.mp));
        audio.pop();
        showToast('🛋️ Lounged on the Cloud Sofa (+15% ⚡ Stamina, +10% ✨ Mana)');
        return;
      case 'bake_muffin':
        setCottageState((prev) => {
          const next = { ...prev, ovenWarm: true };
          cottageStateRef.current = next;
          return next;
        });
        W.player.st = Math.min(100, W.player.st + 25);
        setStamina(Math.round(W.player.st));
        audio.chime();
        showToast('🧁 Baked warm honey muffins in the Cloud Oven (+25% ⚡ Stamina)!');
        return;
      case 'brew_tea':
        W.player.mp = Math.min(100, W.player.mp + 30);
        setMana(Math.round(W.player.mp));
        audio.chime();
        showToast('🫖 Steeped Starlight Chamomile Tea (+30% ✨ Mana)!');
        return;
      case 'icebox_snack':
        W.player.st = Math.min(100, W.player.st + 15);
        W.player.mp = Math.min(100, W.player.mp + 15);
        setStamina(Math.round(W.player.st));
        setMana(Math.round(W.player.mp));
        audio.pop();
        showToast('🍓 Shared a chilled Berry Parfait from the icebox (+15% ⚡ & +15% ✨)!');
        return;
      case 'rest_bed':
        W.player.st = 100;
        W.player.mp = 100;
        W.player.o2 = 100;
        setStamina(100);
        setMana(100);
        setAir(100);
        audio.chime();
        showToast('🛏️ Rested in your Patchwork Bed — Stamina, Mana & Air 100% restored!');
        return;
      case 'toggle_lamp': {
        const nextLamp = !(curCottage.lampOn !== false);
        setCottageState((prev) => {
          const next = { ...prev, lampOn: nextLamp };
          cottageStateRef.current = next;
          return next;
        });
        audio.pop();
        showToast(nextLamp ? '💡 Switched on the amber bedside lamp!' : '💡 Dimmed the bedroom for stargazing.');
        return;
      }
      case 'open_wardrobe':
        setActiveModal('wardrobe');
        return;
      case 'open_songweaver':
        setActiveModal('songweaver');
        return;
      case 'stargaze': {
        W.player.mp = Math.min(100, W.player.mp + 12);
        setMana(Math.round(W.player.mp));
        audio.chime();
        showToast('🔭 Gazed through the brass telescope toward Aurora Reach (+12% ✨ Mana)!');
        return;
      }
      case 'open_sunroom':
      case 'open_aquarium':
        setActiveModal('cottage');
        return;
      case 'soak_tub': {
        if (curCottage.tubFilled === false) {
          setCottageState((prev) => {
            const next = { ...prev, tubFilled: true };
            cottageStateRef.current = next;
            return next;
          });
        }
        W.player.st = Math.min(100, W.player.st + 35);
        W.player.mp = Math.min(100, W.player.mp + 10);
        setStamina(Math.round(W.player.st));
        setMana(Math.round(W.player.mp));
        audio.chime();
        showToast('🛁 Soaked in warm lavender cedar water (+35% ⚡ Stamina, +10% ✨ Mana)!');
        return;
      }
    }
  };
  houseActionFnRef.current = handleHouseAction;

  const isSurfaceSolidDk = (dk: number) =>
    dk === 2 ||
    dk === 4 ||
    dk === 5 ||
    dk === 6 ||
    dk === 7 ||
    dk === 10 ||
    dk === 11 ||
    dk === 13 ||
    dk === 14 ||
    dk === 16 ||
    dk === 17 ||
    dk === 18 ||
    dk === 20 ||
    dk === 21 ||
    dk === 23;

  // Locate nearest safe walkable center point on a realm layer so landing/teleport/portal transitions never trap the player
  const findNearestSafeWorldPoint = useCallback(
    (layer: 0 | 1 | 2 | 3 | 4, worldX: number, worldY: number, preferDryLand = true): { x: number; y: number } => {
      const W = worldRef.current;
      const baseTx = Math.max(1, Math.min(N - 2, Math.floor(worldX / T)));
      const baseTy = Math.max(1, Math.min(N - 2, Math.floor(worldY / T)));

      const isTileClearOnLayer = (tx: number, ty: number, requireDry: boolean): boolean => {
        if (tx < 1 || ty < 1 || tx >= N - 1 || ty >= N - 1) return false;
        const idx = ty * N + tx;
        if (layer === 3) return isGlowdeepWalkable(tx, ty);
        if (layer === 4) return isMoonRoadWalkable(tx, ty);
        if (layer === 2) {
          const sd = W.SD[idx];
          return sd !== 1 && sd !== 9;
        }
        if (layer === 1) {
          return W.B[idx] <= 1 && W.UD[idx] !== 5 && W.UD[idx] !== 6;
        }
        if (requireDry && W.B[idx] < 2) return false;
        return !isSurfaceSolidDk(W.DK[idx]);
      };

      // First try exact spot if no obstacle blocks the hitbox footprint
      const isPointClear = (px: number, py: number, requireDry: boolean): boolean => {
        const fy = py + 5;
        const rx = 8;
        const ry = 5;
        return (
          isTileClearOnLayer(((px - rx) / T) | 0, ((fy - ry) / T) | 0, requireDry) &&
          isTileClearOnLayer(((px + rx) / T) | 0, ((fy - ry) / T) | 0, requireDry) &&
          isTileClearOnLayer(((px - rx) / T) | 0, ((fy + ry) / T) | 0, requireDry) &&
          isTileClearOnLayer(((px + rx) / T) | 0, ((fy + ry) / T) | 0, requireDry)
        );
      };

      const clampedX = Math.max(T + 10, Math.min((N - 1) * T - 10, worldX));
      const clampedY = Math.max(T + 10, Math.min((N - 1) * T - 10, worldY));
      if (isPointClear(clampedX, clampedY, preferDryLand)) {
        return { x: clampedX, y: clampedY };
      }

      for (let pass = 0; pass < (layer === 0 && preferDryLand ? 2 : 1); pass++) {
        const requireDry = pass === 0 && preferDryLand;
        for (let r = 1; r <= 8; r++) {
          for (let dy = -r; dy <= r; dy++) {
            for (let dx = -r; dx <= r; dx++) {
              if (Math.abs(dx) !== r && Math.abs(dy) !== r) continue;
              const tx = baseTx + dx;
              const ty = baseTy + dy;
              const cx = tx * T + T / 2;
              const cy = ty * T + T / 2;
              if (isPointClear(cx, cy, requireDry)) {
                return { x: cx, y: cy };
              }
            }
          }
        }
      }
      return { x: clampedX, y: clampedY };
    },
    []
  );

  // Enter / Exit Glowdeep Caverns & Moon Road via Physical Portals
  const enterRealmLayer = (layer: 0 | 3 | 4, destTileX: number, destTileY: number) => {
    const W = worldRef.current;
    const safePt = findNearestSafeWorldPoint(layer, destTileX * T + T / 2, destTileY * T + T / 2, false);
    const destX = safePt.x;
    const destY = safePt.y;
    W.player.x = destX;
    W.player.y = destY;
    W.player.vx = 0;
    W.player.vy = 0;
    W.player.dash = 0;
    W.player.moveTarget = null;
    W.player.sky = false;
    W.player.dive = false;
    W.player.swim = false;
    W.player.wasSwimming = false;
    W.player.house = false;
    W.player.z = 0;
    W.player.vz = 0;
    W.player.jumpCount = 0;
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
      swim: false,
      glowdeep: W.player.glowdeep,
      moonroad: W.player.moonroad,
      house: false,
    });
    W.magicRings.push({ x: destX, y: destY, t: 0, m: 1.0, r: 170, c: layer === 3 ? '#64f5c1' : '#ffd23f' });
    audio.teleportWarp();
  };

  const handlePortalInteract = () => {
    const portal = getNearbyPortal();
    const W = worldRef.current;
    if (!portal) return;

    if (portal.id === 'to_mochi_house') {
      if (is3DActiveRef.current) {
        enterHouse3D();
      } else {
        audio.chime();
        setActiveModal('cottage');
      }
      return;
    }

    if (portal.id === 'from_mochi_house') {
      exitHouse3D();
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
      if (!unlockedCutscenesRef.current.includes('deep')) triggerCutscene('deep');
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
      const townVisited = (name: string) => W.towns.some((t) => t.n === name && t.vis === 1);
      const friendsCount = W.npcs.filter((n) => n.fr && !n.tree).length;
      const townsVisitedCount = W.towns.filter((t) => t.vis === 1).length;
      const soothedCount = W.hollows.filter((h) => h.soothed).length;
      const starsGot = W.stars.filter((s) => s.got).length;
      const pearlsGot = W.pearls.filter((p) => p.got).length;
      const feathersGot = W.feathers.filter((f) => f.got).length;
      const ringsGot = W.rings.filter((r) => r.got).length;
      const sporesGot = W.glowSpores.filter((s) => s.got).length;
      const moonNotesGot = W.moonNotes.filter((n) => n.got).length;
      const echoAndDiaryCount = W.discoveredEchoIds.size + W.discoveredDiaryPages.size;
      const qByTitle = (title: string) => W.quests.find((q) => q.t === title);
      const addLoreIfMissing = (id: string, t: string, x: string) => {
        setLoreEntries((prev) => {
          if (prev.some((l) => l.id === id)) return prev;
          const next = [...prev, { id, t, x }];
          loreEntriesRef.current = next;
          return next;
        });
      };
      const markVerseRestored = (verseIdx: number) => {
        const v = VERSES_OF_REVEILLE[verseIdx];
        if (!v) return;
        v.unlocked = true;
        addLoreIfMissing(`verse-${v.num}`, `Verse ${v.num}: ${v.title}`, v.quote);
      };

      const startCh = ch;
      let coinReward = 0;

      if (ch === 1) {
        const pip = byName('Pip');
        const pq = qByTitle('Pip’s Flying Muffins');
        if (
          pip?.met ||
          pip?.h.some(Boolean) ||
          pip?.fr ||
          (pq && pq.st >= 1) ||
          friendsCount >= 1 ||
          townsVisitedCount >= 3
        ) {
          ch = 2;
          coinReward += 15;
          setUnlockedCutscenes((prev) => (prev.includes('wake') ? prev : [...prev, 'wake']));
        }
      }

      if (ch === 2) {
        const barnacle = byName('Captain Barnacle');
        const pq = qByTitle('Pip’s Flying Muffins');
        if (
          (pq && pq.st >= 2) ||
          barnacle?.met ||
          barnacle?.h.some(Boolean) ||
          barnacle?.fr ||
          friendsCount >= 2 ||
          townVisited('Driftwood Dock') ||
          townVisited('Tidepool Haven')
        ) {
          ch = 3;
          coinReward += 15;
          if (!unlockedCutscenesRef.current.includes('whispers')) triggerCutscene('whispers');
        }
      }

      if (ch === 3) {
        const bumble = byName('Bumble');
        const bq = qByTitle('The Troubled Honeycomb');
        const honeyVisited = townVisited('Honeycomb Village') || townVisited('Wildflower Mill');
        if (
          bq?.st === 3 ||
          bumble?.fr ||
          (bumble?.met && ((bq?.c ?? 0) >= 2 || honeyVisited || townsVisitedCount >= 4)) ||
          (honeyVisited && (friendsCount >= 3 || starsGot >= 12)) ||
          (friendsCount >= 4 && starsGot >= 18)
        ) {
          ch = 4;
          coinReward += 15;
          markVerseRestored(0);
        }
      }

      if (ch === 4) {
        const tidbit = byName('Tidbit');
        const tq = qByTitle('Lighthouse Kindling');
        const atollVisited = townVisited('Tidepool Haven') || townVisited('Starfish Shallows');
        if (
          tq?.st === 3 ||
          tidbit?.fr ||
          (tidbit?.met && (pearlsGot >= 2 || (tq?.c ?? 0) >= 2 || atollVisited)) ||
          pearlsGot >= 4 ||
          soothedCount >= 1 ||
          (atollVisited && starsGot >= 20)
        ) {
          ch = 5;
          coinReward += 15;
          markVerseRestored(1);
        }
      }

      if (ch === 5) {
        const ember = byName('Ember');
        const cinderVisited = townVisited('Cinder Spas');
        if (
          ember?.fr ||
          (ember?.met && cinderVisited) ||
          (cinderVisited && (soothedCount >= 2 || friendsCount >= 4 || starsGot >= 24)) ||
          soothedCount >= 3
        ) {
          ch = 6;
          coinReward += 15;
          markVerseRestored(2);
        }
      }

      if (ch === 6) {
        const mizzle = byName('Madame Mizzle');
        const lilyVisited = townVisited('Lily Pavilion');
        if (
          mizzle?.fr ||
          (mizzle?.met && (lilyVisited || echoAndDiaryCount >= 1)) ||
          (lilyVisited && (soothedCount >= 2 || friendsCount >= 5 || starsGot >= 28)) ||
          soothedCount >= 4 ||
          friendsCount >= 6
        ) {
          ch = 7;
          coinReward += 15;
          markVerseRestored(3);
          if (W.moonGatePortal) W.moonGatePortal.open = true;
          if (!unlockedCutscenesRef.current.includes('starlight')) triggerCutscene('starlight');
        }
      }

      if (ch === 7) {
        const twins = byName('Penny and Quill');
        const auroraVisited = townVisited('Aurora Station');
        if (
          twins?.fr ||
          (twins?.met && auroraVisited) ||
          visitedMoonRoadRef.current ||
          W.player.moonroad ||
          (auroraVisited && (feathersGot >= 3 || ringsGot >= 2)) ||
          (feathersGot >= 6 && moonNotesGot >= 1)
        ) {
          ch = 8;
          coinReward += 15;
          markVerseRestored(4);
        }
      }

      if (ch === 8) {
        const bellamy = byName('Bellamy');
        const bellVisited = townVisited('Bellwood Treetops');
        const cirrus = W.towns.find((t) => t.n === 'Cirrus Castle');
        if (
          bellamy?.fr ||
          (bellamy?.met && (bellVisited || ringsGot >= 2)) ||
          (cirrus?.vis === 1 && (ringsGot >= 2 || feathersGot >= 5)) ||
          (bellVisited && ringsGot >= 3) ||
          (starsGot >= 45 && ringsGot >= 3)
        ) {
          ch = 9;
          coinReward += 15;
          markVerseRestored(5);
          if (W.glowdeepPortal) W.glowdeepPortal.open = true;
        }
      }

      if (ch === 9) {
        const lumi = byName('Lumi');
        const lq = qByTitle('Soup of Remembering');
        const rootedVisited = townVisited('Rooted Rest');
        if (
          lq?.st === 3 ||
          lumi?.fr ||
          (visitedGlowdeepRef.current && sporesGot >= 5) ||
          (lumi?.met && (sporesGot >= 3 || rootedVisited)) ||
          sporesGot >= 8
        ) {
          ch = 10;
          coinReward += 15;
          markVerseRestored(6);
          if (!unlockedCutscenesRef.current.includes('deep')) triggerCutscene('deep');
        }
      }

      if (ch === 10) {
        const moonNpc = byName('The Moon');
        const duskNpc = byName('Dusk');
        const moonTownVisited = townVisited('Moon’s Tea House');
        if (
          moonNpc?.fr ||
          duskNpc?.fr ||
          moonNpc?.met ||
          duskNpc?.met ||
          moonNpc?.h.some(Boolean) ||
          duskNpc?.h.some(Boolean) ||
          (moonTownVisited && moonNotesGot >= 3)
        ) {
          ch = 11;
          coinReward += 15;
        }
      }

      if (ch === 11) {
        const aurelle = byName('Aurelle');
        const dawnVisited = townVisited('Dawn Spire Summit');
        if (aurelle?.met || aurelle?.h.some(Boolean) || aurelle?.fr || dawnVisited) {
          ch = 12;
          coinReward += 25;
        }
      }

      if (ch !== startCh) {
        currentChapterRef.current = ch;
        setCurrentChapter(ch);
        if (W.moonGatePortal) W.moonGatePortal.open = ch >= 7;
        if (W.glowdeepPortal) W.glowdeepPortal.open = ch >= 9;
        if (coinReward > 0) {
          setCoins((c) => c + coinReward);
          setTotalCoins((c) => c + coinReward);
        }
        const chInfo = STORY_CHAPTERS.find((item) => item.num === ch);
        const prevChInfo = STORY_CHAPTERS.find((item) => item.num === ch - 1);
        const unlockedSpells = MAGIC_SPELLS.filter((s) => s.unlockChapter > startCh && s.unlockChapter <= ch)
          .map((s) => `${s.icon} ${s.name}`)
          .join(', ');
        audio.chime();
        enqueueMilestone({
          id: `ch-${ch}`,
          kind: 'chapter',
          icon: ch >= 12 ? '🌅' : ch >= 9 ? '🍄' : ch >= 7 ? '🌙' : '📖',
          eyebrow: `Chapter ${ch} of 12 Unlocked · +${coinReward} 🪙`,
          title: chInfo ? `Ch. ${ch}: ${chInfo.title}` : `Chapter ${ch}`,
          subtitle: unlockedSpells
            ? `Unlocked Spells: ${unlockedSpells}`
            : prevChInfo
            ? `Reward: ${prevChInfo.reward}`
            : chInfo?.goal || 'A new chapter of the Dawn Duet begins!',
        });
      }
    },
    [enqueueMilestone]
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
    setUnlockedAchievements((prev) => {
      const next = prev.includes('duet_finale') ? prev : [...prev, 'duet_finale'];
      unlockedAchievementsRef.current = next;
      return next;
    });
    audio.harmonyChime?.('Dawn Duet');
    enqueueMilestone({
      id: 'finale-dawn-duet',
      kind: 'verse',
      icon: '🌅',
      eyebrow: 'Grand Finale Complete · +200 🪙',
      title: 'The Dawn Duet & Everlight Mode',
      subtitle: 'All realms awaken in morning harmony! Free-roam Everlight unlocked.',
    });
    triggerCutscene('finale');
    checkAchFnRef.current();
  }, [enqueueMilestone]);

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
    const ringsGot = W.rings.filter((r) => r.got).length;
    const soothedCount = W.hollows.filter((h) => h.soothed).length;
    const friendsCount = W.npcs.filter((n) => n.fr && !n.tree).length;
    const foundLoreCount = W.discoveredEchoIds.size + W.discoveredDiaryPages.size;
    const atollVisited =
      W.towns.some((t) => (t.n === 'Tidepool Haven' || t.n === 'Starfish Shallows') && t.vis === 1) ||
      W.npcs.some((n) => n.n === 'Tidbit' && Boolean(n.met));
    const verseCount = VERSES_OF_REVEILLE.filter(
      (v, idx) => Boolean(v.unlocked) || loreEntriesRef.current.some((l) => l.id === `verse-${idx + 1}`)
    ).length;

    tryAdd('first_light', currentChapterRef.current >= 2);
    tryAdd('sail_atoll', atollVisited);
    tryAdd('hush_soothe', soothedCount >= 1);
    tryAdd('befriend_5', friendsCount >= 5);
    tryAdd('act1_complete', currentChapterRef.current >= 5);
    tryAdd('act2_complete', currentChapterRef.current >= 9);
    tryAdd('star25', starsGot >= 25);
    tryAdd('star100', starsGot >= 100);
    tryAdd('pearl25', pearlsGot >= 25);
    tryAdd('feather25', feathersGot >= 25);
    tryAdd('chimes', W.dawnChimesCount + ringsGot >= 7);
    tryAdd('echo_hunter', foundLoreCount >= 3);
    tryAdd('echo_keeper', foundLoreCount >= 12);
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
      const bonusCoins = toUnlock.length * 15;
      setCoins((c) => c + bonusCoins);
      setTotalCoins((c) => c + bonusCoins);
      audio.chime();
      toUnlock.forEach((id) => {
        const def = ACHIEVEMENTS.find((a) => a.id === id);
        if (def) {
          enqueueMilestone({
            id: `ach-${def.id}`,
            kind: 'achievement',
            icon: def.icon,
            eyebrow: 'Achievement Unlocked · +15 🪙',
            title: def.title,
            subtitle: def.desc,
          });
        }
      });
    }
  }, [enqueueMilestone]);
  checkAchFnRef.current = checkAchievements;

  // Check if near water for fishing
  const canFish = () => {
    const W = worldRef.current;
    if (W.player.house || W.player.sky || W.player.dive || W.player.glowdeep || W.player.moonroad) return false;
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

    // Toggle Landing if Cloud Wings cast in sky (handled below without blocking on MP)
    const castLowQuality = Boolean(settingsRef.current.low) || Boolean(deviceRef.current?.isPhone);
    const isCloudLanding = (spell.id === 'cloud_wings' || spell.id === 'wings') && W.player.sky;

    // Validate layer restrictions before deducting mana
    if (
      (spell.id === 'cloud_wings' || spell.id === 'wings') &&
      (W.player.house || W.player.glowdeep || W.player.moonroad)
    ) {
      showToast('Step outside to the Meadow first to spread your Cloud Wings');
      return;
    }

    if (
      (spell.id === 'frost_bridge' || spell.id === 'frost') &&
      (W.player.house || W.player.sky || W.player.dive || W.player.glowdeep || W.player.moonroad)
    ) {
      showToast('Step onto the surface shoreline first to cast Frost Bridge');
      return;
    }

    const freeCloud = isCloudLanding || ((spell.id === 'cloud_wings' || spell.id === 'wings') && upgrades.cloud);
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

    // Helper for radial sparkle burst at any world point (pooled)
    const spawnBurst = (colors: string[], count = 16, speed = 85, originX = W.player.x, originY = W.player.y) => {
      spawnPooledBurst(W.particles, colors, count, speed, originX, originY, {
        lowQuality: castLowQuality,
      });
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
            const tileCoins = Math.round(coinReward * coinMult);
            coinsFound += tileCoins;
            spawnWorldPopup(cx, cy - 16, `+${tileCoins} 🪙`, '#ffe875', 0.95);
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
      if (planted > 0) {
        W.dkRevision += 1;
      }
      return planted;
    };

    // Environmental Helper 3: Check solid tile at arbitrary world coordinates (for safe Glimmer Step blink)
    const isPointSolidForBlink = (px: number, py: number) => {
      if (W.player.house) {
        return W.dreamwalkTimer > 0 ? false : isHouseInteriorBlocked(px, py);
      }
      const checkTile = (tx: number, ty: number) => {
        if (tx < 1 || ty < 1 || tx >= N - 1 || ty >= N - 1) return true;
        if (W.dreamwalkTimer > 0) return false;
        if (W.player.glowdeep) return !isGlowdeepWalkable(tx, ty);
        if (W.player.moonroad) return !isMoonRoadWalkable(tx, ty);
        const idx = ty * N + tx;
        if (W.player.sky) return W.SD[idx] === 1 || W.SD[idx] === 9;
        if (W.player.dive) return W.B[idx] > 1 || W.UD[idx] === 5 || W.UD[idx] === 6;
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
          dk === 16 ||
          dk === 17 ||
          dk === 18 ||
          dk === 20 ||
          dk === 21 ||
          dk === 23
        );
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

    // Combination Harmony Check (supports matching by spell name or id & applies rich synergy effects)
    const now = performance.now() / 1000;
    let harmonyTriggered: string | null = null;
    let skipBaseCloudLanding = false;
    let cometHopHandledMovement = false;
    if (lastCastSpellRef.current && now - lastCastSpellRef.current.time < 4.0) {
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
        spawnWorldPopup(W.player.x, W.player.y - 34, `🎶 ${harmony.name}!`, '#ffe875', 1.3);

        if (harmony.name === 'Echo Magnet') {
          W.moonPullTimer = Math.max(W.moonPullTimer, 14);
          W.echoTimer = Math.max(W.echoTimer, 18);
          W.echoMagnetTimer = Math.max(W.echoMagnetTimer, 14);
          spawnMagicRing(W.magicRings, { x: W.player.x, y: W.player.y, m: 1.1, r: 340, c: '#c29eff' });
          triggerCameraShake(4.2, 0.32, 22);
          const pulledLore = discoverNearbyMemoryAndDiary(520);
          if (pulledLore.length > 0) {
            spawnWorldPopup(W.player.x, W.player.y - 52, `🧲 Echoes Pulled! (${pulledLore.length})`, '#8fd5ff', 1.15);
          }
        } else if (harmony.name === 'Hot Spring') {
          W.player.st = 100;
          W.player.o2 = 100;
          W.player.mp = Math.min(100, W.player.mp + 25);
          W.warmthTimer = Math.max(W.warmthTimer, 18);
          W.hotSprings.push({ x: W.player.x, y: W.player.y, expires: W.time + 26 });
          if (W.hotSprings.length > 5) W.hotSprings.shift();
          spawnMagicRing(W.magicRings, { x: W.player.x, y: W.player.y, m: 1.0, r: 150, c: '#74f7e2' });
          spawnBurst(['#74f7e2', '#fff7cc', '#ffb37b'], 22, 95, W.player.x, W.player.y);
          triggerCameraShake(4.5, 0.3, 18);
          setStamina(100);
          setAir(100);
          setMana(Math.round(W.player.mp));
        } else if (harmony.name === 'Lullaby Veil') {
          sootheNearbyHollows(720);
          W.dreamwalkTimer = Math.max(W.dreamwalkTimer, 18);
          W.hugTimer = Math.max(W.hugTimer, 14);
          spawnMagicRing(W.magicRings, { x: W.player.x, y: W.player.y, m: 1.25, r: 380, c: '#e5d4ff' });
        } else if (harmony.name === 'Sunrise Lift') {
          // Zero mana cost: refund the triggering spell's mana cost!
          if (!freeCloud) {
            W.player.mp = Math.min(100, W.player.mp + spell.cost);
            setMana(Math.round(W.player.mp));
          }
          W.player.dive = false;
          W.player.sky = true;
          W.player.z = 72;
          W.player.vz = 115;
          W.player.dash = 0.55;
          W.dawnTimer = Math.max(W.dawnTimer, 20);
          skipBaseCloudLanding = true;
          // Guide gently onto nearest high cloud platform if directly above open void
          const ptxS = (W.player.x / T) | 0;
          const ptyS = (W.player.y / T) | 0;
          if (ptxS > 1 && ptyS > 1 && ptxS < N - 2 && ptyS < N - 2 && W.SB[ptyS * N + ptxS] === 0) {
            let bestSkyX = W.player.x;
            let bestSkyY = W.player.y;
            let bestSkyD2 = 1e9;
            for (let sy = Math.max(2, ptyS - 18); sy <= Math.min(N - 3, ptyS + 18); sy++) {
              for (let sx = Math.max(2, ptxS - 18); sx <= Math.min(N - 3, ptxS + 18); sx++) {
                if (W.SB[sy * N + sx] > 0 && W.SD[sy * N + sx] === 0) {
                  const d2 = (sx - ptxS) * (sx - ptxS) + (sy - ptyS) * (sy - ptyS);
                  if (d2 < bestSkyD2) {
                    bestSkyD2 = d2;
                    bestSkyX = sx * T + T / 2;
                    bestSkyY = sy * T + T / 2;
                  }
                }
              }
            }
            if (bestSkyD2 < 1e9) {
              W.player.x = bestSkyX;
              W.player.y = bestSkyY;
              snapCamera();
            }
          }
          spawnMagicRing(W.magicRings, { x: W.player.x, y: W.player.y, m: 1.0, r: 240, c: '#ffd23f' });
          triggerRealmFlash('#ffd23f', 0.42);
          triggerCameraShake(6.5, 0.36, 26);
        } else if (harmony.name === 'Comet Hop') {
          const curLayerNum = getPlayerLayer(W.player);
          const itemPool = W.player.sky
            ? [...W.feathers, ...W.rings]
            : W.player.dive
            ? W.pearls
            : W.player.glowdeep
            ? W.glowSpores
            : W.player.moonroad
            ? W.moonNotes
            : [...W.stars, ...W.questItems.filter((q) => q.w === 0)];
          const echoCandidates = MEMORY_ECHOES.filter((e) => e.w === curLayerNum && !W.discoveredEchoIds.has(e.id)).map(
            (e) => ({ x: e.x * T + T / 2, y: e.y * T + T / 2, got: 0, ref: null as null | { got: number } })
          );
          const combined = [
            ...itemPool.filter((it) => !it.got).map((it) => ({ x: it.x, y: it.y, ref: it })),
            ...echoCandidates,
          ];
          const nearestUncollected = combined.sort(
            (a, b) => Math.hypot(a.x - W.player.x, a.y - W.player.y) - Math.hypot(b.x - W.player.x, b.y - W.player.y)
          )[0];
          W.starSenseTimer = Math.max(W.starSenseTimer, 22);
          if (nearestUncollected) {
            const hopOriginX = W.player.x;
            const hopOriginY = W.player.y;
            for (let gi = 0; gi < 4; gi++) {
              const gf = gi / 4;
              W.dashGhosts.push({
                x: hopOriginX + (nearestUncollected.x - hopOriginX) * gf,
                y: hopOriginY + (nearestUncollected.y - hopOriginY) * gf,
                face: W.player.face,
                alpha: 0.72 - gi * 0.14,
              });
            }
            const landOffX = Math.max(T * 1.5, Math.min((N - 1.5) * T, nearestUncollected.x + 14));
            const landOffY = Math.max(T * 1.5, Math.min((N - 1.5) * T, nearestUncollected.y + 6));
            W.player.x = landOffX;
            W.player.y = landOffY;
            W.player.z = 26;
            W.player.vz = 55;
            cometHopHandledMovement = true;
            snapCamera();
            triggerRealmFlash('#fff5b8', 0.36);
            triggerCameraShake(5.8, 0.28, 30);
            spawnMagicRing(W.magicRings, { x: W.player.x, y: W.player.y, m: 0.9, r: 150, c: '#ffd23f' });
            spawnBurst(['#ffd23f', '#8fd5ff', '#ffffff'], 24, 110, W.player.x, W.player.y);
          }
        } else if (harmony.name === 'Lily Path') {
          W.tideTimer = Math.max(W.tideTimer, 16);
          W.bloomStepTimer = Math.max(W.bloomStepTimer, 12);
          const ptx = (W.player.x / T) | 0;
          const pty = (W.player.y / T) | 0;
          const rawDx = W.player.dx || W.player.face || 1;
          const rawDy = W.player.dy || 0;
          const dLen = Math.hypot(rawDx, rawDy) || 1;
          const fx = rawDx / dLen;
          const fy = rawDy / dLen;
          const lilyDur = W.time + 55;
          let lilyCount = 0;
          for (let y = pty - 4; y <= pty + 4; y++) {
            for (let x = ptx - 4; x <= ptx + 4; x++) {
              if (Math.hypot(x - ptx, y - pty) <= 4.3 && x > 0 && y > 0 && x < N - 1 && y < N - 1 && W.B[y * N + x] < 2) {
                W.lilyMap.set(y * N + x, lilyDur);
                lilyCount++;
              }
            }
          }
          for (let step = 1; step <= 13; step++) {
            const bx = Math.round(ptx + fx * step);
            const by = Math.round(pty + fy * step);
            for (let oy = -1; oy <= 1; oy++) {
              for (let ox = -1; ox <= 1; ox++) {
                const px = bx + ox;
                const py = by + oy;
                if (px > 0 && py > 0 && px < N - 1 && py < N - 1 && W.B[py * N + px] < 2) {
                  W.lilyMap.set(py * N + px, lilyDur);
                  lilyCount++;
                }
              }
            }
            if (step % 2 === 0) {
              spawnBurst(['#6fd97d', '#ff9ebb', '#7ce6ff'], 6, 55, bx * T + T / 2, by * T + T / 2);
            }
          }
          if (lilyCount > 0) {
            spawnMagicRing(W.magicRings, { x: W.player.x + fx * 65, y: W.player.y + fy * 65, m: 1.0, r: 165, c: '#7de68f' });
          }
        } else if (harmony.name === 'Frost Glow') {
          W.starSenseTimer = Math.max(W.starSenseTimer, 24);
          W.frostShieldTimer = Math.max(W.frostShieldTimer, 20);
          W.frostGlowTimer = 26;
          spawnMagicRing(W.magicRings, { x: W.player.x, y: W.player.y, m: 1.1, r: 220, c: '#a8f2ff' });
        } else if (harmony.name === 'Thermal Breeze') {
          W.player.dive = false;
          W.player.sky = true;
          W.warmthTimer = Math.max(W.warmthTimer, 20);
          W.thermalGlideTimer = 24;
          W.player.dash = 0.42;
          skipBaseCloudLanding = true;
          triggerRealmFlash('#ffbe78', 0.34);
          triggerCameraShake(4.8, 0.3, 24);
        } else if (harmony.name === 'Rain Roots') {
          W.bloomStepTimer = Math.max(W.bloomStepTimer, 18);
          plantPermanentWildflowers(4, 0.72);
          let plotsGrown = 0;
          setCottageState((prev) => {
            const nextPlots = prev.gardenPlots.map((g) => {
              if (g.stage < 3) plotsGrown++;
              return { ...g, stage: Math.min(3, g.stage + 1) };
            });
            return { ...prev, gardenPlots: nextPlots };
          });
          for (let k = 0; k < 28; k++) {
            const a = (k / 28) * Math.PI * 2;
            const r = 30 + Math.random() * 145;
            W.blooms.push({
              x: W.player.x + Math.cos(a) * r,
              y: W.player.y + Math.sin(a) * r * 0.85,
              u: W.player.dive,
              b: W.time,
              c: 4 + (k % 3),
              e: W.time + 80,
            });
          }
          if (plotsGrown > 0) {
            spawnWorldPopup(W.player.x, W.player.y - 54, `🌱 ${plotsGrown} Cottage Plant${plotsGrown > 1 ? 's' : ''} Grew!`, '#8ef5a8', 1.1);
          }
        } else if (harmony.name === 'Starway Chorus') {
          W.starSenseTimer = Math.max(W.starSenseTimer, 28);
          spawnMagicRing(W.magicRings, { x: W.player.x, y: W.player.y, m: 1.3, r: 300, c: '#ffe875' });
          spawnBurst(['#ffd23f', '#ff9ebb', '#8fd5ff', '#b48cff'], 28, 125, W.player.x, W.player.y);
          triggerCameraShake(4.6, 0.32, 24);
        }
        checkAchFnRef.current();
        showToast(`🎶 DUET HARMONY: ${harmony.name}! ${harmony.desc}`);
      }
    }
    lastCastSpellRef.current = { id: spell.name, time: now };

    const activeSeason = currentSeasonRef.current;
    const seasonVar = getSeasonalSpellVariant(spell.id, activeSeason);

    // Visual ring pulse themed per spell + active season
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
    const spellRingColor = seasonVar?.ringColor || ringColors[spell.id] || '#ffd23f';
    const burstPalette = (colors: readonly string[]) =>
      seasonVar
        ? [...seasonVar.burstColors.filter((c): c is string => Boolean(c))]
        : [...colors];

    spawnMagicRing(W.magicRings, {
      x: W.player.x,
      y: W.player.y,
      m: 1.0,
      r: spell.id === 'echo_call' || spell.id === 'dawn_break' ? 280 : 165,
      c: spellRingColor,
    });
    if (seasonVar && !harmonyTriggered) {
      spawnWorldPopup(
        W.player.x,
        W.player.y - 36,
        `${seasonVar.seasonBadge} ${seasonVar.variantName}`,
        seasonVar.orbiterColor,
        0.95
      );
    }

    // Spell-specific environmental & player interactions (with seasonal variations!)
    if (spell.id === 'star_sense' || spell.id === 'weave') {
      const baseSense = upgrades.lens ? 36 : 20;
      const senseMult = activeSeason === 'winter' ? 1.25 : activeSeason === 'spring' ? 1.15 : 1.0;
      W.starSenseTimer = Math.max(W.starSenseTimer, Math.round(baseSense * senseMult));
      if (activeSeason === 'spring') {
        sootheNearbyHollows(160);
      } else if (activeSeason === 'summer') {
        W.player.st = Math.min(100, W.player.st + 12);
        setStamina(Math.round(W.player.st));
      } else if (activeSeason === 'autumn') {
        shakeNearbyFlora(120, 2, burstPalette(['#ff9e44', '#ffd23f']));
      } else if (activeSeason === 'winter') {
        W.frostShieldTimer = Math.max(W.frostShieldTimer, 4);
      }
      triggerMagicSurge({
        particles: W.particles,
        magicRings: W.magicRings,
        spellId: 'star_sense',
        season: activeSeason,
        x: W.player.x,
        y: W.player.y,
        lowQuality: castLowQuality,
        triggerFlash: triggerRealmFlash,
        triggerShake: triggerCameraShake,
      });
      if (!harmonyTriggered) {
        showToast(
          seasonVar
            ? `${seasonVar.seasonBadge} ${seasonVar.variantName}: ${seasonVar.bonusSummary}`
            : '✨ Star Sense: orbiting star crown illuminates treasures & nearby Echoes!'
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
      const maxJumpDist = activeSeason === 'summer' ? 195 : 165;
      const scoopRadius = activeSeason === 'summer' ? 46 : 38;

      // Smart obstacle blink: skip normal hop movement if Comet Hop already vaulted right beside treasure
      let targetX = oldX;
      let targetY = oldY;
      if (!cometHopHandledMovement) {
        for (const frac of [1.0, 0.85, 0.7, 0.55, 0.4, 0.25]) {
          const candX = Math.max(T * 1.5, Math.min((N - 1.5) * T, oldX + stepX * maxJumpDist * frac));
          const candY = Math.max(T * 1.5, Math.min((N - 1.5) * T, oldY + stepY * maxJumpDist * frac));
          if (!isPointSolidForBlink(candX, candY)) {
            targetX = candX;
            targetY = candY;
            break;
          }
        }
      }

      // Starlight afterimage ghosts along departure & mid-blink path
      if (!cometHopHandledMovement && (targetX !== oldX || targetY !== oldY)) {
        for (const gf of [0, 0.4, 0.75]) {
          W.dashGhosts.push({
            x: oldX + (targetX - oldX) * gf,
            y: oldY + (targetY - oldY) * gf,
            face: W.player.face,
            alpha: 0.65 - gf * 0.25,
          });
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

      const trailPalette = burstPalette(['#ffd23f', '#8fd5ff']);
      let touchedWater = false;
      for (let i = 0; i <= 12; i++) {
        const tFrac = i / 12;
        const px = oldX + (targetX - oldX) * tFrac;
        const py = oldY + (targetY - oldY) * tFrac;
        const ttx = (px / T) | 0;
        const tty = (py / T) | 0;
        if (isSurfaceLayer && ttx > 0 && tty > 0 && ttx < N - 1 && tty < N - 1 && W.B[tty * N + ttx] < 2) {
          touchedWater = true;
        }
        spawnPooledParticle(W.particles, {
          x: px,
          y: py,
          vx: (Math.random() - 0.5) * 40,
          vy: (Math.random() - 0.5) * 40,
          shape: 'spark',
          l: 0.9,
          c: trailPalette[i % trailPalette.length],
        });
        for (const item of scoopPool) {
          if (!item.got && Math.hypot(item.x - px, item.y - py) < scoopRadius) {
            item.got = 1;
            scooped++;
            const val = Math.round(3 * coinMult);
            setCoins((c) => c + val);
            setTotalCoins((c) => c + val);
            spawnWorldPopup(item.x, item.y - 12, `+${val} 🪙 ✨`, '#ffe875', 0.9);
          }
        }
      }

      W.player.x = targetX;
      W.player.y = targetY;
      W.player.dash = 0.16;

      if (activeSeason === 'spring') {
        W.player.st = Math.min(100, W.player.st + 15);
        setStamina(Math.round(W.player.st));
        for (let k = 0; k < 4; k++) {
          const ang = (k / 4) * Math.PI * 2;
          W.blooms.push({ x: targetX + Math.cos(ang) * 20, y: targetY + Math.sin(ang) * 16, u: W.player.dive, b: W.time, c: k % 4, e: W.time + 32 });
        }
      } else if (activeSeason === 'autumn') {
        shakeNearbyFlora(115, 2, burstPalette(['#ffb347', '#e85d35']));
      } else if (activeSeason === 'winter' && isSurfaceLayer) {
        const ltx = (targetX / T) | 0;
        const lty = (targetY / T) | 0;
        const landTileWater = ltx > 0 && lty > 0 && ltx < N - 1 && lty < N - 1 && W.B[lty * N + ltx] < 2;
        if (touchedWater || landTileWater) {
          for (let iy = lty - 1; iy <= lty + 1; iy++) {
            for (let ix = ltx - 1; ix <= ltx + 1; ix++) {
              if (ix > 0 && iy > 0 && ix < N - 1 && iy < N - 1 && W.B[iy * N + ix] < 2) {
                W.iceMap.set(iy * N + ix, W.time + 30);
              }
            }
          }
        }
      }

      spawnMagicRing(W.magicRings, { x: targetX, y: targetY, m: 0.75, r: 105, c: spellRingColor });
      triggerMagicSurge({
        particles: W.particles,
        magicRings: W.magicRings,
        spellId: 'glimmer_step',
        season: activeSeason,
        x: oldX,
        y: oldY,
        targetX,
        targetY,
        dirX: stepX,
        dirY: stepY,
        lowQuality: castLowQuality,
        triggerFlash: triggerRealmFlash,
        triggerShake: triggerCameraShake,
      });
      if (!harmonyTriggered) {
        showToast(
          scooped > 0
            ? `${seasonVar?.seasonBadge || '⚡'} ${seasonVar?.variantName || 'Glimmer Step'}: blinked & scooped ${scooped} treasure${scooped > 1 ? 's' : ''}!`
            : `${seasonVar?.seasonBadge || '⚡'} ${seasonVar?.variantName || 'Glimmer Step'}: ${seasonVar?.bonusSummary || 'vaulted in a flash of starlight!'}`
        );
      }
    } else if (spell.id === 'ember_warmth' || spell.id === 'warmth') {
      W.warmthTimer = Math.max(W.warmthTimer, activeSeason === 'summer' ? 21 : 16);
      W.player.st = 100;
      setStamina(100);
      const ptx = (W.player.x / T) | 0;
      const pty = (W.player.y / T) | 0;
      const meltRad = activeSeason === 'winter' ? 7 : 5;
      const shatterRad = activeSeason === 'summer' ? 3.4 : 2.8;
      let melted = 0;
      let shattered = 0;

      for (let y = Math.max(1, pty - meltRad); y <= Math.min(N - 2, pty + meltRad); y++) {
        for (let x = Math.max(1, ptx - meltRad); x <= Math.min(N - 2, ptx + meltRad); x++) {
          const k = y * N + x;
          if (W.iceMap.has(k)) {
            W.iceMap.delete(k);
            melted++;
          }
          // Shatter brittle mossy boulders (DK=6) within shatterRad outside towns!
          if (isSurfaceLayer && W.DK[k] === 6 && W.TW[k] === 0 && Math.hypot(x - ptx, y - pty) <= shatterRad) {
            W.DK[k] = 0;
            shattered++;
            const bx = x * T + T / 2;
            const by = y * T + T / 2;
            const rockGain = Math.round(6 * coinMult);
            spawnMagicRing(W.magicRings, { x: bx, y: by, m: 0.72, r: 78, c: spellRingColor });
            spawnBurst(burstPalette(['#ff6b6b', '#ffd23f', '#b89f8d', '#ff9e44']), 16, 110, bx, by);
            spawnWorldPopup(bx, by - 14, `+${rockGain} 🪙 🪨`, '#ffb86b', 1.1);
          }
        }
      }

      if (shattered > 0) {
        W.dkRevision += 1;
        const rockCoins = Math.round(shattered * 6 * coinMult);
        setCoins((c) => c + rockCoins);
        setTotalCoins((c) => c + rockCoins);
      }

      if (activeSeason === 'spring') {
        plantPermanentWildflowers(2, 0.45);
      } else if (activeSeason === 'winter') {
        W.player.mp = Math.min(100, W.player.mp + 8);
        setMana(Math.round(W.player.mp));
      }

      if (weatherRef.current.currentWeather.id === 'snowy') {
        weatherRef.current.setWeather('sunny');
      }

      W.npcs.forEach((n) => {
        if (!n.tree && isNpcOnPlayerLayer(n, W.player) && Math.hypot(n.x - W.player.x, n.y - W.player.y) < 280) {
          n.say = activeSeason === 'autumn' ? '🔥 Bonfire warmth!' : '🔥 Cozy fire! (+20% stride)';
          n.sayT = 3.4;
          n.wave = 1;
        }
      });
      sootheNearbyHollows(activeSeason === 'autumn' ? 260 : 180);
      triggerMagicSurge({
        particles: W.particles,
        magicRings: W.magicRings,
        spellId: 'ember_warmth',
        season: activeSeason,
        x: W.player.x,
        y: W.player.y,
        lowQuality: castLowQuality,
        triggerFlash: triggerRealmFlash,
        triggerShake: triggerCameraShake,
      });
      if (!harmonyTriggered) {
        if (shattered > 0) {
          showToast(`${seasonVar?.seasonBadge || '🔥'} ${seasonVar?.variantName || 'Ember Warmth'}: shattered ${shattered} boulder${shattered > 1 ? 's' : ''} (+${Math.round(shattered * 6 * coinMult)} 🪙)!`);
        } else if (melted > 0) {
          showToast(`${seasonVar?.seasonBadge || '🔥'} ${seasonVar?.variantName || 'Ember Warmth'}: thawed ${melted} ice tiles & ignited blazing stride!`);
        } else {
          showToast(`${seasonVar?.seasonBadge || '🔥'} ${seasonVar?.variantName || 'Ember Warmth'}: ${seasonVar?.bonusSummary || 'blazing +20% stride aura!'}`);
        }
      }
    } else if (spell.id === 'tide_song' || spell.id === 'glide') {
      W.tideTimer = Math.max(W.tideTimer, activeSeason === 'summer' ? 20 : 15);
      W.player.dash = 0.36;
      W.player.o2 = 100;
      setAir(100);
      if (weatherRef.current.currentWeather.id === 'drizzle') {
        weatherRef.current.setWeather('sunny');
      }

      // Open shoreline seashells & wake shallow waves for bonus pearls!
      let pearlCoins = activeSeason === 'spring' ? 2 : 0;
      let shellsOpened = 0;
      const patchLimit = activeSeason === 'summer' ? 4 : 3;
      if (!W.player.sky && !W.player.glowdeep && !W.player.moonroad) {
        const ptx = (W.player.x / T) | 0;
        const pty = (W.player.y / T) | 0;
        for (let y = Math.max(1, pty - 5); y <= Math.min(N - 2, pty + 5) && shellsOpened < patchLimit; y++) {
          for (let x = Math.max(1, ptx - 5); x <= Math.min(N - 2, ptx + 5) && shellsOpened < patchLimit; x++) {
            const k = y * N + x;
            if ((W.B[k] < 2 || W.DK[k] === 8) && !W.shakenTiles.has(k) && Math.hypot(x - ptx, y - pty) <= 5) {
              W.shakenTiles.add(k);
              shellsOpened++;
              const wx = x * T + T / 2;
              const wy = y * T + T / 2;
              const pGain = Math.round(4 * coinMult);
              pearlCoins += pGain;
              spawnMagicRing(W.magicRings, { x: wx, y: wy, m: 0.85, r: 80, c: '#52d6c6' });
              spawnBurst(burstPalette(['#ffffff', '#8fd5ff', '#ffd23f']), 14, 90, wx, wy);
              spawnWorldPopup(wx, wy - 14, `+${pGain} 🪙 🐚 Pearl!`, '#8ff6ff', 1.15);
              if (W.B[k] < 2) {
                W.pearls.push({ x: wx, y: wy, got: 0 });
              }
            }
          }
        }
      }
      if (pearlCoins > 0) {
        setCoins((c) => c + pearlCoins);
        setTotalCoins((c) => c + pearlCoins);
      }

      if (activeSeason === 'autumn') {
        W.player.st = Math.min(100, W.player.st + 25);
        setStamina(Math.round(W.player.st));
        sootheNearbyHollows(180);
      } else if (activeSeason === 'winter') {
        W.player.mp = Math.min(100, W.player.mp + 10);
        setMana(Math.round(W.player.mp));
      }

      // Sprout temporary coastal blossoms around feet
      const blossomCount = activeSeason === 'spring' ? 12 : 8;
      for (let k = 0; k < blossomCount; k++) {
        const a = (k / blossomCount) * Math.PI * 2;
        W.blooms.push({
          x: W.player.x + Math.cos(a) * 58,
          y: W.player.y + Math.sin(a) * 48,
          u: W.player.dive,
          b: W.time,
          c: k % 4,
          e: W.time + 35,
        });
      }

      triggerMagicSurge({
        particles: W.particles,
        magicRings: W.magicRings,
        spellId: 'tide_song',
        season: activeSeason,
        x: W.player.x,
        y: W.player.y,
        lowQuality: castLowQuality,
        triggerFlash: triggerRealmFlash,
        triggerShake: triggerCameraShake,
      });
      if (!harmonyTriggered) {
        showToast(
          shellsOpened > 0
            ? `${seasonVar?.seasonBadge || '🌊'} ${seasonVar?.variantName || 'Tide Song'}: opened ${shellsOpened} pearl shell${shellsOpened > 1 ? 's' : ''} (+${pearlCoins} 🪙), +35% speed & infinite O₂!`
            : `${seasonVar?.seasonBadge || '🌊'} ${seasonVar?.variantName || 'Tide Song'}: ${seasonVar?.bonusSummary || 'infinite air & +35% speed!'}`
        );
      }
    } else if (spell.id === 'bloom') {
      W.bloomStepTimer = Math.max(W.bloomStepTimer, activeSeason === 'spring' ? 18 : 14);
      W.player.st = 100;
      W.player.o2 = 100;
      setStamina(100);
      setAir(100);
      const plantedCount = plantPermanentWildflowers(activeSeason === 'spring' ? 3 : 2, activeSeason === 'spring' ? 0.65 : 0.55);
      const treeCoins = shakeNearbyFlora(activeSeason === 'summer' ? 175 : 135, activeSeason === 'summer' ? 4 : 3, burstPalette(['#ff9ebb', '#ffd23f', '#7bd88f']));
      const ringCount = activeSeason === 'spring' ? 28 : 20;
      for (let k = 0; k < ringCount; k++) {
        const a = (k / ringCount) * Math.PI * 2 + Math.random() * 0.25;
        const r = 24 + Math.random() * 115;
        W.blooms.push({
          x: W.player.x + Math.cos(a) * r,
          y: W.player.y + Math.sin(a) * r * 0.85,
          u: W.player.dive,
          b: W.time,
          c: activeSeason === 'autumn' ? (k % 2 === 0 ? 1 : 2) : activeSeason === 'winter' ? 0 : k % 4,
          e: W.time + 60,
        });
      }
      if (activeSeason === 'autumn') {
        W.player.mp = Math.min(100, W.player.mp + 12);
        setMana(Math.round(W.player.mp));
      }
      triggerMagicSurge({
        particles: W.particles,
        magicRings: W.magicRings,
        spellId: 'bloom',
        season: activeSeason,
        x: W.player.x,
        y: W.player.y,
        lowQuality: castLowQuality,
        triggerFlash: triggerRealmFlash,
        triggerShake: triggerCameraShake,
      });
      sootheNearbyHollows(activeSeason === 'winter' ? 260 : 180);
      if (!harmonyTriggered) {
        if (treeCoins > 0) {
          showToast(`${seasonVar?.seasonBadge || '🌸'} ${seasonVar?.variantName || 'Bloom'}: rustled +${treeCoins} 🪙, planted ${plantedCount} wildflowers & trailing petals!`);
        } else {
          showToast(`${seasonVar?.seasonBadge || '🌸'} ${seasonVar?.variantName || 'Bloom'}: ${seasonVar?.bonusSummary || 'wildflowers bloomed & stamina/air full!'}`);
        }
      }
    } else if (spell.id === 'cloud_wings' || spell.id === 'wings') {
      if (W.player.sky && !skipBaseCloudLanding) {
        // Soft Petal Dive Landing when cast while flying (snap to nearest unblocked surface spot)
        const safeLand = findNearestSafeWorldPoint(0, W.player.x, W.player.y, false);
        W.player.x = safeLand.x;
        W.player.y = safeLand.y;
        W.player.vx = 0;
        W.player.vy = 0;
        W.player.moveTarget = null;
        W.player.sky = false;
        W.thermalGlideTimer = 0;
        W.player.dash = 0.2;
        spawnMagicRing(W.magicRings, { x: W.player.x, y: W.player.y, m: 0.9, r: 175, c: spellRingColor });
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
        if (activeSeason === 'spring') plantPermanentWildflowers(2, 0.55);
        if (activeSeason === 'winter') W.frostShieldTimer = Math.max(W.frostShieldTimer, 6);
        const treeCoins = shakeNearbyFlora(activeSeason === 'autumn' ? 145 : 120, activeSeason === 'autumn' ? 3 : 2, burstPalette(['#ffffff', '#ff9ebb', '#ffd23f']));
        if (treeCoins > 0) spawnWorldPopup(W.player.x, W.player.y - 26, `+${treeCoins} 🪙 🌿`, '#ffe875');
        triggerMagicSurge({
          particles: W.particles,
          magicRings: W.magicRings,
          spellId: 'cloud_wings',
          season: activeSeason,
          x: W.player.x,
          y: W.player.y,
          subtype: 'landing',
          lowQuality: castLowQuality,
          triggerFlash: triggerRealmFlash,
          triggerShake: triggerCameraShake,
        });
        audio.pop();
        if (!harmonyTriggered) {
          showToast(
            treeCoins > 0
              ? `${seasonVar?.seasonBadge || '🌿'} ${seasonVar?.variantName || 'Petal Landing'}: touched down & rustled +${treeCoins} 🪙!`
              : `${seasonVar?.seasonBadge || '🌿'} ${seasonVar?.variantName || 'Petal Landing'}: ${seasonVar?.bonusSummary || 'touched down softly!'}`
          );
        }
        return;
      }
      if (!skipBaseCloudLanding) {
        if (activeSeason === 'spring') plantPermanentWildflowers(2, 0.5);
        if (activeSeason === 'autumn') shakeNearbyFlora(145, 3, burstPalette(['#ff884d', '#ffd23f']));
        if (activeSeason === 'summer') {
          W.player.mp = Math.min(100, W.player.mp + 5);
          setMana(Math.round(W.player.mp));
        }
        if (activeSeason === 'winter') {
          W.frostShieldTimer = Math.max(W.frostShieldTimer, 6);
        }
        W.player.sky = true;
        W.player.dive = false;
        W.player.dash = activeSeason === 'summer' ? 0.38 : 0.26;
        spawnWorldPopup(W.player.x, W.player.y - 24, `${seasonVar?.seasonBadge || '☁️'} ${seasonVar?.variantName || 'Cirrus Sky'}`, seasonVar?.orbiterColor || '#e6f6ff');
        triggerMagicSurge({
          particles: W.particles,
          magicRings: W.magicRings,
          spellId: 'cloud_wings',
          season: activeSeason,
          x: W.player.x,
          y: W.player.y,
          subtype: 'cast',
          lowQuality: castLowQuality,
          triggerFlash: triggerRealmFlash,
          triggerShake: triggerCameraShake,
        });
        if (!harmonyTriggered) {
          showToast(`${seasonVar?.seasonBadge || '☁️'} ${seasonVar?.variantName || 'Cloud Wings'}: ${seasonVar?.bonusSummary || 'launched skyward into Cirrus Kingdom!'}`);
        }
        if (!skyArrivedRef.current) {
          setSkyArrived(true);
          triggerCutscene('skyarr');
        }
      }
    } else if (spell.id === 'hush_hug' || spell.id === 'hug') {
      W.hugTimer = Math.max(W.hugTimer, activeSeason === 'summer' ? 16 : 12);
      const soothedCount = sootheNearbyHollows(activeSeason === 'winter' ? 360 : 280);
      const drawRadius = activeSeason === 'spring' ? 350 : 300;
      let huggedFriends = 0;
      let cheerBonus = 0;
      let firstFriendX = W.player.x;
      let firstFriendY = W.player.y;
      W.npcs.forEach((n) => {
        if (!n.tree && isNpcOnPlayerLayer(n, W.player) && Math.hypot(n.x - W.player.x, n.y - W.player.y) < drawRadius) {
          // Gently draw nearby NPC half-way closer to share a cozy wave & cheer
          n.tx = n.x + (W.player.x - n.x) * 0.45;
          n.ty = n.y + (W.player.y - n.y) * 0.45;
          n.wt = 4.5;
          if (!n.say && Math.random() < 0.8) {
            cheerBonus += 1;
          }
          n.say = activeSeason === 'autumn' ? '🍵 Warm tea & hugs!' : activeSeason === 'winter' ? '🔥 Cozy hearth hug!' : '💖 Warm hug!';
          n.sayT = 3.8;
          n.wave = 1;
          if (huggedFriends === 0) {
            firstFriendX = n.x;
            firstFriendY = n.y;
          }
          huggedFriends++;
          spawnBurst(burstPalette(['#ff7aa8', '#ffb3c7', '#ffd23f']), 6, 55, n.x, n.y - 6);
        }
      });
      if (activeSeason === 'summer') {
        W.player.st = Math.min(100, W.player.st + 25);
        setStamina(Math.round(W.player.st));
      } else if (activeSeason === 'winter') {
        W.warmthTimer = Math.max(W.warmthTimer, 6);
      }
      const autumnTreat = activeSeason === 'autumn' && huggedFriends > 0 ? 3 : 0;
      if (cheerBonus > 0 || autumnTreat > 0) {
        const giftCoins = Math.round((Math.min(6, cheerBonus * 2) + autumnTreat) * coinMult);
        setCoins((c) => c + giftCoins);
        setTotalCoins((c) => c + giftCoins);
        spawnWorldPopup(firstFriendX, firstFriendY - 22, `+${giftCoins} 🪙 💖`, '#ff9ebb', 1.15);
      }
      triggerMagicSurge({
        particles: W.particles,
        magicRings: W.magicRings,
        spellId: 'hush_hug',
        season: activeSeason,
        x: W.player.x,
        y: W.player.y,
        lowQuality: castLowQuality,
        triggerFlash: triggerRealmFlash,
        triggerShake: triggerCameraShake,
      });
      if (!harmonyTriggered) {
        if (soothedCount > 0) {
          showToast(`${seasonVar?.seasonBadge || '🤗'} ${seasonVar?.variantName || 'Hush Hug'}: Soothed ${soothedCount} Hollow${soothedCount > 1 ? 's' : ''} & raised Heart Aura!`);
        } else if (huggedFriends > 0) {
          showToast(`${seasonVar?.seasonBadge || '🤗'} ${seasonVar?.variantName || 'Hush Hug'}: ${huggedFriends} friend${huggedFriends > 1 ? 's' : ''} gathered close!`);
        } else {
          showToast(`${seasonVar?.seasonBadge || '🤗'} ${seasonVar?.variantName || 'Hush Hug'}: ${seasonVar?.bonusSummary || 'orbiting Heart Aura active!'}`);
        }
      }
    } else if (spell.id === 'frost_bridge' || spell.id === 'frost') {
      W.frostShieldTimer = activeSeason === 'winter' || activeSeason === 'summer' ? 22 : 16;
      const iceDur = activeSeason === 'winter' ? 90 : activeSeason === 'summer' ? 38 : 55;
      const pondRad = activeSeason === 'winter' ? 7 : 5;
      const forwardSteps = activeSeason === 'winter' ? 10 : activeSeason === 'autumn' ? 9 : 7;
      const tx = (W.player.x / T) | 0;
      const ty = (W.player.y / T) | 0;
      let waterFrozen = 0;
      // Freeze pond/channel around Mochi
      for (let y = ty - pondRad; y <= ty + pondRad; y++) {
        for (let x = tx - pondRad; x <= tx + pondRad; x++) {
          if (Math.hypot(x - tx, y - ty) <= pondRad + 0.4 && x > 0 && y > 0 && x < N - 1 && y < N - 1 && W.B[y * N + x] < 2) {
            W.iceMap.set(y * N + x, W.time + iceDur);
            waterFrozen++;
          }
        }
      }
      // Project a forward ice bridge corridor in Mochi's facing direction!
      const rawDx = W.player.dx || W.player.face || 1;
      const rawDy = W.player.dy || 0;
      const dLen = Math.hypot(rawDx, rawDy) || 1;
      const fx = rawDx / dLen;
      const fy = rawDy / dLen;
      for (let step = 1; step <= forwardSteps; step++) {
        const bx = Math.round(tx + fx * step);
        const by = Math.round(ty + fy * step);
        for (let oy = -1; oy <= 1; oy++) {
          for (let ox = -1; ox <= 1; ox++) {
            const px = bx + ox;
            const py = by + oy;
            if (px > 0 && py > 0 && px < N - 1 && py < N - 1 && W.B[py * N + px] < 2 && !W.iceMap.has(py * N + px)) {
              W.iceMap.set(py * N + px, W.time + iceDur);
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
              W.iceMap.set(y * N + x, W.time + iceDur);
            }
          }
        }
      }
      if (activeSeason === 'spring') {
        W.player.st = Math.min(100, W.player.st + 12);
        setStamina(Math.round(W.player.st));
        for (let k = 0; k < 6; k++) {
          const a = (k / 6) * Math.PI * 2;
          W.blooms.push({ x: W.player.x + Math.cos(a) * 44, y: W.player.y + Math.sin(a) * 38, u: false, b: W.time, c: 2, e: W.time + 30 });
        }
      } else if (activeSeason === 'summer') {
        W.player.st = Math.min(100, W.player.st + 20);
        setStamina(Math.round(W.player.st));
      }
      triggerMagicSurge({
        particles: W.particles,
        magicRings: W.magicRings,
        spellId: 'frost_bridge',
        season: activeSeason,
        x: W.player.x,
        y: W.player.y,
        dirX: fx,
        dirY: fy,
        lowQuality: castLowQuality,
        triggerFlash: triggerRealmFlash,
        triggerShake: triggerCameraShake,
      });
      if (!harmonyTriggered) {
        if (waterFrozen > 0) {
          showToast(`${seasonVar?.seasonBadge || '❄️'} ${seasonVar?.variantName || 'Frost Bridge'}: froze ${waterFrozen} water tiles & raised Frost Crystals!`);
        } else {
          showToast(`${seasonVar?.seasonBadge || '❄️'} ${seasonVar?.variantName || 'Frost Bridge'}: ${seasonVar?.bonusSummary || 'Ice Skate pad & orbiting Frost Crystals!'}`);
        }
      }
    } else if (spell.id === 'moon_pull' || spell.id === 'pull') {
      W.moonPullTimer = activeSeason === 'summer' ? 12.0 : 9.0;
      if (activeSeason === 'spring') {
        W.bloomStepTimer = Math.max(W.bloomStepTimer, 6);
      } else if (activeSeason === 'winter') {
        W.player.dash = Math.max(W.player.dash, 0.22);
      }
      const groveCoins = shakeNearbyFlora(activeSeason === 'autumn' ? 220 : 155, activeSeason === 'autumn' ? 3 : 2, burstPalette(['#b48cff', '#e2d4ff', '#ffd23f']));
      triggerMagicSurge({
        particles: W.particles,
        magicRings: W.magicRings,
        spellId: 'moon_pull',
        season: activeSeason,
        x: W.player.x,
        y: W.player.y,
        lowQuality: castLowQuality,
        triggerFlash: triggerRealmFlash,
        triggerShake: triggerCameraShake,
      });
      if (!harmonyTriggered) {
        showToast(
          groveCoins > 0
            ? `${seasonVar?.seasonBadge || '🧲'} ${seasonVar?.variantName || 'Moon Pull'}: pulled +${groveCoins} 🪙 from groves & treasures!`
            : `${seasonVar?.seasonBadge || '🧲'} ${seasonVar?.variantName || 'Moon Pull'}: ${seasonVar?.bonusSummary || 'gravity field draws distant treasures!'}`
        );
      }
    } else if (spell.id === 'echo_call' || spell.id === 'echo') {
      W.dawnChimesCount += 1;
      W.echoTimer = activeSeason === 'summer' ? 20 : 15;
      spawnMagicRing(W.magicRings, { x: W.player.x, y: W.player.y, m: 1.35, r: 340, c: spellRingColor });
      sootheNearbyHollows(activeSeason === 'winter' ? 340 : 250);
      const foundLore = discoverNearbyMemoryAndDiary(activeSeason === 'autumn' ? 230 : 185);
      const waveReach = activeSeason === 'spring' ? 360 : 300;
      W.npcs.forEach((n) => {
        if (!n.tree && isNpcOnPlayerLayer(n, W.player) && Math.hypot(n.x - W.player.x, n.y - W.player.y) < waveReach) {
          n.say = activeSeason === 'winter' ? '🔔 Crystal resonance!' : '🔔 Such a sweet resonance!';
          n.sayT = 3.2;
          n.wave = 1;
        }
      });
      triggerMagicSurge({
        particles: W.particles,
        magicRings: W.magicRings,
        spellId: 'echo_call',
        season: activeSeason,
        x: W.player.x,
        y: W.player.y,
        lowQuality: castLowQuality,
        triggerFlash: triggerRealmFlash,
        triggerShake: triggerCameraShake,
      });
      if (!harmonyTriggered) {
        if (foundLore.length > 0) {
          showToast(`${seasonVar?.seasonBadge || '🔔'} ${seasonVar?.variantName || 'Echo Call'}: recorded ${foundLore.join(', ')} (+${Math.round(15 * foundLore.length * coinMult)} 🪙)!`);
        } else {
          showToast(`${seasonVar?.seasonBadge || '🔔'} ${seasonVar?.variantName || 'Echo Call'}: ${seasonVar?.bonusSummary || 'sonar wave chimes toward Memory Echoes!'}`);
        }
      }
    } else if (spell.id === 'dreamwalk') {
      W.dreamwalkTimer = activeSeason === 'summer' ? 20 : 16;
      if (activeSeason === 'spring') {
        W.bloomStepTimer = Math.max(W.bloomStepTimer, 6);
      } else if (activeSeason === 'autumn') {
        W.player.st = 100;
        setStamina(100);
      } else if (activeSeason === 'winter') {
        W.frostShieldTimer = Math.max(W.frostShieldTimer, 8);
      }
      sootheNearbyHollows(220);
      triggerMagicSurge({
        particles: W.particles,
        magicRings: W.magicRings,
        spellId: 'dreamwalk',
        season: activeSeason,
        x: W.player.x,
        y: W.player.y,
        lowQuality: castLowQuality,
        triggerFlash: triggerRealmFlash,
        triggerShake: triggerCameraShake,
      });
      const moonTeaTown = W.towns.find((t) => t.n === 'Moon’s Tea House');
      if (moonTeaTown && !moonTeaTown.vis) moonTeaTown.vis = 1;
      if (currentChapterRef.current >= 7) {
        if (W.player.moonroad) {
          const mx = W.moonGatePortal ? Math.round((W.moonGatePortal.x - T / 2) / T) : Math.round(N / 2);
          const my = W.moonGatePortal ? Math.round((W.moonGatePortal.y - T / 2) / T) : Math.round(N / 2);
          enterRealmLayer(0, mx, my);
          showToast(`${seasonVar?.seasonBadge || '🌿'} ${seasonVar?.variantName || 'Dreamwalk'}: stepped through the Silver Gate!`);
        } else {
          enterRealmLayer(4, MOONROAD_SPAWN_TILE.x, MOONROAD_SPAWN_TILE.y);
          setVisitedMoonRoad(true);
          showToast(`${seasonVar?.seasonBadge || '🌙'} ${seasonVar?.variantName || 'Dreamwalk'}: stepped onto the Moon Road!`);
        }
      } else if (!harmonyTriggered) {
        showToast(`${seasonVar?.seasonBadge || '🌙'} ${seasonVar?.variantName || 'Dreamwalk'}: ${seasonVar?.bonusSummary || 'ghostly Starlight Form (+32% speed)!'}`);
      }
      audio.duskWhistle?.();
    } else if (spell.id === 'dawn_break' || spell.id === 'sunburst') {
      W.dawnChimesCount += 1;
      W.dawnTimer = activeSeason === 'summer' ? 24 : 18;
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
      plantPermanentWildflowers(activeSeason === 'spring' ? 4 : 3, activeSeason === 'spring' ? 0.6 : 0.5);
      shakeNearbyFlora(activeSeason === 'summer' ? 210 : 160, 4, burstPalette(['#ffd23f', '#ff9f43', '#ff7aa8']));
      const dawnBlooms = activeSeason === 'spring' ? 22 : 16;
      for (let k = 0; k < dawnBlooms; k++) {
        const a = (k / dawnBlooms) * Math.PI * 2;
        W.blooms.push({
          x: W.player.x + Math.cos(a) * 90,
          y: W.player.y + Math.sin(a) * 78,
          u: W.player.dive,
          b: W.time,
          c: k % 4,
          e: W.time + 65,
        });
      }
      if (activeSeason === 'autumn') {
        W.player.mp = Math.min(100, W.player.mp + 20);
        setMana(Math.round(W.player.mp));
      }
      if (weatherRef.current.currentWeather.id === 'drizzle' || weatherRef.current.currentWeather.id === 'snowy') {
        weatherRef.current.setWeather('sunny');
      }
      sootheNearbyHollows(activeSeason === 'winter' ? 440 : 340);
      triggerMagicSurge({
        particles: W.particles,
        magicRings: W.magicRings,
        spellId: 'dawn_break',
        season: activeSeason,
        x: W.player.x,
        y: W.player.y,
        lowQuality: castLowQuality,
        triggerFlash: triggerRealmFlash,
        triggerShake: triggerCameraShake,
      });
      if (currentChapterRef.current >= 12 && !lullabyDoneRef.current) {
        const finalePartner = W.npcs.find(
          (n) =>
            isNpcOnPlayerLayer(n, W.player) &&
            (n.n === 'Aurelle' || n.n === 'Lantern Tree' || n.n === 'Wick') &&
            Math.hypot(n.x - W.player.x, n.y - W.player.y) < 190
        );
        if (finalePartner) {
          completeDawnDuetFinale();
          return;
        }
      }
      if (!harmonyTriggered) {
        showToast(`${seasonVar?.seasonBadge || '🌅'} ${seasonVar?.variantName || 'Dawn Break'}: ${seasonVar?.bonusSummary || 'sunrise blooms flowers & melts ice!'}`);
      }
    } else if (spell.id === 'duet') {
      triggerMagicSurge({
        particles: W.particles,
        magicRings: W.magicRings,
        spellId: 'duet',
        season: activeSeason,
        x: W.player.x,
        y: W.player.y,
        companionX: W.companionPos.x,
        companionY: W.companionPos.y,
        lowQuality: castLowQuality,
        triggerFlash: triggerRealmFlash,
        triggerShake: triggerCameraShake,
      });
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

      const rawDestX = town.x * T + T / 2;
      const rawDestY = (town.n === 'Mochi Hamlet' ? town.y + 2 : town.y) * T + T / 2;
      const townLayer = (town.w === 1 || town.w === 2 || town.w === 3 || town.w === 4 ? town.w : 0) as 0 | 1 | 2 | 3 | 4;
      const safeTownPt = findNearestSafeWorldPoint(townLayer, rawDestX, rawDestY, townLayer === 0);
      const destX = safeTownPt.x;
      const destY = safeTownPt.y;

      W.player.x = destX;
      W.player.y = destY;
      W.player.vx = 0;
      W.player.vy = 0;
      W.player.moveTarget = null;
      W.player.dash = 0;
      W.player.sky = town.w === 2;
      W.player.dive = town.w === 1;
      W.player.swim = false;
      W.player.wasSwimming = false;
      W.player.z = 0;
      W.player.vz = 0;
      W.player.jumpCount = 0;
      W.player.glowdeep = town.w === 3;
      W.player.moonroad = town.w === 4;
      W.player.house = false;
      W.companionPos.x = destX - 24;
      W.companionPos.y = destY + 4;
      const warpSeason = currentSeasonRef.current;
      const warpVar = getSeasonalSpellVariant('teleport', warpSeason);
      W.player.st = Math.min(100, W.player.st + 15);
      setStamina(Math.round(W.player.st));
      snapCamera();
      spawnMagicRing(W.magicRings, { x: destX, y: destY, m: 1.0, r: 170, c: warpVar?.ringColor || '#b48cff' });
      triggerMagicSurge({
        particles: W.particles,
        magicRings: W.magicRings,
        spellId: 'teleport',
        season: warpSeason,
        x: destX,
        y: destY,
        subtype: 'arrival',
        lowQuality: Boolean(settingsRef.current.low) || Boolean(deviceRef.current?.isPhone),
        triggerFlash: triggerRealmFlash,
        triggerShake: triggerCameraShake,
      });
      spawnWorldPopup(destX, destY - 26, `${warpVar?.seasonBadge || '🌀'} ${town.n}`, warpVar?.orbiterColor || '#e8dcff', 1.25);
      if (town.w === 3) setVisitedGlowdeep(true);
      if (town.w === 4) setVisitedMoonRoad(true);

      setPlayerPos({
        x: destX,
        y: destY,
        sky: W.player.sky,
        dive: W.player.dive,
        swim: false,
        glowdeep: W.player.glowdeep,
        moonroad: W.player.moonroad,
        house: false,
      });

      audio.teleportWarp();

      // Arrival Starway Chorus harmony check if Star Sense was just cast
      const now = performance.now() / 1000;
      if (lastCastSpellRef.current && now - lastCastSpellRef.current.time < 4.5 && lastCastSpellRef.current.id === 'Star Sense') {
        W.starSenseTimer = Math.max(W.starSenseTimer, 28);
        triggeredHarmoniesRef.current.add('Starway Chorus');
        checkAchFnRef.current();
        audio.harmonyChime('Starway Chorus');
        spawnMagicRing(W.magicRings, { x: destX, y: destY, m: 1.35, r: 320, c: '#ffe875' });
        spawnPooledBurst(W.particles, ['#ffd23f', '#8fd5ff', '#ff9ebb'], 24, 115, destX, destY, {
          life: 1.15,
          shape: 'spark',
          lowQuality: Boolean(settingsRef.current.low) || Boolean(deviceRef.current?.isPhone),
        });
        triggerCameraShake(5.5, 0.34, 26);
        spawnWorldPopup(destX, destY - 46, '🎶 Starway Chorus! ✨', '#ffe875', 1.3);
        showToast(`🎶 DUET HARMONY: Starway Chorus at ${town.n}! Radiant beacons reveal nearby treasures! ✨`);
      } else {
        showToast(`${warpVar?.seasonBadge || '🌀'} ${warpVar?.variantName || 'Song of Teleportation'} to ${town.n}!`);
      }
      lastCastSpellRef.current = { id: 'Song of Teleportation', time: now };

      setActiveModal('none');
    },
    [findNearestSafeWorldPoint, showToast, snapCamera, spawnWorldPopup, triggerCameraShake, triggerRealmFlash]
  );

  // Soothe Hollows helper (strictly matched to player's current layer)
  const sootheNearbyHollows = (radius: number): number => {
    const W = worldRef.current;
    const curLayer = getPlayerLayer(W.player);
    let count = 0;
    W.hollows.forEach((h) => {
      if ((h.w ?? 0) !== curLayer) return;
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
            spawnPooledParticle(W.particles, {
              x: h.x,
              y: h.y,
              vx: (Math.random() - 0.5) * 60,
              vy: -20 - Math.random() * 50,
              shape: 'heart',
              l: 1.0,
              c: '#ff7aa8',
            });
          }
        }
      }
    });
    if (count > 0) {
      evalStoryFnRef.current();
      checkAchFnRef.current();
    }
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

  // Cutscene Trigger & FIFO Queue so back-to-back milestones never drop cutscenes
  const triggerCutscene = useCallback((sceneKey: string) => {
    const slides = CUTSCENE_MOVIES[sceneKey];
    if (!slides) return;

    if (!unlockedCutscenesRef.current.includes(sceneKey)) {
      const nextUnlocked = [...unlockedCutscenesRef.current, sceneKey];
      unlockedCutscenesRef.current = nextUnlocked;
      setUnlockedCutscenes(nextUnlocked);
    }

    if (activeCutsceneRef.current !== null) {
      if (
        activeCutsceneKeyRef.current !== sceneKey &&
        !cutsceneQueueRef.current.includes(sceneKey)
      ) {
        cutsceneQueueRef.current.push(sceneKey);
      }
      return;
    }

    activeCutsceneKeyRef.current = sceneKey;
    setActiveCutsceneKey(sceneKey);
    activeCutsceneRef.current = slides;
    setActiveCutscene(slides);
  }, []);

  const finishActiveCutscene = useCallback(() => {
    const finishedKey = activeCutsceneKeyRef.current;
    if (
      finishedKey === 'intro' &&
      currentChapterRef.current === 1 &&
      !unlockedCutscenesRef.current.includes('wake')
    ) {
      const nextUnlocked = [...unlockedCutscenesRef.current, 'wake'];
      unlockedCutscenesRef.current = nextUnlocked;
      setUnlockedCutscenes(nextUnlocked);
      showToast('🌟 Chapter 1: Morning After — Talk to Pip near the Lantern Tree!');
    }

    while (cutsceneQueueRef.current.length > 0) {
      const nextKey = cutsceneQueueRef.current.shift()!;
      const nextSlides = CUTSCENE_MOVIES[nextKey];
      if (nextSlides) {
        activeCutsceneKeyRef.current = nextKey;
        setActiveCutsceneKey(nextKey);
        activeCutsceneRef.current = nextSlides;
        setActiveCutscene(nextSlides);
        return;
      }
    }

    activeCutsceneKeyRef.current = null;
    setActiveCutsceneKey(null);
    activeCutsceneRef.current = null;
    setActiveCutscene(null);
    evalStoryFnRef.current();
    checkAchFnRef.current();
  }, [showToast]);
  finishCutsceneFnRef.current = finishActiveCutscene;

  // Reset all React states, world entities, timers, and module-level discovery flags to a clean slate
  const resetGameStateToFresh = useCallback(
    (options?: { resetAppearance?: boolean }) => {
      const W = worldRef.current;
      const shouldResetLook = options?.resetAppearance !== false;

      if (shouldResetLook) {
        const freshLook = createDefaultPlayerLook();
        playerLookRef.current = freshLook;
        setPlayerLook(freshLook);
      }

      coinsRef.current = 0;
      totalCoinsRef.current = 0;
      currentChapterRef.current = 1;
      lullabyDoneRef.current = false;
      skyStoryDoneRef.current = false;
      skyArrivedRef.current = false;
      visitedGlowdeepRef.current = false;
      visitedMoonRoadRef.current = false;
      upgradesRef.current = {};
      unlockedAchievementsRef.current = [];
      unlockedCutscenesRef.current = [];
      loreEntriesRef.current = [];
      fishLogRef.current = {};
      townProsperityRef.current = {};
      completedTownRequestsRef.current = [];
      const freshCottage = createDefaultCottageState();
      cottageStateRef.current = freshCottage;
      const freshHamlet = createDefaultHamletResidents();
      hamletResidentsRef.current = freshHamlet;

      setCoins(0);
      setTotalCoins(0);
      setCurrentChapter(1);
      setLullabyDone(false);
      setSkyStoryDone(false);
      setSkyArrived(false);
      setVisitedGlowdeep(false);
      setVisitedMoonRoad(false);
      setUpgrades({});
      setUnlockedAchievements([]);
      setUnlockedCutscenes([]);
      cutsceneQueueRef.current = [];
      activeCutsceneKeyRef.current = null;
      setActiveCutsceneKey(null);
      activeCutsceneRef.current = null;
      setActiveCutscene(null);
      setQuestRevision((r) => r + 1);
      moveTargetStallRef.current = { timer: 0, lastX: 0, lastY: 0 };
      setLoreEntries([]);
      setFishLog({});
      setTownProsperity({});
      setCompletedTownRequests([]);
      setCottageState(freshCottage);
      setHamletResidents(freshHamlet);
      setActiveNpc(null);
      activeNpcRef.current = null;
      setNearbyTownAction(null);
      nearbyTownActionRef.current = null;
      nearbyTownWorldTargetRef.current = null;
      setActiveHouseInteractable(null);
      setSelectedSpellIdx(0);
      setMilestoneQueue([]);
      setCurrentBiomeName('Sunny Meadow');
      setStamina(100);
      setAir(100);
      setMana(100);

      triggeredHarmoniesRef.current.clear();
      lastCastSpellRef.current = null;

      // Reset world decor if wildflowers were blossomed
      if (initialDkRef.current && initialDkRef.current.length === W.DK.length) {
        W.DK.set(initialDkRef.current);
        W.dkRevision += 1;
      }

      // Reset collectibles
      W.stars.forEach((s) => { s.got = 0; });
      W.pearls.forEach((p) => { p.got = 0; });
      W.feathers.forEach((f) => { f.got = 0; });
      W.rings.forEach((r) => { r.got = 0; });
      W.glowSpores.forEach((s) => { s.got = 0; });
      W.moonNotes.forEach((n) => { n.got = 0; });

      // Reset quests cleanly & preserve live QuestItem.q links
      W.quests = INITIAL_QUESTS.map((q) => ({ ...q }));
      W.questItems.forEach((qi) => {
        qi.got = 0;
        const matched = W.quests.find((q) => q.t === qi.q.t);
        if (matched) qi.q = matched;
      });

      // Reset towns, NPCs, hollows, portals
      W.towns.forEach((t) => {
        t.vis = t.n === 'Mochi Hamlet' || t.n === 'Willowbrook' ? 1 : 0;
        t.prosperity = 1;
      });
      W.npcs.forEach((n) => {
        n.fr = false;
        n.met = Boolean(n.tree);
        n.h = n.t.map(() => 0);
        n.hist = [];
        n.sayT = 0;
        n.say = undefined;
        n.wave = 0;
        n.mv = 0;
        n.go = 0;
        n.x = n.hx;
        n.y = n.hy;
        n.tx = n.hx;
        n.ty = n.hy;
      });
      W.hollows.forEach((h) => {
        h.soothed = false;
        h.bloomT = 0;
      });
      if (W.moonGatePortal) W.moonGatePortal.open = false;
      if (W.glowdeepPortal) W.glowdeepPortal.open = false;

      // Clear transient effects, fog of war, spells & lore discovery state
      W.iceMap.clear();
      W.lilyMap.clear();
      W.hotSprings = [];
      W.blooms = [];
      clearMagicPools(W.particles, W.magicRings);
      W.screenShake.intensity = 0;
      W.screenShake.duration = 0;
      W.screenShake.elapsed = 0;
      W.screenShake.offsetX = 0;
      W.screenShake.offsetY = 0;
      W.worldPopups = [];
      W.dashGhosts = [];
      W.exploredMask.fill(0);
      W.starSenseTimer = 0;
      W.moonPullTimer = 0;
      W.warmthTimer = 0;
      W.tideTimer = 0;
      W.echoTimer = 0;
      W.dreamwalkTimer = 0;
      W.dawnTimer = 0;
      W.frostShieldTimer = 0;
      W.bloomStepTimer = 0;
      W.hugTimer = 0;
      W.frostGlowTimer = 0;
      W.thermalGlideTimer = 0;
      W.echoMagnetTimer = 0;
      W.echoMagnetTick = 0;
      W.bloomStepCooldown = 0;
      W.marketSpeedTimer = 0;
      W.marketDiveTimer = 0;
      W.marketWarmthTimer = 0;
      W.marketLuckTimer = 0;
      W.magicCooldown = 0;
      W.dawnChimesCount = 0;
      W.shakenTiles.clear();
      W.discoveredEchoIds.clear();
      W.discoveredDiaryPages.clear();
      W.realmFlash = { alpha: 0, color: '#ffffff' };
      W.lastSaveTime = W.time;

      // Reset module-level story flags
      VERSES_OF_REVEILLE.forEach((v) => { v.unlocked = false; });
      MEMORY_ECHOES.forEach((e) => { e.got = false; });
      MOON_DIARY_PAGES.forEach((p) => { p.found = false; });

      // Reset player position, vitals & camera to home stoop
      const spawn = baseHomeSpawnRef.current;
      W.player.x = spawn.x;
      W.player.y = spawn.y;
      W.player.vx = 0;
      W.player.vy = 0;
      W.player.dx = 0;
      W.player.dy = 1;
      W.player.face = 1;
      W.player.st = 100;
      W.player.o2 = 100;
      W.player.mp = 100;
      W.player.dash = 0;
      W.player.cd = 0;
      W.player.sky = false;
      W.player.dive = false;
      W.player.swim = false;
      W.player.isSprinting = false;
      W.player.z = 0;
      W.player.vz = 0;
      W.player.jumpCount = 0;
      W.player.coyoteTimer = 0;
      W.player.wasSwimming = false;
      W.player.glowdeep = false;
      W.player.moonroad = false;
      W.player.house = false;
      W.player.isMoving = false;
      W.player.moveTarget = null;
      W.companionPos.x = spawn.x - 26;
      W.companionPos.y = spawn.y + 4;
      W.keys.clear();
      W.touchJoystick.active = false;

      hudSyncRef.current = {
        ...hudSyncRef.current,
        st: 100,
        o2: 100,
        mp: 100,
        biome: 'Sunny Meadow',
        npc: null,
        houseItemId: null,
        townActionKey: '',
        pxQuant: -999,
        pyQuant: -999,
        layerKey: '',
      };

      setPlayerPos({
        x: spawn.x,
        y: spawn.y,
        sky: false,
        dive: false,
        swim: false,
        glowdeep: false,
        moonroad: false,
        house: false,
      });
      snapCamera();
    },
    [snapCamera]
  );

  // Serialize live progress & world state into a portable per-slot snapshot
  const serializeSaveSnapshot = useCallback(() => {
    const W = worldRef.current;
    return {
      worldN: N,
      L: playerLookRef.current,
      coins: coinsRef.current,
      tot: totalCoinsRef.current,
      ch: currentChapterRef.current,
      done: lullabyDoneRef.current,
      skd: skyStoryDoneRef.current,
      skArr: skyArrivedRef.current,
      vg: visitedGlowdeepRef.current,
      vm: visitedMoonRoadRef.current,
      lore: loreEntriesRef.current,
      ach: unlockedAchievementsRef.current,
      mv: unlockedCutscenesRef.current,
      ug: upgradesRef.current,
      fs: fishLogRef.current,
      cottage: cottageStateRef.current,
      hamlet: hamletResidentsRef.current,
      townProsperity: townProsperityRef.current,
      completedTownRequests: completedTownRequestsRef.current,
      visTowns: W.towns.filter((t) => t.vis === 1).map((t) => t.n),
      qu: W.quests.map((q) => ({ t: q.t, st: q.st, c: q.c })),
      fr: W.npcs.filter((n) => n.fr).map((n) => n.n),
      npcState: W.npcs
        .filter((n) => n.fr || n.met || n.h.some(Boolean) || (n.hist && n.hist.length > 0))
        .map((n) => ({
          n: n.n,
          fr: Boolean(n.fr),
          met: Boolean(n.met),
          h: n.h,
          hist: n.hist || [],
        })),
      starsGotIdx: W.stars.reduce<number[]>((acc, s, idx) => (s.got ? [...acc, idx] : acc), []),
      pearlsGotIdx: W.pearls.reduce<number[]>((acc, p, idx) => (p.got ? [...acc, idx] : acc), []),
      feathersGotIdx: W.feathers.reduce<number[]>((acc, f, idx) => (f.got ? [...acc, idx] : acc), []),
      ringsGotIdx: W.rings.reduce<number[]>((acc, r, idx) => (r.got ? [...acc, idx] : acc), []),
      sporesGotIdx: W.glowSpores.reduce<number[]>((acc, s, idx) => (s.got ? [...acc, idx] : acc), []),
      notesGotIdx: W.moonNotes.reduce<number[]>((acc, n, idx) => (n.got ? [...acc, idx] : acc), []),
      questItemsGotIdx: W.questItems.reduce<number[]>((acc, qi, idx) => (qi.got ? [...acc, idx] : acc), []),
      hollowsSoothedIds: W.hollows.filter((h) => h.soothed).map((h) => h.id),
      echoIds: Array.from(W.discoveredEchoIds),
      diaryPages: Array.from(W.discoveredDiaryPages),
      harmonies: Array.from(triggeredHarmoniesRef.current),
      shakenTiles: Array.from(W.shakenTiles),
      chimes: W.dawnChimesCount,
      pl: {
        st: W.player.st,
        o2: W.player.o2,
        mp: W.player.mp,
      },
      pos: {
        x: W.player.x,
        y: W.player.y,
        sky: W.player.sky,
        dive: W.player.dive,
        glowdeep: W.player.glowdeep,
        moonroad: W.player.moonroad,
        house: W.player.house,
      },
    };
  }, []);

  // Reset to clean slate and overlay a parsed save payload strictly for one slot
  const applySaveSnapshotToState = useCallback(
    (data: any) => {
      resetGameStateToFresh({ resetAppearance: true });
      if (!data || typeof data !== 'object') return;

      const W = worldRef.current;
      const savedN = typeof data.worldN === 'number' && data.worldN > 0 ? data.worldN : 260;
      const coordScale = N / savedN;

      if (data.L && typeof data.L === 'object') {
        const mergedLook = { ...createDefaultPlayerLook(), ...data.L };
        playerLookRef.current = mergedLook;
        setPlayerLook(mergedLook);
      }
      if (typeof data.coins === 'number') {
        coinsRef.current = data.coins;
        setCoins(data.coins);
      }
      if (typeof data.tot === 'number') {
        totalCoinsRef.current = data.tot;
        setTotalCoins(data.tot);
      }
      if (typeof data.ch === 'number') {
        currentChapterRef.current = data.ch;
        setCurrentChapter(data.ch);
        if (W.moonGatePortal) W.moonGatePortal.open = data.ch >= 7;
        if (W.glowdeepPortal) W.glowdeepPortal.open = data.ch >= 9;
      }
      if (typeof data.chimes === 'number') W.dawnChimesCount = data.chimes;
      if (data.done !== undefined) {
        const doneVal = Boolean(data.done);
        lullabyDoneRef.current = doneVal;
        setLullabyDone(doneVal);
      }
      if (data.skd !== undefined) {
        const skdVal = Boolean(data.skd);
        skyStoryDoneRef.current = skdVal;
        setSkyStoryDone(skdVal);
      }
      if (data.skArr !== undefined) {
        const skArrVal = Boolean(data.skArr);
        skyArrivedRef.current = skArrVal;
        setSkyArrived(skArrVal);
      }
      if (data.vg) {
        visitedGlowdeepRef.current = true;
        setVisitedGlowdeep(true);
      }
      if (data.vm) {
        visitedMoonRoadRef.current = true;
        setVisitedMoonRoad(true);
      }
      if (Array.isArray(data.lore)) {
        loreEntriesRef.current = data.lore;
        setLoreEntries(data.lore);
        VERSES_OF_REVEILLE.forEach((v) => {
          v.unlocked = data.lore.some((l: LoreEntry) => l.id === `verse-${v.num}`);
        });
      }
      if (Array.isArray(data.ach)) {
        unlockedAchievementsRef.current = data.ach;
        setUnlockedAchievements(data.ach);
      }
      if (Array.isArray(data.mv)) {
        unlockedCutscenesRef.current = data.mv;
        setUnlockedCutscenes(data.mv);
      }
      if (data.ug && typeof data.ug === 'object') {
        upgradesRef.current = data.ug;
        setUpgrades(data.ug);
      }
      if (data.fs && typeof data.fs === 'object') {
        fishLogRef.current = data.fs;
        setFishLog(data.fs);
      }
      if (data.cottage && typeof data.cottage === 'object') {
        cottageStateRef.current = data.cottage;
        setCottageState(data.cottage);
      }
      if (Array.isArray(data.hamlet)) {
        const scaledHamlet =
          coordScale !== 1
            ? data.hamlet.map((r: HamletResident) => ({
                ...r,
                houseX: Math.round(r.houseX * coordScale),
                houseY: Math.round(r.houseY * coordScale),
              }))
            : data.hamlet;
        hamletResidentsRef.current = scaledHamlet;
        setHamletResidents(scaledHamlet);
      }
      if (data.townProsperity && typeof data.townProsperity === 'object') {
        townProsperityRef.current = data.townProsperity;
        setTownProsperity(data.townProsperity);
        W.towns.forEach((tw) => {
          if (typeof data.townProsperity[tw.n] === 'number') tw.prosperity = data.townProsperity[tw.n];
        });
      }
      if (Array.isArray(data.completedTownRequests)) {
        completedTownRequestsRef.current = data.completedTownRequests;
        setCompletedTownRequests(data.completedTownRequests);
      }
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
      setQuestRevision((r) => r + 1);
      if (Array.isArray(data.npcState)) {
        data.npcState.forEach((sn: { n: string; fr?: boolean; met?: boolean; h?: number[]; hist?: any[] }) => {
          const npc = W.npcs.find((item) => item.n === sn.n);
          if (!npc) return;
          if (sn.fr !== undefined) npc.fr = Boolean(sn.fr);
          if (sn.met !== undefined) npc.met = Boolean(sn.met);
          if (Array.isArray(sn.h)) {
            npc.h = npc.h.map((v, idx) => (sn.h && sn.h[idx] !== undefined ? sn.h[idx] : v));
          }
          if (Array.isArray(sn.hist)) npc.hist = sn.hist;
        });
      } else if (Array.isArray(data.fr)) {
        W.npcs.forEach((n) => {
          if (data.fr.includes(n.n)) {
            n.fr = true;
            n.met = true;
            n.h = n.h.map(() => 1);
          }
        });
      }

      if (Array.isArray(data.starsGotIdx)) {
        data.starsGotIdx.forEach((idx: number) => {
          if (W.stars[idx]) W.stars[idx].got = 1;
        });
      }
      if (Array.isArray(data.pearlsGotIdx)) {
        data.pearlsGotIdx.forEach((idx: number) => {
          if (W.pearls[idx]) W.pearls[idx].got = 1;
        });
      }
      if (Array.isArray(data.feathersGotIdx)) {
        data.feathersGotIdx.forEach((idx: number) => {
          if (W.feathers[idx]) W.feathers[idx].got = 1;
        });
      }
      if (Array.isArray(data.ringsGotIdx)) {
        data.ringsGotIdx.forEach((idx: number) => {
          if (W.rings[idx]) W.rings[idx].got = 1;
        });
      }
      if (Array.isArray(data.sporesGotIdx)) {
        data.sporesGotIdx.forEach((idx: number) => {
          if (W.glowSpores[idx]) W.glowSpores[idx].got = 1;
        });
      }
      if (Array.isArray(data.notesGotIdx)) {
        data.notesGotIdx.forEach((idx: number) => {
          if (W.moonNotes[idx]) W.moonNotes[idx].got = 1;
        });
      }
      if (Array.isArray(data.questItemsGotIdx)) {
        data.questItemsGotIdx.forEach((idx: number) => {
          if (W.questItems[idx]) W.questItems[idx].got = 1;
        });
      }
      if (Array.isArray(data.hollowsSoothedIds)) {
        W.hollows.forEach((h) => {
          if (data.hollowsSoothedIds.includes(h.id)) h.soothed = true;
        });
      }
      if (Array.isArray(data.echoIds)) {
        data.echoIds.forEach((id: string) => W.discoveredEchoIds.add(id));
        MEMORY_ECHOES.forEach((e) => { e.got = W.discoveredEchoIds.has(e.id); });
      }
      if (Array.isArray(data.diaryPages)) {
        data.diaryPages.forEach((pg: number) => W.discoveredDiaryPages.add(pg));
        MOON_DIARY_PAGES.forEach((p) => { p.found = W.discoveredDiaryPages.has(p.page); });
      }
      if (Array.isArray(data.harmonies)) {
        data.harmonies.forEach((hm: string) => triggeredHarmoniesRef.current.add(hm));
      }
      if (Array.isArray(data.shakenTiles)) {
        data.shakenTiles.forEach((tileIdx: number) => W.shakenTiles.add(tileIdx));
      }

      if (data.pl && typeof data.pl === 'object') {
        if (typeof data.pl.st === 'number') {
          W.player.st = data.pl.st;
          setStamina(Math.round(data.pl.st));
        }
        if (typeof data.pl.o2 === 'number') {
          W.player.o2 = data.pl.o2;
          setAir(Math.round(data.pl.o2));
        }
        if (typeof data.pl.mp === 'number') {
          W.player.mp = data.pl.mp;
          setMana(Math.round(data.pl.mp));
        }
      }

      if (data.pos && typeof data.pos.x === 'number' && typeof data.pos.y === 'number') {
        const sky = Boolean(data.pos.sky);
        const dive = Boolean(data.pos.dive);
        const glowdeep = Boolean(data.pos.glowdeep);
        const moonroad = Boolean(data.pos.moonroad);
        const house = Boolean(data.pos.house);
        let px = Math.max(T * 2, Math.min((N - 2) * T, data.pos.x * coordScale));
        let py = Math.max(T * 2, Math.min((N - 2) * T, data.pos.y * coordScale));

        if (coordScale !== 1 && !house) {
          const tx = Math.max(2, Math.min(N - 3, (px / T) | 0));
          const ty = Math.max(2, Math.min(N - 3, (py / T) | 0));
          if (!sky && !dive && !glowdeep && !moonroad && W.B[ty * N + tx] < 2) {
            let bestD = 1e9;
            let bestX = baseHomeSpawnRef.current.x;
            let bestY = baseHomeSpawnRef.current.y;
            for (let oy = -14; oy <= 14; oy++) {
              for (let ox = -14; ox <= 14; ox++) {
                const cx = tx + ox;
                const cy = ty + oy;
                if (cx < 2 || cy < 2 || cx >= N - 2 || cy >= N - 2) continue;
                const idx = cy * N + cx;
                if (W.B[idx] >= 2 && W.DK[idx] < 10) {
                  const d = ox * ox + oy * oy;
                  if (d < bestD) {
                    bestD = d;
                    bestX = cx * T + T / 2;
                    bestY = cy * T + T / 2;
                  }
                }
              }
            }
            px = bestX;
            py = bestY;
          } else if (dive && W.B[ty * N + tx] >= 2) {
            px = WORLD_ANCHORS.reef.driftwoodDiveLagoon.tx * T + T / 2;
            py = WORLD_ANCHORS.reef.driftwoodDiveLagoon.ty * T + T / 2;
          } else if (glowdeep && !isGlowdeepWalkable(tx, ty)) {
            px = GLOWDEEP_RETURN_TILE.x * T + T / 2;
            py = (GLOWDEEP_RETURN_TILE.y + 3) * T + T / 2;
          } else if (moonroad && !isMoonRoadWalkable(tx, ty)) {
            px = WORLD_ANCHORS.moonroad.teaHouse.tx * T + T / 2;
            py = (WORLD_ANCHORS.moonroad.teaHouse.ty + 2) * T + T / 2;
          }
        }
        W.player.x = px;
        W.player.y = py;
        W.player.sky = sky;
        W.player.dive = dive;
        W.player.glowdeep = glowdeep;
        W.player.moonroad = moonroad;
        W.player.house = house;
        W.companionPos.x = px - 26;
        W.companionPos.y = py + 4;
        setPlayerPos({
          x: px,
          y: py,
          sky,
          dive,
          swim: false,
          glowdeep,
          moonroad,
          house,
        });
        snapCamera();
      }
    },
    [resetGameStateToFresh, snapCamera]
  );
  applySaveSnapshotRef.current = applySaveSnapshotToState;

  // Save game state strictly to the currently selected slot
  const handleSaveGame = useCallback(
    (showNotification: boolean = true) => {
      const slot = currentSlotRef.current;
      const snapshot = serializeSaveSnapshot();
      try {
        writeSlotSaveRaw(slot, JSON.stringify(snapshot));
        setSaveSlotRevision((r) => r + 1);
        if (showNotification) showToast(`Game saved to Slot ${slot}! 💾`);
      } catch (e) {
        if (showNotification) showToast('Saving failed');
      }
    },
    [serializeSaveSnapshot, showToast]
  );
  saveGameFnRef.current = handleSaveGame;

  // Select Save Slot (isolates every slot cleanly and clears state for empty slots)
  const handleSelectSlot = useCallback(
    (slotNum: number) => {
      setCurrentSlot(slotNum);
      currentSlotRef.current = slotNum;
      try {
        localStorage.setItem(LOCAL_STORAGE_ACTIVE_SLOT_KEY, String(slotNum));
      } catch {}
      const saved = readSlotSaveRaw(slotNum);
      if (saved) {
        try {
          const data = JSON.parse(saved);
          applySaveSnapshotToState(data);
          showToast(`Loaded Slot ${slotNum}! ✨`);
          return;
        } catch (e) {}
      }
      resetGameStateToFresh({ resetAppearance: true });
      showToast(`Slot ${slotNum} is empty — ready for a fresh journey! 🌱`);
    },
    [applySaveSnapshotToState, resetGameStateToFresh, showToast]
  );

  // Erase a specific save slot cleanly
  const handleDeleteSlot = useCallback(
    (slotNum: number) => {
      try {
        eraseSlotSave(slotNum);
      } catch {}
      if (slotNum === currentSlotRef.current) {
        resetGameStateToFresh({ resetAppearance: true });
      }
      setSaveSlotRevision((r) => r + 1);
      showToast(`Cleared Slot ${slotNum} — ready for a fresh start! 🌱`);
    },
    [resetGameStateToFresh, showToast]
  );

  // Start a fresh adventure in the active slot
  const handleStartNewGame = useCallback(
    (preserveEmptySlotLook: boolean = false) => {
      const slot = currentSlotRef.current;
      try {
        eraseSlotSave(slot);
      } catch {}
      resetGameStateToFresh({ resetAppearance: !preserveEmptySlotLook });
      try {
        writeSlotSaveRaw(slot, JSON.stringify(serializeSaveSnapshot()));
      } catch {}
      setSaveSlotRevision((r) => r + 1);
      audio.init();
      snapCamera();
      setActiveModal('none');
      setGameState('playing');
      triggerCutscene('intro');
    },
    [resetGameStateToFresh, serializeSaveSnapshot, snapCamera, triggerCutscene]
  );

  // Carry Over from Mochi Meadows 1 into a fresh active slot
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

    const slot = currentSlotRef.current;
    try {
      eraseSlotSave(slot);
    } catch {}
    resetGameStateToFresh({ resetAppearance: true });

    // Grant exclusive First-Dream Scarf, Golden Note, and 100 Island Coins cleanly on top of fresh state
    coinsRef.current = 100;
    totalCoinsRef.current = 100;
    setCoins(100);
    setTotalCoins(100);
    const carryUpgrades = { firstDreamScarf: 1, goldenNote: 1 };
    upgradesRef.current = carryUpgrades;
    setUpgrades(carryUpgrades);
    if (legacyData?.L) {
      const carryLook = { ...createDefaultPlayerLook(), ...legacyData.L, hat: 'crown' };
      playerLookRef.current = carryLook;
      setPlayerLook(carryLook);
    }
    try {
      writeSlotSaveRaw(slot, JSON.stringify(serializeSaveSnapshot()));
    } catch {}
    setSaveSlotRevision((r) => r + 1);
    audio.chime();
    showToast(`🌸 MM1 Carry-Over Blessing saved to Slot ${slot}! First-Dream Scarf & 100 coins!`);
    snapCamera();
    setGameState('playing');
  };

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

  // Keep game canvas backing resolution crisp and aligned with CSS viewport (debounced against mobile URL-bar jitter)
  useEffect(() => {
    let resizeTimer: number | null = null;
    let lastTouchW = -1;
    let lastTouchH = -1;

    const applyResize = (force = false) => {
      const dev = deviceRef.current;
      const lowQ = Boolean(settingsRef.current.low);
      const canvas = canvasRef.current;
      if (canvas) {
        const cw = Math.max(1, canvas.parentElement?.clientWidth || window.innerWidth);
        const ch = Math.max(1, canvas.parentElement?.clientHeight || window.innerHeight);
        if (
          !force &&
          dev.isTouch &&
          lastTouchW > 0 &&
          Math.abs(cw - lastTouchW) <= 2 &&
          Math.abs(ch - lastTouchH) < 56
        ) {
          return;
        }
        lastTouchW = cw;
        lastTouchH = ch;
        const r3d = renderer3DRef.current;
        const dpr = computeViewportDpr(
          cw,
          ch,
          dev.pixelRatio || 1,
          dev.isPhone,
          dev.isTablet,
          lowQ,
          Boolean(r3d?.isSoftwareGl)
        );
        const bw = Math.max(1, Math.round(cw * dpr));
        const bh = Math.max(1, Math.round(ch * dpr));
        if (canvas.width !== bw) canvas.width = bw;
        if (canvas.height !== bh) canvas.height = bh;
      }
      const r3d = renderer3DRef.current;
      if (r3d) {
        const mw = Math.max(1, threeMountRef.current?.clientWidth || window.innerWidth);
        const mh = Math.max(1, threeMountRef.current?.clientHeight || window.innerHeight);
        const dpr = computeViewportDpr(
          mw,
          mh,
          dev.pixelRatio || 1,
          dev.isPhone,
          dev.isTablet,
          lowQ,
          r3d.isSoftwareGl
        );
        r3d.resize(mw, mh, dpr);
      }
    };

    const onWindowResize = () => {
      if (resizeTimer !== null) window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(() => {
        resizeTimer = null;
        applyResize(false);
      }, 140);
    };
    const onOrientation = () => {
      if (resizeTimer !== null) window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(() => {
        resizeTimer = null;
        applyResize(true);
      }, 60);
    };

    applyResize(true);
    window.addEventListener('resize', onWindowResize, { passive: true });
    window.addEventListener('orientationchange', onOrientation, { passive: true });
    return () => {
      if (resizeTimer !== null) window.clearTimeout(resizeTimer);
      window.removeEventListener('resize', onWindowResize);
      window.removeEventListener('orientationchange', onOrientation);
    };
  }, [device.width, device.height, device.orientation, device.pixelRatio, settings.low, webglReady]);

  // Main Canvas Game Loop (mounted once with live refs — zero loop teardowns on state changes)
  useEffect(() => {
    let animId: number;
    let lastTime = performance.now();
    let lastLoopWorkMs = 0;
    let emaWorkMs = 12;
    let slowFrameStreak = 0;
    let fastFrameStreak = 0;
    let adaptiveLowQ = false;
    let lastAudioEnvSyncMs = 0;
    let lastAudioEnvKey = '';
    const projOut = { x: 0, y: 0, visible: false };
    const playerProjOut = { x: 0, y: 0, visible: false };

    const loop = (now: number) => {
      if (document.hidden) {
        lastTime = now;
        lastLoopWorkMs = 0;
        slowFrameStreak = 0;
        fastFrameStreak = 0;
        animId = requestAnimationFrame(loop);
        return;
      }

      const W = worldRef.current;
      const liveSettings = settingsRef.current;
      const liveSeason = currentSeasonRef.current;
      W.season = liveSeason;
      const liveDevice = deviceRef.current;
      const isPhone = liveDevice.isPhone;
      const isTablet = liveDevice.isTablet;
      const r3d = renderer3DRef.current;

      // Render live orbiting 3D Great Lantern Tree & Mochi diorama behind TitleScreen
      if (gameStateRef.current !== 'playing') {
        const dtTitle = Math.max(0, Math.min(0.05, (now - lastTime) / 1000));
        lastTime = now;
        const cutsceneOpen = activeCutsceneRef.current !== null;
        const modalOpen = activeModalRef.current !== 'none';
        if (!cutsceneOpen && !modalOpen && r3d && !r3d.isContextLost()) {
          W.time += dtTitle;
          const wSys = weatherRef.current;
          let sync = syncState3DRef.current;
          if (!sync) {
            sync = {
              B: W.B,
              DK: W.DK,
              UD: W.UD,
              TW: W.TW,
              SB: W.SB,
              SD: W.SD,
              stars: W.stars,
              pearls: W.pearls,
              feathers: W.feathers,
              rings: W.rings,
              glowSpores: W.glowSpores,
              moonNotes: W.moonNotes,
              questItems: W.questItems,
              fish: W.fish,
              towns: W.towns,
              npcs: W.npcs,
              hollows: W.hollows,
              blooms: W.blooms,
              magicRings: W.magicRings,
              particles: W.particles,
              iceMap: W.iceMap,
              lilyMap: W.lilyMap,
              hotSprings: W.hotSprings,
              dkRevision: W.dkRevision,
              echoTargets3D: W.echoTargets3D,
              glowdeepPortal: W.glowdeepPortal,
              moonGatePortal: W.moonGatePortal,
              playerHomePortal: W.playerHomePortal,
              dashGhosts: W.dashGhosts,
              player: W.player,
              companionPos: W.companionPos,
              playerLook: playerLookRef.current,
              companionId: playerLookRef.current.companion ?? 'gloom',
              time: W.time,
              season: liveSeason,
              weatherId: wSys.currentWeather.id,
              weatherParticleType: wSys.currentWeather.particleType,
              nightCycleEnabled: Boolean(liveSettings.night),
              lullabyDone: lullabyDoneRef.current,
              fireplaceLit: cottageStateRef.current.fireplaceLit !== false,
              nearestNpc: null,
              activeSpellTimers: {
                frostShieldTimer: 0,
                hugTimer: 0,
                starSenseTimer: 0,
                dawnTimer: 0,
                warmthTimer: 0,
                dreamwalkTimer: 0,
                tideTimer: 0,
                moonPullTimer: 0,
                echoTimer: 0,
                frostGlowTimer: 0,
                thermalGlideTimer: 0,
                echoMagnetTimer: 0,
              },
              lowQuality: Boolean(liveSettings.low) || isPhone,
              isTitleMode: true,
              cameraYaw: 0,
              cameraPitch: 0,
              cameraZoom: 1,
              cameraPreset: CAMERA_PRESETS_3D[liveSettings.camPreset ?? 0] ?? 'cozy',
            };
            syncState3DRef.current = sync;
          } else {
            sync.B = W.B;
            sync.DK = W.DK;
            sync.UD = W.UD;
            sync.TW = W.TW;
            sync.SB = W.SB;
            sync.SD = W.SD;
            sync.stars = W.stars;
            sync.pearls = W.pearls;
            sync.feathers = W.feathers;
            sync.rings = W.rings;
            sync.glowSpores = W.glowSpores;
            sync.moonNotes = W.moonNotes;
            sync.questItems = W.questItems;
            sync.fish = W.fish;
            sync.towns = W.towns;
            sync.npcs = W.npcs;
            sync.hollows = W.hollows;
            sync.blooms = W.blooms;
            sync.magicRings = W.magicRings;
            sync.particles = W.particles;
            sync.iceMap = W.iceMap;
            sync.lilyMap = W.lilyMap;
            sync.hotSprings = W.hotSprings;
            sync.dkRevision = W.dkRevision;
            sync.echoTargets3D = W.echoTargets3D;
            sync.glowdeepPortal = W.glowdeepPortal;
            sync.moonGatePortal = W.moonGatePortal;
            sync.playerHomePortal = W.playerHomePortal;
            sync.dashGhosts = W.dashGhosts;
            sync.player = W.player;
            sync.companionPos = W.companionPos;
            sync.playerLook = playerLookRef.current;
            sync.companionId = playerLookRef.current.companion ?? 'gloom';
            sync.time = W.time;
            sync.season = liveSeason;
            sync.weatherId = wSys.currentWeather.id;
            sync.weatherParticleType = wSys.currentWeather.particleType;
            sync.nightCycleEnabled = Boolean(liveSettings.night);
            sync.lullabyDone = lullabyDoneRef.current;
            sync.fireplaceLit = cottageStateRef.current.fireplaceLit !== false;
            sync.nearestNpc = null;
            sync.activeSpellTimers.frostShieldTimer = 0;
            sync.activeSpellTimers.hugTimer = 0;
            sync.activeSpellTimers.starSenseTimer = 0;
            sync.activeSpellTimers.dawnTimer = 0;
            sync.activeSpellTimers.warmthTimer = 0;
            sync.activeSpellTimers.dreamwalkTimer = 0;
            sync.activeSpellTimers.tideTimer = 0;
            sync.activeSpellTimers.moonPullTimer = 0;
            sync.activeSpellTimers.echoTimer = 0;
            sync.activeSpellTimers.frostGlowTimer = 0;
            sync.activeSpellTimers.thermalGlideTimer = 0;
            sync.activeSpellTimers.echoMagnetTimer = 0;
            sync.lowQuality = Boolean(liveSettings.low) || isPhone;
            sync.isTitleMode = true;
            sync.cameraYaw = 0;
            sync.cameraPitch = 0;
            sync.cameraZoom = 1;
            sync.cameraPreset = CAMERA_PRESETS_3D[liveSettings.camPreset ?? 0] ?? 'cozy';
          }
          r3d.render(sync, dtTitle);
        }
        animId = requestAnimationFrame(loop);
        return;
      }

      const frameWorkStart = performance.now();
      const rawFrameMs = now - lastTime;
      const dt = Math.max(0, Math.min(0.05, rawFrameMs / 1000));
      lastTime = now;
      const liveUpgrades = upgradesRef.current;
      const lowQ = Boolean(liveSettings.low);

      // Stable adaptive quality (high hysteresis to avoid prop rebuild thrashing; never drops HUD/nameplates)
      if (!isPhone && !liveDevice.isLowEnd && lastLoopWorkMs > 0) {
        emaWorkMs = emaWorkMs * 0.9 + Math.min(80, lastLoopWorkMs) * 0.1;
        if (lastLoopWorkMs > 42) {
          slowFrameStreak++;
          fastFrameStreak = 0;
          if (slowFrameStreak >= 18) adaptiveLowQ = true;
        } else {
          slowFrameStreak = 0;
          if (emaWorkMs < 16) {
            fastFrameStreak++;
            if (fastFrameStreak >= 300) adaptiveLowQ = false;
          }
        }
      }

      const dropNonEssentialUi = false;
      const effLowQ = lowQ || isPhone || liveDevice.isLowEnd || adaptiveLowQ;
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

      // Update NPC Weather Behavior strictly for NPCs on the player's current layer with terrain walkability guard
      const activeWorldLayer = W.player.house ? undefined : getPlayerLayer(W.player);
      const canNpcWalk = (nx: number, ny: number, npc: NPC) => {
        const tx = Math.floor(nx / T);
        const ty = Math.floor(ny / T);
        if (tx < 1 || ty < 1 || tx >= N - 1 || ty >= N - 1) return false;
        const lyr = getNpcLayer(npc);
        if (lyr === 3) return isGlowdeepWalkable(tx, ty);
        if (lyr === 4) return isMoonRoadWalkable(tx, ty);
        if (lyr === 2) {
          const idx = ty * N + tx;
          return W.SB[idx] > 0 && W.SD[idx] === 0;
        }
        if (lyr === 1) {
          const idx = ty * N + tx;
          return W.B[idx] <= 1 && W.UD[idx] !== 5 && W.UD[idx] !== 6;
        }
        const idx = ty * N + tx;
        return W.B[idx] >= 2 && !isSurfaceSolidDk(W.DK[idx]);
      };
      updateNPCWeatherBehavior(W.npcs, weatherRef.current.currentWeather.id, W.time, dt, activeWorldLayer, W.towns, canNpcWalk);

      // Update audio biome, weather/season crossfade & HUD realm location (diff-guarded)
      const tileX = (W.player.x / T) | 0;
      const tileY = (W.player.y / T) | 0;
      let curB = 3;
      let audioBiome = 3;
      if (W.player.house) {
        audioBiome = 3;
        audio.setBiome(3);
        const roomId = getHouseRoomAt(W.player.x, W.player.y);
        const roomLabel =
          roomId === 'living'
            ? '🏡 Living Room'
            : roomId === 'kitchen'
            ? '🍳 Kitchen & Tea Bar'
            : roomId === 'bedroom'
            ? '🛏️ Bedroom'
            : roomId === 'study'
            ? '📚 Study & Studio'
            : roomId === 'conservatory'
            ? '🌿 Sunroom Conservatory'
            : '🛁 Bath & Reef Spa';
        if (hudSyncRef.current.biome !== roomLabel) {
          hudSyncRef.current.biome = roomLabel;
          setCurrentBiomeName(roomLabel);
        }
      } else if (tileX >= 0 && tileY >= 0 && tileX < N && tileY < N) {
        curB = W.B[tileY * N + tileX];
        let nextBiome: string;
        if (W.player.glowdeep) {
          audioBiome = 22;
          audio.setBiome(22);
          nextBiome = 'Glowdeep Caverns';
        } else if (W.player.moonroad) {
          audioBiome = 23;
          audio.setBiome(23);
          nextBiome = 'The Moon Road';
        } else if (W.player.dive) {
          audioBiome = 24;
          audio.setBiome(24);
          nextBiome = 'Undersea Reef';
        } else if (W.player.sky) {
          audioBiome = 21;
          audio.setBiome(21);
          nextBiome = 'Cirrus Sky Kingdom';
        } else {
          audioBiome = curB;
          audio.setBiome(curB);
          nextBiome = BIOME_NAMES[curB] || 'Sunny Meadow';
        }
        if (hudSyncRef.current.biome !== nextBiome) {
          hudSyncRef.current.biome = nextBiome;
          setCurrentBiomeName(nextBiome);
        }
      }
      const wSysLoop = weatherRef.current;
      const envKey = `${wSysLoop.currentWeather.id}|${
        wSysLoop.isTransitioning ? wSysLoop.targetWeather.id : wSysLoop.currentWeather.id
      }|${audioBiome}|${liveSeason}`;
      if (envKey !== lastAudioEnvKey || (wSysLoop.isTransitioning && now - lastAudioEnvSyncMs >= 220)) {
        lastAudioEnvKey = envKey;
        lastAudioEnvSyncMs = now;
        audio.setEnvironment({
          weatherId: wSysLoop.currentWeather.id,
          targetWeatherId: wSysLoop.isTransitioning ? wSysLoop.targetWeather.id : wSysLoop.currentWeather.id,
          transitionProgress: wSysLoop.isTransitioning ? wSysLoop.transitionProgress : 0,
          biomeId: audioBiome,
          seasonId: liveSeason,
        });
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

        // Rotate manual directional input by active 3D camera yaw so WASD/joystick always align with screen
        const activeCamPreset = r3d ? CAMERA_PRESETS_3D[liveSettings.camPreset ?? 0] ?? 'cozy' : 'cozy';
        const effectiveYaw =
          camera3DStateRef.current.yaw + (activeCamPreset === 'third_backward' ? Math.PI : 0);
        if (r3d && effectiveYaw !== 0 && (ix !== 0 || iy !== 0)) {
          const cosY = Math.cos(effectiveYaw);
          const sinY = Math.sin(effectiveYaw);
          const rx = ix * cosY + iy * sinY;
          const ry = -ix * sinY + iy * cosY;
          ix = rx;
          iy = ry;
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
      } else if (r3d && !isControlLocked && (CAMERA_PRESETS_3D[liveSettings.camPreset ?? 0] ?? 'cozy') === 'first_person') {
        const lookDx = -Math.sin(camera3DStateRef.current.yaw);
        const lookDy = -Math.cos(camera3DStateRef.current.yaw);
        W.player.dx = lookDx;
        W.player.dy = lookDy;
        if (Math.abs(lookDx) > 0.15) W.player.face = lookDx > 0 ? 1 : -1;
      }

      const curTileIdx = tileY * N + tileX;
      const isSurface = !W.player.house && !W.player.sky && !W.player.dive && !W.player.glowdeep && !W.player.moonroad;
      const onFrozenIce = isSurface && W.iceMap.has(curTileIdx) && W.iceMap.get(curTileIdx)! > W.time;
      const onLilyPad = isSurface && W.lilyMap.has(curTileIdx) && W.lilyMap.get(curTileIdx)! > W.time;
      const inGlowCanal = W.player.glowdeep && tileX >= 0 && tileY >= 0 && tileX < N && tileY < N && getGlowdeepCell(tileX, tileY) === 'canal';
      const isSwimming = Boolean((isSurface && curB < 2 && !onFrozenIce && !onLilyPad) || inGlowCanal);

      // Prune expired ice tiles, lily path pads, and hot springs so 3D props & collisions stay exact
      if (W.iceMap.size > 0) {
        for (const [k, exp] of W.iceMap) {
          if (exp <= W.time) W.iceMap.delete(k);
        }
      }
      if (W.lilyMap.size > 0) {
        for (const [k, exp] of W.lilyMap) {
          if (exp <= W.time) W.lilyMap.delete(k);
        }
      }
      if (W.hotSprings.length > 0) {
        for (let hi = W.hotSprings.length - 1; hi >= 0; hi--) {
          if (W.hotSprings[hi].expires <= W.time) W.hotSprings.splice(hi, 1);
        }
      }

      // Water Entry Splash & Exit Hop (pooled)
      if (isSwimming && !W.player.wasSwimming && W.player.z <= 14) {
        spawnMagicRing(W.magicRings, { x: W.player.x, y: W.player.y + 4, m: 0.62, r: 52, c: '#a8f0ff' });
        for (let sp = 0; sp < 8; sp++) {
          const sa = (sp / 8) * Math.PI * 2;
          spawnPooledParticle(W.particles, {
            x: W.player.x,
            y: W.player.y + 4,
            vx: Math.cos(sa) * 52,
            vy: Math.sin(sa) * 38,
            z: 4,
            vz: 72,
            az: -220,
            drag: 1.4,
            size: 0.85,
            shape: 'orb',
            l: 0.42,
            maxL: 0.42,
            c: sp % 2 === 0 ? '#ffffff' : '#8fd5ff',
          });
        }
        audio.pop();
      } else if (!isSwimming && W.player.wasSwimming && !W.player.sky && !W.player.dive) {
        W.player.vz = Math.max(W.player.vz, 75);
        spawnMagicRing(W.magicRings, { x: W.player.x, y: W.player.y + 6, m: 0.45, r: 30, c: '#b8f2ff' });
      }
      W.player.wasSwimming = isSwimming;
      W.player.swim = isSwimming;

      const isRunning = (W.keys.has('shift') || touchSprint) && len > 0 && W.player.st > 0 && !W.player.dive;
      W.player.isSprinting = isRunning;

      let baseSpeed = 158 * (liveUpgrades.boots ? 1.14 : 1);
      if (isSwimming) {
        baseSpeed = (curB === 0 ? 108 : 128) * (liveUpgrades.boots ? 1.12 : 1);
      } else if (onLilyPad) {
        baseSpeed *= 1.12;
      }
      if (W.player.dive) baseSpeed = 130;
      if (W.player.sky) baseSpeed = 198;

      // Surface Dunes / Frostbite Tundra terrain feel (Cozy Scarf grants smooth traction boost)
      if (isSurface && (curB === 6 || curB === 7)) {
        baseSpeed *= liveUpgrades.cozy_scarf ? 1.04 : 0.94;
      }

      // Active Weather gameplay modifiers (speed, stamina cost/regen & mana regen)
      const weatherCfg = weatherRef.current.currentWeather;
      const weatherMods = weatherCfg.modifiers;
      const weatherSpeedMult =
        weatherCfg.id === 'snowy' && liveUpgrades.cozy_scarf
          ? Math.max(1, weatherMods.speedMultiplier)
          : weatherMods.speedMultiplier;
      baseSpeed *= weatherSpeedMult;

      // Active spell speed boosts, trails & buffs
      if (W.starSenseTimer > 0) W.starSenseTimer = Math.max(0, W.starSenseTimer - dt);
      if (W.frostGlowTimer > 0) W.frostGlowTimer = Math.max(0, W.frostGlowTimer - dt);
      if (W.thermalGlideTimer > 0) {
        W.thermalGlideTimer = Math.max(0, W.thermalGlideTimer - dt);
        if (W.player.sky) {
          baseSpeed *= 1.22;
          W.player.st = Math.min(100, W.player.st + 24 * dt);
          if (Math.random() < 0.45 && W.particles.length < 185) {
            spawnPooledParticle(W.particles, {
              x: W.player.x + (Math.random() - 0.5) * 18,
              y: W.player.y + 4,
              vx: -ix * 28 + (Math.random() - 0.5) * 20,
              vy: -iy * 28 - 10,
              z: 10,
              vz: 38,
              az: -15,
              size: 0.95,
              shape: 'spark',
              l: 0.68,
              c: Math.random() > 0.4 ? '#ff9642' : '#ffe073',
            });
          }
        }
      }
      if (W.tideTimer > 0) {
        W.tideTimer = Math.max(0, W.tideTimer - dt);
        baseSpeed *= 1.35;
      }
      if (W.dreamwalkTimer > 0) {
        W.dreamwalkTimer = Math.max(0, W.dreamwalkTimer - dt);
        baseSpeed *= 1.32;
        if (len > 0 && Math.random() < 0.35 && W.particles.length < 180) {
          const dwVar = getSeasonalSpellVariant('dreamwalk', currentSeasonRef.current);
          spawnPooledParticle(W.particles, {
            x: W.player.x + (Math.random() - 0.5) * 14,
            y: W.player.y + (Math.random() - 0.5) * 10,
            vx: -ix * 25,
            vy: -iy * 25 - 10,
            shape: 'crystal',
            l: 0.65,
            c: dwVar ? (Math.random() > 0.5 ? dwVar.orbiterColor : dwVar.orbiterAccent) : '#b48cff',
          });
        }
      }
      if (W.warmthTimer > 0) {
        W.warmthTimer = Math.max(0, W.warmthTimer - dt);
        baseSpeed *= 1.2;
        if (len > 0 && Math.random() < 0.3 && W.particles.length < 180) {
          const ewVar = getSeasonalSpellVariant('ember_warmth', currentSeasonRef.current);
          spawnPooledParticle(W.particles, {
            x: W.player.x + (Math.random() - 0.5) * 12,
            y: W.player.y + 8,
            vx: -ix * 20,
            vy: -14 - Math.random() * 14,
            shape: 'spark',
            l: 0.5,
            c: ewVar ? (Math.random() > 0.5 ? ewVar.orbiterColor : ewVar.orbiterAccent) : '#ff7b47',
          });
        }
      }
      if (W.frostShieldTimer > 0) {
        W.frostShieldTimer = Math.max(0, W.frostShieldTimer - dt);
        baseSpeed *= 1.15;
        if (len > 0 && Math.random() < 0.25 && W.particles.length < 180) {
          const fbVar = getSeasonalSpellVariant('frost_bridge', currentSeasonRef.current);
          spawnPooledParticle(W.particles, {
            x: W.player.x + (Math.random() - 0.5) * 16,
            y: W.player.y + 6,
            vx: -ix * 18,
            vy: -10,
            shape: 'crystal',
            l: 0.55,
            c: fbVar?.orbiterColor || '#b8f2ff',
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
        W.player.mp = Math.min(100, W.player.mp + 8 * dt);
        W.player.st = Math.min(100, W.player.st + 14 * dt);
        if (Math.random() < 0.08 && W.particles.length < 180) {
          spawnPooledParticle(W.particles, {
            x: W.player.x + (Math.random() - 0.5) * 24,
            y: W.player.y - 8,
            vx: (Math.random() - 0.5) * 14,
            vy: -24,
            shape: 'heart',
            l: 0.75,
            c: '#ff9ebb',
          });
        }
      }
      if (W.echoTimer > 0) W.echoTimer = Math.max(0, W.echoTimer - dt);
      if (W.dawnTimer > 0) {
        W.dawnTimer = Math.max(0, W.dawnTimer - dt);
        baseSpeed *= 1.25;
      }
      // Active Hot Springs rapidly rejuvenate Stamina & Oxygen + emit cozy steam puffs
      if (W.hotSprings.length > 0) {
        for (let hi = 0; hi < W.hotSprings.length; hi++) {
          const hs = W.hotSprings[hi];
          if (Math.random() < 0.25 && W.particles.length < 185) {
            spawnPooledParticle(W.particles, {
              x: hs.x + (Math.random() - 0.5) * 56,
              y: hs.y + (Math.random() - 0.5) * 40,
              vx: (Math.random() - 0.5) * 12,
              vy: -22 - Math.random() * 14,
              z: 4,
              vz: 35,
              az: -5,
              l: 0.9,
              c: Math.random() > 0.35 ? '#d8fff8' : '#ffb878',
            });
          }
          if (Math.hypot(W.player.x - hs.x, W.player.y - hs.y) <= 125) {
            W.player.st = Math.min(100, W.player.st + 45 * dt);
            W.player.o2 = Math.min(100, W.player.o2 + 50 * dt);
            W.player.mp = Math.min(100, W.player.mp + 16 * dt);
          }
        }
      }
      if (W.marketSpeedTimer > 0) {
        W.marketSpeedTimer = Math.max(0, W.marketSpeedTimer - dt);
        baseSpeed *= 1.22;
      }
      if (W.marketWarmthTimer > 0) {
        W.marketWarmthTimer = Math.max(0, W.marketWarmthTimer - dt);
        baseSpeed *= 1.08;
        W.player.st = Math.min(100, W.player.st + 6 * dt);
      }
      if (W.marketDiveTimer > 0) W.marketDiveTimer = Math.max(0, W.marketDiveTimer - dt);
      if (W.marketLuckTimer > 0) W.marketLuckTimer = Math.max(0, W.marketLuckTimer - dt);

      if (onFrozenIce) {
        baseSpeed *= 1.45;
      }

      if (isRunning) {
        baseSpeed *= isSwimming ? 1.58 : 1.72;
        W.player.st = Math.max(0, W.player.st - (isSwimming ? 26 : 34) * weatherMods.staminaDrainMultiplier * dt);
      } else {
        const lanternStamBonus = liveUpgrades.lantern_charm ? 4.5 : 0;
        W.player.st = Math.min(100, W.player.st + (24 * weatherMods.staminaRegenMultiplier + lanternStamBonus) * dt);
      }

      if (W.player.cd > 0) W.player.cd -= dt;

      if (W.player.dash > 0) {
        const prevDashBucket = Math.floor(W.player.dash * 24);
        W.player.dash -= dt;
        if (W.player.dash > 0 && Math.floor(W.player.dash * 24) !== prevDashBucket) {
          W.dashGhosts.push({ x: W.player.x, y: W.player.y, face: W.player.face, alpha: 0.42 });
          if (W.dashGhosts.length > 8) W.dashGhosts.shift();
        }
        baseSpeed = isSwimming ? 360 : 510;
        ix = W.player.dx;
        iy = W.player.dy;
      }

      // Smooth velocity acceleration / deceleration curve (buoyant momentum while swimming!)
      const desiredVx = len > 0 || W.player.dash > 0 ? ix * baseSpeed : 0;
      const desiredVy = len > 0 || W.player.dash > 0 ? iy * baseSpeed : 0;
      const accelRate = W.player.dash > 0 ? 32 : isSwimming ? (len > 0 ? 9.0 : 6.2) : len > 0 ? 18 : 15;
      const blend = Math.min(1, accelRate * dt);
      W.player.vx += (desiredVx - W.player.vx) * blend;
      W.player.vy += (desiredVy - W.player.vy) * blend;

      // Solid obstacle collision with clean wall-sliding (Jumping clears boulders dk === 6!)
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
        if (dk === 6 && W.player.z >= 13) return false;
        return isSurfaceSolidDk(dk);
      };

      const isPosBlocked = (px: number, py: number) => {
        if (W.player.house) {
          return W.dreamwalkTimer > 0 ? false : isHouseInteriorBlocked(px, py);
        }
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

      // Gently push player to nearest unblocked offset if trapped on a solid edge instead of walking through walls
      if (W.dreamwalkTimer <= 0 && isPosBlocked(W.player.x, W.player.y)) {
        const pushDirs: [number, number][] = [
          [1, 0], [-1, 0], [0, 1], [0, -1],
          [1, 1], [-1, 1], [1, -1], [-1, -1],
        ];
        outerPush: for (let distPx = 4; distPx <= 28; distPx += 6) {
          for (const [pdx, pdy] of pushDirs) {
            const cx = Math.max(T, Math.min((N - 1) * T, W.player.x + pdx * distPx));
            const cy = Math.max(T, Math.min((N - 1) * T, W.player.y + pdy * distPx));
            if (!isPosBlocked(cx, cy)) {
              W.player.x = cx;
              W.player.y = cy;
              break outerPush;
            }
          }
        }
      }

      const preMoveX = W.player.x;
      const preMoveY = W.player.y;
      const stepX = Math.max(T, Math.min((N - 1) * T, W.player.x + W.player.vx * dt));
      const stepY = Math.max(T, Math.min((N - 1) * T, W.player.y + W.player.vy * dt));
      const stillBlocked = W.dreamwalkTimer <= 0 && isPosBlocked(W.player.x, W.player.y);

      if (!stillBlocked && !isPosBlocked(stepX, W.player.y)) {
        W.player.x = stepX;
      } else {
        // Tangent nudge: slide smoothly around single trees/rocks/boulders when hitting slightly off-center
        let nudgedX = false;
        if (!stillBlocked && Math.abs(stepX - W.player.x) > 0.05 && Math.abs(W.player.vy) < 45) {
          for (const offset of [6, -6, 12, -12]) {
            const tryY = Math.max(T, Math.min((N - 1) * T, W.player.y + offset));
            if (!isPosBlocked(stepX, tryY)) {
              W.player.x = stepX;
              W.player.y = W.player.y + Math.sign(offset) * Math.min(Math.abs(offset), Math.abs(W.player.vx * dt) * 0.85);
              nudgedX = true;
              break;
            }
          }
        }
        if (!nudgedX) W.player.vx = 0;
      }

      if (!stillBlocked && !isPosBlocked(W.player.x, stepY)) {
        W.player.y = stepY;
      } else {
        let nudgedY = false;
        if (!stillBlocked && Math.abs(stepY - W.player.y) > 0.05 && Math.abs(W.player.vx) < 45) {
          for (const offset of [6, -6, 12, -12]) {
            const tryX = Math.max(T, Math.min((N - 1) * T, W.player.x + offset));
            if (!isPosBlocked(tryX, stepY)) {
              W.player.y = stepY;
              W.player.x = W.player.x + Math.sign(offset) * Math.min(Math.abs(offset), Math.abs(W.player.vy * dt) * 0.85);
              nudgedY = true;
              break;
            }
          }
        }
        if (!nudgedY) W.player.vy = 0;
      }

      // Tolerate brief corner slides during tap-to-move; cancel only if stalled > 0.35s
      if (W.player.moveTarget) {
        const movedDist = Math.hypot(W.player.x - preMoveX, W.player.y - preMoveY);
        if (movedDist < Math.max(0.25, 16 * dt)) {
          moveTargetStallRef.current.timer += dt;
          if (moveTargetStallRef.current.timer > 0.35) {
            W.player.moveTarget = null;
            moveTargetStallRef.current.timer = 0;
          }
        } else {
          moveTargetStallRef.current.timer = 0;
        }
      } else {
        moveTargetStallRef.current.timer = 0;
      }

      // Vertical Jump & Boulder-Perch Physics
      const postTileX = (W.player.x / T) | 0;
      const postTileY = (W.player.y / T) | 0;
      const postDk = isSurface && postTileX >= 0 && postTileY >= 0 && postTileX < N && postTileY < N
        ? W.DK[postTileY * N + postTileX]
        : 0;
      const groundFloorZ = postDk === 6 && !isSwimming ? 15 : 0;
      W.player.coyoteTimer = Math.max(0, W.player.coyoteTimer - dt);

      if (W.player.z > groundFloorZ || W.player.vz > 0) {
        const prevZ = W.player.z;
        const gravity = W.player.sky ? 520 : isSwimming && W.player.vz < 0 ? 640 : 740;
        W.player.vz -= gravity * dt;
        W.player.z += W.player.vz * dt;
        if (W.player.z <= groundFloorZ) {
          W.player.z = groundFloorZ;
          W.player.vz = 0;
          W.player.jumpCount = 0;
          if (prevZ > groundFloorZ + 8) {
            if (isSwimming) {
              spawnMagicRing(W.magicRings, { x: W.player.x, y: W.player.y + 4, m: 0.62, r: 56, c: '#a8f0ff' });
              for (let sp = 0; sp < 8; sp++) {
                const sa = (sp / 8) * Math.PI * 2;
                spawnPooledParticle(W.particles, {
                  x: W.player.x,
                  y: W.player.y + 4,
                  vx: Math.cos(sa) * 58,
                  vy: Math.sin(sa) * 44,
                  z: 6,
                  vz: 68,
                  az: -220,
                  drag: 1.4,
                  size: 0.9,
                  shape: 'orb',
                  l: 0.44,
                  maxL: 0.44,
                  c: sp % 2 === 0 ? '#ffffff' : '#8fd5ff',
                });
              }
              audio.pop();
            } else {
              spawnMagicRing(W.magicRings, { x: W.player.x, y: W.player.y + 6, m: 0.38, r: 24, c: 'rgba(255, 255, 255, 0.68)' });
              if (W.particles.length < 176) {
                const landColor = W.player.glowdeep
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
                for (let lp = 0; lp < 5; lp++) {
                  const la = (lp / 5) * Math.PI * 2 + Math.random() * 0.4;
                  const spd = 28 + Math.random() * 20;
                  spawnPooledParticle(W.particles, {
                    x: W.player.x + Math.cos(la) * 4,
                    y: W.player.y + 5 + Math.sin(la) * 4,
                    vx: Math.cos(la) * spd,
                    vy: Math.sin(la) * spd,
                    z: 2,
                    vz: 42 + Math.random() * 24,
                    az: -155,
                    drag: 1.8,
                    size: 0.72 + Math.random() * 0.25,
                    shape: 'orb',
                    l: 0.42,
                    maxL: 0.42,
                    c: landColor,
                  });
                }
              }
            }
          }
        }
      } else {
        W.player.z = groundFloorZ;
        W.player.vz = 0;
        W.player.jumpCount = 0;
        W.player.coyoteTimer = 0.12;
      }

      const actualSpeed = Math.hypot(W.player.vx, W.player.vy);
      W.player.isMoving = actualSpeed > 18;

      // Biome-reactive footsteps, swim wakes & water ripples (paused while airborne)
      if (W.player.isMoving && !W.player.sky && W.player.z <= 3 && !isControlLocked) {
        W.footstepTimer -= dt * (isRunning ? 1.6 : 1);
        if (W.footstepTimer <= 0) {
          W.footstepTimer = isSwimming ? (isRunning ? 0.14 : 0.24) : W.player.dive ? 0.28 : 0.22;
          if (isSwimming) {
            spawnMagicRing(W.magicRings, {
              x: W.player.x,
              y: W.player.y + 6,
              m: isRunning ? 0.56 : 0.48,
              r: isRunning ? 28 : 20,
              c: isRunning ? 'rgba(235, 252, 255, 0.88)' : 'rgba(205, 245, 255, 0.72)',
            });
            if (W.particles.length < 180) {
              spawnPooledParticle(W.particles, {
                x: W.player.x - ix * 8 + (Math.random() - 0.5) * 8,
                y: W.player.y + 4 - iy * 8,
                vx: -ix * 24 + (Math.random() - 0.5) * 18,
                vy: -iy * 24 + (Math.random() - 0.5) * 18,
                z: 2,
                vz: isRunning ? 34 : 18,
                az: -110,
                l: 0.36,
                maxL: 0.36,
                size: isRunning ? 0.95 : 0.75,
                shape: 'orb',
                c: Math.random() > 0.4 ? '#ffffff' : '#9eeeff',
              });
            }
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
            const stepDirX = Math.abs(W.player.dx) + Math.abs(W.player.dy) > 0.01 ? W.player.dx : ix;
            const stepDirY = Math.abs(W.player.dx) + Math.abs(W.player.dy) > 0.01 ? W.player.dy : iy;
            const puffCount = isRunning ? 2 : 1;
            for (let sp = 0; sp < puffCount; sp++) {
              const lateral = sp === 0 ? 1 : -1;
              spawnPooledParticle(W.particles, {
                x: W.player.x - stepDirX * 5 + (Math.random() - 0.5) * 6 + lateral * stepDirY * 3,
                y: W.player.y + 6 - stepDirY * 5 + (Math.random() - 0.5) * 4 - lateral * stepDirX * 3,
                vx: -stepDirX * (isRunning ? 28 : 16) + (Math.random() - 0.5) * 18,
                vy: W.player.dive ? -22 - Math.random() * 14 : -stepDirY * (isRunning ? 28 : 16) + (Math.random() - 0.5) * 18,
                z: 2,
                vz: isRunning ? 36 + Math.random() * 16 : 22 + Math.random() * 12,
                az: -120,
                drag: 1.5,
                size: isRunning ? 0.88 : 0.68,
                shape: 'orb',
                l: 0.42,
                maxL: 0.42,
                c: stepColor,
              });
            }
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

      // Smooth spring-follow for adopted Companion Buddy trailing behind heading with gentle figure-8 hover
      const compHeadingLen = Math.hypot(W.player.dx, W.player.dy);
      const compBackX = compHeadingLen > 0.01 ? -W.player.dx / compHeadingLen : -W.player.face;
      const compBackY = compHeadingLen > 0.01 ? -W.player.dy / compHeadingLen : 0;
      const compSideX = -compBackY;
      const compSideY = compBackX;
      const orbitSwayX = Math.sin(W.time * 1.45) * 7;
      const orbitSwayY = Math.sin(W.time * 2.9) * 4;
      const targetCompX = W.player.x + compBackX * 22 + compSideX * (10 + orbitSwayX);
      const targetCompY = W.player.y + 4 + compBackY * 22 + compSideY * (10 + orbitSwayX) + orbitSwayY;
      const compFollow = Math.min(1, 6.2 * dt);
      W.companionPos.x += (targetCompX - W.companionPos.x) * compFollow;
      W.companionPos.y += (targetCompY - W.companionPos.y) * compFollow;

      // Subtle signature ambient trail motes from active companion
      const activeCompId = playerLookRef.current.companion ?? 'gloom';
      if (
        activeCompId !== 'none' &&
        activeCompId !== 'gary' &&
        W.particles.length < 180 &&
        Math.random() < (W.player.isMoving ? 3.2 : 1.1) * dt
      ) {
        const compMoteColor =
          activeCompId === 'gloom'
            ? '#ffe580'
            : activeCompId === 'gloria'
            ? '#7de0ff'
            : activeCompId === 'moth'
            ? '#ffd23f'
            : activeCompId === 'bee'
            ? '#ffbf3f'
            : activeCompId === 'whale'
            ? Math.random() < 0.5
              ? '#ff9ebb'
              : '#9ef4ff'
            : '#ffb703';
        spawnPooledParticle(W.particles, {
          x: W.companionPos.x + (Math.random() - 0.5) * 10,
          y: W.companionPos.y + (Math.random() - 0.5) * 6,
          vx: (Math.random() - 0.5) * 12,
          vy: -6 - Math.random() * 10,
          z: 6 + Math.random() * 6,
          vz: 10,
          drag: 2.2,
          size: activeCompId === 'whale' ? 0.9 : 0.65,
          shape: activeCompId === 'whale' ? 'orb' : 'spark',
          l: 0.55,
          maxL: 0.55,
          c: compMoteColor,
        });
      }

      // Natural Mana regeneration
      const lanternManaBonus = liveUpgrades.lantern_charm ? 4.5 : 0;
      W.player.mp = Math.min(
        100,
        W.player.mp + ((liveUpgrades.crys ? 14 : 9) * weatherMods.manaRegenMultiplier + lanternManaBonus) * dt
      );

      // Diving oxygen handling (Tide Song grants infinite underwater air, Chowder halves drain)
      if (W.player.dive && W.tideTimer <= 0) {
        const o2Drain = W.marketDiveTimer > 0 ? 3.2 : 7;
        W.player.o2 = Math.max(0, W.player.o2 - o2Drain * dt);
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

      const layerKey = `${
        W.player.house
          ? 'house'
          : W.player.sky
          ? 'sky'
          : W.player.dive
          ? 'dive'
          : W.player.glowdeep
          ? 'glow'
          : W.player.moonroad
          ? 'moon'
          : 'surf'
      }:${W.player.swim ? 'S' : 'L'}`;
      const pxQuant = Math.round(W.player.x / 16);
      const pyQuant = Math.round(W.player.y / 16);
      const mapOrTeleportOpen = activeModalRef.current === 'map' || activeModalRef.current === 'teleport';
      const shouldSyncPlayerPos =
        layerKey !== hudSyncRef.current.layerKey ||
        (!dropNonEssentialUi &&
          (pxQuant !== hudSyncRef.current.pxQuant ||
            pyQuant !== hudSyncRef.current.pyQuant)) ||
        (mapOrTeleportOpen && actualSpeed > 2);
      if (shouldSyncPlayerPos) {
        hudSyncRef.current.layerKey = layerKey;
        hudSyncRef.current.pxQuant = pxQuant;
        hudSyncRef.current.pyQuant = pyQuant;
        setPlayerPos({
          x: W.player.x,
          y: W.player.y,
          sky: W.player.sky,
          dive: W.player.dive,
          swim: W.player.swim,
          glowdeep: W.player.glowdeep,
          moonroad: W.player.moonroad,
          house: W.player.house,
        });
      }

      // Dawn Break magnetic starlight + Moon Pull + Echo Magnet + Bee nectar magnet attraction toward player (allocation-free)
      const hasBeeMagnet = (playerLookRef.current.companion ?? 'gloom') === 'bee';
      const pickupRadBonus =
        (W.dawnTimer > 0 ? 34 : 0) +
        (W.moonPullTimer > 0 || W.echoMagnetTimer > 0 ? 24 : 0) +
        (hasBeeMagnet ? 16 : 0);
      if (W.moonPullTimer > 0 || W.dawnTimer > 0 || W.echoMagnetTimer > 0 || hasBeeMagnet) {
        if (W.moonPullTimer > 0) W.moonPullTimer = Math.max(0, W.moonPullTimer - dt);
        if (W.echoMagnetTimer > 0) {
          W.echoMagnetTimer = Math.max(0, W.echoMagnetTimer - dt);
          W.echoMagnetTick += dt;
          if (W.echoMagnetTick >= 0.35) {
            W.echoMagnetTick = 0;
            const curLayerMagnet = getPlayerLayer(W.player);
            const magnetCoinMult = (liveUpgrades.clover ? 1.5 : 1) * (W.marketLuckTimer > 0 ? 1.35 : 1);
            for (const echo of MEMORY_ECHOES) {
              if (echo.w !== curLayerMagnet || W.discoveredEchoIds.has(echo.id)) continue;
              const ex = echo.x * T + T / 2;
              const ey = echo.y * T + T / 2;
              if (Math.hypot(ex - W.player.x, ey - W.player.y) <= 640) {
                W.discoveredEchoIds.add(echo.id);
                echo.got = true;
                const b = Math.round(15 * magnetCoinMult);
                setCoins((c) => c + b);
                setTotalCoins((c) => c + b);
                setLoreEntries((prev) =>
                  prev.some((l) => l.id === echo.id)
                    ? prev
                    : [...prev, { id: echo.id, t: `Memory Echo — ${echo.title} (${echo.speaker})`, x: echo.memory }]
                );
                spawnMagicRing(W.magicRings, { x: ex, y: ey, m: 0.75, r: 75, c: '#8fd5ff' });
                spawnWorldPopup(W.player.x, W.player.y - 30, `🧲 Echo: ${echo.title} +${b} 🪙`, '#8fd5ff', 1.25);
                audio.chime();
                break;
              }
            }
          }
        }
        const pullRadius = W.echoMagnetTimer > 0 ? 840 : W.moonPullTimer > 0 ? 580 : W.dawnTimer > 0 ? 210 : 92;
        const pullRadius2 = pullRadius * pullRadius;
        const pullSpeed = (W.echoMagnetTimer > 0 ? 520 : W.moonPullTimer > 0 ? 410 : W.dawnTimer > 0 ? 225 : 120) * dt;
        const attractItem = (item: { x: number; y: number; got: number }) => {
          if (item.got) return;
          const dx = W.player.x - item.x;
          const dy = W.player.y - item.y;
          const d2 = dx * dx + dy * dy;
          if (d2 > 16 && d2 < pullRadius2) {
            const dist = Math.sqrt(d2);
            item.x += (dx / dist) * pullSpeed;
            item.y += (dy / dist) * pullSpeed;
          }
        };
        if (W.player.sky) {
          for (let i = 0; i < W.feathers.length; i++) attractItem(W.feathers[i]);
        } else if (W.player.dive) {
          for (let i = 0; i < W.pearls.length; i++) attractItem(W.pearls[i]);
        } else if (W.player.glowdeep) {
          for (let i = 0; i < W.glowSpores.length; i++) attractItem(W.glowSpores[i]);
        } else if (W.player.moonroad) {
          for (let i = 0; i < W.moonNotes.length; i++) attractItem(W.moonNotes[i]);
        } else {
          for (let i = 0; i < W.stars.length; i++) attractItem(W.stars[i]);
          for (let i = 0; i < W.questItems.length; i++) {
            const qi = W.questItems[i];
            if (qi.w === 0) attractItem(qi);
          }
        }
      }

      // 2. Collectibles (Stars, Quest Items, Pearls, Feathers, Rings, Glowdeep Spores, Moon Road Notes)
      const coinMult = (liveUpgrades.clover ? 1.5 : 1) * (W.marketLuckTimer > 0 ? 1.35 : 1);
      const px0 = W.player.x;
      const py0 = W.player.y;
      if (!W.player.sky && !W.player.dive && !W.player.glowdeep && !W.player.moonroad) {
        const starPickupR2 = (28 + pickupRadBonus) * (28 + pickupRadBonus);
        const questPickupR2 = (30 + pickupRadBonus) * (30 + pickupRadBonus);
        for (const s of W.stars) {
          if (s.got) continue;
          const dx = s.x - px0;
          const dy = s.y - py0;
          if (dx * dx + dy * dy < starPickupR2) {
            s.got = 1;
            const gain = Math.round(3 * coinMult);
            setCoins((c) => c + gain);
            setTotalCoins((c) => c + gain);
            audio.chime();
            spawnWorldPopup(s.x, s.y - 12, `+${gain} 🪙 ⭐`, '#ffe875');
            showToast('Found a Star Gem! ✨');
            checkAchFnRef.current();
          }
        }
        for (const qi of W.questItems) {
          if (qi.got || qi.w !== 0) continue;
          const dx = qi.x - px0;
          const dy = qi.y - py0;
          if (dx * dx + dy * dy < questPickupR2) {
            qi.got = 1;
            qi.q.c = (qi.q.c || 0) + 1;
            setQuestRevision((r) => r + 1);
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
        const pearlPickupR2 = (26 + pickupRadBonus) * (26 + pickupRadBonus);
        for (const p of W.pearls) {
          if (p.got) continue;
          const dx = p.x - px0;
          const dy = p.y - py0;
          if (dx * dx + dy * dy < pearlPickupR2) {
            p.got = 1;
            W.player.o2 = 100;
            const gain = Math.round(4 * coinMult);
            setCoins((c) => c + gain);
            setTotalCoins((c) => c + gain);
            audio.chime();
            spawnWorldPopup(p.x, p.y - 12, `+${gain} 🪙 🐚`, '#b8f2ff');
            showToast('Gathered a luminous Pearl! Air restored 🐚');
            checkAchFnRef.current();
          }
        }
      } else if (W.player.sky) {
        const featherPickupR2 = (30 + pickupRadBonus) * (30 + pickupRadBonus);
        for (const f of W.feathers) {
          if (f.got) continue;
          const dx = f.x - px0;
          const dy = f.y - py0;
          if (dx * dx + dy * dy < featherPickupR2) {
            f.got = 1;
            const gain = Math.round(2 * coinMult);
            setCoins((c) => c + gain);
            setTotalCoins((c) => c + gain);
            audio.chime();
            spawnWorldPopup(f.x, f.y - 12, `+${gain} 🪙 🪶`, '#fff7d6');
            showToast('Found a Cloud Feather! 🪶');
            checkAchFnRef.current();
          }
        }
        for (const r of W.rings) {
          if (r.got) continue;
          const dx = r.x - px0;
          const dy = r.y - py0;
          if (dx * dx + dy * dy < 1600) {
            r.got = 1;
            W.player.dash = 0.35;
            const gain = Math.round(5 * coinMult);
            setCoins((c) => c + gain);
            setTotalCoins((c) => c + gain);
            audio.chime();
            spawnWorldPopup(r.x, r.y - 14, `🌈 +${gain} 🪙`, '#ff9ebb');
            showToast('Zoomed through a Rainbow Ring! 🌈');
            checkAchFnRef.current();
          }
        }
      } else if (W.player.glowdeep) {
        const sporePickupR2 = (30 + pickupRadBonus) * (30 + pickupRadBonus);
        for (const sp of W.glowSpores) {
          if (sp.got) continue;
          const dx = sp.x - px0;
          const dy = sp.y - py0;
          if (dx * dx + dy * dy < sporePickupR2) {
            sp.got = 1;
            const gain = Math.round(4 * coinMult);
            setCoins((c) => c + gain);
            setTotalCoins((c) => c + gain);
            audio.chime();
            spawnWorldPopup(sp.x, sp.y - 12, `+${gain} 🪙 🍄`, '#64f5c1');
            const soupQ = W.quests.find((q) => q.t === 'Soup of Remembering');
            if (soupQ) {
              soupQ.c = (soupQ.c || 0) + 1;
              setQuestRevision((r) => r + 1);
              if (soupQ.st === 1 && soupQ.c >= (soupQ.n || 5)) {
                soupQ.st = 2;
                showToast('🍲 Enough Glowcap Spores! Return to Lumi in Glowdeep!');
              } else {
                showToast(`🍄 Gathered a Glowcap Spore! (${Math.min(soupQ.c, soupQ.n || 5)}/${soupQ.n || 5})`);
              }
            } else {
              showToast('🍄 Gathered a glowing Spore!');
            }
            evalStoryFnRef.current();
          }
        }
      } else if (W.player.moonroad) {
        const notePickupR2 = (30 + pickupRadBonus) * (30 + pickupRadBonus);
        for (const mn of W.moonNotes) {
          if (mn.got) continue;
          const dx = mn.x - px0;
          const dy = mn.y - py0;
          if (dx * dx + dy * dy < notePickupR2) {
            mn.got = 1;
            const gain = Math.round(5 * coinMult);
            setCoins((c) => c + gain);
            setTotalCoins((c) => c + gain);
            audio.chime();
            spawnWorldPopup(mn.x, mn.y - 12, `+${gain} 🪙 ♪`, '#e2d4ff');
            showToast('♪ Gathered a Starlight Note! ✨');
            evalStoryFnRef.current();
          }
        }
      }

      // Check nearby NPC on current layer (only entities with dialogue trigger Talk)
      let nearest: NPC | null = null;
      let minDist2 = 110 * 110;
      if (!W.player.house) {
        const curPlayerLayer = getPlayerLayer(W.player);
        for (const n of W.npcs) {
          if (getNpcLayer(n) !== curPlayerLayer || !hasNpcDialogue(n)) continue;
          const dx = n.x - px0;
          const dy = n.y - py0;
          const d2 = dx * dx + dy * dy;
          if (d2 < minDist2) {
            minDist2 = d2;
            nearest = n;
          }
        }
      }
      if (nearest !== hudSyncRef.current.npc) {
        hudSyncRef.current.npc = nearest;
        setActiveNpc(nearest);
      }

      const nearHouseItem = W.player.house ? getNearestHouseInteractable(px0, py0) : null;
      const nextHouseItemId = nearHouseItem?.id ?? null;
      if (nextHouseItemId !== hudSyncRef.current.houseItemId) {
        hudSyncRef.current.houseItemId = nextHouseItemId;
        setActiveHouseInteractable(nearHouseItem);
      }

      // Check nearby interactive Town Market Stalls (dk === 17), Noticeboards (dk === 23), or Sky Bazaars
      let nextTownAction: { kind: 'market' | 'board'; townName: string; label: string; icon: string } | null = null;
      let nextTownTargetWorld: { x: number; y: number } | null = null;
      if (!W.player.house && !W.player.dive && !W.player.glowdeep && !W.player.moonroad) {
        if (W.player.sky) {
          const skyMarkets = [
            {
              tx: WORLD_ANCHORS.sky.nimbusMarket.tx,
              ty: WORLD_ANCHORS.sky.nimbusMarket.ty,
              townName: 'Nimbus Market',
              label: 'Nimbus Sky Bazaar',
            },
            {
              tx: WORLD_ANCHORS.sky.aetherGarden.tx,
              ty: WORLD_ANCHORS.sky.aetherGarden.ty,
              townName: 'Aether Sky Garden',
              label: 'Aether Wind Market',
            },
          ];
          let bestDist2 = 130 * 130;
          for (const sm of skyMarkets) {
            const sx = sm.tx * T + T / 2;
            const sy = sm.ty * T + T / 2;
            const d2 = (px0 - sx) * (px0 - sx) + (py0 - sy) * (py0 - sy);
            if (d2 < bestDist2) {
              bestDist2 = d2;
              nextTownAction = {
                kind: 'market',
                townName: sm.townName,
                label: sm.label,
                icon: '☁️',
              };
              nextTownTargetWorld = { x: sx, y: sy };
            }
          }
        } else {
          const ptx = (px0 / T) | 0;
          const pty = (py0 / T) | 0;
          let bestDist2 = 88 * 88;
          let bestDk = 0;
          let bestPropX = 0;
          let bestPropY = 0;
          for (let oy = -2; oy <= 2; oy++) {
            for (let ox = -2; ox <= 2; ox++) {
              const tx = ptx + ox;
              const ty = pty + oy;
              if (tx < 1 || ty < 1 || tx >= N - 1 || ty >= N - 1) continue;
              const dk = W.DK[ty * N + tx];
              if (dk !== 17 && dk !== 23) continue;
              const cx = tx * T + T / 2;
              const cy = ty * T + T / 2;
              const d2 = (cx - px0) * (cx - px0) + (cy - py0) * (cy - py0);
              if (d2 < bestDist2) {
                bestDist2 = d2;
                bestDk = dk;
                bestPropX = cx;
                bestPropY = cy;
              }
            }
          }
          if (bestDk) {
            let bestTownName = 'Willowbrook';
            let bestTownD2 = 1e9;
            for (let i = 0; i < W.towns.length; i++) {
              const tw = W.towns[i];
              if (tw.w !== 0) continue;
              const cx = tw.x * T + T / 2;
              const cy = tw.y * T + T / 2;
              const td2 = (cx - bestPropX) * (cx - bestPropX) + (cy - bestPropY) * (cy - bestPropY);
              if (td2 < bestTownD2) {
                bestTownD2 = td2;
                bestTownName = tw.n;
              }
            }
            nextTownAction =
              bestDk === 23
                ? { kind: 'board', townName: bestTownName, label: `${bestTownName} Noticeboard`, icon: '📋' }
                : { kind: 'market', townName: bestTownName, label: `${bestTownName} Bazaar`, icon: '🛍️' };
            nextTownTargetWorld = { x: bestPropX, y: bestPropY };
          }
        }
      }
      nearbyTownWorldTargetRef.current = nextTownTargetWorld;
      const nextActionKey = nextTownAction ? `${nextTownAction.kind}:${nextTownAction.townName}` : '';
      if (nextActionKey !== hudSyncRef.current.townActionKey) {
        hudSyncRef.current.townActionKey = nextActionKey;
        setNearbyTownAction(nextTownAction);
      }

      // Unlock visited Town Centers when entering their square on the matching layer
      for (const town of W.towns) {
        if (town.vis === 1 || W.player.house) continue;
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
        const dx = px0 - tx;
        const dy = py0 - ty;
        if (dx * dx + dy * dy < unlockRadius * unlockRadius) {
          town.vis = 1;
          if (town.n === 'Bellwood Treetops') W.dawnChimesCount += 2;
          audio.chime();
          spawnMagicRing(W.magicRings, { x: tx, y: ty, m: 1.0, r: 160, c: '#7bd88f' });
          spawnWorldPopup(tx, ty - 28, `🏘️ ${town.n} Unlocked!`, '#9be8a8', 1.5);
          showToast(`🏘️ Town Center Unlocked: ${town.n}! Fast travel ready via Song of Teleportation 🌀`);
          evalStoryFnRef.current();
          checkAchFnRef.current();
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

      // Pause world rendering when occluded by fullscreen cutscenes or fullscreen opaque modals
      // (prevents dual-WebGL context contention on phones & zero preserveDrawingBuffer:false strobing)
      if (activeCutsceneRef.current !== null) {
        lastLoopWorkMs = 0;
        animId = requestAnimationFrame(loop);
        return;
      }
      const curModal = activeModalRef.current;
      const isSideDrawerModal = curModal === 'cottage' && W.player.house;
      const modalOccluding3D = curModal !== 'none' && curModal !== 'dialog' && !isSideDrawerModal;
      const modalCovering = curModal !== 'none' && !isSideDrawerModal;
      if (modalOccluding3D && renderer3DRef.current) {
        lastLoopWorkMs = 0;
        animId = requestAnimationFrame(loop);
        return;
      }

      // 3. Render Canvas (deterministic pixel-budget DPR — never cleared mid-walk by micro viewport jitter)
      const canvas = canvasRef.current;
      if (canvas) {
        const rawW = canvas.clientWidth || logicalW;
        const rawH = canvas.clientHeight || logicalH;
        const w = Number.isFinite(rawW) && rawW > 0 ? rawW : 320;
        const h = Number.isFinite(rawH) && rawH > 0 ? rawH : 240;
        const safeDpr = computeViewportDpr(
          w,
          h,
          liveDevice.pixelRatio || 1,
          isPhone,
          isTablet,
          lowQ,
          Boolean(r3d?.isSoftwareGl)
        );
        const safeScale = Number.isFinite(viewScale) && viewScale > 0 ? viewScale : 1;
        const bw = Math.max(1, Math.round(w * safeDpr));
        const bh = Math.max(1, Math.round(h * safeDpr));
        if (Math.abs(canvas.width - bw) >= 2 || Math.abs(canvas.height - bh) >= 2) {
          canvas.width = bw;
          canvas.height = bh;
        }

        const ctx = canvas.getContext('2d');
        if (ctx) {
          if (!Number.isFinite(W.camera.x)) W.camera.x = Number.isFinite(W.player.x) ? W.player.x : (N * T) / 2;
          if (!Number.isFinite(W.camera.y)) W.camera.y = Number.isFinite(W.player.y) ? W.player.y : (N * T) / 2;

          ctx.setTransform(safeDpr, 0, 0, safeDpr, 0, 0);

          if (r3d && !r3d.isContextLost()) {
            // === 3D STORYBOOK DIORAMA RENDER + TRANSPARENT 2D PROJECTED LABELS ===
            const layerName3D: 'surface' | 'sky' | 'dive' | 'glowdeep' | 'moonroad' | 'house' = W.player.house
              ? 'house'
              : W.player.sky
              ? 'sky'
              : W.player.dive
              ? 'dive'
              : W.player.glowdeep
              ? 'glowdeep'
              : W.player.moonroad
              ? 'moonroad'
              : 'surface';
            const liveLook = playerLookRef.current;
            const liveLullabyDone = lullabyDoneRef.current;
            const liveCottage = cottageStateRef.current;
            const liveFishLog = fishLogRef.current;
            if (
              !aquariumFishCacheRef.current ||
              aquariumFishCacheRef.current.fishLog !== liveFishLog ||
              aquariumFishCacheRef.current.starter !== liveCottage.aquariumFish
            ) {
              const caught = Object.keys(liveFishLog).filter((k) => liveFishLog[k] > 0);
              const starter = (liveCottage.aquariumFish || []).filter((k) => !liveFishLog[k]);
              aquariumFishCacheRef.current = {
                fishLog: liveFishLog,
                starter: liveCottage.aquariumFish,
                list: [...caught, ...starter],
              };
            }
            const liveAquariumFish = aquariumFishCacheRef.current.list;

            // Tick dynamic VFX lifetimes identically to 2D pass
            for (let i = W.blooms.length - 1; i >= 0; i--) {
              if (W.time > W.blooms[i].e) W.blooms.splice(i, 1);
            }
            for (let i = W.dashGhosts.length - 1; i >= 0; i--) {
              W.dashGhosts[i].alpha -= dt * 2.6;
              if (W.dashGhosts[i].alpha <= 0) W.dashGhosts.splice(i, 1);
            }
            tickMagicRings(W.magicRings, dt);
            tickWorldParticles(W.particles, dt, effLowQ);
            tickScreenShake(W.screenShake, dt);
            for (let i = W.hollows.length - 1; i >= 0; i--) {
              const hl = W.hollows[i];
              if (hl.bloomT && hl.bloomT > 0) {
                hl.bloomT = Math.max(0, hl.bloomT - dt * 0.4);
              }
            }
            for (let i = W.worldPopups.length - 1; i >= 0; i--) {
              W.worldPopups[i].age += dt;
              if (W.worldPopups[i].age >= W.worldPopups[i].maxAge) W.worldPopups.splice(i, 1);
            }

            const targetDpr3D = computeViewportDpr(
              w,
              h,
              liveDevice.pixelRatio || 1,
              isPhone,
              isTablet,
              lowQ,
              r3d.isSoftwareGl
            );
            r3d.resize(w, h, targetDpr3D);
            // Refresh W.echoTargets3D when Star Sense (within 680px) or Echo Call (map-wide) is active
            W.echoTargets3D.length = 0;
            if ((W.echoTimer > 0 || W.starSenseTimer > 0) && !W.player.house) {
              const curEchoLayer = getPlayerLayer(W.player);
              const maxEchoD2 = W.echoTimer > 0 ? 1e12 : 680 * 680;
              for (const e of MEMORY_ECHOES) {
                if (e.w === curEchoLayer && !W.discoveredEchoIds.has(e.id)) {
                  const ex = e.x * T + T / 2;
                  const ey = e.y * T + T / 2;
                  const d2 = (ex - W.player.x) * (ex - W.player.x) + (ey - W.player.y) * (ey - W.player.y);
                  if (d2 <= maxEchoD2) {
                    W.echoTargets3D.push({ x: ex, y: ey, kind: 'echo' });
                  }
                }
              }
              for (const p of MOON_DIARY_PAGES) {
                if (p.w === curEchoLayer && !W.discoveredDiaryPages.has(p.page)) {
                  const ex = p.x * T + T / 2;
                  const ey = p.y * T + T / 2;
                  const d2 = (ex - W.player.x) * (ex - W.player.x) + (ey - W.player.y) * (ey - W.player.y);
                  if (d2 <= maxEchoD2) {
                    W.echoTargets3D.push({ x: ex, y: ey, kind: 'diary' });
                  }
                }
              }
              if (W.echoTargets3D.length > 1) {
                W.echoTargets3D.sort(
                  (a, b) =>
                    (a.x - W.player.x) * (a.x - W.player.x) +
                    (a.y - W.player.y) * (a.y - W.player.y) -
                    ((b.x - W.player.x) * (b.x - W.player.x) + (b.y - W.player.y) * (b.y - W.player.y))
                );
              }
            }

            let sync = syncState3DRef.current;
            const livePreset = CAMERA_PRESETS_3D[liveSettings.camPreset ?? 0] ?? 'cozy';
            if (!sync) {
              sync = {
                B: W.B,
                DK: W.DK,
                UD: W.UD,
                TW: W.TW,
                SB: W.SB,
                SD: W.SD,
                stars: W.stars,
                pearls: W.pearls,
                feathers: W.feathers,
                rings: W.rings,
                glowSpores: W.glowSpores,
                moonNotes: W.moonNotes,
                questItems: W.questItems,
                fish: W.fish,
                towns: W.towns,
                npcs: W.npcs,
                hollows: W.hollows,
                blooms: W.blooms,
                magicRings: W.magicRings,
                particles: W.particles,
                iceMap: W.iceMap,
                lilyMap: W.lilyMap,
                hotSprings: W.hotSprings,
                dkRevision: W.dkRevision,
                echoTargets3D: W.echoTargets3D,
                glowdeepPortal: W.glowdeepPortal,
                moonGatePortal: W.moonGatePortal,
                playerHomePortal: W.playerHomePortal,
                dashGhosts: W.dashGhosts,
                player: W.player,
                companionPos: W.companionPos,
                playerLook: liveLook,
                companionId: liveLook.companion ?? 'gloom',
                time: W.time,
                season: liveSeason,
                weatherId: weatherRef.current.currentWeather.id,
                weatherParticleType: weatherRef.current.currentWeather.particleType,
                nightCycleEnabled: Boolean(liveSettings.night),
                lullabyDone: liveLullabyDone,
                fireplaceLit: liveCottage.fireplaceLit !== false,
                cottage: liveCottage,
                aquariumFishList: liveAquariumFish,
                nearestNpc: nearest,
                activeSpellTimers: {
                  frostShieldTimer: W.frostShieldTimer,
                  hugTimer: W.hugTimer,
                  starSenseTimer: W.starSenseTimer,
                  dawnTimer: W.dawnTimer,
                  warmthTimer: W.warmthTimer,
                  dreamwalkTimer: W.dreamwalkTimer,
                  tideTimer: W.tideTimer,
                  moonPullTimer: W.moonPullTimer,
                  echoTimer: W.echoTimer,
                  frostGlowTimer: W.frostGlowTimer,
                  thermalGlideTimer: W.thermalGlideTimer,
                  echoMagnetTimer: W.echoMagnetTimer,
                },
                lowQuality: effLowQ,
                isTitleMode: false,
                cameraYaw: camera3DStateRef.current.yaw,
                cameraPitch: camera3DStateRef.current.pitch,
                cameraZoom: camera3DStateRef.current.zoom,
                cameraPreset: livePreset,
                cameraShake: { x: W.screenShake.offsetX, y: W.screenShake.offsetY },
              };
              syncState3DRef.current = sync;
            } else {
              sync.B = W.B;
              sync.DK = W.DK;
              sync.UD = W.UD;
              sync.TW = W.TW;
              sync.SB = W.SB;
              sync.SD = W.SD;
              sync.stars = W.stars;
              sync.pearls = W.pearls;
              sync.feathers = W.feathers;
              sync.rings = W.rings;
              sync.glowSpores = W.glowSpores;
              sync.moonNotes = W.moonNotes;
              sync.questItems = W.questItems;
              sync.fish = W.fish;
              sync.towns = W.towns;
              sync.npcs = W.npcs;
              sync.hollows = W.hollows;
              sync.blooms = W.blooms;
              sync.magicRings = W.magicRings;
              sync.particles = W.particles;
              sync.iceMap = W.iceMap;
              sync.lilyMap = W.lilyMap;
              sync.hotSprings = W.hotSprings;
              sync.dkRevision = W.dkRevision;
              sync.echoTargets3D = W.echoTargets3D;
              sync.glowdeepPortal = W.glowdeepPortal;
              sync.moonGatePortal = W.moonGatePortal;
              sync.playerHomePortal = W.playerHomePortal;
              sync.dashGhosts = W.dashGhosts;
              sync.player = W.player;
              sync.companionPos = W.companionPos;
              sync.playerLook = liveLook;
              sync.companionId = liveLook.companion ?? 'gloom';
              sync.time = W.time;
              sync.season = liveSeason;
              sync.weatherId = weatherRef.current.currentWeather.id;
              sync.weatherParticleType = weatherRef.current.currentWeather.particleType;
              sync.nightCycleEnabled = Boolean(liveSettings.night);
              sync.lullabyDone = liveLullabyDone;
              sync.fireplaceLit = liveCottage.fireplaceLit !== false;
              sync.cottage = liveCottage;
              sync.aquariumFishList = liveAquariumFish;
              sync.nearestNpc = nearest;
              sync.activeSpellTimers.frostShieldTimer = W.frostShieldTimer;
              sync.activeSpellTimers.hugTimer = W.hugTimer;
              sync.activeSpellTimers.starSenseTimer = W.starSenseTimer;
              sync.activeSpellTimers.dawnTimer = W.dawnTimer;
              sync.activeSpellTimers.warmthTimer = W.warmthTimer;
              sync.activeSpellTimers.dreamwalkTimer = W.dreamwalkTimer;
              sync.activeSpellTimers.tideTimer = W.tideTimer;
              sync.activeSpellTimers.moonPullTimer = W.moonPullTimer;
              sync.activeSpellTimers.echoTimer = W.echoTimer;
              sync.activeSpellTimers.frostGlowTimer = W.frostGlowTimer;
              sync.activeSpellTimers.thermalGlideTimer = W.thermalGlideTimer;
              sync.activeSpellTimers.echoMagnetTimer = W.echoMagnetTimer;
              sync.lowQuality = effLowQ;
              sync.isTitleMode = false;
              sync.cameraYaw = camera3DStateRef.current.yaw;
              sync.cameraPitch = camera3DStateRef.current.pitch;
              sync.cameraZoom = camera3DStateRef.current.zoom;
              sync.cameraPreset = livePreset;
              if (!sync.cameraShake) {
                sync.cameraShake = { x: W.screenShake.offsetX, y: W.screenShake.offsetY };
              } else {
                sync.cameraShake.x = W.screenShake.offsetX;
                sync.cameraShake.y = W.screenShake.offsetY;
              }
            }
            r3d.render(sync, dt);

            ctx.clearRect(0, 0, w, h);

            // Subtle atmospheric edge vignette & realm flash without duplicating 2D particles
            if (!dropNonEssentialUi && !W.player.glowdeep && !W.player.moonroad) {
              weatherRef.current.render(ctx, w, h, W.player.sky, W.player.dive, W.time, effLowQ, true);
            }
            if (W.realmFlash.alpha > 0.01) {
              ctx.save();
              ctx.fillStyle = W.realmFlash.color;
              ctx.globalAlpha = Math.min(0.6, W.realmFlash.alpha);
              ctx.fillRect(0, 0, w, h);
              ctx.restore();
              W.realmFlash.alpha = Math.max(0, W.realmFlash.alpha - dt * 1.45);
            }

            // Projected World Overlays (Player, NPCs, Hollows, Portals, Popups, Guide Beams)
            r3d.projectWorldToScreen(
              W.player.x,
              W.player.y,
              0.7,
              w,
              h,
              W.B,
              W.SB,
              W.iceMap,
              layerName3D,
              playerProjOut
            );

            if (!dropNonEssentialUi && !modalCovering) {
              // Player nameplate (hidden in 1st person since camera is at eye level)
              if (livePreset !== 'first_person') {
                r3d.projectWorldToScreen(
                  W.player.x,
                  W.player.y,
                  1.45,
                  w,
                  h,
                  W.B,
                  W.SB,
                  W.iceMap,
                  layerName3D,
                  projOut
                );
                if (projOut.visible) {
                  ctx.save();
                  ctx.font = '900 12.5px Nunito, sans-serif';
                  ctx.textAlign = 'center';
                  ctx.strokeStyle = 'rgba(42,18,56,0.88)';
                  ctx.lineWidth = 3.2;
                  ctx.strokeText(liveLook.name, projOut.x, projOut.y);
                  ctx.fillStyle = '#ffffff';
                  ctx.fillText(liveLook.name, projOut.x, projOut.y);
                  ctx.restore();
                }
              }

              // Visible NPC names, [E] Talk tags, and Speech Bubbles (skip indoors)
              if (!W.player.house) {
              const curLayer3D = getPlayerLayer(W.player);
              const npcLabelDist = effLowQ ? 480 : 740;
              const npcLabelDist2 = npcLabelDist * npcLabelDist;
              ctx.save();
              ctx.textAlign = 'center';
              for (const npc of W.npcs) {
                if (getNpcLayer(npc) !== curLayer3D) continue;
                const ndx = npc.x - W.player.x;
                const ndy = npc.y - W.player.y;
                if (ndx * ndx + ndy * ndy > npcLabelDist2) continue;

                const isTargeted = nearest === npc && hasNpcDialogue(npc);
                if (!npc.tree) {
                  r3d.projectWorldToScreen(
                    npc.x,
                    npc.y,
                    0.05,
                    w,
                    h,
                    W.B,
                    W.SB,
                    W.iceMap,
                    layerName3D,
                    projOut
                  );
                  if (!projOut.visible || projOut.x < -60 || projOut.x > w + 60 || projOut.y < -40 || projOut.y > h + 40) {
                    continue;
                  }
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
                  ctx.font = '900 11.5px Nunito, sans-serif';
                  ctx.strokeStyle = 'rgba(42,18,56,0.88)';
                  ctx.lineWidth = 3;
                  const nameLabel = moodEmoji ? `${npc.n}${moodEmoji}` : npc.n;
                  ctx.strokeText(nameLabel, projOut.x, projOut.y + 18);
                  ctx.fillStyle = '#ffffff';
                  ctx.fillText(nameLabel, projOut.x, projOut.y + 18);
                }

                const promptHeight = npc.tree ? 2.15 : 1.55;
                if (isTargeted && !(npc.say && npc.sayT > 0)) {
                  r3d.projectWorldToScreen(npc.x, npc.y, promptHeight, w, h, W.B, W.SB, W.iceMap, layerName3D, projOut);
                  if (projOut.visible) {
                    const tag = '[E] Talk';
                    ctx.font = '800 11px Nunito, sans-serif';
                    const tw = ctx.measureText(tag).width + 14;
                    const tx = projOut.x - tw / 2;
                    const ty = projOut.y - 20 + Math.sin(W.time * 5) * 2;
                    ctx.fillStyle = 'rgba(255, 250, 244, 0.96)';
                    ctx.strokeStyle = '#ffd23f';
                    ctx.lineWidth = 1.6;
                    ctx.beginPath();
                    ctx.roundRect(tx, ty, tw, 19, 6);
                    ctx.fill();
                    ctx.stroke();
                    ctx.fillStyle = '#4a3550';
                    ctx.fillText(tag, projOut.x, ty + 13);
                  }
                } else if (npc.say && npc.sayT > 0) {
                  r3d.projectWorldToScreen(npc.x, npc.y, promptHeight, w, h, W.B, W.SB, W.iceMap, layerName3D, projOut);
                  if (projOut.visible) {
                    ctx.font = 'bold 11px Nunito, sans-serif';
                    const textW = ctx.measureText(npc.say).width;
                    const bubbleW = textW + 16;
                    const bubbleH = 22;
                    const bubbleX = projOut.x - bubbleW / 2;
                    const bubbleY = projOut.y - 22;
                    ctx.fillStyle = 'rgba(255, 252, 246, 0.96)';
                    ctx.strokeStyle = '#ff7aa8';
                    ctx.lineWidth = 1.8;
                    ctx.beginPath();
                    ctx.roundRect(bubbleX, bubbleY, bubbleW, bubbleH, 7);
                    ctx.fill();
                    ctx.stroke();
                    ctx.fillStyle = '#4a3550';
                    ctx.fillText(npc.say, projOut.x, bubbleY + 15);
                  }
                }
              }
              ctx.restore();
              }

              // Indoor 3D Mochi House Interactable Prompt ([E] Hearth, Bed, Tub, Oven, Planters, etc.)
              if (W.player.house && nearHouseItem) {
                const ixWorld = (HOUSE_ORIGIN_TX + nearHouseItem.localX) * T;
                const izWorld = (HOUSE_ORIGIN_TZ + nearHouseItem.localZ) * T;
                r3d.projectWorldToScreen(ixWorld, izWorld, 1.45, w, h, W.B, W.SB, W.iceMap, layerName3D, projOut);
                if (projOut.visible) {
                  const tag =
                    nearHouseItem.id === 'exit_house'
                      ? `[F / E] ${nearHouseItem.icon} ${nearHouseItem.label}`
                      : `[E] ${nearHouseItem.icon} ${nearHouseItem.label}`;
                  ctx.save();
                  ctx.font = '800 11px Nunito, sans-serif';
                  ctx.textAlign = 'center';
                  const tw = ctx.measureText(tag).width + 16;
                  const tx = projOut.x - tw / 2;
                  const ty = projOut.y - 20 + Math.sin(W.time * 4.5) * 2;
                  ctx.fillStyle = 'rgba(34, 22, 48, 0.92)';
                  ctx.strokeStyle = '#ff9ebb';
                  ctx.lineWidth = 1.8;
                  ctx.beginPath();
                  ctx.roundRect(tx, ty, tw, 21, 7);
                  ctx.fill();
                  ctx.stroke();
                  ctx.fillStyle = '#fffaf4';
                  ctx.fillText(tag, projOut.x, ty + 14);
                  ctx.restore();
                }
              }

              // Outdoor 3D Market Stall / Noticeboard Prompt ([E])
              if (!W.player.house && !nearest && nearbyTownActionRef.current && nearbyTownWorldTargetRef.current) {
                const tw = nearbyTownWorldTargetRef.current;
                r3d.projectWorldToScreen(tw.x, tw.y, 2.05, w, h, W.B, W.SB, W.iceMap, layerName3D, projOut);
                if (projOut.visible) {
                  const tag = `[E] ${nearbyTownActionRef.current.icon} ${nearbyTownActionRef.current.label}`;
                  ctx.save();
                  ctx.font = '800 11px Nunito, sans-serif';
                  ctx.textAlign = 'center';
                  const pillW = ctx.measureText(tag).width + 16;
                  const pillX = projOut.x - pillW / 2;
                  const pillY = projOut.y - 20 + Math.sin(W.time * 4.2) * 2;
                  ctx.fillStyle = 'rgba(34, 22, 48, 0.92)';
                  ctx.strokeStyle = nearbyTownActionRef.current.kind === 'board' ? '#b89eff' : '#ff9ebb';
                  ctx.lineWidth = 1.8;
                  ctx.beginPath();
                  ctx.roundRect(pillX, pillY, pillW, 21, 7);
                  ctx.fill();
                  ctx.stroke();
                  ctx.fillStyle = '#fffaf4';
                  ctx.fillText(tag, projOut.x, pillY + 14);
                  ctx.restore();
                }
              }

              // Visible Hollow Creature labels & sighs (filtered strictly by active layer)
              if (!W.player.house) {
                const HOLLOW_SIGHS = ['…so quiet…', '…remember the dawn?…', '…warmth helps…'];
                const curHollowLayer = getPlayerLayer(W.player);
                const hollowLabelDist = effLowQ ? 480 : 720;
                const hollowLabelDist2 = hollowLabelDist * hollowLabelDist;
                ctx.save();
                ctx.textAlign = 'center';
                ctx.strokeStyle = 'rgba(42,18,56,0.88)';
                ctx.lineWidth = 2.6;
                for (let idx = 0; idx < W.hollows.length; idx++) {
                  const hollow = W.hollows[idx];
                  if ((hollow.w ?? 0) !== curHollowLayer) continue;
                  const hdx = hollow.x - W.player.x;
                  const hdy = hollow.y - W.player.y;
                  const hd2 = hdx * hdx + hdy * hdy;
                  if (hd2 > hollowLabelDist2) continue;
                  r3d.projectWorldToScreen(hollow.x, hollow.y, 1.38, w, h, W.B, W.SB, W.iceMap, layerName3D, projOut);
                  if (!projOut.visible) continue;
                  ctx.globalAlpha = 1;
                  ctx.font = '900 11px Nunito, sans-serif';
                  const hTag = hollow.soothed ? `💖 ${hollow.name}` : `🩶 ${hollow.name} (Hollow)`;
                  ctx.strokeText(hTag, projOut.x, projOut.y);
                  ctx.fillStyle = hollow.soothed ? '#ff7aa8' : '#e2e8f0';
                  ctx.fillText(hTag, projOut.x, projOut.y);
                  if (!hollow.soothed && hd2 < 145 * 145) {
                    ctx.globalAlpha = 0.88;
                    ctx.font = 'italic bold 10px Nunito, sans-serif';
                    const sigh = HOLLOW_SIGHS[idx % HOLLOW_SIGHS.length];
                    ctx.strokeText(sigh, projOut.x, projOut.y - 14);
                    ctx.fillStyle = '#f1f5f9';
                    ctx.fillText(sigh, projOut.x, projOut.y - 14);
                  }
                }
                ctx.restore();
              }

              // Portal [F] proximity prompt badge
              let portalWorld: { x: number; y: number; text: string; accent: string } | null = null;
              if (isSurface) {
                if (
                  W.playerHomePortal &&
                  Math.hypot(W.player.x - W.playerHomePortal.doorX, W.player.y - W.playerHomePortal.doorY) < 60
                ) {
                  portalWorld = {
                    x: W.playerHomePortal.doorX,
                    y: W.playerHomePortal.doorY,
                    text: '[F] Enter House',
                    accent: '#ff9ebb',
                  };
                } else if (
                  W.glowdeepPortal &&
                  Math.hypot(W.player.x - W.glowdeepPortal.x, W.player.y - W.glowdeepPortal.y) < 64
                ) {
                  portalWorld = {
                    x: W.glowdeepPortal.x,
                    y: W.glowdeepPortal.y,
                    text: W.glowdeepPortal.open ? '[F] Enter Glowdeep' : '🔒 Sealed (Ch. 9)',
                    accent: W.glowdeepPortal.open ? '#64f5c1' : '#cbd5e1',
                  };
                } else if (
                  W.moonGatePortal &&
                  Math.hypot(W.player.x - W.moonGatePortal.x, W.player.y - W.moonGatePortal.y) < 64
                ) {
                  portalWorld = {
                    x: W.moonGatePortal.x,
                    y: W.moonGatePortal.y,
                    text: W.moonGatePortal.open ? '[F] Moon Road' : '🔒 Sealed (Ch. 7)',
                    accent: W.moonGatePortal.open ? '#ffd23f' : '#cbd5e1',
                  };
                }
              } else if (W.player.glowdeep) {
                const rx = GLOWDEEP_RETURN_TILE.x * T + T / 2;
                const ry = GLOWDEEP_RETURN_TILE.y * T + T / 2;
                if (Math.hypot(W.player.x - rx, W.player.y - ry) < 64) {
                  portalWorld = { x: rx, y: ry, text: '[F] Ascend Home', accent: '#64f5c1' };
                }
              } else if (W.player.moonroad) {
                const rx = MOONROAD_RETURN_TILE.x * T + T / 2;
                const ry = MOONROAD_RETURN_TILE.y * T + T / 2;
                if (Math.hypot(W.player.x - rx, W.player.y - ry) < 64) {
                  portalWorld = { x: rx, y: ry, text: '[F] Lantern Isle', accent: '#ffd23f' };
                }
              }
              if (portalWorld) {
                r3d.projectWorldToScreen(
                  portalWorld.x,
                  portalWorld.y,
                  1.5,
                  w,
                  h,
                  W.B,
                  W.SB,
                  W.iceMap,
                  layerName3D,
                  projOut
                );
                if (projOut.visible) {
                  ctx.save();
                  ctx.font = '800 11px Nunito, sans-serif';
                  ctx.textAlign = 'center';
                  const tw = ctx.measureText(portalWorld.text).width + 16;
                  const px = projOut.x - tw / 2;
                  const py = projOut.y - 20 + Math.sin(W.time * 4.5) * 2;
                  ctx.fillStyle = 'rgba(28, 16, 44, 0.9)';
                  ctx.strokeStyle = portalWorld.accent;
                  ctx.lineWidth = 1.6;
                  ctx.beginPath();
                  ctx.roundRect(px, py, tw, 21, 6);
                  ctx.fill();
                  ctx.stroke();
                  ctx.fillStyle = '#fffaf4';
                  ctx.fillText(portalWorld.text, projOut.x, py + 14);
                  ctx.restore();
                }
              }

              // Floating World Popups (coins, pearls, quests)
              for (let i = 0; i < W.worldPopups.length; i++) {
                const wp = W.worldPopups[i];
                const p = wp.age / wp.maxAge;
                const alpha = p > 0.65 ? Math.max(0, 1 - (p - 0.65) / 0.35) : 1;
                r3d.projectWorldToScreen(
                  wp.x,
                  wp.y,
                  0.85 + p * 1.15,
                  w,
                  h,
                  W.B,
                  W.SB,
                  W.iceMap,
                  layerName3D,
                  projOut
                );
                if (!projOut.visible) continue;
                ctx.save();
                ctx.globalAlpha = alpha;
                ctx.font = '900 13px Nunito, sans-serif';
                ctx.textAlign = 'center';
                ctx.strokeStyle = 'rgba(42, 18, 56, 0.9)';
                ctx.lineWidth = 3.5;
                ctx.strokeText(wp.text, projOut.x, projOut.y);
                ctx.fillStyle = wp.color;
                ctx.fillText(wp.text, projOut.x, projOut.y);
                ctx.restore();
              }
            }

            // Star Sense, Moon Pull & Echo Call Projected Guide Beams (timer decremented once in physics loop)
            if (W.starSenseTimer > 0) {
              if (playerProjOut.visible) {
                const nearestItems: { x: number; y: number; d2: number; echoLabel?: string }[] = [];
                const consider = (x: number, y: number, got: number | boolean | undefined, echoLabel?: string) => {
                  if (got) return;
                  const dx = x - W.player.x;
                  const dy = y - W.player.y;
                  const d2 = dx * dx + dy * dy;
                  if (nearestItems.length < 7) {
                    nearestItems.push({ x, y, d2, echoLabel });
                  } else {
                    let worst = 0;
                    for (let k = 1; k < nearestItems.length; k++) {
                      if (nearestItems[k].d2 > nearestItems[worst].d2) worst = k;
                    }
                    if (d2 < nearestItems[worst].d2) nearestItems[worst] = { x, y, d2, echoLabel };
                  }
                };
                if (W.player.sky) {
                  for (const f of W.feathers) consider(f.x, f.y, f.got);
                  for (const r of W.rings) consider(r.x, r.y, r.got);
                } else if (W.player.dive) {
                  for (const p of W.pearls) consider(p.x, p.y, p.got);
                } else if (W.player.glowdeep) {
                  for (const s of W.glowSpores) consider(s.x, s.y, s.got);
                } else if (W.player.moonroad) {
                  for (const m of W.moonNotes) consider(m.x, m.y, m.got);
                } else {
                  for (const s of W.stars) consider(s.x, s.y, s.got);
                  for (const qi of W.questItems) {
                    if (qi.w === 0) consider(qi.x, qi.y, qi.got);
                  }
                }
                const ssLayer = getPlayerLayer(W.player);
                for (const e of MEMORY_ECHOES) {
                  if (e.w === ssLayer && !W.discoveredEchoIds.has(e.id)) {
                    const ex = e.x * T + T / 2;
                    const ey = e.y * T + T / 2;
                    if (Math.hypot(ex - W.player.x, ey - W.player.y) <= 680) {
                      consider(ex, ey, false, `✨ ${e.title}`);
                    }
                  }
                }
                for (const p of MOON_DIARY_PAGES) {
                  if (p.w === ssLayer && !W.discoveredDiaryPages.has(p.page)) {
                    const px = p.x * T + T / 2;
                    const py = p.y * T + T / 2;
                    if (Math.hypot(px - W.player.x, py - W.player.y) <= 680) {
                      consider(px, py, false, `🌙 Diary p.${p.page}`);
                    }
                  }
                }
                ctx.save();
                for (const item of nearestItems) {
                  r3d.projectWorldToScreen(item.x, item.y, 0.55, w, h, W.B, W.SB, W.iceMap, layerName3D, projOut);
                  if (!projOut.visible) continue;
                  ctx.strokeStyle = item.echoLabel ? 'rgba(130, 226, 255, 0.85)' : 'rgba(255, 216, 77, 0.85)';
                  ctx.lineWidth = 2;
                  ctx.setLineDash([5, 5]);
                  ctx.lineDashOffset = -W.time * 24;
                  ctx.beginPath();
                  ctx.moveTo(playerProjOut.x, playerProjOut.y);
                  ctx.lineTo(projOut.x, projOut.y);
                  ctx.stroke();
                  ctx.setLineDash([]);
                  ctx.strokeStyle = item.echoLabel ? '#7ce6ff' : '#ffd23f';
                  ctx.lineWidth = 2.4;
                  ctx.beginPath();
                  ctx.arc(projOut.x, projOut.y, 12 + Math.sin(W.time * 5) * 3, 0, Math.PI * 2);
                  ctx.stroke();
                  if (item.echoLabel) {
                    ctx.font = '800 11px Nunito, sans-serif';
                    ctx.textAlign = 'center';
                    ctx.fillStyle = '#fff5b8';
                    ctx.fillText(item.echoLabel, projOut.x, projOut.y - 16);
                  }
                }
                ctx.restore();
              }
            }

            if ((W.moonPullTimer > 0 || W.echoMagnetTimer > 0) && playerProjOut.visible) {
              ctx.save();
              ctx.strokeStyle = W.echoMagnetTimer > 0 ? 'rgba(143, 213, 255, 0.88)' : 'rgba(180, 140, 255, 0.85)';
              ctx.lineWidth = 2.4;
              ctx.setLineDash([4, 6]);
              ctx.lineDashOffset = W.time * 48;
              const maxPullD2 = W.echoMagnetTimer > 0 ? 820 * 820 : 540 * 540;
              const drawPull = (x: number, y: number, got: number | boolean | undefined) => {
                if (got) return;
                const dx = x - W.player.x;
                const dy = y - W.player.y;
                if (dx * dx + dy * dy >= maxPullD2) return;
                r3d.projectWorldToScreen(x, y, 0.5, w, h, W.B, W.SB, W.iceMap, layerName3D, projOut);
                if (!projOut.visible) return;
                ctx.beginPath();
                ctx.moveTo(projOut.x, projOut.y);
                ctx.lineTo(playerProjOut.x, playerProjOut.y);
                ctx.stroke();
              };
              if (W.player.sky) for (const it of W.feathers) drawPull(it.x, it.y, it.got);
              else if (W.player.dive) for (const it of W.pearls) drawPull(it.x, it.y, it.got);
              else if (W.player.glowdeep) for (const it of W.glowSpores) drawPull(it.x, it.y, it.got);
              else if (W.player.moonroad) for (const it of W.moonNotes) drawPull(it.x, it.y, it.got);
              else {
                for (const it of W.stars) drawPull(it.x, it.y, it.got);
                for (const qi of W.questItems) if (qi.w === 0) drawPull(qi.x, qi.y, qi.got);
              }
              ctx.restore();
            }

            if (W.echoTimer > 0 && playerProjOut.visible) {
              ctx.save();
              const playerLayerNum = W.player.sky
                ? 2
                : W.player.dive
                ? 1
                : W.player.glowdeep
                ? 3
                : W.player.moonroad
                ? 4
                : 0;
              const sonarTargets = [
                ...MEMORY_ECHOES.filter((e) => e.w === playerLayerNum && !W.discoveredEchoIds.has(e.id)).map((e) => ({
                  label: `🔔 ${e.title}`,
                  ex: e.x * T + T / 2,
                  ey: e.y * T + T / 2,
                })),
                ...MOON_DIARY_PAGES.filter((p) => p.w === playerLayerNum && !W.discoveredDiaryPages.has(p.page)).map((p) => ({
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
                r3d.projectWorldToScreen(ex, ey, 0.75, w, h, W.B, W.SB, W.iceMap, layerName3D, projOut);
                if (!projOut.visible) return;
                ctx.strokeStyle = 'rgba(143, 213, 255, 0.88)';
                ctx.lineWidth = 2.4;
                ctx.setLineDash([6, 6]);
                ctx.lineDashOffset = -W.time * 30;
                ctx.beginPath();
                ctx.moveTo(playerProjOut.x, playerProjOut.y);
                ctx.lineTo(projOut.x, projOut.y);
                ctx.stroke();

                ctx.setLineDash([]);
                ctx.fillStyle = 'rgba(255, 122, 168, 0.9)';
                ctx.beginPath();
                ctx.arc(projOut.x, projOut.y, 9 + Math.sin(W.time * 6) * 2.5, 0, Math.PI * 2);
                ctx.fill();

                const clX = Math.max(70, Math.min(w - 70, projOut.x));
                const clY = Math.max(85, Math.min(h - 85, projOut.y - 16));
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
          } else {
            // === CLASSIC 2D CANVAS RENDER ===
            tickScreenShake(W.screenShake, dt);
            const vw = w / safeScale;
            const vh = h / safeScale;
            const cx = W.camera.x - vw / 2 - W.screenShake.offsetX;
            const cy = W.camera.y - vh / 2 - W.screenShake.offsetY;

            // Scaled World-Viewport Camera Frame (keeps proportions consistent from phones to ultrawides)
            ctx.save();
            try {
            ctx.scale(safeScale, safeScale);

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
              W.player.moonroad,
              liveSeason
            );

          ctx.save();
          try {
          ctx.translate(-cx, -cy);

          // Visible Tile Bounds
          const startX = Math.max(0, Math.floor(cx / T));
          const endX = Math.min(N - 1, Math.ceil((cx + vw) / T));
          const startY = Math.max(0, Math.floor(cy / T));
          const endY = Math.min(N - 1, Math.ceil((cy + vh) / T));

          // 1. Rich Terrain Layer + Collect Y-sorted Props across all 5 Realms
          let yQueue: YSortableItem[] = [];
          if (W.player.sky) {
            renderSkyTerrain(ctx, W, startX, endX, startY, endY);
            yQueue = collectSkyPropDrawables(ctx, W, startX, endX, startY, endY);
          } else if (W.player.dive) {
            renderReefTerrain(ctx, W, startX, endX, startY, endY);
            yQueue = collectReefPropDrawables(ctx, W, startX, endX, startY, endY);
          } else if (W.player.glowdeep) {
            renderGlowdeepTerrain(ctx, W, startX, endX, startY, endY);
            yQueue = collectGlowdeepPropDrawables(ctx, W, startX, endX, startY, endY);
          } else if (W.player.moonroad) {
            renderMoonRoadTerrain(ctx, W, startX, endX, startY, endY);
            yQueue = collectMoonRoadPropDrawables(ctx, W, startX, endX, startY, endY);
          } else {
            renderTerrainLayer(ctx, W, startX, endX, startY, endY);
            yQueue = collectSurfacePropDrawables(ctx, W, startX, endX, startY, endY);
            const portals = collectGroundPortalDrawables(W, ctx);
            for (let pi = 0; pi < portals.length; pi++) yQueue.push(portals[pi]);
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

          // 2. Active Spell Auras & Steaming Hot Springs (Dawn Break / Warmth / Dreamwalk / Tide / Moon Pull)
          for (let hi = 0; hi < W.hotSprings.length; hi++) {
            const hs = W.hotSprings[hi];
            ctx.save();
            const hsGrad = ctx.createRadialGradient(hs.x, hs.y, 8, hs.x, hs.y, 76);
            hsGrad.addColorStop(0, 'rgba(128, 255, 232, 0.62)');
            hsGrad.addColorStop(0.6, 'rgba(64, 215, 198, 0.34)');
            hsGrad.addColorStop(1, 'rgba(64, 215, 198, 0)');
            ctx.fillStyle = hsGrad;
            ctx.beginPath();
            ctx.ellipse(hs.x, hs.y, 76, 56, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = 'rgba(220, 255, 248, 0.72)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.ellipse(hs.x, hs.y, 58 + Math.sin(W.time * 3.5) * 4, 42 + Math.sin(W.time * 3.5) * 3, 0, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
          }

          if (W.dawnTimer > 0) {
            ctx.save();
            drawGlowHalo(ctx, '255, 224, 120', W.player.x, W.player.y, 210, 0.46);
            ctx.strokeStyle = 'rgba(255, 215, 90, 0.7)';
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.arc(W.player.x, W.player.y, 180 + Math.sin(W.time * 4) * 6, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
          }

          if (W.warmthTimer > 0) {
            drawGlowHalo(ctx, '255, 160, 75', W.player.x, W.player.y, 145, 0.44);
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

          if (W.moonPullTimer > 0 || W.echoMagnetTimer > 0) {
            ctx.save();
            ctx.strokeStyle = W.echoMagnetTimer > 0 ? 'rgba(130, 226, 255, 0.75)' : 'rgba(180, 140, 255, 0.7)';
            ctx.lineWidth = 2;
            const rMagnet = Math.max(4, 65 - ((Math.max(0, W.time) * 90) % 45));
            ctx.beginPath();
            ctx.arc(W.player.x, W.player.y, rMagnet, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
          }

          // 3. Spell Blooms (flowers, coral anemones, cloud blossoms, plus Rain Roots rainbow hybrids c>=4)
          const bloomColors = ['#ff7aa8', '#ffd23f', '#9be8a8', '#b48cff'];
          for (let i = W.blooms.length - 1; i >= 0; i--) {
            const bl = W.blooms[i];
            if (W.time > bl.e) {
              W.blooms.splice(i, 1);
              continue;
            }
            if (dropNonEssentialUi || Boolean(bl.u) !== W.player.dive) continue;
            const age = Math.min(1, (W.time - bl.b) * 3.5);
            const sway = Math.sin(W.time * 3 + bl.x) * 1.5;
            const petalColor = bl.c >= 4
              ? `hsl(${((W.time * 65 + bl.x * 0.4 + bl.c * 45) % 360) | 0}, 92%, 70%)`
              : bloomColors[bl.c % bloomColors.length];
            ctx.save();
            ctx.translate(bl.x + sway, bl.y);
            ctx.scale(age * (bl.c >= 4 ? 1.3 : 1), age * (bl.c >= 4 ? 1.3 : 1));
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
          if (!dropNonEssentialUi) {
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
              effLowQ,
              liveSeason,
              weatherRef.current.currentWeather.id
            );
          }

          // 6. Build Y-Sorted 2.5D Render Queue (Viewport-culled Props, Cottages, Mochi's House, Trees, NPCs, Hollows, Companion, Player)
          const cullMinX = cx - 120;
          const cullMaxX = cx + vw + 120;
          const cullMinY = cy - 120;
          const cullMaxY = cy + vh + 180;

          if (isSurface && W.playerHomePortal) {
            const home = W.playerHomePortal;
            if (home.x >= cullMinX - 80 && home.x <= cullMaxX + 80 && home.y >= cullMinY && home.y <= cullMaxY + 60) {
              const ownerName = playerLookRef.current.name || 'Mochi';
              const fireLit = cottageStateRef.current.fireplaceLit !== false;
              yQueue.push({
                sortY: home.y + 4,
                draw: () => renderPlayerMochiHouse(ctx, home.x, home.y, W.time, ownerName, fireLit, liveSeason),
              });
            }
          }

          const liveLullabyDone = lullabyDoneRef.current;
          const liveLook = playerLookRef.current;

          const curLayer2D = getPlayerLayer(W.player);
          W.npcs.forEach((npc) => {
            if (!isNpcOnPlayerLayer(npc, W.player)) return;

            // Frustum cull offscreen trees and residents to save huge mobile CPU/GPU work
            if (npc.tree) {
              if (npc.x < cullMinX - 100 || npc.x > cullMaxX + 100 || npc.y < cullMinY || npc.y > cullMaxY + 80) {
                return;
              }
              const isTargetedTree =
                nearest === npc && hasNpcDialogue(npc) && !modalCovering && gameStateRef.current === 'playing';
              yQueue.push({
                sortY: npc.y + 8,
                draw: () => {
                  renderGreatLanternTree(ctx, npc.x, npc.y, W.time, liveLullabyDone, liveSeason);
                  if (!dropNonEssentialUi && isTargetedTree) {
                    ctx.save();
                    const tag = '[E] Talk';
                    ctx.font = '800 10.5px Nunito, sans-serif';
                    ctx.textAlign = 'center';
                    const tw = ctx.measureText(tag).width + 14;
                    const tx = npc.x - tw / 2;
                    const ty = npc.y - 78 + Math.sin(W.time * 5) * 2;
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
                },
              });
            } else {
              if (npc.x < cullMinX || npc.x > cullMaxX || npc.y < cullMinY || npc.y > cullMaxY) {
                return;
              }
              const isTargeted = nearest === npc && !modalCovering && gameStateRef.current === 'playing';
              yQueue.push({
                sortY: npc.y + 8,
                draw: () => {
                  if (isTargeted && !dropNonEssentialUi) {
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

                  const moodEmoji = dropNonEssentialUi
                    ? ''
                    : npc.weatherBehavior === 'dancing'
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

                  if (!dropNonEssentialUi && isTargeted && !(npc.say && npc.sayT > 0)) {
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

                  if (!dropNonEssentialUi && npc.say && npc.sayT > 0) {
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

          // Living Roaming Hollow Creatures (strictly filtered to active layer)
          const HOLLOW_SIGHS = ['…so quiet…', '…remember the dawn?…', '…warmth helps…'];
          W.hollows.forEach((hollow, idx) => {
            if ((hollow.w ?? 0) !== curLayer2D) return;
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

                  if (!dropNonEssentialUi && !hollow.soothed && hDist < 145) {
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
              // 2D Cloud Wings / Thermal Breeze Ember Wings behind Mochi when soaring
              if (W.player.sky || W.thermalGlideTimer > 0) {
                const flap2D = Math.sin(W.time * (W.player.isMoving ? 10 : 5)) * 6;
                const isEmberW = W.thermalGlideTimer > 0;
                ctx.save();
                ctx.translate(W.player.x, W.player.y - 6 - (W.player.z || 0) * 0.5);
                ctx.fillStyle = isEmberW ? 'rgba(255, 168, 72, 0.85)' : 'rgba(232, 248, 255, 0.88)';
                ctx.strokeStyle = isEmberW ? '#ffd23f' : '#8fd5ff';
                ctx.lineWidth = 1.6;
                for (const side of [-1, 1]) {
                  ctx.beginPath();
                  ctx.moveTo(side * 6, 0);
                  ctx.quadraticCurveTo(side * 24, -14 + flap2D, side * 30, -2 + flap2D * 0.6);
                  ctx.quadraticCurveTo(side * 18, 9 + flap2D * 0.3, side * 6, 5);
                  ctx.closePath();
                  ctx.fill();
                  ctx.stroke();
                }
                ctx.restore();
              }

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
                W.time,
                W.player.z,
                W.player.swim
              );
              ctx.restore();

              if (!dropNonEssentialUi) {
                // Orbiting Frost Crystals (Frost Bridge — tinted per season)
                if (W.frostShieldTimer > 0) {
                  const fbVar = getSeasonalSpellVariant('frost_bridge', liveSeason);
                  for (let k = 0; k < 3; k++) {
                    const ang = W.time * 2.8 + (k * Math.PI * 2) / 3;
                    const ox = W.player.x + Math.cos(ang) * 32;
                    const oy = W.player.y - 4 + Math.sin(ang) * 18;
                    ctx.save();
                    ctx.translate(ox, oy);
                    ctx.rotate(ang);
                    ctx.fillStyle = fbVar?.orbiterColor || '#d4f6ff';
                    ctx.strokeStyle = fbVar?.orbiterAccent || '#67d4ff';
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

                // Orbiting Cozy Hearts / Seasonal Charms (Hush Hug)
                if (W.hugTimer > 0) {
                  const hugGlyph =
                    liveSeason === 'spring'
                      ? '🌸'
                      : liveSeason === 'summer'
                      ? '💛'
                      : liveSeason === 'autumn'
                      ? '🧡'
                      : '🩵';
                  ctx.save();
                  ctx.font = '13px sans-serif';
                  ctx.textAlign = 'center';
                  ctx.textBaseline = 'middle';
                  for (let k = 0; k < 3; k++) {
                    const ang = -W.time * 2.3 + (k * Math.PI * 2) / 3;
                    const ox = W.player.x + Math.cos(ang) * 34;
                    const oy = W.player.y - 8 + Math.sin(ang) * 18;
                    ctx.fillText(k === 0 ? hugGlyph : '💖', ox, oy);
                  }
                  ctx.restore();
                }

                // Orbiting Crown Stars (Star Sense — seasonal palette)
                if (W.starSenseTimer > 0) {
                  const ssVar = getSeasonalSpellVariant('star_sense', liveSeason);
                  ctx.save();
                  ctx.font = '12px sans-serif';
                  ctx.textAlign = 'center';
                  ctx.textBaseline = 'middle';
                  ctx.fillStyle = ssVar?.orbiterColor || '#ffd23f';
                  for (let k = 0; k < 3; k++) {
                    const ang = W.time * 2.1 + (k * Math.PI * 2) / 3;
                    const ox = W.player.x + Math.cos(ang) * 26;
                    const oy = W.player.y - 26 + Math.sin(ang) * 8;
                    ctx.fillText(liveSeason === 'winter' ? '❄️' : '✦', ox, oy);
                  }
                  ctx.restore();
                }
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

          executeYRenderQueue(ctx, yQueue);

          // Pooled Expanding Magic Rings & Sparkle Particles (always tick lifetimes; skip drawing under >30ms load)
          tickMagicRings(W.magicRings, dt);
          if (!dropNonEssentialUi) {
            for (let i = 0; i < W.magicRings.length; i++) {
              const mr = W.magicRings[i];
              if (mr.t < 0) continue;
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
          }

          tickWorldParticles(W.particles, dt, effLowQ);
          if (!dropNonEssentialUi) {
            for (let i = 0; i < W.particles.length; i++) {
              draw2DParticle(ctx, W.particles[i]);
            }
          }

          // Floating In-World Pickup / Harmony / Town Unlock Popups (always tick age; skip drawing under >30ms load)
          for (let i = W.worldPopups.length - 1; i >= 0; i--) {
            const wp = W.worldPopups[i];
            wp.age += dt;
            if (wp.age >= wp.maxAge) {
              W.worldPopups.splice(i, 1);
              continue;
            }
            if (dropNonEssentialUi) continue;
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
          if (!dropNonEssentialUi && !modalCovering && gameStateRef.current === 'playing') {
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

          } finally {
            ctx.restore();
          }

          if (!dropNonEssentialUi) {
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
              effLowQ,
              liveSeason,
              weatherRef.current.currentWeather.id
            );

            // Render Global Weather System atmospheric tint, vignette, and ambient particles (surface / sky)
            if (!W.player.glowdeep && !W.player.moonroad) {
              weatherRef.current.render(ctx, vw, vh, W.player.sky, W.player.dive, W.time, effLowQ);
            }
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

          // Star Sense & Moon Pull World Beacons (allocation-light nearest selection; timers decremented once in physics loop)
          if (W.starSenseTimer > 0) {
            ctx.save();
            const nearest: { x: number; y: number; d2: number; echoLabel?: string }[] = [];
            const considerTarget = (x: number, y: number, got: number | boolean | undefined, echoLabel?: string) => {
              if (got) return;
              const dx = x - W.player.x;
              const dy = y - W.player.y;
              const d2 = dx * dx + dy * dy;
              if (nearest.length < 7) {
                nearest.push({ x, y, d2, echoLabel });
              } else {
                let worstIdx = 0;
                for (let k = 1; k < nearest.length; k++) {
                  if (nearest[k].d2 > nearest[worstIdx].d2) worstIdx = k;
                }
                if (d2 < nearest[worstIdx].d2) {
                  nearest[worstIdx] = { x, y, d2, echoLabel };
                }
              }
            };
            if (W.player.sky) {
              for (const f of W.feathers) considerTarget(f.x, f.y, f.got);
              for (const r of W.rings) considerTarget(r.x, r.y, r.got);
            } else if (W.player.dive) {
              for (const p of W.pearls) considerTarget(p.x, p.y, p.got);
            } else if (W.player.glowdeep) {
              for (const s of W.glowSpores) considerTarget(s.x, s.y, s.got);
            } else if (W.player.moonroad) {
              for (const m of W.moonNotes) considerTarget(m.x, m.y, m.got);
            } else {
              for (const s of W.stars) considerTarget(s.x, s.y, s.got);
              for (const qi of W.questItems) {
                if (qi.w === 0) considerTarget(qi.x, qi.y, qi.got);
              }
            }
            const ss2DLayer = getPlayerLayer(W.player);
            for (const e of MEMORY_ECHOES) {
              if (e.w === ss2DLayer && !W.discoveredEchoIds.has(e.id)) {
                const ex = e.x * T + T / 2;
                const ey = e.y * T + T / 2;
                if (Math.hypot(ex - W.player.x, ey - W.player.y) <= 680) {
                  considerTarget(ex, ey, false, `✨ ${e.title}`);
                }
              }
            }
            for (const p of MOON_DIARY_PAGES) {
              if (p.w === ss2DLayer && !W.discoveredDiaryPages.has(p.page)) {
                const px = p.x * T + T / 2;
                const py = p.y * T + T / 2;
                if (Math.hypot(px - W.player.x, py - W.player.y) <= 680) {
                  considerTarget(px, py, false, `🌙 Diary p.${p.page}`);
                }
              }
            }

            for (const item of nearest) {
              const sx = item.x - cx;
              const sy = item.y - cy;

              ctx.strokeStyle = item.echoLabel ? 'rgba(130, 226, 255, 0.85)' : 'rgba(255, 216, 77, 0.85)';
              ctx.lineWidth = 2;
              ctx.setLineDash([5, 5]);
              ctx.lineDashOffset = -W.time * 24;
              ctx.beginPath();
              ctx.moveTo(vw / 2, vh / 2);
              ctx.lineTo(sx, sy);
              ctx.stroke();

              // Pulsing target ring around visible items
              ctx.setLineDash([]);
              ctx.strokeStyle = item.echoLabel ? '#7ce6ff' : '#ffd23f';
              ctx.lineWidth = 2.5;
              ctx.beginPath();
              ctx.arc(sx, sy, 13 + Math.sin(W.time * 5) * 3, 0, Math.PI * 2);
              ctx.stroke();

              if (item.echoLabel) {
                ctx.font = '800 11px Nunito, sans-serif';
                ctx.textAlign = 'center';
                ctx.fillStyle = '#fff5b8';
                ctx.fillText(item.echoLabel, sx, sy - 16);
              }
            }
            ctx.restore();
          }

          // Moon Pull & Echo Magnet beams visibly pulling nearby gems/pearls/feathers/spores/notes
          if (W.moonPullTimer > 0 || W.echoMagnetTimer > 0) {
            ctx.save();
            ctx.strokeStyle = W.echoMagnetTimer > 0 ? 'rgba(143, 213, 255, 0.88)' : 'rgba(180, 140, 255, 0.85)';
            ctx.lineWidth = 2.4;
            ctx.setLineDash([4, 6]);
            ctx.lineDashOffset = W.time * 48;
            const maxPullD2 = W.echoMagnetTimer > 0 ? 820 * 820 : 520 * 520;
            const drawPullBeam = (x: number, y: number, got: number | boolean | undefined) => {
              if (got) return;
              const dx = x - W.player.x;
              const dy = y - W.player.y;
              if (dx * dx + dy * dy < maxPullD2) {
                ctx.beginPath();
                ctx.moveTo(x - cx, y - cy);
                ctx.lineTo(vw / 2, vh / 2);
                ctx.stroke();
              }
            };
            if (W.player.sky) {
              for (const item of W.feathers) drawPullBeam(item.x, item.y, item.got);
            } else if (W.player.dive) {
              for (const item of W.pearls) drawPullBeam(item.x, item.y, item.got);
            } else if (W.player.glowdeep) {
              for (const item of W.glowSpores) drawPullBeam(item.x, item.y, item.got);
            } else if (W.player.moonroad) {
              for (const item of W.moonNotes) drawPullBeam(item.x, item.y, item.got);
            } else {
              for (const item of W.stars) drawPullBeam(item.x, item.y, item.got);
              for (const qi of W.questItems) {
                if (qi.w === 0) drawPullBeam(qi.x, qi.y, qi.got);
              }
            }
            ctx.restore();
          }

          // Echo Call Sonar Beacons toward unfound Memory Echoes & Moon Diary Pages on current layer
          if (W.echoTimer > 0) {
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

          } catch (err) {
            console.warn('[Renderer] Frame pass recovered cleanly:', err);
          } finally {
            ctx.restore();
            ctx.setTransform(1, 0, 0, 1, 0, 0);
          }
          }

          // Cached Offscreen Minimap (builds terrain once per realm layer + redraws blips at 10Hz on phones/lowQ, 20Hz on desktop)
          const mm = minimapRef.current;
          const mmInterval = effLowQ || isPhone ? 100 : 50;
          if (!dropNonEssentialUi && mm && mm.width > 0 && mm.height > 0 && !modalCovering && now - hudSyncRef.current.lastMinimapMs >= mmInterval) {
            hudSyncRef.current.lastMinimapMs = now;
            const mCtx = mm.getContext('2d');
            if (mCtx) {
              mCtx.save();
              try {
              if (!minimapCacheRef.current || minimapCacheRef.current.layer !== layerKey || minimapCacheRef.current.season !== liveSeason) {
                const offCanvas = minimapCacheRef.current?.canvas ?? document.createElement('canvas');
                offCanvas.width = 128;
                offCanvas.height = 128;
                const cCtx = offCanvas.getContext('2d');
                if (cCtx) {
                  if (W.player.house) {
                    cCtx.fillStyle = '#2d2038';
                    cCtx.fillRect(0, 0, 128, 128);
                    // Draw 6-room architectural floorplan blueprint inside minimap
                    const rooms: [number, number, string][] = [
                      [12, 22, '#e8d7f5'], // bedroom
                      [46, 22, '#f2e0c8'], // study
                      [80, 22, '#bfe8cf'], // conservatory
                      [12, 64, '#f5d8b8'], // kitchen
                      [46, 64, '#ffe2eb'], // living
                      [80, 64, '#bde9f2'], // bath
                    ];
                    for (const [rx, ry, rc] of rooms) {
                      cCtx.fillStyle = rc;
                      cCtx.fillRect(rx, ry, 34, 40);
                      cCtx.strokeStyle = '#6f4b3e';
                      cCtx.lineWidth = 1.6;
                      cCtx.strokeRect(rx, ry, 34, 40);
                    }
                  } else {
                  cCtx.fillStyle = W.player.sky
                    ? '#63b8ec'
                    : W.player.dive
                    ? '#091f3a'
                    : W.player.glowdeep
                    ? '#110820'
                    : W.player.moonroad
                    ? '#070417'
                    : SEASON_THEMES[liveSeason].world.surfaceBackdrop[0];
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
                          cCtx.fillStyle = getSeasonalBiomeColor(b, liveSeason);
                          cCtx.fillRect(mx, my, cellPx, cellPx);
                        }
                      }
                    }
                  }
                  }
                }
                minimapCacheRef.current = { layer: layerKey, season: liveSeason, canvas: offCanvas };
              }

              const cachedMini = minimapCacheRef.current.canvas;
              if (cachedMini.width > 0 && cachedMini.height > 0) {
                mCtx.drawImage(cachedMini, 0, 0);
              }

              // NPC blips on current layer
              if (!W.player.house) {
              W.npcs.forEach((n) => {
                if (!isNpcOnPlayerLayer(n, W.player)) return;
                const nx = (n.x / (N * T)) * 128;
                const ny = (n.y / (N * T)) * 128;
                mCtx.fillStyle = n.tree ? '#ffd23f' : '#ffffff';
                mCtx.fillRect(nx - 1.5, ny - 1.5, 3, 3);
              });
              }

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

              // Active Objective / Quest Waypoint Pin on Minimap (current layer)
              if (!W.player.house && !lullabyDoneRef.current) {
                const curLyr = getPlayerLayer(W.player);
                let wayX: number | null = null;
                let wayY: number | null = null;
                const readyQ = W.quests.find((q) => q.st === 2);
                const delivQ = W.quests.find((q) => q.k === 'd' && q.st === 1 && q.to);
                const questNpcName = readyQ ? readyQ.g : delivQ ? delivQ.to! : '';
                if (questNpcName) {
                  const qNpc = W.npcs.find((n) => n.n === questNpcName && getNpcLayer(n) === curLyr);
                  if (qNpc) {
                    wayX = qNpc.x;
                    wayY = qNpc.y;
                  }
                }
                if (wayX === null) {
                  const chNow = currentChapterRef.current;
                  const chNpcMap: Record<number, string> = {
                    1: 'Pip',
                    2: 'Captain Barnacle',
                    3: 'Bumble',
                    4: 'Tidbit',
                    5: 'Ember',
                    6: 'Madame Mizzle',
                    7: curLyr === 4 ? 'The Moon' : 'Penny and Quill',
                    8: 'Bellamy',
                    9: 'Lumi',
                    10: 'The Moon',
                    11: 'Aurelle',
                    12: 'Aurelle',
                  };
                  const targetNpcName = chNpcMap[chNow];
                  const tNpc = targetNpcName ? W.npcs.find((n) => n.n === targetNpcName && getNpcLayer(n) === curLyr) : null;
                  if (tNpc) {
                    wayX = tNpc.x;
                    wayY = tNpc.y;
                  } else if (curLyr === 0 && (chNow === 7 || chNow === 10) && W.moonGatePortal) {
                    wayX = W.moonGatePortal.x;
                    wayY = W.moonGatePortal.y;
                  } else if (curLyr === 0 && chNow === 9 && W.glowdeepPortal) {
                    wayX = W.glowdeepPortal.x;
                    wayY = W.glowdeepPortal.y;
                  }
                }
                if (wayX !== null && wayY !== null) {
                  const wx = Math.max(5, Math.min(123, (wayX / (N * T)) * 128));
                  const wy = Math.max(5, Math.min(123, (wayY / (N * T)) * 128));
                  mCtx.save();
                  mCtx.fillStyle = '#ffd23f';
                  mCtx.strokeStyle = '#271d31';
                  mCtx.lineWidth = 1.4;
                  mCtx.translate(wx, wy);
                  mCtx.rotate(Math.PI / 4);
                  mCtx.fillRect(-3, -3, 6, 6);
                  mCtx.strokeRect(-3, -3, 6, 6);
                  mCtx.restore();
                }
              }

              // Player blip + facing chevron
              const px = W.player.house
                ? Math.max(12, Math.min(114, 63 + ((W.player.x / T - HOUSE_ORIGIN_TX) / 10.5) * 51))
                : Math.max(4, Math.min(124, (W.player.x / (N * T)) * 128));
              const py = W.player.house
                ? Math.max(22, Math.min(104, 63 + ((W.player.y / T - HOUSE_ORIGIN_TZ) / 7.5) * 41))
                : Math.max(4, Math.min(124, (W.player.y / (N * T)) * 128));
              const dirLen = Math.hypot(W.player.dx, W.player.dy);
              const fdx = dirLen > 0.01 ? W.player.dx / dirLen : W.player.face;
              const fdy = dirLen > 0.01 ? W.player.dy / dirLen : 0;
              mCtx.fillStyle = '#fff5a8';
              mCtx.beginPath();
              mCtx.moveTo(px + fdx * 7.2, py + fdy * 7.2);
              mCtx.lineTo(px + fdy * 3.2 - fdx * 1.5, py - fdx * 3.2 - fdy * 1.5);
              mCtx.lineTo(px - fdy * 3.2 - fdx * 1.5, py + fdx * 3.2 - fdy * 1.5);
              mCtx.closePath();
              mCtx.fill();

              mCtx.fillStyle = '#ff7aa8';
              mCtx.strokeStyle = '#ffffff';
              mCtx.lineWidth = 1.5;
              mCtx.beginPath();
              mCtx.arc(px, py, 3.8, 0, Math.PI * 2);
              mCtx.fill();
              mCtx.stroke();
              } finally {
                mCtx.restore();
              }
            }
          }
        }
      }

      lastLoopWorkMs = performance.now() - frameWorkStart;
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
        return 'Ch. 5: Meet Ember in Cinder Cradle or soothe 3 Hollows for Verse 3';
      case 6:
        return 'Ch. 6: Meet Madame Mizzle in Mirror Fens or soothe 4 Hollows for Moon Road';
      case 7:
        return 'Ch. 7: Silver Moon Gate OPEN! Step onto Moon Road or meet Penny & Quill';
      case 8:
        return 'Ch. 8: Befriend Bellamy or fly 2 Rainbow Rings by Cirrus Castle for Glowdeep';
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

  // Detailed persistent Quest Tracker data for the HUD overlay (questRevision keeps UI reactive on in-place mutations)
  const getQuestTrackerData = (): QuestTrackerData => {
    void questRevision;
    const W = worldRef.current;
    const chInfo = STORY_CHAPTERS.find((c) => c.num === currentChapter) ?? STORY_CHAPTERS[0];
    const friendsCount = W.npcs.filter((n) => n.fr && !n.tree).length;
    const soothedCount = W.hollows.filter((h) => h.soothed).length;
    const pearlsGot = W.pearls.filter((p) => p.got).length;
    const feathersGot = W.feathers.filter((f) => f.got).length;
    const starsGot = W.stars.filter((s) => s.got).length;
    const questsDone = W.quests.filter((q) => q.st === 3).length;
    const questsTotal = Math.max(1, W.quests.length);
    const byName = (name: string) => W.npcs.find((n) => n.n === name);
    const qByTitle = (title: string) => W.quests.find((q) => q.t === title);

    // Find highest-priority active side quest (preferring the chapter's featured quest)
    const chapterQuestMap: Record<number, string> = {
      2: 'Pip’s Flying Muffins',
      3: 'The Troubled Honeycomb',
      4: 'Lighthouse Kindling',
      9: 'Soup of Remembering',
    };
    const featuredTitle = chapterQuestMap[currentChapter];
    const activeQ =
      (featuredTitle
        ? W.quests.find((q) => q.t === featuredTitle && (q.st === 1 || q.st === 2))
        : undefined) ?? W.quests.find((q) => q.st === 1 || q.st === 2);

    let activeSideQuest: QuestTrackerSideQuest | null = null;
    if (activeQ) {
      if (activeQ.k === 'd') {
        activeSideQuest = {
          title: activeQ.t,
          detail: `Deliver ${activeQ.it} → ${activeQ.to || activeQ.g}`,
          current: 1,
          target: 1,
          ready: true,
        };
      } else {
        const qNeed = activeQ.n ?? 1;
        const doneCount = Math.min(activeQ.c, qNeed);
        const isReady = activeQ.c >= qNeed || activeQ.st === 2;
        activeSideQuest = {
          title: activeQ.t,
          detail: isReady
            ? `Ready! Return to ${activeQ.g}`
            : `Collect ${activeQ.it} (${doneCount}/${qNeed}) for ${activeQ.g}`,
          current: doneCount,
          target: qNeed,
          ready: isReady,
        };
      }
    }

    if (lullabyDone) {
      return {
        chapterNum: 12,
        chapterTitle: 'Everlight Mode',
        actLabel: 'Epilogue · Dawn Restored',
        objective: 'The Dawn Duet echoes forever! Wander all 5 realms, finish friendships & side quests.',
        locationHint: 'All 5 Realms Open',
        progressCurrent: questsDone,
        progressTarget: questsTotal,
        progressUnit: 'Quests',
        everlightMode: true,
        activeSideQuest,
      };
    }

    let objective = chInfo.goal;
    let locationHint = 'Mochi Meadows';
    let progressCurrent = 0;
    let progressTarget = 1;
    let progressUnit = 'Step';

    switch (currentChapter) {
      case 1: {
        const pip = byName('Pip');
        const pq = qByTitle('Pip’s Flying Muffins');
        const spokePip = Boolean(
          pip?.met || pip?.h.some(Boolean) || pip?.fr || (pq && pq.st >= 1)
        );
        objective = 'Wake under the Lantern Tree and talk to Pip nearby.';
        locationHint = 'Lantern Tree Clearing';
        progressCurrent = spokePip ? 1 : 0;
        progressTarget = 1;
        progressUnit = 'Step';
        break;
      }
      case 2: {
        const barnacle = byName('Captain Barnacle');
        const pq = qByTitle('Pip’s Flying Muffins');
        objective =
          pq?.st === 1
            ? 'Deliver Pip’s Warm Cloud Muffin to Captain Barnacle at the harbor, or befriend 2 islanders.'
            : 'Talk to Captain Barnacle at Harbor Docks or befriend 2 islanders to set sail.';
        locationHint = 'Harbor Docks (South Meadow)';
        progressCurrent = Math.min(2, Math.max(friendsCount, barnacle?.met ? 2 : pq?.st === 1 ? 1 : 0));
        progressTarget = 2;
        progressUnit = 'Steps';
        break;
      }
      case 3: {
        const bq = qByTitle('The Troubled Honeycomb');
        const bNeed = bq?.n ?? 4;
        locationHint = 'Honeycomb Hills (NW)';
        progressTarget = bNeed;
        progressUnit = 'Nectar';
        if (bq && bq.st === 1) {
          progressCurrent = Math.min(bq.c, progressTarget);
          objective =
            bq.c >= bNeed
              ? 'Return to Bumble in Honeycomb Hills to restore Verse 1: Wake!'
              : `Help Bumble gather Wildflower Nectar (${bq.c}/${bNeed}) in Honeycomb Hills.`;
        } else {
          progressCurrent = Math.min(bNeed, Math.floor(starsGot / 4));
          objective = 'Travel to Honeycomb Hills (NW) and talk to Bumble (or gather Star Gems).';
        }
        break;
      }
      case 4: {
        const tq = qByTitle('Lighthouse Kindling');
        locationHint = 'Tidepool Atoll (SW)';
        if (tq && tq.st === 1) {
          const tNeed = tq.n ?? 3;
          progressTarget = tNeed;
          progressCurrent = Math.min(tq.c, tNeed);
          progressUnit = 'Shards';
          objective =
            tq.c >= tNeed
              ? 'Return to Tidbit at Tidepool Atoll to relight the lighthouse!'
              : `Gather ${tNeed} Star Shards (${tq.c}/${tNeed}) along Tidepool Atoll for Tidbit.`;
        } else {
          progressTarget = 4;
          progressCurrent = Math.min(4, pearlsGot);
          progressUnit = 'Pearls';
          objective = 'Meet Tidbit at Tidepool Atoll or collect 4 Sea Pearls.';
        }
        break;
      }
      case 5: {
        const ember = byName('Ember');
        const cinderVisited = W.towns.some((t) => t.n === 'Cinder Spas' && t.vis === 1);
        objective = 'Meet Ember in Cinder Cradle (South) or soothe 3 Hollows for Verse 3: Warm.';
        locationHint = 'Cinder Cradle (South)';
        progressCurrent = Math.min(3, Math.max(soothedCount, (ember?.met ? 1 : 0) + (cinderVisited ? 2 : 0)));
        progressTarget = 3;
        progressUnit = 'Steps';
        break;
      }
      case 6: {
        const mizzle = byName('Madame Mizzle');
        const lilyVisited = W.towns.some((t) => t.n === 'Lily Pavilion' && t.vis === 1);
        objective = 'Meet Madame Mizzle in Mirror Fens (SE) or soothe 4 Hollows to unseal Moon Road!';
        locationHint = 'Mirror Fens (SE) · Moon Gate';
        progressCurrent = Math.min(4, Math.max(soothedCount, (mizzle?.met ? 2 : 0) + (lilyVisited ? 1 : 0)));
        progressTarget = 4;
        progressUnit = 'Steps';
        break;
      }
      case 7: {
        const ringsGot = W.rings.filter((r) => r.got).length;
        const twins = byName('Penny and Quill');
        objective = 'Silver Moon Gate OPEN! Visit Moon Road, or meet Penny & Quill in Aurora Reach (NE).';
        locationHint = 'Aurora Reach / Moon Gate';
        progressCurrent = Math.min(3, Math.max(ringsGot, visitedMoonRoad ? 3 : twins?.met ? 2 : Math.floor(feathersGot / 2)));
        progressTarget = 3;
        progressUnit = 'Steps';
        break;
      }
      case 8: {
        const ringsGot = W.rings.filter((r) => r.got).length;
        const bellamy = byName('Bellamy');
        objective = 'Befriend Bellamy in Chime Canopy (N) or fly 2 Rainbow Rings by Cirrus Castle to unseal Glowdeep!';
        locationHint = 'Chime Canopy (N) / Cirrus Castle';
        progressCurrent = Math.min(3, Math.max(ringsGot, bellamy?.fr ? 3 : bellamy?.met ? 2 : 0));
        progressTarget = 3;
        progressUnit = 'Steps';
        break;
      }
      case 9: {
        const lq = qByTitle('Soup of Remembering');
        const lNeed = lq?.n ?? 5;
        const sporesGot = W.glowSpores.filter((s) => s.got).length;
        locationHint = 'Glowdeep Roots (Lantern Tree)';
        progressTarget = lNeed;
        progressUnit = 'Spores';
        progressCurrent = Math.min(lNeed, Math.max(lq?.c ?? 0, sporesGot));
        if (lq && lq.st === 1) {
          objective =
            lq.c >= lNeed
              ? 'Return to Lumi in Glowdeep to brew the Soup of Remembering!'
              : `Collect Glowcap Spores (${lq.c}/${lNeed}) inside Glowdeep for Lumi.`;
        } else {
          objective = 'Enter Glowdeep Roots by the Lantern Tree & collect 5 Glowcap Spores with Lumi.';
        }
        break;
      }
      case 10: {
        const moonNotesGot = W.moonNotes.filter((n) => n.got).length;
        objective = 'Step through the Silver Moon Gate & meet The Moon or Dusk along the Moon Road.';
        locationHint = 'Moon Road (Lantern Tree Gate)';
        progressCurrent = Math.min(2, (visitedMoonRoad || W.player.moonroad ? 1 : 0) + (moonNotesGot >= 3 ? 1 : 0));
        progressTarget = 2;
        progressUnit = 'Steps';
        break;
      }
      case 11: {
        const dawnTown = W.towns.find((t) => t.n === 'Dawn Spire Summit');
        objective = 'Travel to Dawn Spire on the eastern shore & meet Aurelle!';
        locationHint = 'Dawn Spire (East)';
        progressCurrent = Math.min(2, (dawnTown?.vis === 1 ? 1 : 0) + (friendsCount >= 5 ? 1 : 0));
        progressTarget = 2;
        progressUnit = 'Steps';
        break;
      }
      case 12:
        objective = 'Sing the Dawn Duet via the Quest Tracker button or with Aurelle, Wick, or the Lantern Tree!';
        locationHint = 'Dawn Spire / Anywhere in Ch. 12';
        progressCurrent = 1;
        progressTarget = 2;
        progressUnit = 'Finale';
        break;
      default:
        objective = chInfo.goal;
        locationHint = 'Mochi Meadows';
        progressCurrent = questsDone;
        progressTarget = questsTotal;
        progressUnit = 'Quests';
        break;
    }

    return {
      chapterNum: chInfo.num,
      chapterTitle: chInfo.title,
      actLabel: chInfo.act,
      objective,
      locationHint,
      progressCurrent,
      progressTarget,
      progressUnit,
      everlightMode: false,
      activeSideQuest,
    };
  };

  const nearbyPortal = gameState === 'playing' ? getNearbyPortal() : null;
  const is3DActive = webglReady;
  is3DActiveRef.current = is3DActive;
  const activeCamPresetLabel = CAMERA_PRESET_LABELS[settings.camPreset ?? 0] ?? 'Cozy 3/4';
  const is3DOccluded =
    activeCutscene !== null ||
    (gameState !== 'playing' && activeModal !== 'none') ||
    (gameState === 'playing' &&
      activeModal !== 'none' &&
      activeModal !== 'dialog' &&
      !(activeModal === 'cottage' && playerPos.house));

  return (
    <div
      className="fixed inset-0 w-full h-full overflow-hidden select-none bg-[#181028]"
      onWheel={(e) => {
        if (!is3DActive || gameState !== 'playing' || activeModal !== 'none' || activeCutscene) return;
        const delta = Math.sign(e.deltaY) * 0.08;
        camera3DStateRef.current.zoom = Math.max(0.65, Math.min(1.55, camera3DStateRef.current.zoom + delta));
      }}
    >
      {/* 3D WebGL Storybook Diorama Layer */}
      <div
        ref={threeMountRef}
        aria-hidden="true"
        className={`fixed inset-0 z-0 pointer-events-none ${is3DActive && !is3DOccluded ? 'opacity-100 visible' : 'opacity-0 invisible'}`}
      />

      {/* Transparent 2D HUD projection overlay above 3D world canvas */}
      <canvas
        ref={canvasRef}
        onContextMenu={(e) => {
          if (is3DActive) e.preventDefault();
        }}
        onMouseDown={(e) => {
          if (!is3DActive || gameState !== 'playing' || activeModal !== 'none' || activeCutscene) return;
          if (e.button === 0 || e.button === 1 || e.button === 2) {
            const cam = camera3DStateRef.current;
            cam.pointerDown = true;
            cam.dragging = e.button === 2 || e.button === 1 || (e.button === 0 && e.shiftKey);
            cam.startX = e.clientX;
            cam.startY = e.clientY;
            cam.lastX = e.clientX;
            cam.lastY = e.clientY;
            cam.didDrag = false;
          }
        }}
        onMouseMove={(e) => {
          const cam = camera3DStateRef.current;
          if (!cam.pointerDown) return;
          const dx = e.clientX - cam.lastX;
          const dy = e.clientY - cam.lastY;
          cam.lastX = e.clientX;
          cam.lastY = e.clientY;
          if (!cam.dragging && Math.hypot(e.clientX - cam.startX, e.clientY - cam.startY) > 5) {
            cam.dragging = true;
          }
          if (!cam.dragging) return;
          cam.didDrag = true;
          cam.yaw -= dx * 0.008;
          cam.pitch = Math.max(-0.55, Math.min(0.65, cam.pitch - dy * 0.0055));
        }}
        onMouseUp={() => {
          camera3DStateRef.current.pointerDown = false;
          camera3DStateRef.current.dragging = false;
        }}
        onMouseLeave={() => {
          camera3DStateRef.current.pointerDown = false;
          camera3DStateRef.current.dragging = false;
        }}
        onTouchStart={(e) => {
          if (!is3DActive || gameState !== 'playing' || activeModal !== 'none' || activeCutscene) return;
          const cam = camera3DStateRef.current;
          // Use e.targetTouches (touches on the canvas itself) so Finger 1 on the joystick
          // never blocks Finger 2 from rotating/zooming the 3D camera on the canvas.
          if (e.targetTouches.length === 1) {
            const t0 = e.targetTouches[0];
            cam.touchId = t0.identifier;
            cam.pointerDown = true;
            cam.dragging = false;
            cam.startX = t0.clientX;
            cam.startY = t0.clientY;
            cam.lastX = t0.clientX;
            cam.lastY = t0.clientY;
            cam.didDrag = false;
            cam.pinchStartDist = 0;
          } else if (e.targetTouches.length >= 2) {
            const t0 = e.targetTouches[0];
            const t1 = e.targetTouches[1];
            cam.pinchStartDist = Math.max(12, Math.hypot(t1.clientX - t0.clientX, t1.clientY - t0.clientY));
            cam.pinchStartZoom = cam.zoom;
            cam.pointerDown = false;
            cam.dragging = false;
            cam.touchId = null;
            cam.didDrag = true;
          }
        }}
        onTouchMove={(e) => {
          const cam = camera3DStateRef.current;
          if (e.targetTouches.length >= 2 && cam.pinchStartDist > 0) {
            const t0 = e.targetTouches[0];
            const t1 = e.targetTouches[1];
            const dist = Math.hypot(t1.clientX - t0.clientX, t1.clientY - t0.clientY);
            cam.zoom = Math.max(0.65, Math.min(1.55, cam.pinchStartZoom * (dist / cam.pinchStartDist)));
            cam.didDrag = true;
            return;
          }
          if (!cam.pointerDown || cam.touchId === null) return;
          let tMatch: React.Touch | null = null;
          for (let i = 0; i < e.targetTouches.length; i++) {
            if (e.targetTouches[i].identifier === cam.touchId) {
              tMatch = e.targetTouches[i];
              break;
            }
          }
          if (!tMatch) return;
          const dx = tMatch.clientX - cam.lastX;
          const dy = tMatch.clientY - cam.lastY;
          cam.lastX = tMatch.clientX;
          cam.lastY = tMatch.clientY;
          if (!cam.dragging && Math.hypot(tMatch.clientX - cam.startX, tMatch.clientY - cam.startY) > 6) {
            cam.dragging = true;
          }
          if (!cam.dragging) return;
          cam.didDrag = true;
          cam.yaw -= dx * 0.009;
          cam.pitch = Math.max(-0.55, Math.min(0.65, cam.pitch - dy * 0.006));
        }}
        onTouchEnd={(e) => {
          const cam = camera3DStateRef.current;
          if (e.targetTouches.length >= 2) {
            const t0 = e.targetTouches[0];
            const t1 = e.targetTouches[1];
            cam.pinchStartDist = Math.max(12, Math.hypot(t1.clientX - t0.clientX, t1.clientY - t0.clientY));
            cam.pinchStartZoom = cam.zoom;
            return;
          }
          cam.pinchStartDist = 0;
          if (e.targetTouches.length === 1) {
            const rem = e.targetTouches[0];
            cam.touchId = rem.identifier;
            cam.pointerDown = true;
            cam.dragging = false;
            cam.startX = rem.clientX;
            cam.startY = rem.clientY;
            cam.lastX = rem.clientX;
            cam.lastY = rem.clientY;
            return;
          }
          cam.pointerDown = false;
          cam.dragging = false;
          cam.touchId = null;
        }}
        onTouchCancel={(e) => {
          const cam = camera3DStateRef.current;
          cam.pinchStartDist = 0;
          if (e.targetTouches.length === 0) {
            cam.pointerDown = false;
            cam.dragging = false;
            cam.touchId = null;
          }
        }}
        onClick={(e) => {
          if (camera3DStateRef.current.didDrag) {
            camera3DStateRef.current.didDrag = false;
            return;
          }
          if (worldRef.current.touchJoystick.active) {
            return;
          }
          if (gameState !== 'playing' || activeModal !== 'none' || activeCutscene) return;
          const canvas = canvasRef.current;
          if (!canvas) return;
          const rect = canvas.getBoundingClientRect();
          const W = worldRef.current;

          if (is3DActive && renderer3DRef.current) {
            const layerName3D: 'surface' | 'sky' | 'dive' | 'glowdeep' | 'moonroad' | 'house' = W.player.house
              ? 'house'
              : W.player.sky
              ? 'sky'
              : W.player.dive
              ? 'dive'
              : W.player.glowdeep
              ? 'glowdeep'
              : W.player.moonroad
              ? 'moonroad'
              : 'surface';
            const planeY = getTerrainHeight3D(W.player.x / T, W.player.y / T, layerName3D, W.B, W.SB, W.iceMap, W.lilyMap);
            const hit = { x: W.player.x, y: W.player.y };
            if (renderer3DRef.current.raycastGroundPoint(e.clientX, e.clientY, rect, planeY, hit)) {
              W.player.moveTarget = hit;
            }
            return;
          }

          const z = device.viewScale || 1;
          const wx = (W.camera.initialized ? W.camera.x : W.player.x) + (e.clientX - rect.left - rect.width / 2) / z;
          const wy = (W.camera.initialized ? W.camera.y : W.player.y) + (e.clientY - rect.top - rect.height / 2) / z;
          W.player.moveTarget = {
            x: Math.max(T * 1.5, Math.min((N - 1.5) * T, wx)),
            y: Math.max(T * 1.5, Math.min((N - 1.5) * T, wy)),
          };
        }}
        className="relative z-1 block w-full h-full touch-none cursor-pointer"
      />

      {/* Title Screen */}
      {gameState === 'title' && (
        <TitleScreen
          hasSavedGame={Boolean(readSlotSaveRaw(currentSlot))}
          playerLook={playerLook}
          currentSlot={currentSlot}
          slotSummaries={readSlotSummaries()}
          season={currentSeason}
          weather={currentWeather}
          is3DBackdrop={is3DActive}
          onSelectSlot={handleSelectSlot}
          onDeleteSlot={handleDeleteSlot}
          onContinue={() => {
            audio.init();
            snapCamera();
            setGameState('playing');
          }}
          onNewGame={(preserveEmptySlotLook) => handleStartNewGame(Boolean(preserveEmptySlotLook))}
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
          heartsGot={worldRef.current.npcs.filter((n) => n.fr && !n.sky && !n.tree && !n.sea && !n.glowdeep && !n.moonroad).length}
          heartsTotal={worldRef.current.npcs.filter((n) => !n.sky && !n.tree && !n.sea && !n.glowdeep && !n.moonroad).length || 8}
          skyHeartsGot={worldRef.current.npcs.filter((n) => n.fr && n.sky).length}
          questsDone={worldRef.current.quests.filter((q) => q.st === 3).length}
          questsTotal={worldRef.current.quests.length}
          coins={coins}
          objectiveText={getObjectiveText()}
          questTracker={getQuestTrackerData()}
          achievementsUnlocked={unlockedAchievements.length}
          achievementsTotal={ACHIEVEMENTS.length}
          onOpenAchievements={() => {
            setJournalInitialTab('achievements');
            setActiveModal('journal');
          }}
          canSingDawnDuet={currentChapter >= 12 && !lullabyDone}
          onSingDawnDuet={completeDawnDuetFinale}
          stamina={stamina}
          air={air}
          mana={mana}
          isDiving={playerPos.dive}
          isSwimming={playerPos.swim}
          isSky={playerPos.sky}
          isGlowdeep={playerPos.glowdeep}
          isMoonRoad={playerPos.moonroad}
          canDive={(playerPos.dive || playerPos.swim) && !playerPos.sky && !playerPos.glowdeep && !playerPos.moonroad && !playerPos.house}
          canFish={canFish()}
          nearNpc={Boolean(activeNpc)}
          nearbyTownAction={nearbyTownAction}
          onTownInteract={() => {
            if (!nearbyTownAction) return;
            audio.init();
            setActiveMarketTown(nearbyTownAction.townName);
            setMarketInitialTab(nearbyTownAction.kind);
            setActiveModal('market');
          }}
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
              activeNpc.met = true;
              setActiveModal('dialog');
            }
          }}
          onFish={() => setActiveModal('fishing')}
          onToggleMusic={cycleMusic}
          onOpenMap={() => setActiveModal('map')}
          onOpenJournal={() => {
            setJournalInitialTab('quests');
            setActiveModal('journal');
          }}
          onOpenPause={() => {
            setPauseInitialTab('menu');
            setActiveModal('pause');
          }}
          onOpenGazette={() => {
            markGazetteSlotSeen();
            setHasNewGazette(false);
            setActiveModal('gazette');
          }}
          hasNewGazette={hasNewGazette}
          musicIcon={currentTrackIdx === 15 ? '🔇' : '🎵'}
          hasCustomMusic={audio.customTracks.length > 0}
          weather={currentWeather}
          season={currentSeason}
          seasonRemainingSec={seasonRemainingSec}
          isTouch={device.isTouch}
          isPhone={device.isPhone}
          isTablet={device.isTablet}
          isLandscapePhone={device.isLandscapePhone}
          isCompactPhone={device.isCompactPhone}
          is3D={is3DActive}
          cameraPresetLabel={activeCamPresetLabel}
          cameraPresetIdx={settings.camPreset ?? 0}
          onCycleCamera={cycleCameraPreset}
          onSelectCameraPreset={selectCameraPreset}
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
          season={currentSeason}
          nearNpc={Boolean(activeNpc)}
          activeNpcName={activeNpc?.n}
          nearbyTownAction={nearbyTownAction}
          onTownInteract={() => {
            if (!nearbyTownAction) return;
            audio.init();
            setActiveMarketTown(nearbyTownAction.townName);
            setMarketInitialTab(nearbyTownAction.kind);
            setActiveModal('market');
          }}
          canDive={(playerPos.dive || playerPos.swim) && !playerPos.sky && !playerPos.glowdeep && !playerPos.moonroad && !playerPos.house}
          isDiving={playerPos.dive}
          isSwimming={playerPos.swim}
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
          onJump={handleJump}
          onTalk={() => {
            if (activeNpc) {
              audio.init();
              activeNpc.met = true;
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
        />
      )}

      {/* 3D Mochi House Interior Room Navigator & Quick Controls */}
      {gameState === 'playing' && playerPos.house && activeModal === 'none' && !activeCutscene && (
        <div
          className={`fixed left-1/2 -translate-x-1/2 z-30 pointer-events-auto flex flex-col items-center gap-1.5 max-w-[94vw] ${
            device.isTouch ? 'top-2 pt-safe' : 'bottom-[max(4.75rem,calc(env(safe-area-inset-bottom,0px)+4.75rem))]'
          }`}
        >
          {activeHouseInteractable && (
            <button
              type="button"
              {...multiTouchTap(() => handleHouseAction(activeHouseInteractable.id))}
              className="px-3.5 py-1.5 rounded-2xl touch-none bg-linear-to-r from-[#ff7aa8] to-[#f46496] text-white font-black text-xs shadow-lg border border-white/60 flex items-center gap-1.5 cursor-pointer hover:brightness-105 active:scale-95 transition-transform"
            >
              <span>{activeHouseInteractable.icon}</span>
              <span>
                [{activeHouseInteractable.id === 'exit_house' ? 'F / E' : 'E'}] {activeHouseInteractable.label}
              </span>
            </button>
          )}
          <div className="storybook-panel border border-[#ffd3e2] dark:border-[#6b4a7a] rounded-2xl p-1 flex items-center gap-1 overflow-x-auto scrollbar-none shadow-lg max-w-full">
            {(
              [
                { id: 'living', icon: '🛋️', label: 'Living' },
                { id: 'kitchen', icon: '🍳', label: 'Kitchen' },
                { id: 'bedroom', icon: '🛏️', label: 'Bedroom' },
                { id: 'study', icon: '📚', label: 'Study' },
                { id: 'conservatory', icon: '🌿', label: 'Sunroom' },
                { id: 'bath', icon: '🛁', label: 'Bath' },
              ] as { id: HouseRoomId; icon: string; label: string }[]
            ).map((rm) => {
              const curRoom = getHouseRoomAt(playerPos.x, playerPos.y);
              const active = curRoom === rm.id;
              return (
                <button
                  key={rm.id}
                  type="button"
                  {...multiTouchTap(() => jumpToHouseRoom3D(rm.id))}
                  className={`px-2 py-1 rounded-xl touch-none text-[11px] font-black whitespace-nowrap shrink-0 flex items-center gap-1 cursor-pointer transition-colors ${
                    active
                      ? 'bg-[#ff7aa8] text-white shadow-xs'
                      : 'text-[#4a3550] dark:text-[#fdeeff] hover:bg-[#ffd3e2]/55 dark:hover:bg-[#5a3a6b]/60'
                  }`}
                >
                  <span>{rm.icon}</span>
                  <span className="hidden sm:inline">{rm.label}</span>
                </button>
              );
            })}
            <span className="w-px h-5 bg-[#e4b8ca] dark:bg-[#5f4070] shrink-0 mx-0.5" />
            <button
              type="button"
              {...multiTouchTap(() => setActiveModal('cottage'))}
              className="px-2.5 py-1 rounded-xl touch-none bg-[#ffd23f] hover:brightness-105 text-[#4a3550] text-[11px] font-black whitespace-nowrap shrink-0 flex items-center gap-1 cursor-pointer"
              title="Open House Decorator & Hamlet (Key H)"
            >
              <span>🎨</span>
              <span>Decorate</span>
            </button>
            <button
              type="button"
              {...multiTouchTap(exitHouse3D)}
              className="px-2.5 py-1 rounded-xl touch-none storybook-well hover:border-[#ff7aa8] border border-transparent text-[#4a3550] dark:text-[#fdeeff] text-[11px] font-black whitespace-nowrap shrink-0 flex items-center gap-1 cursor-pointer"
              title="Step Outside onto Lantern Isle"
            >
              <span>🚪</span>
              <span className="hidden sm:inline">Exit</span>
            </button>
          </div>
        </div>
      )}

      {/* Celebratory Chapter & Achievement Milestone Banner (Queued, Non-Overwriting) */}
      {milestoneQueue[0] && (
        <div
          key={milestoneQueue[0].id}
          className={`fixed left-1/2 -translate-x-1/2 z-50 pointer-events-none w-[90vw] max-w-md animate-in fade-in slide-in-from-top-4 duration-200 ${
            device.isLandscapePhone ? 'top-2' : 'top-3 sm:top-5'
          }`}
        >
          <div
            className={`storybook-modal rounded-2xl px-4 py-2.5 border-2 shadow-xl flex items-center gap-3 ${
              milestoneQueue[0].kind === 'achievement'
                ? 'border-[#ffd23f] bg-linear-to-r from-[#fff9e2]/95 to-[#ffeaf2]/95 dark:from-[#36264a]/95 dark:to-[#2b1f3b]/95'
                : 'border-[#ff7aa8] bg-linear-to-r from-[#fff4f9]/95 to-[#fff9df]/95 dark:from-[#3a2346]/95 dark:to-[#281b35]/95'
            }`}
          >
            <span className="w-10 h-10 rounded-xl bg-linear-to-br from-[#ffd23f]/35 to-[#ff7aa8]/35 border border-[#ffd23f]/60 flex items-center justify-center text-2xl shrink-0">
              {milestoneQueue[0].icon}
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-[9.5px] sm:text-[10px] font-black uppercase tracking-wider text-[#d85784] dark:text-[#ffd23f]">
                {milestoneQueue[0].eyebrow}
              </div>
              <div className="text-xs sm:text-sm font-black text-[#4a3550] dark:text-[#fdeeff] truncate">
                {milestoneQueue[0].title}
              </div>
              <div className="text-[10px] sm:text-[11px] font-bold text-[#5a425f]/85 dark:text-[#e2d4f0]/85 truncate">
                {milestoneQueue[0].subtitle}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div
          className={`fixed left-1/2 -translate-x-1/2 z-40 storybook-panel border-2 border-[#ffd3e2] dark:border-[#6b4a7a] text-[#4a3550] dark:text-[#fdeeff] px-4 sm:px-5 py-1.5 sm:py-2.5 rounded-full font-black text-[11px] sm:text-sm animate-in fade-in slide-in-from-top-4 duration-150 whitespace-nowrap max-w-[92vw] truncate pointer-events-none ${
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
            checkAchFnRef.current();
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
            checkAchFnRef.current();
          }}
          onAcceptQuest={(q) => {
            if (q.k === 'c' && q.c >= (q.n || 1)) {
              q.st = 2;
              showToast(`Accepted & ready to turn in: ${q.t}! 🎁`);
            } else {
              q.st = 1;
              showToast(`Accepted quest: ${q.t}! 📜`);
            }
            setQuestRevision((r) => r + 1);
            evaluateStoryProgress();
            checkAchFnRef.current();
          }}
          onTurnInQuest={(q) => {
            q.st = 3;
            setCoins((c) => c + 25);
            setTotalCoins((c) => c + 25);
            setQuestRevision((r) => r + 1);
            audio.chime();
            showToast(`Quest completed: ${q.t}! +25 coins! 🎁`);
            setLoreEntries((prev) =>
              prev.some((l) => l.id === `q-${q.t}`) ? prev : [...prev, { id: `q-${q.t}`, t: q.t, x: q.l }]
            );
            evaluateStoryProgress();
            checkAchFnRef.current();
          }}
          onDeliverQuest={(q) => {
            q.st = 2;
            setQuestRevision((r) => r + 1);
            showToast(`Delivered item for ${q.t}! Return to ${q.g} to finish.`);
            evaluateStoryProgress();
          }}
          onBuyItem={(itemId, cost) => {
            const shopDef = SHOP_ITEMS.find((s) => s.id === itemId);
            const W = worldRef.current;
            setCoins((c) => Math.max(0, c - cost));
            audio.chime();
            if (shopDef?.consumable) {
              if (itemId === 'tonic') {
                W.player.mp = 100;
                showToast('Drank Mana Tonic! Magic restored ✨');
              } else if (itemId === 'snack') {
                W.player.st = 100;
                W.player.o2 = 100;
                showToast('Ate Stamina Snack! Energy & Air full 🥐');
              } else if (itemId === 'honey_tart') {
                W.player.st = 100;
                W.player.mp = 100;
                W.marketSpeedTimer = Math.max(W.marketSpeedTimer, 45);
                showToast('Sun-Glazed Honey Tart! +22% Speed for 45s 🍯');
              } else if (itemId === 'tide_chowder') {
                W.player.st = 100;
                W.player.o2 = 100;
                W.marketDiveTimer = Math.max(W.marketDiveTimer, 60);
                showToast('Harbor Pearl Chowder! Diving grace for 60s 🍲');
              } else if (itemId === 'cinder_cocoa') {
                W.player.st = 100;
                W.player.mp = 100;
                W.marketWarmthTimer = Math.max(W.marketWarmthTimer, 45);
                showToast('Cinder Spice Cocoa! Frost immunity & warmth for 45s ☕');
              } else if (itemId === 'starlight_tea') {
                W.player.mp = 100;
                W.player.st = 100;
                W.marketLuckTimer = Math.max(W.marketLuckTimer, 60);
                showToast('Moonbeam Steeped Tea! +35% Coin Charm for 60s 🫖');
              }
              setMana(Math.round(W.player.mp));
              setStamina(Math.round(W.player.st));
              setAir(Math.round(W.player.o2));
              spawnWorldPopup(W.player.x, W.player.y - 18, `${shopDef.icon} ${shopDef.name}!`, '#ffe89e');
            } else {
              setUpgrades((prev) => ({ ...prev, [itemId]: 1 }));
              showToast(`Unlocked ${shopDef?.name || 'upgrade'}! ✨`);
            }
          }}
          ownedUpgrades={upgrades}
          weather={currentWeather}
        />
      )}

      {/* Interactive Town Bazaar, Fish Scales & Community Noticeboard Modal */}
      {activeModal === 'market' && (
        <MarketModal
          townName={activeMarketTown}
          prosperity={townProsperity[activeMarketTown] || 1}
          coins={coins}
          upgrades={upgrades}
          fishLog={fishLog}
          completedRequests={completedTownRequests}
          stats={{
            stars: worldRef.current.stars.filter((s) => s.got).length,
            pearls: worldRef.current.pearls.filter((p) => p.got).length,
            feathers: worldRef.current.feathers.filter((f) => f.got).length,
            friends: worldRef.current.npcs.filter((n) => n.fr).length,
            fishCaught: Object.values(fishLog).reduce((sum, count) => sum + count, 0),
          }}
          initialTab={marketInitialTab}
          onClose={() => setActiveModal('none')}
          onBuyItem={(itemId, cost) => {
            const shopDef = SHOP_ITEMS.find((s) => s.id === itemId);
            const W = worldRef.current;
            setCoins((c) => Math.max(0, c - cost));
            audio.chime();
            if (shopDef?.consumable) {
              if (itemId === 'tonic') {
                W.player.mp = 100;
                showToast('Drank Mana Tonic! Magic restored ✨');
              } else if (itemId === 'snack') {
                W.player.st = 100;
                W.player.o2 = 100;
                showToast('Ate Stamina Snack! Energy & Air full 🥐');
              } else if (itemId === 'honey_tart') {
                W.player.st = 100;
                W.player.mp = 100;
                W.marketSpeedTimer = Math.max(W.marketSpeedTimer, 45);
                showToast('Sun-Glazed Honey Tart! +22% Speed for 45s 🍯');
              } else if (itemId === 'tide_chowder') {
                W.player.st = 100;
                W.player.o2 = 100;
                W.marketDiveTimer = Math.max(W.marketDiveTimer, 60);
                showToast('Harbor Pearl Chowder! Diving grace for 60s 🍲');
              } else if (itemId === 'cinder_cocoa') {
                W.player.st = 100;
                W.player.mp = 100;
                W.marketWarmthTimer = Math.max(W.marketWarmthTimer, 45);
                showToast('Cinder Spice Cocoa! Frost immunity & warmth for 45s ☕');
              } else if (itemId === 'starlight_tea') {
                W.player.mp = 100;
                W.player.st = 100;
                W.marketLuckTimer = Math.max(W.marketLuckTimer, 60);
                showToast('Moonbeam Steeped Tea! +35% Coin Charm for 60s 🫖');
              }
              setMana(Math.round(W.player.mp));
              setStamina(Math.round(W.player.st));
              setAir(Math.round(W.player.o2));
              spawnWorldPopup(W.player.x, W.player.y - 18, `${shopDef.icon} ${shopDef.name}!`, '#ffe89e');
            } else {
              setUpgrades((prev) => ({ ...prev, [itemId]: 1 }));
              showToast(`Unlocked ${shopDef?.name || 'upgrade'}! ✨`);
            }
          }}
          onSellFish={(fishName, sellAll, unitPrice) => {
            const curQty = fishLogRef.current[fishName] || 0;
            if (curQty <= 0) return;
            const qtySold = sellAll ? curQty : 1;
            const payout = qtySold * unitPrice;
            setFishLog((prev) => {
              const next = { ...prev, [fishName]: Math.max(0, (prev[fishName] || 0) - qtySold) };
              fishLogRef.current = next;
              return next;
            });
            setCoins((c) => c + payout);
            setTotalCoins((c) => c + payout);
            audio.chime();
            spawnWorldPopup(worldRef.current.player.x, worldRef.current.player.y - 18, `+${payout} 🪙 🐟`, '#a8f0c6');
          }}
          onFulfillRequest={(req) => {
            if (completedTownRequestsRef.current.includes(req.id)) return;
            const coinCost = req.requirementKind === 'coins_donate' ? req.targetCount : 0;
            if (coinCost > coinsRef.current) return;
            setCompletedTownRequests((prev) => [...prev, req.id]);
            setTownProsperity((prev) => {
              const nextLevel = Math.min(3, (prev[req.townName] || 1) + 1);
              const next = { ...prev, [req.townName]: nextLevel };
              const matchingTown = worldRef.current.towns.find((t) => t.n === req.townName);
              if (matchingTown) matchingTown.prosperity = nextLevel;
              return next;
            });
            const netDelta = req.rewardCoins - coinCost;
            setCoins((c) => Math.max(0, c + netDelta));
            setTotalCoins((c) => c + req.rewardCoins);
            audio.chime();
            showToast(`🌟 ${req.townName} completed "${req.title}"! (+${req.rewardCoins} 🪙)`);
            spawnWorldPopup(worldRef.current.player.x, worldRef.current.player.y - 22, `🎉 ${req.townName} Tier Up!`, '#ffd23f');
          }}
        />
      )}

      {/* Story Journal Modal */}
      {activeModal === 'journal' && (
        <JournalModal
          objective={getObjectiveText()}
          lore={loreEntries}
          quests={worldRef.current.quests}
          unlockedCutscenes={unlockedCutscenes}
          unlockedAchievements={unlockedAchievements}
          currentChapter={currentChapter}
          lullabyDone={lullabyDone}
          initialTab={journalInitialTab}
          season={currentSeason}
          onClose={() => setActiveModal('none')}
          onPlayCutscene={(key) => triggerCutscene(key)}
        />
      )}

      {/* Wardrobe Modal */}
      {activeModal === 'wardrobe' && (
        <WardrobeModal
          look={playerLook}
          onUpdateLook={(up) =>
            setPlayerLook((prev) => {
              const next = { ...prev, ...up };
              playerLookRef.current = next;
              return next;
            })
          }
          onClose={() => {
            if (gameStateRef.current === 'playing' || readSlotSaveRaw(currentSlotRef.current)) {
              handleSaveGame(false);
            }
            setActiveModal('none');
          }}
          onSave={() => handleSaveGame(true)}
          onCopySaveCode={() => {
            const code = btoa(JSON.stringify(serializeSaveSnapshot()));
            navigator.clipboard.writeText(code);
            showToast(`Slot ${currentSlotRef.current} save code copied to clipboard! 📋`);
          }}
          onLoadSaveCode={(code?: string) => {
            if (!code) return;
            try {
              const parsed = JSON.parse(atob(code));
              if (parsed && (typeof parsed.worldN === 'number' || typeof parsed.ch === 'number')) {
                applySaveSnapshotToState(parsed);
              } else {
                if (parsed.L) {
                  setPlayerLook((prev) => {
                    const next = { ...prev, ...parsed.L };
                    playerLookRef.current = next;
                    return next;
                  });
                }
                if (typeof parsed.coins === 'number') {
                  coinsRef.current = parsed.coins;
                  setCoins(parsed.coins);
                }
              }
              handleSaveGame(false);
              showToast(`Save loaded into Slot ${currentSlotRef.current}! 📥`);
            } catch (e) {
              showToast('Invalid save code');
            }
          }}
          onNewGame={() => handleStartNewGame(false)}
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
          currentSlot={currentSlot}
          onStartFreshInSlot={() => handleStartNewGame(false)}
          settings={settings}
          onUpdateSettings={(key, val) => {
            setSettings((prev) => {
              if (key === 'camPreset') {
                alignCameraForPreset(prev.camPreset ?? 0, val);
              }
              const updated = { ...prev, [key]: val };
              localStorage.setItem(LOCAL_STORAGE_SETTINGS_KEY, JSON.stringify(updated));
              return updated;
            });
          }}
          onExportSave={serializeSaveSnapshot}
          onImportSave={(data) => {
            applySaveSnapshotToState(data);
            handleSaveGame(false);
            return true;
          }}
          currentSeason={currentSeason}
          seasonRemainingSec={seasonRemainingSec || SEASON_DURATION_SEC}
          currentWeather={currentWeather}
          currentWeatherId={currentWeather.id}
          weatherRemainingSec={weatherRemainingSec}
          initialTab={pauseInitialTab}
          isTitleScreen={gameState === 'title'}
          onOpenMap={() => setActiveModal('map')}
          onOpenSongWeaver={() => setActiveModal('songweaver')}
          onOpenCottage={() => setActiveModal('cottage')}
          onOpenBottles={() => setActiveModal('bottles')}
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
          season={currentSeason}
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
            if (!unlockedAchievementsRef.current.includes('song_weaver')) {
              setUnlockedAchievements((prev) => {
                const next = prev.includes('song_weaver') ? prev : [...prev, 'song_weaver'];
                unlockedAchievementsRef.current = next;
                return next;
              });
              const swAch = ACHIEVEMENTS.find((a) => a.id === 'song_weaver');
              if (swAch) {
                enqueueMilestone({
                  id: 'ach-song_weaver',
                  kind: 'achievement',
                  icon: swAch.icon,
                  eyebrow: 'Achievement Unlocked · +15 🪙',
                  title: swAch.title,
                  subtitle: swAch.desc,
                });
                setCoins((c) => c + 15);
                setTotalCoins((c) => c + 15);
              }
            }
            showToast('Pentatonic melody saved to your Moonlit Music Box! 🎶');
          }}
        />
      )}

      {/* Player Cozy Multi-Room 3D House & Mochi Hamlet Modal / Drawer */}
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
          inHouse3D={playerPos.house}
          currentRoom3D={playerPos.house ? getHouseRoomAt(playerPos.x, playerPos.y) : undefined}
          onSelectRoom3D={jumpToHouseRoom3D}
          onEnterHouse3D={is3DActive ? () => enterHouse3D() : undefined}
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
              houseX: WORLD_ANCHORS.towns.mochiHamlet.tx - 10 + Math.floor(Math.random() * 20),
              houseY: WORLD_ANCHORS.towns.mochiHamlet.ty - 8 + Math.floor(Math.random() * 16),
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
            if (!unlockedAchievementsRef.current.includes('song_weaver')) {
              setUnlockedAchievements((prev) => {
                const next = prev.includes('song_weaver') ? prev : [...prev, 'song_weaver'];
                unlockedAchievementsRef.current = next;
                return next;
              });
              const swAch = ACHIEVEMENTS.find((a) => a.id === 'song_weaver');
              if (swAch) {
                enqueueMilestone({
                  id: 'ach-song_weaver',
                  kind: 'achievement',
                  icon: swAch.icon,
                  eyebrow: 'Achievement Unlocked · +15 🪙',
                  title: swAch.title,
                  subtitle: swAch.desc,
                });
                setCoins((c) => c + 15);
                setTotalCoins((c) => c + 15);
              }
            }
            showToast('Music box is chiming your melody! 🎶');
          }}
          onStepOutside={exitHouse3D}
          onClose={() => setActiveModal('none')}
        />
      )}

      {/* Cutscene Overlay */}
      {activeCutscene && (
        <CutsceneOverlay
          key={activeCutsceneKey || 'cutscene'}
          slides={activeCutscene}
          playerLook={playerLook}
          season={currentSeason}
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
          onFinish={finishActiveCutscene}
        />
      )}
    </div>
  );
}
