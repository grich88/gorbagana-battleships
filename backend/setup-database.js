#!/usr/bin/env node

// Database Setup Script for Gorbagana Battleship
// This script helps you set up and test your MongoDB connection

const fs = require('fs');
const path = require('path');

console.log('🚀 GORBAGANA BATTLESHIP DATABASE SETUP 🚀\n');

// Check if .env file exists
const envPath = path.join(__dirname, '.env');
const sampleEnvPath = path.join(__dirname, 'env-sample.txt');

if (!fs.existsSync(envPath)) {
  console.log('📝 Creating .env file from sample...');
  
  try {
    const sampleContent = fs.readFileSync(sampleEnvPath, 'utf8');
    
    // Create basic .env with local MongoDB
    const envContent = `# MongoDB Configuration - Update this with your actual connection string
MONGODB_URI=mongodb://localhost:27017/gorbagana-battleship

# Server Configuration
PORT=3002
NODE_ENV=development
FRONTEND_URL=http://localhost:3000

# Game Configuration
GAME_CLEANUP_INTERVAL=3600000
MAX_GAMES_PER_USER=10
GAME_TIMEOUT=7200000

# Rate Limiting
RATE_LIMIT_WINDOW=900000
RATE_LIMIT_MAX_REQUESTS=100

# Security
SESSION_SECRET=gorbagana-battleship-secret-2025
JWT_SECRET=gorbagana-battleship-jwt-secret-2025

# Blockchain Configuration
SOLANA_RPC_URL=https://rpc.gorbagana.wtf/
PROGRAM_ID=DRJk4gJFdYCCHNYY5qFZfrM9ysNrMz3kXJN5JVZdz8Jm

# Logging
LOG_LEVEL=info
`;
    
    fs.writeFileSync(envPath, envContent);
    console.log('✅ .env file created successfully!');
  } catch (error) {
    console.log('❌ Could not create .env file automatically');
    console.log('📋 Please copy env-sample.txt to .env and update the MONGODB_URI');
  }
} else {
  console.log('✅ .env file already exists');
}

// Test database connection
async function testConnection() {
  console.log('\n🔌 Testing database connection...');
  
  try {
    require('dotenv').config();
    const database = require('./config/database');
    
    const mongoUri = process.env.MONGODB_URI;
    console.log(`📡 Connecting to: ${mongoUri.replace(/\/\/[^:]+:[^@]+@/, '//***:***@')}`);
    
    await database.connect(mongoUri);
    console.log('✅ Database connection successful!');
    
    // Test creating a sample game
    const Game = require('./models/Game');
    
    const testGame = new Game({
      id: 'test-game-' + Date.now(),
      gameMode: {
        mode: 'standard',
        boardSize: 10,
        totalShipSquares: 17
      },
      player1: {
        id: 'test-player-1',
        name: 'Test Captain',
        joined: true
      },
      gameState: {
        phase: 'setup',
        turn: 1,
        currentPlayer: 'player1'
      },
      isPublic: false,
      creator: {
        id: 'test-player-1',
        name: 'Test Captain'
      }
    });
    
    await testGame.save();
    console.log('✅ Test game created successfully!');
    
    // Clean up test game
    await Game.deleteOne({ id: testGame.id });
    console.log('✅ Test game removed successfully!');
    
    await database.disconnect();
    console.log('✅ Database setup complete!');
    
    console.log('\n🎉 SUCCESS! Your database is ready for Gorbagana Battleship!');
    console.log('\n📋 Next steps:');
    console.log('   1. Start the backend: npm run dev');
    console.log('   2. Check health: http://localhost:3002/health');
    console.log('   3. View analytics: http://localhost:3002/api/analytics');
    
  } catch (error) {
    console.error('\n❌ Database connection failed:', error.message);
    console.log('\n🔧 Troubleshooting:');
    
    if (error.message.includes('ECONNREFUSED')) {
      console.log('   • MongoDB is not running locally');
      console.log('   • Install MongoDB: https://www.mongodb.com/try/download/community');
      console.log('   • Or use MongoDB Atlas: https://cloud.mongodb.com/');
    } else if (error.message.includes('authentication failed')) {
      console.log('   • Check your username/password in MONGODB_URI');
      console.log('   • Verify database user permissions');
    } else if (error.message.includes('network timeout')) {
      console.log('   • Check your internet connection');
      console.log('   • Verify MongoDB Atlas IP whitelist');
    }
    
    console.log('\n📖 Database Setup Options:');
    console.log('   🌐 MongoDB Atlas (Cloud): https://cloud.mongodb.com/');
    console.log('   💻 Local MongoDB: https://www.mongodb.com/try/download/community');
    console.log('   🔧 Edit .env file to update MONGODB_URI');
    
    process.exit(1);
  }
}

testConnection(); 