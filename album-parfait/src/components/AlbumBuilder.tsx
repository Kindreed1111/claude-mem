import { useEffect, useMemo, useRef, useState } from 'react';
import type { Preview } from '../hooks/usePreview';
import { isPlaced, kindForSlot, type AlbumAction, type AlbumState, type SlotKind } from '../lib/album';
import { candidatesFor, groupByProject } from '../lib/candidates';
import { normalizeTitle } from '../lib/classify';
import type { Artist, Project, ProjectWithTracks, Track } from '../lib/types';

const TAG: Record<SlotKind, string> = { intro: 'intro', outro: 'outro', interlude: 'interlude', feat: 'feat', free: '' };

const COPY: Record<SlotKind, { title: React.ReactNode; hint: string; none: string }> = {
  intro: {
    title: (
      <>
        la meilleure <em>intro.</em>
      </>
    ),
    hint: 'le premier titre de chaque projet.',
    none: 'Aucun projet complet détecté — choisis le son qui s’en rapproche le plus.',
  },
  outro: {
    title: (
      <>
        la meilleure <em>outro.</em>
      </>
    ),
    hint: 'le dernier titre de chaque projet.',
    none: 'Aucun projet complet détecté — choisis le son qui s’en rapproche le plus.',
  },
  interlude: {
    title: (
      <>
        la meilleure <em>interlude.</em>
      </>
    ),
    hint: 'les titres qui portent le mot « interlude ».',
    none: 'Aucune interlude détectée — choisis le son qui s’en rapproche le plus.',
  },
  feat: {
    title: (
      <>
        le meilleur <em>feat.</em>
      </>
    ),
    hint: 'les titres où un autre artiste est crédité.',
    none: 'Aucun feat détecté — choisis le son qui s’en rapproche le plus.',
  },
  free: {
    title: (
      <>
        tes sons <em>préférés.</em>
      </>
    ),
    hint: 'six pistes libres pour compléter l’album.',
    none: '',
  },
};

const pad = (n: number) => String(n).padStart(2, '0');

interface Props {
  artist: Artist;
  cover: Project;
  projects: ProjectWithTracks[];
  contributors: Map<number, number[]>;
  creditsDone: number;
  creditsTotal: number;
  album: AlbumState;
  dispatch: (a: AlbumAction) => void;
  preview: Preview;
  onDone: () => void;
}

