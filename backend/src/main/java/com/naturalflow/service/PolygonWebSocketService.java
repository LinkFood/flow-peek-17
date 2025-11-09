package com.naturalflow.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import okhttp3.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.TimeUnit;

/**
 * Polygon WebSocket Service - Real-time options flow streaming
 *
 * Uses Polygon.io WebSocket API for streaming options trades
 * Much more efficient than REST polling for real-time data
 *
 * Subscribes to: T.O:AAPL*, T.O:MSFT*, T.O:GOOGL*, etc.
 * Filters: Premium >= $50K, DTE <= 30 days
 */
@Service
public class PolygonWebSocketService {

    private static final Logger log = LoggerFactory.getLogger(PolygonWebSocketService.class);

    // 9 tickers to track (MAG7 + SPY + QQQ)
    private static final String[] TRACKED_TICKERS = {
        "AAPL", "MSFT", "GOOGL", "AMZN", "NVDA", "TSLA", "META", "SPY", "QQQ"
    };

    // Smart money filters
    private static final double MIN_PREMIUM = 50000.0; // $50K
    private static final int MAX_DTE = 30; // 0-30 days

    @Value("${polygon.api.key}")
    private String apiKey;

    @Value("${polygon.websocket.enabled:false}")
    private boolean enabled;

    private final FlowService flowService;
    private final SmartMoneyService smartMoneyService;
    private final TradeValidationService validationService;
    private final StockPriceService stockPriceService;
    private final ObjectMapper objectMapper;
    private final OkHttpClient httpClient;

    private WebSocket webSocket;
    private boolean authenticated = false;
    private boolean connected = false;
    private final List<String> pendingSubscriptions = new ArrayList<>();
    private int tradeCount = 0;
    private int filteredCount = 0;
    private long lastLogTime = 0;

    public PolygonWebSocketService(
        FlowService flowService,
        SmartMoneyService smartMoneyService,
        TradeValidationService validationService,
        StockPriceService stockPriceService
    ) {
        this.flowService = flowService;
        this.smartMoneyService = smartMoneyService;
        this.validationService = validationService;
        this.stockPriceService = stockPriceService;
        this.objectMapper = new ObjectMapper();
        this.httpClient = new OkHttpClient.Builder()
            .readTimeout(0, TimeUnit.MILLISECONDS)
            .build();
    }

    @PostConstruct
    public void connect() {
        if (!enabled) {
            log.info("🔌 Polygon WebSocket is disabled. Set POLYGON_WEBSOCKET_ENABLED=true to enable.");
            return;
        }

        if (apiKey == null || apiKey.isEmpty() || apiKey.equals("your-polygon-api-key")) {
            log.warn("❌ Polygon API key not configured. Cannot connect to WebSocket.");
            return;
        }

        log.info("🔌 Connecting to Massive.com REAL-TIME WebSocket for options flow...");
        prepareSubscriptions();

        // Use Massive.com's REAL-TIME options WebSocket endpoint (Options Advanced plan)
        Request request = new Request.Builder()
            .url("wss://socket.massive.com/options")
            .build();

        webSocket = httpClient.newWebSocket(request, new WebSocketListener() {
            @Override
            public void onOpen(WebSocket webSocket, Response response) {
                connected = true;
                log.info("WebSocket connected! Authenticating...");
                authenticate(webSocket);
            }

            @Override
            public void onMessage(WebSocket webSocket, String text) {
                try {
                    handleMessage(text, webSocket);
                } catch (Exception e) {
                    log.error("Error handling WebSocket message: {}", e.getMessage(), e);
                }
            }

            @Override
            public void onClosing(WebSocket webSocket, int code, String reason) {
                log.warn("WebSocket closing: {} - {}", code, reason);
                connected = false;
                authenticated = false;
            }

            @Override
            public void onFailure(WebSocket webSocket, Throwable t, Response response) {
                log.error("WebSocket connection failed: {}", t.getMessage(), t);
                connected = false;
                authenticated = false;

                // Attempt to reconnect after 10 seconds
                try {
                    Thread.sleep(10000);
                    connect();
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                }
            }
        });

    }

    private void authenticate(WebSocket ws) {
        String authMessage = String.format("{\"action\":\"auth\",\"params\":\"%s\"}", apiKey);
        ws.send(authMessage);
        log.info("Authentication message sent");
    }

