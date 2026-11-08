import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  BarChart2,
  Check,
  ChevronLeft,
  ChevronRight,
  Compass,
  Disc,
  Edit3,
  Flame,
  FolderPlus,
  Heart,
  History,
  Library,
  ListMusic,
  ListPlus,
  Loader2,
  Lock,
  LogOut,
  Moon,
  Music,
  Pause,
  Play,
  Plus,
  Radio,
  RefreshCw,
  Search,
  Settings,
  Share2,
  Shuffle,
  Sparkles,
  Trash2,
  TrendingUp,
  User,
  UserCheck,
  UserPlus,
  WifiOff,
  X,
  Zap,
} from 'lucide-react';
import {
  Album,
  Artist,
  HomepageSection,
  ListeningEvent,
  Playlist,
  RoutePath,
  ThemeMode,
  Track,
  UserAccount,
  ViewStateMode,
} from '../../../shared/types/music';
import { formatDuration } from '../data/catalogFixtures';
import { fetchSearchTracks } from '../services/apiClient';
import { ArtworkTile } from './ArtworkTile';

/* -------------------------------------------------------------------------- */
/* Shared State Boundary Wrapper (Loading, Empty, Error, Offline)             */
/* -------------------------------------------------------------------------- */
interface StateBoundaryProps {
  mode: ViewStateMode;
  onResetToPopulated: () => void;
  emptyTitle?: string;
  emptySubtitle?: string;
  children: React.ReactNode;
}

