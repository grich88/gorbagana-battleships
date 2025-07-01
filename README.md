# ⚓ Battleship on Gorbagana

A fully on-chain Battleships game built on the Gorbagana testnet (Solana fork) using Anchor framework and React. This implementation features a commit-reveal scheme to ensure fair play while maintaining the secrecy of ship placements throughout the game.

## 🎮 Game Features

- **Fully On-Chain**: All game logic runs on the Gorbagana blockchain
- **Commit-Reveal Scheme**: Ship placements are hidden using cryptographic commitments
- **Fair Play Verification**: Post-game board revelation ensures no cheating occurred
- **Real-time Gameplay**: Turn-based mechanics with immediate blockchain confirmation
- **Standard Fleet**: Classic Battleship rules with 5 ships (Carrier, Battleship, 2 Cruisers, Destroyer)
- **Responsive UI**: Modern React interface with ship placement and firing mechanics

## 🏗️ Architecture

### Smart Contract (Anchor Program)
- **Game State Management**: Tracks player turns, ship hits, and game progression
- **Commit-Reveal Protocol**: Validates ship placement commitments and reveals
- **Turn Validation**: Ensures only valid moves are accepted
- **Win Detection**: Automatically determines game completion (17 hits = victory)
- **Cheat Prevention**: Verifies revealed boards match committed hashes

### Frontend (Next.js + React)
- **Wallet Integration**: Backpack wallet support for Gorbagana network
- **Ship Placement**: Interactive grid for manual or random fleet arrangement
- **Game Lobby**: Create or join games using public keys
- **Battle Interface**: Dual-board view (your fleet vs enemy waters)
- **State Management**: Real-time game state updates via blockchain polling

## 🔧 Technical Implementation

### Commit-Reveal Process
1. **Commitment Phase**: Players hash their board layout + random salt
2. **Game Phase**: Players take turns firing shots and revealing hit/miss results
3. **Reveal Phase**: After game end, both players reveal boards + salts for verification
4. **Verification**: Smart contract confirms all moves match revealed boards

### Security Features
- **Hash Verification**: SHA-256 ensures commitment integrity
- **Fleet Validation**: Enforces standard Battleship ship counts and placement
- **Move Validation**: Prevents duplicate shots and out-of-turn actions
- **Consistency Checking**: Cross-references all shots against revealed boards

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ and npm
- Rust and Cargo (for Anchor development)
- Solana CLI tools
- Backpack wallet browser extension

### Installation

1. **Clone and Setup**
   ```bash
   git clone <repository-url>
   cd gorbagana-battleship
   npm install
   ```

2. **Build the Program**
   ```bash
   anchor build
   ```

3. **Run Tests** (Optional)
   ```bash
   anchor test
   ```

4. **Deploy to Gorbagana**
   ```bash
   # Configure Solana CLI for Gorbagana
   solana config set --url https://gorchain.wstf.io
   
   # Get test tokens from faucet
   # Visit: https://gorbaganachain.xyz/faucet
   
   # Deploy the program
   anchor deploy
   ```

5. **Start Frontend**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

### Wallet Setup
1. Install Backpack wallet extension
2. Create/import wallet
3. Switch to Gorbagana testnet (`https://gorchain.wstf.io`)
4. Get test GOR tokens from the faucet

## 🎯 How to Play

### Starting a Game
1. **Connect Wallet**: Click "Connect Wallet" and approve connection
2. **Place Ships**: Either manually place 5 ships or generate random fleet
3. **Create Game**: Click "Create New Game" to initialize on-chain
4. **Share Game ID**: Send the generated game ID to your opponent
5. **Wait for Opponent**: Game starts when second player joins

### Gameplay
1. **Take Turns**: Click opponent's board to fire shots
2. **Confirm Results**: Defender confirms if shot was hit or miss
3. **Track Progress**: Monitor hit counts and ship status
4. **Win Condition**: First to sink all enemy ships (17 hits) wins

### End Game
1. **Reveal Boards**: Both players reveal their ship layouts
2. **Verification**: Smart contract validates all moves were honest
3. **Final Results**: Game officially concludes with verified winner

## 📁 Project Structure

```
gorbagana-battleship/
├── programs/battleship/     # Anchor smart contract
│   └── src/lib.rs          # Main game logic
├── tests/                  # Anchor test suite
│   └── battleship.ts       # Comprehensive tests
├── frontend/               # Next.js React app
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── lib/           # Utility functions
│   │   └── app/           # Next.js pages
│   └── package.json
├── Anchor.toml            # Anchor configuration
├── Cargo.toml            # Rust workspace
└── package.json          # Root package file
```

## 🧪 Testing

### Smart Contract Tests
```bash
# Run full test suite
anchor test

# Test specific scenarios
anchor test --grep "commit-reveal"
```

### Frontend Testing
```bash
cd frontend
npm test
```

## 🔧 Configuration

### Network Settings
- **RPC Endpoint**: `https://gorchain.wstf.io`
- **Program ID**: `DRJk4gJFdYCCHNYY5qFZfrM9ysNrMz3kXJN5JVZdz8Jm`
- **Wallet**: Backpack (Gorbagana network)

### Game Constants
- **Board Size**: 10x10 grid
- **Ship Count**: 5 ships (lengths: 5, 4, 3, 3, 2)
- **Total Ship Squares**: 17
- **Win Condition**: Sink all enemy ships

## 🛠️ Development

### Smart Contract Development
```bash
# Build program
anchor build

# Deploy to devnet
anchor deploy --provider.cluster devnet

# Run tests
anchor test
```

### Frontend Development
```bash
cd frontend
npm run dev     # Development server
npm run build   # Production build
npm run lint    # Code linting
```

## 🔍 Game Flow Diagram

```
1. Setup Phase
   ├── Player places ships
   ├── Generates commitment (hash of board + salt)
   └── Creates/joins game with commitment

2. Gameplay Phase
   ├── Player fires shot → fireShot(x, y)
   ├── Opponent reveals result → revealShotResult(hit/miss)
   ├── Game state updates
   └── Repeat until 17 hits achieved

3. Reveal Phase
   ├── Both players call revealBoard()
   ├── Smart contract verifies commitments
   ├── Cross-checks all moves against boards
   └── Confirms fair play and final winner
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
- Check Gorbagana documentation

---

**Ready to command your fleet? Deploy your Battleships on Gorbagana and engage in truly decentralized naval warfare! ⚓** 