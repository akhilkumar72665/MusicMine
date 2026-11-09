import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Clock,
  Download,
  Gauge,
  Heart,
  ListMusic,
  Loader2,
  Maximize2,
  Mic2,
  Moon,
  MoreHorizontal,
  Pause,
  Play,
  Radio,
  Repeat,
  Repeat1,
  RotateCcw,
  RotateCw,
  Settings2,
  Shuffle,
  SkipBack,
  SkipForward,
  Sliders,
  Sparkles,
  Trash2,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { RoutePath, Track } from '../../../shared/types/music';
import { formatDuration } from '../data/catalogFixtures';
import {
  audioEngine,
  AudioVibeMode,
  buildTrackDownloadUrl,
  EngineSnapshot,
  EQ_PRESETS,
  EqPresetId,
  VIBE_MODES,
} from '../services/audioEngine';
import { ArtworkTile } from './ArtworkTile';

export type RepeatMode = 'off' | 'all' | 'one';

interface LyricLine {
  timeSec: number;
  text: string;
}

const REAL_HINGLISH_CATALOG_LYRICS: Record<string, LyricLine[]> = {
  'aaj ki raat': [
    { timeSec: 0, text: '♪ Music Intro — Aaj Ki Raat (Stree 2)' },
    { timeSec: 9, text: 'Thodi fursat bhi meri jaan kabhi baahon ko dijiye' },
    { timeSec: 17, text: 'Thodi fursat bhi meri jaan kabhi baahon ko dijiye' },
    { timeSec: 25, text: 'Aaj ki raat maza husn ka aankhon se lijiye' },
    { timeSec: 33, text: 'Aaj ki raat maza husn ka aankhon se lijiye' },
    { timeSec: 42, text: 'Waqt barbaad na bin baat ki baaton mein kijiye' },
    { timeSec: 50, text: 'Aaj ki raat maza husn ka aankhon se lijiye' },
    { timeSec: 65, text: 'Thoda mahol banaaiye, thoda paimaana chhalakaaiye' },
    { timeSec: 78, text: 'Jaan-e-man aaiye, hosh kho jaaiye' },
    { timeSec: 92, text: 'Aaj ki raat maza husn ka aankhon se lijiye' },
    { timeSec: 115, text: 'Kurbaan hua teri ada pe dil mera' },
    { timeSec: 135, text: 'Aaj ki raat maza husn ka aankhon se lijiye' },
  ],
  'apna bana le': [
    { timeSec: 0, text: '♪ Acoustic Intro — Apna Bana Le (Arijit Singh)' },
    { timeSec: 21, text: 'Tu mera koi na hoke bhi kuch laage' },
    { timeSec: 27, text: 'Tu mera koi na hoke bhi kuch laage' },
    { timeSec: 32, text: 'Kiya re jo bhi tune kaise kiya re' },
    { timeSec: 38, text: 'Jiya ko mere baandh aise liya re' },
    { timeSec: 43, text: 'Samajh ke bhi na samajh main saku' },
    { timeSec: 49, text: 'Saveron ka mere tu sooraj laage' },
    { timeSec: 54, text: 'Tu mera koi na hoke bhi kuch laage' },
    { timeSec: 64, text: 'Apna bana le piya, apna bana le piya' },
    { timeSec: 75, text: 'Apna bana le mujhe apna bana le piya' },
    { timeSec: 86, text: 'Dil ke nagar mein shehar tu basa le piya' },
    { timeSec: 112, text: 'Chhoone se tere haan tere haan tere' },
    { timeSec: 122, text: 'Feeki ruton ko rang lage' },
    { timeSec: 145, text: 'Apna bana le piya, apna bana le piya' },
  ],
  kesariya: [
    { timeSec: 0, text: '♪ Guitar Intro — Kesariya (Brahmāstra)' },
    { timeSec: 9, text: 'Mujhko itna bataaye koi' },
    { timeSec: 19, text: 'Kaise tujhse dil na lagaaye koi' },
    { timeSec: 28, text: 'Rabba ne tujhko banaane mein' },
    { timeSec: 33, text: 'Kardi hai husn ki khaali tijoriyan' },
    { timeSec: 43, text: 'Kaajal ki siyaahi se likhi' },
    { timeSec: 48, text: 'Hai tune jaane kitno ki love storiyan' },
    { timeSec: 56, text: 'Kesariya tera ishq hai piya, rang jaaun jo main haath lagaun' },
    { timeSec: 66, text: 'Din beete saara teri fikar mein' },
    { timeSec: 71, text: 'Rain saari teri khair manaun' },
    { timeSec: 81, text: 'Kesariya tera ishq hai piya, rang jaaun jo main haath lagaun' },
    { timeSec: 115, text: 'Patjhad ke mausam mein bhi rangi chanaaron jaisi' },
    { timeSec: 126, text: 'Jhanke sannaaton mein tu veena ke taaron jaisi' },
    { timeSec: 152, text: 'Kesariya tera ishq hai piya, ishq hai piya' },
  ],
  'tauba tauba': [
    { timeSec: 0, text: '♪ Punjabi Beat Intro — Tauba Tauba (Karan Aujla)' },
    { timeSec: 9, text: 'Husan tera tauba tauba, tauba tauba' },
    { timeSec: 14, text: 'Husan tera tauba tauba, tauba tauba' },
    { timeSec: 19, text: 'Dil nu chhoo jaave tera nakhra billo' },
    { timeSec: 28, text: 'Ni mundeya de hosh udaye, hosh udaye' },
    { timeSec: 38, text: 'Husan tera tauba tauba, tauba tauba' },
    { timeSec: 52, text: 'Kangna vi kehnda tera naa goriye' },
    { timeSec: 65, text: 'Jadon turdi ae lakk lachkaave goriye' },
    { timeSec: 82, text: 'Husan tera tauba tauba, tauba tauba' },
    { timeSec: 110, text: 'Karan Aujla verse — Jadon aave saamne tu' },
    { timeSec: 135, text: 'Husan tera tauba tauba, tauba tauba' },
  ],
  lover: [
    { timeSec: 0, text: '♪ Intense Beat Intro — Lover (Diljit Dosanjh)' },
    { timeSec: 15, text: 'Kol ae tu yeah, sambh le dil mere nu yeah' },
    { timeSec: 20, text: 'Dass de doori ae kyun yeah' },
    { timeSec: 28, text: 'Tere bina adhoora jeha lagda ae jag saara' },
    { timeSec: 40, text: 'Black tera suit te gora tera rang ni' },
    { timeSec: 52, text: 'Mundeya di jaan lutt ke na langh ni' },
    { timeSec: 68, text: 'You are my lover, tere naal pyar goriye' },
    { timeSec: 90, text: 'Kol ae tu yeah, sambh le dil mere nu yeah' },
    { timeSec: 125, text: 'Diljit Dosanjh — MoonChild Era vibe' },
  ],
  chaleya: [
    { timeSec: 0, text: '♪ Groove Intro — Chaleya (Jawan)' },
    { timeSec: 11, text: 'Ishq mein dil bana hai, ishq mein dil fana hai' },
    { timeSec: 21, text: 'Mita de ya bana de, maine tujhko chuna hai' },
    { timeSec: 31, text: 'Tere saare rang oodhe dhang oodhe' },
    { timeSec: 41, text: 'Teri hua main sabko chhod ke' },
    { timeSec: 51, text: 'Ishq nahi aasaan bas itna samajh le' },
    { timeSec: 61, text: 'Main teri aankhon se duniya dekhun' },
    { timeSec: 72, text: 'Teri ore chaleya, hua main tera chaleya' },
    { timeSec: 84, text: 'Chalna jaane na, bas teri ore chaleya' },
    { timeSec: 115, text: 'Bulleya teri galiyon mein dil kho gaya' },
    { timeSec: 140, text: 'Teri ore chaleya, hua main tera chaleya' },
  ],
  'arabic kuthu': [
    { timeSec: 0, text: '♪ Anirudh Kuthu Beat — Arabic Kuthu (Beast)' },
    { timeSec: 12, text: 'Halamithi Habibo, Halamithi Habibo vandhaale' },
    { timeSec: 24, text: 'Halamithi Habibo, malama pitha pithadhe' },
    { timeSec: 38, text: 'Konjam madakki thatti vittaale' },
    { timeSec: 52, text: 'Manasa suthi suthi vittaale' },
    { timeSec: 70, text: 'Halamithi Habibo, Halamithi Habibo' },
    { timeSec: 105, text: 'Azhagiya sooriyan pola minnum radhiye' },
    { timeSec: 140, text: 'Halamithi Habibo — malama pitha pithadhe' },
  ],
  'kun faya kun': [
    { timeSec: 0, text: '♪ Qawwali Intro — Kun Faya Kun (A.R. Rahman)' },
    { timeSec: 18, text: 'Ya Nizamuddin Auliya, Ya Nizamuddin Salama' },
    { timeSec: 36, text: 'Kadam badha le, hadd ko mita le' },
    { timeSec: 52, text: 'Aaja khalipan mein pee ka ghar tera' },
    { timeSec: 70, text: 'Tere bin khali aaja khalipan mein' },
    { timeSec: 92, text: 'Rangreza, rang mera tan mera man' },
    { timeSec: 115, text: 'Le le rangai chahe tan chahe man' },
    { timeSec: 145, text: 'Kun Faya Kun, Kun Faya Kun, Faya Kun' },
    { timeSec: 185, text: 'Jab kahin pe kuch nahi bhi nahi tha, wahi tha wahi tha' },
    { timeSec: 230, text: 'Sajra savera mere tan barse, kajra andhera teri jalti lau' },
    { timeSec: 290, text: 'Mann ke mere ye bharam, kachche mere ye karam' },
  ],
  illuminati: [
    { timeSec: 0, text: '♪ High-Voltage Synth — Illuminati (Aavesham)' },
    { timeSec: 12, text: 'Naadin nanmakane, ponmakane, muthaayavane' },
    { timeSec: 16, text: 'Minnum sooriyanum, chandiranum onnaayavane' },
    { timeSec: 20, text: 'Kaalam kaathuvacha rakshakane, samhaarakane' },
    { timeSec: 32, text: 'Illuminati, Illuminati — Annan thani naadan' },
    { timeSec: 48, text: 'Kollam kanda kireedam, Ranga Annan mass entry' },
    { timeSec: 72, text: 'Illuminati, Illuminati — Sushin Shyam & Dabzee' },
    { timeSec: 110, text: 'Thee pidikkum beatil aadu Ranga' },
  ],
  'tum hi ho': [
    { timeSec: 0, text: '♪ Piano Intro — Tum Hi Ho (Aashiqui 2)' },
    { timeSec: 11, text: 'Hum tere bin ab reh nahi sakte' },
    { timeSec: 16, text: 'Tere bina kya wajood mera' },
    { timeSec: 25, text: 'Hum tere bin ab reh nahi sakte' },
    { timeSec: 31, text: 'Tere bina kya wajood mera' },
    { timeSec: 39, text: 'Tujhse juda gar ho jaayenge' },
    { timeSec: 46, text: 'Toh khud se hi ho jaayenge juda' },
    { timeSec: 54, text: 'Kyunki tum hi ho, ab tum hi ho' },
    { timeSec: 62, text: 'Zindagi ab tum hi ho' },
    { timeSec: 69, text: 'Chain bhi, mera dard bhi' },
    { timeSec: 76, text: 'Meri aashiqui ab tum hi ho' },
    { timeSec: 108, text: 'Tera mera rishta hai kaisa, ik pal door gawara nahi' },
    { timeSec: 124, text: 'Tere liye har roz hai jeete, tujhko diya mera waqt sabhi' },
    { timeSec: 150, text: 'Kyunki tum hi ho, ab tum hi ho, zindagi ab tum hi ho' },
  ],
};

