import { useState, useEffect } from 'react';
import { Platform, Dimensions } from 'react-native';

export function useIsWeb(): boolean {
  return Platform.OS === 'web';
}

const SIDEBAR_COLLAPSE_BREAKPOINT = 900;

/** On web, returns window width and updates on resize; on native, returns Dimensions width. */
export function useWindowWidth(): number {
  const [width, setWidth] = useState(() => {
    const { width: w } = Dimensions.get('window');
    return w;
  });

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const update = () => setWidth(typeof window !== 'undefined' ? window.innerWidth : Dimensions.get('window').width);
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  return width;
}

export function useSidebarCollapsedByDefault(): boolean {
  const width = useWindowWidth();
  return width < SIDEBAR_COLLAPSE_BREAKPOINT;
}
