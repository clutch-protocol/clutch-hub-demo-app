import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ClutchHubSdk } from 'clutch-hub-sdk-js';
import { API_URL, CHAIN_ID, IS_TESTNET, ORCHESTRATOR_BASE_URL } from '../config';
import { usePrivateKeyRequest } from './layout/usePrivateKeyRequest.jsx';
import { parseUsdToClt, formatExactUsdt } from '../utils/money';

/** GET/POST /api/v1/deposits poll cadence while a deposit is open (task: "poll every 5s"). */
const DEPOSIT_POLL_MS = 5000;

const STATUS_LABEL = {
  created: 'Waiting for payment',
  invoiced: 'Waiting for payment',
  paying: 'Payment detected, confirming…',
  confirmed: 'Confirmed, minting CLT…',
  mint_requested: 'Minting CLT…',
  credited: 'Credited',
  expired: 'Expired',
  failed: 'Failed',
  needs_manual: 'Needs manual review',
};

const DONE_STATUSES = new Set(['credited', 'expired', 'failed', 'needs_manual']);

function statusBannerType(status) {
  if (status === 'credited') return 'success';
  if (status === 'expired' || status === 'failed' || status === 'needs_manual') return 'error';
  return 'info';
}

/** Click-to-copy for the full exact amount / address — NOT `truncAddr`'d like ActiveTripCard's
 * CopyableAddress, because truncating the one value that must be pasted exactly defeats the point. */
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
 * "Top up with USDT": create a deposit intent, show the exact discriminated pay_amount_usdt and
 * the shared custody address, then poll until the treasury mints CLT.
 *
 * Deposits never sign a transaction (unlike Burn/withdraw): the private key is needed only to
 * obtain a hub JWT via `sdk.getAuthHeaders()` (`generateToken` requires a signed ownership
 * challenge), same trap CLAUDE.md documents for `createUnsigned*` calls.
 *
 * Redemptions/withdrawals are deliberately out of scope — the treasury's payout rail is a stub.
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
        <li>Come back, enter an amount, and pay the address this panel gives you.</li>
      </ol>
      <p style={{ marginBottom: 0 }}>
        Send <strong>only Nile USDT (TRC-20)</strong>. Mainnet USDT, TRX, or any other token sent to
        a deposit address will not be credited and cannot be returned.
      </p>
    </div>
  </details>
);

