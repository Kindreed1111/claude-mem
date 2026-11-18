import { describe, expect, it } from 'vitest';
import { albumReducer, initialAlbum, isComplete, isPlaced, kindForSlot, SLOT_ORDER } from './album';
import type { Track } from './types';

let id = 1;
const track = (title = `Song ${id}`): Track => ({
  id: id++,
  title,
  titleVersion: '',
  position: 1,
  disk: 1,
  preview: '',
  artistId: 1,
  artistName: 'A',
  projectId: 1,
});

describe('album', () => {
  it('suit l’ordre 1 → 10 → 7 → 2 → 3,4,5,6,8,9', () => {
    let s = initialAlbum();
    const visited: number[] = [];
    while (s.active !== null) {
      visited.push(s.active);
      s = albumReducer(s, { type: 'place', track: track() });
    }
    expect(visited).toEqual([...SLOT_ORDER]);
    expect(visited).toEqual([1, 10, 7, 2, 3, 4, 5, 6, 8, 9]);
    expect(isComplete(s)).toBe(true);
  });

  it('associe un type à chaque slot', () => {
    expect([1, 10, 7, 2, 3, 9].map(kindForSlot)).toEqual(['intro', 'outro', 'interlude', 'feat', 'free', 'free']);
  });

  it('rouvre un slot rempli, le remplace, puis repart vers le prochain slot vide', () => {
    let s = initialAlbum();
    const a = track();
    s = albumReducer(s, { type: 'place', track: a });
    s = albumReducer(s, { type: 'place', track: track() });
    expect(s.active).toBe(7);
    s = albumReducer(s, { type: 'open', slot: 1 });
    expect(s.active).toBe(1);
    const b = track();
    s = albumReducer(s, { type: 'place', track: b });
    expect(s.slots[1]?.id).toBe(b.id);
    expect(isPlaced(s, a)).toBe(false);
    expect(s.active).toBe(7);
  });

  it('refuse une piste déjà placée, même dans une autre édition', () => {
    let s = initialAlbum();
    s = albumReducer(s, { type: 'place', track: track('Money Trees') });
    const before = s;
    s = albumReducer(s, { type: 'place', track: track('Money Trees (Deluxe)') });
    expect(s).toBe(before);
    expect(isPlaced(s, track('money trees'))).toBe(true);
  });

  it('vide un slot et le rend actif', () => {
    let s = initialAlbum();
    s = albumReducer(s, { type: 'place', track: track() });
    s = albumReducer(s, { type: 'clear', slot: 1 });
    expect(s.slots[1]).toBeNull();
    expect(s.active).toBe(1);
  });

  it('reset revient à l’état initial', () => {
    let s = initialAlbum();
    s = albumReducer(s, { type: 'place', track: track() });
    s = albumReducer(s, { type: 'reset' });
    expect(s).toEqual(initialAlbum());
  });
});
