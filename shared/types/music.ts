export type UserRole = 'guest' | 'listener' | 'super_admin';

export type DataSourceBadge = 'API_CONTRACT_SAMPLE' | 'TEST_FIXTURE';

export type ViewStateMode = 'populated' | 'loading' | 'empty' | 'error' | 'offline';

export type ThemeMode = 'amoled' | 'dark' | 'light';

/**
 * Upstream FastAPI search response contract
 * Base URL: https://nazriya.teamgod.online
 * Endpoint: GET /api/search?q={query}&key={API_KEY}
 */
export interface UpstreamSearchContract {
  id: string;
  title: string;
  duration: number | string;
  uploader?: string;
  thumbnail?: string;
  url?: string;
}

export interface Track {
  id: string;
  providerId: string;
  title: string;
  cleanTitle: string;
  artistId: string;
  artistName: string;
  featuredArtists?: string[];
  albumId: string;
  albumName: string;
  duration: number; // in seconds
  uploader: string;
  language: 'Hindi' | 'English' | 'Punjabi' | 'Tamil' | 'Telugu' | 'Instrumental';
  genre: string;
  releaseYear: number;
  thumbnailUrl?: string;
  externalUrl?: string;
  streamUrl?: string;
  sourceType: DataSourceBadge;
  visibleInCatalog: boolean;
  sourceApi?: string;
}

export interface Artist {
  id: string;
  name: string;
  primaryLanguage: string;
  genres: string[];
  bio: string;
  monthlyListenersLabel: string;
  verifiedMetadata: boolean;
  sourceType: DataSourceBadge;
  accentHex: string;
  avatarUrl?: string;
}

export interface Album {
  id: string;
  title: string;
  artistId: string;
  artistName: string;
  releaseYear: number;
  language: string;
  genre: string;
  trackIds: string[];
  sourceType: DataSourceBadge;
  accentHex: string;
  coverUrl?: string;
}

export interface Playlist {
  id: string;
  name: string;
  description: string;
  ownerId: string;
  ownerName: string;
  isPublic: boolean;
  updatedAt: string;
  trackIds: string[];
  accentHex: string;
}

export interface ListeningEvent {
  id: string;
  trackId: string;
  playedAt: string; // ISO UTC timestamp
  listenedSeconds: number;
  completionRatio: number;
}

export interface HomepageSection {
  id: string;
  title: string;
  subtitle: string;
  type: 'featured_tracks' | 'albums' | 'artists';
  enabled: boolean;
  order: number;
  itemIds: string[];
}

export interface UserAccount {
  id: string;
  email: string;
  displayName: string;
  username: string;
  bio: string;
  role: UserRole;
  authProvider: 'guest' | 'email' | 'google';
  emailVerified: boolean;
  status: 'active' | 'suspended';
  privateHistory: boolean;
  publicProfile: boolean;
  avatarUrl?: string;
  createdAt: string;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  actorEmail: string;
  actorRole: UserRole;
  action: string;
  targetType: 'catalog' | 'homepage' | 'user' | 'report' | 'system';
  targetId: string;
  summary: string;
}

export interface ContentReport {
  id: string;
  trackId: string;
  trackTitle: string;
  reason: 'copyright_claim' | 'metadata_mismatch' | 'unavailable_stream';
  reporterEmail: string;
  submittedAt: string;
  status: 'open' | 'investigating' | 'resolved_hidden' | 'dismissed';
}

export type RoutePath =
  | '/'
  | '/search'
  | `/track/${string}`
  | `/artist/${string}`
  | `/album/${string}`
  | '/login'
  | '/signup'
  | '/privacy'
  | '/terms'
  | '/copyright'
  | '/help'
  | '/library'
  | '/library/liked'
  | '/library/history'
  | '/library/albums'
  | '/playlists'
  | `/playlist/${string}`
  | '/profile'
  | '/settings'
  | '/stats'
  | '/admin'
  | '/admin/catalog'
  | '/admin/homepage'
  | '/admin/users'
  | '/admin/analytics'
  | '/admin/reports'
  | '/admin/settings'
  | '/admin/audit-logs';
