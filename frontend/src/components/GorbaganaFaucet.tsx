import React, { useState } from 'react';
import { Droplets, ExternalLink, Gift, Twitter } from 'lucide-react';
import { useWallet } from '@solana/wallet-adapter-react';
import toast from 'react-hot-toast';

interface GorbaganaFaucetProps {
  variant?: 'button' | 'card' | 'inline';
  className?: string;
}

const GorbaganaFaucet: React.FC<GorbaganaFaucetProps> = ({ 
  variant = 'button', 
  className = '' 
}) => {
  const { publicKey } = useWallet();
  const [isOpening, setIsOpening] = useState(false);

  const openFaucet = () => {
    setIsOpening(true);
    
    // Open faucet in new tab
    const faucetUrl = 'https://faucet.gorbagana.wtf/';
    const newTab = window.open(faucetUrl, '_blank', 'noopener,noreferrer');
    
    if (newTab) {
      toast.success('Opening Gorbagana Faucet in new tab', { 
        duration: 3000,
        icon: '🪙' 
      });
    } else {
      toast.error('Please allow popups to open the faucet');
    }
    
    setTimeout(() => setIsOpening(false), 1000);
  };

  const copyWalletAddress = () => {
    if (publicKey) {
      navigator.clipboard.writeText(publicKey.toString());
      toast.success('Wallet address copied to clipboard!', { icon: '📋' });
    }
  };

  if (variant === 'card') {
    return (
      <div className={`bg-gradient-to-br from-yellow-50 to-orange-50 border border-yellow-200 rounded-lg p-6 ${className}`}>
        <div className="flex items-start gap-4">
          <div className="bg-yellow-100 p-3 rounded-full">
            <Droplets className="w-6 h-6 text-yellow-600" />
          </div>
          
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-800 mb-2 flex items-center gap-2">
              <Gift className="w-5 h-5" />
              Need Testnet Tokens?
            </h3>
            
            <p className="text-gray-600 mb-4 text-sm leading-relaxed">
              Get free GOR tokens from the official Gorbagana Faucet. 
              Up to <strong>100 GOR</strong> depending on your X (Twitter) followers!
            </p>
            
            <div className="space-y-3">
              <div className="text-xs text-gray-500 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                  <span>1-100 GOR per request (based on followers)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                  <span>Rate limit: 1 request per 24 hours</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
                  <span>Requires X (Twitter) authentication</span>
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  onClick={openFaucet}
                  disabled={isOpening}
                  className="flex items-center justify-center gap-2 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white font-semibold py-2.5 px-4 rounded-lg transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
                >
                  {isOpening ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <Droplets className="w-4 h-4" />
                  )}
                  Get Free GOR Tokens
                  <ExternalLink className="w-3 h-3" />
                </button>
                
                {publicKey && (
                  <button
                    onClick={copyWalletAddress}
                    className="flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2.5 px-4 rounded-lg transition-colors text-sm"
                  >
                    📋 Copy Wallet Address
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'inline') {
    return (
      <div className={`flex items-center gap-3 ${className}`}>
        <div className="text-sm text-gray-600">Need testnet tokens?</div>
        <button
          onClick={openFaucet}
          disabled={isOpening}
          className="flex items-center gap-1.5 bg-yellow-500 hover:bg-yellow-600 text-white font-medium py-1.5 px-3 rounded-md transition-colors text-sm disabled:opacity-50"
        >
          {isOpening ? (
            <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          ) : (
            <Droplets className="w-3 h-3" />
          )}
          Faucet
          <ExternalLink className="w-2.5 h-2.5" />
        </button>
      </div>
    );
  }

  // Default button variant
  return (
    <button
      onClick={openFaucet}
      disabled={isOpening}
      className={`flex items-center gap-2 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white font-semibold py-2.5 px-4 rounded-lg transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:hover:scale-100 ${className}`}
    >
      {isOpening ? (
        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
      ) : (
        <Droplets className="w-4 h-4" />
      )}
      Get Free GOR
      <ExternalLink className="w-3 h-3" />
    </button>
  );
};

export default GorbaganaFaucet; 