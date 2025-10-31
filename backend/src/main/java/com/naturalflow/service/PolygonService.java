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

@Service
public class PolygonService {

    private static final Logger log = LoggerFactory.getLogger(PolygonService.class);

    @Value("${polygon.api.key}")
    private String apiKey;

    @Value("${polygon.api.enabled:false}")
    private boolean enabled;

    private final FlowService flowService;
    private final OkHttpClient httpClient;
    private final ObjectMapper objectMapper;
    private long lastPollTimestamp;

    public PolygonService(FlowService flowService) {
        this.flowService = flowService;
        this.httpClient = new OkHttpClient.Builder()
            .connectTimeout(10, TimeUnit.SECONDS)
            .readTimeout(30, TimeUnit.SECONDS)
            .build();
        this.objectMapper = new ObjectMapper();
        this.lastPollTimestamp = System.currentTimeMillis() - 60000; // Start from 1 minute ago
    }

    /**
     * Poll Polygon API for new options trades every 5 seconds
     *
     * Polygon Options Trades API:
     * https://api.polygon.io/v3/trades/options
     *
     * Note: Adjust the endpoint based on your Polygon subscription tier
     */
    @Scheduled(fixedRate = 5000) // Every 5 seconds
    public void pollPolygonOptionsFlow() {
        if (!enabled) {
            log.debug("Polygon polling is disabled. Set polygon.api.enabled=true to enable.");
            return;
        }

        if (apiKey == null || apiKey.isEmpty() || apiKey.equals("your-polygon-api-key")) {
            log.warn("Polygon API key not configured. Set POLYGON_API_KEY environment variable.");
            return;
        }

        try {
            long currentTime = System.currentTimeMillis();

            // Build Polygon API URL
            // Using options trades endpoint - adjust based on your subscription
            String url = String.format(
                "https://api.polygon.io/v3/trades/options?timestamp.gte=%d&timestamp.lte=%d&limit=1000&apiKey=%s",
                lastPollTimestamp,
                currentTime,
                apiKey
            );

            log.debug("Polling Polygon: {} to {}",
                Instant.ofEpochMilli(lastPollTimestamp),
                Instant.ofEpochMilli(currentTime));

            Request request = new Request.Builder()
                .url(url)
                .get()
                .build();

            try (Response response = httpClient.newCall(request).execute()) {
                if (!response.isSuccessful()) {
                    log.error("Polygon API error: {} - {}", response.code(), response.message());
                    return;
                }

                if (response.body() == null) {
                    log.warn("Polygon API returned empty body");
                    return;
                }

                String json = response.body().string();
                JsonNode root = objectMapper.readTree(json);

                // Check for errors
                if (root.has("status") && !root.get("status").asText().equals("OK")) {
                    log.error("Polygon API status not OK: {}", root.get("status").asText());
                    if (root.has("error")) {
                        log.error("Error details: {}", root.get("error").asText());
                    }
                    return;
                }

                // Parse results array
                JsonNode results = root.get("results");
                if (results == null || !results.isArray() || results.size() == 0) {
                    log.debug("No new trades found in this interval");
                    lastPollTimestamp = currentTime;
                    return;
                }

                int ingestedCount = 0;
                for (JsonNode trade : results) {
                    try {
                        flowService.ingestFromRawJson(trade.toString());
                        ingestedCount++;
                    } catch (Exception e) {
                        log.error("Failed to ingest trade: {}", e.getMessage());
                    }
                }

                log.info("Successfully ingested {} options trades from Polygon", ingestedCount);
                lastPollTimestamp = currentTime;

            } catch (Exception e) {
                log.error("Error processing Polygon response: {}", e.getMessage(), e);
            }

        } catch (Exception e) {
            log.error("Error polling Polygon API: {}", e.getMessage(), e);
        }
    }

    /**
     * Manual fetch for testing - call this via a controller endpoint if needed
     */
    public void fetchHistoricalData(String ticker, long startTimestamp, long endTimestamp) {
        try {
            String url = String.format(
                "https://api.polygon.io/v3/trades/options?ticker=%s&timestamp.gte=%d&timestamp.lte=%d&limit=5000&apiKey=%s",
                ticker,
                startTimestamp,
                endTimestamp,
                apiKey
            );

            Request request = new Request.Builder()
                .url(url)
                .get()
                .build();

            try (Response response = httpClient.newCall(request).execute()) {
                if (response.isSuccessful() && response.body() != null) {
                    String json = response.body().string();
                    JsonNode root = objectMapper.readTree(json);
                    JsonNode results = root.get("results");

                    if (results != null && results.isArray()) {
                        for (JsonNode trade : results) {
                            flowService.ingestFromRawJson(trade.toString());
                        }
                        log.info("Fetched {} historical trades for {}", results.size(), ticker);
                    }
                }
            }
        } catch (Exception e) {
            log.error("Error fetching historical data: {}", e.getMessage(), e);
        }
    }
}
