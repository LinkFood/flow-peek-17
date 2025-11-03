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
    private final ObjectMapper objectMapper;
    private final OkHttpClient httpClient;

    private WebSocket webSocket;
    private boolean authenticated = false;
    private final List<String> pendingSubscriptions = new ArrayList<>();
    private int tradeCount = 0;
    private long lastLogTime = 0;

    public PolygonWebSocketService(FlowService flowService, SmartMoneyService smartMoneyService) {
        this.flowService = flowService;
        this.smartMoneyService = smartMoneyService;
        this.objectMapper = new ObjectMapper();
        this.httpClient = new OkHttpClient.Builder()
            .readTimeout(0, TimeUnit.MILLISECONDS)
            .build();
    }

    @PostConstruct
    public void connect() {
        if (!enabled) {
            log.info("Polygon WebSocket is disabled. Set POLYGON_WEBSOCKET_ENABLED=true to enable.");
            return;
        }

        if (apiKey == null || apiKey.isEmpty() || apiKey.equals("your-polygon-api-key")) {
            log.warn("Polygon API key not configured. Cannot connect to WebSocket.");
            return;
        }

        log.info("Connecting to Polygon WebSocket for real-time options flow...");

        // Try the new Massive.com delayed endpoint format
        Request request = new Request.Builder()
            .url("wss://delayed.massive.com/options")
            .build();

        webSocket = httpClient.newWebSocket(request, new WebSocketListener() {
            @Override
            public void onOpen(WebSocket webSocket, Response response) {
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
                authenticated = false;
            }

            @Override
            public void onFailure(WebSocket webSocket, Throwable t, Response response) {
                log.error("WebSocket connection failed: {}", t.getMessage(), t);
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

        // TEST: Subscribe to ALL options trades to verify data is flowing
        // TODO: Need to find correct format for per-ticker subscription
        pendingSubscriptions.add("T.O:*"); // ALL options (temporary test)
    }

    private void authenticate(WebSocket ws) {
        String authMessage = String.format("{\"action\":\"auth\",\"params\":\"%s\"}", apiKey);
        ws.send(authMessage);
        log.info("Authentication message sent");
    }

    private void handleMessage(String message, WebSocket ws) throws Exception {
        JsonNode root = objectMapper.readTree(message);

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
            for (JsonNode trade : root) {
                if (trade.has("ev") && trade.get("ev").asText().equals("T")) {
                    processTrade(trade);
                }
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
        log.info("📡 Subscribed to 9 tickers options flow: {}", pendingSubscriptions);
        pendingSubscriptions.clear();
    }

    private void processTrade(JsonNode trade) {
        try {
            tradeCount++;

            // Log trade count every 30 seconds
            long now = System.currentTimeMillis();
            if (now - lastLogTime > 30000) {
                log.info("📊 Received {} trades in last 30s", tradeCount);
                tradeCount = 0;
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
                return;
            }

            // Calculate premium: price * size * 100 (options multiplier)
            double price = trade.has("p") ? trade.get("p").asDouble() : 0;
            int size = trade.has("s") ? trade.get("s").asInt() : 0;
            double premium = price * size * 100;

            // Parse expiry to calculate DTE
            LocalDate expiry = parseExpiry(optionSymbol);
            if (expiry == null) {
                return;
            }

            int dte = (int) ChronoUnit.DAYS.between(LocalDate.now(), expiry);

            // STORE ALL TRADES (for intraday flow lines - no filter)
            String json = trade.toString();
            flowService.ingestFromRawJson(json);

            // LOG if this is smart money ($50K+, 0-30 DTE)
            if (premium >= MIN_PREMIUM && dte >= 0 && dte <= MAX_DTE) {
                log.info("💰 Smart Money: {} ${} premium, {} DTE",
                    optionSymbol, String.format("%.0f", premium), dte);
            }

        } catch (Exception e) {
            log.error("Error processing trade: {}", e.getMessage());
        }
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
        return authenticated;
    }
}
