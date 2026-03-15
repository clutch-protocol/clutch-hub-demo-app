/**
 * Wallet generation utilities for Clutch Protocol.
 * Uses secp256k1 (same as Ethereum/Clutch node) for key derivation.
 */
import * as secp from '@noble/secp256k1';
import { keccak_256 } from '@noble/hashes/sha3';
import { bytesToHex } from '@noble/hashes/utils';

/**
 * Generates a new Clutch-compatible keypair.
 * Returns address (Ethereum-style) and private key in hex.
 * Matches the derivation used by clutch-hub-api (signature_keys.rs).
 *
 * @returns {{ address: string, privateKey: string }}
 */
export function generateWallet() {
  const privateKeyBytes = secp.utils.randomPrivateKey();
  const privateKey = '0x' + bytesToHex(privateKeyBytes);

  const publicKeyBytes = secp.getPublicKey(privateKeyBytes, false);
  // Skip 04 prefix (first byte), hash remaining 64 bytes (uncompressed pubkey)
  const hash = keccak_256(publicKeyBytes.slice(1));
  const address = '0x' + bytesToHex(hash.slice(12, 32));

  return {
    address,
    privateKey,
  };
}
