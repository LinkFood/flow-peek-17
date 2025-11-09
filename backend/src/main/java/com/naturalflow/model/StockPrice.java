package com.naturalflow.model;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;

/**
 * Stock Price Data
 * Stores 1-minute bar data for MAG7 + SPY + QQQ
 * Used for:
 * - Overlaying price on flow charts
 * - Calculating outcomes (did pattern predict move?)
 * - Pattern validation and win rate tracking
 * - Real-time OTM checking
 */
@Entity
@Table(name = "stock_prices", indexes = {
    @Index(name = "idx_symbol_timestamp", columnList = "symbol,timestamp"),
    @Index(name = "idx_timestamp", columnList = "timestamp")
})
public class StockPrice {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "symbol", nullable = false, length = 10)
    private String symbol;

    @Column(name = "timestamp", nullable = false)
    private Instant timestamp;

    @Column(name = "open", precision = 15, scale = 4)
    private BigDecimal open;

    @Column(name = "high", precision = 15, scale = 4)
    private BigDecimal high;

    @Column(name = "low", precision = 15, scale = 4)
    private BigDecimal low;

    @Column(name = "close", precision = 15, scale = 4)
    private BigDecimal close;

    @Column(name = "volume")
    private Long volume;

    @Column(name = "src", length = 50)
    private String src = "polygon";

    public StockPrice() {
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getSymbol() {
        return symbol;
    }

    public void setSymbol(String symbol) {
        this.symbol = symbol;
    }

    public Instant getTimestamp() {
        return timestamp;
    }

    public void setTimestamp(Instant timestamp) {
        this.timestamp = timestamp;
    }

    public BigDecimal getOpen() {
        return open;
    }

    public void setOpen(BigDecimal open) {
        this.open = open;
    }

    public BigDecimal getHigh() {
        return high;
    }

    public void setHigh(BigDecimal high) {
        this.high = high;
    }

    public BigDecimal getLow() {
        return low;
    }

    public void setLow(BigDecimal low) {
        this.low = low;
    }

    public BigDecimal getClose() {
        return close;
    }

    public void setClose(BigDecimal close) {
        this.close = close;
    }

    public Long getVolume() {
        return volume;
    }

    public void setVolume(Long volume) {
        this.volume = volume;
    }

    public String getSrc() {
        return src;
    }

    public void setSrc(String src) {
        this.src = src;
    }
}
