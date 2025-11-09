package com.naturalflow.service;

import com.naturalflow.config.Constants;
import com.naturalflow.model.OptionFlow;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;

/**
 * Trade Validation Service
 *
 * Core filtering logic used by BOTH:
 * - Live WebSocket ingestion
 * - Historical replay processing
 *
 * Ensures consistent filtering across all data sources.
 */
@Service
public class TradeValidationService {

    private static final Logger log = LoggerFactory.getLogger(TradeValidationService.class);

    // Filter thresholds
    private static final BigDecimal MIN_PREMIUM = new BigDecimal("50000"); // $50K+
    private static final int MAX_DTE = 30; // 0-30 days

    /**
     * Validates if a trade should be ingested based on ALL filters:
     * 1. Ticker in MAG7+SPY+QQQ
     * 2. Premium >= $50K
     * 3. DTE <= 30 days
     * 4. Option is OTM at time of trade
     */
    public boolean shouldIngestTrade(OptionFlow flow, BigDecimal currentStockPrice) {

        // Filter 1: Check ticker
        if (!Constants.MAG7_TICKERS.contains(flow.getUnderlying())) {
            log.debug("Filtered out: {} not in MAG7+SPY+QQQ", flow.getUnderlying());
            return false;
        }

        // Filter 2: Check premium
        if (flow.getPremium() == null || flow.getPremium().compareTo(MIN_PREMIUM) < 0) {
            log.debug("Filtered out: {} premium ${} < $50K",
                flow.getOptionSymbol(), flow.getPremium());
            return false;
        }

        // Filter 3: Check DTE
        int dte = calculateDte(flow.getExpiry());
        if (dte < 0 || dte > MAX_DTE) {
            log.debug("Filtered out: {} DTE {} not in 0-30 range",
                flow.getOptionSymbol(), dte);
            return false;
        }

        // Filter 4: Check OTM
        if (currentStockPrice == null) {
            log.warn("Cannot validate OTM - missing stock price for {}", flow.getUnderlying());
            return false;
        }

        boolean isOtm = isOptionOtm(flow.getStrike(), currentStockPrice, flow.getSide());
        if (!isOtm) {
            log.debug("Filtered out: {} strike {} is ITM (stock at {})",
                flow.getOptionSymbol(), flow.getStrike(), currentStockPrice);
            return false;
        }

        // All filters passed
        log.info("✅ Trade passed all filters: {} ${} premium, {} DTE, {}% OTM",
            flow.getOptionSymbol(),
            flow.getPremium(),
            dte,
            calculateDistanceToStrike(flow.getStrike(), currentStockPrice, flow.getSide()));

        return true;
    }

    /**
     * Enriches a trade with calculated fields after validation
     */
    public void enrichTrade(OptionFlow flow, BigDecimal currentStockPrice) {
        int dte = calculateDte(flow.getExpiry());
        BigDecimal distance = calculateDistanceToStrike(flow.getStrike(), currentStockPrice, flow.getSide());
        boolean isOtm = isOptionOtm(flow.getStrike(), currentStockPrice, flow.getSide());
        boolean is0dte = (dte == 0);

        flow.setStockPriceAtTrade(currentStockPrice);
        flow.setDte(dte);
        flow.setDistanceToStrike(distance);
        flow.setIsOtm(isOtm);
        flow.setIs0dte(is0dte);

        if (is0dte) {
            log.info("🎯 0DTE DETECTED: {} expires TODAY, stock at {}, strike {}",
                flow.getOptionSymbol(), currentStockPrice, flow.getStrike());
        }
    }

    /**
     * Check if option is Out-The-Money
     * CALL: strike > stock price
     * PUT: strike < stock price
     */
    private boolean isOptionOtm(BigDecimal strike, BigDecimal stockPrice, String side) {
        if ("CALL".equalsIgnoreCase(side)) {
            return strike.compareTo(stockPrice) > 0;
        } else if ("PUT".equalsIgnoreCase(side)) {
            return strike.compareTo(stockPrice) < 0;
        }
        return false;
    }

    /**
     * Calculate distance to strike as percentage
     * Positive = OTM, Negative = ITM
     */
    private BigDecimal calculateDistanceToStrike(BigDecimal strike, BigDecimal stockPrice, String side) {
        if (stockPrice.compareTo(BigDecimal.ZERO) == 0) {
            return BigDecimal.ZERO;
        }

        BigDecimal difference = strike.subtract(stockPrice);
        BigDecimal percentage = difference
            .divide(stockPrice, 4, RoundingMode.HALF_UP)
            .multiply(new BigDecimal("100"));

        // For puts, flip the sign (strike below stock = OTM = positive distance)
        if ("PUT".equalsIgnoreCase(side)) {
            percentage = percentage.negate();
        }

        return percentage;
    }

    /**
     * Calculate Days To Expiration
     */
    private int calculateDte(LocalDate expiry) {
        if (expiry == null) {
            return -1;
        }
        return (int) ChronoUnit.DAYS.between(LocalDate.now(), expiry);
    }

    /**
     * Get min premium threshold
     */
    public BigDecimal getMinPremium() {
        return MIN_PREMIUM;
    }

    /**
     * Get max DTE threshold
     */
    public int getMaxDte() {
        return MAX_DTE;
    }
}
