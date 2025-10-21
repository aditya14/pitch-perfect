import React, { useState, useEffect } from 'react';

const DraftAnimation = () => {
  const COLS = 6;
  const ROWS = 15;
  const [zoom, setZoom] = useState('in'); // 'in' or 'out'
  const [currentPick, setCurrentPick] = useState(-1);
  const [cells, setCells] = useState([]);
  const [dragDemo, setDragDemo] = useState(false);
  const [animationKey, setAnimationKey] = useState(0);

  // Initialize cells
  useEffect(() => {
    const initialCells = [];
    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        initialCells.push({
          id: `${row}-${col}`,
          row,
          col,
          status: 'available' // 'available', 'selected', 'unavailable'
        });
      }
    }
    setCells(initialCells);
  }, [animationKey]);

  // Generate snake draft order
  const generateSnakeDraftOrder = () => {
    const order = [];
    for (let round = 0; round < ROWS; round++) {
      if (round % 2 === 0) {
        // Left to right
        for (let col = 0; col < COLS; col++) {
          order.push({ row: round, col });
        }
      } else {
        // Right to left
        for (let col = COLS - 1; col >= 0; col--) {
          order.push({ row: round, col });
        }
      }
    }
    return order;
  };

  // Animation sequence
  useEffect(() => {
    let mounted = true;
    const sequence = async () => {
      if (!mounted) return;
      
      // Phase 1: Zoom in - show drag demo (3 seconds)
      setZoom('in');
      setDragDemo(true);
      await new Promise(resolve => setTimeout(resolve, 3000));
      if (!mounted) return;
      
      setDragDemo(false);
      
      // Phase 2: Zoom out (1 second)
      setZoom('out');
      await new Promise(resolve => setTimeout(resolve, 1000));
      if (!mounted) return;
      
      // Phase 3: Snake draft animation
      const draftOrder = generateSnakeDraftOrder();
      
      for (let i = 0; i < draftOrder.length; i++) {
        if (!mounted) return;
        
        const { row, col } = draftOrder[i];
        
        // 80% chance to mark a random cell as unavailable (but not in current column)
        if (Math.random() < 0.8 && i > 5) {
          const availableCols = Array.from({ length: COLS }, (_, i) => i).filter(c => c !== col);
          if (availableCols.length > 0) {
            const randomCol = availableCols[Math.floor(Math.random() * availableCols.length)];
            const randomRow = Math.floor(Math.random() * (ROWS - 3)) + 1;
            
            setCells(prev => prev.map(cell => 
              cell.row === randomRow && cell.col === randomCol && cell.status === 'available'
                ? { ...cell, status: 'unavailable' }
                : cell
            ));
          }
        }
        
        // Find the actual cell to select (skip unavailable)
        let targetRow = row;
        let targetCol = col;
        
        const checkCell = (r, c) => {
          return cells.find(cell => cell.row === r && cell.col === c);
        };
        
        let targetCell = checkCell(targetRow, targetCol);
        
        // If unavailable, find next available in same column
        if (targetCell?.status === 'unavailable') {
          for (let r = targetRow + 1; r < ROWS; r++) {
            const nextCell = checkCell(r, targetCol);
            if (nextCell?.status === 'available') {
              targetRow = r;
              targetCell = nextCell;
              break;
            }
          }
        }
        
        // Mark cell as selected if it's available
        if (targetCell?.status === 'available') {
          setCells(prev => prev.map(cell =>
            cell.row === targetRow && cell.col === targetCol
              ? { ...cell, status: 'selected' }
              : cell
          ));
        }
        
        setCurrentPick(i);
        await new Promise(resolve => setTimeout(resolve, 200));
      }
      
      if (!mounted) return;
      
      // Wait before reset
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      if (!mounted) return;
      
      // Reset and loop
      setCurrentPick(-1);
      setAnimationKey(prev => prev + 1);
    };

    if (cells.length > 0) {
      sequence();
    }

    return () => {
      mounted = false;
    };
  }, [cells.length, animationKey]);

  const PlayerCard = ({ status, showDrag }) => (
    <div className={`
      relative rounded-lg transition-all duration-300
      ${status === 'selected' ? 'bg-gradient-to-br from-green-400/80 to-green-500/80 shadow-lg scale-105' : ''}
      ${status === 'unavailable' ? 'bg-gradient-to-br from-red-400/80 to-red-500/80 shadow-lg' : ''}
      ${status === 'available' ? 'bg-white/40 backdrop-blur-md' : ''}
      border border-white/20 shadow-sm
      ${showDrag ? 'cursor-move' : ''}
    `}
    style={{
      height: zoom === 'in' ? '100px' : '40px',
      minHeight: zoom === 'in' ? '100px' : '40px'
    }}>
      <div className="p-3 h-full flex items-center space-x-3">
        {/* Avatar circle */}
        <div className={`
          rounded-full bg-white/30 backdrop-blur-sm flex-shrink-0
          ${zoom === 'in' ? 'w-12 h-12' : 'w-6 h-6'}
          transition-all duration-300
        `} />
        
        {/* Text blocks */}
        {zoom === 'in' && (
          <div className="flex-1 space-y-2 min-w-0">
            <div className="h-3 bg-white/40 rounded-full w-3/4" />
            <div className="h-2 bg-white/30 rounded-full w-1/2" />
            <div className="h-2 bg-white/30 rounded-full w-2/3" />
          </div>
        )}
      </div>
      
      {/* Drag indicator when zoomed in and showing drag demo */}
      {zoom === 'in' && showDrag && (
        <div className="absolute -top-1 -right-1 w-6 h-6 bg-white/80 rounded-full flex items-center justify-center shadow-md">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <circle cx="3" cy="3" r="1" fill="#666"/>
            <circle cx="9" cy="3" r="1" fill="#666"/>
            <circle cx="3" cy="6" r="1" fill="#666"/>
            <circle cx="9" cy="6" r="1" fill="#666"/>
            <circle cx="3" cy="9" r="1" fill="#666"/>
            <circle cx="9" cy="9" r="1" fill="#666"/>
          </svg>
        </div>
      )}
    </div>
  );

  return (
    <div className="w-full h-[600px] bg-gradient-to-br from-blue-50/50 to-purple-50/50 rounded-2xl p-8 flex items-center justify-center overflow-hidden relative backdrop-blur-xl border border-white/20">
      {/* Animated background gradient orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-10 left-10 w-64 h-64 bg-blue-400/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-10 right-10 w-64 h-64 bg-purple-400/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      <div className={`
        transition-all duration-1000 ease-in-out relative z-10
        ${zoom === 'in' ? 'w-full max-w-sm' : 'w-full max-w-5xl'}
      `}>
        {zoom === 'in' ? (
          // Zoomed in view - single column with drag demo
          <div className="space-y-3 relative">
            {[0, 1, 2].map((idx) => (
              <div
                key={idx}
                className={`transition-transform duration-500 ${
                  dragDemo && idx === 1 ? 'translate-y-20' : ''
                } ${
                  dragDemo && idx === 2 ? '-translate-y-20' : ''
                }`}
              >
                <PlayerCard status="available" showDrag={dragDemo && idx === 1} />
              </div>
            ))}
            
            {dragDemo && (
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
                <div className="bg-white/90 backdrop-blur-sm px-4 py-2 rounded-lg shadow-lg text-sm font-semibold text-gray-700 animate-pulse">
                  Drag to Reorder Your Rankings
                </div>
              </div>
            )}
          </div>
        ) : (
          // Zoomed out view - full grid
          <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${COLS}, 1fr)` }}>
            {cells.map((cell) => (
              <PlayerCard 
                key={cell.id} 
                status={cell.status}
                showDrag={false}
              />
            ))}
          </div>
        )}
      </div>

      {/* Pick counter */}
      {zoom === 'out' && currentPick >= 0 && (
        <div className="absolute top-4 right-4 bg-white/80 backdrop-blur-sm px-4 py-2 rounded-lg shadow-lg z-20">
          <div className="text-xs text-gray-600 font-medium">Draft Pick</div>
          <div className="text-2xl font-bold text-gray-900">{currentPick + 1}/{COLS * ROWS}</div>
        </div>
      )}

      <style jsx>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 0.8; }
        }
      `}</style>
    </div>
  );
};

export default DraftAnimation;
