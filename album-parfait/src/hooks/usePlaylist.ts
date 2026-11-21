import { useCallback, useEffect, useRef, useState } from 'react';
import { previewUrl } from '../lib/deezer';

export interface PlaylistTrack {
  id: number;
  title: string;
}

/** Écoute de l'album : enchaîne les extraits de 30 s (lien à jour fourni par /api/audio). */
export function usePlaylist(tracks: Array<PlaylistTrack | null>) {
  const audio = useRef<HTMLAudioElement | null>(null);
  const [index, setIndexState] = useState<number | null>(null);
  const indexRef = useRef<number | null>(null);
  const setIndex = (i: number | null) => {
    indexRef.current = i;
    setIndexState(i);
  };
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const token = useRef(0);
  const tracksRef = useRef(tracks);
  tracksRef.current = tracks;

  const playAt = useCallback(async (i: number) => {
    const a = audio.current;
    const list = tracksRef.current;
    let n = i;
    while (n < list.length && !list[n]) n++;
    if (!a || n >= list.length) {
      a?.pause();
      setIndex(null);
      setPlaying(false);
      return;
    }
    const my = ++token.current;
    setIndex(n);
    setLoading(true);
    setError(null);
    try {
      // src posé tout de suite, dans le geste de l'utilisateur : iOS refuse play() après une attente réseau.
      a.src = previewUrl(list[n]!.id);
      await a.play().catch((err: unknown) => {
        if (err instanceof DOMException && err.name === 'AbortError') throw err;
        if (err instanceof DOMException && err.name === 'NotAllowedError') throw new Error('lecture bloquée par le navigateur : touche « écouter »');
        throw new Error('pas d’extrait pour ce titre');
      });
      if (my !== token.current) return;
      setPlaying(true);
    } catch (e) {
      if (my !== token.current) return;
      setError(e instanceof Error ? e.message : String(e));
      setPlaying(false);
    } finally {
      if (my === token.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const a = new Audio();
    a.preload = 'auto';
    const onTime = () => setProgress(a.duration ? a.currentTime / a.duration : 0);
    a.addEventListener('timeupdate', onTime);
    audio.current = a;
    return () => {
      token.current++;
      a.pause();
      a.removeEventListener('timeupdate', onTime);
      audio.current = null;
    };
  }, []);

  useEffect(() => {
    const a = audio.current;
    if (!a) return;
    const onEnded = () => {
      if (indexRef.current !== null) void playAt(indexRef.current + 1);
    };
    a.addEventListener('ended', onEnded);
    return () => a.removeEventListener('ended', onEnded);
  }, [playAt]);

  const toggle = useCallback(() => {
    const a = audio.current;
    if (!a) return;
    if (index === null) return void playAt(0);
    if (playing) {
      a.pause();
      setPlaying(false);
    } else {
      a.play().then(() => setPlaying(true), () => setPlaying(false));
    }
  }, [index, playing, playAt]);

  const stop = useCallback(() => {
    token.current++;
    audio.current?.pause();
    setPlaying(false);
    setIndex(null);
    setProgress(0);
  }, []);

  return {
    index,
    playing,
    loading,
    error,
    progress,
    toggle,
    stop,
    playAt: (i: number) => void playAt(i),
    next: () => index !== null && void playAt(index + 1),
    prev: () => index !== null && void playAt(Math.max(0, index - 1)),
  };
}

export type Playlist = ReturnType<typeof usePlaylist>;
