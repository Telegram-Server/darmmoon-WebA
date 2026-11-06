import type {
  ApiUpdateAuthorizationError,
  ApiUpdateAuthorizationState,
  ApiUpdateConnectionState,
  ApiUpdateCurrentUser,
  ApiUpdatePasskeyOption,
  ApiUpdateServerTimeOffset,
  ApiUpdateSession,
  ApiUpdateUserAlreadyAuthorized,
} from '../../../api/types';
import type { RequiredGlobalActions } from '../../index';
import type { ActionReturnType, GlobalState } from '../../types';

import { IS_MOBILE } from '../../../util/browser/windowEnvironment';
import { getCurrentTabId } from '../../../util/establishMultitabRole';
import { getShippingError, shouldClosePaymentModal } from '../../../util/getReadableErrorText';
import { storeGuestLoginHint } from '../../../util/guestLogin';
import { retryLocalization } from '../../../util/localization';
import { getAccountsInfo, getAccountSlotUrl } from '../../../util/multiaccount';
import { setServerTimeOffset } from '../../../util/serverTime';
import { updateSessionUserId } from '../../../util/sessions';
import { finishWebLogin, rejectWebLogin } from '../../../util/webLogin';
import { forceWebsync } from '../../../util/websync';
import {
  addActionHandler, getActions, getGlobal, setGlobal,
} from '../../index';
import {
  getOpenedShortpollChannelIds,
  resetOpenedChannelShortpollState,
  syncOpenedShortpollChannelIds,
} from '../../openedChannelShortpoll';
import { updateUser, updateUserFullInfo } from '../../reducers';
import { updateAuth } from '../../reducers/auth';
import { updateTabState } from '../../reducers/tabs';
import { selectIsTelesrvCodeLoginDisabled, selectTabState } from '../../selectors';
import { selectSharedSettings } from '../../selectors/sharedState';

const TELESRV_PERMISSION_REFRESH_TIMEOUT = 10000;
// These errors can arrive on any auth screen, including the QR code one without an error field
const NOTIFICATION_AUTH_ERRORS = new Set([
  'PASSKEY_CREDENTIAL_NOT_FOUND', 'AUTHORIZATIONS_TOO_MUCH', 'DEVICE_ID_REQUIRED',
]);
const UNEXPECTED_ERROR_KEYS = new Set(['ErrorUnexpected', 'ErrorUnexpectedMessage']);

let lastTelesrvPermissionRefreshAt = 0;

addActionHandler('apiUpdate', (global, actions, update): ActionReturnType => {
  switch (update['@type']) {
    case 'updateApiReady':
      onUpdateApiReady(global);
      break;

    case 'updateAuthorizationState':
      onUpdateAuthorizationState(global, update);
      break;

    case 'updateAuthorizationError':
      onUpdateAuthorizationError(global, update);
      break;

    case 'updateUserAlreadyAuthorized':
      onUpdateUserAlreadyAuthorized(global, update);
      break;

    case 'updateWebAuthTokenFailed':
      onUpdateWebAuthTokenFailed(global);
      break;

    case 'updatePasskeyOption':
      onUpdatePasskeyOption(global, update);
      break;

    case 'updateConnectionState':
      onUpdateConnectionState(global, actions, update);
      break;

    case 'updateSession':
      onUpdateSession(global, actions, update);
      break;

    case 'updateServerTimeOffset':
      onUpdateServerTimeOffset(update);
      break;

    case 'updateCurrentUser':
      onUpdateCurrentUser(global, update);
      break;

    case 'requestReconnectApi':
      global = { ...global, isSynced: false };
      setGlobal(global);

      global = getGlobal();
      onUpdateConnectionState(global, actions, {
        '@type': 'updateConnectionState',
        connectionState: 'connectionStateConnecting',
      });
      actions.initApi();
      break;

    case 'requestSync':
      resetOpenedChannelShortpollState();
      syncOpenedShortpollChannelIds(global);
      actions.sync();
      break;

    case 'updateFetchingDifference':
      global = { ...global, isFetchingDifference: update.isFetching };
      setGlobal(global);
      break;

    case 'error': {
      Object.values(global.byTabId).forEach(({ id: tabId }) => {
        const paymentShippingError = getShippingError(update.error);
        if (paymentShippingError) {
          actions.addPaymentError({ error: paymentShippingError, tabId });
        } else if (shouldClosePaymentModal(update.error)) {
          actions.closePaymentModal({ tabId });
        } else if (actions.showDialog) {
          actions.showDialog({ data: { type: 'error', ...update.error }, tabId });
        }
      });

      break;
    }

    case 'notSupportedInFrozenAccount': {
      actions.showNotification({
        title: {
          key: 'NotificationTitleNotSupportedInFrozenAccount',
        },
        message: {
          key: 'NotificationMessageNotSupportedInFrozenAccount',
        },
        tabId: getCurrentTabId(),
      });
      break;
    }

    case 'telesrvPermissionError': {
      actions.showNotification({
        message: { key: 'TelesrvPermissionDenied' },
        tabId: getCurrentTabId(),
      });

      const now = Date.now();
      if (now - lastTelesrvPermissionRefreshAt > TELESRV_PERMISSION_REFRESH_TIMEOUT) {
        lastTelesrvPermissionRefreshAt = now;
        actions.loadAppConfig();
      }
      break;
    }
  }
});

