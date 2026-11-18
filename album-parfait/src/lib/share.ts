import type { AlbumState } from './album';
import type { Artist, Project } from './types';

/** Album partagé : lien court /a/<id> (stocké côté serveur) ou ancien lien #album=… / #defi=…. */
export interface SharedAlbum {
  v: 1;
  artist: { id: number; name: string; picture: string };
  cover: { id: number; title: string; url: string };
  tracks: Array<{ id: number; title: string } | null>;
}

export type ShareKind = 'album' | 'defi';

function toBase64Url(bytes: Uint8Array): string {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(s: string): Uint8Array {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

export function encodeShare(album: SharedAlbum): string {
  return toBase64Url(new TextEncoder().encode(JSON.stringify(album)));
}

const isId = (n: unknown): n is number => typeof n === 'number' && Number.isInteger(n) && n > 0;
const isText = (s: unknown, max = 200): s is string => typeof s === 'string' && s.length <= max;

export function isDeezerImage(url: unknown): url is string {
  if (typeof url !== 'string') return false;
  try {
    const u = new URL(url);
    return u.protocol === 'https:' && (u.hostname === 'dzcdn.net' || u.hostname.endsWith('.dzcdn.net'));
  } catch {
    return false;
  }
}

function isShared(x: unknown): x is SharedAlbum {
  const a = x as SharedAlbum;
  if (!a || a.v !== 1 || !a.artist || !a.cover || !Array.isArray(a.tracks)) return false;
  if (!isId(a.artist.id) || !isText(a.artist.name) || a.artist.name.length === 0) return false;
  if (!(a.artist.picture === '' || isDeezerImage(a.artist.picture))) return false;
  if (!isId(a.cover.id) || !isText(a.cover.title) || !isDeezerImage(a.cover.url)) return false;
  if (a.tracks.length !== 10) return false;
  return a.tracks.every((t) => t === null || (isId(t.id) && isText(t.title) && t.title.length > 0));
}

export function decodeShare(s: string): SharedAlbum | null {
  try {
    const parsed: unknown = JSON.parse(new TextDecoder().decode(fromBase64Url(s)));
    return isShared(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function shareHash(kind: ShareKind, album: SharedAlbum): string {
  return `#${kind}=${encodeShare(album)}`;
}

export function readHash(hash: string): { kind: ShareKind; album: SharedAlbum } | null {
  const m = /^#(album|defi)=([A-Za-z0-9_-]+)$/.exec(hash);
  if (!m) return null;
  const album = decodeShare(m[2]);
  return album ? { kind: m[1] as ShareKind, album } : null;
}

/** Copie aux clés ordonnées, sans champ superflu : même album = même JSON = même identifiant court. */
export function normalizeShared(a: SharedAlbum): SharedAlbum {
  return {
    v: 1,
    artist: { id: a.artist.id, name: a.artist.name, picture: a.artist.picture },
    cover: { id: a.cover.id, title: a.cover.title, url: a.cover.url },
    tracks: a.tracks.map((t) => (t ? { id: t.id, title: t.title } : null)),
  };
}

export const isShareKind = (k: unknown): k is ShareKind => k === 'album' || k === 'defi';

/** Identifiant de lien court : 8 caractères base62 (12 en cas de collision). */
export const SHORT_ID = /^[0-9A-Za-z]{8}(?:[0-9A-Za-z]{4})?$/;

export function readShortPath(pathname: string): string | null {
  const m = /^\/a\/([0-9A-Za-z]+)\/?$/.exec(pathname);
  return m && SHORT_ID.test(m[1]) ? m[1] : null;
}

/** Album lu depuis un lien court, injecté dans la page par le serveur ou relu via /api/share. */
export interface ShortShare {
  id: string;
  kind: ShareKind;
  album: SharedAlbum;
}

export function parseShortShare(x: unknown, id?: string): ShortShare | null {
  const s = x as ShortShare;
  if (!s || typeof s.id !== 'string' || !SHORT_ID.test(s.id) || (id !== undefined && s.id !== id) || !isShareKind(s.kind)) return null;
  return isShared(s.album) ? { id: s.id, kind: s.kind, album: normalizeShared(s.album) } : null;
}

export function toShared(artist: Artist, cover: Project, album: AlbumState): SharedAlbum {
  return {
    v: 1,
    artist: { id: artist.id, name: artist.name, picture: isDeezerImage(artist.picture) ? artist.picture : '' },
    cover: { id: cover.id, title: cover.title, url: cover.cover },
    tracks: Array.from({ length: 10 }, (_, i) => {
      const t = album.slots[i + 1];
      return t ? { id: t.id, title: t.title } : null;
    }),
  };
}
