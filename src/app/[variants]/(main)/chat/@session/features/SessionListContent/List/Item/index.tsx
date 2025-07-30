import { ModelTag } from '@lobehub/icons';
import { memo, useMemo, useState } from 'react';
import { Flexbox } from 'react-layout-kit';
import { shallow } from 'zustand/shallow';

import { useAgentStore } from '@/store/agent';
import { agentSelectors } from '@/store/agent/selectors';
import { useChatStore } from '@/store/chat';
import { chatSelectors } from '@/store/chat/selectors';
import { useSessionStore } from '@/store/session';
import { sessionHelpers } from '@/store/session/helpers';
import { sessionMetaSelectors, sessionSelectors } from '@/store/session/selectors';
import { LobeGroupSession } from '@/types/session';

import ListItem from '../../ListItem';
import CreateGroupModal from '../../Modals/CreateGroupModal';
import Actions from './Actions';

interface SessionItemProps {
  id: string;
}

const SessionItem = memo<SessionItemProps>(({ id }) => {
  const [open, setOpen] = useState(false);
  const [createGroupModalOpen, setCreateGroupModalOpen] = useState(false);
  const [defaultModel] = useAgentStore((s) => [agentSelectors.inboxAgentModel(s)]);

  const [active] = useSessionStore((s) => [s.activeId === id]);
  const [loading] = useChatStore((s) => [chatSelectors.isAIGenerating(s) && id === s.activeId]);

  const [
    pin,
    title,
    description,
    avatar,
    avatarBackground,
    updateAt,
    members,
    model,
    group,
    sessionType,
  ] = useSessionStore((s) => {
    const session = sessionSelectors.getSessionById(id)(s);
    const meta = session.meta;

    return [
      sessionHelpers.getSessionPinned(session),
      sessionMetaSelectors.getTitle(meta),
      sessionMetaSelectors.getDescription(meta),
      sessionMetaSelectors.getAvatar(meta),
      meta.backgroundColor,
      (session as LobeGroupSession).members,
      session?.updatedAt,
      session.type === 'agent' ? (session as any).model : undefined,
      session?.group,
      session.type,
    ];
  });

  console.log(members);

  const showModel = sessionType === 'agent' && model && model !== defaultModel;

  const actions = useMemo(
    () => (
      <Actions
        group={group}
        id={id}
        openCreateGroupModal={() => setCreateGroupModalOpen(true)}
        setOpen={setOpen}
      />
    ),
    [group, id],
  );

  const addon = useMemo(
    () =>
      !showModel ? undefined : (
        <Flexbox gap={4} horizontal style={{ flexWrap: 'wrap' }}>
          <ModelTag model={model} />
        </Flexbox>
      ),
    [showModel, model],
  );

  const sessionAvatar = sessionType === 'group' ? avatar || '👥' : avatar;
  const sessionTitle = sessionType === 'group' ? 'Group Chat' : title;

  return (
    <>
      <ListItem
        actions={actions}
        active={active}
        addon={addon}
        avatar={sessionAvatar}
        avatarBackground={avatarBackground}
        date={updateAt?.valueOf()}
        description={description}
        key={id}
        loading={loading}
        pin={pin}
        showAction={open}
        styles={{
          container: {
            gap: 12,
          },
          content: {
            gap: 6,
            maskImage: `linear-gradient(90deg, #000 90%, transparent)`,
          },
        }}
        title={sessionTitle}
        type={sessionType}
      />
      <CreateGroupModal
        id={id}
        onCancel={() => setCreateGroupModalOpen(false)}
        open={createGroupModalOpen}
      />
    </>
  );
}, shallow);

export default SessionItem;
