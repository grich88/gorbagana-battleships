'use client';

import React, { FC, ReactNode, useMemo, useState, useEffect } from 'react';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { BackpackWalletAdapter } from '@solana/wallet-adapter-backpack';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { clusterApiUrl, Connection, PublicKey } from '@solana/web3.js';
import { toast } from 'react-hot-toast';

// Import wallet adapter CSS
require('@solana/wallet-adapter-react-ui/styles.css');

// Import Gorbagana service
import { gorbaganaService } from '../lib/gorbaganaService';

type Props = {
  children: ReactNode;
};

// Gorbagana RPC Endpoints with fallbacks
// CACHE BUST v2.0 - ENHANCED RPC ENDPOINTS - 2025-01-29
// Multiple endpoints for better reliability and fallback support
const RPC_ENDPOINTS = [
  'https://rpc.gorbagana.wtf/', // PRIMARY: Official Gorbagana RPC
  'https://gorchain.wstf.io',   // SECONDARY: Alternative Gorbagana endpoint
  'https://api.devnet.solana.com', // FALLBACK: Solana devnet for testing
];

const DEPLOYMENT_TIMESTAMP = '🔥 BATTLESHIP-v2.0-ENHANCED-RPC-2025-01-29 🔥';
const CACHE_BUST_ID = 'ENHANCED-GORBAGANA-RPC-v2.0-' + Date.now();

console.log('🚀🚀🚀 BATTLESHIP v2.0 - ENHANCED RPC ENDPOINTS LOADED');
console.log('🎯 Primary RPC:', RPC_ENDPOINTS[0]);
console.log('⚡ Secondary RPC:', RPC_ENDPOINTS[1]);
console.log('🛡️ Fallback RPC:', RPC_ENDPOINTS[2]);
console.log('⏰ DEPLOYMENT TIMESTAMP:', DEPLOYMENT_TIMESTAMP);
console.log('🔄 CACHE BUST ID:', CACHE_BUST_ID);

// Test RPC endpoint connectivity with comprehensive error handling
async function testRPCEndpoint(endpoint: string): Promise<boolean> {
  try {
    // Skip Gorchain endpoint testing in development to avoid CORS spam
    if (endpoint.includes('gorchain')) {
      console.log(`⚠️ Skipping Gorchain endpoint in development (CORS restriction)`);
      return false;
    }

    console.log(`🔍 Testing RPC endpoint: ${endpoint}`);

    // For Gorbagana endpoints, try quick connectivity test
    if (endpoint.includes('gorbagana')) {
      console.log(`⚡ Testing Gorbagana endpoint: ${endpoint}`);

      // Try a simple HTTP request with shorter timeout
      const testResponse = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'getHealth',
          params: []
        }),
        signal: AbortSignal.timeout(2000) // Reduced to 2 second timeout
      });

      if (testResponse.ok) {
        console.log(`✅ Gorbagana endpoint healthy`);
        return true;
      } else {
        console.log(`⚠️ Gorbagana endpoint unavailable (status ${testResponse.status})`);
        return false;
      }
    }

    // For Solana endpoints, use Connection class with timeout
    const connection = new Connection(endpoint, 'confirmed');
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Timeout')), 3000)
    );
    
    const version = await Promise.race([
      connection.getVersion(),
      timeoutPromise
    ]);
    
    if (version) {
      console.log(`✅ Solana Devnet healthy`);
      return true;
    }
    
    return false;
  } catch (error: any) {
    // Only log meaningful errors, skip CORS spam
    if (error.message?.includes('CORS') || error.message?.includes('Failed to fetch')) {
      console.log(`⚠️ ${endpoint.includes('gorbagana') ? 'Gorbagana' : 'External'} endpoint: Network/CORS issue (expected in dev)`);
    } else if (error.message?.includes('Timeout')) {
      console.log(`⚠️ ${endpoint.includes('gorbagana') ? 'Gorbagana' : 'External'} endpoint: Timeout`);
    } else {
      console.log(`⚠️ ${endpoint.includes('gorbagana') ? 'Gorbagana' : 'External'} endpoint: Unavailable`);
    }
    return false;
  }
}

// Find the best available RPC endpoint
async function getBestRPCEndpoint(): Promise<string> {
  console.log('🔍 Testing RPC endpoints for optimal connection...');
  
  // Test endpoints in parallel for faster results
  const endpointTests = RPC_ENDPOINTS.map(async (endpoint) => ({
    endpoint,
    isHealthy: await testRPCEndpoint(endpoint)
  }));

  const results = await Promise.all(endpointTests);
  
  // Find first healthy endpoint
  const healthyEndpoint = results.find(result => result.isHealthy);
  
  if (healthyEndpoint) {
    console.log(`🎯 Selected optimal RPC endpoint: ${healthyEndpoint.endpoint}`);
    return healthyEndpoint.endpoint;
  }

  // If no endpoint is healthy, use the primary as fallback
  console.warn('⚠️ No RPC endpoints are responding, using primary as fallback');
  return RPC_ENDPOINTS[0];
}

