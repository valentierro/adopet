import { useState, useCallback } from 'react';

export type ListViewMode = 'list' | 'grid';

type Options = { persist?: boolean };

export function useListViewMode(
  _storageKey: string,
  options: Options = {},
): { viewMode: ListViewMode; setViewMode: (mode: ListViewMode) => void } {
  const [viewMode, setViewModeState] = useState<ListViewMode>('list');

  const setViewMode = useCallback((mode: ListViewMode) => {
    setViewModeState(mode);
    // TODO: if options.persist, save to AsyncStorage
  }, []);

  return { viewMode, setViewMode };
}
