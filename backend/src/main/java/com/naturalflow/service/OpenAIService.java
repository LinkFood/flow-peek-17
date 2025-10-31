package com.naturalflow.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.naturalflow.model.OptionFlow;
import okhttp3.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Map;
import java.util.concurrent.TimeUnit;
import java.util.stream.Collectors;

@Service
public class OpenAIService {

    private static final Logger log = LoggerFactory.getLogger(OpenAIService.class);
    private static final String OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";

    @Value("${openai.api.key}")
    private String apiKey;

    @Value("${openai.model:gpt-4}")
    private String model;

    private final FlowService flowService;
    private final OkHttpClient httpClient;
    private final ObjectMapper objectMapper;

    public OpenAIService(FlowService flowService) {
        this.flowService = flowService;
        this.httpClient = new OkHttpClient.Builder()
            .connectTimeout(30, TimeUnit.SECONDS)
            .readTimeout(60, TimeUnit.SECONDS)
            .build();
        this.objectMapper = new ObjectMapper();
    }

    /**
     * Generate AI insights for a specific ticker
     */
    public String generateInsights(String symbol, int windowHours) {
        if (apiKey == null || apiKey.isEmpty() || apiKey.equals("your-openai-api-key")) {
            return "OpenAI API key not configured. Set OPENAI_API_KEY environment variable to enable AI insights.";
        }

        try {
            // Gather data for analysis
            List<OptionFlow> flows = flowService.getLatest(symbol, 100);
            FlowService.FlowSummary summary = flowService.getSummary(symbol, windowHours);

            if (flows.isEmpty()) {
                return "No flow data available for " + symbol + " in the last " + windowHours + " hours.";
            }

            // Build context for OpenAI
            String prompt = buildAnalysisPrompt(symbol, flows, summary, windowHours);

            // Call OpenAI API
            String response = callOpenAI(prompt);

            log.info("Generated AI insights for {}", symbol);
            return response;

        } catch (Exception e) {
            log.error("Error generating AI insights: {}", e.getMessage(), e);
            return "Error generating insights: " + e.getMessage();
        }
    }

    /**
     * Generate market-wide insights
     */
    public String generateMarketInsights() {
        if (apiKey == null || apiKey.isEmpty() || apiKey.equals("your-openai-api-key")) {
            return "OpenAI API key not configured.";
        }

        try {
            // Get all recent tickers
            List<String> tickers = flowService.getRecentTickers();

            if (tickers.isEmpty()) {
                return "No flow data available.";
            }

            // Get summary for top tickers
            StringBuilder dataContext = new StringBuilder();
            dataContext.append("Market-wide options flow analysis:\n\n");

            for (String ticker : tickers.stream().limit(10).collect(Collectors.toList())) {
                FlowService.FlowSummary summary = flowService.getSummary(ticker, 24);
                dataContext.append(String.format(
                    "%s: Call Premium: $%,.0f, Put Premium: $%,.0f, Net: $%,.0f, Trades: %d\n",
                    ticker,
                    summary.getTotalCallPremium().doubleValue(),
                    summary.getTotalPutPremium().doubleValue(),
                    summary.getNetPremium().doubleValue(),
                    summary.getCount()
                ));
            }

            String prompt = "You are a professional options trader analyzing flow data. " +
                "Based on the following options flow data from the last 24 hours, " +
                "provide a concise market overview highlighting:\n" +
                "1. Overall market sentiment (bullish/bearish/neutral)\n" +
                "2. Top 3 most notable tickers and why\n" +
                "3. Any unusual patterns or large institutional activity\n" +
                "4. Key takeaways for traders\n\n" +
                "Data:\n" + dataContext.toString();

            return callOpenAI(prompt);

        } catch (Exception e) {
            log.error("Error generating market insights: {}", e.getMessage(), e);
            return "Error generating market insights: " + e.getMessage();
        }
    }