export const StateBoundary: React.FC<StateBoundaryProps> = ({
  mode,
  onResetToPopulated,
  emptyTitle = 'No songs found',
  emptySubtitle = 'Try clearing your active filters or searching for another artist.',
  children,
}) => {
  if (mode === 'loading') {
    return (
      <div className="space-y-6 py-4" aria-busy="true" aria-label="Loading content">
        <div className="h-56 rounded-2xl bg-neutral-900/80 border border-neutral-800 animate-pulse p-6 flex flex-col justify-end gap-3">
          <div className="w-32 h-3 bg-neutral-800 rounded" />
          <div className="w-2/3 h-7 bg-neutral-800 rounded" />
          <div className="w-1/2 h-4 bg-neutral-800 rounded" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div
              key={n}
              className="h-20 rounded-xl bg-neutral-900/70 border border-neutral-800 animate-pulse p-3 flex items-center gap-3"
            >
              <div className="w-14 h-14 rounded-lg bg-neutral-800 shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="w-3/4 h-3.5 bg-neutral-800 rounded" />
                <div className="w-1/2 h-3 bg-neutral-800 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (mode === 'error') {
    return (
      <div className="my-8 p-8 rounded-xl bg-[#0A0A0A] border border-[#BC0202]/60 max-w-xl mx-auto text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-[#830000]/30 text-[#FF0000] flex items-center justify-center mx-auto">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-display font-bold text-white">
          Unable to Load Music Catalog
        </h2>
        <p className="text-xs text-neutral-300 leading-relaxed">
          Please check your connection and try again.
        </p>
        <button
          type="button"
          onClick={onResetToPopulated}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#BC0202] hover:bg-[#FF0000] text-white text-xs font-semibold transition-colors cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Retry</span>
        </button>
      </div>
    );
  }

  if (mode === 'offline') {
    return (
      <div className="my-8 p-8 rounded-xl bg-[#0A0A0A] border border-neutral-800 max-w-xl mx-auto text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-neutral-900 text-[#FF0000] flex items-center justify-center mx-auto">
          <WifiOff className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-display font-bold text-white">
          You Are Offline
        </h2>
        <p className="text-xs text-neutral-300 leading-relaxed">
          Reconnect to the internet to browse and stream the full catalog.
        </p>
        <button
          type="button"
          onClick={onResetToPopulated}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#BC0202] hover:bg-[#FF0000] text-white text-xs font-semibold transition-colors cursor-pointer"
        >
          <span>Reconnect</span>
        </button>
      </div>
    );
  }

  if (mode === 'empty') {
    return (
      <div className="my-8 p-8 rounded-xl bg-[#0A0A0A] border border-neutral-800 max-w-xl mx-auto text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-neutral-900 text-neutral-400 flex items-center justify-center mx-auto">
          <Disc className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-display font-bold text-white">{emptyTitle}</h2>
        <p className="text-xs text-neutral-400">{emptySubtitle}</p>
        <button
          type="button"
          onClick={onResetToPopulated}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#BC0202] hover:bg-[#FF0000] text-white text-xs font-semibold transition-colors cursor-pointer"
        >
          <span>Reset Filters</span>
        </button>
      </div>
    );
  }

  return <>{children}</>;
};

/* -------------------------------------------------------------------------- */
/* Auth Guard Banner for Authenticated Routes                                 */
/* -------------------------------------------------------------------------- */
interface AuthGuardProps {
  currentUser: UserAccount | null;
  onNavigate: (path: RoutePath) => void;
  featureName: string;
}

const AuthGuardCard: React.FC<AuthGuardProps> = ({
  onNavigate,
  featureName,
}) => (
  <div className="max-w-xl mx-auto my-10 bg-[#0A0A0A] border border-neutral-800 rounded-xl p-6 sm:p-8 space-y-4">
    <div className="flex items-center gap-2.5 text-[#FF0000]">
      <Lock className="w-5 h-5" />
      <span className="text-xs font-mono uppercase tracking-wider">
        Account Required
      </span>
    </div>
    <h1 className="text-xl font-display font-bold text-white">
      Sign in to access {featureName}
    </h1>
    <p className="text-sm text-neutral-400 leading-relaxed">
      Sign in to save tracks, create playlists, and view your listening history across devices.
    </p>
    <div className="flex flex-wrap items-center gap-3 pt-2">
      <button
        type="button"
        onClick={() => onNavigate('/login')}
        className="px-4 py-2 rounded-lg bg-[#BC0202] hover:bg-[#FF0000] text-white text-xs font-semibold transition-colors cursor-pointer"
      >
        Sign In
      </button>
      <button
        type="button"
        onClick={() => onNavigate('/signup')}
        className="px-4 py-2 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-200 text-xs font-medium border border-neutral-800 transition-colors cursor-pointer"
      >
        Create Account
      </button>
    </div>
  </div>
);

/* -------------------------------------------------------------------------- */
/* 1. Home View (/)                                                           */
/* -------------------------------------------------------------------------- */
interface HomeViewProps {
  tracks: Track[];
  albums: Album[];
  artists: Artist[];
  homepageSections: HomepageSection[];
  currentTrackId: string | null;
  isPlaying: boolean;
  likedTrackIds: string[];
  playlists: Playlist[];
  onPlayTrack: (track: Track, contextQueue?: Track[]) => void;
  onAddToQueue: (track: Track) => void;
  onToggleLike: (trackId: string) => void;
  onAddTrackToPlaylist: (playlistId: string, trackId: string) => void;
  onNavigate: (path: RoutePath) => void;
}

export const HomeView: React.FC<HomeViewProps> = ({
  tracks,
  albums,
  artists,
  homepageSections,
  currentTrackId,
  isPlaying,
  likedTrackIds,
  playlists,
  onPlayTrack,
  onAddToQueue,
  onToggleLike,
  onAddTrackToPlaylist,
  onNavigate,
}) => {
  const categoryFilters = [
    'Bollywood',
    'Punjabi',
    'Lo-fi',
    'Romantic',
    'Tamil',
    'Telugu',
    'Pop',
    'Hip-Hop',
  ];
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [playlistMenuTrackId, setPlaylistMenuTrackId] = useState<string | null>(null);
  const [heroSlideIndex, setHeroSlideIndex] = useState<number>(0);
  const [heroPaused, setHeroPaused] = useState<boolean>(false);

  const visibleTracks = useMemo(
    () => tracks.filter((t) => t.visibleInCatalog),
    [tracks]
  );

  const filteredTracks = useMemo(() => {
    let list = visibleTracks;
    if (activeCategory !== 'All') {
      const catLower = activeCategory.toLowerCase();
      const matched = list.filter((t) => {
        const text = `${t.cleanTitle} ${t.genre} ${t.language} ${t.albumName} ${t.artistName}`.toLowerCase();
        if (catLower === 'bollywood') {
          return t.language === 'Hindi' || text.includes('bollywood');
        }
        if (catLower === 'punjabi') {
          return t.language === 'Punjabi' || text.includes('punjabi');
        }
        if (catLower === 'lo-fi') {
          return text.includes('lo-fi') || text.includes('chill') || text.includes('ambient');
        }
        if (catLower === 'romantic') {
          return text.includes('romantic') || text.includes('love') || text.includes('arijit');
        }
        if (catLower === 'tamil') {
          return t.language === 'Tamil' || text.includes('tamil');
        }
        if (catLower === 'telugu') {
          return t.language === 'Telugu' || text.includes('telugu');
        }
        if (catLower === 'pop') {
          return text.includes('pop');
        }
        if (catLower === 'hip-hop') {
          return text.includes('hip-hop') || text.includes('rap') || text.includes('urban');
        }
        return text.includes(catLower);
      });
      if (matched.length > 0) {
        list = matched;
      }
    }
    return list;
  }, [visibleTracks, activeCategory]);

  const heroSlides = useMemo(
    () => (filteredTracks.length > 0 ? filteredTracks.slice(0, 6) : visibleTracks.slice(0, 6)),
    [filteredTracks, visibleTracks]
  );

  useEffect(() => {
    if (heroSlides.length <= 1 || heroPaused) return;
    const interval = window.setInterval(() => {
      setHeroSlideIndex((prev) => (prev + 1) % heroSlides.length);
    }, 3800);
    return () => clearInterval(interval);
  }, [heroSlides.length, heroPaused]);

  const safeHeroIndex = heroSlides.length > 0 ? heroSlideIndex % heroSlides.length : 0;

  const activeSections = useMemo(
    () => [...homepageSections].filter((s) => s.enabled).sort((a, b) => a.order - b.order),
    [homepageSections]
  );

  const languages = ['All', 'Hindi', 'Tamil', 'Punjabi', 'Telugu', 'English', 'Instrumental'];
  const moodVibes = ['All Vibes', 'Romantic', 'Party & Bass', 'Late Night Chill', 'Workout Energy'];

  const handleSurpriseMeDjMix = () => {
    const pool = filteredTracks.length > 0 ? [...filteredTracks] : [...visibleTracks];
    if (pool.length === 0) return;
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    onPlayTrack(pool[0], pool);
  };

  return (
    <div className="space-y-10 pb-8">
      {/* Auto-Sliding Trending Spotlight Carousel (Matching Reference Image image_1ed3f949.png) */}
      {heroSlides.length > 0 && (
        <section
          aria-label="Trending songs spotlight slider"
          onMouseEnter={() => setHeroPaused(true)}
          onMouseLeave={() => setHeroPaused(false)}
          className="relative rounded-3xl overflow-hidden border border-neutral-800/80 bg-gradient-to-r from-[#2A0303] via-[#140202] to-[#0A0A0A] shadow-2xl"
        >
          <div
            className="flex transition-transform duration-700 ease-out"
            style={{ transform: `translate3d(-${safeHeroIndex * 100}%, 0, 0)` }}
          >
            {heroSlides.map((slideTrack, idx) => {
              const isLiked = likedTrackIds.includes(slideTrack.id);
              const isTrackPlaying = currentTrackId === slideTrack.id && isPlaying;
              return (
                <div
                  key={slideTrack.id}
                  className="w-full shrink-0 p-6 sm:p-8 lg:p-10 grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-center"
                >
                  {/* Left Column: Badge, Title, Artist, Play now, Details, Like, Slide Dashes */}
                  <div className="lg:col-span-7 space-y-4 sm:space-y-5">
                    {/* #N NEW & TRENDING Red Pill Badge */}
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FF0000] text-white text-[11px] font-bold uppercase tracking-wider shadow-[0_0_14px_rgba(255,0,0,0.55)]">
                      <Flame className="w-3.5 h-3.5 fill-white" />
                      <span>#{idx + 1} NEW &amp; TRENDING</span>
                    </div>

                    {/* Bold Title */}
                    <h1
                      className="text-2xl sm:text-3xl lg:text-4xl xl:text-[40px] font-display font-extrabold text-white tracking-tight leading-tight line-clamp-2"
                      style={{ textWrap: 'balance' }}
                      title={slideTrack.cleanTitle}
                    >
                      {slideTrack.cleanTitle}
                    </h1>

                    {/* Subtitle / Artist & Duration */}
                    <p className="text-xs sm:text-sm text-neutral-400 font-normal">
                      {slideTrack.artistName} · {formatDuration(slideTrack.duration)}
                    </p>

                    {/* Action Buttons Matching Reference Image */}
                    <div className="flex items-center gap-3 pt-1">
                      {/* Play now Pill Button */}
                      <button
                        type="button"
                        onClick={() => onPlayTrack(slideTrack, visibleTracks)}
                        className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-[#FF0000] hover:bg-[#e00000] text-white font-bold text-sm shadow-[0_4px_22px_rgba(255,0,0,0.55)] transition-all cursor-pointer whitespace-nowrap"
                      >
                        {isTrackPlaying ? (
                          <>
                            <Pause className="w-4 h-4 fill-white" />
                            <span>Pause</span>
                          </>
                        ) : (
                          <>
                            <Play className="w-4 h-4 fill-white" />
                            <span>Play now</span>
                          </>
                        )}
                      </button>

                      {/* Details Pill Button */}
                      <button
                        type="button"
                        onClick={() => onNavigate(`/album/${slideTrack.albumId}`)}
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/10 hover:bg-white/15 text-white font-medium text-sm border border-white/10 transition-colors cursor-pointer whitespace-nowrap"
                      >
                        <span>Details</span>
                      </button>

                      {/* Heart / Like Button */}
                      <button
                        type="button"
                        onClick={() => onToggleLike(slideTrack.id)}
                        aria-label={isLiked ? 'Unlike track' : 'Like track'}
                        className="p-2.5 rounded-full hover:bg-white/10 text-neutral-300 hover:text-white transition-colors cursor-pointer"
                      >
                        <Heart
                          className={`w-5 h-5 ${isLiked ? 'fill-[#FF0000] text-[#FF0000]' : ''
                            }`}
                        />
                      </button>
                    </div>

                    {/* Bottom Left Slide Indicators */}
                    <div className="flex items-center gap-1.5 pt-3">
                      {heroSlides.map((s, i) => (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => setHeroSlideIndex(i)}
                          aria-label={`Slide ${i + 1}`}
                          className={`h-1 rounded-full transition-all duration-300 cursor-pointer ${i === safeHeroIndex
                              ? 'w-7 bg-white shadow-[0_0_8px_white]'
                              : 'w-3.5 bg-neutral-700 hover:bg-neutral-500'
                            }`}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Right Column: Square Artwork Thumbnail */}
                  <div className="lg:col-span-5 flex justify-center lg:justify-end">
                    <button
                      type="button"
                      onClick={() => onPlayTrack(slideTrack, visibleTracks)}
                      className="relative group cursor-pointer"
                      aria-label={`Play ${slideTrack.cleanTitle}`}
                    >
                      <img
                        src={slideTrack.thumbnailUrl}
                        alt={slideTrack.cleanTitle}
                        className="w-52 h-52 sm:w-64 sm:h-64 lg:w-72 lg:h-72 aspect-square object-cover rounded-2xl sm:rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.95)] border border-neutral-800/80"
                      />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Bottom Right Arrow Controls Matching Reference Image */}
          {heroSlides.length > 1 && (
            <div className="absolute right-6 sm:right-8 bottom-6 sm:bottom-8 z-10 flex items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  setHeroSlideIndex(
                    (prev) => (prev - 1 + heroSlides.length) % heroSlides.length
                  )
                }
                aria-label="Previous trending song"
                className="w-9 h-9 rounded-full bg-black/85 hover:bg-neutral-800 text-white flex items-center justify-center border border-neutral-800/80 hover:border-neutral-700 transition-colors cursor-pointer shadow-lg"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() =>
                  setHeroSlideIndex((prev) => (prev + 1) % heroSlides.length)
                }
                aria-label="Next trending song"
                className="w-9 h-9 rounded-full bg-black/85 hover:bg-neutral-800 text-white flex items-center justify-center border border-neutral-800 hover:border-neutral-700 transition-colors cursor-pointer shadow-lg"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </section>
      )}

      {/* Category Filter Chips Matching Reference Image image_1ed3f949.png */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-0.5 no-scrollbar select-none">
        {categoryFilters.map((cat) => {
          const isActive = activeCategory === cat;
          return (
            <button
              key={cat}
              type="button"
              onClick={() => setActiveCategory(activeCategory === cat ? 'All' : cat)}
              className={`px-4 py-2 rounded-full text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${isActive
                  ? 'bg-white text-black shadow'
                  : 'bg-[#121212] hover:bg-[#1a1a1a] text-neutral-300 hover:text-white border border-neutral-800/80'
                }`}
            >
              {cat}
            </button>
          );
        })}
      </div>

      {/* Spotify-Style Quick Picks 2x3 Grid */}
      {filteredTracks.length > 0 && (
        <section aria-label="Quick picks" className="space-y-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-display font-bold text-white">
                Quick Play Mix
              </h2>
              <span className="text-xs text-neutral-400">
                Instant one-tap playback · Deep Bass Ready
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredTracks.slice(0, 6).map((track) => {
              const isCurrent = currentTrackId === track.id;
              return (
                <div
                  key={`quick-${track.id}`}
                  className={`mm-spotify-tile group relative flex items-center justify-between gap-3 rounded-xl overflow-hidden border pr-3 ${isCurrent
                      ? 'bg-gradient-to-r from-[#830000]/45 via-[#140505] to-[#0A0A0A] border-[#FF0000]'
                      : 'bg-[#0D0D0D]/95 hover:bg-[#171717] border-neutral-800/90 hover:border-[#BC0202]/70'
                    }`}
                >
                  <button
                    type="button"
                    onClick={() => onPlayTrack(track, filteredTracks)}
                    className="flex items-center gap-3 min-w-0 flex-1 text-left cursor-pointer"
                  >
                    <ArtworkTile
                      title={track.cleanTitle}
                      thumbnailUrl={track.thumbnailUrl}
                      size="sm"
                      rounded="md"
                      isPlaying={isCurrent && isPlaying}
                      className="w-14 h-14 shrink-0 rounded-none"
                    />
                    <div className="min-w-0 flex-1 py-2">
                      <p className="text-sm font-semibold text-white group-hover:text-[#FF0000] truncate transition-colors">
                        {track.cleanTitle}
                      </p>
                      <p className="text-xs text-neutral-400 truncate mt-0.5">
                        {track.artistName} · {track.language}
                      </p>
                    </div>
                  </button>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => onPlayTrack(track, filteredTracks)}
                      aria-label={isCurrent && isPlaying ? `Pause ${track.cleanTitle}` : `Play ${track.cleanTitle}`}
                      className={`w-9 h-9 rounded-full flex items-center justify-center shadow-lg transition-all cursor-pointer ${isCurrent && isPlaying
                          ? 'bg-[#FF0000] text-white scale-100'
                          : 'bg-[#BC0202] group-hover:bg-[#FF0000] text-white opacity-90 group-hover:opacity-100'
                        }`}
                    >
                      {isCurrent && isPlaying ? (
                        <Pause className="w-4 h-4 fill-current" />
                      ) : (
                        <Play className="w-4 h-4 fill-current ml-0.5" />
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Top 10 India Chartbusters Leaderboard */}
      {filteredTracks.length > 0 && (
        <section aria-label="Top 10 Chartbusters Leaderboard" className="space-y-4">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="text-xl font-display font-bold text-white">
                Top 10 Chartbusters Leaderboard
              </h2>
              <p className="text-xs text-neutral-400 mt-0.5">
                Most streamed real tracks · Hinglish Lyrics &amp; 8D Audio Ready
              </p>
            </div>
            <button
              type="button"
              onClick={handleSurpriseMeDjMix}
              className="text-xs font-semibold text-[#FF0000] hover:underline cursor-pointer"
            >
              Shuffle Top 10 →
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {filteredTracks.slice(0, 10).map((track, idx) => {
              const isCurrent = currentTrackId === track.id;
              const isLiked = likedTrackIds.includes(track.id);
              const rankLabel = String(idx + 1).padStart(2, '0');
              return (
                <div
                  key={`chart-${track.id}`}
                  className={`p-3 rounded-xl border flex items-center justify-between gap-3 transition-all ${isCurrent
                      ? 'bg-gradient-to-r from-[#830000]/45 via-[#120404] to-black border-[#FF0000]'
                      : 'bg-[#0A0A0A] hover:bg-[#121212] border-neutral-800/90 hover:border-neutral-700'
                    }`}
                >
                  <div className="flex items-center gap-3.5 min-w-0 flex-1">
                    <span
                      className={`text-lg sm:text-xl font-display font-bold font-mono tabular-nums w-7 text-center shrink-0 ${idx < 3 ? 'text-[#FF0000]' : 'text-neutral-500'
                        }`}
                    >
                      {rankLabel}
                    </span>

                    <button
                      type="button"
                      onClick={() => onPlayTrack(track, filteredTracks)}
                      className="flex items-center gap-3 min-w-0 flex-1 text-left cursor-pointer"
                    >
                      <ArtworkTile
                        title={track.cleanTitle}
                        thumbnailUrl={track.thumbnailUrl}
                        size="sm"
                        isPlaying={isCurrent && isPlaying}
                        className="w-12 h-12 shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <p
                          className={`text-sm font-semibold truncate ${isCurrent ? 'text-[#FF0000]' : 'text-white'
                            }`}
                        >
                          {track.cleanTitle}
                        </p>
                        <p className="text-xs text-neutral-400 truncate mt-0.5">
                          {track.artistName} · {track.language}
                        </p>
                      </div>
                    </button>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="hidden sm:inline text-xs font-mono tabular-nums text-neutral-500">
                      {formatDuration(track.duration)}
                    </span>
                    <button
                      type="button"
                      onClick={() => onToggleLike(track.id)}
                      aria-label={isLiked ? 'Unlike' : 'Like'}
                      className={`p-1.5 rounded-lg transition-colors cursor-pointer ${isLiked ? 'text-[#FF0000]' : 'text-neutral-500 hover:text-white'
                        }`}
                    >
                      <Heart className={`w-4 h-4 ${isLiked ? 'fill-[#FF0000]' : ''}`} />
                    </button>
                    <button
                      type="button"
                      onClick={() => onPlayTrack(track, filteredTracks)}
                      aria-label={
                        isCurrent && isPlaying
                          ? `Pause ${track.cleanTitle}`
                          : `Play ${track.cleanTitle}`
                      }
                      className="w-8 h-8 rounded-full bg-[#BC0202] hover:bg-[#FF0000] text-white flex items-center justify-center transition-colors cursor-pointer"
                    >
                      {isCurrent && isPlaying ? (
                        <Pause className="w-3.5 h-3.5 fill-current" />
                      ) : (
                        <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Homepage Sections */}
      {activeSections.map((sec) => {
        if (sec.type === 'featured_tracks') {
          const sectionTracks = filteredTracks.filter((t) => sec.itemIds.includes(t.id));
          const displayList = sectionTracks.length > 0 ? sectionTracks : filteredTracks;
          const slidingRibbonTracks =
            displayList.length > 0 ? [...displayList, ...displayList] : [];

          return (
            <section key={sec.id} className="space-y-5">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <h2 className="text-xl font-display font-bold text-white">{sec.title}</h2>
                  <p className="text-xs text-neutral-400 mt-0.5">{sec.subtitle}</p>
                </div>
                <button
                  type="button"
                  onClick={() => onNavigate('/search')}
                  className="text-xs text-neutral-300 hover:text-[#FF0000] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  See All →
                </button>
              </div>

              {/* Continuous Auto-Sliding Trending Songs Carousel */}
              {slidingRibbonTracks.length > 0 && (
                <div className="relative overflow-hidden rounded-2xl border border-neutral-800/80 bg-[#050505] py-4">
                  <div className="animate-trending-slide gap-4 px-4">
                    {slidingRibbonTracks.map((track, slideIdx) => {
                      const isCurrent = currentTrackId === track.id;
                      const isLiked = likedTrackIds.includes(track.id);
                      return (
                        <div
                          key={`${track.id}-slide-${slideIdx}`}
                          className={`group w-60 shrink-0 rounded-xl p-3 border transition-all duration-300 ${isCurrent
                              ? 'bg-gradient-to-b from-[#830000]/45 to-[#0D0D0D] border-[#FF0000]'
                              : 'bg-[#0A0A0A] hover:bg-gradient-to-b hover:from-[#830000]/25 hover:to-[#0D0D0D] border-neutral-800 hover:border-[#BC0202]'
                            }`}
                        >
                          <div className="relative">
                            <button
                              type="button"
                              onClick={() => onPlayTrack(track, displayList)}
                              className="w-full relative block cursor-pointer"
                              aria-label={`Play ${track.cleanTitle}`}
                            >
                              <ArtworkTile
                                title={track.cleanTitle}
                                subtitle={track.artistName}
                                thumbnailUrl={track.thumbnailUrl}
                                size="lg"
                                isPlaying={isCurrent && isPlaying}
                                className="w-full aspect-square"
                              />
                              <span className="absolute inset-0 bg-black/55 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity rounded-lg">
                                <span className="w-11 h-11 rounded-full bg-[#FF0000] text-white flex items-center justify-center shadow-xl">
                                  {isCurrent && isPlaying ? (
                                    <Pause className="w-5 h-5 fill-current" />
                                  ) : (
                                    <Play className="w-5 h-5 fill-current ml-0.5" />
                                  )}
                                </span>
                              </span>
                            </button>
                          </div>

                          <div className="mt-3 flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <button
                                type="button"
                                onClick={() => onNavigate(`/track/${track.id}`)}
                                className="text-sm font-semibold text-white hover:text-[#FF0000] truncate block text-left w-full cursor-pointer"
                              >
                                {track.cleanTitle}
                              </button>
                              <p className="text-xs text-neutral-400 truncate mt-0.5">
                                {track.artistName}
                              </p>
                              <p className="text-[11px] font-mono tabular-nums text-neutral-500 mt-1">
                                {track.language} · {formatDuration(track.duration)}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => onToggleLike(track.id)}
                              aria-label={isLiked ? 'Unlike' : 'Like'}
                              className={`p-1.5 rounded-lg transition-colors shrink-0 cursor-pointer ${isLiked ? 'text-[#FF0000]' : 'text-neutral-500 hover:text-white'
                                }`}
                            >
                              <Heart className={`w-4 h-4 ${isLiked ? 'fill-[#FF0000]' : ''}`} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {displayList.map((track) => {
                  const isCurrent = currentTrackId === track.id;
                  const isLiked = likedTrackIds.includes(track.id);

                  return (
                    <div
                      key={track.id}
                      className={`group relative rounded-xl p-3.5 border transition-colors flex items-center gap-3.5 ${isCurrent
                          ? 'bg-gradient-to-r from-[#830000]/35 to-[#0D0D0D] border-[#BC0202]'
                          : 'bg-[#0A0A0A] hover:bg-gradient-to-r hover:from-[#830000]/20 hover:to-[#0D0D0D] border-neutral-800/90'
                        }`}
                    >
                      <button
                        type="button"
                        onClick={() => onPlayTrack(track, displayList)}
                        className="relative shrink-0 cursor-pointer"
                        aria-label={`Play ${track.cleanTitle}`}
                      >
                        <ArtworkTile
                          title={track.cleanTitle}
                          thumbnailUrl={track.thumbnailUrl}
                          size="md"
                          isPlaying={isCurrent && isPlaying}
                          className="w-16 h-16"
                        />
                        <span className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity rounded-lg">
                          <span className="w-8 h-8 rounded-full bg-[#FF0000] text-white flex items-center justify-center shadow">
                            {isCurrent && isPlaying ? (
                              <Pause className="w-4 h-4 fill-current" />
                            ) : (
                              <Play className="w-4 h-4 fill-current ml-0.5" />
                            )}
                          </span>
                        </span>
                      </button>

                      <div className="min-w-0 flex-1 space-y-1">
                        <button
                          type="button"
                          onClick={() => onNavigate(`/track/${track.id}`)}
                          className="text-sm font-semibold text-white hover:text-[#FF0000] truncate block text-left w-full transition-colors cursor-pointer"
                        >
                          {track.cleanTitle}
                        </button>
                        <p className="text-xs text-neutral-400 truncate">
                          <button
                            type="button"
                            onClick={() => onNavigate(`/artist/${track.artistId}`)}
                            className="hover:text-white hover:underline cursor-pointer"
                          >
                            {track.artistName}
                          </button>
                          {' · '}
                          <span>{track.language}</span>
                        </p>
                        <div className="flex items-center gap-2 text-[11px] text-neutral-500 font-mono tabular-nums">
                          <span>{formatDuration(track.duration)}</span>
                          <span aria-hidden="true">·</span>
                          <span className="font-sans">{track.genre}</span>
                        </div>
                      </div>

                      {/* Track Quick Actions */}
                      <div className="flex items-center gap-1 shrink-0 relative">
                        <button
                          type="button"
                          onClick={() => onToggleLike(track.id)}
                          aria-label={isLiked ? 'Unlike' : 'Like'}
                          className={`p-2 rounded-lg transition-colors cursor-pointer ${isLiked ? 'text-[#FF0000]' : 'text-neutral-500 hover:text-white'
                            }`}
                        >
                          <Heart className={`w-4 h-4 ${isLiked ? 'fill-[#FF0000]' : ''}`} />
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            setPlaylistMenuTrackId((prev) => (prev === track.id ? null : track.id))
                          }
                          aria-label="Add to playlist or queue"
                          className="p-2 rounded-lg text-neutral-500 hover:text-white transition-colors cursor-pointer"
                        >
                          <Plus className="w-4 h-4" />
                        </button>

                        {playlistMenuTrackId === track.id && (
                          <div className="absolute right-0 top-10 z-30 w-48 rounded-xl bg-[#0D0D0D] border border-neutral-800 shadow-2xl p-2 space-y-1 text-xs">
                            <button
                              type="button"
                              onClick={() => {
                                onAddToQueue(track);
                                setPlaylistMenuTrackId(null);
                              }}
                              className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-neutral-900 text-neutral-200 flex items-center gap-2 cursor-pointer"
                            >
                              <ListPlus className="w-3.5 h-3.5 text-[#FF0000]" />
                              <span>Add to Queue</span>
                            </button>
                            <div className="h-px bg-neutral-800 my-1" />
                            <p className="px-2.5 py-1 text-[10px] text-neutral-500 font-mono">
                              ADD TO PLAYLIST
                            </p>
                            {playlists.map((pl) => (
                              <button
                                key={pl.id}
                                type="button"
                                onClick={() => {
                                  onAddTrackToPlaylist(pl.id, track.id);
                                  setPlaylistMenuTrackId(null);
                                }}
                                className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-[#830000]/30 text-neutral-200 truncate cursor-pointer"
                              >
                                + {pl.name}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          );
        }

        if (sec.type === 'albums') {
          const secAlbums = albums.filter((a) => sec.itemIds.includes(a.id));
          return (
            <section key={sec.id} className="space-y-4">
              <div>
                <h2 className="text-xl font-display font-bold text-white">{sec.title}</h2>
                <p className="text-xs text-neutral-400 mt-0.5">{sec.subtitle}</p>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                {secAlbums.map((alb) => (
                  <button
                    key={alb.id}
                    type="button"
                    onClick={() => onNavigate(`/album/${alb.id}`)}
                    className="group text-left bg-[#0A0A0A] hover:bg-gradient-to-b hover:from-[#830000]/25 hover:to-[#0A0A0A] border border-neutral-800/90 rounded-xl p-3.5 transition-colors space-y-3 cursor-pointer"
                  >
                    <ArtworkTile
                      title={alb.title}
                      subtitle={alb.artistName}
                      thumbnailUrl={alb.coverUrl}
                      accentHex={alb.accentHex}
                      size="lg"
                      className="w-full aspect-square"
                    />
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-white group-hover:text-[#FF0000] truncate transition-colors">
                        {alb.title}
                      </p>
                      <p className="text-xs text-neutral-400 truncate">
                        {alb.artistName} · {alb.releaseYear}
                      </p>
                      <p className="text-[11px] text-neutral-500">
                        {alb.language} · {alb.genre}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </section>
          );
        }

        if (sec.type === 'artists') {
          const secArtists = artists.filter((ar) => sec.itemIds.includes(ar.id));
          return (
            <section key={sec.id} className="space-y-4">
              <div>
                <h2 className="text-xl font-display font-bold text-white">{sec.title}</h2>
                <p className="text-xs text-neutral-400 mt-0.5">{sec.subtitle}</p>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                {secArtists.map((ar) => (
                  <button
                    key={ar.id}
                    type="button"
                    onClick={() => onNavigate(`/artist/${ar.id}`)}
                    className="group text-center bg-[#0A0A0A] hover:bg-gradient-to-b hover:from-[#830000]/25 hover:to-[#0A0A0A] border border-neutral-800/90 rounded-xl p-4 transition-colors space-y-3 flex flex-col items-center cursor-pointer"
                  >
                    <ArtworkTile
                      title={ar.name}
                      thumbnailUrl={ar.avatarUrl}
                      accentHex={ar.accentHex}
                      size="lg"
                      rounded="full"
                      className="w-24 h-24"
                    />
                    <div className="space-y-0.5 w-full">
                      <p className="text-sm font-semibold text-white group-hover:text-[#FF0000] truncate transition-colors">
                        {ar.name}
                      </p>
                      <p className="text-xs text-neutral-400 truncate">{ar.primaryLanguage}</p>
                    </div>
                  </button>
                ))}
              </div>
            </section>
          );
        }

        return null;
      })}
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/* 2. Search & Discovery View (/search)                                       */
/* -------------------------------------------------------------------------- */
interface SearchViewProps {
  tracks: Track[];
  artists: Artist[];
  albums: Album[];
  initialQuery: string;
  currentTrackId: string | null;
  isPlaying: boolean;
  likedTrackIds: string[];
  onPlayTrack: (track: Track, contextQueue?: Track[]) => void;
  onAddToQueue: (track: Track) => void;
  onToggleLike: (trackId: string) => void;
  onNavigate: (path: RoutePath) => void;
  onTracksDiscovered?: (newTracks: Track[]) => void;
}

export const SearchView: React.FC<SearchViewProps> = ({
  tracks,
  artists,
  albums,
  initialQuery,
  currentTrackId,
  isPlaying,
  likedTrackIds,
  onPlayTrack,
  onAddToQueue,
  onToggleLike,
  onNavigate,
  onTracksDiscovered,
}) => {
  const [query, setQuery] = useState(initialQuery);
  const [selectedGenre, setSelectedGenre] = useState<string>('All');
  const [remoteResults, setRemoteResults] = useState<Track[] | null>(null);
  const [isSearchingRemote, setIsSearchingRemote] = useState(false);

  const [recentSearches, setRecentSearches] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('musicmine_recent_searches');
      return saved ? JSON.parse(saved).slice(0, 5) : [];
    } catch {
      return [];
    }
  });

  const saveRecentSearch = (rawTerm: string) => {
    const term = rawTerm.trim();
    if (!term) return;
    setRecentSearches((prev) => {
      const filtered = prev.filter((item) => item.toLowerCase() !== term.toLowerCase());
      const updated = [term, ...filtered].slice(0, 5);
      try {
        localStorage.setItem('musicmine_recent_searches', JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  const removeRecentSearch = (termToRemove: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setRecentSearches((prev) => {
      const updated = prev.filter((item) => item !== termToRemove);
      try {
        localStorage.setItem('musicmine_recent_searches', JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  const clearRecentSearches = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setRecentSearches([]);
    try {
      localStorage.removeItem('musicmine_recent_searches');
    } catch {}
  };

  const trendingSearches = [
    { term: 'Aaj Ki Raat', subtitle: 'Stree 2 · Trending #1', tag: '🔥 #1 Trending' },
    { term: 'Arijit Singh', subtitle: '42.6M Listeners', tag: 'Top Artist' },
    { term: 'Tauba Tauba', subtitle: 'Bad Newz · Viral', tag: '⚡ Viral' },
    { term: 'Diljit Dosanjh', subtitle: 'MoonChild Era', tag: 'Popular' },
    { term: 'Apna Bana Le', subtitle: 'Bhediya · Romantic', tag: 'Romantic' },
    { term: 'Kesariya', subtitle: 'Brahmāstra', tag: 'Chartbuster' },
    { term: 'Sachin-Jigar', subtitle: '18.4M Listeners', tag: 'Composer' },
    { term: 'A.R. Rahman', subtitle: 'Rockstar & Classics', tag: 'Legend' },
  ];

  const visibleTracks = useMemo(
    () => tracks.filter((t) => t.visibleInCatalog),
    [tracks]
  );

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setRemoteResults(null);
      setIsSearchingRemote(false);
      return;
    }

    let cancelled = false;
    setIsSearchingRemote(true);
    const timer = window.setTimeout(async () => {
      const results = await fetchSearchTracks(trimmed);
      if (cancelled) return;
      setIsSearchingRemote(false);
      if (results && results.length > 0) {
        setRemoteResults(results);
        if (onTracksDiscovered) {
          onTracksDiscovered(results);
        }
      } else {
        setRemoteResults([]);
      }
    }, 140);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, onTracksDiscovered]);

  const suggestions = [
    'Aaj Ki Raat',
    'Arijit Singh',
    'Apna Bana Le',
    'Kesariya',
    'Tauba Tauba',
    'Diljit Dosanjh',
    'Anirudh',
    'Kun Faya Kun',
  ];

  interface SearchCategory {
    id: string;
    label: string;
    icon: 'all' | 'romantic' | 'viral' | 'chartbuster' | 'bollywood' | 'punjabi' | 'lofi' | 'soundtrack';
    tagline: string;
    gradient: string;
  }

  const categories: SearchCategory[] = [
    {
      id: 'All',
      label: 'All Tracks',
      icon: 'all',
      tagline: 'Browse complete catalog',
      gradient: 'from-neutral-900 to-neutral-950',
    },
    {
      id: 'Romantic',
      label: 'Romantic',
      icon: 'romantic',
      tagline: 'Love ballads & acoustic feelings',
      gradient: 'from-[#4a0815] to-[#1c0408]',
    },
    {
      id: 'Viral',
      label: 'Viral',
      icon: 'viral',
      tagline: 'Social reels hits & trending hooks',
      gradient: 'from-[#451206] to-[#180602]',
    },
    {
      id: 'Chartbuster',
      label: 'Chartbuster',
      icon: 'chartbuster',
      tagline: 'Record-shattering blockbuster hits',
      gradient: 'from-[#3f083b] to-[#170316]',
    },
    {
      id: 'Bollywood',
      label: 'Bollywood',
      icon: 'bollywood',
      tagline: 'Hindi cinema sound & soundtracks',
      gradient: 'from-[#2e0909] to-[#120404]',
    },
    {
      id: 'Punjabi Pop',
      label: 'Punjabi Pop',
      icon: 'punjabi',
      tagline: 'Desi urban beats & party bangers',
      gradient: 'from-[#3a2007] to-[#160a02]',
    },
    {
      id: 'Lo-Fi',
      label: 'Lo-Fi & Chill',
      icon: 'lofi',
      tagline: 'Mellow frequencies & late night moods',
      gradient: 'from-[#101b35] to-[#060a16]',
    },
    {
      id: 'Soundtrack',
      label: 'Soundtrack & Sufi',
      icon: 'soundtrack',
      tagline: 'Soulful spiritual journeys & orchestral themes',
      gradient: 'from-[#241029] to-[#0c050e]',
    },
  ];

  const isTrackInCategory = (track: Track, categoryId: string): boolean => {
    if (categoryId === 'All') return true;

    const title = (track.title || '').toLowerCase();
    const cleanTitle = (track.cleanTitle || '').toLowerCase();
    const genre = (track.genre || '').toLowerCase();
    const artist = (track.artistName || '').toLowerCase();
    const album = (track.albumName || '').toLowerCase();

    switch (categoryId) {
      case 'Romantic':
        return (
          genre.includes('romantic') ||
          title.includes('apna bana le') ||
          cleanTitle.includes('apna bana le') ||
          title.includes('kesariya') ||
          cleanTitle.includes('kesariya') ||
          title.includes('lover') ||
          cleanTitle.includes('lover') ||
          title.includes('ishq') ||
          title.includes('tum hi ho') ||
          title.includes('pyar') ||
          title.includes('chaleya') ||
          title.includes('o maahi') ||
          title.includes('pehle bhi main') ||
          title.includes('love') ||
          artist.includes('arijit')
        );

      case 'Viral':
        return (
          genre.includes('viral') ||
          title.includes('tauba tauba') ||
          cleanTitle.includes('tauba tauba') ||
          title.includes('aaj ki raat') ||
          cleanTitle.includes('aaj ki raat') ||
          title.includes('stree 2') ||
          title.includes('bad newz') ||
          title.includes('viral') ||
          title.includes('reels') ||
          title.includes('illuminati') ||
          title.includes('big dawgs') ||
          title.includes('lover') ||
          cleanTitle.includes('lover')
        );

      case 'Chartbuster':
        return (
          title.includes('kesariya') ||
          cleanTitle.includes('kesariya') ||
          title.includes('aaj ki raat') ||
          cleanTitle.includes('aaj ki raat') ||
          title.includes('tauba tauba') ||
          cleanTitle.includes('tauba tauba') ||
          title.includes('apna bana le') ||
          cleanTitle.includes('apna bana le') ||
          title.includes('sheesha') ||
          cleanTitle.includes('sheesha') ||
          title.includes('beast') ||
          title.includes('jawan') ||
          title.includes('chartbuster') ||
          title.includes('hit') ||
          track.duration >= 200
        );

      case 'Bollywood':
        return (
          genre.includes('bollywood') ||
          track.language === 'Hindi' ||
          album.includes('stree') ||
          album.includes('bhediya') ||
          album.includes('brahmāstra') ||
          album.includes('rockstar')
        );

      case 'Punjabi Pop':
        return (
          genre.includes('punjabi') ||
          track.language === 'Punjabi' ||
          artist.includes('diljit') ||
          artist.includes('karan aujla')
        );

      case 'Lo-Fi':
        return (
          genre.includes('lo-fi') ||
          genre.includes('lofi') ||
          title.includes('lo-fi') ||
          title.includes('lofi') ||
          title.includes('chill') ||
          title.includes('acoustic') ||
          title.includes('slowed')
        );

      case 'Soundtrack':
        return (
          genre.includes('soundtrack') ||
          genre.includes('sufi') ||
          title.includes('soundtrack') ||
          title.includes('kun faya kun') ||
          cleanTitle.includes('kun faya kun') ||
          title.includes('beast') ||
          title.includes('theme')
        );

      default:
        return genre.includes(categoryId.toLowerCase()) || title.includes(categoryId.toLowerCase());
    }
  };

  const categoryCounts = useMemo(() => {
    const basePool = query.trim() && remoteResults && remoteResults.length > 0 ? remoteResults : visibleTracks;
    const counts: Record<string, number> = {};
    for (const cat of categories) {
      if (cat.id === 'All') {
        counts[cat.id] = basePool.length;
      } else {
        counts[cat.id] = basePool.filter((t) => isTrackInCategory(t, cat.id)).length;
      }
    }
    return counts;
  }, [query, remoteResults, visibleTracks, categories]);

  const matchedTracks = useMemo(() => {
    const q = query.trim().toLowerCase();
    const basePool = q && remoteResults && remoteResults.length > 0 ? remoteResults : visibleTracks;

    return basePool.filter((t) => {
      const categoryOk = isTrackInCategory(t, selectedGenre);
      if (!categoryOk) return false;
      if (!q) return true;
      if (remoteResults && remoteResults.length > 0) return true;
      return (
        t.title.toLowerCase().includes(q) ||
        t.cleanTitle.toLowerCase().includes(q) ||
        t.artistName.toLowerCase().includes(q) ||
        t.albumName.toLowerCase().includes(q) ||
        t.language.toLowerCase().includes(q) ||
        t.genre.toLowerCase().includes(q)
      );
    });
  }, [visibleTracks, remoteResults, query, selectedGenre]);

  const matchedArtists = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return artists.slice(0, 3);
    return artists.filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        a.primaryLanguage.toLowerCase().includes(q) ||
        a.genres.some((g) => g.toLowerCase().includes(q))
    );
  }, [artists, query]);

  const matchedAlbums = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return albums.slice(0, 3);
    return albums.filter(
      (al) =>
        al.title.toLowerCase().includes(q) ||
        al.artistName.toLowerCase().includes(q) ||
        al.language.toLowerCase().includes(q)
    );
  }, [albums, query]);

  return (
    <div className="space-y-8 pb-8">
      <div className="bg-[#0A0A0A] border border-neutral-800 rounded-2xl p-5 sm:p-6 space-y-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-white">Search</h1>
          <p className="text-xs text-neutral-400">
            Search any song, artist, or movie soundtrack to stream immediately.
          </p>
        </div>

        <div className="relative">
          {isSearchingRemote ? (
            <Loader2 className="w-5 h-5 text-[#FF0000] animate-spin absolute left-4 top-3.5" />
          ) : (
            <Search className="w-5 h-5 text-neutral-400 absolute left-4 top-3.5" />
          )}
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search any song, artist, movie, or language..."
            aria-label="Search music catalog"
            className="w-full pl-12 pr-24 py-3 rounded-xl bg-black border border-neutral-800 focus:border-[#FF0000] focus:outline-none text-sm text-white placeholder:text-neutral-500"
          />
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery('');
                setRemoteResults(null);
              }}
              className="absolute right-3 top-2.5 px-2.5 py-1 rounded bg-neutral-900 text-xs text-neutral-400 hover:text-white cursor-pointer"
            >
              Clear
            </button>
          )}
        </div>

        {/* Recent Searches */}
        {recentSearches.length > 0 && (
          <div className="space-y-2 pt-1 border-t border-neutral-800/80">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider flex items-center gap-1.5">
                <History className="w-3.5 h-3.5 text-[#FF0000]" />
                Recent Searches
              </span>
              <button
                type="button"
                onClick={clearRecentSearches}
                className="text-[10px] text-neutral-500 hover:text-[#FF0000] transition-colors cursor-pointer"
              >
                Clear all
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {recentSearches.map((term) => (
                <div
                  key={`srch-recent-${term}`}
                  className="group inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-neutral-900 border border-neutral-800 hover:border-[#BC0202]/60 text-xs text-neutral-300 hover:text-white transition-all cursor-pointer shadow-sm"
                  onClick={() => {
                    setQuery(term);
                    saveRecentSearch(term);
                  }}
                >
                  <History className="w-3 h-3 text-neutral-500 group-hover:text-[#FF0000] shrink-0" />
                  <span className="font-medium truncate max-w-[150px] sm:max-w-[220px]">{term}</span>
                  <button
                    type="button"
                    onClick={(e) => removeRecentSearch(term, e)}
                    aria-label={`Remove ${term}`}
                    className="text-neutral-500 hover:text-white p-0.5 rounded cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Real-Time Trending Searches Grid (Matching Top Search) */}
        {!query && (
          <div className="space-y-3 pt-2 border-t border-neutral-800/80">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-neutral-300 uppercase tracking-wider flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-[#FF0000]" />
                Trending Searches & Top Charts
              </span>
              <span className="text-[10px] text-neutral-400 font-mono flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#FF0000] animate-pulse" />
                Live Trends
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {trendingSearches.map((item, idx) => (
                <button
                  key={`srch-trend-${idx}`}
                  type="button"
                  onClick={() => {
                    setQuery(item.term);
                    saveRecentSearch(item.term);
                  }}
                  className="p-3 rounded-xl bg-black/60 hover:bg-[#830000]/20 border border-neutral-800 hover:border-[#BC0202]/60 text-left transition-all cursor-pointer flex flex-col justify-between group shadow-sm"
                >
                  <div className="flex items-center justify-between gap-1 mb-1.5">
                    <span className="text-[10px] font-mono text-neutral-500 font-bold group-hover:text-neutral-300">
                      #{idx + 1}
                    </span>
                    <span className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-[#FF0000]/15 text-[#ff7272] border border-[#FF0000]/25">
                      {item.tag}
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-white group-hover:text-[#FF0000] truncate transition-colors">
                    {item.term}
                  </p>
                  <p className="text-[10px] text-neutral-400 truncate mt-0.5">
                    {item.subtitle}
                  </p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Search suggestions */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-neutral-500">Popular searches:</span>
          {suggestions.map((sug) => (
            <button
              key={sug}
              type="button"
              onClick={() => {
                setQuery(sug);
                saveRecentSearch(sug);
              }}
              className={`px-2.5 py-1 rounded-md border transition-colors cursor-pointer ${query.toLowerCase() === sug.toLowerCase()
                  ? 'bg-[#830000]/40 border-[#FF0000] text-white'
                  : 'bg-black border-neutral-800 text-neutral-300 hover:border-neutral-700'
                }`}
            >
              {sug}
            </button>
          ))}
        </div>

        {/* Genre & Mood Category Filtering UI */}
        <div className="space-y-3 pt-3 border-t border-neutral-800/80">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-neutral-300 uppercase tracking-wider flex items-center gap-2">
              <TrendingUp className="w-3.5 h-3.5 text-[#FF0000]" />
              Browse by Genre & Mood
            </span>
            {selectedGenre !== 'All' && (
              <button
                type="button"
                onClick={() => setSelectedGenre('All')}
                className="text-xs text-[#FF0000] hover:underline cursor-pointer flex items-center gap-1 font-medium"
              >
                <span>Reset to All</span>
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Category Pill Buttons with Badges & Icons */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-neutral-800">
            {categories.map((cat) => {
              const isActive = selectedGenre === cat.id;
              const count = categoryCounts[cat.id] ?? 0;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedGenre(cat.id)}
                  className={`group px-3.5 py-2 rounded-xl text-xs font-medium transition-all whitespace-nowrap shrink-0 cursor-pointer flex items-center gap-2 border shadow-sm ${isActive
                      ? 'bg-[#BC0202] text-white border-[#FF0000] shadow-[0_0_14px_rgba(255,0,0,0.4)] ring-1 ring-[#FF0000]/60'
                      : 'bg-[#121212] text-neutral-300 hover:text-white border-neutral-800 hover:border-neutral-700 hover:bg-[#181818]'
                    }`}
                >
                  {cat.icon === 'romantic' && (
                    <Heart className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'fill-white text-white' : 'fill-rose-500/30 text-rose-400'}`} />
                  )}
                  {cat.icon === 'viral' && (
                    <Flame className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-white' : 'text-amber-400'}`} />
                  )}
                  {cat.icon === 'chartbuster' && (
                    <Sparkles className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-white' : 'text-amber-300'}`} />
                  )}
                  {cat.icon === 'bollywood' && (
                    <Disc className="w-3.5 h-3.5 shrink-0" />
                  )}
                  {cat.icon === 'punjabi' && (
                    <Zap className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-white' : 'text-yellow-400'}`} />
                  )}
                  {cat.icon === 'lofi' && (
                    <Moon className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-white' : 'text-indigo-400'}`} />
                  )}
                  {cat.icon === 'soundtrack' && (
                    <Music className="w-3.5 h-3.5 shrink-0" />
                  )}
                  {cat.icon === 'all' && (
                    <Compass className="w-3.5 h-3.5 shrink-0" />
                  )}
                  <span>{cat.label}</span>
                  <span
                    className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${isActive
                        ? 'bg-black/35 text-white'
                        : 'bg-neutral-800 text-neutral-400 group-hover:text-neutral-200'
                      }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Active Category Description Banner */}
          {selectedGenre !== 'All' && (
            <div className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-[#240606] to-[#120808] border border-[#830000]/40 flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-[#ff7272] font-semibold">{selectedGenre}</span>
                <span className="text-neutral-400 truncate">
                  · {categories.find((c) => c.id === selectedGenre)?.tagline}
                </span>
              </div>
              <span className="text-neutral-400 shrink-0 font-mono text-[11px]">
                {matchedTracks.length} track{matchedTracks.length === 1 ? '' : 's'}
              </span>
            </div>
          )}

          {/* Featured Category Tiles for Quick Mood Exploration */}
          {!query && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
              {categories
                .filter((c) => c.id !== 'All')
                .slice(0, 4)
                .map((cat) => {
                  const isSelected = selectedGenre === cat.id;
                  return (
                    <button
                      key={`card-${cat.id}`}
                      type="button"
                      onClick={() => setSelectedGenre(cat.id)}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between h-20 bg-gradient-to-br ${cat.gradient} ${isSelected
                          ? 'border-[#FF0000] ring-1 ring-[#FF0000]/50 shadow-[0_0_12px_rgba(255,0,0,0.3)]'
                          : 'border-neutral-800/80 hover:border-neutral-700 hover:scale-[1.01]'
                        }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white flex items-center gap-1.5">
                          {cat.icon === 'romantic' && <Heart className="w-3.5 h-3.5 fill-rose-500 text-rose-500" />}
                          {cat.icon === 'viral' && <Flame className="w-3.5 h-3.5 text-amber-400" />}
                          {cat.icon === 'chartbuster' && <Sparkles className="w-3.5 h-3.5 text-amber-300" />}
                          {cat.icon === 'bollywood' && <Disc className="w-3.5 h-3.5 text-red-400" />}
                          {cat.label}
                        </span>
                        <span className="text-[10px] font-mono text-neutral-400">
                          {categoryCounts[cat.id] ?? 0}
                        </span>
                      </div>
                      <p className="text-[10px] text-neutral-300 line-clamp-1">
                        {cat.tagline}
                      </p>
                    </button>
                  );
                })}
            </div>
          )}
        </div>
      </div>

      {/* Results Table */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-display font-bold text-white flex items-center gap-2">
            <span>Songs ({matchedTracks.length})</span>
            {isSearchingRemote && (
              <span className="text-xs font-normal text-neutral-400 flex items-center gap-1.5">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-[#FF0000]" />
                Searching live catalog...
              </span>
            )}
          </h2>
        </div>

        {matchedTracks.length === 0 && !isSearchingRemote ? (
          <div className="p-8 rounded-xl bg-[#0A0A0A] border border-neutral-800 text-center space-y-3">
            <p className="text-sm text-neutral-300">
              No songs matched {query ? `"${query}"` : 'your filter'} in {selectedGenre === 'All' ? 'the catalog' : `the "${selectedGenre}" category`}.
            </p>
            <button
              type="button"
              onClick={() => {
                setQuery('');
                setSelectedGenre('All');
              }}
              className="px-4 py-2 rounded-lg bg-[#BC0202] text-white text-xs font-semibold cursor-pointer"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="bg-[#0A0A0A] border border-neutral-800 rounded-xl overflow-hidden">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-neutral-800 text-neutral-400">
                  <th className="py-3 pl-4 pr-2 font-medium w-10">#</th>
                  <th className="py-3 px-3 font-medium">Title</th>
                  <th className="py-3 px-3 font-medium hidden md:table-cell">Album</th>
                  <th className="py-3 px-3 font-medium hidden sm:table-cell">Language · Genre</th>
                  <th className="py-3 px-3 font-medium text-right">Duration</th>
                  <th className="py-3 pl-2 pr-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800/60">
                {matchedTracks.map((track) => {
                  const isCurrent = currentTrackId === track.id;
                  const isLiked = likedTrackIds.includes(track.id);
                  return (
                    <tr
                      key={track.id}
                      className={`group transition-colors ${isCurrent ? 'bg-[#830000]/25' : 'hover:bg-neutral-900/60'
                        }`}
                    >
                      <td className="py-3 pl-4 pr-2 font-mono tabular-nums text-neutral-500">
                        <button
                          type="button"
                          onClick={() => onPlayTrack(track, matchedTracks)}
                          className="w-6 h-6 rounded flex items-center justify-center text-neutral-400 group-hover:text-[#FF0000] cursor-pointer"
                          aria-label={`Play ${track.cleanTitle}`}
                        >
                          {isCurrent && isPlaying ? (
                            <Pause className="w-3.5 h-3.5 fill-current text-[#FF0000]" />
                          ) : (
                            <Play className="w-3.5 h-3.5 fill-current" />
                          )}
                        </button>
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-3">
                          <ArtworkTile
                            title={track.cleanTitle}
                            thumbnailUrl={track.thumbnailUrl}
                            size="sm"
                            className="w-10 h-10"
                          />
                          <div className="min-w-0">
                            <button
                              type="button"
                              onClick={() => onNavigate(`/track/${track.id}`)}
                              className={`font-semibold truncate block text-left hover:underline cursor-pointer ${isCurrent ? 'text-[#FF0000]' : 'text-white'
                                }`}
                            >
                              {track.cleanTitle}
                            </button>
                            <button
                              type="button"
                              onClick={() => onNavigate(`/artist/${track.artistId}`)}
                              className="text-neutral-400 hover:text-white truncate block text-left cursor-pointer"
                            >
                              {track.artistName}
                            </button>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3 hidden md:table-cell text-neutral-400">
                        <button
                          type="button"
                          onClick={() => onNavigate(`/album/${track.albumId}`)}
                          className="hover:text-white truncate max-w-[200px] block cursor-pointer"
                        >
                          {track.albumName}
                        </button>
                      </td>
                      <td className="py-3 px-3 hidden sm:table-cell text-neutral-400">
                        <span>{track.language}</span>
                        {' · '}
                        <span className="text-neutral-500">{track.genre}</span>
                      </td>
                      <td className="py-3 px-3 text-right font-mono tabular-nums text-neutral-300">
                        {formatDuration(track.duration)}
                      </td>
                      <td className="py-3 pl-2 pr-4 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => onToggleLike(track.id)}
                            aria-label="Like track"
                            className={`p-1.5 rounded cursor-pointer ${isLiked ? 'text-[#FF0000]' : 'text-neutral-500 hover:text-white'
                              }`}
                          >
                            <Heart className={`w-4 h-4 ${isLiked ? 'fill-[#FF0000]' : ''}`} />
                          </button>
                          <button
                            type="button"
                            onClick={() => onAddToQueue(track)}
                            aria-label="Add to queue"
                            className="p-1.5 rounded text-neutral-500 hover:text-white cursor-pointer"
                          >
                            <ListPlus className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Matched Artists & Albums */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-[#0A0A0A] border border-neutral-800 rounded-xl p-5 space-y-3">
          <h3 className="text-base font-display font-semibold text-white">
            Artists ({matchedArtists.length})
          </h3>
          <div className="space-y-2">
            {matchedArtists.map((ar) => (
              <button
                key={ar.id}
                type="button"
                onClick={() => onNavigate(`/artist/${ar.id}`)}
                className="w-full p-2.5 rounded-lg hover:bg-neutral-900 flex items-center justify-between gap-3 text-left transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <ArtworkTile title={ar.name} thumbnailUrl={ar.avatarUrl} accentHex={ar.accentHex} size="sm" rounded="full" className="w-10 h-10" />
                  <div>
                    <p className="text-sm font-medium text-white">{ar.name}</p>
                    <p className="text-xs text-neutral-400">
                      {ar.primaryLanguage} · {ar.monthlyListenersLabel}
                    </p>
                  </div>
                </div>
                <span className="text-xs text-neutral-500">View →</span>
              </button>
            ))}
          </div>
        </div>

        <div className="bg-[#0A0A0A] border border-neutral-800 rounded-xl p-5 space-y-3">
          <h3 className="text-base font-display font-semibold text-white">
            Albums ({matchedAlbums.length})
          </h3>
          <div className="space-y-2">
            {matchedAlbums.map((al) => (
              <button
                key={al.id}
                type="button"
                onClick={() => onNavigate(`/album/${al.id}`)}
                className="w-full p-2.5 rounded-lg hover:bg-neutral-900 flex items-center justify-between gap-3 text-left transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <ArtworkTile title={al.title} thumbnailUrl={al.coverUrl} accentHex={al.accentHex} size="sm" className="w-10 h-10" />
                  <div>
                    <p className="text-sm font-medium text-white">{al.title}</p>
                    <p className="text-xs text-neutral-400">
                      {al.artistName} · {al.releaseYear} · {al.language}
                    </p>
                  </div>
                </div>
                <span className="text-xs text-neutral-500">View →</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/* 3. Track, Artist, and Album Detail Views                                   */
/* -------------------------------------------------------------------------- */
interface EntityDetailViewProps {
  entityType: 'track' | 'artist' | 'album';
  entityId: string;
  tracks: Track[];
  artists: Artist[];
  albums: Album[];
  likedTrackIds: string[];
  savedAlbumIds: string[];
  followedArtistIds: string[];
  onPlayTrack: (track: Track, contextQueue?: Track[]) => void;
  onAddToQueue: (track: Track) => void;
  onToggleLike: (trackId: string) => void;
  onToggleSaveAlbum: (albumId: string) => void;
  onToggleFollowArtist: (artistId: string) => void;
  onNavigate: (path: RoutePath) => void;
}

export const EntityDetailView: React.FC<EntityDetailViewProps> = ({
  entityType,
  entityId,
  tracks,
  artists,
  albums,
  likedTrackIds,
  savedAlbumIds,
  followedArtistIds,
  onPlayTrack,
  onAddToQueue,
  onToggleLike,
  onToggleSaveAlbum,
  onToggleFollowArtist,
  onNavigate,
}) => {
  if (entityType === 'track') {
    const track = tracks.find((t) => t.id === entityId) || tracks[0];
    const isLiked = likedTrackIds.includes(track.id);
    const artistTracks = tracks.filter((t) => t.artistId === track.artistId && t.visibleInCatalog);

    return (
      <div className="space-y-8 pb-8">
        <div className="bg-gradient-to-br from-[#830000]/40 via-[#0A0A0A] to-black border border-neutral-800 rounded-2xl p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center gap-6">
          <ArtworkTile
            title={track.cleanTitle}
            thumbnailUrl={track.thumbnailUrl}
            size="xl"
            className="w-44 h-44 sm:w-52 sm:h-52 shadow-2xl"
          />
          <div className="space-y-3 flex-1">
            <p className="text-xs text-neutral-400">
              Song · {track.language} · {track.genre}
            </p>
            <h1 className="text-2xl sm:text-4xl font-display font-bold text-white">
              {track.cleanTitle}
            </h1>
            <div className="flex flex-wrap items-center gap-2 text-sm text-neutral-300">
              <button
                type="button"
                onClick={() => onNavigate(`/artist/${track.artistId}`)}
                className="font-semibold text-white hover:text-[#FF0000] underline cursor-pointer"
              >
                {track.artistName}
              </button>
              <span aria-hidden="true">·</span>
              <button
                type="button"
                onClick={() => onNavigate(`/album/${track.albumId}`)}
                className="hover:text-white underline cursor-pointer"
              >
                {track.albumName}
              </button>
              <span aria-hidden="true">·</span>
              <span>{track.releaseYear}</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono tabular-nums">{formatDuration(track.duration)}</span>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => onPlayTrack(track, artistTracks)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#BC0202] hover:bg-[#FF0000] text-white text-sm font-semibold transition-colors cursor-pointer"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>Play</span>
              </button>
              <button
                type="button"
                onClick={() => onToggleLike(track.id)}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-black border border-neutral-800 text-xs font-medium text-white hover:border-[#FF0000] cursor-pointer"
              >
                <Heart className={`w-4 h-4 ${isLiked ? 'fill-[#FF0000] text-[#FF0000]' : ''}`} />
                <span>{isLiked ? 'Saved in Liked Songs' : 'Like'}</span>
              </button>
              <button
                type="button"
                onClick={() => onAddToQueue(track)}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-black border border-neutral-800 text-xs font-medium text-neutral-300 hover:text-white cursor-pointer"
              >
                <ListPlus className="w-4 h-4" />
                <span>Add to Queue</span>
              </button>
            </div>
          </div>
        </div>

        {/* Track Credits & Info */}
        <div className="bg-[#0A0A0A] border border-neutral-800 rounded-xl p-5 space-y-3">
          <h2 className="text-base font-display font-semibold text-white">
            Credits & Release Details
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="p-3.5 rounded-lg bg-black border border-neutral-800">
              <p className="text-neutral-500">Label</p>
              <p className="text-white font-medium mt-0.5">{track.uploader}</p>
            </div>
            <div className="p-3.5 rounded-lg bg-black border border-neutral-800">
              <p className="text-neutral-500">Language & Genre</p>
              <p className="text-white font-medium mt-0.5">
                {track.language} · {track.genre}
              </p>
            </div>
            <div className="p-3.5 rounded-lg bg-black border border-neutral-800">
              <p className="text-neutral-500">Release Year</p>
              <p className="text-white font-medium font-mono tabular-nums mt-0.5">
                {track.releaseYear}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (entityType === 'artist') {
    const artist = artists.find((a) => a.id === entityId) || artists[0];
    const artistTracks = tracks.filter((t) => t.artistId === artist.id && t.visibleInCatalog);
    const artistAlbums = albums.filter((al) => al.artistId === artist.id);
    const isFollowed = followedArtistIds.includes(artist.id);

    return (
      <div className="space-y-8 pb-8">
        <div className="bg-gradient-to-br from-[#830000]/35 via-[#0A0A0A] to-black border border-neutral-800 rounded-2xl p-6 sm:p-8 flex flex-col sm:flex-row items-center gap-6">
          <ArtworkTile
            title={artist.name}
            thumbnailUrl={artist.avatarUrl}
            accentHex={artist.accentHex}
            size="xl"
            rounded="full"
            className="w-36 h-36 sm:w-44 sm:h-44"
          />
          <div className="space-y-3 flex-1 text-center sm:text-left">
            <p className="text-xs text-neutral-400">
              Artist · {artist.primaryLanguage} · {artist.monthlyListenersLabel}
            </p>
            <h1 className="text-3xl font-display font-bold text-white">{artist.name}</h1>
            <p className="text-sm text-neutral-300 max-w-2xl">{artist.bio}</p>
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 pt-1">
              {artistTracks.length > 0 && (
                <button
                  type="button"
                  onClick={() => onPlayTrack(artistTracks[0], artistTracks)}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-[#BC0202] hover:bg-[#FF0000] text-white text-xs font-semibold cursor-pointer"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>Play Top Songs</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => onToggleFollowArtist(artist.id)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-black border border-neutral-800 text-xs font-medium text-white hover:border-[#FF0000] cursor-pointer"
              >
                {isFollowed ? (
                  <>
                    <UserCheck className="w-4 h-4 text-[#FF0000]" />
                    <span>Following</span>
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" />
                    <span>Follow</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        <div className="bg-[#0A0A0A] border border-neutral-800 rounded-xl p-5 space-y-4">
          <h2 className="text-base font-display font-semibold text-white">
            Popular Songs
          </h2>
          <div className="divide-y divide-neutral-800/70">
            {artistTracks.map((t, i) => (
              <div key={t.id} className="py-3 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono tabular-nums text-neutral-500 w-5">
                    {i + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => onPlayTrack(t, artistTracks)}
                    className="text-sm font-medium text-white hover:text-[#FF0000] text-left cursor-pointer"
                  >
                    {t.cleanTitle}
                  </button>
                </div>
                <span className="text-xs font-mono tabular-nums text-neutral-400">
                  {formatDuration(t.duration)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {artistAlbums.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-base font-display font-semibold text-white">Albums</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {artistAlbums.map((al) => (
                <button
                  key={al.id}
                  type="button"
                  onClick={() => onNavigate(`/album/${al.id}`)}
                  className="p-3.5 rounded-xl bg-[#0A0A0A] border border-neutral-800 text-left space-y-2 hover:border-[#830000] cursor-pointer"
                >
                  <ArtworkTile title={al.title} thumbnailUrl={al.coverUrl} accentHex={al.accentHex} className="w-full aspect-square" />
                  <p className="text-sm font-semibold text-white truncate">{al.title}</p>
                  <p className="text-xs text-neutral-400">{al.releaseYear}</p>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Album detail
  const album = albums.find((a) => a.id === entityId) || albums[0];
  const albumTracks = tracks.filter((t) => album.trackIds.includes(t.id) && t.visibleInCatalog);
  const isSaved = savedAlbumIds.includes(album.id);

  return (
    <div className="space-y-8 pb-8">
      <div className="bg-gradient-to-br from-[#830000]/35 via-[#0A0A0A] to-black border border-neutral-800 rounded-2xl p-6 sm:p-8 flex flex-col sm:flex-row items-center gap-6">
        <ArtworkTile title={album.title} thumbnailUrl={album.coverUrl} accentHex={album.accentHex} size="xl" className="w-44 h-44 shadow-2xl" />
        <div className="space-y-3 flex-1">
          <p className="text-xs text-neutral-400">
            Album · {album.language} · {album.releaseYear}
          </p>
          <h1 className="text-2xl sm:text-4xl font-display font-bold text-white">{album.title}</h1>
          <p className="text-sm text-neutral-300">
            By{' '}
            <button
              type="button"
              onClick={() => onNavigate(`/artist/${album.artistId}`)}
              className="text-white underline hover:text-[#FF0000] cursor-pointer"
            >
              {album.artistName}
            </button>{' '}
            · {albumTracks.length} songs
          </p>
          <div className="flex flex-wrap items-center gap-3 pt-1">
            {albumTracks.length > 0 && (
              <button
                type="button"
                onClick={() => onPlayTrack(albumTracks[0], albumTracks)}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-[#BC0202] hover:bg-[#FF0000] text-white text-xs font-semibold cursor-pointer"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>Play Album</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => onToggleSaveAlbum(album.id)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-black border border-neutral-800 text-xs font-medium text-white hover:border-[#FF0000] cursor-pointer"
            >
              <Check className={`w-4 h-4 ${isSaved ? 'text-[#FF0000]' : 'opacity-40'}`} />
              <span>{isSaved ? 'Saved in Library' : 'Save Album'}</span>
            </button>
          </div>
        </div>
      </div>

      <div className="bg-[#0A0A0A] border border-neutral-800 rounded-xl p-5 space-y-3">
        <h2 className="text-base font-display font-semibold text-white">Tracklist</h2>
        <div className="divide-y divide-neutral-800/70">
          {albumTracks.map((t, idx) => (
            <div key={t.id} className="py-3 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="text-xs font-mono tabular-nums text-neutral-500 w-5">
                  {idx + 1}
                </span>
                <div>
                  <button
                    type="button"
                    onClick={() => onPlayTrack(t, albumTracks)}
                    className="text-sm font-medium text-white hover:text-[#FF0000] text-left cursor-pointer"
                  >
                    {t.cleanTitle}
                  </button>
                  <p className="text-xs text-neutral-400">{t.artistName}</p>
                </div>
              </div>
              <span className="text-xs font-mono tabular-nums text-neutral-400">
                {formatDuration(t.duration)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/* 4. Authenticated Library & Playlists Views                                 */
/* -------------------------------------------------------------------------- */
interface LibraryAndPlaylistsViewProps {
  route: RoutePath;
  currentUser: UserAccount | null;
  tracks: Track[];
  albums: Album[];
  artists: Artist[];
  likedTrackIds: string[];
  savedAlbumIds: string[];
  followedArtistIds: string[];
  history: ListeningEvent[];
  playlists: Playlist[];
  onPlayTrack: (track: Track, contextQueue?: Track[]) => void;
  onToggleLike: (trackId: string) => void;
  onClearHistory: () => void;
  onCreatePlaylist: (name: string, description: string, isPublic: boolean) => void;
  onRenamePlaylist: (playlistId: string, name: string, description: string, isPublic: boolean) => void;
  onDeletePlaylist: (playlistId: string) => void;
  onRemoveTrackFromPlaylist: (playlistId: string, trackId: string) => void;
  onMovePlaylistTrack: (playlistId: string, index: number, dir: 'up' | 'down') => void;
  onNavigate: (path: RoutePath) => void;
  onNotify: (msg: string) => void;
}

export const LibraryAndPlaylistsView: React.FC<LibraryAndPlaylistsViewProps> = ({
  route,
  currentUser,
  tracks,
  albums,
  artists,
  likedTrackIds,
  savedAlbumIds,
  followedArtistIds,
  history,
  playlists,
  onPlayTrack,
  onToggleLike,
  onClearHistory,
  onCreatePlaylist,
  onRenamePlaylist,
  onDeletePlaylist,
  onRemoveTrackFromPlaylist,
  onMovePlaylistTrack,
  onNavigate,
  onNotify,
}) => {
  const [newPlName, setNewPlName] = useState('');
  const [newPlDesc, setNewPlDesc] = useState('');
  const [newPlPublic, setNewPlPublic] = useState(false);
  const [editingPlId, setEditingPlId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editPublic, setEditPublic] = useState(false);

  if (!currentUser) {
    return (
      <AuthGuardCard
        currentUser={null}
        onNavigate={onNavigate}
        featureName="your Library & Playlists"
      />
    );
  }

  const likedTracks = tracks.filter((t) => likedTrackIds.includes(t.id));
  const savedAlbums = albums.filter((a) => savedAlbumIds.includes(a.id));
  const followedArtists = artists.filter((ar) => followedArtistIds.includes(ar.id));

  // Specific Playlist Detail Route (/playlist/[id])
  if (route.startsWith('/playlist/')) {
    const plId = route.replace('/playlist/', '');
    const playlist = playlists.find((p) => p.id === plId) || playlists[0];
    if (!playlist) {
      return (
        <div className="p-8 text-center">
          <p className="text-sm text-neutral-400">Playlist not found.</p>
        </div>
      );
    }
    const plTracks = playlist.trackIds
      .map((id) => tracks.find((t) => t.id === id))
      .filter((t): t is Track => Boolean(t));

    return (
      <div className="space-y-6 pb-8">
        <div className="bg-gradient-to-br from-[#830000]/35 via-[#0A0A0A] to-black border border-neutral-800 rounded-2xl p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs text-neutral-400">
              <span>Playlist</span>
              <span aria-hidden="true">·</span>
              <span>{playlist.isPublic ? 'Public' : 'Private'}</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-display font-bold text-white">
              {playlist.name}
            </h1>
            <p className="text-sm text-neutral-300 max-w-2xl">{playlist.description}</p>
            <p className="text-xs text-neutral-400">
              Created by {playlist.ownerName} · {plTracks.length} songs
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            {plTracks.length > 0 && (
              <button
                type="button"
                onClick={() => onPlayTrack(plTracks[0], plTracks)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#BC0202] hover:bg-[#FF0000] text-white text-xs font-semibold cursor-pointer"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>Play</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                setEditingPlId(playlist.id);
                setEditName(playlist.name);
                setEditDesc(playlist.description);
                setEditPublic(playlist.isPublic);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-lg bg-black border border-neutral-800 text-xs text-neutral-200 hover:border-neutral-700 cursor-pointer"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Edit</span>
            </button>
            {playlist.isPublic && (
              <button
                type="button"
                onClick={() => onNotify(`Share link copied for "${playlist.name}"`)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-lg bg-black border border-neutral-800 text-xs text-neutral-200 hover:border-[#FF0000] cursor-pointer"
              >
                <Share2 className="w-3.5 h-3.5 text-[#FF0000]" />
                <span>Share</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                onDeletePlaylist(playlist.id);
                onNavigate('/playlists');
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-lg bg-black border border-neutral-800 text-xs text-neutral-400 hover:text-[#FF0000] cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete</span>
            </button>
          </div>
        </div>

        {editingPlId === playlist.id && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              onRenamePlaylist(playlist.id, editName, editDesc, editPublic);
              setEditingPlId(null);
            }}
            className="bg-[#0A0A0A] border border-[#BC0202]/60 rounded-xl p-5 space-y-4"
          >
            <h3 className="text-sm font-semibold text-white">Edit Playlist</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <input
                type="text"
                required
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="px-3.5 py-2 rounded-lg bg-black border border-neutral-800 text-sm text-white"
              />
              <input
                type="text"
                value={editDesc}
                onChange={(e) => setEditDesc(e.target.value)}
                className="px-3.5 py-2 rounded-lg bg-black border border-neutral-800 text-sm text-white"
              />
            </div>
            <label className="flex items-center gap-2 text-xs text-neutral-300 cursor-pointer">
              <input
                type="checkbox"
                checked={editPublic}
                onChange={(e) => setEditPublic(e.target.checked)}
                className="accent-[#BC0202]"
              />
              <span>Allow sharing via link</span>
            </label>
            <div className="flex items-center gap-2">
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-[#BC0202] text-white text-xs font-semibold cursor-pointer"
              >
                Save Changes
              </button>
              <button
                type="button"
                onClick={() => setEditingPlId(null)}
                className="px-4 py-2 rounded-lg bg-neutral-900 text-neutral-400 text-xs cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {/* Ordered Playlist Tracks */}
        <div className="bg-[#0A0A0A] border border-neutral-800 rounded-xl p-5 space-y-3">
          <h2 className="text-base font-display font-semibold text-white">
            Songs
          </h2>
          {plTracks.length === 0 ? (
            <p className="text-xs text-neutral-400 py-4">
              This playlist is empty. Use the `+` button on any song to add tracks.
            </p>
          ) : (
            <div className="divide-y divide-neutral-800/70">
              {plTracks.map((t, idx) => (
                <div
                  key={`${t.id}-${idx}`}
                  className="py-3 flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-xs font-mono tabular-nums text-neutral-500 w-5">
                      {idx + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => onPlayTrack(t, plTracks)}
                      className="text-left min-w-0 cursor-pointer"
                    >
                      <p className="text-sm font-medium text-white hover:text-[#FF0000] truncate">
                        {t.cleanTitle}
                      </p>
                      <p className="text-xs text-neutral-400 truncate">
                        {t.artistName} · {t.language}
                      </p>
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-xs font-mono tabular-nums text-neutral-400 mr-2">
                      {formatDuration(t.duration)}
                    </span>
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => onMovePlaylistTrack(playlist.id, idx, 'up')}
                      className="p-1.5 rounded bg-neutral-900 text-neutral-400 hover:text-white disabled:opacity-30 cursor-pointer"
                      aria-label="Move track up"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={idx === plTracks.length - 1}
                      onClick={() => onMovePlaylistTrack(playlist.id, idx, 'down')}
                      className="p-1.5 rounded bg-neutral-900 text-neutral-400 hover:text-white disabled:opacity-30 cursor-pointer"
                      aria-label="Move track down"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onRemoveTrackFromPlaylist(playlist.id, t.id)}
                      className="p-1.5 rounded bg-neutral-900 text-neutral-400 hover:text-[#FF0000] cursor-pointer"
                      aria-label="Remove track from playlist"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Dedicated Playlists View (/playlists)
  if (route === '/playlists') {
    return (
      <div className="space-y-6 pb-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-800">
          <div>
            <h1 className="text-2xl font-display font-bold text-white">Your Playlists</h1>
            <p className="text-xs text-neutral-400">
              Create, organize, and listen to custom playlists for {currentUser.displayName}
            </p>
          </div>
        </div>

        {/* Create Playlist Form & Playlists Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 bg-[#0A0A0A] border border-neutral-800 rounded-xl p-5 space-y-4">
            <div className="flex items-center gap-2 text-white">
              <FolderPlus className="w-4 h-4 text-[#FF0000]" />
              <h2 className="text-base font-display font-semibold">Create Playlist</h2>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!newPlName.trim()) return;
                onCreatePlaylist(
                  newPlName.trim(),
                  newPlDesc.trim() || 'Personal playlist',
                  newPlPublic
                );
                setNewPlName('');
                setNewPlDesc('');
                setNewPlPublic(false);
              }}
              className="space-y-3"
            >
              <input
                type="text"
                required
                placeholder="Playlist title"
                value={newPlName}
                onChange={(e) => setNewPlName(e.target.value)}
                className="w-full px-3.5 py-2 rounded-lg bg-black border border-neutral-800 text-sm text-white focus:border-[#FF0000] focus:outline-none"
              />
              <input
                type="text"
                placeholder="Description (optional)"
                value={newPlDesc}
                onChange={(e) => setNewPlDesc(e.target.value)}
                className="w-full px-3.5 py-2 rounded-lg bg-black border border-neutral-800 text-sm text-white focus:border-[#FF0000] focus:outline-none"
              />
              <label className="flex items-center gap-2 text-xs text-neutral-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={newPlPublic}
                  onChange={(e) => setNewPlPublic(e.target.checked)}
                  className="accent-[#BC0202]"
                />
                <span>Make playlist shareable</span>
              </label>
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-[#BC0202] hover:bg-[#FF0000] text-white text-xs font-semibold transition-colors cursor-pointer"
              >
                Create Playlist
              </button>
            </form>
          </div>

          <div className="lg:col-span-7">
            {playlists.length === 0 ? (
              <div className="p-8 text-center bg-[#0A0A0A] border border-neutral-800 rounded-xl">
                <p className="text-sm text-neutral-400">No playlists yet. Create your first playlist using the form.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {playlists.map((pl) => (
                  <button
                    key={pl.id}
                    type="button"
                    onClick={() => onNavigate(`/playlist/${pl.id}` as RoutePath)}
                    className="p-4 rounded-xl bg-[#0A0A0A] hover:bg-gradient-to-br hover:from-[#830000]/25 hover:to-[#0A0A0A] border border-neutral-800 text-left flex flex-col justify-between gap-4 transition-colors cursor-pointer group"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-[11px] text-neutral-400">
                        <span className="px-2 py-0.5 rounded bg-neutral-900 border border-neutral-800 text-neutral-300">
                          {pl.isPublic ? 'Public' : 'Private'}
                        </span>
                        <span>{pl.trackIds.length} songs</span>
                      </div>
                      <h3 className="text-base font-display font-bold text-white group-hover:text-[#FF0000] transition-colors">
                        {pl.name}
                      </h3>
                      <p className="text-xs text-neutral-400 line-clamp-2">{pl.description}</p>
                    </div>
                    <span className="text-xs text-[#FF0000] font-medium group-hover:translate-x-1 transition-transform inline-block">
                      Open Playlist →
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Dedicated Library View (/library)
  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-800">
        <div>
          <h1 className="text-2xl font-display font-bold text-white">Your Library</h1>
          <p className="text-xs text-neutral-400">
            Personal music collection and catalog for {currentUser.displayName}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {tracks.length > 0 && (
            <button
              type="button"
              onClick={() => onPlayTrack(tracks[0], tracks)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#BC0202] hover:bg-[#FF0000] text-white text-xs font-semibold cursor-pointer shadow-[0_0_15px_rgba(255,0,0,0.35)] transition-all"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Play Library</span>
            </button>
          )}
        </div>
      </div>

      {/* Quick Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="bg-[#0A0A0A] border border-neutral-800 rounded-xl p-4">
          <p className="text-xs text-neutral-400">Library Songs</p>
          <p className="text-2xl font-bold font-mono text-white mt-1">{tracks.length}</p>
          <p className="text-[11px] text-neutral-500 mt-0.5">Ready to stream</p>
        </div>
        <div className="bg-[#0A0A0A] border border-neutral-800 rounded-xl p-4">
          <p className="text-xs text-neutral-400">Followed Artists</p>
          <p className="text-2xl font-bold font-mono text-white mt-1">{followedArtists.length}</p>
          <p className="text-[11px] text-neutral-500 mt-0.5">Artists you track</p>
        </div>
        <div className="col-span-2 sm:col-span-1 bg-[#0A0A0A] border border-neutral-800 rounded-xl p-4">
          <p className="text-xs text-neutral-400">Custom Playlists</p>
          <p className="text-2xl font-bold font-mono text-[#FF0000] mt-1">{playlists.length}</p>
          <p className="text-[11px] text-neutral-500 mt-0.5">
            <button
              type="button"
              onClick={() => onNavigate('/playlists')}
              className="text-[#FF0000] hover:underline cursor-pointer"
            >
              Manage Playlists →
            </button>
          </p>
        </div>
      </div>

      {/* Followed Artists Section */}
      {followedArtists.length > 0 && (
        <div className="bg-[#0A0A0A] border border-neutral-800 rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-display font-semibold text-white">
              Followed Artists ({followedArtists.length})
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {followedArtists.map((ar) => (
              <button
                key={ar.id}
                type="button"
                onClick={() => onNavigate(`/artist/${ar.id}` as RoutePath)}
                className="p-3 rounded-lg bg-black border border-neutral-800/80 hover:border-[#BC0202]/60 hover:bg-neutral-900/60 flex items-center justify-between text-left cursor-pointer transition-colors"
              >
                <div>
                  <p className="text-sm font-semibold text-white">{ar.name}</p>
                  <p className="text-xs text-neutral-400">{ar.primaryLanguage}</p>
                </div>
                <span className="text-xs text-[#FF0000]">View →</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Library Tracks Collection */}
      <div className="bg-[#0A0A0A] border border-neutral-800 rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-display font-semibold text-white">
            Library Songs ({tracks.length})
          </h2>
          {tracks.length > 0 && (
            <button
              type="button"
              onClick={() => {
                const shuffled = [...tracks].sort(() => Math.random() - 0.5);
                onPlayTrack(shuffled[0], shuffled);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-xs text-neutral-300 hover:text-white border border-neutral-800 cursor-pointer"
            >
              <Shuffle className="w-3.5 h-3.5" />
              <span>Shuffle</span>
            </button>
          )}
        </div>

        <div className="divide-y divide-neutral-800/70">
          {tracks.map((t, idx) => {
            const isLiked = likedTrackIds.includes(t.id);
            return (
              <div key={t.id} className="py-2.5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-xs font-mono tabular-nums text-neutral-500 w-5">
                    {idx + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => onPlayTrack(t, tracks)}
                    className="text-left min-w-0 cursor-pointer"
                  >
                    <p className="text-sm font-medium text-white hover:text-[#FF0000] truncate">
                      {t.cleanTitle}
                    </p>
                    <p className="text-xs text-neutral-400 truncate">
                      {t.artistName} · {t.language}
                    </p>
                  </button>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-xs font-mono tabular-nums text-neutral-400">
                    {formatDuration(t.duration)}
                  </span>
                  <button
                    type="button"
                    onClick={() => onToggleLike(t.id)}
                    className={`p-1 rounded cursor-pointer transition-colors ${
                      isLiked ? 'text-[#FF0000]' : 'text-neutral-500 hover:text-white'
                    }`}
                    aria-label={isLiked ? 'Unlike song' : 'Like song'}
                  >
                    <Heart className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/* 5. Profile, Settings, Stats, Liked Songs & History Views                   */
/* -------------------------------------------------------------------------- */
interface ProfileSettingsStatsViewProps {
  route: RoutePath;
  currentUser: UserAccount | null;
  tracks: Track[];
  albums: Album[];
  artists: Artist[];
  likedTrackIds: string[];
  savedAlbumIds: string[];
  history: ListeningEvent[];
  playlists: Playlist[];
  themeMode: ThemeMode;
  onSetThemeMode: (mode: ThemeMode) => void;
  onUpdateProfile: (displayName: string, bio: string, privateHistory: boolean, publicProfile: boolean) => void;
  onLogout: () => void;
  onPlayTrack: (track: Track, contextQueue?: Track[]) => void;
  onToggleLike: (trackId: string) => void;
  onClearHistory: () => void;
  onNavigate: (path: RoutePath) => void;
  onNotify: (msg: string) => void;
}

export const ProfileSettingsStatsView: React.FC<ProfileSettingsStatsViewProps> = ({
  route,
  currentUser,
  tracks,
  albums,
  artists,
  likedTrackIds,
  savedAlbumIds,
  history,
  playlists,
  themeMode,
  onSetThemeMode,
  onUpdateProfile,
  onLogout,
  onPlayTrack,
  onToggleLike,
  onClearHistory,
  onNavigate,
  onNotify,
}) => {
  const [nameInput, setNameInput] = useState(currentUser?.displayName || 'User');
  const [bioInput, setBioInput] = useState(
    currentUser?.bio || 'Exploring Hindi, Tamil, Punjabi, and electronic soundscapes.'
  );
  const [privHistory, setPrivHistory] = useState(currentUser?.privateHistory ?? true);
  const [pubProfile, setPubProfile] = useState(currentUser?.publicProfile ?? false);
  const [statsTimeframe, setStatsTimeframe] = useState<'weekly' | 'monthly' | 'yearly'>('monthly');
  const [showAnnualRecap, setShowAnnualRecap] = useState(false);

  // Tab Selection
  type ProfileTab = 'profile' | 'overview' | 'liked' | 'albums' | 'history' | 'settings';
  const getInitialTab = (): ProfileTab => {
    if (route === '/settings') return 'settings';
    if (route === '/stats') return 'overview';
    if (route === '/library/liked') return 'liked';
    if (route === '/library/albums') return 'albums';
    if (route === '/library/history') return 'history';
    return 'profile';
  };

  const [activeTab, setActiveTab] = useState<ProfileTab>(getInitialTab);

  useEffect(() => {
    if (route === '/settings') setActiveTab('settings');
    else if (route === '/stats') setActiveTab('overview');
    else if (route === '/library/liked') setActiveTab('liked');
    else if (route === '/library/albums') setActiveTab('albums');
    else if (route === '/library/history') setActiveTab('history');
    else if (route === '/profile') setActiveTab('profile');
  }, [route]);

  if (!currentUser) {
    return (
      <AuthGuardCard
        currentUser={null}
        onNavigate={onNavigate}
        featureName="Profile, Liked Songs & Settings"
      />
    );
  }

  const likedTracks = tracks.filter((t) => likedTrackIds.includes(t.id));
  const savedAlbums = albums.filter((a) => savedAlbumIds.includes(a.id));

  const totalSeconds = history.reduce((acc, e) => acc + e.listenedSeconds, 0);
  const multiplier = statsTimeframe === 'weekly' ? 1 : statsTimeframe === 'monthly' ? 4 : 42;
  const totalMinutes = Math.round((totalSeconds * multiplier) / 60);

  const profileTabs: { id: ProfileTab; label: string; icon: React.FC<{ className?: string }> }[] = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'overview', label: 'Overview', icon: BarChart2 },
    { id: 'liked', label: `Liked Songs (${likedTracks.length})`, icon: Heart },
    { id: 'albums', label: `Saved Albums (${savedAlbums.length})`, icon: Disc },
    { id: 'history', label: `History (${history.length})`, icon: History },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Profile Header Card */}
      <div className="bg-[#0A0A0A] border border-neutral-800 rounded-2xl p-6 sm:p-7 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#830000] via-[#BC0202] to-[#FF0000] flex items-center justify-center text-white text-2xl font-bold font-display shadow-[0_0_20px_rgba(255,0,0,0.4)] shrink-0">
            {currentUser.displayName ? currentUser.displayName[0].toUpperCase() : 'U'}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-display font-bold text-white">{currentUser.displayName}</h1>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-neutral-900 border border-neutral-800 text-neutral-400 capitalize">
                {currentUser.role}
              </span>
            </div>
            <p className="text-xs text-neutral-400 mt-0.5">{currentUser.email}</p>
            <p className="text-xs text-neutral-500 mt-1 line-clamp-1">{currentUser.bio}</p>
          </div>
        </div>

        {/* Quick stat counters */}
        <div className="flex items-center gap-4 sm:gap-6 shrink-0 text-center sm:text-right">
          <div>
            <p className="text-base sm:text-lg font-bold font-mono text-white">{likedTracks.length}</p>
            <p className="text-[11px] text-neutral-400">Liked Songs</p>
          </div>
          <div className="w-px h-8 bg-neutral-800" />
          <div>
            <p className="text-base sm:text-lg font-bold font-mono text-white">{playlists.length}</p>
            <p className="text-[11px] text-neutral-400">Playlists</p>
          </div>
          <div className="w-px h-8 bg-neutral-800" />
          <div>
            <p className="text-base sm:text-lg font-bold font-mono text-white">{history.length}</p>
            <p className="text-[11px] text-neutral-400">History</p>
          </div>
        </div>
      </div>

      {/* Tabs Switcher Navigation */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-neutral-800 scrollbar-none">
        {profileTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 transition-all cursor-pointer ${
                isActive
                  ? 'bg-[#BC0202] text-white shadow-[0_0_15px_rgba(255,0,0,0.35)]'
                  : 'bg-[#0A0A0A] hover:bg-neutral-900 text-neutral-400 hover:text-white border border-neutral-800'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-neutral-400'}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* 1. Tab: Profile */}
      {activeTab === 'profile' && (
        <div className="bg-[#0A0A0A] border border-neutral-800 rounded-xl p-6 space-y-5 animate-in fade-in duration-150">
          <div className="border-b border-neutral-800 pb-3">
            <h2 className="text-base font-display font-semibold text-white">Profile Details</h2>
            <p className="text-xs text-neutral-400">Update your public listener identity</p>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              onUpdateProfile(nameInput, bioInput, privHistory, pubProfile);
            }}
            className="space-y-4"
          >
            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1">Display Name</label>
              <input
                type="text"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg bg-black border border-neutral-800 text-sm text-white focus:border-[#FF0000] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1">Bio</label>
              <textarea
                rows={3}
                value={bioInput}
                onChange={(e) => setBioInput(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg bg-black border border-neutral-800 text-sm text-white focus:border-[#FF0000] focus:outline-none"
              />
            </div>
            <div className="space-y-2.5 text-xs text-neutral-300 pt-2 border-t border-neutral-800">
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={privHistory}
                  onChange={(e) => setPrivHistory(e.target.checked)}
                  className="accent-[#BC0202] w-4 h-4"
                />
                <span>Keep listening history private</span>
              </label>
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={pubProfile}
                  onChange={(e) => setPubProfile(e.target.checked)}
                  className="accent-[#BC0202] w-4 h-4"
                />
                <span>Allow public profile discovery</span>
              </label>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-neutral-800">
              <button
                type="submit"
                className="px-5 py-2.5 rounded-lg bg-[#BC0202] hover:bg-[#FF0000] text-white text-xs font-semibold cursor-pointer shadow-sm transition-colors"
              >
                Save Changes
              </button>
              <button
                type="button"
                onClick={() => {
                  onLogout();
                  onNotify('Account deletion requested.');
                }}
                className="text-xs text-neutral-500 hover:text-[#FF0000] cursor-pointer"
              >
                Delete Account
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 2. Tab: Overview / Stats */}
      {activeTab === 'overview' && (
        <div className="space-y-5 animate-in fade-in duration-150">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-neutral-800">
            <div>
              <h2 className="text-base font-display font-semibold text-white">Listening Statistics</h2>
              <p className="text-xs text-neutral-400">Personal activity and breakdown</p>
            </div>
            <div className="flex items-center gap-2">
              {(['weekly', 'monthly', 'yearly'] as const).map((tf) => (
                <button
                  key={tf}
                  type="button"
                  onClick={() => setStatsTimeframe(tf)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize cursor-pointer transition-colors ${
                    statsTimeframe === tf
                      ? 'bg-[#BC0202] text-white'
                      : 'bg-[#0A0A0A] text-neutral-400 border border-neutral-800'
                  }`}
                >
                  {tf}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setShowAnnualRecap((prev) => !prev)}
                className="px-3.5 py-1.5 rounded-lg bg-[#830000]/40 border border-[#FF0000] text-white text-xs font-semibold cursor-pointer"
              >
                {showAnnualRecap ? 'Close Recap' : '2026 Recap'}
              </button>
            </div>
          </div>

          {showAnnualRecap && (
            <div className="p-6 sm:p-7 rounded-2xl bg-gradient-to-r from-[#830000]/60 via-[#BC0202]/25 to-black border border-[#FF0000] space-y-2 shadow-2xl">
              <p className="text-xs font-mono text-[#FF0000] uppercase font-bold">2026 Annual Recap</p>
              <h3 className="text-xl font-display font-bold text-white">
                Your Top Soundscape: Multilingual Nocturnes & Soundtracks
              </h3>
              <p className="text-xs sm:text-sm text-neutral-200 max-w-2xl">
                You listened across 5 languages with Sachin-Jigar and A.R. Rahman leading your late-night sessions.
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-[#0A0A0A] border border-neutral-800 rounded-xl p-5 space-y-1">
              <p className="text-xs text-neutral-400">Listening Time ({statsTimeframe})</p>
              <p className="text-3xl font-display font-bold font-mono tabular-nums text-white">
                {totalMinutes} mins
              </p>
              <p className="text-xs text-neutral-500">97% average completion</p>
            </div>
            <div className="bg-[#0A0A0A] border border-neutral-800 rounded-xl p-5 space-y-1">
              <p className="text-xs text-neutral-400">Top Languages</p>
              <p className="text-3xl font-display font-bold text-white">Hindi & Tamil</p>
              <p className="text-xs text-neutral-500">Followed by Punjabi & English</p>
            </div>
            <div className="bg-[#0A0A0A] border border-neutral-800 rounded-xl p-5 space-y-1">
              <p className="text-xs text-neutral-400">Top Artist</p>
              <p className="text-3xl font-display font-bold text-[#FF0000]">Sachin-Jigar</p>
              <p className="text-xs text-neutral-500">Stree 2 Soundtrack</p>
            </div>
          </div>

          <div className="bg-[#0A0A0A] border border-neutral-800 rounded-xl p-5 space-y-3">
            <h3 className="text-sm font-display font-semibold text-white">
              Most Played Songs ({statsTimeframe})
            </h3>
            <div className="divide-y divide-neutral-800/70 text-xs">
              {tracks.slice(0, 5).map((t, i) => (
                <div key={t.id} className="py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="font-mono tabular-nums text-neutral-500 w-5">{i + 1}</span>
                    <button
                      type="button"
                      onClick={() => onPlayTrack(t, tracks)}
                      className="text-left cursor-pointer truncate"
                    >
                      <p className="text-sm font-medium text-white hover:text-[#FF0000] truncate">{t.cleanTitle}</p>
                      <p className="text-neutral-400">{t.artistName} · {t.language}</p>
                    </button>
                  </div>
                  <span className="font-mono tabular-nums text-neutral-300 shrink-0 ml-2">
                    {(6 - i) * multiplier} plays
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 3. Tab: Liked Songs */}
      {activeTab === 'liked' && (
        <div className="bg-[#0A0A0A] border border-neutral-800 rounded-xl p-5 space-y-4 animate-in fade-in duration-150">
          <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
            <div>
              <h2 className="text-base font-display font-semibold text-white">
                Liked Songs ({likedTracks.length})
              </h2>
              <p className="text-xs text-neutral-400">Your favorite tracks saved with heart</p>
            </div>
            {likedTracks.length > 0 && (
              <button
                type="button"
                onClick={() => onPlayTrack(likedTracks[0], likedTracks)}
                className="px-3.5 py-1.5 rounded-lg bg-[#BC0202] hover:bg-[#FF0000] text-white text-xs font-semibold cursor-pointer shadow-sm transition-colors"
              >
                Play All
              </button>
            )}
          </div>

          {likedTracks.length === 0 ? (
            <div className="py-8 text-center text-xs text-neutral-400 space-y-2">
              <Heart className="w-8 h-8 text-neutral-600 mx-auto" />
              <p>No liked songs yet.</p>
              <p className="text-neutral-500">Tap the heart icon on any track to save it here.</p>
            </div>
          ) : (
            <div className="divide-y divide-neutral-800/70">
              {likedTracks.map((t, idx) => (
                <div key={t.id} className="py-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-xs font-mono tabular-nums text-neutral-500 w-5">
                      {idx + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => onPlayTrack(t, likedTracks)}
                      className="text-left min-w-0 cursor-pointer"
                    >
                      <p className="text-sm font-medium text-white hover:text-[#FF0000] truncate">
                        {t.cleanTitle}
                      </p>
                      <p className="text-xs text-neutral-400 truncate">
                        {t.artistName} · {t.language}
                      </p>
                    </button>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-xs font-mono tabular-nums text-neutral-400">
                      {formatDuration(t.duration)}
                    </span>
                    <button
                      type="button"
                      onClick={() => onToggleLike(t.id)}
                      className="text-[#FF0000] hover:text-neutral-400 cursor-pointer p-1 transition-colors"
                      aria-label="Remove from liked songs"
                    >
                      <Heart className="w-4 h-4 fill-current" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 4. Tab: Saved Albums */}
      {activeTab === 'albums' && (
        <div className="bg-[#0A0A0A] border border-neutral-800 rounded-xl p-5 space-y-4 animate-in fade-in duration-150">
          <div className="pb-3 border-b border-neutral-800">
            <h2 className="text-base font-display font-semibold text-white">
              Saved Albums ({savedAlbums.length})
            </h2>
            <p className="text-xs text-neutral-400">Albums saved to your account</p>
          </div>

          {savedAlbums.length === 0 ? (
            <div className="py-8 text-center text-xs text-neutral-400 space-y-2">
              <Disc className="w-8 h-8 text-neutral-600 mx-auto" />
              <p>No saved albums yet.</p>
              <p className="text-neutral-500">Explore albums and tap save to keep them here.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {savedAlbums.map((al) => (
                <button
                  key={al.id}
                  type="button"
                  onClick={() => onNavigate(`/album/${al.id}` as RoutePath)}
                  className="p-3.5 rounded-xl bg-black border border-neutral-800 hover:border-[#BC0202]/60 hover:bg-neutral-900/60 flex items-center justify-between text-left cursor-pointer transition-colors group"
                >
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-white group-hover:text-[#FF0000] transition-colors">
                      {al.title}
                    </p>
                    <p className="text-xs text-neutral-400">
                      {al.artistName} · {al.releaseYear}
                    </p>
                  </div>
                  <span className="text-xs text-[#FF0000] font-medium group-hover:translate-x-1 transition-transform">
                    Open →
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 5. Tab: History */}
      {activeTab === 'history' && (
        <div className="bg-[#0A0A0A] border border-neutral-800 rounded-xl p-5 space-y-4 animate-in fade-in duration-150">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-neutral-800">
            <div>
              <h2 className="text-base font-display font-semibold text-white">
                Listening History ({history.length})
              </h2>
              <p className="text-xs text-neutral-400">Private to you</p>
            </div>
            {history.length > 0 && (
              <button
                type="button"
                onClick={onClearHistory}
                className="px-3 py-1.5 rounded-lg bg-neutral-900 hover:bg-[#830000]/40 text-xs text-neutral-300 hover:text-white border border-neutral-800 cursor-pointer transition-colors"
              >
                Clear History
              </button>
            )}
          </div>

          {history.length === 0 ? (
            <div className="py-8 text-center text-xs text-neutral-400 space-y-2">
              <History className="w-8 h-8 text-neutral-600 mx-auto" />
              <p>Your listening history is empty.</p>
              <p className="text-neutral-500">Play tracks to see your playback log here.</p>
            </div>
          ) : (
            <div className="divide-y divide-neutral-800/70 text-xs">
              {history.map((evt) => {
                const trk = tracks.find((t) => t.id === evt.trackId);
                if (!trk) return null;
                return (
                  <div key={evt.id} className="py-2.5 flex items-center justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <button
                        type="button"
                        onClick={() => onPlayTrack(trk)}
                        className="text-sm font-medium text-white hover:text-[#FF0000] cursor-pointer truncate text-left block"
                      >
                        {trk.cleanTitle}
                      </button>
                      <p className="text-neutral-400 truncate">
                        {trk.artistName} · {formatDuration(evt.listenedSeconds)}
                      </p>
                    </div>
                    <span className="font-mono tabular-nums text-neutral-500 shrink-0">
                      {evt.playedAt.slice(0, 10)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 6. Tab: Settings */}
      {activeTab === 'settings' && (
        <div className="bg-[#0A0A0A] border border-neutral-800 rounded-xl p-6 space-y-5 animate-in fade-in duration-150">
          <div className="border-b border-neutral-800 pb-3">
            <h2 className="text-base font-display font-semibold text-white">Appearance &amp; Settings</h2>
            <p className="text-xs text-neutral-400">Customize the look and interface feel</p>
          </div>

          <div className="space-y-3">
            <label className="block text-xs font-semibold text-white">Theme Display Mode</label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {(
                [
                  { id: 'amoled', label: 'AMOLED Black', desc: 'True pitch black, max battery saving' },
                  { id: 'dark', label: 'Dark Carbon', desc: 'Subtle charcoal background' },
                  { id: 'light', label: 'High-Contrast Light', desc: 'Bright daylight mode' },
                ] as const
              ).map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => onSetThemeMode(t.id)}
                  className={`p-4 rounded-xl border text-left text-xs font-medium transition-colors cursor-pointer ${
                    themeMode === t.id
                      ? 'bg-[#830000]/35 border-[#FF0000] text-white shadow-[0_0_15px_rgba(255,0,0,0.25)]'
                      : 'bg-black border-neutral-800 text-neutral-400 hover:text-white hover:border-neutral-700'
                  }`}
                >
                  <p className="font-semibold text-sm text-white">{t.label}</p>
                  <p className="text-[11px] text-neutral-400 mt-1">{t.desc}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Sign Out Button at the Very Bottom */}
      <div className="pt-8 pb-4 border-t border-neutral-800/80 flex items-center justify-center">
        <button
          type="button"
          onClick={onLogout}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-8 py-3 rounded-xl bg-neutral-900/90 hover:bg-[#830000]/40 text-neutral-300 hover:text-[#FF0000] border border-neutral-800 hover:border-[#BC0202]/60 text-sm font-semibold transition-all cursor-pointer shadow-sm"
        >
          <LogOut className="w-4 h-4 text-[#FF0000]" />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );
};
