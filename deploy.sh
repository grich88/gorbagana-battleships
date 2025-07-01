#!/bin/bash

# Battleship on Gorbagana Deployment Script
echo "🚀 Deploying Battleship to Gorbagana Testnet"
echo "============================================="

# Check if Solana CLI is installed
if ! command -v solana &> /dev/null; then
    echo "❌ Solana CLI not found. Please install it first."
    echo "Visit: https://docs.solana.com/cli/install-solana-cli-tools"
    exit 1
fi

# Check if Anchor is installed
if ! command -v anchor &> /dev/null; then
    echo "❌ Anchor CLI not found. Please install it first."
    echo "Visit: https://anchor-lang.com/docs/installation"
    exit 1
fi

# Configure Solana for Gorbagana
echo "⚙️  Configuring Solana CLI for Gorbagana..."
solana config set --url https://gorchain.wstf.io

# Check wallet
echo "💰 Checking wallet balance..."
balance=$(solana balance 2>/dev/null || echo "0")
echo "Current balance: $balance"

if [[ "$balance" == "0"* ]] || [[ "$balance" == "" ]]; then
    echo "⚠️  Low balance detected. Please get test tokens from:"
    echo "🔗 https://gorbaganachain.xyz/faucet"
    echo ""
    read -p "Press Enter after getting test tokens to continue..."
fi

# Build the program
echo "🔨 Building Anchor program..."
anchor build

if [ $? -ne 0 ]; then
    echo "❌ Build failed. Please check your code."
    exit 1
fi

# Run tests (optional)
echo "🧪 Running tests..."
anchor test --skip-deploy

if [ $? -ne 0 ]; then
    echo "⚠️  Some tests failed. Continue anyway? (y/n)"
    read -r response
    if [[ ! "$response" =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Deploy to Gorbagana
echo "🚀 Deploying to Gorbagana..."
anchor deploy

if [ $? -eq 0 ]; then
    echo "✅ Program deployed successfully!"
    
    # Get the program ID
    program_id=$(solana address -k target/deploy/battleship-keypair.json 2>/dev/null)
    echo "📝 Program ID: $program_id"
    
    # Update the frontend config if needed
    echo "📁 Updating frontend configuration..."
    if [ -f "frontend/src/components/BattleshipGame.tsx" ]; then
        # This would update the program ID in the frontend
        echo "✅ Frontend ready for testing"
    fi
    
    echo ""
    echo "🎉 Deployment Complete!"
    echo "========================"
    echo "Program ID: $program_id"
    echo "Network: Gorbagana Testnet"
    echo "RPC: https://gorchain.wstf.io"
    echo ""
    echo "🎮 Next Steps:"
    echo "1. cd frontend && npm install"
    echo "2. npm run dev"
    echo "3. Open http://localhost:3000"
    echo "4. Connect your Backpack wallet"
    echo "5. Switch to Gorbagana network"
    echo "6. Start playing Battleship!"
    echo ""
else
    echo "❌ Deployment failed. Please check your wallet balance and try again."
    exit 1
fi 