package com.naturalflow.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.naturalflow.model.OptionFlow;
import com.naturalflow.repo.FlowRepository;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;

@Service
public class FlowService {

    private final FlowRepository flowRepository;
    private final ObjectMapper objectMapper;

    public FlowService(FlowRepository flowRepository, ObjectMapper objectMapper) {
        this.flowRepository = flowRepository;
        this.objectMapper = objectMapper;
    }

    /**
     * Get latest N flow events for a symbol
     */
    @Transactional(readOnly = true)
    public List<OptionFlow> getLatest(String symbol, int limit) {
        return flowRepository.findByUnderlyingOrderByTsUtcDesc(
            symbol.toUpperCase(),
            PageRequest.of(0, limit)
        );
    }

    /**
     * Get summary of call/put premium for a symbol within a time window
     */
    @Transactional(readOnly = true)
    public FlowSummary getSummary(String symbol, int windowHours) {
        String upperSymbol = symbol.toUpperCase();
        Instant startTime = Instant.now().minus(windowHours, ChronoUnit.HOURS);

        BigDecimal callPremium = flowRepository.sumCallPremiumByUnderlyingAndTimeWindow(upperSymbol, startTime);
        BigDecimal putPremium = flowRepository.sumPutPremiumByUnderlyingAndTimeWindow(upperSymbol, startTime);
        Long count = flowRepository.countByUnderlyingAndTimeWindow(upperSymbol, startTime);

        BigDecimal netPremium = callPremium.subtract(putPremium);

        return new FlowSummary(upperSymbol, windowHours, callPremium, putPremium, netPremium, count);
    }

    /**
     * Get flow events that might indicate position building
     * First version: return all rows where premium >= minPremium in lookback window
     */
    @Transactional(readOnly = true)
    public List<OptionFlow> getBuilding(String symbol, BigDecimal minPremium, int lookbackMinutes) {
        String upperSymbol = symbol.toUpperCase();
        Instant startTime = Instant.now().minus(lookbackMinutes, ChronoUnit.MINUTES);

        return flowRepository.findByUnderlyingAndPremiumThreshold(upperSymbol, minPremium, startTime);
    }

