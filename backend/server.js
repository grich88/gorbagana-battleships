require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const connectDB = require('./config/database');
const Game = require('./models/Game');

const app = express();
const PORT = process.env.PORT || 3002;

console.log('🚀 GORBAGANA TRASH COMBAT BACKEND v2.0 STARTING...');
console.log('🔥 REBUILD USING PROVEN PATTERNS FROM WORKING TRASH TAC TOE');
console.log(`🔥 DEPLOYMENT TIMESTAMP: ${new Date().toISOString()}`);
console.log('🌐 CORS enabled for origins:', process.env.CORS_ORIGIN || 'http://localhost:3000');

// Database connection status
let dbConnected = false;

// Initialize database connection
const initializeServer = async () => {
  // BULLETPROOF: This function never crashes the server
  
  try {
    const connection = await connectDB();
    dbConnected = !!connection;
    
    if (dbConnected) {
      console.log('✅ MongoDB integration enabled');
      // Set up periodic cleanup for old games
      setupDatabaseCleanup();
    } else {
      console.log('⚠️ Using in-memory storage (fallback mode)');
      console.log('🎮 All game features remain fully functional');
      // Always use in-memory storage as fallback
      setupInMemoryStorage();
    }
  } catch (error) {
    console.error('❌ Database initialization failed:', error.message);
    console.log('🔧 ROBUST FALLBACK: Continuing with in-memory storage');
    console.log('🎮 Server will function normally with temporary data');
    console.log('💪 Never giving up - trash combat must continue!');
    
    // CRITICAL: NEVER exit in production - always fallback to in-memory
    setupInMemoryStorage();
  }
};

// In-memory fallback storage for development
let games, publicGames, gamesByPlayer;

const setupInMemoryStorage = () => {
  games = new Map();
  publicGames = new Set();
  gamesByPlayer = new Map();
  console.log('📝 In-memory storage initialized');
};

const setupDatabaseCleanup = () => {
  // Clean up old games every hour
  setInterval(async () => {
    try {
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const result = await Game.deleteMany({
        createdAt: { $lt: oneDayAgo },
        status: { $in: ['waiting', 'finished'] }
      });
      
      if (result.deletedCount > 0) {
        console.log(`🧹 Database cleanup: removed ${result.deletedCount} old games`);
      }
    } catch (error) {
      console.error('❌ Database cleanup error:', error.message);
    }
  }, 60 * 60 * 1000);
};

// Middleware
const allowedOrigins = [
  'http://localhost:3000',
  process.env.CORS_ORIGIN,
  process.env.FRONTEND_URL
].filter(Boolean);

app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));
app.use(express.json());

// Note: Cleanup is now handled in setupDatabaseCleanup() function

// Game Mode Configuration
const GAME_MODES = {
  quick: {
    boardSize: 6,
    fleet: [
      { length: 3, count: 1, name: 'Garbage Truck' },
      { length: 2, count: 2, name: 'Pickup Van' },
    ],
    totalShipSquares: 7, // 3 + 2 + 2 = 7
    name: 'Quick Collection',
    description: '6x6 grid with 3 small waste haulers',
    estimatedTime: '3-5 minutes'
  },
  standard: {
    boardSize: 10,
    fleet: [
      { length: 5, count: 1, name: 'Super Hauler' },
      { length: 4, count: 1, name: 'Dumpster Truck' },
      { length: 3, count: 2, name: 'Garbage Truck' },
      { length: 2, count: 1, name: 'Pickup Van' }
    ],
    totalShipSquares: 17, // 5 + 4 + 3 + 3 + 2 = 17
    name: 'Standard Collection',
    description: '10x10 grid with classic waste fleet',
    estimatedTime: '10-15 minutes'
  },
  extended: {
    boardSize: 12,
    fleet: [
      { length: 6, count: 1, name: 'Mega Compactor' },
      { length: 5, count: 1, name: 'Super Hauler' },
      { length: 4, count: 2, name: 'Dumpster Truck' },
      { length: 3, count: 2, name: 'Garbage Truck' },
      { length: 2, count: 2, name: 'Pickup Van' }
    ],
    totalShipSquares: 28, // 6 + 5 + 4 + 4 + 3 + 3 + 2 + 2 = 28
    name: 'Extended Collection',
    description: '12x12 grid with massive waste fleet',
    estimatedTime: '20-30 minutes'
  }
};

