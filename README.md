# ⚓ Battleship on Gorbagana

A fully on-chain Battleships game built on the Gorbagana testnet (Solana fork) using Anchor framework and React. This implementation features a commit-reveal scheme to ensure fair play while maintaining the secrecy of ship placements throughout the game.

## 🎮 Game Features

### 🎯 Multiple Game Modes
- **Quick Battle** ⚡: 6×6 board with 3 ships (3-5 min games)
- **Standard Battle** ⚓: Classic 10×10 board with full fleet (10-15 min)
- **Extended Battle** 🚢: Massive 12×12 board with large fleet (20-30 min)

### 🌐 Multiplayer Features
- **Cross-Device Game Sharing**: Share games via URLs or game IDs
- **Public Games Lobby**: Discover and join public matches
- **Real-Time Synchronization**: Seamless gameplay across devices
- **Backend Storage**: Cloud + local storage for game persistence

### 🔐 Blockchain Security
- **Fully On-Chain**: All game logic runs on the Gorbagana blockchain
- **Commit-Reveal Scheme**: Ship placements are hidden using cryptographic commitments
- **Fair Play Verification**: Post-game board revelation ensures no cheating occurred
- **Enhanced Wallet Integration**: Multiple RPC endpoints with automatic failover

### 💻 Technical Features
- **Responsive UI**: Adapts to different board sizes with dynamic cell scaling
- **Modern React Interface**: Beautiful game mode selection and enhanced UX
- **Express.js Backend**: RESTful API for multiplayer coordination
- **Real-time Polling**: Automatic game state updates

## 🏗️ Architecture

### Smart Contract (Anchor Program)
- **Game State Management**: Tracks player turns, ship hits, and game progression
- **Commit-Reveal Protocol**: Validates ship placement commitments and reveals
- **Turn Validation**: Ensures only valid moves are accepted
- **Win Detection**: Automatically determines game completion
- **Cheat Prevention**: Verifies revealed boards match committed hashes

### Frontend (Next.js + React)
- **Wallet Integration**: Enhanced Backpack wallet support with multiple RPC endpoints
- **Dynamic Ship Placement**: Interactive grids that adapt to different game modes
- **Game Mode Selection**: Beautiful UI for choosing battle types
- **Enhanced Battle Interface**: Responsive dual-board view with real-time updates
- **Cross-Device Sharing**: Web Share API integration with clipboard fallback

### Backend (Express.js)
- **Game Storage API**: RESTful endpoints for game CRUD operations
- **Public Lobby**: Discovery system for finding public games
- **Real-Time Sync**: Coordination between multiple devices
- **Analytics**: Game statistics and performance metrics

## 🔧 Technical Implementation

### Game Mode System
- **Configurable Board Sizes**: 6×6, 10×10, and 12×12 grids
- **Dynamic Fleet Configurations**: Optimized ship counts for each mode
- **Responsive Design**: Automatic UI scaling based on board size
- **Mode-Specific Logic**: Tailored gameplay for different battle types

### Enhanced Commit-Reveal Process
1. **Mode Selection**: Choose preferred game type and board size
2. **Commitment Phase**: Players hash their board layout + random salt
3. **Cross-Device Sync**: Game state synchronized across devices
4. **Game Phase**: Players take turns with real-time updates
5. **Reveal Phase**: Comprehensive board verification
6. **Results Sharing**: Easy sharing of game outcomes

### Security & Performance
- **Multiple RPC Endpoints**: Primary Gorbagana + backup endpoints
- **Automatic Failover**: Seamless switching between RPC providers
- **Enhanced Error Handling**: User-friendly error messages
- **Optimized Polling**: Reduced network calls with smart caching

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ and npm
- Rust and Cargo (for Anchor development)
- Solana CLI tools
- Backpack wallet browser extension

### Quick Start

1. **Clone and Setup**
   ```bash
   git clone https://github.com/grich88/gorbagana-battleships.git
   cd gorbagana-battleships
   npm install
   ```

2. **Install Frontend Dependencies**
   ```bash
   cd frontend
   npm install
   cd ..
   ```

3. **Start Development Servers**
   ```bash
   # Use the provided PowerShell script (recommended)
   .\start-dev.ps1
   
   # Or start manually:
   # Terminal 1: Backend
   node server.js
   
   # Terminal 2: Frontend
   cd frontend && npm run dev
   ```

4. **Access the Game**
   - Frontend: http://localhost:3000
   - Backend: http://localhost:3002
   - Health Check: http://localhost:3002/health

