// app/checkout/success/page.tsx
'use client';

import Link from 'next/link';

export default function CheckoutSuccessPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 p-6">
      <div className="bg-gray-800 rounded-2xl p-8 max-w-md w-full text-center">
        <div className="text-6xl mb-4">✅</div>
        <h1 className="text-2xl font-bold text-white mb-2">Betaling fullført!</h1>
        <p className="text-gray-400 mb-8">
          18+ Late Night er nå låst opp i 24 timer!
        </p>

        <Link
          href="/play"
          className="block w-full bg-purple-600 hover:bg-purple-700 text-white text-lg font-bold py-4 rounded-xl transition-colors"
        >
          Tilbake til spillet
        </Link>
      </div>
    </div>
  );
}
