import { useEffect, useState } from 'react';

/** true sur écran tactile (doigt) : adapte les consignes et les zones de toucher. */
export function useCoarse(): boolean {
  const query = '(pointer: coarse)';
  const [coarse, setCoarse] = useState(() => typeof matchMedia === 'function' && matchMedia(query).matches);
  useEffect(() => {
    if (typeof matchMedia !== 'function') return;
    const mq = matchMedia(query);
    const on = () => setCoarse(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return coarse;
}
