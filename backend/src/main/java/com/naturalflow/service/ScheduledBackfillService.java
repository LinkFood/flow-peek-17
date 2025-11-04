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
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.TimeUnit;
import java.util.stream.Collectors;

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

    @Value("${polygon.api.ref-base-url:https://api.polygon.io}")
    private String polygonRefBaseUrl;

    @Value("${polygon.api.trades-base-url:https://delayed.polygon.io}")
    private String polygonTradesBaseUrl;

    @Value("${polygon.backfill.enabled:true}")
    private boolean enabled;

    @Value("${polygon.backfill.contracts-per-ticker:40}")
    private int contractsPerTicker;

    @Value("${polygon.backfill.days-to-expiry-max:14}")
    private int daysToExpiryMax;

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

        long endTime = System.currentTimeMillis(); // now (will get delayed data automatically)
        long startTime = endTime - (2 * 60 * 60 * 1000); // last 2 hours

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
     * List option contracts for an underlying ticker
     * Uses Polygon Reference API: GET /v3/reference/options/contracts
     */
    private List<String> listContractsForUnderlying(String underlying, LocalDate asOf) {
        return listContractsForUnderlyingWithHost(underlying, asOf, polygonRefBaseUrl, false);
    }

    private List<String> listContractsForUnderlyingWithHost(String underlying, LocalDate asOf, String baseUrl, boolean isRetry) {
        try {
            String url = String.format(
                "%s/v3/reference/options/contracts?underlying_ticker=%s&as_of=%s&expired=false&order=asc&sort=expiration_date&limit=%d&apiKey=%s",
                baseUrl,
                underlying,
                asOf.format(DateTimeFormatter.ISO_LOCAL_DATE),
                contractsPerTicker * 2,
                apiKey
            );

            log.debug("Fetching contracts for {} from {}: {}", underlying, baseUrl, url.replace(apiKey, "***"));

            Request request = new Request.Builder()
                .url(url)
                .get()
                .build();

            try (Response response = httpClient.newCall(request).execute()) {
                if (!response.isSuccessful()) {
                    String errorBody = response.body() != null ? response.body().string() : "";
                    log.warn("Failed to fetch contracts for {} from {}: {} - {} | Body: {}", 
                        underlying, baseUrl, response.code(), response.message(), 
                        errorBody.substring(0, Math.min(200, errorBody.length())));
                    
                    // Retry on api.polygon.io if we got 404 on delayed host and haven't retried yet
                    if (response.code() == 404 && !isRetry && !baseUrl.contains("api.polygon.io")) {
                        log.info("Retrying contract listing for {} on api.polygon.io", underlying);
                        return listContractsForUnderlyingWithHost(underlying, asOf, "https://api.polygon.io", true);
                    }
                    
                    return new ArrayList<>();
                }

                if (response.body() == null) {
                    return new ArrayList<>();
                }

                String json = response.body().string();
                JsonNode root = objectMapper.readTree(json);

                if (!root.has("status") || !root.get("status").asText().equals("OK")) {
                    log.warn("Non-OK status for {} contracts: {}", underlying, 
                        root.has("status") ? root.get("status").asText() : "unknown");
                    return new ArrayList<>();
                }

                JsonNode results = root.get("results");
                if (results == null || !results.isArray() || results.size() == 0) {
                    log.info("No contracts found for {}", underlying);
                    return new ArrayList<>();
                }

                // Filter contracts by expiry date and limit
                LocalDate maxExpiry = asOf.plusDays(daysToExpiryMax);
                List<String> contracts = new ArrayList<>();
                
                for (JsonNode contract : results) {
                    if (contracts.size() >= contractsPerTicker) {
                        break;
                    }
                    
                    String ticker = contract.get("ticker").asText();
                    String expiryStr = contract.get("expiration_date").asText();
                    LocalDate expiry = LocalDate.parse(expiryStr);
                    
                    // Only include contracts expiring within the max days window
                    if (!expiry.isAfter(maxExpiry)) {
                        contracts.add(ticker);
                    }
                }

                log.info("Selected {} contracts for {} (expiring within {} days)", 
                    contracts.size(), underlying, daysToExpiryMax);
                return contracts;

            } catch (Exception e) {
                log.error("Error processing contracts response for {}: {}", underlying, e.getMessage());
                return new ArrayList<>();
            }

        } catch (Exception e) {
            log.error("Error fetching contracts for {}: {}", underlying, e.getMessage());
            return new ArrayList<>();
        }
    }

    /**
     * Fetch trades for a specific ticker using contract discovery approach
     * 
     * Steps:
     * 1. List option contracts for the underlying ticker
     * 2. For each contract, fetch trades from Polygon Trades API
     * 3. Handle pagination via next_url
     */
    private int fetchTradesForTicker(String ticker, long startTimestamp, long endTimestamp) {
        try {
            log.info("Fetching {} trades from {} to {}", 
                ticker,
                Instant.ofEpochMilli(startTimestamp),
                Instant.ofEpochMilli(endTimestamp));

            // Step 1: Get contracts for this ticker
            LocalDate asOf = LocalDate.now();
            List<String> contracts = listContractsForUnderlying(ticker, asOf);
            
            if (contracts.isEmpty()) {
                log.info("{}: No contracts found, skipping", ticker);
                return 0;
            }

            int totalIngested = 0;
            int contractsProcessed = 0;

            // Step 2: Fetch trades for each contract
            for (String contract : contracts) {
                try {
                    int ingested = fetchTradesForContract(contract, startTimestamp, endTimestamp);
                    totalIngested += ingested;
                    contractsProcessed++;

                    // Throttle to avoid rate limits
                    if (contractsProcessed < contracts.size()) {
                        Thread.sleep(150); // 150ms between contract calls
                    }

                } catch (Exception e) {
                    log.error("Error fetching trades for contract {}: {}", contract, e.getMessage());
                }
            }

            if (totalIngested > 0) {
                log.info("📊 {}: {} trades ingested from {} contracts", 
                    ticker, totalIngested, contractsProcessed);
            } else {
                log.info("{}: 0 trades ingested from {} contracts", ticker, contractsProcessed);
            }

            return totalIngested;

        } catch (Exception e) {
            log.error("Error fetching {} trades: {}", ticker, e.getMessage());
            return 0;
        }
    }

    /**
     * Fetch trades for a specific options contract
     * Endpoint: GET /v3/trades/{contract}
     */
    private int fetchTradesForContract(String contract, long startTimestamp, long endTimestamp) {
        return fetchTradesForContractWithHost(contract, startTimestamp, endTimestamp, polygonTradesBaseUrl, false);
    }

    private int fetchTradesForContractWithHost(String contract, long startTimestamp, long endTimestamp, String baseUrl, boolean isRetry) {
        try {
            String url = String.format(
                "%s/v3/trades/%s?timestamp.gte=%d&timestamp.lte=%d&order=asc&sort=timestamp&limit=50000&apiKey=%s",
                baseUrl,
                contract,
                startTimestamp * 1000000,
                endTimestamp * 1000000,
                apiKey
            );

            int totalIngested = 0;
            int pageCount = 0;
            String nextUrl = url;

            // Pagination loop (cap at 5 pages per contract)
            while (nextUrl != null && pageCount < 5) {
                pageCount++;
                
                // If next_url uses api.polygon.io, rewrite to our base URL
                if (nextUrl.startsWith("https://api.polygon.io")) {
                    nextUrl = nextUrl.replace("https://api.polygon.io", baseUrl);
                }
                
                Request request = new Request.Builder()
                    .url(nextUrl)
                    .get()
                    .build();

                try (Response response = httpClient.newCall(request).execute()) {
                    if (!response.isSuccessful()) {
                        if (response.code() == 404) {
                            // Retry on api.polygon.io if we got 404 on delayed host and this is first page
                            if (!isRetry && pageCount == 1 && !baseUrl.contains("api.polygon.io")) {
                                log.info("Retrying trades for {} on api.polygon.io", contract);
                                return fetchTradesForContractWithHost(contract, startTimestamp, endTimestamp, "https://api.polygon.io", true);
                            }
                            log.debug("{}: No trades found (404)", contract);
                        } else {
                            String errorBody = response.body() != null ? response.body().string() : "";
                            log.warn("{}: API error from {} (page {}): {} - {}", 
                                contract, baseUrl, pageCount, response.code(), response.message());
                        }
                        break;
                    }

                    if (response.body() == null) {
                        break;
                    }

                    String json = response.body().string();
                    JsonNode root = objectMapper.readTree(json);

                    if (!root.has("status") || !root.get("status").asText().equals("OK")) {
                        break;
                    }

                    JsonNode results = root.get("results");
                    if (results == null || !results.isArray() || results.size() == 0) {
                        break;
                    }

                    // Ingest trades from this page
                    for (JsonNode trade : results) {
                        try {
                            flowService.ingestFromRawJson(trade.toString());
                            totalIngested++;
                        } catch (Exception e) {
                            // Skip invalid trades silently
                        }
                    }

                    log.debug("{}: page {} - {} trades ingested", contract, pageCount, results.size());

                    // Check for next page
                    if (root.has("next_url")) {
                        nextUrl = root.get("next_url").asText();
                        if (!nextUrl.contains("apiKey=")) {
                            nextUrl += "&apiKey=" + apiKey;
                        }
                        Thread.sleep(100); // Small delay between pages
                    } else {
                        nextUrl = null;
                    }

                } catch (Exception e) {
                    log.error("{}: Error processing response (page {}): {}", contract, pageCount, e.getMessage());
                    break;
                }
            }

            if (totalIngested > 0) {
                log.info("{}: {} trades ingested across {} pages", contract, totalIngested, pageCount);
            }

            return totalIngested;

        } catch (Exception e) {
            log.error("Error fetching trades for {}: {}", contract, e.getMessage());
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

    /**
     * One-time historical backfill - loads 30 days of data for pattern learning
     * Run this once to populate the database with historical trades
     */
    public Map<String, Integer> loadHistoricalData(int daysBack) {
        log.info("🔄 Starting historical backfill for {} days...", daysBack);
        
        Map<String, Integer> results = new HashMap<>();
        long endTime = System.currentTimeMillis() - (15 * 60 * 1000); // 15 min ago
        
        for (String ticker : TRACKED_TICKERS) {
            int totalForTicker = 0;
            
            // Fetch in 24-hour chunks to avoid API limits
            for (int day = 0; day < daysBack; day++) {
                long chunkEnd = endTime - (day * 24 * 60 * 60 * 1000L);
                long chunkStart = chunkEnd - (24 * 60 * 60 * 1000L);
                
                try {
                    int count = fetchTradesForTicker(ticker, chunkStart, chunkEnd);
                    totalForTicker += count;
                    
                    log.info("📊 {}: Day {} complete - {} trades ingested", ticker, day + 1, count);
                    
                    // Small delay to avoid rate limiting
                    Thread.sleep(1000);
                    
                } catch (Exception e) {
                    log.error("Error fetching historical data for {} day {}: {}", ticker, day, e.getMessage());
                }
            }
            
            results.put(ticker, totalForTicker);
            log.info("✅ {}: Historical backfill complete - {} total trades", ticker, totalForTicker);
        }
        
        int grandTotal = results.values().stream().mapToInt(Integer::intValue).sum();
        log.info("🎉 Historical backfill complete: {} trades across {} tickers over {} days", 
            grandTotal, TRACKED_TICKERS.length, daysBack);
        
        return results;
    }
}
