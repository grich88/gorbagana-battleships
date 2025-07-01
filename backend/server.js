// Gorbagana Battleship Backend API Server
// Enhanced with MongoDB integration for persistent game storage

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
require('dotenv').config();

// MongoDB imports
const dbConnection = require('./config/database');
const Game = require('./models/Game');

const app = express();
const PORT = process.env.PORT || 3002;

// MongoDB connection
let mongoConnected = false;

// Initialize database connection
const initializeDatabase = async () => {
  try {
    if (process.env.MONGODB_URI) {
      await dbConnection.connect(process.env.MONGODB_URI);
      mongoConnected = true;
      console.log('🎉 MongoDB connection established successfully!');
      
      // Count existing games
      const gameCount = await Game.countDocuments();
      console.log(`📊 Found ${gameCount} existing games in database`);
    } else {
      console.warn('⚠️ No MONGODB_URI found in environment variables');
      console.log('💾 Falling back to in-memory storage');
    }
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    console.log('💾 Falling back to in-memory storage');
    mongoConnected = false;
  }
};

// Fallback in-memory storage for when MongoDB is not available
const inMemoryGames = new Map();
const gameHistory = [];

// Middleware
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: false,
}));

app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:3003',
    'http://localhost:3004',
    'http://localhost:3005',
    'https://gorbagana-battleship.vercel.app',
    'https://gorbagana-battleship.netlify.app',
    'https://gorbagana-battleship-frontend.onrender.com'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));

app.use(compression());
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Utility functions
const sanitizeGame = (game) => {
  // Convert Uint8Array fields to regular arrays for JSON serialization
  const sanitized = { ...game };
  
  if (sanitized.player1Salt && typeof sanitized.player1Salt === 'object') {
    sanitized.player1Salt = Array.from(sanitized.player1Salt);
  }
  if (sanitized.player2Salt && typeof sanitized.player2Salt === 'object') {
    sanitized.player2Salt = Array.from(sanitized.player2Salt);
  }
  
  return sanitized;
};

const deserializeGame = (game) => {
  // Convert arrays back to Uint8Array for consistency
  const deserialized = { ...game };
  
  if (deserialized.player1Salt && Array.isArray(deserialized.player1Salt)) {
    deserialized.player1Salt = new Uint8Array(deserialized.player1Salt);
  }
  if (deserialized.player2Salt && Array.isArray(deserialized.player2Salt)) {
    deserialized.player2Salt = new Uint8Array(deserialized.player2Salt);
  }
  
  return deserialized;
};

const cleanupOldGames = async () => {
  const now = new Date();
  const thirtyMinutesAgo = new Date(now.getTime() - 30 * 60 * 1000); // 30 minutes
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000); // 1 hour
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000); // 24 hours
  let cleaned = 0;
  
  try {
    if (mongoConnected) {
      // Find games to clean up with escrow handling
      const expiredGames = await Game.find({
        $or: [
          // Idle games older than 30 minutes
          { 
            updatedAt: { $lt: thirtyMinutesAgo }, 
            'gameState.phase': { $in: ['waiting', 'setup'] } 
          },
          // Abandoned games older than 1 hour
          { 
            abandonReason: { $exists: true }, 
            updatedAt: { $lt: oneHourAgo } 
          },
          // Finished games older than 24 hours
          { 
            'gameState.phase': 'finished', 
            finishedAt: { $lt: oneDayAgo } 
          }
        ]
      });

      // Handle escrow refunds before deletion
      for (const game of expiredGames) {
        if (game.wagerAmount > 0 && game.escrowStatus === 'locked') {
          await handleEscrowRefund(game);
        }
      }

      // Delete the games
      const result = await Game.deleteMany({
        _id: { $in: expiredGames.map(g => g._id) }
      });
      cleaned = result.deletedCount;
    } else {
      // In-memory cleanup
      for (const [gameId, game] of inMemoryGames.entries()) {
        const gameTime = new Date(game.updatedAt || game.createdAt);
        const shouldCleanup = 
          (gameTime < thirtyMinutesAgo && ['waiting', 'setup'].includes(game.status)) ||
          (game.abandonReason && gameTime < oneHourAgo) ||
          (game.status === 'finished' && gameTime < oneDayAgo);

        if (shouldCleanup) {
          inMemoryGames.delete(gameId);
          cleaned++;
        }
      }
    }
    
    console.log(`🧹 Cleaned up ${cleaned} old games`);
    return cleaned;
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    return 0;
  }
};

