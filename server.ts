import crypto from 'crypto';
import dotenv from 'dotenv';
import express, { Request, Response } from 'express';
import path from 'path';
import { Readable } from 'stream';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import {
  INITIAL_PLAYLISTS,
  INITIAL_TRACKS,
} from './frontend/website/data/catalogFixtures';
import {
  resolveFastDirectStreamUrl,
  resolveRealAudioBuffer,
  searchMusicCatalog,
} from './backend/integrations/music-api/providerAdapter';
import { Playlist, Track } from './shared/types/music';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// In-memory application state for /api/v1/* endpoints
let serverTracks: Track[] = [...INITIAL_TRACKS];
let serverLikedIds: string[] = [
  'trk-ri1Ar5nEq4s',
  'trk-u2NAuswnTKs',
  'trk-BddP6PYo2gs',
];
let serverPlaylists: Playlist[] = [...INITIAL_PLAYLISTS];

const rateLimitWindowMs = 60_000;
const maxRequestsPerMinute = 180;
const ipHits = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = ipHits.get(ip);
  if (!entry || now > entry.resetAt) {
    ipHits.set(ip, { count: 1, resetAt: now + rateLimitWindowMs });
    return true;
  }
  if (entry.count >= maxRequestsPerMinute) {
    return false;
  }
  entry.count += 1;
  return true;
}

