import { useState } from 'react';
import { kindForSlot } from '../lib/album';
import { compareAlbums } from '../lib/compare';
import type { SharedAlbum } from '../lib/share';
import { buildShareUrl, shareOrCopy } from '../lib/shareLink';

const pad = (n: number) => String(n).padStart(2, '0');

/** Écran de duel : mon album face à celui qui m'a défié. */
export function Compare({ mine, theirs, onSeeMine }: { mine: SharedAlbum; theirs: SharedAlbum; onSeeMine: () => void }) {
  const r = compareAlbums(mine, theirs);
  const [copied, setCopied] = useState(false);
  const verdict =
    r.score >= 9 ? 'âmes sœurs musicales.' : r.score >= 6 ? 'vous vous comprenez.' : r.score >= 3 ? 'des goûts qui se croisent.' : 'deux mondes opposés.';

  return (
    <section className="compare">
      <p className="kicker">le duel · {mine.artist.name}</p>
      <h1 className="headline">
        <span className="score">{r.score}</span>
        <span className="over"> / {r.total}</span>
      </h1>
      <p className="verdict">{verdict}</p>
      <p className="muted">
        cover {r.cover ? 'identique' : 'différente'} · {r.slots.filter((s) => s.same).length} piste(s) au même numéro
        {r.sharedElsewhere ? ` · ${r.sharedElsewhere} en commun ailleurs` : ''}
      </p>

      <div className="vs-covers">
        <figure>
          <img src={mine.cover.url} alt="" />
          <figcaption>toi · {mine.cover.title}</figcaption>
        </figure>
        <span className="vs">vs</span>
        <figure>
          <img src={theirs.cover.url} alt="" />
          <figcaption>ton ami · {theirs.cover.title}</figcaption>
        </figure>
      </div>

      <ol className="vs-list">
        {r.slots.map((s, i) => (
          <li key={s.slot} className={s.same ? 'same' : ''} style={{ '--i': i } as React.CSSProperties}>
            <span className="n">{pad(s.slot)}</span>
            <span className="a">{s.mine ?? '—'}</span>
            <span className="mark">{s.same ? '=' : '≠'}</span>
            <span className="b">{s.theirs ?? '—'}</span>
            <span className="tag">{kindForSlot(s.slot) === 'free' ? '' : kindForSlot(s.slot)}</span>
          </li>
        ))}
      </ol>

      <div className="actions">
        <button className="cta" onClick={onSeeMine}>
          voir mon album
        </button>
        <button
          className="ghost"
          onClick={async () => {
            const res = await shareOrCopy(buildShareUrl('defi', mine), `Défi album parfait : ${mine.artist.name}`);
            if (res === 'copied') setCopied(true);
          }}
        >
          {copied ? 'lien copié' : 'renvoyer le défi'}
        </button>
      </div>
    </section>
  );
}
