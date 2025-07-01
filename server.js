// Gorbagana Battleship Backend API Server
// Provides cross-device game storage and multiplayer features

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3002;

// In-memory storage (could be replaced with MongoDB in production)
const games = new Map();
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

const cleanupOldGames = () => {
  const oneWeekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
  let cleaned = 0;
  
  for (const [gameId, game] of games.entries()) {
    if (game.createdAt < oneWeekAgo) {
      games.delete(gameId);
      cleaned++;
    }
  }
  
  console.log(`🧹 Cleaned up ${cleaned} old games`);
  return cleaned;
};

// Health check endpoint
app.get('/health', (req, res) => {
  const status = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    gamesStored: games.size,
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development'
  };
  
  console.log(`✅ Health check - ${games.size} games stored`);
  res.json(status);
});

// Get all public games
app.get('/api/games/public', (req, res) => {
  try {
    const publicGames = [];
    
    for (const [gameId, game] of games.entries()) {
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
    
    // Sort by creation date (newest first)
    publicGames.sort((a, b) => b.createdAt - a.createdAt);
    
    console.log(`📋 Public games requested - ${publicGames.length} available`);
    res.json(publicGames.slice(0, 20)); // Limit to 20 games
  } catch (error) {
    console.error('❌ Error fetching public games:', error);
    res.status(500).json({ error: 'Failed to fetch public games' });
  }
});

// Get specific game by ID
app.get('/api/games/:gameId', (req, res) => {
  try {
    const gameId = req.params.gameId;
    const game = games.get(gameId);
    
    if (!game) {
      console.log(`❌ Game not found: ${gameId.slice(0, 8)}...`);
      return res.status(404).json({ error: 'Game not found' });
    }
    
    console.log(`📖 Game retrieved: ${gameId.slice(0, 8)}... (status: ${game.status})`);
    res.json(sanitizeGame(game));
  } catch (error) {
    console.error('❌ Error fetching game:', error);
    res.status(500).json({ error: 'Failed to fetch game' });
  }
});

// Save/Create game
app.post('/api/games', (req, res) => {
  try {
    const gameData = req.body;
    
    // Validate required fields
    if (!gameData.id || !gameData.player1) {
      return res.status(400).json({ error: 'Missing required fields: id, player1' });
    }
    
    // Deserialize and store the game
    const game = deserializeGame(gameData);
    game.updatedAt = Date.now();
    
    // Store in memory
    games.set(game.id, game);
    
    // Add to history for analytics
    gameHistory.push({
      gameId: game.id,
      action: games.has(game.id) ? 'updated' : 'created',
      timestamp: Date.now(),
      status: game.status,
      isPublic: game.isPublic,
    });
    
    // Keep history manageable
    if (gameHistory.length > 1000) {
      gameHistory.splice(0, gameHistory.length - 1000);
    }
    
    console.log(`💾 Game saved: ${game.id.slice(0, 8)}... (status: ${game.status}, public: ${game.isPublic})`);
    res.json({ success: true, gameId: game.id });
  } catch (error) {
    console.error('❌ Error saving game:', error);
    res.status(500).json({ error: 'Failed to save game' });
  }
});

// Delete game
app.delete('/api/games/:gameId', (req, res) => {
  try {
    const gameId = req.params.gameId;
    const deleted = games.delete(gameId);
    
    if (!deleted) {
      console.log(`❌ Game not found for deletion: ${gameId.slice(0, 8)}...`);
      return res.status(404).json({ error: 'Game not found' });
    }
    
    // Add to history
    gameHistory.push({
      gameId: gameId,
      action: 'deleted',
      timestamp: Date.now(),
    });
    
    console.log(`🗑️ Game deleted: ${gameId.slice(0, 8)}...`);
    res.json({ success: true });
  } catch (error) {
    console.error('❌ Error deleting game:', error);
    res.status(500).json({ error: 'Failed to delete game' });
  }
});

// Analytics endpoint (optional)
app.get('/api/analytics', (req, res) => {
  try {
    const stats = {
      totalGames: games.size,
      publicGames: Array.from(games.values()).filter(g => g.isPublic).length,
      activeGames: Array.from(games.values()).filter(g => g.status === 'playing').length,
      waitingGames: Array.from(games.values()).filter(g => g.status === 'waiting').length,
      finishedGames: Array.from(games.values()).filter(g => g.status === 'finished').length,
      recentActivity: gameHistory.slice(-10),
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
    };
    
    res.json(stats);
  } catch (error) {
    console.error('❌ Error fetching analytics:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('❌ Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use((req, res) => {
  console.log(`❌ 404 - Route not found: ${req.method} ${req.path}`);
  res.status(404).json({ error: 'Route not found' });
});

// Cleanup job - run every hour
setInterval(cleanupOldGames, 60 * 60 * 1000);

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down Gorbagana Battleship Backend...');
  console.log(`📊 Final stats: ${games.size} games stored, ${gameHistory.length} history entries`);
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Received SIGTERM, shutting down gracefully...');
  process.exit(0);
});

// Start server
app.listen(PORT, () => {
  console.log('🚀🚀🚀 GORBAGANA BATTLESHIP BACKEND STARTED 🚀🚀🚀');
  console.log(`⚓ Server running on http://localhost:${PORT}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
  console.log(`📋 Public games: http://localhost:${PORT}/api/games/public`);
  console.log(`📊 Analytics: http://localhost:${PORT}/api/analytics`);
  console.log(`🛡️ CORS enabled for frontend development`);
  console.log(`💾 Using in-memory storage (${games.size} games loaded)`);
  console.log('✅ Ready to handle battleship games!');
});

module.exports = app; 