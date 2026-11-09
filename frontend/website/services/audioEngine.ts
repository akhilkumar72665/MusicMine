import { Track } from '../../../shared/types/music';

export type EqPresetId =
  | 'flat'
  | 'ultra_bass'
  | 'bass_boost'
  | 'punjabi_beats'
  | 'bollywood_vocal'
  | 'electronic'
  | 'acoustic'
  | 'night_mode'
  | 'custom';

export type AudioVibeMode =
  | 'studio'
  | 'bass_club'
  | 'slowed_reverb'
  | 'nightcore'
  | 'lofi_chill'
  | 'karaoke_sing'
  | 'vocal_clarity';

export const VIBE_MODES: Record<
  AudioVibeMode,
  { label: string; subtitle: string; speed: number }
> = {
  studio: {
    label: 'Studio Master',
    subtitle: 'Original 1.0x reference speed',
    speed: 1.0,
  },
  bass_club: {
    label: 'X-Bass Club',
    subtitle: '55Hz Sub-Woofer + Compressor punch',
    speed: 1.0,
  },
  slowed_reverb: {
    label: 'Slowed + Reverb',
    subtitle: '0.86x deep pitch-shifted dreamy vibe',
    speed: 0.86,
  },
  nightcore: {
    label: 'Nightcore Rush',
    subtitle: '1.18x high-energy pitch & tempo',
    speed: 1.18,
  },
  lofi_chill: {
    label: 'Lo-Fi Midnight',
    subtitle: 'Warm analog filter & soft bass',
    speed: 0.96,
  },
  karaoke_sing: {
    label: 'Karaoke Sing-Along',
    subtitle: 'Softens lead vocals for singing',
    speed: 1.0,
  },
  vocal_clarity: {
    label: 'Vocal Spotlight',
    subtitle: 'Crystal clear singer presence',
    speed: 1.0,
  },
};

export interface EqBand {
  frequency: number;
  label: string;
  subLabel: string;
  gainDb: number;
}

export const EQ_PRESETS: Record<
  Exclude<EqPresetId, 'custom'>,
  { name: string; gains: [number, number, number, number, number]; bassBoostDb: number }
> = {
  flat: { name: 'Flat Studio (0dB)', gains: [0, 0, 0, 0, 0], bassBoostDb: 0 },
  ultra_bass: { name: 'Extreme Sub-Bass', gains: [11, 8, -1, 3, 5], bassBoostDb: 11 },
  bass_boost: { name: 'Bass Boost', gains: [8, 5, 0, 1, 2], bassBoostDb: 7 },
  punjabi_beats: { name: 'Punjabi Beats', gains: [9, 6, -1, 3, 5], bassBoostDb: 8 },
  bollywood_vocal: { name: 'Bollywood Vocal', gains: [2, 1, 4, 5, 3], bassBoostDb: 2 },
  electronic: { name: 'Electronic Club', gains: [7, 4, -2, 4, 6], bassBoostDb: 6 },
  acoustic: { name: 'Acoustic Warm', gains: [2, 3, 2, 4, 4], bassBoostDb: 1 },
  night_mode: { name: 'Late Night', gains: [-2, 1, 2, -1, -3], bassBoostDb: 0 },
};

export interface EngineSnapshot {
  isPlaying: boolean;
  isBuffering: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  muted: boolean;
  playbackRate: number;
  statusMessage: string | null;
  eqEnabled: boolean;
  eqPreset: EqPresetId;
  eqBands: EqBand[];
  bassBoostDb: number;
  megaBassEnabled: boolean;
  vibeMode: AudioVibeMode;
  spatial8dEnabled: boolean;
  loopStartSec: number | null;
  loopEndSec: number | null;
}

type Listener = (snapshot: EngineSnapshot) => void;
type EndedCallback = () => void;

export function buildTrackDownloadUrl(track: Track): string {
  const params = new URLSearchParams();
  params.set('id', track.providerId);
  params.set('title', track.cleanTitle);
  params.set('artist', track.artistName);
  if (track.streamUrl) {
    params.set('streamUrl', track.streamUrl);
  }
  if (track.externalUrl) {
    params.set('q', track.externalUrl);
  }
  return `/api/v1/audio/download?${params.toString()}`;
}

