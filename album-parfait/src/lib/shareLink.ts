import { shareHash, type ShareKind, type SharedAlbum } from './share';

export function buildShareUrl(kind: ShareKind, album: SharedAlbum): string {
  return `${location.origin}${location.pathname}${shareHash(kind, album)}`;
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
