package com.naturalflow.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

/**
 * 1-minute aggregated flow timeline
 * Pre-computed buckets for fast charting and real-time updates
 */
@Entity
@Table(name = "flow_timeline_1m", indexes = {
    @Index(name = "idx_timeline_ticker_time", columnList = "ticker,bucket_time DESC"),
    @Index(name = "idx_timeline_time", columnList = "bucket_time DESC")
})
public class FlowTimeline1m {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 10)
    private String ticker;

    @Column(name = "bucket_time", nullable = false)
    private LocalDateTime bucketTime;

    @Column(name = "call_premium")
    private Double callPremium = 0.0;

    @Column(name = "put_premium")
    private Double putPremium = 0.0;

    @Column(name = "call_count")
    private Integer callCount = 0;

    @Column(name = "put_count")
    private Integer putCount = 0;

    @Column(name = "net_flow")
    private Double netFlow = 0.0;

    @Column(name = "last_updated")
    private LocalDateTime lastUpdated;

    // Constructors
    public FlowTimeline1m() {
        this.lastUpdated = LocalDateTime.now();
    }

    public FlowTimeline1m(String ticker, LocalDateTime bucketTime) {
        this.ticker = ticker;
        this.bucketTime = bucketTime;
        this.callPremium = 0.0;
        this.putPremium = 0.0;
        this.callCount = 0;
        this.putCount = 0;
        this.netFlow = 0.0;
        this.lastUpdated = LocalDateTime.now();
    }

    // Business methods
    public void addCallPremium(Double amount) {
        this.callPremium += amount;
        this.callCount++;
        updateNetFlow();
        this.lastUpdated = LocalDateTime.now();
    }

    public void addPutPremium(Double amount) {
        this.putPremium += amount;
        this.putCount++;
        updateNetFlow();
        this.lastUpdated = LocalDateTime.now();
    }

    private void updateNetFlow() {
        this.netFlow = this.callPremium - this.putPremium;
    }

    // Getters and setters
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getTicker() {
        return ticker;
    }

    public void setTicker(String ticker) {
        this.ticker = ticker;
    }

    public LocalDateTime getBucketTime() {
        return bucketTime;
    }

    public void setBucketTime(LocalDateTime bucketTime) {
        this.bucketTime = bucketTime;
    }

    public Double getCallPremium() {
        return callPremium;
    }

    public void setCallPremium(Double callPremium) {
        this.callPremium = callPremium;
        updateNetFlow();
    }

    public Double getPutPremium() {
        return putPremium;
    }

    public void setPutPremium(Double putPremium) {
        this.putPremium = putPremium;
        updateNetFlow();
    }

    public Integer getCallCount() {
        return callCount;
    }

    public void setCallCount(Integer callCount) {
        this.callCount = callCount;
    }

    public Integer getPutCount() {
        return putCount;
    }

    public void setPutCount(Integer putCount) {
        this.putCount = putCount;
    }

    public Double getNetFlow() {
        return netFlow;
    }

    public LocalDateTime getLastUpdated() {
        return lastUpdated;
    }

    public void setLastUpdated(LocalDateTime lastUpdated) {
        this.lastUpdated = lastUpdated;
    }
}