function onUpdateApiReady<T extends GlobalState>(global: T) {
  void retryLocalization(selectSharedSettings(global).language);
}

function onUpdateAuthorizationState<T extends GlobalState>(global: T, update: ApiUpdateAuthorizationState) {
  const wasAuthReady = global.auth.state === 'authorizationStateReady';
  const authState = update.authorizationState;

  global = updateAuth(global, {
    state: authState,
    isLoading: false,
  });
  setGlobal(global);
  global = getGlobal();

  if (authState === 'authorizationStateWaitPhoneNumber' || authState === 'authorizationStateWaitQrCode') {
    // The flow waits here again after a failed guest sign-in
    global = updateAuth(global, {
      isGuestSignIn: undefined,
    });
    setGlobal(global);

    // The app config tells which login methods the server offers
    if (!global.isAppConfigLoaded) {
      getActions().loadAppConfig();
    }
  }

  switch (authState) {
    case 'authorizationStateLoggingOut':
      void forceWebsync(false);

      global = updateAuth(global, {
        isLoggingOut: true,
      });
      setGlobal(global);
      break;
    case 'authorizationStateWaitCode':
      global = updateAuth(global, {
        isCodeViaApp: update.isCodeViaApp,
      });
      setGlobal(global);
      break;
    case 'authorizationStateWaitPassword':
      global = updateAuth(global, {
        hint: update.hint,
      });

      if (update.noReset) {
        global = updateAuth(global, {
          hasWebAuthTokenPasswordRequired: true,
        });
      }

      setGlobal(global);
      break;
    case 'authorizationStateWaitQrCode':
      global = updateAuth(global, {
        isLoadingQrCode: false,
        qrCode: update.qrCode,
      });
      setGlobal(global);
      break;
    case 'authorizationStateWaitRegistration':
      global = updateAuth(global, {
        isPasswordSignup: update.isPasswordSignup,
      });
      setGlobal(global);
      break;
    case 'authorizationStateReady': {
      if (wasAuthReady) {
        break;
      }

      void forceWebsync(true);

      if (global.auth.isGuestSignIn && global.appConfig.isPasswordLoginAvailable) {
        global = updateTabState(global, {
          isGuestPasswordReminderPending: true,
        }, getCurrentTabId());
      }

      global = updateAuth(global, {
        isLoggingOut: false,
        isGuestPageFirst: undefined,
        isGuestPage: undefined,
        isGuestSignIn: undefined,
      });
      Object.values(global.byTabId).forEach(({ id: tabId }) => {
        global = updateTabState(global, {
          inactiveReason: undefined,
        }, tabId);
      });
      setGlobal(global);

      break;
    }
  }
}

function onUpdateAuthorizationError<T extends GlobalState>(global: T, update: ApiUpdateAuthorizationError) {
  if (update.errorCode && NOTIFICATION_AUTH_ERRORS.has(update.errorCode)) {
    getActions().showNotification({
      message: update.errorKey,
      tabId: getCurrentTabId(),
    });
    return;
  }

  if (update.errorCode === 'GUEST_LOGIN_DISABLED') {
    onGuestLoginDisabled(global, update);
    return;
  }

  const isPasswordLoginUnavailable = update.errorCode === 'PASSWORD_LOGIN_DISABLED';
  const isCodeLoginUnavailable = update.errorCode === 'CODE_LOGIN_DISABLED';
  const isCodeLoginDisabled = selectIsTelesrvCodeLoginDisabled(global);
  // Without login codes an account with no login password can only get one from the administrator
  const isPasswordMissingForGood = update.errorCode === 'PASSWORD_LOGIN_NOT_SET' && isCodeLoginDisabled;

  if (isPasswordLoginUnavailable || (update.errorCode === 'PASSWORD_LOGIN_NOT_SET' && !isCodeLoginDisabled)) {
    global = updateAuth(global, {
      isPasswordLogin: false,
    });
  } else if (isCodeLoginUnavailable) {
    global = updateAuth(global, {
      isPasswordLogin: true,
    });
  }

  const isUnexpectedGuestError = global.auth.isGuestSignIn && UNEXPECTED_ERROR_KEYS.has(update.errorKey.key);

  global = updateAuth(global, {
    errorKey: isPasswordMissingForGood ? { key: 'TelesrvNoLoginPasswordContactAdmin' }
      : isUnexpectedGuestError ? { key: 'TelesrvLoginFailed' } : update.errorKey,
  });
  setGlobal(global);

  // The cached switches are stale
  if (isPasswordLoginUnavailable || isCodeLoginUnavailable || update.errorCode === 'SIGN_UP_DISABLED') {
    getActions().loadAppConfig();
  }
}

