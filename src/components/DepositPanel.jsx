import React, { useEffect, useState } from 'react';
import { ClutchHubSdk } from 'clutch-hub-sdk-js';
import { API_URL, CHAIN_ID, IS_TESTNET, ORCHESTRATOR_BASE_URL } from '../config';
import { usePrivateKeyRequest } from './layout/usePrivateKeyRequest.jsx';

/** Click-to-copy for the exact address — NOT `truncAddr`'d like ActiveTripCard's CopyableAddress,
 * because truncating the one value that must be pasted exactly defeats the point. */
function CopyableValue({ value, className }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(String(value)).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    });
  };
  return (
    <span className={className} onClick={handleCopy} title="Click to copy" style={{ cursor: 'pointer' }}>
      {copied ? 'Copied!' : value}
    </span>
  );
}

/**
 * "Top up with USDT": on mount, fetches this account's permanent Nile TRC-20 deposit address and
 * displays it — any amount sent there is credited automatically, with no amount, intent, or poll.
 * The private key is needed only to obtain a hub JWT via `sdk.getAuthHeaders()`, not to sign anything.
 */
/**
 * Where to get test USDT, on testnet deployments only.
 *
 * Without this the deposit panel is a dead end for anyone who has not already got Nile USDT: it
 * asks for a token that cannot be bought and has no obvious source. The faucet is the answer and
 * it is not discoverable from here.
 *
 * Collapsed by default -- it is a one-time setup step, and expanded it would outweigh the form it
 * sits above for everyone who has already done it.
 *
 * Rendered ONLY when IS_TESTNET (see config.js). "Free" and "not real money" next to a field that
 * takes real money would be actively dangerous on a live deployment.
 */
const TestnetFaucetGuide = () => (
  <details className="card" style={{ marginBottom: '1rem', padding: '0.75rem 1rem' }}>
    <summary style={{ cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' }}>
      Testnet — how to get USDT to deposit
    </summary>
    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.6rem', lineHeight: 1.55 }}>
      <p style={{ marginTop: 0 }}>
        This deployment settles on the <strong>Tron Nile testnet</strong>. The USDT here is test
        currency with no value — you cannot buy it, and nothing you deposit is real money.
      </p>
      <ol style={{ paddingLeft: '1.2rem', margin: '0.5rem 0' }}>
        <li>
          Install a Tron wallet (e.g.{' '}
          <a href="https://www.tronlink.org/" target="_blank" rel="noopener noreferrer">TronLink</a>)
          and switch its network to <strong>Nile</strong>. A mainnet wallet cannot see this chain.
        </li>
        <li>
          Open the{' '}
          <a href="https://nileex.io/join/getJoinPage" target="_blank" rel="noopener noreferrer">
            Nile faucet
          </a>
          , paste your Tron address, and request funds. It sends test TRX and test USDT.
        </li>
        <li>Come back and pay any amount to the address this panel gives you.</li>
      </ol>
      <p style={{ marginBottom: 0 }}>
        Send <strong>only Nile USDT (TRC-20)</strong>. Mainnet USDT, TRX, or any other token sent to
        a deposit address will not be credited and cannot be returned.
      </p>
    </div>
  </details>
);

const DepositPanel = ({ userProfile }) => {
  const [address, setAddress] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [unavailable, setUnavailable] = useState(false);

  const { PrivateKeyModal, requestPrivateKey } = usePrivateKeyRequest();

  // Fetches the account's permanent deposit address. Runs once the profile has a public key, and
  // again if it changes (e.g. a different wallet is loaded) — not a loop, just re-derives for a
  // different identity. `userProfile` starts as `{publicKey: '', privateKey: ''}` before a wallet
  // exists (see App.jsx), so this guards on a real key rather than firing on first app mount.
  useEffect(() => {
    if (!userProfile?.publicKey) return undefined;

    let cancelled = false;

    (async () => {
      setLoading(true);
      setError(null);
      setUnavailable(false);
      setAddress(null);
      try {
        const { publicKey, privateKey } = userProfile;
        let pk = privateKey;
        if (!pk) {
          pk = await requestPrivateKey('Enter your private key to see your deposit address:');
          if (!pk) {
            if (!cancelled) setError('Signing cancelled.');
            return;
          }
        }
        const sdk = new ClutchHubSdk(API_URL, publicKey, pk, CHAIN_ID);
        const authHeaders = await sdk.getAuthHeaders();
        const res = await fetch(`${ORCHESTRATOR_BASE_URL}/api/v1/deposits`, {
          method: 'POST',
          headers: authHeaders,
        });
        if (res.status === 503) {
          if (!cancelled) setUnavailable(true);
          return;
        }
        const body = await res.json();
        if (!res.ok) {
          throw new Error(body.error || `deposit request failed (${res.status})`);
        }
        if (!cancelled) setAddress(body.address);
      } catch (err) {
        if (!cancelled) setError(err.message || 'Failed to load deposit address');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [userProfile, requestPrivateKey]);

  return (
    <div className="card">
      <h3 className="card-title">Top up with USDT</h3>

      {IS_TESTNET && <TestnetFaucetGuide />}

      {loading && (
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Loading your deposit address…</p>
      )}

      {!loading && unavailable && (
        <div className="status-banner info">
          Top-ups are temporarily unavailable. Please check back later.
        </div>
      )}

      {!loading && !unavailable && error && (
        <div className="status-banner error">{error}</div>
      )}

      {!loading && !unavailable && !error && address && (
        <div>
          <p className="label">Pay to address</p>
          <div className="form-row" style={{ marginBottom: '0.35rem' }}>
            <CopyableValue value={address} className="wallet-address" />
          </div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            This is your permanent deposit address — send any amount of Nile USDT (TRC-20) to it and
            it is credited automatically, appearing in your balance. Any other token or network sent
            here cannot be recovered.
          </p>
        </div>
      )}

      <PrivateKeyModal />
    </div>
  );
};

export default DepositPanel;
