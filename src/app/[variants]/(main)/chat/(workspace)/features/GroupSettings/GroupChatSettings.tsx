'use client';

import { Form, FormItem, SliderWithInput } from '@lobehub/ui';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Flexbox } from 'react-layout-kit';

import { useChatGroupStore } from '@/store/chatGroup';
import { chatGroupSelectors } from '@/store/chatGroup/selectors';
import { useSessionStore } from '@/store/session';

const GroupChatSettings = memo(() => {
  const { t } = useTranslation(['setting', 'common']);
  
  const activeGroupId = useSessionStore((s) => s.activeId);
  const currentGroup = useChatGroupStore((s) =>
    activeGroupId ? chatGroupSelectors.getGroupById(activeGroupId)(s) : null,
  );
  
  const updateGroup = useChatGroupStore((s) => s.updateGroup);

  // Convert response order to numerical value for slider
  const getResponseSpeedValue = (responseOrder?: 'sequential' | 'random' | 'smart') => {
    switch (responseOrder) {
      case 'sequential':
        return 1;
      case 'smart':
        return 2;
      case 'random':
        return 3;
      default:
        return 2; // default to smart
    }
  };

  // Convert numerical value back to response order
  const getResponseOrder = (value: number): 'sequential' | 'random' | 'smart' => {
    switch (value) {
      case 1:
        return 'sequential';
      case 2:
        return 'smart';
      case 3:
        return 'random';
      default:
        return 'smart';
    }
  };

  const responseSpeedValue = getResponseSpeedValue(currentGroup?.config?.responseOrder);

  const handleResponseSpeedChange = async (value: number) => {
    if (!activeGroupId) return;
    
    const responseOrder = getResponseOrder(value);
    const newConfig = {
      ...currentGroup?.config,
      responseOrder,
    };
    
    await updateGroup(activeGroupId, { config: newConfig });
  };

  const responseSpeedMarks = {
    1: 'Sequential',
    2: 'Smart',
    3: 'Random',
  };

  return (
    <Flexbox gap={24} paddingInline={24}>
      <Form>
        <FormItem 
          desc="Choose how agents respond in group conversations"
          label="Response Speed" 
          minWidth={undefined}
        >
          <SliderWithInput
            marks={responseSpeedMarks}
            max={3}
            min={1}
            onChange={handleResponseSpeedChange}
            step={1}
            value={responseSpeedValue}
          />
        </FormItem>
        
        <div style={{ fontSize: '12px', color: '#666', marginTop: '8px' }}>
          <strong>Sequential:</strong> Agents respond one by one in order<br />
          <strong>Smart:</strong> AI determines the best agent to respond<br />
          <strong>Random:</strong> Agents respond in random order
        </div>
      </Form>
    </Flexbox>
  );
});

GroupChatSettings.displayName = 'GroupChatSettings';

export default GroupChatSettings; 
