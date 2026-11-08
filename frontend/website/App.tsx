import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  BarChart2,
  Compass,
  Disc,
  Flame,
  FolderHeart,
  Heart,
  History,
  Home,
  Library,
  ListMusic,
  Loader2,
  Pause,
  Play,
  Search,
  Settings,
  Shield,
  Sparkles,
  TrendingUp,
  User,
  X,
} from 'lucide-react';
import {
  Album,
  Artist,
  AuditLogEntry,
  ContentReport,
  HomepageSection,
  ListeningEvent,
  Playlist,
  RoutePath,
  ThemeMode,
  Track,
  UserAccount,
  UserRole,
  ViewStateMode,
} from '../../shared/types/music';
import {
  INITIAL_ALBUMS,
  INITIAL_ARTISTS,
  INITIAL_AUDIT_LOGS,
  INITIAL_HOMEPAGE_SECTIONS,
  INITIAL_LISTENING_HISTORY,
  INITIAL_PLAYLISTS,
  INITIAL_REPORTS,
  INITIAL_TRACKS,
  INITIAL_USERS,
} from './data/catalogFixtures';
import { audioEngine, EngineSnapshot } from './services/audioEngine';
import { GlobalPlayer, RepeatMode, ShuffleMode } from './components/GlobalPlayer';
import { ArtworkTile } from './components/ArtworkTile';
import {
  EntityDetailView,
  HomeView,
  LibraryAndPlaylistsView,
  ProfileSettingsStatsView,
  SearchView,
  StateBoundary,
} from './components/Views';
import { AdminDashboardView, AuthView, LegalView } from './components/AdminAndLegalViews';
import {
  fetchSearchTracks,
  syncCreatePlaylist,
  syncDeletePlaylist,
  syncLikeTrack,
  syncUpdatePlaylist,
} from './services/apiClient';

const STORAGE_KEYS = {
  LIKED: 'mm_liked_track_ids_v3',
  PLAYLISTS: 'mm_playlists_v3',
  HISTORY: 'mm_history_v3',
  THEME: 'mm_theme_v3',
};

