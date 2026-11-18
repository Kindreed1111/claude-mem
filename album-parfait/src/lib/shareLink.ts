import {
  encodeShare,
  normalizeShared,
  parseShortShare,
  readShortPath,
  shareHash,
  SHORT_ID,
  type ShareKind,
  type SharedAlbum,
  type ShortShare,
} from './share';

/** Ancien lien long (#album=… / #defi=…) : toujours valable, sert de repli. */
export function buildShareUrl(kind: ShareKind, album: SharedAlbum): string {
  const path = readShortPath(location.pathname) ? '/' : location.pathname;
  return `${location.origin}${path}${shareHash(kind, album)}`;
}

const shortUrls = new Map<string, Promise<string | null>>();
const cacheKey = (kind: ShareKind, album: SharedAlbum) => `${kind}:${encodeShare(normalizeShared(album))}`;

export function rememberShortUrl(kind: ShareKind, album: SharedAlbum, url: string) {
  shortUrls.set(cacheKey(kind, album), Promise.resolve(url));
}

async function createShortUrl(kind: ShareKind, album: SharedAlbum, fetchImpl: typeof fetch): Promise<string | null> {
  try {
    const res = await fetchImpl('/api/share', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ kind, album: encodeShare(album) }),
    });
    if (!res.ok) return null;
    const body = (await res.json()) as { id?: unknown };
    return typeof body.id === 'string' && SHORT_ID.test(body.id) ? `${location.origin}/a/${body.id}` : null;
  } catch {
    return null;
  }
}

/** Crée (une seule fois par album et type) le lien court ; à lancer dès le survol ou l'appui du bouton. */
export function prefetchShortUrl(kind: ShareKind, album: SharedAlbum, fetchImpl: typeof fetch = fetch): Promise<string | null> {
  const key = cacheKey(kind, album);
  let pending = shortUrls.get(key);
  if (!pending) {
    pending = createShortUrl(kind, album, fetchImpl);
    shortUrls.set(key, pending);
    // Échec : on retentera au prochain partage.
    void pending.then((url) => url === null && shortUrls.get(key) === pending && shortUrls.delete(key));
  }
  return pending;
}

/** Lien court /a/<id> si le serveur répond à temps, sinon l'ancien lien long. */
export async function resolveShareUrl(kind: ShareKind, album: SharedAlbum, timeoutMs = 2500, fetchImpl: typeof fetch = fetch): Promise<string> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const late = new Promise<null>((resolve) => {
    timer = setTimeout(() => resolve(null), timeoutMs);
  });
  const short = await Promise.race([prefetchShortUrl(kind, album, fetchImpl), late]);
  clearTimeout(timer);
  return short ?? buildShareUrl(kind, album);
}

/**
 * Album d'un lien court /a/<id> : injecté dans la page par le serveur, sinon relu via /api/share.
 * Lien inconnu : retour à l'accueil.
 */
export async function loadShortShare(fetchImpl: typeof fetch = fetch): Promise<ShortShare | null> {
  const id = readShortPath(location.pathname);
  if (!id) return null;
  let share: ShortShare | null = null;
  try {
    const text = document.getElementById('ap-share')?.textContent;
    if (text) share = parseShortShare(JSON.parse(text), id);
  } catch {
    share = null;
  }
  if (!share) {
    try {
      const res = await fetchImpl(`/api/share?id=${id}`);
      if (res.ok) share = parseShortShare(await res.json(), id);
    } catch {
      share = null;
    }
  }
  if (share) rememberShortUrl(share.kind, share.album, `${location.origin}/a/${id}`);
  else {
    try {
      history.replaceState(null, '', `/${location.search}${location.hash}`);
    } catch {
      /* ignoré */
    }
  }
  return share;
}

/** Partage natif sur mobile, sinon copie dans le presse-papiers ; 'manual' si les deux échouent. */
export async function shareOrCopy(url: string, title: string): Promise<'shared' | 'copied' | 'manual' | 'cancelled'> {
  const coarse = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
  if (coarse && typeof navigator.share === 'function') {
    try {
      await navigator.share({ title, url });
      return 'shared';
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return 'cancelled';
    }
  }
  try {
    await navigator.clipboard.writeText(url);
    return 'copied';
  } catch {
    return 'manual';
  }
}
