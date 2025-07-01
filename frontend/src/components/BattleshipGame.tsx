'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import toast from 'react-hot-toast';
import { Share2, Users, Copy, ExternalLink, RefreshCw, Gamepad2, ArrowLeft, Anchor, Settings, Trophy, Waves, Compass, Target, Ship, DollarSign, AlertTriangle } from 'lucide-react';

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
  BattleshipGame, 
  convertToBattleshipGame, 
  convertFromBattleshipGame 
} from '../lib/gameStorage';

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
  const { publicKey } = useWallet();

  // Game mode state
  const [selectedGameMode, setSelectedGameMode] = useState<GameMode>('standard');
  const [showGameModeSelector, setShowGameModeSelector] = useState(true);

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

  // Enhanced game creation with Gorbagana blockchain integration
  const createNewGame = async () => {
    if (!publicKey) {
      toast.error('Please connect your wallet first');
      return;
    }

    if (!validateFleetConfiguration(playerBoard)) {
      toast.error('Please place all ships before starting');
      return;
    }

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
            gameId
          );
          escrowAccount = escrowResult.account;
          escrowStatus = 'created';
          console.log(`✅ Escrow account created: ${escrowAccount}`);
          toast.success(`🔒 Escrow created for ${wagerAmount} GOR`);
        } catch (escrowError) {
          console.error('❌ Failed to create escrow:', escrowError);
          // Continue with game creation but mark escrow as failed
          escrowStatus = 'failed';
          toast.warning('⚠️ Game created but escrow failed - playing without wager');
        }
      }
      
      // Create enhanced battleship game object
      const newBattleshipGame: BattleshipGame = {
        id: gameId,
        player1: publicKey.toString(),
        player1Board: playerBoard,
        player1Salt: salt,
        player1Commitment: Array.from(commitment),
        turn: 1,
        boardHits1: new Array(boardSize).fill(0),
        boardHits2: new Array(boardSize).fill(0),
        status: 'waiting',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        isPublic: isPublicGame,
        creatorName: 'Captain ' + publicKey.toString().slice(0, 6),
        phase: 'waiting',
        wagerAmount: wagerAmount,
        escrowAccount: escrowAccount,
        escrowStatus: escrowStatus,
      };

      // Save to enhanced storage system
      await battleshipGameStorage.saveGame(newBattleshipGame);
      setBattleshipGame(newBattleshipGame);
      
      // Save locally for backward compatibility
      saveGameState(gameId, playerBoard, salt);
      
      // Generate share URL using the game ID
      const shareUrl = `${window.location.origin}${window.location.pathname}?game=${gameId}`;
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
      let updatedEscrowStatus = battleshipGameData.escrowStatus;
      if (battleshipGameData.wagerAmount > 0 && battleshipGameData.escrowAccount) {
        try {
          console.log(`💰 Adding player 2 to escrow for ${battleshipGameData.wagerAmount} GOR wager`);
          const gorbaganaService = new GorbaganaBlockchainService();
          await gorbaganaService.getEscrowService().addPlayerToEscrow(
            battleshipGameData.escrowAccount,
            publicKey.toString()
          );
          updatedEscrowStatus = 'active';
          console.log(`✅ Player 2 added to escrow account: ${battleshipGameData.escrowAccount}`);
          toast.success(`🔒 Joined escrow with ${battleshipGameData.wagerAmount} GOR stake`);
        } catch (escrowError) {
          console.error('❌ Failed to join escrow:', escrowError);
          toast.warning('⚠️ Joined game but escrow join failed');
        }
      }

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
        escrowStatus: updatedEscrowStatus,
      };

      await battleshipGameStorage.saveGame(battleshipGameData);
      setBattleshipGame(battleshipGameData);
      
      // Save locally for backward compatibility
      saveGameState(gameIdInput, playerBoard, salt);
      
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
        if (battleshipGame.wagerAmount > 0 && battleshipGame.escrowAccount) {
          try {
            console.log(`🏆 Game won! Processing payout for ${battleshipGame.wagerAmount * 2} GOR`);
            const gorbaganaService = new GorbaganaBlockchainService();
            const payoutResult = await gorbaganaService.completeGameWithPayouts(
              battleshipGame.id,
              winnerAddress,
              battleshipGame.player1,
              battleshipGame.player2 || '',
              battleshipGame.wagerAmount,
              battleshipGame.escrowAccount
            );
            
            if (payoutResult.success) {
              toast.success(`🎉 Victory! ${battleshipGame.wagerAmount * 2} GOR transferred to your wallet!`);
            }
          } catch (payoutError) {
            console.error('❌ Payout failed:', payoutError);
            toast.warning('🏆 You won! But payout processing failed.');
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
        phase: gamePhase,
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
      if (battleshipGame.wagerAmount && battleshipGame.wagerAmount > 0) {
        console.log(`💰 Processing refunds for abandoned game with ${battleshipGame.wagerAmount} GOR wager`);
        
        // Initialize Gorbagana service for escrow handling
        const gorbaganaService = new GorbaganaBlockchainService();
        
        try {
          const playerA = battleshipGame.player1;
          const playerB = battleshipGame.player2;
          const wagerAmount = battleshipGame.wagerAmount;
          
          let refundResults;
          if (playerB) {
            // Both players joined - refund both
            console.log('🔄 Both players joined - refunding both players');
            refundResults = await gorbaganaService.handleAbandonedGame(
              battleshipGame.id, 
              playerA, 
              playerB, 
              wagerAmount, 
              battleshipGame.escrowAccount
            );
            
            if (Array.isArray(refundResults)) {
              const successfulRefunds = refundResults.filter(r => r.success).length;
              toast.success(`🔄 ${successfulRefunds}/2 players refunded their ${wagerAmount} GOR wager`);
            }
          } else {
            // Only creator joined - refund creator
            console.log('🔄 Only creator joined - refunding creator');
            refundResults = await gorbaganaService.handleAbandonedGame(
              battleshipGame.id, 
              playerA, 
              null, 
              wagerAmount, 
              battleshipGame.escrowAccount
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-teal-50 to-blue-100 py-4">
      <div className="container mx-auto px-4 max-w-7xl">
        {/* Enhanced Header */}
        <div className="bg-white rounded-xl shadow-lg border border-blue-200 p-6 mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            {/* Title Section */}
            <div className="flex items-center gap-4">
              <div className="bg-gradient-to-r from-blue-600 to-teal-600 p-3 rounded-full">
                <Anchor className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-teal-600 bg-clip-text text-transparent">
                  Gorbagana Battleship
                </h1>
                <p className="text-gray-600 text-sm">Strategic naval warfare on the blockchain</p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3 flex-wrap">
              <GorbaganaFaucet variant="inline" />
              
              <WalletMultiButton 
                style={{
                  background: 'linear-gradient(to right, #f3f4f6, #e5e7eb)',
                  color: '#374151',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.5rem',
                  fontWeight: '500',
                  fontSize: '0.875rem',
                  padding: '0.5rem 1rem',
                  transition: 'all 0.2s ease-in-out'
                }}
                className="wallet-button-custom"
              />
            </div>
          </div>

          {/* Wallet Info Bar */}
          <div className="mt-4 pt-4 border-t border-gray-200 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 text-sm">
            <div className="flex items-center gap-4 text-gray-600">
              <span className="font-medium">Fleet Admiral:</span>
              <code className="bg-blue-50 px-2 py-1 rounded text-blue-700 border border-blue-200">
                {publicKey?.toString().slice(0, 8)}...{publicKey?.toString().slice(-8)}
              </code>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-gray-600 text-xs">Gorbagana Network</span>
              </div>
              <span className="text-gray-400">|</span>
              <span className="text-gray-600 text-xs">Ready for battle</span>
            </div>
          </div>
        </div>

        {/* Compact Gorbagana Info */}
        <div className="mb-6">
          <GorbaganaInfo variant="compact" />
        </div>

        {/* Wallet Balance Display */}
        <div className="mb-6">
          <WalletBalance />
        </div>

        {/* Fallback: Show game mode selector if no active game and not in mode selector */}
        {!showGameModeSelector && !battleshipGame && gamePhase === 'setup' && (
          <div className="bg-white rounded-xl shadow-lg border border-blue-200 p-8 mb-6">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-teal-600 bg-clip-text text-transparent mb-4">Ready to Start Playing?</h2>
              <p className="text-gray-600">Choose your battle mode to begin</p>
            </div>
            
            <div className="flex justify-center">
              <button
                onClick={() => setShowGameModeSelector(true)}
                className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg flex items-center gap-2"
              >
                <Anchor className="w-5 h-5" />
                Choose Battle Mode
              </button>
            </div>
          </div>
        )}

        {/* Game setup and sharing section - ALWAYS show if no active game */}
        {gamePhase === 'setup' && !battleshipGame && (
          <div className="bg-white rounded-xl shadow-lg border border-blue-200 p-8 mb-6">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-3">
                <div className="bg-gradient-to-r from-blue-100 to-teal-100 p-3 rounded-full">
                  <Ship className="w-6 h-6 text-blue-600" />
                </div>
                <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-teal-600 bg-clip-text text-transparent">Fleet Command Center</h2>
              </div>
              <button
                onClick={() => setShowGameModeSelector(true)}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white rounded-lg transition-all duration-200 shadow-md hover:shadow-lg"
              >
                <ArrowLeft className="w-4 h-4" />
                Change Mode
              </button>
            </div>

            {/* Wager Input Section */}
            <div className="mb-8">
              <WalletBalance 
                showWagerInput={true}
                onWagerChange={handleWagerChange}
                currentWager={wagerAmount}
              />
            </div>
            
            <div className="grid md:grid-cols-2 gap-8">
              {/* Create new game */}
              <div className="space-y-6">
                <div className="flex items-center gap-3">
                  <div className="bg-gradient-to-r from-blue-100 to-blue-200 p-2 rounded-lg">
                    <Anchor className="w-5 h-5 text-blue-600" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-800">Launch New Battle</h3>
                </div>
                
                <div className="space-y-4">
                  <label className="flex items-center space-x-3 p-4 bg-blue-50 rounded-lg border border-blue-200 hover:bg-blue-100 transition-colors cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isPublicGame}
                      onChange={(e) => setIsPublicGame(e.target.checked)}
                      className="w-4 h-4 text-blue-600 bg-white border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                    />
                    <span className="text-gray-700 font-medium">Public Battle (allow others to join)</span>
                  </label>
                  
                  <button
                    onClick={() => {
                      if (!selectedGameMode) {
                        setShowGameModeSelector(true);
                        toast.error('Please select a game mode first');
                        return;
                      }
                      setGamePhase('placement');
                    }}
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold py-4 px-6 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <Anchor className="w-5 h-5" />
                    Deploy Fleet
                  </button>
                </div>
              </div>

              {/* Join existing game */}
              <div className="space-y-6">
                <div className="flex items-center gap-3">
                  <div className="bg-gradient-to-r from-teal-100 to-teal-200 p-2 rounded-lg">
                    <Users className="w-5 h-5 text-teal-600" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-800">Join Fleet</h3>
                </div>
                
                <div className="space-y-4">
                  <input
                    type="text"
                    placeholder="Enter Battle ID or paste invitation link"
                    value={gameIdInput}
                    onChange={(e) => setGameIdInput(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all duration-200"
                  />
                  
                  <button
                    onClick={() => {
                      if (gameIdInput.trim()) {
                        setGamePhase('placement');
                      } else {
                        toast.error('Please enter a Battle ID');
                      }
                    }}
                    disabled={loading || !gameIdInput.trim()}
                    className="w-full bg-gradient-to-r from-teal-600 to-teal-700 hover:from-teal-700 hover:to-teal-800 text-white font-semibold py-4 px-6 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <Users className="w-5 h-5" />
                    Join Battle
                  </button>
                </div>
                
                <div className="mt-6 pt-4 border-t border-gray-200">
                  <GorbaganaFaucet variant="inline" className="justify-center" />
                </div>
              </div>
            </div>

            {/* Public Games Lobby */}
            <div className="mt-8 pt-6 border-t border-gray-200">
              {showPublicLobby ? (
                <PublicGamesLobby 
                  onJoinGame={handleJoinPublicGame}
                  className="mt-4"
                />
              ) : (
                <div className="text-center">
                  <button
                    onClick={() => {
                      setShowPublicLobby(true);
                      loadPublicGames();
                    }}
                    className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white rounded-lg font-medium transition-all duration-200 shadow-md hover:shadow-lg mx-auto"
                  >
                    <Trophy className="w-5 h-5" />
                    Browse Admiral's Harbor
                  </button>
                  <p className="text-gray-600 text-sm mt-2">Discover public battles waiting for challengers</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Ship placement phase */}
        {gamePhase === 'placement' && (
          <div className="bg-white rounded-xl shadow-lg border border-blue-200 p-8 mb-6">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8">
              <div className="flex items-center gap-4">
                <div className="bg-gradient-to-r from-blue-100 to-teal-100 p-3 rounded-full">
                  <Ship className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-teal-600 bg-clip-text text-transparent mb-2">Deploy Your Fleet</h2>
                  <p className="text-gray-600">
                    {currentShipIndex < shipsToPlace.length 
                      ? `Position ${STANDARD_FLEET[currentShipIndex].name} (${shipsToPlace[currentShipIndex].length} squares)`
                      : 'Fleet deployment complete! Ready for battle.'
                    }
                  </p>
                </div>
              </div>
              
              <div className="flex gap-3 mt-6 lg:mt-0">
                <button
                  onClick={() => setShipOrientation(shipOrientation === 'horizontal' ? 'vertical' : 'horizontal')}
                  className="px-6 py-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-lg transition-all duration-200 shadow-md hover:shadow-lg font-medium"
                >
                  <Compass className="w-4 h-4 inline mr-2" />
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

        {/* Waiting for opponent - Show game board with sharing interface */}
        {gamePhase === 'waiting' && battleshipGame && (
          <div className="space-y-6">
            {/* Share and wait header */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="text-center">
                <h2 className="text-2xl font-bold text-gray-800 mb-4">🚢 Game Ready!</h2>
                <p className="text-gray-600 mb-4">Game ID: <span className="font-mono font-bold text-blue-600">{battleshipGame.id}</span></p>
                <p className="text-gray-600 mb-6">Share with your opponent to start the battle!</p>
                
                {/* Compact sharing options */}
                <div className="flex gap-2 justify-center mb-4">
                  <button
                    onClick={copyGameId}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2"
                  >
                    <Copy className="w-4 h-4" />
                    Copy ID
                  </button>
                  <button
                    onClick={shareGame}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors flex items-center gap-2"
                  >
                    <Share2 className="w-4 h-4" />
                    Share
                  </button>
                </div>

                {/* Game status */}
                <div className="text-sm text-gray-500">
                  <p>⏳ Waiting for player 2 to join...</p>
                  {battleshipGame.wagerAmount > 0 && (
                    <p className="text-orange-600 font-medium">💰 Wager: {battleshipGame.wagerAmount} GOR • Escrow: {battleshipGame.escrowStatus}</p>
                  )}
                  {battleshipGame.isPublic && <p>📢 Public game</p>}
                </div>
              </div>
            </div>

            {/* Show your fleet while waiting */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-xl font-bold text-gray-800 mb-4">🛡️ Your Fleet (Ready for Battle)</h3>
              <div className="flex justify-center">
                <GameBoard
                  board={playerBoard}
                  hits={new Array(getBoardSize() * getBoardSize()).fill(0)}
                  onCellClick={() => {}}
                  isOwnBoard={true}
                  isPlacementMode={false}
                  isInteractive={false}
                  showShips={true}
                  boardSize={getBoardSize()}
                />
              </div>
              <div className="mt-4 text-center text-sm text-gray-600">
                Fleet deployed: {getTotalShipSquares()} ship squares ready for battle
              </div>
            </div>

            {/* Auto-start message */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
              <p className="text-blue-700 font-medium">
                🎯 When your opponent joins, the battle will start automatically!
              </p>
            </div>
          </div>
        )}

        {/* Playing phase - Enhanced battle interface */}
        {gamePhase === 'playing' && battleshipGame && (
          <div className="space-y-6">
            {/* Game status header */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <h2 className="text-2xl font-bold text-gray-800 mb-2">⚔️ Battle in Progress!</h2>
                  <p className="text-lg text-gray-600">
                    Turn {battleshipGame.turn} • {battleshipGame.player1 === publicKey!.toString() ? 'You are Player 1' : 'You are Player 2'}
                  </p>
                  {wagerAmount > 0 && (
                    <div className="flex items-center gap-2 mt-2">
                      <DollarSign className="w-4 h-4 text-orange-600" />
                      <span className="text-orange-600 font-medium">
                        Stakes: {wagerAmount} GOR • Escrow: {escrowStatus}
                      </span>
                    </div>
                  )}
                </div>
                
                <div className="flex gap-2 flex-wrap">
                  {wagerAmount > 0 && (
                    <button
                      onClick={abandonGame}
                      disabled={abandoning}
                      className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-lg transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                    >
                      <AlertTriangle className="w-4 h-4" />
                      {abandoning ? 'Abandoning...' : 'Abandon'}
                    </button>
                  )}
                  
                  <button
                    onClick={syncGameState}
                    disabled={syncing}
                    className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 text-sm"
                  >
                    <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
                    Sync
                  </button>
                  
                  {battleshipGame && (
                    <button
                      onClick={shareGame}
                      className="flex items-center gap-2 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors text-sm"
                    >
                      <Share2 className="w-4 h-4" />
                      Share
                    </button>
                  )}
                </div>
              </div>

              {/* Pending shot notification - Simplified for current implementation */}
              <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-blue-700">Ready to battle! Click on enemy waters to fire shots.</p>
              </div>
            </div>

            {/* Game boards */}
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Your board */}
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h3 className="text-xl font-bold text-gray-800 mb-4">🛡️ Your Fleet</h3>
                <GameBoard
                  board={playerBoard}
                  hits={battleshipGame.player1 === publicKey!.toString() ? 
                        battleshipGame.boardHits1 : battleshipGame.boardHits2}
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
                    (battleshipGame.player1 === publicKey!.toString() ? 
                     battleshipGame.boardHits1 : battleshipGame.boardHits2).filter(hit => hit === 2).length
                  } / {getTotalShipSquares()}
                </div>
              </div>

              {/* Enemy board */}
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h3 className="text-xl font-bold text-gray-800 mb-4">🎯 Enemy Waters</h3>
                <GameBoard
                  board={new Array(getBoardSize() * getBoardSize()).fill(0)}
                  hits={battleshipGame.player1 === publicKey!.toString() ? 
                        battleshipGame.boardHits2 : battleshipGame.boardHits1}
                  onCellClick={fireShot}
                  isOwnBoard={false}
                  isPlacementMode={false}
                  isInteractive={true}
                  boardSize={getBoardSize()}
                />
                <div className="mt-4 text-sm text-gray-600">
                  Your hits: {
                    (battleshipGame.player1 === publicKey!.toString() ? 
                     battleshipGame.boardHits2 : battleshipGame.boardHits1).filter(hit => hit === 2).length
                  } / {getTotalShipSquares()}
                </div>
              </div>
            </div>

            {/* Turn indicator */}
            <div className="bg-white rounded-lg shadow-lg p-4">
              <div className="text-center">
                {((battleshipGame.player1 === publicKey!.toString() && battleshipGame.turn === 1) || 
                  (battleshipGame.player2 === publicKey!.toString() && battleshipGame.turn === 2)) ? (
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
        {gamePhase === 'finished' && battleshipGame && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="text-center">
              <h2 className="text-3xl font-bold text-gray-800 mb-4">
                🎉 Battle Complete!
              </h2>
              
              <div className="mb-6">
                {battleshipGame.winner === 1 && (
                  <div className={`${battleshipGame.player1 === publicKey!.toString() ? 'text-green-600' : 'text-red-600'}`}>
                    <h3 className="text-2xl font-bold">
                      {battleshipGame.player1 === publicKey!.toString() ? '🏆 VICTORY!' : '💀 DEFEAT'}
                    </h3>
                    <p className="text-lg mt-2">Player 1 Wins!</p>
                  </div>
                )}
                {battleshipGame.winner === 2 && (
                  <div className={`${battleshipGame.player2 === publicKey!.toString() ? 'text-green-600' : 'text-red-600'}`}>
                    <h3 className="text-2xl font-bold">
                      {battleshipGame.player2 === publicKey!.toString() ? '🏆 VICTORY!' : '💀 DEFEAT'}
                    </h3>
                    <p className="text-lg mt-2">Player 2 Wins!</p>
                  </div>
                )}
                {battleshipGame.winner === 0 && (
                  <div className="text-gray-600">
                    <h3 className="text-2xl font-bold">🤝 Draw</h3>
                  </div>
                )}
              </div>

              {/* Payout information */}
              {battleshipGame.wagerAmount > 0 && (
                <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-lg p-6 mb-6">
                  <h4 className="font-bold text-gray-800 mb-3">💰 Prize Pool</h4>
                  {battleshipGame.winner && (
                    <div className="space-y-2">
                      <p className="text-lg font-semibold text-orange-600">
                        Winner Takes: {(battleshipGame.wagerAmount * 2).toFixed(4)} GOR
                      </p>
                      <p className="text-sm text-gray-600">
                        Escrow Status: {battleshipGame.escrowStatus}
                      </p>
                      {((battleshipGame.winner === 1 && battleshipGame.player1 === publicKey!.toString()) ||
                        (battleshipGame.winner === 2 && battleshipGame.player2 === publicKey!.toString())) && (
                        <p className="text-green-600 font-medium">🎉 Payout processed to your wallet!</p>
                      )}
                    </div>
                  )}
                  {!battleshipGame.winner && (
                    <p className="text-gray-600">
                      Draw - Each player refunded {battleshipGame.wagerAmount.toFixed(4)} GOR
                    </p>
                  )}
                </div>
              )}

              {/* Game statistics */}
              <div className="bg-gray-50 rounded-lg p-6 mb-6">
                <h4 className="font-semibold text-gray-800 mb-4">📊 Battle Statistics</h4>
                <div className="grid md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="font-medium">Your Hits: {
                      (battleshipGame.player1 === publicKey!.toString() ? 
                       battleshipGame.boardHits2 : battleshipGame.boardHits1).filter(hit => hit === 2).length
                    }</p>
                    <p className="font-medium">Enemy Hits on You: {
                      (battleshipGame.player1 === publicKey!.toString() ? 
                       battleshipGame.boardHits1 : battleshipGame.boardHits2).filter(hit => hit === 2).length
                    }</p>
                  </div>
                  <div>
                    <p className="font-medium">Game Mode: {GAME_MODES[selectedGameMode].name}</p>
                    <p className="font-medium">Board Size: {getBoardSize()}x{getBoardSize()}</p>
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button
                  onClick={() => {
                    setShowGameModeSelector(true);
                    setGamePhase('setup');
                    setGameState(null);
                    setBattleshipGame(null);
                    resetShips();
                  }}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  🔄 New Game
                </button>
                
                <button
                  onClick={shareGame}
                  className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors flex items-center gap-2 justify-center"
                >
                  <Share2 className="w-4 h-4" />
                  Share Result
                </button>
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
              {battleshipGame && (
                <span className="font-mono text-xs">
                  Game: {battleshipGame.id.slice(0, 8)}...
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