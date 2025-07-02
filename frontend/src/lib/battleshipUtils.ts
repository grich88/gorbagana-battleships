import { createHash } from 'crypto';

// Game Mode Configuration
export type GameMode = 'quick' | 'standard' | 'extended';

export interface GameModeConfig {
  boardSize: number;
  fleet: Array<{ length: number; count: number; name: string }>;
  totalShipSquares: number;
  name: string;
  description: string;
  estimatedTime: string;
}

// Game mode configurations - Trash Collection Theme
export const GAME_MODES: Record<GameMode, GameModeConfig> = {
  quick: {
    boardSize: 6,
    fleet: [
      { length: 3, count: 1, name: 'Garbage Truck' },
      { length: 2, count: 2, name: 'Pickup Van' },
    ],
    totalShipSquares: 7, // 3 + 2 + 2 = 7
    name: 'Quick Collection',
    description: '6x6 grid with 3 small waste haulers',
    estimatedTime: '3-5 minutes'
  },
  standard: {
    boardSize: 10,
    fleet: [
      { length: 5, count: 1, name: 'Super Hauler' },
      { length: 4, count: 1, name: 'Dumpster Truck' },
      { length: 3, count: 2, name: 'Garbage Truck' },
      { length: 2, count: 1, name: 'Pickup Van' }
    ],
    totalShipSquares: 17, // 5 + 4 + 3 + 3 + 2 = 17
    name: 'Standard Collection',
    description: '10x10 grid with classic waste fleet',
    estimatedTime: '10-15 minutes'
  },
  extended: {
    boardSize: 12,
    fleet: [
      { length: 6, count: 1, name: 'Mega Compactor' },
      { length: 5, count: 1, name: 'Super Hauler' },
      { length: 4, count: 2, name: 'Dumpster Truck' },
      { length: 3, count: 2, name: 'Garbage Truck' },
      { length: 2, count: 2, name: 'Pickup Van' }
    ],
    totalShipSquares: 28, // 6 + 5 + 4 + 4 + 3 + 3 + 2 + 2 = 28
    name: 'Extended Collection',
    description: '12x12 grid with massive waste fleet',
    estimatedTime: '20-30 minutes'
  }
};

// Current game mode (can be changed dynamically)
let currentGameMode: GameMode = 'standard';

// Getters for current game configuration
export function getCurrentGameMode(): GameMode {
  return currentGameMode;
}

export function setGameMode(mode: GameMode): void {
  currentGameMode = mode;
}

export function getCurrentConfig(): GameModeConfig {
  return GAME_MODES[currentGameMode];
}

// Game state management
export interface GameState {
  id: string;
  player1: string;
  player2?: string;
  status: 'waiting' | 'playing' | 'finished';
  turn: number;
  board1: number[];
  board2: number[];
  hits1: number[];
  hits2: number[];
  commitment1?: string;
  commitment2?: string;
  reveal1?: { board: number[]; salt: string };
  reveal2?: { board: number[]; salt: string };
  winner?: number;
  createdAt: number;
  updatedAt: number;
  gameMode: GameMode;
  wagerAmount: number;
  isPublic?: boolean;
}

// Ship placement types
export interface ShipPlacement {
  id: string;
  name: string;
  length: number;
  x?: number;
  y?: number;
  orientation?: 'horizontal' | 'vertical';
  placed: boolean;
}

// Standard fleet configurations for different game modes
export const STANDARD_FLEET = GAME_MODES.standard.fleet;
export const TOTAL_SHIP_SQUARES = GAME_MODES.standard.totalShipSquares;

// Helper functions for dynamic game mode support
export function getBoardSize(mode?: GameMode): number {
  const gameMode = mode || currentGameMode;
  return GAME_MODES[gameMode].boardSize;
}

export function getFleet(mode?: GameMode): Array<{ length: number; count: number; name: string }> {
  const gameMode = mode || currentGameMode;
  return GAME_MODES[gameMode].fleet;
}

export function getTotalShipSquares(mode?: GameMode): number {
  const gameMode = mode || currentGameMode;
  return GAME_MODES[gameMode].totalShipSquares;
}

export function createEmptyBoard(mode?: GameMode): number[] {
  const size = getBoardSize(mode);
  return new Array(size * size).fill(0);
}

export function getShipsToPlace(mode?: GameMode): ShipPlacement[] {
  const fleet = getFleet(mode);
  const ships: ShipPlacement[] = [];
  let shipId = 0;

  fleet.forEach((shipType, typeIndex) => {
    for (let i = 0; i < shipType.count; i++) {
      ships.push({
        id: `${typeIndex}-${i}`,
        name: shipType.name + (shipType.count > 1 ? ` #${i + 1}` : ''),
        length: shipType.length,
        placed: false
      });
      shipId++;
    }
  });

  return ships;
}

// Validation for current fleet configuration
export function validateCurrentFleet(board: number[], mode?: GameMode): boolean {
  const ships = getShipsToPlace(mode);
  const requiredSquares = getTotalShipSquares(mode);
  const placedSquares = board.filter(cell => cell === 1).length;
  
  return placedSquares === requiredSquares;
}

