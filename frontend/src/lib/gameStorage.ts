// Cross-Device Battleship Game Storage with Backend API Support
// Falls back to localStorage when backend is unavailable

import { PublicKey } from '@solana/web3.js';

// Battleship game types
export interface BattleshipGame {
  id: string;
  player1: string;
  player2?: string;
  player1Board: number[];
  player2Board?: number[];
  player1Salt: Uint8Array;
  player2Salt?: Uint8Array;
  player1Commitment: number[];
  player2Commitment?: number[];
  turn: number;
  boardHits1: number[];
  boardHits2: number[];
  status: 'waiting' | 'playing' | 'reveal' | 'finished' | 'abandoned';
  winner?: number;
  createdAt: number;
  updatedAt: number;
  isPublic: boolean;
  creatorName?: string;
  wager?: number;
  escrowAccount?: string;
  txSignature?: string;
  phase: 'setup' | 'placement' | 'waiting' | 'playing' | 'reveal' | 'finished';
}

// Backend API configuration
const getApiBaseUrl = () => {
  if (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  
  if (typeof window !== 'undefined') {
    return window.location.hostname !== 'localhost'
      ? 'https://gorbagana-battleship-backend.onrender.com' // Update when you deploy backend
      : 'http://localhost:3002';
  }
  
  return 'http://localhost:3002';
};

const API_BASE_URL = getApiBaseUrl();

class BattleshipGameStorage {
  private readonly STORAGE_PREFIX = 'gorbagana_battleship_'
  private readonly SHARED_PREFIX = 'shared_battleship_games'
  private readonly CONNECTION_STATUS_KEY = 'backend_status'

  private isBackendAvailable = false
  private initializationPromise: Promise<boolean> | null = null
  private hasInitialized = false

  constructor() {
    // Only initialize in browser environment
  }

  // Wait for initialization if needed (browser only)
  private async waitForInitialization(): Promise<void> {
    if (typeof window === 'undefined') {
      console.log('🗃️ Build environment detected - skipping backend connection')
      return
    }

    if (!this.hasInitialized && !this.initializationPromise) {
      this.initializationPromise = this.checkBackendConnection()
    }

    if (this.initializationPromise) {
      await this.initializationPromise
      this.initializationPromise = null
      this.hasInitialized = true
    }
  }

  // Check if backend is available
  private async checkBackendConnection(): Promise<boolean> {
    if (typeof window === 'undefined') {
      console.log('🗃️ Server-side detected - skipping backend connection check')
      return false
    }

    try {
      console.log('🔌 Testing backend connection:', API_BASE_URL)
      
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 5000)
      
      const response = await fetch(`${API_BASE_URL}/health`, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
        },
      })
      
      clearTimeout(timeoutId)
      
      if (response.ok) {
        this.isBackendAvailable = true
        console.log('✅ Backend connection successful')
        this.saveConnectionStatus({ available: true, url: API_BASE_URL })
        return true
      } else {
        throw new Error(`HTTP ${response.status}`)
      }
    } catch (error: any) {
      console.log('❌ Backend connection failed:', error.message)
      this.isBackendAvailable = false
      this.saveConnectionStatus({ available: false, error: error.message })
      return false
    }
  }

  // Test backend connection
  async testConnection(): Promise<void> {
    await this.checkBackendConnection()
  }

  // Get connection status
  getConnectionStatus(): { available: boolean; url?: string; error?: string } {
    if (typeof window === 'undefined') {
      return { available: false }
    }

    try {
      const status = localStorage.getItem(this.CONNECTION_STATUS_KEY)
      return status ? JSON.parse(status) : { available: false }
    } catch {
      return { available: false }
    }
  }

  // Save connection status
  private saveConnectionStatus(status: { available: boolean; url?: string; error?: string }): void {
    if (typeof window === 'undefined') return

    try {
      localStorage.setItem(this.CONNECTION_STATUS_KEY, JSON.stringify(status))
    } catch (error) {
      console.error('Failed to save connection status:', error)
    }
  }

  // Save game to backend or localStorage
  async saveGame(game: BattleshipGame): Promise<boolean> {
    await this.waitForInitialization()

    console.log('💾 Saving battleship game:', game.id.slice(0, 8))

    if (this.isBackendAvailable) {
      try {
        const success = await this.saveToBackend(game)
        if (success) {
          console.log('✅ Game saved to backend successfully')
          return true
        }
      } catch (error) {
        console.error('❌ Backend save failed, falling back to localStorage:', error)
        this.isBackendAvailable = false
      }
    }

    // Fallback to localStorage
    return this.saveToLocalStorage(game)
  }

  // Save to backend API with proper MongoDB format
  private async saveToBackend(game: BattleshipGame): Promise<boolean> {
    try {
      // Convert game data to MongoDB-compatible format
      const gameForBackend = {
        id: game.id,
        gameMode: {
          mode: 'standard',
          boardSize: 10,
          totalShipSquares: 17
        },
        player1: {
          id: game.player1,
          name: game.creatorName || 'Anonymous Captain',
          walletAddress: game.player1,
          joined: true,
          ready: true
        },
        player2: game.player2 ? {
          id: game.player2,
          name: 'Anonymous Captain',
          walletAddress: game.player2,
          joined: true,
          ready: false
        } : undefined,
        gameState: {
          phase: game.phase || 'setup',
          turn: game.turn || 1,
          currentPlayer: 'player1',
          winner: game.winner ? `player${game.winner}` : null
        },
        isPublic: game.isPublic || false,
        creator: {
          id: game.player1,
          name: game.creatorName || 'Anonymous Captain',
          walletAddress: game.player1
        },
        wagerAmount: game.wager || 0,
        escrowStatus: 'none',
        player1Salt: Array.from(game.player1Salt),
        player2Salt: game.player2Salt ? Array.from(game.player2Salt) : undefined,
        player1Board: game.player1Board,
        player2Board: game.player2Board,
        player1Commitment: game.player1Commitment,
        player2Commitment: game.player2Commitment,
        boardHits1: game.boardHits1,
        boardHits2: game.boardHits2,
        status: game.status,
        createdAt: new Date(game.createdAt),
        updatedAt: new Date()
      }

      const response = await fetch(`${API_BASE_URL}/api/games`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(gameForBackend),
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      return true
    } catch (error) {
      console.error('Backend save error:', error)
      throw error
    }
  }

  // Save to localStorage
  private saveToLocalStorage(game: BattleshipGame): boolean {
    if (typeof window === 'undefined') return false

    try {
      // Convert Uint8Array to regular arrays for storage
      const gameForStorage = {
        ...game,
        player1Salt: Array.from(game.player1Salt),
        player2Salt: game.player2Salt ? Array.from(game.player2Salt) : undefined,
      }

      localStorage.setItem(
        this.STORAGE_PREFIX + game.id,
        JSON.stringify(gameForStorage)
      )

      // Update shared games list for cross-device access
      this.updateSharedGamesList(game)

      console.log('📱 Game saved to localStorage')
      return true
    } catch (error) {
      console.error('localStorage save error:', error)
      return false
    }
  }

  // Update shared games list
  private updateSharedGamesList(game: BattleshipGame): void {
    if (typeof window === 'undefined') return

    try {
      const existingGames = this.getSharedGamesList()
      const gameIndex = existingGames.findIndex(g => g.id === game.id)

      const gameInfo = {
        id: game.id,
        player1: game.player1,
        player2: game.player2,
        status: game.status,
        createdAt: game.createdAt,
        updatedAt: game.updatedAt,
        isPublic: game.isPublic,
        creatorName: game.creatorName,
      }

      if (gameIndex >= 0) {
        existingGames[gameIndex] = gameInfo
      } else {
        existingGames.push(gameInfo)
      }

      localStorage.setItem(this.SHARED_PREFIX, JSON.stringify(existingGames))
    } catch (error) {
      console.error('Error updating shared games list:', error)
    }
  }

  // Get game by ID
  async getGame(gameId: string): Promise<BattleshipGame | null> {
    await this.waitForInitialization()

    console.log('📖 Loading battleship game:', gameId.slice(0, 8))

    if (this.isBackendAvailable) {
      try {
        const game = await this.getFromBackend(gameId)
        if (game) {
          console.log('✅ Game loaded from backend')
          return game
        }
      } catch (error) {
        console.error('❌ Backend load failed, trying localStorage:', error)
      }
    }

    // Fallback to localStorage
    return this.getFromLocalStorage(gameId)
  }

  // Alias for getGame to match interface expected by frontend
  async loadGame(gameId: string): Promise<BattleshipGame | null> {
    return this.getGame(gameId)
  }

  // Get from backend API
  private async getFromBackend(gameId: string): Promise<BattleshipGame | null> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/games/${gameId}`)

      if (response.status === 404) {
        return null
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const game = await response.json()
      
      // Convert arrays back to Uint8Array
      return {
        ...game,
        player1Salt: new Uint8Array(game.player1Salt),
        player2Salt: game.player2Salt ? new Uint8Array(game.player2Salt) : undefined,
      }
    } catch (error) {
      console.error('Backend load error:', error)
      throw error
    }
  }

  // Get from localStorage
  private getFromLocalStorage(gameId: string): BattleshipGame | null {
    if (typeof window === 'undefined') return null

    try {
      const gameData = localStorage.getItem(this.STORAGE_PREFIX + gameId)
      if (!gameData) return null

      const game = JSON.parse(gameData)
      
      // Convert arrays back to Uint8Array
      return {
        ...game,
        player1Salt: new Uint8Array(game.player1Salt),
        player2Salt: game.player2Salt ? new Uint8Array(game.player2Salt) : undefined,
      }
    } catch (error) {
      console.error('localStorage load error:', error)
      return null
    }
  }

  // Get shared games list
  private getSharedGamesList(): any[] {
    if (typeof window === 'undefined') return []

    try {
      const games = localStorage.getItem(this.SHARED_PREFIX)
      return games ? JSON.parse(games) : []
    } catch {
      return []
    }
  }

  // Get public games
  async getPublicGames(): Promise<any[]> {
    await this.waitForInitialization()

    if (this.isBackendAvailable) {
      try {
        const response = await fetch(`${API_BASE_URL}/api/games/public`)
        if (response.ok) {
          return await response.json()
        }
      } catch (error) {
        console.error('Failed to fetch public games from backend:', error)
      }
    }

    // Fallback to localStorage
    return this.getSharedGamesList().filter(game => game.isPublic)
  }

  // Delete game
  async deleteGame(gameId: string): Promise<boolean> {
    await this.waitForInitialization()

    let success = false

    if (this.isBackendAvailable) {
      try {
        const response = await fetch(`${API_BASE_URL}/api/games/${gameId}`, {
          method: 'DELETE',
        })
        success = response.ok
      } catch (error) {
        console.error('Backend delete failed:', error)
      }
    }

    // Always try localStorage cleanup
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem(this.STORAGE_PREFIX + gameId)
        
        // Remove from shared games list
        const sharedGames = this.getSharedGamesList()
        const filteredGames = sharedGames.filter(game => game.id !== gameId)
        localStorage.setItem(this.SHARED_PREFIX, JSON.stringify(filteredGames))
        
        success = true
      } catch (error) {
        console.error('localStorage delete failed:', error)
      }
    }

    return success
  }

  // Clean up old games
  cleanupOldGames(): void {
    if (typeof window === 'undefined') return

    try {
      const oneWeekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000)
      const sharedGames = this.getSharedGamesList()
      const recentGames = sharedGames.filter(game => game.createdAt > oneWeekAgo)
      
      localStorage.setItem(this.SHARED_PREFIX, JSON.stringify(recentGames))
      
      // Clean up individual game data
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith(this.STORAGE_PREFIX)) {
          try {
            const gameData = JSON.parse(localStorage.getItem(key) || '{}')
            if (gameData.createdAt && gameData.createdAt < oneWeekAgo) {
              localStorage.removeItem(key)
            }
          } catch {
            // Remove corrupted data
            localStorage.removeItem(key)
          }
        }
      })
      
      console.log('🧹 Cleaned up old battleship games')
    } catch (error) {
      console.error('Cleanup error:', error)
    }
  }
}

// Export singleton instance
export const battleshipGameStorage = new BattleshipGameStorage()

// Utility functions for converting between storage format and game state
export function convertToBattleshipGame(gameState: any, gameId: string, player1: string): BattleshipGame {
  return {
    id: gameId,
    player1: player1,
    player2: gameState.player2 || undefined,
    player1Board: gameState.player1Board || new Array(100).fill(0),
    player2Board: gameState.player2Board || undefined,
    player1Salt: gameState.player1Salt || new Uint8Array(32),
    player2Salt: gameState.player2Salt || undefined,
    player1Commitment: gameState.player1Commitment || [],
    player2Commitment: gameState.player2Commitment || [],
    turn: gameState.turn || 1,
    boardHits1: gameState.boardHits1 || new Array(100).fill(0),
    boardHits2: gameState.boardHits2 || new Array(100).fill(0),
    status: gameState.status || 'waiting',
    winner: gameState.winner,
    createdAt: gameState.createdAt || Date.now(),
    updatedAt: Date.now(),
    isPublic: gameState.isPublic || false,
    creatorName: gameState.creatorName,
    wager: gameState.wager,
    escrowAccount: gameState.escrowAccount,
    txSignature: gameState.txSignature,
    phase: gameState.phase || 'setup',
  }
}

export function convertFromBattleshipGame(battleshipGame: BattleshipGame): any {
  return {
    player2: battleshipGame.player2,
    player1Board: battleshipGame.player1Board,
    player2Board: battleshipGame.player2Board,
    player1Salt: battleshipGame.player1Salt,
    player2Salt: battleshipGame.player2Salt,
    player1Commitment: battleshipGame.player1Commitment,
    player2Commitment: battleshipGame.player2Commitment,
    turn: battleshipGame.turn,
    boardHits1: battleshipGame.boardHits1,
    boardHits2: battleshipGame.boardHits2,
    status: battleshipGame.status,
    winner: battleshipGame.winner,
    createdAt: battleshipGame.createdAt,
    updatedAt: battleshipGame.updatedAt,
    isPublic: battleshipGame.isPublic,
    creatorName: battleshipGame.creatorName,
    wager: battleshipGame.wager,
    escrowAccount: battleshipGame.escrowAccount,
    txSignature: battleshipGame.txSignature,
    phase: battleshipGame.phase,
  }
} 