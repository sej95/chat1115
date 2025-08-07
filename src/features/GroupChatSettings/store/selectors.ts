import { State } from './initialState';

export const selectors = {
  config: (s: State) => s.config,
  meta: (s: State) => s.meta,
  loading: (s: State) => s.loading,
  loadingState: (s: State) => s.loadingState,
  isConfigLoading: (s: State) => s.loadingState?.config || false,
  isMetaLoading: (s: State) => s.loadingState?.meta || false,
};