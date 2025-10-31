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

        // TODO: POLYGON-SPECIFIC MAPPING - Update this section when changing providers
        // Current structure assumes Polygon's options trade format
        // Adjust field paths based on your actual Polygon response structure

        if (root.has("timestamp")) {
            long timestampMillis = root.get("timestamp").asLong();
            flow.setTsUtc(Instant.ofEpochMilli(timestampMillis));
        } else {
            flow.setTsUtc(Instant.now());
        }

        if (root.has("underlying") || root.has("ticker")) {
            String underlying = root.has("underlying")
                ? root.get("underlying").asText()
                : root.get("ticker").asText();
            flow.setUnderlying(underlying.toUpperCase());
        }

        if (root.has("option_symbol") || root.has("symbol")) {
            String optionSymbol = root.has("option_symbol")
                ? root.get("option_symbol").asText()
                : root.get("symbol").asText();
            flow.setOptionSymbol(optionSymbol);
        }

        if (root.has("side") || root.has("type")) {
            String side = root.has("side")
                ? root.get("side").asText()
                : root.get("type").asText();
            flow.setSide(side.toUpperCase());
        }

        if (root.has("action")) {
            flow.setAction(root.get("action").asText().toUpperCase());
        }

        if (root.has("strike") || root.has("strike_price")) {
            double strike = root.has("strike")
                ? root.get("strike").asDouble()
                : root.get("strike_price").asDouble();
            flow.setStrike(BigDecimal.valueOf(strike));
        }

        if (root.has("expiry") || root.has("expiration_date")) {
            String expiryStr = root.has("expiry")
                ? root.get("expiry").asText()
                : root.get("expiration_date").asText();
            flow.setExpiry(LocalDate.parse(expiryStr));
        }

        if (root.has("premium")) {
            flow.setPremium(BigDecimal.valueOf(root.get("premium").asDouble()));
        } else if (root.has("price") && root.has("size")) {
            // Calculate premium as price * size * 100 (standard options multiplier)
            double price = root.get("price").asDouble();
            int size = root.get("size").asInt();
            flow.setPremium(BigDecimal.valueOf(price * size * 100));
        }

        if (root.has("size") || root.has("quantity")) {
            int size = root.has("size")
                ? root.get("size").asInt()
                : root.get("quantity").asInt();
            flow.setSize(size);
        }

        flow.setSrc("polygon");
        // END TODO: POLYGON-SPECIFIC MAPPING

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
