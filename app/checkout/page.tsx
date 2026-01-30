// app/checkout/page.tsx
'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { Suspense, useState } from 'react';

function CheckoutContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const cid = searchParams.get('cid');
  const [isProcessing, setIsProcessing] = useState(false);

  const handlePay = async () => {
    if (!cid || isProcessing) return;
    setIsProcessing(true);

    await fetch('/api/game', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'checkoutPaid', cid }),
    });

    router.push(`/checkout/success?cid=${cid}`);
  };

  const handleCancel = async () => {
    if (!cid || isProcessing) return;
    setIsProcessing(true);

    await fetch('/api/game', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'checkoutCanceled', cid }),
    });

    router.push(`/checkout/cancel?cid=${cid}`);
  };

  if (!cid) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 p-6">
        <div className="bg-gray-800 rounded-2xl p-8 max-w-md w-full text-center">
          <p className="text-red-400">Ugyldig checkout-lenke</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 p-6">
      <div className="bg-gray-800 rounded-2xl p-8 max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="text-4xl mb-2">🔞</div>
          <h1 className="text-2xl font-bold text-white mb-1">Betaling</h1>
          <p className="text-gray-400">18+ Late Night</p>
        </div>

        {/* Price */}
        <div className="bg-gray-700 rounded-xl p-4 mb-6 text-center">
          <p className="text-gray-400 text-sm">Totalt</p>
          <p className="text-3xl font-bold text-white">69 kr</p>
        </div>

        {/* Payment methods (visual only) */}
        <div className="mb-6">
          <p className="text-gray-400 text-sm mb-3">Velg betalingsmetode:</p>
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-gray-700 rounded-lg p-3 text-center border-2 border-blue-500">
              <span className="text-2xl">📱</span>
              <p className="text-white text-sm mt-1">Vipps</p>
            </div>
            <div className="bg-gray-700 rounded-lg p-3 text-center border border-gray-600">
              <span className="text-2xl">🍎</span>
              <p className="text-white text-sm mt-1">Apple Pay</p>
            </div>
            <div className="bg-gray-700 rounded-lg p-3 text-center border border-gray-600">
              <span className="text-2xl">🔵</span>
              <p className="text-white text-sm mt-1">Google Pay</p>
            </div>
            <div className="bg-gray-700 rounded-lg p-3 text-center border border-gray-600">
              <span className="text-2xl">💳</span>
              <p className="text-white text-sm mt-1">Kort</p>
            </div>
          </div>
        </div>

        {/* Simulated notice */}
        <div className="bg-yellow-900/30 border border-yellow-500/50 rounded-lg p-3 mb-6 text-center">
          <p className="text-yellow-400 text-xs">
            ⚠️ Dette er en simulert betaling for testing
          </p>
        </div>

        {/* Buttons */}
        <div className="flex flex-col gap-3">
          <button
            onClick={handlePay}
            disabled={isProcessing}
            className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white text-lg font-bold py-4 rounded-xl transition-colors"
          >
            {isProcessing ? 'Behandler...' : 'Betal (simulert)'}
          </button>
          <button
            onClick={handleCancel}
            disabled={isProcessing}
            className="w-full bg-gray-700 hover:bg-gray-600 disabled:bg-gray-600 text-white text-lg font-semibold py-3 rounded-xl transition-colors"
          >
            Avbryt
          </button>
        </div>
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <p className="text-gray-400">Laster...</p>
      </div>
    }>
      <CheckoutContent />
    </Suspense>
  );
}
