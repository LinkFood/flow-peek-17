package com.naturalflow.service;

import com.naturalflow.model.OptionFlow;
import com.naturalflow.repo.FlowRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Smart Money Service - Identifies and analyzes institutional flow patterns
 *
 * Filters for:
 * - Premium >= $50K (institutional size)
 * - DTE <= 30 days (near-term directional plays, not hedging)
 * - Strike-level concentration (repeated hits on same strike/expiry)
 */
@Service
public class SmartMoneyService {

    private static final Logger log = LoggerFactory.getLogger(SmartMoneyService.class);

    private static final BigDecimal MIN_PREMIUM = new BigDecimal("50000"); // $50K minimum
    private static final int MAX_DTE = 30; // 0-30 days to expiry

    private final FlowRepository flowRepository;

    public SmartMoneyService(FlowRepository flowRepository) {
        this.flowRepository = flowRepository;
    }

    /**
     * Get smart money flow for a ticker
     * Filters for $50K+ premium and 0-30 DTE
     */
    @Transactional(readOnly = true)
    public List<SmartMoneyFlow> getSmartMoneyFlow(String symbol, int lookbackHours) {
        String upperSymbol = symbol.toUpperCase();
        Instant startTime = Instant.now().minus(lookbackHours, ChronoUnit.HOURS);

        // Get all flows for this symbol in time window
        List<OptionFlow> allFlows = flowRepository.findByUnderlyingAndTimeWindow(upperSymbol, startTime);

        LocalDate today = LocalDate.now();

        return allFlows.stream()
            .filter(flow -> flow.getPremium() != null && flow.getPremium().compareTo(MIN_PREMIUM) >= 0)
            .filter(flow -> flow.getExpiry() != null)
            .map(flow -> {
                int dte = (int) ChronoUnit.DAYS.between(today, flow.getExpiry());
                return new SmartMoneyFlow(flow, dte);
            })
            .filter(smFlow -> smFlow.getDte() >= 0 && smFlow.getDte() <= MAX_DTE)
            .sorted((a, b) -> b.getFlow().getTsUtc().compareTo(a.getFlow().getTsUtc()))
            .collect(Collectors.toList());
    }

    /**
     * Detect strike-level concentration
     * Returns strikes that have seen repeated large flow
     */
    @Transactional(readOnly = true)
    public List<StrikeConcentration> getStrikeConcentration(String symbol, int lookbackHours) {
        List<SmartMoneyFlow> smartFlows = getSmartMoneyFlow(symbol, lookbackHours);

        // Group by strike + expiry + side
        Map<StrikeKey, List<SmartMoneyFlow>> grouped = smartFlows.stream()
            .filter(flow -> flow.getFlow().getStrike() != null)
            .collect(Collectors.groupingBy(flow ->
                new StrikeKey(
                    flow.getFlow().getStrike(),
                    flow.getFlow().getExpiry(),
                    flow.getFlow().getSide()
                )
            ));

        // Find concentrations (2+ trades on same strike/expiry)
        return grouped.entrySet().stream()
            .filter(entry -> entry.getValue().size() >= 2)
            .map(entry -> {
                StrikeKey key = entry.getKey();
                List<SmartMoneyFlow> flows = entry.getValue();

                BigDecimal totalPremium = flows.stream()
                    .map(f -> f.getFlow().getPremium())
                    .reduce(BigDecimal.ZERO, BigDecimal::add);

                int totalSize = flows.stream()
                    .mapToInt(f -> f.getFlow().getSize() != null ? f.getFlow().getSize() : 0)
                    .sum();

                return new StrikeConcentration(
                    key.strike,
                    key.expiry,
                    key.side,
                    flows.get(0).getDte(),
                    flows.size(),
                    totalPremium,
                    totalSize
                );
            })
            .sorted((a, b) -> b.getTotalPremium().compareTo(a.getTotalPremium()))
            .collect(Collectors.toList());
    }

