// app/checkout/cancel/page.tsx
'use client';

import Link from 'next/link';

export default function CheckoutCancelPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 p-6">
      <div className="bg-gray-800 rounded-2xl p-8 max-w-md w-full text-center">
        <div className="text-6xl mb-4">❌</div>
        <h1 className="text-2xl font-bold text-white mb-2">Betaling avbrutt</h1>
        <p className="text-gray-400 mb-8">
          Du kan prøve igjen fra TV-skjermen.
        </p>

        <Link
          href="/play"
          className="block w-full bg-gray-700 hover:bg-gray-600 text-white text-lg font-bold py-4 rounded-xl transition-colors"
        >
          Tilbake
        </Link>
      </div>
    </div>
  );
}
