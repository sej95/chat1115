'use client';

import { ActionIcon, Block, Grid, Text } from '@lobehub/ui';
import { createStyles } from 'antd-style';
import { RefreshCw } from 'lucide-react';
import { memo, useState } from 'react';
import { Flexbox } from 'react-layout-kit';

const useStyles = createStyles(({ css, token, responsive }) => ({
  card: css`
    position: relative;
    overflow: hidden;
    height: 100%;
    min-height: 110px;
    padding: 16px;
    border-radius: ${token.borderRadiusLG}px;
    background: ${token.colorBgContainer};
    cursor: pointer;
    transition: all ${token.motionDurationMid};

    &:hover {
      border-color: ${token.colorPrimary};
      box-shadow: 0 2px 8px ${token.colorPrimaryBg};
    }

    ${responsive.mobile} {
      min-height: 72px;
    }
  `,
  cardDesc: css`
    margin-block: 0 !important;
    color: ${token.colorTextDescription};
  `,
  cardTitle: css`
    margin-block: 0 !important;
    font-size: 16px;
    font-weight: bold;
  `,
  emoji: css`
    font-size: 24px;
    width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: ${token.colorFillTertiary};
    border-radius: ${token.borderRadius}px;
    flex: none;
  `,
  title: css`
    color: ${token.colorTextDescription};
  `,
}));

interface GroupActivity {
  id: string;
  title: string;
  description: string;
  emoji: string;
}

const GROUP_ACTIVITIES: GroupActivity[] = [
  {
    id: 'brainstorm',
    title: 'Brain Storm',
    description: 'Collaborative idea generation and creative problem solving with multiple perspectives',
    emoji: '🧠',
  },
  {
    id: 'werewolf',
    title: 'Werewolf Game',
    description: 'Social deduction game where players use strategy and discussion to find the werewolves',
    emoji: '🐺',
  },
  {
    id: 'mock-un',
    title: 'Mock UN',
    description: 'Simulate United Nations debates and diplomatic negotiations on global issues',
    emoji: '🌍',
  },
  {
    id: 'design-review',
    title: 'Design Review',
    description: 'Collaborative feedback session for design concepts, prototypes, or creative work',
    emoji: '🎨',
  },
  {
    id: 'code-review',
    title: 'Code Review',
    description: 'Technical discussion and peer review of code changes and implementations',
    emoji: '💻',
  },
  {
    id: 'planning-poker',
    title: 'Planning Poker',
    description: 'Agile estimation technique using cards to estimate project tasks and effort',
    emoji: '🃏',
  },
  {
    id: 'debate-club',
    title: 'Debate Club',
    description: 'Structured discussion and argumentation on various topics and current events',
    emoji: '⚖️',
  },
  {
    id: 'study-group',
    title: 'Study Group',
    description: 'Collaborative learning session to discuss concepts and solve problems together',
    emoji: '📚',
  },
];

const GroupUsageSuggest = memo<{ mobile?: boolean }>(({ mobile }) => {
  const [currentSet, setCurrentSet] = useState(0);
  const { styles } = useStyles();

  const itemsPerPage = mobile ? 2 : 4;
  const totalSets = Math.ceil(GROUP_ACTIVITIES.length / itemsPerPage);

  const currentActivities = GROUP_ACTIVITIES.slice(
    currentSet * itemsPerPage,
    (currentSet + 1) * itemsPerPage
  );

  const handleRefresh = () => {
    setCurrentSet((prev) => (prev + 1) % totalSets);
  };

  return (
    <Flexbox gap={8} width={'100%'}>
      <Flexbox align={'center'} horizontal justify={'space-between'}>
        <div className={styles.title}>
          Popular Group Activities:
        </div>
        <ActionIcon
          icon={RefreshCw}
          onClick={handleRefresh}
          size={{ blockSize: 24, size: 14 }}
          title="Show more activities"
        />
      </Flexbox>
      <Grid gap={8} rows={2}>
        {currentActivities.map((activity) => (
          <Block
            className={styles.card}
            clickable
            gap={12}
            horizontal
            key={activity.id}
            variant={'outlined'}
            onClick={() => {
              // TODO: Implement activity creation logic
              console.log('Selected activity:', activity.title);
            }}
          >
            <div className={styles.emoji}>{activity.emoji}</div>
            <Flexbox gap={2} style={{ overflow: 'hidden', width: '100%' }}>
              <Text className={styles.cardTitle} ellipsis={{ rows: 1 }}>
                {activity.title}
              </Text>
              <Text className={styles.cardDesc} ellipsis={{ rows: mobile ? 1 : 2 }}>
                {activity.description}
              </Text>
            </Flexbox>
          </Block>
        ))}
      </Grid>
    </Flexbox>
  );
});

export default GroupUsageSuggest;