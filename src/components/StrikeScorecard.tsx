import { StrikeConcentration } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Target, TrendingUp, TrendingDown } from "lucide-react";

interface StrikeScorecardProps {
  strikes: StrikeConcentration[];
  compact?: boolean;
}

const gradeColors = {
  "A+": "bg-gradient-to-r from-green-500/20 to-emerald-500/20 border-green-500/50 text-green-400",
  "A": "bg-green-500/10 border-green-500/30 text-green-400",
  "B": "bg-yellow-500/10 border-yellow-500/30 text-yellow-400",
  "C": "bg-gray-500/10 border-gray-500/30 text-gray-400",
  "D": "bg-gray-500/5 border-gray-500/20 text-gray-500",
};

const gradeGlow = {
  "A+": "shadow-[0_0_15px_rgba(34,197,94,0.3)]",
  "A": "",
  "B": "",
  "C": "",
  "D": "",
};

export function StrikeScorecard({ strikes, compact = false }: StrikeScorecardProps) {
  if (strikes.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Target className="h-12 w-12 mx-auto mb-3 opacity-30" />
        <p className="text-sm">No strike concentration detected</p>
        <p className="text-xs mt-1">Try adjusting lookback window or minimum hits</p>
      </div>
    );
  }

  // Group by expiry date for better organization
  const groupedByExpiry = strikes.reduce((acc, strike) => {
    if (!acc[strike.expiry]) {
      acc[strike.expiry] = [];
    }
    acc[strike.expiry].push(strike);
    return acc;
  }, {} as Record<string, StrikeConcentration[]>);

  const sortedExpiries = Object.keys(groupedByExpiry).sort();

  return (
    <div className="space-y-4">
      {sortedExpiries.map((expiry) => {
        const expiryStrikes = groupedByExpiry[expiry].sort(
          (a, b) => b.totalPremium - a.totalPremium
        );

        return (
          <div key={expiry} className="space-y-2">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Expiry: {new Date(expiry).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              <span className="ml-2 text-primary">({expiryStrikes[0].dte} DTE)</span>
            </div>

            {expiryStrikes.map((strike, idx) => (
              <Card
                key={idx}
                className={`p-3 border transition-all hover:scale-[1.02] ${gradeColors[strike.flowGrade]} ${gradeGlow[strike.flowGrade]}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded ${strike.side === 'CALL' ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
                      {strike.side === 'CALL' ? (
                        <TrendingUp className="h-5 w-5 text-green-400" />
                      ) : (
                        <TrendingDown className="h-5 w-5 text-red-400" />
                      )}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-bold font-mono">${strike.strike}</span>
                        <Badge
                          variant="outline"
                          className={strike.side === 'CALL' ? 'border-green-500/50 text-green-400' : 'border-red-500/50 text-red-400'}
                        >
                          {strike.side}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {strike.hitCount} hits • {strike.totalSize} contracts
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className={`text-xl font-bold font-mono mb-1 ${gradeColors[strike.flowGrade].split(' ').find(c => c.startsWith('text-'))}`}>
                      {strike.flowGrade}
                    </div>
                    <div className="text-sm font-semibold">
                      ${(strike.totalPremium / 1000).toFixed(0)}K
                    </div>
                  </div>
                </div>

                {!compact && (
                  <div className="mt-2 pt-2 border-t border-border/50 flex items-center justify-between text-xs text-muted-foreground">
                    <span>Avg: ${(strike.totalPremium / strike.hitCount / 1000).toFixed(1)}K per hit</span>
                    <span>Total Premium: ${strike.totalPremium.toLocaleString()}</span>
                  </div>
                )}
              </Card>
            ))}
          </div>
        );
      })}
    </div>
  );
}
