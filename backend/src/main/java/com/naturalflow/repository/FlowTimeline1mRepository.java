package com.naturalflow.repository;

import com.naturalflow.model.FlowTimeline1m;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface FlowTimeline1mRepository extends JpaRepository<FlowTimeline1m, Long> {

    /**
     * Find or create bucket for specific ticker and minute
     */
    Optional<FlowTimeline1m> findByTickerAndBucketTime(String ticker, LocalDateTime bucketTime);

    /**
     * Get timeline for a ticker within date range (for charts)
     */
    @Query("SELECT f FROM FlowTimeline1m f WHERE f.ticker = :ticker " +
           "AND f.bucketTime >= :startTime AND f.bucketTime <= :endTime " +
           "ORDER BY f.bucketTime ASC")
    List<FlowTimeline1m> findByTickerAndTimeRange(
        @Param("ticker") String ticker,
        @Param("startTime") LocalDateTime startTime,
        @Param("endTime") LocalDateTime endTime
    );

    /**
     * Get recent timeline (last N minutes) - for real-time updates
     */
    @Query("SELECT f FROM FlowTimeline1m f WHERE f.ticker = :ticker " +
           "AND f.bucketTime >= :since " +
           "ORDER BY f.bucketTime DESC")
    List<FlowTimeline1m> findRecentByTicker(
        @Param("ticker") String ticker,
        @Param("since") LocalDateTime since
    );

    /**
     * Get all tickers' data for a specific minute (for AI bot)
     */
    @Query("SELECT f FROM FlowTimeline1m f WHERE f.bucketTime = :bucketTime")
    List<FlowTimeline1m> findAllByBucketTime(@Param("bucketTime") LocalDateTime bucketTime);

    /**
     * Delete old data (retention policy)
     */
    @Query("DELETE FROM FlowTimeline1m f WHERE f.bucketTime < :before")
    void deleteOlderThan(@Param("before") LocalDateTime before);
}
