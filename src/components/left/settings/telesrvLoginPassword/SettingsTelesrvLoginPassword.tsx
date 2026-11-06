import {
  memo, useEffect, useState,
} from '../../../../lib/teact/teact';
import { getActions, withGlobal } from '../../../../global';

import type { TelesrvLoginPasswordMode } from '../../../../types';
import type { RegularLangKey } from '../../../../types/language';
import { SettingsScreens } from '../../../../types';

import { LOCAL_TGS_URLS } from '../../../common/helpers/animatedAssets';

import useFlag from '../../../../hooks/useFlag';
import useHistoryBack from '../../../../hooks/useHistoryBack';
import useLang from '../../../../hooks/useLang';
import useLastCallback from '../../../../hooks/useLastCallback';

import AnimatedIconWithPreview from '../../../common/AnimatedIconWithPreview';
import PasswordForm from '../../../common/PasswordForm';
import PasswordMonkey from '../../../common/PasswordMonkey';
import Island from '../../../gili/layout/Island';
import ConfirmDialog from '../../../ui/ConfirmDialog';
import ListItem from '../../../ui/ListItem';

import styles from './SettingsTelesrvLoginPassword.module.scss';

import lockPreviewUrl from '../../../../assets/lock.png';

export type TelesrvLoginPasswordDraft = {
  currentPassword?: string;
  newPassword?: string;
};

type OwnProps = {
  currentScreen: SettingsScreens;
  shownScreen: SettingsScreens;
  draft: TelesrvLoginPasswordDraft;
  isActive?: boolean;
  onDraftChange: (draft: TelesrvLoginPasswordDraft) => void;
  onReset: () => void;
};

type StateProps = {
  hasPassword?: boolean;
  isLoading?: boolean;
  isCurrentPasswordInvalid?: boolean;
};

type FormStep = {
  mode: TelesrvLoginPasswordMode;
  placeholderKey: RegularLangKey;
  submitKey: RegularLangKey;
};

const LOCK_ICON_SIZE = 160;
const EMPTY_DRAFT: TelesrvLoginPasswordDraft = {};

// Screens that keep a screen active while they are shown on top of it
const NESTED_SCREENS: Partial<Record<SettingsScreens, SettingsScreens[]>> = {
  [SettingsScreens.TelesrvLoginPassword]: [
    SettingsScreens.TelesrvLoginPasswordSetConfirm,
    SettingsScreens.TelesrvLoginPasswordChangeCurrent,
    SettingsScreens.TelesrvLoginPasswordChangeNew,
    SettingsScreens.TelesrvLoginPasswordChangeConfirm,
    SettingsScreens.TelesrvLoginPasswordRemove,
    SettingsScreens.TelesrvLoginPasswordResetNew,
    SettingsScreens.TelesrvLoginPasswordResetConfirm,
  ],
  [SettingsScreens.TelesrvLoginPasswordChangeCurrent]: [
    SettingsScreens.TelesrvLoginPasswordChangeNew,
    SettingsScreens.TelesrvLoginPasswordChangeConfirm,
  ],
  [SettingsScreens.TelesrvLoginPasswordChangeNew]: [SettingsScreens.TelesrvLoginPasswordChangeConfirm],
  [SettingsScreens.TelesrvLoginPasswordResetNew]: [SettingsScreens.TelesrvLoginPasswordResetConfirm],
};

const INFO_KEYS = {
  set: 'TelesrvLoginPasswordSetInfo',
  change: 'TelesrvLoginPasswordChangeInfo',
  remove: 'TelesrvLoginPasswordRemoveInfo',
  reset: 'TelesrvLoginPasswordResetInfo',
} as const satisfies Record<TelesrvLoginPasswordMode, RegularLangKey>;