export function AlbumBuilder(props: Props) {
  const { artist, cover, projects, contributors, creditsDone, creditsTotal, album, dispatch, preview, onDone } = props;
  const pickerRef = useRef<HTMLDivElement>(null);
  const slot = album.active;
  const kind = slot ? kindForSlot(slot) : null;
  const creditsComplete = creditsDone >= creditsTotal;
  const complete = slot === null;

  // Sur mobile, ramener le panneau de choix en vue à chaque changement de slot.
  useEffect(() => {
    if (slot && window.matchMedia('(max-width: 860px)').matches) {
      pickerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [slot]);

  return (
    <section className="builder">
      <aside className="sheet">
        <div className="sheet-head">
          <img src={cover.cover} alt={`Cover choisie : ${cover.title}`} />
          <div>
            <p className="kicker">album parfait de</p>
            <h2>{artist.name}</h2>
          </div>
        </div>
        <ol className="tracklist">
          {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => {
            const t = album.slots[n];
            return (
              <li key={n}>
                <button
                  className="slot"
                  aria-current={album.active === n}
                  onClick={() => dispatch({ type: 'open', slot: n })}
                >
                  <span className="n">{pad(n)}</span>
                  <span className={`title${t ? '' : ' empty'}`}>{t ? t.title : '—'}</span>
                  <span className="tag">{TAG[kindForSlot(n)]}</span>
                </button>
              </li>
            );
          })}
        </ol>
        <button className="cta" disabled={!complete} onClick={onDone}>
          {complete ? 'presser le vinyle' : `encore ${Object.values(album.slots).filter((t) => !t).length} piste(s)`}
        </button>
      </aside>

      <div className="picker" ref={pickerRef}>
        {kind && slot ? (
          <Picker
            key={slot}
            slot={slot}
            kind={kind}
            artist={artist}
            projects={projects}
            contributors={contributors}
            creditsComplete={creditsComplete}
            creditsDone={creditsDone}
            creditsTotal={creditsTotal}
            album={album}
            dispatch={dispatch}
            preview={preview}
          />
        ) : (
          <div className="picker-head">
            <p className="kicker">face b · terminé</p>
            <h3>
              l’album est <em>complet.</em>
            </h3>
            <p>clique sur une piste pour la changer, ou presse le vinyle.</p>
          </div>
        )}
      </div>
    </section>
  );
}

interface PickerProps {
  slot: number;
  kind: SlotKind;
  artist: Artist;
  projects: ProjectWithTracks[];
  contributors: Map<number, number[]>;
  creditsComplete: boolean;
  creditsDone: number;
  creditsTotal: number;
  album: AlbumState;
  dispatch: (a: AlbumAction) => void;
  preview: Preview;
}

function Picker({ slot, kind, artist, projects, contributors, creditsComplete, creditsDone, creditsTotal, album, dispatch, preview }: PickerProps) {
  const [filter, setFilter] = useState('');
  const { tracks, fallback } = useMemo(
    () => candidatesFor(kind, { projects, artistId: artist.id, contributors, creditsComplete }),
    [kind, projects, artist.id, contributors, creditsComplete],
  );
  const showFilter = kind === 'free' || fallback;
  const visible = useMemo(() => {
    const f = normalizeTitle(filter);
    return f ? tracks.filter((t) => normalizeTitle(t.title).includes(f)) : tracks;
  }, [tracks, filter]);
  const groups = useMemo(() => groupByProject(visible, projects), [visible, projects]);
  const copy = COPY[kind];
  const current = album.slots[slot];
  const freeIndex = [3, 4, 5, 6, 8, 9].indexOf(slot);

  return (
    <>
      <div className="picker-head">
        <p className="kicker">
          piste {pad(slot)}
          {kind === 'free' ? ` · son ${freeIndex + 1} / 6` : ''}
        </p>
        <h3>{copy.title}</h3>
        <p>{copy.hint}</p>
      </div>

      {kind === 'feat' && !creditsComplete && (
        <div className="notice">
          analyse des crédits {creditsDone} / {creditsTotal}… la liste se complète au fur et à mesure.
        </div>
      )}
      {fallback && <div className="notice">{copy.none}</div>}
      {current && (
        <div className="notice">
          actuellement : {current.title}{' '}
          <button className="ghost" onClick={() => dispatch({ type: 'clear', slot })}>
            retirer
          </button>
        </div>
      )}
      {showFilter && (
        <input
          className="filter"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="filtrer les titres…"
          aria-label="Filtrer les titres"
        />
      )}

      {groups.length === 0 && kind === 'feat' && !creditsComplete && <p className="muted">recherche des featurings…</p>}
      {groups.length === 0 && (kind !== 'feat' || creditsComplete) && <p className="muted">Aucun titre.</p>}

      {groups.map(({ project, tracks: list }) => (
        <div className="group" key={project.id}>
          <div className="group-head">
            <img src={project.cover} alt="" loading="lazy" />
            <span className="t">{project.title}</span>
            <span className="y">{project.releaseDate.slice(0, 4)}</span>
          </div>
          {list.map((t) => (
            <TrackRow
              key={t.id}
              track={t}
              artist={artist}
              used={isPlaced(album, t) && current?.id !== t.id}
              onPick={() => dispatch({ type: 'place', track: t })}
              preview={preview}
            />
          ))}
        </div>
      ))}
    </>
  );
}

function TrackRow({ track, artist, used, onPick, preview }: { track: Track; artist: Artist; used: boolean; onPick: () => void; preview: Preview }) {
  const playing = preview.playing === track.id;
  return (
    <div className={`track${used ? ' used' : ''}`}>
      <span className="pos">{track.disk > 1 ? `${track.disk}·` : ''}{pad(track.position)}</span>
      <button
        className="play"
        aria-pressed={playing}
        aria-label={playing ? `Arrêter l’extrait de ${track.title}` : `Écouter un extrait de ${track.title}`}
        disabled={!track.preview}
        onClick={() => preview.toggle(track)}
      >
        {playing ? '■' : '▶'}
      </button>
      <button className="pick" disabled={used} onClick={onPick} title={used ? 'déjà dans l’album' : 'placer dans l’album'}>
        {track.title}
      </button>
      {track.artistId !== artist.id && <span className="who">{track.artistName}</span>}
    </div>
  );
}
