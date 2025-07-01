'use client';

import React from 'react';
import { BOARD_SIZE, coordToIndex, formatCoordinate } from '../lib/battleshipUtils';

interface GameBoardProps {
  board: number[];
  hits?: number[];
  isOwnBoard: boolean;
  isPlacementMode: boolean;
  isInteractive: boolean;
  onCellClick?: (x: number, y: number) => void;
  showShips?: boolean;
  hoveredShip?: { x: number, y: number, length: number, orientation: 'horizontal' | 'vertical' } | null;
  boardSize?: number;
}

const GameBoard: React.FC<GameBoardProps> = ({
  board,
  hits = [],
  isOwnBoard,
  isPlacementMode,
  isInteractive,
  onCellClick,
  showShips = true,
  hoveredShip,
  boardSize = BOARD_SIZE
}) => {
  const getCellClass = (x: number, y: number): string => {
    const index = coordToIndex(x, y, boardSize);
    const hasShip = board[index] === 1;
    const hitStatus = hits[index];
    
    let classes = 'border border-gray-400 flex items-center justify-center text-xs font-bold cursor-pointer transition-colors ';
    
    // Dynamic cell sizing based on board size
    if (boardSize <= 6) {
      classes += 'w-12 h-12 text-sm '; // Larger cells for smaller boards
    } else if (boardSize <= 8) {
      classes += 'w-10 h-10 text-sm '; // Medium cells
    } else {
      classes += 'w-8 h-8 text-xs '; // Standard cells for larger boards
    }
    
    // Base color
    classes += 'bg-blue-100 ';
    
    if (isPlacementMode) {
      // Ship placement mode
      if (hasShip && showShips) {
        classes += 'bg-gray-600 ';
      }
      
      // Show hovered ship preview
      if (hoveredShip) {
        const shipStartX = hoveredShip.x;
        const shipStartY = hoveredShip.y;
        const shipLength = hoveredShip.length;
        const shipOrientation = hoveredShip.orientation;
        
        for (let i = 0; i < shipLength; i++) {
          const shipX = shipOrientation === 'horizontal' ? shipStartX + i : shipStartX;
          const shipY = shipOrientation === 'vertical' ? shipStartY + i : shipStartY;
          
          if (shipX === x && shipY === y) {
            classes += 'bg-green-300 ';
            break;
          }
        }
      }
      
      if (isInteractive) {
        classes += 'hover:bg-blue-200 ';
      }
    } else {
      // Game play mode
      if (isOwnBoard) {
        // Show own ships and hits received
        if (hasShip && showShips) {
          classes += 'bg-gray-600 ';
        }
        
        if (hitStatus === 1) {
          classes += 'bg-white '; // Miss
        } else if (hitStatus === 2) {
          classes += 'bg-red-500 '; // Hit on own ship
        }
      } else {
        // Opponent's board - show only hits/misses
        if (hitStatus === 1) {
          classes += 'bg-white '; // Miss
        } else if (hitStatus === 2) {
          classes += 'bg-red-500 '; // Hit
        } else if (isInteractive) {
          classes += 'hover:bg-blue-200 ';
        }
      }
    }
    
    if (!isInteractive) {
      classes += 'cursor-default ';
    }
    
    return classes;
  };
  
  const getCellContent = (x: number, y: number): string => {
    const index = coordToIndex(x, y, boardSize);
    const hitStatus = hits[index];
    
    if (hitStatus === 1) {
      return '○'; // Miss marker
    } else if (hitStatus === 2) {
      return '✗'; // Hit marker
    }
    
    return '';
  };
  
  const handleCellClick = (x: number, y: number) => {
    if (isInteractive && onCellClick) {
      onCellClick(x, y);
    }
  };

  // Dynamic sizing for labels based on board size
  const labelSize = boardSize <= 6 ? 'w-12 h-8 text-base' : boardSize <= 8 ? 'w-10 h-6 text-sm' : 'w-8 h-6 text-sm';
  const rowLabelSize = boardSize <= 6 ? 'w-12 h-12 text-base' : boardSize <= 8 ? 'w-10 h-10 text-sm' : 'w-8 h-8 text-sm';
  
  return (
    <div className="inline-block">
      {/* Column labels */}
      <div className="flex mb-1">
        <div className={labelSize}></div> {/* Empty corner */}
        {Array.from({ length: boardSize }, (_, i) => (
          <div key={i} className={`${labelSize} flex items-center justify-center font-semibold`}>
            {String.fromCharCode('A'.charCodeAt(0) + i)}
          </div>
        ))}
      </div>
      
      {/* Board with row labels */}
      {Array.from({ length: boardSize }, (_, y) => (
        <div key={y} className="flex">
          {/* Row label */}
          <div className={`${rowLabelSize} flex items-center justify-center font-semibold`}>
            {y + 1}
          </div>
          
          {/* Board cells */}
          {Array.from({ length: boardSize }, (_, x) => (
            <div
              key={`${x}-${y}`}
              className={getCellClass(x, y)}
              onClick={() => handleCellClick(x, y)}
              title={formatCoordinate(x, y)}
            >
              {getCellContent(x, y)}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
};

export default GameBoard; 