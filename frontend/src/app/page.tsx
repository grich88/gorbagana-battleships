'use client';

import dynamic from 'next/dynamic';
import { Toaster } from 'react-hot-toast';
import { WalletProvider } from '../components/WalletProvider';

// Dynamically import the game component to avoid SSR issues
const BattleshipGame = dynamic(() => import('../components/BattleshipGame'), {
  ssr: false,
});

export default function Home() {
  return (
    <WalletProvider>
      <main>
        <BattleshipGame />
        <Toaster position="top-right" />
      </main>
    </WalletProvider>
  );
} 