const DepositPanel = ({ userProfile, onCredited }) => {
  const [amountInput, setAmountInput] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState(null);
  const [deposit, setDeposit] = useState(null); // latest GET /deposits/:id body
  const pollRef = useRef(null);
  /**
   * Idempotency key for the CURRENT attempt — deliberately NOT regenerated per click.
   *
   * A fresh UUID on every submit defeats the mechanism entirely: if the first POST succeeds but
   * the response is lost (timeout, refresh, impatient double-click), a new key makes the server
   * treat the retry as a brand-new deposit — a second intent, a second live invoice, and another
   * of the 999 discriminator slots for that amount consumed. Held steady, the retry replays the
   * original response instead, which is exactly what the header is for.
   *
   * Reset only when the user abandons or finishes an attempt, so a genuinely new deposit gets a
   * genuinely new key.
   */
  const idempotencyKeyRef = useRef(null);

  const { PrivateKeyModal, requestPrivateKey } = usePrivateKeyRequest();

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  useEffect(() => stopPolling, [stopPolling]);

  const pollOnce = useCallback(async (id, headers) => {
    try {
      const res = await fetch(`${ORCHESTRATOR_BASE_URL}/api/v1/deposits/${id}`, { headers });
      if (!res.ok) return;
      const body = await res.json();
      // GET /deposits/:id has no `pay_address` field (it's not stored on the row — the create
      // response is the only place it's echoed back). Merge onto the create-time state rather
      // than replacing it, or the address would disappear the moment the first poll lands.
      setDeposit((prev) => ({ ...prev, ...body }));
      if (DONE_STATUSES.has(body.status)) {
        stopPolling();
        if (body.status === 'credited') onCredited?.();
      }
    } catch {
      // transient network error — next tick retries, no need to surface this mid-poll
    }
  }, [onCredited, stopPolling]);

  const handleCreate = useCallback(async (e) => {
    e.preventDefault();
    setCreateError(null);
    let amountClt;
    try {
      amountClt = parseUsdToClt(amountInput);
      if (amountClt <= 0n) throw new Error('enter an amount greater than 0');
    } catch (err) {
      setCreateError(err.message || 'invalid amount');
      return;
    }

    // One key per ATTEMPT, minted on the first submit and kept across retries.
    if (!idempotencyKeyRef.current) idempotencyKeyRef.current = crypto.randomUUID();

    setCreating(true);
    try {
      const { publicKey, privateKey } = userProfile;
      let pk = privateKey;
      if (!pk) {
        pk = await requestPrivateKey('Enter your private key to authorize this deposit:');
        if (!pk) {
          setCreateError('Signing cancelled.');
          setCreating(false);
          return;
        }
      }
      const sdk = new ClutchHubSdk(API_URL, publicKey, pk, CHAIN_ID);
      const authHeaders = await sdk.getAuthHeaders();
      const headers = {
        ...authHeaders,
        'Content-Type': 'application/json',
        'Idempotency-Key': idempotencyKeyRef.current,
      };
      // amount_usdt is a bare JSON number on the wire (Rust i64, not a string — confirmed against
      // payment-orchestrator's own request tests). Safe as Number() here because deposits are
      // bounds-checked server-side to $1-$50 (min/max_deposit_usdt), nowhere near 2^53.
      const res = await fetch(`${ORCHESTRATOR_BASE_URL}/api/v1/deposits`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ clt_address: publicKey, amount_usdt: Number(amountClt) }),
      });
      const body = await res.json();
      if (!res.ok) {
        throw new Error(body.error || `deposit request failed (${res.status})`);
      }
      setDeposit(body);
      stopPolling();
      pollRef.current = setInterval(() => pollOnce(body.id, authHeaders), DEPOSIT_POLL_MS);
    } catch (err) {
      setCreateError(err.message || 'Failed to create deposit');
    } finally {
      setCreating(false);
    }
  }, [amountInput, userProfile, requestPrivateKey, pollOnce, stopPolling]);

  const handleReset = () => {
    stopPolling();
    idempotencyKeyRef.current = null; // a new deposit is a new attempt, so a new key
    setDeposit(null);
    setAmountInput('');
    setCreateError(null);
  };

  return (
    <div className="card">
      <h3 className="card-title">Top up with USDT</h3>

      {IS_TESTNET && <TestnetFaucetGuide />}

      {!deposit && (
        <form onSubmit={handleCreate}>
          <label className="label" htmlFor="depositAmount">Amount (USD)</label>
          <div className="form-row">
            <input
              id="depositAmount"
              className="input-field"
              type="text"
              inputMode="decimal"
              placeholder="5.00"
              value={amountInput}
              onChange={(e) => setAmountInput(e.target.value)}
              disabled={creating}
              style={{ maxWidth: '10rem' }}
            />
            <button type="submit" className="btn-primary" disabled={creating || !amountInput.trim()}>
              {creating ? 'Creating…' : 'Continue'}
            </button>
          </div>
          {createError && <div className="status-banner error" style={{ marginTop: '0.75rem' }}>{createError}</div>}
        </form>
      )}

      {deposit && (
        <div>
          <div className={`status-banner ${statusBannerType(deposit.status)}`}>
            {STATUS_LABEL[deposit.status] || deposit.status}
          </div>

          {/* Address first, because the address IS the identity: it is derived for this deposit
              alone and nothing else is paid into it. The amount used to carry that job, via a
              fractional discriminator, and this panel used to lead with it and demand an exact
              payment. Both are gone. */}
          <p className="label">Pay to address</p>
          <div className="form-row" style={{ marginBottom: '0.35rem' }}>
            <CopyableValue value={deposit.pay_address} className="wallet-address" />
          </div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
            This address belongs to this deposit only. Send <strong>USDT (TRC-20)</strong> — any
            other token or network sent here cannot be recovered.
          </p>

          <p className="label">Amount</p>
          <div className="form-row" style={{ marginBottom: '0.35rem', alignItems: 'baseline' }}>
            <CopyableValue value={formatExactUsdt(deposit.pay_amount_usdt)} className="wallet-balance" />
            <span style={{ color: 'var(--text-muted)' }}>USDT</span>
          </div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
            A minimum, not an exact figure. Send more and the extra is credited too, and several
            transfers add up. Send less and the deposit waits for the rest.
          </p>

          {deposit.expires_at && !DONE_STATUSES.has(deposit.status) && (
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Expires at {new Date(deposit.expires_at).toLocaleTimeString()}
            </p>
          )}

          {DONE_STATUSES.has(deposit.status) && (
            <button type="button" className="btn-secondary" onClick={handleReset} style={{ marginTop: '0.75rem' }}>
              {deposit.status === 'credited' ? 'Top up again' : 'Try again'}
            </button>
          )}
        </div>
      )}

      <PrivateKeyModal />
    </div>
  );
};

export default DepositPanel;
