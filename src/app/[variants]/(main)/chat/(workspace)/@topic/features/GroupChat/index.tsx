'use client';

import { Users, Settings, MessageSquare, UserPlus } from 'lucide-react';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Flexbox } from 'react-layout-kit';
import { ActionIcon } from '@lobehub/ui';
import { createStyles } from 'antd-style';

import SidebarHeader from '@/components/SidebarHeader';

const useStyles = createStyles(({ css, token }) => ({
  content: css`
    padding: ${token.paddingSM}px;
  `,
  placeholder: css`
    padding: ${token.paddingLG}px;
    text-align: center;
    color: ${token.colorTextSecondary};
    border: 1px dashed ${token.colorBorder};
    border-radius: ${token.borderRadiusLG}px;
    margin: ${token.marginSM}px 0;
  `,
  sectionTitle: css`
    font-size: ${token.fontSizeSM}px;
    font-weight: ${token.fontWeightStrong};
    color: ${token.colorTextSecondary};
    margin: ${token.marginLG}px 0 ${token.marginSM}px 0;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  `,
  memberItem: css`
    padding: ${token.paddingSM}px;
    border-radius: ${token.borderRadius}px;
    border: 1px solid ${token.colorBorderSecondary};
    margin-bottom: ${token.marginXS}px;
    background: ${token.colorFillQuaternary};
  `,
}));

const GroupChat = memo(() => {
  const { t } = useTranslation(['chat', 'common']);
  const { styles } = useStyles();

  return (
    <Flexbox height={'100%'}>
      <SidebarHeader
        actions={[
          <ActionIcon 
            icon={Settings} 
            key="settings" 
            title={t('groupSettings')}
            size={'small'}
          />,
          <ActionIcon 
            icon={UserPlus} 
            key="addMember" 
            title={t('addMember')}
            size={'small'}
          />,
        ]}
        title={
          <Flexbox align={'center'} gap={8} horizontal>
            <Users size={16} />
            {t('groupChat')}
          </Flexbox>
        }
      />
      
      <Flexbox className={styles.content} flex={1} gap={8}>
        {/* Group Members Section */}
        <div>
          <div className={styles.sectionTitle}>
            {t('members')} (3)
          </div>
          
          <div className={styles.memberItem}>
            <Flexbox align={'center'} gap={8} horizontal>
              <div style={{ 
                width: 24, 
                height: 24, 
                borderRadius: '50%', 
                background: '#4CAF50',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: '12px',
                fontWeight: 'bold'
              }}>
                AI
              </div>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 500 }}>Assistant AI</div>
                <div style={{ fontSize: '12px', color: '#666' }}>Online</div>
              </div>
            </Flexbox>
          </div>

          <div className={styles.memberItem}>
            <Flexbox align={'center'} gap={8} horizontal>
              <div style={{ 
                width: 24, 
                height: 24, 
                borderRadius: '50%', 
                background: '#2196F3',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: '12px',
                fontWeight: 'bold'
              }}>
                AI
              </div>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 500 }}>Expert AI</div>
                <div style={{ fontSize: '12px', color: '#666' }}>Online</div>
              </div>
            </Flexbox>
          </div>

          <div className={styles.memberItem}>
            <Flexbox align={'center'} gap={8} horizontal>
              <div style={{ 
                width: 24, 
                height: 24, 
                borderRadius: '50%', 
                background: '#FF9800',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: '12px',
                fontWeight: 'bold'
              }}>
                U
              </div>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 500 }}>You</div>
                <div style={{ fontSize: '12px', color: '#666' }}>Online</div>
              </div>
            </Flexbox>
          </div>
        </div>

        {/* Group Settings Section */}
        <div>
          <div className={styles.sectionTitle}>
            {t('groupSettings')}
          </div>
          
          <div className={styles.placeholder}>
            <MessageSquare size={32} style={{ opacity: 0.4, marginBottom: 8 }} />
            <div style={{ fontSize: '14px' }}>
              {t('groupSettingsPlaceholder')}
            </div>
            <div style={{ fontSize: '12px', marginTop: 4 }}>
              Configure group behavior, response order, and more
            </div>
          </div>
        </div>

        {/* Activity Section */}
        <div>
          <div className={styles.sectionTitle}>
            {t('recentActivity')}
          </div>
          
          <div className={styles.placeholder}>
            <div style={{ fontSize: '14px' }}>
              {t('noRecentActivity')}
            </div>
            <div style={{ fontSize: '12px', marginTop: 4 }}>
              Group activity will appear here
            </div>
          </div>
        </div>
      </Flexbox>
    </Flexbox>
  );
});

GroupChat.displayName = 'GroupChat';

export default GroupChat; 
