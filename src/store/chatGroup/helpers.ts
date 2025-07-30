import { devtools } from 'zustand/middleware';

import { isDev } from '@/utils/env';

export const chatGroupDevtools = (name: string) =>
  devtools<any, any, any, any>(
    (store) => (...a) => {
      const res = store(...a);

      if (isDev && res.internal_dispatchChatGroup) {
        // @ts-ignore
        window.dispatchChatGroup = res.internal_dispatchChatGroup;
      }
      return res;
    },
    { name: `LOBE_CHAT_CHAT_GROUP_STORE_${name}` },
  ); 
