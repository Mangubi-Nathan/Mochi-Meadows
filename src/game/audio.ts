/**
 * Mochi Meadows 2: Studio Polyphonic Synthesizer, Adaptive Soundtrack & WAV Exporter
 * Generates lush multi-layered acoustic & celestial compositions with convolution reverb,
 * stereo ping-pong delay, mastering compression, expressive SFX, and offline WAV export.
 */

import { MUSIC_TRACKS } from './constants';

interface SynthNodes {
  ctx: BaseAudioContext;
  fxGain: GainNode;
  dryBus: GainNode;
  noiseBuffer: AudioBuffer;
}

class AudioManager {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private fxGain: GainNode | null = null;
  private dryBus: GainNode | null = null;
  private delayGain: GainNode | null = null;
  private reverbGain: GainNode | null = null;
  private delayL: DelayNode | null = null;
  private delayR: DelayNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;

  private currentTrack: number = 0;
  private activeBiome: number = 3;
  private volume: number = 0.8;
  private schedTimer: number | null = null;
  private nextNoteTime: number = 0;
  private step: number = 0;
  private prevProgram: number = -1;

  // Custom User Audio
  public customTracks: { name: string; url: string; file: File }[] = [];
  public customIndex: number = 0;
  private customAudio: HTMLAudioElement = new Audio();
  private customSource: AudioBufferSourceNode | null = null;
  public isCustomPlaying: boolean = false;

  private chordTypes: Record<string, number[]> = {
    M: [0, 4, 7, 12],
    M7: [0, 4, 7, 11, 14],
    M9: [0, 4, 7, 11, 14],
    add9: [0, 4, 7, 14],
    m7: [0, 3, 7, 10, 14],
    m9: [0, 3, 7, 10, 14],
    m11: [0, 3, 7, 10, 17],
    D: [0, 4, 7, 10],
    S: [0, 2, 7, 12],
    sus4: [0, 5, 7, 12],
  };

  // Maps all 21 biomes (constants.ts BIOME_NAMES 0..20) to tracks 1..14
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
    for (let k = 0; k < 2; k++) {
      const ch = impulse.getChannelData(k);
      let lp = 0;
      for (let i = 0; i < len; i++) {
        const decay = Math.pow(1 - i / len, 2.35);
        // Slightly darkened studio concert-hall tail
        const white = Math.random() * 2 - 1;
        lp = lp * 0.55 + white * 0.45;
        ch[i] = lp * decay;
      }
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

  private buildAudioChain(ctx: BaseAudioContext, destination: AudioNode, masterVolume: number) {
    const masterGain = ctx.createGain();
    masterGain.gain.value = masterVolume;

    // Gentle Studio Mastering Compressor & Warmth Tilt
    const compressor = ctx.createDynamicsCompressor();
    compressor.threshold.value = -16;
    compressor.knee.value = 18;
    compressor.ratio.value = 3.2;
    compressor.attack.value = 0.008;
    compressor.release.value = 0.22;

    const warmthFilter = ctx.createBiquadFilter();
    warmthFilter.type = 'lowshelf';
    warmthFilter.frequency.value = 210;
    warmthFilter.gain.value = 2.2;

    const airFilter = ctx.createBiquadFilter();
    airFilter.type = 'highshelf';
    airFilter.frequency.value = 6200;
    airFilter.gain.value = 1.6;

    warmthFilter.connect(airFilter);
    airFilter.connect(compressor);
    compressor.connect(masterGain);
    masterGain.connect(destination);

    const dryBus = ctx.createGain();
    dryBus.gain.value = 0.95;
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

    // Lush Stereo Hall Convolution Reverb
    const convolver = ctx.createConvolver();
    convolver.buffer = this.createImpulseBuffer(ctx, 2.9);
    const reverbGain = ctx.createGain();
    reverbGain.gain.value = 0.42;
    fxGain.connect(convolver);
    convolver.connect(reverbGain);
    reverbGain.connect(warmthFilter);

    const noiseBuffer = this.createNoiseBuffer(ctx);

    return {
      masterGain,
      fxGain,
      dryBus,
      delayGain,
      reverbGain,
      delayL,
      delayR,
      noiseBuffer,
    };
  }

  public init() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
      return;
    }

    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.ctx = new AudioContextClass();

    const chain = this.buildAudioChain(this.ctx, this.ctx.destination, this.volume);
    this.masterGain = chain.masterGain;
    this.fxGain = chain.fxGain;
    this.dryBus = chain.dryBus;
    this.delayGain = chain.delayGain;
    this.reverbGain = chain.reverbGain;
    this.delayL = chain.delayL;
    this.delayR = chain.delayR;
    this.noiseBuffer = chain.noiseBuffer;

