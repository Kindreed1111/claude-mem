import { useMediaQuery } from './useMediaQuery';

/** true sur écran tactile (doigt) : adapte les consignes et les zones de toucher. */
export const useCoarse = (): boolean => useMediaQuery('(pointer: coarse)');
