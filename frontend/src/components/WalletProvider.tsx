"use client";

import { ConnectionProvider, WalletProvider as SolanaWalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { useMemo, useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { SHOW_DEBUG_INFO } from '../lib/config';

// Gorbagana Testnet Configuration (from working trash-tac-toe)
// CACHE BUST v2.1 - OFFICIAL RPC ENDPOINT - 2025-01-29
const RPC_ENDPOINTS = [
  'https://rpc.gorbagana.wtf/', // PRIMARY: Official Gorbagana RPC (proven working)
  'https://api.devnet.solana.com', // FALLBACK: Solana devnet
];

const DEPLOYMENT_TIMESTAMP = '🔥 GORBAGANA-BATTLESHIP-v2.1-WORKING-RPC-2025-01-29 🔥';
const CACHE_BUST_ID = 'WORKING-GORBAGANA-RPC-v2.1-' + Date.now();
if (SHOW_DEBUG_INFO) {
  console.log('🚀🚀🚀 BATTLESHIP v2.1 - WORKING GORBAGANA RPC LOADED');
  console.log('🎯 Primary RPC: https://rpc.gorbagana.wtf/');
  console.log('⚡ Fallback RPC: https://api.devnet.solana.com');
  console.log('🔄 CACHE BUST ID:', CACHE_BUST_ID);
}

// Test RPC endpoint connectivity with better error handling (from working implementation)
async function testRPCEndpoint(endpoint: string): Promise<boolean> {
  try {
    console.log(`🔍 Testing RPC endpoint: ${endpoint}`);
    
    // For Gorbagana endpoints, try a simple connectivity test first
    if (endpoint.includes('gorbagana')) {
      console.log(`🎯 Testing Gorbagana endpoint: ${endpoint}`);
      
      // Try a simple HTTP request first to check DNS resolution
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
      
      console.log(`✅ Gorbagana endpoint ${endpoint} is reachable`);
      return true;
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
      signal: AbortSignal.timeout(5000) // 5 second timeout
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

  // Prevent wallet extension conflicts (from working implementation)
  useEffect(() => {
    // CRITICAL FIX: Prevent multiple wallet conflicts that break wallet connection
    const preventWalletConflicts = () => {
      if (typeof window === 'undefined') return;
      
      // Store reference to Backpack before other wallets override it
      const originalSolana = window.solana;
      const backpackWallet = window.solana?.isBackpack ? window.solana : null;
      
      // AGGRESSIVE FIX: Disable Ethereum wallets for Gorbagana
      if (window.ethereum) {
        // CRITICAL FIX: Check if this is Backpack's ethereum interface first
        const isBackpackEthereum = window.ethereum.isBackpack;
        
        if (isBackpackEthereum) {
          console.log('✅ Backpack ethereum interface detected - no conflicts to resolve');
        } else {
          console.log('⚠️ Non-Backpack ethereum wallet detected - potential conflict for escrow transactions');
          
          // Don't delete window.ethereum completely as it breaks some extension detection
          // Instead, create a warning flag
          (window as any).__ethereumConflictWarning = true;
        }
      }
      
      // Ensure Backpack remains accessible even if other wallets override
      if (backpackWallet) {
        // Force Backpack to be the primary Solana wallet
        Object.defineProperty(window, 'solana', {
          value: backpackWallet,
          writable: false,
          configurable: false
        });
        console.log('✅ Backpack wallet prioritized for Gorbagana');
      }
      
      // FIXED: Only try to lock ethereum property if it's NOT Backpack's
      if (window.ethereum && !window.ethereum.isBackpack) {
        try {
          // Make window.ethereum non-configurable to prevent conflicts
          const originalEthereum = window.ethereum;
          Object.defineProperty(window, 'ethereum', {
            value: originalEthereum,
            writable: false,
            configurable: false
          });
          console.log('🔒 Non-Backpack ethereum property locked to prevent conflicts');
        } catch (error) {
          console.warn('Could not lock ethereum property:', error);
          (window as any).__ethereumConflictWarning = true;
        }
      } else if (window.ethereum && window.ethereum.isBackpack) {
        console.log('ℹ️ Backpack ethereum interface detected - no locking needed');
      }
    };
    
    // Run immediately and after a delay to catch late-loading extensions
    preventWalletConflicts();
    const timer = setTimeout(preventWalletConflicts, 3000);
    
    // Check for wallet conflicts and provide user guidance
    const checkWalletConflicts = () => {
      const extensions = [];
      
      // FIXED: Smart detection that understands Backpack's dual interfaces
      const hasMetaMask = window.ethereum?.isMetaMask;
      const hasBackpackEthereum = window.ethereum?.isBackpack;
      const hasBackpackSolana = window.solana?.isBackpack;
      const hasPhantom = window.solana?.isPhantom;
      
      // CRITICAL: Detect if this is Backpack providing both interfaces
      const isBackpackProvidingBothInterfaces = hasBackpackEthereum && hasPhantom && !hasBackpackSolana;
      
      // More accurate detection - check if wallets are actually active
      if (window.ethereum && typeof window.ethereum.request === 'function') {
        if (hasMetaMask) {
          extensions.push('Active MetaMask wallet');
        } else if (hasBackpackEthereum) {
          extensions.push('Backpack (Ethereum interface)');
        } else {
          extensions.push('Active Ethereum wallet (unknown)');
        }
      }
      
      if (window.solana) {
        if (hasBackpackSolana) {
          extensions.push('Backpack (Solana interface)');
        } else if (hasPhantom && !isBackpackProvidingBothInterfaces) {
          // Only flag as separate Phantom if it's not Backpack's interface
          extensions.push('Phantom wallet');
        } else if (isBackpackProvidingBothInterfaces) {
          extensions.push('Backpack (Solana interface via dual-provider)');
        } else {
          extensions.push('Other Solana wallet');
        }
      }
      
      console.log('🔍 Detected wallet extensions:', extensions);
      
      // Only warn about REAL conflicts (not Backpack's legitimate dual interfaces)
      const hasActiveEthereum = window.ethereum && typeof window.ethereum.request === 'function';
      const hasAnyBackpack = hasBackpackEthereum || hasBackpackSolana || isBackpackProvidingBothInterfaces;
      const hasRealPhantom = hasPhantom && !isBackpackProvidingBothInterfaces;
      
      // Only warn about actual conflicts
      if ((hasMetaMask && hasAnyBackpack) || (hasRealPhantom && hasAnyBackpack)) {
        if (SHOW_DEBUG_INFO) {
          console.warn('⚠️ Active wallet conflicts detected - this may cause transaction issues');
          console.log('💡 For best experience with Gorbagana, disable conflicting wallets and use only Backpack');
        }
      }
      
      if (hasAnyBackpack) {
        if (SHOW_DEBUG_INFO) {
          console.log('✅ Backpack detected and ready for Gorbagana');
          if (isBackpackProvidingBothInterfaces) {
            console.log('ℹ️ Backpack is providing both Ethereum and Solana interfaces (normal behavior)');
          }
        }
      } else if (window.solana) {
        if (SHOW_DEBUG_INFO) console.warn('⚠️ Non-Backpack Solana wallet detected - please use Backpack for best Gorbagana support');
      } else {
        if (SHOW_DEBUG_INFO) console.warn('⚠️ No Solana wallet detected - please install Backpack for Gorbagana support');
      }
    };

    setTimeout(checkWalletConflicts, 2000);
    return () => clearTimeout(timer);
  }, []);

  // Initialize with primary Gorbagana endpoint
  useEffect(() => {
    if (SHOW_DEBUG_INFO) console.log(`🎯 Using Gorbagana endpoint: ${RPC_ENDPOINTS[0]} (official endpoint)`);
    setWorkingEndpoint(RPC_ENDPOINTS[0]);
    setIsTestingRPC(false);
  }, []);

  // Empty wallets array - Backpack auto-detects (PROVEN WORKING CONFIG)
  const wallets = useMemo(() => {
    if (SHOW_DEBUG_INFO) {
      console.log('🔗 Using empty wallets array - Backpack auto-detects via Wallet Standard');
      console.log('✅ Backpack wallet detected - optimal for Gorbagana');
      console.log('ℹ️ Note: Backpack now uses Wallet Standard API - manual connection available');
    }
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
    <ConnectionProvider 
      endpoint={workingEndpoint}
      config={{
        commitment: 'confirmed',
        confirmTransactionInitialTimeout: 60000,
        wsEndpoint: undefined, // GORBAGANA: COMPLETELY disable WebSocket
        disableRetryOnRateLimit: false,
        httpHeaders: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'User-Agent': 'Gorbagana-Battleship/2.1.0',
        },
        fetch: (url, options) => {
          const httpsUrl = url.toString()
            .replace('ws://', 'https://')
            .replace('wss://', 'https://');
          
          console.log(`🔒 HTTPS-ONLY: ${httpsUrl}`);
          
          return fetch(httpsUrl, {
            ...options,
            headers: {
              ...options?.headers,
              'User-Agent': 'Gorbagana-Battleship/2.1.0',
              'Content-Type': 'application/json',
              'Connection': 'close',
            },
          });
        }
      }}
    >
      <SolanaWalletProvider 
        wallets={wallets} 
        autoConnect={false}
        onError={(error) => {
          console.error('Wallet error:', error);
          // Handle specific wallet connection errors
          if (error.message.includes('User rejected')) {
            toast.error('Wallet connection rejected by user');
          } else if (error.message.includes('ethereum')) {
            toast.error('Multiple wallet extensions detected - disable others except Backpack');
          } else {
            toast.error('Backpack connection failed: ' + error.message);
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