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
    fingerprint: BigInt('6733617447836210812'),
    n: BigInt(
      '2284589308621418199924688310109016581728059707568858819238256952627994719922557537198860585601254785628'
      + '4539569687498749761550233610627270677287685379374228442646995165503242938424431254228721517591054960355'
      + '5382749599589378789367301758983420208347084719438390469738430786371019523111710126901880598478070331100'
      + '7346669365410309409088357314366944218085729965285681687536600288715014773312183600635512512282119170869'
      + '3993280076145223681301649806892952202310564540650658088842747815996157805308810861564537543908317516961'
      + '027302607428670833081179834749771220696335030750861145858580476786870713760047558996429141252026062003',
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