// Handle escrow refund
const handleEscrowRefund = async (game) => {
  try {
    console.log(`💰 Processing escrow refund for game ${game.id}`);
    
    // Update escrow status
    game.escrowStatus = 'refunded';
    game.abandonReason = game.abandonReason || 'timeout';
    
    if (mongoConnected) {
      await game.save();
    }
    
    console.log(`✅ Escrow refunded for game ${game.id}`);
    return true;
  } catch (error) {
    console.error(`❌ Error refunding escrow for game ${game.id}:`, error);
    return false;
  }
};

// Get game count
const getGameCount = async () => {
  try {
    if (mongoConnected) {
      return await Game.countDocuments();
    } else {
      return inMemoryGames.size;
    }
  } catch (error) {
    console.error('❌ Error getting game count:', error);
    return 0;
  }
};

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    const gameCount = await getGameCount();
    const status = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      gamesStored: gameCount,
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      database: mongoConnected ? 'MongoDB Atlas' : 'In-Memory',
      mongoStatus: mongoConnected ? 'connected' : 'disconnected'
    };
    
    console.log(`✅ Health check - ${gameCount} games stored (${mongoConnected ? 'MongoDB' : 'Memory'})`);
    res.json(status);
  } catch (error) {
    console.error('❌ Health check error:', error);
    res.status(500).json({ error: 'Health check failed' });
  }
});

// Get all public games
app.get('/api/games/public', async (req, res) => {
  try {
    let publicGames = [];
    
    if (mongoConnected) {
      // MongoDB query
      const games = await Game.find({
        isPublic: true,
        'gameState.phase': { $in: ['waiting', 'setup'] }
      })
      .select('id player1 player2 gameState isPublic creator createdAt updatedAt gameMode')
      .sort({ createdAt: -1 })
      .limit(20);
      
      publicGames = games.map(game => ({
        id: game.id,
        player1: game.player1,
        player2: game.player2,
        status: game.gameState.phase,
        createdAt: game.createdAt,
        updatedAt: game.updatedAt,
        isPublic: game.isPublic,
        creatorName: game.creator?.name || 'Anonymous Captain',
        gameMode: game.gameMode
      }));
    } else {
      // In-memory fallback
      for (const [gameId, game] of inMemoryGames.entries()) {
        if (game.isPublic && game.status === 'waiting') {
          publicGames.push({
            id: gameId,
            player1: game.player1,
            player2: game.player2,
            status: game.status,
            createdAt: game.createdAt,
            updatedAt: game.updatedAt,
            isPublic: game.isPublic,
            creatorName: game.creatorName,
          });
        }
      }
      publicGames.sort((a, b) => b.createdAt - a.createdAt);
      publicGames = publicGames.slice(0, 20);
    }
    
    console.log(`📋 Public games requested - ${publicGames.length} available (${mongoConnected ? 'MongoDB' : 'Memory'})`);
    res.json(publicGames);
  } catch (error) {
    console.error('❌ Error fetching public games:', error);
    res.status(500).json({ error: 'Failed to fetch public games' });
  }
});

