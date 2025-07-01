'use client';

import dynamic from 'next/dynamic';
import { Toaster } from 'react-hot-toast';
import WalletContextProvider from '../components/WalletProvider';

// Dynamically import the game component to avoid SSR issues
const BattleshipGame = dynamic(() => import('../components/BattleshipGame'), {
  ssr: false,
});

export default function Home() {
  return (
    <WalletContextProvider>
      <main>
        <BattleshipGame />
        <Toaster position="top-right" />
      </main>
    </WalletContextProvider>
  );
} 