import type { Metadata } from 'next';
import { Bangers } from 'next/font/google';
import './globals.css';

const bangers = Bangers({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-bangers',
});

export const metadata: Metadata = {
  title: 'HVEM I STUA ?',
  description: 'Party game for venner',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="no" className={bangers.variable}>
      <body className="min-h-screen bg-gray-900 text-white">
        {children}
      </body>
    </html>
  );
}
