package com.naturalflow.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.naturalflow.model.StockPrice;
import com.naturalflow.repo.StockPriceRepository;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.Response;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.*;

/**
 * Stock Price Service
 *
 * Fetches stock prices from Polygon/Massive API
 * Used for:
 * - Real-time OTM checking during ingestion
 * - Historical price data for backtesting
 * - Price overlays on charts
 */
@Service
public class StockPriceService {

    private static final Logger log = LoggerFactory.getLogger(StockPriceService.class);

    @Value("${polygon.api.key}")
    private String apiKey;

    private final StockPriceRepository repository;
    private final OkHttpClient httpClient;
    private final ObjectMapper objectMapper;

    // Cache for real-time price lookups (avoid hammering API)
    private final Map<String, CachedPrice> priceCache = new HashMap<>();
    private static final long CACHE_TTL_MS = 5000; // 5 seconds

    public StockPriceService(StockPriceRepository repository) {
        this.repository = repository;
        this.httpClient = new OkHttpClient();
        this.objectMapper = new ObjectMapper();
    }

    /**
     * Get current stock price (real-time or cached)
     * Used for live OTM checking
     */
    public BigDecimal getCurrentPrice(String symbol) {
        // Check cache first
        CachedPrice cached = priceCache.get(symbol);
        if (cached != null && !cached.isExpired()) {
            log.debug("Using cached price for {}: ${}", symbol, cached.price);
            return cached.price;
        }

        // Fetch from API
        try {
            String url = String.format(
                "https://api.polygon.io/v2/snapshot/locale/us/markets/stocks/tickers/%s?apiKey=%s",
                symbol, apiKey
            );

            Request request = new Request.Builder().url(url).build();
            Response response = httpClient.newCall(request).execute();

            if (response.isSuccessful() && response.body() != null) {
                String json = response.body().string();
                JsonNode root = objectMapper.readTree(json);

                if (root.has("ticker") && root.get("ticker").has("lastTrade")) {
                    BigDecimal price = root.get("ticker").get("lastTrade").get("p").decimalValue();
                    log.info("Fetched current price for {}: ${}", symbol, price);

                    // Cache it
                    priceCache.put(symbol, new CachedPrice(price));

                    return price;
                }
            }
        } catch (Exception e) {
            log.error("Failed to fetch current price for {}: {}", symbol, e.getMessage());
        }

        return null;
    }

    /**
     * Fetch historical intraday prices for a specific date
     * Used for replay and backtesting
     * Returns 1-minute bars for entire trading day
     */
    public List<StockPrice> fetchHistoricalPrices(String symbol, LocalDate date) {
        try {
            String dateStr = date.format(DateTimeFormatter.ISO_LOCAL_DATE);

            String url = String.format(
                "https://api.polygon.io/v2/aggs/ticker/%s/range/1/minute/%s/%s?adjusted=true&sort=asc&apiKey=%s",
                symbol, dateStr, dateStr, apiKey
            );

            log.info("Fetching historical prices: {}", url);

            Request request = new Request.Builder().url(url).build();
            Response response = httpClient.newCall(request).execute();

            if (response.isSuccessful() && response.body() != null) {
                String json = response.body().string();
                JsonNode root = objectMapper.readTree(json);

                List<StockPrice> prices = new ArrayList<>();

                if (root.has("results")) {
                    JsonNode results = root.get("results");
                    for (JsonNode bar : results) {
                        StockPrice price = new StockPrice();
                        price.setSymbol(symbol);
                        price.setTimestamp(Instant.ofEpochMilli(bar.get("t").asLong()));
                        price.setOpen(bar.get("o").decimalValue());
                        price.setHigh(bar.get("h").decimalValue());
                        price.setLow(bar.get("l").decimalValue());
                        price.setClose(bar.get("c").decimalValue());
                        price.setVolume(bar.get("v").asLong());
                        price.setSrc("polygon");

                        prices.add(price);
                    }

                    log.info("Fetched {} price bars for {} on {}", prices.size(), symbol, date);
                }

                return prices;
            }
        } catch (Exception e) {
            log.error("Failed to fetch historical prices for {} on {}: {}", symbol, date, e.getMessage());
        }

        return new ArrayList<>();
    }

    /**
     * Fetch and save historical prices for multiple symbols
     */
    public Map<String, Integer> fetchAndSavePrices(List<String> symbols, LocalDate date) {
        Map<String, Integer> results = new HashMap<>();

        for (String symbol : symbols) {
            List<StockPrice> prices = fetchHistoricalPrices(symbol, date);
            if (!prices.isEmpty()) {
                repository.saveAll(prices);
                results.put(symbol, prices.size());
                log.info("Saved {} price bars for {}", prices.size(), symbol);
            } else {
                results.put(symbol, 0);
                log.warn("No price data found for {} on {}", symbol, date);
            }

            // Rate limiting - wait 200ms between API calls
            try {
                Thread.sleep(200);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }
        }

        return results;
    }

    /**
     * Get price closest to a specific timestamp
     * Used for historical OTM checking
     */
    public BigDecimal getPriceAtTime(String symbol, Instant timestamp) {
        Optional<StockPrice> price = repository.findClosestPriceBeforeTimestamp(symbol, timestamp);
        return price.map(StockPrice::getClose).orElse(null);
    }

    /**
     * Get all prices for a symbol within a time range
     * Used for chart overlays
     */
    public List<StockPrice> getPricesInRange(String symbol, Instant start, Instant end) {
        return repository.findBySymbolAndTimestampBetweenOrderByTimestampAsc(symbol, start, end);
    }

    /**
     * Check if we have price data for a date
     */
    public boolean hasPriceData(String symbol, LocalDate date) {
        Instant start = date.atStartOfDay(ZoneId.of("America/New_York")).toInstant();
        Instant end = date.plusDays(1).atStartOfDay(ZoneId.of("America/New_York")).toInstant();
        return repository.hasPriceDataForDate(symbol, start, end);
    }

    /**
     * Simple price cache
     */
    private static class CachedPrice {
        final BigDecimal price;
        final long timestamp;

        CachedPrice(BigDecimal price) {
            this.price = price;
            this.timestamp = System.currentTimeMillis();
        }

        boolean isExpired() {
            return System.currentTimeMillis() - timestamp > CACHE_TTL_MS;
        }
    }
}
