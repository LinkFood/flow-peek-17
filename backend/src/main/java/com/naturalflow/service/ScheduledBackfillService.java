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
     * Fetch trades for a specific ticker using Polygon Options Trades API
     * Endpoint: GET /v3/trades/options?underlying_ticker={TICKER}
     * 
     * This fetches all options trades for the underlying ticker with pagination support
     */
    private int fetchTradesForTicker(String ticker, long startTimestamp, long endTimestamp) {
        try {
            // Use Polygon v3 options trades API with underlying_ticker filter
            String url = String.format(
                "https://api.polygon.io/v3/trades/options?underlying_ticker=%s&timestamp.gte=%d&timestamp.lte=%d&order=asc&sort=timestamp&limit=5000&apiKey=%s",
                ticker,
                startTimestamp * 1000000, // Convert to nanoseconds
                endTimestamp * 1000000,   // Convert to nanoseconds
                apiKey
            );

            log.info("Fetching {} trades from {} to {}", 
                ticker,
                Instant.ofEpochMilli(startTimestamp),
                Instant.ofEpochMilli(endTimestamp));

            int totalIngested = 0;
            int pageCount = 0;
            String nextUrl = url;

            // Pagination loop (cap at 10 pages to avoid infinite loops)
            while (nextUrl != null && pageCount < 10) {
                pageCount++;
                
                Request request = new Request.Builder()
                    .url(nextUrl)
                    .get()
                    .build();

                try (Response response = httpClient.newCall(request).execute()) {
                    if (!response.isSuccessful()) {
                        log.warn("Polygon API error for {} (page {}): {} - {}", 
                            ticker, pageCount, response.code(), response.message());
                        break;
                    }

                    if (response.body() == null) {
                        log.warn("Empty response for {} (page {})", ticker, pageCount);
                        break;
                    }

                    String json = response.body().string();
                    JsonNode root = objectMapper.readTree(json);

                    // Check status
                    if (!root.has("status") || !root.get("status").asText().equals("OK")) {
                        String status = root.has("status") ? root.get("status").asText() : "unknown";
                        log.warn("Non-OK status for {} (page {}): {} - Response: {}", 
                            ticker, pageCount, status, json.substring(0, Math.min(500, json.length())));
                        break;
                    }

                    // Parse results
                    JsonNode results = root.get("results");
                    if (results == null || !results.isArray() || results.size() == 0) {
                        log.info("{}: 0 trades returned (page {})", ticker, pageCount);
                        break;
                    }

                    // Ingest trades from this page
                    int pageIngested = 0;
                    for (JsonNode trade : results) {
                        try {
                            flowService.ingestFromRawJson(trade.toString());
                            pageIngested++;
                        } catch (Exception e) {
                            log.debug("Skipped trade (likely filtered): {}", e.getMessage());
                        }
                    }

                    totalIngested += pageIngested;
                    log.info("{}: page {} - {} trades ingested from {} results", 
                        ticker, pageCount, pageIngested, results.size());

                    // Check for next page
                    if (root.has("next_url")) {
                        nextUrl = root.get("next_url").asText();
                        // Add API key to next_url if not present
                        if (!nextUrl.contains("apiKey=")) {
                            nextUrl += "&apiKey=" + apiKey;
                        }
                        Thread.sleep(100); // Small delay between pages
                    } else {
                        nextUrl = null;
                    }

                } catch (Exception e) {
                    log.error("Error processing {} response (page {}): {}", ticker, pageCount, e.getMessage());
                    break;
                }
            }

            if (totalIngested > 0) {
                log.info("📊 {}: {} trades ingested total across {} pages (window {} - {})", 
                    ticker, totalIngested, pageCount,
                    Instant.ofEpochMilli(startTimestamp),
                    Instant.ofEpochMilli(endTimestamp));
            } else {
                log.info("{}: 0 trades ingested", ticker);
            }

            return totalIngested;

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
