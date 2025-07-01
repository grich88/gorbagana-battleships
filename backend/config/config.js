require('dotenv').config();

const config = {
  // Server Configuration
  server: {
    port: process.env.PORT || 3002,
    env: process.env.NODE_ENV || 'development',
    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000'
  },

  // Database Configuration
  database: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/gorbagana-battleship',
    options: {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    }
  },

  // Game Configuration
  game: {
    cleanupInterval: parseInt(process.env.GAME_CLEANUP_INTERVAL) || 60 * 60 * 1000, // 1 hour
    maxGamesPerUser: parseInt(process.env.MAX_GAMES_PER_USER) || 10,
    gameTimeout: parseInt(process.env.GAME_TIMEOUT) || 2 * 60 * 60 * 1000, // 2 hours
    modes: {
      quick: {
        boardSize: 6,
        fleet: [
          { length: 3, count: 1, name: 'Cruiser' },
          { length: 2, count: 2, name: 'Destroyer' }
        ],
        totalShipSquares: 7
      },
      standard: {
        boardSize: 10,
        fleet: [
          { length: 5, count: 1, name: 'Carrier' },
          { length: 4, count: 1, name: 'Battleship' },
          { length: 3, count: 2, name: 'Cruiser' },
          { length: 2, count: 1, name: 'Destroyer' }
        ],
        totalShipSquares: 17
      },
      extended: {
        boardSize: 12,
        fleet: [
          { length: 6, count: 1, name: 'Super Carrier' },
          { length: 5, count: 1, name: 'Carrier' },
          { length: 4, count: 2, name: 'Battleship' },
          { length: 3, count: 2, name: 'Cruiser' },
          { length: 2, count: 2, name: 'Destroyer' }
        ],
        totalShipSquares: 28
      }
    }
  },

  // Rate Limiting
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW) || 15 * 60 * 1000, // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
    message: 'Too many requests from this IP, please try again later'
  },

  // Security
  security: {
    sessionSecret: process.env.SESSION_SECRET || 'battleship-secret-key',
    jwtSecret: process.env.JWT_SECRET || 'battleship-jwt-secret'
  },

  // Blockchain Configuration
  blockchain: {
    rpcUrl: process.env.SOLANA_RPC_URL || 'https://rpc.gorbagana.wtf/',
    programId: process.env.PROGRAM_ID || 'DRJk4gJFdYCCHNYY5qFZfrM9ysNrMz3kXJN5JVZdz8Jm'
  },

  // Logging
  logging: {
    level: process.env.LOG_LEVEL || 'info'
  }
};

module.exports = config; 