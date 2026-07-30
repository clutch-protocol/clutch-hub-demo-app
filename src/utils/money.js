import { formatUsd } from 'clutch-hub-sdk-js';

export { formatUsd };

/**
 * Parse a user-typed USD string into CLT base units (1 USD = 1,000,000 CLT).
 * Integer math only — a float parse (`parseFloat(x) * 1e6`) reintroduces the precision loss
 * bigint amounts exist to avoid (e.g. floats turn "5.005" into "5.0049999...").
 * @param {string} input
 * @returns {bigint}
 * @throws {Error} if input isn't `^\d+(\.\d{1,6})?$`
 */
export function parseUsdToClt(input) {
  const m = /^(\d+)(?:\.(\d{1,6}))?$/.exec(String(input).trim());
  if (!m) throw new Error('invalid amount');
  return BigInt(m[1]) * 1_000_000n + BigInt((m[2] ?? '').padEnd(6, '0'));
}
