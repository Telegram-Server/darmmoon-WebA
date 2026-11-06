import { memo } from '../../lib/teact/teact';
import { getActions, withGlobal } from '../../global';

import type { GlobalState } from '../../global/types';

import { selectIsTelesrvCodeLoginDisabled } from '../../global/selectors';
import { selectSharedSettings } from '../../global/selectors/sharedState';
import { IS_MOBILE } from '../../util/browser/windowEnvironment';
import { loadAndChangeLanguage } from '../../util/localization';
import { getSuggestedLanguage } from './helpers/getSuggestedLanguage';

import useFlag from '../../hooks/useFlag';
import useLang from '../../hooks/useLang';
import useLangString from '../../hooks/useLangString';
import useLastCallback from '../../hooks/useLastCallback';

import Button from '../ui/Button';

type StateProps = {
  auth: GlobalState['auth'];
  language?: string;
  isPasswordLoginAvailable?: boolean;
  isCodeLoginDisabled: boolean;
};

const AuthGuest = ({
  auth,
  language,
  isPasswordLoginAvailable,
  isCodeLoginDisabled,
}: StateProps) => {
  const {
    signInAsGuest, goToAuthPhoneNumber, goToAuthQrCode, setSharedSettingOption,
  } = getActions();

  const lang = useLang();

  const {
    state, isLoading: isSigningIn, isLoadingQrCode, errorKey,
  } = auth;

  const suggestedLanguage = getSuggestedLanguage();
  const continueText = useLangString('AuthContinueOnThisLanguage', suggestedLanguage);
  const [isLanguageLoading, markIsLanguageLoading, unmarkIsLanguageLoading] = useFlag();

  // The guest page is shown over either wait, and the guest sign-in can start from both
  const isAuthReady = state === 'authorizationStateWaitPhoneNumber' || state === 'authorizationStateWaitQrCode';
  // The server turns code login off only while password login is on
  const canUseCode = !isCodeLoginDisabled;

  const handleContinue = useLastCallback(() => {
    if (isSigningIn || !isAuthReady) return;

    signInAsGuest();
  });

  const handleUseCode = useLastCallback(() => {
    goToAuthPhoneNumber({ isPasswordLogin: false });
  });

  const handleUsePassword = useLastCallback(() => {
    goToAuthPhoneNumber({ isPasswordLogin: true });
  });

  const handleGoToAuthQrCode = useLastCallback(() => {
    goToAuthQrCode();
  });

  const handleLangChange = useLastCallback(async () => {
    markIsLanguageLoading();

    try {
      if (await loadAndChangeLanguage(suggestedLanguage)) {
        setSharedSettingOption({ language: suggestedLanguage });
      }
    } finally {
      unmarkIsLanguageLoading();
    }
  });

  return (
    <div id="auth-guest-form" className="custom-scroll">
      <div className="auth-form">
        <div id="logo" />
        <h1>{lang('AuthTitle')}</h1>
        <p className="note">{lang('TelesrvGuestText')}</p>
        <Button
          className="auth-button"
          ripple
          isLoading={isSigningIn || !isAuthReady}
          onClick={handleContinue}
        >
          {lang('TelesrvGuestContinue')}
        </Button>
        {errorKey && <p className="auth-guest-error">{lang.withRegular(errorKey)}</p>}
        {canUseCode && (
          <Button className="auth-button" isText disabled={isSigningIn} onClick={handleUseCode}>
            {lang('TelesrvGuestUseCode')}
          </Button>
        )}
        {isPasswordLoginAvailable && (
          <Button className="auth-button" isText disabled={isSigningIn} onClick={handleUsePassword}>
            {lang('TelesrvGuestUsePassword')}
          </Button>
        )}
        {!IS_MOBILE && (
          <Button
            className="auth-button"
            isText
            disabled={isSigningIn || !isAuthReady}
            isLoading={isLoadingQrCode}
            onClick={handleGoToAuthQrCode}
          >
            {lang('LoginQRLogin')}
          </Button>
        )}
        {suggestedLanguage && suggestedLanguage !== language && continueText && (
          <Button
            className="auth-button"
            isText
            isLoading={isLanguageLoading}
            onClick={handleLangChange}
          >
            {continueText}
          </Button>
        )}
      </div>
    </div>
  );
};

export default memo(withGlobal(
  (global): Complete<StateProps> => {
    const { auth, appConfig } = global;
    const { language } = selectSharedSettings(global);

    return {
      auth,
      language,
      isPasswordLoginAvailable: appConfig.isPasswordLoginAvailable,
      isCodeLoginDisabled: selectIsTelesrvCodeLoginDisabled(global),
    };
  },
)(AuthGuest));
