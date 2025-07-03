"use client";

// GORBAGANA BATTLESHIP - Production Ready v2.0
// Built using proven patterns from working Trash Tac Toe app
// Real $GOR transactions on Gorbagana network

import { useState, useEffect } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { toast } from 'react-hot-toast';
import { 
  PublicKey, 
  LAMPORTS_PER_SOL,
  Connection,
  Transaction,
  SystemProgram,
  Keypair
} from '@solana/web3.js';

// Import the main battleship game component
import BattleshipGame from './battleship-game';

export default function Home() {
  // Use the simple, focused game component pattern that works
  return <BattleshipGame />;
} 