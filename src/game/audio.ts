/**
 * Mochi Meadows 2: Studio Polyphonic Synthesizer, Adaptive Soundtrack & WAV Exporter
 * Generates lush multi-layered acoustic & celestial compositions with convolution reverb,
 * stereo ping-pong delay, mastering compression, expressive SFX, and offline WAV export.
 */

import { MUSIC_TRACKS, WeatherId, SeasonId } from './constants';

interface SynthNodes {
  ctx: BaseAudioContext;
  fxGain: GainNode;
  dryBus: GainNode;
  noiseBuffer: AudioBuffer;
  panL?: StereoPannerNode;
  panR?: StereoPannerNode;
  panWideL?: StereoPannerNode;
  panWideR?: StereoPannerNode;
}

export interface SongProg {
  bpm: number;
  len: number;
  sw: number;
  f: number;
  rv: number;
  pr: [number, string][];
  p: (nodes: SynthNodes, b: number, s: number, t: number, c: number[], sd: number) => void;
}

interface TrackSlot {
  instanceId: number;
  programId: number;
  song: SongProg;
  dryBus: GainNode;
  fxBus: GainNode;
  nodes: SynthNodes;
  step: number;
}

interface FadingSlot {
  dry: GainNode;
  fx: GainNode;
  timerId: number;
}

interface FxBusRefs {
  delayGain: GainNode | null;
  reverbGain: GainNode | null;
  delayL: DelayNode | null;
  delayR: DelayNode | null;
}

const GLOBAL_SCHEDULER_KEY = '__mochiMeadows2GlobalAudioScheduler__';
const GLOBAL_CONTROLLER_KEY = '__mochiMeadows2TrackController__';
const GLOBAL_MANAGER_KEY = '__mochiMeadows2AudioManager__';

/**
 * Single-Instance Track Controller:
 * Enforces that only ONE active biome/theme track instance can exist and play at any moment,
 * while orchestrating smooth cross-fade transitions and deterministic node cleanup.
 */
class SingleInstanceTrackController {
  private activeSlot: TrackSlot | null = null;
  private fadingSlots: Map<number, FadingSlot> = new Map();
  private nextInstanceId: number = 1;

  public static getInstance(): SingleInstanceTrackController {
    const g = globalThis as Record<string, unknown>;
    const existing = g[GLOBAL_CONTROLLER_KEY] as SingleInstanceTrackController | undefined;
    if (existing) return existing;
    const created = new SingleInstanceTrackController();
    g[GLOBAL_CONTROLLER_KEY] = created;
    return created;
  }

  public getActiveSlot(): TrackSlot | null {
    return this.activeSlot;
  }

  public getActiveProgramId(): number {
    return this.activeSlot ? this.activeSlot.programId : -1;
  }

  private cleanupFadingSlot(id: number) {
    const fading = this.fadingSlots.get(id);
    if (!fading) return;
    window.clearTimeout(fading.timerId);
    try {
      fading.dry.disconnect();
      fading.fx.disconnect();
    } catch {
      // already disconnected
    }
    this.fadingSlots.delete(id);
  }

  private retireActiveSlot(ctx: BaseAudioContext, fadeSec: number) {
    const old = this.activeSlot;
    this.activeSlot = null;
    if (!old) return;

    // Enforce at most one fading tail at a time so rapid zig-zags can never pile up overlapping tracks
    for (const oldFadeId of Array.from(this.fadingSlots.keys())) {
      this.cleanupFadingSlot(oldFadeId);
    }

    const now = ctx.currentTime;
    try {
      old.dryBus.gain.cancelScheduledValues(now);
      old.fxBus.gain.cancelScheduledValues(now);
      old.dryBus.gain.setValueAtTime(Math.max(0.0001, old.dryBus.gain.value), now);
      old.fxBus.gain.setValueAtTime(Math.max(0.0001, old.fxBus.gain.value), now);
      old.dryBus.gain.linearRampToValueAtTime(0.0001, now + fadeSec);
      old.fxBus.gain.linearRampToValueAtTime(0.0001, now + fadeSec);
    } catch {
      // ignore closed context errors
    }

    const timerId = window.setTimeout(() => {
      this.cleanupFadingSlot(old.instanceId);
    }, Math.ceil((fadeSec + 0.14) * 1000));

    this.fadingSlots.set(old.instanceId, {
      dry: old.dryBus,
      fx: old.fxBus,
      timerId,
    });
  }

  public transitionTo(
    ctx: AudioContext,
    masterDry: GainNode,
    masterFx: GainNode,
    noiseBuffer: AudioBuffer,
    programId: number,
    song: SongProg,
    fxRefs: FxBusRefs,
    crossfadeSec: number = 0.34
  ): TrackSlot {
    if (this.activeSlot && this.activeSlot.programId === programId) {
      return this.activeSlot;
    }

    const hadActive = this.activeSlot !== null;
    const now = ctx.currentTime;

    if (hadActive) {
      this.retireActiveSlot(ctx, crossfadeSec);
      if (fxRefs.delayGain) {
        fxRefs.delayGain.gain.setTargetAtTime(0.01, now, 0.06);
        fxRefs.delayGain.gain.setTargetAtTime(song.f, now + Math.max(0.14, crossfadeSec * 0.7), 0.18);
      }
    } else if (fxRefs.delayGain) {
      fxRefs.delayGain.gain.setTargetAtTime(song.f, now, 0.22);
    }

    if (fxRefs.reverbGain) fxRefs.reverbGain.gain.setTargetAtTime(song.rv, now, 0.22);
    if (fxRefs.delayL) fxRefs.delayL.delayTime.setTargetAtTime((60 / song.bpm) * 0.75, now, 0.15);
    if (fxRefs.delayR) fxRefs.delayR.delayTime.setTargetAtTime((60 / song.bpm) * 1.125, now, 0.15);

    const fadeInSec = hadActive ? Math.min(0.28, crossfadeSec * 0.85) : 0.09;
    const dryBus = ctx.createGain();
    const fxBus = ctx.createGain();
    dryBus.gain.setValueAtTime(0.001, now);
    fxBus.gain.setValueAtTime(0.001, now);
    dryBus.gain.linearRampToValueAtTime(1, now + fadeInSec);
    fxBus.gain.linearRampToValueAtTime(1, now + fadeInSec);
    dryBus.connect(masterDry);
    fxBus.connect(masterFx);

    const mkPan = (panVal: number): StereoPannerNode | undefined => {
      if (typeof ctx.createStereoPanner !== 'function') return undefined;
      const p = ctx.createStereoPanner();
      p.pan.setValueAtTime(panVal, now);
      p.connect(fxBus);
      return p;
    };

    const slot: TrackSlot = {
      instanceId: this.nextInstanceId++,
      programId,
      song,
      dryBus,
      fxBus,
      nodes: {
        ctx,
        dryBus,
        fxGain: fxBus,
        noiseBuffer,
        panL: mkPan(-0.38),
        panR: mkPan(0.38),
        panWideL: mkPan(-0.66),
        panWideR: mkPan(0.66),
      },
      step: 0,
    };

    this.activeSlot = slot;
    return slot;
  }

  public fadeOutActive(ctx: AudioContext | null, fadeSec: number = 0.24) {
    if (!this.activeSlot) return;
    if (!ctx) {
      this.stopAllImmediate();
      return;
    }
    this.retireActiveSlot(ctx, fadeSec);
  }

  public stopAllImmediate() {
    if (this.activeSlot) {
      try {
        this.activeSlot.dryBus.gain.value = 0;
        this.activeSlot.fxBus.gain.value = 0;
        this.activeSlot.dryBus.disconnect();
        this.activeSlot.fxBus.disconnect();
      } catch {
        // ignore disconnected nodes
      }
      this.activeSlot = null;
    }
    for (const id of Array.from(this.fadingSlots.keys())) {
      this.cleanupFadingSlot(id);
    }
  }
}

/**
 * Global Audio Scheduler:
 * Owns the single lookahead scheduling timer across the entire application runtime,
 * enforcing drift/anti-flood protection and background suspend/resume recovery.
 */
class GlobalAudioScheduler {
  private timerId: number | null = null;
  private nextNoteTime: number = 0;
  private tickCallback: ((now: number, getNextTime: () => number, advanceTime: (dt: number) => void) => void) | null = null;
  private activeCtx: AudioContext | null = null;

  public static acquire(): GlobalAudioScheduler {
    const g = globalThis as Record<string, unknown>;
    const existing = g[GLOBAL_SCHEDULER_KEY] as GlobalAudioScheduler | undefined;
    if (existing) {
      existing.stop();
      return existing;
    }
    const created = new GlobalAudioScheduler();
    g[GLOBAL_SCHEDULER_KEY] = created;
    return created;
  }

  public start(
    ctx: AudioContext,
    onTick: (now: number, getNextTime: () => number, advanceTime: (dt: number) => void) => void
  ) {
    this.stop();
    this.activeCtx = ctx;
    this.tickCallback = onTick;
    this.nextNoteTime = ctx.currentTime + 0.06;
    this.timerId = window.setInterval(() => this.tick(), 60);
  }

  public stop() {
    if (this.timerId !== null) {
      window.clearInterval(this.timerId);
      this.timerId = null;
    }
    this.tickCallback = null;
  }

  public reanchor(offsetSec: number = 0.05) {
    if (!this.activeCtx) return;
    this.nextNoteTime = Math.max(this.nextNoteTime, this.activeCtx.currentTime + offsetSec);
    if (this.nextNoteTime < this.activeCtx.currentTime - 0.12) {
      this.nextNoteTime = this.activeCtx.currentTime + offsetSec;
    }
  }

  public resetToNow(offsetSec: number = 0.04) {
    if (!this.activeCtx) return;
    this.nextNoteTime = this.activeCtx.currentTime + offsetSec;
  }

  private tick() {
    const ctx = this.activeCtx;
    if (!ctx || ctx.state !== 'running') return;
    if (typeof document !== 'undefined' && document.hidden) return;
    if (!this.tickCallback) return;

    const now = ctx.currentTime;
    if (this.nextNoteTime < now - 0.12) {
      this.nextNoteTime = now + 0.04;
    }

    this.tickCallback(
      now,
      () => this.nextNoteTime,
      (stepDur: number) => {
        this.nextNoteTime += stepDur;
      }
    );
  }
}

class AudioManager {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private warmthFilter: BiquadFilterNode | null = null;
  private fxGain: GainNode | null = null;
  private dryBus: GainNode | null = null;
  private delayGain: GainNode | null = null;
  private reverbGain: GainNode | null = null;
  private delayL: DelayNode | null = null;
  private delayR: DelayNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private livePanL: StereoPannerNode | undefined;
  private livePanR: StereoPannerNode | undefined;
  private livePanWideL: StereoPannerNode | undefined;
  private livePanWideR: StereoPannerNode | undefined;

  private readonly trackController: SingleInstanceTrackController = SingleInstanceTrackController.getInstance();
  private readonly scheduler: GlobalAudioScheduler = GlobalAudioScheduler.acquire();

  private currentTrack: number = 0;
  private activeBiome: number = 3;
  private ambientBiome: number = 3;
  private pendingBiome: number = -1;
  private pendingBiomeAt: number = 0;
  private volume: number = 0.8;
  private visibilityBound: boolean = false;
  private wasCustomPlayingBeforeHide: boolean = false;

  // Weather / Season / Biome Ambient Soundscape State & Cross-fading Continuous Beds
  private activeWeather: WeatherId = 'sunny';
  private targetWeather: WeatherId = 'sunny';
  private weatherBlend: number = 0;
  private activeSeason: SeasonId = 'spring';
  private ambientEnabled: boolean = true;
  private ambientMasterGain: GainNode | null = null;
  private ambientNoiseBuffer: AudioBuffer | null = null;
  private windBpFilter: BiquadFilterNode | null = null;
  private windLpFilter: BiquadFilterNode | null = null;
  private windGain: GainNode | null = null;
  private rainHpFilter: BiquadFilterNode | null = null;
  private rainLpFilter: BiquadFilterNode | null = null;
  private rainGain: GainNode | null = null;
  private biomeLpFilter: BiquadFilterNode | null = null;
  private biomeGain: GainNode | null = null;
  private ambientTimerId: number | null = null;
  private lastThunderAt: number = 0;
  private lastGustAt: number = 0;
  private lastBirdAt: number = 0;
  private lastSparkleAt: number = 0;
  private lastCritterAt: number = 0;
  private lastAmbientEnvSyncMs: number = 0;
  private activeAmbientVoices: number = 0;
  private gestureResumeBound: boolean = false;
  private isCompactDevice: boolean = false;

  // Custom User Audio
  public customTracks: { name: string; url: string; file: File }[] = [];
  public customIndex: number = 0;
  private customAudio: HTMLAudioElement = new Audio();
  private customSource: AudioBufferSourceNode | null = null;
  public isCustomPlaying: boolean = false;

  public static getInstance(): AudioManager {
    const g = globalThis as Record<string, unknown>;
    const existing = g[GLOBAL_MANAGER_KEY] as AudioManager | undefined;
    if (existing) return existing;
    const created = new AudioManager();
    g[GLOBAL_MANAGER_KEY] = created;
    return created;
  }

  private chordTypes: Record<string, number[]> = {
    M: [0, 4, 7, 12],
    M6: [0, 4, 7, 9],
    M7: [0, 4, 7, 11],
    M9: [0, 4, 7, 11, 14],
    maj13: [0, 4, 7, 11, 14, 21],
    add9: [0, 4, 7, 14],
    m: [0, 3, 7, 12],
    m7: [0, 3, 7, 10],
    m9: [0, 3, 7, 10, 14],
    m11: [0, 3, 7, 10, 14, 17],
    D: [0, 4, 7, 10],
    D9: [0, 4, 7, 10, 14],
    S: [0, 2, 7, 12],
    sus4: [0, 5, 7, 12],
    dim7: [0, 3, 6, 9],
  };

  // Maps all 21 surface biomes (0..20) + 4 realm layers (21..24) to tracks 1..14
  private biomeTracks: number[] = [
    7,  // 0 Deep Sea -> Tide Waltz
    7,  // 1 Shallows -> Tide Waltz
    3,  // 2 Sandy Shore -> Sunny Strum
    3,  // 3 Sunny Meadow -> Sunny Strum
    2,  // 4 Whisper Woods -> Lo-Fi Chill
    1,  // 5 Blossom Grove -> Music Box Waltz
    8,  // 6 Sunbaked Dunes -> Cinder Lounge
    10, // 7 Frosty Tundra -> Aurora
    4,  // 8 Pebble Peaks -> Dreamy Echoes
    6,  // 9 Honeycomb Hills -> Honeyhum
    1,  // 10 Wildflower Terraces -> Music Box Waltz
    7,  // 11 Tidepool Lagoon -> Tide Waltz
    7,  // 12 Coral Shallows -> Tide Waltz
    8,  // 13 Hot Spring Terraces -> Cinder Lounge
    8,  // 14 Cinder Cradle -> Cinder Lounge
    9,  // 15 Lily Marsh -> Fen Whispers
    9,  // 16 Mirror Fens -> Fen Whispers
    10, // 17 Crystal Ice Caves -> Aurora
    11, // 18 Bellwood Floor -> Chimewood
    11, // 19 Chime Canopy -> Chimewood
    14, // 20 Dawn Spire -> The Dawn Duet
    4,  // 21 Cirrus Sky Kingdom -> Dreamy Echoes
    12, // 22 Glowdeep Caverns -> Glowdeep Caverns
    13, // 23 The Moon Road -> The Moon Road
    7,  // 24 Undersea Coral Reef -> Tide Waltz
  ];

  constructor() {
    this.customAudio.volume = 0.7;
    this.customAudio.onended = () => {
      if (this.isCustomPlaying) this.nextCustomTrack();
    };
  }

  private createImpulseBuffer(ctx: BaseAudioContext, seconds: number = 2.8): AudioBuffer {
    const rate = ctx.sampleRate;
    const len = Math.floor(rate * seconds);
    const impulse = ctx.createBuffer(2, len, rate);
    const earlyTaps = [0.008, 0.015, 0.023, 0.034, 0.047];
    for (let k = 0; k < 2; k++) {
      const ch = impulse.getChannelData(k);
      let lp = 0;
      for (let i = 0; i < len; i++) {
        const decay = Math.pow(1 - i / len, 2.25);
        const white = Math.random() * 2 - 1;
        lp = lp * 0.52 + white * 0.48;
        // Fade tail in softly after early reflections so reverb blooms like a real concert hall
        const bloom = Math.min(1, i / Math.max(1, rate * 0.045));
        ch[i] = lp * decay * (0.28 + 0.72 * bloom);
      }
      // Subtle stereo concert-hall early reflections (slightly staggered L/R)
      earlyTaps.forEach((sec, idx) => {
        const tapSample = Math.floor((sec + (k === 1 ? 0.004 : 0)) * rate);
        if (tapSample > 0 && tapSample < len) {
          ch[tapSample] += (idx % 2 === 0 ? 1 : -1) * (0.36 / (idx + 1));
        }
      });
    }
    return impulse;
  }

  private createNoiseBuffer(ctx: BaseAudioContext): AudioBuffer {
    const rate = ctx.sampleRate;
    const buf = ctx.createBuffer(1, Math.floor(rate * 0.35), rate);
    const nd = buf.getChannelData(0);
    for (let i = 0; i < nd.length; i++) {
      nd[i] = Math.random() * 2 - 1;
    }
    return buf;
  }