function getSynchronizedLyrics(track: Track): LyricLine[] {
  const normalizedTitle = track.cleanTitle.toLowerCase();
  for (const [key, lines] of Object.entries(REAL_HINGLISH_CATALOG_LYRICS)) {
    if (normalizedTitle.includes(key)) {
      return lines;
    }
  }

  const step = Math.max(10, Math.floor((track.duration || 180) / 8));
  return [
    { timeSec: 0, text: `♪ Music Intro — ${track.cleanTitle}` },
    { timeSec: step * 1, text: `Dil ki dhadkan tezi se chale — ${track.cleanTitle}` },
    { timeSec: step * 2, text: `Teri yaadon mein kho jaaye har lamha` },
    { timeSec: step * 3, text: `${track.artistName} — Awaaz jo dil chhoo jaaye` },
    { timeSec: step * 4, text: `Raat bhar baaje ye dhun, rukne na paaye kadam` },
    { timeSec: step * 5, text: `Ishq aur junoon ka safar chalta rahe` },
    { timeSec: step * 6, text: `Suron ki mehfil mein tera hi naam goonje` },
    { timeSec: step * 7, text: `♪ Outro — ${track.cleanTitle} (${track.artistName})` },
  ];
}

export const LiveBeatsVisualizer: React.FC<{
  isPlaying: boolean;
  barCount?: number;
  compact?: boolean;
}> = ({ isPlaying, barCount = 24, compact = false }) => {
  if (compact) {
    return (
      <div
        aria-label="Live audio beats"
        className="flex items-end gap-0.5 h-3.5 px-1.5 shrink-0"
      >
        <span
          className={`w-0.5 rounded-full bg-[#FF0000] ${isPlaying ? 'h-full mm-beat-1' : 'h-1.5 opacity-30'
            }`}
        />
        <span
          className={`w-0.5 rounded-full bg-[#FF0000] ${isPlaying ? 'h-full mm-beat-2' : 'h-2 opacity-30'
            }`}
        />
        <span
          className={`w-0.5 rounded-full bg-[#FF0000] ${isPlaying ? 'h-full mm-beat-3' : 'h-1 opacity-30'
            }`}
        />
        <span
          className={`w-0.5 rounded-full bg-[#FF0000] ${isPlaying ? 'h-full mm-beat-4' : 'h-2 opacity-30'
            }`}
        />
      </div>
    );
  }

  const [bars, setBars] = useState<number[]>(() =>
    Array.from({ length: barCount }, () => 14)
  );

  useEffect(() => {
    if (!isPlaying) {
      setBars(Array.from({ length: barCount }, () => 14));
      return;
    }
    const interval = window.setInterval(() => {
      setBars([...audioEngine.getLiveFrequencyBars(barCount)]);
    }, 75);
    return () => clearInterval(interval);
  }, [isPlaying, barCount]);

  return (
    <div
      aria-label="Live audio spectrum visualizer"
      className="w-full h-12 px-4 py-2.5 rounded-xl bg-[#080808] border border-neutral-800/80 flex items-end justify-between gap-1.5 overflow-hidden"
    >
      {bars.map((heightPct, idx) => {
        const activeHeight = isPlaying ? Math.max(14, heightPct) : 14;
        return (
          <div
            key={idx}
            className="flex-1 rounded-full bg-gradient-to-t from-[#830000] via-[#BC0202] to-[#FF0000] mm-beat-bar-smooth"
            style={{
              height: `${activeHeight}%`,
              opacity: isPlaying ? Math.max(0.45, Math.min(0.95, activeHeight / 100)) : 0.25,
            }}
          />
        );
      })}
    </div>
  );
};

export type ShuffleMode = 'off' | 'standard' | 'smart';

interface GlobalPlayerProps {
  currentTrack: Track | null;
  queue: Track[];
  currentIndex: number;
  engineState: EngineSnapshot;
  shuffle: boolean;
  shuffleMode?: ShuffleMode;
  repeatMode: RepeatMode;
  likedTrackIds: string[];
  sleepTimerMinutes: number | null;
  isExpanded?: boolean;
  onToggleExpand?: (expanded: boolean) => void;
  onTogglePlay: () => void;
  onPrev: () => void;
  onNext: () => void;
  onSeek: (sec: number) => void;
  onVolumeChange: (val: number) => void;
  onToggleMute: () => void;
  onToggleShuffle: () => void;
  onPrioritizeSmartQueue?: () => void;
  onCycleRepeat: () => void;
  onToggleLike: (trackId: string) => void;
  onPlayQueueIndex: (idx: number) => void;
  onRemoveFromQueue: (idx: number) => void;
  onMoveQueueItem: (idx: number, direction: 'up' | 'down') => void;
  onClearQueue: () => void;
  onSetPlaybackRate: (rate: number) => void;
  onSetSleepTimer: (mins: number | null) => void;
  onNavigate: (path: RoutePath) => void;
}

