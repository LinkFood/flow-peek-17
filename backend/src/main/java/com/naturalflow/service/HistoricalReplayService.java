package com.naturalflow.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.naturalflow.config.Constants;
import com.naturalflow.model.OptionFlow;
import com.naturalflow.model.StockPrice;
import com.naturalflow.repo.FlowRepository;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.Response;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.*;
import java.time.format.DateTimeFormatter;
import java.util.*;

/**
 * Historical Replay Service
 *
 * Replays past trading days through the system
 * Used for:
 * - Testing filtering logic on weekends
 * - Backtesting patterns
 * - Building initial pattern library
 * - Validating system works before going live
 */
@Service
public class HistoricalReplayService {

    private static final Logger log = LoggerFactory.getLogger(HistoricalReplayService.class);

    @Value("${polygon.api.key}")
    private String apiKey;

    private final FlowRepository flowRepository;
    private final StockPriceService stockPriceService;
    private final TradeValidationService validationService;
    private final OkHttpClient httpClient;
    private final ObjectMapper objectMapper;

    public HistoricalReplayService(
        FlowRepository flowRepository,
        StockPriceService stockPriceService,
        TradeValidationService validationService
    ) {
        this.flowRepository = flowRepository;
        this.stockPriceService = stockPriceService;
        this.validationService = validationService;
        this.httpClient = new OkHttpClient();
        this.objectMapper = new ObjectMapper();
    }

    /**
     * Replay a full trading day
     * Fetches options trades and stock prices, runs through validation pipeline
     */
    public Map<String, Object> replayTradingDay(LocalDate date) {
        log.info("🔄 Starting replay for trading day: {}", date);

        int totalFetched = 0;
        int totalIngested = 0;
        int filteredOut = 0;
        Map<String, Integer> perTickerStats = new HashMap<>();

        try {
            // Step 1: Fetch and save stock prices for the day
            log.info("📊 Fetching stock prices for {}...", date);
            Map<String, Integer> priceResults = stockPriceService.fetchAndSavePrices(
                Constants.MAG7_TICKERS,
                date
            );
            log.info("✅ Stock prices fetched: {}", priceResults);

            // Step 2: Build price lookup map (for fast OTM checking)
            Map<String, Map<Instant, BigDecimal>> priceLookup = buildPriceLookup(date);

            // Step 3: For each ticker, fetch options trades
            for (String ticker : Constants.MAG7_TICKERS) {
                log.info("📡 Fetching options trades for {}...", ticker);

                List<OptionFlow> trades = fetchHistoricalOptionsTrades(ticker, date);
                totalFetched += trades.size();

                int ingested = 0;
                int filtered = 0;

                // Step 4: Process each trade through validation pipeline
                for (OptionFlow trade : trades) {
                    // Get stock price at time of trade
                    BigDecimal stockPrice = findClosestPrice(
                        priceLookup.get(ticker),
                        trade.getTsUtc()
                    );

                    if (stockPrice == null) {
                        log.warn("No price data for {} at {}, skipping", ticker, trade.getTsUtc());
                        filtered++;
                        continue;
                    }

                    // Run through validation (same logic as live)
                    if (validationService.shouldIngestTrade(trade, stockPrice)) {
                        // Enrich with calculated fields
                        validationService.enrichTrade(trade, stockPrice);

                        // Mark as replay data
                        trade.setSrc("replay-" + date);

                        // Save to database
                        flowRepository.save(trade);
                        ingested++;
                    } else {
                        filtered++;
                    }
                }

                totalIngested += ingested;
                filteredOut += filtered;
                perTickerStats.put(ticker, ingested);

                log.info("✅ {}: {} fetched, {} ingested, {} filtered",
                    ticker, trades.size(), ingested, filtered);

                // Rate limiting
                Thread.sleep(200);
            }

            log.info("🎉 Replay complete for {}: {} total fetched, {} ingested, {} filtered",
                date, totalFetched, totalIngested, filteredOut);

            // Build response
            Map<String, Object> result = new HashMap<>();
            result.put("success", true);
            result.put("date", date.toString());
            result.put("totalFetched", totalFetched);
            result.put("totalIngested", totalIngested);
            result.put("filteredOut", filteredOut);
            result.put("perTicker", perTickerStats);
            return result;

        } catch (Exception e) {
            log.error("❌ Replay failed for {}: {}", date, e.getMessage(), e);

            Map<String, Object> error = new HashMap<>();
            error.put("success", false);
            error.put("error", e.getMessage());
            return error;
        }
    }

