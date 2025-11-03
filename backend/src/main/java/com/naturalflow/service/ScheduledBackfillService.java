package com.naturalflow.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.Response;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.concurrent.TimeUnit;

/**
 * Scheduled Backfill Service - Fetches recent real options trades from Polygon REST API
 * 
 * Runs every 2 minutes to fetch the last 15 minutes of MAG7 options trades
 * This ensures the database stays populated even when WebSocket is quiet
 * 
 * Uses Polygon's delayed endpoint (15-min delay) - same as WebSocket
 */
@Service
public class ScheduledBackfillService {

    private static final Logger log = LoggerFactory.getLogger(ScheduledBackfillService.class);

    // MAG7 + SPY + QQQ
    private static final String[] TRACKED_TICKERS = {
        "AAPL", "MSFT", "GOOGL", "AMZN", "NVDA", "TSLA", "META", "SPY", "QQQ"
    };

    @Value("${polygon.api.key}")
    private String apiKey;

    @Value("${polygon.backfill.enabled:true}")
    private boolean enabled;

    private final FlowService flowService;
    private final OkHttpClient httpClient;
    private final ObjectMapper objectMapper;

    public ScheduledBackfillService(FlowService flowService) {
        this.flowService = flowService;
        this.httpClient = new OkHttpClient.Builder()
            .connectTimeout(15, TimeUnit.SECONDS)
            .readTimeout(45, TimeUnit.SECONDS)
            .build();
        this.objectMapper = new ObjectMapper();
    }

    /**
     * Fetch recent trades for MAG7 tickers every 2 minutes
     * Fetches last 15 minutes of data (matches delayed WebSocket delay)
     */
    @Scheduled(fixedRate = 120000, initialDelay = 30000) // Every 2 minutes, start after 30s
    public void backfillRecentTrades() {
        if (!enabled) {
            log.debug("Scheduled backfill is disabled. Set POLYGON_BACKFILL_ENABLED=true to enable.");
            return;
        }

        if (apiKey == null || apiKey.isEmpty() || apiKey.equals("your-polygon-api-key")) {
            log.warn("Polygon API key not configured. Cannot backfill data.");
            return;
        }

        log.info("🔄 Starting scheduled backfill for {} tickers...", TRACKED_TICKERS.length);

        long endTime = System.currentTimeMillis() - (15 * 60 * 1000); // 15 min ago (delayed feed)
        long startTime = endTime - (15 * 60 * 1000); // 15 min before that (30 min window)

        int totalIngested = 0;
        int tickersProcessed = 0;

        for (String ticker : TRACKED_TICKERS) {
            try {
                int ingested = fetchTradesForTicker(ticker, startTime, endTime);
                totalIngested += ingested;
                tickersProcessed++;

                // Small delay between tickers to avoid rate limits
                if (tickersProcessed < TRACKED_TICKERS.length) {
                    Thread.sleep(500); // 500ms between tickers
                }

            } catch (Exception e) {
                log.error("Error backfilling {} trades: {}", ticker, e.getMessage());
            }
        }

        if (totalIngested > 0) {
            log.info("✅ Backfill complete: {} trades ingested across {} tickers", 
                totalIngested, tickersProcessed);
        } else {
            log.debug("No new trades found in this backfill cycle");
        }
    }

    /**
     * Fetch trades for a specific ticker using Polygon Trades API
     * Endpoint: GET /v3/trades/{optionsTicker}
     * 
     * Note: This fetches trades for ALL options on the underlying ticker
     * We filter client-side for $50K+ premium and 0-30 DTE
     */
    private int fetchTradesForTicker(String ticker, long startTimestamp, long endTimestamp) {
        try {
            // Polygon options ticker format: O:AAPL (with O: prefix for all options on AAPL)
            String optionsTicker = "O:" + ticker;
            
            // Use Polygon v3 trades API with wildcard for all options on this ticker
            // Note: This requires Options Starter plan or higher
            String url = String.format(
                "https://api.polygon.io/v3/trades/%s?timestamp.gte=%d&timestamp.lte=%d&limit=50000&order=asc&apiKey=%s",
                optionsTicker,
                startTimestamp * 1000000, // Convert to nanoseconds
                endTimestamp * 1000000,   // Convert to nanoseconds
                apiKey
            );

            log.debug("Fetching {} trades from {} to {}", 
                ticker,
                Instant.ofEpochMilli(startTimestamp),
                Instant.ofEpochMilli(endTimestamp));

            Request request = new Request.Builder()
                .url(url)
                .get()
                .build();

            try (Response response = httpClient.newCall(request).execute()) {
                if (!response.isSuccessful()) {
                    log.warn("Polygon API error for {}: {} - {}", 
                        ticker, response.code(), response.message());
                    return 0;
                }

                if (response.body() == null) {
                    log.warn("Empty response for {}", ticker);
                    return 0;
                }

                String json = response.body().string();
                JsonNode root = objectMapper.readTree(json);

                // Check status
                if (!root.has("status") || !root.get("status").asText().equals("OK")) {
                    String status = root.has("status") ? root.get("status").asText() : "unknown";
                    log.warn("Non-OK status for {}: {}", ticker, status);
                    return 0;
                }

                // Parse results
                JsonNode results = root.get("results");
                if (results == null || !results.isArray() || results.size() == 0) {
                    log.debug("No trades found for {}", ticker);
                    return 0;
                }

                // Ingest all trades (FlowService will filter for $50K+ and 0-30 DTE)
                int ingestedCount = 0;
                for (JsonNode trade : results) {
                    try {
                        // Convert Polygon REST format to match WebSocket format if needed
                        flowService.ingestFromRawJson(trade.toString());
                        ingestedCount++;
                    } catch (Exception e) {
                        log.debug("Skipped trade (likely filtered): {}", e.getMessage());
                    }
                }

                if (ingestedCount > 0) {
                    log.info("📊 {}: {} trades ingested", ticker, ingestedCount);
                }

                return ingestedCount;

            } catch (Exception e) {
                log.error("Error processing {} response: {}", ticker, e.getMessage());
                return 0;
            }

        } catch (Exception e) {
            log.error("Error fetching {} trades: {}", ticker, e.getMessage());
            return 0;
        }
    }

    /**
     * Manual trigger for testing - can be called via controller
     */
    public int manualBackfill(String ticker, int hoursBack) {
        long endTime = System.currentTimeMillis() - (15 * 60 * 1000); // 15 min ago
        long startTime = endTime - (hoursBack * 60 * 60 * 1000); // N hours back
        
        log.info("Manual backfill triggered for {} - {} hours back", ticker, hoursBack);
        return fetchTradesForTicker(ticker, startTime, endTime);
    }
}
