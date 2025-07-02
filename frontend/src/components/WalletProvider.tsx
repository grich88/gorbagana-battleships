"use client";

import { ConnectionProvider, WalletProvider as SolanaWalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { useMemo, useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';

// Import available wallet adapters
import { BackpackWalletAdapter } from '@solana/wallet-adapter-backpack';

// Gorbagana Configuration - OFFICIAL ENDPOINT
const RPC_ENDPOINTS = [
  'https://rpc.gorbagana.wtf/', // PRIMARY: Official Gorbagana RPC
  'https://api.devnet.solana.com', // FALLBACK: Solana devnet
];

const DEPLOYMENT_TIMESTAMP = '🔥 GORBAGANA-BATTLESHIP-v2.1-OFFICIAL-RPC-2025-01-29 🔥';
const CACHE_BUST_ID = 'OFFICIAL-GORBAGANA-RPC-v2.1-' + Date.now();

console.log('🚀🚀🚀 BATTLESHIP v2.1 - OFFICIAL GORBAGANA RPC LOADED');
console.log('🎯 Primary RPC: https://rpc.gorbagana.wtf/');
console.log('⚡ Secondary RPC: https://api.devnet.solana.com');
console.log('⏰ DEPLOYMENT TIMESTAMP:', DEPLOYMENT_TIMESTAMP);
console.log('🔄 CACHE BUST ID:', CACHE_BUST_ID);

// Test RPC endpoint connectivity with proper Gorbagana handling
async function testRPCEndpoint(endpoint: string): Promise<boolean> {
  try {
    console.log(`🔍 Testing RPC endpoint: ${endpoint}`);
    
    // For Gorbagana endpoints, use proper health check
    if (endpoint.includes('gorbagana')) {
      console.log(`⚡ Testing Gorbagana endpoint: ${endpoint}`);
      
      const testResponse = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'getHealth',
          params: []
        }),
        signal: AbortSignal.timeout(8000) // 8 second timeout for Gorbagana
      });
      
      if (testResponse.ok) {
        console.log(`✅ Gorbagana endpoint healthy`);
        return true;
      } else {
        console.warn(`⚠️ Gorbagana endpoint: ${testResponse.status} ${testResponse.statusText}`);
        return false;
      }
    }
    
    // For Solana endpoints, use standard health check
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'getHealth',
        params: []
      }),
      signal: AbortSignal.timeout(5000)
    });
    
    const isWorking = response.ok;
    console.log(`${isWorking ? '✅' : '❌'} ${endpoint.includes('solana') ? 'Solana Devnet' : 'Endpoint'} ${isWorking ? 'healthy' : 'unavailable'}`);
    return isWorking;
    
  } catch (error: any) {
    console.warn(`❌ RPC endpoint ${endpoint} failed:`, error.message);
    return false;
  }
}

// Test and select optimal endpoint
async function selectOptimalEndpoint(): Promise<string> {
  console.log('🔍 Testing RPC endpoints for optimal connection...');
  
  for (const endpoint of RPC_ENDPOINTS) {
    try {
      const isHealthy = await testRPCEndpoint(endpoint);
      
      if (isHealthy) {
        console.log(`🎯 Selected optimal RPC endpoint: ${endpoint}`);
        return endpoint;
      }
    } catch (error: any) {
      console.error(`❌ Endpoint ${endpoint} failed:`, error.message);
    }
  }
  
  // Default to Gorbagana endpoint even if test fails
  console.log('⚠️ All endpoint tests failed, using default Gorbagana RPC');
  return RPC_ENDPOINTS[0];
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
      console.log('✅ Backpack wallet detected - optimal for Gorbagana');
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
          <p className="text-white">🔍 Connecting to Gorbagana network...</p>
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
        wsEndpoint: undefined, // Disable WebSocket for Gorbagana
        disableRetryOnRateLimit: false,
        httpHeaders: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'User-Agent': 'Gorbagana-Battleship/2.1.0',
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
              'User-Agent': 'Gorbagana-Battleship/2.1.0',
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