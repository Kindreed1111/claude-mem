import { useState } from 'react';
import { kindForSlot, type AlbumState } from '../lib/album';
import { renderAlbumPng } from '../lib/exportImage';
import type { Artist, Project } from '../lib/types';

const slug = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

export function Recap({ artist, cover, album, onEdit, onRestart }: { artist: Artist; cover: Project; album: AlbumState; onEdit: () => void; onRestart: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const tracks = Array.from({ length: 10 }, (_, i) => album.slots[i + 1] ?? null);

  const download = async () => {
    setBusy(true);
    setError(null);
    try {
      const blob = await renderAlbumPng({ coverUrl: cover.cover, artistName: artist.name, tracks });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `album-parfait-${slug(artist.name) || 'artiste'}.png`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="recap">
      <img className="recap-cover" src={cover.cover} alt={`Cover : ${cover.title}`} />
      <div>
        <p className="kicker">l’album parfait de</p>
        <h1 className="headline">{artist.name}</h1>
        <ol>
          {tracks.map((t, i) => {
            const kind = kindForSlot(i + 1);
            return (
              <li key={i}>
                <span className="slot-n" style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--cream-dim)' }}>
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span>{t?.title ?? '—'}</span>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--cream-dim)' }}>{kind === 'free' ? '' : kind}</span>
              </li>
            );
          })}
        </ol>
        <div className="actions">
          <button className="cta" onClick={download} disabled={busy}>
            {busy ? 'pressage…' : 'télécharger l’image'}
          </button>
          <button className="ghost" onClick={onEdit}>
            modifier
          </button>
          <button className="ghost" onClick={onRestart}>
            recommencer
          </button>
        </div>
        {error && <p className="muted">Export impossible : {error}</p>}
      </div>
    </section>
  );
}
