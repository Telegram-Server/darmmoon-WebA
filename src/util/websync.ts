// Login state sync with `t.me/_websync_` is specific to the official Telegram servers,
// so these functions only keep the call sites and clear the stored state
const WEBSYNC_KEY = 'tgme_sync';

export function forceWebsync(authed: boolean): Promise<void> | undefined {
  return undefined;
}

export function stopWebsync() {}

export function startWebsync() {}

export function clearWebsync() {
  localStorage.removeItem(WEBSYNC_KEY);
}
