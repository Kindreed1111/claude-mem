import { describe, expect, it } from 'vitest';
import { PODIUM_MIN_ALBUMS, showPodium } from './Podium';

const top = { intro: [], feat: [], interlude: [], outro: [], free: [], cover: [] };

describe('showPodium', () => {
  it('masqué sous 10 albums enregistrés', () => {
    expect(PODIUM_MIN_ALBUMS).toBe(10);
    expect(showPodium({ enabled: true, top, albums: 0 })).toBe(false);
    expect(showPodium({ enabled: true, top, albums: 9 })).toBe(false);
  });
  it('affiché à partir de 10 albums', () => {
    expect(showPodium({ enabled: true, top, albums: 10 })).toBe(true);
    expect(showPodium({ enabled: true, top, albums: 250 })).toBe(true);
  });
  it('masqué si les classements sont désactivés ou vides', () => {
    expect(showPodium({ enabled: false, top, albums: 50 })).toBe(false);
    expect(showPodium({ enabled: true, top: null, albums: 50 })).toBe(false);
  });
});
