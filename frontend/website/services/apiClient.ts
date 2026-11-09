import { Playlist, Track } from '../../../shared/types/music';

export interface SearchApiResponse {
  data: Track[];
  meta: {
    requestId: string;
    query: string;
    count: number;
    upstreamConnected: boolean;
  };
}

const UPSTREAM_API_BASE = 'https://nazriya.musicmine.in';
const UPSTREAM_API_KEY = 'nz_bcfe4849cb48f9180f389852';

const clientSearchCache = new Map<string, Track[]>();
let activeSearchController: AbortController | null = null;

function parseRawListToTracks(rawList: any[]): Track[] {
  return rawList.map((item: any) => {
    const rawTitle = String(item.title || item.cleanTitle || 'Untitled Track');
    const cleanTitle = (item.cleanTitle || rawTitle)
      .replace(/\|.*$/g, '')
      .replace(/\((Official|Full|Lyric|Video|Audio).*?\)/gi, '')
      .replace(/\[.*?\]/g, '')
      .replace(/-\s*(8K|4K|HD|Full).*$/gi, '')
      .trim();
    const uploader = item.artistName || item.uploader || 'Featured Artist';
    const providerId = String(item.providerId || item.id || '');
    const thumbnail =
      item.thumbnail ||
      item.thumbnailUrl ||
      (providerId.length === 11 ? `https://i.ytimg.com/vi/${providerId}/hqdefault.jpg` : undefined);

    let streamUrl = item.streamUrl;
    if (!streamUrl || !/^https?:\/\//i.test(streamUrl) || streamUrl.includes('/api/v1/audio/stream') || streamUrl.includes('/api/audio/stream')) {
      const q = encodeURIComponent(cleanTitle || rawTitle);
      streamUrl = `${UPSTREAM_API_BASE}/api/audio?q=${q}&key=${UPSTREAM_API_KEY}`;
    }

    if (item.cleanTitle && item.artistName && item.id) {
      return {
        ...item,
        streamUrl,
        sourceApi: item.sourceApi || (item.providerId?.startsWith('svn-') ? 'JioSaavn' : item.providerId?.startsWith('itu-') ? 'iTunes' : 'Nazriya API'),
      } as Track;
    }

    return {
      id: item.id?.startsWith('trk-') ? item.id : `trk-${providerId}`,
      providerId,
      title: item.title || rawTitle,
      cleanTitle: cleanTitle || rawTitle,
      artistId: item.artistId || `art-${uploader.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 32) || 'various'}`,
      artistName: uploader,
      albumId: item.albumId || `alb-${cleanTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 32) || 'single'}`,
      albumName: item.albumName || cleanTitle || 'Single Release',
      duration: typeof item.duration === 'number' ? item.duration : 210,
      uploader,
      language: item.language || 'Hindi',
      genre: item.genre || 'Bollywood',
      releaseYear: item.releaseYear || new Date().getFullYear(),
      thumbnailUrl: thumbnail,
      externalUrl: item.url || item.externalUrl,
      streamUrl,
      sourceType: item.sourceType || 'API_CONTRACT_SAMPLE',
      visibleInCatalog: true,
      sourceApi: item.sourceApi || (providerId.startsWith('svn-') ? 'JioSaavn' : providerId.startsWith('itu-') ? 'iTunes' : 'Nazriya API'),
    };
  });
}

