import React, { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { Wallet, TrendingUp, TrendingDown, RefreshCw, DollarSign } from 'lucide-react';
import toast from 'react-hot-toast';
import { gorbaganaService } from '../lib/gorbaganaService';

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

  // Fetch balance using native Gorbagana service
  const fetchBalance = async () => {
    if (!publicKey || !connected) return;

    setLoading(true);
    try {
      console.log('🔗 Using RPC endpoint: https://rpc.gorbagana.wtf/');
      console.log('🎒 Configured wallets: [ \'Backpack\' ]');
      
      const service = await gorbaganaService.getInstance();
      const balanceResponse = await service.getBalance(publicKey.toString());
      
      // Convert raw balance to GOR (assuming 9 decimals)
      const gorBalance = balanceResponse.balance / Math.pow(10, 9);
      setBalance(gorBalance);
      
      console.log(`💰 Gorbagana balance fetched: ${balanceResponse.formatted}`);
    } catch (error) {
      console.error('Error fetching Gorbagana balance:', error);
      toast.error('Failed to fetch GOR balance');
      // Set balance to 0 on error instead of throwing
      setBalance(0);
    } finally {
      setLoading(false);
    }
  };

  // Auto-fetch balance on wallet connection
  useEffect(() => {
    if (connected && publicKey) {
      fetchBalance();
      
      // Set up polling for balance updates
      const interval = setInterval(fetchBalance, 10000); // Every 10 seconds
      return () => clearInterval(interval);
    }
  }, [connected, publicKey]);

  // Handle wager change
  const handleWagerChange = (amount: number) => {
    if (amount > balance) {
      toast.error(`Insufficient balance. You have ${balance.toFixed(4)} GOR`);
      return;
    }
    
    setWagerAmount(amount);
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
    <div className={`bg-gradient-to-r from-blue-50 to-teal-50 border border-blue-200 rounded-lg p-4 ${className}`}>
      {/* Balance Display */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-r from-blue-600 to-teal-600 p-2 rounded-full">
            <Wallet className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-sm text-gray-600">GOR Balance</p>
            <div className="flex items-center gap-2">
              {loading ? (
                <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
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
          className="p-2 text-gray-600 hover:text-blue-600 transition-colors"
          title="Refresh balance"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Wager Input Section */}
      {showWagerInput && (
        <div className="space-y-4">
          <div className="border-t border-blue-200 pt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Set Battle Wager
            </label>
            
            {/* Custom Amount Input */}
            <div className="relative mb-3">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <DollarSign className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type="number"
                step="0.01"
                min="0"
                max={balance}
                value={wagerAmount}
                onChange={(e) => handleWagerChange(parseFloat(e.target.value) || 0)}
                className="block w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="0.00"
              />
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                <span className="text-gray-500 text-sm">GOR</span>
              </div>
            </div>

            {/* Quick Amount Buttons */}
            <div className="grid grid-cols-5 gap-2 mb-3">
              {quickWagers.map((amount) => (
                <button
                  key={amount}
                  onClick={() => handleWagerChange(amount)}
                  disabled={amount > balance}
                  className={`px-2 py-1 rounded text-xs font-medium transition-all duration-200 ${
                    wagerAmount === amount
                      ? 'bg-blue-600 text-white'
                      : amount > balance
                      ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      : 'bg-white text-blue-600 border border-blue-200 hover:bg-blue-50'
                  }`}
                >
                  {amount}
                </button>
              ))}
            </div>

            {/* All-in Button */}
            <button
              onClick={() => handleWagerChange(balance)}
              disabled={balance <= 0}
              className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white py-2 px-4 rounded-lg font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              All-in ({balance.toFixed(4)} GOR)
            </button>

            {/* Wager Info */}
            {wagerAmount > 0 && (
              <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-center gap-2 text-yellow-800 text-sm">
                  <TrendingUp className="w-4 h-4" />
                  <span>
                    Battle wager: <strong>{wagerAmount.toFixed(4)} GOR</strong>
                  </span>
                </div>
                <p className="text-xs text-yellow-700 mt-1">
                  Winner takes {(wagerAmount * 2).toFixed(4)} GOR total
                </p>
              </div>
            )}
          </div>
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