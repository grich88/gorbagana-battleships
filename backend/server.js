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
    'https://gorbagana-battleship.vercel.app',
    'https://gorbagana-battleship.netlify.app'
  ],
  credentials: true,
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
  const oneWeekAgo = new Date(Date.now() - (7 * 24 * 60 * 60 * 1000));
  let cleaned = 0;
  
  try {
    if (mongoConnected) {
      const result = await Game.deleteMany({
        createdAt: { $lt: oneWeekAgo }
      });
      cleaned = result.deletedCount;
    } else {
      // In-memory cleanup
      for (const [gameId, game] of inMemoryGames.entries()) {
        if (game.createdAt < oneWeekAgo.getTime()) {
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
      }
    } else {
      game = inMemoryGames.get(gameId);
    }
    
    if (!game) {
      console.log(`❌ Game not found: ${gameId.slice(0, 8)}... (${mongoConnected ? 'MongoDB' : 'Memory'})`);
      return res.status(404).json({ error: 'Game not found' });
    }
    
    console.log(`📖 Game retrieved: ${gameId.slice(0, 8)}... (${mongoConnected ? 'MongoDB' : 'Memory'})`);
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
    if (!gameData.id || !gameData.player1) {
      return res.status(400).json({ error: 'Missing required fields: id, player1' });
    }
    
    const game = deserializeGame(gameData);
    game.updatedAt = new Date();
    
    if (mongoConnected) {
      // MongoDB save
      await Game.findOneAndUpdate(
        { id: game.id },
        game,
        { 
          upsert: true, 
          new: true,
          setDefaultsOnInsert: true
        }
      );
      console.log(`💾 Game saved to MongoDB: ${game.id.slice(0, 8)}...`);
    } else {
      // In-memory fallback
      game.updatedAt = Date.now();
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
    }
    
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