// Get specific game by ID
app.get('/api/games/:gameId', async (req, res) => {
  try {
    const gameId = req.params.gameId;
    let game = null;
    
    if (mongoConnected) {
      game = await Game.findOne({ id: gameId });
      if (game) {
        game = game.toObject();
        
        // Convert MongoDB format back to frontend format
        const frontendGame = {
          id: game.id,
          player1: game.player1?.walletAddress || game.player1?.id || '',
          player2: game.player2?.walletAddress || game.player2?.id || undefined,
          player1Board: game.player1Board || new Array(100).fill(0),
          player2Board: game.player2Board || undefined,
          player1Salt: game.player1Salt || [],
          player2Salt: game.player2Salt || undefined,
          player1Commitment: game.player1Commitment || [],
          player2Commitment: game.player2Commitment || [],
          turn: game.gameState?.turn || game.turn || 1,
          boardHits1: game.boardHits1 || new Array(100).fill(0),
          boardHits2: game.boardHits2 || new Array(100).fill(0),
          status: game.status || game.gameState?.phase || 'waiting',
          winner: game.winner || (game.gameState?.winner ? parseInt(game.gameState.winner.replace('player', '')) : undefined),
          createdAt: game.createdAt?.getTime() || Date.now(),
          updatedAt: game.updatedAt?.getTime() || Date.now(),
          isPublic: game.isPublic || false,
          creatorName: game.creator?.name || game.player1?.name || 'Anonymous Captain',
          wager: game.wagerAmount || game.wager || 0,
          escrowAccount: game.escrowData?.escrowAccount || game.escrowAccount,
          txSignature: game.txSignature,
          phase: game.gameState?.phase || game.phase || 'setup'
        };
        
        console.log(`📖 Game retrieved: ${gameId.slice(0, 8)}... (MongoDB)`);
        return res.json(sanitizeGame(frontendGame));
      }
    } else {
      game = inMemoryGames.get(gameId);
    }
    
    if (!game) {
      console.log(`❌ Game not found: ${gameId.slice(0, 8)}... (${mongoConnected ? 'MongoDB' : 'Memory'})`);
      return res.status(404).json({ error: 'Game not found' });
    }
    
    console.log(`📖 Game retrieved: ${gameId.slice(0, 8)}... (Memory)`);
    res.json(sanitizeGame(game));
  } catch (error) {
    console.error('❌ Error fetching game:', error);
    res.status(500).json({ error: 'Failed to fetch game' });
  }
});

// Save/Create game
app.post('/api/games', async (req, res) => {
  try {
    const gameData = req.body;
    
    // Validate required fields
    if (!gameData.id) {
      return res.status(400).json({ error: 'Missing required field: id' });
    }

    // Check if this is the new MongoDB-compatible format
    if (gameData.player1 && typeof gameData.player1 === 'object' && gameData.gameState) {
      // New format from frontend - use as-is for MongoDB
      gameData.updatedAt = new Date();
      
      if (mongoConnected) {
        try {
          await Game.findOneAndUpdate(
            { id: gameData.id },
            gameData,
            { 
              upsert: true, 
              new: true,
              setDefaultsOnInsert: true
            }
          );
          console.log(`💾 Game saved to MongoDB: ${gameData.id.slice(0, 8)}...`);
          return res.json({ success: true, gameId: gameData.id });
        } catch (mongoError) {
          console.error('❌ MongoDB save failed:', mongoError);
          // Fall through to in-memory storage
        }
      }
    }
    
    // Legacy format or fallback to in-memory storage
    if (!gameData.player1) {
      return res.status(400).json({ error: 'Missing required field: player1' });
    }
    
    const game = deserializeGame(gameData);
    game.updatedAt = Date.now();
    
    // In-memory fallback
    inMemoryGames.set(game.id, game);
    
    // Add to history for analytics
    gameHistory.push({
      gameId: game.id,
      action: inMemoryGames.has(game.id) ? 'updated' : 'created',
      timestamp: Date.now(),
      status: game.status,
      isPublic: game.isPublic,
    });
    
    if (gameHistory.length > 1000) {
      gameHistory.splice(0, gameHistory.length - 1000);
    }
    console.log(`💾 Game saved to memory: ${game.id.slice(0, 8)}...`);
    
    res.json({ success: true, gameId: game.id });
  } catch (error) {
    console.error('❌ Error saving game:', error);
    res.status(500).json({ error: 'Failed to save game' });
  }
});

