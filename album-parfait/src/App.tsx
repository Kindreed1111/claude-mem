import { useCallback, useMemo, useReducer, useState } from 'react';
import { AlbumBuilder } from './components/AlbumBuilder';
import { CoverCarousel } from './components/CoverCarousel';
import { Recap } from './components/Recap';
import { Search } from './components/Search';
import { useDiscography } from './hooks/useDiscography';
import { usePreview } from './hooks/usePreview';
import { albumReducer, initialAlbum } from './lib/album';
import { coverChoices } from './lib/classify';
import type { Artist, Project } from './lib/types';

type Screen = 'search' | 'covers' | 'build' | 'recap';
const STEPS: Array<[Screen, string]> = [
  ['search', 'i. artiste'],
  ['covers', 'ii. cover'],
  ['build', 'iii. tracklist'],
  ['recap', 'iv. album'],
];

export function App() {
  const [screen, setScreen] = useState<Screen>('search');
  const [artist, setArtist] = useState<Artist | null>(null);
  const [cover, setCover] = useState<Project | null>(null);
  const [album, dispatch] = useReducer(albumReducer, undefined, initialAlbum);
  const disco = useDiscography(artist);
  const preview = usePreview();
  const covers = useMemo(() => (artist ? coverChoices(disco.projects, artist.id) : []), [disco.projects, artist]);

  const restart = useCallback(() => {
    preview.stop();
    setArtist(null);
    setCover(null);
    dispatch({ type: 'reset' });
    setScreen('search');
  }, [preview]);

  const chooseCover = useCallback((p: Project) => {
    setCover(p);
    setScreen('build');
  }, []);

  const ready = disco.status === 'ready';

  return (
    <div className="frame">
      <header className="topbar">
        <button className="wordmark" onClick={restart} aria-label="Accueil — recommencer">
          album parfait.
        </button>
        <ol className="steps" aria-label="Étapes">
          {STEPS.map(([key, label]) => (
            <li key={key} aria-current={screen === key ? 'step' : undefined}>
              {label}
            </li>
          ))}
        </ol>
        {screen !== 'search' && (
          <button className="ghost" onClick={restart}>
            recommencer
          </button>
        )}
      </header>

      <main className="stage" key={screen}>
        {screen === 'search' && (
          <Search
            onPick={(a) => {
              setArtist(a);
              setScreen('covers');
            }}
          />
        )}

        {screen !== 'search' && artist && !ready && (
          <div className="loading">
            <div className="vinyl" aria-hidden />
            {disco.status === 'error' ? (
              <p className="muted">Impossible de lire la discographie : {disco.error}</p>
            ) : (
              <>
                <p className="kicker">lecture de la discographie de {artist.name}</p>
                <div className="meter" role="progressbar" aria-valuenow={disco.loaded} aria-valuemax={disco.total || undefined}>
                  <i style={{ width: disco.total ? `${(disco.loaded / disco.total) * 100}%` : '4%' }} />
                </div>
                <p className="muted">
                  {disco.total ? `${disco.loaded} / ${disco.total} projets` : 'recherche des projets…'}
                </p>
              </>
            )}
          </div>
        )}

        {screen === 'covers' && ready && <CoverCarousel covers={covers} onChoose={chooseCover} />}

        {screen === 'build' && ready && artist && cover && (
          <AlbumBuilder
            artist={artist}
            cover={cover}
            projects={disco.projects}
            contributors={disco.contributors}
            creditsDone={disco.creditsDone}
            creditsTotal={disco.creditsTotal}
            album={album}
            dispatch={dispatch}
            preview={preview}
            onDone={() => {
              preview.stop();
              setScreen('recap');
            }}
          />
        )}

        {screen === 'recap' && artist && cover && (
          <Recap artist={artist} cover={cover} album={album} onEdit={() => setScreen('build')} onRestart={restart} />
        )}
      </main>

      <div className="advisory" aria-hidden>
        <span className="s">PARENTAL</span>
        <span className="b">ADVISORY</span>
        <span className="s">EXPLICIT CONTENT</span>
      </div>
    </div>
  );
}