    /**
     * Fetch historical options trades for a ticker on a specific date
     * Uses Polygon REST API (available for past dates)
     */
    private List<OptionFlow> fetchHistoricalOptionsTrades(String ticker, LocalDate date) {
        List<OptionFlow> trades = new ArrayList<>();

        try {
            // Format: O:AAPL*
            String optionPattern = "O:" + ticker + "*";
            String dateStr = date.format(DateTimeFormatter.ISO_LOCAL_DATE);

            // Note: This is a simplified approach - in production, you'd need to:
            // 1. Get all option contracts for the ticker
            // 2. Fetch trades for each contract
            // For now, we'll use a different approach - fetch from option chain

            log.warn("Historical options trades fetch not fully implemented - would fetch from Polygon here");
            // TODO: Implement full historical options trade fetching
            // This requires iterating through all option contracts for the ticker

        } catch (Exception e) {
            log.error("Failed to fetch historical trades for {}: {}", ticker, e.getMessage());
        }

        return trades;
    }

    /**
     * Build price lookup map for fast access
     */
    private Map<String, Map<Instant, BigDecimal>> buildPriceLookup(LocalDate date) {
        Map<String, Map<Instant, BigDecimal>> lookup = new HashMap<>();

        ZonedDateTime start = date.atTime(9, 30).atZone(ZoneId.of("America/New_York"));
        ZonedDateTime end = date.atTime(16, 0).atZone(ZoneId.of("America/New_York"));

        for (String ticker : Constants.MAG7_TICKERS) {
            Map<Instant, BigDecimal> prices = new HashMap<>();

            List<StockPrice> stockPrices = stockPriceService.getPricesInRange(
                ticker,
                start.toInstant(),
                end.toInstant()
            );

            for (StockPrice price : stockPrices) {
                prices.put(price.getTimestamp(), price.getClose());
            }

            lookup.put(ticker, prices);
            log.debug("Loaded {} price points for {}", prices.size(), ticker);
        }

        return lookup;
    }

    /**
     * Find closest price to a timestamp
     */
    private BigDecimal findClosestPrice(Map<Instant, BigDecimal> prices, Instant timestamp) {
        if (prices == null || prices.isEmpty()) {
            return null;
        }

        // Try exact match first
        if (prices.containsKey(timestamp)) {
            return prices.get(timestamp);
        }

        // Find closest before timestamp
        Instant closest = null;
        long minDiff = Long.MAX_VALUE;

        for (Instant priceTime : prices.keySet()) {
            if (priceTime.isBefore(timestamp) || priceTime.equals(timestamp)) {
                long diff = timestamp.toEpochMilli() - priceTime.toEpochMilli();
                if (diff < minDiff) {
                    minDiff = diff;
                    closest = priceTime;
                }
            }
        }

        return closest != null ? prices.get(closest) : null;
    }

    /**
     * Load multiple days (for bulk backfill)
     */
    public Map<String, Object> replayMultipleDays(LocalDate startDate, LocalDate endDate) {
        log.info("🔄 Replaying multiple days: {} to {}", startDate, endDate);

        Map<String, Object> results = new HashMap<>();
        int totalDays = 0;
        int successDays = 0;

        LocalDate current = startDate;
        while (!current.isAfter(endDate)) {
            // Skip weekends
            if (current.getDayOfWeek() != DayOfWeek.SATURDAY &&
                current.getDayOfWeek() != DayOfWeek.SUNDAY) {

                totalDays++;
                Map<String, Object> dayResult = replayTradingDay(current);

                if ((Boolean) dayResult.getOrDefault("success", false)) {
                    successDays++;
                }

                results.put(current.toString(), dayResult);
            }

            current = current.plusDays(1);
        }

        Map<String, Object> summary = new HashMap<>();
        summary.put("totalDays", totalDays);
        summary.put("successDays", successDays);
        summary.put("results", results);

        return summary;
    }
}