// Delete game
app.delete('/api/games/:gameId', async (req, res) => {
  try {
    const gameId = req.params.gameId;
    let deleted = false;
    
    if (mongoConnected) {
      const result = await Game.deleteOne({ id: gameId });
      deleted = result.deletedCount > 0;
    } else {
      deleted = inMemoryGames.delete(gameId);
    }
    
    if (!deleted) {
      console.log(`❌ Game not found for deletion: ${gameId.slice(0, 8)}... (${mongoConnected ? 'MongoDB' : 'Memory'})`);
      return res.status(404).json({ error: 'Game not found' });
    }
    
    console.log(`🗑️ Game deleted: ${gameId.slice(0, 8)}... (${mongoConnected ? 'MongoDB' : 'Memory'})`);
    res.json({ success: true, gameId });
  } catch (error) {
    console.error('❌ Error deleting game:', error);
    res.status(500).json({ error: 'Failed to delete game' });
  }
});

// Wager and Escrow Routes

// Create escrow for game
app.post('/api/games/:gameId/escrow', async (req, res) => {
  try {
    const gameId = req.params.gameId;
    const { playerAddress, wagerAmount, transactionId } = req.body;
    
    if (!playerAddress || !wagerAmount || !transactionId) {
      return res.status(400).json({ error: 'Missing required fields: playerAddress, wagerAmount, transactionId' });
    }
    
    let game = null;
    if (mongoConnected) {
      game = await Game.findOne({ id: gameId });
    } else {
      game = inMemoryGames.get(gameId);
    }
    
    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }
    
    // Update escrow data
    if (!game.escrowData) {
      game.escrowData = { creatorDeposit: 0, opponentDeposit: 0, transactionIds: [] };
    }
    
    const isCreator = game.creator?.id === playerAddress || game.player1?.id === playerAddress;
    if (isCreator) {
      game.escrowData.creatorDeposit = wagerAmount;
      game.playersDeposited.player1 = true;
    } else {
      game.escrowData.opponentDeposit = wagerAmount;
      game.playersDeposited.player2 = true;
    }
    
    game.escrowData.transactionIds.push(transactionId);
    game.wagerAmount = wagerAmount;
    
    // Check if both players have deposited
    if (game.playersDeposited.player1 && game.playersDeposited.player2) {
      game.escrowStatus = 'locked';
    } else {
      game.escrowStatus = 'pending';
    }
    
    game.updatedAt = new Date();
    
    if (mongoConnected) {
      await game.save();
    } else {
      inMemoryGames.set(gameId, game);
    }
    
    console.log(`💰 Escrow deposit for game ${gameId.slice(0, 8)}... by ${playerAddress.slice(0, 8)}...`);
    res.json({ success: true, escrowStatus: game.escrowStatus });
  } catch (error) {
    console.error('❌ Error handling escrow deposit:', error);
    res.status(500).json({ error: 'Failed to process escrow deposit' });
  }
});

