import { useCallback, useEffect, useRef, useState } from 'react';
import type { Track } from '../lib/types';

/** Un seul extrait de 30 s joué à la fois. */
export function usePreview() {
  const audio = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState<number | null>(null);

  useEffect(() => {
    const a = new Audio();
    a.volume = 0.8;
    a.addEventListener('ended', () => setPlaying(null));
    audio.current = a;
    return () => {
      a.pause();
      audio.current = null;
    };
  }, []);

  const toggle = useCallback(
    (track: Track) => {
      const a = audio.current;
      if (!a || !track.preview) return;
      if (playing === track.id) {
        a.pause();
        setPlaying(null);
        return;
      }
      a.src = track.preview;
      a.play().then(
        () => setPlaying(track.id),
        () => setPlaying(null),
      );
    },
    [playing],
  );

  const stop = useCallback(() => {
    audio.current?.pause();
    setPlaying(null);
  }, []);

  return { playing, toggle, stop };
}

export type Preview = ReturnType<typeof usePreview>;