    /**
     * Ingest raw JSON from options flow provider
     * TODO: This method currently has basic Polygon JSON mapping
     * When switching providers, update the JSON field extraction logic here
     */
    @Transactional
    public OptionFlow ingestFromRawJson(String json) throws Exception {
        OptionFlow flow = new OptionFlow();

        // Always store the full raw JSON
        flow.setRawJson(json);

        // Parse the JSON to extract known fields
        JsonNode root = objectMapper.readTree(json);

        // POLYGON-SPECIFIC MAPPING - Actual Polygon API v3 structure
        // Based on Polygon.io Options Trades API v3
        // https://polygon.io/docs/options/get_v3_trades__optionsticker

        // Timestamp: sip_timestamp (nanoseconds) or participant_timestamp
        if (root.has("sip_timestamp")) {
            long timestampNanos = root.get("sip_timestamp").asLong();
            flow.setTsUtc(Instant.ofEpochMilli(timestampNanos / 1000000)); // Convert nanos to millis
        } else if (root.has("participant_timestamp")) {
            long timestampNanos = root.get("participant_timestamp").asLong();
            flow.setTsUtc(Instant.ofEpochMilli(timestampNanos / 1000000));
        } else if (root.has("timestamp")) {
            // Fallback for different format or test data
            long timestampMillis = root.get("timestamp").asLong();
            flow.setTsUtc(Instant.ofEpochMilli(timestampMillis));
        } else {
            flow.setTsUtc(Instant.now());
        }

        // Parse option symbol to extract underlying, side, strike, expiry
        // Polygon option symbols follow OCC format: O:AAPL251219C00150000
        String optionSymbol = null;
        if (root.has("ticker")) {
            optionSymbol = root.get("ticker").asText();
            flow.setOptionSymbol(optionSymbol);

            // Parse OCC-formatted option symbol
            // Format: O:UNDERLYING[YY][MM][DD][C/P][STRIKE*1000]
            if (optionSymbol.startsWith("O:")) {
                try {
                    String[] parts = optionSymbol.substring(2).split("(?<=\\D)(?=\\d)|(?<=\\d)(?=\\D)");

                    // Extract underlying (before the date)
                    String underlying = parts[0].replaceAll("[^A-Z]", "");
                    flow.setUnderlying(underlying);

                    // Find call/put indicator
                    int cpIndex = optionSymbol.indexOf("C", 3);
                    if (cpIndex == -1) {
                        cpIndex = optionSymbol.indexOf("P", 3);
                        flow.setSide("PUT");
                    } else {
                        flow.setSide("CALL");
                    }

                    // Extract date (6 digits before C/P)
                    if (cpIndex > 8) {
                        String dateStr = optionSymbol.substring(cpIndex - 6, cpIndex);
                        int year = 2000 + Integer.parseInt(dateStr.substring(0, 2));
                        int month = Integer.parseInt(dateStr.substring(2, 4));
                        int day = Integer.parseInt(dateStr.substring(4, 6));
                        flow.setExpiry(LocalDate.of(year, month, day));
                    }

                    // Extract strike (8 digits after C/P, divide by 1000)
                    if (cpIndex > 0 && optionSymbol.length() >= cpIndex + 9) {
                        String strikeStr = optionSymbol.substring(cpIndex + 1, cpIndex + 9);
                        double strike = Double.parseDouble(strikeStr) / 1000.0;
                        flow.setStrike(BigDecimal.valueOf(strike));
                    }
                } catch (Exception e) {
                    // If parsing fails, just store the symbol
                    flow.setOptionSymbol(optionSymbol);
                }
            }
        }

        // Fallback: manual fields if provided (for test data compatibility)
        if (root.has("underlying")) {
            flow.setUnderlying(root.get("underlying").asText().toUpperCase());
        }
        if (root.has("side")) {
            flow.setSide(root.get("side").asText().toUpperCase());
        }
        if (root.has("strike")) {
            flow.setStrike(BigDecimal.valueOf(root.get("strike").asDouble()));
        }
        if (root.has("expiry")) {
            flow.setExpiry(LocalDate.parse(root.get("expiry").asText()));
        }

        // Size from Polygon
        if (root.has("size")) {
            flow.setSize(root.get("size").asInt());
        }

        // Price and premium calculation
        // Polygon provides price per contract, we calculate total premium
        if (root.has("price") && root.has("size")) {
            double price = root.get("price").asDouble();
            int size = root.get("size").asInt();
            // Premium = price * size * 100 (options multiplier)
            flow.setPremium(BigDecimal.valueOf(price * size * 100));
        } else if (root.has("premium")) {
            // Fallback for test data
            flow.setPremium(BigDecimal.valueOf(root.get("premium").asDouble()));
        }

        // Action (buy/sell) - Polygon may provide conditions or exchange info
        if (root.has("conditions")) {
            JsonNode conditions = root.get("conditions");
            if (conditions.isArray() && conditions.size() > 0) {
                // Parse conditions to determine if it's a buy or sell
                // This is provider-specific logic
                flow.setAction("TRADE");
            }
        }
        if (root.has("action")) {
            flow.setAction(root.get("action").asText().toUpperCase());
        }

        flow.setSrc("polygon");
        // END POLYGON-SPECIFIC MAPPING

        return flowRepository.save(flow);
    }

    /**
     * Get list of distinct tickers seen in the last 24 hours
     */
    @Transactional(readOnly = true)
    public List<String> getRecentTickers() {
        Instant startTime = Instant.now().minus(24, ChronoUnit.HOURS);
        return flowRepository.findDistinctUnderlyingSince(startTime);
    }

    /**
     * Summary DTO for flow analysis
     */
    public static class FlowSummary {
        private String symbol;
        private int windowHours;
        private BigDecimal totalCallPremium;
        private BigDecimal totalPutPremium;
        private BigDecimal netPremium;
        private Long count;

        public FlowSummary(String symbol, int windowHours, BigDecimal totalCallPremium,
                          BigDecimal totalPutPremium, BigDecimal netPremium, Long count) {
            this.symbol = symbol;
            this.windowHours = windowHours;
            this.totalCallPremium = totalCallPremium;
            this.totalPutPremium = totalPutPremium;
            this.netPremium = netPremium;
            this.count = count;
        }

        public String getSymbol() {
            return symbol;
        }

        public int getWindowHours() {
            return windowHours;
        }

        public BigDecimal getTotalCallPremium() {
            return totalCallPremium;
        }

        public BigDecimal getTotalPutPremium() {
            return totalPutPremium;
        }

        public BigDecimal getNetPremium() {
            return netPremium;
        }

        public Long getCount() {
            return count;
        }
    }
}