// Wallet conflict detection
function detectWalletConflicts(): { hasConflicts: boolean; conflictingWallets: string[] } {
  const conflictingWallets: string[] = [];
  
  if (typeof window === 'undefined') {
    return { hasConflicts: false, conflictingWallets };
  }

  // Check for common wallet extensions that might conflict
  const walletChecks = [
    { name: 'Phantom', check: () => !!(window as any).phantom?.solana },
    { name: 'Solflare', check: () => !!(window as any).solflare },
    { name: 'Slope', check: () => !!(window as any).Slope },
    { name: 'Sollet', check: () => !!(window as any).sollet },
    { name: 'Coin98', check: () => !!(window as any).coin98?.solana },
    { name: 'Clover', check: () => !!(window as any).clover?.solana },
    { name: 'Backpack', check: () => !!(window as any).backpack?.solana },
  ];

  walletChecks.forEach(({ name, check }) => {
    if (check()) {
      conflictingWallets.push(name);
    }
  });

  const hasConflicts = conflictingWallets.length > 1;
  
  if (hasConflicts) {
    console.warn('⚠️ Multiple wallet extensions detected:', conflictingWallets);
    console.log('💡 For best experience, disable other wallets and use Backpack for Gorbagana');
  } else if (conflictingWallets.includes('Backpack')) {
    console.log('✅ Backpack wallet detected - optimal for Gorbagana');
  }

  return { hasConflicts, conflictingWallets };
}

const WalletContextProvider: FC<Props> = ({ children }) => {
  const [selectedEndpoint, setSelectedEndpoint] = useState<string>(RPC_ENDPOINTS[0]);
  const [walletConflicts, setWalletConflicts] = useState<{hasConflicts: boolean; conflictingWallets: string[]}>({
    hasConflicts: false,
    conflictingWallets: []
  });

  // Initialize optimal RPC endpoint and Gorbagana service
  useEffect(() => {
    const initializeRPC = async () => {
      try {
        const bestEndpoint = await getBestRPCEndpoint();
        setSelectedEndpoint(bestEndpoint);
        
        // Initialize Gorbagana service with the best endpoint
        if (bestEndpoint.includes('gorbagana') || bestEndpoint.includes('gorchain')) {
          console.log('🌐 Initializing Gorbagana service with endpoint:', bestEndpoint);
          gorbaganaService.switchEndpoint(bestEndpoint);
          
          // Test Gorbagana connection
          const isConnected = await gorbaganaService.testConnection();
          if (isConnected) {
            console.log('✅ Gorbagana service connected successfully');
          } else {
            console.warn('⚠️ Gorbagana service connection test failed');
          }
        }
        
        // Store selected endpoint for debugging
        if (typeof window !== 'undefined') {
          localStorage.setItem('gorbagana_battleship_rpc', bestEndpoint);
          localStorage.setItem('gorbagana_service_endpoint', bestEndpoint);
        }
      } catch (error) {
        console.error('Failed to initialize RPC endpoint:', error);
        // Fallback to primary
        setSelectedEndpoint(RPC_ENDPOINTS[0]);
      }
    };

    // Small delay to ensure browser environment is ready
    const timer = setTimeout(initializeRPC, 100);
    return () => clearTimeout(timer);
  }, []);

  // Check for wallet conflicts
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const checkConflicts = () => {
      const conflicts = detectWalletConflicts();
      setWalletConflicts(conflicts);

      if (conflicts.hasConflicts) {
        toast.error(
          `Multiple wallets detected: ${conflicts.conflictingWallets.join(', ')}. ` +
          'Please disable other wallet extensions for best experience.',
          { duration: 8000 }
        );
      }
    };

    // Check immediately and after a delay (wallets load asynchronously)
    checkConflicts();
    const delayedCheck = setTimeout(checkConflicts, 2000);
    
    return () => clearTimeout(delayedCheck);
  }, []);

  // Memoized endpoint
  const endpoint = useMemo(() => {
    console.log(`🔗 Using RPC endpoint: ${selectedEndpoint}`);
    return selectedEndpoint;
  }, [selectedEndpoint]);

  // Wallet configuration with enhanced Backpack support
  const wallets = useMemo(() => {
    const walletAdapters = [
      // Prioritize Backpack for Gorbagana
      new BackpackWalletAdapter(),
    ];

    console.log('🎒 Configured wallets:', walletAdapters.map(w => w.name));
    
    return walletAdapters;
  }, []);

  // Enhanced connection provider with retry logic
  const connectionConfig = useMemo(() => ({
    commitment: 'confirmed' as const,
    confirmTransactionInitialTimeout: 30000, // 30 seconds
    wsEndpoint: selectedEndpoint.replace('https://', 'wss://').replace('http://', 'ws://'),
  }), [selectedEndpoint]);

  return (
    <ConnectionProvider endpoint={endpoint} config={connectionConfig}>
      <WalletProvider 
        wallets={wallets} 
        autoConnect={true}
        onError={(error) => {
          console.error('Wallet error:', error);
          
          // Handle specific wallet errors
          if (error.message?.includes('User rejected')) {
            toast.error('Wallet connection was rejected by user');
          } else if (error.message?.includes('not found')) {
            toast.error('Please install Backpack wallet for optimal Gorbagana experience');
          } else {
            toast.error(`Wallet error: ${error.message || 'Unknown error'}`);
          }
        }}
      >
        <WalletModalProvider>
          {/* Debug info for development */}
          {process.env.NODE_ENV === 'development' && (
            <div style={{
              position: 'fixed',
              top: 0,
              right: 0,
              background: 'rgba(0,0,0,0.8)',
              color: 'white',
              padding: '8px',
              fontSize: '12px',
              zIndex: 9999,
              maxWidth: '300px'
            }}>
              <div>RPC: {selectedEndpoint.replace('https://', '').substring(0, 20)}...</div>
              <div>Wallets: {walletConflicts.conflictingWallets.join(', ') || 'None'}</div>
              {walletConflicts.hasConflicts && (
                <div style={{ color: 'orange' }}>⚠️ Conflicts detected</div>
              )}
            </div>
          )}
          {children}
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
};

export default WalletContextProvider; 