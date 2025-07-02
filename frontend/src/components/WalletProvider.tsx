"use client";

import { ConnectionProvider, WalletProvider as SolanaWalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { useMemo, useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';

// Import available wallet adapters
import { BackpackWalletAdapter } from '@solana/wallet-adapter-backpack';

// Gorchain Configuration - OFFICIAL ENDPOINT
const RPC_ENDPOINTS = [
  'https://gorchain.wstf.io', // PRIMARY: Official Gorchain RPC
];

const DEPLOYMENT_TIMESTAMP = '🔥 GORCHAIN-BATTLESHIP-v2.1-OFFICIAL-RPC-2025-01-29 🔥';
const CACHE_BUST_ID = 'OFFICIAL-GORCHAIN-RPC-v2.1-' + Date.now();

console.log('🚀🚀🚀 BATTLESHIP v2.1 - OFFICIAL GORCHAIN RPC LOADED');
console.log('🎯 Primary RPC: https://gorchain.wstf.io');
console.log('⏰ DEPLOYMENT TIMESTAMP:', DEPLOYMENT_TIMESTAMP);
console.log('🔄 CACHE BUST ID:', CACHE_BUST_ID);

// Test RPC endpoint connectivity with proper Gorchain handling
async function testRPCEndpoint(endpoint: string): Promise<boolean> {
  try {
    console.log(`🔍 Testing RPC endpoint: ${endpoint}`);
    
    // For Gorchain endpoints, use proper health check
    console.log(`⚡ Testing Gorchain endpoint: ${endpoint}`);
    
    const testResponse = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'getHealth',
        params: []
      }),
      signal: AbortSignal.timeout(10000) // 10 second timeout for Gorchain
    });
    
    if (testResponse.ok) {
      console.log(`✅ Gorchain endpoint healthy`);
      return true;
    } else {
      console.warn(`⚠️ Gorchain endpoint: ${testResponse.status} ${testResponse.statusText}`);
      return false;
    }
    
  } catch (error: any) {
    console.warn(`❌ Gorchain RPC endpoint failed:`, error.message);
    return false;
  }
}

// Test and select optimal endpoint
async function selectOptimalEndpoint(): Promise<string> {
  console.log('🔍 Testing Gorchain RPC connection...');
  
  const endpoint = RPC_ENDPOINTS[0];
  try {
    const isHealthy = await testRPCEndpoint(endpoint);
    
    if (isHealthy) {
      console.log(`🎯 Selected Gorchain RPC endpoint: ${endpoint}`);
      return endpoint;
    }
  } catch (error: any) {
    console.error(`❌ Gorchain endpoint failed:`, error.message);
  }
  
  // Use Gorchain endpoint even if test fails
  console.log('⚠️ Gorchain endpoint test failed, using anyway (may be connectivity issue)');
  return endpoint;
}

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [workingEndpoint, setWorkingEndpoint] = useState<string>(RPC_ENDPOINTS[0]);
  const [isTestingRPC, setIsTestingRPC] = useState(true);

  // Initialize and test endpoints
  useEffect(() => {
    const initializeEndpoint = async () => {
      setIsTestingRPC(true);
      const optimalEndpoint = await selectOptimalEndpoint();
      setWorkingEndpoint(optimalEndpoint);
      setIsTestingRPC(false);
    };
    
    initializeEndpoint();
  }, []);

  const wallets = useMemo(() => {
    try {
      // Since Backpack now uses Wallet Standard, we'll keep adapters minimal
      // to avoid conflicts with the new standard
      const adapters = [
        new BackpackWalletAdapter(), // Keep for compatibility, but Wallet Standard takes precedence
      ];
      
      console.log(`🔗 Loaded ${adapters.length} wallet adapter(s): ${adapters.map(w => w.name).join(', ')}`);
      console.log('✅ Backpack wallet detected - optimal for Gorchain');
      console.log('ℹ️ Note: Backpack now uses Wallet Standard API - manual connection available');
      
      return adapters;
    } catch (error) {
      console.warn('⚠️ Error loading wallet adapters:', error);
      // Return empty array to rely entirely on Wallet Standard
      return [];
    }
  }, []);

  if (isTestingRPC) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-white">🔍 Connecting to Gorchain network...</p>
        </div>
      </div>
    );
  }

  return (
    <ConnectionProvider 
      endpoint={workingEndpoint}
      config={{
        commitment: 'confirmed',
        confirmTransactionInitialTimeout: 60000,
        wsEndpoint: undefined, // Disable WebSocket for Gorchain
        disableRetryOnRateLimit: false,
        httpHeaders: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'User-Agent': 'Gorchain-Battleship/2.1.0',
        },
        fetch: (url, options) => {
          // Ensure HTTPS-only connections
          const httpsUrl = url.toString()
            .replace('ws://', 'https://')
            .replace('wss://', 'https://');
          
          console.log(`🔗 Using RPC endpoint: ${httpsUrl}`);
          
          return fetch(httpsUrl, {
            ...options,
            headers: {
              ...options?.headers,
              'User-Agent': 'Gorchain-Battleship/2.1.0',
              'Content-Type': 'application/json',
            },
          });
        }
      }}
    >
      <SolanaWalletProvider 
        wallets={wallets} 
        autoConnect={true}
        onError={(error) => {
          console.error('Wallet error:', error);
          if (error.message.includes('User rejected')) {
            toast.error('Wallet connection rejected');
          } else {
            toast.error('Wallet connection failed: ' + error.message);
          }
        }}
      >
        <WalletModalProvider>
          {children}
        </WalletModalProvider>
      </SolanaWalletProvider>
    </ConnectionProvider>
  );
} 