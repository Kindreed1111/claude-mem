import { useEffect, useRef, useState } from 'react';
import { searchArtists } from '../lib/deezer';
import type { Artist } from '../lib/types';

const fmtFans = (n: number) => new Intl.NumberFormat('fr-FR', { notation: 'compact' }).format(n) + ' fans';

export function Search({ onPick }: { onPick: (a: Artist) => void }) {
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

  return (
    <section className="search">
      <p className="kicker">face a · choisis l’artiste</p>
      <h1 className="headline">
        compose son <em>album parfait.</em>
      </h1>
      <div className="search-field">
        <input
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
    </section>
  );
}