// Helper functions
const createEmptyBoard = (gameMode = 'standard') => {
  const boardSize = GAME_MODES[gameMode].boardSize;
  return Array(boardSize).fill(null).map(() => Array(boardSize).fill("empty"));
};

const checkGameEnd = (board, trashItems) => {
  // Check if all trash cells are hit
  let totalTrashCells = 0;
  let hitCells = 0;
  
  trashItems.forEach(trash => {
    trash.forEach(([row, col]) => {
      totalTrashCells++;
      if (board[row][col] === "hit") {
        hitCells++;
      }
    });
  });
  
  return totalTrashCells > 0 && hitCells === totalTrashCells;
};

const validateTrashPlacement = (trashItems, gameMode = 'standard') => {
  const config = GAME_MODES[gameMode];
  if (!config) return false;
  
  // Calculate expected number of trash pieces based on fleet configuration
  let expectedTrashPieces = 0;
  config.fleet.forEach(ship => {
    expectedTrashPieces += ship.count;
  });
  
  return Array.isArray(trashItems) && trashItems.length === expectedTrashPieces;
};

const makeMove = (game, playerAddress, row, col) => {
  // Determine which player is making the move and which board to attack
  const isPlayerA = game.playerA === playerAddress;
  const isPlayerB = game.playerB === playerAddress;
  
  if (!isPlayerA && !isPlayerB) {
    throw new Error('Player not in this garbage war');
  }
  
  if (game.currentTurn !== playerAddress) {
    throw new Error('Not your turn');
  }
  
  // Get enemy trash and board
  const enemyTrash = isPlayerA ? game.playerBTrash : game.playerATrash;
  const enemyBoard = isPlayerA ? game.playerBBoard : game.playerABoard;
  
  // Check if cell already attacked
  if (enemyBoard[row][col] === "hit" || enemyBoard[row][col] === "miss") {
    throw new Error('Cell already attacked');
  }
  
  // Check if there's trash at this position
  let hit = false;
  enemyTrash.forEach(trash => {
    trash.forEach(([trashRow, trashCol]) => {
      if (trashRow === row && trashCol === col) {
        hit = true;
      }
    });
  });
  
  // Update the board
  enemyBoard[row][col] = hit ? "hit" : "miss";
  
  // Check for game end
  const gameEnded = checkGameEnd(enemyBoard, enemyTrash);
  
  if (gameEnded) {
    game.status = "finished";
    game.winner = playerAddress;
  } else {
    // Switch turns
    game.currentTurn = isPlayerA ? game.playerB : game.playerA;
  }
  
  game.updatedAt = Date.now();
  
  return { hit, gameEnded };
};

// API Routes

// Root route - welcome message
app.get('/', (req, res) => {
  res.json({ 
    message: 'Gorbagana Trash Combat Backend API v2.0',
    version: '2.0.0',
    status: 'running',
    endpoints: {
      health: '/health',
      stats: '/api/stats',
      games: '/api/games',
      createGame: 'POST /api/games',
      getGame: 'GET /api/games/:gameId',
      updateGame: 'PUT /api/games/:gameId',
      joinGame: 'POST /api/games/:gameId/join',
      publicGames: 'GET /api/games/public',
      deleteGame: 'DELETE /api/games/:gameId'
    },
    rebuiltFrom: 'Working Trash Tac Toe patterns',
    documentation: 'https://github.com/grich88/Gorbagana'
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    version: '2.0.0',
    message: '🗑️ Gorbagana Trash Combat Backend v2.0 - Rebuilt using proven patterns from working Trash Tac Toe'
  });
});

// Get server stats
app.get('/api/stats', async (req, res) => {
  try {
    let stats;
    
    if (dbConnected) {
      // Use MongoDB aggregation for stats
      const [totalGames, activeGames, waitingGames, publicGames] = await Promise.all([
        Game.countDocuments(),
        Game.countDocuments({ status: 'playing' }),
        Game.countDocuments({ status: 'waiting' }),
        Game.countDocuments({ isPublic: true, status: 'waiting' })
      ]);
      
      stats = {
        totalGarbageWars: totalGames,
        activeGarbageWars: activeGames,
        waitingGarbageWars: waitingGames,
        publicGarbageWars: publicGames,
        uptime: process.uptime(),
        version: '2.0.0',
        storage: 'MongoDB'
      };
    } else {
      // Use in-memory storage
      stats = {
        totalGarbageWars: games.size,
        activeGarbageWars: Array.from(games.values()).filter(g => g.status === 'playing').length,
        waitingGarbageWars: Array.from(games.values()).filter(g => g.status === 'waiting').length,
        publicGarbageWars: Array.from(games.values()).filter(g => g.isPublic && g.status === 'waiting').length,
        uptime: process.uptime(),
        version: '2.0.0',
        storage: 'In-Memory'
      };
    }
    
    res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('❌ Error fetching stats:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch stats: ' + error.message 
    });
  }
});

