import { useEffect, useRef, useState } from 'react';
import { searchArtists } from '../lib/deezer';
import type { SharedAlbum } from '../lib/share';
import type { Draft } from '../lib/storage';
import type { Artist } from '../lib/types';
import { Vinyl3D } from './Vinyl3D';

const fmtFans = (n: number) => new Intl.NumberFormat('fr-FR', { notation: 'compact' }).format(n) + ' fans';

/** Titre révélé mot à mot. */
function Reveal({ words }: { words: Array<{ text: string; em?: boolean }> }) {
  return (
    <>
      {words.map((w, i) => (
        <span key={i}>
          <span className="word" style={{ '--i': i } as React.CSSProperties}>
            {w.em ? <em>{w.text}</em> : w.text}
          </span>{' '}
        </span>
      ))}
    </>
  );
}

interface Props {
  onPick: (a: Artist) => void;
  draft: Draft | null;
  onResume: () => void;
  onDiscard: () => void;
  history: SharedAlbum[];
  onOpenHistory: (a: SharedAlbum) => void;
}

export function Search({ onPick, draft, onResume, onDiscard, history, onOpenHistory }: Props) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<Artist[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cursor, setCursor] = useState(0);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => input.current?.focus(), []);

  useEffect(() => {
    const term = q.trim();
    if (!term) {
      setResults(null);
      setError(null);
      return;
    }
    const ctrl = new AbortController();
    const timer = setTimeout(() => {
      searchArtists(term, { signal: ctrl.signal })
        .then((r) => {
          setResults(r);
          setError(null);
          setCursor(0);
        })
        .catch((e: unknown) => {
          if (!ctrl.signal.aborted) setError(e instanceof Error ? e.message : String(e));
        });
    }, 300);
    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [q]);

  const onKey = (e: React.KeyboardEvent) => {
    if (!results?.length) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setCursor((c) => Math.min(c + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setCursor((c) => Math.max(c - 1, 0));
    } else if (e.key === 'Enter') {
      onPick(results[cursor]);
    }
  };

  const filled = draft ? Object.values(draft.slots).filter(Boolean).length : 0;

  return (
    <section className="home">
      <div className="search">
        <p className="kicker">face a · choisis l’artiste</p>
        <h1 className="headline reveal">
          <Reveal words={[{ text: 'compose' }, { text: 'son' }, { text: 'album', em: true }, { text: 'parfait.', em: true }]} />
        </h1>
        <div className="search-field">
          <input
            id="artist-search"
            ref={input}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={onKey}
            placeholder="un rappeur, une artiste…"
            aria-label="Rechercher un artiste"
            role="combobox"
            aria-expanded={!!results?.length}
            aria-controls="artist-results"
            autoComplete="off"
            spellCheck={false}
          />
        </div>
        {error && <p className="muted">Recherche impossible : {error}</p>}
        {results && results.length === 0 && <p className="muted">Aucun artiste trouvé.</p>}
        {results && results.length > 0 && (
          <ul className="results" id="artist-results" role="listbox">
            {results.map((a, i) => (
              <li
                key={a.id}
                className="result"
                role="option"
                aria-selected={i === cursor}
                style={{ '--i': i } as React.CSSProperties}
                onMouseEnter={() => setCursor(i)}
                onClick={() => onPick(a)}
              >
                <img src={a.picture} alt="" loading="lazy" />
                <span className="name">{a.name}</span>
                <span className="fans">{fmtFans(a.fans)}</span>
              </li>
            ))}
          </ul>
        )}

        {!results && draft && (
          <div className="resume">
            <div>
              <p className="kicker">en cours</p>
              <p className="resume-title">
                l’album de <em>{draft.artist.name}</em> · {filled} / 10 pistes
              </p>
            </div>
            <div className="row">
              <button className="cta small" onClick={onResume}>
                reprendre
              </button>
              <button className="ghost" onClick={onDiscard}>
                effacer
              </button>
            </div>
          </div>
        )}

        {!results && history.length > 0 && (
          <div className="shelf">
            <p className="kicker">tes derniers albums</p>
            <ul>
              {history.map((h, i) => (
                <li key={`${h.artist.id}-${i}`} style={{ '--i': i } as React.CSSProperties}>
                  <button onClick={() => onOpenHistory(h)} title={`L’album parfait de ${h.artist.name}`}>
                    <img src={h.cover.url} alt="" loading="lazy" />
                    <span>{h.artist.name}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
      <div className="hero-3d" aria-hidden>
        <Vinyl3D mode="hero" label="Vinyle album parfait" />
      </div>
    </section>
  );
}
