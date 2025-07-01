const mongoose = require('mongoose');

// Game Mode Schema
const gameModeSchema = new mongoose.Schema({
  mode: {
    type: String,
    enum: ['quick', 'standard', 'extended'],
    default: 'standard'
  },
  boardSize: {
    type: Number,
    required: true,
    min: 6,
    max: 12
  },
  totalShipSquares: {
    type: Number,
    required: true
  }
});

// Player Schema
const playerSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true
  },
  name: {
    type: String,
    default: 'Anonymous Captain'
  },
  walletAddress: String,
  joined: {
    type: Boolean,
    default: false
  },
  ready: {
    type: Boolean,
    default: false
  },
  boardCommitment: String,
  ships: [{
    length: Number,
    positions: [Number],
    orientation: String,
    sunk: {
      type: Boolean,
      default: false
    }
  }],
  hits: {
    type: [Number],
    default: []
  },
  misses: {
    type: [Number], 
    default: []
  }
});

// Game State Schema
const gameStateSchema = new mongoose.Schema({
  phase: {
    type: String,
    enum: ['setup', 'placement', 'waiting', 'playing', 'reveal', 'finished'],
    default: 'setup'
  },
  turn: {
    type: Number,
    default: 1
  },
  currentPlayer: {
    type: String,
    enum: ['player1', 'player2'],
    default: 'player1'
  },
  winner: {
    type: String,
    enum: ['player1', 'player2', 'draw', null],
    default: null
  },
  pendingShot: {
    coordinates: [Number],
    by: String,
    timestamp: Date
  }
});

// Main Game Schema
const gameSchema = new mongoose.Schema({
  // Game Identification
  id: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  
  // Game Configuration
  gameMode: {
    type: gameModeSchema,
    required: true
  },
  
  // Players
  player1: playerSchema,
  player2: playerSchema,
  
  // Game State
  gameState: {
    type: gameStateSchema,
    required: true
  },
  
  // Game Settings
  isPublic: {
    type: Boolean,
    default: false
  },
  
  maxPlayers: {
    type: Number,
    default: 2,
    min: 2,
    max: 2
  },
  
  // Metadata
  creator: {
    id: String,
    name: String,
    walletAddress: String
  },
  
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  },
  
  updatedAt: {
    type: Date,
    default: Date.now
  },
  
  startedAt: Date,
  finishedAt: Date,
  
  // Game Statistics
  totalMoves: {
    type: Number,
    default: 0
  },
  
  duration: Number, // in milliseconds
  
  // Blockchain Integration
  onChainData: {
    gameAccount: String,
    programId: String,
    transactions: [{
      type: String,
      signature: String,
      timestamp: Date,
      player: String
    }]
  },
  
  // Wager and Escrow System
  wagerAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  
  escrowStatus: {
    type: String,
    enum: ['none', 'pending', 'locked', 'released', 'refunded'],
    default: 'none'
  },
  
  escrowData: {
    creatorDeposit: {
      type: Number,
      default: 0
    },
    opponentDeposit: {
      type: Number,
      default: 0
    },
    escrowAccount: String,
    transactionIds: [String],
    releaseTransaction: String,
    refundTransactions: [String]
  },
  
  // Game Timeout and Abandonment
  timeoutAt: {
    type: Date,
    default: null
  },
  
  abandonedBy: String,
  abandonReason: {
    type: String,
    enum: ['player_left', 'timeout', 'inactivity', 'mutual', 'system'],
    default: null
  },
  
  // Player Status
  playersDeposited: {
    player1: {
      type: Boolean,
      default: false
    },
    player2: {
      type: Boolean,
      default: false
    }
  },
  
  // Additional Features
  spectators: [{
    id: String,
    name: String,
    joinedAt: Date
  }],
  
  chatMessages: [{
    player: String,
    message: String,
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Game History for analysis
  moveHistory: [{
    player: String,
    action: String,
    coordinates: [Number],
    result: String,
    timestamp: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true,
  versionKey: false
});

// Indexes for performance
gameSchema.index({ id: 1 });
gameSchema.index({ isPublic: 1, 'gameState.phase': 1 });
gameSchema.index({ 'creator.id': 1 });
gameSchema.index({ createdAt: -1 });
gameSchema.index({ 'gameState.phase': 1, updatedAt: -1 });

// Virtual for game status
gameSchema.virtual('status').get(function() {
  const phase = this.gameState.phase;
  const player1 = this.player1;
  const player2 = this.player2;
  
  if (phase === 'finished') {
    return `Game finished - ${this.gameState.winner ? `${this.gameState.winner} wins` : 'Draw'}`;
  } else if (phase === 'playing') {
    return `Battle in progress - ${this.gameState.currentPlayer}'s turn`;
  } else if (phase === 'waiting') {
    return 'Waiting for opponent';
  } else if (phase === 'placement') {
    return 'Players placing ships';
  } else {
    return 'Setting up game';
  }
});

// Virtual for player count
gameSchema.virtual('playerCount').get(function() {
  let count = 0;
  if (this.player1 && this.player1.joined) count++;
  if (this.player2 && this.player2.joined) count++;
  return count;
});

// Instance methods
gameSchema.methods.addPlayer = function(playerData) {
  if (!this.player1 || !this.player1.joined) {
    this.player1 = { ...playerData, joined: true };
    return 'player1';
  } else if (!this.player2 || !this.player2.joined) {
    this.player2 = { ...playerData, joined: true };
    return 'player2';
  } else {
    throw new Error('Game is full');
  }
};

gameSchema.methods.removePlayer = function(playerId) {
  if (this.player1 && this.player1.id === playerId) {
    this.player1 = {};
  } else if (this.player2 && this.player2.id === playerId) {
    this.player2 = {};
  }
};

gameSchema.methods.getPlayer = function(playerId) {
  if (this.player1 && this.player1.id === playerId) {
    return { player: this.player1, role: 'player1' };
  } else if (this.player2 && this.player2.id === playerId) {
    return { player: this.player2, role: 'player2' };
  }
  return null;
};

gameSchema.methods.isPlayerTurn = function(playerId) {
  const playerData = this.getPlayer(playerId);
  if (!playerData) return false;
  
  return this.gameState.currentPlayer === playerData.role;
};

gameSchema.methods.addMove = function(player, action, coordinates, result) {
  this.moveHistory.push({
    player,
    action,
    coordinates,
    result,
    timestamp: new Date()
  });
  this.totalMoves++;
};

// Static methods
gameSchema.statics.findPublicGames = function() {
  return this.find({
    isPublic: true,
    'gameState.phase': { $in: ['waiting', 'playing'] }
  }).sort({ createdAt: -1 }).limit(20);
};

gameSchema.statics.findGameById = function(gameId) {
  return this.findOne({ id: gameId });
};

gameSchema.statics.findGamesByPlayer = function(playerId) {
  return this.find({
    $or: [
      { 'player1.id': playerId },
      { 'player2.id': playerId }
    ]
  }).sort({ updatedAt: -1 });
};

// Pre-save middleware
gameSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  
  // Set game duration if finished
  if (this.gameState.phase === 'finished' && this.startedAt && !this.finishedAt) {
    this.finishedAt = new Date();
    this.duration = this.finishedAt - this.startedAt;
  }
  
  next();
});

// Create and export the model
const Game = mongoose.model('Game', gameSchema);

module.exports = Game; 