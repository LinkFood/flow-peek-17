package com.naturalflow.service;

import com.naturalflow.model.OptionFlow;
import com.naturalflow.repo.FlowRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Pattern detection service for identifying unusual options flow patterns
 * Detects: Strike concentration, unusual volume, sentiment flips, repeated hits
 */
@Service
public class PatternService {

    private static final Logger log = LoggerFactory.getLogger(PatternService.class);
    
    private final FlowRepository flowRepository;

    public PatternService(FlowRepository flowRepository) {
        this.flowRepository = flowRepository;
    }

    /**
     * Detect strike concentration patterns
     * When 5+ trades hit the same strike within a short window
     */
    public List<Map<String, Object>> detectStrikeConcentration(String ticker, int windowMinutes, int minHits) {
        Instant cutoff = Instant.now().minus(windowMinutes, ChronoUnit.MINUTES);
        List<OptionFlow> recentFlows = flowRepository.findByUnderlyingAndTsUtcAfterOrderByTsUtcAsc(ticker, cutoff);
        
        // Group by strike
        Map<BigDecimal, List<OptionFlow>> byStrike = recentFlows.stream()
            .filter(f -> f.getStrike() != null)
            .collect(Collectors.groupingBy(OptionFlow::getStrike));
        
        List<Map<String, Object>> patterns = new ArrayList<>();
        
        for (Map.Entry<BigDecimal, List<OptionFlow>> entry : byStrike.entrySet()) {
            if (entry.getValue().size() >= minHits) {
                BigDecimal totalPremium = entry.getValue().stream()
                    .map(OptionFlow::getPremium)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
                
                long callCount = entry.getValue().stream().filter(f -> "CALL".equals(f.getSide())).count();
                long putCount = entry.getValue().stream().filter(f -> "PUT".equals(f.getSide())).count();
                
                Map<String, Object> pattern = new HashMap<>();
                pattern.put("pattern", "STRIKE_CONCENTRATION");
                pattern.put("ticker", ticker);
                pattern.put("strike", entry.getKey());
                pattern.put("hits", entry.getValue().size());
                pattern.put("totalPremium", totalPremium);
                pattern.put("callCount", callCount);
                pattern.put("putCount", putCount);
                pattern.put("dominantSide", callCount > putCount ? "CALL" : "PUT");
                pattern.put("windowMinutes", windowMinutes);
                pattern.put("detectedAt", Instant.now());
                
                patterns.add(pattern);
                log.info("🎯 Strike concentration detected: {} ${} - {} hits, ${} premium", 
                    ticker, entry.getKey(), entry.getValue().size(), totalPremium);
            }
        }
        
        return patterns;
    }

    /**
     * Detect unusual volume (compared to historical average)
     * Returns tickers with >2x their usual activity
     */
    public List<Map<String, Object>> detectUnusualVolume(List<String> tickers, int compareHours) {
        List<Map<String, Object>> unusual = new ArrayList<>();
        
        Instant now = Instant.now();
        Instant recentCutoff = now.minus(1, ChronoUnit.HOURS);
        Instant historicalStart = now.minus(compareHours, ChronoUnit.HOURS);
        Instant historicalEnd = now.minus(1, ChronoUnit.HOURS);
        
        for (String ticker : tickers) {
            // Recent 1 hour
            long recentCount = flowRepository.countByUnderlyingAndTimeWindow(ticker, recentCutoff);
            
            // Historical average per hour
            List<OptionFlow> historicalFlows = flowRepository.findByUnderlyingAndTimeWindowBetween(
                ticker, historicalStart, historicalEnd);
            double avgPerHour = historicalFlows.size() / (double) Math.max(compareHours - 1, 1);
            
            if (recentCount > avgPerHour * 2 && recentCount > 10) {
                Map<String, Object> pattern = new HashMap<>();
                pattern.put("pattern", "UNUSUAL_VOLUME");
                pattern.put("ticker", ticker);
                pattern.put("recentCount", recentCount);
                pattern.put("historicalAvg", BigDecimal.valueOf(avgPerHour).setScale(1, RoundingMode.HALF_UP));
                pattern.put("volumeRatio", BigDecimal.valueOf(recentCount / avgPerHour).setScale(2, RoundingMode.HALF_UP));
                pattern.put("detectedAt", now);
                
                unusual.add(pattern);
                log.info("📊 Unusual volume detected: {} - {} trades vs {} avg ({}x)", 
                    ticker, recentCount, avgPerHour, recentCount / avgPerHour);
            }
        }
        
        return unusual;
    }

