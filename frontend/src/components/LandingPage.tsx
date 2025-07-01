'use client';

import React, { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import toast from 'react-hot-toast';
import { 
  Anchor, Ship, Waves, Compass, Target, Trophy, Users, 
  Gamepad2, Zap, Shield, Globe, ArrowRight, Play,
  ExternalLink, Gift, Droplets, Settings, Copy, Share2
} from 'lucide-react';

import BattleshipGame from './BattleshipGame';
import GorbaganaFaucet from './GorbaganaFaucet';
import GorbaganaInfo from './GorbaganaInfo';
import WalletBalance from './WalletBalance';
import PublicGamesLobby from './PublicGamesLobby';
import { GAME_MODES, GameMode } from '../lib/battleshipUtils';

const LandingPage: React.FC = () => {
  const { publicKey } = useWallet();
  const [showFullGame, setShowFullGame] = useState(false);
  const [selectedGameMode, setSelectedGameMode] = useState<GameMode>('standard');
  const [gameIdInput, setGameIdInput] = useState('');
  const [isPublicGame, setIsPublicGame] = useState(true);
  const [showPublicLobby, setShowPublicLobby] = useState(false);
  const [wagerAmount, setWagerAmount] = useState<number>(0);

  // Auto-detect shared games from URL
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const urlParams = new URLSearchParams(window.location.search);
    const sharedGameId = urlParams.get('game');
    
    if (sharedGameId) {
      setGameIdInput(sharedGameId);
      toast.success(`🔗 Ready to join shared game: ${sharedGameId.slice(0, 8)}...`);
    }
  }, []);

  const startGame = (mode: GameMode) => {
    if (!publicKey) {
      toast.error('Please connect your wallet first!');
      return;
    }
    
    // Store the game mode in localStorage so BattleshipGame can pick it up
    localStorage.setItem('selectedGameMode', mode);
    localStorage.setItem('isPublicGame', isPublicGame.toString());
    localStorage.setItem('wagerAmount', wagerAmount.toString());
    
    setSelectedGameMode(mode);
    setShowFullGame(true);
    toast.success(`🚀 Starting ${GAME_MODES[mode].name} battle!`);
  };

  const joinGameById = () => {
    if (!publicKey) {
      toast.error('Please connect your wallet first!');
      return;
    }
    
    if (!gameIdInput.trim()) {
      toast.error('Please enter a Battle ID!');
      return;
    }
    
    // Store the game ID in localStorage so BattleshipGame can pick it up
    localStorage.setItem('gameIdToJoin', gameIdInput);
    localStorage.setItem('selectedGameMode', selectedGameMode);
    localStorage.setItem('wagerAmount', wagerAmount.toString());
    
    setShowFullGame(true);
    toast.success(`⚔️ Joining battle: ${gameIdInput.slice(0, 8)}...`);
  };

  const handleJoinPublicGame = (gameId: string) => {
    // Store the game ID in localStorage so BattleshipGame can pick it up
    localStorage.setItem('gameIdToJoin', gameId);
    localStorage.setItem('selectedGameMode', selectedGameMode);
    localStorage.setItem('wagerAmount', wagerAmount.toString());
    
    setGameIdInput(gameId);
    setShowFullGame(true);
    toast.success(`🏆 Joining public battle!`);
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
            Back to Fleet Command
          </button>
        </div>
        
        <BattleshipGame />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-teal-50 to-blue-100">
      {/* SUPER VISIBLE WALLET BUTTON DEBUG - TOP */}
      <div className="fixed top-0 left-0 right-0 z-[9999] bg-red-500 text-white text-center py-2 px-4">
        <div className="flex items-center justify-center gap-4">
          <span className="font-bold">🔥 WALLET STATUS: {publicKey ? '✅ CONNECTED' : '❌ NOT CONNECTED'}</span>
          <WalletMultiButton 
            style={{
              background: '#1f2937',
              color: 'white',
              border: '2px solid white',
              borderRadius: '8px',
              padding: '8px 16px',
              fontWeight: 'bold',
              fontSize: '14px'
            }}
          />
        </div>
      </div>

      {/* Floating Wallet Status - Always Visible */}
      <div className="fixed top-16 right-4 z-50">
        {!publicKey ? (
          <div className="relative">
            <div className="bg-white rounded-full shadow-xl border-2 border-blue-200 p-1">
              <WalletMultiButton 
                style={{
                  background: 'linear-gradient(to right, #2563eb, #0d9488)',
                  color: 'white',
                  borderRadius: '50px',
                  fontWeight: '600',
                  fontSize: '0.875rem',
                  border: 'none',
                  padding: '0.75rem 1.5rem',
                  boxShadow: 'none',
                  minWidth: '200px',
                  minHeight: '50px',
                  display: 'flex !important',
                  visibility: 'visible !important',
                  opacity: '1 !important'
                }}
              />
            </div>
            <div className="absolute -bottom-2 -right-2 bg-red-500 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center animate-pulse">
              !
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-full shadow-xl border-2 border-green-200 p-1">
            <div className="flex items-center gap-2 px-4 py-2">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-green-700 font-semibold text-sm">Connected</span>
              <WalletMultiButton 
                style={{
                  background: 'transparent',
                  color: '#059669',
                  border: 'none',
                  fontSize: '0.75rem',
                  padding: '0.25rem 0.5rem',
                  boxShadow: 'none'
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Hero Section */}
      <div className="relative overflow-hidden pt-16">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-teal-600/20"></div>
        <div className="relative container mx-auto px-4 py-16">
          <div className="text-center max-w-4xl mx-auto">
            {/* Main Title */}
            <div className="flex items-center justify-center gap-4 mb-6">
              <div className="bg-gradient-to-r from-blue-600 to-teal-600 p-4 rounded-full shadow-xl">
                <Anchor className="w-12 h-12 text-white" />
              </div>
              <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-blue-600 to-teal-600 bg-clip-text text-transparent">
                Gorbagana Battleship
              </h1>
            </div>
            
            <p className="text-xl md:text-2xl text-gray-600 mb-8 leading-relaxed">
              Command your fleet in the ultimate blockchain naval warfare experience.<br />
              <span className="text-blue-600 font-semibold">Fast • Secure • Cross-Device • Real-time</span>
            </p>

            {/* Quick Stats */}
            <div className="flex items-center justify-center gap-8 mb-12 text-gray-600">
              <div className="flex items-center gap-2">
                <Waves className="w-5 h-5 text-blue-600" />
                <span>Lightning Fast</span>
              </div>
              <div className="flex items-center gap-2">
                <Compass className="w-5 h-5 text-teal-600" />
                <span>Cross-Device</span>
              </div>
              <div className="flex items-center gap-2">
                <Target className="w-5 h-5 text-green-600" />
                <span>Real-time</span>
              </div>
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-purple-600" />
                <span>Blockchain Secured</span>
              </div>
            </div>

            {/* Primary CTA Section */}
            <div className="bg-white rounded-2xl shadow-2xl border-2 border-blue-200 p-8 mb-16">
              {!publicKey ? (
                <div className="text-center">
                  <div className="bg-gradient-to-r from-blue-100 to-teal-100 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Ship className="w-12 h-12 text-blue-600" />
                  </div>
                  
                  <h2 className="text-4xl font-bold text-gray-800 mb-4">⚓ Ready to Command Your Fleet?</h2>
                  <p className="text-gray-600 mb-8 text-xl leading-relaxed">
                    Connect your <strong>Backpack wallet</strong> to start playing blockchain battleship instantly!<br />
                    <span className="text-blue-600 font-semibold">No wallet? No problem - we'll guide you through setup!</span>
                  </p>
                  
                  <div className="space-y-4">
                    {/* SUPER VISIBLE MAIN WALLET BUTTON */}
                    <div className="bg-gradient-to-r from-red-500 to-pink-500 p-4 rounded-2xl mb-4">
                      <div className="text-white text-xl font-bold mb-2">🔥 CONNECT WALLET BUTTON BELOW 🔥</div>
                      <WalletMultiButton 
                        style={{
                          background: 'linear-gradient(to right, #2563eb, #0d9488)',
                          width: '100%',
                          maxWidth: '500px',
                          height: '4.5rem',
                          borderRadius: '1.25rem',
                          fontWeight: '700',
                          fontSize: '1.5rem',
                          border: '3px solid #ffffff',
                          boxShadow: '0 15px 35px -5px rgba(0, 0, 0, 0.2), 0 10px 15px -5px rgba(0, 0, 0, 0.1)',
                          transition: 'all 0.3s ease-in-out',
                          textTransform: 'uppercase',
                          letterSpacing: '1px',
                          minWidth: '300px',
                          minHeight: '70px',
                          display: 'flex !important',
                          visibility: 'visible !important',
                          opacity: '1 !important',
                          position: 'relative !important',
                          zIndex: '100 !important'
                        }}
                        className="wallet-button-hero mx-auto block"
                      />
                    </div>
                    
                    <p className="text-sm text-gray-500 max-w-md mx-auto">
                      🔐 <strong>Secure</strong> • ⚡ <strong>Fast</strong> • 🎮 <strong>Ready in 30 seconds</strong>
                    </p>
                  </div>
                  
                  <div className="mt-8">
                    <GorbaganaFaucet variant="card" />
                  </div>
                </div>
              ) : (
                <div className="text-center">
                  <h2 className="text-3xl font-bold text-gray-800 mb-2">Welcome, Admiral! ⚓</h2>
                  <p className="text-gray-600 mb-6">Choose your battle mode and engage!</p>
                  
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
                      className="group bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold py-4 px-6 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 flex items-center justify-center gap-3"
                    >
                      <Play className="w-6 h-6" />
                      <span>🚀 Quick Battle</span>
                      <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </button>
                    
                    <button
                      onClick={() => setShowPublicLobby(!showPublicLobby)}
                      className="group bg-gradient-to-r from-teal-600 to-teal-700 hover:from-teal-700 hover:to-teal-800 text-white font-bold py-4 px-6 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 flex items-center justify-center gap-3"
                    >
                      <Trophy className="w-6 h-6" />
                      <span>🏆 Public Battles</span>
                      <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Game Modes Section - Always Visible */}
      <div className="container mx-auto px-4 pb-8">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-gray-800 mb-4">Choose Your Battle Mode</h2>
          <p className="text-gray-600 text-lg">Each mode offers a unique strategic experience</p>
        </div>
        
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto mb-16">
          {Object.entries(GAME_MODES).map(([key, config]) => (
            <div
              key={key}
              className={`bg-white rounded-2xl shadow-xl border-2 overflow-hidden transition-all duration-300 hover:scale-105 hover:shadow-2xl ${
                selectedGameMode === key ? 'border-blue-500 ring-4 ring-blue-200' : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              {/* Mode Header */}
              <div className={`p-6 text-center text-white ${
                key === 'quick' 
                  ? 'bg-gradient-to-br from-green-500 to-green-600' 
                  : key === 'standard'
                  ? 'bg-gradient-to-br from-blue-500 to-blue-600'
                  : 'bg-gradient-to-br from-purple-500 to-purple-600'
              }`}>
                <div className="text-5xl mb-3">
                  {key === 'quick' ? '⚡' : key === 'standard' ? '⚓' : '🚢'}
                </div>
                <h3 className="text-2xl font-bold mb-2">{config.name}</h3>
                <p className="text-sm opacity-90">{config.description}</p>
              </div>
              
              {/* Mode Details */}
              <div className="p-6">
                <div className="space-y-3 mb-6">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Duration:</span>
                    <span className="font-semibold">{config.estimatedTime}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Board Size:</span>
                    <span className="font-semibold">{config.boardSize}×{config.boardSize}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Fleet Size:</span>
                    <span className="font-semibold">{config.fleet.length} ship types</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Targets:</span>
                    <span className="font-semibold">{config.totalShipSquares} squares</span>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <button
                    onClick={() => setSelectedGameMode(key as GameMode)}
                    className={`w-full py-2 px-4 rounded-lg font-medium transition-all duration-200 ${
                      selectedGameMode === key
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {selectedGameMode === key ? '✅ Selected' : 'Select Mode'}
                  </button>
                  
                  {publicKey && (
                    <button
                      onClick={() => startGame(key as GameMode)}
                      className={`w-full py-3 px-4 rounded-lg font-bold transition-all duration-200 shadow-md hover:shadow-lg ${
                        key === 'quick' 
                          ? 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700' 
                          : key === 'standard'
                          ? 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700'
                          : 'bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700'
                      } text-white`}
                    >
                      🚀 Start {config.name}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Game Actions Section */}
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto mb-16">
          {/* Create New Game */}
          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8">
            <div className="text-center mb-6">
              <div className="bg-gradient-to-r from-blue-100 to-blue-200 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Anchor className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-800 mb-2">Launch New Battle</h3>
              <p className="text-gray-600">Deploy your fleet and challenge the seas</p>
            </div>
            
            <div className="space-y-4">
              <label className="flex items-center space-x-3 p-4 bg-blue-50 rounded-lg border border-blue-200 hover:bg-blue-100 transition-colors cursor-pointer">
                <input
                  type="checkbox"
                  checked={isPublicGame}
                  onChange={(e) => setIsPublicGame(e.target.checked)}
                  className="w-4 h-4 text-blue-600 bg-white border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                />
                <span className="text-gray-700 font-medium">🌐 Public Battle (discoverable by others)</span>
              </label>
              
              {publicKey ? (
                <button
                  onClick={() => startGame(selectedGameMode)}
                  className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold py-4 px-6 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 flex items-center justify-center gap-3"
                >
                  <Ship className="w-6 h-6" />
                  🎯 Deploy Fleet
                  <ArrowRight className="w-5 h-5" />
                </button>
              ) : (
                <div className="text-center p-6 bg-gradient-to-br from-red-50 to-orange-50 border-2 border-red-200 rounded-xl">
                  <div className="bg-red-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Ship className="w-6 h-6 text-red-600" />
                  </div>
                  <p className="text-red-800 font-semibold mb-3">⚠️ Wallet Required</p>
                  <p className="text-red-600 mb-4 text-sm">Connect your Backpack wallet to deploy your fleet</p>
                  <WalletMultiButton 
                    style={{
                      background: 'linear-gradient(to right, #dc2626, #ea580c)',
                      color: 'white',
                      width: '100%',
                      height: '3rem',
                      borderRadius: '0.75rem',
                      fontWeight: '700',
                      border: 'none',
                      fontSize: '1rem',
                      textTransform: 'uppercase'
                    }}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Join Existing Game */}
          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8">
            <div className="text-center mb-6">
              <div className="bg-gradient-to-r from-teal-100 to-teal-200 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-teal-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-800 mb-2">Join Fleet</h3>
              <p className="text-gray-600">Enter an existing battle by ID or link</p>
            </div>
            
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Enter Battle ID or paste invitation link"
                value={gameIdInput}
                onChange={(e) => setGameIdInput(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all duration-200"
              />
              
              {publicKey ? (
                <button
                  onClick={joinGameById}
                  disabled={!gameIdInput.trim()}
                  className="w-full bg-gradient-to-r from-teal-600 to-teal-700 hover:from-teal-700 hover:to-teal-800 text-white font-bold py-4 px-6 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 disabled:opacity-50 disabled:hover:scale-100 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                >
                  <Users className="w-6 h-6" />
                  ⚔️ Join Battle
                  <ArrowRight className="w-5 h-5" />
                </button>
              ) : (
                <div className="text-center p-6 bg-gradient-to-br from-yellow-50 to-orange-50 border-2 border-yellow-200 rounded-xl">
                  <div className="bg-yellow-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Users className="w-6 h-6 text-yellow-600" />
                  </div>
                  <p className="text-yellow-800 font-semibold mb-3">🔗 Connect to Join</p>
                  <p className="text-yellow-600 mb-4 text-sm">Connect your Backpack wallet to join battles</p>
                  <WalletMultiButton 
                    style={{
                      background: 'linear-gradient(to right, #eab308, #f59e0b)',
                      color: 'white',
                      width: '100%',
                      height: '3rem',
                      borderRadius: '0.75rem',
                      fontWeight: '700',
                      border: 'none',
                      fontSize: '1rem',
                      textTransform: 'uppercase'
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Public Games Lobby */}
        {showPublicLobby && (
          <div className="max-w-6xl mx-auto mb-16">
            <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold text-gray-800">🏆 Admiral's Harbor - Public Battles</h3>
                <button
                  onClick={() => setShowPublicLobby(false)}
                  className="text-gray-500 hover:text-gray-700 text-xl"
                >
                  ✕
                </button>
              </div>
              
              <PublicGamesLobby 
                onJoinGame={handleJoinPublicGame}
                className="mt-4"
              />
            </div>
          </div>
        )}

        {/* Gorbagana Network Info */}
        <div className="mb-16">
          <GorbaganaInfo variant="full" />
        </div>

        {/* Footer */}
        <div className="text-center py-8 border-t border-gray-200">
          <div className="flex items-center justify-center gap-6 mb-4 text-sm text-gray-600">
            <span className="flex items-center gap-2">
              <Globe className="w-4 h-4" />
              Powered by Gorbagana Network
            </span>
            <span className="flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Blockchain Secured
            </span>
            <span className="flex items-center gap-2">
              <Zap className="w-4 h-4" />
              Lightning Fast
            </span>
          </div>
          <p className="text-gray-500 text-sm">
            © 2024 Gorbagana Battleship • Strategic naval warfare on the blockchain
          </p>
        </div>
      </div>
    </div>
  );
};

export default LandingPage; 