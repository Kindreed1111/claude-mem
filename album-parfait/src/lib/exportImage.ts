import type { Track } from './types';

const W = 1080;
const H = 1350;
const OLIVE = '#333300';
const CREAM = '#d6d5c5';
const CREAM_DIM = 'rgba(214, 213, 197, 0.6)';
const SERIF = '"Cormorant Garamond", Georgia, serif';
const MONO = '"IBM Plex Mono", monospace';

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('cover introuvable'));
    img.src = src;
  });
}

function fit(ctx: CanvasRenderingContext2D, text: string, max: number): string {
  if (ctx.measureText(text).width <= max) return text;
  let s = text;
  while (s.length > 1 && ctx.measureText(`${s}…`).width > max) s = s.slice(0, -1);
  return `${s.trimEnd()}…`;
}

function grain(ctx: CanvasRenderingContext2D) {
  const img = ctx.getImageData(0, 0, W, H);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (Math.random() - 0.5) * 22;
    d[i] += n;
    d[i + 1] += n;
    d[i + 2] += n;
  }
  ctx.putImageData(img, 0, 0);
}

/** Rendu 1080×1350 du récap. La cover passe par /api/image pour garder le canvas exportable. */
export async function renderAlbumPng(opts: { coverUrl: string; artistName: string; tracks: Array<Track | null> }): Promise<Blob> {
  await Promise.all([
    document.fonts.load(`300 64px ${SERIF}`),
    document.fonts.load(`italic 300 64px ${SERIF}`),
    document.fonts.load(`400 18px ${MONO}`),
  ]).catch(() => undefined);
  const cover = await loadImage(`/api/image?url=${encodeURIComponent(opts.coverUrl)}`);

  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = OLIVE;
  ctx.fillRect(0, 0, W, H);
  const halo = ctx.createRadialGradient(200, 160, 0, 200, 160, 700);
  halo.addColorStop(0, 'rgba(77, 80, 0, 0.6)');
  halo.addColorStop(1, 'rgba(77, 80, 0, 0)');
  ctx.fillStyle = halo;
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = CREAM;
  ctx.textBaseline = 'alphabetic';
  ctx.font = `400 34px ${SERIF}`;
  ctx.fillText('album parfait.', 72, 104);
  ctx.textAlign = 'right';
  ctx.font = `400 16px ${MONO}`;
  ctx.fillStyle = CREAM_DIM;
  ctx.fillText(fit(ctx, opts.artistName.toUpperCase(), 520), W - 72, 100);
  ctx.textAlign = 'left';

  const size = 600;
  const cx = (W - size) / 2;
  const cy = 150;
  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.55)';
  ctx.shadowBlur = 50;
  ctx.shadowOffsetY = 24;
  ctx.drawImage(cover, cx, cy, size, size);
  ctx.restore();

  const colW = (W - 72 * 2 - 48) / 2;
  const top = cy + size + 92;
  opts.tracks.forEach((t, i) => {
    const col = i < 5 ? 0 : 1;
    const row = i % 5;
    const x = 72 + col * (colW + 48);
    const y = top + row * 78;
    ctx.strokeStyle = 'rgba(214, 213, 197, 0.22)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, y + 26);
    ctx.lineTo(x + colW, y + 26);
    ctx.stroke();
    ctx.fillStyle = CREAM_DIM;
    ctx.font = `400 16px ${MONO}`;
    ctx.fillText(String(i + 1).padStart(2, '0'), x, y);
    ctx.fillStyle = CREAM;
    ctx.font = `400 32px ${SERIF}`;
    ctx.fillText(fit(ctx, t?.title ?? '—', colW - 52), x + 48, y + 2);
  });

  // Étiquette Parental Advisory
  const bx = W - 72 - 104;
  const by = H - 72 - 64;
  ctx.fillStyle = '#0b0b0b';
  ctx.fillRect(bx, by, 104, 64);
  ctx.strokeStyle = '#f4f4f0';
  ctx.lineWidth = 3;
  ctx.strokeRect(bx, by, 104, 64);
  ctx.fillStyle = '#f4f4f0';
  ctx.fillRect(bx + 3, by + 20, 98, 24);
  ctx.textAlign = 'center';
  ctx.font = '900 10px Arial, sans-serif';
  ctx.fillText('PARENTAL', bx + 52, by + 15);
  ctx.fillText('EXPLICIT CONTENT', bx + 52, by + 58);
  ctx.fillStyle = '#0b0b0b';
  ctx.font = '900 18px Arial, sans-serif';
  ctx.fillText('ADVISORY', bx + 52, by + 39);

  grain(ctx);

  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('export impossible'))), 'image/png'),
  );
}
