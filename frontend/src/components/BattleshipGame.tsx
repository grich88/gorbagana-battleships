'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import toast from 'react-hot-toast';
import { Share2, Users, Copy, ExternalLink, RefreshCw, Gamepad2, ArrowLeft, Trash2, Settings, Trophy, Waves, Compass, Target, Truck, DollarSign, AlertTriangle, Anchor, Ship } from 'lucide-react';

import GameBoard from './GameBoard';
import GorbaganaFaucet from './GorbaganaFaucet';
import GorbaganaInfo from './GorbaganaInfo';
import WalletBalance from './WalletBalance';
import PublicGamesLobby from './PublicGamesLobby';
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
  convertToBattleshipGame, 
  convertFromBattleshipGame 
} from '../lib/gameStorage';
import type { BattleshipGame } from '../lib/gameStorage';

// Gorbagana blockchain service for escrow
import { GorbaganaBlockchainService } from '../lib/gorbaganaService';

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
  const { publicKey, wallet } = useWallet();
  const { connection } = useConnection();

  // Game mode state
  const [selectedGameMode, setSelectedGameMode] = useState<GameMode>('standard');
  const [showGameModeSelector, setShowGameModeSelector] = useState(true); // Start with game mode selector

  // Game state
  const [gamePhase, setGamePhase] = useState<GamePhase>('setup'); // Start in setup phase for mode selection
  const [gameState, setGameState] = useState<GameState | null>(null);

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
  
  // Wager and Escrow state
  const [wagerAmount, setWagerAmount] = useState<number>(0);
  const [escrowStatus, setEscrowStatus] = useState<'none' | 'pending' | 'locked' | 'released' | 'refunded'>('none');
  const [canAbandon, setCanAbandon] = useState(false);
  const [abandoning, setAbandoning] = useState(false);

  // Initialize from landing page state (localStorage)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const storedGameMode = localStorage.getItem('selectedGameMode') as GameMode;
    const storedIsPublic = localStorage.getItem('isPublicGame') === 'true';
    const storedWager = parseFloat(localStorage.getItem('wagerAmount') || '0');
    const storedGameId = localStorage.getItem('gameIdToJoin');
    
    if (storedGameMode && storedGameMode !== selectedGameMode) {
      setSelectedGameMode(storedGameMode);
      setIsPublicGame(storedIsPublic);
      setWagerAmount(storedWager);
      console.log(`🎮 Restored from landing: ${storedGameMode}, public: ${storedIsPublic}, wager: ${storedWager}`);
    }
    
    if (storedGameId) {
      setGameIdInput(storedGameId);
      setShowGameModeSelector(false);
      console.log(`🔗 Auto-joining game: ${storedGameId.slice(0, 8)}...`);
      
      // Clear the stored game ID so it doesn't persist
      localStorage.removeItem('gameIdToJoin');
    } else {
      // Hide game mode selector and go straight to setup if coming from landing
      if (storedGameMode) {
        setShowGameModeSelector(false);
        setGamePhase('setup');
      }
    }
  }, []);

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

  // Initialize Gorbagana blockchain service
  useEffect(() => {
    const initializeGorbaganaService = async () => {
      if (publicKey) {
        try {
          console.log('✅ Backpack wallet detected - optimal for Gorbagana');
          console.log('🎮 Initialized Standard Battle mode:', selectedGameMode);
          console.log('🔌 Testing backend connection:', battleshipGameStorage.getConnectionStatus().url);
          
          // Test backend connection (non-blocking)
          try {
            await battleshipGameStorage.testConnection();
            console.log('✅ Backend connection successful');
          } catch (backendError) {
            console.error('❌ Backend connection failed:', backendError);
          }

          // Gorbagana service is now handled by WalletProvider
          console.log('✅ Gorbagana blockchain ready (via WalletProvider)');
        } catch (error) {
          console.error('❌ Gorbagana service initialization failed:', error);
        }
      }
    };
    
    initializeGorbaganaService();
  }, [publicKey, selectedGameMode]);

  // Enhanced game state syncing with backend
  useEffect(() => {
    if (battleshipGame && publicKey && (gamePhase === 'playing' || gamePhase === 'waiting')) {
      const syncGameState = async () => {
        try {
          setSyncing(true);
          
          // Sync with backend storage
          const savedGame = await battleshipGameStorage.loadGame(battleshipGame.id);
          if (savedGame && savedGame.updatedAt > battleshipGame.updatedAt) {
            setBattleshipGame(savedGame);
            console.log('🔄 Game state synced from backend');
          }
        } catch (error) {
          console.error('Error syncing game state:', error);
        } finally {
          setSyncing(false);
        }
      };

      // Sync game state periodically during active gameplay
      const interval = setInterval(syncGameState, 10000); // Every 10 seconds
      return () => clearInterval(interval);
    }
  }, [battleshipGame, gamePhase, publicKey]);

  // Check for shared game on load and auto-join
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const urlParams = new URLSearchParams(window.location.search);
    const sharedGameId = urlParams.get('game');
    
    if (sharedGameId && publicKey && !battleshipGame) {
      console.log(`🔗 Auto-joining shared game: ${sharedGameId}`);
      setGameIdInput(sharedGameId);
      
      // Hide game mode selector when handling shared game
      setShowGameModeSelector(false);
      
      // Auto-join the game after a short delay to ensure wallet is ready
      setTimeout(async () => {
        try {
          // Check if game exists and if player should auto-join
          const existingGame = await battleshipGameStorage.getGame(sharedGameId);
          if (existingGame && existingGame.player1 !== publicKey.toString() && !existingGame.player2) {
            console.log('✅ Auto-joining game as player 2');
            await joinGame();
            // Clear URL parameter after successful join
            window.history.replaceState({}, document.title, window.location.pathname);
          } else if (existingGame && existingGame.player1 === publicKey.toString()) {
            console.log('✅ Resuming your own game');
            setBattleshipGame(existingGame);
            setGamePhase(existingGame.status === 'waiting' ? 'waiting' : 'playing');
          } else {
            toast.success('Game loaded! Click Join Game to participate.');
          }
        } catch (error) {
          console.error('Auto-join failed:', error);
          toast.error('Failed to auto-join game. You can still join manually.');
          // Reset to game mode selector on failure
          setShowGameModeSelector(true);
        }
      }, 1500);
    }
  }, [publicKey, battleshipGame]);

  // Game phase management
  useEffect(() => {
    if (gameState && publicKey) {
      const role = getCurrentPlayerRole(gameState, publicKey.toString());
      
      if (gameState.status === 'waiting') {
        setGamePhase('waiting');
      } else if (gameState.status === 'finished') {
        setGamePhase('finished');
      } else {
        setGamePhase('playing');
      }
    }
  }, [gameState, publicKey]);

  // Enhanced game creation with Gorbagana blockchain integration
  const createNewGame = async () => {
    console.log('🚢 CREATE NEW GAME - Starting process...');
    console.log('🚢 Game Phase:', gamePhase);
    console.log('🚢 Player Board Length:', playerBoard.length);
    console.log('🚢 Ships to Place Length:', shipsToPlace.length);
    console.log('🚢 All Ships Placed:', shipsToPlace.every(ship => ship.placed));
    
    if (!publicKey) {
      toast.error('Please connect your wallet first');
      return;
    }

    if (!validateFleetConfiguration(playerBoard)) {
      console.log('❌ Fleet validation failed');
      toast.error('Please place all ships before starting');
      return;
    }
    
    console.log('✅ Fleet validation passed - creating game...');

    setLoading(true);
    try {
      // Generate salt and commitment for secure gameplay
      const salt = generateSalt();
      const commitment = computeCommitment(playerBoard, salt);
      setPlayerSalt(salt);

      // Generate shorter 4-digit game ID
      const gameId = Math.floor(1000 + Math.random() * 9000).toString();
      
      console.log('🚢 Creating new Gorbagana Battleship game:', gameId);

      // Get board size for current game mode
      const config = GAME_MODES[selectedGameMode];
      const boardSize = config.boardSize * config.boardSize;

      // Gorbagana blockchain integration handled by WalletProvider
      console.log('✅ Gorbagana blockchain ready for game transactions');
      
      // Create escrow if wager amount > 0
      let escrowAccount = '';
      let escrowStatus = 'none';
      
      if (wagerAmount > 0) {
        try {
          console.log(`💰 Creating escrow for ${wagerAmount} GOR wager`);
          const gorbaganaService = new GorbaganaBlockchainService();
          const escrowResult = await gorbaganaService.getEscrowService().createEscrow(
            publicKey.toString(), 
            wagerAmount, 
            gameId,
            wallet,
            connection
          );
          escrowAccount = escrowResult.account;
          escrowStatus = 'created';
          // Store escrow private key for payout
          localStorage.setItem(`battleship_escrow_privkey_${gameId}`, JSON.stringify(escrowResult.escrowPrivateKey));
          console.log(`✅ Escrow account created: ${escrowAccount}`);
          toast.success(`🔒 Escrow created for ${wagerAmount} GOR`);
        } catch (escrowError) {
          console.error('❌ Failed to create escrow:', escrowError);
          // Continue with game creation but mark escrow as failed
          escrowStatus = 'failed';
          toast('⚠️ Game created but escrow failed - playing without wager', { icon: '⚠️' });
        }
      }
      
      // Create enhanced battleship game object
      const newBattleshipGame: BattleshipGame = {
        id: gameId,
        player1: publicKey.toString(),
        player1Board: playerBoard,
        player1Salt: salt,
        player1Commitment: Array.from(commitment, x => Number(x)),
        turn: 1,
        boardHits1: new Array(boardSize).fill(0),
        boardHits2: new Array(boardSize).fill(0),
        status: 'waiting',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        isPublic: isPublicGame,
        creatorName: 'Captain ' + publicKey.toString().slice(0, 6),
        phase: 'waiting',
        wager: wagerAmount,
        escrowAccount: escrowAccount,
      };

      // Save to enhanced storage system
      await battleshipGameStorage.saveGame(newBattleshipGame);
      setBattleshipGame(newBattleshipGame);
      
      // Save locally for backward compatibility
      // Game state will be saved via battleshipGameStorage
      
      // Generate share URL using the game ID
      const shareUrl = `${window.location.origin}${window.location.pathname}?game=${gameId}`;
      setGameShareUrl(shareUrl);
      
      toast.success('Game created! Share with your opponent 🚢');
      
      // Ensure proper state transitions
      setShowGameModeSelector(false); // Force hide game mode selector
      setGamePhase('waiting');
      console.log('✅ Game created successfully, moving to waiting phase');
    } catch (error) {
      console.error('Error creating game:', error);
      toast.error('Failed to create game');
    } finally {
      setLoading(false);
    }
  };

  // Enhanced game joining with storage sync
  const joinGame = async () => {
    if (!publicKey || !gameIdInput) {
      toast.error('Please enter a valid Game ID and connect wallet');
      return;
    }

    if (!validateFleetConfiguration(playerBoard)) {
      toast.error('Please place all ships before joining');
      return;
    }

    setLoading(true);
    try {
      // Generate salt and commitment
      const salt = generateSalt();
      const commitment = computeCommitment(playerBoard, salt);
      setPlayerSalt(salt);
      
      // Load or create battleship game object
      let battleshipGameData = await battleshipGameStorage.getGame(gameIdInput);
      if (!battleshipGameData) {
        toast.error('Game not found. Please check the Game ID.');
        return;
      }

      // Add player 2 to escrow if there's a wager
      if (battleshipGameData.wager && battleshipGameData.wager > 0 && battleshipGameData.escrowAccount) {
        try {
          console.log(`💰 Adding player 2 to escrow for ${battleshipGameData.wager} GOR wager`);
          const gorbaganaService = new GorbaganaBlockchainService();
          await gorbaganaService.getEscrowService().addPlayerToEscrow(
            battleshipGameData.escrowAccount,
            publicKey.toString(),
            battleshipGameData.wager,
            wallet,
            connection
          );
          console.log(`✅ Player 2 added to escrow account: ${battleshipGameData.escrowAccount}`);
          toast.success(`🔒 Joined escrow with ${battleshipGameData.wager} GOR stake`);
        } catch (escrowError) {
          console.error('❌ Failed to join escrow:', escrowError);
          toast('⚠️ Joined game but escrow join failed', { icon: '⚠️' });
        }
      }

      // Update existing game with player 2 info
      battleshipGameData = {
        ...battleshipGameData,
        player2: publicKey.toString(),
        player2Board: playerBoard,
        player2Salt: salt,
        player2Commitment: Array.from(commitment, x => Number(x)),
        status: 'playing',
        updatedAt: Date.now(),
        phase: 'playing',
      };

      await battleshipGameStorage.saveGame(battleshipGameData);
      setBattleshipGame(battleshipGameData);
      
      // Save locally for backward compatibility
      // Game state will be saved via battleshipGameStorage
      
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
    const newBoard = [...playerBoard];
    placeShip(newBoard, x, y, currentShip.length, shipOrientation, getBoardSize());
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
    if (!battleshipGame || !publicKey) return;

    // Check if it's player's turn
    const isPlayer1 = battleshipGame.player1 === publicKey.toString();
    const currentPlayerTurn = (isPlayer1 && battleshipGame.turn === 1) || (!isPlayer1 && battleshipGame.turn === 2);
    
    if (!currentPlayerTurn) {
      toast.error('Not your turn!');
      return;
    }

    // Check if already shot here
    const boardSize = getBoardSize();
    const index = x + y * boardSize;
    const opponentHits = isPlayer1 ? battleshipGame.boardHits2 : battleshipGame.boardHits1;
    if (opponentHits[index] !== 0) {
      toast.error('Already shot at this coordinate');
      return;
    }

    // For now, implement simple local gameplay
    // In a full implementation, this would call the backend API
    setLoading(true);
    try {
      // Determine if shot was a hit based on opponent's board
      const opponentBoard = isPlayer1 ? battleshipGame.player2Board : battleshipGame.player1Board;
      if (!opponentBoard) {
        toast.error('Opponent board not available');
        return;
      }
      
      const wasHit = opponentBoard[index] === 1;

      // Update hits array
      const newHits = [...opponentHits];
      newHits[index] = wasHit ? 2 : 1; // 1 = miss, 2 = hit

      // Check for win condition (all enemy ships sunk)
      const enemyShipSquares = opponentBoard.filter(cell => cell === 1).length;
      const enemyHitsReceived = newHits.filter(hit => hit === 2).length;
      const gameWon = enemyHitsReceived >= enemyShipSquares;
      
      let gameStatus = battleshipGame.status;
      let gamePhase = 'playing';
      let winnerAddress = null;
      
      if (gameWon) {
        gameStatus = 'finished';
        gamePhase = 'finished';
        winnerAddress = publicKey.toString();
        
        // Handle escrow payout for winner
        if (battleshipGame.wager && battleshipGame.wager > 0 && battleshipGame.escrowAccount) {
          try {
            console.log(`🏆 Game won! Processing payout for ${battleshipGame.wager * 2} GOR`);
            const gorbaganaService = new GorbaganaBlockchainService();
            const payoutResult = await gorbaganaService.completeGameWithPayouts(
              battleshipGame.id,
              winnerAddress,
              battleshipGame.player1,
              battleshipGame.player2 || '',
              battleshipGame.wager,
              battleshipGame.escrowAccount
            );
            
            if (payoutResult.success) {
              toast.success(`🎉 Victory! ${battleshipGame.wager * 2} GOR transferred to your wallet!`);
            }
          } catch (payoutError) {
            console.error('❌ Payout failed:', payoutError);
            toast('🏆 You won! But payout processing failed.', { icon: '⚠️' });
          }
        }
        
        toast.success(`🎉 VICTORY! You sank all enemy ships!`);
      }

      // Update game state
      const updatedGame = {
        ...battleshipGame,
        [isPlayer1 ? 'boardHits2' : 'boardHits1']: newHits,
        turn: gameWon ? battleshipGame.turn : (isPlayer1 ? 2 : 1), // Don't switch turns if game is won
        status: gameStatus,
        phase: gamePhase as 'setup' | 'placement' | 'waiting' | 'playing' | 'reveal' | 'finished',
        winner: gameWon ? (isPlayer1 ? 1 : 2) : undefined,
        updatedAt: Date.now(),
      };

      setBattleshipGame(updatedGame);
      await battleshipGameStorage.saveGame(updatedGame);
      
      if (gameWon) {
        setGamePhase('finished');
      }

      toast.success(`${wasHit ? 'HIT!' : 'Miss'} at ${formatCoordinate(x, y)}!`);
    } catch (error) {
      console.error('Error firing shot:', error);
      toast.error('Failed to fire shot');
    } finally {
      setLoading(false);
    }
  };

  // These functions are no longer needed with simplified local gameplay
  // Shot results are immediately determined in fireShot()
  const revealShotResult = async () => {
    // No longer needed - shot results are immediate
    console.log('revealShotResult: Not needed with current implementation');
  };

  const revealBoard = async () => {
    // No longer needed - board reveals happen automatically at game end
    console.log('revealBoard: Not needed with current implementation');
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
    console.log('🎲 Generating random fleet for mode:', selectedGameMode);
    const randomBoard = generateRandomFleet(selectedGameMode);
    setPlayerBoard(randomBoard);
    
    // Mark all ships as placed
    const newShips = shipsToPlace.map(ship => ({ ...ship, placed: true }));
    setShipsToPlace(newShips);
    setCurrentShipIndex(newShips.length);
    
    // STAY in placement phase so the "Create Game" button appears
    // Do NOT go back to setup phase
    console.log('✅ Random fleet generated, staying in placement phase');
    
    const config = GAME_MODES[selectedGameMode];
    toast.success(`Random ${config.name} fleet generated! Click "Create Game" to start.`);
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

  // Handle wager change
  const handleWagerChange = (amount: number) => {
    setWagerAmount(amount);
  };

  // Abandon game with escrow refunds
  const abandonGame = async () => {
    if (!publicKey || !battleshipGame?.id) {
      toast.error('Cannot abandon game: missing required data');
      return;
    }

    setAbandoning(true);
    try {
      console.log(`🚪 Abandoning game ${battleshipGame.id}`);
      
      // Handle escrow refunds if there's a wager
      if (battleshipGame.wager && battleshipGame.wager > 0) {
        console.log(`💰 Processing refunds for abandoned game with ${battleshipGame.wager} GOR wager`);
        
        // Initialize Gorbagana service for escrow handling
        const gorbaganaService = new GorbaganaBlockchainService();
        
        try {
          const playerA = battleshipGame.player1;
          const playerB = battleshipGame.player2;
          const wagerAmount = battleshipGame.wager;
          // Retrieve escrow private key from localStorage
          const escrowPrivKeyStr = localStorage.getItem(`battleship_escrow_privkey_${battleshipGame.id}`);
          if (!escrowPrivKeyStr) {
            toast.error('Escrow private key not found. Only the game creator can process payout/refund.');
            return;
          }
          const escrowPrivKey = JSON.parse(escrowPrivKeyStr);
          let refundResults;
          if (playerB) {
            // Both players joined - refund both
            console.log('🔄 Both players joined - refunding both');
            refundResults = await gorbaganaService.getEscrowService().refundBothPlayers(
              battleshipGame.escrowAccount,
              playerA,
              playerB,
              wagerAmount,
              escrowPrivKey,
              connection
            );
            if (Array.isArray(refundResults)) {
              const successfulRefunds = refundResults.filter(r => r.success).length;
              toast.success(`🔄 ${successfulRefunds}/2 players refunded their ${wagerAmount} GOR wager`);
            }
          } else {
            // Only creator joined - refund creator
            console.log('🔄 Only creator joined - refunding creator');
            refundResults = await gorbaganaService.getEscrowService().refundSinglePlayer(
              battleshipGame.escrowAccount,
              playerA,
              wagerAmount,
              escrowPrivKey,
              connection
            );
            if (refundResults.success) {
              toast.success(`🔄 ${wagerAmount} GOR wager refunded to creator`);
            }
          }
        } catch (refundError) {
          console.error('❌ Escrow refund failed:', refundError);
          toast.error('Refund processing failed. Game will still be abandoned.');
        }
      }

      // Call backend to mark game as abandoned
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002'}/api/games/${battleshipGame.id}/abandon`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          playerAddress: publicKey.toString(),
          reason: 'player_left'
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        toast.success(result.message || 'Game abandoned successfully');
        
        // Reset game state
        setGamePhase('setup');
        setBattleshipGame(null);
        setGameState(null);
        setEscrowStatus('refunded');
        
      } else {
        toast.error(result.error || 'Failed to abandon game');
      }
    } catch (error) {
      console.error('Error abandoning game:', error);
      toast.error('Failed to abandon game');
    } finally {
      setAbandoning(false);
    }
  };

  // Handle join from public lobby
  const handleJoinPublicGame = (gameId: string) => {
    setGameIdInput(gameId);
    setShowPublicLobby(false);
    
    // Trigger join game flow
    if (gameId.trim()) {
      setGamePhase('placement');
      toast.success('Joining public game...');
    }
  };

  // Debug logging for state
  console.log('🔍 BattleshipGame state:', {
    publicKey: publicKey?.toString().slice(0, 8) + '...',
    showGameModeSelector,
    gamePhase,
    battleshipGame: battleshipGame?.id,
    selectedGameMode
  });

  // Show wallet connection screen if not connected
  if (!publicKey) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-teal-50 to-blue-100 py-8">
        <div className="container mx-auto px-4 max-w-4xl">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="bg-gradient-to-r from-blue-600 to-teal-600 p-3 rounded-full">
                <Anchor className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-teal-600 bg-clip-text text-transparent">
                Gorbagana Battleship
              </h1>
            </div>
            <p className="text-gray-600 text-lg">
              Engage in strategic naval warfare on the Gorbagana blockchain
            </p>
            
            {/* Quick Stats */}
            <div className="flex items-center justify-center gap-6 mt-6 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <Waves className="w-4 h-4 text-blue-600" />
                <span>Lightning Fast</span>
              </div>
              <div className="flex items-center gap-2">
                <Compass className="w-4 h-4 text-teal-600" />
                <span>Cross-Device</span>
              </div>
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-green-600" />
                <span>Real-time</span>
              </div>
            </div>
          </div>

          {/* Gorbagana Info */}
          <div className="mb-8">
            <GorbaganaInfo variant="full" />
          </div>

          {/* Wallet Connection Card */}
          <div className="bg-white rounded-xl shadow-lg border border-blue-200 p-8 text-center">
            <div className="bg-gradient-to-r from-blue-100 to-teal-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
              <Ship className="w-10 h-10 text-blue-600" />
            </div>
            
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Ready to Command Your Fleet?</h2>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              Connect your wallet to start playing blockchain battleship. Deploy your ships, 
              engage in battles, and dominate the seas!
            </p>
            
            <div className="space-y-4">
              <WalletMultiButton 
                style={{
                  background: 'linear-gradient(to right, #2563eb, #0d9488)',
                  width: '100%',
                  height: '3.5rem',
                  borderRadius: '0.5rem',
                  fontWeight: '600',
                  fontSize: '1rem',
                  border: 'none',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                  transition: 'all 0.2s ease-in-out'
                }}
                className="wallet-button-custom"
              />

              {/* Faucet Card */}
              <GorbaganaFaucet variant="card" />
            </div>
          </div>

          {/* Bottom Info */}
          <div className="mt-8 text-center text-sm text-gray-500">
            <p>Powered by Gorbagana Network • Secure • Fast • Fun</p>
          </div>
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
              <h1 className="text-4xl font-bold text-gray-800 mb-4">🗑️ Choose Collection Mode</h1>
              <p className="text-gray-600">Select your preferred waste management style for the ultimate trash collection experience</p>
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
                    {key === 'quick' ? '🚛' : key === 'standard' ? '🗑️' : '🏭'}
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

  useEffect(() => {
    if (selectedGameMode === 'quick' && gamePhase === 'placement') {
      generateRandomShips();
    }
  }, [selectedGameMode, gamePhase]);

  return (
    <div className="max-w-3xl mx-auto py-8 space-y-8">
      {/* Step 1: Game Mode Selection */}
      <section>
        <h2 className="text-xl font-bold mb-2">Step 1: Select Game Mode</h2>
        <div className="flex gap-2">
          {Object.keys(GAME_MODES).map((mode) => (
            <button
              key={mode}
              onClick={() => setSelectedGameMode(mode as GameMode)}
              disabled={!!battleshipGame}
              className={`px-4 py-2 rounded ${selectedGameMode === mode ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'} ${battleshipGame ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {GAME_MODES[mode].name}
            </button>
          ))}
        </div>
        {selectedGameMode && (
          <div className="text-sm text-gray-600 mt-1">
            Selected: {GAME_MODES[selectedGameMode].name}
          </div>
        )}
      </section>

      {/* Step 2: Wager Input */}
      <section>
        <h2 className="text-xl font-bold mb-2">Step 2: Set Wager</h2>
        <WalletBalance
          showWagerInput={true}
          onWagerChange={setWagerAmount}
          currentWager={wagerAmount}
          className="max-w-md"
          disabled={!!battleshipGame}
        />
        {wagerAmount > 0 && (
          <div className="text-sm text-gray-600 mt-1">
            Wager: {wagerAmount} GOR
          </div>
        )}
      </section>

      {/* Step 3: Fleet Placement */}
      <section>
        <h2 className="text-xl font-bold mb-2">Step 3: Place Your Fleet</h2>
        <GameBoard
          board={playerBoard}
          hits={new Array(getBoardSize() * getBoardSize()).fill(0)}
          onCellClick={placeShipOnBoard}
          onCellHover={handleBoardHover}
          isOwnBoard={true}
          isPlacementMode={true}
          isInteractive={!!selectedGameMode && wagerAmount > 0 && !battleshipGame}
          hoveredShip={hoveredShip}
          boardSize={getBoardSize()}
        />
      </section>

      {/* Step 4: Create/Join Game */}
      <section>
        <h2 className="text-xl font-bold mb-2">Step 4: Create or Join Game</h2>
        <button
          onClick={createNewGame}
          disabled={!shipsToPlace.every(ship => ship.placed) || !!battleshipGame}
          className="px-6 py-3 bg-green-600 text-white rounded disabled:opacity-50"
        >
          Create Game
        </button>
        <input
          type="text"
          placeholder="Enter Game ID to Join"
          value={gameIdInput}
          onChange={(e) => setGameIdInput(e.target.value)}
          disabled={!!battleshipGame}
          className="ml-4 px-4 py-2 border rounded"
        />
        <button
          onClick={joinGame}
          disabled={!shipsToPlace.every(ship => ship.placed) || !gameIdInput || !!battleshipGame}
          className="px-6 py-3 bg-blue-600 text-white rounded disabled:opacity-50 ml-2"
        >
          Join Game
        </button>
      </section>

      {/* Step 5: Play Game */}
      {battleshipGame && (
        <section>
          <h2 className="text-xl font-bold mb-2">Step 5: Play!</h2>
          {/* Render the main game board and controls here */}
          {/* ...existing game play UI... */}
        </section>
      )}
    </div>
  );
};

export default BattleshipGame; 