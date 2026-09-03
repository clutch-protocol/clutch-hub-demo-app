import React, { useEffect, useState } from 'react';
import { ClutchHubSdk } from 'clutch-hub-sdk-js';
import { API_URL, CHAIN_ID, IS_TESTNET, ORCHESTRATOR_BASE_URL } from '../config';
import { usePrivateKeyRequest } from './layout/usePrivateKeyRequest.jsx';
import { formatExactUsdt } from '../utils/money';

/** `truncHash`/`timeAgo`, copied from `TransactionHistory.jsx` (module-private there, not
 * exported) rather than imported — a few duplicated lines beat coupling this panel to a
 * ride-history component. Keep in sync by eye if that file's versions change. */
function truncHash(hash) {
  if (!hash || hash.length < 14) return hash || '';
  return `${hash.slice(0, 8)}...${hash.slice(-4)}`;
}

function timeAgo(timestamp) {
  const diff = Date.now() - timestamp;
  if (diff < 60000) return 'just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return new Date(timestamp).toLocaleDateString();
}

/** Per the status table in
 * `clutch-treasury/docs/superpowers/specs/2026-09-04-deposit-history-panel-design.md` — the API
 * keeps returning the raw backend status; this is where (and only where) it becomes a word a user
 * reads. A status not listed here renders as its own raw string rather than guessing a label. */
const DEPOSIT_STATUS_LABELS = {
  confirmed: 'Detected',
  mint_requested: 'Minting',
  credited: 'Credited',
  needs_manual: 'Needs review',
};

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

const DepositPanel = ({ userProfile, open }) => {
  const [address, setAddress] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [unavailable, setUnavailable] = useState(false);
  const [deposits, setDeposits] = useState([]);

  const { PrivateKeyModal, requestPrivateKey } = usePrivateKeyRequest();

  // Fetches the account's permanent deposit address each time the panel opens — that POST IS the
  // "user is about to deposit" signal the backend uses to mark the address hot. `DepositPanel` is
  // permanently mounted by `OverlayPanel` (hidden via CSS, never unmounted — see App.jsx), so `open`
  // is what actually tracks visibility; without it this would fire for every signed-in user on
  // every app load. `userProfile?.publicKey` additionally guards the case where the panel opens
  // before a wallet exists (`userProfile` starts as `{publicKey: '', privateKey: ''}`).
  //
  // The same effect also fetches the caller's recent deposit list and refreshes it on a 10s
  // interval while the panel stays open — a deposit's status moves through confirmed / minting /
  // credited on its own schedule, and this is the only signal a user gets of that without
  // reopening the panel. A failed list refresh is logged and otherwise ignored: it must never
  // clobber the address already on screen.
  useEffect(() => {
    if (!open || !userProfile?.publicKey) return undefined;

    let cancelled = false;
    let intervalId = null;

    const fetchDeposits = async (sdk) => {
      try {
        const authHeaders = await sdk.getAuthHeaders();
        const res = await fetch(`${ORCHESTRATOR_BASE_URL}/api/v1/deposits`, {
          method: 'GET',
          headers: authHeaders,
        });
        if (!res.ok) throw new Error(`deposit list failed (${res.status})`);
        const body = await res.json();
        if (!cancelled) setDeposits(body.deposits || []);
      } catch (err) {
        console.error('deposit list fetch failed', err);
        // Leave the previously-loaded list in place — this is best-effort next to the address.
      }
    };

    (async () => {
      setLoading(true);
      setError(null);
      setUnavailable(false);
      // Deliberately NOT setAddress(null) here: a reopen re-POSTs (same address comes back), and
      // blanking the address first would flash the panel to empty on every reopen.
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

        // Best-effort: only bother once we know deposits are actually on (the POST above didn't
        // 503) and the effect hasn't already been cleaned up while we were awaiting it.
        if (!cancelled) {
          await fetchDeposits(sdk);
          intervalId = setInterval(() => fetchDeposits(sdk), 10000);
        }
      } catch (err) {
        console.error('deposit address fetch failed', err);
        if (!cancelled) setError(err.message || 'Failed to load deposit address');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      if (intervalId) clearInterval(intervalId);
    };
  }, [open, userProfile, requestPrivateKey]);

  return (
    <div className="card">
      <h3 className="card-title">Top up with USDT</h3>

      {IS_TESTNET && <TestnetFaucetGuide />}

      {loading && !address && (
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Loading your deposit address…</p>
      )}

      {!loading && !address && unavailable && (
        <div className="status-banner info">
          Top-ups are temporarily unavailable. Please check back later.
        </div>
      )}

      {!loading && !address && error && (
        <div className="status-banner error">{error}</div>
      )}

      {address && (
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

      {deposits.length > 0 && (
        <div style={{ marginTop: '1rem' }}>
          <p className="label">Recent deposits</p>
          {deposits.map((d) => (
            <div
              key={d.id}
              className="form-row"
              style={{
                justifyContent: 'space-between',
                padding: '0.5rem 0',
                borderBottom: '1px solid var(--outline-variant)',
                fontSize: '0.8rem',
              }}
            >
              <span>{formatExactUsdt(d.amount_usdt)} USDT</span>
              <span style={{ color: 'var(--text-secondary)' }}>
                {DEPOSIT_STATUS_LABELS[d.status] ?? d.status}
              </span>
              <span style={{ color: 'var(--text-secondary)' }}>
                {timeAgo(new Date(d.created_at).getTime())}
              </span>
              <span style={{ color: 'var(--text-muted)' }}>{truncHash(d.tron_tx_id)}</span>
            </div>
          ))}
        </div>
      )}

      <PrivateKeyModal />
    </div>
  );
};

export default DepositPanel;
