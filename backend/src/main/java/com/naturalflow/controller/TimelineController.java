package com.naturalflow.controller;

import com.naturalflow.model.FlowTimeline1m;
import com.naturalflow.model.OptionFlow;
import com.naturalflow.repository.FlowTimeline1mRepository;
import com.naturalflow.repo.FlowRepository;
import com.naturalflow.service.TimelineAggregationService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Fast timeline API for pre-aggregated 1-minute flow data
 * Target: <200ms response time (vs 8+ seconds for raw queries)
 */
@RestController
@RequestMapping("/api/timeline")
public class TimelineController {

    private final FlowTimeline1mRepository timelineRepository;
    private final TimelineAggregationService aggregationService;
    private final FlowRepository flowRepository;

    public TimelineController(FlowTimeline1mRepository timelineRepository,
                              TimelineAggregationService aggregationService,
                              FlowRepository flowRepository) {
        this.timelineRepository = timelineRepository;
        this.aggregationService = aggregationService;
        this.flowRepository = flowRepository;
    }

    /**
     * GET /api/timeline/chart?ticker=AAPL&date=2025-11-07&start=09:30&end=16:00
     * Returns 1-minute buckets for charting (cumulative sums for river lines)
     * Target: <200ms
     */
    @GetMapping("/chart")
    public ResponseEntity<Map<String, Object>> getChartData(
            @RequestParam String ticker,
            @RequestParam String date,
            @RequestParam(defaultValue = "09:30") String start,
            @RequestParam(defaultValue = "16:00") String end) {

        try {
            // Parse date and time range
            LocalDateTime startTime = LocalDateTime.parse(date + "T" + start + ":00");
            LocalDateTime endTime = LocalDateTime.parse(date + "T" + end + ":00");

            // Query pre-aggregated buckets
            List<FlowTimeline1m> buckets = timelineRepository.findByTickerAndTimeRange(
                ticker.toUpperCase(),
                startTime,
                endTime
            );

            // Calculate cumulative sums for river lines
            double cumulativeCall = 0.0;
            double cumulativePut = 0.0;
            List<Map<String, Object>> dataPoints = new ArrayList<>();

            for (FlowTimeline1m bucket : buckets) {
                cumulativeCall += bucket.getCallPremium();
                cumulativePut += bucket.getPutPremium();

                Map<String, Object> point = new HashMap<>();
                point.put("timestamp", bucket.getBucketTime());
                point.put("callPremium", bucket.getCallPremium());
                point.put("putPremium", bucket.getPutPremium());
                point.put("callCount", bucket.getCallCount());
                point.put("putCount", bucket.getPutCount());
                point.put("netFlow", bucket.getNetFlow());
                point.put("cumulativeCall", cumulativeCall);
                point.put("cumulativePut", cumulativePut);
                point.put("cumulativeNet", cumulativeCall - cumulativePut);

                dataPoints.add(point);
            }

            Map<String, Object> response = new HashMap<>();
            response.put("ticker", ticker.toUpperCase());
            response.put("date", date);
            response.put("startTime", start);
            response.put("endTime", end);
            response.put("dataPoints", dataPoints);
            response.put("totalBuckets", dataPoints.size());
            response.put("finalCallPremium", cumulativeCall);
            response.put("finalPutPremium", cumulativePut);
            response.put("finalNetFlow", cumulativeCall - cumulativePut);

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            Map<String, Object> error = new HashMap<>();
            error.put("error", e.getMessage());
            error.put("message", "Failed to fetch timeline data");
            return ResponseEntity.badRequest().body(error);
        }
    }

