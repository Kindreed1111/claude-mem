import { describe, expect, it } from 'vitest';
import { serverGraceMs } from './useDiscography';

describe('serverGraceMs', () => {
  it('laisse au serveur le temps de son analyse (Nekfeu : 14,2 s mesurées)', () => {
    expect(serverGraceMs(21, 85)).toBeGreaterThan(14200);
    expect(serverGraceMs(21, 85)).toBeLessThan(25000);
  });
  it('3 s minimum, 60 s maximum', () => {
    expect(serverGraceMs(0, 0)).toBe(3000);
    expect(serverGraceMs(100, 2000)).toBe(60000);
  });
});