### Wallet Setup
1. Install Backpack wallet extension
2. Create/import wallet
3. The app automatically connects to Gorbagana testnet
4. Get test GOR tokens from the faucet if needed

## 🎯 How to Play

### Starting a Game
1. **Choose Game Mode**: Select Quick, Standard, or Extended battle
2. **Connect Wallet**: Click "Connect Wallet" and approve connection
3. **Place Ships**: Manual placement or auto-generate fleet
4. **Create/Join Game**: Start new game or join via game ID
5. **Share Game**: Use sharing features to invite opponents

### Game Modes Explained

#### ⚡ Quick Battle (3-5 minutes)
- **6×6 board**: Compact battlefield for fast games
- **3 ships**: 1 Cruiser (3 squares) + 2 Destroyers (2 squares each)
- **7 total targets**: Quick victory conditions
- **Perfect for**: Coffee breaks, quick matches

#### ⚓ Standard Battle (10-15 minutes)
- **10×10 board**: Classic Battleship experience
- **5 ships**: Full fleet with Carrier, Battleship, Cruisers, Destroyer
- **17 total targets**: Traditional gameplay
- **Perfect for**: Classic Battleship fans

#### 🚢 Extended Battle (20-30 minutes)
- **12×12 board**: Epic naval warfare
- **9 ships**: Massive fleet with Super Carrier and multiple ship types
- **28 total targets**: Long strategic battles
- **Perfect for**: Extended gaming sessions

### Gameplay
1. **Fire Shots**: Click opponent's board to attack
2. **Real-Time Updates**: See results immediately
3. **Cross-Device Play**: Continue games on any device
4. **Track Progress**: Monitor hits and ship status
5. **Win Condition**: Sink all enemy ships to victory

## 📁 Project Structure

```
gorbagana-battleships/
├── programs/battleship/         # Anchor smart contract
│   └── src/lib.rs              # Main game logic
├── frontend/                   # Next.js React app
│   ├── src/
│   │   ├── components/         # React components
│   │   │   ├── BattleshipGame.tsx  # Main game component
│   │   │   ├── GameBoard.tsx       # Dynamic board component
│   │   │   └── WalletProvider.tsx  # Enhanced wallet integration
│   │   ├── lib/               # Utility functions
│   │   │   ├── battleshipUtils.ts  # Game logic with modes
│   │   │   ├── gameStorage.ts      # Cross-device storage
│   │   │   └── config.ts          # Configuration management
│   │   └── app/               # Next.js app structure
├── backend/                   # Express.js backend (optional)
│   ├── server.js             # API server
│   └── package.json          # Backend dependencies
├── tests/                    # Test suite
├── ENHANCED_FEATURES.md      # Detailed feature documentation
├── FIXES_APPLIED.md         # Development fixes log
├── start-dev.ps1           # Development startup script
└── README.md               # This file
```

## 🧪 Testing

### Smart Contract Tests
```bash
anchor test
```

### Frontend Testing
```bash
cd frontend
npm run dev
# Test different game modes and features
```

### Backend Testing
```bash
# Test API endpoints
curl http://localhost:3002/health
curl http://localhost:3002/api/games/public
```

## 🔧 Configuration

### Network Settings
- **Primary RPC**: `https://rpc.gorbagana.wtf/`
- **Secondary RPC**: `https://gorchain.wstf.io`
- **Fallback RPC**: Solana devnet
- **Auto-Failover**: Enabled

### Game Mode Configurations
```javascript
// Quick Battle
boardSize: 6, ships: 3, targets: 7

// Standard Battle  
boardSize: 10, ships: 5, targets: 17

// Extended Battle
boardSize: 12, ships: 9, targets: 28
```

## 🚀 Deployment

### Local Development
```bash
./start-dev.ps1  # Start both frontend and backend
```

### Production Deployment
```bash
# Build frontend
cd frontend && npm run build

# Deploy backend
node server.js

# Optional: Deploy smart contract
anchor build && anchor deploy
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Solana Foundation** for the blockchain infrastructure
- **Anchor Framework** for smart contract development tools
- **Gorbagana Team** for the high-performance testnet
- **Backpack Wallet** for seamless Gorbagana integration

## 📞 Support

For questions, issues, or contributions:
- Open a GitHub issue
- Join the Solana Discord community
- Check [Gorbagana documentation](https://github.com/grich88/gorbagana-battleships)

---

**Ready to command your fleet? Choose your battle mode and engage in truly decentralized naval warfare! ⚓**
