import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { AlbumBuilder } from './components/AlbumBuilder';
import { Compare } from './components/Compare';
import { CoverCarousel } from './components/CoverCarousel';
import { Podium } from './components/Podium';
import { Recap } from './components/Recap';
import { Search } from './components/Search';
import { useDiscography } from './hooks/useDiscography';
import { usePreview } from './hooks/usePreview';
import { submitAlbum, useStats } from './hooks/useStats';
import { albumReducer, initialAlbum, isComplete } from './lib/album';
import { coverChoices } from './lib/classify';
import { encodeShare, readHash, readShortPath, toShared, type SharedAlbum, type ShortShare } from './lib/share';
import { loadDraft, loadHistory, pushHistory, saveDraft, type Draft } from './lib/storage';
import type { Artist, Project } from './lib/types';

type Screen = 'search' | 'covers' | 'build' | 'recap' | 'shared' | 'compare';
const STEPS: Array<[Screen[], string]> = [
  [['search'], 'i. artiste'],
  [['covers'], 'ii. cover'],
  [['build'], 'iii. tracklist'],
  [['recap', 'shared', 'compare'], 'iv. album'],
];

const reducedMotion = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Transition d'écran animée quand le navigateur le permet. */
function transition(update: () => void) {
  const doc = document as Document & { startViewTransition?: (cb: () => void) => unknown };
  if (doc.startViewTransition && !reducedMotion()) doc.startViewTransition(() => flushSync(update));
  else update();
}

const artistFromShared = (a: SharedAlbum): Artist => ({ id: a.artist.id, name: a.artist.name, picture: a.artist.picture, fans: 0 });

