package com.naturalflow.service;

import com.naturalflow.model.FlowTimeline1m;
import com.naturalflow.model.OptionFlow;
import com.naturalflow.repository.FlowTimeline1mRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.List;

/**
 * Real-time aggregation service
 * Updates 1-minute buckets as trades arrive
 */
@Service
public class TimelineAggregationService {

    private static final Logger log = LoggerFactory.getLogger(TimelineAggregationService.class);

    private final FlowTimeline1mRepository timelineRepository;

    public TimelineAggregationService(FlowTimeline1mRepository timelineRepository) {
        this.timelineRepository = timelineRepository;
    }

    /**
     * Process incoming trade and update 1-minute bucket
     * Called immediately after saving OptionFlow
     */
    @Transactional
    public void aggregateTrade(OptionFlow flow) {
        try {
            // Convert Instant to LocalDateTime and round down to the minute
            LocalDateTime bucketTime = LocalDateTime.ofInstant(
                flow.getTsUtc(),
                java.time.ZoneId.of("UTC")
            ).truncatedTo(ChronoUnit.MINUTES);

            String ticker = flow.getUnderlying();

            // Find or create bucket
            FlowTimeline1m bucket = timelineRepository
                .findByTickerAndBucketTime(ticker, bucketTime)
                .orElseGet(() -> new FlowTimeline1m(ticker, bucketTime));

            // Add premium to appropriate side
            if ("CALL".equals(flow.getSide())) {
                bucket.addCallPremium(flow.getPremium().doubleValue());
            } else {
                bucket.addPutPremium(flow.getPremium().doubleValue());
            }

            // Save updated bucket
            timelineRepository.save(bucket);

            log.debug("Aggregated {} {} ${} into bucket {}",
                ticker, flow.getSide(), flow.getPremium(), bucketTime);

        } catch (Exception e) {
            log.error("Failed to aggregate trade for {}: {}",
                flow.getUnderlying(), e.getMessage());
            // Don't throw - aggregation failure shouldn't block trade ingestion
        }
    }

    /**
     * Backfill aggregations for existing data
     * Used when enabling this feature for the first time
     */
    @Transactional
    public int backfillAggregations(Iterable<OptionFlow> flows) {
        int count = 0;
        for (OptionFlow flow : flows) {
            aggregateTrade(flow);
            count++;
            if (count % 1000 == 0) {
                log.info("Backfilled {} trades", count);
            }
        }
        log.info("Backfill complete: {} trades aggregated", count);
        return count;
    }

    /**
     * Backfill aggregations from projection (avoids LOB access)
     */
    @Transactional
    public int backfillAggregationsFromProjection(List<Object[]> projections) {
        int count = 0;
        for (Object[] row : projections) {
            try {
                // row: [id, tsUtc, underlying, side, premium]
                java.time.Instant tsUtc = (java.time.Instant) row[1];
                String underlying = (String) row[2];
                String side = (String) row[3];
                java.math.BigDecimal premium = (java.math.BigDecimal) row[4];

                if (underlying == null || side == null || premium == null) {
                    continue; // Skip invalid rows
                }

                // Convert Instant to LocalDateTime and round down to the minute
                LocalDateTime bucketTime = LocalDateTime.ofInstant(
                    tsUtc,
                    java.time.ZoneId.of("UTC")
                ).truncatedTo(ChronoUnit.MINUTES);

                // Find or create bucket
                FlowTimeline1m bucket = timelineRepository
                    .findByTickerAndBucketTime(underlying, bucketTime)
                    .orElseGet(() -> new FlowTimeline1m(underlying, bucketTime));

                // Add premium to appropriate side
                if ("CALL".equals(side)) {
                    bucket.addCallPremium(premium.doubleValue());
                } else {
                    bucket.addPutPremium(premium.doubleValue());
                }

                // Save updated bucket
                timelineRepository.save(bucket);

                count++;
                if (count % 1000 == 0) {
                    log.info("Backfilled {} trades", count);
                }
            } catch (Exception e) {
                log.error("Failed to backfill row: {}", e.getMessage());
            }
        }
        log.info("Backfill complete: {} trades aggregated", count);
        return count;
    }

    /**
     * Clean up old aggregations (retention policy)
     * Keep last 30 days only
     */
    @Transactional
    public void cleanupOldAggregations() {
        LocalDateTime cutoff = LocalDateTime.now().minusDays(30);
        timelineRepository.deleteOlderThan(cutoff);
        log.info("Deleted aggregations older than {}", cutoff);
    }
}
