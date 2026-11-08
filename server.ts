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

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '256kb' }));

  app.use((_req, res, next) => {
    const reqId = crypto.randomUUID();
    res.setHeader('X-Request-Id', reqId);
    next();
  });

  // 1. GET /api/v1/search?q=...
  app.get('/api/v1/search', async (req: Request, res: Response) => {
    const clientIp = req.ip || 'local';
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

    // Register newly discovered tracks in serverTracks so detail/stream lookups work
    const existingIds = new Set(serverTracks.map((t) => t.id));
    for (const trk of result.tracks) {
      if (!existingIds.has(trk.id)) {
        serverTracks.push(trk);
        existingIds.add(trk.id);
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
  app.get('/api/v1/audio/stream', async (req: Request, res: Response) => {
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
      try {
        const upstreamHeaders: Record<string, string> = {};
        if (req.headers.range) {
          upstreamHeaders['Range'] = req.headers.range;
        }
        const upstreamRes = await fetch(targetStreamUrl, {
          headers: upstreamHeaders,
        });
        if (upstreamRes.ok || upstreamRes.status === 206) {
          res.status(upstreamRes.status);
          res.setHeader('Content-Type', upstreamRes.headers.get('content-type') || 'audio/mp4');
          res.setHeader('Accept-Ranges', 'bytes');
          res.setHeader('Access-Control-Allow-Origin', '*');
          const contentLen = upstreamRes.headers.get('content-length');
          if (contentLen) res.setHeader('Content-Length', contentLen);
          const contentRange = upstreamRes.headers.get('content-range');
          if (contentRange) res.setHeader('Content-Range', contentRange);
          res.setHeader('Cache-Control', 'public, max-age=3600');

          if (upstreamRes.body) {
            Readable.fromWeb(upstreamRes.body as unknown as import('stream/web').ReadableStream).pipe(res);
            return;
          }
        }
      } catch {
        // Fall through to buffer resolver if direct pipe fails
      }
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
    res.setHeader('Cache-Control', 'public, max-age=1800');

    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : totalLength - 1;
      const safeStart = isNaN(start) ? 0 : Math.max(0, Math.min(start, totalLength - 1));
      const safeEnd = isNaN(end)
        ? totalLength - 1
        : Math.max(safeStart, Math.min(end, totalLength - 1));
      const chunkLength = safeEnd - safeStart + 1;

      res.status(206);
      res.setHeader('Content-Range', `bytes ${safeStart}-${safeEnd}/${totalLength}`);
      res.setHeader('Content-Length', String(chunkLength));
      res.end(audioEntry.buffer.subarray(safeStart, safeEnd + 1));
      return;
    }

    res.status(200);
    res.setHeader('Content-Length', String(totalLength));
    res.end(audioEntry.buffer);
  });

  // 2b. GET /api/v1/audio/download (Direct song file download with clean filename)
  app.get('/api/v1/audio/download', async (req: Request, res: Response) => {
    const providerId = typeof req.query.id === 'string' ? req.query.id : undefined;
    const query = typeof req.query.q === 'string' ? req.query.q : undefined;
    const title = typeof req.query.title === 'string' ? req.query.title : 'MusicMine_Song';
    const artist = typeof req.query.artist === 'string' ? req.query.artist : 'Artist';
    const directParam = typeof req.query.streamUrl === 'string' ? req.query.streamUrl : undefined;

    const safeFileName = `${title} - ${artist}`
      .replace(/[^a-zA-Z0-9 _()-]/g, '')
      .trim()
      .slice(0, 80) || 'MusicMine_Track';

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
    }

    if (targetStreamUrl) {
      try {
        const upstreamRes = await fetch(targetStreamUrl);
        if (upstreamRes.ok && upstreamRes.body) {
          res.setHeader('Content-Type', 'audio/mp4');
          res.setHeader(
            'Content-Disposition',
            `attachment; filename="${safeFileName}.m4a"`
          );
          const contentLen = upstreamRes.headers.get('content-length');
          if (contentLen) res.setHeader('Content-Length', contentLen);
          Readable.fromWeb(upstreamRes.body as unknown as import('stream/web').ReadableStream).pipe(res);
          return;
        }
      } catch {
        // Fall through to buffer download
      }
    }

    const audioEntry = await resolveRealAudioBuffer({
      providerId,
      query,
      title,
      artist,
    });
    if (!audioEntry) {
      res.status(502).json({
        error: { code: 'DOWNLOAD_FAILED', message: 'Unable to download track.' },
      });
      return;
    }

    res.setHeader('Content-Type', 'audio/mp4');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${safeFileName}.m4a"`
    );
    res.setHeader('Content-Length', String(audioEntry.buffer.length));
    res.end(audioEntry.buffer);
  });

  // 3. GET /api/v1/tracks/:trackId
  app.get('/api/v1/tracks/:trackId', (req: Request, res: Response) => {
    const track = serverTracks.find(
      (t) => t.id === req.params.trackId || t.providerId === req.params.trackId
    );
    if (!track || !track.visibleInCatalog) {
      res.status(404).json({
        error: { code: 'TRACK_NOT_FOUND', message: 'Track not found.' },
      });
      return;
    }
    res.json({ data: track });
  });

  // 3b. GET /api/v1/lyrics (Real time-synced Hinglish LRC lyrics lookup)
  const DEVANAGARI_CONSONANTS: Record<string, string> = {
    क: 'k', ख: 'kh', ग: 'g', घ: 'gh', ङ: 'n',
    च: 'ch', छ: 'chh', ज: 'j', झ: 'jh', ञ: 'n',
    ट: 't', ठ: 'th', ड: 'd', ढ: 'dh', ण: 'n',
    त: 't', थ: 'th', द: 'd', ध: 'dh', न: 'n',
    प: 'p', फ: 'ph', ब: 'b', भ: 'bh', म: 'm',
    य: 'y', र: 'r', ल: 'l', व: 'v',
    श: 'sh', ष: 'sh', स: 's', ह: 'h',
    क़: 'q', ख़: 'kh', ग़: 'gh', ज़: 'z', ड़: 'r', ढ़: 'rh', फ़: 'f',
  };
  const DEVANAGARI_VOWELS: Record<string, string> = {
    अ: 'a', आ: 'aa', इ: 'i', ई: 'ee', उ: 'u', ऊ: 'oo',
    ऋ: 'ri', ए: 'e', ऐ: 'ai', ओ: 'o', औ: 'au',
  };
  const DEVANAGARI_MATRAS: Record<string, string> = {
    'ा': 'aa', 'ि': 'i', 'ी': 'ee', 'ु': 'u', 'ू': 'oo',
    'ृ': 'ri', 'े': 'e', 'ै': 'ai', 'ो': 'o', 'ौ': 'au',
    'ं': 'n', 'ँ': 'n', 'ः': 'h',
  };

  const GURMUKHI_CONSONANTS: Record<string, string> = {
    ਕ: 'k', ਖ: 'kh', ਗ: 'g', ਘ: 'gh', ਙ: 'n',
    ਚ: 'ch', ਛ: 'chh', ਜ: 'j', ਝ: 'jh', ਞ: 'n',
    ਟ: 't', ਠ: 'th', ਡ: 'd', ਢ: 'dh', ਣ: 'n',
    ਤ: 't', ਥ: 'th', ਦ: 'd', ਧ: 'dh', ਨ: 'n',
    ਪ: 'p', ਫ: 'ph', ਬ: 'b', ਭ: 'bh', ਮ: 'm',
    ਯ: 'y', ਰ: 'r', ਲ: 'l', ਵ: 'v', ੜ: 'r',
    ਸ: 's', ਹ: 'h', ਸ਼: 'sh', ਖ਼: 'kh', ਗ਼: 'gh', ਜ਼: 'z', ਫ਼: 'f',
  };
  const GURMUKHI_VOWELS: Record<string, string> = {
    ਅ: 'a', ਆ: 'aa', ਇ: 'i', ਈ: 'ee', ਉ: 'u', ਊ: 'oo',
    ਏ: 'e', ਐ: 'ai', ਓ: 'o', ਔ: 'au',
  };
  const GURMUKHI_MATRAS: Record<string, string> = {
    'ਾ': 'aa', 'ਿ': 'i', 'ੀ': 'ee', 'ੁ': 'u', 'ੂ': 'oo',
    'ੇ': 'e', 'ੈ': 'ai', 'ੋ': 'o', 'ੌ': 'au',
    'ੰ': 'n', 'ਂ': 'n', 'ੱ': '',
  };

  function transliterateIndicToHinglish(input: string): string {
    if (!/[\u0900-\u0A7F]/.test(input)) return input;
    const normalized = input.normalize('NFC');
    let out = '';
    for (let i = 0; i < normalized.length; i++) {
      const ch = normalized[i];
      const next = normalized[i + 1] || '';
      const twoChar = ch + next;

      if (DEVANAGARI_CONSONANTS[twoChar]) {
        const afterNext = normalized[i + 2] || '';
        const isEndOfWord = !afterNext || /[\s,!.?\-]/.test(afterNext);
        if (afterNext === '्') {
          out += DEVANAGARI_CONSONANTS[twoChar];
          i += 2;
        } else if (DEVANAGARI_MATRAS[afterNext]) {
          out += DEVANAGARI_CONSONANTS[twoChar];
          i += 1;
        } else {
          out += DEVANAGARI_CONSONANTS[twoChar] + (isEndOfWord ? '' : 'a');
          i += 1;
        }
        continue;
      }

      if (DEVANAGARI_CONSONANTS[ch]) {
        const isEndOfWord = !next || /[\s,!.?\-]/.test(next);
        if (next === '्') {
          out += DEVANAGARI_CONSONANTS[ch];
          i += 1;
        } else if (DEVANAGARI_MATRAS[next]) {
          out += DEVANAGARI_CONSONANTS[ch];
        } else {
          out += DEVANAGARI_CONSONANTS[ch] + (isEndOfWord ? '' : 'a');
        }
        continue;
      }

      if (DEVANAGARI_VOWELS[ch]) {
        out += DEVANAGARI_VOWELS[ch];
        continue;
      }
      if (DEVANAGARI_MATRAS[ch] !== undefined) {
        out += DEVANAGARI_MATRAS[ch];
        continue;
      }
      if (ch === '्' || ch === '़' || ch === '।') {
        continue;
      }

      if (GURMUKHI_CONSONANTS[ch]) {
        const isEndOfWord = !next || /[\s,!.?\-]/.test(next);
        if (next === '੍') {
          out += GURMUKHI_CONSONANTS[ch];
          i += 1;
        } else if (GURMUKHI_MATRAS[next] !== undefined) {
          out += GURMUKHI_CONSONANTS[ch];
        } else {
          out += GURMUKHI_CONSONANTS[ch] + (isEndOfWord ? '' : 'a');
        }
        continue;
      }
      if (GURMUKHI_VOWELS[ch]) {
        out += GURMUKHI_VOWELS[ch];
        continue;
      }
      if (GURMUKHI_MATRAS[ch] !== undefined) {
        out += GURMUKHI_MATRAS[ch];
        continue;
      }

      out += ch;
    }

    const cleaned = out.replace(/\s+/g, ' ').trim();
    return cleaned ? cleaned.charAt(0).toUpperCase() + cleaned.slice(1) : input;
  }

  function parseLrcLinesToHinglish(lrcText: string): Array<{ timeSec: number; text: string }> {
    const parsedLines: Array<{ timeSec: number; text: string }> = [];
    const regex = /\[(\d{2}):(\d{2})(?:\.(\d{2,3}))?\](.*)/g;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(lrcText)) !== null) {
      const mins = parseInt(match[1], 10);
      const secs = parseInt(match[2], 10);
      const rawText = match[4].trim();
      if (rawText) {
        const hinglishText = transliterateIndicToHinglish(rawText);
        parsedLines.push({ timeSec: mins * 60 + secs, text: hinglishText });
      }
    }
    return parsedLines;
  }

  const lyricsCache = new Map<string, Array<{ timeSec: number; text: string }>>();

  app.get('/api/v1/lyrics', async (req: Request, res: Response) => {
    const rawTitle = typeof req.query.title === 'string' ? req.query.title.trim() : '';
    const rawArtist = typeof req.query.artist === 'string' ? req.query.artist.trim() : '';
    const cleanSongTitle = rawTitle
      .replace(/\(.*?\)|\[.*?\]/g, '')
      .split('|')[0]
      .split('-')[0]
      .trim();
    const primaryArtist = rawArtist.split(',')[0]?.trim() || '';
    const cacheKey = `${cleanSongTitle.toLowerCase()}__${primaryArtist.toLowerCase()}`;

    if (lyricsCache.has(cacheKey)) {
      res.json({ data: { lines: lyricsCache.get(cacheKey)! } });
      return;
    }

    const searchQueries = [
      `${cleanSongTitle} ${primaryArtist}`.trim(),
      cleanSongTitle,
    ].filter(Boolean);

    try {
      for (const q of searchQueries) {
        const lrcRes = await fetch(
          `https://lrclib.net/api/search?q=${encodeURIComponent(q)}`,
          { headers: { 'User-Agent': 'MusicMine/1.0' } }
        );
        if (!lrcRes.ok) continue;

        const items = (await lrcRes.json()) as Array<{
          syncedLyrics?: string;
          plainLyrics?: string;
        }>;
        if (!Array.isArray(items) || items.length === 0) continue;

        // 1. Prefer synced lyrics already in Roman / Hinglish script (no Indic script chars)
        const romanSyncedItem = items.find(
          (it) =>
            it.syncedLyrics &&
            it.syncedLyrics.trim().length > 30 &&
            !/[\u0900-\u0DFF]/.test(it.syncedLyrics)
        );
        if (romanSyncedItem?.syncedLyrics) {
          const lines = parseLrcLinesToHinglish(romanSyncedItem.syncedLyrics);
          if (lines.length >= 4) {
            lyricsCache.set(cacheKey, lines);
            res.json({ data: { lines } });
            return;
          }
        }

        // 2. Otherwise take synced lyrics in Devanagari/Gurmukhi and transliterate to Hinglish
        const indicSyncedItem = items.find(
          (it) =>
            it.syncedLyrics &&
            it.syncedLyrics.trim().length > 30 &&
            !/[\u0B80-\u0DFF]/.test(it.syncedLyrics)
        );
        if (indicSyncedItem?.syncedLyrics) {
          const lines = parseLrcLinesToHinglish(indicSyncedItem.syncedLyrics);
          if (lines.length >= 4) {
            lyricsCache.set(cacheKey, lines);
            res.json({ data: { lines } });
            return;
          }
        }

        // 3. Fallback to Roman plainLyrics distributed across song timestamps
        const romanPlainItem = items.find(
          (it) =>
            it.plainLyrics &&
            it.plainLyrics.trim().length > 30 &&
            !/[\u0900-\u0DFF]/.test(it.plainLyrics)
        );
        const plainSource =
          romanPlainItem?.plainLyrics ||
          items.find((it) => it.plainLyrics && it.plainLyrics.trim())?.plainLyrics;
        if (plainSource) {
          const rawLines = plainSource
            .split('\n')
            .map((l) => transliterateIndicToHinglish(l.trim()))
            .filter(Boolean)
            .slice(0, 32);
          if (rawLines.length >= 4) {
            const step = Math.max(6, Math.floor(210 / rawLines.length));
            const timed = rawLines.map((text, idx) => ({ timeSec: idx * step, text }));
            lyricsCache.set(cacheKey, timed);
            res.json({ data: { lines: timed } });
            return;
          }
        }
      }
    } catch {
      // Fallback handled on client
    }

    res.json({ data: { lines: [] } });
  });

  // 4. GET /api/v1/me/library
  app.get('/api/v1/me/library', (_req: Request, res: Response) => {
    res.json({
      data: {
        likedTrackIds: serverLikedIds,
        playlists: serverPlaylists,
      },
    });
  });

  // 5. POST & DELETE /api/v1/me/liked-tracks
  app.post('/api/v1/me/liked-tracks', (req: Request, res: Response) => {
    const { trackId } = req.body as { trackId?: string };
    if (trackId && !serverLikedIds.includes(trackId)) {
      serverLikedIds = [trackId, ...serverLikedIds];
    }
    res.json({ data: { likedTrackIds: serverLikedIds } });
  });

  app.delete('/api/v1/me/liked-tracks/:trackId', (req: Request, res: Response) => {
    serverLikedIds = serverLikedIds.filter((id) => id !== req.params.trackId);
    res.json({ data: { likedTrackIds: serverLikedIds } });
  });

  // 6. GET, POST, PATCH, DELETE /api/v1/me/playlists
  app.get('/api/v1/me/playlists', (_req: Request, res: Response) => {
    res.json({ data: serverPlaylists });
  });

  app.post('/api/v1/me/playlists', (req: Request, res: Response) => {
    const { name, description, isPublic, ownerName } = req.body as Partial<Playlist>;
    if (!name || !name.trim()) {
      res.status(400).json({
        error: { code: 'INVALID_INPUT', message: 'Playlist name is required.' },
      });
      return;
    }
    const created: Playlist = {
      id: `pl-${crypto.randomUUID().slice(0, 8)}`,
      name: name.trim(),
      description: (description || 'Personal playlist').trim(),
      ownerId: 'usr-admin',
      ownerName: ownerName || 'Admin',
      isPublic: Boolean(isPublic),
      updatedAt: new Date().toISOString(),
      trackIds: [],
      accentHex: '#BC0202',
    };
    serverPlaylists = [created, ...serverPlaylists];
    res.status(201).json({ data: created });
  });

  app.patch('/api/v1/me/playlists/:playlistId', (req: Request, res: Response) => {
    const { playlistId } = req.params;
    const updates = req.body as Partial<Playlist>;
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
  });

  app.delete('/api/v1/me/playlists/:playlistId', (req: Request, res: Response) => {
    serverPlaylists = serverPlaylists.filter((pl) => pl.id !== req.params.playlistId);
    res.json({ data: { deleted: true } });
  });

  // Vite middleware in development, static dist in production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
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

startServer();
