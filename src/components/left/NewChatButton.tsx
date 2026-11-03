import {
  useCallback, useEffect, useMemo, useState,
} from '../../lib/teact/teact';
import { getActions } from '../../global';

import type { GlobalState } from '../../global/types';

import { selectTelesrvCanCreate } from '../../global/selectors';
import buildClassName from '../../util/buildClassName';

import useSelector from '../../hooks/data/useSelector';
import useLang from '../../hooks/useLang';

import Icon from '../common/icons/Icon';
import Button from '../ui/Button';
import Menu from '../ui/Menu';
import MenuItem from '../ui/MenuItem';

import './NewChatButton.scss';

type OwnProps = {
  isShown: boolean;
  onNewPrivateChat: () => void;
  onNewChannel: () => void;
  onNewGroup: () => void;
  isAccountFrozen?: boolean;
};

function selectCanCreateChannel(global: GlobalState) {
  return selectTelesrvCanCreate(global, true);
}

function selectCanCreateGroup(global: GlobalState) {
  return selectTelesrvCanCreate(global, false);
}

const NewChatButton = ({
  isShown,
  onNewPrivateChat,
  onNewChannel,
  onNewGroup,
  isAccountFrozen,
}: OwnProps) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { openFrozenAccountModal } = getActions();

  const shouldRender = isShown || isMenuOpen;

  useEffect(() => {
    if (!shouldRender) {
      setIsMenuOpen(false);
    }
  }, [shouldRender]);

  const lang = useLang();
  const canCreateChannel = useSelector(selectCanCreateChannel);
  const canCreateGroup = useSelector(selectCanCreateGroup);

  const fabClassName = buildClassName(
    'NewChatButton',
    shouldRender && 'revealed',
    isMenuOpen && 'menu-is-open',
  );

  const toggleIsMenuOpen = useCallback(() => {
    if (isAccountFrozen) {
      openFrozenAccountModal();
      return;
    }
    setIsMenuOpen(!isMenuOpen);
  }, [isMenuOpen, isAccountFrozen]);

  const handleClose = useCallback(() => {
    setIsMenuOpen(false);
  }, []);

  const menuItems = useMemo(() => (
    <>
      {canCreateChannel && <MenuItem icon="channel" onClick={onNewChannel}>{lang('NewChannel')}</MenuItem>}
      {canCreateGroup && <MenuItem icon="group" onClick={onNewGroup}>{lang('NewGroup')}</MenuItem>}
      <MenuItem icon="user" onClick={onNewPrivateChat}>{lang('NewMessageTitle')}</MenuItem>
    </>
  ), [lang, canCreateChannel, canCreateGroup, onNewChannel, onNewGroup, onNewPrivateChat]);

  return (
    <div className={fabClassName} dir={lang.isRtl ? 'rtl' : undefined}>
      <Button
        round
        color="primary"
        className={isMenuOpen ? 'active' : ''}
        onClick={toggleIsMenuOpen}
        ariaLabel={lang(isMenuOpen ? 'Close' : 'NewMessageTitle')}
        tabIndex={-1}
      >
        <Icon name="new-chat-filled" />
        <Icon name="close" />
      </Button>
      <Menu
        isOpen={isMenuOpen}
        positionX={lang.isRtl ? 'left' : 'right'}
        positionY="bottom"
        autoClose
        onClose={handleClose}
      >
        {menuItems}
      </Menu>
    </div>
  );
};

export default NewChatButton;