const SettingsTelesrvLoginPassword = ({
  currentScreen,
  shownScreen,
  draft,
  isActive,
  hasPassword,
  isLoading,
  isCurrentPasswordInvalid,
  onDraftChange,
  onReset,
}: OwnProps & StateProps) => {
  const {
    loadTelesrvLoginPassword,
    updateTelesrvLoginPassword,
    clearTelesrvLoginPasswordError,
    openSettingsScreen,
  } = getActions();

  const lang = useLang();

  const [error, setError] = useState<string | undefined>();
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isForgotDialogOpen, openForgotDialog, closeForgotDialog] = useFlag();

  const isEntryScreen = currentScreen === SettingsScreens.TelesrvLoginPassword;
  const isCurrentPasswordScreen = currentScreen === SettingsScreens.TelesrvLoginPasswordChangeCurrent
    || currentScreen === SettingsScreens.TelesrvLoginPasswordRemove;
  const isScreenActive = isActive || Boolean(NESTED_SCREENS[currentScreen]?.includes(shownScreen));

  useHistoryBack({
    isActive: isScreenActive,
    onBack: onReset,
  });

  // The state is unknown when the screen is opened directly or after a change from another session
  useEffect(() => {
    if (isEntryScreen && isActive && hasPassword === undefined) {
      loadTelesrvLoginPassword({ shouldReportErrors: true });
    }
  }, [isEntryScreen, isActive, hasPassword]);

  useEffect(() => {
    if (isEntryScreen && shownScreen === SettingsScreens.TelesrvLoginPassword) {
      onDraftChange(EMPTY_DRAFT);
    }
  }, [isEntryScreen, shownScreen, onDraftChange]);

  const handleClearError = useLastCallback(() => {
    setError(undefined);
    if (isCurrentPasswordInvalid) {
      clearTelesrvLoginPasswordError();
    }
  });

  const openFlowScreen = useLastCallback((screen: SettingsScreens) => {
    clearTelesrvLoginPasswordError();
    openSettingsScreen({ screen });
  });

  const handleResetConfirm = useLastCallback(() => {
    closeForgotDialog();
    openFlowScreen(SettingsScreens.TelesrvLoginPasswordResetNew);
  });

  const handleNewPassword = useLastCallback((value: string) => {
    onDraftChange({ newPassword: value });
    openSettingsScreen({
      screen: currentScreen === SettingsScreens.TelesrvLoginPasswordResetNew
        ? SettingsScreens.TelesrvLoginPasswordResetConfirm
        : SettingsScreens.TelesrvLoginPasswordSetConfirm,
    });
  });

  const handleChangeCurrent = useLastCallback((value: string) => {
    onDraftChange({ currentPassword: value });
    openSettingsScreen({ screen: SettingsScreens.TelesrvLoginPasswordChangeNew });
  });

  const handleChangeNew = useLastCallback((value: string) => {
    if (value === draft.currentPassword) {
      setError(lang('TelesrvLoginPasswordSame'));
      return;
    }

    onDraftChange({ ...draft, newPassword: value });
    openSettingsScreen({ screen: SettingsScreens.TelesrvLoginPasswordChangeConfirm });
  });

  const handleConfirm = useLastCallback((mode: TelesrvLoginPasswordMode, value: string) => {
    if (value !== draft.newPassword) {
      setError(lang('ErrorSignupPasswordsDiffer'));
      return;
    }

    updateTelesrvLoginPassword({ mode, currentPassword: draft.currentPassword, newPassword: value });
  });

  const handleRemove = useLastCallback((value: string) => {
    updateTelesrvLoginPassword({ mode: 'remove', currentPassword: value });
  });

  function renderLockHeader(title: string, description: string) {
    return (
      <div className="settings-content-header no-border">
        <AnimatedIconWithPreview
          tgsUrl={LOCAL_TGS_URLS.Lock}
          previewUrl={lockPreviewUrl}
          size={LOCK_ICON_SIZE}
          className="settings-content-icon"
        />
        <h3 className={styles.title} dir="auto">{title}</h3>
        <p className="settings-item-description mb-3" dir="auto">{description}</p>
      </div>
    );
  }

  function renderOverview() {
    return (
      <div className="settings-content two-fa custom-scroll">
        {renderLockHeader(lang('TelesrvLoginPasswordOnTitle'), lang('TelesrvLoginPasswordOnInfo'))}
        <Island>
          <ListItem icon="edit" onClick={() => openFlowScreen(SettingsScreens.TelesrvLoginPasswordChangeCurrent)}>
            {lang('TelesrvLoginPasswordChange')}
          </ListItem>
          <ListItem icon="lock-crossed" onClick={() => openFlowScreen(SettingsScreens.TelesrvLoginPasswordRemove)}>
            {lang('TelesrvLoginPasswordRemove')}
          </ListItem>
          <ListItem icon="help" onClick={openForgotDialog}>
            {lang('TelesrvLoginPasswordForgot')}
          </ListItem>
        </Island>
        <ConfirmDialog
          isOpen={isForgotDialogOpen}
          title={lang('TelesrvLoginPasswordForgot')}
          text={lang('TelesrvLoginPasswordForgotInfo')}
          confirmLabel={lang('TelesrvLoginPasswordReset')}
          confirmHandler={handleResetConfirm}
          onClose={closeForgotDialog}
        />
      </div>
    );
  }

  function renderForm(
    { mode, placeholderKey, submitKey }: FormStep,
    onSubmit: (value: string) => void,
    title?: string,
  ) {
    const formError = isCurrentPasswordScreen && isCurrentPasswordInvalid ? lang('ErrorIncorrectPassword') : error;

    return (
      <div className="settings-content password-form custom-scroll">
        <div className="settings-content-header no-border">
          <PasswordMonkey isBig isPasswordVisible={isPasswordVisible} />
          {title && <h3 className={styles.title} dir="auto">{title}</h3>}
          <p className="settings-item-description mb-3" dir="auto">{lang(INFO_KEYS[mode])}</p>
        </div>

        <Island>
          <div className="settings-input">
            <PasswordForm
              shouldShowSubmit
              error={formError}
              placeholder={lang(placeholderKey)}
              submitLabel={lang(submitKey)}
              shouldDisablePasswordManager={!isCurrentPasswordScreen}
              isLoading={isLoading}
              isPasswordVisible={isPasswordVisible}
              shouldResetValue={isScreenActive}
              onClearError={handleClearError}
              onChangePasswordVisibility={setIsPasswordVisible}
              onSubmit={onSubmit}
            />
          </div>
        </Island>
      </div>
    );
  }

  switch (currentScreen) {
    case SettingsScreens.TelesrvLoginPassword:
      if (hasPassword === undefined) {
        return (
          <div className="settings-content two-fa custom-scroll">
            {renderLockHeader(lang('TelesrvLoginPassword'), lang('Loading'))}
          </div>
        );
      }

      if (hasPassword) return renderOverview();

      return renderForm(
        { mode: 'set', placeholderKey: 'TelesrvLoginPasswordNew', submitKey: 'Next' },
        handleNewPassword,
        lang('TelesrvLoginPasswordSetTitle'),
      );

    case SettingsScreens.TelesrvLoginPasswordSetConfirm:
      return renderForm(
        { mode: 'set', placeholderKey: 'PleaseReEnterPassword', submitKey: 'TelesrvLoginPasswordSet' },
        (value) => handleConfirm('set', value),
      );

    case SettingsScreens.TelesrvLoginPasswordChangeCurrent:
      return renderForm(
        { mode: 'change', placeholderKey: 'TelesrvLoginPasswordCurrent', submitKey: 'Next' },
        handleChangeCurrent,
      );

    case SettingsScreens.TelesrvLoginPasswordChangeNew:
      return renderForm(
        { mode: 'change', placeholderKey: 'TelesrvLoginPasswordNew', submitKey: 'Next' },
        handleChangeNew,
      );

    case SettingsScreens.TelesrvLoginPasswordChangeConfirm:
      return renderForm(
        { mode: 'change', placeholderKey: 'PleaseReEnterPassword', submitKey: 'TelesrvLoginPasswordChange' },
        (value) => handleConfirm('change', value),
      );

    case SettingsScreens.TelesrvLoginPasswordRemove:
      return renderForm(
        { mode: 'remove', placeholderKey: 'TelesrvLoginPasswordCurrent', submitKey: 'TelesrvLoginPasswordRemove' },
        handleRemove,
      );

    case SettingsScreens.TelesrvLoginPasswordResetNew:
      return renderForm(
        { mode: 'reset', placeholderKey: 'TelesrvLoginPasswordNew', submitKey: 'Next' },
        handleNewPassword,
      );

    case SettingsScreens.TelesrvLoginPasswordResetConfirm:
      return renderForm(
        { mode: 'reset', placeholderKey: 'PleaseReEnterPassword', submitKey: 'TelesrvLoginPasswordReset' },
        (value) => handleConfirm('reset', value),
      );

    default:
      return undefined;
  }
};

export default memo(withGlobal<OwnProps>(
  (global): Complete<StateProps> => {
    const { hasPassword, isLoading, isCurrentPasswordInvalid } = global.telesrvLoginPassword;

    return {
      hasPassword,
      isLoading,
      isCurrentPasswordInvalid,
    };
  },
)(SettingsTelesrvLoginPassword));