// Abandon game and handle escrow
app.post('/api/games/:gameId/abandon', async (req, res) => {
  try {
    const gameId = req.params.gameId;
    const { playerAddress, reason } = req.body;
    
    if (!playerAddress) {
      return res.status(400).json({ error: 'Missing playerAddress' });
    }
    
    let game = null;
    if (mongoConnected) {
      game = await Game.findOne({ id: gameId });
    } else {
      game = inMemoryGames.get(gameId);
    }
    
    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }
    
    const isCreator = game.creator?.id === playerAddress || game.player1?.id === playerAddress;
    const hasOpponent = game.player2 && game.player2.id;
    const gameStarted = game.gameState.phase === 'playing' && game.moveHistory && game.moveHistory.length > 0;
    
    // Update game state
    game.gameState.phase = 'abandoned';
    game.abandonedBy = playerAddress;
    game.abandonReason = reason || 'player_left';
    game.updatedAt = new Date();
    
    // Handle escrow based on game state
    let escrowAction = 'refund';
    let beneficiary = null;
    
    if (game.wagerAmount > 0 && game.escrowStatus === 'locked') {
      if (!hasOpponent || !gameStarted) {
        // Game hasn't really started, refund both players
        escrowAction = 'refund';
        game.escrowStatus = 'refunded';
      } else {
        // Game started and someone abandoned, give to other player
        beneficiary = isCreator ? game.player2?.id : game.player1?.id;
        escrowAction = 'release';
        game.escrowStatus = 'released';
        game.gameState.winner = isCreator ? 'player2' : 'player1';
      }
    }
    
    if (mongoConnected) {
      await game.save();
    } else {
      inMemoryGames.set(gameId, game);
    }
    
    console.log(`🚪 Game ${gameId.slice(0, 8)}... abandoned by ${playerAddress.slice(0, 8)}... - Escrow: ${escrowAction}`);
    res.json({ 
      success: true, 
      escrowAction,
      beneficiary,
      message: escrowAction === 'refund' ? 'Escrow will be refunded to both players' : `Escrow released to ${beneficiary}`
    });
  } catch (error) {
    console.error('❌ Error handling game abandonment:', error);
    res.status(500).json({ error: 'Failed to abandon game' });
  }
});

// Claim winnings
app.post('/api/games/:gameId/claim', async (req, res) => {
  try {
    const gameId = req.params.gameId;
    const { playerAddress } = req.body;
    
    if (!playerAddress) {
      return res.status(400).json({ error: 'Missing playerAddress' });
    }
    
    let game = null;
    if (mongoConnected) {
      game = await Game.findOne({ id: gameId });
    } else {
      game = inMemoryGames.get(gameId);
    }
    
    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }
    
    if (game.gameState.phase !== 'finished' || !game.gameState.winner) {
      return res.status(400).json({ error: 'Game not finished or no winner' });
    }
    
    const isWinner = 
      (game.gameState.winner === 'player1' && (game.creator?.id === playerAddress || game.player1?.id === playerAddress)) ||
      (game.gameState.winner === 'player2' && game.player2?.id === playerAddress);
    
    if (!isWinner) {
      return res.status(403).json({ error: 'Only the winner can claim winnings' });
    }
    
    if (game.escrowStatus === 'released') {
      return res.status(400).json({ error: 'Winnings already claimed' });
    }
    
    // Release escrow to winner
    game.escrowStatus = 'released';
    game.updatedAt = new Date();
    
    const totalWinnings = (game.escrowData.creatorDeposit || 0) + (game.escrowData.opponentDeposit || 0);
    
    if (mongoConnected) {
      await game.save();
    } else {
      inMemoryGames.set(gameId, game);
    }
    
    console.log(`🏆 Winnings claimed for game ${gameId.slice(0, 8)}... by ${playerAddress.slice(0, 8)}... - Amount: ${totalWinnings} GOR`);
    res.json({ 
      success: true, 
      winnings: totalWinnings,
      message: `${totalWinnings} GOR released to winner`
    });
  } catch (error) {
    console.error('❌ Error handling winnings claim:', error);
    res.status(500).json({ error: 'Failed to claim winnings' });
  }
});

// Get escrow status
app.get('/api/games/:gameId/escrow', async (req, res) => {
  try {
    const gameId = req.params.gameId;
    
    let game = null;
    if (mongoConnected) {
      game = await Game.findOne({ id: gameId });
    } else {
      game = inMemoryGames.get(gameId);
    }
    
    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }
    
    const escrowInfo = {
      gameId: game.id,
      wagerAmount: game.wagerAmount || 0,
      escrowStatus: game.escrowStatus || 'none',
      escrowData: game.escrowData || {},
      playersDeposited: game.playersDeposited || { player1: false, player2: false },
      canClaim: game.gameState.phase === 'finished' && game.gameState.winner && game.escrowStatus === 'locked'
    };
    
    res.json(escrowInfo);
  } catch (error) {
    console.error('❌ Error fetching escrow status:', error);
    res.status(500).json({ error: 'Failed to fetch escrow status' });
  }
});

