'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { useAnchorWallet } from '@solana/wallet-adapter-react';
import { PublicKey, SystemProgram } from '@solana/web3.js';
import { Program, AnchorProvider, BN } from '@coral-xyz/anchor';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import toast from 'react-hot-toast';
import { Share2, Users, Copy, ExternalLink, RefreshCw, Gamepad2, ArrowLeft } from 'lucide-react';

import GameBoard from './GameBoard';
import GorbaganaFaucet from './GorbaganaFaucet';
import {
  STANDARD_FLEET,
  TOTAL_SHIP_SQUARES,
  generateRandomFleet,
  generateSalt,
  computeCommitment,
  validateFleetConfiguration,
  saveGameState,
  loadGameState,
  getGameStatus,
  getCurrentPlayerRole,
  isPlayerTurn,
  formatCoordinate,
  GameState,
  GameMode,
  GAME_MODES,
  getCurrentGameMode,
  setGameMode,
  getCurrentConfig,
  getBoardSize,
  getFleet,
  getTotalShipSquares,
  createEmptyBoard,
  getShipsToPlace,
  validateCurrentFleet,
  isValidShipPlacement,
  placeShip,
  coordToIndex
} from '../lib/battleshipUtils';

// Enhanced game storage
import { 
  battleshipGameStorage, 
  BattleshipGame, 
  convertToBattleshipGame, 
  convertFromBattleshipGame 
} from '../lib/gameStorage';

// Anchor program IDL and ID
import IDL from '../../target/idl/battleship.json';
const PROGRAM_ID = new PublicKey('11111111111111111111111111111112'); // System Program for development

type GamePhase = 'setup' | 'placement' | 'waiting' | 'playing' | 'reveal' | 'finished';

interface ShipPlacement {
  length: number;
  placed: boolean;
}

// Enhanced polling configuration for real-time updates
const POLL_INTERVAL = 2000; // Poll every 2 seconds
const MAX_POLL_ATTEMPTS = 30; // 60 seconds total
const SYNC_INTERVAL = 5000; // Sync with storage every 5 seconds

