package com.naturalflow.config;

import java.math.BigDecimal;
import java.util.List;

/**
 * Application-wide constants
 * Focus on MAG7 stocks and institutional-level trades
 */
public class Constants {

    /**
     * MAG 7 - The 7 mega-cap tech stocks that drive market sentiment
     * These are the only stocks we track and learn from
     */
    public static final List<String> MAG7_TICKERS = List.of(
        "AAPL",  // Apple
        "MSFT",  // Microsoft
        "GOOGL", // Alphabet
        "AMZN",  // Amazon
        "NVDA",  // NVIDIA
        "TSLA",  // Tesla
        "META"   // Meta
    );

    /**
     * Minimum premium threshold for "smart money" trades
     * Only track institutional-level trades ($100K+)
     */
    public static final BigDecimal SMART_MONEY_THRESHOLD = new BigDecimal("100000");

    /**
     * Time windows for analysis (in hours)
     */
    public static final int INTRADAY_WINDOW = 24;      // 1 day
    public static final int WEEKLY_WINDOW = 168;       // 7 days
    public static final int MONTHLY_WINDOW = 720;      // 30 days

    /**
     * Pattern learning thresholds
     */
    public static final int MIN_PATTERN_OCCURRENCES = 3;  // Need at least 3 similar patterns
    public static final double PATTERN_SIMILARITY_THRESHOLD = 0.85;  // 85% similarity to match

    private Constants() {
        // Utility class - no instantiation
    }
}
