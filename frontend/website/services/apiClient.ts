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
    if (item.cleanTitle && item.artistName && item.id) {
      return item as Track;
    }
    const rawTitle = String(item.title || 'Untitled Track');
    const cleanTitle = rawTitle
      .replace(/\|.*$/g, '')
      .replace(/\((Official|Full|Lyric|Video|Audio).*?\)/gi, '')
      .replace(/\[.*?\]/g, '')
      .replace(/-\s*(8K|4K|HD|Full).*$/gi, '')
      .trim();
    const uploader = item.uploader || 'Featured Artist';
    const providerId = String(item.id || item.providerId || '');
    const thumbnail =
      item.thumbnail ||
      item.thumbnailUrl ||
      (providerId.length === 11 ? `https://i.ytimg.com/vi/${providerId}/hqdefault.jpg` : undefined);
    const streamUrl =
      item.streamUrl ||
      `${UPSTREAM_API_BASE}/api/audio?q=${encodeURIComponent(cleanTitle || rawTitle)}&key=${UPSTREAM_API_KEY}`;

    return {
      id: item.id?.startsWith('trk-') ? item.id : `trk-${providerId}`,
      providerId,
      title: rawTitle,
      cleanTitle: cleanTitle || rawTitle,
      artistId: `art-${uploader.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 32) || 'various'}`,
      artistName: uploader,
      albumId: `alb-${cleanTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 32) || 'single'}`,
      albumName: cleanTitle || 'Single Release',
      duration: typeof item.duration === 'number' ? item.duration : 210,
      uploader,
      language: item.language || 'Hindi',
      genre: item.genre || 'Bollywood',
      releaseYear: item.releaseYear || new Date().getFullYear(),
      thumbnailUrl: thumbnail,
      externalUrl: item.url || item.externalUrl,
      streamUrl,
      sourceType: 'API_CONTRACT_SAMPLE',
      visibleInCatalog: true,
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
    // Fallback directly to Upstream Nazriya Music API (which has full CORS enabled)
    if (foundTracks.length === 0) {
      try {
        const directUrl = normalized
          ? `${UPSTREAM_API_BASE}/api/search?q=${encodeURIComponent(query)}&key=${UPSTREAM_API_KEY}`
          : `${UPSTREAM_API_BASE}/api/trending?n=25&key=${UPSTREAM_API_KEY}`;
        const directRes = await fetch(directUrl, { signal: controller.signal });
        if (directRes.ok) {
          const directJson: any = await directRes.json();
          let rawList: any[] = [];
          if (Array.isArray(directJson)) {
            rawList = directJson;
          } else if (directJson && Array.isArray(directJson.data)) {
            rawList = directJson.data;
          } else if (directJson && Array.isArray(directJson.results)) {
            rawList = directJson.results;
          }
          if (rawList.length > 0) {
            foundTracks = parseRawListToTracks(rawList);
          }
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
