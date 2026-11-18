import type { CSSProperties, FocusEvent } from 'react';
import type { Artist, WallItem } from '../lib/types';

/** En dessous, pas de mur : l'accueil reste épuré. */
export const WALL_MIN = 6;
const LANES = 3;
/** Pochettes par copie de piste : de quoi remplir la hauteur avant que la boucle ne se voie. */
const PER_LANE = 8;

/** Répète la piste jusqu'à `n` pochettes ; les répétitions sont décoratives. */
function fill(lane: WallItem[], n: number): Array<{ item: WallItem; repeat: boolean }> {
  const out: Array<{ item: WallItem; repeat: boolean }> = lane.map((item) => ({ item, repeat: false }));
  for (let i = 0; out.length < n && lane.length > 0; i++) out.push({ item: lane[i % lane.length], repeat: true });
  return out;
}

/** Mur de pochettes qui défile ; un clic lance l'artiste. Bureau : 3 colonnes ; mobile : 2 rangées (CSS). */
export function CoverWall({ items, onPick }: { items: WallItem[]; onPick: (a: Artist) => void }) {
  const lanes = Array.from({ length: LANES }, (_, l) => fill(items.filter((_, i) => i % LANES === l), PER_LANE));
  const pick = (it: WallItem) => onPick({ id: it.artist.id, name: it.artist.name, picture: it.artist.picture, fans: 0 });
  // Le focus clavier fait défiler le cadre jusqu'à la pochette ; à la sortie, on revient au départ de la boucle.
  const resetScroll = (e: FocusEvent<HTMLDivElement>) => {
    if (e.currentTarget.contains(e.relatedTarget as Node | null)) return;
    for (const el of [e.currentTarget, ...e.currentTarget.querySelectorAll<HTMLElement>('.wall-lane')]) {
      el.scrollTop = 0;
      el.scrollLeft = 0;
    }
  };

  return (
    <div className="wall-wrap">
      <div className="wall" onBlur={resetScroll}>
        {lanes.map((lane, l) => (
          <div className="wall-lane" key={l} style={{ '--l': l } as CSSProperties}>
            <div className="wall-track">
              {[0, 1].map((copy) => (
                <ul className="wall-copy" key={copy} aria-hidden={copy === 1 || undefined}>
                  {lane.map(({ item, repeat }, i) => {
                    const decorative = copy === 1 || repeat;
                    return (
                      <li key={i}>
                        <button
                          className="wall-tile"
                          onClick={() => pick(item)}
                          tabIndex={decorative ? -1 : undefined}
                          aria-hidden={(decorative && copy === 0) || undefined}
                          aria-label={`Lancer ${item.artist.name}`}
                        >
                          <img
                            src={item.cover}
                            srcSet={`${item.cover} 250w, ${item.coverBig} 500w`}
                            sizes="(max-width: 860px) 104px, 168px"
                            alt=""
                            loading={copy === 0 && i < 4 ? 'eager' : 'lazy'}
                            decoding="async"
                          />
                          <span className="wall-cap">
                            <em>{item.artist.name}</em>
                            <small>{item.title}</small>
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              ))}
            </div>
          </div>
        ))}
      </div>
      <p className="kicker wall-note">en rotation · choisis une pochette</p>
    </div>
  );
}