export const GlobalPlayer: React.FC<GlobalPlayerProps> = ({
  currentTrack,
  queue,
  currentIndex,
  engineState,
  shuffle,
  shuffleMode = shuffle ? 'standard' : 'off',
  repeatMode,
  likedTrackIds,
  sleepTimerMinutes,
  isExpanded,
  onToggleExpand,
  onTogglePlay,
  onPrev,
  onNext,
  onSeek,
  onVolumeChange,
  onToggleMute,
  onToggleShuffle,
  onPrioritizeSmartQueue,
  onCycleRepeat,
  onToggleLike,
  onPlayQueueIndex,
  onRemoveFromQueue,
  onMoveQueueItem,
  onClearQueue,
  onSetPlaybackRate,
  onSetSleepTimer,
  onNavigate,
}) => {
  const [internalExpanded, setInternalExpanded] = useState(false);
  const expanded = isExpanded !== undefined ? isExpanded : internalExpanded;
  const setExpanded = (val: boolean | ((prev: boolean) => boolean)) => {
    const nextVal = typeof val === 'function' ? val(expanded) : val;
    setInternalExpanded(nextVal);
    onToggleExpand?.(nextVal);
  };
  const [queueOpen, setQueueOpen] = useState(false);
  const [lyricsOn, setLyricsOn] = useState<boolean>(false);
  const [remoteLyrics, setRemoteLyrics] = useState<LyricLine[] | null>(null);
  const [lyricsLoading, setLyricsLoading] = useState<boolean>(false);
  const [activeModal, setActiveModal] = useState<
    'none' | 'equalizer' | 'queue' | 'speed' | 'sleep' | 'loop' | 'more' | 'fullLyrics'
  >('none');

  useEffect(() => {
    if (queueOpen) {
      setActiveModal('queue');
    }
  }, [queueOpen]);

  useEffect(() => {
    if (!currentTrack) {
      setRemoteLyrics(null);
      return;
    }
    let cancelled = false;
    setRemoteLyrics(null);
    setLyricsLoading(true);
    fetch(
      `/api/v1/lyrics?title=${encodeURIComponent(currentTrack.cleanTitle)}&artist=${encodeURIComponent(
        currentTrack.artistName
      )}`
    )
      .then((res) => (res.ok ? res.json() : null))
      .then((payload) => {
        if (cancelled) return;
        const lines = payload?.data?.lines ?? payload?.lines;
        if (Array.isArray(lines) && lines.length > 0) {
          setRemoteLyrics(lines);
        } else {
          setRemoteLyrics(null);
        }
      })
      .catch(() => {
        if (!cancelled) setRemoteLyrics(null);
      })
      .finally(() => {
        if (!cancelled) setLyricsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [currentTrack?.id, currentTrack?.cleanTitle, currentTrack?.artistName]);

  const lyrics = useMemo(() => {
    if (!currentTrack) return [];
    if (remoteLyrics && remoteLyrics.length > 0) return remoteLyrics;
    return getSynchronizedLyrics(currentTrack);
  }, [currentTrack, remoteLyrics]);

  const activeLyricIndex = useMemo(() => {
    let idx = 0;
    for (let i = 0; i < lyrics.length; i++) {
      if (engineState.currentTime >= lyrics[i].timeSec) {
        idx = i;
      }
    }
    return idx;
  }, [lyrics, engineState.currentTime]);

  const lyricsListRef = useRef<HTMLDivElement>(null);
  const activeLineRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!lyricsOn || !lyricsListRef.current || !activeLineRef.current) return;
    const container = lyricsListRef.current;
    const activeEl = activeLineRef.current;

    const containerRect = container.getBoundingClientRect();
    const activeRect = activeEl.getBoundingClientRect();

    const relativeTop = activeRect.top - containerRect.top + container.scrollTop;
    const targetScrollTop = relativeTop - (container.clientHeight / 2) + (activeEl.clientHeight / 2);

    container.scrollTo({
      top: Math.max(0, targetScrollTop),
      behavior: 'smooth',
    });
  }, [activeLyricIndex, lyricsOn]);

  const handleToggleLyricsOnOff = () => {
    setLyricsOn((prev) => !prev);
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return;
      }
      if (e.key === 'Escape' && activeModal !== 'none') {
        e.preventDefault();
        setActiveModal('none');
        return;
      }
      if (e.code === 'Space') {
        e.preventDefault();
        onTogglePlay();
      } else if (e.key === 'l' || e.key === 'L') {
        e.preventDefault();
        setLyricsOn((prev) => !prev);
      } else if (e.key === 'm' || e.key === 'M') {
        e.preventDefault();
        onToggleMute();
      } else if (e.key === 'ArrowRight' && !e.metaKey && !e.altKey) {
        e.preventDefault();
        audioEngine.skipBySeconds(10);
      } else if (e.key === 'ArrowLeft' && !e.metaKey && !e.altKey) {
        e.preventDefault();
        audioEngine.skipBySeconds(-10);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onTogglePlay, onToggleMute, activeModal]);

  if (!currentTrack) {
    return (
      <footer
        aria-label="Music player"
        className="h-16 bg-black border-t border-neutral-800 px-4 lg:px-6 flex items-center justify-between text-xs text-neutral-400 shrink-0 z-30"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#0D0D0D] border border-neutral-800 flex items-center justify-center text-neutral-500">
            <Play className="w-4 h-4" />
          </div>
          <div>
            <p className="text-neutral-200 font-medium">No track selected</p>
            <p className="text-neutral-500">Choose a song to start listening</p>
          </div>
        </div>
      </footer>
    );
  }

  const isLiked = likedTrackIds.includes(currentTrack.id);
  const progressPercent =
    engineState.duration > 0
      ? Math.min(100, (engineState.currentTime / engineState.duration) * 100)
      : 0;
  const activeLyricLine = lyrics[activeLyricIndex] ?? null;
  const nextLyricLine = lyrics[activeLyricIndex + 1] ?? null;

  return (
    <>
      {/* Expanded Full Player (Clean Studio View - Fixed Viewport No Scrolling) */}
      {(expanded || queueOpen) && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Expanded Music Player"
          className="fixed inset-0 z-50 h-[100dvh] max-h-[100dvh] w-full overflow-hidden overscroll-none touch-none bg-gradient-to-b from-[#180303] via-[#080101] to-black flex flex-col justify-between p-3 sm:p-5 lg:p-6 select-none"
        >
          {/* Top Bar: Left ChevronDown, Center NOW PLAYING, Right Queue Icon */}
          <div className="max-w-6xl w-full mx-auto flex items-center justify-between pb-1 shrink-0">
            <button
              type="button"
              onClick={() => {
                setExpanded(false);
                setQueueOpen(false);
                setActiveModal('none');
              }}
              className="p-2 -ml-2 rounded-full hover:bg-white/10 text-neutral-300 hover:text-white transition-colors cursor-pointer"
              aria-label="Collapse player"
            >
              <ChevronDown className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>

            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#FF0000] animate-pulse" />
              <span className="text-[11px] font-mono font-bold tracking-[0.22em] text-neutral-300 uppercase">
                NOW PLAYING
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-neutral-400 font-mono hidden sm:inline-block">
                160 kbps AAC
              </span>
            </div>

            <div className="flex items-center gap-1.5 -mr-2">
              <button
                type="button"
                onClick={() => setActiveModal('queue')}
                aria-label="Open Queue"
                title={`Up Next Queue (${queue.length})`}
                className={`p-2 rounded-full hover:bg-white/10 transition-colors cursor-pointer ${activeModal === 'queue' ? 'text-[#FF0000]' : 'text-neutral-300 hover:text-white'
                  }`}
              >
                <ListMusic className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Desktop Layout: 2-column balanced stage */}
          <div className="hidden md:grid md:grid-cols-12 md:gap-8 lg:gap-14 items-center my-auto w-full max-w-6xl mx-auto flex-1 min-h-0 py-2">
            {/* Left Column: Floating Large Artwork + Integrated Live Beats Visualizer + Synchronized Lyrics */}
            <div className="md:col-span-6 flex flex-col items-center justify-center space-y-3">
              <div
                className={`relative group max-h-[38vh] lg:max-h-[44vh] max-w-[38vh] lg:max-w-[44vh] aspect-square transition-all duration-300 ${engineState.isPlaying ? 'mm-floating-artwork' : 'shadow-[0_25px_60px_rgba(0,0,0,0.95)]'
                  }`}
              >
                <img
                  src={currentTrack.thumbnailUrl}
                  alt={currentTrack.cleanTitle}
                  className="w-full h-full object-cover rounded-2xl sm:rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.9)] border border-neutral-800/60"
                />
                <div className="absolute top-3 left-3 flex items-center gap-1.5 pointer-events-none">
                  {engineState.spatial8dEnabled && (
                    <span className="px-2 py-0.5 rounded-full bg-black/80 backdrop-blur-md text-[#FF0000] border border-[#FF0000]/40 text-[10px] font-mono font-bold uppercase tracking-wider">
                      8D AUDIO
                    </span>
                  )}
                  {engineState.eqEnabled && (
                    <span className="px-2 py-0.5 rounded-full bg-black/80 backdrop-blur-md text-white border border-neutral-700 text-[10px] font-mono font-bold uppercase tracking-wider">
                      EQ ACTIVE
                    </span>
                  )}
                </div>
              </div>

              {/* Integrated Live Beats Visualizer with Real-time Active Lyric line */}
              <div className="w-full max-w-[380px] lg:max-w-[440px] space-y-2.5 transition-all duration-300">
                <LiveBeatsVisualizer isPlaying={engineState.isPlaying} barCount={28} />

                {/* When lyrics on: only the single active line right inside beats visualizer, tap opens full lyrics */}
                {lyricsOn && (
                  <button
                    type="button"
                    onClick={() => setActiveModal('fullLyrics')}
                    title="Click for full lyrics"
                    className="w-full p-2.5 sm:p-3 rounded-xl bg-gradient-to-r from-[#200505]/90 via-[#0A0A0A]/90 to-[#200505]/90 border border-[#BC0202]/60 hover:border-[#FF0000] shadow-[0_4px_18px_rgba(255,0,0,0.25)] transition-all cursor-pointer group text-center block"
                  >
                    <div className="flex items-center justify-between text-[10px] mb-1 text-neutral-400">
                      <span className="flex items-center gap-1 font-bold text-[#FF0000] uppercase tracking-wider text-[9px]">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#FF0000] animate-pulse shadow-[0_0_8px_#FF0000]" />
                        Now Singing
                      </span>
                      <span className="text-[10px] text-neutral-400 group-hover:text-white group-hover:underline transition-colors flex items-center gap-1">
                        <span>Full Lyrics</span>
                        <ChevronRight className="w-3 h-3 text-[#FF0000]" />
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm font-bold text-white tracking-wide leading-snug line-clamp-2 px-1">
                      {lyrics[activeLyricIndex]?.text || '♪ Singing along...'}
                    </p>
                  </button>
                )}
              </div>
            </div>

            {/* Right Column: Title, Heart, More, Scrubber, Transport, 15s Skip, Pills & Volume */}
            <div className="md:col-span-6 flex flex-col justify-center space-y-4 max-w-lg mx-auto md:mx-0 w-full">
              {/* Song Title, Artist & Like/More */}
              <div className="space-y-1">
                <div className="flex items-start justify-between gap-4">
                  <h1
                    className="text-xl sm:text-2xl lg:text-3xl font-display font-bold text-white tracking-tight leading-snug line-clamp-2"
                    title={currentTrack.cleanTitle}
                  >
                    {currentTrack.cleanTitle}
                  </h1>
                  <div className="flex items-center gap-2 shrink-0 pt-1">
                    <button
                      type="button"
                      onClick={() => onToggleLike(currentTrack.id)}
                      aria-label={isLiked ? 'Unlike track' : 'Like track'}
                      className="p-1.5 text-neutral-400 hover:text-white transition-colors cursor-pointer"
                    >
                      <Heart className={`w-5 h-5 ${isLiked ? 'fill-[#FF0000] text-[#FF0000]' : ''}`} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveModal(activeModal === 'more' ? 'none' : 'more')}
                      aria-label="More options"
                      className="p-1.5 text-neutral-400 hover:text-white transition-colors cursor-pointer"
                    >
                      <MoreHorizontal className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                <p className="text-xs sm:text-sm text-neutral-400">
                  <button
                    type="button"
                    onClick={() => {
                      setExpanded(false);
                      onNavigate(`/artist/${currentTrack.artistId}`);
                    }}
                    className="hover:text-white hover:underline cursor-pointer"
                  >
                    {currentTrack.artistName}
                  </button>
                  {currentTrack.albumName && (
                    <span className="text-neutral-500"> · {currentTrack.albumName}</span>
                  )}
                  {currentTrack.language && (
                    <span className="text-neutral-500"> · {currentTrack.language}</span>
                  )}
                  <span className="inline-flex items-center gap-1 ml-2 text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#FF0000]/15 border border-[#FF0000]/30 text-[#ff7272]">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#FF0000] animate-pulse" />
                    Source: {currentTrack.sourceApi || (currentTrack.providerId?.startsWith('svn-') ? 'JioSaavn' : currentTrack.providerId?.startsWith('itu-') ? 'iTunes' : 'Nazriya API')}
                  </span>
                </p>
              </div>

              {/* Scrubber Progress Bar & Timestamps */}
              <div className="space-y-1">
                <input
                  type="range"
                  aria-label="Seek timeline"
                  min={0}
                  max={engineState.duration || 100}
                  value={engineState.currentTime}
                  onChange={(e) => onSeek(Number(e.target.value))}
                  className="w-full accent-[#FF0000] h-1.5 bg-neutral-800 rounded-lg cursor-pointer"
                />
                <div className="flex justify-between text-xs font-mono tabular-nums text-neutral-400">
                  <span>{formatDuration(engineState.currentTime)}</span>
                  <span>{formatDuration(engineState.duration)}</span>
                </div>
              </div>

              {/* Main Playback Transport Controls */}
              <div className="flex items-center justify-between px-2 sm:px-4">
                <button
                  type="button"
                  onClick={onToggleShuffle}
                  aria-label={shuffleMode === 'smart' ? 'Smart Shuffle' : shuffleMode === 'standard' ? 'Standard Shuffle' : 'Shuffle Off'}
                  className={`relative p-2 rounded-full transition-all cursor-pointer ${shuffleMode === 'smart'
                    ? 'text-[#FF0000] bg-[#FF0000]/15 ring-1 ring-[#FF0000]/50 shadow-[0_0_12px_rgba(255,0,0,0.3)]'
                    : shuffleMode === 'standard'
                      ? 'text-[#FF0000] bg-white/5'
                      : 'text-neutral-400 hover:text-white'
                    }`}
                >
                  <Shuffle className="w-5 h-5" />
                  {shuffleMode === 'smart' && (
                    <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[#FF0000] text-white ring-2 ring-black animate-pulse">
                      <Sparkles className="w-2 h-2" />
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={onPrev}
                  aria-label="Previous"
                  className="p-2 text-neutral-300 hover:text-white transition-colors cursor-pointer"
                >
                  <SkipBack className="w-6 h-6 fill-current" />
                </button>

                {/* Big Glowing Crimson Red Circular Play/Pause Button */}
                <button
                  type="button"
                  onClick={onTogglePlay}
                  aria-label={engineState.isPlaying ? 'Pause' : 'Play'}
                  className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-[#FF0000] hover:bg-[#d80000] text-white flex items-center justify-center shadow-[0_0_24px_rgba(255,0,0,0.6)] transition-transform active:scale-95 cursor-pointer shrink-0"
                >
                  {engineState.isBuffering ? (
                    <Loader2 className="w-6 h-6 animate-spin" />
                  ) : engineState.isPlaying ? (
                    <Pause className="w-6 h-6 fill-current" />
                  ) : (
                    <Play className="w-6 h-6 fill-current ml-1" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={onNext}
                  aria-label="Next"
                  className="p-2 text-neutral-300 hover:text-white transition-colors cursor-pointer"
                >
                  <SkipForward className="w-6 h-6 fill-current" />
                </button>

                <button
                  type="button"
                  onClick={onCycleRepeat}
                  aria-label="Repeat"
                  className={`p-2 rounded-full transition-colors cursor-pointer ${repeatMode !== 'off' ? 'text-[#FF0000]' : 'text-neutral-400 hover:text-white'
                    }`}
                >
                  {repeatMode === 'one' ? (
                    <Repeat1 className="w-5 h-5" />
                  ) : (
                    <Repeat className="w-5 h-5" />
                  )}
                </button>
              </div>

              {/* Sub-Controls: -15s and +15s and Equalizer Icon Button (Beside 15s skip) */}
              <div className="flex items-center justify-center gap-6 py-0.5">
                <button
                  type="button"
                  onClick={() => audioEngine.skipBySeconds(-15)}
                  aria-label="Rewind 15 seconds"
                  className="flex flex-col items-center justify-center w-9 h-9 rounded-full hover:bg-white/10 text-neutral-300 hover:text-white transition-colors cursor-pointer"
                >
                  <div className="relative flex items-center justify-center">
                    <RotateCcw className="w-5 h-5" />
                    <span className="absolute text-[7px] font-mono font-bold pt-0.5">15</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => audioEngine.skipBySeconds(15)}
                  aria-label="Forward 15 seconds"
                  className="flex flex-col items-center justify-center w-9 h-9 rounded-full hover:bg-white/10 text-neutral-300 hover:text-white transition-colors cursor-pointer"
                >
                  <div className="relative flex items-center justify-center">
                    <RotateCw className="w-5 h-5" />
                    <span className="absolute text-[7px] font-mono font-bold pt-0.5">15</span>
                  </div>
                </button>

                {/* Equalizer Icon Button */}
                <button
                  type="button"
                  onClick={() => setActiveModal(activeModal === 'equalizer' ? 'none' : 'equalizer')}
                  aria-label="Equalizer & Audio Modes"
                  title="5-Band Equalizer & Audio Modes"
                  className={`flex items-center justify-center w-9 h-9 rounded-full transition-all cursor-pointer ${activeModal === 'equalizer' || engineState.eqEnabled
                    ? 'bg-[#BC0202] text-white shadow-[0_0_14px_rgba(255,0,0,0.5)] ring-1 ring-[#FF0000]'
                    : 'hover:bg-white/10 text-neutral-300 hover:text-white'
                    }`}
                >
                  <Sliders className="w-4 h-4" />
                </button>
              </div>

              {/* Compact Pill Buttons Row */}
              <div className="flex flex-wrap items-center justify-center gap-2 pt-0.5">
                <button
                  type="button"
                  onClick={handleToggleLyricsOnOff}
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border transition-colors cursor-pointer ${lyricsOn
                    ? 'bg-[#BC0202] border-[#FF0000] text-white shadow-[0_0_12px_rgba(255,0,0,0.4)]'
                    : 'bg-[#121212] border-neutral-800 text-neutral-300 hover:text-white'
                    }`}
                >
                  <Mic2 className="w-3.5 h-3.5" />
                  <span>{lyricsOn ? 'Lyrics On' : 'Lyrics Off'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveModal(activeModal === 'speed' ? 'none' : 'speed')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border transition-colors cursor-pointer ${engineState.playbackRate !== 1
                    ? 'bg-[#BC0202] border-[#FF0000] text-white'
                    : 'bg-[#121212] border-neutral-800 text-neutral-300 hover:text-white'
                    }`}
                >
                  <Gauge className="w-3.5 h-3.5" />
                  <span>Speed {engineState.playbackRate !== 1 ? `(${engineState.playbackRate}x)` : ''}</span>
                </button>

                <button
                  type="button"
                  onClick={() => audioEngine.setSpatial8dEnabled(!engineState.spatial8dEnabled)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border transition-colors cursor-pointer ${engineState.spatial8dEnabled
                    ? 'bg-[#BC0202] border-[#FF0000] text-white shadow-[0_0_12px_rgba(255,0,0,0.4)]'
                    : 'bg-[#121212] border-neutral-800 text-neutral-300 hover:text-white'
                    }`}
                >
                  <Radio className="w-3.5 h-3.5" />
                  <span>8D Audio {engineState.spatial8dEnabled ? 'On' : 'Off'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveModal(activeModal === 'sleep' ? 'none' : 'sleep')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border transition-colors cursor-pointer ${sleepTimerMinutes !== null
                    ? 'bg-[#BC0202] border-[#FF0000] text-white'
                    : 'bg-[#121212] border-neutral-800 text-neutral-300 hover:text-white'
                    }`}
                >
                  <Moon className="w-3.5 h-3.5" />
                  <span>Sleep timer {sleepTimerMinutes !== null ? `(${sleepTimerMinutes}m)` : ''}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveModal(activeModal === 'loop' ? 'none' : 'loop')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border transition-colors cursor-pointer ${engineState.loopStartSec !== null || engineState.loopEndSec !== null
                    ? 'bg-[#BC0202] border-[#FF0000] text-white'
                    : 'bg-[#121212] border-neutral-800 text-neutral-300 hover:text-white'
                    }`}
                >
                  <Repeat className="w-3.5 h-3.5" />
                  <span>A-B Loop</span>
                </button>
              </div>

              {/* Volume Slider */}
              <div className="flex items-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={onToggleMute}
                  aria-label={engineState.muted ? 'Unmute' : 'Mute'}
                  className="text-neutral-400 hover:text-white transition-colors cursor-pointer shrink-0"
                >
                  {engineState.muted || engineState.volume === 0 ? (
                    <VolumeX className="w-4 h-4 text-[#FF0000]" />
                  ) : (
                    <Volume2 className="w-4 h-4" />
                  )}
                </button>
                <input
                  type="range"
                  aria-label="Volume slider"
                  min={0}
                  max={1}
                  step={0.02}
                  value={engineState.muted ? 0 : engineState.volume}
                  onChange={(e) => onVolumeChange(Number(e.target.value))}
                  className="w-full accent-white h-1 bg-neutral-700 rounded-lg cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Mobile Layout: 100% Fixed snugly on screen, zero scrolling */}
          <div className="flex md:hidden flex-col flex-1 min-h-0 justify-between py-1 w-full max-w-sm mx-auto">
            {/* Center: Sized Artwork + Beats Visualizer + Active Lyric Pill */}
            <div className="flex-1 min-h-0 flex flex-col items-center justify-center space-y-2 py-1">
              <div className="relative max-h-[26vh] max-w-[26vh] aspect-square shrink-0">
                <img
                  src={currentTrack.thumbnailUrl}
                  alt={currentTrack.cleanTitle}
                  className="w-full h-full object-cover rounded-2xl shadow-[0_12px_36px_rgba(0,0,0,0.85)] border border-neutral-800"
                />
                <div className="absolute top-2 left-2 flex items-center gap-1">
                  {engineState.spatial8dEnabled && (
                    <span className="px-1.5 py-0.5 rounded-full bg-black/85 text-[#FF0000] border border-[#FF0000]/40 text-[9px] font-mono font-bold">
                      8D
                    </span>
                  )}
                  {engineState.eqEnabled && (
                    <span className="px-1.5 py-0.5 rounded-full bg-black/85 text-white border border-neutral-700 text-[9px] font-mono font-bold">
                      EQ
                    </span>
                  )}
                </div>
              </div>

              {/* Mobile Live Beats */}
              <div className="w-full max-w-[220px] shrink-0">
                <LiveBeatsVisualizer isPlaying={engineState.isPlaying} barCount={20} />
              </div>

              {/* Mobile Active Lyric 1-Line Pill */}
              {lyricsOn && (
                <button
                  type="button"
                  onClick={() => setActiveModal('fullLyrics')}
                  className="w-full max-w-[280px] px-3 py-1.5 rounded-full bg-gradient-to-r from-[#200505] to-[#0A0A0A] border border-[#BC0202]/60 flex items-center justify-between text-xs text-white shadow-md cursor-pointer shrink-0"
                >
                  <span className="flex items-center gap-1.5 text-[10px] text-[#FF0000] font-bold uppercase shrink-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#FF0000] animate-pulse" />
                    Lyrics
                  </span>
                  <span className="truncate text-xs font-semibold px-2 text-neutral-200">
                    {lyrics[activeLyricIndex]?.text || '♪ Singing along...'}
                  </span>
                  <ChevronRight className="w-3.5 h-3.5 text-[#FF0000] shrink-0" />
                </button>
              )}
            </div>

            {/* Bottom Controls Area */}
            <div className="shrink-0 space-y-2 pt-1">
              {/* Title, Artist, Heart & More */}
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <h1 className="text-base font-display font-bold text-white truncate" title={currentTrack.cleanTitle}>
                    {currentTrack.cleanTitle}
                  </h1>
                  <p className="text-xs text-neutral-400 truncate">
                    {currentTrack.artistName} {currentTrack.albumName ? `· ${currentTrack.albumName}` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => onToggleLike(currentTrack.id)}
                    className="p-1.5 text-neutral-400 hover:text-white"
                  >
                    <Heart className={`w-5 h-5 ${isLiked ? 'fill-[#FF0000] text-[#FF0000]' : ''}`} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveModal(activeModal === 'more' ? 'none' : 'more')}
                    className="p-1.5 text-neutral-400 hover:text-white"
                  >
                    <MoreHorizontal className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Scrubber */}
              <div className="space-y-0.5">
                <input
                  type="range"
                  min={0}
                  max={engineState.duration || 100}
                  value={engineState.currentTime}
                  onChange={(e) => onSeek(Number(e.target.value))}
                  className="w-full accent-[#FF0000] h-1.5 bg-neutral-800 rounded-lg cursor-pointer"
                />
                <div className="flex justify-between text-[10px] font-mono tabular-nums text-neutral-400">
                  <span>{formatDuration(engineState.currentTime)}</span>
                  <span>{formatDuration(engineState.duration)}</span>
                </div>
              </div>

              {/* Main Transport */}
              <div className="flex items-center justify-between px-1">
                <button
                  type="button"
                  onClick={onToggleShuffle}
                  className={`p-1.5 rounded-full ${shuffleMode !== 'off' ? 'text-[#FF0000]' : 'text-neutral-400'}`}
                >
                  <Shuffle className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={onPrev}
                  className="p-1.5 text-neutral-300 hover:text-white"
                >
                  <SkipBack className="w-5 h-5 fill-current" />
                </button>

                <button
                  type="button"
                  onClick={onTogglePlay}
                  className="w-13 h-13 rounded-full bg-[#FF0000] text-white flex items-center justify-center shadow-[0_0_20px_rgba(255,0,0,0.6)] cursor-pointer"
                >
                  {engineState.isBuffering ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : engineState.isPlaying ? (
                    <Pause className="w-5 h-5 fill-current" />
                  ) : (
                    <Play className="w-5 h-5 fill-current ml-0.5" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={onNext}
                  className="p-1.5 text-neutral-300 hover:text-white"
                >
                  <SkipForward className="w-5 h-5 fill-current" />
                </button>

                <button
                  type="button"
                  onClick={onCycleRepeat}
                  className={`p-1.5 rounded-full ${repeatMode !== 'off' ? 'text-[#FF0000]' : 'text-neutral-400'}`}
                >
                  {repeatMode === 'one' ? <Repeat1 className="w-4 h-4" /> : <Repeat className="w-4 h-4" />}
                </button>
              </div>

              {/* Skip 15s & EQ Button */}
              <div className="flex items-center justify-center gap-5 py-0.5">
                <button
                  type="button"
                  onClick={() => audioEngine.skipBySeconds(-15)}
                  className="flex items-center justify-center w-8 h-8 rounded-full hover:bg-white/10 text-neutral-300"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => audioEngine.skipBySeconds(15)}
                  className="flex items-center justify-center w-8 h-8 rounded-full hover:bg-white/10 text-neutral-300"
                >
                  <RotateCw className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setActiveModal(activeModal === 'equalizer' ? 'none' : 'equalizer')}
                  className={`flex items-center justify-center w-8 h-8 rounded-full ${activeModal === 'equalizer' || engineState.eqEnabled ? 'bg-[#BC0202] text-white shadow-sm' : 'text-neutral-300'}`}
                >
                  <Sliders className="w-4 h-4" />
                </button>
              </div>

              {/* Horizontal Pill Row */}
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 justify-center">
                <button
                  type="button"
                  onClick={handleToggleLyricsOnOff}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-medium border shrink-0 ${lyricsOn ? 'bg-[#BC0202] border-[#FF0000] text-white' : 'bg-neutral-900 border-neutral-800 text-neutral-300'}`}
                >
                  Lyrics {lyricsOn ? 'On' : 'Off'}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveModal(activeModal === 'speed' ? 'none' : 'speed')}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-medium border shrink-0 ${engineState.playbackRate !== 1 ? 'bg-[#BC0202] border-[#FF0000] text-white' : 'bg-neutral-900 border-neutral-800 text-neutral-300'}`}
                >
                  {engineState.playbackRate !== 1 ? `${engineState.playbackRate}x` : '1x Speed'}
                </button>
                <button
                  type="button"
                  onClick={() => audioEngine.setSpatial8dEnabled(!engineState.spatial8dEnabled)}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-medium border shrink-0 ${engineState.spatial8dEnabled ? 'bg-[#BC0202] border-[#FF0000] text-white' : 'bg-neutral-900 border-neutral-800 text-neutral-300'}`}
                >
                  8D {engineState.spatial8dEnabled ? 'On' : 'Off'}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveModal(activeModal === 'sleep' ? 'none' : 'sleep')}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-medium border shrink-0 ${sleepTimerMinutes !== null ? 'bg-[#BC0202] border-[#FF0000] text-white' : 'bg-neutral-900 border-neutral-800 text-neutral-300'}`}
                >
                  Sleep {sleepTimerMinutes !== null ? `${sleepTimerMinutes}m` : ''}
                </button>
              </div>
            </div>
          </div>

          {/* Side Window Drawer (Slides in from the right edge directly on the Now Playing page) */}
          {activeModal !== 'none' && (
            <div
              role="dialog"
              aria-modal="true"
              className="fixed inset-0 z-50 bg-black/65 backdrop-blur-md flex justify-end transition-opacity duration-300"
              onClick={() => setActiveModal('none')}
            >
              <aside
                className="bg-[#0A0A0A]/85 backdrop-blur-3xl border-l border-neutral-800/80 w-full max-w-md sm:max-w-lg h-full flex flex-col shadow-[-25px_0_60px_rgba(0,0,0,0.95)] ring-1 ring-white/10 p-5 sm:p-6 overflow-y-auto mm-side-window relative select-none z-10"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Side Window Header */}
                <div className="flex items-center justify-between border-b border-neutral-800/80 pb-4 shrink-0">
                  <div className="flex items-center gap-2.5">
                    {activeModal === 'equalizer' && (
                      <>
                        <div className="w-8 h-8 rounded-lg bg-[#BC0202]/20 text-[#FF0000] border border-[#FF0000]/30 flex items-center justify-center shrink-0">
                          <Sliders className="w-4 h-4" />
                        </div>
                        <div>
                          <h2 className="text-base font-display font-bold text-white">Equalizer &amp; Sound Engine</h2>
                          <p className="text-[10px] text-neutral-400 font-normal">5-Band Studio EQ &amp; Presets</p>
                        </div>
                      </>
                    )}
                    {activeModal === 'queue' && (
                      <>
                        <div className="w-8 h-8 rounded-lg bg-[#BC0202]/20 text-[#FF0000] border border-[#FF0000]/30 flex items-center justify-center shrink-0">
                          <ListMusic className="w-4 h-4" />
                        </div>
                        <div>
                          <h2 className="text-base font-display font-bold text-white">Up Next Queue</h2>
                          <p className="text-[10px] text-neutral-400 font-normal">{queue.length} track{queue.length === 1 ? '' : 's'} queued</p>
                        </div>
                      </>
                    )}
                    {activeModal === 'speed' && (
                      <>
                        <div className="w-8 h-8 rounded-lg bg-[#BC0202]/20 text-[#FF0000] border border-[#FF0000]/30 flex items-center justify-center shrink-0">
                          <Gauge className="w-4 h-4" />
                        </div>
                        <div>
                          <h2 className="text-base font-display font-bold text-white">Playback Speed</h2>
                          <p className="text-[10px] text-neutral-400 font-normal">Current: {engineState.playbackRate}x</p>
                        </div>
                      </>
                    )}
                    {activeModal === 'sleep' && (
                      <>
                        <div className="w-8 h-8 rounded-lg bg-[#BC0202]/20 text-[#FF0000] border border-[#FF0000]/30 flex items-center justify-center shrink-0">
                          <Moon className="w-4 h-4" />
                        </div>
                        <div>
                          <h2 className="text-base font-display font-bold text-white">Sleep Timer</h2>
                          <p className="text-[10px] text-neutral-400 font-normal">
                            {sleepTimerMinutes ? `Active: ${sleepTimerMinutes}m` : 'Turn off playback automatically'}
                          </p>
                        </div>
                      </>
                    )}
                    {activeModal === 'loop' && (
                      <>
                        <div className="w-8 h-8 rounded-lg bg-[#BC0202]/20 text-[#FF0000] border border-[#FF0000]/30 flex items-center justify-center shrink-0">
                          <Repeat className="w-4 h-4" />
                        </div>
                        <div>
                          <h2 className="text-base font-display font-bold text-white">A-B Chorus Loop</h2>
                          <p className="text-[10px] text-neutral-400 font-normal">Loop hook or chorus portion</p>
                        </div>
                      </>
                    )}
                    {activeModal === 'more' && (
                      <>
                        <div className="w-8 h-8 rounded-lg bg-[#BC0202]/20 text-[#FF0000] border border-[#FF0000]/30 flex items-center justify-center shrink-0">
                          <MoreHorizontal className="w-4 h-4" />
                        </div>
                        <div>
                          <h2 className="text-base font-display font-bold text-white">Song Options</h2>
                          <p className="text-[10px] text-neutral-400 font-normal">Details, artist &amp; download</p>
                        </div>
                      </>
                    )}
                    {activeModal === 'fullLyrics' && (
                      <>
                        <div className="w-8 h-8 rounded-lg bg-[#BC0202]/20 text-[#FF0000] border border-[#FF0000]/30 flex items-center justify-center shrink-0">
                          <Mic2 className="w-4 h-4" />
                        </div>
                        <div>
                          <h2 className="text-base font-display font-bold text-white">Full Synchronized Lyrics</h2>
                          <p className="text-[10px] text-neutral-400 font-normal">{currentTrack.cleanTitle} · {currentTrack.artistName}</p>
                        </div>
                      </>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {activeModal === 'queue' && queue.length > 1 && (
                      <button
                        type="button"
                        onClick={onClearQueue}
                        className="px-3 py-1 rounded-lg bg-neutral-900 hover:bg-[#830000]/40 text-xs text-neutral-300 hover:text-white border border-neutral-800 transition-colors cursor-pointer"
                      >
                        Clear
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setActiveModal('none')}
                      className="p-1.5 rounded-lg bg-neutral-900 hover:bg-[#830000]/30 text-neutral-400 hover:text-white border border-neutral-800 hover:border-neutral-700 transition-colors cursor-pointer"
                      aria-label="Close side window"
                      title="Close (Esc)"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* 1. EQUALIZER CONTENT */}
                {activeModal === 'equalizer' && (
                  <div className="space-y-4 py-1">
                    {/* Reset Button & Master Switch */}
                    <div className="flex flex-wrap items-center justify-between gap-3 bg-black/40 backdrop-blur-md p-3.5 rounded-xl border border-neutral-800/80">
                      <div>
                        <h3 className="text-sm font-display font-bold text-white">
                          Master Control &amp; 0dB Reset
                        </h3>
                        <p className="text-xs text-neutral-400">
                          55Hz Sub-Woofer · 85Hz Bass Shelf · Compressor
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => audioEngine.resetEqualizer()}
                          title="Reset to 0dB Flat"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-900 hover:bg-[#830000]/50 text-white text-xs font-semibold border border-neutral-700 hover:border-[#FF0000] transition-colors cursor-pointer whitespace-nowrap shrink-0"
                        >
                          <RotateCcw className="w-3.5 h-3.5 text-[#FF0000]" />
                          <span>Reset 0dB</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => audioEngine.setEqEnabled(!engineState.eqEnabled)}
                          className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${engineState.eqEnabled
                            ? 'bg-[#FF0000] text-white shadow-[0_0_12px_rgba(255,0,0,0.5)]'
                            : 'bg-neutral-900 text-neutral-400 border border-neutral-800 hover:text-white'
                            }`}
                        >
                          <Sliders className="w-3.5 h-3.5 shrink-0" />
                          <span>{engineState.eqEnabled ? 'EQ ON' : 'EQ OFF'}</span>
                        </button>
                      </div>
                    </div>

                    {/* Status Banner */}
                    <div
                      className={`p-3 rounded-lg border text-xs flex items-center justify-between gap-3 ${engineState.eqEnabled
                        ? 'bg-[#830000]/20 border-[#FF0000]/50 text-white'
                        : 'bg-neutral-900/80 border-neutral-800 text-neutral-400'
                        }`}
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-2 h-2 rounded-full shrink-0 ${engineState.eqEnabled ? 'bg-[#FF0000] animate-pulse' : 'bg-neutral-600'
                            }`}
                        />
                        <span>
                          {engineState.eqEnabled
                            ? 'Equalizer is ON: Custom 5-band EQ and presets are active.'
                            : 'Equalizer is OFF: 100% Original Audio (0dB Flat Bypass).'}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => audioEngine.setEqEnabled(!engineState.eqEnabled)}
                        className={`px-3 py-1 rounded text-xs font-bold transition-colors cursor-pointer shrink-0 ${engineState.eqEnabled
                          ? 'bg-[#BC0202] hover:bg-[#FF0000] text-white'
                          : 'bg-neutral-800 hover:bg-neutral-700 text-white'
                          }`}
                      >
                        {engineState.eqEnabled ? 'TURN OFF' : 'TURN ON'}
                      </button>
                    </div>

                    {/* Vibe Modes & Mega Bass */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-mono text-neutral-400 uppercase tracking-wider">
                          Spotify Vibe Modes
                        </p>
                        <button
                          type="button"
                          onClick={() => audioEngine.setMegaBassEnabled(!engineState.megaBassEnabled)}
                          className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${engineState.megaBassEnabled
                            ? 'bg-[#BC0202] border-[#FF0000] text-white shadow'
                            : 'bg-black border-neutral-800 text-neutral-400 hover:text-white'
                            }`}
                        >
                          {engineState.megaBassEnabled ? 'X-BASS 55Hz: ACTIVE' : 'X-BASS 55Hz: OFF'}
                        </button>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {(Object.keys(VIBE_MODES) as AudioVibeMode[]).map((modeKey) => {
                          const mode = VIBE_MODES[modeKey];
                          const active = engineState.vibeMode === modeKey;
                          return (
                            <button
                              key={modeKey}
                              type="button"
                              onClick={() => audioEngine.setVibeMode(modeKey)}
                              className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${active
                                ? 'bg-gradient-to-br from-[#830000]/55 to-black border-[#FF0000] text-white'
                                : 'bg-black border-neutral-800/90 text-neutral-300 hover:border-neutral-700'
                                }`}
                            >
                              <p className="text-xs font-semibold text-white truncate">{mode.label}</p>
                              <p className="text-[10px] text-neutral-400 truncate mt-0.5">{mode.subtitle}</p>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Presets */}
                    <div className="space-y-2">
                      <p className="text-xs font-mono text-neutral-400 uppercase tracking-wider">
                        Sound Presets
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {(Object.keys(EQ_PRESETS) as Exclude<EqPresetId, 'custom'>[]).map((presetKey) => {
                          const preset = EQ_PRESETS[presetKey];
                          const active = engineState.eqPreset === presetKey;
                          return (
                            <button
                              key={presetKey}
                              type="button"
                              onClick={() => audioEngine.setEqPreset(presetKey)}
                              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${active
                                ? 'bg-[#830000]/50 border-[#FF0000] text-white font-semibold'
                                : 'bg-black border-neutral-800 text-neutral-300 hover:border-neutral-700'
                                }`}
                            >
                              {preset.name}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* 5-Band Sliders */}
                    <div className="grid grid-cols-5 gap-3 bg-black p-4 rounded-xl border border-neutral-800">
                      {engineState.eqBands.map((band, idx) => (
                        <div key={band.frequency} className="flex flex-col items-center gap-2.5">
                          <span className="text-xs font-mono tabular-nums text-[#FF0000] font-semibold">
                            {band.gainDb > 0 ? `+${band.gainDb}` : band.gainDb}dB
                          </span>
                          <div className="h-28 flex items-center justify-center">
                            <input
                              type="range"
                              aria-label={`${band.label} Equalizer Band`}
                              min={-12}
                              max={12}
                              step={1}
                              disabled={!engineState.eqEnabled}
                              value={band.gainDb}
                              onChange={(e) => audioEngine.setEqBandGain(idx, Number(e.target.value))}
                              className="w-24 -rotate-90 accent-[#FF0000] bg-neutral-800 h-1.5 rounded-lg cursor-pointer disabled:opacity-40"
                            />
                          </div>
                          <div className="text-center">
                            <p className="text-xs font-mono font-semibold text-white">{band.label}</p>
                            <p className="text-[10px] text-neutral-500">{band.subLabel}</p>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Sub-Bass Punch Slider */}
                    <div className="bg-black p-4 rounded-xl border border-neutral-800 space-y-2.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-white">Sub-Bass Punch Boost (85Hz)</span>
                        <span className="font-mono tabular-nums text-[#FF0000] font-semibold">
                          +{engineState.bassBoostDb} dB
                        </span>
                      </div>
                      <input
                        type="range"
                        aria-label="Sub-Bass Boost"
                        min={0}
                        max={12}
                        step={1}
                        disabled={!engineState.eqEnabled}
                        value={engineState.bassBoostDb}
                        onChange={(e) => audioEngine.setBassBoostDb(Number(e.target.value))}
                        className="w-full accent-[#FF0000] h-1.5 bg-neutral-800 rounded-lg cursor-pointer disabled:opacity-40"
                      />
                    </div>
                  </div>
                )}

                {/* 2. QUEUE CONTENT */}
                {activeModal === 'queue' && (
                  <div className="space-y-3">
                    {/* Smart Shuffle Banner & Priority Action */}
                    <div className="p-3 rounded-xl bg-gradient-to-r from-[#220707]/80 to-[#120808]/80 backdrop-blur-md border border-[#830000]/40 flex items-center justify-between gap-3 shadow-sm">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={`p-2 rounded-lg shrink-0 ${shuffleMode === 'smart'
                            ? 'bg-[#FF0000] text-white shadow-[0_0_10px_rgba(255,0,0,0.4)]'
                            : 'bg-neutral-800 text-neutral-400'
                            }`}
                        >
                          <Sparkles className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-white flex items-center gap-1.5">
                            Smart Shuffle
                            {shuffleMode === 'smart' && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] bg-[#FF0000]/25 text-[#ff8080] border border-[#FF0000]/40 font-mono uppercase tracking-wide">
                                Active
                              </span>
                            )}
                          </p>
                          <p className="text-[11px] text-neutral-400 truncate">
                            Prioritizes favorites & most played tracks
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {onPrioritizeSmartQueue && (
                          <button
                            type="button"
                            onClick={onPrioritizeSmartQueue}
                            className="px-2.5 py-1 text-xs font-medium rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 hover:text-white border border-neutral-700/60 transition-colors cursor-pointer"
                            title="Re-order upcoming tracks in queue by Smart Shuffle weights"
                          >
                            Prioritize
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={onToggleShuffle}
                          className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-colors cursor-pointer ${shuffleMode === 'smart'
                            ? 'bg-[#FF0000] text-white hover:bg-[#d80000]'
                            : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300'
                            }`}
                        >
                          {shuffleMode === 'smart' ? 'Smart On' : shuffleMode === 'standard' ? 'Standard' : 'Turn On'}
                        </button>
                      </div>
                    </div>

                    <div className="divide-y divide-neutral-800/70 max-h-96 overflow-y-auto pr-1">
                      {queue.map((item, idx) => {
                        const isCurrent = idx === currentIndex;
                        return (
                          <div
                            key={`${item.id}-${idx}`}
                            className={`py-2.5 px-3 rounded-lg flex items-center justify-between gap-3 transition-colors ${isCurrent ? 'bg-[#830000]/25 border border-[#BC0202]/40' : 'hover:bg-neutral-900/70'
                              }`}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <span className="w-5 text-xs font-mono tabular-nums text-neutral-500 text-right">
                                {idx + 1}
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  onPlayQueueIndex(idx);
                                  setActiveModal('none');
                                }}
                                className="text-left min-w-0 cursor-pointer"
                              >
                                <p className={`text-sm font-medium truncate ${isCurrent ? 'text-[#FF0000]' : 'text-white'}`}>
                                  {item.cleanTitle}
                                </p>
                                <p className="text-xs text-neutral-400 truncate">
                                  {item.artistName} · {item.language}
                                </p>
                              </button>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              <span className="text-xs font-mono tabular-nums text-neutral-400 mr-1">
                                {formatDuration(item.duration)}
                              </span>
                              <button
                                type="button"
                                disabled={idx === 0}
                                onClick={() => onMoveQueueItem(idx, 'up')}
                                aria-label="Move track up"
                                className="p-1.5 rounded bg-neutral-900 text-neutral-400 hover:text-white disabled:opacity-30 cursor-pointer"
                              >
                                <ArrowUp className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                disabled={idx === queue.length - 1}
                                onClick={() => onMoveQueueItem(idx, 'down')}
                                aria-label="Move track down"
                                className="p-1.5 rounded bg-neutral-900 text-neutral-400 hover:text-white disabled:opacity-30 cursor-pointer"
                              >
                                <ArrowDown className="w-3.5 h-3.5" />
                              </button>
                              {!isCurrent && (
                                <button
                                  type="button"
                                  onClick={() => onRemoveFromQueue(idx)}
                                  aria-label="Remove from queue"
                                  className="p-1.5 rounded bg-neutral-900 text-neutral-400 hover:text-[#FF0000] cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}


                {/* 4. SPEED CONTENT */}
                {activeModal === 'speed' && (
                  <div className="space-y-3 py-2">
                    <p className="text-xs text-neutral-400">Select playback speed:</p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      {[0.75, 1, 1.25, 1.5, 2].map((rate) => (
                        <button
                          key={rate}
                          type="button"
                          onClick={() => {
                            onSetPlaybackRate(rate);
                            setActiveModal('none');
                          }}
                          className={`p-3 rounded-xl border text-center font-mono font-semibold transition-all cursor-pointer ${engineState.playbackRate === rate
                            ? 'bg-[#BC0202] border-[#FF0000] text-white shadow'
                            : 'bg-black border-neutral-800 text-neutral-300 hover:text-white hover:border-neutral-700'
                            }`}
                        >
                          <span className="text-base">{rate}x</span>
                          <span className="block text-[10px] text-neutral-400 font-sans mt-0.5">
                            {rate === 1 ? 'Normal' : rate < 1 ? 'Slowed' : 'Fast'}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* 5. SLEEP TIMER CONTENT */}
                {activeModal === 'sleep' && (
                  <div className="space-y-3 py-2">
                    <p className="text-xs text-neutral-400">Set automatic stop playback timer:</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                      {[null, 5, 15, 30, 45, 60].map((mins) => (
                        <button
                          key={String(mins)}
                          type="button"
                          onClick={() => {
                            onSetSleepTimer(mins);
                            setActiveModal('none');
                          }}
                          className={`p-3 rounded-xl border text-center font-mono font-semibold transition-all cursor-pointer ${sleepTimerMinutes === mins
                            ? 'bg-[#BC0202] border-[#FF0000] text-white shadow'
                            : 'bg-black border-neutral-800 text-neutral-300 hover:text-white hover:border-neutral-700'
                            }`}
                        >
                          <span className="text-base">{mins === null ? 'Off' : `${mins}m`}</span>
                          <span className="block text-[10px] text-neutral-400 font-sans mt-0.5">
                            {mins === null ? 'Do not stop' : `${mins} minutes`}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* 6. A-B LOOP CONTENT */}
                {activeModal === 'loop' && (
                  <div className="space-y-4 py-2">
                    <p className="text-xs text-neutral-400">
                      Loop a specific chorus or verse section seamlessly:
                    </p>
                    <div className="flex items-center justify-between p-3 rounded-xl bg-black border border-neutral-800 font-mono text-xs">
                      <span>Point A: {engineState.loopStartSec !== null ? formatDuration(engineState.loopStartSec) : 'Not set'}</span>
                      <span>→</span>
                      <span>Point B: {engineState.loopEndSec !== null ? formatDuration(engineState.loopEndSec) : 'Not set'}</span>
                    </div>
                    <div className="flex flex-wrap gap-2.5">
                      <button
                        type="button"
                        onClick={() => audioEngine.setLoopPointA()}
                        className="flex-1 py-2 rounded-xl bg-neutral-900 hover:bg-[#BC0202] text-white text-xs font-semibold border border-neutral-800 transition-colors cursor-pointer"
                      >
                        Set Point A (Current Time)
                      </button>
                      <button
                        type="button"
                        onClick={() => audioEngine.setLoopPointB()}
                        className="flex-1 py-2 rounded-xl bg-neutral-900 hover:bg-[#FF0000] text-white text-xs font-semibold border border-neutral-800 transition-colors cursor-pointer"
                      >
                        Set Point B (Current Time)
                      </button>
                      {(engineState.loopStartSec !== null || engineState.loopEndSec !== null) && (
                        <button
                          type="button"
                          onClick={() => audioEngine.clearAbLoop()}
                          className="px-4 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-300 text-xs font-medium border border-neutral-800 transition-colors cursor-pointer"
                        >
                          Clear Loop
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* 7. MORE OPTIONS CONTENT */}
                {activeModal === 'more' && (
                  <div className="space-y-2 py-2">
                    <button
                      type="button"
                      onClick={() => {
                        setExpanded(false);
                        setActiveModal('none');
                        onNavigate(`/artist/${currentTrack.artistId}`);
                      }}
                      className="w-full p-3 rounded-xl bg-black hover:bg-neutral-900 text-white text-left text-xs font-medium border border-neutral-800 transition-colors flex items-center justify-between cursor-pointer"
                    >
                      <span>View Artist: {currentTrack.artistName}</span>
                      <span className="text-neutral-500">→</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setExpanded(false);
                        setActiveModal('none');
                        onNavigate(`/album/${currentTrack.albumId}`);
                      }}
                      className="w-full p-3 rounded-xl bg-black hover:bg-neutral-900 text-white text-left text-xs font-medium border border-neutral-800 transition-colors flex items-center justify-between cursor-pointer"
                    >
                      <span>View Album: {currentTrack.albumName}</span>
                      <span className="text-neutral-500">→</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => audioEngine.setSpatial8dEnabled(!engineState.spatial8dEnabled)}
                      className={`w-full p-3 rounded-xl text-left text-xs font-medium border transition-colors flex items-center justify-between cursor-pointer ${engineState.spatial8dEnabled
                        ? 'bg-[#830000]/30 border-[#FF0000] text-white'
                        : 'bg-black hover:bg-neutral-900 border-neutral-800 text-white'
                        }`}
                    >
                      <span>8D Spatial Surround Sound</span>
                      <span className="font-mono text-xs text-[#FF0000]">
                        {engineState.spatial8dEnabled ? 'ACTIVE' : 'OFF'}
                      </span>
                    </button>
                    <a
                      href={buildTrackDownloadUrl(currentTrack)}
                      download
                      className="w-full p-3 rounded-xl bg-black hover:bg-neutral-900 text-white text-left text-xs font-medium border border-neutral-800 transition-colors flex items-center justify-between cursor-pointer block"
                    >
                      <span className="flex items-center gap-2">
                        <Download className="w-3.5 h-3.5 text-[#FF0000]" />
                        <span>Download Track</span>
                      </span>
                      <span className="text-neutral-500">MP3</span>
                    </a>
                  </div>
                )}

                {/* Full Lyrics Modal View */}
                {activeModal === 'fullLyrics' && (
                  <div className="space-y-3 py-2 flex flex-col flex-1 min-h-0">
                    <div className="flex items-center justify-between text-xs text-neutral-400 pb-2 border-b border-neutral-800/80">
                      <span>Tap any line to jump audio</span>
                      <span className="text-[11px] font-mono text-[#FF0000]">{lyrics.length} lines</span>
                    </div>

                    <div
                      ref={lyricsListRef}
                      className="space-y-1.5 flex-1 overflow-y-auto px-1 py-2 select-none scroll-smooth max-h-[68vh]"
                    >
                      {lyrics.map((line, i) => {
                        const isActiveLine = i === activeLyricIndex;
                        return (
                          <button
                            key={`${line.timeSec}-${i}`}
                            ref={isActiveLine ? activeLineRef : null}
                            type="button"
                            onClick={() => onSeek(line.timeSec)}
                            className={`w-full text-left px-3.5 py-3 rounded-xl transition-all duration-300 flex items-center justify-between gap-3 cursor-pointer ${isActiveLine
                              ? 'bg-gradient-to-r from-[#BC0202]/40 via-[#830000]/25 to-transparent border-l-4 border-l-[#FF0000] border-t border-b border-r border-[#FF0000]/30 text-white shadow-[0_4px_22px_rgba(255,0,0,0.3)] font-bold text-sm sm:text-base'
                              : 'text-neutral-400 hover:text-white hover:bg-white/5 border border-transparent text-xs sm:text-sm'
                              }`}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              {isActiveLine ? (
                                <span className="w-2 h-2 rounded-full bg-[#FF0000] shadow-[0_0_10px_#FF0000] shrink-0 animate-pulse" />
                              ) : (
                                <span className="w-1.5 h-1.5 rounded-full bg-neutral-700/60 shrink-0" />
                              )}
                              <span className="leading-relaxed">{line.text}</span>
                            </div>
                            <span className="text-[10px] font-mono text-neutral-500 tabular-nums shrink-0 ml-2">
                              {formatDuration(line.timeSec)}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </aside>
            </div>
          )}
        </div>
      )}

      {/* Floating Live Lyrics Bar docked right above Mini-Player when Lyrics ON */}
      {lyricsOn && !expanded && !queueOpen && activeLyricLine && (
        <div
          aria-live="polite"
          className="bg-gradient-to-r from-black via-[#120404] to-black border-t border-[#830000]/60 px-4 sm:px-6 py-2 flex items-center justify-between gap-4 z-40"
        >
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#BC0202] text-white text-[10px] font-mono font-bold uppercase tracking-wider shrink-0">
              <Mic2 className="w-3 h-3" />
              <span>LIVE LYRICS</span>
            </span>
            <p className="text-xs sm:text-sm font-display font-semibold text-white truncate">
              {activeLyricLine.text}
            </p>
            {nextLyricLine && (
              <span className="hidden lg:inline text-xs text-neutral-400 truncate">
                · Next: {nextLyricLine.text}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                setExpanded(true);
              }}
              className="text-[11px] font-mono text-neutral-300 hover:text-[#FF0000] cursor-pointer"
            >
              Full Lyrics
            </button>
            <button
              type="button"
              onClick={() => setLyricsOn(false)}
              aria-label="Turn Lyrics Off"
              className="p-1 rounded hover:bg-neutral-900 text-neutral-400 hover:text-white cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Persistent Mini-Player Bar at Root Bottom */}
      <footer
        aria-label="Persistent music player"
        className="h-20 bg-black border-t border-neutral-800 px-3 sm:px-6 flex flex-col justify-center shrink-0 z-40 relative"
      >
        <div
          className="absolute top-0 left-0 right-0 h-0.5 bg-neutral-900 overflow-hidden pointer-events-none"
          aria-hidden="true"
        >
          <div
            className="h-full bg-[#FF0000] transition-transform duration-150 origin-left"
            style={{ transform: `scaleX(${progressPercent / 100})` }}
          />
        </div>

        <div className="flex items-center justify-between gap-2 sm:gap-4 w-full h-full">
          {/* Left: Floating Track Thumbnail + Track Info + Live Beats + Like */}
          <div className="flex items-center gap-2 sm:gap-2.5 min-w-0 max-w-[45%] sm:max-w-[28%] lg:max-w-xs shrink-0">
            <button
              type="button"
              onClick={() => setExpanded(true)}
              className="group relative shrink-0 cursor-pointer"
              aria-label="Expand player"
            >
              <ArtworkTile
                title={currentTrack.cleanTitle}
                thumbnailUrl={currentTrack.thumbnailUrl}
                size="sm"
                isPlaying={engineState.isPlaying}
                className="w-12 h-12"
              />
              <span className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity rounded-lg">
                <ChevronUp className="w-4 h-4 text-white" />
              </span>
            </button>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    if (typeof window !== 'undefined' && window.innerWidth < 640) {
                      setExpanded(true);
                    } else {
                      onNavigate(`/track/${currentTrack.id}`);
                    }
                  }}
                  className="text-sm font-medium text-white hover:text-[#FF0000] truncate block text-left transition-colors cursor-pointer"
                >
                  {currentTrack.cleanTitle}
                </button>
                {engineState.isPlaying && (
                  <LiveBeatsVisualizer isPlaying={engineState.isPlaying} compact />
                )}
              </div>
              <div className="flex items-center gap-1.5 text-xs text-neutral-400 truncate">
                <button
                  type="button"
                  onClick={() => {
                    if (typeof window !== 'undefined' && window.innerWidth < 640) {
                      setExpanded(true);
                    } else {
                      onNavigate(`/artist/${currentTrack.artistId}`);
                    }
                  }}
                  className="hover:text-white truncate cursor-pointer"
                >
                  {currentTrack.artistName}
                </button>
                <span aria-hidden="true">·</span>
                <span className="text-neutral-500 truncate">{currentTrack.language}</span>
                <span className="text-[9px] font-mono text-[#ff7272] bg-[#FF0000]/10 px-1.5 py-0.2 rounded border border-[#FF0000]/25 shrink-0 hidden sm:inline-block">
                  {currentTrack.sourceApi || (currentTrack.providerId?.startsWith('svn-') ? 'JioSaavn' : currentTrack.providerId?.startsWith('itu-') ? 'iTunes' : 'Nazriya API')}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onToggleLike(currentTrack.id)}
              aria-label={isLiked ? 'Unlike track' : 'Like track'}
              className={`p-1.5 rounded-lg transition-colors shrink-0 cursor-pointer ${isLiked ? 'text-[#FF0000]' : 'text-neutral-400 hover:text-white'
                }`}
            >
              <Heart className={`w-4 h-4 ${isLiked ? 'fill-[#FF0000]' : ''}`} />
            </button>
          </div>

          {/* Center: Transport & Scrubber */}
          <div className="flex flex-col items-end sm:items-center justify-center gap-1 flex-1 min-w-0 max-w-lg mx-auto px-1 sm:px-2">
            <div className="flex items-center gap-2 sm:gap-3.5">
              <button
                type="button"
                onClick={onToggleShuffle}
                aria-label={
                  shuffleMode === 'smart'
                    ? 'Smart Shuffle (Favorites & Top Plays)'
                    : shuffleMode === 'standard'
                      ? 'Standard Shuffle'
                      : 'Toggle shuffle'
                }
                title={
                  shuffleMode === 'smart'
                    ? 'Smart Shuffle: Boosts favorites & top plays'
                    : shuffleMode === 'standard'
                      ? 'Standard Shuffle'
                      : 'Shuffle Off'
                }
                className={`relative hidden md:inline-flex p-1.5 rounded transition-colors cursor-pointer ${shuffle ? 'text-[#FF0000]' : 'text-neutral-400 hover:text-white'
                  }`}
              >
                <Shuffle className="w-4 h-4" />
                {shuffleMode === 'smart' && (
                  <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-[#FF0000] ring-1 ring-black animate-pulse" />
                )}
              </button>

              <button
                type="button"
                onClick={onPrev}
                aria-label="Previous"
                className="p-1.5 text-neutral-300 hover:text-white transition-colors cursor-pointer"
              >
                <SkipBack className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={onTogglePlay}
                aria-label={engineState.isPlaying ? 'Pause' : 'Play'}
                className="w-9 h-9 rounded-full bg-[#FF0000] hover:bg-[#BC0202] text-white flex items-center justify-center transition-colors shadow cursor-pointer shrink-0"
              >
                {engineState.isBuffering ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : engineState.isPlaying ? (
                  <Pause className="w-4 h-4 fill-current" />
                ) : (
                  <Play className="w-4 h-4 fill-current ml-0.5" />
                )}
              </button>

              <button
                type="button"
                onClick={onNext}
                aria-label="Next"
                className="p-1.5 text-neutral-300 hover:text-white transition-colors cursor-pointer"
              >
                <SkipForward className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={onCycleRepeat}
                aria-label="Repeat mode"
                className={`hidden md:inline-flex p-1.5 rounded transition-colors cursor-pointer ${repeatMode !== 'off' ? 'text-[#FF0000]' : 'text-neutral-400 hover:text-white'
                  }`}
              >
                {repeatMode === 'one' ? (
                  <Repeat1 className="w-4 h-4" />
                ) : (
                  <Repeat className="w-4 h-4" />
                )}
              </button>
            </div>

            <div className="hidden sm:flex items-center gap-2.5 w-full max-w-md min-w-0">
              <span className="text-[11px] font-mono tabular-nums text-neutral-400 w-9 text-right shrink-0">
                {formatDuration(engineState.currentTime)}
              </span>
              <input
                type="range"
                aria-label="Seek timeline"
                min={0}
                max={engineState.duration || 100}
                value={engineState.currentTime}
                onChange={(e) => onSeek(Number(e.target.value))}
                className="flex-1 accent-[#FF0000] h-1 bg-neutral-800 rounded-lg cursor-pointer min-w-0"
              />
              <span className="text-[11px] font-mono tabular-nums text-neutral-400 w-9 shrink-0">
                {formatDuration(engineState.duration)}
              </span>
            </div>
          </div>

          {/* Right: Lyrics ON/OFF, Slowed+Reverb, 8D Audio, Bass, Equalizer, Queue, Volume, Expand */}
          <div className="hidden sm:flex items-center justify-end gap-1 sm:gap-1.5 shrink-0 min-w-0 flex-nowrap">
            <button
              type="button"
              onClick={handleToggleLyricsOnOff}
              aria-label="Toggle Live Lyrics On or Off"
              title="Toggle Live Lyrics ON / OFF (Shortcut: L)"
              className={`inline-flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-md text-[10px] font-mono font-bold border transition-colors cursor-pointer whitespace-nowrap shrink-0 ${lyricsOn
                ? 'bg-[#BC0202] border-[#FF0000] text-white'
                : 'bg-black border-neutral-800 text-neutral-400 hover:text-white'
                }`}
            >
              <Mic2 className="w-3 h-3 shrink-0" />
              <span className="hidden xl:inline">{lyricsOn ? 'LYRICS ON' : 'LYRICS OFF'}</span>
              <span className="xl:hidden">{lyricsOn ? 'ON' : 'LYRICS'}</span>
            </button>

            <button
              type="button"
              onClick={() =>
                audioEngine.setVibeMode(
                  engineState.vibeMode === 'slowed_reverb' ? 'studio' : 'slowed_reverb'
                )
              }
              aria-label="Toggle Slowed + Reverb Mode"
              title="Toggle Slowed + Reverb (0.86x Dreamy Pitch)"
              className={`hidden md:inline-flex px-2 py-1 rounded-md text-[10px] font-mono font-bold border transition-colors cursor-pointer whitespace-nowrap shrink-0 ${engineState.vibeMode === 'slowed_reverb'
                ? 'bg-[#830000]/80 border-[#FF0000] text-white'
                : 'bg-black border-neutral-800 text-neutral-400 hover:text-white'
                }`}
            >
              SLOWED
            </button>

            <button
              type="button"
              onClick={() => audioEngine.setSpatial8dEnabled(!engineState.spatial8dEnabled)}
              aria-label="Toggle 8D Spatial Surround Audio"
              title="Toggle 8D Spatial Surround Audio"
              className={`px-1.5 sm:px-2 py-1 rounded-md text-[10px] font-mono font-bold border transition-colors cursor-pointer whitespace-nowrap shrink-0 ${engineState.spatial8dEnabled
                ? 'bg-[#830000]/70 border-[#FF0000] text-white'
                : 'bg-black border-neutral-800 text-neutral-400 hover:text-white'
                }`}
            >
              8D
            </button>

            <button
              type="button"
              onClick={() => audioEngine.setMegaBassEnabled(!engineState.megaBassEnabled)}
              aria-label="Toggle X-Bass 55Hz Sub-Woofer"
              title="Toggle X-Bass 55Hz Sub-Woofer Boost"
              className={`px-1.5 sm:px-2 py-1 rounded-md text-[10px] font-mono font-bold border transition-colors cursor-pointer whitespace-nowrap shrink-0 ${engineState.megaBassEnabled
                ? 'bg-[#BC0202] border-[#FF0000] text-white'
                : 'bg-black border-neutral-800 text-neutral-400 hover:text-white'
                }`}
            >
              BASS
            </button>

            {/* Explicit Master Equalizer ON / OFF Toggle Button */}
            <div className="inline-flex items-center rounded-md border border-neutral-800 bg-black overflow-hidden shrink-0">
              <button
                type="button"
                onClick={() => audioEngine.setEqEnabled(!engineState.eqEnabled)}
                aria-label={
                  engineState.eqEnabled
                    ? 'Equalizer is ON (Tap to turn OFF)'
                    : 'Equalizer is OFF (Tap to turn ON)'
                }
                title={
                  engineState.eqEnabled
                    ? 'Equalizer: ON (Tap to turn OFF - 0dB flat original audio)'
                    : 'Equalizer: OFF (Tap to turn ON)'
                }
                className={`inline-flex items-center gap-1 px-2 sm:px-2.5 py-1 text-[10px] font-mono font-bold transition-colors cursor-pointer whitespace-nowrap ${engineState.eqEnabled
                  ? 'bg-[#BC0202] text-white shadow-[0_0_8px_rgba(255,0,0,0.4)]'
                  : 'bg-black text-neutral-400 hover:text-white'
                  }`}
              >
                <Sliders className="w-3 h-3 shrink-0" />
                <span>{engineState.eqEnabled ? 'EQ ON' : 'EQ OFF'}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveModal('equalizer');
                  setExpanded(true);
                }}
                aria-label="Open Equalizer Tuning Panel"
                title="Open Equalizer Tuning Panel & Presets"
                className="px-1.5 py-1 text-neutral-400 hover:text-white hover:bg-neutral-900 border-l border-neutral-800 cursor-pointer hidden sm:inline-flex"
              >
                <Settings2 className="w-3 h-3 shrink-0" />
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                setActiveModal((prev) => (prev === 'queue' ? 'none' : 'queue'));
                setQueueOpen((prev) => !prev);
              }}
              aria-label="Open queue"
              className={`p-1.5 sm:p-2 rounded-lg transition-colors cursor-pointer shrink-0 ${queueOpen ? 'text-[#FF0000] bg-[#830000]/25' : 'text-neutral-400 hover:text-white'
                }`}
            >
              <ListMusic className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={onToggleMute}
              aria-label={engineState.muted ? 'Unmute' : 'Mute'}
              className="p-1.5 sm:p-2 text-neutral-400 hover:text-white transition-colors cursor-pointer shrink-0"
            >
              {engineState.muted || engineState.volume === 0 ? (
                <VolumeX className="w-4 h-4 text-[#FF0000]" />
              ) : (
                <Volume2 className="w-4 h-4" />
              )}
            </button>

            <input
              type="range"
              aria-label="Volume"
              min={0}
              max={1}
              step={0.02}
              value={engineState.muted ? 0 : engineState.volume}
              onChange={(e) => onVolumeChange(Number(e.target.value))}
              className="w-14 lg:w-16 accent-[#FF0000] h-1 bg-neutral-800 rounded-lg cursor-pointer hidden xl:block shrink-0"
            />

            <button
              type="button"
              onClick={() => setExpanded(true)}
              aria-label="Open full screen player"
              className="p-1.5 sm:p-2 text-neutral-400 hover:text-white transition-colors cursor-pointer shrink-0"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </footer>
    </>
  );
};
