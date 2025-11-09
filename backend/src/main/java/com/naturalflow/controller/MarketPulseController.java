package com.naturalflow.controller;

import com.naturalflow.config.Constants;
import com.naturalflow.service.FlowService;
import com.naturalflow.service.MarketPulseService;
import com.naturalflow.service.SmartMoneyService;
import com.naturalflow.service.HistoricalDataLoader;
import com.naturalflow.service.ScheduledBackfillService;
import com.naturalflow.service.StockPriceService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.*;
import java.time.format.DateTimeFormatter;
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
    private final SmartMoneyService smartMoneyService;
    private final HistoricalDataLoader dataLoader;
    private final ScheduledBackfillService scheduledBackfillService;
    private final StockPriceService stockPriceService;

    public MarketPulseController(MarketPulseService pulseService, FlowService flowService,
                                 SmartMoneyService smartMoneyService,
                                 HistoricalDataLoader dataLoader, ScheduledBackfillService scheduledBackfillService,
                                 StockPriceService stockPriceService) {
        this.pulseService = pulseService;
        this.flowService = flowService;
        this.smartMoneyService = smartMoneyService;
        this.dataLoader = dataLoader;
        this.scheduledBackfillService = scheduledBackfillService;
        this.stockPriceService = stockPriceService;
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
     * Used for flow line charts (LIVE MODE - relative to now)
     */
    @GetMapping("/timeline")
    public ResponseEntity<Map<String, Object>> getTimeline(
            @RequestParam String symbol,
            @RequestParam(defaultValue = "24") int windowHours,
            @RequestParam(defaultValue = "60") int bucketMinutes) {

        Map<String, Object> timeline = pulseService.getFlowTimeline(symbol, windowHours, bucketMinutes);
        return ResponseEntity.ok(timeline);
    }

    /**
     * GET /api/pulse/timeline-by-date?symbol=AAPL&date=2025-11-07
     * Returns premium flow for a specific date (HISTORICAL MODE)
     * Includes stock price overlay data
     */
    @GetMapping("/timeline-by-date")
    public ResponseEntity<Map<String, Object>> getTimelineByDate(
            @RequestParam String symbol,
            @RequestParam String date,
            @RequestParam(defaultValue = "09:30") String startTime,
            @RequestParam(defaultValue = "16:00") String endTime,
            @RequestParam(defaultValue = "15") int bucketMinutes) {

        try {
            LocalDate targetDate = LocalDate.parse(date, DateTimeFormatter.ISO_LOCAL_DATE);

            // Parse times and create market hours window
            ZonedDateTime start = targetDate.atTime(LocalTime.parse(startTime))
                .atZone(ZoneId.of("America/New_York"));
            ZonedDateTime end = targetDate.atTime(LocalTime.parse(endTime))
                .atZone(ZoneId.of("America/New_York"));

            // Get flow data for the date
            List<com.naturalflow.model.OptionFlow> flows = flowService.getFlowBetween(
                symbol.toUpperCase(),
                start.toInstant(),
                end.toInstant()
            );

            // Get price data for the date
            List<com.naturalflow.model.StockPrice> prices = stockPriceService.getPricesInRange(
                symbol.toUpperCase(),
                start.toInstant(),
                end.toInstant()
            );

            // Build response with both flow and price data
            Map<String, Object> response = new HashMap<>();
            response.put("symbol", symbol.toUpperCase());
            response.put("date", date);
            response.put("startTime", startTime);
            response.put("endTime", endTime);
            response.put("flows", flows);
            response.put("prices", prices);
            response.put("flowCount", flows.size());
            response.put("priceCount", prices.size());

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, Object> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
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
     * GET /api/pulse/debug/last-trades
     * Debug endpoint to verify data ingestion is working
     * Returns the most recent trades across all tickers
     */
    @GetMapping("/debug/last-trades")
    public ResponseEntity<Map<String, Object>> getLastTrades(
            @RequestParam(defaultValue = "10") int limit) {
        
        List<com.naturalflow.model.OptionFlow> recentTrades = 
            flowService.getRecentTradesAcrossAll(Math.min(limit, 50));
        
        Map<String, Object> response = new HashMap<>();
        response.put("count", recentTrades.size());
        response.put("trades", recentTrades.stream()
            .map(trade -> {
                Map<String, Object> tradeMap = new HashMap<>();
                tradeMap.put("optionSymbol", trade.getOptionSymbol());
                tradeMap.put("underlying", trade.getUnderlying());
                tradeMap.put("side", trade.getSide());
                tradeMap.put("strike", trade.getStrike());
                tradeMap.put("expiry", trade.getExpiry());
                tradeMap.put("premium", trade.getPremium());
                tradeMap.put("size", trade.getSize());
                tradeMap.put("timestamp", trade.getTsUtc());
                tradeMap.put("src", trade.getSrc());
                return tradeMap;
            })
            .collect(java.util.stream.Collectors.toList()));
        
        return ResponseEntity.ok(response);
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
     * GET /api/pulse/strikes
     * Returns strike-level concentration data with flow grades
     * Shows where institutional money is concentrating positions
     */
    @GetMapping("/strikes")
    public ResponseEntity<Map<String, Object>> getStrikeConcentration(
            @RequestParam String symbol,
            @RequestParam(defaultValue = "48") int lookbackHours,
            @RequestParam(defaultValue = "2") int minHits) {

        // Verify it's a MAG7 stock
        if (!Constants.MAG7_TICKERS.contains(symbol.toUpperCase())) {
            Map<String, Object> error = new HashMap<>();
            error.put("error", "Only MAG7 stocks supported: " + String.join(", ", Constants.MAG7_TICKERS));
            return ResponseEntity.badRequest().body(error);
        }

        List<SmartMoneyService.StrikeConcentration> strikes = 
            smartMoneyService.getStrikeConcentration(symbol, lookbackHours);

        // Filter by minHits and add flow grades
        List<Map<String, Object>> enrichedStrikes = strikes.stream()
            .filter(strike -> strike.getTradeCount() >= minHits)
            .map(strike -> {
                Map<String, Object> strikeMap = new HashMap<>();
                strikeMap.put("strike", strike.getStrike());
                strikeMap.put("expiry", strike.getExpiry());
                strikeMap.put("side", strike.getSide());
                strikeMap.put("dte", strike.getDte());
                strikeMap.put("hitCount", strike.getTradeCount());
                strikeMap.put("totalPremium", strike.getTotalPremium());
                strikeMap.put("totalSize", strike.getTotalSize());
                strikeMap.put("flowGrade", calculateFlowGrade(strike));
                return strikeMap;
            })
            .collect(java.util.stream.Collectors.toList());

        Map<String, Object> response = new HashMap<>();
        response.put("symbol", symbol.toUpperCase());
        response.put("lookbackHours", lookbackHours);
        response.put("strikes", enrichedStrikes);
        response.put("count", enrichedStrikes.size());

        return ResponseEntity.ok(response);
    }

    /**
     * Calculate flow grade based on hit count and premium
     */
    private String calculateFlowGrade(SmartMoneyService.StrikeConcentration strike) {
        int hits = strike.getTradeCount();
        BigDecimal premium = strike.getTotalPremium();

        // A+: 5+ hits, $500K+ premium
        if (hits >= 5 && premium.compareTo(new BigDecimal("500000")) >= 0) {
            return "A+";
        }
        // A: 4+ hits, $250K+ premium
        if (hits >= 4 && premium.compareTo(new BigDecimal("250000")) >= 0) {
            return "A";
        }
        // B: 3+ hits, $100K+ premium
        if (hits >= 3 && premium.compareTo(new BigDecimal("100000")) >= 0) {
            return "B";
        }
        // C: 2+ hits, $50K+ premium
        if (hits >= 2 && premium.compareTo(new BigDecimal("50000")) >= 0) {
            return "C";
        }
        return "D";
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

    /**
     * POST /api/pulse/backfill-real-data
     * Trigger manual backfill of real Polygon data
     * Fetches recent trades for specified ticker and hours back
     */
    @PostMapping("/backfill-real-data")
    public ResponseEntity<Map<String, Object>> backfillRealData(
            @RequestParam(required = false) String ticker,
            @RequestParam(defaultValue = "2") int hoursBack) {

        try {
            if (ticker != null && !ticker.isEmpty()) {
                // Backfill single ticker
                int count = scheduledBackfillService.manualBackfill(ticker.toUpperCase(), hoursBack);
                
                Map<String, Object> result = new HashMap<>();
                result.put("success", true);
                result.put("ticker", ticker.toUpperCase());
                result.put("hoursBack", hoursBack);
                result.put("tradesIngested", count);
                return ResponseEntity.ok(result);
            } else {
                // Trigger immediate full backfill cycle
                scheduledBackfillService.backfillRecentTrades();
                
                Map<String, Object> result = new HashMap<>();
                result.put("success", true);
                result.put("message", "Full backfill triggered for all MAG7 tickers");
                return ResponseEntity.ok(result);
            }
        } catch (Exception e) {
            Map<String, Object> error = new HashMap<>();
            error.put("success", false);
            error.put("error", e.getMessage());
            return ResponseEntity.internalServerError().body(error);
        }
    }

    /**
     * POST /api/pulse/load-30-days
     * Load 30 days of historical data for pattern learning
     * This is a one-time operation to populate the database
     */
    @PostMapping("/load-30-days")
    public ResponseEntity<Map<String, Object>> load30Days(
            @RequestParam(defaultValue = "30") int daysBack) {
        
        try {
            Map<String, Integer> results = scheduledBackfillService.loadHistoricalData(daysBack);
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("daysBack", daysBack);
            response.put("results", results);
            response.put("totalTrades", results.values().stream().mapToInt(Integer::intValue).sum());
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, Object> error = new HashMap<>();
            error.put("success", false);
            error.put("error", e.getMessage());
            return ResponseEntity.internalServerError().body(error);
        }
    }
}