// Get game modes
app.get('/api/game-modes', (req, res) => {
  res.json({
    success: true,
    gameModes: GAME_MODES
  });
});

// Create a new garbage war
app.post('/api/games', async (req, res) => {
  try {
    const gameData = req.body;
    console.log('🎮 Creating new game with data:', JSON.stringify(gameData, null, 2));
    
    // Validate required fields
    if (!gameData.id || !gameData.playerA || !gameData.wager || !gameData.playerATrash) {
      console.log('❌ Missing required fields:', {
        id: !!gameData.id,
        playerA: !!gameData.playerA,
        wager: !!gameData.wager,
        playerATrash: !!gameData.playerATrash
      });
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required fields: id, playerA, wager, playerATrash' 
      });
    }
    
    // Determine game mode (default to 'standard' for backward compatibility)
    const gameMode = gameData.gameMode || 'standard';
    console.log('🎯 Game mode:', gameMode);
    console.log('🗑️ Player A trash placement:', gameData.playerATrash);
    
    // Validate trash placement based on game mode
    if (!validateTrashPlacement(gameData.playerATrash, gameMode)) {
      const config = GAME_MODES[gameMode];
      const expectedTrashPieces = config.fleet.reduce((sum, ship) => sum + ship.count, 0);
      console.log('❌ Trash placement validation failed:', {
        gameMode,
        expected: expectedTrashPieces,
        received: gameData.playerATrash.length,
        trashData: gameData.playerATrash
      });
      return res.status(400).json({ 
        success: false, 
        error: `Invalid trash placement for ${config.name} - must have exactly ${expectedTrashPieces} trash items, received ${gameData.playerATrash.length}` 
      });
    }

    let game;
    
    if (dbConnected) {
      // Use MongoDB
      const gameDoc = new Game({
        id: gameData.id,
        playerA: {
          publicKey: gameData.playerA,
          board: createEmptyBoard(gameMode),
          trash: gameData.playerATrash,
          deposit: gameData.playerADeposit
        },
        currentTurn: gameData.playerA,
        status: "waiting",
        wager: gameData.wager,
        isPublic: gameData.isPublic || false,
        gameMode: gameMode,
        escrowAccount: gameData.escrowAccount,
        txSignature: gameData.txSignature
      });
      
      game = await gameDoc.save();
      console.log(`🗑️ MongoDB: New garbage war created: ${game.id} by ${gameData.playerA} for ${gameData.wager} $GOR`);
    } else {
      // Fallback to in-memory storage
      game = {
        id: gameData.id,
        playerA: gameData.playerA,
        playerB: null,
        playerABoard: createEmptyBoard(gameMode),
        playerBBoard: createEmptyBoard(gameMode),
        playerATrash: gameData.playerATrash,
        playerBTrash: [],
        currentTurn: gameData.playerA,
        status: "waiting",
        winner: null,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        wager: gameData.wager,
        isPublic: gameData.isPublic || false,
        gameMode: gameMode,
        escrowAccount: gameData.escrowAccount,
        txSignature: gameData.txSignature,
        playerADeposit: gameData.playerADeposit,
        playerBDeposit: null
      };
      
      // Store game in memory
      games.set(game.id, game);
      
      // Track games by player
      if (!gamesByPlayer.has(gameData.playerA)) {
        gamesByPlayer.set(gameData.playerA, new Set());
      }
      gamesByPlayer.get(gameData.playerA).add(game.id);
      
      console.log(`🗑️ Memory: New garbage war created: ${game.id} by ${gameData.playerA} for ${gameData.wager} $GOR`);
    }
    
    res.json({ 
      success: true, 
      game,
      message: 'Garbage war created successfully'
    });
    
  } catch (error) {
    console.error('❌ Error creating garbage war:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to create garbage war: ' + error.message 
    });
  }
});

