import { memo } from '../../lib/teact/teact';
import { getActions, withGlobal } from '../../global';

import { SettingsScreens } from '../../types';

import { selectTabState } from '../../global/selectors';

import useTimeout from '../../hooks/schedulers/useTimeout';
import useFlag from '../../hooks/useFlag';
import useLang from '../../hooks/useLang';
import useLastCallback from '../../hooks/useLastCallback';

import ConfirmDialog from '../ui/ConfirmDialog';

type StateProps = {
  isPending?: boolean;
};

const SHOW_DELAY_MS = 1000;

// After a guest sign-in: the guest account can only be recovered from the same network for a while
const GuestPasswordReminder = ({
  isPending,
}: StateProps) => {
  const { closeGuestPasswordReminder, openSettingsScreen } = getActions();

  const lang = useLang();
  const [isOpen, open, close] = useFlag();

  useTimeout(() => {
    open();
    closeGuestPasswordReminder();
  }, isPending ? SHOW_DELAY_MS : undefined);

  const handleSetPassword = useLastCallback(() => {
    close();
    openSettingsScreen({ screen: SettingsScreens.TelesrvLoginPassword });
  });

  return (
    <ConfirmDialog
      isOpen={isOpen}
      title={lang('TelesrvGuestPasswordTitle')}
      text={lang('TelesrvGuestPasswordText')}
      confirmLabel={lang('TelesrvGuestPasswordSet')}
      cancelLabel={lang('TelesrvGuestPasswordLater')}
      confirmHandler={handleSetPassword}
      onClose={close}
    />
  );
};

export default memo(withGlobal(
  (global): Complete<StateProps> => {
    return {
      isPending: selectTabState(global).isGuestPasswordReminderPending,
    };
  },
)(GuestPasswordReminder));
