package com.naturalflow.controller;

import com.naturalflow.service.HistoricalReplayService;
import com.naturalflow.service.StockPriceService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.Map;

/**
 * Replay Controller
 *
 * Endpoints for loading historical data and testing filtering logic
 * Use these to:
 * - Test system on weekends
 * - Backfill historical data
 * - Validate filtering logic
 */
@RestController
@RequestMapping("/api/replay")
public class ReplayController {

    private final HistoricalReplayService replayService;
    private final StockPriceService stockPriceService;

    public ReplayController(HistoricalReplayService replayService, StockPriceService stockPriceService) {
        this.replayService = replayService;
        this.stockPriceService = stockPriceService;
    }

    /**
     * POST /api/replay/trading-day?date=2025-11-07
     *
     * Replay a full trading day through the system
     * Fetches options trades + stock prices, runs through filters
     *
     * Use this to test on weekends!
     */
    @PostMapping("/trading-day")
    public ResponseEntity<Map<String, Object>> replayTradingDay(
        @RequestParam String date
    ) {
        try {
            LocalDate targetDate = LocalDate.parse(date, DateTimeFormatter.ISO_LOCAL_DATE);
            Map<String, Object> result = replayService.replayTradingDay(targetDate);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            Map<String, Object> error = new HashMap<>();
            error.put("success", false);
            error.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }

    /**
     * POST /api/replay/date-range?start=2025-11-01&end=2025-11-07
     *
     * Replay multiple days (for bulk backfill)
     * Useful for loading 30-60 days of data at once
     */
    @PostMapping("/date-range")
    public ResponseEntity<Map<String, Object>> replayDateRange(
        @RequestParam String start,
        @RequestParam String end
    ) {
        try {
            LocalDate startDate = LocalDate.parse(start, DateTimeFormatter.ISO_LOCAL_DATE);
            LocalDate endDate = LocalDate.parse(end, DateTimeFormatter.ISO_LOCAL_DATE);

            Map<String, Object> result = replayService.replayMultipleDays(startDate, endDate);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            Map<String, Object> error = new HashMap<>();
            error.put("success", false);
            error.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }

    /**
     * GET /api/replay/check-price-data?symbol=AAPL&date=2025-11-07
     *
     * Check if we have price data for a symbol on a date
     * Useful for debugging
     */
    @GetMapping("/check-price-data")
    public ResponseEntity<Map<String, Object>> checkPriceData(
        @RequestParam String symbol,
        @RequestParam String date
    ) {
        try {
            LocalDate targetDate = LocalDate.parse(date, DateTimeFormatter.ISO_LOCAL_DATE);
            boolean hasData = stockPriceService.hasPriceData(symbol, targetDate);

            Map<String, Object> result = new HashMap<>();
            result.put("symbol", symbol);
            result.put("date", date);
            result.put("hasData", hasData);

            return ResponseEntity.ok(result);
        } catch (Exception e) {
            Map<String, Object> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }

    /**
     * POST /api/replay/fetch-prices?date=2025-11-07
     *
     * Fetch and save stock prices for a date (without processing trades)
     * Useful for pre-loading price data
     */
    @PostMapping("/fetch-prices")
    public ResponseEntity<Map<String, Object>> fetchPrices(
        @RequestParam String date
    ) {
        try {
            LocalDate targetDate = LocalDate.parse(date, DateTimeFormatter.ISO_LOCAL_DATE);
            Map<String, Integer> results = stockPriceService.fetchAndSavePrices(
                java.util.Arrays.asList("AAPL", "MSFT", "GOOGL", "AMZN", "NVDA", "TSLA", "META", "SPY", "QQQ"),
                targetDate
            );

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("date", date);
            response.put("results", results);

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, Object> error = new HashMap<>();
            error.put("success", false);
            error.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }
}