    /**
     * Detect sentiment flips
     * When call/put ratio dramatically changes from previous window
     */
    public List<Map<String, Object>> detectSentimentFlips(String ticker) {
        Instant now = Instant.now();
        
        // Recent 1 hour
        Instant recent1hCutoff = now.minus(1, ChronoUnit.HOURS);
        List<OptionFlow> recent1h = flowRepository.findByUnderlyingAndTsUtcAfterOrderByTsUtcAsc(ticker, recent1hCutoff);
        
        // Previous 1 hour (hours 2-3 ago)
        Instant previous1hStart = now.minus(3, ChronoUnit.HOURS);
        Instant previous1hEnd = now.minus(2, ChronoUnit.HOURS);
        List<OptionFlow> previous1h = flowRepository.findByUnderlyingAndTimeWindowBetween(
            ticker, previous1hStart, previous1hEnd);
        
        if (recent1h.size() < 5 || previous1h.size() < 5) {
            return Collections.emptyList();
        }
        
        // Calculate call/put premium ratios
        BigDecimal recentCallPremium = recent1h.stream()
            .filter(f -> "CALL".equals(f.getSide()))
            .map(OptionFlow::getPremium)
            .reduce(BigDecimal.ZERO, BigDecimal::add);
        
        BigDecimal recentPutPremium = recent1h.stream()
            .filter(f -> "PUT".equals(f.getSide()))
            .map(OptionFlow::getPremium)
            .reduce(BigDecimal.ZERO, BigDecimal::add);
        
        BigDecimal previousCallPremium = previous1h.stream()
            .filter(f -> "CALL".equals(f.getSide()))
            .map(OptionFlow::getPremium)
            .reduce(BigDecimal.ZERO, BigDecimal::add);
        
        BigDecimal previousPutPremium = previous1h.stream()
            .filter(f -> "PUT".equals(f.getSide()))
            .map(OptionFlow::getPremium)
            .reduce(BigDecimal.ZERO, BigDecimal::add);
        
        // Calculate net flow changes
        BigDecimal recentNet = recentCallPremium.subtract(recentPutPremium);
        BigDecimal previousNet = previousCallPremium.subtract(previousPutPremium);
        
        // Detect significant flip (change > $500K and opposite signs)
        boolean isFlip = (recentNet.compareTo(BigDecimal.ZERO) > 0 && previousNet.compareTo(BigDecimal.ZERO) < 0)
                      || (recentNet.compareTo(BigDecimal.ZERO) < 0 && previousNet.compareTo(BigDecimal.ZERO) > 0);
        
        BigDecimal netChange = recentNet.subtract(previousNet).abs();
        
        if (isFlip && netChange.compareTo(new BigDecimal("500000")) > 0) {
            Map<String, Object> pattern = new HashMap<>();
            pattern.put("pattern", "SENTIMENT_FLIP");
            pattern.put("ticker", ticker);
            pattern.put("previousSentiment", previousNet.compareTo(BigDecimal.ZERO) > 0 ? "BULLISH" : "BEARISH");
            pattern.put("currentSentiment", recentNet.compareTo(BigDecimal.ZERO) > 0 ? "BULLISH" : "BEARISH");
            pattern.put("netChange", netChange);
            pattern.put("recentCallPremium", recentCallPremium);
            pattern.put("recentPutPremium", recentPutPremium);
            pattern.put("detectedAt", now);
            
            log.info("🔄 Sentiment flip detected: {} from {} to {}, ${} swing", 
                ticker, pattern.get("previousSentiment"), pattern.get("currentSentiment"), netChange);
            
            return List.of(pattern);
        }
        
        return Collections.emptyList();
    }

    /**
     * Get all detected patterns for a ticker
     */
    public Map<String, Object> getAllPatterns(String ticker) {
        Map<String, Object> allPatterns = new HashMap<>();
        
        // Strike concentration (last 30 min, 5+ hits)
        List<Map<String, Object>> strikeConcentration = detectStrikeConcentration(ticker, 30, 5);
        allPatterns.put("strikeConcentration", strikeConcentration);
        
        // Sentiment flips
        List<Map<String, Object>> sentimentFlips = detectSentimentFlips(ticker);
        allPatterns.put("sentimentFlips", sentimentFlips);
        
        // Total patterns detected
        allPatterns.put("totalPatterns", strikeConcentration.size() + sentimentFlips.size());
        allPatterns.put("ticker", ticker);
        allPatterns.put("scannedAt", Instant.now());
        
        return allPatterns;
    }
}
