package com.naturalflow.controller;

import com.naturalflow.config.Constants;
import com.naturalflow.service.FlowService;
import com.naturalflow.service.MarketPulseService;
import com.naturalflow.service.HistoricalDataLoader;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Market Pulse endpoints for MAG7 stocks
 * Real-time heatmaps, flow lines, and smart money tracking
 */
@RestController
@RequestMapping("/api/pulse")
public class MarketPulseController {

    private final MarketPulseService pulseService;
    private final FlowService flowService;
    private final HistoricalDataLoader dataLoader;

    public MarketPulseController(MarketPulseService pulseService, FlowService flowService, HistoricalDataLoader dataLoader) {
        this.pulseService = pulseService;
        this.flowService = flowService;
        this.dataLoader = dataLoader;
    }

    /**
     * GET /api/pulse/heatmap
     * Returns call/put premium heatmap for MAG7 stocks
     *
     * Response format:
     * {
     *   "AAPL": { "callPremium": 5000000, "putPremium": 2000000, "netFlow": 3000000, "sentiment": "BULLISH" },
     *   "MSFT": { ... },
     *   ...
     * }
     */
    @GetMapping("/heatmap")
    public ResponseEntity<Map<String, Map<String, Object>>> getHeatmap(
            @RequestParam(defaultValue = "24") int windowHours) {

        Map<String, Map<String, Object>> heatmap = new HashMap<>();

        for (String ticker : Constants.MAG7_TICKERS) {
            FlowService.FlowSummary summary = flowService.getSummary(ticker, windowHours);

            Map<String, Object> tickerData = new HashMap<>();
            tickerData.put("callPremium", summary.getTotalCallPremium());
            tickerData.put("putPremium", summary.getTotalPutPremium());
            tickerData.put("netFlow", summary.getNetPremium());
            tickerData.put("tradeCount", summary.getCount());

            // Determine sentiment
            BigDecimal netFlow = summary.getNetPremium();
            String sentiment;
            if (netFlow.compareTo(BigDecimal.ZERO) > 0) {
                sentiment = netFlow.compareTo(new BigDecimal("1000000")) > 0 ? "VERY_BULLISH" : "BULLISH";
            } else if (netFlow.compareTo(BigDecimal.ZERO) < 0) {
                sentiment = netFlow.compareTo(new BigDecimal("-1000000")) < 0 ? "VERY_BEARISH" : "BEARISH";
            } else {
                sentiment = "NEUTRAL";
            }
            tickerData.put("sentiment", sentiment);

            heatmap.put(ticker, tickerData);
        }

        return ResponseEntity.ok(heatmap);
    }

    /**
     * GET /api/pulse/smart-money
     * Returns recent trades over $100K threshold
     * These are institutional/smart money trades
     */
    @GetMapping("/smart-money")
    public ResponseEntity<Map<String, Object>> getSmartMoney(
            @RequestParam(defaultValue = "50") int limit) {

        List<Map<String, Object>> smartTrades = pulseService.getSmartMoneyTrades(limit);

        Map<String, Object> response = new HashMap<>();
        response.put("threshold", Constants.SMART_MONEY_THRESHOLD);
        response.put("trades", smartTrades);
        response.put("count", smartTrades.size());

        return ResponseEntity.ok(response);
    }

    /**
     * GET /api/pulse/timeline?symbol=AAPL
     * Returns premium flow over time for a ticker
     * Used for flow line charts
     */
    @GetMapping("/timeline")
    public ResponseEntity<Map<String, Object>> getTimeline(
            @RequestParam String symbol,
            @RequestParam(defaultValue = "24") int windowHours,
            @RequestParam(defaultValue = "60") int bucketMinutes) {

        // Verify it's a MAG7 stock
        if (!Constants.MAG7_TICKERS.contains(symbol.toUpperCase())) {
            Map<String, Object> error = new HashMap<>();
            error.put("error", "Only MAG7 stocks supported: " + String.join(", ", Constants.MAG7_TICKERS));
            return ResponseEntity.badRequest().body(error);
        }

        Map<String, Object> timeline = pulseService.getFlowTimeline(symbol, windowHours, bucketMinutes);
        return ResponseEntity.ok(timeline);
    }

    /**
     * GET /api/pulse/mag7-summary
     * Returns overall MAG7 market sentiment and activity
     */
    @GetMapping("/mag7-summary")
    public ResponseEntity<Map<String, Object>> getMag7Summary() {
        Map<String, Object> summary = pulseService.getMag7Summary();
        return ResponseEntity.ok(summary);
    }

    /**
     * GET /api/pulse/unusual-activity
     * Returns unusual/anomalous flow patterns
     * Things that deviate from historical norms
     */
    @GetMapping("/unusual-activity")
    public ResponseEntity<List<Map<String, Object>>> getUnusualActivity(
            @RequestParam(defaultValue = "10") int limit) {

        List<Map<String, Object>> unusual = pulseService.getUnusualActivity(limit);
        return ResponseEntity.ok(unusual);
    }

    /**
     * POST /api/pulse/load-historical-data
     * Load synthetic historical data for MAG7 pattern learning
     * This generates realistic flow data for the past N days
     */
    @PostMapping("/load-historical-data")
    public ResponseEntity<Map<String, Object>> loadHistoricalData(
            @RequestParam(defaultValue = "30") int daysBack,
            @RequestParam(defaultValue = "false") boolean clearFirst) {

        try {
            // Optionally clear existing data first
            if (clearFirst) {
                dataLoader.clearAllData();
            }

            // Use synthetic data generator for now (real Polygon data requires paid subscription)
            Map<String, Object> result = dataLoader.generateSyntheticHistoricalData(daysBack);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            Map<String, Object> error = new HashMap<>();
            error.put("success", false);
            error.put("error", e.getMessage());
            return ResponseEntity.internalServerError().body(error);
        }
    }
}
