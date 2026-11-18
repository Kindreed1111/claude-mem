import { useEffect, useState } from 'react';
import { usePlaylist } from '../hooks/usePlaylist';
import { kindForSlot } from '../lib/album';
import { EXPORT_FORMATS, renderAlbumPng, type ExportFormat } from '../lib/exportImage';
import type { SharedAlbum } from '../lib/share';
import { buildShareUrl, shareOrCopy } from '../lib/shareLink';
import { Vinyl3D } from './Vinyl3D';

const slug = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

const pad = (n: number) => String(n).padStart(2, '0');

interface Props {
  album: SharedAlbum;
  mode: 'own' | 'shared';
  podium?: React.ReactNode;
  onEditTracks?: () => void;
  onChangeCover?: () => void;
  onMakeYours?: () => void;
  onRestart: () => void;
}

export function Recap({ album, mode, podium, onEditTracks, onChangeCover, onMakeYours, onRestart }: Props) {
  const [format, setFormat] = useState<ExportFormat>('portrait');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [manualLink, setManualLink] = useState<string | null>(null);
  const player = usePlaylist(album.tracks);
  const current = player.index !== null ? album.tracks[player.index] : null;

  useEffect(() => () => player.stop(), []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2400);
    return () => clearTimeout(t);
  }, [toast]);

  const download = async () => {
    setBusy(true);
    setError(null);
    try {
      const blob = await renderAlbumPng({ coverUrl: album.cover.url, artistName: album.artist.name, tracks: album.tracks, format });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `album-parfait-${slug(album.artist.name) || 'artiste'}-${format}.png`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const share = async (kind: 'album' | 'defi') => {
    const url = buildShareUrl(kind, album);
    const title = kind === 'defi' ? `Défi album parfait : ${album.artist.name}` : `L’album parfait de ${album.artist.name}`;
    const r = await shareOrCopy(url, title);
    if (r === 'copied') setToast(kind === 'defi' ? 'lien du défi copié' : 'lien copié');
    if (r === 'manual') setManualLink(url);
  };

  return (
    <section className="recap">
      <div className="recap-stage">
        <Vinyl3D
          coverUrl={album.cover.url}
          spinning={player.playing}
          label={`Vinyle : ${album.cover.title}`}
          fallback={<img className="recap-cover" src={album.cover.url} alt={`Cover : ${album.cover.title}`} />}
        />
        <div className="player">
          <button className="ghost" onClick={player.prev} disabled={player.index === null} aria-label="Piste précédente">
            ⏮
          </button>
          <button className="cta play-all" onClick={player.toggle} aria-pressed={player.playing}>
            {player.loading ? 'chargement…' : player.playing ? 'pause' : player.index === null ? 'écouter l’album' : 'reprendre'}
          </button>
          <button className="ghost" onClick={player.next} disabled={player.index === null} aria-label="Piste suivante">
            ⏭
          </button>
        </div>
        <div className="now" aria-live="polite">
          {current ? (
            <>
              <span className="n">{pad((player.index ?? 0) + 1)}</span> {current.title} <span className="muted">· extrait 30 s</span>
            </>
          ) : (
            <span className="muted">10 extraits de 30 s, enchaînés.</span>
          )}
          <div className="meter">
            <i style={{ width: `${player.progress * 100}%` }} />
          </div>
          {player.error && <p className="muted">Lecture impossible : {player.error}</p>}
        </div>
      </div>

      <div className="recap-body">
        <p className="kicker">{mode === 'shared' ? 'album partagé · ' : ''}l’album parfait de</p>
        <h1 className="headline">{album.artist.name}</h1>
        <p className="muted cover-name">cover : {album.cover.title}</p>
        <ol className="recap-list">
          {album.tracks.map((t, i) => {
            const kind = kindForSlot(i + 1);
            return (
              <li key={i} className={player.index === i ? 'is-playing' : ''} style={{ '--i': i } as React.CSSProperties}>
                <button className="n" onClick={() => player.playAt(i)} aria-label={`Écouter la piste ${i + 1}`}>
                  <span className="num">{pad(i + 1)}</span>
                  <span className="ico">▶</span>
                </button>
                {t ? (
                  <a href={`https://www.deezer.com/track/${t.id}`} target="_blank" rel="noreferrer" title="Écouter sur Deezer">
                    {t.title} <span className="ext">↗</span>
                  </a>
                ) : (
                  <span>—</span>
                )}
                <span className="tag">{kind === 'free' ? '' : kind}</span>
              </li>
            );
          })}
        </ol>

        <div className="export">
          <div className="seg" role="radiogroup" aria-label="Format d’image">
            {(Object.keys(EXPORT_FORMATS) as ExportFormat[]).map((f) => (
              <button key={f} role="radio" aria-checked={format === f} className={format === f ? 'on' : ''} onClick={() => setFormat(f)}>
                {EXPORT_FORMATS[f].label}
              </button>
            ))}
          </div>
          <button className="cta" onClick={download} disabled={busy}>
            {busy ? 'pressage…' : 'télécharger l’image'}
          </button>
        </div>

        <div className="actions">
          <button className="ghost" onClick={() => share('album')}>
            partager le lien
          </button>
          <button className="ghost" onClick={() => share('defi')}>
            défier un ami
          </button>
          {onEditTracks && (
            <button className="ghost" onClick={onEditTracks}>
              modifier les pistes
            </button>
          )}
          {onChangeCover && (
            <button className="ghost" onClick={onChangeCover}>
              changer la cover
            </button>
          )}
          {onMakeYours && (
            <button className="ghost" onClick={onMakeYours}>
              composer le mien
            </button>
          )}
          <button className="ghost" onClick={onRestart}>
            recommencer
          </button>
        </div>
        {manualLink && (
          <input className="filter" readOnly value={manualLink} onFocus={(e) => e.currentTarget.select()} aria-label="Lien à copier" />
        )}
        {error && <p className="muted">Export impossible : {error}</p>}
        {podium}
      </div>
      {toast && (
        <div className="toast" role="status">
          {toast}
        </div>
      )}
    </section>
  );
}