/** `initial` : album d'un lien court /a/<id>. Un ancien lien #album=… / #defi=… reste prioritaire. */
export function App({ initial = null }: { initial?: ShortShare | null }) {
  const fromHash = useMemo(() => readHash(window.location.hash) ?? initial, [initial]);
  const [screen, setScreen] = useState<Screen>(fromHash?.kind === 'album' ? 'shared' : fromHash?.kind === 'defi' ? 'covers' : 'search');
  const [shared, setShared] = useState<SharedAlbum | null>(fromHash?.kind === 'album' ? fromHash.album : null);
  const [challenge, setChallenge] = useState<SharedAlbum | null>(fromHash?.kind === 'defi' ? fromHash.album : null);
  const [artist, setArtist] = useState<Artist | null>(fromHash?.kind === 'defi' ? artistFromShared(fromHash.album) : null);
  const [cover, setCover] = useState<Project | null>(null);
  const [coverReturn, setCoverReturn] = useState<'build' | 'recap'>('build');
  const [album, dispatch] = useReducer(albumReducer, undefined, initialAlbum);
  const [draft, setDraft] = useState<Draft | null>(() => (fromHash ? null : loadDraft()));
  const [history, setHistory] = useState<SharedAlbum[]>(loadHistory);
  const [mine, setMine] = useState<SharedAlbum | null>(null);
  const submitted = useRef(new Set<string>());
  const disco = useDiscography(artist);
  const { stats, refresh } = useStats(artist?.id ?? null);
  const preview = usePreview();
  const covers = useMemo(() => (artist ? coverChoices(disco.projects, artist.id) : []), [disco.projects, artist]);
  const ready = disco.status === 'ready';

  const go = useCallback((s: Screen) => transition(() => setScreen(s)), []);

  /** Quitte un lien partagé : retire le hash, et le chemin /a/<id> d'un lien court. */
  const clearHash = () => {
    const short = readShortPath(window.location.pathname) !== null;
    if (window.location.hash || short) history_replace((short ? '/' : window.location.pathname) + window.location.search);
  };

  // Brouillon : sauvegardé à chaque changement pendant la composition.
  useEffect(() => {
    if (!artist || screen === 'search' || screen === 'shared' || screen === 'compare') return;
    const d: Draft = { artist, cover, slots: album.slots, screen, savedAt: Date.now() };
    saveDraft(d);
  }, [artist, cover, album.slots, screen]);

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [screen]);

  // Un lien #album=… ou #defi=… collé dans un onglet déjà ouvert ne recharge pas la page.
  useEffect(() => {
    const onHash = () => {
      const h = readHash(window.location.hash);
      if (!h) return;
      preview.stop();
      if (h.kind === 'album') {
        setShared(h.album);
        go('shared');
      } else {
        setChallenge(h.album);
        setMine(null);
        setArtist(artistFromShared(h.album));
        setCover(null);
        dispatch({ type: 'reset' });
        go('covers');
      }
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, [go, preview]);

  // Halo de lampe qui suit la souris (pas au doigt). Déplacé par transform : ni recalcul de style ni repeinte.
  const lamp = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (reducedMotion() || matchMedia('(pointer: coarse)').matches) return;
    let raf = 0;
    const onMove = (e: PointerEvent) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        if (lamp.current) lamp.current.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0)`;
      });
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('pointermove', onMove);
    };
  }, []);

  const restart = useCallback(() => {
    preview.stop();
    clearHash();
    saveDraft(null);
    setDraft(null);
    setShared(null);
    setChallenge(null);
    setMine(null);
    setArtist(null);
    setCover(null);
    dispatch({ type: 'reset' });
    go('search');
  }, [preview, go]);

  const pickArtist = (a: Artist) => {
    setArtist(a);
    setCover(null);
    dispatch({ type: 'reset' });
    go('covers');
  };

  const chooseCover = (p: Project) => {
    setCover(p);
    go(coverReturn === 'recap' && isComplete(album) ? 'recap' : 'build');
    setCoverReturn('build');
  };

  const changeCover = (from: 'build' | 'recap') => {
    setCoverReturn(from);
    go('covers');
  };

  const press = () => {
    if (!artist || !cover) return;
    preview.stop();
    const result = toShared(artist, cover, album);
    setMine(result);
    setHistory(pushHistory(result));
    const code = encodeShare(result);
    if (stats.enabled !== false && !submitted.current.has(code)) {
      submitted.current.add(code);
      const ids = result.tracks.map((t) => t?.id ?? 0);
      void submitAlbum(artist.id, cover.id, ids).then((ok) => ok && refresh());
    }
    go(challenge ? 'compare' : 'recap');
  };

  const resume = () => {
    if (!draft) return;
    setArtist(draft.artist);
    setCover(draft.cover);
    dispatch({ type: 'load', slots: draft.slots });
    const filled = Object.values(draft.slots).filter(Boolean).length;
    if (draft.screen === 'recap' && draft.cover && filled === 10) {
      setMine(toShared(draft.artist, draft.cover, { slots: draft.slots, active: null }));
      go('recap');
    } else go(draft.cover ? 'build' : 'covers');
  };

  const openShared = (a: SharedAlbum) => {
    setShared(a);
    go('shared');
  };

  const makeYours = (a: SharedAlbum) => {
    clearHash();
    setShared(null);
    pickArtist(artistFromShared(a));
  };

  const ownAlbum = mine ?? (artist && cover && isComplete(album) ? toShared(artist, cover, album) : null);

  return (
    <div className="frame">
      <div className="lamp" ref={lamp} aria-hidden />
      <header className="topbar">
        <button className="wordmark" onClick={restart} aria-label="Accueil — recommencer">
          album parfait.
        </button>
        <ol className="steps" aria-label="Étapes">
          {STEPS.map(([keys, label]) => (
            <li key={label} aria-current={keys.includes(screen) ? 'step' : undefined}>
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

      {challenge && (screen === 'covers' || screen === 'build') && (
        <div className="challenge-banner">
          défi en cours : compose ton album parfait de <em>{challenge.artist.name}</em>, puis compare avec ton ami.
        </div>
      )}

      <main className="stage" key={screen}>
        {screen === 'search' && (
          <Search
            onPick={pickArtist}
            draft={draft}
            onResume={resume}
            onDiscard={() => {
              saveDraft(null);
              setDraft(null);
            }}
            history={history}
            onOpenHistory={openShared}
          />
        )}

        {(screen === 'covers' || screen === 'build') && artist && !ready && (
          <div className="loading">
            <div className="vinyl" aria-hidden />
            {disco.status === 'error' ? (
              <p className="muted">Impossible de lire la discographie : {disco.error}</p>
            ) : (
              <>
                <p className="kicker">lecture de la discographie de {artist.name}</p>
                <div className={`meter ${disco.total ? '' : 'indeterminate'}`} role="progressbar" aria-valuenow={disco.total ? disco.loaded : undefined} aria-valuemax={disco.total || undefined}>
                  <i style={{ width: disco.total ? `${(disco.loaded / disco.total) * 100}%` : '4%' }} />
                </div>
                <p className="muted">{disco.total ? `${disco.loaded} / ${disco.total} projets` : 'chargement de la discographie…'}</p>
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
            stats={stats}
            onChangeCover={() => changeCover('build')}
            onDone={press}
          />
        )}

        {screen === 'recap' && ownAlbum && (
          <Recap
            album={ownAlbum}
            mode="own"
            podium={<Podium stats={stats} projects={disco.projects} />}
            onEditTracks={() => {
              setMine(null);
              go('build');
            }}
            onChangeCover={() => {
              setMine(null);
              changeCover('recap');
            }}
            onRestart={restart}
          />
        )}

        {screen === 'shared' && shared && <Recap album={shared} mode="shared" onMakeYours={() => makeYours(shared)} onRestart={restart} />}

        {screen === 'compare' && ownAlbum && challenge && <Compare mine={ownAlbum} theirs={challenge} onSeeMine={() => go('recap')} />}
      </main>

      <div className="advisory" aria-hidden>
        <span className="s">PARENTAL</span>
        <span className="b">ADVISORY</span>
        <span className="s">EXPLICIT CONTENT</span>
      </div>
    </div>
  );
}

function history_replace(url: string) {
  try {
    window.history.replaceState(null, '', url);
  } catch {
    /* ignoré */
  }
}
