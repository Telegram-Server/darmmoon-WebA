import { Api as GramJs } from '../../../lib/gramjs';
import { generateRandomBytes } from '../../../lib/gramjs/Helpers';
import { computeCheck, computeDigest } from '../../../lib/gramjs/Password';

import { concat } from '../../../util/encoding/buffer';
import { checkErrorType, wrapError } from '../helpers/misc';
import { sendApiUpdate } from '../updates/apiUpdateEmitter';
import {
  getCurrentPassword, getTmpPassword, invokeRequest, updateTwoFaSettings,
} from './client';

const NEW_PASSWORD_SALT_RANDOM_LENGTH = 32;

const emailCodeController: {
  resolve?: (code: string) => void;
  reject?: (error: Error) => void;
} = {};

export async function getPasswordInfo() {
  const result = await invokeRequest(new GramJs.account.GetPassword());
  if (!result) {
    return undefined;
  }

  const { hint, hasPassword } = result;

  return { hint, hasPassword };
}

function onRequestEmailCode(length: number) {
  sendApiUpdate({
    '@type': 'updateTwoFaStateWaitCode',
    length,
  });

  return new Promise<string>((resolve, reject) => {
    emailCodeController.resolve = resolve;
    emailCodeController.reject = reject;
  });
}

export function getTemporaryPaymentPassword(password: string, ttl?: number) {
  try {
    return getTmpPassword(password, ttl);
  } catch (err: unknown) {
    if (!checkErrorType(err)) return undefined;

    return Promise.resolve(wrapError(err));
  }
}

export function getPassword(password: string) {
  try {
    return getCurrentPassword(password);
  } catch (err: unknown) {
    if (!checkErrorType(err)) return undefined;

    return Promise.resolve(wrapError(err));
  }
}

export async function checkPassword(currentPassword: string) {
  try {
    await updateTwoFaSettings({ isCheckPassword: true, currentPassword });

    return true;
  } catch (err: any) {
    onError(err);

    return false;
  }
}

export async function clearPassword(currentPassword: string) {
  try {
    await updateTwoFaSettings({ currentPassword });

    return true;
  } catch (err: any) {
    onError(err);

    return false;
  }
}

export async function updatePassword(currentPassword: string, password: string, hint?: string, email?: string) {
  try {
    await updateTwoFaSettings({
      currentPassword,
      newPassword: password,
      hint,
      email,
      emailCodeCallback: onRequestEmailCode,
      onEmailCodeError: onError,
    });

    return true;
  } catch (err: any) {
    onError(err);

    return false;
  }
}

export async function updateRecoveryEmail(currentPassword: string, email: string) {
  try {
    await updateTwoFaSettings({
      currentPassword,
      newPassword: currentPassword,
      email,
      emailCodeCallback: onRequestEmailCode,
      onEmailCodeError: onError,
    });

    return true;
  } catch (err: any) {
    onError(err);

    return false;
  }
}

export function provideRecoveryEmailCode(code: string) {
  emailCodeController.resolve!(code);
}

function onError(err: Error) {
  const wrappedError = wrapError(err);

  sendApiUpdate({
    '@type': 'updateTwoFaError',
    messageKey: wrappedError.messageKey,
  });
}

export async function fetchTelesrvLoginPassword() {
  try {
    const result = await invokeRequest(new GramJs.telesrv.GetMyLoginPassword(), { shouldThrow: true });
    if (!result) {
      return undefined;
    }

    return { hasPassword: Boolean(result.hasPassword) };
  } catch (err: unknown) {
    return { error: buildTelesrvLoginPasswordError(err) };
  }
}

/**
 * Sets, changes, removes or resets the telesrv login password (TgSever docs/password-login.md).
 * Every attempt starts from a fresh `telesrv.getMyLoginPassword`: its SRP challenge is single-use
 * and bound to the connection.
 *
 * `hasPassword` is the state the caller expects. Without `currentPassword` the server gets
 * `inputCheckPasswordEmpty`, which sets a first password or resets a forgotten one. Without
 * `newPassword` the password is removed.
 */
export async function updateTelesrvLoginPassword({
  hasPassword,
  currentPassword,
  newPassword,
}: {
  hasPassword: boolean;
  currentPassword?: string;
  newPassword?: string;
}) {
  try {
    const passwordState = await invokeRequest(new GramJs.telesrv.GetMyLoginPassword(), { shouldThrow: true });
    if (!passwordState) {
      return undefined;
    }

    const hasPasswordNow = Boolean(passwordState.hasPassword);
    if (hasPasswordNow !== hasPassword) {
      return { type: 'stateChanged' as const, hasPassword: hasPasswordNow };
    }

    const current = currentPassword
      ? await computeCheck(passwordState, currentPassword)
      : new GramJs.InputCheckPasswordEmpty();
    const newSettings = await buildTelesrvLoginPasswordSettings(passwordState.newAlgo, newPassword);

    const result = await invokeRequest(new GramJs.telesrv.UpdateLoginPassword({
      current,
      newSettings,
    }), { shouldThrow: true });

    return result
      ? { type: 'updated' as const }
      : { type: 'error' as const, error: undefined };
  } catch (err: unknown) {
    return { type: 'error' as const, error: buildTelesrvLoginPasswordError(err) };
  }
}

// A new password uses the server's `new_algo` with 32 random bytes appended to `salt1`, as for 2FA.
// Removal sends `passwordKdfAlgoUnknown` with an empty hash.
async function buildTelesrvLoginPasswordSettings(newAlgo: GramJs.TypePasswordKdfAlgo, newPassword?: string) {
  if (!newPassword) {
    return new GramJs.account.PasswordInputSettings({
      newAlgo: new GramJs.PasswordKdfAlgoUnknown(),
      newPasswordHash: new Uint8Array(0),
      hint: '',
    });
  }

  if (!(newAlgo instanceof GramJs.PasswordKdfAlgoSHA256SHA256PBKDF2HMACSHA512iter100000SHA256ModPow)) {
    throw new Error('Password algorithm is unknown');
  }

  const algo = new GramJs.PasswordKdfAlgoSHA256SHA256PBKDF2HMACSHA512iter100000SHA256ModPow({
    salt1: concat(newAlgo.salt1, generateRandomBytes(NEW_PASSWORD_SALT_RANDOM_LENGTH)),
    salt2: newAlgo.salt2,
    g: newAlgo.g,
    p: newAlgo.p,
  });

  return new GramJs.account.PasswordInputSettings({
    newAlgo: algo,
    newPasswordHash: await computeDigest(algo, newPassword),
    hint: '',
  });
}

function buildTelesrvLoginPasswordError(err: unknown) {
  if (!checkErrorType(err)) {
    return undefined;
  }

  const { errorMessage, messageKey } = wrapError(err);

  return { errorMessage, messageKey };
}
