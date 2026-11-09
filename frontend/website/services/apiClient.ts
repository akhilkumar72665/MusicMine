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

const clientSearchCache = new Map<string, Track[]>();
let activeSearchController: AbortController | null = null;

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
    const endpoints = [
      `/api/v1/search?q=${encodeURIComponent(query)}`,
      `/api/search?q=${encodeURIComponent(query)}`,
      `/api?q=${encodeURIComponent(query)}`,
    ];

    let res: Response | null = null;
    for (const ep of endpoints) {
      try {
        const candidate = await fetch(ep, { signal: controller.signal });
        const cType = candidate.headers.get('content-type') || '';
        if (candidate.ok && cType.includes('application/json')) {
          res = candidate;
          break;
        }
      } catch (e: any) {
        if (e?.name === 'AbortError') throw e;
      }
    }

    if (!res || !res.ok) return null;
    const json: any = await res.json();
    let rawList: any[] = [];
    if (Array.isArray(json)) {
      rawList = json;
    } else if (json && Array.isArray(json.data)) {
      rawList = json.data;
    } else if (json && Array.isArray(json.results)) {
      rawList = json.results;
    }

    const tracks: Track[] = rawList.map((item: any) => {
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
        item.thumbnail || item.thumbnailUrl || (providerId.length === 11 ? `https://i.ytimg.com/vi/${providerId}/hqdefault.jpg` : undefined);
      const streamUrl = item.streamUrl || `/api/v1/audio/stream?id=${providerId}&q=${encodeURIComponent(rawTitle)}`;

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

    if (tracks.length > 0) {
      clientSearchCache.set(cacheKey, tracks);
    }
    return tracks;
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
