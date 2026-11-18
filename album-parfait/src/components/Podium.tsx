import { useMemo } from 'react';
import type { Stats } from '../hooks/useStats';
import type { StatKind } from '../../server/stats';
import type { ProjectWithTracks } from '../lib/types';

const ROWS: Array<[StatKind, string]> = [
  ['cover', 'cover'],
  ['intro', 'intro'],
  ['feat', 'feat'],
  ['interlude', 'interlude'],
  ['outro', 'outro'],
  ['free', 'sons libres'],
];

/** Classement des joueurs : top 3 par catégorie, titres résolus depuis la discographie chargée. */
export function Podium({ stats, projects }: { stats: Stats; projects: ProjectWithTracks[] }) {
  const titles = useMemo(() => {
    const m = new Map<number, string>();
    for (const p of projects) for (const t of p.tracks) m.set(t.id, t.title);
    return m;
  }, [projects]);
  const covers = useMemo(() => new Map(projects.map((p) => [p.id, p])), [projects]);

  if (!stats.enabled || !stats.top || stats.albums === 0) return null;
  const pct = (n: number) => `${Math.round((n / stats.albums) * 100)} %`;

  return (
    <section className="podium" aria-label="Classement des joueurs">
      <p className="kicker">
        le choix des joueurs · {stats.albums} album{stats.albums > 1 ? 's' : ''}
      </p>
      <div className="podium-grid">
        {ROWS.map(([kind, label]) => {
          const entries = (stats.top?.[kind] ?? [])
            .map((e) => ({ ...e, title: kind === 'cover' ? covers.get(e.id)?.title : titles.get(e.id), img: kind === 'cover' ? covers.get(e.id)?.cover : undefined }))
            .filter((e) => e.title)
            .slice(0, 3);
          if (entries.length === 0) return null;
          return (
            <div className="podium-col" key={kind}>
              <h4>{label}</h4>
              <ol>
                {entries.map((e, i) => (
                  <li key={e.id} style={{ '--i': i } as React.CSSProperties}>
                    {e.img && <img src={e.img} alt="" loading="lazy" />}
                    <span className="t">{e.title}</span>
                    <span className="p">{kind === 'free' ? `×${e.count}` : pct(e.count)}</span>
                    <i style={{ width: kind === 'free' ? '0' : pct(e.count) }} />
                  </li>
                ))}
              </ol>
            </div>
          );
        })}
      </div>
    </section>
  );
}
