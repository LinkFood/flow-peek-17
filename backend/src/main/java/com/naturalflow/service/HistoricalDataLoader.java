package com.naturalflow.service;

import com.naturalflow.config.Constants;
import com.naturalflow.model.OptionFlow;
import com.naturalflow.repo.FlowRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * Service for loading historical options flow data from Polygon.io
 * Used to backfill database with historical data for pattern learning
 */
@Service
public class HistoricalDataLoader {

    private static final Logger log = LoggerFactory.getLogger(HistoricalDataLoader.class);

    @Value("${polygon.api.key:}")
    private String polygonApiKey;

    private final FlowRepository repository;
    private final RestTemplate restTemplate = new RestTemplate();

    public HistoricalDataLoader(FlowRepository repository) {
        this.repository = repository;
    }

    /**
     * Load historical data for MAG7 stocks
     * @param daysBack Number of days to go back (default 30)
     * @return Summary of loaded data
     */
    public Map<String, Object> loadMag7HistoricalData(int daysBack) {
        if (polygonApiKey == null || polygonApiKey.isEmpty()) {
            throw new IllegalStateException("Polygon API key not configured");
        }

        log.info("Starting historical data load for MAG7 stocks, {} days back", daysBack);

        int totalLoaded = 0;
        int totalErrors = 0;
        List<String> tickersSummary = new ArrayList<>();

        for (String ticker : Constants.MAG7_TICKERS) {
            try {
                int loaded = loadHistoricalDataForTicker(ticker, daysBack);
                totalLoaded += loaded;
                tickersSummary.add(ticker + ": " + loaded + " flows");

                // Add delay to avoid rate limiting (5 requests per minute on free tier)
                Thread.sleep(12000); // 12 seconds between tickers

            } catch (Exception e) {
                log.error("Error loading historical data for {}: {}", ticker, e.getMessage());
                totalErrors++;
            }
        }

        log.info("Historical data load complete. Total loaded: {}, errors: {}", totalLoaded, totalErrors);

        return Map.of(
            "success", true,
            "totalFlowsLoaded", totalLoaded,
            "tickersProcessed", Constants.MAG7_TICKERS.size(),
            "errors", totalErrors,
            "tickersSummary", tickersSummary,
            "daysBack", daysBack
        );
    }

    /**
     * Load historical data for a single ticker
     */
    private int loadHistoricalDataForTicker(String ticker, int daysBack) throws Exception {
        log.info("Loading {} days of historical data for {}", daysBack, ticker);

        int totalLoaded = 0;
        LocalDate endDate = LocalDate.now();
        LocalDate startDate = endDate.minusDays(daysBack);

        // Polygon.io Options Trades endpoint
        // Note: This is simplified - real implementation would need to iterate through dates
        // and handle pagination properly

        // For demo purposes, we'll just log what would be done
        // In production, you'd make actual API calls like:
        // GET https://api.polygon.io/v3/trades/{optionSymbol}?timestamp.gte={start}&timestamp.lt={end}

        log.warn("Historical data loading is a stub implementation");
        log.warn("To fully implement, you need to:");
        log.warn("1. Get list of option symbols for ticker on each date");
        log.warn("2. Fetch trades for each option symbol");
        log.warn("3. Filter for trades over $100K premium");
        log.warn("4. Save to database");
        log.warn("This requires a paid Polygon.io subscription for historical options data");

        return totalLoaded;
    }

    /**
     * Generate synthetic historical data for testing
     * This creates realistic-looking MAG7 flow data for the past N days
     */
    public Map<String, Object> generateSyntheticHistoricalData(int daysBack) {
        log.info("Generating synthetic historical data for MAG7 stocks, {} days back", daysBack);

        int totalGenerated = 0;
        Instant now = Instant.now();

        for (String ticker : Constants.MAG7_TICKERS) {
            // Generate 20-50 flows per day for each ticker
            int flowsPerDay = 20 + (int)(Math.random() * 30);

            for (int day = 0; day < daysBack; day++) {
                for (int i = 0; i < flowsPerDay; i++) {
                    OptionFlow flow = generateSyntheticFlow(
                        ticker,
                        now.minus(day, ChronoUnit.DAYS).minus((long)(Math.random() * 24), ChronoUnit.HOURS)
                    );

                    repository.save(flow);
                    totalGenerated++;
                }
            }
        }

        log.info("Generated {} synthetic historical flows", totalGenerated);

        return Map.of(
            "success", true,
            "totalFlowsGenerated", totalGenerated,
            "tickersProcessed", Constants.MAG7_TICKERS.size(),
            "daysBack", daysBack,
            "note", "This is synthetic data for testing pattern learning"
        );
    }

    /**
     * Generate a single synthetic flow
     */
    private OptionFlow generateSyntheticFlow(String ticker, Instant timestamp) {
        OptionFlow flow = new OptionFlow();

        flow.setTsUtc(timestamp);
        flow.setUnderlying(ticker);

        // Random CALL or PUT
        boolean isCall = Math.random() > 0.5;
        flow.setSide(isCall ? "CALL" : "PUT");

        // Random premium between $50K and $500K (weighted toward lower values)
        double premiumBase = 50000 + Math.pow(Math.random(), 2) * 450000;
        flow.setPremium(BigDecimal.valueOf(premiumBase).setScale(2, BigDecimal.ROUND_HALF_UP));

        // Random strike around current "price" (simplified)
        double basePrice = getApproxPrice(ticker);
        double strikeOffset = (Math.random() - 0.5) * 0.2; // +/- 10%
        flow.setStrike(BigDecimal.valueOf(basePrice * (1 + strikeOffset)).setScale(2, BigDecimal.ROUND_HALF_UP));

        // Random expiry 1-90 days out
        int daysToExpiry = 1 + (int)(Math.random() * 90);
        flow.setExpiry(LocalDate.now().plusDays(daysToExpiry));

        // Random size (contracts)
        flow.setSize((int)(10 + Math.random() * 990));

        // Generate option symbol
        String optionType = isCall ? "C" : "P";
        String expiryStr = flow.getExpiry().toString().replace("-", "");
        flow.setOptionSymbol(ticker + expiryStr + optionType + flow.getStrike().intValue());

        // Raw JSON (simplified)
        flow.setRawJson("{\"synthetic\": true}");

        return flow;
    }

    /**
     * Get approximate price for ticker (for synthetic data generation)
     */
    private double getApproxPrice(String ticker) {
        return switch (ticker) {
            case "AAPL" -> 180.0;
            case "MSFT" -> 380.0;
            case "GOOGL" -> 140.0;
            case "AMZN" -> 180.0;
            case "NVDA" -> 140.0;
            case "TSLA" -> 220.0;
            case "META" -> 500.0;
            default -> 100.0;
        };
    }
}
