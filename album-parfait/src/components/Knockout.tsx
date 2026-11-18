import { useEffect, useMemo, useRef, useState } from 'react';
import type { Preview } from '../hooks/usePreview';
import { bracketWinner, currentPair, duelsLeft, pickWinner, startBracket } from '../lib/knockout';
import type { Project, Track } from '../lib/types';

/** Mode 1v1 : 8 sons tirés au hasard, on garde le meilleur à chaque duel. */
export function Knockout({
  title,
  slot,
  candidates,
  projects,
  preview,
  onWinner,
  onQuit,
}: {
  title: React.ReactNode;
  slot: number;
  candidates: Track[];
  projects: Map<number, Project>;
  preview: Preview;
  onWinner: (t: Track) => void;
  onQuit: () => void;
}) {
  const initial = useMemo(() => startBracket(candidates, 8), [candidates]);
  const [bracket, setBracket] = useState(initial);
  const [picked, setPicked] = useState<number | null>(null);
  const pair = currentPair(bracket);
  const winner = bracketWinner(bracket);
  // Les callbacks changent à chaque rendu du parent (progression des crédits) : on passe par des refs.
  const latest = useRef({ onWinner, onQuit, preview });
  latest.current = { onWinner, onQuit, preview };

  useEffect(() => {
    if (!winner) return;
    latest.current.preview.stop();
    const t = setTimeout(() => latest.current.onWinner(winner), 1100);
    return () => clearTimeout(t);
  }, [winner]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') latest.current.onQuit();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const choose = (t: Track) => {
    if (picked !== null) return;
    setPicked(t.id);
    preview.stop();
    setTimeout(() => {
      setBracket((b) => pickWinner(b, t.id));
      setPicked(null);
    }, 420);
  };

  const left = duelsLeft(bracket);
  const done = bracket.size - 1 - left;

  return (
    <div className="knockout">
      <div className="picker-head">
        <p className="kicker">
          piste {String(slot).padStart(2, '0')} · mode 1v1 · duel {Math.min(done + 1, bracket.size - 1)} / {bracket.size - 1}
        </p>
        <h3>{title}</h3>
        <p>garde le meilleur des deux. échap pour quitter.</p>
      </div>
      {winner ? (
        <div className="ko-winner">
          <img src={projects.get(winner.projectId)?.cover} alt="" />
          <p className="kicker">vainqueur</p>
          <h4>{winner.title}</h4>
        </div>
      ) : (
        pair && (
          <div className="ko-pair" key={`${pair[0].id}-${pair[1].id}`}>
            {pair.map((t, i) => {
              const p = projects.get(t.projectId);
              const playing = preview.playing === t.id;
              return (
                <div key={t.id} className={`ko-card ${picked === t.id ? 'won' : picked !== null ? 'lost' : ''}`} style={{ '--i': i } as React.CSSProperties}>
                  <button className="ko-pick" onClick={() => choose(t)} aria-label={`Garder ${t.title}`}>
                    <img src={p?.cover} alt="" />
                    <span className="ko-title">{t.title}</span>
                    <span className="ko-meta">
                      {p?.title} · {p?.releaseDate.slice(0, 4)}
                    </span>
                  </button>
                  <button className="play" aria-pressed={playing} disabled={!t.preview} onClick={() => preview.toggle(t)} aria-label={`Écouter ${t.title}`}>
                    {playing ? '■' : '▶'}
                  </button>
                </div>
              );
            })}
            <span className="ko-vs" aria-hidden>
              vs
            </span>
          </div>
        )
      )}
      <button className="ghost" onClick={onQuit}>
        quitter le 1v1
      </button>
    </div>
  );
}
