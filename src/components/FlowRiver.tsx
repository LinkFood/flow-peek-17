import { useEffect, useState, useRef } from "react";

interface Trade {
  id: string;
  ticker: string;
  side: "CALL" | "PUT";
  premium: number;
  timestamp: number;
  x: number;
  y: number;
  speed: number;
  size: number;
}

interface FlowRiverProps {
  trades: Array<{
    timestamp: number;
    ticker: string;
    side: "CALL" | "PUT";
    premium: number;
  }>;
  height?: number;
}

export const FlowRiver = ({ trades, height = 256 }: FlowRiverProps) => {
  const [activeTrades, setActiveTrades] = useState<Trade[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number>();
  const lastTradeIndexRef = useRef<number>(0);

  // Initialize and animate trades
  useEffect(() => {
    if (!trades || trades.length === 0) return;

    const containerWidth = containerRef.current?.offsetWidth || 1000;

    // Add new trades periodically
    const addTradeInterval = setInterval(() => {
      if (lastTradeIndexRef.current >= trades.length) {
        lastTradeIndexRef.current = 0; // Loop back
      }

      const trade = trades[lastTradeIndexRef.current];
      lastTradeIndexRef.current++;

      const newTrade: Trade = {
        id: `${trade.timestamp}-${Math.random()}`,
        ticker: trade.ticker,
        side: trade.side,
        premium: trade.premium,
        timestamp: trade.timestamp,
        x: -100, // Start off-screen left
        y: Math.random() * (height - 60) + 30, // Random vertical position
        speed: 0.5 + Math.random() * 1.5, // Variable speed
        size: Math.min(Math.max(trade.premium / 100000, 1), 4), // Size based on premium
      };

      setActiveTrades(prev => [...prev, newTrade]);
    }, 1500); // Add new trade every 1.5 seconds

    // Animation loop
    const animate = () => {
      setActiveTrades(prev => {
        return prev
          .map(trade => ({
            ...trade,
            x: trade.x + trade.speed,
          }))
          .filter(trade => trade.x < containerWidth + 100); // Remove off-screen trades
      });

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      clearInterval(addTradeInterval);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [trades, height]);

  return (
    <div
      ref={containerRef}
      className="relative w-full bg-card border border-border rounded overflow-hidden"
      style={{ height: `${height}px` }}
    >
      {/* Background grid */}
      <div className="absolute inset-0 opacity-10">
        <svg width="100%" height="100%">
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path
                d="M 40 0 L 0 0 0 40"
                fill="none"
                stroke="currentColor"
                strokeWidth="0.5"
              />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>

      {/* Flow direction indicator */}
      <div className="absolute top-4 left-4 text-xs text-muted-foreground uppercase tracking-wider">
        Flow Direction →
      </div>

      {/* Animated trades */}
      {activeTrades.map(trade => (
        <div
          key={trade.id}
          className={`absolute transition-opacity duration-300 ${
            trade.side === "CALL" ? "text-green-400" : "text-red-400"
          }`}
          style={{
            left: `${trade.x}px`,
            top: `${trade.y}px`,
            transform: 'translate(-50%, -50%)',
          }}
        >
          {/* Trade bubble */}
          <div
            className={`flex items-center gap-2 px-3 py-2 rounded-full border backdrop-blur-sm ${
              trade.side === "CALL"
                ? "bg-green-500/20 border-green-500/50"
                : "bg-red-500/20 border-red-500/50"
            }`}
            style={{
              transform: `scale(${trade.size})`,
            }}
          >
            {/* Ticker */}
            <span className="text-xs font-bold font-mono">{trade.ticker}</span>

            {/* Premium */}
            <span className="text-xs font-mono font-semibold">
              ${(trade.premium / 1000).toFixed(0)}K
            </span>

            {/* Side indicator */}
            <span className="text-xs font-bold">
              {trade.side === "CALL" ? "↑" : "↓"}
            </span>
          </div>
        </div>
      ))}

      {/* Empty state */}
      {activeTrades.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center text-muted-foreground">
            <div className="text-sm mb-1">Waiting for institutional flow...</div>
            <div className="text-xs">$100K+ trades will appear here</div>
          </div>
        </div>
      )}

      {/* Stats overlay */}
      <div className="absolute bottom-4 right-4 text-xs text-muted-foreground">
        <div className="bg-card/80 backdrop-blur-sm border border-border rounded px-3 py-2">
          <div className="font-mono">
            Active: <span className="text-foreground font-semibold">{activeTrades.length}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
