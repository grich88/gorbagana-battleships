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

// Game mode configurations
export const GAME_MODES: Record<GameMode, GameModeConfig> = {
  quick: {
    boardSize: 6,
    fleet: [
      { length: 3, count: 1, name: 'Cruiser' },
      { length: 2, count: 2, name: 'Destroyer' },
    ],
    totalShipSquares: 7, // 3 + 2 + 2 = 7
    name: 'Quick Battle',
    description: '6x6 board with 3 small ships',
    estimatedTime: '3-5 minutes'
  },
  standard: {
    boardSize: 10,
    fleet: [
      { length: 5, count: 1, name: 'Carrier' },
      { length: 4, count: 1, name: 'Battleship' },
      { length: 3, count: 2, name: 'Cruiser' },
      { length: 2, count: 1, name: 'Destroyer' }
    ],
    totalShipSquares: 17, // 5 + 4 + 3 + 3 + 2 = 17
    name: 'Standard Battle',
    description: '10x10 board with classic fleet',
    estimatedTime: '10-15 minutes'
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
    totalShipSquares: 28, // 6 + 5 + 4 + 4 + 3 + 3 + 2 + 2 = 28
    name: 'Extended Battle',
    description: '12x12 board with large fleet',
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

// Dynamic getters that adapt to current game mode
export function getBoardSize(): number {
  return getCurrentConfig().boardSize;
}

export function getFleet(): Array<{ length: number; count: number; name: string }> {
  return getCurrentConfig().fleet;
}

export function getTotalShipSquares(): number {
  return getCurrentConfig().totalShipSquares;
}

// Legacy exports for backward compatibility
export const STANDARD_FLEET = GAME_MODES.standard.fleet;
export const TOTAL_SHIP_SQUARES = GAME_MODES.standard.totalShipSquares;
export const BOARD_SIZE = GAME_MODES.standard.boardSize;

// Types for the Battleships game
export interface Ship {
  length: number;
  positions: number[];
  orientation: 'horizontal' | 'vertical';
  placed: boolean;
}

export interface GameState {
  player1: string;
  player2: string;
  boardCommit1: number[];
  boardCommit2: number[];
  turn: number;
  boardHits1: number[];
  boardHits2: number[];
  hitsCount1: number;
  hitsCount2: number;
  isInitialized: boolean;
  isGameOver: boolean;
  winner: number;
  pendingShot: [number, number] | null;
  pendingShotBy: string;
  player1Revealed: boolean;
  player2Revealed: boolean;
  gameMode?: GameMode; // Add game mode to state
}

// Convert coordinate (x, y) to array index
export function coordToIndex(x: number, y: number, boardSize?: number): number {
  const size = boardSize || getBoardSize();
  return x + y * size;
}

// Convert array index to coordinate (x, y)
export function indexToCoord(index: number, boardSize?: number): [number, number] {
  const size = boardSize || getBoardSize();
  return [index % size, Math.floor(index / size)];
}

// Check if coordinates are valid
export function isValidCoordinate(x: number, y: number, boardSize?: number): boolean {
  const size = boardSize || getBoardSize();
  return x >= 0 && x < size && y >= 0 && y < size;
}

// Check if ship placement is valid
export function isValidShipPlacement(
  board: number[],
  startX: number,
  startY: number,
  length: number,
  orientation: 'horizontal' | 'vertical',
  boardSize?: number
): boolean {
  const size = boardSize || getBoardSize();
  const positions = [];
  
  for (let i = 0; i < length; i++) {
    const x = orientation === 'horizontal' ? startX + i : startX;
    const y = orientation === 'vertical' ? startY + i : startY;
    
    if (!isValidCoordinate(x, y, size)) {
      return false; // Ship goes out of bounds
    }
    
    const index = coordToIndex(x, y, size);
    if (board[index] !== 0) {
      return false; // Position already occupied
    }
    
    positions.push(index);
  }
  
  return true;
}

// Place ship on board
export function placeShip(
  board: number[],
  startX: number,
  startY: number,
  length: number,
  orientation: 'horizontal' | 'vertical',
  boardSize?: number
): number[] {
  const size = boardSize || getBoardSize();
  const newBoard = [...board];
  
  for (let i = 0; i < length; i++) {
    const x = orientation === 'horizontal' ? startX + i : startX;
    const y = orientation === 'vertical' ? startY + i : startY;
    const index = coordToIndex(x, y, size);
    newBoard[index] = 1; // 1 indicates ship presence
  }
  
  return newBoard;
}

// Remove ship from board
export function removeShip(
  board: number[],
  startX: number,
  startY: number,
  length: number,
  orientation: 'horizontal' | 'vertical',
  boardSize?: number
): number[] {
  const size = boardSize || getBoardSize();
  const newBoard = [...board];
  
  for (let i = 0; i < length; i++) {
    const x = orientation === 'horizontal' ? startX + i : startX;
    const y = orientation === 'vertical' ? startY + i : startY;
    const index = coordToIndex(x, y, size);
    newBoard[index] = 0; // 0 indicates empty water
  }
  
  return newBoard;
}

// Generate random salt for commitment
export function generateSalt(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(32));
}

// Compute commitment hash for board + salt
export function computeCommitment(board: number[], salt: Uint8Array): Uint8Array {
  const boardBuffer = new Uint8Array(board);
  const combined = new Uint8Array(boardBuffer.length + salt.length);
  combined.set(boardBuffer);
  combined.set(salt, boardBuffer.length);
  
  return new Uint8Array(createHash('sha256').update(combined).digest());
}

// Validate fleet configuration for current game mode
export function validateFleetConfiguration(board: number[]): boolean {
  const shipCount = board.filter(cell => cell === 1).length;
  return shipCount === getTotalShipSquares();
}

// Find ships on board (for validation)
export function findShipsOnBoard(board: number[], boardSize?: number): Ship[] {
  const size = boardSize || getBoardSize();
  const visited = new Array(size * size).fill(false);
  const ships: Ship[] = [];
  
  for (let i = 0; i < size * size; i++) {
    if (board[i] === 1 && !visited[i]) {
      const ship = findConnectedShip(board, visited, i, size);
      if (ship) {
        ships.push(ship);
      }
    }
  }
  
  return ships;
}

// Find connected ship starting from index
function findConnectedShip(board: number[], visited: boolean[], startIndex: number, boardSize: number): Ship | null {
  const [startX, startY] = indexToCoord(startIndex, boardSize);
  const positions = [startIndex];
  visited[startIndex] = true;
  
  // Check horizontal direction
  let isHorizontal = false;
  let currentX = startX + 1;
  while (currentX < boardSize && board[coordToIndex(currentX, startY, boardSize)] === 1) {
    const index = coordToIndex(currentX, startY, boardSize);
    positions.push(index);
    visited[index] = true;
    isHorizontal = true;
    currentX++;
  }
  
  // If not horizontal, check vertical
  if (!isHorizontal) {
    let currentY = startY + 1;
    while (currentY < boardSize && board[coordToIndex(startX, currentY, boardSize)] === 1) {
      const index = coordToIndex(startX, currentY, boardSize);
      positions.push(index);
      visited[index] = true;
      currentY++;
    }
  }
  
  return {
    length: positions.length,
    positions: positions.sort((a, b) => a - b),
    orientation: isHorizontal ? 'horizontal' : 'vertical',
    placed: true
  };
}

// Check if fleet configuration matches current game mode rules
export function validateCurrentFleet(ships: Ship[]): boolean {
  const fleet = getFleet();
  const shipLengths = ships.map(ship => ship.length).sort((a, b) => b - a);
  
  // Build expected lengths array from fleet configuration
  const expectedLengths: number[] = [];
  fleet.forEach(shipType => {
    for (let i = 0; i < shipType.count; i++) {
      expectedLengths.push(shipType.length);
    }
  });
  expectedLengths.sort((a, b) => b - a);
  
  if (shipLengths.length !== expectedLengths.length) {
    return false;
  }
  
  for (let i = 0; i < shipLengths.length; i++) {
    if (shipLengths[i] !== expectedLengths[i]) {
      return false;
    }
  }
  
  return true;
}

// Generate random fleet placement for current game mode
export function generateRandomFleet(gameMode?: GameMode): number[] {
  const mode = gameMode || getCurrentGameMode();
  const config = GAME_MODES[mode];
  const boardSize = config.boardSize;
  const board = new Array(boardSize * boardSize).fill(0);
  
  // Build ship lengths array from fleet configuration
  const shipLengths: number[] = [];
  config.fleet.forEach(shipType => {
    for (let i = 0; i < shipType.count; i++) {
      shipLengths.push(shipType.length);
    }
  });
  
  for (const length of shipLengths) {
    let placed = false;
    let attempts = 0;
    
    while (!placed && attempts < 1000) {
      const x = Math.floor(Math.random() * boardSize);
      const y = Math.floor(Math.random() * boardSize);
      const orientation = Math.random() < 0.5 ? 'horizontal' : 'vertical';
      
      if (isValidShipPlacement(board, x, y, length, orientation, boardSize)) {
        for (let i = 0; i < length; i++) {
          const shipX = orientation === 'horizontal' ? x + i : x;
          const shipY = orientation === 'vertical' ? y + i : y;
          board[coordToIndex(shipX, shipY, boardSize)] = 1;
        }
        placed = true;
      }
      attempts++;
    }
    
    if (!placed) {
      // If we can't place all ships, start over
      return generateRandomFleet(gameMode);
    }
  }
  
  return board;
}

// Helper function to create empty board for current game mode
export function createEmptyBoard(gameMode?: GameMode): number[] {
  const mode = gameMode || getCurrentGameMode();
  const config = GAME_MODES[mode];
  return new Array(config.boardSize * config.boardSize).fill(0);
}

// Helper function to get ships to place for current game mode
export function getShipsToPlace(gameMode?: GameMode): Array<{ length: number; placed: boolean }> {
  const mode = gameMode || getCurrentGameMode();
  const config = GAME_MODES[mode];
  const ships: Array<{ length: number; placed: boolean }> = [];
  
  config.fleet.forEach(shipType => {
    for (let i = 0; i < shipType.count; i++) {
      ships.push({ length: shipType.length, placed: false });
    }
  });
  
  return ships;
}

// Convert coordinate string (like "A5") to numbers
export function parseCoordinate(coord: string): [number, number] | null {
  if (coord.length < 2) return null;
  
  const letter = coord[0].toUpperCase();
  const number = parseInt(coord.slice(1));
  
  const x = letter.charCodeAt(0) - 'A'.charCodeAt(0);
  const y = number - 1;
  
  if (isValidCoordinate(x, y)) {
    return [x, y];
  }
  
  return null;
}

// Convert numbers to coordinate string
export function formatCoordinate(x: number, y: number): string {
  const letter = String.fromCharCode('A'.charCodeAt(0) + x);
  const number = y + 1;
  return `${letter}${number}`;
}

// Storage functions for game state
export function saveGameState(gameId: string, board: number[], salt: Uint8Array): void {
  const gameData = {
    board,
    salt: Array.from(salt),
    timestamp: Date.now()
  };
  
  localStorage.setItem(`battleship_game_${gameId}`, JSON.stringify(gameData));
}

export function loadGameState(gameId: string): { board: number[], salt: Uint8Array } | null {
  const stored = localStorage.getItem(`battleship_game_${gameId}`);
  if (!stored) return null;
  
  try {
    const gameData = JSON.parse(stored);
    return {
      board: gameData.board,
      salt: new Uint8Array(gameData.salt)
    };
  } catch (error) {
    console.error('Error loading game state:', error);
    return null;
  }
}

// Game status helpers
export function getGameStatus(game: GameState): string {
  if (!game.isInitialized) {
    return 'Waiting for second player';
  }
  
  if (game.isGameOver) {
    if (game.winner === 1) {
      return 'Player 1 wins!';
    } else if (game.winner === 2) {
      return 'Player 2 wins!';
    } else {
      return 'Game ended';
    }
  }
  
  if (game.pendingShot) {
    return `Shot pending at ${formatCoordinate(game.pendingShot[0], game.pendingShot[1])}`;
  }
  
  return `Player ${game.turn}'s turn`;
}

export function getCurrentPlayerRole(game: GameState, walletAddress: string): 'player1' | 'player2' | 'spectator' {
  if (game.player1 === walletAddress) {
    return 'player1';
  } else if (game.player2 === walletAddress) {
    return 'player2';
  } else {
    return 'spectator';
  }
}

export function isPlayerTurn(game: GameState, walletAddress: string): boolean {
  const role = getCurrentPlayerRole(game, walletAddress);
  return (role === 'player1' && game.turn === 1) || (role === 'player2' && game.turn === 2);
} 