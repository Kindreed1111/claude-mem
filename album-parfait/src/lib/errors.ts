import { DeezerQuotaError, HttpError } from './deezer';

export const BUSY_MESSAGE = 'trop de monde en ce moment, réessaie dans quelques secondes';

export interface FriendlyError {
  /** busy : quota Deezer ou 429 ; network : pas de réponse ; other : le reste. */
  kind: 'busy' | 'network' | 'other';
  message: string;
}

const OTHER: Record<'discography' | 'search', string> = {
  discography: 'la discographie n’a pas pu être chargée. réessaie dans un instant.',
  search: 'la recherche n’a pas abouti. réessaie dans un instant.',
};

/** Message affichable : jamais le texte brut de l'erreur. */
export function friendlyError(err: unknown, context: keyof typeof OTHER): FriendlyError {
  if (err instanceof DeezerQuotaError || (err instanceof HttpError && err.status === 429)) {
    return { kind: 'busy', message: BUSY_MESSAGE };
  }
  // fetch() rejette avec une TypeError quand la requête n'a pas de réponse (hors ligne, coupure).
  if (err instanceof TypeError) {
    return { kind: 'network', message: 'connexion impossible. vérifie ton réseau, puis réessaie.' };
  }
  return { kind: 'other', message: OTHER[context] };
}