// Random fleet generation for any game mode
export function generateRandomFleet(mode?: GameMode): number[] {
  const boardSize = getBoardSize(mode);
  const fleet = getFleet(mode);
  const board = createEmptyBoard(mode);
  
  // Try to place all ships randomly
  const maxAttempts = 1000;
  let attempts = 0;
  
  for (const shipType of fleet) {
    for (let i = 0; i < shipType.count; i++) {
      let placed = false;
      let shipAttempts = 0;
      
      while (!placed && shipAttempts < maxAttempts) {
        const orientation = Math.random() < 0.5 ? 'horizontal' : 'vertical';
        const maxX = orientation === 'horizontal' ? boardSize - shipType.length : boardSize - 1;
        const maxY = orientation === 'vertical' ? boardSize - shipType.length : boardSize - 1;
        
        const x = Math.floor(Math.random() * (maxX + 1));
        const y = Math.floor(Math.random() * (maxY + 1));
        
        if (isValidShipPlacement(board, x, y, shipType.length, orientation, boardSize)) {
          placeShip(board, x, y, shipType.length, orientation, boardSize);
          placed = true;
        }
        
        shipAttempts++;
      }
      
      if (!placed) {
        console.warn(`Failed to place ${shipType.name} after ${maxAttempts} attempts`);
        // Reset and try again
        return generateRandomFleet(mode);
      }
    }
  }
  
  return board;
}

// Ship placement validation
export function isValidShipPlacement(
  board: number[],
  x: number,
  y: number,
  length: number,
  orientation: 'horizontal' | 'vertical',
  boardSize?: number
): boolean {
  const size = boardSize || getBoardSize();
  
  // Check bounds
  if (orientation === 'horizontal') {
    if (x + length > size || y >= size) return false;
  } else {
    if (x >= size || y + length > size) return false;
  }
  
  // Check for overlapping ships and adjacent ships
  for (let i = 0; i < length; i++) {
    const checkX = orientation === 'horizontal' ? x + i : x;
    const checkY = orientation === 'vertical' ? y + i : y;
    const index = checkY * size + checkX;
    
    if (board[index] === 1) return false;
    
    // Check adjacent cells for existing ships (ships can't touch)
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const adjX = checkX + dx;
        const adjY = checkY + dy;
        
        if (adjX >= 0 && adjX < size && adjY >= 0 && adjY < size) {
          const adjIndex = adjY * size + adjX;
          if (board[adjIndex] === 1) return false;
        }
      }
    }
  }
  
  return true;
}

// Place ship on board
export function placeShip(
  board: number[],
  x: number,
  y: number,
  length: number,
  orientation: 'horizontal' | 'vertical',
  boardSize?: number
): void {
  const size = boardSize || getBoardSize();
  
  for (let i = 0; i < length; i++) {
    const cellX = orientation === 'horizontal' ? x + i : x;
    const cellY = orientation === 'vertical' ? y + i : y;
    const index = cellY * size + cellX;
    board[index] = 1;
  }
}

// Convert coordinates to array index
export function coordToIndex(x: number, y: number, boardSize?: number): number {
  const size = boardSize || getBoardSize();
  return y * size + x;
}

// Convert array index to coordinates
export function indexToCoord(index: number, boardSize?: number): { x: number; y: number } {
  const size = boardSize || getBoardSize();
  return {
    x: index % size,
    y: Math.floor(index / size)
  };
}

// Format coordinate for display
export function formatCoordinate(x: number, y: number): string {
  return `${String.fromCharCode(65 + x)}${y + 1}`;
}

// Cryptographic utilities
export function generateSalt(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(32));
}

export function computeCommitment(board: number[], salt: Uint8Array): string {
  const boardStr = board.join('');
  const saltStr = Array.from(salt).map(b => b.toString(16).padStart(2, '0')).join('');
  const combined = boardStr + saltStr;
  
  const hash = createHash('sha256');
  hash.update(combined);
  return hash.digest('hex');
}

// Fleet validation
export function validateFleetConfiguration(board: number[], mode?: GameMode): boolean {
  const ships = getShipsToPlace(mode);
  const boardSize = getBoardSize(mode);
  
  // Check total squares
  if (!validateCurrentFleet(board, mode)) {
    return false;
  }
  
  // Additional validation logic can be added here
  // For now, we trust that if the total squares match, the fleet is valid
  
  return true;
}

// Game state utilities
export function saveGameState(gameState: GameState): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('battleshipGameState', JSON.stringify(gameState));
  }
}

export function loadGameState(): GameState | null {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('battleshipGameState');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return null;
      }
    }
  }
  return null;
}

export function getGameStatus(gameState: GameState | null): string {
  if (!gameState) return 'No active game';
  
  switch (gameState.status) {
    case 'waiting':
      return 'Waiting for opponent';
    case 'playing':
      return `Turn ${gameState.turn}`;
    case 'finished':
      return gameState.winner ? `Player ${gameState.winner} wins!` : 'Game finished';
    default:
      return 'Unknown status';
  }
}

export function getCurrentPlayerRole(gameState: GameState | null, publicKey: string): 'player1' | 'player2' | 'spectator' {
  if (!gameState || !publicKey) return 'spectator';
  
  if (gameState.player1 === publicKey) return 'player1';
  if (gameState.player2 === publicKey) return 'player2';
  
  return 'spectator';
}

export function isPlayerTurn(gameState: GameState | null, publicKey: string): boolean {
  if (!gameState || !publicKey || gameState.status !== 'playing') return false;
  
  const role = getCurrentPlayerRole(gameState, publicKey);
  
  if (role === 'player1' && gameState.turn % 2 === 1) return true;
  if (role === 'player2' && gameState.turn % 2 === 0) return true;
  
  return false;
} 