function loadStoredJson<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function MusicMineWebsiteApp() {
  const [route, setRouteState] = useState<RoutePath>('/');
  const [routeHistory, setRouteHistory] = useState<RoutePath[]>(['/']);

  const setRoute = useCallback((nextPath: RoutePath) => {
    setRouteState((prev) => {
      if (prev === nextPath) return prev;
      setRouteHistory((hist) => [...hist.slice(-24), nextPath]);
      return nextPath;
    });
  }, []);

  const handleGoBack = useCallback(() => {
    setRouteHistory((hist) => {
      if (hist.length > 1) {
        const nextHist = hist.slice(0, -1);
        const previousRoute = nextHist[nextHist.length - 1] || '/';
        setRouteState(previousRoute);
        return nextHist;
      }
      setRouteState('/');
      return ['/'];
    });
  }, []);

  const canGoBack = route !== '/' || routeHistory.length > 1;
  const [viewStateMode, setViewStateMode] = useState<ViewStateMode>('populated');
  const [themeMode, setThemeMode] = useState<ThemeMode>(() =>
    loadStoredJson<ThemeMode>(STORAGE_KEYS.THEME, 'amoled')
  );
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [tracks, setTracks] = useState<Track[]>(INITIAL_TRACKS);
  const [artists] = useState<Artist[]>(INITIAL_ARTISTS);
  const [albums] = useState<Album[]>(INITIAL_ALBUMS);
  const [homepageSections, setHomepageSections] = useState<HomepageSection[]>(
    INITIAL_HOMEPAGE_SECTIONS
  );

  const [users, setUsers] = useState<UserAccount[]>(INITIAL_USERS);
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(INITIAL_USERS[0]);
  const [likedTrackIds, setLikedTrackIds] = useState<string[]>(() =>
    loadStoredJson<string[]>(STORAGE_KEYS.LIKED, [
      'trk-ri1Ar5nEq4s',
      'trk-u2NAuswnTKs',
      'trk-BddP6PYo2gs',
    ])
  );
  const [savedAlbumIds, setSavedAlbumIds] = useState<string[]>([
    'alb-stree-2',
    'alb-brahmastra',
  ]);
  const [followedArtistIds, setFollowedArtistIds] = useState<string[]>([
    'art-sachin-jigar',
    'art-arijit-singh',
  ]);
  const [playlists, setPlaylists] = useState<Playlist[]>(() =>
    loadStoredJson<Playlist[]>(STORAGE_KEYS.PLAYLISTS, INITIAL_PLAYLISTS)
  );
  const [history, setHistory] = useState<ListeningEvent[]>(() =>
    loadStoredJson<ListeningEvent[]>(STORAGE_KEYS.HISTORY, INITIAL_LISTENING_HISTORY)
  );

  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>(INITIAL_AUDIT_LOGS);
  const [reports, setReports] = useState<ContentReport[]>(INITIAL_REPORTS);

  const [queue, setQueue] = useState<Track[]>(INITIAL_TRACKS.slice(0, 5));
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [shuffleMode, setShuffleMode] = useState<ShuffleMode>('off');
  const shuffle = shuffleMode !== 'off';
  const [repeatMode, setRepeatMode] = useState<RepeatMode>('off');
  const [sleepTimerMinutes, setSleepTimerMinutes] = useState<number | null>(null);
  const [engineState, setEngineState] = useState<EngineSnapshot>(() =>
    audioEngine.getSnapshot()
  );

  const [headerSearchQuery, setHeaderSearchQuery] = useState<string>('');
  const [headerSearchResults, setHeaderSearchResults] = useState<Track[]>([]);
  const [isSearchingHeader, setIsSearchingHeader] = useState<boolean>(false);
  const [headerSearchFocused, setHeaderSearchFocused] = useState<boolean>(false);
  const headerSearchRef = React.useRef<HTMLDivElement>(null);

  const [recentSearches, setRecentSearches] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('musicmine_recent_searches');
      return saved ? JSON.parse(saved).slice(0, 5) : [];
    } catch {
      return [];
    }
  });

  const saveRecentSearch = useCallback((rawTerm: string) => {
    const term = rawTerm.trim();
    if (!term) return;
    setRecentSearches((prev) => {
      const filtered = prev.filter((item) => item.toLowerCase() !== term.toLowerCase());
      const updated = [term, ...filtered].slice(0, 5);
      try {
        localStorage.setItem('musicmine_recent_searches', JSON.stringify(updated));
      } catch {
        // ignore storage errors
      }
      return updated;
    });
  }, []);

  const removeRecentSearch = useCallback((termToRemove: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setRecentSearches((prev) => {
      const updated = prev.filter((item) => item !== termToRemove);
      try {
        localStorage.setItem('musicmine_recent_searches', JSON.stringify(updated));
      } catch {
        // ignore storage errors
      }
      return updated;
    });
  }, []);

  const clearRecentSearches = useCallback((e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setRecentSearches([]);
    try {
      localStorage.removeItem('musicmine_recent_searches');
    } catch {
      // ignore storage errors
    }
  }, []);

  useEffect(() => {
    const trimmed = headerSearchQuery.trim();
    if (!trimmed) {
      setHeaderSearchResults([]);
      setIsSearchingHeader(false);
      return;
    }

    let cancelled = false;
    setIsSearchingHeader(true);
    const timer = window.setTimeout(async () => {
      try {
        const results = await fetchSearchTracks(trimmed);
        if (!cancelled) {
          setHeaderSearchResults(results || []);
        }
      } catch {
        if (!cancelled) setHeaderSearchResults([]);
      } finally {
        if (!cancelled) setIsSearchingHeader(false);
      }
    }, 160);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [headerSearchQuery]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        headerSearchRef.current &&
        !headerSearchRef.current.contains(event.target as Node)
      ) {
        setHeaderSearchFocused(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    setHeaderSearchFocused(false);
  }, [route]);

  // Real-time trending searches based on catalog & popular streaming trends
  const trendingSearches = useMemo(() => {
    return [
      { term: 'Aaj Ki Raat', subtitle: 'Stree 2 · Trending #1', tag: '🔥 #1 Trending' },
      { term: 'Arijit Singh', subtitle: '42.6M Listeners', tag: 'Top Artist' },
      { term: 'Tauba Tauba', subtitle: 'Bad Newz · Viral', tag: '⚡ Viral' },
      { term: 'Diljit Dosanjh', subtitle: 'MoonChild Era', tag: 'Popular' },
      { term: 'Apna Bana Le', subtitle: 'Bhediya · Romantic', tag: 'Romantic' },
      { term: 'Kesariya', subtitle: 'Brahmāstra', tag: 'Chartbuster' },
      { term: 'Sachin-Jigar', subtitle: '18.4M Listeners', tag: 'Composer' },
      { term: 'A.R. Rahman', subtitle: 'Rockstar & Classics', tag: 'Legend' },
    ];
  }, []);

  // Popular artists suggestion list sorted by user affinity (followed first) & catalog presence
  const popularArtists = useMemo(() => {
    return [...artists]
      .sort((a, b) => {
        const aFollowed = followedArtistIds.includes(a.id) ? 1 : 0;
        const bFollowed = followedArtistIds.includes(b.id) ? 1 : 0;
        if (aFollowed !== bFollowed) return bFollowed - aFollowed;
        return a.name.localeCompare(b.name);
      })
      .slice(0, 5);
  }, [artists, followedArtistIds]);

  const currentTrack = queue[currentIndex] || null;

  const notify = useCallback((msg: string) => {
    setToastMessage(msg);
  }, []);

  useEffect(() => {
    if (!toastMessage) return;
    const t = window.setTimeout(() => setToastMessage(null), 3200);
    return () => clearTimeout(t);
  }, [toastMessage]);

  useEffect(() => {
    const html = document.documentElement;
    if (themeMode === 'light') {
      html.classList.remove('dark');
    } else {
      html.classList.add('dark');
    }
    try {
      window.localStorage.setItem(STORAGE_KEYS.THEME, JSON.stringify(themeMode));
    } catch {
      // Ignore storage quota errors
    }
  }, [themeMode]);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEYS.LIKED, JSON.stringify(likedTrackIds));
    } catch {
      // Ignore
    }
  }, [likedTrackIds]);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEYS.PLAYLISTS, JSON.stringify(playlists));
    } catch {
      // Ignore
    }
  }, [playlists]);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(history));
    } catch {
      // Ignore
    }
  }, [history]);

  useEffect(() => {
    const unsub = audioEngine.subscribe((snap) => {
      setEngineState(snap);
    });
    if (INITIAL_TRACKS[0]) {
      audioEngine.loadTrack(INITIAL_TRACKS[0], false);
    }
    // Load catalog tracks from server /api/v1/search on startup
    fetchSearchTracks('').then((remoteTracks) => {
      if (remoteTracks && remoteTracks.length > 0) {
        setTracks(remoteTracks);
      }
    });
    return unsub;
  }, []);

  // Play count map from listening history for smart shuffle scoring
  const playCountMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const event of history) {
      map.set(event.trackId, (map.get(event.trackId) || 0) + 1);
    }
    return map;
  }, [history]);

  // Set of favorite artist identifiers (followedArtistIds and artists from liked tracks)
  const favoriteArtistSet = useMemo(() => {
    const set = new Set<string>(followedArtistIds);
    const likedSet = new Set(likedTrackIds);
    for (const track of tracks) {
      if (likedSet.has(track.id)) {
        if (track.artistId) set.add(track.artistId);
        if (track.artistName) set.add(track.artistName.toLowerCase());
      }
    }
    return set;
  }, [followedArtistIds, likedTrackIds, tracks]);

  // Priority score / weight for Smart Shuffle:
  // - Base weight: 1.0
  // - Top played bonus: +3.0 per play in history
  // - Followed or liked artist bonus: +5.0
  // - Liked track bonus: +4.0
  const getSmartTrackWeight = useCallback(
    (track: Track): number => {
      let weight = 1.0;
      const playCount = playCountMap.get(track.id) || 0;
      weight += playCount * 3.0;

      const isFavArtist =
        (track.artistId && favoriteArtistSet.has(track.artistId)) ||
        (track.artistName && favoriteArtistSet.has(track.artistName.toLowerCase()));
      if (isFavArtist) {
        weight += 5.0;
      }

      if (likedTrackIds.includes(track.id)) {
        weight += 4.0;
      }

      return weight;
    },
    [playCountMap, favoriteArtistSet, likedTrackIds]
  );

  const handleToggleShuffle = useCallback(() => {
    setShuffleMode((prev) => {
      if (prev === 'off') {
        notify('Shuffle: On (Standard Random)');
        return 'standard';
      }
      if (prev === 'standard') {
        notify('Smart Shuffle: On (Prioritizing favorites & top played)');
        return 'smart';
      }
      notify('Shuffle: Off');
      return 'off';
    });
  }, [notify]);

  const handlePrioritizeSmartQueue = useCallback(() => {
    if (queue.length <= 1) return;
    setQueue((prevQueue) => {
      if (prevQueue.length <= 1) return prevQueue;
      const current = prevQueue[currentIndex];
      const past = prevQueue.slice(0, currentIndex);
      const upcoming = prevQueue.slice(currentIndex + 1);
      upcoming.sort((a, b) => getSmartTrackWeight(b) - getSmartTrackWeight(a));
      return [...past, current, ...upcoming];
    });
    notify('Prioritized upcoming queue by Smart Shuffle weights');
  }, [currentIndex, getSmartTrackWeight, notify, queue.length]);

  const handleNextTrack = useCallback(() => {
    if (queue.length === 0) return;
    if (repeatMode === 'one' && currentTrack) {
      audioEngine.loadTrack(currentTrack, true);
      return;
    }
    let nextIdx = currentIndex + 1;
    if (shuffleMode === 'smart' && queue.length > 1) {
      // Smart weighted random selection prioritizing top plays and favorite artists
      const candidateIndices: number[] = [];
      const weights: number[] = [];
      for (let i = 0; i < queue.length; i++) {
        if (i !== currentIndex) {
          candidateIndices.push(i);
          weights.push(getSmartTrackWeight(queue[i]));
        }
      }

      const totalWeight = weights.reduce((sum, w) => sum + w, 0);
      let rand = Math.random() * totalWeight;
      let selectedIdx = candidateIndices[0];
      for (let i = 0; i < candidateIndices.length; i++) {
        rand -= weights[i];
        if (rand <= 0) {
          selectedIdx = candidateIndices[i];
          break;
        }
      }
      nextIdx = selectedIdx;
    } else if (shuffleMode === 'standard' && queue.length > 1) {
      // Uniform random shuffle
      const otherIndices: number[] = [];
      for (let i = 0; i < queue.length; i++) {
        if (i !== currentIndex) otherIndices.push(i);
      }
      nextIdx = otherIndices[Math.floor(Math.random() * otherIndices.length)];
    } else if (nextIdx >= queue.length) {
      if (repeatMode === 'all') {
        nextIdx = 0;
      } else {
        audioEngine.pause();
        return;
      }
    }
    setCurrentIndex(nextIdx);
    const nextTrack = queue[nextIdx];
    if (nextTrack) {
      audioEngine.loadTrack(nextTrack, true);
    }
  }, [queue, currentIndex, repeatMode, shuffleMode, currentTrack, getSmartTrackWeight]);

  useEffect(() => {
    audioEngine.setOnEnded(handleNextTrack);
    const nextTrack = queue[currentIndex + 1] || queue[0];
    if (nextTrack && nextTrack.id !== currentTrack?.id) {
      audioEngine.prefetchTrack(nextTrack);
    }
  }, [handleNextTrack, queue, currentIndex, currentTrack]);

  const handlePrevTrack = useCallback(() => {
    if (queue.length === 0) return;
    if (engineState.currentTime > 4) {
      audioEngine.seek(0);
      return;
    }
    const prevIdx = currentIndex > 0 ? currentIndex - 1 : queue.length - 1;
    setCurrentIndex(prevIdx);
    const prevTrack = queue[prevIdx];
    if (prevTrack) {
      audioEngine.loadTrack(prevTrack, true);
    }
  }, [queue, currentIndex, engineState.currentTime]);

  const handlePlayTrack = useCallback(
    (track: Track, contextQueue?: Track[]) => {
      if (currentTrack?.id === track.id) {
        audioEngine.togglePlay();
        return;
      }
      const nextQueue = contextQueue && contextQueue.length > 0 ? contextQueue : queue;
      const foundIdx = nextQueue.findIndex((t) => t.id === track.id);
      if (foundIdx !== -1) {
        setQueue(nextQueue);
        setCurrentIndex(foundIdx);
      } else {
        const updated = [track, ...queue];
        setQueue(updated);
        setCurrentIndex(0);
      }
      audioEngine.loadTrack(track, true);

      setHistory((prev) => [
        {
          id: `evt-${Date.now()}`,
          trackId: track.id,
          playedAt: new Date().toISOString(),
          listenedSeconds: track.duration,
          completionRatio: 1.0,
        },
        ...prev,
      ]);
    },
    [currentTrack, queue]
  );

  const handleAddToQueue = useCallback(
    (track: Track) => {
      setQueue((prev) => [...prev, track]);
      notify(`Added "${track.cleanTitle}" to queue`);
    },
    [notify]
  );

  const handleTracksDiscovered = useCallback((newTracks: Track[]) => {
    setTracks((prev) => {
      const existingIds = new Set(prev.map((t) => t.id));
      const toAdd = newTracks.filter((t) => !existingIds.has(t.id));
      if (toAdd.length === 0) return prev;
      return [...prev, ...toAdd];
    });
  }, []);

  const handleToggleLike = useCallback(
    (trackId: string) => {
      if (!currentUser) {
        notify('Sign in to save liked songs.');
        setRoute('/login');
        return;
      }
      setLikedTrackIds((prev) => {
        const exists = prev.includes(trackId);
        syncLikeTrack(trackId, !exists);
        notify(exists ? 'Removed from Liked Songs' : 'Saved to Liked Songs');
        return exists ? prev.filter((id) => id !== trackId) : [trackId, ...prev];
      });
    },
    [currentUser, notify]
  );

  const handleToggleSaveAlbum = useCallback(
    (albumId: string) => {
      if (!currentUser) {
        notify('Sign in to save albums.');
        setRoute('/login');
        return;
      }
      setSavedAlbumIds((prev) => {
        const exists = prev.includes(albumId);
        notify(exists ? 'Removed album from Library' : 'Saved album to Library');
        return exists ? prev.filter((id) => id !== albumId) : [albumId, ...prev];
      });
    },
    [currentUser, notify]
  );

  const handleToggleFollowArtist = useCallback(
    (artistId: string) => {
      if (!currentUser) {
        notify('Sign in to follow artists.');
        setRoute('/login');
        return;
      }
      setFollowedArtistIds((prev) => {
        const exists = prev.includes(artistId);
        notify(exists ? 'Unfollowed artist' : 'Following artist');
        return exists ? prev.filter((id) => id !== artistId) : [artistId, ...prev];
      });
    },
    [currentUser, notify]
  );

  const handleCreatePlaylist = useCallback(
    (name: string, description: string, isPublic: boolean) => {
      if (!currentUser) return;
      const newPl: Playlist = {
        id: `pl-${Date.now()}`,
        name,
        description,
        ownerId: currentUser.id,
        ownerName: currentUser.displayName,
        isPublic,
        updatedAt: new Date().toISOString(),
        trackIds: [],
        accentHex: '#BC0202',
      };
      setPlaylists((prev) => [newPl, ...prev]);
      syncCreatePlaylist(name, description, isPublic, currentUser.displayName);
      notify(`Created playlist "${name}"`);
    },
    [currentUser, notify]
  );

  const handleRenamePlaylist = useCallback(
    (playlistId: string, name: string, description: string, isPublic: boolean) => {
      setPlaylists((prev) =>
        prev.map((pl) =>
          pl.id === playlistId
            ? { ...pl, name, description, isPublic, updatedAt: new Date().toISOString() }
            : pl
        )
      );
      syncUpdatePlaylist(playlistId, { name, description, isPublic });
      notify(`Updated playlist "${name}"`);
    },
    [notify]
  );

  const handleDeletePlaylist = useCallback(
    (playlistId: string) => {
      setPlaylists((prev) => prev.filter((pl) => pl.id !== playlistId));
      syncDeletePlaylist(playlistId);
      notify('Deleted playlist');
    },
    [notify]
  );

  const handleAddTrackToPlaylist = useCallback(
    (playlistId: string, trackId: string) => {
      if (!currentUser) {
        notify('Sign in to add songs to playlists.');
        setRoute('/login');
        return;
      }
      setPlaylists((prev) =>
        prev.map((pl) => {
          if (pl.id !== playlistId) return pl;
          if (pl.trackIds.includes(trackId)) return pl;
          return { ...pl, trackIds: [...pl.trackIds, trackId] };
        })
      );
      const plName = playlists.find((p) => p.id === playlistId)?.name || 'playlist';
      notify(`Added to "${plName}"`);
    },
    [currentUser, playlists, notify]
  );

  const handleRemoveTrackFromPlaylist = useCallback(
    (playlistId: string, trackId: string) => {
      setPlaylists((prev) =>
        prev.map((pl) =>
          pl.id === playlistId
            ? { ...pl, trackIds: pl.trackIds.filter((id) => id !== trackId) }
            : pl
        )
      );
      notify('Removed from playlist');
    },
    [notify]
  );

  const handleMovePlaylistTrack = useCallback(
    (playlistId: string, index: number, dir: 'up' | 'down') => {
      setPlaylists((prev) =>
        prev.map((pl) => {
          if (pl.id !== playlistId) return pl;
          const nextIds = [...pl.trackIds];
          const targetIdx = dir === 'up' ? index - 1 : index + 1;
          if (targetIdx < 0 || targetIdx >= nextIds.length) return pl;
          const [moved] = nextIds.splice(index, 1);
          nextIds.splice(targetIdx, 0, moved);
          return { ...pl, trackIds: nextIds };
        })
      );
    },
    []
  );

  const appendAuditLog = useCallback(
    (
      action: string,
      targetType: AuditLogEntry['targetType'],
      targetId: string,
      summary: string
    ) => {
      setAuditLogs((prev) => [
        {
          id: `aud-${Date.now()}`,
          timestamp: new Date().toISOString(),
          actorEmail: currentUser?.email || 'admin@musicmine.app',
          actorRole: currentUser?.role || 'super_admin',
          action,
          targetType,
          targetId,
          summary,
        },
        ...prev,
      ]);
    },
    [currentUser]
  );

  const handleToggleTrackVisibility = useCallback(
    (trackId: string) => {
      setTracks((prev) =>
        prev.map((t) => {
          if (t.id !== trackId) return t;
          const nextVis = !t.visibleInCatalog;
          appendAuditLog(
            nextVis ? 'CATALOG_TRACK_RESTORED' : 'CATALOG_TRACK_HIDDEN',
            'catalog',
            trackId,
            `${nextVis ? 'Restored' : 'Hidden'} "${t.cleanTitle}"`
          );
          notify(
            `"${t.cleanTitle}" is now ${nextVis ? 'visible' : 'hidden'}`
          );
          return { ...t, visibleInCatalog: nextVis };
        })
      );
    },
    [appendAuditLog, notify]
  );

  const handleToggleSectionEnabled = useCallback(
    (secId: string) => {
      setHomepageSections((prev) =>
        prev.map((s) => {
          if (s.id !== secId) return s;
          const next = !s.enabled;
          appendAuditLog(
            next ? 'HOMEPAGE_SECTION_ENABLED' : 'HOMEPAGE_SECTION_DISABLED',
            'homepage',
            secId,
            `Updated section "${s.title}"`
          );
          return { ...s, enabled: next };
        })
      );
    },
    [appendAuditLog]
  );

  const handleMoveSectionOrder = useCallback(
    (secId: string, dir: 'up' | 'down') => {
      setHomepageSections((prev) => {
        const sorted = [...prev].sort((a, b) => a.order - b.order);
        const idx = sorted.findIndex((s) => s.id === secId);
        const swapIdx = dir === 'up' ? idx - 1 : idx + 1;
        if (idx === -1 || swapIdx < 0 || swapIdx >= sorted.length) return prev;
        const tempOrder = sorted[idx].order;
        sorted[idx] = { ...sorted[idx], order: sorted[swapIdx].order };
        sorted[swapIdx] = { ...sorted[swapIdx], order: tempOrder };
        return sorted;
      });
    },
    []
  );

  const handleToggleUserStatus = useCallback(
    (userId: string) => {
      setUsers((prev) =>
        prev.map((u) => {
          if (u.id !== userId) return u;
          const nextStatus = u.status === 'active' ? 'suspended' : 'active';
          appendAuditLog(
            'USER_STATUS_UPDATED',
            'user',
            userId,
            `Changed status for ${u.email} to ${nextStatus}`
          );
          return { ...u, status: nextStatus };
        })
      );
    },
    [appendAuditLog]
  );

  const handleResolveReport = useCallback(
    (reportId: string, resolution: 'resolved_hidden' | 'dismissed') => {
      const targetReport = reports.find((r) => r.id === reportId);
      setReports((prev) =>
        prev.map((r) => (r.id === reportId ? { ...r, status: resolution } : r))
      );
      if (resolution === 'resolved_hidden' && targetReport) {
        setTracks((prev) =>
          prev.map((t) =>
            t.id === targetReport.trackId ? { ...t, visibleInCatalog: false } : t
          )
        );
      }
      appendAuditLog(
        'REPORT_RESOLVED',
        'report',
        reportId,
        `Report ${reportId} resolved`
      );
      notify('Report updated');
    },
    [reports, appendAuditLog, notify]
  );


  const shellBgClass =
    themeMode === 'amoled'
      ? 'bg-black text-white'
      : themeMode === 'dark'
        ? 'bg-[#0C0A0A] text-white'
        : 'bg-neutral-950 text-white';

  return (
    <div className={`fixed inset-0 w-full h-[100dvh] max-h-[100dvh] flex flex-col overflow-hidden ${shellBgClass}`}>
      {/* Top Navigation Bar */}
      <header className="h-16 px-4 lg:px-8 border-b border-neutral-800 bg-black flex items-center justify-between gap-4 sm:gap-8 shrink-0 z-30 sticky top-0">
        {/* Zone 1: Brand Wordmark Matching Reference Image (Red Equalizer Icon + MusicMine) */}
        <div className="flex items-center gap-3 shrink-0">
          {canGoBack && (
            <button
              type="button"
              onClick={handleGoBack}
              aria-label="Go back"
              title="Go Back"
              className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-[#141414] hover:bg-[#BC0202] text-neutral-300 hover:text-white border border-neutral-800 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          <button
            type="button"
            onClick={() => setRoute('/')}
            className="flex items-center gap-2.5 group cursor-pointer"
          >
            {/* MusicMine Red App Icon with Equalizer Wave bars matching reference image */}
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#A00000] via-[#D60000] to-[#FF0000] flex items-center justify-center gap-[3px] shadow-[0_0_14px_rgba(255,0,0,0.5)] shrink-0">
              <span className="w-[3px] h-3 bg-white rounded-full" />
              <span className="w-[3px] h-4.5 bg-white rounded-full" />
              <span className="w-[3px] h-2.5 bg-white rounded-full" />
            </div>
            <span className="hidden sm:inline text-xl font-display font-black tracking-tight text-white group-hover:opacity-90 transition-opacity">
              Music<span className="text-[#FF0000]">Mine</span>
            </span>
          </button>
        </div>

        {/* Zone 2: Global Header Search Bar (Matching Reference Image) */}
        <div ref={headerSearchRef} className="flex-1 max-w-xl mx-2 sm:mx-6 relative">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (headerSearchQuery.trim()) {
                saveRecentSearch(headerSearchQuery);
              }
              setHeaderSearchFocused(false);
              setRoute('/search');
            }}
            className="relative w-full"
          >
            <Search className="w-5 h-5 text-neutral-300 absolute left-3.5 sm:left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              value={headerSearchQuery}
              onChange={(e) => {
                setHeaderSearchQuery(e.target.value);
                setHeaderSearchFocused(true);
              }}
              onFocus={() => setHeaderSearchFocused(true)}
              placeholder="Search songs, artists..."
              aria-label="Search music catalog"
              className="w-full pl-11 sm:pl-12 pr-10 py-2.5 rounded-full bg-[#121212] hover:bg-[#171717] focus:bg-black border border-neutral-800/90 focus:border-[#FF0000] focus:ring-1 focus:ring-[#FF0000] focus:outline-none text-xs sm:text-sm text-white placeholder-neutral-400 transition-all shadow-inner"
            />
            {isSearchingHeader ? (
              <Loader2 className="w-5 h-5 text-[#FF0000] animate-spin absolute right-3.5 top-1/2 -translate-y-1/2" />
            ) : headerSearchQuery ? (
              <button
                type="button"
                onClick={() => {
                  setHeaderSearchQuery('');
                  setHeaderSearchResults([]);
                }}
                aria-label="Clear search"
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            ) : null}
          </form>

          {/* Live Search Quick Results Dropdown (Desktop AMOLED Glass) */}
          {headerSearchFocused && headerSearchQuery.trim().length > 0 && (
            <div className="hidden md:flex absolute left-0 right-0 top-full mt-2 bg-[#0A0A0A]/85 backdrop-blur-2xl border border-neutral-800/80 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.85)] ring-1 ring-white/10 overflow-hidden z-50 max-h-[75vh] flex-col">
              <div className="p-3 border-b border-neutral-800/80 bg-black/40 backdrop-blur-md flex items-center justify-between text-xs text-neutral-400">
                <span>
                  {isSearchingHeader
                    ? `Searching for "${headerSearchQuery}"...`
                    : `Quick Results (${headerSearchResults.length})`}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    if (headerSearchQuery.trim()) {
                      saveRecentSearch(headerSearchQuery);
                    }
                    setHeaderSearchFocused(false);
                    setRoute('/search');
                  }}
                  className="text-xs font-semibold text-[#FF0000] hover:underline cursor-pointer"
                >
                  View All in Search →
                </button>
              </div>

              <div className="overflow-y-auto p-2 space-y-1 divide-y divide-neutral-900">
                {headerSearchResults.length === 0 && !isSearchingHeader ? (
                  <div className="py-8 text-center text-xs text-neutral-500">
                    No songs found for "{headerSearchQuery}".
                  </div>
                ) : (
                  headerSearchResults.slice(0, 7).map((track) => {
                    const isCurrent = currentTrack?.id === track.id;
                    const isTrackPlaying = isCurrent && engineState.isPlaying;
                    return (
                      <div
                        key={`hdr-srch-${track.id}`}
                        className="pt-1.5 first:pt-0"
                      >
                        <div
                          className={`p-2 rounded-xl flex items-center justify-between gap-3 transition-colors ${isCurrent
                            ? 'bg-[#830000]/30 border border-[#FF0000]/40'
                            : 'hover:bg-neutral-900 border border-transparent'
                            }`}
                        >
                          <button
                            type="button"
                            onClick={() => {
                              if (headerSearchQuery.trim()) {
                                saveRecentSearch(headerSearchQuery);
                              }
                              handlePlayTrack(track, headerSearchResults);
                              setHeaderSearchFocused(false);
                            }}
                            className="flex items-center gap-2.5 min-w-0 flex-1 text-left cursor-pointer"
                          >
                            <ArtworkTile
                              title={track.cleanTitle}
                              thumbnailUrl={track.thumbnailUrl}
                              size="sm"
                              isPlaying={isTrackPlaying}
                              className="w-10 h-10 shrink-0"
                            />
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-semibold text-white truncate">
                                {track.cleanTitle}
                              </p>
                              <p className="text-[11px] text-neutral-400 truncate">
                                {track.artistName} · {track.language}
                              </p>
                            </div>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              if (headerSearchQuery.trim()) {
                                saveRecentSearch(headerSearchQuery);
                              }
                              handlePlayTrack(track, headerSearchResults);
                              setHeaderSearchFocused(false);
                            }}
                            aria-label={`Play ${track.cleanTitle}`}
                            className="w-8 h-8 rounded-full bg-[#BC0202] hover:bg-[#FF0000] text-white flex items-center justify-center shrink-0 shadow transition-colors cursor-pointer"
                          >
                            {isTrackPlaying ? (
                              <Pause className="w-3.5 h-3.5 fill-current" />
                            ) : (
                              <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="p-2.5 bg-black/40 backdrop-blur-md border-t border-neutral-800/80 text-center">
                <button
                  type="button"
                  onClick={() => {
                    if (headerSearchQuery.trim()) {
                      saveRecentSearch(headerSearchQuery);
                    }
                    setHeaderSearchFocused(false);
                    setRoute('/search');
                  }}
                  className="w-full py-1.5 rounded-lg bg-neutral-900/80 hover:bg-[#830000]/40 text-xs text-neutral-300 hover:text-white font-medium border border-neutral-800 transition-colors cursor-pointer"
                >
                  Press Enter or Click for Full Search Page
                </button>
              </div>
            </div>
          )}

          {/* Focused & Empty Input Dropdown: Real-Time Trending Searches & Popular Artists (Desktop AMOLED Glass) */}
          {headerSearchFocused && !headerSearchQuery.trim() && (
            <div className="hidden md:flex absolute left-0 right-0 top-full mt-2 bg-[#0A0A0A]/85 backdrop-blur-2xl border border-neutral-800/80 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.85)] ring-1 ring-white/10 overflow-hidden z-50 max-h-[82vh] flex-col divide-y divide-neutral-800/70">

              {/* Header Title with Live Badge */}
              <div className="px-4 py-2.5 bg-gradient-to-r from-[#1f0606] via-[#100808] to-[#0A0A0A] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Flame className="w-4 h-4 text-[#FF0000]" />
                  <span className="text-xs font-semibold text-white tracking-wide uppercase">
                    Trending Searches & Popular Artists
                  </span>
                </div>
                <span className="text-[10px] text-neutral-400 font-mono flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#FF0000] animate-pulse" />
                  Live Suggestions
                </span>
              </div>

              {/* Scrollable Container */}
              <div className="overflow-y-auto p-3 space-y-4 max-h-[70vh]">

                {/* 0. Recent Searches */}
                {recentSearches.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
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
                          key={`recent-${term}`}
                          className="group inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-neutral-900/80 hover:bg-neutral-800 border border-neutral-800/80 hover:border-[#BC0202]/60 text-xs text-neutral-300 hover:text-white transition-all cursor-pointer shadow-sm"
                          onClick={() => {
                            setHeaderSearchQuery(term);
                            saveRecentSearch(term);
                            setHeaderSearchFocused(true);
                          }}
                        >
                          <History className="w-3 h-3 text-neutral-500 group-hover:text-[#FF0000] shrink-0" />
                          <span className="font-medium truncate max-w-[150px] sm:max-w-[220px]">
                            {term}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => removeRecentSearch(term, e)}
                            aria-label={`Remove ${term} from recent searches`}
                            className="text-neutral-500 hover:text-white p-0.5 ml-0.5 rounded transition-colors cursor-pointer"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 1. Trending Searches */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider flex items-center gap-1.5">
                      <TrendingUp className="w-3.5 h-3.5 text-[#FF0000]" />
                      Trending Searches
                    </span>
                    <span className="text-[10px] text-neutral-500">Tap to search</span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {trendingSearches.map((item, idx) => (
                      <button
                        key={`trend-${idx}`}
                        type="button"
                        onClick={() => {
                          setHeaderSearchQuery(item.term);
                          saveRecentSearch(item.term);
                          setHeaderSearchFocused(true);
                        }}
                        className="p-2.5 rounded-xl bg-neutral-900/80 hover:bg-neutral-800 border border-neutral-800/80 hover:border-[#BC0202]/60 text-left transition-all cursor-pointer flex flex-col justify-between group shadow-sm"
                      >
                        <div className="flex items-center justify-between gap-1 mb-1.5">
                          <span className="text-[10px] font-mono text-neutral-500 group-hover:text-neutral-300">
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

                {/* 2. Popular Artists */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      Popular Artists
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setHeaderSearchFocused(false);
                        setRoute('/search');
                      }}
                      className="text-[11px] text-[#FF0000] hover:underline cursor-pointer"
                    >
                      View All Artists →
                    </button>
                  </div>

                  <div className="space-y-1.5">
                    {popularArtists.map((artist) => {
                      const isFollowed = followedArtistIds.includes(artist.id);
                      const artistTrack =
                        tracks.find(
                          (t) =>
                            t.artistId === artist.id ||
                            t.artistName.toLowerCase().includes(artist.name.toLowerCase())
                        ) || tracks[0];
                      const isCurrent = currentTrack?.id === artistTrack?.id;
                      const isPlayingArtistTrack = isCurrent && engineState.isPlaying;

                      return (
                        <div
                          key={`pop-art-${artist.id}`}
                          className="p-2 rounded-xl bg-neutral-900/60 hover:bg-neutral-800/90 border border-neutral-800/70 hover:border-neutral-700/80 flex items-center justify-between gap-3 transition-colors group"
                        >
                          <button
                            type="button"
                            onClick={() => {
                              setHeaderSearchFocused(false);
                              setRoute(`/artist/${artist.id}` as RoutePath);
                            }}
                            className="flex items-center gap-3 min-w-0 flex-1 text-left cursor-pointer"
                          >
                            <div className="relative w-10 h-10 rounded-full overflow-hidden bg-neutral-800 shrink-0 border border-neutral-700/60 group-hover:border-[#FF0000] transition-colors">
                              {artist.avatarUrl ? (
                                <img
                                  src={artist.avatarUrl}
                                  alt={artist.name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center font-bold text-xs text-white bg-[#830000]">
                                  {artist.name[0]}
                                </div>
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5">
                                <p className="text-xs font-semibold text-white group-hover:text-[#FF0000] truncate transition-colors">
                                  {artist.name}
                                </p>
                                {isFollowed && (
                                  <span className="text-[9px] px-1 py-0.2 rounded bg-[#FF0000]/20 text-[#ff7272] border border-[#FF0000]/30 font-mono">
                                    Following
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-neutral-400 truncate">
                                {artist.monthlyListenersLabel || artist.genres.slice(0, 2).join(' · ')}
                              </p>
                            </div>
                          </button>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => {
                                setHeaderSearchQuery(artist.name);
                                saveRecentSearch(artist.name);
                                setHeaderSearchFocused(true);
                              }}
                              className="px-2.5 py-1 rounded-lg text-[11px] text-neutral-400 hover:text-white bg-neutral-800 hover:bg-neutral-700 transition-colors cursor-pointer"
                              title={`Search songs by ${artist.name}`}
                            >
                              Search
                            </button>
                            {artistTrack && (
                              <button
                                type="button"
                                onClick={() => {
                                  handlePlayTrack(artistTrack, tracks);
                                  setHeaderSearchFocused(false);
                                }}
                                aria-label={`Play top song by ${artist.name}`}
                                title={`Play ${artistTrack.cleanTitle}`}
                                className="w-7 h-7 rounded-full bg-[#BC0202] hover:bg-[#FF0000] text-white flex items-center justify-center shadow transition-colors cursor-pointer"
                              >
                                {isPlayingArtistTrack ? (
                                  <Pause className="w-3 h-3 fill-current" />
                                ) : (
                                  <Play className="w-3 h-3 fill-current ml-0.5" />
                                )}
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

              </div>

              {/* Bottom Quick Bar */}
              <div className="p-2.5 bg-black/90 flex items-center justify-between text-xs text-neutral-400 px-4">
                <span>Start typing to search full music catalog...</span>
                <button
                  type="button"
                  onClick={() => {
                    setHeaderSearchFocused(false);
                    setRoute('/search');
                  }}
                  className="text-xs font-semibold text-[#FF0000] hover:underline cursor-pointer"
                >
                  Explore All in Search →
                </button>
              </div>

            </div>
          )}
        </div>

        {/* Zone 3: Primary Account Action */}
        {/* Zone 3: Crisp White Pill Sign In Button Matching Reference Image */}
        <div className="flex items-center shrink-0">
          {currentUser ? (
            <button
              type="button"
              onClick={() => setRoute('/profile')}
              className="px-5 py-2 text-xs font-bold text-black bg-white hover:bg-neutral-200 rounded-full transition-colors whitespace-nowrap shadow cursor-pointer"
            >
              Sign in
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setRoute('/login')}
              className="px-5 py-2 text-xs font-bold text-black bg-white hover:bg-neutral-200 rounded-full transition-colors whitespace-nowrap shadow cursor-pointer"
            >
              Sign in
            </button>
          )}
        </div>
      </header>

      {/* Mobile Full-Screen Live Search Experience (Full Live PC View on Mobile) */}
      {headerSearchFocused && (
        <div className="md:hidden fixed inset-0 z-[100] bg-black flex flex-col h-full w-full overflow-hidden animate-in fade-in duration-150">
          {/* Top Search Bar Header */}
          <div className="h-16 px-3 bg-[#0A0A0A] border-b border-neutral-800/80 flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setHeaderSearchFocused(false)}
              aria-label="Back to main view"
              className="p-2 text-neutral-400 hover:text-white rounded-full hover:bg-neutral-900 transition-colors cursor-pointer shrink-0"
            >
              <ArrowLeft className="w-5 h-5 text-white" />
            </button>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (headerSearchQuery.trim()) {
                  saveRecentSearch(headerSearchQuery);
                }
                setHeaderSearchFocused(false);
                setRoute('/search');
              }}
              className="flex-1 relative flex items-center"
            >
              <Search className="w-5 h-5 text-neutral-300 absolute left-3.5 pointer-events-none" />
              <input
                type="search"
                autoFocus
                value={headerSearchQuery}
                onChange={(e) => {
                  setHeaderSearchQuery(e.target.value);
                  setHeaderSearchFocused(true);
                }}
                placeholder="Search songs, artists, soundtracks..."
                aria-label="Search music catalog"
                className="w-full pl-11 pr-9 py-2.5 rounded-full bg-neutral-900 border border-neutral-800 focus:border-[#FF0000] focus:ring-1 focus:ring-[#FF0000] focus:outline-none text-sm text-white placeholder-neutral-400"
              />
              {isSearchingHeader ? (
                <Loader2 className="w-5 h-5 text-[#FF0000] animate-spin absolute right-3" />
              ) : headerSearchQuery ? (
                <button
                  type="button"
                  onClick={() => {
                    setHeaderSearchQuery('');
                    setHeaderSearchResults([]);
                  }}
                  aria-label="Clear search"
                  className="absolute right-3 text-neutral-400 hover:text-white cursor-pointer p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              ) : null}
            </form>
          </div>

          {/* Scrollable Mobile Body */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6 pb-28">
            {/* If user is typing: Live Quick Results */}
            {headerSearchQuery.trim().length > 0 ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-neutral-800/80">
                  <span className="text-xs font-semibold text-neutral-300">
                    {isSearchingHeader
                      ? `Searching for "${headerSearchQuery}"...`
                      : `Results for "${headerSearchQuery}" (${headerSearchResults.length})`}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      if (headerSearchQuery.trim()) {
                        saveRecentSearch(headerSearchQuery);
                      }
                      setHeaderSearchFocused(false);
                      setRoute('/search');
                    }}
                    className="text-xs font-semibold text-[#FF0000] hover:underline cursor-pointer"
                  >
                    View All →
                  </button>
                </div>

                {headerSearchResults.length === 0 && !isSearchingHeader ? (
                  <div className="py-12 text-center text-sm text-neutral-500 space-y-3">
                    <p>No songs found for "{headerSearchQuery}".</p>
                    <button
                      type="button"
                      onClick={() => setHeaderSearchQuery('')}
                      className="px-4 py-1.5 rounded-full bg-neutral-900 border border-neutral-800 text-xs text-neutral-300 hover:text-white"
                    >
                      Clear search
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {headerSearchResults.map((track) => {
                      const isCurrent = currentTrack?.id === track.id;
                      const isTrackPlaying = isCurrent && engineState.isPlaying;
                      return (
                        <div
                          key={`mob-srch-${track.id}`}
                          className={`p-2.5 rounded-xl flex items-center justify-between gap-3 transition-colors ${isCurrent
                            ? 'bg-[#830000]/30 border border-[#FF0000]/40'
                            : 'bg-neutral-950/80 hover:bg-neutral-900 border border-neutral-800/70'
                            }`}
                        >
                          <button
                            type="button"
                            onClick={() => {
                              if (headerSearchQuery.trim()) {
                                saveRecentSearch(headerSearchQuery);
                              }
                              handlePlayTrack(track, headerSearchResults);
                              setHeaderSearchFocused(false);
                            }}
                            className="flex items-center gap-3 min-w-0 flex-1 text-left cursor-pointer"
                          >
                            <ArtworkTile
                              title={track.cleanTitle}
                              thumbnailUrl={track.thumbnailUrl}
                              size="sm"
                              isPlaying={isTrackPlaying}
                              className="w-12 h-12 shrink-0 rounded-lg"
                            />
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-semibold text-white truncate">
                                {track.cleanTitle}
                              </p>
                              <p className="text-xs text-neutral-400 truncate mt-0.5">
                                {track.artistName} · {track.language}
                              </p>
                            </div>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              if (headerSearchQuery.trim()) {
                                saveRecentSearch(headerSearchQuery);
                              }
                              handlePlayTrack(track, headerSearchResults);
                              setHeaderSearchFocused(false);
                            }}
                            aria-label={`Play ${track.cleanTitle}`}
                            className="w-9 h-9 rounded-full bg-[#BC0202] hover:bg-[#FF0000] text-white flex items-center justify-center shrink-0 shadow transition-colors cursor-pointer"
                          >
                            {isTrackPlaying ? (
                              <Pause className="w-4 h-4 fill-current" />
                            ) : (
                              <Play className="w-4 h-4 fill-current ml-0.5" />
                            )}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (headerSearchQuery.trim()) {
                        saveRecentSearch(headerSearchQuery);
                      }
                      setHeaderSearchFocused(false);
                      setRoute('/search');
                    }}
                    className="w-full py-3 rounded-xl bg-neutral-900 hover:bg-[#830000]/40 text-xs text-neutral-200 hover:text-white font-medium border border-neutral-800 transition-colors cursor-pointer text-center"
                  >
                    Open Full Search Catalog Page →
                  </button>
                </div>
              </div>
            ) : (
              /* Empty Query: Live PC-style suggestions on Mobile */
              <div className="space-y-6">
                {/* 1. Recent Searches */}
                {recentSearches.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-2.5">
                      <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider flex items-center gap-1.5">
                        <History className="w-3.5 h-3.5 text-[#FF0000]" />
                        Recent Searches
                      </span>
                      <button
                        type="button"
                        onClick={clearRecentSearches}
                        className="text-xs text-neutral-500 hover:text-[#FF0000] transition-colors cursor-pointer"
                      >
                        Clear all
                      </button>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {recentSearches.map((term) => (
                        <div
                          key={`mob-recent-${term}`}
                          className="group inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-neutral-900 border border-neutral-800 text-xs text-neutral-300 hover:text-white transition-all cursor-pointer shadow-sm"
                          onClick={() => {
                            setHeaderSearchQuery(term);
                            saveRecentSearch(term);
                            setHeaderSearchFocused(true);
                          }}
                        >
                          <History className="w-3 h-3 text-neutral-500 group-hover:text-[#FF0000] shrink-0" />
                          <span className="font-medium truncate max-w-[200px]">{term}</span>
                          <button
                            type="button"
                            onClick={(e) => removeRecentSearch(term, e)}
                            aria-label={`Remove ${term}`}
                            className="text-neutral-500 hover:text-white p-0.5 rounded"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 2. Trending Searches (Live Full Grid) */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-semibold text-neutral-300 uppercase tracking-wider flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-[#FF0000]" />
                      Trending Searches
                    </span>
                    <span className="text-[10px] text-neutral-400 font-mono flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-[#FF0000] animate-pulse" />
                      Live #1 Charts
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    {trendingSearches.map((item, idx) => (
                      <button
                        key={`mob-trend-${idx}`}
                        type="button"
                        onClick={() => {
                          setHeaderSearchQuery(item.term);
                          saveRecentSearch(item.term);
                          setHeaderSearchFocused(true);
                        }}
                        className="p-3 rounded-xl bg-neutral-900/90 hover:bg-neutral-800 border border-neutral-800/80 hover:border-[#BC0202]/60 text-left transition-all cursor-pointer flex flex-col justify-between group shadow-sm"
                      >
                        <div className="flex items-center justify-between gap-1 mb-2">
                          <span className="text-xs font-mono text-neutral-500 font-bold group-hover:text-neutral-300">
                            #{idx + 1}
                          </span>
                          <span className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-[#FF0000]/15 text-[#ff7272] border border-[#FF0000]/25">
                            {item.tag}
                          </span>
                        </div>
                        <p className="text-sm font-semibold text-white group-hover:text-[#FF0000] truncate transition-colors">
                          {item.term}
                        </p>
                        <p className="text-[11px] text-neutral-400 truncate mt-0.5">
                          {item.subtitle}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 3. Popular Artists */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-semibold text-neutral-300 uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-amber-400" />
                      Popular Artists
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setHeaderSearchFocused(false);
                        setRoute('/search');
                      }}
                      className="text-xs text-[#FF0000] hover:underline cursor-pointer font-medium"
                    >
                      View All →
                    </button>
                  </div>

                  <div className="space-y-2">
                    {popularArtists.map((artist) => {
                      const isFollowed = followedArtistIds.includes(artist.id);
                      const artistTrack =
                        tracks.find(
                          (t) =>
                            t.artistId === artist.id ||
                            t.artistName.toLowerCase().includes(artist.name.toLowerCase())
                        ) || tracks[0];
                      const isCurrent = currentTrack?.id === artistTrack?.id;
                      const isPlayingArtistTrack = isCurrent && engineState.isPlaying;

                      return (
                        <div
                          key={`mob-pop-art-${artist.id}`}
                          className="p-2.5 rounded-xl bg-neutral-900/80 hover:bg-neutral-800/90 border border-neutral-800/70 flex items-center justify-between gap-3 transition-colors"
                        >
                          <button
                            type="button"
                            onClick={() => {
                              setHeaderSearchFocused(false);
                              setRoute(`/artist/${artist.id}` as RoutePath);
                            }}
                            className="flex items-center gap-3 min-w-0 flex-1 text-left cursor-pointer"
                          >
                            <div className="relative w-11 h-11 rounded-full overflow-hidden bg-neutral-800 shrink-0 border border-neutral-700/60">
                              {artist.avatarUrl ? (
                                <img
                                  src={artist.avatarUrl}
                                  alt={artist.name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center font-bold text-sm text-white bg-[#830000]">
                                  {artist.name[0]}
                                </div>
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5">
                                <p className="text-sm font-semibold text-white truncate">
                                  {artist.name}
                                </p>
                                {isFollowed && (
                                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-[#FF0000]/20 text-[#ff7272] border border-[#FF0000]/30 font-mono">
                                    Following
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-neutral-400 truncate mt-0.5">
                                {artist.monthlyListenersLabel || artist.genres.slice(0, 2).join(' · ')}
                              </p>
                            </div>
                          </button>

                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={() => {
                                setHeaderSearchQuery(artist.name);
                                saveRecentSearch(artist.name);
                                setHeaderSearchFocused(true);
                              }}
                              className="px-2.5 py-1.5 rounded-lg text-xs text-neutral-300 bg-neutral-800 hover:bg-neutral-700 transition-colors cursor-pointer"
                            >
                              Search
                            </button>
                            {artistTrack && (
                              <button
                                type="button"
                                onClick={() => {
                                  handlePlayTrack(artistTrack, tracks);
                                  setHeaderSearchFocused(false);
                                }}
                                aria-label={`Play top song by ${artist.name}`}
                                className="w-8 h-8 rounded-full bg-[#BC0202] hover:bg-[#FF0000] text-white flex items-center justify-center shadow transition-colors cursor-pointer"
                              >
                                {isPlayingArtistTrack ? (
                                  <Pause className="w-3.5 h-3.5 fill-current" />
                                ) : (
                                  <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                                )}
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main Middle Layout: Desktop Sidebar + Scrollable Content Viewport */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* Desktop Sidebar Navigation */}
        <aside
          aria-label="Workspace sidebar"
          className="hidden lg:flex w-64 bg-black border-r border-neutral-800 flex-col justify-between p-4 overflow-y-auto shrink-0"
        >
          <div className="space-y-6">
            <div className="space-y-1">
              <p className="px-3 text-[11px] font-mono text-neutral-500 uppercase tracking-wider mb-1.5">
                Discover
              </p>
              <button
                type="button"
                onClick={() => setRoute('/')}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer ${route === '/'
                  ? 'bg-[#BC0202] text-white'
                  : 'text-neutral-300 hover:bg-neutral-900 hover:text-white'
                  }`}
              >
                <Home className="w-4 h-4 shrink-0" />
                <span>Home</span>
              </button>
              <button
                type="button"
                onClick={() => setRoute('/search')}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer ${route === '/search'
                  ? 'bg-[#BC0202] text-white'
                  : 'text-neutral-300 hover:bg-neutral-900 hover:text-white'
                  }`}
              >
                <Search className="w-4 h-4 shrink-0" />
                <span>Search</span>
              </button>
            </div>

            <div className="space-y-1">
              <p className="px-3 text-[11px] font-mono text-neutral-500 uppercase tracking-wider mb-1.5">
                Collection
              </p>
              {(
                [
                  { label: 'Library', path: '/library', icon: Library },
                  { label: 'Playlists', path: '/playlists', icon: ListMusic },
                ] as const
              ).map((item) => {
                const Icon = item.icon;
                const active = route === item.path || (item.path === '/playlists' && route.startsWith('/playlist/'));
                return (
                  <button
                    key={item.path}
                    type="button"
                    onClick={() => setRoute(item.path)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer ${active
                      ? 'bg-[#BC0202] text-white'
                      : 'text-neutral-300 hover:bg-neutral-900 hover:text-white'
                      }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </button>
                );
              })}
            </div>

            <div className="space-y-1">
              <p className="px-3 text-[11px] font-mono text-neutral-500 uppercase tracking-wider mb-1.5">
                Account
              </p>
              <button
                type="button"
                onClick={() => setRoute('/profile')}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer ${route === '/profile' || route === '/settings' || route === '/stats' || route.startsWith('/library/')
                  ? 'bg-[#BC0202] text-white'
                  : 'text-neutral-300 hover:bg-neutral-900 hover:text-white'
                  }`}
              >
                <User className="w-4 h-4 shrink-0" />
                <span>Profile</span>
              </button>
              <button
                type="button"
                onClick={() => setRoute('/admin')}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer ${route.startsWith('/admin')
                  ? 'bg-[#BC0202] text-white'
                  : 'text-neutral-300 hover:bg-neutral-900 hover:text-white'
                  }`}
              >
                <Shield className="w-4 h-4 shrink-0 text-[#FF0000]" />
                <span>Admin</span>
              </button>
            </div>
          </div>

          <div className="pt-4 border-t border-neutral-800/80 space-y-2 text-[11px] text-neutral-500">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setRoute('/privacy')}
                className="hover:text-neutral-300 cursor-pointer"
              >
                Privacy
              </button>
              <span>·</span>
              <button
                type="button"
                onClick={() => setRoute('/terms')}
                className="hover:text-neutral-300 cursor-pointer"
              >
                Terms
              </button>
              <span>·</span>
              <button
                type="button"
                onClick={() => setRoute('/copyright')}
                className="hover:text-neutral-300 cursor-pointer"
              >
                Copyright
              </button>
            </div>
            <p className="text-neutral-600">© 2026 MusicMine</p>
          </div>
        </aside>

        {/* Main Scrollable Viewport */}
        <main className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 lg:px-8 py-5 space-y-6 overscroll-contain">

          {/* Toast Notification Banner */}
          {toastMessage && (
            <div
              role="status"
              aria-live="polite"
              className="fixed bottom-24 right-6 z-50 px-4 py-2.5 rounded-xl bg-[#0D0D0D] border border-[#FF0000] text-xs font-medium text-white shadow-2xl flex items-center gap-2.5"
            >
              <Compass className="w-4 h-4 text-[#FF0000] shrink-0" />
              <span>{toastMessage}</span>
            </div>
          )}

          {/* Active Route Content */}
          <StateBoundary
            mode={viewStateMode}
            onResetToPopulated={() => setViewStateMode('populated')}
          >
            {route === '/' && (
              <HomeView
                tracks={tracks}
                albums={albums}
                artists={artists}
                homepageSections={homepageSections}
                currentTrackId={currentTrack?.id || null}
                isPlaying={engineState.isPlaying}
                likedTrackIds={likedTrackIds}
                playlists={playlists}
                onPlayTrack={handlePlayTrack}
                onAddToQueue={handleAddToQueue}
                onToggleLike={handleToggleLike}
                onAddTrackToPlaylist={handleAddTrackToPlaylist}
                onNavigate={setRoute}
              />
            )}

            {route === '/search' && (
              <SearchView
                tracks={tracks}
                artists={artists}
                albums={albums}
                initialQuery=""
                currentTrackId={currentTrack?.id || null}
                isPlaying={engineState.isPlaying}
                likedTrackIds={likedTrackIds}
                onPlayTrack={handlePlayTrack}
                onAddToQueue={handleAddToQueue}
                onToggleLike={handleToggleLike}
                onNavigate={setRoute}
                onTracksDiscovered={handleTracksDiscovered}
              />
            )}

            {route.startsWith('/track/') && (
              <EntityDetailView
                entityType="track"
                entityId={route.replace('/track/', '')}
                tracks={tracks}
                artists={artists}
                albums={albums}
                likedTrackIds={likedTrackIds}
                savedAlbumIds={savedAlbumIds}
                followedArtistIds={followedArtistIds}
                onPlayTrack={handlePlayTrack}
                onAddToQueue={handleAddToQueue}
                onToggleLike={handleToggleLike}
                onToggleSaveAlbum={handleToggleSaveAlbum}
                onToggleFollowArtist={handleToggleFollowArtist}
                onNavigate={setRoute}
              />
            )}

            {route.startsWith('/artist/') && (
              <EntityDetailView
                entityType="artist"
                entityId={route.replace('/artist/', '')}
                tracks={tracks}
                artists={artists}
                albums={albums}
                likedTrackIds={likedTrackIds}
                savedAlbumIds={savedAlbumIds}
                followedArtistIds={followedArtistIds}
                onPlayTrack={handlePlayTrack}
                onAddToQueue={handleAddToQueue}
                onToggleLike={handleToggleLike}
                onToggleSaveAlbum={handleToggleSaveAlbum}
                onToggleFollowArtist={handleToggleFollowArtist}
                onNavigate={setRoute}
              />
            )}

            {route.startsWith('/album/') && (
              <EntityDetailView
                entityType="album"
                entityId={route.replace('/album/', '')}
                tracks={tracks}
                artists={artists}
                albums={albums}
                likedTrackIds={likedTrackIds}
                savedAlbumIds={savedAlbumIds}
                followedArtistIds={followedArtistIds}
                onPlayTrack={handlePlayTrack}
                onAddToQueue={handleAddToQueue}
                onToggleLike={handleToggleLike}
                onToggleSaveAlbum={handleToggleSaveAlbum}
                onToggleFollowArtist={handleToggleFollowArtist}
                onNavigate={setRoute}
              />
            )}

            {(route === '/library' ||
              route === '/playlists' ||
              route.startsWith('/playlist/')) && (
                <LibraryAndPlaylistsView
                  route={route}
                  currentUser={currentUser}
                  tracks={tracks}
                  albums={albums}
                  artists={artists}
                  likedTrackIds={likedTrackIds}
                  savedAlbumIds={savedAlbumIds}
                  followedArtistIds={followedArtistIds}
                  history={history}
                  playlists={playlists}
                  onPlayTrack={handlePlayTrack}
                  onToggleLike={handleToggleLike}
                  onClearHistory={() => {
                    setHistory([]);
                    notify('Cleared listening history');
                  }}
                  onCreatePlaylist={handleCreatePlaylist}
                  onRenamePlaylist={handleRenamePlaylist}
                  onDeletePlaylist={handleDeletePlaylist}
                  onRemoveTrackFromPlaylist={handleRemoveTrackFromPlaylist}
                  onMovePlaylistTrack={handleMovePlaylistTrack}
                  onNavigate={setRoute}
                  onNotify={notify}
                />
              )}

            {(route === '/profile' ||
              route === '/settings' ||
              route === '/stats' ||
              route === '/library/liked' ||
              route === '/library/albums' ||
              route === '/library/history') && (
              <ProfileSettingsStatsView
                route={route}
                currentUser={currentUser}
                tracks={tracks}
                albums={albums}
                artists={artists}
                likedTrackIds={likedTrackIds}
                savedAlbumIds={savedAlbumIds}
                history={history}
                playlists={playlists}
                themeMode={themeMode}
                onSetThemeMode={(m) => {
                  setThemeMode(m);
                  notify(`Appearance changed to ${m.toUpperCase()}`);
                }}
                onUpdateProfile={(displayName, bio, privateHistory, publicProfile) => {
                  setCurrentUser((prev) =>
                    prev ? { ...prev, displayName, bio, privateHistory, publicProfile } : prev
                  );
                  notify('Profile saved');
                }}
                onLogout={() => {
                  setCurrentUser(null);
                  notify('Signed out');
                }}
                onPlayTrack={handlePlayTrack}
                onToggleLike={handleToggleLike}
                onClearHistory={() => {
                  setHistory([]);
                  notify('Cleared listening history');
                }}
                onNavigate={setRoute}
                onNotify={notify}
              />
            )}

            {(route === '/login' || route === '/signup') && (
              <AuthView
                mode={route === '/login' ? 'login' : 'signup'}
                currentUser={currentUser}
                onLoginEmail={(email, displayName, role: UserRole) => {
                  const userObj: UserAccount = {
                    id: `usr-${Date.now()}`,
                    email,
                    displayName,
                    username: email.split('@')[0] || 'listener',
                    bio: 'MusicMine listener',
                    role,
                    authProvider: 'email',
                    emailVerified: true,
                    status: 'active',
                    privateHistory: true,
                    publicProfile: false,
                    createdAt: new Date().toISOString(),
                  };
                  setCurrentUser(userObj);
                  notify(`Welcome, ${displayName}`);
                  setRoute(role === 'super_admin' ? '/admin' : '/');
                }}
                onLoginGoogle={() => {
                  setCurrentUser(INITIAL_USERS[0]);
                  notify('Signed in with Google');
                  setRoute('/');
                }}
                onContinueGuest={() => {
                  setCurrentUser(null);
                  setRoute('/');
                }}
                onNavigate={setRoute}
                onNotify={notify}
              />
            )}

            {route.startsWith('/admin') && (
              <AdminDashboardView
                subRoute={route.replace('/admin', '').replace(/^\//, '')}
                currentUser={currentUser}
                tracks={tracks}
                homepageSections={homepageSections}
                users={users}
                auditLogs={auditLogs}
                reports={reports}
                onToggleTrackVisibility={handleToggleTrackVisibility}
                onToggleSectionEnabled={handleToggleSectionEnabled}
                onMoveSectionOrder={handleMoveSectionOrder}
                onToggleUserStatus={handleToggleUserStatus}
                onResolveReport={handleResolveReport}
                onNavigate={setRoute}
              />
            )}

            {(route === '/privacy' || route === '/terms' || route === '/copyright') && (
              <LegalView
                page={route.replace('/', '') as 'privacy' | 'terms' | 'copyright'}
                onSubmitCopyrightNotice={(trackTitle, claimantEmail) => {
                  const newRep: ContentReport = {
                    id: `rep-${Date.now()}`,
                    trackId: 'trk-ri1Ar5nEq4s',
                    trackTitle,
                    reason: 'copyright_claim',
                    reporterEmail: claimantEmail,
                    submittedAt: new Date().toISOString(),
                    status: 'open',
                  };
                  setReports((prev) => [newRep, ...prev]);
                  appendAuditLog(
                    'COPYRIGHT_NOTICE_RECEIVED',
                    'report',
                    newRep.id,
                    `Takedown report submitted for "${trackTitle}"`
                  );
                  notify('Takedown request submitted');
                }}
              />
            )}
          </StateBoundary>
        </main>
      </div>

      {/* Persistent Music Player */}
      <GlobalPlayer
        currentTrack={currentTrack}
        queue={queue}
        currentIndex={currentIndex}
        engineState={engineState}
        shuffle={shuffle}
        shuffleMode={shuffleMode}
        repeatMode={repeatMode}
        likedTrackIds={likedTrackIds}
        sleepTimerMinutes={sleepTimerMinutes}
        onTogglePlay={() => audioEngine.togglePlay()}
        onPrev={handlePrevTrack}
        onNext={handleNextTrack}
        onSeek={(sec) => audioEngine.seek(sec)}
        onVolumeChange={(val) => audioEngine.setVolume(val)}
        onToggleMute={() => audioEngine.toggleMute()}
        onToggleShuffle={handleToggleShuffle}
        onPrioritizeSmartQueue={handlePrioritizeSmartQueue}
        onCycleRepeat={() =>
          setRepeatMode((prev) =>
            prev === 'off' ? 'all' : prev === 'all' ? 'one' : 'off'
          )
        }
        onToggleLike={handleToggleLike}
        onPlayQueueIndex={(idx) => {
          const target = queue[idx];
          if (target) {
            setCurrentIndex(idx);
            audioEngine.loadTrack(target, true);
          }
        }}
        onRemoveFromQueue={(idx) => {
          setQueue((prev) => prev.filter((_, i) => i !== idx));
          if (idx < currentIndex) {
            setCurrentIndex((prev) => Math.max(0, prev - 1));
          }
        }}
        onMoveQueueItem={(idx, dir) => {
          setQueue((prev) => {
            const next = [...prev];
            const swapIdx = dir === 'up' ? idx - 1 : idx + 1;
            if (swapIdx < 0 || swapIdx >= next.length) return prev;
            const [item] = next.splice(idx, 1);
            next.splice(swapIdx, 0, item);
            if (idx === currentIndex) setCurrentIndex(swapIdx);
            else if (swapIdx === currentIndex) setCurrentIndex(idx);
            return next;
          });
        }}
        onClearQueue={() => {
          if (currentTrack) {
            setQueue([currentTrack]);
            setCurrentIndex(0);
          }
        }}
        onSetPlaybackRate={(rate) => audioEngine.setPlaybackRate(rate)}
        onSetSleepTimer={(mins) => {
          setSleepTimerMinutes(mins);
          notify(mins ? `Sleep timer set for ${mins} minutes` : 'Sleep timer off');
        }}
        onNavigate={setRoute}
      />

      {/* Compact Mobile Bottom Navigation Bar */}
      <nav
        aria-label="Mobile bottom navigation"
        className="md:hidden h-14 bg-black/80 backdrop-blur-xl border-t border-neutral-800/50 px-2 pb-1 flex items-center justify-around shrink-0 z-30 sticky bottom-0"
      >
        {(
          [
            { label: 'Home', path: '/', icon: Home },
            { label: 'Search', path: '/search', icon: Search },
            { label: 'Library', path: '/library', icon: Library },
            { label: 'Playlists', path: '/playlists', icon: ListMusic },
            { label: 'Profile', path: '/profile', icon: User },
          ] as const
        ).map((tab) => {
          const Icon = tab.icon;
          const isActive =
            tab.path === '/'
              ? route === '/'
              : route === tab.path || route.startsWith(`${tab.path}/`);
          return (
            <button
              key={tab.path}
              type="button"
              onClick={() => {
                if (tab.path === '/search') {
                  setHeaderSearchFocused(true);
                }
                setRoute(tab.path);
              }}
              className={`flex flex-col items-center justify-center gap-0.5 py-1 px-3 rounded-lg text-[11px] font-medium transition-colors cursor-pointer ${isActive ? 'text-[#FF0000]' : 'text-neutral-400 hover:text-white'
                }`}
            >
              <div
                className={`relative flex items-center justify-center p-1 rounded-full transition-all ${isActive
                  ? 'bg-[#FF0000]/10 shadow-[inset_0_0_8px_rgba(255,0,0,0.45)] ring-1 ring-[#FF0000]/30'
                  : ''
                  }`}
              >
                <Icon className={`w-5 h-5 transition-transform ${isActive ? 'scale-105' : ''}`} />
              </div>
              <span>{tab.label}</span>
            </button>
          );
        })}

        {/* Thin Colored Playback Progress Bar at the Very Bottom of the Mobile Navigation Bar */}
        <div
          role="progressbar"
          aria-label="Current playback progress"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={
            engineState.duration > 0
              ? Math.min(100, Math.round((engineState.currentTime / engineState.duration) * 100))
              : 0
          }
          onClick={(e) => {
            if (!currentTrack || engineState.duration <= 0) return;
            const rect = e.currentTarget.getBoundingClientRect();
            const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
            audioEngine.seek(ratio * engineState.duration);
          }}
          className="absolute bottom-0 left-0 right-0 h-[3px] bg-neutral-900 overflow-hidden cursor-pointer"
        >
          <div
            className="h-full bg-gradient-to-r from-[#BC0202] via-[#FF0000] to-[#FF3B3B] shadow-[0_0_8px_rgba(255,0,0,0.75)] transition-all duration-150 ease-out"
            style={{
              width: `${engineState.duration > 0
                ? Math.min(100, Math.max(0, (engineState.currentTime / engineState.duration) * 100))
                : 0
                }%`,
            }}
          />
        </div>
      </nav>
    </div>
  );
}

export default MusicMineWebsiteApp;
