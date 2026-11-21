import { useMedia } from './useMedia';

/** true sur écran tactile (doigt) : adapte les consignes et les zones de toucher. */
export const useCoarse = (): boolean => useMedia('(pointer: coarse)');
