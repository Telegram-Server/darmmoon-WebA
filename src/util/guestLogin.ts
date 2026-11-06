import { getAccountsInfo } from './multiaccount';

const GUEST_LOGIN_HINT_KEY = 'tt-telesrv-guest-login';

// The guest login switch from the last loaded app config, `undefined` until one is loaded on this device
export function getGuestLoginHint() {
  const value = localStorage.getItem(GUEST_LOGIN_HINT_KEY) || undefined;
  return value === undefined ? undefined : value === '1';
}

export function storeGuestLoginHint(isAvailable: boolean) {
  localStorage.setItem(GUEST_LOGIN_HINT_KEY, isAvailable ? '1' : '0');
}

// Adding another account skips the guest page: a guest sign-up from the same network returns the same guest account
export function checkIsFirstAccountLogin() {
  return !Object.keys(getAccountsInfo()).length;
}
