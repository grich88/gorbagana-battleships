"use client";

import { ConnectionProvider, WalletProvider as SolanaWalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { clusterApiUrl } from '@solana/web3.js';
import { useMemo, useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { SHOW_DEBUG_INFO } from '../lib/config';

// GORBAGANA BATTLESHIP - Production Ready v2.0
// Using proven Gorbagana configuration from working Trash Tac Toe app

// Official Gorbagana RPC Configuration (from working app)
const RPC_ENDPOINTS = [
  'https://rpc.gorbagana.wtf/', // PRIMARY: Official Gorbagana RPC
  'https://api.devnet.solana.com', // FALLBACK: Only if Gorbagana unavailable
];

const DEPLOYMENT_TIMESTAMP = '🔥 BATTLESHIP-v2.0-REBUILT-' + new Date().toISOString();
console.log('🔥 GORBAGANA BATTLESHIP v2.0 - PRODUCTION REBUILD');
console.log('✅ Using proven patterns from working Trash Tac Toe app');
console.log('🌐 Official Gorbagana RPC:', RPC_ENDPOINTS[0]);
console.log('⏰ Deployment:', DEPLOYMENT_TIMESTAMP);

// Test RPC endpoint connectivity (from working app)
async function testRPCEndpoint(endpoint: string): Promise<boolean> {
  try {
    console.log(`🔍 Testing RPC endpoint: ${endpoint}`);
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'getHealth',
        params: []
      }),
      signal: AbortSignal.timeout(8000)
    });
    
    const isWorking = response.ok;
    console.log(`${isWorking ? '✅' : '❌'} ${endpoint}: ${response.status}`);
    return isWorking;
    
  } catch (error: any) {
    console.warn(`❌ RPC endpoint ${endpoint} failed:`, error.message);
    
    // For Gorbagana endpoints, be more lenient with timeouts
    if (endpoint.includes('gorbagana') && error.name === 'AbortError') {
      console.log(`⏰ Gorbagana endpoint ${endpoint} timed out, but will still try to use it`);
      return true;
    }
    
    return false;
  }
}

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [workingEndpoint, setWorkingEndpoint] = useState<string>(RPC_ENDPOINTS[0]);
  const [isTestingRPC, setIsTestingRPC] = useState(false);

  // Prevent wallet extension conflicts (from working app)
  useEffect(() => {
    const preventWalletConflicts = () => {
      if (typeof window === 'undefined') return;
      
      // Store reference to Backpack before other wallets override it
      const backpackWallet = window.solana?.isBackpack ? window.solana : null;
      
      // Handle Ethereum wallet conflicts
      if (window.ethereum && !window.ethereum.isBackpack) {
        console.log('⚠️ Non-Backpack ethereum wallet detected - potential conflict');
        (window as any).__ethereumConflictWarning = true;
      }
      
      // Ensure Backpack remains accessible
      if (backpackWallet) {
        Object.defineProperty(window, 'solana', {
          value: backpackWallet,
          writable: false,
          configurable: false
        });
        console.log('✅ Backpack wallet prioritized for Gorbagana');
      }
    };
    
    preventWalletConflicts();
    const timer = setTimeout(preventWalletConflicts, 3000);
    
    return () => clearTimeout(timer);
  }, []);

  // Test RPC endpoints on component mount (run once only)
  useEffect(() => {
    const testEndpoints = async () => {
      if (isTestingRPC) return;
      setIsTestingRPC(true);
      
      console.log('🔍 Testing RPC endpoints for best connection...');
      
      for (const endpoint of RPC_ENDPOINTS) {
        const isWorking = await testRPCEndpoint(endpoint);
        if (isWorking) {
          console.log(`✅ Using working endpoint: ${endpoint}`);
          setWorkingEndpoint(endpoint);
          toast.success(`Connected to ${endpoint.includes('gorbagana') ? 'Gorbagana' : 'Solana'}!`, { 
            id: 'rpc-connection',
            duration: 3000 
          });
          break;
        }
      }
      
      setIsTestingRPC(false);
    };
    
    testEndpoints();
  }, []); // Empty dependency array - run only once on mount

  // Connection configuration
  const endpoint = useMemo(() => {
    console.log('🌐 Active RPC endpoint:', workingEndpoint);
    return workingEndpoint;
  }, [workingEndpoint]);

  // Wallet configuration (simplified - Backpack focus)
  const wallets = useMemo(() => {
    // For production, focus on Backpack wallet which works best with Gorbagana
    console.log('🔧 Wallet adapters: Auto-detect available wallets');
    return [];
  }, []);

  if (isTestingRPC) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4"></div>
          <p className="text-white">🔍 Connecting to Gorbagana network...</p>
        </div>
      </div>
    );
  }

  return (
    <ConnectionProvider endpoint={endpoint}>
      <SolanaWalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          {children}
        </WalletModalProvider>
      </SolanaWalletProvider>
    </ConnectionProvider>
  );
} 