export function createExpressApp() {
  const app = express();

  app.use(express.json({ limit: '256kb' }));

  app.use((req, res, next) => {
    // If Vercel rewrote path to /api or /api/index, restore original URL
    const original = (req.headers['x-matched-path'] || req.headers['x-vercel-original-url']) as string | undefined;
    if (original && original.startsWith('/api') && (req.url === '/api' || req.url.startsWith('/api?'))) {
      const queryPart = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
      req.url = original.includes('?') ? original : `${original}${queryPart}`;
    }

    const reqId = crypto.randomUUID();
    res.setHeader('X-Request-Id', reqId);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', '*');
    if (req.method === 'OPTIONS') {
      res.sendStatus(204);
      return;
    }
    next();
  });

  // 1. GET /api/v1/search?q=... (also support /v1/search)
  app.get(['/api/v1/search', '/v1/search'], async (req: Request, res: Response) => {
    const clientIp =
      (req.headers['x-forwarded-for'] as string) ||
      req.socket?.remoteAddress ||
      'local';
    if (!checkRateLimit(clientIp)) {
      res.status(429).json({
        error: {
          code: 'RATE_LIMITED',
          message: 'Too many search requests. Please wait a moment and try again.',
        },
      });
      return;
    }

    const q = typeof req.query.q === 'string' ? req.query.q : '';
    const result = await searchMusicCatalog(q, serverTracks);

    // Merge discovered tracks into local cache
    for (const remoteTrack of result.tracks) {
      if (!serverTracks.some((t) => t.id === remoteTrack.id)) {
        serverTracks.push(remoteTrack);
      }
    }

    res.json({
      data: result.tracks,
      meta: {
        requestId: result.requestId,
        query: result.query,
        count: result.tracks.length,
        upstreamConnected: result.upstreamReachable,
      },
    });
  });

  // 2. GET /api/v1/audio/stream (Same-origin zero-latency chunked proxy for Web Audio EQ & Analyser)
  app.get(['/api/v1/audio/stream', '/v1/audio/stream'], async (req: Request, res: Response) => {
    const providerId = typeof req.query.id === 'string' ? req.query.id : undefined;
    const query = typeof req.query.q === 'string' ? req.query.q : undefined;
    const title = typeof req.query.title === 'string' ? req.query.title : undefined;
    const artist = typeof req.query.artist === 'string' ? req.query.artist : undefined;
    const directParam = typeof req.query.streamUrl === 'string' ? req.query.streamUrl : undefined;

    const knownTrack = serverTracks.find(
      (t) => (providerId && t.providerId === providerId) || (title && t.cleanTitle === title)
    );
    let targetStreamUrl = directParam || knownTrack?.streamUrl || null;

    if (!targetStreamUrl) {
      targetStreamUrl = await resolveFastDirectStreamUrl({
        providerId,
        query,
        title,
        artist,
      });
      if (targetStreamUrl && knownTrack) {
        knownTrack.streamUrl = targetStreamUrl;
      }
    }

    if (targetStreamUrl) {
      // Direct CDN 302 redirect: zero server buffering overhead, instant byte-range audio playback
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
      res.redirect(302, targetStreamUrl);
      return;
    }

    const audioEntry = await resolveRealAudioBuffer({
      providerId,
      query,
      title,
      artist,
    });

    if (!audioEntry) {
      res.status(502).json({
        error: {
          code: 'AUDIO_UNAVAILABLE',
          message: 'Could not load audio stream for this track.',
        },
      });
      return;
    }

    const totalLength = audioEntry.buffer.length;
    const range = req.headers.range;

    res.setHeader('Content-Type', audioEntry.contentType);
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Access-Control-Allow-Origin', '*');

    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : totalLength - 1;

      if (start >= totalLength || end >= totalLength) {
        res.status(416).setHeader('Content-Range', `bytes */${totalLength}`);
        res.end();
        return;
      }

      const chunk = audioEntry.buffer.subarray(start, end + 1);
      res.status(206);
      res.setHeader('Content-Range', `bytes ${start}-${end}/${totalLength}`);
      res.setHeader('Content-Length', chunk.length);

      const stream = new Readable({
        read() {
          this.push(chunk);
          this.push(null);
        },
      });
      stream.pipe(res);
    } else {
      res.status(200);
      res.setHeader('Content-Length', totalLength);
      const stream = new Readable({
        read() {
          this.push(audioEntry.buffer);
          this.push(null);
        },
      });
      stream.pipe(res);
    }
  });

  // 3. GET /api/v1/audio/download (Direct file attachment stream for zero-buffer download)
  app.get(['/api/v1/audio/download', '/v1/audio/download'], async (req: Request, res: Response) => {
    const providerId = typeof req.query.id === 'string' ? req.query.id : undefined;
    const query = typeof req.query.q === 'string' ? req.query.q : undefined;
    const title = typeof req.query.title === 'string' ? req.query.title : 'track';
    const artist = typeof req.query.artist === 'string' ? req.query.artist : 'artist';
    const directParam = typeof req.query.streamUrl === 'string' ? req.query.streamUrl : undefined;

    const safeFilename = `${title} - ${artist}`.replace(/[/\\?%*:|"<>]/g, '_');

    let streamTarget = directParam;
    if (!streamTarget) {
      streamTarget = (await resolveFastDirectStreamUrl({ providerId, query, title, artist })) || undefined;
    }

    if (streamTarget) {
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${encodeURIComponent(safeFilename)}.mp4"`
      );
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.redirect(302, streamTarget);
      return;
    }

    const audioEntry = await resolveRealAudioBuffer({ providerId, query, title, artist });
    if (!audioEntry) {
      res.status(502).json({
        error: { code: 'DOWNLOAD_FAILED', message: 'Could not prepare download file.' },
      });
      return;
    }

    res.setHeader('Content-Type', audioEntry.contentType);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(safeFilename)}.mp3"`
    );
    res.setHeader('Content-Length', audioEntry.buffer.length);
    res.setHeader('Access-Control-Allow-Origin', '*');

    const stream = new Readable({
      read() {
        this.push(audioEntry.buffer);
        this.push(null);
      },
    });
    stream.pipe(res);
  });

  // 4. GET /api/v1/catalog
  app.get(['/api/v1/catalog', '/v1/catalog'], (_req: Request, res: Response) => {
    res.json({
      data: serverTracks,
      meta: { count: serverTracks.length },
    });
  });

  // 5. GET /api/v1/track/:trackId
  app.get(['/api/v1/track/:trackId', '/v1/track/:trackId'], (req: Request, res: Response) => {
    const { trackId } = req.params;
    const track = serverTracks.find((t) => t.id === trackId || t.providerId === trackId);
    if (!track) {
      res.status(404).json({
        error: { code: 'TRACK_NOT_FOUND', message: 'Track not found.' },
      });
      return;
    }
    res.json({ data: track });
  });

  // 6. GET /api/v1/artist/:artistId/tracks
  app.get(['/api/v1/artist/:artistId/tracks', '/v1/artist/:artistId/tracks'], (req: Request, res: Response) => {
    const { artistId } = req.params;
    const cleanId = artistId.toLowerCase();
    const artistName = cleanId.replace(/^art-/, '').replace(/-/g, ' ');

    const artistTracks = serverTracks.filter(
      (t) =>
        t.artistId === cleanId ||
        t.artistName.toLowerCase().includes(artistName) ||
        (t.featuredArtists &&
          t.featuredArtists.some((fa) => fa.toLowerCase().includes(artistName)))
    );

    res.json({
      data: artistTracks,
      meta: { count: artistTracks.length },
    });
  });

  // 7. GET /api/v1/album/:albumId/tracks
  app.get(['/api/v1/album/:albumId/tracks', '/v1/album/:albumId/tracks'], (req: Request, res: Response) => {
    const { albumId } = req.params;
    const cleanId = albumId.toLowerCase();
    const albumName = cleanId.replace(/^alb-/, '').replace(/-/g, ' ');

    const albumTracks = serverTracks.filter(
      (t) => t.albumId === cleanId || t.albumName.toLowerCase().includes(albumName)
    );

    res.json({
      data: albumTracks,
      meta: { count: albumTracks.length },
    });
  });

  // 8. GET /api/v1/movie/:movieId/tracks
  app.get(['/api/v1/movie/:movieId/tracks', '/v1/movie/:movieId/tracks'], (req: Request, res: Response) => {
    const { movieId } = req.params;
    const cleanMovieName = movieId
      .toLowerCase()
      .replace(/^mov-/, '')
      .replace(/^alb-/, '')
      .replace(/-/g, ' ');

    const movieTracks = serverTracks.filter(
      (t) =>
        (t.albumName && t.albumName.toLowerCase().includes(cleanMovieName)) ||
        t.title.toLowerCase().includes(cleanMovieName) ||
        t.cleanTitle.toLowerCase().includes(cleanMovieName)
    );

    res.json({
      data: movieTracks,
      meta: {
        movieId,
        movieName: cleanMovieName,
        count: movieTracks.length,
      },
    });
  });

  // 9. GET /api/v1/lyrics
  app.get(['/api/v1/lyrics', '/v1/lyrics'], async (req: Request, res: Response) => {
    const title = typeof req.query.title === 'string' ? req.query.title : '';
    const artist = typeof req.query.artist === 'string' ? req.query.artist : '';

    if (!title) {
      res.status(400).json({ error: { message: 'Title is required.' } });
      return;
    }

    const cleanTitle = title
      .replace(/\s*\(From\s+[^)]+\)/gi, '')
      .replace(/\s*\(Tu\s+[^)]+\)/gi, '')
      .replace(/\s*-\s*Happy\s+Diwali/gi, '')
      .replace(/\s*\[[^\]]+\]/gi, '')
      .trim();

    const searchQueries = [
      `${cleanTitle} ${artist}`.trim(),
      cleanTitle,
      title,
    ];

    try {
      for (const q of searchQueries) {
        const upstream = await fetch(
          `https://lrclib.net/api/search?q=${encodeURIComponent(q)}`,
          { headers: { 'User-Agent': 'MusicMine/1.0' } }
        );
        if (!upstream.ok) continue;

        const data = (await upstream.json()) as Array<{
          id: number;
          trackName: string;
          artistName: string;
          syncedLyrics?: string;
          plainLyrics?: string;
        }>;

        if (Array.isArray(data) && data.length > 0) {
          const matchWithSynced = data.find((d) => Boolean(d.syncedLyrics)) || data[0];
          if (matchWithSynced.syncedLyrics) {
            const rawLrc = matchWithSynced.syncedLyrics;
            const parsedLines: Array<{ timeSec: number; text: string }> = [];
            const lrcRegex = /\[(\d{2}):(\d{2})(?:\.(\d{2,3}))?\](.*)/g;
            let m;
            while ((m = lrcRegex.exec(rawLrc)) !== null) {
              const mins = parseInt(m[1], 10);
              const secs = parseInt(m[2], 10);
              const msFraction = m[3] ? parseFloat(`0.${m[3]}`) : 0;
              const totalSec = mins * 60 + secs + msFraction;
              const text = m[4].trim();
              if (text) {
                parsedLines.push({ timeSec: totalSec, text });
              }
            }
            if (parsedLines.length > 0) {
              res.json({
                data: {
                  synced: true,
                  lines: parsedLines,
                  source: 'lrclib',
                },
              });
              return;
            }
          }

          if (matchWithSynced.plainLyrics) {
            const plainLines = matchWithSynced.plainLyrics
              .split('\n')
              .map((l) => l.trim())
              .filter(Boolean)
              .map((text, idx) => ({
                timeSec: idx * 5,
                text,
              }));
            res.json({
              data: {
                synced: false,
                lines: plainLines,
                source: 'lrclib_plain',
              },
            });
            return;
          }
        }
      }
    } catch {
      // Fallback
    }

    res.json({
      data: {
        synced: false,
        lines: [
          { timeSec: 0, text: `♪ Music Playing — ${cleanTitle}` },
          { timeSec: 10, text: `Vocals by ${artist || 'Featured Artist'}` },
          { timeSec: 25, text: `MusicMine High Fidelity 320kbps Audio` },
          { timeSec: 45, text: `Enjoy the beats & vibe!` },
        ],
        source: 'catalog_synced',
      },
    });
  });

  // 10. User & Playlist CRUD routes
  app.get(['/api/v1/me/liked', '/v1/me/liked'], (_req: Request, res: Response) => {
    res.json({ data: serverLikedIds });
  });

  app.post(['/api/v1/me/liked', '/v1/me/liked', '/api/v1/me/liked-tracks', '/v1/me/liked-tracks'], (req: Request, res: Response) => {
    const { trackId, liked } = req.body || {};
    const actualTrackId = trackId;
    const isLiked = typeof liked === 'boolean' ? liked : true;
    if (!actualTrackId) {
      res.status(400).json({ error: { message: 'trackId is required.' } });
      return;
    }
    if (isLiked) {
      if (!serverLikedIds.includes(actualTrackId)) {
        serverLikedIds.unshift(actualTrackId);
      }
    } else {
      serverLikedIds = serverLikedIds.filter((id) => id !== actualTrackId);
    }
    res.json({ data: { trackId: actualTrackId, liked: isLiked, total: serverLikedIds.length } });
  });

  app.delete(['/api/v1/me/liked/:trackId', '/v1/me/liked/:trackId', '/api/v1/me/liked-tracks/:trackId', '/v1/me/liked-tracks/:trackId'], (req: Request, res: Response) => {
    const { trackId } = req.params;
    if (trackId) {
      serverLikedIds = serverLikedIds.filter((id) => id !== trackId);
    }
    res.json({ data: { trackId, liked: false, total: serverLikedIds.length } });
  });

  app.get(['/api/v1/me/playlists', '/v1/me/playlists'], (_req: Request, res: Response) => {
    res.json({ data: serverPlaylists });
  });

  app.post(['/api/v1/me/playlists', '/v1/me/playlists'], (req: Request, res: Response) => {
    const { name, description, isPublic, ownerName } = req.body || {};
    if (!name || typeof name !== 'string') {
      res.status(400).json({ error: { message: 'Playlist name is required.' } });
      return;
    }
    const newPlaylist: Playlist = {
      id: `pl-${Date.now()}`,
      name: name.trim(),
      description: description ? String(description).trim() : 'Created on MusicMine',
      ownerId: 'usr-active',
      ownerName: ownerName || 'Listener',
      isPublic: Boolean(isPublic),
      trackIds: [],
      followersCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    serverPlaylists.unshift(newPlaylist);
    res.status(201).json({ data: newPlaylist });
  });

  const handleUpdatePlaylist = (req: Request, res: Response) => {
    const { playlistId } = req.params;
    const updates = req.body || {};
    let updatedItem: Playlist | null = null;

    serverPlaylists = serverPlaylists.map((pl) => {
      if (pl.id !== playlistId) return pl;
      updatedItem = {
        ...pl,
        name: updates.name !== undefined ? updates.name : pl.name,
        description: updates.description !== undefined ? updates.description : pl.description,
        isPublic: updates.isPublic !== undefined ? updates.isPublic : pl.isPublic,
        trackIds: Array.isArray(updates.trackIds) ? updates.trackIds : pl.trackIds,
        updatedAt: new Date().toISOString(),
      };
      return updatedItem;
    });

    if (!updatedItem) {
      res.status(404).json({
        error: { code: 'PLAYLIST_NOT_FOUND', message: 'Playlist not found.' },
      });
      return;
    }
    res.json({ data: updatedItem });
  };

  app.put(['/api/v1/me/playlists/:playlistId', '/v1/me/playlists/:playlistId'], handleUpdatePlaylist);
  app.patch(['/api/v1/me/playlists/:playlistId', '/v1/me/playlists/:playlistId'], handleUpdatePlaylist);

  app.delete(['/api/v1/me/playlists/:playlistId', '/v1/me/playlists/:playlistId'], (req: Request, res: Response) => {
    serverPlaylists = serverPlaylists.filter((pl) => pl.id !== req.params.playlistId);
    res.json({ data: { deleted: true } });
  });

  return app;
}

export async function startServer() {
  const app = createExpressApp();
  const PORT = parseInt(process.env.PORT || '3000', 10);

  // Vite middleware in development, static dist in production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true, allowedHosts: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`MusicMine server running on http://0.0.0.0:${PORT}`);
  });
}

// Only auto-start when running directly (node/tsx server.ts), not when imported by Vercel serverless
const isDirectExecution =
  process.argv[1] &&
  (process.argv[1].endsWith('server.ts') || process.argv[1].endsWith('server.js'));

if (isDirectExecution && process.env.VERCEL !== '1') {
  startServer();
}