    /**
     * Build analysis prompt for a specific ticker
     */
    private String buildAnalysisPrompt(String symbol, List<OptionFlow> flows,
                                      FlowService.FlowSummary summary, int windowHours) {
        // Calculate statistics
        long callCount = flows.stream().filter(f -> "CALL".equals(f.getSide())).count();
        long putCount = flows.stream().filter(f -> "PUT".equals(f.getSide())).count();

        BigDecimal avgCallPremium = flows.stream()
            .filter(f -> "CALL".equals(f.getSide()))
            .map(OptionFlow::getPremium)
            .reduce(BigDecimal.ZERO, BigDecimal::add)
            .divide(BigDecimal.valueOf(Math.max(callCount, 1)), 2, BigDecimal.ROUND_HALF_UP);

        BigDecimal avgPutPremium = flows.stream()
            .filter(f -> "PUT".equals(f.getSide()))
            .map(OptionFlow::getPremium)
            .reduce(BigDecimal.ZERO, BigDecimal::add)
            .divide(BigDecimal.valueOf(Math.max(putCount, 1)), 2, BigDecimal.ROUND_HALF_UP);

        // Find largest trades
        List<OptionFlow> largestTrades = flows.stream()
            .sorted((a, b) -> b.getPremium().compareTo(a.getPremium()))
            .limit(5)
            .collect(Collectors.toList());

        // Build prompt
        StringBuilder prompt = new StringBuilder();
        prompt.append("You are a professional options trader analyzing flow data for ").append(symbol).append(". ");
        prompt.append("Provide a concise analysis (3-4 paragraphs) covering:\n\n");
        prompt.append("1. Overall sentiment and directional bias\n");
        prompt.append("2. Notable large trades or unusual activity\n");
        prompt.append("3. Potential strategies or what smart money might be doing\n");
        prompt.append("4. Key levels or expirations to watch\n\n");

        prompt.append("Data Summary (last ").append(windowHours).append(" hours):\n");
        prompt.append(String.format("- Total Call Premium: $%,.0f across %d trades (avg $%,.0f)\n",
            summary.getTotalCallPremium().doubleValue(), callCount, avgCallPremium.doubleValue()));
        prompt.append(String.format("- Total Put Premium: $%,.0f across %d trades (avg $%,.0f)\n",
            summary.getTotalPutPremium().doubleValue(), putCount, avgPutPremium.doubleValue()));
        prompt.append(String.format("- Net Flow: $%,.0f (%s)\n",
            summary.getNetPremium().doubleValue(),
            summary.getNetPremium().compareTo(BigDecimal.ZERO) > 0 ? "Bullish" : "Bearish"));

        prompt.append("\nLargest 5 Trades:\n");
        for (int i = 0; i < largestTrades.size(); i++) {
            OptionFlow flow = largestTrades.get(i);
            prompt.append(String.format("%d. %s %s strike $%.2f exp %s - Premium: $%,.0f\n",
                i + 1,
                flow.getSide(),
                symbol,
                flow.getStrike() != null ? flow.getStrike().doubleValue() : 0,
                flow.getExpiry() != null ? flow.getExpiry().toString() : "N/A",
                flow.getPremium().doubleValue()));
        }

        prompt.append("\nBe specific and actionable. Focus on what this flow tells us about institutional positioning.");

        return prompt.toString();
    }

    /**
     * Call OpenAI API
     */
    private String callOpenAI(String prompt) throws Exception {
        // Build request body
        ObjectNode requestBody = objectMapper.createObjectNode();
        requestBody.put("model", model);

        ArrayNode messages = requestBody.putArray("messages");
        ObjectNode message = messages.addObject();
        message.put("role", "user");
        message.put("content", prompt);

        requestBody.put("temperature", 0.7);
        requestBody.put("max_tokens", 1000);

        RequestBody body = RequestBody.create(
            requestBody.toString(),
            MediaType.parse("application/json")
        );

        Request request = new Request.Builder()
            .url(OPENAI_API_URL)
            .header("Authorization", "Bearer " + apiKey)
            .header("Content-Type", "application/json")
            .post(body)
            .build();

        try (Response response = httpClient.newCall(request).execute()) {
            if (!response.isSuccessful()) {
                throw new Exception("OpenAI API error: " + response.code() + " - " + response.message());
            }

            if (response.body() == null) {
                throw new Exception("OpenAI API returned empty response");
            }

            String responseBody = response.body().string();
            JsonNode root = objectMapper.readTree(responseBody);

            // Extract the generated text
            JsonNode choices = root.get("choices");
            if (choices != null && choices.size() > 0) {
                JsonNode firstChoice = choices.get(0);
                JsonNode message = firstChoice.get("message");
                if (message != null && message.has("content")) {
                    return message.get("content").asText();
                }
            }

            throw new Exception("Unexpected OpenAI API response format");
        }
    }

    /**
     * DTO for insights response
     */
    public static class InsightResponse {
        private String symbol;
        private String analysis;
        private long timestamp;

        public InsightResponse(String symbol, String analysis) {
            this.symbol = symbol;
            this.analysis = analysis;
            this.timestamp = Instant.now().toEpochMilli();
        }

        public String getSymbol() {
            return symbol;
        }

        public String getAnalysis() {
            return analysis;
        }

        public long getTimestamp() {
            return timestamp;
        }
    }
}
