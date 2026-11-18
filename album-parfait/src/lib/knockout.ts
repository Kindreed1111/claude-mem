import type { Track } from './types';

/** Tournoi à élimination directe : chaque duel garde un son, jusqu'au gagnant. */
export interface Bracket {
  round: Track[];
  next: Track[];
  index: number;
  /** Nombre de candidats au départ (pour afficher la progression). */
  size: number;
}

function shuffle<T>(items: T[], rng: () => number): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function settle(b: Bracket): Bracket {
  let { round, next, index } = b;
  for (;;) {
    if (round.length <= 1 && next.length === 0) return { ...b, round, next, index: 0 };
    if (index === round.length - 1) {
      next = [...next, round[index]];
      index++;
    }
    if (index >= round.length) {
      round = next;
      next = [];
      index = 0;
      continue;
    }
    return { ...b, round, next, index };
  }
}

export function startBracket(tracks: Track[], size = 8, rng: () => number = Math.random): Bracket {
  const picked = shuffle(tracks, rng).slice(0, size);
  return settle({ round: picked, next: [], index: 0, size: picked.length });
}

export function currentPair(b: Bracket): [Track, Track] | null {
  if (b.round.length <= 1 && b.next.length === 0) return null;
  return [b.round[b.index], b.round[b.index + 1]];
}

export function pickWinner(b: Bracket, winnerId: number): Bracket {
  const pair = currentPair(b);
  if (!pair) return b;
  const winner = pair.find((t) => t.id === winnerId);
  if (!winner) return b;
  return settle({ ...b, next: [...b.next, winner], index: b.index + 2 });
}

export function bracketWinner(b: Bracket): Track | null {
  return b.round.length === 1 && b.next.length === 0 ? b.round[0] : null;
}

/** Duels restants avant le gagnant. */
export function duelsLeft(b: Bracket): number {
  const alive = b.round.length - b.index + b.next.length;
  return Math.max(0, alive - 1);
}
