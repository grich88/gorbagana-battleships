import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { WalletProvider } from '../components/WalletProvider';
import { Toaster } from 'react-hot-toast';

// Import Solana Wallet Adapter styles - REQUIRED for wallet buttons to display
import '@solana/wallet-adapter-react-ui/styles.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Gorbagana Battleship',
  description: 'Real $GOR token wagering on Gorbagana network - Battleship game rebuilt with proven patterns',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <WalletProvider>
          {children}
          <Toaster position="top-right" />
        </WalletProvider>
      </body>
    </html>
  );
} 