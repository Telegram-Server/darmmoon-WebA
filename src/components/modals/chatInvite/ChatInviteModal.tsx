import { memo, useCallback, useMemo, useRef } from '../../../lib/teact/teact';
import { getActions, getGlobal } from '../../../global';

import type { GlobalState, TabState } from '../../../global/types';

import { getCustomPeerFromInvite, getUserFullName } from '../../../global/helpers';
import { selectTelesrvCanJoinByType, selectUser } from '../../../global/selectors';
import buildClassName from '../../../util/buildClassName';

import useSelector from '../../../hooks/data/useSelector';
import useHorizontalScroll from '../../../hooks/useHorizontalScroll';
import useLang from '../../../hooks/useLang';
import useLastCallback from '../../../hooks/useLastCallback';
import usePrevious from '../../../hooks/usePrevious';

import Avatar from '../../common/Avatar';
import FullNameTitle from '../../common/FullNameTitle';
import PeerBadge from '../../common/PeerBadge';
import Button from '../../ui/Button';
import Modal from '../../ui/Modal';

import styles from './ChatInviteModal.module.scss';

export type OwnProps = {
  modal: TabState['chatInviteModal'];
};

const ChatInviteModal = ({ modal }: OwnProps) => {
  const { acceptChatInvite, closeChatInviteModal } = getActions();
  const participantsRef = useRef<HTMLDivElement>();

  const lang = useLang();

  const prevModal = usePrevious(modal);
  const { hash, inviteInfo } = modal || prevModal || {};
  const {
    about, isBroadcast, participantIds, participantsCount = 0, photo, isRequestNeeded,
  } = inviteInfo || {};

  const canJoinSelector = useCallback((global: GlobalState) => (
    selectTelesrvCanJoinByType(global, Boolean(isBroadcast))
  ), [isBroadcast]);
  const canJoin = useSelector(canJoinSelector);

  const handleClose = useLastCallback(() => {
    closeChatInviteModal();
  });

  const handleAccept = useLastCallback(() => {
    acceptChatInvite({ hash: hash!, isRequestNeeded, isBroadcast });
    handleClose();
  });

  const acceptLangKey = isBroadcast ? 'ProfileJoinChannel' : 'JoinGroup';
  const requestToJoinLangKey = isBroadcast ? 'MemberRequestsRequestToJoinChannel'
    : 'MemberRequestsRequestToJoinGroup';

  const customPeer = useMemo(() => {
    if (!inviteInfo) return undefined;

    return getCustomPeerFromInvite(inviteInfo);
  }, [inviteInfo]);

  const participants = useMemo(() => {
    if (!participantIds) {
      return undefined;
    }

    const global = getGlobal();
    return participantIds.map((id) => selectUser(global, id)).filter(Boolean);
  }, [participantIds]);

  useHorizontalScroll(participantsRef, !modal || !participants);

  return (
    <Modal
      isOpen={Boolean(modal)}
      contentClassName={styles.content}
      isSlim
      onClose={handleClose}
      onEnter={canJoin ? handleAccept : handleClose}
    >
      {customPeer && <Avatar size="giant" photo={photo} peer={customPeer} withVideo />}
      {customPeer && <FullNameTitle className={styles.title} peer={customPeer} />}
      {about && <p className={styles.about}>{about}</p>}
      <p className={styles.participantCount}>
        {lang(
          isBroadcast ? 'Subscribers' : 'NMembers',
          { count: participantsCount },
          { pluralValue: participantsCount },
        )}
      </p>
      {participants && (
        <div ref={participantsRef} className={buildClassName(styles.participants, 'no-scrollbar')}>
          {participants.map((participant) => (
            <PeerBadge className={styles.participant} peer={participant} text={getUserFullName(lang, participant)} />
          ))}
        </div>
      )}
      {!canJoin && <p className={styles.about}>{lang('TelesrvJoinRestricted')}</p>}
      <div className={buildClassName('dialog-buttons', styles.buttons)}>
        {canJoin && (
          <Button isText className="confirm-dialog-button" onClick={handleAccept}>
            {lang(isRequestNeeded ? requestToJoinLangKey : acceptLangKey)}
          </Button>
        )}
        <Button isText className="confirm-dialog-button" onClick={handleClose}>
          {lang('Cancel')}
        </Button>
      </div>
    </Modal>
  );
};

export default memo(ChatInviteModal);