// The default login page replaces the guest page, which this server no longer offers
function onGuestLoginDisabled<T extends GlobalState>(global: T, update: ApiUpdateAuthorizationError) {
  const actions = getActions();

  storeGuestLoginHint(false);
  global = updateAuth(global, {
    isGuestPageFirst: false,
    isGuestPage: false,
  });
  setGlobal(global);

  actions.showNotification({
    message: update.errorKey,
    tabId: getCurrentTabId(),
  });
  actions.loadAppConfig();

  // The failed guest sign-in returns the flow to the phone number wait
  if (!IS_MOBILE) {
    actions.goToAuthQrCode();
  }
}

function onUpdateUserAlreadyAuthorized<T extends GlobalState>(global: T, update: ApiUpdateUserAlreadyAuthorized) {
  const { userId } = update;
  if (global.currentUserId === userId) return;

  const accounts = getAccountsInfo();
  const slot = Object.entries(accounts).find(([_, info]) => info.userId === userId)?.[0];
  if (!slot) return;
  const url = getAccountSlotUrl(Number(slot));
  window.location.replace(url);
}

function onUpdateWebAuthTokenFailed<T extends GlobalState>(global: T) {
  rejectWebLogin();

  global = updateAuth(global, {
    hasWebAuthTokenFailed: true,
  });
  setGlobal(global);
}

function onUpdatePasskeyOption<T extends GlobalState>(global: T, update: ApiUpdatePasskeyOption) {
  global = updateAuth(global, {
    passkeyOption: update.option,
  });
  setGlobal(global);
}

function onUpdateConnectionState<T extends GlobalState>(
  global: T, actions: RequiredGlobalActions, update: ApiUpdateConnectionState,
) {
  const { connectionState } = update;

  const tabState = selectTabState(global, getCurrentTabId());
  if (connectionState === 'connectionStateReady' && tabState.isMasterTab && tabState.multitabNextAction) {
    // @ts-ignore
    actions[tabState.multitabNextAction.action](tabState.multitabNextAction.payload);
    actions.clearMultitabNextAction({ tabId: tabState.id });
  }

  if (connectionState === global.connectionState) {
    return;
  }

  global = {
    ...global,
    connectionState,
  };
  setGlobal(global);

  if (global.isSynced) {
    const channelStackIds = getOpenedShortpollChannelIds(global);

    if (connectionState === 'connectionStateReady' && tabState.isMasterTab && channelStackIds.length) {
      channelStackIds.forEach((chatId) => {
        actions.requestChannelDifference({ chatId });
      });
    }
  }

  if (connectionState === 'connectionStateBroken') {
    actions.signOut({ forceInitApi: true });
  }
}

function onUpdateSession<T extends GlobalState>(global: T, actions: RequiredGlobalActions, update: ApiUpdateSession) {
  const { sessionData } = update;
  const { rememberMe, state } = global.auth;
  const isEmpty = !sessionData || !sessionData.mainDcId;

  const isTest = sessionData?.isTest;
  if (isTest) {
    global = {
      ...global,
      config: {
        ...global.config,
        isTestServer: isTest,
      },
    };
    setGlobal(global);
  }

  if (!rememberMe || state !== 'authorizationStateReady' || isEmpty) {
    return;
  }

  actions.saveSession({ sessionData });
}

function onUpdateServerTimeOffset(update: ApiUpdateServerTimeOffset) {
  setServerTimeOffset(update.serverTimeOffset);
}

function onUpdateCurrentUser<T extends GlobalState>(global: T, update: ApiUpdateCurrentUser) {
  const { currentUser, currentUserFullInfo } = update;

  global = {
    ...updateUser(global, currentUser.id, currentUser),
    currentUserId: currentUser.id,
  };
  global = updateUserFullInfo(global, currentUser.id, currentUserFullInfo);
  setGlobal(global);

  updateSessionUserId(currentUser.id);
  finishWebLogin(currentUser.id);
}
