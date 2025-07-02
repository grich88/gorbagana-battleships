'use client';

import React, { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import toast from 'react-hot-toast';
import { 
  Trash2, Truck, Waves, Compass, Target, Trophy, Users, 
  Gamepad2, Zap, Shield, Globe, ArrowRight, Play,
  ExternalLink, Gift, Droplets, Settings, Copy, Share2
} from 'lucide-react';

import BattleshipGame from './BattleshipGame';
import GorbaganaFaucet from './GorbaganaFaucet';
import GorbaganaInfo from './GorbaganaInfo';
import WalletBalance from './WalletBalance';
import PublicGamesLobby from './PublicGamesLobby';
import { GAME_MODES, GameMode } from '../lib/battleshipUtils';

// Simple wallet connect fallback component
const SimpleWalletButton: React.FC<{ style?: React.CSSProperties; className?: string }> = ({ style, className }) => {
  const { connect, wallet, wallets, select } = useWallet();
  
  const handleConnect = async () => {
    try {
      // Try to select Backpack wallet first
      const backpackWallet = wallets.find(w => w.adapter.name.toLowerCase().includes('backpack'));
      if (backpackWallet) {
        select(backpackWallet.adapter.name);
        await connect();
        toast.success('🎉 Wallet connected successfully!');
      } else {
        // Fallback to first available wallet
        if (wallets[0]) {
          select(wallets[0].adapter.name);
          await connect();
          toast.success('🎉 Wallet connected successfully!');
        } else {
          toast.error('❌ No wallets found! Please install Backpack wallet.');
        }
      }
    } catch (error: any) {
      console.error('Wallet connection error:', error);
      toast.error(`❌ Connection failed: ${error.message}`);
    }
  };

  return (
    <button
      onClick={handleConnect}
      style={style}
      className={`wallet-fallback-button ${className || ''}`}
    >
      🔗 Connect Wallet
    </button>
  );
};

const LandingPage: React.FC = () => {
  const { publicKey, connected, disconnect } = useWallet();
  const [selectedGameMode, setSelectedGameMode] = useState<GameMode>('standard');
  const [wagerAmount, setWagerAmount] = useState<number>(0.002);
  const [gameIdInput, setGameIdInput] = useState<string>('');
  const [showFullGame, setShowFullGame] = useState(false);
  const [isPublicGame, setIsPublicGame] = useState(false);
  const [showPublicLobby, setShowPublicLobby] = useState(false);

  // Check for game ID in URL params on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const gameId = urlParams.get('game') || urlParams.get('gameId') || urlParams.get('id');
      
      if (gameId) {
        setGameIdInput(gameId);
        toast.success(`🎯 Game ID detected: ${gameId.slice(0, 8)}...`);
      }
    }
  }, []);

  const startGame = (mode: GameMode) => {
    if (!publicKey) {
      toast.error('Please connect your wallet first!');
      return;
    }
    
    setSelectedGameMode(mode);
    localStorage.setItem('selectedGameMode', mode);
    localStorage.setItem('wagerAmount', wagerAmount.toString());
    
    setShowFullGame(true);
    toast.success(`🚛 Starting ${GAME_MODES[mode].name}!`);
  };

  const createNewGame = () => {
    if (!publicKey) {
      toast.error('Please connect your wallet first!');
      return;
    }
    
    // Store settings in localStorage so BattleshipGame can pick them up
    localStorage.setItem('selectedGameMode', selectedGameMode);
    localStorage.setItem('wagerAmount', wagerAmount.toString());
    localStorage.setItem('isPublicGame', isPublicGame.toString());
    
    setShowFullGame(true);
    toast.success(`🗑️ Deploying waste collection fleet!`);
  };

  const joinGameById = () => {
    if (!publicKey) {
      toast.error('Please connect your wallet first!');
      return;
    }
    
    if (!gameIdInput.trim()) {
      toast.error('Please enter a Collection ID!');
      return;
    }
    
    // Store the game ID in localStorage so BattleshipGame can pick it up
    localStorage.setItem('gameIdToJoin', gameIdInput);
    localStorage.setItem('selectedGameMode', selectedGameMode);
    localStorage.setItem('wagerAmount', wagerAmount.toString());
    
    setShowFullGame(true);
    toast.success(`🚛 Joining collection route: ${gameIdInput.slice(0, 8)}...`);
  };

  const handleJoinPublicGame = (gameId: string) => {
    // Store the game ID in localStorage so BattleshipGame can pick it up
    localStorage.setItem('gameIdToJoin', gameId);
    localStorage.setItem('selectedGameMode', selectedGameMode);
    localStorage.setItem('wagerAmount', wagerAmount.toString());
    
    setGameIdInput(gameId);
    setShowFullGame(true);
    toast.success(`🏆 Joining public waste collection!`);
  };

  // If user is in full game mode, show the complete game interface
  if (showFullGame) {
    return (
      <div className="relative">
        {/* Back to Landing Button */}
        <div className="fixed top-4 left-4 z-50">
          <button
            onClick={() => setShowFullGame(false)}
            className="bg-white/90 backdrop-blur-sm border border-gray-200 rounded-lg px-3 py-2 text-gray-700 hover:bg-white hover:shadow-lg transition-all duration-200 flex items-center gap-2"
          >
            <ArrowRight className="w-4 h-4 rotate-180" />
            Back to The Landfill
          </button>
        </div>
        
        <BattleshipGame />
      </div>
    );
  }

  // Copy current page URL to clipboard
  const copyGameLink = () => {
    const currentUrl = window.location.href;
    navigator.clipboard.writeText(currentUrl).then(() => {
      toast.success('🔗 Page link copied to clipboard!');
    }).catch((err) => {
      console.error('Failed to copy: ', err);
      toast.error('Failed to copy link');
    });
  };

  // Share game via Web Share API or fallback to copy
  const shareGame = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Gorbagana Trash Collection',
          text: 'Join me for an epic waste collection battle on the Gorbagana blockchain!',
          url: window.location.href,
        });
        toast.success('🎯 Game shared successfully!');
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          console.error('Error sharing:', err);
          copyGameLink(); // Fallback to copy
        }
      }
    } else {
      copyGameLink(); // Fallback for browsers without Web Share API
    }
  };

  // Enhanced gradient backgrounds
  const gradientBg = 'bg-gradient-to-br from-emerald-100 via-teal-50 to-blue-100';
  const cardBg = 'bg-white/80 backdrop-blur-sm';

  return (
    <div className={`min-h-screen ${gradientBg} relative overflow-hidden`}>
      {/* Floating Icons Animation */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-10 left-10 opacity-20 animate-bounce">
          <Trash2 className="w-8 h-8 text-green-600" />
        </div>
        <div className="absolute top-32 right-20 opacity-20 animate-pulse">
          <Truck className="w-6 h-6 text-emerald-600" />
        </div>
        <div className="absolute bottom-20 left-16 opacity-20 animate-bounce">
          <Trash2 className="w-10 h-10 text-teal-600" />
        </div>
        <div className="absolute bottom-40 right-10 opacity-20 animate-pulse">
          <Truck className="w-7 h-7 text-green-600" />
        </div>
      </div>

      <div className="relative z-10">
        {/* Enhanced Hero Section */}
        <section className="container mx-auto px-4 pt-8 pb-12">
          {/* Navigation Bar */}
          <nav className="flex justify-between items-center mb-12">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-r from-green-600 to-emerald-600 p-3 rounded-full shadow-lg">
                <Trash2 className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                  Gorbagana Trash Collection
                </h1>
                <p className="text-sm text-gray-600">Waste Management on the Blockchain</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              {/* Share Button */}
              <button
                onClick={shareGame}
                className="flex items-center gap-2 bg-white/80 backdrop-blur-sm border border-gray-200 rounded-lg px-3 py-2 text-gray-700 hover:bg-white hover:shadow-lg transition-all duration-200"
              >
                <Share2 className="w-4 h-4" />
                Share
              </button>

              {/* Wallet Connection */}
              <div className="wallet-connection-area">
                <WalletMultiButton className="!bg-gradient-to-r !from-green-600 !to-emerald-600 hover:!from-green-700 hover:!to-emerald-700 !border-0 !rounded-lg !font-semibold !text-white !transition-all !duration-200 !shadow-lg hover:!shadow-xl !px-6 !py-3" />
                
                {/* Fallback wallet button with extra visibility */}
                <div 
                  className="simple-wallet-fallback"
                  style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    zIndex: 9999,
                    padding: '12px 24px',
                    backgroundColor: '#10b981',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                    fontSize: '16px',
                    minWidth: '160px',
                    textAlign: 'center',
                  }}
                >
                  <SimpleWalletButton 
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'white',
                      fontSize: '16px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      width: '100%',
                    }}
                  />
                </div>
              </div>
            </div>
          </nav>

          {/* Main Content */}
          {connected ? (
            <div className="max-w-4xl mx-auto">
              {/* Connected User Welcome */}
              <div className={`${cardBg} rounded-2xl shadow-xl border border-white/20 p-8 mb-8`}>
                <div className="text-center">
                  <h2 className="text-3xl font-bold text-gray-800 mb-2">Welcome, Trash Captain! 🗑️</h2>
                  <p className="text-gray-600 mb-6">Choose your waste collection mode and start cleaning!</p>
                  
                  {/* Wallet Balance Display */}
                  <div className="mb-8">
                    <WalletBalance 
                      showWagerInput={true}
                      onWagerChange={setWagerAmount}
                      currentWager={wagerAmount}
                      className="max-w-md mx-auto"
                    />
                  </div>
                  
                  {/* Quick Action Buttons */}
                  <div className="grid md:grid-cols-2 gap-4 max-w-2xl mx-auto">
                    <button
                      onClick={() => startGame('standard')}
                      className="group bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-bold py-4 px-6 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 flex items-center justify-center gap-3"
                    >
                      <Play className="w-6 h-6" />
                      <span>🚛 Quick Collection</span>
                      <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </button>
                    
                    <button
                      onClick={() => setShowPublicLobby(!showPublicLobby)}
                      className="group bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold py-4 px-6 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 flex items-center justify-center gap-3"
                    >
                      <Trophy className="w-6 h-6" />
                      <span>🏆 Public Routes</span>
                      <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Show Public Lobby if expanded */}
              {showPublicLobby && (
                <div className="mb-8">
                  <PublicGamesLobby onJoinGame={handleJoinPublicGame} />
                </div>
              )}
            </div>
          ) : (
            <div className="max-w-4xl mx-auto text-center">
              {/* Not Connected State */}
              <div className={`${cardBg} rounded-2xl shadow-xl border border-white/20 p-12 mb-8`}>
                <div className="mb-8">
                  <div className="bg-gradient-to-r from-green-100 to-emerald-100 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Trash2 className="w-12 h-12 text-green-600" />
                  </div>
                  <h2 className="text-4xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent mb-4">
                    Welcome to The Landfill
                  </h2>
                  <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
                    Deploy your garbage trucks in strategic formations and compete in the ultimate waste collection battle on the Gorbagana blockchain!
                  </p>
                  
                  <div className="bg-red-100 border border-red-300 rounded-lg p-4 mb-6 max-w-lg mx-auto">
                    <p className="text-red-800 font-medium">🔗 Connect your wallet to start playing</p>
                  </div>
                </div>

                {/* Feature Highlights */}
                <div className="grid md:grid-cols-3 gap-6 mb-8">
                  <div className="text-center p-6 bg-white rounded-lg border border-gray-200">
                    <div className="bg-green-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Zap className="w-6 h-6 text-green-600" />
                    </div>
                    <h3 className="font-semibold text-gray-800 mb-2">Lightning Fast</h3>
                    <p className="text-sm text-gray-600">Quick waste collection battles powered by Gorbagana</p>
                  </div>

                  <div className="text-center p-6 bg-white rounded-lg border border-gray-200">
                    <div className="bg-emerald-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Shield className="w-6 h-6 text-emerald-600" />
                    </div>
                    <h3 className="font-semibold text-gray-800 mb-2">Secure</h3>
                    <p className="text-sm text-gray-600">Waste management battles with proven blockchain security</p>
                  </div>

                  <div className="text-center p-6 bg-white rounded-lg border border-gray-200">
                    <div className="bg-teal-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Trophy className="w-6 h-6 text-teal-600" />
                    </div>
                    <h3 className="font-semibold text-gray-800 mb-2">Competitive</h3>
                    <p className="text-sm text-gray-600">Win GOR tokens by outsmarting opponents in the landfill</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Game Mode Selection Section - Always Visible */}
        <section className="container mx-auto px-4 pb-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-800 mb-4">Choose Your Collection Route</h2>
            <p className="text-gray-600 text-lg">Each mode offers a unique waste management experience</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto mb-16">
            {Object.entries(GAME_MODES).map(([key, config]) => (
              <div
                key={key}
                className={`bg-white rounded-2xl shadow-xl border-2 overflow-hidden transition-all duration-300 hover:scale-105 hover:shadow-2xl ${
                  selectedGameMode === key ? 'border-green-500 ring-4 ring-green-200' : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                {/* Mode Header */}
                <div className={`p-6 text-center text-white ${
                  key === 'quick' 
                    ? 'bg-gradient-to-br from-green-500 to-green-600' 
                    : key === 'standard'
                    ? 'bg-gradient-to-br from-emerald-500 to-emerald-600'
                    : 'bg-gradient-to-br from-teal-500 to-teal-600'
                }`}>
                  <div className="text-5xl mb-3">
                    {key === 'quick' ? '🚛' : key === 'standard' ? '🗑️' : '🏭'}
                  </div>
                  <h3 className="text-2xl font-bold mb-2">{config.name}</h3>
                  <p className="text-sm opacity-90">{config.description}</p>
                </div>
                
                {/* Mode Details */}
                <div className="p-6">
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Collection Grid:</span>
                      <span className="font-semibold">{config.boardSize}×{config.boardSize}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Garbage Trucks:</span>
                      <span className="font-semibold">{config.fleet.length} types</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total Capacity:</span>
                      <span className="font-semibold">{config.totalShipSquares} units</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Collection Time:</span>
                      <span className="font-semibold">{config.estimatedTime}</span>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => setSelectedGameMode(key as GameMode)}
                    className={`w-full mt-4 py-3 px-4 rounded-lg font-semibold transition-all duration-200 ${
                      selectedGameMode === key
                        ? 'bg-green-600 text-white shadow-lg'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {selectedGameMode === key ? '✅ Selected' : 'Select Mode'}
                  </button>
                </div>
              </div>
            ))}
          </div>
          
          {/* Game Action Cards */}
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto mb-16">
            {/* Create New Game */}
            <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8">
              <div className="text-center mb-6">
                <div className="bg-gradient-to-r from-green-100 to-green-200 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Truck className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="text-2xl font-bold text-gray-800 mb-2">Launch New Collection</h3>
                <p className="text-gray-600">Deploy your garbage fleet and challenge the waste management pros</p>
              </div>
              
              <div className="space-y-4">
                <label className="flex items-center space-x-3 p-4 bg-green-50 rounded-lg border border-green-200 hover:bg-green-100 transition-colors cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isPublicGame}
                    onChange={(e) => setIsPublicGame(e.target.checked)}
                    className="w-4 h-4 text-green-600 bg-white border-gray-300 rounded focus:ring-green-500 focus:ring-2"
                  />
                  <span className="text-gray-700 font-medium">🌐 Public Collection (discoverable by others)</span>
                </label>
                
                <button
                  onClick={createNewGame}
                  disabled={!connected}
                  className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-bold py-4 px-6 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <Truck className="w-5 h-5" />
                  🗑️ Start Collection Route
                </button>
              </div>
            </div>

            {/* Join Existing Game */}
            <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8">
              <div className="text-center mb-6">
                <div className="bg-gradient-to-r from-emerald-100 to-emerald-200 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users className="w-8 h-8 text-emerald-600" />
                </div>
                <h3 className="text-2xl font-bold text-gray-800 mb-2">Join Collection Team</h3>
                <p className="text-gray-600">Enter a Collection ID to join an existing waste management operation</p>
              </div>
              
              <div className="space-y-4">
                <input
                  type="text"
                  placeholder="Enter Collection ID or paste invitation link"
                  value={gameIdInput}
                  onChange={(e) => setGameIdInput(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-200"
                />
                
                <button
                  onClick={joinGameById}
                  disabled={!connected || !gameIdInput.trim()}
                  className="w-full bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white font-bold py-4 px-6 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <Users className="w-5 h-5" />
                  🚛 Join Collection
                </button>
              </div>
            </div>
          </div>
          
          {/* Enhanced Info Sections */}
          <div className="max-w-4xl mx-auto mb-16">
            <GorbaganaInfo variant="detailed" />
          </div>
          
          {/* Get Started Section */}
          {!connected && (
            <div className="max-w-2xl mx-auto text-center">
              <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-xl p-8">
                <h3 className="text-2xl font-bold text-gray-800 mb-4">Ready to Start Collecting Trash? 🗑️</h3>
                <p className="text-gray-600 mb-6">
                  Connect your wallet, get some GOR tokens from the faucet, and deploy your waste management fleet!
                </p>
                
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="bg-white rounded-lg p-6 border border-yellow-200">
                    <div className="bg-yellow-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
                      <Droplets className="w-6 h-6 text-yellow-600" />
                    </div>
                    <h4 className="font-semibold text-gray-800 mb-2">Get Free GOR</h4>
                    <p className="text-sm text-gray-600 mb-3">Use the faucet to get test tokens</p>
                    <GorbaganaFaucet variant="button" className="w-full" />
                  </div>
                  
                  <div className="bg-white rounded-lg p-6 border border-yellow-200">
                    <div className="bg-green-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
                      <Trash2 className="w-6 h-6 text-green-600" />
                    </div>
                    <h4 className="font-semibold text-gray-800 mb-2">Learn The Rules</h4>
                    <p className="text-sm text-gray-600 mb-3">Strategic trash collection battles</p>
                    <button className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg transition-colors">
                      View Guide
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default LandingPage; 