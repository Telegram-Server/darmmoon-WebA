import { memo, useState } from '../../lib/teact/teact';
import { getActions, withGlobal } from '../../global';

import type { GlobalState } from '../../global/types';

import { selectIsTelesrvCodeLoginDisabled } from '../../global/selectors';
import { pick } from '../../util/iteratees';

import useHistoryBack from '../../hooks/useHistoryBack';
import useLang from '../../hooks/useLang';
import useLastCallback from '../../hooks/useLastCallback';

import Icon from '../common/icons/Icon';
import PasswordForm from '../common/PasswordForm';
import MonkeyPassword from '../common/PasswordMonkey';
import Button from '../ui/Button';

type StateProps = {
  auth: GlobalState['auth'];
  isCodeLoginDisabled: boolean;
};

const AuthLoginPassword = ({
  auth,
  isCodeLoginDisabled,
}: StateProps) => {
  const {
    setAuthPassword, clearAuthErrorKey, returnToAuthPhoneNumber, switchAuthToCode,
  } = getActions();
  const { phoneNumber, isLoading, errorKey } = auth;

  const lang = useLang();
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  useHistoryBack({
    isActive: true,
    onBack: returnToAuthPhoneNumber,
  });

  const handleReturnToAuthPhoneNumber = useLastCallback(() => {
    returnToAuthPhoneNumber();
  });

  const handleSwitchToCode = useLastCallback(() => {
    switchAuthToCode();
  });

  const handleSubmit = useLastCallback((password: string) => {
    setAuthPassword({ password });
  });

  return (
    <div id="auth-password-form" className="custom-scroll">
      <div className="auth-form">
        <MonkeyPassword isPasswordVisible={isPasswordVisible} />
        <h1>
          {phoneNumber}
          <div
            className="auth-number-edit div-button"
            onClick={handleReturnToAuthPhoneNumber}
            role="button"
            tabIndex={0}
            title={lang('WrongNumber')}
            aria-label={lang('WrongNumber')}
          >
            <Icon name="edit" />
          </div>
        </h1>
        <p className="note">{lang('AuthLoginPasswordDesc')}</p>
        <PasswordForm
          error={errorKey && lang.withRegular(errorKey)}
          placeholder={lang('TelesrvLoginPassword')}
          isLoading={isLoading}
          isPasswordVisible={isPasswordVisible}
          onClearError={clearAuthErrorKey}
          onChangePasswordVisibility={setIsPasswordVisible}
          onSubmit={handleSubmit}
        />
        {!isCodeLoginDisabled && (
          <Button className="auth-button" isText disabled={isLoading} onClick={handleSwitchToCode}>
            {lang('TelesrvLoginUseCode')}
          </Button>
        )}
      </div>
    </div>
  );
};

export default memo(withGlobal(
  (global): Complete<StateProps> => ({
    ...pick(global, ['auth']),
    isCodeLoginDisabled: selectIsTelesrvCodeLoginDisabled(global),
  }),
)(AuthLoginPassword));
