'use client';

import dynamic from 'next/dynamic';
import { Toaster } from 'react-hot-toast';
import { WalletProvider } from '../components/WalletProvider';

// Dynamically import the landing page component to avoid SSR issues
const LandingPage = dynamic(() => import('../components/LandingPage'), {
  ssr: false,
});

export default function Home() {
  return (
    <WalletProvider>
      <main>
        <LandingPage />
        <Toaster position="top-right" />
      </main>
    </WalletProvider>
  );
} 