    this.nextNoteTime = this.ctx.currentTime + 0.08;
    this.schedTimer = window.setInterval(() => this.scheduleNotes(), 80);
  }

  public setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);
    }
    this.customAudio.volume = this.volume * 0.85;
  }

  public getVolume(): number {
    return this.volume;
  }

  public setTrack(trk: number) {
    this.init();
    this.currentTrack = trk;
    this.step = 0;
    this.prevProgram = -1;

    if (trk === 16) {
      this.playCustomTrack();
    } else {
      this.stopCustomTrack();
    }
  }

  public getTrack(): number {
    return this.currentTrack;
  }

  public setBiome(b: number) {
    this.activeBiome = b;
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
    };
  }

  // ==================== STUDIO INSTRUMENTS ====================

  private toneWith(
    nodes: SynthNodes,
    type: OscillatorType,
    f: number,
    t: number,
    d: number,
    v: number,
    a: number = 0.012,
    useDry: boolean = false
  ) {
    const o = nodes.ctx.createOscillator();
    const g = nodes.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f, t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(v, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(a + 0.02, d));
    o.connect(g);
    g.connect(useDry ? nodes.dryBus : nodes.fxGain);
    o.start(t);
    o.stop(t + d + 0.06);
  }

  private feltPianoWith(nodes: SynthNodes, m: number, t: number, d: number, v: number) {
    const f = this.midiToFreq(m);
    const lp = nodes.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(Math.min(5200, f * 7.5), t);
    lp.frequency.exponentialRampToValueAtTime(Math.max(420, f * 2.1), t + Math.min(d, 0.9));

    const g = nodes.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(v, t + 0.009);
    g.gain.exponentialRampToValueAtTime(v * 0.35, t + d * 0.38);
    g.gain.exponentialRampToValueAtTime(0.0001, t + d);

    lp.connect(g);
    g.connect(nodes.fxGain);

    // Warm dual-detuned fundamental + soft octave shimmer
    [-2.5, 2.5].forEach((dt) => {
      const o = nodes.ctx.createOscillator();
      o.type = 'triangle';
      o.frequency.setValueAtTime(f, t);
      o.detune.setValueAtTime(dt, t);
      o.connect(lp);
      o.start(t);
      o.stop(t + d + 0.05);
    });

    const overtone = nodes.ctx.createOscillator();
    const og = nodes.ctx.createGain();
    overtone.type = 'sine';
    overtone.frequency.setValueAtTime(f * 2, t);
    og.gain.setValueAtTime(v * 0.22, t);
    og.gain.exponentialRampToValueAtTime(0.0001, t + d * 0.45);
    overtone.connect(og);
    og.connect(nodes.fxGain);
    overtone.start(t);
    overtone.stop(t + d * 0.5 + 0.03);
  }

  private electricPianoWith(nodes: SynthNodes, m: number, t: number, d: number, v: number) {
    const f = this.midiToFreq(m);
    const o = nodes.ctx.createOscillator();
    const md = nodes.ctx.createOscillator();
    const ig = nodes.ctx.createGain();
    const g = nodes.ctx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(f, t);
    md.frequency.setValueAtTime(f * 2, t);
    ig.gain.setValueAtTime(f * 0.95, t);
    ig.gain.exponentialRampToValueAtTime(f * 0.03, t + d * 0.5);
    md.connect(ig);
    ig.connect(o.frequency);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(v, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(g);
    g.connect(nodes.fxGain);
    o.start(t);
    md.start(t);
    o.stop(t + d + 0.05);
    md.stop(t + d + 0.05);
    // Warm tine body underneath
    this.toneWith(nodes, 'triangle', f, t, d * 0.7, v * 0.25, 0.012);
  }

  private bellWith(nodes: SynthNodes, m: number, t: number, d: number, v: number) {
    const f = this.midiToFreq(m);
    this.toneWith(nodes, 'sine', f, t, d, v, 0.005);
    this.toneWith(nodes, 'sine', f * 2, t, d * 0.65, v * 0.34, 0.004);
    this.toneWith(nodes, 'sine', f * 3, t, d * 0.28, v * 0.14, 0.003);
  }

  private harpWith(nodes: SynthNodes, m: number, t: number, d: number, v: number) {
    const f = this.midiToFreq(m);
    const lp = nodes.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(4200, t);
    lp.frequency.exponentialRampToValueAtTime(850, t + d * 0.7);
    const g = nodes.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(v, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    lp.connect(g);
    g.connect(nodes.fxGain);

    const o = nodes.ctx.createOscillator();
    o.type = 'triangle';
    o.frequency.setValueAtTime(f, t);
    o.connect(lp);
    o.start(t);
    o.stop(t + d + 0.05);

    this.toneWith(nodes, 'sine', f * 2, t, d * 0.45, v * 0.28, 0.004);
  }

  private guitarPluckWith(nodes: SynthNodes, m: number, t: number, d: number, v: number) {
    const f = this.midiToFreq(m);
    const o = nodes.ctx.createOscillator();
    const g = nodes.ctx.createGain();
    const lp = nodes.ctx.createBiquadFilter();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(f, t);
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(2600, t);
    lp.frequency.exponentialRampToValueAtTime(420, t + Math.min(d, 0.7));
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(v, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(lp);
    lp.connect(g);
    g.connect(nodes.fxGain);
    o.start(t);
    o.stop(t + d + 0.05);
    this.toneWith(nodes, 'triangle', f, t, d * 0.9, v * 0.45, 0.006);
  }

  private fluteWith(nodes: SynthNodes, m: number, t: number, d: number, v: number) {
    const f = this.midiToFreq(m);
    const o = nodes.ctx.createOscillator();
    const lfo = nodes.ctx.createOscillator();
    const lg = nodes.ctx.createGain();
    const g = nodes.ctx.createGain();

    o.type = 'sine';
    o.frequency.setValueAtTime(f * 0.985, t);
    o.frequency.linearRampToValueAtTime(f, t + 0.045);

    lfo.frequency.setValueAtTime(5.1, t);
    lg.gain.setValueAtTime(0, t);
    lg.gain.linearRampToValueAtTime(f * 0.011, t + Math.min(0.25, d * 0.45));
    lfo.connect(lg);
    lg.connect(o.frequency);

    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(v, t + 0.065);
    g.gain.setValueAtTime(v * 0.9, t + Math.max(0.07, d * 0.7));
    g.gain.exponentialRampToValueAtTime(0.0001, t + d);

    o.connect(g);
    g.connect(nodes.fxGain);
    o.start(t);
    lfo.start(t);
    o.stop(t + d + 0.06);
    lfo.stop(t + d + 0.06);

    // Subtle airy overtone
    this.toneWith(nodes, 'triangle', f * 2, t, d * 0.8, v * 0.14, 0.07);
  }

  private stringsPadWith(nodes: SynthNodes, ms: number[], t: number, d: number, v: number) {
    ms.forEach((m) => {
      const f = this.midiToFreq(m);
      const lp = nodes.ctx.createBiquadFilter();
      const g = nodes.ctx.createGain();
      lp.type = 'lowpass';
      lp.frequency.setValueAtTime(550, t);
      lp.frequency.linearRampToValueAtTime(1150, t + d * 0.45);
      lp.frequency.linearRampToValueAtTime(620, t + d);

      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(v, t + Math.min(0.45, d * 0.35));
      g.gain.setValueAtTime(v * 0.88, t + Math.max(0.46, d * 0.72));
      g.gain.linearRampToValueAtTime(0.0001, t + d);

      lp.connect(g);
      g.connect(nodes.fxGain);

      [-9, 0, 9].forEach((dt) => {
        const o = nodes.ctx.createOscillator();
        o.type = dt === 0 ? 'triangle' : 'sawtooth';
        o.frequency.setValueAtTime(f, t);
        o.detune.setValueAtTime(dt, t);
        o.connect(lp);
        o.start(t);
        o.stop(t + d + 0.06);
      });
    });
  }

  private bassWith(nodes: SynthNodes, m: number, t: number, d: number, v: number) {
    const f = this.midiToFreq(m);
    const lp = nodes.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(480, t);
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
    ty: BiquadFilterType
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
    g.connect(nodes.dryBus);
    s.start(t);
    s.stop(t + d + 0.02);
  }

  private kickWith(nodes: SynthNodes, t: number, v: number = 0.16) {
    const o = nodes.ctx.createOscillator();
    const g = nodes.ctx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(112, t);
    o.frequency.exponentialRampToValueAtTime(44, t + 0.12);
    g.gain.setValueAtTime(v, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.24);
    o.connect(g);
    g.connect(nodes.dryBus);
    o.start(t);
    o.stop(t + 0.26);
  }

  private snareWith(nodes: SynthNodes, t: number, v: number = 0.045) {
    this.drumNoiseWith(nodes, t, v, 1900, 0.85, 0.13, 'bandpass');
    this.toneWith(nodes, 'triangle', 175, t, 0.08, v * 0.4, 0.003, true);
  }

  private shakerWith(nodes: SynthNodes, t: number, v: number = 0.015) {
    this.drumNoiseWith(nodes, t, v, 6800, 0.8, 0.045, 'highpass');
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

  // ==================== 14 RICH COMPOSED MUSICAL THEMES ====================

  private getSongProgram(trackId: number) {
    type SongProg = {
      bpm: number;
      len: number;
      sw: number;
      f: number;
      rv: number;
      pr: [number, string][];
      p: (nodes: SynthNodes, b: number, s: number, t: number, c: number[], sd: number) => void;
    };

    const songs: Record<number, SongProg> = {
      // 1: Music Box Waltz (3/4, delicate celesta + harp + warm strings)
      1: {
        bpm: 84,
        len: 12,
        sw: 0,
        f: 0.28,
        rv: 0.48,
        pr: [
          [53, 'M9'],
          [48, 'M'],
          [50, 'm7'],
          [46, 'M7'],
          [53, 'M'],
          [45, 'm7'],
          [46, 'M9'],
          [48, 'S'],
        ],
        p: (nodes, b, s, t, c, sd) => {
          if (s === 0) {
            this.bassWith(nodes, c[0] - 12, t, sd * 10, 0.12);
            this.stringsPadWith(nodes, c.slice(0, 3).map((x) => x + 12), t, sd * 12.2, 0.016);
          }
          if (s === 0 || s === 4 || s === 8) {
            const idx = s === 0 ? 0 : s === 4 ? 1 : 2;
            this.harpWith(nodes, c[idx] + 12, t, sd * 5.5, 0.055);
          }
          const melodies: number[][] = [
            [77, 81, 84, 86, 84, 81],
            [79, 84, 83, 79, 76, 79],
            [74, 77, 81, 84, 81, 77],
            [74, 77, 81, 79, 77, 74],
            [77, 81, 84, 89, 86, 84],
            [76, 79, 81, 84, 81, 79],
            [74, 77, 81, 86, 84, 81],
            [79, 81, 84, 79, 76, 72],
          ];
          if (s % 2 === 0) {
            const note = melodies[b % 8][s / 2];
            this.bellWith(nodes, note, t, 1.7, 0.078);
            if (b % 4 === 3 && s === 8) this.bellWith(nodes, note + 12, t + 0.05, 1.6, 0.036);
          }
        },
      },

      // 2: Lo-Fi Chill (Whisper Woods cozy Rhodes + brushed vinyl swing)
      2: {
        bpm: 78,
        len: 16,
        sw: 0.32,
        f: 0.24,
        rv: 0.36,
        pr: [
          [50, 'm9'],
          [43, 'D'],
          [48, 'M9'],
          [45, 'm7'],
        ],
        p: (nodes, b, s, t, c, sd) => {
          if (s === 0) {
            this.stringsPadWith(nodes, c.slice(1, 4).map((x) => x + 12), t, sd * 15.5, 0.012);
          }
          if ([0, 6, 10].includes(s)) {
            c.slice(0, 4).forEach((m, i) =>
              this.electricPianoWith(nodes, m + 12, t + i * 0.016, sd * (s === 6 ? 3.4 : 5.2), 0.048)
            );
          }
          if ([0, 7, 10, 14].includes(s)) {
            this.bassWith(nodes, c[0] - 12 + (s === 14 ? 5 : 0), t, sd * 3.2, 0.14);
          }
          if (s === 0 || s === 10) this.kickWith(nodes, t, 0.16);
          if (s === 4 || s === 12) this.snareWith(nodes, t, 0.05);
          if (s % 2 === 0) this.shakerWith(nodes, t, s % 4 === 0 ? 0.015 : 0.009);

          const lead: [number, number, number][][] = [
            [[2, 74, 3], [6, 76, 3], [10, 72, 4]],
            [[0, 71, 4], [6, 69, 3], [10, 72, 5]],
            [[2, 76, 4], [8, 79, 4], [12, 76, 3]],
            [[0, 74, 4], [6, 72, 4], [12, 69, 4]],
          ];
          lead[b % 4].forEach(([stepIdx, midi, dur]) => {
            if (s === stepIdx) this.feltPianoWith(nodes, midi, t, sd * dur, 0.068);
          });
        },
      },

      // 3: Sunny Strum (Upbeat coastal meadow acoustic guitar + whistling flute)
      3: {
        bpm: 114,
        len: 16,
        sw: 0.08,
        f: 0.2,
        rv: 0.28,
        pr: [
          [48, 'add9'],
          [43, 'M'],
          [45, 'm7'],
          [41, 'M9'],
        ],
        p: (nodes, b, s, t, c, sd) => {
          if ([0, 3, 6, 8, 11, 14].includes(s)) {
            c.slice(0, 4).forEach((m, i) =>
              this.guitarPluckWith(nodes, m + 12, t + i * 0.015, sd * 3.4, 0.036)
            );
          }
          if ([0, 6, 8, 14].includes(s)) {
            this.bassWith(nodes, c[0] - 12 + (s === 8 ? 7 : 0), t, sd * 2.6, 0.15);
          }
          if (s === 0 || s === 8) this.kickWith(nodes, t, 0.12);
          if (s === 4 || s === 12) this.snareWith(nodes, t, 0.036);
          if (s % 2 === 0) this.shakerWith(nodes, t, s % 4 === 2 ? 0.017 : 0.008);

          const fluteLines: [number, number, number][][] = [
            [[0, 76, 2.6], [2, 79, 2], [4, 81, 3.2], [8, 79, 4.5], [14, 76, 2]],
            [[0, 74, 2.5], [2, 79, 2], [4, 83, 3.2], [8, 81, 4.5], [14, 79, 2]],
            [[0, 76, 2.4], [2, 72, 2], [4, 76, 2.6], [6, 79, 2.2], [8, 81, 5.2]],
            [[0, 77, 2.6], [2, 81, 2], [4, 84, 3.5], [8, 79, 2.5], [10, 77, 2.5], [12, 72, 3.8]],
          ];
          fluteLines[b % 4].forEach(([stepIdx, midi, dur]) => {
            if (s === stepIdx) this.fluteWith(nodes, midi, t, sd * dur, 0.08);
          });
        },
      },

      // 4: Dreamy Echoes (Clouds & peaks sweeping harp + celestial pad + flute)
      4: {
        bpm: 64,
        len: 16,
        sw: 0,
        f: 0.45,
        rv: 0.62,
        pr: [
          [41, 'M9'],
          [38, 'm9'],
          [46, 'M7'],
          [43, 'S'],
        ],
        p: (nodes, b, s, t, c, sd) => {
          if (s === 0) {
            this.stringsPadWith(nodes, c.slice(0, 4).map((x) => x + 12), t, sd * 16.5, 0.02);
            this.bassWith(nodes, c[0] - 12, t, sd * 14, 0.11);
          }
          if (s % 2 === 0) {
            const idx = (s / 2) % 4;
            this.harpWith(nodes, c[idx] + 24, t, 2.4, 0.045);
          }
          const lines: [number, number, number][][] = [
            [[2, 81, 5], [10, 84, 5]],
            [[2, 79, 4], [10, 77, 6]],
            [[4, 74, 5], [10, 77, 5]],
            [[0, 79, 8], [10, 81, 5]],
          ];
          lines[b % 4].forEach(([stepIdx, midi, dur]) => {
            if (s === stepIdx) this.fluteWith(nodes, midi, t, dur * sd, 0.068);
          });
        },
      },

      // 5: Night Bells (Starlit lantern glass bells + soft felt piano)
      5: {
        bpm: 68,
        len: 16,
        sw: 0,
        f: 0.38,
        rv: 0.56,
        pr: [
          [45, 'm9'],
          [41, 'M7'],
          [38, 'm7'],
          [40, 'D'],
        ],
        p: (nodes, b, s, t, c, sd) => {
          if (s === 0) {
            this.stringsPadWith(nodes, c.slice(0, 3).map((x) => x + 12), t, sd * 16.5, 0.015);
            this.bassWith(nodes, c[0] - 12, t, sd * 11, 0.11);
          }
          if (s % 2 === 0) {
            const pat = [0, 1, 2, 3, 2, 1, 3, 2][(s / 2) % 8];
            this.bellWith(nodes, c[pat] + 24 + (b % 4 === 3 && s > 10 ? 12 : 0), t, 1.5, 0.045);
          }
          if (s === 0 || s === 8) this.feltPianoWith(nodes, c[s === 0 ? 1 : 2] + 24, t, sd * 5, 0.055);
          if (s === 0 && b % 2 === 1) {
            [96, 93, 91, 88].forEach((m, i) => this.bellWith(nodes, m, t + i * 0.11, 0.7, 0.025));
          }
        },
      },

      // 6: Honeyhum (Golden Honeycomb Hills warm marimba + sunny felt piano + flute)
      6: {
        bpm: 96,
        len: 16,
        sw: 0.16,
        f: 0.25,
        rv: 0.34,
        pr: [
          [53, 'add9'],
          [50, 'm7'],
          [46, 'M9'],
          [48, 'S'],
        ],
        p: (nodes, b, s, t, c, sd) => {
          if (s === 0) this.stringsPadWith(nodes, c.slice(0, 3).map((x) => x + 12), t, sd * 15.5, 0.013);
          if (s % 2 === 0) {
            const idx = [0, 1, 2, 1, 3, 2, 1, 2][(s / 2) % 8];
            this.feltPianoWith(nodes, c[idx] + 12, t, sd * 2.2, 0.046);
          }
          if (s === 0 || s === 6 || s === 8) this.bassWith(nodes, c[0] - 12, t, sd * 2.8, 0.13);
          if (s === 0 || s === 8) this.kickWith(nodes, t, 0.1);
          if (s % 4 === 2) this.shakerWith(nodes, t, 0.012);
          if (b % 2 === 0 && (s === 0 || s === 6 || s === 10)) {
            const notes = [81, 84, 86][s === 0 ? 0 : s === 6 ? 1 : 2];
            this.fluteWith(nodes, notes, t, sd * 4.2, 0.068);
          } else if (b % 2 === 1 && (s === 2 || s === 8)) {
            this.fluteWith(nodes, s === 2 ? 84 : 79, t, sd * 4.5, 0.065);
          }
        },
      },

      // 7: Tide Waltz (3/4 Underwater Pearl Reef shimmering harp + underwater glass pad)
      7: {
        bpm: 82,
        len: 12,
        sw: 0,
        f: 0.42,
        rv: 0.65,
        pr: [
          [45, 'm9'],
          [41, 'M9'],
          [48, 'M7'],
          [43, 'S'],
        ],
        p: (nodes, b, s, t, c, sd) => {
          if (s === 0) {
            this.stringsPadWith(nodes, c.slice(0, 4).map((x) => x + 12), t, sd * 12.6, 0.019);
            this.bassWith(nodes, c[0] - 12, t, sd * 10, 0.11);
          }
          if (s % 2 === 0) {
            const harpNote = c[[0, 1, 2, 3, 2, 1][s / 2]] + 12;
            this.harpWith(nodes, harpNote, t, 1.9, 0.05);
          }
          if (s === 0 || s === 6) {
            const fluteMel = [
              [84, 83],
              [81, 79],
              [84, 88],
              [86, 84],
            ][b % 4];
            this.fluteWith(nodes, fluteMel[s === 0 ? 0 : 1], t, sd * 5.2, 0.065);
          }
          if (s === 10) this.bellWith(nodes, c[2] + 24, t, 1.5, 0.032);
        },
      },

      // 8: Cinder Lounge (Warm Hot Springs bossa/jazz piano + mellow bass + brush snare)
      8: {
        bpm: 88,
        len: 16,
        sw: 0.2,
        f: 0.28,
        rv: 0.36,
        pr: [
          [48, 'M9'],
          [45, 'm9'],
          [41, 'M7'],
          [43, 'D'],
        ],
        p: (nodes, b, s, t, c, sd) => {
          if ([0, 3, 6, 10, 12].includes(s)) {
            c.slice(0, 4).forEach((m, i) =>
              this.electricPianoWith(nodes, m + 12, t + i * 0.015, sd * 3.5, 0.044)
            );
          }
          if ([0, 6, 8, 14].includes(s)) this.bassWith(nodes, c[0] - 12, t, sd * 2.8, 0.14);
          if (s === 0 || s === 10) this.kickWith(nodes, t, 0.13);
          if (s === 4 || s === 12) this.snareWith(nodes, t, 0.038);
          if (s % 2 === 0) this.shakerWith(nodes, t, 0.012);
          if ((b % 2 === 0 && (s === 2 || s === 8)) || (b % 2 === 1 && (s === 4 || s === 10))) {
            const note = [79, 83, 81, 76][(b + s) % 4];
            this.feltPianoWith(nodes, note, t, sd * 4.5, 0.062);
          }
        },
      },

      // 9: Fen Whispers (Mirror Fens reflective emerald piano + kalimba + soft shaker)
      9: {
        bpm: 74,
        len: 16,
        sw: 0.1,
        f: 0.36,
        rv: 0.52,
        pr: [
          [43, 'm9'],
          [48, 'M7'],
          [46, 'add9'],
          [41, 'm7'],
        ],
        p: (nodes, b, s, t, c, sd) => {
          if (s === 0) {
            this.stringsPadWith(nodes, c.slice(0, 3).map((x) => x + 12), t, sd * 16, 0.015);
            this.bassWith(nodes, c[0] - 12, t, sd * 11, 0.11);
          }
          if (s === 0 || s === 4 || s === 8 || s === 12) {
            this.feltPianoWith(nodes, c[s / 4] + 12, t, sd * 4.8, 0.056);
          }
          if (s === 2 || s === 10) {
            this.harpWith(nodes, c[2] + 24, t, 1.8, 0.044);
          }
          if (b % 2 === 0 && s === 6) this.fluteWith(nodes, c[1] + 24, t, sd * 6, 0.06);
          if (s === 14) this.bellWith(nodes, c[3] + 24, t, 1.6, 0.036);
        },
      },

      // 10: Aurora (Aurora Reach crystalline ice bells + shimmering ambient strings)
      10: {
        bpm: 66,
        len: 16,
        sw: 0,
        f: 0.45,
        rv: 0.68,
        pr: [
          [49, 'm11'],
          [44, 'm9'],
          [47, 'M9'],
          [42, 'S'],
        ],
        p: (nodes, b, s, t, c, sd) => {
          if (s === 0) {
            this.stringsPadWith(nodes, c.slice(0, 4).map((x) => x + 12), t, sd * 16.8, 0.02);
            this.bassWith(nodes, c[0] - 12, t, sd * 14, 0.1);
          }
          if (s % 2 === 0) {
            const idx = (s / 2) % c.length;
            this.bellWith(nodes, c[idx] + 24, t, 2.2, 0.045);
          }
          if (s === 4 || s === 12) {
            this.harpWith(nodes, c[(b + s) % 3] + 36, t, 2.1, 0.032);
          }
        },
      },

      // 11: Chimewood (Bellwood woodland wind-chime carillon + pastoral guitar)
      11: {
        bpm: 92,
        len: 16,
        sw: 0,
        f: 0.3,
        rv: 0.44,
        pr: [
          [55, 'M9'],
          [50, 'M'],
          [52, 'm7'],
          [48, 'M9'],
        ],
        p: (nodes, b, s, t, c, sd) => {
          if (s % 4 === 0) this.guitarPluckWith(nodes, c[s / 4] + 12, t, sd * 4.5, 0.04);
          if (s === 0 || s === 8) this.bassWith(nodes, c[0] - 12, t, sd * 5, 0.12);
          if (s === 0 || s === 6 || s === 10 || s === 14) {
            this.bellWith(nodes, c[(b + s) % 4] + 24, t, 1.5, 0.055);
          }
          if (b % 2 === 1 && s === 4) this.fluteWith(nodes, c[2] + 24, t, sd * 7, 0.065);
        },
      },

      // 12: Glowdeep Caverns (Bioluminescent cavern marimba + echoing glass drops)
      12: {
        bpm: 72,
        len: 16,
        sw: 0,
        f: 0.48,
        rv: 0.64,
        pr: [
          [45, 'm11'],
          [43, 'S'],
          [41, 'M9'],
          [40, 'm7'],
        ],
        p: (nodes, b, s, t, c, sd) => {
          if (s === 0) {
            this.stringsPadWith(nodes, c.slice(0, 3).map((x) => x + 12), t, sd * 16.2, 0.016);
            this.bassWith(nodes, c[0] - 12, t, sd * 12, 0.12);
          }
          if ([0, 3, 6, 10, 13].includes(s)) {
            this.feltPianoWith(nodes, c[(s + b) % 4] + 12, t, sd * 3.5, 0.048);
          }
          if (s === 4 || s === 12) this.bellWith(nodes, c[2] + 36, t, 2.0, 0.038);
        },
      },

      // 13: The Moon Road (Dreamwalk gossamer starlight piano + duet bells + bass)
      13: {
        bpm: 70,
        len: 16,
        sw: 0,
        f: 0.44,
        rv: 0.62,
        pr: [
          [49, 'M9'],
          [46, 'm9'],
          [44, 'm7'],
          [47, 'S'],
        ],
        p: (nodes, b, s, t, c, sd) => {
          if (s === 0) {
            this.stringsPadWith(nodes, c.slice(0, 4).map((x) => x + 12), t, sd * 16.5, 0.018);
            this.bassWith(nodes, c[0] - 12, t, sd * 13, 0.11);
          }
          if (s % 2 === 0) {
            this.feltPianoWith(nodes, c[(s / 2) % 4] + 12, t, sd * 3.8, 0.052);
          }
          if (s === 0 || s === 8) {
            this.bellWith(nodes, c[b % 2 === 0 ? 3 : 2] + 24, t, 2.1, 0.048);
          }
        },
      },

      // 14: The Dawn Duet (Uplifting Grand Finale: Full Orchestra Flute + Felt Piano + Harp + Strings)
      14: {
        bpm: 96,
        len: 16,
        sw: 0,
        f: 0.34,
        rv: 0.52,
        pr: [
          [48, 'M9'],
          [43, 'S'],
          [45, 'm9'],
          [41, 'M9'],
          [48, 'M9'],
          [43, 'M'],
          [41, 'M7'],
          [43, 'S'],
        ],
        p: (nodes, b, s, t, c, sd) => {
          if (s === 0) {
            this.stringsPadWith(nodes, c.slice(0, 4).map((x) => x + 12), t, sd * 16.2, 0.021);
            this.bassWith(nodes, c[0] - 12, t, sd * 10, 0.15);
          }
          if (s % 2 === 0) {
            this.harpWith(nodes, c[(s / 2) % 4] + 12, t, sd * 3.8, 0.048);
          }
          if (s === 0 || s === 8) this.kickWith(nodes, t, 0.1);
          if (s === 4 || s === 12) this.shakerWith(nodes, t, 0.012);

          const duetLead: [number, number, number][][] = [
            [[0, 76, 4], [4, 79, 4], [8, 84, 7]],
            [[0, 83, 4], [4, 81, 4], [8, 79, 7]],
            [[0, 76, 3], [4, 81, 4], [8, 84, 7]],
            [[0, 81, 4], [4, 79, 4], [8, 77, 6]],
            [[0, 79, 3], [4, 84, 4], [8, 88, 7]],
            [[0, 86, 4], [4, 83, 4], [8, 79, 7]],
            [[0, 81, 4], [4, 84, 4], [8, 86, 6]],
            [[0, 84, 14]],
          ];
          duetLead[b % 8].forEach(([stepIdx, midi, dur]) => {
            if (s === stepIdx) {
              this.fluteWith(nodes, midi, t, sd * dur, 0.075);
              this.feltPianoWith(nodes, midi, t, sd * dur, 0.055);
              if (s === 0) this.bellWith(nodes, midi + 12, t, 1.8, 0.036);
            }
          });
        },
      },
    };

    const resolveProgram = trackId === 0 ? this.biomeTracks[this.activeBiome] || 3 : trackId;
    return { programId: resolveProgram, song: songs[resolveProgram] || songs[3] };
  }

  private scheduleNotes() {
    if (!this.ctx) return;
    while (this.nextNoteTime < this.ctx.currentTime + 0.38) {
      // Track 15 = Mute Music, Track 16 = Custom Audio
      if (this.currentTrack >= 15) {
        this.nextNoteTime += 0.2;
        continue;
      }

      const nodes = this.getLiveNodes();
      if (!nodes) break;

      const { programId, song: g } = this.getSongProgram(this.currentTrack);
      if (this.prevProgram < 0 || (programId !== this.prevProgram && this.step % g.len === 0)) {
        this.prevProgram = programId;
        this.step = 0;
        if (this.delayGain) this.delayGain.gain.setTargetAtTime(g.f, this.ctx.currentTime, 0.25);
        if (this.reverbGain) this.reverbGain.gain.setTargetAtTime(g.rv, this.ctx.currentTime, 0.25);
        if (this.delayL) this.delayL.delayTime.setTargetAtTime((60 / g.bpm) * 0.75, this.ctx.currentTime, 0.15);
        if (this.delayR) this.delayR.delayTime.setTargetAtTime((60 / g.bpm) * 1.125, this.ctx.currentTime, 0.15);
      }

      const sd = 60 / g.bpm / 4;
      const s = this.step % g.len;
      const b = (this.step / g.len) | 0;
      const pr = g.pr[b % g.pr.length];
      const chord = (this.chordTypes[pr[1]] || this.chordTypes.M).map((x: number) => pr[0] + x);

      g.p(nodes, b, s, this.nextNoteTime + (s % 2 ? sd * g.sw : 0), chord, sd);
      this.nextNoteTime += sd;
      this.step++;
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

    const barsToRender = 8; // Full rich 2-cycle suite (~28-42s)
    const sd = 60 / g.bpm / 4;
    const totalSteps = barsToRender * g.len;
    const tailSeconds = 2.8;
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
            this.guitarPluckWith(nodes, midi, t, 0.75, 0.11);
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
        this.feltPianoWith(nodes, midi, now, 0.45, 0.095);
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

export const audio = new AudioManager();