// Get a specific garbage war
app.get('/api/games/:gameId', async (req, res) => {
  try {
    const { gameId } = req.params;
    let game;
    
    if (dbConnected) {
      // Use MongoDB
      game = await Game.findOne({ id: gameId });
    } else {
      // Use in-memory storage
      game = games.get(gameId);
    }
    
    if (!game) {
      return res.status(404).json({ 
        success: false, 
        error: 'Garbage war not found' 
      });
    }
    
    res.json({ 
      success: true, 
      game 
    });
  } catch (error) {
    console.error('❌ Error fetching garbage war:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch garbage war: ' + error.message 
    });
  }
});

// Update a garbage war
app.put('/api/games/:gameId', (req, res) => {
  try {
    const { gameId } = req.params;
    const updates = req.body;
    
    const game = games.get(gameId);
    if (!game) {
      return res.status(404).json({ error: 'Garbage war not found' });
    }
    
    // Apply updates
    const updatedGame = {
      ...game,
      ...updates,
      updatedAt: Date.now()
    };
    
    games.set(gameId, updatedGame);
    
    console.log(`📝 Updated Trash Combat game: ${gameId}`, {
      updates: Object.keys(updates),
      status: updatedGame.status,
      SEQUENCE_TIMESTAMP: Date.now(),
      SEQUENCE_EVENT: 'GAME_UPDATE'
    });
    
    res.json({ success: true, game: updatedGame });
  } catch (error) {
    console.error('Error updating game:', error);
    res.status(500).json({ error: 'Failed to update game' });
  }
});

// Join a garbage war
app.post('/api/games/:gameId/join', (req, res) => {
  try {
    const { gameId } = req.params;
    const { playerAddress, playerBDeposit, playerBTrash } = req.body;
    
    const game = games.get(gameId);
    
    if (!game) {
      return res.status(404).json({ 
        success: false, 
        error: 'Garbage war not found' 
      });
    }
    
    if (game.status !== 'waiting') {
      return res.status(400).json({ 
        success: false, 
        error: 'Garbage war is not waiting for players' 
      });
    }
    
    if (game.playerB) {
      return res.status(400).json({ 
        success: false, 
        error: 'Garbage war is already full' 
      });
    }
    
    if (game.playerA === playerAddress) {
      return res.status(400).json({ 
        success: false, 
        error: 'Cannot join your own garbage war' 
      });
    }
    
    // Update game with second player
    game.playerB = playerAddress;
    game.playerBDeposit = playerBDeposit;
    game.playerBTrash = playerBTrash || []; // Trash will be placed separately
    game.updatedAt = Date.now();
    
    // If both players have trash, start the war
    if (playerBTrash && validateTrashPlacement(playerBTrash, game.gameMode || 'standard')) {
      game.status = 'playing';
    } else {
      game.status = 'setup'; // Waiting for Player B to place trash
    }
    
    // Track games by player
    if (!gamesByPlayer.has(playerAddress)) {
      gamesByPlayer.set(playerAddress, new Set());
    }
    gamesByPlayer.get(playerAddress).add(gameId);
    
    console.log(`👥 Player ${playerAddress} joined garbage war ${gameId}`);
    
    res.json({ 
      success: true, 
      game,
      message: 'Successfully joined garbage war'
    });
    
  } catch (error) {
    console.error('❌ Error joining garbage war:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to join garbage war: ' + error.message 
    });
  }
});

// Get public garbage wars
app.get('/api/games/public', async (req, res) => {
  try {
    let publicGarbageWars;
    
    if (dbConnected) {
      // Use MongoDB
      const games = await Game.find({ 
        isPublic: true, 
        status: 'waiting' 
      })
      .sort({ createdAt: -1 })
      .limit(20)
      .select('id playerA.publicKey wager createdAt status gameMode');
      
      publicGarbageWars = games.map(game => ({
        id: game.id,
        playerA: game.playerA.publicKey,
        wager: game.wager,
        createdAt: game.createdAt,
        status: game.status,
        gameMode: game.gameMode
      }));
    } else {
      // Use in-memory storage
      publicGarbageWars = Array.from(games.values())
        .filter(game => game.isPublic && game.status === 'waiting')
        .sort((a, b) => b.createdAt - a.createdAt)
        .slice(0, 20) // Limit to 20 most recent
        .map(game => ({
          id: game.id,
          playerA: game.playerA,
          wager: game.wager,
          createdAt: game.createdAt,
          status: game.status,
          gameMode: game.gameMode
        }));
    }
    
    res.json({ 
      success: true, 
      games: publicGarbageWars,
      count: publicGarbageWars.length 
    });
    
  } catch (error) {
    console.error('❌ Error fetching public garbage wars:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch public garbage wars: ' + error.message 
    });
  }
});

