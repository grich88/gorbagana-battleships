"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { toast } from 'react-hot-toast';
import { LAMPORTS_PER_SOL, PublicKey, Connection, Transaction, SystemProgram, Keypair } from '@solana/web3.js';
import { Trash, Recycle, Target, Waves, Trophy, Users, Plus, Eye, RotateCw, Zap, Play, X } from 'lucide-react';
import ClientOnly from '../components/ClientOnly';

// Game types (based on Trash Combat mechanics)
type GameStatus = "waiting" | "setup" | "playing" | "finished" | "abandoned";
type CellState = "empty" | "trash" | "hit" | "miss" | "destroyed";
type GameType = "quick" | "standard" | "extended";

interface TrashCombatGame {
  id: string;
  playerA: string;
  playerB?: string;
  playerABoard: CellState[][];
  playerBBoard: CellState[][];
  playerATrash: number[][];
  playerBTrash: number[][];
  currentTurn: string;
  status: GameStatus;
  winner?: string;
  createdAt: number;
  wager: number;
  isPublic: boolean;
  gameMode: GameType;
  creatorName?: string;
  escrowAccount?: string;
  txSignature?: string;
  playerADeposit?: string;
  playerBDeposit?: string;
  updatedAt?: number;
  abandonReason?: string;
}

// API Configuration (following working pattern)
const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://gorbagana-battleship-backend.onrender.com'
  : 'http://localhost:3002';

// Gorbagana Connection Configuration
const GORBAGANA_RPC = 'https://rpc.gorbagana.wtf/';
const POLL_INTERVAL = 2000; // Poll every 2 seconds
const MAX_POLL_ATTEMPTS = 30; // 60 seconds total

// Game Mode Configurations (matching backend)
const GAME_CONFIGS = {
  quick: {
    boardSize: 6,
    trashItems: [
      { name: 'Garbage Truck', size: 3, count: 1 },
      { name: 'Pickup Van', size: 2, count: 2 }
    ],
    name: 'Quick Collection',
    description: '6x6 board • 3 trash items • Fast combat',
    duration: '~3 minutes'
  },
  standard: {
    boardSize: 10,
    trashItems: [
      { name: 'Super Hauler', size: 5, count: 1 },
      { name: 'Dumpster Truck', size: 4, count: 1 },
      { name: 'Garbage Truck', size: 3, count: 2 },
      { name: 'Pickup Van', size: 2, count: 1 }
    ],
    name: 'Standard Collection',
    description: '10x10 board • 5 trash items • Classic combat',
    duration: '~10 minutes'
  },
  extended: {
    boardSize: 12,
    trashItems: [
      { name: 'Mega Compactor', size: 6, count: 1 },
      { name: 'Super Hauler', size: 5, count: 1 },
      { name: 'Dumpster Truck', size: 4, count: 2 },
      { name: 'Garbage Truck', size: 3, count: 2 },
      { name: 'Pickup Van', size: 2, count: 2 }
    ],
    name: 'Extended Collection',
    description: '12x12 board • 8 trash items • Epic combat',
    duration: '~20 minutes'
  }
};

