import type { TelesrvLoginPasswordMode } from '../../../types';
import type { RegularLangKey } from '../../../types/language';
import type { AdvancedLangFnParameters, RegularLangFnParameters } from '../../../util/localization';
import type { ActionReturnType } from '../../types';
import { SettingsScreens } from '../../../types';

import { getCurrentTabId } from '../../../util/establishMultitabRole';
import { callApi } from '../../../api/gramjs';
import {
  addActionHandler, getActions, getGlobal, setGlobal,
} from '../../index';
import { replaceSettings, updateTelesrvLoginPassword, updateTwoFaSettings } from '../../reducers';
import { updateTabState } from '../../reducers/tabs';

type TelesrvLoginPasswordError = {
  errorMessage?: string;
  messageKey: RegularLangFnParameters;
} | undefined;

const TELESRV_LOGIN_PASSWORD_DONE_KEYS = {
  set: 'TelesrvLoginPasswordSetDone',
  change: 'TelesrvLoginPasswordChangeDone',
  remove: 'TelesrvLoginPasswordRemoveDone',
  reset: 'TelesrvLoginPasswordResetDone',
} as const satisfies Record<TelesrvLoginPasswordMode, RegularLangKey>;

addActionHandler('loadPasswordInfo', async (global): Promise<void> => {
  const result = await callApi('getPasswordInfo');
  if (!result) {
    return;
  }

  global = getGlobal();
  global = replaceSettings(global, { hasPassword: result.hasPassword });
  global = updateTwoFaSettings(global, { hint: result.hint });
  setGlobal(global);
});

addActionHandler('checkPassword', async (global, actions, payload): Promise<void> => {
  const { currentPassword, onSuccess } = payload;

  global = updateTwoFaSettings(global, { isLoading: true, errorKey: undefined });
  setGlobal(global);

  const isSuccess = await callApi('checkPassword', currentPassword);

  global = getGlobal();
  global = updateTwoFaSettings(global, { isLoading: false });
  setGlobal(global);

  if (isSuccess) {
    onSuccess();
  }
});

addActionHandler('clearPassword', async (global, actions, payload): Promise<void> => {
  const { currentPassword, onSuccess } = payload;

  global = updateTwoFaSettings(global, { isLoading: true, errorKey: undefined });
  setGlobal(global);

  const isSuccess = await callApi('clearPassword', currentPassword);

  global = getGlobal();
  global = updateTwoFaSettings(global, { isLoading: false });
  setGlobal(global);

  if (isSuccess) {
    onSuccess();
  }
});

addActionHandler('updatePassword', async (global, actions, payload): Promise<void> => {
  const {
    currentPassword, password, hint, email, onSuccess,
  } = payload;

  global = updateTwoFaSettings(global, { isLoading: true, errorKey: undefined });
  setGlobal(global);

  const isSuccess = await callApi('updatePassword', currentPassword, password, hint, email);

  global = getGlobal();
  global = updateTwoFaSettings(global, { isLoading: false });
  setGlobal(global);

  if (isSuccess) {
    onSuccess();
  }
});

addActionHandler('updateRecoveryEmail', async (global, actions, payload): Promise<void> => {
  const {
    currentPassword, email, onSuccess,
    tabId = getCurrentTabId(),
  } = payload;

  global = updateTwoFaSettings(global, { isLoading: true, errorKey: undefined });
  global = updateTabState(global, {
    recoveryEmail: email,
  }, tabId);
  setGlobal(global);

  const isSuccess = await callApi('updateRecoveryEmail', currentPassword, email);

  global = getGlobal();
  global = updateTwoFaSettings(global, { isLoading: false, waitingEmailCodeLength: undefined });
  global = updateTabState(global, {
    recoveryEmail: undefined,
  }, tabId);
  setGlobal(global);

  if (isSuccess) {
    onSuccess();
  }
});

addActionHandler('provideTwoFaEmailCode', (global, actions, payload): ActionReturnType => {
  const { code } = payload;

  void callApi('provideRecoveryEmailCode', code);
});

addActionHandler('clearTwoFaError', (global): ActionReturnType => {
  return updateTwoFaSettings(global, { errorKey: undefined });
});

addActionHandler('loadTelesrvLoginPassword', async (global, actions, payload): Promise<void> => {
  const { shouldReportErrors, tabId = getCurrentTabId() } = payload || {};

  const result = await callApi('fetchTelesrvLoginPassword');
  if (!result) return;

  if ('error' in result) {
    const { error } = result;
    if (!shouldReportErrors) {
      if (error?.errorMessage === 'PASSWORD_LOGIN_DISABLED') {
        markPasswordLoginUnavailable();
      }
      return;
    }

    if (!handleTelesrvLoginPasswordCommonError(error, tabId)) {
      showTelesrvLoginPasswordFailure(error, tabId);
    }
    actions.openSettingsScreen({ screen: SettingsScreens.Privacy, tabId });
    return;
  }

  global = getGlobal();
  global = updateTelesrvLoginPassword(global, { hasPassword: result.hasPassword });
  setGlobal(global);
});

