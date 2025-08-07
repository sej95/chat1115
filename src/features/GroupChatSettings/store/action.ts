import type { PartialDeep } from 'type-fest';
import { StateCreator } from 'zustand/vanilla';

import { LobeGroupSession } from '@/types/session';
import { setNamespace } from '@/utils/storeDebug';

import { LoadingState } from './initialState';
import { State, initialState } from './initialState';

export interface PublicAction {
  /**
   * Update group configuration
   */
  updateGroupConfig: (config: Partial<LobeGroupSession['config']>) => Promise<void>;
  /**
   * Update group metadata
   */
  updateGroupMeta: (meta: Partial<LobeGroupSession['meta']>) => Promise<void>;
  /**
   * Reset group configuration to default
   */
  resetGroupConfig: () => Promise<void>;
  /**
   * Reset group metadata to default
   */
  resetGroupMeta: () => Promise<void>;
}

export interface Action extends PublicAction {
  setGroupConfig: (config: PartialDeep<LobeGroupSession['config']>) => Promise<void>;
  setGroupMeta: (meta: Partial<LobeGroupSession['meta']>) => Promise<void>;
  
  /**
   * Update loading state
   * @param key - LoadingState key
   * @param value - Loading state value
   */
  updateLoadingState: (key: keyof LoadingState, value: boolean) => void;
}

export type Store = Action & State;

const t = setNamespace('GroupChatSettings');

export const store: StateCreator<Store, [['zustand/devtools', never]]> = (set, get) => ({
  ...initialState,

  resetGroupConfig: async () => {
    const { onConfigChange } = get();
    
    const defaultConfig = {};
    
    await onConfigChange?.(defaultConfig);
    set({ config: defaultConfig }, false, t('resetGroupConfig'));
  },

  resetGroupMeta: async () => {
    const { onMetaChange } = get();
    
    const defaultMeta = {};
    
    await onMetaChange?.(defaultMeta);
    set({ meta: defaultMeta }, false, t('resetGroupMeta'));
  },

  setGroupConfig: async (config) => {
    const { onConfigChange } = get();
    const currentConfig = get().config || {};
    const newConfig = { ...currentConfig, ...config };
    
    await onConfigChange?.(newConfig);
    set({ config: newConfig }, false, t('setGroupConfig'));
  },

  setGroupMeta: async (meta) => {
    const { onMetaChange } = get();
    const currentMeta = get().meta || {};
    const newMeta = { ...currentMeta, ...meta };
    
    await onMetaChange?.(newMeta);
    set({ meta: newMeta }, false, t('setGroupMeta'));
  },

  updateGroupConfig: async (config) => {
    await get().setGroupConfig(config);
  },

  updateGroupMeta: async (meta) => {
    await get().setGroupMeta(meta);
  },

  updateLoadingState: (key, value) => {
    const { loadingState } = get();
    set(
      {
        loadingState: {
          ...loadingState,
          [key]: value,
        },
      },
      false,
      t('updateLoadingState', { [key]: value }),
    );
  },
});