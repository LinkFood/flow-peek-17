package com.naturalflow.model;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

@Entity
@Table(name = "option_flow", indexes = {
    @Index(name = "idx_underlying", columnList = "underlying"),
    @Index(name = "idx_ts_utc", columnList = "ts_utc"),
    @Index(name = "idx_premium", columnList = "premium")
})
public class OptionFlow {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "ts_utc", nullable = false)
    private Instant tsUtc;

    @Column(name = "underlying", nullable = false, length = 20)
    private String underlying;

    @Column(name = "option_symbol", length = 50)
    private String optionSymbol;

    @Column(name = "side", length = 10)
    private String side;

    @Column(name = "action", length = 10)
    private String action;

    @Column(name = "strike", precision = 15, scale = 2)
    private BigDecimal strike;

    @Column(name = "expiry")
    private LocalDate expiry;

    @Column(name = "premium", precision = 18, scale = 2)
    private BigDecimal premium;

    @Column(name = "size")
    private Integer size;

    @Lob
    @Basic(fetch = FetchType.LAZY)
    @Column(name = "raw_json", columnDefinition = "TEXT")
    private String rawJson;

    @Column(name = "src", length = 50)
    private String src = "polygon";

    // New fields for OTM validation and outcome tracking
    @Column(name = "stock_price_at_trade", precision = 15, scale = 4)
    private BigDecimal stockPriceAtTrade;

    @Column(name = "is_otm")
    private Boolean isOtm;

    @Column(name = "distance_to_strike", precision = 8, scale = 4)
    private BigDecimal distanceToStrike;

    @Column(name = "is_0dte")
    private Boolean is0dte;

    @Column(name = "dte")
    private Integer dte;

    public OptionFlow() {
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Instant getTsUtc() {
        return tsUtc;
    }

    public void setTsUtc(Instant tsUtc) {
        this.tsUtc = tsUtc;
    }

    public String getUnderlying() {
        return underlying;
    }

    public void setUnderlying(String underlying) {
        this.underlying = underlying;
    }

    public String getOptionSymbol() {
        return optionSymbol;
    }

    public void setOptionSymbol(String optionSymbol) {
        this.optionSymbol = optionSymbol;
    }

    public String getSide() {
        return side;
    }

    public void setSide(String side) {
        this.side = side;
    }

    public String getAction() {
        return action;
    }

    public void setAction(String action) {
        this.action = action;
    }

    public BigDecimal getStrike() {
        return strike;
    }

    public void setStrike(BigDecimal strike) {
        this.strike = strike;
    }

    public LocalDate getExpiry() {
        return expiry;
    }

    public void setExpiry(LocalDate expiry) {
        this.expiry = expiry;
    }

    public BigDecimal getPremium() {
        return premium;
    }

    public void setPremium(BigDecimal premium) {
        this.premium = premium;
    }

    public Integer getSize() {
        return size;
    }

    public void setSize(Integer size) {
        this.size = size;
    }

    public String getRawJson() {
        return rawJson;
    }

    public void setRawJson(String rawJson) {
        this.rawJson = rawJson;
    }

    public String getSrc() {
        return src;
    }

    public void setSrc(String src) {
        this.src = src;
    }

    public BigDecimal getStockPriceAtTrade() {
        return stockPriceAtTrade;
    }

    public void setStockPriceAtTrade(BigDecimal stockPriceAtTrade) {
        this.stockPriceAtTrade = stockPriceAtTrade;
    }

    public Boolean getIsOtm() {
        return isOtm;
    }

    public void setIsOtm(Boolean isOtm) {
        this.isOtm = isOtm;
    }

    public BigDecimal getDistanceToStrike() {
        return distanceToStrike;
    }

    public void setDistanceToStrike(BigDecimal distanceToStrike) {
        this.distanceToStrike = distanceToStrike;
    }

    public Boolean getIs0dte() {
        return is0dte;
    }

    public void setIs0dte(Boolean is0dte) {
        this.is0dte = is0dte;
    }

    public Integer getDte() {
        return dte;
    }

    public void setDte(Integer dte) {
        this.dte = dte;
    }
}