export async function fetchSearchTracks(query: string): Promise<Track[] | null> {
  const normalized = query.trim().toLowerCase();
  const cacheKey = normalized || '__trending__';
  if (clientSearchCache.has(cacheKey)) {
    return clientSearchCache.get(cacheKey) || null;
  }

  if (activeSearchController && normalized) {
    activeSearchController.abort();
  }
  const controller = new AbortController();
  if (normalized) {
    activeSearchController = controller;
  }

  try {
    const localEndpoints = [
      `/api/v1/search?q=${encodeURIComponent(query)}`,
      `/api/search?q=${encodeURIComponent(query)}`,
      `/api?q=${encodeURIComponent(query)}`,
    ];

    let foundTracks: Track[] = [];

    // 1. Try local Express backend endpoints first
    for (const ep of localEndpoints) {
      try {
        const candidate = await fetch(ep, { signal: controller.signal });
        const cType = candidate.headers.get('content-type') || '';
        if (candidate.ok && cType.includes('application/json')) {
          const json: any = await candidate.json();
          let rawList: any[] = [];
          if (Array.isArray(json)) {
            rawList = json;
          } else if (json && Array.isArray(json.data)) {
            rawList = json.data;
          } else if (json && Array.isArray(json.results)) {
            rawList = json.results;
          }
          if (rawList.length > 0) {
            foundTracks = parseRawListToTracks(rawList);
            break;
          }
        }
      } catch (e: any) {
        if (e?.name === 'AbortError') throw e;
      }
    }

    // 2. If local backend returned 0 tracks or failed (e.g. on Vercel deployment where serverless timed out or has no env vars):
    // Fallback directly to Upstream Nazriya Music API + Apple iTunes (which have full CORS enabled)
    if (foundTracks.length === 0) {
      try {
        const directUrl = normalized
          ? `${UPSTREAM_API_BASE}/api/search?q=${encodeURIComponent(query)}&key=${UPSTREAM_API_KEY}`
          : `${UPSTREAM_API_BASE}/api/trending?n=25&key=${UPSTREAM_API_KEY}`;
        const itunesUrl = normalized
          ? `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=song&limit=15`
          : null;

        const [directRes, itunesRes] = await Promise.all([
          fetch(directUrl, { signal: controller.signal }).catch(() => null),
          itunesUrl ? fetch(itunesUrl, { signal: controller.signal }).catch(() => null) : Promise.resolve(null),
        ]);

        let rawList: any[] = [];
        if (directRes && directRes.ok) {
          const directJson: any = await directRes.json();
          const items = Array.isArray(directJson)
            ? directJson
            : directJson?.data || directJson?.results || [];
          for (const item of items) {
            rawList.push({ ...item, sourceApi: 'Nazriya API' });
          }
        }

        if (itunesRes && itunesRes.ok) {
          const itunesJson: any = await itunesRes.json();
          const itunesItems = Array.isArray(itunesJson?.results) ? itunesJson.results : [];
          for (const it of itunesItems) {
            rawList.push({
              id: `itu-${it.trackId}`,
              providerId: `itu-${it.trackId}`,
              title: it.trackName,
              cleanTitle: it.trackName,
              artistName: it.artistName,
              albumName: it.collectionName,
              duration: Math.round((it.trackTimeMillis || 210000) / 1000),
              thumbnail: it.artworkUrl100?.replace('100x100bb', '600x600bb'),
              streamUrl: it.previewUrl,
              sourceApi: 'iTunes',
            });
          }
        }

        if (rawList.length > 0) {
          foundTracks = parseRawListToTracks(rawList);
        }
      } catch (e: any) {
        if (e?.name === 'AbortError') throw e;
      }
    }

    if (foundTracks.length > 0) {
      clientSearchCache.set(cacheKey, foundTracks);
    }
    return foundTracks;
  } catch (err: any) {
    if (err?.name === 'AbortError') return null;
    return null;
  }
}

export async function syncLikeTrack(trackId: string, like: boolean): Promise<void> {
  try {
    if (like) {
      await fetch('/api/v1/me/liked-tracks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trackId }),
      });
    } else {
      await fetch(`/api/v1/me/liked-tracks/${encodeURIComponent(trackId)}`, {
        method: 'DELETE',
      });
    }
  } catch {
    // Best-effort server sync alongside localStorage
  }
}

export async function syncCreatePlaylist(
  name: string,
  description: string,
  isPublic: boolean,
  ownerName: string
): Promise<Playlist | null> {
  try {
    const res = await fetch('/api/v1/me/playlists', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, description, isPublic, ownerName }),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { data: Playlist };
    return json.data;
  } catch {
    return null;
  }
}

export async function syncUpdatePlaylist(
  playlistId: string,
  updates: Partial<Playlist>
): Promise<void> {
  try {
    await fetch(`/api/v1/me/playlists/${encodeURIComponent(playlistId)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
  } catch {
    // Best-effort sync
  }
}

export async function syncDeletePlaylist(playlistId: string): Promise<void> {
  try {
    await fetch(`/api/v1/me/playlists/${encodeURIComponent(playlistId)}`, {
      method: 'DELETE',
    });
  } catch {
    // Best-effort sync
  }
}
