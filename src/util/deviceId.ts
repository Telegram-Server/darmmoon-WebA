export const DEVICE_ID_SOURCE_KEY = 'tt-device-id-source';

const DEVICE_ID_SOURCE_PREFIX = 'web-rand:';
const DEVICE_ID_SALT = 'DarkMoon device_id v1';
const DEVICE_ID_LENGTH = 32;

let deviceIdPromise: Promise<string> | undefined;

// The browser has no machine id, so a random source is persisted once and hashed like on desktop
export function getDeviceId() {
  if (!deviceIdPromise) {
    deviceIdPromise = computeDeviceId().catch(() => {
      deviceIdPromise = undefined;
      return '';
    });
  }

  return deviceIdPromise;
}

async function computeDeviceId() {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw', encoder.encode(DEVICE_ID_SALT), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  );
  const hash = await crypto.subtle.sign('HMAC', key, encoder.encode(getDeviceIdSource()));

  return Array.from(new Uint8Array(hash), (byte) => byte.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, DEVICE_ID_LENGTH);
}

function getDeviceIdSource() {
  const storedSource = localStorage.getItem(DEVICE_ID_SOURCE_KEY);
  if (storedSource) return storedSource;

  const source = `${DEVICE_ID_SOURCE_PREFIX}${crypto.randomUUID()}`;
  localStorage.setItem(DEVICE_ID_SOURCE_KEY, source);
  return source;
}
