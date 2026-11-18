import { decodeShare, encodeShare, type SharedAlbum } from './share';
import type { Artist, Project, Track } from './types';

// Sauvegarde locale (navigateur uniquement). Toute erreur de stockage est ignorée : le site marche sans.

export interface Draft {
  artist: Artist;
  cover: Project | null;
  slots: Record<number, Track | null>;
  screen: 'covers' | 'build' | 'recap';
  savedAt: number;
}

const DRAFT = 'ap:draft';
const HISTORY = 'ap:history';
const MAX_HISTORY = 8;

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string | null) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    /* stockage indisponible : on continue sans */
  }
}

export function loadDraft(): Draft | null {
  try {
    const d = JSON.parse(read(DRAFT) ?? 'null') as Draft | null;
    if (!d || typeof d.artist?.id !== 'number' || typeof d.slots !== 'object') return null;
    return d;
  } catch {
    return null;
  }
}

export function saveDraft(draft: Draft | null) {
  write(DRAFT, draft ? JSON.stringify(draft) : null);
}

export function loadHistory(): SharedAlbum[] {
  try {
    const codes = JSON.parse(read(HISTORY) ?? '[]') as unknown;
    if (!Array.isArray(codes)) return [];
    return codes.map((c) => (typeof c === 'string' ? decodeShare(c) : null)).filter((a): a is SharedAlbum => !!a);
  } catch {
    return [];
  }
}

export function pushHistory(album: SharedAlbum): SharedAlbum[] {
  const code = encodeShare(album);
  const codes = [code, ...loadHistory().map(encodeShare).filter((c) => c !== code)].slice(0, MAX_HISTORY);
  write(HISTORY, JSON.stringify(codes));
  return codes.map((c) => decodeShare(c)!);
}