export default function TrashCombatGame() {
  const wallet = useWallet();
  const { connection } = useConnection();
  
  // Game state
  const [game, setGame] = useState<TrashCombatGame | null>(null);
  const [gameId, setGameId] = useState<string>("");
  const [wagerInput, setWagerInput] = useState<string>("0.001");
  const [selectedGameType, setSelectedGameType] = useState<GameType>("standard");
  const [loading, setLoading] = useState(false);
  const [gorBalance, setGorBalance] = useState<number>(0);
  
  // Get current game config
  const gameConfig = GAME_CONFIGS[selectedGameType];
  const BOARD_SIZE = gameConfig.boardSize;
  
  // Expand trash items based on count (e.g., 2 Pickup Vans becomes 2 separate items)
  const TRASH_ITEMS = gameConfig.trashItems.flatMap((item, itemIndex) => 
    Array(item.count).fill(null).map((_, countIndex) => ({
      name: item.name,
      size: item.size,
      key: `${item.name}-${itemIndex}-${countIndex}` // Unique key for React
    }))
  );

  // Board setup state
  const [isSettingUpBoard, setIsSettingUpBoard] = useState(false);
  const [playerBoard, setPlayerBoard] = useState<CellState[][]>(
    Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill("empty"))
  );
  const [placedTrash, setPlacedTrash] = useState<number[][]>([]);
  const [currentTrashIndex, setCurrentTrashIndex] = useState(0);
  const [isHorizontal, setIsHorizontal] = useState(true);
  
  // Game state
  const [escrowAccount, setEscrowAccount] = useState<Keypair | null>(null);
  const [showPublicLobby, setShowPublicLobby] = useState(false);
  const [publicGames, setPublicGames] = useState<TrashCombatGame[]>([]);
  const [makeGamePublic, setMakeGamePublic] = useState(true);
  const [isMyTurn, setIsMyTurn] = useState(false);
  const [enemyBoard, setEnemyBoard] = useState<CellState[][]>(
    Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill("empty"))
  );

  // Update boards when game type changes
  useEffect(() => {
    const newSize = GAME_CONFIGS[selectedGameType].boardSize;
    setPlayerBoard(Array(newSize).fill(null).map(() => Array(newSize).fill("empty")));
    setEnemyBoard(Array(newSize).fill(null).map(() => Array(newSize).fill("empty")));
    setPlacedTrash([]);
    setCurrentTrashIndex(0);
  }, [selectedGameType]);

  // Create empty board
  const createEmptyBoard = (): CellState[][] => {
    return Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill("empty"));
  };

  // Transaction confirmation (from working app)
  const confirmTransaction = async (signature: string): Promise<{status: string, error?: any}> => {
    console.log('🔄 Polling for transaction confirmation...');
    for (let i = 0; i < MAX_POLL_ATTEMPTS; i++) {
      try {
        const { value } = await connection.getSignatureStatuses([signature], { searchTransactionHistory: true });
        const status = value[0];
        if (status) {
          if (status.confirmationStatus === 'confirmed' || status.confirmationStatus === 'finalized') {
            console.log(`✅ Transaction confirmed after ${i + 1} polls!`);
            return status.err ? { status: 'Failed', error: status.err } : { status: 'Success' };
          }
        }
      } catch (error: any) {
        console.error(`❌ Poll ${i + 1} error:`, error.message);
      }
      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL));
    }
    throw new Error('Transaction confirmation timed out after 60 seconds.');
  };

  // Check wallet balance
  useEffect(() => {
    const fetchBalance = async () => {
      if (!wallet.publicKey || !connection) {
        setGorBalance(0);
        return;
      }

      try {
        const balance = await connection.getBalance(wallet.publicKey);
        setGorBalance(balance / LAMPORTS_PER_SOL);
        console.log(`💰 Gorbagana balance: ${balance / LAMPORTS_PER_SOL} $GOR`);
      } catch (error) {
        console.error('Error fetching balance:', error);
        setGorBalance(0);
      }
    };

    if (wallet.connected) {
      fetchBalance();
    }
  }, [wallet.publicKey, connection, wallet.connected]);

  // API request helper
  const apiRequest = async (endpoint: string, options: RequestInit = {}): Promise<any> => {
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        },
        ...options,
        signal: AbortSignal.timeout(10000)
      });
      
      if (!response.ok) {
        throw new Error(`API Error: ${response.status} - ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error(`❌ API request failed: ${endpoint}`, error);
      throw error;
    }
  };

  // Create escrow deposit (from working app pattern)
  const createEscrowDeposit = async (wagerAmount: number, gameId: string, isCreator: boolean = true, existingEscrowAccount?: string): Promise<{escrowAccount: string, txSignature: string}> => {
    console.log(`\n=== Starting Escrow Deposit for ${wagerAmount.toFixed(6)} $GOR ===`);

    if (!wallet.connected || !wallet.publicKey || !wallet.signTransaction) {
      throw new Error("❌ Wallet is not connected. Please connect your Backpack wallet first.");
    }

    if (wagerAmount <= 0) {
      throw new Error("❌ Wager amount must be greater than 0");
    }

    // Check for wallet conflicts
    if (typeof window !== 'undefined' && (window as any).__ethereumConflictWarning) {
      toast.error('🔧 Wallet conflict detected! Please disable MetaMask/Ethereum wallets and use only Backpack for Gorbagana', { duration: 8000 });
    }

    try {
      let escrowKeypair: Keypair;
      let escrowPubkey: PublicKey;
      
      if (isCreator) {
        // Game creator generates the shared escrow account
        escrowKeypair = Keypair.generate();
        escrowPubkey = escrowKeypair.publicKey;
        console.log('🔑 NEW Shared Escrow Account:', escrowPubkey.toBase58());
        setEscrowAccount(escrowKeypair);
      } else {
        // Player B deposits to existing escrow account
        const escrowAccountToUse = existingEscrowAccount || game?.escrowAccount;
        if (!escrowAccountToUse) {
          throw new Error("Cannot find shared escrow account - game creator must deposit first");
        }
        escrowPubkey = new PublicKey(escrowAccountToUse);
        console.log('🔑 EXISTING Shared Escrow Account:', escrowPubkey.toBase58());
      }
      
      // Check player balance
      const playerBalance = await connection.getBalance(wallet.publicKey);
      const wagerLamports = Math.floor(wagerAmount * LAMPORTS_PER_SOL);
      const minRequired = wagerLamports + 5000; // Add fee buffer

      console.log(`💰 Player Balance: ${(playerBalance / LAMPORTS_PER_SOL).toFixed(6)} $GOR`);
      console.log(`🎯 Wager Required: ${wagerAmount.toFixed(6)} $GOR`);

      if (playerBalance < minRequired) {
        throw new Error(`Insufficient $GOR balance. Have ${(playerBalance / LAMPORTS_PER_SOL).toFixed(6)}, need ${(minRequired / LAMPORTS_PER_SOL).toFixed(6)}`);
      }

      // Create transaction
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
      
      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: wallet.publicKey,
          toPubkey: escrowPubkey,
          lamports: wagerLamports,
        })
      );
      
      transaction.feePayer = wallet.publicKey;
      transaction.recentBlockhash = blockhash;

      // Sign and send transaction
      console.log('✍️ Signing transaction...');
      const signedTransaction = await wallet.signTransaction(transaction);
      
      console.log('📡 Sending transaction to Gorbagana...');
      const signature = await connection.sendRawTransaction(signedTransaction.serialize());
      
      console.log(`📝 Transaction sent: ${signature}`);
      toast.loading('⏳ Confirming transaction on Gorbagana...', { id: 'escrow-tx' });

      // Confirm transaction
      const confirmation = await confirmTransaction(signature);
      
      if (confirmation.status === 'Success') {
        console.log('✅ Escrow deposit confirmed!');
        toast.success('✅ Escrow deposit confirmed!', { id: 'escrow-tx' });
        
        return {
          escrowAccount: escrowPubkey.toBase58(),
          txSignature: signature
        };
      } else {
        throw new Error('Transaction failed: ' + JSON.stringify(confirmation.error));
      }
      
    } catch (error: any) {
      console.error('❌ Escrow deposit failed:', error);
      toast.error('❌ Escrow deposit failed: ' + error.message, { id: 'escrow-tx' });
      throw error;
    }
  };

  // Complete Escrow Payout System
  const processEscrowPayout = async (gameId: string, payoutType: 'winner' | 'refund' | 'draw'): Promise<boolean> => {
    if (!wallet.connected || !wallet.publicKey || !wallet.signTransaction) {
      throw new Error("❌ Wallet is not connected for payout processing.");
    }

    if (!game?.escrowAccount) {
      throw new Error("❌ No escrow account found for this game.");
    }

    // Only the game creator (who has the escrow keypair) can process payouts
    const isGameCreator = game.playerA === wallet.publicKey.toBase58();
    if (!isGameCreator || !escrowAccount) {
      throw new Error("❌ Only the game creator can process escrow payouts. Missing escrow keypair.");
    }

    try {
      const escrowPubkey = new PublicKey(game.escrowAccount);
      
      // Verify this matches our stored escrow account
      if (escrowPubkey.toBase58() !== escrowAccount.publicKey.toBase58()) {
        throw new Error("❌ Escrow account mismatch - security check failed.");
      }
      
      // Get escrow balance
      const escrowBalance = await connection.getBalance(escrowPubkey);
      console.log(`💰 Escrow balance: ${(escrowBalance / LAMPORTS_PER_SOL).toFixed(6)} $GOR`);
      
      if (escrowBalance === 0) {
        console.log('⚠️ Escrow already emptied');
        return true;
      }

      const { blockhash } = await connection.getLatestBlockhash();
      let transaction = new Transaction();
      
      // Process different payout scenarios
      if (payoutType === 'winner' && game.winner) {
        // Winner takes all (minus small fee for rent exemption)
        const payoutAmount = escrowBalance - 5000; // Keep minimum for rent
        transaction.add(
          SystemProgram.transfer({
            fromPubkey: escrowPubkey,
            toPubkey: new PublicKey(game.winner),
            lamports: payoutAmount,
          })
        );
        console.log(`🏆 Paying winner ${game.winner}: ${(payoutAmount / LAMPORTS_PER_SOL).toFixed(6)} $GOR`);
        
      } else if (payoutType === 'refund') {
        // Refund both players equally
        const refundPerPlayer = Math.floor((escrowBalance - 5000) / 2);
        
        if (game.playerA) {
          transaction.add(
            SystemProgram.transfer({
              fromPubkey: escrowPubkey,
              toPubkey: new PublicKey(game.playerA),
              lamports: refundPerPlayer,
            })
          );
        }
        
        if (game.playerB) {
          transaction.add(
            SystemProgram.transfer({
              fromPubkey: escrowPubkey,
              toPubkey: new PublicKey(game.playerB),
              lamports: refundPerPlayer,
            })
          );
        }
        
        console.log(`💸 Refunding ${(refundPerPlayer / LAMPORTS_PER_SOL).toFixed(6)} $GOR to each player`);
        
      } else if (payoutType === 'draw') {
        // Split the pot equally (rare in trash combat but possible)
        const splitAmount = Math.floor((escrowBalance - 5000) / 2);
        
        transaction.add(
          SystemProgram.transfer({
            fromPubkey: escrowPubkey,
            toPubkey: new PublicKey(game.playerA),
            lamports: splitAmount,
          })
        );
        
        if (game.playerB) {
          transaction.add(
            SystemProgram.transfer({
              fromPubkey: escrowPubkey,
              toPubkey: new PublicKey(game.playerB),
              lamports: splitAmount,
            })
          );
        }
        
        console.log(`🤝 Draw - splitting ${(splitAmount / LAMPORTS_PER_SOL).toFixed(6)} $GOR to each player`);
      }

      // User wallet pays fees, escrow account is the source of transfers
      transaction.feePayer = wallet.publicKey;
      transaction.recentBlockhash = blockhash;

      // Sign with both the user wallet (for fees) and escrow keypair (for transfers)
      console.log('✍️ Signing payout transaction with escrow keypair and user wallet...');
      
      // First sign with escrow account for the transfers
      transaction.partialSign(escrowAccount);
      
      // Then sign with user wallet for fees
      const signedTransaction = await wallet.signTransaction(transaction);
      
      console.log('📡 Sending payout to Gorbagana...');
      const signature = await connection.sendRawTransaction(signedTransaction.serialize());
      
      console.log(`📝 Payout transaction: ${signature}`);
      toast.loading('⏳ Processing payout on Gorbagana...', { id: 'payout-tx' });

      // Confirm payout transaction
      const confirmation = await confirmTransaction(signature);
      
      if (confirmation.status === 'Success') {
        console.log('✅ Payout processed successfully!');
        
        if (payoutType === 'winner') {
          toast.success('🏆 Prize awarded to winner!', { id: 'payout-tx' });
        } else if (payoutType === 'refund') {
          toast.success('💸 Funds refunded to players!', { id: 'payout-tx' });
        } else {
          toast.success('🤝 Pot split between players!', { id: 'payout-tx' });
        }
        
        return true;
      } else {
        throw new Error('Payout failed: ' + JSON.stringify(confirmation.error));
      }
      
    } catch (error: any) {
      console.error('❌ Payout failed:', error);
      toast.error('❌ Payout failed: ' + error.message, { id: 'payout-tx' });
      return false;
    }
  };

  // Handle game completion with automatic payout
  const handleGameEnd = async (updatedGame: TrashCombatGame) => {
    setGame(updatedGame);
    
    if (updatedGame.status === 'finished' && updatedGame.winner) {
      // Automatically process winner payout
      toast.success(updatedGame.winner === wallet.publicKey?.toBase58() ? 
        '🏆 You won the garbage war!' : 
        '💀 Your trash got destroyed!'
      );
      
      // Process payout (winner takes all)
      setTimeout(async () => {
        try {
          await processEscrowPayout(updatedGame.id, 'winner');
          
          // Update backend with payout status
          await apiRequest(`/api/games/${updatedGame.id}/payout`, {
            method: 'POST',
            body: JSON.stringify({
              payoutType: 'winner',
              winner: updatedGame.winner,
              processed: true
            })
          });
        } catch (error) {
          console.error('Auto-payout failed:', error);
        }
      }, 2000); // Delay for user to see win message
    }
  };

  // Abandon game with refund logic
  const abandonGame = async () => {
    if (!game || !wallet.publicKey) return;
    
    try {
      setLoading(true);
      
      const isGameCreator = game.playerA === wallet.publicKey.toBase58();
      
      // Check if any moves have been made
      const noMovesYet = game.playerABoard.every(row => 
        row.every(cell => cell === 'empty')
      ) && game.playerBBoard.every(row => 
        row.every(cell => cell === 'empty')
      );
      
      if (noMovesYet) {
        // Only game creator can process refunds (has escrow keypair)
        if (isGameCreator) {
          console.log('🔄 No moves made - processing refunds...');
          await processEscrowPayout(game.id, 'refund');
          
          toast.success('Game abandoned - funds refunded to both players');
        } else {
          // Non-creator just leaves, creator will need to process refund later
          toast.info('Game abandoned - waiting for creator to process refunds');
        }
        
        // Mark game as abandoned in backend
        await apiRequest(`/api/games/${game.id}/abandon`, {
          method: 'POST',
          body: JSON.stringify({
            playerAddress: wallet.publicKey.toBase58(),
            reason: isGameCreator ? 'Player abandoned - funds refunded' : 'Player abandoned - awaiting refund'
          })
        });
        
        setGame(null);
        setGameId("");
        
      } else {
        // If moves were made, forfeit (opponent wins)
        const opponent = game.playerA === wallet.publicKey.toBase58() ? game.playerB : game.playerA;
        
        if (opponent) {
          // Update game with opponent as winner
          const abandonResponse = await apiRequest(`/api/games/${game.id}/forfeit`, {
            method: 'POST',
            body: JSON.stringify({
              playerAddress: wallet.publicKey.toBase58(),
              winner: opponent,
              reason: 'Player forfeited'
            })
          });
          
          if (abandonResponse.success && isGameCreator) {
            // Only creator can process payouts
            try {
              await processEscrowPayout(game.id, 'winner');
              toast.success('Game forfeited - opponent awarded the prize');
            } catch (error) {
              toast.warning('Game forfeited - opponent wins (manual payout required)');
            }
          } else {
            toast.success('Game forfeited - opponent wins');
          }
        }
      }
      
    } catch (error: any) {
      console.error('Failed to abandon game:', error);
      toast.error('Failed to abandon game: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Trash placement logic
  const canPlaceTrash = (row: number, col: number, size: number, horizontal: boolean): boolean => {
    // Check if trash fits on board
    if (horizontal && col + size > BOARD_SIZE) return false;
    if (!horizontal && row + size > BOARD_SIZE) return false;

    // Check for overlapping trash
    for (let i = 0; i < size; i++) {
      const checkRow = horizontal ? row : row + i;
      const checkCol = horizontal ? col + i : col;
      
      if (playerBoard[checkRow][checkCol] === "trash") return false;
      
      // Check adjacent cells for spacing (optional - more realistic)
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          const adjRow = checkRow + dr;
          const adjCol = checkCol + dc;
          
          if (adjRow >= 0 && adjRow < BOARD_SIZE && adjCol >= 0 && adjCol < BOARD_SIZE) {
            if (playerBoard[adjRow][adjCol] === "trash") return false;
          }
        }
      }
    }
    
    return true;
  };

  const placeTrash = (row: number, col: number) => {
    if (currentTrashIndex >= TRASH_ITEMS.length) return;
    
    const trashItem = TRASH_ITEMS[currentTrashIndex];
    if (!canPlaceTrash(row, col, trashItem.size, isHorizontal)) {
      toast.error(`Cannot place ${trashItem.name} here!`);
      return;
    }

    // Place the trash
    const newBoard = [...playerBoard];
    const trashPositions = [];
    
    for (let i = 0; i < trashItem.size; i++) {
      const trashRow = isHorizontal ? row : row + i;
      const trashCol = isHorizontal ? col + i : col;
      newBoard[trashRow][trashCol] = "trash";
      trashPositions.push([trashRow, trashCol]);
    }
    
    setPlayerBoard(newBoard);
    setPlacedTrash([...placedTrash, trashPositions]);
    setCurrentTrashIndex(currentTrashIndex + 1);
    
    toast.success(`${trashItem.name} placed!`);
    
    // Check if all trash is placed
    if (currentTrashIndex + 1 >= TRASH_ITEMS.length) {
      toast.success('All trash placed! Ready to start garbage war.');
    }
  };

  const autoPlaceTrash = () => {
    const newBoard = createEmptyBoard();
    const newPlacedTrash = [];
    
    for (const trashItem of TRASH_ITEMS) {
      let placed = false;
      let attempts = 0;
      
      while (!placed && attempts < 100) {
        const row = Math.floor(Math.random() * BOARD_SIZE);
        const col = Math.floor(Math.random() * BOARD_SIZE);
        const horizontal = Math.random() < 0.5;
        
        // Temporarily set trash positions to check placement
        const tempBoard = [...newBoard];
        let canPlace = true;
        
        // Check if trash fits
        if (horizontal && col + trashItem.size > BOARD_SIZE) canPlace = false;
        if (!horizontal && row + trashItem.size > BOARD_SIZE) canPlace = false;
        
        // Check for overlapping trash
        if (canPlace) {
          for (let i = 0; i < trashItem.size; i++) {
            const trashRow = horizontal ? row : row + i;
            const trashCol = horizontal ? col + i : col;
            if (tempBoard[trashRow][trashCol] === "trash") {
              canPlace = false;
              break;
            }
          }
        }
        
        if (canPlace) {
          const trashPositions = [];
          for (let i = 0; i < trashItem.size; i++) {
            const trashRow = horizontal ? row : row + i;
            const trashCol = horizontal ? col + i : col;
            newBoard[trashRow][trashCol] = "trash";
            trashPositions.push([trashRow, trashCol]);
          }
          newPlacedTrash.push(trashPositions);
          placed = true;
        }
        attempts++;
      }
    }
    
    setPlayerBoard(newBoard);
    setPlacedTrash(newPlacedTrash);
    setCurrentTrashIndex(TRASH_ITEMS.length);
    toast.success('Trash auto-placed!');
  };

  const resetBoard = () => {
    setPlayerBoard(createEmptyBoard());
    setPlacedTrash([]);
    setCurrentTrashIndex(0);
    toast('Board reset');
  };

  // Game creation
  const createGame = async () => {
    if (!wallet.connected || !wallet.publicKey) {
      toast.error('Please connect your wallet first');
      return;
    }

    if (currentTrashIndex < TRASH_ITEMS.length) {
      toast.error('Please place all trash first');
      return;
    }

    const wagerAmount = parseFloat(wagerInput);
    if (wagerAmount <= 0) {
      toast.error('Wager amount must be greater than 0');
      return;
    }

    setLoading(true);
    
    try {
      // Create game ID
      const newGameId = crypto.randomUUID();
      
      // Create escrow deposit
      const { escrowAccount, txSignature } = await createEscrowDeposit(wagerAmount, newGameId, true);
      
      // Create game data
      const gameData = {
        id: newGameId,
        playerA: wallet.publicKey.toBase58(),
        playerATrash: placedTrash,
        wager: wagerAmount,
        isPublic: makeGamePublic,
        gameMode: selectedGameType, // Backend expects 'gameMode', not 'gameType'
        escrowAccount,
        txSignature,
        playerADeposit: txSignature
      };

      console.log('🎮 Sending game data to backend:', {
        gameMode: selectedGameType,
        trashCount: placedTrash.length,
        expectedTrash: TRASH_ITEMS.length,
        placedTrash: placedTrash
      });
      
      // Save game to backend
      const response = await apiRequest('/api/games', {
        method: 'POST',
        body: JSON.stringify(gameData)
      });
      
      if (response.success) {
        setGame(response.game);
        setGameId(response.game.id);
        setIsSettingUpBoard(false);
        toast.success('Garbage war created successfully! Waiting for opponent...');
      }
      
    } catch (error: any) {
      console.error('Game creation failed:', error);
      toast.error('Failed to create garbage war: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Load public games
  const loadPublicGames = async () => {
    try {
      const response = await apiRequest('/api/games/public');
      setPublicGames(response.games || []);
    } catch (error) {
      console.error('Failed to load public garbage wars:', error);
      toast.error('Failed to load public garbage wars');
    }
  };

  // Join game
  const joinGame = async () => {
    if (!wallet.connected || !wallet.publicKey) {
      toast.error('Please connect your wallet first');
      return;
    }

    if (!gameId) {
      toast.error('Please enter a game ID');
      return;
    }

    setLoading(true);
    
    try {
      // Load game first
      const response = await apiRequest(`/api/games/${gameId}`);
      const gameData = response.game;
      
      if (!gameData) {
        throw new Error('Garbage war not found');
      }
      
      if (gameData.playerB) {
        throw new Error('Garbage war is already full');
      }
      
      // Create escrow deposit
      const { txSignature } = await createEscrowDeposit(gameData.wager, gameId, false, gameData.escrowAccount);
      
      // Join game
      const joinResponse = await apiRequest(`/api/games/${gameId}/join`, {
        method: 'POST',
        body: JSON.stringify({
          playerAddress: wallet.publicKey.toBase58(),
          playerBDeposit: txSignature
        })
      });
      
      if (joinResponse.success) {
        setGame(joinResponse.game);
        setIsSettingUpBoard(true);
        toast.success('Joined garbage war! Place your trash.');
      }
      
    } catch (error: any) {
      console.error('Join garbage war failed:', error);
      toast.error('Failed to join garbage war: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Make attack move
  const makeAttack = async (row: number, col: number) => {
    if (!game || !wallet.publicKey) return;
    
    try {
      const response = await apiRequest(`/api/games/${game.id}/move`, {
        method: 'POST',
        body: JSON.stringify({
          playerAddress: wallet.publicKey.toBase58(),
          row,
          col
        })
      });
      
      if (response.success) {
        const newEnemyBoard = [...enemyBoard];
        newEnemyBoard[row][col] = response.hit ? "hit" : "miss";
        setEnemyBoard(newEnemyBoard);
        
        toast.success(response.hit ? '🎯 TRASH HIT!' : '💦 Missed the garbage!');
        
        if (response.game.status === 'finished') {
          // Handle game completion with automatic payout
          await handleGameEnd(response.game);
        } else {
          setGame(response.game);
        }
      }
    } catch (error: any) {
      toast.error('Attack failed: ' + error.message);
    }
  };

  // Render board
  const renderBoard = (board: CellState[][], isPlayerBoard: boolean = true, allowClicks: boolean = false) => {
    return (
      <div 
        className="grid gap-0.5 p-4 bg-green-900 rounded-lg"
        style={{ gridTemplateColumns: `repeat(${BOARD_SIZE}, minmax(0, 1fr))` }}
      >
        {board.map((row, rowIndex) =>
          row.map((cell, colIndex) => (
            <button
              key={`${rowIndex}-${colIndex}`}
              onClick={() => {
                if (isSettingUpBoard && isPlayerBoard) {
                  placeTrash(rowIndex, colIndex);
                } else if (allowClicks && !isPlayerBoard) {
                  makeAttack(rowIndex, colIndex);
                }
              }}
              className={`
                w-8 h-8 border border-green-300 rounded transition-all flex items-center justify-center
                ${cell === "empty" ? "bg-green-500 hover:bg-green-400" : ""}
                ${cell === "trash" ? "bg-gray-600" : ""}
                ${cell === "hit" ? "bg-red-500" : ""}
                ${cell === "miss" ? "bg-white" : ""}
                ${cell === "destroyed" ? "bg-red-800" : ""}
                ${isSettingUpBoard && isPlayerBoard ? "cursor-pointer" : ""}
                ${allowClicks && !isPlayerBoard ? "cursor-crosshair" : "cursor-default"}
              `}
            >
              {cell === "hit" && <Target className="w-4 h-4 text-white" />}
              {cell === "miss" && <Waves className="w-4 h-4 text-green-600" />}
              {cell === "trash" && isPlayerBoard && <Trash className="w-4 h-4 text-yellow-400" />}
            </button>
          ))
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-800 to-green-900 text-white p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2 flex items-center justify-center gap-2">
            <Trash className="w-8 h-8" />
            Gorbagana Trash Combat v2.0
          </h1>
          <p className="text-green-200">Real $GOR token wagering on Gorbagana network</p>
        </div>

        {/* Wallet Connection */}
        <div className="flex justify-center mb-6">
          <ClientOnly fallback={<div className="bg-green-600 px-4 py-2 rounded">Loading wallet...</div>}>
            <WalletMultiButton className="!bg-green-600 hover:!bg-green-700" />
          </ClientOnly>
        </div>

        <ClientOnly>
          {wallet.connected && (
            <div className="text-center mb-6">
              <p className="text-lg">Balance: <span className="font-bold text-green-400">{gorBalance.toFixed(6)} $GOR</span></p>
            </div>
          )}

          {/* Game Setup */}
          {!game && !isSettingUpBoard && wallet.connected && (
            <div className="max-w-2xl mx-auto bg-green-800 p-6 rounded-lg mb-6">
              <h2 className="text-xl font-bold mb-4">Create or Join Garbage War</h2>
              
              <div className="space-y-6">
                {/* Game Type Selection */}
                <div>
                  <label className="block text-sm font-medium mb-3">Select War Type</label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {Object.entries(GAME_CONFIGS).map(([type, config]) => (
                      <button
                        key={type}
                        onClick={() => setSelectedGameType(type as GameType)}
                        className={`p-4 rounded-lg border-2 transition-all text-left ${
                          selectedGameType === type
                            ? 'border-yellow-400 bg-green-700'
                            : 'border-green-600 bg-green-800 hover:bg-green-700'
                        }`}
                      >
                        <div className="font-bold text-yellow-400">{config.name}</div>
                        <div className="text-sm text-green-200 mt-1">{config.description}</div>
                        <div className="text-xs text-gray-300 mt-2">{config.duration}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Wager Amount ($GOR)</label>
                    <input
                      type="number"
                      value={wagerInput}
                      onChange={(e) => setWagerInput(e.target.value)}
                      step="0.001"
                      min="0.001"
                      className="w-full px-3 py-2 bg-green-700 border border-green-600 rounded text-white"
                    />
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="public"
                      checked={makeGamePublic}
                      onChange={(e) => setMakeGamePublic(e.target.checked)}
                      className="rounded"
                    />
                    <label htmlFor="public" className="text-sm">Make garbage war public</label>
                  </div>
                </div>
                
                <button
                  onClick={() => setIsSettingUpBoard(true)}
                  className="w-full bg-red-600 hover:bg-red-700 px-4 py-2 rounded font-medium flex items-center justify-center gap-2"
                >
                  <Trash className="w-4 h-4" />
                  Setup {gameConfig.name}
                </button>
                
                <div className="border-t border-green-600 pt-4">
                  <input
                    type="text"
                    placeholder="Enter Garbage War ID to join"
                    value={gameId}
                    onChange={(e) => setGameId(e.target.value)}
                    className="w-full px-3 py-2 bg-green-700 border border-green-600 rounded text-white mb-2"
                  />
                  <button
                    onClick={joinGame}
                    disabled={loading || !gameId}
                    className="w-full bg-green-600 hover:bg-green-700 px-4 py-2 rounded font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <Users className="w-4 h-4" />
                    {loading ? 'Joining...' : 'Join Garbage War'}
                  </button>
                </div>
                
                <button
                  onClick={() => {
                    setShowPublicLobby(true);
                    loadPublicGames();
                  }}
                  className="w-full bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded font-medium flex items-center justify-center gap-2"
                >
                  <Eye className="w-4 h-4" />
                  Browse Public Trash Wars
                </button>
              </div>
            </div>
          )}

          {/* Trash Placement */}
          {isSettingUpBoard && (
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold mb-4">Deploy Your Trash Arsenal</h2>
              
              {currentTrashIndex < TRASH_ITEMS.length && (
                <div className="mb-4 bg-green-800 p-4 rounded-lg">
                  <p className="text-lg mb-2">
                    Place <span className="text-yellow-400 font-bold">{TRASH_ITEMS[currentTrashIndex].name}</span> (Size: {TRASH_ITEMS[currentTrashIndex].size})
                  </p>
                  <div className="flex justify-center gap-2 mb-4">
                    <button
                      onClick={() => setIsHorizontal(!isHorizontal)}
                      className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded flex items-center gap-2"
                    >
                      <RotateCw className="w-4 h-4" />
                      {isHorizontal ? 'Horizontal' : 'Vertical'}
                    </button>
                    <button
                      onClick={autoPlaceTrash}
                      className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded flex items-center gap-2"
                    >
                      <Zap className="w-4 h-4" />
                      Auto Deploy All Trash
                    </button>
                    <button
                      onClick={resetBoard}
                      className="bg-gray-600 hover:bg-gray-700 px-4 py-2 rounded"
                    >
                      Reset
                    </button>
                  </div>
                </div>
              )}
              
              <div className="flex justify-center mb-4">
                {renderBoard(playerBoard, true)}
              </div>
              
              {/* Trash placement progress */}
              <div className="bg-green-800 p-4 rounded-lg mb-4">
                <p className="mb-2">Trash Deployed: {currentTrashIndex}/{TRASH_ITEMS.length}</p>
                <div className="flex justify-center gap-2">
                  {TRASH_ITEMS.map((trashItem, index) => (
                    <div key={trashItem.key} className={`px-2 py-1 rounded text-xs ${
                      index < currentTrashIndex ? 'bg-red-600' : 
                      index === currentTrashIndex ? 'bg-yellow-600' : 'bg-gray-600'
                    }`}>
                      {trashItem.name}
                    </div>
                  ))}
                </div>
              </div>
              
              {currentTrashIndex >= TRASH_ITEMS.length && (
                <button
                  onClick={createGame}
                  disabled={loading}
                  className="bg-red-600 hover:bg-red-700 px-6 py-3 rounded font-bold text-lg flex items-center justify-center gap-2 mx-auto"
                >
                  <Play className="w-5 h-5" />
                  {loading ? 'Starting Garbage War...' : 'Deploy Trash Arsenal & Start War!'}
                </button>
              )}
            </div>
          )}

          {/* Active Game */}
          {game && !isSettingUpBoard && (
            <div className="text-center">
              <div className="bg-green-800 p-4 rounded-lg mb-6">
                <h2 className="text-2xl font-bold mb-2">Garbage War: {game.id}</h2>
                <p className="mb-2">Wager: <span className="text-yellow-400 font-bold">{game.wager} $GOR</span></p>
                <p className="mb-2">Status: <span className="text-green-400 font-bold">{game.status}</span></p>
                {game.status === 'playing' && (
                  <p className={`font-bold ${isMyTurn ? 'text-green-400' : 'text-red-400'}`}>
                    {isMyTurn ? '🎯 Your Turn - Destroy Enemy Trash!' : '⏳ Enemy is Attacking'}
                  </p>
                )}
                
                {/* Abandon Game Button */}
                {(game.status === 'waiting' || game.status === 'playing' || game.status === 'setup') && (
                  <div className="mt-4 pt-4 border-t border-green-600">
                    <button
                      onClick={abandonGame}
                      disabled={loading}
                      className="bg-gray-600 hover:bg-gray-700 px-4 py-2 rounded font-medium text-sm flex items-center justify-center gap-2 mx-auto"
                    >
                      <X className="w-4 h-4" />
                      {loading ? 'Processing...' : (
                        game.status === 'waiting' || !game.playerB ? 
                        'Cancel War (Full Refund)' : 
                        'Forfeit War (Opponent Wins)'
                      )}
                    </button>
                    <p className="text-xs text-gray-300 mt-1 text-center">
                      {game.status === 'waiting' || !game.playerB ? 
                        (game.playerA === wallet.publicKey?.toBase58() ? 
                          'Both players get full refund (auto-processed)' : 
                          'Both players get full refund (creator processes)') : 
                        'Opponent receives the entire prize'
                      }
                    </p>
                    {game.playerA !== wallet.publicKey?.toBase58() && (
                      <p className="text-xs text-yellow-300 mt-1 text-center">
                        ⚠️ Only game creator can process escrow payouts
                      </p>
                    )}
                  </div>
                )}
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div>
                  <h3 className="text-xl font-bold mb-2">Your Trash Arsenal</h3>
                  {renderBoard(playerBoard, true, false)}
                </div>
                <div>
                  <h3 className="text-xl font-bold mb-2">Enemy Dumpster</h3>
                  {renderBoard(enemyBoard, false, game.status === 'playing' && isMyTurn)}
                </div>
              </div>
            </div>
          )}

          {/* Public Games Lobby */}
          {showPublicLobby && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-green-800 p-6 rounded-lg max-w-md w-full mx-4 max-h-96 overflow-y-auto">
                <h2 className="text-xl font-bold mb-4">Public Trash Wars</h2>
                {publicGames.length === 0 ? (
                  <p>No public garbage wars available</p>
                ) : (
                  <div className="space-y-2">
                    {publicGames.map((game) => (
                      <div key={game.id} className="bg-green-700 p-3 rounded">
                        <p className="font-medium">Wager: {game.wager} $GOR</p>
                        <p className="text-sm text-green-200">Created: {new Date(game.createdAt).toLocaleString()}</p>
                        <button
                          onClick={() => {
                            setGameId(game.id);
                            setShowPublicLobby(false);
                            joinGame();
                          }}
                          className="mt-2 bg-red-600 hover:bg-red-700 px-3 py-1 rounded text-sm"
                        >
                          Join Garbage War
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <button
                  onClick={() => setShowPublicLobby(false)}
                  className="mt-4 w-full bg-gray-600 hover:bg-gray-700 px-4 py-2 rounded"
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </ClientOnly>
      </div>
    </div>
  );
} 