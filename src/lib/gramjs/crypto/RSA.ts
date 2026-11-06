import { concat } from '../../../util/encoding/buffer';

import {
  generateRandomBytes,
  modExp,
  readBigIntFromBuffer,
  readBufferFromBigInt,
  sha1,
} from '../Helpers';

export const SERVER_KEYS = [
  // DarkMoon server key
  {
    fingerprint: BigInt('-791388519252582299'),
    n: BigInt(
      '2718013811973952015517321888322581819325365216594416192424452194979035362167153940852176196790429434525'
      + '5413474757327299953265619822749852457419139252556340297017512847542339200016025057207202600984250047442'
      + '8853780262864348572288308094314778790886623408772550306510429649784568037173108167722115224357605463381'
      + '1093576260134524966639156681569800522202303755538639741306215341445478594709888080504504223058370311303'
      + '7804860234242575331855776819985409270696272173779902145231736460759836096029827355481785898456165929204'
      + '958818479812046132930286929579798088092496979164522817278815870231005453753289306665728218045824105087',
    ),
    e: 65537,
  },
].reduce((acc, { fingerprint, ...keyInfo }) => {
  acc.set(fingerprint, keyInfo);
  return acc;
}, new Map<bigint, { n: bigint; e: number }>());

/**
 * Encrypts the given data known the fingerprint to be used
 * in the way Telegram requires us to do so (sha1(data) + data + padding)

 * @param fingerprint the fingerprint of the RSA key.
 * @param data the data to be encrypted.
 * @returns the cipher text, or undefined if no key matching this fingerprint is found.
 */
export async function encrypt(fingerprint: bigint, data: Uint8Array): Promise<Uint8Array | undefined> {
  const key = SERVER_KEYS.get(fingerprint);
  if (!key) {
    return undefined;
  }

  // len(sha1.digest) is always 20, so we're left with 255 - 20 - x padding
  const rand = generateRandomBytes(235 - data.length);

  const toEncrypt = concat(await sha1(data), data, rand);

  // rsa module rsa.encrypt adds 11 bits for padding which we don't want
  // rsa module uses rsa.transform.bytes2int(to_encrypt), easier way:
  const payload = readBigIntFromBuffer(toEncrypt, false);
  const encrypted = modExp(payload, BigInt(key.e), key.n);
  // rsa module uses transform.int2bytes(encrypted, keylength), easier:
  return readBufferFromBigInt(encrypted, 256, false);
}
