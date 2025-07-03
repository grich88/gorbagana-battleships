const mongoose = require('mongoose');

// Player Schema for embedded player data
const PlayerSchema = new mongoose.Schema({
  publicKey: {
    type: String,
    required: true
  },
  board: {
    type: [[String]], // 2D array of cell states
    required: true
  },
  trash: {
    type: [[[Number]]], // Array of trash items, each containing coordinates
    required: true
  },
  deposit: {
    type: String, // Transaction signature
    default: null
  }
}, { _id: false });

// Game Schema
const GameSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  playerA: PlayerSchema,
  playerB: {
    type: PlayerSchema,
    default: null
  },
  currentTurn: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['waiting', 'playing', 'finished'],
    default: 'waiting',
    index: true
  },
  winner: {
    type: String,
    default: null
  },
  wager: {
    type: Number,
    required: true,
    min: 0
  },
  isPublic: {
    type: Boolean,
    default: false,
    index: true
  },
  gameMode: {
    type: String,
    enum: ['quick', 'standard', 'extended'],
    default: 'standard',
    index: true
  },
  escrowAccount: {
    type: String,
    required: true
  },
  txSignature: {
    type: String,
    required: true
  },
  abandonReason: {
    type: String,
    default: null
  },
  payoutProcessed: {
    type: Boolean,
    default: false
  },
  payoutTxSignature: {
    type: String,
    default: null
  }
}, {
  timestamps: true, // Automatically adds createdAt and updatedAt
  collection: 'games'
});

// Indexes for better query performance
GameSchema.index({ status: 1, isPublic: 1 }); // For public game listings
GameSchema.index({ 'playerA.publicKey': 1 }); // For player game lookups
GameSchema.index({ 'playerB.publicKey': 1 }); // For player game lookups
GameSchema.index({ createdAt: -1 }); // For recent games

// Instance methods
GameSchema.methods.isPlayerInGame = function(publicKey) {
  return this.playerA.publicKey === publicKey || 
         (this.playerB && this.playerB.publicKey === publicKey);
};

GameSchema.methods.getOpponentKey = function(publicKey) {
  if (this.playerA.publicKey === publicKey) {
    return this.playerB ? this.playerB.publicKey : null;
  }
  if (this.playerB && this.playerB.publicKey === publicKey) {
    return this.playerA.publicKey;
  }
  return null;
};

GameSchema.methods.getPlayerData = function(publicKey) {
  if (this.playerA.publicKey === publicKey) {
    return this.playerA;
  }
  if (this.playerB && this.playerB.publicKey === publicKey) {
    return this.playerB;
  }
  return null;
};

GameSchema.methods.getOpponentData = function(publicKey) {
  if (this.playerA.publicKey === publicKey) {
    return this.playerB;
  }
  if (this.playerB && this.playerB.publicKey === publicKey) {
    return this.playerA;
  }
  return null;
};

// Static methods for common queries
GameSchema.statics.findPublicGames = function() {
  return this.find({ 
    status: 'waiting', 
    isPublic: true 
  }).sort({ createdAt: -1 });
};

GameSchema.statics.findPlayerGames = function(publicKey) {
  return this.find({
    $or: [
      { 'playerA.publicKey': publicKey },
      { 'playerB.publicKey': publicKey }
    ]
  }).sort({ updatedAt: -1 });
};

GameSchema.statics.findActiveGames = function() {
  return this.find({ status: 'playing' });
};

// Pre-save middleware
GameSchema.pre('save', function(next) {
  // Update the updatedAt field manually if needed
  this.updatedAt = new Date();
  next();
});

// Export the model
const Game = mongoose.model('Game', GameSchema);

module.exports = Game; 