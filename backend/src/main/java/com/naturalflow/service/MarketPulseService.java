package com.naturalflow.service;

import com.naturalflow.config.Constants;
import com.naturalflow.model.OptionFlow;
import com.naturalflow.repo.FlowRepository;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Market Pulse Service
 * Analyzes MAG7 flow data to provide real-time market insights
 */
@Service
public class MarketPulseService {

    private final FlowRepository repository;
    private final FlowService flowService;

    public MarketPulseService(FlowRepository repository, FlowService flowService) {
        this.repository = repository;
        this.flowService = flowService;
    }

    /**
     * Get smart money trades (> $100K premium)
     */
    public List<Map<String, Object>> getSmartMoneyTrades(int limit) {
        try {
            Instant cutoff = Instant.now().minus(24, ChronoUnit.HOURS);

            List<OptionFlow> flows = repository.findByTsUtcAfterAndPremiumGreaterThanEqualOrderByPremiumDesc(
                cutoff,
                Constants.SMART_MONEY_THRESHOLD,
                PageRequest.of(0, limit)
            );

            return flows.stream()
                .filter(f -> Constants.MAG7_TICKERS.contains(f.getUnderlying()))
                .map(this::toSmartMoneyDto)
                .collect(Collectors.toList());
        } catch (Exception e) {
            // Return empty list if no data or database error
            return new ArrayList<>();
        }
    }

    /**
     * Get flow timeline for a ticker
     * Buckets trades into time intervals for charting
     */
    public Map<String, Object> getFlowTimeline(String symbol, int windowHours, int bucketMinutes) {
        try {
            Instant now = Instant.now();
            Instant start = now.minus(windowHours, ChronoUnit.HOURS);

            List<OptionFlow> flows = repository.findByUnderlyingAndTsUtcAfterOrderByTsUtcAsc(
                symbol.toUpperCase(),
                start
            );

        // Create time buckets
        long bucketSizeMillis = bucketMinutes * 60 * 1000L;
        Map<Long, BucketData> buckets = new TreeMap<>();

        for (OptionFlow flow : flows) {
            long bucketTime = (flow.getTsUtc().toEpochMilli() / bucketSizeMillis) * bucketSizeMillis;

            BucketData bucket = buckets.computeIfAbsent(bucketTime, k -> new BucketData());
            if ("CALL".equals(flow.getSide())) {
                bucket.callPremium = bucket.callPremium.add(flow.getPremium());
                bucket.callCount++;
            } else if ("PUT".equals(flow.getSide())) {
                bucket.putPremium = bucket.putPremium.add(flow.getPremium());
                bucket.putCount++;
            }
        }

        // Convert to response format
        List<Map<String, Object>> dataPoints = new ArrayList<>();
        for (Map.Entry<Long, BucketData> entry : buckets.entrySet()) {
            Map<String, Object> point = new HashMap<>();
            point.put("timestamp", entry.getKey());
            point.put("callPremium", entry.getValue().callPremium);
            point.put("putPremium", entry.getValue().putPremium);
            point.put("netFlow", entry.getValue().callPremium.subtract(entry.getValue().putPremium));
            point.put("callCount", entry.getValue().callCount);
            point.put("putCount", entry.getValue().putCount);
            dataPoints.add(point);
        }

            Map<String, Object> response = new HashMap<>();
            response.put("symbol", symbol.toUpperCase());
            response.put("windowHours", windowHours);
            response.put("bucketMinutes", bucketMinutes);
            response.put("dataPoints", dataPoints);

            return response;
        } catch (Exception e) {
            // Return empty timeline if error
            Map<String, Object> response = new HashMap<>();
            response.put("symbol", symbol.toUpperCase());
            response.put("windowHours", windowHours);
            response.put("bucketMinutes", bucketMinutes);
            response.put("dataPoints", new ArrayList<>());
            return response;
        }
    }

    /**
     * Get MAG7 overall summary
     */
    public Map<String, Object> getMag7Summary() {
        BigDecimal totalCallPremium = BigDecimal.ZERO;
        BigDecimal totalPutPremium = BigDecimal.ZERO;
        int totalTrades = 0;
        int bullishCount = 0;
        int bearishCount = 0;

        for (String ticker : Constants.MAG7_TICKERS) {
            FlowService.FlowSummary summary = flowService.getSummary(ticker, 24);
            totalCallPremium = totalCallPremium.add(summary.getTotalCallPremium());
            totalPutPremium = totalPutPremium.add(summary.getTotalPutPremium());
            totalTrades += summary.getCount();

            if (summary.getNetPremium().compareTo(BigDecimal.ZERO) > 0) {
                bullishCount++;
            } else if (summary.getNetPremium().compareTo(BigDecimal.ZERO) < 0) {
                bearishCount++;
            }
        }

        BigDecimal netPremium = totalCallPremium.subtract(totalPutPremium);
        String overallSentiment = netPremium.compareTo(BigDecimal.ZERO) > 0 ? "BULLISH" : "BEARISH";

        Map<String, Object> summary = new HashMap<>();
        summary.put("totalCallPremium", totalCallPremium);
        summary.put("totalPutPremium", totalPutPremium);
        summary.put("netPremium", netPremium);
        summary.put("totalTrades", totalTrades);
        summary.put("bullishStocks", bullishCount);
        summary.put("bearishStocks", bearishCount);
        summary.put("neutralStocks", 7 - bullishCount - bearishCount);
        summary.put("overallSentiment", overallSentiment);
        summary.put("timestamp", Instant.now().toEpochMilli());

        return summary;
    }

