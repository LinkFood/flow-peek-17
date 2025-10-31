package com.naturalflow.controller;

import com.naturalflow.model.OptionFlow;
import com.naturalflow.service.FlowService;
import com.naturalflow.service.OpenAIService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/flow")
public class FlowController {

    private final FlowService flowService;
    private final OpenAIService openAIService;

    public FlowController(FlowService flowService, OpenAIService openAIService) {
        this.flowService = flowService;
        this.openAIService = openAIService;
    }

    /**
     * GET /api/flow/latest?symbol=SPY&limit=50
     * Returns latest flow events for a ticker
     */
    @GetMapping("/latest")
    public ResponseEntity<Map<String, Object>> getLatest(
            @RequestParam String symbol,
            @RequestParam(defaultValue = "50") int limit) {

        List<OptionFlow> flows = flowService.getLatest(symbol, limit);

        // Convert to flat JSON structure
        List<Map<String, Object>> rows = flows.stream()
            .map(this::toLatestDto)
            .collect(Collectors.toList());

        Map<String, Object> response = new HashMap<>();
        response.put("symbol", symbol.toUpperCase());
        response.put("rows", rows);
        response.put("count", rows.size());

        return ResponseEntity.ok(response);
    }

    /**
     * GET /api/flow/summary?symbol=SPY&windowHours=24
     * Returns call/put premium summary for a ticker
     */
    @GetMapping("/summary")
    public ResponseEntity<FlowService.FlowSummary> getSummary(
            @RequestParam String symbol,
            @RequestParam(defaultValue = "24") int windowHours) {

        FlowService.FlowSummary summary = flowService.getSummary(symbol, windowHours);
        return ResponseEntity.ok(summary);
    }

    /**
     * GET /api/flow/building?symbol=SPY&minPremium=50000&lookbackMinutes=120
     * Returns flow events that might indicate position building
     * This is the core "Natural Flow" feature - only show accumulation
     */
    @GetMapping("/building")
    public ResponseEntity<List<Map<String, Object>>> getBuilding(
            @RequestParam String symbol,
            @RequestParam(defaultValue = "50000") BigDecimal minPremium,
            @RequestParam(defaultValue = "120") int lookbackMinutes) {

        List<OptionFlow> flows = flowService.getBuilding(symbol, minPremium, lookbackMinutes);

        List<Map<String, Object>> result = flows.stream()
            .map(this::toBuildingDto)
            .collect(Collectors.toList());

        return ResponseEntity.ok(result);
    }

    /**
     * POST /api/flow/ingest
     * Ingest raw JSON from Polygon or other provider
     * Body: raw JSON string
     */
    @PostMapping("/ingest")
    public ResponseEntity<Map<String, Object>> ingest(@RequestBody String json) {
        try {
            OptionFlow saved = flowService.ingestFromRawJson(json);

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("id", saved.getId());
            response.put("underlying", saved.getUnderlying());
            response.put("message", "Flow ingested successfully");

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, Object> error = new HashMap<>();
            error.put("success", false);
            error.put("error", e.getMessage());
            error.put("message", "Failed to ingest flow - check JSON format");

            return ResponseEntity.badRequest().body(error);
        }
    }

    /**
     * GET /api/flow/tickers
     * Returns list of distinct tickers seen in last 24h
     * Used for dropdowns in the UI
     */
    @GetMapping("/tickers")
    public ResponseEntity<List<String>> getTickers() {
        List<String> tickers = flowService.getRecentTickers();
        return ResponseEntity.ok(tickers);
    }

    /**
     * GET /api/flow/insights?symbol=SPY&windowHours=24
     * Returns AI-generated insights for a ticker
     * Uses OpenAI to analyze flow patterns and provide actionable intelligence
     */
    @GetMapping("/insights")
    public ResponseEntity<Map<String, Object>> getInsights(
            @RequestParam String symbol,
            @RequestParam(defaultValue = "24") int windowHours) {

        String analysis = openAIService.generateInsights(symbol, windowHours);

        Map<String, Object> response = new HashMap<>();
        response.put("symbol", symbol.toUpperCase());
        response.put("windowHours", windowHours);
        response.put("analysis", analysis);
        response.put("timestamp", System.currentTimeMillis());

        return ResponseEntity.ok(response);
    }

    /**
     * GET /api/flow/market-insights
     * Returns AI-generated market-wide insights
     * Analyzes top tickers and provides overall market sentiment
     */
    @GetMapping("/market-insights")
    public ResponseEntity<Map<String, Object>> getMarketInsights() {
        String analysis = openAIService.generateMarketInsights();

        Map<String, Object> response = new HashMap<>();
        response.put("analysis", analysis);
        response.put("timestamp", System.currentTimeMillis());

        return ResponseEntity.ok(response);
    }

    /**
     * Convert OptionFlow to flat DTO for latest endpoint
     */
    private Map<String, Object> toLatestDto(OptionFlow flow) {
        Map<String, Object> dto = new HashMap<>();
        dto.put("tsUtc", flow.getTsUtc());
        dto.put("optionSymbol", flow.getOptionSymbol());
        dto.put("side", flow.getSide());
        dto.put("premium", flow.getPremium());
        dto.put("expiry", flow.getExpiry());
        dto.put("strike", flow.getStrike());
        dto.put("size", flow.getSize());
        dto.put("action", flow.getAction());
        return dto;
    }

    /**
     * Convert OptionFlow to flat DTO for building endpoint
     */
    private Map<String, Object> toBuildingDto(OptionFlow flow) {
        Map<String, Object> dto = new HashMap<>();
        dto.put("id", flow.getId());
        dto.put("tsUtc", flow.getTsUtc());
        dto.put("underlying", flow.getUnderlying());
        dto.put("optionSymbol", flow.getOptionSymbol());
        dto.put("side", flow.getSide());
        dto.put("action", flow.getAction());
        dto.put("premium", flow.getPremium());
        dto.put("strike", flow.getStrike());
        dto.put("expiry", flow.getExpiry());
        dto.put("size", flow.getSize());
        return dto;
    }
}