class MusicMineAudioEngine {
  private audio: HTMLAudioElement | null = null;
  private preloader: HTMLAudioElement | null = null;
  private currentTrack: Track | null = null;

  private audioCtx: AudioContext | null = null;
  private mediaSourceConnected = false;
  private eqFilterNodes: BiquadFilterNode[] = [];
  private bassBoostNode: BiquadFilterNode | null = null;
  private subWooferNode: BiquadFilterNode | null = null;
  private compressorNode: DynamicsCompressorNode | null = null;
  private stereoPannerNode: StereoPannerNode | null = null;
  private spatialIntervalId: number | null = null;
  private analyserNode: AnalyserNode | null = null;
  private freqDataArray: Uint8Array<ArrayBuffer> | null = null;
  private smoothedBars: number[] = [];

  private isPlaying = false;
  private isBuffering = false;
  private currentTime = 0;
  private duration = 0;
  private volume = 0.85;
  private muted = false;
  private playbackRate = 1.0;
  private statusMessage: string | null = null;

  private eqEnabled = false;
  private eqPreset: EqPresetId = 'flat';
  private bassBoostDb = 0;
  private megaBassEnabled = false;
  private vibeMode: AudioVibeMode = 'studio';
  private spatial8dEnabled = false;
  private loopStartSec: number | null = null;
  private loopEndSec: number | null = null;
  private eqBands: EqBand[] = [
    { frequency: 60, label: '60Hz', subLabel: 'Sub Bass', gainDb: 0 },
    { frequency: 230, label: '230Hz', subLabel: 'Bass', gainDb: 0 },
    { frequency: 910, label: '910Hz', subLabel: 'Mids', gainDb: 0 },
    { frequency: 3600, label: '3.6kHz', subLabel: 'Presence', gainDb: 0 },
    { frequency: 14000, label: '14kHz', subLabel: 'Treble', gainDb: 0 },
  ];

