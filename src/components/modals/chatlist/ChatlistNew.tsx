import {
  memo, useCallback, useMemo, useState,
} from '../../../lib/teact/teact';
import { getActions, getGlobal } from '../../../global';

import type { ApiChatlistInviteNew } from '../../../api/types';

import { selectIsTelesrvJoinRestricted } from '../../../global/selectors';
import buildClassName from '../../../util/buildClassName';

import useLang from '../../../hooks/useLang';

import PeerPicker from '../../common/pickers/PeerPicker';
import Badge from '../../ui/Badge';
import Button from '../../ui/Button';

import styles from './ChatlistModal.module.scss';

type OwnProps = {
  invite: ApiChatlistInviteNew;
};

const ChatlistNew = ({ invite }: OwnProps) => {
  const { closeChatlistModal, joinChatlistInvite } = getActions();

  const lang = useLang();

  const restrictedIds = useMemo(() => {
    const global = getGlobal();
    return invite.peerIds.filter((id) => selectIsTelesrvJoinRestricted(global, id));
  }, [invite.peerIds]);

  const selectableIds = useMemo(() => {
    return invite.peerIds.filter((id) => !restrictedIds.includes(id));
  }, [invite.peerIds, restrictedIds]);

  const [selectedPeerIds, setSelectedPeerIds] = useState<string[]>(selectableIds);

  const joinedIds = useMemo(() => {
    const chatsById = getGlobal().chats.byId;
    return invite.peerIds.filter((id) => !chatsById[id].isNotJoined);
  }, [invite.peerIds]);

  const selectedCount = selectedPeerIds.length - joinedIds.length;

  const badgeText = selectedCount ? selectedCount.toString() : undefined;

  const handleButtonClick = useCallback(() => {
    closeChatlistModal();

    joinChatlistInvite({
      invite,
      peerIds: selectedPeerIds,
    });
  }, [invite, selectedPeerIds]);

  const handleSelectionToggle = useCallback(() => {
    const areAllSelected = selectedPeerIds.length === selectableIds.length;
    setSelectedPeerIds(areAllSelected ? joinedIds : selectableIds);
  }, [selectableIds, joinedIds, selectedPeerIds.length]);

  return (
    <div className={styles.content}>
      <div className={styles.description}>
        {lang('FolderLinkSubtitleNew')}
      </div>
      <div className={buildClassName(styles.pickerWrapper, 'custom-scroll')}>
        <div className={styles.pickerHeader}>
          <div className={styles.pickerHeaderInfo}>
            {lang('FolderLinkHeaderChatsJoin', { count: lang.number(selectedCount) }, { pluralValue: selectedCount })}
          </div>
          <div
            className={styles.selectionToggle}
            role="button"
            tabIndex={0}
            onClick={handleSelectionToggle}
          >
            {selectedPeerIds.length === selectableIds.length ? lang('DeselectAll') : lang('ContextMenuItemSelectAll')}
          </div>
        </div>
        <PeerPicker
          itemIds={invite.peerIds}
          lockedSelectedIds={joinedIds}
          lockedUnselectedIds={restrictedIds}
          lockedUnselectedSubtitle={lang('TelesrvJoinRestricted')}
          onSelectedIdsChange={setSelectedPeerIds}
          selectedIds={selectedPeerIds}
          allowMultiple
          withStatus
          itemInputType="checkbox"
        />
      </div>
      <Button
        onClick={handleButtonClick}
        disabled={!selectedPeerIds.length}
      >
        <div className={styles.buttonText}>
          {lang('FolderLinkAddFolder')}
          <Badge className={styles.buttonBadge} text={badgeText} isAlternateColor />
        </div>
      </Button>
    </div>
  );
};

export default memo(ChatlistNew);
