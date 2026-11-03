import { memo, useState } from '../../lib/teact/teact';
import { getActions, withGlobal } from '../../global';

import type { GlobalState } from '../../global/types';

import { pick } from '../../util/iteratees';

import useHistoryBack from '../../hooks/useHistoryBack';
import useLang from '../../hooks/useLang';
import useLastCallback from '../../hooks/useLastCallback';

import PasswordForm from '../common/PasswordForm';
import MonkeyPassword from '../common/PasswordMonkey';
import Button from '../ui/Button';

type StateProps = {
  auth: GlobalState['auth'];
};

const AuthSignupPassword = ({
  auth,
}: StateProps) => {
  const { setAuthPassword, clearAuthErrorKey, returnToAuthPhoneNumber } = getActions();
  const { isLoading, errorKey } = auth;

  const lang = useLang();
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [password, setPassword] = useState<string | undefined>();
  const [isMismatch, setIsMismatch] = useState(false);

  const handleBack = useLastCallback(() => {
    if (password === undefined) {
      returnToAuthPhoneNumber();
      return;
    }

    setPassword(undefined);
    setIsMismatch(false);
  });

  useHistoryBack({
    isActive: true,
    onBack: handleBack,
  });

  const handleClearError = useLastCallback(() => {
    setIsMismatch(false);
    clearAuthErrorKey();
  });

  const handlePasswordSubmit = useLastCallback((value: string) => {
    clearAuthErrorKey();
    setPassword(value);
  });

  const handleRepeatSubmit = useLastCallback((value: string) => {
    if (value !== password) {
      setIsMismatch(true);
      return;
    }

    setAuthPassword({ password: value });
  });

  const isRepeatStep = password !== undefined;
  const error = isMismatch ? lang('ErrorSignupPasswordsDiffer') : errorKey && lang.withRegular(errorKey);

  return (
    <div id="auth-password-form" className="custom-scroll">
      <Button
        size="smaller"
        round
        color="translucent"
        className="auth-close"
        iconName="arrow-left"
        ariaLabel={lang('Back')}
        onClick={handleBack}
      />
      <div className="auth-form">
        <MonkeyPassword isPasswordVisible={isPasswordVisible} />
        <h1>{lang('AuthSignupPasswordTitle')}</h1>
        <p className="note">{lang('AuthSignupPasswordDesc')}</p>
        <PasswordForm
          key={isRepeatStep ? 'repeat' : 'password'}
          error={error}
          placeholder={lang(isRepeatStep ? 'AuthSignupPasswordRepeat' : 'AuthSignupPasswordField')}
          submitLabel={lang('Next')}
          isLoading={isLoading}
          isPasswordVisible={isPasswordVisible}
          onClearError={handleClearError}
          onChangePasswordVisibility={setIsPasswordVisible}
          onSubmit={isRepeatStep ? handleRepeatSubmit : handlePasswordSubmit}
        />
      </div>
    </div>
  );
};

export default memo(withGlobal(
  (global): Complete<StateProps> => (
    pick(global, ['auth'])
  ),
)(AuthSignupPassword));
