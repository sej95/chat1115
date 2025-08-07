import { LobeGroupSession } from '@/types/session';

export type LoadingState = Record<string, boolean>;

export interface State {
  config?: LobeGroupSession['config'];
  id?: string;
  loading?: boolean;
  loadingState?: LoadingState;
  meta?: LobeGroupSession['meta'];
  onConfigChange?: (config: LobeGroupSession['config']) => void;
  onMetaChange?: (meta: LobeGroupSession['meta']) => void;
}

export const initialState: State = {
  loading: true,
  loadingState: {
    meta: false,
    config: false,
  },
};