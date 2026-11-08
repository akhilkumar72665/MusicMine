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
  if (normalized && clientSearchCache.has(normalized)) {
    return clientSearchCache.get(normalized) || null;
  }

  if (activeSearchController && normalized) {
    activeSearchController.abort();
  }
  const controller = new AbortController();
  if (normalized) {
    activeSearchController = controller;
  }

  try {
    const res = await fetch(`/api/v1/search?q=${encodeURIComponent(query)}`, {
      signal: controller.signal,
    });
    if (!res.ok) return null;
    const json = (await res.json()) as SearchApiResponse;
    const tracks = Array.isArray(json.data) ? json.data : null;
    if (tracks && normalized) {
      clientSearchCache.set(normalized, tracks);
    }
    return tracks;
  } catch {
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
