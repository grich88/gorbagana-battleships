import React, { useState, useEffect } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { Wallet, TrendingUp, TrendingDown, RefreshCw, DollarSign } from 'lucide-react';
import toast from 'react-hot-toast';

interface WalletBalanceProps {
  onWagerChange?: (amount: number) => void;
  currentWager?: number;
  showWagerInput?: boolean;
  className?: string;
}

// GOR token mint address on Gorbagana (you might need to update this)
const GOR_TOKEN_MINT = 'GorVayjRZyNqnYPzqnjXCqKDrJEEGhZfYY6FHWJ2XMVJ'; // Example - needs to be the actual GOR mint

const WalletBalance: React.FC<WalletBalanceProps> = ({ 
  onWagerChange, 
  currentWager = 0,
  showWagerInput = false,
  className = '' 
}) => {
  const { publicKey, connected } = useWallet();
  const { connection } = useConnection();
  const [balance, setBalance] = useState<number>(0);
  const [solBalance, setSolBalance] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [wagerAmount, setWagerAmount] = useState<number>(currentWager);
  const [wagerInput, setWagerInput] = useState<string>(currentWager > 0 ? currentWager.toString() : ''); // String for decimal input

  // Fetch both SOL and GOR token balance
  const fetchBalance = async () => {
    if (!publicKey || !connected) return;

    setLoading(true);
    try {
      console.log('🔗 Using RPC endpoint: https://rpc.gorbagana.wtf/');
      console.log('🎒 Configured wallets: [ \'Backpack\' ]');
      
      // Get SOL balance (for gas fees)
      const lamports = await connection.getBalance(publicKey);
      const solBal = lamports / LAMPORTS_PER_SOL;
      setSolBalance(solBal);
      
      // Try to get GOR token balance
      let gorBalance = 0;
      
      try {
        // Get all token accounts for this wallet
        const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
          publicKey,
          {
            programId: TOKEN_PROGRAM_ID,
          }
        );
        
        console.log(`🔍 Found ${tokenAccounts.value.length} token accounts`);
        
        // Look for GOR token account
        for (const tokenAccount of tokenAccounts.value) {
          const tokenInfo = tokenAccount.account.data.parsed.info;
          console.log(`🪙 Token found: ${tokenInfo.mint}, Balance: ${tokenInfo.tokenAmount.uiAmount}`);
          
          // Check if this is a GOR token (you might need to adjust this logic)
          if (tokenInfo.mint === GOR_TOKEN_MINT || 
              tokenInfo.tokenAmount.uiAmount > 0) { // For now, take any token with balance
            gorBalance = tokenInfo.tokenAmount.uiAmount || 0;
            console.log(`💰 GOR token found! Balance: ${gorBalance}`);
            break;
          }
        }
        
        // If no specific GOR token found, but we have tokens, use the first one with balance
        if (gorBalance === 0 && tokenAccounts.value.length > 0) {
          for (const tokenAccount of tokenAccounts.value) {
            const tokenInfo = tokenAccount.account.data.parsed.info;
            if (tokenInfo.tokenAmount.uiAmount > 0) {
              gorBalance = tokenInfo.tokenAmount.uiAmount;
              console.log(`💰 Using token balance: ${gorBalance} from mint ${tokenInfo.mint}`);
              break;
            }
          }
        }
        
      } catch (tokenError) {
        console.log('ℹ️ No token accounts found or error fetching tokens:', tokenError);
        // Fallback: if no tokens, check if the SOL balance should be treated as GOR
        if (solBal > 0) {
          gorBalance = solBal;
          console.log(`💰 Using SOL balance as GOR: ${gorBalance}`);
        }
      }
      
      setBalance(gorBalance);
      console.log(`💰 Final GOR balance: ${gorBalance.toFixed(6)} GOR`);
      console.log(`💰 SOL balance: ${solBal.toFixed(6)} SOL`);
      
    } catch (error) {
      console.error('Error fetching balances:', error);
      toast.error('Failed to fetch balance');
      setBalance(0);
      setSolBalance(0);
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
      
      // Set up polling for balance updates
      const interval = setInterval(fetchBalance, 10000); // Every 10 seconds
      return () => clearInterval(interval);
    }
  }, [connected, publicKey, connection]);

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
                <div className="space-y-1">
                  <p className="text-lg font-bold text-gray-800">
                    {balance.toFixed(4)} GOR
                  </p>
                  {solBalance > 0 && (
                    <p className="text-xs text-gray-500">
                      ({solBalance.toFixed(4)} SOL for gas)
                    </p>
                  )}
                </div>
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
                type="text"
                inputMode="decimal"
                value={wagerInput}
                onChange={(e) => handleWagerInputChange(e.target.value)}
                className="block w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter amount (e.g. 0.002)"
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