    /**
     * GET /api/timeline/recent?ticker=AAPL&minutes=15
     * Returns recent N minutes of data (for real-time updates)
     * Target: <100ms
     */
    @GetMapping("/recent")
    public ResponseEntity<Map<String, Object>> getRecentData(
            @RequestParam String ticker,
            @RequestParam(defaultValue = "15") int minutes) {

        LocalDateTime since = LocalDateTime.now().minusMinutes(minutes);

        List<FlowTimeline1m> buckets = timelineRepository.findRecentByTicker(
            ticker.toUpperCase(),
            since
        );

        // Reverse order (oldest first for cumulative calculation)
        Collections.reverse(buckets);

        // Calculate cumulative sums
        double cumulativeCall = 0.0;
        double cumulativePut = 0.0;
        List<Map<String, Object>> dataPoints = new ArrayList<>();

        for (FlowTimeline1m bucket : buckets) {
            cumulativeCall += bucket.getCallPremium();
            cumulativePut += bucket.getPutPremium();

            Map<String, Object> point = new HashMap<>();
            point.put("timestamp", bucket.getBucketTime());
            point.put("callPremium", bucket.getCallPremium());
            point.put("putPremium", bucket.getPutPremium());
            point.put("callCount", bucket.getCallCount());
            point.put("putCount", bucket.getPutCount());
            point.put("netFlow", bucket.getNetFlow());
            point.put("cumulativeCall", cumulativeCall);
            point.put("cumulativePut", cumulativePut);
            point.put("cumulativeNet", cumulativeCall - cumulativePut);

            dataPoints.add(point);
        }

        Map<String, Object> response = new HashMap<>();
        response.put("ticker", ticker.toUpperCase());
        response.put("minutes", minutes);
        response.put("dataPoints", dataPoints);
        response.put("count", dataPoints.size());

        return ResponseEntity.ok(response);
    }

    /**
     * GET /api/timeline/current-minute
     * Returns all tickers' data for the current/most recent minute
     * Used by AI bot for real-time market snapshot
     * Target: <50ms
     */
    @GetMapping("/current-minute")
    public ResponseEntity<Map<String, Object>> getCurrentMinute() {

        // Get current minute (rounded down)
        LocalDateTime currentMinute = LocalDateTime.now()
            .withSecond(0)
            .withNano(0);

        List<FlowTimeline1m> buckets = timelineRepository.findAllByBucketTime(currentMinute);

        // Convert to map for easy lookup
        Map<String, Map<String, Object>> tickerData = new HashMap<>();
        for (FlowTimeline1m bucket : buckets) {
            Map<String, Object> data = new HashMap<>();
            data.put("callPremium", bucket.getCallPremium());
            data.put("putPremium", bucket.getPutPremium());
            data.put("callCount", bucket.getCallCount());
            data.put("putCount", bucket.getPutCount());
            data.put("netFlow", bucket.getNetFlow());
            data.put("lastUpdated", bucket.getLastUpdated());

            tickerData.put(bucket.getTicker(), data);
        }

        Map<String, Object> response = new HashMap<>();
        response.put("bucketTime", currentMinute);
        response.put("tickers", tickerData);
        response.put("count", tickerData.size());

        return ResponseEntity.ok(response);
    }