  private listeners: Set<Listener> = new Set();
  private onEndedCallback: EndedCallback | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.initAudioElement();
    }
  }

  private initAudioElement() {
    if (this.audio) return;
    const el = new Audio();
    // Do NOT set el.crossOrigin = 'anonymous' by default!
    // Native HTML5 <audio> without crossOrigin attribute plays 100% of all audio streams
    // across all origins without any CORS restrictions or browser blocking.
    el.preload = 'auto';
    el.volume = this.volume;
    el.muted = this.muted;
    el.playbackRate = this.playbackRate;
    el.style.display = 'none';
    if (typeof document !== 'undefined' && document.body) {
      try {
        document.body.appendChild(el);
      } catch { }
    }

    el.addEventListener('loadstart', () => {
      this.isBuffering = true;
      this.emit();
    });

    el.addEventListener('loadeddata', () => {
      this.isBuffering = false;
      this.emit();
    });

    el.addEventListener('loadedmetadata', () => {
      if (el.duration && isFinite(el.duration) && el.duration > 0) {
        this.duration = el.duration;
      }
      this.isBuffering = false;
      this.emit();
    });

    el.addEventListener('durationchange', () => {
      if (el.duration && isFinite(el.duration) && el.duration > 0) {
        this.duration = el.duration;
        this.emit();
      }
    });

    el.addEventListener('canplay', () => {
      this.isBuffering = false;
      this.statusMessage = null;
      this.emit();
    });

    el.addEventListener('waiting', () => {
      this.isBuffering = true;
      this.emit();
    });

    el.addEventListener('playing', () => {
      this.isPlaying = true;
      this.isBuffering = false;
      this.statusMessage = null;
      if (this.eqEnabled) {
        this.ensureWebAudioGraph();
      }
      this.emit();
    });

    el.addEventListener('pause', () => {
      if (!el.ended) {
        this.isPlaying = false;
        this.isBuffering = false;
        this.emit();
      }
    });

    el.addEventListener('timeupdate', () => {
      this.currentTime = el.currentTime || 0;
      if (el.duration && isFinite(el.duration) && el.duration > 0) {
        this.duration = el.duration;
      }
      if (
        this.loopStartSec !== null &&
        this.loopEndSec !== null &&
        this.loopEndSec > this.loopStartSec + 1 &&
        this.currentTime >= this.loopEndSec
      ) {
        el.currentTime = this.loopStartSec;
        this.currentTime = this.loopStartSec;
      }
      this.emit();
    });

    el.addEventListener('ended', () => {
      this.isPlaying = false;
      this.isBuffering = false;
      this.currentTime = 0;
      this.emit();
      if (this.onEndedCallback) {
        this.onEndedCallback();
      }
    });

    let isRetryingFallback = false;

    el.addEventListener('error', async () => {
      const err = el.error;
      console.warn('[AudioEngine] Playback error on src:', el.src, 'code:', err?.code, err?.message);

      // Automatic fallback if direct upstream stream was blocked or unavailable
      if (this.currentTrack && !isRetryingFallback) {
        isRetryingFallback = true;
        this.statusMessage = 'Resolving alternate stream...';
        this.emit();

        const fallbackUrl = await this.resolveTrackFallbackStream(this.currentTrack);
        if (fallbackUrl && fallbackUrl !== el.src) {
          console.info('[AudioEngine] Switching to fallback stream:', fallbackUrl);
          this.currentTrack.streamUrl = fallbackUrl;
          el.src = fallbackUrl;
          el.load();
          el.play()
            .then(() => {
              isRetryingFallback = false;
              this.isPlaying = true;
              this.isBuffering = false;
              this.statusMessage = null;
              this.emit();
            })
            .catch((playErr) => {
              console.warn('[AudioEngine] Fallback stream play error:', playErr);
              isRetryingFallback = false;
              this.isPlaying = false;
              this.isBuffering = false;
              this.statusMessage = 'Unable to stream this track right now.';
              this.emit();
            });
          return;
        }
        isRetryingFallback = false;
      }

      this.isPlaying = false;
      this.isBuffering = false;
      this.statusMessage = 'Unable to stream this track right now.';
      this.emit();
    });

    this.audio = el;
  }

  private async resolveTrackFallbackStream(track: Track): Promise<string | null> {
    const title = track.cleanTitle || track.title || '';
    const artist = track.artistName || '';

    // 1. Try local/backend stream resolver
    try {
      const res = await fetch(
        `/api/v1/audio/stream?title=${encodeURIComponent(title)}&artist=${encodeURIComponent(artist)}`,
        { method: 'GET', redirect: 'follow' }
      );
      if (
        res.ok &&
        res.url &&
        !res.url.includes('/api/v1/audio/stream') &&
        !res.url.includes('/api/audio/stream')
      ) {
        return res.url;
      }
    } catch { }

    // 2. Try Apple iTunes preview direct API (works cross-origin everywhere)
    try {
      const itunesRes = await fetch(
        `https://itunes.apple.com/search?term=${encodeURIComponent(title)}&entity=song&limit=1`
      );
      if (itunesRes.ok) {
        const itunesData: any = await itunesRes.json();
        const preview = itunesData?.results?.[0]?.previewUrl;
        if (preview && typeof preview === 'string') {
          return preview;
        }
      }
    } catch { }

    return null;
  }

  private ensureWebAudioGraph() {
    if (typeof window === 'undefined' || !this.audio || !this.eqEnabled) return;
    try {
      if (!this.audioCtx) {
        const AudioCtx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (!AudioCtx) return;
        this.audioCtx = new AudioCtx();
      }

      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume().catch(() => { });
      }

      if (!this.mediaSourceConnected && this.audioCtx) {
        try {
          const source = this.audioCtx.createMediaElementSource(this.audio);

          // 1. Sub-Woofer 55Hz Harmonic Punch (Mega Bass)
          const subWoofer = this.audioCtx.createBiquadFilter();
          subWoofer.type = 'peaking';
          subWoofer.frequency.value = 55;
          subWoofer.Q.value = 1.35;
          subWoofer.gain.value = this.eqEnabled && this.megaBassEnabled ? 7 : 0;
          this.subWooferNode = subWoofer;

          // 2. Dedicated sub-bass boost shelf at 85Hz
          const bassBoost = this.audioCtx.createBiquadFilter();
          bassBoost.type = 'lowshelf';
          bassBoost.frequency.value = 85;
          bassBoost.gain.value = this.eqEnabled ? this.bassBoostDb : 0;
          this.bassBoostNode = bassBoost;

          // 3. 5-band Equalizer filter nodes
          this.eqFilterNodes = this.eqBands.map((band, idx) => {
            const filter = this.audioCtx!.createBiquadFilter();
            filter.type =
              idx === 0
                ? 'lowshelf'
                : idx === this.eqBands.length - 1
                  ? 'highshelf'
                  : 'peaking';
            filter.frequency.value = band.frequency;
            filter.Q.value = 1.1;
            filter.gain.value = this.eqEnabled ? band.gainDb : 0;
            return filter;
          });

          // 4. Studio Dynamics Compressor to keep heavy bass clean and punchy
          const compressor = this.audioCtx.createDynamicsCompressor();
          compressor.threshold.value = -14;
          compressor.knee.value = 18;
          compressor.ratio.value = 3.5;
          compressor.attack.value = 0.008;
          compressor.release.value = 0.18;
          this.compressorNode = compressor;

          // 5. 8D Spatial Stereo Panner
          const stereoPanner = this.audioCtx.createStereoPanner
            ? this.audioCtx.createStereoPanner()
            : null;
          if (stereoPanner) {
            stereoPanner.pan.value = 0;
            this.stereoPannerNode = stereoPanner;
          }

          // 6. Real-time Spectrum Analyser
          const analyser = this.audioCtx.createAnalyser();
          analyser.fftSize = 64;
          analyser.smoothingTimeConstant = 0.86;
          this.analyserNode = analyser;
          this.freqDataArray = new Uint8Array(analyser.frequencyBinCount);

          source.connect(subWoofer);
          subWoofer.connect(bassBoost);
          let prevNode: AudioNode = bassBoost;
          for (const filterNode of this.eqFilterNodes) {
            prevNode.connect(filterNode);
            prevNode = filterNode;
          }
          prevNode.connect(compressor);
          if (stereoPanner) {
            compressor.connect(stereoPanner);
            stereoPanner.connect(analyser);
          } else {
            compressor.connect(analyser);
          }
          analyser.connect(this.audioCtx.destination);
          this.mediaSourceConnected = true;
        } catch (e) {
          console.warn('[AudioEngine] Web Audio connection bypassed for native audio output:', e);
        }
      }
    } catch {
      // Fallback gracefully if Web Audio connection is restricted
    }
  }

  private syncFilterNodes() {
    if (!this.audioCtx) return;
    const now = this.audioCtx.currentTime;
    if (this.subWooferNode) {
      this.subWooferNode.gain.setTargetAtTime(
        this.eqEnabled && this.megaBassEnabled ? 7 : 0,
        now,
        0.03
      );
    }
    if (this.bassBoostNode) {
      this.bassBoostNode.gain.setTargetAtTime(
        this.eqEnabled ? this.bassBoostDb : 0,
        now,
        0.03
      );
    }
    this.eqFilterNodes.forEach((node, idx) => {
      const targetGain = this.eqEnabled ? this.eqBands[idx]?.gainDb || 0 : 0;
      node.gain.setTargetAtTime(targetGain, now, 0.03);
    });
  }

  public setEqEnabled(enabled: boolean) {
    this.eqEnabled = enabled;
    if (enabled) {
      this.ensureWebAudioGraph();
    }
    this.syncFilterNodes();
    this.emit();
  }

  public setMegaBassEnabled(enabled: boolean) {
    this.megaBassEnabled = enabled;
    if (enabled && this.bassBoostDb < 6) {
      this.bassBoostDb = 8;
    }
    this.syncFilterNodes();
    this.emit();
  }

  public setVibeMode(mode: AudioVibeMode) {
    this.vibeMode = mode;
    const meta = VIBE_MODES[mode];
    if (this.audio) {
      const pitchShift = mode === 'slowed_reverb' || mode === 'nightcore';
      const audioWithPitch = this.audio as HTMLAudioElement & {
        preservesPitch?: boolean;
        webkitPreservesPitch?: boolean;
      };
      audioWithPitch.preservesPitch = !pitchShift;
      audioWithPitch.webkitPreservesPitch = !pitchShift;
    }
    this.setPlaybackRate(meta.speed);

    if (mode === 'bass_club') {
      this.megaBassEnabled = true;
      this.setEqPreset('ultra_bass');
    } else if (mode === 'slowed_reverb') {
      this.megaBassEnabled = true;
      this.setEqPreset('bass_boost');
    } else if (mode === 'nightcore') {
      this.megaBassEnabled = false;
      this.setEqPreset('electronic');
    } else if (mode === 'lofi_chill') {
      this.megaBassEnabled = false;
      this.eqPreset = 'custom';
      this.bassBoostDb = 5;
      const lofiGains = [5, 4, 1, -4, -8];
      this.eqBands = this.eqBands.map((b, i) => ({
        ...b,
        gainDb: lofiGains[i] ?? 0,
      }));
      this.syncFilterNodes();
      this.emit();
    } else if (mode === 'karaoke_sing') {
      this.megaBassEnabled = true;
      this.eqPreset = 'custom';
      this.bassBoostDb = 6;
      const karaokeGains = [6, 3, -9, -7, 4];
      this.eqBands = this.eqBands.map((b, i) => ({
        ...b,
        gainDb: karaokeGains[i] ?? 0,
      }));
      this.syncFilterNodes();
      this.emit();
    } else if (mode === 'vocal_clarity') {
      this.megaBassEnabled = false;
      this.setEqPreset('bollywood_vocal');
    } else {
      // studio
      this.syncFilterNodes();
      this.emit();
    }
  }

  public setSpatial8dEnabled(enabled: boolean) {
    this.spatial8dEnabled = enabled;
    if (this.spatialIntervalId !== null && typeof window !== 'undefined') {
      window.clearInterval(this.spatialIntervalId);
      this.spatialIntervalId = null;
    }
    if (enabled && typeof window !== 'undefined') {
      this.ensureWebAudioGraph();
      this.spatialIntervalId = window.setInterval(() => {
        if (!this.stereoPannerNode || !this.audioCtx) return;
        const pan = Math.sin(Date.now() / 1600) * 0.75;
        this.stereoPannerNode.pan.setTargetAtTime(pan, this.audioCtx.currentTime, 0.08);
      }, 90);
    } else if (this.stereoPannerNode && this.audioCtx) {
      this.stereoPannerNode.pan.setTargetAtTime(0, this.audioCtx.currentTime, 0.08);
    }
    this.emit();
  }

  public setLoopPointA() {
    this.loopStartSec = Math.floor(this.currentTime);
    if (this.loopEndSec !== null && this.loopEndSec <= this.loopStartSec) {
      this.loopEndSec = null;
    }
    this.emit();
  }

  public setLoopPointB() {
    const nowSec = Math.floor(this.currentTime);
    if (this.loopStartSec === null) {
      this.loopStartSec = Math.max(0, nowSec - 15);
    }
    if (nowSec > this.loopStartSec + 1) {
      this.loopEndSec = nowSec;
    }
    this.emit();
  }

  public clearAbLoop() {
    this.loopStartSec = null;
    this.loopEndSec = null;
    this.emit();
  }

  public skipBySeconds(deltaSec: number) {
    this.seek(this.currentTime + deltaSec);
  }

  public resetEqualizer() {
    this.eqEnabled = false;
    this.eqPreset = 'flat';
    this.bassBoostDb = 0;
    this.megaBassEnabled = false;
    this.vibeMode = 'studio';
    this.setSpatial8dEnabled(false);
    this.clearAbLoop();
    this.eqBands = this.eqBands.map((b) => ({
      ...b,
      gainDb: 0,
    }));
    this.setPlaybackRate(1.0);
    this.syncFilterNodes();
    this.emit();
  }

  public setEqPreset(presetId: Exclude<EqPresetId, 'custom'>) {
    const preset = EQ_PRESETS[presetId];
    if (!preset) return;
    this.eqPreset = presetId;
    this.bassBoostDb = preset.bassBoostDb;
    if (presetId === 'flat') {
      this.megaBassEnabled = false;
    } else if (presetId === 'ultra_bass' || presetId === 'punjabi_beats') {
      this.megaBassEnabled = true;
    }
    this.eqBands = this.eqBands.map((b, i) => ({
      ...b,
      gainDb: preset.gains[i] ?? 0,
    }));
    this.syncFilterNodes();
    this.emit();
  }

  public setEqBandGain(bandIndex: number, gainDb: number) {
    const clamped = Math.max(-12, Math.min(12, Math.round(gainDb)));
    this.eqPreset = 'custom';
    this.eqBands = this.eqBands.map((b, i) =>
      i === bandIndex ? { ...b, gainDb: clamped } : b
    );
    this.syncFilterNodes();
    this.emit();
  }

  public setBassBoostDb(db: number) {
    this.bassBoostDb = Math.max(0, Math.min(12, Math.round(db)));
    this.syncFilterNodes();
    this.emit();
  }

  /**
   * Returns real-time frequency spectrum bar heights (12..100) for the Beats Visualizer.
   */
  public getLiveFrequencyBars(count = 20): number[] {
    if (!this.isPlaying) {
      this.smoothedBars = Array.from({ length: count }, () => 12);
      return this.smoothedBars;
    }

    let rawBars: number[] | null = null;
    if (this.analyserNode && this.freqDataArray) {
      try {
        this.analyserNode.getByteFrequencyData(this.freqDataArray);
        const bars: number[] = [];
        const binCount = this.freqDataArray.length;
        let hasSignal = false;
        for (let i = 0; i < count; i++) {
          const binIdx = Math.min(binCount - 1, Math.floor((i / count) * (binCount * 0.75)));
          const val = this.freqDataArray[binIdx] || 0;
          if (val > 5) hasSignal = true;
          bars.push(Math.max(12, Math.min(100, Math.round((val / 255) * 100))));
        }
        if (hasSignal) rawBars = bars;
      } catch {
        // Fall through to rhythmic beat synthesis
      }
    }

    if (!rawBars) {
      const t = Date.now() / 160;
      const megaBoost = this.eqEnabled && this.megaBassEnabled ? 10 : 0;
      rawBars = Array.from({ length: count }, (_, i) => {
        const wave = Math.sin(t + i * 0.55) * 0.5 + 0.5;
        const sub = Math.cos(t * 1.25 - i * 0.3) * 0.5 + 0.5;
        const eqBoost = this.eqEnabled && i < 6 ? (this.bassBoostDb / 12) * 18 + megaBoost : 0;
        return Math.max(14, Math.min(96, Math.round(20 + wave * 44 + sub * 22 + eqBoost)));
      });
    }

    if (this.smoothedBars.length !== count) {
      this.smoothedBars = rawBars;
    } else {
      this.smoothedBars = rawBars.map((target, idx) => {
        const prev = this.smoothedBars[idx] ?? 14;
        return Math.round(prev * 0.52 + target * 0.48);
      });
    }

    return this.smoothedBars;
  }

  public subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener(this.getSnapshot());
    return () => {
      this.listeners.delete(listener);
    };
  }

  public setOnEnded(cb: EndedCallback) {
    this.onEndedCallback = cb;
  }

  public getSnapshot(): EngineSnapshot {
    return {
      isPlaying: this.isPlaying,
      isBuffering: this.isBuffering,
      currentTime: this.currentTime,
      duration: this.duration,
      volume: this.volume,
      muted: this.muted,
      playbackRate: this.playbackRate,
      statusMessage: this.statusMessage,
      eqEnabled: this.eqEnabled,
      eqPreset: this.eqPreset,
      eqBands: this.eqBands,
      bassBoostDb: this.bassBoostDb,
      megaBassEnabled: this.megaBassEnabled,
      vibeMode: this.vibeMode,
      spatial8dEnabled: this.spatial8dEnabled,
      loopStartSec: this.loopStartSec,
      loopEndSec: this.loopEndSec,
    };
  }

  private emit() {
    const snap = this.getSnapshot();
    this.listeners.forEach((l) => l(snap));
  }

  private buildStreamUrl(track: Track): string {
    // If track already has a direct valid CDN stream URL (e.g. JioSaavn CDN or Nazriya API), stream it directly with 0ms latency
    if (
      track.streamUrl &&
      /^https?:\/\//i.test(track.streamUrl) &&
      !track.streamUrl.includes('/api/v1/audio/stream') &&
      !track.streamUrl.includes('/api/audio/stream')
    ) {
      return track.streamUrl;
    }

    // Direct fallback to Nazriya Audio stream if search query is available
    const q = track.cleanTitle || track.title;
    if (q) {
      return `https://nazriya.musicmine.in/api/audio?q=${encodeURIComponent(q)}&key=nz_bcfe4849cb48f9180f389852`;
    }

    const params = new URLSearchParams();
    params.set('id', track.providerId);
    params.set(
      'q',
      track.externalUrl || `${track.cleanTitle} ${track.artistName}`
    );
    params.set('title', track.cleanTitle);
    params.set('artist', track.artistName);
    return `/api/v1/audio/stream?${params.toString()}`;
  }

  public prefetchTrack(track: Track | undefined) {
    if (!track || typeof window === 'undefined') return;
    if (!this.preloader) {
      this.preloader = new Audio();
      this.preloader.preload = 'metadata';
      this.preloader.muted = true;
    }
    const nextUrl = this.buildStreamUrl(track);
    if (this.preloader.src !== nextUrl) {
      this.preloader.src = nextUrl;
    }
  }

  public loadTrack(track: Track, autoPlay = true) {
    this.initAudioElement();
    const isSameTrack = this.currentTrack?.id === track.id;
    this.currentTrack = track;
    this.duration = track.duration || 210;
    this.statusMessage = null;
    this.updateMediaSession(track);

    if (!this.audio) return;

    if (!isSameTrack || !this.audio.src) {
      this.currentTime = 0;
      this.loopStartSec = null;
      this.loopEndSec = null;
      const streamUrl = this.buildStreamUrl(track);
      this.audio.src = streamUrl;
      this.audio.playbackRate = this.playbackRate;
      this.audio.volume = this.volume;
      this.audio.muted = this.muted;
      if (autoPlay) {
        this.isBuffering = true;
        this.emit();
        const playPromise = this.audio.play();
        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              this.isPlaying = true;
              this.isBuffering = false;
              this.emit();
            })
            .catch((err) => {
              console.warn('[AudioEngine] Play rejected:', err);
              this.isPlaying = false;
              this.isBuffering = false;
              this.emit();
            });
        }
      } else {
        this.isPlaying = false;
        this.isBuffering = false;
        this.emit();
      }
    } else if (autoPlay) {
      this.play();
    } else {
      this.emit();
    }
  }

  public play() {
    this.initAudioElement();
    if (!this.currentTrack || !this.audio) return;
    if (!this.audio.src) {
      this.audio.src = this.buildStreamUrl(this.currentTrack);
    }
    this.isBuffering = true;
    this.statusMessage = null;
    this.emit();
    const playPromise = this.audio.play();
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          this.isPlaying = true;
          this.isBuffering = false;
          this.emit();
        })
        .catch((err) => {
          console.warn('[AudioEngine] Play rejected:', err);
          this.isPlaying = false;
          this.isBuffering = false;
          this.emit();
        });
    }
  }

  public pause() {
    if (this.audio) {
      this.audio.pause();
    }
    this.isPlaying = false;
    this.isBuffering = false;
    this.emit();
  }

  public togglePlay() {
    if (this.isPlaying) {
      this.pause();
    } else {
      this.play();
    }
  }

  public seek(seconds: number) {
    if (!this.currentTrack || !this.audio) return;
    const clamped = Math.max(0, Math.min(this.duration || seconds, seconds));
    this.currentTime = clamped;
    try {
      this.audio.currentTime = clamped;
    } catch {
      // Ignore if audio metadata not yet loaded
    }
    this.emit();
  }

  public setVolume(val: number) {
    this.volume = Math.max(0, Math.min(1, val));
    if (this.volume > 0 && this.muted) {
      this.muted = false;
    }
    if (this.audio) {
      this.audio.volume = this.volume;
      this.audio.muted = this.muted;
    }
    this.emit();
  }

  public toggleMute() {
    this.muted = !this.muted;
    if (this.audio) {
      this.audio.muted = this.muted;
    }
    this.emit();
  }

  public setPlaybackRate(rate: number) {
    this.playbackRate = rate;
    if (this.audio) {
      this.audio.playbackRate = rate;
    }
    this.emit();
  }

  private updateMediaSession(track: Track) {
    if (typeof navigator !== 'undefined' && 'mediaSession' in navigator) {
      try {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: track.cleanTitle,
          artist: track.artistName,
          album: track.albumName,
          artwork: track.thumbnailUrl
            ? [{ src: track.thumbnailUrl, sizes: '500x500', type: 'image/jpeg' }]
            : undefined,
        });
        navigator.mediaSession.setActionHandler('play', () => this.play());
        navigator.mediaSession.setActionHandler('pause', () => this.pause());
      } catch {
        // Ignore if blocked by environment
      }
    }
  }
}

export const audioEngine = new MusicMineAudioEngine();
