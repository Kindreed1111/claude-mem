import { normalizeTitle } from './classify';
import type { Track } from './types';

export const SLOT_ORDER = [1, 10, 7, 2, 3, 4, 5, 6, 8, 9] as const;
export type SlotKind = 'intro' | 'outro' | 'interlude' | 'feat' | 'free';

const KINDS: Record<number, SlotKind> = { 1: 'intro', 10: 'outro', 7: 'interlude', 2: 'feat' };

export function kindForSlot(slot: number): SlotKind {
  return KINDS[slot] ?? 'free';
}

export interface AlbumState {
  slots: Record<number, Track | null>;
  active: number | null;
}

export type AlbumAction =
  | { type: 'place'; track: Track }
  | { type: 'open'; slot: number }
  | { type: 'clear'; slot: number }
  | { type: 'reset' };

export function initialAlbum(): AlbumState {
  const slots: Record<number, Track | null> = {};
  for (let n = 1; n <= 10; n++) slots[n] = null;
  return { slots, active: SLOT_ORDER[0] };
}

const nextEmpty = (slots: AlbumState['slots']): number | null => SLOT_ORDER.find((n) => !slots[n]) ?? null;

/** Même chanson = même titre normalisé (évite de placer la version standard et la version deluxe). */
export function isPlaced(state: AlbumState, track: Track): boolean {
  const key = normalizeTitle(track.title);
  return Object.values(state.slots).some((t) => t && normalizeTitle(t.title) === key);
}

export function isComplete(state: AlbumState): boolean {
  return nextEmpty(state.slots) === null;
}

export function albumReducer(state: AlbumState, action: AlbumAction): AlbumState {
  switch (action.type) {
    case 'place': {
      if (state.active === null) return state;
      const current = state.slots[state.active];
      const others = { ...state.slots, [state.active]: null };
      if (isPlaced({ slots: others, active: null }, action.track)) return state;
      if (current && current.id === action.track.id) return state;
      const slots = { ...state.slots, [state.active]: action.track };
      return { slots, active: nextEmpty(slots) };
    }
    case 'open':
      return { ...state, active: action.slot };
    case 'reset':
      return initialAlbum();
    case 'clear': {
      const slots = { ...state.slots, [action.slot]: null };
      return { slots, active: action.slot };
    }
  }
}
