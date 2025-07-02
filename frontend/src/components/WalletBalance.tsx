import React, { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { Wallet, RefreshCw, TrendingDown } from 'lucide-react';
import toast from 'react-hot-toast';

interface WalletBalanceProps {
  onWagerChange?: (amount: number) => void;
  currentWager?: number;
  showWagerInput?: boolean;
  className?: string;
}

const WalletBalance: React.FC<WalletBalanceProps> = ({ 
  onWagerChange, 
  currentWager = 0,
  showWagerInput = false,
  className = '' 
}) => {
  const { publicKey, connected } = useWallet();
  const [balance, setBalance] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [wagerAmount, setWagerAmount] = useState<number>(currentWager);
  const [wagerInput, setWagerInput] = useState<string>(currentWager > 0 ? currentWager.toString() : ''); // String for decimal input

  // Fetch GOR balance using backend proxy - fixes CORS and RPC issues
  const fetchBalance = async () => {
    if (!publicKey || !connected) return;

    setLoading(true);
    try {
      const walletAddress = publicKey.toString();
      console.log('💰 Fetching $GOR balance via backend proxy for:', walletAddress);
      
      // Use backend proxy to avoid CORS and RPC issues
      // Note: Using local backend until production deployment is updated with balance endpoint
      const backendUrl = 'http://localhost:3002';
      
      const response = await fetch(`${backendUrl}/api/balance/${walletAddress}`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('💰 Balance Response:', data);
      
      if (data.error && !data.gor) {
        throw new Error(data.error);
      }
      
      const gorBalance = data.gor || 0;
      setBalance(gorBalance);
      
      console.log(`💰 $GOR Balance: ${gorBalance.toFixed(6)} $GOR (${data.lamports} lamports) via ${data.endpoint}`);
      
      // Show warnings for demo/fallback balances
      if (data.demo) {
        console.log('⚠️ Using demo balance - Gorbagana network may be unavailable');
        if (data.status === 'network_unavailable') {
          toast('🌐 Gorbagana network unavailable - using demo $GOR balance', { 
            duration: 5000,
            icon: '⚠️'
          });
        }
      } else {
        console.log(`✅ Connected to ${data.network} - real $GOR balance detected`);
        if (data.network === 'Gorbagana') {
          toast.success('🎯 Connected to Gorbagana network!', { duration: 3000 });
        }
        
        // Warn about zero balance on real network
        if (gorBalance === 0) {
          toast.error('⚠️ Zero $GOR balance - you need $GOR tokens to play!');
        }
      }
      
    } catch (error) {
      console.error('❌ Failed to fetch $GOR balance via proxy:', error);
      // Set demo balance as fallback
      setBalance(0.99996);
      console.log('⚠️ Using fallback demo balance due to error');
      toast.error('⚠️ Balance service unavailable - using demo balance');
    } finally {
      setLoading(false);
    }
  };

  // Update input when currentWager prop changes
  useEffect(() => {
    setWagerAmount(currentWager);
    setWagerInput(currentWager > 0 ? currentWager.toString() : '');
  }, [currentWager]);

  // Auto-fetch balance on wallet connection
  useEffect(() => {
    if (connected && publicKey) {
      fetchBalance();
      
      // Set up polling for balance updates (reduced frequency for backend proxy)
      const interval = setInterval(fetchBalance, 60000); // Every 60 seconds
      return () => clearInterval(interval);
    }
  }, [connected, publicKey]);

  // Handle wager input change (for typing)
  const handleWagerInputChange = (value: string) => {
    // Allow empty string, numbers, and decimal point
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setWagerInput(value);
      
      // Convert to number and validate
      const numValue = parseFloat(value);
      if (!isNaN(numValue) && numValue >= 0) {
        if (numValue > balance) {
          toast.error(`Insufficient balance. You have ${balance.toFixed(4)} GOR`);
          return;
        }
        setWagerAmount(numValue);
        onWagerChange?.(numValue);
      } else if (value === '') {
        // Empty input = 0 wager
        setWagerAmount(0);
        onWagerChange?.(0);
      }
    }
  };

  // Handle wager change (for quick buttons)
  const handleWagerChange = (amount: number) => {
    if (amount > balance) {
      toast.error(`Insufficient balance. You have ${balance.toFixed(4)} GOR`);
      return;
    }
    
    setWagerAmount(amount);
    setWagerInput(amount.toString()); // Update input display
    onWagerChange?.(amount);
  };

  // Quick wager amounts
  const quickWagers = [0.1, 0.5, 1, 5, 10];

  if (!connected) {
    return (
      <div className={`bg-gray-100 rounded-lg p-4 ${className}`}>
        <div className="flex items-center gap-2 text-gray-500">
          <Wallet className="w-4 h-4" />
          <span className="text-sm">Connect wallet to see balance</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-4 ${className}`}>
      {/* Balance Display */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-r from-green-600 to-emerald-600 p-2 rounded-full">
            <Wallet className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-sm text-gray-600">GOR Balance</p>
            <div className="flex items-center gap-2">
              {loading ? (
                <RefreshCw className="w-4 h-4 animate-spin text-green-600" />
              ) : (
                <p className="text-lg font-bold text-gray-800">
                  {balance.toFixed(4)} GOR
                </p>
              )}
            </div>
          </div>
        </div>
        
        <button
          onClick={fetchBalance}
          disabled={loading}
          className="p-2 text-gray-600 hover:text-green-600 transition-colors"
          title="Refresh balance"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Wager Input Section */}
      {showWagerInput && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Set Waste Collection Wager
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-lg">$</span>
              <input
                type="text"
                value={wagerInput}
                onChange={(e) => handleWagerInputChange(e.target.value)}
                placeholder="0.002"
                className="w-full pl-8 pr-12 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-lg font-medium"
              />
              <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 font-medium">GOR</span>
            </div>
          </div>

          {/* Quick wager buttons */}
          <div className="flex flex-wrap gap-2">
            {quickWagers.map((amount) => (
              <button
                key={amount}
                onClick={() => handleWagerChange(amount)}
                disabled={amount > balance}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  amount > balance
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                }`}
              >
                {amount}
              </button>
            ))}
          </div>

          {/* All-in button */}
          <button
            onClick={() => handleWagerChange(balance)}
            disabled={balance === 0}
            className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-bold py-2.5 px-4 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            All-in ({balance.toFixed(4)} GOR)
          </button>
        </div>
      )}

      {/* Low Balance Warning */}
      {balance < 0.1 && (
        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center gap-2 text-red-800 text-sm">
            <TrendingDown className="w-4 h-4" />
            <span>Low balance - use faucet to get more GOR</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default WalletBalance; 