// Update trash placement for Player B
app.post('/api/games/:gameId/ships', (req, res) => {
  try {
    const { gameId } = req.params;
    const { playerAddress, ships } = req.body;
    
    const game = games.get(gameId);
    
    if (!game) {
      return res.status(404).json({ 
        success: false, 
        error: 'Garbage war not found' 
      });
    }
    
    if (game.playerB !== playerAddress) {
      return res.status(400).json({ 
        success: false, 
        error: 'Only Player B can set trash for this garbage war' 
      });
    }
    
    // Validate trash placement based on game mode
    const gameMode = game.gameMode || 'standard';
    if (!validateTrashPlacement(ships, gameMode)) {
      const config = GAME_MODES[gameMode];
      const expectedTrashPieces = config.fleet.reduce((sum, ship) => sum + ship.count, 0);
      return res.status(400).json({ 
        success: false, 
        error: `Invalid trash placement for ${config.name} - must have exactly ${expectedTrashPieces} trash items` 
      });
    }
    
    game.playerBTrash = ships;
    game.status = 'playing';
    game.updatedAt = Date.now();
    
    console.log(`🗑️ Player B placed trash in garbage war ${gameId}`);
    
    res.json({ 
      success: true, 
      game,
      message: 'Trash placed successfully'
    });
    
  } catch (error) {
    console.error('❌ Error placing trash:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to place trash: ' + error.message 
    });
  }
});

// Make a move
app.post('/api/games/:gameId/move', (req, res) => {
  try {
    const { gameId } = req.params;
    const { playerAddress, row, col } = req.body;
    
    const game = games.get(gameId);
    
    if (!game) {
      return res.status(404).json({ 
        success: false, 
        error: 'Garbage war not found' 
      });
    }
    
    if (game.status !== 'playing') {
      return res.status(400).json({ 
        success: false, 
        error: 'Garbage war is not in playing state' 
      });
    }
    
    // Validate coordinates based on game mode
    const gameMode = game.gameMode || 'standard';
    const boardSize = GAME_MODES[gameMode].boardSize;
    if (row < 0 || row >= boardSize || col < 0 || col >= boardSize) {
      return res.status(400).json({ 
        success: false, 
        error: `Invalid coordinates for ${GAME_MODES[gameMode].name} (${boardSize}x${boardSize} board)` 
      });
    }
    
    // Make the move
    const result = makeMove(game, playerAddress, row, col);
    
    console.log(`💥 ${playerAddress} attacked (${row},${col}) in garbage war ${gameId} - ${result.hit ? 'TRASH HIT' : 'MISSED GARBAGE'}`);
    
    if (result.gameEnded) {
      console.log(`🏆 Garbage war ${gameId} ended - Winner: ${game.winner}`);
    }
    
    res.json({ 
      success: true, 
      game,
      hit: result.hit,
      gameEnded: result.gameEnded,
      message: result.hit ? 'Trash hit!' : 'Missed the garbage!'
    });
    
  } catch (error) {
    console.error('❌ Error making move:', error);
    res.status(400).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Get player's garbage wars
app.get('/api/players/:playerAddress/games', (req, res) => {
  try {
    const { playerAddress } = req.params;
    const playerGames = gamesByPlayer.get(playerAddress) || new Set();
    
    const gamesList = Array.from(playerGames)
      .map(gameId => games.get(gameId))
      .filter(game => game) // Remove any null games
      .sort((a, b) => b.updatedAt - a.updatedAt);
    
    res.json({ 
      success: true, 
      games: gamesList,
      count: gamesList.length 
    });
    
  } catch (error) {
    console.error('❌ Error fetching player garbage wars:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch player garbage wars: ' + error.message 
    });
  }
});

// Abandon garbage war (for cleanup)
app.post('/api/games/:gameId/abandon', (req, res) => {
  try {
    const { gameId } = req.params;
    const { playerAddress, reason } = req.body;
    
    const game = games.get(gameId);
    
    if (!game) {
      return res.status(404).json({ 
        success: false, 
        error: 'Garbage war not found' 
      });
    }
    
    if (game.playerA !== playerAddress && game.playerB !== playerAddress) {
      return res.status(400).json({ 
        success: false, 
        error: 'You are not a player in this garbage war' 
      });
    }
    
    game.status = 'abandoned';
    game.abandonReason = reason || 'Player abandoned';
    game.updatedAt = Date.now();
    
    console.log(`🏃 Garbage war ${gameId} abandoned by ${playerAddress}: ${game.abandonReason}`);
    
    res.json({ 
      success: true, 
      game,
      message: 'Garbage war abandoned'
    });
    
  } catch (error) {
    console.error('❌ Error abandoning garbage war:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to abandon garbage war: ' + error.message 
    });
  }
});

// Forfeit garbage war (opponent wins)
app.post('/api/games/:gameId/forfeit', (req, res) => {
  try {
    const { gameId } = req.params;
    const { playerAddress, winner, reason } = req.body;
    
    const game = games.get(gameId);
    
    if (!game) {
      return res.status(404).json({ 
        success: false, 
        error: 'Garbage war not found' 
      });
    }
    
    if (game.playerA !== playerAddress && game.playerB !== playerAddress) {
      return res.status(400).json({ 
        success: false, 
        error: 'You are not a player in this garbage war' 
      });
    }
    
    // Set opponent as winner
    game.status = 'finished';
    game.winner = winner;
    game.abandonReason = reason || 'Player forfeited';
    game.updatedAt = Date.now();
    
    console.log(`🏳️ Garbage war ${gameId} forfeited by ${playerAddress} - Winner: ${winner}`);
    
    res.json({ 
      success: true, 
      game,
      message: 'Garbage war forfeited'
    });
    
  } catch (error) {
    console.error('❌ Error forfeiting garbage war:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to forfeit garbage war: ' + error.message 
    });
  }
});

