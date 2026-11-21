import { useEffect, useMemo, useRef, useState } from 'react';
import type { Preview } from '../hooks/usePreview';
import type { Stats } from '../hooks/useStats';
import { FREE_SLOTS, isPlaced, kindForSlot, type AlbumAction, type AlbumState, type SlotKind } from '../lib/album';
import { candidatesFor, groupByProject } from '../lib/candidates';
import { normalizeTitle } from '../lib/classify';
import { applyFilter, NO_FILTER, sortTracks, type ProjectFilter, type SortMode } from '../lib/explore';
import type { Artist, Project, ProjectWithTracks, Track } from '../lib/types';
import { Knockout } from './Knockout';
import { useCoarse } from '../hooks/useCoarse';

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

const SORT_LABEL: Record<SortMode, string> = { projet: 'par projet', popularite: 'par popularité', date: 'par date' };
const pad = (n: number) => String(n).padStart(2, '0');
const FREE = FREE_SLOTS as readonly number[];

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
  stats: Stats;
  onChangeCover: () => void;
  onDone: () => void;
}

export function AlbumBuilder(props: Props) {
  const { artist, cover, album, dispatch, onDone, onChangeCover } = props;
  const pickerRef = useRef<HTMLDivElement>(null);
  const [sort, setSort] = useState<SortMode>('projet');
  const [filter, setFilter] = useState<ProjectFilter>(NO_FILTER);
  const [dragFrom, setDragFrom] = useState<number | null>(null);
  const [dropOn, setDropOn] = useState<number | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const coarse = useCoarse();
  const slot = album.active;
  const kind = slot ? kindForSlot(slot) : null;
  const complete = slot === null;
  const missing = Object.values(album.slots).filter((t) => !t).length;
  const isMobile = () => window.matchMedia('(max-width: 860px)').matches;

  // Sur mobile, revenir en haut des choix à chaque changement de piste.
  useEffect(() => {
    if (slot && isMobile()) {
      const top = (pickerRef.current?.getBoundingClientRect().top ?? 0) + window.scrollY - 80;
      if (window.scrollY > top) window.scrollTo({ top, behavior: 'smooth' });
    }
  }, [slot]);

  const move = (n: number, dir: -1 | 1) => {
    const i = FREE.indexOf(n);
    const j = i + dir;
    if (i >= 0 && j >= 0 && j < FREE.length) dispatch({ type: 'swap', a: n, b: FREE[j] });
  };

  return (
    <section className="builder">
      <div className="mobile-bar">
        <img src={cover.cover} alt="" />
        <div className="mb-text">
          <span className="mb-artist">{artist.name}</span>
          <span className="mb-slot">{slot && kind ? `piste ${pad(slot)} · ${TAG[kind] || 'son libre'}` : 'album complet'}</span>
        </div>
        <span className="mb-count">{10 - missing}/10</span>
        <button className="ghost" aria-expanded={sheetOpen} onClick={() => setSheetOpen((v) => !v)}>
          {sheetOpen ? 'fermer' : 'tracklist'}
        </button>
      </div>
      <aside className={`sheet${sheetOpen ? ' open' : ''}`}>
        <div className="sheet-head">
          <button className="sleeve-btn" onClick={onChangeCover} title="Changer la cover">
            <img src={cover.cover} alt={`Cover choisie : ${cover.title}`} />
            <span>changer</span>
          </button>
          <div>
            <p className="kicker">album parfait de</p>
            <h2>{artist.name}</h2>
          </div>
        </div>
        <ol className="tracklist">
          {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => {
            const t = album.slots[n];
            const free = FREE.includes(n);
            return (
              <li
                key={n}
                className={`${free ? 'is-free' : ''} ${dropOn === n ? 'drop' : ''}`}
                draggable={free && !!t}
                onDragStart={(e) => {
                  setDragFrom(n);
                  e.dataTransfer.effectAllowed = 'move';
                  e.dataTransfer.setData('text/plain', String(n));
                }}
                onDragOver={(e) => {
                  if (free && dragFrom !== null && dragFrom !== n) {
                    e.preventDefault();
                    setDropOn(n);
                  }
                }}
                onDragLeave={() => setDropOn((d) => (d === n ? null : d))}
                onDrop={(e) => {
                  e.preventDefault();
                  if (dragFrom !== null) dispatch({ type: 'swap', a: dragFrom, b: n });
                  setDragFrom(null);
                  setDropOn(null);
                }}
                onDragEnd={() => {
                  setDragFrom(null);
                  setDropOn(null);
                }}
              >
                <button
                  className="slot"
                  aria-current={album.active === n}
                  onClick={() => {
                    dispatch({ type: 'open', slot: n });
                    if (isMobile()) setSheetOpen(false);
                  }}
                >
                  <span className="n">{pad(n)}</span>
                  <span className={`title flap${t ? '' : ' empty'}`} key={t?.id ?? 'vide'}>
                    {t ? t.title : '—'}
                  </span>
                  <span className="tag">{TAG[kindForSlot(n)]}</span>
                </button>
                {free && t && (
                  <span className="reorder">
                    <button aria-label={`Monter la piste ${n}`} disabled={n === FREE[0]} onClick={() => move(n, -1)}>
                      ↑
                    </button>
                    <button aria-label={`Descendre la piste ${n}`} disabled={n === FREE[FREE.length - 1]} onClick={() => move(n, 1)}>
                      ↓
                    </button>
                  </span>
                )}
              </li>
            );
          })}
        </ol>
        <p className="hint-line">
          {coarse ? 'touche ↑ ↓ pour changer l’ordre des pistes libres.' : 'glisse les pistes libres pour changer leur ordre.'}
        </p>
        <button className="cta" disabled={!complete} onClick={onDone}>
          {complete ? 'presser le vinyle' : `encore ${missing} piste${missing > 1 ? 's' : ''}`}
        </button>
      </aside>

      <div className="picker" ref={pickerRef}>
        {kind && slot ? (
          <Picker key={slot} slot={slot} kind={kind} {...props} sort={sort} setSort={setSort} filter={filter} setFilter={setFilter} />
        ) : (
          <div className="picker-head">
            <p className="kicker">face b · terminé</p>
            <h3>
              l’album est <em>complet.</em>
            </h3>
            <p>
              {coarse
                ? 'ouvre la tracklist pour changer une piste ou l’ordre, ou presse le vinyle.'
                : 'clique sur une piste pour la changer, glisse les pistes libres pour les réordonner, ou presse le vinyle.'}
            </p>
            <button className="cta mobile-only" onClick={onDone}>
              presser le vinyle
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

interface PickerProps extends Props {
  slot: number;
  kind: SlotKind;
  sort: SortMode;
  setSort: (s: SortMode) => void;
  filter: ProjectFilter;
  setFilter: (f: ProjectFilter) => void;
}

function Picker({ slot, kind, artist, projects, contributors, creditsDone, creditsTotal, album, dispatch, preview, stats, sort, setSort, filter, setFilter }: PickerProps) {
  const [text, setText] = useState('');
  const [showFilter, setShowFilter] = useState(false);
  const [duel, setDuel] = useState<Track[] | null>(null);
  const creditsComplete = creditsDone >= creditsTotal;
  const { tracks, fallback } = useMemo(
    () => candidatesFor(kind, { projects, artistId: artist.id, contributors, creditsComplete }),
    [kind, projects, artist.id, contributors, creditsComplete],
  );
  const byPosition = kind === 'intro' || kind === 'outro';
  const filterable = !byPosition || fallback;
  const visible = useMemo(() => {
    const f = normalizeTitle(text);
    let list = filterable ? applyFilter(tracks, projects, filter) : tracks;
    if (f) list = list.filter((t) => normalizeTitle(t.title).includes(f));
    return sortTracks(list, projects, sort);
  }, [tracks, projects, filter, filterable, text, sort]);
  const current = album.slots[slot];
  const free = FREE.indexOf(slot);
  const counts = stats.enabled ? stats.counts[kind] : null;
  const projectById = useMemo(() => new Map(projects.map((p) => [p.id, p])), [projects]);
  const available = visible.filter((t) => !isPlaced(album, t) || current?.id === t.id);
  const hiddenCount = filter.hidden.size + (filter.hideSingles ? 1 : 0);

  const place = (t: Track) => dispatch({ type: 'place', track: t });

  if (duel) {
    return (
      <Knockout
        title={COPY[kind].title}
        slot={slot}
        candidates={duel}
        projects={projectById}
        preview={preview}
        onWinner={(t) => {
          setDuel(null);
          place(t);
        }}
        onQuit={() => setDuel(null)}
      />
    );
  }

  return (
    <>
      <div className="picker-head">
        <p className="kicker">
          piste {pad(slot)}
          {kind === 'free' ? ` · son ${free + 1} / 6` : ''}
          {stats.enabled && stats.albums > 0 ? ` · ${stats.albums} album${stats.albums > 1 ? 's' : ''} pressé${stats.albums > 1 ? 's' : ''} par les joueurs` : ''}
        </p>
        <h3>{COPY[kind].title}</h3>
        <p>{COPY[kind].hint}</p>
      </div>

      {kind === 'feat' && !creditsComplete && (
        <div className="notice">
          analyse des crédits {creditsDone} / {creditsTotal}… la liste se complète au fur et à mesure.
        </div>
      )}
      {fallback && <div className="notice">{COPY[kind].none}</div>}
      {current && (
        <div className="notice">
          actuellement : {current.title}{' '}
          <button className="ghost" onClick={() => dispatch({ type: 'clear', slot })}>
            retirer
          </button>
        </div>
      )}

      <div className="toolbar">
        <input
          id={`filter-${slot}`}
          className="filter"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="filtrer les titres…"
          aria-label="Filtrer les titres"
        />
        <div className="toolbar-row">
          <label className="select">
            <span className="sr-only">Trier</span>
            <select value={sort} onChange={(e) => setSort(e.target.value as SortMode)}>
              {(Object.keys(SORT_LABEL) as SortMode[]).map((m) => (
                <option key={m} value={m}>
                  {SORT_LABEL[m]}
                </option>
              ))}
            </select>
          </label>
          {filterable && (
            <button className={`ghost ${hiddenCount ? 'on' : ''}`} aria-expanded={showFilter} onClick={() => setShowFilter((v) => !v)}>
              projets{hiddenCount ? ` · ${hiddenCount} masqué${hiddenCount > 1 ? 's' : ''}` : ''}
            </button>
          )}
          <button className="ghost duel-btn" disabled={available.length < 2} onClick={() => setDuel(available)} title="Départage 8 sons au hasard, duel par duel">
            mode 1v1
          </button>
        </div>
        {filterable && showFilter && (
          <div className="chips">
            <label className="chip">
              <input
                type="checkbox"
                checked={filter.hideSingles}
                onChange={(e) => setFilter({ ...filter, hideSingles: e.target.checked })}
              />
              masquer les singles
            </label>
            <button className="ghost" onClick={() => setFilter(NO_FILTER)}>
              tout afficher
            </button>
            {projects
              .filter((p) => p.recordType !== 'single')
              .map((p) => {
                const on = !filter.hidden.has(p.id);
                return (
                  <button
                    key={p.id}
                    className={`chip ${on ? 'on' : ''}`}
                    aria-pressed={on}
                    onClick={() => {
                      const hidden = new Set(filter.hidden);
                      if (on) hidden.add(p.id);
                      else hidden.delete(p.id);
                      setFilter({ ...filter, hidden });
                    }}
                  >
                    <img src={p.cover} alt="" loading="lazy" />
                    {p.title}
                  </button>
                );
              })}
          </div>
        )}
      </div>

      {visible.length === 0 && kind === 'feat' && !creditsComplete && <p className="muted">recherche des featurings…</p>}
      {visible.length === 0 && (kind !== 'feat' || creditsComplete) && <p className="muted">Aucun titre.</p>}

      {sort === 'projet' ? (
        groupByProject(visible, projects).map(({ project, tracks: list }) => (
          <div className="group" key={project.id}>
            <div className="group-head">
              <img src={project.cover} alt="" loading="lazy" />
              <span className="t">{project.title}</span>
              <span className="y">{project.releaseDate.slice(0, 4)}</span>
            </div>
            {list.map((t) => (
              <TrackRow key={t.id} track={t} artist={artist} album={album} current={current} onPick={() => place(t)} preview={preview} count={counts?.get(t.id)} />
            ))}
          </div>
        ))
      ) : (
        <div className="group flat">
          {visible.map((t) => (
            <TrackRow
              key={t.id}
              track={t}
              artist={artist}
              album={album}
              current={current}
              onPick={() => place(t)}
              preview={preview}
              count={counts?.get(t.id)}
              project={projectById.get(t.projectId)}
            />
          ))}
        </div>
      )}
    </>
  );
}

function TrackRow({
  track,
  artist,
  album,
  current,
  onPick,
  preview,
  count,
  project,
}: {
  track: Track;
  artist: Artist;
  album: AlbumState;
  current: Track | null;
  onPick: () => void;
  preview: Preview;
  count?: number;
  project?: Project;
}) {
  const used = isPlaced(album, track) && current?.id !== track.id;
  const playing = preview.playing === track.id;
  return (
    <div className={`track${used ? ' used' : ''}${current?.id === track.id ? ' current' : ''}`}>
      {project ? <img className="mini" src={project.cover} alt="" loading="lazy" title={project.title} /> : (
        <span className="pos">
          {track.disk > 1 ? `${track.disk}·` : ''}
          {pad(track.position)}
        </span>
      )}
      <button
        className="play"
        aria-pressed={playing}
        aria-label={playing ? `Arrêter l’extrait de ${track.title}` : `Écouter un extrait de ${track.title}`}
        disabled={!track.hasPreview}
        onClick={() => preview.toggle(track)}
      >
        {playing ? '■' : '▶'}
      </button>
      <button className="pick" disabled={used} onClick={onPick} title={used ? 'déjà dans l’album' : 'placer dans l’album'}>
        {track.title}
      </button>
      <span className="meta-r">
        {count ? (
          <span className="votes" title={`choisi ${count} fois par les joueurs`}>
            ★ {count}
          </span>
        ) : null}
        {track.artistId !== artist.id && <span className="who">{track.artistName}</span>}
      </span>
    </div>
  );
}