    private void handleMessage(String message, WebSocket ws) throws Exception {
        JsonNode root = objectMapper.readTree(message);

        // DEBUG: Log ALL messages to see what we're receiving
        log.info("📩 WebSocket message received: {}", message.substring(0, Math.min(200, message.length())));

        // Handle authentication response
        if (root.isArray() && root.size() > 0) {
            JsonNode first = root.get(0);
            if (first.has("ev") && first.get("ev").asText().equals("status")) {
                String status = first.has("status") ? first.get("status").asText() : "";
                String msg = first.has("message") ? first.get("message").asText() : "";

                if ("auth_success".equals(status)) {
                    log.info("✅ Authenticated successfully!");
                    authenticated = true;
                    subscribeToTickers(ws);
                } else if ("connected".equals(status)) {
                    log.info("Connected to Polygon WebSocket: {}", msg);
                } else {
                    log.warn("Status message: {} - {}", status, msg);
                }
                return;
            }
        }

        // Handle trade messages
        if (root.isArray()) {
            int tradeCount = 0;
            for (JsonNode trade : root) {
                if (trade.has("ev")) {
                    String eventType = trade.get("ev").asText();
                    log.info("📨 Event type: {} | Full event: {}", eventType, trade.toString().substring(0, Math.min(150, trade.toString().length())));
                    
                    if (eventType.equals("T")) {
                        processTrade(trade);
                        tradeCount++;
                    }
                }
            }
            if (tradeCount > 0) {
                log.info("✅ Processed {} trades from this message", tradeCount);
            }
        }
    }

    private void subscribeToTickers(WebSocket ws) {
        if (pendingSubscriptions.isEmpty()) {
            log.warn("No tickers to subscribe to");
            return;
        }

        // Subscribe to all MAG7 options trades
        String subscribeMessage = String.format(
            "{\"action\":\"subscribe\",\"params\":\"%s\"}",
            String.join(",", pendingSubscriptions)
        );

        ws.send(subscribeMessage);
        log.info("📡 Subscribed to options flow channels: {}", pendingSubscriptions);
        pendingSubscriptions.clear();
    }

    private void processTrade(JsonNode trade) {
        try {
            tradeCount++;

            // Log stats every 30 seconds
            long now = System.currentTimeMillis();
            if (now - lastLogTime > 30000) {
                log.info("📊 Last 30s: {} trades received, {} passed filters, {} filtered out",
                    tradeCount, (tradeCount - filteredCount), filteredCount);
                tradeCount = 0;
                filteredCount = 0;
                lastLogTime = now;
            }

            // Extract fields from Polygon WebSocket trade message
            // Format: {"ev":"T","sym":"O:AAPL251220C00190000","x":...,"p":...,"s":...,"t":...}
            String optionSymbol = trade.has("sym") ? trade.get("sym").asText() : null;
            if (optionSymbol == null || !optionSymbol.startsWith("O:")) {
                return;
            }

            // Parse option symbol to get underlying, expiry, strike, side
            String underlying = extractUnderlying(optionSymbol);
            if (underlying == null) {
                filteredCount++;
                return;
            }

            // Parse expiry
            LocalDate expiry = parseExpiry(optionSymbol);
            if (expiry == null) {
                filteredCount++;
                return;
            }

            // Parse strike and side
            java.math.BigDecimal strike = parseStrike(optionSymbol);
            String side = parseSide(optionSymbol);
            if (strike == null || side == null) {
                filteredCount++;
                return;
            }

            // Calculate premium: price * size * 100 (options multiplier)
            double price = trade.has("p") ? trade.get("p").asDouble() : 0;
            int size = trade.has("s") ? trade.get("s").asInt() : 0;
            java.math.BigDecimal premium = java.math.BigDecimal.valueOf(price * size * 100);

            // Build OptionFlow object for validation
            com.naturalflow.model.OptionFlow flow = new com.naturalflow.model.OptionFlow();
            flow.setOptionSymbol(optionSymbol);
            flow.setUnderlying(underlying);
            flow.setSide(side);
            flow.setStrike(strike);
            flow.setExpiry(expiry);
            flow.setPremium(premium);
            flow.setSize(size);
            flow.setTsUtc(java.time.Instant.now());
            flow.setRawJson(trade.toString());

            // STEP 1: Get current stock price for OTM checking
            java.math.BigDecimal stockPrice = stockPriceService.getCurrentPrice(underlying);
            if (stockPrice == null) {
                log.warn("⚠️ Cannot fetch price for {} - skipping OTM check", underlying);
                filteredCount++;
                return;
            }

            // STEP 2: Validate through TradeValidationService
            // This checks: Ticker, Premium ($50K+), DTE (0-30), OTM
            if (!validationService.shouldIngestTrade(flow, stockPrice)) {
                filteredCount++;
                return;
            }

            // STEP 3: Enrich with calculated fields
            validationService.enrichTrade(flow, stockPrice);

            // STEP 4: Save to database
            String json = trade.toString();
            flowService.ingestFromRawJson(json);

            // Successfully ingested - log it
            log.info("✅ Ingested: {} {} ${} premium, {} DTE, {}% OTM, stock at ${}",
                flow.getOptionSymbol(),
                flow.getSide(),
                flow.getPremium().intValue(),
                flow.getDte(),
                flow.getDistanceToStrike(),
                stockPrice);

        } catch (Exception e) {
            log.error("Error processing trade: {}", e.getMessage());
        }
    }

