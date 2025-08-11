import { StateCreator } from 'zustand/vanilla';

import { MentionState, initialMentionState } from './initialState';

export interface MentionAction {
  addMentionedUser: (userId: string) => void;
  removeMentionedUser: (userId: string) => void;
  clearMentionedUsers: () => void;
  setMentionedUsers: (users: string[]) => void;
}

export const createMentionSlice: StateCreator<
  MentionState,
  [['zustand/devtools', never]],
  [],
  MentionAction
> = (set) => ({
  ...initialMentionState,

  addMentionedUser: (userId: string) => {
    set((state) => ({
      mentionedUsers: state.mentionedUsers.includes(userId)
        ? state.mentionedUsers
        : [...state.mentionedUsers, userId],
    }), false, 'addMentionedUser');
  },

  removeMentionedUser: (userId: string) => {
    set((state) => ({
      mentionedUsers: state.mentionedUsers.filter((id) => id !== userId),
    }), false, 'removeMentionedUser');
  },

  clearMentionedUsers: () => {
    set({ mentionedUsers: [] }, false, 'clearMentionedUsers');
  },

  setMentionedUsers: (users: string[]) => {
    set({ mentionedUsers: users }, false, 'setMentionedUsers');
  },
});
