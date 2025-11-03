package com.naturalflow.controller;

import com.naturalflow.config.Constants;
import com.naturalflow.repo.FlowRepository;
import com.naturalflow.service.PatternService;
import com.naturalflow.service.PolygonWebSocketService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * System monitoring and admin endpoints
 * Health checks, WebSocket status, pattern detection
 */
@RestController
@RequestMapping("/api/system")
public class SystemController {

    private final FlowRepository flowRepository;
    private final PolygonWebSocketService webSocketService;
    private final PatternService patternService;

    public SystemController(FlowRepository flowRepository, 
                           PolygonWebSocketService webSocketService,
                           PatternService patternService) {
        this.flowRepository = flowRepository;
        this.webSocketService = webSocketService;
        this.patternService = patternService;
    }

    /**
     * GET /api/system/health
     * Returns system health status
     */
    @GetMapping("/health")
    public ResponseEntity<Map<String, Object>> getHealth() {
        Map<String, Object> health = new HashMap<>();
        
        // Database stats
        long totalTrades = flowRepository.count();
        
        // Recent activity (last 1 hour)
        Instant oneHourAgo = Instant.now().minus(1, ChronoUnit.HOURS);
        List<String> recentTickers = flowRepository.findDistinctUnderlyingSince(oneHourAgo);
        
        // WebSocket status
        boolean wsConnected = webSocketService.isConnected();
        
        health.put("status", "UP");
        health.put("timestamp", Instant.now());
        health.put("database", Map.of(
            "totalTrades", totalTrades,
            "recentTickers", recentTickers,
            "activeTickers", recentTickers.size()
        ));
        health.put("websocket", Map.of(
            "connected", wsConnected,
            "status", wsConnected ? "STREAMING" : "DISCONNECTED"
        ));
        
        return ResponseEntity.ok(health);
    }

    /**
     * GET /api/system/stats
     * Detailed system statistics
     */
    @GetMapping("/stats")
    public ResponseEntity<Map<String, Object>> getStats() {
        Map<String, Object> stats = new HashMap<>();
        
        long totalTrades = flowRepository.count();
        
        // Stats per ticker
        Map<String, Long> tradesByTicker = new HashMap<>();
        for (String ticker : Constants.MAG7_TICKERS) {
            Instant dayAgo = Instant.now().minus(24, ChronoUnit.HOURS);
            Long count = flowRepository.countByUnderlyingAndTimeWindow(ticker, dayAgo);
            tradesByTicker.put(ticker, count);
        }
        
        // Time ranges
        Map<String, Long> tradesByTimeRange = new HashMap<>();
        tradesByTimeRange.put("last1h", countTradesSince(1, ChronoUnit.HOURS));
        tradesByTimeRange.put("last6h", countTradesSince(6, ChronoUnit.HOURS));
        tradesByTimeRange.put("last24h", countTradesSince(24, ChronoUnit.HOURS));
        tradesByTimeRange.put("last7d", countTradesSince(7, ChronoUnit.DAYS));
        
        stats.put("totalTrades", totalTrades);
        stats.put("tradesByTicker", tradesByTicker);
        stats.put("tradesByTimeRange", tradesByTimeRange);
        stats.put("generatedAt", Instant.now());
        
        return ResponseEntity.ok(stats);
    }

    /**
     * GET /api/system/patterns
     * Detect patterns across all tickers or specific ticker
     */
    @GetMapping("/patterns")
    public ResponseEntity<Map<String, Object>> getPatterns(
            @RequestParam(required = false) String ticker) {
        
        if (ticker != null && !ticker.isEmpty()) {
            // Single ticker patterns
            Map<String, Object> patterns = patternService.getAllPatterns(ticker.toUpperCase());
            return ResponseEntity.ok(patterns);
        } else {
            // All tickers - unusual volume detection
            Map<String, Object> response = new HashMap<>();
            List<Map<String, Object>> unusualVolume = patternService.detectUnusualVolume(
                List.of(Constants.MAG7_TICKERS), 24);
            
            response.put("unusualVolume", unusualVolume);
            response.put("scannedTickers", Constants.MAG7_TICKERS.length);
            response.put("scannedAt", Instant.now());
            
            return ResponseEntity.ok(response);
        }
    }

    /**
     * Helper to count trades since a time period
     */
    private long countTradesSince(long amount, ChronoUnit unit) {
        Instant cutoff = Instant.now().minus(amount, unit);
        return flowRepository.findDistinctUnderlyingSince(cutoff).stream()
            .mapToLong(ticker -> flowRepository.countByUnderlyingAndTimeWindow(ticker, cutoff))
            .sum();
    }
}
