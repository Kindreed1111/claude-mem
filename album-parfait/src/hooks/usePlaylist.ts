import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchPreview } from '../lib/deezer';

export interface PlaylistTrack {
  id: number;
  title: string;
}

/** Écoute de l'album : enchaîne les extraits de 30 s, URL d'extrait rafraîchie avant chaque piste. */
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
      const url = await fetchPreview(list[n]!.id);
      if (my !== token.current) return;
      if (!url) throw new Error('pas d’extrait pour ce titre');
      a.src = url;
      await a.play();
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
