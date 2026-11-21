import { useCallback, useEffect, useRef, useState } from 'react';
import type { Project } from '../lib/types';

const TYPE_LABEL: Record<Project['recordType'], string> = { album: 'album', ep: 'ep', single: 'single', compile: 'compilation' };
const VISIBLE = 6;

/** Position d'une pochette selon son écart au centre (o, en nombre de pochettes, peut être fractionnaire). */
function sleeveStyle(o: number): React.CSSProperties {
  const a = Math.abs(o);
  const sign = Math.sign(o);
  const x = a <= 1 ? o * 0.62 : sign * (0.62 + (a - 1) * 0.26);
  const rot = -Math.max(-1, Math.min(1, o)) * 52;
  const z = -Math.min(a, 1) * 0.45 - Math.max(0, a - 1) * 0.08;
  return {
    transform: `translateX(calc(var(--s) * ${x})) translateZ(calc(var(--s) * ${z})) rotateY(${rot}deg)`,
    zIndex: 100 - Math.round(a * 10),
    opacity: a > VISIBLE - 1 ? Math.max(0, VISIBLE - a) : 1,
    filter: `brightness(${1 - Math.min(a, 3) * 0.16})`,
  };
}

export function CoverCarousel({ covers, onChoose }: { covers: Project[]; onChoose: (p: Project) => void }) {
  const [index, setIndex] = useState(0);
  const [drag, setDrag] = useState<number | null>(null);
  const stage = useRef<HTMLDivElement>(null);
  const dragStart = useRef<{ x: number; moved: boolean } | null>(null);
  const wheelAcc = useRef(0);
  const last = covers.length - 1;
  const clamp = useCallback((i: number) => Math.max(0, Math.min(last, i)), [last]);
  const current = covers[index];

  // Molette / trackpad (non passif pour bloquer le scroll de la page).
  useEffect(() => {
    const el = stage.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      wheelAcc.current += Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      if (Math.abs(wheelAcc.current) >= 60) {
        const step = Math.sign(wheelAcc.current);
        wheelAcc.current = 0;
        setIndex((i) => clamp(i + step));
      }
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [clamp]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      if (e.key === 'ArrowRight') setIndex((i) => clamp(i + 1));
      else if (e.key === 'ArrowLeft') setIndex((i) => clamp(i - 1));
      else if (e.key === 'Enter' && current) onChoose(current);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [clamp, current, onChoose]);

  const sleeveWidth = () => stage.current?.querySelector<HTMLElement>('.sleeve')?.offsetWidth ?? 300;

  const onPointerDown = (e: React.PointerEvent) => {
    dragStart.current = { x: e.clientX, moved: false };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const start = dragStart.current;
    if (!start) return;
    const dx = e.clientX - start.x;
    if (Math.abs(dx) > 4) start.moved = true;
    if (start.moved) setDrag(dx / (sleeveWidth() * 0.62));
  };
  const onPointerUp = (e: React.PointerEvent) => {
    const start = dragStart.current;
    dragStart.current = null;
    if (start?.moved && drag !== null) {
      setIndex((i) => clamp(Math.round(i - drag)));
      setDrag(null);
      return;
    }
    setDrag(null);
    const hit = (e.target as HTMLElement).closest<HTMLElement>('[data-i]');
    if (hit) setIndex(Number(hit.dataset.i));
  };

  if (covers.length === 0) {
    return (
      <section className="covers">
        <p className="muted" style={{ textAlign: 'center' }}>
          Aucun projet de cet artiste n’est disponible sur Deezer.
        </p>
      </section>
    );
  }

  const pos = index - (drag ?? 0);
  return (
    <section className="covers">
      <div style={{ textAlign: 'center' }}>
        <p className="kicker">face b · la pochette</p>
      </div>
      <div
        ref={stage}
        className={`carousel${drag !== null ? ' dragging' : ''}`}
        tabIndex={0}
        aria-roledescription="carrousel"
        aria-label="Covers de l’artiste"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={() => {
          dragStart.current = null;
          setDrag(null);
        }}
      >
        {covers.map((c, i) => {
          const o = i - pos;
          if (Math.abs(o) > VISIBLE) return null;
          return (
            <div key={c.id} className="sleeve" data-i={i} style={sleeveStyle(o)} aria-hidden={i !== index}>
              <img src={c.cover} alt={i === index ? `Cover de ${c.title}` : ''} draggable={false} />
            </div>
          );
        })}
      </div>
      <div className="caption" aria-live="polite">
        <h2>{current.title}</h2>
        <span className="meta">
          {current.releaseDate.slice(0, 4)} · {TYPE_LABEL[current.recordType]} · {String(index + 1).padStart(2, '0')} /{' '}
          {String(covers.length).padStart(2, '0')}
        </span>
      </div>
      {covers.length > 1 && (
        <input
          className="scrub"
          type="range"
          min={0}
          max={last}
          value={index}
          onChange={(e) => setIndex(Number(e.target.value))}
          aria-label="Parcourir les covers"
        />
      )}
      <div className="actions">
        <button className="ghost" onClick={() => setIndex((i) => clamp(i - 1))} disabled={index === 0} aria-label="Cover précédente">
          ←
        </button>
        <button className="cta" onClick={() => onChoose(current)}>
          choisir cette cover
        </button>
        <button className="ghost" onClick={() => setIndex((i) => clamp(i + 1))} disabled={index === last} aria-label="Cover suivante">
          →
        </button>
      </div>
    </section>
  );
}