const BattleshipGame: React.FC = () => {
  const { connection } = useConnection();
  const wallet = useAnchorWallet();
  const { publicKey } = useWallet();

  // Game mode state
  const [selectedGameMode, setSelectedGameMode] = useState<GameMode>('standard');
  const [showGameModeSelector, setShowGameModeSelector] = useState(true);

  // Game state
  const [gamePhase, setGamePhase] = useState<GamePhase>('setup'); // Start in setup phase for mode selection
  const [gameAccount, setGameAccount] = useState<PublicKey | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [program, setProgram] = useState<Program | null>(null);

  // Enhanced game storage state
  const [battleshipGame, setBattleshipGame] = useState<BattleshipGame | null>(null);
  const [isPublicGame, setIsPublicGame] = useState(false);
  const [gameShareUrl, setGameShareUrl] = useState<string>('');
  const [backendStatus, setBackendStatus] = useState<{available: boolean, url?: string}>({available: false});

  // Ship placement state - dynamic initialization
  const [playerBoard, setPlayerBoard] = useState<number[]>([]);
  const [playerSalt, setPlayerSalt] = useState<Uint8Array | null>(null);
  const [shipsToPlace, setShipsToPlace] = useState<ShipPlacement[]>([]);
  const [currentShipIndex, setCurrentShipIndex] = useState(0);
  const [shipOrientation, setShipOrientation] = useState<'horizontal' | 'vertical'>('horizontal');
  const [hoveredShip, setHoveredShip] = useState<{ x: number, y: number, length: number, orientation: 'horizontal' | 'vertical' } | null>(null);

  // Game input state
  const [gameIdInput, setGameIdInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);

  // Public games lobby
  const [showPublicLobby, setShowPublicLobby] = useState(false);
  const [publicGames, setPublicGames] = useState<any[]>([]);

  // Initialize game mode on component mount
  useEffect(() => {
    if (playerBoard.length === 0 && shipsToPlace.length === 0) {
      initializeGameForMode(selectedGameMode);
    }
  }, [selectedGameMode]);

  // Check backend connection status
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const checkBackend = async () => {
      const status = battleshipGameStorage.getConnectionStatus();
      setBackendStatus(status);

      try {
        await battleshipGameStorage.testConnection();
        const newStatus = battleshipGameStorage.getConnectionStatus();
        setBackendStatus(newStatus);
      } catch (error) {
        console.error('Backend test failed:', error);
      }
    };

    const timer = setTimeout(checkBackend, 100);
    return () => clearTimeout(timer);
  }, []);

  // Initialize Anchor program
  useEffect(() => {
    if (wallet && connection) {
      try {
        const provider = new AnchorProvider(connection, wallet, AnchorProvider.defaultOptions());
        
        // For development, use a mock program if the actual program isn't deployed
        try {
          const program = new Program(IDL as any, PROGRAM_ID, provider);
          setProgram(program);
          console.log('✅ Anchor program initialized successfully');
        } catch (programError) {
          console.warn('⚠️ Anchor program initialization failed (likely in development mode):', programError);
          
          // Create a mock program object for development
          const mockProgram = {
            methods: {
              initializeGame: () => ({
                accounts: () => ({
                  rpc: async () => {
                    console.log('🔧 Mock: initializeGame called');
                    // Simulate transaction success
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    return 'mock_transaction_signature';
                  }
                })
              }),
              joinGame: () => ({
                accounts: () => ({
                  rpc: async () => {
                    console.log('🔧 Mock: joinGame called');
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    return 'mock_transaction_signature';
                  }
                })
              }),
              fireShot: () => ({
                accounts: () => ({
                  rpc: async () => {
                    console.log('🔧 Mock: fireShot called');
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    return 'mock_transaction_signature';
                  }
                })
              }),
              revealShotResult: () => ({
                accounts: () => ({
                  rpc: async () => {
                    console.log('🔧 Mock: revealShotResult called');
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    return 'mock_transaction_signature';
                  }
                })
              }),
              revealBoardPlayer1: () => ({
                accounts: () => ({
                  rpc: async () => {
                    console.log('🔧 Mock: revealBoardPlayer1 called');
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    return 'mock_transaction_signature';
                  }
                })
              }),
              revealBoardPlayer2: () => ({
                accounts: () => ({
                  rpc: async () => {
                    console.log('🔧 Mock: revealBoardPlayer2 called');
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    return 'mock_transaction_signature';
                  }
                })
              })
            },
            account: {
              game: {
                fetch: async (gameAccount: PublicKey) => {
                  console.log('🔧 Mock: Fetching game state for', gameAccount.toString().slice(0, 8));
                  
                  // Return mock game state for development
                  return {
                    player1: new PublicKey('11111111111111111111111111111112'),
                    player2: new PublicKey('11111111111111111111111111111113'),
                    boardCommit1: new Array(32).fill(0),
                    boardCommit2: new Array(32).fill(0),
                    turn: 1,
                    boardHits1: new Array(100).fill(0),
                    boardHits2: new Array(100).fill(0),
                    hitsCount1: 0,
                    hitsCount2: 0,
                    isInitialized: true,
                    isGameOver: false,
                    winner: 0,
                    pendingShot: null,
                    pendingShotBy: new PublicKey('11111111111111111111111111111112'),
                    player1Revealed: false,
                    player2Revealed: false,
                  };
                }
              }
            }
          };
          
          setProgram(mockProgram as any);
          console.log('🔧 Using mock program for development');
          toast('Development mode: Using mock blockchain interactions', { icon: '🔧' });
        }
      } catch (error) {
        console.error('❌ Provider initialization failed:', error);
        toast.error('Failed to initialize wallet provider');
      }
    }
  }, [wallet, connection]);

  // Enhanced game state fetching with cross-device sync
  useEffect(() => {
    if (program && gameAccount) {
      const fetchGameState = async () => {
        try {
          // Fetch from blockchain
          const account = await program.account.game.fetch(gameAccount);
          setGameState(account as any);

          // Only sync during active gameplay, not during setup
          if (battleshipGame && (gamePhase === 'playing' || gamePhase === 'waiting')) {
            setSyncing(true);
            const updatedGame: BattleshipGame = {
              ...battleshipGame,
              turn: (account as any).turn,
              boardHits1: (account as any).boardHits1,
              boardHits2: (account as any).boardHits2,
              status: (account as any).isGameOver ? 'finished' : 'playing',
              winner: (account as any).winner,
              updatedAt: Date.now(),
            };
            
            await battleshipGameStorage.saveGame(updatedGame);
            setSyncing(false);
          }
        } catch (error) {
          console.error('Error fetching game state:', error);
          setSyncing(false);
        }
      };

      // Only fetch game state during active phases, with longer intervals
      if (gamePhase === 'playing' || gamePhase === 'waiting') {
        fetchGameState();
        const interval = setInterval(fetchGameState, 10000); // Reduced frequency to 10 seconds
        return () => clearInterval(interval);
      }
    }
  }, [program, gameAccount, gamePhase]); // Removed battleshipGame dependency to prevent infinite loop

  // Check for shared game on load
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const urlParams = new URLSearchParams(window.location.search);
    const sharedGameId = urlParams.get('game');
    
    if (sharedGameId && publicKey) {
      // Auto-load shared game
      setGameIdInput(sharedGameId);
      toast.success('Shared game loaded! Join when ready.');
    }
  }, [publicKey]);

  // Game phase management
  useEffect(() => {
    if (gameState && publicKey) {
      const role = getCurrentPlayerRole(gameState, publicKey.toString());
      
      if (!gameState.isInitialized) {
        setGamePhase('waiting');
      } else if (gameState.isGameOver) {
        if (gameState.player1Revealed && gameState.player2Revealed) {
          setGamePhase('finished');
        } else {
          setGamePhase('reveal');
        }
      } else {
        setGamePhase('playing');
      }
    }
  }, [gameState, publicKey]);

  // Enhanced game creation with sharing capabilities
  const createNewGame = async () => {
    if (!program || !wallet || !publicKey) {
      toast.error('Please connect your wallet first');
      return;
    }

    if (!validateFleetConfiguration(playerBoard)) {
      toast.error('Please place all ships before starting');
      return;
    }

    setLoading(true);
    try {
      // Generate salt and commitment
      const salt = generateSalt();
      const commitment = computeCommitment(playerBoard, salt);
      setPlayerSalt(salt);

      // Generate a mock game PDA for development
      const mockGameId = Array.from(crypto.getRandomValues(new Uint8Array(32)))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('')
        .slice(0, 44); // Create a base58-like string
      
      const gamePda = new PublicKey('11111111111111111111111111111112'); // Mock address for development
      
      console.log('🔧 Development mode: Generated mock game ID:', mockGameId.slice(0, 8));

      // Initialize game on blockchain (mock in development)
      await program.methods
        .initializeGame(Array.from(commitment))
        .accounts({
          game: gamePda,
          player: publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      setGameAccount(gamePda);
      
      // Create enhanced battleship game object
      const newBattleshipGame: BattleshipGame = {
        id: mockGameId, // Use mock ID instead of PDA for sharing
        gameAccount: gamePda.toString(),
        player1: publicKey.toString(),
        player1Board: playerBoard,
        player1Salt: salt,
        player1Commitment: Array.from(commitment),
        turn: 1,
        boardHits1: new Array(100).fill(0),
        boardHits2: new Array(100).fill(0),
        status: 'waiting',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        isPublic: isPublicGame,
        creatorName: 'Captain ' + publicKey.toString().slice(0, 6),
        phase: 'waiting',
      };

      // Save to enhanced storage system
      await battleshipGameStorage.saveGame(newBattleshipGame);
      setBattleshipGame(newBattleshipGame);
      
      // Save locally for backward compatibility
      saveGameState(mockGameId, playerBoard, salt);
      
      // Generate share URL using the mock game ID
      const shareUrl = `${window.location.origin}${window.location.pathname}?game=${mockGameId}`;
      setGameShareUrl(shareUrl);
      
      toast.success('Game created! Share with your opponent 🚢');
      setGamePhase('waiting');
    } catch (error) {
      console.error('Error creating game:', error);
      toast.error('Failed to create game');
    } finally {
      setLoading(false);
    }
  };

  // Enhanced game joining with storage sync
  const joinGame = async () => {
    if (!program || !wallet || !publicKey || !gameIdInput) {
      toast.error('Please enter a valid Game ID and connect wallet');
      return;
    }

    if (!validateFleetConfiguration(playerBoard)) {
      toast.error('Please place all ships before joining');
      return;
    }

    setLoading(true);
    try {
      let gameKey: PublicKey;
      let actualGameId = gameIdInput;
      
      // Try to parse as PublicKey, fallback to loading from storage
      try {
        gameKey = new PublicKey(gameIdInput);
      } catch {
        // In development mode, gameIdInput might be a mock ID from storage
        console.log('🔧 Development mode: Using mock game ID for joining');
        gameKey = new PublicKey('11111111111111111111111111111113'); // Different mock address for joining
        actualGameId = gameIdInput; // Keep the original ID for storage lookup
      }
      
      // Generate salt and commitment
      const salt = generateSalt();
      const commitment = computeCommitment(playerBoard, salt);
      setPlayerSalt(salt);

      // Join game on blockchain (mock in development)
      await program.methods
        .joinGame(Array.from(commitment))
        .accounts({
          game: gameKey,
          player: publicKey,
        })
        .rpc();

      setGameAccount(gameKey);
      
      // Load or create battleship game object
      let battleshipGameData = await battleshipGameStorage.getGame(actualGameId);
      if (!battleshipGameData) {
        // Create new game object for joining
        battleshipGameData = {
          id: actualGameId,
          gameAccount: gameKey.toString(),
          player1: 'Unknown', // Will be updated from blockchain
          player2: publicKey.toString(),
          player1Board: new Array(100).fill(0),
          player2Board: playerBoard,
          player1Salt: new Uint8Array(32),
          player2Salt: salt,
          player1Commitment: [],
          player2Commitment: Array.from(commitment),
          turn: 1,
          boardHits1: new Array(100).fill(0),
          boardHits2: new Array(100).fill(0),
          status: 'playing',
          createdAt: Date.now(),
          updatedAt: Date.now(),
          isPublic: false,
          phase: 'playing',
        };
      } else {
        // Update existing game with player 2 info
        battleshipGameData = {
          ...battleshipGameData,
          player2: publicKey.toString(),
          player2Board: playerBoard,
          player2Salt: salt,
          player2Commitment: Array.from(commitment),
          status: 'playing',
          updatedAt: Date.now(),
          phase: 'playing',
        };
      }

      await battleshipGameStorage.saveGame(battleshipGameData);
      setBattleshipGame(battleshipGameData);
      
      // Save locally for backward compatibility
      saveGameState(actualGameId, playerBoard, salt);
      
      toast.success('Joined game successfully! ⚓');
      setGamePhase('playing');
    } catch (error) {
      console.error('Error joining game:', error);
      toast.error('Failed to join game. Check the Game ID.');
    } finally {
      setLoading(false);
    }
  };

  // Load public games for lobby
  const loadPublicGames = async () => {
    try {
      setLoading(true);
      const games = await battleshipGameStorage.getPublicGames();
      setPublicGames(games.filter(game => game.status === 'waiting').slice(0, 10));
    } catch (error) {
      console.error('Failed to load public games:', error);
      toast.error('Failed to load public games');
    } finally {
      setLoading(false);
    }
  };

  // Share game functionality
  const shareGame = async () => {
    if (!battleshipGame) return;

    const shareData = {
      title: 'Join my Battleship game!',
      text: `Join my Battleship game on Gorbagana blockchain`,
      url: gameShareUrl || `${window.location.origin}${window.location.pathname}?game=${battleshipGame.id}`,
    };

    try {
      if (navigator.share && navigator.canShare(shareData)) {
        await navigator.share(shareData);
        toast.success('Game shared successfully! 📤');
      } else {
        // Fallback to clipboard
        await navigator.clipboard.writeText(shareData.url);
        toast.success('Game link copied to clipboard! 📋');
      }
    } catch (error) {
      console.error('Share failed:', error);
      toast.error('Failed to share game');
    }
  };

  // Copy game ID to clipboard
  const copyGameId = async () => {
    if (!battleshipGame) return;

    try {
      await navigator.clipboard.writeText(battleshipGame.id);
      toast.success('Game ID copied to clipboard! 📋');
    } catch (error) {
      console.error('Copy failed:', error);
      toast.error('Failed to copy Game ID');
    }
  };

  // Manual sync with storage (only during active gameplay)
  const syncGameState = async () => {
    if (!battleshipGame) return;

    // Don't sync during setup or ship placement phases
    if (gamePhase === 'setup' || gamePhase === 'placement') {
      toast('Sync disabled during setup phase');
      return;
    }

    try {
      setSyncing(true);
      const updatedGame = await battleshipGameStorage.getGame(battleshipGame.id);
      if (updatedGame && updatedGame.updatedAt > battleshipGame.updatedAt) {
        setBattleshipGame(updatedGame);
        toast.success('Game state synchronized! 🔄');
      } else {
        toast('Game is already up to date');
      }
    } catch (error) {
      console.error('Sync failed:', error);
      toast.error('Failed to sync game state');
    } finally {
      setSyncing(false);
    }
  };

  const placeShipOnBoard = (x: number, y: number) => {
    if (currentShipIndex >= shipsToPlace.length) return;

    const currentShip = shipsToPlace[currentShipIndex];
    if (currentShip.placed) return;

    // Validate placement
    const canPlace = validateShipPlacement(playerBoard, x, y, currentShip.length, shipOrientation);
    if (!canPlace) {
      toast.error('Cannot place ship here');
      return;
    }

    // Place ship using utility function
    const newBoard = placeShip(playerBoard, x, y, currentShip.length, shipOrientation, getBoardSize());
    setPlayerBoard(newBoard);
    
    // Mark ship as placed
    const newShips = [...shipsToPlace];
    newShips[currentShipIndex].placed = true;
    setShipsToPlace(newShips);

    // Move to next ship
    let nextIndex = currentShipIndex + 1;
    while (nextIndex < newShips.length && newShips[nextIndex].placed) {
      nextIndex++;
    }
    setCurrentShipIndex(nextIndex);

    const fleet = getFleet();
    const shipType = fleet.find(ship => ship.length === currentShip.length);
    toast.success(`${shipType?.name || 'Ship'} placed!`);

    // Check if all ships are placed
    if (nextIndex >= newShips.length) {
      setGamePhase('setup');
      toast.success('All ships placed! Ready to start game.');
    }
  };

  const validateShipPlacement = (board: number[], x: number, y: number, length: number, orientation: 'horizontal' | 'vertical'): boolean => {
    const boardSize = getBoardSize();
    return isValidShipPlacement(board, x, y, length, orientation, boardSize);
  };

  const fireShot = async (x: number, y: number) => {
    if (!program || !gameAccount || !gameState || !publicKey) return;

    const role = getCurrentPlayerRole(gameState, publicKey.toString());
    if (!isPlayerTurn(gameState, publicKey.toString())) {
      toast.error('Not your turn!');
      return;
    }

    // Check if already shot here
    const index = x + y * 10;
    const opponentHits = role === 'player1' ? gameState.boardHits2 : gameState.boardHits1;
    if (opponentHits[index] !== 0) {
      toast.error('Already shot at this coordinate');
      return;
    }

    setLoading(true);
    try {
      await program.methods
        .fireShot(x, y)
        .accounts({
          game: gameAccount,
          player: publicKey,
        })
        .rpc();

      toast.success(`Shot fired at ${formatCoordinate(x, y)}!`);
    } catch (error) {
      console.error('Error firing shot:', error);
      toast.error('Failed to fire shot');
    } finally {
      setLoading(false);
    }
  };

  const revealShotResult = async () => {
    if (!program || !gameAccount || !gameState || !publicKey || !playerSalt) return;

    const pendingShot = gameState.pendingShot;
    if (!pendingShot) return;

    // Load game state to check if shot was hit
    const gameData = loadGameState(gameAccount.toString());
    if (!gameData) {
      toast.error('Game data not found. Cannot determine hit/miss.');
      return;
    }

    const [x, y] = pendingShot;
    const index = x + y * 10;
    const wasHit = gameData.board[index] === 1;

    setLoading(true);
    try {
      await program.methods
        .revealShotResult(wasHit)
        .accounts({
          game: gameAccount,
          player: publicKey,
        })
        .rpc();

      toast.success(wasHit ? 'HIT!' : 'Miss');
    } catch (error) {
      console.error('Error revealing shot result:', error);
      toast.error('Failed to reveal shot result');
    } finally {
      setLoading(false);
    }
  };

  const revealBoard = async () => {
    if (!program || !gameAccount || !gameState || !publicKey || !playerSalt) return;

    const gameData = loadGameState(gameAccount.toString());
    if (!gameData) {
      toast.error('Game data not found');
      return;
    }

    const role = getCurrentPlayerRole(gameState, publicKey.toString());
    
    setLoading(true);
    try {
      if (role === 'player1') {
        await program.methods
          .revealBoardPlayer1(gameData.board, Array.from(gameData.salt))
          .accounts({
            game: gameAccount,
            player: publicKey,
          })
          .rpc();
      } else if (role === 'player2') {
        await program.methods
          .revealBoardPlayer2(gameData.board, Array.from(gameData.salt))
          .accounts({
            game: gameAccount,
            player: publicKey,
          })
          .rpc();
      }

      toast.success('Board revealed successfully!');
    } catch (error) {
      console.error('Error revealing board:', error);
      toast.error('Failed to reveal board');
    } finally {
      setLoading(false);
    }
  };

  // Game mode selection and initialization
  const selectGameMode = (mode: GameMode) => {
    setSelectedGameMode(mode);
    setGameMode(mode); // Set global game mode
    initializeGameForMode(mode);
    setShowGameModeSelector(false);
    setGamePhase('placement');
  };

  const initializeGameForMode = (mode: GameMode) => {
    const config = GAME_MODES[mode];
    const emptyBoard = createEmptyBoard(mode);
    const ships = getShipsToPlace(mode);
    
    setPlayerBoard(emptyBoard);
    setShipsToPlace(ships);
    setCurrentShipIndex(0);
    setHoveredShip(null);
    
    console.log(`🎮 Initialized ${config.name} mode:`, {
      boardSize: config.boardSize,
      totalCells: config.boardSize * config.boardSize,
      fleet: config.fleet,
      totalShipSquares: config.totalShipSquares
    });
  };

  const generateRandomShips = () => {
    const randomBoard = generateRandomFleet(selectedGameMode);
    setPlayerBoard(randomBoard);
    
    // Mark all ships as placed
    const newShips = shipsToPlace.map(ship => ({ ...ship, placed: true }));
    setShipsToPlace(newShips);
    setCurrentShipIndex(newShips.length);
    
    // Move to setup phase when all ships are placed
    setGamePhase('setup');
    
    const config = GAME_MODES[selectedGameMode];
    toast.success(`Random ${config.name} fleet generated! Ready to start game.`);
  };

  const resetShips = () => {
    initializeGameForMode(selectedGameMode);
    toast.success('Ships reset');
  };

  const changeGameMode = () => {
    setShowGameModeSelector(true);
    setGamePhase('setup');
    resetShips();
  };

  const handleBoardHover = (x: number, y: number) => {
    if (gamePhase === 'placement' && currentShipIndex < shipsToPlace.length) {
      const currentShip = shipsToPlace[currentShipIndex];
      if (!currentShip.placed) {
        setHoveredShip({
          x,
          y,
          length: currentShip.length,
          orientation: shipOrientation
        });
      }
    }
  };

  if (!wallet) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
        <div className="max-w-md w-full space-y-6">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-800 mb-4">⚓ Battleship on Gorbagana</h1>
            <p className="text-gray-600 mb-8">Connect your Backpack wallet to start playing</p>
            <WalletMultiButton />
          </div>
          
          <GorbaganaFaucet variant="card" />
        </div>
      </div>
    );
  }

  // Game Mode Selection Screen
  if (showGameModeSelector) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-blue-100 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow-lg p-8">
            <div className="text-center mb-8">
              <h1 className="text-4xl font-bold text-gray-800 mb-4">⚓ Choose Battle Mode</h1>
              <p className="text-gray-600">Select your preferred game style for the ultimate naval warfare experience</p>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {Object.entries(GAME_MODES).map(([key, config]) => (
                <div
                  key={key}
                  onClick={() => selectGameMode(key as GameMode)}
                  className={`bg-gradient-to-br cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-xl rounded-xl p-6 text-center border-2 ${
                    key === 'quick' 
                      ? 'from-green-400 to-green-600 border-green-300 hover:border-green-400' 
                      : key === 'standard'
                      ? 'from-blue-400 to-blue-600 border-blue-300 hover:border-blue-400'
                      : 'from-purple-400 to-purple-600 border-purple-300 hover:border-purple-400'
                  } text-white`}
                >
                  <div className="text-4xl mb-3">
                    {key === 'quick' ? '⚡' : key === 'standard' ? '⚓' : '🚢'}
                  </div>
                  <h3 className="text-xl font-bold mb-2">{config.name}</h3>
                  <p className="text-sm opacity-90 mb-3">{config.description}</p>
                  <div className="text-xs space-y-1 opacity-80">
                    <div>⏱️ {config.estimatedTime}</div>
                    <div>📐 {config.boardSize}×{config.boardSize} board</div>
                    <div>🚢 {config.fleet.length} ship types</div>
                    <div>🎯 {config.totalShipSquares} targets</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8 space-y-6">
              <GorbaganaFaucet variant="card" />
              
              <div className="text-center">
                <p className="text-gray-600 text-sm">
                  💡 <strong>Quick Battle</strong> for fast games • <strong>Standard</strong> for classic experience • <strong>Extended</strong> for epic warfare
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-blue-100 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header with status indicators */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-800 mb-2">
                ⚓ Battleship on Gorbagana
              </h1>
              <p className="text-gray-600">
                Blockchain-powered naval warfare • Phase: <span className="font-semibold text-blue-600">{gamePhase}</span>
              </p>
            </div>
            
            {/* Status indicators */}
            <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${backendStatus.available ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <span className="text-sm text-gray-600">
                  Backend: {backendStatus.available ? 'Connected' : 'Offline'}
                </span>
              </div>
              
              {syncing && (
                <div className="flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-blue-500" />
                  <span className="text-sm text-blue-600">Syncing...</span>
                </div>
              )}
              
              <GorbaganaFaucet variant="inline" />
              <WalletMultiButton />
            </div>
          </div>
        </div>

        {/* Game setup and sharing section */}
        {gamePhase === 'setup' && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-gray-800">🚢 Game Setup</h2>
              <button
                onClick={() => setGamePhase('placement')}
                className="flex items-center gap-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Ship Placement
              </button>
            </div>
            
            <div className="grid md:grid-cols-2 gap-6">
              {/* Create new game */}
              <div className="space-y-4">
                <h3 className="text-xl font-semibold text-gray-700">Create New Game</h3>
                
                <div className="space-y-3">
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={isPublicGame}
                      onChange={(e) => setIsPublicGame(e.target.checked)}
                      className="rounded"
                    />
                    <span className="text-gray-700">Make game public (others can find and join)</span>
                  </label>
                  
                  <button
                    onClick={() => setGamePhase('placement')}
                    disabled={loading}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg transition-colors disabled:opacity-50"
                  >
                    Start Ship Placement ⚓
                  </button>
                </div>
              </div>

              {/* Join existing game */}
              <div className="space-y-4">
                <h3 className="text-xl font-semibold text-gray-700">Join Existing Game</h3>
                
                <div className="space-y-3">
                  <input
                    type="text"
                    placeholder="Enter Game ID or paste shared link"
                    value={gameIdInput}
                    onChange={(e) => setGameIdInput(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  
                  <button
                    onClick={() => {
                      if (gameIdInput.trim()) {
                        setGamePhase('placement');
                      } else {
                        toast.error('Please enter a Game ID');
                      }
                    }}
                    disabled={loading || !gameIdInput.trim()}
                    className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded-lg transition-colors disabled:opacity-50"
                  >
                    Join Game 🤝
                  </button>
                </div>
                
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <GorbaganaFaucet variant="inline" className="justify-center" />
                </div>
              </div>
            </div>

            {/* Public games lobby */}
            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-semibold text-gray-700">Public Games Lobby</h3>
                <button
                  onClick={() => {
                    setShowPublicLobby(!showPublicLobby);
                    if (!showPublicLobby) loadPublicGames();
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
                >
                  <Users className="w-4 h-4" />
                  {showPublicLobby ? 'Hide Lobby' : 'Show Public Games'}
                </button>
              </div>

              {showPublicLobby && (
                <div className="bg-gray-50 rounded-lg p-4">
                  {loading ? (
                    <div className="text-center py-4">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto text-gray-500" />
                      <p className="text-gray-500 mt-2">Loading public games...</p>
                    </div>
                  ) : publicGames.length > 0 ? (
                    <div className="space-y-2">
                      {publicGames.map((game) => (
                        <div
                          key={game.id}
                          className="flex justify-between items-center p-3 bg-white rounded border hover:bg-gray-50 cursor-pointer"
                          onClick={() => {
                            setGameIdInput(game.id);
                            toast.success('Game selected! Click "Join Game" to continue.');
                          }}
                        >
                          <div>
                            <p className="font-medium">{game.creatorName || 'Anonymous Captain'}</p>
                            <p className="text-sm text-gray-500">
                              Created {new Date(game.createdAt).toLocaleTimeString()}
                            </p>
                          </div>
                          <Gamepad2 className="w-5 h-5 text-blue-500" />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center text-gray-500 py-4">
                      No public games available. Create one to get started!
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Ship placement phase */}
        {gamePhase === 'placement' && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-800 mb-2">🚢 Place Your Fleet</h2>
                <p className="text-gray-600">
                  {currentShipIndex < shipsToPlace.length 
                    ? `Place ${STANDARD_FLEET[currentShipIndex].name} (${shipsToPlace[currentShipIndex].length} squares)`
                    : 'All ships placed! Ready to start game.'
                  }
                </p>
              </div>
              
              <div className="flex gap-2 mt-4 md:mt-0">
                <button
                  onClick={() => setShipOrientation(shipOrientation === 'horizontal' ? 'vertical' : 'horizontal')}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  Rotate ({shipOrientation})
                </button>
                <button
                  onClick={generateRandomShips}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
                >
                  Random Fleet
                </button>
                <button
                  onClick={resetShips}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                >
                  Reset
                </button>
              </div>
            </div>

            <div className="flex flex-col lg:flex-row gap-6">
              {/* Game board */}
              <div className="flex-1">
                <GameBoard
                  board={playerBoard}
                  hits={new Array(getBoardSize() * getBoardSize()).fill(0)}
                  onCellClick={placeShipOnBoard}
                  onCellHover={handleBoardHover}
                  isOwnBoard={true}
                  isPlacementMode={true}
                  isInteractive={true}
                  hoveredShip={hoveredShip}
                  boardSize={getBoardSize()}
                />
              </div>

              {/* Ship placement progress */}
              <div className="lg:w-80">
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="font-semibold text-gray-800">Fleet Status</h3>
                    <div className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded">
                      {GAME_MODES[selectedGameMode].name}
                    </div>
                  </div>
                  <div className="space-y-2">
                    {getFleet().map((shipType, typeIndex) => 
                      Array.from({ length: shipType.count }, (_, shipIndex) => {
                        const flatIndex = getFleet().slice(0, typeIndex).reduce((sum, prev) => sum + prev.count, 0) + shipIndex;
                        return (
                          <div
                            key={`${typeIndex}-${shipIndex}`}
                            className={`p-2 rounded ${
                              shipsToPlace[flatIndex]?.placed
                                ? 'bg-green-100 text-green-800'
                                : flatIndex === currentShipIndex
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-gray-100 text-gray-600'
                            }`}
                          >
                            <div className="flex justify-between">
                              <span>{shipType.name} {shipType.count > 1 ? `#${shipIndex + 1}` : ''}</span>
                              <span>
                                {shipsToPlace[flatIndex]?.placed ? '✅' : flatIndex === currentShipIndex ? '👈' : '⏳'}
                              </span>
                            </div>
                            <div className="text-sm opacity-75">
                              {shipType.length} squares
                            </div>
                          </div>
                        );
                      })
                    ).flat()}
                  </div>

                  {/* Change game mode button */}
                  <div className="mt-4">
                    <button
                      onClick={changeGameMode}
                      className="w-full bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                      <Gamepad2 className="w-4 h-4" />
                      Change Game Mode
                    </button>
                  </div>
                </div>

                {/* Start game button */}
                {currentShipIndex >= shipsToPlace.length && (
                  <div className="mt-4">
                    <button
                      onClick={gameIdInput ? joinGame : createNewGame}
                      disabled={loading}
                      className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded-lg transition-colors disabled:opacity-50"
                    >
                      {loading ? (
                        <div className="flex items-center justify-center gap-2">
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          {gameIdInput ? 'Joining...' : 'Creating...'}
                        </div>
                      ) : gameIdInput ? (
                        'Join Game 🤝'
                      ) : (
                        'Create Game ⚓'
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Waiting for opponent */}
        {gamePhase === 'waiting' && battleshipGame && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">⏳ Waiting for Opponent</h2>
              <p className="text-gray-600 mb-6">Share your game to invite someone to play!</p>
              
              {/* Game sharing options */}
              <div className="bg-gray-50 rounded-lg p-6 mb-6">
                <h3 className="font-semibold text-gray-800 mb-4">Share Your Game</h3>
                
                <div className="space-y-4">
                  {/* Game ID */}
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={battleshipGame.id}
                      readOnly
                      className="flex-1 px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm"
                    />
                    <button
                      onClick={copyGameId}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2"
                    >
                      <Copy className="w-4 h-4" />
                      Copy ID
                    </button>
                  </div>
                  
                  {/* Share buttons */}
                  <div className="flex gap-2 justify-center">
                    <button
                      onClick={shareGame}
                      className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors flex items-center gap-2"
                    >
                      <Share2 className="w-4 h-4" />
                      Share Game
                    </button>
                    
                    {gameShareUrl && (
                      <button
                        onClick={() => window.open(gameShareUrl, '_blank')}
                        className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors flex items-center gap-2"
                      >
                        <ExternalLink className="w-4 h-4" />
                        Open Link
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Game status */}
              <div className="text-sm text-gray-500">
                <p>Game Status: {battleshipGame.status}</p>
                <p>Created: {new Date(battleshipGame.createdAt).toLocaleString()}</p>
                {battleshipGame.isPublic && <p>📢 This is a public game</p>}
              </div>
            </div>
          </div>
        )}

        {/* Playing phase - Enhanced battle interface */}
        {gamePhase === 'playing' && gameState && (
          <div className="space-y-6">
            {/* Game status header */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <h2 className="text-2xl font-bold text-gray-800 mb-2">⚔️ Battle in Progress!</h2>
                  <p className="text-lg text-gray-600">{getGameStatus(gameState)}</p>
                </div>
                
                <div className="flex gap-3">
                  <button
                    onClick={syncGameState}
                    disabled={syncing}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50"
                  >
                    <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
                    Sync
                  </button>
                  
                  {battleshipGame && (
                    <button
                      onClick={shareGame}
                      className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                    >
                      <Share2 className="w-4 h-4" />
                      Share
                    </button>
                  )}
                </div>
              </div>

              {/* Pending shot notification */}
              {gameState.pendingShot && getCurrentPlayerRole(gameState, publicKey!.toString()) !== 'spectator' && (
                <div className="mt-4 p-4 bg-orange-50 border border-orange-200 rounded-lg">
                  {gameState.pendingShotBy === publicKey!.toString() ? (
                    <div className="flex items-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin text-orange-500" />
                      <p className="text-orange-700">Waiting for opponent to confirm result...</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <p className="text-orange-700 font-semibold">
                        🎯 Opponent shot at {formatCoordinate(gameState.pendingShot[0], gameState.pendingShot[1])}
                      </p>
                      <button
                        onClick={revealShotResult}
                        disabled={loading}
                        className="bg-orange-600 hover:bg-orange-700 text-white font-bold py-2 px-4 rounded-lg transition-colors disabled:opacity-50"
                      >
                        {loading ? 'Confirming...' : 'Confirm Hit/Miss'}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Game boards */}
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Your board */}
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h3 className="text-xl font-bold text-gray-800 mb-4">🛡️ Your Fleet</h3>
                <GameBoard
                  board={playerBoard}
                  hits={getCurrentPlayerRole(gameState, publicKey!.toString()) === 'player1' ? 
                        gameState.boardHits1 : gameState.boardHits2}
                  onCellClick={() => {}}
                  isOwnBoard={true}
                  isPlacementMode={false}
                  isInteractive={false}
                  showShips={true}
                  boardSize={getBoardSize()}
                />
                <div className="mt-4 text-sm text-gray-600">
                  Ships remaining: {
                    playerBoard.filter(cell => cell === 1).length - 
                    (getCurrentPlayerRole(gameState, publicKey!.toString()) === 'player1' ? 
                     gameState.boardHits1 : gameState.boardHits2).filter(hit => hit === 2).length
                  } / {getTotalShipSquares()}
                </div>
              </div>

              {/* Enemy board */}
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h3 className="text-xl font-bold text-gray-800 mb-4">🎯 Enemy Waters</h3>
                <GameBoard
                  board={new Array(getBoardSize() * getBoardSize()).fill(0)}
                  hits={getCurrentPlayerRole(gameState, publicKey!.toString()) === 'player1' ? 
                        gameState.boardHits2 : gameState.boardHits1}
                  onCellClick={fireShot}
                  isOwnBoard={false}
                  isPlacementMode={false}
                  isInteractive={isPlayerTurn(gameState, publicKey!.toString()) && !gameState.pendingShot}
                  boardSize={getBoardSize()}
                />
                <div className="mt-4 text-sm text-gray-600">
                  Your hits: {
                    (getCurrentPlayerRole(gameState, publicKey!.toString()) === 'player1' ? 
                     gameState.boardHits2 : gameState.boardHits1).filter(hit => hit === 2).length
                  } / {getTotalShipSquares()}
                </div>
              </div>
            </div>

            {/* Turn indicator */}
            <div className="bg-white rounded-lg shadow-lg p-4">
              <div className="text-center">
                {isPlayerTurn(gameState, publicKey!.toString()) ? (
                  <p className="text-green-600 font-semibold text-lg">🎯 Your turn - Click on enemy waters to fire!</p>
                ) : (
                  <p className="text-blue-600 font-semibold text-lg">⏳ Waiting for opponent's move...</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Reveal phase */}
        {gamePhase === 'reveal' && gameState && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">🏁 Game Over - Reveal Phase</h2>
              <p className="text-gray-600 mb-6">
                {gameState.winner === 1 ? 'Player 1 Wins!' :
                 gameState.winner === 2 ? 'Player 2 Wins!' : 'Game completed'}
              </p>
              
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                <p className="text-yellow-800 font-semibold mb-2">Reveal your board to complete the game</p>
                <button
                  onClick={revealBoard}
                  disabled={loading}
                  className="bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-3 px-6 rounded-lg transition-colors disabled:opacity-50"
                >
                  {loading ? 'Revealing...' : 'Reveal My Board'}
                </button>
              </div>

              <div className="text-sm text-gray-500">
                <p>Player 1 Revealed: {gameState.player1Revealed ? '✅' : '❌'}</p>
                <p>Player 2 Revealed: {gameState.player2Revealed ? '✅' : '❌'}</p>
              </div>
            </div>
          </div>
        )}

        {/* Finished phase */}
        {gamePhase === 'finished' && gameState && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="text-center">
              <h2 className="text-3xl font-bold text-gray-800 mb-4">
                🎉 Game Complete!
              </h2>
              
              <div className="mb-6">
                {gameState.winner === 1 && (
                  <div className="text-green-600">
                    <h3 className="text-2xl font-bold">🏆 Player 1 Victories!</h3>
                  </div>
                )}
                {gameState.winner === 2 && (
                  <div className="text-blue-600">
                    <h3 className="text-2xl font-bold">🏆 Player 2 Victories!</h3>
                  </div>
                )}
                {gameState.winner === 0 && (
                  <div className="text-gray-600">
                    <h3 className="text-2xl font-bold">🤝 Game Draw</h3>
                  </div>
                )}
              </div>

              {/* Game statistics */}
              <div className="bg-gray-50 rounded-lg p-6 mb-6">
                <h4 className="font-semibold text-gray-800 mb-4">📊 Battle Statistics</h4>
                <div className="grid md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="font-medium">Player 1 Hits: {gameState.hitsCount1}</p>
                    <p className="font-medium">Player 2 Hits: {gameState.hitsCount2}</p>
                  </div>
                  <div>
                    <p className="font-medium">Total Shots: {gameState.turn}</p>
                    <p className="font-medium">Both Boards Revealed: ✅</p>
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button
                  onClick={() => {
                    setShowGameModeSelector(true);
                    setGamePhase('setup');
                    setGameAccount(null);
                    setGameState(null);
                    setBattleshipGame(null);
                    resetShips();
                  }}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  🔄 New Game
                </button>
                
                {battleshipGame && (
                  <button
                    onClick={shareGame}
                    className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors flex items-center gap-2 justify-center"
                  >
                    <Share2 className="w-4 h-4" />
                    Share Result
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Footer with enhanced storage info */}
        <div className="mt-8 bg-white rounded-lg shadow-lg p-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-gray-600">
            <div className="flex items-center gap-4">
              <span>💾 Storage: {backendStatus.available ? 'Cloud + Local' : 'Local Only'}</span>
              {battleshipGame && (
                <span>🕒 Last sync: {new Date(battleshipGame.updatedAt).toLocaleTimeString()}</span>
              )}
            </div>
            
            <div className="flex items-center gap-4">
              {gameAccount && (
                <span className="font-mono text-xs">
                  Game: {gameAccount.toString().slice(0, 8)}...
                </span>
              )}
              <span>⚓ Gorbagana Battleship v2.0</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BattleshipGame; 