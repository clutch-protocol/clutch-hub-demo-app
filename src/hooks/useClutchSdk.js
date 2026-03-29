import { useMemo } from 'react';
import { ClutchHubSdk } from 'clutch-hub-sdk-js';
import { API_URL } from '../config';

/**
 * Memoized ClutchHubSdk for the configured hub URL.
 * Recreates only when the effective public key changes (avoids allocating a new SDK every render).
 *
 * @param {string | undefined | null} publicKey
 * @param {string} [fallbackPublicKey='0x0'] Used when `publicKey` is empty (anonymous read-only hub calls).
 */
export function useClutchSdk(publicKey, fallbackPublicKey = '0x0') {
  const effective =
    publicKey !== undefined && publicKey !== null && String(publicKey).trim() !== ''
      ? String(publicKey).trim()
      : fallbackPublicKey;
  return useMemo(() => new ClutchHubSdk(API_URL, effective), [effective]);
}
