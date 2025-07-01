import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Battleship on Gorbagana',
  description: 'Fully on-chain Battleships game with commit-reveal scheme on Gorbagana testnet',
  keywords: ['battleship', 'solana', 'gorbagana', 'blockchain', 'game', 'anchor'],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {children}
      </body>
    </html>
  );
} 