    private String parseSide(String optionSymbol) {
        if (optionSymbol.contains("C")) return "CALL";
        if (optionSymbol.contains("P")) return "PUT";
        return null;
    }

    private java.math.BigDecimal parseStrike(String optionSymbol) {
        try {
            int cpIndex = optionSymbol.indexOf("C", 3);
            if (cpIndex == -1) {
                cpIndex = optionSymbol.indexOf("P", 3);
            }
            if (cpIndex > 0 && optionSymbol.length() >= cpIndex + 9) {
                String strikeStr = optionSymbol.substring(cpIndex + 1, cpIndex + 9);
                double strike = Double.parseDouble(strikeStr) / 1000.0;
                return java.math.BigDecimal.valueOf(strike);
            }
        } catch (Exception e) {
            // Parse failed
        }
        return null;
    }

    private String extractUnderlying(String optionSymbol) {
        // Format: O:AAPL251220C00190000
        if (!optionSymbol.startsWith("O:")) return null;

        String withoutPrefix = optionSymbol.substring(2);
        // Extract letters before the date (6 digits)
        for (int i = 0; i < withoutPrefix.length(); i++) {
            if (Character.isDigit(withoutPrefix.charAt(i))) {
                return withoutPrefix.substring(0, i);
            }
        }
        return null;
    }

    private LocalDate parseExpiry(String optionSymbol) {
        try {
            // Format: O:AAPL251220C00190000
            //              YYMMDD

            // Find where C or P appears (call/put indicator)
            int cpIndex = -1;
            for (int i = 3; i < optionSymbol.length(); i++) {
                char c = optionSymbol.charAt(i);
                if (c == 'C' || c == 'P') {
                    cpIndex = i;
                    break;
                }
            }

            if (cpIndex < 8) return null;

            // Extract 6 digits before C/P
            String dateStr = optionSymbol.substring(cpIndex - 6, cpIndex);
            int year = 2000 + Integer.parseInt(dateStr.substring(0, 2));
            int month = Integer.parseInt(dateStr.substring(2, 4));
            int day = Integer.parseInt(dateStr.substring(4, 6));

            return LocalDate.of(year, month, day);
        } catch (Exception e) {
            return null;
        }
    }

    @PreDestroy
    public void disconnect() {
        if (webSocket != null) {
            log.info("Disconnecting Polygon WebSocket...");
            webSocket.close(1000, "Application shutdown");
        }
    }

    public boolean isConnected() {
        boolean status = connected && authenticated;
        if (!status && enabled) {
            log.debug("WebSocket status: connected={}, authenticated={}, enabled={}", 
                connected, authenticated, enabled);
        }
        return status;
    }

    private void prepareSubscriptions() {
        pendingSubscriptions.clear();
        for (String ticker : TRACKED_TICKERS) {
            pendingSubscriptions.add(String.format("T.O:%s*", ticker));
        }
    }
}