    /**
     * Detect unusual activity
     * Compares recent flow to historical averages
     */
    public List<Map<String, Object>> getUnusualActivity(int limit) {
        try {
            List<Map<String, Object>> unusual = new ArrayList<>();

            for (String ticker : Constants.MAG7_TICKERS) {
                FlowService.FlowSummary recent = flowService.getSummary(ticker, 1);

                Instant now = Instant.now();
                Instant oneDayAgo = now.minus(1, ChronoUnit.DAYS);
                Instant thirtyDaysAgo = now.minus(30, ChronoUnit.DAYS);

                List<OptionFlow> historical = repository.findByUnderlyingAndTsUtcBetween(
                    ticker,
                    thirtyDaysAgo,
                    oneDayAgo
                );

                if (historical.isEmpty()) {
                    continue;
                }

                long hourCount = 30 * 24; // 30 days * 24 hours
                BigDecimal historicalCallPerHour = historical.stream()
                    .filter(f -> "CALL".equals(f.getSide()))
                    .map(OptionFlow::getPremium)
                    .reduce(BigDecimal.ZERO, BigDecimal::add)
                    .divide(BigDecimal.valueOf(hourCount), 2, RoundingMode.HALF_UP);

                BigDecimal historicalPutPerHour = historical.stream()
                    .filter(f -> "PUT".equals(f.getSide()))
                    .map(OptionFlow::getPremium)
                    .reduce(BigDecimal.ZERO, BigDecimal::add)
                    .divide(BigDecimal.valueOf(hourCount), 2, RoundingMode.HALF_UP);

                BigDecimal recentCallPremium = recent.getTotalCallPremium();
                BigDecimal recentPutPremium = recent.getTotalPutPremium();

                boolean hasCallBaseline = historicalCallPerHour.compareTo(BigDecimal.ZERO) > 0;
                boolean hasPutBaseline = historicalPutPerHour.compareTo(BigDecimal.ZERO) > 0;

                boolean unusualCalls = hasCallBaseline
                    ? recentCallPremium.compareTo(historicalCallPerHour.multiply(new BigDecimal("3"))) > 0
                    : recentCallPremium.compareTo(BigDecimal.ZERO) > 0;

                boolean unusualPuts = hasPutBaseline
                    ? recentPutPremium.compareTo(historicalPutPerHour.multiply(new BigDecimal("3"))) > 0
                    : recentPutPremium.compareTo(BigDecimal.ZERO) > 0;

                if (unusualCalls || unusualPuts) {
                    Map<String, Object> activity = new HashMap<>();
                    activity.put("ticker", ticker);
                    activity.put("recentCallPremium", recentCallPremium);
                    activity.put("recentPutPremium", recentPutPremium);
                    activity.put("avgCallPremium", historicalCallPerHour);
                    activity.put("avgPutPremium", historicalPutPerHour);
                    activity.put("unusualCalls", unusualCalls);
                    activity.put("unusualPuts", unusualPuts);

                    if (unusualCalls && hasCallBaseline) {
                        activity.put("callMultiple", safeDivide(recentCallPremium, historicalCallPerHour));
                    }
                    if (unusualPuts && hasPutBaseline) {
                        activity.put("putMultiple", safeDivide(recentPutPremium, historicalPutPerHour));
                    }

                    unusual.add(activity);
                }
            }

            return unusual.stream()
                .sorted((a, b) -> {
                    BigDecimal aMax = getMaxMultiple(a);
                    BigDecimal bMax = getMaxMultiple(b);
                    return bMax.compareTo(aMax);
                })
                .limit(limit)
                .collect(Collectors.toList());
        } catch (Exception e) {
            return new ArrayList<>();
        }
    }

    private BigDecimal getMaxMultiple(Map<String, Object> activity) {
        BigDecimal callMult = activity.containsKey("callMultiple") ?
            (BigDecimal) activity.get("callMultiple") : BigDecimal.ZERO;
        BigDecimal putMult = activity.containsKey("putMultiple") ?
            (BigDecimal) activity.get("putMultiple") : BigDecimal.ZERO;
        return callMult.max(putMult);
    }

    private Map<String, Object> toSmartMoneyDto(OptionFlow flow) {
        Map<String, Object> dto = new HashMap<>();
        dto.put("timestamp", flow.getTsUtc().toEpochMilli());
        dto.put("ticker", flow.getUnderlying());
        dto.put("side", flow.getSide());
        dto.put("premium", flow.getPremium());
        dto.put("strike", flow.getStrike());
        dto.put("expiry", flow.getExpiry() != null ? flow.getExpiry().toString() : null);
        dto.put("size", flow.getSize());
        dto.put("optionSymbol", flow.getOptionSymbol());
        return dto;
    }

    private BigDecimal safeDivide(BigDecimal numerator, BigDecimal denominator) {
        if (denominator == null || denominator.compareTo(BigDecimal.ZERO) == 0) {
            return BigDecimal.ZERO;
        }
        return numerator.divide(denominator, 2, RoundingMode.HALF_UP);
    }

    /**
     * Helper class for bucketing timeline data
     */
    private static class BucketData {
        BigDecimal callPremium = BigDecimal.ZERO;
        BigDecimal putPremium = BigDecimal.ZERO;
        int callCount = 0;
        int putCount = 0;
    }
}
