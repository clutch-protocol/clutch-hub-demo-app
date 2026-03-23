import React, { useState, useCallback } from 'react';
import { ClutchHubSdk } from 'clutch-hub-sdk-js';
import { API_URL } from '../config';
import TransactionHistory from './TransactionHistory';

function truncAddr(addr) {
  if (!addr || addr.length < 12) return addr || '';
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function normAddr(a) {
  if (!a) return '';
  const s = String(a).trim().toLowerCase();
  return s.startsWith('0x') ? s : `0x${s}`;
}

function CopyableAddress({ address }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(address).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    });
  };
  return (
    <span
      className="truncate-address"
      onClick={handleCopy}
      title={address}
      style={{ cursor: 'pointer' }}
    >
      {copied ? 'Copied!' : truncAddr(address)}
    </span>
  );
}

const ActiveTripCard = ({ trip, passengerPayment, cancelAction }) => {
  const farePaid = trip.farePaid ?? trip.fare_paid ?? 0;
  const totalFare = trip.fare;
  const remaining = Math.max(0, totalFare - farePaid);

  const [payAmount, setPayAmount] = useState('');
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState(null);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState(null);

  const showPayUi =
    passengerPayment?.userProfile?.publicKey &&
    normAddr(passengerPayment.userProfile.publicKey) === normAddr(trip.passengerAddress) &&
    remaining > 0;

  const canCancel =
    cancelAction?.userProfile?.publicKey &&
    remaining > 0 &&
    (normAddr(cancelAction.userProfile.publicKey) === normAddr(trip.passengerAddress) ||
      normAddr(cancelAction.userProfile.publicKey) === normAddr(trip.driverAddress));

  const handlePay = useCallback(async () => {
    if (!passengerPayment?.userProfile?.publicKey) return;
    const amount = Number(payAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setPayError('Enter a positive amount.');
      return;
    }
    if (amount > remaining) {
      setPayError(`Amount cannot exceed remaining ${remaining} CLT.`);
      return;
    }
    setPaying(true);
    setPayError(null);
    try {
      const { publicKey, privateKey } = passengerPayment.userProfile;
      const sdk = new ClutchHubSdk(API_URL, publicKey);
      const unsignedTx = await sdk.createUnsignedRidePay({
        rideAcceptanceTxHash: trip.txHash,
        fare: Math.floor(amount),
      });
      let pk = privateKey;
      if (!pk) {
        pk = window.prompt('Enter your private key to sign the payment:');
        if (!pk) {
          setPayError('Signing cancelled.');
          setPaying(false);
          return;
        }
      }
      const signature = await sdk.signTransaction(unsignedTx, pk);
      await sdk.submitTransaction(signature.rawTransaction);
      TransactionHistory.addTransaction(publicKey, {
        type: 'Ride Pay',
        timestamp: Date.now(),
        fare: Math.floor(amount),
        status: 'success',
        txHash: signature.txHash || '',
      });
      setPayAmount('');
      passengerPayment.onSuccess?.();
    } catch (err) {
      console.error(err);
      setPayError(err.message || 'Payment failed');
      TransactionHistory.addTransaction(passengerPayment.userProfile.publicKey, {
        type: 'Ride Pay',
        timestamp: Date.now(),
        fare: Math.floor(Number(payAmount) || 0),
        status: 'failed',
        error: err.message,
      });
    } finally {
      setPaying(false);
    }
  }, [passengerPayment, payAmount, remaining, trip.txHash]);

  const setQuickPay = (fraction) => {
    const v = Math.max(1, Math.floor(remaining * fraction));
    setPayAmount(String(Math.min(v, remaining)));
  };

  const handleCancel = useCallback(async () => {
    if (!cancelAction?.userProfile?.publicKey || remaining <= 0) return;
    if (!window.confirm('Cancel this ride? Unpaid fare will be refunded to the passenger.')) return;
    setCancelling(true);
    setCancelError(null);
    try {
      const { publicKey, privateKey } = cancelAction.userProfile;
      const sdk = new ClutchHubSdk(API_URL, publicKey);
      const unsignedTx = await sdk.createUnsignedRideCancel({
        rideAcceptanceTxHash: trip.txHash,
      });
      let pk = privateKey;
      if (!pk) {
        pk = window.prompt('Enter your private key to sign the cancellation:');
        if (!pk) {
          setCancelError('Signing cancelled.');
          setCancelling(false);
          return;
        }
      }
      const signature = await sdk.signTransaction(unsignedTx, pk);
      await sdk.submitTransaction(signature.rawTransaction);
      TransactionHistory.addTransaction(publicKey, {
        type: 'Ride Cancel',
        timestamp: Date.now(),
        status: 'success',
        txHash: signature.txHash || '',
      });
      cancelAction.onSuccess?.();
    } catch (err) {
      console.error(err);
      setCancelError(err.message || 'Cancel failed');
      TransactionHistory.addTransaction(cancelAction.userProfile.publicKey, {
        type: 'Ride Cancel',
        timestamp: Date.now(),
        status: 'failed',
        error: err.message,
      });
    } finally {
      setCancelling(false);
    }
  }, [cancelAction, remaining, trip.txHash]);

  const puLat = trip.pickupLocation.latitude;
  const puLng = trip.pickupLocation.longitude;
  const doLat = trip.dropoffLocation.latitude;
  const doLng = trip.dropoffLocation.longitude;

  return (
    <div className="card active-trip-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.875rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <span className="trip-status">
          <span className="status-dot status-dot--live" />
          In Progress
        </span>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.25rem' }}>
          <span className="fare-badge">{totalFare} CLT total</span>
          {farePaid > 0 && (
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Paid {farePaid} CLT
              {remaining > 0 ? ` · ${remaining} CLT left` : ''}
            </span>
          )}
        </div>
      </div>

      {remaining > 0 && (
        <div
          className="trip-progress-bar"
          style={{
            height: 6,
            borderRadius: 4,
            background: 'var(--surface-container-low)',
            marginBottom: '0.875rem',
            overflow: 'hidden',
          }}
        >
          <div
            className="trip-progress-fill"
            style={{
              height: '100%',
              width: `${Math.min(100, (farePaid / totalFare) * 100)}%`,
              background: 'linear-gradient(90deg, var(--primary-dim), var(--primary), var(--tertiary))',
              transition: 'width 0.3s ease',
            }}
          />
        </div>
      )}

      <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '0 0 0.875rem 0', lineHeight: 1.5 }}>
        Route: pickup {puLat.toFixed(4)}, {puLng.toFixed(4)} → dropoff {doLat.toFixed(4)}, {doLng.toFixed(4)}
      </p>

      <div className="trip-details-grid">
        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.8 }}>
          <div>Driver: <CopyableAddress address={trip.driverAddress} /></div>
          <div>Passenger: <CopyableAddress address={trip.passengerAddress} /></div>
        </div>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'right', lineHeight: 1.8 }}>
          <div title={trip.txHash}>Acceptance: <CopyableAddress address={trip.txHash} /></div>
          <div title={trip.rideOfferTxHash}>Offer: <CopyableAddress address={trip.rideOfferTxHash} /></div>
        </div>
      </div>

      {showPayUi && (
        <div style={{ marginTop: '1rem', paddingTop: '1rem' }}>
          <p className="card-title" style={{ marginBottom: '0.5rem' }}>Pay driver (partial OK)</p>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '0 0 0.75rem 0' }}>
            Pay in portions as the ride progresses. Up to <strong>{remaining} CLT</strong> remaining.
          </p>
          <div className="form-row" style={{ marginBottom: '0.5rem', flexWrap: 'wrap' }}>
            <input
              type="number"
              min={1}
              max={remaining}
              value={payAmount}
              onChange={(e) => setPayAmount(e.target.value)}
              className="input-field"
              style={{ width: 120 }}
              placeholder="Amount"
            />
            <button type="button" className="btn-secondary" style={{ fontSize: '0.75rem' }} onClick={() => setQuickPay(0.25)}>
              25%
            </button>
            <button type="button" className="btn-secondary" style={{ fontSize: '0.75rem' }} onClick={() => setQuickPay(0.5)}>
              50%
            </button>
            <button type="button" className="btn-secondary" style={{ fontSize: '0.75rem' }} onClick={() => setPayAmount(String(remaining))}>
              Remaining
            </button>
            <button
              type="button"
              className="btn-primary"
              style={{ fontSize: '0.8rem' }}
              disabled={paying || !payAmount}
              onClick={handlePay}
            >
              {paying ? 'Paying…' : 'Pay'}
            </button>
          </div>
          {payError && <div className="status-banner error" style={{ padding: '0.5rem', fontSize: '0.8rem' }}>{payError}</div>}
        </div>
      )}

      {!showPayUi && remaining > 0 && (
        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '0.75rem 0 0 0' }}>
          {farePaid > 0 ? `Passenger has paid ${farePaid} / ${totalFare} CLT.` : 'Awaiting passenger payment.'}
        </p>
      )}

      {canCancel && (
        <div style={{ marginTop: '1rem', paddingTop: '1rem' }}>
          <button
            type="button"
            className="btn-secondary"
            style={{ fontSize: '0.8rem', color: 'var(--error)' }}
            disabled={cancelling}
            onClick={handleCancel}
          >
            {cancelling ? 'Cancelling…' : 'Cancel ride'}
          </button>
          {cancelError && <div className="status-banner error" style={{ padding: '0.5rem', fontSize: '0.8rem', marginTop: '0.5rem' }}>{cancelError}</div>}
        </div>
      )}
    </div>
  );
};

export default ActiveTripCard;
