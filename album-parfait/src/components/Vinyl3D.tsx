import { useEffect, useRef, useState } from 'react';
import type { VinylScene } from '../three/vinylScene';

const reduced = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Scène Three.js chargée à la demande ; sans WebGL, affiche `fallback`. */
export function Vinyl3D({
  mode,
  coverUrl,
  spinning = false,
  className,
  fallback = null,
  label,
}: {
  mode: 'hero' | 'player';
  coverUrl?: string | null;
  spinning?: boolean;
  className?: string;
  fallback?: React.ReactNode;
  label?: string;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const scene = useRef<VinylScene | null>(null);
  const [failed, setFailed] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let disposed = false;
    import('../three/vinylScene')
      .then(({ createVinylScene }) => {
        if (disposed || !canvas.current) return;
        scene.current = createVinylScene(canvas.current, { mode, reducedMotion: reduced() });
        setReady(true);
      })
      .catch(() => setFailed(true));
    return () => {
      disposed = true;
      scene.current?.dispose();
      scene.current = null;
    };
  }, [mode]);

  useEffect(() => {
    if (ready && coverUrl) scene.current?.setCover(coverUrl);
  }, [ready, coverUrl]);

  useEffect(() => {
    if (ready) scene.current?.setSpinning(spinning);
  }, [ready, spinning]);

  if (failed) return <>{fallback}</>;
  return (
    <canvas
      ref={canvas}
      className={`vinyl3d ${ready ? 'is-ready' : ''} ${className ?? ''}`}
      role="img"
      aria-label={label ?? 'Vinyle 3D'}
    />
  );
}
