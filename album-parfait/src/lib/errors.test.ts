import { describe, expect, it } from 'vitest';
import { DeezerQuotaError, HttpError } from './deezer';
import { BUSY_MESSAGE, friendlyError } from './errors';

describe('friendlyError', () => {
  it('quota Deezer : trop de monde', () => {
    expect(friendlyError(new DeezerQuotaError(), 'discography')).toEqual({ kind: 'busy', message: BUSY_MESSAGE });
  });

  it('réponse 429 : trop de monde', () => {
    expect(friendlyError(new HttpError(429), 'search').kind).toBe('busy');
  });

  it('coupure réseau : message de connexion, sans le texte brut', () => {
    const e = friendlyError(new TypeError('Failed to fetch'), 'discography');
    expect(e.kind).toBe('network');
    expect(e.message).not.toMatch(/Failed to fetch/);
  });

  it('autre erreur : message lisible selon le contexte, sans le texte brut', () => {
    const d = friendlyError(new SyntaxError('Unexpected token < in JSON at position 0'), 'discography');
    const s = friendlyError(new HttpError(502), 'search');
    expect(d.kind).toBe('other');
    expect(d.message).toMatch(/discographie/);
    expect(d.message).not.toMatch(/Unexpected|JSON/);
    expect(s.message).toMatch(/recherche/);
    expect(s.message).not.toMatch(/502/);
  });
});