addActionHandler('updateTelesrvLoginPassword', async (global, actions, payload): Promise<void> => {
  const {
    mode, currentPassword, newPassword, tabId = getCurrentTabId(),
  } = payload;
  if (global.telesrvLoginPassword.isLoading) return;

  global = updateTelesrvLoginPassword(global, { isLoading: true, isCurrentPasswordInvalid: undefined });
  setGlobal(global);

  const result = await callApi('updateTelesrvLoginPassword', {
    hasPassword: mode !== 'set',
    currentPassword: mode === 'change' || mode === 'remove' ? currentPassword : undefined,
    newPassword: mode === 'remove' ? undefined : newPassword,
  });

  global = getGlobal();
  global = updateTelesrvLoginPassword(global, { isLoading: false });
  setGlobal(global);

  if (!result) return;

  if (result.type === 'updated') {
    global = getGlobal();
    global = updateTelesrvLoginPassword(global, { hasPassword: mode !== 'remove' });
    setGlobal(global);

    actions.openSettingsScreen({ screen: SettingsScreens.TelesrvLoginPassword, tabId });
    actions.showNotification({ message: { key: TELESRV_LOGIN_PASSWORD_DONE_KEYS[mode] }, tabId });
    return;
  }

  if (result.type === 'stateChanged') {
    global = getGlobal();
    global = updateTelesrvLoginPassword(global, { hasPassword: result.hasPassword });
    setGlobal(global);

    actions.openSettingsScreen({ screen: SettingsScreens.TelesrvLoginPassword, tabId });
    showTelesrvLoginPasswordDialog({ key: 'TelesrvLoginPasswordChangedElsewhere' }, tabId);
    return;
  }

  handleTelesrvLoginPasswordUpdateError(mode, result.error, tabId);
});

addActionHandler('clearTelesrvLoginPasswordError', (global): ActionReturnType => {
  return updateTelesrvLoginPassword(global, { isCurrentPasswordInvalid: undefined });
});

function handleTelesrvLoginPasswordUpdateError(
  mode: TelesrvLoginPasswordMode, error: TelesrvLoginPasswordError, tabId: number,
) {
  if (handleTelesrvLoginPasswordCommonError(error, tabId)) return;

  switch (error?.errorMessage) {
    case 'PASSWORD_HASH_INVALID':
      if (mode === 'reset') {
        // An empty `current` is refused: the reset window is off, has passed, or cannot be read
        const global = getGlobal();
        showTelesrvLoginPasswordDialog({
          key: global.appConfig.isCodeLoginDisabled
            ? 'TelesrvLoginPasswordResetUnavailableNoCode'
            : 'TelesrvLoginPasswordResetUnavailable',
        }, tabId);
      } else if (mode === 'set') {
        // Setting a first password sends no proof, so the server state changed meanwhile
        reloadTelesrvLoginPassword(tabId);
      } else {
        markCurrentTelesrvLoginPasswordInvalid(mode, tabId);
      }
      return;

    case 'SRP_PASSWORD_CHANGED':
      reloadTelesrvLoginPassword(tabId);
      return;

    case 'SRP_ID_INVALID':
      // The challenge expired or the connection's key rotated; the next attempt gets a new one
      showTelesrvLoginPasswordDialog({ key: 'TelesrvLoginPasswordRetry' }, tabId);
      return;

    case 'NEW_SALT_INVALID':
    case 'NEW_SETTINGS_INVALID':
      showTelesrvLoginPasswordDialog({ key: 'TelesrvLoginPasswordFailed' }, tabId);
      return;

    default:
      showTelesrvLoginPasswordFailure(error, tabId);
  }
}

// Handles the errors every telesrv login password method can return. Returns `true` when handled
function handleTelesrvLoginPasswordCommonError(error: TelesrvLoginPasswordError, tabId: number) {
  const errorMessage = error?.errorMessage;
  if (!errorMessage) return false;

  if (errorMessage === 'PASSWORD_LOGIN_DISABLED') {
    markPasswordLoginUnavailable();
    getActions().openSettingsScreen({ screen: SettingsScreens.Privacy, tabId });
    showTelesrvLoginPasswordDialog({ key: 'TelesrvLoginPasswordDisabled' }, tabId);
    return true;
  }

  // `invokeRequest` has already shown the frozen account notice
  if (errorMessage === 'FROZEN_METHOD_INVALID') return true;

  if (errorMessage.startsWith('FLOOD_WAIT')) {
    showTelesrvLoginPasswordDialog(error.messageKey, tabId);
    return true;
  }

  return false;
}

function markPasswordLoginUnavailable() {
  let global = getGlobal();
  global = {
    ...global,
    appConfig: {
      ...global.appConfig,
      isPasswordLoginAvailable: false,
    },
  };
  setGlobal(global);

  getActions().loadAppConfig();
}

function markCurrentTelesrvLoginPasswordInvalid(mode: TelesrvLoginPasswordMode, tabId: number) {
  let global = getGlobal();
  global = updateTelesrvLoginPassword(global, { isCurrentPasswordInvalid: true });
  setGlobal(global);

  if (mode === 'change') {
    getActions().openSettingsScreen({ screen: SettingsScreens.TelesrvLoginPasswordChangeCurrent, tabId });
  }
}

// The entry screen loads the fresh state while `hasPassword` is unknown
function reloadTelesrvLoginPassword(tabId: number) {
  let global = getGlobal();
  global = updateTelesrvLoginPassword(global, { hasPassword: undefined });
  setGlobal(global);

  getActions().openSettingsScreen({ screen: SettingsScreens.TelesrvLoginPassword, tabId });
  showTelesrvLoginPasswordDialog({ key: 'TelesrvLoginPasswordChangedElsewhere' }, tabId);
}

function showTelesrvLoginPasswordFailure(error: TelesrvLoginPasswordError, tabId: number) {
  const errorMessage = error?.errorMessage;
  showTelesrvLoginPasswordDialog(errorMessage ? {
    key: 'TelesrvLoginPasswordFailedError',
    variables: { error: errorMessage },
    options: { renderTextFilters: ['br'] },
  } : { key: 'TelesrvLoginPasswordFailed' }, tabId);
}

function showTelesrvLoginPasswordDialog(text: AdvancedLangFnParameters, tabId: number) {
  getActions().showDialog({ data: { type: 'localized', text }, tabId });
}