    /**
     * GET /api/timeline/multi-ticker?tickers=AAPL,MSFT,GOOGL&date=2025-11-07&start=09:30&end=16:00
     * Returns data for multiple tickers at once (for dashboard loading)
     * Target: <500ms for 9 tickers
     */
    @GetMapping("/multi-ticker")
    public ResponseEntity<Map<String, Object>> getMultiTickerData(
            @RequestParam String tickers,
            @RequestParam String date,
            @RequestParam(defaultValue = "09:30") String start,
            @RequestParam(defaultValue = "16:00") String end) {

        try {
            // Parse date and time range
            LocalDateTime startTime = LocalDateTime.parse(date + "T" + start + ":00");
            LocalDateTime endTime = LocalDateTime.parse(date + "T" + end + ":00");

            // Split tickers
            String[] tickerArray = tickers.toUpperCase().split(",");

            Map<String, Object> allTickerData = new HashMap<>();

            for (String ticker : tickerArray) {
                ticker = ticker.trim();

                // Query pre-aggregated buckets
                List<FlowTimeline1m> buckets = timelineRepository.findByTickerAndTimeRange(
                    ticker,
                    startTime,
                    endTime
                );

                // Calculate cumulative sums
                double cumulativeCall = 0.0;
                double cumulativePut = 0.0;
                List<Map<String, Object>> dataPoints = new ArrayList<>();

                for (FlowTimeline1m bucket : buckets) {
                    cumulativeCall += bucket.getCallPremium();
                    cumulativePut += bucket.getPutPremium();

                    Map<String, Object> point = new HashMap<>();
                    point.put("timestamp", bucket.getBucketTime());
                    point.put("callPremium", bucket.getCallPremium());
                    point.put("putPremium", bucket.getPutPremium());
                    point.put("callCount", bucket.getCallCount());
                    point.put("putCount", bucket.getPutCount());
                    point.put("netFlow", bucket.getNetFlow());
                    point.put("cumulativeCall", cumulativeCall);
                    point.put("cumulativePut", cumulativePut);
                    point.put("cumulativeNet", cumulativeCall - cumulativePut);

                    dataPoints.add(point);
                }

                Map<String, Object> tickerData = new HashMap<>();
                tickerData.put("dataPoints", dataPoints);
                tickerData.put("totalBuckets", dataPoints.size());
                tickerData.put("finalCallPremium", cumulativeCall);
                tickerData.put("finalPutPremium", cumulativePut);
                tickerData.put("finalNetFlow", cumulativeCall - cumulativePut);

                allTickerData.put(ticker, tickerData);
            }

            Map<String, Object> response = new HashMap<>();
            response.put("date", date);
            response.put("startTime", start);
            response.put("endTime", end);
            response.put("tickers", allTickerData);
            response.put("count", allTickerData.size());

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            Map<String, Object> error = new HashMap<>();
            error.put("error", e.getMessage());
            error.put("message", "Failed to fetch multi-ticker data");
            return ResponseEntity.badRequest().body(error);
        }
    }

    /**
     * GET /api/timeline/health
     * Returns aggregation system health and statistics
     */
    @GetMapping("/health")
    public ResponseEntity<Map<String, Object>> getHealth() {

        LocalDateTime oneDayAgo = LocalDateTime.now().minusDays(1);

        // Get recent bucket count (last 24 hours)
        long recentBuckets = timelineRepository.count();

        // Get list of tickers with recent data
        List<FlowTimeline1m> recentData = timelineRepository
            .findAll()
            .stream()
            .filter(b -> b.getBucketTime().isAfter(oneDayAgo))
            .collect(Collectors.toList());

        Set<String> activeTickers = recentData.stream()
            .map(FlowTimeline1m::getTicker)
            .collect(Collectors.toSet());

        Map<String, Object> response = new HashMap<>();
        response.put("status", "operational");
        response.put("totalBuckets", recentBuckets);
        response.put("last24Hours", recentData.size());
        response.put("activeTickers", new ArrayList<>(activeTickers));
        response.put("activeTickerCount", activeTickers.size());
        response.put("timestamp", LocalDateTime.now());

        return ResponseEntity.ok(response);
    }

    /**
     * POST /api/timeline/backfill?days=7
     * Backfill aggregations for existing historical data
     * Use this once after enabling the aggregation system
     */
    @PostMapping("/backfill")
    public ResponseEntity<Map<String, Object>> backfillAggregations(
            @RequestParam(defaultValue = "7") int days) {

        try {
            long startTime = System.currentTimeMillis();

            // Get all trades from the last N days
            Instant cutoff = Instant.now().minus(days, java.time.temporal.ChronoUnit.DAYS);
            List<OptionFlow> flows = flowRepository.findAllByTsUtcAfter(cutoff);

            // Backfill aggregations
            int count = aggregationService.backfillAggregations(flows);

            long duration = System.currentTimeMillis() - startTime;

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("tradesProcessed", count);
            response.put("daysBackfilled", days);
            response.put("durationMs", duration);
            response.put("tradesPerSecond", count / (duration / 1000.0));
            response.put("message", String.format("Backfilled %d trades in %.2f seconds", count, duration / 1000.0));

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            Map<String, Object> error = new HashMap<>();
            error.put("success", false);
            error.put("error", e.getMessage());
            error.put("message", "Failed to backfill aggregations");
            return ResponseEntity.badRequest().body(error);
        }
    }
}