// Analytics endpoint
app.get('/api/analytics', async (req, res) => {
  try {
    let analytics;
    
    if (mongoConnected) {
      const totalGames = await Game.countDocuments();
      const activeGames = await Game.countDocuments({
        'gameState.phase': { $in: ['playing', 'waiting', 'setup'] }
      });
      const finishedGames = await Game.countDocuments({
        'gameState.phase': 'finished'
      });
      const publicGames = await Game.countDocuments({ isPublic: true });
      
      analytics = {
        totalGames,
        activeGames,
        finishedGames,
        publicGames,
        averageGameDuration: 0, // Would need to calculate
        storage: 'MongoDB Atlas',
        timestamp: new Date().toISOString()
      };
    } else {
      const totalGames = inMemoryGames.size;
      let activeGames = 0;
      let finishedGames = 0;
      let publicGames = 0;
      
      for (const [, game] of inMemoryGames.entries()) {
        if (game.status === 'playing' || game.status === 'waiting') activeGames++;
        if (game.status === 'finished') finishedGames++;
        if (game.isPublic) publicGames++;
      }
      
      analytics = {
        totalGames,
        activeGames,
        finishedGames,
        publicGames,
        gameHistory: gameHistory.length,
        storage: 'In-Memory',
        timestamp: new Date().toISOString()
      };
    }
    
    console.log(`📊 Analytics requested - ${analytics.totalGames} total games (${mongoConnected ? 'MongoDB' : 'Memory'})`);
    res.json(analytics);
  } catch (error) {
    console.error('❌ Error fetching analytics:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

// Batch operations
app.post('/api/games/batch', async (req, res) => {
  try {
    const { operation, gameIds } = req.body;
    
    if (operation === 'delete' && Array.isArray(gameIds)) {
      let deletedCount = 0;
      
      if (mongoConnected) {
        const result = await Game.deleteMany({ id: { $in: gameIds } });
        deletedCount = result.deletedCount;
      } else {
        for (const gameId of gameIds) {
          if (inMemoryGames.delete(gameId)) {
            deletedCount++;
          }
        }
      }
      
      console.log(`🗑️ Batch delete: ${deletedCount}/${gameIds.length} games deleted (${mongoConnected ? 'MongoDB' : 'Memory'})`);
      res.json({ success: true, deletedCount, total: gameIds.length });
    } else {
      res.status(400).json({ error: 'Invalid batch operation' });
    }
  } catch (error) {
    console.error('❌ Error in batch operation:', error);
    res.status(500).json({ error: 'Batch operation failed' });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('❌ Server error:', error);
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? error.message : undefined
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('🛑 SIGTERM received, shutting down gracefully...');
  
  if (mongoConnected) {
    await dbConnection.disconnect();
  }
  
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('🛑 SIGINT received, shutting down gracefully...');
  
  if (mongoConnected) {
    await dbConnection.disconnect();
  }
  
  process.exit(0);
});

// Start server
const startServer = async () => {
  try {
    // Initialize database first
    await initializeDatabase();
    
    // Run cleanup on startup
    await cleanupOldGames();
    
    // Start the server
    app.listen(PORT, () => {
      console.log('\n🚀🚀🚀 GORBAGANA BATTLESHIP BACKEND STARTED 🚀🚀🚀');
      console.log(`⚓ Server running on http://localhost:${PORT}`);
      console.log(`🔗 Health check: http://localhost:${PORT}/health`);
      console.log(`📋 Public games: http://localhost:${PORT}/api/games/public`);
      console.log(`📊 Analytics: http://localhost:${PORT}/api/analytics`);
      console.log('🛡️ CORS enabled for frontend development');
      console.log(`💾 Storage: ${mongoConnected ? 'MongoDB Atlas (persistent)' : 'In-Memory (temporary)'}`);
      console.log('✅ Ready to handle battleship games!\n');
    });
    
    // Schedule periodic cleanup
    setInterval(cleanupOldGames, 24 * 60 * 60 * 1000); // Daily cleanup
    
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// Start the server
startServer(); 