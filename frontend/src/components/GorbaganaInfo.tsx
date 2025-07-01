import React, { useState } from 'react';
import { Info, Wallet, Network, Zap, Shield, Globe, ChevronDown, ChevronUp } from 'lucide-react';

interface GorbaganaInfoProps {
  variant?: 'compact' | 'full';
  className?: string;
}

const GorbaganaInfo: React.FC<GorbaganaInfoProps> = ({ 
  variant = 'compact', 
  className = '' 
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (variant === 'compact') {
    return (
      <div className={`bg-gradient-to-br from-blue-50 to-teal-50 border border-blue-200 rounded-lg p-4 ${className}`}>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex items-center justify-between text-left"
        >
          <div className="flex items-center gap-3">
            <div className="bg-blue-100 p-2 rounded-full">
              <Info className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-800">About Gorbagana Network</h3>
              <p className="text-sm text-gray-600">Click to learn more about the blockchain powering this game</p>
            </div>
          </div>
          {isExpanded ? (
            <ChevronUp className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          )}
        </button>
        
        {isExpanded && (
          <div className="mt-4 pt-4 border-t border-blue-200 space-y-4">
            <div className="grid md:grid-cols-2 gap-4 text-sm">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Network className="w-4 h-4 text-blue-600" />
                  <span className="font-medium">Fast & Scalable</span>
                </div>
                <p className="text-gray-600 text-xs">Built for gaming with high throughput and low latency</p>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-teal-600" />
                  <span className="font-medium">Low Gas Fees</span>
                </div>
                <p className="text-gray-600 text-xs">Minimal transaction costs for seamless gameplay</p>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-green-600" />
                  <span className="font-medium">Secure</span>
                </div>
                <p className="text-gray-600 text-xs">Enterprise-grade security for your assets</p>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-purple-600" />
                  <span className="font-medium">Solana Compatible</span>
                </div>
                <p className="text-gray-600 text-xs">Built on proven Solana architecture</p>
              </div>
            </div>
            
            <div className="bg-white rounded-lg p-3 border border-blue-200">
              <h4 className="font-medium text-gray-800 mb-2 flex items-center gap-2">
                <Wallet className="w-4 h-4" />
                Wallet Setup for Testnet
              </h4>
              <div className="space-y-2 text-xs text-gray-600">
                <div className="flex items-start gap-2">
                  <span className="bg-blue-100 text-blue-800 rounded-full w-5 h-5 flex items-center justify-center font-bold text-xs">1</span>
                  <span>Install <strong>Backpack Wallet</strong> browser extension</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="bg-blue-100 text-blue-800 rounded-full w-5 h-5 flex items-center justify-center font-bold text-xs">2</span>
                  <span>Create a new wallet or import existing</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="bg-blue-100 text-blue-800 rounded-full w-5 h-5 flex items-center justify-center font-bold text-xs">3</span>
                  <span>Connect to this game and get free GOR tokens from the faucet</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="bg-blue-100 text-blue-800 rounded-full w-5 h-5 flex items-center justify-center font-bold text-xs">4</span>
                  <span>Start playing! Each game transaction uses minimal GOR</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Full variant
  return (
    <div className={`bg-gradient-to-br from-blue-50 to-teal-50 border border-blue-200 rounded-xl p-8 ${className}`}>
      <div className="text-center mb-8">
        <div className="bg-gradient-to-r from-blue-600 to-teal-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
          <Globe className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-3xl font-bold text-gray-800 mb-2">Welcome to Gorbagana</h2>
        <p className="text-gray-600 max-w-2xl mx-auto">
          Experience the future of blockchain gaming on a network built for speed, security, and seamless gameplay.
        </p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="text-center p-6 bg-white rounded-lg border border-blue-200">
          <div className="bg-blue-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4">
            <Zap className="w-6 h-6 text-blue-600" />
          </div>
          <h3 className="font-semibold text-gray-800 mb-2">Lightning Fast</h3>
          <p className="text-sm text-gray-600">Sub-second transaction finality for real-time gaming</p>
        </div>

        <div className="text-center p-6 bg-white rounded-lg border border-teal-200">
          <div className="bg-teal-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4">
            <Network className="w-6 h-6 text-teal-600" />
          </div>
          <h3 className="font-semibold text-gray-800 mb-2">Scalable</h3>
          <p className="text-sm text-gray-600">Thousands of transactions per second capacity</p>
        </div>

        <div className="text-center p-6 bg-white rounded-lg border border-green-200">
          <div className="bg-green-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4">
            <Shield className="w-6 h-6 text-green-600" />
          </div>
          <h3 className="font-semibold text-gray-800 mb-2">Secure</h3>
          <p className="text-sm text-gray-600">Battle-tested security with proven consensus</p>
        </div>

        <div className="text-center p-6 bg-white rounded-lg border border-purple-200">
          <div className="bg-purple-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4">
            <Wallet className="w-6 h-6 text-purple-600" />
          </div>
          <h3 className="font-semibold text-gray-800 mb-2">User Friendly</h3>
          <p className="text-sm text-gray-600">Familiar Solana wallet integration</p>
        </div>
      </div>

      <div className="bg-white rounded-xl p-6 border border-blue-200">
        <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
          <Wallet className="w-5 h-5" />
          Quick Wallet Setup Guide
        </h3>
        
        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h4 className="font-semibold text-gray-700">For New Users:</h4>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center font-bold text-sm">1</div>
                <div>
                  <p className="font-medium text-gray-800">Install Backpack Wallet</p>
                  <p className="text-sm text-gray-600">Download from Chrome Web Store or backpack.app</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center font-bold text-sm">2</div>
                <div>
                  <p className="font-medium text-gray-800">Create New Wallet</p>
                  <p className="text-sm text-gray-600">Follow the setup wizard and save your seed phrase securely</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center font-bold text-sm">3</div>
                <div>
                  <p className="font-medium text-gray-800">Connect to Game</p>
                  <p className="text-sm text-gray-600">Click "Connect Wallet" button above</p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="space-y-4">
            <h4 className="font-semibold text-gray-700">Getting Testnet Tokens:</h4>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="bg-teal-500 text-white rounded-full w-6 h-6 flex items-center justify-center font-bold text-sm">1</div>
                <div>
                  <p className="font-medium text-gray-800">Use the Faucet</p>
                  <p className="text-sm text-gray-600">Click any "Get Free GOR" button in this app</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="bg-teal-500 text-white rounded-full w-6 h-6 flex items-center justify-center font-bold text-sm">2</div>
                <div>
                  <p className="font-medium text-gray-800">Authenticate with X</p>
                  <p className="text-sm text-gray-600">Login with Twitter/X for verification</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="bg-teal-500 text-white rounded-full w-6 h-6 flex items-center justify-center font-bold text-sm">3</div>
                <div>
                  <p className="font-medium text-gray-800">Receive GOR Tokens</p>
                  <p className="text-sm text-gray-600">Get 1-100 GOR based on your followers (once per 24h)</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="mt-6 p-4 bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-gray-700">
            <strong>💡 Pro Tip:</strong> Testnet tokens have no real value and are for testing only. 
            Each game costs minimal GOR, so a small faucet amount goes a long way!
          </p>
        </div>
      </div>
    </div>
  );
};

export default GorbaganaInfo; 