// Track payout status
app.post('/api/games/:gameId/payout', (req, res) => {
  try {
    const { gameId } = req.params;
    const { payoutType, winner, processed } = req.body;
    
    const game = games.get(gameId);
    
    if (!game) {
      return res.status(404).json({ 
        success: false, 
        error: 'Garbage war not found' 
      });
    }
    
    // Track payout information
    game.payoutProcessed = processed;
    game.payoutType = payoutType;
    game.payoutWinner = winner;
    game.payoutTimestamp = Date.now();
    game.updatedAt = Date.now();
    
    console.log(`💰 Payout processed for garbage war ${gameId}: ${payoutType} to ${winner || 'players'}`);
    
    res.json({ 
      success: true, 
      game,
      message: 'Payout status updated'
    });
    
  } catch (error) {
    console.error('❌ Error tracking payout:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to track payout: ' + error.message 
    });
  }
});

// Delete a garbage war
app.delete('/api/games/:gameId', (req, res) => {
  try {
    const { gameId } = req.params;
    
    const deleted = games.delete(gameId);
    publicGames.delete(gameId);
    
    if (deleted) {
      console.log(`🗑️ Deleted garbage war: ${gameId}`);
      res.json({ success: true });
    } else {
      res.status(404).json({ error: 'Garbage war not found' });
    }
  } catch (error) {
    console.error('Error deleting garbage war:', error);
    res.status(500).json({ error: 'Failed to delete garbage war' });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('❌ Server error:', err);
  res.status(500).json({ 
    success: false, 
    error: 'Internal server error' 
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    success: false, 
    error: 'Endpoint not found' 
  });
});

// Start server with database initialization
const startServer = async () => {
  // Initialize database connection
  await initializeServer();
  
  // Start the Express server
  app.listen(PORT, () => {
    console.log(`🚀 Gorbagana Trash Combat Backend v2.0 running on port ${PORT}`);
    console.log(`🌐 Server URL: http://localhost:${PORT}`);
    console.log('✅ Using proven patterns from working Trash Tac Toe app');
    console.log(`🗑️ Ready to handle Trash Combat wars with real $GOR wagering`);
    console.log(`💾 Storage: ${dbConnected ? 'MongoDB' : 'In-Memory (Development)'}`);
  });
};

// Start the server
startServer().catch(error => {
  console.error('❌ Failed to start server:', error);
  process.exit(1);
}); 