  private createWarmSaturationCurve(): Float32Array<ArrayBuffer> {
    const samples = 256;
    const curve = new Float32Array(samples);
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / (samples - 1) - 1;
      curve[i] = Math.tanh(x * 1.16) / Math.tanh(1.16);
    }
    return curve;
  }

  private createStagePanners(ctx: BaseAudioContext, fxTarget: AudioNode) {
    if (typeof ctx.createStereoPanner !== 'function') {
      return {
        panL: undefined,
        panR: undefined,
        panWideL: undefined,
        panWideR: undefined,
      };
    }
    const mk = (panVal: number) => {
      const p = ctx.createStereoPanner();
      p.pan.value = panVal;
      p.connect(fxTarget);
      return p;
    };
    return {
      panL: mk(-0.38),
      panR: mk(0.38),
      panWideL: mk(-0.66),
      panWideR: mk(0.66),
    };
  }

  private buildAudioChain(
    ctx: BaseAudioContext,
    destination: AudioNode,
    masterVolume: number,
    reverbSeconds: number = 2.9
  ) {
    const masterGain = ctx.createGain();
    masterGain.gain.value = masterVolume;

    // Gentle Studio Mastering Compressor, Warmth EQ & Soft Analog Tape Saturation
    const compressor = ctx.createDynamicsCompressor();
    compressor.threshold.value = -15;
    compressor.knee.value = 18;
    compressor.ratio.value = 2.8;
    compressor.attack.value = 0.01;
    compressor.release.value = 0.24;

    const saturator = ctx.createWaveShaper();
    saturator.curve = this.createWarmSaturationCurve();
    saturator.oversample = 'none';

    const warmthFilter = ctx.createBiquadFilter();
    warmthFilter.type = 'lowshelf';
    warmthFilter.frequency.value = 195;
    warmthFilter.gain.value = 2.4;

    const midBodyFilter = ctx.createBiquadFilter();
    midBodyFilter.type = 'peaking';
    midBodyFilter.frequency.value = 340;
    midBodyFilter.Q.value = 0.75;
    midBodyFilter.gain.value = 1.4;

    const airFilter = ctx.createBiquadFilter();
    airFilter.type = 'highshelf';
    airFilter.frequency.value = 6400;
    airFilter.gain.value = 1.9;

    warmthFilter.connect(midBodyFilter);
    midBodyFilter.connect(airFilter);
    airFilter.connect(saturator);
    saturator.connect(compressor);
    compressor.connect(masterGain);
    masterGain.connect(destination);

    const dryBus = ctx.createGain();
    dryBus.gain.value = 0.96;
    dryBus.connect(warmthFilter);

    const fxGain = ctx.createGain();
    fxGain.gain.value = 0.95;
    fxGain.connect(warmthFilter);

    // Ping-Pong Stereo Delay
    const delayL = ctx.createDelay(1.2);
    const delayR = ctx.createDelay(1.2);
    delayL.delayTime.value = 0.375;
    delayR.delayTime.value = 0.5625;
    const delayGain = ctx.createGain();
    delayGain.gain.value = 0.32;

    const merger = ctx.createChannelMerger(2);
    fxGain.connect(delayL);
    delayL.connect(delayR);
    delayR.connect(delayGain);
    delayGain.connect(delayL);
    delayL.connect(merger, 0, 0);
    delayR.connect(merger, 0, 1);
    merger.connect(warmthFilter);

    // Lush Stereo Concert-Hall Convolution Reverb (lighter IR in live mobile playback)
    const convolver = ctx.createConvolver();
    convolver.buffer = this.createImpulseBuffer(ctx, reverbSeconds);
    const reverbGain = ctx.createGain();
    reverbGain.gain.value = 0.44;
    fxGain.connect(convolver);
    convolver.connect(reverbGain);
    reverbGain.connect(warmthFilter);

    const noiseBuffer = this.createNoiseBuffer(ctx);
    const stagePanners = this.createStagePanners(ctx, fxGain);

    return {
      masterGain,
      warmthFilter,
      fxGain,
      dryBus,
      delayGain,
      reverbGain,
      delayL,
      delayR,
      noiseBuffer,
      ...stagePanners,
    };
  }

  public init() {
    if (this.ctx) {
      const state = this.ctx.state as string;
      if (state === 'suspended' || state === 'interrupted') {
        this.ctx.resume().then(() => {
          this.scheduler.reanchor(0.05);
          this.updateAmbientBedTargets(0.45);
        }).catch(() => {});
      }
      return;
    }

    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    this.ctx = new AudioContextClass();

    // Lighter reverb IR & noise buffers on phones/tablets/low-core PCs significantly cut tap-start stall
    const hwThreads = typeof navigator !== 'undefined' ? navigator.hardwareConcurrency || 8 : 8;
    const isSmallViewport =
      typeof window !== 'undefined' && Math.min(window.innerWidth, window.innerHeight) <= 1024;
    this.isCompactDevice = isSmallViewport || hwThreads <= 4;

    const chain = this.buildAudioChain(
      this.ctx,
      this.ctx.destination,
      this.volume,
      this.isCompactDevice ? 1.25 : 2.15
    );
    this.masterGain = chain.masterGain;
    this.warmthFilter = chain.warmthFilter;
    this.fxGain = chain.fxGain;
    this.dryBus = chain.dryBus;
    this.delayGain = chain.delayGain;
    this.reverbGain = chain.reverbGain;
    this.delayL = chain.delayL;
    this.delayR = chain.delayR;
    this.noiseBuffer = chain.noiseBuffer;
    this.livePanL = chain.panL;
    this.livePanR = chain.panR;
    this.livePanWideL = chain.panWideL;
    this.livePanWideR = chain.panWideR;

    this.trackController.stopAllImmediate();
    this.initAmbientEngine();

    this.ctx.onstatechange = () => {
      if (this.ctx && this.ctx.state === 'running') {
        this.scheduler.reanchor(0.05);
        this.updateAmbientBedTargets(0.45);
      }
    };

    if (!this.gestureResumeBound && typeof window !== 'undefined') {
      this.gestureResumeBound = true;
      const resumeIfStalled = () => {
        if (!this.ctx) return;
        const st = this.ctx.state as string;
        if (st === 'suspended' || st === 'interrupted') {
          this.ctx.resume().then(() => {
            this.scheduler.reanchor(0.05);
            this.updateAmbientBedTargets(0.45);
          }).catch(() => {});
        }
      };
      window.addEventListener('pointerdown', resumeIfStalled, { passive: true });
      window.addEventListener('keydown', resumeIfStalled, { passive: true });
    }

    if (!this.visibilityBound && typeof document !== 'undefined') {
      this.visibilityBound = true;
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
          this.wasCustomPlayingBeforeHide = this.isCustomPlaying && !this.customAudio.paused;
          if (this.wasCustomPlayingBeforeHide) {
            this.customAudio.pause();
          }
          if (this.ambientMasterGain && this.ctx) {
            try {
              this.ambientMasterGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.08);
            } catch {
              // ignore
            }
          }
        } else {
          if (this.ctx) {
            const st = this.ctx.state as string;
            if (st === 'suspended' || st === 'interrupted') {
              this.ctx.resume().catch(() => {});
            }
            this.scheduler.resetToNow(0.06);
            if (this.ambientMasterGain) {
              try {
                this.ambientMasterGain.gain.setTargetAtTime(
                  this.ambientEnabled ? 1 : 0,
                  this.ctx.currentTime,
                  0.25
                );
              } catch {
                // ignore
              }
            }
            this.updateAmbientBedTargets(0.6);
          }
          if (this.wasCustomPlayingBeforeHide && this.currentTrack === 16) {
            this.wasCustomPlayingBeforeHide = false;
            this.customAudio.play().catch(() => {});
          }
        }
      });
    }

    this.scheduler.start(this.ctx, (now, getNextTime, advanceTime) =>
      this.runGlobalScheduleStep(now, getNextTime, advanceTime)
    );
  }

  public setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(this.volume, this.ctx.currentTime, 0.03);
    }
    this.customAudio.volume = this.volume * 0.85;
  }

  public getVolume(): number {
    return this.volume;
  }

  public setTrack(trk: number) {
    this.init();
    const activeProgram = this.trackController.getActiveProgramId();
    if (this.currentTrack === trk && (trk === 16 || activeProgram >= 0)) return;
    this.currentTrack = trk;
    this.trackController.fadeOutActive(this.ctx, 0.28);
    this.scheduler.resetToNow(0.05);

    if (trk === 16) {
      this.playCustomTrack();
    } else {
      this.stopCustomTrack();
    }
  }

  public getTrack(): number {
    return this.currentTrack;
  }

  public getActiveProgramId(): number {
    return this.trackController.getActiveProgramId();
  }

  public setBiome(b: number) {
    const idx = Math.max(0, Math.min(this.biomeTracks.length - 1, b | 0));
    if (this.ambientBiome !== idx) {
      this.ambientBiome = idx;
      this.updateAmbientBedTargets(0.55);
    }
    if (idx === this.activeBiome) {
      this.pendingBiome = -1;
      return;
    }

    // Immediate switch for cold start, realm transitions, or biomes sharing the same soundtrack
    const isRealmChange = idx >= 21 || this.activeBiome >= 21;
    const sameSoundtrack = this.biomeTracks[idx] === this.biomeTracks[this.activeBiome];
    if (this.trackController.getActiveProgramId() < 0 || isRealmChange || sameSoundtrack) {
      this.activeBiome = idx;
      this.pendingBiome = -1;
      return;
    }

    // Debounce surface biome borders so zig-zagging across terrain edges won't stutter/crossfade repeatedly
    const nowMs = typeof performance !== 'undefined' ? performance.now() : Date.now();
    if (this.pendingBiome !== idx) {
      this.pendingBiome = idx;
      this.pendingBiomeAt = nowMs;
      return;
    }
    if (nowMs - this.pendingBiomeAt >= 420) {
      this.activeBiome = idx;
      this.pendingBiome = -1;
    }
  }

  public setWeather(
    weatherId: WeatherId,
    targetWeatherId?: WeatherId,
    transitionProgress: number = 0
  ) {
    this.setEnvironment({
      weatherId,
      targetWeatherId: targetWeatherId ?? weatherId,
      transitionProgress,
    });
  }

  public setSeason(seasonId: SeasonId) {
    this.setEnvironment({ seasonId });
  }

  public setAmbientEnabled(enabled: boolean) {
    this.ambientEnabled = enabled;
    if (this.ambientMasterGain && this.ctx) {
      this.ambientMasterGain.gain.setTargetAtTime(enabled ? 1 : 0, this.ctx.currentTime, 0.25);
    }
  }

  public setEnvironment(env: {
    weatherId?: WeatherId;
    targetWeatherId?: WeatherId;
    transitionProgress?: number;
    biomeId?: number;
    seasonId?: SeasonId;
  }) {
    let discreteChanged = false;
    let blendChanged = false;

    if (env.weatherId && env.weatherId !== this.activeWeather) {
      this.activeWeather = env.weatherId;
      discreteChanged = true;
    }

    const nextTarget = env.targetWeatherId ?? env.weatherId ?? this.targetWeather;
    if (nextTarget !== this.targetWeather) {
      this.targetWeather = nextTarget;
      discreteChanged = true;
    }

    if (typeof env.transitionProgress === 'number' && Number.isFinite(env.transitionProgress)) {
      const clamped = Math.max(0, Math.min(1, env.transitionProgress));
      if (Math.abs(clamped - this.weatherBlend) >= 0.04) {
        this.weatherBlend = clamped;
        blendChanged = true;
      }
    } else if (env.weatherId && !env.targetWeatherId && this.weatherBlend !== 0) {
      this.weatherBlend = 0;
      discreteChanged = true;
    }

    if (env.seasonId && env.seasonId !== this.activeSeason) {
      this.activeSeason = env.seasonId;
      discreteChanged = true;
    }

    if (typeof env.biomeId === 'number' && Number.isFinite(env.biomeId)) {
      const clampedBiome = Math.max(0, Math.min(this.biomeTracks.length - 1, env.biomeId | 0));
      if (clampedBiome !== this.ambientBiome) {
        this.ambientBiome = clampedBiome;
        discreteChanged = true;
      }
    }

    if (discreteChanged) {
      this.lastAmbientEnvSyncMs = typeof performance !== 'undefined' ? performance.now() : Date.now();
      this.updateAmbientBedTargets(0.5);
    } else if (blendChanged) {
      const nowMs = typeof performance !== 'undefined' ? performance.now() : Date.now();
      if (nowMs - this.lastAmbientEnvSyncMs >= 220) {
        this.lastAmbientEnvSyncMs = nowMs;
        this.updateAmbientBedTargets(0.5);
      }
    }
  }

  public getEnvironmentState() {
    return {
      weatherId: this.activeWeather,
      targetWeatherId: this.targetWeather,
      transitionProgress: this.weatherBlend,
      seasonId: this.activeSeason,
      biomeId: this.ambientBiome,
      ambientEnabled: this.ambientEnabled,
    };
  }

  public midiToFreq(m: number): number {
    return 440 * Math.pow(2, (m - 69) / 12);
  }

  private getLiveNodes(): SynthNodes | null {
    if (!this.ctx || !this.fxGain || !this.dryBus || !this.noiseBuffer) return null;
    return {
      ctx: this.ctx,
      fxGain: this.fxGain,
      dryBus: this.dryBus,
      noiseBuffer: this.noiseBuffer,
      panL: this.livePanL,
      panR: this.livePanR,
      panWideL: this.livePanWideL,
      panWideR: this.livePanWideR,
    };
  }

  private getStageOut(
    nodes: SynthNodes,
    stage: 'L' | 'R' | 'WL' | 'WR' | 'C' | 'DRY' = 'C'
  ): AudioNode {
    if (stage === 'DRY') return nodes.dryBus;
    if (stage === 'L') return nodes.panL || nodes.fxGain;
    if (stage === 'R') return nodes.panR || nodes.fxGain;
    if (stage === 'WL') return nodes.panWideL || nodes.panL || nodes.fxGain;
    if (stage === 'WR') return nodes.panWideR || nodes.panR || nodes.fxGain;
    return nodes.fxGain;
  }

  private isFullOrchestraRender(nodes: SynthNodes): boolean {
    if (!this.isCompactDevice) return true;
    return typeof OfflineAudioContext !== 'undefined' && nodes.ctx instanceof OfflineAudioContext;
  }

  // ==================== FULL ORCHESTRA & STUDIO INSTRUMENTS ====================

  private toneWith(
    nodes: SynthNodes,
    type: OscillatorType,
    f: number,
    t: number,
    d: number,
    v: number,
    a: number = 0.012,
    stage: 'L' | 'R' | 'WL' | 'WR' | 'C' | 'DRY' | boolean = 'C'
  ) {
    const resolvedStage = stage === true ? 'DRY' : stage === false ? 'C' : stage;
    const o = nodes.ctx.createOscillator();
    const g = nodes.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f, t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(v, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(a + 0.02, d));
    o.connect(g);
    g.connect(this.getStageOut(nodes, resolvedStage));
    o.start(t);
    o.stop(t + d + 0.06);
  }

  private feltPianoWith(
    nodes: SynthNodes,
    m: number,
    t: number,
    d: number,
    v: number,
    stage: 'L' | 'R' | 'C' = 'C'
  ) {
    const f = this.midiToFreq(m);
    const out = this.getStageOut(nodes, stage);
    const lp = nodes.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(Math.min(4800, f * 7.2), t);
    lp.frequency.exponentialRampToValueAtTime(Math.max(380, f * 2.0), t + Math.min(d, 0.95));

    const g = nodes.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(v, t + 0.009);
    g.gain.exponentialRampToValueAtTime(v * 0.36, t + d * 0.38);
    g.gain.exponentialRampToValueAtTime(0.0001, t + d);

    lp.connect(g);
    g.connect(out);

    const detunes = this.isFullOrchestraRender(nodes) ? [-2.6, 2.6] : [0];
    detunes.forEach((dt) => {
      const o = nodes.ctx.createOscillator();
      o.type = 'triangle';
      o.frequency.setValueAtTime(f, t);
      if (dt !== 0) o.detune.setValueAtTime(dt, t);
      o.connect(lp);
      o.start(t);
      o.stop(t + d + 0.05);
    });

    const overtone = nodes.ctx.createOscillator();
    const og = nodes.ctx.createGain();
    overtone.type = 'sine';
    overtone.frequency.setValueAtTime(f * 2, t);
    og.gain.setValueAtTime(v * 0.2, t);
    og.gain.exponentialRampToValueAtTime(0.0001, t + d * 0.45);
    overtone.connect(og);
    og.connect(out);
    overtone.start(t);
    overtone.stop(t + d * 0.5 + 0.03);
  }

  private electricPianoWith(
    nodes: SynthNodes,
    m: number,
    t: number,
    d: number,
    v: number,
    stage: 'L' | 'R' | 'C' = 'L'
  ) {
    const f = this.midiToFreq(m);
    const out = this.getStageOut(nodes, stage);
    const o = nodes.ctx.createOscillator();
    const md = nodes.ctx.createOscillator();
    const ig = nodes.ctx.createGain();
    const g = nodes.ctx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(f, t);
    md.frequency.setValueAtTime(f * 2, t);
    ig.gain.setValueAtTime(f * 0.9, t);
    ig.gain.exponentialRampToValueAtTime(f * 0.03, t + d * 0.5);
    md.connect(ig);
    ig.connect(o.frequency);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(v, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(g);
    g.connect(out);
    o.start(t);
    md.start(t);
    o.stop(t + d + 0.05);
    md.stop(t + d + 0.05);
    this.toneWith(nodes, 'triangle', f, t, d * 0.72, v * 0.28, 0.012, stage);
  }

  private bellWith(
    nodes: SynthNodes,
    m: number,
    t: number,
    d: number,
    v: number,
    stage: 'L' | 'R' | 'WL' | 'WR' | 'C' = 'WL'
  ) {
    const f = this.midiToFreq(m);
    this.toneWith(nodes, 'sine', f, t, d, v, 0.005, stage);
    this.toneWith(nodes, 'sine', f * 2, t, d * 0.65, v * 0.34, 0.004, stage);
    if (this.isFullOrchestraRender(nodes)) {
      this.toneWith(nodes, 'sine', f * 3, t, d * 0.26, v * 0.13, 0.003, stage);
    }
  }

  private harpWith(
    nodes: SynthNodes,
    m: number,
    t: number,
    d: number,
    v: number,
    stage: 'L' | 'R' | 'WL' | 'WR' | 'C' = 'R'
  ) {
    const f = this.midiToFreq(m);
    const out = this.getStageOut(nodes, stage);
    const lp = nodes.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(4300, t);
    lp.frequency.exponentialRampToValueAtTime(780, t + d * 0.72);
    const g = nodes.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(v, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    lp.connect(g);
    g.connect(out);

    const o = nodes.ctx.createOscillator();
    o.type = 'triangle';
    o.frequency.setValueAtTime(f, t);
    o.connect(lp);
    o.start(t);
    o.stop(t + d + 0.05);

    this.toneWith(nodes, 'sine', f * 2, t, d * 0.45, v * 0.28, 0.004, stage);
  }

  private harpRollWith(
    nodes: SynthNodes,
    ms: number[],
    t: number,
    spreadSec: number,
    d: number,
    v: number,
    descending: boolean = false
  ) {
    const ordered = descending ? [...ms].reverse() : ms;
    const step = ordered.length > 1 ? spreadSec / (ordered.length - 1) : 0;
    ordered.forEach((midi, idx) => {
      this.harpWith(nodes, midi, t + idx * step, d, v * (0.85 + (idx / Math.max(1, ordered.length)) * 0.22), 'WR');
    });
  }

  private guitarPluckWith(
    nodes: SynthNodes,
    m: number,
    t: number,
    d: number,
    v: number,
    stage: 'L' | 'R' | 'C' = 'R'
  ) {
    const f = this.midiToFreq(m);
    const out = this.getStageOut(nodes, stage);
    const o = nodes.ctx.createOscillator();
    const g = nodes.ctx.createGain();
    const lp = nodes.ctx.createBiquadFilter();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(f, t);
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(2400, t);
    lp.frequency.exponentialRampToValueAtTime(410, t + Math.min(d, 0.68));
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(v, t + 0.007);
    g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(lp);
    lp.connect(g);
    g.connect(out);
    o.start(t);
    o.stop(t + d + 0.05);
    this.toneWith(nodes, 'triangle', f, t, d * 0.9, v * 0.45, 0.006, stage);
  }

  private marimbaWith(
    nodes: SynthNodes,
    m: number,
    t: number,
    d: number,
    v: number,
    stage: 'L' | 'R' | 'C' = 'R'
  ) {
    const f = this.midiToFreq(m);
    // Warm tuned wooden resonator fundamental + fast-decaying 4th overtone bar ring
    this.toneWith(nodes, 'sine', f, t, Math.min(d, 0.72), v, 0.003, stage);
    this.toneWith(nodes, 'triangle', f, t, Math.min(d * 0.48, 0.34), v * 0.35, 0.002, stage);
    this.toneWith(nodes, 'sine', f * 3.98, t, 0.085, v * 0.22, 0.002, stage);
  }

  private fluteWith(
    nodes: SynthNodes,
    m: number,
    t: number,
    d: number,
    v: number,
    stage: 'L' | 'R' | 'C' = 'L'
  ) {
    const f = this.midiToFreq(m);
    const out = this.getStageOut(nodes, stage);
    const o = nodes.ctx.createOscillator();
    const lfo = nodes.ctx.createOscillator();
    const lg = nodes.ctx.createGain();
    const g = nodes.ctx.createGain();

    o.type = 'sine';
    o.frequency.setValueAtTime(f * 0.986, t);
    o.frequency.linearRampToValueAtTime(f, t + 0.048);

    lfo.frequency.setValueAtTime(5.2, t);
    lg.gain.setValueAtTime(0, t);
    lg.gain.linearRampToValueAtTime(f * 0.011, t + Math.min(0.24, d * 0.45));
    lfo.connect(lg);
    lg.connect(o.frequency);

    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(v, t + 0.062);
    g.gain.setValueAtTime(v * 0.9, t + Math.max(0.07, d * 0.7));
    g.gain.exponentialRampToValueAtTime(0.0001, t + d);

    o.connect(g);
    g.connect(out);
    o.start(t);
    lfo.start(t);
    o.stop(t + d + 0.06);
    lfo.stop(t + d + 0.06);

    // Subtle breath air chiff & octave harmonic
    this.toneWith(nodes, 'triangle', f * 2, t, d * 0.78, v * 0.14, 0.065, stage);
    if (this.isFullOrchestraRender(nodes)) {
      const puff = nodes.ctx.createBufferSource();
      const bp = nodes.ctx.createBiquadFilter();
      const ng = nodes.ctx.createGain();
      puff.buffer = nodes.noiseBuffer;
      bp.type = 'bandpass';
      bp.frequency.setValueAtTime(Math.min(3400, f * 2.4), t);
      bp.Q.setValueAtTime(3.2, t);
      ng.gain.setValueAtTime(0.0001, t);
      ng.gain.linearRampToValueAtTime(v * 0.14, t + 0.025);
      ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.095);
      puff.connect(bp);
      bp.connect(ng);
      ng.connect(out);
      puff.start(t);
      puff.stop(t + 0.12);
    }
  }

  private woodwindChoirWith(
    nodes: SynthNodes,
    m: number,
    t: number,
    d: number,
    v: number,
    stage: 'L' | 'R' | 'C' = 'R'
  ) {
    // Expressive clarinet / oboe reed warmth
    const f = this.midiToFreq(m);
    const out = this.getStageOut(nodes, stage);
    const lp = nodes.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(Math.min(2600, f * 3.8), t);
    lp.frequency.linearRampToValueAtTime(Math.min(3100, f * 4.5), t + Math.min(0.18, d * 0.4));
    lp.frequency.linearRampToValueAtTime(Math.min(1800, f * 2.8), t + d);
    lp.Q.setValueAtTime(1.1, t);

    const g = nodes.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(v, t + Math.min(0.075, d * 0.22));
    g.gain.setValueAtTime(v * 0.88, t + Math.max(0.08, d * 0.72));
    g.gain.exponentialRampToValueAtTime(0.0001, t + d);

    lp.connect(g);
    g.connect(out);

    const reed = nodes.ctx.createOscillator();
    reed.type = 'sawtooth';
    reed.frequency.setValueAtTime(f, t);
    reed.connect(lp);

    const body = nodes.ctx.createOscillator();
    body.type = 'triangle';
    body.frequency.setValueAtTime(f, t);
    body.detune.setValueAtTime(-3.5, t);
    body.connect(lp);

    const lfo = nodes.ctx.createOscillator();
    const lg = nodes.ctx.createGain();
    lfo.frequency.setValueAtTime(4.8, t);
    lg.gain.setValueAtTime(0, t);
    lg.gain.linearRampToValueAtTime(f * 0.008, t + Math.min(0.28, d * 0.5));
    lfo.connect(lg);
    lg.connect(reed.frequency);
    lg.connect(body.frequency);

    reed.start(t);
    body.start(t);
    lfo.start(t);
    reed.stop(t + d + 0.06);
    body.stop(t + d + 0.06);
    lfo.stop(t + d + 0.06);
  }

  private stringsPadWith(nodes: SynthNodes, ms: number[], t: number, d: number, v: number) {
    if (!ms || ms.length === 0) return;
    // Share 1 warm formant lowpass filter & 1 swell envelope across all chord voices (highly node-efficient)
    const lp = nodes.ctx.createBiquadFilter();
    const g = nodes.ctx.createGain();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(480, t);
    lp.frequency.linearRampToValueAtTime(1320, t + d * 0.45);
    lp.frequency.linearRampToValueAtTime(580, t + d);

    const attack = Math.min(0.48, d * 0.34);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(v, t + attack);
    g.gain.setValueAtTime(v * 0.9, t + Math.max(attack + 0.02, d * 0.72));
    g.gain.linearRampToValueAtTime(0.0001, t + d);

    lp.connect(g);
    g.connect(nodes.fxGain);

    const full = this.isFullOrchestraRender(nodes);
    const notes = full ? ms : ms.slice(0, 3);
    for (let i = 0; i < notes.length; i++) {
      const f = this.midiToFreq(notes[i]);
      const o1 = nodes.ctx.createOscillator();
      o1.type = 'triangle';
      o1.frequency.setValueAtTime(f, t);
      o1.detune.setValueAtTime(-6.5, t);
      o1.connect(lp);
      o1.start(t);
      o1.stop(t + d + 0.06);

      const o2 = nodes.ctx.createOscillator();
      o2.type = 'sawtooth';
      o2.frequency.setValueAtTime(f, t);
      o2.detune.setValueAtTime(6.5, t);
      o2.connect(lp);
      o2.start(t);
      o2.stop(t + d + 0.06);
    }
  }

  private violinLeadWith(
    nodes: SynthNodes,
    m: number,
    t: number,
    d: number,
    v: number,
    stage: 'L' | 'R' | 'C' = 'L'
  ) {
    // Singing orchestral violin section with bow swell & expressive vibrato
    const f = this.midiToFreq(m);
    const out = this.getStageOut(nodes, stage);
    const lp = nodes.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(Math.min(1800, f * 2.8), t);
    lp.frequency.linearRampToValueAtTime(Math.min(3400, f * 5.2), t + Math.min(0.22, d * 0.35));
    lp.frequency.linearRampToValueAtTime(Math.min(2000, f * 3.1), t + d);

    const g = nodes.ctx.createGain();
    const bowIn = Math.min(0.14, d * 0.25);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(v, t + bowIn);
    g.gain.setValueAtTime(v * 0.92, t + Math.max(bowIn + 0.02, d * 0.74));
    g.gain.exponentialRampToValueAtTime(0.0001, t + d);

    lp.connect(g);
    g.connect(out);

    const lfo = nodes.ctx.createOscillator();
    const lg = nodes.ctx.createGain();
    lfo.frequency.setValueAtTime(5.4, t);
    lg.gain.setValueAtTime(0, t);
    lg.gain.linearRampToValueAtTime(f * 0.009, t + Math.min(0.26, d * 0.45));
    lfo.connect(lg);

    const detunes = this.isFullOrchestraRender(nodes) ? [-7, 0, 7] : [-5, 5];
    detunes.forEach((dt, idx) => {
      const o = nodes.ctx.createOscillator();
      o.type = idx === 1 ? 'triangle' : 'sawtooth';
      o.frequency.setValueAtTime(f, t);
      if (dt !== 0) o.detune.setValueAtTime(dt, t);
      lg.connect(o.frequency);
      o.connect(lp);
      o.start(t);
      o.stop(t + d + 0.06);
    });

    lfo.start(t);
    lfo.stop(t + d + 0.06);
  }

  private pizzicatoStringsWith(
    nodes: SynthNodes,
    ms: number[],
    t: number,
    v: number,
    stage: 'L' | 'R' | 'C' = 'L'
  ) {
    if (!ms || ms.length === 0) return;
    const out = this.getStageOut(nodes, stage);
    const lp = nodes.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(2200, t);
    lp.frequency.exponentialRampToValueAtTime(360, t + 0.22);

    const g = nodes.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(v, t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.26);

    lp.connect(g);
    g.connect(out);

    const notes = this.isFullOrchestraRender(nodes) ? ms : ms.slice(0, 2);
    notes.forEach((m, idx) => {
      const f = this.midiToFreq(m);
      const o = nodes.ctx.createOscillator();
      o.type = idx % 2 === 0 ? 'triangle' : 'sawtooth';
      o.frequency.setValueAtTime(f, t);
      o.connect(lp);
      o.start(t);
      o.stop(t + 0.29);
    });
  }

  private frenchHornWith(
    nodes: SynthNodes,
    m: number,
    t: number,
    d: number,
    v: number,
    stage: 'L' | 'R' | 'C' = 'R'
  ) {
    // Noble cozy fantasy French horn ensemble swell
    const f = this.midiToFreq(m);
    const out = this.getStageOut(nodes, stage);
    const lp = nodes.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(Math.max(240, f * 1.4), t);
    lp.frequency.linearRampToValueAtTime(Math.min(1650, f * 4.4), t + Math.min(0.24, d * 0.32));
    lp.frequency.linearRampToValueAtTime(Math.max(320, f * 2.1), t + d);
    lp.Q.setValueAtTime(1.4, t);

    const g = nodes.ctx.createGain();
    const atk = Math.min(0.14, d * 0.24);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(v, t + atk);
    g.gain.setValueAtTime(v * 0.88, t + Math.max(atk + 0.02, d * 0.72));
    g.gain.exponentialRampToValueAtTime(0.0001, t + d);

    lp.connect(g);
    g.connect(out);

    [-4.5, 4.5].forEach((dt) => {
      const o = nodes.ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(f, t);
      o.detune.setValueAtTime(dt, t);
      o.connect(lp);
      o.start(t);
      o.stop(t + d + 0.06);
    });
  }

  private celloBassWith(nodes: SynthNodes, m: number, t: number, d: number, v: number) {
    // Rich orchestral cello & contrabass foundation (clear on both studio monitors & mobile speakers)
    const f = this.midiToFreq(m);
    const lp = nodes.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(580, t);
    lp.frequency.linearRampToValueAtTime(760, t + Math.min(0.2, d * 0.35));
    lp.frequency.exponentialRampToValueAtTime(360, t + d);

    const g = nodes.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(v, t + Math.min(0.045, d * 0.2));
    g.gain.setValueAtTime(v * 0.82, t + Math.max(0.05, d * 0.65));
    g.gain.exponentialRampToValueAtTime(0.0001, t + d);

    lp.connect(g);
    g.connect(nodes.dryBus);

    const sub = nodes.ctx.createOscillator();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(f * 0.5, t);
    sub.connect(lp);
    sub.start(t);
    sub.stop(t + d + 0.05);

    const bowed = nodes.ctx.createOscillator();
    bowed.type = 'sawtooth';
    bowed.frequency.setValueAtTime(f, t);
    bowed.connect(lp);
    bowed.start(t);
    bowed.stop(t + d + 0.05);

    if (this.isFullOrchestraRender(nodes)) {
      // Soft stereo cello aura
      this.toneWith(nodes, 'triangle', f, t, d * 0.9, v * 0.24, 0.05, 'R');
    }
  }

  private bassWith(nodes: SynthNodes, m: number, t: number, d: number, v: number) {
    const f = this.midiToFreq(m);
    const lp = nodes.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(520, t);
    const g = nodes.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(v, t + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    lp.connect(g);
    g.connect(nodes.dryBus);

    const o1 = nodes.ctx.createOscillator();
    o1.type = 'triangle';
    o1.frequency.setValueAtTime(f, t);
    o1.connect(lp);
    o1.start(t);
    o1.stop(t + d + 0.05);

    const o2 = nodes.ctx.createOscillator();
    o2.type = 'sine';
    o2.frequency.setValueAtTime(f * 0.5, t);
    o2.connect(lp);
    o2.start(t);
    o2.stop(t + d + 0.05);
  }

  private drumNoiseWith(
    nodes: SynthNodes,
    t: number,
    v: number,
    fq: number,
    q: number,
    d: number,
    ty: BiquadFilterType,
    stage: 'DRY' | 'WL' | 'WR' = 'DRY'
  ) {
    const s = nodes.ctx.createBufferSource();
    const f = nodes.ctx.createBiquadFilter();
    const g = nodes.ctx.createGain();
    s.buffer = nodes.noiseBuffer;
    f.type = ty;
    f.frequency.setValueAtTime(fq, t);
    f.Q.setValueAtTime(q, t);
    g.gain.setValueAtTime(v, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    s.connect(f);
    f.connect(g);
    g.connect(this.getStageOut(nodes, stage));
    s.start(t);
    s.stop(t + d + 0.02);
  }

  private kickWith(nodes: SynthNodes, t: number, v: number = 0.14) {
    const o = nodes.ctx.createOscillator();
    const g = nodes.ctx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(108, t);
    o.frequency.exponentialRampToValueAtTime(44, t + 0.12);
    g.gain.setValueAtTime(v, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.24);
    o.connect(g);
    g.connect(nodes.dryBus);
    o.start(t);
    o.stop(t + 0.26);
  }

  private snareWith(nodes: SynthNodes, t: number, v: number = 0.042) {
    this.drumNoiseWith(nodes, t, v, 1950, 0.85, 0.13, 'bandpass');
    this.toneWith(nodes, 'triangle', 175, t, 0.08, v * 0.4, 0.003, 'DRY');
  }

  private shakerWith(nodes: SynthNodes, t: number, v: number = 0.013) {
    this.drumNoiseWith(nodes, t, v, 6800, 0.85, 0.042, 'highpass', 'WL');
  }

  private tambourineWith(nodes: SynthNodes, t: number, v: number = 0.014) {
    this.drumNoiseWith(nodes, t, v, 8400, 1.35, 0.085, 'bandpass', 'WR');
  }

  private timpaniWith(nodes: SynthNodes, m: number, t: number, v: number = 0.13) {
    const f = this.midiToFreq(m);
    const o = nodes.ctx.createOscillator();
    const g = nodes.ctx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(f * 1.18, t);
    o.frequency.exponentialRampToValueAtTime(f, t + 0.09);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(v, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.78);
    o.connect(g);
    g.connect(nodes.dryBus);
    o.start(t);
    o.stop(t + 0.82);
    // Warm hall skin thump
    this.drumNoiseWith(nodes, t, v * 0.16, 220, 1.1, 0.11, 'lowpass', 'DRY');
  }

  private cymbalSwellWith(nodes: SynthNodes, t: number, dur: number, v: number = 0.032) {
    if (!this.isFullOrchestraRender(nodes) && v < 0.018) return;
    const s = nodes.ctx.createBufferSource();
    const bp = nodes.ctx.createBiquadFilter();
    const hp = nodes.ctx.createBiquadFilter();
    const g = nodes.ctx.createGain();
    s.buffer = nodes.noiseBuffer;
    s.loop = true;

    hp.type = 'highpass';
    hp.frequency.setValueAtTime(3400, t);
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(5200, t);
    bp.frequency.linearRampToValueAtTime(7600, t + dur * 0.92);
    bp.Q.setValueAtTime(0.75, t);

    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(v, t + dur * 0.92);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.35);

    s.connect(hp);
    hp.connect(bp);
    bp.connect(g);
    g.connect(this.getStageOut(nodes, 'WR'));
    s.start(t);
    s.stop(t + dur + 0.4);
  }

  // Convenience live wrappers for SFX
  private tone(type: OscillatorType, f: number, t: number, d: number, v: number, a: number = 0.01) {
    const nodes = this.getLiveNodes();
    if (nodes) this.toneWith(nodes, type, f, t, d, v, a);
  }
  private bell(m: number, t: number, d: number, v: number) {
    const nodes = this.getLiveNodes();
    if (nodes) this.bellWith(nodes, m, t, d, v);
  }
  private harp(m: number, t: number, d: number, v: number) {
    const nodes = this.getLiveNodes();
    if (nodes) this.harpWith(nodes, m, t, d, v);
  }
  private flute(m: number, t: number, d: number, v: number) {
    const nodes = this.getLiveNodes();
    if (nodes) this.fluteWith(nodes, m, t, d, v);
  }
  private feltPiano(m: number, t: number, d: number, v: number) {
    const nodes = this.getLiveNodes();
    if (nodes) this.feltPianoWith(nodes, m, t, d, v);
  }

  // ==================== 14 FULL-ORCHESTRA & STUDIO SOUNDTRACKS ====================

  private getSongProgram(trackId: number): { programId: number; song: SongProg } {
    const songs: Record<number, SongProg> = {
      // 1: Music Box Waltz (3/4, 16-bar Enchanted Storybook Orchestra: Celesta + Harp + Pizzicato + Violin/Flute B-Bridge)
      1: {
        bpm: 86,
        len: 12,
        sw: 0,
        f: 0.25,
        rv: 0.5,
        pr: [
          [53, 'M9'],   // F M9
          [48, 'M6'],   // C6
          [50, 'm7'],   // Dm7
          [46, 'M7'],   // Bb M7
          [53, 'M'],    // F
          [45, 'm7'],   // Am7
          [46, 'M9'],   // Bb M9
          [48, 'S'],    // Csus2
          [50, 'm9'],   // Dm9 (Section B)
          [45, 'm7'],   // Am7
          [46, 'M9'],   // Bb M9
          [53, 'M7'],   // F M7
          [43, 'm7'],   // Gm7
          [48, 'D9'],   // C9
          [46, 'M9'],   // Bb M9
          [48, 'sus4'], // Csus4
        ],
        p: (nodes, b, s, t, c, sd) => {
          const bar = b % 16;
          const isB = bar >= 8;

          // Waltz 3/4 Foundation: Oom (s=0 cello) - Pah (s=4 pizz/harp) - Pah (s=8 pizz/harp)
          if (s === 0) {
            this.celloBassWith(nodes, c[0] - 12, t, sd * 10.5, 0.11);
            this.stringsPadWith(nodes, c.slice(0, 4).map((x) => x + 12), t, sd * 12.2, isB ? 0.017 : 0.013);
            this.harpWith(nodes, c[0] + 12, t, sd * 4.5, 0.044, 'R');
            if (bar === 0 || bar === 8) this.timpaniWith(nodes, c[0] - 12, t, 0.075);
          }
          if (s === 4 || s === 8) {
            this.pizzicatoStringsWith(nodes, [c[1] + 12, c[2] + 12], t, 0.036, 'L');
            this.harpWith(nodes, c[s === 4 ? 1 : 2] + 12, t, sd * 3.8, 0.038, 'R');
          }
          if (s === 6 && (bar === 7 || bar === 15)) {
            this.cymbalSwellWith(nodes, t, sd * 5.8, 0.024);
          }

          const melodies: number[][] = [
            // Section A (0..7)
            [77, 81, 84, 86, 84, 81],
            [79, 84, 83, 79, 76, 79],
            [74, 77, 81, 84, 81, 77],
            [74, 77, 81, 79, 77, 74],
            [77, 81, 84, 89, 86, 84],
            [76, 79, 81, 84, 81, 79],
            [74, 77, 81, 86, 84, 81],
            [79, 81, 84, 79, 76, 72],
            // Section B (8..15) soaring bridge
            [86, 84, 81, 77, 81, 84],
            [84, 83, 81, 79, 76, 79],
            [81, 84, 86, 89, 86, 84],
            [84, 81, 79, 77, 81, 84],
            [82, 81, 79, 77, 79, 82],
            [84, 82, 81, 79, 76, 79],
            [77, 81, 84, 86, 84, 81],
            [79, 81, 84, 86, 84, 79],
          ];
          if (s % 2 === 0) {
            const note = melodies[bar][s / 2];
            this.bellWith(nodes, note, t, 1.55, isB ? 0.048 : 0.058, 'WL');
            this.feltPianoWith(nodes, note - 12, t, sd * 2.6, 0.036, 'C');
          }
          // Singing Violin + Flute lyrical counter-phrases
          if (isB && (s === 0 || s === 6)) {
            const lyric = [
              [86, 81], [84, 79], [86, 89], [84, 81],
              [82, 79], [84, 79], [86, 84], [84, 79],
            ][bar - 8];
            const m = lyric[s === 0 ? 0 : 1];
            this.violinLeadWith(nodes, m - 12, t, sd * 5.6, 0.042, 'L');
            if (bar >= 12) this.fluteWith(nodes, m, t, sd * 5.4, 0.045, 'L');
          } else if (!isB && (bar === 3 || bar === 7) && s === 0) {
            this.woodwindChoirWith(nodes, c[2] + 24, t, sd * 10, 0.036, 'R');
          }
        },
      },

      // 2: Lo-Fi Chill (Whisper Woods — 8-bar Warm Jazz-Chamber Study: Rhodes + Cello + Muted Brass + Brushed Groove)
      2: {
        bpm: 78,
        len: 16,
        sw: 0.3,
        f: 0.24,
        rv: 0.38,
        pr: [
          [50, 'm9'],  // Dm9
          [43, 'D9'],  // G9
          [48, 'M9'],  // Cmaj9
          [45, 'm7'],  // Am7
          [50, 'm9'],  // Dm9
          [43, 'D9'],  // G9
          [40, 'm7'],  // Em7
          [45, 'D'],   // A7
        ],
        p: (nodes, b, s, t, c, sd) => {
          const bar = b % 8;
          const isB = bar >= 4;

          if (s === 0) {
            this.stringsPadWith(nodes, c.slice(1, 4).map((x) => x + 12), t, sd * 15.8, isB ? 0.015 : 0.011);
          }
          if ([0, 6, 10].includes(s)) {
            c.slice(0, 4).forEach((m, i) =>
              this.electricPianoWith(nodes, m + 12, t + i * 0.015, sd * (s === 6 ? 3.5 : 5.4), 0.042, 'L')
            );
          }
          if ([0, 7, 10, 14].includes(s)) {
            const walk = s === 14 ? 5 : s === 7 ? 7 : 0;
            this.bassWith(nodes, c[0] - 12 + walk, t, sd * 3.2, 0.12);
          }
          // Cozy brushed kit + gentle tambourine on 2 & 4
          if (s === 0 || s === 10) this.kickWith(nodes, t, 0.14);
          if (s === 4 || s === 12) this.snareWith(nodes, t, 0.042);
          if (s === 15) this.snareWith(nodes, t, 0.018); // soft ghost note
          if (s % 2 === 0) this.shakerWith(nodes, t, s % 4 === 0 ? 0.014 : 0.008);

          const lead: [number, number, number][][] = [
            [[2, 74, 3.5], [6, 76, 3.5], [10, 72, 4.5]],
            [[0, 71, 4.2], [6, 69, 3.2], [10, 72, 5.2]],
            [[2, 76, 4.2], [8, 79, 4.2], [12, 76, 3.5]],
            [[0, 74, 4.2], [6, 72, 4.2], [12, 69, 4.2]],
            [[2, 77, 3.8], [6, 76, 3.5], [10, 74, 4.8]],
            [[0, 74, 4.2], [6, 71, 3.5], [10, 74, 5.2]],
            [[2, 76, 4.5], [8, 79, 4.2], [12, 74, 3.8]],
            [[0, 73, 5.0], [8, 76, 4.5], [12, 79, 3.8]],
          ];
          lead[bar].forEach(([stepIdx, midi, dur]) => {
            if (s === stepIdx) {
              this.feltPianoWith(nodes, midi, t, sd * dur, 0.058, 'C');
              if (isB && stepIdx <= 2) {
                this.fluteWith(nodes, midi, t, sd * dur * 1.15, 0.044, 'L');
              }
            }
          });

          // Warm muted French horn / woodwind jazz pad swells in Section B
          if (isB && s === 0) {
            this.frenchHornWith(nodes, c[2] + 12, t, sd * 10, 0.028, 'R');
          }
          if (bar === 7 && s === 8) {
            this.harpRollWith(nodes, c.map((x) => x + 24), t, 0.22, 1.5, 0.026);
          }
        },
      },

      // 3: Sunny Strum (Sunny Meadow — 16-bar Joyful Pastoral Full Orchestra: Guitar + Flute + Violin + French Horn + Timpani)
      3: {
        bpm: 114,
        len: 16,
        sw: 0.08,
        f: 0.2,
        rv: 0.34,
        pr: [
          [48, 'add9'], // C add9
          [43, 'M'],    // G
          [45, 'm7'],   // Am7
          [41, 'M9'],   // F M9
          [48, 'add9'], // C add9
          [43, 'M'],    // G
          [41, 'M7'],   // F M7
          [43, 'S'],    // G sus2
          [41, 'M9'],   // F M9 (Section B soaring bridge)
          [43, 'M'],    // G
          [40, 'm7'],   // Em7
          [45, 'm7'],   // Am7
          [50, 'm7'],   // Dm7
          [43, 'M'],    // G
          [41, 'M9'],   // F M9
          [43, 'sus4'], // G sus4
        ],
        p: (nodes, b, s, t, c, sd) => {
          const bar = b % 16;
          const isB = bar >= 8;

          if (s === 0) {
            this.stringsPadWith(nodes, c.slice(0, 4).map((x) => x + 12), t, sd * 15.8, isB ? 0.017 : 0.012);
            if (bar === 0 || bar === 8 || bar === 12) this.timpaniWith(nodes, c[0] - 12, t, 0.095);
          }
          if ([0, 3, 6, 8, 11, 14].includes(s)) {
            c.slice(0, 4).forEach((m, i) =>
              this.guitarPluckWith(nodes, m + 12, t + i * 0.014, sd * 3.4, 0.032, 'R')
            );
          }
          if ([0, 4, 8, 12].includes(s) && isB) {
            this.pizzicatoStringsWith(nodes, [c[1] + 12, c[2] + 12], t, 0.034, 'L');
          }
          if ([0, 6, 8, 14].includes(s)) {
            this.celloBassWith(nodes, c[0] - 12 + (s === 8 ? 7 : 0), t, sd * 2.7, 0.115);
          }
          if (s === 0 || s === 8) this.kickWith(nodes, t, 0.11);
          if (s === 4 || s === 12) {
            this.snareWith(nodes, t, 0.032);
            this.tambourineWith(nodes, t, isB ? 0.016 : 0.01);
          }
          if (s % 2 === 0) this.shakerWith(nodes, t, s % 4 === 2 ? 0.014 : 0.007);
          if ((bar === 7 || bar === 15) && s === 8) {
            this.cymbalSwellWith(nodes, t, sd * 7.5, 0.03);
          }

          const fluteLines: [number, number, number][][] = [
            // A1 (0..3)
            [[0, 76, 2.6], [2, 79, 2], [4, 81, 3.2], [8, 79, 4.5], [14, 76, 2]],
            [[0, 74, 2.5], [2, 79, 2], [4, 83, 3.2], [8, 81, 4.5], [14, 79, 2]],
            [[0, 76, 2.4], [2, 72, 2], [4, 76, 2.6], [6, 79, 2.2], [8, 81, 5.2]],
            [[0, 77, 2.6], [2, 81, 2], [4, 84, 3.5], [8, 79, 2.5], [10, 77, 2.5], [12, 72, 3.8]],
            // A2 (4..7)
            [[0, 76, 2.6], [2, 79, 2], [4, 84, 3.5], [8, 83, 4.5], [14, 79, 2]],
            [[0, 79, 2.5], [2, 83, 2], [4, 86, 3.5], [8, 84, 4.5], [14, 81, 2]],
            [[0, 81, 3.2], [4, 79, 3.2], [8, 77, 3.2], [12, 76, 3.5]],
            [[0, 74, 6.0], [8, 79, 6.5]],
            // B (8..15) uplifting brass + violin bridge
            [[0, 81, 3.5], [4, 84, 3.5], [8, 86, 6.5]],
            [[0, 83, 3.5], [4, 86, 3.5], [8, 88, 6.5]],
            [[0, 86, 3.5], [4, 84, 3.5], [8, 83, 6.5]],
            [[0, 81, 3.5], [4, 84, 3.5], [8, 88, 6.5]],
            [[0, 86, 3.5], [4, 84, 3.5], [8, 81, 6.5]],
            [[0, 83, 3.5], [4, 81, 3.5], [8, 79, 6.5]],
            [[0, 81, 3.5], [4, 84, 3.5], [8, 86, 6.5]],
            [[0, 84, 6.5], [8, 79, 6.5]],
          ];
          fluteLines[bar].forEach(([stepIdx, midi, dur]) => {
            if (s === stepIdx) {
              this.fluteWith(nodes, midi, t, sd * dur, isB ? 0.056 : 0.068, 'L');
              if (isB) {
                this.violinLeadWith(nodes, midi, t, sd * dur, 0.044, 'L');
              } else if (stepIdx === 0 && bar >= 4) {
                this.woodwindChoirWith(nodes, midi - 12, t, sd * dur * 1.1, 0.032, 'R');
              }
            }
          });

          // Noble French horn counter-melody supporting Section B
          if (isB && s === 0) {
            this.frenchHornWith(nodes, c[0] + 12, t, sd * 9.5, 0.036, 'R');
          }
          if (bar % 4 === 3 && s === 12) {
            this.harpRollWith(nodes, c.map((x) => x + 12), t, 0.16, 1.3, 0.032);
          }
        },
      },

      // 4: Dreamy Echoes (Clouds & Peaks — 8-bar Sky Symphony: Cascading Harp + Strings + Flute/Oboe Duet + French Horn)
      4: {
        bpm: 66,
        len: 16,
        sw: 0,
        f: 0.44,
        rv: 0.64,
        pr: [
          [41, 'M9'],   // F M9
          [38, 'm9'],   // Dm9
          [46, 'M7'],   // Bb M7
          [43, 'S'],    // G sus2
          [50, 'm11'],  // Dm11
          [46, 'M9'],   // Bb M9
          [43, 'm7'],   // Gm7
          [48, 'sus4'], // C sus4
        ],
        p: (nodes, b, s, t, c, sd) => {
          const bar = b % 8;
          const isB = bar >= 4;

          if (s === 0) {
            this.stringsPadWith(nodes, c.slice(0, 4).map((x) => x + 12), t, sd * 16.4, isB ? 0.022 : 0.017);
            this.celloBassWith(nodes, c[0] - 12, t, sd * 14, 0.105);
            this.harpRollWith(nodes, c.slice(0, 4).map((x) => x + 12), t, 0.24, 2.2, 0.034);
          }
          if (s > 0 && s % 2 === 0) {
            const idx = (s / 2) % 4;
            this.harpWith(nodes, c[idx] + 24, t, 2.3, 0.036, 'R');
          }
          if (bar === 7 && s === 8) {
            this.cymbalSwellWith(nodes, t, sd * 7.6, 0.024);
          }

          const lines: [number, number, number][][] = [
            [[2, 81, 5.5], [10, 84, 5.5]],
            [[2, 79, 4.5], [10, 77, 6.2]],
            [[4, 74, 5.5], [10, 77, 5.5]],
            [[0, 79, 8.0], [10, 81, 5.5]],
            [[2, 86, 5.5], [10, 84, 5.5]],
            [[2, 84, 5.0], [10, 81, 6.0]],
            [[2, 79, 5.5], [10, 82, 5.5]],
            [[0, 84, 9.0], [10, 81, 5.5]],
          ];
          lines[bar].forEach(([stepIdx, midi, dur]) => {
            if (s === stepIdx) {
              this.fluteWith(nodes, midi, t, dur * sd, 0.056, 'L');
              if (isB) {
                this.violinLeadWith(nodes, midi - 12, t, dur * sd * 1.05, 0.042, 'L');
              } else {
                this.woodwindChoirWith(nodes, midi - 12, t + 0.04, dur * sd * 0.9, 0.03, 'R');
              }
            }
          });

          // Distant French horn horizon motif
          if ((bar === 1 || bar === 3 || bar === 5 || bar === 7) && s === 0) {
            this.frenchHornWith(nodes, c[2] + 12, t, sd * 9.5, isB ? 0.038 : 0.03, 'R');
          }
          if (isB && (s === 6 || s === 14)) {
            this.bellWith(nodes, c[(s + bar) % 4] + 36, t, 1.9, 0.026, 'WL');
          }
        },
      },

      // 5: Night Bells (Starlit Lanterns — 8-bar Nocturnal Celesta, Harp, Cello & Chamber Strings)
      5: {
        bpm: 70,
        len: 16,
        sw: 0,
        f: 0.36,
        rv: 0.56,
        pr: [
          [45, 'm9'],  // Am9
          [41, 'M7'],  // F M7
          [38, 'm7'],  // Dm7
          [40, 'D'],   // E7
          [45, 'm9'],  // Am9
          [43, 'M6'],  // G6
          [41, 'M9'],  // F M9
          [40, 'sus4'], // E sus4
        ],
        p: (nodes, b, s, t, c, sd) => {
          const bar = b % 8;
          const isB = bar >= 4;

          if (s === 0) {
            this.stringsPadWith(nodes, c.slice(0, 4).map((x) => x + 12), t, sd * 16.4, isB ? 0.019 : 0.014);
            this.celloBassWith(nodes, c[0] - 12, t, sd * 12, 0.105);
          }
          if (s % 2 === 0) {
            const pat = [0, 1, 2, 3, 2, 1, 3, 2][(s / 2) % 8];
            this.bellWith(
              nodes,
              c[pat] + 24 + (bar % 4 === 3 && s > 10 ? 12 : 0),
              t,
              1.6,
              0.038,
              s % 4 === 0 ? 'WL' : 'WR'
            );
          }
          if (s === 0 || s === 8) {
            this.feltPianoWith(nodes, c[s === 0 ? 1 : 2] + 24, t, sd * 5.2, 0.052, 'C');
          }
          if (isB && (s === 4 || s === 12)) {
            this.pizzicatoStringsWith(nodes, [c[1] + 12, c[2] + 12], t, 0.03, 'L');
          }
          if (s === 0 && (bar === 1 || bar === 5)) {
            this.harpRollWith(nodes, [88, 91, 93, 96], t, 0.24, 1.3, 0.025, true);
          }
          if (isB && s === 0) {
            this.woodwindChoirWith(nodes, c[2] + 12, t, sd * 8, 0.034, 'R');
          }
          if (bar >= 6 && s === 4) {
            this.violinLeadWith(nodes, c[1] + 24, t, sd * 9.5, 0.038, 'L');
          }
        },
      },

      // 6: Honeyhum (Golden Honeycomb Hills — 8-bar Warm Marimba + Chamber Strings + Flute + Woodwinds)
      6: {
        bpm: 98,
        len: 16,
        sw: 0.16,
        f: 0.24,
        rv: 0.36,
        pr: [
          [53, 'add9'], // F add9
          [50, 'm7'],   // Dm7
          [46, 'M9'],   // Bb M9
          [48, 'S'],    // C sus2
          [43, 'm7'],   // Gm7
          [48, 'D9'],   // C9
          [45, 'm7'],   // Am7
          [50, 'm9'],   // Dm9
        ],
        p: (nodes, b, s, t, c, sd) => {
          const bar = b % 8;
          const isB = bar >= 4;

          if (s === 0) {
            this.stringsPadWith(nodes, c.slice(0, 4).map((x) => x + 12), t, sd * 15.8, isB ? 0.016 : 0.012);
          }
          if (s % 2 === 0) {
            const idx = [0, 1, 2, 1, 3, 2, 1, 2][(s / 2) % 8];
            this.marimbaWith(nodes, c[idx] + 12, t, sd * 2.4, 0.056, 'R');
            if (s % 4 === 0) {
              this.feltPianoWith(nodes, c[idx] + 12, t, sd * 2.8, 0.04, 'C');
            }
          }
          if (s === 0 || s === 6 || s === 8) {
            this.celloBassWith(nodes, c[0] - 12, t, sd * 2.9, 0.115);
          }
          if (s === 0 || s === 8) this.kickWith(nodes, t, 0.095);
          if (s === 4 || s === 12) this.tambourineWith(nodes, t, 0.013);
          if (s % 4 === 2) this.shakerWith(nodes, t, 0.011);

          const honeyLines: [number, number, number][][] = [
            [[0, 81, 4.2], [6, 84, 3.8], [10, 86, 4.5]],
            [[2, 84, 4.2], [8, 79, 4.8]],
            [[0, 81, 3.8], [4, 86, 4.0], [10, 84, 4.8]],
            [[0, 79, 6.0], [8, 84, 5.5]],
            [[0, 82, 4.2], [6, 84, 4.0], [10, 86, 4.5]],
            [[0, 84, 4.0], [6, 82, 4.0], [10, 79, 4.8]],
            [[0, 81, 4.2], [6, 84, 4.0], [10, 88, 5.0]],
            [[0, 86, 6.2], [8, 81, 5.5]],
          ];
          honeyLines[bar].forEach(([stepIdx, midi, dur]) => {
            if (s === stepIdx) {
              this.fluteWith(nodes, midi, t, sd * dur, 0.058, 'L');
              if (isB) {
                this.woodwindChoirWith(nodes, midi - 12, t, sd * dur, 0.036, 'R');
              }
            }
          });
          if (isB && (s === 0 || s === 8)) {
            this.pizzicatoStringsWith(nodes, [c[1] + 12, c[2] + 12], t, 0.032, 'L');
          }
        },
      },

      // 7: Tide Waltz (3/4 Underwater Pearl Reef & Lagoons — 8-bar Symphonic Water Waltz)
      7: {
        bpm: 82,
        len: 12,
        sw: 0,
        f: 0.4,
        rv: 0.65,
        pr: [
          [45, 'm9'],   // Am9
          [41, 'M9'],   // F M9
          [48, 'M7'],   // C M7
          [43, 'S'],    // G sus2
          [50, 'm9'],   // Dm9
          [43, 'D9'],   // G9
          [48, 'M9'],   // C M9
          [40, 'sus4'], // E sus4
        ],
        p: (nodes, b, s, t, c, sd) => {
          const bar = b % 8;
          const isB = bar >= 4;

          if (s === 0) {
            this.stringsPadWith(nodes, c.slice(0, 4).map((x) => x + 12), t, sd * 12.6, isB ? 0.022 : 0.017);
            this.celloBassWith(nodes, c[0] - 12, t, sd * 10.5, 0.105);
            this.harpRollWith(nodes, c.slice(0, 4).map((x) => x + 12), t, 0.22, 2.0, 0.036);
          }
          if (s > 0 && s % 2 === 0) {
            const harpNote = c[[0, 1, 2, 3, 2, 1][s / 2]] + 12;
            this.harpWith(nodes, harpNote, t, 1.9, 0.04, 'R');
          }
          if (s === 0 || s === 6) {
            const fluteMel = [
              [84, 83],
              [81, 79],
              [84, 88],
              [86, 84],
              [86, 84],
              [83, 81],
              [84, 88],
              [83, 79],
            ][bar];
            const note = fluteMel[s === 0 ? 0 : 1];
            this.fluteWith(nodes, note, t, sd * 5.4, 0.056, 'L');
            if (isB) {
              this.violinLeadWith(nodes, note - 12, t, sd * 5.6, 0.042, 'L');
            }
          }
          if (bar >= 4 && s === 0) {
            this.frenchHornWith(nodes, c[1] + 12, t, sd * 9.2, 0.03, 'R');
          }
          if (s === 10) this.bellWith(nodes, c[2] + 24, t, 1.6, 0.028, 'WL');
          if (bar === 7 && s === 6) this.cymbalSwellWith(nodes, t, sd * 5.8, 0.024);
        },
      },

      // 8: Cinder Lounge (Hot Springs & Dunes — 8-bar Bossa/Chamber Jazz: Rhodes + Acoustic Guitar + Marimba + Warm Brass)
      8: {
        bpm: 88,
        len: 16,
        sw: 0.2,
        f: 0.26,
        rv: 0.36,
        pr: [
          [48, 'M9'], // Cmaj9
          [45, 'm9'], // Am9
          [41, 'M7'], // Fmaj7
          [43, 'D9'], // G9
          [40, 'm7'], // Em7
          [45, 'D9'], // A9
          [50, 'm9'], // Dm9
          [43, 'D9'], // G9
        ],
        p: (nodes, b, s, t, c, sd) => {
          const bar = b % 8;
          const isB = bar >= 4;

          if (s === 0 && isB) {
            this.stringsPadWith(nodes, c.slice(1, 4).map((x) => x + 12), t, sd * 15.5, 0.013);
          }
          if ([0, 3, 6, 10, 12].includes(s)) {
            c.slice(0, 4).forEach((m, i) =>
              this.electricPianoWith(nodes, m + 12, t + i * 0.014, sd * 3.5, 0.038, 'L')
            );
            if (s === 0 || s === 6) {
              this.guitarPluckWith(nodes, c[2] + 12, t + 0.02, sd * 2.8, 0.028, 'R');
            }
          }
          if ([0, 6, 8, 14].includes(s)) {
            this.celloBassWith(nodes, c[0] - 12 + (s === 14 ? 7 : 0), t, sd * 2.8, 0.12);
          }
          if (s === 0 || s === 10) this.kickWith(nodes, t, 0.12);
          if (s === 4 || s === 12) {
            this.snareWith(nodes, t, 0.036);
            this.tambourineWith(nodes, t, 0.01);
          }
          if (s % 2 === 0) this.shakerWith(nodes, t, 0.011);

          // Warm wooden marimba bossa fills + felt piano & muted horn phrases
          if (s === 2 || s === 10) {
            this.marimbaWith(nodes, c[(bar + s) % 4] + 12, t, sd * 2.2, 0.044, 'R');
          }
          if ((bar % 2 === 0 && (s === 2 || s === 8)) || (bar % 2 === 1 && (s === 4 || s === 10))) {
            const note = [79, 83, 81, 76, 84, 83, 79, 74][(bar + s) % 8];
            this.feltPianoWith(nodes, note, t, sd * 4.5, 0.056, 'C');
            if (isB && s <= 4) {
              this.frenchHornWith(nodes, note - 12, t, sd * 5.2, 0.03, 'R');
            }
          }
        },
      },

      // 9: Fen Whispers (Mirror Fens — 8-bar Impressionist Emerald Chamber Piece: Harp + Woodwinds + Pizzicato + Strings)
      9: {
        bpm: 74,
        len: 16,
        sw: 0.08,
        f: 0.36,
        rv: 0.54,
        pr: [
          [43, 'm9'],   // Gm9
          [48, 'M7'],   // C M7
          [46, 'add9'], // Bb add9
          [41, 'm7'],   // Fm7
          [48, 'm9'],   // Cm9
          [41, 'D9'],   // F9
          [51, 'M9'],   // Eb M9
          [50, 'sus4'], // D sus4
        ],
        p: (nodes, b, s, t, c, sd) => {
          const bar = b % 8;
          const isB = bar >= 4;

          if (s === 0) {
            this.stringsPadWith(nodes, c.slice(0, 4).map((x) => x + 12), t, sd * 16.0, isB ? 0.019 : 0.014);
            this.celloBassWith(nodes, c[0] - 12, t, sd * 11, 0.105);
          }
          if (s === 0 || s === 4 || s === 8 || s === 12) {
            this.feltPianoWith(nodes, c[s / 4] + 12, t, sd * 4.8, 0.048, 'C');
          }
          if (s === 2 || s === 10) {
            this.harpWith(nodes, c[2] + 24, t, 1.9, 0.04, 'R');
            this.pizzicatoStringsWith(nodes, [c[1] + 12, c[2] + 12], t, 0.026, 'L');
          }
          if (s === 6) {
            if (bar % 2 === 0) {
              this.fluteWith(nodes, c[1] + 24, t, sd * 6.2, 0.052, 'L');
            } else {
              this.woodwindChoirWith(nodes, c[2] + 12, t, sd * 6.5, 0.036, 'R');
            }
          }
          if (isB && s === 0) {
            this.violinLeadWith(nodes, c[3] + 12, t, sd * 8.5, 0.038, 'L');
          }
          if (s === 14) this.bellWith(nodes, c[3] + 24, t, 1.7, 0.03, 'WL');
        },
      },

      // 10: Aurora (Aurora Reach & Ice Caves — 8-bar Nordic Celestial Symphony: Crystal Bells + Harp + Strings + French Horn + Violin)
      10: {
        bpm: 66,
        len: 16,
        sw: 0,
        f: 0.44,
        rv: 0.68,
        pr: [
          [49, 'm11'],  // C#m11
          [44, 'm9'],   // G#m9
          [47, 'M9'],   // B M9
          [42, 'S'],    // F# sus2
          [45, 'M9'],   // A M9
          [40, 'M7'],   // E M7
          [49, 'm9'],   // C#m9
          [44, 'sus4'], // G# sus4
        ],
        p: (nodes, b, s, t, c, sd) => {
          const bar = b % 8;
          const isB = bar >= 4;

          if (s === 0) {
            this.stringsPadWith(nodes, c.slice(0, 4).map((x) => x + 12), t, sd * 16.8, isB ? 0.023 : 0.018);
            this.celloBassWith(nodes, c[0] - 12, t, sd * 14, 0.105);
            if (bar === 0 || bar === 4) {
              this.timpaniWith(nodes, c[0] - 12, t, 0.09);
            }
          }
          if (s % 2 === 0) {
            const idx = (s / 2) % c.length;
            this.bellWith(nodes, c[idx] + 24, t, 2.2, 0.036, s % 4 === 0 ? 'WL' : 'WR');
          }
          if (s === 4 || s === 12) {
            this.harpWith(nodes, c[(bar + s) % 3] + 36, t, 2.2, 0.03, 'R');
          }
          // Soaring Nordic French Horn & Violin aurora horizon themes
          if ((bar % 2 === 0) && s === 2) {
            this.frenchHornWith(nodes, c[2] + 12, t, sd * 11.5, isB ? 0.042 : 0.032, 'R');
          }
          if (isB && s === 4) {
            this.violinLeadWith(nodes, c[1] + 24, t, sd * 10.5, 0.044, 'L');
          }
          if ((bar === 3 || bar === 7) && s === 8) {
            this.cymbalSwellWith(nodes, t, sd * 7.6, 0.025);
          }
        },
      },

      // 11: Chimewood (Bellwood Canopy — 8-bar Woodland Celtic Orchestra: Carillon Bells + Guitar + Marimba + Flute/Violin Dance)
      11: {
        bpm: 92,
        len: 16,
        sw: 0.06,
        f: 0.28,
        rv: 0.44,
        pr: [
          [55, 'M9'], // G M9
          [50, 'M'],  // D
          [52, 'm7'], // Em7
          [48, 'M9'], // C M9
          [45, 'm7'], // Am7
          [50, 'S'],  // D sus2
          [47, 'm7'], // Bm7
          [52, 'm9'], // Em9
        ],
        p: (nodes, b, s, t, c, sd) => {
          const bar = b % 8;
          const isB = bar >= 4;

          if (s === 0) {
            this.stringsPadWith(nodes, c.slice(0, 3).map((x) => x + 12), t, sd * 15.6, isB ? 0.016 : 0.011);
            if (bar === 0 || bar === 4) this.timpaniWith(nodes, c[0] - 12, t, 0.085);
          }
          if (s % 4 === 0) {
            this.guitarPluckWith(nodes, c[s / 4] + 12, t, sd * 4.5, 0.036, 'R');
          }
          if (s % 2 === 0 && isB) {
            this.marimbaWith(nodes, c[(s / 2) % 4] + 12, t, sd * 2.2, 0.04, 'R');
          }
          if (s === 0 || s === 8) {
            this.celloBassWith(nodes, c[0] - 12, t, sd * 5.2, 0.115);
            this.pizzicatoStringsWith(nodes, [c[1] + 12, c[2] + 12], t, 0.03, 'L');
          }
          if (s === 4 || s === 12) this.tambourineWith(nodes, t, 0.012);
          if (s === 0 || s === 6 || s === 10 || s === 14) {
            this.bellWith(nodes, c[(bar + s) % 4] + 24, t, 1.5, 0.044, 'WL');
          }
          const chimeFlute: [number, number, number][][] = [
            [[0, 79, 4], [4, 83, 4], [8, 86, 6]],
            [[0, 81, 4], [4, 86, 4], [8, 81, 6]],
            [[0, 83, 4], [4, 79, 4], [8, 83, 6]],
            [[0, 79, 4], [4, 76, 4], [8, 79, 6]],
            [[0, 84, 4], [4, 81, 4], [8, 79, 6]],
            [[0, 81, 4], [4, 86, 4], [8, 83, 6]],
            [[0, 83, 4], [4, 86, 4], [8, 91, 6]],
            [[0, 88, 6], [8, 86, 6]],
          ];
          chimeFlute[bar].forEach(([stepIdx, midi, dur]) => {
            if (s === stepIdx) {
              this.fluteWith(nodes, midi, t, sd * dur, 0.058, 'L');
              if (isB) this.violinLeadWith(nodes, midi, t, sd * dur, 0.04, 'L');
            }
          });
        },
      },

      // 12: Glowdeep Caverns (Bioluminescent Grotto — 8-bar Resonant Marimba + Felt Piano + Deep Cello/Horn Cavern Calls)
      12: {
        bpm: 72,
        len: 16,
        sw: 0,
        f: 0.46,
        rv: 0.66,
        pr: [
          [45, 'm11'],  // Am11
          [43, 'S'],    // G sus2
          [41, 'M9'],   // F M9
          [40, 'm7'],   // Em7
          [38, 'm9'],   // Dm9
          [41, 'M7'],   // F M7
          [47, 'm7'],   // Bm7
          [40, 'sus4'], // E sus4
        ],
        p: (nodes, b, s, t, c, sd) => {
          const bar = b % 8;
          const isB = bar >= 4;

          if (s === 0) {
            this.stringsPadWith(nodes, c.slice(0, 4).map((x) => x + 12), t, sd * 16.4, isB ? 0.02 : 0.015);
            this.celloBassWith(nodes, c[0] - 12, t, sd * 12, 0.115);
            if (bar === 0 || bar === 4) this.timpaniWith(nodes, c[0] - 12, t, 0.09);
          }
          if ([0, 3, 6, 10, 13].includes(s)) {
            const m = c[(s + bar) % 4] + 12;
            this.feltPianoWith(nodes, m, t, sd * 3.5, 0.042, 'C');
            this.marimbaWith(nodes, m, t, sd * 2.5, 0.044, 'R');
          }
          if (s === 4 || s === 12) {
            this.bellWith(nodes, c[2] + 36, t, 2.0, 0.032, s === 4 ? 'WL' : 'WR');
          }
          if ((bar % 2 === 1) && s === 2) {
            this.woodwindChoirWith(nodes, c[1] + 12, t, sd * 9.5, 0.034, 'L');
          }
          if (isB && s === 0) {
            this.frenchHornWith(nodes, c[2], t, sd * 10.5, 0.034, 'R');
          }
        },
      },

      // 13: The Moon Road (Dreamwalk — 8-bar Ethereal Starlight Orchestra: Harp Rolls + Celesta + Strings + Flute/Violin Duet)
      13: {
        bpm: 70,
        len: 16,
        sw: 0,
        f: 0.42,
        rv: 0.62,
        pr: [
          [49, 'M9'], // Db M9
          [46, 'm9'], // Bbm9
          [44, 'm7'], // Abm7
          [47, 'S'],  // B sus2
          [42, 'M9'], // Gb M9
          [44, 'D9'], // Ab9
          [41, 'm7'], // Fm7
          [46, 'm9'], // Bbm9
        ],
        p: (nodes, b, s, t, c, sd) => {
          const bar = b % 8;
          const isB = bar >= 4;

          if (s === 0) {
            this.stringsPadWith(nodes, c.slice(0, 4).map((x) => x + 12), t, sd * 16.5, isB ? 0.022 : 0.017);
            this.celloBassWith(nodes, c[0] - 12, t, sd * 13, 0.11);
            this.harpRollWith(nodes, c.slice(0, 4).map((x) => x + 12), t, 0.25, 2.1, 0.032);
          }
          if (s % 2 === 0) {
            this.feltPianoWith(nodes, c[(s / 2) % 4] + 12, t, sd * 3.8, 0.044, 'C');
          }
          if (s === 0 || s === 8) {
            const bellNote = c[bar % 2 === 0 ? 3 : 2] + 24;
            this.bellWith(nodes, bellNote, t, 2.2, 0.04, 'WL');
            if (isB) {
              this.fluteWith(nodes, bellNote - 12, t, sd * 7.2, 0.048, 'L');
              this.violinLeadWith(nodes, bellNote - 12, t, sd * 7.5, 0.042, 'L');
            } else if (s === 8) {
              this.woodwindChoirWith(nodes, bellNote - 12, t, sd * 6.8, 0.032, 'R');
            }
          }
          if (bar === 7 && s === 8) {
            this.cymbalSwellWith(nodes, t, sd * 7.5, 0.024);
          }
        },
      },

      // 14: The Dawn Duet (Finale Song & Dawn Spire — 16-bar Full Grand Symphony: Lullaby Flute/Celesta + Reveille Violin/Horn Brass + Harp + Timpani)
      14: {
        bpm: 96,
        len: 16,
        sw: 0,
        f: 0.32,
        rv: 0.54,
        pr: [
          // Part I: The Dawn Rising (0..7)
          [48, 'M9'],   // C M9
          [43, 'S'],    // G sus2
          [45, 'm9'],   // Am9
          [41, 'M9'],   // F M9
          [48, 'M9'],   // C M9
          [43, 'M'],    // G
          [41, 'M7'],   // F M7
          [43, 'sus4'], // G sus4
          // Part II: Grand Finale Duet Soaring Climax (8..15)
          [45, 'm9'],   // Am9
          [41, 'M9'],   // F M9
          [48, 'M9'],   // C M9
          [43, 'D9'],   // G9
          [41, 'M9'],   // F M9
          [43, 'M'],    // G
          [50, 'm9'],   // Dm9
          [43, 'S'],    // G sus2
        ],
        p: (nodes, b, s, t, c, sd) => {
          const bar = b % 16;
          const isGrand = bar >= 8;

          if (s === 0) {
            this.stringsPadWith(nodes, c.slice(0, 4).map((x) => x + 12), t, sd * 16.2, isGrand ? 0.024 : 0.019);
            this.celloBassWith(nodes, c[0] - 12, t, sd * 11, isGrand ? 0.13 : 0.115);
            if (isGrand || bar === 0 || bar === 4) {
              this.timpaniWith(nodes, c[0] - 12, t, isGrand ? 0.125 : 0.095);
            }
            if (bar === 0 || bar === 8 || bar === 12) {
              this.harpRollWith(nodes, c.slice(0, 4).map((x) => x + 12), t, 0.18, 2.2, 0.04);
            }
          }

          if (s % 2 === 0) {
            this.harpWith(nodes, c[(s / 2) % 4] + 12, t, sd * 3.8, 0.04, 'R');
          }
          if (isGrand && (s === 4 || s === 12)) {
            this.pizzicatoStringsWith(nodes, [c[1] + 12, c[2] + 12], t, 0.036, 'L');
          }

          // Symphonic rhythmic drive
          if (s === 0 || s === 8) this.kickWith(nodes, t, isGrand ? 0.115 : 0.095);
          if (s === 4 || s === 12) {
            this.shakerWith(nodes, t, 0.011);
            if (isGrand) {
              this.snareWith(nodes, t, 0.028);
              this.tambourineWith(nodes, t, 0.015);
            }
          }
          if ((bar === 7 || bar === 15) && s === 8) {
            this.cymbalSwellWith(nodes, t, sd * 7.6, 0.034);
          }

          // Theme A (0..7) & Theme B (8..15): Lullaby (Flute/Celesta) + Reveille (Violins/French Horn)
          const duetLead: [number, number, number][][] = [
            [[0, 76, 4], [4, 79, 4], [8, 84, 7]],
            [[0, 83, 4], [4, 81, 4], [8, 79, 7]],
            [[0, 76, 3], [4, 81, 4], [8, 84, 7]],
            [[0, 81, 4], [4, 79, 4], [8, 77, 6]],
            [[0, 79, 3], [4, 84, 4], [8, 88, 7]],
            [[0, 86, 4], [4, 83, 4], [8, 79, 7]],
            [[0, 81, 4], [4, 84, 4], [8, 86, 6]],
            [[0, 84, 14]],
            // Grand Section B: soaring harmonies
            [[0, 88, 4], [4, 86, 4], [8, 84, 7]],
            [[0, 86, 4], [4, 84, 4], [8, 81, 7]],
            [[0, 84, 4], [4, 88, 4], [8, 91, 7]],
            [[0, 89, 4], [4, 86, 4], [8, 83, 7]],
            [[0, 81, 4], [4, 84, 4], [8, 88, 7]],
            [[0, 86, 4], [4, 83, 4], [8, 79, 7]],
            [[0, 81, 4], [4, 84, 4], [8, 86, 6]],
            [[0, 84, 14]],
          ];

          duetLead[bar].forEach(([stepIdx, midi, dur]) => {
            if (s === stepIdx) {
              this.fluteWith(nodes, midi, t, sd * dur, isGrand ? 0.068 : 0.062, 'L');
              this.violinLeadWith(nodes, midi - (isGrand ? 0 : 12), t, sd * dur, isGrand ? 0.056 : 0.042, 'L');
              this.feltPianoWith(nodes, midi, t, sd * dur, 0.044, 'C');
              if (s === 0) {
                this.bellWith(nodes, midi + 12, t, 1.9, isGrand ? 0.036 : 0.028, 'WL');
                this.frenchHornWith(nodes, c[0] + 12, t, sd * 9.5, isGrand ? 0.046 : 0.032, 'R');
              }
            }
          });
        },
      },
    };

    const resolveProgram = trackId === 0 ? this.biomeTracks[this.activeBiome] || 3 : trackId;
    return { programId: resolveProgram, song: songs[resolveProgram] || songs[3] };
  }

  private runGlobalScheduleStep(
    now: number,
    getNextTime: () => number,
    advanceTime: (stepDur: number) => void
  ) {
    if (!this.ctx || !this.dryBus || !this.fxGain || !this.noiseBuffer) return;

    // Mute (15) or Custom Audio (16): fade out active track instance cleanly & do not accumulate scheduler debt
    if (this.currentTrack >= 15) {
      this.trackController.fadeOutActive(this.ctx, 0.24);
      this.scheduler.resetToNow(0.16);
      return;
    }

    let stepsScheduled = 0;
    while (getNextTime() < now + 0.28 && stepsScheduled < 6) {
      stepsScheduled++;

      const { programId, song } = this.getSongProgram(this.currentTrack);
      const slot = this.trackController.transitionTo(
        this.ctx,
        this.dryBus,
        this.fxGain,
        this.noiseBuffer,
        programId,
        song,
        {
          delayGain: this.delayGain,
          reverbGain: this.reverbGain,
          delayL: this.delayL,
          delayR: this.delayR,
        },
        0.34
      );

      const isNewSlot = slot.step === 0;
      if (isNewSlot) {
        this.scheduler.resetToNow(0.04);
      }

      const sd = 60 / slot.song.bpm / 4;
      const s = slot.step % slot.song.len;
      const b = (slot.step / slot.song.len) | 0;
      const pr = slot.song.pr[b % slot.song.pr.length];
      const chord = (this.chordTypes[pr[1]] || this.chordTypes.M).map((x: number) => pr[0] + x);

      slot.song.p(slot.nodes, b, s, getNextTime() + (s % 2 ? sd * slot.song.sw : 0), chord, sd);
      advanceTime(sd);
      slot.step++;
    }
  }

  // ==================== OFFLINE WAV RENDERING & DEVICE DOWNLOAD ====================

  private encodeAudioBufferToWavBlob(buffer: AudioBuffer): Blob {
    const numChannels = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    const length = buffer.length;
    const bytesPerSample = 2; // 16-bit PCM
    const blockAlign = numChannels * bytesPerSample;
    const dataSize = length * blockAlign;
    const arrayBuffer = new ArrayBuffer(44 + dataSize);
    const view = new DataView(arrayBuffer);

    const writeStr = (offset: number, str: string) => {
      for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
    };

    writeStr(0, 'RIFF');
    view.setUint32(4, 36 + dataSize, true);
    writeStr(8, 'WAVE');
    writeStr(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * blockAlign, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, 16, true);
    writeStr(36, 'data');
    view.setUint32(40, dataSize, true);

    const channels: Float32Array[] = [];
    for (let c = 0; c < numChannels; c++) channels.push(buffer.getChannelData(c));

    let offset = 44;
    for (let i = 0; i < length; i++) {
      for (let c = 0; c < numChannels; c++) {
        let sample = channels[c][i];
        // Soft saturation limiter so rendered WAV never clips
        sample = Math.tanh(sample * 1.15);
        const int16 = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
        view.setInt16(offset, Math.max(-32768, Math.min(32767, int16)), true);
        offset += 2;
      }
    }

    return new Blob([arrayBuffer], { type: 'audio/wav' });
  }

  private triggerBlobDownload(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  }

  private crcTable: Uint32Array | null = null;

  private getCrc32Table(): Uint32Array {
    if (this.crcTable) return this.crcTable;
    const table = new Uint32Array(256);
    for (let i = 0; i < 256; i++) {
      let c = i;
      for (let j = 0; j < 8; j++) {
        c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      }
      table[i] = c >>> 0;
    }
    this.crcTable = table;
    return table;
  }

  private crc32(bytes: Uint8Array): number {
    const table = this.getCrc32Table();
    let crc = 0xffffffff;
    for (let i = 0; i < bytes.length; i++) {
      crc = table[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
    }
    return (crc ^ 0xffffffff) >>> 0;
  }

  private createZipBlob(files: { name: string; bytes: Uint8Array }[]): Blob {
    const encoder = new TextEncoder();
    const localParts: Uint8Array[] = [];
    const centralParts: Uint8Array[] = [];
    let offset = 0;

    for (const file of files) {
      const nameBytes = encoder.encode(file.name);
      const crc = this.crc32(file.bytes);
      const size = file.bytes.length;

      // Local file header (30 bytes + filename)
      const localHeader = new Uint8Array(30 + nameBytes.length);
      const lv = new DataView(localHeader.buffer);
      lv.setUint32(0, 0x04034b50, true);
      lv.setUint16(4, 20, true);
      lv.setUint16(6, 0, true);
      lv.setUint16(8, 0, true); // store (uncompressed)
      lv.setUint16(10, 0, true);
      lv.setUint16(12, 0, true);
      lv.setUint32(14, crc, true);
      lv.setUint32(18, size, true);
      lv.setUint32(22, size, true);
      lv.setUint16(26, nameBytes.length, true);
      lv.setUint16(28, 0, true);
      localHeader.set(nameBytes, 30);

      localParts.push(localHeader, file.bytes);

      // Central directory header (46 bytes + filename)
      const centralHeader = new Uint8Array(46 + nameBytes.length);
      const cv = new DataView(centralHeader.buffer);
      cv.setUint32(0, 0x02014b50, true);
      cv.setUint16(4, 20, true);
      cv.setUint16(6, 20, true);
      cv.setUint16(8, 0, true);
      cv.setUint16(10, 0, true);
      cv.setUint16(12, 0, true);
      cv.setUint16(14, 0, true);
      cv.setUint32(16, crc, true);
      cv.setUint32(20, size, true);
      cv.setUint32(24, size, true);
      cv.setUint16(28, nameBytes.length, true);
      cv.setUint16(30, 0, true);
      cv.setUint16(32, 0, true);
      cv.setUint16(34, 0, true);
      cv.setUint16(36, 0, true);
      cv.setUint32(38, 0, true);
      cv.setUint32(42, offset, true);
      centralHeader.set(nameBytes, 46);

      centralParts.push(centralHeader);
      offset += localHeader.length + size;
    }

    const centralSize = centralParts.reduce((acc, part) => acc + part.length, 0);
    const eocd = new Uint8Array(22);
    const ev = new DataView(eocd.buffer);
    ev.setUint32(0, 0x06054b50, true);
    ev.setUint16(4, 0, true);
    ev.setUint16(6, 0, true);
    ev.setUint16(8, files.length, true);
    ev.setUint16(10, files.length, true);
    ev.setUint32(12, centralSize, true);
    ev.setUint32(16, offset, true);
    ev.setUint16(20, 0, true);

    const blobParts: BlobPart[] = [
      ...localParts.map((u) => new Uint8Array(u)),
      ...centralParts.map((u) => new Uint8Array(u)),
      new Uint8Array(eocd),
    ];
    return new Blob(blobParts, { type: 'application/zip' });
  }

  public async renderTrackWavBlob(trackIndex: number): Promise<{ filename: string; title: string; blob: Blob }> {
    const effectiveIdx = trackIndex === 0 ? this.biomeTracks[this.activeBiome] || 3 : trackIndex;
    const { song: g } = this.getSongProgram(effectiveIdx);
    const meta = MUSIC_TRACKS[trackIndex] || MUSIC_TRACKS[effectiveIdx];
    const title = meta?.[1] || `Track ${effectiveIdx}`;
    const cleanName = title.replace(/[^a-zA-Z0-9_-]+/g, '_').replace(/^_|_$/g, '');

    const barsToRender = Math.max(8, Math.min(16, g.pr.length)); // Full A+B orchestral suite
    const sd = 60 / g.bpm / 4;
    const totalSteps = barsToRender * g.len;
    const tailSeconds = 3.0;
    const duration = totalSteps * sd + tailSeconds;
    const sampleRate = 44100;

    const offline = new OfflineAudioContext(2, Math.ceil(sampleRate * duration), sampleRate);
    const chain = this.buildAudioChain(offline, offline.destination, 0.92);
    chain.delayGain.gain.setValueAtTime(g.f, 0);
    chain.reverbGain.gain.setValueAtTime(g.rv, 0);
    chain.delayL.delayTime.setValueAtTime((60 / g.bpm) * 0.75, 0);
    chain.delayR.delayTime.setValueAtTime((60 / g.bpm) * 1.125, 0);

    const nodes: SynthNodes = {
      ctx: offline,
      fxGain: chain.fxGain,
      dryBus: chain.dryBus,
      noiseBuffer: chain.noiseBuffer,
      panL: chain.panL,
      panR: chain.panR,
      panWideL: chain.panWideL,
      panWideR: chain.panWideR,
    };

    for (let stepIdx = 0; stepIdx < totalSteps; stepIdx++) {
      const s = stepIdx % g.len;
      const b = Math.floor(stepIdx / g.len);
      const pr = g.pr[b % g.pr.length];
      const chord = (this.chordTypes[pr[1]] || this.chordTypes.M).map((x: number) => pr[0] + x);
      const when = 0.08 + stepIdx * sd + (s % 2 ? sd * g.sw : 0);
      g.p(nodes, b, s, when, chord, sd);
    }

    // Smooth fade-out at end of render
    const fadeStart = Math.max(0.5, duration - 1.8);
    chain.masterGain.gain.setValueAtTime(0.92, fadeStart);
    chain.masterGain.gain.linearRampToValueAtTime(0.0001, duration - 0.05);

    const renderedBuffer = await offline.startRendering();
    const wavBlob = this.encodeAudioBufferToWavBlob(renderedBuffer);
    const filename = `Mochi_Meadows_2_-_${cleanName}.wav`;
    return { filename, title, blob: wavBlob };
  }

  public async downloadTrackAsWav(trackIndex: number): Promise<string> {
    const { filename, blob } = await this.renderTrackWavBlob(trackIndex);
    this.triggerBlobDownload(blob, filename);
    return filename;
  }

  public async downloadAllTracksZip(
    onProgress?: (current: number, total: number, trackTitle: string) => void
  ): Promise<string> {
    const trackIndices = Array.from({ length: 14 }, (_, i) => i + 1); // Tracks 1..14
    const files: { name: string; bytes: Uint8Array }[] = [];

    for (let i = 0; i < trackIndices.length; i++) {
      const idx = trackIndices[i];
      const trackTitle = MUSIC_TRACKS[idx]?.[1] || `Track ${idx}`;
      onProgress?.(i + 1, trackIndices.length, trackTitle);
      await new Promise((resolve) => setTimeout(resolve, 10));

      const { filename, blob } = await this.renderTrackWavBlob(idx);
      const ab = await blob.arrayBuffer();
      const prefix = String(i + 1).padStart(2, '0');
      files.push({
        name: `${prefix}_${filename}`,
        bytes: new Uint8Array(ab),
      });
    }

    const zipBlob = this.createZipBlob(files);
    const zipName = 'Mochi_Meadows_2_Complete_Soundtrack.zip';
    this.triggerBlobDownload(zipBlob, zipName);
    return zipName;
  }

  public async downloadSongWeaverAsWav(
    notes: number[],
    titleOrOpts:
      | string
      | { title?: string; bpm?: number; instrument?: 'celesta' | 'harp' | 'flute' | 'bell' | 'marimba' } = 'Moonlit_Music_Box'
  ): Promise<string> {
    const validNotes = notes.some((n) => typeof n === 'number' && n > 0);
    if (!validNotes) throw new Error('Add at least one note before downloading');

    const title = typeof titleOrOpts === 'string' ? titleOrOpts : (titleOrOpts.title || 'Song_Weaver_Lullaby');
    const bpm = typeof titleOrOpts === 'string' ? 115 : (titleOrOpts.bpm || 100);
    const instrument = typeof titleOrOpts === 'string' ? 'celesta' : (titleOrOpts.instrument || 'celesta');

    const stepSec = 60 / bpm / 2;
    const loops = 2;
    const duration = Math.max(4, notes.length * stepSec * loops + 3.2);
    const sampleRate = 44100;
    const offline = new OfflineAudioContext(2, Math.ceil(sampleRate * duration), sampleRate);
    const chain = this.buildAudioChain(offline, offline.destination, 0.92);
    chain.reverbGain.gain.setValueAtTime(0.5, 0);
    const nodes: SynthNodes = {
      ctx: offline,
      fxGain: chain.fxGain,
      dryBus: chain.dryBus,
      noiseBuffer: chain.noiseBuffer,
      panL: chain.panL,
      panR: chain.panR,
      panWideL: chain.panWideL,
      panWideR: chain.panWideR,
    };

    for (let loop = 0; loop < loops; loop++) {
      notes.forEach((midi, idx) => {
        if (typeof midi === 'number' && midi > 0) {
          const t = 0.08 + (loop * notes.length + idx) * stepSec;
          if (instrument === 'celesta') {
            this.bellWith(nodes, midi + 12, t, 1.25, 0.09);
            this.feltPianoWith(nodes, midi, t, 0.9, 0.065);
          } else if (instrument === 'harp') {
            this.harpWith(nodes, midi, t, 1.35, 0.11);
          } else if (instrument === 'flute') {
            this.fluteWith(nodes, midi + 12, t, stepSec * 1.4, 0.075);
          } else if (instrument === 'bell') {
            this.bellWith(nodes, midi + 12, t, 1.45, 0.105);
          } else {
            this.marimbaWith(nodes, midi, t, 0.75, 0.105);
          }
          // Subtle bass anchor on bar downbeats
          if (idx % 4 === 0) {
            this.stringsPadWith(nodes, [midi - 12, midi - 5], t, stepSec * 3.8, 0.022);
          }
        }
      });
    }

    const renderedBuffer = await offline.startRendering();
    const wavBlob = this.encodeAudioBufferToWavBlob(renderedBuffer);
    const safeTitle = title.replace(/[^a-zA-Z0-9_-]+/g, '_');
    const filename = `Mochi_Meadows_2_-_${safeTitle}.wav`;
    this.triggerBlobDownload(wavBlob, filename);
    return filename;
  }

  // ==================== GORGEOUS EXPRESSIVE SFX ====================

  public chime() {
    this.init();
    const nodes = this.getLiveNodes();
    if (!nodes) return;
    const now = nodes.ctx.currentTime;
    [0, 4, 7, 12].forEach((k, i) => {
      this.bellWith(nodes, 76 + k, now + i * 0.065, 1.05, 0.09);
      this.harpWith(nodes, 64 + k, now + i * 0.065, 0.85, 0.055);
    });
  }

  public pop() {
    this.init();
    const nodes = this.getLiveNodes();
    if (!nodes) return;
    const now = nodes.ctx.currentTime;
    this.feltPianoWith(nodes, 69, now, 0.24, 0.075);
    this.bellWith(nodes, 81, now + 0.045, 0.32, 0.045);
  }

  public noteSpeech(midi: number) {
    this.init();
    const nodes = this.getLiveNodes();
    if (!nodes) return;
    this.feltPianoWith(nodes, midi, nodes.ctx.currentTime, 0.14, 0.042);
  }

  public castSpell(spellId: string) {
    const spellMap: Record<string, number> = {
      sense: 0,
      star_sense: 0,
      wings: 1,
      cloud_wings: 1,
      blink: 2,
      glimmer_step: 2,
      frost: 3,
      frost_bridge: 3,
      tide: 4,
      tide_song: 4,
      pull: 5,
      moon_pull: 5,
      bloom: 6,
      hush: 7,
      hug: 7,
      hush_hug: 7,
      ember: 8,
      warmth: 8,
      ember_warmth: 8,
      echo: 9,
      echo_call: 9,
      dream: 10,
      dreamwalk: 10,
      dawn: 11,
      dawn_break: 11,
      sunburst: 11,
      weave: 0,
      duet: 6,
      teleport: 12,
      song_of_teleportation: 12,
    };
    const idx = spellMap[spellId] ?? 0;
    this.castSpellSound(idx);
  }

  public castSpellSound(spellIndex: number) {
    this.init();
    const nodes = this.getLiveNodes();
    if (!nodes) return;
    const now = nodes.ctx.currentTime;

    switch (spellIndex) {
      case 0: // Star Sense
        [72, 76, 79, 84, 88].forEach((m, i) => this.bellWith(nodes, m, now + i * 0.055, 1.4, 0.068));
        break;
      case 1: // Cloud Wings
        this.fluteWith(nodes, 74, now, 0.45, 0.085);
        this.fluteWith(nodes, 79, now + 0.11, 0.65, 0.075);
        this.harpWith(nodes, 86, now + 0.18, 0.9, 0.045);
        break;
      case 2: // Glimmer Step
        this.bellWith(nodes, 81, now, 0.25, 0.07);
        this.bellWith(nodes, 93, now + 0.05, 0.4, 0.06);
        break;
      case 3: // Frost Bridge
        [76, 80, 83, 88].forEach((m, i) => this.bellWith(nodes, m, now + i * 0.07, 1.6, 0.065));
        break;
      case 4: // Tide Song
        [60, 64, 67, 72].forEach((m, i) => this.harpWith(nodes, m, now + i * 0.06, 1.2, 0.065));
        this.fluteWith(nodes, 79, now + 0.18, 0.75, 0.065);
        break;
      case 5: // Moon Pull
        [84, 81, 76, 72].forEach((m, i) => this.harpWith(nodes, m, now + i * 0.06, 1.1, 0.07));
        break;
      case 6: // Bloom
        [60, 64, 67, 72, 76, 79].forEach((m, i) => this.harpWith(nodes, m, now + i * 0.05, 1.35, 0.07));
        break;
      case 7: // Hush Hug
        this.stringsPadWith(nodes, [60, 64, 67, 71], now, 1.6, 0.025);
        break;
      case 8: // Ember Warmth
        this.guitarPluckWith(nodes, 55, now, 0.55, 0.075);
        this.feltPianoWith(nodes, 67, now + 0.07, 0.65, 0.08);
        break;
      case 9: // Echo Call
        this.bellWith(nodes, 72, now, 2.2, 0.075);
        this.bellWith(nodes, 72, now + 0.24, 1.9, 0.048);
        this.bellWith(nodes, 79, now + 0.48, 1.8, 0.036);
        break;
      case 10: // Dreamwalk
        [69, 73, 76, 81, 85].forEach((m, i) => this.bellWith(nodes, m, now + i * 0.08, 2.3, 0.06));
        break;
      case 11: // Dawn Break
        [60, 65, 69, 72, 77, 84].forEach((m, i) => {
          this.fluteWith(nodes, m, now + i * 0.075, 0.9, 0.07);
          this.harpWith(nodes, m - 12, now + i * 0.075, 1.1, 0.05);
        });
        break;
      case 12: // Song of Teleportation
        [64, 69, 71, 76, 81, 88].forEach((m, i) => this.harpWith(nodes, m, now + i * 0.05, 1.5, 0.075));
        this.bellWith(nodes, 88, now + 0.32, 2.0, 0.07);
        break;
      default:
        this.chime();
    }
  }

  public teleportWarp() {
    this.castSpellSound(12);
  }

  public harmonyChime(_name?: string) {
    this.init();
    const nodes = this.getLiveNodes();
    if (!nodes) return;
    const now = nodes.ctx.currentTime;
    [60, 67, 72, 76, 79, 84, 88].forEach((m, i) => {
      this.bellWith(nodes, m, now + i * 0.045, 2.4, 0.065);
    });
  }

  public hollowSoothed() {
    this.init();
    const nodes = this.getLiveNodes();
    if (!nodes) return;
    const now = nodes.ctx.currentTime;
    [57, 60, 64, 67, 72, 76].forEach((m, i) => {
      this.harpWith(nodes, m, now + i * 0.07, 1.6, 0.078);
    });
  }

  public hollowBloom() {
    this.hollowSoothed();
  }

  public duskWhistle() {
    this.init();
    const nodes = this.getLiveNodes();
    if (!nodes) return;
    const now = nodes.ctx.currentTime;
    [62, 65, 67, 69].forEach((m, i) => {
      this.fluteWith(nodes, m, now + i * 0.21, 0.36, 0.075);
    });
  }

  public dawnChimeSound() {
    this.init();
    const nodes = this.getLiveNodes();
    if (!nodes) return;
    const now = nodes.ctx.currentTime;
    [72, 79, 84, 91].forEach((m, i) => {
      this.bellWith(nodes, m, now + i * 0.11, 3.1, 0.078);
    });
  }

  public playSongWeaverNote(
    midi: number,
    instrument: 'bell' | 'flute' | 'harp' | 'marimba' | 'celesta' = 'celesta'
  ) {
    this.init();
    const nodes = this.getLiveNodes();
    if (!nodes) return;
    const now = nodes.ctx.currentTime;
    switch (instrument) {
      case 'bell':
        this.bellWith(nodes, midi, now, 1.9, 0.09);
        break;
      case 'flute':
        this.fluteWith(nodes, midi, now, 0.55, 0.095);
        break;
      case 'harp':
        this.harpWith(nodes, midi, now, 1.6, 0.09);
        break;
      case 'marimba':
        this.marimbaWith(nodes, midi, now, 0.55, 0.1);
        break;
      case 'celesta':
      default:
        this.bellWith(nodes, midi + 12, now, 1.35, 0.075);
        this.harpWith(nodes, midi, now, 1.05, 0.065);
        break;
    }
  }

  public playMusicBox(notes: number[]) {
    if (!notes || notes.length === 0) return;
    this.init();
    notes.forEach((note, idx) => {
      if (note !== null && typeof note === 'number') {
        setTimeout(() => {
          this.playSongWeaverNote(note, 'celesta');
        }, idx * 260);
      }
    });
  }

  // ==================== WEATHER, BIOME & SEASON AMBIENT ENGINE ====================

  private createAmbientPinkNoiseBuffer(ctx: AudioContext, seconds: number = 4.5): AudioBuffer {
    const rate = ctx.sampleRate;
    const len = Math.floor(rate * seconds);
    const buf = ctx.createBuffer(1, len, rate);
    const ch = buf.getChannelData(0);

    // Paul Kellet's refined pink-noise filter for warm, natural rain, surf & wind spectra
    let b0 = 0;
    let b1 = 0;
    let b2 = 0;
    let b3 = 0;
    let b4 = 0;
    let b5 = 0;
    let b6 = 0;

    for (let i = 0; i < len; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      const sample = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
      b6 = white * 0.115926;
      ch[i] = Math.max(-1, Math.min(1, sample));
    }

    // Seamless crossfade between tail and head so looping never clicks
    const seam = Math.min(Math.floor(rate * 0.25), Math.floor(len * 0.1));
    for (let i = 0; i < seam; i++) {
      const t = i / seam;
      const tailIdx = len - seam + i;
      const mixed = ch[i] * t + ch[tailIdx] * (1 - t);
      ch[i] = mixed;
    }

    return buf;
  }

  private initAmbientEngine() {
    if (!this.ctx || !this.warmthFilter || this.ambientMasterGain) return;
    try {
      const ctx = this.ctx;
      const now = ctx.currentTime;

      this.ambientNoiseBuffer = this.createAmbientPinkNoiseBuffer(
        ctx,
        this.isCompactDevice ? 1.8 : 2.6
      );

    const ambientMaster = ctx.createGain();
    ambientMaster.gain.setValueAtTime(this.ambientEnabled ? 1 : 0, now);
    ambientMaster.connect(this.warmthFilter);
    this.ambientMasterGain = ambientMaster;

    // 1. Continuous Wind & Howling Gust Bed (modulated sweeping bandpass -> soft lowpass)
    const windSrc = ctx.createBufferSource();
    windSrc.buffer = this.ambientNoiseBuffer;
    windSrc.loop = true;

    const windBp = ctx.createBiquadFilter();
    windBp.type = 'bandpass';
    windBp.frequency.setValueAtTime(340, now);
    windBp.Q.setValueAtTime(2.2, now);

    const windLp = ctx.createBiquadFilter();
    windLp.type = 'lowpass';
    windLp.frequency.setValueAtTime(1400, now);

    const windSwellGain = ctx.createGain();
    windSwellGain.gain.setValueAtTime(0.85, now);

    const windGain = ctx.createGain();
    windGain.gain.setValueAtTime(0.0001, now);

    // Dual slow LFOs so wind organically breathes and whistles without abrupt steps or negative gain swings
    const windPitchLfo = ctx.createOscillator();
    windPitchLfo.type = 'sine';
    windPitchLfo.frequency.setValueAtTime(0.11, now);
    const windPitchDepth = ctx.createGain();
    windPitchDepth.gain.setValueAtTime(115, now);
    windPitchLfo.connect(windPitchDepth);
    windPitchDepth.connect(windBp.frequency);

    const windAmpLfo = ctx.createOscillator();
    windAmpLfo.type = 'sine';
    windAmpLfo.frequency.setValueAtTime(0.07, now);
    const windAmpDepth = ctx.createGain();
    windAmpDepth.gain.setValueAtTime(0.24, now);
    windAmpLfo.connect(windAmpDepth);
    windAmpDepth.connect(windSwellGain.gain);

    windSrc.connect(windBp);
    windBp.connect(windLp);
    windLp.connect(windSwellGain);
    windSwellGain.connect(windGain);
    windGain.connect(ambientMaster);
    windSrc.start(now);
    windPitchLfo.start(now);
    windAmpLfo.start(now);

    this.windBpFilter = windBp;
    this.windLpFilter = windLp;
    this.windGain = windGain;

    // 2. Continuous Rain / Drizzle Patter Bed
    const rainSrc = ctx.createBufferSource();
    rainSrc.buffer = this.ambientNoiseBuffer;
    rainSrc.loop = true;
    rainSrc.playbackRate.setValueAtTime(1.18, now); // slightly brighter patter grain

    const rainHp = ctx.createBiquadFilter();
    rainHp.type = 'highpass';
    rainHp.frequency.setValueAtTime(620, now);

    const rainLp = ctx.createBiquadFilter();
    rainLp.type = 'lowpass';
    rainLp.frequency.setValueAtTime(3600, now);

    const rainGain = ctx.createGain();
    rainGain.gain.setValueAtTime(0.0001, now);

    rainSrc.connect(rainHp);
    rainHp.connect(rainLp);
    rainLp.connect(rainGain);
    rainGain.connect(ambientMaster);
    rainSrc.start(now + 0.15);

    this.rainHpFilter = rainHp;
    this.rainLpFilter = rainLp;
    this.rainGain = rainGain;

    // 3. Biome Acoustic Bed (Ocean Surf / Sub-Aquatic Current / Cavern Air / Geothermal Steam)
    const biomeSrc = ctx.createBufferSource();
    biomeSrc.buffer = this.ambientNoiseBuffer;
    biomeSrc.loop = true;
    biomeSrc.playbackRate.setValueAtTime(0.84, now);

    const biomeLp = ctx.createBiquadFilter();
    biomeLp.type = 'lowpass';
    biomeLp.frequency.setValueAtTime(420, now);

    const biomeGain = ctx.createGain();
    biomeGain.gain.setValueAtTime(0.0001, now);

    const waveLfo = ctx.createOscillator();
    waveLfo.type = 'sine';
    waveLfo.frequency.setValueAtTime(0.105, now); // ~9.5s natural ocean wave cycle
    const waveDepth = ctx.createGain();
    waveDepth.gain.setValueAtTime(140, now);
    waveLfo.connect(waveDepth);
    waveDepth.connect(biomeLp.frequency);

    biomeSrc.connect(biomeLp);
    biomeLp.connect(biomeGain);
    biomeGain.connect(ambientMaster);
    biomeSrc.start(now + 0.35);
    waveLfo.start(now);

    this.biomeLpFilter = biomeLp;
    this.biomeGain = biomeGain;

      this.updateAmbientBedTargets(0.8);

      if (this.ambientTimerId !== null) {
        window.clearInterval(this.ambientTimerId);
      }
      this.ambientTimerId = window.setInterval(
        () => this.runAmbientEventTick(),
        this.isCompactDevice ? 520 : 360
      );
    } catch {
      // Fail safely on WebViews with restricted WebAudio nodes
    }
  }

  private getWeatherBlendWeights(): Record<WeatherId, number> {
    const w: Record<WeatherId, number> = {
      sunny: 0,
      drizzle: 0,
      stardust: 0,
      snowy: 0,
      aurora: 0,
      muffin_rain: 0,
    };
    const t = Math.max(0, Math.min(1, this.weatherBlend));
    if (this.activeWeather === this.targetWeather || t <= 0.001) {
      w[this.activeWeather] = 1;
    } else {
      w[this.activeWeather] += 1 - t;
      w[this.targetWeather] += t;
    }
    return w;
  }

  private updateAmbientBedTargets(timeConst: number = 0.5) {
    if (!this.ctx || !this.windGain || !this.rainGain || !this.biomeGain) return;
    const now = this.ctx.currentTime;
    const weights = this.getWeatherBlendWeights();
    const b = this.ambientBiome;
    const season = this.activeSeason;

    const isUnderwater = b === 24;
    const isCave = b === 22 || b === 17;
    const isGlowdeep = b === 22;
    const isSky = b === 21 || b === 23;
    const isCoastal = b === 0 || b === 1 || b === 2 || b === 11 || b === 12;
    const isPeakOrTundra = b === 7 || b === 8 || b === 17;
    const isHotSpringOrVolcano = b === 13 || b === 14;

    // --- Wind Bed Targets (cross-faded across weather transition) ---
    const weatherWindBase =
      weights.snowy * 0.078 +
      weights.aurora * 0.048 +
      weights.drizzle * 0.044 +
      weights.muffin_rain * 0.046 +
      weights.sunny * 0.016 +
      weights.stardust * 0.018;

    const seasonWindMul =
      season === 'winter' ? 1.45 : season === 'autumn' ? 1.25 : season === 'spring' ? 0.92 : 0.85;
    const biomeWindMul = isUnderwater
      ? 0.06
      : isGlowdeep
      ? 0.14
      : isSky
      ? 1.55
      : isPeakOrTundra
      ? 1.48
      : isCoastal
      ? 1.22
      : 1.0;

    const targetWindGain = Math.min(0.14, weatherWindBase * seasonWindMul * biomeWindMul);
    const howlResonance =
      weights.snowy * 3.8 +
      weights.aurora * 2.6 +
      weights.drizzle * 2.1 +
      weights.muffin_rain * 1.4 +
      (season === 'winter' ? 1.8 : season === 'autumn' ? 1.1 : 0) +
      (isPeakOrTundra || isSky ? 1.5 : 0);
    const targetWindQ = isUnderwater || isGlowdeep ? 0.9 : Math.min(6.4, 1.1 + howlResonance);
    const targetWindFreq = isUnderwater
      ? 160
      : isGlowdeep
      ? 210
      : season === 'winter'
      ? 430
      : season === 'autumn'
      ? 350
      : 310;
    const targetWindLp = isUnderwater ? 320 : isGlowdeep ? 440 : 1850;

    try {
      this.windGain.gain.setTargetAtTime(targetWindGain, now, timeConst);
      this.windBpFilter?.Q.setTargetAtTime(targetWindQ, now, timeConst);
      this.windBpFilter?.frequency.setTargetAtTime(targetWindFreq, now, timeConst);
      this.windLpFilter?.frequency.setTargetAtTime(targetWindLp, now, timeConst);

      // --- Rain / Drizzle Patter Bed Targets ---
      const drizzleWeight = weights.drizzle;
      const seasonRainMul =
        season === 'summer' ? 1.18 : season === 'autumn' ? 1.08 : season === 'winter' ? 0.88 : 1.0;
      const biomeRainMul = isUnderwater ? 0.18 : isGlowdeep ? 0.22 : isCave ? 0.55 : isSky ? 0.65 : 1.0;
      const targetRainGain = drizzleWeight > 0.002 ? Math.min(0.13, drizzleWeight * 0.085 * seasonRainMul * biomeRainMul) : 0;

      const targetRainHp = isUnderwater || isGlowdeep ? 180 : season === 'winter' ? 1050 : season === 'autumn' ? 760 : 620;
      const targetRainLp = isUnderwater
        ? 380
        : isGlowdeep
        ? 460
        : season === 'autumn'
        ? 2750 // warm pattering on dry autumn leaves
        : season === 'winter'
        ? 4800 // icy sleet sheen
        : 3700;

      this.rainGain.gain.setTargetAtTime(targetRainGain, now, timeConst);
      this.rainHpFilter?.frequency.setTargetAtTime(targetRainHp, now, timeConst);
      this.rainLpFilter?.frequency.setTargetAtTime(targetRainLp, now, timeConst);

      // --- Biome Surface / Surf / Cavern / Steam Bed Targets ---
      let targetBiomeGain = 0;
      let targetBiomeLp = 420;
      if (isUnderwater) {
        targetBiomeGain = 0.055;
        targetBiomeLp = 240;
      } else if (isGlowdeep) {
        targetBiomeGain = 0.036;
        targetBiomeLp = 260;
      } else if (isCoastal) {
        // Rolling ocean waves intensify gently in drizzle or snowy winds
        const stormLift = 1 + weights.drizzle * 0.5 + weights.snowy * 0.35;
        targetBiomeGain = (b === 0 ? 0.052 : 0.042) * stormLift;
        targetBiomeLp = season === 'winter' ? 520 : 410 + weights.drizzle * 180;
      } else if (isHotSpringOrVolcano) {
        targetBiomeGain = 0.032 * (1 - weights.drizzle * 0.35);
        targetBiomeLp = b === 14 ? 820 : 960;
      } else if (isSky) {
        targetBiomeGain = 0.022;
        targetBiomeLp = 320;
      }

      this.biomeGain.gain.setTargetAtTime(targetBiomeGain, now, timeConst);
      this.biomeLpFilter?.frequency.setTargetAtTime(targetBiomeLp, now, timeConst);
    } catch {
      // Ignore closed/disposed AudioContext state updates
    }
  }

  private trackAmbientVoice(node: AudioScheduledSourceNode) {
    this.activeAmbientVoices++;
    node.onended = () => {
      this.activeAmbientVoices = Math.max(0, this.activeAmbientVoices - 1);
      try {
        node.disconnect();
      } catch {
        // ignore
      }
    };
  }

  private runAmbientEventTick() {
    if (!this.ctx || this.ctx.state !== 'running') return;
    if (!this.ambientEnabled || this.volume <= 0.002) return;
    if (typeof document !== 'undefined' && document.hidden) return;
    const maxVoices = this.isCompactDevice ? 3 : 6;
    if (this.activeAmbientVoices >= maxVoices) return;

    const nodes = this.getLiveNodes();
    if (!nodes) return;

    const now = this.ctx.currentTime;
    const weights = this.getWeatherBlendWeights();
    const b = this.ambientBiome;
    const season = this.activeSeason;

    const isUnderwater = b === 24;
    const isGlowdeep = b === 22;
    const isSky = b === 21 || b === 23;
    const isCoastal = b === 0 || b === 1 || b === 2 || b === 11 || b === 12;
    const isMarsh = b === 15 || b === 16;
    const isWoodsOrMeadow =
      b === 3 || b === 4 || b === 5 || b === 9 || b === 10 || b === 18 || b === 19 || b === 20;
    const isChimeWood = b === 18 || b === 19;
    const isColdBiome = b === 7 || b === 8 || b === 17;
    const isHotBiome = b === 6 || b === 13 || b === 14;

    // 1. Chirping Birds / Seagulls (cross-fades down smoothly during drizzle, night stardust, or winter)
    const weatherBirdWeight =
      weights.sunny * 1.0 +
      weights.muffin_rain * 0.62 +
      weights.drizzle * 0.16 +
      weights.aurora * 0.08 +
      weights.snowy * 0.05 +
      weights.stardust * 0.04;

    const seasonBirdMul =
      season === 'spring' ? 1.35 : season === 'summer' ? 1.15 : season === 'autumn' ? 0.68 : 0.28;

    if (!isUnderwater && !isGlowdeep && b !== 14 && b !== 0 && b !== 23) {
      const birdChance = weatherBirdWeight * seasonBirdMul * (isWoodsOrMeadow ? 0.34 : isCoastal ? 0.24 : 0.18);
      const minBirdGap = season === 'winter' ? 4.8 : 2.1;
      if (now - this.lastBirdAt > minBirdGap && Math.random() < birdChance) {
        this.lastBirdAt = now;
        if (isCoastal && b !== 11 && Math.random() < 0.58) {
          this.playSeagullCall(nodes, now, 0.018 * Math.min(1.2, weatherBirdWeight + 0.25));
        } else {
          this.playAmbientBirdChirp(nodes, now, season, b, Math.min(1.25, weatherBirdWeight + 0.15));
        }
      }
    }

    // 2. Distant Thunder Rumbles (Cross-fades in with Cozy Drizzle, strongest in Summer storms)
    const thunderWeight =
      weights.drizzle * 1.0 +
      weights.snowy * (isColdBiome || season === 'winter' ? 0.08 : 0.02) +
      weights.aurora * 0.04;
    const seasonThunderMul =
      season === 'summer' ? 1.55 : season === 'autumn' ? 1.15 : season === 'spring' ? 0.8 : 0.35;
    if (thunderWeight > 0.12 && now - this.lastThunderAt > 7.5) {
      const thunderChance = thunderWeight * seasonThunderMul * (b === 8 || isCoastal ? 0.17 : 0.12);
      if (Math.random() < thunderChance) {
        this.lastThunderAt = now;
        const rumbleVol = Math.min(1.2, thunderWeight * (isUnderwater || isGlowdeep ? 0.42 : 0.95));
        this.playDistantThunder(nodes, now, rumbleVol, isUnderwater || isGlowdeep);
      }
    }

    // 3. Howling Wind Gust Sweeps (Winter, Snowy, Aurora, Autumn Peaks & Cirrus Sky)
    const howlWeight =
      weights.snowy * 1.0 +
      weights.aurora * 0.65 +
      weights.drizzle * 0.48 +
      weights.muffin_rain * 0.36 +
      weights.stardust * 0.12 +
      weights.sunny * 0.05;
    const seasonHowlMul =
      season === 'winter' ? 1.5 : season === 'autumn' ? 1.25 : season === 'spring' ? 0.58 : 0.42;
    const biomeHowlMul = isColdBiome || isSky ? 1.55 : isUnderwater || isGlowdeep ? 0 : 0.9;
    if (biomeHowlMul > 0 && now - this.lastGustAt > 5.2) {
      const gustChance = howlWeight * seasonHowlMul * biomeHowlMul * 0.12;
      if (Math.random() < gustChance) {
        this.lastGustAt = now;
        this.playHowlingWindGust(nodes, now, Math.min(1.2, howlWeight * seasonHowlMul * 0.65), season, isColdBiome || isSky);
      }
    }

    // 4. Twilight Crickets / Marsh Frogs / Desert Cicadas
    if (!isUnderwater && !isGlowdeep && !isSky && now - this.lastCritterAt > 3.2) {
      const nightWeight = weights.stardust * 1.0 + weights.aurora * 0.72 + weights.drizzle * (isMarsh ? 0.85 : 0.15);
      if (isMarsh && season !== 'winter' && Math.random() < (nightWeight + 0.15) * 0.2) {
        this.lastCritterAt = now;
        this.playPondFrog(nodes, now);
      } else if (
        (season === 'summer' || season === 'autumn' || season === 'spring') &&
        !isColdBiome &&
        !isCoastal &&
        Math.random() < (nightWeight * 0.24 + (season === 'summer' && isHotBiome && weights.sunny > 0.3 ? 0.14 : 0))
      ) {
        this.lastCritterAt = now;
        this.playCricketTrill(nodes, now, season);
      }
    }

    // 5. Biome & Weather Specific Micro-Accents (Stardust/Aurora Chimes, Cave Drips, Bubbles, Wind Chimes)
    if (now - this.lastSparkleAt > 2.4) {
      if (isUnderwater && Math.random() < 0.28) {
        this.lastSparkleAt = now;
        this.playUnderwaterBubble(nodes, now);
      } else if (isGlowdeep && Math.random() < (0.18 + weights.drizzle * 0.25)) {
        this.lastSparkleAt = now;
        this.playCaveDrip(nodes, now);
      } else if (isChimeWood && (weights.sunny + weights.muffin_rain + weights.aurora) > 0.25 && Math.random() < 0.22) {
        this.lastSparkleAt = now;
        this.playWoodlandChime(nodes, now, season);
      } else {
        const celestialWeight =
          weights.stardust * 0.95 +
          weights.aurora * 1.0 +
          weights.snowy * (season === 'winter' || isColdBiome ? 0.55 : 0.28) +
          weights.muffin_rain * 0.45;
        if (celestialWeight > 0.15 && Math.random() < celestialWeight * 0.22) {
          this.lastSparkleAt = now;
          this.playSeasonalWeatherChime(nodes, now, season, weights);
        }
      }
    }
  }

  private playAmbientBirdChirp(
    nodes: SynthNodes,
    t: number,
    season: SeasonId,
    biomeId: number,
    intensity: number
  ) {
    const vol = Math.max(0.008, Math.min(0.032, 0.022 * intensity));
    // Forest cuckoo in Whisper Woods / Bellwood
    if ((biomeId === 4 || biomeId === 18) && season !== 'winter' && Math.random() < 0.24) {
      const f1 = season === 'autumn' ? 660 : 740;
      this.toneWith(nodes, 'sine', f1, t, 0.14, vol * 0.9, 0.018);
      this.toneWith(nodes, 'sine', f1 * 0.8, t + 0.19, 0.2, vol * 0.78, 0.02);
      return;
    }

    const basePitch =
      season === 'spring'
        ? 2550 + Math.random() * 1100
        : season === 'summer'
        ? 2350 + Math.random() * 1300
        : season === 'autumn'
        ? 1850 + Math.random() * 750
        : 2900 + Math.random() * 650; // Crisp winter chickadee

    const noteCount = season === 'winter' ? 2 : season === 'spring' ? 3 + (Math.random() < 0.5 ? 1 : 0) : 2 + (Math.random() < 0.55 ? 1 : 0);

    for (let i = 0; i < noteCount; i++) {
      const start = t + i * (0.095 + Math.random() * 0.055);
      const dur = 0.065 + Math.random() * 0.055;
      const o = nodes.ctx.createOscillator();
      const g = nodes.ctx.createGain();
      const f0 = basePitch * (0.9 + Math.random() * 0.26);
      const bend = season === 'autumn' ? 0.82 : 1.18 + Math.random() * 0.16;

      o.type = 'sine';
      o.frequency.setValueAtTime(f0, start);
      o.frequency.exponentialRampToValueAtTime(Math.max(400, f0 * bend), start + dur * 0.75);

      g.gain.setValueAtTime(0.0001, start);
      g.gain.linearRampToValueAtTime(vol * (0.85 + Math.random() * 0.3), start + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, start + dur);

      o.connect(g);
      g.connect(nodes.fxGain);
      this.trackAmbientVoice(o);
      o.start(start);
      o.stop(start + dur + 0.03);
    }
  }

  private playSeagullCall(nodes: SynthNodes, t: number, intensity: number) {
    const vol = Math.max(0.008, Math.min(0.024, intensity));
    const count = Math.random() < 0.5 ? 2 : 1;
    for (let i = 0; i < count; i++) {
      const start = t + i * 0.26;
      const o = nodes.ctx.createOscillator();
      const bp = nodes.ctx.createBiquadFilter();
      const g = nodes.ctx.createGain();
      const peak = 1280 + Math.random() * 240;

      o.type = 'triangle';
      o.frequency.setValueAtTime(peak * 0.85, start);
      o.frequency.linearRampToValueAtTime(peak, start + 0.08);
      o.frequency.exponentialRampToValueAtTime(peak * 0.68, start + 0.22);

      bp.type = 'bandpass';
      bp.frequency.setValueAtTime(1400, start);
      bp.Q.setValueAtTime(1.8, start);

      g.gain.setValueAtTime(0.0001, start);
      g.gain.linearRampToValueAtTime(vol, start + 0.04);
      g.gain.exponentialRampToValueAtTime(0.0001, start + 0.23);

      o.connect(bp);
      bp.connect(g);
      g.connect(nodes.fxGain);
      this.trackAmbientVoice(o);
      o.start(start);
      o.stop(start + 0.26);
    }
  }

  private playDistantThunder(nodes: SynthNodes, t: number, intensity: number, muffled: boolean) {
    const buf = this.ambientNoiseBuffer || nodes.noiseBuffer;
    const src = nodes.ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    src.playbackRate.setValueAtTime(0.55, t);

    const lp = nodes.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    const startCut = muffled ? 95 : 165;
    lp.frequency.setValueAtTime(startCut, t);
    lp.frequency.exponentialRampToValueAtTime(48, t + 3.4);

    const g = nodes.ctx.createGain();
    const peakGain = Math.min(0.14, 0.095 * intensity);
    // Multi-peaked rolling echo envelope simulating clouds & distant valleys
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(peakGain * 0.55, t + 0.18);
    g.gain.linearRampToValueAtTime(peakGain * 0.28, t + 0.65);
    g.gain.linearRampToValueAtTime(peakGain, t + 1.05);
    g.gain.exponentialRampToValueAtTime(peakGain * 0.22, t + 2.3);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 3.8);

    src.connect(lp);
    lp.connect(g);
    g.connect(this.ambientMasterGain || nodes.dryBus);
    if (!muffled) {
      // Subtle hall send on mid rumble tails
      const fxSend = nodes.ctx.createGain();
      fxSend.gain.setValueAtTime(0.28, t);
      g.connect(fxSend);
      fxSend.connect(nodes.fxGain);
    }

    this.trackAmbientVoice(src);
    src.start(t);
    src.stop(t + 3.9);
  }

  private playHowlingWindGust(
    nodes: SynthNodes,
    t: number,
    intensity: number,
    season: SeasonId,
    highAltitudeOrIce: boolean
  ) {
    const buf = this.ambientNoiseBuffer || nodes.noiseBuffer;
    const src = nodes.ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;

    const bp = nodes.ctx.createBiquadFilter();
    bp.type = 'bandpass';
    const fLow = season === 'winter' || highAltitudeOrIce ? 260 : 210;
    const fPeak = season === 'winter' || highAltitudeOrIce ? 640 + Math.random() * 180 : 440 + Math.random() * 120;
    const dur = 2.6 + Math.random() * 1.3;

    bp.frequency.setValueAtTime(fLow, t);
    bp.frequency.exponentialRampToValueAtTime(fPeak, t + dur * 0.42);
    bp.frequency.exponentialRampToValueAtTime(fLow * 0.88, t + dur);
    bp.Q.setValueAtTime(season === 'winter' || highAltitudeOrIce ? 5.6 : 3.4, t);

    const g = nodes.ctx.createGain();
    const vol = Math.min(0.075, 0.045 * intensity);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + dur * 0.38);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);

    src.connect(bp);
    bp.connect(g);
    g.connect(this.ambientMasterGain || nodes.dryBus);
    this.trackAmbientVoice(src);
    src.start(t);
    src.stop(t + dur + 0.06);
  }

  private playCricketTrill(nodes: SynthNodes, t: number, season: SeasonId) {
    const baseFreq = season === 'autumn' ? 3600 : 4250;
    const pulses = 3 + Math.floor(Math.random() * 2);
    for (let i = 0; i < pulses; i++) {
      const start = t + i * 0.055;
      this.toneWith(nodes, 'sine', baseFreq + Math.random() * 120, start, 0.032, 0.011, 0.004);
    }
  }

  private playPondFrog(nodes: SynthNodes, t: number) {
    [0, 0.22].forEach((offset, i) => {
      const start = t + offset;
      const o = nodes.ctx.createOscillator();
      const g = nodes.ctx.createGain();
      o.type = 'triangle';
      const f0 = i === 0 ? 185 : 215;
      o.frequency.setValueAtTime(f0, start);
      o.frequency.exponentialRampToValueAtTime(f0 * 1.48, start + 0.09);

      g.gain.setValueAtTime(0.0001, start);
      g.gain.linearRampToValueAtTime(0.022, start + 0.015);
      g.gain.exponentialRampToValueAtTime(0.0001, start + 0.11);

      o.connect(g);
      g.connect(nodes.fxGain);
      o.start(start);
      o.stop(start + 0.13);
    });
  }

  private playUnderwaterBubble(nodes: SynthNodes, t: number) {
    const count = Math.random() < 0.45 ? 2 : 1;
    for (let i = 0; i < count; i++) {
      const start = t + i * 0.14;
      const o = nodes.ctx.createOscillator();
      const g = nodes.ctx.createGain();
      const f0 = 310 + Math.random() * 240;
      o.type = 'sine';
      o.frequency.setValueAtTime(f0, start);
      o.frequency.exponentialRampToValueAtTime(f0 * 2.15, start + 0.095);

      g.gain.setValueAtTime(0.0001, start);
      g.gain.linearRampToValueAtTime(0.022, start + 0.015);
      g.gain.exponentialRampToValueAtTime(0.0001, start + 0.1);

      o.connect(g);
      g.connect(nodes.fxGain);
      o.start(start);
      o.stop(start + 0.12);
    }
  }

  private playCaveDrip(nodes: SynthNodes, t: number) {
    const o = nodes.ctx.createOscillator();
    const g = nodes.ctx.createGain();
    const f0 = 880 + Math.random() * 520;
    o.type = 'sine';
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(f0 * 1.45, t + 0.065);

    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.026, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);

    o.connect(g);
    g.connect(nodes.fxGain);
    o.start(t);
    o.stop(t + 0.12);
  }

  private playWoodlandChime(nodes: SynthNodes, t: number, season: SeasonId) {
    const pentatonic =
      season === 'winter'
        ? [84, 88, 91, 96]
        : season === 'autumn'
        ? [74, 79, 81, 86]
        : [79, 81, 84, 88, 91];
    const m = pentatonic[Math.floor(Math.random() * pentatonic.length)];
    this.bellWith(nodes, m, t, 1.4, 0.018);
  }

  private playSeasonalWeatherChime(
    nodes: SynthNodes,
    t: number,
    season: SeasonId,
    weights: Record<WeatherId, number>
  ) {
    const notes =
      season === 'winter'
        ? [88, 91, 95, 100]
        : season === 'autumn'
        ? [79, 83, 86, 91]
        : season === 'summer'
        ? [81, 84, 88, 93]
        : [84, 88, 91, 96];
    const pick = notes[Math.floor(Math.random() * notes.length)];
    if (weights.stardust >= 0.4) {
      this.harpWith(nodes, pick, t, 1.2, 0.017 * weights.stardust);
    } else if (weights.muffin_rain >= 0.4) {
      this.bellWith(nodes, pick - 12, t, 0.85, 0.015 * weights.muffin_rain);
    } else {
      this.bellWith(nodes, pick, t, 1.8, 0.015 * Math.max(weights.aurora, weights.snowy));
    }
  }

  // Custom User Music
  public addCustomTrack(file: File) {
    const url = URL.createObjectURL(file);
    const name = file.name.replace(/\.[^.]+$/, '');
    this.customTracks.push({ name, url, file });
    this.customIndex = this.customTracks.length - 1;
    this.setTrack(16);
  }

  public playCustomTrack() {
    const trk = this.customTracks[this.customIndex];
    if (!trk) return;
    this.stopCustomTrack();
    this.trackController.fadeOutActive(this.ctx, 0.22);
    this.isCustomPlaying = true;
    this.customAudio.src = trk.url;
    this.customAudio.play().catch(() => {});
  }

  public stopCustomTrack() {
    this.isCustomPlaying = false;
    this.customAudio.pause();
    if (this.customSource) {
      try {
        this.customSource.stop();
      } catch (_e) {}
      this.customSource = null;
    }
  }

  public nextCustomTrack() {
    if (this.customTracks.length === 0) return;
    this.customIndex = (this.customIndex + 1) % this.customTracks.length;
    this.playCustomTrack();
  }
}

export const audio = AudioManager.getInstance();