    /**
     * Get unusual volume for a ticker
     * Compares recent flow to historical average
     */
    @Transactional(readOnly = true)
    public UnusualVolumeAlert getUnusualVolume(String symbol) {
        String upperSymbol = symbol.toUpperCase();

        // Recent 4 hours
        Instant recent = Instant.now().minus(4, ChronoUnit.HOURS);
        List<OptionFlow> recentFlows = flowRepository.findByUnderlyingAndTimeWindow(upperSymbol, recent);

        // Historical baseline (7 days ago, same 4-hour window)
        Instant historicalEnd = Instant.now().minus(7, ChronoUnit.DAYS);
        Instant historicalStart = historicalEnd.minus(4, ChronoUnit.HOURS);
        List<OptionFlow> historicalFlows = flowRepository.findByUnderlyingAndTimeWindowBetween(
            upperSymbol, historicalStart, historicalEnd
        );

        int recentCount = recentFlows.size();
        int historicalCount = historicalFlows.size();

        if (historicalCount == 0) {
            return null; // Not enough data
        }

        double volumeMultiple = (double) recentCount / historicalCount;

        // Flag if 3x+ normal volume
        if (volumeMultiple >= 3.0) {
            BigDecimal recentCallPremium = recentFlows.stream()
                .filter(f -> "CALL".equals(f.getSide()))
                .map(f -> f.getPremium() != null ? f.getPremium() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

            BigDecimal recentPutPremium = recentFlows.stream()
                .filter(f -> "PUT".equals(f.getSide()))
                .map(f -> f.getPremium() != null ? f.getPremium() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

            return new UnusualVolumeAlert(
                upperSymbol,
                recentCount,
                historicalCount,
                volumeMultiple,
                recentCallPremium,
                recentPutPremium
            );
        }

        return null;
    }

    // ============ DTOs ============

    public static class SmartMoneyFlow {
        private final OptionFlow flow;
        private final int dte;

        public SmartMoneyFlow(OptionFlow flow, int dte) {
            this.flow = flow;
            this.dte = dte;
        }

        public OptionFlow getFlow() { return flow; }
        public int getDte() { return dte; }
    }

    public static class StrikeConcentration {
        private final BigDecimal strike;
        private final LocalDate expiry;
        private final String side;
        private final int dte;
        private final int tradeCount;
        private final BigDecimal totalPremium;
        private final int totalSize;

        public StrikeConcentration(BigDecimal strike, LocalDate expiry, String side, int dte,
                                  int tradeCount, BigDecimal totalPremium, int totalSize) {
            this.strike = strike;
            this.expiry = expiry;
            this.side = side;
            this.dte = dte;
            this.tradeCount = tradeCount;
            this.totalPremium = totalPremium;
            this.totalSize = totalSize;
        }

        public BigDecimal getStrike() { return strike; }
        public LocalDate getExpiry() { return expiry; }
        public String getSide() { return side; }
        public int getDte() { return dte; }
        public int getTradeCount() { return tradeCount; }
        public BigDecimal getTotalPremium() { return totalPremium; }
        public int getTotalSize() { return totalSize; }
    }

    public static class UnusualVolumeAlert {
        private final String ticker;
        private final int recentCount;
        private final int historicalCount;
        private final double volumeMultiple;
        private final BigDecimal callPremium;
        private final BigDecimal putPremium;

        public UnusualVolumeAlert(String ticker, int recentCount, int historicalCount,
                                 double volumeMultiple, BigDecimal callPremium, BigDecimal putPremium) {
            this.ticker = ticker;
            this.recentCount = recentCount;
            this.historicalCount = historicalCount;
            this.volumeMultiple = volumeMultiple;
            this.callPremium = callPremium;
            this.putPremium = putPremium;
        }

        public String getTicker() { return ticker; }
        public int getRecentCount() { return recentCount; }
        public int getHistoricalCount() { return historicalCount; }
        public double getVolumeMultiple() { return volumeMultiple; }
        public BigDecimal getCallPremium() { return callPremium; }
        public BigDecimal getPutPremium() { return putPremium; }
    }

    private static class StrikeKey {
        private final BigDecimal strike;
        private final LocalDate expiry;
        private final String side;

        public StrikeKey(BigDecimal strike, LocalDate expiry, String side) {
            this.strike = strike;
            this.expiry = expiry;
            this.side = side;
        }

        @Override
        public boolean equals(Object o) {
            if (this == o) return true;
            if (o == null || getClass() != o.getClass()) return false;
            StrikeKey that = (StrikeKey) o;
            return Objects.equals(strike, that.strike) &&
                   Objects.equals(expiry, that.expiry) &&
                   Objects.equals(side, that.side);
        }

        @Override
        public int hashCode() {
            return Objects.hash(strike, expiry, side);
        }
    }
}
